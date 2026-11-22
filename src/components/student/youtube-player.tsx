'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { preconnect, preload } from 'react-dom'
import { Loader2, Maximize, Minimize, Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react'
import { VideoWatermark } from '@/components/student/video-watermark'
import { useFrameFullscreen } from '@/components/student/use-frame-fullscreen'
import { useWatchTracker } from '@/components/student/use-watch-tracker'
import { getYouTubeSource } from '@/lib/mutations/video-source'

/**
 * مشغّل يوتيوب مُغلَّف بالكامل.
 *
 * مشغّل يوتيوب العادي فيه ما يقود الطالب إلى الفيديو الأصلي ثم إلى تحميله:
 * العنوان، وزرّ «مشاهدة على YouTube»، والمشاركة، وقائمة الزرّ الأيمن
 * («نسخ رابط الفيديو»)، والمقترحات عند التوقّف والنهاية.
 *
 * هنا يُشغَّل بلا أدوات تحكّم (`controls=0`)، ويغطّيه غطاءٌ كامل يلتقط كل
 * نقرة، فلا يصل الطالب إلى أي جزء من واجهة يوتيوب. التحكّم كله من أزرار
 * المنصة، وأي حالة غير التشغيل يحجبها ستار معتم يُخفي ما يعرضه يوتيوب فيها.
 *
 * ويتيح الـAPI قراءة زمن المشاهدة، فصار تقدّم دروس يوتيوب يُحتسب تلقائيًّا.
 *
 * ومعرّف الفيديو لا يُكتب في الصفحة: يُطلب من الخادم عند فتح المشغّل، ولا
 * يعود إلا لمشترك. فلا يجده «عرض المصدر» ولا من يحفظ الصفحة.
 *
 * حدّ صريح: المتصفّح نفسه يطلب الفيديو من يوتيوب بمعرّفه، فمن يفتح أدوات
 * المطوّر أثناء التشغيل يراه. الحماية الكاملة (تشفير المقاطع، ومنع برامج
 * التحميل) لا تكون إلا بنقل الفيديو إلى Bunny Stream مع DRM.
 */

type YTPlayer = {
  playVideo(): void
  pauseVideo(): void
  seekTo(seconds: number, allowSeekAhead: boolean): void
  getCurrentTime(): number
  getDuration(): number
  getPlayerState(): number
  mute(): void
  unMute(): void
  isMuted(): boolean
  setPlaybackRate(rate: number): void
  destroy(): void
}

type YTNamespace = {
  Player: new (
    el: HTMLElement,
    opts: {
      host?: string
      width?: string
      height?: string
      videoId: string
      playerVars?: Record<string, string | number>
      events?: {
        onReady?: () => void
        onStateChange?: (e: { data: number }) => void
      }
    },
  ) => YTPlayer
}

declare global {
  interface Window {
    YT?: YTNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

const STATE = { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3 } as const
const RATES = [1, 1.25, 1.5, 2] as const

let apiPromise: Promise<YTNamespace> | null = null

/** يُحمَّل سكربت يوتيوب مرّة واحدة للصفحة كلّها. */
function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (apiPromise) return apiPromise

  apiPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prev?.()
      if (window.YT) resolve(window.YT)
    }
    const s = document.createElement('script')
    s.src = 'https://www.youtube.com/iframe_api'
    s.async = true
    document.head.appendChild(s)
  })
  return apiPromise
}

