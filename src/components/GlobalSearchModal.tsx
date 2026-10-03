import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  X,
  ArrowDownLeft,
  ArrowUpRight,
  HandCoins,
  Wallet,
  Tag,
  Calendar,
  Layers,
  ChevronRight,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Category, Debt, Transaction, Wallet as WalletType } from '../types';
import { formatMMK, formatDateDisplay, getCategoryDisplayName } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';
import { buildWalletMap } from '../utils/walletBalance';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  debts: Debt[];
  wallets: WalletType[];
  categories: Category[];
  lang: 'my' | 'en';
  onNavigateToTab: (tab: string) => void;
  onSelectDebtForRepayment?: (debt: Debt) => void;
}

type SearchCategory = 'all' | 'transactions' | 'debts' | 'wallets' | 'categories';

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  transactions,
  debts,
  wallets,
  categories,
  lang,
  onNavigateToTab,
  onSelectDebtForRepayment,
}) => {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<SearchCategory>('all');
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

  // Search Results computation
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const cleanNumbersOnly = q.replace(/,/g, '');

    // 1. Transactions search
    const matchedTransactions = (!q
      ? transactions.slice(0, 5)
      : transactions.filter((t) => {
          const cat = catMap.get(t.category);
          const catName = (cat?.name || '').toLowerCase();
          const catNameEn = (cat?.nameEn || '').toLowerCase();
          const subCat = t.subCategoryId ? subCatMap.get(t.subCategoryId) : undefined;
          const subName = (subCat?.name || '').toLowerCase();
          const subNameEn = (subCat?.nameEn || '').toLowerCase();
          const note = (t.note || '').toLowerCase();
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
            walletName.includes(q) ||
            walletNameEn.includes(q) ||
            amtStr.includes(cleanNumbersOnly) ||
            dateStr.includes(q)
          );
        })
    ).slice(0, 15);

    // 2. Debts search
    const matchedDebts = (!q
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
        })
    ).slice(0, 10);

    // 3. Wallets search
    const matchedWallets = (!q
      ? wallets
      : wallets.filter((w) => {
          const name = w.name.toLowerCase();
          const nameEn = w.nameEn.toLowerCase();
          const balStr = w.balance.toString();
          return name.includes(q) || nameEn.includes(q) || balStr.includes(cleanNumbersOnly);
        })
    );

    // 4. Categories search
    const matchedCategories = (!q
      ? categories.slice(0, 6)
      : categories.filter((c) => {
          const name = c.name.toLowerCase();
          const nameEn = c.nameEn.toLowerCase();
          const subMatch = (c.subCategories || []).some(
            (s) => s.name.toLowerCase().includes(q) || s.nameEn.toLowerCase().includes(q)
          );
          return name.includes(q) || nameEn.includes(q) || subMatch;
        })
    ).slice(0, 8);

    return {
      transactions: matchedTransactions,
      debts: matchedDebts,
      wallets: matchedWallets,
      categories: matchedCategories,
      totalMatches:
        matchedTransactions.length +
        matchedDebts.length +
        matchedWallets.length +
        matchedCategories.length,
    };
  }, [query, transactions, debts, wallets, categories, catMap, walletMap, subCatMap]);

  if (!isOpen) return null;

  const popularSearches = [
    { label: 'လစာ (Salary)', query: 'လစာ' },
    { label: 'KPay', query: 'kpay' },
    { label: 'အကြွေး (Debts)', query: 'အကြွေး' },
    { label: 'အစားအသောက် (Food)', query: 'အစား' },
    { label: 'ဈေးဖိုး', query: 'ဈေး' },
    { label: 'ဆေးဖိုး', query: 'ဆေး' },
  ];

  return (
    <div
      id="global-search-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-start justify-center p-3 sm:p-6 pt-12 sm:pt-16 overflow-y-auto animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
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
                ? 'သိလိုတာ ရှာဖွေပါ (မှတ်တမ်း၊ အကြွေး၊ လူအမည်၊ ပမာဏ၊ ပိုက်ဆံအိတ်)...'
                : 'Search transactions, debts, person names, amounts, wallets...'
            }
            className="w-full bg-transparent text-slate-900 placeholder:text-slate-400 text-sm sm:text-base font-medium focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-xs font-semibold px-2 py-1 rounded bg-slate-200/80 text-slate-600 hover:bg-slate-300"
          >
            ESC
          </button>
        </div>

        {/* Filter Tabs - Responsive Wrap (No horizontal scroll) */}
        <div className="px-3 sm:px-4 py-2 border-b border-slate-100 flex flex-wrap items-center gap-1 sm:gap-1.5 text-xs font-medium bg-white">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-2.5 sm:px-3 py-1 rounded-lg transition-colors cursor-pointer active:scale-95 ${
              activeFilter === 'all'
                ? 'bg-slate-900 text-white font-semibold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {lang === 'my' ? 'အားလုံး' : 'All'}
          </button>
          <button
            onClick={() => setActiveFilter('transactions')}
            className={`px-2.5 sm:px-3 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer active:scale-95 ${
              activeFilter === 'transactions'
                ? 'bg-slate-900 text-white font-semibold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>{lang === 'my' ? 'ငွေစာရင်းများ' : 'Transactions'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/70 text-slate-700 font-bold">
              {results.transactions.length}
            </span>
          </button>
          <button
            onClick={() => setActiveFilter('debts')}
            className={`px-2.5 sm:px-3 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer active:scale-95 ${
              activeFilter === 'debts'
                ? 'bg-slate-900 text-white font-semibold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>{lang === 'my' ? 'အကြွေးစာရင်း' : 'Debts'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/70 text-slate-700 font-bold">
              {results.debts.length}
            </span>
          </button>
          <button
            onClick={() => setActiveFilter('wallets')}
            className={`px-2.5 sm:px-3 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer active:scale-95 ${
              activeFilter === 'wallets'
                ? 'bg-slate-900 text-white font-semibold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>{lang === 'my' ? 'ပိုက်ဆံအိတ်များ' : 'Wallets'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/70 text-slate-700 font-bold">
              {results.wallets.length}
            </span>
          </button>
          <button
            onClick={() => setActiveFilter('categories')}
            className={`px-2.5 sm:px-3 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer active:scale-95 ${
              activeFilter === 'categories'
                ? 'bg-slate-900 text-white font-semibold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>{lang === 'my' ? 'ကဏ္ဍများ' : 'Categories'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/70 text-slate-700 font-bold">
              {results.categories.length}
            </span>
          </button>
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
        <div className="p-4 overflow-y-auto space-y-6 flex-1">
          {/* Empty Results state */}
          {results.totalMatches === 0 && query && (
            <div className="text-center py-10 text-slate-500 space-y-2">
              <Search className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">
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
                  {lang === 'my' ? 'ဝင်ငွေ/ထွက်ငွေ စာရင်းများ' : 'Transactions'} ({results.transactions.length})
                </span>
                <button
                  onClick={() => {
                    onNavigateToTab('transactions');
                    onClose();
                  }}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
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

                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        onNavigateToTab('transactions');
                        onClose();
                      }}
                      className="p-3 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
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
              </div>
            </div>
          )}

          {/* Section 2: Debts */}
          {(activeFilter === 'all' || activeFilter === 'debts') && results.debts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <HandCoins className="w-3.5 h-3.5 text-amber-600" />
                  {lang === 'my' ? 'အကြွေးစာရင်းများ (ရရန်/ပေးရန်)' : 'Debts & Loans'} ({results.debts.length})
                </span>
                <button
                  onClick={() => {
                    onNavigateToTab('debts');
                    onClose();
                  }}
                  className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-0.5"
                >
                  {lang === 'my' ? 'အကြွေး အကုန်ကြည့်မည်' : 'View All'}
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                {results.debts.map((d) => {
                  const remaining = d.totalAmount - d.paidAmount;
                  const isReceivable = d.type === 'receivable';

                  return (
                    <div
                      key={d.id}
                      onClick={() => {
                        if (onSelectDebtForRepayment) {
                          onSelectDebtForRepayment(d);
                        }
                        onNavigateToTab('debts');
                        onClose();
                      }}
                      className="p-3 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
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
              </div>
            </div>
          )}

          {/* Section 3: Wallets */}
          {(activeFilter === 'all' || activeFilter === 'wallets') && results.wallets.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-blue-600" />
                {lang === 'my' ? 'ပိုက်ဆံအိတ်များ' : 'Wallets'} ({results.wallets.length})
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {results.wallets.map((w) => (
                  <div
                    key={w.id}
                    onClick={() => {
                      onNavigateToTab('wallets');
                      onClose();
                    }}
                    className="p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors flex items-center justify-between cursor-pointer shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: w.color || '#10b981' }}
                      >
                        <Wallet className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-xs sm:text-sm text-slate-900 block">
                          {lang === 'my' ? w.name : w.nameEn}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {w.isDefault ? (lang === 'my' ? 'မူလပိုက်ဆံအိတ်' : 'Default') : ''}
                        </span>
                      </div>
                    </div>
                    <div className="font-bold text-xs sm:text-sm text-slate-900 tracking-tight">
                      {formatMMK(w.balance)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 4: Categories */}
          {(activeFilter === 'all' || activeFilter === 'categories') && results.categories.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                {lang === 'my' ? 'ကဏ္ဍများနှင့် ကဏ္ဍခွဲများ' : 'Categories & Sub-Categories'}
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {results.categories.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      onNavigateToTab('categories');
                      onClose();
                    }}
                    className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
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
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            {lang === 'my'
              ? `ရှာဖွေမှုရလဒ် စုစုပေါင်း ${results.totalMatches} ခု`
              : `${results.totalMatches} matches found`}
          </span>
          <span className="text-[11px] text-slate-400">
            {lang === 'my' ? 'ESC နှိပ်၍ ပိတ်ပါ' : 'Press ESC to close'}
          </span>
        </div>
      </div>
    </div>
  );
};
