import React, { useMemo } from 'react';
import { PieChart, Tag } from 'lucide-react';
import { Transaction, Category } from '../types';
import { formatMMK } from '../utils/formatters';
import { isTransferTransaction } from '../utils/walletBalance';
import { CategoryIcon } from './CategoryIcon';

interface CurrentMonthExpenseDonutChartProps {
  transactions: Transaction[];
  categories: Category[];
  lang: 'my' | 'en';
}

const getLocalDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const CurrentMonthExpenseDonutChart: React.FC<CurrentMonthExpenseDonutChartProps> = ({
  transactions,
  categories,
  lang,
}) => {
  const currentYearMonth = useMemo(() => getLocalDateString(new Date()).slice(0, 7), []);

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  // Filter current month expenses
  const currentMonthExpenses = useMemo(() => {
    return transactions.filter((t) => {
      if (t.type !== 'expense') return false;
      if (isTransferTransaction(t)) return false;
      if (!t.date || !t.date.startsWith(currentYearMonth)) return false;
      return true;
    });
  }, [transactions, currentYearMonth]);

  const totalExpense = useMemo(() => {
    return currentMonthExpenses.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [currentMonthExpenses]);

  // Aggregate by category
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { categoryId: string; amount: number; count: number }>();

    currentMonthExpenses.forEach((t) => {
      const catId = t.category || 'other';
      const existing = map.get(catId) || { categoryId: catId, amount: 0, count: 0 };
      existing.amount += Number(t.amount) || 0;
      existing.count += 1;
      map.set(catId, existing);
    });

    return Array.from(map.values())
      .map((item) => {
        const cat = catMap.get(item.categoryId);
        const name = lang === 'my' ? (cat?.name || item.categoryId) : (cat?.nameEn || item.categoryId);
        const color = cat?.color || '#6366F1';
        const icon = cat?.icon || 'Tag';
        const percentage = totalExpense > 0 ? Math.round((item.amount / totalExpense) * 100) : 0;
        return {
          ...item,
          name,
          color,
          icon,
          percentage,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [currentMonthExpenses, catMap, lang, totalExpense]);

  // Build SVG Donut slices
  const svgSlices = useMemo(() => {
    let accumulatedAngle = 0;
    const radius = 40;
    const circumference = 2 * Math.PI * radius;

    return categoryBreakdown.map((item) => {
      const fraction = totalExpense > 0 ? item.amount / totalExpense : 0;
      const strokeDasharray = `${fraction * circumference} ${circumference}`;
      const strokeDashoffset = -accumulatedAngle * circumference;
      accumulatedAngle += fraction;

      return {
        ...item,
        strokeDasharray,
        strokeDashoffset,
      };
    });
  }, [categoryBreakdown, totalExpense]);

  const currentMonthName = useMemo(() => {
    const d = new Date();
    const monthsMy = [
      'ဇန်နဝါရီ', 'ဖေဖော်ဝါရီ', 'မတ်', 'ဧပြီ', 'မေ', 'ဇွန်',
      'ဇူလိုင်', 'သြဂုတ်', 'စက်တင်ဘာ', 'အောက်တိုဘာ', 'နိုဝင်ဘာ', 'ဒီဇင်ဘာ'
    ];
    const monthsEn = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return lang === 'my' ? monthsMy[d.getMonth()] : monthsEn[d.getMonth()];
  }, [lang]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center shrink-0 shadow-2xs">
            <PieChart className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="font-bold text-xs sm:text-sm text-slate-900">
              {lang === 'my' ? `ယခုလ (${currentMonthName}) ထွက်ငွေ အမျိုးအစားခွဲ Donut ဇယား` : `Current Month (${currentMonthName}) Expense Donut Chart`}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              {lang === 'my' ? 'ငွေကြေး အများဆုံး သုံးစွဲနေသည့် ကဏ္ဍများကို ရှင်းလင်းစွာ လေ့လာပါ' : 'Visual breakdown of where your money is spent this month'}
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-xl bg-rose-50 text-rose-800 font-mono text-xs font-bold border border-rose-200">
          -{formatMMK(totalExpense)}
        </span>
      </div>

      {categoryBreakdown.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-xs space-y-2">
          <Tag className="w-8 h-8 mx-auto text-slate-300" />
          <p>{lang === 'my' ? 'ယခုလအတွက် ထွက်ငွေ မှတ်တမ်း မရှိသေးပါ။' : 'No expense records for the current month yet.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Donut Chart Visual (SVG) */}
          <div className="md:col-span-5 flex flex-col items-center justify-center py-2 relative">
            <div className="w-44 h-44 sm:w-48 sm:h-48 relative flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#F1F5F9"
                  strokeWidth="18"
                />
                {/* Donut Slices */}
                {svgSlices.map((slice, idx) => (
                  <circle
                    key={idx}
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke={slice.color}
                    strokeWidth="18"
                    strokeDasharray={slice.strokeDasharray}
                    strokeDashoffset={slice.strokeDashoffset}
                    className="transition-all duration-500 hover:opacity-90"
                  />
                ))}
              </svg>
              {/* Center Total Info */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{lang === 'my' ? 'စုစုပေါင်း' : 'Total'}</span>
                <span className="font-black text-xs sm:text-sm font-mono text-slate-900 truncate max-w-[100px]" title={formatMMK(totalExpense)}>
                  {formatMMK(totalExpense)}
                </span>
                <span className="text-[9px] text-rose-600 font-bold mt-0.5">{categoryBreakdown.length} {lang === 'my' ? 'ကဏ္ဍ' : 'categories'}</span>
              </div>
            </div>
          </div>

          {/* Category Breakdown Legend / List */}
          <div className="md:col-span-7 space-y-2 max-h-60 overflow-y-auto pr-1">
            {categoryBreakdown.map((item) => (
              <div
                key={item.categoryId}
                className="p-2.5 rounded-2xl bg-slate-50/80 border border-slate-200/70 hover:bg-white transition-all space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-7 h-7 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs"
                      style={{ backgroundColor: item.color }}
                    >
                      <CategoryIcon name={item.icon} className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-900 truncate">{item.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{item.count} {lang === 'my' ? 'မှတ်တမ်း' : 'txs'}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono font-black text-xs text-slate-900">{formatMMK(item.amount)}</div>
                    <div className="text-[10px] font-bold font-mono text-rose-600">{item.percentage}%</div>
                  </div>
                </div>

                {/* Proportion Progress Bar */}
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
