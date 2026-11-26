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
import type { Transaction } from '../../types';

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
) {
  const latestByShop = collectLatestItemsByShop(transactions, []);
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
    expect(appSrc).toContain('collectLatestItemsByShop(transactions, suggestions)');
  });
});
