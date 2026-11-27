// [v7.6.44] Global Menu re-apply: ONE combined prompt for every shop
// with purchase history. Pure-helper coverage (buildGlobalMenuSections)
// + wiring pins for the header button, the combined modal and the App
// handlers. Source-text assertions (the repo pattern: components have
// no test renderer; layout behaviour is verified by renders). Source
// reads use `new URL` — NO path comparisons.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  buildGlobalMenuSections,
  type GlobalMenuShopEntry,
  type ResolvedMenuShop,
} from '../shopMenuUpdate';
import {
  VERSION_HISTORY,
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
} from '../../data/versionHistory';

const SRC = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');

const VERSION_JSON = JSON.parse(
  readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
);

const resolved = (id: string, name: string, isPublic: boolean, items: { name: string; price: number; unit?: string }[]): ResolvedMenuShop => ({
  shop: { id, name, items },
  isPublic,
});

const entry = (shop: ResolvedMenuShop, items: { name: string; price: number; quantity: number; unit?: string }[]): GlobalMenuShopEntry => ({
  resolved: shop,
  items: items as GlobalMenuShopEntry['items'],
});

describe('buildGlobalMenuSections (v7.6.44)', () => {
  it('a shop with a real diff becomes a section with the prompt rows', () => {
    const result = buildGlobalMenuSections(
      [
        entry(resolved('s1', 'Shop A', false, [{ name: 'Rice', price: 1000, unit: 'kg' }]), [
          { name: 'Rice', price: 1500, quantity: 1, unit: 'kg' },
          { name: 'Oil', price: 5000, quantity: 1, unit: 'L' },
        ]),
      ],
      true,
    );
    expect(result.checkedCount).toBe(1);
    expect(result.upToDateCount).toBe(0);
    expect(result.skippedPublicCount).toBe(0);
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].shopId).toBe('s1');
    expect(result.sections[0].shopName).toBe('Shop A');
    expect(result.sections[0].isPublic).toBe(false);
    expect(result.sections[0].rows).toHaveLength(2);
    const rice = result.sections[0].rows.find((r) => r.itemName === 'Rice');
    expect(rice?.isNew).toBe(false);
    expect(rice?.oldPrice).toBe(1000);
    expect(rice?.newPrice).toBe(1500);
    expect(rice?.isLargeDiff).toBe(false);
    const oil = result.sections[0].rows.find((r) => r.itemName === 'Oil');
    expect(oil?.isNew).toBe(true);
    expect(oil?.oldPrice).toBe(null);
  });

  it('a 3x price jump keeps the large-diff flag on the row', () => {
    const result = buildGlobalMenuSections(
      [
        entry(resolved('s1', 'Shop A', false, [{ name: 'Rice', price: 1000, unit: 'kg' }]), [
          { name: 'Rice', price: 3000, quantity: 1, unit: 'kg' },
        ]),
      ],
      true,
    );
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].rows[0].isLargeDiff).toBe(true);
  });

  it('an up-to-date shop counts as up to date, with no section', () => {
    const result = buildGlobalMenuSections(
      [
        entry(resolved('s1', 'Shop A', false, [{ name: 'Rice', price: 1000, unit: 'kg' }]), [
          { name: 'Rice', price: 1000, quantity: 1, unit: 'kg' },
        ]),
      ],
      true,
    );
    expect(result.sections).toHaveLength(0);
    expect(result.checkedCount).toBe(1);
    expect(result.upToDateCount).toBe(1);
    expect(result.skippedPublicCount).toBe(0);
  });

  it('a guest + public shop with a real diff is skipped, never silently dropped', () => {
    const result = buildGlobalMenuSections(
      [
        entry(resolved('p1', 'Public Shop', true, [{ name: 'Rice', price: 1000, unit: 'kg' }]), [
          { name: 'Rice', price: 1500, quantity: 1, unit: 'kg' },
        ]),
      ],
      false,
    );
    expect(result.sections).toHaveLength(0);
    expect(result.checkedCount).toBe(1);
    expect(result.upToDateCount).toBe(0);
    expect(result.skippedPublicCount).toBe(1);
  });

  it('a signed-in user gets a section for a public shop', () => {
    const result = buildGlobalMenuSections(
      [
        entry(resolved('p1', 'Public Shop', true, [{ name: 'Rice', price: 1000, unit: 'kg' }]), [
          { name: 'Rice', price: 1500, quantity: 1, unit: 'kg' },
        ]),
      ],
      true,
    );
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].isPublic).toBe(true);
    expect(result.skippedPublicCount).toBe(0);
  });

  it('mixed shops aggregate: sections + up-to-date + skipped counts', () => {
    const result = buildGlobalMenuSections(
      [
        entry(resolved('s1', 'Shop A', false, [{ name: 'Rice', price: 1000, unit: 'kg' }]), [
          { name: 'Rice', price: 1500, quantity: 1, unit: 'kg' },
        ]),
        entry(resolved('s2', 'Shop B', false, [{ name: 'Tea', price: 500, unit: 'ခု' }]), [
          { name: 'Tea', price: 500, quantity: 1, unit: 'ခု' },
        ]),
        entry(resolved('p1', 'Public Shop', true, [{ name: 'Rice', price: 1000, unit: 'kg' }]), [
          { name: 'Rice', price: 2000, quantity: 1, unit: 'kg' },
        ]),
      ],
      false,
    );
    expect(result.sections.map((s) => s.shopId)).toEqual(['s1']);
    expect(result.checkedCount).toBe(3);
    expect(result.upToDateCount).toBe(1);
    expect(result.skippedPublicCount).toBe(1);
  });

  it('no entries means no sections and zero counts', () => {
    const result = buildGlobalMenuSections([], true);
    expect(result.sections).toHaveLength(0);
    expect(result.checkedCount).toBe(0);
    expect(result.upToDateCount).toBe(0);
    expect(result.skippedPublicCount).toBe(0);
  });
});

