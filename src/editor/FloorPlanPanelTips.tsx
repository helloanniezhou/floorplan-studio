import { useMemo } from 'react';
import { useFloorPlanStore } from '../store/floorPlanStore';
import { getSelectedWallIds } from '../lib/geometry/selection';
import {
  computeEnclosedAreasFromWalls,
  formatEnclosedAreaSummary,
} from '../lib/geometry/enclosedArea';

export function FloorPlanPanelTips() {
  const walls = useFloorPlanStore((s) => s.walls);
  const selection = useFloorPlanStore((s) => s.selection);
  const scale = useFloorPlanStore((s) => s.scale);
  const scaleDraft = useFloorPlanStore((s) => s.scaleDraft);
  const unit = useFloorPlanStore((s) => s.unit);

  const selectedIds = getSelectedWallIds(selection);

  const enclosedSummary = useMemo(() => {
    if (selection?.type !== 'walls' || selectedIds.length === 0) {
      return null;
    }
    const result = computeEnclosedAreasFromWalls(walls, selectedIds);
    return formatEnclosedAreaSummary(result, unit);
  }, [walls, selection, selectedIds, unit]);

  const showScaleSetupTip = scale == null && scaleDraft.pointA == null;
  const showEnclosedTip = enclosedSummary != null;

  if (!showScaleSetupTip && !showEnclosedTip) {
    return null;
  }

  return (
    <div className="floor-plan-panel-tips" role="status" aria-live="polite">
      {showEnclosedTip && <p className="floor-plan-tip">{enclosedSummary}</p>}
      {showScaleSetupTip && (
        <p className="floor-plan-tip">
          Select Scale tool, then click two points on a known wall length.
        </p>
      )}
    </div>
  );
}
