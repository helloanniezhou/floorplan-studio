import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type {
  ActivePlaceable,
  FloorPlan,
  Furniture,
  FurnitureKind,
  LandscapeElement,
  LandscapeKind,
  LineSuggestion,
  Opening,
  PlaceableDimensions,
  Point,
  ScaleInfo,
  Selection,
  Tool,
  TraceParams,
  Wall,
} from '../types/floorPlan';
import {
  FURNITURE_DEFAULTS,
  LANDSCAPE_DEFAULTS,
} from '../lib/placeables/defaults';
import {
  DEFAULT_DOOR_HEIGHT_M,
  DEFAULT_DOOR_WIDTH_M,
  DEFAULT_TRACE_PARAMS,
  DEFAULT_WALL_HEIGHT_M,
  DEFAULT_WALL_THICKNESS_M,
  DEFAULT_WINDOW_HEIGHT_M,
  DEFAULT_WINDOW_SILL_M,
  DEFAULT_WINDOW_WIDTH_M,
} from '../types/floorPlan';
import { convertWallsToWorld } from '../lib/geometry/units';
import { clampOpeningOnWall } from '../lib/geometry/units';
import { setWallLength, wallLength } from '../lib/geometry/vectors';

type ScaleDraft = {
  pointA: Point | null;
  pointB: Point | null;
};

type FloorPlanState = FloorPlan & {
  tool: Tool;
  selection: Selection;
  activePlaceable: ActivePlaceable;
  gridEnabled: boolean;
  scaleDraft: ScaleDraft;
  wallDraftStart: Point | null;
  pendingLength: string;
  traceLoading: boolean;

  setTool: (tool: Tool) => void;
  setActivePlaceable: (placeable: ActivePlaceable) => void;
  startPlace: (placeable: ActivePlaceable) => void;
  setSelection: (selection: Selection) => void;
  setGridEnabled: (enabled: boolean) => void;
  setPendingLength: (value: string) => void;
  setTraceLoading: (loading: boolean) => void;
  setTraceParams: (params: Partial<TraceParams>) => void;

  setBackgroundImage: (dataUrl: string, width: number, height: number) => void;
  clearBackground: () => void;

  setScaleDraftPoint: (point: Point) => void;
  resetScaleDraft: () => void;
  applyScale: (realLength: number) => void;

  addWall: (start: Point, end: Point, thickness?: number) => string;
  updateWall: (id: string, patch: Partial<Wall>) => void;
  updateWallLength: (id: string, length: number, anchor?: 'start' | 'end') => void;
  deleteWall: (id: string) => void;

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

  importPlan: (plan: FloorPlan) => void;
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
  wallHeight: DEFAULT_WALL_HEIGHT_M,
  scale: null,
  suggestions: [],
  traceParams: DEFAULT_TRACE_PARAMS,
};

