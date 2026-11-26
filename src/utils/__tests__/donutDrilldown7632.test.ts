// [v7.6.32] Donut drill-down + outside labels: pure-helper tests
// (sub-category breakdown, record rows, label geometry) plus
// source-text wiring assertions (the repo pattern: components have
// no test renderer; layout behaviour is verified by renders).
// Source reads use `new URL` — NO path comparisons.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Category, Transaction } from '../../types';
import {
  buildDonutCategoryRecords,
  buildDonutLabelPlacements,
  buildDonutSubBreakdown,
  DONUT_LABEL_MIN_PERCENT,
  DONUT_LABEL_MIN_GAP_PCT,
  donutRecordLabel,
  resolveDonutSubName,
} from '../../utils/donutDrilldown';
import {
  VERSION_HISTORY,
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
} from '../../data/versionHistory';

const DONUT_SRC = readFileSync(
  new URL('../../components/CurrentMonthExpenseDonutChart.tsx', import.meta.url),
  'utf8',
);
const ANALYTICS_SRC = readFileSync(
  new URL('../../components/AnalyticsView.tsx', import.meta.url),
  'utf8',
);
const APP_SRC = readFileSync(new URL('../../App.tsx', import.meta.url), 'utf8');
const HELPER_SRC = readFileSync(
  new URL('../../utils/donutDrilldown.ts', import.meta.url),
  'utf8',
);
const VERSION_JSON = JSON.parse(
  readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
);

const FOOD: Category = {
  id: 'cat_food',
  name: 'အစားအသောက်',
  nameEn: 'Food',
  type: 'expense',
  icon: 'ShoppingCart',
  color: '#F43F5E',
  subCategories: [
    { id: 'sub_grocery', name: 'ကုန်စုံ', nameEn: 'Grocery' },
    { id: 'sub_meals', name: 'အစားအသောက်', nameEn: 'Meals' },
  ],
};

const tx = (over: Partial<Transaction>): Transaction => ({
  id: 't1',
  type: 'expense',
  amount: 10000,
  category: 'cat_food',
  walletId: 'cash',
  date: '2026-11-10',
  createdAt: 1,
  ...over,
});

const identity = (t: Transaction, amount: number = t.amount) => amount;

describe('resolveDonutSubName (v7.6.32)', () => {
  it('resolves a known sub-category in both languages', () => {
    expect(resolveDonutSubName(FOOD, 'sub_grocery', 'my')).toBe('ကုန်စုံ');
    expect(resolveDonutSubName(FOOD, 'sub_grocery', 'en')).toBe('Grocery');
  });

  it('falls back to the General label for a missing or unknown sub id', () => {
    expect(resolveDonutSubName(FOOD, undefined, 'my')).toBe('အထွေထွေ');
    expect(resolveDonutSubName(FOOD, '', 'en')).toBe('General');
    expect(resolveDonutSubName(FOOD, 'sub_nope', 'my')).toBe('အထွေထွေ');
    expect(resolveDonutSubName(undefined, 'sub_grocery', 'en')).toBe('General');
  });
});

describe('buildDonutSubBreakdown (v7.6.32)', () => {
  it('groups split slices by sub-category with % of the category total', () => {
    const expenses = [
      tx({
        id: 't1',
        amount: 12000,
        splits: [
          { categoryId: 'cat_food', subCategoryId: 'sub_grocery', amount: 6000 },
          { categoryId: 'cat_food', subCategoryId: 'sub_meals', amount: 4000 },
          { categoryId: 'cat_transport', amount: 2000 },
        ],
      }),
      tx({ id: 't2', amount: 5000, subCategoryId: 'sub_grocery' }),
    ];
    const rows = buildDonutSubBreakdown(expenses, 'cat_food', FOOD, identity, 'my');
    // Grocery 6000 + 5000 = 11000 (73%), meals 4000 (27%); the
    // transport slice is excluded. Total = 15000.
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ key: 'sub_grocery', name: 'ကုန်စုံ', amount: 11000, percentage: 73 });
    expect(rows[1]).toMatchObject({ key: 'sub_meals', name: 'အစားအသောက်', amount: 4000, percentage: 27 });
  });

  it('puts slices with no sub-category id on the General row', () => {
    const expenses = [tx({ id: 't1', amount: 3000 })];
    const rows = buildDonutSubBreakdown(expenses, 'cat_food', FOOD, identity, 'en');
    expect(rows).toEqual([
      { key: '', subCategoryId: '', name: 'General', amount: 3000, percentage: 100 },
    ]);
  });

  it('converts each slice with the caller converter (percentages unchanged)', () => {
    const expenses = [
      tx({
        id: 't1',
        amount: 10000,
        splits: [
          { categoryId: 'cat_food', subCategoryId: 'sub_grocery', amount: 7500 },
          { categoryId: 'cat_food', subCategoryId: 'sub_meals', amount: 2500 },
        ],
      }),
    ];
    const doubled = (t: Transaction, amount: number = t.amount) => amount * 2;
    const rows = buildDonutSubBreakdown(expenses, 'cat_food', FOOD, doubled, 'my');
    expect(rows[0].amount).toBe(15000);
    expect(rows[0].percentage).toBe(75);
    expect(rows[1].amount).toBe(5000);
    expect(rows[1].percentage).toBe(25);
  });

  it('sorts amount-desc and returns [] for a category with no slices', () => {
    const expenses = [tx({ id: 't1', amount: 3000, category: 'cat_transport' })];
    expect(buildDonutSubBreakdown(expenses, 'cat_food', FOOD, identity, 'my')).toEqual([]);
  });
});

