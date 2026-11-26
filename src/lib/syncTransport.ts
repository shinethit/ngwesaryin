/**
 * [v7.6.52] ONE canonical sync transport.
 *
 * Every user-data write or delete in the app executes through
 * executeSyncTask() — either as the immediate attempt inside safe*()
 * (src/lib/firebase.ts) or as the retry engine inside syncQueue's
 * processQueue(). There is no third write path: direct SDK/REST calls
 * for user data outside this module are a bug (see docs/SYNC_MECHANISM.md
 * for the audited list of the remaining direct calls and why each is
 * outside the user-data pipeline).
 *
 * Transport order per task kind (evidence-driven):
 * - Transaction DELETE: REST first. The Firestore SDK's deleteDoc()
 *   silently hangs on iOS Safari WebKit (documented in firebase.ts
 *   since v6.x, confirmed by cross-device tests); the REST DELETE is
 *   immune to it and its ok/404 response IS server confirmation.
 * - Transaction UPSERT: SDK first, REST PATCH fallback (the queue's
 *   long-standing behaviour; the listener + cloudTxIds verify it).
 * - Shared-wallet transaction DELETE: REST first (same WebKit reason),
 *   SDK fallback. Shared-wallet UPSERT: SDK first, REST fallback.
 * - Everything else: SDK only (no REST helper exists); a resolved SDK
 *   call counts as confirmed for these kinds (documented asymmetry:
 *   additive + listener-verified kinds vs destructive transaction
 *   deletes, which need REST confirmation).
 *
 * Outcomes:
 * - 'confirmed': the server acknowledged the write/delete.
 * - 'local': ONLY for transaction deletes — the SDK accepted the
 *   mutation locally (offline persistence) but the server has NOT
 *   confirmed it. The caller MUST keep the queue task so the delete
 *   is re-attempted (REST-first) until confirmed.
 * - 'failed': neither transport worked. The caller keeps/queues the
 *   task with backoff; permission-denied failures are flagged so the
 *   queue can dead-letter them instead of retrying forever.
 */

import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import {
  auth,
  cleanForFirestore,
  db,
  handleFirestoreError,
  isPermissionError,
  isQuotaExhausted,
  OperationType,
  withTimeout,
} from './firebase';
import type { SyncQueueItem } from './syncQueue';

export type SyncExecuteOutcome = 'confirmed' | 'local' | 'failed';

export interface SyncExecuteResult {
  outcome: SyncExecuteOutcome;
  /** True when the server confirmation arrived via the REST transport. */
  viaRest?: boolean;
  /** True when the failure is a permission denial (rules will keep denying). */
  permissionDenied?: boolean;
  /** True when the failure is a quota exhaustion. */
  quotaExceeded?: boolean;
  error?: string;
}

const SDK_TIMEOUT_MS = 12000;

/** Parse a queue task into its Firestore document reference. */
export function resolveTaskDocRef(
  entityType: string,
  entityId: string,
  effectiveUid: string
): any {
  if (entityType === 'sharedWallets') {
    const parts = entityId.split('/');
    if (parts.length === 1 && parts[0]) {
      return doc(db, 'sharedWallets', parts[0]);
    }
    if (
      parts.length === 3 &&
      (parts[1] === 'transactions' || parts[1] === 'debts') &&
      parts[0] &&
      parts[2]
    ) {
      return doc(db, 'sharedWallets', parts[0], parts[1], parts[2]);
    }
    throw new Error(`Invalid sharedWallets entityId: ${entityId}`);
  }
  return doc(db, 'users', effectiveUid, entityType, entityId);
}

function isSharedTxTask(task: SyncQueueItem): { sharedDocId: string; txId: string } | null {
  if (task.entityType !== 'sharedWallets') return null;
  const parts = task.entityId.split('/');
  if (parts.length === 3 && parts[1] === 'transactions' && parts[0] && parts[2]) {
    return { sharedDocId: parts[0], txId: parts[2] };
  }
  return null;
}

function restErrorIsPermission(message: string): boolean {
  return message.includes('403') || message.toLowerCase().includes('permission');
}

function restErrorIsQuota(message: string): boolean {
  return (
    message.includes('429') ||
    message.includes('Quota') ||
    message.includes('RESOURCE_EXHAUSTED')
  );
}

export async function executeSyncTask(
  task: SyncQueueItem & { docRef?: any }
): Promise<SyncExecuteResult> {
  const effectiveUid = task.targetUid || auth.currentUser?.uid;
  // A caller-supplied docRef (safe* for admin/public paths) does not
  // need a uid; queue tasks always carry targetUid.
  if (!effectiveUid && !task.docRef) {
    return { outcome: 'failed', error: 'User not authenticated' };
  }
  if (isQuotaExhausted()) {
    return { outcome: 'failed', error: 'Quota exhausted', quotaExceeded: true };
  }

  const path =
    task.docRef?.path ||
    (task.entityType === 'sharedWallets'
      ? `sharedWallets/${task.entityId}`
      : `users/${effectiveUid}/${task.entityType}/${task.entityId}`);
  const opType = task.operation === 'delete' ? OperationType.DELETE : OperationType.WRITE;

  if (task.operation === 'delete') {
    return executeDelete(task, effectiveUid || '', path, opType);
  }
  return executeUpsert(task, effectiveUid || '', path, opType);
}

