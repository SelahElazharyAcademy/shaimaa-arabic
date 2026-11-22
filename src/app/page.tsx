import type { Metadata } from 'next'
import Link from 'next/link'

import { Navbar } from '@/components/site/navbar'
import { SectionHeading, LedgerGrid, FeatureRows, StepsPanel } from '@/components/site/section'
import { StagesPath } from '@/components/site/stages-path'
import { getSiteTexts } from '@/lib/queries/site-texts'
import { getBranding } from '@/lib/queries/branding'
import { HeroSection } from '@/components/site/hero-section'
import { SiteFooter } from '@/components/site/site-footer'
import { createClient } from '@/lib/supabase/server'
import { formatNumber } from '@/lib/utils/format'

export const metadata: Metadata = {
  title: 'منصة نجاح — اللغة العربية',
  description:
    'شرح اللغة العربية للمرحلتين الإعدادية والثانوية: دروس بالفيديو، ملازم، اختبارات مصحّحة، وحصص مباشرة. تابع تقدّمك في كل درس.',
  openGraph: {
    title: 'منصة نجاح — اللغة العربية',
    description:
      'دروس بالفيديو وملازم واختبارات وحصص مباشرة، للمرحلتين الإعدادية والثانوية.',
    locale: 'ar_EG',
    type: 'website',
  },
}

/** الصفحة العامة تُبنى مرة كل ساعة: محتواها مرجعي لا شخصي. */
export const revalidate = 3600

/**
 * علامة المنصة: كتاب مفتوح تعلوه ورقة.
 * مرسومة لا صورة، فتبقى حادّة في كل مقاس وتتلوّن مع السياق.
 */
export default async function LandingPage() {
  const supabase = await createClient()

  // النصوص من قاعدة البيانات مع الأصل احتياطًا — يغيّرها المدير من الإعدادات
  const t = await getSiteTexts()
  const branding = await getBranding()

  const grid = (prefix: string, count: number) =>
    Array.from({ length: count }, (_, i) => ({
      title: t(`${prefix}.${i + 1}.title`),
      body: t(`${prefix}.${i + 1}.body`),
    }))

  // بيانات حقيقية لا أرقام مكتوبة يدويًا. RLS تتيحها للزوار.
  const [stagesRes, gradesRes, coursesRes] = await Promise.all([
    supabase.from('education_stages').select('id, name_ar').eq('is_visible', true).order('sort_order'),
    supabase.from('grades').select('id, name_ar, stage_id').eq('is_visible', true).order('sort_order'),
    supabase.from('courses').select('id', { count: 'exact', head: true }).eq('status', 'published'),
  ])

  const stages = stagesRes.data ?? []
  const grades = gradesRes.data ?? []
  const publishedCourses = coursesRes.count ?? 0

  const stageData = stages.map((s) => ({
    id: s.id,
    name: s.name_ar,
    grades: grades.filter((g) => g.stage_id === s.id).map((g) => ({ id: g.id, name: g.name_ar })),
  }))

  return (
    <div className="min-h-dvh bg-canvas">
      <Navbar name={branding.siteName ?? t('site.name')} overlay />

      <main>
        <HeroSection t={t} highlights={grid('features', 4).map((f) => f.title)} />

        {/* ما تحصل عليه — أرضية داكنة تتبع واجهة الصفحة */}
        <section
          id="features"
          aria-labelledby="features-title"
          className="scroll-mt-16 bg-brand-900 lg:scroll-mt-20"
        >
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
            <SectionHeading
              id="features-title"
              title={t('features.title')}
              lead={t('features.lead')}
              invert
            />
            <FeatureRows items={grid('features', 4)} />
          </div>
        </section>

        {/* الصفوف — من قاعدة البيانات لا قائمة ثابتة */}
        {stages.length > 0 && (
          <section
            id="courses"
            aria-labelledby="stages-title"
            className="scroll-mt-16 lg:scroll-mt-20 border-y border-border-subtle bg-surface"
          >
            <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-14">
              <SectionHeading
                id="stages-title"
                title={t('courses.title')}
                lead={
                  <>
                    {t('courses.lead')}
                    {publishedCourses > 0 && (
                      <span className="nums-ar">
                        {' '}
                        {formatNumber(publishedCourses)} مقرر متاح الآن.
                      </span>
                    )}
                  </>
                }
              />

              <StagesPath stages={stageData} />
            </div>
          </section>
        )}

        {/* الاختبارات · الملفات · الدعم — أقسام يقصدها الرأس فعلًا */}
        <section
          id="exams"
          aria-labelledby="exams-title"
          className="border-y border-border-subtle bg-surface-muted"
        >
          <div className="mx-auto max-w-7xl scroll-mt-16 px-5 py-16 sm:px-8 sm:py-20 lg:scroll-mt-20">
            <SectionHeading
              id="exams-title"
              title={t('exams.title')}
              lead={t('exams.lead')}
            />
            <LedgerGrid items={grid('exams', 4)} />
          </div>
        </section>

        <section
          id="files"
          aria-labelledby="files-title"
          className="mx-auto max-w-7xl scroll-mt-16 px-5 py-16 sm:px-8 sm:py-20 lg:scroll-mt-20"
        >
          <SectionHeading
            id="files-title"
            title={t('files.title')}
            lead={t('files.lead')}
          />
          <LedgerGrid items={grid('files', 4)} />
        </section>

        <section
          id="support"
          aria-labelledby="support-title"
          className="border-y border-border-subtle bg-surface-muted"
        >
          <div className="mx-auto max-w-7xl scroll-mt-16 px-5 py-16 sm:px-8 sm:py-20 lg:scroll-mt-20">
            <SectionHeading
              id="support-title"
              title={t('support.title')}
              lead={t('support.lead')}
            />
            <LedgerGrid items={grid('support', 3)} columns={3} />
          </div>
        </section>

        {/* كيف تبدأ */}
        <section
          id="steps"
          aria-labelledby="steps-title"
          className="mx-auto max-w-7xl scroll-mt-16 px-5 py-16 sm:px-8 sm:py-20 lg:scroll-mt-20"
        >
          <SectionHeading
            id="steps-title"
            title={t('steps.title')}
            lead={t('steps.lead')}
          />
          <StepsPanel items={grid('steps', 3)} />

          <div className="mt-14 overflow-hidden rounded-[var(--radius-card)] border border-accent/40 bg-brand-800">
            <div className="relative px-6 py-12 text-center sm:px-10">
              <h2 className="text-2xl font-bold text-ink-invert sm:text-3xl">
                {t('cta.title')}
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-[1.0625rem] leading-[1.95] text-brand-100">
                {t('cta.body')}
              </p>
              <Link
                href="/register"
                className="mt-8 inline-flex h-14 items-center rounded-[var(--radius-field)] bg-accent px-9 text-[0.9375rem] font-semibold text-brand-900 transition-colors hover:bg-accent-soft"
              >
                {t('cta.button')}
              </Link>
            </div>
          </div>
        </section>

      </main>

      <SiteFooter about={t('footer.about')} credit={t('footer.credit')} />
    </div>
  )
}
