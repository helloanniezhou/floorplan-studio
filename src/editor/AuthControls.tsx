import { useProjectPersistence } from '../hooks/useProjectPersistence';

export function AuthControls() {
  const { authEnabled, authLoading, user, signInWithGoogle, signOut } = useProjectPersistence();

  if (!authEnabled) {
    return <span className="project-status muted">Supabase not configured</span>;
  }

  if (authLoading) {
    return <span className="project-status muted">Checking login…</span>;
  }

  if (!user) {
    return (
      <button type="button" className="action-bar-btn" onClick={() => void signInWithGoogle()}>
        Sign in with Google
      </button>
    );
  }

  return (
    <div className="auth-controls">
      <span className="project-status muted">{user.email ?? 'Signed in'}</span>
      <button type="button" className="action-bar-btn" onClick={() => void signOut()}>
        Sign out
      </button>
    </div>
  );
}
