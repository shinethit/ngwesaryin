// [v7.6.17] Entry-form category picker lists categories and
// sub-categories most-used first. The frequency sort already
// existed in CategoryPickerModal but counted from the OPTIONAL
// allTransactions prop, which TransactionModal never passed —
// every count was 0 and the list fell back to pure alphabetical
// order. Fix: TransactionModal passes allTransactions to BOTH
// picker instances; the picker scopes counts to the active type
// tab (mirroring filteredCats) via pure helpers in
// utils/categoryFrequency.ts, and sorts sub-category rows the
// same way. Zero-use entries are never hidden (bottom,
// alphabetical). Search, tabs, expand/collapse, General row,
// transfer fallback subs, locks and Premium gating unchanged.
// Source-text assertions (repo pattern: no test renderer).
// NO path comparisons: sources are read via new URL(..., import.meta.url).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Category, SubCategory, Transaction } from '../../types';
import {
  sortCategoriesByFrequency,
  sortSubCategoriesByFrequency,
} from '../categoryFrequency';
import {
  VERSION_HISTORY,
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
} from '../../data/versionHistory';

const PICKER_SRC = readFileSync(
  new URL('../../components/CategoryPickerModal.tsx', import.meta.url),
  'utf8',
);
const TXMODAL_SRC = readFileSync(
  new URL('../../components/TransactionModal.tsx', import.meta.url),
  'utf8',
);
const HELPER_SRC = readFileSync(
  new URL('../categoryFrequency.ts', import.meta.url),
  'utf8',
);
const VERSION_JSON = JSON.parse(
  readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
);

let seq = 0;
function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  seq += 1;
  return {
    id: `tx-7617-${seq}`,
    type: 'expense',
    amount: 1000,
    category: 'cat_food',
    walletId: 'w1',
    date: '2026-11-23',
    createdAt: 1,
    ...overrides,
  };
}

// Seeded counts on the expense tab: food 5, transport 2,
// shopping 1, health 1 (tie with shopping), bills 0.
function seededTxs(): Transaction[] {
  const out: Transaction[] = [];
  for (let i = 0; i < 5; i++) out.push(makeTx({ category: 'cat_food' }));
  for (let i = 0; i < 2; i++) out.push(makeTx({ category: 'cat_transport' }));
  out.push(makeTx({ category: 'cat_shopping' }));
  out.push(makeTx({ category: 'cat_health' }));
  return out;
}

function cat(
  id: string,
  name: string,
  nameEn: string,
  subs: SubCategory[] = [],
): Category {
  return {
    id,
    name,
    nameEn,
    type: 'expense',
    icon: 'x',
    color: '#10B981',
    subCategories: subs,
  };
}

const CATS: Category[] = [
  cat('cat_bills', 'ဘေလ်များ', 'Bills'),
  cat('cat_food', 'အစားအသောက်', 'Food'),
  cat('cat_health', 'ကျန်းမာရေး', 'Health'),
  cat('cat_shopping', 'ဈေးဝယ်', 'Shopping'),
  cat('cat_transport', 'သွားလာရေး', 'Transport'),
];

