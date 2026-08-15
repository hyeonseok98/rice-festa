'use client';

import {
  AlertCircle,
  CheckCircle2,
  Copy,
  FileSpreadsheet,
  LoaderCircle,
  MoreHorizontal,
  RotateCcw,
  Save,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';

import { useInventorySession } from '@/features/inventory/state/inventory-context';
import type { InventorySessionStatus } from '@/features/inventory/state/inventory-reducer';

interface WorkbookStatusPresentation {
  label: string;
  toneClassName: string;
}

interface ActionFeedback {
  kind: 'success' | 'error';
  message: string;
}

function getWorkbookStatusPresentation(
  status: InventorySessionStatus,
  isDirty: boolean,
  canOverwriteOriginal: boolean,
): WorkbookStatusPresentation {
  if (status === 'loading') {
    return { label: '파일 확인 중', toneClassName: 'text-muted-foreground' };
  }
  if (status === 'saving') {
    return { label: '저장 중', toneClassName: 'text-primary' };
  }
  if (status === 'error') {
    return { label: '파일 확인 필요', toneClassName: 'text-danger' };
  }
  if (isDirty) {
    return { label: '변경사항 있음', toneClassName: 'text-warning' };
  }
  if (status === 'ready') {
    return {
      label: canOverwriteOriginal ? '원본과 연결됨' : '변경본으로 저장',
      toneClassName: 'text-muted-foreground',
    };
  }
  return { label: '파일을 선택해 주세요', toneClassName: 'text-muted-foreground' };
}

export function WorkbookSessionControl() {
  const {
    fileName,
    status,
    isDirty,
    canOverwriteOriginal,
    saveOriginalWorkbook,
  } = useInventorySession();
  const workbookStatus = getWorkbookStatusPresentation(status, isDirty, canOverwriteOriginal);
  const hasLoadedWorkbook = Boolean(fileName && (status === 'ready' || status === 'saving'));

  if (!fileName) {
    return (
      <p className="hidden whitespace-nowrap text-xs font-semibold text-muted-foreground sm:block">
        파일을 선택해 주세요
      </p>
    );
  }

  return (
    <div className="flex min-w-0 items-center justify-end gap-2">
      <div className="hidden min-w-0 max-w-56 text-right xl:block">
        <p className="truncate text-sm font-semibold" title={fileName}>
          {fileName}
        </p>
        <p className={`mt-0.5 text-xs font-medium ${workbookStatus.toneClassName}`} aria-live="polite">
          {workbookStatus.label}
        </p>
      </div>

      {hasLoadedWorkbook ? (
        status === 'saving' ? (
          <div className="flex min-h-10 items-center gap-2 whitespace-nowrap rounded-lg bg-primary-soft px-3 text-sm font-bold text-primary" role="status">
            <LoaderCircle aria-hidden="true" className="animate-spin" size={17} />
            <span className="hidden sm:inline">저장 중</span>
          </div>
        ) : isDirty ? (
          <button
            type="button"
            className="inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-primary px-3.5 text-sm font-bold text-white hover:bg-primary-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary"
            title={canOverwriteOriginal ? '현재 원본 Excel 파일에 저장합니다.' : '변경된 Excel 파일을 별도로 저장합니다.'}
            onClick={() => void saveOriginalWorkbook()}
          >
            <Save aria-hidden="true" size={17} />
            저장
          </button>
        ) : (
          <div
            className="flex size-10 items-center justify-center gap-1.5 whitespace-nowrap text-sm font-semibold text-success sm:w-auto sm:px-2"
            role="status"
            title="저장됨"
          >
            <CheckCircle2 aria-hidden="true" size={17} />
            <span className="hidden sm:inline">저장됨</span>
          </div>
        )
      ) : (
        <p className={`whitespace-nowrap text-xs font-semibold ${workbookStatus.toneClassName}`}>
          {workbookStatus.label}
        </p>
      )}

      {hasLoadedWorkbook ? <WorkbookActionMenu /> : null}
    </div>
  );
}

function WorkbookActionMenu() {
  const {
    fileName,
    status,
    isDirty,
    canOverwriteOriginal,
    saveInitialWorkbookBackup,
    saveChangedWorkbookCopy,
    restoreInitialWorkbook,
  } = useInventorySession();
  const [isOpen, setIsOpen] = useState(false);
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const menuRootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstMenuItemRef = useRef<HTMLButtonElement>(null);
  const isActionDisabled = status === 'saving';

  useEffect(() => {
    if (!isOpen) return;

    const closeMenuFromOutside = (event: PointerEvent) => {
      if (!menuRootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeMenuWithEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener('pointerdown', closeMenuFromOutside);
    document.addEventListener('keydown', closeMenuWithEscape);
    firstMenuItemRef.current?.focus();
    return () => {
      document.removeEventListener('pointerdown', closeMenuFromOutside);
      document.removeEventListener('keydown', closeMenuWithEscape);
    };
  }, [isOpen]);

  const runWorkbookAction = (action: () => Promise<void>) => {
    setIsOpen(false);
    triggerRef.current?.focus();
    void action();
  };

  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const enabledMenuItems = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)'),
    );
    if (enabledMenuItems.length === 0) return;
    const currentIndex = enabledMenuItems.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === 'Home') enabledMenuItems[0]?.focus();
    if (event.key === 'End') enabledMenuItems.at(-1)?.focus();
    if (event.key === 'ArrowDown') enabledMenuItems[(currentIndex + 1) % enabledMenuItems.length]?.focus();
    if (event.key === 'ArrowUp') enabledMenuItems[(currentIndex - 1 + enabledMenuItems.length) % enabledMenuItems.length]?.focus();
  };

  return (
    <>
      <div ref={menuRootRef} className="relative">
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-label="파일 관리 메뉴"
          title="파일 관리"
          className="inline-flex size-10 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground hover:bg-surface-hover hover:text-foreground focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary"
          onClick={() => setIsOpen((current) => !current)}
        >
          <MoreHorizontal aria-hidden="true" size={20} />
        </button>

        {isOpen ? (
          <div
            role="menu"
            aria-label="파일 관리"
            className="absolute top-12 right-0 z-50 w-[min(19.5rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-surface p-2 shadow-xl"
            onKeyDown={handleMenuKeyDown}
          >
            <div className="border-b border-border px-3 py-2.5">
              <p className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                <FileSpreadsheet aria-hidden="true" size={15} /> 현재 파일
              </p>
              <p className="mt-1.5 truncate text-sm font-semibold" title={fileName ?? undefined}>
                {fileName}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {canOverwriteOriginal ? '원본 파일에 직접 저장할 수 있습니다.' : '저장하면 변경본 파일이 생성됩니다.'}
              </p>
            </div>

            <div className="py-1.5">
              <WorkbookMenuItem
                ref={firstMenuItemRef}
                icon={<ShieldCheck aria-hidden="true" size={18} />}
                label="원본 백업본 저장"
                description="처음 불러온 파일을 별도로 보관합니다."
                disabled={isActionDisabled}
                onClick={() => runWorkbookAction(saveInitialWorkbookBackup)}
              />
              <WorkbookMenuItem
                icon={<Copy aria-hidden="true" size={18} />}
                label="변경본 사본 저장"
                description="현재 변경사항이 담긴 사본을 만듭니다."
                disabled={isActionDisabled || !isDirty}
                onClick={() => runWorkbookAction(saveChangedWorkbookCopy)}
              />
            </div>

            <div className="border-t border-border pt-1.5">
              <WorkbookMenuItem
                icon={<RotateCcw aria-hidden="true" size={18} />}
                label="처음 불러온 상태로 되돌리기"
                description="저장하지 않은 변경사항을 되돌립니다."
                tone="danger"
                disabled={isActionDisabled || !isDirty}
                onClick={() => {
                  setIsOpen(false);
                  setIsRestoreDialogOpen(true);
                }}
              />
            </div>
          </div>
        ) : null}
      </div>

      <RestoreWorkbookDialog
        isOpen={isRestoreDialogOpen}
        onCancel={() => {
          setIsRestoreDialogOpen(false);
          triggerRef.current?.focus();
        }}
        onConfirm={() => {
          setIsRestoreDialogOpen(false);
          void restoreInitialWorkbook();
        }}
      />
    </>
  );
}

