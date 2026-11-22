'use client'

import { useEffect, useState } from 'react'

/**
 * علامة مائية باسم الطالب ورقمه فوق الفيديو، لردع التسريب.
 *
 * مبادئها:
 *  1. **عشوائية في المكان والزمان**: تظهر على أطراف الإطار في نقطة عشوائية
 *     من حافّة عشوائية، وتنتقل بعد مدّة عشوائية (٢٠–٤٠ ثانية). فلا يوجد
 *     موضع ثابت ولا توقيت متكرّر يستطيع من يمنتج الفيديو أن يطمسه بمربّع
 *     واحد أو يقصّه بطرف واحد.
 *  2. **على الأطراف لا في الوسط**: لا تمرّ فوق ما تشرحه الأستاذة، ومواضع
 *     الأسفل فوق شريط التحكّم.
 *  3. **هادئة**: نصّ أبيض شبه شفّاف بظلّ خفيف يُقرأ على أي خلفية، بلا
 *     صندوق ولا لون صارخ، وتختفي وتظهر بهدوء عند الانتقال.
 *  4. **لا تعترض شيئًا**: `pointer-events-none`، و`aria-hidden`.
 *
 * وهي رادع لا حماية: من يصوّر الشاشة تظهر معه العلامة، وهذا كل المقصود —
 * أن يُعرف صاحب أي نسخة مسرَّبة.
 */

type Spot = { top: number; left: number; shiftX: number; shiftY: number }

const rand = (min: number, max: number) => min + Math.random() * (max - min)

/** نقطة عشوائية على حافّة عشوائية غير الحافّة السابقة. */
function randomSpot(prevEdge: number): { spot: Spot; edge: number } {
  let edge: number
  if (prevEdge < 0) {
    edge = Math.floor(Math.random() * 4)
  } else {
    edge = Math.floor(Math.random() * 3)
    if (edge >= prevEdge) edge += 1
  }

  // الإزاحة تُبقي النصّ داخل الإطار مهما كان طوله
  const spots: Spot[] = [
    { top: rand(3, 9), left: rand(4, 96), shiftX: -50, shiftY: 0 }, // أعلى
    { top: rand(16, 70), left: rand(96, 98), shiftX: -100, shiftY: -50 }, // يمين
    { top: rand(74, 80), left: rand(4, 96), shiftX: -50, shiftY: -100 }, // أسفل، فوق شريط التحكّم
    { top: rand(16, 70), left: rand(2, 4), shiftX: 0, shiftY: -50 }, // يسار
  ]
  const spot = spots[edge]!
  // الأعلى والأسفل: لا يتجاوز النصّ الطرفين حين تقع النقطة قرب الزاوية
  if (edge === 0 || edge === 2) {
    spot.shiftX = spot.left < 20 ? 0 : spot.left > 80 ? -100 : -50
  }
  return { spot, edge }
}

const MIN_STAY_MS = 20_000
const MAX_STAY_MS = 40_000
/** مدّة الاختفاء بين موضعين — تطابق مدّة انتقال الشفافية أدناه. */
const FADE_MS = 700

export function VideoWatermark({ label, number }: { label: string; number?: string | null }) {
  // البداية ثابتة كي يطابق ما يُرسَم على الخادم ما يُرسَم في المتصفّح،
  // ثم تُختار نقطة عشوائية فور التحميل
  const [spot, setSpot] = useState<Spot>({ top: 5, left: 96, shiftX: -100, shiftY: 0 })
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (!label) return
    let edge = -1
    let stay: ReturnType<typeof setTimeout> | undefined
    let fade: ReturnType<typeof setTimeout> | undefined

    const move = () => {
      const next = randomSpot(edge)
      edge = next.edge
      setSpot(next.spot)
      setShown(true)
      stay = setTimeout(() => {
        setShown(false)
        fade = setTimeout(move, FADE_MS)
      }, rand(MIN_STAY_MS, MAX_STAY_MS))
    }
    move()

    return () => {
      clearTimeout(stay)
      clearTimeout(fade)
    }
  }, [label])

  if (!label) return null

  return (
    <span
      aria-hidden
      style={{
        top: `${spot.top}%`,
        left: `${spot.left}%`,
        transform: `translate(${spot.shiftX}%, ${spot.shiftY}%)`,
      }}
      className={`pointer-events-none absolute z-10 flex select-none flex-col items-center gap-0.5 whitespace-nowrap text-center leading-tight text-white/65 transition-opacity duration-700 [text-shadow:0_1px_2px_rgb(0_0_0/0.65),0_0_8px_rgb(0_0_0/0.3)] ${shown ? 'opacity-100' : 'opacity-0'}`}
    >
      <span className="text-[11px] font-semibold sm:text-xs md:text-sm">{label}</span>
      {number && (
        <span
          dir="ltr"
          className="font-mono text-[10px] tracking-[0.12em] text-white/60 sm:text-[11px] md:text-xs"
        >
          {number}
        </span>
      )}
    </span>
  )
}
