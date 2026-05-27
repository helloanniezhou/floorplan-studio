import type { FloorPlanUnit, Point, Wall } from '../../types/floorPlan';
import { distance, feetToMeters } from './vectors';

export type EnclosedRegion = {
  vertices: Point[];
  areaPlanUnits: number;
};

export type EnclosedAreaResult = {
  regions: EnclosedRegion[];
  totalPlanUnits: number;
};

type DirectedEdge = {
  from: number;
  to: number;
  wallId: string;
  key: string;
};

function polygonAreaSigned(vertices: Point[]): number {
  let sum = 0;
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    sum += vertices[i].x * vertices[j].y - vertices[j].x * vertices[i].y;
  }
  return sum / 2;
}

function snapTolerance(walls: Wall[]): number {
  if (walls.length === 0) return 0.05;
  const minLen = Math.min(...walls.map((w) => distance(w.start, w.end)));
  return Math.max(0.02, Math.min(0.25, minLen * 0.05));
}

function buildNodeIndex(walls: Wall[], tolerance: number): {
  nodes: Point[];
  wallEdges: { a: number; b: number; wallId: string }[];
} {
  const nodes: Point[] = [];

  const indexOf = (p: Point): number => {
    for (let i = 0; i < nodes.length; i++) {
      if (distance(p, nodes[i]) <= tolerance) return i;
    }
    nodes.push({ x: p.x, y: p.y });
    return nodes.length - 1;
  };

  const wallEdges = walls.map((w) => ({
    a: indexOf(w.start),
    b: indexOf(w.end),
    wallId: w.id,
  }));

  return { nodes, wallEdges };
}

function angleAt(vertex: Point, neighbor: Point): number {
  return Math.atan2(neighbor.y - vertex.y, neighbor.x - vertex.x);
}

function traceFace(
  start: DirectedEdge,
  adjacency: Map<number, number[]>,
  nodes: Point[],
  visited: Set<string>,
): Point[] | null {
  if (visited.has(start.key)) return null;
  visited.add(start.key);

  const face: Point[] = [nodes[start.from]];
  let current = start;

  for (let guard = 0; guard < 10_000; guard++) {
    const v = current.to;
    const u = current.from;
    const vertex = nodes[v];
    const neighbors = adjacency.get(v) ?? [];
    if (neighbors.length < 2) return null;

    const sorted = [...neighbors].sort(
      (a, b) => angleAt(vertex, nodes[a]) - angleAt(vertex, nodes[b]),
    );
    const incoming = u;
    const idx = sorted.indexOf(incoming);
    if (idx < 0) return null;
    const nextVertex = sorted[(idx - 1 + sorted.length) % sorted.length];

    if (v === start.from && nextVertex === start.to) {
      return face;
    }

    face.push(vertex);
    const nextKey = `${v}->${nextVertex}`;
    if (visited.has(nextKey)) return null;
    visited.add(nextKey);

    current = { from: v, to: nextVertex, wallId: '', key: nextKey };
  }

  return null;
}

/**
 * Find enclosed regions bounded by the given wall centerlines (plan units).
 */
export function computeEnclosedAreasFromWalls(
  walls: Wall[],
  selectedIds: string[],
): EnclosedAreaResult | null {
  if (selectedIds.length < 3) return null;

  const idSet = new Set(selectedIds);
  const selected = walls.filter((w) => idSet.has(w.id));
  if (selected.length < 3) return null;

  const tolerance = snapTolerance(selected);
  const { nodes, wallEdges } = buildNodeIndex(selected, tolerance);

  const adjacency = new Map<number, number[]>();
  const directed: DirectedEdge[] = [];

  for (const { a, b, wallId } of wallEdges) {
    if (a === b) continue;
    const push = (from: number, to: number) => {
      if (!adjacency.has(from)) adjacency.set(from, []);
      adjacency.get(from)!.push(to);
      directed.push({ from, to, wallId, key: `${from}->${to}` });
    };
    push(a, b);
    push(b, a);
  }

  const visited = new Set<string>();
  const regions: EnclosedRegion[] = [];

  for (const edge of directed) {
    const vertices = traceFace(edge, adjacency, nodes, visited);
    if (!vertices || vertices.length < 3) continue;
    const area = polygonAreaSigned(vertices);
    if (Math.abs(area) < 1e-4) continue;
    regions.push({ vertices, areaPlanUnits: area });
  }

  if (regions.length === 0) return { regions: [], totalPlanUnits: 0 };

  // CCW loops have positive signed area; exterior traces are negative.
  let positive = regions
    .filter((r) => r.areaPlanUnits > 0.5)
    .map((r) => ({ ...r, areaPlanUnits: r.areaPlanUnits }));

  if (positive.length === 0) {
    positive = regions
      .filter((r) => r.areaPlanUnits < -0.5)
      .map((r) => ({ ...r, areaPlanUnits: Math.abs(r.areaPlanUnits) }));
  }

  // If multiple positive faces remain, drop the largest (often the outer shell).
  if (positive.length > 1) {
    const maxArea = Math.max(...positive.map((r) => r.areaPlanUnits));
    const trimmed = positive.filter((r) => r.areaPlanUnits < maxArea - 1e-3);
    if (trimmed.length > 0) positive = trimmed;
  }

  const deduped = dedupeRegions(positive);

  const totalPlanUnits = deduped.reduce((s, r) => s + r.areaPlanUnits, 0);
  return { regions: deduped, totalPlanUnits };
}

function dedupeRegions(regions: EnclosedRegion[]): EnclosedRegion[] {
  const out: EnclosedRegion[] = [];
  for (const r of regions) {
    const dup = out.some(
      (o) =>
        Math.abs(o.areaPlanUnits - r.areaPlanUnits) < 0.25 &&
        Math.abs(o.vertices[0].x - r.vertices[0].x) < 0.05 &&
        Math.abs(o.vertices[0].y - r.vertices[0].y) < 0.05,
    );
    if (!dup) out.push(r);
  }
  return out;
}

export function formatAreaValue(sqPlanUnits: number, planUnit: FloorPlanUnit): string {
  const abs = Math.abs(sqPlanUnits);
  if (planUnit === 'ft') {
    return `${abs.toLocaleString(undefined, { maximumFractionDigits: 1 })} sq ft`;
  }
  return `${abs.toLocaleString(undefined, { maximumFractionDigits: 2 })} m²`;
}

export function formatEnclosedAreaSummary(
  result: EnclosedAreaResult | null,
  planUnit: FloorPlanUnit,
): string {
  if (!result) return 'Select 3+ walls that form a closed loop';
  if (result.regions.length === 0) {
    return 'No enclosed area — walls must form a closed loop';
  }

  const m2PerFt2 = feetToMeters(1) ** 2;
  const sqFt =
    planUnit === 'ft' ? result.totalPlanUnits : result.totalPlanUnits / m2PerFt2;
  const sqM =
    planUnit === 'm' ? result.totalPlanUnits : result.totalPlanUnits * m2PerFt2;

  const ftLabel = `${sqFt.toLocaleString(undefined, { maximumFractionDigits: 1 })} sq ft`;
  const mLabel = `${sqM.toLocaleString(undefined, { maximumFractionDigits: 2 })} m²`;

  if (result.regions.length === 1) {
    return `Enclosed area: ${ftLabel} (${mLabel})`;
  }
  return `Enclosed (${result.regions.length} spaces): ${ftLabel} (${mLabel} total)`;
}
