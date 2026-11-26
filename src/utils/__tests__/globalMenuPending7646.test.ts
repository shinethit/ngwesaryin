// [v7.6.46] Part E — state-aware "refresh all menus" button.
// Approach A: the pending state is derived SYNCHRONOUSLY from
// already-loaded data with the SAME helpers the click build uses
// (collectLatestItemsByShop + buildMenuPromptRows), so the two can
// never disagree on a private shop. No checked-stamp, no stored
// state: the derivation is pure, so Cancel (no data change) stays
// coloured and any new/edited transaction re-colours it.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  buildGlobalMenuSections,
  buildMenuPromptRows,
  collectLatestItemsByShop,
  deriveGlobalMenuPending,
  resolveMenuShop,
  type GlobalMenuShopEntry,
  type MenuShopListEntry,
} from '../shopMenuUpdate';
import type { Transaction, VehicleMaintenance, FuelLog } from '../../types';

const SRC = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');

type Item = { name: string; price: number; quantity: number; unit?: string };

const tx = (date: string, createdAt: number, shopName: string, items: Item[]): Transaction =>
  ({
    date,
    createdAt,
    shopName,
    items,
    splits: undefined,
  }) as unknown as Transaction;

const shopA = (items: { name: string; price: number; unit?: string }[]): MenuShopListEntry => ({
  id: 'shop-a',
  name: 'Shop A',
  items,
});
const shopB = (items: { name: string; price: number; unit?: string }[]): MenuShopListEntry => ({
  id: 'shop-b',
  name: 'Shop B',
  items,
});

// Shop A: menu price 1000, latest purchase 1500 + a new item -> pending.
// Shop B: menu matches the latest purchase exactly -> up to date.
const PENDING_TXS = [
  tx('2026-11-25', 3, 'Shop A', [
    { name: 'Rice', price: 1500, quantity: 1, unit: 'kg' },
    { name: 'Oil', price: 5000, quantity: 1, unit: 'L' },
  ]),
  tx('2026-11-20', 2, 'Shop A', [{ name: 'Rice', price: 1000, quantity: 1, unit: 'kg' }]),
  tx('2026-11-24', 1, 'Shop B', [{ name: 'Tea', price: 500, quantity: 1, unit: 'pack' }]),
];
const SHOPS = [shopA([{ name: 'Rice', price: 1000, unit: 'kg' }]), shopB([{ name: 'Tea', price: 500, unit: 'pack' }])];

const derive = (transactions: Transaction[], shops: MenuShopListEntry[], publicNames: string[] = [], signedIn = true) =>
  deriveGlobalMenuPending({
    transactions,
    suggestions: [],
    privateShops: shops,
    publicShopNames: publicNames,
    isSignedIn: signedIn,
  });

/** Replicates App's click build (resolve + buildGlobalMenuSections). */
async function clickBuild(
  transactions: Transaction[],
  shops: MenuShopListEntry[],
  publicShops: Array<{ id: string; name: string }> = [],
  signedIn = true,
  fuelLogs: FuelLog[] = [],
  maintenanceLogs: VehicleMaintenance[] = [],
) {
  const latestByShop = collectLatestItemsByShop(transactions, [], maintenanceLogs, fuelLogs);
  const entries: GlobalMenuShopEntry[] = [];
  for (const entry of latestByShop.values()) {
    const items = [...entry.latest.values()];
    if (items.length === 0) continue;
    const resolved = await resolveMenuShop(entry.displayName, publicShops, shops, async () => null);
    if (!resolved) continue;
    entries.push({ resolved, items });
  }
  return buildGlobalMenuSections(entries, signedIn);
}

