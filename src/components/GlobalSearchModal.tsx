import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, X, ArrowDownLeft, HandCoins, Wallet, Tag, Layers, ChevronRight, Store, Car } from 'lucide-react';
import { Category, Debt, Transaction, Wallet as WalletType, ShopContact, Vehicle } from '../types';
import { formatMMK } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';
import { buildWalletMap } from '../utils/walletBalance';
import { toLatinDigits } from '../utils/myanmarDigits';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  debts: Debt[];
  wallets: WalletType[];
  categories: Category[];
  shops?: ShopContact[];
  vehicles?: Vehicle[];
  lang: 'my' | 'en';
  onNavigateToTab: (tab: string) => void;
  onSelectDebtForRepayment?: (debt: Debt) => void;
  onSelectTransaction?: (t: Transaction) => void;
  onSelectWallet?: (w: WalletType) => void;
  onSelectCategory?: (c: Category) => void;
  onSelectShop?: (s: ShopContact) => void;
  onSelectVehicle?: (v: Vehicle) => void;
}

type SearchCategory = 'all' | 'transactions' | 'debts' | 'wallets' | 'categories' | 'shops' | 'vehicles';

// [v7.5.55 E17] "12/3" or "12/3/2026" -> match stored YYYY-MM-DD dates.
// Without a year it matches month+day in any year (DD/MM).
const matchDateQuery = (storedDate: string, q: string): boolean => {
  const m = q.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (!m) return false;
  const dd = m[1].padStart(2, '0');
  const mm = m[2].padStart(2, '0');
  if (!m[3]) return storedDate.endsWith(`-${mm}-${dd}`);
  const yyyy = m[3].length === 2 ? `20${m[3]}` : m[3].padStart(4, '0');
  return storedDate.startsWith(`${yyyy}-${mm}-${dd}`);
};

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  transactions,
  debts,
  wallets,
  categories,
  shops = [],
  vehicles = [],
  lang,
  onNavigateToTab,
  onSelectDebtForRepayment,
  onSelectTransaction,
  onSelectWallet,
  onSelectCategory,
  onSelectShop,
  onSelectVehicle,
}) => {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<SearchCategory>('all');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setQuery('');
      setActiveFilter('all');
      setExpanded({});
      setActiveIdx(-1);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Maps for fast lookups
  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const walletMap = useMemo(() => buildWalletMap(wallets), [wallets]);
  const subCatMap = useMemo(() => {
    const map = new Map<string, { name: string; nameEn: string }>();
    categories.forEach((c) => {
      (c.subCategories || []).forEach((s) => {
        map.set(s.id, s);
      });
    });
    return map;
  }, [categories]);

  // Search Results computation (uncapped lists + capped views)
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    // [v7.5.55 E17] Myanmar digits (၅၀၀၀၀) must match Latin amounts/dates.
    const qLatin = toLatinDigits(q);
    const cleanNumbersOnly = qLatin.replace(/,/g, '');

    // 1. Transactions search
    const allTransactions = !q
      ? transactions.slice(0, 5)
      : transactions.filter((t) => {
          const cat = catMap.get(t.category);
          const catName = (cat?.name || '').toLowerCase();
          const catNameEn = (cat?.nameEn || '').toLowerCase();
          const subCat = t.subCategoryId ? subCatMap.get(t.subCategoryId) : undefined;
          const subName = (subCat?.name || '').toLowerCase();
          const subNameEn = (subCat?.nameEn || '').toLowerCase();
          const note = (t.note || '').toLowerCase();
          // [v7.5.60 S5] Shopping-list item names, like the Transactions
          // list search already does — "ဆန်" in a shopping list must be
          // findable from Global Search too.
          const itemNames = (t.items || []).map((it) => (it.name || '').toLowerCase()).join(' ');
          const wallet = walletMap.get(t.walletId);
          const walletName = (wallet?.name || '').toLowerCase();
          const walletNameEn = (wallet?.nameEn || '').toLowerCase();
          const amtStr = t.amount.toString();
          const dateStr = t.date;

          return (
            catName.includes(q) ||
            catNameEn.includes(q) ||
            subName.includes(q) ||
            subNameEn.includes(q) ||
            note.includes(q) ||
            itemNames.includes(q) ||
            walletName.includes(q) ||
            walletNameEn.includes(q) ||
            amtStr.includes(cleanNumbersOnly) ||
            dateStr.includes(qLatin) ||
            matchDateQuery(dateStr, qLatin)
          );
        });

    // 2. Debts search
    const allDebts = !q
      ? debts.slice(0, 4)
      : debts.filter((d) => {
          const name = d.personName.toLowerCase();
          const phone = (d.phone || '').toLowerCase();
          const note = (d.note || '').toLowerCase();
          const amtStr = d.totalAmount.toString();
          const remainingStr = (d.totalAmount - d.paidAmount).toString();
          const isReceivable = d.type === 'receivable';
          const typeKeyword = isReceivable
            ? 'ရရန်ရှိ receivable lent ရရန်'
            : 'ပေးရန်ရှိ payable borrowed ပေးရန်';

          return (
            name.includes(q) ||
            phone.includes(q) ||
            note.includes(q) ||
            amtStr.includes(cleanNumbersOnly) ||
            remainingStr.includes(cleanNumbersOnly) ||
            typeKeyword.toLowerCase().includes(q)
          );
        });

    // 3. Wallets search
    const allWallets = !q
      ? wallets
      : wallets.filter((w) => {
          const name = w.name.toLowerCase();
          const nameEn = w.nameEn.toLowerCase();
          const balStr = w.balance.toString();
          return name.includes(q) || nameEn.includes(q) || balStr.includes(cleanNumbersOnly);
        });

    // 4. Categories search
    const allCategories = !q
      ? categories.slice(0, 6)
      : categories.filter((c) => {
          const name = c.name.toLowerCase();
          const nameEn = c.nameEn.toLowerCase();
          const subMatch = (c.subCategories || []).some(
            (s) => s.name.toLowerCase().includes(q) || s.nameEn.toLowerCase().includes(q)
          );
          return name.includes(q) || nameEn.includes(q) || subMatch;
        });

    // 5. Shops search (E17)
    const allShops = !q
      ? shops.slice(0, 4)
      : shops.filter((s) => {
          const hay = [
            s.name, s.nameEn || '', s.phone, ...(s.phones || []),
            s.address || '', ...(s.addresses || []),
            s.township || '', s.city || '', s.note || '', s.subCategory || '',
          ].join(' ').toLowerCase();
          return hay.includes(q);
        });

    // 6. Vehicles search (E17)
    const allVehicles = !q
      ? vehicles.slice(0, 4)
      : vehicles.filter((v) => {
          const hay = [v.name, v.plateNumber, v.fuelType, v.type, v.notes || ''].join(' ').toLowerCase();
          return hay.includes(q);
        });

    const CAPS: Record<string, number> = {
      transactions: 15, debts: 10, categories: 8, shops: 8, vehicles: 8,
    };
    const cap = (key: string, list: any[]) =>
      expanded[key] ? list : list.slice(0, CAPS[key] ?? list.length);

    return {
      transactions: cap('transactions', allTransactions),
      debts: cap('debts', allDebts),
      wallets: allWallets,
      categories: cap('categories', allCategories),
      shops: cap('shops', allShops),
      vehicles: cap('vehicles', allVehicles),
      totals: {
        transactions: allTransactions.length,
        debts: allDebts.length,
        wallets: allWallets.length,
        categories: allCategories.length,
        shops: allShops.length,
        vehicles: allVehicles.length,
      },
      // [v7.5.55 E17] Footer counts ALL matches, not the capped slices.
      totalMatches:
        allTransactions.length + allDebts.length + allWallets.length +
        allCategories.length + allShops.length + allVehicles.length,
    };
  }, [query, transactions, debts, wallets, categories, shops, vehicles, catMap, walletMap, subCatMap, expanded]);

  // Reset keyboard position when the result set changes.
  useEffect(() => { setActiveIdx(-1); }, [query, activeFilter]);

  if (!isOpen) return null;

  // [v7.5.55 E15] Seed the destination list's search box with the query.
  // TransactionsView / ShopsView / CategoriesView consume it via the
  // useSearchSeed hook (debts, wallets and vehicles have no search box —
  // their rows open the record itself instead).
  const seedQuery = (tab: string) => {
    try {
      sessionStorage.setItem('ngwe_search_seed', query.trim());
      window.dispatchEvent(new CustomEvent('ngwe:search-seed', { detail: { tab, query: query.trim() } }));
    } catch { /* ignore */ }
  };
  const goToTab = (tab: string) => {
    seedQuery(tab);
    onNavigateToTab(tab);
    onClose();
  };

  // [v7.5.55 E25] Flat keyboard-navigable list of the visible rows,
  // in render order. Arrow keys move, Enter activates.
  const flatItems: { key: string; run: () => void }[] = [];
  const pushFlat = (key: string, run: () => void) => { flatItems.push({ key, run }); };
  const flatIndexOf = (key: string) => flatItems.findIndex((f) => f.key === key);
  const handleListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIdx >= 0 && flatItems[activeIdx]) {
      e.preventDefault();
      flatItems[activeIdx].run();
    }
  };
  const rowCls = (key: string) =>
    flatIndexOf(key) === activeIdx ? ' ring-2 ring-indigo-500 bg-indigo-50/60' : '';
  const showMoreBtn = (key: string, total: number, shown: number) =>
    total > shown ? (
      <button
        type="button"
        onClick={() => setExpanded((e) => ({ ...e, [key]: true }))}
        className="w-full py-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50/60 rounded-b-xl cursor-pointer"
      >
        {lang === 'my'
          ? `နောက်ထပ် ${total - shown} ခု ပြမည် (စုစုပေါင်း ${total} ခု)`
          : `Show ${total - shown} more (${total} total)`}
      </button>
    ) : null;

  const popularSearches = [
    { label: 'လစာ (Salary)', query: 'လစာ' },
    { label: 'KPay', query: 'kpay' },
    { label: 'အကြွေး (Debts)', query: 'အကြွေး' },
    { label: 'အစားအသောက် (Food)', query: 'အစား' },
    { label: 'ဈေးဖိုး', query: 'ဈေး' },
    { label: 'ဆေးဖိုး', query: 'ဆေး' },
  ];

  const filterBtn = (key: SearchCategory, label: string, count?: number) => (
    <button
      key={key}
      onClick={() => setActiveFilter(key)}
      className={`px-2.5 sm:px-3 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer active:scale-95 ${
        activeFilter === key ? 'bg-slate-900 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      <span>{label}</span>
      {typeof count === 'number' && (
        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/70 text-slate-700 font-bold">{count}</span>
      )}
    </button>
  );

  return (
    <div
      id="global-search-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-start justify-center p-3 sm:p-6 pt-12 sm:pt-16 overflow-y-auto overflow-x-hidden animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={handleListKeyDown}
    >
      <div
        id="global-search-modal-container"
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] transition-all"
      >
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              lang === 'my'
                ? 'သိလိုတာ ရှာဖွေပါ (မှတ်တမ်း၊ အကြွေး၊ လူအမည်၊ ပမာဏ၊ ပိုက်ဆံအိတ်၊ ဆိုင်၊ ယာဉ်)...'
                : 'Search transactions, debts, person names, amounts, wallets, shops, vehicles...'
            }
            className="w-full bg-transparent text-slate-900 placeholder:text-slate-400 text-sm sm:text-base font-medium focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-xs font-semibold px-2 py-1 rounded bg-slate-200/80 text-slate-600 hover:bg-slate-300 shrink-0"
          >
            ESC
          </button>
        </div>

        {/* Filter Tabs - Responsive Wrap (No horizontal scroll) */}
        <div className="px-3 sm:px-4 py-2 border-b border-slate-100 flex flex-wrap items-center gap-1 sm:gap-1.5 text-xs font-medium bg-white">
          {filterBtn('all', lang === 'my' ? 'အားလုံး' : 'All')}
          {filterBtn('transactions', lang === 'my' ? 'ငွေစာရင်းများ' : 'Transactions', results.totals.transactions)}
          {filterBtn('debts', lang === 'my' ? 'အကြွေးစာရင်း' : 'Debts', results.totals.debts)}
          {filterBtn('wallets', lang === 'my' ? 'ပိုက်ဆံအိတ်များ' : 'Wallets', results.totals.wallets)}
          {filterBtn('categories', lang === 'my' ? 'ကဏ္ဍများ' : 'Categories', results.totals.categories)}
          {filterBtn('shops', lang === 'my' ? 'ဆိုင်များ' : 'Shops', results.totals.shops)}
          {filterBtn('vehicles', lang === 'my' ? 'ယာဉ်များ' : 'Vehicles', results.totals.vehicles)}
        </div>

        {/* Popular searches suggestions (shown when query is empty) */}
        {!query && (
          <div className="p-4 bg-slate-50/50 border-b border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              {lang === 'my' ? 'အမြန်ရှာဖွေရန် အကြံပြုချက်များ' : 'Quick Suggestions'}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {popularSearches.map((item) => (
                <button
                  key={item.label}
                  onClick={() => setQuery(item.query)}
                  className="px-2.5 py-1 rounded-md text-xs bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium transition-colors shadow-2xs"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results Scroll Area */}
        <div className="p-4 overflow-y-auto overflow-x-hidden space-y-6 flex-1">
          {/* Empty Results state */}
          {results.totalMatches === 0 && query && (
            <div className="text-center py-10 text-slate-500 space-y-2">
              <Search className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-700 break-words">
                {lang === 'my' ? `"${query}" နှင့် ပတ်သက်သော စာရင်း ရှာမတွေ့ပါ` : `No matches found for "${query}"`}
              </p>
              <p className="text-xs text-slate-400">
                {lang === 'my'
                  ? 'အခြား စကားလုံး၊ ပမာဏ (သို့) လူအမည်ဖြင့် ပြန်လည်ရှာဖွေကြည့်ပါ'
                  : 'Try searching with a different keyword, category, or amount'}
              </p>
            </div>
          )}

          {/* Section 1: Transactions */}
          {(activeFilter === 'all' || activeFilter === 'transactions') && results.transactions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                  {/* [v7.5.60 N4] With no query yet these 5 are the most
                      recent records, not search results — label them so. */}
                  {!query.trim()
                    ? (lang === 'my' ? 'မကြာသေးမီ မှတ်တမ်းများ' : 'Recent Transactions')
                    : (lang === 'my' ? 'ဝင်ငွေ/ထွက်ငွေ စာရင်းများ' : 'Transactions')} ({results.totals.transactions})
                </span>
                <button
                  onClick={() => goToTab('transactions')}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 shrink-0"
                >
                  {lang === 'my' ? 'စာရင်း အကုန်ကြည့်မည်' : 'View All'}
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                {results.transactions.map((t) => {
                  const cat = catMap.get(t.category);
                  const subCat = t.subCategoryId ? subCatMap.get(t.subCategoryId) : undefined;
                  const wallet = walletMap.get(t.walletId);
                  const isIncome = t.type === 'income';
                  const key = `tx:${t.id}`;
                  const open = () => {
                    if (onSelectTransaction) { onSelectTransaction(t); onClose(); }
                    else goToTab('transactions');
                  };
                  pushFlat(key, open);

                  return (
                    <div
                      key={t.id}
                      onClick={open}
                      className={`p-3 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 cursor-pointer group${rowCls(key)}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            isIncome ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                          }`}
                        >
                          <CategoryIcon iconName={cat?.icon || 'Tag'} className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-xs sm:text-sm text-slate-900 truncate">
                              {lang === 'my' ? cat?.name : cat?.nameEn || t.category}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200/80">
                              <Wallet className="w-2.5 h-2.5 text-indigo-600" />
                              <span>{lang === 'my' ? wallet?.name : wallet?.nameEn}</span>
                            </span>
                            {subCat && (
                              <span className="text-[11px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                                {lang === 'my' ? subCat.name : subCat.nameEn}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 truncate flex items-center gap-2 mt-0.5">
                            {t.note && <span className="font-normal text-slate-700">"{t.note}"</span>}
                            <span>• {t.date}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div
                          className={`font-bold text-xs sm:text-sm tracking-tight ${
                            isIncome ? 'text-emerald-600' : 'text-slate-900'
                          }`}
                        >
                          {isIncome ? '+' : '-'}
                          {formatMMK(t.amount)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {showMoreBtn('transactions', results.totals.transactions, results.transactions.length)}
              </div>
            </div>
          )}

          {/* Section 2: Debts */}
          {(activeFilter === 'all' || activeFilter === 'debts') && results.debts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <HandCoins className="w-3.5 h-3.5 text-amber-600" />
                  {lang === 'my' ? 'အကြွေးစာရင်းများ (ရရန်/ပေးရန်)' : 'Debts & Loans'} ({results.totals.debts})
                </span>
                <button
                  onClick={() => goToTab('debts')}
                  className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-0.5 shrink-0"
                >
                  {lang === 'my' ? 'အကြွေး အကုန်ကြည့်မည်' : 'View All'}
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                {results.debts.map((d) => {
                  const remaining = d.totalAmount - d.paidAmount;
                  const isReceivable = d.type === 'receivable';
                  const key = `debt:${d.id}`;
                  const open = () => {
                    if (onSelectDebtForRepayment) onSelectDebtForRepayment(d);
                    goToTab('debts');
                  };
                  pushFlat(key, open);

                  return (
                    <div
                      key={d.id}
                      onClick={open}
                      className={`p-3 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 cursor-pointer group${rowCls(key)}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            isReceivable ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                          }`}
                        >
                          <HandCoins className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                              {d.personName}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                isReceivable
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {isReceivable
                                ? lang === 'my'
                                  ? 'ရရန်ရှိ'
                                  : 'Receivable'
                                : lang === 'my'
                                ? 'ပေးရန်ရှိ'
                                : 'Payable'}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 truncate flex items-center gap-2 mt-0.5">
                            {d.phone && <span>📞 {d.phone}</span>}
                            {d.note && <span>• {d.note}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-bold text-xs sm:text-sm text-slate-900 tracking-tight">
                          {formatMMK(remaining)}
                        </div>
                        <span className="text-[10px] text-slate-400 block">
                          {lang === 'my' ? 'ကျန်ငွေ' : 'Remaining'}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {showMoreBtn('debts', results.totals.debts, results.debts.length)}
              </div>
            </div>
          )}

          {/* Section 3: Wallets */}
          {(activeFilter === 'all' || activeFilter === 'wallets') && results.wallets.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-blue-600" />
                {lang === 'my' ? 'ပိုက်ဆံအိတ်များ' : 'Wallets'} ({results.totals.wallets})
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {results.wallets.map((w) => {
                  const key = `wallet:${w.id}`;
                  const open = () => {
                    if (onSelectWallet) { onSelectWallet(w); onClose(); }
                    else goToTab('wallets');
                  };
                  pushFlat(key, open);
                  return (
                    <div
                      key={w.id}
                      onClick={open}
                      className={`p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors flex items-center justify-between cursor-pointer shadow-2xs${rowCls(key)}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ backgroundColor: w.color || '#10b981' }}
                        >
                          <Wallet className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-xs sm:text-sm text-slate-900 block truncate">
                            {lang === 'my' ? w.name : w.nameEn}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {w.isDefault ? (lang === 'my' ? 'မူလပိုက်ဆံအိတ်' : 'Default') : ''}
                          </span>
                        </div>
                      </div>
                      <div className="font-bold text-xs sm:text-sm text-slate-900 tracking-tight shrink-0">
                        {formatMMK(w.balance)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 4: Categories */}
          {(activeFilter === 'all' || activeFilter === 'categories') && results.categories.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                {lang === 'my' ? 'ကဏ္ဍများနှင့် ကဏ္ဍခွဲများ' : 'Categories & Sub-Categories'} ({results.totals.categories})
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {results.categories.map((c) => {
                  const key = `cat:${c.id}`;
                  const open = () => {
                    if (onSelectCategory) { onSelectCategory(c); onClose(); }
                    else goToTab('categories');
                  };
                  pushFlat(key, open);
                  return (
                    <div
                      key={c.id}
                      onClick={open}
                      className={`p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer${rowCls(key)}`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-md flex items-center justify-center text-white shrink-0"
                          style={{ backgroundColor: c.color }}
                        >
                          <CategoryIcon iconName={c.icon} className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-semibold text-xs text-slate-800 truncate">
                          {lang === 'my' ? c.name : c.nameEn}
                        </span>
                      </div>
                      {c.subCategories && c.subCategories.length > 0 && (
                        <div className="text-[10px] text-slate-500 mt-1 truncate">
                          {c.subCategories.length} {lang === 'my' ? 'ကဏ္ဍခွဲ' : 'sub-categories'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {showMoreBtn('categories', results.totals.categories, results.categories.length)}
            </div>
          )}

          {/* Section 5: Shops (E17) */}
          {(activeFilter === 'all' || activeFilter === 'shops') && results.shops.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-teal-600" />
                  {lang === 'my' ? 'ဆိုင်များ' : 'Shops'} ({results.totals.shops})
                </span>
                <button
                  onClick={() => goToTab('shops')}
                  className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-0.5 shrink-0"
                >
                  {lang === 'my' ? 'ဆိုင်အကုန်ကြည့်မည်' : 'View All'}
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                {results.shops.map((s) => {
                  const key = `shop:${s.id}`;
                  const open = () => {
                    if (onSelectShop) { onSelectShop(s); onClose(); }
                    else goToTab('shops');
                  };
                  pushFlat(key, open);
                  return (
                    <div
                      key={s.id}
                      onClick={open}
                      className={`p-3 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 cursor-pointer${rowCls(key)}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                          <Store className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-xs sm:text-sm text-slate-900 truncate block">{s.name}</span>
                          <span className="text-xs text-slate-500 truncate block">
                            {[s.township, s.city].filter(Boolean).join(' • ')}{s.phone ? ` • 📞 ${s.phone}` : ''}
                          </span>
                        </div>
                      </div>
                      {s.note && <span className="text-[11px] text-slate-400 truncate max-w-[120px]">{s.note}</span>}
                    </div>
                  );
                })}
                {showMoreBtn('shops', results.totals.shops, results.shops.length)}
              </div>
            </div>
          )}

          {/* Section 6: Vehicles (E17) */}
          {(activeFilter === 'all' || activeFilter === 'vehicles') && results.vehicles.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-sky-600" />
                  {lang === 'my' ? 'ယာဉ်များ' : 'Vehicles'} ({results.totals.vehicles})
                </span>
                <button
                  onClick={() => goToTab('vehicles')}
                  className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-0.5 shrink-0"
                >
                  {lang === 'my' ? 'ယာဉ်အကုန်ကြည့်မည်' : 'View All'}
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                {results.vehicles.map((v) => {
                  const key = `veh:${v.id}`;
                  const open = () => {
                    if (onSelectVehicle) { onSelectVehicle(v); onClose(); }
                    else goToTab('vehicles');
                  };
                  pushFlat(key, open);
                  return (
                    <div
                      key={v.id}
                      onClick={open}
                      className={`p-3 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 cursor-pointer${rowCls(key)}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                          <Car className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-xs sm:text-sm text-slate-900 truncate block">{v.name}</span>
                          <span className="text-xs text-slate-500 truncate block">
                            {v.plateNumber}{v.type ? ` • ${v.type}` : ''}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-slate-700 shrink-0">
                        {v.currentOdometer.toLocaleString()} {v.odometerUnit || 'km'}
                      </span>
                    </div>
                  );
                })}
                {showMoreBtn('vehicles', results.totals.vehicles, results.vehicles.length)}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 text-xs text-slate-500">
          <span className="shrink-0">
            {lang === 'my'
              ? `ရှာဖွေမှုရလဒ် စုစုပေါင်း ${results.totalMatches} ခု`
              : `${results.totalMatches} matches found`}
          </span>
          <span className="text-[11px] text-slate-400 min-w-0 truncate">
            {lang === 'my' ? '↑↓ ရွေးမည် • Enter ဖွင့်မည် • ESC ပိတ်မည်' : '↑↓ to move • Enter to open • ESC to close'}
          </span>
        </div>
      </div>
    </div>
  );
};
