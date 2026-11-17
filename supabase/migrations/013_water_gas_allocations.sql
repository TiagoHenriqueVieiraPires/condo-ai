create unique index units_id_condominium_unique
  on public.units (id, condominium_id);

create table public.utility_charges (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  utility_type text not null check (utility_type in ('water', 'gas')),
  competence date not null check (extract(day from competence) = 1),
  total_amount numeric(12, 2) not null check (total_amount >= 0),
  allocation_method text not null check (allocation_method in ('equal_units', 'metered')),
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  published_at timestamptz,
  constraint utility_charges_publication_state_check
    check (
      (status = 'draft' and published_at is null)
      or (status = 'published' and published_at is not null)
    ),
  constraint utility_charges_competence_unique
    unique (condominium_id, utility_type, competence),
  constraint utility_charges_id_condominium_unique
    unique (id, condominium_id)
);

create table public.utility_charge_items (
  id uuid primary key default gen_random_uuid(),
  utility_charge_id uuid not null,
  condominium_id uuid not null,
  unit_id uuid not null,
  consumption numeric(12, 3) check (consumption is null or consumption >= 0),
  amount numeric(12, 2) not null check (amount >= 0),
  paid boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  constraint utility_charge_items_paid_state_check
    check ((paid and paid_at is not null) or (not paid and paid_at is null)),
  constraint utility_charge_items_charge_unit_unique
    unique (utility_charge_id, unit_id),
  constraint utility_charge_items_charge_condominium_fkey
    foreign key (utility_charge_id, condominium_id)
    references public.utility_charges(id, condominium_id),
  constraint utility_charge_items_unit_condominium_fkey
    foreign key (unit_id, condominium_id)
    references public.units(id, condominium_id)
);

create index utility_charges_condominium_competence_idx
  on public.utility_charges (condominium_id, competence desc);
create index utility_charge_items_unit_paid_idx
  on public.utility_charge_items (condominium_id, unit_id, paid);

create or replace function private.has_utility_charge_unit_access(target_charge_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.utility_charge_items as item
    join public.condominium_members as member
      on member.condominium_id = item.condominium_id
      and member.unit_id = item.unit_id
    where item.utility_charge_id = target_charge_id
      and member.user_id = auth.uid()
      and member.role = 'resident'
  );
$$;

revoke all on function private.has_utility_charge_unit_access(uuid)
  from public, anon, authenticated;
grant execute on function private.has_utility_charge_unit_access(uuid)
  to authenticated;

create or replace function private.guard_utility_charge()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  item_count integer;
  occupied_unit_count integer;
  invalid_unit_count integer;
  missing_consumption_count integer;
  reported_amount numeric(14, 2);
  total_consumption numeric(14, 3);
begin
  if tg_op = 'DELETE' then
    if old.status <> 'draft' then
      raise exception 'Published utility charges cannot be deleted';
    end if;
    return old;
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'draft' or new.published_at is not null then
      raise exception 'Utility charges must start as drafts';
    end if;
    return new;
  end if;

  if old.status = 'published' then
    raise exception 'Published utility charges cannot be changed';
  end if;

  if new.status = 'draft' then
    return new;
  end if;

  select
    count(*),
    coalesce(sum(item.amount), 0),
    count(*) filter (where item.consumption is null),
    coalesce(sum(item.consumption), 0),
    count(*) filter (where unit.status <> 'occupied')
  into
    item_count,
    reported_amount,
    missing_consumption_count,
    total_consumption,
    invalid_unit_count
  from public.utility_charge_items as item
  join public.units as unit
    on unit.id = item.unit_id
    and unit.condominium_id = item.condominium_id
  where item.utility_charge_id = new.id;

  select count(*)
  into occupied_unit_count
  from public.units as unit
  where unit.condominium_id = new.condominium_id
    and unit.status = 'occupied';

  if item_count = 0 or item_count <> occupied_unit_count or invalid_unit_count > 0 then
    raise exception 'A published utility charge must include every occupied unit exactly once';
  end if;

  if reported_amount <> new.total_amount then
    raise exception 'Allocated shares must equal the utility charge total';
  end if;

  if new.allocation_method = 'metered' then
    if missing_consumption_count > 0 then
      raise exception 'Metered allocations require consumption for every unit';
    end if;
    if new.total_amount > 0 and total_consumption <= 0 then
      raise exception 'Metered allocations require positive total consumption';
    end if;
  elsif exists (
    select 1
    from public.utility_charge_items as item
    where item.utility_charge_id = new.id
      and item.consumption is not null
  ) then
    raise exception 'Equal allocations must not include meter consumption';
  end if;

  new.published_at := now();
  return new;
end;
$$;

create or replace function private.guard_utility_charge_item()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  charge_status text;
  charge_method text;
