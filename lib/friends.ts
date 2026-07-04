import { supabase } from './supabase';
import { Trip } from './types';

export interface FriendSummary {
  userId: string;
  email: string | null;
  wishlistCount: number;
  tripCount: number;
}

// Club members (minus me) with counts of their club-visible dreams + past trips.
export async function fetchFriends(myId: string): Promise<FriendSummary[]> {
  const [{ data: profs }, { data: trips }] = await Promise.all([
    supabase.from('profiles').select('id, email'),
    supabase.from('trips').select('created_by, status').in('status', ['idea', 'past']),
  ]);
  const wish: Record<string, number> = {};
  const past: Record<string, number> = {};
  ((trips ?? []) as { created_by: string; status: string }[]).forEach((t) => {
    if (t.status === 'idea') wish[t.created_by] = (wish[t.created_by] ?? 0) + 1;
    else if (t.status === 'past') past[t.created_by] = (past[t.created_by] ?? 0) + 1;
  });
  return ((profs ?? []) as { id: string; email: string | null }[])
    .filter((p) => p.id !== myId)
    .map((p) => ({
      userId: p.id,
      email: p.email,
      wishlistCount: wish[p.id] ?? 0,
      tripCount: past[p.id] ?? 0,
    }))
    .sort((a, b) => b.wishlistCount + b.tripCount - (a.wishlistCount + a.tripCount));
}

// One friend's dreams (wishlist) + trips they've done (past).
export async function fetchFriendProfile(
  userId: string
): Promise<{ email: string | null; wishlist: Trip[]; past: Trip[] }> {
  const [{ data: prof }, { data: trips }] = await Promise.all([
    supabase.from('profiles').select('email').eq('id', userId).maybeSingle(),
    supabase
      .from('trips')
      .select('*')
      .eq('created_by', userId)
      .in('status', ['idea', 'past'])
      .order('created_at', { ascending: false }),
  ]);
  const all = (trips ?? []) as Trip[];
  return {
    email: (prof as { email: string | null } | null)?.email ?? null,
    wishlist: all.filter((t) => t.status === 'idea'),
    past: all.filter((t) => t.status === 'past'),
  };
}
