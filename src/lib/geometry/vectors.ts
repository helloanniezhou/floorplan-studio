import type { Point } from '../../types/floorPlan';

export function distance(a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.hypot(dx, dy);
}

export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function normalize(v: Point): Point {
  const len = Math.hypot(v.x, v.y);
  if (len < 1e-9) return { x: 1, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

export function subtract(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function add(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function scale(v: Point, s: number): Point {
  return { x: v.x * s, y: v.y * s };
}

export function dot(a: Point, b: Point): number {
  return a.x * b.x + a.y * b.y;
}

export function perpendicular(v: Point): Point {
  return { x: -v.y, y: v.x };
}

export function angleBetween(a: Point, b: Point): number {
  const dotVal = Math.max(-1, Math.min(1, dot(normalize(a), normalize(b))));
  return Math.acos(dotVal);
}

export function wallLength(wall: { start: Point; end: Point }): number {
  return distance(wall.start, wall.end);
}

export function wallDirection(wall: { start: Point; end: Point }): Point {
  return normalize(subtract(wall.end, wall.start));
}

export function pointOnWall(
  wall: { start: Point; end: Point },
  offset: number,
): Point {
  const dir = wallDirection(wall);
  return add(wall.start, scale(dir, offset));
}

export function projectPointOnSegment(
  p: Point,
  segStart: Point,
  segEnd: Point,
): { point: Point; t: number; dist: number } {
  const ab = subtract(segEnd, segStart);
  const lenSq = ab.x * ab.x + ab.y * ab.y;
  if (lenSq < 1e-9) {
    const d = distance(p, segStart);
    return { point: segStart, t: 0, dist: d };
  }
  let t = dot(subtract(p, segStart), ab) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const point = add(segStart, scale(ab, t));
  return { point, t, dist: distance(p, point) };
}

export function setWallLength(
  wall: { start: Point; end: Point },
  length: number,
  anchor: 'start' | 'end' = 'start',
): { start: Point; end: Point } {
  const dir = wallDirection(wall);
  if (anchor === 'start') {
    return { start: wall.start, end: add(wall.start, scale(dir, length)) };
  }
  return { start: add(wall.end, scale(dir, -length)), end: wall.end };
}

export function snapAngle(from: Point, to: Point, shiftKey: boolean): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) return to;

  const angle = Math.atan2(dy, dx);
  const step = shiftKey ? Math.PI / 4 : Math.PI / 2;
  const snapped = Math.round(angle / step) * step;
  return {
    x: from.x + Math.cos(snapped) * len,
    y: from.y + Math.sin(snapped) * len,
  };
}

export function formatLength(value: number, unit: 'm' | 'ft'): string {
  if (unit === 'ft') {
    const feet = Math.floor(value);
    const inches = Math.round((value - feet) * 12);
    return inches > 0 ? `${feet}' ${inches}"` : `${feet}'`;
  }
  return `${value.toFixed(2)} m`;
}

export function metersToFeet(m: number): number {
  return m * 3.28084;
}

export function feetToMeters(ft: number): number {
  return ft / 3.28084;
}
