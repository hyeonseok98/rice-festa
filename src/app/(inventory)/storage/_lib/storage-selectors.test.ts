import { describe, expect, it } from 'vitest';

import type { Product } from '@/features/inventory/model/product';
import type { StorageFacility } from '@/features/inventory/model/storage';

import { getFacilityProductPlacementStatus } from './storage-selectors';

const facility: StorageFacility = {
  id: 'FRIDGE_01',
  type: 'fridge',
  label: '냉장-1',
  x: 0,
  y: 0,
  width: 120,
  height: 108,
  levels: [{ id: 'level-1', order: 1, kind: 'shelf', slotCount: 7 }],
  needsLevelReview: false,
};

function createProduct(levelNumber: number | null, slotStart: number | null, slotEnd: number | null): Product {
  return {
    id: 'product-1',
    division: 'traditional-liquor',
    categories: ['liquor-low'],
    companyName: '테스트 양조장',
    productName: '테스트 제품',
    foodType: '탁주',
    ethanolPercent: 6,
    quantity: 4,
    location: '냉장-1',
    placements: [{
      id: 'placement-1',
      facilityId: facility.id,
      facilityLabel: facility.label!,
      levelNumber,
      slotStart,
      slotEnd,
      isBehind: false,
      purpose: null,
    }],
    locationIssues: [],
    receivedAt: null,
    note: null,
  };
}

describe('getFacilityProductPlacementStatus', () => {
  it('유효한 칸과 자리가 모두 있으면 배치완료로 분류한다', () => {
    expect(getFacilityProductPlacementStatus(createProduct(1, 2, 3), facility)).toBe('complete');
  });

  it('냉장고만 지정되고 자리가 없으면 배치전으로 분류한다', () => {
    expect(getFacilityProductPlacementStatus(createProduct(null, null, null), facility)).toBe('pending');
  });

  it('현재 설비 범위를 벗어난 자리도 배치전으로 분류한다', () => {
    expect(getFacilityProductPlacementStatus(createProduct(1, 7, 8), facility)).toBe('pending');
  });
});
