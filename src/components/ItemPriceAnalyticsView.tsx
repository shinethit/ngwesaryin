import React, { useState, useMemo } from 'react';
import {
  History,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  Calendar,
  Wallet as WalletIcon,
  Tag,
  Filter,
  Check,
  BarChart3,
  LineChart as LineChartIcon,
  Layers,
  Sparkles,
  Info,
  ArrowRight,
  Package,
  ShoppingBag,
  RotateCcw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Category, PlanType, Transaction, Wallet } from '../types';
import { formatMMK, formatDateDisplay } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';
import { buildWalletMap, isTransferTransaction } from '../utils/walletBalance';

interface ItemPriceAnalyticsViewProps {
  transactions: Transaction[];
  categories: Category[];
  wallets: Wallet[];
  plan: PlanType;
  lang: 'my' | 'en';
  onOpenUpgradeModal?: () => void;
}

interface ItemPurchaseRecord {
  id: string;
  txId: string;
  date: string;
  unitPrice: number;
  quantity: number;
  totalAmount: number;
  walletId: string;
  categoryId: string;
  note?: string;
  isShoppingList?: boolean;
}

interface ItemSummary {
  name: string;
  normalizedName: string;
  categoryId: string;
  records: ItemPurchaseRecord[];
  totalPurchases: number;
  totalQuantity: number;
  totalSpent: number;
  latestPrice: number;
  firstPrice: number;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  priceDelta: number;
  priceDeltaPercent: number;
  lastDate: string;
}

const ITEM_COLORS = [
  { stroke: '#6366F1', fill: '#EEF2FF', name: 'indigo' }, // Indigo
  { stroke: '#10B981', fill: '#ECFDF5', name: 'emerald' }, // Emerald
  { stroke: '#F59E0B', fill: '#FFFBEB', name: 'amber' }, // Amber
  { stroke: '#EC4899', fill: '#FDF2F8', name: 'pink' }, // Pink
  { stroke: '#06B6D4', fill: '#ECFEFF', name: 'cyan' }, // Cyan
];

