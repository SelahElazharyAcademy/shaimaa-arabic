'use server'

import { youTubeId } from '@/lib/utils/youtube'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { messageFor, toErrorCode } from '@/lib/errors'
import { formatNumber } from '@/lib/utils/format'
import { bunnyConfig, deleteBunnyVideo } from '@/lib/bunny'

async function adminClient() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!me || (me.role !== 'admin' && me.role !== 'super_admin')) return null
  return { supabase, userId: user.id }
}

const refresh = (courseId: string) => {
  revalidatePath(`/admin/courses/${courseId}`)
  revalidatePath('/student', 'layout')
}

/** درس جديد بعنوانه وحده — بقيّة الحقول تُملأ من نافذة الإدارة. */
export async function quickAddLesson(courseId: string, moduleId: string | null, title: string) {
  const clean = title.trim()
  if (clean.length < 3) return { ok: false, message: 'عنوان الدرس قصير جدًا.' }

  const ctx = await adminClient()
  if (!ctx) return { ok: false, message: messageFor('FORBIDDEN') }

  const { count } = await ctx.supabase
    .from('lessons')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', courseId)

  const { error } = await ctx.supabase.from('lessons').insert({
    course_id: courseId,
    module_id: moduleId,
    title: clean,
    sort_order: (count ?? 0) + 1,
    // الدرس الجديد مخفيّ: نشره قبل إضافة محتواه يُربك الطالب
    is_published: false,
  })

  if (error) return { ok: false, message: messageFor(toErrorCode(error)) }

  refresh(courseId)
  return { ok: true, message: 'أُضيف الدرس. افتح «إدارة» لإكمال محتواه.' }
}

/** محتوى الدرس: العنوان والشرح والنشر والقسم والموعد. */
export async function saveLessonContent(input: {
  lessonId: string
  courseId: string
  title: string
  description: string
  moduleId: string | null
  durationMinutes: string
  isFree: boolean
  isPublished: boolean
  section: '' | 'scientific' | 'literary'
  publishAt: string
}) {
  const title = input.title.trim()
  if (title.length < 3) return { ok: false, message: 'عنوان الدرس قصير جدًا.' }

  const minutes = Number(input.durationMinutes || '0')
  if (!Number.isFinite(minutes) || minutes < 0 || minutes > 999) {
    return { ok: false, message: 'المدة بالدقائق من ٠ إلى ٩٩٩.' }
  }

  const ctx = await adminClient()
  if (!ctx) return { ok: false, message: messageFor('FORBIDDEN') }

  const { error } = await ctx.supabase
    .from('lessons')
    .update({
      title,
      description: input.description.trim() || null,
      module_id: input.moduleId,
      duration_seconds: Math.round(minutes * 60),
      is_free: input.isFree,
      is_published: input.isPublished,
      section: input.section || null,
      // الموعد يصل بتوقيت المتصفّح، ويُخزَّن بالمنطقة الزمنية
      publish_at: input.publishAt ? new Date(input.publishAt).toISOString() : null,
    })
    .eq('id', input.lessonId)

  if (error) return { ok: false, message: messageFor(toErrorCode(error)) }

  refresh(input.courseId)
  return { ok: true, message: 'تم حفظ الدرس.' }
}

/**
 * فيديو الدرس: مستضاف داخل المنصة أو رابط خارجي.
 * الملف المرفوع والرابط لا يجتمعان — المستضاف يسبق.
 */
