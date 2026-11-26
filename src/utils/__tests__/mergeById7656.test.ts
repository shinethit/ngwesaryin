// [v7.6.56] pruneConfirmedMissing: drop local items that were
// confirmed in an earlier SERVER snapshot but are missing from
// this one (deleted on another client) — the reload hole that
// left wallets, debts, categories, budgets and shops resurrected
// after a restart. The three guards (cached snapshots never prune,
// never-confirmed ids never prune, outstanding work vetoes) are
// pinned here; the listener wiring is pinned in
// syncRebuild7652.test.ts.
import { describe, it, expect } from 'vitest';
import { pruneConfirmedMissing } from '../mergeById';

const keepNone = () => false;
const keepAll = () => true;

describe('pruneConfirmedMissing', () => {
  it('prunes a confirmed id missing from a server snapshot', () => {
    const prev = [{ id: 'a' }, { id: 'b' }];
    const out = pruneConfirmedMissing(prev, new Set(['a']), new Set(['a', 'b']), (x) => x.id, keepNone, false);
    expect(out).toEqual([{ id: 'a' }]);
  });

  it('never prunes from a cached snapshot', () => {
    const prev = [{ id: 'a' }, { id: 'b' }];
    const out = pruneConfirmedMissing(prev, new Set(['a']), new Set(['a', 'b']), (x) => x.id, keepNone, true);
    expect(out).toBe(prev);
  });

  it('never prunes an id that was never confirmed (guest / offline / never-synced)', () => {
    const prev = [{ id: 'local-only' }];
    const out = pruneConfirmedMissing(prev, new Set(), new Set(), (x) => x.id, keepNone, false);
    expect(out).toEqual(prev);
  });

  it('keeps a confirmed-missing id with outstanding work (pending task / dead letter)', () => {
    const prev = [{ id: 'a' }, { id: 'b' }];
    const out = pruneConfirmedMissing(
      prev,
      new Set(['a']),
      new Set(['a', 'b']),
      (x) => x.id,
      (x) => x.id === 'b',
      false,
    );
    expect(out).toEqual([{ id: 'a' }, { id: 'b' }]);
  });

  it('keeps ids present in the snapshot and ids with an empty key', () => {
    const prev = [{ id: 'a' }, { id: '' }];
    const out = pruneConfirmedMissing(prev, new Set(['a']), new Set(['a']), (x) => x.id, keepNone, false);
    expect(out).toEqual(prev);
  });

  it('budgets prune by categoryId (the mergeByKey key), not the doc id', () => {
    const prev = [
      { id: 'doc1', categoryId: 'cat_a' },
      { id: 'doc2', categoryId: 'cat_b' },
    ];
    const out = pruneConfirmedMissing(prev, new Set(['cat_a']), new Set(['cat_a', 'cat_b']), (x) => x.categoryId, keepNone, false);
    expect(out).toEqual([{ id: 'doc1', categoryId: 'cat_a' }]);
  });

  it('does not mutate the previous list', () => {
    const prev = [{ id: 'a' }, { id: 'b' }];
    pruneConfirmedMissing(prev, new Set(['a']), new Set(['a', 'b']), (x) => x.id, keepNone, false);
    expect(prev).toHaveLength(2);
  });

  it('keepAll vetoes every drop', () => {
    const prev = [{ id: 'b' }];
    const out = pruneConfirmedMissing(prev, new Set(), new Set(['b']), (x) => x.id, keepAll, false);
    expect(out).toEqual(prev);
  });
});
