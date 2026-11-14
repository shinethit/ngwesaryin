// [v7.5.82] Unit tests for shop price alerts — deterministic dedupe
// id, the alert doc shape, and submit with a STUBBED store. No live
// Firestore: submitShopPriceAlert takes the store as an optional
// second argument, and the default (real Firestore) store is built
// lazily, so importing this module never touches firebase.
import { describe, it, expect, vi } from 'vitest';

import {
  SHOP_PRICE_ALERTS_COLLECTION,
  buildShopPriceAlertDoc,
  buildShopPriceAlertId,
  submitShopPriceAlert,
  type ShopPriceAlert,
  type ShopPriceAlertStore,
} from '../shopPriceAlerts';

// Mocked Firestore for the DEFAULT-store test only (stub-store tests
// below never touch these mocks).
vi.mock('firebase/firestore', () => ({
  doc: vi.fn((...args: unknown[]) => ({ __doc: args })),
}));
vi.mock('../../lib/firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'uid-1', email: 'user@example.com' } },
  safeSetDoc: vi.fn(async () => true),
}));

import { doc } from 'firebase/firestore';
import { safeSetDoc } from '../../lib/firebase';

function stubStore(overrides: Partial<ShopPriceAlertStore> = {}): ShopPriceAlertStore & {
  writeAlert: ReturnType<typeof vi.fn>;
} {
  return {
    getCurrentUser: () => ({ uid: 'uid-1', email: 'user@example.com' }),
    writeAlert: vi.fn(async () => true),
    ...overrides,
  } as any;
}

describe('buildShopPriceAlertId', () => {
  it('is deterministic: same inputs give the same id', () => {
    expect(buildShopPriceAlertId('shop-1', 'Rice', 'kg')).toBe(
      buildShopPriceAlertId('shop-1', 'Rice', 'kg'),
    );
    expect(buildShopPriceAlertId('shop-1', 'Rice', 'kg')).toBe('shop-1_rice_kg');
  });

  it('normalizes case and whitespace (same item, different casing → same id)', () => {
    expect(buildShopPriceAlertId('shop-1', '  RICE ', ' KG ')).toBe('shop-1_rice_kg');
  });

  it('gives a different id for a different unit', () => {
    expect(buildShopPriceAlertId('shop-1', 'Rice', 'kg')).not.toBe(
      buildShopPriceAlertId('shop-1', 'Rice', 'pack'),
    );
    expect(buildShopPriceAlertId('shop-1', 'Rice', 'pack')).toBe('shop-1_rice_pack');
  });

  it("encodes '/' away so a name can never create a sub-path", () => {
    const id = buildShopPriceAlertId('shop-1', 'Oil / Ghee', 'bottle');
    expect(id).not.toContain('/');
    expect(id).toContain('%2F');
    expect(id).toBe('shop-1_oil%20%2F%20ghee_bottle');
  });

  it('truncates long encoded segments to 100 chars', () => {
    const longName = 'a'.repeat(150);
    const id = buildShopPriceAlertId('shop-1', longName, 'kg');
    const itemSegment = id.slice('shop-1_'.length, id.length - '_kg'.length);
    expect(itemSegment).toBe('a'.repeat(100));
    expect(id.length).toBe('shop-1_'.length + 100 + '_kg'.length);
  });
});

describe('buildShopPriceAlertDoc', () => {
  it('builds the exact shop_price_alerts doc shape', () => {
    const doc = buildShopPriceAlertDoc({
      shopId: 'shop-1',
      shopName: 'Denko Shop',
      itemName: 'Rice',
      unit: 'kg',
      oldPrice: 5000,
      newPrice: 6500,
      reportedByUid: 'uid-1',
      reportedBy: 'user@example.com',
      reportedAt: 1790000000000,
    });
    expect(doc).toEqual({
      shopId: 'shop-1',
      shopName: 'Denko Shop',
      itemName: 'Rice',
      unit: 'kg',
      oldPrice: 5000,
      newPrice: 6500,
      reportedByUid: 'uid-1',
      reportedBy: 'user@example.com',
      reportedAt: 1790000000000,
      status: 'pending',
    } satisfies Omit<ShopPriceAlert, 'id'>);
  });

  it('trims strings and always starts pending', () => {
    const doc = buildShopPriceAlertDoc({
      shopId: 'shop-1',
      shopName: '  Denko Shop ',
      itemName: '  Rice ',
      unit: ' kg ',
      oldPrice: 5000,
      newPrice: 6500,
      reportedByUid: 'uid-1',
      reportedBy: ' user@example.com ',
      reportedAt: 1,
    });
    expect(doc.shopName).toBe('Denko Shop');
    expect(doc.itemName).toBe('Rice');
    expect(doc.unit).toBe('kg');
    expect(doc.reportedBy).toBe('user@example.com');
    expect(doc.status).toBe('pending');
  });
});

