import type { Product, ProductQuantity } from './product';
import type { StorageConfiguration } from './storage';
import type { StoragePlacement } from './storage-placement';

export interface ProductRepository {
  getProducts(): Promise<Product[]>;
  updateQuantity(productId: string, quantity: ProductQuantity): Promise<void>;
  updateLocation(productId: string, location: string | null): Promise<void>;
  updatePlacements(productId: string, placements: StoragePlacement[]): Promise<void>;
  updateReceivedAt(productId: string, receivedAt: string | null): Promise<void>;
  updateNote(productId: string, note: string | null): Promise<void>;
}

export interface StorageConfigurationRepository {
  getStorageConfiguration(): StorageConfiguration;
  updateStorageConfiguration(storageConfiguration: StorageConfiguration): void;
}
