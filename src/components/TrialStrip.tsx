// [v7.5.98] Slim trial strip at the top of Home: a first-time visitor
// sees the 3-month free Premium offer the moment they arrive, and one
// tap opens the Premium modal (via the same onOpenUpgrade path every
// other upgrade trigger uses). Whole strip is ONE <button>, >=44px
// tall, no dismiss button, no auto-open, no popup. Renders null
// (no empty box, no layout shift) for Premium plan, claimed trials,
// and accounts older than 30 days. Eligibility uses the exact
// PremiumModal formula via getTrialEligibility.
import React from 'react';
import { Gift } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getTrialEligibility } from '../utils/premiumActivation';
import type { PlanType } from '../types';

interface TrialStripProps {
  plan: PlanType;
  lang: 'my' | 'en';
  onOpenUpgrade: () => void;
}

export const TrialStrip: React.FC<TrialStripProps> = ({
  plan,
  lang,
  onOpenUpgrade,
}) => {
  const { user, userProfile } = useAuth();

  if (plan === 'premium') return null;

  if (!user) {
    return (
      <button
        type="button"
        onClick={onOpenUpgrade}
        className="w-full min-h-[44px] flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm active:scale-[0.99] transition-transform cursor-pointer"
      >
        <Gift className="w-4 h-4 shrink-0" />
        <span className="min-w-0 text-xs sm:text-sm font-bold leading-snug text-center">
          {lang === 'my'
            ? '🎁 အကောင့်သစ်များ Premium ၃ လ အခမဲ့ — အကောင့်ဖွင့်ပြီး ရယူပါ ›'
            : '🎁 New accounts get 3 months of Premium FREE — sign in to claim ›'}
        </span>
      </button>
    );
  }

  const { trialDaysLeft, isEligible } = getTrialEligibility({
    creationTime: user.metadata?.creationTime ?? null,
    accountCreatedAt: userProfile?.accountCreatedAt ?? null,
    trialClaimed: !!userProfile?.trialClaimed,
  });

  if (!isEligible) return null;

  return (
    <button
      type="button"
      onClick={onOpenUpgrade}
      className="w-full min-h-[44px] flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm active:scale-[0.99] transition-transform cursor-pointer"
    >
      <Gift className="w-4 h-4 shrink-0" />
      <span className="min-w-0 text-xs sm:text-sm font-bold leading-snug text-center">
        {lang === 'my'
          ? `🎁 ၃ လ အခမဲ့ Premium ရယူမည် — ${trialDaysLeft} ရက် လက်ကျန် ›`
          : `🎁 Claim 3 months of Premium FREE — ${trialDaysLeft} days left ›`}
      </span>
    </button>
  );
};
