import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, Eye, EyeOff, PlayCircle, Users } from 'lucide-react'
import { requireAdminPage } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { Badge, Card, EmptyState, ProgressBar, StatCard } from '@/components/ui/card'
import { formatNumber } from '@/lib/utils/format'

export const metadata: Metadata = { title: 'مين شاف ومين مشافش' }

type Filter = 'all' | 'watched' | 'started' | 'none'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'watched', label: 'شاف' },
  { key: 'started', label: 'بدأ ولم يُكمل' },
  { key: 'none', label: 'مشافش' },
]

/**
 * مين شاف ومين مشافش — لكل درس في الكورس.
 *
 * المرجع هو المشتركون اشتراكًا ساريًا في الكورس: «مشافش» لا معنى لها إلا
 * لمن كان يستطيع أن يشاهد. والمشاهدة هنا مشاهدة فعلية يقيسها المشغّل
 * (السحب إلى آخر الفيديو لا يُحتسب)، و«شاف» = بلغ نسبة الإكمال المحدّدة للدرس.
 */
export default async function LessonViewsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ lesson?: string; show?: string }>
}) {
  await requireAdminPage('courses')
  const { id } = await params
  const sp = await searchParams
  const supabase = await createClient()

  const [courseRes, lessonsRes, enrollRes] = await Promise.all([
    supabase.from('courses').select('id, title').eq('id', id).maybeSingle(),
    supabase
      .from('lessons')
      .select('id, title, sort_order')
      .eq('course_id', id)
      .eq('is_published', true)
      .order('sort_order'),
    supabase
      .from('enrollments')
      .select('student_id, profiles(full_name, phone)')
      .eq('course_id', id)
      .eq('status', 'active'),
  ])

  const course = courseRes.data
  if (!course) notFound()

  const lessons = lessonsRes.data ?? []
  const students = (enrollRes.data ?? []).map((e) => {
    const p = Array.isArray(e.profiles) ? e.profiles[0] : e.profiles
    return { id: e.student_id, name: p?.full_name ?? '—', phone: p?.phone ?? null }
  })
  const studentIds = students.map((s) => s.id)
  const lessonIds = lessons.map((l) => l.id)

  const { data: progressRows } =
    studentIds.length && lessonIds.length
      ? await supabase
          .from('lesson_progress')
          .select('student_id, lesson_id, progress_percent, completed, last_watched_at')
          .in('lesson_id', lessonIds)
          .in('student_id', studentIds)
      : { data: [] }

  const progress = new Map(
    (progressRows ?? []).map((r) => [`${r.lesson_id}:${r.student_id}`, r] as const),
  )

  const statusOf = (lessonId: string, studentId: string) => {
    const r = progress.get(`${lessonId}:${studentId}`)
    if (r?.completed) return 'watched' as const
    if (r && Number(r.progress_percent) > 0) return 'started' as const
    return 'none' as const
  }

  const backLink = (
    <Link
      href={`/admin/courses/${course.id}`}
      className="inline-flex items-center gap-1.5 text-base text-ink-muted underline-offset-4 hover:text-ink hover:underline"
    >
      <ArrowRight className="size-4" aria-hidden />
      {course.title}
    </Link>
  )

  if (lessons.length === 0 || students.length === 0) {
    return (
      <div className="space-y-6">
        {backLink}
        <PageHeader title="مين شاف ومين مشافش" />
        <Card>
          <EmptyState
            icon={Users}
            title={lessons.length === 0 ? 'لا دروس منشورة بعد' : 'لا مشتركين في هذا الكورس بعد'}
            description="يظهر التقرير حين يكون في الكورس دروس منشورة وطلاب مشتركون."
          />
        </Card>
      </div>
    )
  }

  const selected = lessons.find((l) => l.id === sp.lesson) ?? lessons[0]!
  const filter: Filter = FILTERS.some((f) => f.key === sp.show) ? (sp.show as Filter) : 'all'

  const rows = students
    .map((s) => {
      const r = progress.get(`${selected.id}:${s.id}`)
      return {
        ...s,
        status: statusOf(selected.id, s.id),
        percent: Math.round(Number(r?.progress_percent ?? 0)),
        last: r?.last_watched_at ?? null,
      }
    })
    // من لم يشاهد أولًا: هو من يحتاج المتابعة
    .sort((a, b) => a.percent - b.percent || a.name.localeCompare(b.name, 'ar'))

  const counts = {
    watched: rows.filter((r) => r.status === 'watched').length,
    started: rows.filter((r) => r.status === 'started').length,
    none: rows.filter((r) => r.status === 'none').length,
  }
  const visible = filter === 'all' ? rows : rows.filter((r) => r.status === filter)

  const href = (lesson: string, show: Filter) =>
    `/admin/courses/${course.id}/views?lesson=${lesson}${show === 'all' ? '' : `&show=${show}`}`

  const dateFmt = new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <div className="space-y-6">
      {backLink}

      <PageHeader
        title="مين شاف ومين مشافش"
        description={`من ${formatNumber(students.length)} مشترك في «${course.title}». «شاف» يعني أنه بلغ نسبة الإكمال المحدّدة للدرس بمشاهدة فعلية.`}
      />

      {/* ملخّص كل الدروس: نظرة واحدة تكشف الدرس الذي لم يُشاهَد */}
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[520px] text-base">
          <thead>
            <tr className="border-b border-border-subtle text-start text-sm text-ink-faint">
              <th className="px-4 py-3 text-start font-medium">الدرس</th>
              <th className="px-4 py-3 text-start font-medium">شاف</th>
              <th className="px-4 py-3 text-start font-medium">بدأ</th>
              <th className="px-4 py-3 text-start font-medium">مشافش</th>
            </tr>
          </thead>
          <tbody>
            {lessons.map((l) => {
              let w = 0
              let st = 0
              for (const s of students) {
                const v = statusOf(l.id, s.id)
                if (v === 'watched') w++
                else if (v === 'started') st++
              }
              const active = l.id === selected.id
              return (
                <tr
                  key={l.id}
                  className={`border-b border-border-subtle last:border-0 ${active ? 'bg-brand-50' : ''}`}
                >
                  <td className="px-4 py-2.5">
                    <Link
                      href={href(l.id, filter)}
                      aria-current={active ? 'true' : undefined}
                      className="font-medium text-ink underline-offset-4 hover:underline"
                    >
                      {l.title}
                    </Link>
                  </td>
                  <td className="nums-ar px-4 py-2.5 text-success">{formatNumber(w)}</td>
                  <td className="nums-ar px-4 py-2.5 text-warning">{formatNumber(st)}</td>
                  <td className="nums-ar px-4 py-2.5 text-danger">
                    {formatNumber(students.length - w - st)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>

      <h2 className="text-lg font-semibold text-ink">{selected.title}</h2>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Eye} tone="success" label="شاف" value={formatNumber(counts.watched)} />
        <StatCard
          icon={PlayCircle}
          tone="warning"
          label="بدأ ولم يُكمل"
          value={formatNumber(counts.started)}
        />
        <StatCard icon={EyeOff} label="مشافش" value={formatNumber(counts.none)} />
      </div>

      <nav aria-label="تصفية الطلاب" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={href(selected.id, f.key)}
            aria-current={filter === f.key ? 'page' : undefined}
            className={`inline-flex h-9 items-center rounded-[var(--radius-pill)] border px-4 text-base ${
              filter === f.key
                ? 'border-brand-700 bg-brand-700 text-ink-invert'
                : 'border-border-strong bg-surface text-ink hover:bg-surface-muted'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      <Card className="overflow-x-auto p-0">
        {visible.length === 0 ? (
          <EmptyState icon={Users} title="لا أحد هنا" description="لا طلاب في هذه الفئة لهذا الدرس." />
        ) : (
          <table className="w-full min-w-[560px] text-base">
            <thead>
              <tr className="border-b border-border-subtle text-sm text-ink-faint">
                <th className="px-4 py-3 text-start font-medium">الطالب</th>
                <th className="px-4 py-3 text-start font-medium">الموبايل</th>
                <th className="px-4 py-3 text-start font-medium">الحالة</th>
                <th className="w-40 px-4 py-3 text-start font-medium">المشاهدة</th>
                <th className="px-4 py-3 text-start font-medium">آخر مشاهدة</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} className="border-b border-border-subtle last:border-0">
                  <td className="px-4 py-2.5 font-medium text-ink">{r.name}</td>
                  <td className="px-4 py-2.5 text-ink-muted" dir="ltr">
                    {r.phone ?? '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    {r.status === 'watched' ? (
                      <Badge tone="success">شاف</Badge>
                    ) : r.status === 'started' ? (
                      <Badge tone="warning">بدأ</Badge>
                    ) : (
                      <Badge tone="danger">مشافش</Badge>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-2">
                      <ProgressBar value={r.percent} label={`مشاهدة ${r.name}`} />
                      <span className="nums-ar w-10 shrink-0 text-sm text-ink-muted">
                        {formatNumber(r.percent)}٪
                      </span>
                    </span>
                  </td>
                  <td className="nums-ar px-4 py-2.5 text-sm text-ink-faint">
                    {r.last ? dateFmt.format(new Date(r.last)) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
