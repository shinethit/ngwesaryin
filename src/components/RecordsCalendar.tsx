// [v7.6.45] Compact calendar for the TOP of the Records tab only
// (Part E). The Dashboard calendar (SmartCalendarCard) is a
// different, larger surface and is untouched.
//
// Behaviour:
// - Month grid, Sunday-start weeks (the app's calendar convention).
// - Each cell shows the day's totals from the Records filter scope
//   (the caller passes the day-filter-free filtered list): in +
//   out lines in 'both' mode (default), a single signed net line in
//   'net' mode. Amounts are compact (lakh format) with the exact
//   kyat value in the tooltip — the Dashboard calendar's
//   exact-on-tap does NOT carry over (it would clash with the tap
//   gesture below).
// - Tapping a day filters the Records list to that day; tapping the
//   same day again clears the filter. The caller owns the selected
//   day; this component only reports taps.
// - The display mode persists in localStorage
//   ('ngwe_records_calendar_mode') and is owned by this component.
// - Transfer records are excluded unless the caller says the list
//   is single-wallet scoped (matching the day-group totals in
//   TransactionsView, which include transfers only then).
import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Transaction, Wallet } from '../types';
import { formatMMK, formatLakhs } from '../utils/formatters';
import { convertToMMK } from '../utils/currency';
import { buildWalletMap, isTransferTransaction } from '../utils/walletBalance';
import { getLocalDateString } from '../utils/dateUtils';
import { safeSetItem } from '../utils/storage';

export type RecordsCalendarMode = 'both' | 'net';

const MODE_STORAGE_KEY = 'ngwe_records_calendar_mode';

function readStoredMode(): RecordsCalendarMode {
  try {
    const saved =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem(MODE_STORAGE_KEY)
        : null;
    if (saved === 'net' || saved === 'both') return saved;
  } catch {
    /* ignore */
  }
  return 'both';
}

const DAYS_MY = ['နွေ', 'လာ', 'ဂါ', 'ဟူး', 'ကြာ', 'သော', 'နေ'];
const DAYS_EN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS_MY = [
  'ဇန်နဝါရီ', 'ဖေဖော်ဝါရီ', 'မတ်', 'ဧပြီ', 'မေ', 'ဇွန်',
  'ဇူလိုင်', 'သြဂုတ်', 'စက်တင်ဘာ', 'အောက်တိုဘာ', 'နိုဝင်ဘာ', 'ဒီဇင်ဘာ',
];
const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface RecordsCalendarProps {
  transactions: Transaction[];
  wallets: Wallet[];
  lang: 'my' | 'en';
  /** YYYY-MM-DD of the day the list is filtered to, or null. */
  selectedDay: string | null;
  onSelectDay: (date: string | null) => void;
  /** Day-group totals include transfers only when the list is
      single-wallet scoped — pass the same flag the list uses. */
  includeTransfers: boolean;
}

