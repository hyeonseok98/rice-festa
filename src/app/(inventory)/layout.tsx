import type { ReactNode } from 'react';

import { InventoryProvider } from '@/features/inventory/state/inventory-context';

import { AppShell } from './_components/app-shell';
import { BackupDecisionDialog } from './_components/backup-decision-dialog';

export default function InventoryLayout({ children }: { children: ReactNode }) {
  return (
    <InventoryProvider>
      <AppShell>{children}</AppShell>
      <BackupDecisionDialog />
    </InventoryProvider>
  );
}
