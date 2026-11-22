import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Wrench } from 'lucide-react'
import { requireAdminPage } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'
import { parseMaintenance } from '@/lib/maintenance'
import { setMaintenance } from '@/lib/mutations/settings'
import { PageHeader } from '@/components/ui/page-header'
import { Card, Badge } from '@/components/ui/card'

export const metadata: Metadata = { title: 'وضع الصيانة' }

export default async function MaintenanceSettingsPage() {
  await requireAdminPage('settings')
  const supabase = await createClient()
  const { data } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', 'branding')
    .maybeSingle()
  const m = parseMaintenance(data?.value)

  return (
    <div className="space-y-6">
      <Link
        href="/admin/settings"
        className="inline-flex items-center gap-1.5 text-base text-ink-muted underline-offset-4 hover:text-ink hover:underline"
      >
        <ArrowRight className="size-4" aria-hidden />
        الإعدادات
      </Link>

      <PageHeader
        title="وضع الصيانة"
        description="يُغلق المنصة على الطلاب والزوّار ويعرض لهم رسالة الصيانة. الإدارة والدعم يدخلون كالمعتاد."
      />

      <Card className="max-w-xl p-6">
        <p className="mb-5 flex items-center gap-2 text-base text-ink">
          <Wrench className="size-4 text-ink-muted" aria-hidden />
          الحالة الآن:
          {m.enabled ? <Badge tone="warning">في صيانة</Badge> : <Badge tone="success">تعمل</Badge>}
        </p>

        <form action={setMaintenance} className="space-y-5">
          <label className="flex cursor-pointer items-center gap-3 text-base font-medium text-ink">
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={m.enabled}
              className="size-5 accent-[var(--color-brand-700)]"
            />
            تفعيل وضع الصيانة
          </label>

          <label className="block">
            <span className="mb-1.5 block text-base font-medium text-ink">رسالة الصيانة</span>
            <textarea
              name="message"
              defaultValue={m.message}
              rows={4}
              maxLength={500}
              className="w-full rounded-[var(--radius-field)] border border-border-strong bg-surface p-3 text-base text-ink"
            />
          </label>

          <p className="text-sm text-ink-faint">
            يصل التغيير لكل الزوّار خلال أقل من نصف دقيقة. صفحة الدخول تبقى مفتوحة كي يدخل المشرف.
          </p>

          <button
            type="submit"
            className="inline-flex h-11 items-center rounded-[var(--radius-field)] bg-brand-700 px-5 text-base font-medium text-ink-invert hover:bg-brand-800"
          >
            حفظ
          </button>
        </form>
      </Card>
    </div>
  )
}
