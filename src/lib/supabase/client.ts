import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const PLACEHOLDER_KEY_MARKERS = ['your_publishable_key', 'your_anon_key', 'from_supabase_dashboard'];

export function getSupabaseEnvProblem(): string | null {
  if (!supabaseUrl) return 'Missing VITE_SUPABASE_URL in .env';
  if (!supabaseAnonKey) {
    return 'Missing VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY) in .env';
  }
  const lower = supabaseAnonKey.toLowerCase();
  if (PLACEHOLDER_KEY_MARKERS.some((m) => lower.includes(m))) {
    return (
      'VITE_SUPABASE_PUBLISHABLE_KEY in .env is still the placeholder. ' +
      'Copy the publishable or anon key from Supabase → Project Settings → API.'
    );
  }
  return null;
}

export const supabaseEnvProblem = getSupabaseEnvProblem();
export const supabaseKeysPresent = Boolean(supabaseUrl && supabaseAnonKey);
/** True when URL + key exist (used for UI); check supabaseEnvProblem before calling the API. */
export const supabaseEnabled = supabaseKeysPresent;

function createSupabaseBrowserClient() {
  return createClient(supabaseUrl as string, supabaseAnonKey as string, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // Manual exchange in SupabaseAuthProvider (detectSessionInUrl raced/cleared verifier without session).
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  });
}

export const supabase = supabaseEnabled ? createSupabaseBrowserClient() : null;
