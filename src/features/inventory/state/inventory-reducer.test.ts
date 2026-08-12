import { describe, expect, it } from 'vitest';

import type { Product } from '../model/product';
import { initialInventoryState, inventoryReducer } from './inventory-reducer';

const product: Product = {
  id: 'product-1',
  companyName: '한강양조',
  productName: '서울 생막걸리',
  foodType: '탁주',
  ethanolPercent: 6,
  quantity: 10,
  location: '저도주-1',
  receivedAt: '2026-08-01',
};

describe('inventoryReducer', () => {
  it('직전 파일과 비교한 신규 출품작 정보를 보관한다', () => {
    const loadedState = inventoryReducer(initialInventoryState, {
      type: 'workbookLoaded',
      fileName: 'current.xlsx',
      products: [product],
      comparison: {
        id: 2,
        previousFileName: 'previous.xlsx',
        newProductIds: [product.id],
      },
    });

    expect(loadedState.previousFileName).toBe('previous.xlsx');
    expect(loadedState.newProductIds).toEqual([product.id]);
    expect(loadedState.comparisonId).toBe(2);
  });

  it('변경 전후 값을 추적하고 원래 값으로 돌아오면 dirty를 해제한다', () => {
    const loadedState = inventoryReducer(initialInventoryState, {
      type: 'workbookLoaded',
      fileName: 'products.xlsx',
      products: [product],
    });
    const changedState = inventoryReducer(loadedState, {
      type: 'productQuantityChanged',
      productId: product.id,
      before: 10,
      after: 7,
    });
    const revertedState = inventoryReducer(changedState, {
      type: 'productQuantityChanged',
      productId: product.id,
      before: 7,
      after: 10,
    });

    expect(changedState.isDirty).toBe(true);
    expect(changedState.changes[product.id].quantity).toEqual({ before: 10, after: 7 });
    expect(revertedState.isDirty).toBe(false);
    expect(revertedState.changes).toEqual({});
  });
});
