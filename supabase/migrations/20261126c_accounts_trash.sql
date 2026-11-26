-- سلّة محذوفات الحسابات.
--
-- الحذف من اللوحة صار نقلًا إلى السلّة: يُقفل الحساب فورًا (موقوف، ومحظور
-- الدخول، وتُنهى جلساته وتُمسح أجهزته) ويختفي من كل القوائم، وتبقى
-- بياناته كما هي. من السلّة: استرجاع، أو حذف نهائي. وما يمضي عليه في
-- السلّة ١٤ يومًا يُحذف نهائيًّا بمهمة يومية (pg_cron).
--
-- الصلاحيات كما في delete_account: الطالب لمدير بصلاحية الطلاب، والمدير
-- والدعم للمدير العام وحده، والمدير العام وحساب المرء نفسه لا يُمسّان.

alter table public.profiles
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid,
  add column if not exists status_before_delete public.account_status;

create index if not exists profiles_deleted_at_idx
  on public.profiles (deleted_at) where deleted_at is not null;

-- أعمدة السلّة امتيازية كالدور والحالة: صاحب الحساب لا يُخرج نفسه منها
create or replace function private.guard_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_caller_role public.user_role;
begin
  if new.role is distinct from old.role
     or new.status is distinct from old.status
     or new.id is distinct from old.id
     or new.allowed_pages is distinct from old.allowed_pages
     or new.deleted_at is distinct from old.deleted_at
     or new.deleted_by is distinct from old.deleted_by
     or new.status_before_delete is distinct from old.status_before_delete
  then
    select p.role into v_caller_role from public.profiles p where p.id = auth.uid();

    -- auth.uid() فارغ يعني استدعاء من الخادم/الهجرات وليس من مستخدم
    if auth.uid() is not null and coalesce(v_caller_role, 'student') not in ('admin', 'super_admin') then
      raise exception 'FORBIDDEN: لا يمكن تعديل الدور أو حالة الحساب'
        using errcode = '42501';
    end if;

    -- المدير العادي لا يصنع مديرين
    if new.role in ('admin', 'super_admin')
       and old.role not in ('admin', 'super_admin')
       and coalesce(v_caller_role, 'student') <> 'super_admin'
       and auth.uid() is not null
    then
      raise exception 'FORBIDDEN: ترقية الأدوار الإدارية تحتاج super_admin'
        using errcode = '42501';
    end if;

    -- ولا يوسّع صلاحياته: قائمة الصفحات بيد المدير العام وحده
    if new.allowed_pages is distinct from old.allowed_pages
       and coalesce(v_caller_role, 'student') <> 'super_admin'
       and auth.uid() is not null
    then
      raise exception 'FORBIDDEN: تعديل صلاحيات الصفحات يحتاج super_admin'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$function$;

-- الإخفاء في القاعدة لا في الصفحات: كل قائمة تقرأ الحسابات (الطلاب،
-- المشرفون، الإحصائيات، الإشعارات، مين شاف…) لا ترى ما في السلّة.
-- صاحب الحساب وحده يرى ملفّه — موقوفًا، فيُحوَّل إلى صفحة الإيقاف.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or (
      deleted_at is null
      and (
        private.is_admin()
        or (private.is_support() and exists (
          select 1 from public.support_tickets t where t.student_id = profiles.id
        ))
      )
    )
  );

-- من يملك هذا الحساب؟ (يرفع FORBIDDEN أو CANNOT_DELETE_SELF)
create or replace function private.assert_can_manage_account(p_user uuid, p_role public.user_role)
returns void
language plpgsql
stable
security definer
set search_path to 'private', 'public', 'pg_temp'
as $$
begin
  if p_user = auth.uid() then
    raise exception 'CANNOT_DELETE_SELF' using errcode = 'P0001';
  end if;
  if p_role = 'super_admin' then
    raise exception 'FORBIDDEN' using errcode = '42501';
  elsif p_role = 'student' then
    if not private.admin_can('students') then
      raise exception 'FORBIDDEN' using errcode = '42501';
    end if;
  elsif not private.is_super_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
end;
$$;

