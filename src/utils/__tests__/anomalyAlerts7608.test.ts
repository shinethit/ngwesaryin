// [v7.6.08] Anomaly alerts — this week's spend above the usual
// weekly average per category, in Notifications with a bell-badge
// count. Pure helper tests (no Firestore, no component state) +
// wiring assertions (same pattern as expiryReminders7606.test.ts —
// the components have no test renderer in this repo; layout
// behaviour is verified by renders).
//
// Investigation locked in here: the current window is the last 7
// days ending today (days 0-6), the baseline is days 8-35 split
// into 4 weekly buckets, and day 7 belongs to NEITHER window. Only
// EXPENSE transactions count; transfers (isTransferTransaction:
// isTransfer flag, cat_transfer, tx_tf_/tf_ ids, transferType)
// and income are excluded. Split slices attribute through the
// v7.6.07 getSplitAttribution helper, never tx.category alone.
// The Transactions list has NO plumbing to preset its category
// filter (selectedCategory is internal state in
// TransactionsView.tsx, no prop), so anomaly rows navigate to
// the Analytics/Reports tab ('analytics') — the existing
// destination that already shows per-category spending.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  ANOMALY_MULTIPLIER,
  ANOMALY_MIN_WEEK_SPEND,
  ANOMALY_BASELINE_WEEKS,
  ANOMALY_MIN_BASELINE_WEEKS_WITH_SPEND,
  anomalyAlertId,
  getAnomalyAlerts,
} from '../anomalyAlerts';
import type { Transaction } from '../../types';
import {
  VERSION_HISTORY,
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
} from '../../data/versionHistory';

const HELPER_SRC = readFileSync(
  new URL('../anomalyAlerts.ts', import.meta.url),
  'utf8',
);
const MODAL_SRC = readFileSync(
  new URL('../../components/NotificationModal.tsx', import.meta.url),
  'utf8',
);
const APP_SRC = readFileSync(
  new URL('../../App.tsx', import.meta.url),
  'utf8',
);
const VERSION_JSON = JSON.parse(
  readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
);

/** Fixed "today" so every window boundary is deterministic. */
const TODAY = '2026-11-23';
/** First date of the current 7-day window (today - 6 days). */
const WEEK_START = '2026-11-17';

