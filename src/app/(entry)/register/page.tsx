import type { Metadata } from 'next'
import Link from 'next/link'
import { RegisterForm } from '@/components/auth/register-form'
import { getRegistrationReference } from '@/lib/queries/reference'

export const metadata: Metadata = {
  title: 'إنشاء حساب',
  description: 'أنشئ حسابك لمتابعة دروس اللغة العربية واختباراتها.',
}

export default async function RegisterPage() {
  const reference = await getRegistrationReference()

  return (
    <div>
      <h1 className="font-display text-[2.125rem] font-bold leading-[1.4] text-ink">إنشاء حساب طالب</h1>
      <p className="mt-1.5 text-base text-ink-muted">
        أكمل بياناتك، ويصبح حسابك جاهزًا في دقيقة.
      </p>

      <div className="mt-6">
        <RegisterForm reference={reference} />
      </div>

      <p className="mt-6 text-center text-base text-ink-muted">
        لديك حساب بالفعل؟{' '}
        <Link href="/login" className="font-medium text-brand-600 underline-offset-4 hover:underline">
          سجّل الدخول
        </Link>
      </p>
    </div>
  )
}
