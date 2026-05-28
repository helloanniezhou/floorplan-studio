import type { Point } from '../../types/floorPlan';
import { buildWallPolygon, squareWallPolygon } from '../walls3d/miter';

type WallShape = {
  id?: string;
  start: Point;
  end: Point;
  thickness: number;
};

/** Closed polygon for 2D plan / 3D extrusion (mitered at joints when `allWalls` is passed). */
export function wallFootprintPolygon(
  wall: WallShape,
  allWalls?: WallShape[],
): Point[] {
  if (allWalls && allWalls.length > 0 && wall.id) {
    return buildWallPolygon(
      { id: wall.id, start: wall.start, end: wall.end, thickness: wall.thickness },
      allWalls.map((w) => ({
        id: w.id ?? '',
        start: w.start,
        end: w.end,
        thickness: w.thickness,
      })),
    );
  }
  return squareWallPolygon(wall);
}

/** The two long faces of the wall (outer edges parallel to the wall run). */
export function wallFaceEdgeSegments(
  wall: WallShape,
  allWalls?: WallShape[],
): [Point, Point][] {
  const [p1, p2, p3, p4] = wallFootprintPolygon(wall, allWalls);
  return [
    [p1, p2],
    [p4, p3],
  ];
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
