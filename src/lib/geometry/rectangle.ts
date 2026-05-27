import type { Point } from '../../types/floorPlan';

export type RectangleCorners = [Point, Point, Point, Point];

/** Axis-aligned rectangle corners: bottom-left, bottom-right, top-right, top-left (clockwise). */
export function rectangleFromCorners(a: Point, b: Point): RectangleCorners {
  const minX = Math.min(a.x, b.x);
  const maxX = Math.max(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxY = Math.max(a.y, b.y);
  return [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ];
}

export function rectangleWallSegments(corners: RectangleCorners): { start: Point; end: Point }[] {
  const [c0, c1, c2, c3] = corners;
  return [
    { start: c0, end: c1 },
    { start: c1, end: c2 },
    { start: c2, end: c3 },
    { start: c3, end: c0 },
  ];
}

export function constrainSquareCorner(start: Point, end: Point): Point {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const side = Math.max(Math.abs(dx), Math.abs(dy));
  return {
    x: start.x + (dx >= 0 ? 1 : -1) * side,
    y: start.y + (dy >= 0 ? 1 : -1) * side,
  };
}

export function rectangleDimensions(
  a: Point,
  b: Point,
): { width: number; height: number } {
  return {
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
  };
}
