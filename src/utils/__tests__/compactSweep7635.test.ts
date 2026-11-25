// [v7.6.35] App-wide compact sweep: the Cloud Sync status card on the
// Data Management screen (and the remaining cards there) become slim;
// the four mini-tiles that duplicated the counts strip above them on
// the SAME screen are removed (same .length values, proven duplicate).
// NO information and NO button/action is removed — only density
// changes. The three sync states keep their EXACT wording.
// Source-text assertions follow the established pattern (no test
// renderer in this repo; vitest node env). NO path comparisons:
// sources are read via new URL(..., import.meta.url).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  VERSION_HISTORY,
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
} from '../../data/versionHistory';

const DM_SRC = readFileSync(
  new URL('../../components/DataManagementView.tsx', import.meta.url),
  'utf8',
);
const VERSION_JSON = JSON.parse(
  readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
);

describe('Data Management Cloud Sync slim row (v7.6.35)', () => {
  it('the section is one slim card: compact padding, slim heading, no intro paragraph', () => {
    expect(DM_SRC).toContain('px-4 py-3.5');
    expect(DM_SRC).toContain('Cloud Sync အခြေအနေ');
    expect(DM_SRC).toContain('Cloud Sync Status');
    expect(DM_SRC).not.toContain('p-6 sm:p-8');
    expect(DM_SRC).not.toContain(
      'သင့်ဒေတာ မည်သည့်အပိုင်းက Cloud Database သို့ ရောက်ရှိပြီးဖြစ်သည်',
    );
    expect(DM_SRC).not.toContain(
      'Check which data has reached the Cloud Database',
    );
    expect(DM_SRC).not.toContain('Big banner');
  });

  it('all three sync states keep their exact wording, counts and progress bar', () => {
    // No-records state
    expect(DM_SRC).toContain('မှတ်တမ်း မရှိသေးပါ — စစ်ဆေးစရာ မရှိပါ');
    expect(DM_SRC).toContain('No records yet — nothing to sync');
    // All-synced state
    expect(DM_SRC).toContain('✓ အားလုံး Cloud Database ပေါ် ရောက်ရှိပြီးဖြစ်သည်');
    expect(DM_SRC).toContain('✓ All records synced to Cloud');
    // Pending state
    expect(DM_SRC).toContain('ခု စက်တွင်းတွင် ကျန်ရှိသည် (Cloud ရောက်ရန် စောင့်ဆိုင်းနေသည်)');
    expect(DM_SRC).toContain('pending (waiting to sync)');
    // Counts, percent, progress bar, state colors
    expect(DM_SRC).toContain('{txCloud}/{txTotal}');
    expect(DM_SRC).toContain('${txPct}% synced');
    expect(DM_SRC).toContain('h-1.5 overflow-hidden');
    expect(DM_SRC).toContain('bg-emerald-50 border border-emerald-200');
    expect(DM_SRC).toContain('bg-amber-50 border border-amber-200');
    expect(DM_SRC).toContain('cloudTxIds');
  });

  it('the four duplicate mini-tiles and the note paragraph are gone; the syncs-on-save fact survives as one caption line', () => {
    expect(DM_SRC).not.toContain('Other collections');
    expect(DM_SRC).not.toContain('grid-cols-2 sm:grid-cols-4');
    expect(DM_SRC).not.toContain('☁️');
    expect(DM_SRC).not.toContain('Syncs on save');
    expect(DM_SRC).not.toContain('မှတ်ချက် —');
    expect(DM_SRC).not.toContain('Precise cloud confirmation');
    expect(DM_SRC).not.toContain('RefreshCw');
    // The one distinct fact, kept as a single caption line (both languages)
    expect(DM_SRC).toContain(
      'အကြွေး၊ ပိုက်ဆံအိတ်၊ ကဏ္ဍနှင့် ဘတ်ဂျက်များသည် သိမ်းတာနဲ့ Cloud ရောက်',
    );
    expect(DM_SRC).toContain(
      'Debts, wallets, categories and budgets sync on save',
    );
  });

  it('the seven-count strip above still shows every count (count audit)', () => {
    for (const [label, expr, unit] of [
      ['စာရင်းမှတ်တမ်း', '{transactions.length}', 'records'],
      ['အကြွေးစာရင်း', '{debts.length}', 'entries'],
      ['ပိုက်ဆံအိတ်များ', '{wallets.length}', 'accounts'],
      ['ကဏ္ဍများ', '{categories.length}', 'categories'],
      ['ဘတ်ဂျက်သတ်မှတ်ချက်', '{budgets.length}', 'targets'],
      ['ယာဉ်များ', '{vehicles.length}', 'vehicles'],
      ['ဆိုင်များ', '{shops.length}', 'shops'],
    ] as const) {
      expect(DM_SRC).toContain(label);
      expect(DM_SRC).toContain(expr);
      expect(DM_SRC).toContain(unit);
    }
  });

  it('every action and warning on the screen is kept', () => {
    expect(DM_SRC).toContain('btn-clear-all-data-main');
    expect(DM_SRC).toContain('ဒေတာအားလုံး ဖျက်မည်');
    expect(DM_SRC).toContain('သတိပြုရန် - ပြန်လည်ရယူနိုင်မည် မဟုတ်ပါ');
    expect(DM_SRC).toContain('btn-export-backup');
    expect(DM_SRC).toContain('JSON Backup သိမ်းမည်');
    expect(DM_SRC).toContain('btn-export-csv');
    expect(DM_SRC).toContain('CSV ထုတ်ယူမည်');
    expect(DM_SRC).toContain('lbl-import-backup');
    expect(DM_SRC).toContain('JSON Backup ထည့်မည်');
    expect(DM_SRC).toContain('Premium နှင့် Activation Code');
    expect(DM_SRC).toContain('Activation Code ထည့်မည် / အဆင့်မြှင့်မည်');
    // Remaining cards use compact padding
    expect(DM_SRC).toContain('p-4 sm:p-5');
    expect(DM_SRC).toContain('px-4 py-3.5');
  });
});

