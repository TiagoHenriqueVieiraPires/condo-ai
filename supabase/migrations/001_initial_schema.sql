-- Estrutura inicial do banco de dados.
create extension if not exists pgcrypto;

create table condominiums (
  id uuid primary key
  default gen_random_uuid(),

  name text not null,

  created_at timestamptz
  default now()
);
create table user_profiles (
  id uuid primary key
  references auth.users(id),

  email text not null,

  full_name text,

  avatar_url text,

  created_at timestamptz
  default now()
);
