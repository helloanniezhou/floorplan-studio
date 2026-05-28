import { useEffect, useMemo, useState } from 'react';
import type { SavedProjectMeta } from '../lib/storage/projectStorage';
import { useProjectPersistence } from '../hooks/useProjectPersistence';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function ProjectsPage({
  onBack,
  standalone = false,
}: {
  onBack: () => void;
  standalone?: boolean;
}) {
  const {
    cloudMode,
    user,
    signInWithGoogle,
    signOut,
    fetchProjectList,
    loadProject,
    removeProject,
    renameAnyProject,
    createNewProject,
    importLocalBrowserProjects,
  } = useProjectPersistence();
  const [projects, setProjects] = useState<SavedProjectMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');

  const refreshProjects = () => {
    setLoading(true);
    setListError(null);
    return fetchProjectList()
      .then(setProjects)
      .catch((err: unknown) => {
        setProjects([]);
        setListError(err instanceof Error ? err.message : 'Could not load cloud projects.');
      })
      .finally(() => setLoading(false));
  };

  const userLabel = useMemo(
    () => user?.email ?? user?.user_metadata?.full_name ?? 'Signed in account',
    [user],
  );

  useEffect(() => {
    if (!cloudMode) {
      setProjects([]);
      setLoading(false);
      return;
    }
    void refreshProjects();
  }, [cloudMode, fetchProjectList]);

  if (!cloudMode) {
    return (
      <section className={`projects-page ${standalone ? 'projects-page--standalone' : ''}`}>
        <header className="projects-header">
          <h2>Projects</h2>
          <button type="button" className="action-bar-btn" onClick={onBack}>
            Back to editor
          </button>
        </header>
        <div className="projects-empty">
          <p>Sign in with Google to manage projects for your account in Supabase.</p>
          <button type="button" className="action-bar-btn primary" onClick={() => void signInWithGoogle()}>
            Continue with Google
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className={`projects-page ${standalone ? 'projects-page--standalone' : ''}`}>
      <header className="projects-header">
        <div>
          <h2>Projects</h2>
          <div className="projects-account">
            <span className="projects-account-email">{userLabel}</span>
            <button type="button" className="action-bar-btn" onClick={() => void signOut()}>
              Sign out
            </button>
          </div>
        </div>
        <div className="projects-header-actions">
          <button
            type="button"
            className="action-bar-btn"
            onClick={() => {
              void createNewProject().then(() => onBack());
            }}
          >
            New project
          </button>
          <button type="button" className="action-bar-btn" onClick={onBack}>
            Back to editor
          </button>
        </div>
      </header>
      {loading && <p className="muted">Loading projects…</p>}
      {listError && <p className="project-status error">{listError}</p>}
      {importMessage && <p className="muted">{importMessage}</p>}
      {!loading && projects.length === 0 && (
        <div className="projects-empty">
          <p className="muted">
            No cloud projects yet for this account. If you designed a plan before signing in, import it
            from this browser.
          </p>
          <button
            type="button"
            className="action-bar-btn primary"
            disabled={importing}
            onClick={() => {
              setImporting(true);
              setImportMessage(null);
              void importLocalBrowserProjects()
                .then(({ imported, localCount }) => {
                  if (imported === 0 && localCount === 0) {
                    setImportMessage(
                      'No local projects found in this browser. Try the same browser/profile you used before, or open http://localhost:5173 (not 127.0.0.1) if that is where you edited.',
                    );
                  } else {
                    setImportMessage(`Imported ${imported} project(s) from this browser.`);
                  }
                  return refreshProjects();
                })
                .catch((err: unknown) => {
                  setImportMessage(
                    err instanceof Error ? err.message : 'Import failed. Check Supabase table and RLS.',
                  );
                })
                .finally(() => setImporting(false));
            }}
          >
            {importing ? 'Importing…' : 'Import from this browser'}
          </button>
        </div>
      )}
      {!loading && projects.length > 0 && (
        <ul className="projects-grid">
          {projects.map((project) => (
            <li key={project.id} className="projects-card">
              <div className="projects-card-header">
                {editingId === project.id ? (
                  <input
                    className="project-name-input"
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onBlur={() => {
                      void renameAnyProject(project.id, nameDraft);
                      setEditingId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        void renameAnyProject(project.id, nameDraft);
                        setEditingId(null);
                      }
                    }}
                    autoFocus
                  />
                ) : (
                  <button
                    type="button"
                    className="project-name-btn"
                    onClick={() => {
                      setEditingId(project.id);
                      setNameDraft(project.name);
                    }}
                  >
                    {project.name}
                  </button>
                )}
                <span className="muted">{formatDate(project.updatedAt)}</span>
              </div>
              <div className="projects-card-actions">
                <button
                  type="button"
                  className="action-bar-btn"
                  onClick={() => {
                    void loadProject(project.id);
                    onBack();
                  }}
                >
                  Open
                </button>
                <button
                  type="button"
                  className="action-bar-btn"
                  onClick={() => {
                    if (window.confirm(`Delete "${project.name}"? This cannot be undone.`)) {
                      void removeProject(project.id).then(() =>
                        setProjects((prev) => prev.filter((p) => p.id !== project.id)),
                      );
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
