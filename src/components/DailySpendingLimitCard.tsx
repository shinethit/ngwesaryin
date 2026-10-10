import React, { useState, useEffect, useMemo } from 'react';
import { Flame, CheckCircle2, AlertTriangle, Settings, X } from 'lucide-react';
import { Transaction } from '../types';
import { formatMMK } from '../utils/formatters';
import { safeGetItem, safeSetItem } from '../utils/storage';
import { isTransferTransaction } from '../utils/walletBalance';

interface DailySpendingLimitCardProps {
  transactions: Transaction[];
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
  lang,
}) => {
  const todayStr = getLocalDateString(new Date());

  const [dailyLimit, setDailyLimit] = useState<number>(() => {
    const saved = safeGetItem('ngwe_daily_spending_limit');
    return saved ? Number(saved) : 20000; // Default 20,000 MMK daily limit
  });
  const [isEditing, setIsEditing] = useState(false);
  const [inputLimit, setInputLimit] = useState(String(dailyLimit));

  useEffect(() => {
    safeSetItem('ngwe_daily_spending_limit', String(dailyLimit));
  }, [dailyLimit]);

  // Calculate today's total expenses (exclude transfers)
  const todaySpent = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'expense' && !isTransferTransaction(t) && t.date === todayStr)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [transactions, todayStr]);

  const isOverBudget = todaySpent > dailyLimit;
  const percentage = dailyLimit > 0 ? Math.min(150, Math.round((todaySpent / dailyLimit) * 100)) : 0;

  const handleSaveLimit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(inputLimit);
    if (!isNaN(val) && val >= 0) {
      setDailyLimit(val);
      setIsEditing(false);
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
            <span className={`text-base sm:text-lg font-black ${isOverBudget ? 'text-rose-700' : 'text-slate-900'}`}>
              {formatMMK(todaySpent)}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              / {formatMMK(dailyLimit)}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setInputLimit(String(dailyLimit));
            setIsEditing(true);
          }}
          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>{lang === 'my' ? 'သတ်မှတ်ရန်' : 'Set Limit'}</span>
        </button>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] font-mono font-bold">
          <span className={isOverBudget ? 'text-rose-700' : 'text-emerald-700'}>
            {percentage}% {lang === 'my' ? 'သုံးစွဲပြီး' : 'used'}
          </span>
          <span className="text-slate-500">
            {isOverBudget
              ? (lang === 'my' ? `ကျော်လွန်ငွေ: ${formatMMK(todaySpent - dailyLimit)}` : `Over by: ${formatMMK(todaySpent - dailyLimit)}`)
              : (lang === 'my' ? `ကျန်ရှိငွေ: ${formatMMK(dailyLimit - todaySpent)}` : `Remaining: ${formatMMK(dailyLimit - todaySpent)}`)}
          </span>
        </div>
        <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isOverBudget ? 'bg-rose-600 animate-pulse' : 'bg-emerald-600'
            }`}
            style={{ width: `${Math.min(100, percentage)}%` }}
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
              className="absolute right-4 top-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
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
                type="number"
                value={inputLimit}
                onChange={(e) => setInputLimit(e.target.value)}
                placeholder="20000"
                className="w-full px-3.5 py-2.5 text-sm font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                autoFocus
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all cursor-pointer shadow-xs"
              >
                {lang === 'my' ? 'သိမ်းဆည်းမည်' : 'Save Limit'}
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
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
