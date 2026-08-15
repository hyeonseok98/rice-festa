'use client';

import { useMemo, useState } from 'react';

import { getProductReceiptStatus } from '@/features/inventory/lib/get-product-receipt-status';
import { createProductSearchIndex } from '@/features/inventory/lib/search-products';
import type { Product } from '@/features/inventory/model/product';
import {
  PRODUCT_CATEGORY_DEFINITIONS,
  type ProductCategory,
} from '@/features/inventory/model/product-category';

import type { ProductDivisionFilter, ProductQueueFilter } from '../_components/storage-workbench-types';

const RESULTS_PER_PAGE = 24;

export function useStorageSearch(products: Product[]) {
  const [query, setQuery] = useState('');
  const [division, setDivision] = useState<ProductDivisionFilter>('all');
  const [category, setCategory] = useState<ProductCategory | null>(null);
  const [queue, setQueue] = useState<ProductQueueFilter>('all');
  const [page, setPage] = useState(1);

  const filteredProducts = useMemo(
    () => products.filter((product) =>
      (division === 'all' || product.division === division) &&
      (category === null || product.categories.includes(category)) &&
      (queue === 'all' || getProductReceiptStatus(product) === queue),
    ),
    [category, division, products, queue],
  );
  const index = useMemo(() => createProductSearchIndex(filteredProducts), [filteredProducts]);
  const results = useMemo(() => index.searchProducts(query), [index, query]);
  const pageCount = Math.max(1, Math.ceil(results.length / RESULTS_PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const visibleResults = results.slice(
    (currentPage - 1) * RESULTS_PER_PAGE,
    currentPage * RESULTS_PER_PAGE,
  );
  const isActive = Boolean(query.trim() || division !== 'all' || category || queue !== 'all');

  const clear = () => {
    setQuery('');
    setDivision('all');
    setCategory(null);
    setQueue('all');
    setPage(1);
  };

  const updateQuery = (value: string) => { setQuery(value); setPage(1); };
  const updateDivision = (value: ProductDivisionFilter) => {
    setDivision(value);
    if (category && value !== 'all') {
      const categoryDivision = PRODUCT_CATEGORY_DEFINITIONS.find((item) => item.id === category)?.division;
      if (categoryDivision !== value) setCategory(null);
    }
    setPage(1);
  };
  const updateCategory = (value: ProductCategory | null) => { setCategory(value); setPage(1); };
  const updateQueue = (value: ProductQueueFilter) => { setQueue(value); setPage(1); };

  return {
    query,
    division,
    category,
    queue,
    currentPage,
    pageCount,
    results,
    visibleResults,
    isActive,
    setQuery: updateQuery,
    setDivision: updateDivision,
    setCategory: updateCategory,
    setQueue: updateQueue,
    setPage,
    clear,
  };
}
