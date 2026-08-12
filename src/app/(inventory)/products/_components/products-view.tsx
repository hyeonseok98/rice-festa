'use client';

import { Download, RefreshCw } from 'lucide-react';
import { useRef, useState } from 'react';

import { filterProducts } from '@/features/inventory/lib/filter-products';
import { useInventorySession } from '@/features/inventory/state/inventory-context';
import { Button } from '@/shared/ui/button';

import { ProductDetailDrawer } from './product-detail-drawer';
import { ProductSearch } from './product-search';
import { ProductTable } from './product-table';
import { WorkbookLoader } from './workbook-loader';

export function ProductsView() {
  const {
    status,
    products,
    isDirty,
    changes,
    errorMessage,
    lastSaveMessage,
    loadWorkbook,
    downloadWorkbook,
  } = useInventorySession();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (status !== 'ready' && status !== 'saving') {
    return <WorkbookLoader />;
  }

  const filteredProducts = filterProducts(products, searchQuery);
  const selectedProduct = products.find((product) => product.id === selectedProductId) ?? null;
  const changedProductCount = Object.keys(changes).length;

  return (
    <>
      <section aria-labelledby="products-title">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold text-primary">출품작 목록</p>
            <h1 id="products-title" className="mt-2 text-3xl font-extrabold tracking-tight">
              출품작 {products.length}건
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              제품명을 선택하면 수량과 보관 위치를 변경할 수 있습니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void loadWorkbook(file);
                event.target.value = '';
              }}
            />
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
              <RefreshCw aria-hidden="true" size={17} />
              다른 파일
            </Button>
            <Button
              disabled={!isDirty || status === 'saving'}
              onClick={() => void downloadWorkbook()}
            >
              <Download aria-hidden="true" size={18} />
              {status === 'saving' ? '변경본 생성 중…' : '변경본 다운로드'}
            </Button>
          </div>
        </div>

        <div className="mt-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <ProductSearch
            value={searchQuery}
            resultCount={filteredProducts.length}
            onChange={setSearchQuery}
          />
          <p className={`text-sm font-semibold ${isDirty ? 'text-warning' : 'text-muted-foreground'}`}>
            {isDirty ? `${changedProductCount}건의 변경사항이 저장되지 않았습니다.` : '저장할 변경사항이 없습니다.'}
          </p>
        </div>

        <div className="mt-5">
          <ProductTable products={filteredProducts} onSelectProduct={setSelectedProductId} />
        </div>

        <div className="mt-4 min-h-6 text-sm" aria-live="polite">
          {lastSaveMessage ? <p className="font-semibold text-success">{lastSaveMessage}</p> : null}
          {errorMessage ? <p className="font-semibold text-danger">{errorMessage}</p> : null}
        </div>
      </section>

      <ProductDetailDrawer
        key={selectedProduct?.id ?? 'closed'}
        product={selectedProduct}
        onClose={() => setSelectedProductId(null)}
      />
    </>
  );
}
