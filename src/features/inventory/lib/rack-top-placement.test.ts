import { describe, expect, it } from 'vitest';

import type { StorageFacility } from '../model/storage';

import { parseStorageLocation } from './parse-storage-location';
import { serializeStorageLocation } from './serialize-storage-location';

const rack: StorageFacility = {
  id: 'RACK_04',
  type: 'rack',
  label: '렉-4',
  x: 0,
  y: 0,
  width: 220,
  height: 150,
  levels: [
    { id: 'RACK_04:level:0', order: 0, kind: 'top', slotCount: 16 },
    { id: 'RACK_04:level:1', order: 1, kind: 'shelf', slotCount: 16 },
  ],
  needsLevelReview: false,
};

describe('rack top placement', () => {
  it('렉 꼭대기 0번 칸을 읽고 Excel 위치 문자열로 저장한다', () => {
    const parsed = parseStorageLocation('렉-4 / 칸0 / 자리3', [rack], 'product-1');

    expect(parsed.issues).toEqual([]);
    expect(parsed.placements[0]).toMatchObject({ levelNumber: 0, slotStart: 3, slotEnd: 3 });
    expect(serializeStorageLocation(parsed.placements)).toBe('렉-4 / 칸0 / 자리3');
  });
});
