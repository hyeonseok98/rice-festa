import type { Product, ProductQuantity } from './product';

export interface ProductRepository {
  getProducts(): Promise<Product[]>;
  updateQuantity(productId: string, quantity: ProductQuantity): Promise<void>;
  updateLocation(productId: string, location: string | null): Promise<void>;
  updateReceivedAt(productId: string, receivedAt: string | null): Promise<void>;
  updateNote(productId: string, note: string | null): Promise<void>;
}
