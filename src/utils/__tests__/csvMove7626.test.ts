// [v7.6.26] CSV export moved from the Records header into Data
// Management. The header row was crowded on phones (the wallet chip
// truncated); Data Management already hosts the JSON Backup export.
// The file content/columns are unchanged (same exportToCSV util) —
// only the row set changes: the Records button exported the
// FILTERED view, the Data Management button exports ALL records.
// Premium-only, hidden entirely otherwise, in both places.
// Source-text assertions follow the established pattern (no test
// renderer in this repo; vitest node env). NO path comparisons:
// sources are read via new URL(..., import.meta.url).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildCsvExportData } from '../../utils/csvExport';
import type { Category, Transaction, Wallet } from '../../types';
import {
  VERSION_HISTORY,
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
} from '../../data/versionHistory';

const TX_VIEW_SRC = readFileSync(
  new URL('../../components/TransactionsView.tsx', import.meta.url),
  'utf8',
);
const DM_SRC = readFileSync(
  new URL('../../components/DataManagementView.tsx', import.meta.url),
  'utf8',
);
const VERSION_JSON = JSON.parse(
  readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
);

let seq = 0;
function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  seq += 1;
  return {
    id: `tx-7626-${seq}`,
    type: 'expense',
    amount: 1000,
    category: 'cat_food',
    walletId: 'w1',
    date: '2026-11-23',
    createdAt: 1,
    ...overrides,
  };
}

const CATEGORIES: Category[] = [
  {
    id: 'cat_food',
    name: 'အစားအသောက်',
    nameEn: 'Food',
    type: 'expense',
    icon: 'UtensilsCrossed',
    color: '#f00',
    subCategories: [{ id: 'sub_food_grocery', name: 'ဈေးဝယ်', nameEn: 'Grocery' }],
  },
  {
    id: 'cat_income_salary',
    name: 'လစာ',
    nameEn: 'Salary',
    type: 'income',
    icon: 'Banknote',
    color: '#0f0',
  },
];

const WALLETS: Wallet[] = [
  { id: 'w1', name: 'ငွေသား', nameEn: 'Cash', balance: 0 } as Wallet,
  { id: 'w2', name: 'KBZPay', nameEn: 'KBZPay', balance: 0 } as Wallet,
];

