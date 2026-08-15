import type { Product } from '@/features/inventory/model/product';
import type { StorageFacility } from '@/features/inventory/model/storage';
import type { StoragePlacementMutation } from '@/features/inventory/model/storage-placement';

export const FACILITY_PLACEMENT_DRAG_TYPE = 'application/x-rice-festa-placement';

export interface FacilityPlacementDragItem {
  productId: string;
  placementId: string | null;
}

export interface FacilityPlacementDropTarget {
  levelNumber: number;
  slotNumber: number;
  isBehind: boolean;
}

export function serializeFacilityPlacementDragItem(item: FacilityPlacementDragItem): string {
  return JSON.stringify(item);
}

export function parseFacilityPlacementDragItem(value: string): FacilityPlacementDragItem | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') return null;
    const candidate = parsed as Partial<FacilityPlacementDragItem>;
    if (typeof candidate.productId !== 'string') return null;
    if (candidate.placementId !== null && typeof candidate.placementId !== 'string') return null;
    return { productId: candidate.productId, placementId: candidate.placementId };
  } catch {
    return null;
  }
}

export function buildDroppedPlacementMutation(
  facility: StorageFacility,
  product: Product,
  item: FacilityPlacementDragItem,
  target: FacilityPlacementDropTarget,
): StoragePlacementMutation {
  if (!facility.label) throw new Error('이름이 지정된 설비에만 제품을 배치할 수 있습니다.');
  if (product.id !== item.productId) throw new Error('이동할 제품 정보가 일치하지 않습니다.');

  const level = facility.levels.find((candidate) => candidate.order === target.levelNumber);
  if (!level || target.slotNumber < 1 || target.slotNumber > level.slotCount) {
    throw new Error('선택한 자리를 찾을 수 없습니다.');
  }

  const sourcePlacement = item.placementId === null
    ? null
    : product.placements.find((placement) => placement.id === item.placementId) ?? null;
  if (item.placementId !== null && !sourcePlacement) {
    throw new Error('이동할 기존 위치를 찾을 수 없습니다.');
  }
  if (sourcePlacement && sourcePlacement.facilityId !== facility.id) {
    throw new Error('현재 설비 안의 위치만 드래그해 이동할 수 있습니다.');
  }

  const sourceWidth = sourcePlacement?.slotStart !== null && sourcePlacement?.slotStart !== undefined &&
    sourcePlacement.slotEnd !== null && sourcePlacement.slotEnd !== undefined
    ? Math.max(1, sourcePlacement.slotEnd - sourcePlacement.slotStart + 1)
    : 1;
  const width = Math.min(sourceWidth, level.slotCount);
  const slotStart = Math.min(target.slotNumber, level.slotCount - width + 1);

  return {
    placementId: item.placementId,
    facilityId: facility.id,
    facilityLabel: facility.label,
    levelNumber: level.order,
    slotStart,
    slotEnd: slotStart + width - 1,
    isBehind: target.isBehind,
    purpose: sourcePlacement?.purpose ?? null,
  };
}
