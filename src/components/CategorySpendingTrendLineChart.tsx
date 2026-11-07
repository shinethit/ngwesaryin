import React, { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { Transaction, Category, Wallet } from '../types';
import { formatMMK, formatLakhs, getCategoryDisplayName } from '../utils/formatters';
import { convertToMMK } from '../utils/currency';
import { buildWalletMap, isTransferTransaction, isWalletMatch, effectiveIncludeInTotals } from '../utils/walletBalance';
import { useAuth } from '../context/AuthContext';

interface CategorySpendingTrendLineChartProps {
  transactions: Transaction[];
  categories: Category[];
  wallets?: Wallet[];
  lang: 'my' | 'en';
}

export const CategorySpendingTrendLineChart: React.FC<CategorySpendingTrendLineChartProps> = ({
  transactions,
  categories,
  wallets = [],
  lang,
}) => {
  const [selectedTopCount, setSelectedTopCount] = useState<number>(4);

  // [v7.5.70] Tappable legend — tap a legend chip to hide/show its
  // line (user request 2026-11-07: "cat_debt_issued" and Total Expense
  // felt stuck because the built-in legend was not clickable).
  // Keys are category ids ('total' for the Total Expense line) so the
  // hidden state survives a language switch.
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());
  const toggleLine = (key: string) => {
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // [v7.5.55 D18] Convert amounts to MMK via each transaction's wallet.
  const walletMap = useMemo(() => buildWalletMap(wallets), [wallets]);
  const convertTxToMMK = (t: Transaction) => {
    let w = walletMap.get(t.walletId);
    if (!w) w = wallets.find((wall) => isWalletMatch(wall, t.walletId));
    return convertToMMK(t.amount, w?.currency, w?.exchangeRate);
  };

  // [v7.5.68] Per-viewer shared-wallet scope overrides.
  const { sharedWalletScopeOverrides } = useAuth();

  // [v7.5.60 M-01] Separate wallets excluded (Dashboard scope). Unknown
  // wallets are kept — their scope cannot be judged.
  const isScopedTx = (t: Transaction) => {
    const w = walletMap.get(t.walletId) || wallets.find((wall) => isWalletMatch(wall, t.walletId));
    return !w || effectiveIncludeInTotals(w, sharedWalletScopeOverrides);
  };

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
      if (!isScopedTx(t)) return;
      const monthKey = t.date?.slice(0, 7);
      const isInLast6 = lastSixMonths.some((m) => m.key === monthKey);
      if (!isInLast6) return;

      const catId = t.category || 'other';
      categoryTotals[catId] = (categoryTotals[catId] || 0) + convertTxToMMK(t);
    });

    const sorted = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([catId]) => catId);

    return sorted.slice(0, selectedTopCount);
  }, [transactions, lastSixMonths, selectedTopCount, walletMap, wallets, sharedWalletScopeOverrides]);

  // 3. Build chart data array with monthly spending per top category
  const chartData = useMemo(() => {
    return lastSixMonths.map((m) => {
      const row: any = { month: m.label, monthKey: m.key };

      topCategories.forEach((catId) => {
        // [v7.5.70] Resolve via the shared helper — the old
        // `cat?.name || catId` fallback showed the raw key
        // ("cat_debt_issued") for built-in debt categories that are
        // not in the user category list.
        const catName = getCategoryDisplayName(catId, categories, lang);

        const sum = transactions
          .filter((t) => t.type === 'expense' && !isTransferTransaction(t) && isScopedTx(t) && t.date?.startsWith(m.key) && (t.category === catId))
          .reduce((acc, t) => acc + convertTxToMMK(t), 0);

        row[catName] = sum;
      });

      // [v7.5.55 D18] "Total Expense" is the TRUE monthly total across ALL
      // expense categories — previously it summed only the top-N lines.
      const totalMonthExpense = transactions
        .filter((t) => t.type === 'expense' && !isTransferTransaction(t) && isScopedTx(t) && t.date?.startsWith(m.key))
        .reduce((acc, t) => acc + convertTxToMMK(t), 0);

      row[lang === 'my' ? 'စုစုပေါင်းထွက်ငွေ' : 'Total Expense'] = totalMonthExpense;
      return row;
    });
  }, [lastSixMonths, topCategories, transactions, lang, walletMap, wallets, sharedWalletScopeOverrides]);

  const categoryColors = ['#10B981', '#6366F1', '#EC4899', '#F59E0B', '#3B82F6', '#8B5CF6'];

  // [v7.5.60 E4/S-66] Empty state instead of a blank chart.
  const totalSixMonthExpense = useMemo(
    () => chartData.reduce((s, r) => s + (r[lang === 'my' ? 'စုစုပေါင်းထွက်ငွေ' : 'Total Expense'] as number || 0), 0),
    [chartData, lang]
  );

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
      {totalSixMonthExpense === 0 ? (
        <div className="py-10 text-center text-slate-500 text-xs space-y-2 rounded-xl bg-slate-50 border border-dashed border-slate-200">
          <p className="font-bold text-slate-700">
            {lang === 'my' ? 'လွန်ခဲ့သော ၆ လအတွင်း ထွက်ငွေ မှတ်တမ်း မရှိသေးပါ' : 'No expense records in the last 6 months yet'}
          </p>
          <p>{lang === 'my' ? 'မှတ်တမ်းတစ်ခု ထည့်လိုက်ပါက ဒီမှာ trend ပေါ်လာပါမည်' : 'Add a record and the trend will appear here'}</p>
        </div>
      ) : (
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
              tickFormatter={(v) => formatLakhs(v, lang)}
            />
            <Tooltip
              formatter={(value: any, name: any) => [`${formatLakhs(Number(value) || 0, lang)} (${formatMMK(Number(value) || 0)})`, name]}
              contentStyle={{
                backgroundColor: '#1E293B',
                borderRadius: '16px',
                color: '#fff',
                border: 'none',
                fontSize: '12px',
                padding: '10px 14px',
              }}
            />

            {/* Total Expense Line */}
            <Line
              type="monotone"
              dataKey={lang === 'my' ? 'စုစုပေါင်းထွက်ငွေ' : 'Total Expense'}
              stroke="#EF4444"
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              hide={hiddenKeys.has('total')}
            />

            {/* Top Category Lines */}
            {topCategories.map((catId, idx) => {
              // [v7.5.70] Same shared helper as above — no raw keys.
              const catName = getCategoryDisplayName(catId, categories, lang);
              const color = categoryColors[idx % categoryColors.length];

              return (
                <Line
                  key={catId}
                  type="monotone"
                  dataKey={catName}
                  stroke={color}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  hide={hiddenKeys.has(catId)}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
      )}

      {/* [v7.5.70] Custom tappable legend — replaces the built-in one */}
      {totalSixMonthExpense > 0 && (
        <div className="space-y-1 pt-1">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]">
            <button
              type="button"
              onClick={() => toggleLine('total')}
              className={`flex items-center gap-1.5 cursor-pointer transition-opacity ${hiddenKeys.has('total') ? 'opacity-40' : ''}`}
              title={lang === 'my' ? 'စုစုပေါင်းထွက်ငွေ လိုင်း ဖွက်/ပြ' : 'Hide/show the Total Expense line'}
            >
              <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: '#EF4444' }} />
              <span className="text-slate-700 font-medium">{lang === 'my' ? 'စုစုပေါင်းထွက်ငွေ' : 'Total Expense'}</span>
            </button>
            {topCategories.map((catId, idx) => {
              const catName = getCategoryDisplayName(catId, categories, lang);
              const color = categoryColors[idx % categoryColors.length];
              const hidden = hiddenKeys.has(catId);
              return (
                <button
                  key={catId}
                  type="button"
                  onClick={() => toggleLine(catId)}
                  className={`flex items-center gap-1.5 cursor-pointer transition-opacity ${hidden ? 'opacity-40' : ''}`}
                  title={hidden
                    ? (lang === 'my' ? `${catName} ကို ပြန်ပြမည်` : `Show ${catName}`)
                    : (lang === 'my' ? `${catName} ကို ဖွက်မည်` : `Hide ${catName}`)}
                >
                  <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-slate-700 font-medium">{catName}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-400">
            {lang === 'my' ? '💡 ကဏ္ဍအမည်ကို နှိပ်ပြီး လိုင်း ဖွက်/ပြ လုပ်နိုင်သည်' : '💡 Tap a legend item to hide/show its line'}
          </p>
        </div>
      )}
    </div>
  );
};
