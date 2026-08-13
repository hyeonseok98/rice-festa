export type ProductDivision = 'traditional-liquor' | 'rice-product';
export type ProductQuantity = number | string | null;
export type ProductReceiptStatus = 'not-received' | 'unassigned' | 'assigned' | 'review';

export interface Product {
  id: string;
  division: ProductDivision;
  companyName: string;
  productName: string;
  foodType: string;
  ethanolPercent: number | null;
  quantity: ProductQuantity;
  location: string | null;
  receivedAt: string | null;
  note: string | null;
}

export interface ProductChange {
  productId: string;
  quantity?: {
    before: ProductQuantity;
    after: ProductQuantity;
  };
  location?: {
    before: string | null;
    after: string | null;
  };
  receivedAt?: {
    before: string | null;
    after: string | null;
  };
  note?: {
    before: string | null;
    after: string | null;
  };
}
