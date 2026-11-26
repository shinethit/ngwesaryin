// [v7.6.42] App-wide compaction sweep, checked GROUP BY GROUP at
// 390px (MY + EN): Shops filter/header, shop cards, Dashboard,
// Records, Wallets, Budget, Analytics, Debts, Vehicles, Data
// Management, Categories, and Notifications. Spacing/sizing ONLY:
// nothing removed, no tap target shrunk, no text truncated, no
// behavior change. The two structural moves: (1) the Shops
// needs-details chip merges into the found-count row (its own
// 44px row is gone); (2) grid shop-card Edit/Delete move from the
// header row to the footer row, because the header actions
// narrowed long names to 3 lines (+22px vs v7.6.39). Source-text
// assertions follow the established pattern (no test renderer in
// this repo; vitest node env). NO path comparisons: sources are
// read via new URL(..., import.meta.url).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  VERSION_HISTORY,
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
} from '../../data/versionHistory';

const read = (rel: string) =>
  readFileSync(new URL(rel, import.meta.url), 'utf8');
const count = (src: string, needle: string) => src.split(needle).length - 1;

const SHOPS_SRC = read('../../components/ShopsView.tsx');
const SHOP_SRC = read('../../components/shops/ShopCard.tsx');
const DASH_SRC = read('../../components/Dashboard.tsx');
const TXN_SRC = read('../../components/TransactionsView.tsx');
const WALLET_SRC = read('../../components/WalletsView.tsx');
const BUDGET_SRC = read('../../components/BudgetAnalyticsView.tsx');
const ANALYTICS_SRC = read('../../components/AnalyticsView.tsx');
const DEBT_SRC = read('../../components/DebtsView.tsx');
const VEH_SRC = read('../../components/vehicles/VehiclesView.tsx');
const DM_SRC = read('../../components/DataManagementView.tsx');
const CAT_SRC = read('../../components/CategoriesView.tsx');
const NOTIF_SRC = read('../../components/NotificationModal.tsx');
const VERSION_JSON = JSON.parse(
  read('../../../public/version.json'),
);

describe('Group 1 — Shops filter + header panel (v7.6.42)', () => {
  it('header card, filter card and root stack are tightened', () => {
    expect(SHOPS_SRC).toContain('<div className="space-y-3 max-w-7xl mx-auto">');
    expect(SHOPS_SRC).toContain('px-3 py-2.5 shadow-xs');
    expect(SHOPS_SRC).toContain('w-8 h-8 rounded-xl bg-emerald-50');
    expect(SHOPS_SRC).toContain('mt-1.5 flex items-center justify-between gap-2 flex-wrap');
    expect(SHOPS_SRC).toContain('p-2.5 shadow-xs space-y-2');
  });

  it('the needs-details chip lives in the found-count row, same toggle and amber state', () => {
    // The label appears twice in UI by design: the toggle button in
    // the count row, plus the pre-existing active-filter ✕ chip that
    // shows while the filter is on. (The English string has a third
    // occurrence in a v7.5.91 code comment.)
    expect(count(SHOPS_SRC, 'အသေးစိတ် မဖြည့်ရသေးသော ဆိုင်များ')).toBe(2);
    expect(count(SHOPS_SRC, 'Shops missing details')).toBe(3);
    expect(SHOPS_SRC).toContain("onClick={() => setShowNeedsDetailsOnly((v) => !v)}");
    expect(SHOPS_SRC).toContain('aria-pressed={showNeedsDetailsOnly}');
    expect(SHOPS_SRC).toContain('bg-amber-100 border-amber-300 text-amber-800');
    expect(SHOPS_SRC).not.toContain('Needs-details filter chip — hidden in item');
    // The chip keeps its 44px target inside the count row.
    expect(SHOPS_SRC).toContain('min-h-[44px] px-3 rounded-xl border text-xs font-bold');
  });

  it('every filter control stays: mode tabs, search, category, location, sort, view toggle', () => {
    expect(SHOPS_SRC).toContain('searchMode');
    expect(SHOPS_SRC).toContain('searchQuery');
    // [v7.6.43] Two-level filter states replace the flat tag filter.
    expect(SHOPS_SRC).toContain('selectedCategoryFilter');
    expect(SHOPS_SRC).toContain('selectedSubTypeFilter');
    expect(SHOPS_SRC).toContain('shop-category-filter');
    expect(SHOPS_SRC).toContain('shop-subcategory-filter');
    expect(SHOPS_SRC).toContain('selectedTownshipFilter');
    expect(SHOPS_SRC).toContain('selectedStateRegionFilter');
    expect(SHOPS_SRC).toContain('sortMode');
    expect(SHOPS_SRC).toContain('viewMode');
    expect(SHOPS_SRC).toContain('တွေ့ရှိ');
  });
});

