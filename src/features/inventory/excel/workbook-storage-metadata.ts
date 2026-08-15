import type { WorkBook } from 'xlsx';

import type {
  StorageConfiguration,
  StorageFacility,
  StorageLevel,
  StorageLevelKind,
  StorageType,
} from '../model/storage';

interface StorageMetadataReadResult {
  storageConfiguration: StorageConfiguration | null;
  warningMessage: string | null;
}

const STORAGE_METADATA_SCHEMA_KEY = 'RiceStorageSchema';
const STORAGE_METADATA_CHUNK_COUNT_KEY = 'RiceStorageChunkCount';
const STORAGE_METADATA_CHECKSUM_KEY = 'RiceStorageChecksum';
const STORAGE_METADATA_CHUNK_PREFIX = 'RiceStorageChunk';
const STORAGE_METADATA_CHUNK_LENGTH = 200;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStorageType(value: unknown): value is StorageType {
  return (
    value === 'fridge' ||
    value === 'freezer' ||
    value === 'rack' ||
    value === 'table' ||
    value === 'shelf'
  );
}

function isStorageLevelKind(value: unknown): value is StorageLevelKind {
  return value === 'shelf' || value === 'floor' || value === 'top' || value === 'bottom';
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return isNonNegativeInteger(value) && value > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isStorageLevel(value: unknown): value is StorageLevel {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    isNonNegativeInteger(value.order) &&
    isStorageLevelKind(value.kind) &&
    isPositiveInteger(value.slotCount)
  );
}

function isStorageFacility(value: unknown): value is StorageFacility {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    isStorageType(value.type) &&
    (value.label === null || typeof value.label === 'string') &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y) &&
    isFiniteNumber(value.width) &&
    value.width > 0 &&
    isFiniteNumber(value.height) &&
    value.height > 0 &&
    Array.isArray(value.levels) &&
    value.levels.every(isStorageLevel) &&
    value.levels.every((level) =>
      level.order > 0 || (value.type === 'rack' && level.order === 0 && level.kind === 'top'),
    ) &&
    typeof value.needsLevelReview === 'boolean'
  );
}

function isStorageConfiguration(value: unknown): value is StorageConfiguration {
  if (!isRecord(value)) return false;
  return (
    value.schemaVersion === 1 &&
    isPositiveInteger(value.layoutWidth) &&
    isPositiveInteger(value.layoutHeight) &&
    Array.isArray(value.facilities) &&
    value.facilities.every(isStorageFacility)
  );
}

function calculateMetadataChecksum(serializedConfiguration: string): string {
  let checksum = 2_166_136_261;
  for (let index = 0; index < serializedConfiguration.length; index += 1) {
    checksum ^= serializedConfiguration.charCodeAt(index);
    checksum = Math.imul(checksum, 16_777_619);
  }
  return (checksum >>> 0).toString(16).padStart(8, '0');
}

function decodeUtf8Mojibake(value: string): string | null {
  const bytes = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code > 0xff) return null;
    bytes[index] = code;
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function recoverSerializedConfiguration(
  chunks: string[],
  expectedChecksum: string,
): string | null {
  const serializedConfiguration = chunks.join('');
  if (calculateMetadataChecksum(serializedConfiguration) === expectedChecksum) {
    return serializedConfiguration;
  }

  const decodedChunks = chunks.map(decodeUtf8Mojibake);
  if (decodedChunks.some((chunk) => chunk === null)) return null;
  const decodedConfiguration = (decodedChunks as string[]).join('');
  return calculateMetadataChecksum(decodedConfiguration) === expectedChecksum
    ? decodedConfiguration
    : null;
}

function createMetadataChunks(serializedConfiguration: string): string[] {
  const chunks: string[] = [];
  for (let index = 0; index < serializedConfiguration.length; index += STORAGE_METADATA_CHUNK_LENGTH) {
    chunks.push(serializedConfiguration.slice(index, index + STORAGE_METADATA_CHUNK_LENGTH));
  }
  return chunks;
}

