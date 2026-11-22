import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, BookOpen, CircleCheck, FileText, MonitorPlay, Radio } from 'lucide-react'

type Texts = (key: string) => string

/** أيقونات شريط المزايا بترتيب بنود «ما تجده في حسابك»: فيديو، ملازم، اختبارات، بثّ. */
const HIGHLIGHT_ICONS = [MonitorPlay, FileText, CircleCheck, Radio]

function PrimaryButton({ t }: { t: Texts }) {
  return (
    <Link
      href="/register"
      className="inline-flex h-14 items-center gap-2.5 rounded-[var(--radius-field)] bg-accent px-8 text-[0.9375rem] font-semibold text-brand-900 transition-colors hover:bg-accent-soft"
    >
      {t('hero.primaryCta')}
      <ArrowLeft className="size-4" aria-hidden />
    </Link>
  )
}

function SecondaryButton({ t }: { t: Texts }) {
  return (
    <a
      href="#courses"
      className="inline-flex h-14 items-center gap-2.5 rounded-[var(--radius-field)] border border-brand-400 px-8 text-[0.9375rem] font-medium text-ink-invert transition-colors hover:bg-brand-700"
    >
      {t('hero.secondaryCta')}
      <BookOpen className="size-4" aria-hidden />
    </a>
  )
}

/**
 * الواجهة الأولى: مشهد الأستاذة في استوديو الدرس بملء القسم، والعنوان فوقه.
 *
 * على الحاسوب تشغل الصورة ٧٢٪ من العرض من اليسار، ويغطي تدرّجٌ داكن جهة
 * النص فيبقى مقروءًا ولا يمسّ يدها. على الهاتف تملأ الخلفية وتغمق من أسفل.
 * شريط المزايا الأربع أسفل الواجهة بدل قسم منفصل يكرّرها.
 */
export function HeroSection({ t, highlights }: { t: Texts; highlights: readonly string[] }) {
  return (
    <section
      id="top"
      className="relative isolate flex min-h-svh flex-col overflow-hidden bg-brand-900"
    >
      <div className="absolute inset-0 -z-20 lg:right-auto lg:w-[72%]">
        <Image
          src="/brand/hero.webp"
          alt="المدرّسة تشرح الدرس"
          fill
          priority
          quality={90}
          sizes="(min-width: 1024px) 72vw, 100vw"
          className="object-cover object-[28%_12%] lg:object-[25%_20%]"
        />
      </div>

      {/* تدرّج للنص: من أسفل على الهاتف، ومن جهة النص على الحاسوب */}
      <span
        aria-hidden
        className="absolute inset-0 -z-10 bg-linear-to-t from-brand-900 from-[18%] via-brand-900/70 via-[52%] to-brand-900/15 lg:hidden"
      />
      <span
        aria-hidden
        className="absolute inset-0 -z-10 hidden bg-[linear-gradient(to_left,var(--color-brand-900)_14%,rgb(7_42_37/0.82)_36%,rgb(7_42_37/0.08)_62%),linear-gradient(to_top,var(--color-brand-900)_2%,transparent_38%)] lg:block"
      />

      {/* تظليل خلف الهيدر الشفاف: يضمن قراءة الروابط البيضاء فوق الصورة */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-36 bg-linear-to-b from-brand-900/85 to-transparent"
      />

      <div className="mx-auto flex w-full max-w-7xl flex-1 items-end px-5 sm:px-8 lg:items-center">
        <div className="max-w-[36rem] pb-10 pt-72 lg:pb-24 lg:pt-28">
          <h1 className="font-display text-[2.375rem] font-bold leading-[1.45] text-ink-invert sm:text-5xl lg:text-[3.75rem]">
            {t('hero.titleLine1')} <span className="text-accent-soft">{t('hero.titleLine2')}</span>
          </h1>

          <p className="mt-5 text-[1.125rem] leading-[1.95] text-brand-100">
            {t('hero.description')}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <PrimaryButton t={t} />
            <SecondaryButton t={t} />
          </div>
        </div>
      </div>

      <div className="relative z-10 border-t border-accent/35 bg-brand-900/70 backdrop-blur-md">
        <ul className="mx-auto grid max-w-7xl grid-cols-2 px-5 sm:px-8 lg:grid-cols-4">
          {highlights.slice(0, 4).map((title, i) => {
            const Icon = HIGHLIGHT_ICONS[i] ?? CircleCheck
            return (
              <li
                key={title}
                className="flex items-center gap-3 border-white/10 px-2 py-4 lg:border-s lg:first:border-s-0"
              >
                <Icon className="size-[1.375rem] shrink-0 text-accent-soft" aria-hidden />
                <span className="font-display text-[1.0625rem] font-bold text-ink-invert">{title}</span>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
