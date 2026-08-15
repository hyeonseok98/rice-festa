'use client';

import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { createProductSearchIndex } from '@/features/inventory/lib/search-products';
import type { Product } from '@/features/inventory/model/product';

interface FacilityProductPickerProps {
  products: Product[];
  onSelectProduct: (productId: string) => void;
}

export function FacilityProductPicker({ products, onSelectProduct }: FacilityProductPickerProps) {
  const [query, setQuery] = useState('');
  const searchIndex = useMemo(() => createProductSearchIndex(products), [products]);
  const results = useMemo(() => searchIndex.searchProducts(query, 100), [query, searchIndex]);
  return (
    <aside className="flex min-h-0 flex-col border-l border-border bg-surface" aria-label="배치할 제품 선택">
      <div className="shrink-0 border-b border-border p-4">
        <h3 className="text-sm font-extrabold">배치할 제품 선택</h3>
        <div className="relative mt-3"><Search className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" aria-hidden="true" size={17} /><input data-modal-autofocus type="search" value={query} placeholder="제품명 검색" className="h-10 w-full rounded-lg border border-border-strong pr-3 pl-9 text-sm outline-none focus:border-primary focus:ring-3 focus:ring-primary/20" onChange={(event) => setQuery(event.target.value)} /></div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ul className="divide-y divide-border">
          {results.map(({ product, matchReason }) => <li key={product.id}><button type="button" className="w-full px-4 py-3 text-left hover:bg-surface-hover focus-visible:outline-3 focus-visible:outline-inset focus-visible:outline-primary" onClick={() => onSelectProduct(product.id)}><span className="block truncate text-xs text-muted-foreground">{product.companyName}</span><strong className="mt-0.5 block truncate text-sm">{product.productName}</strong><span className="mt-1 block text-[11px] text-muted-foreground">{query ? matchReason : product.location ?? '위치 미지정'}</span></button></li>)}
        </ul>
      </div>
    </aside>
  );
}
