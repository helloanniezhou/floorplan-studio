import type {
  Furniture,
  LandscapeElement,
  Opening,
  Point,
  Selection,
  Wall,
} from '../../types/floorPlan';
import { isOvalLandscapeKind } from '../placeables/defaults';
import { pointInEllipse, rectCorners } from '../placeables/geometry';
import { add, distance, pointOnWall } from './vectors';

export type WorldRect = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export function getSelectedWallIds(selection: Selection): string[] {
  if (!selection) return [];
  if (selection.type === 'walls') return selection.ids;
  if (selection.type === 'mixed') return selection.wallIds;
  return [];
}

export function getSelectedOpeningIds(selection: Selection): string[] {
  if (!selection) return [];
  if (selection.type === 'opening') return selection.ids;
  if (selection.type === 'mixed') return selection.openingIds;
  return [];
}

export function getSelectedFurnitureIds(selection: Selection): string[] {
  if (!selection) return [];
  if (selection.type === 'furniture') return selection.ids;
  if (selection.type === 'mixed') return selection.furnitureIds;
  return [];
}

export function getSelectedLandscapeIds(selection: Selection): string[] {
  if (!selection) return [];
  if (selection.type === 'landscape') return selection.ids;
  if (selection.type === 'mixed') return selection.landscapeIds;
  return [];
}

export function isWallSelected(selection: Selection, wallId: string): boolean {
  return getSelectedWallIds(selection).includes(wallId);
}

export function isOpeningSelected(selection: Selection, openingId: string): boolean {
  return getSelectedOpeningIds(selection).includes(openingId);
}

export function isFurnitureSelected(selection: Selection, furnitureId: string): boolean {
  return getSelectedFurnitureIds(selection).includes(furnitureId);
}

