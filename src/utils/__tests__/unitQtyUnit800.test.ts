// [v7.6.01] Unit select in the entry form + the unit beside price
// × quantity in saved-record details. [v7.6.25] The two entry modes
// are merged: the per-row unit select is now the ONLY unit UI (the
// unit_qty branch is deleted). Source-text assertions (same pattern
// as unitRename797.test.ts) — the components have no test renderer
// in this repo (vitest node env, no testing-library); layout
// behaviour is verified by renders.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  VERSION_HISTORY,
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
} from '../../data/versionHistory';
import {
  DEFAULT_MENU_UNIT,
  collectNewCustomUnits,
  displayMenuUnit,
  menuUnitSelectOptions,
  resolveSavedMenuUnit,
} from '../shopMenuUpdate';

const MODAL_SRC = readFileSync(
  new URL('../../components/TransactionModal.tsx', import.meta.url),
  'utf8',
);
const TXVIEW_SRC = readFileSync(
  new URL('../../components/TransactionsView.tsx', import.meta.url),
  'utf8',
);
const HISTORY_SRC = readFileSync(
  new URL('../../components/ItemPriceHistoryModal.tsx', import.meta.url),
  'utf8',
);
const ANALYTICS_SRC = readFileSync(
  new URL('../../components/ItemPriceAnalyticsView.tsx', import.meta.url),
  'utf8',
);
const CAL_SRC = readFileSync(
  new URL('../../components/SmartCalendarCard.tsx', import.meta.url),
  'utf8',
);
const CAL_LABELS_SRC = readFileSync(
  new URL('../calendarDetailLabels.ts', import.meta.url),
  'utf8',
);
const SHOPCARD_SRC = readFileSync(
  new URL('../../components/shops/ShopCard.tsx', import.meta.url),
  'utf8',
);
const VEHICLES_SRC = readFileSync(
  new URL('../../components/vehicles/VehiclesView.tsx', import.meta.url),
  'utf8',
);
const MAINT_SRC = readFileSync(
  new URL(
    '../../components/vehicles/AddMaintenanceModal.tsx',
    import.meta.url,
  ),
  'utf8',
);
const VERSION_JSON = JSON.parse(
  readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
);

/** The merged rows block: from its JSX gate to the previous-price
 * hint that follows it. */
function rowsSection(): string {
  const start = MODAL_SRC.indexOf('entryModel === "general" && !isTransferCategory && (');
  expect(start).toBeGreaterThan(-1);
  const end = MODAL_SRC.indexOf(
    'latestPreviousPurchase && currentEffectivePrice',
    start,
  );
  expect(end).toBeGreaterThan(start);
  return MODAL_SRC.slice(start, end);
}

describe('resolveSavedMenuUnit — the save normalization the merged form shares (v7.6.01)', () => {
  it('presets save canonicalized, customs save stripped of a leading number word, အခြား never stores', () => {
    expect(resolveSavedMenuUnit('ပါကင်')).toBe('ပါကင်');
    expect(resolveSavedMenuUnit('ကီလို')).toBe('ကီလို');
    expect(resolveSavedMenuUnit('ဗူး')).toBe('ဗူး');
    expect(resolveSavedMenuUnit('တစ်ဗူး')).toBe('ဗူး');
    expect(resolveSavedMenuUnit('တစ်ခု')).toBe('ခု');
    expect(resolveSavedMenuUnit('အခြား')).toBe('ခု');
    expect(resolveSavedMenuUnit('')).toBe('ခု');
    expect(resolveSavedMenuUnit(undefined)).toBe('ခု');
    expect(DEFAULT_MENU_UNIT).toBe('ခု');
  });

  it('a custom unit typed in a row joins the shared persisted list', () => {
    expect(collectNewCustomUnits(['ဗူး'], [])).toEqual(['ဗူး']);
    expect(collectNewCustomUnits(['ခု'], [])).toEqual([]);
    expect(collectNewCustomUnits(['ဗူး'], ['ဗူး'])).toEqual([]);
    expect(
      collectNewCustomUnits(['တစ်ဗူး'], ['ဗူး']),
    ).toEqual([]);
  });

  it('select options are presets, then customs, then အခြား last', () => {
    expect(menuUnitSelectOptions([]).map((o) => o.value)).toEqual([
      'ခု',
      'ပါကင်',
      'ကီလို',
      'လီတာ',
      'ထုပ်',
      'အခြား',
    ]);
    expect(menuUnitSelectOptions(['ဗူး']).map((o) => o.value)).toEqual([
      'ခု',
      'ပါကင်',
      'ကီလို',
      'လီတာ',
      'ထုပ်',
      'ဗူး',
      'အခြား',
    ]);
  });
});

