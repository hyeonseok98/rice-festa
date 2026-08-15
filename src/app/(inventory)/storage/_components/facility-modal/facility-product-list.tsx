'use client';

import { GripVertical, MapPin, MessageSquareText, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';

import { describeStoragePlacement } from '@/features/inventory/lib/describe-storage-placement';
import { createProductSearchIndex } from '@/features/inventory/lib/search-products';
import type { Product } from '@/features/inventory/model/product';
import type { StorageFacility } from '@/features/inventory/model/storage';

import {
  createProductCardDragItem,
  FACILITY_PLACEMENT_DRAG_TYPE,
  serializeFacilityPlacementDragItem,
  type FacilityPlacementDragItem,
} from '../../_lib/facility-placement-dnd';
import {
  getFacilityProductPlacementStatus,
  hasClearFacilityPosition,
  type FacilityProductPlacementStatus,
} from '../../_lib/storage-selectors';

type FacilityListFilter = 'all' | FacilityProductPlacementStatus;

interface FacilityProductListProps {
  facility: StorageFacility;
  products: Product[];
  focusedProductId: string | null;
  isDropSaving: boolean;
  onBeginDrag: (item: FacilityPlacementDragItem) => void;
  onEndDrag: () => void;
  onPickProduct: () => void;
  onStartPlacement: (productId: string) => void;
  onEditPlacement: (productId: string, placementId: string) => void;
  onRemovePlacement: (productId: string, placementId: string) => void;
  onUpdateNote: (productId: string, note: string | null) => Promise<void>;
  onFocusProduct: (productId: string) => void;
}

export function FacilityProductList({ facility, products, focusedProductId, isDropSaving, onBeginDrag, onEndDrag, onPickProduct, onStartPlacement, onEditPlacement, onRemovePlacement, onUpdateNote, onFocusProduct }: FacilityProductListProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FacilityListFilter>('all');
  const listViewportRef = useRef<HTMLDivElement>(null);
  const productCardRefs = useRef(new Map<string, HTMLLIElement>());
  const facilityProducts = useMemo(
    () => products.filter((product) => getFacilityProductPlacementStatus(product, facility) !== null),
    [facility, products],
  );
  const statusByProductId = useMemo(
    () => new Map(facilityProducts.map((product) => [product.id, getFacilityProductPlacementStatus(product, facility)!])),
    [facility, facilityProducts],
  );
  const completeCount = useMemo(
    () => facilityProducts.filter((product) => statusByProductId.get(product.id) === 'complete').length,
    [facilityProducts, statusByProductId],
  );
  const pendingCount = facilityProducts.length - completeCount;
  const searchIndex = useMemo(() => createProductSearchIndex(products), [products]);
  const visibleProducts = useMemo(() => {
    const candidates = query.trim()
      ? searchIndex.searchProducts(query, 50).map(({ product }) => product)
      : facilityProducts;
    if (filter === 'all') return candidates;
    return candidates.filter((product) => statusByProductId.get(product.id) === filter);
  }, [facilityProducts, filter, query, searchIndex, statusByProductId]);

  const startDrag = (event: DragEvent<HTMLElement>, item: FacilityPlacementDragItem) => {
    event.dataTransfer.effectAllowed = item.placementId ? 'move' : 'copy';
    event.dataTransfer.setData(
      FACILITY_PLACEMENT_DRAG_TYPE,
      serializeFacilityPlacementDragItem(item),
    );
    onBeginDrag(item);
  };

  useEffect(() => {
    if (!focusedProductId) return;
    const frameId = window.requestAnimationFrame(() => {
      const viewport = listViewportRef.current;
      const card = productCardRefs.current.get(focusedProductId);
      if (!viewport || !card) return;
      const viewportRect = viewport.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      viewport.scrollTo({
        top: Math.max(0, viewport.scrollTop + cardRect.top - viewportRect.top - 8),
        behavior: 'smooth',
      });
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [focusedProductId, visibleProducts]);

  return (
    <aside className="flex min-h-0 flex-col border-l border-border bg-surface" aria-label="설비 내 제품 검색 및 배치">
      <div className="shrink-0 border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div><h3 className="text-sm font-extrabold">이 설비의 제품</h3><p className="mt-0.5 text-xs text-muted-foreground">{facilityProducts.length}종</p></div>
          <button type="button" className="flex min-h-9 items-center gap-1 rounded-lg bg-primary px-3 text-xs font-bold text-white hover:bg-primary-hover focus-visible:outline-3 focus-visible:outline-primary" onClick={onPickProduct}><Plus aria-hidden="true" size={15} />제품 배치</button>
        </div>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" aria-hidden="true" size={16} />
          <input type="search" value={query} placeholder="설비 내 또는 전체 제품 검색" className="h-10 w-full rounded-lg border border-border-strong pr-3 pl-9 text-sm outline-none focus:border-primary focus:ring-3 focus:ring-primary/20" onChange={(event) => setQuery(event.target.value)} />
        </div>
        <div className="mt-3 grid grid-cols-3 rounded-lg bg-surface-hover p-1" role="group" aria-label="제품 배치 상태">
          <FilterButton label="전체" count={facilityProducts.length} selected={filter === 'all'} onClick={() => setFilter('all')} />
          <FilterButton label="배치완료" count={completeCount} selected={filter === 'complete'} onClick={() => setFilter('complete')} />
          <FilterButton label="배치전" count={pendingCount} selected={filter === 'pending'} onClick={() => setFilter('pending')} />
        </div>
        {query.trim() ? <p className="mt-2 text-[11px] text-muted-foreground">검색 결과 {visibleProducts.length}건</p> : null}
      </div>
      <div ref={listViewportRef} className="min-h-0 flex-1 overflow-y-auto p-3">
        {visibleProducts.length ? (
          <ul className="space-y-2">
            {visibleProducts.map((product) => {
              const placements = product.placements.filter((placement) => placement.facilityId === facility.id);
              const status = statusByProductId.get(product.id) ?? null;
              const isNewPlacement = status === null;
              const cardDragItem = createProductCardDragItem(product, facility);
              return (
                <li
                  key={product.id}
                  ref={(node) => { if (node) productCardRefs.current.set(product.id, node); else productCardRefs.current.delete(product.id); }}
                  draggable={!isDropSaving}
                  className={`cursor-grab rounded-lg border p-3 active:cursor-grabbing ${focusedProductId === product.id ? 'border-primary bg-primary-soft' : 'border-border'}`}
                  title="선반으로 드래그"
                  onDragStart={(event) => startDrag(event, cardDragItem)}
                  onDragEnd={onEndDrag}
                >
                  <div className="flex items-start gap-2">
                    <span aria-hidden="true" className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground"><GripVertical size={15} /></span>
                    <button type="button" className="min-w-0 flex-1 text-left focus-visible:outline-3 focus-visible:outline-primary" onClick={() => isNewPlacement ? onStartPlacement(product.id) : onFocusProduct(product.id)}><span className="block truncate text-[11px] text-muted-foreground">{product.companyName}</span><strong className="mt-0.5 block truncate text-sm">{product.productName}</strong></button>
                    <div className="flex shrink-0 items-center gap-1">
                      {!isNewPlacement ? <span className={`rounded px-1.5 py-1 text-[10px] font-bold ${status === 'complete' ? 'bg-success-soft text-success' : 'bg-surface-hover text-muted-foreground'}`}>{status === 'complete' ? '배치완료' : '배치전'}</span> : null}
                      <button type="button" draggable={false} aria-label={`${product.productName} 새 위치 추가`} title="새 위치 추가" className="flex size-8 items-center justify-center rounded-md text-primary hover:bg-primary-soft focus-visible:outline-3 focus-visible:outline-primary" onDragStart={(event) => event.preventDefault()} onClick={() => onStartPlacement(product.id)}><Plus aria-hidden="true" size={16} /></button>
                    </div>
                  </div>
                  {isNewPlacement ? <p className="mt-2 truncate text-[11px] text-muted-foreground">{product.location ?? '위치 미지정'}</p> : (
                    <div className="mt-2 space-y-1.5">
                      {placements.map((placement) => {
                        const isPositioned = hasClearFacilityPosition(placement, facility);
                        return (
                          <div key={placement.id} draggable={!isDropSaving} className="flex cursor-grab items-center gap-1 rounded-lg bg-surface px-1 py-1.5 text-[11px] active:cursor-grabbing" title="선반으로 드래그해 위치 이동" onDragStart={(event) => { event.stopPropagation(); startDrag(event, { productId: product.id, placementId: placement.id }); }} onDragEnd={onEndDrag}>
                            <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground"><GripVertical size={13} /></span>
                            <MapPin className={`shrink-0 ${isPositioned ? 'text-primary' : 'text-muted-foreground'}`} aria-hidden="true" size={13} />
                            <span className="min-w-0 flex-1 truncate">{isPositioned ? describeStoragePlacement(placement, facility) : `${facility.label ?? '설비'} · 배치전`}</span>
                            <button type="button" draggable={false} aria-label="위치 수정" title="위치 수정" className="flex size-7 items-center justify-center rounded-md hover:bg-surface-hover focus-visible:outline-3 focus-visible:outline-primary" onDragStart={(event) => event.preventDefault()} onClick={() => onEditPlacement(product.id, placement.id)}><Pencil aria-hidden="true" size={13} /></button>
                            <button type="button" draggable={false} aria-label="위치 삭제" title="위치 삭제" className="flex size-7 items-center justify-center rounded-md text-danger hover:bg-danger-soft focus-visible:outline-3 focus-visible:outline-danger" onDragStart={(event) => event.preventDefault()} onClick={() => onRemovePlacement(product.id, placement.id)}><Trash2 aria-hidden="true" size={13} /></button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <ProductNoteEditor key={`${product.id}:${product.note ?? ''}`} product={product} disabled={isDropSaving} onSave={onUpdateNote} />
                </li>
              );
            })}
          </ul>
        ) : <p className="px-3 py-12 text-center text-sm leading-6 text-muted-foreground">{getEmptyMessage(query, filter)}</p>}
      </div>
    </aside>
  );
}

function ProductNoteEditor({ product, disabled, onSave }: { product: Product; disabled: boolean; onSave: (productId: string, note: string | null) => Promise<void> }) {
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState(product.note ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const normalizedValue = value.trim() || null;
  const hasChange = normalizedValue !== product.note;

  const closeEditor = () => {
    setValue(product.note ?? '');
    setErrorMessage(null);
    setIsOpen(false);
  };

  const saveNote = async () => {
    if (!hasChange) {
      setIsOpen(false);
      return;
    }
    setErrorMessage(null);
    setIsSaving(true);
    try {
      await onSave(product.id, normalizedValue);
      setIsOpen(false);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : '비고를 저장하지 못했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mt-1 border-t border-border/50 pt-1" draggable={false} onDragStart={(event) => { event.preventDefault(); event.stopPropagation(); }}>
      <button type="button" className="flex h-7 w-full items-center gap-1 rounded-md px-1 text-left text-muted-foreground hover:bg-surface-hover focus-visible:outline-3 focus-visible:outline-primary" style={{ fontSize: '11px', lineHeight: '16px' }} onClick={() => setIsOpen((current) => !current)}>
        <MessageSquareText aria-hidden="true" size={13} />
        <span className="font-medium">비고</span>
        <span className="min-w-0 flex-1 truncate">{product.note ?? '메모 없음'}</span>
      </button>
      {isOpen ? (
        <div className="mt-2" onPointerDown={(event) => event.stopPropagation()}>
          <label htmlFor={`facility-product-note-${product.id}`} className="sr-only">{product.productName} 비고</label>
          <textarea id={`facility-product-note-${product.id}`} rows={3} value={value} disabled={disabled || isSaving} placeholder="예: 500ml은 저도주-1, 750ml은 고도주-3" className="w-full resize-none rounded-lg border border-border bg-surface px-2.5 py-2 text-xs leading-5 outline-none focus:border-primary focus:ring-3 focus:ring-primary/20 disabled:opacity-60" onChange={(event) => setValue(event.target.value)} />
          {errorMessage ? <p className="mt-1.5 text-[11px] font-semibold text-danger" role="alert">{errorMessage}</p> : null}
          <div className="mt-2 flex justify-end gap-1.5">
            <button type="button" disabled={isSaving} className="min-h-8 rounded-md px-2.5 text-[11px] font-bold text-muted-foreground hover:bg-surface-hover disabled:opacity-50" onClick={closeEditor}>취소</button>
            <button type="button" disabled={disabled || isSaving || !hasChange} className="min-h-8 rounded-md bg-primary px-3 text-[11px] font-bold text-white hover:bg-primary-hover disabled:opacity-50" onClick={() => void saveNote()}>{isSaving ? '저장 중…' : '저장'}</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FilterButton({ label, count, selected, onClick }: { label: string; count: number; selected: boolean; onClick: () => void }) {
  return <button type="button" aria-pressed={selected} className={`min-h-8 rounded-md px-1 text-[10px] font-bold focus-visible:outline-3 focus-visible:outline-primary ${selected ? 'bg-surface text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`} onClick={onClick}>{label} <span className="tabular-nums">{count}</span></button>;
}

function getEmptyMessage(query: string, filter: FacilityListFilter): string {
  if (query.trim()) return '검색 결과가 없습니다.';
  if (filter === 'complete') return '배치완료 제품이 없습니다.';
  if (filter === 'pending') return '배치전 제품이 없습니다.';
  return '아직 이 설비에 배치된 제품이 없습니다.';
}
