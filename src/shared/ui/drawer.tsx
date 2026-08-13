'use client';

import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';

interface DrawerProps {
  isOpen: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
}

export function Drawer({ isOpen, title, description, children, onClose }: DrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-full max-w-120 border-0 bg-surface p-0 text-foreground shadow-2xl backdrop:bg-foreground/35 open:flex open:flex-col"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
    >
      <header className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
        <div>
          <h2 id={titleId} className="text-xl font-bold">
            {title}
          </h2>
          {description ? (
            <p id={descriptionId} className="mt-1 text-sm text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          aria-label="닫기"
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-hover focus-visible:outline-3 focus-visible:outline-primary"
          onClick={onClose}
        >
          <X aria-hidden="true" size={22} />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-6">{children}</div>
    </dialog>
  );
}
