// [v7.5.82] Unit tests for the shop menu auto-update diff / build /
// apply logic. Pure functions are tested directly; applyShopMenuItems
// is tested with a STUBBED store (no live Firestore). The default
// (real Firestore) store is exercised with MOCKED firebase modules —
// no network — following the shopReports.test.ts pattern.
import { describe, it, expect, vi } from 'vitest';

import {
  DEFAULT_MENU_UNIT,
  SHOP_MENU_UNITS,
  applyResolvedMenuUpdate,
  applyShopMenuItems,
  buildMenuPromptRows,
  buildUpdatedMenuItems,
  buildVehicleMenuCandidate,
  collectNewCustomUnits,
  computeMenuDiff,
  customMenuUnitText,
  isLargePriceDifference,
  menuUnitNeedsCustomInput,
  menuUnitSelectOptions,
  normalizeMenuItemName,
  normalizeMenuUnit,
  resolveMenuUnitSelectValue,
  resolveSavedMenuUnit,
  resolveMenuShop,
  resolveMenuShopById,
  shouldOfferMenuUpdate,
  type MenuUpdateRow,
  type ShopMenuStore,
} from '../shopMenuUpdate';

// Mocked Firestore for the DEFAULT-store tests only (stub-store tests
// below never touch these mocks).
vi.mock('firebase/firestore', () => ({
  doc: vi.fn((...args: unknown[]) => ({ __doc: args })),
}));
vi.mock('../../lib/firebase', () => ({
  db: {},
  safeUpdateDoc: vi.fn(async () => true),
}));

import { doc } from 'firebase/firestore';
import { safeUpdateDoc } from '../../lib/firebase';

function stubStore(overrides: Partial<ShopMenuStore> = {}): ShopMenuStore & {
  updatePublicShopItems: ReturnType<typeof vi.fn>;
  updatePrivateShopItems: ReturnType<typeof vi.fn>;
} {
  return {
    updatePublicShopItems: vi.fn(async () => true),
    updatePrivateShopItems: vi.fn(async () => true),
    ...overrides,
  } as unknown as ShopMenuStore & {
    updatePublicShopItems: ReturnType<typeof vi.fn>;
    updatePrivateShopItems: ReturnType<typeof vi.fn>;
  };
}

describe('constants', () => {
  it('default unit is ခု', () => {
    expect(DEFAULT_MENU_UNIT).toBe('ခု');
  });

  it('has exactly the six units with Myanmar stored values', () => {
    expect(SHOP_MENU_UNITS.map((u) => u.value)).toEqual([
      'ခု',
      'ပါကင်',
      'ကီလို',
      'လီတာ',
      'ထုပ်',
      'အခြား',
    ]);
    expect(SHOP_MENU_UNITS[0]).toEqual({ value: 'ခု', labelMy: 'ခု', labelEn: 'per piece' });
    expect(SHOP_MENU_UNITS[2].labelEn).toBe('per kg');
    expect(SHOP_MENU_UNITS[3].labelEn).toBe('per litre');
  });
});

describe('normalizeMenuUnit', () => {
  it('trims and keeps a known unit', () => {
    expect(normalizeMenuUnit('  ကီလို ')).toBe('ကီလို');
  });

  it('empty / non-string fall back to the default', () => {
    expect(normalizeMenuUnit('')).toBe(DEFAULT_MENU_UNIT);
    expect(normalizeMenuUnit('   ')).toBe(DEFAULT_MENU_UNIT);
    expect(normalizeMenuUnit(undefined)).toBe(DEFAULT_MENU_UNIT);
    expect(normalizeMenuUnit(null)).toBe(DEFAULT_MENU_UNIT);
    expect(normalizeMenuUnit(42)).toBe(DEFAULT_MENU_UNIT);
  });

  // [v7.5.95 U2] A non-empty unknown string is a CUSTOM unit typed via
  // 'အခြား' — preserved as-is, never collapsed to the default (the
  // old 'per kilo' → default expectation is void).
  it('preserves a custom unit string as-is', () => {
    expect(normalizeMenuUnit('တစ်ဗူး')).toBe('တစ်ဗူး');
    expect(normalizeMenuUnit('  တစ်ဗူး ')).toBe('တစ်ဗူး');
    expect(normalizeMenuUnit('per kilo')).toBe('per kilo');
    expect(normalizeMenuUnit('အခြား')).toBe('အခြား');
  });
});

