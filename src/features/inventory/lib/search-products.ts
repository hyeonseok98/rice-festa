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

function getTextMatchTier(
  value: string,
  normalizedQuery: string,
  compactQuery: string,
): ProductSearchMatchTier | null {
  const normalizedValue = normalizeSearchText(value);
  const compactValue = compactSearchText(value);

  if (normalizedValue === normalizedQuery || compactValue === compactQuery) {
    return 'exact';
  }
  if (
    normalizedValue.startsWith(normalizedQuery) ||
    compactValue.startsWith(compactQuery)
  ) {
    return 'prefix';
  }
  if (
    normalizedValue.includes(normalizedQuery) ||
    compactValue.includes(compactQuery)
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
          const matches = [
            {
              fieldLabel: '제품명',
              fieldPriority: 0,
              matchTier: getTextMatchTier(
                product.productName,
                normalizedQuery,
                compactQuery,
              ),
            },
            {
              fieldLabel: '업체명',
              fieldPriority: 0.1,
              matchTier: getTextMatchTier(
                product.companyName,
                normalizedQuery,
                compactQuery,
              ),
            },
          ].flatMap((match) => match.matchTier ? [match] : []);
          const bestMatch = matches.sort(
            (left, right) =>
              MATCH_TIER_SCORE[left.matchTier!] + left.fieldPriority -
              (MATCH_TIER_SCORE[right.matchTier!] + right.fieldPriority),
          )[0];
          return bestMatch?.matchTier
            ? [{
                product,
                matchTier: bestMatch.matchTier,
                matchReason: `${bestMatch.fieldLabel} ${
                  bestMatch.matchTier === 'exact'
                    ? '정확 일치'
                    : bestMatch.matchTier === 'prefix'
                      ? '앞부분 일치'
                      : '포함 일치'
                }`,
                score: MATCH_TIER_SCORE[bestMatch.matchTier] + bestMatch.fieldPriority,
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
