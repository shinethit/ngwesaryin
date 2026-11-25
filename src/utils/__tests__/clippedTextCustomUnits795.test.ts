// [v7.5.95] Clipped text shows in full + custom units can be typed in.
// Source-text assertions (same pattern as vehicleTextFixes794.test.ts)
// — the components have no test renderer in this repo (vitest node env,
// no testing-library); layout behaviour is verified by renders.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  normalizeMenuUnit,
  resolveSavedMenuUnit,
  DEFAULT_MENU_UNIT,
} from '../shopMenuUpdate';

const VEHICLES_SRC = readFileSync(
  new URL('../../components/vehicles/VehiclesView.tsx', import.meta.url),
  'utf8',
);
const COMPARE_SRC = readFileSync(
  new URL('../../components/ItemPriceAnalyticsView.tsx', import.meta.url),
  'utf8',
);
const BUDGET_SRC = readFileSync(
  new URL('../../components/CurrentMonthBudgetSummaryCard.tsx', import.meta.url),
  'utf8',
);
const CALENDAR_SRC = readFileSync(
  new URL('../../components/SmartCalendarCard.tsx', import.meta.url),
  'utf8',
);
const PREMIUM_SRC = readFileSync(
  new URL('../../components/PremiumModal.tsx', import.meta.url),
  'utf8',
);
const APP_SRC = readFileSync(
  new URL('../../App.tsx', import.meta.url),
  'utf8',
);
const SHOPCARD_SRC = readFileSync(
  new URL('../../components/shops/ShopCard.tsx', import.meta.url),
  'utf8',
);
const DEBTS_SRC = readFileSync(
  new URL('../../components/DebtsView.tsx', import.meta.url),
  'utf8',
);
const TRANSACTIONS_SRC = readFileSync(
  new URL('../../components/TransactionsView.tsx', import.meta.url),
  'utf8',
);
const TXMODAL_SRC = readFileSync(
  new URL('../../components/TransactionModal.tsx', import.meta.url),
  'utf8',
);
const MAINT_SRC = readFileSync(
  new URL('../../components/vehicles/AddMaintenanceModal.tsx', import.meta.url),
  'utf8',
);
const SHOPMODAL_SRC = readFileSync(
  new URL('../../components/shops/ShopModal.tsx', import.meta.url),
  'utf8',
);
const HOOK_SRC = readFileSync(
  new URL('../../hooks/usePersistedState.ts', import.meta.url),
  'utf8',
);

describe('Range caption removed; banner / deactivated names show in full (P0, V2, V3)', () => {
  it('range caption line is gone entirely (v7.5.96) — no -mb-3, no caption const', () => {
    expect(VEHICLES_SRC).not.toContain('-mb-3');
    expect(VEHICLES_SRC).not.toContain('metricRangeCaption');
  });

  it('Free banner sub-text wraps instead of truncating', () => {
    const line = VEHICLES_SRC.split('\n').find((l) =>
      l.includes('text-[11px] text-amber-800/80'),
    );
    expect(line).toBeDefined();
    expect(line).not.toContain('truncate');
  });

  it('deactivated vehicle names wrap instead of truncating', () => {
    expect(VEHICLES_SRC).toContain(
      'font-bold text-sm text-slate-800 block break-words">{v.name}',
    );
  });
});

describe('Price Compare selector + budget names show in full (A1, A2)', () => {
  it('shop price line wraps instead of truncating', () => {
    expect(COMPARE_SRC).toContain('mt-0.5 block max-w-full text-left');
    expect(COMPARE_SRC).not.toContain('max-w-full truncate text-left');
    expect(COMPARE_SRC).toContain('break-words');
  });

  it('multi-category budget name wraps instead of truncating', () => {
    expect(BUDGET_SRC).toContain('font-bold text-slate-900 break-words');
    expect(BUDGET_SRC).not.toContain('text-slate-900 truncate');
  });
});

describe('Calendar net chip shows the minus sign (H1)', () => {
  it('day net chip and shared lines prefix - for negatives', () => {
    expect(CALENDAR_SRC).toContain(
      "{selectedDaySummary.net < 0 ? '-' : '+'}{fmtCell(selectedDaySummary.net)}",
    );
    expect(CALENDAR_SRC).toContain("monthSharedSummary.net < 0 ? '-' : '+'");
    expect(CALENDAR_SRC).toContain("selectedDaySharedSummary.net < 0 ? '-' : '+'");
    // No render site still drops the sign: the old pattern (empty
    // branch + absolute fmtCell) must not survive anywhere.
    expect(CALENDAR_SRC).not.toContain(">= 0 ? '+' : ''}${fmtCell");
  });

  it('fmtCell / formatShortLakhs still return absolute values', () => {
    expect(CALENDAR_SRC).toContain('Math.abs(amount)');
    expect(CALENDAR_SRC).toContain('formatShortLakhs(amount)');
  });
});

describe('Premium tabs + login modal reachability (E1, E2)', () => {
  it('Premium tab labels have no whitespace-nowrap and use tighter text', () => {
    const start = PREMIUM_SRC.indexOf('Tab Selector Navigation');
    const end = PREMIUM_SRC.indexOf('Modal Body Content');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const tabBar = PREMIUM_SRC.slice(start, end);
    expect(tabBar).not.toContain('whitespace-nowrap');
    expect(tabBar).toContain('text-[11px]');
  });

  it('login modal wrapper uses m-auto, not centering bleed', () => {
    const start = APP_SRC.indexOf('isAuthModalOpen || showLoginModal');
    expect(start).toBeGreaterThan(-1);
    // The auth-modal wrapper + its child div (the next ~500 chars).
    const region = APP_SRC.slice(start, start + 600);
    expect(region).toContain('flex justify-center p-0 sm:p-4');
    expect(region).toContain('sm:max-w-lg m-auto');
    expect(region).not.toContain('items-center justify-center');
  });
});

