import { describe, expect, it } from 'vitest';

import { createPlacementDraft, selectPlacementSlot } from './placement-draft';

describe('placement draft', () => {
  it('새 배치에서 처음 누른 자리를 단일 자리로 선택한다', () => {
    const draft = selectPlacementSlot(createPlacementDraft(), 1, 8);

    expect(draft).toMatchObject({
      levelNumber: 1,
      slotStart: 8,
      slotEnd: 8,
      isRangeComplete: false,
    });
  });

  it('처음 선택한 자리 다음 클릭으로 연속 범위를 만든다', () => {
    const firstSelection = selectPlacementSlot(createPlacementDraft(), 1, 8);
    const rangeSelection = selectPlacementSlot(firstSelection, 1, 10);

    expect(rangeSelection).toMatchObject({
      levelNumber: 1,
      slotStart: 8,
      slotEnd: 10,
      isRangeComplete: true,
    });
  });
});
