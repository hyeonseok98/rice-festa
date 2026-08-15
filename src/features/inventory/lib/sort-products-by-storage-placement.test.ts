import { describe, expect, it } from 'vitest';

import type { Product } from '../model/product';

import { sortProductsByStoragePlacement } from './sort-products-by-storage-placement';

function createProduct(id: string, location: Pick<Product['placements'][number], 'facilityLabel' | 'levelNumber' | 'slotStart' | 'slotEnd'> | null): Product {
  return {
    id,
    division: 'traditional-liquor',
    categories: ['liquor-low'],
    companyName: '테스트 양조장',
    productName: id,
    foodType: '탁주',
    ethanolPercent: 6,
    quantity: 1,
    location: null,
    placements: location ? [{
      id: `${id}-placement`,
      facilityId: location.facilityLabel,
      facilityLabel: location.facilityLabel,
      levelNumber: location.levelNumber,
      slotStart: location.slotStart,
      slotEnd: location.slotEnd,
      isBehind: false,
      purpose: null,
    }] : [],
    locationIssues: [],
    receivedAt: null,
    note: null,
  };
}

describe('sortProductsByStoragePlacement', () => {
  it('설비, 칸, 자리 순으로 제품을 정렬하고 미배치 제품은 마지막에 둔다', () => {
    const products = [
      createProduct('칸2-자리1', { facilityLabel: '저도주-1', levelNumber: 2, slotStart: 1, slotEnd: 1 }),
      createProduct('자리3', { facilityLabel: '저도주-1', levelNumber: 1, slotStart: 3, slotEnd: 3 }),
      createProduct('미배치', null),
      createProduct('다음설비', { facilityLabel: '저도주-2', levelNumber: 1, slotStart: 1, slotEnd: 1 }),
      createProduct('자리1', { facilityLabel: '저도주-1', levelNumber: 1, slotStart: 1, slotEnd: 1 }),
      createProduct('자리2', { facilityLabel: '저도주-1', levelNumber: 1, slotStart: 2, slotEnd: 2 }),
    ];

    expect(sortProductsByStoragePlacement(products).map((product) => product.id)).toEqual([
      '자리1',
      '자리2',
      '자리3',
      '칸2-자리1',
      '다음설비',
      '미배치',
    ]);
  });
});