// ---------- Version bump to v7.6.35 (build 349) ----------
describe('Version bump to v7.6.35 (build 349)', () => {
  it('version constants and history entry match version.json', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.35');
    expect(CURRENT_BUILD_NUMBER).toBe(349);
    expect(VERSION_JSON.version).toBe('v7.6.35');
    expect(VERSION_JSON.buildNumber).toBe(349);
    const entry = VERSION_HISTORY[0];
    expect(entry.version).toBe('v7.6.35');
    expect(entry.buildNumber).toBe(349);
    expect(entry.releaseDate).toBe('2026-11-25');
    expect(entry.tag).toBe('feature');
    expect(entry.titleMy).toBe('နေရာအပိုယူနေတဲ့ ကတ်တွေ ကျစ်လစ်စေခြင်း');
    expect(entry.titleEn).toBe('Compact cards across the whole app');
    expect(entry.changesMy).toEqual([
      'အက်ပ်တစ်ခုလုံးမှာ နေရာအပိုယူနေတဲ့ ကတ်တွေကို ကျစ်လစ်အောင် ပြင်သည် — အချက်အလက်နဲ့ ခလုတ်အကုန် ရှိနေမည်',
    ]);
    expect(entry.changesEn).toEqual([
      'Cards that wasted space across the whole app are now compact — every number and button stays in place.',
    ]);
  });

  it('change log has no Admin content and releasedAt is present-only', () => {
    expect(VERSION_JSON.changesMy.join(' ')).not.toContain('Admin');
    expect(VERSION_JSON.changesEn.join(' ')).not.toContain('Admin');
    expect(JSON.stringify(VERSION_HISTORY[0])).not.toContain('Admin');
    expect(typeof VERSION_JSON.releasedAt).toBe('string');
    expect(VERSION_JSON.releasedAt.length).toBeGreaterThan(0);
  });
});

