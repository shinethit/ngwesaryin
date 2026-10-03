import React from 'react';
import {
  TrendingUp,
  PiggyBank,
  HandCoins,
  ReceiptText,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';

/**
 * Serene, eye-friendly Financial Overview Banner
 * Designed with soothing neutral tones and calm accents to prevent eye strain.
 */
export const FinancialOverviewBanner: React.FC<{
  className?: string;
  lang?: 'my' | 'en';
  onAddIncome?: () => void;
  onAddExpense?: () => void;
  onAddDebt?: () => void;
}> = ({
  className = 'w-full',
  lang = 'my',
  onAddIncome,
  onAddExpense,
  onAddDebt,
}) => {
  const currentDate = new Date().toLocaleDateString(lang === 'my' ? 'my-MM' : 'en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 p-6 sm:p-7 text-white shadow-sm border border-slate-800/80 ${className}`}
    >
      {/* Gentle ambient background glows */}
      <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
      <div className="absolute left-1/3 -bottom-16 w-56 h-56 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
        {/* Left Welcome and Overview Message */}
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-medium text-slate-300 border border-white/10">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>{currentDate}</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            {lang === 'my' ? 'ငွေကြေး စီမံခန့်ခွဲမှု အကျဉ်းချုပ်' : 'Financial Dashboard'}
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed">
            {lang === 'my'
              ? 'နေ့စဉ် ဝင်ငွေ၊ ထွက်ငွေနှင့် အကြွေး (ပေးရန်/ရရန်) စာရင်းများကို ရှင်းလင်းအေးချမ်းစွာ ကြည့်ရှုမှတ်တမ်းတင်ပါ'
              : 'Keep your income, daily expenses, and debt balances accurately monitored with clarity.'}
          </p>
        </div>

        {/* Right Quick Action Buttons (ဝင်ငွေ မှတ်မည် ၊ ထွက်ငွေ မှတ်မည် ၊ အကြွေး မှတ်မည်) */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full xl:w-auto shrink-0 mt-3 lg:mt-0">
          {/* Add Income Button */}
          <button
            type="button"
            onClick={onAddIncome}
            className="w-full flex flex-col items-center justify-center gap-1.5 px-2 py-3 sm:py-3.5 rounded-2xl text-[11px] min-[380px]:text-xs sm:text-sm font-bold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 transition-all cursor-pointer active:scale-95 shadow-sm h-full min-h-[76px] sm:min-h-[84px] leading-tight select-none border border-emerald-300/50 text-center"
            title={lang === 'my' ? 'ဝင်ငွေ မှတ်မည်' : 'Add Income'}
          >
            <div className="w-6 h-6 rounded-lg bg-emerald-950/15 flex items-center justify-center shrink-0">
              <ArrowDownLeft className="w-4 h-4 stroke-[2.5] text-emerald-950" />
            </div>
            <span className="leading-tight text-center break-words font-extrabold text-emerald-950">
              {lang === 'my' ? '+ ဝင်ငွေမှတ်မည်' : '+ Add Income'}
            </span>
          </button>

          {/* Add Expense Button */}
          <button
            type="button"
            onClick={onAddExpense}
            className="w-full flex flex-col items-center justify-center gap-1.5 px-2 py-3 sm:py-3.5 rounded-2xl text-[11px] min-[380px]:text-xs sm:text-sm font-bold text-rose-100 bg-rose-900/90 hover:bg-rose-800 transition-all cursor-pointer active:scale-95 shadow-sm h-full min-h-[76px] sm:min-h-[84px] leading-tight select-none border border-rose-700/80 text-center"
            title={lang === 'my' ? 'ထွက်ငွေ မှတ်မည်' : 'Add Expense'}
          >
            <div className="w-6 h-6 rounded-lg bg-rose-950/40 flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-4 h-4 stroke-[2.5] text-rose-300" />
            </div>
            <span className="leading-tight text-center break-words font-extrabold text-rose-100">
              {lang === 'my' ? '- ထွက်ငွေမှတ်မည်' : '- Add Expense'}
            </span>
          </button>

          {/* Add Debt Button */}
          <button
            type="button"
            onClick={onAddDebt}
            className="w-full flex flex-col items-center justify-center gap-1.5 px-2 py-3 sm:py-3.5 rounded-2xl text-[11px] min-[380px]:text-xs sm:text-sm font-bold text-amber-950 bg-amber-400 hover:bg-amber-300 transition-all cursor-pointer active:scale-95 shadow-sm h-full min-h-[76px] sm:min-h-[84px] leading-tight select-none border border-amber-300/50 text-center"
            title={lang === 'my' ? 'အကြွေး မှတ်မည်' : 'Add Debt'}
          >
            <div className="w-6 h-6 rounded-lg bg-amber-950/15 flex items-center justify-center shrink-0">
              <HandCoins className="w-4 h-4 stroke-[2.5] text-amber-950" />
            </div>
            <span className="leading-tight text-center break-words font-extrabold text-amber-950">
              {lang === 'my' ? '🤝 အကြွေးမှတ်မည်' : '🤝 Add Debt'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Backward-compatibility alias
export const ClayRocketIllustration = FinancialOverviewBanner;

/**
 * Clean, eye-friendly financial insight cards
 * Soft, comfortable background with crisp Lucide icons and clean metrics.
 */
export const FinancialInsightCard: React.FC<{
  type: 'alpha' | 'robot' | 'avatar' | 'clipboard';
  title: string;
  subtitle: string;
  badge?: string;
  active?: boolean;
  onClick?: () => void;
}> = ({ type, title, subtitle, badge, active, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`group cursor-pointer p-4 sm:p-4.5 rounded-2xl transition-all duration-200 relative overflow-hidden select-none border ${
        active
          ? 'bg-white border-slate-400 shadow-sm ring-2 ring-slate-900/5'
          : 'bg-white hover:bg-slate-50/80 border-slate-200/80 shadow-xs hover:border-slate-300'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        {/* Soft, eye-pleasing Icon Badges */}
        {type === 'alpha' && (
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
            <PiggyBank className="w-5 h-5" />
          </div>
        )}

        {type === 'robot' && (
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100">
            <TrendingUp className="w-5 h-5" />
          </div>
        )}

        {type === 'avatar' && (
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100">
            <HandCoins className="w-5 h-5" />
          </div>
        )}

        {type === 'clipboard' && (
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200/80">
            <ReceiptText className="w-5 h-5" />
          </div>
        )}

        {badge && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/60">
            {badge}
          </span>
        )}
      </div>

      <div className="space-y-1">
        <h4 className="font-bold text-xs sm:text-sm text-slate-800 tracking-tight">
          {title}
        </h4>
        <div className="text-xs font-semibold text-slate-600">
          {subtitle}
        </div>
      </div>
    </div>
  );
};

// Backward-compatibility alias
export const ClayCategoryCard = FinancialInsightCard;

/**
 * Clean, modern floating action button for quick adds on mobile
 */
export const FloatingAddButton: React.FC<{
  onClick: () => void;
  lang?: 'my' | 'en';
  label?: string;
}> = ({ onClick, lang = 'my' }) => {
  return (
    <button
      id="floating-quick-add-btn"
      onClick={onClick}
      className="relative -mt-6 group cursor-pointer active:scale-95 transition-all duration-200"
      title={lang === 'my' ? 'စာရင်း အမြန်ထည့်မည်' : 'Quick Add'}
    >
      <div className="w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-md hover:shadow-lg border-2 border-white transition-all">
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </div>
    </button>
  );
};

// Backward-compatibility alias
export const ClayFloatingCoinButton = FloatingAddButton;
