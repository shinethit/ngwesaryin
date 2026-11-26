// [v7.5.97] Preset units renamed from တစ်- forms to bare forms
// ('တစ်ခု' → 'ခု', etc.), with old stored forms canonicalized on
// match and display. Unit tests for the pure helpers plus
// source-text assertions (same pattern as
// duplicateButtonsRemoved796.test.ts) — the components have no test
// renderer in this repo (vitest node env, no testing-library).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  VERSION_HISTORY,
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
} from '../../data/versionHistory';
import {
  DEFAULT_MENU_UNIT,
  SHOP_MENU_UNITS,
  buildUpdatedMenuItems,
  computeMenuDiff,
  customMenuUnitText,
  displayMenuUnit,
  isCustomMenuUnit,
  menuUnitNeedsCustomInput,
  menuUnitSelectOptions,
  normalizeMenuUnit,
  resolveMenuUnitSelectValue,
} from '../shopMenuUpdate';
import { getCheapestMenuPrice, searchShopMenus } from '../shopItemSearch';
import {
  buildShopPriceAlertDoc,
  buildShopPriceAlertId,
} from '../shopPriceAlerts';

const MENU_SRC = readFileSync(
  new URL('../shopMenuUpdate.ts', import.meta.url),
  'utf8',
);
const SHOPCARD_SRC = readFileSync(
  new URL('../../components/shops/ShopCard.tsx', import.meta.url),
  'utf8',
);
const ANALYTICS_SRC = readFileSync(
  new URL('../../components/ItemPriceAnalyticsView.tsx', import.meta.url),
  'utf8',
);
const MODAL_SRC = readFileSync(
  new URL('../../components/TransactionModal.tsx', import.meta.url),
  'utf8',
);
const MAINT_SRC = readFileSync(
  new URL(
    '../../components/vehicles/AddMaintenanceModal.tsx',
    import.meta.url,
  ),
  'utf8',
);
const ADMIN_SRC = readFileSync(
  new URL('../../components/AdminPanel.tsx', import.meta.url),
  'utf8',
);
const VERSION_JSON = JSON.parse(
  readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
);

const OLD_FORMS = ['တစ်ခု', 'တစ်ပါကင်', 'တစ်ကီလို', 'တစ်လီတာ', 'တစ်ထုပ်'];
const OLD_TO_BARE: Array<[string, string]> = [
  ['တစ်ခု', 'ခု'],
  ['တစ်ပါကင်', 'ပါကင်'],
  ['တစ်ကီလို', 'ကီလို'],
  ['တစ်လီတာ', 'လီတာ'],
  ['တစ်ထုပ်', 'ထုပ်'],
];
const BARE_FORMS = ['ခု', 'ပါကင်', 'ကီလို', 'လီတာ', 'ထုပ်'];

describe('normalizeMenuUnit canonicalizes the old preset forms (v7.5.97)', () => {
  it('maps all 5 old forms to the bare forms', () => {
    for (const [oldForm, bare] of OLD_TO_BARE) {
      expect(normalizeMenuUnit(oldForm)).toBe(bare);
      expect(normalizeMenuUnit(`  ${oldForm} `)).toBe(bare);
    }
  });

  it('passes the new bare forms through unchanged', () => {
    for (const bare of BARE_FORMS) {
      expect(normalizeMenuUnit(bare)).toBe(bare);
    }
    expect(normalizeMenuUnit('အခြား')).toBe('အခြား');
  });

  it('strips a leading number word from customs; other customs pass through (v7.6.11)', () => {
    expect(normalizeMenuUnit('တစ်ဗူး')).toBe('ဗူး');
    expect(normalizeMenuUnit('  တစ်ဗူး ')).toBe('ဗူး');
    expect(normalizeMenuUnit('လုံး')).toBe('လုံး');
    expect(normalizeMenuUnit('တစ်ထောင်း')).toBe('ထောင်း');
    expect(normalizeMenuUnit('per kilo')).toBe('per kilo');
  });

  it('empty / non-string fall back to the bare default ခု', () => {
    expect(normalizeMenuUnit('')).toBe('ခု');
    expect(normalizeMenuUnit('   ')).toBe('ခု');
    expect(normalizeMenuUnit(undefined)).toBe('ခု');
    expect(normalizeMenuUnit(null)).toBe('ခု');
    expect(normalizeMenuUnit(42)).toBe('ခု');
    expect(DEFAULT_MENU_UNIT).toBe('ခု');
  });

  it('displayMenuUnit is the normalized form', () => {
    expect(displayMenuUnit('တစ်ထုပ်')).toBe('ထုပ်');
    expect(displayMenuUnit('တစ်ခု')).toBe('ခု');
    expect(displayMenuUnit('တစ်ဗူး')).toBe('ဗူး');
    expect(displayMenuUnit('လုံး')).toBe('လုံး');
  });
});

