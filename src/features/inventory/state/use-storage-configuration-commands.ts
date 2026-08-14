'use client';

import { useCallback, type Dispatch, type MutableRefObject } from 'react';

import { extractStorageFacilityLabels } from '../lib/parse-storage-location';
import type { Product } from '../model/product';
import { isStorageLocation, type StorageConfiguration, type StorageType } from '../model/storage';
import {
  addObservedStorageFacilities,
  createDefaultStorageConfiguration,
  createStorageLevels,
} from '../model/storage-layout';
import type { InventoryAction } from './inventory-reducer';
import type { ActiveWorkbookSession } from './use-workbook-session';

interface StorageConfigurationCommands {
  moveStorageFacility: (facilityId: string, x: number, y: number) => Promise<void>;
  addStorageFacility: (storageType: StorageType) => Promise<string>;
  renameStorageFacility: (facilityId: string, nextLabel: string | null) => Promise<void>;
  removeStorageFacility: (facilityId: string) => Promise<void>;
  resetStorageConfiguration: () => Promise<void>;
  setStorageFacilityLevelCount: (facilityId: string, levelCount: number) => Promise<void>;
  setStorageLevelSlotCount: (
    facilityId: string,
    levelId: string,
    slotCount: number,
  ) => Promise<void>;
}

function createStorageFacilityId(storageType: StorageType): string {
  return `${storageType.toUpperCase()}_${crypto.randomUUID()}`;
}

function createStorageFacility(storageType: StorageType, storageConfiguration: StorageConfiguration) {
  const facilityId = createStorageFacilityId(storageType);
  const facilityIndex = storageConfiguration.facilities.length;
  return {
    id: facilityId,
    type: storageType,
    label: null,
    x: 340 + (facilityIndex % 6) * 36,
    y: 300 + (facilityIndex % 5) * 28,
    width: storageType === 'rack' || storageType === 'shelf' ? 220 : storageType === 'table' ? 180 : 120,
    height: storageType === 'rack' || storageType === 'shelf' ? 150 : storageType === 'table' ? 90 : 108,
    levels: createStorageLevels(facilityId, storageType),
    needsLevelReview: storageType !== 'rack' && storageType !== 'table',
  };
}

function findUpdatedProduct(products: Product[], productId: string): Product {
  const product = products.find((item) => item.id === productId);
  if (!product) throw new Error('변경한 출품작을 다시 불러오지 못했습니다.');
  return product;
}

