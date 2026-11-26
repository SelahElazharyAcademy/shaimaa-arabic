import type { NextConfig } from 'next'

const isDev = process.env.NODE_ENV === 'development'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Next 16 يرفض أي قيمة quality غير مُعلَنة هنا
    qualities: [75, 90, 95],
    remotePatterns: [
      // صور الكورسات والأفاتار تُخدَّم من تخزين Supabase فقط
      { protocol: 'https', hostname: 'bjhegvkxxtmajyzfampa.supabase.co', pathname: '/storage/v1/object/**' },
    ],
  },
  async headers() {
    const supabase = 'https://bjhegvkxxtmajyzfampa.supabase.co'
    const wsSupabase = 'wss://bjhegvkxxtmajyzfampa.supabase.co'
    // الرفع على أجزاء (TUS) يمضي إلى نطاق التخزين المباشر لا نطاق المشروع
    const supabaseStorage = 'https://bjhegvkxxtmajyzfampa.storage.supabase.co'

    /*
     * Bunny Stream: الرفع يذهب من المتصفّح إلى video.bunnycdn.com، وقوائم
     * HLS تُجلب من نطاق المكتبة. النطاق من البيئة كي لا يُثبَّت في الكود.
     */
    const bunnyCdn = process.env.BUNNY_STREAM_CDN_HOSTNAME?.trim()
    const bunny = [
      'https://video.bunnycdn.com',
      bunnyCdn ? `https://${bunnyCdn.replace(/^https?:\/\//, '').replace(/\/+$/, '')}` : '',
    ]
      .filter(Boolean)
      .join(' ')

    /*
     * سياسة أمان المحتوى.
     * 'unsafe-inline' في script-src ضرورة لا خيار: Next يحقن سكربت الترطيب
     * مضمَّنًا. و'unsafe-eval' في التطوير وحده (Turbopack يحتاجه).
     * media-src يسمح بأي https لأن روابط الفيديو تُدخلها الأستاذة بنفسها.
     */
    const csp = [
      "default-src 'self'",
      // سكربت يوتيوب وحده من خارج المنصة: واجهة المشغّل المُغلَّف (iframe_api)
      `script-src 'self' 'unsafe-inline' https://www.youtube.com${isDev ? " 'unsafe-eval'" : ''}`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      `img-src 'self' data: blob: ${supabase}`,
      "media-src 'self' blob: https:",
      // hls.js يفكّ الشفرة في عامل من blob
      "worker-src 'self' blob:",
      'frame-src https://www.youtube-nocookie.com https://player.vimeo.com',
      `connect-src 'self' ${supabase} ${supabaseStorage} ${wsSupabase} ${bunny}${isDev ? ' ws://localhost:*' : ''}`,
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      'upgrade-insecure-requests',
    ].join('; ')

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // HSTS في الإنتاج وحده: فرضه على localhost يمنع التطوير بـhttp
          ...(isDev
            ? []
            : [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=63072000; includeSubDomains; preload',
                },
              ]),
        ],
      },
    ]
  },
}

export default nextConfig
