'use client';

import { Layers3, X } from 'lucide-react';
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
  onSelectProduct: (productId: string) => void;
  onSelectSlot?: (levelNumber: number, slotNumber: number) => void;
  onDropPlacement: (
    item: FacilityPlacementDragItem,
    target: FacilityPlacementDropTarget,
  ) => void;
  onClearPlacement: (productId: string, placementId: string) => void;
}

export function FacilityShelfView({ facility, placements, focusedProductId, draft, isDropSaving, onSelectProduct, onSelectSlot, onDropPlacement, onClearPlacement }: FacilityShelfViewProps) {
  const needsScroll = facility.levels.length > 5;
  return (
    <div className={`min-h-0 bg-[#eef1f4] p-3 md:p-5 ${needsScroll ? 'overflow-y-auto' : 'overflow-hidden'}`}>
      <div className={`mx-auto flex max-w-240 flex-col border-x-6 border-t-6 border-[#626d79] bg-[#dfe4e9] p-2 pb-0 shadow-lg ${needsScroll ? '' : 'h-full'}`} aria-label={`${facility.label ?? '설비'} 내부 정면`}>
        {facility.levels.map((level) => (
          <FacilityLevelRow
            key={level.id}
            level={level}
            levelCount={facility.levels.length}
            placements={placements.filter((item) => item.placement.levelNumber === level.order)}
            focusedProductId={focusedProductId}
            draft={draft?.levelNumber === level.order ? draft : null}
            isDropSaving={isDropSaving}
            onSelectProduct={onSelectProduct}
            onSelectSlot={onSelectSlot}
            onDropPlacement={onDropPlacement}
            onClearPlacement={onClearPlacement}
          />
        ))}
      </div>
    </div>
  );
}

function FacilityLevelRow({ level, levelCount, placements, focusedProductId, draft, isDropSaving, onSelectProduct, onSelectSlot, onDropPlacement, onClearPlacement }: { level: StorageLevel; levelCount: number; placements: FacilityProductPlacement[]; focusedProductId: string | null; draft: PlacementDraft | null; isDropSaving: boolean; onSelectProduct: (productId: string) => void; onSelectSlot?: (levelNumber: number, slotNumber: number) => void; onDropPlacement: (item: FacilityPlacementDragItem, target: FacilityPlacementDropTarget) => void; onClearPlacement: (productId: string, placementId: string) => void }) {
  const behind = placements.filter((item) => item.placement.isBehind);
  const front = placements.filter((item) => !item.placement.isBehind);
  return (
    <section className="relative flex min-h-18 flex-1 flex-col border-b-6 border-[#626d79] bg-surface px-2 pt-6 pb-1.5 md:min-h-22">
      <span className="absolute top-1 left-2 text-[11px] font-extrabold text-muted-foreground">{getLevelLabel(level, levelCount)} · 왼쪽부터 {level.slotCount}자리</span>
      {behind.length || draft?.isBehind ? (
        <div className="relative mb-1 min-h-8 rounded border border-dashed border-border-strong bg-[#e8edf2]">
          <span className="absolute top-0.5 right-1 z-20 flex items-center gap-1 text-[9px] font-bold text-muted-foreground"><Layers3 aria-hidden="true" size={10} />뒤쪽</span>
          <SlotGrid level={level} placements={behind} focusedProductId={focusedProductId} draft={draft?.isBehind ? draft : null} isBehind isDropSaving={isDropSaving} onSelectProduct={onSelectProduct} onSelectSlot={onSelectSlot} onDropPlacement={onDropPlacement} onClearPlacement={onClearPlacement} compact />
        </div>
      ) : null}
      <SlotGrid level={level} placements={front} focusedProductId={focusedProductId} draft={draft && !draft.isBehind ? draft : null} isBehind={false} isDropSaving={isDropSaving} onSelectProduct={onSelectProduct} onSelectSlot={onSelectSlot} onDropPlacement={onDropPlacement} onClearPlacement={onClearPlacement} />
    </section>
  );
}

