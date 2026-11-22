// [v7.5.99] Amount-display option: "သိန်းဂဏန်း ဖြတ်မယ် /
// သိန်းဂဏန်း မဖြတ်ဘူး". Display-only — every call site keeps calling
// formatLakhs; the mode only changes how the same stored MMK value
// renders. Formatter tests use a fresh module per test (resetModules
// + dynamic import) over an in-memory localStorage stub, so the
// persisted-mode read is exercised exactly as the browser does it
// and no test can leak mode into another. Source assertions follow
// the repo pattern (new URL, no path comparisons): the components
// have no test renderer here (vitest node env).
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  VERSION_HISTORY,
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
} from '../../data/versionHistory';

// In-memory localStorage stub: installed before any formatters
// module loads (all formatters imports below are dynamic, after
// this stub exists), so readStoredAmountDisplayMode reads it.
const store = new Map<string, string>();
const storageStub = {
  getItem: (k: string): string | null => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string): void => {
    store.set(k, String(v));
  },
  removeItem: (k: string): void => {
    store.delete(k);
  },
  clear: (): void => {
    store.clear();
  },
};
(globalThis as unknown as { localStorage: unknown }).localStorage = storageStub;

const loadFormatters = async () => {
  vi.resetModules();
  return import('../formatters');
};

beforeEach(() => {
  store.clear();
});

describe('formatLakhs — lakh mode is the default and unchanged (v7.5.99)', () => {
  it('defaults to lakh when no preference is stored', async () => {
    const f = await loadFormatters();
    expect(f.getAmountDisplayMode()).toBe('lakh');
    expect(f.formatLakhs(1507502, 'my')).toBe('15.07502 သိန်း');
    expect(f.formatLakhs(1507502, 'en')).toBe('15.07502 L');
  });

  it('lakh matrix matches the pre-v7.5.99 behaviour byte for byte', async () => {
    const f = await loadFormatters();
    expect(f.formatLakhs(0, 'my')).toBe('0 သိန်း');
    expect(f.formatLakhs(0, 'en')).toBe('0 L');
    expect(f.formatLakhs(650000, 'my')).toBe('6.5 သိန်း');
    expect(f.formatLakhs(7500000, 'my')).toBe('75 သိန်း');
    expect(f.formatLakhs(1110500, 'my')).toBe('11.105 သိန်း');
    expect(f.formatLakhs(1, 'my')).toBe('0.00001 သိန်း');
    expect(f.formatLakhs(100000, 'my')).toBe('1 သိန်း');
    expect(f.formatLakhs(-5200, 'my')).toBe('-0.052 သိန်း');
    expect(f.formatLakhs(-1507502, 'en')).toBe('-15.07502 L');
    expect(f.formatLakhs(1507502.4, 'my')).toBe('15.07502 သိန်း');
    expect(f.formatLakhs(Number.NaN, 'my')).toBe('—');
    expect(f.formatLakhs(Infinity, 'my')).toBe('—');
  });

  it('formatLakhAmount is the verbatim old body, whatever the mode', async () => {
    const f = await loadFormatters();
    f.setAmountDisplayMode('kyat');
    expect(f.formatLakhAmount(1507502, 'my')).toBe('15.07502 သိန်း');
    expect(f.formatLakhAmount(0, 'en')).toBe('0 L');
    expect(f.formatLakhAmount(-5200, 'my')).toBe('-0.052 သိန်း');
  });
});

