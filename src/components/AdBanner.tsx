import React, { useState } from 'react';
import { Sparkles, Crown, ExternalLink, Info, X } from 'lucide-react';

import { PlanType } from '../types';

interface AdBannerProps {
  plan: PlanType;
  lang?: 'my' | 'en';
  slot?: 'dashboard-bottom' | 'inline-compact' | 'footer-banner';
  onOpenUpgradeModal?: () => void;
  className?: string;
}

interface SponsorAd {
  id: string;
  brandMy: string;
  brandEn: string;
  taglineMy: string;
  taglineEn: string;
  categoryMy: string;
  categoryEn: string;
  badgeColor: string;
  actionTextMy: string;
  actionTextEn: string;
  link: string;
  iconBg: string;
  iconText: string;
}

// Subtle, realistic financial & local sponsor samples
const SAMPLE_ADS: SponsorAd[] = [
  {
    id: 'ad-kbz',
    brandMy: 'KBZPay Quick Pay',
    brandEn: 'KBZPay Quick Pay',
    taglineMy: 'ငွေလွှဲ၊ ငွေထုတ်နှင့် ဖုန်းဘေလ်ဖြည့်ခြင်းအတွက် အမြန်ဆုံးနှင့် အလွယ်ကူဆုံး',
    taglineEn: 'Fastest wallet transfers, cash-in/out and bill payments in Myanmar',
    categoryMy: 'မိုဘိုင်းငွေပေးချေမှု',
    categoryEn: 'Mobile Payment',
    badgeColor: 'bg-blue-600',
    actionTextMy: 'သုံးကြည့်ရန်',
    actionTextEn: 'Explore',
    link: 'https://www.kbzpay.com',
    iconBg: 'bg-blue-600',
    iconText: 'KP',
  },
  {
    id: 'ad-wave',
    brandMy: 'WavePay စမတ်ငွေစု',
    brandEn: 'WavePay Smart Savings',
    taglineMy: 'နေ့စဉ်အသုံးစရိတ်များကို စီမံပြီး လက်ကျန်ငွေအပေါ် အတိုးရယူလိုက်ပါ',
    taglineEn: 'Manage daily expenses and earn interest on your wallet balance',
    categoryMy: 'ငွေစုဘဏ်လုပ်ငန်း',
    categoryEn: 'Digital Banking',
    badgeColor: 'bg-amber-500',
    actionTextMy: 'လေ့လာရန်',
    actionTextEn: 'Learn More',
    link: 'https://www.wavemoney.com.mm',
    iconBg: 'bg-amber-500',
    iconText: 'WP',
  },
  {
    id: 'ad-cb',
    brandMy: 'SME စီးပွားရေး လုပ်ငန်းသုံး ချေးငွေ',
    brandEn: 'SME Business Financing',
    taglineMy: 'အသေးစားနှင့် အလတ်စား စီးပွားရေးလုပ်ငန်းများအတွက် အတိုးနှုန်းသက်သာသော အရင်းအနှီး',
    taglineEn: 'Low-interest working capital loans for small & medium businesses',
    categoryMy: 'စီးပွားရေး အရင်းအနှီး',
    categoryEn: 'Business Loan',
    badgeColor: 'bg-emerald-600',
    actionTextMy: 'အသေးစိတ်ကြည့်ရန်',
    actionTextEn: 'View Details',
    link: '#',
    iconBg: 'bg-emerald-600',
    iconText: 'SME',
  },
];

