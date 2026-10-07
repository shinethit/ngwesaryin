import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  HandCoins,
  AlertCircle,
  PlusCircle,
  MinusCircle,
  Calendar,
  Layers,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowUpDown,
  PieChart as PieChartIcon,
  BarChart3,
  Search,
  Database,
  Cloud,
  ShieldCheck,
  Wifi,
  WifiOff,
  User,
  Users,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from 'recharts';
import { BudgetConfig, Category, Debt, PlanType, Transaction, Wallet as WalletType, DataScope } from '../types';
import { formatMMK, formatDateDisplay, isOverdue, getCategoryDisplayName } from '../utils/formatters';
import { formatCurrency, convertToMMK } from '../utils/currency';
import { safeGetItem } from '../utils/storage';
import { CategoryIcon } from './CategoryIcon';
import { MonthlySavingsTarget } from './MonthlySavingsTarget';
import { MonthlyComparisonCard } from './MonthlyComparisonCard';
import { MonthlySummaryChart } from './MonthlySummaryChart';
import { ClayRocketIllustration, ClayCategoryCard } from './ClayIllustrations';
import { FinancialHealthCard } from './FinancialHealthCard';
import { FinancialHealthModal } from './FinancialHealthModal';
import { MultiWalletSelector } from './MultiWalletSelector';
import { FinancialSummaryTable } from './FinancialSummaryTable';
import { CurrentMonthBudgetSummaryCard } from './CurrentMonthBudgetSummaryCard';
import { CurrentMonthExpenseDonutChart } from './CurrentMonthExpenseDonutChart';
import { CategorySpendingTrendLineChart } from './CategorySpendingTrendLineChart';
import { DailySpendingLimitCard } from './DailySpendingLimitCard';
import { SmartCalendarCard } from './SmartCalendarCard';
import { calculateFinancialHealth } from '../utils/financialHealth';
import { useAuth } from '../context/AuthContext';
import { buildWalletMap, getMatchingWalletIds, isWalletMatch, isTransferTransaction } from '../utils/walletBalance';

interface DashboardProps {
  transactions: Transaction[];
  debts: Debt[];
  wallets: WalletType[];
  categories: Category[];
  budgets?: BudgetConfig[];
  plan: PlanType;
  lang: 'my' | 'en';
  dataScope?: DataScope;
  onSetDataScope?: (scope: DataScope) => void;
  onAddTransaction: (type: 'income' | 'expense') => void;
  onAddDebt: () => void;
  onSelectTab: (tab: string) => void;
  onOpenUpgrade: () => void;
  onOpenSearch?: () => void;
  onOpenAccountModal?: () => void;
  onClearAllData?: () => void;
  onExportJson?: () => void;
  onImportJson?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onManualSync?: () => void;
  onOpenDatabaseTracker?: () => void;
  cloudTxIds?: Set<string>;
}

