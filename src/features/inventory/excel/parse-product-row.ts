import type { Product, ProductDivision, ProductQuantity } from '../model/product';
import type { ProductSheetErrorDetail } from './product-sheet-error';

export interface ProductExcelRow {
  companyName: unknown;
  productName: unknown;
  foodType: unknown;
  ethanolPercent: unknown;
  quantity: unknown;
  location: unknown;
  receivedAt: unknown;
  note: unknown;
}

interface ParseProductRowInput {
  id: string;
  division: ProductDivision;
  rowNumber: number;
  row: ProductExcelRow;
}

interface ParseProductRowResult {
  product: Product | null;
  errors: ProductSheetErrorDetail[];
}

function parseRequiredText(
  value: unknown,
  rowNumber: number,
  columnName: string,
  errors: ProductSheetErrorDetail[],
): string {
  if (typeof value !== 'string' || !value.trim()) {
    errors.push({ rowNumber, columnName, value, message: '필수 값이 비어 있습니다.' });
    return '';
  }
  return value.trim();
}

function parseEthanolPercent(
  value: unknown,
  rowNumber: number,
  errors: ProductSheetErrorDetail[],
): number | null {
  if (value === null || value === undefined || value === '' || value === '-') return null;

  const normalizedValue =
    typeof value === 'string' ? value.replace(/[%％,\s]/g, '').trim() : value;
  const numericValue = typeof normalizedValue === 'number' ? normalizedValue : Number(normalizedValue);
  if (!Number.isFinite(numericValue) || numericValue < 0) {
    errors.push({
      rowNumber,
      columnName: '에탄올 함량(%)',
      value,
      message: '에탄올 함량은 비워두거나 0 이상의 숫자로 입력해주세요.',
    });
    return null;
  }

  const percent = numericValue <= 1 ? numericValue * 100 : numericValue;
  if (percent > 100) {
    errors.push({
      rowNumber,
      columnName: '에탄올 함량(%)',
      value,
      message: '에탄올 함량은 100% 이하여야 합니다.',
    });
    return null;
  }
  return Number(percent.toFixed(4));
}

function parseQuantity(
  value: unknown,
  rowNumber: number,
  errors: ProductSheetErrorDetail[],
): ProductQuantity {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') {
    if (!Number.isInteger(value) || value < 0) {
      errors.push({
        rowNumber,
        columnName: '수량',
        value,
        message: '숫자 수량은 0 이상의 정수로 입력해주세요.',
      });
      return null;
    }
    return value;
  }

  const text = String(value).trim();
  return text || null;
}

function parseOptionalText(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  const text = String(value).trim();
  return text || null;
}

export function parseProductRow({
  id,
  division,
  rowNumber,
  row,
}: ParseProductRowInput): ParseProductRowResult {
  const errors: ProductSheetErrorDetail[] = [];
  const product: Product = {
    id,
    division,
    companyName: parseRequiredText(row.companyName, rowNumber, '업체명', errors),
    productName: parseRequiredText(row.productName, rowNumber, '제품명', errors),
    foodType: parseRequiredText(row.foodType, rowNumber, '식품유형', errors),
    ethanolPercent: parseEthanolPercent(row.ethanolPercent, rowNumber, errors),
    quantity: parseQuantity(row.quantity, rowNumber, errors),
    location: parseOptionalText(row.location),
    placements: [],
    locationIssues: [],
    receivedAt: parseOptionalText(row.receivedAt),
    note: parseOptionalText(row.note),
  };

  return { product: errors.length === 0 ? product : null, errors };
}
