// [v7.6.01] Unit select in the Unit × Qty entry mode + the unit
// beside price × quantity in saved-record details. Source-text
// assertions (same pattern as unitRename797.test.ts) — the
// components have no test renderer in this repo (vitest node env,
// no testing-library); layout behaviour is verified by renders.
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

/** The unit_qty section: from its opening guard to the shopping-list section. */
function unitQtySection(): string {
  const start = MODAL_SRC.indexOf('entryMode === "unit_qty" && entryModel === "general"');
  expect(start).toBeGreaterThan(-1);
  const end = MODAL_SRC.indexOf(
    'entryMode === "shopping_list" && entryModel === "general"',
    start,
  );
  expect(end).toBeGreaterThan(start);
  return MODAL_SRC.slice(start, end);
}

describe('resolveSavedMenuUnit — the save normalization the unit_qty mode now shares (v7.6.01)', () => {
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

  it('a custom unit typed in unit_qty mode joins the shared persisted list', () => {
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

describe('unit_qty entry mode carries its own unit state (v7.6.01)', () => {
  it('state is declared beside unitPrice/quantity, defaulting to DEFAULT_MENU_UNIT', () => {
    expect(MODAL_SRC).toContain(
      'const [unitQtyUnit, setUnitQtyUnit] = useState<string>(',
    );
    expect(MODAL_SRC).toContain(
      'editTransaction?.unitPrice && editTransaction.items?.[0]?.unit',
    );
    expect(MODAL_SRC).toContain(': DEFAULT_MENU_UNIT');
  });

  it('edit restore reads the saved item unit; fresh open resets to the default', () => {
    expect(MODAL_SRC).toContain(
      'setUnitQtyUnit(editTransaction.items?.[0]?.unit || DEFAULT_MENU_UNIT)',
    );
    expect(MODAL_SRC).toContain(
      "setUnitPrice('');\n        setQuantity('1');\n        setUnitQtyUnit(DEFAULT_MENU_UNIT);",
    );
    // [v7.6.04] Two such calls now: the fresh-open reset below AND
    // the old-direct edit restore, which maps the amount to the unit
    // price at qty 1 with the default unit (the note carries no unit).
    expect(MODAL_SRC.match(/setUnitQtyUnit\(DEFAULT_MENU_UNIT\)/g)).toHaveLength(2);
  });

  it('the unit row mirrors the shopping-list unit row, same helpers and reveal', () => {
    const section = unitQtySection();
    expect(section).toContain('ယူနစ်');
    expect(section).toContain(
      'resolveMenuUnitSelectValue(unitQtyUnit, customUnits)',
    );
    expect(section).toContain('menuUnitSelectOptions(customUnits)');
    expect(section).toContain(
      'menuUnitNeedsCustomInput(unitQtyUnit, customUnits)',
    );
    expect(section).toContain('customMenuUnitText(unitQtyUnit)');
    expect(section).toContain('ယူနစ် ရိုက်ထည့်ပါ (ဥပမာ - ဗူး)');
    expect(section).toContain('setUnitQtyUnit(e.target.value)');
  });

  it('save uses the normalized state unit — never the hardcoded default', () => {
    expect(MODAL_SRC).toContain('unit: resolveSavedMenuUnit(unitQtyUnit)');
    expect(MODAL_SRC).not.toContain('unit: DEFAULT_MENU_UNIT');
  });

  it('a custom unit_qty unit is collected into ngwe_custom_units, mode-gated', () => {
    expect(MODAL_SRC).toContain(
      "entryMode === 'unit_qty' ? [resolveSavedMenuUnit(unitQtyUnit)] : []",
    );
    expect(MODAL_SRC).toContain(
      'collectNewCustomUnits([...validItems.map((i) => i.unit), ...unitQtyCustomUnits], customUnits)',
    );
  });

  it('handleUnitQtyChange is untouched — the unit does not affect amount math', () => {
    expect(MODAL_SRC).toContain(
      "handleUnitQtyChange = (field: 'price' | 'qty', val: string)",
    );
    expect(MODAL_SRC).not.toContain('handleUnitQtyChange("unit"');
    expect(MODAL_SRC).not.toContain("handleUnitQtyChange('unit'");
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

  it('Smart Calendar detail rows are item names only — no quantity anywhere', () => {
    expect(CAL_SRC).toContain('formatCalendarDetailItems(t.items, lang)');
    expect(CAL_SRC).not.toContain('quantity');
    expect(CAL_LABELS_SRC).toContain('.map((i) => i.name)');
    expect(CAL_LABELS_SRC).not.toContain('quantity');
  });

  it('ShopCard menu lines already show the unit via menuUnitLabel', () => {
    expect(SHOPCARD_SRC).toContain('menuUnitLabel(item.unit)');
    expect(SHOPCARD_SRC).toContain('normalizeMenuUnit(unit)');
  });

  it('mode-switcher label is a mode name, not data — unchanged', () => {
    expect(MODAL_SRC).toContain('ဈေး × အရေအတွက်');
  });

  it('VehiclesView has no per-item × line', () => {
    expect(VEHICLES_SRC).not.toContain('quantity');
    expect(VEHICLES_SRC).not.toContain('×');
  });

  it('vehicle-service rows already have unit selects', () => {
    expect(MAINT_SRC).toContain(
      'resolveMenuUnitSelectValue(row.unit, customUnits)',
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

  it('the shipped identity is 7.6.19 in every version surface', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.19');
    expect(CURRENT_BUILD_NUMBER).toBe(333);
    expect(VERSION_JSON.version).toBe('v7.6.19');
    expect(VERSION_JSON.buildNumber).toBe(333);
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

describe('Version bump to v7.6.19 (build 333)', () => {
  it('version constants and history entry match version.json', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.19');
    expect(CURRENT_BUILD_NUMBER).toBe(333);
    expect(VERSION_JSON.version).toBe('v7.6.19');
    expect(VERSION_JSON.buildNumber).toBe(333);
    const entry = VERSION_HISTORY[0];
    expect(entry.version).toBe('v7.6.19');
    expect(entry.buildNumber).toBe(333);
    expect(entry.releaseDate).toBe('2026-11-23');
    expect(entry.tag).toBe('fix');
    expect(entry.titleMy).toBe(
      'Filter စာတန်းပြင်ဆင်ခြင်းနှင့် ရွေးထားတဲ့ Wallet ပြခြင်း',
    );
    expect(entry.titleEn).toBe(
      'Filter notice fix and selected-wallet display',
    );
    expect(entry.changesMy).toEqual(VERSION_JSON.changesMy);
    expect(entry.changesEn).toEqual(VERSION_JSON.changesEn);
    expect(entry.changesMy).toHaveLength(1);
    expect(entry.changesEn).toHaveLength(1);
    expect(entry.changesMy[0]).toBe(
      'Wallet ရွေးချယ်မှု (ကိုယ်ပိုင်/မျှဝေထား အပါအဝင်) ကြောင့် Filter သတိပေးစာတန်း မပေါ်တော့ပါ — စာရင်းအပေါ်မှာ ရွေးထားတဲ့ Wallet ကို ပြမည်',
    );
    expect(entry.changesEn[0]).toBe(
      'The filter notice bar no longer appears for a wallet or scope (personal/shared) selection — the selected wallet is now shown at the top of the Records list.',
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
