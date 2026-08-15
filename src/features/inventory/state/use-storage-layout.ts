'use client';

import { useCallback } from 'react';

import type { StorageType, StorageUnit } from '../model/storage';
import { useInventorySession } from './inventory-context';

export interface StorageLayoutController {
  units: StorageUnit[];
  moveUnit: (unitId: string, x: number, y: number) => Promise<void>;
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
      return moveStorageFacility(unitId, x, y);
    },
    [moveStorageFacility],
  );

  return {
    units: storageConfiguration.facilities,
    moveUnit,
    addUnit: addStorageFacility,
    updateUnitLabel: renameStorageFacility,
    removeUnit: removeStorageFacility,
    resetLayout: resetStorageConfiguration,
  };
}
