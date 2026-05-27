import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  ActivePlaceable,
  FloorPlan,
  FloorPlanUnit,
  Furniture,
  FurnitureKind,
  LandscapeElement,
  LandscapeKind,
  LineSuggestion,
  LotSize,
  Opening,
  PlaceableDimensions,
  Point,
  ScaleInfo,
  Selection,
  SunTime,
  Tool,
  TraceParams,
  Wall,
} from '../types/floorPlan';
import {
  DEFAULT_BACKGROUND_OFFSET,
  DEFAULT_NORTH_ANGLE_DEG,
  DEFAULT_SUN_TIME,
  DEFAULT_TRACE_PARAMS,
} from '../types/floorPlan';
import {
  FURNITURE_DEFAULTS,
  LANDSCAPE_DEFAULTS,
} from '../lib/placeables/defaults';
import { convertWallsToWorld, clampOpeningOnWall } from '../lib/geometry/units';
import {
  rectangleFromCorners,
  rectangleWallSegments,
} from '../lib/geometry/rectangle';
import { traceFloorPlan } from '../lib/opencv/traceFloorPlan';
import { prepareTraceImage, yieldToMain } from '../lib/opencv/prepareTraceImage';
import {
  deduplicateLines,
  mergeCollinearLines,
  orthogonalizeLines,
} from '../lib/opencv/postProcess';
import {
  defaultOpeningHeight,
  defaultOpeningWidth,
  defaultWallHeight,
  defaultWallThickness,
  defaultWindowSill,
} from '../lib/units/defaults';
import { convertPlanToUnit } from '../lib/units/convert';
import { setWallLength, wallLength } from '../lib/geometry/vectors';
import { MAX_UNDO_STACK, takeSnapshot, type HistorySnapshot } from './history';
import type {
  WorkerTraceRequest,
  WorkerTraceResponse,
} from '../lib/opencv/trace.worker';

type ScaleDraft = {
  pointA: Point | null;
  pointB: Point | null;
};

export type SaveStatus = 'saved' | 'dirty' | 'saving' | 'error';

type FloorPlanState = FloorPlan & {
  tool: Tool;
  selection: Selection;
  activePlaceable: ActivePlaceable;
  gridEnabled: boolean;
  scaleDraft: ScaleDraft;
  wallDraftStart: Point | null;
  pendingLength: string;
  traceLoading: boolean;
  traceError: string | null;

  projectId: string | null;
  projectName: string;
  saveStatus: SaveStatus;
  storageReady: boolean;
  show3DPreview: boolean;
  undoStack: HistorySnapshot[];
  redoStack: HistorySnapshot[];

  setTool: (tool: Tool) => void;
  setActivePlaceable: (placeable: ActivePlaceable) => void;
  startPlace: (placeable: ActivePlaceable) => void;
  setSelection: (selection: Selection) => void;
  setWallSelection: (
    ids: string[],
    focus?: { id: string; anchor: 'start' | 'end' },
  ) => void;
  toggleWallSelection: (id: string, additive: boolean) => void;
  selectAllWalls: () => void;
  deleteSelectedWalls: () => void;
  setGridEnabled: (enabled: boolean) => void;
  setPendingLength: (value: string) => void;
  setTraceParams: (params: Partial<TraceParams>) => void;
  setShow3DPreview: (show: boolean) => void;
  setProjectMeta: (id: string, name: string) => void;
  recordHistory: () => void;
  undo: () => void;
  redo: () => void;

  setBackgroundImage: (dataUrl: string, width: number, height: number) => void;
  clearBackground: () => void;
  setBackgroundVisible: (visible: boolean) => void;

  setScaleDraftPoint: (point: Point) => void;
  resetScaleDraft: () => void;
  applyScale: (realLength: number) => void;

  setUnit: (unit: FloorPlanUnit) => void;
  setLotSize: (lotSize: LotSize | null) => void;
  setNorthAngleDeg: (deg: number) => void;
  setSunTime: (sunTime: SunTime) => void;

  addWall: (start: Point, end: Point, thickness?: number) => string;
  updateWall: (
    id: string,
    patch: Partial<Wall>,
    options?: { recordHistory?: boolean },
  ) => void;
  updateWallLength: (id: string, length: number, anchor?: 'start' | 'end') => void;
  deleteWall: (id: string) => void;
  setWallsSilent: (walls: Wall[]) => void;
  setWallsGeometry: (
    updates: { id: string; start: Point; end: Point }[],
    options?: { recordHistory?: boolean },
  ) => void;
  addRectangleWalls: (start: Point, end: Point) => void;

  addOpening: (
    wallId: string,
    type: Opening['type'],
    offset: number,
    width?: number,
  ) => string;
  updateOpening: (id: string, patch: Partial<Opening>) => void;
  deleteOpening: (id: string) => void;

  addFurniture: (
    kind: FurnitureKind,
    position: Point,
    dimensions?: Partial<PlaceableDimensions>,
    rotation?: number,
  ) => string;
  updateFurniture: (id: string, patch: Partial<Furniture>) => void;
  deleteFurniture: (id: string) => void;

  addLandscape: (
    kind: LandscapeKind,
    position: Point,
    dimensions?: Partial<PlaceableDimensions>,
    rotation?: number,
  ) => string;
  updateLandscape: (id: string, patch: Partial<LandscapeElement>) => void;
  deleteLandscape: (id: string) => void;

  placeActiveItem: (position: Point) => string;

  setSuggestions: (suggestions: LineSuggestion[]) => void;
  acceptSuggestion: (id: string) => void;
  dismissSuggestion: (id: string) => void;
  acceptAllSuggestions: () => void;
  clearSuggestions: () => void;
  straightenWalls: () => void;
  runWallTrace: () => Promise<void>;

  importPlan: (plan: FloorPlan, options?: { recordHistory?: boolean }) => void;
  exportPlan: () => FloorPlan;
  resetPlan: () => void;
};