describe('category frequency order (v7.6.17)', () => {
  it('most-used first, zero-use last, alphabetical tie-break (Myanmar names)', () => {
    const ids = sortCategoriesByFrequency(
      CATS,
      seededTxs(),
      'expense',
      'my',
    ).map((c) => c.id);
    // food 5, transport 2, health 1 vs shopping 1 tie broken by
    // Myanmar name ('ကျန်းမာရေး' < 'ဈေးဝယ်'), bills 0 last.
    expect(ids).toEqual([
      'cat_food',
      'cat_transport',
      'cat_health',
      'cat_shopping',
      'cat_bills',
    ]);
  });

  it('alphabetical tie-break uses the display language', () => {
    // Same counts, names ordered OPPOSITE in the two languages:
    // Myanmar 'အ' sorts after 'က', English 'Aardvark' before 'Zebra'.
    const pair = [
      cat('cat_x', 'အ', 'Aardvark'),
      cat('cat_y', 'က', 'Zebra'),
    ];
    const txs = [makeTx({ category: 'cat_x' }), makeTx({ category: 'cat_y' })];
    expect(
      sortCategoriesByFrequency(pair, txs, 'expense', 'my').map((c) => c.id),
    ).toEqual(['cat_y', 'cat_x']);
    expect(
      sortCategoriesByFrequency(pair, txs, 'expense', 'en').map((c) => c.id),
    ).toEqual(['cat_x', 'cat_y']);
  });

  it('no transactions falls back to pure alphabetical order (regression)', () => {
    const ids = sortCategoriesByFrequency(CATS, [], 'expense', 'my').map(
      (c) => c.id,
    );
    // Myanmar collation: က (health) < ဈ (shopping) < ဘ (bills)
    // < သ (transport) < အ (food).
    expect(ids).toEqual([
      'cat_health',
      'cat_shopping',
      'cat_bills',
      'cat_transport',
      'cat_food',
    ]);
  });

  it('undefined transactions also fall back to alphabetical order', () => {
    const ids = sortCategoriesByFrequency(
      CATS,
      undefined,
      'expense',
      'en',
    ).map((c) => c.id);
    expect(ids).toEqual([
      'cat_bills',
      'cat_food',
      'cat_health',
      'cat_shopping',
      'cat_transport',
    ]);
  });

  it('zero-use categories are never hidden', () => {
    const sorted = sortCategoriesByFrequency(CATS, seededTxs(), 'expense', 'my');
    expect(sorted).toHaveLength(CATS.length);
    expect(sorted[sorted.length - 1].id).toBe('cat_bills');
  });

  it('the input array is not mutated', () => {
    const before = CATS.map((c) => c.id);
    sortCategoriesByFrequency(CATS, seededTxs(), 'expense', 'my');
    expect(CATS.map((c) => c.id)).toEqual(before);
  });

  it('transactions without a category do not affect the order', () => {
    const txs = [...seededTxs(), makeTx({ category: '' })];
    const ids = sortCategoriesByFrequency(CATS, txs, 'expense', 'my').map(
      (c) => c.id,
    );
    expect(ids[0]).toBe('cat_food');
    expect(ids).toHaveLength(CATS.length);
  });
});

describe('type-tab scoping (v7.6.17)', () => {
  it('income transactions do NOT lift a category on the expense tab', () => {
    const txs = [
      ...seededTxs(),
      makeTx({ type: 'income', category: 'cat_bills' }),
      makeTx({ type: 'income', category: 'cat_bills' }),
      makeTx({ type: 'income', category: 'cat_bills' }),
      makeTx({ type: 'income', category: 'cat_bills' }),
      makeTx({ type: 'income', category: 'cat_bills' }),
      makeTx({ type: 'income', category: 'cat_bills' }),
    ];
    const ids = sortCategoriesByFrequency(CATS, txs, 'expense', 'my').map(
      (c) => c.id,
    );
    // Six income uses of bills must not move it off the bottom
    // on the expense tab.
    expect(ids[ids.length - 1]).toBe('cat_bills');
    expect(ids[0]).toBe('cat_food');
  });

  it('expense transactions do NOT lift a category on the income tab', () => {
    const incomeCats = CATS.map((c) => ({ ...c, type: 'income' as const }));
    const txs = [
      makeTx({ type: 'income', category: 'cat_shopping' }),
      ...seededTxs(),
    ];
    const ids = sortCategoriesByFrequency(
      incomeCats,
      txs,
      'income',
      'my',
    ).map((c) => c.id);
    expect(ids[0]).toBe('cat_shopping');
    // The rest tie at 0 income uses (expense history ignored) and
    // fall back to Myanmar alphabetical order.
    expect(ids.slice(1)).toEqual([
      'cat_health',
      'cat_bills',
      'cat_transport',
      'cat_food',
    ]);
  });

  it('cat_transfer counts on BOTH tabs (cross-type count kept)', () => {
    const transfer = cat('cat_transfer', 'ငွေလွှဲ', 'Transfer');
    const cats = [cat('cat_bills', 'ဘေလ်များ', 'Bills'), transfer];
    const expenseTx = makeTx({ type: 'expense', category: 'cat_transfer' });
    const incomeTx = makeTx({ type: 'income', category: 'cat_transfer' });
    const onExpense = sortCategoriesByFrequency(
      cats,
      [expenseTx],
      'expense',
      'my',
    ).map((c) => c.id);
    expect(onExpense[0]).toBe('cat_transfer');
    const onIncome = sortCategoriesByFrequency(
      cats,
      [incomeTx],
      'income',
      'my',
    ).map((c) => c.id);
    expect(onIncome[0]).toBe('cat_transfer');
    // An income transfer also counts on the expense tab, and
    // vice versa — the transfer category is shown on both tabs.
    const crossExpense = sortCategoriesByFrequency(
      cats,
      [incomeTx],
      'expense',
      'my',
    ).map((c) => c.id);
    expect(crossExpense[0]).toBe('cat_transfer');
  });
});

