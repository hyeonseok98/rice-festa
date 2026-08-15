'use client';

import { ArrowLeft, Plus, X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import { findPlacementConflicts } from '@/features/inventory/lib/find-placement-conflicts';
import type { Product } from '@/features/inventory/model/product';
import type { StorageFacility } from '@/features/inventory/model/storage';
import type { StoragePlacementMutation } from '@/features/inventory/model/storage-placement';
import { ModalPortal } from '@/shared/ui/modal-portal';

import type { FacilityDialogState } from '../../_hooks/use-facility-dialog';
import {
  buildDroppedPlacementMutation,
  type FacilityPlacementDragItem,
  type FacilityPlacementDropTarget,
} from '../../_lib/facility-placement-dnd';
import { buildPlacementMutation, type PlacementDraft } from '../../_lib/placement-draft';
import { getFacilityProductPlacements } from '../../_lib/storage-selectors';
import { FacilityProductList } from './facility-product-list';
import { FacilityProductPicker } from './facility-product-picker';
import { FacilityShelfView } from './facility-shelf-view';
import { PlacementEditor } from './placement-editor';

interface FacilityModalProps {
  state: Exclude<FacilityDialogState, { kind: 'closed' }>;
  facility: StorageFacility;
  products: Product[];
  selectedProductId: string | null;
  onClose: () => void;
  onBrowse: (facilityId: string, productId?: string | null) => void;
  onPickProduct: (facilityId: string) => void;
  onStartPlacement: (facilityId: string, productId: string) => void;
  onEditPlacement: (facilityId: string, productId: string, placementId: string) => void;
  onSelectSlot: (levelNumber: number, slotNumber: number) => void;
  onDraftChange: (changes: Partial<PlacementDraft>) => void;
  onSavePlacement: (productId: string, mutation: StoragePlacementMutation) => Promise<string>;
  onRemovePlacement: (productId: string, placementId: string) => Promise<void>;
}

export function FacilityModal(props: FacilityModalProps) {
  const { state, facility, products } = props;
  const { onClose } = props;
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDropSaving, setIsDropSaving] = useState(false);
  const [dropFeedback, setDropFeedback] = useState<{ tone: 'success' | 'danger' | 'progress'; message: string } | null>(null);
  const facilityPlacements = useMemo(() => getFacilityProductPlacements(products, facility.id), [facility.id, products]);
  const facilityProducts = useMemo(() => [...new Map(facilityPlacements.map((item) => [item.product.id, item.product])).values()], [facilityPlacements]);
  const editingProduct = state.kind === 'place' || state.kind === 'edit' ? products.find((product) => product.id === state.productId) ?? null : null;
  const focusedProductId = state.kind === 'browse' ? state.focusedProductId ?? props.selectedProductId : editingProduct?.id ?? null;
  const mutation = editingProduct && facility.label && (state.kind === 'place' || state.kind === 'edit') ? buildPlacementMutation(facility, state.draft) : null;
  const conflicts = editingProduct && mutation ? findPlacementConflicts(products, editingProduct.id, { ...mutation, id: mutation.placementId ?? 'preview' }) : [];

  const requestClose = useCallback(() => {
    if ((state.kind === 'place' || state.kind === 'edit') && !window.confirm('작성 중인 위치를 취소하고 닫을까요?')) return;
    onClose();
  }, [onClose, state.kind]);

  const savePlacement = async () => {
    if (!editingProduct || !mutation) return;
    setErrorMessage(null);
    setIsSaving(true);
    try {
      await props.onSavePlacement(editingProduct.id, mutation);
      props.onBrowse(facility.id, editingProduct.id);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : '위치를 저장하지 못했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const removePlacement = async (productId: string, placementId: string) => {
    if (!window.confirm('이 제품의 해당 위치를 삭제할까요?')) return;
    try {
      await props.onRemovePlacement(productId, placementId);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : '위치를 삭제하지 못했습니다.');
    }
  };

  const editPlacement = (productId: string, placementId: string) => {
    const placement = products.find((product) => product.id === productId)?.placements.find((item) => item.id === placementId);
    if (placement) props.onEditPlacement(facility.id, productId, placementId);
  };

  const dropPlacement = async (
    item: FacilityPlacementDragItem,
    target: FacilityPlacementDropTarget,
  ) => {
    if (isDropSaving || state.kind !== 'browse') return;
    const product = products.find((candidate) => candidate.id === item.productId);
    if (!product) {
      setDropFeedback({ tone: 'danger', message: '이동할 제품을 찾을 수 없습니다.' });
      return;
    }

    try {
      const droppedMutation = buildDroppedPlacementMutation(facility, product, item, target);
      const droppedConflicts = findPlacementConflicts(products, product.id, {
        ...droppedMutation,
        id: droppedMutation.placementId ?? 'drop-preview',
      });
      if (droppedConflicts.length && !window.confirm(`같은 자리에 ${droppedConflicts.map((conflict) => conflict.productName).join(', ')} 제품이 있습니다. 그래도 배치할까요?`)) return;

      setDropFeedback({ tone: 'progress', message: `${product.productName} 위치를 반영하고 있습니다.` });
      setIsDropSaving(true);
      await props.onSavePlacement(product.id, droppedMutation);
      props.onBrowse(facility.id, product.id);
      setDropFeedback({
        tone: 'success',
        message: item.placementId ? `${product.productName} 위치를 이동했습니다.` : `${product.productName} 제품을 배치했습니다.`,
      });
    } catch (error: unknown) {
      setDropFeedback({ tone: 'danger', message: error instanceof Error ? error.message : '드래그한 위치를 저장하지 못했습니다.' });
    } finally {
      setIsDropSaving(false);
    }
  };

  return (
    <ModalPortal titleId="facility-modal-title" onRequestClose={requestClose} surfaceClassName="flex h-dvh w-full flex-col md:h-[min(900px,calc(100dvh-48px))] md:w-[min(1440px,calc(100vw-48px))] md:rounded-2xl">
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-4 md:px-5">
        {state.kind !== 'browse' ? <button type="button" aria-label="설비 보기로 돌아가기" className="flex size-9 items-center justify-center rounded-lg hover:bg-surface-hover focus-visible:outline-3 focus-visible:outline-primary" onClick={() => props.onBrowse(facility.id, focusedProductId)}><ArrowLeft aria-hidden="true" size={18} /></button> : null}
        <div className="min-w-0 flex-1"><p className="text-[11px] font-bold text-primary">{getModeLabel(state.kind)}</p><h2 id="facility-modal-title" className="truncate text-xl font-extrabold">{facility.label ?? '이름 없는 설비'}</h2></div>
        <span className="hidden text-xs text-muted-foreground sm:block">정면 기준 · {facility.levels.length}칸 · {facilityProducts.length}종</span>
        {state.kind === 'browse' && props.selectedProductId ? <button type="button" className="hidden min-h-9 items-center gap-1 rounded-lg border border-primary px-3 text-xs font-bold text-primary hover:bg-primary-soft sm:flex" onClick={() => props.onStartPlacement(facility.id, props.selectedProductId!)}><Plus aria-hidden="true" size={15} />선택 제품 배치</button> : null}
        <button type="button" data-modal-autofocus aria-label="설비 내부 닫기" className="flex size-10 items-center justify-center rounded-lg hover:bg-surface-hover focus-visible:outline-3 focus-visible:outline-primary" onClick={requestClose}><X aria-hidden="true" size={20} /></button>
      </header>

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(280px,1fr)_minmax(250px,0.8fr)] overflow-hidden md:grid-cols-[minmax(0,1fr)_340px] md:grid-rows-1">
        <FacilityShelfView facility={facility} placements={facilityPlacements} focusedProductId={focusedProductId} draft={state.kind === 'place' || state.kind === 'edit' ? state.draft : null} feedback={dropFeedback} isDropSaving={isDropSaving || state.kind !== 'browse'} onSelectProduct={(productId) => props.onBrowse(facility.id, productId)} onSelectSlot={state.kind === 'place' || state.kind === 'edit' ? props.onSelectSlot : undefined} onDropPlacement={(item, target) => void dropPlacement(item, target)} />
        {state.kind === 'pick' ? <FacilityProductPicker products={products} onSelectProduct={(productId) => props.onStartPlacement(facility.id, productId)} /> : state.kind === 'place' || state.kind === 'edit' ? (editingProduct ? <PlacementEditor product={editingProduct} facility={facility} draft={state.draft} conflicts={conflicts} errorMessage={errorMessage} onDraftChange={props.onDraftChange} /> : null) : <FacilityProductList facility={facility} products={products} focusedProductId={focusedProductId} isDropSaving={isDropSaving} onPickProduct={() => props.onPickProduct(facility.id)} onStartPlacement={(productId) => props.onStartPlacement(facility.id, productId)} onFocusProduct={(productId) => props.onBrowse(facility.id, productId)} onEditPlacement={editPlacement} onRemovePlacement={(productId, placementId) => void removePlacement(productId, placementId)} />}
      </div>

      {state.kind === 'place' || state.kind === 'edit' ? <footer className="flex h-17 shrink-0 items-center justify-end gap-2 border-t border-border bg-surface px-4 md:px-5"><button type="button" className="min-h-10 rounded-lg border border-border-strong px-4 text-sm font-bold hover:bg-surface-hover focus-visible:outline-3 focus-visible:outline-primary" onClick={() => props.onBrowse(facility.id, editingProduct?.id)}>취소</button><button type="button" disabled={isSaving || !editingProduct || !mutation} className="min-h-10 rounded-lg bg-primary px-5 text-sm font-bold text-white hover:bg-primary-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50" onClick={() => void savePlacement()}>{isSaving ? '반영 중…' : '배치 적용'}</button></footer> : null}
    </ModalPortal>
  );
}

function getModeLabel(kind: FacilityDialogState['kind']): string {
  if (kind === 'pick') return '제품 선택';
  if (kind === 'place') return '새 위치 배치';
  if (kind === 'edit') return '위치 수정';
  return '설비 내부';
}
