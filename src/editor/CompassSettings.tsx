import { useFloorPlanStore } from '../store/floorPlanStore';
import { SUN_TIME_OPTIONS, normalizeNorthAngle } from '../lib/compass/orientation';
import type { SunTime } from '../lib/compass/orientation';

const SNAP_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

export function CompassSettings() {
  const northAngleDeg = useFloorPlanStore((s) => s.northAngleDeg);
  const sunTime = useFloorPlanStore((s) => s.sunTime);
  const setNorthAngleDeg = useFloorPlanStore((s) => s.setNorthAngleDeg);
  const setSunTime = useFloorPlanStore((s) => s.setSunTime);

  const rotate = (delta: number) => {
    setNorthAngleDeg(normalizeNorthAngle(northAngleDeg + delta));
  };

  return (
    <>
      <p className="toolbar-label">North direction</p>
      <p className="hint compass-hint">
        Set which way is north on your plan. 3D lighting follows (morning sun from the east).
      </p>

      <div className="compass-dial-wrap" aria-hidden>
        <div
          className="compass-dial"
          style={{ transform: `rotate(${northAngleDeg}deg)` }}
        >
          <span className="compass-dial-n">N</span>
          <span className="compass-dial-e">E</span>
          <span className="compass-dial-s">S</span>
          <span className="compass-dial-w">W</span>
        </div>
      </div>

      <div className="compass-controls">
        <button type="button" className="toolbar-btn" onClick={() => rotate(-90)} title="Rotate 90° left">
          ↺ 90°
        </button>
        <button type="button" className="toolbar-btn" onClick={() => rotate(90)} title="Rotate 90° right">
          90° ↻
        </button>
      </div>

      <label className="field">
        <span>North angle (° clockwise from top)</span>
        <input
          type="range"
          min={0}
          max={359}
          value={Math.round(northAngleDeg)}
          onChange={(e) => setNorthAngleDeg(Number(e.target.value))}
        />
        <span className="readout">{Math.round(northAngleDeg)}°</span>
      </label>

      <div className="compass-snap-row">
        {SNAP_ANGLES.map((deg) => (
          <button
            key={deg}
            type="button"
            className={`compass-snap-btn ${Math.round(northAngleDeg) === deg ? 'active' : ''}`}
            onClick={() => setNorthAngleDeg(deg)}
            title={`North at ${deg}°`}
          >
            {deg}°
          </button>
        ))}
      </div>

      <p className="toolbar-label">3D sun</p>
      <div className="sun-time-toggle" role="group" aria-label="Time of day for lighting">
        {SUN_TIME_OPTIONS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={`sun-time-btn ${sunTime === id ? 'active' : ''}`}
            onClick={() => setSunTime(id as SunTime)}
          >
            {label}
          </button>
        ))}
      </div>
    </>
  );
}
