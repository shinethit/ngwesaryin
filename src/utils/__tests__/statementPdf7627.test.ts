// [v7.6.27] PDF statement export — pure aggregation for the Reports
// print view. Category % is a share of TOTAL expense; sub-category %
// is a share of the PARENT category (parent = 100%). Split-aware via
// getSplitAttribution, transfers excluded — the same rules the
// Donut chart uses, so statement numbers match on-screen Reports.
// Wiring pins are source-text assertions (no test renderer in this
// repo; vitest node env). NO path comparisons: sources are read via
// new URL(..., import.meta.url).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  buildStatementData,
  flowShares,
  groupStatementDetails,
  percentOf,
} from '../statementData';
import {
  isIOS,
  isPrintBlockedEnvironment,
  STATEMENT_PREVIEW_HASH,
  STATEMENT_PREVIEW_KEY,
} from '../printFallback';
import type { Category, Transaction } from '../../types';
import {
  VERSION_HISTORY,
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
} from '../../data/versionHistory';

const ANALYTICS_SRC = readFileSync(
  new URL('../../components/AnalyticsView.tsx', import.meta.url),
  'utf8',
);
const PRINT_VIEW_SRC = readFileSync(
  new URL('../../components/StatementPrintView.tsx', import.meta.url),
  'utf8',
);
const CSS_SRC = readFileSync(new URL('../../index.css', import.meta.url), 'utf8');
const FALLBACK_SRC = readFileSync(
  new URL('../printFallback.ts', import.meta.url),
  'utf8',
);
const PREVIEW_SRC = readFileSync(
  new URL('../../components/StatementPrintPreview.tsx', import.meta.url),
  'utf8',
);
const PACKAGE_JSON = readFileSync(
  new URL('../../../package.json', import.meta.url),
  'utf8',
);
const VERSION_JSON = JSON.parse(
  readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
);

const CATEGORIES: Category[] = [
  {
    id: 'cat_food',
    name: 'အစားအသောက်',
    nameEn: 'Food',
    type: 'expense',
    icon: 'Utensils',
    color: '#f00',
    subCategories: [
      { id: 'sub_snack', name: 'သွားရည်စာ', nameEn: 'Snacks' },
      { id: 'sub_meals', name: 'အစားအစာ', nameEn: 'Meals' },
    ],
  },
  {
    id: 'cat_shopping',
    name: 'ဈေးဝယ်',
    nameEn: 'Shopping',
    type: 'expense',
    icon: 'ShoppingBag',
    color: '#00f',
    subCategories: [],
  },
  {
    id: 'cat_salary',
    name: 'လစာ',
    nameEn: 'Salary',
    type: 'income',
    icon: 'Banknote',
    color: '#0a0',
    subCategories: [],
  },
];

function tx(partial: Partial<Transaction> & { id: string }): Transaction {
  return {
    type: 'expense',
    amount: 0,
    category: 'cat_food',
    walletId: 'w1',
    date: '2026-11-10',
    ...partial,
  } as Transaction;
}

const IDENTITY = (t: Transaction, amount: number) => amount;

describe('percentOf (v7.6.27)', () => {
  it('rounds shares like the Donut chart', () => {
    expect(percentOf(50, 200)).toBe(25);
    expect(percentOf(1, 3)).toBe(33);
    expect(percentOf(2, 3)).toBe(67);
    expect(percentOf(0, 100)).toBe(0);
  });

  it('is null when the denominator is 0 — never NaN', () => {
    expect(percentOf(5, 0)).toBeNull();
    expect(percentOf(0, 0)).toBeNull();
    expect(percentOf(5, -10)).toBeNull();
  });
});

