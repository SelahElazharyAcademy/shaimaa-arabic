import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Sans_Arabic, Amiri } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex-arabic',
  display: 'swap',
})

/*
 * خطّ النسخ الكلاسيكي للعناوين وحدها.
 * منصة لغة عربية تُقرأ عناوينها بخطّ نسخي أقرب إلى كتب المادة نفسها،
 * والخطّ الهندسي المحايد يبقى للواجهة والنصوص الصغيرة حيث الوضوح أهمّ.
 */
const amiri = Amiri({
  subsets: ['arabic'],
  weight: ['400', '700'],
  variable: '--font-amiri',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'منصة نجاح',
    template: '%s · منصة نجاح',
  },
  description:
    'منصة تعليمية لمتابعة الدروس والاختبارات والحصص المباشرة، مع تتبّع تقدّمك أولًا بأول.',
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: '#23382D',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${plexArabic.variable} ${amiri.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        {children}
        <Toaster
          position="top-center"
          dir="rtl"
          richColors
          closeButton
          toastOptions={{ style: { fontFamily: 'var(--font-sans)' } }}
        />
      </body>
    </html>
  )
}
