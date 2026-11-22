import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * وضع الصيانة.
 *
 * يُحفظ داخل إعداد `branding` لأنه الإعداد الذي يقرؤه الزائر والطالب أصلًا
 * (سياسة القراءة تتيحه للجميع)، فلا يحتاج جدولًا ولا سياسة جديدة. والكتابة
 * عليه للمدير وحده بسياسة الإعدادات القائمة.
 *
 * الـproxy يقرؤه على كل طلب، فيُخزَّن في الذاكرة ٢٠ ثانية: تفعيل الصيانة
 * يصل كل الزوّار خلال ثوانٍ، دون استعلام إضافي مع كل صورة وصفحة.
 */

export type Maintenance = { enabled: boolean; message: string }

export const DEFAULT_MAINTENANCE_MESSAGE =
  'المنصة في صيانة الآن لتحسين الخدمة. نعود خلال وقت قصير، شكرًا لصبرك.'

const TTL_MS = 20_000
let cache: { value: Maintenance; at: number } | null = null

export function parseMaintenance(branding: unknown): Maintenance {
  const m = (branding as { maintenance?: Partial<Maintenance> } | null)?.maintenance
  return {
    enabled: m?.enabled === true,
    message: typeof m?.message === 'string' && m.message.trim() ? m.message : DEFAULT_MAINTENANCE_MESSAGE,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function readMaintenance(supabase: SupabaseClient<any, any, any>): Promise<Maintenance> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value

  const { data, error } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', 'branding')
    .maybeSingle()

  // خطأ مؤقت في القاعدة لا يُغلق المنصة: يبقى آخر حال معروف، أو «مفتوحة»
  if (error) return cache?.value ?? { enabled: false, message: DEFAULT_MAINTENANCE_MESSAGE }

  const value = parseMaintenance(data?.value)
  cache = { value, at: Date.now() }
  return value
}

/** بعد تغيير الإعداد من اللوحة: لا ينتظر هذا الخادم انتهاء الذاكرة. */
export function clearMaintenanceCache() {
  cache = null
}
