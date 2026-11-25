import React, { useMemo, useState } from 'react';
import { PieChart, Tag, ChevronDown } from 'lucide-react';
import { Transaction, Category, Wallet } from '../types';
import { formatMMK, formatLakhs, formatShortDate } from '../utils/formatters';
import { buildWalletMap, isTransferTransaction, isWalletMatch, effectiveIncludeInTotals, convertTxToMMK as sharedConvertTxToMMK } from '../utils/walletBalance';
import { getSplitAttribution, splitAmountMatching } from '../utils/transactionSplits';
import { useAuth } from '../context/AuthContext';
import { getLocalDateString } from '../utils/dateUtils';
import { CategoryIcon } from './CategoryIcon';
import {
  buildDonutSubBreakdown,
  buildDonutCategoryRecords,
  buildDonutLabelPlacements,
  donutRecordLabel,
} from '../utils/donutDrilldown';

interface CurrentMonthExpenseDonutChartProps {
  transactions: Transaction[];
  categories: Category[];
  wallets?: Wallet[];
  lang: 'my' | 'en';
  // [v7.6.32] Donut drill-down: tapping a record in the expanded
  // category panel opens the read-only detail view (App threads
  // setViewingTransaction). Optional; when absent the record rows
  // are display-only (guest harness / unsigned use).
  onSelectTransaction?: (t: Transaction) => void;
}

