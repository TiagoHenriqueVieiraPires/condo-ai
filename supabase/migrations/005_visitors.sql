-- Migracao para visitantes.
create table visitors (
  id uuid primary key
  default gen_random_uuid(),

  condominium_id uuid not null,

  unit_id uuid,

  full_name text not null,

  document_number text,

  vehicle_plate text,

  status text
  default 'expected',

  checked_in_at timestamptz,

  checked_out_at timestamptz,

  created_at timestamptz
  default now()
);