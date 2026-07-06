insert into public.users (id, name, role, initials, hue, hidden)
values
  ('u_admin', 'Helena Pires', 'MASTER_ADMIN', 'HP', 256, false),
  ('u_care_1', 'Bruno Silva', 'CARETAKER', 'BS', 200, false),
  ('u_clean_1', 'Melba Costa', 'CLEANER', 'MC', 320, false),
  ('u_resident_portal', 'Portal do morador', 'RESIDENT', 'MR', 38, true)
on conflict (id) do update
set
  name = excluded.name,
  role = excluded.role,
  initials = excluded.initials,
  hue = excluded.hue,
  hidden = excluded.hidden;

with block_definitions (id, name, description, floors, per_floor) as (
  values
    ('falcon', 'Falcon', 'South wing · 6 floors', 6, 4),
    ('martlett', 'Martlett', 'Courtyard · 5 floors', 5, 4),
    ('merlin', 'Merlin', 'East tower · 8 floors', 8, 3),
    ('oak', 'Oak', 'Garden block · 4 floors', 4, 4),
    ('northwood', 'Northwood', 'North wing · 6 floors', 6, 4)
)
insert into public.blocks (id, name, description)
select id, name, description
from block_definitions
on conflict (id) do update
set
  name = excluded.name,
  description = excluded.description;

with block_definitions (id, name, description, floors, per_floor) as (
  values
    ('falcon', 'Falcon', 'South wing · 6 floors', 6, 4),
    ('martlett', 'Martlett', 'Courtyard · 5 floors', 5, 4),
    ('merlin', 'Merlin', 'East tower · 8 floors', 8, 3),
    ('oak', 'Oak', 'Garden block · 4 floors', 4, 4),
    ('northwood', 'Northwood', 'North wing · 6 floors', 6, 4)
),
generated_flats as (
  select
    b.id as block_id,
    concat(floor_no::text, lpad(unit_no::text, 2, '0')) as label
  from block_definitions b
  cross join lateral generate_series(1, b.floors) as floor_no
  cross join lateral generate_series(1, b.per_floor) as unit_no
)
insert into public.flats (id, block_id, label)
select
  concat(block_id, '-', label) as id,
  block_id,
  label
from generated_flats
on conflict (id) do update
set
  block_id = excluded.block_id,
  label = excluded.label;
