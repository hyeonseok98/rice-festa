'use client';

import { LayoutGrid, Settings2 } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { useInventorySession } from '@/features/inventory/state/inventory-context';
import { Button } from '@/shared/ui/button';
import { PageHeader } from '@/shared/ui/page-header';

import { useFacilityDialog } from '../_hooks/use-facility-dialog';
import { useStorageSearch } from '../_hooks/use-storage-search';
import { getHighlightedFacilityIds } from '../_lib/storage-selectors';
import { FacilityModal } from './facility-modal/facility-modal';
import { StorageLayoutEditorModal } from './layout-editor/storage-layout-editor-modal';
import { SelectedProductBar } from './selected-product-bar';
import { StorageOverviewMap } from './storage-overview-map';
import { StorageSearchPanel } from './storage-search-panel';
import { StorageSearchResults } from './storage-search-results';

export function StorageView() {
  const inventory = useInventorySession();
  const search = useStorageSearch(inventory.products);
  const dialog = useFacilityDialog();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [isChoosingFacility, setIsChoosingFacility] = useState(false);
  const [isLayoutEditorOpen, setIsLayoutEditorOpen] = useState(false);
  const selectedProduct = inventory.products.find((product) => product.id === selectedProductId) ?? null;
  const highlightedFacilityIds = useMemo(
    () => getHighlightedFacilityIds(
      selectedProduct ? [selectedProduct] : search.isActive ? search.results.map((result) => result.product) : [],
    ),
    [search.isActive, search.results, selectedProduct],
  );
  const dialogFacilityId = dialog.state.kind === 'closed' ? null : dialog.state.facilityId;
  const dialogFacility = inventory.storageConfiguration.facilities.find((facility) => facility.id === dialogFacilityId) ?? null;

  if (inventory.status !== 'ready' && inventory.status !== 'saving') return <EmptyStorageView />;

  const selectProduct = (productId: string) => {
    setSelectedProductId((current) => current === productId ? null : productId);
    setIsChoosingFacility(false);
  };
  const openFacility = (facilityId: string) => {
    if (isChoosingFacility && selectedProductId) {
      dialog.startPlacement(facilityId, selectedProductId);
      setIsChoosingFacility(false);
      return;
    }
    dialog.openBrowse(facilityId, selectedProductId);
  };
  const editPlacement = (facilityId: string, productId: string, placementId: string) => {
    const placement = inventory.products.find((product) => product.id === productId)?.placements.find((item) => item.id === placementId);
    if (placement) dialog.editPlacement(facilityId, productId, placement);
  };

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface" aria-labelledby="storage-title">
      <PageHeader title="보관 위치" countLabel={`${inventory.products.length.toLocaleString('ko-KR')}종`} description="제품을 찾거나 설비를 열어 실제 선반 위치를 확인하고 배치합니다." titleId="storage-title" variant="workspace" actions={<Button variant="secondary" className="min-h-10 px-3" onClick={() => setIsLayoutEditorOpen(true)}><Settings2 aria-hidden="true" size={16} />설비 편집</Button>} />
      <StorageSearchPanel query={search.query} division={search.division} category={search.category} queue={search.queue} isActive={search.isActive} onQueryChange={search.setQuery} onDivisionChange={search.setDivision} onCategoryChange={search.setCategory} onQueueChange={search.setQueue} onClear={search.clear} />
      {selectedProduct ? <SelectedProductBar product={selectedProduct} facilities={inventory.storageConfiguration.facilities} onOpenPlacement={(facilityId) => dialog.openBrowse(facilityId, selectedProduct.id)} onChooseFacility={() => setIsChoosingFacility(true)} onClear={() => { setSelectedProductId(null); setIsChoosingFacility(false); }} /> : null}

      <div className={`grid min-h-0 flex-1 overflow-hidden ${search.isActive ? 'grid-rows-[minmax(220px,0.8fr)_minmax(320px,1.2fr)] md:grid-cols-[320px_minmax(0,1fr)] md:grid-rows-1' : 'grid-cols-1'}`}>
        {search.isActive ? <StorageSearchResults results={search.visibleResults} totalCount={search.results.length} page={search.currentPage} pageCount={search.pageCount} selectedProductId={selectedProductId} onSelectProduct={selectProduct} onPageChange={search.setPage} onClose={search.clear} /> : null}
        <StorageOverviewMap configuration={inventory.storageConfiguration} products={inventory.products} highlightedFacilityIds={highlightedFacilityIds} highlightActive={Boolean(selectedProduct || search.isActive)} choosingFacility={isChoosingFacility} onOpenFacility={openFacility} />
      </div>

      {dialog.state.kind !== 'closed' && dialogFacility ? <FacilityModal state={dialog.state} facility={dialogFacility} products={inventory.products} selectedProductId={selectedProductId} onClose={dialog.close} onBrowse={dialog.openBrowse} onPickProduct={dialog.pickProduct} onStartPlacement={dialog.startPlacement} onEditPlacement={editPlacement} onSelectSlot={dialog.selectSlot} onDraftChange={dialog.updateDraft} onSavePlacement={inventory.saveProductPlacement} onClearPlacementPosition={inventory.clearProductPlacementPosition} onRemovePlacement={inventory.removeProductPlacement} /> : null}
      {isLayoutEditorOpen ? <StorageLayoutEditorModal onClose={() => setIsLayoutEditorOpen(false)} /> : null}
    </section>
  );
}

function EmptyStorageView() {
  return (
    <section className="mx-auto max-w-180 py-16 text-center">
      <div className="mx-auto flex size-16 items-center justify-center rounded-xl bg-primary-soft text-primary"><LayoutGrid aria-hidden="true" size={30} /></div>
      <h1 className="mt-6 text-3xl font-extrabold">먼저 Excel을 불러와주세요</h1>
      <p className="mt-3 leading-7 text-muted-foreground">출품작 화면에서 파일을 열면 보관 위치 작업 화면이 만들어집니다.</p>
      <Link href="/products" className="mt-7 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-bold text-white hover:bg-primary-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary">출품작 파일 불러오기</Link>
    </section>
  );
}
