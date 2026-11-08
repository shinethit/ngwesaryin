import React from 'react';
import { PieChart } from 'lucide-react';
import { Budget, Category, Transaction, UNBUDGETED_CATEGORY_ID, Wallet, getBudgetCategoryIds } from '../types';
import { formatMMK, formatLakhs } from '../utils/formatters';
import { convertToMMK } from '../utils/currency';
import { CategoryIcon } from './CategoryIcon';
import { buildWalletMap, isWalletMatch, isTransferTransaction } from '../utils/walletBalance';

interface CurrentMonthBudgetSummaryCardProps {
  budgets: Budget[];
  categories: Category[];
  transactions: Transaction[];
  wallets?: Wallet[];
  lang: 'my' | 'en';
}

export const CurrentMonthBudgetSummaryCard: React.FC<CurrentMonthBudgetSummaryCardProps> = ({
  budgets,
  categories,
  transactions,
  wallets = [],
  lang,
}) => {
  // Determine current year and month (YYYY-MM)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  const currentYearMonth = `${currentYear}-${currentMonth}`;

  const catMap = new Map<string, Category>();
  categories.forEach((c) => catMap.set(c.id, c));
  const walletMap = React.useMemo(() => buildWalletMap(wallets), [wallets]);

  // [v7.5.55 D2/D19] Reuse the Budget detail view's math exactly, so the card
  // and the detail can never disagree again:
  //  - % budgets are % of THIS month's income (20% is NOT 20 MMK)
  //  - General pool = spending in categories with NO explicit budget
  //  - totals count BUDGETED spending only (not every expense category)
  //  - amounts converted to MMK, transfers excluded
  //  - [v7.5.74] per-budget math is UNSCOPED, like the detail view: a %
  //    budget's base is the income of ITS OWN wallet(s) and spent counts
  //    that wallet's spending in every scope — a Separate-wallet budget
  //    no longer gets a different limit/spent here than in the detail view
  //    (the old Included-scope monthlyIncome base is gone)
  //  - near-limit threshold >= 80; percent is null (shown as "—") when the
  //    limit is 0 and spending > 0, and is never capped at 150
  // [v7.5.74] Unscoped month transactions, like the detail view's
  // monthTransactionsAll: per-budget math filters by the budget's own
  // wallet only — never by the Included/Separate scope.
  const monthTransactionsAll = React.useMemo(() => {
    return transactions.filter((t) => t.date && t.date.startsWith(currentYearMonth));
  }, [transactions, currentYearMonth]);

  const convertTxToMMK = React.useCallback((t: Transaction) => {
    let w = walletMap.get(t.walletId);
    if (!w) w = wallets.find((wall) => isWalletMatch(wall, t.walletId));
    return convertToMMK(t.amount, w?.currency, w?.exchangeRate);
  }, [walletMap, wallets]);

  // [v7.5.74] A multi-category budget covers every category in its
  // resolved list — all of them are excluded from the General pool.
  const explicitBudgetedCatIds = new Set(
    budgets.flatMap((b) => getBudgetCategoryIds(b)).filter((id) => id !== UNBUDGETED_CATEGORY_ID)
  );

  // Per-budget limit/spent, identical to BudgetAnalyticsView.
  const budgetRows = budgets.map((b) => {
    const isGeneral = b.categoryId === UNBUDGETED_CATEGORY_ID;
    // [v7.5.74] Multi-category budget: spend sums across ALL included
    // categories (primary categoryId alone for legacy single budgets).
    const budgetCatIds = getBudgetCategoryIds(b);
    const isMulti = !isGeneral && budgetCatIds.length > 1;
    let spent = 0;
    monthTransactionsAll
      .filter((t) => t.type === 'expense' && !isTransferTransaction(t))
      .forEach((t) => {
        const targetW = b.walletId && b.walletId !== 'all' ? walletMap.get(b.walletId) : undefined;
        const matchesWallet =
          !b.walletId || b.walletId === 'all' ||
          (targetW ? isWalletMatch(targetW, t.walletId) : t.walletId === b.walletId);
        if (!matchesWallet) return;
        const amtMMK = convertTxToMMK(t);
        if (isGeneral) {
          if (!explicitBudgetedCatIds.has(t.category)) spent += amtMMK;
        } else if (budgetCatIds.includes(t.category)) {
          spent += amtMMK;
        }
      });
    // [v7.5.74] Same per-budget wallet-scoped income base as the detail
    // view: income of the budget's own wallet(s) only (unscoped).
    const budgetBaseIncome = monthTransactionsAll
      .filter((t) => {
        if (t.type !== 'income' || isTransferTransaction(t)) return false;
        if (!b.walletId || b.walletId === 'all') return true;
        const targetW = walletMap.get(b.walletId);
        return targetW ? isWalletMatch(targetW, t.walletId) : t.walletId === b.walletId;
      })
      .reduce((sum, t) => sum + convertTxToMMK(t), 0);
    const limitMMK = b.calcType === 'percentage'
      ? Math.round((budgetBaseIncome * b.value) / 100)
      : b.value;
    // [v7.5.55 D10] limit 0 with spending > 0 is OVER budget (no income to
    // base the % on) — never green "Within Budget". [v7.5.74] percent is
    // null there — no % exists, so none is shown (never a fabricated 150%);
    // no 150 cap when limit > 0, so real 200% displays as 200%.
    const noIncomeBase = limitMMK === 0 && spent > 0;
    const percent: number | null = limitMMK > 0 ? Math.round((spent / limitMMK) * 100) : (spent > 0 ? null : 0);
    const isOver = spent > limitMMK;
    const isNear = limitMMK > 0 && percent !== null && percent >= 80 && !isOver;
    return { budget: b, isGeneral, budgetCatIds, isMulti, spent, limitMMK, percent, isOver, isNear, noIncomeBase };
  });

  // Total budget and total actual spending (budgeted categories only)
  const totalBudget = budgetRows.reduce((sum, r) => sum + r.limitMMK, 0);
  const totalActual = budgetRows.reduce((sum, r) => sum + r.spent, 0);
  const overallPercent: number | null = totalBudget > 0 ? Math.round((totalActual / totalBudget) * 100) : (totalActual > 0 ? null : 0);
  const overallNoIncomeBase = totalBudget === 0 && totalActual > 0;
  const overallIsOver = totalActual > totalBudget;

  // [v7.5.60 N7] Month name, not "2026-11" — every other card shows a
  // month name. Hardcoded Myanmar names (some phones lack 'my-MM').
  const monthsMy = ['ဇန်နဝါရီ', 'ဖေဖော်ဝါရီ', 'မတ်', 'ဧပြီ', 'မေ', 'ဇွန်', 'ဇူလိုင်', 'သြဂုတ်', 'စက်တင်ဘာ', 'အောက်တိုဘာ', 'နိုဝင်ဘာ', 'ဒီဇင်ဘာ'];
  const monthsEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const currentMonthLabel = lang === 'my'
    ? `${monthsMy[now.getMonth()]} ${currentYear}`
    : `${monthsEn[now.getMonth()]} ${currentYear}`;

  if (budgets.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
            <PieChart className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>{lang === 'my' ? 'ယခုလ ဘတ်ဂျက် နှင့် သုံးစွဲမှု' : 'Current Month Budget vs Actual'}</span>
          </div>
        </div>
        <div className="text-center py-6 text-slate-400 text-xs space-y-3">
          <p>{lang === 'my' ? 'ယခုလအတွက် သတ်မှတ်ထားသော ဘတ်ဂျက် မရှိသေးပါ။' : 'No budget configured for this month.'}</p>
          {/* [v7.5.60 S11] Point at the budget editor below (the Budget
              tab's own section) instead of leaving a dead end. */}
          <button
            type="button"
            onClick={() => document.getElementById('subtab-budgets')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="min-h-11 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer"
          >
            {lang === 'my' ? '💰 ဘတ်ဂျက် သတ်မှတ်မည်' : '💰 Set a Budget'}
          </button>
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
              {currentMonthLabel} • {budgets.length} {lang === 'my' ? 'ခု သတ်မှတ်ထားသည်' : 'categories budgeted'}
            </div>
          </div>
        </div>

        <div className="text-right">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            overallIsOver
              ? 'bg-rose-100 text-rose-800'
              : overallPercent !== null && overallPercent >= 80
              ? 'bg-amber-100 text-amber-900'
              : 'bg-emerald-100 text-emerald-800'
          }`}>
            {overallNoIncomeBase
              ? (lang === 'my' ? 'ဝင်ငွေမရှိ' : 'No income base')
              : `${overallPercent}% ${lang === 'my' ? 'သုံးပြီး' : 'used'}`}
          </span>
        </div>
      </div>

      {/* Overall Progress Bar */}
      <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
          <span>{lang === 'my' ? 'စုစုပေါင်း ဘတ်ဂျက် အသုံးပြုမှု' : 'Total Budget Usage'}</span>
          <span className="font-mono" title={`${formatMMK(totalActual)} / ${formatMMK(totalBudget)}`}>
            {formatLakhs(totalActual, lang)} / {formatLakhs(totalBudget, lang)}
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-slate-200 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              overallIsOver
                ? 'bg-rose-600'
                : overallPercent !== null && overallPercent >= 80
                ? 'bg-amber-500'
                : 'bg-indigo-600'
            }`}
            style={{ width: `${overallPercent === null ? 100 : Math.min(100, overallPercent)}%` }}
          />
        </div>
      </div>

      {/* Per-Category Budget Progress Bars */}
      <div className="space-y-3 pt-1">
        {budgetRows.map(({ budget: b, isGeneral, budgetCatIds, isMulti, spent: actual, limitMMK: budgeted, percent, isOver, isNear, noIncomeBase }) => {
          const cat = isGeneral ? undefined : catMap.get(b.categoryId);
          // [v7.5.74] Multi-category budget: show the grouped category
          // names joined, so the row reads as one grouped budget.
          const displayName = isGeneral
            ? (lang === 'my' ? 'အထွေထွေ (အခြား အသုံးစရိတ်များ)' : 'General & Others')
            : isMulti
            ? budgetCatIds.map((id) => {
                const c = catMap.get(id);
                return lang === 'my' ? c?.name || id : c?.nameEn || id;
              }).join(' + ')
            : (lang === 'my' ? cat?.name : cat?.nameEn || b.categoryId);

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
                    {displayName}
                  </span>
                  {noIncomeBase && (
                    <span className="text-[10px] font-bold text-rose-600 shrink-0 mr-1.5">
                      {lang === 'my' ? 'ဝင်ငွေမရှိ' : 'No income'}
                    </span>
                  )}
                </div>

                <div className="text-right font-mono text-[11px] shrink-0 font-medium" title={`${formatMMK(actual)} / ${formatMMK(budgeted)}`}>
                  <span className={isOver ? 'text-rose-600 font-bold' : 'text-slate-800'}>
                    {formatLakhs(actual, lang)}
                  </span>
                  <span className="text-slate-400"> / {formatLakhs(budgeted, lang)}</span>
                  <span className={`ml-1.5 font-bold ${isOver ? 'text-rose-600' : 'text-slate-500'}`}>
                    ({percent === null ? '—' : `${percent}%`})
                  </span>
                </div>
              </div>

              {/* Progress bar per category */}
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    percent === null || percent > 100
                      ? 'bg-rose-600'
                      : percent !== null && percent >= 80
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${percent === null ? 100 : Math.min(100, percent)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
