import type { Product } from '../model/product';

export type ProductSearchMatchTier = 'exact' | 'prefix' | 'contains';

export interface ProductSearchResult {
  product: Product;
  matchTier: ProductSearchMatchTier;
  matchReason: string;
  score: number;
}

export interface ProductSearchIndex {
  searchProducts: (searchQuery: string, limit?: number) => ProductSearchResult[];
}

const MATCH_TIER_SCORE: Record<ProductSearchMatchTier, number> = {
  exact: 0,
  prefix: 1,
  contains: 2,
};

const MATCH_TIER_REASON: Record<ProductSearchMatchTier, string> = {
  exact: '제품명 정확 일치',
  prefix: '제품명 앞부분 일치',
  contains: '제품명 포함 일치',
};

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('ko-KR')
    .replaceAll(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replaceAll(/\s+/g, ' ');
}

function compactSearchText(value: string): string {
  return normalizeSearchText(value).replaceAll(' ', '');
}

function getProductNameMatchTier(
  productName: string,
  normalizedQuery: string,
  compactQuery: string,
): ProductSearchMatchTier | null {
  const normalizedProductName = normalizeSearchText(productName);
  const compactProductName = compactSearchText(productName);

  if (normalizedProductName === normalizedQuery || compactProductName === compactQuery) {
    return 'exact';
  }
  if (
    normalizedProductName.startsWith(normalizedQuery) ||
    compactProductName.startsWith(compactQuery)
  ) {
    return 'prefix';
  }
  if (
    normalizedProductName.includes(normalizedQuery) ||
    compactProductName.includes(compactQuery)
  ) {
    return 'contains';
  }
  return null;
}

export function createProductSearchIndex(products: Product[]): ProductSearchIndex {
  return {
    searchProducts(searchQuery: string, limit = products.length): ProductSearchResult[] {
      const normalizedQuery = normalizeSearchText(searchQuery);
      const compactQuery = compactSearchText(searchQuery);
      if (!normalizedQuery) {
        return products.slice(0, limit).map((product) => ({
          product,
          matchTier: 'exact',
          matchReason: '전체 출품작',
          score: 0,
        }));
      }

      return products
        .flatMap<ProductSearchResult>((product) => {
          const matchTier = getProductNameMatchTier(
            product.productName,
            normalizedQuery,
            compactQuery,
          );
          return matchTier
            ? [{
                product,
                matchTier,
                matchReason: MATCH_TIER_REASON[matchTier],
                score: MATCH_TIER_SCORE[matchTier],
              }]
            : [];
        })
        .sort(
          (left, right) =>
            left.score - right.score ||
            left.product.productName.localeCompare(right.product.productName, 'ko-KR'),
        )
        .slice(0, limit);
    },
  };
}
