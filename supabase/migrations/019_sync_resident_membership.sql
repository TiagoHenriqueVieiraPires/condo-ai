create or replace function private.sync_resident_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_email text;
  profile_name text;
  existing_resident_id uuid;
begin
  if new.role <> 'resident' then
    return new;
  end if;

  select
    coalesce(profile.email, account.email),
    coalesce(
      profile.full_name,
      account.raw_user_meta_data ->> 'full_name',
      split_part(account.email, '@', 1)
    )
  into profile_email, profile_name
  from auth.users as account
  left join public.user_profiles as profile
    on profile.id = account.id
  where account.id = new.user_id;

  if profile_email is null then
    raise exception 'Resident account must have an email address';
  end if;

  select resident.id
  into existing_resident_id
  from public.residents as resident
  where resident.condominium_id = new.condominium_id
    and lower(resident.email) = lower(profile_email)
  order by resident.created_at
  limit 1;

  if existing_resident_id is null then
    insert into public.residents (
      condominium_id,
      unit_id,
      full_name,
      email,
      is_owner,
      status
    )
    values (
      new.condominium_id,
      new.unit_id,
      coalesce(profile_name, profile_email),
      profile_email,
      false,
      'active'
    );
  else
    update public.residents
    set unit_id = new.unit_id,
        full_name = coalesce(profile_name, full_name),
        status = coalesce(status, 'active')
    where id = existing_resident_id;
  end if;

  return new;
end;
$$;

revoke all on function private.sync_resident_membership()
  from public, anon, authenticated;

create trigger condominium_members_sync_resident
  after insert on public.condominium_members
  for each row execute function private.sync_resident_membership();
