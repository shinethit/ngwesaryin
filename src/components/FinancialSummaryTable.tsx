import React from 'react';
import { Transaction, Wallet } from '../types';
import { formatMMK, formatLakhs } from '../utils/formatters';
import { convertToMMK } from '../utils/currency';

import { buildWalletMap, isWalletMatch, isTransferTransaction } from '../utils/walletBalance';

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
  const financialSystem = financialSystemProp ?? 'opening_closing';
  const net = income - expense;
  // [v7.5.60 A-S19] Phone has no hover — tapping a lakh amount toggles
  // it to the exact kyat value and back.
  const [showExact, setShowExact] = React.useState(false);
  const displayAmount = (v: number, signed = false) =>
    showExact ? formatMMK(v) : (signed && v >= 0 ? '+' : '') + formatLakhs(v, lang);
  const displayTip = (v: number) =>
    showExact ? formatLakhs(v, lang) : formatMMK(v);

  // Per-wallet breakdown → total Opening / Inflow / Outflow / Closing
  // [v7.5.55 D18] All amounts converted to MMK (transaction amounts via
  // their wallet, balances via the wallet's own currency) — raw sums mixed
  // foreign-currency amounts with MMK before.
  const totals = React.useMemo(() => {
    let opening = 0, inflow = 0, outflow = 0;
    const walletMap = buildWalletMap(selectedWallets);
    for (const w of selectedWallets) {
      const wTxs = transactions.filter((t) => isWalletMatch(w, t.walletId) && !isTransferTransaction(t));
      let wIn = 0, wOut = 0;
      wTxs.forEach((t) => {
        let tw = walletMap.get(t.walletId);
        if (!tw) tw = selectedWallets.find((wall) => isWalletMatch(wall, t.walletId));
        const amt = convertToMMK(t.amount, tw?.currency, tw?.exchangeRate);
        if (t.type === 'income') wIn += amt;
        else if (t.type === 'expense') wOut += amt;
      });
      const wNet = wIn - wOut;
      opening += convertToMMK(Number(w.balance) || 0, w.currency, w.exchangeRate) - wNet;
      inflow += wIn;
      outflow += wOut;
    }
    return { opening, inflow, outflow, net: inflow - outflow, closing: opening + inflow - outflow };
  }, [selectedWallets, transactions]);

  // [v7.1.0] Compact single-row cards. Icons + badges removed.
  // Short English labels prevent wrapping. Amounts use text-[11px] + truncate
  // with full-value tooltip on hover.
  const Card: React.FC<{ label: string; value: string; tip: string; tone: 'neutral' | 'up' | 'down' | 'pos' | 'neg' }> = ({ label, value, tip, tone }) => {
    const toneCls =
      tone === 'up'   ? 'text-emerald-700 border-emerald-200 bg-emerald-50/40' :
      tone === 'down' ? 'text-rose-700 border-rose-200 bg-rose-50/40' :
      tone === 'pos'  ? 'text-emerald-800 border-emerald-300 bg-emerald-50/60' :
      tone === 'neg'  ? 'text-rose-800 border-rose-300 bg-rose-50/60' :
                        'text-slate-800 border-slate-200 bg-slate-50/40';
    return (
      <button
        type="button"
        onClick={() => setShowExact((v) => !v)}
        className={`rounded-lg px-2 py-2 border ${toneCls} min-w-0 text-left w-full cursor-pointer`}
        title={tip}
      >
        {/* [v7.5.68 R6] Relaxed leading: label + value are truncate/overflow-hidden, so tight leading cut Burmese descenders. */}
        <div className="text-[9px] font-bold uppercase tracking-wide opacity-70 leading-[1.5] mb-1 truncate">
          {label}
        </div>
        <div className="text-[11px] font-black font-mono truncate leading-[1.5]" title={tip}>
          {value}
        </div>
      </button>
    );
  };

  return (
    <div className="w-full">
      {financialSystem === 'opening_closing' && (
        <div className="grid grid-cols-3 gap-1.5">
          <Card
            label={lang === 'my' ? 'အစလက်ကျန်' : 'Opening'}
            value={displayAmount(totals.opening)}
            tip={displayTip(totals.opening)}
            tone="neutral"
          />
          <Card
            label={lang === 'my' ? 'လှုပ်ရှားမှု' : 'Movement'}
            value={displayAmount(totals.net, true)}
            tip={displayTip(totals.net)}
            tone={totals.net >= 0 ? 'pos' : 'neg'}
          />
          <Card
            label={lang === 'my' ? 'အဆုံးလက်ကျန်' : 'Closing'}
            value={displayAmount(totals.closing)}
            tip={displayTip(totals.closing)}
            tone={totals.closing >= 0 ? 'neutral' : 'down'}
          />
        </div>
      )}

      {financialSystem === 'inflow_outflow' && (
        <div className="grid grid-cols-3 gap-1.5">
          <Card
            label={`${lang === 'my' ? 'ဝင်ငွေ' : 'Inflow'} · ${incomeCount}`}
            value={displayAmount(totals.inflow, true)}
            tip={displayTip(totals.inflow)}
            tone="up"
          />
          <Card
            label={`${lang === 'my' ? 'ထွက်ငွေ' : 'Outflow'} · ${expenseCount}`}
            value={showExact ? formatMMK(-totals.outflow) : '-' + formatLakhs(totals.outflow, lang)}
            tip={displayTip(totals.outflow)}
            tone="down"
          />
          <Card
            label={lang === 'my' ? 'အသားတင်' : 'Net'}
            value={displayAmount(totals.net, true)}
            tip={displayTip(totals.net)}
            tone={totals.net >= 0 ? 'pos' : 'neg'}
          />
        </div>
      )}
    </div>
  );
};
