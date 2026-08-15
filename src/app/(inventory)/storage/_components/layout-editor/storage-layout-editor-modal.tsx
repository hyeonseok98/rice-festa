'use client';

import { X } from 'lucide-react';
import { useCallback, useState } from 'react';

import type { StorageType } from '@/features/inventory/model/storage';
import { useInventorySession } from '@/features/inventory/state/inventory-context';
import { useStorageLayout } from '@/features/inventory/state/use-storage-layout';
import { ModalPortal } from '@/shared/ui/modal-portal';

import { StorageFacilitySettings } from '../storage-facility-settings';
import { StorageLayoutEditor } from '../storage-layout-editor';
import { StorageMap } from '../storage-map';

export function StorageLayoutEditorModal({ onClose }: { onClose: () => void }) {
  const { products, setStorageFacilityLevelCount, setStorageLevelSlotCount, setStorageFacilityRackTopEnabled } = useInventorySession();
  const { units, moveUnit, addUnit, updateUnitLabel, removeUnit, resetLayout } = useStorageLayout();
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);
  const selectedFacility = units.find((facility) => facility.id === selectedFacilityId) ?? null;
  const storedProductCount = selectedFacility ? products.filter((product) => product.placements.some((placement) => placement.facilityId === selectedFacility.id)).length : 0;
  const requestClose = useCallback(() => onClose(), [onClose]);

  const addFacility = async (storageType: StorageType) => {
    setSelectedFacilityId(await addUnit(storageType));
  };

  return (
    <ModalPortal titleId="layout-editor-title" onRequestClose={requestClose} surfaceClassName="flex h-dvh w-full flex-col md:h-[min(900px,calc(100dvh-48px))] md:w-[min(1500px,calc(100vw-48px))] md:rounded-2xl">
      <header className="flex h-16 shrink-0 items-center border-b border-border px-5"><div className="min-w-0 flex-1"><p className="text-[11px] font-bold text-primary">설비 설정</p><h2 id="layout-editor-title" className="text-xl font-extrabold">보관실 배치와 설비 구조 편집</h2></div><button type="button" data-modal-autofocus aria-label="설비 편집 닫기" className="flex size-10 items-center justify-center rounded-lg hover:bg-surface-hover focus-visible:outline-3 focus-visible:outline-primary" onClick={requestClose}><X aria-hidden="true" size={20} /></button></header>
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_360px] overflow-hidden">
        <div className="min-h-0 bg-[#f4f6f8] p-4"><StorageMap units={units} products={products} isEditing highlightedLocations={new Set()} hasSearchQuery={false} onSelectUnit={setSelectedFacilityId} onMoveUnit={moveUnit} /></div>
        <aside className="min-h-0 overflow-y-auto border-l border-border p-5">
          <StorageLayoutEditor key={selectedFacility?.id ?? 'none'} selectedUnit={selectedFacility} storedProductCount={storedProductCount} onAddUnit={(type) => void addFacility(type)} onRenameUnit={updateUnitLabel} onRemoveUnit={(id) => void removeUnit(id).then(() => setSelectedFacilityId(null))} onResetLayout={() => void resetLayout().then(() => setSelectedFacilityId(null))} />
          <div className="mt-6 border-t border-border pt-6"><StorageFacilitySettings facility={selectedFacility} onSetLevelCount={setStorageFacilityLevelCount} onSetSlotCount={setStorageLevelSlotCount} onSetRackTopEnabled={setStorageFacilityRackTopEnabled} /></div>
        </aside>
      </div>
    </ModalPortal>
  );
}
