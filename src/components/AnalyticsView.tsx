import React, { useState, useMemo, useEffect } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { BarChart3, Wallet, ShoppingBag } from 'lucide-react';
import { BudgetConfig, Category, Debt, FuelLog, PlanType, Transaction, VehicleMaintenance, Wallet as WalletType, ShopContact, PublicShop } from '../types';
import { formatMMK, formatLakhs } from '../utils/formatters';
import { convertToMMK } from '../utils/currency';
import { getLocalDateString } from '../utils/dateUtils';
import { buildStatementData, type StatementData } from '../utils/statementData';
// [v7.6.45] Statement-period bounds (Day/Week/Quarter/Year presets).
import { statementPeriodBounds, type StatementPeriodId } from '../utils/statementPeriod';
import { StatementPrintView } from './StatementPrintView';
import { StatementPrintPreview } from './StatementPrintPreview';
import {
  clearStatementPreview,
  isPrintBlockedEnvironment,
  isPrintPreviewHash,
  loadStatementPreview,
  readPrintEnvironment,
  saveStatementPreview,
} from '../utils/printFallback';
import { useAuth } from '../context/AuthContext';
import { ItemPriceAnalyticsView } from './ItemPriceAnalyticsView';

import { BudgetAnalyticsView } from './BudgetAnalyticsView';
import { MonthlySavingsTarget } from './MonthlySavingsTarget';
import { SavingsPots } from './SavingsPots';
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
import { buildWalletMap, getMatchingWalletIds, isWalletMatch, isTransferTransaction, effectiveIncludeInTotals, convertTxToMMK as sharedConvertTxToMMK } from '../utils/walletBalance';

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
  // [v7.5.87] Other-shop menus for Price Compare (App threads the
  // full-docs public_shops subscription + its own private shops).
  menuPublicShops?: PublicShop[];
  menuPrivateShops?: ShopContact[];
  // [v7.5.75] Split: Reports / Budget / Compare Price are top-level
  // tabs now. App passes which section to show; the old 'analytics'
  // id maps to 'reports' (the default).
  initialSubTab?: SubTab;
  // [v7.6.13] Savings-pot wallet transfers: App threads the same
  // wallet list this view already receives plus the transaction
  // creation callback down to SavingsPots. Optional so the Budget
  // sub-tab keeps working if a caller passes neither.
  onCreatePotTransfer?: (tx: Omit<Transaction, 'id' | 'createdAt'>) => string | null;
  // [v7.6.32] Donut drill-down: tapping a record in the donut's
  // expanded category panel opens the read-only detail view (App
  // threads setViewingTransaction). Optional; absent = the record
  // rows are display-only. The donut never renders for guests (the
  // App-level lock card covers the whole tab), so no new lock.
  onSelectTransaction?: (t: Transaction) => void;
  // [v7.6.45] Vehicle logs for the statement's display-time detail
  // fallback (note-less fuel/maintenance rows). Optional.
  fuelLogs?: FuelLog[];
  maintenanceLogs?: VehicleMaintenance[];
}

