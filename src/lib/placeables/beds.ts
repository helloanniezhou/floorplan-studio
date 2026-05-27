import type { BedSize, PlaceableDimensions } from '../../types/floorPlan';
import { feetToMeters } from '../geometry/vectors';

/** US mattress sizes (width × length in feet). Plan depth = length, width = mattress width. */
const BED_SIZE_FT: Record<
  BedSize,
  { width: number; depth: number; height: number; label: string }
> = {
  twin: { width: 3.25, depth: 6.25, height: 2.5, label: 'Twin' },
  full: { width: 4.5, depth: 6.25, height: 2.5, label: 'Full' },
  queen: { width: 5, depth: 6.67, height: 2.5, label: 'Queen' },
  king: { width: 6.33, depth: 6.67, height: 2.5, label: 'King' },
  californiaKing: { width: 6, depth: 7, height: 2.5, label: 'California King' },
};

export const BED_SIZE_OPTIONS: BedSize[] = [
  'twin',
  'full',
  'queen',
  'king',
  'californiaKing',
];

export function bedSizeLabel(size: BedSize): string {
  return BED_SIZE_FT[size].label;
}

export function bedDimensionsForSize(
  size: BedSize,
  unit: 'm' | 'ft',
): PlaceableDimensions {
  const ft = BED_SIZE_FT[size];
  const dims = { width: ft.width, depth: ft.depth, height: ft.height };
  if (unit === 'ft') return dims;
  const factor = feetToMeters(1);
  return {
    width: dims.width * factor,
    depth: dims.depth * factor,
    height: dims.height * factor,
  };
}

export const DEFAULT_BED_SIZE: BedSize = 'queen';
