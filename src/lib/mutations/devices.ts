'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { toErrorCode, messageFor } from '@/lib/errors'
import { formatNumber } from '@/lib/utils/format'

/**
 * يمسح أجهزة الطالب المسجّلة، فيدخل من أي جهازين من جديد.
 * الصلاحية تفرضها القاعدة (صفحة الطلاب)، والعملية تُسجَّل في سجل التدقيق.
 */
export async function resetStudentDevices(studentId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('reset_student_devices', { p_student: studentId })

  if (error) return { ok: false, message: messageFor(toErrorCode(error)) }

  revalidatePath('/admin/students')
  return {
    ok: true,
    message: data
      ? `تم مسح ${formatNumber(data)} من أجهزة الطالب. يستطيع الدخول من جهازين جديدين.`
      : 'لا توجد أجهزة مسجّلة لهذا الطالب.',
  }
}

/**
 * يحذف أي حساب نهائيًّا: طالبًا (لمدير بصلاحية الطلاب) أو مديرًا/دعمًا
 * (للمدير العام وحده). المدير العام وحساب المرء نفسه لا يُحذفان.
 * القواعد كلها في القاعدة (delete_account)، والعملية تُسجَّل في التدقيق.
 */
export async function deleteAccount(userId: string) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('delete_account', { p_user: userId })

  if (error) return { ok: false, message: messageFor(toErrorCode(error)) }

  revalidatePath('/admin/students')
  revalidatePath('/admin/settings/staff')
  return { ok: true, message: 'حُذف الحساب نهائيًّا.' }
}
