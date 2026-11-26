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
  // [v7.6.34] Retry with an EXPLICIT persistent single-tab cache
  // instead of the SDK defaults ({}): a silent fall to a
  // memory-only cache would make every offline reload come up
  // empty, with no visible error. Only if persistence itself is
  // unavailable do we end up on getFirestore, and that path logs
  // loudly so an offline-empty report can be traced to it.
  const singleTabCacheConfig = {
    localCache: persistentLocalCache({
      tabManager: persistentSingleTabManager(undefined),
    }),
  };
  try {
    if (useDefaultDbDirectly) {
      firestoreInstance = initializeFirestore(app, singleTabCacheConfig);
    } else {
      firestoreInstance = initializeFirestore(
        app,
        singleTabCacheConfig,
        firebaseConfig.firestoreDatabaseId as string
      );
    }
    if (typeof window !== 'undefined') {
      console.log('[firebase.ts] Firestore initialized with persistent single-tab cache (fallback)');
    }
  } catch (err2) {
    console.error('[firebase.ts] initializeFirestore failed, using getFirestore (offline cache UNAVAILABLE):', err2);
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

/**
 * Ensures an asynchronous Promise resolves within a fixed time budget.
 * Prevents infinite UI spinning when VPN or mobile network stalls.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 9000,
  // [v7.6.56] The old default ("network slow") was WRONG for the
  // failure users actually hit: the Firebase Auth token endpoint
  // unreachable, so every write/delete timed out while the internet
  // worked fine. The default now says what happened (the Cloud
  // sign-in token could not refresh), that the change is saved
  // on-device, and that it will sync when the connection recovers.
  // A single string cannot distinguish a token timeout from genuine
  // slowness (withTimeout discards the underlying error) — the
  // token wording is correct for every timeout in the 2026-11-26
  // console log, which is the observed failure mode.
  fallbackMessage: string = 'Cloud အကောင့် တိုကင် ပြန်လည်ရယူ၍ မရပါ။ ပြောင်းလဲမှုကို စက်ထဲတွင် သိမ်းထားပြီး ချိတ်ဆက်မှု ပြန်ရလျှင် ပို့ပေးပါမည် (Cloud sign-in token could not be refreshed — saved on this device, will sync when it recovers)'
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
  try {
    clearQuotaExhaustedFlag();
    await enableNetwork(db);
    return true;
  } catch {
    return false;
  }
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
    // [v7.6.56] Never print the user's email into the console:
    // pasted logs then carry identifiers. The returned errInfo and
    // the persisted sync-error history keep the full authInfo for
    // diagnostics — only the console line is redacted.
    const redacted = {
      ...errInfo,
      authInfo: {
        ...errInfo.authInfo,
        email: '[redacted]',
        providerInfo: (errInfo.authInfo.providerInfo || []).map((p) => ({
          ...p,
          email: '[redacted]',
        })),
      },
    };
    console.error('Firestore Error:', JSON.stringify(redacted));
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
  // [v7.2.0] Shared wallet transaction path detection
  const isSharedTx = parts.length === 4 && parts[0] === 'sharedWallets' && parts[2] === 'transactions';
  const sharedDocId = isSharedTx ? parts[1] : undefined;
  const sharedTxId = isSharedTx ? parts[3] : undefined;

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

  // [v7.6.52] DELETE WINS: never write an entity with a pending delete,
  // a dead-lettered delete, a tombstone, or a local deletion marker.
  // The old code wrote first and trusted queue dedup — the immediate
  // write itself resurrected the record on the server.
  if (entityType && entityId) {
    try {
      const { syncQueue } = await import('./syncQueue');
      if (syncQueue.isDeleteBlocked(entityType as any, entityId)) return false;
    } catch {}
  }

  try {
    // [v7.6.52] ONE transport: the immediate attempt and the queue
    // retry engine share executeSyncTask() (SDK + REST fallback).
    // Every setDoc in the app uses { merge: true }; the executor does
    // the same, so `options` is accepted for signature compatibility
    // and intentionally not forwarded.
    const { executeSyncTask } = await import('./syncTransport');
    const result = await executeSyncTask({
      id: `safe_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      entityType: entityType || (isSharedTx ? 'sharedWallets' : undefined),
      entityId: entityId || (isSharedTx ? `${sharedDocId}/transactions/${sharedTxId}` : undefined),
      operation: 'upsert',
      data,
      targetUid: targetUid || auth.currentUser?.uid || '',
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
      docRef,
    } as any);
    if (result.outcome === 'failed') {
      throw new Error(result.error || 'Sync failed');
    }
    recordFirestoreOp('write', docRef?.parent?.id || path || 'system', 1);
    if (entityType && entityId) {
      import('./syncQueue')
        .then(({ syncQueue }) => {
          // [v7.6.60] F1: never drop a pending DELETE task as a
          // side effect of a successful upsert — a delete
          // enqueued while this write was in flight survives.
          syncQueue.removeUpsertOnly(entityType as any, entityId);
        })
        .catch(() => {});
    }
    // Real-time confirmation bridge: a REST-confirmed upsert
    // immediately marks the id confirmed in UI (App listener).
    const confirmedId = entityType === 'transactions' ? entityId : isSharedTx ? sharedTxId : undefined;
    if (result.viaRest && confirmedId && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('ngwe_cloud_tx_confirmed', { detail: [confirmedId] })
      );
    }
    return true;
  } catch (error) {
    // Transport errors are already recorded by the executor; only the
    // retry enqueue below is this function's job now.
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
  // Shared-wallet transaction path (deleteSharedWalletTransaction).
  const isSharedTx = parts.length === 4 && parts[0] === 'sharedWallets' && parts[2] === 'transactions';
  const sharedDocId = isSharedTx ? parts[1] : undefined;
  const sharedTxId = isSharedTx ? parts[3] : undefined;
  const queueEntityType = entityType || (isSharedTx ? 'sharedWallets' : undefined);
  const queueEntityId = entityId || (isSharedTx ? `${sharedDocId}/transactions/${sharedTxId}` : undefined);

  // [v7.6.52] Durable intent FIRST: the delete task (+ tombstone for
  // own transaction deletes) is persisted before any attempt, so a
  // failed attempt can never lose the delete. The task leaves the
  // queue ONLY on server confirmation (executor REST success, or
  // the listener/pull observing the server absence) — never here on
  // a local SDK ack. The old code enqueued on failure and let callers
  // remove the task, which is how deletes were silently lost.
  const recordDeleteIntent = async (): Promise<boolean> => {
    if (!queueEntityType || !queueEntityId) return false;
    // [v7.6.56] Shared-wallet paths carry no users/ targetUid in the
    // path — the old code returned early and NO durable task was
    // ever recorded for them, so a failed shared delete was lost.
    // Fall back to the signed-in user (the executor does the same).
    const intentUid = targetUid || auth.currentUser?.uid;
    if (!intentUid) return false;
    try {
      const { syncQueue } = await import('./syncQueue');
      if (queueEntityType === 'transactions') {
        syncQueue.enqueueTxDelete(queueEntityId, intentUid);
      } else if (queueEntityType) {
        // [v7.6.60] F4: generalized server tombstone for debts,
        // wallets, shops, vehicles and vehicle logs — mirroring
        // the transaction rule (own deletes only; an admin
        // deleting another user's records must not seed
        // tombstones in the victim's collection). The local
        // cache is updated first so this device gates pushes
        // before the tombstone lands server-side. Budgets and
        // categories are excluded (reused doc ids — see
        // deletedMarkers.ts); their delete task alone is queued.
        const { addEntityTombstone, ENTITY_TOMBSTONE_TYPES } =
          await import('../utils/deletedMarkers');
        if (
          (ENTITY_TOMBSTONE_TYPES as readonly string[]).includes(queueEntityType) &&
          intentUid === auth.currentUser?.uid
        ) {
          addEntityTombstone(queueEntityType, queueEntityId);
          syncQueue.enqueue('tombstones', `${queueEntityType}:${queueEntityId}`, 'upsert', intentUid, {
            id: `${queueEntityType}:${queueEntityId}`,
            userId: intentUid,
            entityType: queueEntityType,
            entityId: queueEntityId,
            deletedAt: new Date().toISOString(),
          });
        }
        syncQueue.enqueue(queueEntityType as any, queueEntityId, 'delete', intentUid);
      }
      return true;
    } catch {
      return false;
    }
  };

  // Guard against quota exhaustion and enqueue delete task
  if (isQuotaExhausted()) {
    await recordDeleteIntent();
    return false;
  }

  const intentRecorded = await recordDeleteIntent();

  try {
    // [v7.6.52] ONE transport (see safeSetDoc): REST-first for
    // transaction deletes (immune to the iOS WebKit deleteDoc hang),
    // SDK fallback. An SDK-local accept ('local') is NOT server
    // confirmation — the queued task stays for REST re-confirmation.
    const { executeSyncTask } = await import('./syncTransport');
    const result = await executeSyncTask({
      id: `safe_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      entityType: queueEntityType,
      entityId: queueEntityId,
      operation: 'delete',
      targetUid: targetUid || auth.currentUser?.uid || '',
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
      docRef,
    } as any);
    if (result.outcome === 'confirmed') {
      recordFirestoreOp('delete', docRef?.parent?.id || path || 'system', 1);
      if (queueEntityType && queueEntityId) {
        import('./syncQueue')
          .then(({ syncQueue }) => {
            syncQueue.remove(queueEntityType as any, queueEntityId);
          })
          .catch(() => {});
      }
      return true;
    }
    if (result.outcome === 'local') {
      recordFirestoreOp('delete', docRef?.parent?.id || path || 'system', 1);
      // [v7.6.56] The queued task owns the retry when an intent was
      // recorded (false = not confirmed yet). With NO queue intent
      // (admin / public / direct-only paths) the SDK accept is the
      // only signal there is — keep today's `true`, or admin deletes
      // would report failure for every offline-accepted write.
      return !intentRecorded;
    }
    return false;
  } catch (error) {
    // Transport errors are already recorded by the executor; the
    // queued task above owns the retry.
    return false;
  }
}


export async function safeUpdateDoc(docRef: any, data: any): Promise<boolean> {
  // Guard against quota exhaustion in safeUpdateDoc
  if (isQuotaExhausted()) {
    return false;
  }

  // [v7.6.52] DELETE WINS: a partial update must never resurrect a
  // doc with a pending delete (updateDoc on a deleted doc recreates
  // it). This function stays attempt-only by design — partial-update
  // payloads (incl. deleteField sentinels) cannot round-trip through
  // the upsert queue — so refusal, not enqueueing, is the guard.
  try {
    const path = docRef?.path || null;
    const parts = path ? path.split('/') : [];
    if (parts.length === 4 && parts[0] === 'users') {
      const { syncQueue } = await import('./syncQueue');
      if (syncQueue.isDeleteBlocked(parts[2] as any, parts[3])) return false;
    }
  } catch {}

  try {
    // Wrap updateDoc in withTimeout(..., 8000) to prevent hanging
    await withTimeout(updateDoc(docRef, cleanForFirestore(data)), 8000);
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
    const testDocRef = doc(db, 'systemSettings', 'contactInfo');
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