export interface Product {
  id: string;
  companyName: string;
  productName: string;
  foodType: string;
  ethanolPercent: number | null;
  quantity: number;
  location: string | null;
  receivedAt: string;
}

export interface ProductChange {
  productId: string;
  quantity?: {
    before: number;
    after: number;
  };
  location?: {
    before: string | null;
    after: string | null;
  };
}
