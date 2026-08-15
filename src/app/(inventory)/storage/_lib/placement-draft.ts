import type { StorageFacility } from '@/features/inventory/model/storage';
import type {
  StoragePlacement,
  StoragePlacementMutation,
  StoragePlacementPurpose,
} from '@/features/inventory/model/storage-placement';

export interface PlacementDraft {
  placementId: string | null;
  levelNumber: number;
  slotStart: number;
  slotEnd: number;
  isRangeComplete: boolean;
  isBehind: boolean;
  purpose: StoragePlacementPurpose;
}

export function createPlacementDraft(): PlacementDraft {
  return {
    placementId: null,
    levelNumber: 1,
    slotStart: 1,
    slotEnd: 1,
    isRangeComplete: true,
    isBehind: false,
    purpose: null,
  };
}

export function createPlacementDraftFromPlacement(placement: StoragePlacement): PlacementDraft {
  return {
    placementId: placement.id,
    levelNumber: placement.levelNumber ?? 1,
    slotStart: placement.slotStart ?? 1,
    slotEnd: placement.slotEnd ?? placement.slotStart ?? 1,
    isRangeComplete: true,
    isBehind: placement.isBehind,
    purpose: placement.purpose,
  };
}

export function selectPlacementSlot(
  draft: PlacementDraft,
  levelNumber: number,
  slotNumber: number,
): PlacementDraft {
  if (draft.levelNumber !== levelNumber || draft.isRangeComplete) {
    return { ...draft, levelNumber, slotStart: slotNumber, slotEnd: slotNumber, isRangeComplete: false };
  }
  return {
    ...draft,
    slotStart: Math.min(draft.slotStart, slotNumber),
    slotEnd: Math.max(draft.slotStart, slotNumber),
    isRangeComplete: true,
  };
}

export function buildPlacementMutation(
  facility: StorageFacility,
  draft: PlacementDraft,
): StoragePlacementMutation {
  if (!facility.label) throw new Error('이름이 지정된 설비에만 제품을 배치할 수 있습니다.');
  const level = facility.levels.find((item) => item.order === draft.levelNumber);
  if (!level) throw new Error('선택한 칸을 찾을 수 없습니다.');
  if (draft.slotStart < 1 || draft.slotEnd > level.slotCount) {
    throw new Error('선택한 자리가 현재 설비 범위를 벗어났습니다.');
  }
  return {
    placementId: draft.placementId,
    facilityId: facility.id,
    facilityLabel: facility.label,
    levelNumber: draft.levelNumber,
    slotStart: Math.min(draft.slotStart, draft.slotEnd),
    slotEnd: Math.max(draft.slotStart, draft.slotEnd),
    isBehind: draft.isBehind,
    purpose: draft.purpose,
  };
}
