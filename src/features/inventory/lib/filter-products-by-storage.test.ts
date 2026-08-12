import { describe, expect, it } from 'vitest';

import type { Product } from '../model/product';
import { filterProductsByStorage } from './filter-products-by-storage';

function createProduct(id: string, location: Product['location']): Product {
  return {
    id,
    companyName: '한강양조',
    productName: `출품작 ${id}`,
    foodType: '탁주',
    ethanolPercent: 6,
    quantity: 10,
    location,
    receivedAt: '2026-08-01',
  };
}

const products = [
  createProduct('1', '고도주-1'),
  createProduct('2', '고도주-2'),
  createProduct('3', '냉동-1'),
  createProduct('4', null),
];

describe('filterProductsByStorage', () => {
  it('보관 유형에 속한 모든 위치를 필터링한다', () => {
    expect(filterProductsByStorage(products, 'category:고도주')).toEqual([
      products[0],
      products[1],
    ]);
  });

  it('개별 보관 위치를 필터링한다', () => {
    expect(filterProductsByStorage(products, 'location:고도주-2')).toEqual([products[1]]);
  });

  it('위치가 지정되지 않은 출품작을 필터링한다', () => {
    expect(filterProductsByStorage(products, 'unassigned')).toEqual([products[3]]);
  });
});
