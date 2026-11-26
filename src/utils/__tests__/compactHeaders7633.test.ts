// [v7.6.33] Compact & Modernized headers/stat strips: the big header
// cards and count-tile grids on Categories, Wallets, Data Management
// (and the Budget header, same pattern) become slim single rows and
// one-line summary strips. NO information and NO button is removed —
// every count, badge, chip and action stays; only density changes.
// Wallets' dark total-balance banner stays with all its lines.
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

const CAT_SRC = readFileSync(
  new URL('../../components/CategoriesView.tsx', import.meta.url),
  'utf8',
);
const WAL_SRC = readFileSync(
  new URL('../../components/WalletsView.tsx', import.meta.url),
  'utf8',
);
const DM_SRC = readFileSync(
  new URL('../../components/DataManagementView.tsx', import.meta.url),
  'utf8',
);
const BUD_SRC = readFileSync(
  new URL('../../components/BudgetAnalyticsView.tsx', import.meta.url),
  'utf8',
);
const VEH_SRC = readFileSync(
  new URL('../../components/vehicles/VehiclesView.tsx', import.meta.url),
  'utf8',
);
const VERSION_JSON = JSON.parse(
  readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
);

function block(src: string, start: string, end: string): string {
  const s = src.indexOf(start);
  expect(s).toBeGreaterThan(-1);
  const e = src.indexOf(end, s);
  expect(e).toBeGreaterThan(s);
  return src.slice(s, e);
}

describe('Categories compact header + stat strip (v7.6.33)', () => {
  it('the header is one slim row: icon + title + badge + the same two actions, no description', () => {
    const head = block(CAT_SRC, 'Header — compact single row', 'Free Plan Lock Notice');
    expect(head).toContain('px-3 py-2.5');
    expect(head).toContain('ကဏ္ဍများနှင့် ကဏ္ဍခွဲများ');
    expect(head).toContain('Categories & Sub-Categories');
    expect(head).toContain('Premium Unlocked');
    expect(head).toContain('Free View Only');
    expect(head).toContain('ကဏ္ဍများ ပေါင်းစပ်ရှင်းလင်းရန်');
    expect(head).toContain('ကဏ္ဍအသစ် ထည့်မည်');
    expect(head).not.toContain('ဝင်ငွေ၊ ထွက်ငွေ အဓိကကဏ္ဍ');
    expect(head).not.toContain('p-5 sm:p-6');
  });

  it('the four stat tiles are one strip showing all four counts', () => {
    const strip = block(CAT_SRC, 'Stats Summary Strip', 'Filter Tabs and Search Bar');
    expect(strip).toContain('{categories.length}');
    expect(strip).toContain('{totalSubCategoriesCount}');
    expect(strip).toContain("c.type === 'expense'");
    expect(strip).toContain("c.type === 'income'");
    expect(strip).toContain('ကဏ္ဍ စုစုပေါင်း');
    expect(strip).toContain('ကဏ္ဍခွဲ စုစုပေါင်း');
    expect(strip).toContain('ထွက်ငွေ ကဏ္ဍများ');
    expect(strip).toContain('ဝင်ငွေ ကဏ္ဍများ');
    expect(strip).toContain('Total Categories');
    expect(strip).toContain('Expense Categories');
    expect(strip).not.toContain('Stats Summary Bar');
    expect(strip).not.toContain('grid-cols-2 sm:grid-cols-4');
  });
});

describe('Wallets compact header + tightened banner (v7.6.33)', () => {
  it('the header is one slim row: title + count chip + Rates + Add, no description', () => {
    const head = block(WAL_SRC, 'Header — compact single row', 'Total Net Assets Banner');
    expect(head).toContain('px-3 py-2.5');
    expect(head).toContain('ပိုက်ဆံအိတ်များနှင့် ဘဏ်အကောင့်များ');
    expect(head).toContain('Wallets & Bank Accounts');
    expect(head).toContain('ပိုက်ဆံအိတ်');
    expect(head).toContain('ငွေလဲနှုန်းများ');
    expect(head).toContain('+ အကောင့်သစ်');
    expect(head).not.toContain('ငွေသား၊ KPay');
    expect(head).not.toContain('p-5 sm:p-6');
  });

  it('the dark balance banner keeps every line and both buttons, only tighter', () => {
    const banner = block(WAL_SRC, 'Total Net Assets Banner', 'Expandable Exchange Rates');
    expect(banner).toContain('p-3.5 sm:p-4 rounded-2xl');
    expect(banner).toContain('စာရင်းညှိမည်');
    expect(banner).toContain('ငွေလွှဲမည်');
    expect(banner).toContain('ယင်းအထဲက မျှဝေထားသော အကောင့်');
    expect(banner).toContain('သီးသန့် (မရောပါ)');
    expect(banner).toContain('အကောင့်အားလုံး စုစုပေါင်း');
    expect(banner).toContain('currencyBreakdown');
    expect(banner).not.toContain('p-6 rounded-3xl');
  });
});

