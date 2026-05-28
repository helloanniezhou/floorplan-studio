import { useEffect } from 'react';
import { useFloorPlanStore } from '../store/floorPlanStore';
import { ProjectControls } from './ProjectControls';

function UndoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 14 4 9l5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 20v-7a4 4 0 0 0-4-4H4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M15 14l5-5-5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 20v-7a4 4 0 0 1 4-4h12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type Props = {
  onBackToProjects?: () => void;
};

export function ActionBar({ onBackToProjects }: Props) {
  const show3DPreview = useFloorPlanStore((s) => s.show3DPreview);
  const setShow3DPreview = useFloorPlanStore((s) => s.setShow3DPreview);
  const undoStackLength = useFloorPlanStore((s) => s.undoStack.length);
  const redoStackLength = useFloorPlanStore((s) => s.redoStack.length);
  const undo = useFloorPlanStore((s) => s.undo);
  const redo = useFloorPlanStore((s) => s.redo);

  const canUndo = undoStackLength > 0;
  const canRedo = redoStackLength > 0;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) undo();
      }
      if (e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        if (canRedo) redo();
      }
      if (e.key === 'y') {
        e.preventDefault();
        if (canRedo) redo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canUndo, canRedo, undo, redo]);

  return (
    <header className="action-bar">
      <ProjectControls onBackToProjects={onBackToProjects} />
      <div className="action-bar-group">
        <button
          type="button"
          className="action-bar-btn action-bar-btn--icon"
          onClick={undo}
          disabled={!canUndo}
          title="Undo (⌘Z)"
          aria-label="Undo"
        >
          <UndoIcon />
        </button>
        <button
          type="button"
          className="action-bar-btn action-bar-btn--icon"
          onClick={redo}
          disabled={!canRedo}
          title="Redo (⌘⇧Z)"
          aria-label="Redo"
        >
          <RedoIcon />
        </button>
      </div>

      <div className="action-bar-group">
        {show3DPreview ? (
          <button
            type="button"
            className="action-bar-btn"
            onClick={() => setShow3DPreview(false)}
          >
            Back to floor plan
          </button>
        ) : (
          <button
            type="button"
            className="action-bar-btn primary"
            onClick={() => setShow3DPreview(true)}
          >
            Preview in 3D
          </button>
        )}
      </div>
    </header>
  );
}
