import { describe, expect, it } from 'vitest';

import type { Product } from '../model/product';
import { getProductReceiptStatus } from './get-product-receipt-status';

function createProduct(overrides: Partial<Product>): Product {
  return {
    id: '1',
    division: 'traditional-liquor',
    companyName: '한강양조',
    productName: '막걸리',
    foodType: '탁주',
    ethanolPercent: 6,
    quantity: null,
    location: null,
    receivedAt: null,
    note: null,
    ...overrides,
  };
}

describe('getProductReceiptStatus', () => {
  it('수량과 수령일이 있으면 수령 완료로 보고 위치 유무로 배치 상태를 나눈다', () => {
    expect(getProductReceiptStatus(createProduct({ quantity: 3, receivedAt: '2026-08-13' }))).toBe('unassigned');
    expect(getProductReceiptStatus(createProduct({ quantity: '5박스', receivedAt: '2026-08-13', location: '렉-5' }))).toBe('assigned');
  });

  it('수량과 수령일이 모두 없으면 미수령으로 본다', () => {
    expect(getProductReceiptStatus(createProduct({}))).toBe('not-received');
  });

  it('수량과 수령일 중 하나만 있으면 확인 필요로 본다', () => {
    expect(getProductReceiptStatus(createProduct({ receivedAt: '2026-08-13' }))).toBe('review');
  });
});
