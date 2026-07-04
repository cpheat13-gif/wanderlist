import { supabase } from './supabase';
import { Profile, TripInvite, TripMemberDisplay, TripRole } from './types';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function genCode(len = 7): string {
  let s = '';
  for (let i = 0; i < len; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}

// The link a friend opens to join a trip. Same-origin on web; falls back to the
// configured deployment URL on native.
export function shareUrlForTripCode(code: string): string {
  const path = `/join/${code.toUpperCase()}`;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin + path;
  }
  const base = process.env.EXPO_PUBLIC_API_BASE_URL;
  return base ? base.replace(/\/$/, '') + path : path;
}

// The trip's owner + members, ready to render. `myId`/`ownerId` decide the owner
// row and "you" markers.
export async function fetchTripMembers(
  tripId: string,
  ownerId: string,
  myId: string
): Promise<TripMemberDisplay[]> {
  const [{ data: members }, { data: profiles }] = await Promise.all([
    supabase.from('trip_members').select('user_id, role').eq('trip_id', tripId),
    supabase.from('profiles').select('id, email'),
  ]);
  const emailById = new Map<string, string | null>();
  ((profiles ?? []) as Pick<Profile, 'id' | 'email'>[]).forEach((p) => emailById.set(p.id, p.email));

  const rows: TripMemberDisplay[] = [
    {
      userId: ownerId,
      email: emailById.get(ownerId) ?? null,
      role: 'owner',
      isOwner: true,
      isSelf: ownerId === myId,
    },
  ];
  ((members ?? []) as { user_id: string; role: 'editor' | 'viewer' }[]).forEach((m) => {
    if (m.user_id === ownerId) return;
    rows.push({
      userId: m.user_id,
      email: emailById.get(m.user_id) ?? null,
      role: m.role,
      isOwner: false,
      isSelf: m.user_id === myId,
    });
  });
  return rows;
}

// Approved users not already on the trip — the add-people picker directory.
export async function fetchAddableUsers(excludeIds: string[]): Promise<Pick<Profile, 'id' | 'email'>[]> {
  const { data } = await supabase.from('profiles').select('id, email').order('email', { ascending: true });
  const set = new Set(excludeIds);
  return ((data ?? []) as Pick<Profile, 'id' | 'email'>[]).filter((p) => !set.has(p.id) && !!p.email);
}

export async function addMember(
  tripId: string,
  userId: string,
  role: 'editor' | 'viewer'
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from('trip_members').insert({ trip_id: tripId, user_id: userId, role });
  if (error) {
    if (error.code === '23505') return { ok: true };
    if (error.code === '42P01') return { ok: false, error: 'Run the 0012_trip_collab.sql migration in Supabase first.' };
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function setMemberRole(tripId: string, userId: string, role: 'editor' | 'viewer') {
  await supabase.from('trip_members').update({ role }).eq('trip_id', tripId).eq('user_id', userId);
}

export async function removeMember(tripId: string, userId: string) {
  await supabase.from('trip_members').delete().eq('trip_id', tripId).eq('user_id', userId);
}

// One reusable invite link per trip (viewer by default). Reuses an existing one.
export async function getOrCreateTripInvite(
  tripId: string,
  createdBy: string,
  role: 'editor' | 'viewer' = 'viewer'
): Promise<TripInvite | null> {
  const { data: existing } = await supabase
    .from('trip_invites')
    .select('*')
    .eq('trip_id', tripId)
    .eq('role', role)
    .limit(1)
    .maybeSingle();
  if (existing) return existing as TripInvite;

  for (let attempt = 0; attempt < 4; attempt++) {
    const { data, error } = await supabase
      .from('trip_invites')
      .insert({ trip_id: tripId, code: genCode(), role, created_by: createdBy })
      .select()
      .single();
    if (!error && data) return data as TripInvite;
    if (error && error.code !== '23505') return null;
  }
  return null;
}

// Redeem a share link — adds the signed-in caller to the trip. Returns the trip id.
export async function redeemTripInvite(code: string): Promise<{ tripId: string | null; error?: string }> {
  const { data, error } = await supabase.rpc('redeem_trip_invite', { invite_code: code.toUpperCase() });
  if (error) return { tripId: null, error: error.message };
  return { tripId: (data as string) ?? null };
}

// My role on a trip, given the fetched member list.
export function roleFor(members: TripMemberDisplay[], myId: string): TripRole | null {
  const me = members.find((m) => m.userId === myId);
  return me ? me.role : null;
}
