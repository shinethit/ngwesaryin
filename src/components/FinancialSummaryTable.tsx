import React from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
  Wallet as WalletIcon,
  TrendingUp,
  Layers,
  ArrowRightLeft,
  CheckCircle2,
} from 'lucide-react';
import { Transaction, Wallet } from '../types';
import { formatMMK, formatLakhs } from '../utils/formatters';
import { formatCurrency, convertToMMK } from '../utils/currency';
import { isWalletMatch, isTransferTransaction } from '../utils/walletBalance';

interface FinancialSummaryTableProps {
  income: number;
  expense: number;
  incomeCount: number;
  expenseCount: number;
  selectedWallets: Wallet[];
  transactions: Transaction[];
  lang: 'my' | 'en';
  financialSystem?: 'inflow_outflow' | 'opening_closing';
  onChangeFinancialSystem?: (s: 'inflow_outflow' | 'opening_closing') => void;
}

export const FinancialSummaryTable: React.FC<FinancialSummaryTableProps> = ({
  income,
  expense,
  incomeCount,
  expenseCount,
  selectedWallets,
  transactions,
  lang,
  financialSystem: financialSystemProp,
}) => {
  // Two distinct financial systems requested by user:
  // 1. inflow_outflow (ဝင်ငွေ / ထွက်ငွေ စနစ်)
  // 2. opening_closing (စတင်လက်ကျန် / ပိတ်လက်ကျန် စနစ်)
  // [v7.0.7] Controlled by parent if provided; else default
  const financialSystem = financialSystemProp ?? 'opening_closing';

  const net = income - expense;
  const totalCount = incomeCount + expenseCount;
  const expenseRatio = income > 0 ? Math.min(100, Math.round((expense / income) * 100)) : 0;

  // Calculate per-wallet breakdown
  const walletBreakdown = React.useMemo(() => {
    return selectedWallets.map((w) => {
      const wTxs = transactions.filter((t) => isWalletMatch(w, t.walletId) && !isTransferTransaction(t));

      let wInflow = 0;
      let wOutflow = 0;

      wTxs.forEach((t) => {
        const amt = Number(t.amount) || 0;
        if (t.type === 'income') wInflow += amt;
        else if (t.type === 'expense') wOutflow += amt;
      });

      const wNet = wInflow - wOutflow;
      // [v6.7b] Opening = current balance - filtered net (correct for any time filter)
      const opening = (Number(w.balance) || 0) - wNet;
      const closing = opening + wNet;

      return {
        wallet: w,
        opening,
        inflow: wInflow,
        outflow: wOutflow,
        net: wNet,
        closing,
        count: wTxs.length,
      };
    });
  }, [selectedWallets, transactions]);

  // Overall totals
  const breakdownTotals = React.useMemo(() => {
    const totalOpening = walletBreakdown.reduce((sum, item) => sum + item.opening, 0);
    const totalInflow = walletBreakdown.reduce((sum, item) => sum + item.inflow, 0);
    const totalOutflow = walletBreakdown.reduce((sum, item) => sum + item.outflow, 0);
    const totalClosing = totalOpening + totalInflow - totalOutflow;

    return {
      opening: totalOpening,
      inflow: totalInflow,
      outflow: totalOutflow,
      net: totalInflow - totalOutflow,
      closing: totalClosing,
    };
  }, [walletBreakdown]);

  return (
    <div className="space-y-4 w-full bg-slate-50/50 p-1 rounded-3xl">
      {/* ========================================== */}
      {/* SYSTEM 1: INFLOW / OUTFLOW VIEW           */}
      {/* ========================================== */}
      {financialSystem === 'inflow_outflow' && (
        <div className="space-y-3.5 animate-in fade-in duration-200">
          {/* Summary Cards for Inflow / Outflow */}
          <div className="grid grid-cols-3 gap-1.5">
            {/* Total Inflow Card */}
            <div className="bg-white rounded-xl p-2 border border-emerald-200 shadow-2xs space-y-1 bg-gradient-to-br from-emerald-50/40 to-white">
              <div className="flex items-center justify-between text-emerald-800">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                  {lang === 'my' ? 'ဝင်ငွေ (Inflow)' : 'Total Inflow'}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold">
                  {incomeCount} {lang === 'my' ? 'ခု' : 'items'}
                </span>
              </div>
              <div className="text-sm font-black font-mono text-emerald-700 truncate" title={formatLakhs(income, lang)}>
                {formatLakhs(income, lang)}
              </div>
            </div>

            {/* Total Outflow Card */}
            <div className="bg-white rounded-xl p-2 border border-rose-200 shadow-2xs space-y-1 bg-gradient-to-br from-rose-50/40 to-white">
              <div className="flex items-center justify-between text-rose-800">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <ArrowUpRight className="w-4 h-4 text-rose-600" />
                  {lang === 'my' ? 'ထွက်ငွေ (Outflow)' : 'Total Outflow'}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 font-bold">
                  {expenseCount} {lang === 'my' ? 'ခု' : 'items'} ({expenseRatio}%)
                </span>
              </div>
              <div className="text-sm font-black font-mono text-rose-700 truncate" title={formatLakhs(expense, lang)}>
                {formatLakhs(expense, lang)}
              </div>
            </div>

            {/* Net Inflow / Outflow Card */}
            <div className={`bg-white rounded-xl p-2 border shadow-2xs space-y-1 ${net >= 0 ? 'border-emerald-300 bg-gradient-to-br from-emerald-50/60 to-white' : 'border-rose-300 bg-gradient-to-br from-rose-50/60 to-white'}`}>
              <div className={`flex items-center justify-between ${net >= 0 ? 'text-emerald-900' : 'text-rose-900'}`}>
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <Scale className="w-4 h-4" />
                  {lang === 'my' ? 'အသားတင် (Net Inflow/Outflow)' : 'Net Cash Flow'}
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${net >= 0 ? 'bg-emerald-200 text-emerald-950' : 'bg-rose-200 text-rose-950'}`}>
                  {net >= 0 ? (lang === 'my' ? 'ပိုငွေ' : 'Surplus') : (lang === 'my' ? 'လိုငွေ' : 'Deficit')}
                </span>
              </div>
              <div className={`text-sm font-black font-mono truncate ${net >= 0 ? 'text-emerald-800' : 'text-rose-800'}`} title={formatMMK(net)}>
                {net >= 0 ? `+${formatLakhs(net, lang)}` : formatLakhs(net, lang)}
              </div>
            </div>
          </div>

          {/* Wallet Breakdown for Inflow / Outflow (Clean Card / Row layout for mobile readability) */}
          </div>
      )}

      {/* ========================================== */}
      {/* SYSTEM 2: OPENING / CLOSING VIEW          */}
      {/* ========================================== */}
      {financialSystem === 'opening_closing' && (
        <div className="space-y-3.5 animate-in fade-in duration-200">
          {/* Summary Cards for Opening / Closing */}
          <div className="grid grid-cols-3 gap-1.5">
            {/* Total Opening Card */}
            <div className="bg-white rounded-xl p-2 border border-slate-200 shadow-2xs space-y-1 bg-gradient-to-br from-slate-50/60 to-white">
              <div className="flex items-center justify-between text-slate-700">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-slate-600" />
                  {lang === 'my' ? 'စတင်လက်ကျန် (Opening)' : 'Total Opening'}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 font-bold">
                  {lang === 'my' ? 'အစ' : 'Initial'}
                </span>
              </div>
              <div className={`text-sm font-black font-mono truncate ${breakdownTotals.opening < 0 ? 'text-rose-700' : 'text-slate-800'}`} title={formatLakhs(breakdownTotals.opening, lang)}>
                {formatLakhs(breakdownTotals.opening, lang)}
              </div>
            </div>

            {/* Net Movement Card */}
            <div className={`bg-white rounded-xl p-2 border shadow-2xs space-y-1 ${breakdownTotals.net >= 0 ? 'border-indigo-200 bg-gradient-to-br from-indigo-50/40 to-white' : 'border-amber-200 bg-gradient-to-br from-amber-50/40 to-white'}`}>
              <div className={`flex items-center justify-between ${breakdownTotals.net >= 0 ? 'text-indigo-900' : 'text-amber-900'}`}>
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  {lang === 'my' ? 'လှုပ်ရှားမှု (Net Movement)' : 'Net Movement'}
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${breakdownTotals.net >= 0 ? 'bg-indigo-100 text-indigo-900' : 'bg-amber-100 text-amber-900'}`}>
                  {breakdownTotals.net >= 0 ? (lang === 'my' ? 'တိုးတက်' : 'Net In') : (lang === 'my' ? 'လျော့နည်း' : 'Net Out')}
                </span>
              </div>
              <div className={`text-sm font-black font-mono truncate ${breakdownTotals.net >= 0 ? 'text-indigo-700' : 'text-amber-700'}`} title={formatMMK(breakdownTotals.net)}>
                {breakdownTotals.net >= 0 ? `+${formatLakhs(breakdownTotals.net, lang)}` : formatLakhs(breakdownTotals.net, lang)}
              </div>
            </div>

            {/* Total Closing Card */}
            <div className="bg-white rounded-xl p-2 border border-indigo-300 shadow-2xs space-y-1 bg-gradient-to-br from-indigo-50/60 to-white">
              <div className="flex items-center justify-between text-indigo-950">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <WalletIcon className="w-4 h-4 text-indigo-600" />
                  {lang === 'my' ? 'ပိတ်လက်ကျန် (Closing Balance)' : 'Total Closing'}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-200 text-indigo-950 font-bold">
                  {lang === 'my' ? 'လက်ရှိ' : 'Final'}
                </span>
              </div>
              <div className={`text-sm font-black font-mono truncate ${breakdownTotals.closing < 0 ? 'text-rose-700' : 'text-indigo-900'}`} title={formatLakhs(breakdownTotals.closing, lang)}>
                {formatLakhs(breakdownTotals.closing, lang)}
              </div>
            </div>
          </div>

          {/* Wallet Breakdown for Opening / Closing */}
          </div>
      )}
    </div>
  );
};