describe('isCustomMenuUnit is false for old + new preset forms (v7.5.97)', () => {
  it('old forms, new forms, and အခြား are not custom', () => {
    for (const form of [...OLD_FORMS, ...BARE_FORMS, 'အခြား']) {
      expect(isCustomMenuUnit(form)).toBe(false);
    }
  });

  it('custom strings are custom', () => {
    expect(isCustomMenuUnit('တစ်ဗူး')).toBe(true);
    expect(isCustomMenuUnit('လုံး')).toBe(true);
    expect(isCustomMenuUnit('တစ်ထောင်း')).toBe(true);
  });

  it('empty / non-string are not custom', () => {
    expect(isCustomMenuUnit('')).toBe(false);
    expect(isCustomMenuUnit(undefined)).toBe(false);
  });
});

describe('SHOP_MENU_UNITS carries bare values + labels, EN unchanged (v7.5.97)', () => {
  it('values and labelMy are the bare forms, အခြား last', () => {
    expect(SHOP_MENU_UNITS.map((u) => u.value)).toEqual([
      'ခု',
      'ပါကင်',
      'ကီလို',
      'လီတာ',
      'ထုပ်',
      'အခြား',
    ]);
    expect(SHOP_MENU_UNITS.map((u) => u.labelMy)).toEqual([
      'ခု',
      'ပါကင်',
      'ကီလို',
      'လီတာ',
      'ထုပ်',
      'အခြား',
    ]);
  });

  it('no old တစ်- preset appears in any value or labelMy', () => {
    for (const oldForm of OLD_FORMS) {
      expect(SHOP_MENU_UNITS.map((u) => u.value)).not.toContain(oldForm);
      expect(SHOP_MENU_UNITS.map((u) => u.labelMy)).not.toContain(oldForm);
    }
    expect(SHOP_MENU_UNITS.map((u) => u.value)).toContain('အခြား');
  });

  it('labelEn is unchanged', () => {
    expect(SHOP_MENU_UNITS.map((u) => u.labelEn)).toEqual([
      'per piece',
      'per pack',
      'per kg',
      'per litre',
      'per bag',
      'other',
    ]);
  });

  it('the SHOP_MENU_UNITS literal in source has no old preset value', () => {
    const start = MENU_SRC.indexOf('export const SHOP_MENU_UNITS');
    expect(start).toBeGreaterThan(-1);
    const end = MENU_SRC.indexOf('];', start);
    expect(end).toBeGreaterThan(start);
    const literal = MENU_SRC.slice(start, end);
    for (const oldForm of OLD_FORMS) {
      expect(literal).not.toContain(oldForm);
    }
    expect(literal).toContain("'အခြား'");
  });
});

