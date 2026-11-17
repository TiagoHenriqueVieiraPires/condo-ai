-- Migracao para manutencao.
create table maintenance_requests (
  id uuid primary key
  default gen_random_uuid(),

  condominium_id uuid not null,

  resident_id uuid
  references residents(id),

  title text not null,

  description text not null,

  category text,

  priority text
  default 'medium',

  status text
  default 'open',

  created_at timestamptz
  default now()
);