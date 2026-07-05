-- Trip memories: photos + captions that turn a past trip into a shareable album.

-- ── Storage bucket for memory photos (public read; paths are unguessable) ──
insert into storage.buckets (id, name, public)
values ('memories', 'memories', true)
on conflict (id) do nothing;

drop policy if exists "memories storage read" on storage.objects;
create policy "memories storage read" on storage.objects
  for select using (bucket_id = 'memories');

drop policy if exists "memories storage insert" on storage.objects;
create policy "memories storage insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'memories');

drop policy if exists "memories storage delete" on storage.objects;
create policy "memories storage delete" on storage.objects
  for delete to authenticated using (bucket_id = 'memories' and owner = auth.uid());

-- ── Album text on the trip itself ──
alter table trips add column if not exists recap text;      -- one-line vibe under the title
alter table trips add column if not exists keepsake text;   -- the "a memory to keep" quote

-- ── Memories ──
create table if not exists memories (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  created_by uuid not null,
  photo_path text not null,
  caption text,
  note text,
  is_favourite boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists memories_trip_idx on memories (trip_id, created_at);

alter table memories enable row level security;

-- Trip members can read; a past trip's memories are club-visible (for the feed).
drop policy if exists "memories read" on memories;
create policy "memories read" on memories for select using (
  is_trip_member(trip_id)
  or exists (select 1 from trips t where t.id = trip_id and t.status = 'past' and is_household_member())
);

-- Anyone on the trip can add a memory; you manage your own (or the owner does).
drop policy if exists "memories insert" on memories;
create policy "memories insert" on memories for insert
  with check (is_trip_member(trip_id) and created_by = auth.uid());

drop policy if exists "memories update" on memories;
create policy "memories update" on memories for update
  using (created_by = auth.uid() or is_trip_owner(trip_id));

drop policy if exists "memories delete" on memories;
create policy "memories delete" on memories for delete
  using (created_by = auth.uid() or is_trip_owner(trip_id));
