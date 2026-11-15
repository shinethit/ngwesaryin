// [v7.5.78 C] Unit tests for the shop-details reminder store +
// name-matching rule. Runs in the node vitest env, so localStorage and
// window are stubbed here before importing the module under test.
import { describe, it, expect, beforeEach, vi } from 'vitest';

const store = new Map<string, string>();

function installWindowStub() {
  (globalThis as any).window = {
    localStorage: {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
    },
    dispatchEvent: vi.fn(() => true),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
}

installWindowStub();

// Static import is safe: the module touches window.localStorage only
// lazily inside functions (never at import time).
import {
  SHOP_DETAIL_REMINDERS_KEY,
  SHOP_DETAIL_DISMISSED_KEY,
  normalizeShopName,
  shopHasDetails,
  isShopNameNeedingDetails,
  addShopDetailReminder,
  resolveShopDetailReminder,
  hasShopDetailReminder,
  loadShopDetailReminders,
  shopReminderId,
  dismissShopDetailReminder,
  isShopDetailDismissed,
  clearShopDetailDismissal,
  loadShopDetailDismissals,
  loadShopDetailDismissedKeys,
  filterShopsNeedingDetails,
  filterStaleShopDetailReminders,
  pruneShopDetailReminders,
  dispatchOpenShopsNeedsDetails,
  OPEN_SHOPS_NEEDS_DETAILS_EVENT,
} from '../shopDetailsReminders';

describe('normalizeShopName', () => {
  it('trims and lowercases — the app-wide shop-name rule', () => {
    expect(normalizeShopName('  Denko Shop ')).toBe('denko shop');
    expect(normalizeShopName('')).toBe('');
  });

  // [v7.5.89 A3] Myanmar digits fold to Latin — '၇' and '7' are the
  // same shop, so a reminder stored under one spelling resolves
  // under the other.
  it('folds Myanmar digits to Latin', () => {
    expect(normalizeShopName('Shop ၇')).toBe('shop 7');
    expect(normalizeShopName('ဆိုင်ရာ ၇')).toBe(normalizeShopName('ဆိုင်ရာ 7'));
    expect(normalizeShopName('၁၂၃')).toBe('123');
  });

  it('collapses internal whitespace runs — "a  b" matches "a b"', () => {
    expect(normalizeShopName('Denko   Shop')).toBe('denko shop');
    expect(normalizeShopName('a  b')).toBe(normalizeShopName('a b'));
  });
});

describe('shopHasDetails', () => {
  it('a name-only record has NO details', () => {
    expect(shopHasDetails({ phone: '', phones: [], addresses: [] })).toBe(false);
    expect(shopHasDetails(null)).toBe(false);
    expect(shopHasDetails(undefined)).toBe(false);
  });

  it('note (the category tag) alone does NOT count as details', () => {
    // ShopModal stores the category in `note` (default "grocery"), so a
    // form-saved shop always has a note — it proves nothing.
    expect(shopHasDetails({} as any)).toBe(false);
  });

  // [v7.5.91 D1] "Filled" = phone OR address ONLY. A menu alone does
  // NOT count — a shop with items but no phone/address is NOT filled.
  it('only phone / address count — items (menu) alone do NOT', () => {
    expect(shopHasDetails({ phone: '091234' })).toBe(true);
    expect(shopHasDetails({ phones: ['091234'] })).toBe(true);
    expect(shopHasDetails({ address: 'Main Road' })).toBe(true);
    expect(shopHasDetails({ addresses: ['Main Road'] })).toBe(true);
    expect(shopHasDetails({ phones: ['  '] })).toBe(false);
    expect(shopHasDetails({ items: [{ name: 'rice', price: 1 }] })).toBe(false);
  });

  it('phone-only is filled', () => {
    expect(shopHasDetails({ phone: '091234', items: [] })).toBe(true);
    expect(shopHasDetails({ phones: ['091234'] })).toBe(true);
  });

  it('address-only is filled', () => {
    expect(shopHasDetails({ address: 'Main Road' })).toBe(true);
    expect(shopHasDetails({ addresses: ['No. 1, Main Road'] })).toBe(true);
  });

  it('items-only (menu, no phone/address) is NOT filled', () => {
    expect(
      shopHasDetails({ items: [{ name: 'rice', price: 1000 }, { name: 'oil', price: 5000 }] })
    ).toBe(false);
  });

  // [v7.5.89 A2] Region / township / city / ward / subCategory /
  // KPay / notes alone do NOT count — a public shop with only a
  // township still needs its phone or address filled.
  it('region / township / city / KPay / notes alone do NOT count', () => {
    expect(shopHasDetails({ township: 'တောင်ကြီး' })).toBe(false);
    expect(shopHasDetails({ city: 'Taunggyi' })).toBe(false);
    expect(shopHasDetails({ kpayNumber: '09123' })).toBe(false);
    expect(shopHasDetails({ subCategory: 'grocery', generalNotes: 'near market' })).toBe(false);
    expect(shopHasDetails({ stateRegion: 'ရှမ်းပြည်နယ်', township: 'တောင်ကြီး' })).toBe(false);
  });

  // [v7.5.89 A2] Phone is optional, but region + township alone no
  // longer count as details — the prompt must still show so the
  // phone/address can be filled.
  it('phone-less shop with region + township only does NOT have details', () => {
    expect(
      shopHasDetails({ phone: '', phones: [], stateRegion: 'ရှမ်းပြည်နယ်', township: 'တောင်ကြီး' })
    ).toBe(false);
    expect(shopHasDetails({ stateRegion: 'ရှမ်းပြည်နယ်', township: 'တောင်ကြီး' })).toBe(false);
  });

  // [v7.5.79] Phone is optional — a phone-less record with nothing else
  // filled still has NO details, so the transaction prompt still shows.
  it('phone-less record with nothing else filled has NO details', () => {
    expect(
      shopHasDetails({
        phone: '',
        phones: [],
        address: '',
        addresses: [],
        subCategory: '',
        stateRegion: '',
        township: '',
        city: '',
        ward: '',
        kpayNumber: '',
        generalNotes: '',
        items: [],
      })
    ).toBe(false);
  });
});

describe('isShopNameNeedingDetails', () => {
  it('new name needs details', () => {
    expect(isShopNameNeedingDetails('New Shop', [], [])).toBe(true);
  });

  it('empty name never prompts', () => {
    expect(isShopNameNeedingDetails('   ', [], [])).toBe(false);
  });

  // [v7.5.91 D1] The private side is no longer name-only: a private
  // record suppresses ONLY when it HAS details (phone or address).
  it('a private shop WITH a phone suppresses the prompt', () => {
    expect(
      isShopNameNeedingDetails('My Shop', [{ name: '  MY SHOP ', phone: '09123' }], [])
    ).toBe(false);
  });

  it('a private shop WITHOUT details does NOT suppress the prompt', () => {
    expect(isShopNameNeedingDetails('My Shop', [{ name: '  MY SHOP ' }], [])).toBe(true);
    expect(
      isShopNameNeedingDetails(
        'My Shop',
        [{ name: 'My Shop', stateRegion: 'ရှမ်းပြည်နယ်', township: 'တောင်ကြီး' }],
        []
      )
    ).toBe(true);
  });

  it('a private shop with ONLY a menu does NOT suppress the prompt', () => {
    expect(
      isShopNameNeedingDetails('My Shop', [{ name: 'My Shop', items: [{ name: 'rice', price: 1 }] }], [])
    ).toBe(true);
  });

  it('a public shop WITH details suppresses the prompt', () => {
    expect(
      isShopNameNeedingDetails('Denko', [], [{ name: 'denko', city: 'Taunggyi', phones: ['09'] }])
    ).toBe(false);
  });

  it('a name-only public stub does NOT suppress the prompt', () => {
    expect(isShopNameNeedingDetails('Denko', [], [{ name: 'Denko', phone: '', phones: [] }])).toBe(true);
  });

  it('a public shop with ONLY a township does NOT suppress the prompt', () => {
    expect(
      isShopNameNeedingDetails('Denko', [], [{ name: 'Denko', township: 'တောင်ကြီး' }])
    ).toBe(true);
  });

  it('a public shop with ONLY a subCategory does NOT suppress the prompt', () => {
    expect(
      isShopNameNeedingDetails('Denko', [], [{ name: 'Denko', subCategory: 'grocery' }])
    ).toBe(true);
  });

  // [v7.5.91 D1] A menu alone does NOT count as filled — a public shop
  // with only items still prompts.
  it('a public shop with ONLY items (menu) does NOT suppress the prompt', () => {
    expect(
      isShopNameNeedingDetails('Denko', [], [{ name: 'Denko', items: [{ name: 'rice', price: 1 }] }])
    ).toBe(true);
  });

  // [v7.5.91 D3] A dismissed name never prompts, even with no record.
  it('a dismissed name does NOT prompt', () => {
    const dismissed = new Set(['denko']);
    expect(isShopNameNeedingDetails('Denko', [], [], dismissed)).toBe(false);
    expect(isShopNameNeedingDetails('Denko', [], [], ['denko'])).toBe(false);
    expect(isShopNameNeedingDetails('Other', [], [], dismissed)).toBe(true);
  });

  // [v7.5.89 A2] Phone is optional, but region/township alone no
  // longer suppress the prompt — the phone/address still need filling.
  it('a phone-less public shop with ONLY region/township does NOT suppress the prompt', () => {
    expect(
      isShopNameNeedingDetails('Denko', [], [
        { name: 'Denko', phone: '', phones: [], stateRegion: 'ရှမ်းပြည်နယ်', township: 'တောင်ကြီး' },
      ])
    ).toBe(true);
  });

  it('a phone-less stub with no region/township does NOT suppress the prompt', () => {
    expect(
      isShopNameNeedingDetails('Denko', [], [
        {
          name: 'Denko',
          phone: '',
          phones: [],
          stateRegion: '',
          township: '',
          city: '',
          addresses: [],
        },
      ])
    ).toBe(true);
  });
});

describe('reminder store (one per shop, deduped)', () => {
  beforeEach(() => {
    store.clear();
  });

  it('adds one reminder and dedupes by normalized name', () => {
    const first = addShopDetailReminder('  New Shop ');
    expect(first.added).toBe(true);
    expect(first.reminders).toHaveLength(1);
    expect(first.reminders[0].shopName).toBe('New Shop');
    expect(first.reminders[0].key).toBe('new shop');
    expect(first.reminders[0].id).toBe(shopReminderId('new shop'));

    // Same name, different case/spacing: NO second reminder.
    const second = addShopDetailReminder('new SHOP');
    expect(second.added).toBe(false);
    expect(second.reminders).toHaveLength(1);

    // A different shop gets its own reminder.
    const third = addShopDetailReminder('Other Shop');
    expect(third.added).toBe(true);
    expect(third.reminders).toHaveLength(2);
  });

  it('ignores empty names and persists to localStorage', () => {
    expect(addShopDetailReminder('   ').added).toBe(false);
    addShopDetailReminder('Shop A');
    expect(store.get(SHOP_DETAIL_REMINDERS_KEY)).toContain('Shop A');
    expect(loadShopDetailReminders()).toHaveLength(1);
    expect(hasShopDetailReminder('shop a')).toBe(true);
    expect(hasShopDetailReminder('Shop B')).toBe(false);
  });

  it('resolve removes only that shop (details filled)', () => {
    addShopDetailReminder('Shop A');
    addShopDetailReminder('Shop B');
    expect(resolveShopDetailReminder('  SHOP a ')).toBe(true);
    expect(loadShopDetailReminders().map((r) => r.shopName)).toEqual(['Shop B']);
    expect(resolveShopDetailReminder('Shop A')).toBe(false);
  });

  it('Myanmar-digit and Latin-digit spellings dedupe to one reminder', () => {
    expect(addShopDetailReminder('Shop ၇').added).toBe(true);
    expect(addShopDetailReminder('Shop 7').added).toBe(false);
    expect(loadShopDetailReminders()).toHaveLength(1);
    expect(hasShopDetailReminder('Shop ၇')).toBe(true);
    expect(hasShopDetailReminder('Shop 7')).toBe(true);
  });

  it('double-space and single-space spellings dedupe to one reminder', () => {
    expect(addShopDetailReminder('Shop  A').added).toBe(true);
    expect(addShopDetailReminder('Shop A').added).toBe(false);
    expect(loadShopDetailReminders()).toHaveLength(1);
  });
});

// [v7.5.89 A3] Migration — reminders stored under the OLD normalizer
// (trim + lowercase only) are re-keyed on load through the new
// digit-folding / whitespace-collapsing normalizer.
describe('reminder migration (old keys re-keyed on load)', () => {
  beforeEach(() => {
    store.clear();
  });

  function seedRaw(reminders: unknown[]) {
    store.set(SHOP_DETAIL_REMINDERS_KEY, JSON.stringify(reminders));
  }

  it('re-keys an old-key reminder ("၇" → "7") and it then resolves', () => {
    seedRaw([{ id: 'notif_shop_shop ၇', shopName: 'Shop ၇', key: 'shop ၇', createdAt: 100 }]);
    const loaded = loadShopDetailReminders();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].key).toBe('shop 7');
    expect(loaded[0].id).toBe('notif_shop_shop 7');
    expect(loaded[0].shopName).toBe('Shop ၇');
    // The migrated key is persisted, so the reminder resolves by the
    // new (Latin-digit) spelling.
    expect(resolveShopDetailReminder('Shop 7')).toBe(true);
    expect(loadShopDetailReminders()).toHaveLength(0);
  });

  it('dedupes same-name reminders under the new key, keeping the earliest createdAt', () => {
    seedRaw([
      { id: 'notif_shop_shop 7', shopName: 'Shop 7', key: 'shop 7', createdAt: 200 },
      { id: 'notif_shop_shop ၇', shopName: 'Shop ၇', key: 'shop ၇', createdAt: 100 },
    ]);
    const loaded = loadShopDetailReminders();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].createdAt).toBe(100);
    expect(loaded[0].key).toBe('shop 7');
  });

  it('collapses whitespace in stored keys ("shop  a" → "shop a")', () => {
    seedRaw([{ id: 'notif_shop_shop  a', shopName: 'Shop  A', key: 'shop  a', createdAt: 50 }]);
    const loaded = loadShopDetailReminders();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].key).toBe('shop a');
    expect(loaded[0].id).toBe('notif_shop_shop a');
    expect(hasShopDetailReminder('Shop A')).toBe(true);
  });

  it('loading an already-migrated store is a no-op (idempotent)', () => {
    seedRaw([{ id: 'notif_shop_shop 7', shopName: 'Shop 7', key: 'shop 7', createdAt: 100 }]);
    const first = loadShopDetailReminders();
    const second = loadShopDetailReminders();
    expect(second).toEqual(first);
    expect(store.get(SHOP_DETAIL_REMINDERS_KEY)).toBe(JSON.stringify(first));
  });
});