describe('formatLakhs — kyat mode shows full grouped kyat numbers (v7.5.99)', () => {
  it('kyat matrix: grouping, sign-first, zero, nearest-kyat rounding', async () => {
    const f = await loadFormatters();
    f.setAmountDisplayMode('kyat');
    expect(f.getAmountDisplayMode()).toBe('kyat');
    expect(f.formatLakhs(1507502, 'my')).toBe('1,507,502 ကျပ်');
    expect(f.formatLakhs(1507502, 'en')).toBe('1,507,502 MMK');
    expect(f.formatLakhs(-5200, 'my')).toBe('-5,200 ကျပ်');
    expect(f.formatLakhs(-5200, 'en')).toBe('-5,200 MMK');
    expect(f.formatLakhs(0, 'my')).toBe('0 ကျပ်');
    expect(f.formatLakhs(0, 'en')).toBe('0 MMK');
    expect(f.formatLakhs(1507502.6, 'my')).toBe('1,507,503 ကျပ်');
    expect(f.formatLakhs(999.4, 'my')).toBe('999 ကျပ်');
    expect(f.formatLakhs(999.5, 'my')).toBe('1,000 ကျပ်');
    expect(f.formatLakhs(-1507502.6, 'my')).toBe('-1,507,503 ကျပ်');
    expect(f.formatLakhs(123456789, 'my')).toBe('123,456,789 ကျပ်');
    expect(f.formatLakhs(1000, 'my')).toBe('1,000 ကျပ်');
    expect(f.formatLakhs(Number.NaN, 'my')).toBe('—');
  });

  it('formatKyatAmount always renders kyats, whatever the mode', async () => {
    const f = await loadFormatters();
    expect(f.getAmountDisplayMode()).toBe('lakh');
    expect(f.formatKyatAmount(1507502, 'my')).toBe('1,507,502 ကျပ်');
    expect(f.formatKyatAmount(-5200, 'en')).toBe('-5,200 MMK');
    expect(f.formatKyatAmount(0, 'my')).toBe('0 ကျပ်');
  });

  it('formatAbsoluteKyats: absolute grouped whole kyats, no suffix', async () => {
    const f = await loadFormatters();
    expect(f.formatAbsoluteKyats(1507502)).toBe('1,507,502');
    expect(f.formatAbsoluteKyats(-5200)).toBe('5,200');
    expect(f.formatAbsoluteKyats(0)).toBe('0');
    expect(f.formatAbsoluteKyats(1507502.6)).toBe('1,507,503');
    expect(f.formatAbsoluteKyats(Number.NaN)).toBe('0');
  });
});

describe('amount-display persistence — localStorage round-trip (v7.5.99)', () => {
  it('setter writes the key; a fresh module read returns it', async () => {
    const f = await loadFormatters();
    f.setAmountDisplayMode('kyat');
    expect(store.get('ngwe_amount_display')).toBe('kyat');
    const fresh = await loadFormatters();
    expect(fresh.getAmountDisplayMode()).toBe('kyat');
    expect(fresh.formatLakhs(1507502, 'my')).toBe('1,507,502 ကျပ်');
  });

  it('accepts the JSON-quoted form usePersistedState writes', async () => {
    store.set('ngwe_amount_display', '"kyat"');
    const f = await loadFormatters();
    expect(f.getAmountDisplayMode()).toBe('kyat');
  });

  it('accepts the raw string form', async () => {
    store.set('ngwe_amount_display', 'kyat');
    const f = await loadFormatters();
    expect(f.getAmountDisplayMode()).toBe('kyat');
  });

  it('invalid or empty stored values fall back to lakh', async () => {
    store.set('ngwe_amount_display', 'bogus');
    expect((await loadFormatters()).getAmountDisplayMode()).toBe('lakh');
    store.set('ngwe_amount_display', '"bogus"');
    expect((await loadFormatters()).getAmountDisplayMode()).toBe('lakh');
    store.set('ngwe_amount_display', '');
    expect((await loadFormatters()).getAmountDisplayMode()).toBe('lakh');
  });

  it('reset helper restores lakh and clears the stored key', async () => {
    const f = await loadFormatters();
    f.setAmountDisplayMode('kyat');
    expect(store.has('ngwe_amount_display')).toBe(true);
    f.resetAmountDisplayMode();
    expect(f.getAmountDisplayMode()).toBe('lakh');
    expect(store.has('ngwe_amount_display')).toBe(false);
    const fresh = await loadFormatters();
    expect(fresh.getAmountDisplayMode()).toBe('lakh');
  });

  it('clearing the stored key returns a fresh read to lakh (no leakage)', async () => {
    const f = await loadFormatters();
    f.setAmountDisplayMode('kyat');
    store.clear();
    const fresh = await loadFormatters();
    expect(fresh.getAmountDisplayMode()).toBe('lakh');
  });
});

const FORMATTERS_SRC = readFileSync(
  new URL('../formatters.ts', import.meta.url),
  'utf8',
);
const CALENDAR_SRC = readFileSync(
  new URL('../../components/SmartCalendarCard.tsx', import.meta.url),
  'utf8',
);
const ACCOUNT_SRC = readFileSync(
  new URL('../../components/AccountModal.tsx', import.meta.url),
  'utf8',
);
const APP_SRC = readFileSync(
  new URL('../../App.tsx', import.meta.url),
  'utf8',
);
const TXMODAL_SRC = readFileSync(
  new URL('../../components/TransactionModal.tsx', import.meta.url),
  'utf8',
);
const STORAGE_SRC = readFileSync(
  new URL('../storage.ts', import.meta.url),
  'utf8',
);

