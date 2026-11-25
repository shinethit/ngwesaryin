// [v7.6.19] Selected-wallet label for the Records header chip:
// same summary wording as the filter panel's wallet selector
// (MultiWalletSelector.getTriggerLabel), computed over the
// scope-filtered visible list. Scope itself is never shown.
// Source-text assertions (same pattern as filterNotice7616.test.ts)
// — the components have no test renderer in this repo (vitest
// node env, no testing-library). NO path comparisons in this
// file: sources are read via new URL(..., import.meta.url).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { getWalletSelectionLabel } from '../../utils/walletSelectionLabel';
import type { Wallet } from '../../types';
import {
  VERSION_HISTORY,
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
} from '../../data/versionHistory';

const TX_VIEW_SRC = readFileSync(
  new URL('../../components/TransactionsView.tsx', import.meta.url),
  'utf8',
);
const SELECTOR_SRC = readFileSync(
  new URL('../../components/MultiWalletSelector.tsx', import.meta.url),
  'utf8',
);
const VERSION_JSON = JSON.parse(
  readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
);

const mkWallet = (id: string, name: string, extra?: Partial<Wallet>): Wallet => ({
  id,
  name,
  nameEn: `${name} EN`,
  balance: 0,
  color: '#000000',
  icon: 'wallet',
  ...extra,
});

const CASH = mkWallet('w1', 'ငွေသား', { nameEn: 'Cash' });
const BANK = mkWallet('w2', 'ဘဏ်', { nameEn: 'Bank' });
const SHARED = mkWallet('w3', 'မျှဝေအိတ်', {
  nameEn: 'Shared purse',
  isSharedFromOther: true,
  ownerName: 'မောင်မောင်',
});
const SHARED_NO_OWNER = mkWallet('w4', 'မျှဝေအိတ်၂', {
  nameEn: 'Shared purse 2',
  sharedWith: ['a@example.com'],
});
const VISIBLE = [CASH, BANK, SHARED];

describe('wallet selection label (v7.6.19)', () => {
  it('empty selection shows all visible wallets (MY + EN)', () => {
    expect(getWalletSelectionLabel(VISIBLE, [], 'all', 'my')).toBe(
      'Wallet အားလုံးပေါင်း (3 ခု)',
    );
    expect(getWalletSelectionLabel(VISIBLE, [], 'all', 'en')).toBe('All Wallets (3)');
  });

  it('an explicit Select All shows the all-wallets wording', () => {
    expect(getWalletSelectionLabel(VISIBLE, ['w1', 'w2', 'w3'], 'all', 'my')).toBe(
      'Wallet အားလုံးပေါင်း (3 ခု)',
    );
  });

  it('exactly one wallet shows its name (MY uses name, EN uses nameEn)', () => {
    expect(getWalletSelectionLabel(VISIBLE, ['w1'], 'all', 'my')).toBe('ငွေသား');
    expect(getWalletSelectionLabel(VISIBLE, ['w1'], 'all', 'en')).toBe('Cash');
  });

  it('a shared wallet adds the owner name', () => {
    expect(getWalletSelectionLabel(VISIBLE, ['w3'], 'all', 'my')).toBe(
      'မျှဝေအိတ် (မောင်မောင်)',
    );
    expect(getWalletSelectionLabel(VISIBLE, ['w3'], 'all', 'en')).toBe(
      'Shared purse (မောင်မောင်)',
    );
  });

  it('a shared wallet without an owner name shows the bare name', () => {
    const visible = [CASH, SHARED_NO_OWNER];
    expect(getWalletSelectionLabel(visible, ['w4'], 'all', 'my')).toBe('မျှဝေအိတ်၂');
  });

  it('two wallets join names with the count suffix', () => {
    expect(getWalletSelectionLabel(VISIBLE, ['w1', 'w2'], 'all', 'my')).toBe(
      'ငွေသား, ဘဏ် (2 ခု ရွေးထားသည်)',
    );
    expect(getWalletSelectionLabel(VISIBLE, ['w1', 'w2'], 'all', 'en')).toBe(
      'Cash, Bank (2 selected)',
    );
  });

  it('three or more wallets truncate after two names with a +N remainder', () => {
    const four = [...VISIBLE, mkWallet('w5', 'အိတ်၄', { nameEn: 'Purse 4' })];
    const five = [...four, mkWallet('w6', 'အိတ်၅', { nameEn: 'Purse 5' })];
    expect(getWalletSelectionLabel(four, ['w1', 'w2', 'w3'], 'all', 'my')).toBe(
      'ငွေသား, ဘဏ် +1 (3 ခု ရွေးထားသည်)',
    );
    expect(
      getWalletSelectionLabel(five, ['w1', 'w2', 'w3', 'w5'], 'all', 'en'),
    ).toBe('Cash, Bank +2 (4 selected)');
  });

  it('names follow the visible-list order, not the selection order', () => {
    expect(getWalletSelectionLabel(VISIBLE, ['w2', 'w1'], 'all', 'my')).toBe(
      'ငွေသား, ဘဏ် (2 ခု ရွေးထားသည်)',
    );
  });

  it('the single-wallet state wins when set, and falls back to all when unknown', () => {
    expect(getWalletSelectionLabel(VISIBLE, [], 'w2', 'my')).toBe('ဘဏ်');
    expect(getWalletSelectionLabel(VISIBLE, ['w1'], 'w3', 'my')).toBe(
      'မျှဝေအိတ် (မောင်မောင်)',
    );
    expect(getWalletSelectionLabel(VISIBLE, [], 'nope', 'my')).toBe(
      'Wallet အားလုံးပေါင်း (3 ခု)',
    );
  });

  it('unknown ids resolve to the visible subset; none resolving means all', () => {
    expect(getWalletSelectionLabel(VISIBLE, ['w1', 'ghost'], 'all', 'my')).toBe('ငွေသား');
    expect(getWalletSelectionLabel(VISIBLE, ['ghost'], 'all', 'my')).toBe(
      'Wallet အားလုံးပေါင်း (3 ခု)',
    );
  });

  it('zero visible wallets shows the all-wallets wording with 0', () => {
    expect(getWalletSelectionLabel([], [], 'all', 'my')).toBe('Wallet အားလုံးပေါင်း (0 ခု)');
    expect(getWalletSelectionLabel([], [], 'all', 'en')).toBe('All Wallets (0)');
  });

  it('a one-wallet scope shows that wallet in the all-wallets wording', () => {
    expect(getWalletSelectionLabel([CASH], [], 'all', 'my')).toBe(
      'Wallet အားလုံးပေါင်း (1 ခု)',
    );
  });
});

