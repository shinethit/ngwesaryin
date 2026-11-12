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
  normalizeShopName,
  shopHasDetails,
  isShopNameNeedingDetails,
  addShopDetailReminder,
  resolveShopDetailReminder,
  hasShopDetailReminder,
  loadShopDetailReminders,
  shopReminderId,
} from '../shopDetailsReminders';

describe('normalizeShopName', () => {
  it('trims and lowercases — the app-wide shop-name rule', () => {
    expect(normalizeShopName('  Denko Shop ')).toBe('denko shop');
    expect(normalizeShopName('')).toBe('');
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

  it('any contact/location field counts', () => {
    expect(shopHasDetails({ phone: '091234' })).toBe(true);
    expect(shopHasDetails({ phones: ['091234'] })).toBe(true);
    expect(shopHasDetails({ township: 'တောင်ကြီး' })).toBe(true);
    expect(shopHasDetails({ city: 'Taunggyi' })).toBe(true);
    expect(shopHasDetails({ kpayNumber: '09123' })).toBe(true);
    expect(shopHasDetails({ items: [{ name: 'rice', price: 1 }] })).toBe(true);
    expect(shopHasDetails({ phones: ['  '] })).toBe(false);
  });
});

describe('isShopNameNeedingDetails', () => {
  it('new name needs details', () => {
    expect(isShopNameNeedingDetails('New Shop', [], [])).toBe(true);
  });

  it('empty name never prompts', () => {
    expect(isShopNameNeedingDetails('   ', [], [])).toBe(false);
  });

  it('a private shop with that name suppresses the prompt (form requires region+township)', () => {
    expect(isShopNameNeedingDetails('My Shop', [{ name: '  MY SHOP ' }], [])).toBe(false);
  });

  it('a public shop WITH details suppresses the prompt', () => {
    expect(
      isShopNameNeedingDetails('Denko', [], [{ name: 'denko', city: 'Taunggyi', phones: ['09'] }])
    ).toBe(false);
  });

  it('a name-only public stub does NOT suppress the prompt', () => {
    expect(isShopNameNeedingDetails('Denko', [], [{ name: 'Denko', phone: '', phones: [] }])).toBe(true);
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
});
