import type { Point, Selection, Wall } from '../../types/floorPlan';
import { add, distance } from './vectors';

export function getSelectedWallIds(selection: Selection): string[] {
  if (!selection) return [];
  if (selection.type === 'walls') return selection.ids;
  return [];
}

export function isWallSelected(selection: Selection, wallId: string): boolean {
  return getSelectedWallIds(selection).includes(wallId);
}

export function wallEndpointHit(
  world: Point,
  wall: Wall,
  threshold: number,
): 'start' | 'end' | null {
  const ds = distance(world, wall.start);
  const de = distance(world, wall.end);
  if (ds < threshold && ds <= de) return 'start';
  if (de < threshold) return 'end';
  return null;
}

export function wallsInWorldRect(
  walls: Wall[],
  rect: { minX: number; minY: number; maxX: number; maxY: number },
): string[] {
  const inside = (p: Point) =>
    p.x >= rect.minX && p.x <= rect.maxX && p.y >= rect.minY && p.y <= rect.maxY;

  return walls
    .filter((w) => {
      const mid = { x: (w.start.x + w.end.x) / 2, y: (w.start.y + w.end.y) / 2 };
      return inside(w.start) || inside(w.end) || inside(mid);
    })
    .map((w) => w.id);
}

export function normalizeDisplayRect(
  a: Point,
  b: Point,
): { minX: number; minY: number; maxX: number; maxY: number } {
  return {
    minX: Math.min(a.x, b.x),
    minY: Math.min(a.y, b.y),
    maxX: Math.max(a.x, b.x),
    maxY: Math.max(a.y, b.y),
  };
}

export function displayRectToWorldRect(
  rect: { minX: number; minY: number; maxX: number; maxY: number },
  toWorld: (p: Point) => Point,
): { minX: number; minY: number; maxX: number; maxY: number } {
  const corners = [
    toWorld({ x: rect.minX, y: rect.minY }),
    toWorld({ x: rect.maxX, y: rect.minY }),
    toWorld({ x: rect.maxX, y: rect.maxY }),
    toWorld({ x: rect.minX, y: rect.maxY }),
  ];
  return {
    minX: Math.min(...corners.map((c) => c.x)),
    minY: Math.min(...corners.map((c) => c.y)),
    maxX: Math.max(...corners.map((c) => c.x)),
    maxY: Math.max(...corners.map((c) => c.y)),
  };
}

export function applyDeltaToWalls(
  walls: Wall[],
  ids: string[],
  delta: Point,
  snapshot: Map<string, { start: Point; end: Point }>,
): Wall[] {
  const idSet = new Set(ids);
  return walls.map((w) => {
    if (!idSet.has(w.id)) return w;
    const orig = snapshot.get(w.id);
    if (!orig) return w;
    return {
      ...w,
      start: add(orig.start, delta),
      end: add(orig.end, delta),
    };
  });
}
