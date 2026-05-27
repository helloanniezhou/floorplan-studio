import type { Point, ScaleInfo, Wall, Opening, LineSuggestion } from '../../types/floorPlan';

export function pixelsToWorld(p: Point, scale: ScaleInfo | null): Point {
  if (!scale) return p;
  return { x: p.x / scale.pixelsPerUnit, y: p.y / scale.pixelsPerUnit };
}

export function worldToPixels(p: Point, scale: ScaleInfo | null): Point {
  if (!scale) return p;
  return { x: p.x * scale.pixelsPerUnit, y: p.y * scale.pixelsPerUnit };
}

export function convertWallsToWorld(walls: Wall[], pixelsPerUnit: number): Wall[] {
  return walls.map((w) => ({
    ...w,
    start: { x: w.start.x / pixelsPerUnit, y: w.start.y / pixelsPerUnit },
    end: { x: w.end.x / pixelsPerUnit, y: w.end.y / pixelsPerUnit },
    thickness: w.thickness / pixelsPerUnit,
  }));
}

export function suggestionToWall(
  s: LineSuggestion,
  scale: ScaleInfo | null,
  thickness: number,
): { start: Point; end: Point; thickness: number } {
  if (!scale) {
    return { start: s.start, end: s.end, thickness };
  }
  return {
    start: pixelsToWorld(s.start, scale),
    end: pixelsToWorld(s.end, scale),
    thickness,
  };
}

export function clampOpeningOnWall(
  opening: Pick<Opening, 'offset' | 'width'>,
  wallLength: number,
): { offset: number; width: number } {
  const width = Math.min(opening.width, wallLength);
  const maxOffset = Math.max(0, wallLength - width);
  const offset = Math.max(0, Math.min(opening.offset, maxOffset));
  return { offset, width };
}
