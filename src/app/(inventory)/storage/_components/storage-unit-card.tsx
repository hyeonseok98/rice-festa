'use client';

import { Archive, Refrigerator, Snowflake } from 'lucide-react';
import type { KeyboardEvent, PointerEvent } from 'react';

import type { StorageSummary } from '@/features/inventory/lib/get-storage-summary';
import type { StorageUnit } from '@/features/inventory/model/storage';

interface StorageUnitCardProps {
  unit: StorageUnit;
  summary: StorageSummary;
  isEditing: boolean;
  isHighlighted: boolean;
  isDimmed: boolean;
  onSelect: () => void;
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLButtonElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}

export function StorageUnitCard({
  unit,
  summary,
  isEditing,
  isHighlighted,
  isDimmed,
  onSelect,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onKeyDown,
}: StorageUnitCardProps) {
  const Icon = unit.type === 'freezer' ? Snowflake : unit.type === 'fridge' ? Refrigerator : Archive;
  const typeLabel = {
    fridge: '냉장고',
    freezer: '냉동고',
    rack: '렉',
    shelf: '선반',
    table: '테이블',
  }[unit.type];

  return (
    <button
      type="button"
      aria-label={`${unit.label ?? '이름 없는 설비'}, ${summary.productCount}종, 수량 ${summary.numericQuantity}`}
      className={`absolute flex flex-col rounded-md border p-3 text-left transition-[border-color,background-color,opacity] duration-200 focus-visible:z-10 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary ${
        unit.label ? 'bg-surface' : 'border-dashed bg-surface-hover'
      } ${isHighlighted ? 'z-10 border-primary bg-primary-soft ring-4 ring-primary/20' : 'border-border-strong'} ${
        isDimmed ? 'opacity-35' : 'opacity-100'
      } ${isEditing ? 'cursor-grab touch-none active:cursor-grabbing' : 'hover:border-primary'}`}
      style={{
        left: unit.x,
        top: unit.y,
        width: unit.width,
        height: unit.height,
      }}
      onClick={onSelect}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
    >
      <span className="flex w-full items-center gap-2 text-xs font-bold text-muted-foreground">
        <Icon aria-hidden="true" size={15} />
        {typeLabel}
      </span>
      <strong className="mt-1 block w-full truncate text-sm">{unit.label ?? '이름 미지정'}</strong>
      <span className="mt-auto text-xs text-muted-foreground">
        {unit.label ? `${summary.productCount}종 · ${summary.numericQuantity.toLocaleString('ko-KR')}개${summary.hasTextQuantity ? '+' : ''}` : '용도를 지정해주세요'}
      </span>
    </button>
  );
}