describe('Group 2 — shop cards, both views (v7.6.42)', () => {
  it('grid header gives the name full width; edit/delete live in the footer row', () => {
    expect(SHOP_SRC).toContain('flex items-center gap-2 flex-wrap min-w-0 flex-1');
    expect(SHOP_SRC).toContain('Edit/delete moved here from the header row');
    // Footer edit/delete keep the same handlers and 44px targets.
    expect(SHOP_SRC).toContain("onClick={() => onOpenEdit(shop)}");
    expect(SHOP_SRC).toContain("onClick={() => onDelete(shop.id, shop.name)}");
    // The vote button is the only action left beside the name.
    expect(SHOP_SRC).toContain('Vote only — edit/delete live in the footer row');
    expect(SHOP_SRC).toContain('onToggleVote(pub)');
  });

  it('the private label truncates instead of pushing the footer row taller', () => {
    expect(SHOP_SRC).toContain('text-amber-700 font-medium truncate min-w-0');
    expect(SHOP_SRC).toContain('ကိုယ်ပိုင်မှတ်တမ်း');
  });

  it('no tap target shrinks: the footer move is target-neutral', () => {
    expect(count(SHOP_SRC, 'min-h-[44px]')).toBe(38);
  });
});

describe('Groups 3–4 — Dashboard and Records stacks (v7.6.42)', () => {
  it('Dashboard root, hero, badge, period label and Quick Access tiles are tightened', () => {
    expect(DASH_SRC).toContain('<div className="space-y-2">');
    expect(DASH_SRC).toContain('rounded-2xl p-3.5 text-white shadow-md');
    expect(DASH_SRC).toContain('mt-1 flex flex-col items-start gap-1');
    expect(DASH_SRC).toContain('text-[11px] font-semibold text-slate-400 mt-1.5');
    expect(DASH_SRC).toContain('bg-white rounded-2xl border border-slate-200 p-1.5');
    expect(DASH_SRC).toContain('grid grid-cols-3 gap-1');
    expect(count(DASH_SRC, 'px-2 py-1.5 rounded-xl bg-')).toBe(6);
    // Amount leading (descender rule) untouched.
    expect(DASH_SRC).toContain('leading-[1.4]');
  });

  it('Records root, group headers, rows and expanded filter panel are tightened', () => {
    expect(TXN_SRC).toContain('<div className="space-y-3">');
    expect(TXN_SRC).toContain('px-4 sm:px-5 pt-3 pb-2 flex items-center justify-between gap-3 border-b border-slate-100');
    expect(TXN_SRC).toContain('p-3 sm:p-3.5 sm:px-6 hover:bg-slate-50/80');
    expect(TXN_SRC).toContain('pt-1 sm:pt-1.5 border-t border-slate-100');
    // v7.6.41 split display untouched by the spacing pass.
    expect(TXN_SRC).toContain('splitShopGroups');
  });
});

describe('Group 5 — Wallets banner and panels (v7.6.42)', () => {
  it('header, banner, summary strip and rates panel are tightened; cards untouched', () => {
    expect(WALLET_SRC).toContain('<div className="space-y-3">');
    expect(WALLET_SRC).toContain('px-3 py-2.5 sm:px-3.5 rounded-2xl');
    expect(WALLET_SRC).toContain('bg-slate-900 p-3.5 sm:p-4 rounded-2xl');
    expect(WALLET_SRC).toContain('p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs');
    expect(WALLET_SRC).toContain('p-3.5 space-y-2.5');
    // Card internals (v7.6.40 redesign) keep their arrangement.
    expect(WALLET_SRC).toContain('col-span-3 py-2 px-2.5');
  });
});