describe('global button + combined modal wiring (v7.6.44)', () => {
  it('ShopsView renders the global button with the approved labels', () => {
    const src = SRC('../../components/ShopsView.tsx');
    expect(src).toContain('onReapplyAllShopMenus');
    expect(src).toContain('Menu အားလုံး ပြန် Update');
    expect(src).toContain('Refresh All Menus');
    expect(src).toContain('RefreshCw');
  });

  it('App threads the global handler into ShopsView', () => {
    const src = SRC('../../App.tsx');
    expect(src).toContain('handleReapplyAllShopMenus');
    expect(src).toContain('onReapplyAllShopMenus={handleReapplyAllShopMenus}');
    expect(src).toContain('buildGlobalMenuSections');
    expect(src).toContain('handleGlobalMenuPromptApply');
    expect(src).toContain('handleGlobalMenuPromptSkip');
    expect(src).toContain('globalMenuBuildRef');
  });

  it('App renders the combined modal and keeps the single-shop modal guarded', () => {
    const src = SRC('../../App.tsx');
    expect(src).toContain('GlobalMenuUpdatePromptModal');
    expect(src).toContain("!('global' in menuPrompt)");
    expect(src).toContain('handleMenuPromptApply');
    expect(src).toContain('handleMenuPromptSkip');
  });

  it('the combined modal shows coverage counts and per-shop counts', () => {
    const src = SRC('../../components/GlobalMenuUpdatePromptModal.tsx');
    expect(src).toContain('checkedCount');
    expect(src).toContain('upToDateCount');
    expect(src).toContain('skippedPublicCount');
    expect(src).toContain('GlobalMenuApplySelection');
    expect(src).toContain('အသစ်');
    expect(src).toContain('ဈေးပြောင်း');
    expect(src).toContain('မလုပ်တော့');
  });

  it('the per-shop button and handler use the shared synthesis (P2c), labels kept', () => {
    const app = SRC('../../App.tsx');
    expect(app).toContain('handleReapplyShopMenu');
    expect(app).toContain('onReapplyShopMenu={handleReapplyShopMenu}');
    // [v7.6.56] The handler's tx-only loop is replaced by the shared
    // collectLatestItemsByShop (standalone visits, fuel, labor) —
    // the button label and the onReapplyMenu prop contract stay.
    expect(app).toContain('collectLatestItemsByShop(transactions, suggestions, vehicleMaintenance, fuelLogs)');
    const card = SRC('../../components/shops/ShopCard.tsx');
    expect(card).toContain('Menu ပြန် Update');
    expect(card).toContain('onReapplyMenu');
    expect(card).toContain('Menu ကိုက်ညီနေပါပြီ');
  });
});

describe('Version pins roll to v7.6.52 / build 366', () => {
  it('constants, version.json and the top history entry agree, with no Admin strings', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.61');
    expect(CURRENT_BUILD_NUMBER).toBe(375);
    expect(VERSION_JSON.version).toBe('v7.6.61');
    expect(VERSION_JSON.buildNumber).toBe(375);
    const top = VERSION_HISTORY[0];
    expect(top.version).toBe('v7.6.61');
    expect(top.buildNumber).toBe(375);
    expect(top.changesMy.join(' ')).not.toContain('Admin');
    expect(top.changesEn.join(' ')).not.toContain('Admin');
    expect(top.changesMy.length).toBe(5);
    expect(top.changesEn.length).toBe(5);
    expect(VERSION_JSON.changesMy).toEqual(top.changesMy);
    expect(VERSION_JSON.changesEn).toEqual(top.changesEn);
  });
});
