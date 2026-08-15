'use client';

import { ChevronLeft, ChevronRight, MapPin, X } from 'lucide-react';

import type { ProductSearchResult } from '@/features/inventory/lib/search-products';

interface StorageSearchResultsProps {
  results: ProductSearchResult[];
  totalCount: number;
  page: number;
  pageCount: number;
  selectedProductId: string | null;
  onSelectProduct: (productId: string) => void;
  onPageChange: (page: number) => void;
  onClose: () => void;
}

export function StorageSearchResults({ results, totalCount, page, pageCount, selectedProductId, onSelectProduct, onPageChange, onClose }: StorageSearchResultsProps) {
  return (
    <aside className="flex min-h-0 flex-col border-r border-border bg-surface" aria-label="검색 결과">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <strong className="text-sm">검색 결과 {totalCount.toLocaleString('ko-KR')}건</strong>
        <button type="button" aria-label="검색 결과 닫기" className="flex size-8 items-center justify-center rounded-lg hover:bg-surface-hover focus-visible:outline-3 focus-visible:outline-primary" onClick={onClose}><X aria-hidden="true" size={17} /></button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {results.length ? (
          <ul className="divide-y divide-border">
            {results.map(({ product, matchReason }) => (
              <li key={product.id}>
                <button type="button" aria-pressed={selectedProductId === product.id} className={`w-full px-4 py-3 text-left focus-visible:outline-3 focus-visible:outline-inset focus-visible:outline-primary ${selectedProductId === product.id ? 'bg-primary-soft' : 'hover:bg-surface-hover'}`} onClick={() => onSelectProduct(product.id)}>
                  <span className="block truncate text-xs text-muted-foreground">{product.companyName}</span>
                  <strong className="mt-0.5 block truncate text-sm">{product.productName}</strong>
                  <span className="mt-2 flex items-center justify-between gap-2 text-xs">
                    <span className={`flex min-w-0 items-center gap-1 truncate ${product.placements.length ? 'text-primary' : 'text-warning'}`}><MapPin aria-hidden="true" size={13} /><span className="truncate">{product.location ?? '위치 미지정'}</span></span>
                    <span className="shrink-0 text-muted-foreground">{matchReason}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : <p className="px-5 py-12 text-center text-sm leading-6 text-muted-foreground">조건에 맞는 제품이 없습니다.</p>}
      </div>
      {pageCount > 1 ? (
        <nav className="flex h-12 shrink-0 items-center justify-between border-t border-border px-3" aria-label="검색 결과 페이지">
          <PageButton label="이전" disabled={page === 1} onClick={() => onPageChange(page - 1)} icon={<ChevronLeft size={15} />} />
          <span className="text-xs font-bold tabular-nums">{page} / {pageCount}</span>
          <PageButton label="다음" disabled={page === pageCount} onClick={() => onPageChange(page + 1)} icon={<ChevronRight size={15} />} iconAfter />
        </nav>
      ) : null}
    </aside>
  );
}

function PageButton({ label, disabled, onClick, icon, iconAfter = false }: { label: string; disabled: boolean; onClick: () => void; icon: React.ReactNode; iconAfter?: boolean }) {
  return <button type="button" disabled={disabled} className="flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-bold text-muted-foreground hover:bg-surface-hover disabled:opacity-35" onClick={onClick}>{iconAfter ? null : icon}{label}{iconAfter ? icon : null}</button>;
}
