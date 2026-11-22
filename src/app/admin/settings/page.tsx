import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Palette,
  FileText,
  Bell,
  ShieldCheck,
  ScrollText,
  Database,
  ArrowLeft,
  Wrench,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { requireAdminPage } from '@/lib/permissions'
import { PageHeader } from '@/components/ui/page-header'

export const metadata: Metadata = { title: 'الإعدادات' }

/**
 * الإعدادات صفحة تجميع لا صفحة نماذج.
 * كل قسم في شاشته: الصفحة الواحدة الطويلة كانت تخفي أقسامها
 * وتجعل حفظ إعداد واحد يمرّ بجوار إعدادات لا علاقة له بها.
 */
const SECTIONS: {
  href: string
  title: string
  description: string
  icon: LucideIcon
}[] = [
  {
    href: '/admin/settings/platform',
    title: 'إعدادات المنصة',
    description: 'الاسم، الشعار، بادئة الأكواد، بيانات التواصل، والروابط الاجتماعية.',
    icon: Palette,
  },
  {
    href: '/admin/settings/pages',
    title: 'الصفحات الثابتة',
    description: 'الأسئلة الشائعة، شروط الاستخدام، سياسة الخصوصية، واتصل بنا.',
    icon: FileText,
  },
  {
    href: '/admin/settings/notifications',
    title: 'قوالب الإشعارات',
    description: 'تخصيص نصوص الإشعارات التي ترسلها المنصة تلقائيًا.',
    icon: Bell,
  },
  {
    href: '/admin/settings/staff',
    title: 'المشرفون والصلاحيات',
    description: 'إضافة المشرفين وتغيير أدوارهم وكلمات مرورهم.',
    icon: ShieldCheck,
  },
  {
    href: '/admin/settings/audit',
    title: 'سجلّ التدقيق',
    description: 'تتبّع الإجراءات الإدارية الحسّاسة ومن نفّذها ومتى.',
    icon: ScrollText,
  },
  {
    href: '/admin/settings/maintenance',
    title: 'وضع الصيانة',
    description: 'إغلاق المنصة مؤقتًا على الطلاب برسالة، والإدارة تعمل كالمعتاد.',
    icon: Wrench,
  },
  {
    href: '/admin/settings/system',
    title: 'النظام والنسخ الاحتياطي',
    description: 'البريد، مساحة الفيديو، وإرشادات النسخ الاحتياطي.',
    icon: Database,
  },
]

export default async function AdminSettingsPage() {
  await requireAdminPage('settings')

  return (
    <div className="space-y-6">
      <PageHeader title="الإعدادات" description="تحكّم كامل في إعدادات المنصة ومحتواها." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map(({ href, title, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col rounded-[var(--radius-card)] border border-border-subtle bg-surface p-5 shadow-[var(--shadow-card)] transition-colors hover:border-brand-300 hover:bg-brand-50/40"
          >
            <span className="mb-4 grid size-10 place-items-center rounded-[var(--radius-field)] bg-surface-muted text-ink-muted transition-colors group-hover:bg-brand-100 group-hover:text-brand-700">
              <Icon className="size-[1.125rem]" aria-hidden />
            </span>

            <span className="flex items-center gap-1.5 text-base font-semibold text-ink">
              {title}
              <ArrowLeft
                className="size-4 text-ink-faint transition-transform group-hover:-translate-x-0.5"
                aria-hidden
              />
            </span>

            <span className="mt-1.5 text-base leading-relaxed text-ink-muted">{description}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
