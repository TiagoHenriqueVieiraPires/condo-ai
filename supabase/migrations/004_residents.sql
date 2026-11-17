-- Migracao para moradores.
create table residents (
  id uuid primary key
  default gen_random_uuid(),

  condominium_id uuid not null,

  unit_id uuid
  references units(id),

  full_name text not null,

  email text,

  phone text,

  document_number text,

  is_owner boolean
  default false,

  status text
  default 'active',

  created_at timestamptz
  default now()
);