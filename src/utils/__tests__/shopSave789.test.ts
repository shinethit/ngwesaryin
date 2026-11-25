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
  moveShopWithDestinationCheck,
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
    shopCategory: 'food',
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

describe('moveShopWithDestinationCheck (v7.5.90 F1 move hard block)', () => {
  // Fake in-memory destination / source lists behind the same
  // injected-callback pattern the moveWithCreateFirst tests use: the
  // create callback appends the copy to the destination list, the
  // delete callback removes the original from the source list.
  function fakeMove(
    destination: (ShopContact | PublicShop)[],
    source: (ShopContact | PublicShop)[],
    name: string,
    createSucceeds = true,
    deleteSucceeds = true
  ) {
    const calls: string[] = [];
    const dest = [...destination];
    const src = [...source];
    const run = () =>
      moveShopWithDestinationCheck(
        name,
        dest,
        async () => {
          calls.push('create');
          dest.push(publicShop({ id: 'pub-new', name, addedByUid: 'u1' }));
          return createSucceeds;
        },
        async () => {
          calls.push('delete');
          src.pop();
          return deleteSucceeds;
        }
      );
    return { dest, src, calls, run };
  }

  it('blocks a private → public move when the public directory already has the name', async () => {
    const dest = [publicShop({ id: 'pub-9', name: 'Denko', addedByUid: 'u2' })];
    const src = [privateShop({ id: 'priv-1', name: 'Denko' })];
    const m = fakeMove(dest, src, 'Denko');
    const result = await m.run();
    expect(result).toEqual({ moved: false, deleteOk: null, blocked: true });
    expect(m.calls).toEqual([]);
    expect(m.dest).toHaveLength(1);
    expect(m.src).toHaveLength(1);
  });

  it('blocks a public → private move when the private list already has the name', async () => {
    const dest = [privateShop({ id: 'priv-9', name: 'Denko' })];
    const src = [publicShop({ id: 'pub-1', name: 'Denko', addedByUid: 'u1' })];
    const m = fakeMove(dest, src, 'Denko');
    const result = await m.run();
    expect(result).toEqual({ moved: false, deleteOk: null, blocked: true });
    expect(m.calls).toEqual([]);
    expect(m.dest).toHaveLength(1);
    expect(m.src).toHaveLength(1);
  });

  it('blocks on a folded-name collision (Myanmar digit variant)', async () => {
    const dest = [publicShop({ id: 'pub-9', name: 'တောင်ကြီးဆေးဆိုင် ၇', addedByUid: 'u2' })];
    const src = [privateShop({ id: 'priv-1', name: 'တောင်ကြီးဆေးဆိုင် 7' })];
    const m = fakeMove(dest, src, 'တောင်ကြီးဆေးဆိုင် 7');
    const result = await m.run();
    expect(result).toEqual({ moved: false, deleteOk: null, blocked: true });
    expect(m.calls).toEqual([]);
    expect(m.dest).toHaveLength(1);
    expect(m.src).toHaveLength(1);
  });

  it('does NOT block when the same name lives only on the SOURCE side', async () => {
    // The record being moved is on the source side and is never in
    // the destination list passed in — the destination here holds
    // only an unrelated shop, so the move must proceed.
    const dest = [publicShop({ id: 'pub-9', name: 'Some Other Shop', addedByUid: 'u2' })];
    const src = [privateShop({ id: 'priv-1', name: 'Denko' })];
    const m = fakeMove(dest, src, 'Denko');
    const result = await m.run();
    expect(result).toEqual({ moved: true, deleteOk: true, blocked: false });
    expect(m.calls).toEqual(['create', 'delete']);
    expect(m.dest).toHaveLength(2);
    expect(m.src).toHaveLength(0);
  });

  it('succeeds exactly as before with NO collision (private → public regression)', async () => {
    const dest = [publicShop({ id: 'pub-9', name: 'Other Shop', addedByUid: 'u2' })];
    const src = [privateShop({ id: 'priv-1', name: 'Denko' })];
    const m = fakeMove(dest, src, 'Denko');
    const result = await m.run();
    expect(result).toEqual({ moved: true, deleteOk: true, blocked: false });
    expect(m.calls).toEqual(['create', 'delete']);
    expect(m.dest).toHaveLength(2);
    expect(m.dest[1].name).toBe('Denko');
    expect(m.src).toHaveLength(0);
  });

  it('succeeds exactly as before with NO collision (public → private regression)', async () => {
    const dest = [privateShop({ id: 'priv-9', name: 'Other Shop' })];
    const src = [publicShop({ id: 'pub-1', name: 'Denko', addedByUid: 'u1' })];
    const m = fakeMove(dest, src, 'Denko');
    const result = await m.run();
    expect(result).toEqual({ moved: true, deleteOk: true, blocked: false });
    expect(m.calls).toEqual(['create', 'delete']);
    expect(m.dest).toHaveLength(2);
    expect(m.src).toHaveLength(0);
  });

  it('still counts as moved when the delete fails after a clear destination', async () => {
    const dest = [publicShop({ id: 'pub-9', name: 'Other Shop', addedByUid: 'u2' })];
    const src = [privateShop({ id: 'priv-1', name: 'Denko' })];
    const m = fakeMove(dest, src, 'Denko', true, false);
    const result = await m.run();
    expect(result).toEqual({ moved: true, deleteOk: false, blocked: false });
    expect(m.dest).toHaveLength(2);
  });

  it('never deletes when the create fails after a clear destination', async () => {
    const dest = [publicShop({ id: 'pub-9', name: 'Other Shop', addedByUid: 'u2' })];
    const src = [privateShop({ id: 'priv-1', name: 'Denko' })];
    const m = fakeMove(dest, src, 'Denko', false, true);
    const result = await m.run();
    expect(result).toEqual({ moved: false, deleteOk: null, blocked: false });
    expect(m.calls).toEqual(['create']);
    expect(m.src).toHaveLength(1);
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
      'shopCategory',
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
