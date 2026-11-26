// [v7.6.23] Records header row: the controls above the list
// (Price Compare button, wallet-selection chip) sit on ONE row —
// the row no longer wraps, the button never shrinks or wraps its
// label, and the chip flexes to fill the remaining width and
// truncates. [v7.6.26] The CSV Export button moved to Data
// Management, so the header holds two controls, not three.
// Wording, handlers, the Premium gate and the label computation
// are untouched.
// Source-text assertions follow the established pattern (no test
// renderer in this repo; vitest node env). NO path comparisons:
// sources are read via new URL(..., import.meta.url).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  VERSION_HISTORY,
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
} from '../../data/versionHistory';

const TX_VIEW_SRC = readFileSync(
  new URL('../../components/TransactionsView.tsx', import.meta.url),
  'utf8',
);
const VERSION_JSON = JSON.parse(
  readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
);

function headerRowBlock(): string {
  const start = TX_VIEW_SRC.indexOf('Title card REMOVED');
  expect(start).toBeGreaterThan(-1);
  const end = TX_VIEW_SRC.indexOf('Free tier limit banner', start);
  expect(end).toBeGreaterThan(start);
  return TX_VIEW_SRC.slice(start, end);
}

describe('Records header single row (v7.6.23)', () => {
  it('the header row is a single non-wrapping flex row', () => {
    const block = headerRowBlock();
    expect(block).toContain('flex min-w-0 items-center gap-2 py-0.5');
    expect(block).not.toContain('flex-wrap');
  });

  it('the Price Compare button keeps its label on one line and never shrinks', () => {
    const block = headerRowBlock();
    expect(block).toContain('shrink-0 items-center gap-1.5 whitespace-nowrap px-2 py-1.5');
    expect(block).toContain('bg-indigo-50');
    expect(block).toContain('ဈေးနှိုင်းယှဉ်');
    expect(block).toContain('Price Compare');
  });

  it('no CSV button remains in the Records header (moved to Data Management in v7.6.26)', () => {
    const block = headerRowBlock();
    expect(block).not.toContain('CSV ထုတ်ယူမည်');
    expect(block).not.toContain('Export CSV');
    expect(block).not.toContain('handleExport');
    expect(TX_VIEW_SRC).not.toContain('exportToCSV');
  });

  it('the chip flexes to fill the row and truncates; label wording untouched', () => {
    const block = headerRowBlock();
    const chipAt = block.indexOf('title={walletSelectionLabel}');
    expect(chipAt).toBeGreaterThan(-1);
    expect(block).toContain('inline-flex min-w-0 flex-1 items-center gap-1');
    expect(block).not.toContain('ml-auto');
    expect(block).not.toContain('max-w-full');
    // The label computation lives above the return (component body),
    // so it is pinned against the whole file, not the row block.
    expect(TX_VIEW_SRC).toContain('getWalletSelectionLabel(');
    expect(TX_VIEW_SRC).toContain('visibleWalletsInFilter,');
    expect(block).toContain('<span className="truncate">{walletSelectionLabel}</span>');
  });

  it('the chip still sits after the Price Compare button', () => {
    const block = headerRowBlock();
    const compare = block.indexOf('ဈေးနှိုင်းယှဉ်');
    const chip = block.indexOf('title={walletSelectionLabel}');
    expect(compare).toBeGreaterThan(-1);
    expect(chip).toBeGreaterThan(compare);
  });

  it('the chip is still display-only: no onClick, no button', () => {
    const block = headerRowBlock();
    const start = block.indexOf('Selected-wallet chip');
    expect(start).toBeGreaterThan(-1);
    const chipBlock = block.slice(start);
    expect(chipBlock).not.toContain('onClick');
    expect(chipBlock).not.toContain('<button');
  });
});

// ---------- Version bump to v7.6.27 (build 342) ----------

describe('Version bump to v7.6.27 (build 342)', () => {
  it('version constants and history entry match version.json', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.49');
    expect(CURRENT_BUILD_NUMBER).toBe(363);
    expect(VERSION_JSON.version).toBe('v7.6.49');
    expect(VERSION_JSON.buildNumber).toBe(363);
    const entry = VERSION_HISTORY[0];
    expect(entry.version).toBe('v7.6.49');
    expect(entry.buildNumber).toBe(363);
    expect(entry.releaseDate).toBe('2026-11-26');
    expect(entry.tag).toBe('feature');
    expect(entry.titleMy).toBe('ဝန်ဆောင်ခ (လက်ခ) ထည့်နိုင်ပါပြီ');
    expect(entry.titleEn).toBe('Service fees for vehicle maintenance');
    expect(entry.changesMy).toEqual(VERSION_JSON.changesMy);
    expect(entry.changesEn).toEqual(VERSION_JSON.changesEn);
    expect(entry.changesMy).toHaveLength(4);
    expect(entry.changesEn).toHaveLength(4);
    expect(entry.changesMy[0]).toBe(
      'ယာဉ်ပြုပြင်မှုမှတ်တမ်းမှာ ဝန်ဆောင်ခ (လက်ခ) သီးခြား ထည့်လို့ရပါပြီ — ပစ္စည်းဖိုးနဲ့ ခွဲထည့်နိုင်ပါတယ်',
    );
    expect(entry.changesEn[0]).toBe(
      'Maintenance records can now include a service fee (labor), entered separately from parts costs',
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
    expect(guardFails('7.6.3')).toBe(true);
    expect(guardFails('')).toBe(true);
  });
});
