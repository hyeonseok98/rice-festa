import type { Product } from '@/features/inventory/model/product';

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

export function getHighlightedFacilityIds(products: Product[]): Set<string> {
  return new Set(
    products.flatMap((product) => product.placements.map((placement) => placement.facilityId)),
  );
}
