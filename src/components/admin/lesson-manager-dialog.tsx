'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  X,
  FileText,
  Video,
  Paperclip,
  Upload,
  Link2,
  Trash2,
  ShieldCheck,
  ClipboardList,
  Plus,
  Eye,
  EyeOff,
  Unlink,
  PencilLine,
} from 'lucide-react'
import NextLink from 'next/link'
import {
  saveLessonContent,
  saveLessonVideo,
  removeLessonVideo,
  addLinkAttachment,
} from '@/lib/mutations/lesson-manager'
import { unlinkAttachmentFromLesson } from '@/lib/mutations/attachments'
import {
  createHomework,
  detachHomework,
  deleteHomework,
  setHomeworkPublished,
} from '@/lib/mutations/homework'
import { createBunnyUploadTicket, saveBunnyVideo, discardBunnyVideo } from '@/lib/mutations/bunny'
import { Field, Input, Select } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/card'
import { ConfirmButton } from '@/components/ui/confirm-button'
import { formatFileSize, formatNumber, pluralAr } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'

export type ManagedLesson = {
  id: string
  title: string
  description: string
  moduleId: string | null
  durationMinutes: string
  isFree: boolean
  isPublished: boolean
  section: '' | 'scientific' | 'literary'
  publishAt: string
  video: {
    storagePath: string | null
    bunnyVideoId: string | null
    url: string
    requiredPercent: number
    allowDownload: boolean
  } | null
  attachments: { id: string; title: string; size: number | null; isLink: boolean }[]
  homework: {
    id: string
    title: string
    isPublished: boolean
    questions: number
    attempts: number
    passingPercentage: number
  }[]
}

const TABS = [
  { id: 'content', label: 'المحتوى', icon: FileText },
  { id: 'video', label: 'الفيديو', icon: Video },
  { id: 'homework', label: 'الواجبات', icon: ClipboardList },
  { id: 'files', label: 'المرفقات', icon: Paperclip },
] as const

type TabId = (typeof TABS)[number]['id']

/**
 * الموعد يصل من الخادم بصيغة ISO بالتوقيت العالمي،
 * وحقل datetime-local يقرأ توقيت المتصفّح — فيُحوَّل هنا لا على الخادم.
 */
