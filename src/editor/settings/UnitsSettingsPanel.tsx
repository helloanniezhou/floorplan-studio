import { useFloorPlanStore } from '../../store/floorPlanStore';
import type { FloorPlanUnit } from '../../types/floorPlan';

export function UnitsSettingsPanel() {
  const unit = useFloorPlanStore((s) => s.unit);
  const setUnit = useFloorPlanStore((s) => s.setUnit);

  const selectUnit = (next: FloorPlanUnit) => {
    if (next !== unit) setUnit(next);
  };

  return (
    <>
      <p className="hint">Measurement unit for walls, openings, and lot size.</p>
      <div className="unit-toggle" role="group" aria-label="Measurement unit">
        <button
          type="button"
          className={`unit-toggle-btn ${unit === 'ft' ? 'active' : ''}`}
          onClick={() => selectUnit('ft')}
        >
          Feet (ft)
        </button>
        <button
          type="button"
          className={`unit-toggle-btn ${unit === 'm' ? 'active' : ''}`}
          onClick={() => selectUnit('m')}
        >
          Meters (m)
        </button>
      </div>
      <p className="hint">Switching units converts all dimensions on the plan.</p>
    </>
  );
}
