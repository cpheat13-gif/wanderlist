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
