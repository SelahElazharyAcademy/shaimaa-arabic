import type { Metadata } from 'next'
import { ShieldCheck } from 'lucide-react'
import { requireAdminPage } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'
import { Card, CardHeader } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { SettingsBack } from '@/components/admin/settings-back'
import { RoleManager } from '@/components/admin/role-manager'
import { NewStaffForm } from '@/components/admin/new-staff-form'
import { formatNumber } from '@/lib/utils/format'

export const metadata: Metadata = { title: 'المشرفون والصلاحيات' }

export default async function StaffSettingsPage() {
  const me = await requireAdminPage('settings')
  const supabase = await createClient()

  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, allowed_pages')
    .order('role')
    .order('created_at', { ascending: false })
    .limit(200)

  const people = data ?? []
  // العدّاد يخصّ أصحاب الصلاحيات لا كل الحسابات
  const staff = people.filter((p) => p.role !== 'student')

  return (
    <div className="space-y-6">
      <SettingsBack />

      <PageHeader
        title="المشرفون والصلاحيات"
        description="من يدخل لوحة الإدارة وما الذي يستطيع فعله فيها. ابحث عن أي حساب بالبريد لتعيين دوره أو حذفه."
      />

      <Card>
        <CardHeader
          title="الحسابات"
          icon={ShieldCheck}
          action={
            <span className="nums-ar text-sm text-ink-faint">
              {formatNumber(staff.length)} حساب بصلاحيات
            </span>
          }
        />
        <NewStaffForm />
        <RoleManager
          canEditPages={me.role === 'super_admin'}
          isSuperAdmin={me.role === 'super_admin'}
          meId={me.id}
          people={people.map((p) => ({
            id: p.id,
            fullName: p.full_name,
            email: p.email,
            role: p.role,
            allowedPages: p.allowed_pages,
          }))}
        />
      </Card>
    </div>
  )
}