describe('sub-category frequency order (v7.6.17)', () => {
  const subs: SubCategory[] = [
    { id: 'sub_a', name: 'က', nameEn: 'A' },
    { id: 'sub_b', name: 'ခ', nameEn: 'B' },
    { id: 'sub_c', name: 'ဂ', nameEn: 'C' },
    { id: 'sub_d', name: 'ဃ', nameEn: 'D' },
  ];
  function subTxs(): Transaction[] {
    const out: Transaction[] = [];
    for (let i = 0; i < 3; i++)
      out.push(makeTx({ category: 'cat_food', subCategoryId: 'sub_c' }));
    out.push(makeTx({ category: 'cat_food', subCategoryId: 'sub_a' }));
    out.push(makeTx({ category: 'cat_food', subCategoryId: 'sub_b' }));
    // A use under a DIFFERENT category must not count here.
    out.push(makeTx({ category: 'cat_transport', subCategoryId: 'sub_d' }));
    out.push(makeTx({ category: 'cat_transport', subCategoryId: 'sub_d' }));
    out.push(makeTx({ category: 'cat_transport', subCategoryId: 'sub_d' }));
    return out;
  }

  it('most-used sub first, zero-use last, alphabetical tie-break', () => {
    const ids = sortSubCategoriesByFrequency(
      subs,
      subTxs(),
      'cat_food',
      'expense',
      'my',
    ).map((s) => s.id);
    // sub_c 3, sub_a 1 vs sub_b 1 tie by Myanmar name, sub_d 0
    // (its 3 uses belong to another category) last.
    expect(ids).toEqual(['sub_c', 'sub_a', 'sub_b', 'sub_d']);
  });

  it('sub counts are scoped to the active type tab', () => {
    const txs = [
      ...subTxs(),
      makeTx({
        type: 'income',
        category: 'cat_food',
        subCategoryId: 'sub_d',
      }),
      makeTx({
        type: 'income',
        category: 'cat_food',
        subCategoryId: 'sub_d',
      }),
      makeTx({
        type: 'income',
        category: 'cat_food',
        subCategoryId: 'sub_d',
      }),
      makeTx({
        type: 'income',
        category: 'cat_food',
        subCategoryId: 'sub_d',
      }),
    ];
    const ids = sortSubCategoriesByFrequency(
      subs,
      txs,
      'cat_food',
      'expense',
      'my',
    ).map((s) => s.id);
    expect(ids[ids.length - 1]).toBe('sub_d');
  });

  it('no transactions falls back to stored (alphabetical) order', () => {
    const ids = sortSubCategoriesByFrequency(
      subs,
      [],
      'cat_food',
      'expense',
      'my',
    ).map((s) => s.id);
    expect(ids).toEqual(['sub_a', 'sub_b', 'sub_c', 'sub_d']);
  });

  it('the input array is not mutated', () => {
    const before = subs.map((s) => s.id);
    sortSubCategoriesByFrequency(subs, subTxs(), 'cat_food', 'expense', 'my');
    expect(subs.map((s) => s.id)).toEqual(before);
  });
});

