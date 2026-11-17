// [v7.5.92] Unit tests for the Premium activation pure helpers
// (src/utils/premiumActivation.ts). No Firebase, no network, no emulator:
// the helpers are pure, and both call sites (AuthContext.claimFreeTrial
// and PremiumModal.handleApplyPromo) call them directly, so these tests
// pin the real code paths.
import { describe, it, expect, vi } from 'vitest';

import {
  PROMO_BURN_FAILED_EN,
  PROMO_BURN_FAILED_MY,
  PROMO_PROFILE_FAILED_AFTER_BURN_EN,
  PROMO_PROFILE_FAILED_AFTER_BURN_MY,
  buildTrialProfileUpdate,
  computePromoExpiry,
  promoRedeemErrorMessage,
  redeemPromoCodeInOrder,
} from '../premiumActivation';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW_MS = new Date('2026-11-17T12:00:00.000Z').getTime();
const NOW_ISO = new Date(NOW_MS).toISOString();

describe('buildTrialProfileUpdate (F1 — trial write payload)', () => {
  it('includes premiumCodeUsed: null (rules Path A reads this field directly)', () => {
    const payload = buildTrialProfileUpdate({
      plan: 'free',
      premiumExpiresAt: null,
      premiumMonths: null,
      nowIso: NOW_ISO,
      nowMs: NOW_MS,
      rawCreatedAt: '2026-11-10T00:00:00.000Z',
    });
    expect('premiumCodeUsed' in payload).toBe(true);
    expect(payload.premiumCodeUsed).toBeNull();
  });

  it('pins the full payload shape for a fresh account', () => {
    expect(
      buildTrialProfileUpdate({
        plan: 'free',
        premiumExpiresAt: null,
        premiumMonths: null,
        nowIso: NOW_ISO,
        nowMs: NOW_MS,
        rawCreatedAt: '2026-11-10T00:00:00.000Z',
      }),
    ).toEqual({
      plan: 'premium',
      premiumExpiresAt: new Date(NOW_MS + 90 * DAY_MS).toISOString(),
      premiumActivatedAt: NOW_ISO,
      premiumMonths: 3,
      premiumCodeUsed: null,
      trialClaimed: true,
      trialClaimedAt: NOW_ISO,
      accountCreatedAt: '2026-11-10T00:00:00.000Z',
    });
  });

  it('regression: the pre-7.5.92 payload shape (no premiumCodeUsed key) FAILS the pin above', () => {
    // The old claimFreeTrial payload had no premiumCodeUsed field at all.
    // This is the shape the old code wrote — assert it does NOT satisfy
    // the requirement, so the pin test would have caught the old code.
    const oldShape = {
      plan: 'premium',
      premiumExpiresAt: new Date(NOW_MS + 90 * DAY_MS).toISOString(),
      premiumActivatedAt: NOW_ISO,
      premiumMonths: 3,
      trialClaimed: true,
      trialClaimedAt: NOW_ISO,
      accountCreatedAt: '2026-11-10T00:00:00.000Z',
    };
    expect('premiumCodeUsed' in oldShape).toBe(false);
    expect(oldShape).not.toEqual(
      expect.objectContaining({ premiumCodeUsed: null }),
    );
  });

  it('stacks +3 months onto existing premiumMonths', () => {
    const payload = buildTrialProfileUpdate({
      plan: 'premium',
      premiumExpiresAt: new Date(NOW_MS + 10 * DAY_MS).toISOString(),
      premiumMonths: 6,
      nowIso: NOW_ISO,
      nowMs: NOW_MS,
      rawCreatedAt: '2026-10-01T00:00:00.000Z',
    });
    expect(payload.premiumMonths).toBe(9);
    expect(payload.premiumCodeUsed).toBeNull();
  });

  it('stacks +90 days onto a still-valid premium expiry', () => {
    const currentExp = new Date(NOW_MS + 10 * DAY_MS).toISOString();
    const payload = buildTrialProfileUpdate({
      plan: 'premium',
      premiumExpiresAt: currentExp,
      premiumMonths: 1,
      nowIso: NOW_ISO,
      nowMs: NOW_MS,
      rawCreatedAt: '2026-10-01T00:00:00.000Z',
    });
    expect(payload.premiumExpiresAt).toBe(
      new Date(NOW_MS + 100 * DAY_MS).toISOString(),
    );
  });

  it('uses now + 90 days when the premium expiry has already passed', () => {
    const payload = buildTrialProfileUpdate({
      plan: 'premium',
      premiumExpiresAt: new Date(NOW_MS - 5 * DAY_MS).toISOString(),
      premiumMonths: 3,
      nowIso: NOW_ISO,
      nowMs: NOW_MS,
      rawCreatedAt: '2026-10-01T00:00:00.000Z',
    });
    expect(payload.premiumExpiresAt).toBe(
      new Date(NOW_MS + 90 * DAY_MS).toISOString(),
    );
  });
});

