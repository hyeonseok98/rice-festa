'use client';

import { GripVertical, Layers3, X } from 'lucide-react';
import { useState, type DragEvent } from 'react';

import type { Product } from '@/features/inventory/model/product';
import type { StorageFacility, StorageLevel } from '@/features/inventory/model/storage';
import type { StoragePlacement } from '@/features/inventory/model/storage-placement';

import type { PlacementDraft } from '../../_lib/placement-draft';
import {
  FACILITY_PLACEMENT_DRAG_TYPE,
  parseFacilityPlacementDragItem,
  serializeFacilityPlacementDragItem,
  type FacilityPlacementDragItem,
  type FacilityPlacementDropTarget,
} from '../../_lib/facility-placement-dnd';
import type { FacilityProductPlacement } from '../../_lib/storage-selectors';

interface FacilityShelfViewProps {
  facility: StorageFacility;
  placements: FacilityProductPlacement[];
  focusedProductId: string | null;
  draft: PlacementDraft | null;
  isDropSaving: boolean;
  activeDragItem: FacilityPlacementDragItem | null;
  onBeginDrag: (item: FacilityPlacementDragItem) => void;
  onEndDrag: () => void;
  onSelectProduct: (productId: string) => void;
  onSelectSlot?: (levelNumber: number, slotNumber: number) => void;
  onDropPlacement: (
    item: FacilityPlacementDragItem,
    target: FacilityPlacementDropTarget,
  ) => void;
  onClearPlacement: (productId: string, placementId: string) => void;
}

const RACK_SLOT_PAGE_SIZE = 7;

function usesRackSlotPages(facility: StorageFacility): boolean {
  return facility.type === 'rack' || facility.label?.startsWith('렉-') === true;
}

export function FacilityShelfView({ facility, placements, focusedProductId, draft, isDropSaving, activeDragItem, onBeginDrag, onEndDrag, onSelectProduct, onSelectSlot, onDropPlacement, onClearPlacement }: FacilityShelfViewProps) {
  const needsScroll = facility.levels.length > 5;
  const maximumSlotCount = Math.max(...facility.levels.map((level) => level.slotCount));
  const usesSlotPages = usesRackSlotPages(facility);
  const slotPageCount = usesSlotPages
    ? Math.max(1, Math.ceil(maximumSlotCount / RACK_SLOT_PAGE_SIZE))
    : 1;
  const [slotPage, setSlotPage] = useState(0);
  const activeSlotPage = Math.min(slotPage, slotPageCount - 1);
  const visibleSlotStart = activeSlotPage * RACK_SLOT_PAGE_SIZE + 1;
  const visibleSlotEnd = usesSlotPages
    ? Math.min(maximumSlotCount, visibleSlotStart + RACK_SLOT_PAGE_SIZE - 1)
    : maximumSlotCount;
  const hasSlotPages = slotPageCount > 1;

  return (
    <div className={`min-h-0 bg-[#eef1f4] p-3 md:p-5 ${needsScroll ? 'overflow-y-auto' : 'overflow-hidden'} ${hasSlotPages ? 'flex flex-col' : ''}`}>
      {hasSlotPages ? (
        <nav className="mx-auto mb-2 flex shrink-0 items-center gap-1 rounded-lg border border-border bg-surface p-1" aria-label="렉 자리 구간">
          {Array.from({ length: slotPageCount }, (_, pageIndex) => {
            const rangeStart = pageIndex * RACK_SLOT_PAGE_SIZE + 1;
            const rangeEnd = Math.min(maximumSlotCount, rangeStart + RACK_SLOT_PAGE_SIZE - 1);
            return <button key={rangeStart} type="button" aria-pressed={activeSlotPage === pageIndex} className={`min-h-8 rounded-md px-3 text-xs font-bold tabular-nums focus-visible:outline-3 focus-visible:outline-primary ${activeSlotPage === pageIndex ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground'}`} onClick={() => setSlotPage(pageIndex)}>{rangeStart}–{rangeEnd}</button>;
          })}
        </nav>
      ) : null}
      <div className={`mx-auto flex w-full max-w-240 flex-col border-x-6 border-t-6 border-[#626d79] bg-[#dfe4e9] p-2 pb-0 shadow-lg ${needsScroll ? '' : hasSlotPages ? 'min-h-0 flex-1' : 'h-full'}`} aria-label={`${facility.label ?? '설비'} 내부 정면`}>
        {facility.levels.map((level) => (
          <FacilityLevelRow
            key={level.id}
            level={level}
            levelCount={facility.levels.filter((candidate) => candidate.order > 0).length}
            visibleSlotStart={visibleSlotStart}
            visibleSlotEnd={visibleSlotEnd}
            fixedGridSlotCount={usesSlotPages ? RACK_SLOT_PAGE_SIZE : null}
            placements={placements.filter((item) => item.placement.levelNumber === level.order)}
            focusedProductId={focusedProductId}
            draft={draft?.levelNumber === level.order ? draft : null}
            isDropSaving={isDropSaving}
            activeDragItem={activeDragItem}
            onBeginDrag={onBeginDrag}
            onEndDrag={onEndDrag}
            onSelectProduct={onSelectProduct}
            onSelectSlot={onSelectSlot}
            onDropPlacement={(item, target) => { onEndDrag(); onDropPlacement(item, target); }}
            onClearPlacement={onClearPlacement}
          />
        ))}
      </div>
    </div>
  );
}