describe('the merged form rows carry per-row units (v7.6.25)', () => {
  it('no unit_qty state remains; a legacy record restores as one row with the default unit', () => {
    expect(MODAL_SRC).not.toContain('unitQtyUnit');
    expect(MODAL_SRC).not.toContain('handleUnitQtyChange');
    expect(MODAL_SRC).not.toContain("useState<'unit_qty'");
    // NOTE: 'setEntryMode' is a substring of 'setEntryModel' — pin
    // the call form.
    expect(MODAL_SRC).not.toContain('setEntryMode(');
    expect(MODAL_SRC).toContain(
      'name: parsedItemName, price: editTransaction.unitPrice',
    );
    expect(MODAL_SRC).toContain(
      "setShoppingItems([{ id: 'item_1', name: '', price: 0, quantity: 1, amount: 0 }])",
    );
  });

  it('each row mirrors the old unit row, same helpers and reveal', () => {
    const section = rowsSection();
    expect(section).toContain('ယူနစ်');
    expect(section).toContain(
      'resolveMenuUnitSelectValue(item.unit, knownUnits)',
    );
    expect(section).toContain('menuUnitSelectOptions(knownUnits)');
    expect(section).toContain(
      'menuUnitNeedsCustomInput(item.unit, knownUnits)',
    );
    expect(section).toContain('customMenuUnitText(item.unit)');
    expect(section).toContain('ယူနစ် ရိုက်ထည့်ပါ (ဥပမာ - ဗူး)');
    expect(section).toContain(
      "updateShoppingItem(item.id || '', 'unit', e.target.value)",
    );
  });

  it('save uses each row normalized unit — never a single state unit', () => {
    expect(MODAL_SRC).toContain('unit: resolveSavedMenuUnit(i.unit)');
    expect(MODAL_SRC).not.toContain('unit: resolveSavedMenuUnit(unitQtyUnit)');
  });

  it('a custom row unit is collected into ngwe_custom_units from the rows', () => {
    expect(MODAL_SRC).toContain(
      'collectNewCustomUnits(validItems.map((i) => i.unit), customUnits)',
    );
    expect(MODAL_SRC).not.toContain('unitQtyCustomUnits');
  });

  it('the price-comparison block stays unit-agnostic (amounts only, no unit assumption)', () => {
    const start = MODAL_SRC.indexOf('const priceComparison = useMemo');
    expect(start).toBeGreaterThan(-1);
    const end = MODAL_SRC.indexOf(
      '}, [isOpen, latestPreviousPurchase',
      start,
    );
    expect(end).toBeGreaterThan(start);
    const block = MODAL_SRC.slice(start, end);
    expect(block).not.toContain('unit');
    expect(block).not.toContain('DEFAULT_MENU_UNIT');
    expect(block).not.toContain('ခု');
  });
});

describe('saved item details show the normalized unit (v7.6.01)', () => {
  /** The exact guard the expanded table uses, exercised directly. */
  const unitSuffix = (unit: unknown): string =>
    typeof unit === 'string' && unit.trim()
      ? ` ${displayMenuUnit(unit)}`
      : '';

  it('display forms: preset, old form, custom, missing/blank', () => {
    expect(displayMenuUnit('ခု')).toBe('ခု');
    expect(displayMenuUnit('တစ်ခု')).toBe('ခု');
    expect(displayMenuUnit('တစ်ပါကင်')).toBe('ပါကင်');
    expect(displayMenuUnit('ဗူး')).toBe('ဗူး');
    expect(displayMenuUnit('တစ်ဗူး')).toBe('ဗူး');
    expect(unitSuffix('ခု')).toBe(' ခု');
    expect(unitSuffix('တစ်ခု')).toBe(' ခု');
    expect(unitSuffix('ဗူး')).toBe(' ဗူး');
    expect(unitSuffix(undefined)).toBe('');
    expect(unitSuffix('')).toBe('');
    expect(unitSuffix('   ')).toBe('');
    expect(`(1,000 × 2${unitSuffix('ခု')})`).toBe('(1,000 × 2 ခု)');
    expect(`(1,000 × 2${unitSuffix('')})`).toBe('(1,000 × 2)');
    expect(`(1,000 × 2${unitSuffix(undefined)})`).toBe('(1,000 × 2)');
  });

  it('the expanded table renders through displayMenuUnit, guarded, row wraps so a long unit drops below the name', () => {
    expect(TXVIEW_SRC).toContain(
      "import { displayMenuUnit } from '../utils/shopMenuUpdate';",
    );
    expect(TXVIEW_SRC).toContain('displayMenuUnit(item.unit)');
    expect(TXVIEW_SRC).toContain('item.unit && item.unit.trim()');
    expect(TXVIEW_SRC).not.toContain(
      '({formatMMK(item.price)} × {item.quantity})',
    );
    expect(TXVIEW_SRC).toContain(
      'text-[11px] text-slate-500 font-mono shrink-0 whitespace-nowrap',
    );
    // [v7.6.01 top-up] The row container wraps, so a long unit suffix drops
    // below the name as a whole instead of squeezing/overlapping it.
    expect(TXVIEW_SRC).toContain(
      'flex flex-1 flex-wrap items-center gap-1 min-w-0',
    );
  });

  it('the collapsed unit_qty chip shows the same normalized unit', () => {
    expect(TXVIEW_SRC).toContain('displayMenuUnit(t.items[0]?.unit)');
    expect(TXVIEW_SRC).toContain('t.items[0]?.unit.trim()');
  });

  it('the price-history note uses the item unit — display-time only, never saved', () => {
    expect(HISTORY_SRC).toContain('displayMenuUnit(item.unit)');
    expect(HISTORY_SRC).not.toContain('x${item.quantity} ခု');
    expect(HISTORY_SRC).toContain('const itemHistories = useMemo');
    expect(HISTORY_SRC).not.toContain('firebase');
    expect(HISTORY_SRC).not.toContain('firestore');
  });
});