describe('Settings toggle + wiring — same surface and mechanism as language (v7.5.99)', () => {
  it('AccountModal carries both options with the user\u2019s words and live examples', () => {
    expect(ACCOUNT_SRC).toContain('သိန်းဂဏန်း ဖြတ်မယ်');
    expect(ACCOUNT_SRC).toContain('သိန်းဂဏန်း မဖြတ်ဘူး');
    expect(ACCOUNT_SRC).toContain('ဥပမာ: 15.07502 သိန်း');
    expect(ACCOUNT_SRC).toContain('ဥပမာ: 1,507,502 ကျပ်');
    expect(ACCOUNT_SRC).toContain('Show amounts in lakhs');
    expect(ACCOUNT_SRC).toContain('Show full kyat amounts');
    expect(ACCOUNT_SRC).toContain('e.g. 15.07502 lakh');
    expect(ACCOUNT_SRC).toContain('e.g. 1,507,502 MMK');
    expect(ACCOUNT_SRC).toContain('amountDisplayMode');
    expect(ACCOUNT_SRC).toContain('onSetAmountDisplayMode');
    // 44px tap targets.
    expect(ACCOUNT_SRC).toContain('min-h-11');
  });

  it('App holds the mode in usePersistedState and syncs the formatter before re-render', () => {
    expect(APP_SRC).toContain(
      "usePersistedState<AmountDisplayMode>('ngwe_amount_display', 'lakh'",
    );
    expect(APP_SRC).toContain('setAmountDisplayMode(next)');
    expect(APP_SRC).toContain('amountDisplayMode={amountDisplayMode}');
    expect(APP_SRC).toContain(
      'onSetAmountDisplayMode={handleSetAmountDisplayMode}',
    );
  });

  it('the key is device-global like ngwe_lang (local-only, works for guests)', () => {
    expect(STORAGE_SRC).toContain("'ngwe_amount_display'");
  });

  it('formatLakhAmount keeps the 5-decimal lakh body verbatim', () => {
    expect(FORMATTERS_SRC).toContain('formatLakhAmount');
    expect(FORMATTERS_SRC).toContain('Number(lakhs.toFixed(5)).toString()');
    expect(FORMATTERS_SRC).toContain('formatKyatAmount');
    expect(FORMATTERS_SRC).toContain('ngwe_amount_display');
  });
});

describe('Calendar short form + entry hint follow the mode (v7.5.99)', () => {
  it('formatShortLakhs switches to full grouped kyats, keeping its absolute contract', () => {
    expect(CALENDAR_SRC).toContain('getAmountDisplayMode');
    expect(CALENDAR_SRC).toContain('formatAbsoluteKyats(amount)');
    expect(CALENDAR_SRC).toContain('formatShortLakhs(amount)');
    expect(CALENDAR_SRC).toContain('Math.abs(amount)');
    // No toLocaleString-based amount display lives in the calendar:
    // grouping lives in formatters.ts (formatAbsoluteKyats).
    expect(CALENDAR_SRC).not.toContain('toLocaleString');
  });

  it('TransactionModal lakh hint is hidden in kyat mode, unchanged in lakh mode', () => {
    expect(TXMODAL_SRC).toContain("getAmountDisplayMode() === 'lakh'");
    expect(TXMODAL_SRC).toContain(
      'formatLakhs(parseMyanmarNumber(amount) || 0, lang)',
    );
  });
});

const VERSION_JSON = JSON.parse(
  readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
);