function FacilityLevelRow({ level, levelCount, visibleSlotStart, visibleSlotEnd, fixedGridSlotCount, placements, focusedProductId, draft, isDropSaving, activeDragItem, onBeginDrag, onEndDrag, onSelectProduct, onSelectSlot, onDropPlacement, onClearPlacement }: { level: StorageLevel; levelCount: number; visibleSlotStart: number; visibleSlotEnd: number; fixedGridSlotCount: number | null; placements: FacilityProductPlacement[]; focusedProductId: string | null; draft: PlacementDraft | null; isDropSaving: boolean; activeDragItem: FacilityPlacementDragItem | null; onBeginDrag: (item: FacilityPlacementDragItem) => void; onEndDrag: () => void; onSelectProduct: (productId: string) => void; onSelectSlot?: (levelNumber: number, slotNumber: number) => void; onDropPlacement: (item: FacilityPlacementDragItem, target: FacilityPlacementDropTarget) => void; onClearPlacement: (productId: string, placementId: string) => void }) {
  const behind = placements.filter((item) => item.placement.isBehind);
  const front = placements.filter((item) => !item.placement.isBehind);
  const levelVisibleSlotEnd = Math.min(level.slotCount, visibleSlotEnd);
  const hasVisibleSlots = visibleSlotStart <= levelVisibleSlotEnd;
  const gridSlotCount = fixedGridSlotCount ?? Math.max(1, levelVisibleSlotEnd - visibleSlotStart + 1);
  return (
    <section className="relative flex min-h-18 flex-1 flex-col border-b-6 border-[#626d79] bg-surface px-2 pt-6 pb-1.5 md:min-h-22">
      <span className="absolute top-1 left-2 text-[11px] font-extrabold text-muted-foreground">{getLevelLabel(level, levelCount)} · 왼쪽부터 {level.slotCount}자리</span>
      {!hasVisibleSlots ? <div className="flex min-h-0 flex-1 items-center justify-center border border-dashed border-border text-xs font-semibold text-muted-foreground">이 칸은 {level.slotCount}자리까지 있습니다.</div> : null}
      {hasVisibleSlots && (behind.length || draft?.isBehind) ? (
        <div className="relative mb-1 min-h-8 rounded border border-dashed border-border-strong bg-[#e8edf2]">
          <span className="absolute top-0.5 right-1 z-20 flex items-center gap-1 text-[9px] font-bold text-muted-foreground"><Layers3 aria-hidden="true" size={10} />뒤쪽</span>
          <SlotGrid level={level} visibleSlotStart={visibleSlotStart} visibleSlotEnd={levelVisibleSlotEnd} gridSlotCount={gridSlotCount} placements={behind} focusedProductId={focusedProductId} draft={draft?.isBehind ? draft : null} isBehind isDropSaving={isDropSaving} activeDragItem={activeDragItem} onBeginDrag={onBeginDrag} onEndDrag={onEndDrag} onSelectProduct={onSelectProduct} onSelectSlot={onSelectSlot} onDropPlacement={onDropPlacement} onClearPlacement={onClearPlacement} compact />
        </div>
      ) : null}
      {hasVisibleSlots ? <SlotGrid level={level} visibleSlotStart={visibleSlotStart} visibleSlotEnd={levelVisibleSlotEnd} gridSlotCount={gridSlotCount} placements={front} focusedProductId={focusedProductId} draft={draft && !draft.isBehind ? draft : null} isBehind={false} isDropSaving={isDropSaving} activeDragItem={activeDragItem} onBeginDrag={onBeginDrag} onEndDrag={onEndDrag} onSelectProduct={onSelectProduct} onSelectSlot={onSelectSlot} onDropPlacement={onDropPlacement} onClearPlacement={onClearPlacement} /> : null}
    </section>
  );
}

