import type { StorageFacility } from '../model/storage';
import type {
  ParsedStorageLocation,
  StorageLocationIssue,
  StoragePlacement,
  StoragePlacementPurpose,
} from '../model/storage-placement';

interface ParsedPlacementLine {
  purpose: StoragePlacementPurpose;
  locationText: string;
}

const PURPOSE_PREFIXES: Array<{
  prefix: string;
  purpose: Exclude<StoragePlacementPurpose, null>;
}> = [
  { prefix: '샘플:', purpose: 'sample' },
  { prefix: '박스:', purpose: 'box' },
];

function separatePurposePrefix(rawLine: string): ParsedPlacementLine {
  const trimmedLine = rawLine.trim();
  const matchedPurpose = PURPOSE_PREFIXES.find(({ prefix }) => trimmedLine.startsWith(prefix));
  if (!matchedPurpose) return { purpose: null, locationText: trimmedLine };

  return {
    purpose: matchedPurpose.purpose,
    locationText: trimmedLine.slice(matchedPurpose.prefix.length).trim(),
  };
}

function findFacilityByLabel(
  label: string,
  facilities: StorageFacility[],
): StorageFacility | null {
  return facilities.find((facility) => facility.label === label) ?? null;
}

function matchLegacyFacilityAndLevel(
  locationText: string,
  facilities: StorageFacility[],
): { facility: StorageFacility; levelNumber: number } | null {
  const registeredFacilities = facilities
    .filter((facility): facility is StorageFacility & { label: string } => facility.label !== null)
    .sort((left, right) => right.label.length - left.label.length);

  for (const facility of registeredFacilities) {
    const expectedPrefix = `${facility.label}-`;
    if (!locationText.startsWith(expectedPrefix)) continue;
    const levelText = locationText.slice(expectedPrefix.length);
    if (/^[1-9]\d*$/.test(levelText)) {
      return { facility, levelNumber: Number(levelText) };
    }
  }
  return null;
}

function parseLevelNumber(
  levelText: string,
  facility: StorageFacility,
): number | null | undefined {
  if (levelText === '맨 위' || levelText === '맨 위 칸' || levelText === '위') return 1;
  if (levelText === '맨 아래' || levelText === '맨 아래 칸' || levelText === '아래') {
    return facility.levels.length || 1;
  }

  const levelMatch = levelText.match(/^(?:칸\s*|위에서\s*)?([1-9]\d*)(?:번째)?(?:\s*칸)?$/);
  return levelMatch ? Number(levelMatch[1]) : undefined;
}

function parseSlotRange(
  slotText: string,
): { slotStart: number; slotEnd: number } | undefined {
  const slotMatch = slotText.match(/^자리\s*([1-9]\d*)(?:\s*[-~]\s*([1-9]\d*))?$/);
  if (!slotMatch) return undefined;
  const firstSlot = Number(slotMatch[1]);
  const secondSlot = slotMatch[2] ? Number(slotMatch[2]) : firstSlot;
  return {
    slotStart: Math.min(firstSlot, secondSlot),
    slotEnd: Math.max(firstSlot, secondSlot),
  };
}

function createLocationIssue(
  type: StorageLocationIssue['type'],
  rawText: string,
  message: string,
): StorageLocationIssue {
  return { type, rawText, message };
}

function validatePlacementRange(
  placement: StoragePlacement,
  facility: StorageFacility,
  rawText: string,
): StorageLocationIssue[] {
  const issues: StorageLocationIssue[] = [];
  if (
    placement.levelNumber !== null &&
    facility.levels.length > 0 &&
    placement.levelNumber > facility.levels.length
  ) {
    issues.push(
      createLocationIssue(
        'level-out-of-range',
        rawText,
        `${facility.label}은 현재 ${facility.levels.length}칸으로 설정되어 있습니다. 칸 수를 확인해주세요.`,
      ),
    );
  }

  if (placement.levelNumber !== null && placement.slotEnd !== null) {
    const level = facility.levels[placement.levelNumber - 1];
    if (level && placement.slotEnd > level.slotCount) {
      issues.push(
        createLocationIssue(
          'slot-out-of-range',
          rawText,
          `${facility.label} ${placement.levelNumber}번 칸은 현재 ${level.slotCount}자리로 설정되어 있습니다.`,
        ),
      );
    }
  }
  return issues;
}

