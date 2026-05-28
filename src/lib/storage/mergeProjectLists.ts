import type { SavedProjectMeta } from './projectStorage';

/** Merge cloud and browser project lists; newest `updatedAt` wins per id. */
export function mergeProjectMetaLists(
  cloud: SavedProjectMeta[],
  local: SavedProjectMeta[],
): SavedProjectMeta[] {
  const byId = new Map<string, SavedProjectMeta>();
  for (const project of cloud) {
    byId.set(project.id, project);
  }
  for (const project of local) {
    const existing = byId.get(project.id);
    if (!existing || project.updatedAt > existing.updatedAt) {
      byId.set(project.id, project);
    }
  }
  return [...byId.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}
