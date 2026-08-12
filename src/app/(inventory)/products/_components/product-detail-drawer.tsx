'use client';

import { useState, type FormEvent } from 'react';

import type { Product } from '@/features/inventory/model/product';
import { STORAGE_LOCATIONS } from '@/features/inventory/model/storage';
import { useInventorySession } from '@/features/inventory/state/inventory-context';
import { Button } from '@/shared/ui/button';
import { Drawer } from '@/shared/ui/drawer';

interface ProductDetailDrawerProps {
  product: Product | null;
  onClose: () => void;
}

export function ProductDetailDrawer({ product, onClose }: ProductDetailDrawerProps) {
  const { updateQuantity, updateLocation } = useInventorySession();
  const [quantity, setQuantity] = useState(() => String(product?.quantity ?? 0));
  const [location, setLocation] = useState(() => product?.location ?? '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsedQuantity = Number(quantity);
  const hasQuantityChange = product ? parsedQuantity !== product.quantity : false;
  const nextLocation = location || null;
  const hasLocationChange = product ? nextLocation !== product.location : false;
  const hasChanges = hasQuantityChange || hasLocationChange;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!product || !hasChanges) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      if (hasQuantityChange) await updateQuantity(product.id, parsedQuantity);
      if (hasLocationChange) await updateLocation(product.id, nextLocation);
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
          <dl className="grid grid-cols-2 gap-x-5 gap-y-6 border-b border-border pb-7 text-sm">
            <div>
              <dt className="text-muted-foreground">에탄올 함량</dt>
              <dd className="mt-1 font-bold">
                {product.ethanolPercent === null ? '-' : `${product.ethanolPercent}%`}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">수령일</dt>
              <dd className="mt-1 font-bold tabular-nums">{product.receivedAt}</dd>
            </div>
          </dl>

          <div className="space-y-7 py-7">
            <div>
              <label htmlFor="product-quantity" className="block text-sm font-bold">
                수량
              </label>
              <input
                id="product-quantity"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={quantity}
                className="mt-2 h-13 w-full rounded-xl border border-border-strong bg-surface px-4 text-lg font-bold outline-none focus:border-primary focus:ring-3 focus:ring-primary/25"
                onChange={(event) => setQuantity(event.target.value)}
              />
              {hasQuantityChange && Number.isInteger(parsedQuantity) && parsedQuantity >= 0 ? (
                <p className="mt-2 text-sm font-semibold text-primary" aria-live="polite">
                  {product.quantity}개 → {parsedQuantity}개
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="product-location" className="block text-sm font-bold">
                보관 위치
              </label>
              <select
                id="product-location"
                value={location}
                className="mt-2 h-13 w-full rounded-xl border border-border-strong bg-surface px-4 outline-none focus:border-primary focus:ring-3 focus:ring-primary/25"
                onChange={(event) => setLocation(event.target.value)}
              >
                <option value="">위치 미지정</option>
                <optgroup label="냉장 보관">
                  {STORAGE_LOCATIONS.filter((item) => !item.startsWith('냉동') && !item.startsWith('렉')).map(
                    (item) => (
                      <option key={item} value={item}>{item}</option>
                    ),
                  )}
                </optgroup>
                <optgroup label="냉동 보관">
                  {STORAGE_LOCATIONS.filter((item) => item.startsWith('냉동')).map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </optgroup>
                <optgroup label="렉 보관">
                  {STORAGE_LOCATIONS.filter((item) => item.startsWith('렉')).map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </optgroup>
              </select>
              {hasLocationChange ? (
                <p className="mt-2 text-sm font-semibold text-primary" aria-live="polite">
                  {product.location ?? '미지정'} → {nextLocation ?? '미지정'}
                </p>
              ) : null}
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
