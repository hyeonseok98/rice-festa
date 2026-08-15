'use client';

import { Archive, Refrigerator, Snowflake } from 'lucide-react';

import type { StorageSummary } from '@/features/inventory/lib/get-storage-summary';
import type { StorageFacility } from '@/features/inventory/model/storage';

interface StorageFacilityCardProps {
  facility: StorageFacility;
  summary: StorageSummary;
  highlighted: boolean;
  dimmed: boolean;
  compact?: boolean;
  onOpen: () => void;
}

export function StorageFacilityCard({ facility, summary, highlighted, dimmed, compact = false, onOpen }: StorageFacilityCardProps) {
  const Icon = facility.type === 'freezer' ? Snowflake : facility.type === 'fridge' ? Refrigerator : Archive;
  return (
    <button
      type="button"
      aria-label={`${facility.label ?? '이름 없는 설비'} 열기, 제품 ${summary.productCount}종`}
      className={`group flex min-w-0 items-center rounded-lg border bg-surface text-left transition focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary ${highlighted ? 'border-primary ring-3 ring-primary/15' : 'border-border-strong hover:border-primary'} ${dimmed ? 'opacity-35' : ''} ${compact ? 'h-full min-h-0 gap-1.5 px-2 py-0.5' : 'min-h-12 gap-2 px-2.5 py-2'}`}
      onClick={onOpen}
    >
      <span className={`flex shrink-0 items-center justify-center rounded-lg ${compact ? 'size-7' : 'size-8'} ${highlighted ? 'bg-primary text-white' : 'bg-surface-hover text-muted-foreground group-hover:text-primary'}`}><Icon aria-hidden="true" size={compact ? 14 : 16} /></span>
      <span className="min-w-0 flex-1">
        <strong className={`block truncate ${compact ? 'text-xs leading-4' : 'text-[13px] leading-5'}`}>{facility.label ?? '이름 미지정'}</strong>
        <span className={`block truncate text-muted-foreground ${compact ? 'text-[10px] leading-3.5' : 'text-[11px] leading-4'}`}>{summary.productCount}종 · {facility.levels.length}칸</span>
      </span>
    </button>
  );
}
