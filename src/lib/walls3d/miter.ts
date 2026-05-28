import type { Point } from '../../types/floorPlan';
import {
  add,
  cross,
  distance,
  dot,
  normalize,
  perpendicular,
  scale,
  subtract,
} from '../geometry/vectors';

export type WallSegment = {
  wallId: string;
  polygon: Point[];
};

export type WallLike = {
  id: string;
  start: Point;
  end: Point;
  thickness: number;
};

function lineIntersection(a1: Point, a2: Point, b1: Point, b2: Point): Point | null {
  const d1 = subtract(a2, a1);
  const d2 = subtract(b2, b1);
  const denom = d1.x * d2.y - d1.y * d2.x;
  if (Math.abs(denom) < 1e-10) return null;
  const t = ((b1.x - a1.x) * d2.y - (b1.y - a1.y) * d2.x) / denom;
  return add(a1, scale(d1, t));
}

function connectionTolerance(walls: WallLike[]): number {
  if (walls.length === 0) return 0.05;
  const minThick = Math.min(...walls.map((w) => w.thickness));
  return Math.max(0.02, Math.min(0.25, minThick * 0.5));
}

function getConnectedWalls(
  point: Point,
  wallId: string,
  walls: WallLike[],
  tolerance: number,
): WallLike[] {
  return walls.filter((w) => {
    if (w.id === wallId) return false;
    return distance(w.start, point) <= tolerance || distance(w.end, point) <= tolerance;
  });
}

function neighborDirectionFrom(vertex: Point, neighbor: WallLike): Point {
  const atStart = distance(neighbor.start, vertex) <= distance(neighbor.end, vertex);
  const far = atStart ? neighbor.end : neighbor.start;
  return normalize(subtract(far, vertex));
}

function pickAdjacentNeighbor(
  vertex: Point,
  dirIntoWall: Point,
  wallId: string,
  walls: WallLike[],
  tolerance: number,
): WallLike | null {
  const neighbors = getConnectedWalls(vertex, wallId, walls, tolerance);
  if (neighbors.length === 0) return null;
  if (neighbors.length === 1) return neighbors[0];

  let best = neighbors[0];
  let bestScore = Infinity;
  for (const neighbor of neighbors) {
    const otherDir = neighborDirectionFrom(vertex, neighbor);
    const c = cross(dirIntoWall, otherDir);
    const d = dot(dirIntoWall, otherDir);
    const angle = Math.abs(Math.atan2(c, d));
    if (angle < bestScore) {
      bestScore = angle;
      best = neighbor;
    }
  }
  return best;
}

function isColinearJoint(dirA: Point, dirB: Point): boolean {
  return Math.abs(dot(normalize(dirA), normalize(dirB))) > 0.985;
}

function miterLimit(halfThick: number, dirA: Point, dirB: Point): number {
  const cos = Math.abs(dot(normalize(dirA), normalize(dirB)));
  const sinHalf = Math.sqrt(Math.max(0.001, (1 - cos) / 2));
  return Math.min(halfThick / sinHalf, halfThick * 8);
}

function miterIntersection(
  vertex: Point,
  dirA: Point,
  dirB: Point,
  halfThick: number,
  side: 1 | -1,
): Point | null {
  const nA = scale(perpendicular(dirA), side * halfThick);
  const nB = scale(perpendicular(dirB), side * halfThick);
  const a1 = add(vertex, nA);
  const a2 = add(vertex, add(nA, scale(dirA, halfThick * 6)));
  const b1 = add(vertex, nB);
  const b2 = add(vertex, add(nB, scale(dirB, halfThick * 6)));
  const hit = lineIntersection(a1, a2, b1, b2);
  if (!hit) return null;
  if (distance(vertex, hit) > miterLimit(halfThick, dirA, dirB)) return null;
  return hit;
}

/**
 * Corner point on one offset side when walking the wall from start → end.
 * Miter only on convex (exterior) corners; bevel on concave (interior) corners.
 */
