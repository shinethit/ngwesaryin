// [v7.6.56] ONE source of truth for sync honesty: a record counts
// as confirmed ONLY when the server set has it AND no queue or
// dead-letter work remains for it. These tests pin the summary the
// Data Management card, the tracker, and Sync Health all share.
import { describe, it, expect } from 'vitest';
import {
  belongsToPendingTx,
  getTransactionSyncSummary,
  isTransactionConfirmed,
} from '../transactionSyncSummary';
import type { Transaction } from '../../types';
import type { SyncQueueItem } from '../../lib/syncQueue';

const tx = (id: string): Transaction => ({ id } as Transaction);
const item = (entityType: string, entityId: string, operation = 'upsert'): SyncQueueItem =>
  ({ id: `${entityType}:${entityId}:${operation}`, entityType, entityId, operation, targetUid: 'user_1', timestamp: 1, retryCount: 0, status: 'pending' } as SyncQueueItem);

describe('isTransactionConfirmed', () => {
  it('confirmed when in the server set and no work remains', () => {
    expect(isTransactionConfirmed(tx('a'), new Set(['a']), [], [])).toBe(true);
  });

  it('NOT confirmed when queued, even when the server set has the id', () => {
    expect(isTransactionConfirmed(tx('a'), new Set(['a']), [item('transactions', 'a')], [])).toBe(false);
  });

  it('NOT confirmed when dead-lettered, even when the server set has the id (stale id)', () => {
    expect(isTransactionConfirmed(tx('a'), new Set(['a']), [], [item('transactions', 'a', 'delete')])).toBe(false);
  });

  it('NOT confirmed when absent from the server set', () => {
    expect(isTransactionConfirmed(tx('a'), new Set(['b']), [], [])).toBe(false);
    expect(isTransactionConfirmed(tx('a'), undefined, [], [])).toBe(false);
  });

  it('a tombstone task for the id counts as outstanding work', () => {
    expect(isTransactionConfirmed(tx('a'), new Set(['a']), [item('tombstones', 'a', 'upsert')], [])).toBe(false);
  });
});

describe('belongsToPendingTx', () => {
  it('plain transaction and tombstone tasks belong by entityId', () => {
    expect(belongsToPendingTx(item('transactions', 'tx1'))).toBe('tx1');
    expect(belongsToPendingTx(item('tombstones', 'tx1', 'upsert'))).toBe('tx1');
  });

  it('shared-wallet tasks belong by the composite-id tail', () => {
    expect(belongsToPendingTx(item('sharedWallets', 'sw1/transactions/tx1', 'delete'))).toBe('tx1');
    expect(belongsToPendingTx(item('sharedWallets', 'sw1/transactions/tx1'))).toBe('tx1');
  });

  it('other-entity work belongs to no transaction', () => {
    expect(belongsToPendingTx(item('wallets', 'w1'))).toBeNull();
    expect(belongsToPendingTx(item('debts', 'd1', 'delete'))).toBeNull();
    expect(belongsToPendingTx(item('sharedWallets', 'sw1'))).toBeNull();
  });
});

describe('getTransactionSyncSummary', () => {
  it('all confirmed: 100%, fully synced, nothing outstanding', () => {
    const s = getTransactionSyncSummary([tx('a'), tx('b')], new Set(['a', 'b']), [], []);
    expect(s).toMatchObject({ totalCount: 2, confirmedCount: 2, unconfirmedCount: 0, percent: 100, isFullySynced: true, outstandingCount: 0 });
  });

  it('a stale server id (not in the local list) never inflates the count', () => {
    const s = getTransactionSyncSummary([tx('a')], new Set(['a', 'ghost']), [], []);
    expect(s.confirmedCount).toBe(1);
    expect(s.percent).toBe(100);
  });

  it('the 134/134 lie: queued deletes keep the card below 100%', () => {
    const list = [tx('a'), tx('b')];
    const s = getTransactionSyncSummary(list, new Set(['a', 'b']), [item('transactions', 'b', 'delete')], []);
    expect(s.confirmedCount).toBe(1);
    expect(s.unconfirmedCount).toBe(1);
    expect(s.percent).toBe(50);
    expect(s.isFullySynced).toBe(false);
    expect(s.outstandingCount).toBe(1);
    expect(s.otherQueueCount).toBe(0);
  });

  it('other-entity queue work blocks fully-synced even when every transaction is confirmed', () => {
    const s = getTransactionSyncSummary([tx('a')], new Set(['a']), [item('wallets', 'w1')], []);
    expect(s.confirmedCount).toBe(1);
    expect(s.isFullySynced).toBe(false);
    expect(s.outstandingCount).toBe(1);
    expect(s.otherQueueCount).toBe(1);
  });

  it('dead-lettered other-entity work counts once, as otherFailed', () => {
    const s = getTransactionSyncSummary([tx('a')], new Set(['a']), [], [item('shops', 's1', 'delete')]);
    expect(s.isFullySynced).toBe(false);
    expect(s.outstandingCount).toBe(1);
    expect(s.otherFailedCount).toBe(1);
    expect(s.failedCount).toBe(1);
  });

  it('a queue task for a locally-gone transaction counts as other work, not double-counted', () => {
    const s = getTransactionSyncSummary([tx('a')], new Set(['a']), [item('transactions', 'gone', 'delete')], []);
    expect(s.unconfirmedCount).toBe(0);
    expect(s.otherQueueCount).toBe(1);
    expect(s.outstandingCount).toBe(1);
  });

  it('empty list: 0%, not fully-synced-gated (callers require totalCount > 0)', () => {
    const s = getTransactionSyncSummary([], new Set(), [], []);
    expect(s.percent).toBe(0);
    expect(s.totalCount).toBe(0);
    expect(s.isFullySynced).toBe(true);
  });
});
