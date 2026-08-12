export const STORAGE_LOCATIONS = [
  '저도주-1',
  '저도주-2',
  '저도주-3',
  '약청주-1',
  '약청주-2',
  '약청주-3',
  '고도주-1',
  '고도주-2',
  '고도주-3',
  '냉장-1',
  '냉동-1',
  '냉동-2',
  '렉-1',
  '렉-2',
  '렉-3',
  '렉-4',
] as const;

export type StorageLocation = (typeof STORAGE_LOCATIONS)[number];

export const STORAGE_CATEGORIES = ['저도주', '약청주', '고도주', '냉장', '냉동', '렉'] as const;

export type StorageCategory = (typeof STORAGE_CATEGORIES)[number];
export type StorageFilter =
  | 'all'
  | 'unassigned'
  | `category:${StorageCategory}`
  | `location:${StorageLocation}`;

export function isStorageLocation(value: string): value is StorageLocation {
  return STORAGE_LOCATIONS.some((location) => location === value);
}

export function isStorageCategory(value: string): value is StorageCategory {
  return STORAGE_CATEGORIES.some((category) => category === value);
}

export function isStorageFilter(value: string): value is StorageFilter {
  if (value === 'all' || value === 'unassigned') {
    return true;
  }

  const [filterType, filterValue] = value.split(':');
  return (
    (filterType === 'category' && isStorageCategory(filterValue)) ||
    (filterType === 'location' && isStorageLocation(filterValue))
  );
}
