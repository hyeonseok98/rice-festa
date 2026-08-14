'use client';

import { Download, LayoutGrid, MapPin, Search, Settings2, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { filterProducts } from '@/features/inventory/lib/filter-products';
import { getProductReceiptStatus } from '@/features/inventory/lib/get-product-receipt-status';
import { getProductsAtLocation } from '@/features/inventory/lib/get-storage-summary';
import type { ProductReceiptStatus } from '@/features/inventory/model/product';
import { sortStorageLocations, type StorageType } from '@/features/inventory/model/storage';
import { useInventorySession } from '@/features/inventory/state/inventory-context';
import { useStorageLayout } from '@/features/inventory/state/use-storage-layout';
import { Button } from '@/shared/ui/button';

import { StorageDetailDrawer } from './storage-detail-drawer';
import { StorageLayoutEditor } from './storage-layout-editor';
import { StorageMap } from './storage-map';
import { StorageProductDrawer } from './storage-product-drawer';
import { StorageProductList } from './storage-product-list';

type StorageViewMode = 'map' | 'unassigned' | 'review';

export function StorageView() {
  const {
    status,
    products,
    isDirty,
    changes,
    lastSaveMessage,
    downloadWorkbook,
  } = useInventorySession();
  const {
    units,
    moveUnit,
    addUnit,
    updateUnitLabel,
    removeUnit,
    resetLayout,
  } = useStorageLayout();
  const [viewMode, setViewMode] = useState<StorageViewMode>('map');
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [editorUnitId, setEditorUnitId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  if (status !== 'ready' && status !== 'saving') {
    return (
      <section className="mx-auto max-w-180 py-16 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <LayoutGrid aria-hidden="true" size={30} />
        </div>
        <h1 className="mt-6 text-3xl font-extrabold">먼저 Excel을 불러와주세요</h1>
        <p className="mt-3 leading-7 text-muted-foreground">출품작 화면에서 파일을 열면 보관 위치별 현황이 자동으로 만들어집니다.</p>
        <Link
          href="/products"
          className="mt-7 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-bold text-white hover:bg-primary-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          출품작 파일 불러오기
        </Link>
      </section>
    );
  }

  const productsByStatus = products.reduce<Record<ProductReceiptStatus, number>>(
    (counts, product) => {
      counts[getProductReceiptStatus(product)] += 1;
      return counts;
    },
    { 'not-received': 0, unassigned: 0, assigned: 0, review: 0 },
  );
  const unassignedProducts = products.filter(
    (product) => getProductReceiptStatus(product) === 'unassigned',
  );
  const reviewProducts = products.filter(
    (product) => getProductReceiptStatus(product) === 'review',
  );
  const searchResults = filterProducts(products, searchQuery);
  const highlightedLocations = new Set(
    searchQuery
      ? searchResults.flatMap((product) =>
          product.placements.map((placement) => placement.facilityLabel),
        )
      : [],
  );
  const availableLocations = sortStorageLocations(
    units.flatMap((unit) => (unit.label ? [unit.label] : [])),
  );
  const selectedUnit = units.find((unit) => unit.id === selectedUnitId) ?? null;
  const editorUnit = units.find((unit) => unit.id === editorUnitId) ?? null;
  const selectedProduct = products.find((product) => product.id === selectedProductId) ?? null;
  const editorUnitProductCount = editorUnit?.label
    ? getProductsAtLocation(products, editorUnit.label).length
    : 0;

  const handleSelectUnit = (unitId: string) => {
    if (isEditingLayout) {
      setEditorUnitId(unitId);
      return;
    }
    setSelectedUnitId(unitId);
  };

  const handleAddUnit = async (type: StorageType) => {
    const unitId = await addUnit(type);
    if (unitId) setEditorUnitId(unitId);
  };

  const handleRenameUnit = async (unitId: string, nextLabel: string | null) => {
    const unit = units.find((item) => item.id === unitId);
    if (!unit || unit.label === nextLabel) return;
    const storedProducts = unit.label ? getProductsAtLocation(products, unit.label) : [];
    if (
      storedProducts.length > 0 &&
      !window.confirm(`${storedProducts.length}개 출품작의 Excel 보관위치를 ${nextLabel}(으)로 변경할까요?`)
    ) {
      return;
    }
    await updateUnitLabel(unitId, nextLabel);
  };

  const handleRemoveUnit = async (unitId: string) => {
    if (!window.confirm('선택한 설비를 배치도에서 삭제할까요?')) return;
    await removeUnit(unitId);
    setEditorUnitId(null);
  };

  const handleResetLayout = async () => {
    if (!window.confirm('설비 위치와 미지정 설비를 기본 배치로 되돌릴까요?')) return;
    await resetLayout();
    setEditorUnitId(null);
  };

  const visibleListProducts = viewMode === 'unassigned' ? unassignedProducts : reviewProducts;

  return (
    <>
      <section aria-labelledby="storage-title">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-bold text-primary">보관 위치</p>
            <h1 id="storage-title" className="mt-2 text-3xl font-extrabold tracking-tight">어디에 무엇이 있는지 한눈에</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">제품이나 업체를 검색하면 해당 보관 설비를 지도에서 강조합니다.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setIsEditingLayout((current) => !current);
                setViewMode('map');
                setSelectedUnitId(null);
              }}
            >
              <Settings2 aria-hidden="true" size={17} />
              {isEditingLayout ? '배치 편집 종료' : '배치 편집'}
            </Button>
            <Button disabled={!isDirty || status === 'saving'} onClick={() => void downloadWorkbook()}>
              <Download aria-hidden="true" size={17} />
              {status === 'saving' ? '저장 중…' : 'Excel 저장'}
            </Button>
          </div>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatusCard label="수령 완료" value={productsByStatus.assigned + productsByStatus.unassigned} tone="primary" />
          <StatusCard label="배치 완료" value={productsByStatus.assigned} tone="success" />
          <StatusCard label="미배치" value={productsByStatus.unassigned} tone="warning" onClick={() => setViewMode('unassigned')} />
          <StatusCard label="확인 필요" value={productsByStatus.review} tone="danger" onClick={() => setViewMode('review')} />
        </div>

        <div className="relative mt-7 max-w-180">
          <label htmlFor="storage-search" className="sr-only">제품명 또는 업체명 검색</label>
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground" size={21} />
          <input
            id="storage-search"
            type="search"
            value={searchQuery}
            placeholder="제품명, 업체명, 식품유형, 위치, 비고 검색"
            className="h-14 w-full rounded-2xl border border-border-strong bg-surface pr-14 pl-12 text-base outline-none focus:border-primary focus:ring-3 focus:ring-primary/25"
            onChange={(event) => {
              setSearchQuery(event.target.value);
              if (event.target.value) setViewMode('map');
            }}
          />
          {searchQuery ? (
            <button
              type="button"
              aria-label="검색어 지우기"
              className="absolute top-1/2 right-3 flex size-10 -translate-y-1/2 items-center justify-center rounded-full hover:bg-surface-hover focus-visible:outline-3 focus-visible:outline-primary"
              onClick={() => setSearchQuery('')}
            >
              <X aria-hidden="true" size={18} />
            </button>
          ) : null}
        </div>

        {searchQuery ? (
          <div className="mt-4 rounded-2xl border border-border bg-surface p-4" aria-live="polite">
            <p className="px-1 text-sm font-bold">검색 결과 {searchResults.length}건</p>
            {searchResults.length > 0 ? (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {searchResults.slice(0, 10).map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    className="min-w-60 rounded-xl border border-border px-4 py-3 text-left hover:border-primary hover:bg-primary-soft focus-visible:outline-3 focus-visible:outline-primary"
                    onClick={() => setSelectedProductId(product.id)}
                  >
                    <p className="truncate text-xs text-muted-foreground">{product.companyName}</p>
                    <p className="mt-1 truncate font-bold">{product.productName}</p>
                    <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-primary">
                      <MapPin aria-hidden="true" size={13} /> {product.location ?? '위치 미지정'}
                    </p>
                  </button>
                ))}
              </div>
            ) : <p className="mt-3 px-1 text-sm text-muted-foreground">일치하는 출품작이 없습니다.</p>}
          </div>
        ) : null}

        <div className="mt-7 flex gap-6 border-b border-border" role="tablist" aria-label="보관 위치 보기">
          <ViewTab label="배치도" count={units.length} selected={viewMode === 'map'} onClick={() => setViewMode('map')} />
          <ViewTab label="미배치" count={unassignedProducts.length} selected={viewMode === 'unassigned'} onClick={() => setViewMode('unassigned')} />
          <ViewTab label="확인 필요" count={reviewProducts.length} selected={viewMode === 'review'} onClick={() => setViewMode('review')} />
        </div>

        {viewMode === 'map' ? (
          <div className={`mt-5 grid gap-5 ${isEditingLayout ? 'xl:grid-cols-[minmax(0,1fr)_330px]' : ''}`}>
            <div className="min-w-0">
              {isEditingLayout ? (
                <p className="mb-3 rounded-xl bg-primary-soft px-4 py-3 text-sm font-semibold text-primary">
                  설비를 드래그하거나 선택 후 방향키로 이동할 수 있습니다. Shift+방향키는 10px씩 이동합니다.
                </p>
              ) : null}
              <StorageMap
                units={units}
                products={products}
                isEditing={isEditingLayout}
                highlightedLocations={highlightedLocations}
                hasSearchQuery={Boolean(searchQuery)}
                onSelectUnit={handleSelectUnit}
                onMoveUnit={moveUnit}
              />
            </div>
            {isEditingLayout ? (
              <StorageLayoutEditor
                key={editorUnit?.id ?? 'no-selected-unit'}
                selectedUnit={editorUnit}
                storedProductCount={editorUnitProductCount}
                onAddUnit={handleAddUnit}
                onRenameUnit={handleRenameUnit}
                onRemoveUnit={handleRemoveUnit}
                onResetLayout={handleResetLayout}
              />
            ) : null}
          </div>
        ) : (
          <div className="mt-5">
            <StorageProductList
              products={visibleListProducts}
              emptyTitle={viewMode === 'unassigned' ? '배치할 제품이 없습니다' : '확인할 제품이 없습니다'}
              onSelectProduct={setSelectedProductId}
            />
          </div>
        )}

        <div className="mt-4 min-h-6 text-sm" aria-live="polite">
          {isDirty ? <p className="font-semibold text-warning">{Object.keys(changes).length}건의 Excel 변경사항이 저장되지 않았습니다.</p> : null}
          {lastSaveMessage ? <p className="font-semibold text-success">{lastSaveMessage}</p> : null}
        </div>
      </section>

      <StorageDetailDrawer
        unit={selectedUnit}
        products={products}
        onClose={() => setSelectedUnitId(null)}
        onSelectProduct={(productId) => {
          setSelectedUnitId(null);
          setSelectedProductId(productId);
        }}
      />
      <StorageProductDrawer
        key={selectedProduct?.id ?? 'closed'}
        product={selectedProduct}
        locations={availableLocations}
        onClose={() => setSelectedProductId(null)}
      />
    </>
  );
}

