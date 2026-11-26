/**
 * Robust Transactional Sync Queue with Retry-on-Failure Architecture.
 * Prioritizes pending local changes and guarantees Firestore document consistency
 * by retrying individual document failures with exponential backoff
 * without full state refreshes or UI freezes.
 */

import { doc, setDoc, waitForPendingWrites, writeBatch } from 'firebase/firestore';
import { db, cleanForFirestore, handleFirestoreError, OperationType, withTimeout, auth, isQuotaExhausted, isPermissionError } from './firebase';
import { executeSyncTask } from './syncTransport';
import {
  addTxTombstone,
  fetchTombstoneTxIds,
  isEntityTombstoned,
  isTxDeleted,
  isTxTombstoned,
  isVehicleLogDeleted,
  isWalletDeleted,
} from '../utils/deletedMarkers';


export type SyncEntityType =
  | 'transactions'
  | 'debts'
  | 'wallets'
  | 'categories'
  | 'budgets'
  | 'savingsTargets'
  | 'shops'
  | 'vehicles'
  | 'fuelLogs'
  | 'vehicleMaintenance'
  | 'tirePressureLogs'
  // [v7.5.56] Top-level shared wallet writes: sharedWallets/{docId}
  // (wallet doc) or sharedWallets/{docId}/transactions/{txId}.
  // entityId carries the path segments after 'sharedWallets/'.
  | 'sharedWallets'
  // [v7.6.52] Server-side deletion tombstones: users/{uid}/tombstones/{txId}.
  // Written through the same queue so a delete is resurrection-proof
  // across devices (see docs/SYNC_MECHANISM.md).
  | 'tombstones';

export type SyncOperationType = 'upsert' | 'delete';

export interface SyncQueueItem {
  id: string; // Unique queue task ID
  entityType: SyncEntityType;
  entityId: string;
  operation: SyncOperationType;
  data?: any;
  targetUid: string;
  timestamp: number;
  retryCount: number;
  lastAttemptAt?: number;
  lastError?: string;
  status: 'pending' | 'in_progress' | 'failed';
}

export interface ProcessQueueResult {
  succeeded: number;
  failed: number;
  /** [v7.6.52] Deletes the SDK accepted locally but the server has not confirmed yet. */
  awaitingConfirmation: number;
  succeededEntityIds: { entityType: SyncEntityType; entityId: string }[];
  succeededTxIds: string[];
}

const STORAGE_KEY = 'ngwe_transactional_sync_queue';
const MAX_RETRIES = 10;
const BASE_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;

// [v7.5.56] Permission-denied writes must NEVER retry forever: the rules
// will keep denying them, so retrying burns quota and spins forever.
// After this many attempts a permission-denied item is moved to the
// dead-letter list (surfaced honestly via getFailedItems()) and dropped
// from the queue.
const PERMISSION_MAX_RETRIES = 2;
const DEAD_LETTER_KEY = 'ngwe_sync_queue_dead_letter';

type QueueListener = (items: SyncQueueItem[], isProcessing: boolean) => void;

export class SyncQueueManager {
  private queue: SyncQueueItem[] = [];
  // [v7.5.56] Dead letter: items that gave up (permission-denied after
  // PERMISSION_MAX_RETRIES, or exhausted MAX_RETRIES). They are NOT
  // retried again — the UI surfaces them as "not synced" instead of
  // pretending success. Persisted so the failure survives a reload.
  private deadLetter: SyncQueueItem[] = [];
  private isProcessing: boolean = false;
  private processingPromise: Promise<ProcessQueueResult> | null = null;
  private listeners: Set<QueueListener> = new Set();
  private timer: any = null;

