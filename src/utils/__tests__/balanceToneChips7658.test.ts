// [v7.6.58] Whole-card vivid treatment: the -400 text alone did not
// read vivid to the user's eye (card shown three times, same data),
// so the card carries colour as AREAS — gradient ground, tinted
// chips, bright labels, luminous glow. Tone SEMANTICS and boundaries
// are unchanged; these tests pin the new helpers and their wiring.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  balanceGlowClass,
  balanceTone,
  balanceToneClass,
  LOW_BALANCE_THRESHOLD_MMK,
  netGlowClass,
  toneChipClass,
  toneChipLabelClass,
} from '../balanceTone';

const TX_SRC = readFileSync(
  new URL('../../components/TransactionsView.tsx', import.meta.url),
  'utf8',
);

describe('balanceTone helpers (v7.6.58)', () => {
  it('balanceTone keeps the v7.6.46 semantics and boundaries', () => {
    expect(LOW_BALANCE_THRESHOLD_MMK).toBe(100000);
    expect(balanceTone(-1)).toBe('rose');
    expect(balanceTone(-50000)).toBe('rose');
    expect(balanceTone(0)).toBe('amber');
    expect(balanceTone(99999)).toBe('amber');
    expect(balanceTone(100000)).toBe('white');
    expect(balanceTone(500000)).toBe('white');
  });

  it('balanceToneClass is unchanged (-400 shades)', () => {
    expect(balanceToneClass(-1)).toBe('text-rose-400');
    expect(balanceToneClass(0)).toBe('text-amber-400');
    expect(balanceToneClass(100000)).toBe('text-white');
  });

  it('balanceGlowClass returns a luminous shadow per tone', () => {
    expect(balanceGlowClass(-1)).toBe('[text-shadow:0_0_18px_rgba(251,113,133,0.6)]');
    expect(balanceGlowClass(0)).toBe('[text-shadow:0_0_18px_rgba(251,191,36,0.55)]');
    expect(balanceGlowClass(100000)).toBe('[text-shadow:0_0_14px_rgba(255,255,255,0.45)]');
  });

  it('netGlowClass is emerald for >= 0 and rose below', () => {
    expect(netGlowClass(0)).toBe('[text-shadow:0_0_14px_rgba(52,211,153,0.5)]');
    expect(netGlowClass(5000)).toBe('[text-shadow:0_0_14px_rgba(52,211,153,0.5)]');
    expect(netGlowClass(-1)).toBe('[text-shadow:0_0_14px_rgba(251,113,133,0.5)]');
  });

  it('toneChipClass tints the chip container per tone', () => {
    expect(toneChipClass('rose')).toBe('bg-rose-500/25 border border-rose-300/40');
    expect(toneChipClass('amber')).toBe('bg-amber-500/25 border border-amber-300/40');
    expect(toneChipClass('emerald')).toBe('bg-emerald-500/25 border border-emerald-300/40');
    expect(toneChipClass('white')).toBe('bg-white/15 border border-white/30');
  });

  it('toneChipLabelClass is bright and tinted, never grey-washed', () => {
    expect(toneChipLabelClass('rose')).toBe('text-rose-100');
    expect(toneChipLabelClass('amber')).toBe('text-amber-100');
    expect(toneChipLabelClass('emerald')).toBe('text-emerald-100');
    expect(toneChipLabelClass('white')).toBe('text-white');
  });
});

describe('vivid card wiring (v7.6.58)', () => {
  it('the card ground is a saturated gradient, not the flat #1E3A5F', () => {
    expect(TX_SRC).toContain('bg-gradient-to-br from-[#0E2247] via-[#1E3A5F] to-[#1D4ED8]');
    expect(TX_SRC).not.toContain('bg-[#1E3A5F]');
  });

  it('the big figure is larger, black weight, and glows', () => {
    expect(TX_SRC).toContain('text-[26px] leading-tight font-black font-mono');
    expect(TX_SRC).toContain('balanceGlowClass(monthBalance.closing)');
  });

  it('the three sub-figures sit in tinted chips with bright labels', () => {
    expect(TX_SRC).toContain('toneChipClass(balanceTone(monthBalance.opening))');
    expect(TX_SRC).toContain('toneChipClass(balanceTone(monthBalance.closing))');
    expect(TX_SRC).toContain("toneChipClass(monthBalance.net >= 0 ? 'emerald' : 'rose')");
    expect(TX_SRC).toContain('rounded-xl px-1 max-[361px]:px-0.5 py-1.5');
  });

  it('the net figure keeps its sign colouring and glows', () => {
    expect(TX_SRC).toContain(
      "monthBalance.net >= 0 ? 'text-emerald-400' : 'text-rose-400'",
    );
    expect(TX_SRC).toContain('netGlowClass(monthBalance.net)');
  });

  it('the title is bright white, not pale sky-200', () => {
    expect(TX_SRC).toContain('text-xs font-extrabold text-white truncate');
    expect(TX_SRC).not.toContain('text-sky-200');
  });

  it('the tone values on the chips are the same -400 classes as the big figure', () => {
    expect(TX_SRC).toContain('balanceToneClass(monthBalance.opening)');
    expect(TX_SRC).toContain('balanceToneClass(monthBalance.closing)');
  });

  // [v7.6.58 top-up] At 360px the first build truncated the middle
  // label ('လအဆုံးလက်ကျန်…') and cut the 'သိန်း' unit off two
  // values — the overflow flags missed it because ellipsis is not
  // overflow. Chip labels/values must WRAP, never truncate.
  it('the chip labels and values wrap at 360px instead of truncating', () => {
    expect(TX_SRC).toContain('max-[361px]:text-[9px]');
    expect(TX_SRC).not.toContain('font-semibold truncate max-[361px]');
    expect(TX_SRC).not.toContain('font-bold truncate tracking-tight');
  });
});
