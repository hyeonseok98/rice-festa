import type { StorageType, StorageUnit } from './storage';

function createUnit(
  id: string,
  type: StorageType,
  label: string | null,
  x: number,
  y: number,
): StorageUnit {
  return {
    id,
    type,
    label,
    x,
    y,
    width: type === 'rack' ? 110 : 130,
    height: type === 'rack' ? 76 : 96,
  };
}

export const DEFAULT_STORAGE_UNITS: StorageUnit[] = [
  createUnit('FREEZER_01', 'freezer', '냉동-1', 28, 28),
  createUnit('FREEZER_02', 'freezer', '냉동-2', 180, 28),
  createUnit('FRIDGE_01', 'fridge', '냉장-1', 584, 28),
  createUnit('FRIDGE_04', 'fridge', '약청주-3', 736, 28),
  createUnit('FRIDGE_03', 'fridge', '약청주-2', 888, 28),
  createUnit('FRIDGE_02', 'fridge', '약청주-1', 1040, 28),
  createUnit('RACK_04', 'rack', '렉-4', 28, 164),
  createUnit('RACK_03', 'rack', '렉-3', 28, 260),
  createUnit('RACK_02', 'rack', '렉-2', 28, 356),
  createUnit('RACK_01', 'rack', '렉-1', 28, 452),
  createUnit('FRIDGE_07', 'fridge', '저도주-3', 1040, 145),
  createUnit('FRIDGE_06', 'fridge', '저도주-2', 1040, 249),
  createUnit('FRIDGE_05', 'fridge', '저도주-1', 1040, 353),
  createUnit('FRIDGE_10', 'fridge', '고도주-3', 1040, 457),
  createUnit('FRIDGE_09', 'fridge', '고도주-2', 1040, 561),
  createUnit('FRIDGE_08', 'fridge', '고도주-1', 1040, 665),
  createUnit('FRIDGE_11', 'fridge', null, 220, 180),
  createUnit('FRIDGE_12', 'fridge', null, 372, 180),
  createUnit('FRIDGE_13', 'fridge', null, 524, 180),
  createUnit('FRIDGE_14', 'fridge', null, 676, 180),
  createUnit('FRIDGE_15', 'fridge', null, 220, 310),
  createUnit('FRIDGE_16', 'fridge', null, 372, 310),
  createUnit('FRIDGE_17', 'fridge', null, 524, 310),
  createUnit('FRIDGE_18', 'fridge', null, 676, 310),
];

export const STORAGE_LAYOUT_WIDTH = 1200;
export const STORAGE_LAYOUT_HEIGHT = 780;
