import type { FloorPlan, Opening, Point, ScaleInfo, Wall } from '../../types/floorPlan';
import { feetToMeters, metersToFeet } from '../geometry/vectors';

function scalePoint(p: Point, factor: number): Point {
  return { x: p.x * factor, y: p.y * factor };
}

function convertScale(scale: ScaleInfo | null, factor: number): ScaleInfo | null {
  if (!scale) return null;
  return { pixelsPerUnit: scale.pixelsPerUnit / factor };
}

/** Convert stored plan measurements between ft and m. */
export function unitConversionFactor(from: 'm' | 'ft', to: 'm' | 'ft'): number {
  if (from === to) return 1;
  return from === 'ft' ? feetToMeters(1) : metersToFeet(1);
}

export function convertPlanToUnit(
  plan: Pick<
    FloorPlan,
    | 'walls'
    | 'openings'
    | 'wallHeight'
    | 'scale'
    | 'lotSize'
    | 'gridSize'
    | 'backgroundOffset'
  >,
  from: 'm' | 'ft',
  to: 'm' | 'ft',
): Pick<
  FloorPlan,
  'walls' | 'openings' | 'wallHeight' | 'scale' | 'lotSize' | 'gridSize' | 'backgroundOffset'
> {
  const factor = unitConversionFactor(from, to);
  if (factor === 1) return plan;

  const walls: Wall[] = plan.walls.map((w) => ({
    ...w,
    start: scalePoint(w.start, factor),
    end: scalePoint(w.end, factor),
    thickness: w.thickness * factor,
  }));

  const openings: Opening[] = plan.openings.map((o) => ({
    ...o,
    offset: o.offset * factor,
    width: o.width * factor,
    height: o.height * factor,
    sillHeight: o.sillHeight !== undefined ? o.sillHeight * factor : undefined,
  }));

  const lotSize = plan.lotSize
    ? { width: plan.lotSize.width * factor, depth: plan.lotSize.depth * factor }
    : null;

  return {
    walls,
    openings,
    wallHeight: plan.wallHeight * factor,
    scale: convertScale(plan.scale, factor),
    lotSize,
    gridSize: plan.gridSize * factor,
    backgroundOffset: scalePoint(plan.backgroundOffset, factor),
  };
}