function SlotGrid({ level, placements, focusedProductId, draft, isBehind, isDropSaving, onSelectProduct, onSelectSlot, onDropPlacement, onClearPlacement, compact = false }: { level: StorageLevel; placements: FacilityProductPlacement[]; focusedProductId: string | null; draft: PlacementDraft | null; isBehind: boolean; isDropSaving: boolean; onSelectProduct: (productId: string) => void; onSelectSlot?: (levelNumber: number, slotNumber: number) => void; onDropPlacement: (item: FacilityPlacementDragItem, target: FacilityPlacementDropTarget) => void; onClearPlacement: (productId: string, placementId: string) => void; compact?: boolean }) {
  const [dropSlot, setDropSlot] = useState<number | null>(null);

  const getSlotFromPointer = (event: DragEvent<HTMLDivElement>): number => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const relativeX = Math.max(0, Math.min(bounds.width - 1, event.clientX - bounds.left));
    return Math.min(level.slotCount, Math.floor(relativeX / (bounds.width / level.slotCount)) + 1);
  };

  const acceptsPlacement = (event: DragEvent<HTMLDivElement>) =>
    !isDropSaving && event.dataTransfer.types.includes(FACILITY_PLACEMENT_DRAG_TYPE);

  const dragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!acceptsPlacement(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDropSlot(getSlotFromPointer(event));
  };

  const dropPlacement = (event: DragEvent<HTMLDivElement>) => {
    if (!acceptsPlacement(event)) return;
    event.preventDefault();
    const item = parseFacilityPlacementDragItem(event.dataTransfer.getData(FACILITY_PLACEMENT_DRAG_TYPE));
    const slotNumber = getSlotFromPointer(event);
    setDropSlot(null);
    if (item) onDropPlacement(item, { levelNumber: level.order, slotNumber, isBehind });
  };

  return (
    <div className={`relative grid min-h-0 flex-1 ${compact ? 'h-8' : ''}`} style={{ gridTemplateColumns: `repeat(${level.slotCount}, minmax(0, 1fr))` }} onDragOver={dragOver} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropSlot(null); }} onDrop={dropPlacement}>
      {Array.from({ length: level.slotCount }, (_, index) => {
        const slot = index + 1;
        const selected = Boolean(draft && slot >= draft.slotStart && slot <= draft.slotEnd);
        const dropTarget = dropSlot === slot;
        return <button key={slot} type="button" disabled={!onSelectSlot} aria-label={`왼쪽에서 ${slot}번째 자리`} aria-pressed={selected} className={`min-w-0 border-y border-l border-dashed border-border-strong text-[11px] font-semibold last:border-r focus-visible:z-30 focus-visible:outline-3 focus-visible:outline-primary ${dropTarget ? 'bg-success-soft text-success ring-3 ring-inset ring-success' : selected ? 'bg-primary-soft text-primary' : 'bg-surface text-muted-foreground enabled:hover:bg-surface-hover'} disabled:opacity-100`} onClick={() => onSelectSlot?.(level.order, slot)}>{compact ? '' : slot}</button>;
      })}
      <div className="pointer-events-none absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${level.slotCount}, minmax(0, 1fr))` }}>
        {placements.map(({ product, placement }) => <PlacementBlock key={`${product.id}-${placement.id}`} product={product} placement={placement} slotCount={level.slotCount} focused={focusedProductId === product.id} dragDisabled={isDropSaving} onSelect={() => onSelectProduct(product.id)} onClear={() => onClearPlacement(product.id, placement.id)} />)}
      </div>
    </div>
  );
}

function PlacementBlock({ product, placement, slotCount, focused, dragDisabled, onSelect, onClear }: { product: Product; placement: StoragePlacement; slotCount: number; focused: boolean; dragDisabled: boolean; onSelect: () => void; onClear: () => void }) {
  const start = Math.max(1, Math.min(placement.slotStart ?? 1, slotCount));
  const end = Math.max(start, Math.min(placement.slotEnd ?? start, slotCount));
  return <div className={`pointer-events-auto relative z-10 m-1 min-w-0 self-stretch overflow-hidden rounded-md border shadow-sm ${focused ? 'border-primary bg-primary text-white ring-3 ring-primary/20' : 'border-[#9a7a4c] bg-[#fff7e6] hover:border-primary'}`} style={{ gridColumn: `${start} / ${end + 1}`, gridRow: 1 }}><button type="button" draggable={!dragDisabled} className="h-full w-full min-w-0 cursor-grab px-1.5 pr-7 text-left active:cursor-grabbing focus-visible:outline-3 focus-visible:outline-primary" title={`${product.companyName} · ${product.productName} · 드래그해 위치 이동`} onDragStart={(event) => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData(FACILITY_PLACEMENT_DRAG_TYPE, serializeFacilityPlacementDragItem({ productId: product.id, placementId: placement.id })); }} onClick={onSelect}><strong className="block truncate text-[13px] leading-4">{product.productName}</strong><span className={`block truncate text-[9px] ${focused ? 'text-white/80' : 'text-muted-foreground'}`}>{placement.purpose === 'sample' ? '샘플' : placement.purpose === 'box' ? '박스' : product.companyName}</span></button><button type="button" disabled={dragDisabled} aria-label={`${product.productName} 자리 배치 해제`} title="자리 배치 해제" className={`absolute top-1 right-1 flex size-5 items-center justify-center rounded focus-visible:outline-2 focus-visible:outline-offset-1 ${focused ? 'text-white/80 hover:bg-white/15 hover:text-white focus-visible:outline-white' : 'text-muted-foreground hover:bg-danger-soft hover:text-danger focus-visible:outline-danger'}`} onClick={onClear}><X aria-hidden="true" size={12} /></button></div>;
}

function getLevelLabel(level: StorageLevel, levelCount: number): string {
  if (level.kind === 'top') return '테이블 위';
  if (level.kind === 'bottom') return '테이블 아래';
  if (level.order === 1) return '맨 위 칸';
  if (level.order === levelCount) return '맨 아래 칸';
  return `위에서 ${level.order}번째 칸`;
}
