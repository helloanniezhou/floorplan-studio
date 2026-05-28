import { useState } from 'react';
import { useFloorPlanStore } from '../store/floorPlanStore';
import { canAddFloorLevel, canRemoveFloorLevel, sortLevels } from '../lib/plan/levels';
import type { PlanLevel } from '../types/floorPlan';
import { ConfirmDialog } from './ConfirmDialog';

export function PlanLayoutSwitcher() {
  const levels = useFloorPlanStore((s) => s.levels);
  const activeLevelId = useFloorPlanStore((s) => s.activeLevelId);
  const setActiveLevelId = useFloorPlanStore((s) => s.setActiveLevelId);
  const addFloorLevel = useFloorPlanStore((s) => s.addFloorLevel);
  const removeFloorLevel = useFloorPlanStore((s) => s.removeFloorLevel);

  const [pendingDelete, setPendingDelete] = useState<PlanLevel | null>(null);

  const sorted = sortLevels(levels);
  const showAddFloor = canAddFloorLevel(levels);
  const floorLevels = sorted.filter((l) => l.kind === 'floor');

  return (
    <>
      <div className="layout-switcher-wrap">
        <div className="layout-switcher" role="tablist" aria-label="Floor level">
          {sorted.map((level) => {
            const canDelete = canRemoveFloorLevel(levels, level.id);
            const floorNumber =
              level.kind === 'floor' ? floorLevels.indexOf(level) + 1 : null;

            return (
              <div key={level.id} className="layout-switcher-item">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeLevelId === level.id}
                  className={`layout-switcher-btn ${activeLevelId === level.id ? 'active' : ''}`}
                  onClick={() => setActiveLevelId(level.id)}
                >
                  <span className="layout-switcher-icon">
                    {level.kind === 'roof' ? '⌂' : floorNumber}
                  </span>
                  <span className="layout-switcher-label">{level.name}</span>
                </button>
                {canDelete && (
                  <button
                    type="button"
                    className="layout-switcher-delete"
                    aria-label={`Delete ${level.name}`}
                    onClick={() => setPendingDelete(level)}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {showAddFloor && (
          <button
            type="button"
            className="layout-switcher-add"
            onClick={() => addFloorLevel()}
          >
            + Add floor
          </button>
        )}
      </div>

      <ConfirmDialog
        open={pendingDelete != null}
        title="Delete floor?"
        message={
          pendingDelete
            ? `Delete “${pendingDelete.name}” and all walls, openings, and lights on that level? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete floor"
        onConfirm={() => {
          if (pendingDelete) removeFloorLevel(pendingDelete.id);
        }}
        onClose={() => setPendingDelete(null)}
      />
    </>
  );
}