export const ItemPriceAnalyticsView: React.FC<ItemPriceAnalyticsViewProps> = ({
  transactions,
  categories,
  wallets,
  lang,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'all' | '30d' | '90d' | '180d' | '365d'>('all');
  const [chartMode, setChartMode] = useState<'price' | 'frequency'>('price');
  const [selectedItemNames, setSelectedItemNames] = useState<string[]>([]);

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const walletMap = useMemo(() => buildWalletMap(wallets), [wallets]);

  // Subcategory list mapping
  const subCategoryMap = useMemo(() => {
    const map = new Map<string, { id: string; name: string; nameEn: string; categoryId: string }>();
    categories.forEach((cat) => {
      if (cat.subCategories) {
        cat.subCategories.forEach((sub) => {
          map.set(sub.id, {
            id: sub.id,
            name: sub.name,
            nameEn: sub.nameEn,
            categoryId: cat.id,
          });
        });
      }
    });
    return map;
  }, [categories]);

  // Filter transactions by time range
  const filteredTransactions = useMemo(() => {
    if (timeRange === 'all') return transactions;

    const now = new Date();
    let daysToSubtract = 30;
    if (timeRange === '90d') daysToSubtract = 90;
    if (timeRange === '180d') daysToSubtract = 180;
    if (timeRange === '365d') daysToSubtract = 365;

    const cutoff = new Date(now.getTime() - daysToSubtract * 24 * 60 * 60 * 1000);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    return transactions.filter((t) => t.date >= cutoffStr);
  }, [transactions, timeRange]);

  // Aggregate all items across transactions
  const allItemSummaries = useMemo(() => {
    const itemMap = new Map<
      string,
      {
        name: string;
        normalizedName: string;
        categoryId: string;
        records: ItemPurchaseRecord[];
      }
    >();

    filteredTransactions.forEach((tx) => {
      if (tx.type !== 'expense' || isTransferTransaction(tx)) return;

      // 1. Process breakdown shopping list items
      if (tx.items && tx.items.length > 0) {
        tx.items.forEach((item) => {
          if (!item.name || item.name.trim().length === 0) return;
          const cleanName = item.name.trim();
          const normalized = cleanName.toLowerCase();
          const qty = item.quantity && item.quantity > 0 ? item.quantity : 1;
          const unitPrice =
            item.price > 0
              ? item.price
              : item.amount && qty > 0
              ? Math.round(item.amount / qty)
              : item.amount || 0;

          if (unitPrice <= 0) return;

          if (!itemMap.has(normalized)) {
            itemMap.set(normalized, {
              name: cleanName,
              normalizedName: normalized,
              categoryId: tx.category,
              records: [],
            });
          }

          itemMap.get(normalized)!.records.push({
            id: `${tx.id}_${item.id || item.name}`,
            txId: tx.id,
            date: tx.date,
            unitPrice,
            quantity: qty,
            totalAmount: item.amount || unitPrice * qty,
            walletId: tx.walletId,
            categoryId: tx.category,
            note: tx.note,
            isShoppingList: true,
          });
        });
      }

      // 2. Process subcategory or clean note if no items
      if (tx.subCategoryId) {
        const sub = subCategoryMap.get(tx.subCategoryId);
        if (sub) {
          const cleanName = lang === 'my' ? sub.name : sub.nameEn || sub.name;
          const normalized = cleanName.toLowerCase();
          if (!itemMap.has(normalized)) {
            itemMap.set(normalized, {
              name: cleanName,
              normalizedName: normalized,
              categoryId: sub.categoryId,
              records: [],
            });
          }
          itemMap.get(normalized)!.records.push({
            id: tx.id,
            txId: tx.id,
            date: tx.date,
            unitPrice: tx.amount,
            quantity: 1,
            totalAmount: tx.amount,
            walletId: tx.walletId,
            categoryId: tx.category,
            note: tx.note,
          });
        }
      } else if ((!tx.items || tx.items.length === 0) && tx.note && tx.note.trim().length >= 2) {
        const cleanName = tx.note.trim();
        const normalized = cleanName.toLowerCase();
        if (!itemMap.has(normalized)) {
          itemMap.set(normalized, {
            name: cleanName,
            normalizedName: normalized,
            categoryId: tx.category,
            records: [],
          });
        }
        itemMap.get(normalized)!.records.push({
          id: tx.id,
          txId: tx.id,
          date: tx.date,
          unitPrice: tx.amount,
          quantity: 1,
          totalAmount: tx.amount,
          walletId: tx.walletId,
          categoryId: tx.category,
          note: tx.note,
        });
      }
    });

    // Compute detailed stats for each item
    const summaries: ItemSummary[] = Array.from(itemMap.values()).map((item) => {
      // Sort chronologically ascending
      const sortedRecords = [...item.records].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      const totalPurchases = sortedRecords.length;
      const totalQuantity = sortedRecords.reduce((s, r) => s + r.quantity, 0);
      const totalSpent = sortedRecords.reduce((s, r) => s + r.totalAmount, 0);
      const prices = sortedRecords.map((r) => r.unitPrice);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const avgPrice = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length);
      const firstPrice = sortedRecords[0]?.unitPrice || 0;
      const latestPrice = sortedRecords[sortedRecords.length - 1]?.unitPrice || 0;
      const priceDelta = latestPrice - firstPrice;
      const priceDeltaPercent = firstPrice > 0 ? (priceDelta / firstPrice) * 100 : 0;
      const lastDate = sortedRecords[sortedRecords.length - 1]?.date || '';

      return {
        name: item.name,
        normalizedName: item.normalizedName,
        categoryId: item.categoryId,
        records: sortedRecords,
        totalPurchases,
        totalQuantity,
        totalSpent,
        latestPrice,
        firstPrice,
        minPrice,
        maxPrice,
        avgPrice,
        priceDelta,
        priceDeltaPercent,
        lastDate,
      };
    });

    // Sort by purchase count descending
    return summaries.sort((a, b) => b.totalPurchases - a.totalPurchases || b.totalSpent - a.totalSpent);
  }, [filteredTransactions, subCategoryMap, lang]);

  // Filtered item list according to category and search
  const displayedItems = useMemo(() => {
    return allItemSummaries.filter((item) => {
      if (selectedCategory !== 'all' && item.categoryId !== selectedCategory) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = item.normalizedName.includes(q);
        const cat = catMap.get(item.categoryId);
        const matchCat =
          (cat?.name || '').toLowerCase().includes(q) ||
          (cat?.nameEn || '').toLowerCase().includes(q);
        return matchName || matchCat;
      }
      return true;
    });
  }, [allItemSummaries, selectedCategory, searchTerm, catMap]);

  // Selected items objects (default to top 2 most purchased items if none explicitly selected)
  const activeSelectedItems = useMemo(() => {
    if (selectedItemNames.length > 0) {
      return selectedItemNames
        .map((name) => allItemSummaries.find((it) => it.normalizedName === name))
        .filter((it): it is ItemSummary => it !== undefined);
    }
    // Default top 2
    return allItemSummaries.slice(0, 2);
  }, [selectedItemNames, allItemSummaries]);

  // Toggle item selection
  const handleToggleItem = (normalizedName: string) => {
    setSelectedItemNames((prev) => {
      // If currently using default (empty array), initialize with top item + new item
      const currentList = prev.length === 0 ? activeSelectedItems.map((it) => it.normalizedName) : prev;
      if (currentList.includes(normalizedName)) {
        const next = currentList.filter((n) => n !== normalizedName);
        return next;
      } else {
        if (currentList.length >= 5) {
          // Replace the last item to keep max 5 items
          return [...currentList.slice(0, 4), normalizedName];
        }
        return [...currentList, normalizedName];
      }
    });
  };

  const handleSelectAllTop = () => {
    const topNames = allItemSummaries.slice(0, 3).map((it) => it.normalizedName);
    setSelectedItemNames(topNames);
  };

  const handleClearSelection = () => {
    setSelectedItemNames([]);
  };

  // Build Price Trend Chart Data
  // Create a combined timeline of dates across all active selected items
  const priceChartData = useMemo(() => {
    if (activeSelectedItems.length === 0) return [];

    // Gather all unique dates
    const dateSet = new Set<string>();
    activeSelectedItems.forEach((item) => {
      item.records.forEach((r) => dateSet.add(r.date));
    });

    const sortedDates = Array.from(dateSet).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );

    return sortedDates.map((dateStr) => {
      const point: Record<string, any> = {
        date: dateStr,
        displayDate: formatDateDisplay(dateStr),
      };

      activeSelectedItems.forEach((item) => {
        // Find latest price record for this date
        const matchingRecords = item.records.filter((r) => r.date === dateStr);
        if (matchingRecords.length > 0) {
          const lastRecord = matchingRecords[matchingRecords.length - 1];
          point[item.normalizedName] = lastRecord.unitPrice;
          point[`${item.normalizedName}_qty`] = lastRecord.quantity;
          point[`${item.normalizedName}_total`] = lastRecord.totalAmount;
        }
      });

      return point;
    });
  }, [activeSelectedItems]);

  // Build Purchase Frequency & Total Spending Bar Chart Data
  const frequencyChartData = useMemo(() => {
    const itemsToChart = activeSelectedItems.length > 0 ? activeSelectedItems : allItemSummaries.slice(0, 5);
    return itemsToChart.map((it, idx) => ({
      name: it.name,
      normalizedName: it.normalizedName,
      purchases: it.totalPurchases,
      totalSpent: it.totalSpent,
      avgPrice: it.avgPrice,
      color: ITEM_COLORS[idx % ITEM_COLORS.length].stroke,
    }));
  }, [activeSelectedItems, allItemSummaries]);

  // Flattened all purchase records of active selected items for the detailed table
  const selectedItemsPurchaseLogs = useMemo(() => {
    const logs: (ItemPurchaseRecord & { itemName: string; color: string })[] = [];
    activeSelectedItems.forEach((item, idx) => {
      const color = ITEM_COLORS[idx % ITEM_COLORS.length].stroke;
      item.records.forEach((rec) => {
        logs.push({
          ...rec,
          itemName: item.name,
          color,
        });
      });
    });
    // Sort descending by date
    return logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [activeSelectedItems]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner & Introduction */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900">
                  {lang === 'my'
                    ? 'ကုန်ပစ္စည်းများ၏ ဝယ်ယူမှုအကြိမ်ရေနှင့် ဈေးနှုန်းခွဲခြမ်းစိတ်ဖြာချက်'
                    : 'Item Purchase Frequency & Price Trends'}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100/70 text-indigo-800 border border-indigo-200">
                  {lang === 'my' ? 'စိတ်ကြိုက် နှိုင်းယှဉ်ချက်' : 'Custom Comparison'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {lang === 'my'
                  ? 'ဝယ်ခဲ့သမျှ ပစ္စည်းတစ်ခုချင်းစီ၏ ဝယ်ယူခဲ့သောအကြိမ်ရေ၊ ဈေးနှုန်းအတက်အကျ Trend များကို စိတ်ကြိုက်ရွေးချယ်ပြီး Chart ဖြင့် ကြည့်ရှုနိုင်ပါသည်'
                  : 'Select custom items to visualize price changes, purchase frequency, and total expenditure over time'}
              </p>
            </div>
          </div>
        </div>

        {/* Time Range Filter & Chart Mode Toggle */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* Chart Type Selector */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setChartMode('price')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                chartMode === 'price'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LineChartIcon className="w-3.5 h-3.5" />
              <span>{lang === 'my' ? 'ဈေးနှုန်း Trend' : 'Price Trend'}</span>
            </button>
            <button
              type="button"
              onClick={() => setChartMode('frequency')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                chartMode === 'frequency'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>{lang === 'my' ? 'ဝယ်ယူမှု အကြိမ်ရေ' : 'Purchase Count'}</span>
            </button>
          </div>

          {/* Time Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <Calendar className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none pr-2 py-1 cursor-pointer"
            >
              <option value="all">{lang === 'my' ? 'အချိန်ကာလ အားလုံး' : 'All Time'}</option>
              <option value="30d">{lang === 'my' ? 'လွန်ခဲ့သော ၃၀ ရက်' : 'Last 30 Days'}</option>
              <option value="90d">{lang === 'my' ? 'လွန်ခဲ့သော ၃ လ' : 'Last 3 Months'}</option>
              <option value="180d">{lang === 'my' ? 'လွန်ခဲ့သော ၆ လ' : 'Last 6 Months'}</option>
              <option value="365d">{lang === 'my' ? 'လွန်ခဲ့သော ၁ နှစ်' : 'Past Year'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid: Left = Item Selector & Catalog, Right = Interactive Chart & Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Custom Item Selector (Catalog & Quick Search) */}
        <div className="lg:col-span-4 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Package className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                {lang === 'my' ? 'ပစ္စည်း ရွေးချယ်ရန်' : 'Select Items to Compare'}
              </span>
            </div>
            <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
              {activeSelectedItems.length} / 5
            </span>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <button
              type="button"
              onClick={handleSelectAllTop}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
            >
              {lang === 'my' ? '⚡ အများဆုံး ၃ မျိုး ရွေးမည်' : '⚡ Top 3 Items'}
            </button>
            {selectedItemNames.length > 0 && (
              <button
                type="button"
                onClick={handleClearSelection}
                className="text-[11px] font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{lang === 'my' ? 'ပြန်လည် သတ်မှတ်' : 'Reset'}</span>
              </button>
            )}
          </div>

          {/* Search Box & Category Filter */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={
                  lang === 'my'
                    ? 'ပစ္စည်း အမည်ဖြင့် ရှာရန်...'
                    : 'Search item name...'
                }
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-indigo-400 focus:outline-none transition-colors"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-none"
            >
              <option value="all">{lang === 'my' ? 'ကဏ္ဍ အားလုံး' : 'All Categories'}</option>
              {categories
                .filter((c) => c.type === 'expense')
                .map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {lang === 'my' ? cat.name : cat.nameEn}
                  </option>
                ))}
            </select>
          </div>

          {/* Currently Selected Active Badges */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {lang === 'my' ? 'လက်ရှိ Chart တွင် ပြသနေသည့် ပစ္စည်းများ:' : 'Active on Chart:'}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {activeSelectedItems.map((it, idx) => {
                const colorObj = ITEM_COLORS[idx % ITEM_COLORS.length];
                return (
                  <button
                    key={it.normalizedName}
                    type="button"
                    onClick={() => handleToggleItem(it.normalizedName)}
                    style={{ borderColor: colorObj.stroke, color: colorObj.stroke }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-white border shadow-2xs hover:opacity-80 transition-all cursor-pointer"
                    title={lang === 'my' ? 'Chart မှ ဖယ်ထုတ်ရန် နှိပ်ပါ' : 'Click to remove from chart'}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: colorObj.stroke }}
                    />
                    <span className="truncate max-w-[110px]">{it.name}</span>
                    <span className="text-[10px] opacity-60">({it.totalPurchases}x)</span>
                    <span className="text-[10px] ml-0.5 opacity-80">✕</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* List of Available Items to Pick */}
          <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1 divide-y divide-slate-100">
            {displayedItems.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                {lang === 'my' ? 'ရှာဖွေမှုနှင့် ကိုက်ညီသော ပစ္စည်း မရှိပါ' : 'No items found'}
              </div>
            ) : (
              displayedItems.map((item) => {
                const isSelected = activeSelectedItems.some(
                  (s) => s.normalizedName === item.normalizedName
                );
                const selectedIdx = activeSelectedItems.findIndex(
                  (s) => s.normalizedName === item.normalizedName
                );
                const colorObj =
                  selectedIdx !== -1 ? ITEM_COLORS[selectedIdx % ITEM_COLORS.length] : null;

                return (
                  <div
                    key={item.normalizedName}
                    onClick={() => handleToggleItem(item.normalizedName)}
                    className={`pt-2 pb-2 px-2.5 rounded-2xl flex items-center justify-between gap-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-50/70 border border-indigo-200/80 shadow-2xs'
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'border-slate-300 bg-white text-transparent'
                        }`}
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {item.name}
                          </span>
                          {colorObj && (
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: colorObj.stroke }}
                            />
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          <span>{item.totalPurchases} ကြိမ် ဝယ်ခဲ့</span>
                          <span>•</span>
                          <span className="font-mono text-slate-600">
                            {formatMMK(item.latestPrice)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {item.priceDelta !== 0 && (
                        <span
                          className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${
                            item.priceDelta > 0 ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                        >
                          {item.priceDelta > 0 ? (
                            <TrendingUp className="w-2.5 h-2.5" />
                          ) : (
                            <TrendingDown className="w-2.5 h-2.5" />
                          )}
                          <span>
                            {item.priceDelta > 0 ? '+' : ''}
                            {Math.round(item.priceDeltaPercent)}%
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Chart, Summary Metric Cards & Purchase Timeline Table */}
        <div className="lg:col-span-8 space-y-6">
          {/* Active Items Metric Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeSelectedItems.map((item, idx) => {
              const colorObj = ITEM_COLORS[idx % ITEM_COLORS.length];
              return (
                <div
                  key={item.normalizedName}
                  style={{ borderLeftColor: colorObj.stroke }}
                  className="bg-white p-4 rounded-2xl border border-slate-200/90 border-l-4 shadow-2xs space-y-2 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-xs text-slate-900 truncate">
                      {item.name}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-100 text-slate-700">
                      {item.totalPurchases} {lang === 'my' ? 'ကြိမ်' : 'times'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 block">
                        {lang === 'my' ? 'နောက်ဆုံးဝယ်ဈေး' : 'Latest Price'}
                      </span>
                      <span className="font-mono font-bold text-slate-900 text-xs">
                        {formatMMK(item.latestPrice)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block">
                        {lang === 'my' ? 'ပျမ်းမျှဈေး' : 'Average Price'}
                      </span>
                      <span className="font-mono font-bold text-slate-700 text-xs">
                        {formatMMK(item.avgPrice)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block">
                        {lang === 'my' ? 'အနိမ့် ~ အမြင့်' : 'Min ~ Max'}
                      </span>
                      <span className="font-mono text-[11px] text-slate-600 block truncate">
                        {formatMMK(item.minPrice)} ~ {formatMMK(item.maxPrice)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block">
                        {lang === 'my' ? 'စုစုပေါင်းကုန်ကျ' : 'Total Spent'}
                      </span>
                      <span className="font-mono font-bold text-indigo-700 text-xs">
                        {formatMMK(item.totalSpent)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Chart Display Box */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  {chartMode === 'price' ? (
                    <LineChartIcon className="w-4 h-4" />
                  ) : (
                    <BarChart3 className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {chartMode === 'price'
                      ? lang === 'my'
                        ? 'ရက်စွဲအလိုက် ဈေးနှုန်းအတက်အကျ Trend မျဉ်းကွေး'
                        : 'Price Change Trend over Time'
                      : lang === 'my'
                      ? 'ပစ္စည်းအလိုက် စုစုပေါင်း ဝယ်ယူခဲ့သည့် အကြိမ်ရေ'
                      : 'Purchase Frequency Breakdown'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {chartMode === 'price'
                      ? lang === 'my'
                        ? 'ဝယ်ယူခဲ့သည့် ရက်စွဲအလိုက် ဈေးနှုန်းပြောင်းလဲမှု လှိုင်းခတ်ပုံ'
                        : 'Connects past purchase rates chronologically'
                      : lang === 'my'
                      ? 'မည်သည့်ပစ္စည်းကို အကြိမ်ရေ မည်မျှအထိ အသုံးများဆုံးလဲ'
                      : 'Compares total purchase occurrences'}
                  </p>
                </div>
              </div>

              {/* Legend of Active Items */}
              <div className="flex items-center gap-3 flex-wrap">
                {activeSelectedItems.map((item, idx) => {
                  const colorObj = ITEM_COLORS[idx % ITEM_COLORS.length];
                  return (
                    <div key={item.normalizedName} className="flex items-center gap-1.5 text-xs">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: colorObj.stroke }}
                      />
                      <span className="font-bold text-slate-700">{item.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recharts Render Container */}
            <div className="w-full h-72 sm:h-80 pt-2">
              {chartMode === 'price' ? (
                priceChartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                    {lang === 'my'
                      ? 'ရွေးချယ်ထားသော ပစ္စည်းများအတွက် ဈေးနှုန်းဒေတာ မရှိသေးပါ'
                      : 'No purchase data available for selected items'}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={priceChartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis
                        dataKey="displayDate"
                        tick={{ fontSize: 11, fill: '#64748B' }}
                        tickLine={false}
                        axisLine={{ stroke: '#CBD5E1' }}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#64748B' }}
                        tickLine={false}
                        axisLine={{ stroke: '#CBD5E1' }}
                        tickFormatter={(val) =>
                          val >= 1000000
                            ? `${(val / 1000000).toFixed(1)}M`
                            : val >= 1000
                            ? `${Math.round(val / 1000)}k`
                            : val
                        }
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload || !payload.length) return null;
                          return (
                            <div className="bg-slate-900/95 text-white p-3 rounded-2xl shadow-xl text-xs space-y-1.5 border border-slate-700">
                              <div className="text-[11px] text-slate-400 font-semibold border-b border-slate-800 pb-1 flex items-center justify-between gap-2">
                                <span>{label}</span>
                                <span className="text-[10px] text-indigo-400">📅 ဝယ်ယူမှုမှတ်တမ်း</span>
                              </div>
                              {payload.map((entry: any, i: number) => {
                                const matchedItem = activeSelectedItems.find(
                                  (it) => it.normalizedName === entry.dataKey
                                );
                                if (!matchedItem || entry.value === undefined) return null;
                                return (
                                  <div key={i} className="flex items-center justify-between gap-4 py-0.5">
                                    <div className="flex items-center gap-1.5">
                                      <span
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: entry.stroke }}
                                      />
                                      <span className="font-bold text-slate-200">
                                        {matchedItem.name}:
                                      </span>
                                    </div>
                                    <span className="font-mono font-bold text-emerald-300">
                                      {formatMMK(entry.value)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        }}
                      />
                      {activeSelectedItems.map((item, idx) => {
                        const colorObj = ITEM_COLORS[idx % ITEM_COLORS.length];
                        return (
                          <Line
                            key={item.normalizedName}
                            type="monotone"
                            dataKey={item.normalizedName}
                            name={item.name}
                            stroke={colorObj.stroke}
                            strokeWidth={3}
                            dot={{ r: 4, fill: colorObj.stroke, strokeWidth: 2, stroke: '#FFFFFF' }}
                            activeDot={{ r: 6, stroke: '#FFFFFF', strokeWidth: 2 }}
                            connectNulls
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                )
              ) : (
                /* Bar Chart for Frequency / Purchase Count */
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={frequencyChartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      tickLine={false}
                      axisLine={{ stroke: '#CBD5E1' }}
                      interval={0}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      tickLine={false}
                      axisLine={{ stroke: '#CBD5E1' }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900/95 text-white p-3 rounded-2xl shadow-xl text-xs space-y-1 border border-slate-700">
                            <span className="font-bold text-sm text-indigo-300 block">
                              {data.name}
                            </span>
                            <div className="text-slate-300 flex justify-between gap-4">
                              <span>ဝယ်ယူခဲ့သည့် အကြိမ်ရေ:</span>
                              <span className="font-bold font-mono text-white">{data.purchases} ကြိမ်</span>
                            </div>
                            <div className="text-slate-300 flex justify-between gap-4">
                              <span>စုစုပေါင်း ကုန်ကျငွေ:</span>
                              <span className="font-bold font-mono text-emerald-300">
                                {formatMMK(data.totalSpent)}
                              </span>
                            </div>
                            <div className="text-slate-300 flex justify-between gap-4">
                              <span>ပျမ်းမျှ ဈေးနှုန်း:</span>
                              <span className="font-bold font-mono text-amber-300">
                                {formatMMK(data.avgPrice)}
                              </span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar
                      dataKey="purchases"
                      name={lang === 'my' ? 'ဝယ်ယူခဲ့သည့် အကြိမ်ရေ' : 'Purchases'}
                      fill="#6366F1"
                      radius={[8, 8, 0, 0]}
                      barSize={36}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Detailed Chronological Purchase Records Table for Selected Items */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-xs sm:text-sm text-slate-900 uppercase tracking-wider">
                  {lang === 'my'
                    ? 'ရွေးချယ်ထားသော ပစ္စည်းများ၏ ဝယ်ယူမှုမှတ်တမ်း အသေးစိတ်'
                    : 'Detailed Purchase Log for Selected Items'}
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                {selectedItemsPurchaseLogs.length} {lang === 'my' ? 'မှတ်တမ်း' : 'records'}
              </span>
            </div>

            {selectedItemsPurchaseLogs.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                {lang === 'my'
                  ? 'ပစ္စည်းများကို ဘယ်ဘက်မှ ရွေးချယ်ပြီး မှတ်တမ်းအသေးစိတ်ကို ကြည့်ရှုနိုင်ပါသည်'
                  : 'Select items from the catalog to inspect their purchase history'}
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto rounded-2xl border border-slate-100 divide-y divide-slate-100">
                {selectedItemsPurchaseLogs.map((log, i) => {
                  const wallet = walletMap.get(log.walletId);
                  return (
                    <div
                      key={log.id || i}
                      className="p-3 hover:bg-slate-50/80 flex items-center justify-between gap-3 text-xs transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: log.color }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 truncate">{log.itemName}</span>
                            {log.quantity > 1 && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 font-bold">
                                x{log.quantity}
                              </span>
                            )}
                            {log.isShoppingList && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 font-bold border border-amber-200">
                                🛒 Shopping
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            <span className="font-mono">{log.date}</span>
                            {wallet && (
                              <>
                                <span>•</span>
                                <span className="text-slate-600">
                                  {lang === 'my' ? wallet.name : wallet.nameEn || wallet.name}
                                </span>
                              </>
                            )}
                            {log.note && (
                              <>
                                <span>•</span>
                                <span className="truncate max-w-[140px] italic text-slate-500">
                                  {log.note}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-slate-900 block">
                          {formatMMK(log.unitPrice)}
                        </span>
                        {log.quantity > 1 && (
                          <span className="text-[10px] font-mono text-slate-400 block">
                            (စုစုပေါင်း {formatMMK(log.totalAmount)})
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
