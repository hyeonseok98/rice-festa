'use client';

import { useCallback, useRef, useState, type Dispatch, type MutableRefObject } from 'react';

import { ExcelProductRepository } from '../excel/excel-product-repository';
import { ProductSheetValidationError } from '../excel/product-sheet-error';
import {
  createBackupFileName,
  createChangedWorkbookFileName,
  openWorkbookWithFilePicker,
  overwriteWorkbookFile,
  saveWorkbookCopy,
  type WorkbookPickerResult,
  type WritableWorkbookFileHandle,
} from '../file/workbook-file-session';
import { findNewProductIds } from '../lib/find-new-product-ids';
import type { Product } from '../model/product';
import type { InventoryAction, InventoryState } from './inventory-reducer';

interface LoadedWorkbookSnapshot {
  fileName: string;
  products: Product[];
}

type BackupDecisionStatus = 'unasked' | 'created' | 'skipped';

export interface ActiveWorkbookSession {
  originalBytes: ArrayBuffer;
  repository: ExcelProductRepository;
  writableFileHandle: WritableWorkbookFileHandle | null;
  backupDecisionStatus: BackupDecisionStatus;
}

interface PendingEditPermission {
  promise: Promise<boolean>;
  resolve: (canContinueEditing: boolean) => void;
}

interface WorkbookSessionController {
  activeWorkbookSessionRef: MutableRefObject<ActiveWorkbookSession | null>;
  isBackupDecisionOpen: boolean;
  requireEditPermission: () => Promise<void>;
  selectWorkbookFile: () => Promise<WorkbookPickerResult['status']>;
  loadWorkbook: (file: File) => Promise<void>;
  saveBackupBeforeEditing: () => Promise<void>;
  continueEditingWithoutBackup: () => void;
  cancelPendingEdit: () => void;
  saveInitialWorkbookBackup: () => Promise<void>;
  saveOriginalWorkbook: () => Promise<void>;
  saveChangedWorkbookCopy: () => Promise<void>;
  restoreInitialWorkbook: () => Promise<void>;
}