// ---------- Per-screen count audit (v7.6.35 sweep) ----------
// Every number/button present before the sweep must still be present
// after it; only PROVEN duplicates and title-repeating subtitles go.
// Left-alone items are pinned present too (D2 summary count, D3 debt
// badge, debt description, AdBanner subtitle) so a future edit cannot
// silently drop them.
const readSrc = (p: string) =>
  readFileSync(new URL(p, import.meta.url), 'utf8');

const APP_SRC = readSrc('../../App.tsx');
const DASH_SRC = readSrc('../../components/Dashboard.tsx');
const TXN_SRC = readSrc('../../components/TransactionsView.tsx');
const DEBT_SRC = readSrc('../../components/DebtsView.tsx');
const VEH_SRC = readSrc('../../components/vehicles/VehiclesView.tsx');
const FUEL_CHART_SRC = readSrc('../../components/vehicles/FuelPriceChart.tsx');
const SHOP_SRC = readSrc('../../components/ShopsView.tsx');
const BUDGET_SRC = readSrc('../../components/BudgetAnalyticsView.tsx');
const SPEND_SRC = readSrc('../../components/SpendingComparisonView.tsx');
const DONUT_SRC = readSrc('../../components/CurrentMonthExpenseDonutChart.tsx');
const TREND_SRC = readSrc(
  '../../components/CategorySpendingTrendLineChart.tsx',
);
const DAILY_SRC = readSrc('../../components/DailySpendingLimitCard.tsx');
const MONTHCOMP_SRC = readSrc('../../components/MonthlyComparisonCard.tsx');
const SAVINGS_SRC = readSrc('../../components/MonthlySavingsTarget.tsx');
const ITEM_SRC = readSrc('../../components/ItemPriceAnalyticsView.tsx');
const CAT_SRC = readSrc('../../components/CategoriesView.tsx');
const WALLET_SRC = readSrc('../../components/WalletsView.tsx');
const AD_SRC = readSrc('../../components/AdBanner.tsx');
const QUOTA_SRC = readSrc(
  '../../components/QuotaExceededNotificationBanner.tsx',
);

describe('App shell and Dashboard density (v7.6.35)', () => {
  it('tab wrappers use space-y-4 and the main column is py-4', () => {
    expect(APP_SRC).not.toContain('space-y-6');
    expect(APP_SRC).toContain('py-4');
  });

  it('Quick Access heading and tiles stay; the repeating intro line is gone', () => {
    expect(DASH_SRC).toContain('Quick Access');
    expect(DASH_SRC).toContain('ဘတ်ဂျက်');
    expect(DASH_SRC).not.toContain(
      'ဘတ်ဂျက်၊ အစီရင်ခံစာ၊ ဈေးနှုန်း နှိုင်းယှဉ် စတာတွေ ဒီမှာရှိပါတယ်',
    );
    expect(DASH_SRC).not.toContain(
      'Budgets, reports, price comparison and more live here',
    );
  });
});

describe('Records and Debts density (v7.6.35)', () => {
  it('Records root gap and empty state are compact; the summary count stays (D2 left alone)', () => {
    expect(TXN_SRC).not.toContain('space-y-6');
    expect(TXN_SRC).toContain('py-5');
    expect(TXN_SRC).toContain('({filtered.length}');
    expect(TXN_SRC).toContain('filterNotice');
  });

  it('Debts gaps and cards are compact; badge, quota chip and description stay (D3/F-De4 left alone)', () => {
    expect(DEBT_SRC).not.toContain('space-y-6');
    expect(DEBT_SRC).toContain('p-4 sm:p-5');
    expect(DEBT_SRC).toContain('ခု လက်ကျန်');
    expect(DEBT_SRC).toContain('သူများဆီက ရရန်ရှိငွေနှင့် သူများကို ပြန်ပေးရန်ရှိငွေများကို အကြေဆပ်သည်အထိ မှတ်တမ်းတင်ပါ');
    expect(DEBT_SRC).toContain('Track loans, customer credits, and personal debts with installment tracking');
    expect(DEBT_SRC).toContain('သူများဆီက ရရန်ရှိငွေ (Receivable)');
    expect(DEBT_SRC).toContain('Money Owed to You');
  });
});

