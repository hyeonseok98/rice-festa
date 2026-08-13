"use client";

import { useRef, type KeyboardEvent, type PointerEvent } from "react";

import { getStorageSummary } from "@/features/inventory/lib/get-storage-summary";
import type { Product } from "@/features/inventory/model/product";
import type { StorageUnit } from "@/features/inventory/model/storage";
import {
  STORAGE_LAYOUT_HEIGHT,
  STORAGE_LAYOUT_WIDTH,
} from "@/features/inventory/model/storage-layout";

import { StorageUnitCard } from "./storage-unit-card";

interface DragState {
  unitId: string;
  offsetX: number;
  offsetY: number;
  moved: boolean;
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

export function StorageMap({
  units,
  products,
  isEditing,
  highlightedLocations,
  hasSearchQuery,
  onSelectUnit,
  onMoveUnit,
}: StorageMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState | null>(null);

  const handlePointerDown = (
    unit: StorageUnit,
    event: PointerEvent<HTMLButtonElement>,
  ) => {
    if (!isEditing || !mapRef.current) return;
    const mapRect = mapRef.current.getBoundingClientRect();
    dragStateRef.current = {
      unitId: unit.id,
      offsetX: event.clientX - mapRect.left - unit.x,
      offsetY: event.clientY - mapRect.top - unit.y,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const dragState = dragStateRef.current;
    const map = mapRef.current;
    if (!dragState || !map) return;
    const mapRect = map.getBoundingClientRect();
    dragState.moved = true;
    onMoveUnit(
      dragState.unitId,
      event.clientX - mapRect.left - dragState.offsetX,
      event.clientY - mapRect.top - dragState.offsetY,
    );
  };

  const handlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragStateRef.current = null;
  };

  const handleKeyDown = (
    unit: StorageUnit,
    event: KeyboardEvent<HTMLButtonElement>,
  ) => {
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
    <div className="overflow-x-auto rounded-3xl border border-border bg-surface p-4 md:p-6">
      <div
        ref={mapRef}
        className="relative overflow-hidden rounded-2xl border border-border bg-[linear-gradient(#e5e8eb_1px,transparent_1px),linear-gradient(90deg,#e5e8eb_1px,transparent_1px)] bg-[size:32px_32px]"
        style={{ width: STORAGE_LAYOUT_WIDTH, height: STORAGE_LAYOUT_HEIGHT }}
        aria-label="보관 설비 배치도"
      >
        <div className="absolute inset-x-0 top-0 flex h-7 items-center justify-center border-b border-border bg-surface-hover text-xs font-bold text-muted-foreground">
          입장 후 정면
        </div>
        {units.map((unit) => {
          const isHighlighted = Boolean(
            unit.label && highlightedLocations.has(unit.label),
          );
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
  );
}
