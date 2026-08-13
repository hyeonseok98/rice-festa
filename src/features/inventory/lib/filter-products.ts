import type { Product } from '../model/product';

export function filterProducts(products: Product[], searchQuery: string): Product[] {
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase('ko-KR');

  if (!normalizedQuery) {
    return products;
  }

  return products.filter((product) =>
    [
      product.companyName,
      product.productName,
      product.foodType,
      product.location ?? '',
      product.note ?? '',
    ].some(
      (value) => value.toLocaleLowerCase('ko-KR').includes(normalizedQuery),
    ),
  );
}