describe('custom menu units (v7.5.95 U1/U2)', () => {
  it('menuUnitSelectOptions puts standards, then customs, then Other last', () => {
    const opts = menuUnitSelectOptions(['တစ်ဗူး', 'တစ်ခု', 'တစ်ဗူး', '  ']);
    expect(opts.map((o) => o.value)).toEqual([
      'ခု',
      'ပါကင်',
      'ကီလို',
      'လီတာ',
      'ထုပ်',
      'တစ်ဗူး',
      'အခြား',
    ]);
    expect(opts.find((o) => o.value === 'တစ်ဗူး')).toEqual({
      value: 'တစ်ဗူး',
      labelMy: 'တစ်ဗူး',
      labelEn: 'တစ်ဗူး',
    });
  });

  it('resolveMenuUnitSelectValue shows list/custom values, Other for the rest', () => {
    expect(resolveMenuUnitSelectValue('ကီလို')).toBe('ကီလို');
    expect(resolveMenuUnitSelectValue('တစ်ဗူး', ['တစ်ဗူး'])).toBe('တစ်ဗူး');
    expect(resolveMenuUnitSelectValue('တစ်ဗူး', [])).toBe('အခြား');
    expect(resolveMenuUnitSelectValue('အခြား')).toBe('အခြား');
    expect(resolveMenuUnitSelectValue('')).toBe('အခြား');
    expect(resolveMenuUnitSelectValue(undefined)).toBe(DEFAULT_MENU_UNIT);
  });

  it('customMenuUnitText returns the raw custom string only', () => {
    expect(customMenuUnitText('တစ်ဗူး')).toBe('တစ်ဗူး');
    expect(customMenuUnitText('ကီလို')).toBe('');
    expect(customMenuUnitText('အခြား')).toBe('');
    expect(customMenuUnitText('')).toBe('');
    expect(customMenuUnitText(undefined)).toBe('');
  });

  it('menuUnitNeedsCustomInput is true for customs and the Other sentinel', () => {
    expect(menuUnitNeedsCustomInput('တစ်ဗူး')).toBe(true);
    expect(menuUnitNeedsCustomInput('အခြား')).toBe(true);
    expect(menuUnitNeedsCustomInput('ကီလို')).toBe(false);
    expect(menuUnitNeedsCustomInput(undefined)).toBe(false);
  });

  it('resolveSavedMenuUnit resolves the Other sentinel to the default', () => {
    expect(resolveSavedMenuUnit('အခြား')).toBe(DEFAULT_MENU_UNIT);
    expect(resolveSavedMenuUnit('တစ်ဗူး')).toBe('တစ်ဗူး');
    expect(resolveSavedMenuUnit('')).toBe(DEFAULT_MENU_UNIT);
  });

  it('collectNewCustomUnits dedupes against existing + itself', () => {
    expect(collectNewCustomUnits(['တစ်ဗူး', 'တစ်ကီလို', 'တစ်ဗူး', ''], ['တစ်ဗူး'])).toEqual([]);
    expect(
      collectNewCustomUnits(['တစ်ဗူး', 'တစ်ထောင်း', 'တစ်ဗူး'], ['တစ်ပုံး']),
    ).toEqual(['တစ်ဗူး', 'တစ်ထောင်း']);
  });

  it('computeMenuDiff keeps a custom unit distinct from the default', () => {
    const rows = computeMenuDiff(
      [{ name: 'ဆန်', price: 100, unit: 'တစ်ဗူး' }],
      [{ name: 'ဆန်', price: 120, quantity: 1, unit: 'တစ်ဗူး' }],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].unit).toBe('တစ်ဗူး');
    const sameDefault = computeMenuDiff(
      [{ name: 'ဆန်', price: 100, unit: 'တစ်ဗူး' }],
      [{ name: 'ဆန်', price: 120, quantity: 1 }],
    );
    // No unit on the tx side normalizes to the default — a SEPARATE
    // menu line, never an overwrite of the custom-unit line.
    expect(sameDefault).toHaveLength(1);
    expect(sameDefault[0].unit).toBe(DEFAULT_MENU_UNIT);
    expect(sameDefault[0].isNew).toBe(true);
  });
});

describe('normalizeMenuItemName', () => {
  it('trims and lowercases', () => {
    expect(normalizeMenuItemName('  Rice  ')).toBe('rice');
    expect(normalizeMenuItemName('Shan Noodle')).toBe('shan noodle');
  });

  it('non-string becomes empty', () => {
    expect(normalizeMenuItemName(undefined)).toBe('');
    expect(normalizeMenuItemName(123)).toBe('');
  });
});

describe('isLargePriceDifference', () => {
  it('3x or more is large', () => {
    expect(isLargePriceDifference(1000, 3000)).toBe(true);
    expect(isLargePriceDifference(1000, 5000)).toBe(true);
  });

  it('down to a third or less is large', () => {
    expect(isLargePriceDifference(3000, 1000)).toBe(true);
    expect(isLargePriceDifference(3000, 500)).toBe(true);
    expect(isLargePriceDifference(1000, 0)).toBe(true);
  });

  it('just under 3x is NOT large', () => {
    expect(isLargePriceDifference(1000, 2999)).toBe(false);
    expect(isLargePriceDifference(3000, 1001)).toBe(false);
  });

  it('small changes are not large', () => {
    expect(isLargePriceDifference(1000, 1100)).toBe(false);
    expect(isLargePriceDifference(1000, 1000)).toBe(false);
    expect(isLargePriceDifference(1000, 900)).toBe(false);
  });

  it('a free item gaining a price is large; staying free is not', () => {
    expect(isLargePriceDifference(0, 500)).toBe(true);
    expect(isLargePriceDifference(0, 0)).toBe(false);
    expect(isLargePriceDifference(-5, 0)).toBe(false);
  });
});

