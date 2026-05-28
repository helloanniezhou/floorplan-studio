import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Line, Circle, Image as KonvaImage, Text, Arc, Group, Rect } from 'react-konva';
import type Konva from 'konva';
import { useFloorPlanStore } from '../store/floorPlanStore';
import type { Point } from '../types/floorPlan';
import { findNearestWall, findSnapPoint, type SnapResult } from '../lib/geometry/snap';
import { footprintToDisplayPoints, wallFootprintPolygon } from '../lib/geometry/wallFootprint';
import {
  buildGridLinePositions,
  gridSpacingPixels,
  visibleLayerRange,
} from '../lib/units/defaults';
import {
  constrainSquareCorner,
  rectangleDimensions,
  rectangleFromCorners,
  rectangleWallSegments,
} from '../lib/geometry/rectangle';
import {
  add,
  formatLength,
  pointOnWall,
  projectPointOnSegment,
  snapAngle,
  subtract,
  wallDirection,
  wallLength,
} from '../lib/geometry/vectors';
import type { Furniture, LandscapeElement, LineSuggestion } from '../types/floorPlan';

import { PlaceableShapes, getPlaceableAtPoint } from './PlaceableShapes';
import {
  FURNITURE_LABELS,
  LANDSCAPE_LABELS,
} from '../lib/placeables/defaults';
import {
  applyDeltaToWalls,
  displayRectToWorldRect,
  getSelectedWallIds,
  isWallSelected,
  normalizeDisplayRect,
  findWallEndpointHit,
  wallsInWorldRect,
} from '../lib/geometry/selection';
import { snapPlaceablePosition } from '../lib/placeables/geometry';
import {
  hitPlaceableResizeHandle,
  isRectPlaceable,
  resizePlacedFromHandle,
  type PlaceableResizeHandle,
} from '../lib/placeables/resizeHandles';
import { boundsFromWalls } from '../lib/walls3d/miter';
import { PlanCompassRose } from './PlanCompassRose';
import { PlanLotBoundary } from './PlanLotBoundary';
import { FloorPlanPanelTips } from './FloorPlanPanelTips';
import { findOpeningAtPoint } from '../lib/openings/openingHitTest';
import { getDoorSymbolGeometry } from '../lib/openings/doorSymbol';

