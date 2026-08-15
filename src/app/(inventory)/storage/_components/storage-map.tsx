'use client';

import { Maximize2, Minus, Plus } from 'lucide-react';
import { useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

import { getStorageSummary } from '@/features/inventory/lib/get-storage-summary';
import type { Product } from '@/features/inventory/model/product';
import type { StorageUnit } from '@/features/inventory/model/storage';
import { STORAGE_LAYOUT_HEIGHT, STORAGE_LAYOUT_WIDTH } from '@/features/inventory/model/storage-layout';

import { StorageUnitCard } from './storage-unit-card';

interface DragState {
  unitId: string;
  offsetX: number;
  offsetY: number;
}

interface ViewportSize {
  width: number;
  height: number;
}

interface StorageMapProps {
  units: StorageUnit[];
  products: Product[];
  isEditing: boolean;
  highlightedLocations: ReadonlySet<string>;
  hasSearchQuery: boolean;
  onSelectUnit: (unitId: string) => void;
  onMoveUnit: (unitId: string, x: number, y: number) => void;
}

const MAP_PADDING = 24;
const MINIMUM_SCALE = 0.25;
const MAXIMUM_SCALE = 1.5;

export function StorageMap({
  units,
  products,
  isEditing,
  highlightedLocations,
  hasSearchQuery,
  onSelectUnit,
  onMoveUnit,
}: StorageMapProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const [viewportSize, setViewportSize] = useState<ViewportSize>({ width: 0, height: 0 });
  const [zoomMultiplier, setZoomMultiplier] = useState(1);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const measureViewport = () => {
      setViewportSize({ width: viewport.clientWidth, height: viewport.clientHeight });
    };
    measureViewport();
    const resizeObserver = new ResizeObserver(measureViewport);
    resizeObserver.observe(viewport);
    return () => resizeObserver.disconnect();
  }, []);

  const fitScale = viewportSize.width > 0 && viewportSize.height > 0
    ? Math.min(
        1,
        (viewportSize.width - MAP_PADDING * 2) / STORAGE_LAYOUT_WIDTH,
        (viewportSize.height - MAP_PADDING * 2) / STORAGE_LAYOUT_HEIGHT,
      )
    : 0.6;
  const mapScale = Math.max(MINIMUM_SCALE, Math.min(MAXIMUM_SCALE, fitScale * zoomMultiplier));
  const scaledMapWidth = STORAGE_LAYOUT_WIDTH * mapScale;
  const scaledMapHeight = STORAGE_LAYOUT_HEIGHT * mapScale;
  const frameWidth = Math.max(viewportSize.width, scaledMapWidth + MAP_PADDING * 2);
  const frameHeight = Math.max(viewportSize.height, scaledMapHeight + MAP_PADDING * 2);
  const mapOffsetX = Math.max(MAP_PADDING, (frameWidth - scaledMapWidth) / 2);
  const mapOffsetY = Math.max(MAP_PADDING, (frameHeight - scaledMapHeight) / 2);

  const handlePointerDown = (unit: StorageUnit, event: PointerEvent<HTMLButtonElement>) => {
    if (!isEditing || !mapRef.current) return;
    const mapRect = mapRef.current.getBoundingClientRect();
    dragStateRef.current = {
      unitId: unit.id,
      offsetX: (event.clientX - mapRect.left) / mapScale - unit.x,
      offsetY: (event.clientY - mapRect.top) / mapScale - unit.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const dragState = dragStateRef.current;
    const map = mapRef.current;
    if (!dragState || !map) return;
    const mapRect = map.getBoundingClientRect();
    onMoveUnit(
      dragState.unitId,
      (event.clientX - mapRect.left) / mapScale - dragState.offsetX,
      (event.clientY - mapRect.top) / mapScale - dragState.offsetY,
    );
  };

  const handlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragStateRef.current = null;
  };

  const handleKeyDown = (unit: StorageUnit, event: KeyboardEvent<HTMLButtonElement>) => {
    if (!isEditing) return;
    const distance = event.shiftKey ? 10 : 2;
    const movement = {
      ArrowLeft: [-distance, 0],
      ArrowRight: [distance, 0],
      ArrowUp: [0, -distance],
      ArrowDown: [0, distance],
    }[event.key];
    if (!movement) return;
    event.preventDefault();
    onMoveUnit(unit.id, unit.x + movement[0], unit.y + movement[1]);
  };

  return (
    <div className="flex h-full min-h-100 flex-col overflow-hidden border border-border bg-surface">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-border px-3">
        <span className="text-xs font-semibold text-muted-foreground">전체 배치도</span>
        <div className="flex items-center gap-1" aria-label="배치도 확대 및 축소">
          <button
            type="button"
            aria-label="배치도 축소"
            disabled={mapScale <= MINIMUM_SCALE}
            className="flex size-8 items-center justify-center rounded-md hover:bg-surface-hover focus-visible:outline-3 focus-visible:outline-primary disabled:text-border-strong"
            onClick={() => setZoomMultiplier((current) => Math.max(0.4, current - 0.2))}
          >
            <Minus aria-hidden="true" size={15} />
          </button>
          <span className="min-w-11 text-center text-xs font-bold tabular-nums">{Math.round(mapScale * 100)}%</span>
          <button
            type="button"
            aria-label="배치도 확대"
            disabled={mapScale >= MAXIMUM_SCALE}
            className="flex size-8 items-center justify-center rounded-md hover:bg-surface-hover focus-visible:outline-3 focus-visible:outline-primary disabled:text-border-strong"
            onClick={() => setZoomMultiplier((current) => Math.min(3, current + 0.2))}
          >
            <Plus aria-hidden="true" size={15} />
          </button>
          <button
            type="button"
            aria-label="배치도를 화면에 맞추기"
            className="ml-1 flex min-h-8 items-center gap-1 rounded-md px-2 text-xs font-bold text-muted-foreground hover:bg-surface-hover hover:text-foreground focus-visible:outline-3 focus-visible:outline-primary"
            onClick={() => setZoomMultiplier(1)}
          >
            <Maximize2 aria-hidden="true" size={14} /> 화면 맞춤
          </button>
        </div>
      </div>

      <div ref={viewportRef} className="min-h-0 flex-1 overflow-auto bg-[#eef1f4]" aria-label="보관 설비 배치도 영역">
        <div className="relative" style={{ width: frameWidth, height: frameHeight }}>
          <div
            ref={mapRef}
            className="absolute overflow-hidden border border-border-strong bg-[linear-gradient(#dde2e7_1px,transparent_1px),linear-gradient(90deg,#dde2e7_1px,transparent_1px)] bg-[size:24px_24px]"
            style={{
              left: mapOffsetX,
              top: mapOffsetY,
              width: STORAGE_LAYOUT_WIDTH,
              height: STORAGE_LAYOUT_HEIGHT,
              transform: `scale(${mapScale})`,
              transformOrigin: 'top left',
            }}
            aria-label="보관 설비 배치도"
          >
            <div className="absolute inset-x-0 top-0 flex h-7 items-center justify-center border-b border-border bg-surface-hover text-xs font-bold text-muted-foreground">
              입장 후 정면
            </div>
            {units.map((unit) => {
              const isHighlighted = Boolean(unit.label && highlightedLocations.has(unit.label));
              return (
                <StorageUnitCard
                  key={unit.id}
                  unit={unit}
                  summary={getStorageSummary(products, unit)}
                  isEditing={isEditing}
                  isHighlighted={isHighlighted}
                  isDimmed={hasSearchQuery && !isHighlighted}
                  onSelect={() => onSelectUnit(unit.id)}
                  onPointerDown={(event) => handlePointerDown(unit, event)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onKeyDown={(event) => handleKeyDown(unit, event)}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
