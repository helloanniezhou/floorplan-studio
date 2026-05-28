import type {
  Furniture,
  LandscapeElement,
  Opening,
  Point,
  Selection,
  Wall,
} from '../../types/floorPlan';

export type PlanClipboard =
  | { type: 'walls'; walls: Wall[]; openings: Opening[] }
  | { type: 'opening'; opening: Opening }
  | { type: 'furniture'; item: Furniture }
  | { type: 'landscape'; item: LandscapeElement };

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

  switch (selection.type) {
    case 'walls': {
      if (selection.ids.length === 0) return null;
      const idSet = new Set(selection.ids);
      const walls = state.walls
        .filter((w) => idSet.has(w.id))
        .map((w) => structuredClone(w));
      if (walls.length === 0) return null;
      const openings = state.openings
        .filter((o) => idSet.has(o.wallId))
        .map((o) => structuredClone(o));
      return { type: 'walls', walls, openings };
    }
    case 'opening': {
      const opening = state.openings.find((o) => o.id === selection.id);
      if (!opening) return null;
      return { type: 'opening', opening: structuredClone(opening) };
    }
    case 'furniture': {
      const item = state.furniture.find((f) => f.id === selection.id);
      if (!item) return null;
      return { type: 'furniture', item: structuredClone(item) };
    }
    case 'landscape': {
      const item = state.landscape.find((l) => l.id === selection.id);
      if (!item) return null;
      return { type: 'landscape', item: structuredClone(item) };
    }
    default:
      return null;
  }
}
