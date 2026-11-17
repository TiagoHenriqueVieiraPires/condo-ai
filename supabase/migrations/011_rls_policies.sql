create or replace function public.has_condominium_role(
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

create or replace function public.has_resident_unit(
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

create or replace function public.is_resident_record(target_resident_id uuid)
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

create or replace function public.can_manage_user_profile(target_user_id uuid)
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
      and public.has_condominium_role(
        member.condominium_id,
        array['administrator', 'syndic']
      )
  );
$$;

create or replace function public.unit_belongs_to_condominium(
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

create or replace function public.building_belongs_to_condominium(
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

create or replace function public.resident_belongs_to_condominium(
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

create or replace function public.common_area_belongs_to_condominium(
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

revoke all on function public.has_condominium_role(uuid, text[]) from public;
revoke all on function public.has_resident_unit(uuid, uuid) from public;
revoke all on function public.is_resident_record(uuid) from public;
revoke all on function public.can_manage_user_profile(uuid) from public;
revoke all on function public.unit_belongs_to_condominium(uuid, uuid) from public;
revoke all on function public.building_belongs_to_condominium(uuid, uuid) from public;
revoke all on function public.resident_belongs_to_condominium(uuid, uuid) from public;
revoke all on function public.common_area_belongs_to_condominium(uuid, uuid) from public;

grant execute on function public.has_condominium_role(uuid, text[]) to authenticated;
grant execute on function public.has_resident_unit(uuid, uuid) to authenticated;
grant execute on function public.is_resident_record(uuid) to authenticated;
grant execute on function public.can_manage_user_profile(uuid) to authenticated;
grant execute on function public.unit_belongs_to_condominium(uuid, uuid) to authenticated;
grant execute on function public.building_belongs_to_condominium(uuid, uuid) to authenticated;
grant execute on function public.resident_belongs_to_condominium(uuid, uuid) to authenticated;
grant execute on function public.common_area_belongs_to_condominium(uuid, uuid) to authenticated;

alter table public.condominiums enable row level security;
alter table public.user_profiles enable row level security;
alter table public.condominium_members enable row level security;
alter table public.buildings enable row level security;
alter table public.units enable row level security;
alter table public.residents enable row level security;
alter table public.visitors enable row level security;
alter table public.packages enable row level security;
alter table public.maintenance_requests enable row level security;
alter table public.audit_logs enable row level security;
alter table public.vehicles enable row level security;
alter table public.common_areas enable row level security;
alter table public.reservations enable row level security;
alter table public.bills enable row level security;

alter table public.condominium_members
  add constraint condominium_members_resident_unit_required
  check (role <> 'resident' or unit_id is not null);

create policy condominiums_select_member
  on public.condominiums for select to authenticated
  using (public.has_condominium_role(
    id,
    array['administrator', 'syndic', 'council', 'porter', 'resident']
  ));

create policy condominiums_update_management
  on public.condominiums for update to authenticated
  using (public.has_condominium_role(id, array['administrator', 'syndic']))
  with check (public.has_condominium_role(id, array['administrator', 'syndic']));

create policy user_profiles_select_self_or_management
  on public.user_profiles for select to authenticated
  using (id = auth.uid() or public.can_manage_user_profile(id));

create policy user_profiles_insert_self
  on public.user_profiles for insert to authenticated
  with check (id = auth.uid());

create policy user_profiles_update_self
  on public.user_profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy condominium_members_select_self_or_management
  on public.condominium_members for select to authenticated
  using (
    user_id = auth.uid()
    or public.has_condominium_role(
      condominium_id,
      array['administrator', 'syndic']
    )
  );

create policy condominium_members_insert_management
  on public.condominium_members for insert to authenticated
  with check (
    (
      public.has_condominium_role(condominium_id, array['administrator'])
      or (
        role <> 'administrator'
        and public.has_condominium_role(condominium_id, array['syndic'])
      )
    )
    and (role <> 'resident' or unit_id is not null)
    and (
      unit_id is null
      or public.unit_belongs_to_condominium(unit_id, condominium_id)
    )
  );

create policy condominium_members_update_management
  on public.condominium_members for update to authenticated
  using (
    public.has_condominium_role(condominium_id, array['administrator'])
    or (
      role <> 'administrator'
      and public.has_condominium_role(condominium_id, array['syndic'])
    )
  )
  with check (
    (
      public.has_condominium_role(condominium_id, array['administrator'])
      or (
        role <> 'administrator'
        and public.has_condominium_role(condominium_id, array['syndic'])
      )
    )
    and (role <> 'resident' or unit_id is not null)
    and (
      unit_id is null
      or public.unit_belongs_to_condominium(unit_id, condominium_id)
    )
  );

create policy condominium_members_delete_management
  on public.condominium_members for delete to authenticated
  using (
    public.has_condominium_role(condominium_id, array['administrator'])
    or (
      role <> 'administrator'
      and public.has_condominium_role(condominium_id, array['syndic'])
    )
  );

create policy buildings_select_member
  on public.buildings for select to authenticated
  using (public.has_condominium_role(
    condominium_id,
    array['administrator', 'syndic', 'council', 'porter', 'resident']
  ));

create policy buildings_manage
  on public.buildings for all to authenticated
  using (public.has_condominium_role(condominium_id, array['administrator', 'syndic']))
  with check (public.has_condominium_role(condominium_id, array['administrator', 'syndic']));

create policy units_select_member
  on public.units for select to authenticated
  using (public.has_condominium_role(
    condominium_id,
    array['administrator', 'syndic', 'council', 'porter', 'resident']
  ));

create policy units_manage
  on public.units for all to authenticated
  using (public.has_condominium_role(condominium_id, array['administrator', 'syndic']))
  with check (
    public.has_condominium_role(condominium_id, array['administrator', 'syndic'])
    and public.building_belongs_to_condominium(building_id, condominium_id)
  );

create policy residents_select_management_or_own_unit
  on public.residents for select to authenticated
  using (
    public.has_condominium_role(condominium_id, array['administrator', 'syndic'])
    or public.has_resident_unit(condominium_id, unit_id)
  );

create policy residents_manage
  on public.residents for all to authenticated
  using (public.has_condominium_role(condominium_id, array['administrator', 'syndic']))
  with check (
    public.has_condominium_role(condominium_id, array['administrator', 'syndic'])
    and (
      unit_id is null
      or public.unit_belongs_to_condominium(unit_id, condominium_id)
    )
  );

create policy vehicles_select_management_or_own
  on public.vehicles for select to authenticated
  using (
    public.has_condominium_role(condominium_id, array['administrator', 'syndic', 'porter'])
    or public.is_resident_record(resident_id)
  );

create policy vehicles_manage
  on public.vehicles for all to authenticated
  using (public.has_condominium_role(condominium_id, array['administrator', 'syndic']))
  with check (
    public.has_condominium_role(condominium_id, array['administrator', 'syndic'])
    and public.resident_belongs_to_condominium(resident_id, condominium_id)
  );

create policy visitors_select_management_or_own_unit
  on public.visitors for select to authenticated
  using (
    public.has_condominium_role(condominium_id, array['administrator', 'syndic', 'porter'])
    or public.has_resident_unit(condominium_id, unit_id)
  );

create policy visitors_insert_management_or_resident
  on public.visitors for insert to authenticated
  with check (
    (
      public.has_condominium_role(condominium_id, array['administrator', 'syndic', 'porter'])
      or public.has_resident_unit(condominium_id, unit_id)
    )
    and (
      unit_id is null
      or public.unit_belongs_to_condominium(unit_id, condominium_id)
    )
  );

create policy visitors_update_management_or_porter
  on public.visitors for update to authenticated
  using (public.has_condominium_role(condominium_id, array['administrator', 'syndic', 'porter']))
  with check (
    public.has_condominium_role(condominium_id, array['administrator', 'syndic', 'porter'])
    and (
      unit_id is null
      or public.unit_belongs_to_condominium(unit_id, condominium_id)
    )
  );

create policy visitors_delete_management
  on public.visitors for delete to authenticated
  using (public.has_condominium_role(condominium_id, array['administrator', 'syndic']));

create policy packages_select_management_or_own_unit
  on public.packages for select to authenticated
  using (
    public.has_condominium_role(condominium_id, array['administrator', 'syndic', 'porter'])
    or public.has_resident_unit(condominium_id, unit_id)
  );

create policy packages_manage
  on public.packages for all to authenticated
  using (public.has_condominium_role(condominium_id, array['administrator', 'syndic', 'porter']))
  with check (
    public.has_condominium_role(condominium_id, array['administrator', 'syndic', 'porter'])
    and (
      unit_id is null
      or public.unit_belongs_to_condominium(unit_id, condominium_id)
    )
  );

create policy maintenance_select_management_or_own
  on public.maintenance_requests for select to authenticated
  using (
    public.has_condominium_role(condominium_id, array['administrator', 'syndic'])
    or public.is_resident_record(resident_id)
  );

create policy maintenance_insert_management_or_own
  on public.maintenance_requests for insert to authenticated
  with check (
    (
      public.has_condominium_role(condominium_id, array['administrator', 'syndic'])
      or public.is_resident_record(resident_id)
    )
    and (
      resident_id is null
      or public.resident_belongs_to_condominium(resident_id, condominium_id)
    )
  );

create policy maintenance_manage
  on public.maintenance_requests for all to authenticated
  using (public.has_condominium_role(condominium_id, array['administrator', 'syndic']))
  with check (
    public.has_condominium_role(condominium_id, array['administrator', 'syndic'])
    and (
      resident_id is null
      or public.resident_belongs_to_condominium(resident_id, condominium_id)
    )
  );

create policy audit_logs_select_management_and_council
  on public.audit_logs for select to authenticated
  using (
    public.has_condominium_role(condominium_id, array['administrator', 'syndic', 'council'])
  );

create policy common_areas_select_member
  on public.common_areas for select to authenticated
  using (public.has_condominium_role(
    condominium_id,
    array['administrator', 'syndic', 'council', 'porter', 'resident']
  ));

create policy common_areas_manage
  on public.common_areas for all to authenticated
  using (public.has_condominium_role(condominium_id, array['administrator', 'syndic']))
  with check (public.has_condominium_role(condominium_id, array['administrator', 'syndic']));

create policy reservations_select_member
  on public.reservations for select to authenticated
  using (public.has_condominium_role(
    condominium_id,
    array['administrator', 'syndic', 'council', 'porter', 'resident']
  ));

create policy reservations_insert_management_or_resident
  on public.reservations for insert to authenticated
  with check (
    (
      public.has_condominium_role(condominium_id, array['administrator', 'syndic'])
      or public.is_resident_record(resident_id)
    )
    and public.resident_belongs_to_condominium(resident_id, condominium_id)
    and public.common_area_belongs_to_condominium(area_id, condominium_id)
  );

create policy reservations_update_management
  on public.reservations for update to authenticated
  using (public.has_condominium_role(condominium_id, array['administrator', 'syndic']))
  with check (
    public.has_condominium_role(condominium_id, array['administrator', 'syndic'])
    and public.resident_belongs_to_condominium(resident_id, condominium_id)
    and public.common_area_belongs_to_condominium(area_id, condominium_id)
  );

create policy reservations_update_own_pending
  on public.reservations for update to authenticated
  using (public.is_resident_record(resident_id) and status = 'pending')
  with check (
    public.is_resident_record(resident_id)
    and status in ('pending', 'cancelled')
    and public.resident_belongs_to_condominium(resident_id, condominium_id)
    and public.common_area_belongs_to_condominium(area_id, condominium_id)
  );

create policy bills_select_management_council_or_own_unit
  on public.bills for select to authenticated
  using (
    public.has_condominium_role(condominium_id, array['administrator', 'syndic', 'council'])
    or public.has_resident_unit(condominium_id, unit_id)
  );

create policy bills_manage
  on public.bills for all to authenticated
  using (public.has_condominium_role(condominium_id, array['administrator', 'syndic']))
  with check (
    public.has_condominium_role(condominium_id, array['administrator', 'syndic'])
    and public.unit_belongs_to_condominium(unit_id, condominium_id)
  );
