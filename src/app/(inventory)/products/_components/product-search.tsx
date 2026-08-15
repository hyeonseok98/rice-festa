import { Search, X } from 'lucide-react';

interface ProductSearchProps {
  value: string;
  resultCount: number;
  onChange: (value: string) => void;
}

export function ProductSearch({ value, resultCount, onChange }: ProductSearchProps) {
  return (
    <div className="relative w-full md:max-w-110">
      <label htmlFor="product-search" className="sr-only">
        제품명 또는 업체명 검색
      </label>
      <Search
        aria-hidden="true"
        size={20}
        className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground"
      />
      <input
        id="product-search"
        type="search"
        value={value}
        placeholder="제품명 또는 업체명 검색"
        className="h-12 w-full rounded-xl border border-border-strong bg-surface pr-20 pl-12 text-base outline-none transition-shadow placeholder:text-muted-foreground focus:border-primary focus:ring-3 focus:ring-primary/25"
        onChange={(event) => onChange(event.target.value)}
      />
      <span className="absolute top-1/2 right-4 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
        {value ? `${resultCount}건` : ''}
      </span>
      {value ? (
        <button
          type="button"
          aria-label="검색어 지우기"
          className="absolute top-1/2 right-12 flex size-8 -translate-y-1/2 items-center justify-center rounded-full hover:bg-surface-hover focus-visible:outline-3 focus-visible:outline-primary"
          onClick={() => onChange('')}
        >
          <X aria-hidden="true" size={16} />
        </button>
      ) : null}
    </div>
  );
}
