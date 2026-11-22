'use server'

import { createClient } from '@/lib/supabase/server'
import { youTubeId } from '@/lib/utils/youtube'

/**
 * مصدر فيديو يوتيوب لدرس — يُطلب من المشغّل عند فتحه، لا يُكتب في الصفحة.
 *
 * الرابط لم يعد في مصدر الصفحة ولا في بياناتها: «عرض المصدر» ونسخ الصفحة
 * وأدوات الحفظ لا تجده. ولا يعود إلا لمن تسمح له RLS بصفّ الفيديو، أي
 * مشترك في الكورس أو درس مجاني، وبحساب نشط.
 */
export async function getYouTubeSource(lessonId: string): Promise<{ id: string } | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('lesson_videos')
    .select('video_url')
    .eq('lesson_id', lessonId)
    .maybeSingle()

  const id = youTubeId(data?.video_url)
  return id ? { id } : null
}
