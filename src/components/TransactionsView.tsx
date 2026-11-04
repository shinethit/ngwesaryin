import React, { useState, useMemo } from 'react';
import {  Search, Filter, ArrowDownLeft, ArrowUpRight, Trash2, Edit2, Calendar, Lock, Tag, History, ChevronLeft, ChevronRight, Cloud, WifiOff, AlertTriangle, Clock, Package , ShoppingCart, Plus } from 'lucide-react';
import { Category, PlanType, Transaction, Wallet, DataScope } from '../types';
import { formatMMK, formatLakhs, exportToCSV, getCategoryDisplayName } from '../utils/formatters';
import { formatCurrency, convertToMMK } from '../utils/currency';
import { safeSetItem } from '../utils/storage';
import { CategoryIcon } from './CategoryIcon';
import { ItemPriceHistoryModal } from './ItemPriceHistoryModal';
import { MultiWalletSelector } from './MultiWalletSelector';
import { FinancialSummaryTable } from './FinancialSummaryTable';
import { TransactionSyncDetailModal } from './TransactionSyncDetailModal';
import { getTransactionSyncStatus } from '../utils/transactionSyncStatus';
import { useSearchSeed } from '../hooks/useSearchSeed';
import { toLatinDigits, toMyanmarDigits } from '../utils/myanmarDigits';
import { syncQueue } from '../lib/syncQueue';
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
  // [v7.5.55] Full cloud refresh for the sync-detail modal (e.g. App's
  // manual sync). Optional: without it the modal retries via syncQueue.
  onRefreshSync?: () => void | Promise<void>;
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
  onRefreshSync,
}) => {
  const { user } = useAuth();
  // [v7.5.56] Working All / ကိုယ်ပိုင် / မျှဝေထား filter (finding 25):
  // dataScope already existed but nothing in the UI ever set it. When the
  // parent supplies onSetDataScope the prop is authoritative; otherwise
  // this local state drives the same logic.
  const [localDataScope, setLocalDataScope] = useState<DataScope>('all');
  const effectiveDataScope: DataScope = onSetDataScope ? dataScope : localDataScope;
  const setEffectiveDataScope = (scope: DataScope) => {
    if (onSetDataScope) onSetDataScope(scope);
    else setLocalDataScope(scope);
  };
  const [isPriceHistoryOpen, setIsPriceHistoryOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  // [v7.5.55 E15] A global-search "View all" tap seeds this search box.
  useSearchSeed('transactions', setSearchTerm);
  const [visibleDays, setVisibleDays] = useState(30);
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  // [v7.5.60 S13] The time filter is saved on every change — read it
  // back on mount so the choice survives leaving the page (the old
  // code always started at 'all' even though it saved the value).
  const [timeFilter, setTimeFilterState] = useState<TimeFilterType>(() => {
    try {
      const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('ngwe_tx_time_filter') : null;
      const valid: TimeFilterType[] = ['all', 'today', 'yesterday', 'this_week', 'this_month', 'last_month', 'specific_date', 'custom_range'];
      if (saved && (valid as string[]).includes(saved)) return saved as TimeFilterType;
    } catch { /* ignore */ }
    return 'all';
  });

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
  // [v7.5.55] Delete confirmation (inline dialog — this app has no shared
  // ConfirmModal component; native window.confirm is no longer used).
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  const [financialSystem, setFinancialSystem] = useState<'inflow_outflow' | 'opening_closing'>('opening_closing');

  const hasSharedWallets = useMemo(() => {
    return wallets.some((w) => w.isSharedFromOther || (w.sharedWith && w.sharedWith.length > 0));
  }, [wallets]);

  // [v7.5.56] Shared-wallet helpers (findings 25/38).
  const isSharedWallet = (w: Wallet | undefined | null): boolean =>
    !!w && (!!w.isSharedFromOther || !!(w.sharedWith && w.sharedWith.length > 0));
  const getWalletOwnerName = (w: Wallet | undefined | null): string =>
    w?.ownerName || w?.ownerEmail || '';

  const sharedWallets = useMemo(
    () => wallets.filter((w) => w.isSharedFromOther || (w.sharedWith && w.sharedWith.length > 0)),
    [wallets]
  );
  const personalWallets = useMemo(
    () => wallets.filter((w) => !w.isSharedFromOther && (!w.sharedWith || w.sharedWith.length === 0)),
    [wallets]
  );

  const sharedWalletIds = useMemo(
    () =>
      getMatchingWalletIds(sharedWallets),
    [sharedWallets]
  );

  const personalWalletIds = useMemo(
    () =>
      getMatchingWalletIds(personalWallets),
    [personalWallets]
  );

  // Wallets visible in pills based on dataScope
  // [v7.5.56] Now actually used: the wallet selector below lists only
  // the wallets of the active scope, so a scope + wallet pick can never
  // combine into a stale-empty list (finding 25).
  const visibleWalletsInFilter = useMemo(() => {
    if (effectiveDataScope === 'personal') return personalWallets;
    if (effectiveDataScope === 'shared') return sharedWallets;
    return wallets;
  }, [wallets, effectiveDataScope, personalWallets, sharedWallets]);

  // Reset pagination when filters change
  React.useEffect(() => {
    setVisibleDays(30);
  }, [typeFilter, timeFilter, searchTerm, selectedCategory, selectedWallet, selectedWalletIds, effectiveDataScope]);

  // [v7.5.56] A scope change invalidates the wallet pick: a personal
  // wallet selected under "Shared" would otherwise show nothing.
  React.useEffect(() => {
    setSelectedWalletIds([]);
    setSelectedWallet('all');
  }, [effectiveDataScope]);

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
      // [v7.5.56] Uses the precomputed wallet lists / id sets instead of
      // re-filtering `wallets` per transaction (finding 25).
      if (effectiveDataScope === 'personal') {
        if (!personalWalletIds.has(t.walletId) && !personalWallets.some((w) => isWalletMatch(w, t.walletId))) return false;
      }
      if (effectiveDataScope === 'shared') {
        if (!sharedWalletIds.has(t.walletId) && !sharedWallets.some((w) => isWalletMatch(w, t.walletId))) return false;
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

      // Search — [v7.5.55] matches item names, shop names, wallet
      // names and amounts too (not just category/subcategory/note).
      // The query is normalised with toLatinDigits so typing ၁၀၀၀၀
      // matches an amount of 10000.
      if (searchTerm.trim()) {
        const rawQuery = searchTerm.trim().toLowerCase();
        const query = toLatinDigits(rawQuery);
        // [v7.5.60 S14] Strip commas so "50,000" matches an amount of
        // 50000, like Global Search already does.
        const queryNoComma = query.replace(/,/g, '');
        const cat = catMap.get(t.category);
        const catName = (cat?.name || '').toLowerCase();
        const catNameEn = (cat?.nameEn || '').toLowerCase();
        const subCat = t.subCategoryId ? subCatMap.get(t.subCategoryId) : undefined;
        const subName = (subCat?.name || '').toLowerCase();
        const subNameEn = (subCat?.nameEn || '').toLowerCase();
        const note = (t.note || '').toLowerCase();
        const itemNames = (t.items || []).map((it) => (it.name || '').toLowerCase()).join(' ');
        const shopName = (t.shopName || '').toLowerCase();
        const wallet = walletMap.get(t.walletId);
        const walletName = ((wallet?.name || '') + ' ' + (wallet?.nameEn || '')).toLowerCase();
        const amountLatin = String(t.amount);
        const amountMyanmar = toMyanmarDigits(amountLatin);
        if (
          !catName.includes(query) &&
          !catNameEn.includes(query) &&
          !subName.includes(query) &&
          !subNameEn.includes(query) &&
          !note.includes(query) &&
          !itemNames.includes(query) &&
          !shopName.includes(query) &&
          !walletName.includes(query) &&
          !(queryNoComma && amountLatin.includes(queryNoComma)) &&
          !(queryNoComma && amountMyanmar.includes(toMyanmarDigits(queryNoComma)))
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
  }, [transactions, effectiveDataScope, personalWalletIds, sharedWalletIds, personalWallets, sharedWallets, typeFilter, selectedCategory, selectedWallet, selectedWalletIds, wallets, walletMap, timeFilter, specificDate, startDate, endDate, searchTerm, catMap, subCatMap, todayStr, yesterdayStr, sevenDaysAgoStr, currentMonthPrefix, lastMonthPrefix]);

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

  // [v7.5.55] Real sync refresh for the sync-detail modal: retry any
  // queued writes, then run the parent's full cloud refresh when provided.
  const handleRefreshSync = async () => {
    try {
      await syncQueue.processQueue();
    } catch (err) {
      console.warn('[TransactionsView] sync retry failed:', err);
    }
    try {
      await onRefreshSync?.();
    } catch (err) {
      console.warn('[TransactionsView] parent sync refresh failed:', err);
    }
  };

  // [v7.5.60 S18] Type and category filters must never contradict each
  // other: picking a category adopts that category's type, and picking
  // a type clears a category of the other type — otherwise the list
  // goes silently empty with no explanation.
  const handleTypeFilterChange = (t: 'all' | 'income' | 'expense') => {
    setTypeFilter(t);
    if (t !== 'all' && selectedCategory !== 'all') {
      const cat = catMap.get(selectedCategory);
      if (cat && cat.type !== t) setSelectedCategory('all');
    }
  };
  const handleCategoryFilterChange = (v: string) => {
    setSelectedCategory(v);
    if (v !== 'all') {
      const cat = catMap.get(v);
      if (cat) setTypeFilter(cat.type);
    }
  };

  const handleExport = () => {
    // [v7.5.55] Premium-only: hidden entirely for other plans (no locked
    // button, no upgrade prompt) and gated here too.
    if (plan !== 'premium') {
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

  // [v7.5.55] The transaction limit is per ROLLING 30 days, so the
  // banner counts only transactions dated within the last 30 days.
  const rolling30StartStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return getLocalDateString(d);
  }, []);
  const rolling30TxCount = useMemo(() => {
    // [v7.5.56] Rolling-limit rule (finding 34): a transaction counts
    // toward user U's limit iff tx.createdBy === U AND the wallet is U's
    // own OR a shared wallet U owns. A collaborator's transactions in a
    // shared wallet do NOT count toward the collaborator's limit.
    // Legacy transactions with no createdBy stamp are counted (assumed
    // own), preserving the v7.5.55 behaviour for pre-v7.5.56 data.
    const uid = user?.uid;
    return transactions.filter((t) => {
      if (!t.date || t.date < rolling30StartStr) return false;
      if (uid && t.createdBy && t.createdBy !== uid) return false;
      if (uid && t.createdBy === uid) {
        const w = walletMap.get(t.walletId) || wallets.find((wall) => isWalletMatch(wall, t.walletId));
        if (w && w.isSharedFromOther && w.ownerUid !== uid) return false;
      }
      return true;
    }).length;
  }, [transactions, rolling30StartStr, user?.uid, walletMap, wallets]);
  const isAtLimit = (plan === 'free' || plan === 'guest') && rolling30TxCount >= maxFreeTransactions;

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

        <div className="flex items-center gap-2 flex-wrap">
          {/* [v7.5.60 M4] Small add button on this page itself — the
              onAddTransaction prop was accepted but never used, so this
              page had no way to add a record. Opens the modal (expense
              by default); the income/expense switch lives in the modal. */}
          <button
            type="button"
            onClick={() => onAddTransaction('expense')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'my' ? 'ထည့်မည်' : 'Add'}</span>
          </button>
          {/* [v7.5.55] C10: opens the price-history / comparison modal. */}
          <button
            type="button"
            onClick={() => setIsPriceHistoryOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 transition-all cursor-pointer active:scale-95"
          >
            <History className="w-4 h-4" />
            <span>{lang === 'my' ? 'ဈေးနှိုင်းယှဉ်' : 'Price Compare'}</span>
          </button>
          {/* [v7.5.55] B10: CSV Export — Premium only, hidden entirely otherwise. */}
          {plan === 'premium' && (
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer active:scale-95"
            >
              <span>{lang === 'my' ? '⬇️ CSV ထုတ်ယူမည်' : '⬇️ Export CSV'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Free tier limit banner warning if reached or close */}
      {isAtLimit && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-amber-900 font-medium min-w-0">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              {lang === 'my'
                ? `${plan === 'guest' ? 'Guest Mode' : 'Free Plan'} ၏ ရက် (၃၀) အတွင်း ကန့်သတ်ချက် (${maxFreeTransactions} ခု) ပြည့်သွားပါပြီ။ ဆက်လက်မှတ်တမ်းတင်ရန် Premium သို့ အဆင့်မြှင့်ပါ။`
                : `You reached the ${plan === 'guest' ? 'Guest Mode' : 'Free Plan'} limit of ${maxFreeTransactions} transactions within 30 days. Upgrade to Premium for unlimited records.`}
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
      <div className="bg-white p-2 sm:p-3 rounded-2xl border border-slate-200 shadow-xs space-y-2">
        {/* Row 1: Wallet, Search, Type */}
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
          <div className="flex-1 min-w-[200px]">
            {/* [v7.5.56] Lists only the wallets of the active scope
                (visibleWalletsInFilter); a scope change clears the pick. */}
            <MultiWalletSelector wallets={visibleWalletsInFilter} selectedWalletIds={selectedWalletIds} onChangeSelectedWalletIds={(ids) => { setSelectedWalletIds(ids); setSelectedWallet('all'); }} lang={lang} />
          </div>
          <div className="relative w-full sm:w-48">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input id="tx-search-input" type="text" placeholder={lang === 'my' ? 'ရှာရန်...' : 'Search...'} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-8 pr-8 py-1.5 text-base bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            {/* [v7.5.60 N2] Clear-search ✕, like Global Search / Categories. */}
            {searchTerm && (
              <button type="button" onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer" title={lang === 'my' ? 'ရှာဖွေမှု ရှင်းမည်' : 'Clear search'}>
                <span className="text-sm leading-none">✕</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg shrink-0 justify-center">
            <button type="button" onClick={() => handleTypeFilterChange('all')} className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${typeFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>{lang === 'my' ? 'အားလုံး' : 'All'}</button>
            <button type="button" onClick={() => handleTypeFilterChange('income')} className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors flex items-center gap-1 cursor-pointer ${typeFilter === 'income' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700 hover:bg-emerald-50'}`}><ArrowDownLeft className="w-3 h-3" />{lang === 'my' ? 'ဝင်' : 'In'}</button>
            <button type="button" onClick={() => handleTypeFilterChange('expense')} className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors flex items-center gap-1 cursor-pointer ${typeFilter === 'expense' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-700 hover:bg-rose-50'}`}><ArrowUpRight className="w-3 h-3" />{lang === 'my' ? 'ထွက်' : 'Out'}</button>
          </div>
        </div>

        {/* Row 2: Scope + Summary Toggle + Time + Category + Table Toggle */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          {/* [v7.5.56] All / ကိုယ်ပိုင် / မျှဝေထား filter (finding 25) —
              wires the existing dataScope logic to real UI. Only shown
              when shared wallets exist. */}
          {hasSharedWallets && (
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg shrink-0" role="group" aria-label={lang === 'my' ? 'ပိုက်ဆံအိတ် အမျိုးအစား' : 'Wallet scope'}>
              <button type="button" onClick={() => setEffectiveDataScope('all')} className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${effectiveDataScope === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>{lang === 'my' ? 'အားလုံး' : 'All'}</button>
              <button type="button" onClick={() => setEffectiveDataScope('personal')} className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${effectiveDataScope === 'personal' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>👤 {lang === 'my' ? 'ကိုယ်ပိုင်' : 'Personal'}</button>
              <button type="button" onClick={() => setEffectiveDataScope('shared')} className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${effectiveDataScope === 'shared' ? 'bg-amber-500 text-white shadow-xs' : 'text-amber-800 hover:bg-amber-50'}`}>🤝 {lang === 'my' ? 'မျှဝေထား' : 'Shared'}</button>
            </div>
          )}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/70 shrink-0">
            <button type="button" onClick={() => setFinancialSystem('opening_closing')} className={'px-2.5 py-2 rounded-md text-xs font-bold transition-all cursor-pointer ' + (financialSystem === 'opening_closing' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900')}>{lang === 'my' ? 'အဖွင့် / အပိတ်' : 'Opening / Closing'}</button>
            <button type="button" onClick={() => setFinancialSystem('inflow_outflow')} className={'px-2.5 py-2 rounded-md text-xs font-bold transition-all cursor-pointer ' + (financialSystem === 'inflow_outflow' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900')}>{lang === 'my' ? 'ဝင်ငွေ / ထွက်ငွေ' : 'Inflow / Outflow'}</button>
          </div>
          
          <div className="flex-1 flex gap-1.5 min-w-[200px]">
            <select id="tx-time-filter" value={timeFilter} onChange={(e: any) => setTimeFilter(e.target.value)} className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-1 text-base font-semibold text-slate-700 focus:outline-none cursor-pointer">
              <option value="all">🌟 {lang === 'my' ? 'ရက်စွဲအားလုံး' : 'All Time'}</option>
              <option value="this_month">📅 {lang === 'my' ? 'ယခုလ' : 'This Month'}</option>
              <option value="last_month">🗓️ {lang === 'my' ? 'ပြီးခဲ့သောလ' : 'Last Month'}</option>
              <option value="this_week">📊 {lang === 'my' ? 'ဒီအပတ်' : 'This Week'}</option>
              <option value="today">☀️ {lang === 'my' ? 'ဒီနေ့' : 'Today'}</option>
              <option value="yesterday">🌙 {lang === 'my' ? 'မနေ့က' : 'Yesterday'}</option>
              <option value="specific_date">🎯 {lang === 'my' ? 'သတ်မှတ်ရက်' : 'Specific Date'}</option>
              <option value="custom_range">📆 {lang === 'my' ? 'ရက်အပိုင်းအခြား' : 'Custom Range'}</option>
            </select>
            <select id="tx-cat-filter" value={selectedCategory} onChange={(e) => handleCategoryFilterChange(e.target.value)} className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-1 text-base font-medium text-slate-700 focus:outline-none cursor-pointer truncate">
              <option value="all">{lang === 'my' ? 'ကဏ္ဍ အားလုံး' : 'All Categories'}</option>
              {sortedCategoriesForFilter.map((c) => (
                <option key={c.id} value={c.id}>{c.type === 'income' ? '🟢' : '🔴'} {lang === 'my' ? c.name : c.nameEn}</option>
              ))}
            </select>
          </div>

          {/* [v7.5.55] B5: real date pickers — specific date (with
              prev/next day shifting) and custom range. */}
          {timeFilter === 'specific_date' && (
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-1 py-0.5 shrink-0">
              <button type="button" onClick={() => shiftSpecificDate(-1)} className="p-1 rounded-md text-slate-600 hover:bg-slate-200 cursor-pointer" title={lang === 'my' ? 'တစ်ရက် နောက်' : 'Previous day'}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input type="date" value={specificDate} onChange={(e) => setSpecificDate(e.target.value)} className="bg-transparent text-base font-bold text-slate-700 focus:outline-none cursor-pointer" />
              <button type="button" onClick={() => shiftSpecificDate(1)} className="p-1 rounded-md text-slate-600 hover:bg-slate-200 cursor-pointer" title={lang === 'my' ? 'တစ်ရက် ရှေ့' : 'Next day'}>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
          {timeFilter === 'custom_range' && (
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-0.5 shrink-0">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-base font-bold text-slate-700 focus:outline-none cursor-pointer" />
              <span className="text-[11px] text-slate-400 font-bold">~</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-base font-bold text-slate-700 focus:outline-none cursor-pointer" />
            </div>
          )}

          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            {(searchTerm || typeFilter !== 'all' || timeFilter !== 'all' || selectedCategory !== 'all' || selectedWallet !== 'all' || selectedWalletIds.length > 0 || effectiveDataScope !== 'all') && (
              <button type="button" onClick={() => { setSearchTerm(''); setTypeFilter('all'); setTimeFilter('all'); setSpecificDate(todayStr); setSelectedCategory('all'); setSelectedWallet('all'); setSelectedWalletIds([]); setEffectiveDataScope('all'); }} className="text-xs text-rose-600 hover:underline font-bold px-2.5 py-2 cursor-pointer bg-rose-50 rounded-lg">↺</button>
            )}
            <button type="button" onClick={() => setShowSummaryTable(!showSummaryTable)} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg border border-indigo-200 transition-all cursor-pointer shrink-0">
              {showSummaryTable ? (lang === 'my' ? '➖ ကျဉ်းမည်' : '➖ Compact') : (lang === 'my' ? '📊 Table' : '📊 Table')}
            </button>
          </div>
        </div>

        {/* Row 2 Sub: Financial Table View or Compact Bar */}
        {showSummaryTable ? (
          <FinancialSummaryTable financialSystem={financialSystem} onChangeFinancialSystem={setFinancialSystem} income={filteredIncome} expense={filteredExpense} incomeCount={filtered.filter((t) => t.type === 'income' && (!isTransferTransaction(t) || isSingleWalletFilter)).length} expenseCount={filtered.filter((t) => t.type === 'expense' && (!isTransferTransaction(t) || isSingleWalletFilter)).length} selectedWallets={selectedWalletIds.length > 0 && selectedWalletIds.length < wallets.length ? wallets.filter((w) => selectedWalletIds.includes(w.id)) : selectedWallet !== 'all' ? wallets.filter((w) => isWalletMatch(w, selectedWallet)) : wallets} transactions={filtered} lang={lang} />
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100 text-xs mt-1">
            <div className="flex items-center gap-3 flex-wrap font-mono font-bold">
              <div className="flex items-center gap-1 text-emerald-700">
                <ArrowDownLeft className="w-3 h-3 stroke-[2.5]" />
                <span className="font-sans text-[10px] font-medium text-slate-500">{lang === 'my' ? 'ဝင်ငွေ:' : 'In:'}</span>
                <span title={formatMMK(filteredIncome)}>+{formatLakhs(filteredIncome, lang)}</span>
              </div>
              <span className="text-slate-300">•</span>
              <div className="flex items-center gap-1 text-rose-700">
                <ArrowUpRight className="w-3 h-3 stroke-[2.5]" />
                <span className="font-sans text-[10px] font-medium text-slate-500">{lang === 'my' ? 'ထွက်ငွေ:' : 'Out:'}</span>
                <span title={formatMMK(filteredExpense)}>-{formatLakhs(filteredExpense, lang)}</span>
              </div>
              <span className="text-slate-300">•</span>
              <div className={`flex items-center gap-1 ${filteredIncome - filteredExpense >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                <span className="font-sans text-[10px] font-medium text-slate-500">{lang === 'my' ? 'အသားတင်:' : 'Net:'}</span>
                <span title={formatMMK(filteredIncome - filteredExpense)}>{filteredIncome - filteredExpense >= 0 ? '+' : ''}{formatLakhs(filteredIncome - filteredExpense, lang)}</span>
              </div>
            </div>
            <div className="text-[10px] font-semibold text-slate-500 font-sans">({filtered.length} {lang === 'my' ? 'မှတ်တမ်း' : 'records'})</div>
          </div>
        )}
      </div>

            {/* Active Filter Notice Bar if filtered is less than total */}
      {transactions.length > 0 && filtered.length < transactions.length && (
        <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-3 px-4 flex items-center justify-between gap-3 text-xs text-amber-900 shadow-xs">
          <div className="flex items-center gap-2 font-medium min-w-0">
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
              setSelectedWalletIds([]);
              setEffectiveDataScope('all');
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
                  setSelectedWalletIds([]);
                  setEffectiveDataScope('all');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer shadow-xs"
              >
                <span>{lang === 'my' ? '🔍 Filter အားလုံးကို ဖြုတ်ပြီး အားလုံးကြည့်မည်' : '🔍 Clear All Filters & Show All'}</span>
              </button>
            )}
            {transactions.length === 0 && (
              <p className="text-xs text-slate-400">
                {lang === 'my' ? 'စာရင်းအသစ် ထည့်သွင်းရန် အောက်ခြေ Menu ရှိ "+" ခလုတ်ကို နှိပ်ပါ' : 'Tap the "+" button in the bottom navigation to record your first entry.'}
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
                          <span title={formatMMK(group.totalIncome)}>+{formatLakhs(group.totalIncome, lang)}</span>
                        </span>
                      )}
                      {group.totalExpense > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[11px] flex items-center gap-1">
                          <span>{lang === 'my' ? 'ထွက်:' : 'Out:'}</span>
                          <span title={formatMMK(group.totalExpense)}>-{formatLakhs(group.totalExpense, lang)}</span>
                        </span>
                      )}
                      {group.totalIncome > 0 && group.totalExpense > 0 && (
                        <span className={`px-2 py-0.5 rounded-md text-[11px] border flex items-center gap-1 ${
                          group.net >= 0
                            ? 'bg-emerald-100/90 text-emerald-900 border-emerald-300'
                            : 'bg-rose-100/90 text-rose-900 border-rose-300'
                        }`}>
                          <span className="font-sans text-[10px] opacity-85">{lang === 'my' ? 'အသားတင်:' : 'Net:'}</span>
                          <span title={formatMMK(group.net)}>{group.net >= 0 ? '+' : ''}{formatLakhs(group.net, lang)}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Transactions for this date */}
                  <div className="divide-y divide-slate-100">
                    {group.transactions.map((t) => {
                      const cat = catMap.get(t.category);
                      const subCat = t.subCategoryId ? subCatMap.get(t.subCategoryId) : undefined;
                      const wallet = walletMap.get(t.walletId);
                      const isIncome = t.type === 'income';
                      // [v7.5.60 S3] Row amounts in lakhs like the summary
                      // bar (exact kyat in the tooltip); foreign-currency
                      // wallets keep their own currency format.
                      const amountMMK = convertToMMK(t.amount, wallet?.currency, wallet?.exchangeRate);
                      const isMMK = !wallet?.currency || wallet.currency === 'MMK';

                      return (
                        <div
                          key={t.id}
                          onClick={() => onEditTransaction(t)}
                          className="p-3.5 sm:p-4 sm:px-6 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors cursor-pointer"
                          title={lang === 'my' ? 'နှိပ်၍ ပြင်ဆင်မည်' : 'Tap to edit'}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div
                              className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-[2px_3px_8px_rgba(0,0,0,0.12),inset_1px_1px_2px_rgba(255,255,255,0.6)]"
                              style={{ backgroundColor: cat?.color || (isIncome ? '#10B981' : '#EF4444') }}
                            >
                              <CategoryIcon name={cat?.icon || 'Tag'} className="w-5 h-5" />
                            </div>

                            <div className="min-w-0 flex-1 space-y-1">
                              {/* Line 1: Category & Subcategory */}
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-bold text-sm sm:text-base text-slate-900 truncate">
                                  {getCategoryDisplayName(t.category, categories, lang)}
                                </span>
                                {subCat && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10.5px] font-medium border border-slate-200">
                                    <Tag className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                    <span className="truncate">{lang === 'my' ? subCat.name : subCat.nameEn}</span>
                                  </span>
                                )}
                              </div>

                              {/* Line 2: Amount & Wallet */}
                              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                <span className={`font-mono font-bold text-xs sm:text-sm shrink-0 ${isIncome ? 'text-emerald-700' : 'text-rose-600'}`} title={formatMMK(amountMMK)}>
                                  {isIncome ? `+${isMMK ? formatLakhs(amountMMK, lang) : formatCurrency(t.amount, wallet?.currency)}` : `-${isMMK ? formatLakhs(amountMMK, lang) : formatCurrency(t.amount, wallet?.currency)}`}
                                </span>
                                {wallet && wallet.currency && wallet.currency !== 'MMK' && (
                                  <span
                                    className="inline text-slate-400 text-[10px] font-mono shrink-0"
                                    title={formatMMK(amountMMK)}
                                  >
                                    ≈ {formatMMK(amountMMK)}
                                  </span>
                                )}
                                {/* [v7.5.56] Wallet pill (finding 25): shared
                                    wallets show "Shared" text + 🤝 + owner
                                    name, not just a different colour. An
                                    unresolvable wallet shows a neutral label,
                                    never the raw walletId. */}
                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                                  isSharedWallet(wallet)
                                    ? 'bg-amber-50 text-amber-900 border-amber-300'
                                    : 'bg-indigo-50 text-indigo-900 border-indigo-200'
                                }`}>
                                  {wallet ? (
                                    <>
                                      {isSharedWallet(wallet) && <span>{lang === 'my' ? '🤝 မျှဝေထား' : '🤝 Shared'}</span>}
                                      <span className="truncate max-w-[100px] sm:max-w-[150px]">{(lang === 'my' ? wallet.name : wallet.nameEn) || wallet.name}</span>
                                      {isSharedWallet(wallet) && getWalletOwnerName(wallet) && (
                                        <span className="truncate max-w-[90px]">({getWalletOwnerName(wallet)})</span>
                                      )}
                                    </>
                                  ) : (
                                    <span>{lang === 'my' ? 'ပိုက်ဆံအိတ်' : 'Wallet'}</span>
                                  )}
                                </span>
                              </div>

                              {/* Line 3: Note / Shopping / Package */}
                              <div className="flex items-center gap-2 min-w-0 flex-wrap text-xs text-slate-500 pt-0.5">
                                {/* [v7.5.56] Who added it (finding 38): the
                                    creator's name on rows in shared wallets.
                                    Own rows show "ကိုယ်တိုင်" when the stamp
                                    is missing but the creator is the viewer. */}
                                {isSharedWallet(wallet) && (t.createdByName || (t.createdBy && t.createdBy === user?.uid)) && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-900 text-[10px] font-bold border border-amber-200 shrink-0">
                                    👤 {t.createdByName || (lang === 'my' ? 'ကိုယ်တိုင်' : 'You')}
                                  </span>
                                )}
                                {t.note && (
                                  <span className="truncate text-slate-600 italic text-[11px] max-w-[200px]">
                                    "{t.note}"
                                  </span>
                                )}

                                {t.items && t.items.length > 0 && (
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {(!t.unitPrice) ? (
                                      <>
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setIsPriceHistoryOpen(true); }}
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-900 border border-indigo-300 hover:bg-indigo-100 cursor-pointer shadow-2xs"
                                        title={lang === 'my' ? 'ဈေးနှိုင်းယှဉ်ကြည့်မည်' : 'Compare prices'}
                                      >
                                        <History className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
                                        <span>{lang === 'my' ? 'ဈေးနှိုင်းယှဉ်' : 'Compare'}</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setExpandedShoppingTxIds((p) => ({ ...p, [t.id]: !p[t.id] })); }}
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 cursor-pointer shadow-2xs"
                                      >
                                        <ShoppingCart className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                        <span>{lang === 'my' ? 'စျေးဝယ်စာရင်း' : 'Shopping'}</span>
                                        <span className="text-[8px] opacity-60">{expandedShoppingTxIds[t.id] ? '▲' : '▼'}</span>
                                      </button>
                                      </>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
                                        <Package className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                        x {t.items[0]?.quantity || t.quantity || 1}
                                      </span>
                                    )}
                                  </div>
                                )}
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
                                      <div key={idx} className="flex items-center justify-between gap-2 font-medium text-slate-800">
                                        <span className="flex items-center gap-1 min-w-0">
                                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                                          <span className="truncate">{item.name}</span>
                                          <span className="text-[11px] text-slate-500 font-mono">
                                            ({formatMMK(item.price)} × {item.quantity})
                                          </span>
                                        </span>
                                        <span className="font-bold font-mono text-slate-900 shrink-0">
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
                                  onClick={(e) => { e.stopPropagation(); setSelectedTxForSyncModal(t); }}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-transform active:scale-95 cursor-pointer shadow-2xs ${syncInfo.badgeClass}`}
                                  title={lang === 'my' ? syncInfo.labelMy : syncInfo.labelEn}
                                >
                                  {syncInfo.state === 'synced' && <Cloud className="w-3 h-3 text-emerald-600 shrink-0" />}
                                  {syncInfo.state === 'pending' && <Clock className="w-3 h-3 text-amber-600 shrink-0" />}
                                  {syncInfo.state === 'failed' && <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0 animate-bounce" />}
                                  {syncInfo.state === 'offline' && <WifiOff className="w-3 h-3 text-slate-500 shrink-0" />}
                                  <span>
                                    {/* [v7.5.60 S11] Short label on phones too
                                        (was icon-only), in Myanmar when the
                                        app language is Myanmar. */}
                                    {lang === 'my'
                                      ? (syncInfo.state === 'synced' ? 'သိမ်း' : syncInfo.state === 'pending' ? 'စောင့်' : syncInfo.state === 'failed' ? 'အမှား' : 'အော့ဖ်လိုင်း')
                                      : (syncInfo.state === 'synced' ? 'DB' : syncInfo.state === 'pending' ? 'Local' : syncInfo.state === 'failed' ? 'Error' : 'Offline')}
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
                                      onClick={(e) => { e.stopPropagation(); onEditTransaction(t); }}
                                      className="p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                      title={lang === 'my' ? 'မှတ်တမ်း ပြင်ဆင်မည်' : 'Edit record'}
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                  ) : (
                                    <span
                                      className="p-2.5 text-slate-200 cursor-not-allowed"
                                      title={lang === 'my' ? 'Wallet ပိုင်ရှင်မှ ပြင်ဆင်ခွင့် ပိတ်ထားပါသည်' : 'Edit disabled'}
                                    >
                                      <Lock className="w-3.5 h-3.5" />
                                    </span>
                                  )}

                                  {canDelete ? (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setTxToDelete(t); }}
                                      className="p-2.5 text-rose-500 bg-rose-50 hover:text-rose-700 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                                      title={lang === 'my' ? 'မှတ်တမ်း ဖျက်မည်' : 'Delete record'}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  ) : (
                                    <span
                                      className="p-2.5 text-slate-200 cursor-not-allowed"
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

      {/* [v7.5.55] B17b: delete confirmation dialog (replaces window.confirm). */}
      {txToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setTxToDelete(null)}>
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-200 p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-base text-slate-900">
              {lang === 'my' ? 'ဤမှတ်တမ်းကို ဖျက်ရန် သေချာပါသလား?' : 'Delete this transaction?'}
            </h3>
            <p className="text-xs text-slate-500">
              {(() => {
                const w = walletMap.get(txToDelete.walletId);
                const mmk = convertToMMK(txToDelete.amount, w?.currency, w?.exchangeRate);
                const isMMK = !w?.currency || w.currency === 'MMK';
                return (
                  <span title={formatMMK(mmk)}>
                    {getCategoryDisplayName(txToDelete.category, categories, lang)} · {txToDelete.type === 'income' ? '+' : '-'}{isMMK ? formatLakhs(mmk, lang) : formatCurrency(txToDelete.amount, w?.currency)} · {formatLocalizedDate(txToDelete.date, lang)}
                  </span>
                );
              })()}
              {txToDelete.note ? ` · "${txToDelete.note}"` : ''}
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setTxToDelete(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs cursor-pointer"
              >
                {lang === 'my' ? 'မလုပ်တော့ပါ' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => { const id = txToDelete.id; setTxToDelete(null); onDeleteTransaction(id); }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer"
              >
                {lang === 'my' ? 'ဖျက်မည်' : 'Delete'}
              </button>
            </div>
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
        onRefreshSync={handleRefreshSync}
      />
    </div>
  );
};
