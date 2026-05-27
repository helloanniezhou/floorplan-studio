import { useState } from 'react';
import { useFloorPlanStore } from '../store/floorPlanStore';
import { distance } from '../lib/geometry/vectors';

export function ScaleDialog() {
  const scaleDraft = useFloorPlanStore((s) => s.scaleDraft);
  const scale = useFloorPlanStore((s) => s.scale);
  const unit = useFloorPlanStore((s) => s.unit);
  const applyScale = useFloorPlanStore((s) => s.applyScale);
  const resetScaleDraft = useFloorPlanStore((s) => s.resetScaleDraft);
  const [lengthInput, setLengthInput] = useState('3');

  if (scale) {
    return (
      <div className="scale-banner ok">
        Scale set: {scale.pixelsPerUnit.toFixed(1)} px / {unit}
      </div>
    );
  }

  if (!scaleDraft.pointA) {
    return (
      <div className="scale-banner">
        Select Scale tool, then click two points on a known wall length.
      </div>
    );
  }

  if (!scaleDraft.pointB) {
    return (
      <div className="scale-banner">
        Click the second point on the same wall.
        <button type="button" className="link-btn" onClick={resetScaleDraft}>
          Cancel
        </button>
      </div>
    );
  }

  const pixelDist = distance(scaleDraft.pointA, scaleDraft.pointB);

  return (
    <div className="scale-banner active">
      <label>
        Known length ({unit}):
        <input
          type="number"
          min={0.1}
          step={0.1}
          value={lengthInput}
          onChange={(e) => setLengthInput(e.target.value)}
        />
      </label>
      <span className="muted">({pixelDist.toFixed(0)} px)</span>
      <button
        type="button"
        className="toolbar-btn primary"
        onClick={() => applyScale(Number(lengthInput) || 1)}
      >
        Apply scale
      </button>
      <button type="button" className="link-btn" onClick={resetScaleDraft}>
        Reset
      </button>
    </div>
  );
}
