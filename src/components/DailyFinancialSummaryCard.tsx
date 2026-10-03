import React, { useState, useMemo } from 'react';
import { Calendar, ArrowDownLeft, ArrowUpRight, Scale, Layers, ChevronLeft, ChevronRight, Wallet as WalletIcon } from 'lucide-react';
import { Transaction, Wallet } from '../types';
import { formatMMK } from '../utils/formatters';
import { isTransferTransaction, isWalletMatch } from '../utils/walletBalance';

interface DailyFinancialSummaryCardProps {
  transactions: Transaction[];
  wallets: Wallet[];
  lang: 'my' | 'en';
}

const getLocalDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatLocalizedDate = (dateStr: string, lang: 'my' | 'en'): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const d = new Date(year, monthIdx, day);
  if (isNaN(d.getTime())) return dateStr;

  const daysMy = ['တနင်္ဂနွေ', 'တနင်္လာ', 'အင်္ဂါ', 'ဗုဒ္ဓဟူး', 'ကြာသပတေး', 'သောကြာ', 'စနေ'];
  const daysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthsMy = [
    'ဇန်နဝါရီ', 'ဖေဖော်ဝါရီ', 'မတ်', 'ဧပြီ', 'မေ', 'ဇွန်',
    'ဇူလိုင်', 'သြဂုတ်', 'စက်တင်ဘာ', 'အောက်တိုဘာ', 'နိုဝင်ဘာ', 'ဒီဇင်ဘာ'
  ];
  const monthsEn = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const dayName = lang === 'my' ? daysMy[d.getDay()] : daysEn[d.getDay()];
  const monthName = lang === 'my' ? monthsMy[d.getMonth()] : monthsEn[d.getMonth()];

  return lang === 'my'
    ? `${monthName} ${day} ရက်၊ ${year} (${dayName})`
    : `${monthName} ${day}, ${year} (${dayName})`;
};

