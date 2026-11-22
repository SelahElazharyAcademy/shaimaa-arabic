import type { Metadata } from 'next'
import Link from 'next/link'
import { Wrench } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { parseMaintenance } from '@/lib/maintenance'

export const metadata: Metadata = { title: 'صيانة', robots: { index: false } }
export const dynamic = 'force-dynamic'

export default async function MaintenancePage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', 'branding')
    .maybeSingle()
  const m = parseMaintenance(data?.value)

  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-5 py-10">
      <div className="w-full max-w-md rounded-[var(--radius-panel)] border border-border-subtle bg-surface p-8 text-center shadow-[var(--shadow-card)]">
        <span className="mx-auto mb-5 grid size-12 place-items-center rounded-full bg-warning-bg text-warning">
          <Wrench className="size-6" aria-hidden />
        </span>
        {m.enabled ? (
          <>
            <h1 className="text-xl font-semibold text-ink">المنصة في صيانة</h1>
            <p className="mt-2 whitespace-pre-wrap text-base leading-relaxed text-ink-muted">
              {m.message}
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-ink">انتهت الصيانة</h1>
            <p className="mt-2 text-base leading-relaxed text-ink-muted">المنصة تعمل الآن.</p>
            <Link
              href="/"
              className="mt-6 inline-flex h-11 items-center rounded-[var(--radius-field)] bg-brand-700 px-5 text-base font-medium text-ink-invert hover:bg-brand-800"
            >
              ادخل المنصة
            </Link>
          </>
        )}
      </div>
    </main>
  )
}