function parsePlacementLine(
  rawLine: string,
  lineIndex: number,
  facilities: StorageFacility[],
  placementIdPrefix: string,
): ParsedStorageLocation {
  const { purpose, locationText } = separatePurposePrefix(rawLine);
  const segments = locationText.split('/').map((segment) => segment.trim()).filter(Boolean);
  const issues: StorageLocationIssue[] = [];

  if (segments.length === 0) {
    return {
      placements: [],
      issues: [createLocationIssue('unknown-format', rawLine, '보관위치가 비어 있습니다.')],
    };
  }

  let facility = findFacilityByLabel(segments[0], facilities);
  let levelNumber: number | null = null;
  if (!facility && segments.length === 1) {
    const legacyLocation = matchLegacyFacilityAndLevel(locationText, facilities);
    if (legacyLocation) {
      facility = legacyLocation.facility;
      levelNumber = legacyLocation.levelNumber;
    }
  }

  if (!facility) {
    return {
      placements: [],
      issues: [
        createLocationIssue(
          'unknown-facility',
          rawLine,
          `"${segments[0]}" 설비를 찾을 수 없습니다. 설비 이름을 확인해주세요.`,
        ),
      ],
    };
  }

  let slotStart: number | null = null;
  let slotEnd: number | null = null;
  let isBehind = false;

  for (const segment of segments.slice(1)) {
    const parsedLevelNumber = parseLevelNumber(segment, facility);
    if (parsedLevelNumber !== undefined) {
      if (levelNumber !== null) {
        issues.push(createLocationIssue('unknown-format', rawLine, '칸 위치가 두 번 입력되어 있습니다.'));
      } else {
        levelNumber = parsedLevelNumber;
      }
      continue;
    }

    const parsedSlotRange = parseSlotRange(segment);
    if (parsedSlotRange) {
      if (slotStart !== null) {
        issues.push(createLocationIssue('unknown-format', rawLine, '가로 자리가 두 번 입력되어 있습니다.'));
      } else {
        slotStart = parsedSlotRange.slotStart;
        slotEnd = parsedSlotRange.slotEnd;
      }
      continue;
    }

    if (segment === '뒤쪽') {
      isBehind = true;
      continue;
    }

    issues.push(
      createLocationIssue('unknown-format', rawLine, `"${segment}" 위치 표현을 해석할 수 없습니다.`),
    );
  }

  if (slotStart !== null && levelNumber === null) {
    issues.push(
      createLocationIssue('unknown-format', rawLine, '가로 자리를 입력하려면 먼저 칸을 지정해주세요.'),
    );
  }

  const placement: StoragePlacement = {
    id: `${placementIdPrefix}:placement:${lineIndex + 1}`,
    facilityId: facility.id,
    facilityLabel: facility.label ?? segments[0],
    levelNumber,
    slotStart,
    slotEnd,
    isBehind,
    purpose,
  };

  return {
    placements: [placement],
    issues: [...issues, ...validatePlacementRange(placement, facility, rawLine)],
  };
}

export function parseStorageLocation(
  location: string | null,
  facilities: StorageFacility[],
  placementIdPrefix: string,
): ParsedStorageLocation {
  if (!location?.trim()) return { placements: [], issues: [] };

  return location
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce<ParsedStorageLocation>(
      (result, line, lineIndex) => {
        const parsedLine = parsePlacementLine(line, lineIndex, facilities, placementIdPrefix);
        result.placements.push(...parsedLine.placements);
        result.issues.push(...parsedLine.issues);
        return result;
      },
      { placements: [], issues: [] },
    );
}

export function extractStorageFacilityLabels(location: string | null): string[] {
  if (!location?.trim()) return [];

  return location
    .split(/\r?\n/)
    .map((rawLine) => separatePurposePrefix(rawLine).locationText)
    .map((locationText) => {
      const firstSegment = locationText.split('/')[0]?.trim() ?? '';
      if (locationText.includes('/')) return firstSegment;
      const legacyMatch = firstSegment.match(/^(.+-[1-9]\d*)-[1-9]\d*$/);
      return legacyMatch?.[1] ?? firstSegment;
    })
    .filter(Boolean);
}
