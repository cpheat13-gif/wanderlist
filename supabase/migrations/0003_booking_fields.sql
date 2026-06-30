alter table places add column if not exists is_booked boolean not null default false;
alter table places add column if not exists confirmation_number text;
alter table places add column if not exists scheduled_at timestamptz;

alter table flights add column if not exists is_booked boolean not null default false;
alter table flights add column if not exists confirmation_number text;
