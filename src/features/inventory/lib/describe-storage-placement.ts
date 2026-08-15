import type { StorageFacility, StorageLevel } from '../model/storage';
import type { StoragePlacement } from '../model/storage-placement';

function describeVerticalPosition(level: StorageLevel, levelCount: number): string {
  if (level.kind === 'top') return '테이블 위';
  if (level.kind === 'bottom') return '테이블 아래';
  if (level.order === 1) return '맨 위 칸';
  if (level.order === levelCount) return '맨 아래 칸';

  const countFromBottom = levelCount - level.order + 1;
  return level.order <= countFromBottom
    ? `위에서 ${level.order}번째 칸`
    : `아래에서 ${countFromBottom}번째 칸`;
}

function describeHorizontalPosition(slotStart: number, slotEnd: number, slotCount: number): string {
  const countFromRightStart = slotCount - slotEnd + 1;
  const countFromRightEnd = slotCount - slotStart + 1;
  if (slotStart <= countFromRightStart) {
    return slotStart === slotEnd
      ? `왼쪽에서 ${slotStart}번째`
      : `왼쪽에서 ${slotStart}~${slotEnd}번째`;
  }
  return countFromRightStart === countFromRightEnd
    ? `오른쪽에서 ${countFromRightStart}번째`
    : `오른쪽에서 ${countFromRightStart}~${countFromRightEnd}번째`;
}

export function describeStoragePlacement(
  placement: StoragePlacement,
  facility: StorageFacility | null,
): string {
  const descriptions = [placement.facilityLabel];
  const level = facility?.levels.find((item) => item.order === placement.levelNumber);
  if (level && facility) descriptions.push(describeVerticalPosition(level, facility.levels.length));
  if (level && placement.slotStart !== null && placement.slotEnd !== null) {
    descriptions.push(describeHorizontalPosition(placement.slotStart, placement.slotEnd, level.slotCount));
  }
  if (placement.isBehind) descriptions.push('뒤쪽');
  if (placement.purpose === 'sample') descriptions.push('샘플');
  if (placement.purpose === 'box') descriptions.push('박스');
  return descriptions.join(' · ');
}
