'use server'

import { redirect } from 'next/navigation'
import { cookies, headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { toErrorCode, messageFor } from '@/lib/errors'
import { homePathFor } from '@/lib/permissions'
import { DEVICE_COOKIE, deviceCookieOptions, validDeviceId, newDeviceId, clientIp } from '@/lib/devices'
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@/lib/validations/auth'

/**
 * كل الكتابة تمرّ من هنا. المكوّنات لا تتحدث إلى Supabase مباشرة (البند 43).
 * الشكل الموحّد للنتيجة يسمح للنموذج بعرض خطأ الحقل أو الخطأ العام بلا تخمين.
 */
export type ActionState =
  | { status: 'idle' }
  | { status: 'error'; message: string; fieldErrors?: Record<string, string> }

/**
 * حقل غائب من النموذج يصل كـnull، وZod عندها ترفع رسالتها الإنجليزية الافتراضية
 * بدل رسالتنا العربية. التحويل إلى نص فارغ يضمن أن يعمل تحقّقنا هو (البند 38).
 */
const text = (formData: FormData, key: string): string => String(formData.get(key) ?? '')

const fieldErrorsFrom = (issues: { path: PropertyKey[]; message: string }[]) => {
  const out: Record<string, string> = {}
  for (const issue of issues) {
    const key = issue.path[0]
    if (typeof key === 'string' && !out[key]) out[key] = issue.message
  }
  return out
}

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: text(formData, 'email'),
    password: text(formData, 'password'),
  })

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'راجع البيانات المدخلة.',
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) {
    return { status: 'error', message: messageFor(toErrorCode(error)) }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: 'error', message: messageFor('UNKNOWN') }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .single()

  if (profile?.status === 'suspended') {
    // لا نُبقي جلسة لحساب موقوف
    await supabase.auth.signOut()
    return { status: 'error', message: messageFor('ACCOUNT_SUSPENDED') }
  }

  // حدّ الجهازين للطالب. القاعدة تقرّر وتتجاهل غير الطلاب
  if ((profile?.role ?? 'student') === 'student') {
    const cookieStore = await cookies()
    const h = await headers()
    let deviceId = validDeviceId(cookieStore.get(DEVICE_COOKIE)?.value)
    if (!deviceId) {
      deviceId = newDeviceId()
      cookieStore.set(DEVICE_COOKIE, deviceId, deviceCookieOptions)
    }

    const { data: allowed, error: deviceError } = await supabase.rpc('register_device', {
      p_device_id: deviceId,
      p_ip: clientIp(h),
      p_user_agent: h.get('user-agent') ?? undefined,
    })

    if (deviceError || allowed !== true) {
      await supabase.auth.signOut()
      return {
        status: 'error',
        message: messageFor(deviceError ? toErrorCode(deviceError) : 'DEVICE_LIMIT'),
      }
    }
  }

  const next = String(formData.get('next') ?? '')
  revalidatePath('/', 'layout')
  // المسار القادم لا يُقبل إلا إن كان داخليًا — حماية من open redirect
  redirect(next.startsWith('/') && !next.startsWith('//') ? next : homePathFor(profile?.role ?? 'student'))
}

export async function register(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    fullName: text(formData, 'fullName'),
    email: text(formData, 'email'),
    phone: text(formData, 'phone'),
    stageId: text(formData, 'stageId'),
    gradeId: text(formData, 'gradeId'),
    governorateId: text(formData, 'governorateId'),
    section: text(formData, 'section'),
    schoolName: text(formData, 'schoolName'),
    stageRequiresSection: text(formData, 'stageRequiresSection'),
    password: text(formData, 'password'),
    confirmPassword: text(formData, 'confirmPassword'),
  })

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'راجع البيانات المدخلة.',
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    }
  }

  const supabase = await createClient()
  const {
    fullName, email, phone, stageId, gradeId, governorateId, section, schoolName, password,
  } = parsed.data

  // تحقّق من أن الصف يتبع المرحلة فعلًا: الواجهة قابلة للتلاعب،
  // والقاعدة لا تفرض هذه العلاقة بقيد لأنها علاقة اختيار لا سلامة مرجعية.
  const { data: grade } = await supabase
    .from('grades')
    .select('id, stage_id')
    .eq('id', gradeId)
    .eq('is_visible', true)
    .maybeSingle()

  if (!grade || grade.stage_id !== stageId) {
    return {
      status: 'error',
      message: 'راجع البيانات المدخلة.',
      fieldErrors: { gradeId: 'هذا الصف لا يتبع المرحلة المختارة' },
    }
  }

  // الدور والحالة غير مُمرَّرين عمدًا: القاعدة تضع القيم الافتراضية،
  // وtrigger الحارس يمنع تعديلهما لاحقًا من المستخدم.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone,
        stage_id: stageId,
        grade_id: gradeId,
        governorate_id: governorateId,
        section,
        school_name: schoolName,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  })

  if (error) {
    return { status: 'error', message: messageFor(toErrorCode(error)) }
  }

  revalidatePath('/', 'layout')

  // تأكيد البريد مُعطَّل في المشروع ⇐ Supabase يُرجع جلسة فورًا فندخل الطالب مباشرة.
  // مُفعَّل ⇐ لا جلسة، فنوجّهه لصفحة «راجع بريدك».
  // التفرّع على الجلسة لا على إعداد ثابت: الإعداد قد يتغيّر من لوحة Supabase.
  if (data.session) redirect('/student')

  redirect('/register/check-email')
}

export async function requestPasswordReset(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get('email') })

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'راجع البريد الإلكتروني.',
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    }
  }

  const supabase = await createClient()
  // النتيجة واحدة سواء وُجد البريد أم لا — منعًا لتعداد الحسابات (البند 39)
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/reset-password`,
  })

  redirect('/forgot-password/sent')
}

export async function resetPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  })

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'راجع كلمة المرور.',
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })

  if (error) {
    return { status: 'error', message: messageFor(toErrorCode(error)) }
  }

  revalidatePath('/', 'layout')
  redirect('/login?reset=done')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

/**
 * تعيين دور لحساب.
 *
 * الصلاحية تُفرَض في القاعدة لا هنا: مُشغّل `guard_profile_privileged_columns`
 * يسمح للمدير بتعيين «دعم» أو «طالب»، ويشترط `super_admin` لصنع مدير جديد.
 * هذه الدالة واجهة لتلك القاعدة، ورسالةٌ مفهومة حين ترفض.
 */
export async function setUserRole(userId: string, role: 'student' | 'support' | 'admin') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: messageFor('UNAUTHORIZED') }

  if (user.id === userId) {
    return { ok: false, message: 'لا يمكنك تغيير دور حسابك أنت.' }
  }

  const { error } = await supabase.from('profiles').update({ role }).eq('id', userId)

  if (error) {
    // 42501 = رفض المُشغّل. رسالته العربية أدقّ من أي رسالة عامة
    if (error.code === '42501') {
      return {
        ok: false,
        message: error.message.replace(/^FORBIDDEN:\s*/, '') || messageFor('FORBIDDEN'),
      }
    }
    return { ok: false, message: messageFor(toErrorCode(error)) }
  }

  revalidatePath('/admin/settings')
  revalidatePath('/admin/students')

  const label = role === 'admin' ? 'مدير' : role === 'support' ? 'فريق الدعم' : 'طالب'
  return { ok: true, message: `تم تعيين الحساب: ${label}.` }
}
