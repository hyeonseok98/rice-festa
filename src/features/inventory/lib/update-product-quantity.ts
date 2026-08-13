import type { ProductQuantity } from '../model/product';

export function parseProductQuantityInput(value: string): ProductQuantity {
  const normalizedValue = value.trim();
  if (!normalizedValue) return null;

  if (/^\d+$/.test(normalizedValue)) {
    return Number(normalizedValue);
  }

  return normalizedValue;
}

export function validateProductQuantity(quantity: ProductQuantity): ProductQuantity {
  if (quantity === null) return null;
  if (typeof quantity === 'number') {
    if (!Number.isInteger(quantity) || quantity < 0) {
      throw new Error('숫자 수량은 0 이상의 정수여야 합니다.');
    }
    return quantity;
  }

  const normalizedQuantity = quantity.trim();
  if (!normalizedQuantity) return null;
  if (normalizedQuantity.length > 50) {
    throw new Error('수량은 50자 이내로 입력해주세요.');
  }
  return normalizedQuantity;
}
