import { supabase } from './supabase';
import { Trip } from './types';

export type WorldStatus = 'visited' | 'saved' | 'upcoming' | 'shared';

export interface WorldPlace {
  id: string;
  title: string;
  subtitle: string | null;
  destination: string | null;
  status: WorldStatus;
  photo: string | null;
  when: string;
}

// A located place, ready to plot on the world map.
export interface WorldMarker {
  id: string;
  title: string;
  subtitle: string | null;
  lat: number;
  lng: number;
  status: WorldStatus;
  color: string;
  photo: string | null;
  when: string;
}

export const STATUS_META: Record<WorldStatus, { label: string; color: string }> = {
  visited: { label: 'Visited', color: '#E11D48' },
  saved: { label: 'Saved', color: '#2563EB' },
  upcoming: { label: 'Upcoming', color: '#7C3AED' },
  shared: { label: 'Shared', color: '#D97706' },
};

function categorize(t: Trip, myId: string): WorldStatus {
  if (t.created_by !== myId) return 'shared';
  if (t.status === 'past') return 'visited';
  if (t.status === 'idea') return 'saved';
  return 'upcoming'; // planning / booked
}

function subtitleOf(t: Trip): string | null {
  if (t.destination && t.destination !== t.title) {
    return t.destination.replace(`${t.title}, `, '');
  }
  return null;
}

// Everywhere I've been / saved / am going / been invited to.
export async function fetchWorldPlaces(myId: string): Promise<WorldPlace[]> {
  const { data: owned } = await supabase.from('trips').select('*').eq('created_by', myId);
  const { data: mem } = await supabase.from('trip_members').select('trip_id').eq('user_id', myId);
  const memberIds = (mem ?? []).map((m: { trip_id: string }) => m.trip_id);

  let shared: Trip[] = [];
  if (memberIds.length) {
    const { data } = await supabase.from('trips').select('*').in('id', memberIds);
    shared = ((data ?? []) as Trip[]).filter((t) => t.created_by !== myId);
  }

  const byId = new Map<string, Trip>();
  [...((owned ?? []) as Trip[]), ...shared].forEach((t) => byId.set(t.id, t));

  return [...byId.values()].map((t) => ({
    id: t.id,
    title: t.title,
    subtitle: subtitleOf(t),
    destination: t.destination,
    status: categorize(t, myId),
    photo: t.cover_photo_url,
    when: t.start_date || t.created_at,
  }));
}
