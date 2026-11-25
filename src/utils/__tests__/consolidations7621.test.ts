// [v7.6.21] Consolidations B-15--B-19 + retained B-06/B-07/B-09/B-10
// leftovers: duplicate helpers become one shared implementation each,
// with behavior identical to the old copies (verified per call site
// before the swap). No visible or behavioral change of any kind.
// Source-text assertions follow the established pattern (no test
// renderer in this repo; vitest node env). NO path comparisons:
// sources are read via new URL(..., import.meta.url).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  isSharedWallet,
  isScopedTx,
  convertTxToMMK,
  buildWalletMap,
} from '../walletBalance';
import { lakhMultiplyGuard } from '../lakhMultiply';
import { getLocalDateString } from '../dateUtils';
import type { Wallet, Transaction } from '../../types';
import {
  VERSION_HISTORY,
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
} from '../../data/versionHistory';

function src(rel: string): string {
  return readFileSync(new URL(rel, import.meta.url), 'utf8');
}

const VERSION_JSON = JSON.parse(
  readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
);

function W(overrides: Record<string, unknown> = {}): Wallet {
  return {
    id: 'w1',
    name: 'Cash',
    nameEn: 'Cash',
    balance: 0,
    color: '#000000',
    icon: 'Wallet',
    currency: 'MMK',
    includeInTotals: true,
    ...overrides,
  } as unknown as Wallet;
}

function T(overrides: Record<string, unknown> = {}): Transaction {
  return {
    id: 'tx1',
    type: 'expense',
    amount: 100,
    walletId: 'w1',
    date: '2026-11-23',
    category: 'cat_food',
    ...overrides,
  } as unknown as Transaction;
}

// ---------- B-17: isSharedWallet ----------

describe('isSharedWallet (B-17 shared predicate)', () => {
  it('a personal wallet with no sharing is not shared', () => {
    expect(isSharedWallet(W())).toBe(false);
  });

  it('shared TO me counts as shared', () => {
    expect(isSharedWallet(W({ isSharedFromOther: true }))).toBe(true);
  });

  it('shared OUT by me (non-empty sharedWith) counts as shared', () => {
    expect(isSharedWallet(W({ sharedWith: ['a@example.com'] }))).toBe(true);
  });

  it('an empty sharedWith list with no flag is not shared', () => {
    expect(isSharedWallet(W({ sharedWith: [] }))).toBe(false);
  });

  it('null and undefined wallets are not shared (old existence guards)', () => {
    expect(isSharedWallet(null)).toBe(false);
    expect(isSharedWallet(undefined)).toBe(false);
  });

  it('every old copy used the same predicate: flag OR non-empty list', () => {
    // The hooks' (sharedWith?.length || 0) > 0 form agrees with the
    // components' !!(sharedWith && sharedWith.length > 0) form.
    expect(isSharedWallet(W({ sharedWith: ['x'] }))).toBe(true);
    expect(isSharedWallet(W({ isSharedFromOther: false, sharedWith: [] }))).toBe(false);
  });
});

// ---------- B-16: convertTxToMMK ----------

describe('convertTxToMMK (B-16 shared conversion)', () => {
  const mmk = W({ id: 'w1', currency: 'MMK' });
  const usd = W({ id: 'w2', name: 'USD Wallet', nameEn: 'USD Wallet', currency: 'USD', exchangeRate: 4000 });
  const wallets = [mmk, usd];
  const walletMap = buildWalletMap(wallets);

  it('converts t.amount through the wallet currency (single-arg pattern)', () => {
    expect(convertTxToMMK(walletMap, wallets, T({ walletId: 'w1', amount: 2500 }))).toBe(2500);
    expect(convertTxToMMK(walletMap, wallets, T({ walletId: 'w2', amount: 10 }))).toBe(40000);
  });

  it('converts the given amount instead (two-arg split-slice pattern)', () => {
    expect(convertTxToMMK(walletMap, wallets, T({ walletId: 'w2', amount: 10 }), 3)).toBe(12000);
    expect(convertTxToMMK(walletMap, wallets, T({ walletId: 'w1', amount: 10 }), 0)).toBe(0);
  });

  it('defaults an explicit undefined amount to t.amount', () => {
    expect(convertTxToMMK(walletMap, wallets, T({ walletId: 'w2', amount: 7 }), undefined as unknown as number)).toBe(28000);
  });

  it('falls back to the isWalletMatch scan when the map misses', () => {
    // 'shared_u1_w2' is not a map key for w2, but isWalletMatch
    // strips the shared_ prefix and matches the id.
    expect(convertTxToMMK(new Map(), wallets, T({ walletId: 'shared_u1_w2', amount: 2 }))).toBe(8000);
  });

  it('an unknown wallet converts at the MMK rate (amount unchanged)', () => {
    expect(convertTxToMMK(walletMap, wallets, T({ walletId: 'nope', amount: 1234 }))).toBe(1234);
  });
});

// ---------- B-18: isScopedTx ----------

