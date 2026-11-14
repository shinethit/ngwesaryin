// [v7.5.82] Unit tests for the shop menu auto-update diff / build /
// apply logic. Pure functions are tested directly; applyShopMenuItems
// is tested with a STUBBED store (no live Firestore). The default
// (real Firestore) store is exercised with MOCKED firebase modules —
// no network — following the shopReports.test.ts pattern.
import { describe, it, expect, vi } from 'vitest';

import {
  DEFAULT_MENU_UNIT,
  SHOP_MENU_UNITS,
  applyShopMenuItems,
  buildUpdatedMenuItems,
  computeMenuDiff,
  isLargePriceDifference,
  normalizeMenuItemName,
  normalizeMenuUnit,
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
  it('default unit is တစ်ခု', () => {
    expect(DEFAULT_MENU_UNIT).toBe('တစ်ခု');
  });

  it('has exactly the six units with Myanmar stored values', () => {
    expect(SHOP_MENU_UNITS.map((u) => u.value)).toEqual([
      'တစ်ခု',
      'တစ်ပါကင်',
      'တစ်ကီလို',
      'တစ်လီတာ',
      'တစ်ထုပ်',
      'အခြား',
    ]);
    expect(SHOP_MENU_UNITS[0]).toEqual({ value: 'တစ်ခု', labelMy: 'တစ်ခု', labelEn: 'per piece' });
    expect(SHOP_MENU_UNITS[2].labelEn).toBe('per kg');
    expect(SHOP_MENU_UNITS[3].labelEn).toBe('per litre');
  });
});

describe('normalizeMenuUnit', () => {
  it('trims and keeps a known unit', () => {
    expect(normalizeMenuUnit('  တစ်ကီလို ')).toBe('တစ်ကီလို');
  });

  it('empty / unknown / non-string fall back to the default', () => {
    expect(normalizeMenuUnit('')).toBe(DEFAULT_MENU_UNIT);
    expect(normalizeMenuUnit('   ')).toBe(DEFAULT_MENU_UNIT);
    expect(normalizeMenuUnit('per kilo')).toBe(DEFAULT_MENU_UNIT);
    expect(normalizeMenuUnit(undefined)).toBe(DEFAULT_MENU_UNIT);
    expect(normalizeMenuUnit(null)).toBe(DEFAULT_MENU_UNIT);
    expect(normalizeMenuUnit(42)).toBe(DEFAULT_MENU_UNIT);
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
    { name: 'Rice', price: 1000, unit: 'တစ်ကီလို', updatedAt: 111, addedBy: 'a@x.com' },
    { name: 'Sugar', price: 2000, updatedAt: 222, addedBy: 'a@x.com' },
  ];

  it('same name+unit, different price → update row', () => {
    const rows = computeMenuDiff(menu, [
      { name: 'Rice', price: 1200, quantity: 2, unit: 'တစ်ကီလို' },
    ]);
    expect(rows).toEqual([
      {
        itemName: 'Rice',
        unit: 'တစ်ကီလို',
        oldPrice: 1000,
        newPrice: 1200,
        isNew: false,
        isLargeDiff: false,
      },
    ]);
  });

  it('same name+unit, same price → no row', () => {
    expect(
      computeMenuDiff(menu, [{ name: 'Rice', price: 1000, quantity: 1, unit: 'တစ်ကီလို' }]),
    ).toEqual([]);
  });

  it('different name → new row with oldPrice null', () => {
    const rows = computeMenuDiff(menu, [{ name: 'Tea', price: 500, quantity: 1, unit: 'တစ်ထုပ်' }]);
    expect(rows).toEqual([
      {
        itemName: 'Tea',
        unit: 'တစ်ထုပ်',
        oldPrice: null,
        newPrice: 500,
        isNew: true,
        isLargeDiff: false,
      },
    ]);
  });

  it('same name, different unit → separate new row', () => {
    const rows = computeMenuDiff(menu, [
      { name: 'Rice', price: 25000, quantity: 1, unit: 'တစ်ထုပ်' },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ itemName: 'Rice', unit: 'တစ်ထုပ်', oldPrice: null, isNew: true });
  });

  it('unit-less menu item matches a တစ်ခု tx item', () => {
    const rows = computeMenuDiff(menu, [
      { name: 'Sugar', price: 2500, quantity: 1, unit: 'တစ်ခု' },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ itemName: 'Sugar', unit: 'တစ်ခု', oldPrice: 2000, isNew: false });
  });

  it('unit-less menu item matches a tx item with no unit at all', () => {
    const rows = computeMenuDiff(menu, [{ name: 'sugar', price: 2500, quantity: 1 }]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ oldPrice: 2000, newPrice: 2500, isNew: false });
  });

  it('name matching is case-insensitive and trimmed', () => {
    const rows = computeMenuDiff(menu, [
      { name: '  RICE ', price: 1300, quantity: 1, unit: 'တစ်ကီလို' },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].oldPrice).toBe(1000);
  });

  it('menu price is the per-unit price — quantity is NOT divided out', () => {
    const rows = computeMenuDiff([], [{ name: 'Egg', price: 400, quantity: 10, unit: 'တစ်ခု' }]);
    expect(rows[0].newPrice).toBe(400);
  });

  it('large-diff flag is set on update rows', () => {
    const rows = computeMenuDiff(menu, [
      { name: 'Rice', price: 3500, quantity: 1, unit: 'တစ်ကီလို' },
    ]);
    expect(rows[0].isLargeDiff).toBe(true);
    const small = computeMenuDiff(menu, [
      { name: 'Rice', price: 1100, quantity: 1, unit: 'တစ်ကီလို' },
    ]);
    expect(small[0].isLargeDiff).toBe(false);
  });

  it('duplicate tx item (same name+unit) keeps the LAST one', () => {
    const rows = computeMenuDiff(menu, [
      { name: 'Rice', price: 1200, quantity: 1, unit: 'တစ်ကီလို' },
      { name: 'Rice', price: 1500, quantity: 1, unit: 'တစ်ကီလို' },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].newPrice).toBe(1500);
  });

  it('empty name / quantity 0 / negative quantity / negative price are skipped', () => {
    const rows = computeMenuDiff(menu, [
      { name: '   ', price: 100, quantity: 1, unit: 'တစ်ခု' },
      { name: 'NoQty', price: 100, quantity: 0, unit: 'တစ်ခု' },
      { name: 'NegQty', price: 100, quantity: -1, unit: 'တစ်ခု' },
      { name: 'NegPrice', price: -50, quantity: 1, unit: 'တစ်ခု' },
    ]);
    expect(rows).toEqual([]);
  });

  it('empty menu + empty tx list → no rows', () => {
    expect(computeMenuDiff([], [])).toEqual([]);
  });
});

