-- Migracao para edificios/condominios.
create table buildings (
  id uuid primary key
  default gen_random_uuid(),

  condominium_id uuid not null
  references condominiums(id),

  name text not null,

  description text,

  created_at timestamptz
  default now()
);