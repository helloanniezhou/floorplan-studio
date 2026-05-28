import type { Furniture, FurnitureKind, FurnitureMount } from '../../types/floorPlan';

export type { FurnitureMount };

const DEFAULT_MOUNT_BY_KIND: Partial<Record<FurnitureKind, FurnitureMount>> = {
  kitchenCabinet: 'top',
};

export function furnitureMount(item: Pick<Furniture, 'kind' | 'mount'>): FurnitureMount {
  return item.mount ?? DEFAULT_MOUNT_BY_KIND[item.kind] ?? 'floor';
}

export function isTopMountedFurnitureKind(kind: FurnitureKind): boolean {
  return (DEFAULT_MOUNT_BY_KIND[kind] ?? 'floor') === 'top';
}

/** Vertical center for 3D mesh (floor at y = 0, wall top at wallHeight). */
export function furnitureMeshCenterY(
  item: Pick<Furniture, 'kind' | 'mount' | 'height'>,
  wallHeight: number,
): number {
  if (furnitureMount(item) === 'top') {
    return wallHeight - item.height / 2;
  }
  return item.height / 2;
}

export function furnitureBottomElevation(
  item: Pick<Furniture, 'kind' | 'mount' | 'height'>,
  wallHeight: number,
): number {
  if (furnitureMount(item) === 'top') {
    return wallHeight - item.height;
  }
  return 0;
}

export function furnitureTopElevation(
  item: Pick<Furniture, 'kind' | 'mount' | 'height'>,
  wallHeight: number,
): number {
  if (furnitureMount(item) === 'top') {
    return wallHeight;
  }
  return item.height;
}

export function defaultMountForFurnitureKind(kind: FurnitureKind): FurnitureMount {
  return DEFAULT_MOUNT_BY_KIND[kind] ?? 'floor';
}
