// [v7.6.07] Split transactions — one record's total divided across
// categories. Pure-helper tests + wiring assertions (the repo
// pattern: components have no test renderer; layout behaviour is
// verified by renders). Source reads use `new URL` — NO path
// comparisons.
//
// Investigation locked in here:
// - Transaction.category is the record's category field (there is
//   NO `categoryId` on Transaction); a split row carries
//   `categoryId` and the record's `category` is the FIRST split's.
// - firestore.rules validates only id/walletId/amount/type/userId/
//   date on transaction create/update (shared-wallet block ~line
//   522, owner block ~line 646) with NO field whitelist, so the new
//   optional `splits` field needs NO rules change — the rules file
//   does not mention `splits` at all.
// - Plan-limit counting is `.length` over transaction records
//   (countCalendarMonthTransactions), so one split record counts
//   once. Day totals (TransactionsView groups) and wallet balances
//   (walletBalance) sum `t.amount` directly — unchanged.
// - Aggregation sites routed split-aware: Donut, Trend chart,
//   BudgetAnalyticsView, CurrentMonthBudgetSummaryCard,
//   NotificationModal, App badge, SpendingComparisonView (category,
//   sub-category + Free pool), MonthlySummaryChart category cost,
//   AdminPanel benchmarks (category + sub-category).
// - Deliberately whole-amount: FinancialSummaryTable (wallet sums,
//   no category grouping), SmartCalendarCard day detail (per-record
//   display), record filters/counts (primary category = record
//   identity), Price Compare / item intelligence (excluded by spec),
//   sync/merge (field carried by spread, no logic change).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Transaction } from '../../types';
import {
  defaultSplitRows,
  fillRemainderAmount,
  getSplitAttribution,
  hasSplits,
  rowsToSplits,
  shouldClearSplits,
  splitAmountMatching,
  splitRemainder,
  splitRowsFromTransaction,
  splitsTotal,
  syncSplitRowToPrimary,
  validateSplits,
} from '../transactionSplits';
import {
  VERSION_HISTORY,
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
} from '../../data/versionHistory';

const VERSION_JSON = JSON.parse(
  readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
);

const TYPES_SRC = readFileSync(new URL('../../types.ts', import.meta.url), 'utf8');
const HELPER_SRC = readFileSync(new URL('../transactionSplits.ts', import.meta.url), 'utf8');
const TXMODAL_SRC = readFileSync(
  new URL('../../components/TransactionModal.tsx', import.meta.url),
  'utf8',
);
const TXVIEW_SRC = readFileSync(
  new URL('../../components/TransactionsView.tsx', import.meta.url),
  'utf8',
);
const RULES_SRC = readFileSync(
  new URL('../../../firestore.rules', import.meta.url),
  'utf8',
);
const HANDLERS_SRC = readFileSync(
  new URL('../../hooks/useTransactionHandlers.ts', import.meta.url),
  'utf8',
);
const SHARED_SVC_SRC = readFileSync(
  new URL('../../lib/sharedWalletService.ts', import.meta.url),
  'utf8',
);
const WALLET_BALANCE_SRC = readFileSync(new URL('../walletBalance.ts', import.meta.url), 'utf8');

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx_1',
    type: 'expense',
    amount: 100000,
    category: 'cat_food',
    walletId: 'cash',
    date: '2026-11-22',
    createdAt: 1,
    ...overrides,
  };
}

