// [v7.5.86] Cross-shop item price search — pure-logic tests.
// The search reads SHARED menus (public shops + the signed-in user's own
// private shops). The guest rule is enforced by WHICH lists the caller
// passes in — these tests lock that in: a guest source (public only)
// never yields a private shop's rows, and an own-private source does.
import { describe, it, expect } from 'vitest';
import {
  searchShopMenus,
  collectMenuItemNames,
  filterItemNameSuggestions,
  getMenuItemNameSuggestions,
  getCheapestMenuPrice,
  describeOwnVsShopDiff,
  type ShopItemSearchSource,
} from '../shopItemSearch';

const publicShopA = {
  id: 'pub-a',
  name: 'ဆိုင်အေ',
  addedBy: 'someone@example.com',
  addedByUid: 'uid-other',
  items: [
    { name: 'ဆန်', price: 3000, unit: 'ကီလို', updatedAt: 1 },
    { name: 'ဆန်', price: 2800, unit: 'ခု', updatedAt: 1 },
    { name: 'ဆီ', price: 5000, unit: 'လီတာ', updatedAt: 1 },
  ],
} as const;

const publicShopB = {
  id: 'pub-b',
  name: 'ဆိုင်ဘီ',
  addedBy: 'other@example.com',
  addedByUid: 'uid-other-2',
  items: [
    { name: 'ဆန်', price: 2500, unit: 'ကီလို', updatedAt: 1 },
    { name: 'Panfor', price: 1200, unit: 'ခု', updatedAt: 1 },
  ],
} as const;

const myPrivateShop = {
  id: 'priv-mine',
  name: 'ကိုယ့်ဆိုင်',
  userId: 'uid-me',
  items: [
    { name: 'ဆန်', price: 2600, unit: 'ကီလို', updatedAt: 1 },
    { name: 'ဆား', price: 800, unit: 'ထုပ်', updatedAt: 1 },
  ],
} as const;

const otherPrivateShop = {
  id: 'priv-other',
  name: 'သူများဆိုင်',
  userId: 'uid-other',
  items: [{ name: 'ဆန်', price: 100, unit: 'ကီလို', updatedAt: 1 }],
} as const;

const PUBLIC_ONLY: ShopItemSearchSource = [publicShopA as any, publicShopB as any];
const WITH_MY_PRIVATE: ShopItemSearchSource = [
  publicShopA as any,
  publicShopB as any,
  myPrivateShop as any,
];

describe('searchShopMenus', () => {
  it('matches by normalized substring, case-insensitive', () => {
    const rows = searchShopMenus(PUBLIC_ONLY, 'pan');
    expect(rows.map((r) => r.itemName)).toEqual(['Panfor']);
    expect(rows[0].shopName).toBe('ဆိုင်ဘီ');
  });

  it('trims and lowercases the query', () => {
    expect(searchShopMenus(PUBLIC_ONLY, '  ဆန်  ').length).toBe(3);
  });

  it('empty query returns no rows (never the whole DB)', () => {
    expect(searchShopMenus(PUBLIC_ONLY, '')).toEqual([]);
    expect(searchShopMenus(PUBLIC_ONLY, '   ')).toEqual([]);
  });

  it('no match returns no rows', () => {
    expect(searchShopMenus(PUBLIC_ONLY, 'zzzzqq')).toEqual([]);
  });

  it('sorts cheapest first', () => {
    const rows = searchShopMenus(PUBLIC_ONLY, 'ဆန်');
    expect(rows.map((r) => r.price)).toEqual([2500, 2800, 3000]);
    expect(rows[0].shopName).toBe('ဆိုင်ဘီ');
  });

  it('same name + different unit = separate rows', () => {
    const rows = searchShopMenus(PUBLIC_ONLY, 'ဆန်');
    const units = rows.map((r) => r.unit);
    expect(units).toContain('ကီလို');
    expect(units).toContain('ခု');
    expect(rows.length).toBe(3);
  });

  it('unit falls back to ခု when missing', () => {
    const shops = [
      { id: 'x', name: 'X', addedBy: 'a', addedByUid: 'u', items: [{ name: 'ဆန်', price: 100, updatedAt: 1 }] },
    ] as unknown as ShopItemSearchSource;
    expect(searchShopMenus(shops, 'ဆန်')[0].unit).toBe('ခု');
  });

  it('skips items with no name or a non-finite price', () => {
    const shops = [
      {
        id: 'x',
        name: 'X',
        addedBy: 'a',
        addedByUid: 'u',
        items: [
          { name: '', price: 100, updatedAt: 1 },
          { name: 'ဆန်', price: NaN, updatedAt: 1 },
          { name: 'ဆန်', price: 100, updatedAt: 1 },
        ],
      },
    ] as unknown as ShopItemSearchSource;
    expect(searchShopMenus(shops, 'ဆန်').length).toBe(1);
  });

  it('guest source (public only) never yields private rows', () => {
    const rows = searchShopMenus(PUBLIC_ONLY, 'ဆန်');
    expect(rows.every((r) => r.isPublic)).toBe(true);
    expect(rows.map((r) => r.shopName)).not.toContain('ကိုယ့်ဆိုင်');
    expect(rows.map((r) => r.shopName)).not.toContain('သူများဆိုင်');
  });

  it('own private shop is included when its list is passed in', () => {
    const rows = searchShopMenus(WITH_MY_PRIVATE, 'ဆန်');
    expect(rows.map((r) => r.price)).toEqual([2500, 2600, 2800, 3000]);
    const mine = rows.find((r) => r.shopName === 'ကိုယ့်ဆိုင်');
    expect(mine).toBeDefined();
    expect(mine!.isPublic).toBe(false);
  });

  it("another user's private shop is excluded because it is never passed in", () => {
    // The caller only ever passes publicShops / myShopsList — this test
    // locks the util's side: it searches exactly what it is given.
    const rows = searchShopMenus(WITH_MY_PRIVATE, 'ဆန်');
    expect(rows.map((r) => r.shopName)).not.toContain('သူများဆိုင်');
    const withOther = searchShopMenus(
      [...WITH_MY_PRIVATE, otherPrivateShop as any],
      'ဆန်'
    );
    expect(withOther.map((r) => r.price)).toContain(100);
  });

  it('tolerates shops with no items field', () => {
    const shops = [{ id: 'x', name: 'X', addedBy: 'a', addedByUid: 'u' }] as unknown as ShopItemSearchSource;
    expect(searchShopMenus(shops, 'ဆန်')).toEqual([]);
  });
});

