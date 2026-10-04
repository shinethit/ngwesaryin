import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  persistentSingleTabManager,
  enableNetwork,
  disableNetwork,
  setDoc,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';
import firebaseConfig from '@/firebase-applet-config.json';

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// =============================================================
// iOS / PWA Detection (Web Locks API deadlock prevention)
// =============================================================
// iOS Safari AND iOS PWA (standalone mode) both have issues with
// the Web Locks API which Firestore's persistentMultipleTabManager
// depends on. This causes IndexedDB deadlocks that silently block
// all Firestore writes on iOS. We force persistentSingleTabManager
// for any iOS-based environment to prevent this.
// =============================================================

// iOS detection (iPhone, iPad, iPod)
const isIOS = typeof navigator !== 'undefined' && (
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
);

// PWA standalone detection (Home Screen app on iOS)
const isPwaStandalone = typeof window !== 'undefined' && (
  (window.navigator as any).standalone === true ||
  (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches)
);

// Safari detection (Web Locks API is unreliable on all Safari builds)
const isSafari = typeof navigator !== 'undefined' && (
  /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
);

// Combined: use single-tab manager for any iOS, Safari, or PWA environment.
// This prevents Firestore's Web Locks API from deadlocking IndexedDB.
const useSingleTabManager = isIOS || isSafari || isPwaStandalone;

// Debug log (visible in console for troubleshooting)
if (typeof window !== 'undefined') {
  console.log('[firebase.ts] Cache manager mode:', {
    isIOS,
    isPwaStandalone,
    isSafari,
    useSingleTabManager,
    userAgent: navigator.userAgent,
  });
}

const useDefaultDbDirectly =
  !firebaseConfig.firestoreDatabaseId ||
  firebaseConfig.firestoreDatabaseId === '(default)';

// Firestore Database with smart fallback for iOS/Safari/PWA
let firestoreInstance: any;

const localCacheConfig = {
  localCache: persistentLocalCache({
    tabManager: useSingleTabManager
      ? persistentSingleTabManager(undefined)
      : persistentMultipleTabManager(),
  }),
};

// FIX: Explicitly split initializeFirestore calls to satisfy
// TypeScript's strict databaseId typing (string, not string|undefined).
try {
  if (useDefaultDbDirectly) {
    firestoreInstance = initializeFirestore(app, localCacheConfig);
  } else {
    firestoreInstance = initializeFirestore(
      app,
      localCacheConfig,
      firebaseConfig.firestoreDatabaseId as string
    );
  }
  if (typeof window !== 'undefined') {
    console.log('[firebase.ts] Firestore initialized with persistentLocalCache');
  }
} catch (err) {
  console.warn('[firebase.ts] persistentLocalCache failed, falling back:', err);
  try {
    if (useDefaultDbDirectly) {
      firestoreInstance = initializeFirestore(app, {});
    } else {
      firestoreInstance = initializeFirestore(
        app,
        {},
        firebaseConfig.firestoreDatabaseId as string
      );
    }
    if (typeof window !== 'undefined') {
      console.log('[firebase.ts] Firestore initialized with default cache');
    }
  } catch (err2) {
    console.error('[firebase.ts] initializeFirestore failed, using getFirestore:', err2);
    if (useDefaultDbDirectly) {
      firestoreInstance = getFirestore(app);
    } else {
      firestoreInstance = getFirestore(
        app,
        firebaseConfig.firestoreDatabaseId as string
      );
    }
  }
}

export const db = firestoreInstance;

// Secondary Firestore instance pointing to the active database
// (avoid querying non-existent (default) database)
export const defaultDb = db;

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Helper to refresh Firestore connection if VPN toggles
export async function resetFirestoreConnection() {
  try {
    await disableNetwork(db);
    await enableNetwork(db);
    console.log('Firestore connection reset successfully');
  } catch (err) {
    console.warn('Failed to reset Firestore connection:', err);
  }
}

// Error handling conforming to skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

/**
 * Recursively sanitizes any payload before passing to Firestore setDoc / writeBatch.
 * Firestore strictly rejects documents containing fields with `undefined` values.
 */
export function cleanForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => cleanForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        cleaned[key] = cleanForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

let quotaWarningLogged = false;
let isNetworkPausedForQuota = false;

