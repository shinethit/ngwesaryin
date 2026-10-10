import React, { useState, useMemo } from 'react';
import { BarChart3, Wallet, ArrowDownLeft, ArrowUpRight, HandCoins } from 'lucide-react';
import { BudgetConfig, Category, Debt, PlanType, Transaction, Wallet as WalletType } from '../types';
import { formatMMK } from '../utils/formatters';
import { convertToMMK } from '../utils/currency';
import { CategoryIcon } from './CategoryIcon';
import { BudgetAnalyticsView } from './BudgetAnalyticsView';
import { MonthlySavingsTarget } from './MonthlySavingsTarget';
import { DailySpendingLimitCard } from './DailySpendingLimitCard';
import { CurrentMonthBudgetSummaryCard } from './CurrentMonthBudgetSummaryCard';
import { FinancialHealthCard } from './FinancialHealthCard';
import { FinancialHealthModal } from './FinancialHealthModal';
import { FinancialSummaryTable } from './FinancialSummaryTable';
import { CurrentMonthExpenseDonutChart } from './CurrentMonthExpenseDonutChart';
import { CategorySpendingTrendLineChart } from './CategorySpendingTrendLineChart';
import { MonthlyComparisonCard } from './MonthlyComparisonCard';
import { MonthlySummaryChart } from './MonthlySummaryChart';
import { ClayCategoryCard } from './ClayIllustrations';
import { calculateFinancialHealth } from '../utils/financialHealth';
import { buildWalletMap, isWalletMatch, isTransferTransaction } from '../utils/walletBalance';

interface AnalyticsViewProps {
  transactions: Transaction[];
  categories: Category[];
  wallets: WalletType[];
  debts: Debt[];
  budgets: BudgetConfig[];
  plan: PlanType;
  lang: 'my' | 'en';
  maxBudgetCategories: number;
  onAddBudget: (b: any) => void;
  onUpdateBudget: (b: any) => void;
  onDeleteBudget: (id: string) => void;
  onOpenUpgradeModal: () => void;
  onSelectTab?: (tab: string) => void;
}

