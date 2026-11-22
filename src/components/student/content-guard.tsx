'use client'

import { useEffect } from 'react'

/**
 * حماية محتوى منطقة الطالب كلها: لا نسخ، ولا تحديد، ولا زرّ أيمن، ولا سحب
 * للصور والفيديو، ولا اختصارات أدوات المطوّر وحفظ الصفحة وطباعتها وعرض
 * مصدرها.
 *
 * حقول الكتابة مستثناة (إجابات الاختبار، رسائل الدعم، الملف الشخصي): الطالب
 * يحتاج أن يكتب ويلصق فيها.
 *
 * هذا رادع لا حماية مطلقة: لا يمنع أي موقع إضافات المتصفّح ولا قائمة
 * المتصفّح نفسه. لكنه يُغلق الطرق السهلة التي يجرّبها أغلب من يحاول.
 */
const isEditable = (t: EventTarget | null) =>
  t instanceof HTMLElement &&
  (t.isContentEditable || t.closest('input, textarea, select, [contenteditable="true"]') !== null)

export function ContentGuard() {
  useEffect(() => {
    const block = (e: Event) => {
      if (!isEditable(e.target)) e.preventDefault()
    }
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      const ctrl = e.ctrlKey || e.metaKey
      const devtools =
        k === 'f12' ||
        (ctrl && e.shiftKey && ['i', 'j', 'c', 'k'].includes(k)) ||
        (ctrl && e.altKey && ['i', 'j', 'c', 'u'].includes(k))
      const savePrint = ctrl && ['u', 's', 'p'].includes(k)
      const copyAll = ctrl && ['c', 'x', 'a'].includes(k) && !isEditable(e.target)
      if (devtools || savePrint || copyAll) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    const events = ['contextmenu', 'copy', 'cut', 'dragstart', 'selectstart'] as const
    for (const ev of events) document.addEventListener(ev, block)
    document.addEventListener('keydown', onKey, true)
    document.documentElement.classList.add('content-guard')

    return () => {
      for (const ev of events) document.removeEventListener(ev, block)
      document.removeEventListener('keydown', onKey, true)
      document.documentElement.classList.remove('content-guard')
    }
  }, [])

  return null
}