export const useFloorPlanStore = create<FloorPlanState>()(
  persist(
    (set, get) => ({
      ...initialPlan,
      tool: 'wall',
      selection: null,
      activePlaceable: DEFAULT_ACTIVE_PLACEABLE,
      gridEnabled: true,
      scaleDraft: { pointA: null, pointB: null },
      wallDraftStart: null,
      pendingLength: '',
      traceLoading: false,

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
      setGridEnabled: (gridEnabled) => set({ gridEnabled }),
      setPendingLength: (pendingLength) => set({ pendingLength }),
      setTraceLoading: (traceLoading) => set({ traceLoading }),
      setTraceParams: (params) =>
        set({ traceParams: { ...get().traceParams, ...params } }),

      setBackgroundImage: (dataUrl, width, height) =>
        set({
          backgroundImage: dataUrl,
          imageSize: { width, height },
          scale: null,
          walls: [],
          openings: [],
          furniture: [],
          landscape: [],
          suggestions: [],
        }),

      clearBackground: () =>
        set({
          backgroundImage: undefined,
          imageSize: undefined,
          scale: null,
          suggestions: [],
        }),

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
        const { scaleDraft, walls, scale: existingScale } = get();
        if (!scaleDraft.pointA || !scaleDraft.pointB || realLength <= 0) return;

        const pixelDist = Math.hypot(
          scaleDraft.pointB.x - scaleDraft.pointA.x,
          scaleDraft.pointB.y - scaleDraft.pointA.y,
        );
        if (pixelDist < 1) return;

        const pixelsPerUnit = pixelDist / realLength;
        const newScale: ScaleInfo = { pixelsPerUnit };

        let updatedWalls = walls;
        if (!existingScale) {
          updatedWalls = convertWallsToWorld(walls, pixelsPerUnit).map((w) => ({
            ...w,
            thickness: DEFAULT_WALL_THICKNESS_M,
          }));
        }

        set({
          scale: newScale,
          walls: updatedWalls,
          scaleDraft: { pointA: null, pointB: null },
          tool: 'wall',
        });
      },

      addWall: (start, end, thickness = DEFAULT_WALL_THICKNESS_M) => {
        const id = uuidv4();
        const wall: Wall = { id, start, end, thickness };
        set({ walls: [...get().walls, wall] });
        return id;
      },

      updateWall: (id, patch) =>
        set({
          walls: get().walls.map((w) => (w.id === id ? { ...w, ...patch } : w)),
        }),

      updateWallLength: (id, length, anchor = 'start') => {
        const wall = get().walls.find((w) => w.id === id);
        if (!wall) return;
        const updated = setWallLength(wall, Math.max(0.01, length), anchor);
        get().updateWall(id, updated);
      },

      deleteWall: (id) => {
        const sel = get().selection;
        set({
          walls: get().walls.filter((w) => w.id !== id),
          openings: get().openings.filter((o) => o.wallId !== id),
          selection: sel?.type === 'wall' && sel.id === id ? null : sel,
        });
      },

      addOpening: (wallId, type, offset, width) => {
        const wall = get().walls.find((w) => w.id === wallId);
        if (!wall) return '';

        const defaultWidth =
          type === 'door' ? DEFAULT_DOOR_WIDTH_M : DEFAULT_WINDOW_WIDTH_M;
        const w = width ?? defaultWidth;
        const len = wallLength(wall);
        const clamped = clampOpeningOnWall({ offset, width: w }, len);

        const opening: Opening = {
          id: uuidv4(),
          wallId,
          type,
          offset: clamped.offset,
          width: clamped.width,
          height: type === 'door' ? DEFAULT_DOOR_HEIGHT_M : DEFAULT_WINDOW_HEIGHT_M,
          sillHeight: type === 'window' ? DEFAULT_WINDOW_SILL_M : undefined,
        };

        set({ openings: [...get().openings, opening], selection: { type: 'opening', id: opening.id } });
        return opening.id;
      },

      updateOpening: (id, patch) =>
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
        }),

      deleteOpening: (id) => {
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
        const { suggestions, scale, addWall } = get();
        const s = suggestions.find((x) => x.id === id);
        if (!s) return;

        const thickness = scale ? DEFAULT_WALL_THICKNESS_M : 4;
        if (scale) {
          addWall(
            { x: s.start.x / scale.pixelsPerUnit, y: s.start.y / scale.pixelsPerUnit },
            { x: s.end.x / scale.pixelsPerUnit, y: s.end.y / scale.pixelsPerUnit },
            DEFAULT_WALL_THICKNESS_M,
          );
        } else {
          addWall(s.start, s.end, thickness);
        }

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

        set({
          walls: get().walls.map((w) => {
            const straight = orthogonalize(w.start, w.end);
            return { ...w, ...straight };
          }),
        });
      },

      importPlan: (plan) =>
        set({
          ...plan,
          furniture: plan.furniture ?? [],
          landscape: plan.landscape ?? [],
          traceParams: plan.traceParams ?? DEFAULT_TRACE_PARAMS,
        }),

      exportPlan: () => {
        const {
          walls,
          openings,
          furniture,
          landscape,
          unit,
          wallHeight,
          backgroundImage,
          imageSize,
          scale,
          suggestions,
          traceParams,
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
          scale,
          suggestions,
          traceParams,
        };
      },

      resetPlan: () =>
        set({
          ...initialPlan,
          furniture: [],
          landscape: [],
          tool: 'wall',
          selection: null,
          activePlaceable: DEFAULT_ACTIVE_PLACEABLE,
          scaleDraft: { pointA: null, pointB: null },
          wallDraftStart: null,
          pendingLength: '',
        }),
    }),
    {
      name: 'floorplan-studio',
      version: 1,
      merge: (persisted, current) => {
        const saved = persisted as Partial<FloorPlan>;
        return {
          ...current,
          ...saved,
          furniture: saved.furniture ?? [],
          landscape: saved.landscape ?? [],
        };
      },
      partialize: (state) => ({
        walls: state.walls,
        openings: state.openings,
        furniture: state.furniture,
        landscape: state.landscape,
        unit: state.unit,
        wallHeight: state.wallHeight,
        backgroundImage: state.backgroundImage,
        imageSize: state.imageSize,
        scale: state.scale,
        traceParams: state.traceParams,
      }),
    },
  ),
);