describe('Vehicles and Shops density (v7.6.35)', () => {
  it('Vehicles roots, hero, feature cards, empty logs and section cards are compact', () => {
    expect(VEH_SRC).not.toContain('space-y-6');
    expect(VEH_SRC).not.toContain('p-8');
    expect(VEH_SRC).toContain('rounded-3xl p-5 text-white');
    expect(VEH_SRC).toContain('px-4 py-4 text-center bg-slate-50 rounded-2xl');
    expect(VEH_SRC).not.toContain('Historical pressure readings');
    expect(VEH_SRC).not.toContain('တာယာ လေပေါင် မှတ်တမ်းဟောင်းများ');
    expect(VEH_SRC).toContain('Fuel Fill-up History');
    expect(VEH_SRC).toContain('ဆီထည့်စာရင်း မှတ်တမ်းများ');
    expect(VEH_SRC).toContain('Replacement & Maintenance Logs');
    expect(VEH_SRC).toContain('Tire Check History');
  });

  it('Fuel price chart no-data state is compact; the chart itself is untouched', () => {
    expect(FUEL_CHART_SRC).toContain('px-4 py-4');
    expect(FUEL_CHART_SRC).toContain('AreaChart');
  });

  it('Shops lock screen, state cards and grouped view are compact', () => {
    expect(SHOP_SRC).not.toContain('p-10');
    expect(SHOP_SRC).toContain('p-5 sm:p-6');
    expect(SHOP_SRC).toContain('p-5 text-center space-y-2');
    expect(SHOP_SRC).toContain('ဆိုင်များ');
  });
});

describe('Budget density and removed duplicates (v7.6.35)', () => {
  it('quota chip stays; the restating parenthetical is gone', () => {
    expect(BUDGET_SRC).toContain('Budget Categories Quota:');
    expect(BUDGET_SRC).toContain('ဘတ်ဂျက်ကဏ္ဍ အသုံးပြုမှု:');
    expect(BUDGET_SRC).not.toContain('plan supports up to');
    expect(BUDGET_SRC).not.toContain('အဆင့်တွင် ဘတ်ဂျက်ကဏ္ဍ အများဆုံး');
  });

  it('both duplicate budgets.length counts are gone; the quota chip count stays', () => {
    expect(BUDGET_SRC).not.toContain('categories combined');
    expect(BUDGET_SRC).not.toContain(
      "{budgets.length} {lang === 'my' ? 'ကဏ္ဍ' : 'categories'}",
    );
    expect(BUDGET_SRC).toContain('{budgets.length}');
    expect(BUDGET_SRC).toContain('Budget Categories for');
    expect(BUDGET_SRC).toContain('အတွက် ဘတ်ဂျက်ကဏ္ဍများ');
  });

  it('budget cards, amounts and footer are compact; Edit/Delete stay', () => {
    expect(BUDGET_SRC).not.toContain('space-y-6');
    expect(BUDGET_SRC).toContain('bg-white p-4 rounded-2xl border');
    expect(BUDGET_SRC).toContain('ပြင်ဆင်မည်');
    expect(BUDGET_SRC).toContain('ဖျက်မည်');
  });
});