describe('computeMenuDiff', () => {
  const menu = [
    { name: 'Rice', price: 1000, unit: 'ကီလို', updatedAt: 111, addedBy: 'a@x.com' },
    { name: 'Sugar', price: 2000, updatedAt: 222, addedBy: 'a@x.com' },
  ];

  it('same name+unit, different price → update row', () => {
    const rows = computeMenuDiff(menu, [
      { name: 'Rice', price: 1200, quantity: 2, unit: 'ကီလို' },
    ]);
    expect(rows).toEqual([
      {
        itemName: 'Rice',
        unit: 'ကီလို',
        oldPrice: 1000,
        newPrice: 1200,
        isNew: false,
        isLargeDiff: false,
      },
    ]);
  });

  it('same name+unit, same price → no row', () => {
    expect(
      computeMenuDiff(menu, [{ name: 'Rice', price: 1000, quantity: 1, unit: 'ကီလို' }]),
    ).toEqual([]);
  });

  it('different name → new row with oldPrice null', () => {
    const rows = computeMenuDiff(menu, [{ name: 'Tea', price: 500, quantity: 1, unit: 'ထုပ်' }]);
    expect(rows).toEqual([
      {
        itemName: 'Tea',
        unit: 'ထုပ်',
        oldPrice: null,
        newPrice: 500,
        isNew: true,
        isLargeDiff: false,
      },
    ]);
  });

  it('same name, different unit → separate new row', () => {
    const rows = computeMenuDiff(menu, [
      { name: 'Rice', price: 25000, quantity: 1, unit: 'ထုပ်' },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ itemName: 'Rice', unit: 'ထုပ်', oldPrice: null, isNew: true });
  });

  it('unit-less menu item matches a ခု tx item', () => {
    const rows = computeMenuDiff(menu, [
      { name: 'Sugar', price: 2500, quantity: 1, unit: 'ခု' },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ itemName: 'Sugar', unit: 'ခု', oldPrice: 2000, isNew: false });
  });

  it('unit-less menu item matches a tx item with no unit at all', () => {
    const rows = computeMenuDiff(menu, [{ name: 'sugar', price: 2500, quantity: 1 }]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ oldPrice: 2000, newPrice: 2500, isNew: false });
  });

  it('name matching is case-insensitive and trimmed', () => {
    const rows = computeMenuDiff(menu, [
      { name: '  RICE ', price: 1300, quantity: 1, unit: 'ကီလို' },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].oldPrice).toBe(1000);
  });

  it('menu price is the per-unit price — quantity is NOT divided out', () => {
    const rows = computeMenuDiff([], [{ name: 'Egg', price: 400, quantity: 10, unit: 'ခု' }]);
    expect(rows[0].newPrice).toBe(400);
  });

  it('large-diff flag is set on update rows', () => {
    const rows = computeMenuDiff(menu, [
      { name: 'Rice', price: 3500, quantity: 1, unit: 'ကီလို' },
    ]);
    expect(rows[0].isLargeDiff).toBe(true);
    const small = computeMenuDiff(menu, [
      { name: 'Rice', price: 1100, quantity: 1, unit: 'ကီလို' },
    ]);
    expect(small[0].isLargeDiff).toBe(false);
  });

  it('duplicate tx item (same name+unit) keeps the LAST one', () => {
    const rows = computeMenuDiff(menu, [
      { name: 'Rice', price: 1200, quantity: 1, unit: 'ကီလို' },
      { name: 'Rice', price: 1500, quantity: 1, unit: 'ကီလို' },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].newPrice).toBe(1500);
  });

  it('empty name / quantity 0 / negative quantity / negative price are skipped', () => {
    const rows = computeMenuDiff(menu, [
      { name: '   ', price: 100, quantity: 1, unit: 'ခု' },
      { name: 'NoQty', price: 100, quantity: 0, unit: 'ခု' },
      { name: 'NegQty', price: 100, quantity: -1, unit: 'ခု' },
      { name: 'NegPrice', price: -50, quantity: 1, unit: 'ခု' },
    ]);
    expect(rows).toEqual([]);
  });

  it('empty menu + empty tx list → no rows', () => {
    expect(computeMenuDiff([], [])).toEqual([]);
  });
});

