// [v7.6.44] Typing-lag sweep: the fix-once pattern is (1) search
// boxes own their raw text in DebouncedSearchInput and report once
// per pause, (2) the Records filter runs over a prebuilt index
// (haystack fields + sort keys built once per data change — no
// per-run lower-casing, joining, attribution, or `new Date()` in the
// sort comparator), (3) the entry form's expensive previous-purchase
// hint reads deferred snapshots. These tests pin the matcher
// decisions EXACTLY (same fields/rules as the pre-7.6.44 inline
// predicate) and pin the structure, so a future input added the
// naive way trips a test. Latency proof is the harness probe
// (before/after tables in the handoff), not wall-clock asserts.
// Source reads use `new URL` — NO path comparisons.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  buildTransactionSearchIndex,
  compareTransactionSearchEntries,
  normalizeTransactionSearchQuery,
  transactionSearchEntryMatches,
} from '../transactionSearch';
import type { Category, Transaction, Wallet } from '../../types';

const SRC = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');

const CATS = new Map<string, Category>([
  ['cat_food', { id: 'cat_food', name: 'အစားအသောက်', nameEn: 'Food', type: 'expense', icon: 'x', color: '#000' }],
  ['cat_health', { id: 'cat_health', name: 'ကျန်းမာရေး', nameEn: 'Health', type: 'expense', icon: 'x', color: '#000' }],
]);
const SUBS = new Map([['sub_rice', { id: 'sub_rice', name: 'ဆန်', nameEn: 'Rice' }]]);
const WALLETS = new Map<string, Wallet>([
  ['w1', { id: 'w1', name: 'KBZPay', nameEn: 'KBZPay' } as Wallet],
]);

const tx = (over: Partial<Transaction>): Transaction => ({
  id: 't1', type: 'expense', amount: 10000, category: 'cat_food', walletId: 'w1', date: '2026-11-20',
  createdAt: 0,
  ...over,
});

const FIXTURES: Transaction[] = [
  tx({ id: 'a', note: 'နေ့လည်စာ', shopName: 'ကုန်စုံဆိုင် မင်္ဂလာ', items: [{ name: 'ဆန်', price: 3200, quantity: 1, amount: 3200, unit: 'kg' }], createdAt: 100 }),
  tx({ id: 'b', category: 'cat_health', note: 'ဆေးဝါး', shopName: 'ဆေးဆိုင်', amount: 50000, date: '2026-11-21', createdAt: 200 }),
  tx({
    id: 'c', amount: 30000, date: '2026-11-19', createdAt: 300,
    splits: [
      { categoryId: 'cat_food', amount: 18000, shopName: 'City Mart' },
      { categoryId: 'cat_health', amount: 12000, shopName: 'ဆေးဆိုင် အောင်လံ' },
    ],
  }),
];

const INDEX = buildTransactionSearchIndex(FIXTURES, CATS, SUBS as never, WALLETS);

function matches(id: string, rawQuery: string): boolean {
  const entry = INDEX.find((e) => e.tx.id === id)!;
  const { query, queryNoComma } = normalizeTransactionSearchQuery(rawQuery);
  return transactionSearchEntryMatches(entry, query, queryNoComma);
}

describe('transaction search index (v7.6.44)', () => {
  it('matches item names, notes, shop names and category names', () => {
    expect(matches('a', 'ဆန်')).toBe(true);
    expect(matches('a', 'နေ့လည်စာ')).toBe(true);
    expect(matches('a', 'မင်္ဂလာ')).toBe(true);
    expect(matches('a', 'food')).toBe(true);
    expect(matches('a', 'အစားအသောက်')).toBe(true);
    expect(matches('a', 'ဆေးဝါး')).toBe(false);
  });

  it('matches a split row shop, not only the entry-level shop', () => {
    expect(matches('c', 'city mart')).toBe(true);
    expect(matches('c', 'အောင်လံ')).toBe(true);
  });

  it('matches amounts in Latin and Myanmar digits, with commas stripped', () => {
    expect(matches('a', '10000')).toBe(true);
    expect(matches('a', '၁၀၀၀၀')).toBe(true);
    expect(matches('b', '50,000')).toBe(true);
    expect(matches('b', '၅၀၀၀၀')).toBe(true);
    expect(matches('a', '99999')).toBe(false);
  });

  it('matches wallet names (substring, as the old predicate did)', () => {
    expect(matches('a', 'kbzpay')).toBe(true);
    expect(matches('a', 'kbz')).toBe(true);
    expect(matches('a', 'kpay')).toBe(false);
  });

  it('sorts newest first, then by createdAt, without constructing Dates per comparison', () => {
    const sorted = [...INDEX].sort(compareTransactionSearchEntries).map((e) => e.tx.id);
    expect(sorted).toEqual(['b', 'a', 'c']);
  });

  it('the index prebuilds lower-cased fields and numeric sort keys', () => {
    const entry = INDEX.find((e) => e.tx.id === 'a')!;
    expect(entry.note).toBe('နေ့လည်စာ');
    expect(entry.itemNames).toBe('ဆန်');
    expect(entry.dateMs).toBe(new Date('2026-11-20').getTime());
    expect(entry.createdMs).toBe(100);
  });
});

describe('debounced search pattern wiring (v7.6.44)', () => {
  const TX_VIEW = SRC('../../components/TransactionsView.tsx');
  const GLOBAL = SRC('../../components/GlobalSearchModal.tsx');
  const MODAL = SRC('../../components/TransactionModal.tsx');
  const INPUT = SRC('../../components/DebouncedSearchInput.tsx');

  it('the shared input is memoized, defaults to 150ms, and adopts external values', () => {
    expect(INPUT).toContain('React.memo');
    expect(INPUT).toContain('delay = 150');
    expect(INPUT).toContain('setText(value)');
    expect(INPUT).toContain('setTimeout(() => reportRef.current(text), delay)');
  });

  it('Records renders the shared input and keeps no raw keystroke state', () => {
    expect(TX_VIEW).toContain('DebouncedSearchInput');
    expect(TX_VIEW).not.toContain('const [searchTerm, setSearchTerm]');
    expect(TX_VIEW).toContain('value={debouncedSearchTerm} onDebouncedChange={setDebouncedSearchTerm}');
  });

  it('the Records filter runs over the prebuilt index with no Date construction in the sort', () => {
    expect(TX_VIEW).toContain('buildTransactionSearchIndex(transactions, catMap, subCatMap, walletMap)');
    expect(TX_VIEW).toContain('transactionSearchEntryMatches(searchEntry, searchQuery, searchQueryNoComma)');
    const region = TX_VIEW.slice(
      TX_VIEW.indexOf('const filtered = useMemo'),
      TX_VIEW.indexOf('// Filtered Totals'),
    );
    expect(region).not.toContain('new Date(');
    expect(region).toContain('compareTransactionSearchEntries');
  });

  it('Global Search renders the shared input for its query', () => {
    expect(GLOBAL).toContain('DebouncedSearchInput');
    expect(GLOBAL).toContain('onDebouncedChange={setQuery}');
    expect(GLOBAL).not.toContain('onChange={(e) => setQuery(e.target.value)}');
  });

  it('the entry form derives its expensive hints from deferred snapshots', () => {
    expect(MODAL).toContain('useDeferredValue(shoppingItems)');
    expect(MODAL).toContain('useDeferredValue(itemName)');
    expect(MODAL).toContain('deferredShoppingItems');
    expect(MODAL).toContain('deferredItemName');
  });
});
