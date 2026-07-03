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
  days?: number;
  season?: string;
  travelers?: number;
}): Promise<ItineraryResponse> {
  return postClaude<ItineraryResponse>({ mode: 'itinerary', ...params });
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

export function fetchHighlights(params: {
  destination: string;
  country?: string;
}): Promise<{ highlights: AiHighlight[] }> {
  return postClaude<{ highlights: AiHighlight[] }>({ mode: 'highlights', ...params });
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
