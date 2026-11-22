'use client'

import { useCallback, useEffect, useState, type RefObject } from 'react'

/**
 * ملء الشاشة على **الإطار** لا على الفيديو.
 *
 * لو دخل عنصر الفيديو (أو إطار يوتيوب) ملء الشاشة وحده، سقط كل ما فوقه —
 * والعلامة المائية فوقه. فيصير التصوير في ملء الشاشة نسخةً بلا اسم الطالب.
 * لذلك يدخل الإطار كله ملء الشاشة، والعلامة معه.
 *
 * آيفون لا يتيح ملء الشاشة إلا لعنصر الفيديو نفسه، فالبديل هناك تثبيتُ
 * الإطار على كامل النافذة بـCSS.
 */
export function useFrameFullscreen(frameRef: RefObject<HTMLElement | null>) {
  const [native, setNative] = useState(false)
  const [pseudo, setPseudo] = useState(false)

  useEffect(() => {
    const onChange = () => setNative(document.fullscreenElement === frameRef.current)
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
      el.requestFullscreen().catch(() => setPseudo(true))
    } else {
      setPseudo(true)
    }
  }, [frameRef, pseudo])

  return { isFullscreen: native || pseudo, pseudo, toggle }
}
