// [v7.6.46] Balance tone rule for the Records navy balance card (and
// anywhere a balance is shown on a dark surface): negative is red,
// below 100,000 MMK is yellow, 100,000 and above stays white.
// Boundaries: exactly 100,000 -> white; 0 -> yellow; -1 -> red.
// Red takes precedence (a negative is also < 100,000).
export const LOW_BALANCE_THRESHOLD_MMK = 100000;

/** Tailwind text colour for a balance value on the navy card. */
export function balanceToneClass(
  value: number,
): 'text-rose-300' | 'text-amber-300' | 'text-white' {
  if (value < 0) return 'text-rose-300';
  if (value < LOW_BALANCE_THRESHOLD_MMK) return 'text-amber-300';
  return 'text-white';
}
