export const STORAGE_CATEGORIES = ['저도주', '약청주', '고도주', '냉장', '냉동', '렉'] as const;

export type StorageCategory = (typeof STORAGE_CATEGORIES)[number];
export type StorageType = 'fridge' | 'freezer' | 'rack' | 'table' | 'shelf';
export type StorageLocation = `${string}-${number}`;
export type StorageLevelKind = 'shelf' | 'floor' | 'top' | 'bottom';
export type StorageFilter =
  | 'all'
  | 'unassigned'
  | `category:${StorageCategory}`
  | `location:${string}`;

export interface StorageLevel {
  id: string;
  order: number;
  kind: StorageLevelKind;
  slotCount: number;
}

export interface StorageFacility {
  id: string;
  type: StorageType;
  label: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  levels: StorageLevel[];
  needsLevelReview: boolean;
}

export interface StorageConfiguration {
  schemaVersion: 1;
  layoutWidth: number;
  layoutHeight: number;
  facilities: StorageFacility[];
}

export type StorageUnit = StorageFacility;

export function isStorageCategory(value: string): value is StorageCategory {
  return STORAGE_CATEGORIES.some((category) => category === value);
}

export function isStorageLocation(value: string): value is StorageLocation {
  return value === value.trim() && /^[^\s/:\r\n]+-[1-9]\d*$/.test(value);
}

export function getStorageCategory(location: string): StorageCategory | null {
  if (!isStorageLocation(location)) {
    return null;
  }

  const category = location.slice(0, location.lastIndexOf('-'));
  return isStorageCategory(category) ? category : null;
}

export function getStorageType(location: string): StorageType | null {
  const category = getStorageCategory(location);
  const facilityName = location.slice(0, location.lastIndexOf('-'));
  if (category === null) {
    if (facilityName.includes('냉동')) return 'freezer';
    if (facilityName.includes('렉')) return 'rack';
    if (facilityName.includes('테이블')) return 'table';
    if (facilityName.includes('선반')) return 'shelf';
    if (facilityName.includes('냉장')) return 'fridge';
    return null;
  }
  if (category === '냉동') return 'freezer';
  if (category === '렉') return 'rack';
  return 'fridge';
}

export function isStorageFilter(value: string): value is StorageFilter {
  if (value === 'all' || value === 'unassigned') return true;

  const separatorIndex = value.indexOf(':');
  const filterType = value.slice(0, separatorIndex);
  const filterValue = value.slice(separatorIndex + 1);
  return (
    (filterType === 'category' && isStorageCategory(filterValue)) ||
    (filterType === 'location' && isStorageLocation(filterValue))
  );
}

export function sortStorageLocations(locations: string[]): string[] {
  return [...new Set(locations.filter(isStorageLocation))].sort((left, right) => {
    const leftCategory = getStorageCategory(left);
    const rightCategory = getStorageCategory(right);
    const leftCategoryIndex = leftCategory ? STORAGE_CATEGORIES.indexOf(leftCategory) : STORAGE_CATEGORIES.length;
    const rightCategoryIndex = rightCategory ? STORAGE_CATEGORIES.indexOf(rightCategory) : STORAGE_CATEGORIES.length;
    const categoryDifference = leftCategoryIndex - rightCategoryIndex;
    if (categoryDifference !== 0) return categoryDifference;

    if (leftCategory === null || rightCategory === null) {
      const labelDifference = left.localeCompare(right, 'ko-KR', { numeric: true });
      if (labelDifference !== 0) return labelDifference;
    }

    const leftNumber = Number(left.slice(left.lastIndexOf('-') + 1));
    const rightNumber = Number(right.slice(right.lastIndexOf('-') + 1));
    return leftNumber - rightNumber;
  });
}
