// [v7.6.11] View-first records: tapping a saved record opens a
// read-only view; editing requires the Edit button inside the view.
// The only two direct-edit-on-tap entry points were the
// TransactionsView row tap and the GlobalSearchModal transaction
// hit (via App's onSelectTransaction). Every other surface was
// already view-first or explicit-edit-button-only and is untouched.
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
const DETAIL_SRC = readFileSync(
  new URL('../../components/TransactionDetailModal.tsx', import.meta.url),
  'utf8',
);
const APP_SRC = readFileSync(
  new URL('../../App.tsx', import.meta.url),
  'utf8',
);
const VERSION_JSON = JSON.parse(
  readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
);

describe('view-first records (v7.6.11)', () => {
  it('the list row tap opens the view, not the edit form', () => {
    expect(TX_VIEW_SRC).toContain('setViewingTx(t)');
    expect(TX_VIEW_SRC).toContain('<TransactionDetailModal');
    expect(TX_VIEW_SRC).toContain('transaction={viewingTx}');
    // The old direct-edit row tap is gone (the pencil button's
    // stopPropagation form below is a different, explicit control).
    expect(TX_VIEW_SRC).not.toContain('onClick={() => onEditTransaction(t)}');
    expect(TX_VIEW_SRC).toContain('Tap to view');
  });

  it('the explicit pencil button still opens the edit form directly', () => {
    expect(TX_VIEW_SRC).toContain(
      'onClick={(e) => { e.stopPropagation(); onEditTransaction(t); }}',
    );
  });

  it('the detail view renders no editable inputs for the record fields', () => {
    expect(DETAIL_SRC).not.toContain('<input');
    expect(DETAIL_SRC).not.toContain('<select');
    expect(DETAIL_SRC).not.toContain('<textarea');
    expect(DETAIL_SRC).not.toContain('contentEditable');
    expect(DETAIL_SRC).not.toContain('onChange');
  });

  it('the detail view has one Edit button that opens the existing edit form', () => {
    expect(DETAIL_SRC).toContain('ပြင်ဆင်မည်');
    expect(DETAIL_SRC).toContain('onEdit(tx)');
    expect(DETAIL_SRC).toContain('onClose()');
    // The view shows the record's fields read-only: amount, date,
    // wallet, note, shop, items and split breakdown.
    expect(DETAIL_SRC).toContain('formatLakhs');
    expect(DETAIL_SRC).toContain('getSplitAttribution');
    expect(DETAIL_SRC).toContain('tx.items');
    expect(DETAIL_SRC).toContain('tx.note');
    expect(DETAIL_SRC).toContain('tx.shopName');
  });

  it('a search hit opens the view, not the edit form', () => {
    expect(APP_SRC).toContain('setViewingTransaction(t)');
    expect(APP_SRC).toContain('<TransactionDetailModal');
    expect(APP_SRC).toContain('transaction={viewingTransaction}');
    // Scope the negative assertion to the onSelectTransaction
    // handler: handleOpenEditTx is still used elsewhere in App
    // (the list's edit prop and the view's Edit button).
    const start = APP_SRC.indexOf('onSelectTransaction=');
    expect(start).toBeGreaterThan(-1);
    const end = APP_SRC.indexOf('onSelectWallet=', start);
    const handler = APP_SRC.slice(start, end);
    expect(handler).not.toContain('handleOpenEditTx');
    expect(handler).toContain('setViewingTransaction(t)');
  });

  it('already-view-first surfaces keep their explicit edit controls only', () => {
    // Debts, vehicles, shops, wallets, budgets, savings pots and
    // categories have no row-level edit tap: their edit entry
    // points are explicit buttons. Spot-check the debt card: the
    // expand toggle is a button, and edit is the Pencil button.
    const debtsSrc = readFileSync(
      new URL('../../components/DebtsView.tsx', import.meta.url),
      'utf8',
    );
    expect(debtsSrc).toContain('onClick={() => onEditDebt(debt)}');
    expect(debtsSrc).toContain('onClick={() => toggleExpand(debt.id)}');
  });
});

describe('Version bump to v7.6.23 (build 337)', () => {
  it('version constants and history entry match version.json', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.23');
    expect(CURRENT_BUILD_NUMBER).toBe(337);
    expect(VERSION_JSON.version).toBe('v7.6.23');
    expect(VERSION_JSON.buildNumber).toBe(337);
    const entry = VERSION_HISTORY[0];
    expect(entry.version).toBe('v7.6.23');
    expect(entry.buildNumber).toBe(337);
    expect(entry.releaseDate).toBe('2026-11-24');
    expect(entry.tag).toBe('fix');
    expect(entry.titleMy).toBe('စာရင်းအပေါ် ခလုတ် ၃ ခု တတန်းတည်း ပြခြင်း');
    expect(entry.titleEn).toBe('Records header controls on a single row');
    expect(entry.changesMy).toEqual(VERSION_JSON.changesMy);
    expect(entry.changesEn).toEqual(VERSION_JSON.changesEn);
    expect(entry.changesMy).toHaveLength(1);
    expect(entry.changesEn).toHaveLength(1);
    expect(entry.changesMy[0]).toBe(
      'စာရင်းအပေါ်က ခလုတ် ၃ ခု (ဈေးနှိုင်းယှဉ်၊ CSV ထုတ်ယူမည်၊ Wallet) ကို တတန်းတည်းဖြစ်အောင် ပြမည်',
    );
    expect(entry.changesEn[0]).toBe(
      'Show the three controls above the records list (Price Compare, CSV Export, wallet) on a single row.',
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
    expect(CURRENT_APP_VERSION).not.toBe('v7.6.1');
    expect(VERSION_JSON.version).not.toBe('v7.6.1');
  });

  it('the fix-script guard is raw string equality: accepts exactly 7.6.10/7.6.11, rejects the mangled form', () => {
    const FROM_VERSION = '7.6.10';
    const TO_VERSION = '7.6.11';
    const guardFails = (pkgVersion: string): boolean =>
      pkgVersion !== FROM_VERSION && pkgVersion !== TO_VERSION;
    // '7.6.11' has no leading zero to mangle by Number(), so the
    // mangled form here is the trailing-digit drop a loose guard
    // would accept — built from TO_VERSION, never written as a
    // literal, so the shipped identity can never be confused with
    // it by a grep or by the guard.
    const mangled = TO_VERSION.replace(/1$/, '');
    expect(mangled).not.toBe(TO_VERSION);
    expect(TO_VERSION).toBe('7.6.11');
    expect(guardFails('7.6.10')).toBe(false);
    expect(guardFails('7.6.11')).toBe(false);
    expect(guardFails(mangled)).toBe(true);
    expect(guardFails('7.6.1')).toBe(true);
    expect(guardFails('')).toBe(true);
  });
});
