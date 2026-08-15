'use client';

import { GripVertical, MapPin, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';

import { describeStoragePlacement } from '@/features/inventory/lib/describe-storage-placement';
import { createProductSearchIndex } from '@/features/inventory/lib/search-products';
import type { Product } from '@/features/inventory/model/product';
import type { StorageFacility } from '@/features/inventory/model/storage';

import {
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
  onPickProduct: () => void;
  onStartPlacement: (productId: string) => void;
  onEditPlacement: (productId: string, placementId: string) => void;
  onRemovePlacement: (productId: string, placementId: string) => void;
  onFocusProduct: (productId: string) => void;
}

export function FacilityProductList({ facility, products, focusedProductId, isDropSaving, onPickProduct, onStartPlacement, onEditPlacement, onRemovePlacement, onFocusProduct }: FacilityProductListProps) {
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
              const cardDragItem = { productId: product.id, placementId: placements[0]?.id ?? null };
              return (
                <li
                  key={product.id}
                  ref={(node) => { if (node) productCardRefs.current.set(product.id, node); else productCardRefs.current.delete(product.id); }}
                  draggable={!isDropSaving}
                  className={`cursor-grab rounded-lg border p-3 active:cursor-grabbing ${focusedProductId === product.id ? 'border-primary bg-primary-soft' : 'border-border'}`}
                  title={isNewPlacement ? '선반으로 드래그해 바로 배치' : '선반으로 드래그해 위치 이동'}
                  onDragStart={(event) => startDrag(event, cardDragItem)}
                >
                  <div className="flex items-start gap-2">
                    <GripVertical className="mt-1 shrink-0 text-muted-foreground" aria-hidden="true" size={15} />
                    <button type="button" className="min-w-0 flex-1 text-left focus-visible:outline-3 focus-visible:outline-primary" onClick={() => isNewPlacement ? onStartPlacement(product.id) : onFocusProduct(product.id)}><span className="block truncate text-[11px] text-muted-foreground">{product.companyName}</span><strong className="mt-0.5 block truncate text-sm">{product.productName}</strong></button>
                    {isNewPlacement ? <button type="button" aria-label={`${product.productName} 위치 직접 입력`} title="위치 직접 입력" className="flex size-8 shrink-0 items-center justify-center rounded-md text-primary hover:bg-primary-soft focus-visible:outline-3 focus-visible:outline-primary" onClick={() => onStartPlacement(product.id)}><Plus aria-hidden="true" size={16} /></button> : <span className={`shrink-0 rounded px-1.5 py-1 text-[10px] font-bold ${status === 'complete' ? 'bg-success-soft text-success' : 'bg-surface-hover text-muted-foreground'}`}>{status === 'complete' ? '배치완료' : '배치전'}</span>}
                  </div>
                  {isNewPlacement ? <p className="mt-2 truncate text-[11px] text-muted-foreground">{product.location ?? '위치 미지정'}</p> : (
                    <div className="mt-2 space-y-1.5">
                      {placements.map((placement) => {
                        const isPositioned = hasClearFacilityPosition(placement, facility);
                        return (
                          <div key={placement.id} draggable={!isDropSaving} className="flex cursor-grab items-center gap-1 rounded-lg bg-surface px-1 py-1.5 text-[11px] active:cursor-grabbing" title="선반으로 드래그해 위치 이동" onDragStart={(event) => { event.stopPropagation(); startDrag(event, { productId: product.id, placementId: placement.id }); }}>
                            <GripVertical className="shrink-0 text-muted-foreground" aria-hidden="true" size={13} />
                            <MapPin className={`shrink-0 ${isPositioned ? 'text-primary' : 'text-muted-foreground'}`} aria-hidden="true" size={13} />
                            <span className="min-w-0 flex-1 truncate">{isPositioned ? describeStoragePlacement(placement, facility) : `${facility.label ?? '설비'} · 배치전`}</span>
                            <button type="button" aria-label="위치 수정" title="위치 수정" className="flex size-7 items-center justify-center rounded-md hover:bg-surface-hover focus-visible:outline-3 focus-visible:outline-primary" onClick={() => onEditPlacement(product.id, placement.id)}><Pencil aria-hidden="true" size={13} /></button>
                            <button type="button" aria-label="위치 삭제" title="위치 삭제" className="flex size-7 items-center justify-center rounded-md text-danger hover:bg-danger-soft focus-visible:outline-3 focus-visible:outline-danger" onClick={() => onRemovePlacement(product.id, placement.id)}><Trash2 aria-hidden="true" size={13} /></button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : <p className="px-3 py-12 text-center text-sm leading-6 text-muted-foreground">{getEmptyMessage(query, filter)}</p>}
      </div>
    </aside>
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
