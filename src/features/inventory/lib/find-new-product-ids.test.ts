import { describe, expect, it } from 'vitest';

import type { Product } from '../model/product';
import { findNewProductIds } from './find-new-product-ids';

function createProduct(overrides: Partial<Product>): Product {
  return {
    id: 'product-1',
    division: 'traditional-liquor',
    companyName: '한강양조',
    productName: '서울 생막걸리',
    foodType: '탁주',
    ethanolPercent: 6,
    quantity: 10,
    location: '저도주-1',
    placements: [],
    locationIssues: [],
    receivedAt: '2026-08-01',
    note: null,
    ...overrides,
  };
}

describe('findNewProductIds', () => {
  it('수량과 위치가 달라져도 같은 출품작으로 판정한다', () => {
    const previousProducts = [createProduct({ id: 'previous' })];
    const currentProducts = [
      createProduct({ id: 'current', quantity: 3, location: '저도주-2' }),
    ];

    expect(findNewProductIds(previousProducts, currentProducts)).toEqual([]);
  });

  it('새로 추가된 출품작의 현재 파일 ID를 반환한다', () => {
    const previousProducts = [createProduct({ id: 'previous' })];
    const currentProducts = [
      createProduct({ id: 'current-existing' }),
      createProduct({ id: 'current-new', productName: '새 막걸리' }),
    ];

    expect(findNewProductIds(previousProducts, currentProducts)).toEqual(['current-new']);
  });

  it('같은 출품작이 늘어나면 늘어난 개수만큼만 신규로 판정한다', () => {
    const previousProducts = [createProduct({ id: 'previous' })];
    const currentProducts = [
      createProduct({ id: 'current-existing' }),
      createProduct({ id: 'current-duplicate' }),
    ];

    expect(findNewProductIds(previousProducts, currentProducts)).toEqual(['current-duplicate']);
  });
});
