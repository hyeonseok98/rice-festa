import type { ProductDivision } from './product';

export type ProductCategory =
  | 'liquor-low'
  | 'liquor-high'
  | 'liquor-yakcheong'
  | 'liquor-distilled'
  | 'rice-cooked'
  | 'rice-uncooked'
  | 'rice-nonghyup';

export interface ProductCategoryDefinition {
  id: ProductCategory;
  division: ProductDivision;
  label: string;
}

export const PRODUCT_CATEGORY_DEFINITIONS: ProductCategoryDefinition[] = [
  { id: 'liquor-low', division: 'traditional-liquor', label: '저도주' },
  { id: 'liquor-high', division: 'traditional-liquor', label: '고도주' },
  { id: 'liquor-yakcheong', division: 'traditional-liquor', label: '약청주' },
  { id: 'liquor-distilled', division: 'traditional-liquor', label: '증류주' },
  { id: 'rice-cooked', division: 'rice-product', label: '조리' },
  { id: 'rice-uncooked', division: 'rice-product', label: '비조리' },
  { id: 'rice-nonghyup', division: 'rice-product', label: '농협' },
];

export function getProductCategoryLabel(category: ProductCategory): string {
  return PRODUCT_CATEGORY_DEFINITIONS.find((definition) => definition.id === category)?.label ?? category;
}
