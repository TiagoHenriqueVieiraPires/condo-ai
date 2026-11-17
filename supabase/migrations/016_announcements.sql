create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  author_id uuid not null default auth.uid() references auth.users(id),
  title text not null check (length(btrim(title)) between 2 and 160),
  body text not null check (length(btrim(body)) between 2 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index announcements_condominium_created_idx
  on public.announcements (condominium_id, created_at desc);
create index announcements_author_idx
  on public.announcements (author_id);

alter table public.announcements enable row level security;

create policy announcements_select_members
  on public.announcements for select to authenticated
  using (
    private.has_condominium_role(
      condominium_id,
      array['administrator', 'syndic', 'council', 'porter', 'resident']
    )
  );

create policy announcements_insert_management
  on public.announcements for insert to authenticated
  with check (
    private.has_condominium_role(condominium_id, array['administrator', 'syndic'])
    and author_id = (select auth.uid())
  );

create policy announcements_update_management
  on public.announcements for update to authenticated
  using (
    private.has_condominium_role(condominium_id, array['administrator', 'syndic'])
  )
  with check (
    private.has_condominium_role(condominium_id, array['administrator', 'syndic'])
    and author_id = (select auth.uid())
  );

create policy announcements_delete_management
  on public.announcements for delete to authenticated
  using (
    private.has_condominium_role(condominium_id, array['administrator', 'syndic'])
  );
