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

const refreshAccounts = () => {
  revalidatePath('/admin/students')
  revalidatePath('/admin/settings/staff')
  revalidatePath('/admin/settings/trash')
}

/**
 * «حذف» حساب = نقله إلى سلّة المحذوفات: يُقفل فورًا ويختفي من القوائم،
 * وتبقى بياناته ١٤ يومًا ثم يُحذف نهائيًّا تلقائيًّا.
 * الطالب لمدير بصلاحية الطلاب، والمدير/الدعم للمدير العام وحده؛ المدير
 * العام وحساب المرء نفسه لا يُمسّان. القواعد كلها في القاعدة.
 */
export async function deleteAccount(userId: string) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('delete_account', { p_user: userId })
  if (error) return { ok: false, message: messageFor(toErrorCode(error)) }
  refreshAccounts()
  return {
    ok: true,
    message: 'نُقل الحساب إلى سلّة المحذوفات. يُحذف نهائيًّا بعد ١٤ يومًا ما لم يُسترجع.',
  }
}

export async function restoreAccount(userId: string) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('restore_account', { p_user: userId })
  if (error) return { ok: false, message: messageFor(toErrorCode(error)) }
  refreshAccounts()
  return { ok: true, message: 'استُرجع الحساب كما كان، ويستطيع صاحبه الدخول.' }
}

export async function purgeAccount(userId: string) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('purge_account', { p_user: userId })
  if (error) return { ok: false, message: messageFor(toErrorCode(error)) }
  refreshAccounts()
  return { ok: true, message: 'حُذف الحساب نهائيًّا.' }
}
