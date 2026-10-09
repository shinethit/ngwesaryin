/**
 * [v6.15.0] Conflict resolution engine — v7.0 S2/S3/S4.
 *
 * Purpose:
 *   Detect when a cloud snapshot would overwrite local changes that
 *   the user (or another device) made, and preserve BOTH versions
 *   so the user can review them in the ConflictBanner UI.
 *
 * Design:
 *   - Pure detection: does NOT change state.
 *   - Cloud always wins in the merge (existing behavior); we just
 *     record what was discarded.
 *   - Records are stored in localStorage under 'ngwe_conflicts' with
 *     a bounded queue (last 100).
 *   - A window event 'ngwe:conflict-detected' is fired for the UI.
 *
 * Conflict rule:
 *   cloud.version > (local.version || 0)
 *   AND
 *   cloud.lastEditedBy !== myUid      (not our own echo)
 *   AND
 *   local.updatedAt > cloud.updatedAt (we wrote more recently in wall-time)
 */

import { safeGetItem, safeSetItem, safeRemoveItem } from './storage';

export interface ConflictRecord {
  id: string;              // uuid
  entityType: string;      // 'transactions' | 'wallets' | 'debts' | ...
  entityId: string;
  detectedAt: number;      // timestamp
  // The version that was in cloud (won)
  cloudVersion: number;
  cloudUpdatedAt: number;
  cloudEditedBy?: string;
  // The version we had locally (discarded from state, kept for review)
  localVersion: number;
  localUpdatedAt: number;
  localEditedBy?: string;
  // Full snapshots so the UI can show meaningful diffs
  cloudSnapshot: any;
  localSnapshot: any;
  resolved: boolean;
}

const STORAGE_KEY = 'ngwe_conflicts';
const MAX_RECORDS = 100;

function readQueue(): ConflictRecord[] {
  try {
    const raw = safeGetItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(records: ConflictRecord[]): void {
  try {
    safeSetItem(STORAGE_KEY, JSON.stringify(records.slice(0, MAX_RECORDS)));
  } catch (e) {
    console.warn('[conflictResolver] write failed:', e);
  }
}

function uuid(): string {
  return 'conf_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

/**
 * Detect conflicts between a cloud snapshot array and the local state.
 * Records each detected conflict once (dedup by entityId:entityType).
 */
export function detectConflicts<T extends { id?: string; version?: number; updatedAt?: number; lastEditedBy?: string }>(
  entityType: string,
  prevLocal: T[],
  cloudItems: T[],
  myUid: string | null | undefined
): number {
  if (!Array.isArray(prevLocal) || !Array.isArray(cloudItems)) return 0;
  if (!prevLocal.length || !cloudItems.length) return 0;

  const localById = new Map<string, T>();
  for (const item of prevLocal) {
    if (item && typeof item.id === 'string') localById.set(item.id, item);
  }

  const existing = readQueue();
  const existingKeys = new Set(existing.map((c) => c.entityType + '::' + c.entityId));

  const detected: ConflictRecord[] = [];

  for (const cloud of cloudItems) {
    if (!cloud || typeof cloud.id !== 'string') continue;
    const local = localById.get(cloud.id);
    if (!local) continue;

    const cloudVer = Number(cloud.version) || 0;
    const localVer = Number(local.version) || 0;
    if (cloudVer <= localVer) continue;   // no conflict — cloud isn't newer

    const cloudEdit = cloud.lastEditedBy || '';
    if (myUid && cloudEdit === myUid) continue;   // our own echo

    const cloudTs = Number(cloud.updatedAt) || 0;
    const localTs = Number(local.updatedAt) || 0;
    // We need the local edit to be *newer in wall-time* than the cloud one.
    // If localTs == 0 (legacy record) we still flag it (better safe).
    if (localTs > 0 && cloudTs > 0 && localTs <= cloudTs) continue;

    const key = entityType + '::' + cloud.id;
    if (existingKeys.has(key)) continue;

    detected.push({
      id: uuid(),
      entityType,
      entityId: cloud.id,
      detectedAt: Date.now(),
      cloudVersion: cloudVer,
      cloudUpdatedAt: cloudTs,
      cloudEditedBy: cloudEdit || undefined,
      localVersion: localVer,
      localUpdatedAt: localTs,
      localEditedBy: local.lastEditedBy || undefined,
      cloudSnapshot: cloud,
      localSnapshot: local,
      resolved: false,
    });
  }

  if (detected.length === 0) return 0;

  writeQueue([...detected, ...existing].slice(0, MAX_RECORDS));

  // Fire event so the banner can react instantly
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('ngwe:conflict-detected', { detail: { count: detected.length } })
      );
    }
  } catch {}

  if (typeof console !== 'undefined') {
    console.log('[conflictResolver] detected ' + detected.length + ' conflict(s) in ' + entityType);
  }
  return detected.length;
}

export function getConflicts(): ConflictRecord[] {
  return readQueue();
}

export function getUnresolvedCount(): number {
  return readQueue().filter((c) => !c.resolved).length;
}

export function markResolved(id: string): void {
  const next = readQueue().map((c) => (c.id === id ? { ...c, resolved: true } : c));
  writeQueue(next);
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ngwe:conflict-updated'));
    }
  } catch {}
}

export function removeConflict(id: string): void {
  writeQueue(readQueue().filter((c) => c.id !== id));
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ngwe:conflict-updated'));
    }
  } catch {}
}

export function clearAllConflicts(): void {
  safeRemoveItem(STORAGE_KEY);
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ngwe:conflict-updated'));
    }
  } catch {}
}
