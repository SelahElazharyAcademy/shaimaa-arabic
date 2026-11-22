'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { messageFor, toErrorCode } from '@/lib/errors'
import { pluralAr } from '@/lib/utils/format'
import { clearMaintenanceCache } from '@/lib/maintenance'

async function adminClient() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!me || (me.role !== 'admin' && me.role !== 'super_admin')) return null

  return { supabase, userId: user.id }
}

/* ===================== إعدادات المنصة ===================== */

const httpsUrl = z
  .string()
  .trim()
  .max(200, 'الرابط طويل جدًا')
  .refine((v) => v === '' || /^https:\/\/\S+$/i.test(v), 'الرابط يجب أن يبدأ بـ https')

const brandingSchema = z.object({
  site_name: z
    .string()
    .trim()
    .min(3, 'اسم المنصة قصير جدًا')
    .max(80, 'اسم المنصة طويل جدًا'),
  code_prefix: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{2,10}$/, 'البادئة حروف إنجليزية وأرقام، من حرفين إلى عشرة'),
  support_email: z
    .string()
    .trim()
    .max(120, 'البريد طويل جدًا')
    .refine((v) => v === '' || z.email().safeParse(v).success, 'بريد غير صحيح'),
  support_phone: z
    .string()
    .trim()
    .max(20, 'الرقم طويل جدًا')
    .refine((v) => v === '' || /^[0-9+\s-]{7,20}$/.test(v), 'رقم غير صحيح'),
  whatsapp: z
    .string()
    .trim()
    .max(20, 'الرقم طويل جدًا')
    .refine((v) => v === '' || /^[0-9+]{7,20}$/.test(v), 'رقم واتساب أرقام فقط، ويجوز أن يبدأ بـ+'),
  facebook: httpsUrl,
  youtube: httpsUrl,
  telegram: httpsUrl,
  instagram: httpsUrl,
})

export type BrandingValues = z.infer<typeof brandingSchema>

export type SettingsState =
  | { status: 'idle' }
  | { status: 'error'; message: string; fieldErrors?: Record<string, string> }
  | { status: 'success'; message: string }

const text = (fd: FormData, key: string) => String(fd.get(key) ?? '')

function invalid(issues: z.ZodIssue[]): SettingsState {
  const fieldErrors: Record<string, string> = {}
  for (const issue of issues) {
    const key = issue.path[0]
    if (typeof key === 'string' && !fieldErrors[key]) fieldErrors[key] = issue.message
  }
  return { status: 'error', message: 'راجع البيانات المدخلة.', fieldErrors }
}

export async function saveBranding(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const parsed = brandingSchema.safeParse({
    site_name: text(formData, 'site_name'),
    code_prefix: text(formData, 'code_prefix'),
    support_email: text(formData, 'support_email'),
    support_phone: text(formData, 'support_phone'),
    whatsapp: text(formData, 'whatsapp'),
    facebook: text(formData, 'facebook'),
    youtube: text(formData, 'youtube'),
    telegram: text(formData, 'telegram'),
    instagram: text(formData, 'instagram'),
  })

  if (!parsed.success) return invalid(parsed.error.issues)

  const ctx = await adminClient()
  if (!ctx) return { status: 'error', message: messageFor('FORBIDDEN') }

  // الشعار يُرفع بمساره الخاص، فلا تمسحه كتابةُ بقيّة الحقول
  const { data: current } = await ctx.supabase
    .from('platform_settings')
    .select('value')
    .eq('key', 'branding')
    .maybeSingle()

  const previous = (current?.value ?? {}) as Record<string, unknown>

  const { error } = await ctx.supabase.from('platform_settings').upsert(
    {
      key: 'branding',
      value: { ...previous, ...parsed.data },
      updated_by: ctx.userId,
    },
    { onConflict: 'key' },
  )

  if (error) return { status: 'error', message: messageFor(toErrorCode(error)) }

  revalidatePath('/admin/settings/platform')
  revalidatePath('/', 'layout')
  return { status: 'success', message: 'حُفظت إعدادات المنصة.' }
}

