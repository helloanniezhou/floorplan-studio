import type {
  Furniture,
  LandscapeElement,
  LineSuggestion,
  LotSize,
  Opening,
  Point,
  ScaleInfo,
  SunTime,
  Wall,
} from '../types/floorPlan';

export type HistorySnapshot = {
  walls: Wall[];
  openings: Opening[];
  furniture: Furniture[];
  landscape: LandscapeElement[];
  wallHeight: number;
  backgroundOffset: Point;
  scale: ScaleInfo | null;
  lotSize: LotSize | null;
  gridSize: number;
  northAngleDeg: number;
  sunTime: SunTime;
  suggestions: LineSuggestion[];
};

export const MAX_UNDO_STACK = 50;

export type HistorySource = {
  walls: Wall[];
  openings: Opening[];
  furniture: Furniture[];
  landscape: LandscapeElement[];
  wallHeight: number;
  backgroundOffset: Point;
  scale: ScaleInfo | null;
  lotSize: LotSize | null;
  gridSize: number;
  northAngleDeg: number;
  sunTime: SunTime;
  suggestions: LineSuggestion[];
};

export function takeSnapshot(state: HistorySource): HistorySnapshot {
  return {
    walls: structuredClone(state.walls),
    openings: structuredClone(state.openings),
    furniture: structuredClone(state.furniture),
    landscape: structuredClone(state.landscape),
    wallHeight: state.wallHeight,
    backgroundOffset: { ...state.backgroundOffset },
    scale: state.scale ? { ...state.scale } : null,
    lotSize: state.lotSize ? { ...state.lotSize } : null,
    gridSize: state.gridSize,
    northAngleDeg: state.northAngleDeg,
    sunTime: state.sunTime,
    suggestions: structuredClone(state.suggestions),
  };
}