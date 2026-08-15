export type StoragePlacementPurpose = 'sample' | 'box' | null;

export type StorageLocationIssueType =
  | 'unknown-facility'
  | 'unknown-format'
  | 'level-out-of-range'
  | 'slot-out-of-range';

export interface StoragePlacement {
  id: string;
  facilityId: string;
  facilityLabel: string;
  levelNumber: number | null;
  slotStart: number | null;
  slotEnd: number | null;
  isBehind: boolean;
  purpose: StoragePlacementPurpose;
}

export interface StoragePlacementMutation {
  placementId: string | null;
  facilityId: string;
  facilityLabel: string;
  levelNumber: number;
  slotStart: number;
  slotEnd: number;
  isBehind: boolean;
  purpose: StoragePlacementPurpose;
}

export interface StorageLocationIssue {
  type: StorageLocationIssueType;
  rawText: string;
  message: string;
}

export interface ParsedStorageLocation {
  placements: StoragePlacement[];
  issues: StorageLocationIssue[];
}