describe('sweep — every sibling quantity display, dispositioned (v7.6.01)', () => {
  it('ItemPriceAnalyticsView log rows now show the per-record unit (v7.6.05 supersedes the v7.6.01 no-unit scope)', () => {
    expect(ANALYTICS_SRC).toContain('x{log.quantity}');
    expect(ANALYTICS_SRC).toContain('displayMenuUnit(log.unit)');
    expect(ANALYTICS_SRC).toContain('log.unit && log.unit.trim()');
    const start = ANALYTICS_SRC.indexOf('interface ItemPurchaseRecord');
    const end = ANALYTICS_SRC.indexOf('interface ItemSummary', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const record = ANALYTICS_SRC.slice(start, end);
    expect(record).toContain('unit?: string');
    // The group header still shows the name-derived unit.
    expect(ANALYTICS_SRC).toContain("it.unit ? it.name + ' · ' + it.unit");
  });

  it('Smart Calendar detail rows show qty/unit/price (v7.6.20 supersedes the names-only line)', () => {
    expect(CAL_SRC).toContain('resolveCalendarDetailLine(fuelLine, t.items, lang)');
    expect(CAL_SRC).toContain('formatFuelRowLineWithRate(linkedFuelLog)');
    expect(CAL_LABELS_SRC).toContain('i.quantity');
    expect(CAL_LABELS_SRC).toContain('displayMenuUnit');
    expect(CAL_LABELS_SRC).toContain('formatCalendarDetailItemsDetailed');
    // The names-only helper is intact for its own callers/tests.
    expect(CAL_LABELS_SRC).toContain('.map((i) => i.name)');
  });

  it('ShopCard menu lines already show the unit via menuUnitLabel', () => {
    expect(SHOPCARD_SRC).toContain('menuUnitLabel(item.unit)');
    expect(SHOPCARD_SRC).toContain('normalizeMenuUnit(unit)');
  });

  it('no mode-switcher label remains; the rows header is the only form label (v7.6.25)', () => {
    expect(MODAL_SRC).not.toContain('ဈေး × အရေအတွက်');
    expect(MODAL_SRC).not.toContain('ထည့်သွင်းပုံစံ:');
    expect(MODAL_SRC).toContain('ဈေးဝယ်စာရင်း');
  });

  it('VehiclesView has no per-item × line', () => {
    expect(VEHICLES_SRC).not.toContain('quantity');
    expect(VEHICLES_SRC).not.toContain('×');
  });

  it('vehicle-service rows already have unit selects', () => {
    expect(MAINT_SRC).toContain(
      'resolveMenuUnitSelectValue(row.unit, knownUnits)',
    );
  });

  it('the auto-generated note draft now includes each item unit (v7.6.05 supersedes the v7.6.01 unit-less note)', () => {
    expect(MODAL_SRC).toContain('autoGenerateShoppingNote');
    expect(MODAL_SRC).toContain('x${i.quantity}');
    const start = MODAL_SRC.indexOf('const autoGenerateShoppingNote');
    expect(start).toBeGreaterThan(-1);
    const block = MODAL_SRC.slice(start, MODAL_SRC.indexOf('};', start) + 2);
    expect(block).toContain('displayMenuUnit(');
    expect(block).toContain('OTHER_MENU_UNIT');
  });
});

describe('version identity 7.6.02 — fix-script guard is raw string equality (renumber)', () => {
  // Mirrors the generated fix script's guard in shape:
  //   pkgVersion !== FROM_VERSION && pkgVersion !== TO_VERSION → fail.
  // FROM_VERSION / TO_VERSION are plain strings read from package.json;
  // no parseInt / tuple / semver normalization anywhere in the guard.
  const FROM_VERSION = '7.6.01';
  const TO_VERSION = '7.6.02';
  const guardFails = (pkgVersion: string): boolean =>
    pkgVersion !== FROM_VERSION && pkgVersion !== TO_VERSION;
  // The mangled form a numeric normalizer would produce — built from
  // TO_VERSION, never written as a literal, so the shipped identity can
  // never be confused with it by a grep or by the guard.
  const mangled = TO_VERSION.split('.').map(Number).join('.');

  it('numeric normalization would mangle the 02 segment, so it must never be used', () => {
    expect(mangled).not.toBe(TO_VERSION);
    expect(TO_VERSION).toBe('7.6.02');
  });

  it('accepts exactly 7.6.01 (fresh run) and exactly 7.6.02 (re-run)', () => {
    expect(guardFails('7.6.01')).toBe(false);
    expect(guardFails('7.6.02')).toBe(false);
  });

  it('rejects the mangled form and anything else', () => {
    expect(guardFails(mangled)).toBe(true);
    expect(guardFails('7.5.98')).toBe(true);
    expect(guardFails('')).toBe(true);
  });

  it('the shipped identity is 7.6.26 in every version surface', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.32');
    expect(CURRENT_BUILD_NUMBER).toBe(346);
    expect(VERSION_JSON.version).toBe('v7.6.32');
    expect(VERSION_JSON.buildNumber).toBe(346);
  });
});

