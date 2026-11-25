import React, { useState, useMemo } from 'react';
import {  Search, Filter, ArrowDownLeft, ArrowUpRight, Trash2, Edit2, Calendar, Lock, Tag, History, ChevronLeft, ChevronRight, ChevronDown, Cloud, WifiOff, AlertTriangle, Clock, Package , ShoppingCart, Eye, EyeOff } from 'lucide-react';
import { Category, FuelLog, PlanType, Transaction, VehicleMaintenance, Wallet, DataScope } from '../types';
import { formatMMK, formatLakhs, getCategoryDisplayName } from '../utils/formatters';
import { formatCurrency, convertToMMK } from '../utils/currency';
import { getLocalDateString } from '../utils/dateUtils';
import { safeSetItem } from '../utils/storage';
import { CategoryIcon } from './CategoryIcon';
import { ItemPriceHistoryModal } from './ItemPriceHistoryModal';
import { MultiWalletSelector } from './MultiWalletSelector';
import { FinancialSummaryTable } from './FinancialSummaryTable';
import { TransactionSyncDetailModal } from './TransactionSyncDetailModal';
import { TransactionDetailModal } from './TransactionDetailModal';
import { getTransactionSyncStatus } from '../utils/transactionSyncStatus';
import { useSearchSeed } from '../hooks/useSearchSeed';
import { syncQueue } from '../lib/syncQueue';
import { useAuth } from '../context/AuthContext';
import { getCollaboratorPermissions } from '../utils/permissions';
import { buildWalletMap, convertTxToMMK, getMatchingWalletIds, isWalletMatch, isTransferTransaction, isSharedWallet } from '../utils/walletBalance';
import { displayMenuUnit } from '../utils/shopMenuUpdate';
// [v7.6.07] Split badge on collapsed rows.
import { hasSplits, splitShopGroups } from '../utils/transactionSplits';
// [v7.6.44] Records-search index (haystack + sort keys built once) and
// the shared debounced search input (typing re-renders only the input).
import {
  buildTransactionSearchIndex,
  compareTransactionSearchEntries,
  normalizeTransactionSearchQuery,
  transactionSearchEntryMatches,
} from '../utils/transactionSearch';
import { DebouncedSearchInput } from './DebouncedSearchInput';
// [v7.6.15] Fuel line on Records rows (fuel type / litres / station
// from the linked FuelLog).
import { findFuelLogForTransaction, findMaintenanceLogForTransaction, formatFuelRowLine } from '../utils/fuelRowLine';
// [v7.6.16] Filter-notice gate: the amber banner shows only when a
// non-wallet filter is active (a wallet-only pick is a scope
// choice, not a "missing records" warning).
import { shouldShowFilterNotice } from '../utils/filterNotice';
// [v7.6.19] Selected-wallet label for the Records header chip.
import { getWalletSelectionLabel } from '../utils/walletSelectionLabel';
// [v7.6.45] Records-top calendar (Part E) + display-time tile colours (Part D).
import { RecordsCalendar } from './RecordsCalendar';
import { getCategoryTileColor } from '../utils/categoryTileColor';

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
  onDeleteTransaction: (id: string) => void;
  onEditTransaction: (tx: Transaction) => void;
  onOpenUpgradeModal: () => void;
  cloudTxIds?: Set<string>;
  // [v7.6.15] Fuel logs for the fuel line on Records rows: a row
  // reaches its linked FuelLog via FuelLog.transactionId (see
  // utils/fuelRowLine). Optional: without it no fuel line renders.
  fuelLogs?: FuelLog[];
  // [v7.6.45] Maintenance logs for the detail view's odometer row:
  // the parallel of fuelLogs. Optional: without it no maintenance
  // odometer renders.
  maintenanceLogs?: VehicleMaintenance[];
  // [v7.5.55] Full cloud refresh for the sync-detail modal (e.g. App's
  // manual sync). Optional: without it the modal retries via syncQueue.
  onRefreshSync?: () => void | Promise<void>;
  // [v7.6.45] Tab switch for the balance card's Reports button
  // (App passes setActiveTab; 'analytics' is the Reports tab id).
  // Optional: without it the button is not rendered.
  onSelectTab?: (tab: string) => void;
}

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

