import type { Point } from '../../types/floorPlan';

const DEG = Math.PI / 180;

function angleOfLine(a: Point, b: Point): number {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

function normalizeAngle(a: number): number {
  let x = a % Math.PI;
  if (x > Math.PI / 2) x -= Math.PI;
  if (x < -Math.PI / 2) x += Math.PI;
  return x;
}

function linesParallel(a1: number, a2: number, toleranceDeg = 3): boolean {
  return Math.abs(normalizeAngle(a1 - a2)) < toleranceDeg * DEG;
}

function pointLineDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) return Math.hypot(p.x - a.x, p.y - a.y);
  return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / len;
}

function projectScalar(p: Point, origin: Point, dir: Point): number {
  return (p.x - origin.x) * dir.x + (p.y - origin.y) * dir.y;
}

export function mergeCollinearLines(
  lines: { start: Point; end: Point }[],
  angleToleranceDeg = 3,
  distanceTolerance = 8,
): { start: Point; end: Point }[] {
  if (lines.length === 0) return [];

  type Seg = { start: Point; end: Point; angle: number; used: boolean };
  const segs: Seg[] = lines.map((l) => ({
    ...l,
    angle: angleOfLine(l.start, l.end),
    used: false,
  }));

  const merged: { start: Point; end: Point }[] = [];

  for (let i = 0; i < segs.length; i++) {
    if (segs[i].used) continue;
    let group = [segs[i]];
    segs[i].used = true;

    for (let j = i + 1; j < segs.length; j++) {
      if (segs[j].used) continue;
      if (!linesParallel(segs[i].angle, segs[j].angle, angleToleranceDeg)) continue;
      const d1 = pointLineDistance(segs[j].start, segs[i].start, segs[i].end);
      const d2 = pointLineDistance(segs[j].end, segs[i].start, segs[i].end);
      if (d1 <= distanceTolerance && d2 <= distanceTolerance) {
        group.push(segs[j]);
        segs[j].used = true;
      }
    }

    const angle = group[0].angle;
    const dir = { x: Math.cos(angle), y: Math.sin(angle) };
    const origin = group[0].start;
    let minT = Infinity;
    let maxT = -Infinity;
    let minP = group[0].start;
    let maxP = group[0].end;

    for (const g of group) {
      for (const p of [g.start, g.end]) {
        const t = projectScalar(p, origin, dir);
        if (t < minT) {
          minT = t;
          minP = p;
        }
        if (t > maxT) {
          maxT = t;
          maxP = p;
        }
      }
    }

    merged.push({ start: minP, end: maxP });
  }

  return merged;
}

export function orthogonalizeLines(
  lines: { start: Point; end: Point }[],
): { start: Point; end: Point }[] {
  return lines.map(({ start, end }) => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    if (Math.abs(dx) >= Math.abs(dy)) {
      return { start, end: { x: end.x, y: start.y } };
    }
    return { start, end: { x: start.x, y: end.y } };
  });
}

export function deduplicateLines(
  lines: { start: Point; end: Point }[],
  minLength = 20,
): { start: Point; end: Point }[] {
  const result: { start: Point; end: Point }[] = [];

  for (const line of lines) {
    const len = Math.hypot(line.end.x - line.start.x, line.end.y - line.start.y);
    if (len < minLength) continue;

    const duplicate = result.some((existing) => {
      const d1 =
        Math.hypot(existing.start.x - line.start.x, existing.start.y - line.start.y) +
        Math.hypot(existing.end.x - line.end.x, existing.end.y - line.end.y);
      const d2 =
        Math.hypot(existing.start.x - line.end.x, existing.start.y - line.end.y) +
        Math.hypot(existing.end.x - line.start.x, existing.end.y - line.start.y);
      return Math.min(d1, d2) < minLength * 0.5;
    });

    if (!duplicate) result.push(line);
  }

  return result;
}
