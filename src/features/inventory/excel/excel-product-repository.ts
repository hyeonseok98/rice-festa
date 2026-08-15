import { SSF, read, utils, type CellObject, type WorkBook, type WorkSheet } from 'xlsx';

import { extractStorageFacilityLabels, parseStorageLocation } from '../lib/parse-storage-location';
import { serializeStorageLocation } from '../lib/serialize-storage-location';
import {
  addObservedStorageFacilities,
  cloneStorageConfiguration,
  createDefaultStorageConfiguration,
} from '../model/storage-layout';
import type { Product, ProductDivision, ProductQuantity } from '../model/product';
import type { ProductCategory } from '../model/product-category';
import type { ProductRepository } from '../model/product-repository';
import type { StorageConfiguration } from '../model/storage';
import type { StoragePlacement } from '../model/storage-placement';
import { parseProductRow, type ProductExcelRow } from './parse-product-row';
import { ProductSheetValidationError, type ProductSheetErrorDetail } from './product-sheet-error';
import {
  createStorageConfigurationMetadataProperties,
  readStorageConfigurationMetadata,
} from './workbook-storage-metadata';
import {
  patchXlsxWorkbook,
  type XlsxCellPatch,
  type XlsxCellPatchValue,
} from './patch-xlsx-workbook';

interface ProductSheetSchema {
  sheetName: string;
  division: ProductDivision;
  headerRowNumber: number;
  firstDataRowNumber: number;
  categoryColumns: Array<{ category: ProductCategory; column: number }>;
  columns: {
    companyName: number;
    productName: number;
    foodType: number;
    ethanolPercent: number | null;
    quantity: number;
    location: number;
    receivedAt: number;
    note: number;
  };
}

interface ExcelProductSource {
  productId: string;
  sheetName: string;
  rowNumber: number;
  quantityColumn: number;
  locationColumn: number;
  receivedAtColumn: number;
  noteColumn: number;
}

const PRODUCT_SHEET_SCHEMAS: ProductSheetSchema[] = [
  {
    sheetName: '우리술',
    division: 'traditional-liquor',
    headerRowNumber: 3,
    firstDataRowNumber: 5,
    categoryColumns: [
      { category: 'liquor-low', column: 4 },
      { category: 'liquor-high', column: 5 },
      { category: 'liquor-yakcheong', column: 6 },
      { category: 'liquor-distilled', column: 7 },
    ],
    columns: {
      companyName: 3,
      productName: 9,
      foodType: 10,
      ethanolPercent: 11,
      quantity: 12,
      location: 13,
      receivedAt: 14,
      note: 15,
    },
  },
  {
    sheetName: '쌀가공식품',
    division: 'rice-product',
    headerRowNumber: 3,
    firstDataRowNumber: 5,
    categoryColumns: [
      { category: 'rice-cooked', column: 4 },
      { category: 'rice-uncooked', column: 5 },
      { category: 'rice-nonghyup', column: 6 },
    ],
    columns: {
      companyName: 3,
      productName: 8,
      foodType: 9,
      ethanolPercent: null,
      quantity: 10,
      location: 11,
      receivedAt: 12,
      note: 13,
    },
  },
];

const REQUIRED_HEADER_BY_FIELD = {
  companyName: '업체명',
  productName: '제품명(제품라벨기준)',
  foodType: '식품유형',
  ethanolPercent: '에탄올함량(%)',
  quantity: '수량',
  location: '보관위치',
  receivedAt: '수령일',
  note: '비고',
} as const;

function getCellValue(worksheet: WorkSheet, columnIndex: number, rowNumber: number): unknown {
  return worksheet[utils.encode_cell({ c: columnIndex, r: rowNumber - 1 })]?.v;
}

function normalizeHeader(value: unknown): string {
  return typeof value === 'string' ? value.replaceAll(/\s/g, '') : '';
}

function validateSheetHeaders(
  worksheet: WorkSheet,
  schema: ProductSheetSchema,
): ProductSheetErrorDetail[] {
  const errors: ProductSheetErrorDetail[] = [];
  const fields = Object.keys(schema.columns) as Array<keyof ProductSheetSchema['columns']>;

  for (const field of fields) {
    const columnIndex = schema.columns[field];
    if (columnIndex === null) continue;
    const expectedHeader = REQUIRED_HEADER_BY_FIELD[field];
    const actualValue = getCellValue(worksheet, columnIndex, schema.headerRowNumber);
    if (normalizeHeader(actualValue) !== expectedHeader) {
      errors.push({
        rowNumber: schema.headerRowNumber,
        columnName: utils.encode_col(columnIndex),
        value: actualValue,
        message: `"${expectedHeader}" 헤더를 찾을 수 없습니다.`,
      });
    }
  }
  return errors;
}

function normalizeExcelDate(value: unknown): unknown {
  if (typeof value !== 'number') return value;
  const parsedDate = SSF.parse_date_code(value);
  if (!parsedDate) return value;
  return `${String(parsedDate.y).padStart(4, '0')}-${String(parsedDate.m).padStart(2, '0')}-${String(parsedDate.d).padStart(2, '0')}`;
}