async function executeDelete(
  task: SyncQueueItem & { docRef?: any },
  effectiveUid: string,
  path: string,
  opType: OperationType
): Promise<SyncExecuteResult> {
  const sharedTx = isSharedTxTask(task);

  // Transaction deletes: REST first (immune to the iOS WebKit hang).
  if (task.entityType === 'transactions' || sharedTx) {
    try {
      const { deleteTransactionDirectHttp, deleteSharedTransactionDirectHttp } =
        await import('./directFirestoreHttp');
      const restRes = sharedTx
        ? await deleteSharedTransactionDirectHttp(sharedTx.sharedDocId, sharedTx.txId)
        : await deleteTransactionDirectHttp(task.entityId, effectiveUid);
      if (restRes.success) {
        return { outcome: 'confirmed', viaRest: true };
      }
      console.warn('[syncTransport] REST delete failed, falling back to SDK:', restRes.error);
      if (restRes.error && restErrorIsPermission(restRes.error)) {
        return {
          outcome: 'failed',
          error: restRes.error,
          permissionDenied: true,
        };
      }
    } catch (restErr: any) {
      console.warn('[syncTransport] REST delete threw, falling back to SDK:', restErr?.message || restErr);
    }
  }

  try {
    const docRef = task.docRef || resolveTaskDocRef(task.entityType, task.entityId, effectiveUid);
    await withTimeout(deleteDoc(docRef), SDK_TIMEOUT_MS);
    // Non-transaction deletes have no REST confirmation available: an
    // SDK resolve is the best signal there is. Transaction deletes
    // MUST NOT count an SDK resolve as confirmation (offline
    // persistence resolves locally while the server never hears it) —
    // the queue task stays until REST (or the listener) confirms.
    if (task.entityType === 'transactions' || sharedTx) {
      return { outcome: 'local' };
    }
    return { outcome: 'confirmed' };
  } catch (err: any) {
    handleFirestoreError(err, opType, path);
    const message = err instanceof Error ? err.message : String(err);
    return {
      outcome: 'failed',
      error: message,
      permissionDenied: isPermissionError(err),
      quotaExceeded: message.includes('resource-exhausted') || message.includes('Quota'),
    };
  }
}

async function executeUpsert(
  task: SyncQueueItem & { docRef?: any },
  effectiveUid: string,
  path: string,
  opType: OperationType
): Promise<SyncExecuteResult> {
  const sharedTx = isSharedTxTask(task);
  let sdkError: any = null;

  try {
    const docRef = task.docRef || resolveTaskDocRef(task.entityType, task.entityId, effectiveUid);
    const payload =
      task.entityType === 'sharedWallets'
        ? cleanForFirestore(task.data || { id: task.entityId })
        : cleanForFirestore(task.data || { id: task.entityId, userId: effectiveUid });
    await withTimeout(setDoc(docRef, payload, { merge: true }), SDK_TIMEOUT_MS);
    return { outcome: 'confirmed' };
  } catch (err: any) {
    sdkError = err;
    handleFirestoreError(err, opType, path);
  }

  // REST fallback for transaction upserts (SDK transport failed).
  if (task.entityType === 'transactions' && task.data) {
    try {
      const { pushTransactionsDirectHttp } = await import('./directFirestoreHttp');
      const httpRes = await pushTransactionsDirectHttp([task.data], effectiveUid);
      if (httpRes.success || httpRes.succeededIds.includes(task.entityId)) {
        console.log(`[syncTransport] Recovered tx ${task.entityId} via direct HTTPS REST push!`);
        return { outcome: 'confirmed', viaRest: true };
      }
      if (httpRes.quotaExceeded) {
        return { outcome: 'failed', error: httpRes.error, quotaExceeded: true };
      }
      if (httpRes.error && restErrorIsPermission(httpRes.error)) {
        return { outcome: 'failed', error: httpRes.error, permissionDenied: true };
      }
      if (httpRes.error && restErrorIsQuota(httpRes.error)) {
        return { outcome: 'failed', error: httpRes.error, quotaExceeded: true };
      }
    } catch (httpErr: any) {
      console.warn('[syncTransport] Direct HTTP fallback attempt:', httpErr?.message || httpErr);
    }
  }

  // REST fallback for shared-wallet transaction upserts.
  if (sharedTx && task.data) {
    try {
      const { pushSharedTransactionDirectHttp } = await import('./directFirestoreHttp');
      const httpRes = await pushSharedTransactionDirectHttp(sharedTx.sharedDocId, task.data);
      if (httpRes.success) {
        return { outcome: 'confirmed', viaRest: true };
      }
      if (httpRes.error && restErrorIsPermission(httpRes.error)) {
        return { outcome: 'failed', error: httpRes.error, permissionDenied: true };
      }
      if (httpRes.error && restErrorIsQuota(httpRes.error)) {
        return { outcome: 'failed', error: httpRes.error, quotaExceeded: true };
      }
    } catch (httpErr: any) {
      console.warn('[syncTransport] Shared REST fallback attempt:', httpErr?.message || httpErr);
    }
  }

  const message = sdkError instanceof Error ? sdkError.message : String(sdkError);
  return {
    outcome: 'failed',
    error: message,
    permissionDenied: isPermissionError(sdkError),
  };
}
