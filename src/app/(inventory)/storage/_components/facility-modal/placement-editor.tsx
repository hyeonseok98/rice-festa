'use client';

import { AlertTriangle, MapPin } from 'lucide-react';

import { describeStoragePlacement } from '@/features/inventory/lib/describe-storage-placement';
import type { PlacementConflict } from '@/features/inventory/lib/find-placement-conflicts';
import type { Product } from '@/features/inventory/model/product';
import type { StorageFacility } from '@/features/inventory/model/storage';

import type { PlacementDraft } from '../../_lib/placement-draft';

interface PlacementEditorProps {
  product: Product;
  facility: StorageFacility;
  draft: PlacementDraft;
  conflicts: PlacementConflict[];
  errorMessage: string | null;
  onDraftChange: (changes: Partial<PlacementDraft>) => void;
}

export function PlacementEditor({ product, facility, draft, conflicts, errorMessage, onDraftChange }: PlacementEditorProps) {
  const preview = {
    id: draft.placementId ?? 'preview',
    facilityId: facility.id,
    facilityLabel: facility.label ?? '이름 없는 설비',
    levelNumber: draft.levelNumber,
    slotStart: draft.slotStart,
    slotEnd: draft.slotEnd,
    isBehind: draft.isBehind,
    purpose: draft.purpose,
  };
  const selectedLevel = facility.levels.find((level) => level.order === draft.levelNumber);
  return (
    <aside className="min-h-0 border-l border-border bg-surface p-4 md:p-5" aria-label="위치 입력">
      <p className="text-xs text-muted-foreground">{product.companyName}</p>
      <h3 className="mt-1 text-lg font-extrabold leading-6">{product.productName}</h3>
      <div className="mt-4 rounded-xl bg-primary-soft p-3 text-sm font-bold text-primary"><MapPin className="mr-1 inline" aria-hidden="true" size={15} />{describeStoragePlacement(preview, facility)}</div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">첫 번째 자리를 누르고, 범위가 필요하면 마지막 자리를 한 번 더 누르세요.</p>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <NumberField label="칸" value={draft.levelNumber} min={facility.levels.some((level) => level.order === 0) ? 0 : 1} max={Math.max(...facility.levels.map((level) => level.order))} onChange={(levelNumber) => onDraftChange({ levelNumber, slotStart: 1, slotEnd: 1, isRangeComplete: false })} />
        <NumberField label="시작 자리" value={draft.slotStart} max={selectedLevel?.slotCount ?? 1} onChange={(slotStart) => onDraftChange({ slotStart, slotEnd: Math.max(slotStart, draft.slotEnd) })} />
        <NumberField label="끝 자리" value={draft.slotEnd} max={selectedLevel?.slotCount ?? 1} onChange={(slotEnd) => onDraftChange({ slotEnd: Math.max(draft.slotStart, slotEnd), isRangeComplete: true })} />
      </div>
      <label className="mt-4 flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold"><input type="checkbox" checked={draft.isBehind} className="size-4 accent-primary" onChange={(event) => onDraftChange({ isBehind: event.target.checked })} />뒤쪽에 배치</label>
      <label className="mt-3 block text-xs font-bold text-muted-foreground">배치 용도<select value={draft.purpose ?? ''} className="mt-2 h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground outline-none focus:border-primary focus:ring-3 focus:ring-primary/20" onChange={(event) => onDraftChange({ purpose: event.target.value === 'sample' ? 'sample' : event.target.value === 'box' ? 'box' : null })}><option value="">일반 · 입력 안 함</option><option value="sample">샘플</option><option value="box">박스</option></select></label>
      {conflicts.length ? <p className="mt-4 rounded-lg bg-warning-soft px-3 py-2 text-xs leading-5 text-warning"><AlertTriangle className="mr-1 inline" aria-hidden="true" size={14} />같은 자리에 {conflicts.map((item) => item.productName).join(', ')} 제품이 있습니다. 뒤쪽 배치인지 확인해주세요.</p> : null}
      {errorMessage ? <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-xs font-semibold text-danger" role="alert">{errorMessage}</p> : null}
    </aside>
  );
}

function NumberField({ label, value, min = 1, max, onChange }: { label: string; value: number; min?: number; max: number; onChange: (value: number) => void }) {
  return <label className="text-[11px] font-bold text-muted-foreground">{label}<input type="number" min={min} max={max} value={value} className="mt-1.5 h-10 w-full rounded-lg border border-border px-2 text-sm font-bold text-foreground outline-none focus:border-primary focus:ring-3 focus:ring-primary/20" onChange={(event) => onChange(Math.max(min, Math.min(max, Number(event.target.value) || min)))} /></label>;
}
