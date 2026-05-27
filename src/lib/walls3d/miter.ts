import type { Point } from '../../types/floorPlan';
import { add, normalize, perpendicular, scale, subtract } from '../geometry/vectors';

export type WallSegment = {
  wallId: string;
  polygon: Point[];
};

function lineIntersection(a1: Point, a2: Point, b1: Point, b2: Point): Point | null {
  const d1 = subtract(a2, a1);
  const d2 = subtract(b2, b1);
  const denom = d1.x * d2.y - d1.y * d2.x;
  if (Math.abs(denom) < 1e-9) return null;
  const t = ((b1.x - a1.x) * d2.y - (b1.y - a1.y) * d2.x) / denom;
  return add(a1, scale(d1, t));
}

function getConnectedWalls(
  point: Point,
  wallId: string,
  walls: { id: string; start: Point; end: Point }[],
  tolerance = 0.05,
): { id: string; start: Point; end: Point }[] {
  return walls.filter((w) => {
    if ( w.id === wallId) return false;
    const ds = Math.hypot(w.start.x - point.x, w.start.y - point.y);
    const de = Math.hypot(w.end.x - point.x, w.end.y - point.y);
    return ds < tolerance || de < tolerance;
  });
}

function miterCorner(
  vertex: Point,
  dirA: Point,
  dirB: Point,
  halfThick: number,
  side: 1 | -1,
): Point {
  const nA = scale(perpendicular(dirA), side * halfThick);
  const nB = scale(perpendicular(dirB), side * halfThick);
  const a1 = add(vertex, nA);
  const a2 = add(vertex, add(nA, scale(dirA, 10)));
  const b1 = add(vertex, nB);
  const b2 = add(vertex, add(nB, scale(dirB, 10)));
  return lineIntersection(a1, a2, b1, b2) ?? add(vertex, scale(normalize(add(nA, nB)), halfThick));
}

export function buildWallPolygon(
  wall: { id: string; start: Point; end: Point; thickness: number },
  allWalls: { id: string; start: Point; end: Point; thickness: number }[],
): Point[] {
  const half = wall.thickness / 2;
  const dir = normalize(subtract(wall.end, wall.start));
  const normal = perpendicular(dir);

  const startNeighbors = getConnectedWalls(wall.start, wall.id, allWalls);
  const endNeighbors = getConnectedWalls(wall.end, wall.id, allWalls);

  let pStartLeft = add(wall.start, scale(normal, half));
  let pStartRight = add(wall.start, scale(normal, -half));
  let pEndLeft = add(wall.end, scale(normal, half));
  let pEndRight = add(wall.end, scale(normal, -half));

  if (startNeighbors.length > 0) {
    const other = startNeighbors[0];
    const otherDir = normalize(
      subtract(
        Math.hypot(other.start.x - wall.start.x, other.start.y - wall.start.y) <
          Math.hypot(other.end.x - wall.start.x, other.end.y - wall.start.y)
          ? other.end
          : other.start,
        wall.start,
      ),
    );
    pStartLeft = miterCorner(wall.start, dir, otherDir, half, 1);
    pStartRight = miterCorner(wall.start, dir, otherDir, half, -1);
  }

  if (endNeighbors.length > 0) {
    const other = endNeighbors[0];
    const otherDir = normalize(
      subtract(
        Math.hypot(other.start.x - wall.end.x, other.start.y - wall.end.y) <
          Math.hypot(other.end.x - wall.end.x, other.end.y - wall.end.y)
          ? other.end
          : other.start,
        wall.end,
      ),
    );
    const revDir = scale(dir, -1);
    pEndLeft = miterCorner(wall.end, revDir, otherDir, half, -1);
    pEndRight = miterCorner(wall.end, revDir, otherDir, half, 1);
  }

  return [pStartLeft, pEndLeft, pEndRight, pStartRight];
}

export type WallMeshPart = {
  wallId: string;
  polygon: Point[];
  yMin: number;
  yMax: number;
};

export function splitWallForOpenings(
  wall: { id: string; start: Point; end: Point; thickness: number },
  allWalls: { id: string; start: Point; end: Point; thickness: number }[],
  openings: {
    wallId: string;
    offset: number;
    width: number;
    type: 'door' | 'window';
    height: number;
    sillHeight?: number;
  }[],
  wallHeight: number,
): WallMeshPart[] {
  const basePoly = buildWallPolygon(wall, allWalls);
  const wallOpenings = openings
    .filter((o) => o.wallId === wall.id)
    .sort((a, b) => a.offset - b.offset);

  if (wallOpenings.length === 0) {
    return [{ wallId: wall.id, polygon: basePoly, yMin: 0, yMax: wallHeight }];
  }

  const dir = normalize(subtract(wall.end, wall.start));
  const parts: WallMeshPart[] = [];

  const addSolidSlice = (t0: number, t1: number, yMin: number, yMax: number) => {
    if (t1 - t0 < 0.01) return;
    const s = add(wall.start, scale(dir, t0));
    const e = add(wall.start, scale(dir, t1));
    const slicePoly = buildWallPolygon(
      { ...wall, start: s, end: e },
      allWalls,
    );
    parts.push({ wallId: wall.id, polygon: slicePoly, yMin, yMax });
  };

  let cursor = 0;
  for (const opening of wallOpenings) {
    addSolidSlice(cursor, opening.offset, 0, wallHeight);
    if (opening.type === 'door') {
      cursor = opening.offset + opening.width;
      continue;
    }
    const sill = opening.sillHeight ?? 0.9;
    addSolidSlice(opening.offset, opening.offset + opening.width, 0, sill);
    addSolidSlice(
      opening.offset,
      opening.offset + opening.width,
      sill + opening.height,
      wallHeight,
    );
    cursor = opening.offset + opening.width;
  }

  const wallLen = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
  addSolidSlice(cursor, wallLen, 0, wallHeight);

  return parts;
}

export function boundsFromWalls(
  walls: { start: Point; end: Point }[],
): { minX: number; maxX: number; minZ: number; maxZ: number } {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const w of walls) {
    for (const p of [w.start, w.end]) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minZ = Math.min(minZ, p.y);
      maxZ = Math.max(maxZ, p.y);
    }
  }
  if (!Number.isFinite(minX)) {
    return { minX: -2, maxX: 2, minZ: -2, maxZ: 2 };
  }
  return { minX, maxX, minZ, maxZ };
}
