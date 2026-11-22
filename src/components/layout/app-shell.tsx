import Link from 'next/link'
import { SidebarNav, MobileNav, type NavArea } from '@/components/layout/sidebar-nav'
import { LogoutButton } from '@/components/auth/logout-button'
import { BrandMark } from '@/components/site/logo'
import type { SessionUser } from '@/lib/permissions'

// كل مُصدَّر من ملف 'use client' يصير مرجعًا للعميل، فلا يستطيع الخادم استدعاءه.
// لذلك تُحسب وجهة الشعار هنا محليًا بدل استيراد دالة من ملف التنقّل.
const AREA_HOME: Record<NavArea, string> = {
  student: '/student',
  admin: '/admin',
  support: '/support',
}

/** الحروف الأولى للأفاتار حين لا توجد صورة. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return parts
    .slice(0, 2)
    .map((p) => p[0] ?? '')
    .join('')
}

export function AppShell({
  user,
  area,
  areaLabel,
  pageTitle,
  children,
}: {
  user: SessionUser
  area: NavArea
  areaLabel: string
  pageTitle: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-dvh">
      {/* تخطٍّ إلى المحتوى: أول ما يصله التنقّل بلوحة المفاتيح */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded-[var(--radius-field)] focus:bg-brand-700 focus:px-4 focus:py-2 focus:text-base focus:text-ink-invert"
      >
        تخطٍّ إلى المحتوى
      </a>

      {/* الشريط الجانبي على يمين الشاشة: `start` هي اليمين في RTL لا `end` */}
      <aside className="fixed inset-y-3 start-3 hidden w-64 flex-col overflow-hidden rounded-[var(--radius-panel)] border border-border-subtle bg-surface shadow-[var(--shadow-card)] lg:flex">
        <div className="px-6 py-6">
          <Link href={AREA_HOME[area]} className="flex items-center gap-3">
            <BrandMark tone="onLight" className="h-11" />
            <span className="min-w-0">
              <span className="block text-base font-semibold leading-tight text-ink">
                منصة نجاح
              </span>
              <span className="mt-0.5 block text-sm text-accent-ink">اللغة العربية</span>
            </span>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto pb-4">
          <SidebarNav area={area} allowedPages={user.allowedPages} />
        </div>

        <div className="border-t border-border-subtle p-4">
          <div className="mb-3 flex items-center gap-2.5">
            <span
              className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700"
              aria-hidden
            >
              {initials(user.fullName)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-base font-medium text-ink">{user.fullName}</span>
              <span className="block truncate text-sm text-ink-faint" dir="ltr">
                {user.email}
              </span>
            </span>
          </div>
          <LogoutButton variant="secondary" />
        </div>
      </aside>

      {/* الشريط العلوي */}
      <header className="sticky top-0 z-30 border-b border-border-subtle bg-surface lg:ms-[17.5rem]">
        <div className="flex h-16 items-center justify-between gap-4 px-5 sm:px-8">
          <div className="min-w-0">
            <p className="text-sm text-ink-faint">{areaLabel}</p>
            <h2 className="truncate text-base font-semibold text-ink">{pageTitle}</h2>
          </div>

          <span
            className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 lg:hidden"
            aria-label={user.fullName}
          >
            {initials(user.fullName)}
          </span>
        </div>
      </header>

      <main id="main" className="px-5 pb-24 pt-6 sm:px-8 lg:ms-[17.5rem] lg:pb-12">
        <div className="mx-auto w-full max-w-4xl">{children}</div>
      </main>

      <MobileNav area={area} allowedPages={user.allowedPages} />
    </div>
  )
}
