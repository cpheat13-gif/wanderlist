import { supabase } from './supabase';
import { fetchDestinationPhotos } from './unsplash';
import { estimateFlight } from './ai';
import { ItineraryDayRow, PollOptionDetail, PollOptionDay, Trip } from './types';

// Builds the public snapshot shown to anonymous voters when they dig into an
// option: estimated cost, flight time (if an origin is given), a photo gallery,
// and the day-by-day itinerary. Runs at poll-creation time while the creator
// (who can read the household tables) is signed in. Every enrichment degrades
// gracefully — a missing itinerary, gallery, or flight estimate just omits that
// part rather than failing the whole poll.
export async function buildOptionDetail(
  trip: Trip,
  originAirport?: string | null
): Promise<PollOptionDetail> {
  const destination = trip.destination ?? trip.title;

  // Itinerary days (may be empty for a plain saved trip).
  let days: PollOptionDay[] = [];
  let itineraryCost = 0;
  try {
    const { data } = await supabase
      .from('itinerary_days')
      .select('*')
      .eq('trip_id', trip.id)
      .order('day_number', { ascending: true });
    const rows = (data ?? []) as ItineraryDayRow[];
    days = rows.map((d) => ({
      dayNumber: d.day_number,
      title: d.title,
      summary: d.summary,
      activities: (d.activities ?? []).map((a) => ({
        title: a.title,
        category: a.category,
        description: a.description,
      })),
    }));
    itineraryCost = rows.reduce((sum, d) => sum + (d.est_cost ?? 0), 0);
  } catch {
    days = [];
  }

  // Gallery — one Unsplash call returns several photos we reuse across the view.
  let gallery: string[] = [];
  try {
    const photos = await fetchDestinationPhotos(destination, 6);
    gallery = photos.map((p) => p.url);
  } catch {
    gallery = [];
  }

  // Flight time + cost, only if the group set a shared origin.
  let flightTime: string | null = null;
  let flightCostUsd: number | null = null;
  if (originAirport && originAirport.trim()) {
    try {
      const est = await estimateFlight({ from: originAirport.trim(), destination });
      flightTime = est.flightTime ?? null;
      flightCostUsd = typeof est.estimatedRoundTripUsd === 'number' ? est.estimatedRoundTripUsd : null;
    } catch {
      flightTime = null;
    }
  }

  return {
    destination,
    estCostPerPerson: trip.est_cost_per_person ?? (itineraryCost > 0 ? itineraryCost : null),
    travelers: trip.travelers,
    season: trip.season,
    startDate: trip.start_date,
    endDate: trip.end_date,
    flightFrom: originAirport?.trim() || null,
    flightTime,
    flightCostUsd,
    gallery,
    days,
  };
}
