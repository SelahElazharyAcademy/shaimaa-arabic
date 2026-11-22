import Script from 'next/script'
import { AppShell } from '@/components/layout/app-shell'
import { requireStudent } from '@/lib/permissions'
import { ContentGuard } from '@/components/student/content-guard'

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStudent()

  return (
    <AppShell user={user} area="student" areaLabel="منصة الطالب" pageTitle="الرئيسية">
      <ContentGuard />
      {/*
        كاشف أدوات المطوّر (public/guard.js) — ملف ساكن بلا شرح، لأنه يُقرأ علنًا،
        ولأن المُصغِّر يحذف كلمة debugger من الحزمة. آليّته:
          1. قبل أي توقّف: console.table لمصفوفة كبيرة أبطأ بعشرات المرّات من
             console.log متى كانت الأدوات مفتوحة. فيُكشف الفتح والصفحة تعمل،
             وتُزال إطارات الفيديو فورًا ويُطلق الحدث najah:devtools.
          2. ثم debugger كل ثانية: يجعل الأدوات نفسها غير صالحة للاستعمال،
             ويكشف ما فات الطريقة الأولى عند استئناف التنفيذ.
        لا يعتمد على مقاس النافذة: التكبير والأشرطة الجانبية يُخطئان فيه.
      */}
      <Script src="/guard.js" strategy="afterInteractive" />
      {children}
    </AppShell>
  )
}
