import { createClient } from '@/lib/supabase/server'

/**
 * تفاصيل مقرر واحد.
 * RLS تتكفّل بكل شيء: المقرر غير المنشور لا يعود، والدروس تعود كفهرس
 * بلا روابط فيديو، ورابط الفيديو في lesson_videos لا يعود إلا لمن يستحقه.
 */

export type OutlineLesson = {
  id: string
  title: string
  description: string | null
  durationSeconds: number
  isFree: boolean
  hasVideo: boolean
  completed: boolean
  progressPercent: number
}

export type OutlineModule = {
  id: string | null
  title: string
  lessons: OutlineLesson[]
}

export type CourseOutline = {
  id: string
  title: string
  slug: string
  description: string | null
  thumbnailUrl: string | null
  gradeName: string | null
  enrolled: boolean
  expiresAt: string | null
  modules: OutlineModule[]
  totalLessons: number
  completedLessons: number
  percent: number
  attachments: { id: string; title: string; fileName: string; fileSize: number }[]
}

export async function getCourseOutline(slug: string): Promise<CourseOutline | null> {
  const supabase = await createClient()

  const { data: course } = await supabase
    .from('courses')
    .select('id, title, slug, description, thumbnail_url, grades(name_ar)')
    .eq('slug', slug)
    .maybeSingle()

  if (!course) return null

  const c = course as unknown as {
    id: string
    title: string
    slug: string
    description: string | null
    thumbnail_url: string | null
    grades: { name_ar: string } | null
  }

  const [enrollmentRes, modulesRes, lessonsRes, progressRes, attachRes] = await Promise.all([
    supabase
      .from('enrollments')
      .select('expires_at')
      .eq('course_id', c.id)
      .eq('status', 'active')
      .maybeSingle(),
    supabase.from('course_modules').select('id, title, sort_order').eq('course_id', c.id).order('sort_order'),
    supabase
      .from('lessons')
      .select('id, title, description, duration_seconds, is_free, has_video, module_id, sort_order')
      .eq('course_id', c.id)
      .eq('is_published', true)
      .order('sort_order'),
    supabase.from('lesson_progress').select('lesson_id, completed, progress_percent'),
    supabase
      .from('course_attachments')
      .select('attachments!inner(id, title, file_name, file_size)')
      .eq('course_id', c.id),
  ])

  const progress = new Map(
    (progressRes.data ?? []).map((p) => [p.lesson_id, p] as const),
  )

  const rows = (lessonsRes.data ?? []) as {
    id: string
    title: string
    description: string | null
    duration_seconds: number
    is_free: boolean
    has_video: boolean
    module_id: string | null
    sort_order: number
  }[]

  const toLesson = (l: (typeof rows)[number]): OutlineLesson => {
    const p = progress.get(l.id)
    return {
      id: l.id,
      title: l.title,
      description: l.description,
      durationSeconds: l.duration_seconds,
      isFree: l.is_free,
      hasVideo: l.has_video,
      completed: p?.completed ?? false,
      progressPercent: Number(p?.progress_percent ?? 0),
    }
  }

  const modules: OutlineModule[] = (modulesRes.data ?? []).map((m) => ({
    id: m.id,
    title: m.title,
    lessons: rows.filter((l) => l.module_id === m.id).map(toLesson),
  }))

  // دروس بلا وحدة: تُعرض في مجموعة واحدة بدل أن تختفي من الفهرس
  const loose = rows.filter((l) => !l.module_id).map(toLesson)
  if (loose.length > 0) {
    modules.push({ id: null, title: modules.length > 0 ? 'دروس إضافية' : 'الدروس', lessons: loose })
  }

  const totalLessons = rows.length
  const completedLessons = rows.filter((l) => progress.get(l.id)?.completed).length

  const attachments = (
    (attachRes.data ?? []) as unknown as {
      attachments: { id: string; title: string; file_name: string; file_size: number }
    }[]
  ).map((r) => ({
    id: r.attachments.id,
    title: r.attachments.title,
    fileName: r.attachments.file_name,
    fileSize: r.attachments.file_size,
  }))

  return {
    id: c.id,
    title: c.title,
    slug: c.slug,
    description: c.description,
    thumbnailUrl: c.thumbnail_url,
    gradeName: c.grades?.name_ar ?? null,
    enrolled: Boolean(enrollmentRes.data),
    expiresAt: enrollmentRes.data?.expires_at ?? null,
    modules,
    totalLessons,
    completedLessons,
    percent: totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100),
    attachments,
  }
}

export type LessonView = {
  id: string
  title: string
  description: string | null
  durationSeconds: number
  courseId: string
  courseTitle: string
  courseSlug: string
  videoUrl: string | null
  provider: string | null
  /** مشترك في المقرر أو الدرس مجاني — يميّز «غير مشترك» عن «بلا فيديو» */
  entitled: boolean
  /** نسبة المشاهدة التي تُعدّ إكمالًا للدرس */
  requiredPercent: number
  allowDownload: boolean
  watchedSeconds: number
  /** أعلى نسبة مشاهدة فعلية سُجّلت — نقطة البداية لعدّاد المشاهدة */
  progressPercent: number
  completed: boolean
  prevId: string | null
  nextId: string | null
  /** واجبات هذا الدرس: اختبارات تفاعلية مربوطة به */
  homework: {
    id: string
    title: string
    passingPercentage: number
    durationMinutes: number | null
    maxAttempts: number | null
    bestPercent: number | null
    passed: boolean
    attemptsUsed: number
  }[]
  /** مرفقات هذا الدرس وحده — تعود فارغة لمن لا يحقّ له الدرس */
  attachments: {
    id: string
    title: string
    fileName: string
    fileSize: number | null
    isLink: boolean
  }[]
}