describe('buildDonutCategoryRecords (v7.6.32)', () => {
  it('lists each record once with only its in-category slice amount', () => {
    const expenses = [
      tx({
        id: 't1',
        date: '2026-11-09',
        amount: 12000,
        splits: [
          { categoryId: 'cat_food', amount: 9000 },
          { categoryId: 'cat_transport', amount: 3000 },
        ],
      }),
      tx({ id: 't2', date: '2026-11-12', amount: 5000 }),
    ];
    const rows = buildDonutCategoryRecords(expenses, 'cat_food', identity);
    expect(rows).toHaveLength(2);
    // Date-desc: t2 first.
    expect(rows[0]).toMatchObject({ tx: expenses[1], amount: 5000 });
    expect(rows[1]).toMatchObject({ tx: expenses[0], amount: 9000 });
  });

  it('orders by date desc with the id breaking ties deterministically', () => {
    const expenses = [
      tx({ id: 'tb', date: '2026-11-10', amount: 1000 }),
      tx({ id: 'ta', date: '2026-11-10', amount: 2000 }),
    ];
    const rows = buildDonutCategoryRecords(expenses, 'cat_food', identity);
    expect(rows.map((r) => r.tx.id)).toEqual(['ta', 'tb']);
  });

  it('excludes records with no slice in the category', () => {
    const expenses = [tx({ id: 't1', category: 'cat_transport', amount: 4000 })];
    expect(buildDonutCategoryRecords(expenses, 'cat_food', identity)).toEqual([]);
  });
});

describe('donutRecordLabel (v7.6.32)', () => {
  it('prefers item names, then the note, then the sub-category name', () => {
    const withItems = tx({
      items: [
        { name: 'ဆန်', price: 5000, quantity: 1, amount: 5000 },
        { name: 'ဆီ', price: 3000, quantity: 1, amount: 3000 },
      ],
      note: 'weekly shop',
    });
    expect(donutRecordLabel(withItems, FOOD, 'my')).toBe('ဆန် · ဆီ');
    const withNote = tx({ note: 'lunch' });
    expect(donutRecordLabel(withNote, FOOD, 'my')).toBe('lunch');
    const bare = tx({ subCategoryId: 'sub_meals' });
    expect(donutRecordLabel(bare, FOOD, 'en')).toBe('Meals');
    const bareGeneral = tx({});
    expect(donutRecordLabel(bareGeneral, FOOD, 'my')).toBe('အထွေထွေ');
  });
});

