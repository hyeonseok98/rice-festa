const XLSX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

interface WorkbookWritableStream {
  write(data: Blob): Promise<void>;
  close(): Promise<void>;
}

export interface WritableWorkbookFileHandle {
  name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<WorkbookWritableStream>;
}

interface WorkbookPickerWindow extends Window {
  showOpenFilePicker?: (options: {
    multiple: false;
    types: Array<{
      description: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<WritableWorkbookFileHandle[]>;
  showSaveFilePicker?: (options: {
    suggestedName: string;
    types: Array<{
      description: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<WritableWorkbookFileHandle>;
}

export type WorkbookPickerResult =
  | { status: 'opened'; file: File; writableFileHandle: WritableWorkbookFileHandle }
  | { status: 'cancelled' }
  | { status: 'unsupported' };

export type WorkbookCopySaveResult = 'saved' | 'cancelled';

function getWorkbookPickerWindow(): WorkbookPickerWindow {
  return window as WorkbookPickerWindow;
}

function isPickerCancellation(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function createWorkbookPickerTypes() {
  return [
    {
      description: 'Excel 통합 문서',
      accept: { [XLSX_MIME_TYPE]: ['.xlsx'] },
    },
  ];
}

export async function openWorkbookWithFilePicker(): Promise<WorkbookPickerResult> {
  const showOpenFilePicker = getWorkbookPickerWindow().showOpenFilePicker;
  if (!showOpenFilePicker) return { status: 'unsupported' };

  try {
    const [writableFileHandle] = await showOpenFilePicker.call(getWorkbookPickerWindow(), {
      multiple: false,
      types: createWorkbookPickerTypes(),
    });
    if (!writableFileHandle) return { status: 'cancelled' };
    return {
      status: 'opened',
      file: await writableFileHandle.getFile(),
      writableFileHandle,
    };
  } catch (error: unknown) {
    if (isPickerCancellation(error)) return { status: 'cancelled' };
    throw error;
  }
}

export async function overwriteWorkbookFile(
  writableFileHandle: WritableWorkbookFileHandle,
  workbookBytes: ArrayBuffer,
): Promise<void> {
  const writableStream = await writableFileHandle.createWritable();
  await writableStream.write(new Blob([workbookBytes], { type: XLSX_MIME_TYPE }));
  await writableStream.close();
}

function downloadWorkbookFile(fileName: string, workbookBytes: ArrayBuffer): void {
  const downloadUrl = URL.createObjectURL(new Blob([workbookBytes], { type: XLSX_MIME_TYPE }));
  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(downloadUrl);
}

export async function saveWorkbookCopy(
  suggestedFileName: string,
  workbookBytes: ArrayBuffer,
): Promise<WorkbookCopySaveResult> {
  const showSaveFilePicker = getWorkbookPickerWindow().showSaveFilePicker;
  if (!showSaveFilePicker) {
    downloadWorkbookFile(suggestedFileName, workbookBytes);
    return 'saved';
  }

  try {
    const writableFileHandle = await showSaveFilePicker.call(getWorkbookPickerWindow(), {
      suggestedName: suggestedFileName,
      types: createWorkbookPickerTypes(),
    });
    await overwriteWorkbookFile(writableFileHandle, workbookBytes);
    return 'saved';
  } catch (error: unknown) {
    if (isPickerCancellation(error)) return 'cancelled';
    throw error;
  }
}

function createFileTimestamp(): string {
  const parts = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${getPart('year')}${getPart('month')}${getPart('day')}-${getPart('hour')}${getPart('minute')}`;
}

function removeXlsxExtension(fileName: string): string {
  return fileName.replace(/\.xlsx$/i, '');
}

export function createBackupFileName(fileName: string): string {
  return `${removeXlsxExtension(fileName)}-백업-${createFileTimestamp()}.xlsx`;
}

export function createChangedWorkbookFileName(fileName: string): string {
  return `${removeXlsxExtension(fileName)}-변경본-${createFileTimestamp()}.xlsx`;
}
