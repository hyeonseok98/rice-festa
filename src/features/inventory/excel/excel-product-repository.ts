import {
  SSF,
  read,
  utils,
  write,
  type CellObject,
  type WorkBook,
  type WorkSheet,
} from 'xlsx';

import type { Product } from '../model/product';
import type { ProductRepository } from '../model/product-repository';
import { parseProductRow, type ProductExcelRow } from './parse-product-row';
import {
  ProductSheetSelectionRequiredError,
  ProductSheetValidationError,
  type ProductSheetErrorDetail,
} from './product-sheet-error';

const PRODUCT_HEADERS = [
  '업체명',
  '제품명',
  '식품유형',
  '에탄올 함량(%)',
  '수량',
  '위치',
  '수령일',
] as const;

interface ExcelProductSource {
  productId: string;
  sheetName: string;
  rowNumber: number;
}

interface CreateExcelProductRepositoryOptions {
  selectedSheetName?: string;
}

function getCellValue(worksheet: WorkSheet, columnIndex: number, rowNumber: number): unknown {
  return worksheet[utils.encode_cell({ c: columnIndex, r: rowNumber - 1 })]?.v;
}

function hasProductHeaders(worksheet: WorkSheet): boolean {
  return PRODUCT_HEADERS.every(
    (header, columnIndex) => getCellValue(worksheet, columnIndex, 1) === header,
  );
}

function findProductSheetNames(workbook: WorkBook): string[] {
  return workbook.SheetNames.filter((sheetName) => hasProductHeaders(workbook.Sheets[sheetName]));
}

function normalizeExcelDate(value: unknown): unknown {
  if (typeof value !== 'number') {
    return value;
  }

  // Excel 날짜 일련번호는 브라우저 시간대와 무관하게 달력 날짜로 변환해야 합니다.
  const parsedDate = SSF.parse_date_code(value);
  if (!parsedDate) {
    return value;
  }

  return `${String(parsedDate.y).padStart(4, '0')}-${String(parsedDate.m).padStart(2, '0')}-${String(parsedDate.d).padStart(2, '0')}`;
}

function readProductExcelRow(worksheet: WorkSheet, rowNumber: number): ProductExcelRow {
  return {
    업체명: getCellValue(worksheet, 0, rowNumber),
    제품명: getCellValue(worksheet, 1, rowNumber),
    식품유형: getCellValue(worksheet, 2, rowNumber),
    '에탄올 함량(%)': getCellValue(worksheet, 3, rowNumber),
    수량: getCellValue(worksheet, 4, rowNumber),
    위치: getCellValue(worksheet, 5, rowNumber),
    수령일: normalizeExcelDate(getCellValue(worksheet, 6, rowNumber)),
  };
}

function isBlankProductRow(row: ProductExcelRow): boolean {
  return Object.values(row).every(
    (value) => value === null || value === undefined || (typeof value === 'string' && !value.trim()),
  );
}

function getLastRowNumber(worksheet: WorkSheet): number {
  if (!worksheet['!ref']) {
    return 1;
  }

  return utils.decode_range(worksheet['!ref']).e.r + 1;
}

function createProductId(sheetName: string, rowNumber: number): string {
  return `${encodeURIComponent(sheetName)}:${rowNumber}`;
}

export class ExcelProductRepository implements ProductRepository {
  private readonly sourceByProductId: Map<string, ExcelProductSource>;

  private constructor(
    private readonly workbook: WorkBook,
    private products: Product[],
    sources: ExcelProductSource[],
  ) {
    this.sourceByProductId = new Map(sources.map((source) => [source.productId, source]));
  }

  static inspectSheetNames(arrayBuffer: ArrayBuffer): string[] {
    const workbook = read(arrayBuffer, {
      type: 'array',
      cellDates: false,
      cellStyles: true,
    });

    return findProductSheetNames(workbook);
  }

  static fromArrayBuffer(
    arrayBuffer: ArrayBuffer,
    options: CreateExcelProductRepositoryOptions = {},
  ): ExcelProductRepository {
    const workbook = read(arrayBuffer, {
      type: 'array',
      cellDates: false,
      cellStyles: true,
    });
    const matchingSheetNames = findProductSheetNames(workbook);

    if (matchingSheetNames.length === 0) {
      throw new ProductSheetValidationError([
        {
          rowNumber: 1,
          columnName: null,
          value: null,
          message: `첫 행에 ${PRODUCT_HEADERS.join(', ')} 컬럼이 있는 시트를 찾을 수 없습니다.`,
        },
      ]);
    }

    if (!options.selectedSheetName && matchingSheetNames.length > 1) {
      throw new ProductSheetSelectionRequiredError(matchingSheetNames);
    }

    const sheetName = options.selectedSheetName ?? matchingSheetNames[0];
    if (!matchingSheetNames.includes(sheetName)) {
      throw new ProductSheetValidationError([
        {
          rowNumber: 1,
          columnName: null,
          value: sheetName,
          message: '선택한 시트가 출품작 양식과 일치하지 않습니다.',
        },
      ]);
    }

    const worksheet = workbook.Sheets[sheetName];
    const products: Product[] = [];
    const sources: ExcelProductSource[] = [];
    const errors: ProductSheetErrorDetail[] = [];

    for (let rowNumber = 2; rowNumber <= getLastRowNumber(worksheet); rowNumber += 1) {
      const row = readProductExcelRow(worksheet, rowNumber);
      if (isBlankProductRow(row)) {
        continue;
      }

      const productId = createProductId(sheetName, rowNumber);
      const result = parseProductRow({ id: productId, rowNumber, row });
      errors.push(...result.errors);

      if (result.product) {
        products.push(result.product);
        sources.push({ productId, sheetName, rowNumber });
      }
    }

    if (errors.length > 0) {
      throw new ProductSheetValidationError(errors);
    }

    return new ExcelProductRepository(workbook, products, sources);
  }

  async getProducts(): Promise<Product[]> {
    return this.products.map((product) => ({ ...product }));
  }

  async updateQuantity(productId: string, quantity: number): Promise<void> {
    const source = this.getSource(productId);
    this.updateCell(source, 4, { t: 'n', v: quantity });
    this.products = this.products.map((product) =>
      product.id === productId ? { ...product, quantity } : product,
    );
  }

  async updateLocation(productId: string, location: string | null): Promise<void> {
    const source = this.getSource(productId);
    this.updateCell(source, 5, { t: 's', v: location ?? '' });
    this.products = this.products.map((product) =>
      product.id === productId ? { ...product, location } : product,
    );
  }

  exportArrayBuffer(): ArrayBuffer {
    return write(this.workbook, {
      type: 'array',
      bookType: 'xlsx',
      cellDates: true,
      cellStyles: true,
    });
  }

  private getSource(productId: string): ExcelProductSource {
    const source = this.sourceByProductId.get(productId);
    if (!source) {
      throw new Error('Excel 원본 위치를 찾을 수 없는 출품작입니다.');
    }

    return source;
  }

  private updateCell(source: ExcelProductSource, columnIndex: number, value: CellObject): void {
    const worksheet = this.workbook.Sheets[source.sheetName];
    const address = utils.encode_cell({ c: columnIndex, r: source.rowNumber - 1 });

    // 원본 Workbook을 다시 만들지 않고 수정 허용된 셀의 값만 교체합니다.
    worksheet[address] = {
      ...worksheet[address],
      ...value,
    };
  }
}