describe('buildDonutLabelPlacements (v7.6.32)', () => {
  it('uses the 5% threshold on the displayed percentage', () => {
    expect(DONUT_LABEL_MIN_PERCENT).toBe(5);
    const placements = buildDonutLabelPlacements([
      { categoryId: 'a', percentage: 5, fraction: 0.05, startFraction: 0 },
      { categoryId: 'b', percentage: 4, fraction: 0.04, startFraction: 0.05 },
    ]);
    expect(placements.map((p) => p.categoryId)).toEqual(['a']);
  });

  it('places the user’s 9-slice shape: 51% right, 36% left, 6% top-left, slivers unlabeled', () => {
    const slices = [
      { categoryId: 'vehicle', percentage: 51, fraction: 0.51, startFraction: 0 },
      { categoryId: 'other', percentage: 36, fraction: 0.36, startFraction: 0.51 },
      { categoryId: 'lovely', percentage: 6, fraction: 0.06, startFraction: 0.87 },
      { categoryId: 's4', percentage: 2, fraction: 0.02, startFraction: 0.93 },
      { categoryId: 's5', percentage: 2, fraction: 0.02, startFraction: 0.95 },
      { categoryId: 's6', percentage: 1, fraction: 0.01, startFraction: 0.97 },
      { categoryId: 's7', percentage: 1, fraction: 0.01, startFraction: 0.98 },
      { categoryId: 's8', percentage: 1, fraction: 0.005, startFraction: 0.99 },
      { categoryId: 's9', percentage: 1, fraction: 0.005, startFraction: 0.995 },
    ];
    const placements = buildDonutLabelPlacements(slices);
    expect(placements.map((p) => p.categoryId)).toEqual(['vehicle', 'other', 'lovely']);
    const byId = new Map(placements.map((p) => [p.categoryId, p]));
    expect(byId.get('vehicle')!.side).toBe('right');
    expect(byId.get('other')!.side).toBe('left');
    expect(byId.get('lovely')!.side).toBe('left');
    // Mid-angles: vehicle 91.8° (middle-right), other 248.4°
    // (lower-left), lovely 324° (upper-left, just before the top).
    expect(byId.get('vehicle')!.topPct).toBeCloseTo(51.3, 0);
    expect(byId.get('other')!.topPct).toBeCloseTo(64.7, 0);
    expect(byId.get('lovely')!.topPct).toBeCloseTo(17.6, 0);
  });

  it('puts a full-circle slice on the right at the bottom center', () => {
    const [p] = buildDonutLabelPlacements([
      { categoryId: 'only', percentage: 100, fraction: 1, startFraction: 0 },
    ]);
    expect(p.side).toBe('right');
    expect(p.topPct).toBeCloseTo(90, 5);
  });

  it('separates same-side labels by at least the minimum gap, clamped in bounds', () => {
    const placements = buildDonutLabelPlacements([
      { categoryId: 'a', percentage: 5, fraction: 0.05, startFraction: 0 },
      { categoryId: 'b', percentage: 5, fraction: 0.05, startFraction: 0.05 },
      { categoryId: 'c', percentage: 5, fraction: 0.05, startFraction: 0.1 },
    ]);
    const tops = placements.map((p) => p.topPct).sort((x, y) => x - y);
    expect(placements).toHaveLength(3);
    expect(placements.every((p) => p.side === 'right')).toBe(true);
    for (let i = 1; i < tops.length; i++) {
      expect(tops[i] - tops[i - 1]).toBeGreaterThanOrEqual(DONUT_LABEL_MIN_GAP_PCT);
    }
    expect(placements.every((p) => p.topPct >= 7 && p.topPct <= 93)).toBe(true);
  });

  it('labels a slice whose mid-angle sits exactly on the left/right boundary as right', () => {
    // Mid-angle 180° (bottom center): start 0.25 + half of 0.5.
    const [p] = buildDonutLabelPlacements([
      { categoryId: 'half', percentage: 50, fraction: 0.5, startFraction: 0.25 },
    ]);
    expect(p.side).toBe('right');
  });
});