describe('getSplitAttribution', () => {
  it('falls back to the whole amount under the record category', () => {
    const tx = makeTx({ amount: 50000, category: 'cat_food', subCategoryId: 'sub_a' });
    expect(getSplitAttribution(tx)).toEqual([
      { categoryId: 'cat_food', subCategoryId: 'sub_a', amount: 50000, note: undefined },
    ]);
    // No category at all resolves to 'other', like the donut/trend code.
    expect(getSplitAttribution(makeTx({ category: '' }))[0].categoryId).toBe('other');
  });

  it('returns one attribution per split row, in stored order', () => {
    const tx = makeTx({
      splits: [
        { categoryId: 'cat_food', subCategoryId: 'sub_a', amount: 60000 },
        { categoryId: 'cat_household', amount: 40000, note: 'soap' },
      ],
    });
    expect(getSplitAttribution(tx)).toEqual([
      { categoryId: 'cat_food', subCategoryId: 'sub_a', amount: 60000, note: undefined },
      { categoryId: 'cat_household', subCategoryId: undefined, amount: 40000, note: 'soap' },
    ]);
  });

  it('an empty splits array falls back to whole-amount behaviour', () => {
    expect(getSplitAttribution(makeTx({ splits: [] }))).toHaveLength(1);
    expect(getSplitAttribution(makeTx({ splits: [] }))[0].amount).toBe(100000);
  });

  it('duplicate categories are NOT merged — aggregation sums them', () => {
    const tx = makeTx({
      splits: [
        { categoryId: 'cat_food', amount: 30000 },
        { categoryId: 'cat_food', subCategoryId: 'sub_b', amount: 20000 },
      ],
    });
    const attrs = getSplitAttribution(tx);
    expect(attrs).toHaveLength(2);
    expect(splitAmountMatching(tx, (a) => a.categoryId === 'cat_food')).toBe(50000);
  });

  it('a non-finite split amount contributes 0, never NaN', () => {
    const tx = makeTx({
      splits: [
        { categoryId: 'cat_food', amount: NaN },
        { categoryId: 'cat_household', amount: 40000 },
      ],
    });
    expect(splitAmountMatching(tx, () => true)).toBe(40000);
  });
});

describe('splitsTotal / splitRemainder', () => {
  it('sums split amounts; absent splits total 0', () => {
    expect(splitsTotal([{ categoryId: 'a', amount: 60000 }, { categoryId: 'b', amount: 40000 }])).toBe(100000);
    expect(splitsTotal(undefined)).toBe(0);
    expect(splitsTotal([])).toBe(0);
  });

  it('remainder is total minus splits', () => {
    expect(splitRemainder(100000, [{ categoryId: 'a', amount: 60000 }])).toBe(40000);
    expect(splitRemainder(100000, [{ categoryId: 'a', amount: 100000 }])).toBe(0);
    expect(splitRemainder(100000, undefined)).toBe(100000);
  });
});

describe('validateSplits', () => {
  const balanced = [
    { categoryId: 'cat_food', amount: 60000 },
    { categoryId: 'cat_household', amount: 40000 },
  ];

  it('accepts balanced splits summing exactly to the total', () => {
    expect(validateSplits(balanced, 100000)).toBeNull();
  });

  it('rejects an unbalanced sum — even 1 kyat off, no tolerance', () => {
    expect(validateSplits(balanced, 99999)).toBe('unbalanced');
    expect(validateSplits(balanced, 100001)).toBe('unbalanced');
    expect(validateSplits([{ categoryId: 'a', amount: 99999 }], 100000)).toBe('unbalanced');
  });

  it('rejects empty splits', () => {
    expect(validateSplits([], 100000)).toBe('empty');
    expect(validateSplits(undefined, 100000)).toBe('empty');
  });

  it('rejects a row without a category', () => {
    expect(validateSplits([{ categoryId: '', amount: 100000 }], 100000)).toBe('missing-category');
  });

  it('rejects zero and negative amounts', () => {
    expect(validateSplits([{ categoryId: 'a', amount: 0 }], 0)).toBe('non-positive-amount');
    expect(validateSplits([{ categoryId: 'a', amount: -5000 }], -5000)).toBe('non-positive-amount');
    expect(
      validateSplits(
        [
          { categoryId: 'a', amount: 60000 },
          { categoryId: 'b', amount: 0 },
        ],
        60000,
      ),
    ).toBe('non-positive-amount');
  });

  it('float representation noise does not unbalance a kyat-exact split', () => {
    // 33333.33 + 66666.67 is not exactly 100000 in binary floats.
    expect(
      validateSplits(
        [
          { categoryId: 'a', amount: 33333.33 },
          { categoryId: 'b', amount: 66666.67 },
        ],
        100000,
      ),
    ).toBeNull();
  });

  it('a single row equal to the total is valid', () => {
    expect(validateSplits([{ categoryId: 'a', amount: 100000 }], 100000)).toBeNull();
  });
});

