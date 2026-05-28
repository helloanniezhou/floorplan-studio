import { useFloorPlanStore } from '../../store/floorPlanStore';
import { PlanImageUploadButton } from '../PlanUploadControls';

export function PlanImageSettingsPanel() {
  const backgroundImage = useFloorPlanStore((s) => s.backgroundImage);
  const backgroundVisible = useFloorPlanStore((s) => s.backgroundVisible);
  const traceLoading = useFloorPlanStore((s) => s.traceLoading);
  const traceError = useFloorPlanStore((s) => s.traceError);
  const suggestions = useFloorPlanStore((s) => s.suggestions);
  const setBackgroundVisible = useFloorPlanStore((s) => s.setBackgroundVisible);
  const clearBackground = useFloorPlanStore((s) => s.clearBackground);
  const runWallTrace = useFloorPlanStore((s) => s.runWallTrace);

  if (!backgroundImage) {
    return (
      <>
        <p className="hint">
          Upload a floor plan image to use as a tracing background. After upload, set scale with the
          Scale tool.
        </p>
        <PlanImageUploadButton />
      </>
    );
  }

  return (
    <>
      <PlanImageUploadButton label="Replace image" />

      <p className="hint">
        The uploaded image is for tracing. When you select all walls (⌘A) and drag to reposition on
        the lot, the image moves with them.
      </p>

      <label className="field row lot-enable-row">
        <input
          type="checkbox"
          checked={backgroundVisible}
          onChange={(e) => setBackgroundVisible(e.target.checked)}
        />
        <span>Show uploaded image</span>
      </label>

      <p className="hint">
        Wall detection uses OpenCV in the background and can take several seconds on large
        images. It does not run automatically after upload.
      </p>
      <button
        type="button"
        className="toolbar-btn"
        disabled={traceLoading}
        onClick={() => void runWallTrace()}
      >
        {traceLoading ? 'Detecting walls…' : 'Detect walls (optional)'}
      </button>
      {traceError && <p className="hint project-status error">{traceError}</p>}
      {!traceLoading && suggestions.length > 0 && (
        <p className="hint">{suggestions.length} wall suggestions on canvas — click to accept.</p>
      )}

      <button type="button" className="toolbar-btn danger" onClick={clearBackground}>
        Remove image
      </button>
      <p className="hint">Removes the image only — your walls and lot stay on the plan.</p>
    </>
  );
}

export function planImageSummary(
  backgroundImage: string | undefined,
  backgroundVisible: boolean,
): string {
  if (!backgroundImage) return 'None';
  return backgroundVisible ? 'Visible' : 'Hidden';
}
