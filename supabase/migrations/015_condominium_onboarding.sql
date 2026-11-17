create or replace function public.create_condominium_with_admin(
  target_condominium_name text,
  target_admin_name text,
  target_building_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_user_email text;
  new_condominium_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication is required to create a condominium';
  end if;

  if length(btrim(coalesce(target_condominium_name, ''))) < 2
    or length(btrim(target_condominium_name)) > 120 then
    raise exception 'Condominium name must contain between 2 and 120 characters';
  end if;

  if length(btrim(coalesce(target_admin_name, ''))) < 2
    or length(btrim(target_admin_name)) > 120 then
    raise exception 'Administrator name must contain between 2 and 120 characters';
  end if;

  if length(btrim(coalesce(target_building_name, ''))) < 1
    or length(btrim(target_building_name)) > 120 then
    raise exception 'Building name must contain between 1 and 120 characters';
  end if;

  select account.email
  into current_user_email
  from auth.users as account
  where account.id = current_user_id;

  if current_user_email is null then
    raise exception 'An email-authenticated account is required';
  end if;

  insert into public.user_profiles (id, email, full_name)
  values (
    current_user_id,
    current_user_email,
    btrim(target_admin_name)
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name;

  insert into public.condominiums (name)
  values (btrim(target_condominium_name))
  returning id into new_condominium_id;

  insert into public.condominium_members (
    condominium_id,
    user_id,
    role,
    unit_id
  )
  values (
    new_condominium_id,
    current_user_id,
    'administrator',
    null
  );

  insert into public.buildings (condominium_id, name)
  values (new_condominium_id, btrim(target_building_name));

  return new_condominium_id;
end;
$$;

revoke all on function public.create_condominium_with_admin(text, text, text)
  from public, anon;
grant execute on function public.create_condominium_with_admin(text, text, text)
  to authenticated;
