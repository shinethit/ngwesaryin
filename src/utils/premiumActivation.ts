// [v7.5.92] Pure helpers for Premium activation (trial claim + code redeem).
// Kept free of Firebase/React imports so they are unit-testable in isolation
// (node environment, no emulator, no network).
//
// Why these exist:
// - TRIAL: firestore.rules canUpgradePremium() Path A requires the written
//   profile to carry `premiumCodeUsed == null || == ''`. A fresh account's
//   users doc has NO premiumCodeUsed field, and direct rules access to a
//   missing field is an ERROR, so the trial write was always denied.
//   buildTrialProfileUpdate() therefore ALWAYS includes
//   `premiumCodeUsed: null` in the trial payload. cleanForFirestore
//   (src/lib/firebase.ts) preserves null (only undefined is dropped), so
//   the null survives the write and Path A sees the field.
// - CODE REDEEM: rules Path B requires the activation code to ALREADY be
//   isUsed == true AND usedBy == this uid at profile-write time. The old
//   order (profile first, burn after) could therefore never pass Path B.
//   redeemPromoCodeInOrder() burns the code FIRST, then writes the profile.
import type { PlanType } from '../types';

// ---------------------------------------------------------------------------
// F1 — free-trial payload
// ---------------------------------------------------------------------------

export interface TrialProfileUpdateInput {
  /** Existing user-doc plan (undefined for a fresh account). */
  plan?: string | null;
  /** Existing premium expiry, if any. */
  premiumExpiresAt?: string | null;
  /** Existing premiumMonths, if any. */
  premiumMonths?: number | null;
  /** `now.toISOString()` from the caller — one timestamp for all fields. */
  nowIso: string;
  /** `Date.now()` from the caller (eligibility was already checked). */
  nowMs: number;
  /** Account creation timestamp carried on the profile. */
  rawCreatedAt: string;
}

export interface TrialProfileUpdate {
  plan: PlanType;
  premiumExpiresAt: string;
  premiumActivatedAt: string;
  premiumMonths: number;
  /** ALWAYS null for a trial claim — this is what rules Path A requires. */
  premiumCodeUsed: null;
  trialClaimed: true;
  trialClaimedAt: string;
  accountCreatedAt: string;
}

const TRIAL_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// F0 — 3-month free-trial eligibility (v7.5.98)
// ---------------------------------------------------------------------------

export interface TrialEligibilityInput {
  /** `user.metadata.creationTime` — preferred source, as in PremiumModal. */
  creationTime?: string | null;
  /** `userProfile.accountCreatedAt` — fallback when creationTime is absent. */
  accountCreatedAt?: string | null;
  /** Whether the account already claimed the free trial. */
  trialClaimed?: boolean;
}

export interface TrialEligibility {
  /** Whole days since account creation (0 when no creation time known). */
  accountAgeDays: number;
  /** Whole days left of the 30-day claim window (never below 0). */
  trialDaysLeft: number;
  /** True when the trial is unclaimed and the account is at most 30 days old. */
  isEligible: boolean;
}

/**
 * The EXACT eligibility formula from PremiumModal (v7.5.92 logic):
 * creationTime ?? accountCreatedAt, null -> age 0; eligible =
 * !claimed && age <= 30; daysLeft = max(0, 30 - age). Kept pure so
 * the TrialStrip and the tests pin the same decision matrix the
 * modal already uses. PremiumModal itself is deliberately NOT
 * refactored to call this (risk); the matrix is pinned by tests.
 */
export function getTrialEligibility(
  input: TrialEligibilityInput,
): TrialEligibility {
  const userCreatedTime = input.creationTime
    ? new Date(input.creationTime).getTime()
    : input.accountCreatedAt
      ? new Date(input.accountCreatedAt).getTime()
      : null;
  const accountAgeDays = userCreatedTime
    ? Math.floor((Date.now() - userCreatedTime) / DAY_MS)
    : 0;
  const trialDaysLeft = Math.max(0, 30 - accountAgeDays);
  return {
    accountAgeDays,
    trialDaysLeft,
    isEligible: !input.trialClaimed && accountAgeDays <= 30,
  };
}

export function buildTrialProfileUpdate(input: TrialProfileUpdateInput): TrialProfileUpdate {
  const { plan, premiumExpiresAt, premiumMonths, nowIso, nowMs, rawCreatedAt } = input;
  // Verbatim logic from AuthContext.claimFreeTrial (v7.5.91): a still-valid
  // premium expiry stacks +90 days on top of it, otherwise +90 days from now.
  let expiresAt: string;
  if (plan === 'premium' && premiumExpiresAt) {
    const currentExp = new Date(premiumExpiresAt).getTime();
    if (currentExp > nowMs) {
      expiresAt = new Date(currentExp + TRIAL_DAYS * DAY_MS).toISOString();
    } else {
      expiresAt = new Date(nowMs + TRIAL_DAYS * DAY_MS).toISOString();
    }
  } else {
    expiresAt = new Date(nowMs + TRIAL_DAYS * DAY_MS).toISOString();
  }

  return {
    plan: 'premium',
    premiumExpiresAt: expiresAt,
    premiumActivatedAt: nowIso,
    premiumMonths: (premiumMonths || 0) + 3,
    // [v7.5.92] MUST be present (null, not absent): rules Path A reads
    // request.resource.data.premiumCodeUsed directly — a missing field
    // errors and the trial write is denied.
    premiumCodeUsed: null,
    trialClaimed: true,
    trialClaimedAt: nowIso,
    accountCreatedAt: rawCreatedAt,
  };
}

