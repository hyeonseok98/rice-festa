import type { Product, ProductChange, ProductQuantity } from '../model/product';
import { createDefaultStorageConfiguration } from '../model/storage-layout';
import type { StorageConfiguration } from '../model/storage';
import type { StorageLocationIssue, StoragePlacement } from '../model/storage-placement';
import type { ProductSheetErrorDetail } from '../excel/product-sheet-error';

export type InventorySessionStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'saving'
  | 'error';

export interface InventoryState {
  status: InventorySessionStatus;
  isDirty: boolean;
  fileName: string | null;
  products: Product[];
  storageConfiguration: StorageConfiguration;
  isStorageConfigurationDirty: boolean;
  changes: Record<string, ProductChange>;
  errorMessage: string | null;
  validationErrors: ProductSheetErrorDetail[];
  lastSaveMessage: string | null;
  previousFileName: string | null;
  newProductIds: string[];
  comparisonId: number | null;
  workbookWarnings: string[];
  canOverwriteOriginal: boolean;
}

export const initialInventoryState: InventoryState = {
  status: 'idle',
  isDirty: false,
  fileName: null,
  products: [],
  storageConfiguration: createDefaultStorageConfiguration(),
  isStorageConfigurationDirty: false,
  changes: {},
  errorMessage: null,
  validationErrors: [],
  lastSaveMessage: null,
  previousFileName: null,
  newProductIds: [],
  comparisonId: null,
  workbookWarnings: [],
  canOverwriteOriginal: false,
};

export type InventoryAction =
  | { type: 'workbookLoadStarted'; fileName: string }
  | {
      type: 'workbookLoaded';
      fileName: string;
      products: Product[];
      storageConfiguration: StorageConfiguration;
      workbookWarnings: string[];
      canOverwriteOriginal: boolean;
      comparison?: { id: number; previousFileName: string; newProductIds: string[] };
    }
  | {
      type: 'workbookLoadFailed';
      fileName: string | null;
      errorMessage: string;
      validationErrors: ProductSheetErrorDetail[];
    }
  | {
      type: 'productQuantityChanged';
      productId: string;
      before: ProductQuantity;
      after: ProductQuantity;
    }
  | {
      type: 'productLocationChanged';
      productId: string;
      before: string | null;
      after: string | null;
      placements: StoragePlacement[];
      locationIssues: StorageLocationIssue[];
    }
  | {
      type: 'productReceivedAtChanged';
      productId: string;
      before: string | null;
      after: string | null;
    }
  | {
      type: 'storageConfigurationChanged';
      storageConfiguration: StorageConfiguration;
      products?: Product[];
    }
  | {
      type: 'sessionRestored';
      products: Product[];
      storageConfiguration: StorageConfiguration;
      message: string;
    }
  | {
      type: 'productNoteChanged';
      productId: string;
      before: string | null;
      after: string | null;
    }
  | { type: 'saveStarted' }
  | { type: 'saveSucceeded'; message: string }
  | { type: 'saveFailed'; errorMessage: string };

function withUpdatedChange(
  state: InventoryState,
  productId: string,
  update: (change: ProductChange) => ProductChange,
): Pick<InventoryState, 'changes' | 'isDirty'> {
  const nextChange = update(state.changes[productId] ?? { productId });
  const nextChanges = { ...state.changes };

  if (!nextChange.quantity && !nextChange.location && !nextChange.receivedAt && !nextChange.note) {
    delete nextChanges[productId];
  } else {
    nextChanges[productId] = nextChange;
  }

  return {
    changes: nextChanges,
    isDirty: Object.keys(nextChanges).length > 0 || state.isStorageConfigurationDirty,
  };
}

