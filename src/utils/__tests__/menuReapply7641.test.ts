// [v7.6.41] Wiring pins: per-row-shop form + queue + re-apply
// button, and the v7.6.41 version surfaces. Source-text assertions
// (the repo pattern: components have no test renderer; layout
// behaviour is verified by renders). Source reads use `new URL` —
// NO path comparisons.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  VERSION_HISTORY,
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
} from '../../data/versionHistory';

const SRC = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');

const VERSION_JSON = JSON.parse(
  readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
);

describe('per-row shop form wiring (v7.6.41 A)', () => {
  const src = SRC('../../components/TransactionModal.tsx');

  it('the split row renders a shop picker reusing the shop list', () => {
    expect(src).toContain('shop-suggestions-split-');
    expect(src).toContain('shopSuggestionsFor(row.shopName)');
    expect(src).toContain("updateSplitRow(idx, { shopName: e.target.value })");
  });

  it('the save path builds one candidate per row shop', () => {
    expect(src).toContain('onShopMenuUpdateCandidates');
    expect(src).not.toContain('onShopMenuUpdateCandidate?.');
    expect(src).toContain('attributeItemsToShops(');
    expect(src).toContain('menuUpdateCandidates');
  });

  it('every distinct row shop gets the details check, not just the first name', () => {
    expect(src).toContain('for (const s of validSplits || [])');
    expect(src).toContain('isShopNameNeedingDetails(rowShop, shops, publicShops');
  });

  it('the old single-candidate prop name is gone', () => {
    expect(src).not.toContain('onShopMenuUpdateCandidate?:');
    expect(src).not.toContain('menuUpdateCandidate)');
  });
});

describe('menu queue + details sequencing wiring (v7.6.41 A)', () => {
  const src = SRC('../../App.tsx');

  it('candidates flow through one queue drained one prompt at a time', () => {
    expect(src).toContain('menuCandidateQueueRef');
    expect(src).toContain('const drainMenuQueue');
    expect(src).toContain('const openMenuPrompt');
    expect(src).toContain('handleShopMenuUpdateCandidates');
    expect(src).toContain('onShopMenuUpdateCandidates={handleShopMenuUpdateCandidates}');
  });

  it('the stash is a list and the retry iterates it', () => {
    expect(src).toContain('stashedMenuCandidatesRef');
    expect(src).not.toContain('stashedMenuCandidateRef.current = null');
    expect(src).not.toContain('pendingShopDetailsNameRef');
    expect(src).toContain('for (const stashed of [...stashes])');
  });

  it('details names queue as a deduped list and flush one at a time', () => {
    expect(src).toContain('pendingDetailsNamesRef');
    expect(src).toContain('detailsPromptOpenRef');
    expect(src).toContain('flushPendingShopDetails');
  });

  it('prompt close handlers drain the queue instead of only flushing details', () => {
    expect(src).toContain('drainMenuQueue();');
  });

  it('the shared gate is untouched: guest + public shop is refused', () => {
    const util = SRC('../shopMenuUpdate.ts');
    expect(util).toContain('(!input.isPublic || input.isSignedIn)');
    expect(util).toContain('export function shouldOfferMenuUpdate');
    expect(util).toContain('export function buildMenuPromptRows');
    expect(util).toContain('export async function applyResolvedMenuUpdate');
  });
});

describe('Records per-shop lines wiring (v7.6.41 A)', () => {
  const src = SRC('../../components/TransactionsView.tsx');

  it('lines expand per shop group, first line only for whole-record facts', () => {
    expect(src).toContain('splitShopGroups(t)');
    expect(src).toContain('isMultiShop');
    expect(src).toContain('isFirstLine');
    expect(src).toContain('🏪 {shopGroup.shopName}');
  });

  it('search matches a shop carried by any split row', () => {
    expect(src).toContain('rowShopNames');
    expect(src).toContain('getSplitAttribution(t)');
  });

  it('day subtotals stay transaction-level', () => {
    expect(src).toContain('group.transactions.length');
    expect(src).toContain('convertToMMK(t.amount, walletMap.get(t.walletId)');
  });
});

describe('detail modal per-row shop wiring (v7.6.41 A)', () => {
  it('split rows name a shop differing from the entry shop', () => {
    const src = SRC('../../components/TransactionDetailModal.tsx');
    expect(src).toContain('slice.shopName !== (tx.shopName');
    expect(src).toContain('🏪 {slice.shopName}');
  });
});

describe('menu re-apply button wiring (v7.6.41 B)', () => {
  it('ShopCard renders the button in both expanded views', () => {
    const src = SRC('../../components/shops/ShopCard.tsx');
    expect(src).toContain('onReapplyMenu');
    expect(src).toContain('Menu ပြန် Update');
    expect(src).toContain('Refresh Menu');
    expect(src).toContain('RefreshCw');
    expect(src).toContain('min-h-[44px]');
    expect(src).toContain('onReapplyMenu(shop, isPublic)');
  });

  it('ShopsView threads the handler to every ShopCard', () => {
    const src = SRC('../../components/ShopsView.tsx');
    expect(src).toContain('onReapplyShopMenu?:');
    expect((src.match(/onReapplyMenu=\{onReapplyShopMenu\}/g) || []).length).toBe(4);
  });

  it('App rebuilds the diff from the user transactions through the same queue', () => {
    const src = SRC('../../App.tsx');
    expect(src).toContain('handleReapplyShopMenu');
    expect(src).toContain('onReapplyShopMenu={handleReapplyShopMenu}');
    expect(src).toContain('getAllItemSuggestions(transactions, categories)');
    expect(src).toContain('attributeItemsToShops(');
    expect(src).toContain('computeMenuDiff(');
    expect(src).toContain('shouldOfferMenuUpdate({');
  });
});

describe('Version bump to v7.6.42 (build 356)', () => {
  it('version surfaces agree on v7.6.42 / build 356', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.43');
    expect(CURRENT_BUILD_NUMBER).toBe(357);
    expect(VERSION_JSON.version).toBe('v7.6.43');
    expect(VERSION_JSON.buildNumber).toBe(357);
    const entry = VERSION_HISTORY[0];
    expect(entry.version).toBe('v7.6.43');
    expect(entry.buildNumber).toBe(357);
    expect(entry.changesMy).toEqual(VERSION_JSON.changesMy);
    expect(entry.changesEn).toEqual(VERSION_JSON.changesEn);
  });

  it('the changelog covers the two-level taxonomy with zero Admin strings', () => {
    const entry = VERSION_HISTORY[0];
    expect(entry.changesMy.join(' ')).toContain('နှစ်ဆင့်');
    expect(entry.changesMy.join(' ')).toContain('အမျိုးအစားခွဲ');
    expect(entry.changesMy.join(' ')).toContain('ကျန်းမာရေး');
    expect(entry.changesMy.join(' ')).toContain('စိတ်ကြိုက်');
    expect(entry.changesMy.join(' ')).toContain('ရှေးဆိုင်');
    for (const e of VERSION_HISTORY) {
      expect(e.changesMy.join(' ')).not.toMatch(/Admin/i);
      expect(e.changesEn.join(' ')).not.toMatch(/Admin/i);
    }
  });

  it('releasedAt is present and untouched by the bump', () => {
    expect(typeof VERSION_JSON.releasedAt).toBe('string');
    expect(VERSION_JSON.releasedAt.length).toBeGreaterThan(0);
  });
});
