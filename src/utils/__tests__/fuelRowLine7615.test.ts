// [v7.6.15] Fuel line on Records rows + detail view, fuel-guide
// close fix, neutral-form category icon/color. A fuel record's type /
// litres / station live on the linked FuelLog, so the Records list
// never showed them. The join is FuelLog.transactionId ===
// transaction id — the same join the entry form and save handlers
// already use; matching by date / amount / vehicle is never done.
// The guide used to close the whole entry form because it renders
// inside the form backdrop's onClick={onClose} div with no
// stopPropagation. The neutral form's category tile used to wear the
// fallback category's icon/color while the text showed the empty
// placeholder. Source-text assertions (same pattern as
// vehicleNeutralOpen7614.test.ts) — the components have no test
// renderer in this repo (vitest node env, no testing-library). NO
// path comparisons in this file: sources are read via
// new URL(..., import.meta.url).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  formatFuelRowLine,
  findFuelLogForTransaction,
} from '../../utils/fuelRowLine';
import type { FuelLog } from '../../types';
import {
  VERSION_HISTORY,
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
} from '../../data/versionHistory';

const TX_VIEW_SRC = readFileSync(
  new URL('../../components/TransactionsView.tsx', import.meta.url),
  'utf8',
);
const DETAIL_SRC = readFileSync(
  new URL('../../components/TransactionDetailModal.tsx', import.meta.url),
  'utf8',
);
const APP_SRC = readFileSync(new URL('../../App.tsx', import.meta.url), 'utf8');
const MODAL_SRC = readFileSync(
  new URL('../../components/TransactionModal.tsx', import.meta.url),
  'utf8',
);
const GUIDE_SRC = readFileSync(
  new URL('../../components/vehicles/FuelExpenseGuideModal.tsx', import.meta.url),
  'utf8',
);
const HELPER_SRC = readFileSync(
  new URL('../../utils/fuelRowLine.ts', import.meta.url),
  'utf8',
);
const VERSION_JSON = JSON.parse(
  readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
);

function makeLog(overrides: Partial<FuelLog> = {}): FuelLog {
  return {
    id: 'fuel1',
    vehicleId: 'veh1',
    date: '2026-11-22',
    odometer: 12000,
    liters: 10,
    pricePerLiter: 3000,
    totalCost: 30000,
    isFullTank: false,
    fuelType: 'Octane 92',
    gasStation: 'Denko',
    syncToExpense: true,
    transactionId: 'tx1',
    walletId: 'w1',
    userId: 'guest',
    createdAt: 1763860000000,
    ...overrides,
  };
}

describe('fuel row line format (v7.6.15)', () => {
  it('shows fuel type, litres and station in the approved shape', () => {
    expect(formatFuelRowLine(makeLog())).toBe('Octane 92 · 10 လီတာ · Denko');
  });

  it('omits a missing station gracefully, with no trailing separator', () => {
    expect(formatFuelRowLine(makeLog({ gasStation: undefined }))).toBe(
      'Octane 92 · 10 လီတာ',
    );
    expect(formatFuelRowLine(makeLog({ gasStation: '   ' }))).toBe(
      'Octane 92 · 10 လီတာ',
    );
  });

  it('omits a missing fuel type gracefully', () => {
    expect(formatFuelRowLine(makeLog({ fuelType: '' }))).toBe(
      '10 လီတာ · Denko',
    );
  });

  it('returns empty for no log, so unlinked records render unchanged', () => {
    expect(formatFuelRowLine(null)).toBe('');
    expect(formatFuelRowLine(undefined)).toBe('');
  });

  it('renders litres verbatim like the VehiclesView fuel-history rows (no commas, no rounding)', () => {
    // VehiclesView renders {log.liters} raw: 1000 stays "1000", 10.5
    // stays "10.5" — never "1,000" or "10.50".
    expect(formatFuelRowLine(makeLog({ liters: 1000, gasStation: undefined, fuelType: '' }))).toBe(
      '1000 လီတာ',
    );
    expect(formatFuelRowLine(makeLog({ liters: 10.5, gasStation: undefined, fuelType: '' }))).toBe(
      '10.5 လီတာ',
    );
    expect(formatFuelRowLine(makeLog({ liters: 0, gasStation: undefined, fuelType: '' }))).toBe(
      '0 လီတာ',
    );
  });

  it('shows fuel type and station exactly as stored', () => {
    expect(
      formatFuelRowLine(makeLog({ fuelType: 'Diesel', gasStation: 'Max Energy' })),
    ).toBe('Diesel · 10 လီတာ · Max Energy');
  });
});

