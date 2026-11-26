-- حذف حساب طالب (للحسابات المكرّرة). للمدير بصلاحية صفحة الطلاب وحده،
-- وعلى حسابات الطلاب وحدها. يُسجَّل في التدقيق ببيانات الحساب والأكواد
-- التي فعّلها قبل حذفها؛ والأكواد نفسها تبقى «مستخدمة» فلا يُعاد تفعيلها.
create or replace function public.delete_student_account(p_student uuid)
returns void
language plpgsql
security definer
set search_path to 'private', 'public', 'pg_temp'
as $$
declare
  v_profile record;
  v_codes jsonb;
begin
  if not private.admin_can('students') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select id, full_name, email, phone into v_profile
  from public.profiles where id = p_student and role = 'student';
  if not found then
    raise exception 'STUDENT_NOT_FOUND' using errcode = 'P0001';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('code_id', code_id, 'redeemed_at', redeemed_at)), '[]'::jsonb)
  into v_codes
  from public.activation_redemptions where student_id = p_student;

  perform private.log_audit('delete_student', 'profile', p_student, jsonb_build_object(
    'full_name', v_profile.full_name,
    'email', v_profile.email,
    'phone', v_profile.phone,
    'redeemed_codes', v_codes
  ));

  -- التفعيلات تمنع الحذف (ON DELETE RESTRICT)؛ سُجّلت أعلاه
  delete from public.activation_redemptions where student_id = p_student;
  -- حذف المستخدم يحذف الملف الشخصي وما يتبعه (اشتراكات، تقدّم، أجهزة…)
  delete from auth.users where id = p_student;
end;
$$;

revoke all on function public.delete_student_account(uuid) from public, anon;
grant execute on function public.delete_student_account(uuid) to authenticated;