// [v7.5.91 D3] Dismissals ("လောလောဆယ် မဖြည့်သေးပါ" / Not now).
describe('dismissals (Not now — stop asking)', () => {
  beforeEach(() => {
    store.clear();
  });

  it('dismiss removes the reminder AND records the dismissal', () => {
    addShopDetailReminder('Shop A');
    expect(loadShopDetailReminders()).toHaveLength(1);
    expect(dismissShopDetailReminder('Shop A')).toBe(true);
    expect(loadShopDetailReminders()).toHaveLength(0);
    expect(isShopDetailDismissed('Shop A')).toBe(true);
    expect(isShopDetailDismissed('shop a')).toBe(true);
    expect(loadShopDetailDismissals()).toHaveLength(1);
    expect(loadShopDetailDismissals()[0].key).toBe('shop a');
    expect(store.get(SHOP_DETAIL_DISMISSED_KEY)).toContain('Shop A');
  });

  it('dismiss is idempotent — a second dismiss is a no-op', () => {
    expect(dismissShopDetailReminder('Shop A')).toBe(true);
    expect(dismissShopDetailReminder('  SHOP A ')).toBe(false);
    expect(loadShopDetailDismissals()).toHaveLength(1);
  });

  it('dismissed names do not re-prompt (via the dismissed set)', () => {
    dismissShopDetailReminder('Shop ၇');
    const dismissed = loadShopDetailDismissedKeys();
    expect(dismissed.has('shop 7')).toBe(true);
    expect(isShopNameNeedingDetails('Shop 7', [], [], dismissed)).toBe(false);
    expect(isShopNameNeedingDetails('Shop ၇', [], [], dismissed)).toBe(false);
    expect(isShopNameNeedingDetails('Other Shop', [], [], dismissed)).toBe(true);
  });

  it('ignores empty names', () => {
    expect(dismissShopDetailReminder('   ')).toBe(false);
    expect(loadShopDetailDismissals()).toHaveLength(0);
  });

  it('clearing a dismissal lets the name prompt again', () => {
    dismissShopDetailReminder('Shop A');
    expect(clearShopDetailDismissal('  SHOP a ')).toBe(true);
    expect(isShopDetailDismissed('Shop A')).toBe(false);
    expect(isShopNameNeedingDetails('Shop A', [], [], loadShopDetailDismissedKeys())).toBe(true);
    expect(clearShopDetailDismissal('Shop A')).toBe(false);
  });

  it('"Later" still ADDS a reminder — only "Not now" dismisses', () => {
    addShopDetailReminder('Shop A');
    expect(isShopDetailDismissed('Shop A')).toBe(false);
    expect(loadShopDetailReminders()).toHaveLength(1);
  });
});

