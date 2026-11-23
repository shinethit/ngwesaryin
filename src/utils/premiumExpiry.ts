// [v7.6.22] Premium remaining-days rule — ONE place.
//
// The header VIP badge (Navbar) and the AccountModal plan card both
// show how much Premium time is left, under the SAME rule that
// AccountModal has used since before v7.6.22:
//   daysLeft = max(0, ceil((expiry - now) / one day))
//   daysLeft > 3650  ->  Lifetime wording
//   otherwise       ->  'N ရက်ကျန်' / 'N days left'
//   no expiry       ->  no chip at all (null)
//
// Lifetime is NEVER the null expiry: every lifetime grant in the
// tree writes a far-future date string (admin self-heal +100 years,
// admin grant 999 months -> ~99 years, activation-code redemption
// months >= 900 -> +100 years). Null is written ONLY together with
// plan 'free' (revoke / downgrade), so a premium account with a null
// expiry is an unknown/legacy state — it shows no chip, exactly as
// AccountModal behaved before. The one behavior change vs the old
// AccountModal inline code: an UNPARSEABLE expiry string used to
// produce daysLeft NaN (and a 'NaN ရက်ကျန်' chip); it now yields
// null (no chip), because NaN is not a day count.
//
// This module is deliberately dependency-free: it does NOT import
// utils/storage (whose top level touches bare `localStorage`, which
// does not exist in the vitest node env). Callers pass the cached
// value in — safeGetItem('ngwe_premium_expires_at') — and the
// precedence (profile wins, then cache, then null) lives here, in
// resolvePremiumExpiryIso, in exactly one place.
//
// Date parsing mirrors parseExpiryTime (context/AuthContext.tsx):
// the ' ' -> 'T' rewrite keeps Safari/iOS parsing the ISO string.

/** Above this many remaining days, the plan reads as Lifetime. */
export const LIFETIME_THRESHOLD_DAYS = 3650;

const DAY_MS = 1000 * 60 * 60 * 24;

/**
 * The expiry ISO string in effect: the profile value wins, falling
 * back to the locally cached value, exactly as AccountModal /
 * PlanBanner / PremiumModal have always resolved it. Callers supply
 * the cached value (safeGetItem('ngwe_premium_expires_at')); the
 * precedence lives here, in one place.
 */
export function resolvePremiumExpiryIso(
  profileExpiry: string | null | undefined,
  cachedExpiry: string | null | undefined,
): string | null {
  return profileExpiry || cachedExpiry || null;
}

/**
 * Whole remaining days until expiryIso, rounded UP (12 hours left
 * still reads as 1 day), never below 0. Null when there is no expiry
 * or it cannot be parsed.
 */
export function getPremiumDaysLeft(
  expiryIso: string | null | undefined,
  nowMs: number = Date.now(),
): number | null {
  if (!expiryIso) return null;
  const formatted =
    typeof expiryIso === 'string' ? expiryIso.replace(' ', 'T') : expiryIso;
  const expTime = new Date(formatted).getTime();
  if (isNaN(expTime)) return null;
  return Math.max(0, Math.ceil((expTime - nowMs) / DAY_MS));
}

/**
 * The chip text for a remaining-days count, or null when there is
 * nothing to show. Lifetime wording above the threshold, day count
 * otherwise — the AccountModal chip wording, verbatim.
 */
export function formatPremiumRemaining(
  daysLeft: number | null,
  lang: 'my' | 'en',
): string | null {
  if (daysLeft === null) return null;
  if (daysLeft > LIFETIME_THRESHOLD_DAYS) {
    return lang === 'my' ? 'တစ်သက်တာ' : 'Lifetime';
  }
  return lang === 'my' ? `${daysLeft} ရက်ကျန်` : `${daysLeft} days left`;
}