/* ===================== شعار المنصة ===================== */

const LOGO_TYPES = {
  'image/jpeg': { ext: 'jpg', magic: [0xff, 0xd8, 0xff] },
  'image/png': { ext: 'png', magic: [0x89, 0x50, 0x4e, 0x47] },
  'image/webp': { ext: 'webp', magic: [0x52, 0x49, 0x46, 0x46] },
} as const

type LogoMime = keyof typeof LOGO_TYPES

const LOGO_MAX_BYTES = 2 * 1024 * 1024

/** النوع من بصمة الملف لا من امتداده: اسمٌ منتحل لا يمرّ من هنا. */
async function sniffLogo(file: File): Promise<LogoMime | null> {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer())

  for (const [mime, spec] of Object.entries(LOGO_TYPES) as [
    LogoMime,
    { magic: readonly number[] },
  ][]) {
    if (!spec.magic.every((b, i) => head[i] === b)) continue
    if (mime === 'image/webp' && String.fromCharCode(...head.slice(8, 12)) !== 'WEBP') continue
    return mime
  }
  return null
}

type BrandImage = { field: 'logo' | 'teacher'; noun: string; saved: string; removed: string }

const LOGO: BrandImage = {
  field: 'logo',
  noun: 'الشعار',
  saved: 'حُفظ الشعار الجديد.',
  removed: 'حُذف الشعار. يظهر اسم المنصة نصًّا.',
}

const TEACHER: BrandImage = {
  field: 'teacher',
  noun: 'الصورة',
  saved: 'حُفظت صورة المدرّسة، وتظهر الآن في كامل المنصة.',
  removed: 'حُذفت الصورة. عادت الصورة الافتراضية.',
}

/** يخزّن `<field>_path` و`<field>_url` داخل صفّ branding، فكل صورة مستقلّة عن الأخرى. */
async function uploadBrandImage(kind: BrandImage, formData: FormData) {
  const file = formData.get(kind.field)
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: 'اختر صورة أولًا.' }
  }
  if (file.size > LOGO_MAX_BYTES) {
    return { ok: false, message: `حجم ${kind.noun} أكبر من ٢ ميجابايت.` }
  }

  const mime = await sniffLogo(file)
  if (!mime) {
    return { ok: false, message: 'الملف ليس صورة صالحة. المسموح: JPG أو PNG أو WebP.' }
  }

  const ctx = await adminClient()
  if (!ctx) return { ok: false, message: messageFor('FORBIDDEN') }

  const { data: current } = await ctx.supabase
    .from('platform_settings')
    .select('value')
    .eq('key', 'branding')
    .maybeSingle()

  const previous = (current?.value ?? {}) as Record<string, string>
  const oldPathValue = previous[`${kind.field}_path`]
  const oldPath = typeof oldPathValue === 'string' ? oldPathValue : null

  const path = `${kind.field}-${crypto.randomUUID()}.${LOGO_TYPES[mime].ext}`

  const { error: uploadError } = await ctx.supabase.storage
    .from('branding')
    .upload(path, file, { contentType: mime, upsert: false })

  if (uploadError) return { ok: false, message: `تعذّر رفع ${kind.noun}. أعد المحاولة.` }

  const {
    data: { publicUrl },
  } = ctx.supabase.storage.from('branding').getPublicUrl(path)

  const { error } = await ctx.supabase.from('platform_settings').upsert(
    {
      key: 'branding',
      value: { ...previous, [`${kind.field}_path`]: path, [`${kind.field}_url`]: publicUrl },
      updated_by: ctx.userId,
    },
    { onConflict: 'key' },
  )

  if (error) {
    // الحفظ فشل، فالملف المرفوع لا يشير إليه شيء — يُزال فورًا
    await ctx.supabase.storage.from('branding').remove([path])
    return { ok: false, message: messageFor(toErrorCode(error)) }
  }

  if (oldPath) await ctx.supabase.storage.from('branding').remove([oldPath])

  revalidatePath('/admin/settings/platform')
  revalidatePath('/', 'layout')
  return { ok: true, message: kind.saved }
}

