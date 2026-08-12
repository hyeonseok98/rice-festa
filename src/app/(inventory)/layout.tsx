import type { ReactNode } from 'react';

import { InventoryProvider } from '@/features/inventory/state/inventory-context';

import { AppShell } from './_components/app-shell';

export default function InventoryLayout({ children }: { children: ReactNode }) {
  return (
    <InventoryProvider>
      <AppShell>{children}</AppShell>
    </InventoryProvider>
  );
}
