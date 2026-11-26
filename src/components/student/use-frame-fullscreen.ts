'use client'

import { useCallback, useEffect, useState, type CSSProperties, type RefObject } from 'react'

/**
 * ملء الشاشة على **الإطار** لا على الفيديو.
 *
 * لو دخل عنصر الفيديو (أو إطار يوتيوب) ملء الشاشة وحده، سقط كل ما فوقه —
 * والعلامة المائية فوقه. فيصير التصوير في ملء الشاشة نسخةً بلا اسم الطالب.
 * لذلك يدخل الإطار كله ملء الشاشة، والعلامة معه.
 *
 * آيفون لا يتيح ملء الشاشة إلا لعنصر الفيديو نفسه، فالبديل هناك تثبيتُ
 * الإطار على كامل النافذة بـCSS.
 *
 * **بالعرض كالألعاب**: على الموبايل يدخل الفيديو ملء الشاشة بالعرض.
 *  - أندرويد: يُقفل اتجاه الشاشة على العرض (screen.orientation.lock).
 *  - آيفون، أو حيث رُفض القفل: الهاتف ما زال قائمًا، فتُدار «المنصّة»
 *    ٩٠ درجة لتملأ الشاشة بالعرض. وتُدار من الداخل لا الإطار نفسه، لأن
 *    المتصفّح يلغي أي تدوير على العنصر الذي في ملء الشاشة.
 * وفي الحالتين يُحجَّم الفيديو ليسع الشاشة كاملًا (١٦:٩ داخلها) بلا قصّ.
 */

type Layout = { stage: CSSProperties; box: CSSProperties }

const isTouch = () =>
  typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

type LockableOrientation = ScreenOrientation & {
  lock?: (o: 'landscape') => Promise<void>
}

export function useFrameFullscreen(frameRef: RefObject<HTMLElement | null>) {
  const [native, setNative] = useState(false)
  const [pseudo, setPseudo] = useState(false)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const isFullscreen = native || pseudo

  useEffect(() => {
    const onChange = () => {
      const on = document.fullscreenElement === frameRef.current
      setNative(on)
      if (!on) screen.orientation?.unlock?.()
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [frameRef])

  // ملء الشاشة البديل يُغلق بزرّ Esc كالأصلي، ويمنع تمرير الصفحة خلفه
  useEffect(() => {
    if (!pseudo) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPseudo(false)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [pseudo])

  // مقاس الشاشة أثناء ملء الشاشة: يتغيّر بالتدوير وبشريط عنوان سفاري
  useEffect(() => {
    if (!isFullscreen) {
      setSize(null)
      return
    }
    const measure = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('orientationchange', measure)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('orientationchange', measure)
    }
  }, [isFullscreen])

  const toggle = useCallback(() => {
    const el = frameRef.current
    if (!el) return

    if (document.fullscreenElement) {
      void document.exitFullscreen()
      return
    }
    if (pseudo) {
      setPseudo(false)
      return
    }
    if (el.requestFullscreen) {
      el.requestFullscreen()
        .then(() => {
          if (isTouch()) {
            ;(screen.orientation as LockableOrientation | undefined)
              ?.lock?.('landscape')
              .catch(() => {})
          }
        })
        .catch(() => setPseudo(true))
    } else {
      setPseudo(true)
    }
  }, [frameRef, pseudo])

  let layout: Layout | null = null
  if (isFullscreen && size) {
    // الهاتف قائم: تُدار المنصّة بالعرض (إن لم يُقفَل الاتجاه أصلًا)
    const rotate = isTouch() && size.h > size.w
    const areaW = rotate ? size.h : size.w
    const areaH = rotate ? size.w : size.h
    const center: CSSProperties = {
      position: 'absolute',
      top: 0,
      left: 0,
      width: areaW,
      height: areaH,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }
    layout = {
      stage: rotate
        ? { ...center, transform: `translateX(${size.w}px) rotate(90deg)`, transformOrigin: 'top left' }
        : center,
      box: { width: Math.min(areaW, (areaH * 16) / 9) },
    }
  }

  return { isFullscreen, pseudo, toggle, layout }
}
