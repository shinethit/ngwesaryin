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
import { formatMMK, formatTableLakhs } from '../utils/formatters';
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
}

export const FinancialSummaryTable: React.FC<FinancialSummaryTableProps> = ({
  income,
  expense,
  incomeCount,
  expenseCount,
  selectedWallets,
  transactions,
  lang,
}) => {
  // Two distinct financial systems requested by user:
  // 1. inflow_outflow (ဝင်ငွေ / ထွက်ငွေ စနစ်)
  // 2. opening_closing (စတင်လက်ကျန် / ပိတ်လက်ကျန် စနစ်)
  // [v6.7c] Opening/Closing is the default view
  const [financialSystem, setFinancialSystem] = React.useState<'inflow_outflow' | 'opening_closing'>('opening_closing');

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
      {/* Main Header & System Switcher Cards */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-3.5 sm:p-4 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 shadow-2xs">
              <Scale className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-slate-900">
                {lang === 'my' ? 'ဘဏ္ဍာရေး ငွေကြေးစီးဆင်းမှု စနစ် နှစ်မျိုး' : 'Dual-System Financial Cash Flow'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {lang === 'my'
                  ? 'ဝင်ငွေ/ထွက်ငွေ နှင့် စတင်/ပိတ်လက်ကျန် အခြေအနေများကို ရှင်းလင်းစွာ လေ့လာပါ'
                  : 'Clear breakdown of Inflow/Outflow and Opening/Closing systems'}
              </p>
            </div>
          </div>

          {/* System Selection Tabs (Primary Switcher) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl self-stretch sm:self-auto border border-slate-200/80">
            <button
              type="button"
              onClick={() => setFinancialSystem('opening_closing')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                financialSystem === 'opening_closing'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>{lang === 'my' ? '၁။ Opening / Closing' : '1. Opening / Closing'}</span>
            </button>
            <button
              type="button"
              onClick={() => setFinancialSystem('inflow_outflow')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                financialSystem === 'inflow_outflow'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{lang === 'my' ? '၂။ Inflow / Outflow' : '2. Inflow / Outflow'}</span>
            </button>
          </div>
        </div>

        {/* System Description Banner */}
        <div className="px-3 py-2 rounded-xl bg-indigo-50/50 border border-indigo-100/80 flex items-center gap-2 text-xs text-indigo-950">
          <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>
            {financialSystem === 'inflow_outflow'
              ? (lang === 'my'
                ? '📌 စနစ် (၁) - Inflow / Outflow: သတ်မှတ်ထားသော ကာလအတွင်း ငွေဝင်လာမှု (Inflow) နှင့် ငွေထွက်သွားမှု (Outflow) တို့ကို အဓိကထား တွက်ချက်ပြသပါသည်။'
                : '📌 System (1) - Inflow / Outflow: Focuses strictly on money coming in and money going out during the period.')
              : (lang === 'my'
                ? '📌 စနစ် (၂) - Opening / Closing: အစလက်ကျန် (Opening Balance) မှစတင်၍ ငွေဝင်/ထွက်လှုပ်ရှားမှု (Net Movement) ပြီးဆုံးချိန် ပိတ်လက်ကျန် (Closing Balance) သို့ တွက်ချက်ပြသပါသည်။'
                : '📌 System (2) - Opening / Closing: Tracks from the Opening Balance through Net Movement to the Final Closing Balance.')}
          </span>
        </div>
      </div>

      {/* ========================================== */}
      {/* SYSTEM 1: INFLOW / OUTFLOW VIEW           */}
      {/* ========================================== */}
      {financialSystem === 'inflow_outflow' && (
        <div className="space-y-3.5 animate-in fade-in duration-200">
          {/* Summary Cards for Inflow / Outflow */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Total Inflow Card */}
            <div className="bg-white rounded-2xl p-3.5 border border-emerald-200 shadow-2xs space-y-1 bg-gradient-to-br from-emerald-50/40 to-white">
              <div className="flex items-center justify-between text-emerald-800">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                  {lang === 'my' ? 'ဝင်ငွေ (Inflow)' : 'Total Inflow'}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold">
                  {incomeCount} {lang === 'my' ? 'ခု' : 'items'}
                </span>
              </div>
              <div className="text-base sm:text-lg font-black font-mono text-emerald-700 truncate" title={formatMMK(income)}>
                {formatMMK(income)}
              </div>
            </div>

            {/* Total Outflow Card */}
            <div className="bg-white rounded-2xl p-3.5 border border-rose-200 shadow-2xs space-y-1 bg-gradient-to-br from-rose-50/40 to-white">
              <div className="flex items-center justify-between text-rose-800">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <ArrowUpRight className="w-4 h-4 text-rose-600" />
                  {lang === 'my' ? 'ထွက်ငွေ (Outflow)' : 'Total Outflow'}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 font-bold">
                  {expenseCount} {lang === 'my' ? 'ခု' : 'items'} ({expenseRatio}%)
                </span>
              </div>
              <div className="text-base sm:text-lg font-black font-mono text-rose-700 truncate" title={formatMMK(expense)}>
                {formatMMK(expense)}
              </div>
            </div>

            {/* Net Inflow / Outflow Card */}
            <div className={`bg-white rounded-2xl p-3.5 border shadow-2xs space-y-1 ${net >= 0 ? 'border-emerald-300 bg-gradient-to-br from-emerald-50/60 to-white' : 'border-rose-300 bg-gradient-to-br from-rose-50/60 to-white'}`}>
              <div className={`flex items-center justify-between ${net >= 0 ? 'text-emerald-900' : 'text-rose-900'}`}>
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <Scale className="w-4 h-4" />
                  {lang === 'my' ? 'အသားတင် (Net Inflow/Outflow)' : 'Net Cash Flow'}
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${net >= 0 ? 'bg-emerald-200 text-emerald-950' : 'bg-rose-200 text-rose-950'}`}>
                  {net >= 0 ? (lang === 'my' ? 'ပိုငွေ' : 'Surplus') : (lang === 'my' ? 'လိုငွေ' : 'Deficit')}
                </span>
              </div>
              <div className={`text-base sm:text-lg font-black font-mono truncate ${net >= 0 ? 'text-emerald-800' : 'text-rose-800'}`} title={formatMMK(net)}>
                {net >= 0 ? `+${formatMMK(net)}` : formatMMK(net)}
              </div>
            </div>
          </div>

          {/* Wallet Breakdown for Inflow / Outflow (Clean Card / Row layout for mobile readability) */}
          {walletBreakdown.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <WalletIcon className="w-3.5 h-3.5 text-indigo-600" />
                  {lang === 'my' ? 'Wallet တစ်ခုချင်းစီအလိုက် Inflow / Outflow အသေးစိတ်' : 'Per-Wallet Inflow / Outflow Breakdown'}
                </span>
                <span className="text-[11px] font-mono text-slate-500 font-semibold">
                  {walletBreakdown.length} {lang === 'my' ? 'Wallets' : 'Wallets'}
                </span>
              </div>

              {/* Mobile-Friendly Streamlined Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-bold text-[11px]">
                      <th className="py-2.5 px-3">{lang === 'my' ? 'Wallet အမည်' : 'Wallet Name'}</th>
                      <th className="py-2.5 px-3 text-right text-emerald-700">{lang === 'my' ? 'ဝင်ငွေ (Inflow)' : 'Inflow'}</th>
                      <th className="py-2.5 px-3 text-right text-rose-700">{lang === 'my' ? 'ထွက်ငွေ (Outflow)' : 'Outflow'}</th>
                      <th className="py-2.5 px-3 text-right text-slate-900">{lang === 'my' ? 'အသားတင် (Net)' : 'Net'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {walletBreakdown.map(({ wallet: w, inflow, outflow, net: wNet, count }) => {
                      const isShared = w.isSharedFromOther || (w.sharedWith && w.sharedWith.length > 0);
                      return (
                        <tr key={w.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-xs">
                                {isShared ? '🤝' : '💳'}
                              </span>
                              <div>
                                <div className="font-bold text-slate-900">{lang === 'my' ? w.name : w.nameEn}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{count} {lang === 'my' ? 'မှတ်တမ်း' : 'txs'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700" title={formatCurrency(inflow, w.currency)}>
                            {inflow > 0 ? `+${formatTableLakhs(inflow, w.currency, lang)}` : formatTableLakhs(0, w.currency, lang)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-rose-700" title={formatCurrency(outflow, w.currency)}>
                            {outflow > 0 ? `-${formatTableLakhs(outflow, w.currency, lang)}` : formatTableLakhs(0, w.currency, lang)}
                          </td>
                          <td className={`py-3 px-3 text-right font-mono font-bold ${wNet >= 0 ? 'text-emerald-800' : 'text-rose-800'}`} title={formatCurrency(wNet, w.currency)}>
                            {wNet >= 0 ? `+${formatTableLakhs(wNet, w.currency, lang)}` : formatTableLakhs(wNet, w.currency, lang)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {walletBreakdown.length > 1 && (
                    <tfoot className="border-t-2 border-slate-300 bg-slate-50 font-bold text-slate-900">
                      <tr>
                        <td className="py-3 px-3 font-black">
                          {lang === 'my' ? 'စုစုပေါင်း (Total)' : 'Total'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-800">
                          {breakdownTotals.inflow > 0 ? `+${formatTableLakhs(breakdownTotals.inflow, 'MMK', lang)}` : formatTableLakhs(0, 'MMK', lang)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-rose-800">
                          {breakdownTotals.outflow > 0 ? `-${formatTableLakhs(breakdownTotals.outflow, 'MMK', lang)}` : formatTableLakhs(0, 'MMK', lang)}
                        </td>
                        <td className={`py-3 px-3 text-right font-mono font-black ${breakdownTotals.net >= 0 ? 'text-emerald-950' : 'text-rose-950'}`}>
                          {breakdownTotals.net >= 0 ? `+${formatTableLakhs(breakdownTotals.net, 'MMK', lang)}` : formatTableLakhs(breakdownTotals.net, 'MMK', lang)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* SYSTEM 2: OPENING / CLOSING VIEW          */}
      {/* ========================================== */}
      {financialSystem === 'opening_closing' && (
        <div className="space-y-3.5 animate-in fade-in duration-200">
          {/* Summary Cards for Opening / Closing */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Total Opening Card */}
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs space-y-1 bg-gradient-to-br from-slate-50/60 to-white">
              <div className="flex items-center justify-between text-slate-700">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-slate-600" />
                  {lang === 'my' ? 'စတင်လက်ကျန် (Opening)' : 'Total Opening'}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 font-bold">
                  {lang === 'my' ? 'အစ' : 'Initial'}
                </span>
              </div>
              <div className="text-base sm:text-lg font-black font-mono text-slate-800 truncate" title={formatMMK(breakdownTotals.opening)}>
                {formatMMK(breakdownTotals.opening)}
              </div>
            </div>

            {/* Net Movement Card */}
            <div className={`bg-white rounded-2xl p-3.5 border shadow-2xs space-y-1 ${breakdownTotals.net >= 0 ? 'border-indigo-200 bg-gradient-to-br from-indigo-50/40 to-white' : 'border-amber-200 bg-gradient-to-br from-amber-50/40 to-white'}`}>
              <div className={`flex items-center justify-between ${breakdownTotals.net >= 0 ? 'text-indigo-900' : 'text-amber-900'}`}>
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  {lang === 'my' ? 'လှုပ်ရှားမှု (Net Movement)' : 'Net Movement'}
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${breakdownTotals.net >= 0 ? 'bg-indigo-100 text-indigo-900' : 'bg-amber-100 text-amber-900'}`}>
                  {breakdownTotals.net >= 0 ? (lang === 'my' ? 'တိုးတက်' : 'Net In') : (lang === 'my' ? 'လျော့နည်း' : 'Net Out')}
                </span>
              </div>
              <div className={`text-base sm:text-lg font-black font-mono truncate ${breakdownTotals.net >= 0 ? 'text-indigo-700' : 'text-amber-700'}`} title={formatMMK(breakdownTotals.net)}>
                {breakdownTotals.net >= 0 ? `+${formatMMK(breakdownTotals.net)}` : formatMMK(breakdownTotals.net)}
              </div>
            </div>

            {/* Total Closing Card */}
            <div className="bg-white rounded-2xl p-3.5 border border-indigo-300 shadow-2xs space-y-1 bg-gradient-to-br from-indigo-50/60 to-white">
              <div className="flex items-center justify-between text-indigo-950">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <WalletIcon className="w-4 h-4 text-indigo-600" />
                  {lang === 'my' ? 'ပိတ်လက်ကျန် (Closing Balance)' : 'Total Closing'}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-200 text-indigo-950 font-bold">
                  {lang === 'my' ? 'လက်ရှိ' : 'Final'}
                </span>
              </div>
              <div className="text-base sm:text-lg font-black font-mono text-indigo-900 truncate" title={formatMMK(breakdownTotals.closing)}>
                {formatMMK(breakdownTotals.closing)}
              </div>
            </div>
          </div>

          {/* Wallet Breakdown for Opening / Closing */}
          {walletBreakdown.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  {lang === 'my' ? 'Wallet တစ်ခုချင်းစီအလိုက် Opening & Closing အသေးစိတ်' : 'Per-Wallet Opening & Closing Breakdown'}
                </span>
                <span className="text-[11px] font-mono text-slate-500 font-semibold">
                  {walletBreakdown.length} {lang === 'my' ? 'Wallets' : 'Wallets'}
                </span>
              </div>

              {/* Mobile-Friendly Streamlined Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-bold text-[11px]">
                      <th className="py-2.5 px-3">{lang === 'my' ? 'Wallet အမည်' : 'Wallet Name'}</th>
                      <th className="py-2.5 px-3 text-right text-slate-600">{lang === 'my' ? 'စတင်လက်ကျန် (Opening)' : 'Opening'}</th>
                      <th className="py-2.5 px-3 text-right text-indigo-700">{lang === 'my' ? 'လှုပ်ရှားမှု (Movement)' : 'Movement'}</th>
                      <th className="py-2.5 px-3 text-right text-slate-900">{lang === 'my' ? 'ပိတ်လက်ကျန် (Closing)' : 'Closing'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {walletBreakdown.map(({ wallet: w, opening, net: wNet, closing, count }) => {
                      const isShared = w.isSharedFromOther || (w.sharedWith && w.sharedWith.length > 0);
                      return (
                        <tr key={w.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-xs">
                                {isShared ? '🤝' : '💳'}
                              </span>
                              <div>
                                <div className="font-bold text-slate-900">{lang === 'my' ? w.name : w.nameEn}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{count} {lang === 'my' ? 'မှတ်တမ်း' : 'txs'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-semibold text-slate-600" title={formatCurrency(opening, w.currency)}>
                            {formatTableLakhs(opening, w.currency, lang)}
                          </td>
                          <td className={`py-3 px-3 text-right font-mono font-bold ${wNet >= 0 ? 'text-emerald-700' : 'text-rose-700'}`} title={formatCurrency(wNet, w.currency)}>
                            {wNet >= 0 ? `+${formatTableLakhs(wNet, w.currency, lang)}` : formatTableLakhs(wNet, w.currency, lang)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-black text-slate-900" title={formatCurrency(closing, w.currency)}>
                            {formatTableLakhs(closing, w.currency, lang)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {walletBreakdown.length > 1 && (
                    <tfoot className="border-t-2 border-slate-300 bg-slate-50 font-bold text-slate-900">
                      <tr>
                        <td className="py-3 px-3 font-black">
                          {lang === 'my' ? 'စုစုပေါင်း (Total)' : 'Total'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-700">
                          {formatTableLakhs(breakdownTotals.opening, 'MMK', lang)}
                        </td>
                        <td className={`py-3 px-3 text-right font-mono font-bold ${breakdownTotals.net >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                          {breakdownTotals.net >= 0 ? `+${formatTableLakhs(breakdownTotals.net, 'MMK', lang)}` : formatTableLakhs(breakdownTotals.net, 'MMK', lang)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-slate-950">
                          {formatTableLakhs(breakdownTotals.closing, 'MMK', lang)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
