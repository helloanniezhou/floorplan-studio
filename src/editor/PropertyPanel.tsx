import { useEffect, useState } from 'react';
import { useFloorPlanStore } from '../store/floorPlanStore';
import { useActiveLayoutGeometry } from '../hooks/useActiveLayoutGeometry';
import { LIGHT_KIND_LABELS } from '../lib/lights/defaults';
import {
  getSelectedFurnitureIds,
  getSelectedLandscapeIds,
  getSelectedOpeningIds,
  getSelectedWallIds,
} from '../lib/geometry/selection';
import { formatLength, wallLength } from '../lib/geometry/vectors';
import {
  FURNITURE_LABELS,
  LANDSCAPE_LABELS,
} from '../lib/placeables/defaults';
import {
  BED_SIZE_OPTIONS,
  bedDimensionsForSize,
  bedSizeLabel,
  DEFAULT_BED_SIZE,
} from '../lib/placeables/beds';
import type { BedSize } from '../types/floorPlan';
import {
  furnitureBottomElevation,
  furnitureMount,
  furnitureTopElevation,
} from '../lib/placeables/mount';
import { resizePlacedFromAnchorCorner } from '../lib/placeables/geometry';
import type { Furniture, LandscapeElement } from '../types/floorPlan';
import { LotSizeEditor } from './LotSizeEditor';

