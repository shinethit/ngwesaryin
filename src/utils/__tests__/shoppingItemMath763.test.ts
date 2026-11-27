// [v7.6.63] Price / Qty / Total anchor rule: filling any two
// derives the third synchronously, and a typed value is never
// rewritten. Pure-helper cases with concrete numbers, plus
// source-text wiring assertions (the components have no test
// renderer in this repo — vitest node env, no testing-library).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  deriveShoppingItem,
  defaultShoppingEditOrder,
  restoredShoppingEditOrder,
  type ShoppingCalcField,
} from '../shoppingItemMath';

const order = (...fields: ShoppingCalcField[]): ShoppingCalcField[] => fields;

describe('deriveShoppingItem — the reported case first', () => {
  it('Qty + Total typed → Price fills, Qty is never changed', () => {
    // Fresh row: quantity defaults to 1 (seed), user types qty 2,
    // then types total 1000. Price must become 500; qty stays 2.
    const afterQty = deriveShoppingItem(
      { price: 0, quantity: 2, amount: 0 },
      'quantity',
      defaultShoppingEditOrder(),
    );
    expect(afterQty.values).toEqual({ price: 0, quantity: 2, amount: 0 });
    expect(afterQty.derivedField).toBeNull();
    const afterTotal = deriveShoppingItem(
      { price: 0, quantity: 2, amount: 1000 },
      'amount',
      afterQty.order,
    );
    expect(afterTotal.values).toEqual({ price: 500, quantity: 2, amount: 1000 });
    expect(afterTotal.derivedField).toBe('price');
  });

  it('typing price alone (qty default 1) derives the amount', () => {
    const r = deriveShoppingItem(
      { price: 500, quantity: 1, amount: 0 },
      'price',
      defaultShoppingEditOrder(),
    );
    expect(r.values).toEqual({ price: 500, quantity: 1, amount: 500 });
    expect(r.derivedField).toBe('amount');
  });

  it('price then qty derives the amount', () => {
    const r1 = deriveShoppingItem(
      { price: 500, quantity: 1, amount: 0 },
      'price',
      defaultShoppingEditOrder(),
    );
    const r2 = deriveShoppingItem(
      { price: 500, quantity: 2, amount: 500 },
      'quantity',
      r1.order,
    );
    expect(r2.values).toEqual({ price: 500, quantity: 2, amount: 1000 });
    expect(r2.derivedField).toBe('amount');
  });

  it('price + total derives qty (the only free variable)', () => {
    const r = deriveShoppingItem(
      { price: 500, quantity: 1, amount: 900 },
      'amount',
      order('quantity', 'price'),
    );
    expect(r.values).toEqual({ price: 500, quantity: 1.8, amount: 900 });
    expect(r.derivedField).toBe('quantity');
  });

  it('all three typed: the last two edited win', () => {
    // Qty 2, price 500, then total corrected to 900 → the two most
    // recent edits (price, amount) win; qty re-derives to 1.8.
    const r = deriveShoppingItem(
      { price: 500, quantity: 2, amount: 900 },
      'amount',
      order('quantity', 'price', 'amount'),
    );
    expect(r.values).toEqual({ price: 500, quantity: 1.8, amount: 900 });
  });

  it('a cleared field is never re-derived by its own edit', () => {
    // User clears price (0) after qty + total were typed: price
    // stays cleared; the next qty edit re-derives it.
    const cleared = deriveShoppingItem(
      { price: 0, quantity: 2, amount: 1000 },
      'price',
      order('quantity', 'amount'),
    );
    expect(cleared.values.price).toBe(0);
    expect(cleared.derivedField).toBeNull();
    const rederived = deriveShoppingItem(
      { price: 0, quantity: 3, amount: 1000 },
      'quantity',
      cleared.order,
    );
    expect(rederived.values).toEqual({ price: 333.33, quantity: 3, amount: 1000 });
    expect(rederived.derivedField).toBe('price');
  });

  it('rounding is 2 decimals, division is guarded', () => {
    const r = deriveShoppingItem(
      { price: 0, quantity: 3, amount: 1000 },
      'amount',
      order('quantity'),
    );
    expect(r.values.price).toBe(333.33);
    // Only one known field → nothing derives, no division at all.
    const single = deriveShoppingItem(
      { price: 500, quantity: 0, amount: 0 },
      'price',
      defaultShoppingEditOrder(),
    );
    expect(single.values).toEqual({ price: 500, quantity: 0, amount: 0 });
    expect(single.derivedField).toBeNull();
    // Non-positive values are never derivation sources.
    const neg = deriveShoppingItem(
      { price: -5, quantity: 2, amount: 1000 },
      'amount',
      order('quantity', 'price'),
    );
    expect(neg.values).toEqual({ price: 500, quantity: 2, amount: 1000 });
  });

  it('restored rows: an amount edit derives price, qty is kept', () => {
    // Edit mode seed: ['price', 'quantity'] — the stored amount is
    // the saved total, not a typed value.
    const r = deriveShoppingItem(
      { price: 500, quantity: 2, amount: 900 },
      'amount',
      restoredShoppingEditOrder(),
    );
    expect(r.values).toEqual({ price: 450, quantity: 2, amount: 900 });
    expect(r.derivedField).toBe('price');
    // ...while a restored price edit derives the total, as before.
    const r2 = deriveShoppingItem(
      { price: 600, quantity: 2, amount: 1000 },
      'price',
      restoredShoppingEditOrder(),
    );
    expect(r2.values).toEqual({ price: 600, quantity: 2, amount: 1200 });
  });

  it('edit history stays distinct and newest-last', () => {
    const r = deriveShoppingItem(
      { price: 500, quantity: 2, amount: 1000 },
      'price',
      order('price', 'quantity', 'amount'),
    );
    expect(r.order).toEqual(['quantity', 'amount', 'price']);
    expect(defaultShoppingEditOrder()).toEqual(['quantity']);
    expect(restoredShoppingEditOrder()).toEqual(['price', 'quantity']);
  });
});

