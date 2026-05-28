import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, supabaseEnabled } from '../lib/supabase/client';

export const AFTER_SIGN_IN_PROJECTS_KEY = 'floorplan-studio:afterSignIn';

export type SupabaseAuthState = {
  enabled: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const SupabaseAuthContext = createContext<SupabaseAuthState | null>(null);

function notifyOpenProjectsAfterSignIn() {
  if (sessionStorage.getItem(AFTER_SIGN_IN_PROJECTS_KEY) !== 'projects') return;
  sessionStorage.removeItem(AFTER_SIGN_IN_PROJECTS_KEY);
  window.dispatchEvent(new CustomEvent('floorplan-studio:open-projects'));
}

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(supabaseEnabled);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let active = true;

    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session ?? null);
        setLoading(false);
        if (data.session) notifyOpenProjectsAfterSignIn();
      })
      .catch(() => {
        if (!active) return;
        setSession(null);
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
      if (event === 'SIGNED_IN' && nextSession) {
        notifyOpenProjectsAfterSignIn();
      }
      if (event === 'SIGNED_OUT') {
        sessionStorage.removeItem(AFTER_SIGN_IN_PROJECTS_KEY);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return;
    sessionStorage.setItem(AFTER_SIGN_IN_PROJECTS_KEY, 'projects');
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    sessionStorage.removeItem(AFTER_SIGN_IN_PROJECTS_KEY);
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<SupabaseAuthState>(
    () => ({
      enabled: supabaseEnabled,
      loading,
      session,
      user: session?.user ?? null,
      signInWithGoogle,
      signOut,
    }),
    [loading, session, signInWithGoogle, signOut],
  );

  return <SupabaseAuthContext.Provider value={value}>{children}</SupabaseAuthContext.Provider>;
}

export function useSupabaseAuth(): SupabaseAuthState {
  const ctx = useContext(SupabaseAuthContext);
  if (!ctx) {
    throw new Error('useSupabaseAuth must be used within SupabaseAuthProvider');
  }
  return ctx;
}
