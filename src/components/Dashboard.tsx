import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ArrowDownLeft, ArrowUpRight, HandCoins, AlertCircle,
  Calendar, ChevronRight, ChevronDown, Search, RefreshCw,
  Store, Database, Crown, MessageCircle, GraduationCap, BarChart3,
} from 'lucide-react';
import { BudgetConfig, Category, Debt, PlanType, Transaction, Wallet as WalletType, DataScope } from '../types';
import { formatMMK, formatLakhs, isOverdue } from '../utils/formatters';
import { convertToMMK, getCurrencyInfo } from '../utils/currency';
import { CategoryIcon } from './CategoryIcon';
import { MultiWalletSelector } from './MultiWalletSelector';
import { SmartCalendarCard } from './SmartCalendarCard';
import { useAuth } from '../context/AuthContext';
import { buildWalletMap, isWalletMatch, isTransferTransaction } from '../utils/walletBalance';

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

type TimeFilterOption = 'all' | 'this_month' | 'this_week' | 'last_30' | 'this_year' | 'custom';

export const Dashboard: React.FC<DashboardProps> = ({
  transactions, debts, wallets, categories,
  lang, dataScope = 'all',
  onAddTransaction, onAddDebt, onSelectTab, onOpenSearch,
}) => {
  const { user, isSyncing, syncDataToCloud } = useAuth();

  const [timeFilter, setTimeFilter] = useState<TimeFilterOption>('this_month');
  const [customRange, setCustomRange] = useState<{ from: string; to: string } | null>(null);
  const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = useState(false);
  const [tempFrom, setTempFrom] = useState('');
  const [tempTo, setTempTo] = useState('');
  const periodDropdownRef = useRef<HTMLDivElement>(null);
  const [selectedWalletId, setSelectedWalletId] = useState<string>('all');
  const [selectedWalletIds, setSelectedWalletIds] = useState<string[]>([]);

  // [v7.5.2] Currency-breakdown drill-down modal (Q4a=C)
  const [showCurrencyBreakdown, setShowCurrencyBreakdown] = useState<boolean>(false);

  const handleSetTimeFilter = (f: TimeFilterOption) => {
    setTimeFilter(f);
    if (f !== 'custom') setCustomRange(null);
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
      alert(lang === 'my' ? 'စတင်ရက် သည် ဆုံးရက် ထက် မကြီးရပါ' : 'From cannot be after To');
      return;
    }
    setCustomRange({ from: tempFrom, to: tempTo });
    setTimeFilter('custom');
    setIsPeriodDropdownOpen(false);
  };

  useEffect(() => {
    if (!isPeriodDropdownOpen) return;
    const h = (e: MouseEvent) => {
      if (periodDropdownRef.current && !periodDropdownRef.current.contains(e.target as Node)) {
        setIsPeriodDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [isPeriodDropdownOpen]);

  const getTimeFilterLabel = (f: TimeFilterOption, r: { from: string; to: string } | null, l: 'my' | 'en') => {
    switch (f) {
      case 'this_week': return l === 'my' ? 'ဒီအပတ်' : 'This Week';
      case 'last_30':   return l === 'my' ? '၃၀ ရက်' : 'Last 30';
      case 'this_year': return l === 'my' ? 'ဒီနှစ်' : 'This Year';
      case 'custom':    return r ? r.from.slice(5) + ' – ' + r.to.slice(5) : (l === 'my' ? 'စိတ်ကြိုက်' : 'Custom');
      case 'all':       return l === 'my' ? 'တစ်သက်တာ' : 'All Time';
      default:          return l === 'my' ? 'ယခုလ' : 'This Month';
    }
  };

  const dateBounds = useMemo(() => {
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
      case 'all': return null;
      case 'this_month': return { from: y + '-' + String(m + 1).padStart(2, '0') + '-01', to: toStr(now) };
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
      case 'this_year': return { from: y + '-01-01', to: toStr(now) };
      case 'custom':    return customRange;
      default:          return null;
    }
  }, [timeFilter, customRange]);

  const scopedWallets = useMemo(() => {
    if (selectedWalletIds.length > 0 && selectedWalletIds.length < wallets.length) {
      return wallets.filter((w) => selectedWalletIds.some((s) => isWalletMatch(w, s)));
    }
    if (selectedWalletId !== 'all') {
      const t = wallets.find((w) => isWalletMatch(w, selectedWalletId));
      return t ? [t] : wallets;
    }
    if (dataScope === 'separate') return wallets.filter((w) => w.includeInTotals === false);
    if (dataScope === 'included') return wallets.filter((w) => w.includeInTotals !== false);
    if (dataScope === 'personal') return wallets.filter((w) => !w.isSharedFromOther && (!w.sharedWith || w.sharedWith.length === 0));
    if (dataScope === 'shared')   return wallets.filter((w) => w.isSharedFromOther || (w.sharedWith && w.sharedWith.length > 0));
    // [calc-fix] Respect the per-wallet "Separate" flag so Dashboard totals
    // match WalletsView. Wallets with includeInTotals === false are excluded
    // from all Dashboard aggregates (balance, income, expense, net).
    return wallets.filter((w) => w.includeInTotals !== false);
  }, [wallets, selectedWalletId, selectedWalletIds, dataScope]);

  const scopedTransactions = useMemo(() => {
    if (selectedWalletIds.length > 0 && selectedWalletIds.length < wallets.length) {
      return transactions.filter((t) => scopedWallets.some((w) => isWalletMatch(w, t.walletId)));
    }
    if (selectedWalletId !== 'all') {
      const t = wallets.find((w) => isWalletMatch(w, selectedWalletId));
      if (!t) return transactions;
      return transactions.filter((tx) => isWalletMatch(t, tx.walletId));
    }
    if (dataScope === 'all') return transactions;
    return transactions.filter((t) => scopedWallets.some((w) => isWalletMatch(w, t.walletId)));
  }, [transactions, dataScope, scopedWallets, selectedWalletId, selectedWalletIds, wallets]);

  const filteredTransactions = useMemo(() => {
    if (!dateBounds) return scopedTransactions;
    const { from, to } = dateBounds;
    return scopedTransactions.filter((t) => t.date && t.date >= from && t.date <= to);
  }, [scopedTransactions, dateBounds]);

  const catMap = useMemo(() => new Map<string, Category>(categories.map((c) => [c.id, c])), [categories]);
  const walletMap = useMemo(() => buildWalletMap(wallets), [wallets]);

  const convertTxToMMK = useCallback((t: Transaction) => {
    let w = walletMap.get(t.walletId);
    if (!w) w = wallets.find((wall) => isWalletMatch(wall, t.walletId));
    return convertToMMK(t.amount, w?.currency, w?.exchangeRate);
  }, [walletMap, wallets]);

  const convertDebtToMMK = useCallback((d: Debt) => {
    let w = walletMap.get(d.walletId);
    if (!w) w = wallets.find((wall) => isWalletMatch(wall, d.walletId));
    const rem = Math.max(0, d.totalAmount - d.paidAmount);
    return convertToMMK(rem, w?.currency, w?.exchangeRate);
  }, [walletMap, wallets]);

  const isSingleWalletScoped =
    selectedWalletId !== 'all' ||
    (selectedWalletIds.length > 0 && selectedWalletIds.length < wallets.length);

  const totalIncome = useMemo(() => filteredTransactions.filter((t) => {
    if (t.type !== 'income') return false;
    if (isTransferTransaction(t)) return isSingleWalletScoped && (t.transferType === 'transfer_in' || t.walletId === selectedWalletId);
    return true;
  }).reduce((s, t) => s + convertTxToMMK(t), 0), [filteredTransactions, convertTxToMMK, isSingleWalletScoped, selectedWalletId]);

  const totalExpense = useMemo(() => filteredTransactions.filter((t) => {
    if (t.type !== 'expense') return false;
    if (isTransferTransaction(t)) return isSingleWalletScoped && (t.transferType === 'transfer_out' || t.walletId === selectedWalletId);
    return true;
  }).reduce((s, t) => s + convertTxToMMK(t), 0), [filteredTransactions, convertTxToMMK, isSingleWalletScoped, selectedWalletId]);

  const netSavings = totalIncome - totalExpense;

  const totalWalletBalance = scopedWallets.reduce(
    (s, w) => s + convertToMMK(w.balance, w.currency, w.exchangeRate), 0
  );

  // [v7.5.2] Group scoped wallets by currency.
  const currencyBreakdownData = useMemo(() => {
    const map: Record<string, { code: string; total: number; count: number; totalMMK: number; flag: string; symbol: string }> = {};
    scopedWallets.forEach((w) => {
      const code = (w.currency || 'MMK').toUpperCase();
      if (!map[code]) {
        const info = getCurrencyInfo(code);
        map[code] = { code, total: 0, count: 0, totalMMK: 0, flag: info.flag, symbol: info.symbol };
      }
      map[code].total += w.balance;
      map[code].count += 1;
      map[code].totalMMK += convertToMMK(w.balance, w.currency, w.exchangeRate);
    });
    return Object.values(map).sort((a, b) => b.totalMMK - a.totalMMK);
  }, [scopedWallets]);

  const activeDebts = debts.filter((d) => d.status === 'active');

  const recentTransactions = [...scopedTransactions].sort((a, b) => {
    const bD = new Date(b.date).getTime() || 0;
    const aD = new Date(a.date).getTime() || 0;
    if (bD !== aD) return bD - aD;
    const bC = typeof b.createdAt === 'number' ? b.createdAt : new Date(b.createdAt || b.date).getTime() || 0;
    const aC = typeof a.createdAt === 'number' ? a.createdAt : new Date(a.createdAt || a.date).getTime() || 0;
    return bC - aC;
  }).slice(0, 5);

  const urgentDebts = activeDebts
    .filter((d) => d.dueDate)
    .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
    .slice(0, 3);

  const todayStr = new Date().toLocaleDateString(lang === 'my' ? 'en-GB' : 'en-US', {
    weekday: 'long', month: 'short', day: 'numeric',
  });

  const handleManualSync = async () => {
    if (user && syncDataToCloud) {
      await syncDataToCloud(transactions, debts, wallets, categories, [], 'free' as PlanType);
    }
  };

  return (
    <div className="space-y-3.5">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-bold text-slate-900 truncate">{todayStr}</div>
          <div className="text-[11px] text-slate-500 truncate">
            {scopedWallets.length} {lang === 'my' ? 'ပိုက်ဆံအိတ်' : 'wallets'}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap" ref={periodDropdownRef}>
          <div className="w-full sm:w-auto min-w-[180px]">
            <MultiWalletSelector
              wallets={wallets}
              selectedWalletIds={selectedWalletIds}
              onChangeSelectedWalletIds={(ids) => { setSelectedWalletIds(ids); setSelectedWalletId('all'); }}
              lang={lang}
              compact
            />
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={openPeriodDropdown}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-white border border-slate-200 hover:bg-slate-50 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-800">{getTimeFilterLabel(timeFilter, customRange, lang)}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            {isPeriodDropdownOpen && (
              <div className="absolute top-full mt-1 right-0 z-40 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 min-w-[230px]">
                {(['this_month', 'all', 'this_week', 'last_30', 'this_year'] as const).map((f) => (
                  <button
                    key={f} type="button"
                    onClick={() => { handleSetTimeFilter(f); setIsPeriodDropdownOpen(false); }}
                    className={'w-full text-left px-3 py-2 text-xs font-medium rounded-xl transition-colors cursor-pointer ' +
                      (timeFilter === f ? 'bg-emerald-50 text-emerald-800 font-bold' : 'text-slate-700 hover:bg-slate-100')}
                  >{getTimeFilterLabel(f, null, lang)}</button>
                ))}
                <div className="border-t border-slate-100 my-1.5" />
                <div className="px-2 pb-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    {lang === 'my' ? 'စိတ်ကြိုက်' : 'Custom'}
                  </div>
                  <input type="date" value={tempFrom} onChange={(e) => setTempFrom(e.target.value)}
                    className="w-full mb-1.5 px-2 py-1 text-xs border border-slate-200 rounded-lg focus:border-emerald-500 outline-none" />
                  <input type="date" value={tempTo} onChange={(e) => setTempTo(e.target.value)}
                    className="w-full mb-2 px-2 py-1 text-xs border border-slate-200 rounded-lg focus:border-emerald-500 outline-none" />
                  <button type="button" onClick={applyCustomRange}
                    className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer">
                    {lang === 'my' ? 'အသုံးပြုမည်' : 'Apply'}
                  </button>
                </div>
              </div>
            )}
          </div>
          {onOpenSearch && (
            <button type="button" onClick={onOpenSearch}
              className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer"
              title={lang === 'my' ? 'ရှာဖွေရန်' : 'Search'}>
              <Search className="w-3.5 h-3.5" />
            </button>
          )}
          {user && (
            <button type="button" onClick={handleManualSync} disabled={isSyncing}
              className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer"
              title="Sync">
              <RefreshCw className={'w-3.5 h-3.5 ' + (isSyncing ? 'animate-spin' : '')} />
            </button>
          )}
        </div>
      </div>

      {/* HERO */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 text-white shadow-md">
        <div className="text-[11px] uppercase tracking-wider text-slate-300 font-bold">
          {lang === 'my' ? 'စုစုပေါင်း လက်ကျန်' : 'Total Balance'}
        </div>
        <button
          type="button"
          onClick={() => setShowCurrencyBreakdown(true)}
          className="text-3xl sm:text-4xl font-black mt-1.5 tracking-tight flex items-center gap-2 hover:opacity-90 transition-opacity cursor-pointer group text-left"
          title={(lang === 'my' ? 'ငွေကြေး အလိုက် ကြည့်ရန် နှိပ်ပါ • ' : 'Tap for currency breakdown • ') + formatMMK(totalWalletBalance)}
        >
          <span>{formatLakhs(totalWalletBalance, lang)}</span>
          <ChevronRight className="w-5 h-5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
        </button>
        {currencyBreakdownData.length > 1 && (
          <div className="text-[10px] text-slate-400 mt-1 font-medium">
            {lang === 'my'
              ? `👆 နှိပ်၍ ငွေကြေး ${currencyBreakdownData.length} မျိုး ခွဲခြမ်းကြည့်ပါ`
              : `Tap to view ${currencyBreakdownData.length} currency breakdown`}
          </div>
        )}
        <div className="flex items-center gap-4 mt-3 text-xs flex-wrap">
          <span className="flex items-center gap-1 text-emerald-400 font-bold">
            <ArrowDownLeft className="w-3.5 h-3.5" /><span title={formatMMK(totalIncome)}>+{formatLakhs(totalIncome, lang)}</span>
          </span>
          <span className="flex items-center gap-1 text-rose-400 font-bold">
            <ArrowUpRight className="w-3.5 h-3.5" /><span title={formatMMK(totalExpense)}>-{formatLakhs(totalExpense, lang)}</span>
          </span>
          <span className={'font-bold ' + (netSavings >= 0 ? 'text-emerald-300' : 'text-rose-300')}>
            {lang === 'my' ? 'အသားတင်' : 'Net'}: <span title={formatMMK(netSavings)}>{netSavings >= 0 ? '+' : ''}{formatLakhs(netSavings, lang)}</span>
          </span>
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div className="grid grid-cols-3 gap-2">
        <button type="button" onClick={() => onAddTransaction('income')}
          className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer">
          <ArrowDownLeft className="w-4 h-4" />{lang === 'my' ? 'ဝင်ငွေ' : 'Income'}
        </button>
        <button type="button" onClick={() => onAddTransaction('expense')}
          className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer">
          <ArrowUpRight className="w-4 h-4" />{lang === 'my' ? 'ထွက်ငွေ' : 'Expense'}
        </button>
        <button type="button" onClick={onAddDebt}
          className="py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer">
          <HandCoins className="w-4 h-4" />{lang === 'my' ? 'အကြွေး' : 'Debt'}
        </button>
      </div>

      {/* [v7.3.1] QUICK ACCESS GRID — 6 tab shortcuts */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2.5">
        <div className="flex items-center justify-between mb-2 px-1">
          <h3 className="font-bold text-[12px] text-slate-900 flex items-center gap-1.5">
            <span className="text-[14px]">⚡</span>
            {lang === 'my' ? 'အမြန် ဝင်ရောက်ရန်' : 'Quick Access'}
          </h3>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {/* 1. Analytics (Shops position) */}
          <button type="button" onClick={() => onSelectTab('analytics')}
            className="flex flex-col items-center gap-1 p-2 rounded-xl bg-emerald-50/70 hover:bg-emerald-100 border border-emerald-200/70 transition-all active:scale-95 cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shadow-xs">
              <BarChart3 className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-emerald-900 leading-tight text-center">
              {lang === 'my' ? 'ဘတ်ဂျက်/ဇယား' : 'Analytics'}
            </span>
          </button>

          {/* 2. Data Management */}
          <button type="button" onClick={() => onSelectTab('data_management')}
            className="flex flex-col items-center gap-1 p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/70 transition-all active:scale-95 cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-slate-700 text-white flex items-center justify-center shadow-xs">
              <Database className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-slate-800 leading-tight text-center">
              {lang === 'my' ? 'ဒေတာ' : 'Data'}
            </span>
          </button>

          {/* 3. Plans */}
          <button type="button" onClick={() => onSelectTab('plans')}
            className="flex flex-col items-center gap-1 p-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200/70 transition-all active:scale-95 cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-xs">
              <Crown className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-amber-900 leading-tight text-center">
              {lang === 'my' ? 'Plan' : 'Plans'}
            </span>
          </button>

          {/* 4. Shops (Feedback position) */}
          <button type="button" onClick={() => onSelectTab('shops')}
            className="flex flex-col items-center gap-1 p-2 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200/70 transition-all active:scale-95 cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center shadow-xs">
              <Store className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-orange-900 leading-tight text-center">
              {lang === 'my' ? 'ဆိုင်လိပ်စာ' : 'Shops'}
            </span>
          </button>

          {/* 5. Education */}
          <button type="button" onClick={() => onSelectTab('education')}
            className="flex flex-col items-center gap-1 p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/70 transition-all active:scale-95 cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 text-white flex items-center justify-center shadow-xs">
              <GraduationCap className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-indigo-900 leading-tight text-center">
              {lang === 'my' ? 'ပညာပေး' : 'Learn'}
            </span>
          </button>

          {/* 6. Feedback (Analytics position) */}
          <button type="button" onClick={() => onSelectTab('feedback')}
            className="flex flex-col items-center gap-1 p-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200/70 transition-all active:scale-95 cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-blue-500 text-white flex items-center justify-center shadow-xs">
              <MessageCircle className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-blue-900 leading-tight text-center">
              {lang === 'my' ? 'အကြံပြုချက်' : 'Feedback'}
            </span>
          </button>
        </div>
      </div>

      {/* SMART CALENDAR */}
      <SmartCalendarCard
        transactions={transactions}
        categories={categories}
        wallets={wallets}
        lang={lang}
      />

      {/* DEBT REMINDERS */}
      {urgentDebts.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              {lang === 'my' ? 'အကြွေး သတိပေးချက်' : 'Debt Reminders'}
            </h3>
            <button type="button" onClick={() => onSelectTab('debts')}
              className="text-xs font-semibold text-indigo-600 cursor-pointer">
              {lang === 'my' ? 'အားလုံး' : 'All'}
            </button>
          </div>
          <div className="space-y-2">
            {urgentDebts.map((debt) => {
              const rem = debt.totalAmount - debt.paidAmount;
              const overdue = isOverdue(debt.dueDate);
              const isRec = debt.type === 'receivable';
              return (
                <div key={debt.id} className={'flex items-center justify-between p-2.5 rounded-xl ' + (overdue ? 'bg-rose-50' : 'bg-slate-50')}>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">{debt.personName}</div>
                    <div className="text-[10px] text-slate-500 truncate">
                      {isRec ? (lang === 'my' ? 'ရရန်' : 'Owed to you') : (lang === 'my' ? 'ပေးရန်' : 'You owe')}
                      {debt.dueDate ? ' · ' + (overdue ? '⚠️ ' : '') + debt.dueDate : ''}
                    </div>
                  </div>
                  <div className={'text-xs font-bold font-mono shrink-0 ' + (overdue ? 'text-rose-700' : 'text-slate-800')}>
                    {formatMMK(rem)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* [v7.5.2] Currency Breakdown Modal (drill-down) */}
      {showCurrencyBreakdown && (
        <div
          className="fixed inset-0 z-[150] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowCurrencyBreakdown(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-lg">💰</div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {lang === 'my' ? 'ငွေကြေး အလိုက် ခွဲခြမ်းချက်' : 'Currency Breakdown'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {lang === 'my'
                      ? `ပိုက်ဆံအိတ် ${scopedWallets.length} ခု · ငွေကြေး ${currencyBreakdownData.length} မျိုး`
                      : `${scopedWallets.length} wallets · ${currencyBreakdownData.length} currencies`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCurrencyBreakdown(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-lg cursor-pointer"
              >×</button>
            </div>

            <div className="space-y-2">
              {currencyBreakdownData.length === 0 ? (
                <div className="py-6 text-center text-sm text-slate-500">
                  {lang === 'my' ? 'ပိုက်ဆံအိတ် မရှိပါ' : 'No wallets'}
                </div>
              ) : (
                currencyBreakdownData.map((row) => (
                  <div
                    key={row.code}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-2xl shrink-0">{row.flag}</span>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-slate-900">{row.code}</div>
                        <div className="text-[10px] text-slate-500">
                          {row.count} {lang === 'my' ? 'အကောင့်' : 'wallets'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-sm text-slate-900">
                        {row.total.toLocaleString('en-US', { maximumFractionDigits: 2 })} {row.symbol}
                      </div>
                      {row.code !== 'MMK' && (
                        <div className="text-[10px] text-emerald-700 font-bold">
                          ≈ {formatMMK(row.totalMMK)}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {currencyBreakdownData.length > 0 && (
              <div className="pt-3 border-t-2 border-dashed border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  {lang === 'my' ? 'စုစုပေါင်း (ကျပ်ဖြင့်)' : 'Total (MMK)'}
                </span>
                <span className="font-mono font-black text-base text-emerald-700">
                  {formatMMK(totalWalletBalance)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