const MODAL_SRC = readFileSync(
  new URL('../../components/TransactionModal.tsx', import.meta.url),
  'utf8',
);

describe('shopping row wiring in TransactionModal (v7.6.63)', () => {
  it('updateShoppingItem derives synchronously through the helper', () => {
    expect(MODAL_SRC).toContain('deriveShoppingItem(parsed, field, prevOrder)');
    expect(MODAL_SRC).toContain('shoppingEditOrderRef');
    expect(MODAL_SRC).toContain('restoredShoppingEditOrder()');
    expect(MODAL_SRC).toContain('defaultShoppingEditOrder()');
  });

  it('no timer, no single-field anchor ref remains in the row math', () => {
    expect(MODAL_SRC).not.toContain('shoppingAmountTimersRef');
    expect(MODAL_SRC).not.toContain('shoppingLastEditedRef');
    // The row-math function itself must contain no timer — the
    // unrelated scroll/focus timer in the effect below it is
    // untouched.
    const start = MODAL_SRC.indexOf('const updateShoppingItem');
    const end = MODAL_SRC.indexOf('const shoppingListContainerRef', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(MODAL_SRC.slice(start, end)).not.toContain('setTimeout');
    expect(MODAL_SRC.slice(start, end)).not.toContain('500');
    expect(MODAL_SRC).not.toContain('amount: p * q');
  });

  it('the save path stores the displayed amount, never recomputes it', () => {
    expect(MODAL_SRC).toContain('const a = parseMyanmarNumber(i.amount as any) || 0;');
    expect(MODAL_SRC).toContain('amount: a, unit:');
  });

  it('row totals parse amounts (typed text must never concatenate)', () => {
    expect(MODAL_SRC).toContain(
      'parseMyanmarNumber(item.amount as any) || 0), 0);',
    );
  });
});
