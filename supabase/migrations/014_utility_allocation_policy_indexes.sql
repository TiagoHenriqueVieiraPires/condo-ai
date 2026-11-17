drop policy utility_charges_manage on public.utility_charges;

create policy utility_charges_insert_management
  on public.utility_charges for insert to authenticated
  with check (
    private.has_condominium_role(condominium_id, array['administrator', 'syndic'])
    and created_by = (select auth.uid())
  );

create policy utility_charges_update_management
  on public.utility_charges for update to authenticated
  using (
    private.has_condominium_role(condominium_id, array['administrator', 'syndic'])
  )
  with check (
    private.has_condominium_role(condominium_id, array['administrator', 'syndic'])
    and created_by = (select auth.uid())
  );

create policy utility_charges_delete_management
  on public.utility_charges for delete to authenticated
  using (
    private.has_condominium_role(condominium_id, array['administrator', 'syndic'])
  );

create index utility_charge_items_charge_condominium_idx
  on public.utility_charge_items (utility_charge_id, condominium_id);
create index utility_charge_items_unit_condominium_idx
  on public.utility_charge_items (unit_id, condominium_id);
create index utility_charges_created_by_idx
  on public.utility_charges (created_by);