describe('deriveGlobalMenuPending (v7.6.46 Part E)', () => {
  it('counts shops with a real diff, and up-to-date shops separately', () => {
    const state = derive(PENDING_TXS, SHOPS);
    expect(state.pendingCount).toBe(1);
    expect(state.hasDoubt).toBe(false);
    expect(state.checkedCount).toBe(2);
    expect(state.upToDateCount).toBe(1);
  });

  it('agrees with the click build on the same seed', async () => {
    const state = derive(PENDING_TXS, SHOPS);
    const built = await clickBuild(PENDING_TXS, SHOPS);
    expect(built.sections).toHaveLength(state.pendingCount);
    expect(built.sections[0].shopName).toBe('Shop A');
    expect(built.upToDateCount).toBe(state.upToDateCount);
  });

  it('agrees with the click build when everything is up to date', async () => {
    const upToDateTxs = [
      tx('2026-11-25', 3, 'Shop A', [{ name: 'Rice', price: 1000, quantity: 1, unit: 'kg' }]),
      tx('2026-11-24', 1, 'Shop B', [{ name: 'Tea', price: 500, quantity: 1, unit: 'pack' }]),
    ];
    const state = derive(upToDateTxs, SHOPS);
    expect(state.pendingCount).toBe(0);
    expect(state.hasDoubt).toBe(false);
    const built = await clickBuild(upToDateTxs, SHOPS);
    expect(built.sections).toHaveLength(0);
    expect(built.upToDateCount).toBe(2);
  });

  it('a public-name match is doubt, never up-to-date', () => {
    // The click build fetches the public menu; the sync path cannot
    // know it, so the button must stay coloured.
    const state = derive(PENDING_TXS, SHOPS, ['Shop A']);
    expect(state.hasDoubt).toBe(true);
    expect(state.pendingCount).toBe(0);
    expect(state.upToDateCount).toBe(1);
  });

  it('guest + public shop is never offered (the gate buildMenuPromptRows applies)', () => {
    const items = [{ name: 'Rice', price: 1500, quantity: 1, unit: 'kg' }] as GlobalMenuShopEntry['items'];
    const pub = { shop: { id: 'p1', name: 'Shop A', items: [{ name: 'Rice', price: 1000, unit: 'kg' }] }, isPublic: true };
    expect(buildMenuPromptRows(items, pub, false)).toBeNull();
    expect(buildMenuPromptRows(items, pub, true)).not.toBeNull();
  });

  it('an edited price flips pending 0 -> 1 (no stamp can go stale)', () => {
    const before = derive(
      [tx('2026-11-25', 3, 'Shop A', [{ name: 'Rice', price: 1000, quantity: 1, unit: 'kg' }])],
      SHOPS,
    );
    expect(before.pendingCount).toBe(0);
    const afterEdit = derive(
      [tx('2026-11-25', 3, 'Shop A', [{ name: 'Rice', price: 1200, quantity: 1, unit: 'kg' }])],
      SHOPS,
    );
    expect(afterEdit.pendingCount).toBe(1);
  });

  it('a shop matching nothing is skipped, like the click build', () => {
    const state = derive(
      [tx('2026-11-25', 3, 'Deleted Shop', [{ name: 'Rice', price: 1500, quantity: 1, unit: 'kg' }])],
      SHOPS,
    );
    expect(state.pendingCount).toBe(0);
    expect(state.hasDoubt).toBe(false);
    expect(state.checkedCount).toBe(0);
  });

  it('the derivation is pure: same inputs, same output (Cancel stays coloured)', () => {
    const first = derive(PENDING_TXS, SHOPS);
    const second = derive(PENDING_TXS, SHOPS);
    expect(second).toEqual(first);
    expect(first.pendingCount).toBe(1);
  });

  it('no stored stamp exists: the module never touches storage', () => {
    expect(SRC('../shopMenuUpdate.ts')).not.toContain('localStorage');
  });

  it('ShopsView renders the compact state-aware button in the filter row', () => {
    const shopsSrc = SRC('../../components/ShopsView.tsx');
    expect(shopsSrc).toContain('globalMenuPending');
    expect(shopsSrc).toContain('menuUpToDate');
    expect(shopsSrc).toContain('disabled={menuUpToDate}');
    expect(shopsSrc).toContain('[v7.6.46] Compact "refresh all menus" button');
    expect(shopsSrc).toContain("aria-label={lang === 'my' ? 'Menu အားလုံး ပြန် Update' : 'Refresh All Menus'}");
    // The old full-width row is gone (its marker comment + w-full class).
    expect(shopsSrc).not.toContain('[v7.6.44] Global Menu re-apply');
    expect(shopsSrc).not.toContain('w-full flex items-center justify-center gap-1.5 px-3 py-2 min-h-[44px]');
    // Dimmed styling exists for the up-to-date state.
    expect(shopsSrc).toContain('opacity-60');
  });

  it('App wires the derivation into ShopsView', () => {
    const appSrc = SRC('../../App.tsx');
    expect(appSrc).toContain('deriveGlobalMenuPending');
    expect(appSrc).toContain('globalMenuPending={globalMenuPendingState}');
    expect(appSrc).toContain('collectLatestItemsByShop(transactions, suggestions, vehicleMaintenance, fuelLogs)');
    expect(appSrc).toContain('maintenanceLogs: vehicleMaintenance');
    // [v7.6.56] The memo feeds fuel logs into the derivation too
    // (and recomputes when they change).
    expect(appSrc).toContain('[transactions, categories, shops, publicShops, user, vehicleMaintenance, fuelLogs]');
  });
});

