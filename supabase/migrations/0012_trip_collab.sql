-- Social trip planning: share a trip with other Getaway Club users.
--
-- Moves core data from the global "everyone approved sees everything" allowlist
-- model to PER-TRIP membership:
--   • owner  = trips.created_by — the only one who edits the itinerary + trip info
--   • editor = can contribute (places, flights, tiktok links) but not the itinerary
--   • viewer = read only
-- People join by being added directly or via a share link. The allowed_users
-- allowlist still governs who may use the app at all (approval gate); this layer
-- governs which trips each user can see.

-- ---------- membership + invites ----------
create table if not exists trip_members (
  trip_id uuid not null references trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('editor', 'viewer')),
  added_by uuid,
  created_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);
create index if not exists trip_members_user_idx on trip_members (user_id);

create table if not exists trip_invites (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  code text not null unique,
  role text not null default 'viewer' check (role in ('editor', 'viewer')),
  created_by uuid,
  created_at timestamptz not null default now()
);

alter table trip_members enable row level security;
alter table trip_invites enable row level security;

-- ---------- access helpers (security definer avoids RLS recursion) ----------
create or replace function is_trip_owner(tid uuid)
returns boolean language sql security definer stable as $$
  select exists (select 1 from public.trips t where t.id = tid and t.created_by = auth.uid());
$$;

create or replace function is_trip_member(tid uuid)
returns boolean language sql security definer stable as $$
  select exists (select 1 from public.trips t where t.id = tid and t.created_by = auth.uid())
      or exists (select 1 from public.trip_members m where m.trip_id = tid and m.user_id = auth.uid());
$$;

create or replace function can_edit_trip(tid uuid)
returns boolean language sql security definer stable as $$
  select exists (select 1 from public.trips t where t.id = tid and t.created_by = auth.uid())
      or exists (select 1 from public.trip_members m where m.trip_id = tid and m.user_id = auth.uid() and m.role = 'editor');
$$;

-- ---------- trips: per-trip visibility, owner-only edits ----------
drop policy if exists "household can read trips" on trips;
drop policy if exists "household can insert trips" on trips;
drop policy if exists "household can update trips" on trips;
drop policy if exists "household can delete trips" on trips;

create policy "read trips i'm on" on trips for select using (is_trip_member(id));
create policy "approved create trips" on trips for insert with check (is_household_member() and created_by = auth.uid());
create policy "owner updates trip" on trips for update using (created_by = auth.uid());
create policy "owner deletes trip" on trips for delete using (created_by = auth.uid());

-- ---------- places: members read, editors write ----------
drop policy if exists "household can read places" on places;
drop policy if exists "household can insert places" on places;
drop policy if exists "household can update places" on places;
drop policy if exists "household can delete places" on places;

create policy "read places on my trips" on places for select using (is_trip_member(trip_id));
create policy "editors insert places" on places for insert with check (can_edit_trip(trip_id));
create policy "editors update places" on places for update using (can_edit_trip(trip_id));
create policy "editors delete places" on places for delete using (can_edit_trip(trip_id));

-- ---------- flights: members read, editors write ----------
drop policy if exists "household can read flights" on flights;
drop policy if exists "household can insert flights" on flights;
drop policy if exists "household can update flights" on flights;
drop policy if exists "household can delete flights" on flights;

create policy "read flights on my trips" on flights for select using (is_trip_member(trip_id));
create policy "editors insert flights" on flights for insert with check (can_edit_trip(trip_id));
create policy "editors update flights" on flights for update using (can_edit_trip(trip_id));
create policy "editors delete flights" on flights for delete using (can_edit_trip(trip_id));

-- ---------- itinerary_days: members read, OWNER-ONLY write ----------
drop policy if exists "household can read itinerary_days" on itinerary_days;
drop policy if exists "household can insert itinerary_days" on itinerary_days;
drop policy if exists "household can update itinerary_days" on itinerary_days;
drop policy if exists "household can delete itinerary_days" on itinerary_days;

create policy "read itinerary on my trips" on itinerary_days for select using (is_trip_member(trip_id));
create policy "owner inserts itinerary" on itinerary_days for insert with check (is_trip_owner(trip_id));
create policy "owner updates itinerary" on itinerary_days for update using (is_trip_owner(trip_id));
create policy "owner deletes itinerary" on itinerary_days for delete using (is_trip_owner(trip_id));

-- ---------- trip_members policies ----------
drop policy if exists "read members of my trips" on trip_members;
create policy "read members of my trips" on trip_members for select using (is_trip_member(trip_id));
drop policy if exists "owner adds members" on trip_members;
create policy "owner adds members" on trip_members for insert with check (is_trip_owner(trip_id));
drop policy if exists "owner updates member role" on trip_members;
create policy "owner updates member role" on trip_members for update using (is_trip_owner(trip_id));
drop policy if exists "owner or self removes member" on trip_members;
create policy "owner or self removes member" on trip_members for delete using (is_trip_owner(trip_id) or user_id = auth.uid());

-- ---------- trip_invites policies ----------
drop policy if exists "read invites for my trips" on trip_invites;
create policy "read invites for my trips" on trip_invites for select using (is_trip_member(trip_id));
drop policy if exists "owner creates invite" on trip_invites;
create policy "owner creates invite" on trip_invites for insert with check (is_trip_owner(trip_id));
drop policy if exists "owner deletes invite" on trip_invites;
create policy "owner deletes invite" on trip_invites for delete using (is_trip_owner(trip_id));

-- Redeeming a link: a non-member can't read the invite under RLS, so do it in a
-- security-definer function that validates the code and adds the caller.
create or replace function redeem_trip_invite(invite_code text)
returns uuid language plpgsql security definer as $$
declare
  inv record;
begin
  if auth.uid() is null then
    return null;
  end if;
  select * into inv from public.trip_invites where code = invite_code;
  if inv is null then
    return null;
  end if;
  -- Owners and existing members keep their standing; just return the trip.
  if not exists (select 1 from public.trips t where t.id = inv.trip_id and t.created_by = auth.uid()) then
    insert into public.trip_members (trip_id, user_id, role, added_by)
    values (inv.trip_id, auth.uid(), inv.role, inv.created_by)
    on conflict (trip_id, user_id) do nothing;
  end if;
  return inv.trip_id;
end;
$$;

-- Approved users can read the member directory (for the add-people picker).
drop policy if exists "approved read profiles" on profiles;
create policy "approved read profiles" on profiles for select using (is_household_member());

-- ---------- preserve existing access ----------
-- Everyone currently on the allowlist becomes an editor of every existing trip
-- they don't own, so today's shared trips don't vanish. New trips start private.
insert into trip_members (trip_id, user_id, role, added_by)
select t.id, u.id, 'editor', t.created_by
from trips t
join auth.users u on lower(u.email) in (select lower(email) from allowed_users)
where u.id <> t.created_by
on conflict (trip_id, user_id) do nothing;