describe('buildStatementData (v7.6.27)', () => {
  it('totals categories as a share of total expense', () => {
    const data = buildStatementData({
      transactions: [
        tx({ id: 'a', amount: 300, category: 'cat_food', subCategoryId: 'sub_snack' }),
        tx({ id: 'b', amount: 100, category: 'cat_shopping' }),
        tx({ id: 'c', type: 'income', amount: 500, category: 'cat_salary' }),
      ],
      categories: CATEGORIES,
      convertAmount: IDENTITY,
      start: null,
      end: null,
      lang: 'my',
    });
    expect(data.income).toBe(500);
    expect(data.expense).toBe(400);
    expect(data.balance).toBe(100);
    expect(data.categories.map((c) => c.categoryId)).toEqual(['cat_food', 'cat_shopping']);
    expect(data.categories[0].total).toBe(300);
    expect(data.categories[0].percent).toBe(75);
    expect(data.categories[1].percent).toBe(25);
  });

  it('sub-category % uses the parent category as 100%', () => {
    const data = buildStatementData({
      transactions: [
        tx({ id: 'a', amount: 200, category: 'cat_food', subCategoryId: 'sub_snack' }),
        tx({ id: 'b', amount: 100, category: 'cat_food', subCategoryId: 'sub_meals' }),
      ],
      categories: CATEGORIES,
      convertAmount: IDENTITY,
      start: null,
      end: null,
      lang: 'my',
    });
    const food = data.categories[0];
    expect(food.total).toBe(300);
    expect(food.subs).toHaveLength(2);
    expect(food.subs[0]).toMatchObject({ name: 'သွားရည်စာ', total: 200, percent: 67 });
    expect(food.subs[1]).toMatchObject({ name: 'အစားအစာ', total: 100, percent: 33 });
  });

  it('a split record attributes slices per category but appears once in details', () => {
    const data = buildStatementData({
      transactions: [
        tx({
          id: 's',
          amount: 300,
          category: 'cat_food',
          subCategoryId: 'sub_snack',
          splits: [
            { categoryId: 'cat_food', subCategoryId: 'sub_snack', amount: 200 },
            { categoryId: 'cat_shopping', amount: 100 },
          ],
        }),
      ],
      categories: CATEGORIES,
      convertAmount: IDENTITY,
      start: null,
      end: null,
      lang: 'my',
    });
    expect(data.expense).toBe(300);
    expect(data.categories).toHaveLength(2);
    expect(data.categories.find((c) => c.categoryId === 'cat_food')?.total).toBe(200);
    expect(data.categories.find((c) => c.categoryId === 'cat_shopping')?.total).toBe(100);
    expect(data.details).toHaveLength(1);
    expect(data.details[0]).toMatchObject({ amount: 300, isSplit: true, splitCount: 2 });
    // Summary foots to the detail total.
    expect(data.details.reduce((s, d) => s + d.amount, 0)).toBe(data.expense);
  });

  it('excludes transfers from totals, summaries, and details', () => {
    const data = buildStatementData({
      transactions: [
        tx({ id: 'a', amount: 100, category: 'cat_food' }),
        tx({ id: 't1', amount: 999, category: 'cat_transfer', isTransfer: true }),
        tx({ id: 't2', type: 'income', amount: 888, category: 'cat_transfer' }),
      ],
      categories: CATEGORIES,
      convertAmount: IDENTITY,
      start: null,
      end: null,
      lang: 'my',
    });
    expect(data.expense).toBe(100);
    expect(data.income).toBe(0);
    expect(data.details.map((d) => d.id)).toEqual(['a']);
  });

  it('income-only period: no expense sections, percents stay well-defined', () => {
    const data = buildStatementData({
      transactions: [tx({ id: 'a', type: 'income', amount: 500, category: 'cat_salary' })],
      categories: CATEGORIES,
      convertAmount: IDENTITY,
      start: null,
      end: null,
      lang: 'my',
    });
    expect(data.income).toBe(500);
    expect(data.expense).toBe(0);
    expect(data.balance).toBe(500);
    expect(data.categories).toEqual([]);
    expect(data.details).toHaveLength(1);
  });

  it('empty period still builds with zeros and an empty list', () => {
    const data = buildStatementData({
      transactions: [],
      categories: CATEGORIES,
      convertAmount: IDENTITY,
      start: '2026-11-01',
      end: '2026-11-30',
      lang: 'en',
    });
    expect(data).toMatchObject({ income: 0, expense: 0, balance: 0 });
    expect(data.categories).toEqual([]);
    expect(data.details).toEqual([]);
  });

  it('date bounds are inclusive; out-of-range records are dropped', () => {
    const data = buildStatementData({
      transactions: [
        tx({ id: 'before', amount: 1, date: '2026-10-31' }),
        tx({ id: 'start', amount: 2, date: '2026-11-01' }),
        tx({ id: 'mid', amount: 4, date: '2026-11-15' }),
        tx({ id: 'end', amount: 8, date: '2026-11-30' }),
        tx({ id: 'after', amount: 16, date: '2026-12-01' }),
      ],
      categories: CATEGORIES,
      convertAmount: IDENTITY,
      start: '2026-11-01',
      end: '2026-11-30',
      lang: 'my',
    });
    expect(data.details.map((d) => d.id)).toEqual(['start', 'mid', 'end']);
    expect(data.expense).toBe(14);
  });

  it('omits categories with no spend in the period', () => {
    const data = buildStatementData({
      transactions: [tx({ id: 'a', amount: 50, category: 'cat_food' })],
      categories: CATEGORIES,
      convertAmount: IDENTITY,
      start: null,
      end: null,
      lang: 'my',
    });
    expect(data.categories.map((c) => c.categoryId)).toEqual(['cat_food']);
  });

  it('orders details oldest-first and labels items, then note, then category', () => {
    const data = buildStatementData({
      transactions: [
        tx({ id: 'new', amount: 1, date: '2026-11-20', note: 'late note' }),
        tx({
          id: 'old',
          amount: 2,
          date: '2026-11-05',
          note: 'ignored note',
          items: [
            { name: 'Rice', price: 1, quantity: 1, amount: 1 },
            { name: 'Oil', price: 1, quantity: 1, amount: 1 },
            { name: 'Salt', price: 1, quantity: 1, amount: 1 },
          ],
        }),
        tx({ id: 'nonote', amount: 3, date: '2026-11-06', category: 'cat_shopping' }),
      ],
      categories: CATEGORIES,
      convertAmount: IDENTITY,
      start: null,
      end: null,
      lang: 'en',
    });
    expect(data.details.map((d) => d.id)).toEqual(['old', 'nonote', 'new']);
    expect(data.details[0].label).toBe('Rice · Oil · +1');
    expect(data.details[1].label).toBe('Shopping');
    expect(data.details[2].label).toBe('late note');
  });

  it('falls back to the real category name in Myanmar, not the legacy display map', () => {
    // Regression: detailLabel used to pass [] as the category list, so
    // the fallback map supplied the legacy name ('အစားအသောက်နှင့်
    // ကုန်စုံ' for cat_food) instead of the user's category name.
    // In English the two coincide ('Shopping'), which hid the bug.
    const data = buildStatementData({
      transactions: [tx({ id: 'nonote', amount: 3, date: '2026-11-06', category: 'cat_food' })],
      categories: CATEGORIES,
      convertAmount: IDENTITY,
      start: null,
      end: null,
      lang: 'my',
    });
    expect(data.details).toHaveLength(1);
    expect(data.details[0].label).toBe('အစားအသောက်');
    expect(data.details[0].categoryName).toBe('အစားအသောက်');
  });

  it('groups a missing sub-category under General', () => {
    const data = buildStatementData({
      transactions: [tx({ id: 'a', amount: 70, category: 'cat_food' })],
      categories: CATEGORIES,
      convertAmount: IDENTITY,
      start: null,
      end: null,
      lang: 'my',
    });
    expect(data.categories[0].subs).toHaveLength(1);
    expect(data.categories[0].subs[0].name).toBe('အထွေထွေ');
    expect(data.categories[0].subs[0].percent).toBe(100);
  });

  it('converts each slice through the injected converter', () => {
    const data = buildStatementData({
      transactions: [
        tx({ id: 'usd', amount: 10, walletId: 'w-usd', category: 'cat_food' }),
        tx({ id: 'mmk', amount: 5000, walletId: 'w1', category: 'cat_food' }),
      ],
      categories: CATEGORIES,
      convertAmount: (t, amount) => (t.walletId === 'w-usd' ? amount * 4000 : amount),
      start: null,
      end: null,
      lang: 'my',
    });
    expect(data.expense).toBe(45000);
  });
});

