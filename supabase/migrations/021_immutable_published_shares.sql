create or replace function private.guard_utility_charge_item()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  charge_status text;
  charge_method text;
begin
  if tg_op = 'DELETE' then
    select charge.status
    into charge_status
    from public.utility_charges as charge
    where charge.id = old.utility_charge_id;

    if charge_status is distinct from 'draft' then
      raise exception 'Shares can only be deleted from draft utility charges';
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' then
    if new.utility_charge_id is distinct from old.utility_charge_id then
      raise exception 'A share cannot be moved to another utility charge';
    end if;

    select charge.status, charge.allocation_method
    into charge_status, charge_method
    from public.utility_charges as charge
    where charge.id = new.utility_charge_id;

    if charge_status is null then
      raise exception 'Utility charge not found';
    end if;

    if charge_status = 'published' then
      if new.id is distinct from old.id
        or new.condominium_id is distinct from old.condominium_id
        or new.unit_id is distinct from old.unit_id
        or new.consumption is distinct from old.consumption
        or new.amount is distinct from old.amount
        or new.created_at is distinct from old.created_at then
        raise exception 'Published utility shares cannot be changed';
      end if;
      return new;
    end if;
  else
    select charge.status, charge.allocation_method
    into charge_status, charge_method
    from public.utility_charges as charge
    where charge.id = new.utility_charge_id;

    if charge_status is distinct from 'draft' then
      raise exception 'Shares can only be added to draft utility charges';
    end if;
  end if;

  if charge_method = 'metered' and new.consumption is null then
    raise exception 'Metered allocations require consumption for every unit';
  end if;

  if charge_method = 'equal_units' and new.consumption is not null then
    raise exception 'Equal allocations must not include meter consumption';
  end if;

  return new;
end;
$$;
