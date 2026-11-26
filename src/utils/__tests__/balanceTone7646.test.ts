// [v7.6.46] Part D — balance tone rule for the Records navy card:
// negative -> red, below 100,000 MMK -> yellow, 100,000+ -> white.
// Boundaries: exactly 100,000 -> WHITE; 0 -> YELLOW; -1 -> RED.
// [v7.6.57] Saturated shades: -300 shades read washed-out on the navy
// card, so the helper returns the -400 shades instead. SAME semantics
// and boundaries — only saturation changed (rose-400 #fb7185,
// amber-400 #fbbf24, white unchanged).
// [v7.6.58] The mini-stat labels are bright TINTED chip labels now
// (rose-100 / amber-100 / emerald-100 / white by tone), not the
// washed-out white/80 of 57 — the whole card reads vivid only when
// the labels carry colour too.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { balanceToneClass, LOW_BALANCE_THRESHOLD_MMK } from '../balanceTone';

const TX_SRC = readFileSync(
  new URL('../../components/TransactionsView.tsx', import.meta.url),
  'utf8',
);

describe('balanceToneClass (v7.6.46 Part D, saturated v7.6.57)', () => {
  it('the threshold constant is 100,000 MMK', () => {
    expect(LOW_BALANCE_THRESHOLD_MMK).toBe(100000);
  });

  it('negative balances are saturated red, including -1', () => {
    expect(balanceToneClass(-1)).toBe('text-rose-400');
    expect(balanceToneClass(-50000)).toBe('text-rose-400');
    expect(balanceToneClass(-100000)).toBe('text-rose-400');
  });

  it('zero and sub-100k balances are saturated yellow', () => {
    expect(balanceToneClass(0)).toBe('text-amber-400');
    expect(balanceToneClass(1)).toBe('text-amber-400');
    expect(balanceToneClass(50000)).toBe('text-amber-400');
    expect(balanceToneClass(99999)).toBe('text-amber-400');
  });

  it('exactly 100,000 and above stay white', () => {
    expect(balanceToneClass(100000)).toBe('text-white');
    expect(balanceToneClass(100001)).toBe('text-white');
    expect(balanceToneClass(500000)).toBe('text-white');
  });

  it('red takes precedence over the below-threshold band', () => {
    // A negative is also < 100,000; the sign check must win.
    expect(balanceToneClass(-1)).not.toBe('text-amber-400');
  });

  it('the navy card applies the tone to the big amount and both mini-stats', () => {
    expect(TX_SRC).toContain('balanceToneClass');
    // Big closing amount, Opening and Closing mini-stat value divs.
    expect(TX_SRC.match(/balanceToneClass\(/g)?.length).toBeGreaterThanOrEqual(3);
    expect(TX_SRC).toContain('balanceToneClass(monthBalance.closing)');
    expect(TX_SRC).toContain('balanceToneClass(monthBalance.opening)');
  });

  it('the net line keeps its own sign colouring (unchanged, saturated v7.6.57)', () => {
    // Net is emerald when >= 0, rose when negative — its own ternary,
    // not the tone helper.
    expect(TX_SRC).toContain(
      "monthBalance.net >= 0 ? 'text-emerald-400' : 'text-rose-400'",
    );
  });

  it('the mini-stat labels are bright tinted chip labels (v7.6.58), not washed-out white/80', () => {
    expect(TX_SRC).toContain('toneChipLabelClass(balanceTone(monthBalance.opening))');
    expect(TX_SRC).toContain('toneChipLabelClass(balanceTone(monthBalance.closing))');
    expect(TX_SRC).toContain("toneChipLabelClass(monthBalance.net >= 0 ? 'emerald' : 'rose')");
    expect(TX_SRC).not.toContain('text-white/80 font-medium truncate');
    expect(TX_SRC).not.toContain('text-white/60 font-medium truncate');
  });
});