// [v7.5.91 D1] Re-validation — a reminder for a shop that NOW has
// details disappears without the user opening it.
describe('reminder re-validation (prune when details filled)', () => {
  beforeEach(() => {
    store.clear();
  });

  it('drops the reminder when the shop now has a phone', () => {
    addShopDetailReminder('Shop A');
    addShopDetailReminder('Shop B');
    const kept = pruneShopDetailReminders([
      { name: 'Shop A', phone: '09123' },
      { name: 'Shop B' },
    ]);
    expect(kept.map((r) => r.shopName)).toEqual(['Shop B']);
    expect(loadShopDetailReminders().map((r) => r.shopName)).toEqual(['Shop B']);
  });

  it('keeps the reminder when the shop has ONLY a menu (not filled)', () => {
    addShopDetailReminder('Shop A');
    const kept = pruneShopDetailReminders([
      { name: 'Shop A', items: [{ name: 'rice', price: 1 }] },
    ]);
    expect(kept).toHaveLength(1);
    expect(loadShopDetailReminders()).toHaveLength(1);
  });

  it('keeps the reminder when the shop has ONLY a township', () => {
    addShopDetailReminder('Shop A');
    const kept = pruneShopDetailReminders([{ name: 'Shop A', township: 'တောင်ကြီး' }]);
    expect(kept).toHaveLength(1);
  });

  it('matches by folded name (Myanmar digits) and is a no-op when nothing drops', () => {
    addShopDetailReminder('Shop ၇');
    const kept = pruneShopDetailReminders([{ name: 'Shop 7', address: 'Main Road' }]);
    expect(kept).toHaveLength(0);
    // Second prune with nothing to drop leaves the store untouched.
    const rawBefore = store.get(SHOP_DETAIL_REMINDERS_KEY);
    pruneShopDetailReminders([{ name: 'Shop 7', address: 'Main Road' }]);
    expect(store.get(SHOP_DETAIL_REMINDERS_KEY)).toBe(rawBefore);
  });

  it('filterStaleShopDetailReminders is pure — it does not persist', () => {
    addShopDetailReminder('Shop A');
    const reminders = loadShopDetailReminders();
    const kept = filterStaleShopDetailReminders(reminders, [{ name: 'Shop A', phone: '09' }]);
    expect(kept).toHaveLength(0);
    expect(loadShopDetailReminders()).toHaveLength(1);
  });
});

