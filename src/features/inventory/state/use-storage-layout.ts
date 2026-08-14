'use client';

import { useCallback } from 'react';

import type { StorageType, StorageUnit } from '../model/storage';
import { useInventorySession } from './inventory-context';

export interface StorageLayoutController {
  units: StorageUnit[];
  isHydrated: boolean;
  moveUnit: (unitId: string, x: number, y: number) => void;
  addUnit: (type: StorageType) => Promise<string>;
  updateUnitLabel: (unitId: string, label: string | null) => Promise<void>;
  removeUnit: (unitId: string) => Promise<void>;
  resetLayout: () => Promise<void>;
}

export function useStorageLayout(): StorageLayoutController {
  const {
    storageConfiguration,
    moveStorageFacility,
    addStorageFacility,
    renameStorageFacility,
    removeStorageFacility,
    resetStorageConfiguration,
  } = useInventorySession();

  const moveUnit = useCallback(
    (unitId: string, x: number, y: number) => {
      void moveStorageFacility(unitId, x, y).catch(() => undefined);
    },
    [moveStorageFacility],
  );

  return {
    units: storageConfiguration.facilities,
    isHydrated: true,
    moveUnit,
    addUnit: addStorageFacility,
    updateUnitLabel: renameStorageFacility,
    removeUnit: removeStorageFacility,
    resetLayout: resetStorageConfiguration,
  };
}
