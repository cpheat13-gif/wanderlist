-- Manual approval gate for new signups.
--
-- Access is already gated by the allowed_users allowlist + is_household_member().
-- This migration lets an admin SEE who has signed up (via a profiles table kept
-- in sync by a trigger) and APPROVE them by adding their email to allowed_users,
-- all from inside the app. Existing allowlisted members are bootstrapped as
-- admins so you don't lock yourself out.

-- One row per auth user, so an admin has a list to approve from.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- True if the current user is an admin. security definer so it can read profiles
-- regardless of the row-level policies below (avoids a recursive check).
create or replace function is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin
  );
$$;

-- A user can read their own profile; an admin can read everyone's (the approval list).
create policy "profiles read own or admin"
  on profiles for select
  using (id = auth.uid() or is_admin());

-- Keep profiles in sync with auth.users. security definer so the insert bypasses RLS.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Backfill anyone who already signed up before this migration.
insert into profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;

-- Bootstrap: everyone already on the allowlist becomes an admin, so the existing
-- household can approve newcomers immediately.
update profiles p
set is_admin = true
where lower(p.email) in (select lower(email) from allowed_users);

-- Only admins may add or remove people from the allowlist (i.e. approve / revoke).
create policy "admin can approve into allowed_users"
  on allowed_users for insert
  with check (is_admin());

create policy "admin can revoke from allowed_users"
  on allowed_users for delete
  using (is_admin());