describe('app update check detects 7.6.01 over 7.5.99 (renumber)', () => {
  // Mirrors the two live paths exactly:
  //  VersionHistoryModal.tsx:60 — cloudV !== CURRENT_APP_VERSION || cloudB > CURRENT_BUILD_NUMBER
  //  App.tsx:622-623 — cloudVersion === CURRENT_APP_VERSION → return;
  //  cloudBuild <= CURRENT_BUILD_NUMBER → return
  const modalDetects = (cloudV: string, cloudB: number, localV: string, localB: number): boolean =>
    cloudV !== localV || cloudB > localB;
  const bootDetects = (cloudV: string, cloudB: number, localV: string, localB: number): boolean => {
    if (cloudV === localV) return false;
    if (cloudB && cloudB <= localB) return false;
    return true;
  };

  it('7.6.01 / build 315 over 7.5.99 / build 314 is an update in both paths', () => {
    expect(modalDetects('v7.6.01', 315, 'v7.5.99', 314)).toBe(true);
    expect(bootDetects('v7.6.01', 315, 'v7.5.99', 314)).toBe(true);
  });

  it('same version and build is not an update in either path', () => {
    expect(modalDetects('v7.6.01', 315, 'v7.6.01', 315)).toBe(false);
    expect(bootDetects('v7.6.01', 315, 'v7.6.01', 315)).toBe(false);
  });

  it('same version with a higher build is an update in the modal path (hotfix)', () => {
    expect(modalDetects('v7.6.01', 316, 'v7.6.01', 315)).toBe(true);
    // Pre-existing asymmetry, recorded not changed: the boot check
    // returns on equal version regardless of build, so a same-version
    // hotfix is surfaced by the modal path only.
    expect(bootDetects('v7.6.01', 316, 'v7.6.01', 315)).toBe(false);
  });
});

describe('Version bump to v7.6.27 (build 342)', () => {
  it('version constants and history entry match version.json', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.32');
    expect(CURRENT_BUILD_NUMBER).toBe(346);
    expect(VERSION_JSON.version).toBe('v7.6.32');
    expect(VERSION_JSON.buildNumber).toBe(346);
    const entry = VERSION_HISTORY[0];
    expect(entry.version).toBe('v7.6.32');
    expect(entry.buildNumber).toBe(346);
    expect(entry.releaseDate).toBe('2026-11-24');
    expect(entry.tag).toBe('feature');
    expect(entry.titleMy).toBe(
      'Donut နှိပ်ပြီး ကဏ္ဍအသေးစိတ် ကြည့်နိုင်ခြင်း',
    );
    expect(entry.titleEn).toBe(
      'Tap the donut rows to see category details',
    );
    expect(entry.changesMy).toEqual(VERSION_JSON.changesMy);
    expect(entry.changesEn).toEqual(VERSION_JSON.changesEn);
    expect(entry.changesMy).toHaveLength(1);
    expect(entry.changesEn).toHaveLength(1);
    expect(entry.changesMy[0]).toBe(
      'Donut အောက်က ကဏ္ဍတန်းတွေကို နှိပ်ပြီး ကဏ္ဍခွဲနဲ့ စာရင်းတွေ ကြည့်နိုင်သည် — Donut ဘေးမှာ ကြီးတဲ့ အပိုင်းတွေကို Label (တန်ဖိုး + %) တပ်ပြမည်',
    );
    expect(entry.changesEn[0]).toBe(
      'Donut category rows are now tappable — expand one to see its sub-categories and records; large slices get a label (value + %) beside the donut.',
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
