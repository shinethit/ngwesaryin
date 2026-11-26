// [v7.6.56] ONE source of truth for "is this transaction confirmed
// in Cloud?" — shared by the Data Management sync card, the sync
// tracker, and Sync Health, so they can never disagree again. The
// old card counted `cloudTxIds.size` against `transactions.length`
// and never consulted the sync queue, so it read 134/134 100%
// while a delete task was still outstanding (and the spinner kept
// spinning). A record counts as confirmed ONLY when: the server
// set contains its id, AND no queue task is outstanding for it,
// AND no dead-letter entry exists for it. A stale server id (a
// delete the listener has not pruned yet) or a dead-lettered
// failure must never read as synced.
//
// Pure functions over plain arguments (no syncQueue import at
// runtime — callers pass the queue/dead-letter snapshots they
// already subscribe to), so the logic is unit-testable without
// Firestore. Type-only import: no runtime cycle.
import type { Transaction } from '../types';
import type { SyncQueueItem } from '../lib/syncQueue';

/** A transaction is confirmed only when the server set has it AND no queue/dead-letter work remains for it. */
export function isTransactionConfirmed(
  tx: Transaction,
  cloudTxIds: Set<string> | undefined,
  queueItems: SyncQueueItem[],
  failedItems: SyncQueueItem[],
): boolean {
  if (!tx || !tx.id) return false;
  // A tombstone task for the id is outstanding delete work too:
  // enqueueTxDelete creates the tombstone upsert alongside the
  // delete, and the tombstone may still be queued after the delete
  // task itself confirms. Either one means "not confirmed".
  const isTxWork = (q: SyncQueueItem) =>
    (q.entityType === 'transactions' || q.entityType === 'tombstones') && q.entityId === tx.id;
  if (failedItems.some(isTxWork)) return false;
  if (queueItems.some(isTxWork)) return false;
  return !!cloudTxIds?.has(tx.id);
}

/**
 * The transaction id a queue task belongs to, if any: plain
 * transaction tasks by entityId, tombstone tasks by entityId (the
 * tombstone doc id IS the deleted transaction id), and
 * shared-wallet tasks by the tail of the composite id
 * ('<sharedDocId>/transactions/<txId>'). Anything else (wallets,
 * debts, shops, ...) returns null — it is other-entity work.
 */
export function belongsToPendingTx(item: SyncQueueItem): string | null {
  if (item.entityType === 'transactions' || item.entityType === 'tombstones') {
    return item.entityId || null;
  }
  if (item.entityType === 'sharedWallets') {
    const parts = (item.entityId || '').split('/');
    if (parts.length === 3 && parts[1] === 'transactions' && parts[2]) return parts[2];
  }
  return null;
}

export interface TransactionSyncSummary {
  totalCount: number;
  confirmedCount: number;
  unconfirmedCount: number;
  /** All queue tasks (any kind). */
  queueCount: number;
  /** All dead-letter items (any kind). */
  failedCount: number;
  /** Queue tasks NOT already counted via an unconfirmed transaction (other-entity work, tombstones/deletes for locally-gone txs). */
  otherQueueCount: number;
  /** Dead-letter items NOT already counted via an unconfirmed transaction. */
  otherFailedCount: number;
  /** Everything outstanding: unconfirmed transactions + other-entity queue/dead-letter work. Zero means fully synced. */
  outstandingCount: number;
  /** True only when nothing is outstanding at all (zero unconfirmed, zero queued, zero dead-lettered). Callers still gate the 100% display on totalCount > 0. */
  isFullySynced: boolean;
  /** Confirmed share of the local list, 0 when the list is empty. */
  percent: number;
}

export function getTransactionSyncSummary(
  transactions: Transaction[],
  cloudTxIds: Set<string> | undefined,
  queueItems: SyncQueueItem[],
  failedItems: SyncQueueItem[],
): TransactionSyncSummary {
  const totalCount = transactions.length;
  let confirmedCount = 0;
  const pendingTxIds = new Set<string>();
  for (const t of transactions) {
    if (!t || !t.id) continue;
    if (isTransactionConfirmed(t, cloudTxIds, queueItems, failedItems)) {
      confirmedCount++;
    } else {
      pendingTxIds.add(t.id);
    }
  }
  const unconfirmedCount = totalCount - confirmedCount;
  const queueCount = queueItems.length;
  const failedCount = failedItems.length;
  const otherQueueCount = queueItems.filter((q) => {
    const txId = belongsToPendingTx(q);
    return !(txId && pendingTxIds.has(txId));
  }).length;
  const otherFailedCount = failedItems.filter((q) => {
    const txId = belongsToPendingTx(q);
    return !(txId && pendingTxIds.has(txId));
  }).length;
  const outstandingCount = unconfirmedCount + otherQueueCount + otherFailedCount;
  return {
    totalCount,
    confirmedCount,
    unconfirmedCount,
    queueCount,
    failedCount,
    otherQueueCount,
    otherFailedCount,
    outstandingCount,
    isFullySynced: unconfirmedCount === 0 && queueCount === 0 && failedCount === 0,
    percent: totalCount > 0 ? Math.round((confirmedCount / totalCount) * 100) : 0,
  };
}
