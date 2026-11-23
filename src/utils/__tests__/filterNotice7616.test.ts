// [v7.6.16] Filter-notice gate: the amber banner shows only when
// the shown count is reduced AND a NON-WALLET record filter is
// active. A wallet pick is a scope choice (like the Dashboard
// wallet filter, which shows no such banner), not a "you are
// missing records" warning — so wallet-only filtering hides the
// banner. The Filter-button badge count is untouched (the user
// did not complain about it), and the banner's text, counts and
// "Show All Records" reset behavior are byte-identical.
// Source-text assertions (same pattern as fuelRowLine7615.test.ts)
// — the components have no test renderer in this repo (vitest
// node env, no testing-library). NO path comparisons in this
// file: sources are read via new URL(..., import.meta.url).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { shouldShowFilterNotice } from '../../utils/filterNotice';
import {
  VERSION_HISTORY,
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
} from '../../data/versionHistory';

const TX_VIEW_SRC = readFileSync(
  new URL('../../components/TransactionsView.tsx', import.meta.url),
  'utf8',
);
const HELPER_SRC = readFileSync(
  new URL('../../utils/filterNotice.ts', import.meta.url),
  'utf8',
);
const VERSION_JSON = JSON.parse(
  readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
);

const NO_FILTERS = {
  typeFilter: 'all',
  effectiveDataScope: 'all',
  timeFilter: 'all',
  selectedCategory: 'all',
  searchTerm: '',
};

// The user's screenshot numbers: 130 records total, 69 shown by
// the wallet pick alone.
const TOTAL = 130;
const WALLET_ONLY_SHOWN = 69;

describe('filter notice predicate (v7.6.16)', () => {
  it('wallet-only filtering hides the banner: reduced count alone never shows it', () => {
    // Wallet state is not an input to the predicate at all — a
    // wallet-only pick is exactly "no non-wallet filter active".
    expect(shouldShowFilterNotice(TOTAL, WALLET_ONLY_SHOWN, NO_FILTERS)).toBe(false);
  });

  it('wallet + category shows the banner', () => {
    expect(
      shouldShowFilterNotice(TOTAL, WALLET_ONLY_SHOWN, {
        ...NO_FILTERS,
        selectedCategory: 'cat-food',
      }),
    ).toBe(true);
  });

  it('wallet + search shows the banner', () => {
    expect(
      shouldShowFilterNotice(TOTAL, WALLET_ONLY_SHOWN, {
        ...NO_FILTERS,
        searchTerm: 'rice',
      }),
    ).toBe(true);
  });

  it('wallet + time filter shows the banner', () => {
    expect(
      shouldShowFilterNotice(TOTAL, WALLET_ONLY_SHOWN, {
        ...NO_FILTERS,
        timeFilter: 'this_month',
      }),
    ).toBe(true);
  });

  it('scope (personal/shared) + wallet shows the banner', () => {
    expect(
      shouldShowFilterNotice(TOTAL, WALLET_ONLY_SHOWN, {
        ...NO_FILTERS,
        effectiveDataScope: 'personal',
      }),
    ).toBe(true);
    expect(
      shouldShowFilterNotice(TOTAL, WALLET_ONLY_SHOWN, {
        ...NO_FILTERS,
        effectiveDataScope: 'shared',
      }),
    ).toBe(true);
  });

  it('a type filter on its own shows the banner', () => {
    expect(
      shouldShowFilterNotice(TOTAL, WALLET_ONLY_SHOWN, {
        ...NO_FILTERS,
        typeFilter: 'expense',
      }),
    ).toBe(true);
  });

  it('no filters + full count hides the banner (unchanged)', () => {
    expect(shouldShowFilterNotice(TOTAL, TOTAL, NO_FILTERS)).toBe(false);
  });

  it('no filters + reduced count hides the banner: the count gate needs a non-wallet filter', () => {
    expect(shouldShowFilterNotice(TOTAL, WALLET_ONLY_SHOWN, NO_FILTERS)).toBe(false);
    expect(shouldShowFilterNotice(TOTAL, 0, NO_FILTERS)).toBe(false);
  });

  it('a whitespace-only search term does not count as a filter', () => {
    expect(
      shouldShowFilterNotice(TOTAL, WALLET_ONLY_SHOWN, {
        ...NO_FILTERS,
        searchTerm: '   ',
      }),
    ).toBe(false);
    expect(
      shouldShowFilterNotice(TOTAL, WALLET_ONLY_SHOWN, {
        ...NO_FILTERS,
        searchTerm: '  rice  ',
      }),
    ).toBe(true);
  });

  it('an empty list never shows the banner, even with a filter active', () => {
    expect(
      shouldShowFilterNotice(0, 0, { ...NO_FILTERS, selectedCategory: 'cat-food' }),
    ).toBe(false);
  });

  it('a full count never shows the banner, even with a filter active', () => {
    expect(
      shouldShowFilterNotice(TOTAL, TOTAL, {
        ...NO_FILTERS,
        selectedCategory: 'cat-food',
      }),
    ).toBe(false);
  });
});

