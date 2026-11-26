// [v7.6.56] Group 8 synthesis: the re-apply paths must see the
// visits the save path sees — standalone maintenance/fuel logs,
// Vehicles-tab visits whose transaction contributed nothing to the
// workshop, and fuel visits (whose transactions carry no shop or
// items at all). Labor exactly once per visit; newest record wins
// per name+unit (stamp-aware); license_renewal never yields a row.
import { describe, it, expect } from 'vitest';
import {
  buildVehicleMenuCandidate,
  collectLatestItemsByShop,
  deriveGlobalMenuPending,
  shopMenuState,
  type MenuShopListEntry,
} from '../shopMenuUpdate';
import type { Transaction, VehicleMaintenance, FuelLog } from '../../types';

const item = (name: string, price: number, quantity = 1, unit = 'ခု') => ({
  name,
  price,
  quantity,
  amount: price * quantity,
  unit,
});
const vtx = (over: Record<string, unknown>): Transaction =>
  ({
    id: 'tx1',
    date: '2026-11-26',
    createdAt: 5,
    shopName: '',
    items: [],
    splits: undefined,
    ...over,
  }) as unknown as Transaction;
const maint = (over: Record<string, unknown> = {}): VehicleMaintenance =>
  ({
    id: 'm1',
    vehicleId: 'v1',
    date: '2026-11-26',
    odometer: 1000,
    serviceType: 'engine_oil',
    title: 'Oil Change',
    cost: 35000,
    laborCost: 5000,
    workshopName: 'workshop a',
    syncToExpense: true,
    transactionId: 'tx1',
    walletId: 'w1',
    userId: 'u1',
    createdAt: 5,
    ...over,
  }) as VehicleMaintenance;
const fuel = (over: Record<string, unknown> = {}): FuelLog =>
  ({
    id: 'f1',
    vehicleId: 'v1',
    date: '2026-11-26',
    odometer: 1000,
    liters: 10,
    pricePerLiter: 3100,
    totalCost: 31000,
    isFullTank: true,
    fuelType: 'Octane 92',
    gasStation: 'station x',
    syncToExpense: true,
    transactionId: 'txf1',
    walletId: 'w1',
    userId: 'u1',
    createdAt: 5,
    ...over,
  }) as FuelLog;

const names = (entry: { latest: Map<string, unknown> } | undefined) =>
  entry ? [...entry.latest.values()].map((i: any) => i.name) : [];

describe('buildVehicleMenuCandidate — Vehicles-tab payload shapes', () => {
  it('multi-row maintenance payload: one item per row + a separate labor row (parts prices untouched)', () => {
    const c = buildVehicleMenuCandidate({
      entryModel: 'vehicle_service',
      shopName: 'workshop a',
      maintServiceType: 'engine_oil',
      maintTitle: '',
      extraNote: '',
      finalAmount: 35000,
      laborCost: 5000,
      rows: [{ name: 'Brake Pad', price: 30000, quantity: 1, amount: 30000, unit: 'ခု' }],
    });
    expect(c).toEqual({
      shopName: 'workshop a',
      items: [
        { name: 'Brake Pad', price: 30000, quantity: 1, amount: 30000, unit: 'ခု' },
        { name: 'ဝန်ဆောင်ခ', price: 5000, quantity: 1, amount: 5000 },
      ],
    });
  });

  it('empty workshop → null even with rows', () => {
    expect(
      buildVehicleMenuCandidate({
        entryModel: 'vehicle_service',
        shopName: '   ',
        maintServiceType: 'engine_oil',
        finalAmount: 35000,
        rows: [{ name: 'Brake Pad', price: 30000, quantity: 1, amount: 30000, unit: 'ခု' }],
      }),
    ).toBeNull();
  });

  it('license_renewal payload → null even with rows', () => {
    expect(
      buildVehicleMenuCandidate({
        entryModel: 'vehicle_service',
        shopName: 'workshop a',
        maintServiceType: 'license_renewal',
        finalAmount: 35000,
        rows: [{ name: 'License', price: 35000, quantity: 1, amount: 35000, unit: 'ခု' }],
      }),
    ).toBeNull();
  });

  it('fuel payload with no station → null', () => {
    expect(
      buildVehicleMenuCandidate({
        entryModel: 'fuel',
        shopName: '',
        fuelType: 'Octane 92',
        fuelLiters: 10,
        fuelPricePerLiter: 3100,
      }),
    ).toBeNull();
  });
});

