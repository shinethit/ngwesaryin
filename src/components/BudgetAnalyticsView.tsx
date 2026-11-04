import React, { useState } from 'react';
import { Sparkles, Lock, PieChart, TrendingDown, AlertTriangle, CheckCircle, Plus, ArrowRight, ShieldAlert, Edit2, Trash2, Percent, Banknote, Wallet as WalletIcon, Layers, ChevronDown, ChevronUp, Calendar, ArrowUpDown } from 'lucide-react';
import { BudgetConfig, Category, PlanType, Transaction, UNBUDGETED_CATEGORY_ID, Wallet } from '../types';
import { formatMMK, formatLakhs } from '../utils/formatters';
import { convertToMMK } from '../utils/currency';
import { CategoryIcon } from './CategoryIcon';
import { BudgetModal } from './BudgetModal';
import { SpendingComparisonView } from './SpendingComparisonView';
import { FinancialHealthModal } from './FinancialHealthModal';
import { calculateFinancialHealth } from '../utils/financialHealth';
import { buildWalletMap, getMatchingWalletIds, isWalletMatch, isTransferTransaction } from '../utils/walletBalance';

interface BudgetAnalyticsViewProps {
  transactions: Transaction[];
  categories: Category[];
  wallets: Wallet[];
  budgets: BudgetConfig[];
  plan: PlanType;
  lang: 'my' | 'en';
  maxBudgetCategories: number;
  onAddBudget: (config: BudgetConfig) => void;
  onUpdateBudget: (config: BudgetConfig) => void;
  onDeleteBudget: (categoryId: string) => void;
  onOpenUpgradeModal: () => void;
}