describe('transaction to fuel-log join (v7.6.15)', () => {
  it('finds the log by transactionId', () => {
    const logs = [makeLog({ id: 'fuelA', transactionId: 'txA' }), makeLog({ id: 'fuelB', transactionId: 'txB' })];
    expect(findFuelLogForTransaction(logs, 'txB')).toBe(logs[1]);
    expect(findFuelLogForTransaction(logs, 'tx-missing')).toBeUndefined();
  });

  it('returns undefined for an empty or missing log list', () => {
    expect(findFuelLogForTransaction([], 'tx1')).toBeUndefined();
    expect(findFuelLogForTransaction(undefined, 'tx1')).toBeUndefined();
  });

  it('never matches by date, amount or vehicle — only by transactionId', () => {
    // Same vehicle, same date, same cost, different transaction: the
    // old code had no join at all; a date/amount match would wrongly
    // attach this log to the other record.
    const decoy = makeLog({ id: 'fuelX', transactionId: 'tx-other' });
    expect(findFuelLogForTransaction([decoy], 'tx1')).toBeUndefined();
    expect(HELPER_SRC).toContain('f.transactionId === transactionId');
    expect(HELPER_SRC).not.toContain('.date');
    expect(HELPER_SRC).not.toContain('totalCost');
  });
});

describe('Records row shows the fuel line for linked records only (v7.6.15)', () => {
  it('the list receives fuelLogs and joins each row by transactionId', () => {
    expect(TX_VIEW_SRC).toContain('fuelLogs?: FuelLog[]');
    expect(TX_VIEW_SRC).toContain('findFuelLogForTransaction(fuelLogs, t.id)');
    expect(TX_VIEW_SRC).toContain('formatFuelRowLine(linkedFuelLog)');
  });

  it('the fuel line renders in Line 3 and creates Line 3 when it is the only content', () => {
    expect(TX_VIEW_SRC).toContain('{isFirstLine && fuelLine && (');
    expect(TX_VIEW_SRC).toContain('{fuelLine}');
    const start = TX_VIEW_SRC.indexOf('const hasLine3Content');
    const block = TX_VIEW_SRC.slice(start, TX_VIEW_SRC.indexOf(');', start));
    expect(block).toContain('fuelLine');
  });

  it('the fuel line is data, not a note: it is never suppressed by note comparisons', () => {
    // The v7.6.02 noteRepeatsItemName suppression applies to the
    // quoted note span only; the fuel line renders regardless of
    // what the note text says.
    expect(TX_VIEW_SRC).toContain('noteRepeatsItemName');
    const fuelSpan = TX_VIEW_SRC.slice(
      TX_VIEW_SRC.indexOf('{isFirstLine && fuelLine && ('),
      TX_VIEW_SRC.indexOf('{isFirstLine && fuelLine && (') + 400,
    );
    expect(fuelSpan).not.toContain('noteRepeatsItemName');
  });

  it('App passes the fuel logs into the Records list', () => {
    expect(APP_SRC).toContain('fuelLogs={fuelLogs}');
  });
});

describe('detail view shows the same fuel summary (v7.6.15)', () => {
  it('the view takes the linked log and renders the one-line summary', () => {
    expect(DETAIL_SRC).toContain('fuelLog?: FuelLog | null');
    expect(DETAIL_SRC).toContain('formatFuelRowLine(fuelLog)');
    expect(DETAIL_SRC).toContain("{lang === 'my' ? 'ဆီ:' : 'Fuel:'}");
    expect(DETAIL_SRC).toContain('{fuelLine}');
  });

  it('the bare litres row is kept for records with no linked log, and never doubled when a log is linked', () => {
    expect(DETAIL_SRC).toContain('!fuelLine && tx.fuelLiters != null');
    expect(DETAIL_SRC).toContain('{tx.fuelLiters}');
  });

  it('both view callers thread the linked log the same way', () => {
    expect(TX_VIEW_SRC).toContain(
      'fuelLog={viewingTx ? findFuelLogForTransaction(fuelLogs, viewingTx.id) : undefined}',
    );
    expect(APP_SRC).toContain(
      'fuelLog={viewingTransaction ? findFuelLogForTransaction(fuelLogs, viewingTransaction.id) : undefined}',
    );
  });

  it('the view stays read-only: no editable inputs were added', () => {
    expect(DETAIL_SRC).not.toContain('<input');
    expect(DETAIL_SRC).not.toContain('<select');
    expect(DETAIL_SRC).not.toContain('<textarea');
  });
});

