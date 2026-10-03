import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Tag,
  Sparkles,
  Info,
  Filter,
} from 'lucide-react';
import { Category, Transaction } from '../types';
import { formatMMK } from '../utils/formatters';
import { isTransferTransaction } from '../utils/walletBalance';
import { CategoryIcon } from './CategoryIcon';

interface MonthlySummaryChartProps {
  transactions: Transaction[];
  categories?: Category[];
  lang: 'my' | 'en';
}

export const MonthlySummaryChart: React.FC<MonthlySummaryChartProps> = ({
  transactions,
  categories = [],
  lang,
}) => {
  const [viewMode, setViewMode] = useState<'cashflow' | 'category_cost'>('cashflow');
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [monthRange, setMonthRange] = useState<6 | 12>(6);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');

  // Map of categories
  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  // Group transactions by month (last 6 or 12 months)
  const monthlyData = useMemo(() => {
    const monthsMap: Record<
      string,
      {
        monthKey: string;
        label: string;
        income: number;
        expense: number;
        net: number;
      }
    > = {};

    const now = new Date();
    // Build list of months in chronological order
    for (let i = monthRange - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      const monthLabel = d.toLocaleDateString(lang === 'my' ? 'my-MM' : 'en-US', {
        month: 'short',
        year: monthRange === 12 ? '2-digit' : undefined,
      });

      monthsMap[key] = {
        monthKey: key,
        label: monthLabel,
        income: 0,
        expense: 0,
        net: 0,
      };
    }

    // Populate data with actual transactions (exclude internal transfers)
    transactions.forEach((tx) => {
      if (isTransferTransaction(tx)) return;
      const monthKey = tx.date.slice(0, 7);
      if (monthsMap[monthKey]) {
        if (tx.type === 'income') {
          monthsMap[monthKey].income += tx.amount;
        } else if (tx.type === 'expense') {
          monthsMap[monthKey].expense += tx.amount;
        }
        monthsMap[monthKey].net = monthsMap[monthKey].income - monthsMap[monthKey].expense;
      }
    });

    return Object.values(monthsMap);
  }, [transactions, monthRange, lang]);

  // Calculations for cashflow summary pills
  const totalPeriodIncome = useMemo(
    () => monthlyData.reduce((sum, d) => sum + d.income, 0),
    [monthlyData]
  );
  const totalPeriodExpense = useMemo(
    () => monthlyData.reduce((sum, d) => sum + d.expense, 0),
    [monthlyData]
  );
  const totalPeriodNet = totalPeriodIncome - totalPeriodExpense;

  // Monthly Average Cost per Category Data (over last 6 or 12 months)
  const categoryCostData = useMemo(() => {
    const now = new Date();
    const monthsList: { key: string; label: string }[] = [];

    for (let i = monthRange - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString(lang === 'my' ? 'my-MM' : 'en-US', {
        month: 'short',
        year: monthRange === 12 ? '2-digit' : undefined,
      });
      monthsList.push({ key, label });
    }

    // Month map to store aggregates
    const monthCatMap: Record<
      string,
      {
        monthKey: string;
        label: string;
        avgCost: number;
        totalSpent: number;
        txCount: number;
        itemCount: number;
        [key: string]: any;
      }
    > = {};

    monthsList.forEach((m) => {
      monthCatMap[m.key] = {
        monthKey: m.key,
        label: m.label,
        avgCost: 0,
        totalSpent: 0,
        txCount: 0,
        itemCount: 0,
      };
    });

    // Populate category transaction metrics
    transactions.forEach((tx) => {
      if (tx.type !== 'expense' || isTransferTransaction(tx)) return;
      const monthKey = tx.date.slice(0, 7);
      if (!monthCatMap[monthKey]) return;

      const isCatMatch = selectedCategoryId === 'all' || tx.category === selectedCategoryId;
      if (!isCatMatch) return;

      monthCatMap[monthKey].totalSpent += tx.amount;
      monthCatMap[monthKey].txCount += 1;

      if (tx.items && tx.items.length > 0) {
        monthCatMap[monthKey].itemCount += tx.items.length;
      } else {
        monthCatMap[monthKey].itemCount += 1;
      }
    });

    // Compute average cost
    const result = Object.values(monthCatMap).map((m) => {
      const count = m.itemCount > 0 ? m.itemCount : m.txCount;
      const avgCost = count > 0 ? Math.round(m.totalSpent / count) : 0;
      return {
        ...m,
        avgCost,
      };
    });

    return result;
  }, [transactions, monthRange, lang, selectedCategoryId]);

  // Summary stats for category average cost
  const categoryCostStats = useMemo(() => {
    const validMonths = categoryCostData.filter((d) => d.avgCost > 0);
    if (validMonths.length === 0) {
      return {
        overallAvgCost: 0,
        latestAvgCost: 0,
        deltaPercent: 0,
        highestMonth: null as any,
        lowestMonth: null as any,
      };
    }

    const totalAvgSum = validMonths.reduce((sum, d) => sum + d.avgCost, 0);
    const overallAvgCost = Math.round(totalAvgSum / validMonths.length);

    const latest = categoryCostData[categoryCostData.length - 1];
    const prev = categoryCostData.length >= 2 ? categoryCostData[categoryCostData.length - 2] : null;

    const latestAvgCost = latest ? latest.avgCost : 0;
    const prevAvgCost = prev ? prev.avgCost : 0;

    const deltaPercent =
      prevAvgCost > 0 && latestAvgCost > 0
        ? Math.round(((latestAvgCost - prevAvgCost) / prevAvgCost) * 100)
        : 0;

    // Highest and lowest
    const sorted = [...validMonths].sort((a, b) => b.avgCost - a.avgCost);
    const highestMonth = sorted[0];
    const lowestMonth = sorted[sorted.length - 1];

    return {
      overallAvgCost,
      latestAvgCost,
      deltaPercent,
      highestMonth,
      lowestMonth,
    };
  }, [categoryCostData]);

  // Selected Category info
  const currentSelectedCategory = useMemo(() => {
    if (selectedCategoryId === 'all') return null;
    return catMap.get(selectedCategoryId) || null;
  }, [selectedCategoryId, catMap]);

  // Custom Tooltip for Cashflow Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      return (
        <div className="bg-white p-3.5 rounded-xl shadow-lg border border-slate-200 text-xs space-y-2 min-w-[180px]">
          <div className="font-bold text-slate-800 border-b border-slate-100 pb-1.5 flex items-center justify-between">
            <span>{label}</span>
            <span className="text-[10px] text-slate-400 font-mono">{data?.monthKey}</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-emerald-700">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                {lang === 'my' ? 'ဝင်ငွေ:' : 'Income:'}
              </span>
              <span className="font-bold font-mono">+{formatMMK(data?.income || 0)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-rose-700">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                {lang === 'my' ? 'ထွက်ငွေ:' : 'Expense:'}
              </span>
              <span className="font-bold font-mono">-{formatMMK(data?.expense || 0)}</span>
            </div>
            <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between gap-3 font-semibold">
              <span className="text-slate-600">{lang === 'my' ? 'အသားတင်:' : 'Net:'}</span>
              <span className={`font-mono ${data?.net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {data?.net >= 0 ? '+' : ''}
                {formatMMK(data?.net || 0)}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Category Cost Recharts
  const CategoryCostTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      return (
        <div className="bg-white p-3.5 rounded-xl shadow-lg border border-slate-200 text-xs space-y-2 min-w-[200px]">
          <div className="font-bold text-slate-800 border-b border-slate-100 pb-1.5 flex items-center justify-between">
            <span>{label}</span>
            <span className="text-[10px] text-slate-400 font-mono">{data?.monthKey}</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-indigo-700">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" />
                {lang === 'my' ? 'ပျမ်းမျှ ကုန်ကျစရိတ်:' : 'Avg Cost / Item:'}
              </span>
              <span className="font-bold font-mono">{formatMMK(data?.avgCost || 0)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-slate-600">
              <span>{lang === 'my' ? 'စုစုပေါင်း သုံးစွဲငွေ:' : 'Total Spent:'}</span>
              <span className="font-bold font-mono text-slate-900">{formatMMK(data?.totalSpent || 0)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-slate-500 text-[11px] pt-1 border-t border-slate-100">
              <span>{lang === 'my' ? 'ဝယ်ယူမှု အကြိမ်/ပစ္စည်း:' : 'Entries / Items:'}</span>
              <span className="font-mono font-bold text-slate-700">{data?.itemCount || data?.txCount || 0}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
      {/* Top Header & Main Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${
              viewMode === 'cashflow'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                : 'bg-indigo-50 text-indigo-700 border-indigo-100'
            }`}
          >
            {viewMode === 'cashflow' ? (
              <BarChart3 className="w-5 h-5" />
            ) : (
              <TrendingUp className="w-5 h-5" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
              <span>
                {viewMode === 'cashflow'
                  ? lang === 'my'
                    ? 'လစဉ် ဝင်ငွေ/ထွက်ငွေ ဇယား (Monthly Cashflow)'
                    : 'Monthly Income & Expense Chart'
                  : lang === 'my'
                  ? '၆ လတာ ကဏ္ဍအလိုက် ပျမ်းမျှ ကုန်ကျစရိတ် & ဈေးနှုန်းအတက်အကျ (Category Cost Fluctuation)'
                  : '6-Month Average Cost & Price Fluctuation per Category'}
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              {viewMode === 'cashflow'
                ? lang === 'my'
                  ? `လအလိုက် ဝင်ငွေ၊ ထွက်ငွေနှင့် အသားတင် ပိုငွေများကို စိစစ်ခြင်း (${monthRange} လတာ)`
                  : `Compare inflow vs outflow trends and net savings over ${monthRange} months`
                : lang === 'my'
                ? `ကုန်ဈေးနှုန်း အတက်အကျနှင့် ပျမ်းမျှ ကုန်ကျစရိတ် အခြေအနေများကို စိစစ်ခြင်း (${monthRange} လတာ)`
                : `Identify price fluctuations and average cost trends across categories over ${monthRange} months`}
            </p>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-xs font-bold self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('cashflow')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              viewMode === 'cashflow'
                ? 'bg-white text-emerald-800 shadow-2xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {lang === 'my' ? '💵 ဝင်ငွေ/ထွက်ငွေ' : '💵 Cashflow'}
          </button>
          <button
            type="button"
            onClick={() => setViewMode('category_cost')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              viewMode === 'category_cost'
                ? 'bg-white text-indigo-800 shadow-2xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {lang === 'my' ? '📈 ကဏ္ဍ ပျမ်းမျှစရိတ် (၆ လ)' : '📈 Category Cost (6 Mo)'}
          </button>
        </div>
      </div>

      {/* Secondary Controls: Category Filter (when in category_cost) & Range / Chart Type */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {viewMode === 'category_cost' ? (
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-indigo-600" />
              <span>{lang === 'my' ? 'ကဏ္ဍ ရွေးချယ်ပါ:' : 'Filter Category:'}</span>
            </label>
            <select
              id="select-category-cost-filter"
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="text-xs font-bold px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs cursor-pointer"
            >
              <option value="all">
                {lang === 'my' ? '📁 ကဏ္ဍ အားလုံး (All Categories)' : '📁 All Categories'}
              </option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {lang === 'my' ? cat.name : cat.nameEn}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div />
        )}

        {/* Range & Type toggles */}
        <div className="flex items-center gap-2">
          {/* 6 Mo vs 12 Mo */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMonthRange(6)}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                monthRange === 6
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang === 'my' ? '၆ လ' : '6 Mo'}
            </button>
            <button
              type="button"
              onClick={() => setMonthRange(12)}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                monthRange === 12
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang === 'my' ? '၁၂ လ' : '12 Mo'}
            </button>
          </div>

          {/* Bar vs Line chart */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setChartType('bar')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                chartType === 'bar'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title={lang === 'my' ? 'ဒေါင်လိုက် ဇယား' : 'Bar Chart'}
            >
              {lang === 'my' ? 'တိုင်ဇယား' : 'Bar'}
            </button>
            <button
              type="button"
              onClick={() => setChartType('line')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                chartType === 'line'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title={lang === 'my' ? 'မျဉ်းကွေး ဇယား' : 'Line Trend'}
            >
              {lang === 'my' ? 'မျဉ်းဇယား' : 'Trend'}
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'cashflow' ? (
        <>
          {/* Mini Stat Summaries for Cashflow */}
          <div className="grid grid-cols-3 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 text-left">
              <span className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider block">
                {lang === 'my' ? 'ကာလတွင်း ဝင်ငွေစုစုပေါင်း' : 'Total Inflow'}
              </span>
              <span className="text-xs sm:text-sm font-bold text-emerald-900 font-mono mt-0.5 block">
                +{formatMMK(totalPeriodIncome)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-100 text-left">
              <span className="text-[10px] font-semibold text-rose-800 uppercase tracking-wider block">
                {lang === 'my' ? 'ကာလတွင်း ထွက်ငွေစုစုပေါင်း' : 'Total Outflow'}
              </span>
              <span className="text-xs sm:text-sm font-bold text-rose-900 font-mono mt-0.5 block">
                -{formatMMK(totalPeriodExpense)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-left">
              <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider block">
                {lang === 'my' ? 'အသားတင် ပိုငွေ/လိုငွေ' : 'Net Surplus'}
              </span>
              <span
                className={`text-xs sm:text-sm font-bold font-mono mt-0.5 block ${
                  totalPeriodNet >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {totalPeriodNet >= 0 ? '+' : ''}
                {formatMMK(totalPeriodNet)}
              </span>
            </div>
          </div>

          {/* Recharts Cashflow Container */}
          <div className="w-full h-64 sm:h-72 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart
                  data={monthlyData}
                  margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    axisLine={{ stroke: '#CBD5E1' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#64748B' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => {
                      if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                      if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                      return val;
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
                    formatter={(val) => {
                      if (val === 'income') return lang === 'my' ? 'ဝင်ငွေ (Income)' : 'Income';
                      if (val === 'expense') return lang === 'my' ? 'ထွက်ငွေ (Expense)' : 'Expense';
                      return val;
                    }}
                  />
                  <Bar
                    dataKey="income"
                    fill="#10B981"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={36}
                  />
                  <Bar
                    dataKey="expense"
                    fill="#F43F5E"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={36}
                  />
                </BarChart>
              ) : (
                <LineChart
                  data={monthlyData}
                  margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    axisLine={{ stroke: '#CBD5E1' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#64748B' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => {
                      if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                      if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                      return val;
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
                    formatter={(val) => {
                      if (val === 'income') return lang === 'my' ? 'ဝင်ငွေ' : 'Income';
                      if (val === 'expense') return lang === 'my' ? 'ထွက်ငွေ' : 'Expense';
                      if (val === 'net') return lang === 'my' ? 'အသားတင်' : 'Net';
                      return val;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="income"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#10B981' }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="expense"
                    stroke="#F43F5E"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#F43F5E' }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="net"
                    stroke="#6366F1"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 3, fill: '#6366F1' }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        /* Category Average Cost View */
        <>
          {/* Mini Stat Summaries for Category Average Cost */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 text-left">
              <span className="text-[10px] font-semibold text-indigo-800 uppercase tracking-wider block">
                {lang === 'my' ? `${monthRange} လတာ ပျမ်းမျှ ကုန်ကျစရိတ်` : `${monthRange}-Month Average Cost`}
              </span>
              <span className="text-xs sm:text-sm font-bold text-indigo-950 font-mono mt-0.5 block">
                {formatMMK(categoryCostStats.overallAvgCost)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-left">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
                  {lang === 'my' ? 'ယခုလ ပျမ်းမျှစရိတ်' : 'Current Month Avg'}
                </span>
                {categoryCostStats.deltaPercent !== 0 && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      categoryCostStats.deltaPercent > 0
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {categoryCostStats.deltaPercent > 0 ? '▲ +' : '▼ '}
                    {categoryCostStats.deltaPercent}%
                  </span>
                )}
              </div>
              <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono mt-0.5 block">
                {formatMMK(categoryCostStats.latestAvgCost)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-left">
              <span className="text-[10px] font-semibold text-amber-800 uppercase tracking-wider block">
                {lang === 'my' ? 'ဈေးနှုန်း အတက်အကျ အခြေအနေ' : 'Price Trend Indication'}
              </span>
              <span className="text-xs font-bold text-amber-950 mt-0.5 block">
                {categoryCostStats.deltaPercent > 5 ? (
                  <span className="text-rose-700 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>{lang === 'my' ? 'ဈေးနှုန်း မြင့်တက်နေသည်' : 'Price Rise Alert (+)'}</span>
                  </span>
                ) : categoryCostStats.deltaPercent < -5 ? (
                  <span className="text-emerald-700 flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5" />
                    <span>{lang === 'my' ? 'ဈေးနှုန်း ကျဆင်း/သက်သာသည်' : 'Price Decreased (-)'}</span>
                  </span>
                ) : (
                  <span className="text-slate-700 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{lang === 'my' ? 'ဈေးနှုန်း တည်ငြိမ်နေသည်' : 'Stable Price Range'}</span>
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Category Cost Recharts Container */}
          <div className="w-full h-64 sm:h-72 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart
                  data={categoryCostData}
                  margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    axisLine={{ stroke: '#CBD5E1' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#64748B' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => {
                      if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                      if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                      return val;
                    }}
                  />
                  <Tooltip content={<CategoryCostTooltip />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
                    formatter={() =>
                      lang === 'my'
                        ? 'လစဉ် ပျမ်းမျှ ကုန်ကျစရိတ် (Avg Cost / Item)'
                        : 'Avg Cost / Item'
                    }
                  />
                  <Bar
                    dataKey="avgCost"
                    fill="#6366F1"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              ) : (
                <LineChart
                  data={categoryCostData}
                  margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    axisLine={{ stroke: '#CBD5E1' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#64748B' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => {
                      if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                      if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                      return val;
                    }}
                  />
                  <Tooltip content={<CategoryCostTooltip />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
                    formatter={() =>
                      lang === 'my'
                        ? 'လစဉ် ပျမ်းမျှ ကုန်ကျစရိတ် Trend'
                        : 'Avg Cost Trend Line'
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="avgCost"
                    stroke="#6366F1"
                    strokeWidth={3}
                    dot={{ r: 5, fill: '#6366F1', stroke: '#FFFFFF', strokeWidth: 2 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
};

