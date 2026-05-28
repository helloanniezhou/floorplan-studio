import type { Point, Wall } from '../../types/floorPlan';
import { add, distance, projectPointOnSegment, subtract } from '../geometry/vectors';
import { wallFaceEdgeSegments, wallFootprintPolygon } from '../geometry/wallFootprint';

export type PlacedRect = {
  position: Point;
  width: number;
  depth: number;
  rotation: number;
};

/**
 * Center position so the local corner at (-width/2, -depth/2) sits on cornerWorld.
 * Matches the first corner in rectCorners (before rotation).
 */
export function centerFromCornerAnchor(
  cornerWorld: Point,
  width: number,
  depth: number,
  rotation: number,
): Point {
  const lx = -width / 2;
  const ly = -depth / 2;
  const c = Math.cos(rotation);
  const s = Math.sin(rotation);
  const ox = lx * c - ly * s;
  const oy = lx * s + ly * c;
  return { x: cornerWorld.x - ox, y: cornerWorld.y - oy };
}

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

/** Hit test for rotated ellipse (width/depth are full diameters on each axis). */
export function pointInEllipse(point: Point, rect: PlacedRect): boolean {
  const dx = point.x - rect.position.x;
  const dy = point.y - rect.position.y;
  const c = Math.cos(-rect.rotation);
  const s = Math.sin(-rect.rotation);
  const lx = dx * c - dy * s;
  const ly = dx * s + dy * c;
  const rx = rect.width / 2;
  const ry = rect.depth / 2;
  if (rx < 1e-6 || ry < 1e-6) return false;
  return (lx * lx) / (rx * rx) + (ly * ly) / (ry * ry) <= 1;
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

/** Local origin corner (min X, min Y before rotation) in world space. */
export function anchorCornerWorld(rect: PlacedRect): Point {
  return rectCorners(rect)[0];
}

/**
 * Keep the anchor corner fixed while changing width/depth (grows from local 0,0, not center).
 */
export function resizePlacedFromAnchorCorner(
  item: PlacedRect,
  patch: Partial<Pick<PlacedRect, 'width' | 'depth'>>,
): Pick<PlacedRect, 'position' | 'width' | 'depth'> {
  const width = patch.width ?? item.width;
  const depth = patch.depth ?? item.depth;
  const anchor = anchorCornerWorld(item);
  const position = centerFromCornerAnchor(anchor, width, depth, item.rotation);
  return { position, width, depth };
}

/** Default snap distance (world units) for furniture against wall faces. */
export function placeableWallSnapRadius(unit: 'm' | 'ft'): number {
  return unit === 'ft' ? 1.5 : 0.45;
}

/**
 * Snap furniture corners to wall outer faces and footprint corners (not centerline).
 */
export function snapPlaceablePosition(
  walls: Wall[],
  item: PlacedRect,
  proposedCenter: Point,
  snapRadius: number,
): Point {
  if (snapRadius <= 0 || walls.length === 0) return proposedCenter;

  const atProposed: PlacedRect = { ...item, position: proposedCenter };
  const corners = rectCorners(atProposed);

  let bestDelta: Point | null = null;
  let bestDist = snapRadius;

  const considerSnap = (corner: Point, target: Point) => {
    const d = distance(corner, target);
    if (d < bestDist) {
      bestDist = d;
      bestDelta = subtract(target, corner);
    }
  };

  for (const wall of walls) {
    for (const vertex of wallFootprintPolygon(wall, walls)) {
      for (const corner of corners) {
        considerSnap(corner, vertex);
      }
    }

    for (const [edgeStart, edgeEnd] of wallFaceEdgeSegments(wall, walls)) {
      for (const corner of corners) {
        const proj = projectPointOnSegment(corner, edgeStart, edgeEnd);
        considerSnap(corner, proj.point);
      }
    }
  }

  return bestDelta ? add(proposedCenter, bestDelta) : proposedCenter;
}
