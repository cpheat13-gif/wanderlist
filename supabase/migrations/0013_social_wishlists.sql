-- Wishlists are social. Any approved club member can see other members'
-- wishlist (idea-status) trips — planned / booked / past trips stay per-trip
-- private (governed by the trip_members policies from 0012). Moving a wishlist
-- item into planning flips it to 'planning' and it becomes private again.
drop policy if exists "club reads wishlists" on trips;
create policy "club reads wishlists" on trips for select
  using (status = 'idea' and is_household_member());
