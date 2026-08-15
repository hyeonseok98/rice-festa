import {
  getStorageType,
  type StorageConfiguration,
  type StorageFacility,
  type StorageLevel,
  type StorageType,
} from './storage';

export const STORAGE_LAYOUT_WIDTH = 1400;
export const STORAGE_LAYOUT_HEIGHT = 920;
export const DEFAULT_STORAGE_LEVEL_COUNT = 4;
export const DEFAULT_STORAGE_SLOT_COUNT = 7;

interface StorageFacilityPosition {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export function createStorageLevels(
  facilityId: string,
  storageType: StorageType,
  levelCount = storageType === 'table' ? 2 : DEFAULT_STORAGE_LEVEL_COUNT,
): StorageLevel[] {
  return Array.from({ length: levelCount }, (_, index) => ({
    id: `${facilityId}:level:${index + 1}`,
    order: index + 1,
    kind: storageType === 'table'
      ? index === 0
        ? 'top'
        : 'bottom'
      : index === levelCount - 1 && (storageType === 'fridge' || storageType === 'freezer')
          ? 'floor'
          : 'shelf',
    slotCount: DEFAULT_STORAGE_SLOT_COUNT,
  }));
}

export function createRackTopLevel(
  facilityId: string,
  slotCount = DEFAULT_STORAGE_SLOT_COUNT,
): StorageLevel {
  return {
    id: `${facilityId}:level:0`,
    order: 0,
    kind: 'top',
    slotCount,
  };
}

function createStorageFacility(
  id: string,
  type: StorageType,
  label: string | null,
  position: StorageFacilityPosition,
  needsLevelReview = type !== 'rack',
): StorageFacility {
  return {
    id,
    type,
    label,
    x: position.x,
    y: position.y,
    width: position.width ?? (type === 'rack' ? 220 : 120),
    height: position.height ?? (type === 'rack' ? 150 : 108),
    levels: createStorageLevels(id, type),
    needsLevelReview,
  };
}

function createDefaultStorageFacilities(): StorageFacility[] {
  const facilities: StorageFacility[] = [
    createStorageFacility('FREEZER_01', 'freezer', '냉동-1', { x: 28, y: 28, width: 132 }),
    createStorageFacility('FREEZER_02', 'freezer', '냉동-2', { x: 170, y: 28, width: 132 }),
    createStorageFacility('FRIDGE_01', 'fridge', '냉장-1', { x: 360, y: 28 }),
    createStorageFacility('FRIDGE_YAK_05', 'fridge', '약청주-5', { x: 490, y: 28 }),
    createStorageFacility('FRIDGE_YAK_04', 'fridge', '약청주-4', { x: 620, y: 28, width: 130 }),
    createStorageFacility('FRIDGE_YAK_03', 'fridge', '약청주-3', { x: 760, y: 28, width: 90 }),
    createStorageFacility('FRIDGE_YAK_02', 'fridge', '약청주-2', { x: 860, y: 28 }),
    createStorageFacility('FRIDGE_YAK_01', 'fridge', '약청주-1', { x: 990, y: 28, width: 160 }),
    createStorageFacility('FRIDGE_LOW_06', 'fridge', '저도주-6', { x: 1160, y: 28, width: 180 }),
    createStorageFacility('RACK_04', 'rack', '렉-4', { x: 28, y: 180 }),
    createStorageFacility('RACK_03', 'rack', '렉-3', { x: 28, y: 360 }),
    createStorageFacility('RACK_02', 'rack', '렉-2', { x: 28, y: 540 }),
    createStorageFacility('RACK_01', 'rack', '렉-1', { x: 28, y: 720 }),
  ];

  const rightWallLabels = [
    '저도주-5',
    '저도주-4',
    '저도주-3',
    '저도주-2',
    '저도주-1',
    '고도주-6',
    '고도주-5',
    '고도주-4',
    '고도주-3',
    '고도주-2',
    '고도주-1',
  ];

  return [
    ...facilities,
    ...rightWallLabels.map((label, index) =>
      createStorageFacility(
        `FRIDGE_RIGHT_${String(index + 1).padStart(2, '0')}`,
        'fridge',
        label,
        { x: 1260, y: 165 + index * 68, width: 110, height: 60 },
      ),
    ),
  ];
}

export function cloneStorageConfiguration(
  storageConfiguration: StorageConfiguration,
): StorageConfiguration {
  return {
    ...storageConfiguration,
    facilities: storageConfiguration.facilities.map((facility) => ({
      ...facility,
      levels: facility.levels.map((level) => ({ ...level })),
    })),
  };
}

export function createDefaultStorageConfiguration(): StorageConfiguration {
  return {
    schemaVersion: 1,
    layoutWidth: STORAGE_LAYOUT_WIDTH,
    layoutHeight: STORAGE_LAYOUT_HEIGHT,
    facilities: createDefaultStorageFacilities(),
  };
}

function createObservedStorageFacility(label: string, index: number): StorageFacility {
  const storageType = getStorageType(label) ?? 'shelf';
  return createStorageFacility(
    `OBSERVED_${encodeURIComponent(label)}`,
    storageType,
    label,
    {
      x: 310 + (index % 6) * 142,
      y: 280 + Math.floor(index / 6) * 120,
      width: storageType === 'rack' ? 130 : 120,
      height: storageType === 'rack' ? 90 : 96,
    },
  );
}

export function addObservedStorageFacilities(
  storageConfiguration: StorageConfiguration,
  observedLabels: string[],
): StorageConfiguration {
  const registeredLabels = new Set(
    storageConfiguration.facilities.flatMap((facility) =>
      facility.label === null ? [] : [facility.label],
    ),
  );
  const missingLabels = [...new Set(observedLabels)].filter(
    (label) => label && !registeredLabels.has(label),
  );

  if (missingLabels.length === 0) return cloneStorageConfiguration(storageConfiguration);

  const clonedConfiguration = cloneStorageConfiguration(storageConfiguration);
  return {
    ...clonedConfiguration,
    facilities: [
      ...clonedConfiguration.facilities,
      ...missingLabels.map(createObservedStorageFacility),
    ],
  };
}

export const DEFAULT_STORAGE_UNITS = createDefaultStorageConfiguration().facilities;