describe('collectLatestItemsByShop — standalone + Vehicles-tab synthesis (v7.6.56)', () => {
  it('A: a transaction with no shop contributes its unplaced items to the workshop', () => {
    const t = vtx({ items: [item('Brake Pad', 30000)] });
    const byShop = collectLatestItemsByShop([t], [], [maint({})]);
    const entry = byShop.get('workshop a');
    expect(entry).toBeDefined();
    expect(names(entry)).toContain('Brake Pad');
    const labor = [...entry!.latest.values()].find((i: any) => i.name === 'ဝန်ဆောင်ခ');
    expect(labor).toEqual({ name: 'ဝန်ဆောင်ခ', price: 5000, quantity: 1, amount: 5000 });
  });

  it('B: a standalone maintenance log (no transaction) synthesizes title/cost + labor', () => {
    const byShop = collectLatestItemsByShop([], [], [maint({ transactionId: undefined })]);
    const entry = byShop.get('workshop a');
    expect(entry).toBeDefined();
    const items = [...entry!.latest.values()];
    // Parts total only (35000 − 5000 labor), plus the separate labor row.
    expect(items).toContainEqual({ name: 'Oil Change', price: 30000, quantity: 1, amount: 30000, unit: 'ခု' });
    expect(items).toContainEqual({ name: 'ဝန်ဆောင်ခ', price: 5000, quantity: 1, amount: 5000 });
  });

  it('C: a standalone fuel log synthesizes its fuel-type item for the station', () => {
    const byShop = collectLatestItemsByShop([], [], [], [fuel({ transactionId: undefined })]);
    const entry = byShop.get('station x');
    expect(entry).toBeDefined();
    expect([...entry!.latest.values()]).toEqual([
      { name: 'Octane 92', price: 3100, quantity: 10, amount: 31000, unit: 'လီတာ' },
    ]);
  });

  it('D: a fuel log with a (shopless, itemless) transaction still synthesizes', () => {
    const t = vtx({ id: 'txf1', items: [] });
    const byShop = collectLatestItemsByShop([t], [], [], [fuel({})]);
    const entry = byShop.get('station x');
    expect(entry).toBeDefined();
    expect(names(entry)).toContain('Octane 92');
  });

  it('E: multi-record visit with an itemless transaction — parts per record, labor exactly once', () => {
    const t = vtx({ items: [] });
    const logs = [
      maint({ id: 'm1', title: 'Oil', cost: 30000, laborCost: 5000, createdAt: 6 }),
      maint({ id: 'm2', title: 'Filter', cost: 10000, laborCost: 0, createdAt: 5 }),
    ];
    const byShop = collectLatestItemsByShop([t], [], logs);
    const items = [...byShop.get('workshop a')!.latest.values()];
    expect(items).toContainEqual({ name: 'Oil', price: 25000, quantity: 1, amount: 25000, unit: 'ခု' });
    expect(items).toContainEqual({ name: 'Filter', price: 10000, quantity: 1, amount: 10000, unit: 'ခု' });
    expect(items.filter((i: any) => i.name === 'ဝန်ဆောင်ခ')).toHaveLength(1);
  });

  it('F: stamp-aware — an older log never overwrites a newer transaction item; a newer log does', () => {
    const t = vtx({ shopName: 'workshop a', items: [item('Oil', 30000)] });
    const older = collectLatestItemsByShop(
      [t],
      [],
      [maint({ transactionId: undefined, date: '2026-11-20', createdAt: 1, title: 'Oil', cost: 25000, laborCost: 0 })],
    );
    expect([...older.get('workshop a')!.latest.values()].find((i: any) => i.name === 'Oil')!.price).toBe(30000);
    const newer = collectLatestItemsByShop(
      [t],
      [],
      [maint({ transactionId: undefined, date: '2026-11-28', createdAt: 1, title: 'Oil', cost: 25000, laborCost: 0 })],
    );
    expect([...newer.get('workshop a')!.latest.values()].find((i: any) => i.name === 'Oil')!.price).toBe(25000);
  });

  it('G: items already placed at another shop are NOT duplicated at the workshop', () => {
    const t = vtx({ shopName: 'shop x', items: [item('Brake Pad', 30000)] });
    const byShop = collectLatestItemsByShop([t], [], [maint({})]);
    expect(byShop.get('workshop a')).toBeUndefined();
    expect(names(byShop.get('shop x'))).toContain('Brake Pad');
  });

  it('license_renewal logs and shopless logs synthesize nothing', () => {
    const byShop = collectLatestItemsByShop(
      [],
      [],
      [maint({ transactionId: undefined, serviceType: 'license_renewal' }), maint({ id: 'm2', transactionId: undefined, workshopName: '' })],
    );
    expect(byShop.size).toBe(0);
  });
});