describe('Shop menu names + debt dates show in full (S1, W1, W2)', () => {
  it('expanded menu item names wrap in both card views', () => {
    expect(SHOPCARD_SRC).toContain('text-xs block break-words">{item.name}');
    expect(SHOPCARD_SRC).toContain('font-bold text-slate-900 break-words">{item.name}');
    expect(SHOPCARD_SRC).not.toContain('block truncate">{item.name}');
    expect(SHOPCARD_SRC).not.toContain('text-slate-900 truncate">{item.name}');
  });

  it('debt start date is protected from the parent truncate', () => {
    expect(DEBTS_SRC).toContain(
      'text-slate-600 text-[11px] font-mono shrink-0 whitespace-nowrap',
    );
    expect(DEBTS_SRC).not.toContain('gap-1.5 min-w-0 text-xs text-slate-500 truncate');
  });

  it('repayment dates are protected from long wallet names', () => {
    expect(DEBTS_SRC).toContain(
      'shrink-0 whitespace-nowrap">{formatShortDate(rep.date)}',
    );
    expect(DEBTS_SRC).toContain('max-w-[90px]');
    // [v7.5.95 W2 top-up] The left container uses flex-auto with no
    // min-w-0 and the row wraps: the shrink-0 date can never be
    // overlapped, and the right group drops to a second line instead
    // of being pushed off-screen.
    expect(DEBTS_SRC).toContain('flex items-center gap-2 flex-auto">');
    expect(DEBTS_SRC).not.toContain('flex items-center gap-2 min-w-0 flex-1');
    expect(DEBTS_SRC).toContain('flex flex-wrap items-center justify-between gap-y-1');
    expect(DEBTS_SRC).toContain('flex items-center gap-3 shrink-0 ml-auto');
  });
});

describe('Itemised shopping table shows names in full (T1)', () => {
  it('table is full-width and item names wrap', () => {
    expect(TRANSACTIONS_SRC).toContain('mt-2.5 w-full p-2.5 bg-amber-50/70');
    expect(TRANSACTIONS_SRC).toContain('min-w-0 flex-1 break-words">{item.name}');
    expect(TRANSACTIONS_SRC).toContain(
      'text-[11px] text-slate-500 font-mono shrink-0 whitespace-nowrap',
    );
  });

  it('table is hoisted out of the flex-1 middle column (T1 top-up)', () => {
    // The row shell is a plain block; the header line is the inner flex.
    expect(TRANSACTIONS_SRC).toContain(
      'className="p-3 sm:p-3.5 sm:px-6 hover:bg-slate-50/80 transition-colors cursor-pointer"',
    );
    expect(TRANSACTIONS_SRC).toContain(
      '<div className="flex items-center justify-between gap-3">',
    );
    expect(TRANSACTIONS_SRC).not.toContain(
      'sm:px-6 flex items-center justify-between gap-3 hover:',
    );
    // The expanded table renders after the header line (below the
    // Right Side Actions), at full row width — not inside the column.
    expect(TRANSACTIONS_SRC).toContain('[v7.5.95 T1] Expanded table hoisted');
    expect(
      TRANSACTIONS_SRC.indexOf('[v7.5.95 T1] Expanded table hoisted'),
    ).toBeGreaterThan(TRANSACTIONS_SRC.indexOf('Right Side Actions'));
  });
});

describe('Persisted state syncs same-tab between mounted owners (U2)', () => {
  it('broadcasts and listens for the shared persisted-state event', () => {
    expect(HOOK_SRC).toContain("new CustomEvent('ngwe:persisted-state'");
    expect(HOOK_SRC).toContain(
      "window.addEventListener('ngwe:persisted-state'",
    );
    expect(HOOK_SRC).toContain(
      "window.removeEventListener('ngwe:persisted-state'",
    );
    expect(HOOK_SRC).toContain('detail.key !== key');
  });
});

describe('Custom units: type + reappear (U1, U2, U3)', () => {
  it('normalizeMenuUnit strips a mistaken leading number word (v7.6.10)', () => {
    expect(normalizeMenuUnit('တစ်ဗူး')).toBe('ဗူး');
    expect(normalizeMenuUnit('  တစ်ဗူး ')).toBe('ဗူး');
    expect(normalizeMenuUnit('')).toBe(DEFAULT_MENU_UNIT);
    expect(resolveSavedMenuUnit('အခြား')).toBe(DEFAULT_MENU_UNIT);
  });

  it('all unit-select owners share the ngwe_custom_units key', () => {
    for (const src of [SHOPCARD_SRC, TXMODAL_SRC, MAINT_SRC]) {
      expect(src).toContain("'ngwe_custom_units'");
      // [v7.6.24] selects read the merged list (local + shared),
      // not the local list alone.
      expect(src).toContain('menuUnitSelectOptions(knownUnits)');
    }
    // Row-based selects (TransactionModal / AddMaintenanceModal)
    // show the free-text input via the shared helper; ShopCard
    // keeps its own Other + typed-text state for the same input.
    for (const src of [TXMODAL_SRC, MAINT_SRC]) {
      expect(src).toContain('menuUnitNeedsCustomInput(');
    }
    expect(SHOPCARD_SRC).toContain('newItemUnit === OTHER_MENU_UNIT');
    expect(SHOPCARD_SRC).toContain('newItemCustomUnit');
  });

  it('custom townships reappear from the shops list (U3)', () => {
    expect(SHOPMODAL_SRC).toContain('customTownships');
    expect(SHOPMODAL_SRC).toContain('existingShops');
  });
});
