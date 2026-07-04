-- Snapshot of each poll option's trip detail (estimated cost, flight time,
-- a photo gallery, and the day-by-day itinerary) captured at poll-creation time.
--
-- Anonymous voters can't read the household-gated trips/itinerary_days tables, so
-- we denormalize a public, read-only copy onto the poll option. The existing
-- "poll_options public read" policy already exposes this column to voters.
alter table poll_options add column if not exists detail jsonb;
