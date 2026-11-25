// [v7.5.88] Price Compare UX: answer cards first on mobile, row tap
// opens the item's card, shorter copy, Premium tile rename.
// Source-text assertions (same pattern as userGuide777.test.ts) — the
// component has no test renderer in this repo (vitest node env, no
// testing-library), and the grid reorder is verified by renders.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  VERSION_HISTORY,
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
} from '../../data/versionHistory';

const COMPARE_SRC = readFileSync(
  new URL('../../components/ItemPriceAnalyticsView.tsx', import.meta.url),
  'utf8',
);
const DASHBOARD_SRC = readFileSync(
  new URL('../../components/Dashboard.tsx', import.meta.url),
  'utf8',
);
const GUIDE_SRC = readFileSync(
  new URL('../../components/UserGuideModal.tsx', import.meta.url),
  'utf8',
);
const ANALYTICS_SRC = readFileSync(
  new URL('../../components/AnalyticsView.tsx', import.meta.url),
  'utf8',
);
const VERSION_JSON = JSON.parse(
  readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
);

describe('Price Compare v7.5.88 — answer first, row tap opens the card', () => {
  it('metric cards are the first grid child on mobile, selector second, chart+table third', () => {
    // Three direct grid children with explicit desktop placement.
    expect(COMPARE_SRC).toContain('order-1 lg:col-start-5 lg:col-span-8 lg:row-start-1');
    expect(COMPARE_SRC).toContain('order-2 lg:col-start-1 lg:row-start-1 lg:row-span-2 lg:col-span-4');
    expect(COMPARE_SRC).toContain('order-3 lg:col-start-5 lg:col-span-8 lg:row-start-2 space-y-4');
    // No leftover single right column wrapping cards + chart + table.
    expect(COMPARE_SRC).not.toContain('RIGHT COLUMN: Chart, Summary Metric Cards');
  });

  it('header is one line; the name-consistency tip lives under the search box', () => {
    expect(COMPARE_SRC).toContain('ပစ္စည်းတစ်ခုကို နှိပ်ရင် ကိုယ်ဝယ်ခဲ့တဲ့ဈေးနဲ့ တခြားဆိုင်တွေရဲ့ဈေး ယှဉ်ပြမယ်');
    expect(COMPARE_SRC).toContain('Tap an item to compare your price with other shops’ prices');
    expect(COMPARE_SRC).not.toContain('ဝယ်ခဲ့သမျှ ပစ္စည်းတစ်ခုချင်းစီ၏ ဝယ်ယူခဲ့သောအကြိမ်ရေ');
    expect(COMPARE_SRC).not.toContain('Select custom items to visualize price changes');
    // Short tip under the search box, not the long header version.
    expect(COMPARE_SRC).toContain('💡 ပစ္စည်းအမည်ကို တစ်သမတ်တည်း ရေးမှ နှိုင်းယှဉ်နိုင်ပါတယ်');
    expect(COMPARE_SRC).toContain('💡 Prices compare only when the item name is always written the same way');
    expect(COMPARE_SRC).not.toContain('“ဆန်” ကို အမြဲ “ဆန်” လို့ပဲ ရေးပါ');
  });

  it('header pill does not wrap mid-word', () => {
    expect(COMPARE_SRC).toContain('border-indigo-200 whitespace-nowrap shrink-0');
  });

  it('row tap opens the item card; the checkbox alone toggles chart membership', () => {
    expect(COMPARE_SRC).toContain('handleOpenItem');
    expect(COMPARE_SRC).toContain('onClick={() => handleOpenItem(item.chartKey)}');
    // The checkbox square now has its own handler with stopPropagation
    // (before v7.5.88 it was a plain div with no onClick at all).
    const stopIdx = COMPARE_SRC.indexOf('e.stopPropagation();');
    const toggleIdx = COMPARE_SRC.indexOf('handleToggleItem(item.chartKey);', stopIdx);
    expect(stopIdx).toBeGreaterThan(-1);
    expect(toggleIdx).toBeGreaterThan(stopIdx);
    // The 🏪 one-liner keeps its own stopPropagation navigation.
    expect(COMPARE_SRC).toContain('handleOpenShopSearch(item)');
    // Metric cards carry an id + a brief highlight ring.
    expect(COMPARE_SRC).toContain('id={`compare-card-${item.chartKey}`}');
    expect(COMPARE_SRC).toContain('highlightedKey');
    expect(COMPARE_SRC).toContain('ring-2 ring-indigo-400');
    expect(COMPARE_SRC).toContain('setTimeout(() => setHighlightedKey(null), 2000)');
    // The 5-max rule still warns instead of adding a 6th item.
    expect(COMPARE_SRC).toContain('setLimitNotice(true)');
  });

  it('badge counts items, and the Top 3 button names the most-bought items', () => {
    expect(COMPARE_SRC).toContain('`${activeSelectedItems.length} / 5 မျိုး`');
    expect(COMPARE_SRC).toContain('`${activeSelectedItems.length} / 5 items`');
    expect(COMPARE_SRC).not.toContain('{activeSelectedItems.length} / 5\n');
    expect(COMPARE_SRC).toContain('⚡ အဝယ်များဆုံး ၃ မျိုး ရွေးမည်');
    expect(COMPARE_SRC).toContain('⚡ Top 3 most-bought');
    expect(COMPARE_SRC).not.toContain('ထိပ်ဆုံး ၃ မျိုး');
    expect(COMPARE_SRC).not.toContain('Top 3 Items');
    // The rename is honest: the catalog is sorted by purchase count.
    expect(COMPARE_SRC).toContain('b.totalPurchases - a.totalPurchases');
  });

  it('empty purchase-table copy no longer says "left"', () => {
    expect(COMPARE_SRC).toContain('ပစ္စည်းများကို အပေါ်က စာရင်းမှ ရွေးချယ်ပြီး မှတ်တမ်းအသေးစိတ်ကို ကြည့်ရှုနိုင်ပါသည်');
    expect(COMPARE_SRC).not.toContain('ဘယ်ဘက်မှ');
    // EN was already "from the catalog" (no "from the left") — untouched.
    expect(COMPARE_SRC).toContain('Select items from the catalog to inspect their purchase history');
  });

  it('empty frequency-chart copy no longer says "left" either', () => {
    expect(COMPARE_SRC).toContain('ပစ္စည်း မရွေးထားပါ — အပေါ်က စာရင်းမှ ရွေးချယ်ပါ');
    expect(COMPARE_SRC).not.toContain('ဘယ်ဘက်စာရင်း');
  });

  it('v7.5.87 shop section is untouched', () => {
    expect(COMPARE_SRC).toContain('တခြားဆိုင်တွေရဲ့ဈေး');
    expect(COMPARE_SRC).toContain("Other shops' prices");
  });
});

