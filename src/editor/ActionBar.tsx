import { useEffect } from 'react';
import { useFloorPlanStore } from '../store/floorPlanStore';
import { AuthControls } from './AuthControls';
import { PlanUploadControls } from './PlanUploadControls';
import { ProjectControls } from './ProjectControls';

type Props = {
  projectsView: boolean;
  onToggleProjectsView: () => void;
};

export function ActionBar({ projectsView, onToggleProjectsView }: Props) {
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
      <ProjectControls />
      <PlanUploadControls />
      <div className="action-bar-group">
        <button type="button" className="action-bar-btn" onClick={onToggleProjectsView}>
          {projectsView ? 'Back to editor' : 'Projects'}
        </button>
      </div>

      <div className="action-bar-group">
        <button
          type="button"
          className="action-bar-btn"
          onClick={undo}
          disabled={!canUndo}
          title="Undo (⌘Z)"
        >
          Undo
        </button>
        <button
          type="button"
          className="action-bar-btn"
          onClick={redo}
          disabled={!canRedo}
          title="Redo (⌘⇧Z)"
        >
          Redo
        </button>
      </div>

      <div className="action-bar-group">
        <AuthControls />
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