describe('buildUpdatedMenuItems', () => {
  const menu = [
    { name: 'Rice', price: 1000, unit: 'ကီလို', updatedAt: 111, addedBy: 'old@x.com' },
    { name: 'Sugar', price: 2000, updatedAt: 222, addedBy: 'old@x.com' },
  ];

  it('updates in place, preserves untouched items exactly', () => {
    const rows: MenuUpdateRow[] = [
      { itemName: 'Rice', unit: 'ကီလို', oldPrice: 1000, newPrice: 1200, isNew: false, isLargeDiff: false },
    ];
    const out = buildUpdatedMenuItems(menu, rows, 'new@x.com');
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ name: 'Rice', price: 1200, unit: 'ကီလို', addedBy: 'new@x.com' });
    expect(out[0].updatedAt).toBeGreaterThan(111);
    // Untouched item: original unit/addedBy/updatedAt preserved.
    expect(out[1]).toEqual({ name: 'Sugar', price: 2000, updatedAt: 222, addedBy: 'old@x.com' });
    expect('unit' in out[1]).toBe(false);
    // Input not mutated.
    expect(menu[0].price).toBe(1000);
  });

  it('unit-less matched item gains an explicit unit when updated', () => {
    const rows: MenuUpdateRow[] = [
      { itemName: 'Sugar', unit: 'ခု', oldPrice: 2000, newPrice: 2500, isNew: false, isLargeDiff: false },
    ];
    const out = buildUpdatedMenuItems(menu, rows, 'new@x.com');
    expect(out[1]).toMatchObject({ name: 'Sugar', price: 2500, unit: 'ခု', addedBy: 'new@x.com' });
  });

  it('new rows are prepended, newest first', () => {
    const rows: MenuUpdateRow[] = [
      { itemName: 'Tea', unit: 'ထုပ်', oldPrice: null, newPrice: 500, isNew: true, isLargeDiff: false },
      { itemName: 'Coffee', unit: 'ထုပ်', oldPrice: null, newPrice: 800, isNew: true, isLargeDiff: false },
    ];
    const out = buildUpdatedMenuItems(menu, rows, 'new@x.com');
    expect(out.map((i) => i.name)).toEqual(['Coffee', 'Tea', 'Rice', 'Sugar']);
    expect(out[0]).toMatchObject({ price: 800, unit: 'ထုပ်', addedBy: 'new@x.com' });
    expect(typeof out[0].updatedAt).toBe('number');
  });

  it('same name + different unit leaves the old line untouched', () => {
    const rows: MenuUpdateRow[] = [
      { itemName: 'Rice', unit: 'ထုပ်', oldPrice: null, newPrice: 25000, isNew: true, isLargeDiff: false },
    ];
    const out = buildUpdatedMenuItems(menu, rows, 'new@x.com');
    expect(out).toHaveLength(3);
    expect(out[0]).toMatchObject({ name: 'Rice', price: 25000, unit: 'ထုပ်' });
    const oldLine = out.find((i) => i.unit === 'ကီလို');
    expect(oldLine).toEqual({ name: 'Rice', price: 1000, unit: 'ကီလို', updatedAt: 111, addedBy: 'old@x.com' });
  });

  it('no rows → identical copy', () => {
    const out = buildUpdatedMenuItems(menu, [], 'new@x.com');
    expect(out).toEqual([
      { name: 'Rice', price: 1000, unit: 'ကီလို', updatedAt: 111, addedBy: 'old@x.com' },
      { name: 'Sugar', price: 2000, updatedAt: 222, addedBy: 'old@x.com' },
    ]);
  });
});

describe('applyShopMenuItems with a stub store', () => {
  const shop = { id: 'shop-1', items: [] };
  const items = [{ name: 'Rice', price: 1200, unit: 'ကီလို', updatedAt: 1, addedBy: 'a@x.com' }];

  it('public success → true and calls updatePublicShopItems with id + items', async () => {
    const store = stubStore();
    const ok = await applyShopMenuItems(shop, true, items, store);
    expect(ok).toBe(true);
    expect(store.updatePublicShopItems).toHaveBeenCalledWith('shop-1', items);
    expect(store.updatePrivateShopItems).not.toHaveBeenCalled();
  });

  it('public failure → false, never a fake success', async () => {
    const store = stubStore({ updatePublicShopItems: vi.fn(async () => false) });
    const ok = await applyShopMenuItems(shop, true, items, store);
    expect(ok).toBe(false);
  });

  it('private shop → updatePrivateShopItems with the shop + items', async () => {
    const store = stubStore();
    const ok = await applyShopMenuItems(shop, false, items, store);
    expect(ok).toBe(true);
    expect(store.updatePrivateShopItems).toHaveBeenCalledWith(shop, items);
    expect(store.updatePublicShopItems).not.toHaveBeenCalled();
  });

  it('private failure → false', async () => {
    const store = stubStore({ updatePrivateShopItems: vi.fn(async () => false) });
    const ok = await applyShopMenuItems(shop, false, items, store);
    expect(ok).toBe(false);
  });

  it('a throwing store → false, not a thrown error', async () => {
    const store = stubStore({ updatePublicShopItems: vi.fn(async () => { throw new Error('boom'); }) });
    const ok = await applyShopMenuItems(shop, true, items, store);
    expect(ok).toBe(false);
  });
});

