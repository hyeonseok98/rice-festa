import type { Product, ProductReceiptStatus } from '../model/product';

export function getProductReceiptStatus(product: Product): ProductReceiptStatus {
  const hasQuantity = product.quantity !== null;
  const hasReceivedAt = product.receivedAt !== null;
  const hasLocation = product.location !== null;

  if (!hasQuantity && !hasReceivedAt && !hasLocation) return 'not-received';
  if (hasQuantity && hasReceivedAt && !hasLocation) return 'unassigned';
  if (hasQuantity && hasReceivedAt && hasLocation) return 'assigned';
  return 'review';
}
