import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Flame, CheckCircle2, AlertTriangle, Settings, X } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db, safeSetDoc } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Transaction, Wallet } from '../types';
import { formatMMK, formatLakhs } from '../utils/formatters';
import { convertToMMK } from '../utils/currency';
import { parseMyanmarNumber } from '../utils/myanmarDigits';
import { safeGetItem, safeSetItem } from '../utils/storage';
import { isTransferTransaction } from '../utils/walletBalance';

interface DailySpendingLimitCardProps {
  transactions: Transaction[];
  wallets?: Wallet[];
  lang: 'my' | 'en';
}

const getLocalDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const DailySpendingLimitCard: React.FC<DailySpendingLimitCardProps> = ({
  transactions,
  wallets = [],
  lang,
}) => {
  const todayStr = getLocalDateString(new Date());
  const { user } = useAuth();

  const [dailyLimit, setDailyLimit] = useState<number>(() => {
    const saved = safeGetItem('ngwe_daily_spending_limit');
    return saved ? Number(saved) : 20000; // Default 20,000 MMK daily limit
  });
  const [isEditing, setIsEditing] = useState(false);
  const [inputLimit, setInputLimit] = useState(String(dailyLimit));
  // [v7.5.60 S8] Invalid-input error shown under the input (was silently ignored).
  const [inputError, setInputError] = useState<string | null>(null);
  // [v7.5.60 S10] Cloud sync state. 'local' = guest / no account (this
  // device only); 'synced' = the value lives in the user doc too.
  const [cloudState, setCloudState] = useState<'local' | 'loading' | 'synced' | 'error'>('local');
  const cloudReadyRef = useRef(false);

  useEffect(() => {
    safeSetItem('ngwe_daily_spending_limit', String(dailyLimit));
    // [v7.5.60 S10] Push to the user doc once the cloud value has been
    // loaded (the ref stops the pre-load default overwriting the cloud).
    if (user && cloudReadyRef.current) {
      safeSetDoc(doc(db, 'users', user.uid), { dailySpendingLimit: dailyLimit }, { merge: true }).catch(() => {});
    }
  }, [dailyLimit, user]);

  // [v7.5.60 S10] Load the cloud value on mount; migrate the local value
  // up when the cloud field is empty.
  useEffect(() => {
    if (!user) {
      cloudReadyRef.current = true;
      setCloudState('local');
      return;
    }
    let cancelled = false;
    setCloudState('loading');
    getDoc(doc(db, 'users', user.uid))
      .then((snap) => {
        if (cancelled) return;
        const cloudVal = snap.exists() ? (snap.data() as { dailySpendingLimit?: unknown }).dailySpendingLimit : undefined;
        if (typeof cloudVal === 'number' && Number.isFinite(cloudVal) && cloudVal >= 0) {
          setDailyLimit(cloudVal);
          safeSetItem('ngwe_daily_spending_limit', String(cloudVal));
        } else {
          const saved = safeGetItem('ngwe_daily_spending_limit');
          if (saved !== null && !Number.isNaN(Number(saved))) {
            safeSetDoc(doc(db, 'users', user.uid), { dailySpendingLimit: Number(saved) }, { merge: true }).catch(() => {});
          }
        }
        cloudReadyRef.current = true;
        setCloudState('synced');
      })
      .catch(() => {
        if (cancelled) return;
        cloudReadyRef.current = true;
        setCloudState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Calculate today's total expenses (exclude transfers), converted to
  // MMK like every other Analytics figure — raw amounts would mix wallet
  // currencies (e.g. a USD wallet's 50 counted as 50 MMK).
  const todaySpent = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'expense' && !isTransferTransaction(t) && t.date === todayStr)
      .reduce((sum, t) => {
        const w = wallets.find((x) => x.id === t.walletId);
        return sum + convertToMMK(Number(t.amount) || 0, w?.currency, w?.exchangeRate);
      }, 0);
  }, [transactions, wallets, todayStr]);

  const isOverBudget = todaySpent > dailyLimit;
  // [v7.5.74] percentage is null when the daily limit is 0 and spending > 0 — no % exists, so none is shown (never a fabricated 150% or a contradictory "0% used" next to the Over Budget badge). No 150 cap when the limit > 0.
  const percentage: number | null = dailyLimit > 0 ? Math.round((todaySpent / dailyLimit) * 100) : (todaySpent > 0 ? null : 0);

  const handleSaveLimit = (e: React.FormEvent) => {
    e.preventDefault();
    // [v7.5.55] Myanmar digits (၀-၉) accepted in the limit input.
    const val = parseMyanmarNumber(inputLimit);
    if (!isNaN(val) && val >= 0) {
      setInputError(null);
      setDailyLimit(val);
      setIsEditing(false);
    } else {
      // [v7.5.60 S8] Say what is wrong instead of silently doing nothing.
      setInputError(lang === 'my' ? 'မှန်ကန်တဲ့ နံပါတ် ထည့်ပါ' : 'Please enter a valid number');
    }
  };

  return (
    <div className={`rounded-3xl border p-4 sm:p-5 shadow-xs transition-all space-y-3.5 ${
      isOverBudget
        ? 'bg-gradient-to-br from-rose-50/90 via-white to-rose-50/40 border-rose-300 shadow-[0_4px_20px_rgba(239,68,68,0.12)]'
        : 'bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/30 border-emerald-300 shadow-[0_4px_20px_rgba(16,185,129,0.08)]'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
            isOverBudget ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
          }`}>
            <Flame className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="font-bold text-xs sm:text-sm text-slate-900">
              {lang === 'my' ? 'ယနေ့အသုံးစရိတ် ကန့်သတ်ချက် (Daily Limit)' : 'Daily Spending Limit'}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              {lang === 'my' ? 'ယနေ့ တစ်နေ့တာ ကုန်ကျစရိတ်များကို ထိန်းချုပ်ပါ' : 'Monitor daily burn rate and budget'}
            </p>
          </div>
        </div>

        {/* Red / Green Indicator Badge */}
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black shadow-2xs border ${
          isOverBudget
            ? 'bg-rose-600 text-white border-rose-700 animate-pulse'
            : 'bg-emerald-600 text-white border-emerald-700'
        }`}>
          {isOverBudget ? (
            <>
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{lang === 'my' ? '🚨 ဘတ်ဂျက်ကျော်လွန်နေသည်' : '🚨 Over Budget'}</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{lang === 'my' ? '🟢 အခြေအနေကောင်း (Safe)' : '🟢 Safe & Within Limit'}</span>
            </>
          )}
        </div>
      </div>

      {/* Spending Summary & Limit Edit Trigger */}
      <div className="flex items-center justify-between gap-3 bg-white/80 p-3 rounded-2xl border border-slate-200/80">
        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {lang === 'my' ? 'ယနေ့ သုံးစွဲပြီး / ကန့်သတ်ချက်' : 'Today Spent / Limit'}
          </div>
          <div className="flex items-baseline gap-1.5 font-mono">
            <span className={`text-base sm:text-lg font-black ${isOverBudget ? 'text-rose-700' : 'text-slate-900'}`} title={formatMMK(todaySpent)}>
              {formatLakhs(todaySpent, lang)}
            </span>
            <span className="text-xs font-semibold text-slate-500" title={formatMMK(dailyLimit)}>
              / {formatLakhs(dailyLimit, lang)}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setInputLimit(String(dailyLimit));
            setInputError(null);
            setIsEditing(true);
          }}
          className="min-h-11 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>{lang === 'my' ? 'သတ်မှတ်ရန်' : 'Set Limit'}</span>
        </button>
      </div>

      {/* [v7.5.60 S10] Where this limit lives. */}
      <div className="text-[10px] font-semibold text-slate-400">
        {cloudState === 'synced'
          ? (lang === 'my' ? '☁️ Cloud Sync ပြုလုပ် — စက်တိုင်း တူညီမည်' : '☁️ Cloud synced — same on every device')
          : cloudState === 'loading'
          ? (lang === 'my' ? '☁️ Cloud နှင့် ချိတ်ဆက်နေသည်...' : '☁️ Syncing with cloud...')
          : cloudState === 'error'
          ? (lang === 'my' ? '⚠️ Cloud နှင့် ချိတ်ဆက်၍ မရပါ — ဒီစက်မှာသာ သက်ရောက်သည်' : '⚠️ Cloud unreachable — applies on this device only')
          : (lang === 'my' ? '📱 ဒီစက်မှာသာ သက်ရောက်သည်' : '📱 Applies on this device only')}
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] font-mono font-bold">
          <span className={isOverBudget ? 'text-rose-700' : 'text-emerald-700'}>
            {percentage === null ? '—' : `${percentage}% ${lang === 'my' ? 'သုံးစွဲပြီး' : 'used'}`}
          </span>
          <span className="text-slate-500" title={isOverBudget ? formatMMK(todaySpent - dailyLimit) : formatMMK(dailyLimit - todaySpent)}>
            {isOverBudget
              ? (lang === 'my' ? `ကျော်လွန်ငွေ: ${formatLakhs(todaySpent - dailyLimit, lang)}` : `Over by: ${formatLakhs(todaySpent - dailyLimit, lang)}`)
              : (lang === 'my' ? `ကျန်ရှိငွေ: ${formatLakhs(dailyLimit - todaySpent, lang)}` : `Remaining: ${formatLakhs(dailyLimit - todaySpent, lang)}`)}
          </span>
        </div>
        <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isOverBudget ? 'bg-rose-600 animate-pulse' : 'bg-emerald-600'
            }`}
            style={{ width: `${percentage === null ? 100 : Math.min(100, percentage)}%` }}
          />
        </div>
      </div>

      {/* Edit Limit Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <form onSubmit={handleSaveLimit} className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-200 relative">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="absolute right-4 top-4 w-11 h-11 min-w-11 min-h-11 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm sm:text-base text-slate-900">
                  {lang === 'my' ? 'နေ့စဉ် သုံးစွဲငွေ ကန့်သတ်ချက် သတ်မှတ်ရန်' : 'Set Daily Spending Limit'}
                </h4>
                <p className="text-xs text-slate-500">
                  {lang === 'my' ? 'တစ်ရက်လျှင် အများဆုံး သုံးစွဲလိုသည့် ပမာဏ (MMK)' : 'Maximum spending allowed per day (MMK)'}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === 'my' ? 'ကန့်သတ်ငွေ (MMK)' : 'Daily Limit (MMK)'}
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={inputLimit}
                onChange={(e) => { setInputLimit(e.target.value); setInputError(null); }}
                placeholder="20000"
                className="w-full px-3.5 py-2.5 text-base font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                autoFocus
              />
              {/* [v7.5.60 S8] Invalid-input error, shown in place of silence. */}
              {inputError && (
                <p className="text-xs font-bold text-rose-600 mt-1.5">{inputError}</p>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 min-h-11 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all cursor-pointer shadow-xs"
              >
                {lang === 'my' ? 'သိမ်းဆည်းမည်' : 'Save Limit'}
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="min-h-11 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
              >
                {lang === 'my' ? 'ပိတ်မည်' : 'Cancel'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
