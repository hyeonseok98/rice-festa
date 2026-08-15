'use client';

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const subscribeToClient = () => () => undefined;

interface ModalPortalProps {
  titleId: string;
  children: ReactNode;
  surfaceClassName?: string;
  closeOnBackdrop?: boolean;
  onRequestClose: () => void;
}

export function ModalPortal({
  titleId,
  children,
  surfaceClassName = '',
  closeOnBackdrop = true,
  onRequestClose,
}: ModalPortalProps) {
  const isClient = useSyncExternalStore(subscribeToClient, () => true, () => false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const appRoot = document.getElementById('inventory-app');
    const previousBodyOverflow = document.body.style.overflow;
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = 'hidden';
    if (appRoot) appRoot.inert = true;

    const focusTimer = window.requestAnimationFrame(() => {
      const initialFocus = dialog.querySelector<HTMLElement>('[data-modal-autofocus]');
      (initialFocus ?? dialog).focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onRequestClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusableElements = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hidden && element.getClientRects().length > 0);
      if (focusableElements.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements.at(-1);
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      if (appRoot) appRoot.inert = false;
      openerRef.current?.focus();
    };
  }, [onRequestClose]);

  if (!isClient) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-[rgb(25_31_40/45%)] p-3 backdrop-blur-[2px] md:p-6"
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) onRequestClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`min-h-0 overflow-hidden bg-surface text-foreground shadow-2xl outline-none ${surfaceClassName}`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