describe('applyShopMenuItems with the DEFAULT store (mocked firebase)', () => {
  const shop = { id: 'shop-9', items: [] };
  const items = [{ name: 'Rice', price: 1200, unit: 'ကီလို', updatedAt: 1, addedBy: 'a@x.com' }];

  it('public path writes public_shops/<id> via safeUpdateDoc', async () => {
    vi.mocked(safeUpdateDoc).mockResolvedValue(true);
    const ok = await applyShopMenuItems(shop, true, items);
    expect(ok).toBe(true);
    expect(doc).toHaveBeenCalledWith({}, 'public_shops', 'shop-9');
    expect(safeUpdateDoc).toHaveBeenCalledWith(expect.anything(), { items });
  });

  it('default private path cannot write → false (explicit store required)', async () => {
    const ok = await applyShopMenuItems(shop, false, items);
    expect(ok).toBe(false);
  });
});

describe('shouldOfferMenuUpdate (v7.5.82 gate)', () => {
  const base = { hasItems: true, shopResolved: true, isPublic: false, isSignedIn: false, hasDiff: true };

  it('plain entry (hasItems false) → false', () => {
    expect(shouldOfferMenuUpdate({ ...base, hasItems: false })).toBe(false);
  });

  it('no shop resolves (shopResolved false) → false', () => {
    expect(shouldOfferMenuUpdate({ ...base, shopResolved: false })).toBe(false);
  });

  it('nothing differs (hasDiff false) → false', () => {
    expect(shouldOfferMenuUpdate({ ...base, hasDiff: false })).toBe(false);
  });

  it('guest + public shop (isSignedIn false, isPublic true) → false', () => {
    expect(shouldOfferMenuUpdate({ ...base, isPublic: true, isSignedIn: false })).toBe(false);
  });

  it('guest + private shop → true', () => {
    expect(shouldOfferMenuUpdate({ ...base, isPublic: false, isSignedIn: false })).toBe(true);
  });

  it('signed-in + public shop → true', () => {
    expect(shouldOfferMenuUpdate({ ...base, isPublic: true, isSignedIn: true })).toBe(true);
  });

  it('signed-in + private shop → true', () => {
    expect(shouldOfferMenuUpdate({ ...base, isPublic: false, isSignedIn: true })).toBe(true);
  });
});