describe('fuel guide close no longer closes the entry form (v7.6.15)', () => {
  it('the guide container stops clicks bubbling to the form backdrop', () => {
    expect(GUIDE_SRC).toContain('onClick={(e) => e.stopPropagation()}');
    expect(GUIDE_SRC).toContain('stopPropagation');
  });

  it('the guide X and footer buttons still close only the guide', () => {
    // Count code occurrences only: the [v7.6.15] comment above the
    // container names onClick={onClose} in prose, which must not be
    // counted as a handler.
    const code = GUIDE_SRC.split('\n')
      .filter((l) => !l.trim().startsWith('//'))
      .join('\n');
    const closes = code.match(/onClick=\{onClose\}/g) || [];
    expect(closes.length).toBe(2);
  });

  it('the entry-form backdrop close itself is untouched', () => {
    expect(MODAL_SRC).toContain(
      '<div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-3 sm:p-4" onClick={onClose}>',
    );
  });
});

describe('neutral form category icon and color (v7.6.15)', () => {
  it('the category row icon/color come from the explicitly picked category only', () => {
    expect(MODAL_SRC).toContain(
      'style={{ backgroundColor: explicitCatObj?.color || "#94A3B8" }}',
    );
    expect(MODAL_SRC).toContain(
      'CategoryIcon name={explicitCatObj?.icon || "Tag"}',
    );
  });

  it('the fallback category no longer paints the row icon/color', () => {
    expect(MODAL_SRC).not.toContain('selectedCatObj?.color');
    expect(MODAL_SRC).not.toContain('selectedCatObj?.icon');
  });

  it('selectedCatObj and its fallback are preserved for their other consumers', () => {
    expect(MODAL_SRC).toContain(
      'const selectedCatObj = categories.find((c) => c.id === (categoryId || effectiveCategoryId));',
    );
    expect(MODAL_SRC).toContain(
      'const explicitCatObj = categoryId ? categories.find((c) => c.id === categoryId) : undefined;',
    );
    expect(MODAL_SRC).toContain('effectiveCategoryId');
  });
});

describe('Version bump to v7.6.27 (build 342)', () => {
  it('version constants and history entry match version.json', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.46');
    expect(CURRENT_BUILD_NUMBER).toBe(360);
    expect(VERSION_JSON.version).toBe('v7.6.46');
    expect(VERSION_JSON.buildNumber).toBe(360);
    const entry = VERSION_HISTORY[0];
    expect(entry.version).toBe('v7.6.46');
    expect(entry.buildNumber).toBe(360);
    expect(entry.releaseDate).toBe('2026-11-25');
    expect(entry.tag).toBe('feature');
    expect(entry.titleMy).toBe('မှတ်တမ်းပြက္ခဒိန်၊ လက်ကျန်အရောင်၊ Menu ခလုတ်နှင့် Dashboard ပြင်ဆင်ချက်များ');
    expect(entry.titleEn).toBe('Records calendar, balance colours, menu button and Dashboard fixes');
    expect(entry.changesMy).toEqual(VERSION_JSON.changesMy);
    expect(entry.changesEn).toEqual(VERSION_JSON.changesEn);
    expect(entry.changesMy).toHaveLength(7);
    expect(entry.changesEn).toHaveLength(7);
    expect(entry.changesMy[0]).toBe(
      'မှတ်တမ်းပြက္ခဒိန်မှာ ဝင်/ထွက် နဲ့အတူ ကျန်ငွေ (Net) ကိုပါ တစ်နေ့ချင်းစီ ပြပေးပါပြီ',
    );
    expect(entry.changesEn[0]).toBe(
      'The Records calendar now shows the net balance for each day alongside in/out',
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
    expect(CURRENT_APP_VERSION).not.toBe('v7.6.30'.replace(/0$/, ''));
    expect(VERSION_JSON.version).not.toBe('v7.6.30'.replace(/0$/, ''));
  });

  it('the fix-script guard is raw string equality: accepts exactly 7.6.25/7.6.26, rejects the mangled form', () => {
    const FROM_VERSION = '7.6.30';
    const TO_VERSION = '7.6.30';
    const guardFails = (pkgVersion: string): boolean =>
      pkgVersion !== FROM_VERSION && pkgVersion !== TO_VERSION;
    // The mangled form is built from TO_VERSION, never written as a
    // literal, so the shipped identity can never be confused with
    // it by a grep or by the guard.
    const mangled = TO_VERSION.replace(/0$/, '');
    expect(mangled).not.toBe(TO_VERSION);
    expect(TO_VERSION).toBe('7.6.30');
    expect(guardFails('7.6.30')).toBe(false);
    expect(guardFails('7.6.30')).toBe(false);
    expect(guardFails(mangled)).toBe(true);
    expect(guardFails('')).toBe(true);
  });
});