describe('form-row helpers', () => {
  it('defaultSplitRows gives 2 rows, row 1 mirroring the primary category', () => {
    const rows = defaultSplitRows('cat_food', 'sub_a');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ categoryId: 'cat_food', subCategoryId: 'sub_a', amount: '', note: '', shopName: '' });
    expect(rows[1]).toEqual({ categoryId: '', subCategoryId: '', amount: '', note: '', shopName: '' });
  });

  it('splitRowsFromTransaction restores rows; old records restore to null (section off)', () => {
    const rows = splitRowsFromTransaction(
      makeTx({
        splits: [
          { categoryId: 'cat_food', subCategoryId: 'sub_a', amount: 60000, note: 'lunch' },
          { categoryId: 'cat_household', amount: 40000 },
        ],
      }),
    );
    expect(rows).toEqual([
      { categoryId: 'cat_food', subCategoryId: 'sub_a', amount: '60000', note: 'lunch', shopName: '' },
      { categoryId: 'cat_household', subCategoryId: '', amount: '40000', note: '', shopName: '' },
    ]);
    expect(splitRowsFromTransaction(makeTx({}))).toBeNull();
    expect(splitRowsFromTransaction(makeTx({ splits: [] }))).toBeNull();
  });

  it('rowsToSplits parses Myanmar digits and trims notes; empty sub/note omitted', () => {
    const splits = rowsToSplits([
      { categoryId: 'cat_food', subCategoryId: 'sub_a', amount: '၆၀၀၀၀', note: '  lunch  ', shopName: '' },
      { categoryId: 'cat_household', subCategoryId: '', amount: '', note: '', shopName: '' },
    ]);
    expect(splits[0]).toEqual({ categoryId: 'cat_food', subCategoryId: 'sub_a', amount: 60000, note: 'lunch' });
    expect(splits[1]).toEqual({ categoryId: 'cat_household', amount: 0 });
    // The invalid second row survives so validateSplits rejects it.
    expect(validateSplits(splits, 60000)).toBe('non-positive-amount');
  });

  it('fillRemainderAmount fills total minus the OTHER rows only', () => {
    const rows = [
      { categoryId: 'a', subCategoryId: '', amount: '60000', note: '', shopName: '' },
      { categoryId: 'b', subCategoryId: '', amount: '', note: '', shopName: '' },
    ];
    expect(fillRemainderAmount(100000, rows, 1)).toBe('40000');
    // Filling row 1 counts row 2's amount, not its own.
    expect(fillRemainderAmount(100000, rows, 0)).toBe('100000');
    // Nothing left (others already cover the total) → ''.
    expect(
      fillRemainderAmount(
        100000,
        [
          { categoryId: 'a', subCategoryId: '', amount: '100000', note: '', shopName: '' },
          { categoryId: 'b', subCategoryId: '', amount: '40000', note: '', shopName: '' },
        ],
        1,
      ),
    ).toBe('');
  });

  it('syncSplitRowToPrimary moves only row 1', () => {
    const rows = [
      { categoryId: 'old', subCategoryId: 'old_sub', amount: '100', note: '', shopName: '' },
      { categoryId: 'keep', subCategoryId: 'keep_sub', amount: '200', note: '', shopName: '' },
    ];
    expect(syncSplitRowToPrimary(rows, 'cat_food', 'sub_a')).toEqual([
      { categoryId: 'cat_food', subCategoryId: 'sub_a', amount: '100', note: '', shopName: '' },
      { categoryId: 'keep', subCategoryId: 'keep_sub', amount: '200', note: '', shopName: '' },
    ]);
    expect(syncSplitRowToPrimary([], 'cat_food', '')).toEqual([]);
  });
});

