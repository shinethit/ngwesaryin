import { describe, it, expect } from 'vitest';
import {
  isTransferTransaction,
  isWalletMatch,
  buildWalletMap,
  getMatchingWalletIds,
  calculateWalletLiveBalance,
  syncWalletsWithTransactions,
  repairOrphanedTransactions,
} from '../walletBalance';
import type { Wallet, Transaction } from '../../types';

// ---------- Helpers ----------
function W(overrides: Record<string, unknown> = {}): Wallet {
  return {
    id: 'w1',
    name: 'Cash',
    nameEn: 'Cash',
    balance: 0,
    color: '#000000',
    icon: 'Wallet',
    ...overrides,
  } as unknown as Wallet;
}

function T(overrides: Record<string, unknown> = {}): Transaction {
  return {
    id: 'tx1',
    type: 'income',
    amount: 100,
    category: 'cat_salary',
    date: '2026-01-15',
    walletId: 'w1',
    ...overrides,
  } as unknown as Transaction;
}

// =================================================
// isTransferTransaction
// =================================================
describe('isTransferTransaction', () => {
  it('returns false for null/undefined', () => {
    expect(isTransferTransaction(null)).toBe(false);
    expect(isTransferTransaction(undefined)).toBe(false);
  });

  it('respects isTransfer:false override even with transfer category', () => {
    expect(isTransferTransaction({ isTransfer: false, category: 'cat_transfer' } as any)).toBe(false);
  });

  it('returns true when isTransfer === true', () => {
    expect(isTransferTransaction({ isTransfer: true } as any)).toBe(true);
  });

  it('detects cat_transfer category', () => {
    expect(isTransferTransaction({ category: 'cat_transfer' } as any)).toBe(true);
  });

  it('detects "transfer" category', () => {
    expect(isTransferTransaction({ category: 'transfer' } as any)).toBe(true);
  });

  it('detects tx_tf_ id prefix', () => {
    expect(isTransferTransaction({ id: 'tx_tf_abc' } as any)).toBe(true);
  });

  it('detects Myanmar transfer note tags', () => {
    expect(isTransferTransaction({ note: '[ငွေလွှဲဝင်]' } as any)).toBe(true);
    expect(isTransferTransaction({ note: '[ငွေလွှဲထွက်]' } as any)).toBe(true);
  });

  it('detects English transfer note tags (case-insensitive)', () => {
    expect(isTransferTransaction({ note: '[Transfer]' } as any)).toBe(true);
    expect(isTransferTransaction({ note: '[Transfer In]' } as any)).toBe(true);
  });

  it('returns false for a plain income transaction', () => {
    expect(isTransferTransaction(T())).toBe(false);
  });
});

// =================================================
// isWalletMatch
// =================================================
describe('isWalletMatch', () => {
  it('returns false for empty target', () => {
    expect(isWalletMatch(W(), '')).toBe(false);
    expect(isWalletMatch(W(), null)).toBe(false);
    expect(isWalletMatch(W(), undefined)).toBe(false);
  });

  it('matches by exact id', () => {
    expect(isWalletMatch(W({ id: 'cash' }), 'cash')).toBe(true);
  });

  it('does not match different id', () => {
    expect(isWalletMatch(W({ id: 'cash' }), 'bank')).toBe(false);
  });

  it('matches by originalId', () => {
    expect(isWalletMatch(W({ id: 'w1', originalId: 'legacy_1' }), 'legacy_1')).toBe(true);
  });

  it('matches by sharedDocId', () => {
    expect(isWalletMatch(W({ id: 'w1', sharedDocId: 'uid123_w1' }), 'uid123_w1')).toBe(true);
  });

  it('matches by name (case-insensitive)', () => {
    expect(isWalletMatch(W({ id: 'w1', name: 'Cash' }), 'cash')).toBe(true);
  });

  it('strips shared_<uid>_ prefix from target', () => {
    expect(isWalletMatch(W({ id: 'w1' }), 'shared_uid123_w1')).toBe(true);
  });

  it('handles shared_ prefixed wallet id', () => {
    expect(isWalletMatch(W({ id: 'shared_uid123_w1' }), 'w1')).toBe(true);
  });
});