class WorkbookEditCancelledError extends Error {
  constructor() {
    super('백업 저장이 취소되어 변경사항을 적용하지 않았습니다.');
    this.name = 'WorkbookEditCancelledError';
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
}

function cloneArrayBuffer(arrayBuffer: ArrayBuffer): ArrayBuffer {
  return arrayBuffer.slice(0);
}

export function useWorkbookSession(
  state: InventoryState,
  dispatch: Dispatch<InventoryAction>,
): WorkbookSessionController {
  const [isBackupDecisionOpen, setIsBackupDecisionOpen] = useState(false);
  const activeWorkbookSessionRef = useRef<ActiveWorkbookSession | null>(null);
  const pendingEditPermissionRef = useRef<PendingEditPermission | null>(null);
  const lastLoadedWorkbookRef = useRef<LoadedWorkbookSnapshot | null>(null);
  const workbookLoadSequenceRef = useRef(0);

  const resolvePendingEditPermission = useCallback((canContinueEditing: boolean) => {
    pendingEditPermissionRef.current?.resolve(canContinueEditing);
    pendingEditPermissionRef.current = null;
    setIsBackupDecisionOpen(false);
  }, []);

  const requestEditPermission = useCallback(async (): Promise<boolean> => {
    const activeWorkbookSession = activeWorkbookSessionRef.current;
    if (!activeWorkbookSession) throw new Error('먼저 Excel 파일을 불러와주세요.');
    if (activeWorkbookSession.backupDecisionStatus !== 'unasked') return true;
    if (pendingEditPermissionRef.current) return pendingEditPermissionRef.current.promise;

    let resolvePermission: (canContinueEditing: boolean) => void = () => undefined;
    const permissionPromise = new Promise<boolean>((resolve) => {
      resolvePermission = resolve;
    });
    pendingEditPermissionRef.current = {
      promise: permissionPromise,
      resolve: resolvePermission,
    };
    setIsBackupDecisionOpen(true);
    return permissionPromise;
  }, []);

  const requireEditPermission = useCallback(async () => {
    if (!(await requestEditPermission())) throw new WorkbookEditCancelledError();
  }, [requestEditPermission]);

  const loadWorkbookFile = useCallback(
    async (file: File, writableFileHandle: WritableWorkbookFileHandle | null) => {
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

      resolvePendingEditPermission(false);
      dispatch({ type: 'workbookLoadStarted', fileName: file.name });
      try {
        const originalBytes = await file.arrayBuffer();
        const repository = ExcelProductRepository.fromArrayBuffer(originalBytes);
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

        activeWorkbookSessionRef.current = {
          originalBytes: cloneArrayBuffer(originalBytes),
          repository,
          writableFileHandle,
          backupDecisionStatus: 'unasked',
        };
        lastLoadedWorkbookRef.current = {
          fileName: file.name,
          products: products.map((product) => ({ ...product })),
        };
        dispatch({
          type: 'workbookLoaded',
          fileName: file.name,
          products,
          storageConfiguration: repository.getStorageConfiguration(),
          workbookWarnings: repository.getWorkbookWarnings(),
          canOverwriteOriginal: writableFileHandle !== null,
          comparison,
        });
      } catch (error: unknown) {
        activeWorkbookSessionRef.current = null;
        dispatch({
          type: 'workbookLoadFailed',
          fileName: file.name,
          errorMessage: getErrorMessage(error),
          validationErrors: error instanceof ProductSheetValidationError ? error.details : [],
        });
      }
    },
    [dispatch, resolvePendingEditPermission, state.isDirty],
  );

  const loadWorkbook = useCallback(
    async (file: File) => loadWorkbookFile(file, null),
    [loadWorkbookFile],
  );

  const selectWorkbookFile = useCallback(async (): Promise<WorkbookPickerResult['status']> => {
    const pickerResult = await openWorkbookWithFilePicker();
    if (pickerResult.status === 'opened') {
      await loadWorkbookFile(pickerResult.file, pickerResult.writableFileHandle);
    }
    return pickerResult.status;
  }, [loadWorkbookFile]);

  const saveBackupBeforeEditing = useCallback(async () => {
    const activeWorkbookSession = activeWorkbookSessionRef.current;
    if (!activeWorkbookSession || !state.fileName) {
      resolvePendingEditPermission(false);
      return;
    }

    try {
      const saveResult = await saveWorkbookCopy(
        createBackupFileName(state.fileName),
        cloneArrayBuffer(activeWorkbookSession.originalBytes),
      );
      if (saveResult === 'cancelled') {
        resolvePendingEditPermission(false);
        return;
      }
      activeWorkbookSession.backupDecisionStatus = 'created';
      resolvePendingEditPermission(true);
    } catch (error: unknown) {
      resolvePendingEditPermission(false);
      throw error;
    }
  }, [resolvePendingEditPermission, state.fileName]);

  const continueEditingWithoutBackup = useCallback(() => {
    const activeWorkbookSession = activeWorkbookSessionRef.current;
    if (activeWorkbookSession) activeWorkbookSession.backupDecisionStatus = 'skipped';
    resolvePendingEditPermission(Boolean(activeWorkbookSession));
  }, [resolvePendingEditPermission]);

  const cancelPendingEdit = useCallback(() => {
    resolvePendingEditPermission(false);
  }, [resolvePendingEditPermission]);

  const saveInitialWorkbookBackup = useCallback(async () => {
    const activeWorkbookSession = activeWorkbookSessionRef.current;
    if (!activeWorkbookSession || !state.fileName) return;
    const saveResult = await saveWorkbookCopy(
      createBackupFileName(state.fileName),
      cloneArrayBuffer(activeWorkbookSession.originalBytes),
    );
    if (saveResult === 'saved') activeWorkbookSession.backupDecisionStatus = 'created';
  }, [state.fileName]);

  const saveOriginalWorkbook = useCallback(async () => {
    const activeWorkbookSession = activeWorkbookSessionRef.current;
    if (!activeWorkbookSession || !state.fileName || !state.isDirty) return;

    dispatch({ type: 'saveStarted' });
    try {
      const changedWorkbookBytes = activeWorkbookSession.repository.exportArrayBuffer();
      if (activeWorkbookSession.writableFileHandle) {
        await overwriteWorkbookFile(
          activeWorkbookSession.writableFileHandle,
          changedWorkbookBytes,
        );
        dispatch({ type: 'saveSucceeded', message: `${state.fileName} 원본에 저장했습니다.` });
        return;
      }

      const saveResult = await saveWorkbookCopy(
        createChangedWorkbookFileName(state.fileName),
        changedWorkbookBytes,
      );
      if (saveResult === 'cancelled') {
        dispatch({ type: 'saveFailed', errorMessage: '변경본 저장을 취소했습니다.' });
        return;
      }
      dispatch({ type: 'saveSucceeded', message: 'Excel 변경본을 저장했습니다.' });
    } catch (error: unknown) {
      dispatch({ type: 'saveFailed', errorMessage: getErrorMessage(error) });
    }
  }, [dispatch, state.fileName, state.isDirty]);

  const saveChangedWorkbookCopy = useCallback(async () => {
    const activeWorkbookSession = activeWorkbookSessionRef.current;
    if (!activeWorkbookSession || !state.fileName) return;
    await saveWorkbookCopy(
      createChangedWorkbookFileName(state.fileName),
      activeWorkbookSession.repository.exportArrayBuffer(),
    );
  }, [state.fileName]);

  const restoreInitialWorkbook = useCallback(async () => {
    const activeWorkbookSession = activeWorkbookSessionRef.current;
    if (!activeWorkbookSession) return;
    await requireEditPermission();

    const restoredRepository = ExcelProductRepository.fromArrayBuffer(
      cloneArrayBuffer(activeWorkbookSession.originalBytes),
    );
    activeWorkbookSession.repository = restoredRepository;
    dispatch({
      type: 'sessionRestored',
      products: await restoredRepository.getProducts(),
      storageConfiguration: restoredRepository.getStorageConfiguration(),
      message: '처음 불러온 상태로 되돌렸습니다. 원본 저장 전까지 실제 파일은 바뀌지 않습니다.',
    });
  }, [dispatch, requireEditPermission]);

  return {
    activeWorkbookSessionRef,
    isBackupDecisionOpen,
    requireEditPermission,
    selectWorkbookFile,
    loadWorkbook,
    saveBackupBeforeEditing,
    continueEditingWithoutBackup,
    cancelPendingEdit,
    saveInitialWorkbookBackup,
    saveOriginalWorkbook,
    saveChangedWorkbookCopy,
    restoreInitialWorkbook,
  };
}