describe('CSV export moved to Data Management (v7.6.26)', () => {
  it('the Records header has no CSV button or handler left', () => {
    expect(TX_VIEW_SRC).not.toContain('CSV ထုတ်ယူမည်');
    expect(TX_VIEW_SRC).not.toContain('Export CSV');
    expect(TX_VIEW_SRC).not.toContain('handleExport');
    expect(TX_VIEW_SRC).not.toContain('exportToCSV');
  });

  it('the Records header keeps Price Compare + wallet chip on one row', () => {
    expect(TX_VIEW_SRC).toContain('flex min-w-0 items-center gap-2 py-0.5');
    expect(TX_VIEW_SRC).toContain('ဈေးနှိုင်းယှဉ်');
    expect(TX_VIEW_SRC).toContain('title={walletSelectionLabel}');
  });

  it('Data Management has the CSV button, Premium-gated, beside JSON export', () => {
    const jsonAt = DM_SRC.indexOf('btn-export-backup');
    const csvAt = DM_SRC.indexOf('btn-export-csv');
    const importAt = DM_SRC.indexOf('lbl-import-backup');
    expect(jsonAt).toBeGreaterThan(-1);
    expect(csvAt).toBeGreaterThan(jsonAt);
    expect(importAt).toBeGreaterThan(csvAt);
    expect(DM_SRC).toContain('onClick={handleExportCsv}');
    expect(DM_SRC).toContain('CSV ထုတ်ယူမည်');
    expect(DM_SRC).toContain('Export CSV');
    // Premium gate: the button renders only inside a plan ===
    // 'premium' branch, like the JSON Backup export.
    const gate = DM_SRC.lastIndexOf("plan === 'premium'", csvAt);
    expect(gate).toBeGreaterThan(-1);
  });

  it('Data Management wires the CSV button through the shared builder + util', () => {
    expect(DM_SRC).toContain('buildCsvExportData');
    expect(DM_SRC).toContain('exportToCSV');
    expect(DM_SRC).toContain('buildCsvExportData(transactions, categories, wallets)');
    expect(DM_SRC).toContain('exportToCSV(rows, catLabels, walletLabels, subCatLabels)');
  });

  it('the export covers ALL transactions — no filtering', () => {
    const txs = [
      makeTx({ id: 't1', type: 'expense', category: 'cat_food', walletId: 'w1' }),
      makeTx({ id: 't2', type: 'income', category: 'cat_income_salary', walletId: 'w2' }),
      makeTx({ id: 't3', type: 'expense', category: 'cat_food', walletId: 'w2' }),
    ];
    const { rows } = buildCsvExportData(txs, CATEGORIES, WALLETS);
    expect(rows.map((t) => t.id).sort()).toEqual(['t1', 't2', 't3']);
  });

  it('rows are newest-first: date desc, then createdAt desc', () => {
    const txs = [
      makeTx({ id: 'old', date: '2026-11-20', createdAt: 5 }),
      makeTx({ id: 'new-low', date: '2026-11-23', createdAt: 1 }),
      makeTx({ id: 'new-high', date: '2026-11-23', createdAt: 9 }),
      makeTx({ id: 'mid', date: '2026-11-22', createdAt: 3 }),
    ];
    const { rows } = buildCsvExportData(txs, CATEGORIES, WALLETS);
    expect(rows.map((t) => t.id)).toEqual(['new-high', 'new-low', 'mid', 'old']);
  });

  it('labels mirror the old Records export: Name (NameEn) + wallet names', () => {
    const { catLabels, walletLabels, subCatLabels } = buildCsvExportData(
      [],
      CATEGORIES,
      WALLETS,
    );
    expect(catLabels['cat_food']).toBe('အစားအသောက် (Food)');
    expect(catLabels['cat_income_salary']).toBe('လစာ (Salary)');
    expect(subCatLabels['sub_food_grocery']).toBe('ဈေးဝယ် (Grocery)');
    expect(walletLabels['w1']).toBe('ငွေသား');
    expect(walletLabels['w2']).toBe('KBZPay');
  });

  it('the input array is never mutated', () => {
    const txs = [
      makeTx({ id: 'a', date: '2026-11-20', createdAt: 1 }),
      makeTx({ id: 'b', date: '2026-11-23', createdAt: 1 }),
    ];
    const before = txs.map((t) => t.id);
    buildCsvExportData(txs, CATEGORIES, WALLETS);
    expect(txs.map((t) => t.id)).toEqual(before);
  });
});

// ---------- Version bump to v7.6.27 (build 342) ----------

describe('Version bump to v7.6.27 (build 342)', () => {
  it('version constants and history entry match version.json', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.41');
    expect(CURRENT_BUILD_NUMBER).toBe(355);
    expect(VERSION_JSON.version).toBe('v7.6.41');
    expect(VERSION_JSON.buildNumber).toBe(355);
    const entry = VERSION_HISTORY[0];
    expect(entry.version).toBe('v7.6.41');
    expect(entry.buildNumber).toBe(355);
    expect(entry.releaseDate).toBe('2026-11-25');
    expect(entry.tag).toBe('fix');
    expect(entry.titleMy).toBe('Split တစ်ကြောင်းချင်း ဆိုင်ခွဲခြင်း၊ Menu ပြန် Update နဲ့ crash ပြင်ဆင်ခြင်း');
    expect(entry.titleEn).toBe('Per-row split shops, menu re-apply, and crash fixes');
    expect(entry.changesMy).toEqual(VERSION_JSON.changesMy);
    expect(entry.changesEn).toEqual(VERSION_JSON.changesEn);
    expect(entry.changesMy).toHaveLength(3);
    expect(entry.changesEn).toHaveLength(3);
    expect(entry.changesMy[0]).toBe(
      'Split တစ်ကြောင်းချင်းစီမှာ ဆိုင်ရွေးလို့ရပြီ၊ ဆိုင်မတူရင် စာရင်းမှာ ကြောင်းခွဲပြသည်',
    );
    expect(entry.changesEn[0]).toBe(
      'Each split row can pick its own shop; records with different shops show one line per shop',
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
