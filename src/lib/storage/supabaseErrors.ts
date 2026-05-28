type SupabaseLikeError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

export function formatSupabaseError(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return 'Could not save to cloud.';
  }

  const err = error as SupabaseLikeError;
  const message = err.message ?? 'Could not save to cloud.';

  if (
    err.code === '42P01' ||
    err.code === 'PGRST205' ||
    (message.includes('relation') && message.includes('does not exist')) ||
    message.includes("Could not find the table 'public.projects'")
  ) {
    return 'Cloud database not set up. Run supabase/setup.sql in the Supabase SQL Editor (see README).';
  }
  if (err.code === '42501' || message.toLowerCase().includes('row-level security')) {
    return 'Permission denied. Sign out and sign in again, or check RLS policies.';
  }
  if (message.includes('JWT') || message.includes('session')) {
    return 'Session expired. Sign out and sign in again.';
  }
  if (message.includes('Payload too large') || message.includes('too large')) {
    return 'Plan is too large for cloud save. It is still saved in this browser.';
  }

  return message;
}

export class CloudSyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CloudSyncError';
  }
}
