import { useMemo } from 'react';
import { useFloorPlanStore } from '../store/floorPlanStore';
import { getSelectedWallIds } from '../lib/geometry/selection';
import {
  computeEnclosedAreasFromWalls,
  formatEnclosedAreaSummary,
} from '../lib/geometry/enclosedArea';

export function EnclosedAreaReadout() {
  const walls = useFloorPlanStore((s) => s.walls);
  const selection = useFloorPlanStore((s) => s.selection);
  const unit = useFloorPlanStore((s) => s.unit);

  const selectedIds = getSelectedWallIds(selection);

  const summary = useMemo(() => {
    if (selection?.type !== 'walls' || selectedIds.length === 0) {
      return null;
    }
    const result = computeEnclosedAreasFromWalls(walls, selectedIds);
    return formatEnclosedAreaSummary(result, unit);
  }, [walls, selection, selectedIds, unit]);

  if (!summary) return null;

  return (
    <div className="enclosed-area-readout" role="status" aria-live="polite">
      {summary}
    </div>
  );
}
