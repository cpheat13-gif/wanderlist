-- Shareable, no-login destination polls for a friend group.
-- Voters open a public /vote/<code> link — no account needed. The unguessable
-- share code is the access control; RLS scopes anonymous access to poll tables.

create table if not exists polls (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null,
  title text not null,
  subtitle text,
  share_code text not null unique,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls(id) on delete cascade,
  trip_id uuid,
  label text not null,
  subtitle text,
  cover_photo_url text,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls(id) on delete cascade,
  option_id uuid not null references poll_options(id) on delete cascade,
  voter_name text not null,
  created_at timestamptz not null default now()
);

-- One vote per name per poll (case-insensitive).
create unique index if not exists poll_votes_unique_voter on poll_votes (poll_id, lower(voter_name));
create index if not exists poll_options_poll_idx on poll_options (poll_id, display_order);
create index if not exists poll_votes_poll_idx on poll_votes (poll_id);

alter table polls enable row level security;
alter table poll_options enable row level security;
alter table poll_votes enable row level security;

-- Anyone (including anonymous voters) can read a poll, its options, and its votes.
create policy "polls public read" on polls for select using (true);
create policy "poll_options public read" on poll_options for select using (true);
create policy "poll_votes public read" on poll_votes for select using (true);

-- Only the signed-in creator can create or modify a poll and its options.
create policy "polls insert own" on polls for insert with check (auth.uid() = created_by);
create policy "polls update own" on polls for update using (auth.uid() = created_by);
create policy "polls delete own" on polls for delete using (auth.uid() = created_by);

create policy "poll_options insert by owner" on poll_options for insert
  with check (exists (select 1 from polls p where p.id = poll_id and p.created_by = auth.uid()));
create policy "poll_options delete by owner" on poll_options for delete
  using (exists (select 1 from polls p where p.id = poll_id and p.created_by = auth.uid()));

-- Anyone with the link can vote (no login). Duplicate names blocked by the unique index.
create policy "poll_votes public insert" on poll_votes for insert with check (true);

-- Live results for everyone viewing.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'poll_votes'
  ) then
    execute 'alter publication supabase_realtime add table poll_votes';
  end if;
end $$;
