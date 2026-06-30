const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

export interface DestinationSuggestion {
  name: string;
  country: string;
  photoQuery: string;
  blurb: string;
}

export interface DestinationResponse {
  reply: string;
  suggestions: DestinationSuggestion[];
}

export interface ItineraryItem {
  title: string;
  category: 'hotel' | 'restaurant' | 'activity';
  description: string;
}

export interface ItineraryDay {
  day: number;
  summary: string;
  items: ItineraryItem[];
}

export interface FlightEstimate {
  fromCity: string;
  toCity: string;
  estimatedRoundTripUsd: number;
  note: string;
}

export interface ItineraryResponse {
  flightEstimate: FlightEstimate;
  days: ItineraryDay[];
}

class AiConfigError extends Error {}

function requireBaseUrl(): string {
  if (!API_BASE_URL) {
    throw new AiConfigError(
      'EXPO_PUBLIC_API_BASE_URL is not set. Add it to your .env with your Vercel deployment URL.'
    );
  }
  return API_BASE_URL;
}

async function postClaude<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${requireBaseUrl()}/api/claude`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error ?? `Request failed with status ${res.status}`);
  }
  return json as T;
}

export function suggestDestinations(prompt: string): Promise<DestinationResponse> {
  return postClaude<DestinationResponse>({ mode: 'destination', prompt });
}

export function buildItinerary(params: {
  destination: string;
  country?: string;
  departureCity?: string;
  travelTiming?: string;
  interests?: string;
}): Promise<ItineraryResponse> {
  return postClaude<ItineraryResponse>({ mode: 'itinerary', ...params });
}
