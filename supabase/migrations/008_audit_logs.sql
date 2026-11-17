-- Migracao para registros de auditoria.
create table audit_logs (
  id uuid primary key
  default gen_random_uuid(),

  condominium_id uuid,

  user_id uuid,

  entity text,

  entity_id uuid,

  action text,

  old_values jsonb,

  new_values jsonb,

  created_at timestamptz
  default now()
);