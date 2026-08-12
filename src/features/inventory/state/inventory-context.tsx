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
import {
  ProductSheetSelectionRequiredError,
  ProductSheetValidationError,
} from '../excel/product-sheet-error';
import { validateProductQuantity } from '../lib/update-product-quantity';
import { isStorageLocation } from '../model/storage';
import { initialInventoryState, inventoryReducer, type InventoryState } from './inventory-reducer';

interface PendingWorkbook {
  arrayBuffer: ArrayBuffer;
  fileName: string;
}

interface InventoryContextValue extends InventoryState {
  loadWorkbook: (file: File) => Promise<void>;
  selectWorkbookSheet: (sheetName: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  updateLocation: (productId: string, location: string | null) => Promise<void>;
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
  const pendingWorkbookRef = useRef<PendingWorkbook | null>(null);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!state.isDirty) {
        return;
      }

      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.isDirty]);

  const finishWorkbookLoad = useCallback(
    async (pendingWorkbook: PendingWorkbook, selectedSheetName?: string) => {
      try {
        const repository = ExcelProductRepository.fromArrayBuffer(pendingWorkbook.arrayBuffer, {
          selectedSheetName,
        });
        const products = await repository.getProducts();
        repositoryRef.current = repository;
        pendingWorkbookRef.current = null;
        dispatch({ type: 'workbookLoaded', fileName: pendingWorkbook.fileName, products });
      } catch (error: unknown) {
        if (error instanceof ProductSheetSelectionRequiredError) {
          pendingWorkbookRef.current = pendingWorkbook;
          dispatch({
            type: 'workbookSheetSelectionRequired',
            fileName: pendingWorkbook.fileName,
            sheetNames: error.sheetNames,
          });
          return;
        }

        dispatch({
          type: 'workbookLoadFailed',
          fileName: pendingWorkbook.fileName,
          errorMessage: getErrorMessage(error),
          validationErrors:
            error instanceof ProductSheetValidationError ? error.details : [],
        });
      }
    },
    [],
  );

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
        const pendingWorkbook = { arrayBuffer: await file.arrayBuffer(), fileName: file.name };
        await finishWorkbookLoad(pendingWorkbook);
      } catch (error: unknown) {
        dispatch({
          type: 'workbookLoadFailed',
          fileName: file.name,
          errorMessage: getErrorMessage(error),
          validationErrors: [],
        });
      }
    },
    [finishWorkbookLoad, state.isDirty],
  );

  const selectWorkbookSheet = useCallback(
    async (sheetName: string) => {
      const pendingWorkbook = pendingWorkbookRef.current;
      if (!pendingWorkbook) {
        return;
      }

      dispatch({ type: 'workbookLoadStarted', fileName: pendingWorkbook.fileName });
      await finishWorkbookLoad(pendingWorkbook, sheetName);
    },
    [finishWorkbookLoad],
  );

  const updateQuantity = useCallback(
    async (productId: string, quantity: number) => {
      const repository = repositoryRef.current;
      const product = state.products.find((item) => item.id === productId);
      if (!repository || !product) {
        throw new Error('수정할 출품작을 찾을 수 없습니다.');
      }

      const validatedQuantity = validateProductQuantity({ quantity });
      if (validatedQuantity === product.quantity) {
        return;
      }

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
      if (!repository || !product) {
        throw new Error('수정할 출품작을 찾을 수 없습니다.');
      }
      if (location !== null && !isStorageLocation(location)) {
        throw new Error('등록되지 않은 보관 위치입니다.');
      }
      if (location === product.location) {
        return;
      }

      await repository.updateLocation(productId, location);
      dispatch({
        type: 'productLocationChanged',
        productId,
        before: product.location,
        after: location,
      });
    },
    [state.products],
  );

  const downloadWorkbook = useCallback(async () => {
    const repository = repositoryRef.current;
    if (!repository || !state.fileName || !state.isDirty) {
      return;
    }

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
      selectWorkbookSheet,
      updateQuantity,
      updateLocation,
      downloadWorkbook,
    }),
    [
      downloadWorkbook,
      loadWorkbook,
      selectWorkbookSheet,
      state,
      updateLocation,
      updateQuantity,
    ],
  );

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventorySession(): InventoryContextValue {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventorySession은 InventoryProvider 내부에서 사용해야 합니다.');
  }

  return context;
}
