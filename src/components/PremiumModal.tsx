import React, { useState, useEffect } from 'react';
import { safeGetItem, safeSetItem } from '../utils/storage';
import { Crown, Check, X, Sparkles, ShieldCheck, ExternalLink, LogIn, KeyRound, CreditCard, ListCheck, Calendar, Clock, Phone, Gift, Timer, AlertCircle, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { PlanType, ContactInfo } from '../types';
import { fetchContactInfo, DEFAULT_CONTACT_INFO } from '../lib/contactInfo';
import { getDoc, doc } from 'firebase/firestore';
import { db, safeUpdateDoc, safeSetDoc } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_PLAN_LIMITS } from '../data/initialData';
import { toMyanmarDigits } from '../utils/myanmarDigits';

interface PremiumModalProps {
  currentPlan: PlanType;
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan: (plan: PlanType) => void;
  lang: 'my' | 'en';
  onOpenLogin?: () => void;
  // [v7.5.68] Shown ONLY when the modal opened because the Free
  // transaction limit was reached — explains why it opened.
  showTxLimitNotice?: boolean;
}

export const PremiumModal: React.FC<PremiumModalProps> = ({
  currentPlan,
  isOpen,
  onClose,
  onSelectPlan,
  lang,
  onOpenLogin,
  showTxLimitNotice,
}) => {
  const [activeTab, setActiveTab] = useState<'code' | 'payment' | 'features'>('code');
  const [planDuration, setPlanDuration] = useState<'1' | '2' | '3' | '6' | '12'>('6');
  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
  const [contactInfo, setContactInfo] = useState<ContactInfo>(DEFAULT_CONTACT_INFO);

  // Free Trial State
  const [isClaimingTrial, setIsClaimingTrial] = useState(false);
  const [trialError, setTrialError] = useState('');
  const [trialSuccess, setTrialSuccess] = useState('');

  const { user, userProfile, refreshUserProfile, claimFreeTrial } = useAuth();

  useEffect(() => {
    if (isOpen) {
      fetchContactInfo().then((info) => { if (info) setContactInfo(info); }).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Calculate Days Left
  const expiryIso = userProfile?.premiumExpiresAt || safeGetItem('ngwe_premium_expires_at');
  let daysLeft: number | null = null;
  if (expiryIso) {
    const diffMs = new Date(expiryIso).getTime() - Date.now();
    daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  // Account creation & 3-month free trial eligibility (within 30 days of registration)
  const userCreatedTime = user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime).getTime()
    : userProfile?.accountCreatedAt
    ? new Date(userProfile.accountCreatedAt).getTime()
    : null;
  const accountAgeDays = userCreatedTime
    ? Math.floor((Date.now() - userCreatedTime) / (1000 * 60 * 60 * 24))
    : 0;
  const trialDaysLeft = Math.max(0, 30 - accountAgeDays);
  const isTrialClaimed = !!userProfile?.trialClaimed;
  const isEligibleForTrial = !isTrialClaimed && accountAgeDays <= 30;

  const handleClaimTrial = async () => {
    if (!user) {
      if (onOpenLogin) {
        onClose();
        onOpenLogin();
      }
      return;
    }

    setIsClaimingTrial(true);
    setTrialError('');
    setTrialSuccess('');

    try {
      const res = await claimFreeTrial();
      if (res.success) {
        setTrialSuccess(
          lang === 'my'
            ? '🎉 ဂုဏ်ယူပါသည်! ၃ လ အခမဲ့ Premium အောင်မြင်စွာ ရရှိပြီးပါပြီ!'
            : '🎉 Congratulations! 3 Months Free Premium trial activated successfully!'
        );
        confetti({
          particleCount: 150,
          spread: 90,
          origin: { y: 0.55 },
        });
        setTimeout(() => {
          onSelectPlan('premium');
          onClose();
        }, 1500);
      } else {
        setTrialError(
          res.error ||
            (lang === 'my'
              ? 'အခမဲ့ စမ်းသပ်ခွင့် ရယူရာတွင် အမှားအယွင်း ဖြစ်ပေါ်ခဲ့သည်'
              : 'Failed to claim trial')
        );
      }
    } catch (err: any) {
      setTrialError(err.message || 'Error claiming trial');
    } finally {
      setIsClaimingTrial(false);
    }
  };

  const PRICING = {
    '1': { price: '2,000', original: null, my: '၁ လ', en: '1 Month' },
    '2': { price: '4,000', original: null, my: '၂ လ', en: '2 Months' },
    '3': { price: '5,500', original: '6,000', my: '၃ လ', en: '3 Months' },
    '6': { price: '10,000', original: '12,000', my: '၆ လ', en: '6 Months' },
    '12': { price: '20,000', original: '24,000', my: '၁၂ လ', en: '12 Months' },
  };

  // [v7.5.55 E12] Copy only shows "Copied" when the write really
  // succeeded; falls back to a textarea + execCommand, and alerts on failure.
  const copyToClipboard = async (text: string, type: string) => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand('copy');
        document.body.removeChild(ta);
      } catch { ok = false; }
    }
    if (ok) {
      setCopiedAccount(type);
      setTimeout(() => setCopiedAccount(null), 2000);
    } else {
      alert(lang === 'my' ? 'ကူးယူ၍ မရပါ — နံပါတ်ကို လက်ဖြင့် ရွေးပြီး ကူးပါ' : 'Copy failed — please select and copy the number manually');
    }
  };

  const handleApplyPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = promoCode.trim().toUpperCase();
    if (!cleanCode) {
      setPromoError(lang === 'my' ? 'ကျေးဇူးပြု၍ Activation Code ထည့်သွင်းပါ' : 'Please enter an Activation Code');
      return;
    }

    if (!user) {
      setPromoError(
        lang === 'my'
          ? 'Activation Code အတည်ပြုရန် ကျေးဇူးပြု၍ အကောင့် အရင်ဝင်ပါ'
          : 'Please sign in first to verify activation code'
      );
      return;
    }

    setIsVerifying(true);
    setPromoError('');
    setPromoSuccess('');

    try {
      const codeRef = doc(db, 'activationCodes', cleanCode);
      const codeSnap = await getDoc(codeRef);

      if (!codeSnap.exists()) {
        setPromoError(
          lang === 'my'
            ? 'ကုဒ်မမှန်ကန်ပါ။ Admin ထံမှ ရရှိသော Activation Code ကို သေချာစွာ စစ်ဆေးထည့်ပါ။'
            : 'Invalid Activation Code. Please check the code received from Admin.'
        );
      } else {
        const codeData = codeSnap.data();
        if (codeData.isUsed) {
          setPromoError(
            lang === 'my'
              ? 'ဤကုဒ်ကို အသုံးပြုပြီး ဖြစ်ပါသည် (Code already used)'
              : 'This activation code has already been redeemed.'
          );
        } else if (codeData.expiresAt && new Date(codeData.expiresAt).getTime() < Date.now()) {
          // [v7.5.55 E6/E30] Expired activation code — reject, do not burn.
          setPromoError(
            lang === 'my'
              ? 'ဤကုဒ်သည် သက်တမ်းကုန်ဆုံးသွားပါပြီ။ Admin ထံမှ ကုဒ်အသစ် တောင်းယူပါ'
              : 'This activation code has expired. Please request a new code from Admin.'
          );
        } else {
          // [v7.5.55 E6] Write ORDER matters: the profile write goes
          // FIRST and its boolean return is checked; the code is marked
          // used ONLY after the profile write succeeds. Burning the code
          // first used to lose the code (and the renewal) when the
          // profile write was rejected — e.g. canUpgradePremium() in
          // Firestore rules rejects a premium user, so a renewal burned
          // the code and granted nothing.
          const months = Number(codeData.months) || 1;
          const isLifetime = months >= 900;
          const now = new Date();
          // Renewals STACK onto the existing expiry (max(now, current)).
          const currentExpMs = userProfile?.premiumExpiresAt ? new Date(userProfile.premiumExpiresAt).getTime() : NaN;
          const baseMs = !isNaN(currentExpMs) && currentExpMs > now.getTime() ? currentExpMs : now.getTime();
          const expiresAt = isLifetime
            ? new Date(baseMs + 100 * 365.25 * 24 * 60 * 60 * 1000).toISOString()
            : new Date(baseMs + months * 30 * 24 * 60 * 60 * 1000).toISOString();

          const userRef = doc(db, 'users', user.uid);
          const profileOk = await safeSetDoc(userRef, {
            plan: 'premium',
            premiumActivatedAt: now.toISOString(),
            premiumExpiresAt: expiresAt,
            premiumMonths: months,
            premiumCodeUsed: cleanCode,
            email: user.email || '',
            displayName: user.displayName || '',
            updatedAt: now.toISOString(),
          }, { merge: true });
          if (!profileOk) {
            setPromoError(
              lang === 'my'
                ? 'Premium ဖွင့်၍ မရပါ — ကုဒ်ကို မသုံးသေးပါ (ထပ်ကြိုးစားနိုင်ပါသည်)။ အင်တာနက်/ခွင့်ပြုချက်ကို စစ်ဆေးပါ'
                : 'Could not activate Premium — the code was NOT used, please try again. Check connection / permissions.'
            );
            return;
          }

          const codeOk = await safeUpdateDoc(codeRef, {
            isUsed: true,
            usedBy: user.uid,
            usedEmail: user.email || '',
            usedAt: now.toISOString(),
          });
          if (!codeOk) {
            // Profile is already premium; the code was NOT burned, so
            // it can still be redeemed. Tell the user honestly instead
            // of pretending everything worked.
            setPromoError(
              lang === 'my'
                ? 'Premium ဖွင့်ပြီးသော်လည်း ကုဒ်ကို အသုံးပြုပြီးအဖြစ် မှတ်သား၍ မရပါ — Admin ကို ဆက်သွယ်ပါ (ကုဒ်သည် ထပ်သုံးနိုင်သေးသည်)'
                : 'Premium was activated, but the code could not be marked as used — please contact Admin (the code can still be redeemed).'
            );
            if (refreshUserProfile) await refreshUserProfile();
            return;
          }

          // Cache locally
          safeSetItem('ngwe_plan', 'premium');
          safeSetItem('ngwe_premium_expires_at', expiresAt);
          if (refreshUserProfile) {
            await refreshUserProfile();
          }

          setPromoSuccess(
            lang === 'my'
              ? isLifetime
                ? '✨ ကုဒ်မှန်ကန်ပါသည်။ Premium ဝန်ဆောင်မှု (တစ်သက်တာ - Lifetime) အောင်မြင်စွာ ရရှိပြီးပါပြီ!'
                : `✨ ကုဒ်မှန်ကန်ပါသည်။ Premium ဝန်ဆောင်မှု (${months} လ) အောင်မြင်စွာ ရရှိပြီးပါပြီ!`
              : isLifetime
                ? '✨ Code verified! Lifetime Premium membership activated successfully!'
                : `✨ Code verified! Premium membership (${months} Months) activated successfully!`
          );

          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 },
          });

          setTimeout(() => {
            onSelectPlan('premium');
            onClose();
          }, 1200);
        }
      }
    } catch (err: any) {
      console.error('Error verifying code', err);
      setPromoError(
        lang === 'my'
          ? 'ကုဒ်စစ်ဆေးရာတွင် အင်တာနက် သို့မဟုတ် အမှားအယွင်း ဖြစ်ပေါ်ခဲ့ပါသည်: ' + (err.message || '')
          : 'Network or verification error: ' + (err.message || '')
      );
    } finally {
      setIsVerifying(false);
    }
  };

  // [v7.5.55 E7] Free-column numbers come from the limits table
  // (DEFAULT_PLAN_LIMITS.free) — never hardcoded here.
  const freeLimits = DEFAULT_PLAN_LIMITS.free;
  const features = [
    {
      titleMy: 'ဝင်ငွေ/ထွက်ငွေ မှတ်တမ်း',
      titleEn: 'Transactions Recording',
      free: lang === 'my' ? `တစ်လ အတွင်း ${toMyanmarDigits(freeLimits.maxTransactions)} ခု` : `${freeLimits.maxTransactions} per calendar month`,
      premium: lang === 'my' ? 'အကန့်အသတ်မရှိ (Unlimited)' : 'Unlimited',
    },
    {
      titleMy: 'အကြွေးစာရင်း (ပေးရန်/ရရန်)',
      titleEn: 'Debt & Loan Tracking',
      free: lang === 'my' ? `အများဆုံး ${toMyanmarDigits(freeLimits.maxDebts)} ခု` : `Up to ${freeLimits.maxDebts} active`,
      premium: lang === 'my' ? 'အကန့်အသတ်မရှိ + အရစ်ကျမှတ်တမ်း' : 'Unlimited + Installments',
    },
    {
      titleMy: 'ပိုက်ဆံအိတ်နှင့် ဘဏ်အကောင့်များ',
      titleEn: 'Wallets & Bank Accounts',
      free: lang === 'my' ? `${toMyanmarDigits(freeLimits.maxWallets)} ခု အထိ` : `Up to ${freeLimits.maxWallets} accounts`,
      premium: lang === 'my' ? 'စိတ်ကြိုက် အကန့်အသတ်မဲ့' : 'Unlimited accounts',
    },
    {
      titleMy: 'ဘတ်ဂျက်နှင့် ကဏ္ဍခွဲများ',
      titleEn: 'Custom Categories & Sub-categories',
      free: lang === 'my' ? `ဘတ်ဂျက် ကဏ္ဍ ${toMyanmarDigits(freeLimits.maxBudgetCategories)} ခု၊ စိတ်ကြိုက်ကဏ္ဍ မပါ` : `Budgets: ${freeLimits.maxBudgetCategories} categories, no custom categories`,
      premium: lang === 'my' ? 'စိတ်ကြိုက်ကဏ္ဍ/ကဏ္ဍခွဲ ထပ်တိုးနိုင်' : 'Unlimited custom categories',
    },
    {
      titleMy: 'Excel / CSV ထုတ်ယူသိမ်းဆည်းခြင်း',
      titleEn: 'Excel / CSV Export',
      free: false,
      premium: true,
    },
    {
      titleMy: 'အဖွဲ့ဝင်/မိသားစု တွဲဖက်သုံးစွဲခြင်း (Collaborators)',
      titleEn: 'Collaborators / Workspace Sharing',
      free: lang === 'my' ? `${toMyanmarDigits(freeLimits.maxCollaborators)} ယောက် အထိ` : `Up to ${freeLimits.maxCollaborators} members`,
      premium: lang === 'my' ? 'စိတ်ကြိုက် အကန့်အသတ်မဲ့' : 'Unlimited members',
    },
    {
      titleMy: 'အဆင့်မြင့် နှိုင်းယှဉ်ချက် စာရင်းဇယားများ',
      titleEn: 'Advanced Financial Analytics',
      free: lang === 'my' ? 'အခြေခံ (၂ မျိုးသာ)' : 'Basic (2 random cats)',
      premium: lang === 'my' ? 'အပြည့်အစုံ ကဏ္ဍအားလုံး' : 'Full Pro Analytics',
    },
    {
      titleMy: 'ယာဉ်စီမံခန့်ခွဲမှု (ဆီစားနှုန်း၊ ပြုပြင်စရိတ်နှင့် တာယာလေပေါင်)',
      titleEn: 'Vehicle & Fleet Management (Fuel km/L, Maintenance & Tires)',
      free: lang === 'my' ? `ယာဉ် ${toMyanmarDigits(freeLimits.maxVehicles)} စီး` : `${freeLimits.maxVehicles} vehicle`,
      premium: lang === 'my' ? 'အကန့်အသတ်မဲ့' : 'Unlimited',
    },
    {
      titleMy: 'ကြော်ငြာမပါ၊ အနှောင့်အယှက်ကင်းရှင်းမှု',
      titleEn: '100% Ad-Free Experience',
      free: false,
      premium: true,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto overflow-x-hidden animate-fadeIn">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-amber-500 via-amber-600 to-emerald-600 text-white p-5 sm:p-6 text-center shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 flex items-center justify-center text-white transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs text-white flex items-center justify-center mx-auto mb-2.5 shadow-inner">
            <Crown className="w-7 h-7 fill-white text-white" />
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            {lang === 'my' ? 'ငွေစာရင်း Premium ဝန်ဆောင်မှု' : 'NgweSarYin Premium Membership'}
          </h2>
          <p className="text-xs sm:text-sm text-white/90 max-w-md mx-auto mt-1">
            {lang === 'my'
              ? 'ကြော်ငြာမပါ၊ အကန့်အသတ်မရှိ မှတ်တမ်းတင်နိုင်ပြီး အင်္ဂါရပ်အားလုံး သုံးနိုင်မည့် အဆင့်'
              : 'Unlimited records, custom categories, Excel export, and ad-free experience'}
          </p>

          {/* Current Plan Badge */}
          <div className="mt-3 inline-flex flex-wrap items-center justify-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/25 text-white text-xs font-semibold backdrop-blur-xs">
              <span>{lang === 'my' ? 'လက်ရှိအဆင့်:' : 'Current Plan:'}</span>
              <span className="font-bold text-amber-200 uppercase">
                {currentPlan === 'premium' ? '✨ Premium Active' : 'Free Plan'}
              </span>
            </div>
            {currentPlan === 'premium' && daysLeft !== null && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/30 border border-emerald-300/40 text-emerald-100 text-xs font-bold backdrop-blur-xs">
                <Clock className="w-3.5 h-3.5 text-amber-300" />
                <span>
                  {lang === 'my' ? `ကျန်ရှိသောရက်: ${daysLeft} ရက်` : `Days Left: ${daysLeft} days`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* [v7.5.68] Why-this-opened notice — shown ONLY when the modal
            opened because the Free transaction limit was reached. */}
        {showTxLimitNotice && (
          <div className="px-4 sm:px-6 py-3 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs sm:text-sm font-medium leading-relaxed shrink-0">
            {lang === 'my'
              ? `ဒီလ အတွင်း မှတ်တမ်း ${toMyanmarDigits(freeLimits.maxTransactions)} ပြည့်သွားပါပြီ — နောက်လ ၁ ရက်နေ့မှာ ပြန်စလို့ ရပါမယ်`
              : `You've reached ${freeLimits.maxTransactions} records this month — you can add records again on the 1st of next month.`}
          </div>
        )}

        {/* Tab Selector Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs sm:text-sm font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`flex-1 py-3 px-3 flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'code'
                ? 'border-amber-600 text-amber-900 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <KeyRound className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{lang === 'my' ? 'Activation Code ထည့်မည်' : 'Enter Code'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('payment')}
            className={`flex-1 py-3 px-3 flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'payment'
                ? 'border-amber-600 text-amber-900 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CreditCard className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{lang === 'my' ? 'ငွေလွှဲ၍ Code တောင်းရန်' : 'Get / Buy Code'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('features')}
            className={`flex-1 py-3 px-3 flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'features'
                ? 'border-amber-600 text-amber-900 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ListCheck className="w-4 h-4 text-slate-600 shrink-0" />
            <span>{lang === 'my' ? 'အင်္ဂါရပ်များ' : 'Features'}</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto overflow-x-hidden space-y-4 flex-1">
          {/* TAB 1: Activation Code Entry */}
          {activeTab === 'code' && (
            <div className="space-y-4">
              {currentPlan === 'premium' ? (
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                      <ShieldCheck className="w-7 h-7 stroke-[2.5]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-emerald-950">
                        {lang === 'my' ? 'Premium အဆင့် အပြည့်အစုံ ရရှိပြီး ဖြစ်ပါသည်' : 'Premium Active'}
                      </h3>
                      <p className="text-xs text-emerald-800 max-w-sm mx-auto mt-1">
                        {lang === 'my'
                          ? 'လူကြီးမင်း၏ အကောင့်တွင် Premium အင်္ဂါရပ်အားလုံး အကန့်အသတ်မရှိ အသုံးပြုနိုင်ပါသည်'
                          : 'You have full access to all premium features without restrictions.'}
                      </p>
                    </div>

                    {daysLeft !== null && (
                      <div className="p-4 rounded-xl bg-white border border-emerald-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-100/70 text-emerald-800 flex items-center justify-center font-bold text-base shrink-0">
                            <Clock className="w-5 h-5 text-emerald-700" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-slate-500">
                              {lang === 'my' ? 'ကျန်ရှိသော သက်တမ်း' : 'Subscription Time Left'}
                            </div>
                            <div className="text-lg font-black text-emerald-900">
                              {lang === 'my' ? `${daysLeft} ရက် ကျန်ရှိ` : `${daysLeft} Days Left`}
                            </div>
                          </div>
                        </div>

                        {expiryIso && (
                          <div className="text-xs text-slate-500 flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>
                              {lang === 'my' ? 'သက်တမ်းကုန်ဆုံးမည့်ရက်:' : 'Expires on:'}{' '}
                              <strong className="text-slate-700 font-semibold">
                                {new Date(expiryIso).toLocaleDateString('en-GB')}
                              </strong>
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Extend subscription with new code */}
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
                    <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                      <span>{lang === 'my' ? 'သက်တမ်းတိုးရန် Code အသစ်ထည့်မည်' : 'Renew / Extend Subscription'}</span>
                    </h4>
                    <form onSubmit={handleApplyPromo} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="ဥပမာ - AB12-CD34"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        className="flex-1 min-w-0 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs tracking-wider uppercase font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-amber-500"
                      />
                      <button
                        type="submit"
                        disabled={isVerifying || !promoCode.trim()}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors shrink-0"
                      >
                        {isVerifying ? '...' : lang === 'my' ? 'တိုးမည်' : 'Extend'}
                      </button>
                    </form>
                    {promoError && <p className="text-xs text-rose-600 font-medium">{promoError}</p>}
                    {promoSuccess && <p className="text-xs text-emerald-600 font-medium">{promoSuccess}</p>}
                  </div>
                </div>
              ) : (
                <>
                  {!user ? (
                    <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-200/80 text-amber-800 flex items-center justify-center shrink-0">
                          <LogIn className="w-5 h-5" />
                        </div>
                        <div className="space-y-1 min-w-0">
                          <h4 className="font-bold text-sm text-amber-950">
                            {lang === 'my' ? 'အကောင့်ဝင်ရန် လိုအပ်ပါသည်' : 'Sign In Required'}
                          </h4>
                          <p className="text-xs text-amber-800 leading-relaxed">
                            {lang === 'my'
                              ? 'Activation Code အား သင့် Google သို့မဟုတ် Email အကောင့်နှင့် ချိတ်ဆက်ကာ လုံခြုံစွာ သိမ်းဆည်းရန် ဦးစွာ အကောင့်ဝင်ပေးရန် လိုအပ်ပါသည်။'
                              : 'To link and securely save your premium license to your account, please sign in first.'}
                          </p>
                        </div>
                      </div>

                      {onOpenLogin && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenLogin();
                          }}
                          className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                        >
                          <LogIn className="w-4 h-4" />
                          <span>{lang === 'my' ? 'Google / Email ဖြင့် အကောင့်ဝင်မည်' : 'Sign In with Google / Email'}</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-slate-500">{lang === 'my' ? 'ချိတ်ဆက်ထားသော အကောင့်:' : 'Signed in as:'}</span>{' '}
                        <span className="font-bold text-slate-800 truncate inline-block max-w-full align-middle">{user.email || user.displayName || 'User'}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 shrink-0">
                        Ready
                      </span>
                    </div>
                  )}

                  {/* SPECIAL WELCOME OFFER: 3 MONTHS FREE TRIAL FOR NEW ACCOUNTS (Within 1 Month) */}
                  <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-amber-500/15 via-emerald-500/10 to-teal-500/15 border-2 border-amber-400/80 shadow-md relative overflow-hidden space-y-3">
                    <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-amber-400/10 rounded-full blur-xl pointer-events-none" />

                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
                          <Gift className="w-5 h-5 fill-white/20 stroke-[2.5]" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-black text-sm sm:text-base text-slate-900">
                              {lang === 'my'
                                ? '🎁 ၃ လ အခမဲ့ Premium အထူးလက်ဆောင်'
                                : '🎁 3-Month Free Premium Trial'}
                            </h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white shadow-2xs">
                              {lang === 'my' ? '၃ လ အခမဲ့' : '3 Months FREE'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            {lang === 'my'
                              ? 'အကောင့်ဖွင့်သည့် နေ့မှ ၁ လ (ရက် ၃၀) အတွင်း ၃ လ အခမဲ့ Premium စမ်းသုံးခွင့်ကို ရယူနိုင်ပါသည်'
                              : 'Eligible for new accounts within 1 month (30 days) of registration to claim 3 months free Premium.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Eligibility & Claim Action */}
                    {!user ? (
                      <div className="pt-2">
                        {onOpenLogin && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onOpenLogin();
                            }}
                            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-700 hover:to-emerald-700 text-white font-bold text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <LogIn className="w-4 h-4" />
                            <span>
                              {lang === 'my'
                                ? 'အကောင့်ဖွင့်/ဝင်ရောက်၍ ၃ လ အခမဲ့ ရယူမည် ›'
                                : 'Sign In to Claim 3 Months Free Trial ›'}
                            </span>
                          </button>
                        )}
                      </div>
                    ) : isTrialClaimed ? (
                      <div className="p-3 bg-emerald-100/70 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span className="min-w-0">
                          {lang === 'my'
                            ? '✅ ဤအကောင့်ဖြင့် ၃ လ အခမဲ့ Premium စမ်းသုံးခွင့် ရယူအသုံးပြုပြီး ဖြစ်ပါသည်'
                            : '✅ 3 Months Free Premium trial has already been claimed for this account.'}
                        </span>
                      </div>
                    ) : !isEligibleForTrial ? (
                      <div className="p-3 bg-slate-100 border border-slate-300 rounded-xl text-xs font-medium text-slate-600 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="min-w-0">
                          {lang === 'my'
                            ? 'အကောင့်သက်တမ်း ၁ လ (ရက် ၃၀) ကျော်လွန်သွားသဖြင့် အခမဲ့ စမ်းသုံးခွင့် လက်ဆောင် သက်တမ်းကုန်ဆုံးသွားပါပြီ'
                            : 'Trial eligibility expired (account is older than 30 days). You can still activate via Activation Code below.'}
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between text-xs text-slate-600 px-1">
                          <span className="flex items-center gap-1 font-semibold text-amber-900 min-w-0">
                            <Timer className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>
                              {lang === 'my' ? 'ရယူရန် လက်ကျန်ရက်:' : 'Days left to claim:'}
                            </span>
                          </span>
                          <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md shrink-0">
                            {lang === 'my' ? `${trialDaysLeft} ရက် အတွင်း` : `${trialDaysLeft} days remaining`}
                          </span>
                        </div>

                        <button
                          type="button"
                          disabled={isClaimingTrial}
                          onClick={handleClaimTrial}
                          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-emerald-600 hover:from-amber-600 hover:to-emerald-700 active:scale-95 text-white font-black text-xs sm:text-sm shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {isClaimingTrial ? (
                            <span>{lang === 'my' ? 'စတင်အသက်သွင်းနေပါသည်...' : 'Activating Trial...'}</span>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 fill-white" />
                              <span>
                                {lang === 'my'
                                  ? '✨ ၃ လ အခမဲ့ Premium ရယူမည် (Get Free Trial 3 Months)'
                                  : '✨ Claim 3 Months Free Premium Trial'}
                              </span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {trialError && (
                      <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                        ✕ {trialError}
                      </div>
                    )}
                    {trialSuccess && (
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold animate-pulse">
                        ✓ {trialSuccess}
                      </div>
                    )}
                  </div>

                  <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                        <KeyRound className="w-4 h-4 text-amber-600" />
                        <span>{lang === 'my' ? 'Activation Code ထည့်သွင်းပါ' : 'Enter Activation Code'}</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        {lang === 'my'
                          ? 'Admin ထံမှ ရရှိထားသော ဂဏန်း/အက္ခရာ ကုဒ်ကို ထည့်သွင်း၍ အတည်ပြုပါ'
                          : 'Enter the activation code received from Admin to unlock Premium'}
                      </p>
                    </div>

                    <form onSubmit={handleApplyPromo} className="space-y-3">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          placeholder="ဥပမာ - AB12-CD34"
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                          className="flex-1 min-w-0 px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm tracking-wider uppercase font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                        />
                        <button
                          type="submit"
                          disabled={isVerifying || !promoCode.trim()}
                          className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0 flex items-center justify-center gap-2"
                        >
                          {isVerifying ? (
                            <span>{lang === 'my' ? 'စစ်ဆေးနေသည်...' : 'Verifying...'}</span>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4" />
                              <span>{lang === 'my' ? 'အတည်ပြုမည်' : 'Activate Code'}</span>
                            </>
                          )}
                        </button>
                      </div>

                      {promoError && (
                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                          ✕ {promoError}
                        </div>
                      )}

                      {promoSuccess && (
                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold animate-pulse">
                          ✓ {promoSuccess}
                        </div>
                      )}
                    </form>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 min-w-0">
                        {lang === 'my' ? 'Activation Code မရှိသေးပါက' : "Don't have a code yet?"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('payment')}
                        className="text-amber-700 font-bold hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <span>{lang === 'my' ? 'ငွေလွှဲ၍ Code တောင်းရန် နှိပ်ပါ →' : 'Get / Buy Code →'}</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 2: Payment Instructions & Pricing */}
          {activeTab === 'payment' && (
            <div className="space-y-4">
              {/* Duration Switcher */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  {lang === 'my' ? '၁။ လိုအပ်သော ကာလအလိုက် နှုန်းထားကို ရွေးပါ:' : '1. Select Subscription Duration:'}
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {(Object.keys(PRICING) as Array<keyof typeof PRICING>).map((months) => (
                    <button
                      key={months}
                      type="button"
                      onClick={() => setPlanDuration(months)}
                      className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                        planDuration === months
                          ? 'bg-amber-50 border-amber-500 text-amber-950 font-bold ring-2 ring-amber-500/20 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div className="text-xs font-semibold">{lang === 'my' ? PRICING[months].my : PRICING[months].en}</div>
                      <div className="text-xs font-black text-amber-700 mt-0.5">{PRICING[months].price} Ks</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount Highlight */}
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-xs font-medium text-amber-800">
                    {lang === 'my' ? `${PRICING[planDuration].my} အတွက် ကျသင့်ငွေ:` : `Total for ${PRICING[planDuration].en}:`}
                  </div>
                  <div className="text-xl font-black text-amber-900 mt-0.5">
                    {PRICING[planDuration].price} MMK
                  </div>
                </div>
                {PRICING[planDuration].original && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-200/70 text-amber-900 shrink-0">
                    {lang === 'my' ? 'သက်သာသော နှုန်းထား' : 'Best Value'}
                  </span>
                )}
              </div>

              {/* Step 2: Contact Telegram for Payment & Code */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700">
                  {lang === 'my'
                    ? (contactInfo.contactNoteMy || '၂။ Telegram သို့ ဆက်သွယ်၍ ငွေလွှဲပြေစာ ပို့ကာ Activation Code တောင်းယူပါ:')
                    : (contactInfo.contactNoteEn || '2. Contact Telegram to pay & receive Activation Code:')}
                </label>
                <a
                  href={contactInfo.telegramUrl || 'https://t.me/ankhsam'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 hover:bg-sky-100/90 transition-all flex items-center justify-between group shadow-2xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-sky-500 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                      TG
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-sky-950">Telegram Admin</div>
                      <div className="text-xs font-semibold text-sky-700 break-all">
                        {contactInfo.telegramUsername ? (contactInfo.telegramUsername.startsWith('@') ? contactInfo.telegramUsername : `@${contactInfo.telegramUsername}`) : '@ankhsam'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-bold group-hover:bg-sky-700 transition-colors shrink-0">
                    <span>{lang === 'my' ? 'Telegram သို့ သွားမည်' : 'Open Telegram'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </div>
                </a>

                {/* Additional Payment Details if configured by Admin */}
                {(contactInfo.viberPhone || contactInfo.kpayPhone || contactInfo.wavePhone) && (
                  <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-xl space-y-2 text-xs">
                    {contactInfo.viberPhone && (
                      <div className="flex items-center justify-between gap-2 text-slate-700">
                        <span className="font-semibold flex items-center gap-1 text-[11px] text-slate-600 min-w-0">
                          <Phone className="w-3.5 h-3.5 text-purple-600 shrink-0" /> Phone / Viber:
                        </span>
                        <span className="flex items-center gap-1.5 shrink-0">
                          <a href={`tel:${contactInfo.viberPhone}`} className="font-bold text-indigo-900 underline underline-offset-2">{contactInfo.viberPhone}</a>
                          <button type="button" onClick={() => copyToClipboard(contactInfo.viberPhone || '', 'viber')} className="px-2 py-1 rounded-lg bg-white border border-slate-300 text-[10px] font-bold text-slate-700 hover:bg-slate-100 cursor-pointer">
                            {copiedAccount === 'viber' ? '✓ ကူးပြီး' : 'ကူးမည်'}
                          </button>
                        </span>
                      </div>
                    )}
                    {contactInfo.kpayPhone && (
                      <div className="flex items-center justify-between gap-2 text-slate-700">
                        <span className="font-semibold flex items-center gap-1 text-[11px] text-slate-600 min-w-0 truncate">
                          💳 KBZPay{contactInfo.kpayName ? ` (${contactInfo.kpayName})` : ''}:
                        </span>
                        <span className="flex items-center gap-1.5 shrink-0">
                          <a href={`tel:${contactInfo.kpayPhone}`} className="font-bold text-emerald-800 underline underline-offset-2">{contactInfo.kpayPhone}</a>
                          <button type="button" onClick={() => copyToClipboard(contactInfo.kpayPhone || '', 'kpay')} className="px-2 py-1 rounded-lg bg-white border border-slate-300 text-[10px] font-bold text-slate-700 hover:bg-slate-100 cursor-pointer">
                            {copiedAccount === 'kpay' ? '✓ ကူးပြီး' : 'ကူးမည်'}
                          </button>
                        </span>
                      </div>
                    )}
                    {contactInfo.wavePhone && (
                      <div className="flex items-center justify-between gap-2 text-slate-700">
                        <span className="font-semibold flex items-center gap-1 text-[11px] text-slate-600 min-w-0 truncate">
                          🌊 WaveMoney{contactInfo.waveName ? ` (${contactInfo.waveName})` : ''}:
                        </span>
                        <span className="flex items-center gap-1.5 shrink-0">
                          <a href={`tel:${contactInfo.wavePhone}`} className="font-bold text-amber-800 underline underline-offset-2">{contactInfo.wavePhone}</a>
                          <button type="button" onClick={() => copyToClipboard(contactInfo.wavePhone || '', 'wave')} className="px-2 py-1 rounded-lg bg-white border border-slate-300 text-[10px] font-bold text-slate-700 hover:bg-slate-100 cursor-pointer">
                            {copiedAccount === 'wave' ? '✓ ကူးပြီး' : 'ကူးမည်'}
                          </button>
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Ready with code action */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('code')}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{lang === 'my' ? 'ကုဒ်ရရှိပြီးပါက ဤနေရာတွင် ထည့်သွင်းပါ →' : 'I have a code, Enter it now →'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Features Comparison */}
          {activeTab === 'features' && (
            <div className="space-y-4">
              <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 text-xs sm:text-sm">
                <div className="grid grid-cols-12 bg-slate-50 p-3 font-bold text-slate-600 uppercase text-[11px] tracking-wider">
                  <div className="col-span-6">{lang === 'my' ? 'ဝန်ဆောင်မှု အင်္ဂါရပ်' : 'Features'}</div>
                  <div className="col-span-3 text-center">{lang === 'my' ? 'Free အခမဲ့' : 'Free'}</div>
                  <div className="col-span-3 text-center text-amber-700 font-extrabold flex items-center justify-center gap-1">
                    <Crown className="w-3.5 h-3.5" />
                    <span>Premium</span>
                  </div>
                </div>

                {features.map((feat, idx) => (
                  <div key={idx} className="grid grid-cols-12 p-3 items-center hover:bg-slate-50/60 transition-colors">
                    <div className="col-span-6 font-medium text-slate-800 min-w-0 break-words">
                      {lang === 'my' ? feat.titleMy : feat.titleEn}
                    </div>

                    {/* Free Column */}
                    <div className="col-span-3 text-center text-slate-600 min-w-0">
                      {typeof feat.free === 'boolean' ? (
                        feat.free ? (
                          <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                        ) : (
                          <X className="w-4 h-4 text-slate-300 mx-auto" />
                        )
                      ) : (
                        <span className="text-xs text-slate-600 break-words">{feat.free}</span>
                      )}
                    </div>

                    {/* Premium Column */}
                    <div className="col-span-3 text-center font-semibold text-amber-800 bg-amber-50/50 py-1 rounded-lg min-w-0">
                      {typeof feat.premium === 'boolean' ? (
                        feat.premium ? (
                          <Check className="w-4 h-4 text-emerald-600 font-extrabold mx-auto stroke-[3]" />
                        ) : (
                          <X className="w-4 h-4 text-slate-300 mx-auto" />
                        )
                      ) : (
                        <span className="text-xs text-amber-900 font-bold break-words">{feat.premium}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 min-w-0">
            {lang === 'my' ? 'လုံခြုံသော စနစ်ဖြင့် ကာကွယ်ထားပါသည်' : 'Secure activation guaranteed'}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          >
            {lang === 'my' ? 'ပိတ်မည်' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
