import type { Opening, ScaleInfo, Wall } from '../types/floorPlan';

export type HistorySnapshot = {
  walls: Wall[];
  openings: Opening[];
  scale: ScaleInfo | null;
};

export const MAX_UNDO_STACK = 50;

export function takeSnapshot(state: {
  walls: Wall[];
  openings: Opening[];
  scale: ScaleInfo | null;
}): HistorySnapshot {
  return {
    walls: structuredClone(state.walls),
    openings: structuredClone(state.openings),
    scale: state.scale ? { ...state.scale } : null,
  };
}
