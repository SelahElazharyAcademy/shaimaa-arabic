import type { Metadata } from 'next'
import { Trash2, RotateCcw } from 'lucide-react'
import { requireAdminPage } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'
import { Card, Badge, EmptyState } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { SettingsBack } from '@/components/admin/settings-back'
import { ConfirmButton } from '@/components/ui/confirm-button'
import { restoreAccount, purgeAccount } from '@/lib/mutations/devices'
import { formatDateTime, formatNumber } from '@/lib/utils/format'

export const metadata: Metadata = { title: 'سلّة المحذوفات' }
export const dynamic = 'force-dynamic'

const ROLE_LABEL: Record<string, string> = {
  student: 'طالب',
  support: 'فريق الدعم',
  admin: 'مدير',
}

/** الأيام الباقية قبل الحذف النهائي التلقائي. */
const daysLeft = (purgeAt: string) =>
  Math.max(0, Math.ceil((new Date(purgeAt).getTime() - Date.now()) / 86_400_000))

export default async function TrashPage() {
  await requireAdminPage('students')
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('list_trashed_accounts')
  if (error) throw new Error(error.message)
  const rows = data ?? []

  return (
    <div className="space-y-6">
      <SettingsBack />

      <PageHeader
        title="سلّة المحذوفات"
        description="الحسابات المحذوفة تبقى هنا ١٤ يومًا مقفولة ومخفيّة، ببياناتها واشتراكاتها كاملة. استرجعها كما كانت، أو احذفها نهائيًّا الآن. بعد ١٤ يومًا تُحذف نهائيًّا تلقائيًّا."
      />

      <Card>
        {rows.length === 0 ? (
          <EmptyState
            icon={Trash2}
            title="السلّة فارغة"
            description="أي حساب تحذفه من صفحة الطلاب أو المشرفين يظهر هنا."
          />
        ) : (
          <ul className="divide-y divide-border-subtle">
            {rows.map((r) => {
              const left = daysLeft(r.purge_at)
              return (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-medium text-ink">{r.full_name}</span>
                      <Badge tone={r.role === 'student' ? 'neutral' : 'info'}>
                        {ROLE_LABEL[r.role] ?? r.role}
                      </Badge>
                    </span>
                    <span className="block truncate text-sm text-ink-faint" dir="ltr">
                      {r.email}
                      {r.phone ? ` · ${r.phone}` : ''}
                    </span>
                    <span className="nums-ar mt-1 block text-sm text-ink-muted">
                      حُذف {formatDateTime(r.deleted_at)}
                      {r.deleted_by_name ? ` بواسطة ${r.deleted_by_name}` : ''} ·{' '}
                      <span className={left <= 2 ? 'text-danger' : undefined}>
                        يُحذف نهائيًّا خلال {formatNumber(left)} {left === 1 ? 'يوم' : 'أيام'}
                      </span>
                    </span>
                  </span>

                  <span className="flex shrink-0 items-center gap-2">
                    <ConfirmButton
                      label="استرجاع"
                      icon={<RotateCcw aria-hidden />}
                      variant="secondary"
                      title="استرجاع الحساب؟"
                      body={`يعود حساب «${r.full_name}» كما كان باشتراكاته وتقدّمه، ويستطيع صاحبه الدخول من جديد.`}
                      confirmLabel="استرجع الحساب"
                      action={restoreAccount.bind(null, r.id)}
                    />
                    <ConfirmButton
                      label=""
                      srLabel={`حذف ${r.full_name} نهائيًّا`}
                      icon={<Trash2 aria-hidden className="text-danger" />}
                      title="حذف نهائي الآن؟"
                      body={`سيُحذف حساب «${r.full_name}» نهائيًّا الآن مع كل بياناته، ولا يمكن استرجاعه بعد ذلك. يبقى سجلّه في سجلّ التدقيق.`}
                      confirmLabel="احذف نهائيًّا"
                      action={purgeAccount.bind(null, r.id)}
                    />
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}
