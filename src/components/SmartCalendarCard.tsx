import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Tag, Wallet as WalletIcon, Check, Filter } from 'lucide-react';
import { Transaction, Category, Wallet } from '../types';
import { formatMMK, getCategoryDisplayName } from '../utils/formatters';
import { isTransferTransaction, isWalletMatch } from '../utils/walletBalance';
import { CategoryIcon } from './CategoryIcon';

interface SmartCalendarCardProps {
  transactions: Transaction[];
  categories?: Category[];
  wallets?: Wallet[];
  lang: 'my' | 'en';
}

const getLocalDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// [v6.1.7] Compact number format for tight calendar cells
// [v7.5.58] Capped at 4 decimals so the longest token stays short
// (e.g. "12.3456") and cannot overflow the tiny day cells.
// Converts to lakhs (÷ 100,000) with up to 4 decimals, strips trailing zeros
// Examples: 100000 → "1" | 50000 → "0.5" | 63000 → "0.63"
//           72300 → "0.723" | 72350 → "0.7235" | 85015 → "0.8502"
const formatShortLakhs = (amount: number): string => {
  if (!Number.isFinite(amount) || amount === 0) return '0';
  const lakhs = Math.abs(amount) / 100000;
  return lakhs.toFixed(4).replace(/\.?0+$/, '');
};

