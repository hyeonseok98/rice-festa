'use client';

import { Search, SlidersHorizontal, X } from 'lucide-react';

import {
  PRODUCT_CATEGORY_DEFINITIONS,
  type ProductCategory,
} from '@/features/inventory/model/product-category';

import type { ProductDivisionFilter, ProductQueueFilter } from './storage-workbench-types';

interface StorageSearchPanelProps {
  query: string;
  division: ProductDivisionFilter;
  category: ProductCategory | null;
  queue: ProductQueueFilter;
  isActive: boolean;
  onQueryChange: (value: string) => void;
  onDivisionChange: (value: ProductDivisionFilter) => void;
  onCategoryChange: (value: ProductCategory | null) => void;
  onQueueChange: (value: ProductQueueFilter) => void;
  onClear: () => void;
}

const DIVISIONS: Array<{ value: ProductDivisionFilter; label: string }> = [
  { value: 'all', label: '전체' },
  { value: 'traditional-liquor', label: '우리술' },
  { value: 'rice-product', label: '쌀가공식품' },
];

export function StorageSearchPanel({
  query,
  division,
  category,
  queue,
  isActive,
  onQueryChange,
  onDivisionChange,
  onCategoryChange,
  onQueueChange,
  onClear,
}: StorageSearchPanelProps) {
  const categories = PRODUCT_CATEGORY_DEFINITIONS.filter(
    (item) => division === 'all' || item.division === division,
  );

  return (
    <section className="border-b border-border bg-surface px-4 py-3 md:px-5" aria-label="보관 제품 검색">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="relative min-w-0 xl:w-100 xl:shrink-0">
          <Search className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" aria-hidden="true" size={18} />
          <input
            type="text"
            role="searchbox"
            value={query}
            aria-label="제품명 검색"
            placeholder="제품명 검색"
            className="h-11 w-full rounded-xl border border-border-strong bg-surface pr-10 pl-10 text-sm outline-none focus:border-primary focus:ring-3 focus:ring-primary/20"
            onChange={(event) => onQueryChange(event.target.value)}
          />
          {query ? (
            <button type="button" aria-label="검색어 지우기" className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg hover:bg-surface-hover focus-visible:outline-3 focus-visible:outline-primary" onClick={() => onQueryChange('')}>
              <X aria-hidden="true" size={16} />
            </button>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-1 xl:pb-0">
          <SlidersHorizontal className="shrink-0 text-muted-foreground" aria-hidden="true" size={16} />
          <FilterSelect label="분야" value={division} onChange={(value) => onDivisionChange(value as ProductDivisionFilter)} options={DIVISIONS} />
          <FilterSelect label="분류" value={category ?? 'all'} onChange={(value) => onCategoryChange(value === 'all' ? null : value as ProductCategory)} options={[{ value: 'all', label: '모든 분류' }, ...categories.map((item) => ({ value: item.id, label: item.label }))]} />
          <FilterSelect label="상태" value={queue} onChange={(value) => onQueueChange(value as ProductQueueFilter)} options={[{ value: 'all', label: '모든 상태' }, { value: 'unassigned', label: '미배치' }, { value: 'review', label: '확인 필요' }]} />
          {isActive ? <button type="button" className="h-9 shrink-0 rounded-lg px-2.5 text-xs font-bold text-muted-foreground hover:bg-surface-hover hover:text-foreground focus-visible:outline-3 focus-visible:outline-primary" onClick={onClear}>초기화</button> : null}
        </div>
      </div>
    </section>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return (
    <label className="shrink-0">
      <span className="sr-only">{label}</span>
      <select value={value} className="h-9 rounded-lg border border-border bg-surface px-3 text-xs font-semibold outline-none focus:border-primary focus:ring-3 focus:ring-primary/20" onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}
