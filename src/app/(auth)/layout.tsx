import Link from 'next/link'
import Image from 'next/image'
import { BrandMark } from '@/components/site/logo'
import { getBranding, DEFAULT_TEACHER_PHOTO } from '@/lib/queries/branding'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const branding = await getBranding()

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_32rem]">
      {/* لوحة الهوية: تختفي على الموبايل لأن الأولوية هناك للنموذج لا للصورة */}
      <aside className="relative hidden overflow-hidden bg-brand-800 lg:flex lg:flex-col">
        <div className="rise-in relative z-10 flex items-center gap-4 p-12">
          <BrandMark tone="onDark" className="h-14" />
          <div>
            <p className="text-lg font-semibold text-ink-invert">منصة نجاح</p>
            <p className="mt-1 text-base text-accent">اللغة العربية</p>
          </div>
        </div>

        <div
          className="rise-in relative z-10 mt-auto max-w-md px-12 pb-12"
          style={{ '--rise-delay': '260ms' } as React.CSSProperties}
        >
          <p className="text-2xl font-semibold leading-relaxed text-ink-invert">
            دروسك ومذكراتك واختباراتك في مكان واحد.
          </p>
          <p className="mt-3 text-base leading-relaxed text-brand-200">
            تابع تقدّمك في كل مقرر، حمّل الملازم، واحضر الحصص المباشرة — من أي جهاز.
          </p>
        </div>

        {/*
          الصورة عنصر بصري لا محتوى: alt فارغ + aria-hidden حتى لا يقرأها
          القارئ الصوتي مرتين، فاسم الأستاذة مكتوب نصًّا بالأعلى.
          priority لأنها أكبر عنصر في أول شاشة يراها المستخدم (LCP).
        */}
        <div
          className="rise-in pointer-events-none absolute inset-x-0 bottom-0 h-[78%] select-none"
          style={{ '--rise-delay': '120ms' } as React.CSSProperties}
          aria-hidden
        >
          <Image
            src={branding.teacherUrl ?? DEFAULT_TEACHER_PHOTO}
            alt=""
            fill
            priority
            quality={90}
            /* اللوحة تأخذ ما تبقّى بعد عمود النموذج (32rem).
               كتابة 32rem هنا تُضلّل Next فيقدّم صورة أصغر من العرض الفعلي فتتمدّد. */
            sizes="(min-width: 1024px) calc(100vw - 32rem), 0px"
            className="object-contain object-bottom opacity-95"
          />
          {/*
            طبقة تعتيم من لون اللوحة: تذيب حافة الصورة، والأهم أنها تضمن
            تباينًا كافيًا للنص فوق القميص المخطط — النص الأبيض على صورة
            فاتحة غير مقروء (البند 22).
          */}
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-brand-800 via-brand-800/90 to-transparent" />
        </div>
      </aside>

      <main className="flex flex-col justify-center bg-surface px-5 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-md">
          <Link href="/" className="mb-8 flex items-center gap-2.5 lg:hidden">
            <BrandMark tone="onLight" className="h-11" />
            <span>
              <span className="block text-base font-semibold leading-tight">
                منصة نجاح
              </span>
              <span className="block text-sm text-accent">اللغة العربية</span>
            </span>
          </Link>
          {children}
        </div>
      </main>
    </div>
  )
}