export function isLandscapeSelected(selection: Selection, landscapeId: string): boolean {
  return getSelectedLandscapeIds(selection).includes(landscapeId);
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

/** Endpoint under cursor; selected walls win over overlap, then top-most (last drawn). */
export function findWallEndpointHit(
  walls: Wall[],
  world: Point,
  threshold: number,
  priorityWallIds: string[] = [],
): { wallId: string; end: 'start' | 'end' } | null {
  const prioritySet = new Set(priorityWallIds);

  for (const id of priorityWallIds) {
    const wall = walls.find((w) => w.id === id);
    if (!wall) continue;
    const end = wallEndpointHit(world, wall, threshold);
    if (end) return { wallId: wall.id, end };
  }

  for (let i = walls.length - 1; i >= 0; i--) {
    const wall = walls[i];
    if (prioritySet.has(wall.id)) continue;
    const end = wallEndpointHit(world, wall, threshold);
    if (end) return { wallId: wall.id, end };
  }

  return null;
}

function pointInWorldRect(p: Point, rect: WorldRect): boolean {
  return (
    p.x >= rect.minX &&
    p.x <= rect.maxX &&
    p.y >= rect.minY &&
    p.y <= rect.maxY
  );
}

function rectsOverlap(a: WorldRect, b: WorldRect): boolean {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}

function placedBounds(item: {
  position: Point;
  width: number;
  depth: number;
  rotation: number;
}): WorldRect {
  const corners = rectCorners(item);
  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

function placedIntersectsRect(
  item: { position: Point; width: number; depth: number; rotation: number },
  rect: WorldRect,
): boolean {
  if (pointInWorldRect(item.position, rect)) return true;
  const bounds = placedBounds(item);
  if (!rectsOverlap(bounds, rect)) return false;
  return rectCorners(item).some((c) => pointInWorldRect(c, rect));
}

export function wallsInWorldRect(walls: Wall[], rect: WorldRect): string[] {
  const inside = (p: Point) => pointInWorldRect(p, rect);

  return walls
    .filter((w) => {
      const mid = { x: (w.start.x + w.end.x) / 2, y: (w.start.y + w.end.y) / 2 };
      return inside(w.start) || inside(w.end) || inside(mid);
    })
    .map((w) => w.id);
}

export function openingsInWorldRect(
  walls: Wall[],
  openings: Opening[],
  rect: WorldRect,
): string[] {
  return openings
    .filter((opening) => {
      const wall = walls.find((w) => w.id === opening.wallId);
      if (!wall) return false;
      const center = pointOnWall(wall, opening.offset + opening.width / 2);
      const start = pointOnWall(wall, opening.offset);
      const end = pointOnWall(wall, opening.offset + opening.width);
      return (
        pointInWorldRect(center, rect) ||
        pointInWorldRect(start, rect) ||
        pointInWorldRect(end, rect)
      );
    })
    .map((o) => o.id);
}

export function furnitureInWorldRect(furniture: Furniture[], rect: WorldRect): string[] {
  return furniture.filter((f) => placedIntersectsRect(f, rect)).map((f) => f.id);
}

export function landscapeInWorldRect(
  landscape: LandscapeElement[],
  rect: WorldRect,
): string[] {
  return landscape
    .filter((item) => {
      if (isOvalLandscapeKind(item.kind)) {
        return pointInEllipse(item.position, item) || placedIntersectsRect(item, rect);
      }
      return placedIntersectsRect(item, rect);
    })
    .map((l) => l.id);
}

export function selectionFromMarquee(
  wallIds: string[],
  openingIds: string[],
  furnitureIds: string[],
  landscapeIds: string[],
): Selection {
  const hasWalls = wallIds.length > 0;
  const hasOpenings = openingIds.length > 0;
  const hasFurniture = furnitureIds.length > 0;
  const hasLandscape = landscapeIds.length > 0;
  const kinds =
    Number(hasWalls) + Number(hasOpenings) + Number(hasFurniture) + Number(hasLandscape);

  if (kinds === 0) return null;
  if (kinds === 1) {
    if (hasWalls) return { type: 'walls', ids: wallIds };
    if (hasOpenings) return { type: 'opening', ids: openingIds };
    if (hasFurniture) return { type: 'furniture', ids: furnitureIds };
    return { type: 'landscape', ids: landscapeIds };
  }

  return {
    type: 'mixed',
    wallIds,
    openingIds,
    furnitureIds,
    landscapeIds,
  };
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
): WorldRect {
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

export function applyDeltaToFurniture(
  furniture: Furniture[],
  ids: string[],
  delta: Point,
  snapshot: Map<string, Point>,
): Furniture[] {
  const idSet = new Set(ids);
  return furniture.map((f) => {
    if (!idSet.has(f.id)) return f;
    const orig = snapshot.get(f.id);
    if (!orig) return f;
    return { ...f, position: add(orig, delta) };
  });
}

export function pruneSelection(
  sel: NonNullable<Selection>,
  id: string,
  category: 'wall' | 'opening' | 'furniture' | 'landscape',
): Selection {
  switch (sel.type) {
    case 'walls': {
      if (category !== 'wall') return sel;
      const ids = sel.ids.filter((x) => x !== id);
      if (ids.length === 0) return null;
      return {
        type: 'walls',
        ids,
        focus: sel.focus?.id === id ? undefined : sel.focus,
      };
    }
    case 'opening': {
      if (category !== 'opening') return sel;
      const ids = sel.ids.filter((x) => x !== id);
      return ids.length > 0 ? { type: 'opening', ids } : null;
    }
    case 'furniture': {
      if (category !== 'furniture') return sel;
      const ids = sel.ids.filter((x) => x !== id);
      return ids.length > 0 ? { type: 'furniture', ids } : null;
    }
    case 'landscape': {
      if (category !== 'landscape') return sel;
      const ids = sel.ids.filter((x) => x !== id);
      return ids.length > 0 ? { type: 'landscape', ids } : null;
    }
    case 'mixed': {
      const wallIds = category === 'wall' ? sel.wallIds.filter((x) => x !== id) : sel.wallIds;
      const openingIds =
        category === 'opening' ? sel.openingIds.filter((x) => x !== id) : sel.openingIds;
      const furnitureIds =
        category === 'furniture' ? sel.furnitureIds.filter((x) => x !== id) : sel.furnitureIds;
      const landscapeIds =
        category === 'landscape' ? sel.landscapeIds.filter((x) => x !== id) : sel.landscapeIds;
      if (
        wallIds.length + openingIds.length + furnitureIds.length + landscapeIds.length ===
        0
      ) {
        return null;
      }
      return {
        type: 'mixed',
        wallIds,
        openingIds,
        furnitureIds,
        landscapeIds,
        focus:
          category === 'wall' && sel.focus?.id === id ? undefined : sel.focus,
      };
    }
    default:
      return sel;
  }
}
