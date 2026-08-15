'use client';

import { DoorOpen } from 'lucide-react';

import { getStorageSummary } from '@/features/inventory/lib/get-storage-summary';
import type { Product } from '@/features/inventory/model/product';
import type { StorageConfiguration, StorageFacility } from '@/features/inventory/model/storage';

import { StorageFacilityCard } from './storage-facility-card';

interface StorageOverviewMapProps {
  configuration: StorageConfiguration;
  products: Product[];
  highlightedFacilityIds: ReadonlySet<string>;
  highlightActive: boolean;
  choosingFacility: boolean;
  onOpenFacility: (facilityId: string) => void;
}

interface FacilityRegions {
  top: StorageFacility[];
  left: StorageFacility[];
  right: StorageFacility[];
  center: StorageFacility[];
}

export function StorageOverviewMap({ configuration, products, highlightedFacilityIds, highlightActive, choosingFacility, onOpenFacility }: StorageOverviewMapProps) {
  const regions = divideFacilities(configuration);
  const renderFacility = (facility: StorageFacility, compact = false) => (
    <StorageFacilityCard
      key={facility.id}
      facility={facility}
      summary={getStorageSummary(products, facility)}
      highlighted={highlightedFacilityIds.has(facility.id)}
      dimmed={highlightActive && !highlightedFacilityIds.has(facility.id)}
      compact={compact}
      onOpen={() => onOpenFacility(facility.id)}
    />
  );

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-[#f4f6f8] p-3 md:p-4" aria-labelledby="storage-map-title">
      <div className="mb-2 flex shrink-0 items-center justify-between gap-3">
        <div><h2 id="storage-map-title" className="text-base font-extrabold">보관실 전체 배치도</h2><p className="mt-0.5 text-xs text-muted-foreground">설비를 누르면 내부 위치가 큰 창으로 열립니다.</p></div>
        {choosingFacility ? <span className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white">새 위치를 배치할 설비를 선택하세요</span> : null}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-y-auto rounded-xl border border-border-strong bg-[#e9edf1] p-2 md:grid-cols-[156px_minmax(300px,1fr)_196px] md:grid-rows-[auto_minmax(0,1fr)] md:overflow-hidden md:p-3">
        <div className="grid gap-1.5 md:col-span-3 md:grid-cols-9">
          {regions.top.map((facility) => renderFacility(facility, true))}
        </div>
        <div className="grid gap-2 md:min-h-0 md:grid-rows-4">
          {regions.left.map((facility) => renderFacility(facility))}
        </div>
        <div className="relative hidden min-h-0 items-center justify-center rounded-xl border border-dashed border-border-strong bg-surface/45 md:flex">
          <div className="text-center text-muted-foreground"><DoorOpen className="mx-auto" aria-hidden="true" size={24} /><span className="mt-1 block text-xs font-bold">입구에서 바라본 정면</span></div>
          {regions.center.length ? <div className="absolute inset-x-4 bottom-4 grid grid-cols-3 gap-2">{regions.center.map((facility) => renderFacility(facility, true))}</div> : null}
        </div>
        <div className="grid gap-1 md:min-h-0 md:grid-rows-11">
          {regions.right.map((facility) => renderFacility(facility, true))}
        </div>
      </div>
    </section>
  );
}

function divideFacilities(configuration: StorageConfiguration): FacilityRegions {
  const topBoundary = configuration.layoutHeight * 0.17;
  const leftBoundary = configuration.layoutWidth * 0.22;
  const rightBoundary = configuration.layoutWidth * 0.78;
  return configuration.facilities.reduce<FacilityRegions>((regions, facility) => {
    if (facility.y <= topBoundary) regions.top.push(facility);
    else if (facility.x <= leftBoundary) regions.left.push(facility);
    else if (facility.x >= rightBoundary) regions.right.push(facility);
    else regions.center.push(facility);
    return regions;
  }, { top: [], left: [], right: [], center: [] });
}