describe('unit selects derive the bare preset for an old stored unit (v7.5.97)', () => {
  it('select options are the bare presets, customs in the middle, အခြား last', () => {
    expect(menuUnitSelectOptions([]).map((o) => o.value)).toEqual([
      'ခု',
      'ပါကင်',
      'ကီလို',
      'လီတာ',
      'ထုပ်',
      'အခြား',
    ]);
    const opts = menuUnitSelectOptions(['တစ်ဗူး', 'လုံး']);
    expect(opts.map((o) => o.value)).toEqual([
      'ခု',
      'ပါကင်',
      'ကီလို',
      'လီတာ',
      'ထုပ်',
      'ဗူး',
      'လုံး',
      'အခြား',
    ]);
  });

  it('a persisted old preset form never becomes a custom option', () => {
    const opts = menuUnitSelectOptions(['တစ်ခု', 'တစ်ကီလို', 'တစ်ဗူး']);
    expect(opts.map((o) => o.value)).toEqual([
      'ခု',
      'ပါကင်',
      'ကီလို',
      'လီတာ',
      'ထုပ်',
      'ဗူး',
      'အခြား',
    ]);
  });

  it('resolveMenuUnitSelectValue shows the bare preset for an old stored unit', () => {
    for (const [oldForm, bare] of OLD_TO_BARE) {
      expect(resolveMenuUnitSelectValue(oldForm)).toBe(bare);
    }
    expect(resolveMenuUnitSelectValue('တစ်ဗူး', ['တစ်ဗူး'])).toBe('ဗူး');
    expect(resolveMenuUnitSelectValue('လုံး', ['လုံး'])).toBe('လုံး');
    expect(resolveMenuUnitSelectValue('အခြား')).toBe('အခြား');
    expect(resolveMenuUnitSelectValue('')).toBe('အခြား');
    expect(resolveMenuUnitSelectValue(undefined)).toBe('ခု');
  });

  it('old forms show no custom input and no custom text', () => {
    for (const oldForm of OLD_FORMS) {
      expect(menuUnitNeedsCustomInput(oldForm)).toBe(false);
      expect(customMenuUnitText(oldForm)).toBe('');
    }
    expect(menuUnitNeedsCustomInput('တစ်ဗူး')).toBe(true);
    expect(customMenuUnitText('တစ်ဗူး')).toBe('ဗူး');
  });
});

describe('matching: old stored unit + new unit is an UPDATE, never a duplicate (v7.5.97)', () => {
  it('computeMenuDiff updates the old-unit line when the candidate uses the bare unit', () => {
    const rows = computeMenuDiff(
      [{ name: 'ဆန်', price: 1000, unit: 'တစ်ကီလို' }],
      [{ name: 'ဆန်', price: 1200, quantity: 1, unit: 'ကီလို' }],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      itemName: 'ဆန်',
      unit: 'ကီလို',
      oldPrice: 1000,
      newPrice: 1200,
      isNew: false,
    });
  });

  it('computeMenuDiff updates the bare-unit line when the candidate uses the old unit', () => {
    const rows = computeMenuDiff(
      [{ name: 'ဆန်', price: 1000, unit: 'ခု' }],
      [{ name: 'ဆန်', price: 1200, quantity: 1, unit: 'တစ်ခု' }],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].isNew).toBe(false);
    expect(rows[0].unit).toBe('ခု');
  });

  it('buildUpdatedMenuItems updates the old-unit line in place and stores the bare unit', () => {
    const out = buildUpdatedMenuItems(
      [{ name: 'ဆန်', price: 1000, unit: 'တစ်ကီလို', updatedAt: 111, addedBy: 'old@x.com' }],
      [{ itemName: 'ဆန်', unit: 'ကီလို', oldPrice: 1000, newPrice: 1200, isNew: false, isLargeDiff: false }],
      'new@x.com',
    );
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ name: 'ဆန်', price: 1200, unit: 'ကီလို', addedBy: 'new@x.com' });
  });

  it('searchShopMenus returns the bare unit for an old-form menu line', () => {
    const shops = [
      {
        id: 'x',
        name: 'X',
        addedBy: 'a',
        addedByUid: 'u',
        items: [{ name: 'ဆန်', price: 100, unit: 'တစ်ကီလို', updatedAt: 1 }],
      },
    ] as any;
    expect(searchShopMenus(shops, 'ဆန်')[0].unit).toBe('ကီလို');
  });

  it('getCheapestMenuPrice returns the bare unit for an old-form menu line', () => {
    const shops = [
      {
        id: 'x',
        name: 'X',
        addedBy: 'a',
        addedByUid: 'u',
        items: [{ name: 'ဆန်', price: 100, unit: 'တစ်ခု', updatedAt: 1 }],
      },
    ] as any;
    expect(getCheapestMenuPrice(shops, 'ဆန်')!.unit).toBe('ခု');
  });

  it('price alerts dedupe + store the canonical unit', () => {
    expect(buildShopPriceAlertId('shop-1', 'Rice', 'တစ်ခု')).toBe(
      buildShopPriceAlertId('shop-1', 'Rice', 'ခု'),
    );
    const doc = buildShopPriceAlertDoc({
      shopId: 'shop-1',
      shopName: 'Shop',
      itemName: 'Rice',
      unit: 'တစ်ကီလို',
      oldPrice: 100,
      newPrice: 200,
      reportedByUid: 'u1',
      reportedBy: 'a@x.com',
      reportedAt: 1,
    });
    expect(doc.unit).toBe('ကီလို');
  });
});