function offsetCorner(
  vertex: Point,
  travelDir: Point,
  side: 1 | -1,
  atEnd: boolean,
  wallId: string,
  allWalls: WallLike[],
  tolerance: number,
): Point {
  const halfThick =
    allWalls.find((w) => w.id === wallId)?.thickness ??
    allWalls[0]?.thickness ??
    0.15;
  const half = halfThick / 2;
  const bevel = add(vertex, scale(perpendicular(travelDir), side * half));

  const dirIntoWall = atEnd ? scale(travelDir, -1) : travelDir;
  const neighbor = pickAdjacentNeighbor(vertex, dirIntoWall, wallId, allWalls, tolerance);
  if (!neighbor) return bevel;

  const otherDir = neighborDirectionFrom(vertex, neighbor);
  if (isColinearJoint(dirIntoWall, otherDir)) return bevel;

  const turn = cross(dirIntoWall, otherDir);
  const isConvexForSide = side * turn > 0;

  if (isConvexForSide) {
    const hit = miterIntersection(vertex, travelDir, otherDir, half, side);
    if (hit) return hit;
  }

  return bevel;
}

export function squareWallPolygon(wall: Pick<WallLike, 'start' | 'end' | 'thickness'>): Point[] {
  const half = wall.thickness / 2;
  const dir = normalize(subtract(wall.end, wall.start));
  const normal = perpendicular(dir);
  return [
    add(wall.start, scale(normal, half)),
    add(wall.end, scale(normal, half)),
    add(wall.end, scale(normal, -half)),
    add(wall.start, scale(normal, -half)),
  ];
}

function quadSignedArea(polygon: Point[]): number {
  return (
    polygon[0].x * polygon[1].y -
    polygon[1].x * polygon[0].y +
    polygon[1].x * polygon[2].y -
    polygon[2].x * polygon[1].y +
    polygon[2].x * polygon[3].y -
    polygon[3].x * polygon[2].y +
    polygon[3].x * polygon[0].y -
    polygon[0].x * polygon[3].y
  ) / 2;
}

function ensureWallQuad(
  polygon: Point[],
  wall: Pick<WallLike, 'start' | 'end' | 'thickness'>,
): Point[] {
  if (polygon.length !== 4) return squareWallPolygon(wall);

  const half = wall.thickness / 2;
  const minCap = half * 0.25;
  const wallLen = distance(wall.start, wall.end);

  for (const p of polygon) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return squareWallPolygon(wall);
  }

  if (distance(polygon[0], polygon[3]) < minCap) return squareWallPolygon(wall);
  if (distance(polygon[1], polygon[2]) < minCap) return squareWallPolygon(wall);

  const expectedArea = wall.thickness * wallLen;
  if (Math.abs(quadSignedArea(polygon)) < expectedArea * 0.35) return squareWallPolygon(wall);

  return polygon;
}

export function buildWallPolygon(wall: WallLike, allWalls: WallLike[]): Point[] {
  const wallLen = distance(wall.start, wall.end);
  if (wallLen < 1e-4) return [];

  const dir = normalize(subtract(wall.end, wall.start));
  const tol = connectionTolerance(allWalls);

  const pStartLeft = offsetCorner(wall.start, dir, 1, false, wall.id, allWalls, tol);
  const pStartRight = offsetCorner(wall.start, dir, -1, false, wall.id, allWalls, tol);
  const pEndLeft = offsetCorner(wall.end, dir, 1, true, wall.id, allWalls, tol);
  const pEndRight = offsetCorner(wall.end, dir, -1, true, wall.id, allWalls, tol);

  return ensureWallQuad([pStartLeft, pEndLeft, pEndRight, pStartRight], wall);
}

export type WallMeshPart = {
  wallId: string;
  polygon: Point[];
  yMin: number;
  yMax: number;
};

export function splitWallForOpenings(
  wall: WallLike,
  allWalls: WallLike[],
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
  const wallLen = distance(wall.start, wall.end);
  if (wallLen < 1e-4) return [];

  const basePoly = buildWallPolygon(wall, allWalls);
  if (basePoly.length < 3) return [];

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
    const slicePoly = buildWallPolygon({ ...wall, start: s, end: e }, allWalls);
    if (slicePoly.length >= 3) {
      parts.push({ wallId: wall.id, polygon: slicePoly, yMin, yMax });
    }
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
    addSolidSlice(opening.offset, opening.offset + opening.width, sill + opening.height, wallHeight);
    cursor = opening.offset + opening.width;
  }

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
  if (!Number.isFinite(minX) || !Number.isFinite(minZ)) {
    return { minX: -2, maxX: 2, minZ: -2, maxZ: 2 };
  }
  return { minX, maxX, minZ, maxZ };
}
