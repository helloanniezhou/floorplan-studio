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
  LightFixture,
  LightKind,
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
import { getLayoutGeometry, patchLayoutGeometry } from '../lib/plan/layout';
import {
  canAddFloorLevel,
  canRemoveFloorLevel,
  createEmptyLevel,
  defaultPlanLevels,
  floorLevelCount,
  floorLevels,
  normalizePlanLevels,
  resolveActiveLevelId,
  sortLevels,
} from '../lib/plan/levels';
import {
  defaultLightHeight,
  defaultLightIntensity,
} from '../lib/lights/defaults';
import {
  DEFAULT_BACKGROUND_OFFSET,
  DEFAULT_NORTH_ANGLE_DEG,
  DEFAULT_SUN_TIME,
  DEFAULT_TRACE_PARAMS,
} from '../types/floorPlan';
import {
  defaultFurnitureDimensions,
  LANDSCAPE_DEFAULTS,
} from '../lib/placeables/defaults';
import { bedDimensionsForSize, DEFAULT_BED_SIZE } from '../lib/placeables/beds';
import {
  centerFromCornerAnchor,
  placeableWallSnapRadius,
  snapPlaceablePosition,
  type PlacedRect,
} from '../lib/placeables/geometry';
import { defaultMountForFurnitureKind } from '../lib/placeables/mount';
import { convertWallsToWorld, clampOpeningOnWall } from '../lib/geometry/units';
import {
  rectangleFromCorners,
  rectangleWallSegments,
} from '../lib/geometry/rectangle';
import { prepareTraceImage, yieldToMain } from '../lib/opencv/prepareTraceImage';
import {
  deduplicateLines,
  mergeCollinearLines,
  orthogonalizeLines,
} from '../lib/opencv/postProcess';
import {
  defaultGridSizeForUnit,
  defaultOpeningHeight,
  defaultOpeningWidth,
  defaultWallHeight,
  defaultWallThickness,
  defaultWindowSill,
} from '../lib/units/defaults';
import { convertPlanToUnit, unitConversionFactor } from '../lib/units/convert';
import { setWallLength, wallLength } from '../lib/geometry/vectors';
import { MAX_UNDO_STACK, takeSnapshot, type HistorySnapshot } from './history';
import {
  buildClipboardFromSelection,
  DEFAULT_PASTE_OFFSET,
  getPlanClipboard,
  setPlanClipboard,
} from '../lib/clipboard/planClipboard';
import type {
  WorkerTraceRequest,
  WorkerTraceResponse,
} from '../lib/opencv/trace.worker';

type ScaleDraft = {
  pointA: Point | null;
  pointB: Point | null;
};

export type SaveStatus = 'saved' | 'dirty' | 'saving' | 'error';

function patchActiveLevel(
  state: Pick<FloorPlan, 'levels'> & { activeLevelId: string },
  patch: Partial<ReturnType<typeof getLayoutGeometry>>,
): Pick<FloorPlan, 'levels'> {
  return patchLayoutGeometry(state.levels, state.activeLevelId, patch);
}

type FloorPlanState = FloorPlan & {
  activeLevelId: string;
  activeLightKind: LightKind;
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

  setActiveLevelId: (levelId: string) => void;
  addFloorLevel: () => void;
  removeFloorLevel: (levelId: string) => void;
  setActiveLightKind: (kind: LightKind) => void;
  startLightPlace: (kind: LightKind) => void;
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
  deleteSelection: () => void;
  copySelection: () => void;
  pasteSelection: () => void;
  cutSelection: () => void;
  setGridEnabled: (enabled: boolean) => void;
  setPendingLength: (value: string) => void;
  setWallDraftStart: (start: Point | null) => void;
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
  setGridSize: (gridSize: number) => void;
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
    positionAlongWall: number,
    width?: number,
    placement?: 'start' | 'end',
  ) => string;
  updateOpening: (
    id: string,
    patch: Partial<Opening>,
    options?: { recordHistory?: boolean },
  ) => void;
  deleteOpening: (id: string) => void;

  addFurniture: (
    kind: FurnitureKind,
    position: Point,
    dimensions?: Partial<PlaceableDimensions>,
    rotation?: number,
  ) => string;
  updateFurniture: (
    id: string,
    patch: Partial<Furniture>,
    options?: { recordHistory?: boolean },
  ) => void;
  deleteFurniture: (id: string) => void;

  addLandscape: (
    kind: LandscapeKind,
    position: Point,
    dimensions?: Partial<PlaceableDimensions>,
    rotation?: number,
  ) => string;
  updateLandscape: (
    id: string,
    patch: Partial<LandscapeElement>,
    options?: { recordHistory?: boolean },
  ) => void;
  deleteLandscape: (id: string) => void;

  addLight: (position: Point, kind?: LightKind) => string;
  updateLight: (
    id: string,
    patch: Partial<LightFixture>,
    options?: { recordHistory?: boolean },
  ) => void;
  deleteLight: (id: string) => void;
  placeActiveLight: (position: Point) => string;

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