describe('Spending Comparison density (v7.6.35)', () => {
  it('panels, gaps and empty states are compact; Free notice wording stays', () => {
    expect(SPEND_SRC).not.toContain('space-y-6');
    expect(SPEND_SRC).not.toContain('p-5 sm:p-7');
    expect(SPEND_SRC).toContain('p-4 sm:p-5');
    expect(SPEND_SRC).toContain('py-5 text-center');
    expect(SPEND_SRC).toContain('bg-amber-50/90');
    expect(SPEND_SRC).toContain('Free Plan Restrictive Notice Banner');
    expect(SPEND_SRC).toContain('mb-3 bg-amber-50/90');
  });
});

describe('Analytics chart-card headers (v7.6.35)', () => {
  it('donut, trend and daily subtitles are gone; titles and charts stay', () => {
    expect(DONUT_SRC).toContain('Expense Donut Chart');
    expect(DONUT_SRC).not.toContain('Visual breakdown of where your money');
    expect(DONUT_SRC).toContain('py-4 text-center');
    expect(TREND_SRC).toContain('6-Month Spending Trends Across Categories');
    expect(TREND_SRC).toContain('လွန်ခဲ့သော ၆ လအတွင်း အမျိုးအစားအလိုက် ထွက်ငွေ Trends');
    expect(TREND_SRC).not.toContain(
      'Visualize financial growth or decline over the last 6 months',
    );
    expect(TREND_SRC).toContain('py-4 text-center');
    expect(DAILY_SRC).toContain('Daily Spending Limit');
    expect(DAILY_SRC).not.toContain('Monitor daily burn rate and budget');
    expect(MONTHCOMP_SRC).toContain('py-4 text-center');
  });

  it('savings target card is compact; its buttons and blur decoration stay', () => {
    expect(SAVINGS_SRC).toContain('p-4 sm:p-5 z-10 space-y-4');
    expect(SAVINGS_SRC).toContain('min-h-11');
    expect(SAVINGS_SRC).toContain('blur-');
  });

  it('item price tab gaps and boxes are compact; the 5-item limit notice stays', () => {
    expect(ITEM_SRC).not.toContain('space-y-6');
    expect(ITEM_SRC).not.toContain('p-5 sm:p-6');
    expect(ITEM_SRC).toContain('p-4 sm:p-5');
    expect(ITEM_SRC).toContain('ပစ္စည်း ၅ မျိုးထိသာ');
    expect(ITEM_SRC).toContain('ResponsiveContainer');
  });
});

describe('Categories, Wallets and banners (v7.6.35)', () => {
  it('Categories empty state is compact', () => {
    expect(CAT_SRC).not.toContain('py-12');
    expect(CAT_SRC).toContain('py-5 text-center');
  });

  it('Wallets empty state, grid, cards and exchange panel are compact; totals banner stays', () => {
    expect(WALLET_SRC).toContain('px-4 py-5 text-center');
    expect(WALLET_SRC).not.toContain('sm:gap-6');
    expect(WALLET_SRC).toContain('bg-white rounded-3xl p-4 border');
    expect(WALLET_SRC).toContain('p-4 space-y-3');
    expect(WALLET_SRC).toContain('စုစုပေါင်း ဘဏ္ဍာငွေ လက်ကျန် (ကျပ်ဖြင့်)');
  });

  it('AdBanner is slimmer but subtitle, upgrade action and dismiss stay', () => {
    expect(AD_SRC).toContain('gap-2');
    expect(AD_SRC).toContain('Premium သို့ မြှင့်ပါ');
    expect(AD_SRC).toContain('Upgrade to Premium');
    expect(AD_SRC).toContain('ခေတ္တပိတ်မည်');
    expect(AD_SRC).toContain('handleDismiss');
  });

  it('Quota banner is slimmer; every action and line of text stays', () => {
    expect(QUOTA_SRC).toContain('px-4 py-2');
    expect(QUOTA_SRC).toContain('View Sync Status');
    expect(QUOTA_SRC).toContain('Retry & Verify Sync');
    expect(QUOTA_SRC).toContain('Sync Status ကြည့်ရန်');
    expect(QUOTA_SRC).toContain('write quota is exhausted');
  });
});