export const AdBanner: React.FC<AdBannerProps> = ({
  plan,
  lang = 'my',
  slot = 'inline-compact',
  onOpenUpgradeModal,
  className = '',
}) => {
  const [adIndex, setAdIndex] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showHowToMonetizeModal, setShowHowToMonetizeModal] = useState(false);

  // If user is on Premium plan, NEVER show any ads!
  if (plan === 'premium' || isDismissed) {
    return null;
  }

  const currentAd = SAMPLE_ADS[adIndex % SAMPLE_ADS.length];

  const handleNextAd = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAdIndex((prev) => (prev + 1) % SAMPLE_ADS.length);
  };

  return (
    <>
      <div
        className={`relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs transition-all hover:border-slate-300 ${className}`}
        id={`ad-unit-${slot}`}
      >
        {/* Subtle Top Indicator Bar */}
        <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-50/90 border-b border-slate-100 text-[10px] text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
              {lang === 'my' ? 'ကြော်ငြာ' : 'AD'}
            </span>
            <span className="text-slate-400 font-medium">
              {lang === 'my' ? currentAd.categoryMy : currentAd.categoryEn}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Guide on how to monetize */}
            <button
              type="button"
              onClick={() => setShowHowToMonetizeModal(true)}
              className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 hover:underline transition-colors"
              title={lang === 'my' ? 'ငွေရနိုင်သော Ads ချိတ်ဆက်နည်း' : 'How to connect real earning ads'}
            >
              <Info className="w-3 h-3" />
              <span>{lang === 'my' ? 'Ads ချိတ်ဆက်နည်း' : 'Monetization Info'}</span>
            </button>

            {/* Remove ads with Premium CTA */}
            {onOpenUpgradeModal && (
              <button
                type="button"
                onClick={onOpenUpgradeModal}
                className="text-amber-700 hover:text-amber-800 font-bold flex items-center gap-1 hover:underline transition-colors ml-1"
                title={lang === 'my' ? 'ကြော်ငြာများ ဖယ်ရှားရန် Premium သို့ မြှင့်ပါ' : 'Remove ads with Premium'}
              >
                <Crown className="w-3 h-3 text-amber-500" />
                <span className="hidden sm:inline">
                  {lang === 'my' ? 'ကြော်ငြာဖယ်ရှားရန် (၂,၀၀၀ Ks/လ)' : 'Remove Ads (2,000 Ks)'}
                </span>
                <span className="sm:hidden">
                  {lang === 'my' ? 'ကြော်ငြာဖယ်ရှား' : 'No Ads'}
                </span>
              </button>
            )}

            {/* Dismiss temporary */}
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="w-4 h-4 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
              title={lang === 'my' ? 'ခေတ္တပိတ်မည်' : 'Dismiss'}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Ad Body: Compact & Minimal */}
        <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Brand Logo/Icon */}
            <div
              className={`w-10 h-10 rounded-xl ${currentAd.iconBg} text-white flex items-center justify-center font-black text-xs shadow-xs shrink-0`}
            >
              {currentAd.iconText}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 leading-tight">
                  {lang === 'my' ? currentAd.brandMy : currentAd.brandEn}
                </h4>
                <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                  Sponsored
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 max-w-xl line-clamp-1 leading-snug">
                {lang === 'my' ? currentAd.taglineMy : currentAd.taglineEn}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              type="button"
              onClick={handleNextAd}
              className="px-2 py-1 text-[11px] text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              title="Next Ad sample"
            >
              {lang === 'my' ? 'နောက်တစ်ခု' : 'Next'}
            </button>

            <a
              href={currentAd.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-2xs transition-all active:scale-95"
            >
              <span>{lang === 'my' ? currentAd.actionTextMy : currentAd.actionTextEn}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Educational Modal: How real monetization ads work */}
      {showHowToMonetizeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col">
            <div className="p-5 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base">
                    {lang === 'my' ? 'ငွေရနိုင်သော Ads ချိတ်ဆက်နည်း လမ်းညွှန်' : 'How to Connect Earning Ads Guide'}
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    {lang === 'my' ? 'Web App တွင် ကြော်ငြာထည့်၍ ဝင်ငွေရှာနိုင်သည့် အဓိကနည်းလမ်းများ' : 'Monetization options for your app'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowHowToMonetizeModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-700">
              {/* Option 1: Google AdSense */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900 text-sm">၁။ Google AdSense (ဝဘ်ဆိုဒ်များအတွက် အသုံးအများဆုံး)</span>
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">Standard Web</span>
                </div>
                <p className="text-slate-600 mt-1 leading-relaxed">
                  Google AdSense (adsense.google.com) တွင် အခမဲ့ အကောင့်ဖွင့်ပြီး သင့် Domain (ဥပမာ- yourname.com) ကို ထည့်သွင်း အတည်ပြုချက် (Approval) ယူရပါမည်။ Approval ရပါက Google က ထုတ်ပေးသော Ad Client Script Tag ကို index.html တွင် ထည့်သွင်းရုံဖြင့် ကြော်ငြာများ အလိုအလျောက်ပေါ်လာပြီး ကြည့်ရှုသူ/နှိပ်သူအလိုက် ဒေါ်လာဖြင့် ဝင်ငွေရရှိမည်ဖြစ်ပါသည်။
                </p>
              </div>

              {/* Option 2: Direct Local Sponsors */}
              <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-amber-950 text-sm">၂။ Direct Sponsor / ပြည်တွင်း စီးပွားရေးလုပ်ငန်းများနှင့် ချိတ်ဆက်ခြင်း</span>
                  <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-900 text-[10px] font-bold">အသင့်တော်ဆုံး</span>
                </div>
                <p className="text-amber-900/90 mt-1 leading-relaxed">
                  မြန်မာပြည်တွင်း အသုံးပြုသူများအတွက် အထိရောက်ဆုံးနည်းလမ်းဖြစ်ပါသည်။ ကုန်ပစ္စည်းအရောင်းဆိုင်များ၊ ဘဏ်များ၊ အွန်လိုင်းဆိုင်များ သို့မဟုတ် သင်တန်းကျောင်းများနှင့် တိုက်ရိုက်ဆက်သွယ်ပြီး သင့် App ၏ Banner နေရာတွင် သူတို့၏ ကြော်ငြာကို လစဉ်ကြေး (ဥပမာ- ၁ လ ၃ သောင်း / ၅ သောင်း ကျပ်) ဖြင့် ကပ်ပေးနိုင်ပါသည်။
                </p>
              </div>

              {/* Option 3: Affiliate Marketing */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900 text-sm">၃။ Affiliate Marketing (ကော်မရှင်စား ချိတ်ဆက်ခြင်း)</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">Commission</span>
                </div>
                <p className="text-slate-600 mt-1 leading-relaxed">
                  အွန်လိုင်းစျေးဝယ်ပလက်ဖောင်းများ သို့မဟုတ် Financial Software များ၏ Referral Link များကို Ad Banner တွင် ထည့်သွင်းထားပြီး အသုံးပြုသူများ ၎င်း Link မှတစ်ဆင့် ဝယ်ယူ/စာရင်းသွင်းပါက ကော်မရှင် % ရရှိမည်ဖြစ်ပါသည်။
                </p>
              </div>

              {/* Option 4: Google AdMob (For Mobile App) */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900 text-sm">၄။ Google AdMob (Android / iOS App အဖြစ် ထုတ်လုပ်ပါက)</span>
                  <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">Mobile App</span>
                </div>
                <p className="text-slate-600 mt-1 leading-relaxed">
                  အကယ်၍ နောင်တွင် ဤစနစ်ကို Play Store ပေါ်တွင် Android APK အဖြစ် တင်ပါက Google AdMob SDK ဖြင့် ချိတ်ဆက်ပြီး Banner Ads, Interstitial Ads (မျက်နှာပြင်ပြည့်) သို့မဟုတ် Reward Ads များကို ထည့်သွင်းနိုင်ပါသည်။
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowHowToMonetizeModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white"
              >
                {lang === 'my' ? 'နားလည်ပါပြီ' : 'Got it'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