export function useStorageConfigurationCommands(
  products: Product[],
  activeWorkbookSessionRef: MutableRefObject<ActiveWorkbookSession | null>,
  requireEditPermission: () => Promise<void>,
  dispatch: Dispatch<InventoryAction>,
): StorageConfigurationCommands {
  const commitStorageConfiguration = useCallback(
    async (
      buildNextConfiguration: (currentConfiguration: StorageConfiguration) => StorageConfiguration,
      reparseProductLocations = false,
    ) => {
      const activeWorkbookSession = activeWorkbookSessionRef.current;
      if (!activeWorkbookSession) throw new Error('수정할 Excel 파일을 찾을 수 없습니다.');
      await requireEditPermission();
      const nextConfiguration = buildNextConfiguration(
        activeWorkbookSession.repository.getStorageConfiguration(),
      );
      activeWorkbookSession.repository.updateStorageConfiguration(
        nextConfiguration,
        reparseProductLocations,
      );
      dispatch({
        type: 'storageConfigurationChanged',
        storageConfiguration: nextConfiguration,
        products: reparseProductLocations
          ? await activeWorkbookSession.repository.getProducts()
          : undefined,
      });
      return nextConfiguration;
    },
    [activeWorkbookSessionRef, dispatch, requireEditPermission],
  );

  const moveStorageFacility = useCallback(
    async (facilityId: string, x: number, y: number) => {
      await commitStorageConfiguration((currentConfiguration) => ({
        ...currentConfiguration,
        facilities: currentConfiguration.facilities.map((facility) =>
          facility.id === facilityId
            ? {
                ...facility,
                x: Math.max(0, Math.min(currentConfiguration.layoutWidth - facility.width, Math.round(x))),
                y: Math.max(0, Math.min(currentConfiguration.layoutHeight - facility.height, Math.round(y))),
              }
            : facility,
        ),
      }));
    },
    [commitStorageConfiguration],
  );

  const addStorageFacility = useCallback(
    async (storageType: StorageType) => {
      let addedFacilityId = '';
      await commitStorageConfiguration((currentConfiguration) => {
        const facility = createStorageFacility(storageType, currentConfiguration);
        addedFacilityId = facility.id;
        return {
          ...currentConfiguration,
          facilities: [...currentConfiguration.facilities, facility],
        };
      });
      return addedFacilityId;
    },
    [commitStorageConfiguration],
  );

  const renameStorageFacility = useCallback(
    async (facilityId: string, nextLabel: string | null) => {
      const activeWorkbookSession = activeWorkbookSessionRef.current;
      if (!activeWorkbookSession) throw new Error('수정할 Excel 파일을 찾을 수 없습니다.');
      const currentConfiguration = activeWorkbookSession.repository.getStorageConfiguration();
      const facility = currentConfiguration.facilities.find((item) => item.id === facilityId);
      if (!facility || facility.label === nextLabel) return;
      if (nextLabel && !isStorageLocation(nextLabel)) {
        throw new Error('설비 이름은 고도주-3, 테이블-1처럼 이름과 번호로 입력해주세요.');
      }
      if (
        nextLabel &&
        currentConfiguration.facilities.some(
          (item) => item.id !== facilityId && item.label === nextLabel,
        )
      ) {
        throw new Error('이미 사용 중인 보관위치명입니다.');
      }

      const affectedProducts = products.filter((product) =>
        product.placements.some((placement) => placement.facilityId === facilityId),
      );
      if (affectedProducts.length > 0 && !nextLabel) {
        throw new Error('제품이 있는 설비의 이름은 비울 수 없습니다.');
      }

      await requireEditPermission();
      const nextConfiguration: StorageConfiguration = {
        ...currentConfiguration,
        facilities: currentConfiguration.facilities.map((item) =>
          item.id === facilityId ? { ...item, label: nextLabel } : item,
        ),
      };
      activeWorkbookSession.repository.updateStorageConfiguration(nextConfiguration, false);

      for (const product of affectedProducts) {
        const renamedPlacements = product.placements.map((placement) =>
          placement.facilityId === facilityId && nextLabel
            ? { ...placement, facilityLabel: nextLabel }
            : placement,
        );
        await activeWorkbookSession.repository.updatePlacements(product.id, renamedPlacements);
      }

      const updatedProducts = await activeWorkbookSession.repository.getProducts();
      for (const product of affectedProducts) {
        const updatedProduct = findUpdatedProduct(updatedProducts, product.id);
        dispatch({
          type: 'productLocationChanged',
          productId: product.id,
          before: product.location,
          after: updatedProduct.location,
          placements: updatedProduct.placements,
          locationIssues: updatedProduct.locationIssues,
        });
      }
      dispatch({
        type: 'storageConfigurationChanged',
        storageConfiguration: nextConfiguration,
        products: updatedProducts,
      });
    },
    [activeWorkbookSessionRef, dispatch, products, requireEditPermission],
  );

  const removeStorageFacility = useCallback(
    async (facilityId: string) => {
      if (
        products.some((product) =>
          product.placements.some((placement) => placement.facilityId === facilityId),
        )
      ) {
        throw new Error('제품이 있는 설비는 삭제할 수 없습니다.');
      }
      await commitStorageConfiguration((currentConfiguration) => ({
        ...currentConfiguration,
        facilities: currentConfiguration.facilities.filter((facility) => facility.id !== facilityId),
      }));
    },
    [commitStorageConfiguration, products],
  );

  const resetStorageConfiguration = useCallback(async () => {
    const observedLabels = products.flatMap((product) =>
      extractStorageFacilityLabels(product.location),
    );
    await commitStorageConfiguration(
      () => addObservedStorageFacilities(createDefaultStorageConfiguration(), observedLabels),
      true,
    );
  }, [commitStorageConfiguration, products]);

  const setStorageFacilityLevelCount = useCallback(
    async (facilityId: string, levelCount: number) => {
      if (!Number.isInteger(levelCount) || levelCount < 1 || levelCount > 20) {
        throw new Error('칸 수는 1개 이상 20개 이하로 입력해주세요.');
      }
      await commitStorageConfiguration(
        (currentConfiguration) => ({
          ...currentConfiguration,
          facilities: currentConfiguration.facilities.map((facility) => {
            if (facility.id !== facilityId) return facility;
            const levels = createStorageLevels(facility.id, facility.type, levelCount).map(
              (level, index) => ({
                ...level,
                slotCount: facility.levels[index]?.slotCount ?? level.slotCount,
              }),
            );
            return { ...facility, levels, needsLevelReview: false };
          }),
        }),
        true,
      );
    },
    [commitStorageConfiguration],
  );

  const setStorageLevelSlotCount = useCallback(
    async (facilityId: string, levelId: string, slotCount: number) => {
      if (!Number.isInteger(slotCount) || slotCount < 1 || slotCount > 50) {
        throw new Error('자리 수는 1개 이상 50개 이하로 입력해주세요.');
      }
      await commitStorageConfiguration(
        (currentConfiguration) => ({
          ...currentConfiguration,
          facilities: currentConfiguration.facilities.map((facility) =>
            facility.id === facilityId
              ? {
                  ...facility,
                  levels: facility.levels.map((level) =>
                    level.id === levelId ? { ...level, slotCount } : level,
                  ),
                }
              : facility,
          ),
        }),
        true,
      );
    },
    [commitStorageConfiguration],
  );

  return {
    moveStorageFacility,
    addStorageFacility,
    renameStorageFacility,
    removeStorageFacility,
    resetStorageConfiguration,
    setStorageFacilityLevelCount,
    setStorageLevelSlotCount,
  };
}
