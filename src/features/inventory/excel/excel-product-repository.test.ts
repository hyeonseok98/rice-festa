import { describe, expect, it } from 'vitest';
import { unzipSync } from 'fflate';
import { read, utils, write } from 'xlsx';

import { ExcelProductRepository } from './excel-product-repository';
import { ProductSheetValidationError } from './product-sheet-error';

function createWorkbookBuffer(): ArrayBuffer {
  const workbook = utils.book_new();
  const liquorRows: unknown[][] = [
    [],
    [null, null, '품평회 접수목록 <우리술>'],
    [
      null, null, '순번', '업체명', '저도주\n(9°미만)', '고도주\n(9°이상)', '약·청주',
      '증류주', '출품수', '제품명(제품라벨 기준)', '식품유형', '에탄올 함량(%)',
      '수량', '보관위치', '수령일', '비고',
    ],
    [],
    [null, null, 1, '한강양조', 1, null, null, null, 2, '서울 생막걸리', '탁주', 0.06, 10, '저도주-4', new Date(2026, 7, 13), null],
    [null, null, null, null, null, 1, null, null, null, '서울 막걸리 12', '탁주', 0.12, 5, null, new Date(2026, 7, 13), '추후 배치'],
  ];
  const riceRows: unknown[][] = [
    [],
    [null, null, '품평회 접수목록 <식품>'],
    [null, null, null, '업체명', '조리', '비조리', '농협', '출품수', '제품명\n(제품라벨 기준)', '식품유형', '수량', '보관위치', '수령일', '비고'],
    [],
    [null, null, 1, '미곡식품', 1, null, null, 1, '우리쌀 전병', '과자', '5박스', '렉-5', new Date(2026, 7, 14), '박스 단위'],
  ];
  utils.book_append_sheet(workbook, utils.aoa_to_sheet(liquorRows), '우리술');
  utils.book_append_sheet(workbook, utils.aoa_to_sheet(riceRows), '쌀가공식품');
  utils.book_append_sheet(workbook, utils.aoa_to_sheet([['보존할 값']]), '품평회 접수목록');
  return write(workbook, { type: 'array', bookType: 'xlsx', cellDates: true });
}

