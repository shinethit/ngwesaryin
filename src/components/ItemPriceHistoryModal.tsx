import React, { useState, useMemo } from 'react';
import {
  History,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  Calendar,
  Wallet,
  Tag,
  ArrowRight,
  Sparkles,
  Info,
  X,
  Plus,
} from 'lucide-react';
import { Category, Transaction, Wallet as WalletType } from '../types';
import { formatMMK } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';
import { buildWalletMap } from '../utils/walletBalance';

interface PriceRecord {
  id: string;
  date: string;
  amount: number;
  quantity?: number;
  walletId: string;
  categoryId: string;
  subCategoryId?: string;
  note?: string;
  isShoppingItem?: boolean;
}

interface ItemPriceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  categories: Category[];
  wallets: WalletType[];
  lang: 'my' | 'en';
  onSelectSubCategory?: (subCatId: string, suggestedAmount?: number) => void;
}

export const ItemPriceHistoryModal: React.FC<ItemPriceHistoryModalProps> = ({
  isOpen,
  onClose,
  transactions,
  categories,
  wallets,
  lang,
  onSelectSubCategory,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCatFilter, setSelectedCatFilter] = useState<string>('all');

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const walletMap = useMemo(() => buildWalletMap(wallets), [wallets]);

  // Build a map of all subcategories with their parent category
  const subCategoryList = useMemo(() => {
    const list: { id: string; name: string; nameEn: string; categoryId: string }[] = [];
    categories.forEach((cat) => {
      if (cat.subCategories) {
        cat.subCategories.forEach((sub) => {
          list.push({
            id: sub.id,
            name: sub.name,
            nameEn: sub.nameEn,
            categoryId: cat.id,
          });
        });
      }
    });
    return list;
  }, [categories]);

  // Group all expense transactions and shopping items by item
  const itemHistories = useMemo(() => {
    const expenseTxs = transactions
      .filter((t) => t.type === 'expense')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Map by key: subCategoryId, lowercased item name (from shopping lists), or note
    const grouped = new Map<
      string,
      {
        key: string;
        displayName: string;
        displayNameEn: string;
        categoryId: string;
        subCategoryId?: string;
        isShoppingItem?: boolean;
        records: PriceRecord[];
      }
    >();

    expenseTxs.forEach((tx) => {
      // 1. Process individual shopping list items if available
      if (tx.items && tx.items.length > 0) {
        tx.items.forEach((item) => {
          if (item.name && item.name.trim().length >= 1) {
            const cleanName = item.name.trim().toLowerCase();
            const key = `shop_${cleanName}`;
            const unitPrice =
              item.price > 0
                ? item.price
                : item.quantity > 0 && item.amount
                ? item.amount / item.quantity
                : item.amount || 0;

            if (unitPrice > 0) {
              if (!grouped.has(key)) {
                grouped.set(key, {
                  key,
                  displayName: item.name.trim(),
                  displayNameEn: item.name.trim(),
                  categoryId: tx.category,
                  subCategoryId: tx.subCategoryId,
                  isShoppingItem: true,
                  records: [],
                });
              }
              grouped.get(key)!.records.push({
                id: `${tx.id}_${item.id || item.name}`,
                date: tx.date,
                amount: unitPrice,
                quantity: item.quantity,
                walletId: tx.walletId,
                categoryId: tx.category,
                subCategoryId: tx.subCategoryId,
                note: item.quantity && item.quantity > 1 ? `x${item.quantity} ခု (စုစုပေါင်း ${formatMMK(item.amount || unitPrice * item.quantity)})` : undefined,
                isShoppingItem: true,
              });
            }
          }
        });
      }

      // 2. Process subcategories for direct expenses (without shopping list items)
      if ((!tx.items || tx.items.length === 0) && tx.subCategoryId) {
        const sub = subCategoryList.find((s) => s.id === tx.subCategoryId);
        if (sub) {
          const key = `sub_${sub.id}`;
          if (!grouped.has(key)) {
            grouped.set(key, {
              key,
              displayName: sub.name,
              displayNameEn: sub.nameEn,
              categoryId: sub.categoryId,
              subCategoryId: sub.id,
              records: [],
            });
          }
          grouped.get(key)!.records.push({
            id: tx.id,
            date: tx.date,
            amount: tx.amount,
            walletId: tx.walletId,
            categoryId: tx.category,
            subCategoryId: tx.subCategoryId,
            note: tx.note,
          });
        }
      } else if ((!tx.items || tx.items.length === 0) && tx.note && tx.note.trim().length >= 1) {
        // 3. Process note if no items and no subcategory
        const cleanNote = tx.note.trim().toLowerCase();
        const key = `note_${cleanNote}`;
        if (!grouped.has(key)) {
          grouped.set(key, {
            key,
            displayName: tx.note.trim(),
            displayNameEn: tx.note.trim(),
            categoryId: tx.category,
            records: [],
          });
        }
        grouped.get(key)!.records.push({
          id: tx.id,
          date: tx.date,
          amount: tx.amount,
          walletId: tx.walletId,
          categoryId: tx.category,
          note: tx.note,
        });
      }
    });

    // Only include items with at least 1 record
    const results = Array.from(grouped.values()).map((item) => {
      // Sort records chronological ascending for delta computation
      const sortedRecords = [...item.records].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      const latest = sortedRecords[sortedRecords.length - 1];
      const previous = sortedRecords.length > 1 ? sortedRecords[sortedRecords.length - 2] : null;

      let priceChange = 0;
      let priceChangePercent = 0;
      let trend: 'up' | 'down' | 'same' | 'initial' = 'initial';

      if (previous) {
        priceChange = latest.amount - previous.amount;
        priceChangePercent = previous.amount > 0 ? (priceChange / previous.amount) * 100 : 0;
        if (priceChange > 0) trend = 'up';
        else if (priceChange < 0) trend = 'down';
        else trend = 'same';
      }

      return {
        ...item,
        latest,
        previous,
        priceChange,
        priceChangePercent,
        trend,
        totalPurchases: sortedRecords.length,
      };
    });

    // Sort by latest purchase date (newest first)
    return results.sort(
      (a, b) => new Date(b.latest.date).getTime() - new Date(a.latest.date).getTime()
    );
  }, [transactions, categories, subCategoryList]);

  // Filter items based on search and category
  const filteredItems = useMemo(() => {
    return itemHistories.filter((item) => {
      if (selectedCatFilter !== 'all' && item.categoryId !== selectedCatFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName =
          item.displayName.toLowerCase().includes(q) ||
          item.displayNameEn.toLowerCase().includes(q);
        const cat = catMap.get(item.categoryId);
        const matchCat =
          (cat?.name || '').toLowerCase().includes(q) ||
          (cat?.nameEn || '').toLowerCase().includes(q);
        return matchName || matchCat;
      }
      return true;
    });
  }, [itemHistories, searchTerm, selectedCatFilter, catMap]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl border border-slate-200/80 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 sm:px-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 text-emerald-400 flex items-center justify-center border border-white/10">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base sm:text-lg text-white">
                  {lang === 'my' ? 'ပစ္စည်းများ၏ ယခင်ဝယ်ဈေးနှင့် ဈေးနှုန်းပြောင်းလဲမှု' : 'Item Price History & Trends'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  {lang === 'my' ? 'ဈေးနှုန်း စိစစ်ချက်' : 'Price Tracker'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {lang === 'my'
                  ? 'အရင်ဝယ်ခဲ့သည့် ရက်စွဲ၊ ဈေးနှုန်းများနှင့် ဈေးတက်/ကျ နှိုင်းယှဉ်ချက်များကို ကြည့်ရှုပါ'
                  : 'Compare past purchase dates, rates, and see if items are getting more or less expensive'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-300 hover:text-white hover:bg-white/10 flex items-center justify-center font-bold transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Category Filter bar */}
        <div className="p-4 sm:px-6 bg-slate-50/80 border-b border-slate-200/80 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={
                lang === 'my'
                  ? 'ပစ္စည်း သို့မဟုတ် ကဏ္ဍခွဲ အမည်ဖြင့် ရှာရန်...'
                  : 'Search by item name or category...'
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedCatFilter}
              onChange={(e) => setSelectedCatFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs w-full sm:w-auto"
            >
              <option value="all">
                {lang === 'my' ? 'ကဏ္ဍ အားလုံး' : 'All Categories'}
              </option>
              {categories
                .filter((c) => c.type === 'expense')
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {lang === 'my' ? c.name : c.nameEn}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Content list */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3 divide-y divide-slate-100">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <History className="w-10 h-10 mx-auto text-slate-300 opacity-60" />
              <p className="text-sm font-semibold text-slate-600">
                {lang === 'my' ? 'ပစ္စည်းဝယ်ယူမှု မှတ်တမ်း မတွေ့ပါ' : 'No item purchase histories found.'}
              </p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {lang === 'my'
                  ? 'ငွေထွက်စာရင်း သွင်းသည့်အခါ ကဏ္ဍခွဲ (Sub-Category) သို့မဟုတ် မှတ်ချက် (Note) တွင် ပစ္စည်းအမည် ထည့်သွင်းထားပါက ဈေးနှုန်းပြောင်းလဲမှုများကို ဤနေရာတွင် စနစ်တကျ တွေ့မြင်ရမည်ဖြစ်ပါသည်။'
                  : 'Record expenses with Sub-Categories or item notes to automatically track price changes over time.'}
              </p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const cat = catMap.get(item.categoryId);
              const latestWallet = walletMap.get(item.latest.walletId);
              const prevWallet = item.previous ? walletMap.get(item.previous.walletId) : null;

              return (
                <div key={item.key} className="pt-3 first:pt-0 pb-1">
                  <div className="bg-white hover:bg-slate-50/60 p-4 rounded-2xl border border-slate-200/80 transition-all shadow-2xs space-y-3">
                    {/* Top Row: Item name, Category, Trend Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs"
                          style={{ backgroundColor: cat?.color || '#EF4444' }}
                        >
                          <CategoryIcon name={cat?.icon || 'Tag'} className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm sm:text-base text-slate-900">
                              {lang === 'my' ? item.displayName : item.displayNameEn}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold border border-slate-200">
                              {lang === 'my' ? cat?.name : cat?.nameEn}
                            </span>
                            {item.isShoppingItem && (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-bold border border-amber-200">
                                🛒 {lang === 'my' ? 'Shopping List' : 'Shopping List'}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400">
                            {lang === 'my'
                              ? `ဝယ်ယူမှု စုစုပေါင်း: ${item.totalPurchases} ကြိမ်`
                              : `${item.totalPurchases} purchase(s) recorded`}
                          </span>
                        </div>
                      </div>

                      {/* Trend Badge */}
                      <div className="shrink-0">
                        {item.trend === 'up' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <TrendingUp className="w-3.5 h-3.5 text-rose-600" />
                            <span>
                              {lang === 'my' ? 'ဈေးတက် +' : 'Price Up +'}
                              {formatMMK(Math.abs(item.priceChange))} (
                              {Math.abs(Math.round(item.priceChangePercent))}%)
                            </span>
                          </span>
                        )}
                        {item.trend === 'down' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
                            <span>
                              {lang === 'my' ? 'ဈေးကျ -' : 'Price Down -'}
                              {formatMMK(Math.abs(item.priceChange))} (
                              {Math.abs(Math.round(item.priceChangePercent))}%)
                            </span>
                          </span>
                        )}
                        {item.trend === 'same' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            <Minus className="w-3.5 h-3.5 text-slate-500" />
                            <span>{lang === 'my' ? 'ဈေးနှုန်း တူညီ' : 'Same Price'}</span>
                          </span>
                        )}
                        {item.trend === 'initial' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            <span>{lang === 'my' ? 'ပထမအကြိမ်' : 'First record'}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle Row: Comparison Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {/* Latest Purchase */}
                      <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/90 text-xs space-y-1">
                        <div className="flex items-center justify-between text-slate-500">
                          <span className="font-semibold text-slate-700 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                            {lang === 'my' ? 'နောက်ဆုံး ဝယ်ယူသည့်ဈေး:' : 'Latest Purchase:'}
                          </span>
                          <span className="font-mono text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {item.latest.date}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-0.5">
                          <span className="text-base font-bold text-slate-900 font-mono">
                            {formatMMK(item.latest.amount)}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {lang === 'my' ? latestWallet?.name : latestWallet?.nameEn}
                          </span>
                        </div>
                        {item.latest.note && (
                          <p className="text-[11px] text-slate-400 truncate italic">
                            "{item.latest.note}"
                          </p>
                        )}
                      </div>

                      {/* Previous Purchase */}
                      {item.previous ? (
                        <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/90 text-xs space-y-1">
                          <div className="flex items-center justify-between text-slate-500">
                            <span className="font-semibold text-slate-600 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
                              {lang === 'my' ? 'အရင်တစ်ကြိမ် ဝယ်ဈေး:' : 'Previous Purchase:'}
                            </span>
                            <span className="font-mono text-slate-500 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {item.previous.date}
                            </span>
                          </div>
                          <div className="flex items-center justify-between pt-0.5">
                            <span className="text-base font-bold text-slate-700 font-mono">
                              {formatMMK(item.previous.amount)}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {lang === 'my' ? prevWallet?.name : prevWallet?.nameEn}
                            </span>
                          </div>
                          {item.previous.note && (
                            <p className="text-[11px] text-slate-400 truncate italic">
                              "{item.previous.note}"
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-slate-50/50 border border-dashed border-slate-200 text-xs flex items-center justify-center text-slate-400">
                          <span>
                            {lang === 'my'
                              ? 'အရင်တစ်ကြိမ် မှတ်တမ်း မရှိသေးပါ (၁ ကြိမ်သာ ဝယ်ဖူးပါသည်)'
                              : 'No earlier purchases found to compare'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:px-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Info className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              {lang === 'my'
                ? 'တူညီသော ပစ္စည်းများကို အလိုအလျောက် တွက်ချက်စိစစ်ပေးထားခြင်းဖြစ်ပါသည်'
                : 'Automatically grouped by sub-categories and item descriptions'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold transition-colors cursor-pointer"
          >
            {lang === 'my' ? 'ပိတ်မည်' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
