drop policy units_select_member on public.units;
drop policy units_manage on public.units;

create policy units_select_role_scope
  on public.units for select to authenticated
  using (
    private.has_condominium_role(
      condominium_id,
      array['administrator', 'syndic', 'council', 'porter']
    )
    or private.has_resident_unit(condominium_id, id)
  );

create policy units_insert_management
  on public.units for insert to authenticated
  with check (
    private.has_condominium_role(condominium_id, array['administrator', 'syndic'])
    and private.building_belongs_to_condominium(building_id, condominium_id)
  );

create policy units_update_management
  on public.units for update to authenticated
  using (
    private.has_condominium_role(condominium_id, array['administrator', 'syndic'])
  )
  with check (
    private.has_condominium_role(condominium_id, array['administrator', 'syndic'])
    and private.building_belongs_to_condominium(building_id, condominium_id)
  );

create policy units_delete_management
  on public.units for delete to authenticated
  using (
    private.has_condominium_role(condominium_id, array['administrator', 'syndic'])
  );
