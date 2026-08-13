export const STORAGE_CATEGORIES = ['저도주', '약청주', '고도주', '냉장', '냉동', '렉'] as const;

export type StorageCategory = (typeof STORAGE_CATEGORIES)[number];
export type StorageType = 'fridge' | 'freezer' | 'rack';
export type StorageLocation = `${StorageCategory}-${number}`;
export type StorageFilter =
  | 'all'
  | 'unassigned'
  | `category:${StorageCategory}`
  | `location:${string}`;

export interface StorageUnit {
  id: string;
  type: StorageType;
  label: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function isStorageCategory(value: string): value is StorageCategory {
  return STORAGE_CATEGORIES.some((category) => category === value);
}

export function isStorageLocation(value: string): value is StorageLocation {
  const match = value.match(/^(저도주|약청주|고도주|냉장|냉동|렉)-([1-9]\d*)$/);
  return Boolean(match && isStorageCategory(match[1]));
}

export function getStorageCategory(location: string): StorageCategory | null {
  if (!isStorageLocation(location)) {
    return null;
  }

  return location.slice(0, location.lastIndexOf('-')) as StorageCategory;
}

export function getStorageType(location: string): StorageType | null {
  const category = getStorageCategory(location);
  if (category === null) return null;
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
    const categoryDifference =
      STORAGE_CATEGORIES.indexOf(leftCategory ?? '저도주') -
      STORAGE_CATEGORIES.indexOf(rightCategory ?? '저도주');
    if (categoryDifference !== 0) return categoryDifference;

    const leftNumber = Number(left.slice(left.lastIndexOf('-') + 1));
    const rightNumber = Number(right.slice(right.lastIndexOf('-') + 1));
    return leftNumber - rightNumber;
  });
}
