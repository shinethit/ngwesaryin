// [v7.6.46] Part D — balance tone rule for the Records navy card:
// negative -> red, below 100,000 MMK -> yellow, 100,000+ -> white.
// Boundaries: exactly 100,000 -> WHITE; 0 -> YELLOW; -1 -> RED.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { balanceToneClass, LOW_BALANCE_THRESHOLD_MMK } from '../balanceTone';

const TX_SRC = readFileSync(
  new URL('../../components/TransactionsView.tsx', import.meta.url),
  'utf8',
);

describe('balanceToneClass (v7.6.46 Part D)', () => {
  it('the threshold constant is 100,000 MMK', () => {
    expect(LOW_BALANCE_THRESHOLD_MMK).toBe(100000);
  });

  it('negative balances are red, including -1', () => {
    expect(balanceToneClass(-1)).toBe('text-rose-300');
    expect(balanceToneClass(-50000)).toBe('text-rose-300');
    expect(balanceToneClass(-100000)).toBe('text-rose-300');
  });

  it('zero and sub-100k balances are yellow', () => {
    expect(balanceToneClass(0)).toBe('text-amber-300');
    expect(balanceToneClass(1)).toBe('text-amber-300');
    expect(balanceToneClass(50000)).toBe('text-amber-300');
    expect(balanceToneClass(99999)).toBe('text-amber-300');
  });

  it('exactly 100,000 and above stay white', () => {
    expect(balanceToneClass(100000)).toBe('text-white');
    expect(balanceToneClass(100001)).toBe('text-white');
    expect(balanceToneClass(500000)).toBe('text-white');
  });

  it('red takes precedence over the below-threshold band', () => {
    // A negative is also < 100,000; the sign check must win.
    expect(balanceToneClass(-1)).not.toBe('text-amber-300');
  });

  it('the navy card applies the tone to the big amount and both mini-stats', () => {
    expect(TX_SRC).toContain('balanceToneClass');
    // Big closing amount, Opening and Closing mini-stat value divs.
    expect(TX_SRC.match(/balanceToneClass\(/g)?.length).toBeGreaterThanOrEqual(3);
    expect(TX_SRC).toContain('balanceToneClass(monthBalance.closing)');
    expect(TX_SRC).toContain('balanceToneClass(monthBalance.opening)');
  });

  it('the net line keeps its own sign colouring (unchanged)', () => {
    // Net is emerald when >= 0, rose when negative — its own ternary,
    // not the tone helper.
    expect(TX_SRC).toContain(
      "monthBalance.net >= 0 ? 'text-emerald-300' : 'text-rose-300'",
    );
  });
});
