import type { Product } from '../model/product';

function createProductIdentityKey(product: Product): string {
  return JSON.stringify([
    product.division,
    product.companyName,
    product.productName,
    product.foodType,
    product.ethanolPercent,
  ]);
}

export function findNewProductIds(previousProducts: Product[], currentProducts: Product[]): string[] {
  const previousProductCounts = new Map<string, number>();

  for (const product of previousProducts) {
    const identityKey = createProductIdentityKey(product);
    previousProductCounts.set(identityKey, (previousProductCounts.get(identityKey) ?? 0) + 1);
  }

  const newProductIds: string[] = [];

  for (const product of currentProducts) {
    const identityKey = createProductIdentityKey(product);
    const remainingPreviousCount = previousProductCounts.get(identityKey) ?? 0;

    if (remainingPreviousCount === 0) {
      newProductIds.push(product.id);
      continue;
    }

    previousProductCounts.set(identityKey, remainingPreviousCount - 1);
  }

  return newProductIds;
}
