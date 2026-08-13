'use client';

import { useMemo, useState, type FormEvent } from 'react';

import { getProductReceiptStatus } from '@/features/inventory/lib/get-product-receipt-status';
import { parseProductQuantityInput } from '@/features/inventory/lib/update-product-quantity';
import type { Product, ProductReceiptStatus } from '@/features/inventory/model/product';
import { sortStorageLocations } from '@/features/inventory/model/storage';
import { useInventorySession } from '@/features/inventory/state/inventory-context';
import { useStorageLayout } from '@/features/inventory/state/use-storage-layout';
import { Button } from '@/shared/ui/button';
import { Drawer } from '@/shared/ui/drawer';

interface ProductDetailDrawerProps {
  product: Product | null;
  onClose: () => void;
}

const STATUS_TEXT: Record<ProductReceiptStatus, string> = {
  'not-received': '미수령',
  unassigned: '수령 완료 · 미배치',
  assigned: '배치 완료',
  review: '정보 확인 필요',
};

function formatQuantity(quantity: Product['quantity']): string {
  if (quantity === null) return '';
  return typeof quantity === 'number' ? String(quantity) : quantity;
}

export function ProductDetailDrawer({ product, onClose }: ProductDetailDrawerProps) {
  const {
    products,
    updateQuantity,
    updateLocation,
    updateReceivedAt,
    updateNote,
  } = useInventorySession();
  const observedLocations = useMemo(
    () => products.flatMap((item) => (item.location ? [item.location] : [])),
    [products],
  );
  const { units } = useStorageLayout(observedLocations);
  const availableLocations = useMemo(
    () => sortStorageLocations(units.flatMap((unit) => (unit.label ? [unit.label] : []))),
    [units],
  );
  const [quantityInput, setQuantityInput] = useState(() => formatQuantity(product?.quantity ?? null));
  const [location, setLocation] = useState(() => product?.location ?? '');
  const [receivedAt, setReceivedAt] = useState(() => product?.receivedAt ?? '');
  const [note, setNote] = useState(() => product?.note ?? '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nextQuantity = parseProductQuantityInput(quantityInput);
  const nextLocation = location || null;
  const nextReceivedAt = receivedAt.trim() || null;
  const nextNote = note.trim() || null;
  const hasQuantityChange = product ? nextQuantity !== product.quantity : false;
  const hasLocationChange = product ? nextLocation !== product.location : false;
  const hasReceivedAtChange = product ? nextReceivedAt !== product.receivedAt : false;
  const hasNoteChange = product ? nextNote !== product.note : false;
  const hasChanges =
    hasQuantityChange || hasLocationChange || hasReceivedAtChange || hasNoteChange;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!product || !hasChanges) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      if (hasQuantityChange) await updateQuantity(product.id, nextQuantity);
      if (hasReceivedAtChange) await updateReceivedAt(product.id, nextReceivedAt);
      if (hasLocationChange) await updateLocation(product.id, nextLocation);
      if (hasNoteChange) await updateNote(product.id, nextNote);
      onClose();
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : '변경사항을 적용하지 못했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer
      isOpen={product !== null}
      title={product?.productName ?? '출품작 상세'}
      description={product ? `${product.companyName} · ${product.foodType}` : undefined}
      onClose={onClose}
    >
      {product ? (
        <form className="flex min-h-full flex-col" onSubmit={handleSubmit}>
          <div className="mb-6 flex items-center justify-between rounded-xl bg-surface-hover px-4 py-3">
            <span className="text-sm text-muted-foreground">현재 상태</span>
            <span className="text-sm font-extrabold">{STATUS_TEXT[getProductReceiptStatus(product)]}</span>
          </div>

          <dl className="grid grid-cols-2 gap-x-5 gap-y-6 border-b border-border pb-7 text-sm">
            <div>
              <dt className="text-muted-foreground">구분</dt>
              <dd className="mt-1 font-bold">
                {product.division === 'traditional-liquor' ? '우리술' : '쌀가공식품'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">에탄올 함량</dt>
              <dd className="mt-1 font-bold">
                {product.ethanolPercent === null ? '-' : `${product.ethanolPercent}%`}
              </dd>
            </div>
          </dl>

          <div className="space-y-6 py-7">
            <div>
              <label htmlFor="product-quantity" className="block text-sm font-bold">수량</label>
              <input
                id="product-quantity"
                type="text"
                value={quantityInput}
                placeholder="예: 8 또는 5박스"
                className="mt-2 h-13 w-full rounded-xl border border-border-strong bg-surface px-4 text-lg font-bold outline-none focus:border-primary focus:ring-3 focus:ring-primary/25"
                onChange={(event) => setQuantityInput(event.target.value)}
              />
              {hasQuantityChange ? (
                <p className="mt-2 text-sm font-semibold text-primary" aria-live="polite">
                  {formatQuantity(product.quantity) || '미입력'} → {quantityInput.trim() || '미입력'}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="product-received-at" className="block text-sm font-bold">수령일</label>
              <input
                id="product-received-at"
                type="text"
                inputMode="numeric"
                value={receivedAt}
                placeholder="YYYY-MM-DD"
                className="mt-2 h-13 w-full rounded-xl border border-border-strong bg-surface px-4 font-semibold outline-none focus:border-primary focus:ring-3 focus:ring-primary/25"
                onChange={(event) => setReceivedAt(event.target.value)}
              />
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                새로 입력하거나 변경할 때는 YYYY-MM-DD 형식을 사용해주세요.
              </p>
            </div>

            <div>
              <label htmlFor="product-location" className="block text-sm font-bold">보관 위치</label>
              <select
                id="product-location"
                value={location}
                className="mt-2 h-13 w-full rounded-xl border border-border-strong bg-surface px-4 outline-none focus:border-primary focus:ring-3 focus:ring-primary/25"
                onChange={(event) => setLocation(event.target.value)}
              >
                <option value="">위치 미지정</option>
                {availableLocations.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
              {hasLocationChange ? (
                <p className="mt-2 text-sm font-semibold text-primary" aria-live="polite">
                  {product.location ?? '미지정'} → {nextLocation ?? '미지정'}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="product-note" className="block text-sm font-bold">비고</label>
              <textarea
                id="product-note"
                value={note}
                rows={4}
                placeholder="수량 구성이나 특이사항을 입력해주세요."
                className="mt-2 w-full resize-y rounded-xl border border-border-strong bg-surface px-4 py-3 leading-6 outline-none focus:border-primary focus:ring-3 focus:ring-primary/25"
                onChange={(event) => setNote(event.target.value)}
              />
            </div>
          </div>

          {errorMessage ? (
            <p className="mb-4 rounded-lg bg-danger-soft p-3 text-sm font-semibold text-danger" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <div className="mt-auto grid grid-cols-2 gap-3 border-t border-border pt-5">
            <Button variant="secondary" onClick={onClose}>취소</Button>
            <Button type="submit" disabled={!hasChanges || isSubmitting}>
              {isSubmitting ? '적용 중…' : '변경 적용'}
            </Button>
          </div>
        </form>
      ) : null}
    </Drawer>
  );
}
