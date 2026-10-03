/**
 * Robust Transactional Sync Queue with Retry-on-Failure Architecture.
 * Prioritizes pending local changes and guarantees Firestore document consistency
 * by retrying individual document failures with exponential backoff
 * without full state refreshes or UI freezes.
 */

import { doc, setDoc, deleteDoc, waitForPendingWrites, writeBatch } from 'firebase/firestore';
import { db, cleanForFirestore, handleFirestoreError, OperationType, withTimeout, auth, isQuotaExhausted } from './firebase';
import { Transaction } from '../types';

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
  | 'tirePressureLogs';

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
  succeededEntityIds: { entityType: SyncEntityType; entityId: string }[];
  succeededTxIds: string[];
}

const STORAGE_KEY = 'ngwe_transactional_sync_queue';
const MAX_RETRIES = 10;
const BASE_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;

type QueueListener = (items: SyncQueueItem[], isProcessing: boolean) => void;

class SyncQueueManager {
  private queue: SyncQueueItem[] = [];
  private isProcessing: boolean = false;
  private processingPromise: Promise<ProcessQueueResult> | null = null;
  private listeners: Set<QueueListener> = new Set();
  private timer: any = null;

  constructor() {
    this.loadQueue();
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

    const existingIdx = this.queue.findIndex(
      (item) => item.entityType === entityType && item.entityId === entityId && item.targetUid === targetUid
    );

    const taskId = existingIdx >= 0 ? this.queue[existingIdx].id : `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newItem: SyncQueueItem = {
      id: taskId,
      entityType,
      entityId,
      operation,
      data: operation === 'upsert' ? { ...data, id: entityId, userId: targetUid } : undefined,
      targetUid,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
    };

    if (existingIdx >= 0) {
      // Replace with latest operation
      this.queue[existingIdx] = newItem;
    } else {
      this.queue.push(newItem);
    }

    this.saveQueue();
    this.triggerImmediateProcess();
    return taskId;
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
      const existingIdx = this.queue.findIndex(
        (item) => item.entityType === entityType && item.entityId === entityId && item.targetUid === targetUid
      );

      const taskId = existingIdx >= 0 ? this.queue[existingIdx].id : `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const newItem: SyncQueueItem = {
        id: taskId,
        entityType,
        entityId,
        operation,
        data: operation === 'upsert' ? { ...data, id: entityId, userId: targetUid } : undefined,
        targetUid,
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
      };

      if (existingIdx >= 0) {
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
      return { succeeded: 0, failed: 0, succeededEntityIds: [], succeededTxIds: [] };
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
      return { succeeded: 0, failed: 0, succeededEntityIds: [], succeededTxIds: [] };
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
      if (item.status === 'failed') {
        const backoff = Math.min(BASE_BACKOFF_MS * Math.pow(2, Math.max(0, item.retryCount - 1)), MAX_BACKOFF_MS);
        if (now - (item.lastAttemptAt || 0) < backoff) {
          return false;
        }
      }
      return true;
    });

