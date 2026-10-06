import React, { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Tag, X, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Transaction, Category } from '../types';
import { formatMMK, getCategoryDisplayName } from '../utils/formatters';
import { isTransferTransaction } from '../utils/walletBalance';
import { CategoryIcon } from './CategoryIcon';

interface SmartCalendarCardProps {
  transactions: Transaction[];
  categories?: Category[];
  lang: 'my' | 'en';
}

const getLocalDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// [v6.1.7] Compact number format for tight calendar cells
// Converts to lakhs (÷ 100,000) with up to 5 decimals, strips trailing zeros
// Examples: 100000 → "1" | 50000 → "0.5" | 63000 → "0.63"
//           72300 → "0.723" | 72350 → "0.7235" | 85015 → "0.85015"
const formatShortLakhs = (amount: number): string => {
  if (!Number.isFinite(amount) || amount === 0) return '0';
  const lakhs = Math.abs(amount) / 100000;
  return lakhs.toFixed(5).replace(/\.?0+$/, '');
};

export const SmartCalendarCard: React.FC<SmartCalendarCardProps> = ({
  transactions,
  categories = [],
  lang,
}) => {
  const todayStr = getLocalDateString(new Date());
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDayStr, setSelectedDayStr] = useState<string | null>(todayStr);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0-indexed

  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const monthNameMy = [
    'ဇန်နဝါရီ', 'ဖေဖော်ဝါရီ', 'မတ်', 'ဧပြီ', 'မေ', 'ဇွန်',
    'ဇူလိုင်', 'သြဂုတ်', 'စက်တင်ဘာ', 'အောက်တိုဘာ', 'နိုဝင်ဘာ', 'ဒီဇင်ဘာ'
  ];
  const monthNameEn = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentMonthTitle = lang === 'my'
    ? `${year} ခုနှစ်၊ ${monthNameMy[month]}`
    : `${monthNameEn[month]} ${year}`;

  const shiftMonth = (offset: number) => {
    setViewDate(new Date(year, month + offset, 1));
  };

  // Build calendar grid
  const calendarGrid = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    let startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday
    const daysInMonth = lastDayOfMonth.getDate();

    const days = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ dayNum: null, dateStr: null });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dayNum: d, dateStr: dayStr });
    }

    return days;
  }, [year, month]);

  // Aggregate daily totals map
  const dailyMap = useMemo(() => {
    const map = new Map<string, { income: number; expense: number; count: number; net: number }>();

    transactions.forEach((t) => {
      if (!t || !t.date || isTransferTransaction(t)) return;
      if (!t.date.startsWith(monthKey)) return;

      const existing = map.get(t.date) || { income: 0, expense: 0, count: 0, net: 0 };
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') existing.income += amt;
      else if (t.type === 'expense') existing.expense += amt;
      existing.net = existing.income - existing.expense;
      existing.count += 1;
      map.set(t.date, existing);
    });

    return map;
  }, [transactions, monthKey]);

  // Selected day transactions
  const selectedDayTxs = useMemo(() => {
    if (!selectedDayStr) return [];
    return transactions.filter((t) => t && t.date === selectedDayStr && !isTransferTransaction(t));
  }, [transactions, selectedDayStr]);

  const selectedDaySummary = useMemo(() => {
    let income = 0;
    let expense = 0;
    selectedDayTxs.forEach((t) => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') income += amt;
      else if (t.type === 'expense') expense += amt;
    });
    return { income, expense, net: income - expense };
  }, [selectedDayTxs]);

  const weekDays = lang === 'my'
    ? ['တနင်္ဂနွေ', 'တနင်္လာ', 'အင်္ဂါ', 'ဗုဒ္ဓဟူး', 'ကြာသပတေး', 'သောကြာ', 'စနေ']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-4 sm:p-5 space-y-4">
      {/* Header & Month Navigator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 shadow-2xs">
            <CalendarIcon className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="font-bold text-xs sm:text-sm text-slate-900">
              {lang === 'my' ? 'စမတ်ပြက္ခဒိန် ဝင်/ထွက်/ကျန် (Smart Calendar Summary)' : 'Smart Calendar Daily Summary'}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              {lang === 'my' ? 'ရက်စွဲအလိုက် ဝင်၊ ထွက်၊ ကျန် — သိန်းဂဏန်းဖြင့် (×100,000)' : 'Daily In, Out, Net — in lakhs (×100,000)'}
            </p>
          </div>
        </div>

        {/* Month Switcher */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl self-start sm:self-auto border border-slate-200/80">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="p-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition-all cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 text-xs font-black text-slate-800 font-mono">
            {currentMonthTitle}
          </span>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="p-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition-all cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
        {/* Weekdays Header */}
        <div className="grid grid-cols-7 bg-slate-100 border-b border-slate-200 text-center text-[10px] sm:text-xs font-bold text-slate-600 py-2">
          {weekDays.map((w, idx) => (
            <div key={idx} className={idx === 0 || idx === 6 ? 'text-rose-600' : ''}>{w}</div>
          ))}
        </div>

        {/* Days Matrix */}
        <div className="grid grid-cols-7 gap-px bg-slate-200">
          {calendarGrid.map((slot, idx) => {
            if (!slot.dayNum || !slot.dateStr) {
              return <div key={idx} className="bg-white/60 min-h-[70px] sm:min-h-[85px] p-1 opacity-40" />;
            }

            const metrics = dailyMap.get(slot.dateStr);
            const isSelected = selectedDayStr === slot.dateStr;
            const isToday = slot.dateStr === todayStr;

            return (
              <div
                key={idx}
                onClick={() => setSelectedDayStr(slot.dateStr)}
                className={`bg-white min-h-[72px] sm:min-h-[88px] p-1.5 sm:p-2 flex flex-col justify-between transition-all cursor-pointer hover:bg-indigo-50/40 relative ${
                  isSelected ? 'ring-2 ring-indigo-600 bg-indigo-50/30 z-10' : ''
                } ${isToday ? 'bg-amber-50/30' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold font-mono ${
                    isToday ? 'bg-indigo-600 text-white' : 'text-slate-800'
                  }`}>
                    {slot.dayNum}
                  </span>
                  {metrics && metrics.count > 0 && (
                    <span className="text-[9px] font-mono font-bold px-1 rounded bg-slate-100 text-slate-600">
                      {metrics.count}
                    </span>
                  )}
                </div>

                {/* Day In / Out / Net Badges */}
                {metrics ? (
                  <div className="space-y-0.5 text-[9px] font-mono">
                    {metrics.income > 0 && (
                      <div className="text-emerald-700 font-bold truncate" title={`In: +${formatMMK(metrics.income)}`}>
                        +{formatShortLakhs(metrics.income)}
                      </div>
                    )}
                    {metrics.expense > 0 && (
                      <div className="text-rose-600 font-bold truncate" title={`Out: -${formatMMK(metrics.expense)}`}>
                        -{formatShortLakhs(metrics.expense)}
                      </div>
                    )}
                    {metrics.income === 0 && metrics.expense === 0 && (
                      <div className="text-slate-300 text-[8px]">-</div>
                    )}
                  </div>
                ) : (
                  <div className="text-[9px] text-slate-300">-</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Details Card with Clean Structured Table */}
      {selectedDayStr && (
        <div className="bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 rounded-2xl p-4 border border-indigo-200/90 shadow-2xs space-y-3.5">
          <div className="flex items-center justify-between border-b border-indigo-100 pb-2.5">
            <div className="flex items-center gap-2.5">
              <span className="font-black text-xs sm:text-sm text-indigo-950 font-mono bg-white px-2.5 py-1 rounded-xl border border-indigo-200 shadow-2xs">
                📅 {selectedDayStr}
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                {selectedDayTxs.length} {lang === 'my' ? 'မှတ်တမ်း' : 'records'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDayStr(null)}
              className="text-slate-400 hover:text-slate-700 text-xs font-bold px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              ✕ {lang === 'my' ? 'ပိတ်မည်' : 'Close'}
            </button>
          </div>

          {/* Summary for selected day */}
          <div className="grid grid-cols-3 gap-2.5 text-xs font-mono font-bold">
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-center shadow-2xs">
              <div className="text-[10px] font-sans font-semibold text-emerald-700">{lang === 'my' ? 'ဝင်ငွေ' : 'Income'}</div>
              <div className="text-xs sm:text-sm font-black" title={`+${formatMMK(selectedDaySummary.income)}`}>+{formatShortLakhs(selectedDaySummary.income)}</div>
            </div>
            <div className="p-2.5 rounded-2xl bg-rose-50 text-rose-900 border border-rose-200 text-center shadow-2xs">
              <div className="text-[10px] font-sans font-semibold text-rose-700">{lang === 'my' ? 'ထွက်ငွေ' : 'Expense'}</div>
              <div className="text-xs sm:text-sm font-black" title={`-${formatMMK(selectedDaySummary.expense)}`}>-{formatShortLakhs(selectedDaySummary.expense)}</div>
            </div>
            <div className={`p-2.5 rounded-2xl border text-center shadow-2xs ${selectedDaySummary.net >= 0 ? 'bg-indigo-50 text-indigo-950 border-indigo-200' : 'bg-rose-50 text-rose-950 border-rose-200'}`}>
              <div className="text-[10px] font-sans font-semibold opacity-85">{lang === 'my' ? 'အသားတင်' : 'Net'}</div>
              <div className="text-xs sm:text-sm font-black" title={`${selectedDaySummary.net >= 0 ? '+' : ''}${formatMMK(selectedDaySummary.net)}`}>{selectedDaySummary.net >= 0 ? '+' : ''}{formatShortLakhs(selectedDaySummary.net)}</div>
            </div>
          </div>

          {/* Transactions Structured Table for Selected Day */}
          {selectedDayTxs.length === 0 ? (
            <div className="py-6 text-center text-slate-400 text-xs">
              {lang === 'my' ? 'ဤနေ့တွင် မှတ်တမ်း မရှိပါ။' : 'No transactions recorded on this date.'}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold text-[11px]">
                    <th className="py-2.5 px-3">{lang === 'my' ? 'အမျိုးအစား / မှတ်ချက်' : 'Category / Note'}</th>
                    <th className="py-2.5 px-3 text-right">{lang === 'my' ? 'ပမာဏ' : 'Amount'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {selectedDayTxs.map((t) => {
                    const isInc = t.type === 'income';
                    const cat = catMap.get(t.category);
                    const catName = getCategoryDisplayName(t.category, categories, lang);
                    const catColor = cat?.color || (isInc ? '#10B981' : '#EF4444');
                    const catIcon = cat?.icon || 'Tag';

                    return (
                      <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className="w-7 h-7 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs"
                              style={{ backgroundColor: catColor }}
                            >
                              <CategoryIcon name={catIcon} className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 truncate">{catName}</div>
                              {t.note && (
                                <div className="text-[11px] text-slate-500 truncate italic">"{t.note}"</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className={`py-3 px-3 text-right font-mono font-bold text-xs sm:text-sm shrink-0 ${isInc ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {isInc ? `+${formatMMK(t.amount)}` : `-${formatMMK(t.amount)}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