-- الحذف النهائي نفسه (داخلي): تسجيل في التدقيق ثم حذف
create or replace function private.purge_account_now(p_user uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path to 'private', 'public', 'pg_temp'
as $$
declare
  v_target record;
  v_codes jsonb;
begin
  select id, full_name, email, phone, role into v_target from public.profiles where id = p_user;
  if not found then return; end if;

  select coalesce(jsonb_agg(jsonb_build_object('code_id', code_id, 'redeemed_at', redeemed_at)), '[]'::jsonb)
  into v_codes from public.activation_redemptions where student_id = p_user;

  perform private.log_audit('purge_account', 'profile', p_user, jsonb_build_object(
    'reason', p_reason,
    'full_name', v_target.full_name, 'email', v_target.email,
    'phone', v_target.phone, 'role', v_target.role,
    'redeemed_codes', v_codes
  ));

  -- التفعيلات تمنع الحذف (ON DELETE RESTRICT)؛ سُجّلت أعلاه، والأكواد تبقى مستخدمة
  delete from public.activation_redemptions where student_id = p_user;
  delete from auth.users where id = p_user;
end;
$$;

-- «حذف» من اللوحة = نقل إلى السلّة
create or replace function public.delete_account(p_user uuid)
returns void
language plpgsql
security definer
set search_path to 'private', 'public', 'pg_temp'
as $$
declare v_target record;
begin
  select id, full_name, email, role, status, deleted_at into v_target
  from public.profiles where id = p_user;
  if not found or v_target.deleted_at is not null then
    raise exception 'ACCOUNT_NOT_FOUND' using errcode = 'P0001';
  end if;

  perform private.assert_can_manage_account(p_user, v_target.role);

  update public.profiles
  set deleted_at = now(), deleted_by = auth.uid(),
      status_before_delete = v_target.status, status = 'suspended'
  where id = p_user;

  -- لا دخول جديد، ولا جلسة قائمة، ولا جهاز مسجّل
  update auth.users set banned_until = 'infinity' where id = p_user;
  delete from auth.sessions where user_id = p_user;
  delete from public.student_devices where user_id = p_user;

  perform private.log_audit('trash_account', 'profile', p_user, jsonb_build_object(
    'full_name', v_target.full_name, 'email', v_target.email, 'role', v_target.role
  ));
end;
$$;

create or replace function public.restore_account(p_user uuid)
returns void
language plpgsql
security definer
set search_path to 'private', 'public', 'pg_temp'
as $$
declare v_target record;
begin
  select id, full_name, email, role, deleted_at, status_before_delete into v_target
  from public.profiles where id = p_user;
  if not found or v_target.deleted_at is null then
    raise exception 'ACCOUNT_NOT_FOUND' using errcode = 'P0001';
  end if;

  perform private.assert_can_manage_account(p_user, v_target.role);

  update public.profiles
  set deleted_at = null, deleted_by = null,
      status = coalesce(v_target.status_before_delete, 'active'), status_before_delete = null
  where id = p_user;
  update auth.users set banned_until = null where id = p_user;

  perform private.log_audit('restore_account', 'profile', p_user, jsonb_build_object(
    'full_name', v_target.full_name, 'email', v_target.email, 'role', v_target.role
  ));
end;
$$;

-- حذف نهائي من السلّة قبل انقضاء المدّة
create or replace function public.purge_account(p_user uuid)
returns void
language plpgsql
security definer
set search_path to 'private', 'public', 'pg_temp'
as $$
declare v_target record;
begin
  select id, role, deleted_at into v_target from public.profiles where id = p_user;
  if not found or v_target.deleted_at is null then
    raise exception 'ACCOUNT_NOT_FOUND' using errcode = 'P0001';
  end if;
  perform private.assert_can_manage_account(p_user, v_target.role);
  perform private.purge_account_now(p_user, 'manual');
end;
$$;

-- محتوى السلّة للوحة (الحسابات فيه مخفيّة عن القراءة العادية)
create or replace function public.list_trashed_accounts()
returns table (
  id uuid, full_name text, email text, phone text, role public.user_role,
  deleted_at timestamptz, deleted_by_name text, purge_at timestamptz
)
language plpgsql
stable
security definer
set search_path to 'private', 'public', 'pg_temp'
as $$
#variable_conflict use_column
begin
  if not private.admin_can('students') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return query
    select p.id, p.full_name, p.email, p.phone, p.role, p.deleted_at,
           d.full_name, p.deleted_at + interval '14 days'
    from public.profiles p
    left join public.profiles d on d.id = p.deleted_by
    where p.deleted_at is not null
    order by p.deleted_at desc;
end;
$$;

-- المهمة اليومية: ما مضى عليه في السلّة ١٤ يومًا يُحذف نهائيًّا
create or replace function private.purge_expired_accounts()
returns integer
language plpgsql
security definer
set search_path to 'private', 'public', 'pg_temp'
as $$
declare r record; n int := 0;
begin
  for r in
    select id from public.profiles where deleted_at < now() - interval '14 days'
  loop
    perform private.purge_account_now(r.id, 'expired');
    n := n + 1;
  end loop;
  return n;
end;
$$;

revoke all on function private.purge_expired_accounts() from public, anon, authenticated;
revoke all on function private.purge_account_now(uuid, text) from public, anon, authenticated;
revoke all on function private.assert_can_manage_account(uuid, public.user_role) from public, anon;

revoke all on function public.delete_account(uuid) from public, anon;
revoke all on function public.restore_account(uuid) from public, anon;
revoke all on function public.purge_account(uuid) from public, anon;
revoke all on function public.list_trashed_accounts() from public, anon;
grant execute on function public.delete_account(uuid) to authenticated;
grant execute on function public.restore_account(uuid) to authenticated;
grant execute on function public.purge_account(uuid) to authenticated;
grant execute on function public.list_trashed_accounts() to authenticated;

create extension if not exists pg_cron;
select cron.schedule(
  'purge-trashed-accounts',
  '0 1 * * *',  -- يوميًّا ٣ فجرًا بتوقيت القاهرة
  $$select private.purge_expired_accounts()$$
);
