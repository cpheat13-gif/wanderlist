-- Friend profiles show a friend's dreams (wishlist) + the trips they've done.
-- Past trips become club-readable (memories worth sharing); planning/booked
-- trips stay per-trip private. Trip *contents* (places, itinerary, flights)
-- remain member-only — only the trip card row is exposed here.
drop policy if exists "club reads past trips" on trips;
create policy "club reads past trips" on trips for select
  using (status = 'past' and is_household_member());
