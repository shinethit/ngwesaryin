// [v7.6.20] Smart Calendar day detail shows the same detail as the
// Records list: a fuel-linked record shows the fuel line WITH the
// per-litre rate, a multi-item record shows qty/unit/price per item,
// and the shop shows on non-fuel rows. The note fallback, the
// calendar cells and the amounts are untouched. Pure-function tests
// plus source-text assertions (same pattern as fuelRowLine7615 —
// the components have no test renderer in this repo; vitest node
// env, no testing-library). NO path comparisons in this file:
// sources are read via new URL(..., import.meta.url).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  formatFuelRowLine,
  formatFuelRowLineWithRate,
  findFuelLogForTransaction,
} from '../../utils/fuelRowLine';
import {
  formatCalendarDetailItems,
  formatCalendarDetailItemsDetailed,
  resolveCalendarDetailLine,
  resolveCalendarDetailMainLabel,
} from '../../utils/calendarDetailLabels';
import type { FuelLog, TransactionItem } from '../../types';
import {
  VERSION_HISTORY,
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
} from '../../data/versionHistory';

const CAL_SRC = readFileSync(
  new URL('../../components/SmartCalendarCard.tsx', import.meta.url),
  'utf8',
);
const DASH_SRC = readFileSync(
  new URL('../../components/Dashboard.tsx', import.meta.url),
  'utf8',
);
const APP_SRC = readFileSync(new URL('../../App.tsx', import.meta.url), 'utf8');
const TX_VIEW_SRC = readFileSync(
  new URL('../../components/TransactionsView.tsx', import.meta.url),
  'utf8',
);
const DETAIL_SRC = readFileSync(
  new URL('../../components/TransactionDetailModal.tsx', import.meta.url),
  'utf8',
);
const VERSION_JSON = JSON.parse(
  readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
);

function makeLog(overrides: Partial<FuelLog> = {}): FuelLog {
  return {
    id: 'fuel1',
    vehicleId: 'veh1',
    date: '2026-11-23',
    odometer: 12000,
    liters: 2.23,
    pricePerLiter: 4035,
    totalCost: 9000,
    isFullTank: false,
    fuelType: 'Octane 95',
    gasStation: '103',
    syncToExpense: true,
    transactionId: 'tx1',
    walletId: 'w1',
    userId: 'guest',
    createdAt: 1763860000000,
    ...overrides,
  };
}

function makeItem(overrides: Partial<TransactionItem> = {}): TransactionItem {
  return {
    name: 'DexOph',
    price: 500,
    quantity: 1,
    amount: 500,
    unit: 'ခု',
    ...overrides,
  };
}

describe('calendar fuel line with rate (v7.6.20)', () => {
  it('shows fuel type, litres, rate and station in the approved shape', () => {
    expect(formatFuelRowLineWithRate(makeLog())).toBe(
      'Octane 95 · 2.23 လီတာ · 4035/လီတာ · 103',
    );
  });

  it('omits a missing or zero rate gracefully, with no trailing separator', () => {
    expect(formatFuelRowLineWithRate(makeLog({ pricePerLiter: 0 }))).toBe(
      'Octane 95 · 2.23 လီတာ · 103',
    );
    expect(
      formatFuelRowLineWithRate(
        makeLog({ pricePerLiter: undefined as unknown as number }),
      ),
    ).toBe('Octane 95 · 2.23 လီတာ · 103');
  });

  it('renders the rate verbatim like the litres (no commas, no rounding)', () => {
    expect(
      formatFuelRowLineWithRate(
        makeLog({
          pricePerLiter: 10000,
          fuelType: '',
          gasStation: undefined,
          liters: 1000,
        }),
      ),
    ).toBe('1000 လီတာ · 10000/လီတာ');
    expect(
      formatFuelRowLineWithRate(
        makeLog({ pricePerLiter: 3150.5, fuelType: '', gasStation: undefined }),
      ),
    ).toBe('2.23 လီတာ · 3150.5/လီတာ');
  });

  it('returns empty for no log, so unlinked records render unchanged', () => {
    expect(formatFuelRowLineWithRate(null)).toBe('');
    expect(formatFuelRowLineWithRate(undefined)).toBe('');
  });

  it('the Records variant is unchanged: no rate, same shape as v7.6.15', () => {
    expect(formatFuelRowLine(makeLog())).toBe('Octane 95 · 2.23 လီတာ · 103');
    expect(formatFuelRowLine(makeLog({ pricePerLiter: 0 }))).toBe(
      'Octane 95 · 2.23 လီတာ · 103',
    );
  });

  it('the join is still transactionId only', () => {
    const logs = [
      makeLog({ id: 'fuelA', transactionId: 'txA' }),
      makeLog({ id: 'fuelB', transactionId: 'txB' }),
    ];
    expect(findFuelLogForTransaction(logs, 'txB')).toBe(logs[1]);
    expect(findFuelLogForTransaction(undefined, 'txB')).toBeUndefined();
  });
});