type SubTab = 'reports' | 'budget' | 'compare';

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  transactions, categories, wallets, debts, budgets,
  plan, lang, maxBudgetCategories,
  onAddBudget, onUpdateBudget, onDeleteBudget,
  onOpenUpgradeModal, onSelectTab, initialSubTab,
  menuPublicShops, menuPrivateShops, onCreatePotTransfer, onSelectTransaction,
  fuelLogs, maintenanceLogs,
}) => {
  const [subTab, setSubTab] = useState<SubTab>(initialSubTab ?? 'reports');
  // [v7.5.75] The single mounted instance follows the top-level tab:
  // App changes initialSubTab when the user picks Reports / Budget /
  // Compare Price (or the legacy 'analytics' alias), and this syncs
  // the shown section. Internal navigation below goes through
  // goToSubTab so the sidebar highlight stays in sync with content.
  useEffect(() => {
    if (initialSubTab) setSubTab(initialSubTab);
  }, [initialSubTab]);
  const goToSubTab = (t: SubTab) => {
    if (onSelectTab) onSelectTab(t);
    else setSubTab(t);
  };
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);
  // [v7.5.60 A-S12] Financial-system toggle for the summary table
  // (Opening/Closing <-> Inflow/Outflow) — the table already supports
  // both, the Transactions tab already toggles it, Analytics did not.
  const [financialSystem, setFinancialSystem] = useState<'inflow_outflow' | 'opening_closing'>('opening_closing');

  // [v7.6.27] Statement period + print state. The Reports tab itself
  // has NO date filter (its cards are all-time) — the period below
  // belongs ONLY to the printed statement, so the other cards keep
  // their all-time totals untouched. Default: the current month, the
  // usual "၁ လတာ စာရင်းရှင်းတမ်း".
  const [statementPeriod, setStatementPeriod] = useState<StatementPeriodId>('thisMonth');
  const [statementStart, setStatementStart] = useState(() =>
    getLocalDateString(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
  );
  const [statementEnd, setStatementEnd] = useState(() => getLocalDateString(new Date()));
  const [printData, setPrintData] = useState<StatementData | null>(null);
  // [v7.6.36] iOS standalone fallback: the statement shown
  // full-screen when window.print() cannot open a print sheet.
  const [printPreview, setPrintPreview] = useState<{
    data: StatementData;
    lang: 'my' | 'en';
    walletScopeLabel: string;
  } | null>(null);

  const statementBounds = useMemo(() => {
    // [v7.6.45] Bounds math lives in utils/statementPeriod (pure,
    // unit-tested); this memo is a thin wrapper over it.
    const now = new Date();
    return statementPeriodBounds(statementPeriod, now, { start: statementStart, end: statementEnd });
  }, [statementPeriod, statementStart, statementEnd]);

  // [v7.6.36] Print-preview restore: a statement link opened in a
  // real browser tab restores the saved preview and attempts to
  // print (best-effort — the preview's Print button is the
  // fallback if the attempt is ignored). Every tab view mounts
  // on boot, so this runs even when Reports is not the active tab.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isPrintPreviewHash(window.location.hash)) return;
    const saved = loadStatementPreview();
    if (!saved) return;
    setPrintPreview({
      data: saved.data,
      lang: saved.lang,
      walletScopeLabel: saved.walletScopeLabel,
    });
    const timer = window.setTimeout(() => {
      if (typeof window.print === 'function') window.print();
    }, 600);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const onAfterPrint = () => setPrintData(null);
    window.addEventListener('afterprint', onAfterPrint);
    return () => window.removeEventListener('afterprint', onAfterPrint);
  }, []);

  // [v7.5.68] Per-viewer shared-wallet scope overrides (Dashboard honours
  // them; Analysis did not — see scopedWallets below).
  const { sharedWalletScopeOverrides } = useAuth();

  const walletMap = useMemo(() => buildWalletMap(wallets), [wallets]);

  // [v7.5.60 M-01/E1] Dashboard scope: only "included"
  // (includeInTotals !== false) wallets count in Analysis totals, Donut,
  // Trend and Monthly charts — exactly like the Dashboard's
  // scopedTransactions. Transactions whose wallet cannot be matched are
  // dropped here (Dashboard does the same via scopedWallets).
  const scopedWallets = useMemo(
    () => wallets.filter((w) => effectiveIncludeInTotals(w, sharedWalletScopeOverrides)),
    [wallets, sharedWalletScopeOverrides]
  );
  const scopedWalletIds = useMemo(
    () => getMatchingWalletIds(scopedWallets),
    [scopedWallets]
  );
  const excludedWalletCount = wallets.length - scopedWallets.length;
  const scopedTransactions = useMemo(
    () => transactions.filter((t) => scopedWalletIds.has(t.walletId)),
    [transactions, scopedWalletIds]
  );

  const convertTxToMMK = (t: Transaction) =>
    sharedConvertTxToMMK(walletMap, wallets, t);

  // [v7.6.27] Build the statement from live state at click time:
  // included-wallet scope + the statement period only.
  // [v7.6.36] iOS standalone has no print sheet, so window.print()
  // is a silent no-op there: show the full-screen preview instead.
  // Otherwise mount the portal synchronously (flushSync) and call
  // window.print() in the SAME tap gesture — the old double-rAF
  // effect detached the call from the gesture, which iOS Safari
  // ignores even in browser mode.
  const handlePrintStatement = () => {
    const data = buildStatementData({
      transactions: scopedTransactions,
      categories,
      convertAmount: (tx, amount) => sharedConvertTxToMMK(walletMap, wallets, tx, amount),
      start: statementBounds.start,
      end: statementBounds.end,
      lang,
      fuelLogs,
      maintenanceLogs,
    });
    const scopeLabel =
      lang === 'my'
        ? `ပါဝင်သည့် ပိုက်ဆံအိတ် ${scopedWallets.length} ခု`
        : `Included wallets: ${scopedWallets.length}`;
    if (isPrintBlockedEnvironment(readPrintEnvironment())) {
      saveStatementPreview({
        data,
        lang,
        walletScopeLabel: scopeLabel,
        savedAt: Date.now(),
      });
      setPrintData(null);
      setPrintPreview({ data, lang, walletScopeLabel: scopeLabel });
      return;
    }
    flushSync(() => setPrintData(data));
    if (typeof window.print === 'function') window.print();
  };

  const totalIncome = scopedTransactions
    .filter((t) => t.type === 'income' && !isTransferTransaction(t))
    .reduce((s, t) => s + convertTxToMMK(t), 0);

  const totalExpense = scopedTransactions
    .filter((t) => t.type === 'expense' && !isTransferTransaction(t))
    .reduce((s, t) => s + convertTxToMMK(t), 0);

  const netSavings = totalIncome - totalExpense;

  // [v7.5.55 D13] Same wallet scope as the Dashboard: exclude "separate"
  // (includeInTotals === false) wallets from the health inputs.
  const totalWalletBalance = wallets
    .filter((w) => effectiveIncludeInTotals(w, sharedWalletScopeOverrides))
    .reduce(
      (s, w) => s + convertToMMK(w.balance, w.currency, w.exchangeRate), 0
    );

  // [v7.5.55 D3] Current-month income/expense ONLY for the Monthly Savings
  // Goal — the all-time totals above made every established user
  // permanently "achieved". Local month key, never toISOString (UTC).
  const currentMonthKey = (() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
  })();
  const currentMonthIncome = scopedTransactions
    .filter((t) => t.type === 'income' && !isTransferTransaction(t) && t.date?.startsWith(currentMonthKey))
    .reduce((s, t) => s + convertTxToMMK(t), 0);
  const currentMonthExpense = scopedTransactions
    .filter((t) => t.type === 'expense' && !isTransferTransaction(t) && t.date?.startsWith(currentMonthKey))
    .reduce((s, t) => s + convertTxToMMK(t), 0);

  const activeDebts = debts.filter((d) => d.status === 'active');

  // [v7.5.68 M-01] Debts follow the same wallet scope as the Dashboard
  // hero health badge: a debt tied to a Separate (out-of-scope) wallet
  // must not move the Analytics health tier. Debts with no wallet id
  // are not tied to any wallet, so they stay included.
  const scopedActiveDebts = activeDebts.filter(
    (d) => !d.walletId || scopedWallets.some((w) => isWalletMatch(w, d.walletId))
  );

  const convertDebtToMMK = (d: Debt) => {
    let w = walletMap.get(d.walletId);
    if (!w) w = wallets.find((wall) => isWalletMatch(wall, d.walletId));
    return convertToMMK(Math.max(0, d.totalAmount - d.paidAmount), w?.currency, w?.exchangeRate);
  };

  const totalReceivable = scopedActiveDebts.filter((d) => d.type === 'receivable').reduce((s, d) => s + convertDebtToMMK(d), 0);
  const totalPayable = scopedActiveDebts.filter((d) => d.type === 'payable').reduce((s, d) => s + convertDebtToMMK(d), 0);

  const financialHealth = useMemo(() =>
    calculateFinancialHealth(totalIncome, totalExpense, totalPayable, totalReceivable, totalWalletBalance),
    [totalIncome, totalExpense, totalPayable, totalReceivable, totalWalletBalance]
  );

  return (
    <div className="space-y-3">
      {/* [v7.5.75] Section switcher — each button now switches the
          top-level tab (Reports / Budget / Compare Price) via
          goToSubTab, so the sidebar highlight stays in sync. */}
      <div className="bg-white rounded-2xl border border-slate-200 p-1 flex gap-1">
        <button type="button" onClick={() => goToSubTab('reports')}
          className={'flex-1 py-2 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ' +
            (subTab === 'reports'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50')}>
          <BarChart3 className="w-4 h-4" />
          {lang === 'my' ? '📊 အစီရင်ခံစာ' : '📊 Reports'}
        </button>
        <button type="button" onClick={() => goToSubTab('budget')}
          className={'flex-1 py-2 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ' +
            (subTab === 'budget'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50')}>
          <Wallet className="w-4 h-4" />
          {lang === 'my' ? '💰 ဘတ်ဂျက်' : '💰 Budget'}
        </button>
        {/* [v7.5.60 M-04] Compare Price is its own tab now — it is not a
            budget, so it no longer hides under the Budget tab. */}
        <button type="button" onClick={() => goToSubTab('compare')}
          className={'flex-1 py-2 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ' +
            (subTab === 'compare'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50')}>
          <ShoppingBag className="w-4 h-4" />
          {lang === 'my' ? '🛒 ဈေးနှုန်း နှိုင်းယှဉ်' : '🛒 Compare Price'}
        </button>
      </div>

      {/* [v7.5.60 M-01] Scope note — Separate wallets are excluded from
          every total on this screen, same as the Dashboard. */}
      {excludedWalletCount > 0 && (
        <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
          {lang === 'my'
            ? `ပါဝင်သည့် ပိုက်ဆံအိတ် ${scopedWallets.length} ခု (သီးသန့် ${excludedWalletCount} ခု မပါ) — စုစုပေါင်း အားလုံးမှာ ပါဝင်သည့် အိတ်များသာ တွက်ထားပါသည်`
            : `Included wallets: ${scopedWallets.length} (Separate: ${excludedWalletCount} excluded) — all totals on this screen count included wallets only`}
        </p>
      )}

      {/* REPORTS SUB-TAB */}
      {subTab === 'reports' && (
        <div className="space-y-3">
          {/* [v7.6.27] Statement period + Print/PDF. Statement-scoped
              only — the cards below keep their all-time totals. */}
          <div className="bg-white rounded-2xl border border-slate-200 p-2.5 space-y-1.5">
            <div className="text-xs font-bold text-slate-700">
              {lang === 'my' ? 'စာရင်းရှင်းတမ်း ကာလ' : 'Statement period'}
            </div>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold flex-wrap">
              {(
                [
                  ['thisMonth', lang === 'my' ? 'ဒီလ' : 'This month'],
                  ['lastMonth', lang === 'my' ? 'ပြီးခဲ့တဲ့လ' : 'Last month'],
                  ['day', lang === 'my' ? 'ဒီနေ့' : 'Today'],
                  ['week', lang === 'my' ? 'ဒီအပတ်' : 'This week'],
                  ['quarter', lang === 'my' ? 'ဒီသုံးလပတ်' : 'This quarter'],
                  ['year', lang === 'my' ? 'ဒီနှစ်' : 'This year'],
                  ['all', lang === 'my' ? 'အချိန်အားလုံး' : 'All time'],
                  ['custom', lang === 'my' ? 'စိတ်ကြိုက်' : 'Custom'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatementPeriod(value)}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${statementPeriod === value ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {statementPeriod === 'custom' && (
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <input
                  type="date"
                  value={statementStart}
                  onChange={(e) => {
                    const v = e.target.value;
                    setStatementStart(v);
                    if (v && statementEnd && v > statementEnd) setStatementEnd(v);
                  }}
                  className="min-w-0 flex-1 min-h-[44px] border border-slate-200 rounded-lg px-2 focus:outline-none"
                />
                <span aria-hidden="true">→</span>
                <input
                  type="date"
                  value={statementEnd}
                  onChange={(e) => {
                    const v = e.target.value;
                    setStatementEnd(v);
                    if (v && statementStart && v < statementStart) setStatementStart(v);
                  }}
                  className="min-w-0 flex-1 min-h-[44px] border border-slate-200 rounded-lg px-2 focus:outline-none"
                />
              </div>
            )}
            <button
              type="button"
              onClick={handlePrintStatement}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-xs transition-all active:scale-[0.99] cursor-pointer"
            >
              {lang === 'my' ? '🖨️ PDF ထုတ်ယူမည်' : '🖨️ Export PDF'}
            </button>
          </div>

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
              // [v7.5.60 E2] Lakhs, not full kyat — a 13-char full-kyat
              // value overflows the ~106px card on a 390px phone. The
              // exact kyat value is the card's title tooltip.
              subtitle={formatLakhs(netSavings, lang)}
              subtitleTitle={formatMMK(netSavings)}
              badge="Net"
              // [v7.5.55 D27] Was onSelectTab('analytics') while already on
              // Analytics (a no-op). Now opens the Budget tab, where the
              // Monthly Savings Goal card lives. [v7.5.75] Budget is a
              // top-level tab now, so this goes through goToSubTab.
              onClick={() => goToSubTab('budget')}
            />
            <ClayCategoryCard
              type="avatar"
              title={lang === 'my' ? 'အကြွေး' : 'Debts'}
              // [v7.5.55 D27] Count ACTIVE debts only, not settled ones.
              subtitle={activeDebts.length + ' ' + (lang === 'my' ? 'ခု' : 'items')}
              badge="Debts"
              onClick={() => onSelectTab && onSelectTab('debts')}
            />
            <ClayCategoryCard
              type="clipboard"
              title={lang === 'my' ? 'မှတ်တမ်း' : 'Records'}
              subtitle={scopedTransactions.length + ' ' + (lang === 'my' ? 'ခု' : 'entries')}
              badge="Total"
              onClick={() => onSelectTab && onSelectTab('transactions')}
            />
          </div>

          {/* [v7.5.60 A-S12] Financial-system toggle — same two views as
              the Transactions tab. */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start text-xs font-bold">
            <button
              type="button"
              onClick={() => setFinancialSystem('opening_closing')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${financialSystem === 'opening_closing' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {lang === 'my' ? 'အစ / အဆုံး လက်ကျန်' : 'Opening / Closing'}
            </button>
            <button
              type="button"
              onClick={() => setFinancialSystem('inflow_outflow')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${financialSystem === 'inflow_outflow' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {lang === 'my' ? 'ဝင်ငွေ / ထွက်ငွေ' : 'Inflow / Outflow'}
            </button>
          </div>

          {/* Summary Table */}
          <FinancialSummaryTable
            income={totalIncome}
            expense={totalExpense}
            incomeCount={scopedTransactions.filter((t) => t.type === 'income' && !isTransferTransaction(t)).length}
            expenseCount={scopedTransactions.filter((t) => t.type === 'expense' && !isTransferTransaction(t)).length}
            selectedWallets={scopedWallets}
            transactions={scopedTransactions}
            lang={lang}
            financialSystem={financialSystem}
            onChangeFinancialSystem={setFinancialSystem}
          />

          {/* Income vs Expense Ratio */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200">
            <h3 className="font-bold text-sm text-slate-900 mb-2.5">
              {lang === 'my' ? 'ဝင်ငွေနှင့် ထွက်ငွေ အချိုး' : 'Income vs Expense Ratio'}
            </h3>
            {totalIncome + totalExpense > 0 ? (
              <div className="space-y-3">
                <div className="h-4 rounded-full overflow-hidden flex bg-slate-100">
                  <div style={{ width: ((totalIncome / (totalIncome + totalExpense)) * 100) + '%' }} className="bg-emerald-500" />
                  <div style={{ width: ((totalExpense / (totalIncome + totalExpense)) * 100) + '%' }} className="bg-rose-500" />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                    <span className="truncate" title={formatMMK(totalIncome)}>{Math.round((totalIncome / (totalIncome + totalExpense)) * 100)}% ({formatLakhs(totalIncome, lang)})</span>
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="w-3 h-3 rounded-full bg-rose-500 shrink-0" />
                    <span className="truncate" title={formatMMK(totalExpense)}>{Math.round((totalExpense / (totalIncome + totalExpense)) * 100)}% ({formatLakhs(totalExpense, lang)})</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-3 text-center">{lang === 'my' ? 'မှတ်တမ်းမရှိသေး' : 'No records yet'}</p>
            )}
          </div>

          {/* Donut Chart */}
          <CurrentMonthExpenseDonutChart
            transactions={scopedTransactions}
            categories={categories}
            wallets={wallets}
            lang={lang}
            onSelectTransaction={onSelectTransaction}
          />

          {/* Trend Line Chart */}
          <CategorySpendingTrendLineChart
            transactions={scopedTransactions}
            categories={categories}
            wallets={wallets}
            lang={lang}
          />

          {/* Monthly Comparison */}
          <MonthlyComparisonCard
            transactions={scopedTransactions}
            categories={categories}
            wallets={wallets}
            lang={lang}
            onViewDetails={() => onSelectTab && onSelectTab('transactions')}
          />

          {/* Monthly Summary */}
          <MonthlySummaryChart
            transactions={scopedTransactions}
            categories={categories}
            wallets={wallets}
            lang={lang}
          />
        </div>
      )}

      {/* COMPARE PRICE SUB-TAB — [v7.5.60 M-04] its own tab, not under Budget */}
      {subTab === 'compare' && (
        <ItemPriceAnalyticsView
          transactions={scopedTransactions}
          categories={categories}
          wallets={wallets}
          plan={plan}
          lang={lang}
          onOpenUpgradeModal={onOpenUpgradeModal}
          menuPublicShops={menuPublicShops}
          menuPrivateShops={menuPrivateShops}
          onSelectTab={onSelectTab}
        />
      )}

      {/* BUDGET SUB-TAB */}
      {subTab === 'budget' && (
        <div className="space-y-3">
          <MonthlySavingsTarget
            income={currentMonthIncome}
            expense={currentMonthExpense}
            lang={lang}
            plan={plan}
            onOpenUpgrade={onOpenUpgradeModal}
          />

          {/* [v7.6.09] Named savings pots — BELOW the monthly target.
              For guests the whole view is replaced by App's lock
              card, with the same section rendered below it there —
              so pots stay reachable for everyone. [v7.6.13] The
              wallet list + categories + creation callback come from
              App, so a picked wallet really moves money here too. */}
          <SavingsPots lang={lang} wallets={wallets} categories={categories} onCreatePotTransfer={onCreatePotTransfer} />

          {/* [v7.5.60 M-01] Daily limit must use the same scoped
              transactions as the rest of Analytics — raw `transactions`
              included Separate wallets and disagreed with the Dashboard. */}
          <DailySpendingLimitCard
            transactions={scopedTransactions}
            wallets={wallets}
            lang={lang}
          />

          <CurrentMonthBudgetSummaryCard
            budgets={budgets as any}
            categories={categories}
            transactions={transactions}
            wallets={wallets}
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

      {/* [v7.5.55 D17] Was setSubTab('reports') while the modal only opens
          from the reports tab (a no-op). Now switches to the Budget tab,
          where the detailed budget analytics live. [v7.5.75] Budget is a
          top-level tab now, so this goes through goToSubTab. */}
      <FinancialHealthModal
        isOpen={isHealthModalOpen}
        onClose={() => setIsHealthModalOpen(false)}
        health={financialHealth}
        lang={lang}
        onNavigateToAnalytics={() => goToSubTab('budget')}
      />

      {/* [v7.6.27] Print portal — mounted only while printing, so the
          statement never affects on-screen layout, scroll, or
          selectors. The print stylesheet hides everything else. */}
      {printData &&
        createPortal(
          <div id="ngwe-print-root">
            <StatementPrintView
              data={printData}
              lang={lang}
              walletScopeLabel={
                lang === 'my'
                  ? `ပါဝင်သည့် ပိုက်ဆံအိတ် ${scopedWallets.length} ခု`
                  : `Included wallets: ${scopedWallets.length}`
              }
            />
          </div>,
          document.body,
        )}

      {/* [v7.6.36] iOS standalone print preview (see handlePrintStatement). */}
      {printPreview && (
        <StatementPrintPreview
          data={printPreview.data}
          lang={printPreview.lang}
          walletScopeLabel={printPreview.walletScopeLabel}
          onPrint={() => {
            if (typeof window.print === 'function') window.print();
          }}
          onClose={() => {
            clearStatementPreview();
            setPrintPreview(null);
            if (
              typeof window !== 'undefined' &&
              isPrintPreviewHash(window.location.hash)
            ) {
              window.history.replaceState(
                null,
                '',
                window.location.pathname + window.location.search,
              );
            }
          }}
        />
      )}
    </div>
  );
};

// silence unused import

