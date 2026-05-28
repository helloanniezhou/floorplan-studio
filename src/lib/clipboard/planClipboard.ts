import type {
  Furniture,
  LandscapeElement,
  Opening,
  Point,
  Selection,
  Wall,
} from '../../types/floorPlan';
import {
  getSelectedFurnitureIds,
  getSelectedLandscapeIds,
  getSelectedOpeningIds,
  getSelectedWallIds,
} from '../geometry/selection';

export type PlanClipboard =
  | { type: 'walls'; walls: Wall[]; openings: Opening[] }
  | { type: 'openings'; openings: Opening[] }
  | { type: 'furniture'; items: Furniture[] }
  | { type: 'landscape'; items: LandscapeElement[] }
  | {
      type: 'mixed';
      walls: Wall[];
      openings: Opening[];
      furniture: Furniture[];
      landscape: LandscapeElement[];
    };

let sessionClipboard: PlanClipboard | null = null;

/** World-space nudge applied on each paste (same unit as the plan). */
export const DEFAULT_PASTE_OFFSET: Point = { x: 0.5, y: 0.5 };

export function getPlanClipboard(): PlanClipboard | null {
  return sessionClipboard;
}

export function setPlanClipboard(payload: PlanClipboard | null): void {
  sessionClipboard = payload;
}

export function buildClipboardFromSelection(state: {
  selection: Selection;
  walls: Wall[];
  openings: Opening[];
  furniture: Furniture[];
  landscape: LandscapeElement[];
}): PlanClipboard | null {
  const { selection } = state;
  if (!selection) return null;

  if (selection.type === 'mixed') {
    const wallIdSet = new Set(selection.wallIds);
    const openingIdSet = new Set(selection.openingIds);
    const furnitureIdSet = new Set(selection.furnitureIds);
    const landscapeIdSet = new Set(selection.landscapeIds);
    const walls = state.walls
      .filter((w) => wallIdSet.has(w.id))
      .map((w) => structuredClone(w));
    const openings = state.openings
      .filter((o) => openingIdSet.has(o.id))
      .map((o) => structuredClone(o));
    const furniture = state.furniture
      .filter((f) => furnitureIdSet.has(f.id))
      .map((f) => structuredClone(f));
    const landscape = state.landscape
      .filter((l) => landscapeIdSet.has(l.id))
      .map((l) => structuredClone(l));
    if (
      walls.length + openings.length + furniture.length + landscape.length ===
      0
    ) {
      return null;
    }
    return { type: 'mixed', walls, openings, furniture, landscape };
  }

  const wallIds = getSelectedWallIds(selection);
  if (wallIds.length > 0 && selection.type === 'walls') {
    const idSet = new Set(wallIds);
    const walls = state.walls
      .filter((w) => idSet.has(w.id))
      .map((w) => structuredClone(w));
    if (walls.length === 0) return null;
    const openings = state.openings
      .filter((o) => idSet.has(o.wallId))
      .map((o) => structuredClone(o));
    return { type: 'walls', walls, openings };
  }

  const openingIds = getSelectedOpeningIds(selection);
  if (openingIds.length > 0) {
    const idSet = new Set(openingIds);
    const openings = state.openings
      .filter((o) => idSet.has(o.id))
      .map((o) => structuredClone(o));
    if (openings.length === 0) return null;
    return { type: 'openings', openings };
  }

  const furnitureIds = getSelectedFurnitureIds(selection);
  if (furnitureIds.length > 0) {
    const idSet = new Set(furnitureIds);
    const items = state.furniture
      .filter((f) => idSet.has(f.id))
      .map((f) => structuredClone(f));
    if (items.length === 0) return null;
    return { type: 'furniture', items };
  }

  const landscapeIds = getSelectedLandscapeIds(selection);
  if (landscapeIds.length > 0) {
    const idSet = new Set(landscapeIds);
    const items = state.landscape
      .filter((l) => idSet.has(l.id))
      .map((l) => structuredClone(l));
    if (items.length === 0) return null;
    return { type: 'landscape', items };
  }

  return null;
}
