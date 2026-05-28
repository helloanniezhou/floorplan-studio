import type { Opening, Point, Wall } from '../../types/floorPlan';
import { wallDirection } from '../geometry/vectors';

export type DoorSwingSide = 'left' | 'right';

export type DoorStyle = 'swing' | 'sliding';

export type DoorSymbolGeometry =
  | {
      kind: 'swing';
      hinge: Point;
      radius: number;
      rotationDeg: number;
      sweepDeg: number;
    }
  | {
      kind: 'sliding';
      track: [Point, Point];
      panelA: [Point, Point];
      panelB: [Point, Point];
    };

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * Plan-view door symbol from wall direction (start → end) and opening span.
 */
export function getDoorSymbolGeometry(
  wall: Wall,
  opening: Pick<Opening, 'offset' | 'width' | 'doorStyle' | 'doorSwing'>,
  openingStart: Point,
  openingEnd: Point,
  pixelsPerUnit: number | null,
): DoorSymbolGeometry {
  const scale = pixelsPerUnit ?? 1;
  const widthPx = opening.width * scale;
  const dir = wallDirection(wall);
  const style = opening.doorStyle ?? 'swing';

  if (style === 'sliding') {
    const inset = Math.min(widthPx * 0.12, 8 / scale);
    const along = { x: dir.x * inset, y: dir.y * inset };
    const trackStart = {
      x: openingStart.x + along.x,
      y: openingStart.y + along.y,
    };
    const trackEnd = {
      x: openingEnd.x - along.x,
      y: openingEnd.y - along.y,
    };
    const n = { x: -dir.y, y: dir.x };
    const panelOffset = Math.min(wall.thickness * scale * 0.35, widthPx * 0.08, 6);
    const o = { x: n.x * panelOffset, y: n.y * panelOffset };
    return {
      kind: 'sliding',
      track: [trackStart, trackEnd],
      panelA: [
        { x: trackStart.x + o.x, y: trackStart.y + o.y },
        { x: trackEnd.x + o.x, y: trackEnd.y + o.y },
      ],
      panelB: [
        { x: trackStart.x - o.x, y: trackStart.y - o.y },
        { x: trackEnd.x - o.x, y: trackEnd.y - o.y },
      ],
    };
  }

  const swing = opening.doorSwing ?? 'left';
  const wallDeg = toDeg(Math.atan2(dir.y, dir.x));

  if (swing === 'left') {
    return {
      kind: 'swing',
      hinge: openingStart,
      radius: widthPx,
      rotationDeg: wallDeg,
      sweepDeg: 90,
    };
  }

  return {
    kind: 'swing',
    hinge: openingEnd,
    radius: widthPx,
    rotationDeg: wallDeg + 180,
    sweepDeg: 90,
  };
}
