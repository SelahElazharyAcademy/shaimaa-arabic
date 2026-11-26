-- حذف أي حساب من اللوحة (يحلّ محلّ delete_student_account).
--   • طالب: للمدير بصلاحية صفحة الطلاب.
--   • مدير أو دعم: للمدير العام وحده.
--   • المدير العام: لا يُحذف من اللوحة.
--   • لا يحذف أحدٌ حسابه هو.
-- يُسجَّل في التدقيق ببيانات الحساب وأكواده المفعّلة قبل الحذف؛ والأكواد
-- تبقى «مستخدمة» فلا يُعاد تفعيلها.
create or replace function public.delete_account(p_user uuid)
returns void
language plpgsql
security definer
set search_path to 'private', 'public', 'pg_temp'
as $$
declare
  v_target record;
  v_codes jsonb;
  v_caller_super boolean;
begin
  if p_user = auth.uid() then
    raise exception 'CANNOT_DELETE_SELF' using errcode = 'P0001';
  end if;

  select id, full_name, email, phone, role into v_target
  from public.profiles where id = p_user;
  if not found then
    raise exception 'ACCOUNT_NOT_FOUND' using errcode = 'P0001';
  end if;

  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'super_admin'
  ) into v_caller_super;

  if v_target.role = 'super_admin' then
    raise exception 'FORBIDDEN' using errcode = '42501';
  elsif v_target.role = 'student' then
    if not private.admin_can('students') then
      raise exception 'FORBIDDEN' using errcode = '42501';
    end if;
  elsif not v_caller_super then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('code_id', code_id, 'redeemed_at', redeemed_at)), '[]'::jsonb)
  into v_codes
  from public.activation_redemptions where student_id = p_user;

  perform private.log_audit('delete_account', 'profile', p_user, jsonb_build_object(
    'full_name', v_target.full_name,
    'email', v_target.email,
    'phone', v_target.phone,
    'role', v_target.role,
    'redeemed_codes', v_codes
  ));

  -- التفعيلات تمنع الحذف (ON DELETE RESTRICT)؛ سُجّلت أعلاه
  delete from public.activation_redemptions where student_id = p_user;
  -- حذف المستخدم يحذف الملف الشخصي وما يتبعه
  delete from auth.users where id = p_user;
end;
$$;

revoke all on function public.delete_account(uuid) from public, anon;
grant execute on function public.delete_account(uuid) to authenticated;

drop function if exists public.delete_student_account(uuid);