function getChunkKey(chunkIndex: number): string {
  return `${STORAGE_METADATA_CHUNK_PREFIX}${String(chunkIndex + 1).padStart(3, '0')}`;
}

export function readStorageConfigurationMetadata(workbook: WorkBook): StorageMetadataReadResult {
  const customProperties = workbook.Custprops as Record<string, unknown> | undefined;
  if (!customProperties || customProperties[STORAGE_METADATA_SCHEMA_KEY] === undefined) {
    return { storageConfiguration: null, warningMessage: null };
  }

  if (Number(customProperties[STORAGE_METADATA_SCHEMA_KEY]) !== 1) {
    return {
      storageConfiguration: null,
      warningMessage: '지원하지 않는 설비 설정 버전입니다. 기본 배치로 열었습니다.',
    };
  }

  const chunkCount = Number(customProperties[STORAGE_METADATA_CHUNK_COUNT_KEY]);
  if (!Number.isInteger(chunkCount) || chunkCount < 1) {
    return {
      storageConfiguration: null,
      warningMessage: 'Excel 내부 설비 설정이 올바르지 않아 기본 배치로 열었습니다.',
    };
  }

  const chunks = Array.from({ length: chunkCount }, (_, chunkIndex) =>
    customProperties[getChunkKey(chunkIndex)],
  );
  if (chunks.some((chunk) => typeof chunk !== 'string')) {
    return {
      storageConfiguration: null,
      warningMessage: 'Excel 내부 설비 설정 일부가 없어 기본 배치로 열었습니다.',
    };
  }

  const expectedChecksum = String(customProperties[STORAGE_METADATA_CHECKSUM_KEY] ?? '');
  const serializedConfiguration = recoverSerializedConfiguration(chunks as string[], expectedChecksum);
  if (serializedConfiguration === null) {
    return {
      storageConfiguration: null,
      warningMessage: 'Excel 내부 설비 설정이 손상되어 기본 배치로 열었습니다.',
    };
  }

  try {
    const parsedConfiguration: unknown = JSON.parse(serializedConfiguration);
    if (!isStorageConfiguration(parsedConfiguration)) {
      return {
        storageConfiguration: null,
        warningMessage: 'Excel 내부 설비 설정 형식을 확인할 수 없어 기본 배치로 열었습니다.',
      };
    }
    return { storageConfiguration: parsedConfiguration, warningMessage: null };
  } catch {
    return {
      storageConfiguration: null,
      warningMessage: 'Excel 내부 설비 설정을 읽을 수 없어 기본 배치로 열었습니다.',
    };
  }
}

export function writeStorageConfigurationMetadata(
  workbook: WorkBook,
  storageConfiguration: StorageConfiguration,
): void {
  const customProperties = (workbook.Custprops ?? {}) as Record<string, unknown>;
  for (const propertyName of Object.keys(customProperties)) {
    if (propertyName.startsWith(STORAGE_METADATA_CHUNK_PREFIX)) delete customProperties[propertyName];
  }

  Object.assign(
    customProperties,
    createStorageConfigurationMetadataProperties(storageConfiguration),
  );
  workbook.Custprops = customProperties;
}

export function createStorageConfigurationMetadataProperties(
  storageConfiguration: StorageConfiguration,
): Record<string, string | number> {
  const serializedConfiguration = JSON.stringify(storageConfiguration);
  const chunks = createMetadataChunks(serializedConfiguration);
  const properties: Record<string, string | number> = {
    [STORAGE_METADATA_SCHEMA_KEY]: 1,
    [STORAGE_METADATA_CHUNK_COUNT_KEY]: chunks.length,
    [STORAGE_METADATA_CHECKSUM_KEY]: calculateMetadataChecksum(serializedConfiguration),
  };
  chunks.forEach((chunk, chunkIndex) => {
    properties[getChunkKey(chunkIndex)] = chunk;
  });
  return properties;
}