const initialLevels = defaultPlanLevels();

const initialPlan: FloorPlan = {
  levels: initialLevels,
  furniture: [],
  landscape: [],
  unit: 'ft',
  wallHeight: defaultWallHeight('m'),
  scale: null,
  suggestions: [],
  traceParams: DEFAULT_TRACE_PARAMS,
  northAngleDeg: DEFAULT_NORTH_ANGLE_DEG,
  sunTime: DEFAULT_SUN_TIME,
  lotSize: null,
  gridSize: defaultGridSizeForUnit('ft'),
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
  activeLevelId: initialLevels[0]!.id,
  activeLightKind: 'ceiling',
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

  setActiveLevelId: (levelId) => {
    if (get().activeLevelId === levelId) return;
    const level = get().levels.find((l) => l.id === levelId);
    set({
      activeLevelId: levelId,
      selection: null,
      wallDraftStart: null,
      scaleDraft: { pointA: null, pointB: null },
      tool:
        level?.kind === 'roof'
          ? 'wall'
          : get().tool === 'place'
            ? 'select'
            : get().tool,
    });
  },

  addFloorLevel: () => {
    const { levels } = get();
    if (!canAddFloorLevel(levels)) return;
    const n = floorLevelCount(levels) + 1;
    const newLevel = createEmptyLevel('floor', `Floor ${n}`);
    const roofIdx = levels.findIndex((l) => l.kind === 'roof');
    const next =
      roofIdx >= 0
        ? [...levels.slice(0, roofIdx), newLevel, ...levels.slice(roofIdx)]
        : [...levels, newLevel];
    get().recordHistory();
    set({
      levels: next,
      activeLevelId: newLevel.id,
      selection: null,
      wallDraftStart: null,
      tool: 'wall',
    });
  },

  removeFloorLevel: (levelId) => {
    const { levels, activeLevelId } = get();
    if (!canRemoveFloorLevel(levels, levelId)) return;

    const sorted = sortLevels(levels);
    const removeIdx = sorted.findIndex((l) => l.id === levelId);
    const nextLevels = levels.filter((l) => l.id !== levelId);

    let nextActiveId = activeLevelId;
    if (activeLevelId === levelId) {
      const fallback =
        sorted[removeIdx - 1]?.kind === 'floor'
          ? sorted[removeIdx - 1]
          : sorted[removeIdx + 1]?.kind === 'floor'
            ? sorted[removeIdx + 1]
            : floorLevels(nextLevels)[0];
      nextActiveId = fallback?.id ?? resolveActiveLevelId(nextLevels, '');
    }

    get().recordHistory();
    set({
      levels: nextLevels,
      activeLevelId: resolveActiveLevelId(nextLevels, nextActiveId),
      selection: null,
      wallDraftStart: null,
      scaleDraft: { pointA: null, pointB: null },
    });
  },

  setActiveLightKind: (activeLightKind) => set({ activeLightKind }),

  startLightPlace: (kind) =>
    set({
      tool: 'light',
      activeLightKind: kind,
      selection: null,
      wallDraftStart: null,
      scaleDraft: { pointA: null, pointB: null },
    }),

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
    const geo = getLayoutGeometry(get(), get().activeLevelId);
    const ids = geo.walls.map((w) => w.id);
    set({ selection: ids.length > 0 ? { type: 'walls', ids } : null });
  },

  deleteSelectedWalls: () => {
    const sel = get().selection;
    if (sel?.type !== 'walls' || sel.ids.length === 0) return;
    get().recordHistory();
    const idSet = new Set(sel.ids);
    const layout = get().activeLevelId;
    const geo = getLayoutGeometry(get(), layout);
    set({
      ...patchActiveLevel(get(), {
        walls: geo.walls.filter((w) => !idSet.has(w.id)),
        openings: geo.openings.filter((o) => !idSet.has(o.wallId)),
      }),
      selection: null,
    });
  },

  deleteSelection: () => {
    const sel = get().selection;
    if (!sel) return;
    switch (sel.type) {
      case 'walls':
        get().deleteSelectedWalls();
        break;
      case 'opening':
        get().deleteOpening(sel.id);
        break;
      case 'furniture':
        get().deleteFurniture(sel.id);
        break;
      case 'landscape':
        get().deleteLandscape(sel.id);
        break;
      case 'light':
        get().deleteLight(sel.id);
        break;
    }
  },

  copySelection: () => {
    const state = get();
    const geo = getLayoutGeometry(state, state.activeLevelId);
    const payload = buildClipboardFromSelection({
      selection: state.selection,
      walls: geo.walls,
      openings: geo.openings,
      furniture: state.furniture,
      landscape: state.landscape,
    });
    if (payload) setPlanClipboard(payload);
  },

  pasteSelection: () => {
    const clip = getPlanClipboard();
    if (!clip) return;

    const offset = DEFAULT_PASTE_OFFSET;
    get().recordHistory();

    switch (clip.type) {
      case 'walls': {
        const idMap = new Map<string, string>();
        const newWalls = clip.walls.map((w) => {
          const id = uuidv4();
          idMap.set(w.id, id);
          return {
            ...w,
            id,
            start: { x: w.start.x + offset.x, y: w.start.y + offset.y },
            end: { x: w.end.x + offset.x, y: w.end.y + offset.y },
          };
        });
        const newOpenings = clip.openings
          .map((o) => {
            const wallId = idMap.get(o.wallId);
            if (!wallId) return null;
            return { ...o, id: uuidv4(), wallId };
          })
          .filter((o): o is Opening => o !== null);
        const newIds = newWalls.map((w) => w.id);
        const layout = get().activeLevelId;
        const geo = getLayoutGeometry(get(), layout);
        set({
          ...patchActiveLevel(get(), {
            walls: [...geo.walls, ...newWalls],
            openings: [...geo.openings, ...newOpenings],
          }),
          selection: newIds.length > 0 ? { type: 'walls', ids: newIds } : null,
        });
        break;
      }
      case 'opening': {
        const geo = getLayoutGeometry(get(), get().activeLevelId);
        const wall = geo.walls.find((w) => w.id === clip.opening.wallId);
        if (!wall) break;
        const len = wallLength(wall);
        const width = clip.opening.width;
        const nudgeAlongWall = 0.5;
        let nextOffset = clip.opening.offset + nudgeAlongWall;
        if (nextOffset + width > len) {
          nextOffset = Math.max(0, len - width);
        }
        const opening: Opening = {
          ...clip.opening,
          id: uuidv4(),
          offset: nextOffset,
        };
        const clamped = clampOpeningOnWall(opening, len);
        const placed = { ...opening, offset: clamped.offset, width: clamped.width };
        const layout = get().activeLevelId;
        const openingsGeo = getLayoutGeometry(get(), layout);
        set({
          ...patchActiveLevel(get(), {
            openings: [...openingsGeo.openings, placed],
          }),
          selection: { type: 'opening', id: placed.id },
        });
        break;
      }
      case 'furniture': {
        const item: Furniture = {
          ...clip.item,
          id: uuidv4(),
          position: {
            x: clip.item.position.x + offset.x,
            y: clip.item.position.y + offset.y,
          },
        };
        set({
          furniture: [...get().furniture, item],
          selection: { type: 'furniture', id: item.id },
        });
        break;
      }
      case 'landscape': {
        const item: LandscapeElement = {
          ...clip.item,
          id: uuidv4(),
          position: {
            x: clip.item.position.x + offset.x,
            y: clip.item.position.y + offset.y,
          },
        };
        set({
          landscape: [...get().landscape, item],
          selection: { type: 'landscape', id: item.id },
        });
        break;
      }
    }
  },

  cutSelection: () => {
    get().copySelection();
    get().deleteSelection();
  },

  setGridEnabled: (gridEnabled) => set({ gridEnabled }),
  setPendingLength: (pendingLength) => set({ pendingLength }),
  setWallDraftStart: (wallDraftStart) => set({ wallDraftStart }),
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
    const { undoStack, redoStack } = get();
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    const current = takeSnapshot(get());
    const activeLevelId = resolveActiveLevelId(
      previous.levels,
      previous.activeLevelId ?? get().activeLevelId,
    );
    set({
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, current].slice(-MAX_UNDO_STACK),
      ...previous,
      activeLevelId,
    });
  },

  redo: () => {
    const { undoStack, redoStack } = get();
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    const current = takeSnapshot(get());
    const activeLevelId = resolveActiveLevelId(
      next.levels,
      next.activeLevelId ?? get().activeLevelId,
    );
    set({
      redoStack: redoStack.slice(0, -1),
      undoStack: [...undoStack, current].slice(-MAX_UNDO_STACK),
      ...next,
      activeLevelId,
    });
  },

  setBackgroundImage: (dataUrl, width, height) => {
    cancelActiveTrace();
    const ground = floorLevels(get().levels)[0];
    set({
      backgroundImage: dataUrl,
      imageSize: { width, height },
      backgroundVisible: true,
      backgroundOffset: { ...DEFAULT_BACKGROUND_OFFSET },
      scale: null,
      levels: ground
        ? get().levels.map((l) =>
            l.id === ground.id ? { ...l, walls: [], openings: [] } : l,
          )
        : get().levels,
      furniture: [],
      landscape: [],
      suggestions: [],
      selection: null,
      traceLoading: false,
      traceError: null,
    });
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
    const { scaleDraft, levels, scale: existingScale, unit } = get();
    if (!scaleDraft.pointA || !scaleDraft.pointB || realLength <= 0) return;

    const pixelDist = Math.hypot(
      scaleDraft.pointB.x - scaleDraft.pointA.x,
      scaleDraft.pointB.y - scaleDraft.pointA.y,
    );
    if (pixelDist < 1) return;

    get().recordHistory();

    const pixelsPerUnit = pixelDist / realLength;
    const newScale: ScaleInfo = { pixelsPerUnit };

    const convertWalls = (list: Wall[]) => {
      if (existingScale) return list;
      return convertWallsToWorld(list, pixelsPerUnit).map((w) => ({
        ...w,
        thickness: defaultWallThickness(unit),
      }));
    };

    set({
      scale: newScale,
      levels: levels.map((level) => ({
        ...level,
        walls: convertWalls(level.walls),
      })),
      scaleDraft: { pointA: null, pointB: null },
      tool: 'wall',
    });
  },

  setUnit: (unit) => {
    const prev = get().unit;
    if (prev === unit) return;
    get().recordHistory();
    const { levels, wallHeight, scale, lotSize, gridSize, backgroundOffset } = get();
    const sample = levels[0];
    const converted = convertPlanToUnit(
      {
        walls: sample?.walls ?? [],
        openings: sample?.openings ?? [],
        wallHeight,
        scale,
        lotSize,
        gridSize,
        backgroundOffset,
      },
      prev,
      unit,
    );
    const lightFactor = unitConversionFactor(prev, unit);
    const scaleLights = (items: LightFixture[]) =>
      items.map((l) => ({
        ...l,
        position: { x: l.position.x * lightFactor, y: l.position.y * lightFactor },
        height: l.height * lightFactor,
      }));
    set({
      unit,
      wallHeight: converted.wallHeight,
      scale: converted.scale,
      lotSize: converted.lotSize,
      gridSize: converted.gridSize,
      backgroundOffset: converted.backgroundOffset,
      levels: levels.map((level) => {
        const levelConverted = convertPlanToUnit(
          {
            walls: level.walls,
            openings: level.openings,
            wallHeight,
            scale: converted.scale,
            lotSize: converted.lotSize,
            gridSize: converted.gridSize,
            backgroundOffset: converted.backgroundOffset,
          },
          prev,
          unit,
        );
        return {
          ...level,
          walls: levelConverted.walls,
          openings: levelConverted.openings,
          lights: scaleLights(level.lights),
        };
      }),
    });
  },

  setLotSize: (lotSize) => set({ lotSize }),

  setGridSize: (gridSize) => {
    if (!(gridSize > 0)) return;
    set({ gridSize });
  },
  setNorthAngleDeg: (northAngleDeg) => set({ northAngleDeg }),
  setSunTime: (sunTime) => set({ sunTime }),

  addWall: (start, end, thickness) => {
    const { unit, activeLevelId } = get();
    const id = uuidv4();
    const wall: Wall = {
      id,
      start,
      end,
      thickness: thickness ?? defaultWallThickness(unit),
    };
    const geo = getLayoutGeometry(get(), activeLevelId);
    get().recordHistory();
    set(patchActiveLevel(get(), { walls: [...geo.walls, wall] }));
    return id;
  },

  updateWall: (id, patch, options) => {
    if (options?.recordHistory !== false) {
      get().recordHistory();
    }
    const geo = getLayoutGeometry(get(), get().activeLevelId);
    set(
      patchActiveLevel(get(), {
        walls: geo.walls.map((w) => (w.id === id ? { ...w, ...patch } : w)),
      }),
    );
  },

  updateWallLength: (id, length, anchor = 'start') => {
    const geo = getLayoutGeometry(get(), get().activeLevelId);
    const wall = geo.walls.find((w) => w.id === id);
    if (!wall) return;
    get().recordHistory();
    const updated = setWallLength(wall, Math.max(0.01, length), anchor);
    get().updateWall(id, updated, { recordHistory: false });
  },

  deleteWall: (id) => {
    get().recordHistory();
    const sel = get().selection;
    const geo = getLayoutGeometry(get(), get().activeLevelId);
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
      const opening = geo.openings.find((o) => o.id === sel.id);
      if (opening?.wallId === id) nextSelection = null;
    }

    set({
      ...patchActiveLevel(get(), {
        walls: geo.walls.filter((w) => w.id !== id),
        openings: geo.openings.filter((o) => o.wallId !== id),
      }),
      selection: nextSelection,
    });
  },

  setWallsSilent: (walls) => set(patchActiveLevel(get(), { walls })),

  setWallsGeometry: (updates, options) => {
    if (options?.recordHistory !== false) {
      get().recordHistory();
    }
    const geo = getLayoutGeometry(get(), get().activeLevelId);
    const map = new Map(updates.map((u) => [u.id, u]));
    set(
      patchActiveLevel(get(), {
        walls: geo.walls.map((w) => {
          const u = map.get(w.id);
          return u ? { ...w, start: u.start, end: u.end } : w;
        }),
      }),
    );
  },

  addRectangleWalls: (start, end) => {
    const { unit, activeLevelId } = get();
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
    const geo = getLayoutGeometry(get(), activeLevelId);
    set({
      ...patchActiveLevel(get(), { walls: [...geo.walls, ...newWalls] }),
      selection: { type: 'walls', ids: newWalls.map((w) => w.id) },
    });
  },

  addOpening: (wallId, type, positionAlongWall, width, placement = 'start') => {
    const geo = getLayoutGeometry(get(), get().activeLevelId);
    const wall = geo.walls.find((w) => w.id === wallId);
    if (!wall) return '';

    const { unit } = get();
    const w = width ?? defaultOpeningWidth(type, unit);
    const len = wallLength(wall);
    const rawOffset =
      placement === 'end' ? positionAlongWall - w : positionAlongWall;
    const clamped = clampOpeningOnWall({ offset: rawOffset, width: w }, len);

    get().recordHistory();

    const opening: Opening = {
      id: uuidv4(),
      wallId,
      type,
      offset: clamped.offset,
      width: clamped.width,
      height: defaultOpeningHeight(type, unit),
      sillHeight: type === 'window' ? defaultWindowSill(unit) : undefined,
      ...(type === 'door'
        ? { doorStyle: 'swing' as const, doorSwing: 'left' as const }
        : {}),
    };

    set({
      ...patchActiveLevel(get(), { openings: [...geo.openings, opening] }),
      selection: { type: 'opening', id: opening.id },
    });
    return opening.id;
  },

  updateOpening: (id, patch, options) => {
    if (options?.recordHistory !== false) {
      get().recordHistory();
    }
    const geo = getLayoutGeometry(get(), get().activeLevelId);
    set(
      patchActiveLevel(get(), {
        openings: geo.openings.map((o) => {
          if (o.id !== id) return o;
          const merged = { ...o, ...patch };
          const wall = geo.walls.find((w) => w.id === merged.wallId);
          if (wall) {
            const clamped = clampOpeningOnWall(merged, wallLength(wall));
            merged.offset = clamped.offset;
            merged.width = clamped.width;
          }
          return merged;
        }),
      }),
    );
  },

  deleteOpening: (id) => {
    get().recordHistory();
    const sel = get().selection;
    const geo = getLayoutGeometry(get(), get().activeLevelId);
    set({
      ...patchActiveLevel(get(), {
        openings: geo.openings.filter((o) => o.id !== id),
      }),
      selection: sel?.type === 'opening' && sel.id === id ? null : sel,
    });
  },

  addFurniture: (kind, position, dimensions, rotation = 0) => {
    const unit = get().unit;
    const bedSize = kind === 'bed' ? DEFAULT_BED_SIZE : undefined;
    const defaults =
      kind === 'bed'
        ? bedDimensionsForSize(DEFAULT_BED_SIZE, unit)
        : defaultFurnitureDimensions(kind, unit);
    const item: Furniture = {
      id: uuidv4(),
      category: 'furniture',
      kind,
      position,
      width: dimensions?.width ?? defaults.width,
      depth: dimensions?.depth ?? defaults.depth,
      height: dimensions?.height ?? defaults.height,
      rotation,
      bedSize,
      mount: defaultMountForFurnitureKind(kind),
    };
    get().recordHistory();
    set({
      furniture: [...get().furniture, item],
      selection: { type: 'furniture', id: item.id },
    });
    return item.id;
  },

  updateFurniture: (id, patch, options) => {
    if (options?.recordHistory !== false) {
      get().recordHistory();
    }
    set({
      furniture: get().furniture.map((f) =>
        f.id === id ? { ...f, ...patch } : f,
      ),
    });
  },

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

  updateLandscape: (id, patch, options) => {
    if (options?.recordHistory !== false) {
      get().recordHistory();
    }
    set({
      landscape: get().landscape.map((l) =>
        l.id === id ? { ...l, ...patch } : l,
      ),
    });
  },

  deleteLandscape: (id) => {
    get().recordHistory();
    const sel = get().selection;
    set({
      landscape: get().landscape.filter((l) => l.id !== id),
      selection: sel?.type === 'landscape' && sel.id === id ? null : sel,
    });
  },

  addLight: (position, kind) => {
    const { wallHeight, activeLevelId, activeLightKind } = get();
    const lightKind = kind ?? activeLightKind;
    const item: LightFixture = {
      id: uuidv4(),
      position,
      kind: lightKind,
      intensity: defaultLightIntensity(),
      height: defaultLightHeight(lightKind, wallHeight),
    };
    const geo = getLayoutGeometry(get(), activeLevelId);
    get().recordHistory();
    set({
      ...patchActiveLevel(get(), { lights: [...geo.lights, item] }),
      selection: { type: 'light', id: item.id },
    });
    return item.id;
  },

  updateLight: (id, patch, options) => {
    if (options?.recordHistory !== false) {
      get().recordHistory();
    }
    const geo = getLayoutGeometry(get(), get().activeLevelId);
    set(
      patchActiveLevel(get(), {
        lights: geo.lights.map((l) => (l.id === id ? { ...l, ...patch } : l)),
      }),
    );
  },

  deleteLight: (id) => {
    get().recordHistory();
    const sel = get().selection;
    const geo = getLayoutGeometry(get(), get().activeLevelId);
    set({
      ...patchActiveLevel(get(), {
        lights: geo.lights.filter((l) => l.id !== id),
      }),
      selection: sel?.type === 'light' && sel.id === id ? null : sel,
    });
  },

  placeActiveLight: (position) => get().addLight(position),

  placeActiveItem: (clickWorld) => {
    const { activePlaceable, addFurniture, addLandscape, unit, levels } = get();
    const walls = floorLevels(levels)[0]?.walls ?? [];
    const rotation = 0;
    const snapRadius = placeableWallSnapRadius(unit);

    const snapCenter = (
      defaults: { width: number; depth: number; height: number },
    ): Point => {
      const center = centerFromCornerAnchor(
        clickWorld,
        defaults.width,
        defaults.depth,
        rotation,
      );
      const rect: PlacedRect = {
        position: center,
        width: defaults.width,
        depth: defaults.depth,
        rotation,
      };
      return snapPlaceablePosition(walls, rect, center, snapRadius);
    };

    if (activePlaceable.category === 'furniture') {
      const kind = activePlaceable.kind;
      const defaults =
        kind === 'bed'
          ? bedDimensionsForSize(DEFAULT_BED_SIZE, unit)
          : defaultFurnitureDimensions(kind, unit);
      return addFurniture(kind, snapCenter(defaults), undefined, rotation);
    }

    const defaults = LANDSCAPE_DEFAULTS[activePlaceable.kind];
    return addLandscape(activePlaceable.kind, snapCenter(defaults), undefined, rotation);
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
    const layout = get().activeLevelId;
    const geo = getLayoutGeometry(get(), layout);
    set(patchActiveLevel(get(), { walls: [...geo.walls, wall] }));

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
    const geo = getLayoutGeometry(get(), get().activeLevelId);
    set(
      patchActiveLevel(get(), {
        walls: geo.walls.map((w) => {
          const straight = orthogonalize(w.start, w.end);
          return { ...w, ...straight };
        }),
      }),
    );
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

      // OpenCV runs only in a Web Worker so the editor stays responsive.
      const result = await traceWithWorker(backgroundImage, traceParams, gen);

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
    const levels = normalizePlanLevels(plan);
    const activeLevelId = resolveActiveLevelId(
      levels,
      get().activeLevelId ?? levels[0]?.id,
    );
    set({
      ...initialPlan,
      ...plan,
      levels,
      activeLevelId,
      furniture: plan.furniture ?? [],
      landscape: plan.landscape ?? [],
      traceParams: plan.traceParams ?? DEFAULT_TRACE_PARAMS,
      northAngleDeg: plan.northAngleDeg ?? DEFAULT_NORTH_ANGLE_DEG,
      sunTime: plan.sunTime ?? DEFAULT_SUN_TIME,
      lotSize: plan.lotSize ?? null,
      gridSize: plan.gridSize ?? defaultGridSizeForUnit(plan.unit ?? 'ft'),
      backgroundOffset: plan.backgroundOffset ?? { ...DEFAULT_BACKGROUND_OFFSET },
      backgroundVisible: plan.backgroundVisible ?? true,
    });
  },

  exportPlan: (): FloorPlan => {
    const {
      levels,
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
      gridSize,
    } = get();
    return {
      levels,
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
      gridSize,
    };
  },

  resetPlan: () => {
    cancelActiveTrace();
    const levels = defaultPlanLevels();
    set({
      ...initialPlan,
      levels,
      activeLevelId: levels[0]!.id,
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
