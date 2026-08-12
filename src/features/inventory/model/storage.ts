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

export function isStorageLocation(value: string): value is StorageLocation {
  return STORAGE_LOCATIONS.some((location) => location === value);
}
