import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Download,
  Trash2,
  Edit2,
  Calendar,
  Lock,
  Sparkles,
  Tag,
  History,
  Wallet as WalletIcon,
  ShoppingCart,
  Boxes,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Layers,
  User,
  Users,
  Cloud,
  WifiOff,
  AlertTriangle,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { Category, PlanType, Transaction, Wallet, DataScope } from '../types';
import { formatMMK, formatLakhs, exportToCSV, getCategoryDisplayName } from '../utils/formatters';
import { formatCurrency, convertToMMK } from '../utils/currency';
import { safeGetItem, safeSetItem } from '../utils/storage';
import { CategoryIcon } from './CategoryIcon';
import { ItemPriceHistoryModal } from './ItemPriceHistoryModal';
import { MultiWalletSelector } from './MultiWalletSelector';
import { FinancialSummaryTable } from './FinancialSummaryTable';
import { TransactionSyncDetailModal } from './TransactionSyncDetailModal';
import { getTransactionSyncStatus } from '../utils/transactionSyncStatus';
import { useAuth } from '../context/AuthContext';
import { getCollaboratorPermissions } from '../utils/permissions';
import { buildWalletMap, getMatchingWalletIds, isWalletMatch, isTransferTransaction } from '../utils/walletBalance';

export type TimeFilterType =
  | 'all'
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'specific_date'
  | 'custom_range';

interface TransactionsViewProps {
  transactions: Transaction[];
  categories: Category[];
  wallets: Wallet[];
  plan: PlanType;
  maxFreeTransactions: number;
  lang: 'my' | 'en';
  dataScope?: DataScope;
  onSetDataScope?: (scope: DataScope) => void;
  onAddTransaction: (type?: 'income' | 'expense', targetWalletId?: string) => void;
  onDeleteTransaction: (id: string) => void;
  onEditTransaction: (tx: Transaction) => void;
  onOpenUpgradeModal: () => void;
  cloudTxIds?: Set<string>;
  onOpenDatabaseTracker?: () => void;
}

const getLocalDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatLocalizedDate = (dateStr: string, lang: 'my' | 'en'): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const d = new Date(year, monthIdx, day);
  if (isNaN(d.getTime())) return dateStr;

  const daysMy = ['တနင်္ဂနွေ', 'တနင်္လာ', 'အင်္ဂါ', 'ဗုဒ္ဓဟူး', 'ကြာသပတေး', 'သောကြာ', 'စနေ'];
  const daysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthsMy = [
    'ဇန်နဝါရီ', 'ဖေဖော်ဝါရီ', 'မတ်', 'ဧပြီ', 'မေ', 'ဇွန်',
    'ဇူလိုင်', 'သြဂုတ်', 'စက်တင်ဘာ', 'အောက်တိုဘာ', 'နိုဝင်ဘာ', 'ဒီဇင်ဘာ'
  ];
  const monthsEn = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const dayName = lang === 'my' ? daysMy[d.getDay()] : daysEn[d.getDay()];
  const monthName = lang === 'my' ? monthsMy[d.getMonth()] : monthsEn[d.getMonth()];

  return lang === 'my'
    ? `${year} ခုနှစ်၊ ${monthName} ${day} ရက် (${dayName})`
    : `${day} ${monthName} ${year} (${dayName})`;
};

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  categories,
  wallets,
  plan,
  maxFreeTransactions,
  lang,
  dataScope = 'all',
  onSetDataScope,
  onAddTransaction,
  onDeleteTransaction,
  onEditTransaction,
  onOpenUpgradeModal,
  cloudTxIds,
  onOpenDatabaseTracker,
}) => {
  const { user } = useAuth();
  const [isPriceHistoryOpen, setIsPriceHistoryOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleDays, setVisibleDays] = useState(30);
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [timeFilter, setTimeFilterState] = useState<TimeFilterType>('all');

  const setTimeFilter = (filter: TimeFilterType) => {
    setTimeFilterState(filter);
    safeSetItem('ngwe_tx_time_filter', filter);
  };
  const [specificDate, setSpecificDate] = useState<string>(() => getLocalDateString());
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return getLocalDateString(d);
  });
  const [endDate, setEndDate] = useState<string>(() => getLocalDateString());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedWallet, setSelectedWallet] = useState<string>('all');
  const [selectedWalletIds, setSelectedWalletIds] = useState<string[]>([]);
  const [showSummaryTable, setShowSummaryTable] = useState<boolean>(true);
  const [expandedShoppingTxIds, setExpandedShoppingTxIds] = useState<Record<string, boolean>>({});
  const [selectedTxForSyncModal, setSelectedTxForSyncModal] = useState<Transaction | null>(null);
  const [financialSystem, setFinancialSystem] = useState<'inflow_outflow' | 'opening_closing'>('opening_closing');

  const hasSharedWallets = useMemo(() => {
    return wallets.some((w) => w.isSharedFromOther || (w.sharedWith && w.sharedWith.length > 0));
  }, [wallets]);

  const sharedWalletIds = useMemo(
    () =>
      getMatchingWalletIds(
        wallets.filter((w) => w.isSharedFromOther || (w.sharedWith && w.sharedWith.length > 0))
      ),
    [wallets]
  );

  const personalWalletIds = useMemo(
    () =>
      getMatchingWalletIds(
        wallets.filter((w) => !w.isSharedFromOther && (!w.sharedWith || w.sharedWith.length === 0))
      ),
    [wallets]
  );

  // Wallets visible in pills based on dataScope
  const visibleWalletsInFilter = useMemo(() => {
    if (dataScope === 'personal') return wallets.filter((w) => !w.isSharedFromOther && (!w.sharedWith || w.sharedWith.length === 0));
    if (dataScope === 'shared') return wallets.filter((w) => w.isSharedFromOther || (w.sharedWith && w.sharedWith.length > 0));
    return wallets;
  }, [wallets, dataScope]);

  // Reset pagination when filters change
  React.useEffect(() => {
    setVisibleDays(30);
  }, [typeFilter, timeFilter, searchTerm, selectedCategory, selectedWallet, selectedWalletIds, dataScope]);

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const walletMap = useMemo(() => buildWalletMap(wallets), [wallets]);

  // Sort categories by usage frequency in transaction list
  const sortedCategoriesForFilter = useMemo(() => {
    const countMap = new Map<string, number>();
    transactions.forEach((t) => {
      if (t.category) {
        countMap.set(t.category, (countMap.get(t.category) || 0) + 1);
      }
    });
    return [...categories].sort((a, b) => {
      const countA = countMap.get(a.id) || 0;
      const countB = countMap.get(b.id) || 0;
      if (countB !== countA) return countB - countA;
      return (lang === 'my' ? a.name : a.nameEn).localeCompare(lang === 'my' ? b.name : b.nameEn);
    });
  }, [categories, transactions, lang]);

  const subCatMap = useMemo(() => {
    const map = new Map<string, { name: string; nameEn: string }>();
    categories.forEach((c) => {
      (c.subCategories || []).forEach((s) => {
        map.set(s.id, s);
      });
    });
    return map;
  }, [categories]);

  // Date ranges
  const todayStr = useMemo(() => getLocalDateString(new Date()), []);
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return getLocalDateString(d);
  }, []);
  const currentMonthPrefix = useMemo(() => todayStr.slice(0, 7), [todayStr]);
  const lastMonthPrefix = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return getLocalDateString(d).slice(0, 7);
  }, []);

  // Compute 7 days ago
  const sevenDaysAgoStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return getLocalDateString(d);
  }, []);

  const shiftSpecificDate = (offsetDays: number) => {
    const baseDate = specificDate || todayStr;
    const parts = baseDate.split('-').map(Number);
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      d.setDate(d.getDate() + offsetDays);
      setSpecificDate(getLocalDateString(d));
    }
  };

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      // Data Scope (Combined vs Personal Only vs Shared Only)
      if (dataScope === 'personal') {
        const isPersonal = wallets
          .filter((w) => !w.isSharedFromOther && (!w.sharedWith || w.sharedWith.length === 0))
          .some((w) => isWalletMatch(w, t.walletId));
        if (!isPersonal) return false;
      }
      if (dataScope === 'shared') {
        const isShared = wallets
          .filter((w) => w.isSharedFromOther || (w.sharedWith && w.sharedWith.length > 0))
          .some((w) => isWalletMatch(w, t.walletId));
        if (!isShared) return false;
      }

      // Type
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;

      // Category
      if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;

      // Wallet Multi-Select / Single Filter
      if (selectedWalletIds.length > 0 && selectedWalletIds.length < wallets.length) {
        const matchesAnySelected = selectedWalletIds.some((wId) => {
          const targetW = walletMap.get(wId);
          return targetW ? isWalletMatch(targetW, t.walletId) : t.walletId === wId;
        });
        if (!matchesAnySelected) return false;
      } else if (selectedWallet !== 'all') {
        const targetW = walletMap.get(selectedWallet);
        if (targetW) {
          if (!isWalletMatch(targetW, t.walletId)) return false;
        } else if (t.walletId !== selectedWallet) {
          return false;
        }
      }

      // Time
      if (timeFilter === 'today' && t.date !== todayStr) return false;
      if (timeFilter === 'yesterday' && t.date !== yesterdayStr) return false;
      if (timeFilter === 'this_week' && (t.date < sevenDaysAgoStr || t.date > todayStr)) return false;
      if (timeFilter === 'this_month' && !t.date.startsWith(currentMonthPrefix)) return false;
      if (timeFilter === 'last_month' && !t.date.startsWith(lastMonthPrefix)) return false;
      if (timeFilter === 'specific_date' && t.date !== specificDate) return false;
      if (timeFilter === 'custom_range') {
        if (startDate && t.date < startDate) return false;
        if (endDate && t.date > endDate) return false;
      }

      // Search
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const cat = catMap.get(t.category);
        const catName = (cat?.name || '').toLowerCase();
        const catNameEn = (cat?.nameEn || '').toLowerCase();
        const subCat = t.subCategoryId ? subCatMap.get(t.subCategoryId) : undefined;
        const subName = (subCat?.name || '').toLowerCase();
        const subNameEn = (subCat?.nameEn || '').toLowerCase();
        const note = (t.note || '').toLowerCase();
        if (
          !catName.includes(query) &&
          !catNameEn.includes(query) &&
          !subName.includes(query) &&
          !subNameEn.includes(query) &&
          !note.includes(query)
        ) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const bDate = new Date(b.date).getTime() || 0;
      const aDate = new Date(a.date).getTime() || 0;
      if (bDate !== aDate) return bDate - aDate;
      const bCreated = typeof b.createdAt === 'number' ? b.createdAt : new Date(b.createdAt || b.date).getTime() || 0;
      const aCreated = typeof a.createdAt === 'number' ? a.createdAt : new Date(a.createdAt || a.date).getTime() || 0;
      return bCreated - aCreated;
    });
  }, [transactions, dataScope, personalWalletIds, sharedWalletIds, typeFilter, selectedCategory, selectedWallet, selectedWalletIds, wallets, walletMap, timeFilter, specificDate, startDate, endDate, searchTerm, catMap, subCatMap, todayStr, yesterdayStr, sevenDaysAgoStr, currentMonthPrefix, lastMonthPrefix]);

  // Filtered Totals (excluding internal transfers when viewing all wallets to match Dashboard, including when viewing specific wallet)
  const isSingleWalletFilter =
    selectedWallet !== 'all' ||
    (selectedWalletIds.length > 0 && selectedWalletIds.length < wallets.length);

  const filteredIncome = useMemo(() => {
    return filtered
      .filter((t) => {
        if (t.type !== 'income') return false;
        if (isTransferTransaction(t)) {
          return isSingleWalletFilter && (t.transferType === 'transfer_in' || t.walletId === selectedWallet);
        }
        return true;
      })
      .reduce((sum, t) => {
        const w = walletMap.get(t.walletId);
        return sum + convertToMMK(t.amount, w?.currency, w?.exchangeRate);
      }, 0);
  }, [filtered, isSingleWalletFilter, selectedWallet, walletMap]);

  const filteredExpense = useMemo(() => {
    return filtered
      .filter((t) => {
        if (t.type !== 'expense') return false;
        if (isTransferTransaction(t)) {
          return isSingleWalletFilter && (t.transferType === 'transfer_out' || t.walletId === selectedWallet);
        }
        return true;
      })
      .reduce((sum, t) => {
        const w = walletMap.get(t.walletId);
        return sum + convertToMMK(t.amount, w?.currency, w?.exchangeRate);
      }, 0);
  }, [filtered, isSingleWalletFilter, selectedWallet, walletMap]);

  // Group filtered transactions by date with daily subtotals (Inflow, Outflow, Net)
  const groupedByDate = useMemo(() => {
    const map = new Map<
      string,
      {
        date: string;
        transactions: Transaction[];
        totalIncome: number;
        totalExpense: number;
        net: number;
      }
    >();

    filtered.forEach((t) => {
      const dateKey = t.date || 'Unknown Date';
      if (!map.has(dateKey)) {
        map.set(dateKey, {
          date: dateKey,
          transactions: [],
          totalIncome: 0,
          totalExpense: 0,
          net: 0,
        });
      }
      const group = map.get(dateKey)!;
      group.transactions.push(t);
      const txMMK = convertToMMK(t.amount, walletMap.get(t.walletId)?.currency, walletMap.get(t.walletId)?.exchangeRate);
      if (t.type === 'income') {
        if (!isTransferTransaction(t) || isSingleWalletFilter) {
          group.totalIncome += txMMK;
        }
      } else if (t.type === 'expense') {
        if (!isTransferTransaction(t) || isSingleWalletFilter) {
          group.totalExpense += txMMK;
        }
      }
    });

    const groups: {
      date: string;
      transactions: Transaction[];
      totalIncome: number;
      totalExpense: number;
      net: number;
    }[] = [];

    map.forEach((val) => {
      val.net = val.totalIncome - val.totalExpense;
      groups.push(val);
    });

    return groups;
  }, [filtered]);

  const handleExport = () => {
    if (plan === 'free') {
      onOpenUpgradeModal();
      return;
    }
    const catLabels: Record<string, string> = {};
    categories.forEach((c) => {
      catLabels[c.id] = `${c.name} (${c.nameEn})`;
    });
    const subCatLabels: Record<string, string> = {};
    subCatMap.forEach((val, key) => {
      subCatLabels[key] = `${val.name} (${val.nameEn})`;
    });
    const walletLabels: Record<string, string> = {};
    wallets.forEach((w) => {
      walletLabels[w.id] = w.name;
    });
    exportToCSV(filtered, catLabels, walletLabels, subCatLabels);
  };

  const isAtLimit = plan === 'free' && transactions.length >= maxFreeTransactions;

  return (
    <div className="space-y-6">
      {/* Top Header and Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {lang === 'my' ? 'ဝင်ငွေ / ထွက်ငွေ မှတ်တမ်းများ' : 'Income & Expense Records'}
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {filtered.length} {lang === 'my' ? 'ခု' : 'records'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-normal">
            {lang === 'my'
              ? 'နေ့စဉ် ငွေအဝင်အထွက်အားလုံးကို အသေးစိတ် စစ်ဆေးစီမံနိုင်ပါသည်'
              : 'Review, search, and manage all your daily transactions'}
          </p>
        </div>

      </div>

      {/* Free tier limit banner warning if reached or close */}
      {isAtLimit && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-amber-900 font-medium">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              {lang === 'my'
                ? `Free Plan ၏ လစဉ် ကန့်သတ်ချက် (${maxFreeTransactions} ခု) ပြည့်သွားပါပြီ။ ဆက်လက်မှတ်တမ်းတင်ရန် Premium သို့ အဆင့်မြှင့်ပါ။`
                : `You reached the Free Plan limit of ${maxFreeTransactions} transactions. Upgrade to Premium for unlimited records.`}
            </span>
          </div>
          <button
            onClick={onOpenUpgradeModal}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 whitespace-nowrap"
          >
            {lang === 'my' ? 'အဆင့်မြှင့်မည်' : 'Upgrade'}
          </button>
        </div>
      )}

      {/* Compact Unified Filter & Summary Control Box */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        {/* Row 1: Unified Wallet Dropdown Selector & Search & Type Segment */}
        <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
          
          {/* Multi-Wallet Checkbox Selector */}
          <div className="flex-1 min-w-[220px]">
            <MultiWalletSelector
              wallets={wallets}
              selectedWalletIds={selectedWalletIds}
              onChangeSelectedWalletIds={(ids) => {
                setSelectedWalletIds(ids);
                setSelectedWallet('all');
              }}
              lang={lang}
            />
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-60">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="tx-search-input"
              type="text"
              placeholder={lang === 'my' ? 'ခေါင်းစဉ်၊ မှတ်ချက်ဖြင့် ရှာရန်...' : 'Search category or note...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Type Segment Control */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 justify-center">
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                typeFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang === 'my' ? 'အားလုံး' : 'All'}
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('income')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                typeFilter === 'income' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>{lang === 'my' ? 'ဝင်ငွေ' : 'Income'}</span>
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('expense')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                typeFilter === 'expense' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>{lang === 'my' ? 'ထွက်ငွေ' : 'Expense'}</span>
            </button>
          </div>
        </div>

        {/* Row 2: Financial Summary Header with Table View Toggle */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="text-[11px] font-bold text-slate-600 shrink-0">
              {lang === 'my' ? 'အနှစ်ချုပ်' : 'Summary'}
            </span>
            <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200/70">
              <button
                type="button"
                onClick={() => setFinancialSystem('opening_closing')}
                className={'px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ' + (financialSystem === 'opening_closing' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900')}
              >
                {lang === 'my' ? 'Opening / Closing' : 'Opening / Closing'}
              </button>
              <button
                type="button"
                onClick={() => setFinancialSystem('inflow_outflow')}
                className={'px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ' + (financialSystem === 'inflow_outflow' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900')}
              >
                {lang === 'my' ? 'Inflow / Outflow' : 'Inflow / Outflow'}
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowSummaryTable(!showSummaryTable)}
            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 transition-all cursor-pointer shrink-0"
          >
            {showSummaryTable
              ? lang === 'my' ? '➖ ကျဉ်းကြည့်' : '➖ Compact'
              : lang === 'my' ? '📊 Table View' : '📊 Table View'}
          </button>
        </div>

        {/* Row 2 Sub: Financial Table View or Compact Bar */}
        {showSummaryTable ? (
          <FinancialSummaryTable
            financialSystem={financialSystem}
            onChangeFinancialSystem={setFinancialSystem}
            income={filteredIncome}
            expense={filteredExpense}
            incomeCount={
              filtered.filter((t) => {
                if (t.type !== 'income') return false;
                if (isTransferTransaction(t)) return isSingleWalletFilter;
                return true;
              }).length
            }
            expenseCount={
              filtered.filter((t) => {
                if (t.type !== 'expense') return false;
                if (isTransferTransaction(t)) return isSingleWalletFilter;
                return true;
              }).length
            }
            selectedWallets={
              selectedWalletIds.length > 0 && selectedWalletIds.length < wallets.length
                ? wallets.filter((w) => selectedWalletIds.includes(w.id))
                : selectedWallet !== 'all'
                ? wallets.filter((w) => isWalletMatch(w, selectedWallet))
                : wallets
            }
            transactions={filtered}
            lang={lang}
          />
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
            <div className="flex items-center gap-3 flex-wrap font-mono font-bold">
              <div className="flex items-center gap-1 text-emerald-700">
                <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="font-sans text-[11px] font-medium text-slate-500">{lang === 'my' ? 'ဝင်ငွေ:' : 'In:'}</span>
                <span title={formatMMK(filteredIncome)}>+{formatLakhs(filteredIncome, lang)}</span>
              </div>

              <span className="text-slate-300">•</span>

              <div className="flex items-center gap-1 text-rose-700">
                <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="font-sans text-[11px] font-medium text-slate-500">{lang === 'my' ? 'ထွက်ငွေ:' : 'Out:'}</span>
                <span title={formatMMK(filteredExpense)}>-{formatLakhs(filteredExpense, lang)}</span>
              </div>

              <span className="text-slate-300">•</span>

              <div className={`flex items-center gap-1 ${filteredIncome - filteredExpense >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                <span className="font-sans text-[11px] font-medium text-slate-500">{lang === 'my' ? 'အသားတင်:' : 'Net:'}</span>
                <span title={formatMMK(filteredIncome - filteredExpense)}>{filteredIncome - filteredExpense >= 0 ? '+' : ''}{formatLakhs(filteredIncome - filteredExpense, lang)}</span>
              </div>
            </div>

            <div className="text-[11px] font-semibold text-slate-500 font-sans">
              ({filtered.length} {lang === 'my' ? 'မှတ်တမ်း' : 'records'})
            </div>
          </div>
        )}

        {/* Row 3: Secondary Filters (Time & Category) */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-xs">
          {/* Time filter dropdown */}
          <div className="flex items-center gap-1">
            <span className="text-slate-400 text-xs">{lang === 'my' ? 'ကာလ:' : 'Time:'}</span>
            <select
              id="tx-time-filter"
              value={timeFilter}
              onChange={(e: any) => setTimeFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="all">🌟 {lang === 'my' ? 'ရက်စွဲအားလုံး (All Time)' : 'All Time'}</option>
              <option value="this_month">📅 {lang === 'my' ? 'ယခုလ (This Month)' : 'This Month'}</option>
              <option value="last_month">🗓️ {lang === 'my' ? 'ပြီးခဲ့သောလ (Last Month)' : 'Last Month'}</option>
              <option value="this_week">📊 {lang === 'my' ? 'ဒီတစ်ပတ် (This Week)' : 'This Week'}</option>
              <option value="today">☀️ {lang === 'my' ? 'ဒီနေ့ (Today)' : 'Today'}</option>
              <option value="yesterday">🌙 {lang === 'my' ? 'မနေ့က (Yesterday)' : 'Yesterday'}</option>
              <option value="specific_date">🎯 {lang === 'my' ? 'သတ်မှတ်ရက်စွဲ (Specific Date)' : 'Specific Date'}</option>
              <option value="custom_range">📆 {lang === 'my' ? 'ရက်စွဲအပိုင်းအခြား (Date Range)' : 'Custom Range'}</option>
            </select>
          </div>

          {/* Category filter */}
          <div className="flex items-center gap-1">
            <span className="text-slate-400 text-xs">{lang === 'my' ? 'ကဏ္ဍ:' : 'Category:'}</span>
            <select
              id="tx-cat-filter"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">{lang === 'my' ? 'ကဏ္ဍ အားလုံး' : 'All Categories'}</option>
              {sortedCategoriesForFilter.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.type === 'income' ? '🟢' : '🔴'} {lang === 'my' ? c.name : c.nameEn}
                </option>
              ))}
            </select>
          </div>

          {(searchTerm || typeFilter !== 'all' || timeFilter !== 'all' || selectedCategory !== 'all' || selectedWallet !== 'all' || dataScope !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setTypeFilter('all');
                setTimeFilter('all');
                setSpecificDate(todayStr);
                setSelectedCategory('all');
                setSelectedWallet('all');
                onSetDataScope?.('all');
              }}
              className="text-xs text-rose-600 hover:underline font-semibold ml-auto cursor-pointer"
            >
              {lang === 'my' ? 'မူလအတိုင်းပြန်ထားရန်' : 'Reset Filters'}
            </button>
          )}
        </div>

        {/* Dynamic Specific Date Toolbar */}
        {timeFilter === 'specific_date' && (
          <div className="pt-3 border-t border-indigo-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-gradient-to-r from-indigo-50/90 via-blue-50/70 to-purple-50/90 rounded-xl border border-indigo-200/90 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-indigo-950 flex items-center gap-1.5 flex-wrap">
                  <span>{lang === 'my' ? 'သတ်မှတ်ရက်စွဲ:' : 'Selected Date:'}</span>
                  <span className="text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-200 shadow-2xs">
                    {formatLocalizedDate(specificDate, lang)}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {lang === 'my'
                    ? `ယင်းရက်ရှိ စာရင်းမှတ်တမ်း (${filtered.length}) ခု ပြသထားပါသည်`
                    : `Showing ${filtered.length} transactions for this exact day`}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Date Input with Previous/Next Day navigation */}
              <div className="flex items-center bg-white rounded-xl border border-indigo-300 p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => shiftSpecificDate(-1)}
                  className="p-1.5 hover:bg-indigo-50 text-indigo-700 rounded-lg transition-colors cursor-pointer"
                  title={lang === 'my' ? 'ရှေ့ ၁ ရက်သို့' : 'Previous Day'}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <input
                  type="date"
                  value={specificDate}
                  onChange={(e) => setSpecificDate(e.target.value)}
                  className="px-2 py-1 text-xs font-bold text-slate-800 bg-transparent border-0 focus:outline-none cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => shiftSpecificDate(1)}
                  className="p-1.5 hover:bg-indigo-50 text-indigo-700 rounded-lg transition-colors cursor-pointer"
                  title={lang === 'my' ? 'နောက် ၁ ရက်သို့' : 'Next Day'}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Jump Buttons */}
              <button
                type="button"
                onClick={() => setSpecificDate(todayStr)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                  specificDate === todayStr
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200'
                }`}
              >
                {lang === 'my' ? 'ဒီနေ့' : 'Today'}
              </button>
              <button
                type="button"
                onClick={() => setSpecificDate(yesterdayStr)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                  specificDate === yesterdayStr
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200'
                }`}
              >
                {lang === 'my' ? 'မနေ့က' : 'Yesterday'}
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Custom Date Range Toolbar */}
        {timeFilter === 'custom_range' && (
          <div className="pt-3 border-t border-emerald-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 bg-gradient-to-r from-emerald-50/90 via-teal-50/70 to-cyan-50/90 rounded-xl border border-emerald-200/90 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-emerald-950">
                  {lang === 'my' ? 'စိတ်ကြိုက် ရက်စွဲ အပိုင်းအခြား:' : 'Custom Date Range:'}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {startDate} {lang === 'my' ? 'မှ' : 'to'} {endDate} ({filtered.length} {lang === 'my' ? 'ခု' : 'records'})
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-emerald-300 shadow-2xs">
                <span className="text-[11px] font-semibold text-slate-500 pl-1.5">{lang === 'my' ? 'မှ:' : 'From:'}</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-1.5 py-1 text-xs font-bold text-slate-800 bg-transparent border-0 focus:outline-none cursor-pointer"
                />
                <span className="text-[11px] font-semibold text-slate-500">{lang === 'my' ? 'ထိ:' : 'To:'}</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-1.5 py-1 text-xs font-bold text-slate-800 bg-transparent border-0 focus:outline-none cursor-pointer"
                />
              </div>

              {/* Quick Preset Range Chips */}
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 6);
                    setStartDate(getLocalDateString(d));
                    setEndDate(todayStr);
                  }}
                  className="px-2 py-1 rounded-lg bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold cursor-pointer shadow-2xs"
                >
                  {lang === 'my' ? '၇ ရက်' : '7 Days'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 29);
                    setStartDate(getLocalDateString(d));
                    setEndDate(todayStr);
                  }}
                  className="px-2 py-1 rounded-lg bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold cursor-pointer shadow-2xs"
                >
                  {lang === 'my' ? '၃၀ ရက်' : '30 Days'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    const firstDayOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
                    setStartDate(getLocalDateString(firstDayOfMonth));
                    setEndDate(todayStr);
                  }}
                  className="px-2 py-1 rounded-lg bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold cursor-pointer shadow-2xs"
                >
                  {lang === 'my' ? 'ယခုလ' : 'This Month'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Active Filter Notice Bar if filtered is less than total */}
      {transactions.length > 0 && filtered.length < transactions.length && (
        <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-3 px-4 flex items-center justify-between gap-3 text-xs text-amber-900 shadow-xs">
          <div className="flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            <span>
              {lang === 'my'
                ? `Filter စစ်ထားသဖြင့် စုစုပေါင်း (${transactions.length}) ခုအနက် (${filtered.length}) ခုသာ ပြသထားပါသည် ${
                    timeFilter === 'specific_date'
                      ? `[ရက်စွဲ: ${specificDate}]`
                      : timeFilter === 'custom_range'
                      ? `[ရက်စွဲ: ${startDate} ~ ${endDate}]`
                      : ''
                  }`
                : `Showing ${filtered.length} of ${transactions.length} transactions (Filters active ${
                    timeFilter === 'specific_date'
                      ? `[Date: ${specificDate}]`
                      : timeFilter === 'custom_range'
                      ? `[Range: ${startDate} ~ ${endDate}]`
                      : ''
                  })`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setTypeFilter('all');
              setTimeFilter('all');
              setSpecificDate(todayStr);
              setSelectedCategory('all');
              setSelectedWallet('all');
              onSetDataScope?.('all');
            }}
            className="px-2.5 py-1 rounded-lg bg-amber-200/80 hover:bg-amber-300/80 text-amber-950 font-bold transition-all shrink-0 cursor-pointer text-[11px]"
          >
            {lang === 'my' ? 'မှတ်တမ်းအားလုံး ပြန်ဖွင့်မည်' : 'Show All Records'}
          </button>
        </div>
      )}

      {/* Transactions List (3D Clay Card) */}
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl border border-white/90 overflow-hidden shadow-[0_10px_28px_rgba(139,92,246,0.08),inset_1.5px_1.5px_3px_rgba(255,255,255,0.9)]">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-3 px-4">
            <Tag className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-medium text-slate-600">
              {transactions.length > 0
                ? (lang === 'my'
                    ? `ရွေးချယ်ထားသော Filter နှင့် ကိုက်ညီသည့် မှတ်တမ်း မရှိပါ (စုစုပေါင်း မှတ်တမ်း ${transactions.length} ခု ရှိပါသည်)`
                    : `No transactions match your current filters (Total ${transactions.length} records exist)`)
                : (lang === 'my' ? 'စာရင်းမှတ်တမ်း မရှိသေးပါ' : 'No transactions recorded yet.')}
            </p>
            {transactions.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setTypeFilter('all');
                  setTimeFilter('all');
                  setSelectedCategory('all');
                  setSelectedWallet('all');
                  onSetDataScope?.('all');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer shadow-xs"
              >
                <span>{lang === 'my' ? '🔍 Filter အားလုံးကို ဖြုတ်ပြီး အားလုံးကြည့်မည်' : '🔍 Clear All Filters & Show All'}</span>
              </button>
            )}
            {transactions.length === 0 && (
              <p className="text-xs text-slate-400">
                {lang === 'my' ? 'စာရင်းအသစ် ထည့်သွင်းရန် အပေါ်ရှိ "+ မှတ်တမ်းသစ်" ခလုတ်ကို နှိပ်ပါ' : 'Click "+ New Transaction" to record your first entry.'}
              </p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-200/90">
            {groupedByDate.slice(0, visibleDays).map((group) => {
              const formattedDate = formatLocalizedDate(group.date, lang);
              return (
                <div key={group.date} className="bg-white">
                  {/* Daily Date Header with Subtotals */}
                  <div className="bg-slate-100/95 px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-y border-slate-200/80 sticky top-0 z-10 backdrop-blur-md">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shrink-0">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <span className="font-extrabold text-xs sm:text-sm text-slate-900 tracking-tight">
                        {formattedDate}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                        {group.transactions.length} {lang === 'my' ? 'ခု' : 'items'}
                      </span>
                    </div>

                    {/* Daily Inflow / Outflow / Net Badges */}
                    <div className="flex items-center gap-2 text-xs flex-wrap font-mono font-bold">
                      {group.totalIncome > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] flex items-center gap-1">
                          <span>{lang === 'my' ? 'ဝင်:' : 'In:'}</span>
                          <span>+{formatMMK(group.totalIncome)}</span>
                        </span>
                      )}
                      {group.totalExpense > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[11px] flex items-center gap-1">
                          <span>{lang === 'my' ? 'ထွက်:' : 'Out:'}</span>
                          <span>-{formatMMK(group.totalExpense)}</span>
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-md text-[11px] border flex items-center gap-1 ${
                        group.net >= 0
                          ? 'bg-emerald-100/90 text-emerald-900 border-emerald-300'
                          : 'bg-rose-100/90 text-rose-900 border-rose-300'
                      }`}>
                        <span className="font-sans text-[10px] opacity-85">{lang === 'my' ? 'အသားတင်:' : 'Net:'}</span>
                        <span>{group.net >= 0 ? '+' : ''}{formatMMK(group.net)}</span>
                      </span>
                    </div>
                  </div>

                  {/* Transactions for this date */}
                  <div className="divide-y divide-slate-100">
                    {group.transactions.map((t) => {
                      const cat = catMap.get(t.category);
                      const subCat = t.subCategoryId ? subCatMap.get(t.subCategoryId) : undefined;
                      const wallet = walletMap.get(t.walletId);
                      const isIncome = t.type === 'income';

                      return (
                        <div
                          key={t.id}
                          className="p-3.5 sm:p-4 sm:px-6 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div
                              className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-[2px_3px_8px_rgba(0,0,0,0.12),inset_1px_1px_2px_rgba(255,255,255,0.6)]"
                              style={{ backgroundColor: cat?.color || (isIncome ? '#10B981' : '#EF4444') }}
                            >
                              <CategoryIcon name={cat?.icon || 'Tag'} className="w-5 h-5" />
                            </div>

                            <div className="min-w-0 flex-1 space-y-1">
                              {/* Line 1: Important Info (Category & Date) */}
                              <div className="flex items-center justify-between gap-2 min-w-0">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-bold text-sm sm:text-base text-slate-900 truncate">
                                    {getCategoryDisplayName(t.category, categories, lang)}
                                  </span>
                                  {subCat && (
                                    <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10.5px] font-medium border border-slate-200">
                                      <Tag className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                      <span className="truncate">{lang === 'my' ? subCat.name : subCat.nameEn}</span>
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] font-medium text-slate-400 shrink-0 font-mono">
                                  {t.date}
                                </span>
                              </div>

                              {/* Line 2: Amount & Note / Details */}
                              <div className="flex items-center justify-between gap-2 min-w-0">
                                <div className="flex items-center gap-1.5 min-w-0 text-xs text-slate-500 truncate">
                                  <span className={`font-mono font-bold text-xs sm:text-sm shrink-0 ${isIncome ? 'text-emerald-700' : 'text-rose-600'}`}>
                                    {isIncome ? `+${formatCurrency(t.amount, wallet?.currency)}` : `-${formatCurrency(t.amount, wallet?.currency)}`}
                                  </span>
                                  {t.note && (
                                    <>
                                      <span className="text-slate-300">•</span>
                                      <span className="truncate text-slate-600 italic text-[11px]">
                                        "{t.note}"
                                      </span>
                                    </>
                                  )}
                                </div>

                                {/* Shopping List Badge */}
                                {t.items && t.items.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setExpandedShoppingTxIds((p) => ({ ...p, [t.id]: !p[t.id] })); }}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 shrink-0 cursor-pointer"
                                  >
                                    🛒 {t.items.length} {lang === 'my' ? 'မျိုး' : 'items'}
                                    <span className="text-[8px] opacity-60">{expandedShoppingTxIds[t.id] ? '▲' : '▼'}</span>
                                  </button>
                                )}
                                {/* Wallet / Status Badges */}
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold border ${
                                    wallet?.isSharedFromOther || (wallet?.sharedWith && wallet.sharedWith.length > 0)
                                      ? 'bg-amber-50 text-amber-900 border-amber-300'
                                      : 'bg-indigo-50 text-indigo-900 border-indigo-200'
                                  }`}>
                                    <span className="truncate max-w-[80px] sm:max-w-[120px]">{lang === 'my' ? wallet?.name : wallet?.nameEn || t.walletId}</span>
                                  </span>
                                </div>
                              </div>

                              {/* Expandable Shopping List Table */}
                              {t.items && t.items.length > 0 && expandedShoppingTxIds[t.id] && (
                                <div className="mt-2.5 p-2.5 bg-amber-50/70 rounded-xl border border-amber-200 text-xs space-y-1.5 animate-fadeIn">
                                  <div className="text-[11px] font-bold text-amber-950 pb-1 border-b border-amber-200/80 flex items-center justify-between">
                                    <span>🛒 {lang === 'my' ? 'ဝယ်ယူခဲ့သည့် ပစ္စည်းအသေးစိတ်:' : 'Itemized Purchases:'}</span>
                                    <span className="font-mono text-amber-900">{t.items.length} items</span>
                                  </div>
                                  <div className="space-y-1">
                                    {t.items.map((item, idx) => (
                                      <div key={idx} className="flex items-center justify-between font-medium text-slate-800">
                                        <span className="flex items-center gap-1">
                                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                                          <span>{item.name}</span>
                                          <span className="text-[11px] text-slate-500 font-mono">
                                            ({formatMMK(item.price)} × {item.quantity})
                                          </span>
                                        </span>
                                        <span className="font-bold font-mono text-slate-900">
                                          {formatMMK(item.amount)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right Side Actions & Cloud Badge */}
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            {/* Per-Transaction Sync Status Badge & Error Tracker Trigger */}
                            {(() => {
                              const syncInfo = getTransactionSyncStatus(t, cloudTxIds);
                              return (
                                <button
                                  type="button"
                                  onClick={() => setSelectedTxForSyncModal(t)}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-transform active:scale-95 cursor-pointer shadow-2xs ${syncInfo.badgeClass}`}
                                  title={lang === 'my' ? syncInfo.labelMy : syncInfo.labelEn}
                                >
                                  {syncInfo.state === 'synced' && <Cloud className="w-3 h-3 text-emerald-600 shrink-0" />}
                                  {syncInfo.state === 'pending' && <Clock className="w-3 h-3 text-amber-600 shrink-0" />}
                                  {syncInfo.state === 'failed' && <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0 animate-bounce" />}
                                  {syncInfo.state === 'offline' && <WifiOff className="w-3 h-3 text-slate-500 shrink-0" />}
                                  <span className="hidden sm:inline">
                                    {syncInfo.state === 'synced' ? 'DB' : syncInfo.state === 'pending' ? 'Local' : syncInfo.state === 'failed' ? 'Error' : 'Offline'}
                                  </span>
                                </button>
                              );
                            })()}

                            {(() => {
                              const perms = getCollaboratorPermissions(wallet, user?.email, user?.uid);
                              const canEdit = isIncome ? perms.canEditIncome : perms.canEditExpense;
                              const canDelete = isIncome ? perms.canDeleteIncome : perms.canDeleteExpense;

                              return (
                                <div className="flex items-center gap-0.5">
                                  {canEdit ? (
                                    <button
                                      onClick={() => onEditTransaction(t)}
                                      className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                      title={lang === 'my' ? 'မှတ်တမ်း ပြင်ဆင်မည်' : 'Edit record'}
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                  ) : (
                                    <span
                                      className="p-1.5 text-slate-200 cursor-not-allowed"
                                      title={lang === 'my' ? 'Wallet ပိုင်ရှင်မှ ပြင်ဆင်ခွင့် ပိတ်ထားပါသည်' : 'Edit disabled'}
                                    >
                                      <Lock className="w-3.5 h-3.5" />
                                    </span>
                                  )}

                                  {canDelete ? (
                                    <button
                                      onClick={() => {
                                        if (window.confirm(lang === 'my' ? 'ဤမှတ်တမ်းကို ဖျက်ရန် သေချာပါသလား?' : 'Delete this transaction?')) {
                                          onDeleteTransaction(t.id);
                                        }
                                      }}
                                      className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                      title={lang === 'my' ? 'မှတ်တမ်း ဖျက်မည်' : 'Delete record'}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  ) : (
                                    <span
                                      className="p-1.5 text-slate-200 cursor-not-allowed"
                                      title={lang === 'my' ? 'Wallet ပိုင်ရှင်မှ ဖျက်ပိုင်ခွင့် ပိတ်ထားပါသည်' : 'Delete disabled'}
                                    >
                                      <Lock className="w-3.5 h-3.5" />
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Load More Button (when more days exist) */}
      {groupedByDate.length > visibleDays && (
        <div className="py-5 text-center bg-white/95 backdrop-blur-xl rounded-3xl border border-white/90 shadow-[0_10px_28px_rgba(139,92,246,0.08)]">
          <button
            type="button"
            onClick={() => setVisibleDays((d) => d + 30)}
            className="px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer active:scale-95"
          >
            {lang === 'my' ? '📄 နောက်ထပ် ကြည့်မည် (+30 ရက်)' : '📄 Load More (+30 days)'}
          </button>
          <div className="text-[10px] text-slate-400 mt-2">
            {groupedByDate.length - visibleDays} {lang === 'my' ? 'ရက် ကျန်ရှိပါသည်' : 'more days'}
          </div>
        </div>
      )}

      {/* Item Price History and Comparison Modal */}
      <ItemPriceHistoryModal
        isOpen={isPriceHistoryOpen}
        onClose={() => setIsPriceHistoryOpen(false)}
        transactions={transactions}
        categories={categories}
        wallets={wallets}
        lang={lang}
      />

      {/* Per-Transaction Sync Detail & Error Tracker Modal */}
      <TransactionSyncDetailModal
        transaction={selectedTxForSyncModal}
        cloudTxIds={cloudTxIds}
        categories={categories}
        lang={lang}
        onClose={() => setSelectedTxForSyncModal(null)}
        onRefreshSync={() => {}}
      />
    </div>
  );
};
