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

export function ProjectsPage({ onBack }: { onBack: () => void }) {
  const {
    cloudMode,
    user,
    signInWithGoogle,
    fetchProjectList,
    loadProject,
    removeProject,
    renameAnyProject,
    createNewProject,
  } = useProjectPersistence();
  const [projects, setProjects] = useState<SavedProjectMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');

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
    setLoading(true);
    void fetchProjectList()
      .then(setProjects)
      .finally(() => setLoading(false));
  }, [cloudMode, fetchProjectList]);

  if (!cloudMode) {
    return (
      <section className="projects-page">
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
    <section className="projects-page">
      <header className="projects-header">
        <div>
          <h2>Projects</h2>
          <p className="muted">Account: {userLabel}</p>
        </div>
        <div className="projects-header-actions">
          <button type="button" className="action-bar-btn" onClick={() => void createNewProject()}>
            New project
          </button>
          <button type="button" className="action-bar-btn" onClick={onBack}>
            Back to editor
          </button>
        </div>
      </header>
      {loading && <p className="muted">Loading projects…</p>}
      {!loading && projects.length === 0 && (
        <p className="muted">No projects yet for this account. Create a new project to get started.</p>
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