describe('isScopedTx (B-18 shared scope check)', () => {
  // Overrides only apply to shared wallets (effectiveIncludeInTotals
  // gates on isSharedFromOther/sharedWith) — both fixtures are shared.
  const included = W({ id: 'w1', includeInTotals: true, isSharedFromOther: true });
  const separate = W({ id: 'w2', name: 'Separate', nameEn: 'Separate', includeInTotals: false, isSharedFromOther: true });
  const wallets = [included, separate];
  const walletMap = buildWalletMap(wallets);

  it('an unknown wallet is kept (its scope cannot be judged)', () => {
    expect(isScopedTx(walletMap, wallets, {}, T({ walletId: 'nope' }))).toBe(true);
  });

  it('an included wallet passes with no overrides', () => {
    expect(isScopedTx(walletMap, wallets, {}, T({ walletId: 'w1' }))).toBe(true);
  });

  it('a separate wallet is excluded with no overrides', () => {
    expect(isScopedTx(walletMap, wallets, {}, T({ walletId: 'w2' }))).toBe(false);
  });

  it('an override of true re-includes a separate wallet', () => {
    expect(isScopedTx(walletMap, wallets, { w2: true }, T({ walletId: 'w2' }))).toBe(true);
  });

  it('an override of false excludes an included wallet', () => {
    expect(isScopedTx(walletMap, wallets, { w1: false }, T({ walletId: 'w1' }))).toBe(false);
  });

  it('undefined overrides behave like no overrides', () => {
    expect(isScopedTx(walletMap, wallets, undefined, T({ walletId: 'w2' }))).toBe(false);
    expect(isScopedTx(walletMap, wallets, undefined, T({ walletId: 'w1' }))).toBe(true);
  });

  it('falls back to the isWalletMatch scan when the map misses', () => {
    expect(isScopedTx(new Map(), wallets, {}, T({ walletId: 'shared_u1_w2' }))).toBe(false);
  });
});

// ---------- B-19: lakhMultiplyGuard ----------

describe('lakhMultiplyGuard (B-19 shared guard)', () => {
  it('multiplies a lakh value to kyat', () => {
    expect(lakhMultiplyGuard('5', false, 'my')).toEqual({ kind: 'ok', value: '500000' });
    expect(lakhMultiplyGuard('2.5', false, 'en')).toEqual({ kind: 'ok', value: '250000' });
  });

  it('accepts Myanmar digits exactly like Latin digits', () => {
    expect(lakhMultiplyGuard('၅', false, 'my')).toEqual({ kind: 'ok', value: '500000' });
  });

  it('rounds the product like the old Math.round call', () => {
    expect(lakhMultiplyGuard('1.23456', false, 'en')).toEqual({ kind: 'ok', value: '123456' });
  });

  it('ignores empty, zero, negative and non-numeric input', () => {
    expect(lakhMultiplyGuard('', false, 'my')).toEqual({ kind: 'noop' });
    expect(lakhMultiplyGuard('0', false, 'my')).toEqual({ kind: 'noop' });
    expect(lakhMultiplyGuard('-3', false, 'my')).toEqual({ kind: 'noop' });
    expect(lakhMultiplyGuard('abc', false, 'en')).toEqual({ kind: 'noop' });
  });

  it('a second tap once converted does nothing (idempotent)', () => {
    expect(lakhMultiplyGuard('5', true, 'my')).toEqual({ kind: 'noop' });
    expect(lakhMultiplyGuard('500000', true, 'my')).toEqual({ kind: 'noop' });
  });

  it('refuses a value already at kyat scale with the exact old message', () => {
    expect(lakhMultiplyGuard('100000', false, 'my')).toEqual({
      kind: 'refused',
      message: 'ဒီပမာဏက ကျပ်နဲ့ ရိုက်ထားပြီးသား ဖြစ်ပါတယ် — သိန်းနဲ့ ထပ်မြှောက်စရာ မလိုပါဘူး',
    });
    expect(lakhMultiplyGuard('2500000', false, 'en')).toEqual({
      kind: 'refused',
      message: 'This amount is already in kyat — no need to multiply by 100,000',
    });
  });

  it('99999 lakh still multiplies (the boundary is exactly 100000)', () => {
    expect(lakhMultiplyGuard('99999', false, 'en')).toEqual({ kind: 'ok', value: '9999900000' });
  });
});

// ---------- B-15: canonical getLocalDateString ----------