describe('statement print wiring (v7.6.27)', () => {
  it('Reports has a PDF button, a statement period, and a print portal', () => {
    expect(ANALYTICS_SRC).toContain('PDF ထုတ်ယူမည်');
    expect(ANALYTICS_SRC).toContain('Export PDF');
    expect(ANALYTICS_SRC).toContain('ngwe-print-root');
    expect(ANALYTICS_SRC).toContain('StatementPrintView');
    expect(ANALYTICS_SRC).toContain('buildStatementData');
    expect(ANALYTICS_SRC).toContain('createPortal');
    expect(ANALYTICS_SRC).toContain('afterprint');
    expect(ANALYTICS_SRC).toContain('window.print');
    expect(ANALYTICS_SRC).toContain('statementPeriod');
  });

  it('the print view renders the donut, the stacked-column chart, the regrouped detail, and the split marker', () => {
    expect(PRINT_VIEW_SRC).toContain('စာရင်းရှင်းတမ်း');
    expect(PRINT_VIEW_SRC).toContain('Statement');
    expect(PRINT_VIEW_SRC).toContain('ခွဲရေး');
    expect(PRINT_VIEW_SRC).toContain('formatMMK');
    expect(PRINT_VIEW_SRC).toContain('stmt-donut');
    expect(PRINT_VIEW_SRC).toContain('stmt-chart-svg');
    expect(PRINT_VIEW_SRC).not.toContain('stmt-bar-fill');
    expect(PRINT_VIEW_SRC).toContain('stmt-group-row');
    expect(PRINT_VIEW_SRC).toContain('stmt-subhead-row');
    expect(PRINT_VIEW_SRC).toContain('groupStatementDetails');
    expect(PRINT_VIEW_SRC).toContain('flowShares');
    expect(PRINT_VIEW_SRC).not.toContain('stmt-totals');
    expect(PRINT_VIEW_SRC).not.toContain('stmt-cat-row');
    expect(PRINT_VIEW_SRC).not.toContain('stmt-date-row');
  });

  it('print CSS hides app chrome, shows only the statement, and forces A4', () => {
    expect(CSS_SRC).toContain('@media print');
    expect(CSS_SRC).toContain('body > *:not(#ngwe-print-root)');
    expect(CSS_SRC).toContain('#ngwe-print-root');
    expect(CSS_SRC).toContain('break-inside: avoid');
    expect(CSS_SRC).toContain('@page');
    expect(CSS_SRC).toContain('size: A4');
    expect(CSS_SRC).toContain('#ngwe-preview-root');
    expect(CSS_SRC).toContain('stmt-no-print');
    expect(CSS_SRC).toContain('stmt-chart-svg');
    expect(CSS_SRC).toContain('stmt-donut-balance');
  });

  it('adds no PDF/image library dependency', () => {
    expect(PACKAGE_JSON).not.toContain('jspdf');
    expect(PACKAGE_JSON).not.toContain('html2canvas');
    expect(PACKAGE_JSON).not.toContain('html-to-image');
  });

  it('prints synchronously in the tap gesture and falls back on iOS standalone', () => {
    expect(ANALYTICS_SRC).toContain('flushSync');
    expect(ANALYTICS_SRC).toContain('isPrintBlockedEnvironment');
    expect(ANALYTICS_SRC).toContain('StatementPrintPreview');
    expect(ANALYTICS_SRC).toContain('saveStatementPreview');
    expect(ANALYTICS_SRC).toContain('isPrintPreviewHash');
    expect(FALLBACK_SRC).toContain('display-mode: standalone');
    expect(FALLBACK_SRC).toContain('navigator.standalone');
    expect(PREVIEW_SRC).toContain('ngwe-preview-root');
    expect(PREVIEW_SRC).toContain('Open in browser');
    expect(PREVIEW_SRC).toContain('Browser မှာ ဖွင့်မည်');
    expect(PREVIEW_SRC).toContain('stmt-no-print');
  });
});

