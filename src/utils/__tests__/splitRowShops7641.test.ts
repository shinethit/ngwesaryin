// [v7.6.41] Per-split-row shops: a split row may name its own shop;
// a row with no shop inherits the entry-level shopName; old data
// (no row shops at all) reads exactly as before. Pure-helper tests +
// wiring assertions (the repo pattern: components have no test
// renderer; layout behaviour is verified by renders). Source reads
// use `new URL` — NO path comparisons.
import { describe, it, expect } from 'vitest';
import {
  attributeItemsToShops,
  defaultSplitRows,
  getSplitAttribution,
  nextSplitRow,
  resolveSplitShopName,
  rowsToSplits,
  splitRowsFromTransaction,
  splitShopGroups,
  type SplitFormRow,
} from '../transactionSplits';
import type { Transaction, TransactionItem, TransactionSplit } from '../../types';
import type { UnifiedItemInfo } from '../itemIntelligence';

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx_1',
    type: 'expense',
    amount: 100000,
    category: 'cat_food',
    walletId: 'cash',
    date: '2026-11-25',
    createdAt: 1,
    ...overrides,
  };
}

function item(name: string, price = 1000, quantity = 1, unit = ''): TransactionItem {
  return { name, price, quantity, unit, amount: price * quantity };
}

function suggestion(name: string, categoryId: string): UnifiedItemInfo {
  return {
    name,
    normalizedName: name.toLowerCase(),
    latestPrice: 1000,
    latestDate: '2026-11-25',
    categoryId,
    source: 'shopping_item',
    frequency: 3,
  };
}

describe('resolveSplitShopName (v7.6.41)', () => {
  it('a row shop wins over the entry shop', () => {
    expect(resolveSplitShopName({ categoryId: 'c', amount: 1, shopName: 'Shop B' }, 'Shop A')).toBe('Shop B');
  });

  it('a blank row shop inherits the entry shop', () => {
    expect(resolveSplitShopName({ categoryId: 'c', amount: 1 }, 'Shop A')).toBe('Shop A');
    expect(resolveSplitShopName({ categoryId: 'c', amount: 1, shopName: '   ' }, 'Shop A')).toBe('Shop A');
  });

  it('no shop anywhere resolves to undefined', () => {
    expect(resolveSplitShopName({ categoryId: 'c', amount: 1 }, undefined)).toBeUndefined();
    expect(resolveSplitShopName({ categoryId: 'c', amount: 1 }, '  ')).toBeUndefined();
  });

  it('trims the row shop', () => {
    expect(resolveSplitShopName({ categoryId: 'c', amount: 1, shopName: '  Shop B ' }, 'Shop A')).toBe('Shop B');
  });
});

describe('getSplitAttribution carries the effective shop (v7.6.41)', () => {
  it('each row carries its own shop or the inherited entry shop', () => {
    const tx = makeTx({
      shopName: 'Shop A',
      splits: [
        { categoryId: 'cat_food', amount: 60000 },
        { categoryId: 'cat_fuel', amount: 40000, shopName: 'Shop B' },
      ],
    });
    const attrs = getSplitAttribution(tx);
    expect(attrs[0].shopName).toBe('Shop A');
    expect(attrs[1].shopName).toBe('Shop B');
  });

  it('old rows without shops read exactly as before, plus the entry shop', () => {
    const tx = makeTx({ shopName: 'Shop A', splits: [{ categoryId: 'cat_food', amount: 50000 }] });
    expect(getSplitAttribution(tx)).toEqual([
      { categoryId: 'cat_food', subCategoryId: undefined, amount: 50000, note: undefined, shopName: 'Shop A' },
    ]);
  });

  it('an unsplit record carries the entry shop', () => {
    expect(getSplitAttribution(makeTx({ shopName: 'Shop A' }))[0].shopName).toBe('Shop A');
    expect(getSplitAttribution(makeTx({}))[0].shopName).toBeUndefined();
  });
});

describe('splitShopGroups (v7.6.41)', () => {
  it('rows sharing one shop stay one group; the group amount is the sum', () => {
    const tx = makeTx({
      shopName: 'Shop A',
      splits: [
        { categoryId: 'cat_food', amount: 60000 },
        { categoryId: 'cat_household', amount: 40000 },
      ],
    });
    const groups = splitShopGroups(tx);
    expect(groups).toHaveLength(1);
    expect(groups[0].shopName).toBe('Shop A');
    expect(groups[0].amount).toBe(100000);
    expect(groups[0].attributions).toHaveLength(2);
  });

  it('different shops split into one group per shop, in first-seen order', () => {
    const tx = makeTx({
      shopName: 'Shop A',
      splits: [
        { categoryId: 'cat_food', amount: 60000 },
        { categoryId: 'cat_fuel', amount: 30000, shopName: 'Shop B' },
        { categoryId: 'cat_household', amount: 10000, shopName: 'Shop B' },
      ],
    });
    const groups = splitShopGroups(tx);
    expect(groups).toHaveLength(2);
    expect(groups[0].shopName).toBe('Shop A');
    expect(groups[0].amount).toBe(60000);
    expect(groups[1].shopName).toBe('Shop B');
    expect(groups[1].amount).toBe(40000);
  });

  it('group amounts sum to the record amount — never double-counted', () => {
    const tx = makeTx({
      amount: 100000,
      shopName: 'Shop A',
      splits: [
        { categoryId: 'cat_food', amount: 60000 },
        { categoryId: 'cat_fuel', amount: 40000, shopName: 'Shop B' },
      ],
    });
    const total = splitShopGroups(tx).reduce((sum, g) => sum + g.amount, 0);
    expect(total).toBe(tx.amount);
  });

  it('a record with no shop anywhere is one group with no shop', () => {
    const groups = splitShopGroups(makeTx({ splits: [{ categoryId: 'cat_food', amount: 50000 }] }));
    expect(groups).toHaveLength(1);
    expect(groups[0].shopName).toBeUndefined();
  });
});

