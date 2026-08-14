import type { StoragePlacement } from '../model/storage-placement';

const PURPOSE_LABELS = {
  sample: '샘플',
  box: '박스',
} as const;

function serializeStoragePlacement(placement: StoragePlacement): string {
  const locationSegments = [placement.facilityLabel];
  if (placement.levelNumber !== null) locationSegments.push(`칸${placement.levelNumber}`);
  if (placement.slotStart !== null && placement.slotEnd !== null) {
    locationSegments.push(
      placement.slotStart === placement.slotEnd
        ? `자리${placement.slotStart}`
        : `자리${placement.slotStart}-${placement.slotEnd}`,
    );
  }
  if (placement.isBehind) locationSegments.push('뒤쪽');

  const locationText = locationSegments.join(' / ');
  return placement.purpose ? `${PURPOSE_LABELS[placement.purpose]}: ${locationText}` : locationText;
}

export function serializeStorageLocation(placements: StoragePlacement[]): string | null {
  const serializedPlacements = placements.map(serializeStoragePlacement).filter(Boolean);
  return serializedPlacements.length > 0 ? serializedPlacements.join('\n') : null;
}
