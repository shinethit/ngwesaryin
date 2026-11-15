// [v7.5.85 FIX 1] Unit tests for buildMyShopsList — the Private
// ("ကိုယ်ပိုင်") tab list: private shops PLUS the public shops the user
// added themselves. Pure function, no Firestore/auth — plain objects.
import { describe, it, expect } from 'vitest';

import { buildMyShopsList, buildAllMenuShopsList } from '../myShops';
import type { ShopContact, PublicShop } from '../../types';

function privateShop(overrides: Partial<ShopContact> = {}): ShopContact {
  return {
    id: 'priv-1',
    name: 'Denko',
    phone: '091234567',
    userId: 'u1',
    createdAt: 1,
    ...overrides,
  };
}

function publicShop(overrides: Partial<PublicShop> = {}): PublicShop {
  return {
    id: 'pub-1',
    name: 'Denko',
    phone: '091234567',
    city: 'Taunggyi',
    addedBy: 'me@example.com',
    addedByUid: 'u1',
    createdAt: 2,
    ...overrides,
  };
}

describe('buildMyShopsList', () => {
  it('shows private shops plus my public shops (both present)', () => {
    const mine = privateShop({ id: 'priv-1', name: 'My Shop' });
    const myPublic = publicShop({ id: 'pub-1', name: 'Community Shop', addedByUid: 'u1' });
    const result = buildMyShopsList([mine], [myPublic], 'u1');
    expect(result.map((s) => s.id)).toEqual(['priv-1', 'pub-1']);
  });

  it("excludes other users' public shops", () => {
    const mine = privateShop({ id: 'priv-1', name: 'My Shop' });
    const others = publicShop({ id: 'pub-2', name: 'Their Shop', addedByUid: 'u2' });
    const result = buildMyShopsList([mine], [others], 'u1');
    expect(result.map((s) => s.id)).toEqual(['priv-1']);
  });

  it('guest / no uid returns private shops only', () => {
    const mine = privateShop({ id: 'priv-1', name: 'My Shop' });
    const myPublic = publicShop({ id: 'pub-1', name: 'Community Shop', addedByUid: 'u1' });
    for (const uid of [undefined, null, ''] as const) {
      expect(buildMyShopsList([mine], [myPublic], uid).map((s) => s.id)).toEqual(['priv-1']);
    }
  });

  it('dedupes by normalized name, preferring the PUBLIC copy', () => {
    // The brief window during a move: both copies exist. Same shop,
    // spelled with different case / whitespace.
    const priv = privateShop({ id: 'priv-1', name: '  Denko Shop ' });
    const pub = publicShop({ id: 'pub-1', name: 'denko shop', addedByUid: 'u1' });
    const result = buildMyShopsList([priv], [pub], 'u1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('pub-1');
    expect('addedBy' in result[0]).toBe(true);
  });

  it('does not mutate the input arrays', () => {
    const privates = [privateShop({ id: 'priv-1', name: 'My Shop' })];
    const publics = [publicShop({ id: 'pub-1', name: 'Community Shop', addedByUid: 'u1' })];
    const privatesBefore = [...privates];
    const publicsBefore = [...publics];
    const result = buildMyShopsList(privates, publics, 'u1');
    expect(result).not.toBe(privates);
    expect(result).not.toBe(publics);
    expect(privates).toEqual(privatesBefore);
    expect(publics).toEqual(publicsBefore);
  });

  it('returns a fresh copy even for a guest (no shared reference)', () => {
    const privates = [privateShop({ id: 'priv-1', name: 'My Shop' })];
    const result = buildMyShopsList(privates, [], undefined);
    expect(result).not.toBe(privates);
    expect(result).toEqual(privates);
  });
});

// [v7.5.87] The menu source for Price Compare's other-shop prices —
// ALL public menus + own private menus. This is deliberately NOT
// buildMyShopsList (which keeps only MY public shops): price inquiry
// must show everyone's prices.
describe('buildAllMenuShopsList', () => {
  it("includes other users' public shops, not just my own", () => {
    const mine = privateShop({ id: 'priv-1', name: 'My Shop' });
    const others = publicShop({ id: 'pub-2', name: 'Their Shop', addedByUid: 'u2' });
    const myPublic = publicShop({ id: 'pub-1', name: 'My Public Shop', addedByUid: 'u1' });
    const result = buildAllMenuShopsList([mine], [others, myPublic]);
    expect(result.map((s) => s.id)).toEqual(['pub-2', 'pub-1', 'priv-1']);
  });

  it('dedupes by normalized name, public copy wins over a private namesake', () => {
    const priv = privateShop({ id: 'priv-1', name: '  Denko Shop ' });
    const pub = publicShop({ id: 'pub-1', name: 'denko shop', addedByUid: 'u2' });
    const result = buildAllMenuShopsList([priv], [pub]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('pub-1');
    expect('addedBy' in result[0]).toBe(true);
  });

  it('tolerates empty lists', () => {
    expect(buildAllMenuShopsList([], [])).toEqual([]);
    expect(buildAllMenuShopsList([privateShop()], [])).toHaveLength(1);
  });
});