function SlotGrid({ level, visibleSlotStart, visibleSlotEnd, gridSlotCount, placements, focusedProductId, draft, isBehind, isDropSaving, activeDragItem, onBeginDrag, onEndDrag, onSelectProduct, onSelectSlot, onDropPlacement, onClearPlacement, compact = false }: { level: StorageLevel; visibleSlotStart: number; visibleSlotEnd: number; gridSlotCount: number; placements: FacilityProductPlacement[]; focusedProductId: string | null; draft: PlacementDraft | null; isBehind: boolean; isDropSaving: boolean; activeDragItem: FacilityPlacementDragItem | null; onBeginDrag: (item: FacilityPlacementDragItem) => void; onEndDrag: () => void; onSelectProduct: (productId: string) => void; onSelectSlot?: (levelNumber: number, slotNumber: number) => void; onDropPlacement: (item: FacilityPlacementDragItem, target: FacilityPlacementDropTarget) => void; onClearPlacement: (productId: string, placementId: string) => void; compact?: boolean }) {
  const [dropSlot, setDropSlot] = useState<number | null>(null);
  const visibleSlotCount = visibleSlotEnd - visibleSlotStart + 1;
  const visiblePlacements = placements.filter(({ placement }) => {
    const placementStart = placement.slotStart ?? 1;
    const placementEnd = placement.slotEnd ?? placementStart;
    return placementStart <= visibleSlotEnd && placementEnd >= visibleSlotStart;
  });

  const acceptsPlacement = (event: DragEvent<HTMLElement>) =>
    !isDropSaving && (
      activeDragItem !== null || event.dataTransfer.types.includes(FACILITY_PLACEMENT_DRAG_TYPE)
    );

  const dragOverSlot = (event: DragEvent<HTMLElement>, slotNumber: number) => {
    if (!acceptsPlacement(event)) return;
    event.preventDefault();
    const dragItem = activeDragItem;
    event.dataTransfer.dropEffect = dragItem
      ? dragItem.placementId === null ? 'copy' : 'move'
      : event.dataTransfer.effectAllowed === 'copy' ? 'copy' : 'move';
    setDropSlot(slotNumber);
  };

  const dropPlacement = (event: DragEvent<HTMLElement>, slotNumber: number) => {
    if (!acceptsPlacement(event)) return;
    event.preventDefault();
    event.stopPropagation();
    const item = activeDragItem ?? parseFacilityPlacementDragItem(
      event.dataTransfer.getData(FACILITY_PLACEMENT_DRAG_TYPE),
    );
    setDropSlot(null);
    if (item) onDropPlacement(item, { levelNumber: level.order, slotNumber, isBehind });
  };

  return (
    <div className={`relative grid min-h-0 flex-1 ${compact ? 'h-8' : ''}`} style={{ gridTemplateColumns: `repeat(${gridSlotCount}, minmax(0, 1fr))` }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropSlot(null); }}>
      {Array.from({ length: visibleSlotCount }, (_, index) => {
        const slot = visibleSlotStart + index;
        const selected = Boolean(draft && slot >= draft.slotStart && slot <= draft.slotEnd);
        const dropTarget = dropSlot === slot;
        const className = `flex min-w-0 items-center justify-center border-y border-l border-dashed border-border-strong text-[11px] font-semibold last:border-r ${dropTarget ? 'bg-success-soft text-success ring-3 ring-inset ring-success' : selected ? 'bg-primary-soft text-primary' : 'bg-surface text-muted-foreground'}`;
        if (!onSelectSlot) {
          return <div key={slot} aria-label={`왼쪽에서 ${slot}번째 자리`} className={className} onDragEnter={(event) => dragOverSlot(event, slot)} onDragOver={(event) => dragOverSlot(event, slot)} onDrop={(event) => dropPlacement(event, slot)}>{compact ? '' : slot}</div>;
        }
        return <button key={slot} type="button" aria-label={`왼쪽에서 ${slot}번째 자리`} aria-pressed={selected} className={`${className} hover:bg-surface-hover focus-visible:z-30 focus-visible:outline-3 focus-visible:outline-primary`} onDragEnter={(event) => dragOverSlot(event, slot)} onDragOver={(event) => dragOverSlot(event, slot)} onDrop={(event) => dropPlacement(event, slot)} onClick={() => onSelectSlot(level.order, slot)}>{compact ? '' : slot}</button>;
      })}
      <div className="pointer-events-none absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${gridSlotCount}, minmax(0, 1fr))` }}>
        {visiblePlacements.map(({ product, placement }) => <PlacementBlock key={`${product.id}-${placement.id}`} product={product} placement={placement} visibleSlotStart={visibleSlotStart} visibleSlotEnd={visibleSlotEnd} focused={focusedProductId === product.id} dragDisabled={isDropSaving} dragActive={activeDragItem !== null} onBeginDrag={onBeginDrag} onEndDrag={onEndDrag} onSelect={() => onSelectProduct(product.id)} onClear={() => onClearPlacement(product.id, placement.id)} />)}
      </div>
    </div>
  );
}