function toLocalInput(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function LessonManagerDialog({
  lesson,
  courseId,
  modules,
  bunnyEnabled,
  onClose,
}: {
  lesson: ManagedLesson
  courseId: string
  modules: { id: string; title: string }[]
  /** Bunny Stream مضبوط على الخادم — وإلا اختفى خياره بدل أن يفشل */
  bunnyEnabled: boolean
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [tab, setTab] = useState<TabId>('content')
  const [pending, start] = useTransition()

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    el.showModal()

    /*
     * حدث close لا يصعد، وReact لا يلتقطه بالتفويض — فيُربط على العنصر.
     * بدونه يبقى الأب ظانًّا أن الحوار مفتوح بعد Esc فلا يُفتح ثانية.
     */
    el.addEventListener('close', onClose)
    return () => el.removeEventListener('close', onClose)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ===== المحتوى =====
  const [title, setTitle] = useState(lesson.title)
  const [description, setDescription] = useState(lesson.description)
  const [moduleId, setModuleId] = useState(lesson.moduleId ?? '')
  const [duration, setDuration] = useState(lesson.durationMinutes)
  const [isFree, setIsFree] = useState(lesson.isFree)
  const [isPublished, setIsPublished] = useState(lesson.isPublished)
  const [section, setSection] = useState(lesson.section)
  const [publishAt, setPublishAt] = useState(() => toLocalInput(lesson.publishAt))

  const saveContent = () =>
    start(async () => {
      const res = await saveLessonContent({
        lessonId: lesson.id,
        courseId,
        title,
        description,
        moduleId: moduleId || null,
        durationMinutes: duration,
        isFree,
        isPublished,
        section,
        publishAt,
      })
      if (res.ok) {
        toast.success(res.message)
        onClose()
      } else {
        toast.error(res.message)
      }
    })

  // ===== الفيديو =====
  const [videoUrl, setVideoUrl] = useState(lesson.video?.url ?? '')
  const [storagePath, setStoragePath] = useState(lesson.video?.storagePath ?? null)
  const [bunnyId, setBunnyId] = useState(lesson.video?.bunnyVideoId ?? null)
  const [percent, setPercent] = useState(lesson.video?.requiredPercent ?? 90)
  const [allowDownload, setAllowDownload] = useState(lesson.video?.allowDownload ?? false)
  const [progress, setProgress] = useState<number | null>(null)
  const bunnyInput = useRef<HTMLInputElement>(null)

  /*
   * الرفع إلى Bunny يمضي من المتصفّح مباشرةً عبر TUS:
   * الخادم يُصدر تذكرة موقّعة قصيرة العمر، ومفتاح المكتبة لا يغادره،
   * والملف لا يمرّ به — فلا يقيّده حدّ حجم Server Action.
   */
  const uploadToBunny = (file: File | undefined) => {
    if (!file) return

    start(async () => {
      setProgress(0)
      const ticket = await createBunnyUploadTicket(lesson.id, lesson.title)

      if (!ticket.ok) {
        setProgress(null)
        if (bunnyInput.current) bunnyInput.current.value = ''
        toast.error(ticket.message)
        return
      }

      const { Upload } = await import('tus-js-client')

      await new Promise<void>((resolve) => {
        const upload = new Upload(file, {
          endpoint: 'https://video.bunnycdn.com/tusupload',
          retryDelays: [0, 3000, 6000, 12000],
          headers: {
            AuthorizationSignature: ticket.signature,
            AuthorizationExpire: String(ticket.expire),
            VideoId: ticket.videoId,
            LibraryId: ticket.libraryId,
          },
          metadata: { filetype: file.type, title: lesson.title },
          onProgress: (sent, total) => setProgress(Math.round((sent / total) * 100)),
          onError: async () => {
            setProgress(null)
            if (bunnyInput.current) bunnyInput.current.value = ''
            // الفيديو أُنشئ في المكتبة ولم يكتمل رفعه — يُلغى كي لا يبقى معلّقًا
            await discardBunnyVideo(ticket.videoId)
            toast.error('تعذّر الرفع إلى Bunny. أعد المحاولة.')
            resolve()
          },
          onSuccess: async () => {
            const res = await saveBunnyVideo({
              lessonId: lesson.id,
              courseId,
              videoId: ticket.videoId,
              requiredPercent: percent,
              allowDownload,
            })

            setProgress(null)
            if (bunnyInput.current) bunnyInput.current.value = ''

            if (res.ok) {
              setBunnyId(ticket.videoId)
              setStoragePath(null)
              setVideoUrl('')
              toast.success(res.message)
            } else {
              toast.error(res.message)
            }
            resolve()
          },
        })

        upload.start()
      })
    })
  }

  const saveVideo = () =>
    start(async () => {
      const res = await saveLessonVideo({
        lessonId: lesson.id,
        courseId,
        storagePath,
        videoUrl,
        requiredPercent: percent,
        allowDownload,
      })
      if (res.ok) toast.success(res.message)
      else toast.error(res.message)
    })

  const dropVideo = () =>
    start(async () => {
      const res = await removeLessonVideo(lesson.id, courseId)
      if (res.ok) {
        setStoragePath(null)
        setBunnyId(null)
        setVideoUrl('')
        toast.success(res.message)
      } else {
        toast.error(res.message)
      }
    })

  // ===== الواجبات =====
  const [newHw, setNewHw] = useState(false)
  const [hwTitle, setHwTitle] = useState('')
  const [hwPassing, setHwPassing] = useState('60')
  const [hwDuration, setHwDuration] = useState('')
  const [hwAttempts, setHwAttempts] = useState('')

  const addHomework = () =>
    start(async () => {
      const res = await createHomework({
        lessonId: lesson.id,
        courseId,
        title: hwTitle,
        passingPercentage: hwPassing,
        durationMinutes: hwDuration,
        maxAttempts: hwAttempts,
      })
      if (res.ok) {
        toast.success(res.message)
        setHwTitle('')
        setNewHw(false)
      } else {
        toast.error(res.message)
      }
    })

  const toggleHomework = (examId: string, published: boolean) =>
    start(async () => {
      const res = await setHomeworkPublished(examId, courseId, published)
      if (res.ok) toast.success(res.message)
      else toast.error(res.message)
    })

  // ===== المرفقات =====
  const [linkTitle, setLinkTitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')

  const addLink = () =>
    start(async () => {
      const res = await addLinkAttachment(lesson.id, courseId, linkTitle, linkUrl)
      if (res.ok) {
        toast.success(res.message)
        setLinkTitle('')
        setLinkUrl('')
      } else {
        toast.error(res.message)
      }
    })

  const dropFile = (attachmentId: string) =>
    start(async () => {
      const res = await unlinkAttachmentFromLesson(attachmentId, lesson.id)
      if (res.ok) toast.success(res.message)
      else toast.error(res.message)
    })

  return (
    <dialog
      ref={dialogRef}
      className="w-[min(46rem,calc(100vw-2rem))] rounded-[var(--radius-panel)] border border-border-subtle bg-surface p-0 text-ink shadow-[var(--shadow-pop)] backdrop:bg-ink/40"
    >
      <header className="flex items-start justify-between gap-4 border-b border-border-subtle p-5">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-ink">إدارة الدرس</h2>
          <p className="mt-0.5 truncate text-base text-ink-muted">{lesson.title}</p>
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="إغلاق"
          className="tap-target grid shrink-0 place-items-center rounded-[var(--radius-field)] text-ink-faint hover:bg-surface-muted hover:text-ink"
        >
          <X className="size-5" aria-hidden />
        </button>
      </header>

      <div
        role="tablist"
        aria-label="أقسام إدارة الدرس"
        className="flex gap-1 border-b border-border-subtle p-3"
      >
        {TABS.map(({ id, label, icon: Icon }, i) => (
          <button
            key={id}
            id={`lesson-tab-${id}`}
            role="tab"
            type="button"
            aria-selected={tab === id}
            aria-controls="lesson-tabpanel"
            // تنقّل السهم: العنصر غير المختار يخرج من ترتيب Tab
            tabIndex={tab === id ? 0 : -1}
            onKeyDown={(e) => {
              // الاتجاه من اليمين لليسار: السهم الأيسر يتقدّم
              const step = e.key === 'ArrowLeft' ? 1 : e.key === 'ArrowRight' ? -1 : 0
              if (!step) return
              e.preventDefault()
              const next = TABS[(i + step + TABS.length) % TABS.length]!
              setTab(next.id)
              document.getElementById(`lesson-tab-${next.id}`)?.focus()
            }}
            onClick={() => setTab(id)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-field)] px-3 py-2.5 text-base transition-colors',
              tab === id
                ? 'bg-brand-800 font-medium text-ink-invert'
                : 'text-ink-muted hover:bg-surface-muted',
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
            {id === 'files' && ` (${formatNumber(lesson.attachments.length)})`}
            {id === 'homework' && ` (${formatNumber(lesson.homework.length)})`}
          </button>
        ))}
      </div>

      <div
        id="lesson-tabpanel"
        role="tabpanel"
        aria-labelledby={`lesson-tab-${tab}`}
        tabIndex={0}
        className="max-h-[60vh] overflow-y-auto p-5"
      >
        {tab === 'content' && (
          <div className="space-y-4">
            <Field label="عنوان الدرس" required>
              {({ id }) => (
                <Input id={id} value={title} onChange={(e) => setTitle(e.target.value)} required />
              )}
            </Field>

            <Field label="شرح الدرس" hint="ما يتعلّمه الطالب هنا — يظهر أسفل المشغّل">
              {({ id }) => (
                <textarea
                  id={id}
                  rows={3}
                  maxLength={2000}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="block w-full rounded-[var(--radius-field)] border border-border-strong bg-surface px-3.5 py-2.5 text-base leading-relaxed text-ink"
                />
              )}
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="الوحدة">
                {({ id }) => (
                  <Select id={id} value={moduleId} onChange={(e) => setModuleId(e.target.value)}>
                    <option value="">بلا وحدة</option>
                    {modules.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>

              <Field label="المدة بالدقائق">
                {({ id }) => (
                  <Input
                    id={id}
                    value={duration}
                    onChange={(e) => setDuration(e.target.value.replace(/\D/g, '').slice(0, 3))}
                    inputMode="numeric"
                    dir="ltr"
                    className="text-start"
                  />
                )}
              </Field>
            </div>

            <Field
              label="القسم المستهدف"
              hint="يتحكّم في ظهور الدرس: للعلمي وحده، أو الأدبي، أو للقسمين معًا"
            >
              {({ id }) => (
                <Select
                  id={id}
                  value={section}
                  onChange={(e) => setSection(e.target.value as ManagedLesson['section'])}
                >
                  <option value="">القسمان (الكل)</option>
                  <option value="scientific">علمي فقط</option>
                  <option value="literary">أدبي فقط</option>
                </Select>
              )}
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-start gap-2.5 rounded-[var(--radius-field)] border border-border-subtle p-4">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="mt-0.5 size-4 rounded border-border-strong"
                />
                <span>
                  <span className="block text-base font-medium text-ink">منشور</span>
                  <span className="block text-sm text-ink-muted">يظهر الدرس للطالب</span>
                </span>
              </label>

              <label className="flex items-start gap-2.5 rounded-[var(--radius-field)] border border-border-subtle p-4">
                <input
                  type="checkbox"
                  checked={isFree}
                  onChange={(e) => setIsFree(e.target.checked)}
                  className="mt-0.5 size-4 rounded border-border-strong"
                />
                <span>
                  <span className="block text-base font-medium text-ink">معاينة مجانية</span>
                  <span className="block text-sm text-ink-muted">متاح دون اشتراك</span>
                </span>
              </label>
            </div>

            <Field
              label="جدولة النشر"
              hint="اتركه فارغًا للنشر الفوري، أو حدّد موعدًا يظهر فيه الدرس تلقائيًّا"
            >
              {({ id }) => (
                <Input
                  id={id}
                  type="datetime-local"
                  value={publishAt}
                  onChange={(e) => setPublishAt(e.target.value)}
                  dir="ltr"
                  className="text-start"
                />
              )}
            </Field>

            <Button loading={pending} loadingText="جارٍ الحفظ…" onClick={saveContent}>
              حفظ الدرس
            </Button>
          </div>
        )}

        {tab === 'video' && (
          <div className="space-y-4">
            {bunnyId ? (
              <p className="flex items-center gap-2 rounded-[var(--radius-field)] bg-success-bg px-3.5 py-3 text-base text-success">
                <Video className="size-4 shrink-0" aria-hidden />
                الفيديو على Bunny Stream — جودات متعدّدة تتكيّف مع شبكة الطالب،
                ورابطه موقّع لا يُشارَك.
              </p>
            ) : storagePath ? (
              <p className="flex items-center gap-2 rounded-[var(--radius-field)] bg-success-bg px-3.5 py-3 text-base text-success">
                <Video className="size-4 shrink-0" aria-hidden />
                الفيديو مستضاف داخل المنصة — لا يظهر مصدره للطالب.
              </p>
            ) : (
              <p className="text-base leading-[1.9] text-ink-muted">
                ضع رابط فيديو يوتيوب. يُعرض للطالب داخل مشغّل المنصة المحمي، بلا
                أي رابط أو زرّ يقود إلى يوتيوب.
              </p>
            )}

            {progress !== null && (
              <div className="space-y-1.5">
                <div
                  role="progressbar"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="تقدّم رفع الفيديو"
                  className="h-2 w-full overflow-hidden rounded-[var(--radius-pill)] bg-border-subtle"
                >
                  <div
                    className="h-full rounded-[var(--radius-pill)] bg-brand-700 transition-[width]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="nums-ar text-sm text-ink-muted">
                  جارٍ الرفع… {formatNumber(progress)}٪ — لا تغلق النافذة.
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-2.5">
              {bunnyEnabled && (
                <>
                  <input
                    ref={bunnyInput}
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
                    className="sr-only"
                    onChange={(e) => uploadToBunny(e.target.files?.[0])}
                  />
                  <Button
                    disabled={pending}
                    onClick={() => bunnyInput.current?.click()}
                  >
                    <Upload aria-hidden />
                    {bunnyId ? 'استبدل فيديو Bunny' : 'ارفع إلى Bunny Stream'}
                  </Button>
                </>
              )}

              {(storagePath || bunnyId || lesson.video) && (
                <Button variant="ghost" disabled={pending} onClick={dropVideo}>
                  <Trash2 aria-hidden />
                  احذف الفيديو
                </Button>
              )}
            </div>

            {bunnyEnabled && !bunnyId && !storagePath && (
              <p className="text-base leading-[1.9] text-ink-faint">
                Bunny Stream أنسب للمحاضرات الطويلة: يحوّل الفيديو إلى عدّة جودات
                فيعمل على الشبكات الضعيفة، والرفع يمضي من متصفّحك إلى Bunny مباشرةً
                بلا حدّ حجم.
              </p>
            )}

            {!storagePath && !bunnyId && (
              <Field label="رابط فيديو يوتيوب" hint="مثل https://youtu.be/… أو https://www.youtube.com/watch?v=…">
                {({ id }) => (
                  <Input
                    id={id}
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    dir="ltr"
                    className="text-start"
                  />
                )}
              </Field>
            )}

            <Field
              label={`نسبة المشاهدة المطلوبة لإكمال الدرس: ${formatNumber(percent)}٪`}
              hint="يُعلَّم الدرس مكتملًا تلقائيًّا عند بلوغ هذه النسبة"
            >
              {({ id }) => (
                <input
                  id={id}
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={percent}
                  onChange={(e) => setPercent(Number(e.target.value))}
                  className="w-full accent-brand-700"
                />
              )}
            </Field>

            <label className="flex items-start gap-2.5 rounded-[var(--radius-field)] border border-border-subtle p-4">
              <input
                type="checkbox"
                checked={allowDownload}
                onChange={(e) => setAllowDownload(e.target.checked)}
                className="mt-0.5 size-4 rounded border-border-strong"
              />
              <span>
                <span className="flex items-center gap-1.5 text-base font-medium text-ink">
                  <ShieldCheck className="size-4" aria-hidden />
                  السماح بالتحميل
                </span>
                <span className="block text-sm leading-relaxed text-ink-muted">
                  الافتراضي ممنوع. المنع يُخفي زرّ التحميل ولا يمنع تسجيل الشاشة —
                  العلامة المائية باسم الطالب هي ما يردع التسريب.
                </span>
              </span>
            </label>

            <Button loading={pending && progress === null} loadingText="جارٍ الحفظ…" onClick={saveVideo}>
              حفظ الفيديو
            </Button>
          </div>
        )}

        {tab === 'homework' && (
          <div className="space-y-5">
            <p className="text-base leading-[1.9] text-ink-muted">
              الواجب اختبار تفاعلي مربوط بهذا الدرس: أسئلة اختيار وصواب وخطأ
              وإجابة قصيرة، يُصحَّح تلقائيًّا وتظهر نتيجته للطالب فور تسليمه.
              يظهر أسفل الدرس، ولا يصل الطالب إليه ما دام الدرس مخفيًّا.
            </p>

            {newHw ? (
              <form
                className="space-y-4 rounded-[var(--radius-card)] border border-border-subtle bg-surface-muted p-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (hwTitle.trim()) addHomework()
                }}
              >
                <h3 className="text-base font-semibold text-ink">واجب جديد</h3>

                <Field label="عنوان الواجب" required>
                  {({ id }) => (
                    <Input
                      id={id}
                      value={hwTitle}
                      onChange={(e) => setHwTitle(e.target.value)}
                      autoFocus
                      required
                    />
                  )}
                </Field>

                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="نسبة النجاح ٪" required>
                    {({ id }) => (
                      <Input
                        id={id}
                        type="number"
                        min={1}
                        max={100}
                        value={hwPassing}
                        onChange={(e) => setHwPassing(e.target.value)}
                        required
                      />
                    )}
                  </Field>

                  <Field label="المدة بالدقائق" hint="فارغة = بلا مؤقّت">
                    {({ id }) => (
                      <Input
                        id={id}
                        type="number"
                        min={1}
                        max={600}
                        value={hwDuration}
                        onChange={(e) => setHwDuration(e.target.value)}
                      />
                    )}
                  </Field>

                  <Field label="عدد المحاولات" hint="فارغ = بلا حدّ">
                    {({ id }) => (
                      <Input
                        id={id}
                        type="number"
                        min={1}
                        max={20}
                        value={hwAttempts}
                        onChange={(e) => setHwAttempts(e.target.value)}
                      />
                    )}
                  </Field>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  <Button
                    type="submit"
                    loading={pending}
                    loadingText="جارٍ الإنشاء…"
                    disabled={!hwTitle.trim()}
                  >
                    <Plus aria-hidden />
                    أنشئ الواجب
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setNewHw(false)}>
                    إلغاء
                  </Button>
                </div>
              </form>
            ) : (
              <Button variant="secondary" onClick={() => setNewHw(true)}>
                <Plus aria-hidden />
                واجب جديد
              </Button>
            )}

            {lesson.homework.length === 0 ? (
              <p className="rounded-[var(--radius-card)] border border-dashed border-border-strong p-6 text-center text-base text-ink-muted">
                لا واجب لهذا الدرس بعد.
              </p>
            ) : (
              <ul className="divide-y divide-border-subtle rounded-[var(--radius-card)] border border-border-subtle">
                {lesson.homework.map((hw) => (
                  <li key={hw.id} className="space-y-3 p-4">
                    <div className="min-w-0">
                      <span className="block text-base font-medium text-ink">{hw.title}</span>
                      <span className="nums-ar mt-1.5 flex flex-wrap items-center gap-2 text-sm">
                        <Badge tone={hw.isPublished ? 'success' : 'neutral'}>
                          {hw.isPublished ? 'منشور' : 'مخفي'}
                        </Badge>
                        <span className="text-ink-faint">
                          {pluralAr(hw.questions, {
                            one: 'سؤال واحد',
                            two: 'سؤالان',
                            few: 'أسئلة',
                            many: 'سؤالًا',
                          })}
                        </span>
                        <span className="text-ink-faint">
                          النجاح {formatNumber(hw.passingPercentage)}٪
                        </span>
                        {hw.attempts > 0 && (
                          <span className="text-ink-faint">
                            {pluralAr(hw.attempts, {
                              one: 'محاولة واحدة',
                              two: 'محاولتان',
                              few: 'محاولات',
                              many: 'محاولة',
                            })}
                          </span>
                        )}
                      </span>
                    </div>

                    {hw.questions === 0 && (
                      <p className="text-base text-warning">
                        لا أسئلة بعد. اضغط «حرّر الأسئلة» لكتابتها.
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      <NextLink
                        href={`/admin/exams/${hw.id}`}
                        className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-field)] bg-brand-700 px-3.5 text-base font-medium text-ink-invert transition-colors hover:bg-brand-800"
                      >
                        <PencilLine className="size-4" aria-hidden />
                        حرّر الأسئلة
                      </NextLink>

                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={pending}
                        onClick={() => toggleHomework(hw.id, !hw.isPublished)}
                      >
                        {hw.isPublished ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                        {hw.isPublished ? 'أخفِه' : 'انشره'}
                      </Button>

                      <ConfirmButton
                        label="افصله عن الدرس"
                        icon={<Unlink aria-hidden />}
                        title="فصل الواجب عن الدرس؟"
                        body={`لن يظهر «${hw.title}» مع الدرس، ويبقى اختبارًا في الكورس بنتائجه.`}
                        confirmLabel="افصله"
                        action={() => detachHomework(hw.id, courseId)}
                      />

                      <ConfirmButton
                        label=""
                        srLabel={`حذف ${hw.title}`}
                        icon={<Trash2 aria-hidden />}
                        title="حذف الواجب؟"
                        body={`سيُحذف «${hw.title}» بأسئلته. الحذف ممنوع إن حلّه طالب.`}
                        confirmLabel="احذف الواجب"
                        action={() => deleteHomework(hw.id, courseId)}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === 'files' && (
          <div className="space-y-5">
            <div className="rounded-[var(--radius-card)] border border-border-subtle p-4">
              <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-ink">
                <Link2 className="size-4" aria-hidden />
                إضافة رابط خارجي
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  placeholder="عنوان الرابط"
                  aria-label="عنوان الرابط"
                />
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  dir="ltr"
                  className="text-start"
                  placeholder="https://…"
                  aria-label="عنوان URL"
                />
              </div>
              <Button
                variant="secondary"
                className="mt-3"
                disabled={pending || !linkTitle.trim() || !linkUrl.trim()}
                onClick={addLink}
              >
                أضف الرابط
              </Button>
            </div>

            <div>
              <h3 className="mb-2 text-base font-semibold text-ink">مرفقات هذا الدرس</h3>
              {lesson.attachments.length === 0 ? (
                <p className="rounded-[var(--radius-card)] border border-dashed border-border-strong p-6 text-center text-base text-ink-muted">
                  لا مرفقات بعد. ارفع ملفًا من صفحة «المرفقات» واربطه بالدرس، أو أضف
                  رابطًا من الأعلى.
                </p>
              ) : (
                <ul className="divide-y divide-border-subtle rounded-[var(--radius-card)] border border-border-subtle">
                  {lesson.attachments.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-3 p-4">
                      <span className="min-w-0">
                        <span className="block truncate text-base font-medium text-ink">
                          {a.title}
                        </span>
                        <span className="nums-ar text-sm text-ink-faint">
                          {a.isLink ? 'رابط خارجي' : formatFileSize(a.size ?? 0)}
                        </span>
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        onClick={() => dropFile(a.id)}
                        aria-label={`فكّ ربط ${a.title}`}
                      >
                        <Trash2 aria-hidden />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </dialog>
  )
}
