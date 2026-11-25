// [v7.6.41] Split-aware item suggestions: a split record's items must
// be learned under their ROW categories, not the record's top
// category — otherwise the per-row-shop menu attribution sends every
// item to one shop. Found by the v7.6.41 render: a Petrol item inside
// a food-topped split record was learned as cat_food, so both items
// of a later 2-shop split landed on Shop A's menu prompt and Shop B
// got no candidate at all. Pure-helper tests (the repo pattern).
import { describe, it, expect } from 'vitest';
import { getAllItemSuggestions, findMatchingItemInfo } from '../itemIntelligence';
import { attributeItemsToShops } from '../transactionSplits';
import type { Transaction, TransactionItem } from '../../types';

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx_1',
    type: 'expense',
    amount: 50000,
    category: 'cat_food',
    walletId: 'cash',
    date: '2026-11-25',
    createdAt: 1,
    ...overrides,
  };
}

function item(name: string, price: number, quantity = 1, unit = ''): TransactionItem {
  return { name, price, quantity, unit, amount: price * quantity };
}

describe('split-aware item suggestions (v7.6.41)', () => {
  it('an item inside a mixed split keeps the category its own earlier history teaches', () => {
    const txns = [
      // Older: Petrol bought on its own under vehicle.
      makeTx({
        id: 't0',
        amount: 15000,
        category: 'cat_vehicle',
        date: '2026-11-25',
        createdAt: 1,
        shopName: 'Shop B',
        items: [item('Petrol', 15000, 1, 'လီတာ')],
      }),
      // Same date, later: a 2-shop split topped with food, carrying Petrol in its vehicle row.
      makeTx({
        id: 't1',
        amount: 50000,
        category: 'cat_food',
        date: '2026-11-25',
        createdAt: 2,
        shopName: 'Shop A',
        items: [item('Rice', 30000, 1, 'ပြည်'), item('Petrol', 20000, 1, 'လီတာ')],
        splits: [
          { categoryId: 'cat_food', amount: 30000, shopName: 'Shop A' },
          { categoryId: 'cat_vehicle', amount: 20000, shopName: 'Shop B' },
        ],
      }),
    ];
    const suggestions = getAllItemSuggestions(txns, []);
    const petrol = findMatchingItemInfo('Petrol', suggestions);
    expect(petrol?.categoryId).toBe('cat_vehicle');
    const rice = findMatchingItemInfo('Rice', suggestions);
    expect(rice?.categoryId).toBe('cat_food');
  });

  it('unsplit records still learn items under the record category', () => {
    const txns = [
      makeTx({
        id: 't0',
        amount: 8000,
        category: 'cat_food',
        items: [item('Rice', 8000, 1, 'ပြည်')],
      }),
    ];
    const suggestions = getAllItemSuggestions(txns, []);
    expect(findMatchingItemInfo('Rice', suggestions)?.categoryId).toBe('cat_food');
  });

  it('an item with no earlier history inside a split falls back to the top category', () => {
    const txns = [
      makeTx({
        id: 't1',
        amount: 50000,
        category: 'cat_food',
        items: [item('Mango', 30000)],
        splits: [
          { categoryId: 'cat_food', amount: 30000, shopName: 'Shop A' },
          { categoryId: 'cat_vehicle', amount: 20000, shopName: 'Shop B' },
        ],
      }),
    ];
    const suggestions = getAllItemSuggestions(txns, []);
    expect(findMatchingItemInfo('Mango', suggestions)?.categoryId).toBe('cat_food');
  });

  it('the confirmed example attributes Rice to Shop A and Petrol to Shop B', () => {
    const history = [
      makeTx({
        id: 't0',
        amount: 15000,
        category: 'cat_vehicle',
        date: '2026-11-25',
        createdAt: 1,
        items: [item('Petrol', 15000, 1, 'လီတာ')],
      }),
      makeTx({
        id: 't1',
        amount: 50000,
        category: 'cat_food',
        date: '2026-11-25',
        createdAt: 2,
        items: [item('Rice', 30000, 1, 'ပြည်'), item('Petrol', 20000, 1, 'လီတာ')],
        splits: [
          { categoryId: 'cat_food', amount: 30000, shopName: 'Shop A' },
          { categoryId: 'cat_vehicle', amount: 20000, shopName: 'Shop B' },
        ],
      }),
    ];
    const suggestions = getAllItemSuggestions(history, []);
    const byShop = attributeItemsToShops(
      [item('Rice', 6000, 1, 'ပြည်'), item('Petrol', 18000, 1, 'လီတာ')],
      [
        { categoryId: 'cat_food', amount: 6000, shopName: 'Shop A' },
        { categoryId: 'cat_vehicle', amount: 18000, shopName: 'Shop B' },
      ],
      '',
      suggestions,
    );
    expect([...byShop.keys()].sort()).toEqual(['Shop A', 'Shop B']);
    expect(byShop.get('Shop A')?.map((i) => i.name)).toEqual(['Rice']);
    expect(byShop.get('Shop B')?.map((i) => i.name)).toEqual(['Petrol']);
  });
});
