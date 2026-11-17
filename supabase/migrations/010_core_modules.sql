create table vehicles (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references condominiums(id) on delete cascade,
  resident_id uuid not null references residents(id) on delete cascade,
  plate text not null,
  model text,
  color text,
  created_at timestamptz not null default now(),
  constraint vehicles_plate_not_blank check (length(trim(plate)) > 0)
);

create unique index vehicles_condominium_plate_unique
  on vehicles (condominium_id, upper(plate));

create table common_areas (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references condominiums(id) on delete cascade,
  name text not null,
  description text,
  capacity integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint common_areas_capacity_positive check (capacity is null or capacity > 0)
);

create table reservations (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references condominiums(id) on delete cascade,
  area_id uuid not null references common_areas(id),
  resident_id uuid not null references residents(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  created_at timestamptz not null default now(),
  constraint reservations_valid_period check (starts_at < ends_at)
);

create table bills (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references condominiums(id) on delete cascade,
  unit_id uuid not null references units(id),
  competence date not null,
  amount numeric(12, 2) not null check (amount >= 0),
  due_date date not null,
  paid boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  constraint bills_unit_competence_unique unique (unit_id, competence)
);

create index vehicles_resident_id_idx on vehicles (resident_id);
create index common_areas_condominium_id_idx on common_areas (condominium_id);
create index reservations_condominium_period_idx
  on reservations (condominium_id, starts_at, ends_at);
create index reservations_resident_id_idx on reservations (resident_id);
create index bills_condominium_due_date_idx on bills (condominium_id, due_date);
create index bills_unit_id_idx on bills (unit_id);

alter table condominium_members
  add constraint condominium_members_role_check
  check (role in ('administrator', 'syndic', 'council', 'porter', 'resident'));

alter table condominium_members
  add constraint condominium_members_user_unique
  unique (condominium_id, user_id);

alter table condominium_members
  add column unit_id uuid references units(id);

alter table vehicles enable row level security;
alter table common_areas enable row level security;
alter table reservations enable row level security;
alter table bills enable row level security;