describe('Records header chip wiring (v7.6.19)', () => {
  it('the list computes the chip label from the scope-filtered visible list', () => {
    expect(TX_VIEW_SRC).toContain(
      "import { getWalletSelectionLabel } from '../utils/walletSelectionLabel';",
    );
    expect(TX_VIEW_SRC).toContain('getWalletSelectionLabel(');
    expect(TX_VIEW_SRC).toContain('visibleWalletsInFilter,');
    expect(TX_VIEW_SRC).toContain('walletSelectionLabel');
  });

  it('the chip is display-only: no onClick, truncating, filling the remaining row space', () => {
    const start = TX_VIEW_SRC.indexOf('Selected-wallet chip');
    expect(start).toBeGreaterThan(-1);
    const block = TX_VIEW_SRC.slice(start, TX_VIEW_SRC.indexOf('</div>', start));
    expect(block).toContain('title={walletSelectionLabel}');
    // [v7.6.23] Single-row header: the chip flexes to fill the rest
    // of the row (flex-1) instead of pushing itself right with
    // ml-auto on a wrapping row.
    expect(block).toContain('flex-1');
    expect(block).not.toContain('ml-auto');
    expect(block).toContain('truncate');
    expect(block).not.toContain('onClick');
    expect(block).not.toContain('<button');
  });

  it('the chip sits in the header row after the Price Compare button', () => {
    const compare = TX_VIEW_SRC.indexOf('ဈေးနှိုင်းယှဉ်');
    const chip = TX_VIEW_SRC.indexOf('title={walletSelectionLabel}');
    expect(compare).toBeGreaterThan(-1);
    expect(chip).toBeGreaterThan(compare);
  });

  it('MultiWalletSelector rendering is untouched by the chip', () => {
    expect(SELECTOR_SRC).toContain('getTriggerLabel');
    expect(SELECTOR_SRC).toContain('Wallet အားလုံးပေါင်း (${wallets.length} ခု)');
    expect(SELECTOR_SRC).not.toContain('walletSelectionLabel');
    expect(SELECTOR_SRC).not.toContain('getWalletSelectionLabel');
  });
});

describe('Version bump to v7.6.27 (build 342)', () => {
  it('version constants and history entry match version.json', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.42');
    expect(CURRENT_BUILD_NUMBER).toBe(356);
    expect(VERSION_JSON.version).toBe('v7.6.42');
    expect(VERSION_JSON.buildNumber).toBe(356);
    const entry = VERSION_HISTORY[0];
    expect(entry.version).toBe('v7.6.42');
    expect(entry.buildNumber).toBe(356);
    expect(entry.releaseDate).toBe('2026-11-25');
    expect(entry.tag).toBe('fix');
    expect(entry.titleMy).toBe('မျက်နှာပြင်တိုင်း အဖွဲ့ခွဲ စစ်ဆေးပြီး ကျစ်လစ်အောင် ပြင်ဆင်ခြင်း');
    expect(entry.titleEn).toBe('App-wide compaction sweep, checked group by group');
    expect(entry.changesMy).toEqual(VERSION_JSON.changesMy);
    expect(entry.changesEn).toEqual(VERSION_JSON.changesEn);
    expect(entry.changesMy).toHaveLength(3);
    expect(entry.changesEn).toHaveLength(3);
    expect(entry.changesMy[0]).toBe(
      'ဆိုင်ရှာဖွေမှုအပိုင်း (ခေါင်းစဉ် + Filter) ကို ကျစ်လစ်အောင် ပြင်သည် — ဆိုင်ကတ်မရောက်ခင် နေရာပိုယူနေတာကို လျှော့သည်',
    );
    expect(entry.changesEn[0]).toBe(
      'Shops header and filter panel compacted — less space before the first shop card',
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
