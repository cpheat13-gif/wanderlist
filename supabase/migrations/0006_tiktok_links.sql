-- Per-trip collection of saved TikTok video links.
create table if not exists tiktok_links (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  url text not null,
  created_at timestamptz not null default now()
);

alter table tiktok_links enable row level security;

create policy "household can read tiktok_links"
  on tiktok_links for select
  using (is_household_member());

create policy "household can insert tiktok_links"
  on tiktok_links for insert
  with check (is_household_member());

create policy "household can delete tiktok_links"
  on tiktok_links for delete
  using (is_household_member());
