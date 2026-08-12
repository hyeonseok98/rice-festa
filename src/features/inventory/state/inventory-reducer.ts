import type { Product, ProductChange } from '../model/product';
import type { ProductSheetErrorDetail } from '../excel/product-sheet-error';

export type InventorySessionStatus =
  | 'idle'
  | 'loading'
  | 'selecting-sheet'
  | 'ready'
  | 'saving'
  | 'error';

export interface InventoryState {
  status: InventorySessionStatus;
  isDirty: boolean;
  fileName: string | null;
  products: Product[];
  changes: Record<string, ProductChange>;
  errorMessage: string | null;
  validationErrors: ProductSheetErrorDetail[];
  candidateSheetNames: string[];
  lastSaveMessage: string | null;
}

export const initialInventoryState: InventoryState = {
  status: 'idle',
  isDirty: false,
  fileName: null,
  products: [],
  changes: {},
  errorMessage: null,
  validationErrors: [],
  candidateSheetNames: [],
  lastSaveMessage: null,
};

type InventoryAction =
  | { type: 'workbookLoadStarted'; fileName: string }
  | { type: 'workbookLoaded'; fileName: string; products: Product[] }
  | { type: 'workbookSheetSelectionRequired'; fileName: string; sheetNames: string[] }
  | {
      type: 'workbookLoadFailed';
      fileName: string | null;
      errorMessage: string;
      validationErrors: ProductSheetErrorDetail[];
    }
  | { type: 'productQuantityChanged'; productId: string; before: number; after: number }
  | {
      type: 'productLocationChanged';
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

  if (!nextChange.quantity && !nextChange.location) {
    delete nextChanges[productId];
  } else {
    nextChanges[productId] = nextChange;
  }

  return {
    changes: nextChanges,
    isDirty: Object.keys(nextChanges).length > 0,
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
        candidateSheetNames: [],
        lastSaveMessage: null,
      };
    case 'workbookLoaded':
      return {
        ...initialInventoryState,
        status: 'ready',
        fileName: action.fileName,
        products: action.products,
      };
    case 'workbookSheetSelectionRequired':
      return {
        ...initialInventoryState,
        status: 'selecting-sheet',
        fileName: action.fileName,
        candidateSheetNames: action.sheetNames,
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
          product.id === action.productId ? { ...product, location: action.after } : product,
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
        changes: {},
        lastSaveMessage: action.message,
      };
    case 'saveFailed':
      return { ...state, status: 'ready', errorMessage: action.errorMessage };
  }
}