    if (readyItems.length === 0) {
      return { succeeded: 0, failed: 0, succeededEntityIds: [], succeededTxIds: [] };
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
    const succeededEntityIds: { entityType: SyncEntityType; entityId: string }[] = [];
    const succeededTxIds: string[] = [];

    try {
      // Process in batches of up to 20 for speed and atomicity
      const BATCH_SIZE = 20;
      for (let i = 0; i < readyItems.length; i += BATCH_SIZE) {
        const batchItems = readyItems.slice(i, i + BATCH_SIZE);

        const results = await Promise.allSettled(
          batchItems.map(async (task) => {
            const effectiveUid = task.targetUid || auth.currentUser?.uid;
            if (!effectiveUid) throw new Error('User not authenticated');
            const docRef = doc(db, 'users', effectiveUid, task.entityType, task.entityId);
            if (task.operation === 'delete') {
              await withTimeout(deleteDoc(docRef), 12000);
            } else {
              await withTimeout(
                setDoc(docRef, cleanForFirestore(task.data || { id: task.entityId, userId: effectiveUid }), { merge: true }),
                12000
              );
            }
            return task.id;
          })
        );

        const failedTasks: SyncQueueItem[] = [];

        results.forEach((res, idx) => {
          const task = batchItems[idx];
          if (res.status === 'fulfilled') {
            succeeded++;
            succeededEntityIds.push({ entityType: task.entityType, entityId: task.entityId });
            if (task.entityType === 'transactions' && task.operation === 'upsert') {
              succeededTxIds.push(task.entityId);
            }
            // Remove succeeded item from queue
            this.queue = this.queue.filter((q) => q.id !== task.id);
          } else {
            failed++;
            failedTasks.push(task);
            const err = res.reason;
            task.status = 'failed';
            task.retryCount = (task.retryCount || 0) + 1;
            task.lastError = err instanceof Error ? err.message : String(err);
            handleFirestoreError(
              err,
              task.operation === 'delete' ? OperationType.DELETE : OperationType.WRITE,
              `users/${task.targetUid}/${task.entityType}/${task.entityId}`
            );

            if (task.retryCount >= MAX_RETRIES) {
              console.warn(`[SyncQueue] Task ${task.id} reached maximum retries (${MAX_RETRIES}):`, task.lastError);
            }
          }
        });

        // Direct HTTPS REST Fallback for failed transactions (Bypasses iOS Safari WebKit freezes)
        if (failedTasks.length > 0) {
          const failedTxTasks = failedTasks.filter((t) => t.entityType === 'transactions' && t.operation === 'upsert' && t.data);
          if (failedTxTasks.length > 0) {
            try {
              const { pushTransactionsDirectHttp } = await import('./directFirestoreHttp');
              const txs = failedTxTasks.map((t) => t.data);
              const effectiveUid = failedTxTasks[0].targetUid || auth.currentUser?.uid;
              if (effectiveUid) {
                const httpRes = await pushTransactionsDirectHttp(txs, effectiveUid);
                if (httpRes.success && httpRes.pushedCount > 0) {
                  failedTxTasks.forEach((task) => {
                    succeeded++;
                    if (failed > 0) failed--;
                    succeededEntityIds.push({ entityType: task.entityType, entityId: task.entityId });
                    succeededTxIds.push(task.entityId);
                    this.queue = this.queue.filter((q) => q.id !== task.id);
                  });
                }
              }
            } catch (httpErr) {
              console.warn('[SyncQueue] Direct HTTP fallback attempt:', httpErr);
            }
          }
        }

        this.saveQueue();
      }
    } finally {
      this.isProcessing = false;
      this.saveQueue();
    }

    return { succeeded, failed, succeededEntityIds, succeededTxIds };
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

    // Filter strictly for items truly missing in cloudTxIds.
    // ALSO skip items currently queued for deletion — pushing them would
    // resurrect a delete that was just issued on this device.
    const trulyMissing = missingTxs.filter((tx) => {
      if (!tx || !tx.id) return false;
      if (cloudTxIds.has(tx.id)) return false;
      if (this.isEntityPendingDelete('transactions', tx.id)) return false;
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
          succeededCount++;
          newlyConfirmedTxIds.push(tx.id);
          this.remove('transactions', tx.id);
        });
      } catch (err: any) {
        console.warn('[SyncQueue] writeBatch reconciliation error, executing individual fallback writes:', err);
        for (const tx of chunk) {
          try {
            const docRef = doc(db, 'users', targetUid, 'transactions', tx.id);
            await withTimeout(setDoc(docRef, cleanForFirestore({ ...tx, userId: targetUid }), { merge: true }), 5000);
            succeededCount++;
            newlyConfirmedTxIds.push(tx.id);
            this.remove('transactions', tx.id);
          } catch (itemErr) {
            failedCount++;
            this.enqueue('transactions', tx.id, 'upsert', targetUid, tx);
            handleFirestoreError(itemErr, OperationType.WRITE, `users/${targetUid}/transactions/${tx.id}`);
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
  }

  /**
   * Retries all failed items immediately
   */
  public retryAllFailed() {
    this.queue.forEach((item) => {
      item.status = 'pending';
      item.lastAttemptAt = 0;
      item.retryCount = 0;
    });
    this.saveQueue();
    this.triggerImmediateProcess();
  }
}

export const syncQueue = new SyncQueueManager();