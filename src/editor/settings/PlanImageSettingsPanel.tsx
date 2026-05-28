import { useFloorPlanStore } from '../../store/floorPlanStore';

export function PlanImageSettingsPanel() {
  const backgroundImage = useFloorPlanStore((s) => s.backgroundImage);
  const backgroundVisible = useFloorPlanStore((s) => s.backgroundVisible);
  const setBackgroundVisible = useFloorPlanStore((s) => s.setBackgroundVisible);
  const clearBackground = useFloorPlanStore((s) => s.clearBackground);

  if (!backgroundImage) {
    return (
      <p className="hint">
        No plan image uploaded. Use <strong>Upload plan</strong> in the top action bar to add a tracing
        background.
      </p>
    );
  }

  return (
    <>
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
