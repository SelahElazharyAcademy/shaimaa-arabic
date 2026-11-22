import { createHash } from 'node:crypto'

/**
 * Bunny Stream.
 *
 * مفتاح المكتبة سرّ خادم لا يصل المتصفّح أبدًا. الرفع من المتصفّح مباشرةً
 * إلى Bunny عبر TUS بتوقيع قصير العمر نُصدره هنا: الملف لا يمرّ بخادمنا
 * (Server Action لها حدّ حجم)، والمفتاح لا يغادر الخادم.
 *
 * التشغيل يمرّ بمسارنا كذلك: نوقّع رابط HLS بعد التحقّق من اشتراك الطالب،
 * فلا يُشارَك الرابط ولا يُقرأ من مصدر الصفحة.
 */

export type BunnyConfig = {
  libraryId: string
  apiKey: string
  cdnHostname: string
  /** مفتاح توثيق الروابط من إعدادات المكتبة — بدونه تُشغَّل بلا توقيع */
  tokenKey: string | null
}

/** الإعداد ناقص ⇒ الميزة مطفأة، وتختفي من الواجهة بدل أن تفشل عند الضغط. */
export function bunnyConfig(): BunnyConfig | null {
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID?.trim()
  const apiKey = process.env.BUNNY_STREAM_API_KEY?.trim()
  const cdnHostname = process.env.BUNNY_STREAM_CDN_HOSTNAME?.trim()

  if (!libraryId || !apiKey || !cdnHostname) return null

  return {
    libraryId,
    apiKey,
    cdnHostname: cdnHostname.replace(/^https?:\/\//, '').replace(/\/+$/, ''),
    tokenKey: process.env.BUNNY_STREAM_TOKEN_KEY?.trim() || null,
  }
}

export const isBunnyEnabled = (): boolean => bunnyConfig() !== null

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex')

/** ينشئ سجلّ فيديو فارغًا في المكتبة ويعيد معرّفه. */
export async function createBunnyVideo(
  cfg: BunnyConfig,
  title: string,
): Promise<{ ok: true; videoId: string } | { ok: false; message: string }> {
  const res = await fetch(`https://video.bunnycdn.com/library/${cfg.libraryId}/videos`, {
    method: 'POST',
    headers: {
      AccessKey: cfg.apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ title: title.slice(0, 200) }),
    cache: 'no-store',
  })

  if (!res.ok) {
    return { ok: false, message: `تعذّر إنشاء الفيديو في Bunny (${res.status}).` }
  }

  const data = (await res.json()) as { guid?: string }
  if (!data.guid) return { ok: false, message: 'ردّ Bunny بلا معرّف فيديو.' }

  return { ok: true, videoId: data.guid }
}

export async function deleteBunnyVideo(cfg: BunnyConfig, videoId: string): Promise<boolean> {
  const res = await fetch(
    `https://video.bunnycdn.com/library/${cfg.libraryId}/videos/${videoId}`,
    { method: 'DELETE', headers: { AccessKey: cfg.apiKey }, cache: 'no-store' },
  )
  return res.ok
}

/**
 * توقيع رفع TUS.
 * الصيغة التي يتوقّعها Bunny: sha256(libraryId + apiKey + expire + videoId).
 */
export function bunnyUploadSignature(
  cfg: BunnyConfig,
  videoId: string,
  ttlSeconds = 60 * 60 * 3,
): { signature: string; expire: number; libraryId: string } {
  const expire = Math.floor(Date.now() / 1000) + ttlSeconds
  return {
    signature: sha256(`${cfg.libraryId}${cfg.apiKey}${expire}${videoId}`),
    expire,
    libraryId: cfg.libraryId,
  }
}

/**
 * رابط تشغيل HLS.
 * مع مفتاح التوثيق يُوقَّع بصلاحية محدودة؛ وبدونه يعود الرابط العاري
 * (يظلّ محميًّا بمسارنا الذي لا يُصدره إلا لمشترك).
 */
export function bunnyPlaybackUrl(cfg: BunnyConfig, videoId: string, ttlSeconds = 60 * 60 * 2) {
  const path = `/${videoId}/playlist.m3u8`
  const base = `https://${cfg.cdnHostname}${path}`

  if (!cfg.tokenKey) return base

  /*
   * توقيع مجلّد كامل، في المسار لا في الاستعلام.
   *
   * قائمة HLS تشير إلى ملفات المقاطع بمسارات نسبية، والمتصفّح لا ينقل
   * معاملات الاستعلام (?token=) إلى تلك المسارات — فكان التوقيع القديم
   * يفتح القائمة ثم تُرفض المقاطع متى فُعّل التوثيق في المكتبة.
   * صيغة Bunny للمسار: /bcdn_token=…&expires=…&token_path=…/المسار
   * تجعل الرمز جزءًا من المسار، فتورثه المقاطع النسبية تلقائيًّا.
   *
   * القاعدة: sha256(tokenKey + tokenPath + expires + "token_path=" + tokenPath)
   * بترميز base64url.
   */
  const tokenPath = `/${videoId}/`
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds
  const token = createHash('sha256')
    .update(`${cfg.tokenKey}${tokenPath}${expires}token_path=${tokenPath}`)
    .digest('base64')
    .replace(/\n/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

  return `https://${cfg.cdnHostname}/bcdn_token=${token}&expires=${expires}&token_path=${encodeURIComponent(tokenPath)}${path}`
}
