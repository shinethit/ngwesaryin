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
// [v7.6.60] FLAT like the Hero: the v7.6.58 gradient ground,
// tinted chips and luminous glow were never asked for — the user
// rejected them as a colour wash ('ရောင်ပြေး') and not beautiful.
// They are removed. The card is flat navy again, figures carry
// FLAT tone colours only, like the Dashboard hero. The -400
// saturation and the semantics/boundaries below are unchanged.
// [v7.6.61] RESEARCHED REDESIGN: the user rejected the whole card
// ('ဖောင့်မလှ', 'အရောင်မလှ', 'ရွံစရာကြီး') and ordered the
// colour/font pairing studied from real finance apps and
// Burmese webfonts first. Shades now follow the Hero's own tier
// scale (Dashboard.tsx heroHealthText: -300 steps on the dark
// ground) with the muted-red family fintech dark-mode guidance
// prescribes for dark surfaces (a slightly muted red, never pure
// #ff0000): negative red-400 #f87171, low amber-300 #fcd34d
// (the Hero's moderate tier, exact), high white. Semantics and
// boundaries are UNCHANGED — only the shades change.
export const LOW_BALANCE_THRESHOLD_MMK = 100000;

/** Tailwind text colour for a balance value on the navy card. */
export function balanceToneClass(
  value: number,
): 'text-red-400' | 'text-amber-300' | 'text-white' {
  if (value < 0) return 'text-red-400';
  if (value < LOW_BALANCE_THRESHOLD_MMK) return 'text-amber-300';
  return 'text-white';
}