async function removeBrandImage(kind: BrandImage) {
  const ctx = await adminClient()
  if (!ctx) return { ok: false, message: messageFor('FORBIDDEN') }

  const { data: current } = await ctx.supabase
    .from('platform_settings')
    .select('value')
    .eq('key', 'branding')
    .maybeSingle()

  const rest = { ...((current?.value ?? {}) as Record<string, string>) }
  const path = typeof rest[`${kind.field}_path`] === 'string' ? rest[`${kind.field}_path`] : null
  delete rest[`${kind.field}_path`]
  delete rest[`${kind.field}_url`]

  const { error } = await ctx.supabase
    .from('platform_settings')
    .upsert({ key: 'branding', value: rest, updated_by: ctx.userId }, { onConflict: 'key' })

  if (error) return { ok: false, message: messageFor(toErrorCode(error)) }

  if (path) await ctx.supabase.storage.from('branding').remove([path])

  revalidatePath('/admin/settings/platform')
  revalidatePath('/', 'layout')
  return { ok: true, message: kind.removed }
}

export async function uploadLogo(formData: FormData) {
  return uploadBrandImage(LOGO, formData)
}

export async function removeLogo() {
  return removeBrandImage(LOGO)
}

export async function uploadTeacherPhoto(formData: FormData) {
  return uploadBrandImage(TEACHER, formData)
}

export async function removeTeacherPhoto() {
  return removeBrandImage(TEACHER)
}

/* ===================== الصفحات الثابتة ===================== */

const pageSchema = z.object({
  slug: z.string().trim().min(1),
  title: z.string().trim().min(2, 'العنوان قصير جدًا').max(120, 'العنوان طويل جدًا'),
  content: z.string().max(20000, 'النص طويل جدًا'),
  isPublished: z.boolean(),
})

export async function saveStaticPage(input: {
  slug: string
  title: string
  content: string
  isPublished: boolean
}) {
  const parsed = pageSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'راجع البيانات المدخلة.' }
  }

  const v = parsed.data

  // النشر بلا نصّ يعطي الزائر صفحة فارغة — أسوأ من غياب الصفحة
  if (v.isPublished && v.content.trim().length < 20) {
    return { ok: false, message: 'اكتب محتوى الصفحة قبل نشرها.' }
  }

  const ctx = await adminClient()
  if (!ctx) return { ok: false, message: messageFor('FORBIDDEN') }

  const { error } = await ctx.supabase
    .from('static_pages')
    .update({
      title: v.title,
      content: v.content,
      is_published: v.isPublished,
      updated_by: ctx.userId,
    })
    .eq('slug', v.slug)

  if (error) return { ok: false, message: messageFor(toErrorCode(error)) }

  revalidatePath('/admin/settings/pages')
  revalidatePath(`/p/${v.slug}`)
  revalidatePath('/', 'layout')
  return { ok: true, message: v.isPublished ? 'حُفظت الصفحة ونُشرت.' : 'حُفظت الصفحة كمسودّة.' }
}

/* ===================== قوالب الإشعارات ===================== */

const templateSchema = z.object({
  key: z.string().trim().min(1),
  title: z.string().trim().min(3, 'العنوان قصير جدًا').max(120, 'العنوان طويل جدًا'),
  body: z.string().trim().max(500, 'النص طويل جدًا'),
})

export async function saveNotificationTemplate(input: {
  key: string
  title: string
  body: string
}) {
  const parsed = templateSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'راجع البيانات المدخلة.' }
  }

  const ctx = await adminClient()
  if (!ctx) return { ok: false, message: messageFor('FORBIDDEN') }

  const { data: tpl } = await ctx.supabase
    .from('notification_templates')
    .select('placeholders')
    .eq('key', parsed.data.key)
    .maybeSingle()

  if (!tpl) return { ok: false, message: 'لم نعثر على هذا القالب.' }

  /*
   * متغيّر غير معروف يبقى في النص كما هو ويصل الطالب حرفيًّا — نرفضه هنا
   * بدل أن يكتشفه من إشعار مشوّه.
   */
  const used = [...`${parsed.data.title} ${parsed.data.body}`.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map(
    (m) => m[1] as string,
  )
  const unknown = used.find((name) => !tpl.placeholders.includes(name))
  if (unknown) {
    return {
      ok: false,
      message: `المتغيّر {{${unknown}}} غير متاح في هذا القالب. المتاح: ${tpl.placeholders
        .map((p) => `{{${p}}}`)
        .join('، ')}`,
    }
  }

  const { error } = await ctx.supabase
    .from('notification_templates')
    .update({ title: parsed.data.title, body: parsed.data.body })
    .eq('key', parsed.data.key)

  if (error) return { ok: false, message: messageFor(toErrorCode(error)) }

  revalidatePath('/admin/settings/notifications')
  return { ok: true, message: 'حُفظ القالب.' }
}