export function inventoryReducer(
  state: InventoryState,
  action: InventoryAction,
): InventoryState {
  switch (action.type) {
    case 'workbookLoadStarted':
      return {
        ...state,
        status: 'loading',
        fileName: action.fileName,
        errorMessage: null,
        validationErrors: [],
        lastSaveMessage: null,
      };
    case 'workbookLoaded':
      return {
        ...initialInventoryState,
        status: 'ready',
        fileName: action.fileName,
        products: action.products,
        storageConfiguration: action.storageConfiguration,
        workbookWarnings: action.workbookWarnings,
        canOverwriteOriginal: action.canOverwriteOriginal,
        previousFileName: action.comparison?.previousFileName ?? null,
        newProductIds: action.comparison?.newProductIds ?? [],
        comparisonId: action.comparison?.id ?? null,
      };
    case 'workbookLoadFailed':
      return {
        ...initialInventoryState,
        status: 'error',
        fileName: action.fileName,
        errorMessage: action.errorMessage,
        validationErrors: action.validationErrors,
      };
    case 'productQuantityChanged': {
      const currentChange = state.changes[action.productId];
      const originalQuantity = currentChange?.quantity?.before ?? action.before;
      const changeState = withUpdatedChange(state, action.productId, (change) => ({
        ...change,
        quantity:
          action.after === originalQuantity
            ? undefined
            : { before: originalQuantity, after: action.after },
      }));

      return {
        ...state,
        ...changeState,
        products: state.products.map((product) =>
          product.id === action.productId ? { ...product, quantity: action.after } : product,
        ),
        lastSaveMessage: null,
      };
    }
    case 'productLocationChanged': {
      const currentChange = state.changes[action.productId];
      const originalLocation = currentChange?.location?.before ?? action.before;
      const changeState = withUpdatedChange(state, action.productId, (change) => ({
        ...change,
        location:
          action.after === originalLocation
            ? undefined
            : { before: originalLocation, after: action.after },
      }));

      return {
        ...state,
        ...changeState,
        products: state.products.map((product) =>
          product.id === action.productId
            ? {
                ...product,
                location: action.after,
                placements: action.placements,
                locationIssues: action.locationIssues,
              }
            : product,
        ),
        lastSaveMessage: null,
      };
    }
    case 'storageConfigurationChanged':
      return {
        ...state,
        storageConfiguration: action.storageConfiguration,
        products: action.products ?? state.products,
        isStorageConfigurationDirty: true,
        isDirty: true,
        lastSaveMessage: null,
      };
    case 'sessionRestored':
      return {
        ...state,
        status: 'ready',
        products: action.products,
        storageConfiguration: action.storageConfiguration,
        isStorageConfigurationDirty: true,
        isDirty: true,
        changes: {},
        errorMessage: null,
        lastSaveMessage: action.message,
      };
    case 'productReceivedAtChanged': {
      const currentChange = state.changes[action.productId];
      const originalReceivedAt = currentChange?.receivedAt?.before ?? action.before;
      const changeState = withUpdatedChange(state, action.productId, (change) => ({
        ...change,
        receivedAt:
          action.after === originalReceivedAt
            ? undefined
            : { before: originalReceivedAt, after: action.after },
      }));

      return {
        ...state,
        ...changeState,
        products: state.products.map((product) =>
          product.id === action.productId ? { ...product, receivedAt: action.after } : product,
        ),
        lastSaveMessage: null,
      };
    }
    case 'productNoteChanged': {
      const currentChange = state.changes[action.productId];
      const originalNote = currentChange?.note?.before ?? action.before;
      const changeState = withUpdatedChange(state, action.productId, (change) => ({
        ...change,
        note:
          action.after === originalNote
            ? undefined
            : { before: originalNote, after: action.after },
      }));

      return {
        ...state,
        ...changeState,
        products: state.products.map((product) =>
          product.id === action.productId ? { ...product, note: action.after } : product,
        ),
        lastSaveMessage: null,
      };
    }
    case 'saveStarted':
      return { ...state, status: 'saving', errorMessage: null };
    case 'saveSucceeded':
      return {
        ...state,
        status: 'ready',
        isDirty: false,
        isStorageConfigurationDirty: false,
        changes: {},
        lastSaveMessage: action.message,
      };
    case 'saveFailed':
      return { ...state, status: 'ready', errorMessage: action.errorMessage };
  }
}
