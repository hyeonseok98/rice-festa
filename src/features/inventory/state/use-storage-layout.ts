'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { DEFAULT_STORAGE_UNITS, STORAGE_LAYOUT_HEIGHT, STORAGE_LAYOUT_WIDTH } from '../model/storage-layout';
import { getStorageType, isStorageLocation, type StorageType, type StorageUnit } from '../model/storage';

const STORAGE_LAYOUT_KEY = 'rice-storage-layout:v2';

function cloneDefaultUnits(): StorageUnit[] {
  return DEFAULT_STORAGE_UNITS.map((unit) => ({ ...unit }));
}

function isStorageUnit(value: unknown): value is StorageUnit {
  if (!value || typeof value !== 'object') return false;
  const unit = value as Record<string, unknown>;
  return (
    typeof unit.id === 'string' &&
    (unit.type === 'fridge' || unit.type === 'freezer' || unit.type === 'rack') &&
    (unit.label === null || (typeof unit.label === 'string' && isStorageLocation(unit.label))) &&
    typeof unit.x === 'number' &&
    typeof unit.y === 'number' &&
    typeof unit.width === 'number' &&
    typeof unit.height === 'number'
  );
}

function readStoredUnits(): StorageUnit[] {
  try {
    const storedValue = window.localStorage.getItem(STORAGE_LAYOUT_KEY);
    if (!storedValue) return cloneDefaultUnits();
    const parsedValue: unknown = JSON.parse(storedValue);
    if (!Array.isArray(parsedValue) || !parsedValue.every(isStorageUnit)) return cloneDefaultUnits();
    return parsedValue;
  } catch {
    return cloneDefaultUnits();
  }
}

function createObservedUnit(label: string, index: number): StorageUnit {
  const type = getStorageType(label) ?? 'fridge';
  return {
    id: `OBSERVED_${encodeURIComponent(label)}`,
    type,
    label,
    x: 220 + (index % 5) * 152,
    y: 450 + Math.floor(index / 5) * 112,
    width: type === 'rack' ? 110 : 130,
    height: type === 'rack' ? 76 : 96,
  };
}

function mergeObservedUnits(units: StorageUnit[], observedLocations: string[]): StorageUnit[] {
  const storedLabels = new Set(units.map((unit) => unit.label).filter(Boolean));
  const missingLocations = [...new Set(observedLocations)]
    .filter(isStorageLocation)
    .filter((location) => !storedLabels.has(location));

  return [
    ...units,
    ...missingLocations.map((location, index) => createObservedUnit(location, index)),
  ];
}

export interface StorageLayoutController {
  units: StorageUnit[];
  isHydrated: boolean;
  moveUnit: (unitId: string, x: number, y: number) => void;
  addUnit: (type: StorageType) => string;
  updateUnitLabel: (unitId: string, label: string | null) => void;
  removeUnit: (unitId: string) => void;
  resetLayout: () => void;
}

export function useStorageLayout(observedLocations: string[] = []): StorageLayoutController {
  const [units, setUnits] = useState<StorageUnit[]>(cloneDefaultUnits);
  const [isHydrated, setIsHydrated] = useState(false);
  const hasReadStorageRef = useRef(false);
  const observedLocationKey = [...new Set(observedLocations)].sort().join('|');

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      const locations = observedLocationKey ? observedLocationKey.split('|') : [];
      setUnits((currentUnits) =>
        mergeObservedUnits(hasReadStorageRef.current ? currentUnits : readStoredUnits(), locations),
      );
      hasReadStorageRef.current = true;
      setIsHydrated(true);
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [observedLocationKey]);

  useEffect(() => {
    if (isHydrated) window.localStorage.setItem(STORAGE_LAYOUT_KEY, JSON.stringify(units));
  }, [isHydrated, units]);

  const moveUnit = useCallback((unitId: string, x: number, y: number) => {
    setUnits((currentUnits) =>
      currentUnits.map((unit) =>
        unit.id === unitId
          ? {
              ...unit,
              x: Math.max(0, Math.min(STORAGE_LAYOUT_WIDTH - unit.width, Math.round(x))),
              y: Math.max(0, Math.min(STORAGE_LAYOUT_HEIGHT - unit.height, Math.round(y))),
            }
          : unit,
      ),
    );
  }, []);

  const addUnit = useCallback((type: StorageType): string => {
    const unitId = `${type.toUpperCase()}_${Date.now()}`;
    setUnits((currentUnits) => [
      ...currentUnits,
      {
        id: unitId,
        type,
        label: null,
        x: 420 + (currentUnits.length % 4) * 28,
        y: 500 + (currentUnits.length % 3) * 18,
        width: type === 'rack' ? 110 : 130,
        height: type === 'rack' ? 76 : 96,
      },
    ]);
    return unitId;
  }, []);

  const updateUnitLabel = useCallback((unitId: string, label: string | null) => {
    setUnits((currentUnits) =>
      currentUnits.map((unit) => (unit.id === unitId ? { ...unit, label } : unit)),
    );
  }, []);

  const removeUnit = useCallback((unitId: string) => {
    setUnits((currentUnits) => currentUnits.filter((unit) => unit.id !== unitId));
  }, []);

  const resetLayout = useCallback(() => {
    const locations = observedLocationKey ? observedLocationKey.split('|') : [];
    setUnits(mergeObservedUnits(cloneDefaultUnits(), locations));
  }, [observedLocationKey]);

  return { units, isHydrated, moveUnit, addUnit, updateUnitLabel, removeUnit, resetLayout };
}