// =================================================
// buildWalletMap
// =================================================
describe('buildWalletMap', () => {
  it('returns empty map for empty input', () => {
    expect(buildWalletMap([]).size).toBe(0);
  });

  it('maps wallet by id, name, nameEn', () => {
    const w = W({ id: 'w1', name: 'Cash', nameEn: 'Cash' });
    const map = buildWalletMap([w]);
    expect(map.get('w1')).toBe(w);
    expect(map.get('Cash')).toBe(w);
    expect(map.get('cash')).toBe(w);
  });

  it('maps by originalId and sharedDocId', () => {
    const w = W({ id: 'w1', originalId: 'old1', sharedDocId: 'uid_w1' });
    const map = buildWalletMap([w]);
    expect(map.get('old1')).toBe(w);
    expect(map.get('uid_w1')).toBe(w);
  });
});

// =================================================
// getMatchingWalletIds
// =================================================
describe('getMatchingWalletIds', () => {
  it('returns empty set for empty wallets', () => {
    expect(getMatchingWalletIds([]).size).toBe(0);
  });

  it('includes id, originalId, sharedDocId', () => {
    const w = W({ id: 'w1', originalId: 'old1', sharedDocId: 'uid_w1' });
    const ids = getMatchingWalletIds([w]);
    expect(ids.has('w1')).toBe(true);
    expect(ids.has('old1')).toBe(true);
    expect(ids.has('uid_w1')).toBe(true);
  });
});

// =================================================
// calculateWalletLiveBalance
// =================================================
describe('calculateWalletLiveBalance', () => {
  it('cash wallet with no tx = 0', () => {
    expect(calculateWalletLiveBalance(W({ id: 'cash', balance: 0 }), [])).toBe(0);
  });

  it('adds income to opening balance', () => {
    const w = W({ id: 'cash', initialBalance: 1000 });
    const tx = T({ amount: 500, type: 'income', walletId: 'cash' });
    expect(calculateWalletLiveBalance(w, [tx])).toBe(1500);
  });

  it('subtracts expense from opening balance', () => {
    const w = W({ id: 'cash', initialBalance: 1000 });
    const tx = T({ amount: 300, type: 'expense', walletId: 'cash' });
    expect(calculateWalletLiveBalance(w, [tx])).toBe(700);
  });

  it('ignores transactions from other wallets', () => {
    const w = W({ id: 'cash', initialBalance: 1000 });
    const tx = T({ amount: 500, walletId: 'other' });
    expect(calculateWalletLiveBalance(w, [tx])).toBe(1000);
  });

  it('falls back to wallet.balance when no initialBalance and no tx', () => {
    const w = W({ id: 'savings', balance: 5000 });
    expect(calculateWalletLiveBalance(w, [])).toBe(5000);
  });
});

// =================================================
// syncWalletsWithTransactions
// =================================================
describe('syncWalletsWithTransactions', () => {
  it('sets balance from transactions', () => {
    const w = W({ id: 'cash', initialBalance: 0, balance: 9999 });
    const tx = T({ amount: 500, type: 'income', walletId: 'cash' });
    const result = syncWalletsWithTransactions([w], [tx]);
    expect(result[0].balance).toBe(500);
  });

  it('returns same object reference when nothing changed', () => {
    const w = W({ id: 'cash', initialBalance: 0, balance: 0 });
    const result = syncWalletsWithTransactions([w], []);
    expect(result[0]).toBe(w);
  });
});

// =================================================
// repairOrphanedTransactions
// =================================================
describe('repairOrphanedTransactions', () => {
  it('returns hasChanges=false when no wallets', () => {
    const r = repairOrphanedTransactions([T()], []);
    expect(r.hasChanges).toBe(false);
  });

  it('returns hasChanges=false when no txs', () => {
    const r = repairOrphanedTransactions([], [W()]);
    expect(r.hasChanges).toBe(false);
  });

  it('marks normal tx isTransfer=false', () => {
    const w = W({ id: 'w1' });
    const tx = T({ walletId: 'w1' });
    const r = repairOrphanedTransactions([tx], [w]);
    expect(r.repaired[0].isTransfer).toBe(false);
  });

  it('repairs missing walletId', () => {
    const w = W({ id: 'w1', isDefault: true });
    const tx = T({ walletId: '' });
    const r = repairOrphanedTransactions([tx], [w]);
    expect(r.repaired[0].walletId).toBe('w1');
  });
});
