import { describe, expect, it } from 'vitest';

import type { Product } from '@/features/inventory/model/product';
import type { StorageFacility } from '@/features/inventory/model/storage';

import {
  buildDroppedPlacementMutation,
  parseFacilityPlacementDragItem,
  serializeFacilityPlacementDragItem,
} from './facility-placement-dnd';

const facility: StorageFacility = {
  id: 'FRIDGE_YAK_05',
  type: 'fridge',
  label: '약청주-5',
  x: 0,
  y: 0,
  width: 120,
  height: 108,
  levels: [{ id: 'level-1', order: 1, kind: 'shelf', slotCount: 7 }],
  needsLevelReview: false,
};

function createProduct(): Product {
  return {
    id: 'product-1',
    division: 'traditional-liquor',
    categories: ['liquor-yakcheong'],
    companyName: '테스트 양조장',
    productName: '테스트 약주',
    foodType: '약주',
    ethanolPercent: 16,
    quantity: 4,
    location: '약청주-5-1-2~4-샘플',
    placements: [{
      id: 'placement-1',
      facilityId: facility.id,
      facilityLabel: facility.label!,
      levelNumber: 1,
      slotStart: 2,
      slotEnd: 4,
      isBehind: false,
      purpose: 'sample',
    }],
    locationIssues: [],
    receivedAt: null,
    note: null,
  };
}

describe('facility placement drag and drop', () => {
  it('드래그 정보를 직렬화하고 유효한 값만 복원한다', () => {
    const item = { productId: 'product-1', placementId: 'placement-1' };

    expect(parseFacilityPlacementDragItem(serializeFacilityPlacementDragItem(item))).toEqual(item);
    expect(parseFacilityPlacementDragItem('{"productId":1}')).toBeNull();
    expect(parseFacilityPlacementDragItem('not-json')).toBeNull();
  });

  it('새 제품을 드롭한 한 자리에 배치한다', () => {
    const product = { ...createProduct(), placements: [] };

    expect(buildDroppedPlacementMutation(
      facility,
      product,
      { productId: product.id, placementId: null },
      { levelNumber: 1, slotNumber: 5, isBehind: false },
    )).toMatchObject({
      placementId: null,
      levelNumber: 1,
      slotStart: 5,
      slotEnd: 5,
      isBehind: false,
      purpose: null,
    });
  });

  it('기존 배치의 자리 폭과 용도를 유지하며 이동한다', () => {
    const mutation = buildDroppedPlacementMutation(
      facility,
      createProduct(),
      { productId: 'product-1', placementId: 'placement-1' },
      { levelNumber: 1, slotNumber: 3, isBehind: true },
    );

    expect(mutation).toMatchObject({
      placementId: 'placement-1',
      slotStart: 3,
      slotEnd: 5,
      isBehind: true,
      purpose: 'sample',
    });
  });

  it('오른쪽 끝에서도 기존 자리 폭이 설비 범위를 벗어나지 않게 한다', () => {
    const mutation = buildDroppedPlacementMutation(
      facility,
      createProduct(),
      { productId: 'product-1', placementId: 'placement-1' },
      { levelNumber: 1, slotNumber: 7, isBehind: false },
    );

    expect([mutation.slotStart, mutation.slotEnd]).toEqual([5, 7]);
  });
});
