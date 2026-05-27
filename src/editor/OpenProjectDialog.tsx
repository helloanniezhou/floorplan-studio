import { useEffect, useState } from 'react';
import type { SavedProjectMeta } from '../lib/storage/projectStorage';

type Props = {
  open: boolean;
  currentId: string | null;
  onClose: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  fetchProjects: () => Promise<SavedProjectMeta[]>;
};

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function OpenProjectDialog({
  open,
  currentId,
  onClose,
  onOpen,
  onDelete,
  fetchProjects,
}: Props) {
  const [projects, setProjects] = useState<SavedProjectMeta[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void fetchProjects()
      .then(setProjects)
      .finally(() => setLoading(false));
  }, [open, fetchProjects]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="dialog open-project-dialog"
        role="dialog"
        aria-labelledby="open-project-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="dialog-header">
          <h2 id="open-project-title">Open saved plan</h2>
          <button type="button" className="dialog-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="dialog-body">
          {loading && <p className="muted">Loading…</p>}
          {!loading && projects.length === 0 && (
            <p className="muted">No saved plans yet. Your work is saved automatically as you edit.</p>
          )}
          {!loading && projects.length > 0 && (
            <ul className="project-list">
              {projects.map((p) => (
                <li key={p.id} className={p.id === currentId ? 'project-list-item current' : 'project-list-item'}>
                  <button
                    type="button"
                    className="project-list-open"
                    onClick={() => {
                      onOpen(p.id);
                      onClose();
                    }}
                  >
                    <span className="project-list-name">{p.name}</span>
                    <span className="project-list-date">{formatDate(p.updatedAt)}</span>
                  </button>
                  <button
                    type="button"
                    className="project-list-delete"
                    title="Delete plan"
                    onClick={() => {
                      if (window.confirm(`Delete “${p.name}”? This cannot be undone.`)) {
                        void onDelete(p.id);
                        setProjects((prev) => prev.filter((x) => x.id !== p.id));
                      }
                    }}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
