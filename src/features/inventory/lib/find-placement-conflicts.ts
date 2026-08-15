import type { Product } from '../model/product';
import type { StoragePlacement } from '../model/storage-placement';

export interface PlacementConflict {
  productId: string;
  productName: string;
}

function rangesOverlap(
  leftStart: number,
  leftEnd: number,
  rightStart: number,
  rightEnd: number,
): boolean {
  return leftStart <= rightEnd && rightStart <= leftEnd;
}

export function findPlacementConflicts(
  products: Product[],
  currentProductId: string,
  placement: StoragePlacement,
): PlacementConflict[] {
  if (placement.levelNumber === null || placement.slotStart === null || placement.slotEnd === null) {
    return [];
  }
  const candidateSlotStart = placement.slotStart;
  const candidateSlotEnd = placement.slotEnd;

  return products.flatMap((product) => {
    if (product.id === currentProductId) return [];
    const hasConflict = product.placements.some((existingPlacement) =>
      existingPlacement.facilityId === placement.facilityId &&
      existingPlacement.levelNumber === placement.levelNumber &&
      existingPlacement.isBehind === placement.isBehind &&
      existingPlacement.slotStart !== null &&
      existingPlacement.slotEnd !== null &&
      rangesOverlap(
        candidateSlotStart,
        candidateSlotEnd,
        existingPlacement.slotStart,
        existingPlacement.slotEnd,
      ),
    );
    return hasConflict ? [{ productId: product.id, productName: product.productName }] : [];
  });
}
