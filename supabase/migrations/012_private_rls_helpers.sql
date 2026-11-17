create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.has_condominium_role(
  target_condominium_id uuid,
  allowed_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.condominium_members as member
    where member.condominium_id = target_condominium_id
      and member.user_id = auth.uid()
      and member.role = any (allowed_roles)
  );
$$;

create or replace function private.has_resident_unit(
  target_condominium_id uuid,
  target_unit_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.condominium_members as member
    where member.condominium_id = target_condominium_id
      and member.unit_id = target_unit_id
      and member.user_id = auth.uid()
      and member.role = 'resident'
  );
$$;

create or replace function private.is_resident_record(target_resident_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.residents as resident
    join public.condominium_members as member
      on member.condominium_id = resident.condominium_id
      and member.unit_id = resident.unit_id
    where resident.id = target_resident_id
      and member.user_id = auth.uid()
      and member.role = 'resident'
  );
$$;

create or replace function private.can_manage_user_profile(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.condominium_members as member
    where member.user_id = target_user_id
      and private.has_condominium_role(
        member.condominium_id,
        array['administrator', 'syndic']
      )
  );
$$;

create or replace function private.unit_belongs_to_condominium(
  target_unit_id uuid,
  target_condominium_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.units as unit
    where unit.id = target_unit_id
      and unit.condominium_id = target_condominium_id
  );
$$;

create or replace function private.building_belongs_to_condominium(
  target_building_id uuid,
  target_condominium_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.buildings as building
    where building.id = target_building_id
      and building.condominium_id = target_condominium_id
  );
$$;

create or replace function private.resident_belongs_to_condominium(
  target_resident_id uuid,
  target_condominium_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.residents as resident
    where resident.id = target_resident_id
      and resident.condominium_id = target_condominium_id
  );
$$;

create or replace function private.common_area_belongs_to_condominium(
  target_area_id uuid,
  target_condominium_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.common_areas as area
    where area.id = target_area_id
      and area.condominium_id = target_condominium_id
  );
$$;

revoke all on function private.has_condominium_role(uuid, text[]) from public, anon, authenticated;
revoke all on function private.has_resident_unit(uuid, uuid) from public, anon, authenticated;
revoke all on function private.is_resident_record(uuid) from public, anon, authenticated;
revoke all on function private.can_manage_user_profile(uuid) from public, anon, authenticated;
revoke all on function private.unit_belongs_to_condominium(uuid, uuid) from public, anon, authenticated;
revoke all on function private.building_belongs_to_condominium(uuid, uuid) from public, anon, authenticated;
revoke all on function private.resident_belongs_to_condominium(uuid, uuid) from public, anon, authenticated;
revoke all on function private.common_area_belongs_to_condominium(uuid, uuid) from public, anon, authenticated;

grant execute on function private.has_condominium_role(uuid, text[]) to authenticated;
grant execute on function private.has_resident_unit(uuid, uuid) to authenticated;
grant execute on function private.is_resident_record(uuid) to authenticated;
grant execute on function private.can_manage_user_profile(uuid) to authenticated;
grant execute on function private.unit_belongs_to_condominium(uuid, uuid) to authenticated;
grant execute on function private.building_belongs_to_condominium(uuid, uuid) to authenticated;
grant execute on function private.resident_belongs_to_condominium(uuid, uuid) to authenticated;
grant execute on function private.common_area_belongs_to_condominium(uuid, uuid) to authenticated;

do $$
declare
  current_policy record;
  policy_roles text;
  using_expression text;
  check_expression text;
  create_statement text;
  helper_name text;
begin
  for current_policy in
    select schemaname, tablename, policyname, permissive, cmd, roles, qual, with_check
    from pg_policies
    where schemaname = 'public'
  loop
    select string_agg(quote_ident(role_name), ', ')
      into policy_roles
    from unnest(current_policy.roles) as role_names(role_name);

    using_expression := current_policy.qual;
    check_expression := current_policy.with_check;

    foreach helper_name in array array[
      'has_condominium_role',
      'has_resident_unit',
      'is_resident_record',
      'can_manage_user_profile',
      'unit_belongs_to_condominium',
      'building_belongs_to_condominium',
      'resident_belongs_to_condominium',
      'common_area_belongs_to_condominium'
    ]
    loop
      if using_expression is not null then
        using_expression := replace(
          using_expression,
          'public.' || helper_name || '(',
          'private.' || helper_name || '('
        );
        using_expression := regexp_replace(
          using_expression,
          '(^|[^.])' || helper_name || '\(',
          '\1private.' || helper_name || '(',
          'g'
        );
      end if;

      if check_expression is not null then
        check_expression := replace(
          check_expression,
          'public.' || helper_name || '(',
          'private.' || helper_name || '('
        );
        check_expression := regexp_replace(
          check_expression,
          '(^|[^.])' || helper_name || '\(',
          '\1private.' || helper_name || '(',
          'g'
        );
      end if;
    end loop;

    execute format(
      'drop policy %I on %I.%I',
      current_policy.policyname,
      current_policy.schemaname,
      current_policy.tablename
    );

    create_statement := format(
      'create policy %I on %I.%I as %s for %s to %s',
      current_policy.policyname,
      current_policy.schemaname,
      current_policy.tablename,
      lower(current_policy.permissive),
      current_policy.cmd,
      policy_roles
    );

    if using_expression is not null then
      create_statement := create_statement || format(' using (%s)', using_expression);
    end if;

    if check_expression is not null then
      create_statement := create_statement || format(' with check (%s)', check_expression);
    end if;

    execute create_statement;
  end loop;
end;
$$;

drop function public.can_manage_user_profile(uuid);
drop function public.has_condominium_role(uuid, text[]);
drop function public.has_resident_unit(uuid, uuid);
drop function public.is_resident_record(uuid);
drop function public.unit_belongs_to_condominium(uuid, uuid);
drop function public.building_belongs_to_condominium(uuid, uuid);
drop function public.resident_belongs_to_condominium(uuid, uuid);
drop function public.common_area_belongs_to_condominium(uuid, uuid);