describe('picker wiring (v7.6.17)', () => {
  it('the picker counts from the helper scoped to the active tab', () => {
    expect(PICKER_SRC).toContain(
      "import { sortCategoriesByFrequency, sortSubCategoriesByFrequency } from '../utils/categoryFrequency';",
    );
    expect(PICKER_SRC).toContain(
      'sortCategoriesByFrequency(categories, allTransactions, activeTypeTab, lang)',
    );
    // Switching tabs re-sorts: the tab is in the memo deps.
    const memo = PICKER_SRC.slice(
      PICKER_SRC.indexOf('const sortedCategories'),
      PICKER_SRC.indexOf('const filteredCategories'),
    );
    expect(memo).toContain('activeTypeTab');
    // The old unscoped inline count is gone.
    expect(PICKER_SRC).not.toContain('countMap.set(t.category');
    expect(PICKER_SRC).not.toContain('if (t.category) countMap');
  });

  it('the helper scopes counts to the tab with the transfer exception', () => {
    expect(HELPER_SRC).toContain(
      "return t.type === activeType || t.category === 'cat_transfer';",
    );
    expect(HELPER_SRC).toContain("t.category === categoryId");
    expect(HELPER_SRC).toContain('t.subCategoryId');
  });

  it('sub rows are sorted by the helper; General row stays first', () => {
    expect(PICKER_SRC).toContain(
      'sortSubCategoriesByFrequency(cat.subCategories || [], allTransactions, cat.id, activeTypeTab, lang)',
    );
    // The General ("အထွေထွေ") row is rendered before the sorted
    // sub-category list in the JSX, so it never moves.
    const generalAt = PICKER_SRC.indexOf("lang === 'my' ? 'အထွေထွေ' : 'General'");
    const sortedAt = PICKER_SRC.indexOf('sortSubCategoriesByFrequency(');
    expect(generalAt).toBeGreaterThan(-1);
    expect(sortedAt).toBeGreaterThan(-1);
    expect(generalAt).toBeLessThan(sortedAt);
  });

  it('transfer fallback subs keep their single-row tab behavior', () => {
    expect(PICKER_SRC).toContain('FALLBACK_TRANSFER_SUBS.map');
    expect(PICKER_SRC).toContain("if (activeTypeTab === 'expense') return sub.id === 'sub_tf_out';");
    expect(PICKER_SRC).toContain("return sub.id === 'sub_tf_in';");
  });

  it('search still filters the sorted list (order preserved while searching)', () => {
    expect(PICKER_SRC).toContain('sortedCategories.filter((cat) => {');
    const filtered = PICKER_SRC.slice(
      PICKER_SRC.indexOf('const filteredCategories'),
      PICKER_SRC.indexOf('if (!isOpen) return null;'),
    );
    expect(filtered).toContain('typeMatches');
    expect(filtered).toContain('nameMatch || subMatch');
  });

  it('BOTH TransactionModal picker instances receive allTransactions', () => {
    const pickerLines = TXMODAL_SRC.split('\n').filter((l) =>
      l.includes('<CategoryPickerModal'),
    );
    expect(pickerLines).toHaveLength(2);
    for (const line of pickerLines) {
      expect(line).toContain('allTransactions={allTransactions}');
    }
    expect(TXMODAL_SRC).toContain('handlePrimaryCategorySelect');
    expect(TXMODAL_SRC).toContain('handleSplitRowCategorySelect');
  });

  it('no other category list was touched by this change', () => {
    // The picker's own filteredCats/availableSubCats in
    // TransactionModal are unchanged: the transfer-scoped count
    // lines are still exactly as before.
    expect(TXMODAL_SRC).toContain(
      "if ((t.type === type || t.category === 'cat_transfer') && t.category) {",
    );
    expect(TXMODAL_SRC).toContain(
      'if (t.category === effectiveCategoryId && t.subCategoryId) {',
    );
  });
});