describe('deriveGlobalMenuPending keys + shopMenuState (v7.6.56)', () => {
  const shops: MenuShopListEntry[] = [
    { id: 's1', name: 'workshop a', items: [{ name: 'Brake Pad', price: 30000, unit: 'ခု' }] },
    { id: 's2', name: 'station x', items: [{ name: 'Octane 92', price: 3000, unit: 'လီတာ' }] },
  ];
  const derive = (over: Record<string, unknown> = {}) =>
    deriveGlobalMenuPending({
      transactions: [vtx({ shopName: 'workshop a', items: [item('Brake Pad', 35000)] })],
      suggestions: [],
      privateShops: shops,
      publicShopNames: [],
      isSignedIn: true,
      fuelLogs: [fuel({})],
      ...over,
    });

  it('pendingKeys/doubtKeys/checkedKeys track the outcomes, including fuel visits', () => {
    const state = derive();
    expect(state.pendingCount).toBe(2);
    expect(state.pendingKeys).toContain('workshop a');
    expect(state.pendingKeys).toContain('station x');
    expect(state.checkedKeys).toHaveLength(0);
  });

  it('matching menus land in checkedKeys', () => {
    const state = derive({
      transactions: [vtx({ shopName: 'workshop a', items: [item('Brake Pad', 30000)] })],
      fuelLogs: [fuel({ pricePerLiter: 3000, totalCost: 30000 })],
    });
    expect(state.pendingCount).toBe(0);
    expect(state.upToDateCount).toBe(2);
    expect(state.checkedKeys).toContain('workshop a');
    expect(state.checkedKeys).toContain('station x');
  });

  it('a public-shop match is doubt, never up-to-date', () => {
    const state = derive({ publicShopNames: ['workshop a'] });
    expect(state.doubtKeys).toContain('workshop a');
    expect(state.hasDoubt).toBe(true);
  });

  it('shopMenuState: pending/doubt → pending, checked → upToDate, unseen/undefined → unknown', () => {
    const pending = derive();
    expect(shopMenuState(pending, 'Workshop A')).toBe('pending');
    expect(shopMenuState(pending, 'station x')).toBe('pending');
    expect(shopMenuState(pending, 'No Such Shop')).toBe('unknown');
    expect(shopMenuState(undefined, 'Workshop A')).toBe('unknown');
    const done = derive({
      transactions: [vtx({ shopName: 'workshop a', items: [item('Brake Pad', 30000)] })],
      fuelLogs: [fuel({ pricePerLiter: 3000, totalCost: 30000 })],
    });
    expect(shopMenuState(done, 'workshop a')).toBe('upToDate');
    const doubt = derive({ publicShopNames: ['workshop a'] });
    expect(shopMenuState(doubt, 'workshop a')).toBe('pending');
  });
});