const DEFAULT_ACTIVE_PLACEABLE: ActivePlaceable = {
  category: 'furniture',
  kind: 'kitchenCounter',
};

const initialPlan: FloorPlan = {
  walls: [],
  openings: [],
  furniture: [],
  landscape: [],
  unit: 'm',
  wallHeight: defaultWallHeight('m'),
  scale: null,
  suggestions: [],
  traceParams: DEFAULT_TRACE_PARAMS,
  northAngleDeg: DEFAULT_NORTH_ANGLE_DEG,
  sunTime: DEFAULT_SUN_TIME,
  lotSize: null,
  backgroundOffset: { ...DEFAULT_BACKGROUND_OFFSET },
  backgroundVisible: true,
};

let wallTraceGeneration = 0;
let activeTraceWorker: Worker | null = null;

/** Cancel an in-flight worker trace or ignore a pending sync trace result. */
export function cancelActiveTrace(): void {
  wallTraceGeneration += 1;
  activeTraceWorker?.terminate();
  activeTraceWorker = null;
}

function traceParamsForWorker(params: TraceParams) {
  return {
    cannyLow: params.cannyLow,
    cannyHigh: params.cannyHigh,
    houghThreshold: params.houghThreshold,
    minLineLength: params.minLineLength,
    maxLineGap: params.maxLineGap,
  };
}

async function traceWithWorker(
  dataUrl: string,
  params: TraceParams,
  gen: number,
): Promise<LineSuggestion[]> {
  const prepared = await prepareTraceImage(dataUrl);
  if (gen !== wallTraceGeneration) return [];

  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('../lib/opencv/trace.worker.ts', import.meta.url),
      { type: 'module' },
    );
    activeTraceWorker = worker;
    const requestId = Date.now();

    worker.onmessage = (event: MessageEvent<WorkerTraceResponse>) => {
      if (event.data.id !== requestId) return;
      worker.terminate();
      if (activeTraceWorker === worker) activeTraceWorker = null;

      if ('error' in event.data && event.data.error) {
        reject(new Error(event.data.error));
        return;
      }

      if (!('lines' in event.data)) {
        reject(new Error('Invalid trace worker response'));
        return;
      }

      const scale = prepared.scaleToOriginal;
      const raw = event.data.lines.map((line) => ({
        start: { x: line.start.x * scale, y: line.start.y * scale },
        end: { x: line.end.x * scale, y: line.end.y * scale },
      }));

      let processed = mergeCollinearLines(raw);
      if (params.orthogonalize) {
        processed = orthogonalizeLines(processed);
      }
      processed = deduplicateLines(processed, params.minLineLength * 0.5);

      resolve(
        processed.map((line) => ({
          id: uuidv4(),
          start: line.start,
          end: line.end,
        })),
      );
    };

    worker.onerror = () => {
      worker.terminate();
      if (activeTraceWorker === worker) activeTraceWorker = null;
      reject(new Error('Trace worker failed'));
    };

    const payload: WorkerTraceRequest = {
      id: requestId,
      width: prepared.width,
      height: prepared.height,
      data: prepared.data,
      params: traceParamsForWorker(params),
    };
    worker.postMessage(payload, [payload.data.buffer]);
  });
}

