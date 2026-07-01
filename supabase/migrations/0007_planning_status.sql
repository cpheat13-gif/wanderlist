-- Add 'planning' as a valid trip status (between idea and booked in the lifecycle).
do $$
declare
  c text;
begin
  select conname into c
  from pg_constraint
  where conrelid = 'trips'::regclass
    and pg_get_constraintdef(oid) ilike '%status%'
  limit 1;
  if c is not null then
    execute format('alter table trips drop constraint %I', c);
  end if;
end $$;

alter table trips
  add constraint trips_status_check
  check (status in ('idea', 'planning', 'booked', 'past'));
