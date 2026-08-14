'use client';

import { useEffect, useId, useRef, useState } from 'react';

import { useInventorySession } from '@/features/inventory/state/inventory-context';
import { Button } from '@/shared/ui/button';

export function BackupDecisionDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSavingBackup, setIsSavingBackup] = useState(false);
  const {
    isBackupDecisionOpen,
    fileName,
    saveBackupBeforeEditing,
    continueEditingWithoutBackup,
    cancelPendingEdit,
  } = useInventorySession();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isBackupDecisionOpen && !dialog.open) {
      setErrorMessage(null);
      dialog.showModal();
    } else if (!isBackupDecisionOpen && dialog.open) {
      dialog.close();
    }
  }, [isBackupDecisionOpen]);

  const handleSaveBackup = async () => {
    setIsSavingBackup(true);
    setErrorMessage(null);
    try {
      await saveBackupBeforeEditing();
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : '백업본을 저장하지 못했습니다.');
    } finally {
      setIsSavingBackup(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className="m-auto w-[calc(100%_-_2rem)] max-w-112 rounded-2xl border-0 bg-surface p-0 text-foreground shadow-2xl"
      onCancel={(event) => {
        event.preventDefault();
        cancelPendingEdit();
      }}
    >
      <div className="p-6 md:p-7">
        <p className="text-sm font-bold text-primary">첫 편집 전 확인</p>
        <h2 id={titleId} className="mt-2 text-xl font-extrabold tracking-tight">
          원본 백업을 저장할까요?
        </h2>
        <p id={descriptionId} className="mt-3 text-sm leading-6 text-muted-foreground">
          {fileName ? `${fileName}의 ` : ''}처음 불러온 상태를 별도 파일로 보관합니다. 이 파일을
          열어둔 동안에는 한 번만 확인합니다.
        </p>

        {errorMessage ? (
          <p className="mt-4 rounded-xl bg-danger-soft p-3 text-sm font-semibold text-danger" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <div className="mt-7 grid gap-2 sm:grid-cols-2">
          <Button
            variant="secondary"
            disabled={isSavingBackup}
            onClick={continueEditingWithoutBackup}
          >
            백업 없이 편집
          </Button>
          <Button disabled={isSavingBackup} onClick={() => void handleSaveBackup()}>
            {isSavingBackup ? '백업 저장 중…' : '백업 후 편집'}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
