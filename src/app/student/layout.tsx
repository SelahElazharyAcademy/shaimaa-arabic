import { AppShell } from '@/components/layout/app-shell'
import { requireStudent } from '@/lib/permissions'
import { ContentGuard } from '@/components/student/content-guard'

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStudent()

  return (
    <AppShell user={user} area="student" areaLabel="منصة الطالب" pageTitle="الرئيسية">
      <ContentGuard />
      {children}
    </AppShell>
  )
}