export const useFloorPlanStore = create<FloorPlanState>()((set, get) => ({
  ...initialPlan,
  tool: 'wall',
  selection: null,
  activePlaceable: DEFAULT_ACTIVE_PLACEABLE,
  gridEnabled: true,
  scaleDraft: { pointA: null, pointB: null },
  wallDraftStart: null,
  pendingLength: '',
  traceLoading: false,
  traceError: null,

  projectId: null,
  projectName: 'Untitled plan',
  saveStatus: 'saved',
  storageReady: false,
  show3DPreview: false,
  undoStack: [],
  redoStack: [],

  setTool: (tool) =>
    set({
      tool,
      selection: tool === 'select' ? get().selection : null,
      wallDraftStart: null,
      scaleDraft: { pointA: null, pointB: null },
    }),

  setActivePlaceable: (activePlaceable) => set({ activePlaceable }),

  startPlace: (activePlaceable) =>
    set({
      tool: 'place',
      activePlaceable,
      selection: null,
      wallDraftStart: null,
      scaleDraft: { pointA: null, pointB: null },
    }),

  setSelection: (selection) => set({ selection }),

  setWallSelection: (ids, focus) =>
    set({
      selection: ids.length > 0 ? { type: 'walls', ids, focus } : null,
    }),

  toggleWallSelection: (id, additive) => {
    const sel = get().selection;
    if (!additive) {
      set({ selection: { type: 'walls', ids: [id] } });
      return;
    }
    if (sel?.type === 'walls') {
      const has = sel.ids.includes(id);
      const ids = has ? sel.ids.filter((x) => x !== id) : [...sel.ids, id];
      set({ selection: ids.length > 0 ? { type: 'walls', ids } : null });
      return;
    }
    set({ selection: { type: 'walls', ids: [id] } });
  },

  selectAllWalls: () => {
    const ids = get().walls.map((w) => w.id);
    set({ selection: ids.length > 0 ? { type: 'walls', ids } : null });
  },

  deleteSelectedWalls: () => {
    const sel = get().selection;
    if (sel?.type !== 'walls' || sel.ids.length === 0) return;
    get().recordHistory();
    const idSet = new Set(sel.ids);
    set({
      walls: get().walls.filter((w) => !idSet.has(w.id)),
      openings: get().openings.filter((o) => !idSet.has(o.wallId)),
      selection: null,
    });
  },

  setGridEnabled: (gridEnabled) => set({ gridEnabled }),
  setPendingLength: (pendingLength) => set({ pendingLength }),
  setTraceParams: (params) =>
    set({ traceParams: { ...get().traceParams, ...params } }),
  setShow3DPreview: (show3DPreview) => set({ show3DPreview }),
  setProjectMeta: (projectId, projectName) => set({ projectId, projectName }),

  recordHistory: () => {
    const snapshot = takeSnapshot(get());
    set((state) => ({
      undoStack: [...state.undoStack, snapshot].slice(-MAX_UNDO_STACK),
      redoStack: [],
    }));
  },

  undo: () => {
    const { undoStack, redoStack, walls, openings, scale } = get();
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    const current = takeSnapshot({ walls, openings, scale });
    set({
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, current].slice(-MAX_UNDO_STACK),
      walls: previous.walls,
      openings: previous.openings,
      scale: previous.scale,
    });
  },

  redo: () => {
    const { undoStack, redoStack, walls, openings, scale } = get();
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    const current = takeSnapshot({ walls, openings, scale });
    set({
      redoStack: redoStack.slice(0, -1),
      undoStack: [...undoStack, current].slice(-MAX_UNDO_STACK),
      walls: next.walls,
      openings: next.openings,
      scale: next.scale,
    });
  },

  setBackgroundImage: (dataUrl, width, height) => {
    cancelActiveTrace();
    set({
      backgroundImage: dataUrl,
      imageSize: { width, height },
      backgroundVisible: true,
      backgroundOffset: { ...DEFAULT_BACKGROUND_OFFSET },
      scale: null,
      walls: [],
      openings: [],
      furniture: [],
      landscape: [],
      suggestions: [],
      selection: null,
      traceError: null,
    });
    void get().runWallTrace();
  },

  clearBackground: () => {
    cancelActiveTrace();
    set({
      backgroundImage: undefined,
      imageSize: undefined,
      scale: null,
      suggestions: [],
      traceLoading: false,
      traceError: null,
    });
  },

  setBackgroundVisible: (backgroundVisible) => set({ backgroundVisible }),

  setScaleDraftPoint: (point) => {
    const { scaleDraft } = get();
    if (!scaleDraft.pointA) {
      set({ scaleDraft: { pointA: point, pointB: null } });
    } else if (!scaleDraft.pointB) {
      set({ scaleDraft: { pointA: scaleDraft.pointA, pointB: point } });
    } else {
      set({ scaleDraft: { pointA: point, pointB: null } });
    }
  },

  resetScaleDraft: () => set({ scaleDraft: { pointA: null, pointB: null } }),

  applyScale: (realLength) => {
    const { scaleDraft, walls, scale: existingScale, unit } = get();
    if (!scaleDraft.pointA || !scaleDraft.pointB || realLength <= 0) return;

    const pixelDist = Math.hypot(
      scaleDraft.pointB.x - scaleDraft.pointA.x,
      scaleDraft.pointB.y - scaleDraft.pointA.y,
    );
    if (pixelDist < 1) return;

    get().recordHistory();

    const pixelsPerUnit = pixelDist / realLength;
    const newScale: ScaleInfo = { pixelsPerUnit };

    let updatedWalls = walls;
    if (!existingScale) {
      updatedWalls = convertWallsToWorld(walls, pixelsPerUnit).map((w) => ({
        ...w,
        thickness: defaultWallThickness(unit),
      }));
    }

    set({
      scale: newScale,
      walls: updatedWalls,
      scaleDraft: { pointA: null, pointB: null },
      tool: 'wall',
    });
  },

  setUnit: (unit) => {
    const prev = get().unit;
    if (prev === unit) return;
    get().recordHistory();
    const { walls, openings, wallHeight, scale, lotSize, backgroundOffset } = get();
    const converted = convertPlanToUnit(
      { walls, openings, wallHeight, scale, lotSize, backgroundOffset },
      prev,
      unit,
    );
    set({ unit, ...converted });
  },

  setLotSize: (lotSize) => set({ lotSize }),
  setNorthAngleDeg: (northAngleDeg) => set({ northAngleDeg }),
  setSunTime: (sunTime) => set({ sunTime }),

  addWall: (start, end, thickness) => {
    const { unit } = get();
    const id = uuidv4();
    const wall: Wall = {
      id,
      start,
      end,
      thickness: thickness ?? defaultWallThickness(unit),
    };
    get().recordHistory();
    set({ walls: [...get().walls, wall] });
    return id;
  },

  updateWall: (id, patch, options) => {
    if (options?.recordHistory !== false) {
      get().recordHistory();
    }
    set({
      walls: get().walls.map((w) => (w.id === id ? { ...w, ...patch } : w)),
    });
  },

  updateWallLength: (id, length, anchor = 'start') => {
    const wall = get().walls.find((w) => w.id === id);
    if (!wall) return;
    get().recordHistory();
    const updated = setWallLength(wall, Math.max(0.01, length), anchor);
    get().updateWall(id, updated, { recordHistory: false });
  },

  deleteWall: (id) => {
    get().recordHistory();
    const sel = get().selection;
    let nextSelection: Selection = sel;
    if (sel?.type === 'walls') {
      const ids = sel.ids.filter((x) => x !== id);
      nextSelection =
        ids.length > 0
          ? {
              type: 'walls',
              ids,
              focus: sel.focus?.id === id ? undefined : sel.focus,
            }
          : null;
    } else if (sel?.type === 'opening') {
      const opening = get().openings.find((o) => o.id === sel.id);
      if (opening?.wallId === id) nextSelection = null;
    }

    set({
      walls: get().walls.filter((w) => w.id !== id),
      openings: get().openings.filter((o) => o.wallId !== id),
      selection: nextSelection,
    });
  },

  setWallsSilent: (walls) => set({ walls }),

  setWallsGeometry: (updates, options) => {
    if (options?.recordHistory !== false) {
      get().recordHistory();
    }
    const map = new Map(updates.map((u) => [u.id, u]));
    set({
      walls: get().walls.map((w) => {
        const u = map.get(w.id);
        return u ? { ...w, start: u.start, end: u.end } : w;
      }),
    });
  },

  addRectangleWalls: (start, end) => {
    const { unit } = get();
    get().recordHistory();
    const corners = rectangleFromCorners(start, end);
    const segments = rectangleWallSegments(corners);
    const thickness = defaultWallThickness(unit);
    const newWalls: Wall[] = segments.map((seg) => ({
      id: uuidv4(),
      start: seg.start,
      end: seg.end,
      thickness,
    }));
    set({
      walls: [...get().walls, ...newWalls],
      selection: { type: 'walls', ids: newWalls.map((w) => w.id) },
    });
  },

  addOpening: (wallId, type, offset, width) => {
    const wall = get().walls.find((w) => w.id === wallId);
    if (!wall) return '';

    const { unit } = get();
    const w = width ?? defaultOpeningWidth(type, unit);
    const len = wallLength(wall);
    const clamped = clampOpeningOnWall({ offset, width: w }, len);

    get().recordHistory();

    const opening: Opening = {
      id: uuidv4(),
      wallId,
      type,
      offset: clamped.offset,
      width: clamped.width,
      height: defaultOpeningHeight(type, unit),
      sillHeight: type === 'window' ? defaultWindowSill(unit) : undefined,
    };

    set({
      openings: [...get().openings, opening],
      selection: { type: 'opening', id: opening.id },
    });
    return opening.id;
  },

  updateOpening: (id, patch) => {
    get().recordHistory();
    set({
      openings: get().openings.map((o) => {
        if (o.id !== id) return o;
        const merged = { ...o, ...patch };
        const wall = get().walls.find((w) => w.id === merged.wallId);
        if (wall) {
          const clamped = clampOpeningOnWall(merged, wallLength(wall));
          merged.offset = clamped.offset;
          merged.width = clamped.width;
        }
        return merged;
      }),
    });
  },

  deleteOpening: (id) => {
    get().recordHistory();
    const sel = get().selection;
    set({
      openings: get().openings.filter((o) => o.id !== id),
      selection: sel?.type === 'opening' && sel.id === id ? null : sel,
    });
  },

  addFurniture: (kind, position, dimensions, rotation = 0) => {
    const defaults = FURNITURE_DEFAULTS[kind];
    const item: Furniture = {
      id: uuidv4(),
      category: 'furniture',
      kind,
      position,
      width: dimensions?.width ?? defaults.width,
      depth: dimensions?.depth ?? defaults.depth,
      height: dimensions?.height ?? defaults.height,
      rotation,
    };
    get().recordHistory();
    set({
      furniture: [...get().furniture, item],
      selection: { type: 'furniture', id: item.id },
    });
    return item.id;
  },

  updateFurniture: (id, patch) =>
    set({
      furniture: get().furniture.map((f) =>
        f.id === id ? { ...f, ...patch } : f,
      ),
    }),

  deleteFurniture: (id) => {
    get().recordHistory();
    const sel = get().selection;
    set({
      furniture: get().furniture.filter((f) => f.id !== id),
      selection: sel?.type === 'furniture' && sel.id === id ? null : sel,
    });
  },

  addLandscape: (kind, position, dimensions, rotation = 0) => {
    const defaults = LANDSCAPE_DEFAULTS[kind];
    const item: LandscapeElement = {
      id: uuidv4(),
      category: 'landscape',
      kind,
      position,
      width: dimensions?.width ?? defaults.width,
      depth: dimensions?.depth ?? defaults.depth,
      height: dimensions?.height ?? defaults.height,
      rotation,
    };
    get().recordHistory();
    set({
      landscape: [...get().landscape, item],
      selection: { type: 'landscape', id: item.id },
    });
    return item.id;
  },

  updateLandscape: (id, patch) =>
    set({
      landscape: get().landscape.map((l) =>
        l.id === id ? { ...l, ...patch } : l,
      ),
    }),

  deleteLandscape: (id) => {
    get().recordHistory();
    const sel = get().selection;
    set({
      landscape: get().landscape.filter((l) => l.id !== id),
      selection: sel?.type === 'landscape' && sel.id === id ? null : sel,
    });
  },

  placeActiveItem: (position) => {
    const { activePlaceable, addFurniture, addLandscape } = get();
    if (activePlaceable.category === 'furniture') {
      return addFurniture(activePlaceable.kind, position);
    }
    return addLandscape(activePlaceable.kind, position);
  },

  setSuggestions: (suggestions) => set({ suggestions }),

  acceptSuggestion: (id) => {
    const { suggestions, scale, unit } = get();
    const s = suggestions.find((x) => x.id === id);
    if (!s) return;

    get().recordHistory();

    const thickness = scale ? defaultWallThickness(unit) : 4;
    const wall: Wall = scale
      ? {
          id: uuidv4(),
          start: {
            x: s.start.x / scale.pixelsPerUnit,
            y: s.start.y / scale.pixelsPerUnit,
          },
          end: {
            x: s.end.x / scale.pixelsPerUnit,
            y: s.end.y / scale.pixelsPerUnit,
          },
          thickness: defaultWallThickness(unit),
        }
      : { id: uuidv4(), start: s.start, end: s.end, thickness };
    set({ walls: [...get().walls, wall] });

    set({
      suggestions: suggestions.filter((x) => x.id !== id),
    });
  },

  dismissSuggestion: (id) =>
    set({
      suggestions: get().suggestions.filter((x) => x.id !== id),
    }),

  acceptAllSuggestions: () => {
    const ids = get().suggestions.map((s) => s.id);
    ids.forEach((id) => get().acceptSuggestion(id));
  },

  clearSuggestions: () => set({ suggestions: [] }),

  straightenWalls: () => {
    const orthogonalize = (p1: Point, p2: Point): { start: Point; end: Point } => {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      if (Math.abs(dx) >= Math.abs(dy)) {
        return { start: p1, end: { x: p2.x, y: p1.y } };
      }
      return { start: p1, end: { x: p1.x, y: p2.y } };
    };

    get().recordHistory();
    set({
      walls: get().walls.map((w) => {
        const straight = orthogonalize(w.start, w.end);
        return { ...w, ...straight };
      }),
    });
  },

  runWallTrace: async () => {
    const { backgroundImage, traceParams } = get();
    if (!backgroundImage) return;

    activeTraceWorker?.terminate();
    activeTraceWorker = null;
    const gen = ++wallTraceGeneration;

    set({ traceLoading: true, traceError: null, suggestions: [] });

    try {
      await yieldToMain();

      let result: LineSuggestion[];
      try {
        result = await traceWithWorker(backgroundImage, traceParams, gen);
      } catch {
        if (gen !== wallTraceGeneration) return;
        result = await traceFloorPlan(backgroundImage, traceParams);
      }

      if (gen !== wallTraceGeneration) return;
      set({ suggestions: result, traceLoading: false, traceError: null });
    } catch (err) {
      if (gen !== wallTraceGeneration) return;
      set({
        traceError: err instanceof Error ? err.message : 'Wall trace failed',
        traceLoading: false,
      });
    }
  },

  importPlan: (plan, options) => {
    if (options?.recordHistory !== false) {
      get().recordHistory();
    }
    set({
      ...initialPlan,
      ...plan,
      furniture: plan.furniture ?? [],
      landscape: plan.landscape ?? [],
      traceParams: plan.traceParams ?? DEFAULT_TRACE_PARAMS,
      northAngleDeg: plan.northAngleDeg ?? DEFAULT_NORTH_ANGLE_DEG,
      sunTime: plan.sunTime ?? DEFAULT_SUN_TIME,
      lotSize: plan.lotSize ?? null,
      backgroundOffset: plan.backgroundOffset ?? { ...DEFAULT_BACKGROUND_OFFSET },
      backgroundVisible: plan.backgroundVisible ?? true,
    });
  },

  exportPlan: (): FloorPlan => {
    const {
      walls,
      openings,
      furniture,
      landscape,
      unit,
      wallHeight,
      backgroundImage,
      imageSize,
      backgroundOffset,
      backgroundVisible,
      scale,
      suggestions,
      traceParams,
      northAngleDeg,
      sunTime,
      lotSize,
    } = get();
    return {
      walls,
      openings,
      furniture,
      landscape,
      unit,
      wallHeight,
      backgroundImage,
      imageSize,
      backgroundOffset,
      backgroundVisible,
      scale,
      suggestions,
      traceParams,
      northAngleDeg,
      sunTime,
      lotSize,
    };
  },

  resetPlan: () => {
    cancelActiveTrace();
    set({
      ...initialPlan,
      tool: 'wall',
      selection: null,
      activePlaceable: DEFAULT_ACTIVE_PLACEABLE,
      gridEnabled: true,
      scaleDraft: { pointA: null, pointB: null },
      wallDraftStart: null,
      pendingLength: '',
      traceLoading: false,
      traceError: null,
      show3DPreview: false,
    });
  },
}));