const SNAP_RADIUS = 18;
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
  const activePlaceable = useFloorPlanStore((s) => s.activePlaceable);
  const suggestions = useFloorPlanStore((s) => s.suggestions);
  const tool = useFloorPlanStore((s) => s.tool);
  const selection = useFloorPlanStore((s) => s.selection);
  const scale = useFloorPlanStore((s) => s.scale);
  const unit = useFloorPlanStore((s) => s.unit);
  const gridEnabled = useFloorPlanStore((s) => s.gridEnabled);
  const gridSize = useFloorPlanStore((s) => s.gridSize);
  const backgroundImage = useFloorPlanStore((s) => s.backgroundImage);
  const backgroundVisible = useFloorPlanStore((s) => s.backgroundVisible);
  const backgroundOffset = useFloorPlanStore((s) => s.backgroundOffset);
  const imageSize = useFloorPlanStore((s) => s.imageSize);

  const scaleDraft = useFloorPlanStore((s) => s.scaleDraft);
  const pendingLength = useFloorPlanStore((s) => s.pendingLength);
  const northAngleDeg = useFloorPlanStore((s) => s.northAngleDeg);
  const lotSize = useFloorPlanStore((s) => s.lotSize);

  const addWall = useFloorPlanStore((s) => s.addWall);
  const addRectangleWalls = useFloorPlanStore((s) => s.addRectangleWalls);
  const setSelection = useFloorPlanStore((s) => s.setSelection);
  const setWallSelection = useFloorPlanStore((s) => s.setWallSelection);
  const toggleWallSelection = useFloorPlanStore((s) => s.toggleWallSelection);
  const setWallsSilent = useFloorPlanStore((s) => s.setWallsSilent);
  const setScaleDraftPoint = useFloorPlanStore((s) => s.setScaleDraftPoint);
  const addOpening = useFloorPlanStore((s) => s.addOpening);
  const placeActiveItem = useFloorPlanStore((s) => s.placeActiveItem);
  const updateFurniture = useFloorPlanStore((s) => s.updateFurniture);
  const updateLandscape = useFloorPlanStore((s) => s.updateLandscape);
  const updateOpening = useFloorPlanStore((s) => s.updateOpening);
  const updateWall = useFloorPlanStore((s) => s.updateWall);
  const recordHistory = useFloorPlanStore((s) => s.recordHistory);
  const acceptSuggestion = useFloorPlanStore((s) => s.acceptSuggestion);
  const dismissSuggestion = useFloorPlanStore((s) => s.dismissSuggestion);
  const setPendingLength = useFloorPlanStore((s) => s.setPendingLength);
  const wallDraftStart = useFloorPlanStore((s) => s.wallDraftStart);
  const setWallDraftStart = useFloorPlanStore((s) => s.setWallDraftStart);

  const bgImage = useBackgroundImage(backgroundImage);
  const ppu = scale?.pixelsPerUnit ?? null;

  const compassAnchor = useMemo(() => {
    const b = boundsFromWalls(walls);
    const pad = 1.5;
    const cx = (b.minX + b.maxX) / 2;
    const topY = b.minZ - pad;
    return toDisplay({ x: cx, y: topY }, ppu);
  }, [walls, ppu]);

  const [size, setSize] = useState({ width: 800, height: 600 });
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [rectDraftStart, setRectDraftStart] = useState<Point | null>(null);
  const [cursorWorld, setCursorWorld] = useState<Point | null>(null);
  const [activeSnap, setActiveSnap] = useState<SnapResult | null>(null);
  const [shiftKey, setShiftKey] = useState(false);
  const [spaceDown, setSpaceDown] = useState(false);
  const [dragging, setDragging] = useState<
    | null
    | { kind: 'pan'; last: Point }
    | { kind: 'endpoint'; wallId: string; end: 'start' | 'end' }
    | { kind: 'translate'; wallIds: string[]; startWorld: Point }
    | { kind: 'marquee'; startDisplay: Point; currentDisplay: Point }
    | { kind: 'placeable'; type: 'furniture' | 'landscape'; id: string; grabOffset: Point }
    | {
        kind: 'placeable-resize';
        type: 'furniture' | 'landscape';
        id: string;
        handle: PlaceableResizeHandle;
      }
    | { kind: 'opening'; id: string; grabAlongOffset: number }
  >(null);

  const translateSnapshot = useRef<Map<string, { start: Point; end: Point }>>(new Map());
  const translateExtras = useRef<{
    backgroundOffset: Point;
    suggestions: LineSuggestion[];
    furniture: Furniture[];
    landscape: LandscapeElement[];
  } | null>(null);

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
        setRectDraftStart(null);
        setPendingLength('');
        setSelection(null);
        setDragging(null);
        translateSnapshot.current.clear();
        translateExtras.current = null;
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
  }, [
    wallDraftStart,
    pendingLength,
    cursorWorld,
    addWall,
    setPendingLength,
    setSelection,
    setWallDraftStart,
  ]);

  useEffect(() => {
    setRectDraftStart(null);
  }, [tool]);

  const screenToWorld = useCallback(
    (screenX: number, screenY: number): Point => {
      const x = (screenX - stagePos.x) / stageScale;
      const y = (screenY - stagePos.y) / stageScale;
      return fromDisplay({ x, y }, ppu);
    },
    [stagePos, stageScale, ppu],
  );

  const resolveSnap = useCallback(
    (world: Point, from?: Point): { point: Point; snap: SnapResult } => {
      const display = toDisplay(world, ppu);
      const displayWalls = walls.map((w) => ({
        ...w,
        start: toDisplay(w.start, ppu),
        end: toDisplay(w.end, ppu),
      }));
      const snap = findSnapPoint(display, displayWalls, {
        snapRadius: SNAP_RADIUS / stageScale,
        gridEnabled,
        gridSize: gridSpacingPixels(gridSize, ppu),
      });
      let point = fromDisplay(snap.point, ppu);
      if (from && shiftKey && tool === 'wall') {
        point = snapAngle(from, point, true);
      }
      return { point, snap };
    },
    [walls, ppu, gridEnabled, gridSize, stageScale, tool, shiftKey, unit],
  );

  const getSnappedWorld = useCallback(
    (world: Point, from?: Point): Point => resolveSnap(world, from).point,
    [resolveSnap],
  );

  const beginOpeningDrag = useCallback(
    (openingId: string, world: Point) => {
      const opening = openings.find((o) => o.id === openingId);
      const wall = opening ? walls.find((w) => w.id === opening.wallId) : undefined;
      if (!opening || !wall) return;
      const proj = projectPointOnSegment(world, wall.start, wall.end);
      const along = proj.t * wallLength(wall);
      setSelection({ type: 'opening', id: openingId });
      recordHistory();
      setDragging({
        kind: 'opening',
        id: openingId,
        grabAlongOffset: along - opening.offset,
      });
    },
    [openings, walls, recordHistory, setSelection],
  );

  const getRectCorner = useCallback(
    (start: Point, world: Point): Point => {
      let end = getSnappedWorld(world);
      if (shiftKey) end = constrainSquareCorner(start, end);
      return end;
    },
    [getSnappedWorld, shiftKey],
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
      const { point, snap } = resolveSnap(screenToWorld(pos.x, pos.y), wallDraftStart ?? undefined);
      if (!wallDraftStart) {
        setWallDraftStart(point);
        setActiveSnap(snap.kind !== 'none' ? snap : null);
      } else {
        const end = getSnappedWorld(screenToWorld(pos.x, pos.y), wallDraftStart);
        addWall(wallDraftStart, end);
        setWallDraftStart(end);
        setPendingLength('');
        setActiveSnap(null);
      }
      return;
    }

    if (tool === 'rect') {
      setRectDraftStart(world);
      return;
    }

    if (tool === 'place') {
      placeActiveItem(screenToWorld(pos.x, pos.y));
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
          addOpening(wallWorld.id, tool, hit.t * wallLength(wallWorld), undefined, 'end');
        }
      }
      return;
    }

    if (tool === 'select') {
      const displayPt = {
        x: (pos.x - stagePos.x) / stageScale,
        y: (pos.y - stagePos.y) / stageScale,
      };
      const handleHitRadius = 10 / stageScale;

      if (selection?.type === 'furniture') {
        const selected = furniture.find((f) => f.id === selection.id);
        if (selected) {
          const handle = hitPlaceableResizeHandle(
            displayPt,
            selected,
            (p) => toDisplay(p, ppu),
            handleHitRadius,
          );
          if (handle) {
            recordHistory();
            setDragging({
              kind: 'placeable-resize',
              type: 'furniture',
              id: selected.id,
              handle,
            });
            return;
          }
        }
      }

      if (selection?.type === 'landscape') {
        const selected = landscape.find((l) => l.id === selection.id);
        if (selected && isRectPlaceable('landscape', selected)) {
          const handle = hitPlaceableResizeHandle(
            displayPt,
            selected,
            (p) => toDisplay(p, ppu),
            handleHitRadius,
          );
          if (handle) {
            recordHistory();
            setDragging({
              kind: 'placeable-resize',
              type: 'landscape',
              id: selected.id,
              handle,
            });
            return;
          }
        }
      }

      const placeableHit = getPlaceableAtPoint(world, furniture, landscape);
      if (placeableHit) {
        const item =
          placeableHit.type === 'furniture'
            ? furniture.find((f) => f.id === placeableHit.id)
            : landscape.find((l) => l.id === placeableHit.id);
        if (item) {
          const canResize =
            placeableHit.type === 'furniture' ||
            isRectPlaceable('landscape', item);
          const handle =
            canResize &&
            hitPlaceableResizeHandle(displayPt, item, (p) => toDisplay(p, ppu), handleHitRadius);
          setSelection({ type: placeableHit.type, id: placeableHit.id });
          recordHistory();
          if (handle) {
            setDragging({
              kind: 'placeable-resize',
              type: placeableHit.type,
              id: placeableHit.id,
              handle,
            });
          } else {
            setDragging({
              kind: 'placeable',
              type: placeableHit.type,
              id: placeableHit.id,
              grabOffset: subtract(world, item.position),
            });
          }
        }
        return;
      }

      const openingHit = findOpeningAtPoint(
        world,
        walls,
        openings,
        12 / stageScale / (ppu ?? 1),
      );
      if (openingHit) {
        beginOpeningDrag(openingHit.id, world);
        return;
      }

      const endpointThreshold = (SNAP_RADIUS / stageScale) / (ppu ?? 1);

      const priorityWallIds = getSelectedWallIds(selection);
      const endpointHit = findWallEndpointHit(walls, world, endpointThreshold, priorityWallIds);
      if (endpointHit) {
        if (!e.evt.shiftKey) {
          setWallSelection([endpointHit.wallId], {
            id: endpointHit.wallId,
            anchor: endpointHit.end,
          });
        }
        recordHistory();
        setDragging({
          kind: 'endpoint',
          wallId: endpointHit.wallId,
          end: endpointHit.end,
        });
        return;
      }

      const displayWalls = walls.map((w) => ({
        ...w,
        start: toDisplay(w.start, ppu),
        end: toDisplay(w.end, ppu),
      }));
      const hit = findNearestWall(
        toDisplay(world, ppu),
        displayWalls,
        10 / stageScale,
        priorityWallIds,
      );

      if (hit) {
        const w = walls.find((x) => x.id === hit.wall.id);
        if (!w) return;

        if (e.evt.shiftKey) {
          toggleWallSelection(w.id, true);
          return;
        }

        const selectedIds = getSelectedWallIds(selection);
        const moveIds = selectedIds.includes(w.id) ? selectedIds : [w.id];
        if (!selectedIds.includes(w.id)) {
          setWallSelection([w.id], { id: w.id, anchor: 'start' });
        }

        const snap = gridEnabled && ppu ? resolveSnap(world).point : world;
        translateSnapshot.current = new Map(
          walls
            .filter((wall) => moveIds.includes(wall.id))
            .map((wall) => [wall.id, { start: { ...wall.start }, end: { ...wall.end } }]),
        );
        const moveAll = moveIds.length === walls.length && walls.length > 0;
        translateExtras.current = moveAll
          ? {
              backgroundOffset: { ...backgroundOffset },
              suggestions: suggestions.map((s) => ({
                ...s,
                start: { ...s.start },
                end: { ...s.end },
              })),
              furniture: furniture.map((f) => ({
                ...f,
                position: { ...f.position },
              })),
              landscape: landscape.map((l) => ({
                ...l,
                position: { ...l.position },
              })),
            }
          : null;
        recordHistory();
        setDragging({ kind: 'translate', wallIds: moveIds, startWorld: snap });
        return;
      }

      if (e.evt.button === 0) {
        if (!e.evt.shiftKey) setSelection(null);
        setDragging({
          kind: 'marquee',
          startDisplay: displayPt,
          currentDisplay: displayPt,
        });
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

    const fromPoint =
      dragging?.kind === 'endpoint'
        ? undefined
        : tool === 'wall' || tool === 'rect'
          ? wallDraftStart ?? undefined
          : undefined;
    const { point: world, snap } = resolveSnap(screenToWorld(pos.x, pos.y), fromPoint);
    setCursorWorld(world);
    const showSnap =
      tool === 'wall' || tool === 'rect' || tool === 'select';
    setActiveSnap(showSnap && snap.kind !== 'none' ? snap : null);

    if (dragging?.kind === 'endpoint') {
      const wall = walls.find((w) => w.id === dragging.wallId);
      if (wall) {
        if (dragging.end === 'start') {
          updateWall(wall.id, { start: world }, { recordHistory: false });
        } else {
          updateWall(wall.id, { end: world }, { recordHistory: false });
        }
      }
      return;
    }

    if (dragging?.kind === 'translate') {
      const snapWorld =
        gridEnabled && (tool === 'select' || tool === 'wall')
          ? resolveSnap(world).point
          : world;
      const delta = subtract(snapWorld, dragging.startWorld);
      const moved = applyDeltaToWalls(
        walls,
        dragging.wallIds,
        delta,
        translateSnapshot.current,
      );
      setWallsSilent(moved);
      if (translateExtras.current) {
        const extras = translateExtras.current;
        useFloorPlanStore.setState({
          backgroundOffset: add(extras.backgroundOffset, delta),
          suggestions: extras.suggestions.map((s) => ({
            ...s,
            start: add(s.start, delta),
            end: add(s.end, delta),
          })),
          furniture: extras.furniture.map((f) => ({
            ...f,
            position: add(f.position, delta),
          })),
          landscape: extras.landscape.map((l) => ({
            ...l,
            position: add(l.position, delta),
          })),
        });
      }
      return;
    }

    if (dragging?.kind === 'opening') {
      const opening = openings.find((o) => o.id === dragging.id);
      const wall = opening ? walls.find((w) => w.id === opening.wallId) : undefined;
      if (opening && wall) {
        const proj = projectPointOnSegment(world, wall.start, wall.end);
        const along = proj.t * wallLength(wall);
        const rawOffset = along - dragging.grabAlongOffset;
        updateOpening(opening.id, { offset: rawOffset }, { recordHistory: false });
      }
      return;
    }

    if (dragging?.kind === 'placeable-resize') {
      const item =
        dragging.type === 'furniture'
          ? furniture.find((f) => f.id === dragging.id)
          : landscape.find((l) => l.id === dragging.id);
      if (item) {
        const next = resizePlacedFromHandle(item, dragging.handle, world);
        if (dragging.type === 'furniture') {
          updateFurniture(dragging.id, next, { recordHistory: false });
        } else {
          updateLandscape(dragging.id, next, { recordHistory: false });
        }
      }
      return;
    }

    if (dragging?.kind === 'placeable') {
      const rawCenter = subtract(world, dragging.grabOffset);
      const item =
        dragging.type === 'furniture'
          ? furniture.find((f) => f.id === dragging.id)
          : landscape.find((l) => l.id === dragging.id);
      const placeableSnapRadius = (SNAP_RADIUS / stageScale) / (ppu ?? 1);
      const nextPosition =
        item && walls.length > 0
          ? snapPlaceablePosition(walls, item, rawCenter, placeableSnapRadius)
          : rawCenter;
      if (dragging.type === 'furniture') {
        updateFurniture(dragging.id, { position: nextPosition }, { recordHistory: false });
      } else {
        updateLandscape(dragging.id, { position: nextPosition }, { recordHistory: false });
      }
      return;
    }

    if (dragging?.kind === 'marquee') {
      setDragging({
        ...dragging,
        currentDisplay: {
          x: (pos.x - stagePos.x) / stageScale,
          y: (pos.y - stagePos.y) / stageScale,
        },
      });
    }
  };

  const handleMouseUp = () => {
    if (tool === 'rect' && rectDraftStart && cursorWorld) {
      const end = getRectCorner(rectDraftStart, cursorWorld);
      addRectangleWalls(rectDraftStart, end);
      setRectDraftStart(null);
    }

    if (dragging?.kind === 'marquee') {
      const rect = normalizeDisplayRect(
        dragging.startDisplay,
        dragging.currentDisplay,
      );
      const minSize = 4 / stageScale;
      if (rect.maxX - rect.minX > minSize || rect.maxY - rect.minY > minSize) {
        const worldRect = displayRectToWorldRect(rect, (p) => fromDisplay(p, ppu));
        const ids = wallsInWorldRect(walls, worldRect);
        if (ids.length > 0) setWallSelection(ids);
      }
    }

    if (dragging?.kind === 'translate') {
      translateSnapshot.current.clear();
      translateExtras.current = null;
    }

    setDragging(null);
  };

  const draftEnd =
    wallDraftStart && cursorWorld
      ? getSnappedWorld(cursorWorld, wallDraftStart)
      : null;

  const rectDraftEnd =
    rectDraftStart && cursorWorld ? getRectCorner(rectDraftStart, cursorWorld) : null;

  const rectPreview =
    rectDraftStart && rectDraftEnd
      ? rectangleWallSegments(rectangleFromCorners(rectDraftStart, rectDraftEnd))
      : null;

  const rectDims =
    rectDraftStart && rectDraftEnd
      ? rectangleDimensions(rectDraftStart, rectDraftEnd)
      : null;

  const gridStep = gridSpacingPixels(gridSize, ppu);
  const gridOverlay = useMemo(() => {
    if (!gridEnabled || !(gridStep > 0)) {
      return { xLines: [] as number[], yLines: [] as number[], xAxis: { min: 0, max: 0 }, yAxis: { min: 0, max: 0 } };
    }
    const xAxis = visibleLayerRange(stagePos.x, stageScale, size.width);
    const yAxis = visibleLayerRange(stagePos.y, stageScale, size.height);
    return {
      xLines: buildGridLinePositions(gridStep, xAxis),
      yLines: buildGridLinePositions(gridStep, yAxis),
      xAxis,
      yAxis,
    };
  }, [gridEnabled, gridStep, stagePos.x, stagePos.y, stageScale, size.width, size.height]);

  return (
    <div ref={containerRef} className="canvas-wrap">
      <FloorPlanPanelTips />
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
                : tool === 'select'
                  ? dragging?.kind === 'translate' ||
                      dragging?.kind === 'placeable' ||
                      dragging?.kind === 'opening'
                    ? 'move'
                    : dragging?.kind === 'placeable-resize'
                      ? 'nwse-resize'
                      : 'default'
                  : 'crosshair',
        }}
      >
        {lotSize && (
          <Layer listening={false}>
            <PlanLotBoundary
              lotSize={lotSize}
              unit={unit}
              pixelsPerUnit={ppu}
              stageScale={stageScale}
            />
          </Layer>
        )}

        {gridEnabled && gridOverlay.xLines.length > 0 && (
          <Layer listening={false}>
            {gridOverlay.xLines.map((i) => (
              <Line
                key={`gv-${i}`}
                points={[i, gridOverlay.yAxis.min, i, gridOverlay.yAxis.max]}
                stroke="#ddd"
                strokeWidth={1 / stageScale}
              />
            ))}
            {gridOverlay.yLines.map((i) => (
              <Line
                key={`gh-${i}`}
                points={[gridOverlay.xAxis.min, i, gridOverlay.xAxis.max, i]}
                stroke="#ddd"
                strokeWidth={1 / stageScale}
              />
            ))}
          </Layer>
        )}

        <Layer listening={false}>
          {bgImage && backgroundVisible && (
            <KonvaImage
              image={bgImage}
              x={toDisplay(backgroundOffset, ppu).x}
              y={toDisplay(backgroundOffset, ppu).y}
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
            const selected = isWallSelected(selection, wall.id);
            const showEndpoints =
              tool === 'select' &&
              selection?.type === 'walls' &&
              selection.ids.length === 1 &&
              selection.ids[0] === wall.id;
            const fixedAnchor =
              showEndpoints && selection.focus?.id === wall.id
                ? selection.focus.anchor
                : null;
            const footprint = wallFootprintPolygon(wall);
            const pts = footprintToDisplayPoints(footprint, ppu);
            const s = toDisplay(wall.start, ppu);
            const e = toDisplay(wall.end, ppu);
            const handleR = 8 / stageScale;
            return (
              <Group key={wall.id}>
                <Line
                  points={pts}
                  closed
                  fill={selected ? '#dbeafe' : '#2d2d2d'}
                  stroke={selected ? '#2563eb' : '#1a1a1a'}
                  strokeWidth={1.5 / stageScale}
                  hitStrokeWidth={Math.max(12 / stageScale, 8)}
                />
                {showEndpoints && (
                  <>
                    <Circle
                      x={s.x}
                      y={s.y}
                      radius={handleR}
                      fill={fixedAnchor === 'start' ? '#2563eb' : '#fff'}
                      stroke="#2563eb"
                      strokeWidth={2 / stageScale}
                      listening={false}
                    />
                    <Circle
                      x={e.x}
                      y={e.y}
                      radius={handleR}
                      fill={fixedAnchor === 'end' ? '#2563eb' : '#fff'}
                      stroke="#2563eb"
                      strokeWidth={2 / stageScale}
                      listening={false}
                    />
                  </>
                )}
              </Group>
            );
          })}

          {dragging?.kind === 'marquee' && (
            <Rect
              x={Math.min(dragging.startDisplay.x, dragging.currentDisplay.x)}
              y={Math.min(dragging.startDisplay.y, dragging.currentDisplay.y)}
              width={Math.abs(dragging.currentDisplay.x - dragging.startDisplay.x)}
              height={Math.abs(dragging.currentDisplay.y - dragging.startDisplay.y)}
              stroke="#2563eb"
              strokeWidth={1.5 / stageScale}
              dash={[6 / stageScale, 4 / stageScale]}
              fill="rgba(37, 99, 235, 0.08)"
              listening={false}
            />
          )}

          {(tool === 'wall' || tool === 'rect') &&
            walls.map((wall) => {
              const s = toDisplay(wall.start, ppu);
              const e = toDisplay(wall.end, ppu);
              const r = 5 / stageScale;
              return (
                <Group key={`${wall.id}-joints`} listening={false}>
                  <Circle
                    x={s.x}
                    y={s.y}
                    radius={r}
                    stroke="#16a34a"
                    strokeWidth={1.5 / stageScale}
                    fill="rgba(22, 163, 74, 0.15)"
                  />
                  <Circle
                    x={e.x}
                    y={e.y}
                    radius={r}
                    stroke="#16a34a"
                    strokeWidth={1.5 / stageScale}
                    fill="rgba(22, 163, 74, 0.15)"
                  />
                </Group>
              );
            })}

          {activeSnap && activeSnap.kind !== 'none' && (
            <SnapMarker snap={activeSnap} stageScale={stageScale} />
          )}

          {wallDraftStart && tool === 'wall' && (
            <Circle
              x={toDisplay(wallDraftStart, ppu).x}
              y={toDisplay(wallDraftStart, ppu).y}
              radius={7 / stageScale}
              fill="#16a34a"
              stroke="#fff"
              strokeWidth={2 / stageScale}
              listening={false}
            />
          )}

          <PlaceableShapes
            furniture={furniture}
            landscape={landscape}
            selection={
              selection?.type === 'furniture' || selection?.type === 'landscape'
                ? selection
                : null
            }
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
            const doorSymbol =
              opening.type === 'door'
                ? getDoorSymbolGeometry(wall, opening, ds, de, ppu)
                : null;

            return (
              <Group
                key={opening.id}
                onClick={() => setSelection({ type: 'opening', id: opening.id })}
                onMouseDown={(e) => {
                  if (tool !== 'select') return;
                  e.cancelBubble = true;
                  const pos = e.target.getStage()?.getPointerPosition();
                  if (!pos) return;
                  beginOpeningDrag(opening.id, screenToWorld(pos.x, pos.y));
                }}
              >
                <Line
                  points={[ds.x, ds.y, de.x, de.y]}
                  stroke={selected ? '#2563eb' : '#fff'}
                  strokeWidth={(wall.thickness * (ppu ?? 1) + 2) || 6}
                  lineCap="butt"
                  hitStrokeWidth={Math.max(14 / stageScale, (wall.thickness * (ppu ?? 1) + 2) || 6)}
                />
                {doorSymbol?.kind === 'swing' && (
                  <Arc
                    x={doorSymbol.hinge.x}
                    y={doorSymbol.hinge.y}
                    innerRadius={0}
                    outerRadius={doorSymbol.radius}
                    angle={doorSymbol.sweepDeg}
                    rotation={doorSymbol.rotationDeg}
                    stroke="#64748b"
                    strokeWidth={1.5 / stageScale}
                    listening={false}
                  />
                )}
                {doorSymbol?.kind === 'sliding' && (
                  <>
                    <Line
                      points={[
                        doorSymbol.track[0].x,
                        doorSymbol.track[0].y,
                        doorSymbol.track[1].x,
                        doorSymbol.track[1].y,
                      ]}
                      stroke="#64748b"
                      strokeWidth={2 / stageScale}
                      listening={false}
                    />
                    <Line
                      points={[
                        doorSymbol.panelA[0].x,
                        doorSymbol.panelA[0].y,
                        doorSymbol.panelA[1].x,
                        doorSymbol.panelA[1].y,
                      ]}
                      stroke="#64748b"
                      strokeWidth={1.5 / stageScale}
                      dash={[5 / stageScale, 4 / stageScale]}
                      listening={false}
                    />
                    <Line
                      points={[
                        doorSymbol.panelB[0].x,
                        doorSymbol.panelB[0].y,
                        doorSymbol.panelB[1].x,
                        doorSymbol.panelB[1].y,
                      ]}
                      stroke="#64748b"
                      strokeWidth={1.5 / stageScale}
                      dash={[5 / stageScale, 4 / stageScale]}
                      listening={false}
                    />
                  </>
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
                    listening={false}
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

          {rectPreview && rectDraftStart && rectDraftEnd && (
            <>
              {rectPreview.map((seg, i) => {
                const s = toDisplay(seg.start, ppu);
                const e = toDisplay(seg.end, ppu);
                return (
                  <Line
                    key={`rect-preview-${i}`}
                    points={[s.x, s.y, e.x, e.y]}
                    stroke="#2563eb"
                    strokeWidth={2 / stageScale}
                    dash={[6 / stageScale, 4 / stageScale]}
                  />
                );
              })}
              {rectDims && (
                <Text
                  x={
                    toDisplay(
                      { x: (rectDraftStart.x + rectDraftEnd.x) / 2, y: rectDraftStart.y },
                      ppu,
                    ).x
                  }
                  y={
                    toDisplay(
                      { x: (rectDraftStart.x + rectDraftEnd.x) / 2, y: rectDraftStart.y },
                      ppu,
                    ).y - 16 / stageScale
                  }
                  text={`${formatLength(rectDims.width, unit)} × ${formatLength(rectDims.height, unit)}`}
                  fontSize={14 / stageScale}
                  fill="#2563eb"
                  align="center"
                  offsetX={40 / stageScale}
                />
              )}
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

          <PlanCompassRose
            cx={compassAnchor.x}
            cy={compassAnchor.y - 64 / stageScale}
            northAngleDeg={northAngleDeg}
            stageScale={stageScale}
          />
        </Layer>
      </Stage>

      {tool === 'place' && (
        <div className="length-input-bar place-hint">
          Click to place{' '}
          {activePlaceable.category === 'furniture'
            ? FURNITURE_LABELS[activePlaceable.kind]
            : LANDSCAPE_LABELS[activePlaceable.kind]}
          . Select it afterward to edit dimensions.
        </div>
      )}

      {tool === 'rect' && rectDraftStart && (
        <div className="length-input-bar">
          <span className="hint">Drag to size · release to place · Shift for square</span>
        </div>
      )}

    </div>
  );
}

function SnapMarker({
  snap,
  stageScale,
}: {
  snap: SnapResult;
  stageScale: number;
}) {
  const { x, y } = snap.point;
  const isEndpoint = snap.kind === 'endpoint';
  const color = isEndpoint ? '#16a34a' : '#2563eb';
  const outer = (isEndpoint ? 14 : 10) / stageScale;
  const inner = (isEndpoint ? 6 : 4) / stageScale;
  const arm = (isEndpoint ? 12 : 8) / stageScale;

  return (
    <Group listening={false}>
      <Circle
        x={x}
        y={y}
        radius={outer}
        stroke={color}
        strokeWidth={2 / stageScale}
        dash={isEndpoint ? undefined : [4 / stageScale, 3 / stageScale]}
      />
      <Circle x={x} y={y} radius={inner} fill={color} opacity={0.45} />
      <Line
        points={[x - arm, y, x + arm, y]}
        stroke={color}
        strokeWidth={2 / stageScale}
      />
      <Line
        points={[x, y - arm, x, y + arm]}
        stroke={color}
        strokeWidth={2 / stageScale}
      />
    </Group>
  );
}
