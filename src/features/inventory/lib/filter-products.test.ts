import { describe, expect, it } from 'vitest';

import type { Product } from '../model/product';
import { filterProducts } from './filter-products';

const products: Product[] = [
  {
    id: '1',
    division: 'traditional-liquor',
    categories: ['liquor-low'],
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
  },
  {
    id: '2',
    division: 'rice-product',
    categories: ['rice-uncooked'],
    companyName: '다온제과',
    productName: '쌀 약과',
    foodType: '쌀가공식품',
    ethanolPercent: null,
    quantity: 8,
    location: '렉-2',
    placements: [],
    locationIssues: [],
    receivedAt: '2026-08-02',
    note: '상온 보관',
  },
];

describe('filterProducts', () => {
  it('제품명 또는 업체명에 검색어가 포함된 항목을 검색한다', () => {
    expect(filterProducts(products, '생막걸리')).toEqual([products[0]]);
    expect(filterProducts(products, '약과')).toEqual([products[1]]);
    expect(filterProducts(products, '한강')).toEqual([products[0]]);
  });

  it('식품유형·위치·비고·초성·오타는 검색하지 않는다', () => {
    expect(filterProducts(products, '쌀가공')).toEqual([]);
    expect(filterProducts(products, '렉-2')).toEqual([]);
    expect(filterProducts(products, '상온')).toEqual([]);
    expect(filterProducts(products, 'ㅎㄱ')).toEqual([]);
    expect(filterProducts(products, '생마걸리')).toEqual([]);
  });
});
