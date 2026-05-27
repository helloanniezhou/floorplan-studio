import type { Point } from '../../types/floorPlan';

export type PlacedRect = {
  position: Point;
  width: number;
  depth: number;
  rotation: number;
};

/** Corners of a placed rectangle in world space (center at position). */
export function rectCorners(rect: PlacedRect): Point[] {
  const hw = rect.width / 2;
  const hd = rect.depth / 2;
  const c = Math.cos(rect.rotation);
  const s = Math.sin(rect.rotation);
  const local: Point[] = [
    { x: -hw, y: -hd },
    { x: hw, y: -hd },
    { x: hw, y: hd },
    { x: -hw, y: hd },
  ];
  return local.map((p) => ({
    x: rect.position.x + p.x * c - p.y * s,
    y: rect.position.y + p.x * s + p.y * c,
  }));
}

export function pointInRect(point: Point, rect: PlacedRect): boolean {
  const dx = point.x - rect.position.x;
  const dy = point.y - rect.position.y;
  const c = Math.cos(-rect.rotation);
  const s = Math.sin(-rect.rotation);
  const lx = dx * c - dy * s;
  const ly = dx * s + dy * c;
  return Math.abs(lx) <= rect.width / 2 && Math.abs(ly) <= rect.depth / 2;
}

export function findRectAtPoint(
  point: Point,
  items: PlacedRect[],
): number {
  for (let i = items.length - 1; i >= 0; i--) {
    if (pointInRect(point, items[i])) return i;
  }
  return -1;
}
