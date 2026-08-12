import { describe, expect, it } from 'vitest';
import { read, utils, write } from 'xlsx';

import { ExcelProductRepository } from './excel-product-repository';
import { ProductSheetValidationError } from './product-sheet-error';

const headers = [
  '업체명',
  '제품명',
  '식품유형',
  '에탄올 함량(%)',
  '수량',
  '위치',
  '수령일',
];

function createWorkbookBuffer(rows: unknown[][]): ArrayBuffer {
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, utils.aoa_to_sheet([headers, ...rows]), '출품작');
  return write(workbook, { type: 'array', bookType: 'xlsx' });
}

describe('ExcelProductRepository', () => {
  it('Excel 행을 검증된 Product로 변환한다', async () => {
    const buffer = createWorkbookBuffer([
      ['한강양조', '서울 생막걸리', '탁주', 6, 10, '저도주-1', new Date(2026, 7, 1)],
    ]);

    const repository = ExcelProductRepository.fromArrayBuffer(buffer);
    const products = await repository.getProducts();

    expect(products).toEqual([
      {
        id: '%EC%B6%9C%ED%92%88%EC%9E%91:2',
        companyName: '한강양조',
        productName: '서울 생막걸리',
        foodType: '탁주',
        ethanolPercent: 6,
        quantity: 10,
        location: '저도주-1',
        receivedAt: '2026-08-01',
      },
    ]);
  });

  it('모든 행의 검증 오류를 한 번에 수집한다', () => {
    const buffer = createWorkbookBuffer([
      ['', '제품 A', '탁주', 101, -1, '없는-위치', '잘못된 날짜'],
      ['업체 B', '', '약주', 12, 1.5, '약청주-1', '2026-08-01'],
    ]);

    expect(() => ExcelProductRepository.fromArrayBuffer(buffer)).toThrow(
      ProductSheetValidationError,
    );

    try {
      ExcelProductRepository.fromArrayBuffer(buffer);
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(ProductSheetValidationError);
      if (error instanceof ProductSheetValidationError) {
        expect(error.details).toHaveLength(7);
        expect(error.details.map((detail) => detail.rowNumber)).toEqual([2, 2, 2, 2, 2, 3, 3]);
      }
    }
  });

  it('수량과 위치 셀만 변경해 다시 저장한다', async () => {
    const buffer = createWorkbookBuffer([
      ['한강양조', '서울 생막걸리', '탁주', 6, 10, '저도주-1', new Date(2026, 7, 1)],
    ]);
    const repository = ExcelProductRepository.fromArrayBuffer(buffer);
    const [product] = await repository.getProducts();

    await repository.updateQuantity(product.id, 7);
    await repository.updateLocation(product.id, '저도주-2');

    const savedWorkbook = read(repository.exportArrayBuffer(), { type: 'array' });
    const worksheet = savedWorkbook.Sheets['출품작'];
    expect(worksheet.A2.v).toBe('한강양조');
    expect(worksheet.E2.v).toBe(7);
    expect(worksheet.F2.v).toBe('저도주-2');
  });
});
