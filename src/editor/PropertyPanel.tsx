import { useState } from 'react';
import { useFloorPlanStore } from '../store/floorPlanStore';
import { getSelectedWallIds } from '../lib/geometry/selection';
import { formatLength, wallLength } from '../lib/geometry/vectors';
import {
  FURNITURE_LABELS,
  LANDSCAPE_LABELS,
} from '../lib/placeables/defaults';

export function PropertyPanel() {
  const [minimized, setMinimized] = useState(false);
  const selection = useFloorPlanStore((s) => s.selection);
  const setWallSelection = useFloorPlanStore((s) => s.setWallSelection);
  const deleteSelectedWalls = useFloorPlanStore((s) => s.deleteSelectedWalls);
  const gridEnabled = useFloorPlanStore((s) => s.gridEnabled);
  const setGridEnabled = useFloorPlanStore((s) => s.setGridEnabled);
  const walls = useFloorPlanStore((s) => s.walls);
  const openings = useFloorPlanStore((s) => s.openings);
  const furniture = useFloorPlanStore((s) => s.furniture) ?? [];
  const landscape = useFloorPlanStore((s) => s.landscape) ?? [];
  const unit = useFloorPlanStore((s) => s.unit);

  const updateWall = useFloorPlanStore((s) => s.updateWall);
  const updateWallLength = useFloorPlanStore((s) => s.updateWallLength);
  const deleteWall = useFloorPlanStore((s) => s.deleteWall);
  const updateOpening = useFloorPlanStore((s) => s.updateOpening);
  const deleteOpening = useFloorPlanStore((s) => s.deleteOpening);
  const updateFurniture = useFloorPlanStore((s) => s.updateFurniture);
  const deleteFurniture = useFloorPlanStore((s) => s.deleteFurniture);
  const updateLandscape = useFloorPlanStore((s) => s.updateLandscape);
  const deleteLandscape = useFloorPlanStore((s) => s.deleteLandscape);

  const selectedWallIds = getSelectedWallIds(selection);
  const focus =
    selection?.type === 'walls' && selection.focus ? selection.focus : null;
  const selectedWall =
    focus && selection?.type === 'walls'
      ? walls.find((w) => w.id === focus.id)
      : selectedWallIds.length === 1
        ? walls.find((w) => w.id === selectedWallIds[0])
        : null;
  const wallAnchor = focus?.anchor ?? 'start';
  const selectedOpening =
    selection?.type === 'opening'
      ? openings.find((o) => o.id === selection.id)
      : null;
  const selectedFurniture =
    selection?.type === 'furniture'
      ? furniture.find((f) => f.id === selection.id)
      : null;
  const selectedLandscape =
    selection?.type === 'landscape'
      ? landscape.find((l) => l.id === selection.id)
      : null;

  const selectedPlaceable = selectedFurniture ?? selectedLandscape;

  return (
    <aside className={`property-panel ${minimized ? 'property-panel--minimized' : ''}`}>
      <div className="property-panel-header">
        {!minimized && <h2>Properties</h2>}
        <button
          type="button"
          className="property-panel-toggle"
          onClick={() => setMinimized((v) => !v)}
          aria-label={minimized ? 'Expand properties' : 'Minimize properties'}
        >
          {minimized ? '◂' : '▸'}
        </button>
      </div>

      {!minimized && (
        <div className="property-panel-body">
      <label className="field">
        <span>Grid snap</span>
        <input
          type="checkbox"
          checked={gridEnabled}
          onChange={(e) => setGridEnabled(e.target.checked)}
        />
      </label>

      {selectedWallIds.length > 1 && selection?.type === 'walls' && (
        <div className="panel-block">
          <h3>{selectedWallIds.length} walls selected</h3>
          <p className="hint">Drag to move on the lot. ⌘A selects all. Image moves when all walls move.</p>
          <button type="button" className="toolbar-btn danger" onClick={deleteSelectedWalls}>
            Delete selected
          </button>
        </div>
      )}

      {selectedWall && selection?.type === 'walls' && selectedWallIds.length === 1 && (
        <div className="panel-block">
          <h3>Wall</h3>
          <div className="anchor-toggle" role="group" aria-label="Fixed end for length">
            <button
              type="button"
              className={`unit-toggle-btn ${wallAnchor === 'start' ? 'active' : ''}`}
              onClick={() =>
                setWallSelection([selectedWall.id], { id: selectedWall.id, anchor: 'start' })
              }
            >
              Fix start
            </button>
            <button
              type="button"
              className={`unit-toggle-btn ${wallAnchor === 'end' ? 'active' : ''}`}
              onClick={() =>
                setWallSelection([selectedWall.id], { id: selectedWall.id, anchor: 'end' })
              }
            >
              Fix end
            </button>
          </div>
          <label className="field">
            <span>Length ({unit})</span>
            <input
              type="number"
              min={0.01}
              step={0.01}
              value={Number(wallLength(selectedWall).toFixed(3))}
              onChange={(e) =>
                updateWallLength(selectedWall.id, Number(e.target.value) || 0.01, wallAnchor)
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

      {selectedPlaceable && (
        <div className="panel-block">
          <h3>
            {selectedFurniture
              ? FURNITURE_LABELS[selectedFurniture.kind]
              : LANDSCAPE_LABELS[selectedLandscape!.kind]}
          </h3>
          <label className="field">
            <span>Width ({unit})</span>
            <input
              type="number"
              min={0.1}
              step={0.05}
              value={selectedPlaceable.width}
              onChange={(e) => {
                const width = Number(e.target.value) || 0.1;
                if (selectedFurniture) {
                  updateFurniture(selectedFurniture.id, { width });
                } else {
                  updateLandscape(selectedLandscape!.id, { width });
                }
              }}
            />
          </label>
          <label className="field">
            <span>Depth ({unit})</span>
            <input
              type="number"
              min={0.1}
              step={0.05}
              value={selectedPlaceable.depth}
              onChange={(e) => {
                const depth = Number(e.target.value) || 0.1;
                if (selectedFurniture) {
                  updateFurniture(selectedFurniture.id, { depth });
                } else {
                  updateLandscape(selectedLandscape!.id, { depth });
                }
              }}
            />
          </label>
          <label className="field">
            <span>Height ({unit})</span>
            <input
              type="number"
              min={0.02}
              step={0.05}
              value={selectedPlaceable.height}
              onChange={(e) => {
                const height = Number(e.target.value) || 0.02;
                if (selectedFurniture) {
                  updateFurniture(selectedFurniture.id, { height });
                } else {
                  updateLandscape(selectedLandscape!.id, { height });
                }
              }}
            />
          </label>
          <label className="field">
            <span>Rotation (°)</span>
            <input
              type="number"
              step={5}
              value={Math.round((selectedPlaceable.rotation * 180) / Math.PI)}
              onChange={(e) => {
                const rotation = ((Number(e.target.value) || 0) * Math.PI) / 180;
                if (selectedFurniture) {
                  updateFurniture(selectedFurniture.id, { rotation });
                } else {
                  updateLandscape(selectedLandscape!.id, { rotation });
                }
              }}
            />
          </label>
          <label className="field">
            <span>Position X ({unit})</span>
            <input
              type="number"
              step={0.05}
              value={Number(selectedPlaceable.position.x.toFixed(3))}
              onChange={(e) => {
                const position = {
                  ...selectedPlaceable.position,
                  x: Number(e.target.value) || 0,
                };
                if (selectedFurniture) {
                  updateFurniture(selectedFurniture.id, { position });
                } else {
                  updateLandscape(selectedLandscape!.id, { position });
                }
              }}
            />
          </label>
          <label className="field">
            <span>Position Y ({unit})</span>
            <input
              type="number"
              step={0.05}
              value={Number(selectedPlaceable.position.y.toFixed(3))}
              onChange={(e) => {
                const position = {
                  ...selectedPlaceable.position,
                  y: Number(e.target.value) || 0,
                };
                if (selectedFurniture) {
                  updateFurniture(selectedFurniture.id, { position });
                } else {
                  updateLandscape(selectedLandscape!.id, { position });
                }
              }}
            />
          </label>
          <button
            type="button"
            className="toolbar-btn danger"
            onClick={() => {
              if (selectedFurniture) {
                deleteFurniture(selectedFurniture.id);
              } else {
                deleteLandscape(selectedLandscape!.id);
              }
            }}
          >
            Delete item
          </button>
        </div>
      )}
        </div>
      )}
    </aside>
  );
}