export const RecordsCalendar: React.FC<RecordsCalendarProps> = ({
  transactions,
  wallets,
  lang,
  selectedDay,
  onSelectDay,
  includeTransfers,
}) => {
  const todayStr = getLocalDateString(new Date());
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [mode, setMode] = useState<RecordsCalendarMode>(readStoredMode);

  const setModePersist = (m: RecordsCalendarMode) => {
    setMode(m);
    safeSetItem(MODE_STORAGE_KEY, m);
  };

  const walletMap = useMemo(() => buildWalletMap(wallets), [wallets]);

  // Per-day in/out totals (MMK) for the displayed month, from the
  // caller-supplied scope. Recomputed when the scope, the month, or
  // the transfer rule changes.
  const dayTotals = useMemo(() => {
    const totals = new Map<string, { in: number; out: number }>();
    const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
    for (const t of transactions) {
      if (!t.date || !t.date.startsWith(monthPrefix)) continue;
      if (!includeTransfers && isTransferTransaction(t)) continue;
      const w = walletMap.get(t.walletId);
      const amt = convertToMMK(t.amount, w?.currency, w?.exchangeRate);
      const entry = totals.get(t.date) || { in: 0, out: 0 };
      if (t.type === 'income') entry.in += amt;
      else if (t.type === 'expense') entry.out += amt;
      totals.set(t.date, entry);
    }
    return totals;
  }, [transactions, walletMap, viewYear, viewMonth, includeTransfers]);

  const shiftMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  // 6 × 7 grid, Sunday-start. Cells before/after the month are
  // empty (no number) so the month's shape stays obvious.
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const months = lang === 'my' ? MONTHS_MY : MONTHS_EN;
  const days = lang === 'my' ? DAYS_MY : DAYS_EN;

  return (
    <div className="space-y-2">
      {/* Month navigation */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
          aria-label={lang === 'my' ? 'ပြီးခဲ့တဲ့လ' : 'Previous month'}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-bold text-slate-800">
          {months[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
          aria-label={lang === 'my' ? 'နောက်လ' : 'Next month'}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Display-mode toggle (persisted) */}
      <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg" role="group" aria-label={lang === 'my' ? 'ပြသမှု' : 'Display mode'}>
        <button
          type="button"
          onClick={() => setModePersist('both')}
          className={`flex-1 px-2 py-1.5 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${mode === 'both' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
        >
          {lang === 'my' ? 'ဝင်+ထွက် နှစ်ခုလုံး' : 'In + Out'}
        </button>
        <button
          type="button"
          onClick={() => setModePersist('net')}
          className={`flex-1 px-2 py-1.5 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${mode === 'net' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
        >
          {lang === 'my' ? 'အသားတင်သာ' : 'Net only'}
        </button>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map((d) => (
          <span key={d} className="text-[10px] font-bold text-slate-400 py-0.5">
            {d}
          </span>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1" role="grid">
        {cells.map((day, idx) => {
          if (day === null) return <span key={`blank-${idx}`} />;
          const dateStr = getLocalDateString(new Date(viewYear, viewMonth, day));
          const totals = dayTotals.get(dateStr);
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDay;
          const net = (totals?.in || 0) - (totals?.out || 0);
          return (
            <button
              key={dateStr}
              type="button"
              role="gridcell"
              aria-pressed={isSelected}
              onClick={() => onSelectDay(isSelected ? null : dateStr)}
              className={`min-h-[46px] rounded-lg px-0.5 py-1 flex flex-col items-center justify-start gap-px transition-colors cursor-pointer border ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                  : 'border-transparent hover:bg-slate-50'
              }`}
              title={
                totals
                  ? lang === 'my'
                    ? `ဝင် ${formatMMK(totals.in)} · ထွက် ${formatMMK(totals.out)}`
                    : `In ${formatMMK(totals.in)} · Out ${formatMMK(totals.out)}`
                  : undefined
              }
            >
              <span
                className={`text-xs font-bold leading-4 w-5 h-5 flex items-center justify-center rounded-full ${
                  isToday
                    ? 'bg-slate-900 text-white'
                    : isSelected
                      ? 'text-indigo-700'
                      : 'text-slate-800'
                }`}
              >
                {day}
              </span>
              {totals && mode === 'both' && (
                <>
                  {totals.in > 0 && (
                    <span className="text-[9px] leading-3 font-mono font-bold text-emerald-700 truncate max-w-full">
                      +{formatLakhs(totals.in, lang)}
                    </span>
                  )}
                  {totals.out > 0 && (
                    <span className="text-[9px] leading-3 font-mono font-bold text-rose-600 truncate max-w-full">
                      -{formatLakhs(totals.out, lang)}
                    </span>
                  )}
                </>
              )}
              {totals && mode === 'net' && (totals.in > 0 || totals.out > 0) && (
                <span
                  className={`text-[9px] leading-3 font-mono font-bold truncate max-w-full ${net >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}
                >
                  {net >= 0 ? '+' : ''}
                  {formatLakhs(net, lang)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
