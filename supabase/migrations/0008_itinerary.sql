-- Trip planner: wizard params on trips + AI-built day-by-day itineraries.

alter table trips add column if not exists travelers int;
alter table trips add column if not exists season text;
alter table trips add column if not exists est_cost_per_person numeric;

create table if not exists itinerary_days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  day_number int not null,
  title text not null,
  summary text not null default '',
  activities jsonb not null default '[]'::jsonb,
  est_cost numeric,
  created_at timestamptz not null default now()
);

create index if not exists itinerary_days_trip_idx on itinerary_days (trip_id, day_number);

alter table itinerary_days enable row level security;

create policy "household can read itinerary_days" on itinerary_days
  for select using (is_household_member());
create policy "household can insert itinerary_days" on itinerary_days
  for insert with check (is_household_member());
create policy "household can update itinerary_days" on itinerary_days
  for update using (is_household_member());
create policy "household can delete itinerary_days" on itinerary_days
  for delete using (is_household_member());
