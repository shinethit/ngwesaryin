/**
 * Sync Operations Logger
 * Tracks the last 50 sync operations (push/pull), including their
 * success/failure status, error messages, timestamps, and item counts.
 */

export type SyncOperationType = 'push' | 'pull' | 'rest_push' | 'single_push' | 'retry_push';
export type SyncOperationStatus = 'success' | 'failed' | 'in_progress';

export interface SyncOperationLog {
  id: string;
  timestamp: number;
  type: SyncOperationType;
  direction: 'push' | 'pull';
  status: SyncOperationStatus;
  itemCount: number;
  details?: string;
  errorMessage?: string;
  durationMs?: number;
  devicePlatform: string;
  targetUid?: string;
}

const STORAGE_KEY = 'ngwe_sync_op_logs';
const MAX_LOGS = 50;

type SyncLogListener = (logs: SyncOperationLog[]) => void;
const listeners = new Set<SyncLogListener>();

function getDevicePlatform(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) return 'iOS (Safari)';
  if (/Android/i.test(navigator.userAgent)) return 'Android';
  return 'Desktop / Web';
}

/**
 * Retrieve the last 50 sync operations from localStorage
 */
export function getSyncOperationLogs(): SyncOperationLog[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLogs(logs: SyncOperationLog[]): void {
  try {
    const capped = logs.slice(0, MAX_LOGS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(capped));
    listeners.forEach((cb) => {
      try {
        cb(capped);
      } catch (err) {
        console.error('[syncOperationLogger] listener error:', err);
      }
    });
  } catch (err) {
    console.warn('[syncOperationLogger] save failed:', err);
  }
}

/**
 * Record a completed sync operation directly
 */
export function recordSyncOperation(entry: {
  type: SyncOperationType;
  status: SyncOperationStatus;
  itemCount?: number;
  details?: string;
  errorMessage?: string;
  durationMs?: number;
  targetUid?: string;
}): SyncOperationLog {
  const direction: 'push' | 'pull' = entry.type === 'pull' ? 'pull' : 'push';
  const newLog: SyncOperationLog = {
    id: `synclog_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    type: entry.type,
    direction,
    status: entry.status,
    itemCount: entry.itemCount || 0,
    details: entry.details,
    errorMessage: entry.errorMessage,
    durationMs: entry.durationMs,
    devicePlatform: getDevicePlatform(),
    targetUid: entry.targetUid,
  };

  const current = getSyncOperationLogs();
  saveLogs([newLog, ...current]);
  return newLog;
}

/**
 * Start tracking an in-progress sync operation. Returns operation ID to close later.
 */
export function recordSyncOperationStart(
  type: SyncOperationType,
  details?: string,
  itemCount: number = 0,
  targetUid?: string
): string {
  const id = `synclog_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const direction: 'push' | 'pull' = type === 'pull' ? 'pull' : 'push';
  const newLog: SyncOperationLog = {
    id,
    timestamp: Date.now(),
    type,
    direction,
    status: 'in_progress',
    itemCount,
    details,
    devicePlatform: getDevicePlatform(),
    targetUid,
  };

  const current = getSyncOperationLogs();
  saveLogs([newLog, ...current]);
  return id;
}

/**
 * Finish tracking an in-progress sync operation with final status and optional error
 */
export function finishSyncOperation(
  id: string,
  status: 'success' | 'failed',
  options?: {
    itemCount?: number;
    details?: string;
    errorMessage?: string;
  }
): void {
  const current = getSyncOperationLogs();
  const idx = current.findIndex((l) => l.id === id);
  if (idx === -1) return;

  const existing = current[idx];
  const now = Date.now();
  const durationMs = now - existing.timestamp;

  current[idx] = {
    ...existing,
    status,
    durationMs,
    itemCount: options?.itemCount !== undefined ? options.itemCount : existing.itemCount,
    details: options?.details !== undefined ? options.details : existing.details,
    errorMessage: options?.errorMessage !== undefined ? options.errorMessage : existing.errorMessage,
  };

  saveLogs([...current]);
}

/**
 * Clear all sync operation logs
 */
export function clearSyncOperationLogs(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    listeners.forEach((cb) => {
      try {
        cb([]);
      } catch (err) {
        console.error('[syncOperationLogger] clear listener error:', err);
      }
    });
  } catch (err) {
    console.warn('[syncOperationLogger] clear failed:', err);
  }
}

/**
 * Subscribe to sync operation logs in real time
 */
export function subscribeSyncOperationLogs(callback: SyncLogListener): () => void {
  listeners.add(callback);
  callback(getSyncOperationLogs());
  return () => {
    listeners.delete(callback);
  };
}