const QUOTA_KEY = 'ngwe_quota_exhausted';
const QUOTA_TIME_KEY = 'ngwe_quota_exhausted_at';
const QUOTA_RESET_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes retry

/**
 * Ensures an asynchronous Promise resolves within a fixed time budget.
 * Prevents infinite UI spinning when VPN or mobile network stalls.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 9000,
  fallbackMessage: string = 'ကွန်ရက် ချိတ်ဆက်မှု နှေးကွေးနေပါသည် (Network timed out)'
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      const err = new Error(fallbackMessage) as any;
      err.code = 'timeout';
      reject(err);
    }, timeoutMs);

    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// Exported helper to identify timeout errors
export function isTimeoutError(e: unknown): boolean {
  if (!e) return false;
  const code = (e as any)?.code;
  const msg = e instanceof Error ? e.message : String(e);
  return code === 'timeout' || msg.includes('timed out') || msg.includes('timeout');
}

// Exported helper to identify permission-denied errors
export function isPermissionError(e: unknown): boolean {
  if (!e) return false;
  const code = (e as any)?.code;
  const msg = e instanceof Error ? e.message : String(e);
  return (
    code === 'permission-denied' ||
    msg.includes('permission-denied') ||
    msg.includes('Missing or insufficient permissions')
  );
}

export function isQuotaExhausted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem('ngwe_quota_write_exhausted');
    if (!raw) return false;
    const ts = Number(raw);

    // Calculate start of current Pacific day
    const now = new Date();
    let currentPacificMidnight = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0,
      0,
      0
    );
    try {
      const ptNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
      const ptTodayMidnight = new Date(
        ptNow.getFullYear(),
        ptNow.getMonth(),
        ptNow.getDate(),
        0,
        0,
        0
      );
      const diffFromPt = ptNow.getTime() - ptTodayMidnight.getTime();
      currentPacificMidnight = now.getTime() - diffFromPt;
    } catch {}

    // If timestamp was set before today's Pacific Midnight reset, quota has reset!
    if (ts < currentPacificMidnight) {
      localStorage.removeItem('ngwe_quota_write_exhausted');
      localStorage.removeItem('ngwe_quota_exhausted');
      localStorage.removeItem('ngwe_quota_exhausted_at');
      return false;
    }

    // Active if set today and less than 12 hours ago
    return Date.now() - ts < 12 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export function clearQuotaExhaustedFlag(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('ngwe_quota_write_exhausted');
    localStorage.removeItem('ngwe_quota_exhausted');
    localStorage.removeItem('ngwe_quota_exhausted_at');
  } catch {}
}

export async function pauseNetworkDueToQuota() {
  // Never pause network
}

export async function resumeNetworkFromQuota(): Promise<boolean> {
  return true;
}

// Ensure network is active on boot and clear any stale quota locks from localStorage
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('ngwe_quota_exhausted');
    localStorage.removeItem('ngwe_quota_exhausted_at');
  } catch (e) {
    // Ignore
  }
  enableNetwork(db).catch(() => {});
}

export function isQuotaExhaustedError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message : String(error);
  const code = (error as any)?.code;
  return (
    msg.includes('resource-exhausted') ||
    msg.includes('Quota limit exceeded') ||
    msg.includes('Quota exceeded') ||
    msg.includes('Free daily write units') ||
    code === 'resource-exhausted' ||
    code === 8
  );
}

import { recordSyncError } from './syncErrorHistory';

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const isQuota = isQuotaExhaustedError(error);
  const errMsg = error instanceof Error ? error.message : String(error);
  const isTargetIdExists = errMsg.includes('Target ID already exists');

  // Extract entity details from path e.g. users/{uid}/{entityType}/{entityId}
  const parts = path ? path.split('/') : [];
  const entityType = parts.length >= 3 && parts[0] === 'users' ? parts[2] : undefined;
  const entityId = parts.length >= 4 && parts[0] === 'users' ? parts[3] : undefined;

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };

  if (isQuota) {
    try {
      localStorage.setItem('ngwe_quota_write_exhausted', String(Date.now()));
      import('./quotaTracker')
        .then(({ forceWritesExhausted }) => {
          forceWritesExhausted();
        })
        .catch(() => {});
    } catch {}
    pauseNetworkDueToQuota().catch(() => {});
  } else if (isTargetIdExists) {
    console.warn('Firestore stream target re-synced:', path);
  } else {
    console.error('Firestore Error:', JSON.stringify(errInfo));
  }

  // Persistently record this failure in the Sync Error History
  recordSyncError({
    operationType,
    errorMessage: errMsg,
    path: path || undefined,
    entityType,
    entityId,
    errorCode: (error as any)?.code,
    targetUid: auth.currentUser?.uid,
  });

  return errInfo;
}

import { recordFirestoreOp } from './quotaTracker';

export async function safeSetDoc(
  docRef: any,
  data: any,
  options?: any
): Promise<boolean> {
  const path = docRef?.path || null;
  const parts = path ? path.split('/') : [];
  const targetUid = parts.length === 4 && parts[0] === 'users' ? parts[1] : undefined;
  const entityType = parts.length === 4 && parts[0] === 'users' ? parts[2] : undefined;
  const entityId = parts.length === 4 && parts[0] === 'users' ? parts[3] : undefined;

  // Guard when quota is exhausted; enqueue user entity tasks to syncQueue
  if (isQuotaExhausted()) {
    if (entityType && entityId && targetUid) {
      import('./syncQueue')
        .then(({ syncQueue }) => {
          syncQueue.enqueue(entityType as any, entityId, 'upsert', targetUid, data);
        })
        .catch(() => {});
    }
    return false;
  }

  try {
    // 8-second timeout to prevent infinite hanging on mobile LTE or iOS Safari WebKit
    await withTimeout(setDoc(docRef, cleanForFirestore(data), options), 8000);
    isNetworkPausedForQuota = false;
    recordFirestoreOp('write', docRef?.parent?.id || path || 'system', 1);
    if (entityType && entityId) {
      import('./syncQueue')
        .then(({ syncQueue }) => {
          syncQueue.remove(entityType as any, entityId);
        })
        .catch(() => {});
    }
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);

    // Skip REST fallback on quota or permission errors
    if (!isQuotaExhaustedError(error) && !isPermissionError(error)) {
      if (entityType === 'transactions' && targetUid && data) {
        try {
          const { pushTransactionsDirectHttp } = await import('./directFirestoreHttp');
          const httpRes = await pushTransactionsDirectHttp([data], targetUid);
          if (httpRes.success) {
            console.log(
              `[safeSetDoc] Recovered tx ${entityId} via direct HTTPS REST push!`
            );
            import('./syncQueue')
              .then(({ syncQueue }) => {
                syncQueue.remove('transactions', entityId);
              })
              .catch(() => {});
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('ngwe_cloud_tx_confirmed', { detail: [entityId] })
              );
            }
            return true;
          }
        } catch (httpErr) {
          console.warn('[safeSetDoc] Direct HTTP fallback attempt:', httpErr);
        }
      }
    }

    // Automatically enqueue to transactional syncQueue for retry-on-failure
    if (entityType && entityId && targetUid) {
      import('./syncQueue')
        .then(({ syncQueue }) => {
          syncQueue.enqueue(entityType as any, entityId, 'upsert', targetUid, data);
        })
        .catch(() => {});
    }
    return false;
  }
}

export async function safeDeleteDoc(docRef: any): Promise<boolean> {
  const path = docRef?.path || null;
  const parts = path ? path.split('/') : [];
  const targetUid = parts.length === 4 && parts[0] === 'users' ? parts[1] : undefined;
  const entityType = parts.length === 4 && parts[0] === 'users' ? parts[2] : undefined;
  const entityId = parts.length === 4 && parts[0] === 'users' ? parts[3] : undefined;

  // Guard against quota exhaustion and enqueue delete task
  if (isQuotaExhausted()) {
    if (entityType && entityId && targetUid) {
      import('./syncQueue')
        .then(({ syncQueue }) => {
          syncQueue.enqueue(entityType as any, entityId, 'delete', targetUid);
        })
        .catch(() => {});
    }
    return false;
  }

  // ⚡ iOS Safari WebKit: deleteDoc() silently hangs. Issue REST DELETE first.
  if (entityType === 'transactions' && entityId && targetUid) {
    try {
      const { deleteTransactionDirectHttp } = await import('./directFirestoreHttp');
      const restRes = await deleteTransactionDirectHttp(entityId, targetUid);
      if (restRes.success) {
        recordFirestoreOp('delete', docRef?.parent?.id || path || 'system', 1);
        import('./syncQueue')
          .then(({ syncQueue }) => syncQueue.remove('transactions', entityId))
          .catch(() => {});
        return true;
      }
      console.warn('[safeDeleteDoc] REST delete failed, falling back to SDK:', restRes.error);
    } catch (restErr) {
      console.warn('[safeDeleteDoc] REST delete error:', restErr);
    }
  }

  try {
    // ⚡ For transaction deletes we already used REST; if SDK ever runs it
    // still has 8s timeout as fail-safe.
    await withTimeout(deleteDoc(docRef), 8000);
    isNetworkPausedForQuota = false;
    recordFirestoreOp('delete', docRef?.parent?.id || path || 'system', 1);
    if (entityType && entityId) {
      import('./syncQueue')
        .then(({ syncQueue }) => {
          syncQueue.remove(entityType as any, entityId);
        })
        .catch(() => {});
    }
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);

    // ─────────────────────────────────────────────────────────────
    // iOS / Safari / PWA REST DELETE fallback.
    // On iOS Safari WebKit, deleteDoc() frequently hangs or silently
    // fails without throwing a catchable error, so the doc stays in
    // Firestore forever (confirmed by cross-device tests where even
    // clear-data + re-signin still shows the deleted record).
    // Fall back to a direct HTTPS REST DELETE — immune to WebKit.
    // ─────────────────────────────────────────────────────────────
    if (!isQuotaExhaustedError(error) && !isPermissionError(error)) {
      if (entityType === 'transactions' && entityId && targetUid) {
        try {
          const { deleteTransactionDirectHttp } = await import('./directFirestoreHttp');
          const httpRes = await deleteTransactionDirectHttp(entityId, targetUid);
          if (httpRes.success) {
            console.log(`[safeDeleteDoc] Recovered tx delete ${entityId} via REST`);
            import('./syncQueue')
              .then(({ syncQueue }) => {
                syncQueue.remove('transactions', entityId);
              })
              .catch(() => {});
            return true;
          }
        } catch (httpErr) {
          console.warn('[safeDeleteDoc] REST delete fallback failed:', httpErr);
        }
      }
    }

    // Automatically enqueue to transactional syncQueue for retry-on-failure
    if (entityType && entityId && targetUid) {
      import('./syncQueue')
        .then(({ syncQueue }) => {
          syncQueue.enqueue(entityType as any, entityId, 'delete', targetUid);
        })
        .catch(() => {});
    }
    return false;
  }
}

export async function safeUpdateDoc(docRef: any, data: any): Promise<boolean> {
  // Guard against quota exhaustion in safeUpdateDoc
  if (isQuotaExhausted()) {
    return false;
  }

  try {
    // Wrap updateDoc in withTimeout(..., 8000) to prevent hanging
    await withTimeout(updateDoc(docRef, cleanForFirestore(data)), 8000);
    isNetworkPausedForQuota = false;
    recordFirestoreOp('write', docRef?.parent?.id || docRef?.path || 'system', 1);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docRef?.path || null);
    return false;
  }
}

/**
 * Tracks document reads performed across the application
 */
export function trackFirestoreReads(
  collectionName: string = 'system',
  count: number = 1
) {
  recordFirestoreOp('read', collectionName, count);
}

/**
 * Tests live connection and write/read status to verify Firestore health & quota
 */
export async function testFirestoreQuotaPing(): Promise<{
  success: boolean;
  latencyMs: number;
  message: string;
}> {
  const startTime = Date.now();
  try {
    // Attempt a light read from publicly allowed systemSettings or test collection
    const { getDoc, doc } = await import('firebase/firestore');
    const testDocRef = doc(db, 'systemSettings', 'contact_info');
    await getDoc(testDocRef);
    const latencyMs = Date.now() - startTime;
    recordFirestoreOp('read', 'system', 1);
    return {
      success: true,
      latencyMs,
      message: 'Firestore connection active. Database online & responsive.',
    };
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    const isExhausted = isQuotaExhaustedError(error);
    return {
      success: false,
      latencyMs,
      message: isExhausted
        ? '⚠️ Firestore Quota Exhausted: Daily limit reached.'
        : `Connection test error: ${error?.message || String(error)}`,
    };
  }
}