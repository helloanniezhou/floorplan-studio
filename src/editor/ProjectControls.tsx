import { useState } from 'react';
import { useProjectPersistence } from '../hooks/useProjectPersistence';
import { OpenProjectDialog } from './OpenProjectDialog';
import { SaveAsDialog } from './SaveAsDialog';

function saveStatusLabel(status: string): string {
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

export function ProjectControls() {
  const {
    storageReady,
    projectId,
    projectName,
    saveStatus,
    saveNow,
    saveAs,
    renameProject,
    loadProject,
    createNewProject,
    removeProject,
    fetchProjectList,
  } = useProjectPersistence();

  const [openDialog, setOpenDialog] = useState(false);
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(projectName);

  if (!storageReady) {
    return (
      <div className="project-controls">
        <span className="project-status muted">Loading saved plans…</span>
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
          className={`project-status ${saveStatus === 'error' ? 'error' : 'muted'}`}
          title="Plans are stored in this browser (IndexedDB)"
        >
          {saveStatusLabel(saveStatus)}
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
          <button type="button" className="action-bar-btn" onClick={() => setOpenDialog(true)}>
            Open…
          </button>
          <button
            type="button"
            className="action-bar-btn"
            onClick={() => {
              if (
                window.confirm(
                  'Start a new plan? The current plan stays saved — you can open it again from Open.',
                )
              ) {
                void createNewProject();
              }
            }}
          >
            New
          </button>
        </div>
      </div>

      <SaveAsDialog
        open={saveAsOpen}
        defaultName={`${projectName} copy`}
        onClose={() => setSaveAsOpen(false)}
        onSave={(name) => void saveAs(name)}
      />

      <OpenProjectDialog
        open={openDialog}
        currentId={projectId}
        onClose={() => setOpenDialog(false)}
        onOpen={(id) => void loadProject(id)}
        onDelete={(id) => void removeProject(id)}
        fetchProjects={fetchProjectList}
      />
    </>
  );
}
