import React from 'react';
import { Crown, Sparkles, ArrowRight, Clock, Gift } from 'lucide-react';
import { PlanType } from '../types';
import { useAuth } from '../context/AuthContext';
import { safeGetItem } from '../utils/storage';

interface PlanBannerProps {
  plan: PlanType;
  transactionsCount: number;
  maxTransactions: number;
  debtsCount: number;
  maxDebts: number;
  onOpenUpgrade: () => void;
  lang: 'my' | 'en';
}

export const PlanBanner: React.FC<PlanBannerProps> = ({
  plan,
  transactionsCount,
  maxTransactions,
  debtsCount,
  maxDebts,
  onOpenUpgrade,
  lang,
}) => {
  const { user, userProfile } = useAuth();
  const expiryIso = userProfile?.premiumExpiresAt || safeGetItem('ngwe_premium_expires_at');
  let daysLeft: number | null = null;
  if (expiryIso) {
    const diffMs = new Date(expiryIso).getTime() - Date.now();
    daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  // Account age for free trial check
  const userCreatedTime = user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime).getTime()
    : userProfile?.accountCreatedAt
    ? new Date(userProfile.accountCreatedAt).getTime()
    : null;
  const accountAgeDays = userCreatedTime
    ? Math.floor((Date.now() - userCreatedTime) / (1000 * 60 * 60 * 24))
    : 0;
  const isEligibleForTrial = !userProfile?.trialClaimed && accountAgeDays <= 30;

  if (plan === 'guest') {
    return (
      <div className="bg-slate-100 border-b border-slate-200 px-3 sm:px-4 py-2 text-xs w-full overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold px-2 py-0.5 rounded bg-slate-800 text-white text-[10px] uppercase tracking-wider">
              GUEST MODE
            </span>
            <span className="text-slate-600 text-xs">
              {lang === 'my'
                ? `၁ လ မှတ်တမ်း: ${transactionsCount}/30 ခု | Wallet ၁ ခု | စုငွေ၊ ဘတ်ဂျက်၊ အကြွေး (မရပါ)`
                : `Monthly: ${transactionsCount}/30 tx | 1 Wallet | Debts/Budgets locked`}
            </span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={onOpenUpgrade}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold text-amber-900 bg-amber-300 hover:bg-amber-400 transition-colors shadow-2xs cursor-pointer shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{lang === 'my' ? 'Free ဝင်မည် / Premium ရယူမည်' : 'Sign In / Upgrade'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (plan === 'premium') {
    return (
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-emerald-500/10 border-b border-amber-200/80 px-3 sm:px-6 py-2 text-xs w-full">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-wrap">
            <div className="flex items-center gap-1 text-amber-900 font-bold shrink-0">
              <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 fill-amber-500 shrink-0" />
              <span className="text-xs sm:text-sm">
                {lang === 'my'
                  ? 'Premium အကောင့်'
                  : 'Premium Plan'}
              </span>
            </div>

            {/* Remaining Days Badge */}
            {daysLeft !== null && (
              <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-emerald-100/90 text-emerald-800 border border-emerald-300 shadow-2xs shrink-0">
                <Clock className="w-3 h-3 text-emerald-700 shrink-0" />
                <span>
                  {daysLeft > 3650
                    ? (lang === 'my' ? 'တစ်သက်တာ (Lifetime)' : 'Lifetime Access')
                    : (lang === 'my' ? `လက်ကျန် ${daysLeft} ရက်` : `${daysLeft} Days Remaining`)}
                </span>
              </span>
            )}
          </div>

          <button
            onClick={onOpenUpgrade}
            className="text-[11px] sm:text-xs font-bold text-amber-800 hover:text-amber-950 underline decoration-amber-400/80 cursor-pointer shrink-0 whitespace-nowrap ml-2"
          >
            {lang === 'my' ? 'အသေးစိတ်ကြည့်ရန်' : 'View Details'}
          </button>
        </div>
      </div>
    );
  }

  const isNearLimit = transactionsCount >= maxTransactions - 5 || debtsCount >= maxDebts;

  return (
    <div
      className={`border-b px-3 sm:px-4 py-2 text-xs sm:text-sm w-full overflow-hidden ${
        isNearLimit
          ? 'bg-amber-50 border-amber-200 text-amber-900'
          : 'bg-slate-100/80 border-slate-200 text-slate-700'
      }`}
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold px-2 py-0.5 rounded bg-white text-slate-800 border border-slate-200 text-[11px] tracking-wide">
            FREE PLAN
          </span>
          <span className="text-slate-600 text-xs">
            {lang === 'my'
              ? `လစဉ်မှတ်တမ်း: ${transactionsCount}/${maxTransactions} ခု | အကြွေး: ${debtsCount}/${maxDebts} ခု`
              : `Monthly: ${transactionsCount}/${maxTransactions} | Debts: ${debtsCount}/${maxDebts}`}
          </span>
        </div>

        <div className="flex items-center gap-2.5 sm:self-auto self-end">
          <button
            id="banner-upgrade-click"
            onClick={onOpenUpgrade}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer shrink-0 ${
              isEligibleForTrial
                ? 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-amber-950 font-black shadow-amber-400/30'
                : 'text-amber-900 bg-amber-300 hover:bg-amber-400'
            }`}
          >
            {isEligibleForTrial ? (
              <>
                <Gift className="w-3.5 h-3.5 text-amber-950 fill-amber-950/20" />
                <span>{lang === 'my' ? '🎁 ၃ လ အခမဲ့ Premium ရယူမည်' : '🎁 Get 3 Months Free Trial'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>{lang === 'my' ? 'Premium သို့ အဆင့်မြှင့်မည်' : 'Upgrade to Premium'}</span>
              </>
            )}
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
