/**
 * حدّ الأجهزة للطالب: جهازان على الأكثر لكل حساب.
 *
 * الجهاز يُعرَّف بمعرّف عشوائي في كوكي طويلة العمر، لا بعنوان IP: عنوان
 * الموبايل يتغيّر عدة مرات يوميًّا، وأهل البيت الواحد يتشاركون عنوانًا واحدًا،
 * فالحدّ على الـIP كان سيُغلق الحساب على صاحبه. الـIP يُسجَّل للعرض فقط.
 *
 * القرار نفسه في القاعدة (`register_device`) لا هنا: هذا الملف يجهّز المعرّف فقط.
 */

export const DEVICE_COOKIE = 'naga_device'
export const DEVICE_LIMIT = 2

/** أقصى عمر تقبله المتصفحات للكوكي (٤٠٠ يوم). */
const MAX_AGE = 60 * 60 * 24 * 400

const DEVICE_ID_RE = /^[a-f0-9]{32}$/

export const deviceCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: MAX_AGE,
}

/** معرّف موجود وصالح، أو null إن غاب أو عُبث به. */
export function validDeviceId(value: string | undefined): string | null {
  return value && DEVICE_ID_RE.test(value) ? value : null
}

export function newDeviceId(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

/** أول عنوان في x-forwarded-for هو العميل الحقيقي خلف Vercel. */
export function clientIp(headers: Headers): string | undefined {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || headers.get('x-real-ip') || undefined
}
