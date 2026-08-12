import type { Product } from '../model/product';
import type { StorageFilter } from '../model/storage';

export function filterProductsByStorage(
  products: Product[],
  storageFilter: StorageFilter,
): Product[] {
  if (storageFilter === 'all') {
    return products;
  }

  if (storageFilter === 'unassigned') {
    return products.filter((product) => product.location === null);
  }

  const [filterType, filterValue] = storageFilter.split(':');
  if (filterType === 'category') {
    return products.filter((product) => product.location?.startsWith(`${filterValue}-`));
  }

  return products.filter((product) => product.location === filterValue);
}
