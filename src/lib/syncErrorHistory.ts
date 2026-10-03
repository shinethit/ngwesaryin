/**
 * Sync Error History Tracker
 * Persistently stores and tracks the last 10-20 failed sync operations
 * with specific error messages, entity information, and timestamps.
 */

export interface SyncErrorEntry {
  id: string;
  timestamp: number;
  operationType: string;
  entityType?: string;
  entityId?: string;
  path?: string;
  errorMessage: string;
  errorCode?: string;
  targetUid?: string;
  devicePlatform?: string;
}

const STORAGE_KEY = 'ngwe_sync_error_history';
const MAX_ERROR_HISTORY = 15;

type SyncErrorListener = (errors: SyncErrorEntry[]) => void;
const listeners = new Set<SyncErrorListener>();

function getDevicePlatform(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) return 'iOS (Safari/WebKit)';
  if (/Android/i.test(navigator.userAgent)) return 'Android';
  return 'Desktop / Web';
}

/**
 * Retrieve the persistent sync error history from localStorage.
 */
export function getSyncErrorHistory(): SyncErrorEntry[] {
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

/**
 * Record a new failed sync operation into the persistent history.
 */
export function recordSyncError(entry: {
  operationType: string;
  errorMessage: string;
  entityType?: string;
  entityId?: string;
  path?: string;
  errorCode?: string;
  targetUid?: string;
}): SyncErrorEntry {
  const newRecord: SyncErrorEntry = {
    id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    operationType: entry.operationType || 'write',
    entityType: entry.entityType,
    entityId: entry.entityId,
    path: entry.path,
    errorMessage: entry.errorMessage || 'Unknown sync error',
    errorCode: entry.errorCode,
    targetUid: entry.targetUid,
    devicePlatform: getDevicePlatform(),
  };

  try {
    const current = getSyncErrorHistory();
    // Prepend newest error and keep maximum MAX_ERROR_HISTORY entries
    const updated = [newRecord, ...current.filter((e) => e.id !== newRecord.id)].slice(0, MAX_ERROR_HISTORY);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    listeners.forEach((cb) => {
      try {
        cb(updated);
      } catch (err) {
        console.error('SyncErrorListener error:', err);
      }
    });
  } catch (e) {
    console.warn('Failed to save sync error to localStorage:', e);
  }

  return newRecord;
}

/**
 * Clear all recorded sync errors.
 */
export function clearSyncErrorHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    listeners.forEach((cb) => {
      try {
        cb([]);
      } catch (err) {
        console.error('SyncErrorListener error:', err);
      }
    });
  } catch (e) {
    console.warn('Failed to clear sync error history:', e);
  }
}

/**
 * Subscribe to real-time changes in the sync error history.
 */
export function subscribeToSyncErrors(callback: SyncErrorListener): () => void {
  listeners.add(callback);
  // Initial notification
  callback(getSyncErrorHistory());
  return () => {
    listeners.delete(callback);
  };
}
