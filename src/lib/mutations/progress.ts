'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

/**
 * حفظ تقدّم الدرس.
 * لا نثق بالنسبة القادمة من المتصفح: تُقصّ بين ٠ و١٠٠ هنا، والقاعدة تفرض
 * نفس المدى بقيد CHECK كطبقة أخيرة. وRLS تمنع الكتابة على تقدّم طالب آخر.
 */
export async function saveLessonProgress(input: {
  lessonId: string
  watchedSeconds: number
  progressPercent: number
}): Promise<{ ok: boolean }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false }

  const incoming = Math.max(0, Math.min(100, Math.round(input.progressPercent)))
  const watched = Math.max(0, Math.round(input.watchedSeconds))

  const [{ data: prev }, { data: video }] = await Promise.all([
    supabase
      .from('lesson_progress')
      .select('progress_percent, completed')
      .eq('student_id', user.id)
      .eq('lesson_id', input.lessonId)
      .maybeSingle(),
    supabase
      .from('lesson_videos')
      .select('required_percent')
      .eq('lesson_id', input.lessonId)
      .maybeSingle(),
  ])

  /*
   * النسبة لا تنزل: من أعاد مشاهدة درس من أوله لا يُمحى ما شاهده.
   * والإكمال لا يُلغى بعد ثبوته. وحدّه نسبة الدرس نفسه من اللوحة،
   * لا رقم ثابت — كانت ٩٠ هنا بينما المشغّل يقرأ نسبة الدرس.
   */
  const percent = Math.max(incoming, Number(prev?.progress_percent ?? 0))
  const required = video?.required_percent ?? 90
  const justCompleted = !prev?.completed && percent >= required

  const { error } = await supabase.from('lesson_progress').upsert(
    {
      student_id: user.id,
      lesson_id: input.lessonId,
      watched_seconds: watched,
      progress_percent: percent,
      last_watched_at: new Date().toISOString(),
      ...(justCompleted ? { completed: true, completed_at: new Date().toISOString() } : {}),
    },
    { onConflict: 'student_id,lesson_id' },
  )

  if (error) return { ok: false }

  if (justCompleted) revalidatePath('/student', 'layout')
  return { ok: true }
}

/** تعليم الدرس مكتملًا يدويًا — للدروس بلا فيديو أو حين يُنهي الطالب مبكرًا. */
export async function markLessonComplete(lessonId: string): Promise<{ ok: boolean }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false }

  const { error } = await supabase.from('lesson_progress').upsert(
    {
      student_id: user.id,
      lesson_id: lessonId,
      progress_percent: 100,
      completed: true,
      completed_at: new Date().toISOString(),
      last_watched_at: new Date().toISOString(),
    },
    { onConflict: 'student_id,lesson_id' },
  )

  if (error) return { ok: false }

  revalidatePath('/student', 'layout')
  return { ok: true }
}
