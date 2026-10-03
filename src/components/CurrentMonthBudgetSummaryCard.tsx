import React from 'react';
import { PieChart, TrendingUp, AlertTriangle, CheckCircle2, Wallet, Layers } from 'lucide-react';
import { Budget, Category, Transaction } from '../types';
import { formatMMK } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';

interface CurrentMonthBudgetSummaryCardProps {
  budgets: Budget[];
  categories: Category[];
  transactions: Transaction[];
  lang: 'my' | 'en';
}

export const CurrentMonthBudgetSummaryCard: React.FC<CurrentMonthBudgetSummaryCardProps> = ({
  budgets,
  categories,
  transactions,
  lang,
}) => {
  // Determine current year and month (YYYY-MM)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  const currentYearMonth = `${currentYear}-${currentMonth}`;

  const catMap = new Map<string, Category>();
  categories.forEach((c) => catMap.set(c.id, c));

  // Calculate actual spending for each category in the current month
  const categorySpending = React.useMemo(() => {
    const spendingMap = new Map<string, number>();
    transactions.forEach((t) => {
      if (t.type === 'expense' && t.date && t.date.startsWith(currentYearMonth)) {
        const amt = Number(t.amount) || 0;
        const cur = spendingMap.get(t.category) || 0;
        spendingMap.set(t.category, cur + amt);
      }
    });
    return spendingMap;
  }, [transactions, currentYearMonth]);

  // Total budget and total actual spending
  const totalBudget = budgets.reduce((sum, b) => sum + (Number(b.value) || 0), 0);
  const totalActual = Array.from(categorySpending.values()).reduce((sum, val) => sum + val, 0);
  const overallPercent = totalBudget > 0 ? Math.min(150, Math.round((totalActual / totalBudget) * 100)) : 0;

  if (budgets.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
            <PieChart className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>{lang === 'my' ? 'ယခုလ ဘတ်ဂျက် နှင့် သုံးစွဲမှု' : 'Current Month Budget vs Actual'}</span>
          </div>
        </div>
        <div className="text-center py-6 text-slate-400 text-xs space-y-1">
          <p>{lang === 'my' ? 'ယခုလအတွက် သတ်မှတ်ထားသော ဘတ်ဂျက် မရှိသေးပါ။' : 'No budget configured for this month.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-slate-900">
          <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <PieChart className="w-4 h-4" />
          </div>
          <div>
            <span>{lang === 'my' ? 'ယခုလ ဘတ်ဂျက် vs အမှန်တကယ်သုံးစွဲမှု' : 'Monthly Budget vs Actual'}</span>
            <div className="text-[10px] text-slate-400 font-normal">
              {currentYearMonth} • {budgets.length} {lang === 'my' ? 'ခု သတ်မှတ်ထားသည်' : 'categories budgeted'}
            </div>
          </div>
        </div>

        <div className="text-right">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            overallPercent > 100
              ? 'bg-rose-100 text-rose-800'
              : overallPercent > 80
              ? 'bg-amber-100 text-amber-900'
              : 'bg-emerald-100 text-emerald-800'
          }`}>
            {overallPercent}% {lang === 'my' ? 'သုံးပြီး' : 'used'}
          </span>
        </div>
      </div>

      {/* Overall Progress Bar */}
      <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
          <span>{lang === 'my' ? 'စုစုပေါင်း ဘတ်ဂျက် အသုံးပြုမှု' : 'Total Budget Usage'}</span>
          <span className="font-mono">
            {formatMMK(totalActual)} / {formatMMK(totalBudget)}
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-slate-200 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              overallPercent > 100
                ? 'bg-rose-600'
                : overallPercent > 80
                ? 'bg-amber-500'
                : 'bg-indigo-600'
            }`}
            style={{ width: `${Math.min(100, overallPercent)}%` }}
          />
        </div>
      </div>

      {/* Per-Category Budget Progress Bars */}
      <div className="space-y-3 pt-1">
        {budgets.map((b) => {
          const cat = catMap.get(b.categoryId);
          const budgeted = Number(b.value) || 0;
          const actual = categorySpending.get(b.categoryId) || 0;
          const percent = budgeted > 0 ? Math.min(150, Math.round((actual / budgeted) * 100)) : 0;
          const isOver = actual > budgeted;

          return (
            <div key={b.categoryId} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-white shrink-0 text-xs shadow-2xs"
                    style={{ backgroundColor: cat?.color || '#6366F1' }}
                  >
                    <CategoryIcon name={cat?.icon || 'Tag'} className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-bold text-slate-900 truncate">
                    {lang === 'my' ? cat?.name : cat?.nameEn || b.categoryId}
                  </span>
                </div>

                <div className="text-right font-mono text-[11px] shrink-0 font-medium">
                  <span className={isOver ? 'text-rose-600 font-bold' : 'text-slate-800'}>
                    {formatMMK(actual)}
                  </span>
                  <span className="text-slate-400"> / {formatMMK(budgeted)}</span>
                  <span className={`ml-1.5 font-bold ${isOver ? 'text-rose-600' : 'text-slate-500'}`}>
                    ({percent}%)
                  </span>
                </div>
              </div>

              {/* Progress bar per category */}
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    percent > 100
                      ? 'bg-rose-600'
                      : percent > 80
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, percent)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