type SubTab = 'reports' | 'budget';

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  transactions, categories, wallets, debts, budgets,
  plan, lang, maxBudgetCategories,
  onAddBudget, onUpdateBudget, onDeleteBudget,
  onOpenUpgradeModal, onSelectTab,
}) => {
  const [subTab, setSubTab] = useState<SubTab>('reports');
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);

  const walletMap = useMemo(() => buildWalletMap(wallets), [wallets]);

  const convertTxToMMK = (t: Transaction) => {
    let w = walletMap.get(t.walletId);
    if (!w) w = wallets.find((wall) => isWalletMatch(wall, t.walletId));
    return convertToMMK(t.amount, w?.currency, w?.exchangeRate);
  };

  const totalIncome = transactions
    .filter((t) => t.type === 'income' && !isTransferTransaction(t))
    .reduce((s, t) => s + convertTxToMMK(t), 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense' && !isTransferTransaction(t))
    .reduce((s, t) => s + convertTxToMMK(t), 0);

  const netSavings = totalIncome - totalExpense;

  const totalWalletBalance = wallets.reduce(
    (s, w) => s + convertToMMK(w.balance, w.currency, w.exchangeRate), 0
  );

  const activeDebts = debts.filter((d) => d.status === 'active');

  const convertDebtToMMK = (d: Debt) => {
    let w = walletMap.get(d.walletId);
    if (!w) w = wallets.find((wall) => isWalletMatch(wall, d.walletId));
    return convertToMMK(Math.max(0, d.totalAmount - d.paidAmount), w?.currency, w?.exchangeRate);
  };

  const totalReceivable = activeDebts.filter((d) => d.type === 'receivable').reduce((s, d) => s + convertDebtToMMK(d), 0);
  const totalPayable = activeDebts.filter((d) => d.type === 'payable').reduce((s, d) => s + convertDebtToMMK(d), 0);

  const financialHealth = useMemo(() =>
    calculateFinancialHealth(totalIncome, totalExpense, totalPayable, totalReceivable, totalWalletBalance),
    [totalIncome, totalExpense, totalPayable, totalReceivable, totalWalletBalance]
  );

  return (
    <div className="space-y-4">
      {/* Sub-tab toggle */}
      <div className="bg-white rounded-2xl border border-slate-200 p-1.5 flex gap-1">
        <button type="button" onClick={() => setSubTab('reports')}
          className={'flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ' +
            (subTab === 'reports'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50')}>
          <BarChart3 className="w-4 h-4" />
          {lang === 'my' ? '📊 အစီရင်ခံစာ' : '📊 Reports'}
        </button>
        <button type="button" onClick={() => setSubTab('budget')}
          className={'flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ' +
            (subTab === 'budget'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50')}>
          <Wallet className="w-4 h-4" />
          {lang === 'my' ? '💰 ဘတ်ဂျက်' : '💰 Budget'}
        </button>
      </div>

      {/* REPORTS SUB-TAB */}
      {subTab === 'reports' && (
        <div className="space-y-4">
          {/* Financial Health */}
          <FinancialHealthCard
            health={financialHealth}
            lang={lang}
            onClick={() => setIsHealthModalOpen(true)}
          />

          {/* Insight Cards */}
          <div className="grid grid-cols-3 gap-2.5">
            <ClayCategoryCard
              type="alpha"
              title={lang === 'my' ? 'စုငွေ' : 'Savings'}
              subtitle={formatMMK(netSavings)}
              badge="Net"
              onClick={() => onSelectTab && onSelectTab('analytics')}
            />
            <ClayCategoryCard
              type="avatar"
              title={lang === 'my' ? 'အကြွေး' : 'Debts'}
              subtitle={debts.length + ' ' + (lang === 'my' ? 'ခု' : 'items')}
              badge="Debts"
              onClick={() => onSelectTab && onSelectTab('debts')}
            />
            <ClayCategoryCard
              type="clipboard"
              title={lang === 'my' ? 'မှတ်တမ်း' : 'Records'}
              subtitle={transactions.length + ' ' + (lang === 'my' ? 'ခု' : 'entries')}
              badge="Total"
              onClick={() => onSelectTab && onSelectTab('transactions')}
            />
          </div>

          {/* Summary Table */}
          <FinancialSummaryTable
            income={totalIncome}
            expense={totalExpense}
            incomeCount={transactions.filter((t) => t.type === 'income' && !isTransferTransaction(t)).length}
            expenseCount={transactions.filter((t) => t.type === 'expense' && !isTransferTransaction(t)).length}
            selectedWallets={wallets}
            transactions={transactions}
            lang={lang}
          />

          {/* Income vs Expense Ratio */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200">
            <h3 className="font-bold text-sm text-slate-900 mb-3">
              {lang === 'my' ? 'ဝင်ငွေနှင့် ထွက်ငွေ အချိုး' : 'Income vs Expense Ratio'}
            </h3>
            {totalIncome + totalExpense > 0 ? (
              <div className="space-y-3">
                <div className="h-4 rounded-full overflow-hidden flex bg-slate-100">
                  <div style={{ width: ((totalIncome / (totalIncome + totalExpense)) * 100) + '%' }} className="bg-emerald-500" />
                  <div style={{ width: ((totalExpense / (totalIncome + totalExpense)) * 100) + '%' }} className="bg-rose-500" />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span>{Math.round((totalIncome / (totalIncome + totalExpense)) * 100)}% ({formatMMK(totalIncome)})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                    <span>{Math.round((totalExpense / (totalIncome + totalExpense)) * 100)}% ({formatMMK(totalExpense)})</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-3 text-center">{lang === 'my' ? 'မှတ်တမ်းမရှိသေး' : 'No records yet'}</p>
            )}
          </div>

          {/* Donut Chart */}
          <CurrentMonthExpenseDonutChart
            transactions={transactions}
            categories={categories}
            lang={lang}
          />

          {/* Trend Line Chart */}
          <CategorySpendingTrendLineChart
            transactions={transactions}
            categories={categories}
            lang={lang}
          />

          {/* Monthly Comparison */}
          <MonthlyComparisonCard
            transactions={transactions}
            categories={categories}
            wallets={wallets}
            lang={lang}
            onViewDetails={() => onSelectTab && onSelectTab('transactions')}
          />

          {/* Monthly Summary */}
          <MonthlySummaryChart
            transactions={transactions}
            categories={categories}
            lang={lang}
          />
        </div>
      )}

      {/* BUDGET SUB-TAB */}
      {subTab === 'budget' && (
        <div className="space-y-4">
          <MonthlySavingsTarget
            income={totalIncome}
            expense={totalExpense}
            lang={lang}
            plan={plan}
            onOpenUpgrade={onOpenUpgradeModal}
          />

          <DailySpendingLimitCard
            transactions={transactions}
            lang={lang}
          />

          <CurrentMonthBudgetSummaryCard
            budgets={budgets as any}
            categories={categories}
            transactions={transactions}
            lang={lang}
          />

          <BudgetAnalyticsView
            transactions={transactions}
            categories={categories}
            wallets={wallets}
            budgets={budgets}
            plan={plan}
            lang={lang}
            maxBudgetCategories={maxBudgetCategories}
            onAddBudget={onAddBudget}
            onUpdateBudget={onUpdateBudget}
            onDeleteBudget={onDeleteBudget}
            onOpenUpgradeModal={onOpenUpgradeModal}
          />
        </div>
      )}

      <FinancialHealthModal
        isOpen={isHealthModalOpen}
        onClose={() => setIsHealthModalOpen(false)}
        health={financialHealth}
        lang={lang}
        onNavigateToAnalytics={() => setSubTab('reports')}
        onNavigateToBudgets={() => setSubTab('budget')}
      />
    </div>
  );
};

// silence unused import

