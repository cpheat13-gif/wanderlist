-- Adds photo-credit columns alongside cover_photo_url so the app can attribute
-- destination photos pulled from the Unsplash API, as their API terms require.

alter table trips add column if not exists cover_photo_credit_name text;
alter table trips add column if not exists cover_photo_credit_url text;
