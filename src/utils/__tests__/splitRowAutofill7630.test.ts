// [v7.6.30] New split rows auto-fill the previous row's category +
// sub-category: adding a row copies the LAST row's categoryId and
// subCategoryId; amount/note always start empty; a blank last row
// (or no rows) yields a blank row. Pure-helper tests + wiring
// assertions (the repo pattern: components have no test renderer;
// layout behaviour is verified by renders). Source reads use
// `new URL` — NO path comparisons.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  defaultSplitRows,
  nextSplitRow,
  splitRowsFromTransaction,
  validateSplits,
  rowsToSplits,
  type SplitFormRow,
} from '../transactionSplits';
import type { Transaction } from '../../types';
import {
  VERSION_HISTORY,
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
} from '../../data/versionHistory';

const VERSION_JSON = JSON.parse(
  readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
);

const HELPER_SRC = readFileSync(new URL('../transactionSplits.ts', import.meta.url), 'utf8');
const TXMODAL_SRC = readFileSync(
  new URL('../../components/TransactionModal.tsx', import.meta.url),
  'utf8',
);

function row(categoryId: string, subCategoryId: string, amount = '', note = '', shopName = ''): SplitFormRow {
  return { categoryId, subCategoryId, amount, note, shopName };
}

describe('nextSplitRow auto-fill (v7.6.30)', () => {
  it('copies the last row category + sub-category', () => {
    const rows = [row('cat_food', 'sub_food_snack', '1000', 'chips'), row('cat_food', 'sub_food_snack', '500', '')];
    expect(nextSplitRow(rows)).toEqual(row('cat_food', 'sub_food_snack'));
  });

  it('copies from the LAST row, not the first', () => {
    const rows = [row('cat_food', 'sub_food_snack', '1000'), row('cat_bills', 'sub_bills_electric', '2000')];
    expect(nextSplitRow(rows)).toEqual(row('cat_bills', 'sub_bills_electric'));
  });

  it('copies category-only when the last row has no sub-category', () => {
    expect(nextSplitRow([row('cat_food', '', '1000')])).toEqual(row('cat_food', ''));
  });

  it('never copies amount or note', () => {
    const rows = [row('cat_food', 'sub_food_snack', '9999', 'do not copy me')];
    const next = nextSplitRow(rows);
    expect(next.amount).toBe('');
    expect(next.note).toBe('');
  });

  it('a blank last row yields a blank row', () => {
    expect(nextSplitRow([row('cat_food', 'sub_food_snack', '1000'), row('', '')])).toEqual(row('', ''));
  });

  it('no rows yields a blank row', () => {
    expect(nextSplitRow([])).toEqual(row('', ''));
  });

  it('does not mutate the input rows', () => {
    const rows = [row('cat_food', 'sub_food_snack', '1000', 'n')];
    const snapshot = JSON.stringify(rows);
    nextSplitRow(rows);
    expect(JSON.stringify(rows)).toBe(snapshot);
  });
});

describe('neighbours are unchanged (v7.6.30)', () => {
  it('defaultSplitRows still starts row 2 blank', () => {
    expect(defaultSplitRows('cat_food', 'sub_food_snack')).toEqual([
      row('cat_food', 'sub_food_snack'),
      row('', ''),
    ]);
  });

  it('splitRowsFromTransaction restores stored rows verbatim', () => {
    const tx = {
      splits: [
        { categoryId: 'cat_food', subCategoryId: 'sub_food_snack', amount: 1000 },
        { categoryId: 'cat_bills', amount: 2000, note: 'bill' },
      ],
    } as unknown as Transaction;
    expect(splitRowsFromTransaction(tx)).toEqual([
      row('cat_food', 'sub_food_snack', '1000'),
      row('cat_bills', '', '2000', 'bill'),
    ]);
  });

  it('an auto-filled row satisfies the category check; clearing it re-flags missing-category', () => {
    const filled = [row('cat_food', 'sub_food_snack', '1000'), nextSplitRow([row('cat_food', 'sub_food_snack', '1000')])];
    filled[1].amount = '500';
    expect(validateSplits(rowsToSplits(filled), 1500)).toBe(null);
    filled[1].categoryId = '';
    filled[1].subCategoryId = '';
    expect(validateSplits(rowsToSplits(filled), 1500)).toBe('missing-category');
  });
});

describe('addSplitRow wiring (v7.6.30)', () => {
  it('TransactionModal builds new rows via nextSplitRow', () => {
    expect(TXMODAL_SRC).toContain('nextSplitRow');
    expect(TXMODAL_SRC).toContain('setSplitRows((prev) => [...prev, nextSplitRow(prev)])');
  });

  it('the old empty-row literal is gone from addSplitRow', () => {
    expect(TXMODAL_SRC).not.toContain(
      "[...prev, { categoryId: '', subCategoryId: '', amount: '', note: '' }]",
    );
  });

  it('the v7.6.29 picker-hide gate is untouched', () => {
    expect(TXMODAL_SRC).toContain('{!(splitSectionVisible && splitEnabled) && (');
    expect(HELPER_SRC).toContain('export function nextSplitRow');
  });
});

describe('Version bump to v7.6.30 (build 344)', () => {
  it('version surfaces agree on v7.6.30 / build 344', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.51');
    expect(CURRENT_BUILD_NUMBER).toBe(365);
    expect(VERSION_JSON.version).toBe('v7.6.51');
    expect(VERSION_JSON.buildNumber).toBe(365);
    const entry = VERSION_HISTORY[0];
    expect(entry.version).toBe('v7.6.51');
    expect(entry.buildNumber).toBe(365);
    expect(entry.changesMy).toEqual(VERSION_JSON.changesMy);
    expect(entry.changesEn).toEqual(VERSION_JSON.changesEn);
    expect(entry.changesMy).toHaveLength(2);
    expect(entry.changesEn).toHaveLength(2);
    expect(entry.changesMy[0]).toBe(
      'ဘရောက်ဇာ extension တွေကြောင့် ပေါ်နေတဲ့ အမှားစာတစ်မျိုးကို ပြင်လိုက်ပါပြီ — အက်ပ်အလုပ်လုပ်ပုံ မပြောင်းပါ',
    );
    expect(entry.changesEn[0]).toBe(
      'Fixed one console error triggered by browser extensions — the app itself works exactly as before',
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

  it('the fix-script guard is raw string equality: accepts exactly 7.6.29/7.6.30, rejects the mangled form', () => {
    const FROM_VERSION = '7.6.29';
    const TO_VERSION = '7.6.30';
    const guardFails = (pkgVersion: string): boolean =>
      pkgVersion !== FROM_VERSION && pkgVersion !== TO_VERSION;
    // The mangled form is built from TO_VERSION, never written as a
    // literal, so the shipped identity can never be confused with
    // it by a grep or by the guard.
    const mangled = TO_VERSION.replace(/0$/, '');
    expect(mangled).not.toBe(TO_VERSION);
    expect(TO_VERSION).toBe('7.6.30');
    expect(guardFails('7.6.29')).toBe(false);
    expect(guardFails('7.6.30')).toBe(false);
    expect(guardFails(mangled)).toBe(true);
    expect(guardFails('7.6.3')).toBe(true);
    expect(guardFails('')).toBe(true);
  });
});
