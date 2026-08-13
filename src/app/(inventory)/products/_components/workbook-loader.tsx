'use client';

import { FileSpreadsheet, Upload } from 'lucide-react';
import { useRef, useState } from 'react';

import { useInventorySession } from '@/features/inventory/state/inventory-context';
import { Button } from '@/shared/ui/button';

export function WorkbookLoader() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { status, errorMessage, validationErrors, loadWorkbook } = useInventorySession();

  const handleFile = async (file: File | undefined) => {
    if (file) {
      await loadWorkbook(file);
    }
  };

  return (
    <section className="mx-auto max-w-180 pt-8 md:pt-16" aria-labelledby="workbook-loader-title">
      <div className="mb-9 text-center">
        <p className="mb-3 text-sm font-bold text-primary">로컬 Excel로 바로 시작</p>
        <h1 id="workbook-loader-title" className="text-3xl font-extrabold tracking-tight md:text-4xl">
          출품작 목록을 불러와주세요
        </h1>
        <p className="mx-auto mt-4 max-w-140 text-base leading-7 text-muted-foreground">
          파일은 서버에 업로드되지 않고 현재 브라우저에서만 열립니다. 수정 후 별도의 변경본으로
          다운로드할 수 있습니다.
        </p>
      </div>

      <div
        className={`rounded-2xl border-2 border-dashed bg-surface px-6 py-12 text-center transition-colors ${
          isDragging ? 'border-primary bg-primary-soft' : 'border-border-strong'
        }`}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (event.currentTarget === event.target) setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          void handleFile(event.dataTransfer.files[0]);
        }}
      >
        <div className="mx-auto mb-5 flex size-15 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <FileSpreadsheet aria-hidden="true" size={30} />
        </div>
        <p className="text-lg font-bold">.xlsx 파일을 끌어놓거나 직접 선택하세요</p>
        <p className="mt-2 text-sm text-muted-foreground">
          우리술과 쌀가공식품 시트의 수량·보관위치·수령일·비고를 한 번에 확인합니다.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          onChange={(event) => {
            void handleFile(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
        <Button
          className="mt-6"
          disabled={status === 'loading'}
          onClick={() => inputRef.current?.click()}
        >
          <Upload aria-hidden="true" size={18} />
          {status === 'loading' ? '파일 확인 중…' : 'Excel 파일 선택'}
        </Button>
      </div>

      {status === 'error' ? (
        <div className="mt-5 rounded-xl border border-danger bg-danger-soft p-5" role="alert">
          <h2 className="font-bold text-danger">파일을 불러오지 못했습니다</h2>
          <p className="mt-1 text-sm text-foreground">{errorMessage}</p>
          {validationErrors.length > 0 ? (
            <ul className="mt-4 max-h-72 space-y-3 overflow-y-auto border-t border-danger/25 pt-4">
              {validationErrors.map((error, index) => (
                <li key={`${error.rowNumber}-${error.columnName}-${index}`} className="text-sm">
                  <p className="font-bold">
                    {error.rowNumber ? `${error.rowNumber}행` : '파일'}
                    {error.columnName ? ` · ${error.columnName}` : ''}
                  </p>
                  <p className="mt-0.5 text-muted-foreground">{error.message}</p>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