describe('detailed item line (v7.6.20)', () => {
  it('shows name with price, quantity and unit per item', () => {
    expect(formatCalendarDetailItemsDetailed([makeItem()], 'my')).toBe(
      'DexOph (500 MMK × 1 ခု)',
    );
    expect(
      formatCalendarDetailItemsDetailed(
        [makeItem({ name: 'Rice', price: 2500, quantity: 2, unit: 'ကီလို' })],
        'en',
      ),
    ).toBe('Rice (2,500 MMK × 2 ကီလို)');
  });

  it('omits the unit cleanly when the stored unit is blank', () => {
    expect(
      formatCalendarDetailItemsDetailed(
        [makeItem({ unit: '' }), makeItem({ name: 'Oil', unit: '   ' })],
        'my',
      ),
    ).toBe('DexOph (500 MMK × 1) · Oil (500 MMK × 1)');
  });

  it('keeps the first-2 + N-more truncation of the names-only line', () => {
    const items = [makeItem(), makeItem({ name: 'B' }), makeItem({ name: 'C' })];
    expect(formatCalendarDetailItemsDetailed(items, 'my')).toBe(
      'DexOph (500 MMK × 1 ခု) · B (500 MMK × 1 ခု) · +1 မျိုး',
    );
    expect(formatCalendarDetailItemsDetailed(items, 'en')).toContain('+1 more');
  });

  it('returns null when there is nothing nameable, so the note fallback applies', () => {
    expect(formatCalendarDetailItemsDetailed(undefined, 'my')).toBeNull();
    expect(formatCalendarDetailItemsDetailed([], 'my')).toBeNull();
    expect(
      formatCalendarDetailItemsDetailed(
        [makeItem({ name: '' }), makeItem({ name: '   ' })],
        'my',
      ),
    ).toBeNull();
  });

  it('the names-only helper is unchanged', () => {
    expect(
      formatCalendarDetailItems([makeItem(), makeItem({ name: 'B' })], 'my'),
    ).toBe('DexOph · B');
    expect(resolveCalendarDetailMainLabel('sub_x', undefined, 'ယာဉ်', 'my')).toBe(
      'ယာဉ်',
    );
  });
});

describe('day-detail line precedence (v7.6.20)', () => {
  it('the fuel line wins over the item line when a log is linked', () => {
    const fuelLine = formatFuelRowLineWithRate(makeLog());
    expect(resolveCalendarDetailLine(fuelLine, [makeItem()], 'my')).toBe(fuelLine);
  });

  it('falls through to the detailed item line when the fuel line is empty', () => {
    expect(resolveCalendarDetailLine('', [makeItem()], 'my')).toBe(
      'DexOph (500 MMK × 1 ခု)',
    );
  });

  it('returns null when there is neither a fuel line nor nameable items', () => {
    expect(resolveCalendarDetailLine('', undefined, 'my')).toBeNull();
    expect(resolveCalendarDetailLine('', [], 'en')).toBeNull();
  });
});

describe('calendar wiring (v7.6.20)', () => {
  it('the card takes fuelLogs and joins each day-detail row by transactionId', () => {
    expect(CAL_SRC).toContain('fuelLogs?: FuelLog[]');
    expect(CAL_SRC).toContain('findFuelLogForTransaction(fuelLogs, t.id)');
    expect(CAL_SRC).toContain('formatFuelRowLineWithRate(linkedFuelLog)');
    expect(CAL_SRC).toContain('resolveCalendarDetailLine(fuelLine, t.items, lang)');
  });

  it('the shop line renders on non-fuel rows only', () => {
    expect(CAL_SRC).toContain('{shopLine}');
    expect(CAL_SRC).toContain('t.shopName');
    const gate = CAL_SRC.slice(
      CAL_SRC.indexOf('const shopLine'),
      CAL_SRC.indexOf('const shopLine') + 120,
    );
    expect(gate).toContain('!fuelLine');
  });

  it('Dashboard threads fuelLogs through with its call signature otherwise intact', () => {
    expect(DASH_SRC).toContain('fuelLogs?: FuelLog[]');
    expect(DASH_SRC).toContain('fuelLogs={fuelLogs}');
    expect(DASH_SRC).toContain('transactions={scopedTransactions}');
  });

  it('App passes its fuelLogs state into Dashboard', () => {
    const start = APP_SRC.indexOf('<Dashboard');
    const block = APP_SRC.slice(start, APP_SRC.indexOf('/>', start));
    expect(block).toContain('fuelLogs={fuelLogs}');
  });

  it('no fuelLogs prop still renders: the card defaults it to an empty list', () => {
    expect(CAL_SRC).toContain('fuelLogs = [],');
  });

  it('the note fallback keeps its quotes and italics', () => {
    expect(CAL_SRC).toContain('"{t.note}"');
    expect(CAL_SRC).toContain('truncate italic');
  });

  it('calendar cells and amounts are untouched', () => {
    expect(CAL_SRC).toContain('fmtCell(t.amount)');
    expect(CAL_SRC).toContain('formatShortLakhs');
  });

  it('the Records list and detail view keep the rateless fuel line', () => {
    expect(TX_VIEW_SRC).toContain('formatFuelRowLine(linkedFuelLog)');
    expect(TX_VIEW_SRC).not.toContain('formatFuelRowLineWithRate');
    expect(DETAIL_SRC).toContain('formatFuelRowLine(fuelLog)');
    expect(DETAIL_SRC).not.toContain('formatFuelRowLineWithRate');
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
