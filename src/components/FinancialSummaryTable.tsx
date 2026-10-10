import React from 'react';
import { Transaction, Wallet } from '../types';
import { formatMMK, formatLakhs } from '../utils/formatters';

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
  const financialSystem = financialSystemProp ?? 'opening_closing';
  const net = income - expense;

  // Per-wallet breakdown → total Opening / Inflow / Outflow / Closing
  const totals = React.useMemo(() => {
    let opening = 0, inflow = 0, outflow = 0;
    for (const w of selectedWallets) {
      const wTxs = transactions.filter((t) => isWalletMatch(w, t.walletId) && !isTransferTransaction(t));
      let wIn = 0, wOut = 0;
      wTxs.forEach((t) => {
        const amt = Number(t.amount) || 0;
        if (t.type === 'income') wIn += amt;
        else if (t.type === 'expense') wOut += amt;
      });
      const wNet = wIn - wOut;
      opening += (Number(w.balance) || 0) - wNet;
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
      <div className={`rounded-lg px-2 py-1.5 border ${toneCls} min-w-0`}>
        <div className="text-[9px] font-bold uppercase tracking-wide opacity-70 leading-none mb-1 truncate">
          {label}
        </div>
        <div className="text-[11px] font-black font-mono truncate leading-tight" title={tip}>
          {value}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      {financialSystem === 'opening_closing' && (
        <div className="grid grid-cols-3 gap-1.5">
          <Card
            label="Opening"
            value={formatLakhs(totals.opening, lang)}
            tip={formatMMK(totals.opening)}
            tone="neutral"
          />
          <Card
            label="Movement"
            value={(totals.net >= 0 ? '+' : '') + formatLakhs(totals.net, lang)}
            tip={formatMMK(totals.net)}
            tone={totals.net >= 0 ? 'pos' : 'neg'}
          />
          <Card
            label="Closing"
            value={formatLakhs(totals.closing, lang)}
            tip={formatMMK(totals.closing)}
            tone={totals.closing >= 0 ? 'neutral' : 'down'}
          />
        </div>
      )}

      {financialSystem === 'inflow_outflow' && (
        <div className="grid grid-cols-3 gap-1.5">
          <Card
            label={`Inflow · ${incomeCount}`}
            value={'+' + formatLakhs(totals.inflow, lang)}
            tip={formatMMK(totals.inflow)}
            tone="up"
          />
          <Card
            label={`Outflow · ${expenseCount}`}
            value={'-' + formatLakhs(totals.outflow, lang)}
            tip={formatMMK(totals.outflow)}
            tone="down"
          />
          <Card
            label="Net"
            value={(totals.net >= 0 ? '+' : '') + formatLakhs(totals.net, lang)}
            tip={formatMMK(totals.net)}
            tone={totals.net >= 0 ? 'pos' : 'neg'}
          />
        </div>
      )}
    </div>
  );
};
