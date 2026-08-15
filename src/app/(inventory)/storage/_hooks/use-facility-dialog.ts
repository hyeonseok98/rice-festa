'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { StoragePlacement } from '@/features/inventory/model/storage-placement';

import {
  createPlacementDraft,
  createPlacementDraftFromPlacement,
  selectPlacementSlot,
  type PlacementDraft,
} from '../_lib/placement-draft';

export type FacilityDialogState =
  | { kind: 'closed' }
  | { kind: 'browse'; facilityId: string; focusedProductId: string | null }
  | { kind: 'pick'; facilityId: string }
  | { kind: 'place' | 'edit'; facilityId: string; productId: string; draft: PlacementDraft };

const CLOSED_STATE: FacilityDialogState = { kind: 'closed' };

export function useFacilityDialog() {
  const [state, setState] = useState<FacilityDialogState>(CLOSED_STATE);
  const stateRef = useRef<FacilityDialogState>(CLOSED_STATE);

  useEffect(() => {
    const closeFromBrowserHistory = () => {
      stateRef.current = CLOSED_STATE;
      setState(CLOSED_STATE);
    };
    window.addEventListener('popstate', closeFromBrowserHistory);
    return () => window.removeEventListener('popstate', closeFromBrowserHistory);
  }, []);

  const open = useCallback((nextState: Exclude<FacilityDialogState, { kind: 'closed' }>) => {
    if (stateRef.current.kind === 'closed') {
      window.history.pushState({ storageFacilityDialog: true }, '', window.location.href);
    }
    stateRef.current = nextState;
    setState(nextState);
  }, []);

  const close = useCallback(() => {
    if (window.history.state?.storageFacilityDialog) {
      window.history.back();
      return;
    }
    stateRef.current = CLOSED_STATE;
    setState(CLOSED_STATE);
  }, []);

  const openBrowse = useCallback(
    (facilityId: string, focusedProductId: string | null = null) =>
      open({ kind: 'browse', facilityId, focusedProductId }),
    [open],
  );
  const startPlacement = useCallback(
    (facilityId: string, productId: string) =>
      open({ kind: 'place', facilityId, productId, draft: createPlacementDraft() }),
    [open],
  );
  const pickProduct = useCallback(
    (facilityId: string) => open({ kind: 'pick', facilityId }),
    [open],
  );
  const editPlacement = useCallback(
    (facilityId: string, productId: string, placement: StoragePlacement) =>
      open({ kind: 'edit', facilityId, productId, draft: createPlacementDraftFromPlacement(placement) }),
    [open],
  );
  const selectSlot = useCallback((levelNumber: number, slotNumber: number) => {
    setState((currentState) => currentState.kind === 'place' || currentState.kind === 'edit'
      ? { ...currentState, draft: selectPlacementSlot(currentState.draft, levelNumber, slotNumber) }
      : currentState);
  }, []);
  const updateDraft = useCallback((changes: Partial<PlacementDraft>) => {
    setState((currentState) => currentState.kind === 'place' || currentState.kind === 'edit'
      ? { ...currentState, draft: { ...currentState.draft, ...changes } }
      : currentState);
  }, []);

  return { state, close, openBrowse, pickProduct, startPlacement, editPlacement, selectSlot, updateDraft };
}
