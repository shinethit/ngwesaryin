import React, { useState } from 'react';
import { Crown, X } from 'lucide-react';
import { safeGetItem, safeSetItem } from '../utils/storage';

import { PlanType } from '../types';

interface AdBannerProps {
  plan: PlanType;
  lang?: 'my' | 'en';
  slot?: 'dashboard-bottom' | 'inline-compact' | 'footer-banner';
  onOpenUpgradeModal?: () => void;
  className?: string;
}

// [v7.5.60 G-N2] The old fake "KBZPay / WavePay / SME" sample ads are
// gone — they linked out of the app to sites the user never asked
// for, and the "how to monetize" guide was developer docs shown to
// end users. With no real ad network wired up, the slot shows a
// small honest Premium card instead. Dismissal is remembered for
// 7 days (device-global key, same pattern as the PWA banner).
const AD_DISMISSED_KEY = 'ad_banner_dismissed_time';
const DISMISS_DAYS = 7;

export const AdBanner: React.FC<AdBannerProps> = ({
  plan,
  lang = 'my',
  slot = 'inline-compact',
  onOpenUpgradeModal,
  className = '',
}) => {
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    try {
      const t = safeGetItem(AD_DISMISSED_KEY);
      return !!t && Date.now() - Number(t) < DISMISS_DAYS * 24 * 60 * 60 * 1000;
    } catch {
      return false;
    }
  });

  // If user is on Premium plan, NEVER show any ads!
  // Without an upgrade handler there is nothing honest to show either.
  if (plan === 'premium' || isDismissed || !onOpenUpgradeModal) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      safeSetItem(AD_DISMISSED_KEY, Date.now().toString());
    } catch {
      // Dismissal just won't persist — banner returns next launch.
    }
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50 via-white to-amber-50 shadow-2xs ${className}`}
      id={`ad-unit-${slot}`}
    >
      <div className="p-3 sm:p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Crown className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-xs sm:text-sm text-slate-900 leading-tight truncate">
              {lang === 'my' ? 'ကြော်ငြာကင်းစင်စွာ သုံးမည်' : 'Go ad-free with Premium'}
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
              {lang === 'my'
                ? 'Premium သို့ မြှင့်ပါ — ကြော်ငြာများ ဖယ်ရှားပြီး လုပ်ဆောင်ချက် အပြည့်အစုံ ရယူပါ'
                : 'Upgrade to Premium to remove ads and unlock every feature'}
            </p>
          </div>
        </div>

        {/* [v7.5.68 R4] Wider icon/text gap so the crown never crowds "ကြော်ငြာ". */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenUpgradeModal}
            className="inline-flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-2xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <Crown className="w-3.5 h-3.5 shrink-0 text-amber-400" />
            <span>
              {lang === 'my' ? 'ကြော်ငြာဖယ်ရှားရန် (၂,၀၀၀ Ks/လ)' : 'Remove Ads (2,000 Ks/mo)'}
            </span>
          </button>

          {/* [v7.5.60 G-N1] Dismiss target is 32px+ (was a 16px X). */}
          <button
            type="button"
            onClick={handleDismiss}
            className="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            title={lang === 'my' ? 'ခေတ္တပိတ်မည်' : 'Dismiss'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