describe('computePromoExpiry (F2 — months / lifetime / stacking math, unchanged)', () => {
  it('adds months * 30 days from now when there is no current expiry', () => {
    const { months, isLifetime, expiresAt } = computePromoExpiry({
      months: 6,
      currentPremiumExpiresAt: null,
      nowMs: NOW_MS,
    });
    expect(months).toBe(6);
    expect(isLifetime).toBe(false);
    expect(expiresAt).toBe(new Date(NOW_MS + 6 * 30 * DAY_MS).toISOString());
  });

  it('stacks onto a still-valid current expiry (max(now, current))', () => {
    const { expiresAt } = computePromoExpiry({
      months: 1,
      currentPremiumExpiresAt: new Date(NOW_MS + 20 * DAY_MS).toISOString(),
      nowMs: NOW_MS,
    });
    expect(expiresAt).toBe(new Date(NOW_MS + 50 * DAY_MS).toISOString());
  });

  it('uses now as the base when the current expiry has passed', () => {
    const { expiresAt } = computePromoExpiry({
      months: 1,
      currentPremiumExpiresAt: new Date(NOW_MS - DAY_MS).toISOString(),
      nowMs: NOW_MS,
    });
    expect(expiresAt).toBe(new Date(NOW_MS + 30 * DAY_MS).toISOString());
  });

  it('treats months >= 900 as lifetime (+100 years)', () => {
    const { isLifetime, expiresAt } = computePromoExpiry({
      months: 999,
      currentPremiumExpiresAt: null,
      nowMs: NOW_MS,
    });
    expect(isLifetime).toBe(true);
    expect(expiresAt).toBe(
      new Date(NOW_MS + 100 * 365.25 * 24 * 60 * 60 * 1000).toISOString(),
    );
  });
});

describe('redeemPromoCodeInOrder (F2 — burn FIRST, profile SECOND)', () => {
  it('burn failure stops BEFORE any profile write', async () => {
    const calls: string[] = [];
    const burnCode = vi.fn(async () => {
      calls.push('burn');
      return false;
    });
    const writeProfile = vi.fn(async () => {
      calls.push('profile');
      return true;
    });

    const outcome = await redeemPromoCodeInOrder({ burnCode, writeProfile });

    expect(outcome).toEqual({ status: 'burnFailed' });
    expect(burnCode).toHaveBeenCalledTimes(1);
    expect(writeProfile).not.toHaveBeenCalled();
    expect(calls).toEqual(['burn']);
  });

  it('profile failure AFTER a successful burn yields the honest error outcome', async () => {
    const calls: string[] = [];
    const burnCode = vi.fn(async () => {
      calls.push('burn');
      return true;
    });
    const writeProfile = vi.fn(async () => {
      calls.push('profile');
      return false;
    });

    const outcome = await redeemPromoCodeInOrder({ burnCode, writeProfile });

    expect(outcome).toEqual({ status: 'profileFailedAfterBurn' });
    expect(calls).toEqual(['burn', 'profile']);
  });

  it('success calls burn first, then profile, in that order', async () => {
    const calls: string[] = [];
    const outcome = await redeemPromoCodeInOrder({
      burnCode: vi.fn(async () => {
        calls.push('burn');
        return true;
      }),
      writeProfile: vi.fn(async () => {
        calls.push('profile');
        return true;
      }),
    });

    expect(outcome).toEqual({ status: 'success' });
    expect(calls).toEqual(['burn', 'profile']);
  });

  it('a thrown burn error propagates (handler catch shows the generic verification error)', async () => {
    await expect(
      redeemPromoCodeInOrder({
        burnCode: async () => {
          throw new Error('network down');
        },
        writeProfile: vi.fn(async () => true),
      }),
    ).rejects.toThrow('network down');
  });
});

describe('promoRedeemErrorMessage (F2 — exact user-facing strings)', () => {
  it('burn failure message is the exact approved Burmese + English', () => {
    expect(promoRedeemErrorMessage({ status: 'burnFailed' }, 'my')).toBe(
      'ကုဒ်ကို သုံးလို့မရပါ — သုံးပြီးသား (သို့) သက်တမ်းကုန်တဲ့ ကုတ်ဖြစ်နိုင်ပါတယ်။ ကုတ်ကို သေချာစစ်ပြီး ပြန်ကြိုးစားပါ',
    );
    expect(promoRedeemErrorMessage({ status: 'burnFailed' }, 'en')).toBe(
      'This code could not be used — it may already be redeemed or expired. Please check the code and try again.',
    );
    expect(PROMO_BURN_FAILED_MY).toBe(
      'ကုဒ်ကို သုံးလို့မရပါ — သုံးပြီးသား (သို့) သက်တမ်းကုန်တဲ့ ကုတ်ဖြစ်နိုင်ပါတယ်။ ကုတ်ကို သေချာစစ်ပြီး ပြန်ကြိုးစားပါ',
    );
    expect(PROMO_BURN_FAILED_EN).toBe(
      'This code could not be used — it may already be redeemed or expired. Please check the code and try again.',
    );
  });

  it('profile failure after burn message is the exact approved Burmese + English', () => {
    expect(
      promoRedeemErrorMessage({ status: 'profileFailedAfterBurn' }, 'my'),
    ).toBe(
      'ကုဒ်ကို သုံးပြီးသွားပါပြီ၊ ဒါပေမဲ့ Premium ဖွင့်၍ မရပါ — Admin ကို ဆက်သွယ်ပြီး ကုတ်အသစ် တောင်းပါ',
    );
    expect(
      promoRedeemErrorMessage({ status: 'profileFailedAfterBurn' }, 'en'),
    ).toBe(
      'The code was used, but Premium could not be activated — please contact Admin for a new code.',
    );
    expect(PROMO_PROFILE_FAILED_AFTER_BURN_MY).toBe(
      'ကုဒ်ကို သုံးပြီးသွားပါပြီ၊ ဒါပေမဲ့ Premium ဖွင့်၍ မရပါ — Admin ကို ဆက်သွယ်ပြီး ကုတ်အသစ် တောင်းပါ',
    );
    expect(PROMO_PROFILE_FAILED_AFTER_BURN_EN).toBe(
      'The code was used, but Premium could not be activated — please contact Admin for a new code.',
    );
  });

  it('success has no error message', () => {
    expect(promoRedeemErrorMessage({ status: 'success' }, 'my')).toBeNull();
    expect(promoRedeemErrorMessage({ status: 'success' }, 'en')).toBeNull();
  });
});