interface StatusCardProps {
  label: string;
  value: number;
  tone: 'primary' | 'success' | 'warning' | 'danger';
  onClick?: () => void;
}

function StatusCard({ label, value, tone, onClick }: StatusCardProps) {
  const toneClass = {
    primary: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
  }[tone];
  const className = `rounded-2xl border border-border bg-surface p-5 text-left ${onClick ? 'hover:border-primary focus-visible:outline-3 focus-visible:outline-primary' : ''}`;
  const content = <><p className="text-sm font-semibold text-muted-foreground">{label}</p><p className={`mt-2 text-3xl font-extrabold tabular-nums ${toneClass}`}>{value}</p></>;
  return onClick ? <button type="button" className={className} onClick={onClick}>{content}</button> : <div className={className}>{content}</div>;
}

interface ViewTabProps {
  label: string;
  count: number;
  selected: boolean;
  onClick: () => void;
}

function ViewTab({ label, count, selected, onClick }: ViewTabProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      className={`-mb-px flex min-h-12 items-center gap-2 border-b-3 px-1 text-base font-extrabold focus-visible:rounded focus-visible:outline-3 focus-visible:outline-primary ${selected ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
      onClick={onClick}
    >
      {label}<span className="rounded-full bg-surface-hover px-2 py-0.5 text-xs tabular-nums">{count}</span>
    </button>
  );
}
