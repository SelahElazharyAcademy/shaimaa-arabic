import type { Metadata } from 'next'
import Link from 'next/link'
import { Users, Download, ChevronRight, ChevronLeft, MonitorSmartphone } from 'lucide-react'
import { requireAdminPage } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'
import { getStudents, STUDENTS_PAGE_SIZE } from '@/lib/queries/admin'
import { Card, EmptyState, Badge } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { StudentsFilters } from '@/components/admin/students-filters'
import { formatNumber, formatDate, formatDateTime } from '@/lib/utils/format'
import { ConfirmButton } from '@/components/ui/confirm-button'
import { resetStudentDevices } from '@/lib/mutations/devices'
import { DEVICE_LIMIT } from '@/lib/devices'

export const metadata: Metadata = { title: 'الطلاب' }

const SECTION_LABELS = { scientific: 'علمي', literary: 'أدبي' } as const

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; grade?: string; page?: string }>
}) {
  await requireAdminPage('students')
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page ?? '1') || 1)

  const supabase = await createClient()
  const [{ rows, total }, gradesRes] = await Promise.all([
    getStudents({ query: sp.q ?? '', status: sp.status ?? '', gradeId: sp.grade ?? '', page }),
    supabase.from('grades').select('id, name_ar').order('sort_order', { ascending: true }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / STUDENTS_PAGE_SIZE))

  // أجهزة الطلاب الظاهرين في هذه الصفحة وحدهم
  const ids = rows.map((r) => r.id)
  const devices = new Map<string, { ip: string | null; lastSeen: string }[]>()
  if (ids.length > 0) {
    const { data: deviceRows } = await supabase
      .from('student_devices')
      .select('user_id, ip, last_seen_at')
      .in('user_id', ids)
      .order('last_seen_at', { ascending: false })
    for (const d of deviceRows ?? []) {
      const list = devices.get(d.user_id) ?? []
      list.push({ ip: d.ip, lastSeen: d.last_seen_at })
      devices.set(d.user_id, list)
    }
  }

  const devicesCell = (id: string, name: string) => {
    const list = devices.get(id) ?? []
    const full = list.length >= DEVICE_LIMIT
    return (
      <span className="inline-flex items-center gap-1.5">
        <span
          className={`nums-ar inline-flex items-center gap-1 ${full ? 'text-warning' : 'text-ink-muted'}`}
          title={
            list.length
              ? list.map((d) => `${d.ip ?? 'IP غير معروف'} · آخر ظهور ${formatDateTime(d.lastSeen)}`).join(' | ')
              : 'لم يسجّل الدخول من أي جهاز بعد'
          }
        >
          <MonitorSmartphone className="size-4" aria-hidden />
          {formatNumber(list.length)}/{formatNumber(DEVICE_LIMIT)}
        </span>
        {list.length > 0 && (
          <ConfirmButton
            label=""
            srLabel={`إعادة تعيين أجهزة ${name}`}
            icon={<span aria-hidden className="text-sm">مسح</span>}
            title="إعادة تعيين الأجهزة؟"
            body={`ستُمسح أجهزة «${name}» المسجّلة، فيستطيع الدخول من جهازين جديدين. الجلسات المفتوحة على الأجهزة القديمة تعدّ من الجهازين.`}
            confirmLabel="امسح الأجهزة"
            action={resetStudentDevices.bind(null, id)}
          />
        )}
      </span>
    )
  }
  const exportParams = new URLSearchParams()
  if (sp.q) exportParams.set('q', sp.q)
  if (sp.status) exportParams.set('status', sp.status)
  if (sp.grade) exportParams.set('grade', sp.grade)

  const pageHref = (n: number) => {
    const s = new URLSearchParams(exportParams.toString())
    if (n > 1) s.set('page', String(n))
    const qs = s.toString()
    return qs ? `/admin/students?${qs}` : '/admin/students'
  }

  return (
    <div>
      <PageHeader
        title="الطلاب"
        description="ابحث وفلتر وصدّر بيانات الطلاب المسجّلين."
        action={
          <Link
            href={`/admin/students/export?${exportParams.toString()}`}
            prefetch={false}
            className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-field)] border border-border-strong bg-surface px-4 text-base font-medium text-ink transition-colors hover:bg-surface-muted"
          >
            <Download className="size-4" aria-hidden />
            تصدير CSV
          </Link>
        }
      />

      <Card>
        <StudentsFilters grades={gradesRes.data ?? []} />

        <p className="nums-ar border-b border-border-subtle px-4 py-2.5 text-sm text-ink-faint">
          {formatNumber(total)} نتيجة
        </p>

        {rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title={sp.q || sp.status || sp.grade ? 'لا نتائج مطابقة' : 'لا يوجد طلاب بعد'}
            description={
              sp.q || sp.status || sp.grade
                ? 'جرّب تعديل البحث أو إزالة الفلاتر.'
                : 'لم يسجّل أي طالب بعد. ستظهر حساباتهم هنا فور التسجيل.'
            }
          />
        ) : (
          <>
            {/* جدول على الشاشات الواسعة، وبطاقات على الموبايل: الجدول لا يُقرأ في 375px (البند 33) */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-start text-base">
                <thead className="border-b border-border-subtle text-sm text-ink-faint">
                  <tr>
                    <th scope="col" className="px-5 py-3 text-start font-medium">الطالب</th>
                    <th scope="col" className="px-5 py-3 text-start font-medium">الهاتف</th>
                    <th scope="col" className="px-5 py-3 text-start font-medium">الصف</th>
                    <th scope="col" className="px-5 py-3 text-start font-medium">المحافظة</th>
                    <th scope="col" className="px-5 py-3 text-start font-medium">الحالة</th>
                    <th scope="col" className="px-5 py-3 text-start font-medium">الأجهزة</th>
                    <th scope="col" className="px-5 py-3 text-start font-medium">التسجيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {rows.map((s) => (
                    <tr key={s.id} className="hover:bg-surface-muted">
                      <td className="px-5 py-3.5">
                        <span className="block font-medium text-ink">{s.fullName}</span>
                        <span className="block text-sm text-ink-faint" dir="ltr">{s.email}</span>
                      </td>
                      <td className="nums-ar px-5 py-3.5 text-ink-muted" dir="ltr">
                        <span className="block text-start">{s.phone ?? '—'}</span>
                      </td>
                      <td className="px-5 py-3.5 text-ink-muted">
                        {s.gradeName ?? '—'}
                        {s.section && (
                          <span className="block text-sm text-ink-faint">
                            {SECTION_LABELS[s.section]}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-ink-muted">{s.governorateName ?? '—'}</td>
                      <td className="px-5 py-3.5">
                        <Badge tone={s.status === 'active' ? 'success' : 'warning'}>
                          {s.status === 'active' ? 'نشط' : 'موقوف'}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5">{devicesCell(s.id, s.fullName)}</td>
                      <td className="nums-ar px-5 py-3.5 text-ink-faint">{formatDate(s.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-border-subtle lg:hidden">
              {rows.map((s) => (
                <li key={s.id} className="px-4 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate text-base font-medium text-ink">{s.fullName}</span>
                      <span className="block truncate text-sm text-ink-faint" dir="ltr">{s.email}</span>
                    </span>
                    <Badge tone={s.status === 'active' ? 'success' : 'warning'}>
                      {s.status === 'active' ? 'نشط' : 'موقوف'}
                    </Badge>
                  </div>
                  <p className="nums-ar mt-1.5 text-sm text-ink-muted">
                    {[s.gradeName, s.governorateName, s.phone].filter(Boolean).join(' · ') || '—'}
                  </p>
                  <div className="mt-1.5 text-sm">{devicesCell(s.id, s.fullName)}</div>
                </li>
              ))}
            </ul>
          </>
        )}

        {totalPages > 1 && (
          <nav
            aria-label="صفحات النتائج"
            className="flex items-center justify-between gap-3 border-t border-border-subtle px-4 py-3"
          >
            {page > 1 ? (
              <Link
                href={pageHref(page - 1)}
                className="inline-flex h-9 items-center gap-1 rounded-[var(--radius-field)] border border-border-strong px-3 text-base hover:bg-surface-muted"
              >
                <ChevronRight className="size-4" aria-hidden />
                السابق
              </Link>
            ) : (
              <span />
            )}

            <span className="nums-ar text-sm text-ink-faint">
              صفحة {formatNumber(page)} من {formatNumber(totalPages)}
            </span>

            {page < totalPages ? (
              <Link
                href={pageHref(page + 1)}
                className="inline-flex h-9 items-center gap-1 rounded-[var(--radius-field)] border border-border-strong px-3 text-base hover:bg-surface-muted"
              >
                التالي
                <ChevronLeft className="size-4" aria-hidden />
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </Card>
    </div>
  )
}
