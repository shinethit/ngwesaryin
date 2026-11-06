import React from 'react';
import { TrendingUp, PiggyBank, HandCoins, ReceiptText, Plus } from 'lucide-react';

/**
 * Clean, eye-friendly financial insight cards
 * Soft, comfortable background with crisp Lucide icons and clean metrics.
 */
export const FinancialInsightCard: React.FC<{
  type: 'alpha' | 'robot' | 'avatar' | 'clipboard';
  title: string;
  subtitle: string;
  subtitleTitle?: string;
  badge?: string;
  active?: boolean;
  onClick?: () => void;
}> = ({ type, title, subtitle, subtitleTitle, badge, active, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`group cursor-pointer p-3 sm:p-4.5 rounded-2xl transition-all duration-200 relative overflow-hidden select-none border ${
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
        <div className="text-[11px] sm:text-xs font-semibold text-slate-600 truncate" title={subtitleTitle ?? subtitle}>
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
}> = ({ onClick, lang = 'my' }) => {
  // [v7.5.55] Icon-only 48px circle (the label prop was dead and rendering
  // it as a pill would make this the big labelled add button the user
  // rejected — the label stays in the title attribute only).
  return (
    <button
      id="floating-quick-add-btn"
      onClick={onClick}
      className="relative -mt-6 group cursor-pointer active:scale-95 transition-all duration-200 flex items-center justify-center w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg border-2 border-white"
      title={lang === 'my' ? 'စာရင်း အမြန်ထည့်မည်' : 'Quick Add'}
    >
      <Plus className="w-5 h-5 stroke-[2.5]" />
    </button>
  );
};

// Backward-compatibility alias
export const ClayFloatingCoinButton = FloatingAddButton;