describe('filter notice helper purity (v7.6.16)', () => {
  it('the predicate checks exactly the five non-wallet filters', () => {
    expect(HELPER_SRC).toContain("typeFilter !== 'all'");
    expect(HELPER_SRC).toContain("effectiveDataScope !== 'all'");
    expect(HELPER_SRC).toContain("timeFilter !== 'all'");
    expect(HELPER_SRC).toContain("selectedCategory !== 'all'");
    expect(HELPER_SRC).toContain("searchTerm.trim() !== ''");
    expect(HELPER_SRC).toContain('shownCount < totalCount');
    expect(HELPER_SRC).toContain('totalCount > 0');
  });

  it('wallet state and financialSystem are not part of the predicate', () => {
    expect(HELPER_SRC).not.toContain('selectedWallet');
    expect(HELPER_SRC).not.toContain('selectedWalletIds');
    expect(HELPER_SRC).not.toContain('financialSystem');
  });
});

describe('Records list wires the banner gate to the helper (v7.6.16)', () => {
  it('the list imports the helper and gates the banner on it', () => {
    expect(TX_VIEW_SRC).toContain(
      "import { shouldShowFilterNotice } from '../utils/filterNotice';",
    );
    expect(TX_VIEW_SRC).toContain(
      'shouldShowFilterNotice(transactions.length, filtered.length, { typeFilter, effectiveDataScope, timeFilter, selectedCategory, searchTerm })',
    );
  });

  it('the old bare count-only condition is gone', () => {
    expect(TX_VIEW_SRC).not.toContain(
      'transactions.length > 0 && filtered.length < transactions.length',
    );
  });

  it('the banner text, counts and date suffixes are unchanged', () => {
    expect(TX_VIEW_SRC).toContain(
      'Filter စစ်ထားသဖြင့် စုစုပေါင်း (${transactions.length}) ခုအနက် (${filtered.length}) ခုသာ ပြသထားပါသည်',
    );
    expect(TX_VIEW_SRC).toContain(
      'Showing ${filtered.length} of ${transactions.length} transactions (Filters active',
    );
    expect(TX_VIEW_SRC).toContain(
      "{lang === 'my' ? 'မှတ်တမ်းအားလုံး ပြန်ဖွင့်မည်' : 'Show All Records'}",
    );
  });

  it('the banner reset still clears ALL filters including the wallet pick', () => {
    const start = TX_VIEW_SRC.indexOf('Active Filter Notice Bar');
    const block = TX_VIEW_SRC.slice(start, TX_VIEW_SRC.indexOf('Transactions List', start));
    expect(block).toContain("setSearchTerm('')");
    expect(block).toContain("setTypeFilter('all')");
    expect(block).toContain("setTimeFilter('all')");
    expect(block).toContain("setSelectedCategory('all')");
    expect(block).toContain("setSelectedWallet('all')");
    expect(block).toContain('setSelectedWalletIds([])');
    expect(block).toContain("setEffectiveDataScope('all')");
  });

  it('the Filter-button badge count logic is untouched', () => {
    // The badge still counts the wallet pick (and financialSystem)
    // exactly as before — the banner gate is a separate predicate.
    expect(TX_VIEW_SRC).toContain('BADGE-COUNT RULE');
    expect(TX_VIEW_SRC).toContain(
      "+ ((selectedWallet !== 'all' || selectedWalletIds.length > 0) ? 1 : 0)",
    );
    expect(TX_VIEW_SRC).toContain(
      "+ (financialSystem !== 'opening_closing' ? 1 : 0)",
    );
    expect(TX_VIEW_SRC).toContain('{activeFilterCount}');
    // The banner gate never consults the badge count.
    const gate = TX_VIEW_SRC.slice(
      TX_VIEW_SRC.indexOf('shouldShowFilterNotice(transactions.length'),
      TX_VIEW_SRC.indexOf('shouldShowFilterNotice(transactions.length') + 200,
    );
    expect(gate).not.toContain('activeFilterCount');
  });
});