describe('splitAmountMatching (budget / General-pool math)', () => {
  const tx = makeTx({
    splits: [
      { categoryId: 'cat_food', amount: 60000 },
      { categoryId: 'cat_household', amount: 40000 },
    ],
  });

  it('sums only matching slices; unsplit records match whole-or-nothing', () => {
    expect(splitAmountMatching(tx, (a) => a.categoryId === 'cat_food')).toBe(60000);
    expect(splitAmountMatching(tx, (a) => a.categoryId === 'cat_other')).toBe(0);
    const unsplit = makeTx({ amount: 70000, category: 'cat_food' });
    expect(splitAmountMatching(unsplit, (a) => a.categoryId === 'cat_food')).toBe(70000);
    expect(splitAmountMatching(unsplit, (a) => a.categoryId === 'cat_household')).toBe(0);
  });

  it('General-pool predicate takes the unbudgeted slices only', () => {
    const budgeted = new Set(['cat_food']);
    expect(splitAmountMatching(tx, (a) => !budgeted.has(a.categoryId))).toBe(40000);
    const unsplitBudgeted = makeTx({ amount: 70000, category: 'cat_food' });
    expect(splitAmountMatching(unsplitBudgeted, (a) => !budgeted.has(a.categoryId))).toBe(0);
    const unsplitFree = makeTx({ amount: 70000, category: 'cat_household' });
    expect(splitAmountMatching(unsplitFree, (a) => !budgeted.has(a.categoryId))).toBe(70000);
  });
});

describe('type shape', () => {
  it('splits is optional — old records without it are valid', () => {
    const oldTx: Transaction = makeTx({});
    expect('splits' in oldTx).toBe(false);
    expect(hasSplits(oldTx)).toBe(false);
    const splitTx: Transaction = makeTx({ splits: [{ categoryId: 'a', amount: 1 }] });
    expect(hasSplits(splitTx)).toBe(true);
  });

  it('types.ts declares the optional splits field on Transaction', () => {
    expect(TYPES_SRC).toContain('splits?: TransactionSplit[]');
    expect(TYPES_SRC).toContain('interface TransactionSplit');
    expect(TYPES_SRC).toContain('categoryId: string;');
  });
});

describe('totals that must NOT change', () => {
  it('plan-limit counting is record-length based (one split record counts once)', () => {
    expect(HANDLERS_SRC).toContain(
      'return txs.filter((t) => t.date && t.date >= start && countsTowardMyLimit(t)).length;',
    );
    // The counting expression itself never touches splits (D1 adds a
    // splits import to this file, so a whole-file absence check no
    // longer holds — scope the assertion to the counting line).
    const countingLine = HANDLERS_SRC.split('\n').find((l) =>
      l.includes('countsTowardMyLimit(t)).length'),
    );
    expect(countingLine).toBeDefined();
    expect(countingLine).not.toContain('splits');
  });

  it('wallet balances sum t.amount directly', () => {
    expect(WALLET_BALANCE_SRC).toContain('const amt = Number(t.amount) || 0;');
  });

  it('day totals in the transaction list sum t.amount directly', () => {
    expect(TXVIEW_SRC).toContain('convertToMMK(t.amount, walletMap.get(t.walletId)?.currency');
  });

  it('firestore.rules needs no change — no field whitelist on transactions, no splits mention', () => {
    expect(RULES_SRC).not.toContain('splits');
    expect(HELPER_SRC).toContain('there is no field whitelist');
  });
});

describe('aggregation wiring (one assertion per routed site)', () => {
  const sites: Array<[string, string]> = [
    ['Donut', '../../components/CurrentMonthExpenseDonutChart.tsx'],
    ['Trend', '../../components/CategorySpendingTrendLineChart.tsx'],
    ['BudgetAnalyticsView', '../../components/BudgetAnalyticsView.tsx'],
    ['BudgetSummaryCard', '../../components/CurrentMonthBudgetSummaryCard.tsx'],
    ['NotificationModal', '../../components/NotificationModal.tsx'],
    ['App badge', '../../App.tsx'],
    ['SpendingComparisonView', '../../components/SpendingComparisonView.tsx'],
    ['MonthlySummaryChart', '../../components/MonthlySummaryChart.tsx'],
    ['AdminPanel', '../../components/AdminPanel.tsx'],
  ];
  it.each(sites)('%s routes split-aware amounts', (_name, rel) => {
    const src = readFileSync(new URL(rel, import.meta.url), 'utf8');
    expect(src).toContain('transactionSplits');
    expect(src.includes('getSplitAttribution') || src.includes('splitAmountMatching')).toBe(true);
  });

  it('FinancialSummaryTable stays whole-amount (wallet sums, no category grouping)', () => {
    const src = readFileSync(
      new URL('../../components/FinancialSummaryTable.tsx', import.meta.url),
      'utf8',
    );
    expect(src).not.toContain('getSplitAttribution');
    expect(src).not.toContain('transactionSplits');
  });
});