// ---------------------------------------------------------------------------
// F2 — activation-code redeem: expiry math + burn-then-profile sequencing
// ---------------------------------------------------------------------------

export interface PromoExpiryInput {
  /** Code months, already normalised (Number(codeData.months) || 1). */
  months: number;
  /** Current premium expiry from the user profile, if any. */
  currentPremiumExpiresAt?: string | null;
  /** `Date.now()` from the caller. */
  nowMs: number;
}

export interface PromoExpiry {
  months: number;
  isLifetime: boolean;
  expiresAt: string;
}

export function computePromoExpiry(input: PromoExpiryInput): PromoExpiry {
  const { months, currentPremiumExpiresAt, nowMs } = input;
  const isLifetime = months >= 900;
  // Verbatim logic from PremiumModal.handleApplyPromo (v7.5.91):
  // renewals STACK onto the existing expiry (max(now, current)).
  const currentExpMs = currentPremiumExpiresAt
    ? new Date(currentPremiumExpiresAt).getTime()
    : NaN;
  const baseMs =
    !isNaN(currentExpMs) && currentExpMs > nowMs ? currentExpMs : nowMs;
  const expiresAt = isLifetime
    ? new Date(baseMs + 100 * 365.25 * 24 * 60 * 60 * 1000).toISOString()
    : new Date(baseMs + months * 30 * 24 * 60 * 60 * 1000).toISOString();
  return { months, isLifetime, expiresAt };
}

// [v7.5.92] Honest errors for the burn-first order. Literal Burmese —
// do not reword (the user approved these exact strings).
export const PROMO_BURN_FAILED_MY =
  'ကုဒ်ကို သုံးလို့မရပါ — သုံးပြီးသား (သို့) သက်တမ်းကုန်တဲ့ ကုတ်ဖြစ်နိုင်ပါတယ်။ ကုတ်ကို သေချာစစ်ပြီး ပြန်ကြိုးစားပါ';
export const PROMO_BURN_FAILED_EN =
  'This code could not be used — it may already be redeemed or expired. Please check the code and try again.';
export const PROMO_PROFILE_FAILED_AFTER_BURN_MY =
  'ကုဒ်ကို သုံးပြီးသွားပါပြီ၊ ဒါပေမဲ့ Premium ဖွင့်၍ မရပါ — Admin ကို ဆက်သွယ်ပြီး ကုတ်အသစ် တောင်းပါ';
export const PROMO_PROFILE_FAILED_AFTER_BURN_EN =
  'The code was used, but Premium could not be activated — please contact Admin for a new code.';

export type PromoRedeemOutcome =
  | { status: 'success' }
  | { status: 'burnFailed' }
  | { status: 'profileFailedAfterBurn' };

export function promoRedeemErrorMessage(
  outcome: PromoRedeemOutcome,
  lang: 'my' | 'en',
): string | null {
  if (outcome.status === 'burnFailed') {
    return lang === 'my' ? PROMO_BURN_FAILED_MY : PROMO_BURN_FAILED_EN;
  }
  if (outcome.status === 'profileFailedAfterBurn') {
    return lang === 'my'
      ? PROMO_PROFILE_FAILED_AFTER_BURN_MY
      : PROMO_PROFILE_FAILED_AFTER_BURN_EN;
  }
  return null;
}

export interface PromoRedeemOps {
  /** Marks the code used (safeUpdateDoc on activationCodes/{code}). */
  burnCode: () => Promise<boolean>;
  /** Writes the premium profile (safeSetDoc merge on users/{uid}). */
  writeProfile: () => Promise<boolean>;
}

/**
 * Runs a code redeem in the order firestore.rules requires: burn FIRST,
 * profile SECOND. With the code already used-by-me, rules Path B passes
 * at profile-write time.
 *
 * - Burn fails → the profile write is NEVER attempted (returns
 *   'burnFailed'); nothing was activated and the code was not consumed
 *   by us.
 * - Profile fails after a successful burn → returns
 *   'profileFailedAfterBurn'; the code IS spent, so the caller must say
 *   so honestly (ask Admin for a new code) instead of pretending the
 *   code can still be redeemed.
 * A thrown error (network/timeout) propagates to the caller, whose
 * catch shows the generic verification error — same as before.
 */
export async function redeemPromoCodeInOrder(
  ops: PromoRedeemOps,
): Promise<PromoRedeemOutcome> {
  const burnOk = await ops.burnCode();
  if (!burnOk) {
    return { status: 'burnFailed' };
  }
  const profileOk = await ops.writeProfile();
  if (!profileOk) {
    return { status: 'profileFailedAfterBurn' };
  }
  return { status: 'success' };
}
