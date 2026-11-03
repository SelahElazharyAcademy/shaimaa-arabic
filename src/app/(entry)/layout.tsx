import { getImageProps } from 'next/image'
import { BrandMark } from '@/components/site/logo'

/**
 * تخطيط صفحتي الدخول وإنشاء الحساب: صورة بملء الشاشة وبطاقة النموذج فوقها.
 *
 * صورتان بحسب الجهاز: على الموبايل الأستاذة في المنتصف وإصبعها نحو
 * النموذج، وعلى الحاسوب مشهد عريض تقف فيه يمين البطاقة. المتصفح يختار
 * بين المصدرين عند عرض 1000px، فلا تُحمَّل الصورة الأخرى.
 * على الحاسوب تثبت الصورة بحجم الشاشة وتتحرك البطاقة وحدها، فلا تتمدّد الصورة
 * مع النموذج الطويل (إنشاء الحساب).
 *
 * الصورة عنصر بصري: `alt` فارغ، واسم الأستاذة نص مخفي بصريًّا بجانب الشعار.
 */
export default function EntryLayout({ children }: { children: React.ReactNode }) {
  const common = { alt: '', fill: true, priority: true, quality: 90, sizes: '100vw' }
  const {
    props: { srcSet: desktop },
  } = getImageProps({ ...common, src: '/brand/login.webp' })
  const {
    props: { srcSet: mobile, ...img },
  } = getImageProps({ ...common, src: '/brand/login-mobile.webp' })

  return (
    <div className="relative isolate flex min-h-svh items-end justify-center overflow-hidden bg-brand-900 lg:items-center lg:justify-end lg:px-[4vw] lg:py-10">
      <picture
        aria-hidden
        className="absolute inset-x-0 top-0 -z-20 block h-[62svh] md:max-lg:h-[68svh] lg:fixed lg:inset-0 lg:h-full"
      >
        <source media="(min-width: 1000px)" srcSet={desktop} />
        <source srcSet={mobile} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          {...img}
          alt=""
          className="object-cover object-[52%_8%] md:max-lg:object-[52%_14%] lg:object-[78%_30%]"
        />
      </picture>

      {/* تعتيم خفيف بلون المنصة: يوحّد درجة الصورة ويُبقي الشعار مقروءًا */}
      <span
        aria-hidden
        className="absolute inset-0 -z-10 lg:fixed bg-[linear-gradient(to_top,rgb(7_42_37/0.55),rgb(7_42_37/0.05)_45%,rgb(7_42_37/0.5)),rgb(11_64_56/0.2)] lg:bg-[linear-gradient(to_left,rgb(7_42_37/0.1),rgb(7_42_37/0.35)),rgb(11_64_56/0.2)]"
      />

      {/* الشعار وحده؛ الاسم للقارئ الصوتي فقط */}
      <div className="absolute inset-x-0 top-0 z-10 p-5 lg:px-12 lg:py-8">
        <BrandMark tone="onDark" className="h-14 lg:h-[4.25rem]" />
        <span className="sr-only">الأستاذة الشيماء أحمد، اللغة العربية</span>
      </div>

      <main className="relative z-10 mt-[46svh] w-full rounded-t-[1.625rem] bg-surface px-[1.375rem] pb-11 pt-[1.875rem] shadow-[0_-12px_40px_rgb(0_0_0/0.25)] md:max-lg:mt-[50svh] md:max-lg:max-w-[34rem] lg:mt-0 lg:w-[28rem] lg:rounded-[1.5rem] lg:px-9 lg:py-[2.375rem] lg:shadow-[0_30px_80px_rgb(0_0_0/0.35)]">
        <div className="mx-auto w-full max-w-md">{children}</div>
      </main>
    </div>
  )
}