const clock = (s: number) => {
  const t = Math.max(0, Math.floor(s))
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const sec = String(t % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

export function YouTubePlayer({
  lessonId,
  watermark,
  requiredPercent,
  initialPercent,
  resumeAt,
  onComplete,
}: {
  lessonId: string
  watermark: { name: string; number: string }
  requiredPercent: number
  initialPercent: number
  resumeAt: number
  onComplete: () => void
}) {
  /*
   * المتصفّح يفتح الاتصال بيوتيوب ويجلب سكربته مع الصفحة نفسها، لا بعد أن
   * يُبنى المشغّل — يوفّر ثانية أو أكثر قبل أن تظهر الصورة.
   */
  preconnect('https://www.youtube-nocookie.com')
  preconnect('https://www.youtube.com')
  preconnect('https://i.ytimg.com')
  preload('https://www.youtube.com/iframe_api', { as: 'script' })

  const frameRef = useRef<HTMLDivElement>(null)
  const mountRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YTPlayer | null>(null)

  const [ready, setReady] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const [state, setState] = useState<number>(-1)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [muted, setMuted] = useState(false)
  const [rate, setRate] = useState<number>(1)
  const { isFullscreen, pseudo, toggle: toggleFullscreen } = useFrameFullscreen(frameRef)
  const { tick, save, reanchor } = useWatchTracker({
    lessonId,
    requiredPercent,
    initialPercent,
    onComplete,
  })

  useEffect(() => {
    let cancelled = false
    let player: YTPlayer | null = null

    void Promise.all([getYouTubeSource(lessonId), loadYouTubeApi()]).then(([src, YT]) => {
      if (cancelled || !mountRef.current) return
      if (!src) {
        setUnavailable(true)
        return
      }
      const videoId = src.id
      player = new YT.Player(mountRef.current, {
        host: 'https://www.youtube-nocookie.com',
        width: '100%',
        height: '100%',
        videoId,
        playerVars: {
          controls: 0,
          disablekb: 1,
          fs: 0,
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3,
          playsinline: 1,
          cc_load_policy: 0,
          start: Math.floor(resumeAt),
          /*
           * يوتيوب يرفض التضمين بلا هويّة الموقع («Error 153»): المشغّل
           * القديم كان يمنع إرسال المُحيل، فتوقّفت الفيديوهات كلها.
           * المصدر هنا يُعلن صراحةً، وسياسة المُحيل في الموقع ترسل النطاق.
           */
          origin: window.location.origin,
          widget_referrer: window.location.origin,
        },
        events: {
          onReady: () => {
            if (cancelled) return
            playerRef.current = player
            setDuration(player?.getDuration() ?? 0)
            setTime(resumeAt)
            reanchor(resumeAt)
            setReady(true)
          },
          onStateChange: (e) => setState(e.data),
        },
      })
    })

    return () => {
      cancelled = true
      playerRef.current = null
      player?.destroy()
    }
    // المشغّل يُبنى مرّة لكل درس؛ resumeAt قيمة البداية فقط
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId])

  // نبضة كل ثانية أثناء التشغيل: تحديث الشريط وحساب المشاهدة الفعلية
  useEffect(() => {
    if (state !== STATE.PLAYING) return
    const id = setInterval(() => {
      const p = playerRef.current
      if (!p) return
      const t = p.getCurrentTime()
      const d = p.getDuration()
      setTime(t)
      if (d) setDuration(d)
      tick(t, d)
    }, 1000)
    return () => clearInterval(id)
  }, [state, tick])

  // التوقّف والنهاية: حفظ فوري لا انتظارًا للنبضة الخامسة عشرة
  useEffect(() => {
    const p = playerRef.current
    if (!p || (state !== STATE.PAUSED && state !== STATE.ENDED)) return
    save(p.getCurrentTime(), p.getDuration())
  }, [state, save])

  const playing = state === STATE.PLAYING || state === STATE.BUFFERING

  const togglePlay = useCallback(() => {
    const p = playerRef.current
    if (!p) return
    if (playing) p.pauseVideo()
    else {
      if (state === STATE.ENDED) {
        p.seekTo(0, true)
        reanchor(0)
      }
      p.playVideo()
    }
  }, [playing, state, reanchor])

  const seek = (to: number) => {
    const p = playerRef.current
    if (!p) return
    p.seekTo(to, true)
    setTime(to)
    reanchor(to)
  }

  const toggleMute = () => {
    const p = playerRef.current
    if (!p) return
    if (p.isMuted()) p.unMute()
    else p.mute()
    setMuted(!muted)
  }

  const changeRate = (r: number) => {
    playerRef.current?.setPlaybackRate(r)
    setRate(r)
  }

  // لوحة المفاتيح على الإطار: مسافة للتشغيل، والأسهم ١٠ ثوانٍ
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget) return
    if (e.key === ' ' || e.key === 'k') {
      e.preventDefault()
      togglePlay()
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      // الواجهة من اليمين لليسار، لكن الزمن في الفيديو من اليسار لليمين
      seek(Math.max(0, Math.min(duration, time + (e.key === 'ArrowRight' ? 10 : -10))))
    } else if (e.key === 'f') {
      toggleFullscreen()
    }
  }

  return (
    <div
      ref={frameRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onContextMenu={(e) => e.preventDefault()}
      aria-label="مشغّل الدرس"
      className={
        pseudo
          ? 'fixed inset-0 z-50 flex items-center bg-black'
          : `relative overflow-hidden bg-black ${isFullscreen ? 'flex items-center' : 'rounded-[var(--radius-card)] border border-border-subtle'}`
      }
    >
      <div className="relative aspect-video w-full select-none">
        {/*
         * القصّ: إطار يوتيوب أطول من المساحة الظاهرة بالنصف، ومزاح لأعلى بالربع.
         * الفيديو ١٦:٩ يملأ عرض الإطار فيقع في وسطه تمامًا كاملًا، وما فوقه
         * وتحته شريطان أسودان يرسم عليهما يوتيوب العنوان واسم القناة و«More
         * videos» — وهما خارج المساحة الظاهرة. فلا يظهر شيء منها، ولا
         * حاجة لستار ولا انتظار عند التشغيل.
         */}
        <div className="absolute inset-x-0 top-[-25%] h-[150%] [&_iframe]:size-full">
          {/* يوتيوب يستبدل هذا العنصر بإطاره */}
          <div ref={mountRef} />
        </div>

        {/*
         * الغطاء الكامل: يلتقط كل نقرة وكل زرّ أيمن، فلا يصل الطالب إلى
         * واجهة يوتيوب ولا إلى «نسخ رابط الفيديو».
         */}
        <div
          aria-hidden
          className="absolute inset-0 z-[5] cursor-pointer"
          onClick={togglePlay}
          onDoubleClick={toggleFullscreen}
        />

        {/* الستار: في غير التشغيل يحجب العنوان والمقترحات التي يعرضها يوتيوب */}
        {!playing && (
          <button
            type="button"
            onClick={togglePlay}
            disabled={!ready}
            className="absolute inset-0 z-[6] grid place-items-center bg-brand-900"
            aria-label={state === STATE.ENDED ? 'إعادة التشغيل' : 'تشغيل'}
          >
            <span className="grid size-16 place-items-center rounded-full bg-white/15 text-white ring-1 ring-white/30 transition-transform hover:scale-105">
              {unavailable ? (
                <span className="px-4 text-center text-base">تعذّر تشغيل الفيديو. حدّث الصفحة.</span>
              ) : !ready ? (
                <Loader2 className="size-7 animate-spin" aria-hidden />
              ) : state === STATE.ENDED ? (
                <RotateCcw className="size-7" aria-hidden />
              ) : (
                <Play className="size-7 translate-x-[-2px] fill-current" aria-hidden />
              )}
            </span>
          </button>
        )}

        <VideoWatermark label={watermark.name} number={watermark.number} />

        {/* شريط التحكّم — اتّجاهه من اليسار لليمين كأي مشغّل فيديو */}
        <div
          dir="ltr"
          className="absolute inset-x-0 bottom-0 z-20 flex items-center gap-2 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-6 text-white"
        >
          <button
            type="button"
            onClick={togglePlay}
            disabled={!ready}
            className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-white/15"
            aria-label={playing ? 'إيقاف مؤقّت' : 'تشغيل'}
          >
            {playing ? <Pause className="size-5 fill-current" aria-hidden /> : <Play className="size-5 fill-current" aria-hidden />}
          </button>

          <span className="shrink-0 text-xs tabular-nums">{clock(time)}</span>

          <input
            type="range"
            min={0}
            max={duration || 1}
            step={1}
            value={Math.min(time, duration || 1)}
            onChange={(e) => seek(Number(e.target.value))}
            disabled={!ready}
            className="h-1 min-w-0 flex-1 cursor-pointer accent-[var(--color-accent)]"
            aria-label="موضع الفيديو"
          />

          <span className="shrink-0 text-xs tabular-nums">{clock(duration)}</span>

          <button
            type="button"
            onClick={toggleMute}
            className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-white/15"
            aria-label={muted ? 'تشغيل الصوت' : 'كتم الصوت'}
          >
            {muted ? <VolumeX className="size-5" aria-hidden /> : <Volume2 className="size-5" aria-hidden />}
          </button>

          <select
            value={rate}
            onChange={(e) => changeRate(Number(e.target.value))}
            className="h-8 shrink-0 cursor-pointer rounded bg-white/10 px-1 text-xs text-white [&>option]:text-black"
            aria-label="سرعة التشغيل"
          >
            {RATES.map((r) => (
              <option key={r} value={r}>
                {r}×
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-white/15"
            aria-label={isFullscreen ? 'الخروج من ملء الشاشة' : 'ملء الشاشة'}
          >
            {isFullscreen ? <Minimize className="size-5" aria-hidden /> : <Maximize className="size-5" aria-hidden />}
          </button>
        </div>
      </div>
    </div>
  )
}
