/** يستخرج معرّف الفيديو من أي صيغة رابط يوتيوب، أو null لغير يوتيوب. */
export function youTubeId(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^(www|m)\./, '')
    if (host === 'youtu.be') return u.pathname.slice(1).split('/')[0] || null
    if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
      const v = u.searchParams.get('v')
      if (v) return v
      const m = u.pathname.match(/^\/(embed|shorts|live)\/([\w-]{6,})/)
      return m?.[2] ?? null
    }
    return null
  } catch {
    return null
  }
}