export const CurrentMonthExpenseDonutChart: React.FC<CurrentMonthExpenseDonutChartProps> = ({
  transactions,
  categories,
  wallets = [],
  lang,
  onSelectTransaction,
}) => {
  // [v7.5.55 D18] Convert amounts to MMK via each transaction's wallet.
  // [v7.6.07] The optional amount converts one split slice instead of
  // the whole record (same wallet lookup either way).
  const walletMap = useMemo(() => buildWalletMap(wallets), [wallets]);
  const convertTxToMMK = (t: Transaction, amount: number = t.amount) =>
    sharedConvertTxToMMK(walletMap, wallets, t, amount);
  const currentYearMonth = useMemo(() => getLocalDateString(new Date()).slice(0, 7), []);
  // [v7.5.60 A-S19] Phone has no hover — tapping an amount toggles it
  // between lakhs and the exact kyat value.
  const [showExact, setShowExact] = useState(false);
  const displayAmount = (v: number) => (showExact ? formatMMK(v) : formatLakhs(v, lang));
  // [v7.6.32] Drill-down: one expanded category row at a time; null
  // when every row is collapsed.
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  // [v7.5.68] Per-viewer shared-wallet scope overrides.
  const { sharedWalletScopeOverrides } = useAuth();

  // Filter current month expenses
  const currentMonthExpenses = useMemo(() => {
    return transactions.filter((t) => {
      if (t.type !== 'expense') return false;
      if (isTransferTransaction(t)) return false;
      if (!t.date || !t.date.startsWith(currentYearMonth)) return false;
      // [v7.5.60 M-01] Separate wallets excluded (Dashboard scope).
      const w = walletMap.get(t.walletId) || wallets.find((wall) => isWalletMatch(wall, t.walletId));
      if (w && !effectiveIncludeInTotals(w, sharedWalletScopeOverrides)) return false;
      return true;
    });
  }, [transactions, currentYearMonth, sharedWalletScopeOverrides]);

  const totalExpense = useMemo(() => {
    return currentMonthExpenses.reduce((sum, t) => sum + convertTxToMMK(t), 0);
  }, [currentMonthExpenses, walletMap, wallets]);

  // Aggregate by category
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { categoryId: string; amount: number; count: number }>();

    currentMonthExpenses.forEach((t) => {
      // [v7.6.07] Split-aware: each slice counts under its own
      // category. The record count stays ONE per record, counted
      // under the first (primary) slice.
      getSplitAttribution(t).forEach((slice, sliceIdx) => {
        const existing = map.get(slice.categoryId) || { categoryId: slice.categoryId, amount: 0, count: 0 };
        existing.amount += convertTxToMMK(t, slice.amount);
        if (sliceIdx === 0) existing.count += 1;
        map.set(slice.categoryId, existing);
      });
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
  }, [currentMonthExpenses, catMap, lang, totalExpense, walletMap, wallets]);

  // Build SVG Donut slices
  const svgSlices = useMemo(() => {
    let accumulatedAngle = 0;
    const radius = 40;
    const circumference = 2 * Math.PI * radius;

    return categoryBreakdown.map((item) => {
      const fraction = totalExpense > 0 ? item.amount / totalExpense : 0;
      const startFraction = accumulatedAngle;
      const strokeDasharray = `${fraction * circumference} ${circumference}`;
      const strokeDashoffset = -accumulatedAngle * circumference;
      accumulatedAngle += fraction;

      return {
        ...item,
        fraction,
        startFraction,
        strokeDasharray,
        strokeDashoffset,
      };
    });
  }, [categoryBreakdown, totalExpense]);

  // [v7.6.32] Callout labels for large slices only (see
  // buildDonutLabelPlacements): the donut math above is untouched —
  // the placements derive from the same fractions.
  const labelPlacements = useMemo(
    () => buildDonutLabelPlacements(svgSlices),
    [svgSlices],
  );
  const labelPlacementById = useMemo(
    () => new Map(labelPlacements.map((p) => [p.categoryId, p])),
    [labelPlacements],
  );

  // [v7.6.32] Expanded-row detail for the single expanded category:
  // sub-category breakdown + records, from the same month-scoped
  // expenses and the same MMK converter as the donut, so the panel
  // always foots to the slice.
  const expandedDetail = useMemo(() => {
    if (!expandedCategoryId) return null;
    const item = categoryBreakdown.find((c) => c.categoryId === expandedCategoryId);
    if (!item) return null;
    const cat = catMap.get(expandedCategoryId);
    return {
      item,
      subRows: buildDonutSubBreakdown(currentMonthExpenses, expandedCategoryId, cat, convertTxToMMK, lang),
      records: buildDonutCategoryRecords(currentMonthExpenses, expandedCategoryId, convertTxToMMK),
    };
  }, [expandedCategoryId, categoryBreakdown, catMap, currentMonthExpenses, lang, walletMap, wallets]);

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
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-3.5 sm:p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center shrink-0 shadow-2xs">
            <PieChart className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="font-bold text-xs sm:text-sm text-slate-900">
              {lang === 'my' ? `ယခုလ (${currentMonthName}) ထွက်ငွေ အမျိုးအစားခွဲ Donut ဇယား` : `Current Month (${currentMonthName}) Expense Donut Chart`}
            </h3>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowExact((v) => !v)}
          className="px-2.5 py-1 rounded-xl bg-rose-50 text-rose-800 font-mono text-xs font-bold border border-rose-200 cursor-pointer"
          title={formatMMK(totalExpense)}
        >
          -{displayAmount(totalExpense)}
        </button>
      </div>

      {categoryBreakdown.length === 0 ? (
        <div className="py-4 text-center text-slate-400 text-xs space-y-2">
          <Tag className="w-8 h-8 mx-auto text-slate-300" />
          <p>{lang === 'my' ? 'ယခုလအတွက် ထွက်ငွေ မှတ်တမ်း မရှိသေးပါ။' : 'No expense records for the current month yet.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
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
              {/* [v7.6.32] Callout labels for large slices only: name +
                  value + % beside the donut, vertically centered on
                  each slice's mid-angle. Anchored at the wrapper's
                  left/right edges so nothing clips; narrow screens
                  only — on md+ the legend already sits beside the
                  donut. Non-interactive: the rows below are the taps. */}
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 md:hidden">
                {svgSlices.map((slice) => {
                  const placement = labelPlacementById.get(slice.categoryId);
                  if (!placement) return null;
                  const isLeft = placement.side === 'left';
                  return (
                    <div
                      key={slice.categoryId}
                      // [v7.6.32] EXPLICIT width, not max-width: an
                      // absolutely positioned box at left/right:100%
                      // has zero available width in its containing
                      // block, so max-width shrink-wraps it to the
                      // longest single word and every value wraps
                      // mid-phrase. A fixed 88px box lets short values
                      // sit on one line and long exact-mode values wrap
                      // at the spaces.
                      className="absolute w-[88px] sm:w-[104px]"
                      style={isLeft
                        ? { right: '100%', top: `${placement.topPct}%`, transform: 'translate(-6px, -50%)' }
                        : { left: '100%', top: `${placement.topPct}%`, transform: 'translate(6px, -50%)' }}
                    >
                      <div className={`flex items-center gap-1 ${isLeft ? 'justify-end' : ''}`}>
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                        <span className="truncate text-[10px] font-bold text-slate-900">{slice.name}</span>
                      </div>
                      {/* [v7.6.32] The value line WRAPS (no
                          whitespace-nowrap): an exact-mode value such
                          as "510,000 MMK · 51%" is wider than the 88px
                          box and would otherwise overflow past the
                          viewport edge and clip the %. Wrapping breaks
                          at the spaces, so the % stays visible. */}
                      <div className={`font-mono text-[10px] font-bold text-rose-600 leading-[1.25] ${isLeft ? 'text-right' : ''}`}>
                        {displayAmount(slice.amount)} · {slice.percentage}%
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Center Total Info */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{lang === 'my' ? 'စုစုပေါင်း' : 'Total'}</span>
                <button
                  type="button"
                  onClick={() => setShowExact((v) => !v)}
                  className="font-black text-xs sm:text-sm font-mono text-slate-900 truncate max-w-[120px] cursor-pointer"
                  title={formatMMK(totalExpense)}
                >
                  {displayAmount(totalExpense)}
                </button>
                <span className="text-[9px] text-rose-600 font-bold mt-0.5">{categoryBreakdown.length} {lang === 'my' ? 'ကဏ္ဍ' : 'categories'}</span>
              </div>
            </div>
          </div>

          {/* Category Breakdown Legend / List */}
          <div className="md:col-span-7 space-y-2 max-h-60 overflow-y-auto overflow-x-hidden pr-1">
            {categoryBreakdown.map((item) => {
              const isExpanded = expandedCategoryId === item.categoryId;
              const detail = isExpanded ? expandedDetail : null;
              return (
              <div
                key={item.categoryId}
                className="p-2.5 rounded-2xl bg-slate-50/80 border border-slate-200/70 hover:bg-white transition-all space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  {/* [v7.6.32] The row is tappable: it expands the
                      sub-category + record panel below. The amount
                      button stays a sibling, so its lakh/exact
                      toggle never toggles the expansion. */}
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    onClick={() => setExpandedCategoryId(isExpanded ? null : item.categoryId)}
                    className="flex flex-1 items-center gap-2 min-w-0 min-h-[44px] text-left cursor-pointer rounded-xl"
                  >
                    <div
                      className="w-7 h-7 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs"
                      style={{ backgroundColor: item.color }}
                    >
                      <CategoryIcon name={item.icon} className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs text-slate-900 truncate">{item.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{item.count} {lang === 'my' ? 'မှတ်တမ်း' : 'txs'}</div>
                    </div>
                    <ChevronDown className={`w-4 h-4 shrink-0 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  <div className="text-right shrink-0">
                    <button type="button" onClick={() => setShowExact((v) => !v)} className="font-mono font-black text-xs text-slate-900 cursor-pointer" title={formatMMK(item.amount)}>{displayAmount(item.amount)}</button>
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

                {/* [v7.6.32] Expanded drill-down: sub-category split
                    (% of THIS category) + this month's records. */}
                {isExpanded && detail && (
                  <div className="pt-2 mt-1 border-t border-slate-200/70 space-y-2.5">
                    <div className="space-y-1.5">
                      {detail.subRows.map((sub) => (
                        <div key={sub.key} className="space-y-0.5">
                          <div className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="font-semibold text-slate-700 truncate">{sub.name}</span>
                            <span className="font-mono font-bold text-slate-900 shrink-0 whitespace-nowrap">{displayAmount(sub.amount)} · {sub.percentage}%</span>
                          </div>
                          <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${sub.percentage}%`, backgroundColor: item.color }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {detail.records.length} {lang === 'my' ? 'မှတ်တမ်း' : 'records'}
                      </div>
                      {detail.records.map(({ tx, amount }) => {
                        const label = donutRecordLabel(tx, catMap.get(item.categoryId), lang);
                        const rowInner = (
                          <>
                            <span className="font-mono text-[11px] text-slate-400 shrink-0">{formatShortDate(tx.date)}</span>
                            <span className="flex-1 min-w-0 truncate text-[11px] font-medium text-slate-700">{label}</span>
                            <span className="font-mono text-[11px] font-bold text-slate-900 shrink-0 whitespace-nowrap">{displayAmount(amount)}</span>
                          </>
                        );
                        return onSelectTransaction ? (
                          <button
                            key={tx.id}
                            type="button"
                            onClick={() => onSelectTransaction(tx)}
                            className="w-full flex items-center gap-2 rounded-lg px-1.5 text-left hover:bg-white active:bg-slate-100 cursor-pointer min-h-[44px]"
                          >
                            {rowInner}
                          </button>
                        ) : (
                          <div
                            key={tx.id}
                            className="w-full flex items-center gap-2 px-1.5 min-h-[44px]"
                          >
                            {rowInner}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
