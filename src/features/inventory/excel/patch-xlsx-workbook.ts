import { strFromU8, strToU8, unzipSync, zipSync, type Unzipped } from 'fflate';

export type XlsxCellPatchValue =
  | { type: 'number'; value: number }
  | { type: 'string'; value: string };

export interface XlsxCellPatch {
  sheetName: string;
  address: string;
  value: XlsxCellPatchValue;
}

const CUSTOM_PROPERTIES_PATH = 'docProps/custom.xml';
const CUSTOM_PROPERTIES_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.custom-properties+xml';
const CUSTOM_PROPERTIES_RELATIONSHIP_TYPE =
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships/custom-properties';
const CUSTOM_PROPERTY_FORMAT_ID = '{D5CDD505-2E9C-101B-9397-08002B2CF9AE}';

function getArchiveText(archive: Unzipped, path: string): string {
  const entry = archive[path];
  if (!entry) throw new Error(`Excel 내부 파일을 찾을 수 없습니다: ${path}`);
  return strFromU8(entry);
}

function setArchiveText(archive: Unzipped, path: string, value: string): void {
  archive[path] = strToU8(value);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeXmlText(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function escapeXmlAttribute(value: string): string {
  return escapeXmlText(value)
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function decodeXml(value: string): string {
  return value.replaceAll(
    /&(?:#x([0-9a-f]+)|#(\d+)|amp|lt|gt|quot|apos);/gi,
    (entity, hexadecimal: string | undefined, decimal: string | undefined) => {
      if (hexadecimal) return String.fromCodePoint(Number.parseInt(hexadecimal, 16));
      if (decimal) return String.fromCodePoint(Number.parseInt(decimal, 10));
      const namedEntities: Record<string, string> = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&apos;': "'",
      };
      return namedEntities[entity.toLocaleLowerCase()] ?? entity;
    },
  );
}

function getXmlAttribute(attributes: string, name: string): string | null {
  const escapedName = escapeRegExp(name);
  const match = attributes.match(
    new RegExp(`(?:^|\\s)${escapedName}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`),
  );
  const value = match?.[1] ?? match?.[2];
  return value === undefined ? null : decodeXml(value);
}

function normalizeArchivePath(baseDirectory: string, target: string): string {
  const normalizedTarget = target.replaceAll('\\', '/');
  const combinedPath = normalizedTarget.startsWith('/')
    ? normalizedTarget.slice(1)
    : `${baseDirectory}/${normalizedTarget}`;
  const segments: string[] = [];
  for (const segment of combinedPath.split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') segments.pop();
    else segments.push(segment);
  }
  return segments.join('/');
}

function getWorksheetPathsByName(archive: Unzipped): Map<string, string> {
  const workbookXml = getArchiveText(archive, 'xl/workbook.xml');
  const workbookRelationshipsXml = getArchiveText(archive, 'xl/_rels/workbook.xml.rels');
  const targetByRelationshipId = new Map<string, string>();

  for (const relationshipMatch of workbookRelationshipsXml.matchAll(/<Relationship\b([^>]*)\/?\s*>/g)) {
    const relationshipId = getXmlAttribute(relationshipMatch[1], 'Id');
    const target = getXmlAttribute(relationshipMatch[1], 'Target');
    if (relationshipId && target) targetByRelationshipId.set(relationshipId, target);
  }

  const worksheetPaths = new Map<string, string>();
  for (const sheetMatch of workbookXml.matchAll(/<sheet\b([^>]*)\/?\s*>/g)) {
    const sheetName = getXmlAttribute(sheetMatch[1], 'name');
    const relationshipId = getXmlAttribute(sheetMatch[1], 'r:id');
    const target = relationshipId ? targetByRelationshipId.get(relationshipId) : null;
    if (sheetName && target) {
      worksheetPaths.set(sheetName, normalizeArchivePath('xl', target));
    }
  }
  return worksheetPaths;
}

function getCellCoordinates(address: string): { column: number; row: number } {
  const match = address.toUpperCase().match(/^([A-Z]+)([1-9]\d*)$/);
  if (!match) throw new Error(`올바르지 않은 Excel 셀 주소입니다: ${address}`);
  const column = Array.from(match[1]).reduce(
    (result, character) => result * 26 + character.charCodeAt(0) - 64,
    0,
  );
  return { column, row: Number(match[2]) };
}

function removeCellTypeAttribute(attributes: string): string {
  return attributes.replace(/\s+t\s*=\s*(?:"[^"]*"|'[^']*')/g, '');
}

function createCellXml(address: string, value: XlsxCellPatchValue, attributes?: string): string {
  const normalizedAttributes = attributes
    ? removeCellTypeAttribute(attributes)
    : ` r="${escapeXmlAttribute(address)}"`;
  if (value.type === 'number') {
    if (!Number.isFinite(value.value)) throw new Error(`${address} 셀에 올바르지 않은 숫자가 있습니다.`);
    return `<c${normalizedAttributes} t="n"><v>${value.value}</v></c>`;
  }
  const preserveSpace = /^\s|\s$/.test(value.value) ? ' xml:space="preserve"' : '';
  return `<c${normalizedAttributes} t="inlineStr"><is><t${preserveSpace}>${escapeXmlText(value.value)}</t></is></c>`;
}

function replaceExistingCell(
  worksheetXml: string,
  address: string,
  value: XlsxCellPatchValue,
): string | null {
  const escapedAddress = escapeRegExp(address);
  const cellPattern = new RegExp(
    `<c\\b[^>]*\\br=(?:"${escapedAddress}"|'${escapedAddress}')[^>]*(?:\\/>|>[\\s\\S]*?<\\/c>)`,
  );
  const cellMatch = worksheetXml.match(cellPattern);
  if (!cellMatch || cellMatch.index === undefined) return null;
  const openingTagMatch = cellMatch[0].match(/^<c\b([^>]*?)(?:\/>|>)/);
  if (!openingTagMatch) return null;
  const replacement = createCellXml(address, value, openingTagMatch[1]);
  return `${worksheetXml.slice(0, cellMatch.index)}${replacement}${worksheetXml.slice(cellMatch.index + cellMatch[0].length)}`;
}

function insertCellIntoRow(rowXml: string, address: string, value: XlsxCellPatchValue): string {
  const nextCell = Array.from(rowXml.matchAll(/<c\b([^>]*)/g)).find((cellMatch) => {
    const existingAddress = getXmlAttribute(cellMatch[1], 'r');
    return existingAddress && getCellCoordinates(existingAddress).column > getCellCoordinates(address).column;
  });
  const cellXml = createCellXml(address, value);
  if (nextCell?.index !== undefined) {
    return `${rowXml.slice(0, nextCell.index)}${cellXml}${rowXml.slice(nextCell.index)}`;
  }
  return rowXml.replace('</row>', `${cellXml}</row>`);
}

function insertMissingCell(
  worksheetXml: string,
  address: string,
  value: XlsxCellPatchValue,
): string {
  const { row } = getCellCoordinates(address);
  const rowPattern = new RegExp(
    `<row\\b[^>]*\\br=(?:"${row}"|'${row}')[^>]*(?:\\/>|>[\\s\\S]*?<\\/row>)`,
  );
  const rowMatch = worksheetXml.match(rowPattern);
  if (rowMatch?.index !== undefined) {
    const expandedRow = rowMatch[0].endsWith('/>')
      ? `${rowMatch[0].slice(0, -2)}>${createCellXml(address, value)}</row>`
      : insertCellIntoRow(rowMatch[0], address, value);
    return `${worksheetXml.slice(0, rowMatch.index)}${expandedRow}${worksheetXml.slice(rowMatch.index + rowMatch[0].length)}`;
  }

  const sheetDataEndIndex = worksheetXml.indexOf('</sheetData>');
  if (sheetDataEndIndex < 0) throw new Error('Excel 시트 데이터 영역을 찾을 수 없습니다.');
  const newRowXml = `<row r="${row}">${createCellXml(address, value)}</row>`;
  const laterRow = Array.from(worksheetXml.matchAll(/<row\b([^>]*)/g)).find((match) => {
    const existingRow = getXmlAttribute(match[1], 'r');
    return existingRow !== null && Number(existingRow) > row;
  });
  const insertionIndex = laterRow?.index ?? sheetDataEndIndex;
  return `${worksheetXml.slice(0, insertionIndex)}${newRowXml}${worksheetXml.slice(insertionIndex)}`;
}

function patchWorksheetXml(worksheetXml: string, patches: XlsxCellPatch[]): string {
  return patches.reduce((currentXml, patch) => {
    const normalizedAddress = patch.address.toUpperCase();
    return (
      replaceExistingCell(currentXml, normalizedAddress, patch.value) ??
      insertMissingCell(currentXml, normalizedAddress, patch.value)
    );
  }, worksheetXml);
}

function createCustomPropertyXml(
  propertyName: string,
  propertyValue: string | number,
  propertyId: number,
): string {
  const valueXml = typeof propertyValue === 'number'
    ? Number.isInteger(propertyValue)
      ? `<vt:i4>${propertyValue}</vt:i4>`
      : `<vt:r8>${propertyValue}</vt:r8>`
    : `<vt:lpwstr>${escapeXmlText(propertyValue)}</vt:lpwstr>`;
  return `<property fmtid="${CUSTOM_PROPERTY_FORMAT_ID}" pid="${propertyId}" name="${escapeXmlAttribute(propertyName)}">${valueXml}</property>`;
}

function patchCustomPropertiesXml(
  currentXml: string | null,
  properties: Record<string, string | number>,
): string {
  const baseXml = currentXml ??
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"></Properties>';
  const propertyNames = new Set(Object.keys(properties));
  let highestPropertyId = 1;
  const withoutReplacedProperties = baseXml.replace(
    /<property\b[^>]*>[\s\S]*?<\/property>/g,
    (propertyXml) => {
      const openingTag = propertyXml.match(/^<property\b([^>]*)>/)?.[1] ?? '';
      const propertyId = Number(getXmlAttribute(openingTag, 'pid'));
      if (Number.isInteger(propertyId)) highestPropertyId = Math.max(highestPropertyId, propertyId);
      const propertyName = getXmlAttribute(openingTag, 'name');
      const shouldReplace =
        propertyName !== null &&
        (propertyNames.has(propertyName) || propertyName.startsWith('RiceStorageChunk'));
      return shouldReplace ? '' : propertyXml;
    },
  );

  const additions = Object.entries(properties)
    .map(([propertyName, propertyValue], index) =>
      createCustomPropertyXml(propertyName, propertyValue, highestPropertyId + index + 1),
    )
    .join('');
  if (!withoutReplacedProperties.includes('</Properties>')) {
    throw new Error('Excel 사용자 지정 속성 형식을 확인할 수 없습니다.');
  }
  return withoutReplacedProperties.replace('</Properties>', `${additions}</Properties>`);
}

function ensureCustomPropertiesContentType(archive: Unzipped): void {
  const path = '[Content_Types].xml';
  const contentTypesXml = getArchiveText(archive, path);
  if (contentTypesXml.includes(CUSTOM_PROPERTIES_CONTENT_TYPE)) return;
  if (!contentTypesXml.includes('</Types>')) {
    throw new Error('Excel 콘텐츠 형식을 확인할 수 없습니다.');
  }
  const overrideXml = `<Override PartName="/${CUSTOM_PROPERTIES_PATH}" ContentType="${CUSTOM_PROPERTIES_CONTENT_TYPE}"/>`;
  setArchiveText(archive, path, contentTypesXml.replace('</Types>', `${overrideXml}</Types>`));
}

function ensureCustomPropertiesRelationship(archive: Unzipped): void {
  const path = '_rels/.rels';
  const relationshipsXml = getArchiveText(archive, path);
  if (relationshipsXml.includes(CUSTOM_PROPERTIES_RELATIONSHIP_TYPE)) return;
  if (!relationshipsXml.includes('</Relationships>')) {
    throw new Error('Excel 관계 정보를 확인할 수 없습니다.');
  }
  const usedRelationshipIds = new Set(
    Array.from(relationshipsXml.matchAll(/<Relationship\b([^>]*)\/?\s*>/g))
      .map((match) => getXmlAttribute(match[1], 'Id'))
      .filter((relationshipId): relationshipId is string => relationshipId !== null),
  );
  let relationshipIndex = usedRelationshipIds.size + 1;
  while (usedRelationshipIds.has(`rId${relationshipIndex}`)) relationshipIndex += 1;
  const relationshipXml = `<Relationship Id="rId${relationshipIndex}" Type="${CUSTOM_PROPERTIES_RELATIONSHIP_TYPE}" Target="${CUSTOM_PROPERTIES_PATH}"/>`;
  setArchiveText(
    archive,
    path,
    relationshipsXml.replace('</Relationships>', `${relationshipXml}</Relationships>`),
  );
}

function patchCustomProperties(
  archive: Unzipped,
  properties: Record<string, string | number>,
): void {
  const currentXml = archive[CUSTOM_PROPERTIES_PATH]
    ? getArchiveText(archive, CUSTOM_PROPERTIES_PATH)
    : null;
  setArchiveText(
    archive,
    CUSTOM_PROPERTIES_PATH,
    patchCustomPropertiesXml(currentXml, properties),
  );
  ensureCustomPropertiesContentType(archive);
  ensureCustomPropertiesRelationship(archive);
}

export function patchXlsxWorkbook(
  originalWorkbookBytes: ArrayBuffer,
  cellPatches: XlsxCellPatch[],
  customProperties: Record<string, string | number>,
): ArrayBuffer {
  const archive = unzipSync(new Uint8Array(originalWorkbookBytes));
  const worksheetPathsByName = getWorksheetPathsByName(archive);
  const patchesByWorksheetPath = new Map<string, XlsxCellPatch[]>();

  for (const patch of cellPatches) {
    const worksheetPath = worksheetPathsByName.get(patch.sheetName);
    if (!worksheetPath) throw new Error(`Excel 시트를 찾을 수 없습니다: ${patch.sheetName}`);
    const worksheetPatches = patchesByWorksheetPath.get(worksheetPath) ?? [];
    worksheetPatches.push(patch);
    patchesByWorksheetPath.set(worksheetPath, worksheetPatches);
  }

  for (const [worksheetPath, worksheetPatches] of patchesByWorksheetPath) {
    const worksheetXml = getArchiveText(archive, worksheetPath);
    setArchiveText(archive, worksheetPath, patchWorksheetXml(worksheetXml, worksheetPatches));
  }

  patchCustomProperties(archive, customProperties);
  const patchedWorkbook = zipSync(archive, { level: 6 });
  return patchedWorkbook.buffer.slice(
    patchedWorkbook.byteOffset,
    patchedWorkbook.byteOffset + patchedWorkbook.byteLength,
  );
}
