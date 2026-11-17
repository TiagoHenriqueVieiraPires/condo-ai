-- Migracao para encomendas.
create table packages (
  id uuid primary key
  default gen_random_uuid(),

  condominium_id uuid not null,

  unit_id uuid,

  description text not null,

  carrier text,

  status text
  default 'received',

  received_at timestamptz
  default now(),

  delivered_at timestamptz
);