describe('Data Management compact header + counts strip (v7.6.33)', () => {
  it('the header is one slim row with the badge; the seven tiles are one strip with all counts', () => {
    const head = block(DM_SRC, 'Header — compact single row', 'Cloud Sync Status');
    expect(head).toContain('ဒေတာ စီမံခန့်ခွဲမှု');
    expect(head).toContain('Data Management & Reset');
    expect(head).toContain('Premium Active');
    expect(head).not.toContain('သင့်စာရင်းဒေတာများကို သိမ်းဆည်းခြင်း');
    expect(head).not.toContain('Live Stored Data Counts Grid');
    expect(head).not.toContain('grid-cols-2 sm:grid-cols-4 lg:grid-cols-7');
    for (const [label, expr, unit] of [
      ['စာရင်းမှတ်တမ်း', '{transactions.length}', 'records'],
      ['အကြွေးစာရင်း', '{debts.length}', 'entries'],
      ['ပိုက်ဆံအိတ်များ', '{wallets.length}', 'accounts'],
      ['ကဏ္ဍများ', '{categories.length}', 'categories'],
      ['ဘတ်ဂျက်သတ်မှတ်ချက်', '{budgets.length}', 'targets'],
      ['ယာဉ်များ', '{vehicles.length}', 'vehicles'],
      ['ဆိုင်များ', '{shops.length}', 'shops'],
    ] as const) {
      expect(head).toContain(label);
      expect(head).toContain(expr);
      expect(head).toContain(unit);
    }
  });

  it('the Cloud Sync card below is untouched', () => {
    expect(DM_SRC).toContain('Cloud Sync အခြေအနေ');
    expect(DM_SRC).toContain('Cloud Sync Status');
    expect(DM_SRC).toContain('cloudTxIds');
  });
});

describe('Budget header compacted, the rest of the sweep left alone (v7.6.33)', () => {
  it('the Budget header is one slim row with every control kept, no description', () => {
    const head = block(BUD_SRC, 'Header & Controls — compact single row', 'Plan & Category Quota Indicator');
    expect(head).toContain('px-3 py-2.5');
    expect(head).toContain('လစဉ် ဘတ်ဂျက် စီမံခန့်ခွဲမှု');
    expect(head).toContain('Monthly Budget Management');
    expect(head).toContain('ဘတ်ဂျက် ထိန်းချုပ်စနစ်');
    expect(head).toContain('type="month"');
    expect(head).toContain('+ ဘတ်ဂျက်ကဏ္ဍ အသစ်ထည့်မည်');
    expect(head).toContain('ရောထားသည်');
    expect(head).toContain('သီးသန့်');
    expect(head).toContain('အားလုံး');
    expect(head).not.toContain('ဝင်ငွေ၏ ရာခိုင်နှုန်း');
    expect(head).not.toContain('p-5 rounded-2xl');
  });

  it('Vehicles metrics were already ultra-compact and Shops has no header banner — both untouched', () => {
    expect(VEH_SRC).toContain('Key metrics — ultra-compact single-row cards');
    expect(VEH_SRC).not.toContain('compact single row [v7.6.33]');
  });
});

// ---------- Version bump to v7.6.41 (build 355) ----------

describe('Version bump to v7.6.41 (build 355)', () => {
  it('version constants and history entry match version.json', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.48');
    expect(CURRENT_BUILD_NUMBER).toBe(362);
    expect(VERSION_JSON.version).toBe('v7.6.48');
    expect(VERSION_JSON.buildNumber).toBe(362);
    const entry = VERSION_HISTORY[0];
    expect(entry.version).toBe('v7.6.48');
    expect(entry.buildNumber).toBe(362);
    expect(entry.releaseDate).toBe('2026-11-26');
    expect(entry.tag).toBe('feature');
    expect(entry.titleMy).toBe('အိုင်ကွန်ရုပ်ပုံ အစုံအလင် — အုပ်စု ၁၄ ခု၊ ရုပ်ပုံ ၄၆၃ ခု');
    expect(entry.titleEn).toBe('Complete pictorial icon library — 14 packs, 463 pictures');
    expect(entry.changesMy).toEqual(VERSION_JSON.changesMy);
    expect(entry.changesEn).toEqual(VERSION_JSON.changesEn);
    expect(entry.changesMy).toHaveLength(8);
    expect(entry.changesEn).toHaveLength(8);
    expect(entry.changesMy[0]).toBe(
      'ကဏ္ဍအိုင်ကွန်ရုပ်ပုံတွေ အကုန်လုံး ရောက်လာပါပြီ — အုပ်စု ၁၄ ခု၊ ရုပ်ပုံ ၄၆၃ ခု၊ အိမ်၊ ပြုပြင်ရေး၊ အစားအသောက်၊ မီးဖိုချောင်၊ နေ့စဉ်သုံး၊ အလှအပ၊ အိမ်မွေးတိရစ္ဆာန်၊ ကျန်းမာရေး၊ အချစ်၊ ခရီး၊ ငွေ၊ ဖျော်ဖြေရေး၊ ရာသီပွဲများနဲ့ အခြားအကုန်ပါပါတယ်',
    );
    expect(entry.changesEn[0]).toBe(
      'The full pictorial icon library is here — 463 pictures in 14 packs: home, repairing, food, kitchen, daily care, beauty, pets, health, love, travel, money, entertainment, seasonal and more',
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
