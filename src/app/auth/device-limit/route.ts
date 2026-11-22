import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * جلسة مفتوحة على جهاز ثالث: نُنهيها ونعيده لصفحة الدخول برسالة الحدّ.
 * يحوّل إليها الـproxy؛ وهي تحت /auth/ فلا يعيد الـproxy فحصها (منعًا للدوران).
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/login?error=devices', request.url))
}
