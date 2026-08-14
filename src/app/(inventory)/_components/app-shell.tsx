'use client';

import { Archive, ClipboardCheck, Copy, PackageSearch, RotateCcw, Save, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { useInventorySession } from '@/features/inventory/state/inventory-context';

const navigationItems = [
  { href: '/products', label: '출품작', icon: PackageSearch },
  { href: '/storage', label: '보관 위치', icon: Archive },
  { href: '/picking', label: '품평회 준비', icon: ClipboardCheck },
];

function getSessionStatusText(
  status: ReturnType<typeof useInventorySession>['status'],
  isDirty: boolean,
): string {
  if (status === 'loading') return '파일 확인 중';
  if (status === 'saving') return 'Excel 저장 중';
  if (status === 'error') return '파일 확인 필요';
  if (status === 'ready' && isDirty) return '저장할 변경사항 있음';
  if (status === 'ready') return '원본에서 불러옴';
  return '파일을 불러와주세요';
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const {
    fileName,
    status,
    isDirty,
    canOverwriteOriginal,
    saveInitialWorkbookBackup,
    saveChangedWorkbookCopy,
    saveOriginalWorkbook,
    restoreInitialWorkbook,
  } = useInventorySession();
  const statusText = getSessionStatusText(status, isDirty);

  return (
    <div className="min-h-dvh pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex min-h-17 max-w-360 items-center justify-between gap-5 px-4 md:px-8">
          <Link
            href="/products"
            className="shrink-0 rounded-md text-lg font-extrabold tracking-tight focus-visible:outline-3 focus-visible:outline-primary"
          >
            출품작 관리
          </Link>
          <nav aria-label="주요 메뉴" className="hidden h-17 items-stretch md:flex">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center border-b-3 px-5 text-sm font-semibold focus-visible:outline-3 focus-visible:outline-primary ${
                    isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex min-w-0 items-center gap-3">
            {fileName ? (
              <div className="hidden items-center gap-1 xl:flex">
                <button
                  type="button"
                  className="flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-muted-foreground hover:bg-surface-hover hover:text-foreground focus-visible:outline-3 focus-visible:outline-primary"
                  onClick={() => void saveInitialWorkbookBackup()}
                >
                  <ShieldCheck aria-hidden="true" size={16} /> 백업본 저장
                </button>
                <button
                  type="button"
                  className="flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-muted-foreground hover:bg-surface-hover hover:text-foreground focus-visible:outline-3 focus-visible:outline-primary"
                  onClick={() => {
                    if (window.confirm('처음 불러온 상태로 되돌릴까요? 원본 저장 전까지 실제 파일은 바뀌지 않습니다.')) {
                      void restoreInitialWorkbook();
                    }
                  }}
                >
                  <RotateCcw aria-hidden="true" size={16} /> 처음 상태
                </button>
                <button
                  type="button"
                  disabled={!isDirty}
                  className="flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-muted-foreground hover:bg-surface-hover hover:text-foreground focus-visible:outline-3 focus-visible:outline-primary disabled:cursor-not-allowed disabled:text-border-strong"
                  onClick={() => void saveChangedWorkbookCopy()}
                >
                  <Copy aria-hidden="true" size={16} /> 다른 이름
                </button>
                <button
                  type="button"
                  disabled={!isDirty || status === 'saving'}
                  className="flex min-h-10 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-bold text-white hover:bg-primary-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:bg-border-strong"
                  onClick={() => void saveOriginalWorkbook()}
                >
                  <Save aria-hidden="true" size={16} />
                  {canOverwriteOriginal ? '원본 저장' : '변경본 저장'}
                </button>
              </div>
            ) : null}
            <div className="min-w-0 text-right">
              <p className="max-w-42 truncate text-sm font-semibold md:max-w-60">
                {fileName ?? '선택된 파일 없음'}
              </p>
              <p
                className={`text-xs ${
                  status === 'error' ? 'text-danger' : isDirty ? 'text-warning' : 'text-muted-foreground'
                }`}
              >
                {statusText}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-360 px-4 py-8 md:px-8 md:py-12">{children}</main>

      <nav
        aria-label="모바일 주요 메뉴"
        className="fixed inset-x-0 bottom-0 z-30 grid h-18 grid-cols-3 border-t border-border bg-surface md:hidden"
      >
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-semibold focus-visible:outline-3 focus-visible:outline-inset focus-visible:outline-primary ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon aria-hidden="true" size={22} strokeWidth={isActive ? 2.5 : 2} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