describe('Price Compare v7.5.88 — Plans tile rename', () => {
  it('Dashboard Plans tile is "Premium ဈေးနှုန်း" / "Premium Pricing"', () => {
    expect(DASHBOARD_SRC).toContain('Premium ဈေးနှုန်း');
    expect(DASHBOARD_SRC).toContain('Premium Pricing');
    expect(DASHBOARD_SRC).not.toContain("{lang === 'my' ? 'ဈေးနှုန်း' : 'Plans'}");
    // The Price Compare tile itself is unchanged.
    expect(DASHBOARD_SRC).toContain("{lang === 'my' ? 'ဈေးနှုန်း နှိုင်းယှဉ်' : 'Price Compare'}");
  });

  it('User Guide names the renamed Plans page', () => {
    expect(GUIDE_SRC).toContain('"Premium ဈေးနှုန်း" (Plans)');
    expect(GUIDE_SRC).not.toContain('"ဈေးနှုန်း" (Plans)');
  });

  it('Analytics tab bar is untouched (no nowrap added)', () => {
    expect(ANALYTICS_SRC).not.toContain('whitespace-nowrap');
  });
});

describe('Version v7.6.27 — history entry and version.json in sync', () => {
  it('current version is v7.6.27 / build 341', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.36');
    expect(CURRENT_BUILD_NUMBER).toBe(350);
    expect(VERSION_JSON.version).toBe('v7.6.36');
    expect(VERSION_JSON.buildNumber).toBe(350);
    // releasedAt is never rewritten by a version bump — assert only
    // that it is present (its exact value differs per machine: the
    // v7.5.77 script sets it dynamically, so NEVER assert a specific
    // timestamp here — that fails on any other machine).
    expect(typeof VERSION_JSON.releasedAt).toBe('string');
    expect(VERSION_JSON.releasedAt.length).toBeGreaterThan(0);
  });

  it('top history entry is the v7.6.24 fix entry with no Admin mention', () => {
    const entry = VERSION_HISTORY[0];
    expect(entry.version).toBe('v7.6.36');
    expect(entry.buildNumber).toBe(350);
    expect(entry.releaseDate).toBe('2026-11-25');
    expect(entry.tag).toBe('fix');
    expect(entry.tagLabelMy).toBe('Bug Fix');
    expect(entry.tagLabelEn).toBe('Bug Fix');
    expect(entry.titleMy).toBe('PDF စာရင်းရှင်းတမ်း — A4၊ chart များနှင့် iOS ပြင်ဆင်မှု');
    expect(entry.titleEn).toBe('PDF statement: A4 pages, charts, and the iOS fix');
    const entryText = JSON.stringify(entry);
    expect(entryText).not.toContain('Admin');
    expect(entry.changesMy).toEqual(VERSION_JSON.changesMy);
    expect(entry.changesEn).toEqual(VERSION_JSON.changesEn);
    expect(entry.changesMy).toHaveLength(1);
    expect(entry.changesEn).toHaveLength(1);
  });
});
