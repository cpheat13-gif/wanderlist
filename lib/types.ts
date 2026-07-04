export type TripStatus = 'idea' | 'planning' | 'booked' | 'past';

export type PlaceCategory = 'hotel' | 'restaurant' | 'activity' | 'sightseeing';

export interface Trip {
  id: string;
  created_by: string;
  title: string;
  destination: string | null;
  cover_photo_url: string | null;
  cover_photo_credit_name: string | null;
  cover_photo_credit_url: string | null;
  tiktok_url: string | null;
  status: TripStatus;
  start_date: string | null;
  end_date: string | null;
  travelers: number | null;
  season: string | null;
  est_cost_per_person: number | null;
  created_at: string;
}

export interface ItineraryActivity {
  title: string;
  category: PlaceCategory;
  description: string;
  // Added by the day "Go deeper" enrichment (optional).
  timeOfDay?: string;
  tip?: string;
}

export interface ItineraryDayRow {
  id: string;
  trip_id: string;
  day_number: number;
  title: string;
  summary: string;
  activities: ItineraryActivity[];
  est_cost: number | null;
  created_at: string;
}

export interface Place {
  id: string;
  trip_id: string;
  name: string;
  category: PlaceCategory;
  address: string | null;
  lat: number | null;
  lng: number | null;
  notes: string | null;
  is_booked: boolean;
  confirmation_number: string | null;
  scheduled_at: string | null;
  created_at: string;
}

export interface TiktokLink {
  id: string;
  trip_id: string;
  url: string;
  created_at: string;
}

export interface Poll {
  id: string;
  created_by: string;
  title: string;
  subtitle: string | null;
  share_code: string;
  status: string;
  created_at: string;
}

export interface PollOption {
  id: string;
  poll_id: string;
  trip_id: string | null;
  label: string;
  subtitle: string | null;
  cover_photo_url: string | null;
  display_order: number;
  created_at: string;
}

export interface PollVote {
  id: string;
  poll_id: string;
  option_id: string;
  voter_name: string;
  created_at: string;
}

export interface Flight {
  id: string;
  trip_id: string;
  airline: string | null;
  flight_number: string | null;
  from_airport: string;
  to_airport: string;
  departure_time: string | null;
  arrival_time: string | null;
  notes: string | null;
  is_booked: boolean;
  confirmation_number: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string | null;
  is_admin: boolean;
  created_at: string;
}

// A signup, annotated with whether their email is on the allowlist.
export interface MemberRow extends Profile {
  approved: boolean;
}
