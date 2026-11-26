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
export const LOW_BALANCE_THRESHOLD_MMK = 100000;

/** Tailwind text colour for a balance value on the navy card. */
export function balanceToneClass(
  value: number,
): 'text-rose-400' | 'text-amber-400' | 'text-white' {
  if (value < 0) return 'text-rose-400';
  if (value < LOW_BALANCE_THRESHOLD_MMK) return 'text-amber-400';
  return 'text-white';
}
