import React, { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, BarChart3, Calendar, Layers, Tag } from 'lucide-react';
import { Transaction, Category } from '../types';
import { formatMMK } from '../utils/formatters';
import { isTransferTransaction } from '../utils/walletBalance';

interface CategorySpendingTrendLineChartProps {
  transactions: Transaction[];
  categories: Category[];
  lang: 'my' | 'en';
}

export const CategorySpendingTrendLineChart: React.FC<CategorySpendingTrendLineChartProps> = ({
  transactions,
  categories,
  lang,
}) => {
  const [selectedTopCount, setSelectedTopCount] = useState<number>(4);

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  // 1. Determine last 6 months in chronological order
  const lastSixMonths = useMemo(() => {
    const months: { key: string; label: string }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthsMy = ['ဇန်', 'ဖေဖော်', 'မတ်', 'ဧပြီ', 'မေ', 'ဇွန်', 'ဇူလိုင်', 'သြဂုတ်', 'စက်', 'အောက်', 'နို', 'ဒီဇ'];
      const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const label = lang === 'my' ? monthsMy[d.getMonth()] : monthsEn[d.getMonth()];
      months.push({ key, label });
    }
    return months;
  }, [lang]);

  // 2. Find top expense categories across the last 6 months
  const topCategories = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    transactions.forEach((t) => {
      if (t.type !== 'expense' || isTransferTransaction(t)) return;
      const monthKey = t.date?.slice(0, 7);
      const isInLast6 = lastSixMonths.some((m) => m.key === monthKey);
      if (!isInLast6) return;

      const catId = t.category || 'other';
      categoryTotals[catId] = (categoryTotals[catId] || 0) + (Number(t.amount) || 0);
    });

    const sorted = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([catId]) => catId);

    return sorted.slice(0, selectedTopCount);
  }, [transactions, lastSixMonths, selectedTopCount]);

  // 3. Build chart data array with monthly spending per top category
  const chartData = useMemo(() => {
    return lastSixMonths.map((m) => {
      const row: any = { month: m.label, monthKey: m.key };
      let totalMonthExpense = 0;

      topCategories.forEach((catId) => {
        const cat = catMap.get(catId);
        const catName = lang === 'my' ? (cat?.name || catId) : (cat?.nameEn || catId);

        const sum = transactions
          .filter((t) => t.type === 'expense' && !isTransferTransaction(t) && t.date?.startsWith(m.key) && (t.category === catId))
          .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

        row[catName] = sum;
        totalMonthExpense += sum;
      });

      row[lang === 'my' ? 'စုစုပေါင်းထွက်ငွေ' : 'Total Expense'] = totalMonthExpense;
      return row;
    });
  }, [lastSixMonths, topCategories, transactions, catMap, lang]);

  const categoryColors = ['#10B981', '#6366F1', '#EC4899', '#F59E0B', '#3B82F6', '#8B5CF6'];

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-4 sm:p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 shadow-2xs">
            <TrendingUp className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="font-bold text-xs sm:text-sm text-slate-900">
              {lang === 'my' ? 'လွန်ခဲ့သော ၆ လအတွင်း အမျိုးအစားအလိုက် ထွက်ငွေ Trends' : '6-Month Spending Trends Across Categories'}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              {lang === 'my' ? 'အချိန်ကာလအလိုက် ငွေကြေးသုံးစွဲမှု တိုးတက်ခြင်း/လျော့နည်းခြင်း လမ်းကြောင်း' : 'Visualize financial growth or decline over the last 6 months'}
            </p>
          </div>
        </div>

        {/* Top Count Selector Chips */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto border border-slate-200/80">
          {[3, 4, 5].map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => setSelectedTopCount(count)}
              className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${
                selectedTopCount === count
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {count} {lang === 'my' ? 'ကဏ္ဍ' : 'Top Categories'}
            </button>
          ))}
        </div>
      </div>

      {/* Recharts Line Chart */}
      <div className="w-full h-64 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} tickLine={false} />
            <YAxis
              stroke="#94A3B8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => (v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
            />
            <Tooltip
              formatter={(value: any, name: any) => [formatMMK(Number(value) || 0), name]}
              contentStyle={{
                backgroundColor: '#1E293B',
                borderRadius: '16px',
                color: '#fff',
                border: 'none',
                fontSize: '12px',
                padding: '10px 14px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />

            {/* Total Expense Line */}
            <Line
              type="monotone"
              dataKey={lang === 'my' ? 'စုစုပေါင်းထွက်ငွေ' : 'Total Expense'}
              stroke="#EF4444"
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />

            {/* Top Category Lines */}
            {topCategories.map((catId, idx) => {
              const cat = catMap.get(catId);
              const catName = lang === 'my' ? (cat?.name || catId) : (cat?.nameEn || catId);
              const color = categoryColors[idx % categoryColors.length];

              return (
                <Line
                  key={catId}
                  type="monotone"
                  dataKey={catName}
                  stroke={color}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
