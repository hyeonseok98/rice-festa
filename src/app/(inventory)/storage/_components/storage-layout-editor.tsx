'use client';

import { Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { isStorageLocation, type StorageType, type StorageUnit } from '@/features/inventory/model/storage';
import { Button } from '@/shared/ui/button';

interface StorageLayoutEditorProps {
  selectedUnit: StorageUnit | null;
  storedProductCount: number;
  onAddUnit: (type: StorageType) => void;
  onRenameUnit: (unitId: string, label: string | null) => Promise<void>;
  onRemoveUnit: (unitId: string) => void;
  onResetLayout: () => void;
}

export function StorageLayoutEditor({
  selectedUnit,
  storedProductCount,
  onAddUnit,
  onRenameUnit,
  onRemoveUnit,
  onResetLayout,
}: StorageLayoutEditorProps) {
  const [label, setLabel] = useState(selectedUnit?.label ?? '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedUnit) return;
    const normalizedLabel = label.trim() || null;
    if (normalizedLabel && !isStorageLocation(normalizedLabel)) {
      setErrorMessage('저도주-4, 약청주-5, 냉동-3처럼 입력해주세요.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    try {
      await onRenameUnit(selectedUnit.id, normalizedLabel);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : '설비 이름을 변경하지 못했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <aside className="rounded-2xl border border-border bg-surface p-5" aria-label="배치 편집 도구">
      <h2 className="font-extrabold">설비 추가</h2>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">추가한 설비는 지도에서 원하는 위치로 옮겨주세요.</p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Button variant="secondary" className="px-2" onClick={() => onAddUnit('fridge')}>
          <Plus aria-hidden="true" size={16} /> 냉장고
        </Button>
        <Button variant="secondary" className="px-2" onClick={() => onAddUnit('freezer')}>
          <Plus aria-hidden="true" size={16} /> 냉동고
        </Button>
        <Button variant="secondary" className="px-2" onClick={() => onAddUnit('rack')}>
          <Plus aria-hidden="true" size={16} /> 렉
        </Button>
      </div>

      <div className="my-6 border-t border-border" />

      {selectedUnit ? (
        <form onSubmit={handleSubmit}>
          <p className="text-xs font-bold text-primary">선택한 설비</p>
          <h3 className="mt-1 text-lg font-extrabold">{selectedUnit.label ?? '이름 없는 설비'}</h3>
          <label htmlFor="storage-unit-label" className="mt-5 block text-sm font-bold">Excel 보관위치명</label>
          <input
            id="storage-unit-label"
            value={label}
            placeholder="예: 저도주-4"
            className="mt-2 h-12 w-full rounded-xl border border-border-strong px-4 outline-none focus:border-primary focus:ring-3 focus:ring-primary/25"
            onChange={(event) => setLabel(event.target.value)}
          />
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            비워두면 제품을 배치할 수 없는 미지정 설비가 됩니다.
          </p>
          {errorMessage ? <p className="mt-3 text-sm font-semibold text-danger" role="alert">{errorMessage}</p> : null}
          <Button className="mt-4 w-full" type="submit" disabled={isSaving || label.trim() === (selectedUnit.label ?? '')}>
            {isSaving ? '반영 중…' : '이름 반영'}
          </Button>
          <Button
            variant="ghost"
            className="mt-2 w-full text-danger"
            disabled={storedProductCount > 0}
            onClick={() => onRemoveUnit(selectedUnit.id)}
          >
            <Trash2 aria-hidden="true" size={16} /> 설비 삭제
          </Button>
          {storedProductCount > 0 ? (
            <p className="mt-1 text-center text-xs text-muted-foreground">제품이 있는 설비는 삭제할 수 없습니다.</p>
          ) : null}
        </form>
      ) : (
        <div className="rounded-xl bg-surface-hover p-4 text-sm leading-6 text-muted-foreground">
          지도에서 설비를 선택하면 이름을 지정하거나 삭제할 수 있습니다.
        </div>
      )}

      <div className="my-6 border-t border-border" />
      <Button variant="ghost" className="w-full" onClick={onResetLayout}>
        <RotateCcw aria-hidden="true" size={16} /> 기본 배치로 초기화
      </Button>
      <p className="mt-3 text-center text-xs text-muted-foreground">배치는 이 브라우저에 자동 저장됩니다.</p>
    </aside>
  );
}
