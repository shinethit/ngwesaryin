// [v7.6.60] FLAT like the Hero: the v7.6.58 gradient ground,
// tinted chips and luminous glow were never asked for — the user
// rejected them as a colour wash ('ရောင်ပြေး') and not beautiful.
// They are removed. These tests pin the flat treatment: flat navy
// ground, flat tone colours, plain-text sub-figures with bright
// labels, Hero-flat buttons. Tone SEMANTICS and boundaries are
// unchanged; the 360px no-truncate behaviour is kept.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  balanceToneClass,
  LOW_BALANCE_THRESHOLD_MMK,
} from '../balanceTone';

const TX_SRC = readFileSync(
  new URL('../../components/TransactionsView.tsx', import.meta.url),
  'utf8',
);

const BT_SRC = readFileSync(
  new URL('../balanceTone.ts', import.meta.url),
  'utf8',
);

describe('balanceTone helpers (v7.6.60 flat)', () => {
  it('balanceToneClass keeps the v7.6.46 semantics and boundaries', () => {
    expect(LOW_BALANCE_THRESHOLD_MMK).toBe(100000);
    expect(balanceToneClass(-1)).toBe('text-rose-400');
    expect(balanceToneClass(0)).toBe('text-amber-400');
    expect(balanceToneClass(100000)).toBe('text-white');
  });

  it('the glow and chip helpers are gone — no text-shadow anywhere', () => {
    expect(BT_SRC).not.toContain('balanceGlowClass');
    expect(BT_SRC).not.toContain('netGlowClass');
    expect(BT_SRC).not.toContain('toneChipClass');
    expect(BT_SRC).not.toContain('toneChipLabelClass');
    expect(BT_SRC).not.toContain('balanceTone(');
    expect(BT_SRC).not.toContain('text-shadow');
    expect(TX_SRC).not.toContain('balanceGlowClass');
    expect(TX_SRC).not.toContain('netGlowClass');
    expect(TX_SRC).not.toContain('toneChipClass');
    expect(TX_SRC).not.toContain('toneChipLabelClass');
  });
});

describe('flat card wiring (v7.6.60)', () => {
  it('the card ground is the flat #1E3A5F, never a gradient', () => {
    expect(TX_SRC).toContain('bg-[#1E3A5F]');
    expect(TX_SRC).not.toContain('bg-gradient-to-br from-[#0E2247]');
    expect(TX_SRC).not.toContain('border-indigo-300/25');
    expect(TX_SRC).not.toContain('rgba(29,78,216,0.40)');
  });

  it('the big figure is the Hero size, black weight, flat colour', () => {
    // [v7.6.59] Hero parity: the figure is the Hero's exact phone
    // size (text-3xl, 30px — Dashboard.tsx:541), not 26px.
    expect(TX_SRC).toContain('text-3xl leading-tight font-black font-mono');
    expect(TX_SRC).not.toContain('text-[26px] leading-tight font-black');
    expect(TX_SRC).toContain('balanceToneClass(monthBalance.closing)');
  });

  it('the three sub-figures are plain text with bright labels, not chips', () => {
    expect(TX_SRC).toContain('text-white/80');
    expect(TX_SRC).not.toContain('rounded-xl px-1 max-[361px]:px-0.5 py-1.5');
    expect(TX_SRC).toContain('balanceToneClass(monthBalance.opening)');
    expect(TX_SRC).toContain('balanceToneClass(monthBalance.closing)');
    expect(TX_SRC).toContain(
      "monthBalance.net >= 0 ? 'text-emerald-400' : 'text-rose-400'",
    );
  });

  it('the card buttons match the Hero flat translucent style', () => {
    expect(TX_SRC).toContain('bg-white/10 hover:bg-white/20 border border-white/20');
    expect(TX_SRC).not.toContain('bg-white/15 hover:bg-white/25');
  });

  it('the title is bright white, not pale sky-200', () => {
    expect(TX_SRC).toContain('text-xs font-extrabold text-white truncate');
    expect(TX_SRC).not.toContain('text-sky-200');
  });

  // [v7.6.58 top-up] At 360px the first build truncated the middle
  // label ('လအဆုံးလက်ကျန်…') and cut the 'သိန်း' unit off two
  // values — the overflow flags missed it because ellipsis is not
  // overflow. Labels/values must WRAP, never truncate. Kept in
  // v7.6.60: the plain-text cells keep the 9px labels.
  it('the sub-figure labels and values wrap at 360px instead of truncating', () => {
    expect(TX_SRC).toContain('max-[361px]:text-[9px]');
    expect(TX_SRC).not.toContain('font-semibold truncate max-[361px]');
    expect(TX_SRC).not.toContain('font-bold truncate tracking-tight');
  });
});