describe('form wiring', () => {
  it('TransactionModal has the split section, validation gate and payload spread', () => {
    expect(TXMODAL_SRC).toContain('splitEnabled');
    expect(TXMODAL_SRC).toContain('validateSplits(built, finalAmount)');
    expect(TXMODAL_SRC).toContain('...(validSplits ? { splits: validSplits } : {})');
    expect(TXMODAL_SRC).toContain('splitSectionVisible');
    expect(TXMODAL_SRC).toContain('splitRowsFromTransaction(editTransaction)');
    expect(TXMODAL_SRC).toContain('handlePrimaryCategorySelect');
    expect(TXMODAL_SRC).toContain('splitPickerRow !== null');
    // Two pickers: the primary one and the per-row one.
    expect(TXMODAL_SRC.match(/<CategoryPickerModal/g)?.length).toBe(2);
    // Splits only in general non-transfer entries: the gate names
    // the model, the toggle and the transfer exclusion.
    expect(TXMODAL_SRC).toContain(
      "entryModel === 'general' && splitEnabled && !isTransferTx && splitRows.length > 0",
    );
    // Toggling off / deleting all rows clears splits on save: the
    // payload spread is conditional and the section-off path writes
    // no splits key.
    expect(TXMODAL_SRC).toContain('splits: validSplits');
    expect(TXMODAL_SRC).not.toContain('splits: undefined');
  });

  it('TransactionsView shows the split badge on collapsed rows', () => {
    expect(TXVIEW_SRC).toContain('hasSplits(t)');
    expect(TXVIEW_SRC).toContain('မျိုး ခွဲ');
    expect(TXVIEW_SRC).toContain('Split ×');
  });
});

