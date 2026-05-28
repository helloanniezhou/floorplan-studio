import type { FloorPlan } from '../../types/floorPlan';
import {
  listFullProjects,
  migrateLegacyLocalStorage,
  type SavedProject,
} from './projectStorage';

/** Pull every plan stored in this browser (IndexedDB + legacy localStorage). */
export async function collectLocalBrowserProjects(
  current?: {
    id: string | null;
    name: string;
    exportPlan: () => FloorPlan;
    wallCount: number;
  },
): Promise<SavedProject[]> {
  await migrateLegacyLocalStorage();

  const byId = new Map<string, SavedProject>();
  for (const project of await listFullProjects()) {
    byId.set(project.id, project);
  }

  if (current?.id && current.wallCount > 0) {
    const plan = current.exportPlan();
    const existing = byId.get(current.id);
    const updatedAt = Math.max(existing?.updatedAt ?? 0, Date.now());
    byId.set(current.id, {
      id: current.id,
      name: current.name.trim() || 'Untitled plan',
      updatedAt,
      plan,
    });
  }

  return [...byId.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function hasMeaningfulPlan(plan: FloorPlan): boolean {
  return (
    plan.walls.length > 0 ||
    plan.openings.length > 0 ||
    plan.furniture.length > 0 ||
    plan.landscape.length > 0 ||
    Boolean(plan.backgroundImage)
  );
}
