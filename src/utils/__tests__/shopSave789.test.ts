// [v7.5.89 B3] Unit tests for the save-path helpers in shopSave.ts —
// the duplicate-create hard block, the Both-save counterpart lookup
// and field shapes, and the create-then-delete move order. The
// Firestore calls themselves live in ShopsView.handleSaveModal and
// are wired to these helpers; the component has no test harness, so
// the decision logic is tested here at the helper level.
import { describe, it, expect } from 'vitest';

import {
  isDuplicateShopName,
  findCounterpartShop,
  moveWithCreateFirst,
  buildPublicShopFields,
  buildPrivateShopFields,
  buildCounterpartUpdateFields,
  type ShopFormFields,
} from '../shopSave';
import type { ShopContact, PublicShop } from '../../types';

const MENU = [{ name: 'Rice', price: 5000, updatedAt: 1 }];

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

function formFields(overrides: Partial<ShopFormFields> = {}): ShopFormFields {
  return {
    name: 'Denko',
    note: 'grocery',
    phones: ['091234567'],
    addresses: ['Main Road'],
    stateRegion: 'Shan',
    township: 'Taunggyi',
    city: 'Taunggyi',
    ward: 'Ward 1',
    kpayNumber: '',
    generalNotes: '',
    subCategory: '',
    ...overrides,
  };
}

describe('isDuplicateShopName (create hard block)', () => {
  it('blocks when the name exists in the PUBLIC list only', () => {
    const pub = publicShop({ id: 'pub-9', name: 'Denko', addedByUid: 'u2' });
    expect(isDuplicateShopName('Denko', [[pub], []])).toBe(true);
  });

  it('blocks when the name exists in the PRIVATE list only', () => {
    const priv = privateShop({ id: 'priv-9', name: 'Denko' });
    expect(isDuplicateShopName('Denko', [[], [priv]])).toBe(true);
  });

  it('allows a genuinely new name', () => {
    const pub = publicShop({ id: 'pub-1', name: 'Other Shop' });
    const priv = privateShop({ id: 'priv-1', name: 'My Shop' });
    expect(isDuplicateShopName('Brand New', [[pub], [priv]])).toBe(false);
  });

  it('matches on the folded name (case / whitespace)', () => {
    const pub = publicShop({ id: 'pub-1', name: '  denko shop ' });
    expect(isDuplicateShopName('Denko Shop', [[pub], []])).toBe(true);
  });

  it('does not block an edit that keeps its own name', () => {
    const pub = publicShop({ id: 'pub-1', name: 'Denko' });
    expect(isDuplicateShopName('Denko', [[pub], []], 'pub-1')).toBe(false);
  });

  it('still blocks when a DIFFERENT record has the name, even with an excludeId', () => {
    const pub = publicShop({ id: 'pub-1', name: 'Denko' });
    const other = publicShop({ id: 'pub-2', name: 'Denko', addedByUid: 'u2' });
    expect(isDuplicateShopName('Denko', [[pub, other], []], 'pub-1')).toBe(true);
  });

  it('never blocks on an empty name', () => {
    expect(isDuplicateShopName('', [[publicShop()], []])).toBe(false);
  });
});

describe('findCounterpartShop (Both-save edit)', () => {
  it('finds the counterpart by the OLD name after a rename', () => {
    const counterpart = privateShop({ id: 'priv-7', name: 'Old Name' });
    const found = findCounterpartShop('Old Name', 'New Name', [counterpart]);
    expect(found?.id).toBe('priv-7');
  });

  it('finds the counterpart by the NEW name when the old name matches nothing', () => {
    const counterpart = publicShop({ id: 'pub-7', name: 'New Name', addedByUid: 'u2' });
    const found = findCounterpartShop('Old Name', 'New Name', [counterpart]);
    expect(found?.id).toBe('pub-7');
  });

  it('returns undefined when the shop exists on one side only', () => {
    const unrelated = privateShop({ id: 'priv-8', name: 'Some Other Shop' });
    expect(findCounterpartShop('Old Name', 'New Name', [unrelated])).toBeUndefined();
    expect(findCounterpartShop('Old Name', 'New Name', [])).toBeUndefined();
  });
});

describe('moveWithCreateFirst (public → private move order)', () => {
  it('runs the private save BEFORE the public delete', async () => {
    const order: string[] = [];
    const result = await moveWithCreateFirst(
      async () => {
        order.push('create');
        return true;
      },
      async () => {
        order.push('delete');
        return true;
      }
    );
    expect(order).toEqual(['create', 'delete']);
    expect(result).toEqual({ moved: true, deleteOk: true });
  });

  it('never deletes when the private save fails (original untouched)', async () => {
    const order: string[] = [];
    const result = await moveWithCreateFirst(
      async () => {
        order.push('create');
        return false;
      },
      async () => {
        order.push('delete');
        return true;
      }
    );
    expect(order).toEqual(['create']);
    expect(result).toEqual({ moved: false, deleteOk: null });
  });

  it('still counts as moved when the delete fails (no duplicate on retry)', async () => {
    const result = await moveWithCreateFirst(
      async () => true,
      async () => false
    );
    expect(result).toEqual({ moved: true, deleteOk: false });
  });
});

describe('Both-save field shapes', () => {
  it('create writes BOTH docs with the same content and items: []', () => {
    const data = formFields();
    const pub = buildPublicShopFields(data, 'me@example.com', 'u1', 'pub_shop_1', []);
    const priv = buildPrivateShopFields(data, []);
    // Every shared field is identical across the two copies.
    for (const key of [
      'name',
      'phone',
      'phones',
      'address',
      'addresses',
      'note',
      'subCategory',
      'stateRegion',
      'township',
      'city',
      'ward',
      'kpayNumber',
      'generalNotes',
    ] as const) {
      expect(pub[key]).toEqual(priv[key]);
    }
    expect(pub.items).toEqual([]);
    expect(priv.items).toEqual([]);
    // Different ids: the public doc carries its own id; the private
    // copy gets its id from onAddPrivateShop (never the public one).
    expect(pub.id).toBe('pub_shop_1');
    expect('id' in priv).toBe(false);
  });

  it('edit copies the edited record’s items to a new counterpart', () => {
    const data = formFields();
    const pubCopy = buildPublicShopFields(data, 'me@example.com', 'u1', 'pub_shop_2', MENU);
    const privCopy = buildPrivateShopFields(data, MENU);
    expect(pubCopy.items).toEqual(MENU);
    expect(privCopy.items).toEqual(MENU);
  });

  it('counterpart updates carry NO items key (the counterpart keeps its own menu)', () => {
    const fields = buildCounterpartUpdateFields(formFields({ name: 'Renamed' }));
    expect('items' in fields).toBe(false);
    expect(fields.name).toBe('Renamed');
    expect(fields.phone).toBe('091234567');
  });
});