describe('splits cleared on edit (D1: merge writes keep an omitted field)', () => {
  const two = [
    { categoryId: 'cat_food', amount: 60000 },
    { categoryId: 'cat_household', amount: 40000 },
  ];
  it('shouldClearSplits fires only for had-splits → now-none', () => {
    expect(shouldClearSplits(two, undefined)).toBe(true);
    expect(shouldClearSplits(two, [])).toBe(true);
    expect(shouldClearSplits(two, two)).toBe(false);
    expect(shouldClearSplits(two, [{ categoryId: 'cat_food', amount: 100000 }])).toBe(false);
    expect(shouldClearSplits(undefined, undefined)).toBe(false);
    expect(shouldClearSplits([], undefined)).toBe(false);
    expect(shouldClearSplits(undefined, two)).toBe(false);
    expect(shouldClearSplits([], two)).toBe(false);
  });

  it('an empty splits array is unsplit everywhere (the clearing value)', () => {
    const tx = makeTx({ splits: [] });
    expect(hasSplits(tx)).toBe(false);
    expect(splitRowsFromTransaction(tx)).toBeNull();
    expect(getSplitAttribution(tx)).toHaveLength(1);
  });

  it('the edit handler writes splits: [] into the same updatedTx both cloud paths persist', () => {
    // Exactly one clearing site, decided from the edit source vs the
    // new payload — never on the new-record path (no previous splits).
    expect(HANDLERS_SRC).toContain(
      'shouldClearSplits(editingTransaction.splits, sanitizedTx.splits)',
    );
    expect(HANDLERS_SRC.match(/shouldClearSplits\(/g)?.length).toBe(1);
    expect(HANDLERS_SRC).toContain('{ splits: [] }');
    expect(HANDLERS_SRC).toContain("import { shouldClearSplits } from '../utils/transactionSplits'");
    // Owner doc: the merge persistDoc writes updatedTx (carrying []).
    expect(HANDLERS_SRC).toContain('...updatedTx,');
    // Shared-wallet doc: the checked shared save also receives
    // updatedTx, so the same [] reaches the shared copy + its mirror.
    expect(HANDLERS_SRC).toContain('saveSharedTxChecked(newWallet, updatedTx, postBal)');
    // Shared service persists the tx it is given by spread, so []
    // survives into the canonical doc and the owner mirror.
    expect(SHARED_SVC_SRC).toContain('let txForShared: Transaction = { ...tx, walletId: docIdToUse }');
    expect(SHARED_SVC_SRC).toContain('safeSetDoc(txRef, cleanForFirestore(txForShared), { merge: true })');
    // No sentinel anywhere in the SPLITS-clearing path: deleteField
    // must never pass through the safe* wrappers (cleanForFirestore
    // corrupts it) — the splits fix uses no sentinel at all. The
    // ONLY code use of deleteField() in this file is the [v7.6.49]
    // labor-clear (raw updateDoc, best-effort, maintenance-edit
    // path only) — it never touches a splits write, and no safe*
    // or persistDoc call carries a sentinel.
    expect(HANDLERS_SRC.match(/laborCost: deleteField\(\)/g)).toHaveLength(1);
    expect(HANDLERS_SRC).not.toMatch(/safeSetDoc\([^)]*deleteField/);
    expect(HANDLERS_SRC).not.toMatch(/persistDoc\([^)]*deleteField/);
    const laborIdx = HANDLERS_SRC.indexOf('Clearing labor must actively delete the field');
    expect(laborIdx).toBeGreaterThan(-1);
    expect(HANDLERS_SRC.slice(laborIdx)).toContain('updateDoc(doc(db,');
  });
});

describe('Version bump to v7.6.27 (build 342)', () => {  it('version constants and history entry match version.json', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.57');
    expect(CURRENT_BUILD_NUMBER).toBe(371);
    expect(VERSION_JSON.version).toBe('v7.6.57');
    expect(VERSION_JSON.buildNumber).toBe(371);
    const entry = VERSION_HISTORY[0];
    expect(entry.version).toBe('v7.6.57');
    expect(entry.buildNumber).toBe(371);
    expect(entry.releaseDate).toBe('2026-11-27');
    expect(entry.tag).toBe('fix');
    expect(entry.titleMy).toBe('လက်ကျန်ကတ် အရောင်စိုစိုတောက်တောက် နှင့် စာရင်းထည့်ဖောင် အကူအညီများ');
    expect(entry.titleEn).toBe('Vivid Records balance card and entry-form helpers');
    expect(entry.changesMy).toEqual(VERSION_JSON.changesMy);
    expect(entry.changesEn).toEqual(VERSION_JSON.changesEn);
    expect(entry.changesMy).toHaveLength(4);
    expect(entry.changesEn).toHaveLength(4);
    expect(entry.changesMy[0]).toBe(
      'စာရင်းမျက်နှာက လက်ကျန်ကတ်ရဲ့ အရောင်တွေ စိုစိုတောက်တောက် ဖြစ်လာပါပြီ — အနီ၊ အဝါ၊ အဖြူရဲ့ အဓိပ္ပာယ်တွေ အတိုင်းပါပဲ',
    );
    expect(entry.changesEn[0]).toBe(
      'The Records balance card colours are vivid now — red, yellow and white keep their meanings',
    );
  });

  it('change log has no Admin content and releasedAt is present-only', () => {
    expect(VERSION_JSON.changesMy.join(' ')).not.toContain('Admin');
    expect(VERSION_JSON.changesEn.join(' ')).not.toContain('Admin');
    expect(JSON.stringify(VERSION_HISTORY[0])).not.toContain('Admin');
    expect(typeof VERSION_JSON.releasedAt).toBe('string');
    expect(VERSION_JSON.releasedAt.length).toBeGreaterThan(0);
  });
});