describe('buildVehicleMenuCandidate (v7.5.83)', () => {
  const fuelBase = {
    entryModel: 'fuel' as const,
    shopName: 'Denko',
    fuelType: 'Octane 92',
    fuelLiters: 10,
    fuelPricePerLiter: 3100,
  };

  it('fuel builds Octane 92 / လီတာ / price-per-litre, amount = price × litres', () => {
    const c = buildVehicleMenuCandidate(fuelBase);
    expect(c).toEqual({
      shopName: 'Denko',
      items: [{ name: 'Octane 92', price: 3100, quantity: 10, amount: 31000, unit: 'လီတာ' }],
    });
  });

  it('fuel with no station → null', () => {
    expect(buildVehicleMenuCandidate({ ...fuelBase, shopName: '' })).toBeNull();
    expect(buildVehicleMenuCandidate({ ...fuelBase, shopName: '   ' })).toBeNull();
  });

  it('fuel price 0 → null; litres 0 → null', () => {
    expect(buildVehicleMenuCandidate({ ...fuelBase, fuelPricePerLiter: 0 })).toBeNull();
    expect(buildVehicleMenuCandidate({ ...fuelBase, fuelLiters: 0 })).toBeNull();
    expect(buildVehicleMenuCandidate({ ...fuelBase, fuelPricePerLiter: -100 })).toBeNull();
  });

  it('fuel with no fuel type → null', () => {
    expect(buildVehicleMenuCandidate({ ...fuelBase, fuelType: '' })).toBeNull();
    expect(buildVehicleMenuCandidate({ ...fuelBase, fuelType: '  ' })).toBeNull();
  });

  it('fuel item flows through computeMenuDiff: 3000 → 3100 is an update row (not large)', () => {
    const c = buildVehicleMenuCandidate(fuelBase)!;
    const rows = computeMenuDiff(
      [{ name: 'Octane 92', price: 3000, unit: 'လီတာ' }],
      c.items,
    );
    expect(rows).toEqual([
      { itemName: 'Octane 92', unit: 'လီတာ', oldPrice: 3000, newPrice: 3100, isNew: false, isLargeDiff: false },
    ]);
  });

  it('fuel item flows through computeMenuDiff: a 3x jump flags a large diff', () => {
    const c = buildVehicleMenuCandidate({ ...fuelBase, fuelPricePerLiter: 9500 })!;
    const rows = computeMenuDiff(
      [{ name: 'Octane 92', price: 3000, unit: 'လီတာ' }],
      c.items,
    );
    expect(rows).toEqual([
      { itemName: 'Octane 92', unit: 'လီတာ', oldPrice: 3000, newPrice: 9500, isNew: false, isLargeDiff: true },
    ]);
  });

  const maintBase = {
    entryModel: 'vehicle_service' as const,
    shopName: 'ဝပ်ရှော့ A',
    maintServiceType: 'engine_oil',
    maintServiceLabel: 'အင်ဂျင်ဝိုင် (Engine Oil)',
    maintTitle: 'အင်ဂျင်ဝိုင် လဲလှယ်ခြင်း',
    extraNote: '',
    finalAmount: 45000,
  };

  it('maintenance builds title / ခု / total, quantity 1', () => {
    const c = buildVehicleMenuCandidate(maintBase);
    expect(c).toEqual({
      shopName: 'ဝပ်ရှော့ A',
      items: [{ name: 'အင်ဂျင်ဝိုင် လဲလှယ်ခြင်း', price: 45000, quantity: 1, amount: 45000, unit: 'ခု' }],
    });
  });

  it('maintenance with no title falls back to the service label', () => {
    const c = buildVehicleMenuCandidate({ ...maintBase, maintTitle: '' });
    expect(c?.items[0].name).toBe('အင်ဂျင်ဝိုင် (Engine Oil)');
  });

  it('maintenance with no title and no label falls back to the note, then the default', () => {
    const c = buildVehicleMenuCandidate({ ...maintBase, maintTitle: '', maintServiceLabel: '' });
    expect(c?.items[0].name).toBe('ယာဉ်ပြုပြင်ထိန်းသိမ်းမှု');
    const c2 = buildVehicleMenuCandidate({ ...maintBase, maintTitle: '', maintServiceLabel: '', extraNote: 'ဘရိတ်စစ်ဆေးခြင်း' });
    expect(c2?.items[0].name).toBe('ဘရိတ်စစ်ဆေးခြင်း');
  });

  it('maintenance with no workshop → null; amount 0 → null', () => {
    expect(buildVehicleMenuCandidate({ ...maintBase, shopName: '' })).toBeNull();
    expect(buildVehicleMenuCandidate({ ...maintBase, finalAmount: 0 })).toBeNull();
  });

  it('license_renewal → null (a government office is not a shop)', () => {
    expect(buildVehicleMenuCandidate({ ...maintBase, maintServiceType: 'license_renewal' })).toBeNull();
  });

  it('tire_pressure → null (free, no price)', () => {
    expect(buildVehicleMenuCandidate({ entryModel: 'tire_pressure', shopName: 'Denko' })).toBeNull();
  });

  it('general → null (the helper only handles vehicle models)', () => {
    expect(buildVehicleMenuCandidate({ entryModel: 'general', shopName: 'Denko' })).toBeNull();
  });
});

