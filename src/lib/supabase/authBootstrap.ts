import type { Session } from '@supabase/supabase-js';
import { supabase } from './client';

export const OAUTH_ORIGIN_KEY = 'floorplan-studio:oauthOrigin';

const OAUTH_QUERY_PARAMS = ['code', 'error', 'error_code', 'error_description', 'state'] as const;

export function hasOAuthCodeInUrl(): boolean {
  return new URLSearchParams(window.location.search).has('code');
}

export function readOAuthCallbackError(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('error_description') ?? params.get('error');
}

export function cleanOAuthParamsFromUrl(): void {
  const params = new URLSearchParams(window.location.search);
  let changed = false;
  for (const key of OAUTH_QUERY_PARAMS) {
    if (params.has(key)) {
      params.delete(key);
      changed = true;
    }
  }
  if (window.location.hash.includes('access_token=') || window.location.hash.includes('error=')) {
    window.history.replaceState({}, '', window.location.pathname + window.location.search);
    return;
  }
  if (!changed) return;
  const next = params.toString();
  window.history.replaceState({}, '', window.location.pathname + (next ? `?${next}` : ''));
}

export function originMismatchMessage(expected: string, actual: string): string {
  return (
    `Sign-in started on ${expected} but this page is ${actual}. ` +
    `Open ${expected} and sign in again (do not mix localhost and 127.0.0.1).`
  );
}

const PKCE_EXCHANGED_PREFIX = 'floorplan-studio:pkce-done:';

let exchangeInFlight: Promise<Session | null> | null = null;

/**
 * Exchange OAuth ?code= exactly once per page load (Strict Mode safe).
 */
export async function exchangeOAuthCodeOnce(
  code: string,
): Promise<{ session: Session | null; error: string | null }> {
  if (!supabase) {
    return { session: null, error: 'Supabase is not configured' };
  }

  const doneKey = `${PKCE_EXCHANGED_PREFIX}${code}`;
  if (sessionStorage.getItem(doneKey) === 'ok') {
    const { data, error } = await supabase.auth.getSession();
    return { session: data.session ?? null, error: error?.message ?? null };
  }

  if (!exchangeInFlight) {
    exchangeInFlight = (async () => {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
      sessionStorage.setItem(doneKey, 'ok');
      return data.session ?? null;
    })().finally(() => {
      exchangeInFlight = null;
    });
  }

  try {
    const session = await exchangeInFlight;
    return { session, error: null };
  } catch (err) {
    return {
      session: null,
      error: err instanceof Error ? err.message : 'OAuth code exchange failed',
    };
  }
}