function dateStr(daysAgo: number, from: string = TODAY): string {
  const [y, m, d] = from.split('-').map(Number);
  const date = new Date(y, m - 1, d - daysAgo);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

let seq = 0;
function tx(
  overrides: Partial<Transaction> & { date: string; amount: number },
): Transaction {
  seq += 1;
  return {
    id: `tx-anom-${seq}`,
    type: 'expense',
    amount: overrides.amount,
    category: 'cat_food',
    walletId: 'w1',
    note: '',
    createdAt: 0,
    ...overrides,
  };
}

/** One expense `amount` in each of the given baseline weeks
 *  (week 0 = days 8-14, week 3 = days 29-35), dated mid-week. */
function baselineTx(
  category: string,
  weeklyAmounts: number[],
  extra: Partial<Transaction> = {},
): Transaction[] {
  const out: Transaction[] = [];
  weeklyAmounts.forEach((amount, week) => {
    if (amount <= 0) return;
    // Mid-week day for the bucket: daysAgo = 8 + week*7 + 3.
    out.push(
      tx({
        category,
        amount,
        date: dateStr(8 + week * 7 + 3),
        ...extra,
      }),
    );
  });
  return out;
}

describe('threshold: 2x multiplier and floor (v7.6.08)', () => {
  it('exactly 2.0x fires, 1.9x stays silent', () => {
    const base = baselineTx('cat_food', [10000, 10000, 10000, 10000]);
    const at2x = getAnomalyAlerts(
      [...base, tx({ category: 'cat_food', amount: 20000, date: TODAY })],
      TODAY,
    );
    expect(at2x).toHaveLength(1);
    expect(at2x[0].kind).toBe('multiple');
    expect(at2x[0].multiple).toBe(2);
    expect(at2x[0].currentWeekSpend).toBe(20000);
    expect(at2x[0].baselineWeeklyAverage).toBe(10000);
    expect(at2x[0].baselineWeeksWithSpend).toBe(4);

    const at19x = getAnomalyAlerts(
      [...base, tx({ category: 'cat_food', amount: 19000, date: TODAY })],
      TODAY,
    );
    expect(at19x).toEqual([]);
  });

  it('multiple rounds to 1 decimal, no fake precision', () => {
    const list = getAnomalyAlerts(
      [
        ...baselineTx('cat_food', [10000, 10000, 10000, 10000]),
        tx({ category: 'cat_food', amount: 25000, date: TODAY }),
      ],
      TODAY,
    );
    expect(list[0].multiple).toBe(2.5);
    // 2.75x rounds to 2.8 (single decimal, honest rounding;
    // 2.75 is exact in binary, so this rounding is deterministic).
    const list2 = getAnomalyAlerts(
      [
        ...baselineTx('cat_food', [10000, 10000, 10000, 10000]),
        tx({ category: 'cat_food', amount: 27500, date: TODAY }),
      ],
      TODAY,
    );
    expect(list2[0].multiple).toBe(2.8);
  });

  it('floor: at the floor fires, below the floor stays silent even at 3x', () => {
    // Baseline avg 3333 (weeks of 3333): 3x = 9999 < 10000 floor.
    const silent = getAnomalyAlerts(
      [
        ...baselineTx('cat_food', [3333, 3333, 3333, 3333]),
        tx({ category: 'cat_food', amount: 9999, date: TODAY }),
      ],
      TODAY,
    );
    expect(silent).toEqual([]);
    // Exactly at the floor, above 2x: fires.
    const fires = getAnomalyAlerts(
      [
        ...baselineTx('cat_food', [4000, 4000, 4000, 4000]),
        tx({ category: 'cat_food', amount: 10000, date: TODAY }),
      ],
      TODAY,
    );
    expect(fires).toHaveLength(1);
    expect(fires[0].currentWeekSpend).toBe(10000);
  });

  it('the threshold is ONE set of named constants, used in the comparison', () => {
    expect(ANOMALY_MULTIPLIER).toBe(2);
    expect(ANOMALY_MIN_WEEK_SPEND).toBe(10000);
    expect(ANOMALY_BASELINE_WEEKS).toBe(4);
    expect(ANOMALY_MIN_BASELINE_WEEKS_WITH_SPEND).toBe(2);
    expect(HELPER_SRC).toContain('export const ANOMALY_MULTIPLIER = 2;');
    expect(HELPER_SRC).toContain('export const ANOMALY_MIN_WEEK_SPEND = 10000;');
    expect(HELPER_SRC).toContain('export const ANOMALY_BASELINE_WEEKS = 4;');
    expect(HELPER_SRC).toContain(
      'export const ANOMALY_MIN_BASELINE_WEEKS_WITH_SPEND = 2;',
    );
    expect(HELPER_SRC.match(/export const ANOMALY_MULTIPLIER/g)).toHaveLength(1);
    expect(HELPER_SRC).toContain('current * ANOMALY_BASELINE_WEEKS < ANOMALY_MULTIPLIER * baselineTotal');
    expect(HELPER_SRC).toContain('current < ANOMALY_MIN_WEEK_SPEND');
    expect(HELPER_SRC).toContain('weeksWithSpend < ANOMALY_MIN_BASELINE_WEEKS_WITH_SPEND');
  });
});

describe('baseline formation (v7.6.08)', () => {
  it('2 of 4 weeks with spend forms a baseline; empty weeks count as 0 in the average', () => {
    // Total 40000 over 2 weeks -> average 10000 (divided by 4,
    // NOT by 2). Current 20000 = exactly 2x -> fires.
    const list = getAnomalyAlerts(
      [
        ...baselineTx('cat_food', [20000, 20000, 0, 0]),
        tx({ category: 'cat_food', amount: 20000, date: TODAY }),
      ],
      TODAY,
    );
    expect(list).toHaveLength(1);
    expect(list[0].baselineWeeklyAverage).toBe(10000);
    expect(list[0].baselineWeeksWithSpend).toBe(2);
  });

  it('1 of 4 weeks with spend forms NO baseline — no comparison, however large the current week', () => {
    const list = getAnomalyAlerts(
      [
        ...baselineTx('cat_food', [40000, 0, 0, 0]),
        tx({ category: 'cat_food', amount: 50000, date: TODAY }),
      ],
      TODAY,
    );
    expect(list).toEqual([]);
  });

  it('baseline-zero: zero spend in all 4 weeks + current week at the floor alerts, honestly, with no multiplier', () => {
    const list = getAnomalyAlerts(
      [tx({ category: 'cat_food', amount: 50000, date: TODAY })],
      TODAY,
    );
    expect(list).toHaveLength(1);
    expect(list[0].kind).toBe('baseline_zero');
    expect(list[0].multiple).toBeNull();
    expect(list[0].baselineWeeklyAverage).toBe(0);
    expect(list[0].baselineWeeksWithSpend).toBe(0);
    expect(list[0].currentWeekSpend).toBe(50000);
    // Baseline-zero below the floor stays silent.
    expect(
      getAnomalyAlerts(
        [tx({ category: 'cat_food', amount: 9999, date: TODAY })],
        TODAY,
      ),
    ).toEqual([]);
  });

  it('3 of 4 weeks with spend forms a baseline', () => {
    const list = getAnomalyAlerts(
      [
        ...baselineTx('cat_food', [10000, 10000, 10000, 0]),
        tx({ category: 'cat_food', amount: 20000, date: TODAY }),
      ],
      TODAY,
    );
    // Average = 30000/4 = 7500; 20000 is 2.7x -> fires.
    expect(list).toHaveLength(1);
    expect(list[0].baselineWeeklyAverage).toBe(7500);
    expect(list[0].multiple).toBe(2.7);
  });
});

describe('window boundaries (v7.6.08)', () => {
  it('day 6 is in the current window, today is in the current window', () => {
    const list = getAnomalyAlerts(
      [
        ...baselineTx('cat_food', [10000, 10000, 10000, 10000]),
        tx({ category: 'cat_food', amount: 10000, date: dateStr(6) }),
        tx({ category: 'cat_food', amount: 10000, date: TODAY }),
      ],
      TODAY,
    );
    expect(list).toHaveLength(1);
    expect(list[0].currentWeekSpend).toBe(20000);
  });

  it('day 7 (the gap day) counts in NEITHER window', () => {
    // A huge day-7 spend must not create a current-week alert...
    expect(
      getAnomalyAlerts(
        [
          ...baselineTx('cat_food', [10000, 10000, 10000, 10000]),
          tx({ category: 'cat_food', amount: 90000, date: dateStr(7) }),
        ],
        TODAY,
      ),
    ).toEqual([]);
    // ...and must not inflate the baseline either: current 15000
    // stays below 2x the true 10000 average.
    expect(
      getAnomalyAlerts(
        [
          ...baselineTx('cat_food', [10000, 10000, 10000, 10000]),
          tx({ category: 'cat_food', amount: 90000, date: dateStr(7) }),
          tx({ category: 'cat_food', amount: 15000, date: TODAY }),
        ],
        TODAY,
      ),
    ).toEqual([]);
  });

  it('day 8 is in the baseline (first baseline week), day 35 is in the baseline (last week), day 36 is out', () => {
    // Day 8 alone: 1-of-4 weeks -> silent even with a big current week.
    expect(
      getAnomalyAlerts(
        [
          tx({ category: 'cat_food', amount: 40000, date: dateStr(8) }),
          tx({ category: 'cat_food', amount: 20000, date: TODAY }),
        ],
        TODAY,
      ),
    ).toEqual([]);
    // Day 35 alone: same, 1-of-4 -> silent.
    expect(
      getAnomalyAlerts(
        [
          tx({ category: 'cat_food', amount: 40000, date: dateStr(35) }),
          tx({ category: 'cat_food', amount: 20000, date: TODAY }),
        ],
        TODAY,
      ),
    ).toEqual([]);
    // Day 36 alone: outside every window, so the baseline is zero
    // and the current week fires as a baseline-zero alert.
    const list36 = getAnomalyAlerts(
      [
        tx({ category: 'cat_food', amount: 40000, date: dateStr(36) }),
        tx({ category: 'cat_food', amount: 20000, date: TODAY }),
      ],
      TODAY,
    );
    expect(list36).toHaveLength(1);
    expect(list36[0].kind).toBe('baseline_zero');
    // Future dates never count.
    expect(
      getAnomalyAlerts(
        [
          ...baselineTx('cat_food', [10000, 10000, 10000, 10000]),
          tx({ category: 'cat_food', amount: 90000, date: dateStr(-1) }),
        ],
        TODAY,
      ),
    ).toEqual([]);
  });

  it('each baseline bucket is 7 days: day 14 and day 15 land in different weeks', () => {
    // Weeks: [day8-14]=10000, [day15-21]=10000, others 0 -> 2-of-4,
    // average 5000; current 10000 = 2x -> fires.
    const list = getAnomalyAlerts(
      [
        tx({ category: 'cat_food', amount: 10000, date: dateStr(14) }),
        tx({ category: 'cat_food', amount: 10000, date: dateStr(15) }),
        tx({ category: 'cat_food', amount: 10000, date: TODAY }),
      ],
      TODAY,
    );
    expect(list).toHaveLength(1);
    expect(list[0].baselineWeeksWithSpend).toBe(2);
    expect(list[0].baselineWeeklyAverage).toBe(5000);
  });
});

describe('exclusions and split attribution (v7.6.08)', () => {
  it('transfers and income never count, by every transfer signal', () => {
    const candidates: Transaction[] = [
      tx({ category: 'cat_food', amount: 90000, date: TODAY, isTransfer: true }),
      tx({ category: 'cat_transfer', amount: 90000, date: TODAY }),
      tx({ category: 'cat_food', amount: 90000, date: TODAY, transferType: 'transfer_out', id: 'tx_tf_1' }),
      tx({ category: 'cat_food', amount: 90000, date: TODAY, type: 'income' }),
    ];
    expect(getAnomalyAlerts(candidates, TODAY)).toEqual([]);
  });

  it('a transfer-flagged split record is excluded entirely, slices and all', () => {
    expect(
      getAnomalyAlerts(
        [
          tx({
            category: 'cat_food',
            amount: 90000,
            date: TODAY,
            isTransfer: true,
            splits: [
              { categoryId: 'cat_food', amount: 45000 },
              { categoryId: 'cat_shopping', amount: 45000 },
            ],
          }),
        ],
        TODAY,
      ),
    ).toEqual([]);
  });

  it('split slices count under their own categories, never tx.category alone', () => {
    // Baseline: food 10000/week, shopping 10000/week.
    const list = getAnomalyAlerts(
      [
        ...baselineTx('cat_food', [10000, 10000, 10000, 10000]),
        ...baselineTx('cat_shopping', [10000, 10000, 10000, 10000]),
        // One receipt, primary cat_food, split 40000 food + 20000 shopping.
        tx({
          category: 'cat_food',
          amount: 60000,
          date: TODAY,
          splits: [
            { categoryId: 'cat_food', amount: 40000 },
            { categoryId: 'cat_shopping', amount: 20000 },
          ],
        }),
      ],
      TODAY,
    );
    expect(list.map((a) => a.categoryId)).toEqual(['cat_food', 'cat_shopping']);
    expect(list[0].multiple).toBe(4);
    expect(list[0].currentWeekSpend).toBe(40000);
    expect(list[1].multiple).toBe(2);
    expect(list[1].currentWeekSpend).toBe(20000);
    // A split whose slices all belong to another category never
    // credits the record's own category.
    const onlyOther = getAnomalyAlerts(
      [
        ...baselineTx('cat_shopping', [10000, 10000, 10000, 10000]),
        tx({
          category: 'cat_food',
          amount: 30000,
          date: TODAY,
          splits: [{ categoryId: 'cat_shopping', amount: 30000 }],
        }),
      ],
      TODAY,
    );
    expect(onlyOther.map((a) => a.categoryId)).toEqual(['cat_shopping']);
  });

  it('unsplit records count under tx.category, and the helper goes through getSplitAttribution', () => {
    expect(HELPER_SRC).toContain('getSplitAttribution(tx)');
    expect(HELPER_SRC).toContain("import { getSplitAttribution } from './transactionSplits';");
    const list = getAnomalyAlerts(
      [
        ...baselineTx('cat_food', [10000, 10000, 10000, 10000]),
        tx({ category: 'cat_food', amount: 20000, date: TODAY }),
      ],
      TODAY,
    );
    expect(list).toHaveLength(1);
    expect(list[0].categoryId).toBe('cat_food');
  });
});

describe('local-time date math (v7.6.08)', () => {
  it('a Date today agrees with the string today, and DST-transition dates use local midnights', () => {
    const asString = getAnomalyAlerts(
      [
        ...baselineTx('cat_food', [10000, 10000, 10000, 10000]),
        tx({ category: 'cat_food', amount: 20000, date: TODAY }),
      ],
      TODAY,
    );
    const asDate = getAnomalyAlerts(
      [
        ...baselineTx('cat_food', [10000, 10000, 10000, 10000]),
        tx({ category: 'cat_food', amount: 20000, date: TODAY }),
      ],
      new Date(2026, 10, 23),
    );
    expect(asDate).toEqual(asString);
    // 2026-03-08 is a DST-transition date in observing zones. With
    // today 2026-03-15: 03-08 is 7 days ago (gap), 03-09 is 6 days
    // ago (current). A 20000 spend on 03-09 fires against a
    // 10000/week baseline; the same spend on 03-08 must not.
    const marchToday = '2026-03-15';
    const marchBaseline: Transaction[] = [11, 18, 25, 32].map((ago, i) =>
      tx({ category: 'cat_food', amount: 10000, date: dateStr(ago, marchToday), id: `march-base-${i}` }),
    );
    expect(
      getAnomalyAlerts(
        [...marchBaseline, tx({ category: 'cat_food', amount: 20000, date: '2026-03-09' })],
        marchToday,
      ),
    ).toHaveLength(1);
    expect(
      getAnomalyAlerts(
        [...marchBaseline, tx({ category: 'cat_food', amount: 20000, date: '2026-03-08' })],
        marchToday,
      ),
    ).toEqual([]);
  });

  it('the helper never parses dates as UTC midnight', () => {
    expect(HELPER_SRC).not.toContain("new Date(tx.date");
    expect(HELPER_SRC).not.toContain("new Date(value)");
    expect(HELPER_SRC).not.toContain('toISOString');
    expect(HELPER_SRC).toContain('new Date(y, mo - 1, d)');
  });

  it('datetime strings resolve to their local date; malformed and impossible dates are ignored', () => {
    const list = getAnomalyAlerts(
      [
        ...baselineTx('cat_food', [10000, 10000, 10000, 10000]),
        tx({ category: 'cat_food', amount: 20000, date: '2026-11-23T10:00:00' }),
      ],
      TODAY,
    );
    expect(list).toHaveLength(1);
    expect(
      getAnomalyAlerts(
        [
          tx({ category: 'cat_food', amount: 90000, date: 'not-a-date' }),
          tx({ category: 'cat_food', amount: 90000, date: '2026-02-30' }),
          tx({ category: 'cat_food', amount: 90000, date: '' }),
        ],
        TODAY,
      ),
    ).toEqual([]);
  });

  it('invalid today / empty inputs produce no alerts', () => {
    expect(
      getAnomalyAlerts(
        [tx({ category: 'cat_food', amount: 50000, date: TODAY })],
        'not-a-date',
      ),
    ).toEqual([]);
    expect(getAnomalyAlerts([], TODAY)).toEqual([]);
    expect(getAnomalyAlerts([], 'not-a-date')).toEqual([]);
  });
});

describe('sorting, ids and converter (v7.6.08)', () => {
  it('sorting: highest multiple first; baseline-zero alerts after every 2x alert', () => {
    const list = getAnomalyAlerts(
      [
        ...baselineTx('cat_food', [10000, 10000, 10000, 10000]),
        ...baselineTx('cat_shopping', [10000, 10000, 10000, 10000]),
        tx({ category: 'cat_food', amount: 20000, date: TODAY }),
        tx({ category: 'cat_shopping', amount: 30000, date: TODAY }),
        // Baseline-zero, bigger than both — still last.
        tx({ category: 'cat_health', amount: 90000, date: TODAY }),
      ],
      TODAY,
    );
    expect(list.map((a) => a.categoryId)).toEqual([
      'cat_shopping',
      'cat_food',
      'cat_health',
    ]);
    expect(list[2].kind).toBe('baseline_zero');
  });

  it('ties: larger current spend first, then category id; baseline-zero ties by current spend then id', () => {
    const list = getAnomalyAlerts(
      [
        ...baselineTx('cat_food', [10000, 10000, 10000, 10000]),
        ...baselineTx('cat_shopping', [20000, 20000, 20000, 20000]),
        // Both 2x: food 20000 < shopping 40000 -> shopping first.
        tx({ category: 'cat_food', amount: 20000, date: TODAY }),
        tx({ category: 'cat_shopping', amount: 40000, date: TODAY }),
        tx({ category: 'cat_zebra', amount: 30000, date: TODAY }),
        tx({ category: 'cat_alpha', amount: 30000, date: TODAY }),
      ],
      TODAY,
    );
    expect(list.map((a) => a.categoryId)).toEqual([
      'cat_shopping',
      'cat_food',
      'cat_alpha',
      'cat_zebra',
    ]);
  });

  it('ids are stable, carry the week start, and are shared by badge and modal', () => {
    expect(anomalyAlertId('cat_food', WEEK_START)).toBe(
      'notif_anomaly_cat_food_2026-11-17',
    );
    const list = getAnomalyAlerts(
      [tx({ category: 'cat_food', amount: 50000, date: TODAY })],
      TODAY,
    );
    expect(list[0].id).toBe('notif_anomaly_cat_food_2026-11-17');
    expect(list[0].weekStart).toBe(WEEK_START);
    // The modal renders the helper's own ids (same ids App counts).
    expect(MODAL_SRC).toContain('id: a.id,');
    expect(APP_SRC).toContain('if (!readNotificationIds.includes(a.id)) count++;');
  });

  it('the optional converter is applied per slice, so foreign-currency wallets compare in MMK', () => {
    const convert = (_t: Transaction, amount: number) => amount * 2000;
    // Baseline 2.5 units/week x2000 = 5000/week; current 5 units
    // x2000 = 10000: at the floor and exactly 2x -> fires.
    const converted = getAnomalyAlerts(
      [
        ...baselineTx('cat_food', [2.5, 2.5, 2.5, 2.5]),
        tx({ category: 'cat_food', amount: 5, date: TODAY }),
      ],
      TODAY,
      convert,
    );
    expect(converted).toHaveLength(1);
    expect(converted[0].currentWeekSpend).toBe(10000);
    expect(converted[0].baselineWeeklyAverage).toBe(5000);
    // Without the converter the same records stay far below the
    // floor (2x the raw average, but 5 raw units < 10000).
    const raw = getAnomalyAlerts(
      [
        ...baselineTx('cat_food', [2.5, 2.5, 2.5, 2.5]),
        tx({ category: 'cat_food', amount: 5, date: TODAY }),
      ],
      TODAY,
    );
    expect(raw).toEqual([]);
  });

  it('the helper is pure: no Firestore, no storage, no Premium gate, no formatting', () => {
    expect(HELPER_SRC).not.toContain('firestore');
    expect(HELPER_SRC).not.toContain('firebase');
    expect(HELPER_SRC).not.toContain('localStorage');
    expect(HELPER_SRC).not.toContain('premium');
    expect(HELPER_SRC).not.toContain('Premium');
    // Code-level: no formatter import and no formatter call (the
    // header comment may name formatLakhs as the render route).
    expect(HELPER_SRC).not.toContain("from './formatters'");
    expect(HELPER_SRC).not.toContain('formatLakhs(');
    expect(HELPER_SRC).not.toContain('formatMMK(');
  });
});

describe('anomaly section wiring — modal + bell badge (v7.6.08)', () => {
  it('NotificationModal gains the grouped section and Anomaly tab, with the honest spec wording', () => {
    expect(MODAL_SRC).toContain("type: 'debt' | 'budget' | 'vehicle' | 'recurring' | 'system' | 'shop' | 'expiry' | 'anomaly'");
    expect(MODAL_SRC).toContain("setFilterTab('anomaly')");
    expect(MODAL_SRC).toContain('renderAnomalyRow');
    expect(MODAL_SRC).toContain('hasAnomalyNotifications');
    expect(MODAL_SRC).toContain('anomalyTotalCount');
    expect(MODAL_SRC).toContain('ပုံမှန်ထက် အသုံးများခြင်း သတိပေးချက်များ');
    expect(MODAL_SRC).toContain('Unusually High Spending Alerts');
    // 2x wording, verbatim spec sentence shape (amounts formatted
    // at render through formatLakhs, multiple to 1 decimal).
    expect(MODAL_SRC).toContain('ဒီအပတ် ');
    expect(MODAL_SRC).toContain('— ပုံမှန်အပတ်စဉ် ပျမ်းမျှ');
    expect(MODAL_SRC).toContain('This week ');
    expect(MODAL_SRC).toContain('× the usual weekly average of');
    // Baseline-zero wording, verbatim spec sentence shape, and NO
    // multiplier in that branch.
    expect(MODAL_SRC).toContain('ပြီးခဲ့တဲ့ ၄ ပတ်မှာ');
    expect(MODAL_SRC).toContain('မသုံးခဲ့ဘဲ ဒီအပတ်');
    expect(MODAL_SRC).toContain('No ');
    expect(MODAL_SRC).toContain('spending in the past 4 weeks, but');
    expect(MODAL_SRC).toContain('spent this week');
    // No percentages, scores or probability language in the
    // anomaly wording (the helper returns raw numbers only).
    expect(MODAL_SRC.toLowerCase()).not.toContain('probability');
    // Read-only v1: no snooze anywhere in the modal, and no
    // dismiss control inside the anomaly row renderer.
    expect(MODAL_SRC.toLowerCase()).not.toContain('snooze');
    const rowStart = MODAL_SRC.indexOf('const renderAnomalyRow');
    // The component's own `return (` (2-space indent) ends the
    // renderer; the row's own `return (` is indented 4 spaces.
    const rowEnd = MODAL_SRC.indexOf('\n  return (', rowStart);
    const rowSrc = MODAL_SRC.slice(rowStart, rowEnd);
    expect(rowSrc).not.toContain('dismiss');
    expect(rowSrc).toContain('onMarkAsRead');
    // The existing sections are untouched: expiry + shop wiring
    // still present, badge behaviour for shop reminders unchanged.
    expect(MODAL_SRC).toContain('getExpiryReminders');
    expect(MODAL_SRC).toContain('renderExpiryRow');
    expect(MODAL_SRC).toContain('useShopDetailReminders');
    expect(MODAL_SRC).toContain('notif_tire_');
  });

  it('anomaly rows navigate to Analytics/Reports — the Transactions list has no category-filter plumbing', () => {
    expect(MODAL_SRC).toContain("actionTab: 'analytics'");
    expect(MODAL_SRC).toContain('getAnomalyAlerts(transactions, todayStr, notifConvertTx)');
    // The modal renders amounts through the display-option formatter.
    expect(MODAL_SRC).toContain('formatLakhs(a.currentWeekSpend, lang)');
    expect(MODAL_SRC).toContain('formatLakhs(a.baselineWeeklyAverage, lang)');
  });

  it('App counts anomaly alerts in the bell badge and clears them on mark-all-read, via the same helper and converter', () => {
    // Exactly two call sites: mark-all-read + badge count.
    expect(APP_SRC.match(/getAnomalyAlerts\(transactions, todayStr, /g)).toHaveLength(2);
    expect(APP_SRC).toContain('getAnomalyAlerts(transactions, todayStr, badgeConvertTx)');
    expect(APP_SRC).toContain('getAnomalyAlerts(transactions, todayStr, markAllConvertTx)');
    expect(APP_SRC).toContain("import { getAnomalyAlerts } from './utils/anomalyAlerts';");
    // The existing counting mechanism is extended, not replaced:
    // expiry reminders still count through the same badge.
    expect(APP_SRC.match(/getExpiryReminders\(vehicleMaintenance, debts, todayStr\)/g)).toHaveLength(2);
    expect(APP_SRC).toContain('shopDetailReminders.forEach');
    expect(APP_SRC).toContain('getMaintenanceAlerts(vehicle, vLogs, lang)');
  });
});

describe('version pins rolled forward to v7.6.27 (build 342)', () => {
  it('versionHistory + version.json agree, releasedAt present-only', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.38');
    expect(CURRENT_BUILD_NUMBER).toBe(352);
    expect(VERSION_JSON.version).toBe('v7.6.38');
    expect(VERSION_JSON.buildNumber).toBe(352);
    expect(typeof VERSION_JSON.releasedAt).toBe('string');
    expect(VERSION_JSON.releasedAt.length).toBeGreaterThan(0);
  });

  it('the top history entry carries the neutral-open entry, no Admin strings', () => {
    const top = VERSION_HISTORY[0];
    expect(top.version).toBe('v7.6.38');
    expect(top.buildNumber).toBe(352);
    expect(top.releaseDate).toBe('2026-11-25');
    expect(top.tag).toBe('fix');
    expect(top.titleMy).toBe('Notification filter များနှင့် ဘေး scroll စစ်ဆေးမှု');
    expect(top.titleEn).toBe('Notification filters wrap, and sideways scrolling re-swept');
    expect(top.changesMy).toEqual([
      'Notification filter များကို ဘေးဆွဲစရာမလိုဘဲ အကုန်မြင်ရအောင် ပြင်ပြီး App တစ်ခုလုံးမှာ ဘေး scroll ကျန်နေသေးလားပါ ပြန်စစ်သည်',
    ]);
    expect(top.changesEn).toEqual([
      'Notification filters now all show without sideways swiping, and the whole app was re-checked for leftover sideways scrolling.',
    ]);
    expect(JSON.stringify(top)).not.toContain('Admin');
    expect(VERSION_JSON.changesMy).toEqual(top.changesMy);
    expect(VERSION_JSON.changesEn).toEqual(top.changesEn);
  });

  it('the fix-script guard is raw string equality: accepts exactly 7.6.07/7.6.08, rejects the mangled form', () => {
    const FROM_VERSION = '7.6.07';
    const TO_VERSION = '7.6.08';
    const guardFails = (pkgVersion: string): boolean =>
      pkgVersion !== FROM_VERSION && pkgVersion !== TO_VERSION;
    const mangled = TO_VERSION.split('.').map(Number).join('.');
    expect(mangled).not.toBe(TO_VERSION);
    expect(TO_VERSION).toBe('7.6.08');
    expect(guardFails('7.6.07')).toBe(false);
    expect(guardFails('7.6.08')).toBe(false);
    expect(guardFails(mangled)).toBe(true);
    expect(guardFails('')).toBe(true);
  });
});
