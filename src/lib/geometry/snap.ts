import type { Point, Wall } from '../../types/floorPlan';
import { distance, midpoint, subtract } from './vectors';

export type SnapResult = {
  point: Point;
  kind: 'endpoint' | 'midpoint' | 'grid' | 'none';
};

const ENDPOINT_PRIORITY = 0;
const MIDPOINT_PRIORITY = 1;

export function findSnapPoint(
  cursor: Point,
  walls: Wall[],
  options: {
    snapRadius: number;
    gridSize?: number;
    gridEnabled?: boolean;
  },
): SnapResult {
  let best: SnapResult = { point: cursor, kind: 'none' };
  let bestDist = options.snapRadius;
  let bestPriority = Infinity;

  for (const wall of walls) {
    for (const pt of [wall.start, wall.end]) {
      const d = distance(cursor, pt);
      if (d < bestDist || (d === bestDist && ENDPOINT_PRIORITY < bestPriority)) {
        bestDist = d;
        bestPriority = ENDPOINT_PRIORITY;
        best = { point: pt, kind: 'endpoint' };
      }
    }
    const mid = midpoint(wall.start, wall.end);
    const d = distance(cursor, mid);
    if (d < bestDist || (d < options.snapRadius && MIDPOINT_PRIORITY < bestPriority)) {
      if (d < bestDist) {
        bestDist = d;
        bestPriority = MIDPOINT_PRIORITY;
        best = { point: mid, kind: 'midpoint' };
      }
    }
  }

  if (options.gridEnabled && options.gridSize && best.kind === 'none') {
    const gs = options.gridSize;
    const snapped = {
      x: Math.round(cursor.x / gs) * gs,
      y: Math.round(cursor.y / gs) * gs,
    };
    const d = distance(cursor, snapped);
    if (d < options.snapRadius) {
      best = { point: snapped, kind: 'grid' };
    }
  }

  return best;
}

export function findNearestWall(
  cursor: Point,
  walls: Wall[],
  maxDist: number,
): { wall: Wall; t: number; dist: number } | null {
  let best: { wall: Wall; t: number; dist: number } | null = null;

  for (const wall of walls) {
    const ab = subtract(wall.end, wall.start);
    const lenSq = ab.x * ab.x + ab.y * ab.y;
    if (lenSq < 1e-9) continue;
    let t = ((cursor.x - wall.start.x) * ab.x + (cursor.y - wall.start.y) * ab.y) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const proj = {
      x: wall.start.x + ab.x * t,
      y: wall.start.y + ab.y * t,
    };
    const dist = distance(cursor, proj);
    if (dist <= maxDist && (!best || dist < best.dist)) {
      best = { wall, t, dist };
    }
  }

  return best;
}
