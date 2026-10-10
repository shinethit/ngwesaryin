import React, { useState } from 'react';
import { safeGetItem, safeSetItem } from '../utils/storage';
import { Target, TrendingUp, AlertTriangle, CheckCircle2, Edit3, Calendar, X, Power, Lock } from 'lucide-react';
import { formatMMK } from '../utils/formatters';
import { PlanType } from '../types';

interface MonthlySavingsTargetProps {
  income: number;
  expense: number;
  lang: 'my' | 'en';
  plan?: PlanType;
  onOpenUpgrade?: () => void;
}

export const MonthlySavingsTarget: React.FC<MonthlySavingsTargetProps> = ({
  income,
  expense,
  lang,
  plan,
  onOpenUpgrade,
}) => {
  // Lock feature for Guest Mode
  if (plan === 'guest') {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-300">
            <Lock className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-amber-950 flex items-center gap-1.5">
              <span>{lang === 'my' ? 'လစဉ် စုဆောင်းငွေ ပန်းတိုင် (Guest Mode တွင် မရရှိပါ)' : 'Savings Target (Locked in Guest Mode)'}</span>
            </h4>
            <p className="text-[11px] text-amber-800 mt-0.5">
              {lang === 'my'
                ? 'စုဆောင်းငွေ ပန်းတိုင် သတ်မှတ် စောင့်ကြည့်နိုင်ရန် Google Account ဖြင့် အခမဲ့ Sign in ပြုလုပ်ပါ (သို့မဟုတ်) Premium သို့ တိုးမြှင့်ပါ'
                : 'Sign in with Google or upgrade to Premium to enable monthly savings goal tracking.'}
            </p>
          </div>
        </div>
        {onOpenUpgrade && (
          <button
            type="button"
            onClick={onOpenUpgrade}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs shrink-0 self-start sm:self-auto cursor-pointer"
          >
            {lang === 'my' ? 'Sign In / Upgrade' : 'Sign In / Upgrade'}
          </button>
        )}
      </div>
    );
  }
  // Current month key for storage
  const currentMonthKey = new Date().toISOString().slice(0, 7); // YYYY-MM
  const storageKey = `ngwe_savings_target_${currentMonthKey}`;

  // Whether the savings target feature is enabled (Default: false so it doesn't clutter for users who don't want it)
  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    const saved = safeGetItem('ngwe_savings_target_enabled');
    return saved === 'true';
  });

  const handleToggleEnabled = (enabled: boolean) => {
    setIsEnabled(enabled);
    safeSetItem('ngwe_savings_target_enabled', enabled ? 'true' : 'false');
  };

  // State for savings target amount (supports 0!)
  const [targetAmount, setTargetAmount] = useState<number>(() => {
    const saved = safeGetItem(storageKey) ?? safeGetItem('ngwe_savings_target_default');
    if (saved !== null) {
      const parsed = Number(saved);
      if (!isNaN(parsed) && parsed >= 0) return parsed;
    }
    // Default fallback: 0 or 20% of current income
    return 0;
  });

  // Edit modal / popover state
  const [isEditing, setIsEditing] = useState(false);
  const [inputVal, setInputVal] = useState(targetAmount.toString());

  // Calculations
  const actualSavings = income - expense;
  const progressPercent = targetAmount > 0 ? Math.round((actualSavings / targetAmount) * 100) : 0;
  const clampedProgress = Math.min(100, Math.max(0, progressPercent));

  // Savings rate based on income
  const savingsRate = income > 0 ? Math.round((actualSavings / income) * 100) : 0;

  // Remaining days in current month for daily pacing
  const today = new Date();
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysLeft = Math.max(1, lastDayOfMonth - today.getDate() + 1);

  const remainingToGoal = Math.max(0, targetAmount - actualSavings);
  const dailyNeeded = remainingToGoal > 0 ? Math.ceil(remainingToGoal / daysLeft) : 0;
  const isTargetAchieved = actualSavings >= targetAmount && targetAmount > 0;
  const isDeficit = actualSavings < 0;

  // Save to localStorage when targetAmount updates (accepts 0!)
  const handleSaveTarget = (newVal: number) => {
    const sanitized = Math.max(0, isNaN(newVal) ? 0 : newVal);
    setTargetAmount(sanitized);
    safeSetItem(storageKey, sanitized.toString());
    safeSetItem('ngwe_savings_target_default', sanitized.toString());
    setIsEditing(false);
  };

  const handleApplyPercentage = (pct: number) => {
    if (income > 0) {
      const calc = Math.round((income * (pct / 100)) / 10000) * 10000;
      setInputVal(calc.toString());
      handleSaveTarget(calc);
    }
  };

  // Compact Minimal Bar when Disabled
  if (!isEnabled) {
    return (
      <div className="rounded-2xl border border-dashed border-purple-300/80 bg-purple-50/50 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all hover:bg-purple-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 border border-purple-200">
            <Target className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-800">
              {lang === 'my' ? 'လစဉ် စုဆောင်းငွေ ပန်းတိုင် သတ်မှတ်လိုပါသလား?' : 'Want to set a Monthly Savings Goal?'}
            </h4>
            <p className="text-[11px] text-slate-500">
              {lang === 'my'
                ? 'မိမိ လစဉ် စုဆောင်းလိုသော ပမာဏကို သတ်မှတ်ပြီး တိုးတက်မှုကို အနီးကပ် တွက်ချက်စောင့်ကြည့်နိုင်ပါသည်'
                : 'Set a target savings amount to monitor your monthly financial pace'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            handleToggleEnabled(true);
            if (targetAmount === 0) {
              setInputVal('300000');
              setIsEditing(true);
            }
          }}
          className="shrink-0 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Target className="w-3.5 h-3.5" />
          <span>{lang === 'my' ? 'ငွေစုပန်းတိုင် ဖွင့်မည်' : 'Enable Savings Goal'}</span>
        </button>
      </div>
    );
  }

  return (
    <div
      id="monthly-savings-target-card"
      className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#4C1D95] via-[#5B21B6] to-[#3B0764] text-white border border-purple-400/30 shadow-[0_16px_36px_rgba(76,29,149,0.35),inset_2px_2px_4px_rgba(255,255,255,0.35),inset_-2px_-2px_4px_rgba(0,0,0,0.3)] transition-all duration-300"
    >
      {/* 3D ambient glows */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-[#A78BFA]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 -mb-12 w-56 h-56 bg-[#2DD4BF]/15 rounded-full blur-2xl pointer-events-none" />

      <div className="relative p-5 sm:p-7 z-10 space-y-5">
        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-[18px] bg-gradient-to-tr from-[#2DD4BF] to-[#5EEAD4] text-teal-950 flex items-center justify-center shadow-[3px_4px_12px_rgba(20,184,166,0.4),inset_1.5px_1.5px_3px_rgba(255,255,255,0.7)]">
              <Target className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg sm:text-xl text-white tracking-tight">
                  {lang === 'my' ? 'လစဉ် စုဆောင်းငွေ ပန်းတိုင်' : 'Monthly Savings Goal'}
                </h3>
                <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-white/15 border border-white/20 text-purple-100 shadow-2xs">
                  {new Date().toLocaleDateString(lang === 'my' ? 'my-MM' : 'en-US', { month: 'short', year: 'numeric' })}
                </span>
              </div>
              <p className="text-xs text-purple-200/90 font-medium mt-0.5">
                {lang === 'my'
                  ? 'ဝင်ငွေနှင့် ထွက်ငွေ အချိုးအရ စုဆောင်းနိုင်မှု တိုးတက်မှုကို တွက်ချက်ထားပါသည်'
                  : 'Tracked automatically based on your actual income vs. expenses'}
              </p>
            </div>
          </div>

          {/* Action / Edit & Disable buttons */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              id="edit-savings-target-btn"
              onClick={() => {
                setInputVal(targetAmount.toString());
                setIsEditing(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-extrabold text-purple-950 bg-gradient-to-r from-amber-200 to-amber-300 hover:from-amber-300 hover:to-amber-400 shadow-[3px_4px_10px_rgba(245,158,11,0.3),inset_1px_1px_2px_rgba(255,255,255,0.8)] transition-all active:scale-95 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-purple-950" />
              <span>{lang === 'my' ? 'ပန်းတိုင် ပြင်မည်' : 'Set Target'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleToggleEnabled(false)}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-full text-xs font-semibold text-purple-200 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-all cursor-pointer"
              title={lang === 'my' ? 'ငွေစုပန်းတိုင် ကတ်ပြားကို ပိတ်ထားမည်' : 'Disable and hide savings target card'}
            >
              <Power className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{lang === 'my' ? 'ပိတ်ထားမည်' : 'Disable'}</span>
            </button>
          </div>
        </div>

        {/* Primary Numbers Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 pt-1">
          {/* Target Amount */}
          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.2)]">
            <span className="text-[11px] font-bold text-purple-200 block mb-1">
              {lang === 'my' ? 'သတ်မှတ်ပန်းတိုင် (Target)' : 'Target Amount'}
            </span>
            <div className="text-base sm:text-lg font-black text-white tracking-tight">
              {targetAmount > 0 ? (
                formatMMK(targetAmount)
              ) : (
                <span className="text-purple-300 text-sm font-semibold">
                  {lang === 'my' ? '၀ ကျပ် (သတ်မှတ်မထားပါ)' : '0 MMK (None)'}
                </span>
              )}
            </div>
          </div>

          {/* Actual Net Saved */}
          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.2)]">
            <span className="text-[11px] font-bold text-purple-200 block mb-1">
              {lang === 'my' ? 'လက်တွေ့စုဆောင်းရငွေ' : 'Actual Net Saved'}
            </span>
            <div
              className={`text-base sm:text-lg font-black tracking-tight ${
                isDeficit ? 'text-rose-300' : 'text-teal-300'
              }`}
            >
              {formatMMK(actualSavings)}
            </div>
          </div>

          {/* Remaining to Goal or Surplus */}
          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.2)]">
            <span className="text-[11px] font-bold text-purple-200 block mb-1">
              {targetAmount === 0
                ? lang === 'my' ? 'အခြေအနေ' : 'Status'
                : isTargetAchieved
                ? lang === 'my' ? 'ပန်းတိုင်ထက် ပိုလျှံငွေ' : 'Surplus Saved'
                : lang === 'my' ? 'ပန်းတိုင်ရောက်ရန် လိုငွေ' : 'Needed to Reach Goal'}
            </span>
            <div className="text-base sm:text-lg font-black text-white tracking-tight">
              {targetAmount === 0
                ? '-'
                : isTargetAchieved
                ? `+${formatMMK(actualSavings - targetAmount)}`
                : formatMMK(remainingToGoal)}
            </div>
          </div>

          {/* Savings Rate % */}
          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.2)]">
            <span className="text-[11px] font-bold text-purple-200 block mb-1">
              {lang === 'my' ? 'စုဆောင်းမှုနှုန်း (Savings Rate)' : 'Savings Rate'}
            </span>
            <div className="flex items-center gap-1.5 text-base sm:text-lg font-black text-white tracking-tight">
              <span className={savingsRate >= 20 ? 'text-teal-300' : savingsRate > 0 ? 'text-amber-300' : 'text-purple-300'}>
                {savingsRate}%
              </span>
              <span className="text-[11px] font-medium text-purple-200/80">
                {lang === 'my' ? 'ဝင်ငွေ၏' : 'of income'}
              </span>
            </div>
          </div>
        </div>

        {/* High-Precision Progress Bar & Status */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              {targetAmount === 0 ? (
                <span className="inline-flex items-center gap-1 text-purple-300 font-medium">
                  {lang === 'my' ? 'ပန်းတိုင် ပမာဏ သတ်မှတ်ရန် အပေါ်ရှိ "ပန်းတိုင် ပြင်မည်" ကို နှိပ်ပါ' : 'Click "Set Target" above to configure your monthly savings goal'}
                </span>
              ) : isTargetAchieved ? (
                <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  {lang === 'my' ? 'ပန်းတိုင် အောင်မြင်စွာ ပြည့်မီပါပြီ! 🎉' : 'Monthly Target Achieved! 🎉'}
                </span>
              ) : isDeficit ? (
                <span className="inline-flex items-center gap-1 text-rose-400 font-bold">
                  <AlertTriangle className="w-4 h-4" />
                  {lang === 'my' ? 'ထွက်ငွေ ပိုနေပါသည် (အနုတ်ပြနေသည်)' : 'Budget Deficit: Expenses exceed income'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-slate-300 font-medium">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  {lang === 'my' ? 'ပန်းတိုင်ဆီသို့ ဆက်လက်စုဆောင်းနေသည်' : 'On track toward monthly goal'}
                </span>
              )}
            </div>

            <div className="font-bold text-sm tracking-tight text-white">
              {targetAmount > 0 ? (
                <>
                  {progressPercent}%{' '}
                  <span className="text-xs font-normal text-slate-400">
                    ({formatMMK(Math.max(0, actualSavings))} / {formatMMK(targetAmount)})
                  </span>
                </>
              ) : (
                <span className="text-xs text-purple-300">0%</span>
              )}
            </div>
          </div>

          {/* Progress Bar Track */}
          <div className="relative h-3.5 w-full rounded-full bg-slate-800/90 overflow-hidden p-0.5 border border-slate-700/60 shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out relative ${
                isTargetAchieved
                  ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                  : progressPercent >= 70
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                  : progressPercent >= 40
                  ? 'bg-gradient-to-r from-amber-500 to-emerald-400'
                  : isDeficit
                  ? 'bg-rose-500 w-2'
                  : 'bg-gradient-to-r from-slate-500 to-amber-400'
              }`}
              style={{ width: `${targetAmount > 0 ? Math.max(2, clampedProgress) : 0}%` }}
            >
              {/* Highlight shine on bar */}
              <div className="absolute inset-0 bg-white/20 rounded-full w-full h-full" />
            </div>
          </div>

          {/* Progress Milestones labels */}
          <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono pt-0.5 px-0.5">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span className={isTargetAchieved ? 'text-emerald-400 font-bold' : ''}>100% 🎯</span>
          </div>
        </div>

        {/* Daily Pacing & Smart Financial Advice */}
        {targetAmount > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                {lang === 'my'
                  ? `ဒီလ ကုန်ဆုံးရန် ${daysLeft} ရက် ကျန်ရှိပါသေးသည်`
                  : `${daysLeft} days remaining in this month`}
              </span>
            </div>

            <div>
              {!isTargetAchieved && remainingToGoal > 0 ? (
                <span className="text-slate-300">
                  {lang === 'my' ? (
                    <>
                      ပန်းတိုင်ပြည့်ရန် တစ်ရက်ပျမ်းမျှ{' '}
                      <strong className="text-emerald-400 font-bold">{formatMMK(dailyNeeded)}</strong> စုဆောင်းသင့်ပါသည်
                    </>
                  ) : (
                    <>
                      Target daily pace:{' '}
                      <strong className="text-emerald-400 font-bold">{formatMMK(dailyNeeded)}</strong> / day
                    </>
                  )}
                </span>
              ) : isTargetAchieved ? (
                <span className="text-emerald-400 font-semibold">
                  {lang === 'my'
                    ? 'ဂုဏ်ယူပါသည်! ဒီလ စုဆောင်းငွေ ပန်းတိုင် ပြည့်မီပြီးပါပြီ'
                    : 'Fantastic work! You have hit your savings milestone for this month.'}
                </span>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Edit Target Inline Dialog / Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-5 sm:p-6 text-white space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-400" />
                <h4 className="font-bold text-base text-white">
                  {lang === 'my' ? 'လစဉ် စုဆောင်းငွေ ပန်းတိုင် သတ်မှတ်ရန်' : 'Set Monthly Savings Target'}
                </h4>
              </div>
              <button
                onClick={() => setIsEditing(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              {lang === 'my'
                ? 'မိမိ လစဉ် စုဆောင်းလိုသော ပမာဏ (MMK) ကို ရိုက်ထည့်ပါ (၀ ဟု ထည့်ပါက ပန်းတိုင်ကို ဖျက်သိမ်းထားပါမည်)'
                : 'Enter your monthly savings target (enter 0 to clear target)'}
            </p>

            {/* Input field - cleanly supports 0 */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                {lang === 'my' ? 'ပန်းတိုင် ပမာဏ (MMK)' : 'Target Amount (MMK)'}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="10000"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder="0"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-bold tracking-wide focus:outline-none focus:border-emerald-500 text-lg"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  MMK
                </span>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="space-y-2">
              <span className="text-[11px] font-medium text-slate-400">
                {lang === 'my' ? 'အမြန် သတ်မှတ်ချက်များ (Presets):' : 'Quick Presets:'}
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <button
                  type="button"
                  onClick={() => setInputVal('0')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                    inputVal === '0'
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {lang === 'my' ? '၀ (ဖျက်မည်)' : '0 (Clear)'}
                </button>
                {[100000, 300000, 500000, 1000000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setInputVal(amt.toString())}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                      Number(inputVal) === amt
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {formatMMK(amt)}
                  </button>
                ))}
              </div>

              {income > 0 && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] text-slate-400">{lang === 'my' ? 'ဝင်ငွေ၏ % :' : 'Income % :'}</span>
                  {[10, 20, 30, 50].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleApplyPercentage(pct)}
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 border border-slate-700 hover:border-slate-500 text-slate-300"
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 border border-slate-700 transition-colors cursor-pointer"
              >
                {lang === 'my' ? 'မလုပ်တော့ပါ' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => handleSaveTarget(inputVal === '' ? 0 : Number(inputVal))}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-900 bg-emerald-400 hover:bg-emerald-300 shadow-md shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer"
              >
                {lang === 'my' ? 'သိမ်းဆည်းမည်' : 'Save Target'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

