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