describe('Version bump to v7.6.27 (build 342)', () => {
  it('version constants and history entry match version.json', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.28');
    expect(CURRENT_BUILD_NUMBER).toBe(342);
    expect(VERSION_JSON.version).toBe('v7.6.28');
    expect(VERSION_JSON.buildNumber).toBe(342);
    const entry = VERSION_HISTORY[0];
    expect(entry.version).toBe('v7.6.28');
    expect(entry.buildNumber).toBe(342);
    expect(entry.releaseDate).toBe('2026-11-24');
    expect(entry.tag).toBe('fix');
    expect(entry.titleMy).toBe('Calendar မှာ ကဏ္ဍနာမည်ပြခြင်းနဲ့ အိုင်ကွန်အသစ်များ');
    expect(entry.titleEn).toBe('Category names in Calendar and more icons');
    expect(entry.changesMy).toEqual(VERSION_JSON.changesMy);
    expect(entry.changesEn).toEqual(VERSION_JSON.changesEn);
    expect(entry.changesMy).toHaveLength(1);
    expect(entry.changesEn).toHaveLength(1);
    expect(entry.changesMy[0]).toBe(
      'Calendar မှာ ကဏ္ဍနာမည်နဲ့ ကဏ္ဍခွဲနာမည် နှစ်ခုလုံး ပြမည် — ကဏ္ဍအလိုက် အိုင်ကွန်များ ပိုမိုစုံလင်စွာ ထည့်ပေးသည်',
    );
    expect(entry.changesEn[0]).toBe(
      'Calendar day detail shows both the category and sub-category names — category icons expanded and grouped by category.',
    );
  });

  it('change log has no Admin content and releasedAt is present-only', () => {
    expect(VERSION_JSON.changesMy.join(' ')).not.toContain('Admin');
    expect(VERSION_JSON.changesEn.join(' ')).not.toContain('Admin');
    expect(JSON.stringify(VERSION_HISTORY[0])).not.toContain('Admin');
    expect(typeof VERSION_JSON.releasedAt).toBe('string');
    expect(VERSION_JSON.releasedAt.length).toBeGreaterThan(0);
  });

  it('no mangled numbering anywhere in the version surfaces', () => {
    expect(CURRENT_APP_VERSION).not.toBe('v7.5.100');
    expect(VERSION_JSON.version).not.toBe('v7.5.100');
    expect(CURRENT_APP_VERSION).not.toBe('v7.6.28'.replace(/8$/, ''));
    expect(VERSION_JSON.version).not.toBe('v7.6.28'.replace(/8$/, ''));
  });

  it('the fix-script guard is raw string equality: accepts exactly 7.6.25/7.6.26, rejects the mangled form', () => {
    const FROM_VERSION = '7.6.28';
    const TO_VERSION = '7.6.28';
    const guardFails = (pkgVersion: string): boolean =>
      pkgVersion !== FROM_VERSION && pkgVersion !== TO_VERSION;
    // The mangled form is built from TO_VERSION, never written as a
    // literal, so the shipped identity can never be confused with
    // it by a grep or by the guard.
    const mangled = TO_VERSION.replace(/8$/, '');
    expect(mangled).not.toBe(TO_VERSION);
    expect(TO_VERSION).toBe('7.6.28');
    expect(guardFails('7.6.28')).toBe(false);
    expect(guardFails('7.6.28')).toBe(false);
    expect(guardFails(mangled)).toBe(true);
    expect(guardFails('')).toBe(true);
  });
});