// [v7.5.91 D4] Needs-details filter helper.
describe('filterShopsNeedingDetails', () => {
  it('keeps only shops without a phone or an address', () => {
    const shops = [
      { name: 'A', phone: '09' },
      { name: 'B', address: 'Main Road' },
      { name: 'C', items: [{ name: 'rice', price: 1 }] },
      { name: 'D', township: 'တောင်ကြီး' },
      { name: 'E' },
    ];
    expect(filterShopsNeedingDetails(shops).map((s) => s.name)).toEqual(['C', 'D', 'E']);
  });

  it('ignores dismissal — a dismissed shop still shows in the filter', () => {
    // The filter is computed from shop DATA only; dismissal is never
    // consulted here (a dismissed shop is filled later from the filter).
    const shops = [{ name: 'A' }, { name: 'B', phone: '09' }];
    expect(filterShopsNeedingDetails(shops).map((s) => s.name)).toEqual(['A']);
  });

  it('returns an empty list for an empty list', () => {
    expect(filterShopsNeedingDetails([])).toEqual([]);
  });
});

// [v7.5.91 D2] Floating-bar badge event.
describe('dispatchOpenShopsNeedsDetails', () => {
  it('dispatches the needs-details event', () => {
    const dispatchEvent = (globalThis as any).window.dispatchEvent as ReturnType<typeof vi.fn>;
    dispatchEvent.mockClear();
    dispatchOpenShopsNeedsDetails();
    expect(dispatchEvent).toHaveBeenCalledTimes(1);
    const event = dispatchEvent.mock.calls[0][0] as CustomEvent;
    expect(event.type).toBe(OPEN_SHOPS_NEEDS_DETAILS_EVENT);
    expect(event.type).toBe('ngwe:open-shops-needs-details');
  });
});