export async function getLesson(slug: string, lessonId: string): Promise<LessonView | null> {
  const supabase = await createClient()

  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, title, description, duration_seconds, course_id, is_free, courses!inner(title, slug)')
    .eq('id', lessonId)
    .eq('is_published', true)
    .maybeSingle()

  if (!lesson) return null

  const l = lesson as unknown as {
    id: string
    title: string
    description: string | null
    duration_seconds: number
    course_id: string
    is_free: boolean
    courses: { title: string; slug: string }
  }

  if (l.courses.slug !== slug) return null

  // الرابط يعود فقط إذا سمحت سياسة lesson_videos — أي للمسجَّل أو للدرس المجاني
  const [videoRes, progressRes, siblingsRes, attachRes, enrollRes, homeworkRes] =
    await Promise.all([
    supabase
      .from('lesson_videos')
      .select('video_url, provider, storage_path, bunny_video_id, required_percent, allow_download')
      .eq('lesson_id', l.id)
      .maybeSingle(),
    supabase
      .from('lesson_progress')
      .select('watched_seconds, progress_percent, completed')
      .eq('lesson_id', l.id)
      .maybeSingle(),
    supabase
      .from('lessons')
      .select('id, sort_order')
      .eq('course_id', l.course_id)
      .eq('is_published', true)
      .order('sort_order'),
    supabase
      .from('lesson_attachments')
      .select('attachments!inner(id, title, file_name, file_size, external_url)')
      .eq('lesson_id', l.id),
    supabase
      .from('enrollments')
      .select('id')
      .eq('course_id', l.course_id)
      .eq('status', 'active')
      .maybeSingle(),
    // RLS تحجب واجب درس لا يحقّ له، فالاستعلام لا يحتاج شرطًا إضافيًّا
    supabase
      .from('exams')
      .select(
        'id, title, passing_percentage, duration_minutes, max_attempts, exam_attempts(percentage, passed, status)',
      )
      .eq('lesson_id', l.id)
      .eq('is_published', true)
      .order('created_at'),
  ])

  const lessonAttachments = (
    (attachRes.data ?? []) as unknown as {
      attachments: {
        id: string
        title: string
        file_name: string
        file_size: number | null
        external_url: string | null
      }
    }[]
  ).map((r) => ({
    id: r.attachments.id,
    title: r.attachments.title,
    fileName: r.attachments.file_name,
    fileSize: r.attachments.file_size,
    isLink: Boolean(r.attachments.external_url),
  }))

  /*
   * عدد الأسئلة لا يُعرض للطالب: RLS تحجب صفوف `exam_questions` عنه خارج
   * محاولة جارية — وهو الصواب، فقراءتها تكشف الإجابات — فيعود العدّ صفرًا
   * دائمًا. ما يفيده هنا: نسبة النجاح والمدة ومحاولاته ونتيجته.
   */
  const homework = (homeworkRes.data ?? []).map((hw) => {
    const tries = (hw.exam_attempts ?? []).filter((a) => a.status !== 'in_progress')
    const scores = tries.map((a) => Number(a.percentage ?? 0))

    return {
      id: hw.id,
      title: hw.title,
      passingPercentage: Number(hw.passing_percentage),
      durationMinutes: hw.duration_minutes,
      maxAttempts: hw.max_attempts,
      // الأفضل لا الأخير: محاولة أضعف بعد نجاح لا تُلغي النجاح
      bestPercent: scores.length > 0 ? Math.max(...scores) : null,
      passed: tries.some((a) => a.passed === true),
      attemptsUsed: tries.length,
    }
  })

  const siblings = siblingsRes.data ?? []
  const index = siblings.findIndex((s) => s.id === l.id)

  return {
    id: l.id,
    title: l.title,
    description: l.description,
    durationSeconds: l.duration_seconds,
    courseId: l.course_id,
    courseTitle: l.courses.title,
    courseSlug: l.courses.slug,
    /*
     * الفيديو المستضاف لا يُعطى رابطه المباشر: الدلو خاصّ، والمسار أدناه
     * يوقّع رابطًا قصير العمر بعد التحقّق من الاستحقاق.
     * وجود صفّ فيديو أصلًا هو دليل الاستحقاق، لأن RLS تحجبه عن غيره.
     */
    videoUrl: videoRes.data
      ? videoRes.data.storage_path || videoRes.data.bunny_video_id
        ? `/api/lesson-video/${l.id}`
        : (videoRes.data.video_url ?? null)
      : null,
    provider: videoRes.data?.provider ?? null,
    entitled: l.is_free || Boolean(enrollRes.data),
    requiredPercent: videoRes.data?.required_percent ?? 90,
    allowDownload: videoRes.data?.allow_download ?? false,
    watchedSeconds: progressRes.data?.watched_seconds ?? 0,
    progressPercent: Number(progressRes.data?.progress_percent ?? 0),
    completed: progressRes.data?.completed ?? false,
    prevId: index > 0 ? (siblings[index - 1]?.id ?? null) : null,
    nextId: index >= 0 && index < siblings.length - 1 ? (siblings[index + 1]?.id ?? null) : null,
    attachments: lessonAttachments,
    homework,
  }
}
