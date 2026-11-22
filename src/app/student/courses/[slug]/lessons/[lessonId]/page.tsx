import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Clock,
  Download,
  FileText,
  ExternalLink,
  Link as LinkIcon,
  ClipboardList,
  CheckCircle2,
} from 'lucide-react'
import { requireStudent } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'
import { youTubeId } from '@/lib/utils/youtube'
import { getLesson } from '@/lib/queries/course'
import { Card, Badge } from '@/components/ui/card'
import { LessonPlayer } from '@/components/student/lesson-player'
import { formatDuration, formatFileSize, formatNumber } from '@/lib/utils/format'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>
}): Promise<Metadata> {
  const { slug, lessonId } = await params
  const lesson = await getLesson(slug, lessonId)
  return { title: lesson?.title ?? 'الدرس' }
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>
}) {
  const student = await requireStudent()
  const { slug, lessonId } = await params

  /*
   * العلامة المائية: الاسم مع رقم الموبايل.
   * الاسم وحده قد يتكرّر بين طالبين؛ والرقم يدلّ على صاحب النسخة المسرَّبة
   * مباشرةً، ويردع الطالب نفسه عن نشر فيديو عليه رقمه. ومن لا رقم له
   * يظهر آخر ستة أحرف من مُعرّف حسابه.
   */
  const supabase = await createClient()
  const { data: me } = await supabase
    .from('profiles')
    .select('phone')
    .eq('id', student.id)
    .maybeSingle()
  const watermark = { name: student.fullName, number: me?.phone?.trim() || student.id.slice(-6) }
  const lesson = await getLesson(slug, lessonId)

  if (!lesson) notFound()

  // رابط يوتيوب لا يُرسل إلى المتصفّح مع الصفحة؛ المشغّل يطلبه عند فتحه
  const isYouTube = Boolean(youTubeId(lesson.videoUrl))

  return (
    <div className="space-y-5">
      <Link
        href={`/student/courses/${slug}`}
        className="inline-flex items-center gap-1.5 text-base text-ink-muted underline-offset-4 hover:text-ink hover:underline"
      >
        <ArrowRight className="size-4" aria-hidden />
        {lesson.courseTitle}
      </Link>

      <div>
        <h1 className="text-lg font-semibold text-ink sm:text-xl">{lesson.title}</h1>
        {lesson.durationSeconds > 0 && (
          <p className="nums-ar mt-1 flex items-center gap-1.5 text-base text-ink-faint">
            <Clock className="size-3.5" aria-hidden />
            {formatDuration(lesson.durationSeconds)}
          </p>
        )}
      </div>

      <LessonPlayer
        lessonId={lesson.id}
        watermark={watermark}
        isYouTube={isYouTube}
        videoUrl={isYouTube ? null : lesson.videoUrl}
        provider={lesson.provider}
        requiredPercent={lesson.requiredPercent}
        allowDownload={lesson.allowDownload}
        watchedSeconds={lesson.watchedSeconds}
        progressPercent={lesson.progressPercent}
        completed={lesson.completed}
        entitled={lesson.entitled}
      />

      {lesson.description && (
        <Card className="p-5">
          <h2 className="mb-2 text-base font-semibold text-ink">عن الدرس</h2>
          <p className="whitespace-pre-wrap text-base leading-relaxed text-ink-muted">
            {lesson.description}
          </p>
        </Card>
      )}

      {lesson.homework.length > 0 && (
        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-ink">
            <ClipboardList className="size-4 text-ink-muted" aria-hidden />
            واجب هذا الدرس
          </h2>

          <ul className="divide-y divide-border-subtle">
            {lesson.homework.map((hw) => {
              const outOfTries =
                hw.maxAttempts !== null && hw.attemptsUsed >= hw.maxAttempts && !hw.passed

              return (
                <li
                  key={hw.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-medium text-ink">{hw.title}</span>
                      {hw.passed && (
                        <Badge tone="success">
                          <CheckCircle2 className="size-3" aria-hidden /> اجتزته
                        </Badge>
                      )}
                    </span>

                    <span className="nums-ar mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-faint">
                      <span>النجاح {formatNumber(hw.passingPercentage)}٪</span>
                      {hw.durationMinutes !== null && (
                        <span>{formatDuration(hw.durationMinutes * 60)}</span>
                      )}
                      {hw.bestPercent !== null && (
                        <span>أفضل نتيجة {formatNumber(Math.round(hw.bestPercent))}٪</span>
                      )}
                      {hw.maxAttempts !== null && (
                        <span>
                          {formatNumber(hw.attemptsUsed)} من{' '}
                          {formatNumber(hw.maxAttempts)} محاولة
                        </span>
                      )}
                    </span>
                  </span>

                  {outOfTries ? (
                    <span className="shrink-0 text-base text-ink-faint">
                      انتهت محاولاتك في هذا الواجب
                    </span>
                  ) : (
                    <Link
                      href={`/student/exams/${hw.id}`}
                      className="inline-flex h-11 shrink-0 items-center gap-2 rounded-[var(--radius-field)] bg-brand-700 px-4 text-base font-medium text-ink-invert transition-colors hover:bg-brand-800"
                    >
                      <ClipboardList className="size-4" aria-hidden />
                      {hw.attemptsUsed > 0 ? 'أعد المحاولة' : 'ابدأ الواجب'}
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      {lesson.attachments.length > 0 && (
        <Card className="p-5">
          <h2 className="mb-3 text-base font-semibold text-ink">مرفقات هذا الدرس</h2>
          <ul className="divide-y divide-border-subtle">
            {lesson.attachments.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <span className="flex min-w-0 items-center gap-2.5">
                  {a.isLink ? (
                    <LinkIcon className="size-4 shrink-0 text-ink-faint" aria-hidden />
                  ) : (
                    <FileText className="size-4 shrink-0 text-ink-faint" aria-hidden />
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-base font-medium text-ink">{a.title}</span>
                    <span className="nums-ar text-sm text-ink-faint">
                      {a.isLink ? 'رابط خارجي' : formatFileSize(a.fileSize ?? 0)}
                    </span>
                  </span>
                </span>
                <a
                  href={a.isLink ? `/attachments/${a.id}` : `/attachments/${a.id}?download=1`}
                  target={a.isLink ? '_blank' : undefined}
                  rel={a.isLink ? 'noopener noreferrer' : undefined}
                  className="tap-target grid shrink-0 place-items-center rounded-[var(--radius-field)] text-ink-faint hover:bg-surface-muted hover:text-ink"
                  aria-label={a.isLink ? `افتح ${a.title}` : `تحميل ${a.title}`}
                >
                  {a.isLink ? (
                    <ExternalLink className="size-4" aria-hidden />
                  ) : (
                    <Download className="size-4" aria-hidden />
                  )}
                </a>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <nav aria-label="التنقّل بين الدروس" className="flex items-center justify-between gap-3">
        {lesson.prevId ? (
          <Link
            href={`/student/courses/${slug}/lessons/${lesson.prevId}`}
            className="inline-flex h-11 items-center gap-1.5 rounded-[var(--radius-field)] border border-border-strong bg-surface px-4 text-base hover:bg-surface-muted"
          >
            <ChevronRight className="size-4" aria-hidden />
            الدرس السابق
          </Link>
        ) : (
          <span />
        )}

        {lesson.nextId ? (
          <Link
            href={`/student/courses/${slug}/lessons/${lesson.nextId}`}
            className="inline-flex h-11 items-center gap-1.5 rounded-[var(--radius-field)] bg-brand-700 px-4 text-base font-medium text-ink-invert hover:bg-brand-800"
          >
            الدرس التالي
            <ChevronLeft className="size-4" aria-hidden />
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  )
}