export async function saveLessonVideo(input: {
  lessonId: string
  courseId: string
  storagePath: string | null
  videoUrl: string
  requiredPercent: number
  allowDownload: boolean
}) {
  const ctx = await adminClient()
  if (!ctx) return { ok: false, message: messageFor('FORBIDDEN') }

  /*
   * المصدر الوحيد المقبول: رابط يوتيوب. أُلغي الرفع المباشر من اللوحة
   * (طلب العميل)، والقاعدة هنا لا الواجهة: طلب يدوي برابط آخر يُرفض أيضًا.
   */
  const url = input.videoUrl.trim()
  if (!url) return { ok: false, message: 'اكتب رابط فيديو يوتيوب.' }
  if (!youTubeId(url) || !url.startsWith('https://')) {
    return { ok: false, message: 'الرابط ليس رابط فيديو يوتيوب صحيحًا.' }
  }

  const percent = Math.min(100, Math.max(10, Math.round(input.requiredPercent)))

  const { error } = await ctx.supabase.from('lesson_videos').upsert(
    {
      lesson_id: input.lessonId,
      // المصدر واحد: حفظ الرابط يُلغي أي ملف أو ارتباط Bunny سابق
      storage_path: null,
      bunny_video_id: null,
      video_url: url,
      provider: 'external',
      required_percent: percent,
      allow_download: input.allowDownload,
    },
    { onConflict: 'lesson_id' },
  )

  if (error) return { ok: false, message: messageFor(toErrorCode(error)) }

  refresh(input.courseId)
  return { ok: true, message: 'تم حفظ الفيديو.' }
}

export async function removeLessonVideo(lessonId: string, courseId: string) {
  const ctx = await adminClient()
  if (!ctx) return { ok: false, message: messageFor('FORBIDDEN') }

  const { data: row } = await ctx.supabase
    .from('lesson_videos')
    .select('storage_path, bunny_video_id')
    .eq('lesson_id', lessonId)
    .maybeSingle()

  const { error } = await ctx.supabase.from('lesson_videos').delete().eq('lesson_id', lessonId)
  if (error) return { ok: false, message: messageFor(toErrorCode(error)) }

  if (row?.storage_path) {
    await ctx.supabase.storage.from('lesson-videos').remove([row.storage_path])
  }

  // الملف في Bunny يُحذف كذلك: إبقاؤه يُحاسَب عليه بلا درس يستعمله
  if (row?.bunny_video_id) {
    const cfg = bunnyConfig()
    if (cfg) await deleteBunnyVideo(cfg, row.bunny_video_id)
  }

  refresh(courseId)
  return { ok: true, message: 'حُذف الفيديو.' }
}

/** نسخة من الدرس بمحتواه وفيديوه ومرفقاته، مخفيّة حتى تُراجَع. */
export async function duplicateLesson(lessonId: string, courseId: string) {
  const ctx = await adminClient()
  if (!ctx) return { ok: false, message: messageFor('FORBIDDEN') }

  const { data: src } = await ctx.supabase
    .from('lessons')
    .select('title, description, duration_seconds, module_id, is_free, section')
    .eq('id', lessonId)
    .maybeSingle()

  if (!src) return { ok: false, message: 'لم نعثر على هذا الدرس.' }

  const { count } = await ctx.supabase
    .from('lessons')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', courseId)

  const { data: copy, error } = await ctx.supabase
    .from('lessons')
    .insert({
      course_id: courseId,
      module_id: src.module_id,
      title: `${src.title} (نسخة)`,
      description: src.description,
      duration_seconds: src.duration_seconds,
      is_free: src.is_free,
      section: src.section,
      is_published: false,
      sort_order: (count ?? 0) + 1,
    })
    .select('id')
    .single()

  if (error || !copy) return { ok: false, message: messageFor(toErrorCode(error)) }

  // الفيديو المستضاف يُشار إليه لا يُنسخ: ملف واحد يخدم الدرسين
  const { data: video } = await ctx.supabase
    .from('lesson_videos')
    .select('video_url, provider, storage_path, bunny_video_id, required_percent, allow_download')
    .eq('lesson_id', lessonId)
    .maybeSingle()

  if (video) {
    await ctx.supabase.from('lesson_videos').insert({ lesson_id: copy.id, ...video })
  }

  const { data: files } = await ctx.supabase
    .from('lesson_attachments')
    .select('attachment_id')
    .eq('lesson_id', lessonId)

  if (files?.length) {
    await ctx.supabase
      .from('lesson_attachments')
      .insert(files.map((f) => ({ lesson_id: copy.id, attachment_id: f.attachment_id })))
  }

  refresh(courseId)
  return { ok: true, message: 'نُسخ الدرس. النسخة مخفيّة حتى تنشرها.' }
}

