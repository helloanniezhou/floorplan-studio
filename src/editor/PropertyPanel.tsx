import { useFloorPlanStore } from '../store/floorPlanStore';
import { formatLength, wallLength } from '../lib/geometry/vectors';

export function PropertyPanel() {
  const selection = useFloorPlanStore((s) => s.selection);
  const walls = useFloorPlanStore((s) => s.walls);
  const openings = useFloorPlanStore((s) => s.openings);
  const unit = useFloorPlanStore((s) => s.unit);
  const wallHeight = useFloorPlanStore((s) => s.wallHeight);
  const scale = useFloorPlanStore((s) => s.scale);
  const gridEnabled = useFloorPlanStore((s) => s.gridEnabled);
  const updateWall = useFloorPlanStore((s) => s.updateWall);
  const updateWallLength = useFloorPlanStore((s) => s.updateWallLength);
  const deleteWall = useFloorPlanStore((s) => s.deleteWall);
  const updateOpening = useFloorPlanStore((s) => s.updateOpening);
  const deleteOpening = useFloorPlanStore((s) => s.deleteOpening);
  const setGridEnabled = useFloorPlanStore((s) => s.setGridEnabled);
  const straightenWalls = useFloorPlanStore((s) => s.straightenWalls);

  const selectedWall =
    selection?.type === 'wall' ? walls.find((w) => w.id === selection.id) : null;
  const selectedOpening =
    selection?.type === 'opening'
      ? openings.find((o) => o.id === selection.id)
      : null;

  return (
    <aside className="property-panel">
      <h2>Properties</h2>

      <label className="field">
        <span>Grid snap</span>
        <input
          type="checkbox"
          checked={gridEnabled}
          onChange={(e) => setGridEnabled(e.target.checked)}
        />
      </label>

      <label className="field">
        <span>Wall height ({unit})</span>
        <input
          type="number"
          min={1}
          step={0.1}
          value={wallHeight}
          onChange={(e) =>
            useFloorPlanStore.setState({ wallHeight: Number(e.target.value) || 2.4 })
          }
        />
      </label>

      {!scale && (
        <p className="hint">Set scale to enable real-world dimensions.</p>
      )}

      {selectedWall && (
        <div className="panel-block">
          <h3>Wall</h3>
          <label className="field">
            <span>Length ({unit})</span>
            <input
              type="number"
              min={0.01}
              step={0.01}
              value={Number(wallLength(selectedWall).toFixed(3))}
              onChange={(e) =>
                updateWallLength(selectedWall.id, Number(e.target.value) || 0.01)
              }
            />
          </label>
          <p className="readout">{formatLength(wallLength(selectedWall), unit)}</p>
          <label className="field">
            <span>Thickness ({unit})</span>
            <input
              type="number"
              min={0.05}
              step={0.01}
              value={selectedWall.thickness}
              onChange={(e) =>
                updateWall(selectedWall.id, { thickness: Number(e.target.value) || 0.15 })
              }
            />
          </label>
          <button type="button" className="toolbar-btn danger" onClick={() => deleteWall(selectedWall.id)}>
            Delete wall
          </button>
        </div>
      )}

      {selectedOpening && (
        <div className="panel-block">
          <h3>{selectedOpening.type === 'door' ? 'Door' : 'Window'}</h3>
          <label className="field">
            <span>Width ({unit})</span>
            <input
              type="number"
              min={0.3}
              step={0.05}
              value={selectedOpening.width}
              onChange={(e) =>
                updateOpening(selectedOpening.id, { width: Number(e.target.value) || 0.3 })
              }
            />
          </label>
          <label className="field">
            <span>Height ({unit})</span>
            <input
              type="number"
              min={0.3}
              step={0.05}
              value={selectedOpening.height}
              onChange={(e) =>
                updateOpening(selectedOpening.id, { height: Number(e.target.value) || 0.3 })
              }
            />
          </label>
          <label className="field">
            <span>Offset from start ({unit})</span>
            <input
              type="number"
              min={0}
              step={0.05}
              value={selectedOpening.offset}
              onChange={(e) =>
                updateOpening(selectedOpening.id, { offset: Number(e.target.value) || 0 })
              }
            />
          </label>
          {selectedOpening.type === 'window' && (
            <label className="field">
              <span>Sill height ({unit})</span>
              <input
                type="number"
                min={0}
                step={0.05}
                value={selectedOpening.sillHeight ?? 0.9}
                onChange={(e) =>
                  updateOpening(selectedOpening.id, {
                    sillHeight: Number(e.target.value) || 0,
                  })
                }
              />
            </label>
          )}
          <button
            type="button"
            className="toolbar-btn danger"
            onClick={() => deleteOpening(selectedOpening.id)}
          >
            Delete opening
          </button>
        </div>
      )}

      {!selectedWall && !selectedOpening && (
        <p className="hint">Select a wall or opening to edit properties.</p>
      )}

      <div className="panel-block">
        <button type="button" className="toolbar-btn" onClick={straightenWalls}>
          Straighten walls (90°)
        </button>
      </div>
    </aside>
  );
}