function WorkbookMenuItem({
  ref,
  icon,
  label,
  description,
  tone = 'default',
  ...buttonProps
}: {
  ref?: React.Ref<HTMLButtonElement>;
  icon: ReactNode;
  label: string;
  description: string;
  tone?: 'default' | 'danger';
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      ref={ref}
      type="button"
      role="menuitem"
      className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left focus-visible:outline-3 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40 ${
        tone === 'danger'
          ? 'text-danger hover:bg-danger-soft'
          : 'text-foreground hover:bg-surface-hover'
      }`}
      {...buttonProps}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-bold">{label}</span>
        <span className={`mt-0.5 block text-xs leading-5 ${tone === 'danger' ? 'text-danger' : 'text-muted-foreground'}`}>
          {description}
        </span>
      </span>
    </button>
  );
}

function RestoreWorkbookDialog({
  isOpen,
  onCancel,
  onConfirm,
}: {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className="m-auto w-[calc(100%_-_2rem)] max-w-112 rounded-2xl border-0 bg-surface p-0 text-foreground shadow-2xl"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <div className="p-6 md:p-7">
        <div className="flex size-10 items-center justify-center rounded-full bg-danger-soft text-danger">
          <RotateCcw aria-hidden="true" size={20} />
        </div>
        <h2 id={titleId} className="mt-4 text-xl font-extrabold tracking-tight">
          처음 불러온 상태로 되돌릴까요?
        </h2>
        <p id={descriptionId} className="mt-3 text-sm leading-6 text-muted-foreground">
          현재 작업 중인 변경사항이 사라집니다. 원본 Excel 파일은 다시 저장하기 전까지 변경되지 않습니다.
        </p>
        <div className="mt-7 flex justify-end gap-2">
          <button
            type="button"
            className="min-h-11 rounded-lg border border-border-strong px-4 text-sm font-semibold hover:bg-surface-hover focus-visible:outline-3 focus-visible:outline-primary"
            onClick={onCancel}
          >
            취소
          </button>
          <button
            type="button"
            className="min-h-11 rounded-lg bg-danger px-4 text-sm font-bold text-white hover:opacity-90 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-danger"
            onClick={onConfirm}
          >
            변경사항 되돌리기
          </button>
        </div>
      </div>
    </dialog>
  );
}

export function WorkbookActionFeedback() {
  const { status, lastSaveMessage, errorMessage } = useInventorySession();
  if (status !== 'ready') return null;
  const feedback = errorMessage
    ? { kind: 'error' as const, message: errorMessage }
    : lastSaveMessage
      ? { kind: 'success' as const, message: lastSaveMessage }
      : null;
  if (!feedback) return null;

  return (
    <DismissibleWorkbookFeedback
      key={`${feedback.kind}:${feedback.message}`}
      feedback={feedback}
    />
  );
}

function DismissibleWorkbookFeedback({ feedback }: { feedback: ActionFeedback }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const hideFeedbackTimer = window.setTimeout(() => setIsVisible(false), 4500);
    return () => window.clearTimeout(hideFeedbackTimer);
  }, []);

  if (!isVisible) return null;

  return (
    <div
      role={feedback.kind === 'error' ? 'alert' : 'status'}
      aria-live={feedback.kind === 'error' ? 'assertive' : 'polite'}
      className={`fixed right-4 bottom-22 z-50 flex max-w-[calc(100%_-_2rem)] items-start gap-3 rounded-xl border bg-surface px-4 py-3 shadow-xl md:bottom-6 ${
        feedback.kind === 'error' ? 'border-danger' : 'border-border'
      }`}
    >
      {feedback.kind === 'error' ? (
        <AlertCircle aria-hidden="true" className="mt-0.5 shrink-0 text-danger" size={18} />
      ) : (
        <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0 text-success" size={18} />
      )}
      <p className="text-sm font-semibold leading-5">{feedback.message}</p>
      <button
        type="button"
        aria-label="알림 닫기"
        className="-m-1 inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-hover focus-visible:outline-3 focus-visible:outline-primary"
        onClick={() => setIsVisible(false)}
      >
        <X aria-hidden="true" size={16} />
      </button>
    </div>
  );
}
