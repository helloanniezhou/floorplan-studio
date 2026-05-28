export type Point = { x: number; y: number };

export type Wall = {
  id: string;
  start: Point;
  end: Point;
  thickness: number;
};

export type OpeningType = 'door' | 'window';

/** Swing door opens to the left or right when looking along the wall start → end. */
export type DoorSwing = 'left' | 'right';

export type DoorStyle = 'swing' | 'sliding';

export type Opening = {
  id: string;
  wallId: string;
  type: OpeningType;
  offset: number;
  width: number;
  height: number;
  sillHeight?: number;
  /** Doors only — default swing */
  doorStyle?: DoorStyle;
  /** Swing doors only — which side the door opens toward */
  doorSwing?: DoorSwing;
};

export type ScaleInfo = {
  pixelsPerUnit: number;
};

export type LineSuggestion = {
  id: string;
  start: Point;
  end: Point;
  dismissed?: boolean;
};

export type TraceParams = {
  cannyLow: number;
  cannyHigh: number;
  houghThreshold: number;
  minLineLength: number;
  maxLineGap: number;
  orthogonalize: boolean;
};

export type FloorPlanUnit = 'm' | 'ft';

export type SunTime = 'morning' | 'noon' | 'evening';

export type LotSize = {
  width: number;
  depth: number;
};

export type Tool =
  | 'select'
  | 'wall'
  | 'rect'
  | 'door'
  | 'window'
  | 'scale'
  | 'pan'
  | 'place';

export type PlaceableDimensions = {
  width: number;
  depth: number;
  height: number;
};

export type FurnitureKind =
  | 'kitchenCounter'
  | 'sink'
  | 'toilet'
  | 'sectionalSofa'
  | 'table'
  | 'chair'
  | 'gasRange'
  | 'fridge'
  | 'bed'
  | 'nightstand';

export type BedSize = 'twin' | 'full' | 'queen' | 'king' | 'californiaKing';

export type LandscapeKind =
  | 'tree'
  | 'shrub'
  | 'flowerBed'
  | 'patio'
  | 'path'
  | 'lawn'
  | 'pool';

export type PlaceableCategory = 'furniture' | 'landscape';

export type ActivePlaceable =
  | { category: 'furniture'; kind: FurnitureKind }
  | { category: 'landscape'; kind: LandscapeKind };

export type PlacedItemBase = {
  id: string;
  position: Point;
  width: number;
  depth: number;
  height: number;
  rotation: number;
};

export type Furniture = PlacedItemBase & {
  category: 'furniture';
  kind: FurnitureKind;
  /** Mattress size preset when kind is bed */
  bedSize?: BedSize;
};

export type LandscapeElement = PlacedItemBase & {
  category: 'landscape';
  kind: LandscapeKind;
};

export type FloorPlan = {
  walls: Wall[];
  openings: Opening[];
  furniture: Furniture[];
  landscape: LandscapeElement[];
  unit: FloorPlanUnit;
  wallHeight: number;
  backgroundImage?: string;
  imageSize?: { width: number; height: number };
  backgroundOffset: Point;
  backgroundVisible: boolean;
  scale: ScaleInfo | null;
  suggestions: LineSuggestion[];
  traceParams: TraceParams;
  northAngleDeg: number;
  sunTime: SunTime;
  lotSize: LotSize | null;
};

export type Selection =
  | { type: 'walls'; ids: string[]; focus?: { id: string; anchor: 'start' | 'end' } }
  | { type: 'opening'; id: string }
  | { type: 'furniture'; id: string }
  | { type: 'landscape'; id: string }
  | null;

export const DEFAULT_TRACE_PARAMS: TraceParams = {
  cannyLow: 50,
  cannyHigh: 150,
  houghThreshold: 80,
  minLineLength: 40,
  maxLineGap: 10,
  orthogonalize: false,
};

export const DEFAULT_NORTH_ANGLE_DEG = 0;
export const DEFAULT_SUN_TIME: SunTime = 'morning';
export const DEFAULT_BACKGROUND_OFFSET: Point = { x: 0, y: 0 };

export const DEFAULT_WALL_THICKNESS_M = 0.15;
export const DEFAULT_WALL_HEIGHT_M = 2.4;
export const DEFAULT_DOOR_WIDTH_M = 0.9;
export const DEFAULT_DOOR_HEIGHT_M = 2.1;
export const DEFAULT_WINDOW_WIDTH_M = 1.2;
export const DEFAULT_WINDOW_HEIGHT_M = 1.2;
export const DEFAULT_WINDOW_SILL_M = 0.9;
