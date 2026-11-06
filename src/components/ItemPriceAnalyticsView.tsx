import React, { useState, useMemo } from 'react';
import { History, TrendingUp, TrendingDown, Search, Calendar, Filter, Check, BarChart3, LineChart as LineChartIcon, Package, ShoppingBag, RotateCcw } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Category, PlanType, Transaction, Wallet } from '../types';
import { formatMMK, formatLakhs, formatDateDisplay } from '../utils/formatters';
import { normalizeItemName, parseNoteAsItem } from '../utils/itemIntelligence';

// [v7.5.55 C19] Vehicle sub-categories are costs, not purchasable items —
// whole fuel bills must never appear as "items" in Compare Price.
const VEHICLE_SUB_CATEGORY_IDS = new Set([
  'sub_veh_fuel',
  'sub_veh_maintenance',
  'sub_veh_parts',
  'sub_veh_tire',
  'sub_veh_wash',
  'sub_veh_license',
]);

import { buildWalletMap, isTransferTransaction, isWalletMatch, effectiveIncludeInTotals } from '../utils/walletBalance';
import { useAuth } from '../context/AuthContext';
import { convertToMMK } from '../utils/currency';

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
  shopName?: string; // [v7.5.54] Shop where this purchase was made
  isShoppingList?: boolean;
  // [v7.5.55 C9] True for sub-category / note records: unitPrice here is
  // the WHOLE TRIP total, not a per-unit price — never average it with
  // true per-unit prices.
  isTripTotal?: boolean;
}

interface ItemSummary {
  name: string;
  normalizedName: string;
  // [v7.5.53] Unit derived from the name ("" when unknown); chartKey is the
  // unique identity (name + unit) so "ဆန်" per kg and per ပြည် never merge.
  unit?: string;
  chartKey: string;
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
  cheapestShop?: string; // [v7.5.54] Shop with the lowest unit price
  cheapestPrice?: number;
  // [v7.5.55 C13] All shops tied at the lowest unit price (normalized
  // names), and the cheapest purchase that has NO shop at all.
  cheapestShops?: string[];
  cheapestNoShopPrice?: number;
  // [v7.5.55 C9] False when every record is a trip total (no per-unit
  // price exists at all); latestTotal is the newest trip total then.
  hasUnitPrices: boolean;
  latestTotal: number;
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
  // [v7.5.55 C17] null = no explicit choice yet (default top 2);
  // [] = the user explicitly deselected everything — that must stay
  // empty with an honest empty state, never snap back to the top 2.
  const [selectedItemNames, setSelectedItemNames] = useState<string[] | null>(null);
  const [limitNotice, setLimitNotice] = useState(false);

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const walletMap = useMemo(() => buildWalletMap(wallets), [wallets]);
  // [v7.5.60 E12/S-72] Convert every price to MMK via the buying wallet
  // and exclude Separate wallets (Dashboard scope). Unknown wallets are
  // kept — their currency/scope cannot be judged.
  const convertAmount = (amount: number, walletId: string) => {
    const w = walletMap.get(walletId) || wallets.find((wall) => isWalletMatch(wall, walletId));
    return convertToMMK(amount, w?.currency, w?.exchangeRate);
  };
  // [v7.5.68] Per-viewer shared-wallet scope overrides.
  const { sharedWalletScopeOverrides } = useAuth();

