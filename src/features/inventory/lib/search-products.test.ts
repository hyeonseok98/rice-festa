import { describe, expect, it } from 'vitest';

import type { Product } from '../model/product';
import { createProductSearchIndex } from './search-products';

function createProduct(
  id: string,
  productName: string,
  companyName: string,
  location: string | null = null,
): Product {
  return {
    id,
    division: 'traditional-liquor',
    categories: ['liquor-yakcheong'],
    companyName,
    productName,
    foodType: '약주',
    ethanolPercent: 16,
    quantity: 4,
    location,
    placements: [],
    locationIssues: [],
    receivedAt: null,
    note: null,
  };
}

describe('createProductSearchIndex', () => {
  const products = [
    createProduct('exact', '불소주', '강산소곡주'),
    createProduct('contains', '강산주조 불소주', '강산소곡주'),
    createProduct('company-only', '소곡', '불소주 양조장'),
    createProduct('similar', '안동소주일품 21도', '안동소주일품'),
    createProduct('location-only', '청명주', '청명양조장', '불소주-1'),
  ];

  it('제품명에 검색어가 실제 포함된 항목만 반환한다', () => {
    const results = createProductSearchIndex(products).searchProducts('불소주');

    expect(results.map(({ product }) => product.id)).toEqual(['exact', 'contains']);
    expect(results.map(({ matchReason }) => matchReason)).toEqual([
      '제품명 정확 일치',
      '제품명 포함 일치',
    ]);
  });

  it('띄어쓰기를 제외한 제품명 포함 검색은 유지한다', () => {
    const spacedProduct = createProduct('spaced', '귀품 한산 소곡주', '참두원');
    const results = createProductSearchIndex([spacedProduct]).searchProducts('한산소곡주');

    expect(results.map(({ product }) => product.id)).toEqual(['spaced']);
    expect(results[0]?.matchTier).toBe('contains');
  });

  it('업체명·보관위치·유사한 제품명은 검색 결과에 포함하지 않는다', () => {
    const results = createProductSearchIndex(products).searchProducts('불소주');

    expect(results.map(({ product }) => product.id)).not.toContain('company-only');
    expect(results.map(({ product }) => product.id)).not.toContain('location-only');
    expect(results.map(({ product }) => product.id)).not.toContain('similar');
  });
});
