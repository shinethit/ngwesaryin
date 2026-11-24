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
  percentOf,
} from '../statementData';
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

  it('the print view renders totals, category %, sub %, and the split marker', () => {
    expect(PRINT_VIEW_SRC).toContain('စာရင်းရှင်းတမ်း');
    expect(PRINT_VIEW_SRC).toContain('Statement');
    expect(PRINT_VIEW_SRC).toContain('ခွဲရေး');
    expect(PRINT_VIEW_SRC).toContain('formatMMK');
  });

  it('print CSS hides app chrome and shows only the statement', () => {
    expect(CSS_SRC).toContain('@media print');
    expect(CSS_SRC).toContain('body > *:not(#ngwe-print-root)');
    expect(CSS_SRC).toContain('#ngwe-print-root');
    expect(CSS_SRC).toContain('break-inside: avoid');
  });

  it('adds no PDF/image library dependency', () => {
    expect(PACKAGE_JSON).not.toContain('jspdf');
    expect(PACKAGE_JSON).not.toContain('html2canvas');
    expect(PACKAGE_JSON).not.toContain('html-to-image');
  });
});

// ---------- Version bump to v7.6.27 (build 342) ----------

describe('Version bump to v7.6.27 (build 342)', () => {
  it('version constants and history entry match version.json', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.31');
    expect(CURRENT_BUILD_NUMBER).toBe(345);
    expect(VERSION_JSON.version).toBe('v7.6.31');
    expect(VERSION_JSON.buildNumber).toBe(345);
    const entry = VERSION_HISTORY[0];
    expect(entry.version).toBe('v7.6.31');
    expect(entry.buildNumber).toBe(345);
    expect(entry.releaseDate).toBe('2026-11-24');
    expect(entry.tag).toBe('feature');
    expect(entry.titleMy).toBe('Wallet တစ်ခုချင်းစီမှာ ပြမယ့် Category ရွေးနိုင်ခြင်း');
    expect(entry.titleEn).toBe('Choose which categories each wallet shows');
    expect(entry.changesMy).toEqual(VERSION_JSON.changesMy);
    expect(entry.changesEn).toEqual(VERSION_JSON.changesEn);
    expect(entry.changesMy).toHaveLength(1);
    expect(entry.changesEn).toHaveLength(1);
    expect(entry.changesMy[0]).toBe(
      'Wallet တစ်ခုချင်းစီမှာ ပြမယ့် Category တွေကို ရွေးနိုင်သည် — မလိုတဲ့ Category တွေကို ဖြုတ်ထားရင် စာရင်းသွင်းတဲ့အခါ မပေါ်တော့ပါ',
    );
    expect(entry.changesEn[0]).toBe(
      'Each wallet can choose which categories it shows — hidden categories no longer appear when entering records for that wallet.',
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