describe('Groups 6–7 — Budget and Analytics stacks (v7.6.42)', () => {
  it('Budget switcher, header, health banner, stat tiles, notes and cards are tightened', () => {
    expect(BUDGET_SRC).toContain('<div className="space-y-3">');
    expect(BUDGET_SRC).toContain('gap-2 bg-white p-2 rounded-2xl');
    expect(BUDGET_SRC).toContain('px-3 py-2.5 sm:px-3.5 rounded-2xl');
    expect(BUDGET_SRC).toContain('p-3.5 sm:p-4 rounded-2xl border transition-all');
    expect(BUDGET_SRC).toContain('w-10 h-10 rounded-2xl');
    expect(BUDGET_SRC).toContain('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3');
    expect(BUDGET_SRC).toContain('bg-white p-3.5 rounded-2xl border transition-all');
    expect(BUDGET_SRC).toContain('grid grid-cols-1 md:grid-cols-2 gap-3');
  });

  it('Analytics tab bar, statement card, ratio card and tab stacks are tightened', () => {
    expect(ANALYTICS_SRC).toContain('<div className="space-y-3">');
    expect(ANALYTICS_SRC).toContain('p-1 flex gap-1');
    expect(ANALYTICS_SRC).toContain('flex-1 py-2 rounded-xl');
    expect(ANALYTICS_SRC).toContain('p-2.5 space-y-1.5');
    expect(ANALYTICS_SRC).toContain('bg-white p-4 rounded-2xl border border-slate-200');
    // Donut legend rows keep their 44px tap targets (separate file pins).
    expect(ANALYTICS_SRC).not.toContain('py-2.5 rounded-xl font-bold');
  });
});

describe('Group 8 — Debts, Vehicles, Data, Categories, Notifications (v7.6.42)', () => {
  it('Debts header, filter, summary and debt cards are tightened', () => {
    expect(DEBT_SRC).toContain('<div className="space-y-3">');
    expect(DEBT_SRC).toContain('gap-3 bg-white p-3.5 sm:p-4 rounded-2xl');
    expect(DEBT_SRC).toContain('bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1.5');
    expect(DEBT_SRC).toContain('grid grid-cols-1 sm:grid-cols-2 gap-3');
    expect(DEBT_SRC).toContain('p-3.5 sm:p-4');
  });

  it('Vehicles root, Free banner and selector card are tightened; stat tiles untouched', () => {
    expect(VEH_SRC).toContain('<div className="space-y-3 max-w-6xl mx-auto">');
    expect(VEH_SRC).toContain('p-3 sm:p-3.5 flex flex-col sm:flex-row');
    expect(VEH_SRC).toContain('bg-white p-2 sm:p-2.5 rounded-3xl');
    expect(VEH_SRC).toContain('px-2.5 py-2 rounded-2xl border border-slate-200/80');
  });

  it('Data Management root, headers, danger and option cards are tightened', () => {
    expect(DM_SRC).toContain('py-3 sm:py-4 space-y-3');
    expect(DM_SRC).toContain('px-3.5 py-3');
    expect(DM_SRC).toContain('p-3.5 sm:p-4 relative overflow-hidden');
    expect(DM_SRC).toContain('p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60');
  });

  it('Categories header, banner and filter strip are tightened', () => {
    expect(CAT_SRC).toContain('<div className="space-y-3">');
    expect(CAT_SRC).toContain('px-3 py-2.5 sm:px-3.5 rounded-2xl');
    expect(CAT_SRC).toContain('p-3.5 sm:p-4 rounded-2xl shadow-2xs');
    expect(CAT_SRC).toContain('p-3 sm:p-3.5 rounded-2xl border border-slate-200');
  });

  it('Notification modal header and body are tightened; chips row untouched', () => {
    expect(NOTIF_SRC).toContain('px-4 py-3 bg-gradient-to-r from-emerald-700');
    expect(NOTIF_SRC).toContain('p-3.5 space-y-2.5 min-h-[250px]');
    expect(NOTIF_SRC).toContain('flex-wrap');
  });
});

describe('Version pins roll to v7.6.42 / build 356', () => {
  it('constants, version.json and the top history entry agree, with no Admin strings', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.46');
    expect(CURRENT_BUILD_NUMBER).toBe(360);
    expect(VERSION_JSON.version).toBe('v7.6.46');
    expect(VERSION_JSON.buildNumber).toBe(360);
    const top = VERSION_HISTORY[0];
    expect(top.version).toBe('v7.6.46');
    expect(top.buildNumber).toBe(360);
    expect(top.changesMy.join(' ')).not.toContain('Admin');
    expect(top.changesEn.join(' ')).not.toContain('Admin');
    expect(top.changesMy.length).toBe(7);
    expect(top.changesEn.length).toBe(7);
  });
});
