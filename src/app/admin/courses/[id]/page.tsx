import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, BookOpen, Eye, Layers, ExternalLink, Image as ImageIcon } from 'lucide-react'
import { requireAdminPage } from '@/lib/permissions'
import { isBunnyEnabled } from '@/lib/bunny'
import { createClient } from '@/lib/supabase/server'
import { CollapsibleCard } from '@/components/ui/collapsible-card'
import { PageHeader } from '@/components/ui/page-header'
import { CourseForm } from '@/components/admin/course-form'
import { ModuleForm } from '@/components/admin/module-form'
import { CourseImageForm } from '@/components/admin/course-image-form'
import {
  CourseCurriculum,
  type CurriculumLesson,
  type CurriculumModule,
} from '@/components/admin/course-curriculum'

const STATUS_LABEL: Record<string, string> = {
  draft: 'مسودّة',
  published: 'منشور',
  archived: 'مؤرشف',
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('courses').select('title').eq('id', id).maybeSingle()
  return { title: data?.title ?? 'الكورس' }
}

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage('courses')
  const { id } = await params
  const supabase = await createClient()

  const [courseRes, gradesRes, modulesRes, lessonsRes] = await Promise.all([
    supabase
      .from('courses')
      .select('id, title, description, grade_id, price, status, slug, thumbnail_url')
      .eq('id', id)
      .maybeSingle(),
    supabase.from('grades').select('id, name_ar').order('sort_order'),
    supabase.from('course_modules').select('id, title').eq('course_id', id).order('sort_order'),
    supabase
      .from('lessons')
      .select(
        'id, title, description, duration_seconds, is_free, is_published, module_id, sort_order, section, publish_at',
      )
      .eq('course_id', id)
      .order('sort_order'),
  ])

  const course = courseRes.data
  if (!course) notFound()

  const modules = modulesRes.data ?? []
  const lessons = lessonsRes.data ?? []
  const lessonIds = lessons.map((l) => l.id)

  // الفيديوهات والمرفقات والواجبات تُجلب لدروس هذا الكورس وحده، لا للجدول كلّه
  const [videosRes, filesRes, homeworkRes] = lessonIds.length
    ? await Promise.all([
        supabase
          .from('lesson_videos')
          .select(
            'lesson_id, video_url, storage_path, bunny_video_id, required_percent, allow_download',
          )
          .in('lesson_id', lessonIds),
        supabase
          .from('lesson_attachments')
          .select('lesson_id, attachments(id, title, file_size, external_url)')
          .in('lesson_id', lessonIds),
        supabase
          .from('exams')
          .select(
            'id, lesson_id, title, is_published, passing_percentage, exam_questions(count), exam_attempts(count)',
          )
          .in('lesson_id', lessonIds)
          .order('created_at'),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }]

  const videoOf = new Map(
    (videosRes.data ?? []).map((v) => [
      v.lesson_id,
      {
        storagePath: v.storage_path,
        bunnyVideoId: v.bunny_video_id,
        url: v.video_url ?? '',
        requiredPercent: v.required_percent ?? 90,
        allowDownload: v.allow_download ?? false,
      },
    ]),
  )

  const filesOf = new Map<string, CurriculumLesson['attachments']>()
  for (const row of filesRes.data ?? []) {
    const file = row.attachments
    if (!file) continue
    const list = filesOf.get(row.lesson_id) ?? []
    list.push({
      id: file.id,
      title: file.title,
      size: file.file_size,
      isLink: Boolean(file.external_url),
    })
    filesOf.set(row.lesson_id, list)
  }

  const homeworkOf = new Map<string, CurriculumLesson['homework']>()
  for (const hw of homeworkRes.data ?? []) {
    if (!hw.lesson_id) continue
    const list = homeworkOf.get(hw.lesson_id) ?? []
    list.push({
      id: hw.id,
      title: hw.title,
      isPublished: hw.is_published,
      // عدّ العلاقة يعود مصفوفةً فيها كائن واحد فيه count
      questions: hw.exam_questions?.[0]?.count ?? 0,
      attempts: hw.exam_attempts?.[0]?.count ?? 0,
      passingPercentage: Number(hw.passing_percentage),
    })
    homeworkOf.set(hw.lesson_id, list)
  }

  const toManaged = (l: (typeof lessons)[number]): CurriculumLesson => ({
    id: l.id,
    title: l.title,
    description: l.description ?? '',
    moduleId: l.module_id,
    durationMinutes: l.duration_seconds ? String(Math.round(l.duration_seconds / 60)) : '',
    isFree: l.is_free,
    isPublished: l.is_published,
    section: (l.section ?? '') as CurriculumLesson['section'],
    publishAt: l.publish_at ?? '',
    video: videoOf.get(l.id) ?? null,
    attachments: filesOf.get(l.id) ?? [],
    homework: homeworkOf.get(l.id) ?? [],
    durationSeconds: l.duration_seconds,
    hasVideo: videoOf.has(l.id),
  })

  const grouped: CurriculumModule[] = modules.map((m) => ({
    id: m.id,
    title: m.title,
    lessons: lessons.filter((l) => l.module_id === m.id).map(toManaged),
  }))

  // دروس بلا وحدة تظهر في مجموعة أخيرة كي لا تختفي عن المشرف
  const loose = lessons.filter((l) => !l.module_id).map(toManaged)
  if (loose.length > 0 || modules.length === 0) {
    grouped.push({ id: null, title: 'دروس خارج الوحدات', lessons: loose })
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/courses"
        className="inline-flex items-center gap-1.5 text-base text-ink-muted underline-offset-4 hover:text-ink hover:underline"
      >
        <ArrowRight className="size-4" aria-hidden />
        كل الكورسات
      </Link>

      <PageHeader
        title={course.title}
        description="عدّل بيانات الكورس، ونظّم وحداته ودروسه."
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/admin/courses/${course.id}/views`}
              className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-field)] bg-brand-700 px-4 text-base font-medium text-ink-invert transition-colors hover:bg-brand-800"
            >
              <Eye className="size-4" aria-hidden />
              مين شاف ومين مشافش
            </Link>
            {course.status === 'published' && (
              <Link
                href={`/student/courses/${course.slug}`}
                className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-field)] border border-border-strong bg-surface px-4 text-base font-medium text-ink transition-colors hover:bg-surface-muted"
              >
                <ExternalLink className="size-4" aria-hidden />
                معاينة كطالب
              </Link>
            )}
          </div>
        }
      />

      <CollapsibleCard
        title="بيانات الكورس"
        icon={BookOpen}
        summary={`${course.title} · ${STATUS_LABEL[course.status]}`}
      >
        <CourseForm
          grades={gradesRes.data ?? []}
          defaults={{
            id: course.id,
            title: course.title,
            description: course.description ?? '',
            gradeId: course.grade_id ?? '',
            price: course.price ? String(course.price) : '',
            status: course.status,
            slug: course.slug,
          }}
        />
      </CollapsibleCard>

      <CollapsibleCard
        title="صورة الكورس"
        icon={ImageIcon}
        summary={course.thumbnail_url ? 'صورة مرفوعة' : 'بلا صورة'}
      >
        <CourseImageForm
          courseId={course.id}
          current={course.thumbnail_url}
          courseTitle={course.title}
        />
      </CollapsibleCard>

      {/* المحتوى مفتوح افتراضيًّا: هو ما يُفتح الكورس من أجله */}
      <CollapsibleCard title="محتوى الكورس" icon={Layers} defaultOpen>
        <ModuleForm courseId={course.id} />
        <CourseCurriculum
          courseId={course.id}
          modules={grouped}
          moduleOptions={modules}
          bunnyEnabled={isBunnyEnabled()}
        />
      </CollapsibleCard>
    </div>
  )
}
