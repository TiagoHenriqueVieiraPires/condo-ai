-- Migracao para unidades.
create table units (
  id uuid primary key
  default gen_random_uuid(),

  condominium_id uuid not null,

  building_id uuid not null
  references buildings(id),

  unit_number text not null,

  floor integer,

  status text
  default 'occupied',

  created_at timestamptz
  default now()
);