function readProductExcelRow(
  worksheet: WorkSheet,
  schema: ProductSheetSchema,
  rowNumber: number,
  companyName: string,
): ProductExcelRow {
  const { columns } = schema;
  return {
    companyName,
    productName: getCellValue(worksheet, columns.productName, rowNumber),
    foodType: getCellValue(worksheet, columns.foodType, rowNumber),
    ethanolPercent:
      columns.ethanolPercent === null
        ? null
        : getCellValue(worksheet, columns.ethanolPercent, rowNumber),
    quantity: getCellValue(worksheet, columns.quantity, rowNumber),
    location: getCellValue(worksheet, columns.location, rowNumber),
    receivedAt: normalizeExcelDate(getCellValue(worksheet, columns.receivedAt, rowNumber)),
    note: getCellValue(worksheet, columns.note, rowNumber),
    categoryValues: schema.categoryColumns.map(({ category, column }) => ({
      category,
      value: getCellValue(worksheet, column, rowNumber),
    })),
  };
}

function getLastRowNumber(worksheet: WorkSheet): number {
  return worksheet['!ref'] ? utils.decode_range(worksheet['!ref']).e.r + 1 : 1;
}

function createProductId(sheetName: string, rowNumber: number): string {
  return `${encodeURIComponent(sheetName)}:${rowNumber}`;
}

function createExcelDateSerial(value: string): number {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error('수령일은 YYYY-MM-DD 형식이어야 합니다.');
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) {
    throw new Error('올바른 수령일을 입력해주세요.');
  }
  return (date.getTime() - Date.UTC(1899, 11, 30)) / 86_400_000;
}

export class ExcelProductRepository implements ProductRepository {
  private readonly sourceByProductId: Map<string, ExcelProductSource>;
  private readonly pendingCellPatches = new Map<string, XlsxCellPatch>();

  private constructor(
    private readonly originalWorkbookBytes: ArrayBuffer,
    private readonly workbook: WorkBook,
    private products: Product[],
    sources: ExcelProductSource[],
    private storageConfiguration: StorageConfiguration,
    private readonly workbookWarnings: string[],
  ) {
    this.sourceByProductId = new Map(sources.map((source) => [source.productId, source]));
  }

  static fromArrayBuffer(arrayBuffer: ArrayBuffer): ExcelProductRepository {
    const workbook = read(arrayBuffer, { type: 'array', cellDates: false, cellStyles: true });
    const availableSchemas = PRODUCT_SHEET_SCHEMAS.filter(
      (schema) => workbook.Sheets[schema.sheetName],
    );

    if (availableSchemas.length === 0) {
      throw new ProductSheetValidationError([
        {
          rowNumber: null,
          columnName: null,
          value: workbook.SheetNames,
          message: '우리술 또는 쌀가공식품 시트를 찾을 수 없습니다.',
        },
      ]);
    }

    const productsWithoutParsedLocations: Product[] = [];
    const sources: ExcelProductSource[] = [];
    const errors: ProductSheetErrorDetail[] = [];

    for (const schema of availableSchemas) {
      const worksheet = workbook.Sheets[schema.sheetName];
      const headerErrors = validateSheetHeaders(worksheet, schema);
      errors.push(...headerErrors);
      if (headerErrors.length > 0) continue;

      let currentCompanyName = '';
      for (
        let rowNumber = schema.firstDataRowNumber;
        rowNumber <= getLastRowNumber(worksheet);
        rowNumber += 1
      ) {
        const companyValue = getCellValue(worksheet, schema.columns.companyName, rowNumber);
        if (typeof companyValue === 'string' && companyValue.trim()) {
          currentCompanyName = companyValue.trim();
        }

        const productName = getCellValue(worksheet, schema.columns.productName, rowNumber);
        if (
          (typeof productName !== 'string' && typeof productName !== 'number') ||
          !String(productName).trim()
        ) continue;

        const productId = createProductId(schema.sheetName, rowNumber);
        const result = parseProductRow({
          id: productId,
          division: schema.division,
          rowNumber,
          row: readProductExcelRow(worksheet, schema, rowNumber, currentCompanyName),
        });
        errors.push(...result.errors);
        if (!result.product) continue;

        productsWithoutParsedLocations.push(result.product);
        sources.push({
          productId,
          sheetName: schema.sheetName,
          rowNumber,
          quantityColumn: schema.columns.quantity,
          locationColumn: schema.columns.location,
          receivedAtColumn: schema.columns.receivedAt,
          noteColumn: schema.columns.note,
        });
      }
    }

    if (errors.length > 0) throw new ProductSheetValidationError(errors);

    const metadataResult = readStorageConfigurationMetadata(workbook);
    const initialStorageConfiguration =
      metadataResult.storageConfiguration ?? createDefaultStorageConfiguration();
    const observedStorageLabels = productsWithoutParsedLocations.flatMap((product) =>
      extractStorageFacilityLabels(product.location),
    );
    const storageConfiguration = addObservedStorageFacilities(
      initialStorageConfiguration,
      observedStorageLabels,
    );
    const products = productsWithoutParsedLocations.map((product) =>
      parseProductStorageLocation(product, storageConfiguration),
    );
    const workbookWarnings = metadataResult.warningMessage ? [metadataResult.warningMessage] : [];

    return new ExcelProductRepository(
      arrayBuffer.slice(0),
      workbook,
      products,
      sources,
      storageConfiguration,
      workbookWarnings,
    );
  }

