create index condominium_members_user_idx
  on public.condominium_members (user_id);
create index condominium_members_unit_idx
  on public.condominium_members (unit_id);

create or replace function public.add_condominium_member_by_email(
  target_condominium_id uuid,
  target_email text,
  target_role text,
  target_unit_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_user_id uuid;
  target_user_email text;
  target_full_name text;
  current_user_is_administrator boolean;
begin
  if current_user_id is null or not private.has_condominium_role(
    target_condominium_id,
    array['administrator', 'syndic']
  ) then
    raise exception 'Only condominium administrators can manage members';
  end if;

  if target_role is null
    or target_role not in ('administrator', 'syndic', 'council', 'porter', 'resident') then
    raise exception 'Invalid condominium role';
  end if;

  select private.has_condominium_role(
    target_condominium_id,
    array['administrator']
  )
  into current_user_is_administrator;

  if target_role = 'administrator' and not current_user_is_administrator then
    raise exception 'Only an administrator can appoint another administrator';
  end if;

  if target_role = 'resident' and target_unit_id is null then
    raise exception 'Residents must be assigned to a unit';
  end if;

  if target_unit_id is not null and not private.unit_belongs_to_condominium(
    target_unit_id,
    target_condominium_id
  ) then
    raise exception 'The selected unit does not belong to this condominium';
  end if;

  if length(btrim(coalesce(target_email, ''))) < 3 then
    raise exception 'Enter a valid email address';
  end if;

  select
    account.id,
    account.email,
    coalesce(
      account.raw_user_meta_data ->> 'full_name',
      split_part(account.email, '@', 1)
    )
  into target_user_id, target_user_email, target_full_name
  from auth.users as account
  where lower(account.email) = lower(btrim(target_email))
  limit 1;

  if target_user_id is null then
    raise exception 'The user must first create an account with this email';
  end if;

  if exists (
    select 1
    from public.condominium_members as member
    where member.condominium_id = target_condominium_id
      and member.user_id = target_user_id
  ) then
    raise exception 'This user is already linked to the condominium';
  end if;

  insert into public.user_profiles (id, email, full_name)
  values (target_user_id, target_user_email, target_full_name)
  on conflict (id) do update
    set email = excluded.email;

  insert into public.condominium_members (
    condominium_id,
    user_id,
    role,
    unit_id
  )
  values (
    target_condominium_id,
    target_user_id,
    target_role,
    target_unit_id
  );

  return target_user_id;
end;
$$;

revoke all on function public.add_condominium_member_by_email(uuid, text, text, uuid)
  from public, anon;
grant execute on function public.add_condominium_member_by_email(uuid, text, text, uuid)
  to authenticated;