describe('collectMenuItemNames', () => {
  it('dedupes by normalized name, keeps first-seen display, alphabetical', () => {
    const shops = [
      {
        id: 'x',
        name: 'X',
        addedBy: 'a',
        addedByUid: 'u',
        items: [
          { name: 'ဆန်', price: 1, updatedAt: 1 },
          { name: ' ဆန် ', price: 1, updatedAt: 1 },
          { name: 'Panfor', price: 1, updatedAt: 1 },
          { name: 'panfor', price: 1, updatedAt: 1 },
        ],
      },
    ] as unknown as ShopItemSearchSource;
    expect(collectMenuItemNames(shops)).toEqual(['Panfor', 'ဆန်']);
  });

  it('includes own-private names when that list is passed in', () => {
    expect(collectMenuItemNames(WITH_MY_PRIVATE)).toContain('ဆား');
    expect(collectMenuItemNames(PUBLIC_ONLY)).not.toContain('ဆား');
  });
});

describe('filterItemNameSuggestions', () => {
  const names = ['Panfor', 'ဆီ', 'ဆန်', 'ဆား'];

  it('substring match, case-insensitive', () => {
    expect(filterItemNameSuggestions(names, 'pan')).toEqual(['Panfor']);
    expect(filterItemNameSuggestions(names, 'ဆ')).toEqual(['ဆီ', 'ဆန်', 'ဆား']);
  });

  it('respects the limit', () => {
    expect(filterItemNameSuggestions(names, 'ဆ', 2)).toEqual(['ဆီ', 'ဆန်']);
  });

  it('empty query returns the first N names', () => {
    expect(filterItemNameSuggestions(names, '', 2)).toEqual(['Panfor', 'ဆီ']);
  });

  it('no match returns empty', () => {
    expect(filterItemNameSuggestions(names, 'zzzz')).toEqual([]);
  });
});

describe('getMenuItemNameSuggestions', () => {
  it('suggests from shared menus, deduped, limited', () => {
    // Order is localeCompare's deterministic order (ဆန် before ဆီ).
    expect(getMenuItemNameSuggestions(PUBLIC_ONLY, 'ဆ', 8)).toEqual(['ဆန်', 'ဆီ']);
    expect(getMenuItemNameSuggestions(PUBLIC_ONLY, 'pan')).toEqual(['Panfor']);
  });

  it('suggests own-private names too when that list is passed in', () => {
    expect(getMenuItemNameSuggestions(WITH_MY_PRIVATE, 'ဆ')).toEqual(['ဆန်', 'ဆား', 'ဆီ']);
  });
});

// [v7.5.87] Price Compare's other-shop price — EXACT normalized-key
// match (same-item identity), NOT the substring match searchShopMenus
// uses. Fixtures reuse the public/private shops above; the extra shop
// below carries the near-miss and Myanmar-digit cases.
const publicShopC = {
  id: 'pub-c',
  name: 'ဆိုင်စီ',
  addedBy: 'third@example.com',
  addedByUid: 'uid-other-3',
  items: [
    { name: 'ဆန်ချော', price: 100, unit: 'ကီလို', updatedAt: 1 },
    { name: 'ဆန် ၁ပြည်', price: 2400, unit: 'ကီလို', updatedAt: 1 },
  ],
} as const;

