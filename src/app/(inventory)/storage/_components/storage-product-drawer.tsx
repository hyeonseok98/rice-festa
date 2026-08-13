'use client';

import { useState, type FormEvent } from 'react';

import { getProductReceiptStatus } from '@/features/inventory/lib/get-product-receipt-status';
import type { Product, ProductReceiptStatus } from '@/features/inventory/model/product';
import { useInventorySession } from '@/features/inventory/state/inventory-context';
import { Button } from '@/shared/ui/button';
import { Drawer } from '@/shared/ui/drawer';

interface StorageProductDrawerProps {
  product: Product | null;
  locations: string[];
  onClose: () => void;
}

const STATUS_TEXT: Record<ProductReceiptStatus, string> = {
  'not-received': '미수령',
  unassigned: '수령 완료 · 미배치',
  assigned: '배치 완료',
  review: '정보 확인 필요',
};

function formatQuantity(quantity: Product['quantity']): string {
  if (quantity === null) return '미입력';
  return typeof quantity === 'number' ? `${quantity.toLocaleString('ko-KR')}개` : quantity;
}

export function StorageProductDrawer({ product, locations, onClose }: StorageProductDrawerProps) {
  const { updateLocation } = useInventorySession();
  const [location, setLocation] = useState(() => product?.location ?? '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!product || location === (product.location ?? '')) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await updateLocation(product.id, location || null);
      onClose();
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : '보관위치를 변경하지 못했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer
      isOpen={product !== null}
      title={product?.productName ?? '출품작'}
      description={product?.companyName}
      onClose={onClose}
    >
      {product ? (
        <form className="flex min-h-full flex-col" onSubmit={handleSubmit}>
          <div className="rounded-2xl bg-surface-hover p-5">
            <p className="text-sm font-bold text-primary">{STATUS_TEXT[getProductReceiptStatus(product)]}</p>
            <dl className="mt-4 grid grid-cols-2 gap-5 text-sm">
              <div>
                <dt className="text-muted-foreground">수량</dt>
                <dd className="mt-1 font-extrabold">{formatQuantity(product.quantity)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">수령일</dt>
                <dd className="mt-1 font-extrabold">{product.receivedAt ?? '미입력'}</dd>
              </div>
            </dl>
          </div>

          {product.note ? (
            <div className="mt-5 rounded-xl border border-warning/40 bg-warning-soft p-4">
              <p className="text-xs font-bold text-warning">비고</p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{product.note}</p>
            </div>
          ) : null}

          <div className="mt-7">
            <label htmlFor="storage-product-location" className="block text-sm font-bold">보관위치</label>
            <select
              id="storage-product-location"
              value={location}
              className="mt-2 h-13 w-full rounded-xl border border-border-strong bg-surface px-4 outline-none focus:border-primary focus:ring-3 focus:ring-primary/25"
              onChange={(event) => setLocation(event.target.value)}
            >
              <option value="">위치 미지정</option>
              {locations.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>

          {errorMessage ? (
            <p className="mt-4 rounded-xl bg-danger-soft p-3 text-sm font-semibold text-danger" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <div className="mt-auto grid grid-cols-2 gap-3 border-t border-border pt-5">
            <Button variant="secondary" onClick={onClose}>취소</Button>
            <Button type="submit" disabled={location === (product.location ?? '') || isSubmitting}>
              {isSubmitting ? '변경 중…' : product.location ? '위치 변경' : '이 위치에 배치'}
            </Button>
          </div>
        </form>
      ) : null}
    </Drawer>
  );
}