describe('Version bump to v7.5.99 (build 314)', () => {
  it('version constants and history entry match version.json', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.5.99');
    expect(CURRENT_BUILD_NUMBER).toBe(314);
    expect(VERSION_JSON.version).toBe('v7.5.99');
    expect(VERSION_JSON.buildNumber).toBe(314);
    const entry = VERSION_HISTORY[0];
    expect(entry.version).toBe('v7.5.99');
    expect(entry.buildNumber).toBe(314);
    expect(entry.releaseDate).toBe('2026-11-22');
    expect(entry.tag).toBe('fix');
    expect(entry.titleMy).toBe(
      'ပမာဏ ပြပုံ (သိန်း / ကျပ်အပြည့်အစုံ) ရွေးချယ်နိုင်အောင် ထည့်ခြင်း',
    );
    expect(entry.titleEn).toBe(
      'Choose how amounts display (lakhs / full kyat numbers)',
    );
    expect(entry.changesMy).toEqual(VERSION_JSON.changesMy);
    expect(entry.changesEn).toEqual(VERSION_JSON.changesEn);
    expect(entry.changesMy).toHaveLength(1);
    expect(entry.changesEn).toHaveLength(1);
    expect(entry.changesMy[0]).toBe(
      'ပမာဏ ပြပုံ ရွေးချယ်နိုင်အောင် ထည့်ခြင်း — “သိန်းဂဏန်း ဖြတ်မယ်” (15.07502 သိန်း) သို့မဟုတ် “သိန်းဂဏန်း မဖြတ်ဘူး” (1,507,502 ကျပ်) လို့ Settings မှာ ရွေးနိုင်သည်; မူရင်းအတိုင်း သိန်းပုံစံဖြင့် ပြမည်',
    );
    expect(entry.changesEn[0]).toBe(
      'Choose how amounts display — in lakhs (15.07502 lakh) or as full kyat numbers (1,507,502 MMK) — in Settings; lakhs remain the default.',
    );
  });

  it('change log has no Admin content and releasedAt is present-only', () => {
    expect(VERSION_JSON.changesMy.join(' ')).not.toContain('Admin');
    expect(VERSION_JSON.changesEn.join(' ')).not.toContain('Admin');
    expect(JSON.stringify(VERSION_HISTORY[0])).not.toContain('Admin');
    expect(typeof VERSION_JSON.releasedAt).toBe('string');
    expect(VERSION_JSON.releasedAt.length).toBeGreaterThan(0);
  });
});

// [v7.5.99 top-up] Coordinator verification findings: calendar figures
// must wrap (not truncate) in kyat mode; mode-conditional labels;
// currency-ambiguous surfaces stay lakh-only; sibling lakh previews
// hide in kyat mode like the entry-form hint.
describe('v7.5.99 top-up — calendar wrap, labels, exemptions, preview gating', () => {
  const readSrc = (rel: string): string =>
    readFileSync(new URL(rel, import.meta.url), 'utf8');

  it('calendar day cells and summary tiles wrap in kyat mode, truncate in lakh mode', () => {
    const src = readSrc('../../components/SmartCalendarCard.tsx');
    expect(src).toContain('isKyatMode');
    expect(src).toContain('break-all leading-tight');
    // Lakh path keeps truncate rendering.
    expect(src).toContain("'truncate'");
  });

  it('calendar subtitle and amount header switch wording with the mode', () => {
    const src = readSrc('../../components/SmartCalendarCard.tsx');
    expect(src).toContain('ပမာဏ (ကျပ်)');
    expect(src).toContain('Amount (kyat)');
    expect(src).toContain('ကျပ်ဂဏန်း အပြည့်အစုံ');
    expect(src).toContain('ပမာဏ (သိန်း)');
  });

  it('dashboard total label switches wording with the mode', () => {
    const src = readSrc('../../components/Dashboard.tsx');
    expect(src).toContain('စုစုပေါင်း (ကျပ်ဖြင့်)');
    expect(src).toContain('Total (kyat)');
    expect(src).toContain('getAmountDisplayMode');
  });

  it('currency-ambiguous surfaces alias formatLakhs to the lakh-only form', () => {
    for (const rel of [
      '../../components/AdminPanel.tsx',
      '../../components/SyncStatusDrawer.tsx',
      '../../components/NotificationModal.tsx',
    ]) {
      expect(readSrc(rel)).toContain('formatLakhAmount as formatLakhs');
    }
  });

  it('sibling lakh previews hide in kyat mode (entry-hint parity)', () => {
    for (const rel of [
      '../../components/DebtModal.tsx',
      '../../components/RepaymentModal.tsx',
      '../../components/MonthlySavingsTarget.tsx',
      '../../components/ReconcileBalanceModal.tsx',
      '../../components/WalletModal.tsx',
    ]) {
      expect(readSrc(rel)).toContain("getAmountDisplayMode() === 'lakh'");
    }
    // Previews themselves are kept (hidden conditionally, not deleted).
    expect(readSrc('../../components/DebtModal.tsx')).toContain('≈ {formatLakhs(v, lang)}');
    expect(readSrc('../../components/RepaymentModal.tsx')).toContain('≈ {formatLakhs(parsedAmount, lang)}');
  });

  it('WalletsView MMK totals stay mode-aware (proper display, not a bypass)', () => {
    expect(readSrc('../../components/WalletsView.tsx')).toContain(
      "code === 'MMK' ? formatLakhs(data.total, lang)",
    );
  });
});
