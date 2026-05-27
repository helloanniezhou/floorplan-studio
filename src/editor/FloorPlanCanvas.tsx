import { useCallback, useEffect, useRef, useState } from 'react';
import { Stage, Layer, Line, Circle, Image as KonvaImage, Text, Arc, Group } from 'react-konva';
import type Konva from 'konva';
import { useFloorPlanStore } from '../store/floorPlanStore';
import type { Point } from '../types/floorPlan';
import { findNearestWall, findSnapPoint } from '../lib/geometry/snap';
import { PlaceableShapes, getPlaceableAtPoint } from './PlaceableShapes';
import {
  distance,
  formatLength,
  pointOnWall,
  snapAngle,
  wallDirection,
  wallLength,
} from '../lib/geometry/vectors';

const SNAP_RADIUS = 12;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 8;

function toDisplay(p: Point, pixelsPerUnit: number | null): Point {
  if (!pixelsPerUnit) return p;
  return { x: p.x * pixelsPerUnit, y: p.y * pixelsPerUnit };
}

function fromDisplay(p: Point, pixelsPerUnit: number | null): Point {
  if (!pixelsPerUnit) return p;
  return { x: p.x / pixelsPerUnit, y: p.y / pixelsPerUnit };
}

function useBackgroundImage(src?: string) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!src) {
      setImage(null);
      return;
    }
    const img = new window.Image();
    img.onload = () => setImage(img);
    img.src = src;
  }, [src]);
  return image;
}