describe('flowShares (v7.6.36)', () => {
  it('splits the flow between income and expense only', () => {
    expect(flowShares(300, 100)).toEqual({ incomeShare: 0.75, expenseShare: 0.25 });
    expect(flowShares(500, 0)).toEqual({ incomeShare: 1, expenseShare: 0 });
    expect(flowShares(0, 400)).toEqual({ incomeShare: 0, expenseShare: 1 });
  });

  it('is zeroed when there is no flow — never NaN', () => {
    expect(flowShares(0, 0)).toEqual({ incomeShare: 0, expenseShare: 0 });
  });
});

describe('groupStatementDetails (v7.6.36)', () => {
  const general = 'အထွေထွေ';
  function grouped() {
    const data = buildStatementData({
      transactions: [
        tx({ id: 'f1', amount: 300, date: '2026-11-02', category: 'cat_food', subCategoryId: 'sub_meals' }),
        tx({ id: 'f2', amount: 100, date: '2026-11-01', category: 'cat_food', subCategoryId: 'sub_snack' }),
        tx({ id: 'f3', amount: 50, date: '2026-11-03', category: 'cat_food' }),
        tx({ id: 's1', amount: 200, date: '2026-11-02', category: 'cat_shopping' }),
        tx({ id: 'i1', type: 'income', amount: 900, date: '2026-11-01', category: 'cat_salary' }),
        tx({ id: 'i2', type: 'income', amount: 100, date: '2026-11-04', category: 'cat_salary' }),
      ],
      categories: CATEGORIES,
      convertAmount: IDENTITY,
      start: null,
      end: null,
      lang: 'my',
    });
    return groupStatementDetails(data, general);
  }

  it('orders categories by chart order, then income-only categories by total desc', () => {
    const groups = grouped();
    expect(groups.map((g) => g.categoryName)).toEqual([
      'အစားအသောက်',
      'ဈေးဝယ်',
      'လစာ',
    ]);
  });

  it('orders sub-categories by chart order and groups missing subs under General', () => {
    const groups = grouped();
    const food = groups[0];
    expect(food.subs.map((s) => s.subName)).toEqual(['အစားအစာ', 'သွားရည်စာ', 'အထွေထွေ']);
    expect(food.subs[2].rows.map((r) => r.id)).toEqual(['f3']);
  });

  it('keeps records date-ascending inside each sub-group', () => {
    const groups = grouped();
    const salary = groups[2];
    expect(salary.subs).toHaveLength(1);
    expect(salary.subs[0].subName).toBe('အထွေထွေ');
    expect(salary.subs[0].rows.map((r) => r.id)).toEqual(['i1', 'i2']);
  });

  it('keeps every detail row exactly once', () => {
    const groups = grouped();
    const ids = groups.flatMap((g) => g.subs.flatMap((s) => s.rows.map((r) => r.id)));
    expect(ids.sort()).toEqual(['f1', 'f2', 'f3', 'i1', 'i2', 's1']);
  });
});

