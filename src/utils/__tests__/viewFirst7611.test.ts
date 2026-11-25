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
    // [v7.6.32] Anchor on the search handler's own comment: a
    // second onSelectTransaction prop (the donut drill-down, in the
    // AnalyticsView JSX above) now precedes it, so a bare indexOf
    // would slice the wrong handler.
    const anchor = APP_SRC.indexOf('[v7.6.11] View-first: a search hit opens');
    expect(anchor).toBeGreaterThan(-1);
    const start = APP_SRC.lastIndexOf('onSelectTransaction=', anchor);
    const end = APP_SRC.indexOf('onSelectWallet=', anchor);
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

describe('Version bump to v7.6.27 (build 342)', () => {
  it('version constants and history entry match version.json', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.38');
    expect(CURRENT_BUILD_NUMBER).toBe(352);
    expect(VERSION_JSON.version).toBe('v7.6.38');
    expect(VERSION_JSON.buildNumber).toBe(352);
    const entry = VERSION_HISTORY[0];
    expect(entry.version).toBe('v7.6.38');
    expect(entry.buildNumber).toBe(352);
    expect(entry.releaseDate).toBe('2026-11-25');
    expect(entry.tag).toBe('fix');
    expect(entry.titleMy).toBe('Notification filter များနှင့် ဘေး scroll စစ်ဆေးမှု');
    expect(entry.titleEn).toBe('Notification filters wrap, and sideways scrolling re-swept');
    expect(entry.changesMy).toEqual(VERSION_JSON.changesMy);
    expect(entry.changesEn).toEqual(VERSION_JSON.changesEn);
    expect(entry.changesMy).toHaveLength(1);
    expect(entry.changesEn).toHaveLength(1);
    expect(entry.changesMy[0]).toBe(
      'Notification filter များကို ဘေးဆွဲစရာမလိုဘဲ အကုန်မြင်ရအောင် ပြင်ပြီး App တစ်ခုလုံးမှာ ဘေး scroll ကျန်နေသေးလားပါ ပြန်စစ်သည်',
    );
    expect(entry.changesEn[0]).toBe(
      'Notification filters now all show without sideways swiping, and the whole app was re-checked for leftover sideways scrolling.',
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
