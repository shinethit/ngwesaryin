// [v7.5.90 F2] Unit tests for the stashed-menu-candidate rename fix:
// the pure stash-rewrite decision (updateStashedCandidateForSavedShop
// in shopMenuUpdate.ts) and the `ngwe:shop-details-saved` dispatcher
// (shopDetailsReminders.ts). Runs in the node vitest env, so window
// is stubbed here before importing the modules under test — the same
// pattern as shopDetailsReminders.test.ts. App's listener itself is a
// thin wrapper around the helper (rewrite + seq bump) and is covered
// by the coordinator's render probe: transaction with shop X + items
// → candidate stashed → details prompt → fill the form as renamed
// shop Y → the menu prompt appears for Y and Y's menu gets the item.
import { describe, it, expect, beforeEach, vi } from 'vitest';

const dispatched: unknown[] = [];

function installWindowStub() {
  (globalThis as any).window = {
    dispatchEvent: vi.fn((e: unknown) => {
      dispatched.push(e);
      return true;
    }),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
}

installWindowStub();

// Static imports are safe: both modules touch window only lazily
// inside functions (never at import time).
import {
  SHOP_DETAILS_SAVED_EVENT,
  dispatchShopDetailsSaved,
} from '../shopDetailsReminders';
import {
  updateStashedCandidateForSavedShop,
  type StashedMenuCandidate,
} from '../shopMenuUpdate';

const ITEMS = [{ name: 'Rice', price: 1200, quantity: 1, amount: 1200, unit: 'တစ်ကီလို' }];

function stash(overrides: Partial<StashedMenuCandidate> = {}): StashedMenuCandidate {
  return { shopName: 'Shop X', items: ITEMS, ...overrides };
}

describe('updateStashedCandidateForSavedShop (v7.5.90 F2 — rename follows the stash)', () => {
  it('rename X → Y updates the name AND attaches the saved id, items preserved by reference', () => {
    const s = stash();
    const next = updateStashedCandidateForSavedShop(s, {
      oldName: 'Shop X',
      savedName: 'Shop Y',
      shopId: 'pub-9',
    });
    expect(next).not.toBe(s);
    expect(next).toEqual({ shopName: 'Shop Y', shopId: 'pub-9', items: ITEMS });
    expect(next!.items).toBe(ITEMS);
    // The original stash is untouched.
    expect(s).toEqual({ shopName: 'Shop X', items: ITEMS });
  });

  it('matches on the folded name: Myanmar digits, case and whitespace', () => {
    const folded = stash({ shopName: 'တောင်ကြီးဆေးဆိုင် ၇' });
    const next = updateStashedCandidateForSavedShop(folded, {
      oldName: 'တောင်ကြီးဆေးဆိုင် 7',
      savedName: 'တောင်ကြီးဆေးဆိုင် အသစ်',
      shopId: 'pub-10',
    });
    expect(next?.shopName).toBe('တောင်ကြီးဆေးဆိုင် အသစ်');
    expect(next?.shopId).toBe('pub-10');

    const cased = stash({ shopName: '  Denko Shop ' });
    expect(
      updateStashedCandidateForSavedShop(cased, {
        oldName: 'denko   shop',
        savedName: 'Denko New',
      })?.shopName
    ).toBe('Denko New');
  });

  it('no-rename still attaches the shop id and keeps the name (the v7.5.89 A5 id gap)', () => {
    const s = stash();
    const next = updateStashedCandidateForSavedShop(s, {
      oldName: 'Shop X',
      savedName: 'Shop X',
      shopId: 'pub-9',
    });
    expect(next).not.toBe(s);
    expect(next).toEqual({ shopName: 'Shop X', shopId: 'pub-9', items: ITEMS });
  });

  it('no-rename with no id anywhere changes nothing — same reference', () => {
    const s = stash();
    expect(
      updateStashedCandidateForSavedShop(s, { oldName: 'Shop X', savedName: 'Shop X' })
    ).toBe(s);
  });

  it('rename with no new id keeps an id the stash already carried', () => {
    const s = stash({ shopId: 'pub-9' });
    const next = updateStashedCandidateForSavedShop(s, {
      oldName: 'Shop X',
      savedName: 'Shop Y',
    });
    expect(next).toEqual({ shopName: 'Shop Y', shopId: 'pub-9', items: ITEMS });
  });

  it('saved name is trimmed in the rewritten stash', () => {
    const s = stash();
    const next = updateStashedCandidateForSavedShop(s, {
      oldName: 'Shop X',
      savedName: '  Shop Y  ',
      shopId: 'pub-9',
    });
    expect(next?.shopName).toBe('Shop Y');
  });

  it('a save for a DIFFERENT shop leaves the stash untouched — same reference', () => {
    const s = stash({ shopId: 'pub-9' });
    const next = updateStashedCandidateForSavedShop(s, {
      oldName: 'Some Other Shop',
      savedName: 'Some Other Shop Renamed',
      shopId: 'pub-99',
    });
    expect(next).toBe(s);
    expect(next).toEqual({ shopName: 'Shop X', shopId: 'pub-9', items: ITEMS });
  });

  it('no stash → null (listener is a no-op)', () => {
    expect(
      updateStashedCandidateForSavedShop(null, {
        oldName: 'Shop X',
        savedName: 'Shop Y',
        shopId: 'pub-9',
      })
    ).toBeNull();
  });

  it('empty saved name → stash untouched', () => {
    const s = stash();
    expect(
      updateStashedCandidateForSavedShop(s, { oldName: 'Shop X', savedName: '   ' })
    ).toBe(s);
  });

  it('prompt-name fallback: no oldName, but the details-prompt name matches → renames', () => {
    const s = stash();
    const next = updateStashedCandidateForSavedShop(s, {
      savedName: 'Shop Y',
      shopId: 'pub-9',
      promptName: 'Shop X',
    });
    expect(next?.shopName).toBe('Shop Y');
    expect(next?.shopId).toBe('pub-9');
  });

  it('no oldName and no promptName → stash untouched', () => {
    const s = stash();
    expect(
      updateStashedCandidateForSavedShop(s, { savedName: 'Shop Y', shopId: 'pub-9' })
    ).toBe(s);
  });
});

describe('dispatchShopDetailsSaved (v7.5.90 F2 — event wiring)', () => {
  beforeEach(() => {
    dispatched.length = 0;
  });

  it('dispatches ngwe:shop-details-saved with the save detail', () => {
    dispatchShopDetailsSaved({
      oldName: 'Shop X',
      savedName: 'Shop Y',
      shopId: 'pub-9',
      isPublic: true,
    });
    expect(dispatched).toHaveLength(1);
    const event = dispatched[0] as CustomEvent;
    expect(event.type).toBe('ngwe:shop-details-saved');
    expect(event.type).toBe(SHOP_DETAILS_SAVED_EVENT);
    expect(event.detail).toEqual({
      oldName: 'Shop X',
      savedName: 'Shop Y',
      shopId: 'pub-9',
      isPublic: true,
    });
  });

  it('a private create (no id visible to ShopsView) still dispatches without shopId', () => {
    dispatchShopDetailsSaved({ oldName: 'Shop X', savedName: 'Shop Y', isPublic: false });
    expect(dispatched).toHaveLength(1);
    expect((dispatched[0] as CustomEvent).detail).toEqual({
      oldName: 'Shop X',
      savedName: 'Shop Y',
      isPublic: false,
    });
  });
});
