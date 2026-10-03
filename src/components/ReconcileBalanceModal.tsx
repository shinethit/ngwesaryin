import React, { useState, useEffect, useMemo } from 'react';
import { Scale, X, ArrowUpRight, ArrowDownRight, Check, AlertCircle, Sparkles, Wallet as WalletIcon, Calculator } from 'lucide-react';
import { Wallet, Transaction } from '../types';
import { formatMMK } from '../utils/formatters';
import { isWalletMatch } from '../utils/walletBalance';

interface ReconcileBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: Wallet[];
  transactions?: Transaction[];
  initialWalletId?: string;
  lang: 'my' | 'en';
  onReconcile: (
    walletId: string,
    actualBalance: number,
    recordTransaction: boolean,
    note?: string
  ) => void;
}

export const ReconcileBalanceModal: React.FC<ReconcileBalanceModalProps> = ({
  isOpen,
  onClose,
  wallets,
  transactions = [],
  initialWalletId,
  lang,
  onReconcile,
}) => {
  const [selectedWalletId, setSelectedWalletId] = useState<string>(
    initialWalletId || wallets[0]?.id || ''
  );
  const [actualBalanceInput, setActualBalanceInput] = useState<string>('');
  const [recordTx, setRecordTx] = useState<boolean>(false);
  const [note, setNote] = useState<string>('');

  useEffect(() => {
    if (initialWalletId && wallets.some((w) => w.id === initialWalletId)) {
      setSelectedWalletId(initialWalletId);
    } else if (wallets[0]) {
      setSelectedWalletId(wallets[0].id);
    }
  }, [initialWalletId, wallets, isOpen]);

  const currentWallet = wallets.find((w) => w.id === selectedWalletId) || wallets[0];

  // Calculate sum of transactions for this wallet
  const calculatedBalanceFromTxs = useMemo(() => {
    if (!currentWallet || !transactions) return 0;
    const walletTxs = transactions.filter((t) => isWalletMatch(currentWallet, t.walletId));
    return walletTxs.reduce((sum, t) => {
      if (t.type === 'income') return sum + (Number(t.amount) || 0);
      if (t.type === 'expense') return sum - (Number(t.amount) || 0);
      return sum;
    }, 0);
  }, [currentWallet, transactions]);

  useEffect(() => {
    if (currentWallet && isOpen) {
      setActualBalanceInput(currentWallet.balance.toString());
      setNote(lang === 'my' ? 'လက်ကျန်ငွေ စာရင်းညှိခြင်း' : 'Balance reconciliation');
    }
  }, [currentWallet?.id, isOpen, lang]);

  if (!isOpen || !currentWallet) return null;

  const currentBalance = currentWallet.balance || 0;
  const actualBalance = parseFloat(actualBalanceInput) || 0;
  const difference = actualBalance - currentBalance;
  const isSurplus = difference > 0;
  const isDeficit = difference < 0;
  const isExact = difference === 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(actualBalance) || actualBalance < 0) return;

    onReconcile(
      selectedWalletId,
      actualBalance,
      recordTx && difference !== 0,
      note.trim() || undefined
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shadow-inner">
              <Scale className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                {lang === 'my' ? 'လက်ကျန်ငွေ စာရင်းညှိခြင်း (Reconcile)' : 'Balance Reconciliation'}
              </h2>
              <p className="text-xs text-indigo-200 mt-0.5">
                {lang === 'my'
                  ? 'လက်ထဲရှိ အမှန်တကယ်ငွေနှင့် စာရင်းရှိငွေ ကွာဟချက်ကို ညှိယူပါ'
                  : 'Align your actual real-world money with recorded balances'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Step 1: Select Wallet */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <WalletIcon className="w-3.5 h-3.5 text-indigo-600" />
              <span>{lang === 'my' ? 'ညှိယူမည့် ပိုက်ဆံအိတ် / အကောင့်:' : 'Select Target Wallet:'}</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {wallets.map((w) => {
                const isSelected = selectedWalletId === w.id;
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => {
                      setSelectedWalletId(w.id);
                      setActualBalanceInput(w.balance.toString());
                    }}
                    className={`p-2.5 rounded-xl text-left border transition-all flex flex-col justify-between cursor-pointer active:scale-95 ${
                      isSelected
                        ? 'bg-indigo-50/80 border-indigo-600 ring-2 ring-indigo-500/20'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: w.color || '#6366F1' }}
                      />
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {lang === 'my' ? w.name : w.nameEn}
                      </span>
                    </div>
                    <div className="text-[11px] font-semibold text-slate-500 mt-1 font-mono">
                      {formatMMK(w.balance)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Current vs Actual Balance Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
              <span className="text-xs text-slate-500 font-medium">
                {lang === 'my' ? 'စာရင်းတွင် မှတ်ထားသော လက်ကျန်ငွေ:' : 'Currently Recorded Balance:'}
              </span>
              <span className="text-sm font-bold text-slate-800 font-mono">
                {formatMMK(currentBalance)}
              </span>
            </div>

            {/* Input Real Amount */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-800">
                  {lang === 'my'
                    ? 'လက်ထဲရှိ အမှန်တကယ် လက်ကျန်ငွေ (Actual Amount):'
                    : 'Actual Real-World Cash / Bank Amount:'}
                </label>
                <button
                  type="button"
                  onClick={() => setActualBalanceInput(calculatedBalanceFromTxs.toString())}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-md transition-colors"
                  title={lang === 'my' ? 'မှတ်တမ်းများအရ တွက်ချက်ထားသော လက်ကျန်ငွေဖြင့် အစားထိုးထည့်မည်' : 'Autofill calculated sum of transactions'}
                >
                  <Calculator className="w-3 h-3" />
                  <span>
                    {lang === 'my' ? 'မှတ်တမ်းများအရ:' : 'From Records:'} {formatMMK(calculatedBalanceFromTxs)}
                  </span>
                </button>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  required
                  value={actualBalanceInput}
                  onChange={(e) => setActualBalanceInput(e.target.value)}
                  placeholder="0"
                  className="w-full pl-4 pr-16 py-3 text-lg font-bold font-mono text-slate-900 bg-white border-2 border-indigo-300 focus:border-indigo-600 focus:ring-3 focus:ring-indigo-100 rounded-xl outline-none transition-all"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  MMK
                </span>
              </div>

              {/* Quick Presets & Lakhs Converter Helper */}
              <div className="flex items-center gap-1.5 flex-wrap pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const num = parseFloat(actualBalanceInput) || 0;
                    setActualBalanceInput(String(Math.round(num * 100000)));
                  }}
                  className="px-2.5 py-1 text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg transition-all active:scale-95 cursor-pointer shadow-2xs"
                  title={lang === 'my' ? 'ရိုက်ထည့်ထားသော ဂဏန်းအား ၁ သိန်း (x 100,000) ဖြင့် မြှောက်မည်' : 'Multiply by 1 Lakh (x100,000)'}
                >
                  ✨ {lang === 'my' ? 'သိန်း (x100,000)' : 'Lakhs (x100k)'}
                </button>
                <button
                  type="button"
                  onClick={() => setActualBalanceInput('0')}
                  className="px-2 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all cursor-pointer"
                >
                  {lang === 'my' ? '၀ ကျပ်' : '0 MMK'}
                </button>
                <button
                  type="button"
                  onClick={() => setActualBalanceInput('100000')}
                  className="px-2 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all cursor-pointer"
                >
                  {lang === 'my' ? '၁ သိန်း' : '1 Lakh'}
                </button>
                <button
                  type="button"
                  onClick={() => setActualBalanceInput('500000')}
                  className="px-2 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all cursor-pointer"
                >
                  {lang === 'my' ? '၅ သိန်း' : '5 Lakhs'}
                </button>
                <button
                  type="button"
                  onClick={() => setActualBalanceInput('1000000')}
                  className="px-2 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all cursor-pointer"
                >
                  {lang === 'my' ? '၁၀ သိန်း' : '10 Lakhs'}
                </button>
                {actualBalance > 0 && (
                  <span className="text-[11px] font-bold text-emerald-700 font-mono ml-auto">
                    ≈ {(actualBalance / 100000).toLocaleString(undefined, { maximumFractionDigits: 4 })} {lang === 'my' ? 'သိန်း' : 'Lakhs'}
                  </span>
                )}
              </div>
            </div>

            {/* Difference / Discrepancy Indicator */}
            <div
              className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                isExact
                  ? 'bg-slate-100 border-slate-200 text-slate-600'
                  : isSurplus
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-2">
                {isExact ? (
                  <Check className="w-4 h-4 text-slate-500" />
                ) : isSurplus ? (
                  <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-rose-600" />
                )}
                <div>
                  <div className="font-bold">
                    {isExact
                      ? lang === 'my'
                        ? 'ကွာဟချက် မရှိပါ (အတိအကျ ကိုက်ညီသည်)'
                        : 'No difference (Exact match)'
                      : isSurplus
                      ? lang === 'my'
                        ? 'စာရင်းထဲ ပိုနေသောငွေ (Surplus / +ဝင်ငွေညှိမည်)'
                        : 'Positive difference (Surplus / +Income)'
                      : lang === 'my'
                      ? 'စာရင်းထဲ လိုနေသောငွေ (Deficit / -ထွက်ငွေညှိမည်)'
                      : 'Negative difference (Deficit / -Expense)'}
                  </div>
                  <div className="text-[11px] opacity-80 mt-0.5">
                    {isExact
                      ? lang === 'my'
                        ? 'လက်ကျန်ငွေ ပြောင်းလဲရန် မလိုပါ'
                        : 'Balances are already equal'
                      : isSurplus
                      ? lang === 'my'
                        ? `စာရင်းထက် ${formatMMK(difference)} ပိုများနေပါသည်`
                        : `Actual is higher by ${formatMMK(difference)}`
                      : lang === 'my'
                      ? `စာရင်းထက် ${formatMMK(Math.abs(difference))} လျော့နည်းနေပါသည်`
                      : `Actual is lower by ${formatMMK(Math.abs(difference))}`}
                  </div>
                </div>
              </div>

              {!isExact && (
                <div className="text-sm font-bold font-mono shrink-0">
                  {isSurplus ? `+${formatMMK(difference)}` : `-${formatMMK(Math.abs(difference))}`}
                </div>
              )}
            </div>
          </div>

          {/* Reconcile Mode Selection */}
          {!isExact && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Option 1: Direct Balance Set (No fake transactions) */}
                <button
                  type="button"
                  onClick={() => setRecordTx(false)}
                  className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                    !recordTx
                      ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <span>✨ {lang === 'my' ? 'လက်ကျန်ငွေ တိုက်ရိုက်ညှိမည်' : 'Direct Balance Set'}</span>
                    {!recordTx && <span className="text-emerald-600 ml-auto">✓</span>}
                  </div>
                  <div className="text-[11px] font-normal text-slate-500 mt-1">
                    {lang === 'my'
                      ? 'ဝင်ငွေ/ထွက်ငွေ စာရင်းမှတ်တမ်း အသစ် မဖန်တီးဘဲ လက်ကျန်ငွေကိုသာ တိုက်ရိုက် ပြင်ဆင်မည် (အကြံပြုထားသည်)'
                      : 'Update balance directly without creating extra income/expense records (Recommended)'}
                  </div>
                </button>

                {/* Option 2: Record Adjustment Transaction */}
                <button
                  type="button"
                  onClick={() => setRecordTx(true)}
                  className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                    recordTx
                      ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/20 text-indigo-950 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <span>📝 {lang === 'my' ? 'စာရင်းမှတ်တမ်းပါ ထည့်မည်' : 'Record Transaction'}</span>
                    {recordTx && <span className="text-indigo-600 ml-auto">✓</span>}
                  </div>
                  <div className="text-[11px] font-normal text-slate-500 mt-1">
                    {lang === 'my'
                      ? `ကွာဟချက် ${formatMMK(Math.abs(difference))} အား ${isSurplus ? 'ဝင်ငွေ' : 'ထွက်ငွေ'} စာရင်းအဖြစ် ထည့်သွင်းမည်`
                      : `Log ${formatMMK(Math.abs(difference))} as an ${isSurplus ? 'Income' : 'Expense'} transaction`}
                  </div>
                </button>
              </div>

              {recordTx && (
                <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2 animate-fadeIn">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    {lang === 'my' ? 'မှတ်ချက် (Adjustment Note):' : 'Adjustment Note:'}
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={lang === 'my' ? 'ဥပမာ - မေ့ကျန်ခဲ့သော ကော်ဖီဖိုး ညှိခြင်း' : 'e.g. Cash count reconcile'}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-indigo-200 focus:border-indigo-500 focus:outline-none shadow-2xs"
                  />
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {lang === 'my' ? 'မလုပ်တော့ပါ' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isNaN(actualBalance) || actualBalance < 0}
              className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{lang === 'my' ? 'စာရင်းညှိချက် အတည်ပြုမည်' : 'Confirm Reconciliation'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
