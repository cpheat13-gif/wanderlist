-- Add 'sightseeing' as a 4th places.category option.
-- The original check constraint in 0001_init.sql is inline/unnamed, so look up its
-- actual generated name defensively rather than assuming a literal name.
do $$
declare
  constraint_name text;
begin
  select con.conname into constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  where rel.relname = 'places'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%category%'
  limit 1;

  if constraint_name is not null then
    execute format('alter table places drop constraint %I', constraint_name);
  end if;

  alter table places
    add constraint places_category_check
    check (category in ('hotel', 'restaurant', 'activity', 'sightseeing'));
end $$;
