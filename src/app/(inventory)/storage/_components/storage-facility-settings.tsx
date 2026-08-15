'use client';

import { Minus, Plus } from 'lucide-react';
import { useState } from 'react';

import type { StorageFacility } from '@/features/inventory/model/storage';

interface StorageFacilitySettingsProps {
  facility: StorageFacility | null;
  onSetLevelCount: (facilityId: string, levelCount: number) => Promise<void>;
  onSetSlotCount: (facilityId: string, levelId: string, slotCount: number) => Promise<void>;
  onSetRackTopEnabled: (facilityId: string, enabled: boolean) => Promise<void>;
}

export function StorageFacilitySettings({
  facility,
  onSetLevelCount,
  onSetSlotCount,
  onSetRackTopEnabled,
}: StorageFacilitySettingsProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!facility) {
    return <p className="border border-dashed border-border p-4 text-sm leading-6 text-muted-foreground">배치도에서 설비를 선택하면 칸과 자리 수를 설정할 수 있습니다.</p>;
  }

  const runConfigurationChange = async (configurationChange: () => Promise<void>) => {
    setErrorMessage(null);
    try {
      await configurationChange();
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : '설비 설정을 변경하지 못했습니다.');
    }
  };

  return (
    <section aria-labelledby="facility-settings-title">
      <p className="text-xs font-bold text-primary">설비 설정</p>
      <h2 id="facility-settings-title" className="mt-1 text-lg font-extrabold">{facility.label ?? '이름 없는 설비'}</h2>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">맨 아래 바닥 공간도 하나의 칸으로 계산합니다.</p>

      {facility.type === 'rack' ? (
        <label className="mt-4 flex min-h-11 items-center justify-between gap-3 rounded-lg border border-border px-3 text-sm font-semibold">
          꼭대기 (0번) 사용
          <input type="checkbox" checked={facility.levels.some((level) => level.order === 0 && level.kind === 'top')} className="size-4 accent-primary" onChange={(event) => void runConfigurationChange(() => onSetRackTopEnabled(facility.id, event.target.checked))} />
        </label>
      ) : null}

      <div className="mt-5 flex items-center justify-between border-y border-border py-3">
          <div><strong className="text-sm">세로 칸 수</strong><p className="mt-0.5 text-xs text-muted-foreground">현재 {facility.levels.filter((level) => level.order > 0).length}칸</p></div>
        <Counter
          value={facility.levels.filter((level) => level.order > 0).length}
          min={1}
          max={20}
          label="세로 칸 수"
          onChange={(levelCount) => void runConfigurationChange(() => onSetLevelCount(facility.id, levelCount))}
        />
      </div>

      <div className="mt-4">
        <h3 className="text-sm font-extrabold">칸별 가로 자리 수</h3>
        <p className="mt-1 text-xs text-muted-foreground">기본 7자리이며 병 크기에 맞춰 따로 조정할 수 있습니다.</p>
        <ul className="mt-3 divide-y divide-border border-y border-border">
          {facility.levels.map((level) => (
            <li key={level.id} className="flex items-center justify-between py-2.5">
              <span className="text-xs font-semibold">{getLevelName(level.order, facility.levels.filter((item) => item.order > 0).length, level.kind)}</span>
              <Counter
                value={level.slotCount}
                min={1}
                max={50}
                label={level.order === 0 ? '꼭대기 자리 수' : `${level.order}번째 칸 자리 수`}
                onChange={(slotCount) => void runConfigurationChange(() => onSetSlotCount(facility.id, level.id, slotCount))}
              />
            </li>
          ))}
        </ul>
      </div>

      {errorMessage ? <p className="mt-3 border-l-3 border-danger bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">{errorMessage}</p> : null}
    </section>
  );
}

function Counter({ value, min, max, label, onChange }: { value: number; min: number; max: number; label: string; onChange: (value: number) => void }) {
  return (
    <div className="flex items-center rounded-md border border-border" aria-label={label}>
      <button type="button" aria-label={`${label} 줄이기`} disabled={value <= min} className="flex size-8 items-center justify-center hover:bg-surface-hover focus-visible:outline-3 focus-visible:outline-primary disabled:text-border-strong" onClick={() => onChange(value - 1)}><Minus aria-hidden="true" size={14} /></button>
      <span className="min-w-8 text-center text-xs font-extrabold tabular-nums">{value}</span>
      <button type="button" aria-label={`${label} 늘리기`} disabled={value >= max} className="flex size-8 items-center justify-center hover:bg-surface-hover focus-visible:outline-3 focus-visible:outline-primary disabled:text-border-strong" onClick={() => onChange(value + 1)}><Plus aria-hidden="true" size={14} /></button>
    </div>
  );
}

function getLevelName(order: number, levelCount: number, kind: StorageFacility['levels'][number]['kind']): string {
  if (kind === 'top') return order === 0 ? '꼭대기 (0번)' : '위';
  if (kind === 'bottom') return '아래';
  if (order === 1) return '맨 위 칸';
  if (order === levelCount) return '맨 아래 칸';
  return `위에서 ${order}번째 칸`;
}