describe('iOS print fallback detection (v7.6.36)', () => {
  const base = {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    maxTouchPoints: 5,
    hasPrintFunction: true,
  };

  it('blocks print for iOS standalone (display-mode and legacy flag)', () => {
    expect(isPrintBlockedEnvironment({ ...base, standalone: false, displayModeStandalone: true })).toBe(true);
    expect(isPrintBlockedEnvironment({ ...base, standalone: true, displayModeStandalone: false })).toBe(true);
  });

  it('does not block iOS Safari browser mode', () => {
    expect(isPrintBlockedEnvironment({ ...base, standalone: false, displayModeStandalone: false })).toBe(false);
  });

  it('does not block Android standalone or desktop', () => {
    expect(
      isPrintBlockedEnvironment({
        userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36',
        standalone: false,
        displayModeStandalone: true,
        maxTouchPoints: 5,
        hasPrintFunction: true,
      }),
    ).toBe(false);
    expect(
      isPrintBlockedEnvironment({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        standalone: false,
        displayModeStandalone: false,
        maxTouchPoints: 0,
        hasPrintFunction: true,
      }),
    ).toBe(false);
  });

  it('blocks when there is no print function at all', () => {
    expect(
      isPrintBlockedEnvironment({ ...base, standalone: false, displayModeStandalone: false, hasPrintFunction: false }),
    ).toBe(true);
  });

  it('treats iPadOS desktop-mode UAs as iOS', () => {
    expect(isIOS({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15', maxTouchPoints: 5 })).toBe(true);
    expect(isIOS({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15', maxTouchPoints: 0 })).toBe(false);
  });

  it('uses a stable storage key and hash for the restore link', () => {
    expect(STATEMENT_PREVIEW_KEY).toBe('ngwe_statement_preview');
    expect(STATEMENT_PREVIEW_HASH).toBe('#ngwe-print-preview');
  });
});

// ---------- Version bump to v7.6.41 (build 355) ----------

describe('Version bump to v7.6.41 (build 355)', () => {
  it('version constants and history entry match version.json', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.60');
    expect(CURRENT_BUILD_NUMBER).toBe(374);
    expect(VERSION_JSON.version).toBe('v7.6.60');
    expect(VERSION_JSON.buildNumber).toBe(374);
    const entry = VERSION_HISTORY[0];
    expect(entry.version).toBe('v7.6.60');
    expect(entry.buildNumber).toBe(374);
    expect(entry.releaseDate).toBe('2026-11-27');
    expect(entry.tag).toBe('fix');
    expect(entry.titleMy).toBe('Sync အပေါက်တွေ ပိတ်ခြင်းနှင့် လက်ကျန်ကတ် အပြားလိုက် ပြင်ဆင်ခြင်း');
    expect(entry.titleEn).toBe('Sync delete-loss holes closed; balance card flat like the Hero');
    expect(entry.changesMy).toEqual(VERSION_JSON.changesMy);
    expect(entry.changesEn).toEqual(VERSION_JSON.changesEn);
    expect(entry.changesMy).toHaveLength(7);
    expect(entry.changesEn).toHaveLength(7);
    expect(entry.changesMy[0]).toBe(
      'ပြင်နေရင်း ဖျက်လိုက်တဲ့ မှတ်တမ်းက Cloud ကို မရောက်ဘဲ ပျောက်သွားတဲ့ အပေါက်ကို ပိတ်လိုက်ပါပြီ',
    );
    expect(entry.changesEn[0]).toBe(
      'A delete issued while an edit was saving can no longer lose its queue task',
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