  async getProducts(): Promise<Product[]> {
    return this.products.map(cloneProduct);
  }

  getStorageConfiguration(): StorageConfiguration {
    return cloneStorageConfiguration(this.storageConfiguration);
  }

  getWorkbookWarnings(): string[] {
    return [...this.workbookWarnings];
  }

  async updateQuantity(productId: string, quantity: ProductQuantity): Promise<void> {
    const source = this.getSource(productId);
    const cell =
      typeof quantity === 'number'
        ? ({ t: 'n', v: quantity } as CellObject)
        : ({ t: 's', v: quantity ?? '' } as CellObject);
    this.updateCell(source, source.quantityColumn, cell);
    this.updateProduct(productId, { quantity });
  }

  async updateLocation(productId: string, location: string | null): Promise<void> {
    const source = this.getSource(productId);
    const normalizedLocation = location?.trim() || null;
    this.updateCell(source, source.locationColumn, { t: 's', v: normalizedLocation ?? '' });
    const parsedLocation = parseStorageLocation(
      normalizedLocation,
      this.storageConfiguration.facilities,
      productId,
    );
    this.updateProduct(productId, {
      location: normalizedLocation,
      placements: parsedLocation.placements,
      locationIssues: parsedLocation.issues,
    });
  }

  async updatePlacements(productId: string, placements: StoragePlacement[]): Promise<void> {
    await this.updateLocation(productId, serializeStorageLocation(placements));
  }

  async updateReceivedAt(productId: string, receivedAt: string | null): Promise<void> {
    const source = this.getSource(productId);
    const cell = receivedAt
      ? ({ t: 'n', v: createExcelDateSerial(receivedAt) } as CellObject)
      : ({ t: 's', v: '' } as CellObject);
    this.updateCell(source, source.receivedAtColumn, cell);
    this.updateProduct(productId, { receivedAt });
  }

  async updateNote(productId: string, note: string | null): Promise<void> {
    const source = this.getSource(productId);
    this.updateCell(source, source.noteColumn, { t: 's', v: note ?? '' });
    this.updateProduct(productId, { note });
  }

  updateStorageConfiguration(
    storageConfiguration: StorageConfiguration,
    reparseProductLocations = true,
  ): void {
    this.storageConfiguration = cloneStorageConfiguration(storageConfiguration);
    if (reparseProductLocations) {
      this.products = this.products.map((product) =>
        parseProductStorageLocation(product, this.storageConfiguration),
      );
    }
  }

  exportArrayBuffer(): ArrayBuffer {
    return patchXlsxWorkbook(
      this.originalWorkbookBytes,
      [...this.pendingCellPatches.values()],
      createStorageConfigurationMetadataProperties(this.storageConfiguration),
    );
  }

  private getSource(productId: string): ExcelProductSource {
    const source = this.sourceByProductId.get(productId);
    if (!source) throw new Error('Excel 원본 위치를 찾을 수 없는 출품작입니다.');
    return source;
  }

  private updateProduct(productId: string, update: Partial<Product>): void {
    this.products = this.products.map((product) =>
      product.id === productId ? { ...product, ...update } : product,
    );
  }

  private updateCell(source: ExcelProductSource, columnIndex: number, value: CellObject): void {
    const worksheet = this.workbook.Sheets[source.sheetName];
    const address = utils.encode_cell({ c: columnIndex, r: source.rowNumber - 1 });
    worksheet[address] = { ...worksheet[address], ...value };
    const patchValue: XlsxCellPatchValue = value.t === 'n'
      ? { type: 'number', value: Number(value.v) }
      : { type: 'string', value: String(value.v ?? '') };
    this.pendingCellPatches.set(`${source.sheetName}!${address}`, {
      sheetName: source.sheetName,
      address,
      value: patchValue,
    });
  }
}

function cloneProduct(product: Product): Product {
  return {
    ...product,
    categories: [...product.categories],
    placements: product.placements.map((placement) => ({ ...placement })),
    locationIssues: product.locationIssues.map((issue) => ({ ...issue })),
  };
}

function parseProductStorageLocation(
  product: Product,
  storageConfiguration: StorageConfiguration,
): Product {
  const parsedLocation = parseStorageLocation(
    product.location,
    storageConfiguration.facilities,
    product.id,
  );
  return {
    ...product,
    placements: parsedLocation.placements,
    locationIssues: parsedLocation.issues,
  };
}
