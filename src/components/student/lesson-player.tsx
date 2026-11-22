'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { CheckCircle2, Lock, Maximize, ShieldAlert, VideoOff } from 'lucide-react'
import { toast } from 'sonner'
import { markLessonComplete } from '@/lib/mutations/progress'
import { Button } from '@/components/ui/button'
import { VideoWatermark } from '@/components/student/video-watermark'
import { YouTubePlayer } from '@/components/student/youtube-player'
import { useFrameFullscreen } from '@/components/student/use-frame-fullscreen'
import { useWatchTracker } from '@/components/student/use-watch-tracker'

type Props = {
  lessonId: string
  /** اسم الطالب — يظهر علامةً مائية فوق الفيديو لردع التسريب */
  watermark: { name: string; number: string }
  /** فيديو يوتيوب: رابطه لا يصل الصفحة، والمشغّل يطلبه من الخادم */
  isYouTube: boolean
  videoUrl: string | null
  provider: string | null
  /** نسبة المشاهدة التي تُعدّ إكمالًا تلقائيًّا */
  requiredPercent: number
  allowDownload: boolean
  watchedSeconds: number
  progressPercent: number
  completed: boolean
  entitled: boolean
}

/** فيميو وحده بقي إطارًا عاديًّا؛ يوتيوب له مشغّله المُغلَّف. */
function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url)
    if (!u.hostname.replace(/^www\./, '').endsWith('vimeo.com')) return null
    const id = u.pathname.split('/').filter(Boolean)[0]
    if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`
    return url
  } catch {
    return null
  }
}

const DIRECT_VIDEO = /\.(mp4|webm|ogg|m3u8)(\?|$)/i

export function LessonPlayer({
  lessonId,
  watermark,
  isYouTube,
  videoUrl,
  provider,
  requiredPercent,
  allowDownload,
  watchedSeconds,
  progressPercent,
  completed,
  entitled,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const [isComplete, setIsComplete] = useState(completed)
  const [pending, startTransition] = useTransition()
  const onComplete = useCallback(() => setIsComplete(true), [])

  const { isFullscreen, pseudo, toggle: toggleFullscreen } = useFrameFullscreen(frameRef)
  const { tick, save, reanchor } = useWatchTracker({
    lessonId,
    requiredPercent,
    initialPercent: progressPercent,
    onComplete,
  })

  /*
   * Bunny يقدّم HLS، وهو ما لا يفهمه إلا Safari أصلًا.
   * hls.js يُحمَّل عند الحاجة فقط (import ديناميكي)، فلا يُثقل صفحة درس
   * فيديوه ملفّ mp4 عادي.
   */
  useEffect(() => {
    const el = videoRef.current
    if (!el || !videoUrl || provider !== 'bunny') return

    if (el.canPlayType('application/vnd.apple.mpegurl')) {
      el.src = videoUrl
      return
    }

    let hls: { destroy: () => void } | null = null
    let cancelled = false

    void import('hls.js').then(({ default: Hls }) => {
      if (cancelled || !Hls.isSupported()) return
      const instance = new Hls({ enableWorker: true })
      instance.loadSource(videoUrl)
      instance.attachMedia(el)
      hls = instance
    })

    return () => {
      cancelled = true
      hls?.destroy()
    }
  }, [videoUrl, provider])

  /*
   * المشاهدة الفعلية تُعدّ بنبضة كل ثانية، والسحب يُعيد نقطة البداية بلا
   * احتساب القفزة. وملء الشاشة الأصلي للفيديو يُحوَّل إلى ملء شاشة الإطار
   * كي لا تسقط العلامة المائية (النقر المزدوج في Chrome يدخله مباشرة).
   */
  useEffect(() => {
    const el = videoRef.current
    if (!el) return

    const onMeta = () => {
      if (watchedSeconds > 0 && watchedSeconds < el.duration) el.currentTime = watchedSeconds
      reanchor(el.currentTime)
    }
    const onSeeked = () => reanchor(el.currentTime)
    const onPause = () => save(Math.floor(el.currentTime), el.duration)
    const onEnded = () => save(Math.floor(el.duration), el.duration)
    const onNativeFs = () => {
      if (document.fullscreenElement === el) {
        void document.exitFullscreen().then(() => toggleFullscreen())
      }
    }

    const id = setInterval(() => {
      if (!el.paused && !el.ended) tick(el.currentTime, el.duration)
    }, 1000)

    if (el.readyState >= 1) onMeta()
    el.addEventListener('loadedmetadata', onMeta)
    el.addEventListener('seeked', onSeeked)
    el.addEventListener('pause', onPause)
    el.addEventListener('ended', onEnded)
    document.addEventListener('fullscreenchange', onNativeFs)
    return () => {
      clearInterval(id)
      el.removeEventListener('loadedmetadata', onMeta)
      el.removeEventListener('seeked', onSeeked)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('ended', onEnded)
      document.removeEventListener('fullscreenchange', onNativeFs)
    }
  }, [watchedSeconds, tick, save, reanchor, toggleFullscreen])

  const complete = () =>
    startTransition(async () => {
      const res = await markLessonComplete(lessonId)
      if (res.ok) {
        setIsComplete(true)
        toast.success('تم تعليم الدرس كمكتمل.')
      } else {
        toast.error('تعذّر الحفظ. أعد المحاولة.')
      }
    })

  /*
   * أدوات المطوّر مفتوحة (يكشفها public/guard.js): يُزال المشغّل من الصفحة
   * كلّه — فيُهدم إطار الفيديو ولا يبقى رابطه فيما تعرضه الأدوات.
   * ولا يعود إلا بتحديث الصفحة بعد إغلاقها.
   */
  const [devtools, setDevtools] = useState(false)
  useEffect(() => {
    const w = window as Window & { __najahDevtools?: () => boolean }
    if (w.__najahDevtools?.()) setDevtools(true)
    const on = () => setDevtools(true)
    window.addEventListener('najah:devtools', on)
    return () => window.removeEventListener('najah:devtools', on)
  }, [])

  if (devtools) {
    return (
      <div className="flex aspect-video flex-col items-center justify-center rounded-[var(--radius-card)] border border-danger/30 bg-danger-bg px-6 text-center">
        <ShieldAlert className="mb-3 size-7 text-danger" aria-hidden />
        <p className="text-base font-semibold text-danger">تم إيقاف الفيديو</p>
        <p className="mt-1.5 max-w-sm text-base leading-relaxed text-ink-muted">
          أدوات المطوّر مفتوحة في المتصفّح. أغلقها ثم حدّث الصفحة لمتابعة الدرس.
        </p>
      </div>
    )
  }

  if (!entitled) {
    return (
      <div className="flex aspect-video flex-col items-center justify-center rounded-[var(--radius-card)] border border-border-subtle bg-surface-muted px-6 text-center">
        <Lock className="mb-3 size-6 text-ink-faint" aria-hidden />
        <p className="text-base font-medium text-ink">هذا الدرس للمشتركين</p>
        <p className="mt-1.5 max-w-xs text-base leading-relaxed text-ink-muted">
          فعّل كود التفعيل من صفحة «مقرراتي» لفتح المقرر كاملًا.
        </p>
      </div>
    )
  }

  if (!videoUrl && !isYouTube) {
    return (
      <div className="flex aspect-video flex-col items-center justify-center rounded-[var(--radius-card)] border border-border-subtle bg-surface-muted px-6 text-center">
        <VideoOff className="mb-3 size-6 text-ink-faint" aria-hidden />
        <p className="text-base font-medium text-ink">لا يوجد فيديو لهذا الدرس</p>
        <p className="mt-1.5 text-base text-ink-muted">راجع شرح الدرس والمرفقات بالأسفل.</p>
      </div>
    )
  }

  const url = videoUrl ?? ''
  const embed = isYouTube ? null : toEmbedUrl(url)
  // المستضاف داخل المنصة يصل عبر مسار موقّع لا امتداد له، فيُعرف بمقدّمه
  const isDirect =
    !isYouTube && (provider === 'self' || provider === 'bunny' || DIRECT_VIDEO.test(url))
  // يوتيوب والفيديو المباشر يُقاس تقدّمهما تلقائيًّا؛ غيرهما يُعلَّم يدويًّا
  const tracked = isYouTube || isDirect

  return (
    <div className="space-y-3">
      {isYouTube ? (
        <YouTubePlayer
          lessonId={lessonId}
          watermark={watermark}
          requiredPercent={requiredPercent}
          initialPercent={progressPercent}
          resumeAt={watchedSeconds}
          onComplete={onComplete}
        />
      ) : (
        <div
          ref={frameRef}
          onContextMenu={allowDownload ? undefined : (e) => e.preventDefault()}
          className={
            pseudo
              ? 'fixed inset-0 z-50 flex items-center bg-black'
              : `relative overflow-hidden bg-brand-900 ${isFullscreen ? 'flex items-center' : 'rounded-[var(--radius-card)] border border-border-subtle'}`
          }
        >
          <div className="relative w-full">
            <VideoWatermark label={watermark.name} number={watermark.number} />

            {isDirect ? (
              <>
                <video
                  ref={videoRef}
                  // مصدر HLS يُركّبه hls.js أعلاه؛ السمة تكسره في المتصفّحات التي لا تفهمه
                  src={provider === 'bunny' ? undefined : url}
                  controls
                  // ملء الشاشة من زرّ المنصة لا من المشغّل، كي تبقى العلامة المائية
                  controlsList={allowDownload ? 'nofullscreen' : 'nodownload nofullscreen'}
                  disablePictureInPicture
                  playsInline
                  preload="metadata"
                  className="aspect-video w-full"
                >
                  متصفحك لا يدعم تشغيل الفيديو.
                </video>
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="absolute end-3 top-3 z-20 grid size-9 place-items-center rounded-full bg-black/50 text-white hover:bg-black/70"
                  aria-label={isFullscreen ? 'الخروج من ملء الشاشة' : 'ملء الشاشة'}
                >
                  <Maximize className="size-4" aria-hidden />
                </button>
              </>
            ) : embed ? (
              // مشغّلات الطرف الثالث لا تُتيح قراءة زمن المشاهدة، فالإكمال يدوي
              <iframe
                src={embed}
                title="مشغّل الدرس"
                allow="autoplay; encrypted-media"
                referrerPolicy="strict-origin-when-cross-origin"
                className="aspect-video w-full border-0"
              />
            ) : (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex aspect-video items-center justify-center p-6 text-center text-base text-ink-invert underline-offset-4 hover:underline"
              >
                افتح الفيديو في نافذة جديدة
              </a>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        {isComplete ? (
          <p className="flex items-center gap-1.5 text-base text-success">
            <CheckCircle2 className="size-4" aria-hidden />
            أكملت هذا الدرس
          </p>
        ) : (
          <p className="text-base text-ink-faint">
            {tracked ? 'يُحفظ تقدّمك تلقائيًا أثناء المشاهدة.' : 'علّم الدرس كمكتمل بعد مشاهدته.'}
          </p>
        )}

        {/* حيث تُقاس المشاهدة لا يُعلَّم الدرس يدويًّا — وإلا صار «شاف» بلا مشاهدة */}
        {!isComplete && !tracked && (
          <Button variant="secondary" size="sm" loading={pending} onClick={complete}>
            <CheckCircle2 aria-hidden />
            تعليم كمكتمل
          </Button>
        )}
      </div>
    </div>
  )
}
