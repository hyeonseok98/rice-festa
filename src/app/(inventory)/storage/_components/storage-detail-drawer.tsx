'use client';

import { PackageOpen } from 'lucide-react';

import { getProductsAtLocation, getStorageSummary } from '@/features/inventory/lib/get-storage-summary';
import type { Product } from '@/features/inventory/model/product';
import type { StorageUnit } from '@/features/inventory/model/storage';
import { Drawer } from '@/shared/ui/drawer';

interface StorageDetailDrawerProps {
  unit: StorageUnit | null;
  products: Product[];
  onClose: () => void;
  onSelectProduct: (productId: string) => void;
}

function formatQuantity(quantity: Product['quantity']): string {
  if (quantity === null) return '미입력';
  return typeof quantity === 'number' ? `${quantity.toLocaleString('ko-KR')}개` : quantity;
}

export function StorageDetailDrawer({
  unit,
  products,
  onClose,
  onSelectProduct,
}: StorageDetailDrawerProps) {
  const storedProducts = unit?.label ? getProductsAtLocation(products, unit.label) : [];
  const summary = unit ? getStorageSummary(products, unit) : null;

  return (
    <Drawer
      isOpen={unit !== null}
      title={unit?.label ?? '이름 없는 설비'}
      description={
        unit && summary
          ? `${summary.productCount}종 · 숫자 수량 ${summary.numericQuantity.toLocaleString('ko-KR')}개${summary.hasTextQuantity ? ' + 별도 단위' : ''}`
          : undefined
      }
      onClose={onClose}
    >
      {storedProducts.length === 0 ? (
        <div className="py-16 text-center">
          <PackageOpen aria-hidden="true" className="mx-auto text-muted-foreground" size={36} />
          <p className="mt-4 font-bold">보관 중인 출품작이 없습니다</p>
          <p className="mt-2 text-sm text-muted-foreground">
            미배치 목록에서 이 위치로 제품을 배치할 수 있습니다.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {storedProducts.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                className="w-full rounded-2xl border border-border p-4 text-left hover:border-primary hover:bg-primary-soft focus-visible:outline-3 focus-visible:outline-primary"
                onClick={() => onSelectProduct(product.id)}
              >
                <p className="text-sm text-muted-foreground">{product.companyName}</p>
                <div className="mt-1 flex items-start justify-between gap-4">
                  <strong>{product.productName}</strong>
                  <span className="shrink-0 font-extrabold tabular-nums">{formatQuantity(product.quantity)}</span>
                </div>
                {product.note ? (
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-warning">비고 · {product.note}</p>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Drawer>
  );
}
