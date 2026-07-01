-- Wanderlist schema: shared 2-person household workspace gated by an
-- allowlist of emails, not per-user multi-tenant data.

create extension if not exists "pgcrypto";

create table if not exists allowed_users (
  email text primary key
);

create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  destination text,
  cover_photo_url text,
  tiktok_url text,
  status text not null default 'idea' check (status in ('idea', 'booked', 'past')),
  created_at timestamptz not null default now()
);

create table if not exists places (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  name text not null,
  category text not null check (category in ('hotel', 'restaurant', 'activity')),
  address text,
  lat double precision,
  lng double precision,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists flights (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  airline text,
  flight_number text,
  from_airport text not null,
  to_airport text not null,
  departure_time timestamptz,
  arrival_time timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

alter table allowed_users enable row level security;
alter table trips enable row level security;
alter table places enable row level security;
alter table flights enable row level security;

-- True if the currently authenticated user's email is on the allowlist.
create or replace function is_household_member()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from allowed_users
    where email = (auth.jwt() ->> 'email')
  );
$$;

create policy "household can read allowed_users"
  on allowed_users for select
  using (is_household_member());

create policy "household can read trips"
  on trips for select
  using (is_household_member());

create policy "household can insert trips"
  on trips for insert
  with check (is_household_member() and created_by = auth.uid());

create policy "household can update trips"
  on trips for update
  using (is_household_member());

create policy "household can delete trips"
  on trips for delete
  using (is_household_member());

create policy "household can read places"
  on places for select
  using (is_household_member());

create policy "household can insert places"
  on places for insert
  with check (is_household_member());

create policy "household can update places"
  on places for update
  using (is_household_member());

create policy "household can delete places"
  on places for delete
  using (is_household_member());

create policy "household can read flights"
  on flights for select
  using (is_household_member());

create policy "household can insert flights"
  on flights for insert
  with check (is_household_member());

create policy "household can update flights"
  on flights for update
  using (is_household_member());

create policy "household can delete flights"
  on flights for delete
  using (is_household_member());
