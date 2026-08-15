'use client';

import { RefreshCw } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

import { filterProductsByStorage } from '@/features/inventory/lib/filter-products-by-storage';
import { filterProducts } from '@/features/inventory/lib/filter-products';
import { sortStorageLocations, type StorageFilter } from '@/features/inventory/model/storage';
import { useInventorySession } from '@/features/inventory/state/inventory-context';
import { Button } from '@/shared/ui/button';
import { PageHeader } from '@/shared/ui/page-header';

import { ProductDetailDrawer } from './product-detail-drawer';
import { ProductLocationFilter } from './product-location-filter';
import { ProductSearch } from './product-search';
import { ProductTable } from './product-table';
import { WorkbookLoader } from './workbook-loader';

type ProductScope = 'all' | 'new';

interface ProductScopeSelection {
  comparisonId: number;
  scope: ProductScope;
}

export function ProductsView() {
  const {
    status,
    products,
    workbookWarnings,
    previousFileName,
    newProductIds,
    comparisonId,
    loadWorkbook,
    selectWorkbookFile,
  } = useInventorySession();
  const [searchQuery, setSearchQuery] = useState('');
  const [storageFilter, setStorageFilter] = useState<StorageFilter>('all');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [productScopeSelection, setProductScopeSelection] = useState<ProductScopeSelection>({
    comparisonId: -1,
    scope: 'all',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const newProductIdSet = useMemo(() => new Set(newProductIds), [newProductIds]);
  const availableLocations = useMemo(
    () =>
      sortStorageLocations(
        products.flatMap((product) =>
          product.placements.map((placement) => placement.facilityLabel),
        ),
      ),
    [products],
  );

  if (status !== 'ready' && status !== 'saving') {
    return <WorkbookLoader />;
  }

  const productScope: ProductScope =
    comparisonId !== null && productScopeSelection.comparisonId === comparisonId
      ? productScopeSelection.scope
      : previousFileName
        ? 'new'
        : 'all';
  const scopedProducts =
    productScope === 'new' && previousFileName
      ? products.filter((product) => newProductIdSet.has(product.id))
      : products;
  const locationFilteredProducts = filterProductsByStorage(scopedProducts, storageFilter);
  const filteredProducts = filterProducts(locationFilteredProducts, searchQuery);
  const selectedProduct = products.find((product) => product.id === selectedProductId) ?? null;
  return (
    <>
      <section aria-labelledby="products-title">
        <PageHeader
          title="출품작"
          countLabel={`${products.length.toLocaleString('ko-KR')}건`}
          description="업체, 제품, 수령일과 보관 상태를 확인하고 필요한 정보를 수정합니다."
          titleId="products-title"
          actions={
            <>
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
            <Button
              variant="secondary"
              onClick={() => {
                void selectWorkbookFile().then((pickerStatus) => {
                  if (pickerStatus === 'unsupported') fileInputRef.current?.click();
                });
              }}
            >
              <RefreshCw aria-hidden="true" size={17} />
              새 Excel과 비교
            </Button>
            </>
          }
        />

        {previousFileName ? (
          <div className="mt-6 rounded-2xl border border-primary bg-primary-soft p-5">
            <p className="font-extrabold">신규 출품작 {newProductIds.length}건을 찾았습니다</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              <span className="font-semibold text-foreground">{previousFileName}</span>과 비교한 결과입니다.
              수량, 수령일, 위치와 비고 변경은 신규로 보지 않습니다.
            </p>
          </div>
        ) : null}

        {workbookWarnings.length > 0 ? (
          <div className="mt-5 border-l-3 border-warning bg-warning-soft px-4 py-3" role="status">
            <p className="text-sm font-bold text-warning">Excel 설정 확인</p>
            {workbookWarnings.map((warningMessage) => (
              <p key={warningMessage} className="mt-1 text-sm leading-6 text-foreground">
                {warningMessage}
              </p>
            ))}
          </div>
        ) : null}

        <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex w-full flex-col gap-3 sm:flex-row md:max-w-170">
            <ProductSearch
              value={searchQuery}
              resultCount={filteredProducts.length}
              onChange={setSearchQuery}
            />
            <ProductLocationFilter
              value={storageFilter}
              locations={availableLocations}
              onChange={setStorageFilter}
            />
          </div>
        </div>

        {previousFileName && comparisonId !== null ? (
          <div
            className="mt-6 flex gap-6 border-b border-border"
            role="group"
            aria-label="출품작 목록 구분"
          >
            <button
              type="button"
              aria-pressed={productScope === 'all'}
              className={`-mb-px flex min-h-12 items-center gap-2 border-b-3 px-1 text-base font-extrabold focus-visible:rounded focus-visible:outline-3 focus-visible:outline-primary ${
                productScope === 'all'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setProductScopeSelection({ comparisonId, scope: 'all' })}
            >
              전체
              <span className="rounded-full bg-surface-hover px-2 py-0.5 text-xs tabular-nums">
                {products.length}
              </span>
            </button>
            <button
              type="button"
              aria-pressed={productScope === 'new'}
              className={`-mb-px flex min-h-12 items-center gap-2 border-b-3 px-1 text-base font-extrabold focus-visible:rounded focus-visible:outline-3 focus-visible:outline-primary ${
                productScope === 'new'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setProductScopeSelection({ comparisonId, scope: 'new' })}
            >
              신규
              <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs text-success tabular-nums">
                {newProductIds.length}
              </span>
            </button>
          </div>
        ) : null}

        <div className={previousFileName ? 'mt-4' : 'mt-5'}>
          <ProductTable
            products={filteredProducts}
            newProductIds={newProductIdSet}
            emptyTitle={
              !searchQuery && storageFilter !== 'all'
                ? '해당 보관위치의 출품작이 없습니다'
                : productScope === 'new' && !searchQuery
                  ? '새로 추가된 출품작이 없습니다'
                  : undefined
            }
            emptyDescription={
              !searchQuery && storageFilter !== 'all'
                ? '다른 보관위치를 선택해 주세요.'
                : productScope === 'new' && !searchQuery
                  ? '직전 파일과 출품작 구성이 같습니다.'
                  : undefined
            }
            onSelectProduct={setSelectedProductId}
          />
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