export const BudgetAnalyticsView: React.FC<BudgetAnalyticsViewProps> = ({
  transactions,
  categories,
  wallets,
  budgets,
  plan,
  lang,
  maxBudgetCategories,
  onAddBudget,
  onUpdateBudget,
  onDeleteBudget,
  onOpenUpgradeModal,
}) => {
  const [subTab, setSubTab] = useState<'budgets' | 'comparison'>('budgets');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetConfig | null>(null);
  const [expandedGeneral, setExpandedGeneral] = useState(false);
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);
  // [v7.5.60 S-47] App-styled delete confirm (replaces window.confirm).
  const [confirmDeleteCategoryId, setConfirmDeleteCategoryId] = useState<string | null>(null);

  const includedWalletIds = React.useMemo(
    () => getMatchingWalletIds(wallets.filter((w) => w.includeInTotals !== false)),
    [wallets]
  );
  const excludedWalletIds = React.useMemo(
    () => getMatchingWalletIds(wallets.filter((w) => w.includeInTotals === false)),
    [wallets]
  );
  const hasExcludedWallets = excludedWalletIds.size > 0;
  const [walletScope, setWalletScope] = useState<'all' | 'included' | 'separate'>('included');

  // Month & wallet scope filters
  const monthTransactions = React.useMemo(() => {
    return transactions.filter((t) => {
      if (!t.date.startsWith(selectedMonth)) return false;
      if (hasExcludedWallets) {
        if (walletScope === 'included') return includedWalletIds.has(t.walletId);
        if (walletScope === 'separate') return excludedWalletIds.has(t.walletId);
      }
      return true;
    });
  }, [transactions, selectedMonth, walletScope, hasExcludedWallets, includedWalletIds, excludedWalletIds]);

  // [v7.5.60 M-13] Per-budget math NEVER uses the scope filter — a budget
  // linked to a Separate wallet showed spent 0 while scope was
  // 'Included'. Only the budget's own walletId filters here; the scope
  // toggle affects the summary cards (monthlyIncome/monthlyExpense)
  // above, never the per-budget numbers below.
  const monthTransactionsAll = React.useMemo(() => {
    return transactions.filter((t) => t.date.startsWith(selectedMonth));
  }, [transactions, selectedMonth]);

  const walletMap = React.useMemo(() => buildWalletMap(wallets), [wallets]);
  const catMap = React.useMemo(() => new Map<string, Category>(categories.map((c) => [c.id, c])), [categories]);

  const convertTxToMMK = React.useCallback(
    (t: Transaction) => {
      let w = walletMap.get(t.walletId);
      if (!w) {
        w = wallets.find((wall) => isWalletMatch(wall, t.walletId));
      }
      return convertToMMK(t.amount, w?.currency, w?.exchangeRate);
    },
    [walletMap, wallets]
  );

  const monthlyIncome = monthTransactions
    .filter((t) => t.type === 'income' && !isTransferTransaction(t))
    .reduce((sum, t) => sum + convertTxToMMK(t), 0);
  const monthlyExpense = monthTransactions
    .filter((t) => t.type === 'expense' && !isTransferTransaction(t))
    .reduce((sum, t) => sum + convertTxToMMK(t), 0);

  // [v7.5.60] BudgetModal % preview must NOT use the scope toggle -
  // the saved % limit is computed from the budget's own wallet(s),
  // so the preview uses the same unscoped all-wallets month income.
  // (Approximation: the modal shows one income number, not the
  // per-wallet base - the saved limit math itself is wallet-based.)
  const monthlyIncomeAllWallets = monthTransactionsAll
    .filter((t) => t.type === 'income' && !isTransferTransaction(t))
    .reduce((sum, t) => sum + convertTxToMMK(t), 0);

  const healthResult = React.useMemo(() => {
    return calculateFinancialHealth(monthlyIncome, monthlyExpense);
  }, [monthlyIncome, monthlyExpense]);

  // Budgeted explicit category IDs (excluding UNBUDGETED_CATEGORY_ID)
  const explicitBudgetedCatIds = new Set(
    budgets
      .map((b) => b.categoryId)
      .filter((id) => id !== UNBUDGETED_CATEGORY_ID)
  );

  // Unbudgeted expense categories
  const unbudgetedCategories = categories.filter(
    (c) => c.type === 'expense' && !explicitBudgetedCatIds.has(c.id)
  );

  // Calculate spent and limit for each configured budget
  const budgetCalculations = budgets.map((b) => {
    const isGeneral = b.categoryId === UNBUDGETED_CATEGORY_ID;
    let spent = 0;
    const breakdown: Record<string, number> = {};

    monthTransactionsAll
      .filter((t) => t.type === 'expense' && !isTransferTransaction(t))
      .forEach((t) => {
        const targetW = b.walletId && b.walletId !== 'all' ? walletMap.get(b.walletId) : undefined;
        const matchesWallet =
          !b.walletId ||
          b.walletId === 'all' ||
          (targetW ? isWalletMatch(targetW, t.walletId) : t.walletId === b.walletId);
        if (!matchesWallet) return;

        const amtMMK = convertTxToMMK(t);
        if (isGeneral) {
          if (!explicitBudgetedCatIds.has(t.category)) {
            spent += amtMMK;
            breakdown[t.category] = (breakdown[t.category] || 0) + amtMMK;
          }
        } else {
          if (t.category === b.categoryId) {
            spent += amtMMK;
          }
        }
      });

    // [v7.5.60 M-13] A % budget's income base is the income of ITS OWN
    // wallet(s) only (unscoped) — the scope toggle must not move a
    // budget's limit. walletId 'all'/unset = income across all wallets.
    const budgetBaseIncome = monthTransactionsAll
      .filter((t) => {
        if (t.type !== 'income' || isTransferTransaction(t)) return false;
        if (!b.walletId || b.walletId === 'all') return true;
        const targetW = walletMap.get(b.walletId);
        return targetW ? isWalletMatch(targetW, t.walletId) : t.walletId === b.walletId;
      })
      .reduce((sum, t) => sum + convertTxToMMK(t), 0);
    const limitMMK =
      b.calcType === 'percentage'
        ? Math.round((budgetBaseIncome * b.value) / 100)
        : b.value;

    // [v7.5.55 D10] A % budget with zero income has limit 0: any spending is
    // OVER budget (there is no income to base it on) — never green
    // "Within Budget". Percent capped at 150 like the summary card (D19).
    const noIncomeBase = limitMMK === 0 && spent > 0;
    const percent = limitMMK > 0 ? Math.min(150, Math.round((spent / limitMMK) * 100)) : (spent > 0 ? 150 : 0);
    const isOver = spent > limitMMK;
    const isNear = limitMMK > 0 && percent >= 80 && !isOver;

    return {
      budget: b,
      isGeneral,
      spent,
      limitMMK,
      budgetBaseIncome,
      percent,
      isOver,
      isNear,
      noIncomeBase,
      breakdown,
    };
  });

  const totalBudgetLimit = budgetCalculations.reduce(
    (sum, item) => sum + item.limitMMK,
    0
  );
  const totalBudgetSpent = budgetCalculations.reduce(
    (sum, item) => sum + item.spent,
    0
  );

  // [v7.5.60 N-17] % budgets summing past 100% of income means the caps
  // promise more than the month earns — warn, don't silently allow it.
  const totalPercentBudgets = budgets
    .filter((b) => b.calcType === 'percentage')
    .reduce((sum, b) => sum + (Number(b.value) || 0), 0);

  // Check if unbudgeted pool exists
  const hasGeneralBudget = budgets.some(
    (b) => b.categoryId === UNBUDGETED_CATEGORY_ID
  );

  // Unbudgeted total if no general budget is configured
  // [v7.5.55 D11] Convert to MMK and exclude transfers, like the per-budget
  // math above (was raw amounts, transfers included).
  const unbudgetedSpentWithoutGeneral = !hasGeneralBudget
    ? monthTransactionsAll
        .filter(
          (t) =>
            t.type === 'expense' && !isTransferTransaction(t) && !explicitBudgetedCatIds.has(t.category)
        )
        .reduce((sum, t) => sum + convertTxToMMK(t), 0)
    : 0;

  // [v7.5.55] maxBudgetCategories comes from DEFAULT_PLAN_LIMITS (free 5,
  // guest 0) via props — never hardcoded here.
  const isFreeAtLimit =
    (plan === 'free' || plan === 'guest') && budgets.length >= maxBudgetCategories;

  const handleOpenAdd = () => {
    if (isFreeAtLimit) {
      onOpenUpgradeModal();
      return;
    }
    setEditingBudget(null);
    setIsModalOpen(true);
  };

  const handleEdit = (b: BudgetConfig) => {
    setEditingBudget(b);
    setIsModalOpen(true);
  };

  const handleSaveModal = (config: BudgetConfig) => {
    if (editingBudget) {
      onUpdateBudget(config);
    } else {
      onAddBudget(config);
    }
  };

  // [v7.5.55] Hardcoded month names — 'my-MM' falls back to English on
  // phones whose browser does not ship the Myanmar locale.
  const formatMonthLabel = (m: string) => {
    const [year, month] = m.split('-');
    const monthIdx = parseInt(month, 10) - 1;
    const monthsMy = ['ဇန်နဝါရီ', 'ဖေဖော်ဝါရီ', 'မတ်', 'ဧပြီ', 'မေ', 'ဇွန်', 'ဇူလိုင်', 'သြဂုတ်', 'စက်တင်ဘာ', 'အောက်တိုဘာ', 'နိုဝင်ဘာ', 'ဒီဇင်ဘာ'];
    const monthsEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return lang === 'my' ? `${monthsMy[monthIdx]} ${year}` : `${monthsEn[monthIdx]} ${year}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Segmented Sub-Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
          <button
            type="button"
            id="subtab-budgets"
            onClick={() => setSubTab('budgets')}
            className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              subTab === 'budgets'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PieChart className="w-4 h-4 text-indigo-600" />
            <span>{lang === 'my' ? 'လစဉ် ဘတ်ဂျက် စီမံခန့်ခွဲမှု' : 'Budget Limits & Tracking'}</span>
          </button>
          <button
            type="button"
            id="subtab-comparison"
            onClick={() => setSubTab('comparison')}
            className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              subTab === 'comparison'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowUpDown className="w-4 h-4 text-emerald-600" />
            <span>{lang === 'my' ? 'ကာလအလိုက် သုံးစွဲမှု' : 'Spending Comparison'}</span>
          </button>
        </div>

        <div className="text-right px-2 hidden md:block">
          <span className="text-xs text-slate-400 font-medium">
            {subTab === 'budgets'
              ? lang === 'my'
                ? 'ကဏ္ဍအလိုက် ကန့်သတ်ချက်များ'
                : 'Active budget rules'
              : lang === 'my'
              ? 'ကာလနှစ်ခုကြား ကွာခြားချက်များ'
              : 'Delta analysis'}
          </span>
        </div>
      </div>

      {subTab === 'comparison' ? (
        <SpendingComparisonView
          transactions={transactions}
          categories={categories}
          wallets={wallets}
          plan={plan}
          lang={lang}
          onOpenUpgradeModal={onOpenUpgradeModal}
        />
      ) : (
        <>
          {/* Header & Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                  {lang === 'my' ? 'လစဉ် ဘတ်ဂျက် စီမံခန့်ခွဲမှု' : 'Monthly Budget Management'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                  <PieChart className="w-3.5 h-3.5 text-indigo-600" />
                  {lang === 'my' ? 'ဘတ်ဂျက် ထိန်းချုပ်စနစ်' : 'Budget Control'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                {lang === 'my'
                  ? 'ဝင်ငွေ၏ ရာခိုင်နှုန်း (%) သို့မဟုတ် သတ်မှတ်ငွေပမာဏ (MMK) ဖြင့် ကဏ္ဍအလိုက် ပိုက်ဆံအိတ်နှင့် ချိတ်ဆက်ကန့်သတ်ပါ'
                  : 'Limit expenses by % of income or fixed amount, linked to specific wallets'}
              </p>
            </div>

            {/* Month selector & Add budget button */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {hasExcludedWallets && (
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-xs">
                  <button
                    type="button"
                    onClick={() => setWalletScope('included')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      walletScope === 'included'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-emerald-700'
                    }`}
                  >
                    📊 {lang === 'my' ? 'ရောထားသည်' : 'Included'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setWalletScope('separate')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      walletScope === 'separate'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🚫 {lang === 'my' ? 'သီးသန့်' : 'Separate'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setWalletScope('all')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      walletScope === 'all'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🌟 {lang === 'my' ? 'အားလုံး' : 'All'}
                  </button>
                </div>
              )}

              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                <Calendar className="w-4 h-4 text-slate-500 ml-2" />
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent text-xs sm:text-sm font-semibold text-slate-800 p-1 border-0 focus:ring-0 cursor-pointer"
                />
              </div>

              <button
                id="btn-add-budget-cat"
                onClick={handleOpenAdd}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs active:scale-95 ${
                  isFreeAtLimit
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {isFreeAtLimit ? (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>{lang === 'my' ? 'ကဏ္ဍတိုးရန် PRO သို့မြှင့်ပါ' : 'Unlock More with PRO'}</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>{lang === 'my' ? '+ ဘတ်ဂျက်ကဏ္ဍ အသစ်ထည့်မည်' : '+ Add Budget Category'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

      {/* Plan & Category Quota Indicator */}
      <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700">
            {lang === 'my' ? 'ဘတ်ဂျက်ကဏ္ဍ အသုံးပြုမှု:' : 'Budget Categories Quota:'}
          </span>
          <span className="font-black px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-900">
            {budgets.length} / {plan !== 'premium' ? `${maxBudgetCategories} (${plan === 'guest' ? 'Guest' : 'Free Plan'})` : '∞ (Premium)'}
          </span>
          {plan !== 'premium' && (
            <span className="text-[11px] text-slate-500">
              {lang === 'my'
                ? `(${plan === 'guest' ? 'Guest' : 'Free'} အဆင့်တွင် ဘတ်ဂျက်ကဏ္ဍ အများဆုံး ${maxBudgetCategories} ခု သတ်မှတ်နိုင်ပါသည်)`
                : `(${plan === 'guest' ? 'Guest' : 'Free'} plan supports up to ${maxBudgetCategories} categories)`}
            </span>
          )}
        </div>

        {plan !== 'premium' ? (
          <button
            onClick={onOpenUpgradeModal}
            className="text-amber-700 hover:text-amber-800 font-bold flex items-center gap-1 text-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{lang === 'my' ? 'ကဏ္ဍ အကန့်အသတ်မရှိ သတ်မှတ်လိုပါက Premium' : 'Upgrade for unlimited categories'}</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        ) : (
          <span className="text-emerald-700 font-semibold flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>{lang === 'my' ? 'Premium ဖြင့် အကန့်အသတ်မရှိ ကဏ္ဍများ သတ်မှတ်နိုင်သည်' : 'Unlimited budget categories enabled'}</span>
          </span>
        )}
      </div>

      {/* Financial Health Status Banner (with 7-tier gamified color scale) */}
      <div
        onClick={() => setIsHealthModalOpen(true)}
        className={`p-4 sm:p-4.5 rounded-2xl border transition-all cursor-pointer shadow-xs active:scale-98 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${healthResult.theme.cardBg} ${healthResult.theme.cardBorder} ${healthResult.theme.glowEffect}`}
        title={lang === 'my' ? 'ငွေကြေးကျန်းမာမှု အသေးစိတ်ကြည့်ရန် နှိပ်ပါ' : 'Click to view Financial Health breakdown'}
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs text-xl ${healthResult.theme.iconBg}`}>
            {healthResult.emoji}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs sm:text-sm font-bold tracking-tight ${healthResult.theme.titleColor}`}>
                {lang === 'my' ? 'ယခုလ ငွေကြေးကျန်းမာမှု အဆင့်' : 'Monthly Financial Health'}
              </span>
              <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${healthResult.theme.badgeBg} ${healthResult.theme.badgeText}`}>
                {lang === 'my' ? healthResult.badgeText.my : healthResult.badgeText.en}
              </span>
            </div>
            <p className={`text-xs font-semibold truncate mt-0.5 ${healthResult.theme.subtitleColor}`}>
              {lang === 'my' ? healthResult.statusText.my : healthResult.statusText.en}
              {' • '}
              <span className="opacity-90">{lang === 'my' ? healthResult.summary.my : healthResult.summary.en}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <span className={`text-xs font-bold underline ${healthResult.theme.isDarkTheme ? 'text-rose-300' : 'text-indigo-600'}`}>
            {lang === 'my' ? 'အရောင် ၇ မျိုး အသေးစိတ် ❯' : '7 Tiers Details ❯'}
          </span>
        </div>
      </div>

      {/* Monthly Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Income Reference */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase">
            <span>{lang === 'my' ? 'ယခုလ ဝင်ငွေ (အခြေခံ)' : 'Monthly Income'}</span>
            <Percent className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-1" title={formatMMK(monthlyIncome)}>
            {formatLakhs(monthlyIncome, lang)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {lang === 'my'
              ? 'ရာခိုင်နှုန်း (%) ဘတ်ဂျက်များ၏ အခြေခံဝင်ငွေ'
              : 'Baseline for % of income budgets'}
          </p>
        </div>

        {/* Total Budget Limit */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase">
            <span>{lang === 'my' ? 'စုစုပေါင်း ဘတ်ဂျက်' : 'Total Budget Cap'}</span>
            <PieChart className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1" title={formatMMK(totalBudgetLimit)}>
            {formatLakhs(totalBudgetLimit, lang)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {budgets.length} {lang === 'my' ? 'ကဏ္ဍပေါင်းချုပ်' : 'categories combined'}
          </p>
        </div>

        {/* Total Actual Spent */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase">
            <span>{lang === 'my' ? 'ဘတ်ဂျက်အတွင်း သုံးစွဲပြီး' : 'Budgeted Spent'}</span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-600 mt-1" title={formatMMK(totalBudgetSpent)}>
            {formatLakhs(totalBudgetSpent, lang)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {totalBudgetLimit > 0
              ? `${Math.round((totalBudgetSpent / totalBudgetLimit) * 100)}% ${lang === 'my' ? 'သုံးစွဲပြီး' : 'used'}`
              : '0%'}
          </p>
        </div>

        {/* Budget Balance */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase">
            <span>{lang === 'my' ? 'ဘတ်ဂျက် လက်ကျန်ငွေ' : 'Budget Remaining'}</span>
            {totalBudgetLimit - totalBudgetSpent >= 0 ? (
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            )}
          </div>
          <div
            className={`text-2xl font-bold mt-1 ${
              totalBudgetLimit - totalBudgetSpent >= 0
                ? 'text-emerald-600'
                : 'text-rose-600'
            }`}
          >
            <span title={formatMMK(totalBudgetLimit - totalBudgetSpent)}>{formatLakhs(totalBudgetLimit - totalBudgetSpent, lang)}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {totalBudgetLimit - totalBudgetSpent >= 0
              ? (lang === 'my' ? 'ငွေပိုမထွက်ဘဲ ပုံမှန်ရှိသည်' : 'Safe cash flow')
              : (lang === 'my' ? 'ဘတ်ဂျက် ကျော်လွန်နေသည်' : 'Over budget overall')}
          </p>
        </div>
      </div>

      {/* [v7.5.60 N-17] % budgets total over 100% of monthly income. */}
      {totalPercentBudgets > 100 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-900">
              {lang === 'my'
                ? `ဘတ်ဂျက်စုစုပေါင်းက လစဉ်ဝင်ငွေထက် များနေပါသည် (${totalPercentBudgets}%)`
                : `Total budgets exceed monthly income (${totalPercentBudgets}%)`}
            </span>
            <p className="text-[11px] text-amber-800/80 mt-0.5">
              {lang === 'my'
                ? 'ရာခိုင်နှုန်း (%) ဘတ်ဂျက်များ ပေါင်းလိုက်ရင် ၁၀၀% ကျော်နေပါသည် — ဘတ်ဂျက်တစ်ခုချင်းစီကို ပြန်စစ်ပြီး လျှော့ချပါ။'
                : 'Your % budgets add up to more than 100% of income — review and lower one of them.'}
            </p>
          </div>
        </div>
      )}

      {/* Unbudgeted categories warning banner if no general pool configured */}
      {!hasGeneralBudget && unbudgetedSpentWithoutGeneral > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-900" title={formatMMK(unbudgetedSpentWithoutGeneral)}>
                {lang === 'my'
                  ? `သီးသန့်ဘတ်ဂျက် မရှိသေးသော အခြားကဏ္ဍများတွင် သုံးစွဲငွေ: ${formatLakhs(unbudgetedSpentWithoutGeneral, lang)}`
                  : `Spent in unbudgeted categories: ${formatLakhs(unbudgetedSpentWithoutGeneral, lang)}`}
              </span>
              <p className="text-[11px] text-amber-800/80 mt-0.5">
                {lang === 'my'
                  ? 'အခြားကဏ္ဍများ၏ အသုံးစရိတ်များကို စုစည်းထိန်းချုပ်ရန် "အထွေထွေ (General)" ဘတ်ဂျက် ထည့်သွင်းနိုင်ပါသည်'
                  : 'Add a "General / Others" budget to monitor and cap unbudgeted spending collectively.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (isFreeAtLimit) {
                onOpenUpgradeModal();
                return;
              }
              setEditingBudget({
                id: UNBUDGETED_CATEGORY_ID,
                categoryId: UNBUDGETED_CATEGORY_ID,
                calcType: 'fixed',
                value: 150000,
                walletId: 'all',
              });
              setIsModalOpen(true);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shrink-0 shadow-2xs"
          >
            {lang === 'my' ? '+ အထွေထွေ ဘတ်ဂျက်သတ်မှတ်မည်' : '+ Add General Budget'}
          </button>
        </div>
      )}

      {/* Budget Categories Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            {lang === 'my'
              ? `${formatMonthLabel(selectedMonth)} အတွက် ဘတ်ဂျက်ကဏ္ဍများ`
              : `Budget Categories for ${formatMonthLabel(selectedMonth)}`}
          </h2>
          <span className="text-xs text-slate-500">
            {budgets.length} {lang === 'my' ? 'ကဏ္ဍ' : 'categories'}
          </span>
        </div>

        {budgets.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <PieChart className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">
              {lang === 'my' ? 'ဘတ်ဂျက်ကဏ္ဍများ မသတ်မှတ်ရသေးပါ' : 'No budget categories configured'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {lang === 'my'
                ? 'လစဉ် အသုံးစရိတ်ကို ထိန်းချုပ်ရန် အစားအသောက်၊ ခရီးစရိတ် သို့မဟုတ် အထွေထွေ ဘတ်ဂျက်တစ်ခု စတင်သတ်မှတ်ပါ'
                : 'Set your first category budget with % of income or fixed amount to start tracking.'}
            </p>
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs"
            >
              {lang === 'my' ? '+ ဘတ်ဂျက် စတင်သတ်မှတ်မည်' : '+ Create First Budget'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {budgetCalculations.map(
              ({
                budget,
                isGeneral,
                spent,
                limitMMK,
                budgetBaseIncome,
                percent,
                isOver,
                isNear,
                noIncomeBase,
                breakdown,
              }) => {
                const cat = !isGeneral ? catMap.get(budget.categoryId) : null;
                const wallet =
                  budget.walletId && budget.walletId !== 'all'
                    ? walletMap.get(budget.walletId)
                    : null;

                const remaining = Math.max(0, limitMMK - spent);
                const overAmount = Math.max(0, spent - limitMMK);

                return (
                  <div
                    key={budget.categoryId}
                    className={`bg-white p-5 rounded-2xl border transition-all shadow-xs flex flex-col justify-between ${
                      isOver
                        ? 'border-rose-300 ring-1 ring-rose-200'
                        : isNear
                        ? 'border-amber-300 ring-1 ring-amber-100'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      {/* Top Row: Category Identity & Badges */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {isGeneral ? (
                            <div className="w-11 h-11 rounded-xl bg-slate-800 text-white flex items-center justify-center shadow-xs shrink-0">
                              <Layers className="w-5 h-5" />
                            </div>
                          ) : (
                            <div
                              className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0"
                              style={{ backgroundColor: cat?.color || '#6366F1' }}
                            >
                              <CategoryIcon
                                name={cat?.icon || 'Tag'}
                                className="w-5 h-5"
                              />
                            </div>
                          )}

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-sm sm:text-base text-slate-900">
                                {isGeneral
                                  ? (lang === 'my' ? 'အထွေထွေ (အခြား အသုံးစရိတ်များ)' : 'General & Others')
                                  : lang === 'my'
                                  ? cat?.name
                                  : cat?.nameEn}
                              </h3>
                              {isGeneral && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                  {lang === 'my' ? 'ဘတ်ဂျက်သီးသန့်မရှိသော ကဏ္ဍပေါင်းစုံ' : 'Catch-all Pool'}
                                </span>
                              )}
                            </div>

                            {/* Mode & Wallet badges */}
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap text-[11px]">
                              {/* Calc Type Badge */}
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100">
                                {budget.calcType === 'percentage' ? (
                                  <>
                                    <Percent className="w-3 h-3 text-indigo-500" />
                                    <span>
                                      {lang === 'my'
                                        ? `ဝင်ငွေ၏ ${budget.value}%`
                                        : `${budget.value}% of Income`}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <Banknote className="w-3 h-3 text-indigo-500" />
                                    <span>{lang === 'my' ? 'သတ်မှတ်ငွေ' : 'Fixed MMK'}</span>
                                  </>
                                )}
                              </span>

                              {/* Wallet Badge */}
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                                <WalletIcon className="w-3 h-3 text-slate-500" />
                                <span>
                                  {wallet
                                    ? (lang === 'my' ? wallet.name : wallet.nameEn)
                                    : (lang === 'my' ? 'ပိုက်ဆံအိတ်အားလုံး' : 'All Wallets')}
                                </span>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Status Chip */}
                        <div>
                          {isOver ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                              <ShieldAlert className="w-3.5 h-3.5" />
                              <span>
                                {noIncomeBase
                                  ? (lang === 'my' ? 'ဝင်ငွေမရှိသေးပါ' : 'No income to base on')
                                  : (lang === 'my' ? 'ဘတ်ဂျက်ကျော်လွန်' : 'Over Budget')}
                              </span>
                            </span>
                          ) : isNear ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>{lang === 'my' ? '၈၀% ရောက်ရှိ' : 'Near Limit'}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>{lang === 'my' ? 'ပုံမှန်အခြေအနေ' : 'Within Budget'}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Amounts Display */}
                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div>
                          <span className="text-slate-400 block text-[11px]">
                            {lang === 'my' ? 'သုံးစွဲပြီးငွေ:' : 'Actual Spent:'}
                          </span>
                          <span className="font-bold text-slate-900 text-sm" title={formatMMK(spent)}>
                            {formatLakhs(spent, lang)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">
                            {lang === 'my' ? 'သတ်မှတ်ဘတ်ဂျက်:' : 'Budget Limit:'}
                          </span>
                          <span className="font-bold text-slate-900 text-sm" title={formatMMK(limitMMK)}>
                            {formatLakhs(limitMMK, lang)}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-3 space-y-1">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span className="font-semibold">{percent}% {lang === 'my' ? 'သုံးစွဲပြီး' : 'used'}</span>
                          <span>
                            {isOver ? (
                              <span className="text-rose-600 font-bold" title={formatMMK(overAmount)}>
                                +{formatLakhs(overAmount, lang)} {lang === 'my' ? 'ပိုထွက်' : 'over'}
                              </span>
                            ) : (
                              <span className="text-emerald-700 font-medium" title={formatMMK(remaining)}>
                                {lang === 'my' ? 'ကျန်ငွေ:' : 'Left:'} {formatLakhs(remaining, lang)}
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isOver
                                ? 'bg-rose-500'
                                : isNear
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, percent)}%` }}
                          />
                        </div>
                      </div>

                      {/* Expandable breakdown for "General & Others" */}
                      {isGeneral && Object.keys(breakdown).length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setExpandedGeneral(!expandedGeneral)}
                            className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 flex items-center justify-between w-full"
                          >
                            <span>
                              {lang === 'my'
                                ? `ပါဝင်သော ကဏ္ဍများ (${Object.keys(breakdown).length} ခု)`
                                : `Contributing Categories (${Object.keys(breakdown).length})`}
                            </span>
                            {expandedGeneral ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {expandedGeneral && (
                            <div className="mt-2 space-y-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200/60 text-xs">
                              {Object.entries(breakdown).map(([catId, amt]) => {
                                const subCat = catMap.get(catId);
                                return (
                                  <div
                                    key={catId}
                                    className="flex items-center justify-between text-slate-700 py-0.5"
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <span
                                        className="w-2 h-2 rounded-full"
                                        style={{
                                          backgroundColor:
                                            subCat?.color || '#94A3B8',
                                        }}
                                      />
                                      <span className="truncate max-w-[150px]">
                                        {lang === 'my'
                                          ? subCat?.name || catId
                                          : subCat?.nameEn || catId}
                                      </span>
                                    </div>
                                    <span className="font-semibold" title={formatMMK(Number(amt))}>
                                      {formatLakhs(Number(amt), lang)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Card Actions Footer */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div className="text-[11px] text-slate-400">
                        {budget.calcType === 'percentage' && (
                          <span>
                            {budgetBaseIncome > 0
                              ? (lang === 'my'
                                  ? `ဝင်ငွေ ${formatLakhs(budgetBaseIncome, lang)} ၏ ${budget.value}%`
                                  : `${budget.value}% of ${formatLakhs(budgetBaseIncome, lang)} income`)
                              : (lang === 'my'
                                  ? 'ယခုလ ဝင်ငွေ မရှိသေးပါ'
                                  : 'No income recorded yet')}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleEdit(budget)}
                          className="px-2.5 py-2.5 rounded-lg text-xs font-semibold text-indigo-600 hover:bg-indigo-50 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>{lang === 'my' ? 'ပြင်ဆင်မည်' : 'Edit'}</span>
                        </button>
                        <button
                          onClick={() => setConfirmDeleteCategoryId(budget.categoryId)}
                          className="min-w-9 min-h-9 p-2.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors flex items-center justify-center cursor-pointer"
                          title="Remove budget"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>
      </>
      )}

      {/* [v7.5.60 S-47] App-styled delete confirm (replaces window.confirm). */}
      {confirmDeleteCategoryId && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4">
            <h3 className="font-bold text-base text-slate-900">
              {lang === 'my' ? 'ဘတ်ဂျက်ကဏ္ဍ ပယ်ဖျက်မလား?' : 'Remove this budget category?'}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {lang === 'my'
                ? `“${confirmDeleteCategoryId === UNBUDGETED_CATEGORY_ID ? 'အထွေထွေ' : (catMap.get(confirmDeleteCategoryId)?.name || confirmDeleteCategoryId)}” ဘတ်ဂျက်ကို ပယ်ဖျက်ပါမည်။ ငွေစာရင်းမှတ်တမ်းများ မပျက်ပါ။`
                : `The “${confirmDeleteCategoryId === UNBUDGETED_CATEGORY_ID ? 'General' : (catMap.get(confirmDeleteCategoryId)?.nameEn || confirmDeleteCategoryId)}” budget will be removed. Transactions are not affected.`}
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteCategoryId(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                {lang === 'my' ? 'မလုပ်တော့ပါ' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => { onDeleteBudget(confirmDeleteCategoryId); setConfirmDeleteCategoryId(null); }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 cursor-pointer"
              >
                {lang === 'my' ? 'ပယ်ဖျက်မည်' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Budget Modal for Adding & Editing */}
      <BudgetModal
        isOpen={isModalOpen}
        editingBudget={editingBudget}
        budgets={budgets}
        categories={categories}
        wallets={wallets}
        monthlyIncome={monthlyIncomeAllWallets}
        lang={lang}
        onClose={() => {
          setIsModalOpen(false);
          setEditingBudget(null);
        }}
        onSubmit={handleSaveModal}
      />

      {/* Gamified Financial Health Details Modal */}
      <FinancialHealthModal
        isOpen={isHealthModalOpen}
        onClose={() => setIsHealthModalOpen(false)}
        health={healthResult}
        lang={lang}
      />
    </div>
  );
};