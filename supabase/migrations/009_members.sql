-- Migracao para membros e acessos.
create table condominium_members (
  id uuid primary key
  default gen_random_uuid(),

  condominium_id uuid not null
  references condominiums(id),

  user_id uuid not null
  references auth.users(id),

  role text not null,

  created_at timestamptz
  default now()
);