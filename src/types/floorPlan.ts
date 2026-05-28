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

export type PlanLevelKind = 'floor' | 'roof';

export type PlanLevel = {
  id: string;
  name: string;
  kind: PlanLevelKind;
  walls: Wall[];
  openings: Opening[];
  lights: LightFixture[];
};

export type LightKind = 'ceiling' | 'pendant' | 'recessed' | 'wall' | 'outdoor';

export type LightFixture = {
  id: string;
  position: Point;
  kind: LightKind;
  /** Relative brightness 0–1 */
  intensity: number;
  /** Mount height in plan units (m or ft) */
  height: number;
};

export type Tool =
  | 'select'
  | 'wall'
  | 'rect'
  | 'door'
  | 'window'
  | 'scale'
  | 'pan'
  | 'place'
  | 'light';

export type PlaceableDimensions = {
  width: number;
  depth: number;
  height: number;
};

export type FurnitureMount = 'floor' | 'top';

export type FurnitureKind =
  | 'kitchenCounter'
  | 'kitchenCabinet'
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
  /** Vertical mount; defaults from kind (e.g. kitchenCabinet → top). */
  mount?: FurnitureMount;
};

export type LandscapeElement = PlacedItemBase & {
  category: 'landscape';
  kind: LandscapeKind;
};

export type FloorPlan = {
  /** Floor plans (max 3) plus optional roof level — each with its own 2D layout */
  levels: PlanLevel[];
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
  /** Snap and visible grid spacing in plan units (ft or m). */
  gridSize: number;
};

export type Selection =
  | { type: 'walls'; ids: string[]; focus?: { id: string; anchor: 'start' | 'end' } }
  | { type: 'opening'; ids: string[] }
  | { type: 'furniture'; ids: string[] }
  | { type: 'landscape'; ids: string[] }
  | { type: 'light'; id: string }
  | {
      type: 'mixed';
      wallIds: string[];
      openingIds: string[];
      furnitureIds: string[];
      landscapeIds: string[];
      focus?: { type: 'wall'; id: string; anchor: 'start' | 'end' };
    }
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

export const DEFAULT_LIGHT_INTENSITY = 0.85;
export const DEFAULT_CEILING_LIGHT_HEIGHT_M = 2.4;
export const DEFAULT_OUTDOOR_LIGHT_HEIGHT_M = 2.8;

export const LIGHT_KIND_LABELS: Record<LightKind, string> = {
  ceiling: 'Ceiling',
  pendant: 'Pendant',
  recessed: 'Recessed',
  wall: 'Wall sconce',
  outdoor: 'Outdoor',
};