describe('Donut drill-down wiring (v7.6.32)', () => {
  it('rows are real buttons with aria-expanded and a single expanded id', () => {
    expect(DONUT_SRC).toContain('aria-expanded={isExpanded}');
    expect(DONUT_SRC).toContain('const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null)');
    expect(DONUT_SRC).toContain('setExpandedCategoryId(isExpanded ? null : item.categoryId)');
    expect(DONUT_SRC).toContain('ChevronDown');
  });

  it('the amount toggle stays a sibling button — the lakh/exact toggle count is unchanged', () => {
    expect(DONUT_SRC.match(/setShowExact\(\(v\) => !v\)/g)).toHaveLength(3);
  });

  it('the center total + header toggle buttons are untouched', () => {
    expect(DONUT_SRC).toContain('max-w-[120px]');
    expect(DONUT_SRC).toContain('title={formatMMK(totalExpense)}');
  });

  it('labels render only on narrow screens, non-interactive, from the placement helper', () => {
    expect(DONUT_SRC).toContain('buildDonutLabelPlacements(svgSlices)');
    expect(DONUT_SRC).toContain('pointer-events-none absolute inset-0 md:hidden');
    expect(HELPER_SRC).toContain('export const DONUT_LABEL_MIN_PERCENT = 5');
  });

  it('record taps thread through AnalyticsView into App’s existing detail view', () => {
    expect(DONUT_SRC).toContain('onSelectTransaction?: (t: Transaction) => void');
    expect(DONUT_SRC).toContain('onClick={() => onSelectTransaction(tx)}');
    expect(ANALYTICS_SRC).toContain('onSelectTransaction?: (t: Transaction) => void');
    expect(ANALYTICS_SRC).toContain('onSelectTransaction={onSelectTransaction}');
    expect(APP_SRC).toContain('onSelectTransaction={(t) => setViewingTransaction(t)}');
  });

  it('the donut stays behind the App-level guest lock — no new lock is invented', () => {
    // The lock card text precedes the AnalyticsView mount in App source:
    // guests never reach the donut, so the detail-view callback only
    // ever fires for signed-in users.
    expect(APP_SRC.indexOf('Guest Mode တွင် မရရှိနိုင်ပါ')).toBeLessThan(
      APP_SRC.indexOf('<AnalyticsView'),
    );
    expect(DONUT_SRC).not.toContain('Guest Mode');
  });

  it('the donut aggregation memo is unchanged apart from the fraction fields', () => {
    expect(DONUT_SRC).toContain('getSplitAttribution(t).forEach((slice, sliceIdx) => {');
    expect(DONUT_SRC).toContain('.sort((a, b) => b.amount - a.amount);');
  });
});

describe('Version bump to v7.6.41 (build 355)', () => {
  it('version surfaces agree on v7.6.41 / build 355', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.58');
    expect(CURRENT_BUILD_NUMBER).toBe(372);
    expect(VERSION_JSON.version).toBe('v7.6.58');
    expect(VERSION_JSON.buildNumber).toBe(372);
    const entry = VERSION_HISTORY[0];
    expect(entry.version).toBe('v7.6.58');
    expect(entry.buildNumber).toBe(372);
    expect(entry.changesMy).toEqual(VERSION_JSON.changesMy);
    expect(entry.changesEn).toEqual(VERSION_JSON.changesEn);
    expect(entry.changesMy).toHaveLength(3);
    expect(entry.changesEn).toHaveLength(3);
    expect(entry.changesMy[0]).toBe(
      'လက်ကျန်ကတ်ရဲ့ အောက်ခံက ရောင်စုံအလင်းအမှောင် ဖြစ်လာပြီး အဓိကပမာဏက တောက်ပလာပါပြီ',
    );
    expect(entry.changesEn[0]).toBe(
      'The balance card now sits on a rich gradient ground with a luminous main figure',
    );
    expect([...entry.changesMy, ...entry.changesEn].join(' ')).not.toContain('Admin');
  });

  it('the helper module exports the documented API', () => {
    expect(HELPER_SRC).toContain('export function buildDonutSubBreakdown');
    expect(HELPER_SRC).toContain('export function buildDonutCategoryRecords');
    expect(HELPER_SRC).toContain('export function buildDonutLabelPlacements');
    expect(HELPER_SRC).toContain('export function donutRecordLabel');
    expect(HELPER_SRC).toContain('export function resolveDonutSubName');
  });

  it('the label gap fits wrapped two-line values and the value line wraps instead of clipping', () => {
    // 24pct of the 176px wrapper is ~42px: a wrapped exact-mode value
    // ("510,000 MMK · 51%") makes the label ~42px tall.
    expect(DONUT_LABEL_MIN_GAP_PCT).toBe(24);
    // The label value element must NOT carry whitespace-nowrap: the
    // value wraps at the spaces so the % never clips past the edge.
    expect(DONUT_SRC).toContain('leading-[1.25]');
    // Exact class-string check (not a substring scan: the JSX comment
    // above the value line mentions the old class by name).
    expect(DONUT_SRC).toContain('font-mono text-[10px] font-bold text-rose-600 leading-[1.25]');
    expect(DONUT_SRC).not.toContain('font-mono text-[10px] font-bold text-rose-600 whitespace-nowrap');
    // Explicit label width (see the component comment): max-width
    // shrink-wraps an abspos box at left/right:100% to one word.
    expect(DONUT_SRC).toContain('absolute w-[88px] sm:w-[104px]');
    expect(DONUT_SRC).not.toContain('max-w-[88px]');
  });
});