/* ===================== صيانة التخزين ===================== */

/**
 * ملفات فيديو لا يشير إليها درس.
 * تنشأ حين ينقطع الرفع بين وصول الملف إلى التخزين وربطه بالدرس.
 */
export async function cleanupOrphanVideos(dryRun: boolean) {
  const orphanCount = (n: number) =>
    pluralAr(n, { one: 'ملف واحد', two: 'ملفان', few: 'ملفات', many: 'ملفًا' })

  const ctx = await adminClient()
  if (!ctx) return { ok: false, message: messageFor('FORBIDDEN') }

  const { data: rows } = await ctx.supabase
    .from('lesson_videos')
    .select('storage_path')
    .not('storage_path', 'is', null)

  const linked = new Set((rows ?? []).map((r) => r.storage_path as string))

  // التخزين مجلّد لكل درس، فالجرد يمرّ على المجلّدات ثم على ملفاتها
  const { data: folders, error: listError } = await ctx.supabase.storage
    .from('lesson-videos')
    .list('', { limit: 1000 })

  if (listError) return { ok: false, message: 'تعذّر قراءة مساحة الفيديو.' }

  const orphans: string[] = []
  for (const folder of folders ?? []) {
    const { data: files } = await ctx.supabase.storage
      .from('lesson-videos')
      .list(folder.name, { limit: 1000 })

    for (const file of files ?? []) {
      const path = `${folder.name}/${file.name}`
      if (!linked.has(path)) orphans.push(path)
    }
  }

  if (orphans.length === 0) {
    return { ok: true, message: 'لا ملفات معلّقة. المساحة نظيفة.' }
  }

  if (dryRun) {
    return {
      ok: true,
      message: `وُجد ${orphanCount(orphans.length)} لا يشير إليه درس. اضغط «احذف الملفات المعلّقة» لإزالته.`,
    }
  }

  const { error } = await ctx.supabase.storage.from('lesson-videos').remove(orphans)
  if (error) return { ok: false, message: 'تعذّر حذف بعض الملفات. أعد المحاولة.' }

  revalidatePath('/admin/settings/system')
  return { ok: true, message: `حُذف ${orphanCount(orphans.length)} معلّق.` }
}

/* ===================== وضع الصيانة ===================== */

/**
 * يُكتب داخل `branding` (انظر lib/maintenance) ويُدمج مع ما فيه، فلا يمسّ
 * الاسم والشعار. ومن غيّره يبقى في `updated_by`.
 */
export async function setMaintenance(formData: FormData): Promise<void> {
  const ctx = await adminClient()
  if (!ctx) return

  const enabled = formData.get('enabled') === 'on'
  const message = String(formData.get('message') ?? '').trim().slice(0, 500)

  const { data: current } = await ctx.supabase
    .from('platform_settings')
    .select('value')
    .eq('key', 'branding')
    .maybeSingle()

  const previous = (current?.value ?? {}) as Record<string, unknown>

  const { error } = await ctx.supabase.from('platform_settings').upsert(
    {
      key: 'branding',
      value: { ...previous, maintenance: { enabled, message } },
      updated_by: ctx.userId,
    },
    { onConflict: 'key' },
  )
  if (error) return

  clearMaintenanceCache()
  revalidatePath('/admin/settings/maintenance')
  revalidatePath('/maintenance')
}
