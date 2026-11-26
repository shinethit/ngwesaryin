// [v7.6.46] Balance tone rule for the Records navy balance card (and
// anywhere a balance is shown on a dark surface): negative is red,
// below 100,000 MMK is yellow, 100,000 and above stays white.
// Boundaries: exactly 100,000 -> white; 0 -> yellow; -1 -> red.
// Red takes precedence (a negative is also < 100,000).
// [v7.6.57] SATURATED shades: the -300 shades read washed-out pink/grey
// on the navy card (the user showed the card twice asking whether the
// colour is vivid — it was not). -400 shades keep the SAME semantics
// and boundaries, only the saturation changes: rose-400 #fb7185,
// amber-400 #fbbf24, white unchanged.
// [v7.6.58] WHOLE-CARD vivid treatment: the -400 text alone still did
// not read vivid to the user's eye (shown a third time, same data).
// The card now carries the colour as AREAS, not just strokes: a
// saturated gradient ground, tinted chips behind each sub-figure,
// bright tinted labels, and a soft luminous glow on the big figure
// and the net. The tone SEMANTICS and boundaries below are unchanged.
export const LOW_BALANCE_THRESHOLD_MMK = 100000;

export type BalanceTone = 'rose' | 'amber' | 'white' | 'emerald';

/** Semantic tone of a balance value: sign first, then the threshold. */
export function balanceTone(value: number): 'rose' | 'amber' | 'white' {
  if (value < 0) return 'rose';
  if (value < LOW_BALANCE_THRESHOLD_MMK) return 'amber';
  return 'white';
}

/** Luminous text-shadow for the big figure on the navy card, by tone. */
export function balanceGlowClass(value: number): string {
  switch (balanceTone(value)) {
    case 'rose':
      return '[text-shadow:0_0_18px_rgba(251,113,133,0.6)]';
    case 'amber':
      return '[text-shadow:0_0_18px_rgba(251,191,36,0.55)]';
    case 'white':
      return '[text-shadow:0_0_14px_rgba(255,255,255,0.45)]';
  }
}

/** Luminous text-shadow for the net figure: emerald when >= 0, rose below. */
export function netGlowClass(net: number): string {
  return net >= 0
    ? '[text-shadow:0_0_14px_rgba(52,211,153,0.5)]'
    : '[text-shadow:0_0_14px_rgba(251,113,133,0.5)]';
}

/** Tinted chip container behind a sub-figure, by tone. */
export function toneChipClass(tone: BalanceTone): string {
  switch (tone) {
    case 'rose':
      return 'bg-rose-500/25 border border-rose-300/40';
    case 'amber':
      return 'bg-amber-500/25 border border-amber-300/40';
    case 'emerald':
      return 'bg-emerald-500/25 border border-emerald-300/40';
    case 'white':
      return 'bg-white/15 border border-white/30';
  }
}

/** Bright tinted label inside a chip — never a grey-washed white. */
export function toneChipLabelClass(tone: BalanceTone): string {
  switch (tone) {
    case 'rose':
      return 'text-rose-100';
    case 'amber':
      return 'text-amber-100';
    case 'emerald':
      return 'text-emerald-100';
    case 'white':
      return 'text-white';
  }
}

/** Tailwind text colour for a balance value on the navy card. */
export function balanceToneClass(
  value: number,
): 'text-rose-400' | 'text-amber-400' | 'text-white' {
  if (value < 0) return 'text-rose-400';
  if (value < LOW_BALANCE_THRESHOLD_MMK) return 'text-amber-400';
  return 'text-white';
}