begin
  if tg_op = 'DELETE' then
    select charge.status
    into charge_status
    from public.utility_charges as charge
    where charge.id = old.utility_charge_id;

    if charge_status is distinct from 'draft' then
      raise exception 'Shares can only be deleted from draft utility charges';
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' and new.utility_charge_id is distinct from old.utility_charge_id then
    raise exception 'A share cannot be moved to another utility charge';
  end if;

  select charge.status, charge.allocation_method
  into charge_status, charge_method
  from public.utility_charges as charge
  where charge.id = new.utility_charge_id;

  if charge_status is null then
    raise exception 'Utility charge not found';
  end if;

  if charge_status = 'published' then
    if tg_op = 'INSERT'
      or new.condominium_id is distinct from old.condominium_id
      or new.unit_id is distinct from old.unit_id
      or new.consumption is distinct from old.consumption
      or new.amount is distinct from old.amount
      or new.created_at is distinct from old.created_at then
      raise exception 'Published utility shares cannot be changed';
    end if;
    return new;
  end if;

  if charge_method = 'metered' and new.consumption is null then
    raise exception 'Metered allocations require consumption for every unit';
  end if;

  if charge_method = 'equal_units' and new.consumption is not null then
    raise exception 'Equal allocations must not include meter consumption';
  end if;

  return new;
end;
$$;

revoke all on function private.guard_utility_charge() from public, anon, authenticated;
revoke all on function private.guard_utility_charge_item() from public, anon, authenticated;

create trigger utility_charges_guard
  before insert or update or delete on public.utility_charges
  for each row execute function private.guard_utility_charge();

create trigger utility_charge_items_guard
  before insert or update or delete on public.utility_charge_items
  for each row execute function private.guard_utility_charge_item();

alter table public.utility_charges enable row level security;
alter table public.utility_charge_items enable row level security;

create policy utility_charges_select_management_or_own
  on public.utility_charges for select to authenticated
  using (
    private.has_condominium_role(
      condominium_id,
      array['administrator', 'syndic', 'council']
    )
    or (
      status = 'published'
      and private.has_utility_charge_unit_access(id)
    )
  );

create policy utility_charges_manage
  on public.utility_charges for all to authenticated
  using (
    private.has_condominium_role(condominium_id, array['administrator', 'syndic'])
  )
  with check (
    private.has_condominium_role(condominium_id, array['administrator', 'syndic'])
    and created_by = auth.uid()
  );

create policy utility_charge_items_select_management_or_own
  on public.utility_charge_items for select to authenticated
  using (
    private.has_condominium_role(
      condominium_id,
      array['administrator', 'syndic', 'council']
    )
    or private.has_resident_unit(condominium_id, unit_id)
  );

create policy utility_charge_items_insert_draft
  on public.utility_charge_items for insert to authenticated
  with check (
    private.has_condominium_role(condominium_id, array['administrator', 'syndic'])
    and exists (
      select 1
      from public.utility_charges as charge
      where charge.id = utility_charge_id
        and charge.condominium_id = utility_charge_items.condominium_id
        and charge.status = 'draft'
    )
  );

create policy utility_charge_items_update_management
  on public.utility_charge_items for update to authenticated
  using (
    private.has_condominium_role(condominium_id, array['administrator', 'syndic'])
  )
  with check (
    private.has_condominium_role(condominium_id, array['administrator', 'syndic'])
  );

create policy utility_charge_items_delete_draft
  on public.utility_charge_items for delete to authenticated
  using (
    private.has_condominium_role(condominium_id, array['administrator', 'syndic'])
    and exists (
      select 1
      from public.utility_charges as charge
      where charge.id = utility_charge_id
        and charge.status = 'draft'
    )
  );

create or replace function public.create_utility_charge_with_shares(
  target_condominium_id uuid,
  target_utility_type text,
  target_competence date,
  target_total_amount numeric,
  target_allocation_method text,
  target_items jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_charge_id uuid;
begin
  if not private.has_condominium_role(
    target_condominium_id,
    array['administrator', 'syndic']
  ) then
    raise exception 'Only condominium administrators can create utility allocations';
  end if;

  if jsonb_typeof(target_items) is distinct from 'array' then
    raise exception 'Utility share items must be a JSON array';
  end if;

  insert into public.utility_charges (
    condominium_id,
    utility_type,
    competence,
    total_amount,
    allocation_method
  )
  values (
    target_condominium_id,
    target_utility_type,
    target_competence,
    target_total_amount,
    target_allocation_method
  )
  returning id into new_charge_id;

  insert into public.utility_charge_items (
    utility_charge_id,
    condominium_id,
    unit_id,
    consumption,
    amount
  )
  select
    new_charge_id,
    target_condominium_id,
    item.unit_id,
    item.consumption,
    item.amount
  from jsonb_to_recordset(target_items) as item(
    unit_id uuid,
    consumption numeric,
    amount numeric
  );

  update public.utility_charges
  set status = 'published'
  where id = new_charge_id;

  return new_charge_id;
end;
$$;

revoke all on function public.create_utility_charge_with_shares(
  uuid, text, date, numeric, text, jsonb
) from public, anon;
grant execute on function public.create_utility_charge_with_shares(
  uuid, text, date, numeric, text, jsonb
) to authenticated;