function PlacementBlock({ product, placement, visibleSlotStart, visibleSlotEnd, focused, dragDisabled, dragActive, onBeginDrag, onEndDrag, onSelect, onClear }: { product: Product; placement: StoragePlacement; visibleSlotStart: number; visibleSlotEnd: number; focused: boolean; dragDisabled: boolean; dragActive: boolean; onBeginDrag: (item: FacilityPlacementDragItem) => void; onEndDrag: () => void; onSelect: () => void; onClear: () => void }) {
  const placementStart = placement.slotStart ?? visibleSlotStart;
  const placementEnd = placement.slotEnd ?? placementStart;
  const start = Math.max(placementStart, visibleSlotStart) - visibleSlotStart + 1;
  const end = Math.min(Math.max(placementEnd, placementStart), visibleSlotEnd) - visibleSlotStart + 1;
  const dragItem = { productId: product.id, placementId: placement.id };
  return (
    <div className={`${dragActive ? 'pointer-events-none' : 'pointer-events-auto'} relative z-10 m-1 min-w-0 self-stretch overflow-hidden rounded-md border shadow-sm ${focused ? 'border-primary bg-primary text-white ring-3 ring-primary/20' : 'border-[#9a7a4c] bg-[#fff7e6] hover:border-primary'}`} style={{ gridColumn: `${start} / ${end + 1}`, gridRow: 1 }}>
      <span draggable={!dragDisabled} aria-label={`${product.productName} 위치 이동`} title="드래그해 위치 이동" className="absolute top-1 left-1 z-20 flex size-5 cursor-grab items-center justify-center rounded active:cursor-grabbing" onDragStart={(event) => { event.stopPropagation(); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData(FACILITY_PLACEMENT_DRAG_TYPE, serializeFacilityPlacementDragItem(dragItem)); onBeginDrag(dragItem); }} onDragEnd={onEndDrag}><GripVertical aria-hidden="true" size={12} /></span>
      <button type="button" className="h-full w-full min-w-0 px-7 text-left focus-visible:outline-3 focus-visible:outline-primary" title={`${product.companyName} · ${product.productName}`} onClick={onSelect}><strong className="line-clamp-3 [overflow-wrap:anywhere] text-[13px] leading-4">{product.productName}</strong><span className={`block truncate text-[9px] ${focused ? 'text-white/80' : 'text-muted-foreground'}`}>{placement.purpose === 'sample' ? '샘플' : placement.purpose === 'box' ? '박스' : product.companyName}</span></button>
      <button type="button" disabled={dragDisabled} aria-label={`${product.productName} 자리 배치 해제`} title="자리 배치 해제" className={`absolute top-1 right-1 flex size-5 items-center justify-center rounded focus-visible:outline-2 focus-visible:outline-offset-1 ${focused ? 'text-white/80 hover:bg-white/15 hover:text-white focus-visible:outline-white' : 'text-muted-foreground hover:bg-danger-soft hover:text-danger focus-visible:outline-danger'}`} onClick={onClear}><X aria-hidden="true" size={12} /></button>
    </div>
  );
}

function getLevelLabel(level: StorageLevel, levelCount: number): string {
  if (level.kind === 'top') return level.order === 0 ? '꼭대기 (0번)' : '테이블 위';
  if (level.kind === 'bottom') return '테이블 아래';
  if (level.order === 1) return '맨 위 칸';
  if (level.order === levelCount) return '맨 아래 칸';
  return `위에서 ${level.order}번째 칸`;
}