export const DailyFinancialSummaryCard: React.FC<DailyFinancialSummaryCardProps> = ({
  transactions,
  wallets,
  lang,
}) => {
  const todayStr = getLocalDateString(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const shiftDate = (offsetDays: number) => {
    const parts = selectedDate.split('-').map(Number);
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      d.setDate(d.getDate() + offsetDays);
      setSelectedDate(getLocalDateString(d));
    }
  };

  // Calculate daily inflow, outflow, and net for selectedDate
  const dailyMetrics = useMemo(() => {
    const dayTxs = transactions.filter(
      (t) => t && t.date === selectedDate && !isTransferTransaction(t)
    );

    let inflow = 0;
    let outflow = 0;

    dayTxs.forEach((t) => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') inflow += amt;
      else if (t.type === 'expense') outflow += amt;
    });

    const netMovement = inflow - outflow;

    // Total current wallet balances
    const totalCurrentBalance = wallets.reduce((sum, w) => sum + (Number(w.balance) || 0), 0);

    // Approximate opening balance for this specific day:
    // If selectedDate is today, opening = current balance - netMovement of today (or approximated)
    // For general robustness, we compute running balance backwards or estimate.
    // Let's compute total historical net movement after selectedDate to work backwards from current balances.
    let futureNetMovement = 0;
    transactions.forEach((t) => {
      if (t && t.date > selectedDate && !isTransferTransaction(t)) {
        const amt = Number(t.amount) || 0;
        if (t.type === 'income') futureNetMovement += amt;
        else if (t.type === 'expense') futureNetMovement -= amt;
      }
    });

    const closingBalance = totalCurrentBalance - futureNetMovement;
    const openingBalance = closingBalance - netMovement;

    return {
      inflow,
      outflow,
      netMovement,
      openingBalance,
      closingBalance,
      count: dayTxs.length,
    };
  }, [transactions, wallets, selectedDate]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-4 sm:p-5 space-y-4">
      {/* Header & Date Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 shadow-2xs">
            <Calendar className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="font-bold text-xs sm:text-sm text-slate-900">
              {lang === 'my' ? 'နေ့စဉ် ငွေကြေးစီးဆင်းမှု အနှစ်ချုပ် (Daily Liquidity Summary)' : 'Daily Financial & Liquidity Summary'}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              {formatLocalizedDate(selectedDate, lang)}
            </p>
          </div>
        </div>

        {/* Date Selector Navigation */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-auto border border-slate-200/80">
          <button
            type="button"
            onClick={() => shiftDate(-1)}
            className="p-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition-all cursor-pointer"
            title={lang === 'my' ? 'ရက်ယခင်' : 'Previous Day'}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
            className="px-2 py-1 text-xs font-bold text-slate-800 bg-transparent border-0 focus:outline-none cursor-pointer font-mono"
          />
          <button
            type="button"
            onClick={() => shiftDate(1)}
            className="p-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition-all cursor-pointer"
            title={lang === 'my' ? 'ရက်နောက်' : 'Next Day'}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {selectedDate !== todayStr && (
            <button
              type="button"
              onClick={() => setSelectedDate(todayStr)}
              className="px-2.5 py-1 rounded-lg bg-teal-600 text-white text-[11px] font-bold hover:bg-teal-700 transition-all cursor-pointer"
            >
              {lang === 'my' ? 'ယနေ့' : 'Today'}
            </button>
          )}
        </div>
      </div>

      {/* Opening vs Closing Liquidity Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Opening Balance Card */}
        <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-600 text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-slate-500" />
              {lang === 'my' ? 'စတင်လက်ကျန် (Opening Liquidity)' : 'Opening Balance'}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 font-bold">
              {lang === 'my' ? 'အစ' : 'Start'}
            </span>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-slate-900 truncate" title={formatMMK(dailyMetrics.openingBalance)}>
            {formatMMK(dailyMetrics.openingBalance)}
          </div>
        </div>

        {/* Closing Balance Card */}
        <div className="bg-gradient-to-br from-teal-50/60 to-white rounded-2xl p-3.5 border border-teal-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-teal-900 text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <WalletIcon className="w-4 h-4 text-teal-600" />
              {lang === 'my' ? 'ပိတ်လက်ကျန် (Closing Liquidity)' : 'Closing Balance'}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-100 text-teal-900 font-bold">
              {lang === 'my' ? 'အဆုံး' : 'End'}
            </span>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-teal-800 truncate" title={formatMMK(dailyMetrics.closingBalance)}>
            {formatMMK(dailyMetrics.closingBalance)}
          </div>
        </div>
      </div>

      {/* Inflow vs Outflow Aggregation Bar */}
      <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
          <span>{lang === 'my' ? `နေ့စဉ် ဝင်ငွေ/ထွက်ငွေ စုစုပေါင်း (${dailyMetrics.count} မှတ်တမ်း)` : `Daily Inflow vs Outflow (${dailyMetrics.count} txs)`}</span>
          <span className={`font-mono ${dailyMetrics.netMovement >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {lang === 'my' ? 'အသားတင်လှုပ်ရှားမှု:' : 'Net Shift:'} {dailyMetrics.netMovement >= 0 ? `+${formatMMK(dailyMetrics.netMovement)}` : formatMMK(dailyMetrics.netMovement)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
              <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
              <span>{lang === 'my' ? 'ဝင်ငွေ (Inflow)' : 'Inflow'}</span>
            </div>
            <span className="font-mono font-bold text-emerald-700 text-xs sm:text-sm">
              +{formatMMK(dailyMetrics.inflow)}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-200 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-rose-800 font-bold text-xs">
              <ArrowUpRight className="w-4 h-4 text-rose-600" />
              <span>{lang === 'my' ? 'ထွက်ငွေ (Outflow)' : 'Outflow'}</span>
            </div>
            <span className="font-mono font-bold text-rose-700 text-xs sm:text-sm">
              -{formatMMK(dailyMetrics.outflow)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
