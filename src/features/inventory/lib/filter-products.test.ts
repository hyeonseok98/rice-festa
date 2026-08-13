import { describe, expect, it } from 'vitest';

import type { Product } from '../model/product';
import { filterProducts } from './filter-products';

const products: Product[] = [
  {
    id: '1',
    division: 'traditional-liquor',
    companyName: '한강양조',
    productName: '서울 생막걸리',
    foodType: '탁주',
    ethanolPercent: 6,
    quantity: 10,
    location: '저도주-1',
    receivedAt: '2026-08-01',
    note: null,
  },
  {
    id: '2',
    division: 'rice-product',
    companyName: '다온제과',
    productName: '쌀 약과',
    foodType: '쌀가공식품',
    ethanolPercent: null,
    quantity: 8,
    location: '렉-2',
    receivedAt: '2026-08-02',
    note: '상온 보관',
  },
];

describe('filterProducts', () => {
  it('업체명, 제품명, 식품유형, 위치를 검색한다', () => {
    expect(filterProducts(products, '한강')).toEqual([products[0]]);
    expect(filterProducts(products, '약과')).toEqual([products[1]]);
    expect(filterProducts(products, '쌀가공')).toEqual([products[1]]);
    expect(filterProducts(products, '렉-2')).toEqual([products[1]]);
    expect(filterProducts(products, '상온')).toEqual([products[1]]);
  });
});
