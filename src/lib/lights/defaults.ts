import type { LightKind } from '../../types/floorPlan';
import {
  DEFAULT_CEILING_LIGHT_HEIGHT_M,
  DEFAULT_LIGHT_INTENSITY,
  DEFAULT_OUTDOOR_LIGHT_HEIGHT_M,
  LIGHT_KIND_LABELS,
} from '../../types/floorPlan';

export { LIGHT_KIND_LABELS };

export const LIGHT_TOOL_ITEMS: { kind: LightKind; icon: string }[] = [
  { kind: 'ceiling', icon: '◉' },
  { kind: 'pendant', icon: '💡' },
  { kind: 'recessed', icon: '◎' },
  { kind: 'wall', icon: '▮' },
  { kind: 'outdoor', icon: '☀' },
];

export function defaultLightHeight(kind: LightKind, wallHeight: number): number {
  if (kind === 'outdoor') return DEFAULT_OUTDOOR_LIGHT_HEIGHT_M;
  if (kind === 'wall') return wallHeight * 0.55;
  if (kind === 'pendant') return wallHeight * 0.75;
  return DEFAULT_CEILING_LIGHT_HEIGHT_M;
}

export function defaultLightIntensity(): number {
  return DEFAULT_LIGHT_INTENSITY;
}
