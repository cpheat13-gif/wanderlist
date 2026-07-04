import { Platform } from 'react-native';
import { PlaceCategory } from './types';

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
  category: 'hotel' | 'restaurant' | 'activity' | 'sightseeing';
  description: string;
}

export interface ItineraryDay {
  day: number;
  title: string;
  summary: string;
  estCostPerPersonUsd: number;
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
  // On web the SPA and the /api/claude function are served from the same Vercel
  // deployment, so use a relative URL — same-origin, no CORS, and immune to
  // EXPO_PUBLIC_API_BASE_URL drifting out of sync after redeploys. Native builds
  // have no same-origin, so they still need the absolute base URL.
  const base = Platform.OS === 'web' ? '' : requireBaseUrl();

  let res: Response;
  try {
    res = await fetch(`${base}/api/claude`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    // Transport-level failure (timeout, connection reset, offline). Never let
    // the raw platform message (e.g. WebKit's "The string did not match the
    // expected pattern" / "Load failed") reach the UI.
    throw new Error("Couldn't reach the planner — check your connection and try again.");
  }

  // Read the body once as text, then parse defensively. When a long request
  // exceeds the Vercel function limit the response is a non-JSON gateway/timeout
  // page, which would otherwise throw an opaque parse error.
  const raw = await res.text();
  let json: { error?: string } | null = null;
  try {
    json = raw ? JSON.parse(raw) : null;
  } catch {
    if ([408, 502, 503, 504, 524].includes(res.status)) {
      throw new Error('The planner took too long for a trip this long — try 7 days or fewer, or try again.');
    }
    throw new Error(`The planner hit an unexpected error (HTTP ${res.status}). Please try again.`);
  }

  if (!res.ok) {
    if ([408, 502, 503, 504, 524].includes(res.status)) {
      throw new Error('The planner took too long for a trip this long — try 7 days or fewer, or try again.');
    }
    throw new Error(json?.error ?? `Request failed with status ${res.status}`);
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
  days?: number;
  season?: string;
  travelers?: number;
}): Promise<ItineraryResponse> {
  return postClaude<ItineraryResponse>({ mode: 'itinerary', ...params });
}

// Lightweight, fast flight-cost estimate. Accepts IATA airport codes (SFO, DPS)
// or city names for `from`; `to` is optional and falls back to `destination`.
export function estimateFlight(params: {
  from: string;
  to?: string;
  destination?: string;
  country?: string;
}): Promise<FlightEstimate> {
  return postClaude<FlightEstimate>({ mode: 'flight', ...params });
}

export interface Airport {
  code: string;
  city: string;
  name: string;
  country: string;
}

// AI airport lookup — accepts a city, airport name, or partial IATA code.
export function searchAirports(query: string): Promise<{ airports: Airport[] }> {
  return postClaude<{ airports: Airport[] }>({ mode: 'airports', query });
}

export interface EnrichedActivity {
  title: string;
  category: PlaceCategory;
  description: string;
  timeOfDay: string;
  tip: string;
}

// Deepen one day: order stops Morning→Evening and add an insider tip to each.
export function enrichDay(params: {
  destination: string;
  country?: string;
  title?: string;
  summary?: string;
  activities: { title: string; category: PlaceCategory; description: string }[];
}): Promise<{ activities: EnrichedActivity[] }> {
  return postClaude<{ activities: EnrichedActivity[] }>({ mode: 'dayplan', ...params });
}

export interface RefineResponse {
  reply: string;
  days: ItineraryDay[];
}

export function refineItinerary(params: {
  destination: string;
  country?: string;
  days?: number;
  season?: string;
  travelers?: number;
  itinerary: ItineraryDay[];
  message: string;
  history?: { role: 'user' | 'assistant'; text: string }[];
}): Promise<RefineResponse> {
  return postClaude<RefineResponse>({ mode: 'refine', ...params });
}

export interface AiHighlight {
  title: string;
  blurb: string;
  photoQuery: string;
  secret: boolean;
}

export interface DestinationDossier {
  tagline: string;
  intro: string;
  facts: { season: string; language: string; currency: string; tripLength: string };
  estDailyCost: number;
  highlights: AiHighlight[];
}

export function fetchDestinationDossier(params: {
  destination: string;
  country?: string;
}): Promise<DestinationDossier> {
  return postClaude<DestinationDossier>({ mode: 'highlights', ...params });
}

export interface ExploreResult {
  name: string;
  category: PlaceCategory;
  photoQuery: string;
  blurb: string;
  website?: string;
}

export interface ExploreResponse {
  results: ExploreResult[];
}

export interface AskResponse {
  answer: string;
}

export function exploreDestination(params: {
  destination: string;
  country?: string;
  query: string;
}): Promise<ExploreResponse> {
  return postClaude<ExploreResponse>({ mode: 'explore', ...params });
}

export function askAboutDestination(params: {
  destination: string;
  country?: string;
  question: string;
  history?: { role: 'user' | 'assistant'; text: string }[];
}): Promise<AskResponse> {
  return postClaude<AskResponse>({ mode: 'ask', ...params });
}

export interface PlanScheduleItem {
  placeId: string;
  day: number;
  notes?: string;
}

export interface PlanTripResponse {
  summary: string;
  schedule: PlanScheduleItem[];
}

export function planTrip(params: {
  destination: string;
  country?: string;
  startDate: string;
  endDate: string;
  places: { id: string; name: string; category: PlaceCategory; notes: string | null; address: string | null }[];
  flights: {
    id: string;
    fromAirport: string;
    toAirport: string;
    departureTime: string | null;
    arrivalTime: string | null;
  }[];
}): Promise<PlanTripResponse> {
  return postClaude<PlanTripResponse>({ mode: 'plan', ...params });
}