describe('ExcelProductRepository', () => {
  it('두 운영 시트를 읽고 빈 업체명을 직전 업체명으로 이어받는다', async () => {
    const repository = ExcelProductRepository.fromArrayBuffer(createWorkbookBuffer());
    const products = await repository.getProducts();

    expect(products).toHaveLength(3);
    expect(products[0]).toMatchObject({
      id: '%EC%9A%B0%EB%A6%AC%EC%88%A0:5',
      division: 'traditional-liquor',
      categories: ['liquor-low'],
      companyName: '한강양조',
      productName: '서울 생막걸리',
      ethanolPercent: 6,
      quantity: 10,
      location: '저도주-4',
      receivedAt: '2026-08-13',
      note: null,
    });
    expect(products[1].companyName).toBe('한강양조');
    expect(products[2]).toMatchObject({
      division: 'rice-product',
      categories: ['rice-cooked'],
      quantity: '5박스',
      location: '렉-5',
      note: '박스 단위',
    });
  });

  it('퍼센트 뒤 구분 기호가 붙은 실제 입력도 읽는다', async () => {
    const workbook = read(createWorkbookBuffer(), { type: 'array' });
    workbook.Sheets['우리술'].L5 = { t: 's', v: '5.5%,' };
    const buffer = write(workbook, { type: 'array', bookType: 'xlsx' });

    const repository = ExcelProductRepository.fromArrayBuffer(buffer);
    const products = await repository.getProducts();

    expect(products[0]?.ethanolPercent).toBe(5.5);
  });

  it('숫자 셀로 저장된 제품명도 출품작으로 읽는다', async () => {
    const workbook = read(createWorkbookBuffer(), { type: 'array' });
    const worksheet = workbook.Sheets['우리술'];
    worksheet.D5 = { t: 's', v: '미미소' };
    worksheet.J5 = { t: 'n', v: 3 };
    const buffer = write(workbook, { type: 'array', bookType: 'xlsx' });

    const products = await ExcelProductRepository.fromArrayBuffer(buffer).getProducts();

    expect(products[0]).toMatchObject({ companyName: '미미소', productName: '3' });
  });

  it('수량·위치·수령일·비고 셀만 변경하고 다른 시트를 보존한다', async () => {
    const originalBuffer = createWorkbookBuffer();
    const repository = ExcelProductRepository.fromArrayBuffer(originalBuffer);
    const products = await repository.getProducts();
    const product = products[1];

    await repository.updateQuantity(product.id, 7);
    await repository.updateLocation(
      product.id,
      '고도주-5 / 칸3 / 자리1-2\n박스: 렉-1 / 칸4 / 자리7 / 뒤쪽',
    );
    await repository.updateReceivedAt(product.id, '2026-08-14');
    await repository.updateNote(product.id, '배치 완료');

    const savedBuffer = repository.exportArrayBuffer();
    const originalArchive = unzipSync(new Uint8Array(originalBuffer));
    const savedArchive = unzipSync(new Uint8Array(savedBuffer));
    expect(savedArchive['xl/styles.xml']).toEqual(originalArchive['xl/styles.xml']);
    expect(savedArchive['xl/theme/theme1.xml']).toEqual(originalArchive['xl/theme/theme1.xml']);
    expect(savedArchive['xl/workbook.xml']).toEqual(originalArchive['xl/workbook.xml']);
    expect(savedArchive['xl/worksheets/sheet2.xml']).toEqual(
      originalArchive['xl/worksheets/sheet2.xml'],
    );
    expect(savedArchive['xl/worksheets/sheet3.xml']).toEqual(
      originalArchive['xl/worksheets/sheet3.xml'],
    );
    const savedWorkbook = read(savedBuffer, { type: 'array', cellDates: false });
    const worksheet = savedWorkbook.Sheets['우리술'];
    expect(worksheet.J6.v).toBe('서울 막걸리 12');
    expect(worksheet.M6.v).toBe(7);
    expect(worksheet.N6.v).toBe(
      '고도주-5 / 칸3 / 자리1-2\n박스: 렉-1 / 칸4 / 자리7 / 뒤쪽',
    );
    expect(worksheet.O6.v).toBe(46248);
    expect(worksheet.P6.v).toBe('배치 완료');
    expect(savedWorkbook.Sheets['품평회 접수목록'].A1.v).toBe('보존할 값');
    const customProperties = savedWorkbook.Custprops as Record<string, unknown> | undefined;
    expect(customProperties?.RiceStorageSchema).toBe(1);

    const reloadedRepository = ExcelProductRepository.fromArrayBuffer(savedBuffer);
    expect(reloadedRepository.getWorkbookWarnings()).toEqual([]);
    expect(reloadedRepository.getStorageConfiguration().facilities[0]?.label).toBe('냉동-1');
    const reloadedProduct = (await reloadedRepository.getProducts()).find(
      (item) => item.id === product.id,
    );
    expect(reloadedProduct?.placements).toHaveLength(2);
    expect(reloadedProduct?.placements[0]).toMatchObject({
      facilityLabel: '고도주-5',
      levelNumber: 3,
      slotStart: 1,
      slotEnd: 2,
      isBehind: false,
      purpose: null,
    });
    expect(reloadedProduct?.placements[1]).toMatchObject({
      facilityLabel: '렉-1',
      levelNumber: 4,
      slotStart: 7,
      slotEnd: 7,
      isBehind: true,
      purpose: 'box',
    });
  });

  it('운영 시트의 헤더가 다르면 모든 오류를 모아 안내한다', () => {
    const workbook = read(createWorkbookBuffer(), { type: 'array' });
    workbook.Sheets['우리술'].M3.v = '재고';
    workbook.Sheets['쌀가공식품'].L3.v = '위치';
    const buffer = write(workbook, { type: 'array', bookType: 'xlsx' });

    expect(() => ExcelProductRepository.fromArrayBuffer(buffer)).toThrow(ProductSheetValidationError);
    try {
      ExcelProductRepository.fromArrayBuffer(buffer);
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(ProductSheetValidationError);
      if (error instanceof ProductSheetValidationError) expect(error.details).toHaveLength(2);
    }
  });
});