export const SmartCalendarCard: React.FC<SmartCalendarCardProps> = ({
  transactions,
  categories = [],
  wallets = [],
  lang,
}) => {
  const todayStr = getLocalDateString(new Date());
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDayStr, setSelectedDayStr] = useState<string | null>(todayStr);

  // [v6.1.8] Multi-select wallet filter
  const [selectedWalletIds, setSelectedWalletIds] = useState<string[]>([]);
  const [walletFilterOpen, setWalletFilterOpen] = useState(false);
  const walletFilterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!walletFilterOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (walletFilterRef.current && !walletFilterRef.current.contains(e.target as Node)) {
        setWalletFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [walletFilterOpen]);

  const toggleWallet = (walletId: string) => {
    setSelectedWalletIds((prev) =>
      prev.includes(walletId) ? prev.filter((id) => id !== walletId) : [...prev, walletId]
    );
  };

  // [v7.5.55] The wallets prop is the Dashboard scope (A5): drop any selected
  // ids that are no longer in scope so the filter never goes stale-empty.
  useEffect(() => {
    setSelectedWalletIds((prev) => {
      const pruned = prev.filter((id) => wallets.some((w) => w.id === id));
      return pruned.length === prev.length ? prev : pruned;
    });
  }, [wallets]);

  const selectAllWallets = () => setSelectedWalletIds(wallets.map((w) => w.id));
  const clearWallets = () => setSelectedWalletIds([]);

  // [v7.5.55] [] and "every id" both mean "all" (A9): only a partial
  // selection is shown as "N / M selected".
  const isAllWalletsShown =
    selectedWalletIds.length === 0 || selectedWalletIds.length === wallets.length;

  const matchesWalletFilter = (walletId: string | undefined): boolean => {
    if (selectedWalletIds.length === 0) return true;
    if (!walletId) return false;
    return wallets.some(
      (w) => selectedWalletIds.includes(w.id) && isWalletMatch(w, walletId)
    );
  };

  // [v7.5.56] Shared-wallet helpers (finding 25): 🤝 + owner name.
  const isSharedWallet = (w: Wallet | undefined | null): boolean =>
    !!w && (!!w.isSharedFromOther || !!(w.sharedWith && w.sharedWith.length > 0));
  const getWalletOwnerName = (w: Wallet | undefined | null): string =>
    w?.ownerName || w?.ownerEmail || '';
  const findWalletForTx = (walletId: string | undefined): Wallet | undefined =>
    walletId ? wallets.find((w) => isWalletMatch(w, walletId)) : undefined;

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

  // [v7.5.60 S19] Phones have no hover for the title tooltips: tapping
  // a lakh amount toggles it to the exact kyat value, and back.
  const [amountsExact, setAmountsExact] = useState(false);
  const toggleExactAmounts = () => setAmountsExact((v) => !v);
  const fmtCell = (amount: number): string =>
    amountsExact ? formatMMK(Math.abs(amount)) : formatShortLakhs(amount);

  const shiftMonth = (offset: number) => {
    const next = new Date(year, month + offset, 1);
    setViewDate(next);
    // [v7.5.60 S21] The selected day belongs to the old month — pick the
    // matching day in the new month (today if it is this month, else the 1st).
    if (selectedDayStr) {
      const nextKey = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
      if (selectedDayStr.slice(0, 7) !== nextKey) {
        const today = new Date();
        const isCurrentMonth =
          next.getFullYear() === today.getFullYear() && next.getMonth() === today.getMonth();
        setSelectedDayStr(isCurrentMonth ? getLocalDateString(today) : `${nextKey}-01`);
      }
    }
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
    const map = new Map<string, { income: number; expense: number; count: number; net: number; sharedIncome: number; sharedExpense: number }>();

    transactions.forEach((t) => {
      if (!t || !t.date || isTransferTransaction(t)) return;
      if (!t.date.startsWith(monthKey)) return;
      if (!matchesWalletFilter(t.walletId)) return;

      const existing = map.get(t.date) || { income: 0, expense: 0, count: 0, net: 0, sharedIncome: 0, sharedExpense: 0 };
      const amt = Number(t.amount) || 0;
      // [v7.5.56] Shared/own split for the month summary (finding 24).
      const shared = isSharedWallet(findWalletForTx(t.walletId));
      if (t.type === 'income') {
        existing.income += amt;
        if (shared) existing.sharedIncome += amt;
      } else if (t.type === 'expense') {
        existing.expense += amt;
        if (shared) existing.sharedExpense += amt;
      }
      existing.net = existing.income - existing.expense;
      existing.count += 1;
      map.set(t.date, existing);
    });

    return map;
  }, [transactions, monthKey, selectedWalletIds, wallets]);

  // [v7.5.56] Month shared totals, for the split line under the header.
  const monthSharedSummary = useMemo(() => {
    let income = 0;
    let expense = 0;
    dailyMap.forEach((d) => {
      income += d.sharedIncome;
      expense += d.sharedExpense;
    });
    return { income, expense, net: income - expense };
  }, [dailyMap]);

  // Selected day transactions
  const selectedDayTxs = useMemo(() => {
    if (!selectedDayStr) return [];
    return transactions.filter(
      (t) =>
        t &&
        t.date === selectedDayStr &&
        !isTransferTransaction(t) &&
        matchesWalletFilter(t.walletId)
    );
  }, [transactions, selectedDayStr, selectedWalletIds, wallets]);

  // [v7.5.60 N5] Transfers are excluded from the totals above, but a day
  // with ONLY transfers is not an empty day — count them so the empty
  // state can say so instead of "မှတ်တမ်း မရှိပါ".
  const selectedDayTransferCount = useMemo(() => {
    if (!selectedDayStr) return 0;
    return transactions.filter(
      (t) =>
        t &&
        t.date === selectedDayStr &&
        isTransferTransaction(t) &&
        matchesWalletFilter(t.walletId)
    ).length;
  }, [transactions, selectedDayStr, selectedWalletIds, wallets]);

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

  // [v7.5.56] Selected-day shared/own split (finding 24).
  const selectedDaySharedSummary = useMemo(() => {
    let income = 0;
    let expense = 0;
    selectedDayTxs.forEach((t) => {
      if (!isSharedWallet(findWalletForTx(t.walletId))) return;
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') income += amt;
      else if (t.type === 'expense') expense += amt;
    });
    return { income, expense, net: income - expense };
  }, [selectedDayTxs, wallets]);

  const weekDays = lang === 'my'
    ? ['တနင်္ဂနွေ', 'တနင်္လာ', 'အင်္ဂါ', 'ဗုဒ္ဓဟူး', 'ကြာသပတေး', 'သောကြာ', 'စနေ']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // [v7.5.60 S18] Full names ("ကြာသပတေး") wrap to 2 lines in a ~49px
  // phone cell — one-syllable short names on small screens.
  const weekDaysShort = lang === 'my'
    ? ['နွေ', 'လာ', 'ဂါ', 'ဟူး', 'ကြာ', 'သော', 'စနေ']
    : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  // [v7.5.55] Localized selected-day label with hardcoded Myanmar names
  // (some phone browsers lack the Intl 'my-MM' locale) — was raw ISO.
  const formatSelectedDay = (dateStr: string): string => {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const dt = new Date(y, m, d);
    if (isNaN(dt.getTime())) return dateStr;
    if (lang === 'my') return `${weekDays[dt.getDay()]}၊ ${d} ${monthNameMy[m]} ${y} ခုနှစ်`;
    const daysEnFull = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return `${daysEnFull[dt.getDay()]}, ${d} ${monthNameEn[m]} ${y}`;
  };

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
              {lang === 'my' ? 'ရက်စွဲအလိုက် ဝင်၊ ထွက်၊ ကျန် — သိန်းဂဏန်းဖြင့် (×100,000) · ပမာဏကို နှိပ်ရင် ကျပ်အတိအကျ ကြည့်နိုင်ပါသည်' : 'Daily In, Out, Net — in lakhs (×100,000) · tap an amount to see the exact kyat value'}
            </p>
            {/* [v7.5.56] Month shared split (finding 24). */}
            {(monthSharedSummary.income > 0 || monthSharedSummary.expense > 0) && (
              <p className="text-[11px] text-amber-700 font-semibold" title={`🤝 Shared in: ${formatMMK(monthSharedSummary.income)} · out: ${formatMMK(monthSharedSummary.expense)}`}>
                {lang === 'my'
                  ? `🤝 ဒီလ မျှဝေထား — ဝင် +${fmtCell(monthSharedSummary.income)} · ထွက် -${fmtCell(monthSharedSummary.expense)} · ကျန် ${monthSharedSummary.net >= 0 ? '+' : ''}${fmtCell(monthSharedSummary.net)}`
                  : `🤝 Shared this month — in +${fmtCell(monthSharedSummary.income)} · out -${fmtCell(monthSharedSummary.expense)} · net ${monthSharedSummary.net >= 0 ? '+' : ''}${fmtCell(monthSharedSummary.net)}`}
              </p>
            )}
          </div>
        </div>

        {/* Month Switcher */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl self-start sm:self-auto border border-slate-200/80">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="min-w-11 min-h-11 p-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition-all cursor-pointer flex items-center justify-center"
            aria-label={lang === 'my' ? 'ပြီးခဲ့သည့်လ' : 'Previous month'}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 text-xs font-black text-slate-800 font-mono">
            {currentMonthTitle}
          </span>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="min-w-11 min-h-11 p-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition-all cursor-pointer flex items-center justify-center"
            aria-label={lang === 'my' ? 'နောက်လ' : 'Next month'}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* [v6.1.8] Multi-Select Wallet Filter */}
      {wallets.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <WalletIcon className="w-3.5 h-3.5 text-indigo-600" />
            <span>{lang === 'my' ? 'ပိုက်ဆံအိတ် ရွေးရန်:' : 'Wallet Filter:'}</span>
          </div>

          <div className="relative" ref={walletFilterRef}>
            <button
              type="button"
              onClick={() => setWalletFilterOpen((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 min-h-11 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                !isAllWalletsShown
                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>
                {isAllWalletsShown
                  ? (lang === 'my' ? 'ပိုက်ဆံအိတ် အားလုံး (Dashboard အတိုင်း)' : 'All Wallets (as on Dashboard)')
                  : `${selectedWalletIds.length} / ${wallets.length} ${lang === 'my' ? 'ရွေးထား' : 'selected'}`}
              </span>
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${walletFilterOpen ? 'rotate-90' : ''}`} />
            </button>

            {walletFilterOpen && (
              <div className="absolute right-0 top-full mt-2 z-30 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50">
                  <button
                    type="button"
                    onClick={selectAllWallets}
                    className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 cursor-pointer"
                  >
                    ✓ {lang === 'my' ? 'အားလုံး' : 'All'}
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={clearWallets}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-800 cursor-pointer"
                  >
                    ✕ {lang === 'my' ? 'ရှင်းမည်' : 'Clear'}
                  </button>
                </div>

                <div className="max-h-64 overflow-y-auto overflow-x-hidden py-1">
                  {wallets.map((w) => {
                    const isSelected = selectedWalletIds.includes(w.id);
                    // [v7.5.56] Shared badge + owner name (finding 25).
                    const shared = isSharedWallet(w);
                    const owner = getWalletOwnerName(w);
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => toggleWallet(w.id)}
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left transition-colors cursor-pointer ${
                          isSelected ? 'bg-indigo-50 hover:bg-indigo-100' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span
                            className="w-6 h-6 rounded-lg flex items-center justify-center text-white shrink-0"
                            style={{ backgroundColor: w.color || '#6366F1' }}
                          >
                            <WalletIcon className="w-3 h-3" />
                          </span>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-800 truncate">
                              {shared ? '🤝 ' : ''}{lang === 'my' ? w.name : w.nameEn || w.name}
                            </div>
                            {shared && (
                              <div className="text-[10px] text-amber-700 font-semibold truncate">
                                {owner
                                  ? (lang === 'my' ? `ပိုင်ရှင်: ${owner}` : `Owner: ${owner}`)
                                  : (lang === 'my' ? 'မျှဝေထားသော အိတ်' : 'Shared wallet')}
                              </div>
                            )}
                            <div className="text-[10px] text-slate-400 font-mono truncate">
                              {formatMMK(w.balance)}
                            </div>
                          </div>
                        </div>
                        <span
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-indigo-600 border-indigo-600'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="px-3 py-2 border-t border-slate-100 bg-slate-50">
                  <button
                    type="button"
                    onClick={() => setWalletFilterOpen(false)}
                    className="w-full py-1.5 bg-slate-900 text-white rounded-lg text-[11px] font-bold hover:bg-slate-800 cursor-pointer"
                  >
                    {/* [v7.5.55] Selection applies live on toggle; this button
                        only closes the popover, so it is labelled Close. */}
                    {lang === 'my' ? 'ပိတ်မည်' : 'Close'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
        {/* Weekdays Header */}
        <div className="grid grid-cols-7 bg-slate-100 border-b border-slate-200 text-center text-[10px] sm:text-xs font-bold text-slate-600 py-2">
          {weekDays.map((w, idx) => (
            <div key={idx} className={idx === 0 || idx === 6 ? 'text-rose-600' : ''}>
              <span className="sm:hidden">{weekDaysShort[idx]}</span>
              <span className="hidden sm:inline">{w}</span>
            </div>
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
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedDayStr(slot.dateStr)}
                aria-pressed={isSelected}
                aria-label={`${formatSelectedDay(slot.dateStr)}${metrics ? ` — ${lang === 'my' ? 'ဝင်ငွေ' : 'income'} ${formatMMK(metrics.income)}, ${lang === 'my' ? 'ထွက်ငွေ' : 'expense'} ${formatMMK(metrics.expense)}` : ''}`}
                className={`bg-white min-h-[72px] sm:min-h-[88px] p-1.5 sm:p-2 flex flex-col justify-between transition-all cursor-pointer hover:bg-indigo-50/40 relative text-left w-full ${
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

                {/* Day In / Out / Net Badges — tap an amount to toggle
                    lakh ↔ exact kyat (S19); the tap must not re-select
                    the day, so it stops propagation. */}
                {metrics ? (
                  <div className="space-y-0.5 text-[9px] font-mono">
                    {metrics.income > 0 && (
                      <div className="text-emerald-700 font-bold truncate" title={`In: +${formatMMK(metrics.income)}`}>
                        <span onClick={(e) => { e.stopPropagation(); toggleExactAmounts(); }} className="cursor-pointer">+{fmtCell(metrics.income)}</span>
                      </div>
                    )}
                    {metrics.expense > 0 && (
                      <div className="text-rose-600 font-bold truncate" title={`Out: -${formatMMK(metrics.expense)}`}>
                        <span onClick={(e) => { e.stopPropagation(); toggleExactAmounts(); }} className="cursor-pointer">-{fmtCell(metrics.expense)}</span>
                      </div>
                    )}
                    {/* [v7.5.55] Net row: the header promises ဝင်/ထွက်/ကျန်
                        but cells only showed income/expense. */}
                    {(metrics.income > 0 || metrics.expense > 0) && (
                      <div className="text-indigo-700 font-bold truncate" title={`Net: ${metrics.net >= 0 ? '+' : ''}${formatMMK(metrics.net)}`}>
                        <span onClick={(e) => { e.stopPropagation(); toggleExactAmounts(); }} className="cursor-pointer">{metrics.net >= 0 ? '+' : '-'}{fmtCell(metrics.net)}</span>
                      </div>
                    )}
                    {metrics.income === 0 && metrics.expense === 0 && (
                      <div className="text-slate-300 text-[8px]">-</div>
                    )}
                  </div>
                ) : (
                  <div className="text-[9px] text-slate-300">-</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Details Card with Clean Structured Table */}
      {selectedDayStr && (
        <div className="bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 rounded-2xl p-4 border border-indigo-200/90 shadow-2xs space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 pb-2.5">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <span className="font-black text-xs sm:text-sm text-indigo-950 font-mono bg-white px-2.5 py-1 rounded-xl border border-indigo-200 shadow-2xs min-w-0 truncate">
                📅 {formatSelectedDay(selectedDayStr)}
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 shrink-0">
                {selectedDayTxs.length} {lang === 'my' ? 'မှတ်တမ်း' : 'records'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDayStr(null)}
              className="text-slate-400 hover:text-slate-700 text-xs font-bold px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer shrink-0"
            >
              ✕ {lang === 'my' ? 'ပိတ်မည်' : 'Close'}
            </button>
          </div>

          {/* Summary for selected day — tap an amount to toggle lakh ↔ exact kyat (S19) */}
          <div className="grid grid-cols-3 gap-2.5 text-xs font-mono font-bold">
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-center shadow-2xs">
              <div className="text-[10px] font-sans font-semibold text-emerald-700">{lang === 'my' ? 'ဝင်ငွေ' : 'Income'}</div>
              <button type="button" onClick={toggleExactAmounts} className="text-xs sm:text-sm font-black cursor-pointer" title={`+${formatMMK(selectedDaySummary.income)}`}>+{fmtCell(selectedDaySummary.income)}</button>
            </div>
            <div className="p-2.5 rounded-2xl bg-rose-50 text-rose-900 border border-rose-200 text-center shadow-2xs">
              <div className="text-[10px] font-sans font-semibold text-rose-700">{lang === 'my' ? 'ထွက်ငွေ' : 'Expense'}</div>
              <button type="button" onClick={toggleExactAmounts} className="text-xs sm:text-sm font-black cursor-pointer" title={`-${formatMMK(selectedDaySummary.expense)}`}>-{fmtCell(selectedDaySummary.expense)}</button>
            </div>
            <div className={`p-2.5 rounded-2xl border text-center shadow-2xs ${selectedDaySummary.net >= 0 ? 'bg-indigo-50 text-indigo-950 border-indigo-200' : 'bg-rose-50 text-rose-950 border-rose-200'}`}>
              <div className="text-[10px] font-sans font-semibold opacity-85">{lang === 'my' ? 'အသားတင်' : 'Net'}</div>
              <button type="button" onClick={toggleExactAmounts} className="text-xs sm:text-sm font-black cursor-pointer" title={`${selectedDaySummary.net >= 0 ? '+' : ''}${formatMMK(selectedDaySummary.net)}`}>{selectedDaySummary.net >= 0 ? '+' : ''}{fmtCell(selectedDaySummary.net)}</button>
            </div>
          </div>

          {/* [v7.5.56] Selected-day shared split (finding 24). */}
          {(selectedDaySharedSummary.income > 0 || selectedDaySharedSummary.expense > 0) && (
            <div className="text-[11px] text-amber-800 font-semibold bg-amber-50 border border-amber-200 rounded-xl px-2.5 py-1.5" title={`🤝 Shared in: ${formatMMK(selectedDaySharedSummary.income)} · out: ${formatMMK(selectedDaySharedSummary.expense)}`}>
              {lang === 'my'
                ? `🤝 မျှဝေထား — ဝင် +${fmtCell(selectedDaySharedSummary.income)} · ထွက် -${fmtCell(selectedDaySharedSummary.expense)} · ကျန် ${selectedDaySharedSummary.net >= 0 ? '+' : ''}${fmtCell(selectedDaySharedSummary.net)}`
                : `🤝 Shared — in +${fmtCell(selectedDaySharedSummary.income)} · out -${fmtCell(selectedDaySharedSummary.expense)} · net ${selectedDaySharedSummary.net >= 0 ? '+' : ''}${fmtCell(selectedDaySharedSummary.net)}`}
            </div>
          )}

          {/* Transactions Structured Table for Selected Day */}
          {selectedDayTxs.length === 0 ? (
            <div className="py-6 text-center text-slate-400 text-xs">
              {selectedDayTransferCount > 0
                ? (lang === 'my'
                  ? `လွှဲပြောင်းမှု ${selectedDayTransferCount} ခု ရှိသည် (ဝင်ငွေ/ထွက်ငွေ အဖြစ် မရေတွက်ပါ)`
                  : `${selectedDayTransferCount} transfer(s) on this day (not counted as income/expense)`)
                : (lang === 'my' ? 'ဤနေ့တွင် မှတ်တမ်း မရှိပါ။' : 'No transactions recorded on this date.')}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/90 overflow-x-auto shadow-2xs">
              <table className="w-full table-fixed text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold text-[11px]">
                    <th className="py-2.5 px-3">{lang === 'my' ? 'အမျိုးအစား / မှတ်ချက်' : 'Category / Note'}</th>
                    <th className="py-2.5 px-3 text-right w-24">{lang === 'my' ? 'ပမာဏ (သိန်း)' : 'Amount (lakh)'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {selectedDayTxs.map((t) => {
                    const isInc = t.type === 'income';
                    const cat = catMap.get(t.category);
                    const catName = getCategoryDisplayName(t.category, categories, lang);
                    const catColor = cat?.color || (isInc ? '#10B981' : '#EF4444');
                    const catIcon = cat?.icon || 'Tag';
                    // [v7.5.56] Shared badge on the row's wallet (finding 25).
                    const txWallet = findWalletForTx(t.walletId);
                    const txShared = isSharedWallet(txWallet);
                    const txOwner = getWalletOwnerName(txWallet);

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
                              <div className="font-bold text-slate-900 truncate">
                                {catName}
                                {txShared && (
                                  <span className="ml-1.5 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded px-1 py-0.5 whitespace-nowrap" title={txOwner ? `${lang === 'my' ? 'ပိုင်ရှင်' : 'Owner'}: ${txOwner}` : undefined}>
                                    🤝 {txOwner || (lang === 'my' ? 'မျှဝေထား' : 'Shared')}
                                  </span>
                                )}
                              </div>
                              {t.note && (
                                <div className="text-[11px] text-slate-500 truncate italic">"{t.note}"</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right shrink-0 whitespace-nowrap">
                          <button type="button" onClick={toggleExactAmounts}
                            className={`font-mono font-bold text-xs sm:text-sm cursor-pointer ${isInc ? 'text-emerald-700' : 'text-rose-600'}`}
                            title={isInc ? `+${formatMMK(t.amount)}` : `-${formatMMK(t.amount)}`}>
                            {isInc ? `+${fmtCell(t.amount)}` : `-${fmtCell(t.amount)}`}
                          </button>
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