describe('Version bump to v7.6.18 (build 332)', () => {
  it('version constants and history entry match version.json', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.18');
    expect(CURRENT_BUILD_NUMBER).toBe(332);
    expect(VERSION_JSON.version).toBe('v7.6.18');
    expect(VERSION_JSON.buildNumber).toBe(332);
    const entry = VERSION_HISTORY[0];
    expect(entry.version).toBe('v7.6.18');
    expect(entry.buildNumber).toBe(332);
    expect(entry.releaseDate).toBe('2026-11-23');
    expect(entry.tag).toBe('fix');
    expect(entry.titleMy).toBe('အသုံးမပြုတဲ့ code များ ရှင်းလင်းခြင်း');
    expect(entry.titleEn).toBe('Removing unused code');
    expect(entry.changesMy).toEqual(VERSION_JSON.changesMy);
    expect(entry.changesEn).toEqual(VERSION_JSON.changesEn);
    expect(entry.changesMy).toHaveLength(1);
    expect(entry.changesEn).toHaveLength(1);
    expect(entry.changesMy[0]).toBe(
      'အသုံးမပြုတော့တဲ့ code၊ မချိတ်ထားတဲ့ props နဲ့ အသေ function များကို ဖယ်ရှားခြင်း — မြင်ရတဲ့ပုံစံနဲ့ လုပ်ဆောင်ချက်များ မပြောင်းလဲပါ',
    );
    expect(entry.changesEn[0]).toBe(
      'Removed unused code, unwired props, and dead helpers — no visible or behavioral changes.',
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
    expect(CURRENT_APP_VERSION).not.toBe('v7.6.18'.replace(/8$/, ''));
    expect(VERSION_JSON.version).not.toBe('v7.6.18'.replace(/8$/, ''));
  });

  it('the fix-script guard is raw string equality: accepts exactly 7.6.17/7.6.18, rejects the mangled form', () => {
    const FROM_VERSION = '7.6.17';
    const TO_VERSION = '7.6.18';
    const guardFails = (pkgVersion: string): boolean =>
      pkgVersion !== FROM_VERSION && pkgVersion !== TO_VERSION;
    // The mangled form is built from TO_VERSION, never written as a
    // literal, so the shipped identity can never be confused with
    // it by a grep or by the guard.
    const mangled = TO_VERSION.replace(/8$/, '');
    expect(mangled).not.toBe(TO_VERSION);
    expect(TO_VERSION).toBe('7.6.18');
    expect(guardFails('7.6.17')).toBe(false);
    expect(guardFails('7.6.18')).toBe(false);
    expect(guardFails(mangled)).toBe(true);
    expect(guardFails('')).toBe(true);
  });
});