describe('display sites normalize the stored unit (v7.5.97 source assertions)', () => {
  it('ShopCard menu label normalizes before the list lookup', () => {
    expect(SHOPCARD_SRC).toContain('normalizeMenuUnit(unit)');
    expect(SHOPCARD_SRC).toContain('normalizeMenuUnit');
  });

  it('ItemPriceAnalyticsView menu label normalizes before the list lookup', () => {
    expect(ANALYTICS_SRC).toContain('normalizeMenuUnit(unit)');
    expect(ANALYTICS_SRC).toContain('normalizeMenuUnit');
  });

  it('Admin Panel price alerts render through displayMenuUnit', () => {
    expect(ADMIN_SRC).toContain('displayMenuUnit(priceAlert.unit)');
  });

  it('custom-unit placeholders use the bare example ဗူး, never တစ်ဗူး', () => {
    for (const src of [SHOPCARD_SRC, MODAL_SRC, MAINT_SRC]) {
      expect(src).toContain('(ဥပမာ - ဗူး)');
      expect(src).not.toContain('(ဥပမာ - တစ်ဗူး)');
    }
  });

  it('ShopCard default-unit comments use the bare form', () => {
    expect(SHOPCARD_SRC).not.toContain('default တစ်ခု');
    expect(SHOPCARD_SRC).toContain('default ခု');
  });
});

describe('Version bump to v7.6.27 (build 342)', () => {
  it('version constants and history entry match version.json', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.54');
    expect(CURRENT_BUILD_NUMBER).toBe(368);
    expect(VERSION_JSON.version).toBe('v7.6.54');
    expect(VERSION_JSON.buildNumber).toBe(368);
    const entry = VERSION_HISTORY[0];
    expect(entry.version).toBe('v7.6.54');
    expect(entry.buildNumber).toBe(368);
    expect(entry.releaseDate).toBe('2026-11-26');
    expect(entry.tag).toBe('fix');
    expect(entry.titleMy).toBe('Menu မှာ ဝန်ဆောင်ခ သတ်သတ် ပြခြင်း');
    expect(entry.titleEn).toBe('Service fee shown separately on menus');
    expect(entry.changesMy).toEqual(VERSION_JSON.changesMy);
    expect(entry.changesEn).toEqual(VERSION_JSON.changesEn);
    expect(entry.changesMy).toHaveLength(2);
    expect(entry.changesEn).toHaveLength(2);
  });

  it('change log has no Admin content and releasedAt is present', () => {
    expect(VERSION_JSON.changesMy.join(' ')).not.toContain('Admin');
    expect(VERSION_JSON.changesEn.join(' ')).not.toContain('Admin');
    expect(JSON.stringify(VERSION_HISTORY[0])).not.toContain('Admin');
    expect(typeof VERSION_JSON.releasedAt).toBe('string');
    expect(VERSION_JSON.releasedAt.length).toBeGreaterThan(0);
  });
});
