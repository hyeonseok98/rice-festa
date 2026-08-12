import { isStorageLocation } from '../model/storage';
import type { Product } from '../model/product';
import type { ProductSheetErrorDetail } from './product-sheet-error';

export interface ProductExcelRow {
  업체명: unknown;
  제품명: unknown;
  식품유형: unknown;
  '에탄올 함량(%)': unknown;
  수량: unknown;
  위치: unknown;
  수령일: unknown;
}

interface ParseProductRowInput {
  id: string;
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
    errors.push({
      rowNumber,
      columnName,
      value,
      message: '필수 값이 비어 있습니다.',
    });
    return '';
  }

  return value.trim();
}

function parseEthanolPercent(
  value: unknown,
  rowNumber: number,
  errors: ProductSheetErrorDetail[],
): number | null {
  if (value === null || value === undefined || value === '' || value === '-') {
    return null;
  }

  const ethanolPercent = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(ethanolPercent) || ethanolPercent < 0 || ethanolPercent > 100) {
    errors.push({
      rowNumber,
      columnName: '에탄올 함량(%)',
      value,
      message: '에탄올 함량은 비워두거나 0부터 100 사이의 숫자로 입력해주세요.',
    });
    return null;
  }

  return ethanolPercent;
}

function parseQuantity(
  value: unknown,
  rowNumber: number,
  errors: ProductSheetErrorDetail[],
): number {
  const quantity = typeof value === 'number' ? value : Number(value);

  if (!Number.isInteger(quantity) || quantity < 0) {
    errors.push({
      rowNumber,
      columnName: '수량',
      value,
      message: '수량은 0 이상의 정수로 입력해주세요.',
    });
    return 0;
  }

  return quantity;
}

function parseLocation(
  value: unknown,
  rowNumber: number,
  errors: ProductSheetErrorDetail[],
): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value !== 'string' || !isStorageLocation(value.trim())) {
    errors.push({
      rowNumber,
      columnName: '위치',
      value,
      message: `"${String(value)}"은 등록되지 않은 보관 위치입니다.`,
    });
    return null;
  }

  return value.trim();
}

function parseReceivedAt(
  value: unknown,
  rowNumber: number,
  errors: ProductSheetErrorDetail[],
): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    // Excel 날짜는 시각이 아니라 사용자가 입력한 달력 날짜이므로 UTC 변환을 하지 않습니다.
    const year = String(value.getFullYear());
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().replaceAll('.', '-').replaceAll('/', '-');
    const match = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (match) {
      const [, year, month, day] = match;
      const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
      if (
        date.getUTCFullYear() === Number(year) &&
        date.getUTCMonth() === Number(month) - 1 &&
        date.getUTCDate() === Number(day)
      ) {
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
  }

  errors.push({
    rowNumber,
    columnName: '수령일',
    value,
    message: '수령일은 날짜 형식으로 입력해주세요.',
  });
  return '';
}

export function parseProductRow({ id, rowNumber, row }: ParseProductRowInput): ParseProductRowResult {
  const errors: ProductSheetErrorDetail[] = [];
  const product: Product = {
    id,
    companyName: parseRequiredText(row.업체명, rowNumber, '업체명', errors),
    productName: parseRequiredText(row.제품명, rowNumber, '제품명', errors),
    foodType: parseRequiredText(row.식품유형, rowNumber, '식품유형', errors),
    ethanolPercent: parseEthanolPercent(row['에탄올 함량(%)'], rowNumber, errors),
    quantity: parseQuantity(row.수량, rowNumber, errors),
    location: parseLocation(row.위치, rowNumber, errors),
    receivedAt: parseReceivedAt(row.수령일, rowNumber, errors),
  };

  return {
    product: errors.length === 0 ? product : null,
    errors,
  };
}
