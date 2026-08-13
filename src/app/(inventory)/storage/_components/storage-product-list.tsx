import { AlertCircle, MapPin } from 'lucide-react';

import type { Product } from '@/features/inventory/model/product';

interface StorageProductListProps {
  products: Product[];
  emptyTitle: string;
  onSelectProduct: (productId: string) => void;
}

function formatQuantity(quantity: Product['quantity']): string {
  if (quantity === null) return '미입력';
  return typeof quantity === 'number' ? `${quantity.toLocaleString('ko-KR')}개` : quantity;
}

export function StorageProductList({ products, emptyTitle, onSelectProduct }: StorageProductListProps) {
  if (products.length === 0) {
    return (
      <div className="rounded-2xl bg-surface px-6 py-16 text-center">
        <p className="font-bold">{emptyTitle}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {products.map((product) => (
        <button
          key={product.id}
          type="button"
          className="rounded-2xl border border-border bg-surface p-5 text-left hover:border-primary hover:bg-primary-soft focus-visible:outline-3 focus-visible:outline-primary"
          onClick={() => onSelectProduct(product.id)}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-sm text-muted-foreground">{product.companyName}</p>
              <p className="mt-1 truncate text-lg font-extrabold">{product.productName}</p>
            </div>
            <span className="shrink-0 text-lg font-extrabold tabular-nums">{formatQuantity(product.quantity)}</span>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span className="flex items-center gap-1.5 font-semibold">
              <MapPin aria-hidden="true" size={15} />
              {product.location ?? '위치 미지정'}
            </span>
            <span className="text-muted-foreground">수령일 {product.receivedAt ?? '미입력'}</span>
          </div>
          {product.note ? (
            <p className="mt-3 flex items-start gap-1.5 text-xs leading-5 text-warning">
              <AlertCircle aria-hidden="true" className="mt-0.5 shrink-0" size={14} />
              <span className="line-clamp-2">{product.note}</span>
            </p>
          ) : null}
        </button>
      ))}
    </div>
  );
}