describe('re-apply labor rows (v7.6.54)', () => {
  const maint = (over: Partial<VehicleMaintenance>): VehicleMaintenance =>
    ({
      id: 'm1',
      vehicleId: 'v1',
      date: '2026-11-26',
      odometer: 172223,
      serviceType: 'fan_belt',
      title: 'ပန်ကာကြိုး',
      cost: 85000,
      laborCost: 40000,
      workshopName: 'ဗိုလ်ဟိန်း - လီမွန်သီး',
      syncToExpense: true,
      transactionId: 'tx1',
      walletId: 'w1',
      userId: 'u1',
      ...over,
    }) as VehicleMaintenance;

  const visitTx = (id: string, date: string, createdAt: number): Transaction =>
    ({
      ...tx(date, createdAt, 'ဗိုလ်ဟိန်း - လီမွန်သီး', [
        { name: 'ပန်ကာကြိုး ၁', price: 27000, quantity: 1, unit: 'ခု' },
        { name: 'ပန်ကာကြိုး ၂', price: 9000, quantity: 2, unit: 'ခု' },
      ]),
      id,
    }) as unknown as Transaction;

  it('synthesizes the labor row for the visit shop, part prices stay pure', () => {
    const byShop = collectLatestItemsByShop([visitTx('tx1', '2026-11-26', 5)], [], [maint({})]);
    const entry = byShop.get('ဗိုလ်ဟိန်း - လီမွန်သီး');
    expect(entry).toBeDefined();
    const items = [...entry!.latest.values()];
    expect(items).toContainEqual({ name: 'ပန်ကာကြိုး ၁', price: 27000, quantity: 1, unit: 'ခု' });
    expect(items).toContainEqual({ name: 'ပန်ကာကြိုး ၂', price: 9000, quantity: 2, unit: 'ခု' });
    const labor = items.find((i) => i.name === 'ဝန်ဆောင်ခ');
    expect(labor).toEqual({ name: 'ဝန်ဆောင်ခ', price: 40000, quantity: 1, amount: 40000 });
    expect('unit' in labor!).toBe(false);
  });

  it('newest visit wins per shop; older labor is dropped', () => {
    const byShop = collectLatestItemsByShop(
      [visitTx('tx1', '2026-11-26', 5), visitTx('tx0', '2026-11-25', 4)],
      [],
      [maint({ transactionId: 'tx1', laborCost: 40000 }), maint({ id: 'm0', transactionId: 'tx0', laborCost: 30000 })],
    );
    const items = [...byShop.get('ဗိုလ်ဟိန်း - လီမွန်သီး')!.latest.values()];
    expect(items.find((i) => i.name === 'ဝန်ဆောင်ခ')!.price).toBe(40000);
  });

  it('no maintenance logs → no labor row (backward compatible)', () => {
    const byShop = collectLatestItemsByShop([visitTx('tx1', '2026-11-26', 5)], []);
    const items = [...byShop.get('ဗိုလ်ဟိန်း - လီမွန်သီး')!.latest.values()];
    expect(items.some((i) => i.name === 'ဝန်ဆောင်ခ')).toBe(false);
  });

  it('license_renewal and zero labor never yield a row', () => {
    const byShop = collectLatestItemsByShop(
      [visitTx('tx1', '2026-11-26', 5)],
      [],
      [maint({ serviceType: 'license_renewal' }), maint({ id: 'm2', transactionId: 'tx1', laborCost: 0 })],
    );
    const items = [...byShop.get('ဗိုလ်ဟိန်း - လီမွန်သီး')!.latest.values()];
    expect(items.some((i) => i.name === 'ဝန်ဆောင်ခ')).toBe(false);
  });

  it('labor-only visit (no items) still surfaces the labor row via the workshop name', () => {
    const laborOnly = {
      ...tx('2026-11-26', 5, '', []),
      id: 'tx9',
    } as unknown as Transaction;
    // [v7.6.56] Truly labor-only: the visit total IS the labor, so
    // the log synthesis yields no parts row — only the labor row
    // (a cost above the labor would now synthesize a parts row
    // too, per the F5 fix — see shopMenuSynthesis7656 Case E).
    const byShop = collectLatestItemsByShop([laborOnly], [], [maint({ transactionId: 'tx9', cost: 40000 })]);
    const entry = byShop.get('ဗိုလ်ဟိန်း - လီမွန်သီး');
    expect(entry).toBeDefined();
    expect([...entry!.latest.values()]).toEqual([
      { name: 'ဝန်ဆောင်ခ', price: 40000, quantity: 1, amount: 40000 },
    ]);
  });

  it('derivation counts a labor-only diff as pending, agreeing with the click build', async () => {
    const workshopShops: MenuShopListEntry[] = [
      {
        id: 'shop-w',
        name: 'ဗိုလ်ဟိန်း - လီမွန်သီး',
        items: [
          { name: 'ပန်ကာကြိုး ၁', price: 27000, unit: 'ခု' },
          { name: 'ပန်ကာကြိုး ၂', price: 9000, unit: 'ခု' },
        ],
      },
    ];
    const state = deriveGlobalMenuPending({
      transactions: [visitTx('tx1', '2026-11-26', 5)],
      suggestions: [],
      privateShops: workshopShops,
      publicShopNames: [],
      isSignedIn: true,
      maintenanceLogs: [maint({})],
    });
    // Part prices match the menu; only the labor row is new → pending.
    expect(state.pendingCount).toBe(1);
    expect(state.upToDateCount).toBe(0);
    const built = await (async () => {
      const latestByShop = collectLatestItemsByShop([visitTx('tx1', '2026-11-26', 5)], [], [maint({})]);
      const entries: GlobalMenuShopEntry[] = [];
      for (const e of latestByShop.values()) {
        const resolved = await resolveMenuShop(e.displayName, [], workshopShops, async () => null);
        if (resolved) entries.push({ resolved, items: [...e.latest.values()] });
      }
      return buildGlobalMenuSections(entries, true);
    })();
    expect(built.sections).toHaveLength(1);
    expect(built.sections[0].rows).toEqual([
      { itemName: 'ဝန်ဆောင်ခ', unit: 'ခု', oldPrice: null, newPrice: 40000, isNew: true, isLargeDiff: false },
    ]);
  });
});