describe('buildUpdatedMenuItems', () => {
  const menu = [
    { name: 'Rice', price: 1000, unit: 'တစ်ကီလို', updatedAt: 111, addedBy: 'old@x.com' },
    { name: 'Sugar', price: 2000, updatedAt: 222, addedBy: 'old@x.com' },
  ];

  it('updates in place, preserves untouched items exactly', () => {
    const rows: MenuUpdateRow[] = [
      { itemName: 'Rice', unit: 'တစ်ကီလို', oldPrice: 1000, newPrice: 1200, isNew: false, isLargeDiff: false },
    ];
    const out = buildUpdatedMenuItems(menu, rows, 'new@x.com');
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ name: 'Rice', price: 1200, unit: 'တစ်ကီလို', addedBy: 'new@x.com' });
    expect(out[0].updatedAt).toBeGreaterThan(111);
    // Untouched item: original unit/addedBy/updatedAt preserved.
    expect(out[1]).toEqual({ name: 'Sugar', price: 2000, updatedAt: 222, addedBy: 'old@x.com' });
    expect('unit' in out[1]).toBe(false);
    // Input not mutated.
    expect(menu[0].price).toBe(1000);
  });

  it('unit-less matched item gains an explicit unit when updated', () => {
    const rows: MenuUpdateRow[] = [
      { itemName: 'Sugar', unit: 'တစ်ခု', oldPrice: 2000, newPrice: 2500, isNew: false, isLargeDiff: false },
    ];
    const out = buildUpdatedMenuItems(menu, rows, 'new@x.com');
    expect(out[1]).toMatchObject({ name: 'Sugar', price: 2500, unit: 'တစ်ခု', addedBy: 'new@x.com' });
  });

  it('new rows are prepended, newest first', () => {
    const rows: MenuUpdateRow[] = [
      { itemName: 'Tea', unit: 'တစ်ထုပ်', oldPrice: null, newPrice: 500, isNew: true, isLargeDiff: false },
      { itemName: 'Coffee', unit: 'တစ်ထုပ်', oldPrice: null, newPrice: 800, isNew: true, isLargeDiff: false },
    ];
    const out = buildUpdatedMenuItems(menu, rows, 'new@x.com');
    expect(out.map((i) => i.name)).toEqual(['Coffee', 'Tea', 'Rice', 'Sugar']);
    expect(out[0]).toMatchObject({ price: 800, unit: 'တစ်ထုပ်', addedBy: 'new@x.com' });
    expect(typeof out[0].updatedAt).toBe('number');
  });

  it('same name + different unit leaves the old line untouched', () => {
    const rows: MenuUpdateRow[] = [
      { itemName: 'Rice', unit: 'တစ်ထုပ်', oldPrice: null, newPrice: 25000, isNew: true, isLargeDiff: false },
    ];
    const out = buildUpdatedMenuItems(menu, rows, 'new@x.com');
    expect(out).toHaveLength(3);
    expect(out[0]).toMatchObject({ name: 'Rice', price: 25000, unit: 'တစ်ထုပ်' });
    const oldLine = out.find((i) => i.unit === 'တစ်ကီလို');
    expect(oldLine).toEqual({ name: 'Rice', price: 1000, unit: 'တစ်ကီလို', updatedAt: 111, addedBy: 'old@x.com' });
  });

  it('no rows → identical copy', () => {
    const out = buildUpdatedMenuItems(menu, [], 'new@x.com');
    expect(out).toEqual([
      { name: 'Rice', price: 1000, unit: 'တစ်ကီလို', updatedAt: 111, addedBy: 'old@x.com' },
      { name: 'Sugar', price: 2000, updatedAt: 222, addedBy: 'old@x.com' },
    ]);
  });
});

describe('applyShopMenuItems with a stub store', () => {
  const shop = { id: 'shop-1', items: [] };
  const items = [{ name: 'Rice', price: 1200, unit: 'တစ်ကီလို', updatedAt: 1, addedBy: 'a@x.com' }];

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
  const items = [{ name: 'Rice', price: 1200, unit: 'တစ်ကီလို', updatedAt: 1, addedBy: 'a@x.com' }];

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
