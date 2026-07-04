import { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from './supabase';

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  // Access gate: whether the signed-in user is on the allowlist, and whether
  // they're an admin. `accessLoading` is true while we're checking.
  approved: boolean;
  isAdmin: boolean;
  accessLoading: boolean;
  recheckAccess: () => void;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [approved, setApproved] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [accessLoading, setAccessLoading] = useState(true);
  const [accessNonce, setAccessNonce] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // Whenever the session (or a manual recheck) changes, re-evaluate access.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!session) {
        setApproved(false);
        setIsAdmin(false);
        setAccessLoading(false);
        return;
      }
      setAccessLoading(true);
      try {
        const [{ data: member }, { data: admin }] = await Promise.all([
          supabase.rpc('is_household_member'),
          supabase.rpc('is_admin'),
        ]);
        if (cancelled) return;
        setApproved(!!member);
        setIsAdmin(!!admin);
      } catch {
        if (!cancelled) {
          setApproved(false);
          setIsAdmin(false);
        }
      } finally {
        if (!cancelled) setAccessLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, accessNonce]);

  const recheckAccess = useCallback(() => setAccessNonce((n) => n + 1), []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signUp(email: string, password: string) {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message ?? null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider
      value={{ session, loading, approved, isAdmin, accessLoading, recheckAccess, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