  const isScopedTx = (t: Transaction) => {
    const w = walletMap.get(t.walletId) || wallets.find((wall) => isWalletMatch(wall, t.walletId));
    return !w || effectiveIncludeInTotals(w, sharedWalletScopeOverrides);
  };
  // Currencies actually used (for the mixed-currency note).
  const mixedCurrencies = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => {
      if (!isScopedTx(t)) return;
      const w = walletMap.get(t.walletId) || wallets.find((wall) => isWalletMatch(wall, t.walletId));
      if (w?.currency) set.add(w.currency);
    });
    return set;
  }, [transactions, walletMap, wallets, sharedWalletScopeOverrides]);

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
        unit: string;
        chartKey: string;
        categoryId: string;
        records: ItemPurchaseRecord[];
      }
    >();

    filteredTransactions.forEach((tx) => {
      if (tx.type !== 'expense' || isTransferTransaction(tx)) return;
      if (!isScopedTx(tx)) return;

      // 1. Process breakdown shopping list items
      if (tx.items && tx.items.length > 0) {
        tx.items.forEach((item) => {
          if (!item.name || item.name.trim().length === 0) return;
          // [v7.5.53] Normalize so "ဆန်", "ဆန် ၁ပြည်", "ဆန် 1 ပြည်" group
          // as one item; different units stay separate (never averaged together).
          const norm = normalizeItemName(item.name);
          const cleanName = norm.display;
          const normalized = norm.key;
          const mapKey = normalized + '|' + norm.unit;
          const qty = item.quantity && item.quantity > 0 ? item.quantity : 1;
          const rawUnitPrice =
            item.price > 0
              ? item.price
              : item.amount && qty > 0
              ? Math.round(item.amount / qty)
              : item.amount || 0;
          // [v7.5.60 E12] Prices are in the buying wallet's currency —
          // convert to MMK before comparing.
          const unitPrice = Math.round(convertAmount(rawUnitPrice, tx.walletId));

          if (unitPrice <= 0) return;

          if (!itemMap.has(mapKey)) {
            itemMap.set(mapKey, {
              name: cleanName,
              normalizedName: normalized,
              unit: norm.unit,
              chartKey: mapKey,
              categoryId: tx.category,
              records: [],
            });
          }

          itemMap.get(mapKey)!.records.push({
            id: `${tx.id}_${item.id || item.name}`,
            txId: tx.id,
            date: tx.date,
            unitPrice,
            quantity: qty,
            totalAmount: item.amount ? Math.round(convertAmount(item.amount, tx.walletId)) : unitPrice * qty,
            walletId: tx.walletId,
            categoryId: tx.category,
            note: tx.note,
            shopName: tx.shopName,
            isShoppingList: true,
          });
        });
      }

      // 2. Process subcategory if there are NO shopping items.
      // [v7.5.55 C2/D15] The old code ran this branch even when the tx had
      // items, so a shopping trip was counted TWICE (once per item, once
      // as a phantom sub-category record priced at the whole tx amount).
      // [v7.5.55 C19] Vehicle sub-categories are excluded entirely.
      // [v7.5.55 C9] This record is a TRIP TOTAL, not a per-unit price.
      if (tx.subCategoryId && (!tx.items || tx.items.length === 0)) {
        if (VEHICLE_SUB_CATEGORY_IDS.has(tx.subCategoryId)) {
          // Vehicle cost — not a purchasable item. Skip.
        } else {
          const sub = subCategoryMap.get(tx.subCategoryId);
          if (sub) {
            const norm = normalizeItemName(lang === 'my' ? sub.name : sub.nameEn || sub.name);
            const cleanName = norm.display;
            const normalized = norm.key;
            const mapKey = normalized + '|' + norm.unit;
            if (!itemMap.has(mapKey)) {
              itemMap.set(mapKey, {
                name: cleanName,
                normalizedName: normalized,
                unit: norm.unit,
                chartKey: mapKey,
                categoryId: sub.categoryId,
                records: [],
              });
            }
            itemMap.get(mapKey)!.records.push({
              id: tx.id,
              txId: tx.id,
              date: tx.date,
              unitPrice: Math.round(convertAmount(tx.amount, tx.walletId)),
              quantity: 1,
              totalAmount: Math.round(convertAmount(tx.amount, tx.walletId)),
              walletId: tx.walletId,
              categoryId: tx.category,
              note: tx.note,
              shopName: tx.shopName,
              isTripTotal: true,
            });
          }
        }
      } else if ((!tx.items || tx.items.length === 0) && tx.note && tx.note.trim().length >= 2) {
        // [v7.5.55 D20] A free-text note becomes an item ONLY when it
        // parses as an item name (+ quantity/unit) — otherwise the whole
        // note would become a phantom "item" priced at the full amount.
        // [v7.5.55 C9] This record is a TRIP TOTAL, not a per-unit price.
        const parsed = parseNoteAsItem(tx.note);
        if (!parsed) {
          // Not an item signal — skip, do not create a catalog item.
        } else {
          const norm = normalizeItemName(tx.note);
          const cleanName = norm.display;
          const normalized = norm.key;
          const mapKey = normalized + '|' + norm.unit;
          if (!itemMap.has(mapKey)) {
            itemMap.set(mapKey, {
              name: cleanName,
              normalizedName: normalized,
              unit: norm.unit,
              chartKey: mapKey,
              categoryId: tx.category,
              records: [],
            });
          }
          itemMap.get(mapKey)!.records.push({
            id: tx.id,
            txId: tx.id,
            date: tx.date,
            unitPrice: Math.round(convertAmount(tx.amount, tx.walletId)),
            quantity: 1,
            totalAmount: Math.round(convertAmount(tx.amount, tx.walletId)),
            walletId: tx.walletId,
            categoryId: tx.category,
            note: tx.note,
            shopName: tx.shopName,
            isTripTotal: true,
          });
        }
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
      // [v7.5.55 C9] Unit-price stats use ONLY true per-unit records.
      // Trip totals are visible as totals but never averaged with them.
      const unitRecords = sortedRecords.filter((r) => !r.isTripTotal);
      const hasUnitPrices = unitRecords.length > 0;
      const unitPrices = unitRecords.map((r) => r.unitPrice);
      const minPrice = hasUnitPrices ? Math.min(...unitPrices) : 0;
      const maxPrice = hasUnitPrices ? Math.max(...unitPrices) : 0;
      // [v7.5.55 D20] Quantity-weighted average: 1 kg at 5,000 and 10 kg
      // at 4,000 averages to 4,091 — not the simple mean of 4,500.
      const unitQtyTotal = unitRecords.reduce((s, r) => s + r.quantity, 0);
      const avgPrice = hasUnitPrices && unitQtyTotal > 0
        ? Math.round(unitRecords.reduce((s, r) => s + r.unitPrice * r.quantity, 0) / unitQtyTotal)
        : 0;
      const firstPrice = hasUnitPrices ? unitRecords[0].unitPrice : 0;
      const latestPrice = hasUnitPrices ? unitRecords[unitRecords.length - 1].unitPrice : 0;
      const latestTotal = sortedRecords[sortedRecords.length - 1]?.totalAmount || 0;
      const priceDelta = latestPrice - firstPrice;
      const priceDeltaPercent = firstPrice > 0 ? (priceDelta / firstPrice) * 100 : 0;
      const lastDate = sortedRecords[sortedRecords.length - 1]?.date || '';
      // [v7.5.55 C13] Cheapest shop over UNIT prices only, with shop names
      // normalized (trim + case-insensitive) so "City Mart" and
      // "city mart" are one shop; ties are all shown.
      const shopMin = new Map<string, { display: string; min: number }>();
      unitRecords.forEach((r) => {
        if (!r.shopName) return;
        const key = r.shopName.trim().toLowerCase();
        if (!key) return;
        const prev = shopMin.get(key);
        if (!prev || r.unitPrice < prev.min) {
          shopMin.set(key, { display: r.shopName.trim(), min: r.unitPrice });
        }
      });
      const cheapestPrice = shopMin.size > 0 ? Math.min(...Array.from(shopMin.values()).map((v) => v.min)) : undefined;
      const cheapestShops = cheapestPrice !== undefined
        ? Array.from(shopMin.values()).filter((v) => v.min === cheapestPrice).map((v) => v.display)
        : undefined;
      const cheapestShop = cheapestShops?.[0];
      // [v7.5.55 C13b] Hint when the genuinely cheapest purchase has no
      // shop at all — the badge only ever considers records WITH a shop.
      const noShopPrices = unitRecords.filter((r) => !r.shopName || !r.shopName.trim()).map((r) => r.unitPrice);
      const cheapestNoShopPrice =
        noShopPrices.length > 0 && cheapestPrice !== undefined && Math.min(...noShopPrices) < cheapestPrice
          ? Math.min(...noShopPrices)
          : undefined;

      return {
        name: item.name,
        normalizedName: item.normalizedName,
        unit: item.unit || undefined,
        chartKey: item.chartKey,
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
        cheapestShop,
        cheapestPrice,
        cheapestShops,
        cheapestNoShopPrice,
        hasUnitPrices,
        latestTotal,
      };
    });

    // Sort by purchase count descending
    return summaries.sort((a, b) => b.totalPurchases - a.totalPurchases || b.totalSpent - a.totalSpent);
  }, [filteredTransactions, subCategoryMap, lang, sharedWalletScopeOverrides]);

  // Filtered item list according to category and search
  const displayedItems = useMemo(() => {
    return allItemSummaries.filter((item) => {
      if (selectedCategory !== 'all' && item.categoryId !== selectedCategory) {
        return false;
      }
      if (searchTerm.trim()) {
        // [v7.5.55 C14f] Normalize the query (incl. Myanmar digits) the
        // same way item names are normalized — "ဆန် ၁ပြည်" must find "ဆန်".
        const q = normalizeItemName(searchTerm).key;
        const rawQ = searchTerm.toLowerCase();
        const matchName = q ? item.normalizedName.includes(q) : false;
        const cat = catMap.get(item.categoryId);
        const matchCat =
          (cat?.name || '').toLowerCase().includes(rawQ) ||
          (cat?.nameEn || '').toLowerCase().includes(rawQ);
        return matchName || matchCat;
      }
      return true;
    });
  }, [allItemSummaries, selectedCategory, searchTerm, catMap]);

  // Selected items objects (default to top 2 most purchased items if none explicitly selected)
  const activeSelectedItems = useMemo(() => {
    if (selectedItemNames !== null) {
      return selectedItemNames
        .map((name) => allItemSummaries.find((it) => it.chartKey === name || it.normalizedName === name))
        .filter((it): it is ItemSummary => it !== undefined);
    }
    // Default top 2
    return allItemSummaries.slice(0, 2);
  }, [selectedItemNames, allItemSummaries]);

  // Toggle item selection
  const handleToggleItem = (chartKey: string) => {
    setSelectedItemNames((prev) => {
      // If currently using default (null), initialize with top items first.
      const currentList = prev === null ? activeSelectedItems.map((it) => it.chartKey) : prev;
      if (currentList.includes(chartKey)) {
        // Deselecting the last item leaves an explicit empty selection —
        // no snap-back to the top 2 (v7.5.55 C17).
        return currentList.filter((n) => n !== chartKey);
      } else {
        if (currentList.length >= 5) {
          // [v7.5.55 C17] A 6th item must WARN and not be added — never
          // silently replace the 5th.
          setLimitNotice(true);
          return currentList;
        }
        return [...currentList, chartKey];
      }
    });
  };

  const handleSelectAllTop = () => {
    const topNames = allItemSummaries.slice(0, 3).map((it) => it.chartKey);
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

    // [v7.5.62] Plot EVERY purchase, not just the last one per date —
    // one point per purchase index (N = max records any selected item
    // has on that date). The j-th point carries each item's j-th
    // record that day, ts spaced 1h apart so same-day points order
    // left-to-right by purchase order. A series with no j-th record
    // simply has no key at that point (connectNulls bridges).
    const points: Record<string, any>[] = [];
    sortedDates.forEach((dateStr) => {
      const baseTs = new Date(dateStr + 'T00:00:00').getTime();
      const maxCount = Math.max(
        ...activeSelectedItems.map(
          (item) => item.records.filter((r) => r.date === dateStr).length
        )
      );
      for (let j = 0; j < maxCount; j++) {
        const point: Record<string, any> = {
          date: dateStr,
          displayDate: formatDateDisplay(dateStr),
          // [v7.5.55 C31] Real timestamp for a true time-scale X axis.
          ts: baseTs + j * 3600000,
        };
        activeSelectedItems.forEach((item) => {
          const record = item.records.filter((r) => r.date === dateStr)[j];
          if (record) {
            point[item.chartKey] = record.unitPrice;
            point[`${item.chartKey}_qty`] = record.quantity;
            point[`${item.chartKey}_total`] = record.totalAmount;
          }
        });
        points.push(point);
      }
    });
    return points;
  }, [activeSelectedItems]);

  // Build Purchase Frequency & Total Spending Bar Chart Data
  const frequencyChartData = useMemo(() => {
    // [v7.5.55 C17] Only the explicitly selected items — an empty
    // selection shows an empty chart, never a silent top-5 fallback.
    return activeSelectedItems.map((it, idx) => ({
      name: it.unit ? it.name + ' · ' + it.unit : it.name,
      normalizedName: it.normalizedName,
      purchases: it.totalPurchases,
      totalSpent: it.totalSpent,
      avgPrice: it.avgPrice,
      color: ITEM_COLORS[idx % ITEM_COLORS.length].stroke,
    }));
  }, [activeSelectedItems]);

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

  // [v7.5.62] The "စုစုပေါင်း" badge only means something when the
  // visible history mixes trip totals and unit prices — when every
  // row is the same kind, the badge is redundant noise on every row.
  const hasMixedTypes = useMemo(
    () =>
      selectedItemsPurchaseLogs.some((l) => l.isTripTotal) &&
      selectedItemsPurchaseLogs.some((l) => !l.isTripTotal),
    [selectedItemsPurchaseLogs]
  );

  // [v7.5.55 C13d] The cheapest shop is computed over the selected range.
  const timeRangeLabel =
    timeRange === 'all'
      ? lang === 'my'
        ? 'အချိန်အားလုံး'
        : 'all time'
      : timeRange === '30d'
      ? lang === 'my'
        ? 'နောက်ဆုံး ၃၀ ရက်'
        : 'last 30 days'
      : timeRange === '90d'
      ? lang === 'my'
        ? 'နောက်ဆုံး ၃ လ'
        : 'last 3 months'
      : timeRange === '180d'
      ? lang === 'my'
        ? 'နောက်ဆုံး ၆ လ'
        : 'last 6 months'
      : lang === 'my'
      ? 'နောက်ဆုံး ၁ နှစ်'
      : 'past year';

  return (
    <div className="space-y-6 animate-fadeIn">
      {limitNotice && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start justify-between gap-3">
          <p className="text-sm text-amber-900 leading-relaxed">
            {lang === 'my'
              ? 'ပစ္စည်း ၅ မျိုးထိသာ တစ်ပြိုင်နက် နှိုင်းယှဉ်နိုင်ပါသည် — တစ်ခုခု ဖယ်ထုတ်ပြီးမှ အသစ်ထည့်ပါ'
              : 'You can compare up to 5 items at once — remove one first to add another'}
          </p>
          <button type="button" onClick={() => setLimitNotice(false)} className="px-4 py-2 min-h-[44px] bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl cursor-pointer shrink-0">
            {lang === 'my' ? 'ပိတ်မည်' : 'Close'}
          </button>
        </div>
      )}
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
                    ? '🛒 ဈေးနှုန်း နှိုင်းယှဉ်'
                    : '🛒 Compare Price'}
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
              {/* [v7.5.60 E13/S-73] Consistent naming is what makes
                  comparison work at all — say so on the screen. */}
              <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-2">
                {lang === 'my'
                  ? '💡 ပစ္စည်းအမည်ကို တစ်သမတ်တည်း ရေးမှ နှိုင်းယှဉ်နိုင်ပါတယ် (ဥပမာ — “ဆန်” ကို အမြဲ “ဆန်” လို့ပဲ ရေးပါ)'
                  : '💡 Prices can only be compared when the item name is always written the same way (e.g. always write “rice” the same way)'}
              </p>
              {mixedCurrencies.size > 1 && (
                <p className="text-[11px] text-indigo-800 bg-indigo-50 border border-indigo-200 rounded-lg px-2.5 py-1.5 mt-2">
                  {lang === 'my'
                    ? '💱 ငွေကြေး မတူသော ဝယ်ယူမှုများ ပါဝင်သည် — ဈေးနှုန်းအားလုံးကို ကျပ်သို့ ပြောင်းပြီး နှိုင်းယှဉ်ထားပါသည်'
                    : '💱 Purchases in different currencies are included — all prices were converted to MMK before comparing'}
                </p>
              )}
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
              {lang === 'my' ? '⚡ ထိပ်ဆုံး ၃ မျိုး ရွေးမည်' : '⚡ Top 3 Items'}
            </button>
            {selectedItemNames !== null && (
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
              {activeSelectedItems.length === 0 && (
                <span className="text-[11px] text-slate-400 italic">
                  {lang === 'my'
                    ? 'ပစ္စည်း မရွေးထားပါ — အောက်ပါစာရင်းမှ ရွေးချယ်ပါ'
                    : 'No items selected — pick from the list below'}
                </span>
              )}
              {activeSelectedItems.map((it, idx) => {
                const colorObj = ITEM_COLORS[idx % ITEM_COLORS.length];
                return (
                  <button
                    key={it.chartKey}
                    type="button"
                    onClick={() => handleToggleItem(it.chartKey)}
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
          <div className="space-y-1.5 max-h-[380px] overflow-y-auto overflow-x-hidden pr-1 divide-y divide-slate-100">
            {displayedItems.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                {lang === 'my' ? 'ရှာဖွေမှုနှင့် ကိုက်ညီသော ပစ္စည်း မရှိပါ' : 'No items found'}
              </div>
            ) : (
              displayedItems.map((item) => {
                const isSelected = activeSelectedItems.some(
                  (s) => s.chartKey === item.chartKey
                );
                const selectedIdx = activeSelectedItems.findIndex(
                  (s) => s.chartKey === item.chartKey
                );
                const colorObj =
                  selectedIdx !== -1 ? ITEM_COLORS[selectedIdx % ITEM_COLORS.length] : null;

                return (
                  <div
                    key={item.chartKey}
                    onClick={() => handleToggleItem(item.chartKey)}
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
                            {item.unit && (
                              <span className="ml-1 px-1 py-px rounded bg-slate-100 text-slate-500 text-[10px] font-bold">
                                {item.unit}
                              </span>
                            )}
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
                            {formatLakhs(item.hasUnitPrices ? item.latestPrice : item.latestTotal, lang)}
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
                  key={item.chartKey}
                  style={{ borderLeftColor: colorObj.stroke }}
                  className="bg-white p-4 rounded-2xl border border-slate-200/90 border-l-4 shadow-2xs space-y-2 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-xs text-slate-900 truncate">
                      {item.name}
                      {item.unit && (
                        <span className="ml-1 px-1 py-px rounded bg-slate-100 text-slate-500 text-[10px] font-bold">
                          {item.unit}
                        </span>
                      )}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-100 text-slate-700">
                      {item.totalPurchases} {lang === 'my' ? 'ကြိမ်' : 'times'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 block">
                        {item.hasUnitPrices
                          ? lang === 'my'
                            ? 'နောက်ဆုံးဝယ်ဈေး'
                            : 'Latest Price'
                          : lang === 'my'
                          ? 'နောက်ဆုံးစုစုပေါင်း'
                          : 'Latest Trip Total'}
                      </span>
                      <span className="font-mono font-bold text-slate-900 text-xs" title={formatMMK(item.hasUnitPrices ? item.latestPrice : item.latestTotal)}>
                        {formatLakhs(item.hasUnitPrices ? item.latestPrice : item.latestTotal, lang)}
                      </span>
                      {!item.hasUnitPrices && (
                        <span className="ml-1 px-1 py-px rounded bg-amber-50 text-amber-800 text-[9px] font-bold border border-amber-200">
                          {lang === 'my' ? 'စုစုပေါင်း' : 'Total'}
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block">
                        {lang === 'my' ? 'ပျမ်းမျှဈေး' : 'Average Price'}
                      </span>
                      <span className="font-mono font-bold text-slate-700 text-xs" title={item.hasUnitPrices ? formatMMK(item.avgPrice) : ''}>
                        {item.hasUnitPrices ? formatLakhs(item.avgPrice, lang) : '—'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block">
                        {lang === 'my' ? 'အနိမ့် ~ အမြင့်' : 'Min ~ Max'}
                      </span>
                      <span className="font-mono text-[11px] text-slate-600 block truncate">
                        {item.hasUnitPrices
                          ? `${formatLakhs(item.minPrice, lang)} ~ ${formatLakhs(item.maxPrice, lang)}`
                          : '—'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block">
                        {lang === 'my' ? 'စုစုပေါင်းကုန်ကျ' : 'Total Spent'}
                      </span>
                      <span className="font-mono font-bold text-indigo-700 text-xs" title={formatMMK(item.totalSpent)}>
                        {formatLakhs(item.totalSpent, lang)}
                      </span>
                    </div>
                  </div>
                  {/* [v7.5.55 C31] Latest purchase date + total quantity —
                      both were computed but never rendered. */}
                  <div className="pt-1 text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
                    <span>
                      🗓️ {lang === 'my' ? 'နောက်ဆုံးဝယ်:' : 'Last bought:'}{' '}
                      <span className="font-mono font-bold text-slate-700">{item.lastDate || '—'}</span>
                    </span>
                    <span>
                      · {lang === 'my' ? 'စုစုပေါင်း' : 'Qty:'} {item.totalQuantity}
                    </span>
                  </div>
                  {item.cheapestShop && (
                    <div className="pt-2 border-t border-slate-100 text-xs">
                      <span className="text-[10px] text-slate-400 block">
                        {lang === 'my' ? 'အတန်ဆုံးဆိုင်' : 'Cheapest Shop'}
                      </span>
                      <span className="font-bold text-emerald-700">
                        {(item.cheapestShops || [item.cheapestShop]).join(', ')}
                      </span>
                      <span className="font-mono text-slate-600"> · {formatLakhs(item.cheapestPrice || 0, lang)}</span>
                      {(item.cheapestShops || []).length > 1 && (
                        <span className="ml-1 text-[10px] text-slate-400">
                          {lang === 'my' ? '(ဈေးတူ)' : '(tied)'}
                        </span>
                      )}
                      {item.cheapestNoShopPrice !== undefined && (
                        <span className="block text-[11px] text-amber-700 mt-0.5">
                          ⚠️{' '}
                          {lang === 'my'
                            ? `အတန်ဆုံး ဝယ်ယူမှု (${formatLakhs(item.cheapestNoShopPrice, lang)}) တွင် ဆိုင်အမည် မပါဝင်ပါ`
                            : `The cheapest purchase (${formatLakhs(item.cheapestNoShopPrice, lang)}) has no shop recorded`}
                        </span>
                      )}
                      <span className="block text-[10px] text-slate-400 mt-0.5">
                        {lang === 'my' ? `(${timeRangeLabel} အတွင်း တွက်ချက်ထားသည်)` : `(computed over ${timeRangeLabel})`}
                      </span>
                    </div>
                  )}
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
                        ? 'ဝယ်ယူခဲ့သည့် ရက်စွဲအလိုက် ဈေးနှုန်းပြောင်းလဲမှု — X ဝင်ရိုးသည် ရက်အကွာအဝေး အမှန်အတိုင်း ပြထားသည်'
                        : 'Price changes by purchase date — the X axis shows real time gaps between purchases'
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
                    <div key={item.chartKey} className="flex items-center gap-1.5 text-xs">
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
                      {/* [v7.5.55 C31] True time-scale X axis — the old
                          categorical axis drew straight lines across gaps
                          as if purchases were evenly spaced. */}
                      <XAxis
                        dataKey="ts"
                        type="number"
                        scale="time"
                        domain={['dataMin', 'dataMax']}
                        tickFormatter={(ts: number) => {
                          const d = new Date(ts);
                          return `${d.getDate()}/${d.getMonth() + 1}`;
                        }}
                        minTickGap={40}
                        tick={{ fontSize: 11, fill: '#64748B' }}
                        tickLine={false}
                        axisLine={{ stroke: '#CBD5E1' }}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#64748B' }}
                        tickLine={false}
                        axisLine={{ stroke: '#CBD5E1' }}
                        tickFormatter={(val) => formatLakhs(val, lang)}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload || !payload.length) return null;
                          // [v7.5.62] Tooltip date must use LOCAL date parts —
                          // toISOString() is UTC, so for UTC+6:30 it showed
                          // the previous day (a 3 Nov purchase read as 2 Nov).
                          const labelDate = typeof label === 'number' ? new Date(label) : null;
                          const labelStr = labelDate
                            ? formatDateDisplay(`${labelDate.getFullYear()}-${String(labelDate.getMonth() + 1).padStart(2, '0')}-${String(labelDate.getDate()).padStart(2, '0')}`)
                            : String(label ?? '');
                          return (
                            <div className="bg-slate-900/95 text-white p-3 rounded-2xl shadow-xl text-xs space-y-1.5 border border-slate-700 max-w-[280px]">
                              <div className="text-[11px] text-slate-400 font-semibold border-b border-slate-800 pb-1 flex items-center justify-between gap-2">
                                <span>{labelStr}</span>
                                <span className="text-[10px] text-indigo-400">📅 ဝယ်ယူမှုမှတ်တမ်း</span>
                              </div>
                              {payload.map((entry: any, i: number) => {
                                const matchedItem = activeSelectedItems.find(
                                  (it) => it.chartKey === entry.dataKey
                                );
                                if (!matchedItem || entry.value === undefined) return null;
                                return (
                                  <div key={i} className="flex items-center justify-between gap-4 py-0.5">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: entry.stroke }}
                                      />
                                      <span className="font-bold text-slate-200 truncate">
                                        {matchedItem.name}:
                                      </span>
                                    </div>
                                    <span className="font-mono font-bold text-emerald-300 shrink-0">
                                      {formatLakhs(entry.value, lang)}
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
                            key={item.chartKey}
                            type="monotone"
                            dataKey={item.chartKey}
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
                frequencyChartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                    {lang === 'my'
                      ? 'ပစ္စည်း မရွေးထားပါ — ဘယ်ဘက်စာရင်းမှ ရွေးချယ်ပါ'
                      : 'No items selected — pick items from the catalog'}
                  </div>
                ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={frequencyChartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      tickLine={false}
                      axisLine={{ stroke: '#CBD5E1' }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={70}
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
                                {formatLakhs(data.totalSpent, lang)}
                              </span>
                            </div>
                            <div className="text-slate-300 flex justify-between gap-4">
                              <span>ပျမ်းမျှ ဈေးနှုန်း:</span>
                              <span className="font-bold font-mono text-amber-300">
                                {formatLakhs(data.avgPrice, lang)}
                              </span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar
                      dataKey="purchases"
                      name={lang === 'my' ? 'ဝယ်ယူခဲ့သည့် အကြိမ်ရေ' : 'Purchases'}
                      radius={[8, 8, 0, 0]}
                      barSize={36}
                    >
                      {/* [v7.5.55 C32] Per-item colours — the old single
                          fill painted every bar indigo. */}
                      {frequencyChartData.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                )
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
              <div className="max-h-72 overflow-y-auto overflow-x-hidden rounded-2xl border border-slate-100 divide-y divide-slate-100">
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
                          {/* [v7.5.63] No truncation — a long item name wraps
                              and the badges drop below it. */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900">{log.itemName}</span>
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
                            {/* [v7.5.55 C9] Trip totals are labelled as
                                totals, never shown as per-unit prices.
                                [v7.5.62] Only when the visible history
                                actually mixes both kinds — otherwise
                                the badge repeats on every row. */}
                            {log.isTripTotal && hasMixedTypes && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 font-bold border border-amber-200">
                                {lang === 'my' ? 'စုစုပေါင်း' : 'Trip Total'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            <span className="font-mono whitespace-nowrap shrink-0">{log.date}</span>
                            {wallet && (
                              <>
                                <span className="shrink-0">•</span>
                                <span className="text-slate-600 whitespace-nowrap">
                                  {lang === 'my' ? wallet.name : wallet.nameEn || wallet.name}
                                </span>
                              </>
                            )}
                          </div>
                          {/* [v7.5.63] Note on its own line — full text, wraps. */}
                          {log.note && (
                            <div className="text-[11px] italic text-slate-500 mt-0.5">{log.note}</div>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-slate-900 block">
                          {formatLakhs(log.unitPrice, lang)}
                        </span>
                        {log.quantity > 1 && (
                          <span className="text-[10px] font-mono text-slate-400 block">
                            (စုစုပေါင်း {formatLakhs(log.totalAmount, lang)})
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
