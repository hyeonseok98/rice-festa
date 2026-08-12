import type { Product } from './product';

export interface ProductRepository {
  getProducts(): Promise<Product[]>;
  updateQuantity(productId: string, quantity: number): Promise<void>;
  updateLocation(productId: string, location: string | null): Promise<void>;
}
