-- Dados iniciais para desenvolvimento local.
insert into condominiums(
  name
)
values
(
  'Condo.AI Demo'
);

insert into buildings(
  condominium_id,
  name
)
select
  id,
  'Tower A'
from condominiums
limit 1;

insert into buildings(
  condominium_id,
  name
)
select
  id,
  'Tower B'
from condominiums
limit 1;