describe('attributeItemsToShops (v7.6.41)', () => {
  const suggestions = [suggestion('ဆန်', 'cat_food'), suggestion('ဓာတ်ဆီ', 'cat_fuel')];

  it('a single-shop record sends every item to the entry shop, no inference', () => {
    const byShop = attributeItemsToShops(
      [item('ဆန်'), item('ဓာတ်ဆီ')],
      [{ categoryId: 'cat_food', amount: 50000 }],
      'Shop A',
      suggestions,
    );
    expect([...byShop.keys()]).toEqual(['Shop A']);
    expect(byShop.get('Shop A')).toHaveLength(2);
  });

  it('different row shops attribute items by inferred category', () => {
    const byShop = attributeItemsToShops(
      [item('ဆန်'), item('ဓာတ်ဆီ')],
      [
        { categoryId: 'cat_food', amount: 60000 },
        { categoryId: 'cat_fuel', amount: 40000, shopName: 'Shop B' },
      ],
      'Shop A',
      suggestions,
    );
    expect(byShop.get('Shop A')?.map((i) => i.name)).toEqual(['ဆန်']);
    expect(byShop.get('Shop B')?.map((i) => i.name)).toEqual(['ဓာတ်ဆီ']);
  });

  it('an item with no category match falls back to the entry shop', () => {
    const byShop = attributeItemsToShops(
      [item('ပစ္စည်းအသစ်')],
      [
        { categoryId: 'cat_food', amount: 60000 },
        { categoryId: 'cat_fuel', amount: 40000, shopName: 'Shop B' },
      ],
      'Shop A',
      suggestions,
    );
    expect(byShop.get('Shop A')?.map((i) => i.name)).toEqual(['ပစ္စည်းအသစ်']);
    expect(byShop.has('Shop B')).toBe(false);
  });

  it('no items or no shop anywhere yields no candidate shops', () => {
    expect(attributeItemsToShops([], [{ categoryId: 'c', amount: 1 }], 'Shop A', suggestions).size).toBe(0);
    expect(
      attributeItemsToShops([item('ဆန်')], [{ categoryId: 'cat_food', amount: 1 }], '', suggestions).size,
    ).toBe(0);
  });

  it('an unsplit record sends every item to the entry shop', () => {
    const byShop = attributeItemsToShops([item('ဆန်')], undefined, 'Shop A', suggestions);
    expect([...byShop.keys()]).toEqual(['Shop A']);
  });
});

describe('form rows carry the shop (v7.6.41)', () => {
  it('rowsToSplits stores a shop only when the row names one', () => {
    const splits = rowsToSplits([
      { categoryId: 'cat_food', subCategoryId: '', amount: '60000', note: '', shopName: '' },
      { categoryId: 'cat_fuel', subCategoryId: '', amount: '40000', note: '', shopName: 'Shop B' },
    ]);
    expect(splits[0]).toEqual({ categoryId: 'cat_food', amount: 60000 });
    expect(splits[1]).toEqual({ categoryId: 'cat_fuel', amount: 40000, shopName: 'Shop B' });
  });

  it('splitRowsFromTransaction restores a stored row shop verbatim', () => {
    const rows = splitRowsFromTransaction(
      makeTx({
        shopName: 'Shop A',
        splits: [
          { categoryId: 'cat_food', amount: 60000 },
          { categoryId: 'cat_fuel', amount: 40000, shopName: 'Shop B' },
        ],
      }),
    );
    expect(rows?.[0].shopName).toBe('');
    expect(rows?.[1].shopName).toBe('Shop B');
  });

  it('nextSplitRow copies the last row shop like the category', () => {
    const rows: SplitFormRow[] = [
      { categoryId: 'cat_food', subCategoryId: '', amount: '1000', note: '', shopName: 'Shop B' },
    ];
    expect(nextSplitRow(rows).shopName).toBe('Shop B');
    expect(nextSplitRow(rows).amount).toBe('');
  });

  it('defaultSplitRows start with no row shop (inherit)', () => {
    expect(defaultSplitRows('cat_food', '')).toEqual([
      { categoryId: 'cat_food', subCategoryId: '', amount: '', note: '', shopName: '' },
      { categoryId: '', subCategoryId: '', amount: '', note: '', shopName: '' },
    ]);
  });

  it('a stored split type accepts the optional shopName field', () => {
    const split: TransactionSplit = { categoryId: 'cat_food', amount: 1000, shopName: 'Shop B' };
    expect(split.shopName).toBe('Shop B');
  });
});