describe('resolveMenuShop (v7.5.85 FIX 2 — stash / retry resolution)', () => {
  const txItems = [{ name: 'Rice', price: 1200, quantity: 1, amount: 1200, unit: 'ကီလို' }];
  const fetchPublic = async (id: string) => ({
    id,
    name: 'Denko',
    items: [{ name: 'Rice', price: 1000, updatedAt: 111, addedBy: 'a@x.com', unit: 'ကီလို' }],
  });

  it('unknown shop (neither list) → null — the candidate is STASHED, not dropped', async () => {
    const resolved = await resolveMenuShop('New Shop', [], [], fetchPublic);
    expect(resolved).toBeNull();
  });

  it('retry after the shop appears: same name now resolves to the private shop', async () => {
    // Save time: nothing resolves → stash. Later: the details prompt
    // created the shop → the retry re-runs the SAME resolution.
    expect(await resolveMenuShop('New Shop', [], [], fetchPublic)).toBeNull();
    const privateShops = [{ id: 'priv-1', name: 'New Shop', items: [] }];
    const resolved = await resolveMenuShop('New Shop', [], privateShops, fetchPublic);
    expect(resolved).toEqual({ shop: privateShops[0], isPublic: false });
    // And the stashed items now diff against its (empty) menu → a prompt row.
    const rows = buildMenuPromptRows(txItems, resolved, false);
    expect(rows).toEqual([
      { itemName: 'Rice', unit: 'ကီလို', oldPrice: null, newPrice: 1200, isNew: true, isLargeDiff: false },
    ]);
  });

  it('matching is trim + case-insensitive, like the details prompt', async () => {
    const privateShops = [{ id: 'priv-1', name: 'Denko Shop', items: [] }];
    const resolved = await resolveMenuShop('  DENKO shop ', [], privateShops, fetchPublic);
    expect(resolved?.shop.id).toBe('priv-1');
    expect(resolved?.isPublic).toBe(false);
  });

  it('public wins over a private namesake and the full doc is fetched by id', async () => {
    const fetch = vi.fn(fetchPublic);
    const privateShops = [{ id: 'priv-1', name: 'Denko', items: [] }];
    const resolved = await resolveMenuShop('Denko', [{ id: 'pub-9', name: 'Denko' }], privateShops, fetch);
    expect(fetch).toHaveBeenCalledWith('pub-9');
    expect(resolved).toEqual({
      shop: { id: 'pub-9', name: 'Denko', items: [{ name: 'Rice', price: 1000, updatedAt: 111, addedBy: 'a@x.com', unit: 'ကီလို' }] },
      isPublic: true,
    });
  });

  // [v7.5.89 A6] A public hit whose full doc is gone / fails to fetch
  // FALLS BACK to the private namesake instead of returning null.
  it('public hit but the full doc is gone → falls back to the private namesake', async () => {
    const fetch = vi.fn(async () => null);
    const privateShops = [{ id: 'priv-1', name: 'Denko', items: [] }];
    const resolved = await resolveMenuShop('Denko', [{ id: 'pub-9', name: 'Denko' }], privateShops, fetch);
    expect(resolved).toEqual({ shop: privateShops[0], isPublic: false });
  });

  it('public fetch throwing → falls back to the private namesake', async () => {
    const fetch = vi.fn(async () => { throw new Error('offline'); });
    const privateShops = [{ id: 'priv-1', name: 'Denko', items: [] }];
    const resolved = await resolveMenuShop('Denko', [{ id: 'pub-9', name: 'Denko' }], privateShops, fetch);
    expect(resolved).toEqual({ shop: privateShops[0], isPublic: false });
  });

  it('public hit gone and NO private namesake → null', async () => {
    const fetch = vi.fn(async () => null);
    expect(await resolveMenuShop('Denko', [{ id: 'pub-9', name: 'Denko' }], [], fetch)).toBeNull();
  });

  // [v7.5.89 A6] Among same-name duplicates prefer the doc WITH items.
  it('among same-name public duplicates prefers the doc WITH items', async () => {
    const fetch = vi.fn(async (id: string) =>
      id === 'pub-empty'
        ? { id, name: 'Denko', items: [] }
        : { id, name: 'Denko', items: [{ name: 'Rice', price: 1000, updatedAt: 1, addedBy: 'a', unit: 'ကီလို' }] },
    );
    const resolved = await resolveMenuShop(
      'Denko',
      [{ id: 'pub-empty', name: 'Denko' }, { id: 'pub-full', name: 'Denko' }],
      [],
      fetch,
    );
    expect(resolved?.shop.id).toBe('pub-full');
    expect(resolved?.isPublic).toBe(true);
  });

  it('among same-name private duplicates prefers the doc WITH items', async () => {
    const privateShops = [
      { id: 'priv-empty', name: 'Denko', items: [] },
      { id: 'priv-full', name: 'Denko', items: [{ name: 'Rice', price: 1000, updatedAt: 1, addedBy: 'a' }] },
    ];
    const resolved = await resolveMenuShop('Denko', [], privateShops, fetchPublic);
    expect(resolved?.shop.id).toBe('priv-full');
    expect(resolved?.isPublic).toBe(false);
  });

  it('a single public hit with an empty menu still resolves (first fetched)', async () => {
    const fetch = vi.fn(async (id: string) => ({ id, name: 'Denko', items: [] }));
    const resolved = await resolveMenuShop('Denko', [{ id: 'pub-9', name: 'Denko' }], [], fetch);
    expect(resolved?.shop.id).toBe('pub-9');
    expect(resolved?.isPublic).toBe(true);
  });

  it('empty / blank name → null', async () => {
    expect(await resolveMenuShop('', [], [], fetchPublic)).toBeNull();
    expect(await resolveMenuShop('   ', [], [], fetchPublic)).toBeNull();
  });
});

describe('resolveMenuShopById (v7.5.89 A5 — re-resolve by id after rename)', () => {
  it('public shop renamed after prompt-open still resolves by id, under its new name', async () => {
    const fetch = vi.fn(async (id: string) => ({ id, name: 'Denko New Name', items: [] }));
    const resolved = await resolveMenuShopById('pub-9', true, [], fetch);
    expect(fetch).toHaveBeenCalledWith('pub-9');
    expect(resolved).toEqual({ shop: { id: 'pub-9', name: 'Denko New Name', items: [] }, isPublic: true });
  });

  it('private shop renamed still resolves by id from the local list', async () => {
    const privateShops = [{ id: 'priv-1', name: 'Renamed Shop', items: [] }];
    const resolved = await resolveMenuShopById('priv-1', false, privateShops, async () => null);
    expect(resolved).toEqual({ shop: privateShops[0], isPublic: false });
  });

  it('unknown id → null (caller falls back to name resolution)', async () => {
    expect(await resolveMenuShopById('pub-gone', true, [], async () => null)).toBeNull();
    expect(await resolveMenuShopById('priv-gone', false, [], async () => null)).toBeNull();
    expect(await resolveMenuShopById('', true, [], async () => null)).toBeNull();
  });

  it('public fetch throwing → null', async () => {
    const fetch = vi.fn(async () => { throw new Error('offline'); });
    expect(await resolveMenuShopById('pub-9', true, [], fetch)).toBeNull();
  });
});

