/**
 * نموذج أخطاء موحّد.
 *
 * القاعدة: لا تصل رسالة PostgreSQL خام إلى المستخدم أبدًا (البند 38).
 * دوال القاعدة ترفع الكود الإنجليزي في نص الاستثناء، وهذه الطبقة وحدها
 * تحوّله إلى نص عربي مفهوم. أي كود غير معروف يسقط إلى رسالة عامة.
 */

export const ERROR_CODES = [
  'UNAUTHORIZED',
  'FORBIDDEN',
  'ACCOUNT_SUSPENDED',
  'DEVICE_LIMIT',
  'INVALID_CODE',
  'CODE_EXPIRED',
  'CODE_ALREADY_USED',
  'CODE_CANCELLED',
  'CODE_GENERATION_FAILED',
  'ENROLLMENT_EXISTS',
  'COURSE_NOT_FOUND',
  'COURSE_NOT_AVAILABLE',
  'STUDENT_NOT_FOUND',
  'ACCOUNT_NOT_FOUND',
  'CANNOT_DELETE_SELF',
  'INVALID_QUANTITY',
  'QUANTITY_EXCEEDS_LIMIT',
  'INVALID_DURATION',
  'EXAM_NOT_AVAILABLE',
  'EXAM_NOT_STARTED',
  'EXAM_ENDED',
  'MAX_ATTEMPTS_REACHED',
  'QUESTION_NOT_FOUND',
  'ATTEMPT_NOT_FOUND',
  'ATTEMPT_NOT_ACTIVE',
  'ATTEMPT_EXPIRED',
  'ATTEMPT_ALREADY_SUBMITTED',
  'TICKET_NOT_FOUND',
  'INVALID_CREDENTIALS',
  'EMAIL_ALREADY_REGISTERED',
  'EMAIL_NOT_CONFIRMED',
  'INVALID_EMAIL',
  'WEAK_PASSWORD',
  'RATE_LIMITED',
  'EMAIL_SEND_LIMIT',
  'NETWORK_ERROR',
  'UNKNOWN',
] as const

export type ErrorCode = (typeof ERROR_CODES)[number]

const MESSAGES: Record<ErrorCode, string> = {
  UNAUTHORIZED: 'سجّل الدخول للمتابعة.',
  FORBIDDEN: 'ليست لديك صلاحية لهذا الإجراء.',
  ACCOUNT_SUSPENDED: 'حسابك موقوف. تواصل مع الدعم لمعرفة السبب.',
  DEVICE_LIMIT:
    'حسابك مسموح له بجهازين فقط، وهو مفتوح بالفعل على جهازين. لفتحه على هذا الجهاز تواصل مع الدعم لإعادة تعيين أجهزتك.',

  INVALID_CODE: 'الكود غير صحيح. راجع الحروف والأرقام ثم أعد المحاولة.',
  CODE_EXPIRED: 'انتهت صلاحية هذا الكود.',
  CODE_ALREADY_USED: 'هذا الكود مُستخدَم من قبل.',
  CODE_CANCELLED: 'تم إلغاء هذا الكود.',
  CODE_GENERATION_FAILED: 'تعذّر توليد الأكواد. أعد المحاولة.',

  ENROLLMENT_EXISTS: 'أنت مشترك في هذا المقرر بالفعل.',
  COURSE_NOT_FOUND: 'المقرر غير موجود.',
  COURSE_NOT_AVAILABLE: 'هذا المقرر غير متاح حاليًا.',
  STUDENT_NOT_FOUND: 'لم نعثر على هذا الطالب.',
  ACCOUNT_NOT_FOUND: 'لم نعثر على هذا الحساب. ربما حُذف بالفعل.',
  CANNOT_DELETE_SELF: 'لا يمكنك حذف حسابك أنت.',

  INVALID_QUANTITY: 'أدخل عددًا صحيحًا أكبر من صفر.',
  QUANTITY_EXCEEDS_LIMIT: 'الحد الأقصى ٥٠٠ كود في الدفعة الواحدة.',
  INVALID_DURATION: 'مدة الاشتراك يجب أن تكون أكبر من صفر.',

  EXAM_NOT_AVAILABLE: 'هذا الاختبار غير متاح.',
  EXAM_NOT_STARTED: 'لم يبدأ الاختبار بعد.',
  EXAM_ENDED: 'انتهى وقت هذا الاختبار.',
  MAX_ATTEMPTS_REACHED: 'استنفدت محاولاتك المتاحة في هذا الاختبار.',
  QUESTION_NOT_FOUND: 'لم نعثر على هذا السؤال.',
  ATTEMPT_NOT_FOUND: 'لم نعثر على هذه المحاولة.',
  ATTEMPT_NOT_ACTIVE: 'هذه المحاولة لم تعد جارية.',
  ATTEMPT_EXPIRED: 'انتهى وقت المحاولة.',
  ATTEMPT_ALREADY_SUBMITTED: 'تم تسليم هذه المحاولة بالفعل.',

  TICKET_NOT_FOUND: 'لم نعثر على هذه المحادثة.',

  INVALID_CREDENTIALS: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
  EMAIL_ALREADY_REGISTERED: 'هذا البريد مسجَّل بالفعل. جرّب تسجيل الدخول.',
  EMAIL_NOT_CONFIRMED: 'أكّد بريدك الإلكتروني أولًا من الرسالة المُرسَلة إليك.',
  INVALID_EMAIL: 'هذا البريد غير مقبول. استخدم بريدًا حقيقيًا مثل Gmail أو Outlook.',
  WEAK_PASSWORD: 'كلمة المرور قصيرة. استخدم ٨ أحرف على الأقل.',
  RATE_LIMITED: 'محاولات كثيرة في وقت قصير. انتظر دقائق ثم حاول من جديد.',
  EMAIL_SEND_LIMIT:
    'تعذّر إرسال رسالة التأكيد الآن بسبب ضغط على خدمة البريد. انتظر قليلًا ثم أعد المحاولة، أو تواصل مع الدعم.',

  NETWORK_ERROR: 'تعذّر الاتصال. تأكد من الإنترنت وأعد المحاولة.',
  UNKNOWN: 'تعذّر إتمام العملية. أعد المحاولة، وإن تكرّر تواصل مع الدعم.',
}

