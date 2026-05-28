import { useEffect, useMemo, useState } from 'react';
import type { SavedProjectMeta } from '../lib/storage/projectStorage';
import { getProjectPreviewUrl } from '../lib/plans/planPreview';
import { useProjectPersistence } from '../hooks/useProjectPersistence';
import { ProjectCard } from './ProjectCard';

type PreviewState = {
  src: string | null;
  loading: boolean;
};

export function ProjectsPage({
  onProjectOpened,
  standalone = false,
}: {
  onProjectOpened: () => void;
  standalone?: boolean;
}) {
  const {
    authEnabled,
    authLoading,
    cloudMode,
    user,
    signInWithGoogle,
    signOut,
    fetchProjectList,
    getProjectById,
    loadProject,
    removeProject,
    renameAnyProject,
    createNewProject,
    importLocalBrowserProjects,
  } = useProjectPersistence();
  const [projects, setProjects] = useState<SavedProjectMeta[]>([]);
  const [previews, setPreviews] = useState<Record<string, PreviewState>>({});
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
    if (authEnabled && authLoading) {
      setLoading(true);
      return;
    }
    if (!cloudMode) {
      setProjects([]);
      setPreviews({});
      setLoading(false);
      return;
    }
    void refreshProjects();
  }, [authEnabled, authLoading, cloudMode, user?.id, fetchProjectList]);

  useEffect(() => {
    if (!cloudMode || projects.length === 0) return;

    let cancelled = false;
    for (const project of projects) {
      setPreviews((prev) => ({
        ...prev,
        [project.id]: { src: prev[project.id]?.src ?? null, loading: true },
      }));

      void getProjectById(project.id)
        .then((saved) => {
          if (cancelled) return;
          const src = saved ? getProjectPreviewUrl(project.id, saved.plan) : null;
          setPreviews((prev) => ({
            ...prev,
            [project.id]: { src, loading: false },
          }));
        })
        .catch(() => {
          if (cancelled) return;
          setPreviews((prev) => ({
            ...prev,
            [project.id]: { src: null, loading: false },
          }));
        });
    }

    return () => {
      cancelled = true;
    };
  }, [cloudMode, projects, getProjectById]);

  const openProject = (id: string) => {
    void loadProject(id).then(() => onProjectOpened());
  };

  if (authEnabled && authLoading) {
    return (
      <section className={`projects-page ${standalone ? 'projects-page--standalone' : ''}`}>
        <header className="projects-header">
          <h2>Projects</h2>
        </header>
        <p className="muted">Checking login…</p>
      </section>
    );
  }

  if (!cloudMode) {
    return (
      <section className={`projects-page ${standalone ? 'projects-page--standalone' : ''}`}>
        <header className="projects-header">
          <h2>Projects</h2>
        </header>
        <div className="projects-empty">
          <p>Sign in with Google to manage projects for your account in Supabase.</p>
          {!authEnabled && (
            <p className="muted">
              Supabase is not configured in this build. Add <code>VITE_SUPABASE_URL</code> and{' '}
              <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> to your <code>.env</code> file.
            </p>
          )}
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
              void createNewProject().then(() => onProjectOpened());
            }}
          >
            New project
          </button>
        </div>
      </header>
      {loading && <p className="muted">Loading projects…</p>}
      {listError && (
        <p className="project-status error">
          {listError} Try <strong>Import from this browser</strong> below if your plans were saved
          locally.
        </p>
      )}
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
          {projects.map((project) => {
            const preview = previews[project.id];
            return (
              <ProjectCard
                key={project.id}
                project={project}
                previewSrc={preview?.src ?? null}
                previewLoading={preview?.loading ?? true}
                editing={editingId === project.id}
                nameDraft={nameDraft}
                onNameDraftChange={setNameDraft}
                onStartRename={() => {
                  setEditingId(project.id);
                  setNameDraft(project.name);
                }}
                onCommitRename={() => {
                  void renameAnyProject(project.id, nameDraft);
                  setEditingId(null);
                }}
                onCancelRename={() => setEditingId(null)}
                onOpen={() => openProject(project.id)}
                onDelete={() => {
                  void removeProject(project.id).then(() =>
                    setProjects((prev) => prev.filter((p) => p.id !== project.id)),
                  );
                }}
              />
            );
          })}
        </ul>
      )}
    </section>
  );
}
