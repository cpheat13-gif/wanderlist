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

// A single day in an option's snapshotted itinerary (public, denormalized).
export interface PollOptionDay {
  dayNumber: number;
  title: string;
  summary: string;
  activities: { title: string; category: string; description: string }[];
}

// Public snapshot of a trip's detail so anonymous voters can dig in before voting.
export interface PollOptionDetail {
  destination: string | null;
  estCostPerPerson: number | null;
  travelers: number | null;
  season: string | null;
  startDate: string | null;
  endDate: string | null;
  flightFrom: string | null;
  flightTime: string | null;
  flightCostUsd: number | null;
  gallery: string[];
  days: PollOptionDay[];
}

export interface PollOption {
  id: string;
  poll_id: string;
  trip_id: string | null;
  label: string;
  subtitle: string | null;
  cover_photo_url: string | null;
  display_order: number;
  detail: PollOptionDetail | null;
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

export type TripRole = 'owner' | 'editor' | 'viewer';

export interface TripMemberRow {
  trip_id: string;
  user_id: string;
  role: 'editor' | 'viewer';
  added_by: string | null;
  created_at: string;
}

// A person on a trip, ready to render (owner included, with their email).
export interface TripMemberDisplay {
  userId: string;
  email: string | null;
  role: TripRole;
  isOwner: boolean;
  isSelf: boolean;
}

export interface TripInvite {
  id: string;
  trip_id: string;
  code: string;
  role: 'editor' | 'viewer';
  created_by: string | null;
  created_at: string;
}

// A signup, annotated with whether their email is on the allowlist.
export interface MemberRow extends Profile {
  approved: boolean;
}
