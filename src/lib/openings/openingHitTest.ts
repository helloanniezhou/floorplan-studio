import { projectPointOnSegment, wallLength } from '../geometry/vectors';
import type { Opening, Point, Wall } from '../../types/floorPlan';

export function findOpeningAtPoint(
  world: Point,
  walls: Wall[],
  openings: Opening[],
  maxDistWorld: number,
): Opening | null {
  for (let i = openings.length - 1; i >= 0; i--) {
    const opening = openings[i];
    const wall = walls.find((w) => w.id === opening.wallId);
    if (!wall) continue;

    const len = wallLength(wall);
    if (len < 1e-6) continue;

    const proj = projectPointOnSegment(world, wall.start, wall.end);
    const hitDist = maxDistWorld + wall.thickness / 2;
    if (proj.dist > hitDist) continue;

    const along = proj.t * len;
    if (along >= opening.offset - 0.02 && along <= opening.offset + opening.width + 0.02) {
      return opening;
    }
  }
  return null;
}
