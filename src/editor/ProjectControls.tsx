import { useEffect, useState } from 'react';
import { useProjectPersistence } from '../hooks/useProjectPersistence';
import { SaveAsDialog } from './SaveAsDialog';

function saveStatusLabel(status: string, detail: string | null): string {
  if (status === 'saved' && detail) {
    return 'Saved in browser';
  }
  switch (status) {
    case 'dirty':
      return 'Unsaved changes';
    case 'saving':
      return 'Saving…';
    case 'saved':
      return 'Saved';
    case 'error':
      return 'Save failed';
    default:
      return '';
  }
}

type Props = {
  onBackToProjects?: () => void;
};

export function ProjectControls({ onBackToProjects }: Props) {
  const {
    storageReady,
    authEnabled,
    authLoading,
    cloudMode,
    projectName,
    saveStatus,
    saveDetail,
    saveNow,
    saveAs,
    renameProject,
  } = useProjectPersistence();

  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(projectName);

  useEffect(() => {
    setNameDraft(projectName);
  }, [projectName]);

  if (!storageReady) {
    const loadingLabel =
      authEnabled && authLoading
        ? 'Checking login…'
        : cloudMode
          ? 'Loading saved plans…'
          : 'Preparing editor…';
    return (
      <div className="project-controls">
        <span className="project-status muted">{loadingLabel}</span>
      </div>
    );
  }

  const commitName = () => {
    setEditingName(false);
    const next = nameDraft.trim() || 'Untitled plan';
    setNameDraft(next);
    if (next !== projectName) void renameProject(next);
  };

  return (
    <>
      <div className="project-controls">
        {onBackToProjects && (
          <button
            type="button"
            className="project-back-btn action-bar-btn"
            onClick={onBackToProjects}
            title="Back to projects"
            aria-label="Back to projects"
          >
            ←
          </button>
        )}
        {editingName ? (
          <input
            className="project-name-input"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitName();
              if (e.key === 'Escape') {
                setNameDraft(projectName);
                setEditingName(false);
              }
            }}
            autoFocus
            aria-label="Plan name"
          />
        ) : (
          <button
            type="button"
            className="project-name-btn"
            onClick={() => {
              setNameDraft(projectName);
              setEditingName(true);
            }}
            title="Click to rename"
          >
            {projectName}
          </button>
        )}

        <span
          className={`project-status ${
            saveStatus === 'error'
              ? 'error'
              : saveDetail
                ? 'warn'
                : 'muted'
          }`}
          title={
            saveDetail ??
            (cloudMode
              ? 'Projects sync to your Supabase account; a copy is always kept in this browser.'
              : 'Plans are stored in this browser (IndexedDB)')
          }
        >
          {saveStatusLabel(saveStatus, saveDetail)}
        </span>

        <div className="project-actions">
          <button type="button" className="action-bar-btn" onClick={() => void saveNow()} title="Save now">
            Save
          </button>
          <button
            type="button"
            className="action-bar-btn"
            onClick={() => setSaveAsOpen(true)}
            title="Save a copy under a new name"
          >
            Save as…
          </button>
        </div>
      </div>

      <SaveAsDialog
        open={saveAsOpen}
        defaultName={`${projectName} copy`}
        onClose={() => setSaveAsOpen(false)}
        onSave={(name) => void saveAs(name)}
      />

    </>
  );
}
