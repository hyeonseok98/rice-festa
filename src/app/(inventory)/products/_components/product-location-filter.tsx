import { MapPin } from 'lucide-react';

import {
  isStorageFilter,
  STORAGE_CATEGORIES,
  type StorageFilter,
} from '@/features/inventory/model/storage';

interface ProductLocationFilterProps {
  value: StorageFilter;
  locations: string[];
  onChange: (value: StorageFilter) => void;
}

export function ProductLocationFilter({
  value,
  locations,
  onChange,
}: ProductLocationFilterProps) {
  return (
    <div className="relative w-full sm:w-56">
      <label htmlFor="product-location-filter" className="sr-only">보관위치 필터</label>
      <MapPin
        aria-hidden="true"
        size={18}
        className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground"
      />
      <select
        id="product-location-filter"
        value={value}
        className="h-12 w-full appearance-none rounded-xl border border-border-strong bg-surface pr-10 pl-11 text-sm font-semibold outline-none focus:border-primary focus:ring-3 focus:ring-primary/25"
        onChange={(event) => {
          if (isStorageFilter(event.target.value)) onChange(event.target.value);
        }}
      >
        <option value="all">모든 보관위치</option>
        <option value="unassigned">위치 미지정</option>
        <optgroup label="유형별 보기">
          {STORAGE_CATEGORIES.map((category) => (
            <option key={category} value={`category:${category}`}>{category} 전체</option>
          ))}
        </optgroup>
        <optgroup label="개별 위치 보기">
          {locations.map((location) => (
            <option key={location} value={`location:${location}`}>{location}</option>
          ))}
        </optgroup>
      </select>
      <span aria-hidden="true" className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-xs text-muted-foreground">▼</span>
    </div>
  );
}
