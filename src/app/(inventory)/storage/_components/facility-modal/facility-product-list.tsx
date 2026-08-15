'use client';

import { MapPin, Pencil, Plus, Trash2 } from 'lucide-react';

import { describeStoragePlacement } from '@/features/inventory/lib/describe-storage-placement';
import type { Product } from '@/features/inventory/model/product';
import type { StorageFacility } from '@/features/inventory/model/storage';

interface FacilityProductListProps {
  facility: StorageFacility;
  products: Product[];
  focusedProductId: string | null;
  onPickProduct: () => void;
  onEditPlacement: (productId: string, placementId: string) => void;
  onRemovePlacement: (productId: string, placementId: string) => void;
  onFocusProduct: (productId: string) => void;
}

export function FacilityProductList({ facility, products, focusedProductId, onPickProduct, onEditPlacement, onRemovePlacement, onFocusProduct }: FacilityProductListProps) {
  return (
    <aside className="flex min-h-0 flex-col border-l border-border bg-surface" aria-label="설비 내 제품">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <div><h3 className="text-sm font-extrabold">이 설비의 제품</h3><p className="mt-0.5 text-xs text-muted-foreground">{products.length}종</p></div>
        <button type="button" className="flex min-h-9 items-center gap-1 rounded-lg bg-primary px-3 text-xs font-bold text-white hover:bg-primary-hover focus-visible:outline-3 focus-visible:outline-primary" onClick={onPickProduct}><Plus aria-hidden="true" size={15} />제품 배치</button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {products.length ? (
          <ul className="space-y-2">
            {products.map((product) => {
              const placements = product.placements.filter((placement) => placement.facilityId === facility.id);
              return (
                <li key={product.id} className={`rounded-xl border p-3 ${focusedProductId === product.id ? 'border-primary bg-primary-soft' : 'border-border'}`}>
                  <button type="button" className="w-full text-left focus-visible:outline-3 focus-visible:outline-primary" onClick={() => onFocusProduct(product.id)}><span className="block truncate text-[11px] text-muted-foreground">{product.companyName}</span><strong className="mt-0.5 block truncate text-sm">{product.productName}</strong></button>
                  <div className="mt-2 space-y-1.5">
                    {placements.map((placement) => (
                      <div key={placement.id} className="flex items-center gap-1.5 rounded-lg bg-surface px-2 py-1.5 text-[11px]">
                        <MapPin className="shrink-0 text-primary" aria-hidden="true" size={13} />
                        <span className="min-w-0 flex-1 truncate">{describeStoragePlacement(placement, facility)}</span>
                        <button type="button" aria-label="위치 수정" className="flex size-7 items-center justify-center rounded-md hover:bg-surface-hover focus-visible:outline-3 focus-visible:outline-primary" onClick={() => onEditPlacement(product.id, placement.id)}><Pencil aria-hidden="true" size={13} /></button>
                        <button type="button" aria-label="위치 삭제" className="flex size-7 items-center justify-center rounded-md text-danger hover:bg-danger-soft focus-visible:outline-3 focus-visible:outline-danger" onClick={() => onRemovePlacement(product.id, placement.id)}><Trash2 aria-hidden="true" size={13} /></button>
                      </div>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : <p className="px-3 py-12 text-center text-sm leading-6 text-muted-foreground">아직 이 설비에 배치된 제품이 없습니다.<br />제품 배치를 눌러 시작할 수 있습니다.</p>}
      </div>
    </aside>
  );
}