describe('buildMenuPromptRows (v7.5.85 FIX 2 — retry gating)', () => {
  const txItems = [{ name: 'Rice', price: 1200, quantity: 1, amount: 1200, unit: 'ကီလို' }];

  it('unresolved shop → null', () => {
    expect(buildMenuPromptRows(txItems, null, true)).toBeNull();
  });

  it('same price as the fresh menu → null (nothing would change)', () => {
    const resolved = {
      shop: { id: 'priv-1', name: 'Denko', items: [{ name: 'Rice', price: 1200, updatedAt: 1, addedBy: 'a', unit: 'ကီလို' }] },
      isPublic: false,
    };
    expect(buildMenuPromptRows(txItems, resolved, false)).toBeNull();
  });

  it('guest + public shop → null (gate refuses, as before)', () => {
    const resolved = {
      shop: { id: 'pub-9', name: 'Denko', items: [{ name: 'Rice', price: 1000, updatedAt: 1, addedBy: 'a', unit: 'ကီလို' }] },
      isPublic: true,
    };
    expect(buildMenuPromptRows(txItems, resolved, false)).toBeNull();
    expect(buildMenuPromptRows(txItems, resolved, true)).toHaveLength(1);
  });
});

describe('applyResolvedMenuUpdate (v7.5.85 FIX 2 — re-resolve at apply)', () => {
  const rows: MenuUpdateRow[] = [
    { itemName: 'Rice', unit: 'ကီလို', oldPrice: 1000, newPrice: 1200, isNew: false, isLargeDiff: false },
  ];

  it('shop deleted (resolved null) → "not-found" and the store is NEVER called', async () => {
    const store = stubStore();
    const result = await applyResolvedMenuUpdate(null, rows, 'a@x.com', store);
    expect(result).toBe('not-found');
    expect(store.updatePublicShopItems).not.toHaveBeenCalled();
    expect(store.updatePrivateShopItems).not.toHaveBeenCalled();
  });

  it('shop moved to public → apply targets the PUBLIC copy, built from the FRESH menu', async () => {
    // Save time the prompt held the PRIVATE snapshot (Rice 900, no
    // Sugar line). By apply time the shop is public with a FRESH menu
    // (Rice 1000, Sugar 2000) — the write must use the fresh base,
    // not the stale private snapshot.
    const fetchPublic = async (id: string) => ({
      id,
      name: 'Denko',
      items: [
        { name: 'Rice', price: 1000, updatedAt: 111, addedBy: 'a@x.com', unit: 'ကီလို' },
        { name: 'Sugar', price: 2000, updatedAt: 222, addedBy: 'a@x.com' },
      ],
    });
    const fresh = await resolveMenuShop('Denko', [{ id: 'pub-9', name: 'Denko' }], [], fetchPublic);
    expect(fresh?.isPublic).toBe(true);
    const store = stubStore();
    const result = await applyResolvedMenuUpdate(fresh, rows, 'a@x.com', store);
    expect(result).toBe('applied');
    expect(store.updatePublicShopItems).toHaveBeenCalledWith('pub-9', [
      { name: 'Rice', price: 1200, unit: 'ကီလို', updatedAt: expect.any(Number), addedBy: 'a@x.com' },
      { name: 'Sugar', price: 2000, updatedAt: 222, addedBy: 'a@x.com' },
    ]);
    expect(store.updatePrivateShopItems).not.toHaveBeenCalled();
  });

  it('private shop still private → private store, store failure → "failed"', async () => {
    const resolved = {
      shop: { id: 'priv-1', name: 'Denko', items: [{ name: 'Rice', price: 1000, updatedAt: 111, addedBy: 'a', unit: 'ကီလို' }] },
      isPublic: false,
    };
    const failing = stubStore({ updatePrivateShopItems: vi.fn(async () => false) });
    expect(await applyResolvedMenuUpdate(resolved, rows, 'a@x.com', failing)).toBe('failed');
    const okStore = stubStore();
    expect(await applyResolvedMenuUpdate(resolved, rows, 'a@x.com', okStore)).toBe('applied');
    expect(okStore.updatePrivateShopItems).toHaveBeenCalledTimes(1);
    expect(okStore.updatePublicShopItems).not.toHaveBeenCalled();
  });
});