  constructor() {
    this.loadQueue();
    this.loadDeadLetter();
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.triggerImmediateProcess());
      window.addEventListener('focus', () => this.triggerImmediateProcess());
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.triggerImmediateProcess();
        }
      });
      // Periodic background processing heartbeat (every 2 minutes)
      this.timer = setInterval(() => {
        if (this.hasPendingItems() && typeof navigator !== 'undefined' && navigator.onLine && !isQuotaExhausted()) {
          this.processQueue();
        }
      }, 120000);
    }
  }

  private loadQueue() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          this.queue = parsed.map((item) => ({
            ...item,
            // Reset in_progress items to pending on boot
            status: item.status === 'in_progress' ? 'pending' : item.status,
          }));
        }
      }
    } catch {
      this.queue = [];
    }
  }

  private saveQueue() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
    } catch {}
    this.notifyListeners();
  }

  private loadDeadLetter() {
    try {
      const saved = localStorage.getItem(DEAD_LETTER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) this.deadLetter = parsed;
      }
    } catch {
      this.deadLetter = [];
    }
  }

  private saveDeadLetter() {
    try {
      localStorage.setItem(DEAD_LETTER_KEY, JSON.stringify(this.deadLetter));
    } catch {}
    this.notifyListeners();
  }

  /**
   * [v7.5.56] Items that gave up and will NOT be retried automatically
   * (permission-denied after bounded retries, or exhausted retries).
   * The UI must surface these as "not synced" — never as success.
   */
  public getFailedItems(): SyncQueueItem[] {
    return [...this.deadLetter];
  }

  public getFailedCount(): number {
    return this.deadLetter.length;
  }

  /** Drop dead-letter items (e.g. after the user acknowledged / fixed them). */
  public clearFailedItems(entityType?: SyncEntityType) {
    if (entityType) {
      this.deadLetter = this.deadLetter.filter((i) => i.entityType !== entityType);
    } else {
      this.deadLetter = [];
    }
    this.saveDeadLetter();
  }

  /** Move an item to the dead-letter list and remove it from the queue. */
  private moveToDeadLetter(task: SyncQueueItem) {
    this.deadLetter = this.deadLetter.filter((i) => i.id !== task.id);
    this.deadLetter.push({ ...task, status: 'failed' });
    this.queue = this.queue.filter((q) => q.id !== task.id);
    this.saveDeadLetter();
    // [v7.6.52] Subscribers (SyncStatusDrawer) must refresh: a
    // dead-lettered delete used to vanish silently from every UI.
    this.notifyListeners();
    console.warn(
      `[SyncQueue] Giving up on ${task.entityType}/${task.entityId} after ${task.retryCount} attempt(s) — moved to dead letter (not synced, will NOT auto-retry):`,
      task.lastError
    );
  }

  public subscribe(listener: QueueListener): () => void {
    this.listeners.add(listener);
    listener([...this.queue], this.isProcessing);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    const copy = [...this.queue];
    this.listeners.forEach((l) => l(copy, this.isProcessing));
  }

  public getQueue(): SyncQueueItem[] {
    return [...this.queue];
  }

  public getPendingCount(): number {
    return this.queue.filter((q) => q.status !== 'in_progress').length;
  }

  public hasPendingItems(): boolean {
    return this.queue.some((q) => q.status === 'pending' || q.status === 'failed');
  }

  public getPendingEntityIds(entityType: SyncEntityType): Set<string> {
    const ids = new Set<string>();
    this.queue.forEach((item) => {
      if (item.entityType === entityType) {
        ids.add(item.entityId);
      }
    });
    return ids;
  }

  public isEntityPending(entityType: SyncEntityType, entityId: string): boolean {
    return this.queue.some(
      (item) => item.entityType === entityType && item.entityId === entityId
    );
  }

  /**
   * Check if a specific entity has a pending DELETE operation in the queue.
   * Used to prevent accidental resurrection during reconciliation.
   */
  public isEntityPendingDelete(entityType: SyncEntityType, entityId: string): boolean {
    return this.queue.some(
      (item) =>
        item.entityType === entityType &&
        item.entityId === entityId &&
        item.operation === 'delete'
    );
  }

  /**
   * [v7.6.52] Check if a specific entity gave up and sits in the
   * dead-letter list. A dead-lettered delete must keep blocking
   * re-merges/re-pushes exactly like a pending one — otherwise the
   * listener unmarks it and the record resurrects.
   */
  public isEntityInDeadLetter(entityType: SyncEntityType, entityId: string): boolean {
    return this.deadLetter.some(
      (item) => item.entityType === entityType && item.entityId === entityId
    );
  }

  /**
   * [v7.6.56] Delete-only dead-letter check: a dead-lettered UPSERT
   * must NOT block a later delete for the same id (the old
   * isEntityInDeadLetter check treated ANY dead-letter entry as a
   * delete block, so one failed write permanently vetoed the
   * delete). Delete-blocked decisions use this; the generic
   * isEntityInDeadLetter stays for the tracker/drawer surfaces
   * that report ANY failure.
   */
  public isEntityDeleteInDeadLetter(entityType: SyncEntityType, entityId: string): boolean {
    return this.deadLetter.some(
      (item) => item.entityType === entityType && item.entityId === entityId && item.operation === 'delete'
    );
  }

  /**
   * [v7.6.52] Re-queue ONE dead-letter item the user explicitly retries.
   * Returns false when no such item exists.
   */
  public retryFailedItem(entityType: SyncEntityType, entityId: string): boolean {
    const idx = this.deadLetter.findIndex(
      (item) => item.entityType === entityType && item.entityId === entityId
    );
    if (idx < 0) return false;
    const [item] = this.deadLetter.splice(idx, 1);
    this.queue.push({ ...item, status: 'pending', lastAttemptAt: 0, retryCount: 0, lastError: undefined });
    this.saveDeadLetter();
    this.saveQueue();
    this.notifyListeners();
    this.triggerImmediateProcess();
    return true;
  }

  /**
   * [v7.6.52] SINGLE gate every push/merge/reconcile path must consult
   * before writing or re-merging an entity: a pending delete, a
   * dead-lettered delete, a server tombstone, or a local deletion
   * marker all mean "do not resurrect this id". For shared-wallet
   * transaction paths the caller checks the composite id separately
   * (see syncDataToCloud); this method covers the entity's own id.
   */
  public isDeleteBlocked(entityType: SyncEntityType, entityId: string): boolean {
    if (this.isEntityPendingDelete(entityType, entityId)) return true;
    if (this.isEntityDeleteInDeadLetter(entityType, entityId)) return true;
    if (entityType === 'transactions') {
      if (isTxDeleted(entityId) || isTxTombstoned(entityId)) return true;
    }
    if (entityType === 'wallets' && isWalletDeleted(entityId)) return true;
    if (
      (entityType === 'fuelLogs' ||
        entityType === 'vehicleMaintenance' ||
        entityType === 'tirePressureLogs') &&
      isVehicleLogDeleted(entityType, entityId)
    ) {
      return true;
    }
    // [v7.6.60] F4: generalized server tombstones — a debt, wallet,
    // shop, vehicle or vehicle log deleted on ANY device stays
    // deleted here too, once this device has fetched the tombstone
    // (syncDataToCloud fetches at the start of every push; the
    // listeners filter on this same gate). Budgets/categories are
    // excluded from tombstone WRITES (reused doc ids) but the read
    // leg is harmless for them: no such key is ever written.
    if (isEntityTombstoned(entityType, entityId)) return true;
    return false;
  }

  /**
   * [v7.6.52] Durably record a transaction delete: the server
   * tombstone (cross-device resurrection guard) AND the delete task,
   * in one call. The tombstone is written only for the signed-in
   * user's own deletes — an admin deleting another user's records
   * must not create dead-letter noise in the victim's collection.
   * Also updates the local tombstone cache immediately so this
   * device gates pushes even before the tombstone lands server-side.
   */
  public enqueueTxDelete(txId: string, targetUid: string): string[] {
    if (!txId || !targetUid) return [];
    const ids: string[] = [];
    if (targetUid === auth.currentUser?.uid) {
      addTxTombstone(txId);
      ids.push(
        this.enqueue('tombstones', txId, 'upsert', targetUid, {
          id: txId,
          userId: targetUid,
          entityType: 'transactions',
          deletedAt: new Date().toISOString(),
        })
      );
    }
    ids.push(this.enqueue('transactions', txId, 'delete', targetUid));
    return ids;
  }

  /**
   * Remove a specific item from the queue when confirmed or resolved elsewhere
   */
  public remove(entityType: SyncEntityType, entityId: string) {
    const prevLen = this.queue.length;
    this.queue = this.queue.filter(
      (item) => !(item.entityType === entityType && item.entityId === entityId)
    );
    if (this.queue.length !== prevLen) {
      this.saveQueue();
    }
  }

  /**
   * [v7.6.60] F1: remove() is operation-blind — it drops a pending
   * DELETE task for the id too. Upsert-success paths must NEVER do
   * that: a delete enqueued while the upsert was in flight (the
   * entry guard ran BEFORE the up-to-12s write) would be silently
   * lost, and the record would stay on every other device. This
   * variant removes only non-delete tasks. Delete tasks leave the
   * queue ONLY on server confirmation (doProcessQueue, by task
   * id), the listener's confirmed-missing prune, or explicit user
   * discard (SyncStatusDrawer / tracker modal, which keep using
   * remove()) — never as a side effect of a successful write.
   */
  public removeUpsertOnly(entityType: SyncEntityType, entityId: string) {
    const prevLen = this.queue.length;
    this.queue = this.queue.filter(
      (item) =>
        !(item.entityType === entityType && item.entityId === entityId && item.operation !== 'delete')
    );
    if (this.queue.length !== prevLen) {
      this.saveQueue();
    }
  }

  /**
   * Purge orphaned items in queue that no longer exist in local entities
   */
  public purgeOrphanedTransactions(validTxIds: Set<string>) {
    const prevLen = this.queue.length;
    this.queue = this.queue.filter((item) => {
      if (item.entityType === 'transactions' && item.operation === 'upsert') {
        return validTxIds.has(item.entityId);
      }
      return true;
    });
    if (this.queue.length !== prevLen) {
      this.saveQueue();
    }
  }

  /**
   * Enqueue a transactional upsert or delete task with smart deduplication.
   * If a task for the exact same entity already exists, it is merged to the latest state.
   */
  public enqueue(
    entityType: SyncEntityType,
    entityId: string,
    operation: SyncOperationType,
    targetUid: string,
    data?: any
  ): string {
    if (!targetUid || !entityId) return '';

    // [v7.6.52] DELETE WINS (tombstone/marker leg): refuse an upsert
    // for an id with a pending delete, a dead-lettered delete, a
    // tombstone, or a local deletion marker — even when no delete
    // task is currently queued (e.g. the delete already confirmed).
    // The pending-task leg below only covers deletes still in the
    // queue; without this leg any later enqueue() resurrects the
    // record. Tombstone upserts themselves are exempt: they ARE the
    // marker.
    if (operation === 'upsert' && entityType !== 'tombstones' && this.isDeleteBlocked(entityType, entityId)) {
      console.warn(
        `[SyncQueue] Dropping upsert for ${entityType}/${entityId}: delete-blocked (pending delete, dead-letter, tombstone, or marker) — delete wins.`
      );
      return '';
    }

    const existingIdx = this.queue.findIndex(
      (item) => item.entityType === entityType && item.entityId === entityId && item.targetUid === targetUid
    );

    const taskId = existingIdx >= 0 ? this.queue[existingIdx].id : `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newItem: SyncQueueItem = {
      id: taskId,
      entityType,
      entityId,
      operation,
      // [v7.5.56] sharedWallets payloads already carry the correct id and
      // walletId (shared doc id) — do NOT stamp the composite entityId /
      // userId onto them, or the rules (walletId == path walletId) deny
      // the write.
      data: operation === 'upsert' ? (entityType === 'sharedWallets' ? { ...data } : { ...data, id: entityId, userId: targetUid }) : undefined,
      targetUid,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
    };

    // [v7.6.52] DELETE WINS: an upsert for an id with a pending
    // delete must never replace (cancel) that delete — the old
    // replace-with-latest behaviour silently resurrected deletes
    // whenever any later upsert enqueue raced them.
    if (
      existingIdx >= 0 &&
      operation === 'upsert' &&
      this.queue[existingIdx].operation === 'delete'
    ) {
      console.warn(
        `[SyncQueue] Dropping upsert for ${entityType}/${entityId}: a delete is already pending — delete wins.`
      );
      return this.queue[existingIdx].id;
    }

    if (existingIdx >= 0) {
      // Replace with latest operation, but PRESERVE the retry
      // clock: resetting retryCount/lastAttemptAt on every replace
      // let a flapping task retry forever without backoff or
      // dead-lettering (the replace erased its history). A
      // same-operation replace keeps the old counters; a new
      // operation starts them over.
      const prev = this.queue[existingIdx];
      if (prev.operation === operation) {
        newItem.retryCount = prev.retryCount || 0;
        newItem.lastAttemptAt = prev.lastAttemptAt || 0;
        newItem.status = prev.status === 'in_progress' ? 'pending' : prev.status;
      }
      this.queue[existingIdx] = newItem;
    } else {
      this.queue.push(newItem);
    }

    this.saveQueue();
    this.triggerImmediateProcess();
    return taskId;
  }

  /**
   * [v7.5.56] Queue a shared-wallet transaction write:
   * sharedWallets/{sharedDocId}/transactions/{tx.id} (set/merge).
   * The payload's walletId is forced to the shared doc id so the
   * Firestore rules (request.resource.data.walletId == path walletId) pass.
   * `ownerUid` is kept for logging/dedup only — the path is top-level.
   */
  public enqueueSharedWalletTx(sharedDocId: string, tx: any, ownerUid: string): string {
    if (!sharedDocId || !tx?.id) return '';
    return this.enqueue(
      'sharedWallets',
      `${sharedDocId}/transactions/${tx.id}`,
      'upsert',
      ownerUid,
      { ...tx, walletId: sharedDocId }
    );
  }

  /** [v7.5.56] Queue a shared-wallet transaction delete. */
  public enqueueSharedWalletTxDelete(sharedDocId: string, txId: string, ownerUid: string): string {
    if (!sharedDocId || !txId) return '';
    return this.enqueue('sharedWallets', `${sharedDocId}/transactions/${txId}`, 'delete', ownerUid);
  }

  /**
   * [v7.5.56] Queue a shared-wallet debt-mirror write:
   * sharedWallets/{sharedDocId}/debts/{debt.id} (set/merge). The debt
   * is passed through unchanged — its walletId MUST stay the wallet's
   * id (the debts read rule maps it to the shared doc); never force
   * it to the doc id the way transaction payloads do.
   */
  public enqueueSharedWalletDebt(sharedDocId: string, debt: any, ownerUid: string): string {
    if (!sharedDocId || !debt?.id) return '';
    return this.enqueue(
      'sharedWallets',
      `${sharedDocId}/debts/${debt.id}`,
      'upsert',
      ownerUid,
      { ...debt }
    );
  }

  /** [v7.5.56] Queue a shared-wallet debt-mirror delete. */
  public enqueueSharedWalletDebtDelete(sharedDocId: string, debtId: string, ownerUid: string): string {
    if (!sharedDocId || !debtId) return '';
    return this.enqueue('sharedWallets', `${sharedDocId}/debts/${debtId}`, 'delete', ownerUid);
  }

  /** [v7.5.56] Queue a shared wallet document write: sharedWallets/{sharedDocId}. */
  public enqueueSharedWalletDoc(sharedDocId: string, data: any, ownerUid: string): string {
    if (!sharedDocId) return '';
    return this.enqueue('sharedWallets', sharedDocId, 'upsert', ownerUid, data);
  }

  /**
   * Bulk enqueue multiple items (e.g. initial reconcile of local items).
   */
  public enqueueBatch(
    items: {
      entityType: SyncEntityType;
      entityId: string;
      operation: SyncOperationType;
      targetUid: string;
      data?: any;
    }[]
  ) {
    if (!items || items.length === 0) return;

    items.forEach(({ entityType, entityId, operation, targetUid, data }) => {
      // [v7.6.52] DELETE WINS (tombstone/marker leg, same as enqueue()).
      if (operation === 'upsert' && entityType !== 'tombstones' && this.isDeleteBlocked(entityType, entityId)) {
        return;
      }
      const existingIdx = this.queue.findIndex(
        (item) => item.entityType === entityType && item.entityId === entityId && item.targetUid === targetUid
      );

      const taskId = existingIdx >= 0 ? this.queue[existingIdx].id : `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const newItem: SyncQueueItem = {
        id: taskId,
        entityType,
        entityId,
        operation,
        // [v7.5.56] See enqueue(): sharedWallets payloads keep their own
        // id / walletId; never stamp the composite entityId onto them.
        data: operation === 'upsert' ? (entityType === 'sharedWallets' ? { ...data } : { ...data, id: entityId, userId: targetUid }) : undefined,
        targetUid,
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
      };

      // [v7.6.52] DELETE WINS (same rule as enqueue()): a batched
      // upsert never cancels a pending delete for the same entity.
      if (
        existingIdx >= 0 &&
        operation === 'upsert' &&
        this.queue[existingIdx].operation === 'delete'
      ) {
        return;
      }

      if (existingIdx >= 0) {
        // [v7.6.56] Same retry-clock preservation as enqueue():
        // a batched same-operation replace keeps the old
        // retryCount/lastAttemptAt/status instead of erasing the
        // task's failure history.
        const prev = this.queue[existingIdx];
        if (prev.operation === operation) {
          newItem.retryCount = prev.retryCount || 0;
          newItem.lastAttemptAt = prev.lastAttemptAt || 0;
          newItem.status = prev.status === 'in_progress' ? 'pending' : prev.status;
        }
        this.queue[existingIdx] = newItem;
      } else {
        this.queue.push(newItem);
      }
    });

    this.saveQueue();
    this.triggerImmediateProcess();
  }

  public triggerImmediateProcess() {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    setTimeout(() => this.processQueue(), 50);
  }

  /**
   * Concurrency-safe queue processor. If a process is already running,
   * returns the active promise rather than returning empty 0s.
   */
  public async processQueue(): Promise<ProcessQueueResult> {
    if (isQuotaExhausted()) {
      return { succeeded: 0, failed: 0, awaitingConfirmation: 0, succeededEntityIds: [], succeededTxIds: [] };
    }
    if (this.processingPromise) {
      return this.processingPromise;
    }
    this.processingPromise = this.doProcessQueue();
    try {
      return await this.processingPromise;
    } finally {
      this.processingPromise = null;
    }
  }

  /**
   * Internal processing loop for transactional sync queue.
   */
  private async doProcessQueue(): Promise<ProcessQueueResult> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { succeeded: 0, failed: 0, awaitingConfirmation: 0, succeededEntityIds: [], succeededTxIds: [] };
    }

    const now = Date.now();
    // Unstick tasks that have been in_progress for > 15 seconds
    this.queue.forEach((item) => {
      if (item.status === 'in_progress' && now - (item.lastAttemptAt || 0) > 15000) {
        item.status = 'pending';
      }
    });

    const readyItems = this.queue.filter((item) => {
      if (item.status === 'in_progress') return false;
      // [v7.6.56] Backoff applies to EVERY retried task, not only
      // 'failed' ones: an SDK-local accept ('local') leaves the
      // task 'pending' with retryCount > 0, and without this gate
      // every trigger (enqueue, focus, heartbeat) re-attempted it
      // immediately — the retry storm. Manual retries
      // (retryTargetedMissing / retryAllFailed / retryFailedItem)
      // reset retryCount + lastAttemptAt, so they still run at once.
      if (item.retryCount > 0) {
        const backoff = Math.min(BASE_BACKOFF_MS * Math.pow(2, Math.max(0, item.retryCount - 1)), MAX_BACKOFF_MS);
        if (now - (item.lastAttemptAt || 0) < backoff) {
          return false;
        }
      }
      return true;
    });

    if (readyItems.length === 0) {
      return { succeeded: 0, failed: 0, awaitingConfirmation: 0, succeededEntityIds: [], succeededTxIds: [] };
    }

    this.isProcessing = true;
    this.notifyListeners();

    // Mark as in_progress
    readyItems.forEach((item) => {
      item.status = 'in_progress';
      item.lastAttemptAt = now;
    });
    this.saveQueue();

    let succeeded = 0;
    let failed = 0;
    let awaitingConfirmation = 0;

    const succeededEntityIds: { entityType: SyncEntityType; entityId: string }[] = [];
    const succeededTxIds: string[] = [];

    try {
      // Process in batches of up to 20 for speed and atomicity
      const BATCH_SIZE = 20;
      for (let i = 0; i < readyItems.length; i += BATCH_SIZE) {
        const batchItems = readyItems.slice(i, i + BATCH_SIZE);

        // [v7.6.52] ONE transport: every task executes through
        // executeSyncTask() (SDK attempt + REST fallback, transport
        // order per kind). The old upsert-only REST fallback block is
        // gone — deletes get the same fallback inside the executor.
        const outcomes = await Promise.all(
          batchItems.map(async (task) => {
            try {
              const result = await executeSyncTask(task);
              return { task, result };
            } catch (err: any) {
              // The executor never throws for transport failures, but
              // a docRef parse error (invalid sharedWallets entityId)
              // surfaces here — treat it as a failure, not a crash.
              return {
                task,
                result: {
                  outcome: 'failed' as const,
                  error: err instanceof Error ? err.message : String(err),
                  permissionDenied: isPermissionError(err),
                },
              };
            }
          })
        );

        for (const { task, result } of outcomes) {
          if (result.outcome === 'confirmed') {
            succeeded++;
            succeededEntityIds.push({ entityType: task.entityType, entityId: task.entityId });
            if (task.entityType === 'transactions' && task.operation === 'upsert') {
              succeededTxIds.push(task.entityId);
            }
            this.queue = this.queue.filter((q) => q.id !== task.id);
          } else if (result.outcome === 'local') {
            // SDK accepted the delete locally; the server has NOT
            // confirmed it. Keep the task (REST-first re-attempt on
            // the next run) without inflating the failure count —
            // but COUNT the attempt, so the ready-filter backoff
            // spaces the re-attempts instead of storming them.
            awaitingConfirmation++;
            task.status = 'pending';
            task.retryCount = (task.retryCount || 0) + 1;
            task.lastAttemptAt = Date.now();
          } else {
            failed++;
            task.status = 'failed';
            task.retryCount = (task.retryCount || 0) + 1;
            task.lastError = result.error || 'Sync failed';
            // [v7.5.56] Bounded retry for permission-denied: the rules
            // will keep denying this write, so retrying forever burns
            // quota and lies about the sync state. Give up after
            // PERMISSION_MAX_RETRIES attempts and surface the failure
            // via the dead-letter list (getFailedItems) — honest
            // "not synced", never a false success.
            if (result.permissionDenied && task.retryCount >= PERMISSION_MAX_RETRIES) {
              this.moveToDeadLetter(task);
            } else if (task.retryCount >= MAX_RETRIES) {
              // [v7.6.56] A task that can never succeed must NOT
              // retry forever: the old code only warned and kept
              // retrying at the 30s cap without end, flooding the
              // console and burning quota. Dead-letter it like a
              // permission denial — visible, never auto-retried.
              this.moveToDeadLetter(task);
            }
          }
        }

        this.saveQueue();
      }
    } finally {
      this.isProcessing = false;
      this.saveQueue();
    }

    return { succeeded, failed, awaitingConfirmation, succeededEntityIds, succeededTxIds };
  }

  /**
   * Forced Reconciliation Check: Matches cloudTxIds Set against local transactions
   * and triggers a specific writeBatch ONLY for items truly missing in Firestore,
   * replacing generic sync loops.
   *
   * ⚠️ CRITICAL: Skips any tx that has a pending DELETE in the queue — pushing
   * them would resurrect a delete that was just issued on this device.
   */
  public async reconcileMissingTxsWithWriteBatch(params: {
    missingTxs: { id: string; [key: string]: any }[];
    targetUid: string;
    cloudTxIds: Set<string>;
  }): Promise<{
    succeededCount: number;
    failedCount: number;
    newlyConfirmedTxIds: string[];
  }> {
    const { missingTxs, targetUid, cloudTxIds } = params;
    if (!targetUid || !missingTxs || missingTxs.length === 0) {
      return { succeededCount: 0, failedCount: 0, newlyConfirmedTxIds: [] };
    }

    // [v7.6.52] Tombstone gate: a tx deleted on ANY device must
    // never be re-pushed by this device's reconcile. The passed
    // cloudTxIds may be stale, so fetch the server's tombstones
    // fresh (falls back to the local cache offline). The local
    // delete-blocked check covers pending/dead-letter deletes and
    // local markers as well — reconcile must respect all of them.
    const tombstones = await fetchTombstoneTxIds(targetUid);

    // Filter strictly for items truly missing in cloudTxIds.
    // ALSO skip items currently queued for deletion — pushing them would
    // resurrect a delete that was just issued on this device.
    const trulyMissing = missingTxs.filter((tx) => {
      if (!tx || !tx.id) return false;
      if (cloudTxIds.has(tx.id)) return false;
      if (tombstones.has(tx.id)) return false;
      if (this.isDeleteBlocked('transactions', tx.id)) return false;
      return true;
    });
    if (trulyMissing.length === 0) {
      return { succeededCount: 0, failedCount: 0, newlyConfirmedTxIds: [] };
    }

    let succeededCount = 0;
    let failedCount = 0;
    const newlyConfirmedTxIds: string[] = [];

    // Firestore writeBatch supports up to 500 operations per batch
    const BATCH_SIZE = 400;
    for (let i = 0; i < trulyMissing.length; i += BATCH_SIZE) {
      const chunk = trulyMissing.slice(i, i + BATCH_SIZE);
      try {
        const batch = writeBatch(db);
        chunk.forEach((tx) => {
          const docRef = doc(db, 'users', targetUid, 'transactions', tx.id);
          const payload = cleanForFirestore({
            ...tx,
            id: tx.id,
            userId: targetUid,
            updatedAt: tx.updatedAt || new Date().toISOString(),
          });
          batch.set(docRef, payload, { merge: true });
        });

        await withTimeout(batch.commit(), 12000);

        chunk.forEach((tx) => {
          // [v7.6.56] Re-check the delete block per item: a delete
          // may have landed while the batch was in flight — never
          // confirm or drop the queue task for an id that is
          // delete-blocked now.
          if (this.isDeleteBlocked('transactions', tx.id)) return;
          succeededCount++;
          newlyConfirmedTxIds.push(tx.id);
          // [v7.6.60] F1: drop only the upsert task — a delete task
          // for this id (enqueued after the re-check above, in the
          // same synchronous stretch this cannot happen, but the
          // method makes the intent structural) must survive.
          this.removeUpsertOnly('transactions', tx.id);
        });
      } catch (err: any) {
        console.warn('[SyncQueue] writeBatch reconciliation error, executing individual fallback writes:', err);
        for (const tx of chunk) {
          // [v7.6.52] Re-check the delete block per item: a delete
          // may have landed while the batch was in flight.
          if (this.isDeleteBlocked('transactions', tx.id)) continue;
          try {
            const docRef = doc(db, 'users', targetUid, 'transactions', tx.id);
            await withTimeout(setDoc(docRef, cleanForFirestore({ ...tx, userId: targetUid }), { merge: true }), 5000);
            succeededCount++;
            newlyConfirmedTxIds.push(tx.id);
            this.removeUpsertOnly('transactions', tx.id);
          } catch (itemErr) {
            // [v7.6.52] REST fallback before giving up and queueing:
            // the SDK transport is the flaky one on iOS WebKit.
            let restRecovered = false;
            try {
              const { pushTransactionsDirectHttp } = await import('./directFirestoreHttp');
              const httpRes = await pushTransactionsDirectHttp([{ ...tx, userId: targetUid } as any], targetUid);
              if (httpRes.success || httpRes.succeededIds.includes(tx.id)) {
                restRecovered = true;
              }
            } catch {
              // Fall through to enqueue below.
            }
            if (restRecovered) {
              succeededCount++;
              newlyConfirmedTxIds.push(tx.id);
              this.removeUpsertOnly('transactions', tx.id);
            } else {
              failedCount++;
              this.enqueue('transactions', tx.id, 'upsert', targetUid, tx);
              handleFirestoreError(itemErr, OperationType.WRITE, `users/${targetUid}/transactions/${tx.id}`);
            }
          }
        }
      }
    }

    return {
      succeededCount,
      failedCount,
      newlyConfirmedTxIds,
    };
  }

  /**
   * [v7.6.60] F3 — batch-confirmation gate. A writeBatch.commit() /
   * setDoc() resolve is only a LOCAL accept under offline
   * persistence, NOT server confirmation — yet syncDataToCloud
   * used to advance its "synced" signature on exactly that signal,
   * and the signature-skip then suppressed every later re-push of
   * identical content. If the server later rejected the write
   * (e.g. permission), nothing re-queued it. After a batch path
   * resolves, wait (bounded) for the SDK to acknowledge the
   * pending writes server-side:
   * - acknowledged -> true; the caller may advance its signature.
   * - timeout / rejection -> enqueue a durable backup task for
   *   every pushed op (delete-guarded by enqueue()/enqueueBatch,
   *   so a delete issued meanwhile still wins) and return false;
   *   the caller must NOT advance its signature, so the next sync
   *   re-pushes instead of skipping. The `waiter` parameter exists
   *   for tests: production callers omit it and the real
   *   waitForPendingWrites is used.
   */
  public async confirmBatchWritesOrEnqueueBackup(
    ops: {
      entityType: SyncEntityType;
      entityId: string;
      operation: SyncOperationType;
      targetUid: string;
      data?: any;
    }[],
    waiter?: () => Promise<void>
  ): Promise<boolean> {
    try {
      await withTimeout(waiter ? waiter() : waitForPendingWrites(db), 5000);
      return true;
    } catch {
      if (ops.length > 0) {
        this.enqueueBatch(ops);
      }
      return false;
    }
  }

  /**
   * Specifically targets documents currently stuck in the syncQueue or missing
   * from the confirmed cloudTxIds set, resetting backoff delays and retrying immediately.
   * Directly pushes missing transactions to guarantee instant cloud confirmation.
   */
  public async retryTargetedMissing({
    missingTxs,
    targetUid,
    cloudTxIds,
    allLocalTxIds,
  }: {
    missingTxs?: { id: string; [key: string]: any }[];
    targetUid: string;
    cloudTxIds: Set<string>;
    allLocalTxIds?: Set<string>;
  }): Promise<{
    succeeded: number;
    failed: number;
    newlyConfirmedTxIds: string[];
  }> {
    if (!targetUid) return { succeeded: 0, failed: 0, newlyConfirmedTxIds: [] };

    // 1. Purge any orphaned queue items if local valid IDs are provided
    if (allLocalTxIds && allLocalTxIds.size > 0) {
      this.purgeOrphanedTransactions(allLocalTxIds);
    }

    let succeeded = 0;
    let failed = 0;
    const newlyConfirmedTxIds: string[] = [];

    // 2. Forced reconciliation writeBatch for truly missing transactions
    if (missingTxs && missingTxs.length > 0) {
      const reconcileRes = await this.reconcileMissingTxsWithWriteBatch({
        missingTxs,
        targetUid,
        cloudTxIds,
      });
      succeeded += reconcileRes.succeededCount;
      failed += reconcileRes.failedCount;
      newlyConfirmedTxIds.push(...reconcileRes.newlyConfirmedTxIds);
    }

    // 3. Unstuck all targetUid items remaining in the queue (reset failed/pending backoff timer)
    this.queue.forEach((item) => {
      if (item.targetUid === targetUid) {
        item.status = 'pending';
        item.lastAttemptAt = 0; // bypass backoff
        item.retryCount = 0; // reset retry counter
      }
    });
    this.saveQueue();

    // 4. Process queue for any remaining items (debts, wallets, etc.)
    const queueRes = await this.processQueue();
    succeeded += queueRes.succeeded;
    failed += queueRes.failed;
    queueRes.succeededTxIds.forEach((id) => {
      if (!newlyConfirmedTxIds.includes(id)) {
        newlyConfirmedTxIds.push(id);
      }
    });

    // 5. Try waiting for Firestore pending writes flush (non-blocking if timeout)
    try {
      await withTimeout(waitForPendingWrites(db), 3000);
    } catch {
      // Timeout is normal if offline or slow connection, already committed locally
    }

    return {
      succeeded,
      failed,
      newlyConfirmedTxIds,
    };
  }

  /**
   * Clears the entire queue (or for a specific user)
   */
  public clearQueue(targetUid?: string) {
    if (targetUid) {
      this.queue = this.queue.filter((q) => q.targetUid !== targetUid);
    } else {
      this.queue = [];
    }
    this.saveQueue();
    this.notifyListeners();
  }

  /**
   * Retries all failed items immediately.
   * [v7.5.56] Also re-queues dead-letter items the user explicitly
   * retries (e.g. after permissions were fixed) — they are NOT
   * retried automatically.
   */
  public retryAllFailed() {
    this.queue.forEach((item) => {
      item.status = 'pending';
      item.lastAttemptAt = 0;
      item.retryCount = 0;
    });
    if (this.deadLetter.length > 0) {
      this.deadLetter.forEach((item) => {
        this.queue.push({ ...item, status: 'pending', lastAttemptAt: 0, retryCount: 0, lastError: undefined });
      });
      this.deadLetter = [];
      this.saveDeadLetter();
    }
    this.saveQueue();
    this.notifyListeners();
    this.triggerImmediateProcess();
  }
}

export const syncQueue = new SyncQueueManager();