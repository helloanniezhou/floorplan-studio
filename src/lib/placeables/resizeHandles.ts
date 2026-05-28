import type { Point } from '../../types/floorPlan';
import { rectCorners, resizePlacedFromAnchorCorner, type PlacedRect } from './geometry';

const MIN_PLACEABLE_SIZE = 0.1;

/** Resize handles (corner 0 is the fixed anchor corner). */
export type PlaceableResizeHandle =
  | 'corner-1'
  | 'corner-2'
  | 'corner-3'
  | 'edge-0'
  | 'edge-1'
  | 'edge-2'
  | 'edge-3';

export type PlaceableResizeHandlePosition = {
  id: PlaceableResizeHandle;
  x: number;
  y: number;
};

function dot(a: Point, b: Point): number {
  return a.x * b.x + a.y * b.y;
}

function subtract(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

function placeableAxes(item: PlacedRect) {
  const corners = rectCorners(item);
  const anchor = corners[0];
  const c1 = corners[1];
  const c3 = corners[3];
  const ux = c1.x - anchor.x;
  const uy = c1.y - anchor.y;
  const vx = c3.x - anchor.x;
  const vy = c3.y - anchor.y;
  const width = Math.hypot(ux, uy);
  const depth = Math.hypot(vx, vy);
  const u =
    width > 1e-9 ? { x: ux / width, y: uy / width } : { x: 1, y: 0 };
  const v =
    depth > 1e-9 ? { x: vx / depth, y: vy / depth } : { x: 0, y: 1 };
  return { anchor, u, v, width, depth };
}

export function placeableResizeHandlePositions(
  item: PlacedRect,
  toDisplay: (p: Point) => Point,
): PlaceableResizeHandlePosition[] {
  const corners = rectCorners(item).map(toDisplay);
  const mid = (a: Point, b: Point): Point => ({
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  });
  return [
    { id: 'corner-1', ...corners[1] },
    { id: 'corner-2', ...corners[2] },
    { id: 'corner-3', ...corners[3] },
    { id: 'edge-0', ...mid(corners[0], corners[1]) },
    { id: 'edge-1', ...mid(corners[1], corners[2]) },
    { id: 'edge-2', ...mid(corners[2], corners[3]) },
    { id: 'edge-3', ...mid(corners[3], corners[0]) },
  ];
}

export function isPlaceableCornerHandle(
  handle: PlaceableResizeHandle,
): boolean {
  return handle.startsWith('corner-');
}

export function hitPlaceableResizeHandle(
  displayPoint: Point,
  item: PlacedRect,
  toDisplay: (p: Point) => Point,
  cornerHitRadius: number,
  edgeHitRadius = cornerHitRadius * 0.55,
): PlaceableResizeHandle | null {
  const handles = placeableResizeHandlePositions(item, toDisplay);
  const corners = handles.filter((h) => isPlaceableCornerHandle(h.id));
  const edges = handles.filter((h) => !isPlaceableCornerHandle(h.id));

  let best: PlaceableResizeHandle | null = null;
  let bestDist = cornerHitRadius;
  for (const handle of corners) {
    const d = Math.hypot(displayPoint.x - handle.x, displayPoint.y - handle.y);
    if (d <= bestDist) {
      bestDist = d;
      best = handle.id;
    }
  }
  if (best) return best;

  bestDist = edgeHitRadius;
  for (const handle of edges) {
    const d = Math.hypot(displayPoint.x - handle.x, displayPoint.y - handle.y);
    if (d <= bestDist) {
      bestDist = d;
      best = handle.id;
    }
  }
  return best;
}

export function resizePlacedFromHandle(
  item: PlacedRect,
  handle: PlaceableResizeHandle,
  worldPoint: Point,
): Pick<PlacedRect, 'position' | 'width' | 'depth'> {
  const { anchor, u, v, width, depth } = placeableAxes(item);
  const d = subtract(worldPoint, anchor);
  let newWidth = width;
  let newDepth = depth;

  const halfMin = MIN_PLACEABLE_SIZE / 2;

  switch (handle) {
    case 'corner-1':
      newWidth = Math.max(MIN_PLACEABLE_SIZE, dot(d, u));
      break;
    case 'corner-3':
      newDepth = Math.max(MIN_PLACEABLE_SIZE, dot(d, v));
      break;
    case 'corner-2':
      newWidth = Math.max(MIN_PLACEABLE_SIZE, dot(d, u));
      newDepth = Math.max(MIN_PLACEABLE_SIZE, dot(d, v));
      break;
    case 'edge-0':
      newWidth = Math.max(MIN_PLACEABLE_SIZE, 2 * Math.max(halfMin, dot(d, u)));
      break;
    case 'edge-1':
    case 'edge-3':
      newDepth = Math.max(MIN_PLACEABLE_SIZE, 2 * Math.max(halfMin, dot(d, v)));
      break;
    case 'edge-2':
      newWidth = Math.max(MIN_PLACEABLE_SIZE, dot(d, u));
      break;
  }

  return resizePlacedFromAnchorCorner(item, { width: newWidth, depth: newDepth });
}

export function isRectPlaceable(
  type: 'furniture' | 'landscape',
  item: { category: string; kind: string },
): boolean {
  if (type === 'furniture') return true;
  return item.category === 'landscape' && !['tree', 'shrub'].includes(item.kind);
}
