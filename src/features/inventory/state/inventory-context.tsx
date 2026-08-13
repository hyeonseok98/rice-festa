'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';

import { ExcelProductRepository } from '../excel/excel-product-repository';
import { ProductSheetValidationError } from '../excel/product-sheet-error';
import { findNewProductIds } from '../lib/find-new-product-ids';
import { validateProductQuantity } from '../lib/update-product-quantity';
import type { Product, ProductQuantity } from '../model/product';
import { isStorageLocation } from '../model/storage';
import { initialInventoryState, inventoryReducer, type InventoryState } from './inventory-reducer';

interface LoadedWorkbookSnapshot {
  fileName: string;
  products: Product[];
}

interface InventoryContextValue extends InventoryState {
  loadWorkbook: (file: File) => Promise<void>;
  updateQuantity: (productId: string, quantity: ProductQuantity) => Promise<void>;
  updateLocation: (productId: string, location: string | null) => Promise<void>;
  updateReceivedAt: (productId: string, receivedAt: string | null) => Promise<void>;
  updateNote: (productId: string, note: string | null) => Promise<void>;
  downloadWorkbook: () => Promise<void>;
}

const InventoryContext = createContext<InventoryContextValue | null>(null);

function createDownloadFileName(fileName: string): string {
  const nameWithoutExtension = fileName.replace(/\.xlsx$/i, '');
  const timestamp = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(new Date())
    .replaceAll('. ', '')
    .replace('.', '')
    .replaceAll(':', '')
    .replaceAll(' ', '-');
  return `${nameWithoutExtension}-변경본-${timestamp}.xlsx`;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
}

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(inventoryReducer, initialInventoryState);
  const repositoryRef = useRef<ExcelProductRepository | null>(null);
  const lastLoadedWorkbookRef = useRef<LoadedWorkbookSnapshot | null>(null);
  const workbookLoadSequenceRef = useRef(0);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!state.isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.isDirty]);

  const loadWorkbook = useCallback(
    async (file: File) => {
      if (!file.name.toLocaleLowerCase().endsWith('.xlsx')) {
        dispatch({
          type: 'workbookLoadFailed',
          fileName: file.name,
          errorMessage: '.xlsx 파일만 불러올 수 있습니다.',
          validationErrors: [],
        });
        return;
      }
      if (state.isDirty && !window.confirm('저장하지 않은 변경사항이 있습니다. 새 파일을 불러올까요?')) {
        return;
      }

      dispatch({ type: 'workbookLoadStarted', fileName: file.name });
      try {
        const repository = ExcelProductRepository.fromArrayBuffer(await file.arrayBuffer());
        const products = await repository.getProducts();
        const previousWorkbook = lastLoadedWorkbookRef.current;
        workbookLoadSequenceRef.current += 1;
        const comparison = previousWorkbook
          ? {
              id: workbookLoadSequenceRef.current,
              previousFileName: previousWorkbook.fileName,
              newProductIds: findNewProductIds(previousWorkbook.products, products),
            }
          : undefined;

        repositoryRef.current = repository;
        lastLoadedWorkbookRef.current = {
          fileName: file.name,
          products: products.map((product) => ({ ...product })),
        };
        dispatch({ type: 'workbookLoaded', fileName: file.name, products, comparison });
      } catch (error: unknown) {
        dispatch({
          type: 'workbookLoadFailed',
          fileName: file.name,
          errorMessage: getErrorMessage(error),
          validationErrors: error instanceof ProductSheetValidationError ? error.details : [],
        });
      }
    },
    [state.isDirty],
  );

  const updateQuantity = useCallback(
    async (productId: string, quantity: ProductQuantity) => {
      const repository = repositoryRef.current;
      const product = state.products.find((item) => item.id === productId);
      if (!repository || !product) throw new Error('수정할 출품작을 찾을 수 없습니다.');
      const validatedQuantity = validateProductQuantity(quantity);
      if (validatedQuantity === product.quantity) return;
      await repository.updateQuantity(productId, validatedQuantity);
      dispatch({
        type: 'productQuantityChanged',
        productId,
        before: product.quantity,
        after: validatedQuantity,
      });
    },
    [state.products],
  );

  const updateLocation = useCallback(
    async (productId: string, location: string | null) => {
      const repository = repositoryRef.current;
      const product = state.products.find((item) => item.id === productId);
      if (!repository || !product) throw new Error('수정할 출품작을 찾을 수 없습니다.');
      if (location !== null && !isStorageLocation(location)) {
        throw new Error('보관위치는 저도주-1, 냉동-2처럼 입력해주세요.');
      }
      if (location === product.location) return;
      await repository.updateLocation(productId, location);
      dispatch({ type: 'productLocationChanged', productId, before: product.location, after: location });
    },
    [state.products],
  );

  const updateReceivedAt = useCallback(
    async (productId: string, receivedAt: string | null) => {
      const repository = repositoryRef.current;
      const product = state.products.find((item) => item.id === productId);
      if (!repository || !product) throw new Error('수정할 출품작을 찾을 수 없습니다.');
      if (receivedAt === product.receivedAt) return;
      await repository.updateReceivedAt(productId, receivedAt);
      dispatch({
        type: 'productReceivedAtChanged',
        productId,
        before: product.receivedAt,
        after: receivedAt,
      });
    },
    [state.products],
  );

  const updateNote = useCallback(
    async (productId: string, note: string | null) => {
      const repository = repositoryRef.current;
      const product = state.products.find((item) => item.id === productId);
      if (!repository || !product) throw new Error('수정할 출품작을 찾을 수 없습니다.');
      const normalizedNote = note?.trim() || null;
      if (normalizedNote === product.note) return;
      await repository.updateNote(productId, normalizedNote);
      dispatch({ type: 'productNoteChanged', productId, before: product.note, after: normalizedNote });
    },
    [state.products],
  );

  const downloadWorkbook = useCallback(async () => {
    const repository = repositoryRef.current;
    if (!repository || !state.fileName || !state.isDirty) return;

    dispatch({ type: 'saveStarted' });
    try {
      const fileName = createDownloadFileName(state.fileName);
      const blob = new Blob([repository.exportArrayBuffer()], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(downloadUrl);
      dispatch({ type: 'saveSucceeded', message: `${fileName} 다운로드를 요청했습니다.` });
    } catch (error: unknown) {
      dispatch({ type: 'saveFailed', errorMessage: getErrorMessage(error) });
    }
  }, [state.fileName, state.isDirty]);

  const value = useMemo<InventoryContextValue>(
    () => ({
      ...state,
      loadWorkbook,
      updateQuantity,
      updateLocation,
      updateReceivedAt,
      updateNote,
      downloadWorkbook,
    }),
    [
      state,
      loadWorkbook,
      updateQuantity,
      updateLocation,
      updateReceivedAt,
      updateNote,
      downloadWorkbook,
    ],
  );

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventorySession(): InventoryContextValue {
  const context = useContext(InventoryContext);
  if (!context) throw new Error('useInventorySession은 InventoryProvider 내부에서 사용해야 합니다.');
  return context;
}
