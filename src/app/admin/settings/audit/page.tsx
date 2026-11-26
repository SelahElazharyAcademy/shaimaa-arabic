import type { Metadata } from 'next'
import { ScrollText } from 'lucide-react'
import { requireAdminPage } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'
import { Card, CardHeader, EmptyState, Badge } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { SettingsBack } from '@/components/admin/settings-back'
import { formatDateTime, pluralAr } from '@/lib/utils/format'

export const metadata: Metadata = { title: 'سجلّ التدقيق' }

// الأسماء كما تكتبها دوال القاعدة في `audit_logs.action`
const ACTION_LABELS: Record<string, string> = {
  code_redeemed: 'تفعيل كود اشتراك',
  codes_generated: 'توليد أكواد',
  manual_enrollment: 'تسجيل يدوي في كورس',
  create_staff: 'إنشاء حساب بصلاحيات',
  reset_password: 'تغيير كلمة مرور حساب',
  reset_devices: 'إعادة تعيين أجهزة طالب',
  delete_student: 'حذف حساب طالب',
}

const ENTITY_LABELS: Record<string, string> = {
  activation_code: 'كود تفعيل',
  enrollment: 'اشتراك',
  course: 'كورس',
  profile: 'حساب',
}

const actionCount = (n: number) =>
  pluralAr(n, { one: 'إجراء واحد', two: 'إجراءان', few: 'إجراءات', many: 'إجراءً' })

export default async function AuditLogPage() {
  await requireAdminPage('settings')
  const supabase = await createClient()

  const { data, count } = await supabase
    .from('audit_logs')
    .select('id, action, entity_type, created_at, profiles(full_name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(100)

  const rows = (data ?? []) as unknown as {
    id: string
    action: string
    entity_type: string
    created_at: string
    profiles: { full_name: string } | null
  }[]

  return (
    <div className="space-y-6">
      <SettingsBack />

      <PageHeader
        title="سجلّ التدقيق"
        description="كل إجراء إداري حسّاس يُسجَّل هنا تلقائيًا. السجلّ للقراءة فقط ولا يُعدَّل ولا يُحذف."
      />

      <Card>
        <CardHeader
          title="آخر الإجراءات"
          icon={ScrollText}
          action={
            <span className="nums-ar text-sm text-ink-faint">
              {actionCount(count ?? 0)}
            </span>
          }
        />

        {rows.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="السجلّ فارغ"
            description="لم يُنفَّذ أي إجراء إداري حسّاس بعد. توليد الأكواد والتسجيل اليدوي يظهران هنا."
          />
        ) : (
          <>
            <ul className="divide-y divide-border-subtle">
              {rows.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2 text-base text-ink">
                      {ACTION_LABELS[a.action] ?? a.action}
                      <Badge tone="neutral">
                        {ENTITY_LABELS[a.entity_type] ?? a.entity_type}
                      </Badge>
                    </span>
                    <span className="mt-0.5 block text-sm text-ink-faint">
                      {a.profiles?.full_name ?? 'حساب محذوف'}
                    </span>
                  </span>
                  <span className="nums-ar shrink-0 text-sm text-ink-faint">
                    {formatDateTime(a.created_at)}
                  </span>
                </li>
              ))}
            </ul>

            {(count ?? 0) > rows.length && (
              <p className="nums-ar border-t border-border-subtle px-5 py-3.5 text-sm text-ink-faint">
                تُعرض أحدث {actionCount(rows.length)} من {actionCount(count ?? 0)}.
              </p>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
