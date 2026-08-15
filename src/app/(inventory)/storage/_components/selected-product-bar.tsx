'use client';

import { MapPin, Plus, X } from 'lucide-react';

import { describeStoragePlacement } from '@/features/inventory/lib/describe-storage-placement';
import type { Product } from '@/features/inventory/model/product';
import type { StorageFacility } from '@/features/inventory/model/storage';

interface SelectedProductBarProps {
  product: Product;
  facilities: StorageFacility[];
  onOpenPlacement: (facilityId: string) => void;
  onChooseFacility: () => void;
  onClear: () => void;
}

export function SelectedProductBar({ product, facilities, onOpenPlacement, onChooseFacility, onClear }: SelectedProductBarProps) {
  return (
    <section className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-primary/25 bg-primary-soft px-4 py-2.5 md:px-5" aria-label="선택한 제품">
      <div className="min-w-44">
        <span className="block truncate text-xs text-muted-foreground">{product.companyName}</span>
        <strong className="block truncate text-sm">{product.productName}</strong>
      </div>
      <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
        {product.placements.map((placement) => {
          const facility = facilities.find((item) => item.id === placement.facilityId) ?? null;
          return <button key={placement.id} type="button" className="flex min-h-8 items-center gap-1 rounded-lg border border-primary/25 bg-surface px-2.5 text-xs font-semibold text-primary hover:border-primary focus-visible:outline-3 focus-visible:outline-primary" onClick={() => onOpenPlacement(placement.facilityId)}><MapPin aria-hidden="true" size={13} />{describeStoragePlacement(placement, facility)}</button>;
        })}
        {product.placements.length === 0 ? <span className="self-center text-xs font-semibold text-warning">아직 배치되지 않았습니다.</span> : null}
      </div>
      <button type="button" className="flex min-h-9 items-center gap-1 rounded-lg bg-primary px-3 text-xs font-bold text-white hover:bg-primary-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary" onClick={onChooseFacility}><Plus aria-hidden="true" size={15} />새 위치</button>
      <button type="button" aria-label="제품 선택 해제" className="flex size-9 items-center justify-center rounded-lg hover:bg-primary/10 focus-visible:outline-3 focus-visible:outline-primary" onClick={onClear}><X aria-hidden="true" size={17} /></button>
    </section>
  );
}
