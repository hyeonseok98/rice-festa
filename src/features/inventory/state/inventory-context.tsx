'use client';

import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react';

import type { ProductQuantity } from '../model/product';
import type { StorageType } from '../model/storage';
import type { StoragePlacement, StoragePlacementMutation } from '../model/storage-placement';
import { initialInventoryState, inventoryReducer, type InventoryState } from './inventory-reducer';
import { useProductCommands } from './use-product-commands';
import { useStorageConfigurationCommands } from './use-storage-configuration-commands';
import { useWorkbookSession } from './use-workbook-session';

interface InventoryContextValue extends InventoryState {
  isBackupDecisionOpen: boolean;
  selectWorkbookFile: () => Promise<'opened' | 'cancelled' | 'unsupported'>;
  loadWorkbook: (file: File) => Promise<void>;
  updateQuantity: (productId: string, quantity: ProductQuantity) => Promise<void>;
  updateLocation: (productId: string, location: string | null) => Promise<void>;
  updatePlacements: (productId: string, placements: StoragePlacement[]) => Promise<void>;
  saveProductPlacement: (productId: string, mutation: StoragePlacementMutation) => Promise<string>;
  clearProductPlacementPosition: (productId: string, placementId: string) => Promise<void>;
  removeProductPlacement: (productId: string, placementId: string) => Promise<void>;
  updateReceivedAt: (productId: string, receivedAt: string | null) => Promise<void>;
  updateNote: (productId: string, note: string | null) => Promise<void>;
  moveStorageFacility: (facilityId: string, x: number, y: number) => Promise<void>;
  addStorageFacility: (storageType: StorageType) => Promise<string>;
  renameStorageFacility: (facilityId: string, nextLabel: string | null) => Promise<void>;
  removeStorageFacility: (facilityId: string) => Promise<void>;
  resetStorageConfiguration: () => Promise<void>;
  setStorageFacilityLevelCount: (facilityId: string, levelCount: number) => Promise<void>;
  setStorageLevelSlotCount: (
    facilityId: string,
    levelId: string,
    slotCount: number,
  ) => Promise<void>;
  setStorageFacilityRackTopEnabled: (facilityId: string, enabled: boolean) => Promise<void>;
  saveBackupBeforeEditing: () => Promise<void>;
  continueEditingWithoutBackup: () => void;
  cancelPendingEdit: () => void;
  saveInitialWorkbookBackup: () => Promise<void>;
  saveOriginalWorkbook: () => Promise<void>;
  saveChangedWorkbookCopy: () => Promise<void>;
  restoreInitialWorkbook: () => Promise<void>;
}

const InventoryContext = createContext<InventoryContextValue | null>(null);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(inventoryReducer, initialInventoryState);
  const workbookSession = useWorkbookSession(state, dispatch);
  const productCommands = useProductCommands(
    state.products,
    workbookSession.activeWorkbookSessionRef,
    workbookSession.requireEditPermission,
    dispatch,
  );
  const storageConfigurationCommands = useStorageConfigurationCommands(
    state.products,
    workbookSession.activeWorkbookSessionRef,
    workbookSession.requireEditPermission,
    dispatch,
  );

  useEffect(() => {
    const warnBeforeLeavingWithUnsavedChanges = (event: BeforeUnloadEvent) => {
      if (!state.isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeLeavingWithUnsavedChanges);
    return () => window.removeEventListener('beforeunload', warnBeforeLeavingWithUnsavedChanges);
  }, [state.isDirty]);

  const contextValue: InventoryContextValue = {
    ...state,
    isBackupDecisionOpen: workbookSession.isBackupDecisionOpen,
    selectWorkbookFile: workbookSession.selectWorkbookFile,
    loadWorkbook: workbookSession.loadWorkbook,
    ...productCommands,
    ...storageConfigurationCommands,
    saveBackupBeforeEditing: workbookSession.saveBackupBeforeEditing,
    continueEditingWithoutBackup: workbookSession.continueEditingWithoutBackup,
    cancelPendingEdit: workbookSession.cancelPendingEdit,
    saveInitialWorkbookBackup: workbookSession.saveInitialWorkbookBackup,
    saveOriginalWorkbook: workbookSession.saveOriginalWorkbook,
    saveChangedWorkbookCopy: workbookSession.saveChangedWorkbookCopy,
    restoreInitialWorkbook: workbookSession.restoreInitialWorkbook,
  };

  return <InventoryContext.Provider value={contextValue}>{children}</InventoryContext.Provider>;
}

export function useInventorySession(): InventoryContextValue {
  const context = useContext(InventoryContext);
  if (!context) throw new Error('useInventorySession은 InventoryProvider 내부에서 사용해야 합니다.');
  return context;
}
