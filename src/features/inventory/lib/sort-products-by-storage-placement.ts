import type { Product } from '../model/product';
import type { StoragePlacement } from '../model/storage-placement';
import { compareStorageLocations } from '../model/storage';

function compareOptionalNumber(left: number | null, right: number | null): number {
  return (left ?? Number.POSITIVE_INFINITY) - (right ?? Number.POSITIVE_INFINITY);
}

function comparePlacements(left: StoragePlacement, right: StoragePlacement): number {
  const facilityDifference = compareStorageLocations(left.facilityLabel, right.facilityLabel);
  if (facilityDifference !== 0) return facilityDifference;

  const levelDifference = compareOptionalNumber(left.levelNumber, right.levelNumber);
  if (levelDifference !== 0) return levelDifference;

  const slotDifference = compareOptionalNumber(left.slotStart, right.slotStart);
  if (slotDifference !== 0) return slotDifference;

  const slotEndDifference = compareOptionalNumber(left.slotEnd, right.slotEnd);
  if (slotEndDifference !== 0) return slotEndDifference;

  return Number(left.isBehind) - Number(right.isBehind);
}

function getFirstPlacement(product: Product): StoragePlacement | null {
  return product.placements.length ? [...product.placements].sort(comparePlacements)[0] : null;
}

export function sortProductsByStoragePlacement(products: Product[]): Product[] {
  return [...products].sort((left, right) => {
    const leftPlacement = getFirstPlacement(left);
    const rightPlacement = getFirstPlacement(right);
    if (!leftPlacement && !rightPlacement) return left.productName.localeCompare(right.productName, 'ko-KR');
    if (!leftPlacement) return 1;
    if (!rightPlacement) return -1;

    const placementDifference = comparePlacements(leftPlacement, rightPlacement);
    if (placementDifference !== 0) return placementDifference;
    return left.productName.localeCompare(right.productName, 'ko-KR');
  });
}
