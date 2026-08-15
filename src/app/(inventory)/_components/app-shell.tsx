'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { DesktopPrimaryNavigation, MobilePrimaryNavigation } from './primary-navigation';
import { WorkbookActionFeedback, WorkbookSessionControl } from './workbook-session-control';

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isStorageWorkspace = pathname === '/storage';
  const contentWidthClassName = isStorageWorkspace ? 'max-w-[1760px]' : 'max-w-360';

  return (
    <div id="inventory-app" className={isStorageWorkspace ? 'flex h-dvh flex-col overflow-hidden pb-18 md:pb-0' : 'min-h-dvh pb-20 md:pb-0'}>
      <header className="sticky top-0 z-30 shrink-0 border-b border-border bg-surface/95 backdrop-blur">
        <div
          className={`mx-auto grid h-17 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-4 md:grid-cols-[minmax(180px,1fr)_auto_minmax(180px,1fr)] md:gap-5 md:px-8 ${contentWidthClassName}`}
        >
          <Link
            href="/products"
            className="justify-self-start whitespace-nowrap rounded-md text-lg font-extrabold tracking-tight focus-visible:outline-3 focus-visible:outline-primary"
          >
            출품작 관리
          </Link>

          <DesktopPrimaryNavigation pathname={pathname} />

          <div className="min-w-0 justify-self-end">
            <WorkbookSessionControl />
          </div>
        </div>
      </header>

      <main
        className={isStorageWorkspace
          ? 'mx-auto min-h-0 w-full max-w-[1760px] flex-1 overflow-hidden px-4 py-4 md:px-6 md:py-5'
          : 'mx-auto w-full max-w-360 px-4 py-8 md:px-8 md:py-12'}
      >
        {children}
      </main>

      <WorkbookActionFeedback />
      <MobilePrimaryNavigation pathname={pathname} />
    </div>
  );
}