export function FloorPlanCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);

  const walls = useFloorPlanStore((s) => s.walls);
  const openings = useFloorPlanStore((s) => s.openings);
  const furniture = useFloorPlanStore((s) => s.furniture) ?? [];
  const landscape = useFloorPlanStore((s) => s.landscape) ?? [];
  const suggestions = useFloorPlanStore((s) => s.suggestions);
  const tool = useFloorPlanStore((s) => s.tool);
  const selection = useFloorPlanStore((s) => s.selection);
  const scale = useFloorPlanStore((s) => s.scale);
  const unit = useFloorPlanStore((s) => s.unit);
  const gridEnabled = useFloorPlanStore((s) => s.gridEnabled);
  const backgroundImage = useFloorPlanStore((s) => s.backgroundImage);
  const showBackgroundImage = useFloorPlanStore((s) => s.showBackgroundImage);
  const imageSize = useFloorPlanStore((s) => s.imageSize);
  const scaleDraft = useFloorPlanStore((s) => s.scaleDraft);
  const pendingLength = useFloorPlanStore((s) => s.pendingLength);

  const addWall = useFloorPlanStore((s) => s.addWall);
  const setSelection = useFloorPlanStore((s) => s.setSelection);
  const setScaleDraftPoint = useFloorPlanStore((s) => s.setScaleDraftPoint);
  const addOpening = useFloorPlanStore((s) => s.addOpening);
  const placeActiveItem = useFloorPlanStore((s) => s.placeActiveItem);
  const updateFurniture = useFloorPlanStore((s) => s.updateFurniture);
  const updateLandscape = useFloorPlanStore((s) => s.updateLandscape);
  const updateWall = useFloorPlanStore((s) => s.updateWall);
  const acceptSuggestion = useFloorPlanStore((s) => s.acceptSuggestion);
  const dismissSuggestion = useFloorPlanStore((s) => s.dismissSuggestion);
  const setPendingLength = useFloorPlanStore((s) => s.setPendingLength);

  const bgImage = useBackgroundImage(backgroundImage);
  const ppu = scale?.pixelsPerUnit ?? null;

  const [size, setSize] = useState({ width: 800, height: 600 });
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [wallDraftStart, setWallDraftStart] = useState<Point | null>(null);
  const [cursorWorld, setCursorWorld] = useState<Point | null>(null);
  const [shiftKey, setShiftKey] = useState(false);
  const [spaceDown, setSpaceDown] = useState(false);
  const [dragging, setDragging] = useState<
    | null
    | { kind: 'pan'; last: Point }
    | { kind: 'endpoint'; wallId: string; end: 'start' | 'end' }
    | { kind: 'placeable'; type: 'furniture' | 'landscape'; id: string }
  >(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftKey(true);
      if (e.code === 'Space') {
        e.preventDefault();
        setSpaceDown(true);
      }
      if (e.key === 'Enter' && wallDraftStart && pendingLength && cursorWorld) {
        const len = parseFloat(pendingLength);
        if (len > 0) {
          const dir = wallDirection({ start: wallDraftStart, end: cursorWorld });
          const end = {
            x: wallDraftStart.x + dir.x * len,
            y: wallDraftStart.y + dir.y * len,
          };
          addWall(wallDraftStart, end);
          setWallDraftStart(null);
          setPendingLength('');
        }
      }
      if (e.key === 'Escape') {
        setWallDraftStart(null);
        setPendingLength('');
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftKey(false);
      if (e.code === 'Space') setSpaceDown(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [wallDraftStart, pendingLength, cursorWorld, addWall, setPendingLength]);

  const screenToWorld = useCallback(
    (screenX: number, screenY: number): Point => {
      const x = (screenX - stagePos.x) / stageScale;
      const y = (screenY - stagePos.y) / stageScale;
      return fromDisplay({ x, y }, ppu);
    },
    [stagePos, stageScale, ppu],
  );

  const getSnappedWorld = useCallback(
    (world: Point, from?: Point): Point => {
      const display = toDisplay(world, ppu);
      const displayWalls = walls.map((w) => ({
        ...w,
        start: toDisplay(w.start, ppu),
        end: toDisplay(w.end, ppu),
      }));
      const snap = findSnapPoint(display, displayWalls, {
        snapRadius: SNAP_RADIUS / stageScale,
        gridEnabled,
        gridSize: ppu ? ppu * 0.1 : 10,
      });
      let result = fromDisplay(snap.point, ppu);
      if (from && (tool === 'wall' || shiftKey)) {
        result = snapAngle(from, result, shiftKey);
      }
      return result;
    },
    [walls, ppu, gridEnabled, stageScale, tool, shiftKey],
  );

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const scaleBy = 1.08;
    const oldScale = stageScale;
    const newScale =
      e.evt.deltaY < 0
        ? Math.min(MAX_ZOOM, oldScale * scaleBy)
        : Math.max(MIN_ZOOM, oldScale / scaleBy);

    const mousePointTo = {
      x: (pointer.x - stagePos.x) / oldScale,
      y: (pointer.y - stagePos.y) / oldScale,
    };
    setStageScale(newScale);
    setStagePos({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  };

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = stageRef.current;
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    const isPan = tool === 'pan' || spaceDown || e.evt.button === 1;
    if (isPan) {
      setDragging({ kind: 'pan', last: { x: pos.x, y: pos.y } });
      return;
    }

    const world = getSnappedWorld(screenToWorld(pos.x, pos.y));

    if (tool === 'scale') {
      const pixelPoint = ppu ? toDisplay(world, ppu) : screenToWorld(pos.x, pos.y);
      setScaleDraftPoint(
        ppu
          ? pixelPoint
          : {
              x: (pos.x - stagePos.x) / stageScale,
              y: (pos.y - stagePos.y) / stageScale,
            },
      );
      return;
    }

    if (tool === 'wall') {
      if (!wallDraftStart) {
        setWallDraftStart(world);
      } else {
        addWall(wallDraftStart, world);
        setWallDraftStart(null);
        setPendingLength('');
      }
      return;
    }

    if (tool === 'place') {
      placeActiveItem(world);
      return;
    }

    if (tool === 'door' || tool === 'window') {
      const displayWalls = walls.map((w) => ({
        ...w,
        start: toDisplay(w.start, ppu),
        end: toDisplay(w.end, ppu),
      }));
      const hit = findNearestWall(toDisplay(world, ppu), displayWalls, 16 / stageScale);
      if (hit) {
        const wallWorld = walls.find((w) => w.id === hit.wall.id);
        if (wallWorld) {
          addOpening(wallWorld.id, tool, hit.t * wallLength(wallWorld));
        }
      }
      return;
    }

    if (tool === 'select') {
      const placeableHit = getPlaceableAtPoint(world, furniture, landscape);
      if (placeableHit) {
        setSelection({ type: placeableHit.type, id: placeableHit.id });
        setDragging({
          kind: 'placeable',
          type: placeableHit.type,
          id: placeableHit.id,
        });
        return;
      }

      const endpointHit = walls.find((w) => {
        const ds = distance(world, w.start);
        const de = distance(world, w.end);
        const threshold = (SNAP_RADIUS / stageScale) / (ppu ?? 1);
        if (ds < threshold) {
          setDragging({ kind: 'endpoint', wallId: w.id, end: 'start' });
          setSelection({ type: 'wall', id: w.id });
          return true;
        }
        if (de < threshold) {
          setDragging({ kind: 'endpoint', wallId: w.id, end: 'end' });
          setSelection({ type: 'wall', id: w.id });
          return true;
        }
        return false;
      });
      if (endpointHit) return;

      const displayWalls = walls.map((w) => ({
        ...w,
        start: toDisplay(w.start, ppu),
        end: toDisplay(w.end, ppu),
      }));
      const hit = findNearestWall(toDisplay(world, ppu), displayWalls, 8 / stageScale);
      if (hit) {
        setSelection({ type: 'wall', id: hit.wall.id });
      } else {
        setSelection(null);
      }
    }
  };

  const handleMouseMove = () => {
    const stage = stageRef.current;
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    if (dragging?.kind === 'pan') {
      const dx = pos.x - dragging.last.x;
      const dy = pos.y - dragging.last.y;
      setStagePos((p) => ({ x: p.x + dx, y: p.y + dy }));
      setDragging({ kind: 'pan', last: { x: pos.x, y: pos.y } });
      return;
    }

    const world = getSnappedWorld(
      screenToWorld(pos.x, pos.y),
      dragging?.kind === 'endpoint'
        ? undefined
        : wallDraftStart ?? undefined,
    );
    setCursorWorld(world);

    if (dragging?.kind === 'endpoint') {
      const wall = walls.find((w) => w.id === dragging.wallId);
      if (wall) {
        if (dragging.end === 'start') {
          updateWall(wall.id, { start: world });
        } else {
          updateWall(wall.id, { end: world });
        }
      }
    }

    if (dragging?.kind === 'placeable') {
      if (dragging.type === 'furniture') {
        updateFurniture(dragging.id, { position: world });
      } else {
        updateLandscape(dragging.id, { position: world });
      }
    }
  };

  const handleMouseUp = () => setDragging(null);

  const draftEnd =
    wallDraftStart && cursorWorld
      ? getSnappedWorld(cursorWorld, wallDraftStart)
      : null;

  const gridLines: number[] = [];
  const gridStep = ppu ? ppu * 0.5 : 50;
  const gridExtent = 4000;
  for (let i = -gridExtent; i <= gridExtent; i += gridStep) {
    gridLines.push(i);
  }

  return (
    <div ref={containerRef} className="canvas-wrap">
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stagePos.x}
        y={stagePos.y}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          cursor:
            tool === 'pan' || spaceDown
              ? 'grab'
              : tool === 'place'
                ? 'copy'
                : 'crosshair',
        }}
      >
        {gridEnabled && (
          <Layer listening={false}>
            {gridLines.map((i) => (
              <Line
                key={`gv-${i}`}
                points={[i, -gridExtent, i, gridExtent]}
                stroke="#ddd"
                strokeWidth={1 / stageScale}
              />
            ))}
            {gridLines.map((i) => (
              <Line
                key={`gh-${i}`}
                points={[-gridExtent, i, gridExtent, i]}
                stroke="#ddd"
                strokeWidth={1 / stageScale}
              />
            ))}
          </Layer>
        )}

        <Layer listening={false}>
          {bgImage && showBackgroundImage && (
            <KonvaImage
              image={bgImage}
              opacity={0.55}
              width={imageSize?.width}
              height={imageSize?.height}
            />
          )}
        </Layer>

        <Layer>
          {suggestions.map((s) => (
            <Line
              key={s.id}
              points={[s.start.x, s.start.y, s.end.x, s.end.y]}
              stroke="#f97316"
              strokeWidth={3 / stageScale}
              dash={[8 / stageScale, 6 / stageScale]}
              hitStrokeWidth={12 / stageScale}
              onClick={() => acceptSuggestion(s.id)}
              onContextMenu={(e) => {
                e.evt.preventDefault();
                dismissSuggestion(s.id);
              }}
            />
          ))}

          {walls.map((wall) => {
            const s = toDisplay(wall.start, ppu);
            const e = toDisplay(wall.end, ppu);
            const selected = selection?.type === 'wall' && selection.id === wall.id;
            const thick = (wall.thickness * (ppu ?? 1)) || 4;
            return (
              <Group key={wall.id}>
                <Line
                  points={[s.x, s.y, e.x, e.y]}
                  stroke={selected ? '#2563eb' : '#1a1a1a'}
                  strokeWidth={thick}
                  lineCap="square"
                  onClick={() => setSelection({ type: 'wall', id: wall.id })}
                />
                {selected && (
                  <>
                    <Circle x={s.x} y={s.y} radius={6 / stageScale} fill="#2563eb" />
                    <Circle x={e.x} y={e.y} radius={6 / stageScale} fill="#2563eb" />
                  </>
                )}
              </Group>
            );
          })}

          <PlaceableShapes
            furniture={furniture}
            landscape={landscape}
            selection={selection}
            toDisplay={(p) => toDisplay(p, ppu)}
            stageScale={stageScale}
            onSelectFurniture={(id) => setSelection({ type: 'furniture', id })}
            onSelectLandscape={(id) => setSelection({ type: 'landscape', id })}
          />

          {openings.map((opening) => {
            const wall = walls.find((w) => w.id === opening.wallId);
            if (!wall) return null;
            const start = pointOnWall(wall, opening.offset);
            const end = pointOnWall(wall, opening.offset + opening.width);
            const ds = toDisplay(start, ppu);
            const de = toDisplay(end, ppu);
            const selected =
              selection?.type === 'opening' && selection.id === opening.id;
            const dir = wallDirection(wall);
            const angle = Math.atan2(dir.y, dir.x);

            return (
              <Group
                key={opening.id}
                onClick={() => setSelection({ type: 'opening', id: opening.id })}
              >
                <Line
                  points={[ds.x, ds.y, de.x, de.y]}
                  stroke={selected ? '#2563eb' : '#fff'}
                  strokeWidth={(wall.thickness * (ppu ?? 1) + 2) || 6}
                  lineCap="butt"
                />
                {opening.type === 'door' && (
                  <Arc
                    x={ds.x}
                    y={ds.y}
                    innerRadius={0}
                    outerRadius={opening.width * (ppu ?? 1)}
                    angle={90}
                    rotation={(angle * 180) / Math.PI}
                    stroke="#64748b"
                    strokeWidth={1.5 / stageScale}
                  />
                )}
                {opening.type === 'window' && (
                  <Line
                    points={[
                      ds.x - Math.sin(angle) * 4,
                      ds.y + Math.cos(angle) * 4,
                      de.x - Math.sin(angle) * 4,
                      de.y + Math.cos(angle) * 4,
                    ]}
                    stroke="#64748b"
                    strokeWidth={1.5 / stageScale}
                  />
                )}
              </Group>
            );
          })}

          {wallDraftStart && draftEnd && (
            <>
              <Line
                points={[
                  toDisplay(wallDraftStart, ppu).x,
                  toDisplay(wallDraftStart, ppu).y,
                  toDisplay(draftEnd, ppu).x,
                  toDisplay(draftEnd, ppu).y,
                ]}
                stroke="#2563eb"
                strokeWidth={2 / stageScale}
                dash={[6 / stageScale, 4 / stageScale]}
              />
              <Text
                x={toDisplay(draftEnd, ppu).x + 8 / stageScale}
                y={toDisplay(draftEnd, ppu).y + 8 / stageScale}
                text={formatLength(wallLength({ start: wallDraftStart, end: draftEnd }), unit)}
                fontSize={14 / stageScale}
                fill="#2563eb"
              />
            </>
          )}

          {scaleDraft.pointA && (
            <Circle
              x={scaleDraft.pointA.x}
              y={scaleDraft.pointA.y}
              radius={6 / stageScale}
              fill="#16a34a"
            />
          )}
          {scaleDraft.pointB && (
            <>
              <Circle
                x={scaleDraft.pointB.x}
                y={scaleDraft.pointB.y}
                radius={6 / stageScale}
                fill="#16a34a"
              />
              <Line
                points={[
                  scaleDraft.pointA!.x,
                  scaleDraft.pointA!.y,
                  scaleDraft.pointB.x,
                  scaleDraft.pointB.y,
                ]}
                stroke="#16a34a"
                strokeWidth={2 / stageScale}
                dash={[4 / stageScale, 4 / stageScale]}
              />
            </>
          )}
        </Layer>
      </Stage>

      {tool === 'wall' && wallDraftStart && (
        <div className="length-input-bar">
          <label>
            Length ({unit}):
            <input
              type="number"
              min={0.01}
              step={0.01}
              value={pendingLength}
              placeholder="optional — Enter to fix"
              onChange={(e) => setPendingLength(e.target.value)}
            />
          </label>
        </div>
      )}
    </div>
  );
}
