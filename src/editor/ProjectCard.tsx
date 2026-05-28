import { useEffect, useRef, useState } from 'react';
import type { SavedProjectMeta } from '../lib/storage/projectStorage';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

type Props = {
  project: SavedProjectMeta;
  previewSrc: string | null;
  previewLoading: boolean;
  editing: boolean;
  nameDraft: string;
  onNameDraftChange: (value: string) => void;
  onStartRename: () => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  onOpen: () => void;
  onDelete: () => void;
};

export function ProjectCard({
  project,
  previewSrc,
  previewLoading,
  editing,
  nameDraft,
  onNameDraftChange,
  onStartRename,
  onCommitRename,
  onCancelRename,
  onOpen,
  onDelete,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [menuOpen]);

  const handleDelete = () => {
    setMenuOpen(false);
    if (window.confirm(`Delete "${project.name}"? This cannot be undone.`)) {
      onDelete();
    }
  };

  return (
    <li className="projects-card">
      <button type="button" className="projects-card-open" onClick={onOpen}>
        <div className="projects-card-preview" aria-hidden>
          {previewLoading && <span className="projects-card-preview-placeholder muted">Loading…</span>}
          {!previewLoading && previewSrc && (
            <img src={previewSrc} alt="" className="projects-card-preview-img" />
          )}
          {!previewLoading && !previewSrc && (
            <span className="projects-card-preview-placeholder muted">Empty plan</span>
          )}
        </div>
        <div className="projects-card-body">
          {editing ? (
            <input
              className="project-name-input"
              value={nameDraft}
              onChange={(e) => onNameDraftChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onBlur={onCommitRename}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') onCommitRename();
                if (e.key === 'Escape') onCancelRename();
              }}
              autoFocus
            />
          ) : (
            <span
              className="projects-card-title"
              onClick={(e) => {
                e.stopPropagation();
                onStartRename();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  onStartRename();
                }
              }}
              role="button"
              tabIndex={0}
            >
              {project.name}
            </span>
          )}
          <time className="projects-card-date muted">{formatDate(project.updatedAt)}</time>
        </div>
      </button>

      <div className="projects-card-menu" ref={menuRef}>
        <button
          type="button"
          className="projects-card-menu-btn"
          aria-label="Project options"
          aria-expanded={menuOpen}
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((open) => !open);
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
            <circle cx="9" cy="3.5" r="1.5" fill="currentColor" />
            <circle cx="9" cy="9" r="1.5" fill="currentColor" />
            <circle cx="9" cy="14.5" r="1.5" fill="currentColor" />
          </svg>
        </button>
        {menuOpen && (
          <div className="projects-card-menu-popover" role="menu">
            <button
              type="button"
              className="projects-card-menu-item projects-card-menu-item--danger"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