export class AppError extends Error {
  readonly code: ErrorCode

  constructor(code: ErrorCode, cause?: unknown) {
    super(MESSAGES[code])
    this.name = 'AppError'
    this.code = code
    this.cause = cause
  }
}

function isErrorCode(value: string): value is ErrorCode {
  return (ERROR_CODES as readonly string[]).includes(value)
}

/**
 * أكواد Supabase Auth المُهيكلة (خاصية `code` في AuthApiError).
 * مطابقة الكود أدقّ من مطابقة نص الرسالة، لأن النص يتغيّر بين الإصدارات.
 */
const SUPABASE_AUTH_CODES: Record<string, ErrorCode> = {
  invalid_credentials: 'INVALID_CREDENTIALS',
  email_not_confirmed: 'EMAIL_NOT_CONFIRMED',
  email_address_invalid: 'INVALID_EMAIL',
  validation_failed: 'INVALID_EMAIL',
  signup_disabled: 'FORBIDDEN',
  user_already_exists: 'EMAIL_ALREADY_REGISTERED',
  email_exists: 'EMAIL_ALREADY_REGISTERED',
  weak_password: 'WEAK_PASSWORD',
  over_request_rate_limit: 'RATE_LIMITED',
  over_email_send_rate_limit: 'EMAIL_SEND_LIMIT',
  over_sms_send_rate_limit: 'EMAIL_SEND_LIMIT',
  user_banned: 'ACCOUNT_SUSPENDED',
  session_expired: 'UNAUTHORIZED',
  no_authorization: 'UNAUTHORIZED',
}

/** يحوّل أي خطأ (Supabase أو Postgres أو شبكة) إلى كود معروف. */
export function toErrorCode(error: unknown): ErrorCode {
  if (error instanceof AppError) return error.code
  if (!error) return 'UNKNOWN'

  const obj = typeof error === 'object' && error !== null ? (error as Record<string, unknown>) : null

  // 1) كود Supabase المُهيكل — الأوثق
  const supabaseCode = obj && typeof obj['code'] === 'string' ? obj['code'] : ''
  const mapped = SUPABASE_AUTH_CODES[supabaseCode]
  if (mapped) return mapped

  const raw =
    typeof error === 'string' ? error : obj && 'message' in obj ? String(obj['message']) : ''

  // 2) أكواد دوال القاعدة تأتي داخل نص الرسالة
  for (const code of ERROR_CODES) {
    if (raw.includes(code)) return code
  }

  // 3) مطابقة نصية أخيرة للإصدارات القديمة من Supabase
  const lower = raw.toLowerCase()
  if (lower.includes('invalid login credentials')) return 'INVALID_CREDENTIALS'
  if (lower.includes('already registered') || lower.includes('already been registered')) {
    return 'EMAIL_ALREADY_REGISTERED'
  }
  if (lower.includes('email not confirmed')) return 'EMAIL_NOT_CONFIRMED'
  if (lower.includes('password should be')) return 'WEAK_PASSWORD'
  if (lower.includes('rate limit') || lower.includes('too many requests')) return 'RATE_LIMITED'
  if (lower.includes('fetch failed') || lower.includes('networkerror')) return 'NETWORK_ERROR'

  if (isErrorCode(raw)) return raw
  return 'UNKNOWN'
}

/** الرسالة العربية الجاهزة للعرض. */
export function toArabicMessage(error: unknown): string {
  return MESSAGES[toErrorCode(error)]
}

export function messageFor(code: ErrorCode): string {
  return MESSAGES[code]
}
