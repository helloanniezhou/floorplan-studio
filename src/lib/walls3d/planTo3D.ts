import type { Point } from '../../types/floorPlan';

/**
 * 2D plan uses screen coords (y increases downward).
 * 3D scene uses y-up; plan.y maps to world +Z.
 * ExtrudeGeometry shapes lie in XY then rotateX(-π/2), so shape.y = -plan.y.
 */
export function planToShapePoint(p: Point): { x: number; y: number } {
  return { x: p.x, y: -p.y };
}