export function PropertyPanel() {
  const [minimized, setMinimized] = useState(false);
  const [gridSizeDraft, setGridSizeDraft] = useState('');
  const tool = useFloorPlanStore((s) => s.tool);
  const wallDraftStart = useFloorPlanStore((s) => s.wallDraftStart);
  const pendingLength = useFloorPlanStore((s) => s.pendingLength);
  const setPendingLength = useFloorPlanStore((s) => s.setPendingLength);
  const selection = useFloorPlanStore((s) => s.selection);
  const setWallSelection = useFloorPlanStore((s) => s.setWallSelection);
  const deleteSelectedWalls = useFloorPlanStore((s) => s.deleteSelectedWalls);
  const deleteSelection = useFloorPlanStore((s) => s.deleteSelection);
  const gridEnabled = useFloorPlanStore((s) => s.gridEnabled);
  const setGridEnabled = useFloorPlanStore((s) => s.setGridEnabled);
  const gridSize = useFloorPlanStore((s) => s.gridSize);
  const setGridSize = useFloorPlanStore((s) => s.setGridSize);
  const scale = useFloorPlanStore((s) => s.scale);

  useEffect(() => {
    setGridSizeDraft(String(gridSize));
  }, [gridSize]);
  const setTool = useFloorPlanStore((s) => s.setTool);
  const { walls, openings, lights } = useActiveLayoutGeometry();
  const furniture = useFloorPlanStore((s) => s.furniture) ?? [];
  const landscape = useFloorPlanStore((s) => s.landscape) ?? [];
  const unit = useFloorPlanStore((s) => s.unit);
  const wallHeight = useFloorPlanStore((s) => s.wallHeight);

  const updateWall = useFloorPlanStore((s) => s.updateWall);
  const updateWallLength = useFloorPlanStore((s) => s.updateWallLength);
  const deleteWall = useFloorPlanStore((s) => s.deleteWall);
  const updateOpening = useFloorPlanStore((s) => s.updateOpening);
  const deleteOpening = useFloorPlanStore((s) => s.deleteOpening);
  const updateFurniture = useFloorPlanStore((s) => s.updateFurniture);
  const deleteFurniture = useFloorPlanStore((s) => s.deleteFurniture);
  const updateLandscape = useFloorPlanStore((s) => s.updateLandscape);
  const deleteLandscape = useFloorPlanStore((s) => s.deleteLandscape);
  const updateLight = useFloorPlanStore((s) => s.updateLight);
  const deleteLight = useFloorPlanStore((s) => s.deleteLight);

  const patchFurnitureSize = (
    item: Furniture,
    patch: Partial<{ width: number; depth: number; height: number }>,
  ) => {
    if (patch.width !== undefined || patch.depth !== undefined) {
      updateFurniture(item.id, {
        ...resizePlacedFromAnchorCorner(item, patch),
        ...(patch.height !== undefined ? { height: patch.height } : {}),
      });
      return;
    }
    updateFurniture(item.id, patch);
  };

  const patchLandscapeSize = (
    item: LandscapeElement,
    patch: Partial<{ width: number; depth: number; height: number }>,
  ) => {
    if (patch.width !== undefined || patch.depth !== undefined) {
      updateLandscape(item.id, {
        ...resizePlacedFromAnchorCorner(item, patch),
        ...(patch.height !== undefined ? { height: patch.height } : {}),
      });
      return;
    }
    updateLandscape(item.id, patch);
  };

  const selectedWallIds = getSelectedWallIds(selection);
  const selectedOpeningIds = getSelectedOpeningIds(selection);
  const selectedFurnitureIds = getSelectedFurnitureIds(selection);
  const selectedLandscapeIds = getSelectedLandscapeIds(selection);
  const focus =
    selection?.type === 'walls'
      ? selection.focus
      : selection?.type === 'mixed' && selection.focus?.type === 'wall'
        ? { id: selection.focus.id, anchor: selection.focus.anchor }
        : null;
  const selectedWall =
    focus && (selection?.type === 'walls' || selection?.type === 'mixed')
      ? walls.find((w) => w.id === focus.id)
      : selectedWallIds.length === 1
        ? walls.find((w) => w.id === selectedWallIds[0])
        : null;
  const wallAnchor = focus?.anchor ?? 'start';
  const selectedOpening =
    selectedOpeningIds.length === 1
      ? openings.find((o) => o.id === selectedOpeningIds[0])
      : null;
  const selectedFurniture =
    selectedFurnitureIds.length === 1
      ? furniture.find((f) => f.id === selectedFurnitureIds[0])
      : null;
  const selectedLandscape =
    selectedLandscapeIds.length === 1
      ? landscape.find((l) => l.id === selectedLandscapeIds[0])
      : null;
  const selectedLight =
    selection?.type === 'light'
      ? lights.find((l) => l.id === selection.id)
      : null;

  const selectedPlaceable = selectedFurniture ?? selectedLandscape;
  const showPlanProperties = selection == null;

  const applyGridSize = () => {
    const next = parseFloat(gridSizeDraft);
    if (!(next > 0)) {
      setGridSizeDraft(String(gridSize));
      return;
    }
    if (Math.abs(next - gridSize) > 1e-9) setGridSize(next);
  };

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
      {showPlanProperties && (
        <div className="panel-block">
          <h3>Plan</h3>

          <h4 className="panel-subheading">Lot size</h4>
          <LotSizeEditor />

          <h4 className="panel-subheading">Grid</h4>
          <label className="field row lot-enable-row">
            <input
              type="checkbox"
              checked={gridEnabled}
              onChange={(e) => setGridEnabled(e.target.checked)}
            />
            <span>Snap to grid</span>
          </label>
          <label className="field">
            <span>Grid size ({unit})</span>
            <input
              type="number"
              min={unit === 'ft' ? 0.05 : 0.01}
              step={unit === 'ft' ? 0.05 : 0.01}
              value={gridSizeDraft}
              disabled={!gridEnabled}
              onChange={(e) => {
                const raw = e.target.value;
                setGridSizeDraft(raw);
                const next = parseFloat(raw);
                if (next > 0 && !/[.\-]$/.test(raw.trim())) {
                  setGridSize(next);
                }
              }}
              onBlur={applyGridSize}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  applyGridSize();
                  (e.target as HTMLInputElement).blur();
                }
              }}
            />
          </label>

          <h4 className="panel-subheading">Scale</h4>
          {scale ? (
            <p className="readout">
              {scale.pixelsPerUnit.toFixed(1)} px / {unit}
            </p>
          ) : (
            <>
              <p className="readout muted">Not set</p>
              <button type="button" className="toolbar-btn" onClick={() => setTool('scale')}>
                Set scale…
              </button>
            </>
          )}
        </div>
      )}

      {tool === 'wall' && wallDraftStart && (
        <div className="panel-block">
          <h3>Drawing wall</h3>
          <label className="field">
            <span>Length ({unit})</span>
            <input
              type="number"
              min={0.01}
              step={0.01}
              value={pendingLength}
              placeholder="optional — Enter to fix"
              onChange={(e) => setPendingLength(e.target.value)}
            />
          </label>
          <p className="hint">
            Snap to green corners · Shift locks 45°/90° · Esc to stop
          </p>
        </div>
      )}

      {selection?.type === 'mixed' && (
        <div className="panel-block">
          <h3>Selection</h3>
          <ul className="readout">
            {selectedWallIds.length > 0 && <li>{selectedWallIds.length} walls</li>}
            {selectedOpeningIds.length > 0 && (
              <li>
                {selectedOpeningIds.length} door
                {selectedOpeningIds.length === 1 ? '' : 's'}/window
                {selectedOpeningIds.length === 1 ? '' : 's'}
              </li>
            )}
            {selectedFurnitureIds.length > 0 && (
              <li>{selectedFurnitureIds.length} furniture</li>
            )}
            {selectedLandscapeIds.length > 0 && (
              <li>{selectedLandscapeIds.length} landscape</li>
            )}
          </ul>
          <p className="hint">
            Drag to move walls and furniture. Shift+click to add or remove items. Delete removes
            all selected.
          </p>
          <button type="button" className="toolbar-btn danger" onClick={deleteSelection}>
            Delete selected
          </button>
        </div>
      )}

      {selectedWallIds.length > 1 && selection?.type === 'walls' && (
        <div className="panel-block">
          <h3>{selectedWallIds.length} walls selected</h3>
          <p className="hint">Drag to move on the lot. ⌘A selects all. Delete or Backspace removes selection.</p>
          <button type="button" className="toolbar-btn danger" onClick={deleteSelectedWalls}>
            Delete selected
          </button>
        </div>
      )}

      {selectedOpeningIds.length > 1 && selection?.type === 'opening' && (
        <div className="panel-block">
          <h3>
            {selectedOpeningIds.length} openings selected
          </h3>
          <p className="hint">Delete or Backspace removes all selected doors and windows.</p>
          <button type="button" className="toolbar-btn danger" onClick={deleteSelection}>
            Delete selected
          </button>
        </div>
      )}

      {selectedFurnitureIds.length > 1 && selection?.type === 'furniture' && (
        <div className="panel-block">
          <h3>{selectedFurnitureIds.length} furniture selected</h3>
          <p className="hint">Drag any selected piece to move the group together.</p>
          <button type="button" className="toolbar-btn danger" onClick={deleteSelection}>
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
          <p className="hint">Delete or Backspace removes this wall.</p>
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
          {selectedOpening.type === 'door' && (
            <>
              <label className="field">
                <span>Door type</span>
                <div className="unit-toggle" role="group" aria-label="Door type">
                  <button
                    type="button"
                    className={`unit-toggle-btn ${(selectedOpening.doorStyle ?? 'swing') === 'swing' ? 'active' : ''}`}
                    onClick={() =>
                      updateOpening(selectedOpening.id, { doorStyle: 'swing' })
                    }
                  >
                    Swing
                  </button>
                  <button
                    type="button"
                    className={`unit-toggle-btn ${selectedOpening.doorStyle === 'sliding' ? 'active' : ''}`}
                    onClick={() =>
                      updateOpening(selectedOpening.id, { doorStyle: 'sliding' })
                    }
                  >
                    Sliding
                  </button>
                </div>
              </label>
              {(selectedOpening.doorStyle ?? 'swing') === 'swing' && (
                <label className="field">
                  <span>Opens to</span>
                  <div className="unit-toggle" role="group" aria-label="Door swing side">
                    <button
                      type="button"
                      className={`unit-toggle-btn ${(selectedOpening.doorSwing ?? 'left') === 'left' ? 'active' : ''}`}
                      onClick={() =>
                        updateOpening(selectedOpening.id, { doorSwing: 'left' })
                      }
                    >
                      Left side
                    </button>
                    <button
                      type="button"
                      className={`unit-toggle-btn ${selectedOpening.doorSwing === 'right' ? 'active' : ''}`}
                      onClick={() =>
                        updateOpening(selectedOpening.id, { doorSwing: 'right' })
                      }
                    >
                      Right side
                    </button>
                  </div>
                  <p className="hint">
                    Left / right is relative to the wall direction (start → end).
                  </p>
                </label>
              )}
            </>
          )}
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
          <p className="hint">Delete or Backspace removes this opening.</p>
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
          {selectedFurniture && furnitureMount(selectedFurniture) === 'top' && (
            <>
              <p className="hint">Wall cabinet — top aligns with wall height in 3D preview.</p>
              <label className="field">
                <span>Bottom elevation ({unit})</span>
                <input
                  type="number"
                  readOnly
                  value={Number(
                    furnitureBottomElevation(selectedFurniture, wallHeight).toFixed(2),
                  )}
                />
              </label>
              <label className="field">
                <span>Top elevation ({unit})</span>
                <input
                  type="number"
                  readOnly
                  value={Number(furnitureTopElevation(selectedFurniture, wallHeight).toFixed(2))}
                />
              </label>
            </>
          )}
          {selectedFurniture?.kind === 'bed' && (
            <label className="field">
              <span>Bed size</span>
              <select
                className="field-select"
                value={selectedFurniture.bedSize ?? DEFAULT_BED_SIZE}
                onChange={(e) => {
                  const bedSize = e.target.value as BedSize;
                  const dims = bedDimensionsForSize(bedSize, unit);
                  updateFurniture(selectedFurniture.id, {
                    ...resizePlacedFromAnchorCorner(selectedFurniture, dims),
                    bedSize,
                    height: dims.height,
                  });
                }}
              >
                {BED_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {bedSizeLabel(size)}
                  </option>
                ))}
              </select>
            </label>
          )}
          {selectedFurniture?.kind !== 'bed' && (
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
                  patchFurnitureSize(selectedFurniture, { width });
                } else {
                  patchLandscapeSize(selectedLandscape!, { width });
                }
              }}
            />
          </label>
          )}
          {selectedFurniture?.kind !== 'bed' && (
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
                  patchFurnitureSize(selectedFurniture, { depth });
                } else {
                  patchLandscapeSize(selectedLandscape!, { depth });
                }
              }}
            />
          </label>
          )}
          {selectedFurniture?.kind === 'bed' && (
            <>
              <label className="field">
                <span>Width ({unit})</span>
                <input
                  type="number"
                  min={0.1}
                  step={0.05}
                  value={Number(selectedPlaceable.width.toFixed(2))}
                  onChange={(e) =>
                    patchFurnitureSize(selectedFurniture, {
                      width: Number(e.target.value) || 0.1,
                    })
                  }
                />
              </label>
              <label className="field">
                <span>Length ({unit})</span>
                <input
                  type="number"
                  min={0.1}
                  step={0.05}
                  value={Number(selectedPlaceable.depth.toFixed(2))}
                  onChange={(e) =>
                    patchFurnitureSize(selectedFurniture, {
                      depth: Number(e.target.value) || 0.1,
                    })
                  }
                />
              </label>
            </>
          )}
          <label className="field">
            <span>
              {selectedFurniture && furnitureMount(selectedFurniture) === 'top'
                ? `Cabinet height (${unit})`
                : `Height (${unit})`}
            </span>
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
          <p className="hint">Delete or Backspace removes this item.</p>
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

      {selectedLight && (
        <div className="panel-block">
          <h3>Light</h3>
          <p className="readout">{LIGHT_KIND_LABELS[selectedLight.kind]}</p>
          <label className="field">
            <span>Brightness</span>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={selectedLight.intensity}
              onChange={(e) =>
                updateLight(selectedLight.id, { intensity: Number(e.target.value) })
              }
            />
          </label>
          <label className="field">
            <span>Height ({unit})</span>
            <input
              type="number"
              min={0.1}
              step={0.05}
              value={Number(selectedLight.height.toFixed(2))}
              onChange={(e) =>
                updateLight(selectedLight.id, {
                  height: Math.max(0.1, Number(e.target.value) || 0),
                })
              }
            />
          </label>
          <label className="field">
            <span>Position X ({unit})</span>
            <input
              type="number"
              step={0.05}
              value={Number(selectedLight.position.x.toFixed(3))}
              onChange={(e) =>
                updateLight(selectedLight.id, {
                  position: {
                    ...selectedLight.position,
                    x: Number(e.target.value) || 0,
                  },
                })
              }
            />
          </label>
          <label className="field">
            <span>Position Y ({unit})</span>
            <input
              type="number"
              step={0.05}
              value={Number(selectedLight.position.y.toFixed(3))}
              onChange={(e) =>
                updateLight(selectedLight.id, {
                  position: {
                    ...selectedLight.position,
                    y: Number(e.target.value) || 0,
                  },
                })
              }
            />
          </label>
          <p className="hint">Delete or Backspace removes this fixture.</p>
          <button
            type="button"
            className="toolbar-btn danger"
            onClick={() => deleteLight(selectedLight.id)}
          >
            Delete light
          </button>
        </div>
      )}
        </div>
      )}
    </aside>
  );
}