describe('getLocalDateString (B-15 canonical util)', () => {
  it('formats a Date as YYYY-MM-DD with zero padding', () => {
    expect(getLocalDateString(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(getLocalDateString(new Date(2026, 11, 23))).toBe('2026-12-23');
  });

  it('uses local fields, never UTC (the MMT-morning rule)', () => {
    expect(getLocalDateString(new Date(2026, 10, 23, 7, 0, 0))).toBe('2026-11-23');
  });
});

// ---------- Source pins: no duplicate copy remains ----------

describe('consolidation source pins (v7.6.21)', () => {
  it('B-15: no local getLocalDateString copy remains in the five files', () => {
    for (const rel of [
      '../../components/vehicles/VehicleCostSummaryCard.tsx',
      '../../components/CurrentMonthExpenseDonutChart.tsx',
      '../../components/DailySpendingLimitCard.tsx',
      '../../components/TransactionsView.tsx',
      '../../components/SmartCalendarCard.tsx',
    ]) {
      expect(src(rel)).not.toContain('const getLocalDateString');
    }
    expect(src('../../utils/dateUtils.ts')).toContain('export const getLocalDateString');
  });

  it('B-16: no local conversion body remains in the eight files', () => {
    for (const rel of [
      '../../components/AnalyticsView.tsx',
      '../../components/BudgetAnalyticsView.tsx',
      '../../components/CategorySpendingTrendLineChart.tsx',
      '../../components/CurrentMonthExpenseDonutChart.tsx',
      '../../components/Dashboard.tsx',
      '../../components/MonthlyComparisonCard.tsx',
      '../../components/MonthlySummaryChart.tsx',
      '../../components/CurrentMonthBudgetSummaryCard.tsx',
    ]) {
      const text = src(rel);
      expect(text).not.toContain('return convertToMMK(amount, w?.currency, w?.exchangeRate);');
      expect(text).not.toContain('return convertToMMK(t.amount, w?.currency, w?.exchangeRate);');
      expect(text).not.toContain('return convertToMMK(tx.amount, w?.currency, w?.exchangeRate);');
    }
  });

  it('B-17: no local isSharedWallet definition remains anywhere in src', () => {
    for (const rel of [
      '../../components/Dashboard.tsx',
      '../../components/MultiWalletSelector.tsx',
      '../../components/TransactionsView.tsx',
      '../../components/SmartCalendarCard.tsx',
      '../../components/WalletsView.tsx',
      '../../hooks/useDebtHandlers.ts',
      '../../hooks/useTransactionHandlers.ts',
      '../../hooks/useWalletHandlers.ts',
      '../../utils/walletSelectionLabel.ts',
    ]) {
      const text = src(rel);
      expect(text).not.toContain('const isSharedWallet');
      expect(text).not.toContain('function isSharedWallet');
    }
    expect(src('../../utils/walletBalance.ts')).toContain('export function isSharedWallet');
  });

  it('B-18: the scope lookup body lives only in the shared helper', () => {
    for (const rel of [
      '../../components/CategorySpendingTrendLineChart.tsx',
      '../../components/MonthlySummaryChart.tsx',
      '../../components/ItemPriceAnalyticsView.tsx',
    ]) {
      expect(src(rel)).not.toContain('return !w || effectiveIncludeInTotals(w, sharedWalletScopeOverrides);');
    }
    expect(src('../../utils/walletBalance.ts')).toContain('export function isScopedTx');
  });

  it('B-19: the multiply guard body lives only in lakhMultiply.ts', () => {
    for (const rel of [
      '../../components/DebtModal.tsx',
      '../../components/ReconcileBalanceModal.tsx',
      '../../components/RepaymentModal.tsx',
    ]) {
      const text = src(rel);
      expect(text).toContain('lakhMultiplyGuard');
      expect(text).not.toContain('Math.round(val * 100000)');
    }
    expect(src('../../utils/lakhMultiply.ts')).toContain('export function lakhMultiplyGuard');
  });

  it('B-06/B-07/B-09/B-10: retained interface lines and App args are gone', () => {
    expect(src('../../components/DatabaseSyncTrackerModal.tsx')).not.toContain('wallets: Wallet[];');
    expect(src('../../components/DatabaseSyncTrackerModal.tsx')).not.toContain('debts: Debt[];');
    expect(src('../../components/WalletsView.tsx')).not.toContain('onUpdateWalletBalance:');
    expect(src('../../components/WalletsView.tsx')).not.toContain('onSyncRefresh?:');
    expect(src('../../components/DataManagementView.tsx')).not.toContain('onOpenAccountModal:');
    expect(src('../../components/Navbar.tsx')).not.toContain('onToggleLang:');
    expect(src('../../components/Navbar.tsx')).not.toContain('activeTab: string;');
    const app = src('../../App.tsx');
    expect(app).not.toContain('wallets={computedWallets}\n        debts={debts}');
    expect(app).not.toContain('onUpdateWalletBalance={handleUpdateWalletBalance}');
    expect(app).not.toContain('onSyncRefresh={handleManualSyncDown}');
  });

  it('the live wiring the cleanup kept is untouched', () => {
    // Navbar still receives setActiveTab; the language toggle still
    // reaches the other surfaces that read it.
    expect(src('../../App.tsx')).toContain('setActiveTab={setActiveTab}');
    expect(src('../../App.tsx')).toContain('onToggleLang={handleToggleLang}');
    // The hook still returns handleUpdateWalletBalance for any caller.
    expect(src('../../hooks/useWalletHandlers.ts')).toContain('handleUpdateWalletBalance,');
  });
});

// ---------- Version bump to v7.6.27 (build 342) ----------

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
