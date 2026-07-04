import { supabase } from './supabase';
import { MemberRow, Profile } from './types';

function sameEmail(a: string | null, b: string | null): boolean {
  return !!a && !!b && a.toLowerCase() === b.toLowerCase();
}

// Everyone who has signed up, annotated with whether they're approved
// (i.e. their email is on the allowed_users allowlist). Admin-only in practice —
// RLS returns just the caller's own row for non-admins.
export async function fetchMembers(): Promise<MemberRow[]> {
  const [{ data: profiles }, { data: allowed }] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: true }),
    supabase.from('allowed_users').select('email'),
  ]);
  const allowedEmails = (allowed ?? []).map((r: { email: string }) => r.email);
  return ((profiles ?? []) as Profile[]).map((p) => ({
    ...p,
    approved: allowedEmails.some((e) => sameEmail(e, p.email)),
  }));
}

// Approve a signup by adding their email to the allowlist.
export async function approveMember(email: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from('allowed_users').insert({ email });
  if (error) {
    if (error.code === '23505') return { ok: true }; // already approved — treat as success
    if (error.code === '42P01') return { ok: false, error: 'Run the 0010_approvals.sql migration in Supabase first.' };
    if (error.code === '42501') return { ok: false, error: 'Only admins can approve members.' };
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

// Revoke access by removing their email from the allowlist.
export async function revokeMember(email: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from('allowed_users').delete().eq('email', email);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