export const Dashboard: React.FC<DashboardProps> = ({
  transactions,
  debts,
  wallets,
  categories,
  budgets = [],
  plan,
  lang,
  dataScope = 'all',
  onSetDataScope,
  onAddTransaction,
  onAddDebt,
  onSelectTab,
  onOpenUpgrade,
  onOpenSearch,
  onOpenAccountModal,
  onClearAllData,
  onExportJson,
  onImportJson,
  onManualSync,
  onOpenDatabaseTracker,
  cloudTxIds,
}) => {
  const { user, isSyncing, lastSyncedAt, syncDataToCloud } = useAuth();
  // v6.5 — Extended time filter (presets + custom range). Not persisted (default: this_month).
  type TimeFilterOption = 'all' | 'this_month' | 'this_week' | 'last_30' | 'this_year' | 'custom';
  const [timeFilter, setTimeFilter] = useState<TimeFilterOption>('this_month');
  const [customRange, setCustomRange] = useState<{ from: string; to: string } | null>(null);
  const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = useState(false);
  const [tempFrom, setTempFrom] = useState('');
  const [tempTo, setTempTo] = useState('');
  const periodDropdownRef = React.useRef<HTMLDivElement>(null);

  const handleSetTimeFilter = (filter: TimeFilterOption) => {
    setTimeFilter(filter);
    if (filter !== 'custom') setCustomRange(null);
  };

  const openPeriodDropdown = () => {
    if (!isPeriodDropdownOpen) {
      setTempFrom(customRange?.from || '');
      setTempTo(customRange?.to || '');
    }
    setIsPeriodDropdownOpen((v) => !v);
  };

  const applyCustomRange = () => {
    if (!tempFrom || !tempTo) {
      alert(lang === 'my' ? 'ရက်စွဲ နှစ်ခုလုံး ဖြည့်ပါ' : 'Please fill both dates');
      return;
    }
    if (tempFrom > tempTo) {
      alert(lang === 'my' ? 'စတင်ရက် သည် ဆုံးရက် ထက် မကြီးရပါ' : 'From date cannot be after To date');
      return;
    }
    setCustomRange({ from: tempFrom, to: tempTo });
    setTimeFilter('custom');
    setIsPeriodDropdownOpen(false);
  };

  React.useEffect(() => {
    if (!isPeriodDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (periodDropdownRef.current && !periodDropdownRef.current.contains(e.target as Node)) {
        setIsPeriodDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isPeriodDropdownOpen]);

  const getTimeFilterLabel = (filter: TimeFilterOption, range: { from: string; to: string } | null, l: 'my' | 'en') => {
    switch (filter) {
      case 'this_week': return l === 'my' ? 'ဒီအပတ်' : 'This Week';
      case 'last_30':   return l === 'my' ? '၃၀ ရက်' : 'Last 30';
      case 'this_year': return l === 'my' ? 'ဒီနှစ်' : 'This Year';
      case 'custom':
        return range
          ? range.from.slice(5) + ' – ' + range.to.slice(5)
          : (l === 'my' ? 'စိတ်ကြိုက်' : 'Custom');
      default: return l === 'my' ? 'ကာလအလိုက်' : 'Period';
    }
  };
  const [selectedWalletId, setSelectedWalletId] = useState<string>('all');
  const [selectedWalletIds, setSelectedWalletIds] = useState<string[]>([]);
  const [showSummaryTable, setShowSummaryTable] = useState<boolean>(true);
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const hasSharedWallets = wallets.some(
    (w) => w.isSharedFromOther || (w.sharedWith && w.sharedWith.length > 0)
  );

  const sharedWalletIds = React.useMemo(
    () =>
      getMatchingWalletIds(
        wallets.filter((w) => w.isSharedFromOther || (w.sharedWith && w.sharedWith.length > 0))
      ),
    [wallets]
  );

  const personalWalletIds = React.useMemo(
    () =>
      getMatchingWalletIds(
        wallets.filter((w) => !w.isSharedFromOther && (!w.sharedWith || w.sharedWith.length === 0))
      ),
    [wallets]
  );

  const includedWalletsCount = wallets.filter((w) => w.includeInTotals !== false).length;
  const excludedWalletsCount = wallets.filter((w) => w.includeInTotals === false).length;
  const personalWalletsCount = wallets.filter((w) => !w.isSharedFromOther && (!w.sharedWith || w.sharedWith.length === 0)).length;
  const sharedWalletsCount = wallets.filter((w) => w.isSharedFromOther || (w.sharedWith && w.sharedWith.length > 0)).length;

  const hasExcludedWallets = excludedWalletsCount > 0;

  // Scoped lists according to dataScope ('all' | 'included' | 'separate' | 'personal' | 'shared') or selectedWalletIds / selectedWalletId
  const scopedWallets = React.useMemo(() => {
    if (selectedWalletIds.length > 0 && selectedWalletIds.length < wallets.length) {
      return wallets.filter((w) => selectedWalletIds.some((sId) => isWalletMatch(w, sId)));
    }
    if (selectedWalletId !== 'all') {
      const targetW = wallets.find((w) => isWalletMatch(w, selectedWalletId));
      return targetW ? [targetW] : wallets;
    }
    if (dataScope === 'separate') return wallets.filter((w) => w.includeInTotals === false);
    if (dataScope === 'included') return wallets.filter((w) => w.includeInTotals !== false);
    if (dataScope === 'personal') return wallets.filter((w) => !w.isSharedFromOther && (!w.sharedWith || w.sharedWith.length === 0));
    if (dataScope === 'shared') return wallets.filter((w) => w.isSharedFromOther || (w.sharedWith && w.sharedWith.length > 0));
    // Default 'all':
    return wallets;
  }, [wallets, dataScope, selectedWalletId, selectedWalletIds]);

  const scopedTransactions = React.useMemo(() => {
    if (selectedWalletIds.length > 0 && selectedWalletIds.length < wallets.length) {
      return transactions.filter((t) =>
        scopedWallets.some((w) => isWalletMatch(w, t.walletId))
      );
    }
    if (selectedWalletId !== 'all') {
      const targetW = wallets.find((w) => isWalletMatch(w, selectedWalletId));
      if (!targetW) return transactions;
      return transactions.filter((t) => isWalletMatch(targetW, t.walletId));
    }
    if (dataScope === 'all') return transactions;
    return transactions.filter((t) => scopedWallets.some((w) => isWalletMatch(w, t.walletId)));
  }, [transactions, dataScope, scopedWallets, selectedWalletId, selectedWalletIds, wallets]);

  const totalIncludedBalance = React.useMemo(() => {
    return wallets
      .filter((w) => w.includeInTotals !== false)
      .reduce((sum, w) => sum + convertToMMK(w.balance, w.currency, w.exchangeRate), 0);
  }, [wallets]);

  const totalExcludedBalance = React.useMemo(() => {
    return wallets
      .filter((w) => w.includeInTotals === false)
      .reduce((sum, w) => sum + convertToMMK(w.balance, w.currency, w.exchangeRate), 0);
  }, [wallets]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleManualSync = async () => {
    if (user && syncDataToCloud) {
      await syncDataToCloud(transactions, debts, wallets, categories, budgets, plan);
    }
  };

  // Filter transactions
  const currentMonthStr = React.useMemo(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, []);

  // v6.5 — Compute date bounds from timeFilter
  const dateBounds = React.useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();
    const toStr = (dt: Date) => {
      const yy = dt.getFullYear();
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const dd = String(dt.getDate()).padStart(2, '0');
      return yy + '-' + mm + '-' + dd;
    };

    switch (timeFilter) {
      case 'all':
        return null;
      case 'this_month':
        return { from: y + '-' + String(m + 1).padStart(2, '0') + '-01', to: toStr(now) };
      case 'this_week': {
        const day = now.getDay();
        const diff = day === 0 ? 6 : day - 1;
        const monday = new Date(now);
        monday.setDate(d - diff);
        return { from: toStr(monday), to: toStr(now) };
      }
      case 'last_30': {
        const start = new Date(now);
        start.setDate(d - 29);
        return { from: toStr(start), to: toStr(now) };
      }
      case 'this_year':
        return { from: y + '-01-01', to: toStr(now) };
      case 'custom':
        return customRange;
      default:
        return null;
    }
  }, [timeFilter, customRange]);

  const filteredTransactions = React.useMemo(() => {
    if (!dateBounds) return scopedTransactions;
    const { from, to } = dateBounds;
    return scopedTransactions.filter((t) => {
      if (!t.date) return false;
      return t.date >= from && t.date <= to;
    });
  }, [scopedTransactions, dateBounds]);

  // Category map & Wallet map
  const catMap = React.useMemo(() => new Map<string, Category>(categories.map((c) => [c.id, c])), [categories]);
  const walletMap = React.useMemo(() => buildWalletMap(wallets), [wallets]);

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

  const convertDebtToMMK = React.useCallback(
    (d: Debt) => {
      let w = walletMap.get(d.walletId);
      if (!w) {
        w = wallets.find((wall) => isWalletMatch(wall, d.walletId));
      }
      const remaining = Math.max(0, d.totalAmount - d.paidAmount);
      return convertToMMK(remaining, w?.currency, w?.exchangeRate);
    },
    [walletMap, wallets]
  );

  // Calculate totals (excluding internal transfers when looking at all wallets, but including for single wallet)
  const isSingleWalletScoped =
    selectedWalletId !== 'all' ||
    (selectedWalletIds.length > 0 && selectedWalletIds.length < wallets.length);

  const totalIncome = React.useMemo(() => {
    return filteredTransactions
      .filter((t) => {
        if (t.type !== 'income') return false;
        if (isTransferTransaction(t)) {
          return isSingleWalletScoped && (t.transferType === 'transfer_in' || t.walletId === selectedWalletId);
        }
        return true;
      })
      .reduce((sum, t) => sum + convertTxToMMK(t), 0);
  }, [filteredTransactions, convertTxToMMK, isSingleWalletScoped, selectedWalletId]);

  const totalExpense = React.useMemo(() => {
    return filteredTransactions
      .filter((t) => {
        if (t.type !== 'expense') return false;
        if (isTransferTransaction(t)) {
          return isSingleWalletScoped && (t.transferType === 'transfer_out' || t.walletId === selectedWalletId);
        }
        return true;
      })
      .reduce((sum, t) => sum + convertTxToMMK(t), 0);
  }, [filteredTransactions, convertTxToMMK, isSingleWalletScoped, selectedWalletId]);

  const netSavings = React.useMemo(() => totalIncome - totalExpense, [totalIncome, totalExpense]);

  // Net wallet balance in MMK equivalent
  const totalWalletBalance = scopedWallets.reduce(
    (sum, w) => sum + convertToMMK(w.balance, w.currency, w.exchangeRate),
    0
  );

  const totalOpeningBalance = React.useMemo(() => {
    return totalWalletBalance - netSavings;
  }, [totalWalletBalance, netSavings]);

  // Debt calculations
  const activeDebts = debts.filter((d) => d.status === 'active');
  const totalReceivable = activeDebts
    .filter((d) => d.type === 'receivable')
    .reduce((sum, d) => sum + convertDebtToMMK(d), 0);

  const totalPayable = activeDebts
    .filter((d) => d.type === 'payable')
    .reduce((sum, d) => sum + convertDebtToMMK(d), 0);

  // Wallet distribution visualization state
  const [walletChartType, setWalletChartType] = useState<'donut' | 'bar'>('donut');

  const walletChartData = scopedWallets.map((w) => {
    const balanceMMK = convertToMMK(w.balance, w.currency, w.exchangeRate);
    return {
      id: w.id,
      name: lang === 'my' ? w.name : w.nameEn,
      balance: Math.max(0, balanceMMK),
      rawBalance: w.balance,
      currency: w.currency || 'MMK',
      exchangeRate: w.exchangeRate,
      balanceMMK,
      color: w.color || '#10b981',
      percent:
        totalWalletBalance > 0
          ? Math.round((Math.max(0, balanceMMK) / totalWalletBalance) * 100)
          : 0,
    };
  });

  const CustomWalletTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const share = data.percent || 0;
      return (
        <div className="bg-slate-900/95 text-white text-xs px-3 py-2 rounded-xl shadow-xl border border-slate-700/80 backdrop-blur-xs pointer-events-none">
          <div className="font-bold text-white mb-0.5">{data.name}</div>
          <div className="text-emerald-400 font-extrabold">
            {formatCurrency(data.rawBalance, data.currency)}
          </div>
          {data.currency !== 'MMK' && (
            <div className="text-slate-300 text-[10px]">
              ≈ {data.balanceMMK.toLocaleString()} MMK
            </div>
          )}
          <div className="text-slate-400 text-[10px] mt-0.5">
            {share}% {lang === 'my' ? 'ပိုင်ဆိုင်မှု ဝေစု' : 'of total funds'}
          </div>
        </div>
      );
    }
    return null;
  };

  // Expense by category (exclude internal transfers)
  const expenseByCategory: Record<string, number> = {};
  filteredTransactions
    .filter((t) => t.type === 'expense' && !isTransferTransaction(t))
    .forEach((t) => {
      expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + convertTxToMMK(t);
    });

  const sortedExpenseCats = Object.entries(expenseByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Overdue / Urgent debts
  const urgentDebts = activeDebts
    .filter((d) => d.dueDate)
    .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
    .slice(0, 3);

  // Recent 5 transactions
  const recentTransactions = [...scopedTransactions]
    .sort((a, b) => {
      const bDate = new Date(b.date).getTime() || 0;
      const aDate = new Date(a.date).getTime() || 0;
      if (bDate !== aDate) return bDate - aDate;
      const bCreated = typeof b.createdAt === 'number' ? b.createdAt : new Date(b.createdAt || b.date).getTime() || 0;
      const aCreated = typeof a.createdAt === 'number' ? a.createdAt : new Date(a.createdAt || a.date).getTime() || 0;
      return bCreated - aCreated;
    })
    .slice(0, 5);

  // 1. Savings Goal calculations
  const savingsTargetEnabled = safeGetItem('ngwe_savings_target_enabled') === 'true';
  const savedSavingsTargetStr = safeGetItem(`ngwe_savings_target_${currentMonthStr}`) ?? safeGetItem('ngwe_savings_target_default');
  const savingsTargetAmount = (savingsTargetEnabled && savedSavingsTargetStr) ? Number(savedSavingsTargetStr) : 0;

  let savingsGoalSubtitle = '';
  let savingsGoalBadge = 'Target';

  if (!savingsTargetEnabled || savingsTargetAmount <= 0) {
    savingsGoalSubtitle = lang === 'my' ? 'မသတ်မှတ်ရသေးပါ' : 'Not Set Yet';
    savingsGoalBadge = lang === 'my' ? 'မသတ်မှတ်ရ' : 'Not Set';
  } else {
    const progressPercent = Math.round((Math.max(0, netSavings) / savingsTargetAmount) * 100);
    savingsGoalSubtitle = lang === 'my'
      ? `${progressPercent}% ပြည့်မီပြီ`
      : `${progressPercent}% Achieved`;
    savingsGoalBadge = progressPercent >= 100 ? (lang === 'my' ? 'ပြည့်မီ' : 'Done') : 'Target';
  }

  // 2. Comprehensive Gamified Financial Health calculation (7 Tiers with exact color mappings)
  const financialHealth = React.useMemo(() => {
    return calculateFinancialHealth(
      totalIncome,
      totalExpense,
      totalPayable,
      totalReceivable,
      totalWalletBalance
    );
  }, [totalIncome, totalExpense, totalPayable, totalReceivable, totalWalletBalance]);

  return (
    <div className="space-y-6">
      {/* Eye-Friendly Financial Overview Banner */}
      <ClayRocketIllustration
        lang={lang}
        onAddIncome={() => onAddTransaction('income')}
        onAddExpense={() => onAddTransaction('expense')}
        onAddDebt={onAddDebt}
      />

      {/* Filter and Quick Action Toolbar - Compact Unified Row */}
      <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto flex-1">
          {/* Multi-Wallet Checkbox Selector */}
          <div className="w-full sm:w-auto min-w-[210px] flex-1 sm:flex-initial">
            <MultiWalletSelector
              wallets={wallets}
              selectedWalletIds={selectedWalletIds}
              onChangeSelectedWalletIds={(ids) => {
                setSelectedWalletIds(ids);
                setSelectedWalletId('all');
              }}
              lang={lang}
              compact
            />
          </div>

          {/* Time Filter Buttons + Period Dropdown (v6.5) */}
          <div className="flex items-center gap-1.5 relative" ref={periodDropdownRef}>
            <button
              onClick={() => handleSetTimeFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl cursor-pointer transition-all active:scale-95 ${
                timeFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 border border-slate-200/80'
              }`}
            >
              {lang === 'my' ? 'တစ်သက်တာ (All-Time)' : 'All-Time'}
            </button>
            <button
              onClick={() => handleSetTimeFilter('this_month')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl cursor-pointer transition-all active:scale-95 ${
                timeFilter === 'this_month'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 border border-slate-200/80'
              }`}
            >
              {lang === 'my' ? 'ယခုလ စာရင်း' : 'This Month'}
            </button>
            <button
              type="button"
              onClick={openPeriodDropdown}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl cursor-pointer transition-all active:scale-95 flex items-center gap-1 ${
                timeFilter === 'this_week' || timeFilter === 'last_30' || timeFilter === 'this_year' || timeFilter === 'custom'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 border border-slate-200/80'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{getTimeFilterLabel(timeFilter, customRange, lang)}</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {isPeriodDropdownOpen && (
              <div className="absolute top-full mt-1 right-0 z-40 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 min-w-[230px] max-w-[calc(100vw-2rem)]">
                <button
                  type="button"
                  onClick={() => { handleSetTimeFilter('this_week'); setIsPeriodDropdownOpen(false); }}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors"
                >
                  {'📆 '}{lang === 'my' ? 'ဒီအပတ်' : 'This Week'}
                </button>
                <button
                  type="button"
                  onClick={() => { handleSetTimeFilter('last_30'); setIsPeriodDropdownOpen(false); }}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors"
                >
                  {'📆 '}{lang === 'my' ? 'ပြီးခဲ့သည့် ၃၀ ရက်' : 'Last 30 Days'}
                </button>
                <button
                  type="button"
                  onClick={() => { handleSetTimeFilter('this_year'); setIsPeriodDropdownOpen(false); }}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors"
                >
                  {'📆 '}{lang === 'my' ? 'ဒီနှစ်' : 'This Year'}
                </button>

                <div className="border-t border-slate-100 my-1.5" />

                <div className="px-2 pb-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    {lang === 'my' ? 'စိတ်ကြိုက် ရက်စွဲ' : 'Custom Range'}
                  </div>
                  <label className="block text-[11px] text-slate-600 mb-0.5 font-medium">
                    {lang === 'my' ? 'မှ' : 'From'}
                  </label>
                  <input
                    type="date"
                    value={tempFrom}
                    onChange={(e) => setTempFrom(e.target.value)}
                    className="w-full mb-1.5 px-2 py-1 text-xs border border-slate-200 rounded-lg focus:border-emerald-500 outline-none"
                  />
                  <label className="block text-[11px] text-slate-600 mb-0.5 font-medium">
                    {lang === 'my' ? 'သည်' : 'To'}
                  </label>
                  <input
                    type="date"
                    value={tempTo}
                    onChange={(e) => setTempTo(e.target.value)}
                    className="w-full mb-2 px-2 py-1 text-xs border border-slate-200 rounded-lg focus:border-emerald-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={applyCustomRange}
                    className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors active:scale-95"
                  >
                    {lang === 'my' ? 'အသုံးပြုမည်' : 'Apply'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowSummaryTable(!showSummaryTable)}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl cursor-pointer bg-indigo-50 text-indigo-800 border border-indigo-200/80 hover:bg-indigo-100 transition-all active:scale-95 flex items-center gap-1"
          >
            <span>{showSummaryTable ? (lang === 'my' ? '➖ ဇယားပိတ်မည်' : '➖ Hide Table') : (lang === 'my' ? '📊 Table View ဇယား' : '📊 Table View')}</span>
          </button>
          <button
            onClick={() => onSelectTab('transactions')}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl cursor-pointer bg-emerald-50 text-emerald-800 border border-emerald-200/80 hover:bg-emerald-100 transition-all active:scale-95 flex items-center gap-1"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-emerald-600" />
            <span>{lang === 'my' ? 'မှတ်တမ်းများကြည့်ရန်' : 'View Records'}</span>
          </button>
          {onManualSync && (
            <button
              onClick={onManualSync}
              disabled={isSyncing}
              className="px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-xl cursor-pointer bg-sky-50 text-sky-800 border border-sky-300 hover:bg-sky-100 transition-all active:scale-95 flex items-center gap-1.5 shadow-2xs shrink-0"
              title={lang === 'my' ? 'Cloud သို့ မနျူရယ် Sync ပြုလုပ်မည်' : 'Sync with Cloud Now'}
            >
              <RefreshCw className={`w-3.5 h-3.5 text-sky-700 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : (lang === 'my' ? '🔄 Sync' : '🔄 Sync')}</span>
            </button>
          )}

          {onOpenDatabaseTracker && (
            <button
              type="button"
              onClick={onOpenDatabaseTracker}
              className="px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-xl cursor-pointer bg-indigo-50 text-indigo-900 border border-indigo-200 hover:bg-indigo-100 transition-all active:scale-95 flex items-center gap-1.5 shadow-2xs shrink-0"
              title={lang === 'my' ? 'Database ရောက်/မရောက် စစ်ဆေးသည့် Tracker ဖွင့်မည်' : 'Open Database Delivery Tracker'}
            >
              <Database className="w-3.5 h-3.5 text-indigo-700" />
              <span className="hidden sm:inline">{lang === 'my' ? 'DB Tracker' : 'DB Tracker'}</span>
              {cloudTxIds && (
                <span className="px-1.5 py-0.2 rounded-full bg-indigo-200 text-indigo-950 font-mono text-[10px]">
                  {transactions.filter((t) => cloudTxIds.has(t.id)).length}/{transactions.length}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Financial Summary Table View */}
      {showSummaryTable && (
        <FinancialSummaryTable
          income={totalIncome}
          expense={totalExpense}
          incomeCount={filteredTransactions.filter((t) => t.type === 'income' && !isTransferTransaction(t)).length}
          expenseCount={filteredTransactions.filter((t) => t.type === 'expense' && !isTransferTransaction(t)).length}
          selectedWallets={scopedWallets}
          transactions={filteredTransactions}
          lang={lang}
        />
      )}

        {/* Search button */}
        <button
          id="dash-search-trigger-btn"
          onClick={onOpenSearch}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 shadow-xs transition-all cursor-pointer text-xs font-medium active:scale-95"
        >
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <span>{lang === 'my' ? 'ရှာဖွေရန်' : 'Search'}</span>
          <kbd className="hidden sm:inline-block text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">⌘K</kbd>
        </button>



      {/* Financial Overview Insight Cards */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-bold text-sm sm:text-base text-slate-900 tracking-tight">
            {lang === 'my' ? 'ဘဏ္ဍာရေး အနှစ်ချုပ်' : 'Financial Summary'}
          </h3>
          <span
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer hover:underline"
            onClick={() => onSelectTab('analytics')}
          >
            {lang === 'my' ? 'အသေးစိတ်ကြည့်ရန်' : 'view details'}
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <ClayCategoryCard
            type="alpha"
            title={lang === 'my' ? 'စုဆောင်းငွေ ပန်းတိုင်' : 'Savings Goal'}
            subtitle={savingsGoalSubtitle}
            badge={savingsGoalBadge}
            onClick={() => {
              const el = document.getElementById('monthly-savings-target-section');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              } else {
                onSelectTab('analytics');
              }
            }}
          />
          <FinancialHealthCard
            health={financialHealth}
            lang={lang}
            onClick={() => setIsHealthModalOpen(true)}
          />
          <ClayCategoryCard
            type="avatar"
            title={lang === 'my' ? 'အကြွေး စာရင်းများ' : 'Debt Obligations'}
            subtitle={`${debts.length} ${lang === 'my' ? 'ခု မှတ်ထားသည်' : 'records'}`}
            badge="Debts"
            onClick={() => onSelectTab('debts')}
          />
          <ClayCategoryCard
            type="clipboard"
            title={lang === 'my' ? 'မှတ်တမ်း စုစုပေါင်း' : 'Total Records'}
            subtitle={`${filteredTransactions.length} ${lang === 'my' ? 'ခု မှတ်ပြီး' : 'entries'}`}
            badge="Records"
            onClick={() => onSelectTab('transactions')}
          />
        </div>
      </div>

      {/* MONTHLY SAVINGS TARGET COMPONENT */}
      <div id="monthly-savings-target-section" className="scroll-mt-6">
        <MonthlySavingsTarget
          income={totalIncome}
          expense={totalExpense}
          lang={lang}
          plan={plan}
          onOpenUpgrade={onOpenUpgrade}
        />
      </div>

      {/* DAILY SPENDING LIMIT CARD */}
      <div className="scroll-mt-6">
        <DailySpendingLimitCard
          transactions={transactions}
          lang={lang}
        />
      </div>

      {/* SMART CALENDAR DAILY SUMMARY CARD */}
      <div className="scroll-mt-6">
        <SmartCalendarCard
          transactions={transactions}
          categories={categories}
          wallets={wallets}
          lang={lang}
        />
      </div>

      {/* CURRENT MONTH BUDGET SUMMARY CARD */}
      <div className="scroll-mt-6">
        <CurrentMonthBudgetSummaryCard
          budgets={budgets as any}
          categories={categories}
          transactions={transactions}
          lang={lang}
        />
      </div>

      {/* CURRENT MONTH EXPENSE DONUT CHART BREAKDOWN */}
      <div className="scroll-mt-6">
        <CurrentMonthExpenseDonutChart
          transactions={transactions}
          categories={categories}
          lang={lang}
        />
      </div>

      {/* 6-MONTH CATEGORY SPENDING TREND LINE CHART */}
      <div className="scroll-mt-6">
        <CategorySpendingTrendLineChart
          transactions={transactions}
          categories={categories}
          lang={lang}
        />
      </div>

      {/* Monthly Empty Filter Helper Banner */}
      {timeFilter !== 'all' && filteredTransactions.length === 0 && scopedTransactions.length > 0 && (
        <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-3.5 px-4 flex items-center justify-between gap-3 text-xs text-amber-900 shadow-xs">
          <div className="flex items-center gap-2.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 animate-pulse" />
            <span>
              {lang === 'my'
                ? `ယခုလ (${currentMonthStr}) တွင် စာရင်းသစ် မရှိသေးပါ။ ပြသထားသော လက်ကျန်ငွေ (${formatMMK(totalWalletBalance)}) သည် ယခင်လများမှ စုစုပေါင်း လက်ကျန် ဖြစ်ပါသည်။`
                : `No records yet for this month (${currentMonthStr}). The funds shown (${formatMMK(totalWalletBalance)}) are from previous months.`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleSetTimeFilter('all')}
            className="px-3 py-1.5 rounded-xl bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold transition-all shrink-0 cursor-pointer text-xs"
          >
            {lang === 'my' ? 'မှတ်တမ်းအားလုံး ပြန်ကြည့်မည်' : 'View All-Time'}
          </button>
        </div>
      )}

      {/* Main KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Wallet Cash */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              {dataScope === 'separate'
                ? (lang === 'my' ? 'သီးသန့် အကောင့်များ လက်ကျန်' : 'Separate Accounts Balance')
                : dataScope === 'all'
                ? (lang === 'my' ? 'အကောင့်အားလုံး စုစုပေါင်း' : 'All Accounts Total Funds')
                : (lang === 'my' ? 'လက်ကျန်ငွေ စုစုပေါင်း (ရောထားသည်)' : 'Total Net Funds (Included)')}
            </span>
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200/60">
              <Wallet className="w-5 h-5 text-slate-600" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight font-sans">
              {formatMMK(totalWalletBalance)}
            </div>
            {/* Reconciliation Breakdown */}
            <div className="mt-1 text-[11px] text-slate-500 font-medium">
              {timeFilter === 'all' ? (
                <div className="flex items-center gap-1 flex-wrap">
                  <span>{lang === 'my' ? 'စတင်' : 'Open'}:</span>
                  <span className="font-bold text-slate-700 font-mono">{formatMMK(totalOpeningBalance)}</span>
                  <span>+</span>
                  <span>{lang === 'my' ? 'အသားတင်' : 'Net'}:</span>
                  <span className={`font-bold font-mono ${netSavings >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {netSavings >= 0 ? `+${formatMMK(netSavings)}` : formatMMK(netSavings)}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1 flex-wrap">
                  <span>{lang === 'my' ? 'ယခင်လများမှ' : 'Prior'}:</span>
                  <span className="font-bold text-slate-700 font-mono">{formatMMK(totalWalletBalance - netSavings)}</span>
                  <span>+</span>
                  <span>{lang === 'my' ? 'ယခုလ' : 'This Mo'}:</span>
                  <span className={`font-bold font-mono ${netSavings >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {netSavings >= 0 ? `+${formatMMK(netSavings)}` : formatMMK(netSavings)}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-2 font-medium flex-wrap gap-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                <span>{scopedWallets.length} {lang === 'my' ? 'ပိုက်ဆံအိတ်များ' : 'wallets'}</span>
              </div>
              {hasExcludedWallets && dataScope !== 'separate' && (
                <button
                  type="button"
                  onClick={() => onSetDataScope?.('separate')}
                  className="text-[10px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200 cursor-pointer transition-colors inline-flex items-center gap-1"
                  title={lang === 'my' ? 'သီးသန့်အကောင့်များသာ ကြည့်မည်' : 'View separate wallets only'}
                >
                  <span>🚫 {excludedWalletsCount} {lang === 'my' ? 'ခု မရောပါ' : 'separate'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Total Income */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
              {timeFilter === 'this_month'
                ? (lang === 'my' ? 'ယခုလ ဝင်ငွေ' : 'This Month Inflow')
                : (lang === 'my' ? 'စုစုပေါင်း ဝင်ငွေ' : 'Total Inflow')}
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
              <ArrowDownLeft className="w-5 h-5 stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-700 tracking-tight font-sans">
              +{formatMMK(totalIncome)}
            </div>
            <div className="text-xs text-slate-500 mt-1 font-medium">
              {filteredTransactions.filter((t) => t.type === 'income' && !isTransferTransaction(t)).length}{' '}
              {lang === 'my' ? 'ကြိမ် ဝင်ရောက်ထားသည်' : 'inflow records'}
            </div>
          </div>
        </div>

        {/* Total Expense */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider">
              {timeFilter === 'this_month'
                ? (lang === 'my' ? 'ယခုလ ထွက်ငွေ' : 'This Month Outflow')
                : (lang === 'my' ? 'စုစုပေါင်း ထွက်ငွေ' : 'Total Outflow')}
            </span>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-100">
              <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-rose-700 tracking-tight font-sans">
              -{formatMMK(totalExpense)}
            </div>
            <div className="text-xs text-slate-500 mt-1 font-medium">
              {lang === 'my' ? 'ပိုငွေ / လိုငွေ:' : 'Net Balance:'}{' '}
              <span className={netSavings >= 0 ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                {formatMMK(netSavings)}
              </span>
            </div>
          </div>
        </div>

        {/* Debts Summary Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider">
              {lang === 'my' ? 'အကြွေး လက်ကျန်စာရင်း' : 'Net Debt Position'}
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100">
              <HandCoins className="w-5 h-5 stroke-[2]" />
            </div>
          </div>
          <div className="mt-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-700 font-medium">
                {lang === 'my' ? 'ရရန်ရှိ (Lent):' : 'Receivable:'}
              </span>
              <span className="font-bold text-emerald-800">{formatMMK(totalReceivable)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-rose-700 font-medium">
                {lang === 'my' ? 'ပေးရန်ရှိ (Debt):' : 'Payable:'}
              </span>
              <span className="font-bold text-rose-800">{formatMMK(totalPayable)}</span>
            </div>
            <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>{lang === 'my' ? 'အသားတင်:' : 'Net:'}</span>
              <span className={`font-semibold ${totalReceivable - totalPayable >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatMMK(totalReceivable - totalPayable)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* MONTHLY SPENDING COMPARISON CARD (This Month vs Previous Month with Recharts Bar Chart) */}
      <MonthlyComparisonCard
        transactions={scopedTransactions}
        categories={categories}
        wallets={scopedWallets}
        lang={lang}
        onViewDetails={() => onSelectTab('analytics')}
      />

      {/* MONTHLY SUMMARY CHART COMPONENT */}
      <MonthlySummaryChart
        transactions={scopedTransactions}
        categories={categories}
        lang={lang}
      />

      {/* Visual Analysis & Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Cash Flow Bar & Top Spending Categories */}
        <div className="lg:col-span-2 space-y-6">
          {/* Income vs Expense Ratio */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base text-slate-900">
                  {lang === 'my' ? 'ဝင်ငွေနှင့် ထွက်ငွေ နှိုင်းယှဉ်ချက်' : 'Income vs Expense Breakdown'}
                </span>
              </div>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
                <button
                  onClick={() => setTimeFilter('this_month')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    timeFilter === 'this_month' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  {lang === 'my' ? 'ယခုလ' : 'This Month'}
                </button>
                <button
                  onClick={() => setTimeFilter('all')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    timeFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  {lang === 'my' ? 'အားလုံး' : 'All Time'}
                </button>
              </div>
            </div>

            {/* Visual ratio bar */}
            {totalIncome + totalExpense > 0 ? (
              <div className="space-y-3">
                <div className="h-4 rounded-full overflow-hidden flex bg-slate-100">
                  <div
                    style={{ width: `${(totalIncome / (totalIncome + totalExpense || 1)) * 100}%` }}
                    className="bg-emerald-500 transition-all duration-500"
                    title={`Income: ${formatMMK(totalIncome)}`}
                  />
                  <div
                    style={{ width: `${(totalExpense / (totalIncome + totalExpense || 1)) * 100}%` }}
                    className="bg-rose-500 transition-all duration-500"
                    title={`Expense: ${formatMMK(totalExpense)}`}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span>
                      {lang === 'my' ? 'ဝင်ငွေ' : 'Income'}: {totalIncome + totalExpense > 0 ? Math.round((totalIncome / (totalIncome + totalExpense)) * 100) : 0}% ({formatMMK(totalIncome)})
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                    <span>
                      {lang === 'my' ? 'ထွက်ငွေ' : 'Expense'}: {totalIncome + totalExpense > 0 ? Math.round((totalExpense / (totalIncome + totalExpense)) * 100) : 0}% ({formatMMK(totalExpense)})
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-3 text-center">
                {lang === 'my' ? 'ရွေးချယ်ထားသော ကာလအတွင်း စာရင်းမရှိသေးပါ' : 'No records for this period.'}
              </p>
            )}

            {/* Top 4 Expense Categories Progress Bars */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {lang === 'my' ? 'အသုံးစရိတ် အများဆုံး ကဏ္ဍများ' : 'Top Spending Categories'}
                </h3>
                <button
                  onClick={() => onSelectTab('analytics')}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  {lang === 'my' ? 'ဘတ်ဂျက် စီမံရန်' : 'Manage Budgets'}
                </button>
              </div>

              {sortedExpenseCats.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">
                  {lang === 'my' ? 'ထွက်ငွေ မှတ်တမ်း မရှိသေးပါ' : 'No expenses recorded yet.'}
                </p>
              ) : (
                <div className="space-y-3">
                  {sortedExpenseCats.map(([catId, amount]) => {
                    const cat = catMap.get(catId);
                    const percentage = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0;
                    const b = budgets.find((item) => item.categoryId === catId);
                    const bLimit = b
                      ? b.calcType === 'percentage'
                        ? Math.round((totalIncome * b.value) / 100)
                        : b.value
                      : null;
                    const isOverBudget = bLimit !== null && bLimit > 0 && amount > bLimit;

                    return (
                      <div key={catId} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-6 h-6 rounded-md flex items-center justify-center text-white"
                              style={{ backgroundColor: cat?.color || '#EF4444' }}
                            >
                              <CategoryIcon name={cat?.icon || 'ShoppingCart'} className="w-3.5 h-3.5" />
                            </span>
                            <span className="font-medium text-slate-800">
                              {lang === 'my' ? cat?.name : cat?.nameEn}
                            </span>
                            {isOverBudget && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 font-bold">
                                {lang === 'my' ? 'ဘတ်ဂျက်ကျော်' : 'Over'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500 font-medium">{percentage}%</span>
                            <span className={`font-bold ${isOverBudget ? 'text-rose-600' : 'text-slate-900'}`}>
                              {formatMMK(amount)}
                              {bLimit !== null && (
                                <span className="text-[10px] font-normal text-slate-400 ml-1">
                                  / {formatMMK(bLimit)}
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isOverBudget ? 'bg-rose-500' : ''
                            }`}
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: isOverBudget ? undefined : (cat?.color || '#EF4444'),
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Period Spending Comparison Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 text-white shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 text-emerald-400 flex items-center justify-center shrink-0 border border-white/10">
                <ArrowUpDown className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm sm:text-base text-white">
                    {lang === 'my' ? 'လစဉ်/ကာလအလိုက် သုံးစွဲမှု နှိုင်းယှဉ်ချက်' : 'Period Spending Comparison'}
                  </h3>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                    NEW
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-md">
                  {lang === 'my'
                    ? 'ပြီးခဲ့သည့်လနှင့် ယခုလ သို့မဟုတ် စိတ်ကြိုက် သတ်မှတ်ထားသော ရက်စွဲများကြား ကဏ္ဍအလိုက် အသုံးစရိတ် ကွာခြားချက်များကို စိစစ်ပါ'
                    : 'Analyze month-over-month differences or custom date ranges by category with side-by-side breakdowns'}
                </p>
              </div>
            </div>

            <button
              id="dashboard-open-comparison-btn"
              onClick={() => onSelectTab('analytics')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-sm active:scale-95 shrink-0"
            >
              <span>{lang === 'my' ? 'နှိုင်းယှဉ်ချက် ကြည့်မည်' : 'Compare Spending'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Recent Transactions List */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-sm sm:text-base text-slate-900">
                  {lang === 'my' ? 'လတ်တလော မှတ်တမ်းများ' : 'Recent Transactions'}
                </h2>
                <p className="text-xs text-slate-500">
                  {lang === 'my' ? 'နောက်ဆုံးသွင်းထားသော စာရင်း ၅ ခု' : 'Latest 5 entries'}
                </p>
              </div>
              <button
                onClick={() => onSelectTab('transactions')}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                <span>{lang === 'my' ? 'အားလုံးကြည့်ရန်' : 'View All'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {recentTransactions.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">
                  {lang === 'my' ? 'မှတ်တမ်းမရှိသေးပါ' : 'No transactions recorded yet.'}
                </div>
              ) : (
                recentTransactions.map((t) => {
                  const cat = catMap.get(t.category);
                  const wallet = walletMap.get(t.walletId);
                  const isIncome = t.type === 'income';

                  return (
                    <div key={t.id} className="py-3 flex items-start sm:items-center justify-between gap-3">
                      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 mt-0.5 sm:mt-0 shadow-xs"
                          style={{ backgroundColor: cat?.color || (isIncome ? '#10B981' : '#EF4444') }}
                        >
                          <CategoryIcon name={cat?.icon || 'Tag'} className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-semibold text-sm text-slate-900 truncate">
                              {lang === 'my' ? cat?.name : cat?.nameEn || t.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10.5px] font-semibold border max-w-[140px] sm:max-w-[180px] shadow-2xs ${
                              wallet?.isSharedFromOther || (wallet?.sharedWith && wallet.sharedWith.length > 0)
                                ? 'bg-amber-50/90 text-amber-950 border-amber-300'
                                : 'bg-indigo-50/90 text-indigo-900 border-indigo-200/80'
                            }`}>
                              <Wallet className={`w-2.5 h-2.5 shrink-0 ${wallet?.isSharedFromOther ? 'text-amber-600' : 'text-indigo-600'}`} />
                              <span className="truncate">{lang === 'my' ? wallet?.name : wallet?.nameEn || t.walletId}</span>
                              {(wallet?.isSharedFromOther || (wallet?.sharedWith && wallet.sharedWith.length > 0)) && (
                                <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-amber-200/80 text-amber-900 ml-0.5 whitespace-nowrap shrink-0">
                                  {wallet.isSharedFromOther ? (wallet.ownerName ? `🤝 ${wallet.ownerName}` : '🤝 Shared') : '🤝 Shared'}
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 flex-wrap pt-0.5">
                            <span className="text-[11px] text-slate-500">{t.date}</span>
                            {t.note && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="truncate max-w-[140px] sm:max-w-xs text-slate-400 italic text-[11px]">{t.note}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 ml-1.5">
                        <div
                          className={`font-bold text-sm sm:text-base font-mono whitespace-nowrap ${
                            isIncome ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {isIncome ? '+' : '-'}{formatMMK(t.amount)}
                        </div>
                        <span className="text-[10px] text-slate-400 uppercase block">
                          {isIncome ? (lang === 'my' ? 'ဝင်ငွေ' : 'Income') : (lang === 'my' ? 'ထွက်ငွေ' : 'Expense')}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Urgent Debts & Wallets Snapshot */}
        <div className="space-y-6">
          {/* Urgent / Active Debts Widget */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-sm sm:text-base text-slate-900">
                  {lang === 'my' ? 'အကြွေး သတိပေးချက်များ' : 'Debt Reminders'}
                </h3>
              </div>
              <button
                onClick={() => onSelectTab('debts')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                {lang === 'my' ? 'အားလုံး' : 'All'}
              </button>
            </div>

            {urgentDebts.length === 0 ? (
              <div className="py-4 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1 opacity-80" />
                <p className="text-xs text-slate-500">
                  {lang === 'my' ? 'ရက်လွန် အကြွေးများ မရှိပါ' : 'No pending debt due dates!'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {urgentDebts.map((debt) => {
                  const remaining = debt.totalAmount - debt.paidAmount;
                  const overdue = isOverdue(debt.dueDate);
                  const isReceivable = debt.type === 'receivable';

                  return (
                    <div
                      key={debt.id}
                      className={`p-3 rounded-xl border ${
                        overdue
                          ? 'bg-rose-50/70 border-rose-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {debt.personName}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            isReceivable
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {isReceivable
                            ? (lang === 'my' ? 'ရရန်ရှိ' : 'Owed to you')
                            : (lang === 'my' ? 'ပေးရန်ရှိ' : 'You owe')}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            {formatMMK(remaining)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {lang === 'my' ? 'စုစုပေါင်း:' : 'Total:'} {formatMMK(debt.totalAmount)}
                          </div>
                        </div>

                        {debt.dueDate && (
                          <div className="text-right">
                            <span
                              className={`text-[10px] font-semibold flex items-center gap-1 ${
                                overdue ? 'text-rose-600 font-bold' : 'text-slate-500'
                              }`}
                            >
                              <Clock className="w-3 h-3" />
                              {overdue
                                ? (lang === 'my' ? 'ရက်ကျော်ပြီ' : 'Overdue!')
                                : debt.dueDate}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Wallets Quick Snapshot & Distribution Visualization */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2.5">
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  <span>{lang === 'my' ? 'ပိုက်ဆံအိတ်များ လက်ကျန်' : 'Wallets & Balances'}</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  {lang === 'my' ? 'လက်ကျန်ငွေ ဖြန့်ကြက်မှု ဇယား' : 'Current balance distribution'}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Chart Mode Toggle */}
                <div className="bg-slate-100 p-0.5 rounded-lg flex items-center">
                  <button
                    type="button"
                    onClick={() => setWalletChartType('donut')}
                    className={`p-1.5 rounded-md text-xs font-semibold transition-all ${
                      walletChartType === 'donut'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title={lang === 'my' ? 'စက်ဝိုင်းပုံဇယား (Pie Chart)' : 'Pie Chart'}
                  >
                    <PieChartIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setWalletChartType('bar')}
                    className={`p-1.5 rounded-md text-xs font-semibold transition-all ${
                      walletChartType === 'bar'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title={lang === 'my' ? 'တိုင်ပုံစံဇယား (Bar Chart)' : 'Bar Chart'}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => onSelectTab('wallets')}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 px-2 py-1 rounded-lg hover:bg-emerald-50 transition-colors"
                >
                  {lang === 'my' ? 'စီမံမည်' : 'Manage'}
                </button>
              </div>
            </div>

            {/* Recharts Visualization */}
            {totalWalletBalance <= 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 my-3">
                {lang === 'my'
                  ? 'ပိုက်ဆံအိတ်များတွင် လက်ကျန်ငွေ မရှိသေးပါ'
                  : 'No active wallet balances to display'}
              </div>
            ) : (
              <div className="my-3 p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                <div className="h-44 w-full relative">
                  {walletChartType === 'donut' ? (
                    <>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <RechartsTooltip content={<CustomWalletTooltip />} />
                          <Pie
                            data={walletChartData}
                            dataKey="balance"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={46}
                            outerRadius={68}
                            paddingAngle={3}
                            animationDuration={600}
                          >
                            {walletChartData.map((entry) => (
                              <Cell key={`cell-${entry.id}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Center Stats in Donut Hole */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          {lang === 'my' ? 'စုစုပေါင်း' : 'Total'}
                        </span>
                        <span className="text-xs font-black text-slate-800">
                          {formatMMK(totalWalletBalance)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={walletChartData}
                        layout="vertical"
                        margin={{ top: 8, right: 24, left: 8, bottom: 4 }}
                      >
                        <XAxis type="number" hide />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                          axisLine={false}
                          tickLine={false}
                          width={72}
                        />
                        <RechartsTooltip content={<CustomWalletTooltip />} />
                        <Bar
                          dataKey="balance"
                          radius={[0, 6, 6, 0]}
                          animationDuration={600}
                        >
                          {walletChartData.map((entry) => (
                            <Cell key={`bar-${entry.id}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            )}

            {/* Wallets List with percentages */}
            <div className="space-y-2 mt-3">
              {scopedWallets.map((wallet) => {
                const balanceMMK = convertToMMK(wallet.balance, wallet.currency, wallet.exchangeRate);
                const percent = totalWalletBalance > 0 ? Math.round((Math.max(0, balanceMMK) / totalWalletBalance) * 100) : 0;
                const isForeign = wallet.currency && wallet.currency !== 'MMK';
                const isNegative = wallet.balance < 0;
                return (
                  <div
                    key={wallet.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl transition-colors ${
                      isNegative ? 'bg-rose-50/60 border border-rose-100 hover:bg-rose-50' : 'bg-slate-50 hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-2xs"
                        style={{ backgroundColor: wallet.color }}
                      >
                        <CategoryIcon name={wallet.icon} className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5 truncate">
                          <span>{lang === 'my' ? wallet.name : wallet.nameEn}</span>
                          {wallet.isDefault && (
                            <span className="text-[9px] font-semibold px-1 py-0.2 bg-emerald-100 text-emerald-800 rounded shrink-0">
                              {lang === 'my' ? 'အဓိက' : 'Default'}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-medium flex items-center gap-1">
                          {isNegative ? (
                            <span className="text-rose-600 font-bold bg-rose-100/80 px-1.5 py-0.2 rounded">
                              {lang === 'my' ? '⚠️ အသုံးလွန်/အနုတ်ပြနေသည်' : '⚠️ Deficit (Overdrawn)'}
                            </span>
                          ) : (
                            <span className="text-slate-500">
                              {percent}% {lang === 'my' ? 'ဝေစု' : 'share'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`font-bold text-xs block ${isNegative ? 'text-rose-600 font-black' : 'text-slate-900'}`}>
                        {formatCurrency(wallet.balance, wallet.currency)}
                      </span>
                      {isForeign && (
                        <span className={`text-[9px] font-medium block ${isNegative ? 'text-rose-500' : 'text-emerald-700'}`}>
                          ≈ {balanceMMK.toLocaleString()} MMK
                        </span>
                      )}
                      {!isNegative && (
                        <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden ml-auto mt-1">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${percent}%`,
                              backgroundColor: wallet.color,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Premium Promotion Card (if in Free plan) */}
          {plan === 'free' && (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-600/5 to-emerald-600/10 border border-amber-200 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>{lang === 'my' ? 'Premium အဆင့်မြှင့်ပါ' : 'Upgrade to Premium'}</span>
                </div>
                <span className="text-[11px] font-extrabold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-md">
                  {lang === 'my' ? '၂,၀၀၀ Ks / လ' : '2,000 Ks / mo'}
                </span>
              </div>
              <p className="text-xs text-amber-950/80 mb-3 leading-relaxed">
                {lang === 'my'
                  ? 'ကြော်ငြာများလုံးဝမပါ (100% Ad-Free)၊ လစဉ်နှိုင်းယှဉ်ချက် ကဏ္ဍအားလုံး အပြည့်အစုံနှင့် အကန့်အသတ်မဲ့ မှတ်တမ်းတင်နိုင်ပါပြီ။'
                  : '100% Ad-Free experience, full spending comparison across all categories, and unlimited records.'}
              </p>
              <button
                id="dash-upgrade-btn"
                onClick={onOpenUpgrade}
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-bold shadow-xs hover:from-amber-600 hover:to-amber-700 transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <span>{lang === 'my' ? 'အသေးစိတ်ကြည့်ရှုပြီး စမ်းသပ်ရန်' : 'View Plans & Demo'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Gamified Financial Health Details Modal (7 Color Tiers) */}
      <FinancialHealthModal
        isOpen={isHealthModalOpen}
        onClose={() => setIsHealthModalOpen(false)}
        health={financialHealth}
        lang={lang}
        onNavigateToAnalytics={() => onSelectTab('analytics')}
        onNavigateToBudgets={() => onSelectTab('analytics')}
      />
    </div>
  );
};