describe('submitShopPriceAlert (stubbed store)', () => {
  it('submits and writes at the deterministic id with status pending', async () => {
    const store = stubStore();
    const result = await submitShopPriceAlert(
      { shopId: 'shop-1', shopName: 'Denko Shop', itemName: 'Rice', unit: 'kg', oldPrice: 5000, newPrice: 6500 },
      store,
    );
    expect(result).toBe('submitted');
    expect(store.writeAlert).toHaveBeenCalledTimes(1);
    const [id, written] = store.writeAlert.mock.calls[0] as [string, Omit<ShopPriceAlert, 'id'>];
    expect(id).toBe('shop-1_rice_kg');
    expect(written.shopId).toBe('shop-1');
    expect(written.shopName).toBe('Denko Shop');
    expect(written.itemName).toBe('Rice');
    expect(written.unit).toBe('kg');
    expect(written.oldPrice).toBe(5000);
    expect(written.newPrice).toBe(6500);
    expect(written.reportedByUid).toBe('uid-1');
    expect(written.reportedBy).toBe('user@example.com');
    expect(written.status).toBe('pending');
    expect(typeof written.reportedAt).toBe('number');
  });

  it('returns failed (no write) when nobody is signed in', async () => {
    const store = stubStore({ getCurrentUser: () => null });
    const result = await submitShopPriceAlert(
      { shopId: 'shop-1', shopName: 'Denko Shop', itemName: 'Rice', unit: 'kg', oldPrice: 5000, newPrice: 6500 },
      store,
    );
    expect(result).toBe('failed');
    expect(store.writeAlert).not.toHaveBeenCalled();
  });

  it('returns failed (no write) for a blank shop id / name / item', async () => {
    const store = stubStore();
    expect(
      await submitShopPriceAlert({ shopId: '   ', shopName: 'Denko', itemName: 'Rice', unit: 'kg', oldPrice: 5000, newPrice: 6500 }, store),
    ).toBe('failed');
    expect(
      await submitShopPriceAlert({ shopId: 'shop-1', shopName: '   ', itemName: 'Rice', unit: 'kg', oldPrice: 5000, newPrice: 6500 }, store),
    ).toBe('failed');
    expect(
      await submitShopPriceAlert({ shopId: 'shop-1', shopName: 'Denko', itemName: '   ', unit: 'kg', oldPrice: 5000, newPrice: 6500 }, store),
    ).toBe('failed');
    expect(store.writeAlert).not.toHaveBeenCalled();
  });

  it('returns failed (no write) for non-finite or negative prices', async () => {
    const store = stubStore();
    expect(
      await submitShopPriceAlert({ shopId: 'shop-1', shopName: 'Denko', itemName: 'Rice', unit: 'kg', oldPrice: NaN, newPrice: 6500 }, store),
    ).toBe('failed');
    expect(
      await submitShopPriceAlert({ shopId: 'shop-1', shopName: 'Denko', itemName: 'Rice', unit: 'kg', oldPrice: 5000, newPrice: Infinity }, store),
    ).toBe('failed');
    expect(
      await submitShopPriceAlert({ shopId: 'shop-1', shopName: 'Denko', itemName: 'Rice', unit: 'kg', oldPrice: 5000, newPrice: -1 }, store),
    ).toBe('failed');
    expect(store.writeAlert).not.toHaveBeenCalled();
  });

  it('returns failed — never a false success — when the write reports false', async () => {
    const store = stubStore({ writeAlert: vi.fn(async () => false) });
    const result = await submitShopPriceAlert(
      { shopId: 'shop-1', shopName: 'Denko Shop', itemName: 'Rice', unit: 'kg', oldPrice: 5000, newPrice: 6500 },
      store,
    );
    expect(result).toBe('failed');
  });

  it('returns failed when the write throws', async () => {
    const store = stubStore({ writeAlert: vi.fn(async () => { throw new Error('offline'); }) });
    const result = await submitShopPriceAlert(
      { shopId: 'shop-1', shopName: 'Denko Shop', itemName: 'Rice', unit: 'kg', oldPrice: 5000, newPrice: 6500 },
      store,
    );
    expect(result).toBe('failed');
  });

  it('re-submit after a dismiss overwrites with status pending (the id IS the dedupe)', async () => {
    const store = stubStore();
    const result = await submitShopPriceAlert(
      { shopId: 'shop-1', shopName: 'Denko Shop', itemName: 'Rice', unit: 'kg', oldPrice: 5000, newPrice: 7000 },
      store,
    );
    expect(result).toBe('submitted');
    const [id, written] = store.writeAlert.mock.calls[0] as [string, Omit<ShopPriceAlert, 'id'>];
    expect(id).toBe('shop-1_rice_kg');
    expect(written.status).toBe('pending');
    expect(written.newPrice).toBe(7000);
  });
});

describe('submitShopPriceAlert — default store (mocked Firestore)', () => {
  it('writes via safeSetDoc with merge: true at the deterministic id', async () => {
    const result = await submitShopPriceAlert(
      { shopId: 'shop-1', shopName: 'Denko Shop', itemName: 'Rice', unit: 'kg', oldPrice: 5000, newPrice: 6500 },
    );
    expect(result).toBe('submitted');
    expect(doc).toHaveBeenCalledWith({}, SHOP_PRICE_ALERTS_COLLECTION, 'shop-1_rice_kg');
    expect(safeSetDoc).toHaveBeenCalledTimes(1);
    const [, data, options] = vi.mocked(safeSetDoc).mock.calls[0] as unknown as [unknown, Omit<ShopPriceAlert, 'id'>, { merge: boolean }];
    expect(data.status).toBe('pending');
    expect(data.newPrice).toBe(6500);
    expect(options).toEqual({ merge: true });
  });
});
