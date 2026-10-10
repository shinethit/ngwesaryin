import React from 'react';
import { X, Sparkles, Info, CheckCircle2, ChevronRight, Flame } from 'lucide-react';
import {
  FinancialHealthResult,
  FINANCIAL_HEALTH_TIERS,
} from '../utils/financialHealth';
import { formatMMK } from '../utils/formatters';

interface FinancialHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
  health: FinancialHealthResult;
  lang: 'my' | 'en';
  onNavigateToAnalytics?: () => void;
  onNavigateToBudgets?: () => void;
}

export const FinancialHealthModal: React.FC<FinancialHealthModalProps> = ({
  isOpen,
  onClose,
  health,
  lang,
  onNavigateToAnalytics,
  onNavigateToBudgets,
}) => {
  if (!isOpen) return null;

  const { theme, metrics } = health;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header with Dynamic Tier Gradient / Ambient Color */}
        <div
          className={`p-5 sm:p-6 transition-all border-b relative ${
            health.tier === 'negative'
              ? 'bg-gradient-to-r from-slate-950 via-slate-900 to-rose-950 text-white border-rose-900/60'
              : health.tier === 'super_surplus'
              ? 'bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-800 text-white border-purple-800'
              : health.tier === 'perfect'
              ? 'bg-gradient-to-r from-emerald-800 to-teal-900 text-white border-emerald-700'
              : health.tier === 'good'
              ? 'bg-gradient-to-r from-lime-800 to-emerald-900 text-white border-lime-700'
              : health.tier === 'moderate'
              ? 'bg-gradient-to-r from-amber-800 to-yellow-900 text-white border-amber-700'
              : health.tier === 'caution'
              ? 'bg-gradient-to-r from-orange-800 to-amber-900 text-white border-orange-700'
              : 'bg-gradient-to-r from-rose-900 to-red-950 text-white border-rose-800'
          }`}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white/90 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 text-2xl shadow-md border ${
                health.tier === 'negative'
                  ? 'bg-rose-950 text-rose-300 border-rose-700 animate-pulse'
                  : 'bg-white/15 backdrop-blur-md text-white border-white/20'
              }`}
            >
              {health.emoji}
            </div>

            <div className="space-y-1 pr-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/20">
                  {lang === 'my' ? health.colorName.my : health.colorName.en}
                </span>
                <span className="text-xs font-bold text-white/80">
                  {lang === 'my' ? 'ငွေကြေးကျန်းမာမှု အဆင့်' : 'Health Score Tier'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <span>{lang === 'my' ? health.statusText.my : health.statusText.en}</span>
              </h2>
              <p className="text-xs sm:text-sm text-white/80 leading-relaxed font-medium">
                {lang === 'my' ? health.summary.my : health.summary.en}
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-slate-800">
          {/* Real-time Financial Metrics Grid */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>{lang === 'my' ? 'လက်ရှိ ငွေကြေးအခြေအနေ စာရင်းအင်းများ' : 'Current Financial Standing'}</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[11px] text-slate-500 font-semibold block mb-0.5">
                  {lang === 'my' ? 'စုစုပေါင်း ဝင်ငွေ' : 'Total Income'}
                </span>
                <span className="text-sm font-bold text-emerald-600">
                  {formatMMK(metrics.totalIncome)} Ks
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[11px] text-slate-500 font-semibold block mb-0.5">
                  {lang === 'my' ? 'စုစုပေါင်း အသုံး' : 'Total Expense'}
                </span>
                <span className="text-sm font-bold text-rose-600">
                  {formatMMK(metrics.totalExpense)} Ks
                </span>
              </div>

              <div className={`p-3 rounded-2xl border ${
                metrics.netSavings < 0
                  ? 'bg-rose-50 border-rose-200'
                  : 'bg-emerald-50 border-emerald-200'
              }`}>
                <span className="text-[11px] text-slate-600 font-semibold block mb-0.5">
                  {lang === 'my' ? 'ပိုလျှံ / အရှုံး' : 'Net Savings'}
                </span>
                <span className={`text-sm font-black ${
                  metrics.netSavings < 0 ? 'text-rose-700' : 'text-emerald-700'
                }`}>
                  {metrics.netSavings < 0 ? '-' : '+'}{formatMMK(Math.abs(metrics.netSavings))} Ks
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[11px] text-slate-500 font-semibold block mb-0.5">
                  {lang === 'my' ? 'ပေးရန် အကြွေး' : 'Payable Debt'}
                </span>
                <span className={`text-sm font-bold ${
                  metrics.totalPayableDebt > 0 ? 'text-amber-700' : 'text-slate-700'
                }`}>
                  {formatMMK(metrics.totalPayableDebt)} Ks
                </span>
              </div>
            </div>
          </div>

          {/* Advice Box */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-start gap-3 text-xs leading-relaxed text-indigo-950">
            <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-indigo-900 mb-0.5">
                {lang === 'my' ? '💡 အကြံပြုချက် (Recommendation)' : '💡 Recommendation'}
              </span>
              <p className="text-indigo-800">
                {lang === 'my' ? health.advice.my : health.advice.en}
              </p>
            </div>
          </div>

          {/* Gamified 7-Color Tier Spectrum Guide (စိတ်လှုပ်ရှားဖွယ် အရောင် ၇ မျိုး သတ်မှတ်ချက်) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-500" />
                <span>
                  {lang === 'my'
                    ? 'ငွေကြေးကျန်းမာမှု အရောင် ၇ မျိုး သတ်မှတ်ချက်'
                    : 'The 7-Color Health Tier Spectrum'}
                </span>
              </h3>
              <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-full">
                {lang === 'my' ? 'တိုက်ရိုက်စစ်ဆေးမှု' : 'Live Health Rules'}
              </span>
            </div>

            <div className="space-y-2 border border-slate-200/80 rounded-2xl p-2.5 bg-slate-50/50">
              {FINANCIAL_HEALTH_TIERS.map((item) => {
                const isCurrent = health.tier === item.tier;

                return (
                  <div
                    key={item.tier}
                    className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                      isCurrent
                        ? item.tier === 'negative'
                          ? 'bg-slate-950 text-white border-rose-500 shadow-md ring-2 ring-rose-500/50'
                          : item.tier === 'super_surplus'
                          ? 'bg-purple-100/90 border-purple-400 shadow-sm ring-2 ring-purple-400/40'
                          : 'bg-white border-indigo-500 shadow-sm ring-2 ring-indigo-500/30'
                        : 'bg-white/80 border-slate-200/60 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className="text-xl shrink-0 mt-0.5">{item.emoji}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span
                            className={`text-xs font-black ${
                              isCurrent && item.tier === 'negative'
                                ? 'text-rose-400'
                                : 'text-slate-900'
                            }`}
                          >
                            {lang === 'my' ? item.rangeLabel.my : item.rangeLabel.en}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.badgeClass}`}
                          >
                            {lang === 'my' ? item.colorName.my : item.colorName.en}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-600 text-white shadow-2xs flex items-center gap-1 animate-pulse">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{lang === 'my' ? 'လက်ရှိအဆင့်' : 'Your Tier'}</span>
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-xs leading-relaxed font-medium ${
                            isCurrent && item.tier === 'negative'
                              ? 'text-slate-300'
                              : 'text-slate-600'
                          }`}
                        >
                          {lang === 'my' ? item.description.my : item.description.en}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              onClose();
              onNavigateToAnalytics?.();
            }}
            className="text-xs font-bold text-indigo-700 hover:text-indigo-900 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>{lang === 'my' ? 'ဘတ်ဂျက်နှင့် စာရင်းအင်းသို့ သွားမည်' : 'View Full Analytics'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs"
          >
            {lang === 'my' ? 'ပိတ်မည်' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
