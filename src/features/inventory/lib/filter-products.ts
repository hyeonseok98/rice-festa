import type { Product } from '../model/product';
import { createProductSearchIndex } from './search-products';

export function filterProducts(products: Product[], searchQuery: string): Product[] {
  if (!searchQuery.trim()) return products;
  return createProductSearchIndex(products).searchProducts(searchQuery).map(({ product }) => product);
}
