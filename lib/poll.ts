import { supabase } from './supabase';
import { Poll, PollOption, PollOptionDetail, PollVote } from './types';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// The public link friends open to vote (no login). Same-origin on web; falls
// back to the configured deployment URL on native builds.
export function shareUrlForCode(code: string): string {
  const path = `/vote/${code.toUpperCase()}`;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin + path;
  }
  const base = process.env.EXPO_PUBLIC_API_BASE_URL;
  return base ? base.replace(/\/$/, '') + path : path;
}

function genCode(len = 6): string {
  let s = '';
  for (let i = 0; i < len; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}

export interface NewPollOption {
  trip_id?: string | null;
  label: string;
  subtitle?: string | null;
  cover_photo_url?: string | null;
  detail?: PollOptionDetail | null;
}

export interface CreatePollResult {
  poll: Poll | null;
  error: string | null;
}

// Human-readable hint for the failure modes we can actually anticipate.
function explainPollError(err: { code?: string; message?: string }): string {
  const code = err.code ?? '';
  const msg = err.message ?? 'Unknown error';
  if (code === '42P01') return 'The polls tables are missing — run the 0009_polls.sql migration in Supabase.';
  if (code === '42501' || /row-level security/i.test(msg))
    return 'Permission denied by the database (RLS). Make sure you are signed in and the 0009_polls.sql policies are in place.';
  return msg;
}

// Create a poll with its options. Retries on the (rare) share-code collision.
export async function createPoll(
  createdBy: string,
  params: { title: string; subtitle?: string | null; options: NewPollOption[] }
): Promise<CreatePollResult> {
  let poll: Poll | null = null;
  let lastError: string | null = null;
  for (let attempt = 0; attempt < 4 && !poll; attempt++) {
    const { data, error } = await supabase
      .from('polls')
      .insert({
        created_by: createdBy,
        title: params.title.trim(),
        subtitle: params.subtitle?.trim() || null,
        share_code: genCode(),
        status: 'open',
      })
      .select()
      .single();
    if (!error && data) {
      poll = data as Poll;
    } else if (error && error.code !== '23505') {
      return { poll: null, error: explainPollError(error) }; // non-collision error
    } else if (error) {
      lastError = 'Could not generate a unique share code. Please try again.';
    }
  }
  if (!poll) return { poll: null, error: lastError ?? 'Could not create the poll. Please try again.' };

  const rows = params.options.map((o, i) => ({
    poll_id: poll!.id,
    trip_id: o.trip_id ?? null,
    label: o.label,
    subtitle: o.subtitle ?? null,
    cover_photo_url: o.cover_photo_url ?? null,
    detail: o.detail ?? null,
    display_order: i,
  }));
  const { error: optErr } = await supabase.from('poll_options').insert(rows);
  if (optErr) return { poll, error: explainPollError(optErr) };
  return { poll, error: null };
}

export interface PollWithOptions {
  poll: Poll;
  options: PollOption[];
}

export async function fetchPollByCode(code: string): Promise<PollWithOptions | null> {
  const { data: poll } = await supabase
    .from('polls')
    .select('*')
    .eq('share_code', code.toUpperCase())
    .maybeSingle();
  if (!poll) return null;
  const { data: options } = await supabase
    .from('poll_options')
    .select('*')
    .eq('poll_id', (poll as Poll).id)
    .order('display_order', { ascending: true });
  return { poll: poll as Poll, options: (options ?? []) as PollOption[] };
}

export async function fetchPollById(id: string): Promise<PollWithOptions | null> {
  const { data: poll } = await supabase.from('polls').select('*').eq('id', id).maybeSingle();
  if (!poll) return null;
  const { data: options } = await supabase
    .from('poll_options')
    .select('*')
    .eq('poll_id', id)
    .order('display_order', { ascending: true });
  return { poll: poll as Poll, options: (options ?? []) as PollOption[] };
}

export async function fetchVotes(pollId: string): Promise<PollVote[]> {
  const { data } = await supabase
    .from('poll_votes')
    .select('*')
    .eq('poll_id', pollId)
    .order('created_at', { ascending: true });
  return (data ?? []) as PollVote[];
}

export interface MyPollSummary extends Poll {
  optionCount: number;
  voteCount: number;
}

export async function fetchMyPolls(userId: string): Promise<MyPollSummary[]> {
  const { data: polls } = await supabase
    .from('polls')
    .select('*')
    .eq('created_by', userId)
    .order('created_at', { ascending: false });
  const list = (polls ?? []) as Poll[];
  if (list.length === 0) return [];
  const ids = list.map((p) => p.id);
  const [{ data: opts }, { data: votes }] = await Promise.all([
    supabase.from('poll_options').select('poll_id').in('poll_id', ids),
    supabase.from('poll_votes').select('poll_id').in('poll_id', ids),
  ]);
  const optCounts: Record<string, number> = {};
  (opts ?? []).forEach((o: { poll_id: string }) => {
    optCounts[o.poll_id] = (optCounts[o.poll_id] ?? 0) + 1;
  });
  const voteCounts: Record<string, number> = {};
  (votes ?? []).forEach((v: { poll_id: string }) => {
    voteCounts[v.poll_id] = (voteCounts[v.poll_id] ?? 0) + 1;
  });
  return list.map((p) => ({
    ...p,
    optionCount: optCounts[p.id] ?? 0,
    voteCount: voteCounts[p.id] ?? 0,
  }));
}

// Cast a vote. No login required — anyone with the poll can vote once per name.
export async function castVote(params: {
  pollId: string;
  optionId: string;
  voterName: string;
}): Promise<{ ok: boolean; error?: string }> {
  const name = params.voterName.trim();
  if (!name) return { ok: false, error: 'Please enter your name.' };
  const { error } = await supabase.from('poll_votes').insert({
    poll_id: params.pollId,
    option_id: params.optionId,
    voter_name: name,
  });
  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: `"${name}" has already voted in this poll.` };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

// Live vote updates for a poll. Returns an unsubscribe fn.
export function subscribeVotes(pollId: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`poll-votes-${pollId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'poll_votes', filter: `poll_id=eq.${pollId}` },
      () => onChange()
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
