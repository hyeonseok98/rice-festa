import type { Product } from '@/features/inventory/model/product';
import type { StorageFacility } from '@/features/inventory/model/storage';

export type FacilityProductPlacementStatus = 'complete' | 'pending';

export interface FacilityProductPlacement {
  product: Product;
  placement: Product['placements'][number];
}

export function getFacilityProductPlacements(
  products: Product[],
  facilityId: string,
): FacilityProductPlacement[] {
  return products.flatMap((product) =>
    product.placements
      .filter((placement) => placement.facilityId === facilityId)
      .map((placement) => ({ product, placement })),
  );
}

export function hasClearFacilityPosition(
  placement: Product['placements'][number],
  facility: StorageFacility,
): boolean {
  if (placement.facilityId !== facility.id || placement.levelNumber === null) return false;
  if (placement.slotStart === null || placement.slotEnd === null) return false;
  const level = facility.levels.find((item) => item.order === placement.levelNumber);
  return Boolean(
    level &&
    placement.slotStart >= 1 &&
    placement.slotEnd >= placement.slotStart &&
    placement.slotEnd <= level.slotCount,
  );
}

export function getFacilityProductPlacementStatus(
  product: Product,
  facility: StorageFacility,
): FacilityProductPlacementStatus | null {
  const placements = product.placements.filter((placement) => placement.facilityId === facility.id);
  if (placements.length === 0) return null;
  return placements.every((placement) => hasClearFacilityPosition(placement, facility))
    ? 'complete'
    : 'pending';
}

export function getHighlightedFacilityIds(products: Product[]): Set<string> {
  return new Set(
    products.flatMap((product) => product.placements.map((placement) => placement.facilityId)),
  );
}
