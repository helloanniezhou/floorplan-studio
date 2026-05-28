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
import {
  getSupabaseEnvProblem,
  supabase,
  supabaseEnabled,
  supabaseEnvProblem,
} from '../lib/supabase/client';
import {
  cleanOAuthParamsFromUrl,
  exchangeOAuthCodeOnce,
  hasOAuthCodeInUrl,
  OAUTH_ORIGIN_KEY,
  originMismatchMessage,
  readOAuthCallbackError,
} from '../lib/supabase/authBootstrap';

export const AFTER_SIGN_IN_PROJECTS_KEY = 'floorplan-studio:afterSignIn';

const AUTH_WAIT_TIMEOUT_MS = 15_000;

/** True when returning from Google OAuth or when sign-in was started from Projects. */
export function hasPostLoginProjectsIntent(): boolean {
  const params = new URLSearchParams(window.location.search);
  if (params.get('view') === 'projects') return true;
  return sessionStorage.getItem(AFTER_SIGN_IN_PROJECTS_KEY) === 'projects';
}

export function clearPostLoginProjectsIntent(): void {
  sessionStorage.removeItem(AFTER_SIGN_IN_PROJECTS_KEY);
  const params = new URLSearchParams(window.location.search);
  if (params.get('view') !== 'projects') return;
  params.delete('view');
  const next = params.toString();
  window.history.replaceState({}, '', window.location.pathname + (next ? `?${next}` : ''));
}

export type SupabaseAuthState = {
  enabled: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const SupabaseAuthContext = createContext<SupabaseAuthState | null>(null);

function notifyOpenProjectsAfterSignIn() {
  if (!hasPostLoginProjectsIntent()) return;
  window.dispatchEvent(new CustomEvent('floorplan-studio:open-projects'));
}

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const envProblem = supabaseEnvProblem ?? getSupabaseEnvProblem();
  const [loading, setLoading] = useState(supabaseEnabled && !envProblem);
  const [session, setSession] = useState<Session | null>(null);
  const [authError, setAuthError] = useState<string | null>(envProblem);

  useEffect(() => {
    if (envProblem) {
      setLoading(false);
      return;
    }
    if (!supabase) return;
    let active = true;
    const isActive = () => active;

    const applySession = (nextSession: Session | null, errorMessage: string | null = null) => {
      if (!isActive()) return;
      setSession(nextSession);
      setAuthError(errorMessage);
      setLoading(false);
      if (nextSession) {
        cleanOAuthParamsFromUrl();
        sessionStorage.removeItem(OAUTH_ORIGIN_KEY);
        if (hasPostLoginProjectsIntent()) {
          notifyOpenProjectsAfterSignIn();
        }
      }
    };

    const urlError = readOAuthCallbackError();
    if (urlError) {
      cleanOAuthParamsFromUrl();
      applySession(null, urlError);
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const expectedOrigin = sessionStorage.getItem(OAUTH_ORIGIN_KEY);

    if (code && expectedOrigin && expectedOrigin !== window.location.origin) {
      cleanOAuthParamsFromUrl();
      sessionStorage.removeItem(OAUTH_ORIGIN_KEY);
      applySession(null, originMismatchMessage(expectedOrigin, window.location.origin));
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!isActive()) return;
      if (nextSession) {
        applySession(nextSession);
      }
      if (event === 'SIGNED_OUT') {
        sessionStorage.removeItem(AFTER_SIGN_IN_PROJECTS_KEY);
        setAuthError(null);
      }
    });

    void (async () => {
      try {
        if (code) {
          const { session: exchanged, error } = await exchangeOAuthCodeOnce(code);
          if (!isActive()) return;
          if (error && !exchanged) {
            cleanOAuthParamsFromUrl();
            const message =
              error.includes('Invalid API key') || error.includes('invalid api key')
                ? (getSupabaseEnvProblem() ??
                  'Invalid Supabase API key. Update VITE_SUPABASE_PUBLISHABLE_KEY in .env from Project Settings → API.')
                : error;
            applySession(null, message);
            return;
          }
          applySession(exchanged);
          return;
        }

        const { data, error } = await supabase.auth.getSession();
        if (!isActive()) return;
        if (error) {
          applySession(null, error.message);
          return;
        }
        applySession(data.session ?? null);
      } catch (err) {
        if (!isActive()) return;
        const message = err instanceof Error ? err.message : 'Could not verify sign-in';
        cleanOAuthParamsFromUrl();
        applySession(null, message);
      }
    })();

    const timeout = window.setTimeout(() => {
      if (!isActive()) return;
      setLoading((stillLoading) => {
        if (!stillLoading) return stillLoading;
        if (hasOAuthCodeInUrl()) {
          setAuthError(
            'Sign-in did not finish. Refresh the page once, or clear site data and sign in again from http://localhost:5173.',
          );
        }
        return false;
      });
    }, AUTH_WAIT_TIMEOUT_MS);

    return () => {
      active = false;
      window.clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return;
    setAuthError(null);
    const origin = window.location.origin;
    sessionStorage.setItem(OAUTH_ORIGIN_KEY, origin);
    sessionStorage.setItem(AFTER_SIGN_IN_PROJECTS_KEY, 'projects');
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}${window.location.pathname}?view=projects`,
      },
    });
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    sessionStorage.removeItem(AFTER_SIGN_IN_PROJECTS_KEY);
    sessionStorage.removeItem(OAUTH_ORIGIN_KEY);
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<SupabaseAuthState>(
    () => ({
      enabled: supabaseEnabled,
      loading,
      session,
      user: session?.user ?? null,
      authError,
      signInWithGoogle,
      signOut,
    }),
    [loading, session, authError, signInWithGoogle, signOut],
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
