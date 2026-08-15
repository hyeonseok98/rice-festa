'use client';

import { useCallback, type Dispatch, type MutableRefObject } from 'react';

import { serializeStorageLocation } from '../lib/serialize-storage-location';
import { validateProductQuantity } from '../lib/update-product-quantity';
import type { Product, ProductQuantity } from '../model/product';
import type { StoragePlacement, StoragePlacementMutation } from '../model/storage-placement';
import type { InventoryAction } from './inventory-reducer';
import type { ActiveWorkbookSession } from './use-workbook-session';

interface ProductCommands {
  updateQuantity: (productId: string, quantity: ProductQuantity) => Promise<void>;
  updateLocation: (productId: string, location: string | null) => Promise<void>;
  updatePlacements: (productId: string, placements: StoragePlacement[]) => Promise<void>;
  saveProductPlacement: (productId: string, mutation: StoragePlacementMutation) => Promise<string>;
  clearProductPlacementPosition: (productId: string, placementId: string) => Promise<void>;
  removeProductPlacement: (productId: string, placementId: string) => Promise<void>;
  updateReceivedAt: (productId: string, receivedAt: string | null) => Promise<void>;
  updateNote: (productId: string, note: string | null) => Promise<void>;
}

function findProduct(products: Product[], productId: string): Product {
  const product = products.find((item) => item.id === productId);
  if (!product) throw new Error('수정할 출품작을 찾을 수 없습니다.');
  return product;
}

function findUpdatedProduct(products: Product[], productId: string): Product {
  const product = products.find((item) => item.id === productId);
  if (!product) throw new Error('변경한 출품작을 다시 불러오지 못했습니다.');
  return product;
}

export function useProductCommands(
  products: Product[],
  activeWorkbookSessionRef: MutableRefObject<ActiveWorkbookSession | null>,
  requireEditPermission: () => Promise<void>,
  dispatch: Dispatch<InventoryAction>,
): ProductCommands {
  const updateQuantity = useCallback(
    async (productId: string, quantity: ProductQuantity) => {
      const activeWorkbookSession = activeWorkbookSessionRef.current;
      const product = findProduct(products, productId);
      if (!activeWorkbookSession) throw new Error('수정할 Excel 파일을 찾을 수 없습니다.');
      const validatedQuantity = validateProductQuantity(quantity);
      if (validatedQuantity === product.quantity) return;
      await requireEditPermission();
      await activeWorkbookSession.repository.updateQuantity(productId, validatedQuantity);
      dispatch({
        type: 'productQuantityChanged',
        productId,
        before: product.quantity,
        after: validatedQuantity,
      });
    },
    [activeWorkbookSessionRef, dispatch, products, requireEditPermission],
  );

  const updateLocation = useCallback(
    async (productId: string, location: string | null) => {
      const activeWorkbookSession = activeWorkbookSessionRef.current;
      const product = findProduct(products, productId);
      if (!activeWorkbookSession) throw new Error('수정할 Excel 파일을 찾을 수 없습니다.');
      const normalizedLocation = location?.trim() || null;
      if (normalizedLocation === product.location) return;
      await requireEditPermission();
      await activeWorkbookSession.repository.updateLocation(productId, normalizedLocation);
      const updatedProduct = findUpdatedProduct(
        await activeWorkbookSession.repository.getProducts(),
        productId,
      );
      dispatch({
        type: 'productLocationChanged',
        productId,
        before: product.location,
        after: updatedProduct.location,
        placements: updatedProduct.placements,
        locationIssues: updatedProduct.locationIssues,
      });
    },
    [activeWorkbookSessionRef, dispatch, products, requireEditPermission],
  );

  const updatePlacements = useCallback(
    async (productId: string, placements: StoragePlacement[]) => {
      await updateLocation(productId, serializeStorageLocation(placements));
    },
    [updateLocation],
  );

  const saveProductPlacement = useCallback(
    async (productId: string, mutation: StoragePlacementMutation) => {
      const product = findProduct(products, productId);
      const placementId = mutation.placementId ?? `${productId}:placement:${crypto.randomUUID()}`;
      const savedPlacement: StoragePlacement = {
        id: placementId,
        facilityId: mutation.facilityId,
        facilityLabel: mutation.facilityLabel,
        levelNumber: mutation.levelNumber,
        slotStart: mutation.slotStart,
        slotEnd: mutation.slotEnd,
        isBehind: mutation.isBehind,
        purpose: mutation.purpose,
      };
      const placements = mutation.placementId
        ? product.placements.map((placement) =>
            placement.id === mutation.placementId ? savedPlacement : placement,
          )
        : [...product.placements, savedPlacement];
      await updatePlacements(productId, placements);
      return placementId;
    },
    [products, updatePlacements],
  );

  const removeProductPlacement = useCallback(
    async (productId: string, placementId: string) => {
      const product = findProduct(products, productId);
      await updatePlacements(
        productId,
        product.placements.filter((placement) => placement.id !== placementId),
      );
    },
    [products, updatePlacements],
  );

  const clearProductPlacementPosition = useCallback(
    async (productId: string, placementId: string) => {
      const product = findProduct(products, productId);
      const placement = product.placements.find((item) => item.id === placementId);
      if (!placement) throw new Error('배치를 해제할 위치를 찾을 수 없습니다.');
      await updatePlacements(
        productId,
        product.placements.map((item) => item.id === placementId
          ? {
              ...item,
              levelNumber: null,
              slotStart: null,
              slotEnd: null,
              isBehind: false,
              purpose: null,
            }
          : item),
      );
    },
    [products, updatePlacements],
  );

  const updateReceivedAt = useCallback(
    async (productId: string, receivedAt: string | null) => {
      const activeWorkbookSession = activeWorkbookSessionRef.current;
      const product = findProduct(products, productId);
      if (!activeWorkbookSession) throw new Error('수정할 Excel 파일을 찾을 수 없습니다.');
      if (receivedAt === product.receivedAt) return;
      await requireEditPermission();
      await activeWorkbookSession.repository.updateReceivedAt(productId, receivedAt);
      dispatch({
        type: 'productReceivedAtChanged',
        productId,
        before: product.receivedAt,
        after: receivedAt,
      });
    },
    [activeWorkbookSessionRef, dispatch, products, requireEditPermission],
  );

  const updateNote = useCallback(
    async (productId: string, note: string | null) => {
      const activeWorkbookSession = activeWorkbookSessionRef.current;
      const product = findProduct(products, productId);
      if (!activeWorkbookSession) throw new Error('수정할 Excel 파일을 찾을 수 없습니다.');
      const normalizedNote = note?.trim() || null;
      if (normalizedNote === product.note) return;
      await requireEditPermission();
      await activeWorkbookSession.repository.updateNote(productId, normalizedNote);
      dispatch({
        type: 'productNoteChanged',
        productId,
        before: product.note,
        after: normalizedNote,
      });
    },
    [activeWorkbookSessionRef, dispatch, products, requireEditPermission],
  );

  return {
    updateQuantity,
    updateLocation,
    updatePlacements,
    saveProductPlacement,
    clearProductPlacementPosition,
    removeProductPlacement,
    updateReceivedAt,
    updateNote,
  };
}
