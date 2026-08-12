interface UpdateProductQuantityInput {
  quantity: number;
}

export function validateProductQuantity({ quantity }: UpdateProductQuantityInput): number {
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new Error('수량은 0 이상의 정수여야 합니다.');
  }

  return quantity;
}