describe('getCheapestMenuPrice', () => {
  it('returns the cheapest row across shops, with shop + unit', () => {
    const best = getCheapestMenuPrice(WITH_MY_PRIVATE, 'ဆန်');
    expect(best).not.toBeNull();
    expect(best!.price).toBe(2500);
    expect(best!.shopName).toBe('ဆိုင်ဘီ');
    expect(best!.isPublic).toBe(true);
    expect(best!.unit).toBe('ကီလို');
    expect(best!.itemName).toBe('ဆန်');
  });

  it('cheapest-first across shops incl. own private when passed in', () => {
    // My private ဆန် is 2600 — pricier than ဆိုင်ဘီ 2500, so the
    // public shop still wins; with only my list it is the answer.
    expect(getCheapestMenuPrice([myPrivateShop as any], 'ဆန်')!.price).toBe(2600);
    expect(getCheapestMenuPrice([myPrivateShop as any], 'ဆန်')!.isPublic).toBe(false);
  });

  it('exact-key match: ဆန် must NOT match ဆန်ချော', () => {
    // A shop carrying ONLY ဆန်ချော (no genuine ဆန် row at all).
    const onlyNearMiss = [
      { id: 'nm', name: 'Near Miss', addedBy: 'a', addedByUid: 'u', items: [{ name: 'ဆန်ချော', price: 100, unit: 'ကီလို', updatedAt: 1 }] },
    ] as unknown as ShopItemSearchSource;
    expect(getCheapestMenuPrice(onlyNearMiss, 'ဆန်')).toBeNull();
    expect(getCheapestMenuPrice(onlyNearMiss, 'ဆန်ချော')!.price).toBe(100);
    // And the full fixture shop still proves the same point for ဆန်ချော
    // itself — its cheapest ဆန်ချော row is 100, not a ဆန် row.
    expect(getCheapestMenuPrice([publicShopC as any], 'ဆန်ချော')!.price).toBe(100);
  });

  it('Myanmar-digit variants collapse: menu ဆန် ၁ပြည် matches own ဆန်', () => {
    // 'ဆန် ၁ပြည်' normalizes to key 'ဆန်' (digit converted, quantity
    // stripped) — and at 2400 it is cheaper than ဆိုင်ဘီ's 2500.
    const shops = [...WITH_MY_PRIVATE, publicShopC as any];
    const best = getCheapestMenuPrice(shops, 'ဆန်');
    expect(best!.price).toBe(2400);
    expect(best!.shopName).toBe('ဆိုင်စီ');
    // The row carries its MENU display name + menu unit, not the own name.
    expect(best!.itemName).toBe('ဆန် ၁ပြည်');
    expect(best!.unit).toBe('ကီလို');
  });

  it('own name with quantity matches the same menu item', () => {
    expect(getCheapestMenuPrice(PUBLIC_ONLY, 'ဆန် 1 ပြည်')!.price).toBe(2500);
  });

  it('case-insensitive: Panfor matches panfor', () => {
    expect(getCheapestMenuPrice(PUBLIC_ONLY, 'PANFOR')!.price).toBe(1200);
  });

  it('ties break deterministically by shop name', () => {
    const tied = [
      { id: 't1', name: 'Shop Zeta', addedBy: 'a', addedByUid: 'u1', items: [{ name: 'ဆန်', price: 2000, unit: 'ကီလို', updatedAt: 1 }] },
      { id: 't2', name: 'Shop Alpha', addedBy: 'a', addedByUid: 'u2', items: [{ name: 'ဆန်', price: 2000, unit: 'ကီလို', updatedAt: 1 }] },
    ] as unknown as ShopItemSearchSource;
    expect(getCheapestMenuPrice(tied, 'ဆန်')!.shopName).toBe('Shop Alpha');
    // Order-independent: same result regardless of input order.
    expect(getCheapestMenuPrice([...tied].reverse(), 'ဆန်')!.shopName).toBe('Shop Alpha');
  });

  it('no menu anywhere → null', () => {
    expect(getCheapestMenuPrice(WITH_MY_PRIVATE, 'zzzzqq')).toBeNull();
    expect(getCheapestMenuPrice([], 'ဆန်')).toBeNull();
  });

  it('empty own name → null', () => {
    expect(getCheapestMenuPrice(WITH_MY_PRIVATE, '')).toBeNull();
    expect(getCheapestMenuPrice(WITH_MY_PRIVATE, '   ')).toBeNull();
  });

  it('skips menu rows with a non-finite price', () => {
    const shops = [
      { id: 'x', name: 'X', addedBy: 'a', addedByUid: 'u', items: [{ name: 'ဆန်', price: NaN, updatedAt: 1 }] },
    ] as unknown as ShopItemSearchSource;
    expect(getCheapestMenuPrice(shops, 'ဆန်')).toBeNull();
  });
});

describe('describeOwnVsShopDiff', () => {
  it('paid-more when the own latest price is higher', () => {
    expect(describeOwnVsShopDiff(3200, 2500)).toEqual({ diff: 700, verdict: 'paid-more' });
  });

  it('paid-less when the own latest price is lower', () => {
    expect(describeOwnVsShopDiff(2000, 2500)).toEqual({ diff: 500, verdict: 'paid-less' });
  });

  it('same when the prices are equal', () => {
    expect(describeOwnVsShopDiff(2500, 2500)).toEqual({ diff: 0, verdict: 'same' });
  });
});
