import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { StorageFacility } from '@/features/inventory/model/storage';

import { FacilityShelfView } from './facility-shelf-view';

const rack: StorageFacility = {
  id: 'RACK_04',
  type: 'rack',
  label: '렉-4',
  x: 0,
  y: 0,
  width: 120,
  height: 108,
  levels: [{ id: 'rack-level-1', order: 1, kind: 'shelf', slotCount: 19 }],
  needsLevelReview: false,
};

const fridge: StorageFacility = {
  ...rack,
  id: 'FRIDGE_01',
  type: 'fridge',
  label: '냉장-1',
  levels: [{ id: 'fridge-level-1', order: 1, kind: 'shelf', slotCount: 9 }],
};

describe('FacilityShelfView', () => {
  it('렉은 7자리씩 구간 탭으로 나누어 렌더링한다', () => {
    const html = renderToStaticMarkup(createElement(FacilityShelfView, {
      facility: rack,
      placements: [],
      focusedProductId: null,
      draft: null,
      isDropSaving: false,
      activeDragItem: null,
      onBeginDrag: vi.fn(),
      onEndDrag: vi.fn(),
      onSelectProduct: vi.fn(),
      onDropPlacement: vi.fn(),
      onClearPlacement: vi.fn(),
    }));

    expect(html).toContain('aria-label="렉 자리 구간"');
    expect(html).toContain('1–7');
    expect(html).toContain('8–14');
    expect(html).toContain('aria-label="왼쪽에서 7번째 자리"');
    expect(html).not.toContain('aria-label="왼쪽에서 8번째 자리"');
    expect(html).toContain('grid-template-columns:repeat(7, minmax(0, 1fr))');
  });

  it('이름이 렉인 기존 설비도 저장 타입과 관계없이 구간 탭을 사용한다', () => {
    const html = renderToStaticMarkup(createElement(FacilityShelfView, {
      facility: { ...rack, type: 'shelf' },
      placements: [],
      focusedProductId: null,
      draft: null,
      isDropSaving: false,
      activeDragItem: null,
      onBeginDrag: vi.fn(),
      onEndDrag: vi.fn(),
      onSelectProduct: vi.fn(),
      onDropPlacement: vi.fn(),
      onClearPlacement: vi.fn(),
    }));

    expect(html).toContain('aria-label="렉 자리 구간"');
    expect(html).not.toContain('aria-label="왼쪽에서 8번째 자리"');
  });

  it('일반 보기의 빈 자리를 드롭 이벤트를 막는 비활성 버튼으로 렌더링하지 않는다', () => {
    const html = renderToStaticMarkup(createElement(FacilityShelfView, {
      facility: rack,
      placements: [],
      focusedProductId: null,
      draft: null,
      isDropSaving: false,
      activeDragItem: null,
      onBeginDrag: vi.fn(),
      onEndDrag: vi.fn(),
      onSelectProduct: vi.fn(),
      onDropPlacement: vi.fn(),
      onClearPlacement: vi.fn(),
    }));

    expect(html).toMatch(/<div[^>]*aria-label="왼쪽에서 1번째 자리"/);
    expect(html).not.toMatch(/<button[^>]*aria-label="왼쪽에서 1번째 자리"/);
    expect(html).not.toContain('disabled=""');
  });

  it('냉장고는 구간을 나누지 않고 설정한 자리 수 전체를 렌더링한다', () => {
    const html = renderToStaticMarkup(createElement(FacilityShelfView, {
      facility: fridge,
      placements: [],
      focusedProductId: null,
      draft: null,
      isDropSaving: false,
      activeDragItem: null,
      onBeginDrag: vi.fn(),
      onEndDrag: vi.fn(),
      onSelectProduct: vi.fn(),
      onDropPlacement: vi.fn(),
      onClearPlacement: vi.fn(),
    }));

    expect(html).toContain('aria-label="왼쪽에서 9번째 자리"');
    expect(html).not.toContain('aria-label="렉 자리 구간"');
  });
});