// [v7.6.45] Day-card header parts: big date numeral + weekday +
// month/year, from the same weekday/month names as
// formatLocalizedDate above (duplicated lists are the established
// pattern in this codebase — see TransactionDetailModal). Dateless
// or malformed dates fall back to a neutral header.
const splitDayCardParts = (
  dateStr: string,
  lang: 'my' | 'en',
): { dayNum: string; weekday: string; monthYear: string } => {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return { dayNum: '•', weekday: '', monthYear: dateStr };
  const year = parseInt(parts[0], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(year, monthIdx, day);
  if (isNaN(d.getTime())) return { dayNum: '•', weekday: '', monthYear: dateStr };
  const daysMy = ['တနင်္ဂနွေ', 'တနင်္လာ', 'အင်္ဂါ', 'ဗုဒ္ဓဟူး', 'ကြာသပတေး', 'သောကြာ', 'စနေ'];
  const daysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthsMy = [
    'ဇန်နဝါရီ', 'ဖေဖော်ဝါရီ', 'မတ်', 'ဧပြီ', 'မေ', 'ဇွန်',
    'ဇူလိုင်', 'သြဂုတ်', 'စက်တင်ဘာ', 'အောက်တိုဘာ', 'နိုဝင်ဘာ', 'ဒီဇင်ဘာ',
  ];
  const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return {
    dayNum: String(day),
    weekday: lang === 'my' ? daysMy[d.getDay()] : daysEn[d.getDay()],
    monthYear:
      lang === 'my'
        ? `${monthsMy[monthIdx]} ${year}`
        : `${monthsEn[monthIdx]} ${year}`,
  };
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
  onDeleteTransaction,
  onEditTransaction,
  onOpenUpgradeModal,
  cloudTxIds,
  fuelLogs = [],
  maintenanceLogs = [],
  onRefreshSync,
  onSelectTab,
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
  // [v7.6.44] The search box is DebouncedSearchInput (below): it owns
  // the raw keystroke text and reports the query once per pause, so
  // typing re-renders ONLY the input — never this whole list view.
  // The parent keeps ONLY the debounced term (what the list filters
  // on). The 150ms pause is the delay v7.6.41 already used.
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  // [v7.5.55 E15] A global-search "View all" tap seeds this search box.
  useSearchSeed('transactions', setDebouncedSearchTerm);
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
  // [v7.6.11] View-first: tapping a row opens the read-only detail
  // view; the edit form opens only from the view's Edit button
  // (or the row's explicit pencil button, unchanged).
  const [viewingTx, setViewingTx] = useState<Transaction | null>(null);
  const [selectedTxForSyncModal, setSelectedTxForSyncModal] = useState<Transaction | null>(null);
  // [v7.6.45] Records-top balance card + calendar (Parts D/E).
  // selectedDay filters the list to one day (calendar tap; tap
  // again clears). calendarOpen defaults to false so the first
  // viewport stays compact. balanceHidden masks the card amounts.
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [balanceHidden, setBalanceHidden] = useState(false);
  // [v7.5.55] Delete confirmation (inline dialog — this app has no shared
  // ConfirmModal component; native window.confirm is no longer used).
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  const [financialSystem, setFinancialSystem] = useState<'inflow_outflow' | 'opening_closing'>('opening_closing');
  // [v7.5.73] Filter panel collapsed by default; the choice persists
  // in localStorage (same lazy-initializer pattern as ngwe_tx_time_filter).
  const [filtersExpanded, setFiltersExpanded] = useState<boolean>(() => {
    try {
      return typeof localStorage !== 'undefined' && localStorage.getItem('ngwe_tx_filters_expanded') === 'true';
    } catch { /* ignore */ }
    return false;
  });
  const setFiltersExpandedPersist = (expanded: boolean) => {
    setFiltersExpanded(expanded);
    safeSetItem('ngwe_tx_filters_expanded', expanded ? 'true' : 'false');
  };
  // [v7.5.73] BADGE-COUNT RULE: count 1 for EACH of these non-default
  // states — typeFilter !== 'all'; effectiveDataScope !== 'all';
  // financialSystem !== 'opening_closing'; timeFilter !== 'all';
  // selectedCategory !== 'all'; selectedWallet !== 'all' OR
  // selectedWalletIds.length > 0 (counts as 1 combined, not 2);
  // debouncedSearchTerm.trim() !== ''. Maximum 7.
  const activeFilterCount = useMemo(() => (
    (typeFilter !== 'all' ? 1 : 0)
    + (effectiveDataScope !== 'all' ? 1 : 0)
    + (financialSystem !== 'opening_closing' ? 1 : 0)
    + (timeFilter !== 'all' ? 1 : 0)
    + (selectedCategory !== 'all' ? 1 : 0)
    + ((selectedWallet !== 'all' || selectedWalletIds.length > 0) ? 1 : 0)
    + (debouncedSearchTerm.trim() !== '' ? 1 : 0)
  ), [typeFilter, effectiveDataScope, financialSystem, timeFilter, selectedCategory, selectedWallet, selectedWalletIds, debouncedSearchTerm]);

  const hasSharedWallets = useMemo(() => {
    return wallets.some((w) => w.isSharedFromOther || (w.sharedWith && w.sharedWith.length > 0));
  }, [wallets]);

  // [v7.5.56] Shared-wallet helpers (findings 25/38).
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

  // [v7.6.19] Header chip label: which wallet the list is scoped to,
  // in the same wording as the filter panel's wallet selector.
  const walletSelectionLabel = getWalletSelectionLabel(
    visibleWalletsInFilter,
    selectedWalletIds,
    selectedWallet,
    lang,
  );

  // Reset pagination when filters change (the debounced search term,
  // so typing does not reset it on every keystroke)
  React.useEffect(() => {
    setVisibleDays(30);
  }, [typeFilter, timeFilter, debouncedSearchTerm, selectedCategory, selectedWallet, selectedWalletIds, effectiveDataScope, selectedDay]);

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

  // [v7.6.44] Search index: per-record lower-cased fields + sort
  // keys, built once per data change (transactionSearch.ts). A
  // filter run over the index is includes() checks + a numeric sort
  // — no per-record lower-casing, joining, attribution, or
  // `new Date()` construction per run.
  const searchIndex = useMemo(
    () => buildTransactionSearchIndex(transactions, catMap, subCatMap, walletMap),
    [transactions, catMap, subCatMap, walletMap],
  );

  const filtered = useMemo(() => {
    const { query: searchQuery, queryNoComma: searchQueryNoComma } =
      normalizeTransactionSearchQuery(debouncedSearchTerm);
    const hasSearchQuery = debouncedSearchTerm.trim() !== '';
    return searchIndex
      .filter((searchEntry) => {
        const t = searchEntry.tx;
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

      // Search — matches item names, shop names, wallet names and
      // amounts too (not just category/subcategory/note). The
      // per-record fields live in `searchIndex`; this run only does
      // the includes checks. Query normalisation (toLatinDigits so
      // typing ၁၀၀၀၀ matches 10000; comma-strip so "50,000" matches
      // 50000, like Global Search) is computed once per run above.
      if (hasSearchQuery && !transactionSearchEntryMatches(searchEntry, searchQuery, searchQueryNoComma)) {
        return false;
      }

      return true;
    })
      .sort(compareTransactionSearchEntries)
      .map((entry) => entry.tx);
  }, [searchIndex, effectiveDataScope, personalWalletIds, sharedWalletIds, personalWallets, sharedWallets, typeFilter, selectedCategory, selectedWallet, selectedWalletIds, wallets, walletMap, timeFilter, specificDate, startDate, endDate, debouncedSearchTerm, todayStr, yesterdayStr, sevenDaysAgoStr, currentMonthPrefix, lastMonthPrefix]);

  // [v7.6.45] Day drill-down (Parts D/E): the calendar tap filters
  // the LIST to one day. It composes with every filter above but is
  // kept OUT of `filtered` itself — the summary table and the
  // calendar aggregate the day-free scope, so tapping a day never
  // zeroes the calendar cells or the summary totals. The selected
  // day always has its own visible clear chip (below), and every
  // "clear filters" reset clears it too.
  const visibleFiltered = useMemo(
    () => (selectedDay ? filtered.filter((t) => t.date === selectedDay) : filtered),
    [filtered, selectedDay],
  );

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

    // [v7.6.45] Day-filtered list (see visibleFiltered above).
    visibleFiltered.forEach((t) => {
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
  }, [visibleFiltered, walletMap, isSingleWalletFilter]);

  // [v7.6.45] Records balance card (Part D): this month's opening /
  // closing / net for the RECORDS wallet scope — the wallet pick
  // when one is made, otherwise the wallets of the active data
  // scope. The search text, category and time filters do NOT move
  // the balance (they filter the list, not the money), and the
  // Dashboard hero scope is never used here: the two filters stay
  // independent. Formula = FinancialSummaryTable's: opening is the
  // current wallet balance minus the month's net, closing is
  // opening + inflow − outflow. Conversion uses the Analytics
  // converter (convertTxToMMK) so multi-currency records match the
  // Reports totals. Transfers are excluded (they are not in/out).
  const balanceScopeWallets = useMemo(() => {
    if (selectedWalletIds.length > 0 && selectedWalletIds.length < wallets.length) {
      return wallets.filter((w) => selectedWalletIds.includes(w.id));
    }
    if (selectedWallet !== 'all') {
      return wallets.filter((w) => isWalletMatch(w, selectedWallet));
    }
    return visibleWalletsInFilter;
  }, [wallets, selectedWalletIds, selectedWallet, visibleWalletsInFilter]);

  const monthBalance = useMemo(() => {
    let opening = 0;
    let inflow = 0;
    let outflow = 0;
    for (const w of balanceScopeWallets) {
      let wIn = 0;
      let wOut = 0;
      for (const t of transactions) {
        if (!t.date || !t.date.startsWith(currentMonthPrefix)) continue;
        if (!isWalletMatch(w, t.walletId)) continue;
        if (isTransferTransaction(t)) continue;
        const amt = convertTxToMMK(walletMap, wallets, t);
        if (t.type === 'income') wIn += amt;
        else if (t.type === 'expense') wOut += amt;
      }
      opening += convertToMMK(Number(w.balance) || 0, w.currency, w.exchangeRate) - (wIn - wOut);
      inflow += wIn;
      outflow += wOut;
    }
    const net = inflow - outflow;
    return { opening, inflow, outflow, net, closing: opening + net };
  }, [balanceScopeWallets, transactions, currentMonthPrefix, walletMap, wallets]);

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

  // [v7.5.55] The transaction limit window: both Guest and Free count
  // the calendar month (v7.5.68) — so the banner counts transactions
  // dated within the plan's window.
  const monthStartStr = useMemo(() => {
    const now = new Date();
    return getLocalDateString(new Date(now.getFullYear(), now.getMonth(), 1));
  }, []);
  const monthTxCount = useMemo(() => {
    // [v7.5.56] Limit-count rule (finding 34): a transaction counts
    // toward user U's limit iff tx.createdBy === U AND the wallet is U's
    // own OR a shared wallet U owns. A collaborator's transactions in a
    // shared wallet do NOT count toward the collaborator's limit.
    // Legacy transactions with no createdBy stamp are counted (assumed
    // own), preserving the v7.5.55 behaviour for pre-v7.5.56 data.
    const uid = user?.uid;
    return transactions.filter((t) => {
      if (!t.date || t.date < monthStartStr) return false;
      if (uid && t.createdBy && t.createdBy !== uid) return false;
      if (uid && t.createdBy === uid) {
        const w = walletMap.get(t.walletId) || wallets.find((wall) => isWalletMatch(wall, t.walletId));
        if (w && w.isSharedFromOther && w.ownerUid !== uid) return false;
      }
      return true;
    }).length;
  }, [transactions, monthStartStr, user?.uid, walletMap, wallets]);
  // [v7.5.68] Both Guest and Free count the calendar month.
  const isAtLimit =
    (plan === 'guest' || plan === 'free') && monthTxCount >= maxFreeTransactions;

  return (
    <div className="space-y-3">
      {/* [v7.6.42] space-y-3 — measured first-viewport waste, gaps only. */}
      {/* [v7.6.45] Records balance card (Part D) — Records tab ONLY,
          never the Dashboard hero. Compact navy: the title, wallet
          pill and eye share the top row (no dead space); the
          balance is ~22px (deliberately not large); opening /
          closing / net sit on one compact row. The calendar
          (Part E) opens inline below, default hidden. Amounts use
          the lakh format with the exact kyat in the tooltip, like
          the rows below. */}
      <div className="rounded-3xl bg-[#1E3A5F] text-white px-3.5 py-3 sm:px-4 shadow-[0_10px_28px_rgba(30,58,95,0.25)] space-y-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold text-sky-200 truncate">
            {lang === 'my' ? 'လက်ကျန် · ဒီလ' : 'Balance · This month'}
          </span>
          <div className="ml-auto flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setFiltersExpandedPersist(!filtersExpanded)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white transition-colors cursor-pointer"
              title={lang === 'my' ? 'ပိုက်ဆံအိတ် ရွေးချယ်ရန် Filter ဖွင့်မည်' : 'Open filters to choose wallets'}
            >
              <span>
                {lang === 'my'
                  ? `ပိုက်ဆံအိတ် ${balanceScopeWallets.length} ခု`
                  : balanceScopeWallets.length === 1
                    ? '1 wallet'
                    : `${balanceScopeWallets.length} wallets`}
              </span>
              <ChevronDown className="w-3.5 h-3.5 opacity-80" />
            </button>
            <button
              type="button"
              onClick={() => setBalanceHidden(!balanceHidden)}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors cursor-pointer"
              aria-label={lang === 'my' ? (balanceHidden ? 'လက်ကျန်ကို ပြမည်' : 'လက်ကျန်ကို ဝှက်မည်') : (balanceHidden ? 'Show balance' : 'Hide balance')}
              title={lang === 'my' ? (balanceHidden ? 'လက်ကျန်ကို ပြမည်' : 'လက်ကျန်ကို ဝှက်မည်') : (balanceHidden ? 'Show balance' : 'Hide balance')}
            >
              {balanceHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div
          className="text-[22px] leading-tight font-extrabold font-mono"
          title={formatMMK(monthBalance.closing)}
        >
          {balanceHidden ? '••••' : formatLakhs(monthBalance.closing, lang)}
        </div>

        <div className="grid grid-cols-3 gap-2 text-[11px]">
          <div className="min-w-0">
            <div className="text-white/60 font-medium truncate">{lang === 'my' ? 'လအစလက်ကျန်' : 'Opening'}</div>
            <div className="font-mono font-bold truncate" title={formatMMK(monthBalance.opening)}>
              {balanceHidden ? '••••' : formatLakhs(monthBalance.opening, lang)}
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-white/60 font-medium truncate">{lang === 'my' ? 'လအဆုံးလက်ကျန်' : 'Closing'}</div>
            <div className="font-mono font-bold truncate" title={formatMMK(monthBalance.closing)}>
              {balanceHidden ? '••••' : formatLakhs(monthBalance.closing, lang)}
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-white/60 font-medium truncate">{lang === 'my' ? 'အသားတင်' : 'Net'}</div>
            <div
              className={`font-mono font-bold truncate ${monthBalance.net >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}
              title={formatMMK(monthBalance.net)}
            >
              {balanceHidden ? '••••' : `${monthBalance.net >= 0 ? '+' : ''}${formatLakhs(monthBalance.net, lang)}`}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-0.5">
          {onSelectTab && (
            <button
              type="button"
              onClick={() => onSelectTab('analytics')}
              className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white transition-colors cursor-pointer"
            >
              {lang === 'my' ? 'အစီရင်ခံစာ' : 'Reports'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setCalendarOpen(!calendarOpen)}
            aria-expanded={calendarOpen}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white transition-colors cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5" />
            {calendarOpen
              ? (lang === 'my' ? 'ပြက္ခဒိန် ဝှက်မည်' : 'Hide calendar')
              : (lang === 'my' ? 'ပြက္ခဒိန် ပြမည်' : 'Show calendar')}
          </button>
        </div>

        {calendarOpen && (
          <div className="bg-white text-slate-900 rounded-2xl p-2.5 sm:p-3">
            <RecordsCalendar
              transactions={filtered}
              wallets={wallets}
              lang={lang}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              includeTransfers={isSingleWalletFilter}
            />
          </div>
        )}
      </div>

      {/* [v7.5.73] Title card REMOVED — actions only, one slim row,
          no card background. The record count moved to the summary line. */}
      <div className="flex min-w-0 items-center gap-2 py-0.5">
          {/* [v7.5.55] C10: opens the price-history / comparison modal. */}
          <button
            type="button"
            onClick={() => setIsPriceHistoryOpen(true)}
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 transition-all cursor-pointer active:scale-95"
          >
            <History className="w-4 h-4" />
            <span>{lang === 'my' ? 'ဈေးနှိုင်းယှဉ်' : 'Price Compare'}</span>
          </button>
          {/* [v7.6.26] CSV Export moved to Data Management — the header
              row is Price Compare + wallet chip only. */}
          {/* [v7.6.19] Selected-wallet chip (display only): shows which
              wallet the list is scoped to, in the empty space beside
              the Price Compare button. Same wording as the
              filter panel's wallet selector; scope is not shown.
              [v7.6.23] Single-row header: the chip flexes to fill the
              remaining row width and truncates, instead of wrapping
              onto a second line. */}
          <span
            title={walletSelectionLabel}
            className="inline-flex min-w-0 flex-1 items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700"
          >
            <span className="truncate">{walletSelectionLabel}</span>
          </span>
      </div>

      {/* Free tier limit banner warning if reached or close */}
      {isAtLimit && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-amber-900 font-medium min-w-0">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              {lang === 'my'
                ? plan === 'guest'
                  ? `Guest Mode ၏ ဒီလ အတွင်း ကန့်သတ်ချက် (${maxFreeTransactions} ခု) ပြည့်သွားပါပြီ။ ဆက်လက်မှတ်တမ်းတင်ရန် Premium သို့ အဆင့်မြှင့်ပါ။`
                  : `Free Plan ၏ ဒီလ အတွင်း ကန့်သတ်ချက် (${maxFreeTransactions} ခု) ပြည့်သွားပါပြီ။ နောက်လ ၁ ရက်နေ့မှာ ပြန်စလို့ ရပါမယ်။`
                : plan === 'guest'
                  ? `You reached the Guest Mode limit of ${maxFreeTransactions} transactions this month. Upgrade to Premium for unlimited records.`
                  : `You reached the Free Plan limit of ${maxFreeTransactions} transactions this month. You can add records again on the 1st of next month.`}
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

            {/* Compact Unified Filter & Summary Control Box — [v7.5.68 R6] chips raised toward 36–44px + relaxed leading so Burmese labels are not cut. [v7.5.73] Collapsible, collapsed by default: only the slim bar (search + Filter button) + summary line show; the full panel expands on tap. */}
      <div className="bg-white p-2 sm:p-3 rounded-2xl border border-slate-200 shadow-xs space-y-1.5 sm:space-y-2">
        {/* [v7.5.73] Slim bar — always visible: search + Filter button with active-count badge. */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            {/* [v7.6.44] Shared debounced input: typing re-renders
                only the input; the list filters on the debounced
                term (see the state comment above). */}
            <DebouncedSearchInput id="tx-search-input" type="text" placeholder={lang === 'my' ? 'ရှာရန်...' : 'Search...'} value={debouncedSearchTerm} onDebouncedChange={setDebouncedSearchTerm} className="w-full pl-8 pr-8 py-2 sm:py-2.5 text-base bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            {/* [v7.5.60 N2] Clear-search ✕, like Global Search / Categories. */}
            {debouncedSearchTerm && (
              <button type="button" onClick={() => setDebouncedSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer" title={lang === 'my' ? 'ရှာဖွေမှု ရှင်းမည်' : 'Clear search'}>
                <span className="text-sm leading-none">✕</span>
              </button>
            )}
          </div>
          <button type="button" onClick={() => setFiltersExpandedPersist(!filtersExpanded)} aria-expanded={filtersExpanded} className="relative inline-flex items-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all cursor-pointer shrink-0">
            <Filter className="w-4 h-4" />
            <span>{lang === 'my' ? 'စစ်ထုတ်ရန်' : 'Filter'}</span>
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">{activeFilterCount}</span>
            )}
          </button>
        </div>

        {/* [v7.5.73] Full filter panel — same controls in the same order as before. */}
        {filtersExpanded && (
        <div className="space-y-1.5 sm:space-y-2 pt-1 sm:pt-1.5 border-t border-slate-100">
          {/* Row 1: Wallet */}
          <div className="flex-1 min-w-[200px]">
            {/* [v7.5.56] Lists only the wallets of the active scope
                (visibleWalletsInFilter); a scope change clears the pick. */}
            <MultiWalletSelector wallets={visibleWalletsInFilter} selectedWalletIds={selectedWalletIds} onChangeSelectedWalletIds={(ids) => { setSelectedWalletIds(ids); setSelectedWallet('all'); }} lang={lang} />
          </div>
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg shrink-0 justify-center">
            <button type="button" onClick={() => handleTypeFilterChange('all')} className={`px-3 py-2 sm:py-2.5 text-xs font-semibold leading-relaxed rounded-md transition-colors cursor-pointer ${typeFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>{lang === 'my' ? 'အားလုံး' : 'All'}</button>
            <button type="button" onClick={() => handleTypeFilterChange('income')} className={`px-3 py-2 sm:py-2.5 text-xs font-semibold leading-relaxed rounded-md transition-colors flex items-center gap-1 cursor-pointer ${typeFilter === 'income' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700 hover:bg-emerald-50'}`}><ArrowDownLeft className="w-3 h-3" />{lang === 'my' ? 'ဝင်' : 'In'}</button>
            <button type="button" onClick={() => handleTypeFilterChange('expense')} className={`px-3 py-2 sm:py-2.5 text-xs font-semibold leading-relaxed rounded-md transition-colors flex items-center gap-1 cursor-pointer ${typeFilter === 'expense' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-700 hover:bg-rose-50'}`}><ArrowUpRight className="w-3 h-3" />{lang === 'my' ? 'ထွက်' : 'Out'}</button>
          </div>

        {/* Row 2: Scope + Summary Toggle + Time + Category + Table Toggle */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 sm:pt-1.5 border-t border-slate-100">
          {/* [v7.5.56] All / ကိုယ်ပိုင် / မျှဝေထား filter (finding 25) —
              wires the existing dataScope logic to real UI. Only shown
              when shared wallets exist. */}
          {hasSharedWallets && (
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg shrink-0" role="group" aria-label={lang === 'my' ? 'ပိုက်ဆံအိတ် အမျိုးအစား' : 'Wallet scope'}>
              <button type="button" onClick={() => setEffectiveDataScope('all')} className={`px-3 py-2.5 text-xs font-semibold leading-relaxed rounded-md transition-colors cursor-pointer ${effectiveDataScope === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>{lang === 'my' ? 'အားလုံး' : 'All'}</button>
              <button type="button" onClick={() => setEffectiveDataScope('personal')} className={`px-3 py-2.5 text-xs font-semibold leading-relaxed rounded-md transition-colors cursor-pointer ${effectiveDataScope === 'personal' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>👤 {lang === 'my' ? 'ကိုယ်ပိုင်' : 'Personal'}</button>
              <button type="button" onClick={() => setEffectiveDataScope('shared')} className={`px-3 py-2.5 text-xs font-semibold leading-relaxed rounded-md transition-colors cursor-pointer ${effectiveDataScope === 'shared' ? 'bg-amber-500 text-white shadow-xs' : 'text-amber-800 hover:bg-amber-50'}`}>🤝 {lang === 'my' ? 'မျှဝေထား' : 'Shared'}</button>
            </div>
          )}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/70 shrink-0">
            <button type="button" onClick={() => setFinancialSystem('opening_closing')} className={'px-2.5 py-2 sm:py-2.5 rounded-md text-xs font-bold leading-relaxed transition-all cursor-pointer ' + (financialSystem === 'opening_closing' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900')}>{lang === 'my' ? 'အဖွင့် / အပိတ်' : 'Opening / Closing'}</button>
            <button type="button" onClick={() => setFinancialSystem('inflow_outflow')} className={'px-2.5 py-2 sm:py-2.5 rounded-md text-xs font-bold leading-relaxed transition-all cursor-pointer ' + (financialSystem === 'inflow_outflow' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900')}>{lang === 'my' ? 'ဝင်ငွေ / ထွက်ငွေ' : 'Inflow / Outflow'}</button>
          </div>
          
          <div className="flex-1 flex gap-1.5 min-w-[200px] basis-full sm:basis-auto">
            <select id="tx-time-filter" value={timeFilter} onChange={(e: any) => setTimeFilter(e.target.value)} className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-2 text-base font-semibold text-slate-700 focus:outline-none cursor-pointer">
              <option value="all">🌟 {lang === 'my' ? 'ရက်စွဲအားလုံး' : 'All Time'}</option>
              <option value="this_month">📅 {lang === 'my' ? 'ယခုလ' : 'This Month'}</option>
              <option value="last_month">🗓️ {lang === 'my' ? 'ပြီးခဲ့သောလ' : 'Last Month'}</option>
              <option value="this_week">📊 {lang === 'my' ? 'ဒီအပတ်' : 'This Week'}</option>
              <option value="today">☀️ {lang === 'my' ? 'ဒီနေ့' : 'Today'}</option>
              <option value="yesterday">🌙 {lang === 'my' ? 'မနေ့က' : 'Yesterday'}</option>
              <option value="specific_date">🎯 {lang === 'my' ? 'သတ်မှတ်ရက်' : 'Specific Date'}</option>
              <option value="custom_range">📆 {lang === 'my' ? 'ရက်အပိုင်းအခြား' : 'Custom Range'}</option>
            </select>
            <select id="tx-cat-filter" value={selectedCategory} onChange={(e) => handleCategoryFilterChange(e.target.value)} className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-2 text-base font-medium text-slate-700 focus:outline-none cursor-pointer truncate">
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
              <button type="button" onClick={() => shiftSpecificDate(-1)} className="p-2 rounded-md text-slate-600 hover:bg-slate-200 cursor-pointer" title={lang === 'my' ? 'တစ်ရက် နောက်' : 'Previous day'}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input type="date" value={specificDate} onChange={(e) => setSpecificDate(e.target.value)} className="bg-transparent text-base font-bold text-slate-700 focus:outline-none cursor-pointer" />
              <button type="button" onClick={() => shiftSpecificDate(1)} className="p-2 rounded-md text-slate-600 hover:bg-slate-200 cursor-pointer" title={lang === 'my' ? 'တစ်ရက် ရှေ့' : 'Next day'}>
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
            {(debouncedSearchTerm || typeFilter !== 'all' || timeFilter !== 'all' || selectedCategory !== 'all' || selectedWallet !== 'all' || selectedWalletIds.length > 0 || effectiveDataScope !== 'all') && (
              <button type="button" onClick={() => { setDebouncedSearchTerm(''); setTypeFilter('all'); setTimeFilter('all'); setSpecificDate(todayStr); setSelectedCategory('all'); setSelectedWallet('all'); setSelectedWalletIds([]); setEffectiveDataScope('all'); setSelectedDay(null); }} className="text-xs text-rose-600 hover:underline font-bold px-2.5 py-2.5 leading-relaxed cursor-pointer bg-rose-50 rounded-lg">↺</button>
            )}
            <button type="button" onClick={() => setShowSummaryTable(!showSummaryTable)} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 sm:py-2.5 leading-relaxed rounded-lg border border-indigo-200 transition-all cursor-pointer shrink-0">
              {showSummaryTable ? (lang === 'my' ? '➖ ကျဉ်းမည်' : '➖ Compact') : (lang === 'my' ? '📊 Table' : '📊 Table')}
            </button>
          </div>
        </div>
        </div>
        )}

        {/* [v7.5.73] Summary — always visible under the filter bar: slim line (state A) or compact bar (state B). */}
        {/* Row 2 Sub: Financial Table View or Compact Bar */}
        {showSummaryTable ? (
          <FinancialSummaryTable slim financialSystem={financialSystem} onChangeFinancialSystem={setFinancialSystem} income={filteredIncome} expense={filteredExpense} incomeCount={filtered.filter((t) => t.type === 'income' && (!isTransferTransaction(t) || isSingleWalletFilter)).length} expenseCount={filtered.filter((t) => t.type === 'expense' && (!isTransferTransaction(t) || isSingleWalletFilter)).length} selectedWallets={selectedWalletIds.length > 0 && selectedWalletIds.length < wallets.length ? wallets.filter((w) => selectedWalletIds.includes(w.id)) : selectedWallet !== 'all' ? wallets.filter((w) => isWalletMatch(w, selectedWallet)) : wallets} transactions={filtered} lang={lang} />
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2 p-1.5 sm:p-2 bg-slate-50 rounded-xl border border-slate-100 text-xs mt-1">
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
      {shouldShowFilterNotice(transactions.length, filtered.length, { typeFilter, timeFilter, selectedCategory, searchTerm: debouncedSearchTerm }) && (
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
              setDebouncedSearchTerm('');
              setTypeFilter('all');
              setTimeFilter('all');
              setSpecificDate(todayStr);
              setSelectedCategory('all');
              setSelectedWallet('all');
              setSelectedWalletIds([]);
              setEffectiveDataScope('all');
              setSelectedDay(null);
            }}
            className="px-2.5 py-1 rounded-lg bg-amber-200/80 hover:bg-amber-300/80 text-amber-950 font-bold transition-all shrink-0 cursor-pointer text-[11px]"
          >
            {lang === 'my' ? 'မှတ်တမ်းအားလုံး ပြန်ဖွင့်မည်' : 'Show All Records'}
          </button>
        </div>
      )}

      {/* [v7.6.45] Selected-day chip: the calendar tap always leaves
          a visible way back, even with the calendar closed. */}
      {selectedDay && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-indigo-50 border border-indigo-200 text-xs font-bold text-indigo-900">
          <Calendar className="w-4 h-4 shrink-0" />
          <span className="min-w-0 truncate">{formatLocalizedDate(selectedDay, lang)}</span>
          <button
            type="button"
            onClick={() => setSelectedDay(null)}
            className="ml-auto shrink-0 px-2 py-1 rounded-lg bg-white hover:bg-indigo-100 border border-indigo-200 cursor-pointer"
          >
            ✕ {lang === 'my' ? 'ဖြုတ်မည်' : 'Clear'}
          </button>
        </div>
      )}

      {/* Transactions List — one card per day (Part D, v7.6.45). */}
      {visibleFiltered.length === 0 ? (
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl border border-white/90 overflow-hidden shadow-[0_10px_28px_rgba(139,92,246,0.08),inset_1.5px_1.5px_3px_rgba(255,255,255,0.9)]">
          <div className="py-5 text-center text-slate-400 space-y-2 px-4">
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
                  setDebouncedSearchTerm('');
                  setTypeFilter('all');
                  setTimeFilter('all');
                  setSelectedCategory('all');
                  setSelectedWallet('all');
                  setSelectedWalletIds([]);
                  setEffectiveDataScope('all');
                  setSelectedDay(null);
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
          </div>
        ) : (
          <div className="space-y-3">
            {groupedByDate.slice(0, visibleDays).map((group) => {
              const dayParts = splitDayCardParts(group.date, lang);
              // [v7.5.62] The wallet pill is only informative when a
              // day's rows use more than one wallet — when every row
              // uses the same wallet it just repeats the same name.
              const showWalletPill =
                new Set(group.transactions.map((t) => t.walletId)).size > 1;
              // [v7.5.63] Majority rule: the wallet most rows use that day is the
              // "default" — its rows show no wallet pill. Only rows using a minority
              // wallet get a pill (full text). If no single wallet is the majority
              // (tie), fall back to the old rule (show when the day mixes wallets,
              // or the wallet is shared).
              const walletCounts = new Map<string, number>();
              group.transactions.forEach((tx) => {
                walletCounts.set(tx.walletId, (walletCounts.get(tx.walletId) ?? 0) + 1);
              });
              const maxWalletCount = Math.max(0, ...walletCounts.values());
              const majorityWalletIds = [...walletCounts.entries()]
                .filter(([, count]) => count === maxWalletCount)
                .map(([id]) => id);
              const defaultWalletId = majorityWalletIds.length === 1 ? majorityWalletIds[0] : null;
              return (
                <div key={group.date} className="bg-white/95 backdrop-blur-xl rounded-3xl border border-white/90 overflow-hidden shadow-[0_10px_28px_rgba(139,92,246,0.08),inset_1.5px_1.5px_3px_rgba(255,255,255,0.9)]">
                  {/* [v7.6.45] Day header: big numeral + weekday +
                      month/year + day net + count chip (one card
                      per day). The old sticky header with in/out/net
                      badges is replaced; the rows below are
                      unchanged, and the day's in/out stay visible in
                      the summary bar above. */}
                  <div className="px-4 sm:px-5 pt-3 pb-2 flex items-center justify-between gap-3 border-b border-slate-100">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-[26px] leading-none font-extrabold text-slate-900 shrink-0">
                        {dayParts.dayNum}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs font-bold text-slate-900 truncate">{dayParts.weekday}</span>
                        <span className="block text-[11px] text-slate-500 truncate">{dayParts.monthYear}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`font-mono font-bold text-xs sm:text-sm ${group.net >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}
                        title={formatMMK(group.net)}
                      >
                        {group.net >= 0 ? '+' : ''}{formatLakhs(group.net, lang)}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                        {group.transactions.length} {lang === 'my' ? 'ခု' : 'items'}
                      </span>
                    </div>
                  </div>

                  {/* Transactions for this date */}
                  <div className="divide-y divide-slate-100">
                    {/* [v7.6.41] One line PER SHOP: a split record whose
                        rows name different shops renders one line per
                        shop group (each line: that shop's rows, their
                        categories, their summed amount). Rows sharing
                        a shop stay grouped, and a single-shop record
                        renders exactly one line, as today. Day
                        subtotals, the day count, and the summary table
                        above stay transaction-level — nothing is
                        double-counted. Every line opens the same
                        whole-record detail view. */}
                    {group.transactions.flatMap((t) => {
                      const shopGroups = splitShopGroups(t);
                      const isMultiShop = shopGroups.length > 1;
                      return shopGroups.map((shopGroup, groupIdx) => {
                      const isFirstLine = groupIdx === 0;
                      // Line 1 shows THIS group's first row's category
                      // (the primary for a single-group record — the
                      // same value as today); Line 2 shows THIS
                      // group's summed amount.
                      const lineCatId = shopGroup.attributions[0]?.categoryId || t.category;
                      const lineSubId = shopGroup.attributions[0]?.subCategoryId;
                      const cat = catMap.get(lineCatId);
                      const subCat = lineSubId ? subCatMap.get(lineSubId) : undefined;
                      const wallet = walletMap.get(t.walletId);
                      const isIncome = t.type === 'income';
                      // [v7.5.60 S3] Row amounts in lakhs like the summary
                      // bar (exact kyat in the tooltip); foreign-currency
                      // wallets keep their own currency format.
                      const amountMMK = convertToMMK(shopGroup.amount, wallet?.currency, wallet?.exchangeRate);
                      const isMMK = !wallet?.currency || wallet.currency === 'MMK';
                      // [v7.6.15] Fuel line: the linked FuelLog's type /
                      // litres / station, joined by transactionId only.
                      // Shown regardless of the note text — it is data,
                      // not a note, so no note comparison is made. A
                      // record with no linked log gets '' and renders
                      // exactly as before.
                      const linkedFuelLog = findFuelLogForTransaction(fuelLogs, t.id);
                      const fuelLine = formatFuelRowLine(linkedFuelLog);
                      // [v7.5.62] Line 3 only exists when it has content —
                      // an empty div still costs pt-0.5 + space-y-1 on
                      // every row. [v7.6.41] Note / items / split badge /
                      // fuel line / creator chip are whole-record facts:
                      // they render on the FIRST line only. Later lines
                      // of a multi-shop record get Line 3 only for
                      // their shop pill.
                      const hasLine3Content =
                        (isFirstLine &&
                          (!!t.note ||
                            (t.items && t.items.length > 0) ||
                            hasSplits(t) ||
                            !!fuelLine ||
                            (isSharedWallet(wallet) &&
                              !!(t.createdByName || (t.createdBy && t.createdBy === user?.uid))))) ||
                        (isMultiShop && !!shopGroup.shopName);
                      // [v7.6.02] Collapsed unit_qty rows: the item name
                      // lives only in t.items[0].name while t.note is
                      // only the typed note, so the name was unreachable
                      // anywhere in the list. Show the first named item
                      // (plus a +N count, the v7.5.94 calendar
                      // convention) first in Line 3 — unitPrice rows
                      // only; shopping rows keep their buttons and
                      // direct rows already carry the name in the note.
                      // When the note merely repeats the single name
                      // (trim + case-insensitive), show it once: the
                      // quoted note span is suppressed.
                      const unitQtyItemNames = t.unitPrice
                        ? (t.items || [])
                            .map((it) => (it.name || '').trim())
                            .filter((n) => n.length > 0)
                        : [];
                      const unitQtyItemLabel =
                        unitQtyItemNames.length === 0
                          ? ''
                          : unitQtyItemNames.length === 1
                            ? unitQtyItemNames[0]
                            : `${unitQtyItemNames[0]} +${unitQtyItemNames.length - 1} မျိုး`;
                      const noteRepeatsItemName =
                        unitQtyItemNames.length === 1 &&
                        !!t.note &&
                        t.note.trim().toLowerCase() === unitQtyItemNames[0].toLowerCase();

                      return (
                        <div
                          key={`${t.id}::${groupIdx}`}
                          onClick={() => setViewingTx(t)}
                          className="p-3 sm:p-3.5 sm:px-6 hover:bg-slate-50/80 transition-colors cursor-pointer"
                          title={lang === 'my' ? 'နှိပ်၍ ကြည့်မည်' : 'Tap to view'}
                        >
                          {/* [v7.5.95 T1] Header line only — the expanded
                              item table is a sibling below (full width),
                              NOT inside the flex-1 middle column, where
                              w-full only bought ~131px and names
                              wrapped per-syllable with price/amount
                              overlapping. */}
                          <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div
                              className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-[2px_3px_8px_rgba(0,0,0,0.12),inset_1px_1px_2px_rgba(255,255,255,0.6)]"
                              style={{ backgroundColor: getCategoryTileColor(cat, isIncome) }}
                            >
                              <CategoryIcon name={cat?.icon || 'Tag'} className="w-5 h-5" />
                            </div>

                            <div className="min-w-0 flex-1 space-y-1">
                              {/* Line 1: Category & Subcategory */}
                              {/* [v7.5.63] No truncation — the name wraps to
                                  a second line and the pill drops to its own
                                  line when it does not fit beside the name. */}
                              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                <span className="font-bold text-sm sm:text-base text-slate-900 min-w-0 flex-1">
                                  {getCategoryDisplayName(lineCatId, categories, lang)}
                                </span>
                                {subCat && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10.5px] font-medium border border-slate-200 shrink-0">
                                    <Tag className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                    <span>{lang === 'my' ? subCat.name : subCat.nameEn}</span>
                                  </span>
                                )}
                              </div>

                              {/* Line 2: Amount & Wallet */}
                              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                <span className={`font-mono font-bold text-xs sm:text-sm shrink-0 ${isIncome ? 'text-emerald-700' : 'text-rose-600'}`} title={formatMMK(amountMMK)}>
                                  {isIncome ? `+${isMMK ? formatLakhs(amountMMK, lang) : formatCurrency(shopGroup.amount, wallet?.currency)}` : `-${isMMK ? formatLakhs(amountMMK, lang) : formatCurrency(shopGroup.amount, wallet?.currency)}`}
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
                                    never the raw walletId.
                                    [v7.5.62] Shown only when it tells the
                                    rows apart (mixed wallets that day) or
                                    the wallet is shared (🤝 + owner info). */}
                                {(defaultWalletId === null
                                  ? (showWalletPill || isSharedWallet(wallet))
                                  : t.walletId !== defaultWalletId) && (
                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border max-w-full flex-wrap ${
                                  isSharedWallet(wallet)
                                    ? 'bg-amber-50 text-amber-900 border-amber-300'
                                    : 'bg-indigo-50 text-indigo-900 border-indigo-200'
                                }`}>
                                  {wallet ? (
                                    <>
                                      {isSharedWallet(wallet) && <span>{lang === 'my' ? '🤝 မျှဝေထား' : '🤝 Shared'}</span>}
                                      <span>{(lang === 'my' ? wallet.name : wallet.nameEn) || wallet.name}</span>
                                      {isSharedWallet(wallet) && getWalletOwnerName(wallet) && (
                                        <span>({getWalletOwnerName(wallet)})</span>
                                      )}
                                    </>
                                  ) : (
                                    <span>{lang === 'my' ? 'ပိုက်ဆံအိတ်' : 'Wallet'}</span>
                                  )}
                                </span>
                                )}
                              </div>

                              {/* Line 3: Note / Shopping / Package */}
                              {hasLine3Content && (
                              <div className="flex items-center gap-2 min-w-0 flex-wrap text-xs text-slate-500 pt-0.5">
                                {/* [v7.6.41] Shop pill — ONLY on lines of
                                    a multi-shop record: the shop this
                                    line's rows were bought at.
                                    Single-shop records show no pill,
                                    exactly as today. */}
                                {isMultiShop && shopGroup.shopName && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-900 text-[10px] font-bold border border-emerald-200 shrink-0">
                                    🏪 {shopGroup.shopName}
                                  </span>
                                )}
                                {/* [v7.5.56] Who added it (finding 38): the
                                    creator's name on rows in shared wallets.
                                    Own rows show "ကိုယ်တိုင်" when the stamp
                                    is missing but the creator is the viewer. */}
                                {isFirstLine && isSharedWallet(wallet) && (t.createdByName || (t.createdBy && t.createdBy === user?.uid)) && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-900 text-[10px] font-bold border border-amber-200 shrink-0">
                                    👤 {t.createdByName || (lang === 'my' ? 'ကိုယ်တိုင်' : 'You')}
                                  </span>
                                )}
                                {/* [v7.6.15] Fuel line (linked FuelLog only):
                                    fuel type · litres · station. First
                                    in Line 3, ahead of the item name /
                                    note, and shown even when the note is
                                    empty — fuel records otherwise showed
                                    nothing here at all. */}
                                {isFirstLine && fuelLine && (
                                  <span className="text-slate-700 font-semibold text-[11px] min-w-0 break-words">
                                    {fuelLine}
                                  </span>
                                )}
                                {isFirstLine && unitQtyItemLabel && (
                                  <span className="text-slate-700 font-semibold text-[11px] min-w-0 break-words">
                                    {unitQtyItemLabel}
                                  </span>
                                )}
                                {isFirstLine && t.note && !noteRepeatsItemName && (
                                  <span className="text-slate-600 italic text-[11px]">
                                    "{t.note}"
                                  </span>
                                )}

                                {/* [v7.6.07] Split badge: how many
                                    categories this one record is split
                                    across (primary category + amount stay
                                    in Lines 1–2, as today). */}
                                {isFirstLine && hasSplits(t) && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-violet-50 text-violet-900 border border-violet-300 shadow-2xs shrink-0">
                                    {lang === 'my' ? `${t.splits!.length} မျိုး ခွဲ` : `Split ×${t.splits!.length}`}
                                  </span>
                                )}

                                {isFirstLine && t.items && t.items.length > 0 && (
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
                                        x {t.items[0]?.quantity || t.quantity || 1}{t.items[0]?.unit && t.items[0]?.unit.trim() ? ` ${displayMenuUnit(t.items[0]?.unit)}` : ''}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                              )}

                            </div>
                          </div>

                          {/* Right Side Actions & Cloud Badge — first
                              line only: edit / delete / sync act on the
                              whole record, so later lines of a
                              multi-shop record carry no duplicate
                              buttons. Every line still opens the
                              whole-record detail view on tap. */}
                          {isFirstLine && (
                          <div className="flex items-center gap-1 sm:gap-2 shrink-0 ml-2">
                            {/* Per-Transaction Sync Status Badge & Error Tracker Trigger */}
                            {(() => {
                              const syncInfo = getTransactionSyncStatus(t, cloudTxIds);
                              return (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setSelectedTxForSyncModal(t); }}
                                  className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-transform active:scale-95 cursor-pointer shadow-2xs ${syncInfo.badgeClass}`}
                                  title={lang === 'my' ? syncInfo.labelMy : syncInfo.labelEn}
                                >
                                  {syncInfo.state === 'synced' && <Cloud className="w-3 h-3 text-emerald-600 shrink-0" />}
                                  {syncInfo.state === 'pending' && <Clock className="w-3 h-3 text-amber-600 shrink-0" />}
                                  {syncInfo.state === 'failed' && <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0 animate-bounce" />}
                                  {syncInfo.state === 'offline' && <WifiOff className="w-3 h-3 text-slate-500 shrink-0" />}
                                  {syncInfo.state !== 'synced' && (
                                  <span>
                                    {/* [v7.5.60 S11] Short label on phones too
                                        (was icon-only), in Myanmar when the
                                        app language is Myanmar.
                                        [v7.5.63] Synced rows are icon-only by
                                        design — the green cloud chip is the
                                        synced cue and "သိမ်း" repeated on
                                        every row. Other states keep the
                                        short label. */}
                                    {lang === 'my'
                                      ? (syncInfo.state === 'pending' ? 'စောင့်' : syncInfo.state === 'failed' ? 'အမှား' : 'အော့ဖ်လိုင်း')
                                      : (syncInfo.state === 'pending' ? 'Local' : syncInfo.state === 'failed' ? 'Error' : 'Offline')}
                                  </span>
                                  )}
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
                                      className="p-2 sm:p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                      title={lang === 'my' ? 'မှတ်တမ်း ပြင်ဆင်မည်' : 'Edit record'}
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                  ) : (
                                    <span
                                      className="p-2 sm:p-2.5 text-slate-200 cursor-not-allowed"
                                      title={lang === 'my' ? 'Wallet ပိုင်ရှင်မှ ပြင်ဆင်ခွင့် ပိတ်ထားပါသည်' : 'Edit disabled'}
                                    >
                                      <Lock className="w-3.5 h-3.5" />
                                    </span>
                                  )}

                                  {canDelete ? (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setTxToDelete(t); }}
                                      className="p-2 sm:p-2.5 text-rose-500 bg-rose-50 hover:text-rose-700 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                                      title={lang === 'my' ? 'မှတ်တမ်း ဖျက်မည်' : 'Delete record'}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  ) : (
                                    <span
                                      className="p-2 sm:p-2.5 text-slate-200 cursor-not-allowed"
                                      title={lang === 'my' ? 'Wallet ပိုင်ရှင်မှ ဖျက်ပိုင်ခွင့် ပိတ်ထားပါသည်' : 'Delete disabled'}
                                    >
                                      <Lock className="w-3.5 h-3.5" />
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                          )}
                        </div>
                        {/* [v7.5.95 T1] Expanded table hoisted out of the
                            flex-1 middle column to full row width. Whole-
                            record items: shown under the first line only. */}
                        {isFirstLine && t.items && t.items.length > 0 && expandedShoppingTxIds[t.id] && (
                          <div className="mt-2.5 w-full p-2.5 bg-amber-50/70 rounded-xl border border-amber-200 text-xs space-y-1.5 animate-fadeIn">
                            <div className="text-[11px] font-bold text-amber-950 pb-1 border-b border-amber-200/80 flex items-center justify-between">
                              <span>🛒 {lang === 'my' ? 'ဝယ်ယူခဲ့သည့် ပစ္စည်းအသေးစိတ်:' : 'Itemized Purchases:'}</span>
                              <span className="font-mono text-amber-900">{t.items.length} items</span>
                            </div>
                            <div className="space-y-1">
                              {t.items.map((item, idx) => (
                                <div key={idx} className="flex flex-wrap items-center justify-between gap-2 font-medium text-slate-800">
                                  <span className="flex flex-1 flex-wrap items-center gap-1 min-w-0">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                                    <span className="min-w-0 flex-1 break-words">{item.name}</span>
                                    {/* [v7.6.01] Unit beside price × quantity, normalized
                                        ('တစ်ခု' → 'ခု', 'တစ်ဗူး' → 'ဗူး'); no suffix
                                        when the stored unit is missing/blank.
                                        [v7.6.01 top-up] Row wraps: a long unit
                                        drops below the name instead of squeezing
                                        / overlapping it. */}
                                    <span className="text-[11px] text-slate-500 font-mono shrink-0 whitespace-nowrap">
                                      ({formatMMK(item.price)} × {item.quantity}{item.unit && item.unit.trim() ? ` ${displayMenuUnit(item.unit)}` : ''})
                                    </span>
                                  </span>
                                  <span className="font-bold font-mono text-slate-900 shrink-0 whitespace-nowrap">
                                    {formatMMK(item.amount)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        </div>
                      );
                    });
                  })}
                  </div>
                </div>
              );
            })}
        </div>
        )}

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

      {/* [v7.6.11] Read-only record view — tap a row to view; the
          Edit button inside the view opens the existing edit form.
          canEdit mirrors the row pencil's permission check; the
          edit handler's own gate still applies on Edit tap. */}
      <TransactionDetailModal
        transaction={viewingTx}
        categories={categories}
        wallets={wallets}
        lang={lang}
        fuelLog={viewingTx ? findFuelLogForTransaction(fuelLogs, viewingTx.id) : undefined}
        maintenanceLog={viewingTx ? findMaintenanceLogForTransaction(maintenanceLogs, viewingTx.id) : undefined}
        canEdit={(() => {
          if (!viewingTx) return true;
          const w = walletMap.get(viewingTx.walletId);
          const perms = getCollaboratorPermissions(w, user?.email, user?.uid);
          return viewingTx.type === 'income' ? perms.canEditIncome : perms.canEditExpense;
        })()}
        onClose={() => setViewingTx(null)}
        onEdit={(tx) => onEditTransaction(tx)}
      />
    </div>
  );
};
