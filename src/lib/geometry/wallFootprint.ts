import type { Point } from '../../types/floorPlan';
import { add, normalize, perpendicular, scale, subtract } from './vectors';

/** Closed polygon for 2D plan view (centerline wall with thickness). */
export function wallFootprintPolygon(wall: {
  start: Point;
  end: Point;
  thickness: number;
}): Point[] {
  const half = wall.thickness / 2;
  const dir = normalize(subtract(wall.end, wall.start));
  const n = perpendicular(dir);
  const p1 = add(wall.start, scale(n, half));
  const p2 = add(wall.end, scale(n, half));
  const p3 = add(wall.end, scale(n, -half));
  const p4 = add(wall.start, scale(n, -half));
  return [p1, p2, p3, p4];
}

export function footprintToDisplayPoints(
  polygon: Point[],
  ppu: number | null,
): number[] {
  const pts: number[] = [];
  for (const p of polygon) {
    const x = ppu ? p.x * ppu : p.x;
    const y = ppu ? p.y * ppu : p.y;
    pts.push(x, y);
  }
  return pts;
}