/**
 * حذف درس.
 * `lesson_progress` عليه CASCADE، فحذف درس شاهده طلاب يمحو تقدّمهم فيه.
 * نمنعه ونقترح الإخفاء — وهو يؤدّي الغرض بلا فقد.
 */
export async function deleteLesson(lessonId: string, courseId: string) {
  const ctx = await adminClient()
  if (!ctx) return { ok: false, message: messageFor('FORBIDDEN') }

  const { count } = await ctx.supabase
    .from('lesson_progress')
    .select('id', { count: 'exact', head: true })
    .eq('lesson_id', lessonId)

  if (count && count > 0) {
    return {
      ok: false,
      message: `شاهد هذا الدرس ${formatNumber(count)} طالب، وحذفه يمحو تقدّمهم فيه. أخفِه بدل حذفه.`,
    }
  }

  const { data: video } = await ctx.supabase
    .from('lesson_videos')
    .select('storage_path, bunny_video_id')
    .eq('lesson_id', lessonId)
    .maybeSingle()

  const { error } = await ctx.supabase.from('lessons').delete().eq('id', lessonId)
  if (error) return { ok: false, message: messageFor(toErrorCode(error)) }

  if (video?.bunny_video_id) {
    // النسخ تتشارك الفيديو نفسه، فلا يُحذف إلا إن لم يعد مشارًا إليه
    const { count: stillUsed } = await ctx.supabase
      .from('lesson_videos')
      .select('lesson_id', { count: 'exact', head: true })
      .eq('bunny_video_id', video.bunny_video_id)

    const cfg = bunnyConfig()
    if (!stillUsed && cfg) await deleteBunnyVideo(cfg, video.bunny_video_id)
  }

  if (video?.storage_path) {
    // الملف قد يخدم نسخة أخرى، فلا يُحذف إلا إن لم يعد مشارًا إليه
    const { count: stillUsed } = await ctx.supabase
      .from('lesson_videos')
      .select('lesson_id', { count: 'exact', head: true })
      .eq('storage_path', video.storage_path)

    if (!stillUsed) {
      await ctx.supabase.storage.from('lesson-videos').remove([video.storage_path])
    }
  }

  refresh(courseId)
  return { ok: true, message: 'حُذف الدرس.' }
}

/** مرفق برابط خارجي بدل ملف مرفوع. */
export async function addLinkAttachment(
  lessonId: string,
  courseId: string,
  title: string,
  url: string,
) {
  const clean = title.trim()
  const link = url.trim()

  if (clean.length < 3) return { ok: false, message: 'عنوان الرابط قصير جدًا.' }

  try {
    const parsed = new URL(link)
    if (parsed.protocol !== 'https:') {
      return { ok: false, message: 'الرابط يجب أن يبدأ بـ https.' }
    }
  } catch {
    return { ok: false, message: 'رابط غير صحيح.' }
  }

  const ctx = await adminClient()
  if (!ctx) return { ok: false, message: messageFor('FORBIDDEN') }

  const { data: row, error } = await ctx.supabase
    .from('attachments')
    .insert({
      title: clean,
      file_name: clean,
      external_url: link,
      storage_path: null,
      mime_type: null,
      file_size: null,
      created_by: ctx.userId,
    })
    .select('id')
    .single()

  if (error || !row) return { ok: false, message: messageFor(toErrorCode(error)) }

  const { error: linkError } = await ctx.supabase
    .from('lesson_attachments')
    .insert({ lesson_id: lessonId, attachment_id: row.id })

  if (linkError) {
    await ctx.supabase.from('attachments').delete().eq('id', row.id)
    return { ok: false, message: messageFor(toErrorCode(linkError)) }
  }

  refresh(courseId)
  return { ok: true, message: 'أُضيف الرابط إلى الدرس.' }
}
