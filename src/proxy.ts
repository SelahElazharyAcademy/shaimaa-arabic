import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/session'
import { DEVICE_COOKIE, deviceCookieOptions, validDeviceId, newDeviceId, clientIp } from '@/lib/devices'
import { readMaintenance } from '@/lib/maintenance'

/**
 * وظيفتان لا ثالث لهما:
 *   1. تجديد جلسة Supabase على كل طلب (وإلا انتهت صلاحيتها أثناء التصفّح).
 *   2. إعادة توجيه سريعة — **تجربة مستخدم لا أمان**.
 *
 * الدور يُقرأ من القاعدة لا من التوكن: بيانات التوكن قد تكون قديمة بعد
 * تغيير الدور، والقاعدة هي المصدر الوحيد للحقيقة. حتى لو تسلّل طلب من هنا،
 * RLS تمنعه على مستوى الصف.
 */

const AUTH_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password']
const PUBLIC_ROUTES = ['/', '/suspended', '/terms', '/privacy', '/maintenance']
/**
 * مسار تبديل رمز الإيميل بجلسة (تأكيد التسجيل، استعادة كلمة المرور).
 * يصله الزائر وهو غير مسجّل بالضرورة؛ لو حوّلناه لصفحة الدخول قبل أن يعمل
 * ما تُبدَّل الرمز أبدًا، ويرى المستخدم صفحة الدخول بدل «كلمة مرور جديدة».
 */
const AUTH_CALLBACK_PREFIX = '/auth/'

/**
 * وضع الصيانة يُغلق المنصة على الجميع عدا الإدارة والدعم.
 * صفحة الدخول تبقى مفتوحة كي يدخل المشرف ويُطفئ الصيانة.
 */
const MAINTENANCE_PATH = '/maintenance'
const OPEN_IN_MAINTENANCE = ['/login', MAINTENANCE_PATH]

function toMaintenance(request: NextRequest) {
  const url = request.nextUrl.clone()
  url.pathname = MAINTENANCE_PATH
  url.search = ''
  return NextResponse.redirect(url)
}

export async function proxy(request: NextRequest) {
  const { response, user, supabase } = await updateSession(request)
  const { pathname } = request.nextUrl

  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r))
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname)
  const isAuthCallback = pathname.startsWith(AUTH_CALLBACK_PREFIX)
  const maintenance = await readMaintenance(supabase)
  const openInMaintenance =
    isAuthCallback || OPEN_IN_MAINTENANCE.some((r) => pathname.startsWith(r))

  if (!user) {
    if (maintenance.enabled && !openInMaintenance) return toMaintenance(request)
    if (isAuthRoute || isPublicRoute || isAuthCallback) return response
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    // بعد الدخول نُعيده إلى ما كان يقصده
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .single()

  if (!profile) return response

  const isStaff = profile.role !== 'student'
  if (maintenance.enabled && !isStaff && !openInMaintenance) return toMaintenance(request)

  if (profile.status === 'suspended') {
    if (pathname === '/suspended') return response
    const url = request.nextUrl.clone()
    url.pathname = '/suspended'
    url.search = ''
    return NextResponse.redirect(url)
  }

  // حدّ الجهازين على الجلسات المفتوحة أيضًا، لا عند الدخول وحده: يشمل من كان
  // مسجّلًا قبل تفعيل الحدّ، ومن أعادت الإدارة تعيين أجهزته.
  // خطأ مؤقت في القاعدة لا يطرد الطالب؛ الطرد على رفض صريح فقط.
  if (profile.role === 'student' && !isAuthCallback) {
    const existing = validDeviceId(request.cookies.get(DEVICE_COOKIE)?.value)
    const deviceId = existing ?? newDeviceId()
    const { data: allowed, error } = await supabase.rpc('register_device', {
      p_device_id: deviceId,
      p_ip: clientIp(request.headers),
      p_user_agent: request.headers.get('user-agent') ?? undefined,
    })

    if (!error && allowed === false) {
      return NextResponse.redirect(new URL('/auth/device-limit', request.url))
    }
    if (!existing) response.cookies.set(DEVICE_COOKIE, deviceId, deviceCookieOptions)
  }

  const home =
    profile.role === 'admin' || profile.role === 'super_admin'
      ? '/admin'
      : profile.role === 'support'
        ? '/support'
        : '/student'

  // مستخدم مسجَّل لا يرى صفحات الدخول. ما عدا «كلمة مرور جديدة»: رابط الاستعادة
  // يُنشئ جلسة أولًا ثم يفتحها، فتحويله عنها يُضيّع الخطوة التي جاء من أجلها.
  if ((isAuthRoute && !pathname.startsWith('/reset-password')) || pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = home
    url.search = ''
    return NextResponse.redirect(url)
  }

  const isAdminArea = pathname.startsWith('/admin')
  const isSupportArea = pathname.startsWith('/support')
  const isStudentArea = pathname.startsWith('/student')

  const allowed =
    (isAdminArea && home === '/admin') ||
    (isSupportArea && (home === '/support' || home === '/admin')) ||
    (isStudentArea && home === '/student') ||
    (!isAdminArea && !isSupportArea && !isStudentArea)

  if (!allowed) {
    const url = request.nextUrl.clone()
    url.pathname = home
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    // كل المسارات عدا الملفات الساكنة والصور وملفات الميتا
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
}
