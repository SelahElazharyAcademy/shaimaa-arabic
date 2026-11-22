'use client'

import { useCallback, useRef } from 'react'
import { saveLessonProgress } from '@/lib/mutations/progress'

/**
 * يقيس ما **شوهد فعلًا** لا موضع المؤشّر.
 *
 * النسبة القديمة كانت «الموضع ÷ المدّة»، فمن سحب المؤشّر إلى آخر الفيديو
 * عُدّ أنه شاهده كاملًا — وتقرير «مين شاف ومين مشافش» يصير بلا معنى.
 * هنا لا يُحتسب إلا تقدّم طبيعي بين نبضتين متتاليتين (ثوانٍ قليلة، تتّسع
 * لسرعة ٢×)؛ القفزة بالسحب لا تُضاف.
 */

/** أقصى تقدّم مقبول بين نبضتين متتاليتين (ثانية واحدة بسرعة ٢× مع هامش). */
const MAX_NATURAL_STEP = 3
const SAVE_EVERY_TICKS = 15

export function useWatchTracker({
  lessonId,
  requiredPercent,
  initialPercent,
  onComplete,
}: {
  lessonId: string
  requiredPercent: number
  initialPercent: number
  onComplete: () => void
}) {
  const watched = useRef(0)
  const lastPos = useRef<number | null>(null)
  const ticks = useRef(0)
  const best = useRef(initialPercent)
  const reported = useRef(initialPercent >= requiredPercent)

  const percentFor = (duration: number) => {
    const fromBefore = (initialPercent / 100) * duration
    return Math.min(100, ((fromBefore + watched.current) / duration) * 100)
  }

  const save = useCallback(
    (position: number, duration: number) => {
      if (!duration) return
      const percent = Math.max(best.current, percentFor(duration))
      best.current = percent
      void saveLessonProgress({
        lessonId,
        watchedSeconds: position,
        progressPercent: percent,
      }).then((res) => {
        if (res.ok && percent >= requiredPercent && !reported.current) {
          reported.current = true
          onComplete()
        }
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lessonId, requiredPercent, initialPercent, onComplete],
  )

  /** يُستدعى كل ثانية تقريبًا أثناء التشغيل. */
  const tick = useCallback(
    (position: number, duration: number) => {
      if (!duration || Number.isNaN(duration)) return

      if (lastPos.current !== null) {
        const step = position - lastPos.current
        if (step > 0 && step <= MAX_NATURAL_STEP) watched.current += step
      }
      lastPos.current = position

      ticks.current += 1
      const crossed = !reported.current && percentFor(duration) >= requiredPercent
      if (crossed || ticks.current % SAVE_EVERY_TICKS === 0) save(position, duration)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [save, requiredPercent, initialPercent],
  )

  /** بعد سحب المؤشّر: نقطة بداية جديدة، بلا احتساب القفزة. */
  const reanchor = useCallback((position: number) => {
    lastPos.current = position
  }, [])

  return { tick, save, reanchor }
}
