import type { Product } from '../model/product';
import type { StorageUnit } from '../model/storage';

export interface StorageSummary {
  productCount: number;
  numericQuantity: number;
  hasTextQuantity: boolean;
}

export function getProductsAtLocation(products: Product[], location: string): Product[] {
  return products.filter(
    (product) =>
      product.location === location ||
      product.placements.some((placement) => placement.facilityLabel === location),
  );
}

export function getStorageSummary(products: Product[], storageUnit: StorageUnit): StorageSummary {
  if (!storageUnit.label) return { productCount: 0, numericQuantity: 0, hasTextQuantity: false };
  const storedProducts = getProductsAtLocation(products, storageUnit.label);
  return storedProducts.reduce<StorageSummary>(
    (summary, product) => ({
      productCount: summary.productCount + 1,
      numericQuantity:
        summary.numericQuantity + (typeof product.quantity === 'number' ? product.quantity : 0),
      hasTextQuantity: summary.hasTextQuantity || typeof product.quantity === 'string',
    }),
    { productCount: 0, numericQuantity: 0, hasTextQuantity: false },
  );
}
