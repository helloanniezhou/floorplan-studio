export type SunTime = 'morning' | 'noon' | 'evening';

export const SUN_TIME_OPTIONS: { id: SunTime; label: string }[] = [
  { id: 'morning', label: 'Morning (sun from east)' },
  { id: 'noon', label: 'Noon' },
  { id: 'evening', label: 'Evening (sun from west)' },
];

/** Degrees clockwise from the top of the plan (screen up). */
export function normalizeNorthAngle(deg: number): number {
  const n = deg % 360;
  return n < 0 ? n + 360 : n;
}

/** Unit vector for north in plan space (x right, y down). */
export function northVectorPlan(northAngleDeg: number): { x: number; y: number } {
  const rad = (normalizeNorthAngle(northAngleDeg) * Math.PI) / 180;
  return { x: Math.sin(rad), y: -Math.cos(rad) };
}

/** Unit vector for east in plan space. */
export function eastVectorPlan(northAngleDeg: number): { x: number; y: number } {
  return northVectorPlan(northAngleDeg + 90);
}

export type CardinalLabel = 'N' | 'E' | 'S' | 'W';

export function cardinalOffsets(
  northAngleDeg: number,
  radius: number,
): { label: CardinalLabel; x: number; y: number }[] {
  const n = northVectorPlan(northAngleDeg);
  const e = eastVectorPlan(northAngleDeg);
  return [
    { label: 'N', x: n.x * radius, y: n.y * radius },
    { label: 'E', x: e.x * radius, y: e.y * radius },
    { label: 'S', x: -n.x * radius, y: -n.y * radius },
    { label: 'W', x: -e.x * radius, y: -e.y * radius },
  ];
}

export type SunLightConfig = {
  sunPosition: [number, number, number];
  sunIntensity: number;
  fillPosition: [number, number, number];
  fillIntensity: number;
  ambient: number;
};

/** Sun and fill lights relative to scene center (group origin). */
export function sunLightConfig(
  northAngleDeg: number,
  sunTime: SunTime,
  wallHeight: number,
): SunLightConfig {
  const e = eastVectorPlan(northAngleDeg);
  const n = northVectorPlan(northAngleDeg);
  const w = { x: -e.x, y: -e.y };
  const s = { x: -n.x, y: -n.y };
  const dist = 28;
  const h = Math.max(wallHeight, 2);

  switch (sunTime) {
    case 'morning':
      return {
        sunPosition: [e.x * dist, h * 0.45, e.y * dist],
        sunIntensity: 1.2,
        fillPosition: [w.x * dist * 0.35, h * 0.15, w.y * dist * 0.35],
        fillIntensity: 0.22,
        ambient: 0.38,
      };
    case 'noon':
      return {
        sunPosition: [s.x * dist * 0.2 + e.x * dist * 0.08, h * 2.4, s.y * dist * 0.2 + e.y * dist * 0.08],
        sunIntensity: 1.3,
        fillPosition: [n.x * dist * 0.25, h * 0.25, n.y * dist * 0.25],
        fillIntensity: 0.18,
        ambient: 0.48,
      };
    case 'evening':
      return {
        sunPosition: [w.x * dist, h * 0.4, w.y * dist],
        sunIntensity: 1.0,
        fillPosition: [e.x * dist * 0.3, h * 0.12, e.y * dist * 0.3],
        fillIntensity: 0.2,
        ambient: 0.35,
      };
  }
}
