export interface ProductSheetErrorDetail {
  rowNumber: number | null;
  columnName: string | null;
  value: unknown;
  message: string;
}

export class ProductSheetValidationError extends Error {
  constructor(public readonly details: ProductSheetErrorDetail[]) {
    super('Excel 파일의 출품작 정보를 확인해주세요.');
    this.name = 'ProductSheetValidationError';
  }
}
