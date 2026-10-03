import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  Layers,
  ArrowRight,
  ArrowUpDown,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Category, Transaction, Wallet } from '../types';
import { formatMMK } from '../utils/formatters';
import { convertToMMK } from '../utils/currency';
import { isTransferTransaction, buildWalletMap, isWalletMatch } from '../utils/walletBalance';
import { CategoryIcon } from './CategoryIcon';

interface MonthlyComparisonCardProps {
  transactions: Transaction[];
  categories?: Category[];
  wallets?: Wallet[];
  lang: 'my' | 'en';
  onViewDetails?: () => void;
}

const MONTH_NAMES_MY = [
  'ဇန်နဝါရီ',
  'ဖေဖော်ဝါရီ',
  'မတ်',
  'ဧပြီ',
  'မေ',
  'ဇွန်',
  'ဇူလိုင်',
  'သြဂုတ်',
  'စက်တင်ဘာ',
  'အောက်တိုဘာ',
  'နိုဝင်ဘာ',
  'ဒီဇင်ဘာ',
];

const MONTH_NAMES_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const MonthlyComparisonCard: React.FC<MonthlyComparisonCardProps> = ({
  transactions,
  categories = [],
  wallets = [],
  lang,
  onViewDetails,
}) => {
  const [viewType, setViewType] = useState<'overall' | 'categories'>('overall');
  const [comparisonPeriod, setComparisonPeriod] = useState<'full' | 'toDate'>('full');

  // Determine current month & previous month
  const today = useMemo(() => new Date(), []);
  const currentYear = today.getFullYear();
  const currentMonthIdx = today.getMonth(); // 0 - 11
  const currentDay = today.getDate();

  const prevMonthDate = useMemo(() => {
    return new Date(currentYear, currentMonthIdx - 1, 1);
  }, [currentYear, currentMonthIdx]);

  const prevYear = prevMonthDate.getFullYear();
  const prevMonthIdx = prevMonthDate.getMonth();

  const currentMonthKey = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}`;
  const prevMonthKey = `${prevYear}-${String(prevMonthIdx + 1).padStart(2, '0')}`;

  const currentMonthLabel = lang === 'my'
    ? `${MONTH_NAMES_MY[currentMonthIdx]} ${currentYear}`
    : `${MONTH_NAMES_EN[currentMonthIdx]} ${currentYear}`;

  const prevMonthLabel = lang === 'my'
    ? `${MONTH_NAMES_MY[prevMonthIdx]} ${prevYear}`
    : `${MONTH_NAMES_EN[prevMonthIdx]} ${prevYear}`;

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const walletMap = useMemo(() => buildWalletMap(wallets), [wallets]);

  const convertTxToMMK = useMemo(() => {
    return (tx: Transaction) => {
      let w = walletMap.get(tx.walletId);
      if (!w) {
        w = wallets.find((wall) => isWalletMatch(wall, tx.walletId));
      }
      return convertToMMK(tx.amount, w?.currency, w?.exchangeRate);
    };
  }, [walletMap, wallets]);

  // Filter transactions for previous month & this month
  const {
    prevMonthTotal,
    thisMonthTotal,
    categoryComparisonData,
    prevDayCount,
  } = useMemo(() => {
    let pTotal = 0;
    let cTotal = 0;
    const pCatMap: Record<string, number> = {};
    const cCatMap: Record<string, number> = {};

    transactions.forEach((tx) => {
      if (isTransferTransaction(tx)) return;
      if (tx.type !== 'expense') return;

      const txDate = tx.date;
      const txMonth = txDate.slice(0, 7);
      const txDay = parseInt(txDate.slice(8, 10), 10) || 1;

      // Handle "toDate" mode (only compare up to currentDay of each month)
      if (comparisonPeriod === 'toDate' && txDay > currentDay) {
        return;
      }

      const amtMMK = convertTxToMMK(tx);

      if (txMonth === currentMonthKey) {
        cTotal += amtMMK;
        cCatMap[tx.category] = (cCatMap[tx.category] || 0) + amtMMK;
      } else if (txMonth === prevMonthKey) {
        pTotal += amtMMK;
        pCatMap[tx.category] = (pCatMap[tx.category] || 0) + amtMMK;
      }
    });

    // Build category comparison items
    const allCatKeys = Array.from(new Set([...Object.keys(pCatMap), ...Object.keys(cCatMap)]));
    const catList = allCatKeys.map((catId) => {
      const cat = catMap.get(catId);
      const pAmount = pCatMap[catId] || 0;
      const cAmount = cCatMap[catId] || 0;
      const diff = cAmount - pAmount;
      return {
        id: catId,
        name: lang === 'my' ? (cat?.name || catId) : (cat?.nameEn || cat?.name || catId),
        color: cat?.color || '#6366F1',
        icon: cat?.icon || 'Tag',
        prevAmount: pAmount,
        thisAmount: cAmount,
        diff,
        maxAmount: Math.max(pAmount, cAmount),
      };
    });

    // Sort by largest spending and take top 5
    catList.sort((a, b) => b.maxAmount - a.maxAmount);
    const topCats = catList.slice(0, 5);

    return {
      prevMonthTotal: pTotal,
      thisMonthTotal: cTotal,
      categoryComparisonData: topCats,
      prevDayCount: currentDay,
    };
  }, [transactions, currentMonthKey, prevMonthKey, comparisonPeriod, currentDay, catMap, lang]);

  const diffAmount = thisMonthTotal - prevMonthTotal;
  const isSpendingIncreased = diffAmount > 0;
  const isSpendingDecreased = diffAmount < 0;
  const percentChange = prevMonthTotal > 0
    ? Math.abs(Math.round((diffAmount / prevMonthTotal) * 100))
    : thisMonthTotal > 0
    ? 100
    : 0;

  // Chart data for Overall view
  const overallBarData = useMemo(() => {
    return [
      {
        month: prevMonthLabel,
        shortLabel: lang === 'my' ? 'ပြီးခဲ့သည့်လ' : 'Prev Month',
        spending: prevMonthTotal,
        color: '#94A3B8', // slate-400
        periodName: prevMonthLabel,
      },
      {
        month: currentMonthLabel,
        shortLabel: lang === 'my' ? 'ယခုလ' : 'This Month',
        spending: thisMonthTotal,
        color: isSpendingIncreased ? '#F43F5E' : '#10B981', // rose-500 if increased, emerald-500 if decreased
        periodName: currentMonthLabel,
      },
    ];
  }, [prevMonthLabel, currentMonthLabel, prevMonthTotal, thisMonthTotal, isSpendingIncreased, lang]);

  // Chart data for Category breakdown view
  const categoryBarData = useMemo(() => {
    return categoryComparisonData.map((item) => ({
      category: item.name,
      icon: item.icon,
      color: item.color,
      prevSpending: item.prevAmount,
      thisSpending: item.thisAmount,
      diff: item.diff,
    }));
  }, [categoryComparisonData]);

  // Custom Tooltip for Overall Bar Chart
  const CustomOverallTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white px-3.5 py-2.5 rounded-xl shadow-xl border border-slate-700/80 text-xs space-y-1 z-50">
          <div className="font-bold text-slate-200">{data.periodName}</div>
          <div className="flex items-center gap-1.5 text-sm font-black text-white">
            <span>{formatMMK(data.spending)}</span>
          </div>
          <div className="text-[10px] text-slate-400">
            {comparisonPeriod === 'toDate'
              ? (lang === 'my' ? `ရက်စွဲ ၁ မှ ${currentDay} အထိ` : `Day 1 to ${currentDay}`)
              : (lang === 'my' ? 'တစ်လလုံး စုစုပေါင်း' : 'Full Month Total')}
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Category Comparison Bar Chart
  const CustomCategoryTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const prevVal = payload.find((p: any) => p.dataKey === 'prevSpending')?.value || 0;
      const thisVal = payload.find((p: any) => p.dataKey === 'thisSpending')?.value || 0;
      const catDiff = thisVal - prevVal;

      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-xl shadow-xl border border-slate-700/80 text-xs space-y-1.5 z-50 min-w-[190px]">
          <div className="font-bold text-slate-200 border-b border-slate-800 pb-1 flex items-center justify-between">
            <span>{label}</span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-400 inline-block"></span>
              <span>{lang === 'my' ? 'ပြီးခဲ့သည့်လ:' : 'Prev Month:'}</span>
            </span>
            <span className="font-semibold text-slate-200">{formatMMK(prevVal)}</span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block"></span>
              <span>{lang === 'my' ? 'ယခုလ:' : 'This Month:'}</span>
            </span>
            <span className="font-semibold text-indigo-300">{formatMMK(thisVal)}</span>
          </div>
          <div className="pt-1 border-t border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">{lang === 'my' ? 'ကွာခြားချက်:' : 'Difference:'}</span>
            <span className={`font-bold ${catDiff > 0 ? 'text-rose-400' : catDiff < 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
              {catDiff > 0 ? `+${formatMMK(catDiff)}` : catDiff < 0 ? `-${formatMMK(Math.abs(catDiff))}` : '0 MMK'}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100/80 flex items-center justify-center text-indigo-600 shrink-0">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 tracking-tight">
                {lang === 'my' ? 'လအလိုက် အသုံးစရိတ် နှိုင်းယှဉ်ချက်' : 'Monthly Spending Comparison'}
              </h3>
              <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                MoM
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {prevMonthLabel} vs {currentMonthLabel}
            </p>
          </div>
        </div>

        {/* View Controls & Scope Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* To-Date vs Full Month Toggle */}
          <div className="bg-slate-100 p-0.5 rounded-xl flex items-center text-xs">
            <button
              type="button"
              onClick={() => setComparisonPeriod('full')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                comparisonPeriod === 'full'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title={lang === 'my' ? 'တစ်လလုံး စုစုပေါင်း နှိုင်းယှဉ်ချက်' : 'Compare entire months'}
            >
              {lang === 'my' ? 'တစ်လလုံး' : 'Full Month'}
            </button>
            <button
              type="button"
              onClick={() => setComparisonPeriod('toDate')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                comparisonPeriod === 'toDate'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title={lang === 'my' ? `ရက်စွဲ ၁ မှ ${currentDay} အထိသာ နှိုင်းယှဉ်ချက်` : `Compare Day 1-${currentDay} like-for-like`}
            >
              {lang === 'my' ? `၁-${currentDay} ရက်ထိ` : `To Date (D1-${currentDay})`}
            </button>
          </div>

          {/* Mode Switch (Overall vs Categories) */}
          <div className="bg-slate-100 p-0.5 rounded-xl flex items-center text-xs">
            <button
              type="button"
              onClick={() => setViewType('overall')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                viewType === 'overall'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {lang === 'my' ? 'ခြုံငုံ' : 'Total'}
            </button>
            <button
              type="button"
              onClick={() => setViewType('categories')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                viewType === 'categories'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {lang === 'my' ? 'ကဏ္ဍများ' : 'Categories'}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Previous Month Card */}
        <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/70">
          <div className="text-[11px] font-semibold text-slate-500 truncate flex items-center justify-between">
            <span>{prevMonthLabel}</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-slate-200/70 text-slate-600 rounded font-medium">
              {lang === 'my' ? 'ပြီးခဲ့သည့်လ' : 'Previous'}
            </span>
          </div>
          <div className="text-base sm:text-lg font-black text-slate-800 mt-1 font-mono">
            {formatMMK(prevMonthTotal)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {comparisonPeriod === 'toDate'
              ? (lang === 'my' ? `ရက်စွဲ ၁ မှ ${currentDay} အထိ` : `Day 1 - ${currentDay}`)
              : (lang === 'my' ? 'တစ်လလုံး စုစုပေါင်း' : 'Full Month')}
          </div>
        </div>

        {/* This Month Card */}
        <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/70">
          <div className="text-[11px] font-semibold text-slate-500 truncate flex items-center justify-between">
            <span>{currentMonthLabel}</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-indigo-100 text-indigo-700 rounded font-medium">
              {lang === 'my' ? 'ယခုလ' : 'Current'}
            </span>
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 mt-1 font-mono">
            {formatMMK(thisMonthTotal)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {comparisonPeriod === 'toDate'
              ? (lang === 'my' ? `ရက်စွဲ ၁ မှ ${currentDay} အထိ` : `Day 1 - ${currentDay}`)
              : (lang === 'my' ? 'လက်ရှိအချိန်အထိ' : 'Month to date')}
          </div>
        </div>

        {/* Variance / Difference Card */}
        <div className={`rounded-xl p-3 border ${
          isSpendingDecreased
            ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-950'
            : isSpendingIncreased
            ? 'bg-rose-50/70 border-rose-200/80 text-rose-950'
            : 'bg-slate-50/80 border-slate-200/70 text-slate-800'
        }`}>
          <div className="text-[11px] font-semibold flex items-center justify-between">
            <span className={isSpendingDecreased ? 'text-emerald-800' : isSpendingIncreased ? 'text-rose-800' : 'text-slate-600'}>
              {lang === 'my' ? 'ကွာခြားချက် (Change)' : 'Variance'}
            </span>
            <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${
              isSpendingDecreased
                ? 'bg-emerald-200/80 text-emerald-900'
                : isSpendingIncreased
                ? 'bg-rose-200/80 text-rose-900'
                : 'bg-slate-200 text-slate-700'
            }`}>
              {isSpendingDecreased && <TrendingDown className="w-3 h-3 stroke-[2.5]" />}
              {isSpendingIncreased && <TrendingUp className="w-3 h-3 stroke-[2.5]" />}
              <span>{isSpendingIncreased ? `+${percentChange}%` : isSpendingDecreased ? `-${percentChange}%` : '0%'}</span>
            </span>
          </div>

          <div className={`text-base sm:text-lg font-black mt-1 font-mono ${
            isSpendingDecreased ? 'text-emerald-700' : isSpendingIncreased ? 'text-rose-700' : 'text-slate-800'
          }`}>
            {isSpendingIncreased ? `+${formatMMK(diffAmount)}` : isSpendingDecreased ? `-${formatMMK(Math.abs(diffAmount))}` : '0 MMK'}
          </div>

          <div className="text-[11px] mt-0.5">
            {isSpendingDecreased ? (
              <span className="text-emerald-700 font-medium">
                🎉 {lang === 'my' ? 'အသုံးစရိတ် သက်သာခဲ့သည်' : 'Lower spending (Saved)'}
              </span>
            ) : isSpendingIncreased ? (
              <span className="text-rose-700 font-medium">
                ⚠️ {lang === 'my' ? 'ပိုမိုသုံးစွဲထားသည်' : 'Higher spending'}
              </span>
            ) : (
              <span className="text-slate-500 font-medium">
                {lang === 'my' ? 'အတိအကျ တူညီပါသည်' : 'Identical spending'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Recharts Bar Chart Area */}
      {prevMonthTotal === 0 && thisMonthTotal === 0 ? (
        <div className="py-10 text-center rounded-xl bg-slate-50/60 border border-dashed border-slate-200 space-y-2">
          <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-xs text-slate-500 font-medium">
            {lang === 'my'
              ? 'ပြီးခဲ့သည့်လနှင့် ယခုလအတွက် ထွက်ငွေစာရင်း မှတ်တမ်း မရှိသေးပါ'
              : 'No expense records found for this month or previous month.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {viewType === 'overall' ? (
            /* Mode 1: Overall Bar Chart */
            <div>
              <div className="h-56 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overallBarData} margin={{ top: 15, right: 15, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis
                      dataKey="shortLabel"
                      tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }}
                      axisLine={{ stroke: '#E2E8F0' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#94A3B8', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => {
                        if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                        if (val >= 1000) return `${Math.round(val / 1000)}k`;
                        return `${val}`;
                      }}
                    />
                    <Tooltip content={<CustomOverallTooltip />} cursor={{ fill: '#F8FAFC' }} />
                    <Bar
                      dataKey="spending"
                      name={lang === 'my' ? 'အသုံးစရိတ်' : 'Spending'}
                      radius={[8, 8, 0, 0]}
                      maxBarSize={64}
                    >
                      {overallBarData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Chart Legend & Context Note */}
              <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 flex-wrap gap-2">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-md bg-slate-400 inline-block"></span>
                    <span className="font-medium text-slate-600">{prevMonthLabel}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-3 h-3 rounded-md inline-block ${isSpendingIncreased ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
                    <span className="font-medium text-slate-800">{currentMonthLabel}</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400">
                  {comparisonPeriod === 'toDate'
                    ? (lang === 'my' ? `* နှိုင်းယှဉ်ရက်စွဲ: ၁ မှ ${currentDay} ရက်အထိသာ` : `* Comparison up to day ${currentDay}`)
                    : (lang === 'my' ? '* တစ်လလုံး စုစုပေါင်း အသုံးစရိတ်' : '* Full calendar month totals')}
                </div>
              </div>
            </div>
          ) : (
            /* Mode 2: Category Breakdown Bar Chart */
            <div>
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={categoryBarData}
                    margin={{ top: 15, right: 15, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis
                      dataKey="category"
                      tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }}
                      axisLine={{ stroke: '#E2E8F0' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#94A3B8', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => {
                        if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                        if (val >= 1000) return `${Math.round(val / 1000)}k`;
                        return `${val}`;
                      }}
                    />
                    <Tooltip content={<CustomCategoryTooltip />} cursor={{ fill: '#F8FAFC' }} />
                    <Legend
                      wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                      formatter={(val) => (
                        <span className="text-slate-700 font-medium">
                          {val === 'prevSpending' ? prevMonthLabel : currentMonthLabel}
                        </span>
                      )}
                    />
                    <Bar
                      dataKey="prevSpending"
                      name="prevSpending"
                      fill="#94A3B8"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={32}
                    />
                    <Bar
                      dataKey="thisSpending"
                      name="thisSpending"
                      fill="#6366F1"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={32}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Category Breakdown Details Mini-List */}
              <div className="pt-2 border-t border-slate-100 divide-y divide-slate-100">
                {categoryComparisonData.map((cat) => {
                  const catDiff = cat.thisAmount - cat.prevAmount;
                  const catPercent = cat.prevAmount > 0
                    ? Math.round((Math.abs(catDiff) / cat.prevAmount) * 100)
                    : cat.thisAmount > 0 ? 100 : 0;

                  return (
                    <div key={cat.id} className="py-2 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-5 h-5 rounded-md flex items-center justify-center text-white shrink-0"
                          style={{ backgroundColor: cat.color }}
                        >
                          <CategoryIcon name={cat.icon} className="w-3 h-3" />
                        </span>
                        <span className="font-semibold text-slate-800 truncate">{cat.name}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-slate-400 font-mono text-[11px] block">
                            {formatMMK(cat.prevAmount)} → <span className="text-slate-800 font-bold">{formatMMK(cat.thisAmount)}</span>
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                          catDiff > 0
                            ? 'bg-rose-100 text-rose-700'
                            : catDiff < 0
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {catDiff > 0 ? `+${catPercent}%` : catDiff < 0 ? `-${catPercent}%` : '0%'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Insight Summary Banner & Deep-Dive Link */}
      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2 text-xs text-slate-600">
          <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            {lang === 'my' ? (
              <span>
                {comparisonPeriod === 'toDate' ? `ယခုလ ${currentDay} ရက်အထိ ` : 'ယခုလ '}
                အသုံးစရိတ်သည် ပြီးခဲ့သည့်လနှင့် နှိုင်းယှဉ်ပါက{' '}
                <strong className={isSpendingDecreased ? 'text-emerald-700' : isSpendingIncreased ? 'text-rose-700' : 'text-slate-800'}>
                  {formatMMK(Math.abs(diffAmount))} ({percentChange}%)
                </strong>{' '}
                {isSpendingDecreased
                  ? 'လျော့နည်းပြီး ချွေတာနိုင်ခဲ့ပါသည် 🎉'
                  : isSpendingIncreased
                  ? 'ပိုမိုသုံးစွဲထားပါသည် 💡'
                  : 'ညီမျှနေပါသည်'}
              </span>
            ) : (
              <span>
                Spending this month is{' '}
                <strong className={isSpendingDecreased ? 'text-emerald-700' : isSpendingIncreased ? 'text-rose-700' : 'text-slate-800'}>
                  {formatMMK(Math.abs(diffAmount))} ({percentChange}%)
                </strong>{' '}
                {isSpendingDecreased
                  ? 'lower than last month (great job!)'
                  : isSpendingIncreased
                  ? 'higher than last month'
                  : 'identical to last month'}
                {comparisonPeriod === 'toDate' ? ` (comparing Day 1 to ${currentDay}).` : '.'}
              </span>
            )}
          </div>
        </div>

        {onViewDetails && (
          <button
            type="button"
            onClick={onViewDetails}
            className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline shrink-0 cursor-pointer"
          >
            <span>{lang === 'my' ? 'အသေးစိတ် စိစစ်ရန်' : 'Detailed Analysis'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
