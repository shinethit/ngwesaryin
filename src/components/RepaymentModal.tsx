import React, { useState } from 'react';
import { CreditCard } from 'lucide-react';
import { Debt, Wallet as WalletType } from '../types';
import { formatMMK, formatLakhs } from '../utils/formatters';
import { formatCurrency } from '../utils/currency';
import { parseMyanmarNumber } from '../utils/myanmarDigits';
import { getLocalDateString } from '../utils/dateUtils';

interface RepaymentModalProps {
  isOpen: boolean;
  debt: Debt | null;
  editingRepayment?: { id: string; amount: number; date: string; walletId: string; note?: string } | null;
  wallets: WalletType[];
  lang: 'my' | 'en';
  onClose: () => void;
  onSubmit: (debtId: string, amount: number, date: string, walletId: string, note?: string, repaymentId?: string) => void;
}

export const RepaymentModal: React.FC<RepaymentModalProps> = ({
  isOpen,
  debt,
  editingRepayment,
  wallets,
  lang,
  onClose,
  onSubmit,
}) => {
  const remaining = debt ? Math.max(0, debt.totalAmount - debt.paidAmount) : 0;
  const maxAllowedAmount = editingRepayment ? remaining + editingRepayment.amount : remaining;
  const [amount, setAmount] = useState(remaining.toString());
  const [date, setDate] = useState(() => getLocalDateString());
  const [walletId, setWalletId] = useState(wallets[0]?.id || 'cash');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  // [v7.5.60 S-41] Same idempotent lakh guard as DebtModal: true once
  // the field holds kyat (converted, or an edited repayment's stored
  // total). A manual edit clears it.
  const [lakhConverted, setLakhConverted] = useState(false);

  React.useEffect(() => {
    if (isOpen && debt) {
      if (editingRepayment) {
        setAmount(editingRepayment.amount.toString());
        setLakhConverted(true);
        setDate(editingRepayment.date ? getLocalDateString(editingRepayment.date) : getLocalDateString());
        setWalletId(editingRepayment.walletId || wallets[0]?.id || 'cash');
        setNote(editingRepayment.note || '');
      } else {
        const rem = Math.max(0, debt.totalAmount - debt.paidAmount);
        setAmount(rem.toString());
        setLakhConverted(true);
        setDate(getLocalDateString());
        // [v7.5.55 D12] Default to the debt's own wallet so the repayment
        // uses the same currency as the debt.
        setWalletId(debt.walletId || wallets[0]?.id || 'cash');
        setNote('');
      }
      setError('');
      setIsSubmitting(false);
    }
  }, [isOpen, debt, editingRepayment, wallets]);

  if (!isOpen || !debt) return null;

  const isEditing = !!editingRepayment;
  const isReceivable = debt.type === 'receivable';
  // [v7.5.55 D12] The debt's currency: explicit field, else its wallet's
  // currency. All amounts in this modal are in this currency.
  const debtWallet = wallets.find((w) => w.id === debt.walletId);
  const debtCurrency = debt.currency || debtWallet?.currency || 'MMK';
  const selectedWallet = wallets.find((w) => w.id === walletId);
  const walletCurrencyMismatch =
    !!selectedWallet?.currency && selectedWallet.currency !== debtCurrency;
  const parsedAmount = parseMyanmarNumber(amount);

  // [v7.5.60 S-41] Lakh helpers — same contract as DebtModal: the
  // multiply button works once per manual edit and refuses kyat-scale
  // values (>= 100,000); "+1 သိန်း" adds 1 lakh while the field holds
  // lakhs, 100,000 kyat once it holds kyat.
  const handleAmountChange = (v: string) => {
    setAmount(v);
    setLakhConverted(false);
  };
  const handleMultiplyLakh = () => {
    const val = parseMyanmarNumber(amount);
    if (!val || val <= 0) return;
    if (lakhConverted) return;
    if (val >= 100000) {
      setError(lang === 'my' ? 'ဒီပမာဏက ကျပ်နဲ့ ရိုက်ထားပြီးသား ဖြစ်ပါတယ် — သိန်းနဲ့ ထပ်မြှောက်စရာ မလိုပါဘူး' : 'This amount is already in kyat — no need to multiply by 100,000');
      return;
    }
    setError('');
    setAmount(String(Math.round(val * 100000)));
    setLakhConverted(true);
  };
  const handleAddOneLakh = () => {
    const val = parseMyanmarNumber(amount) || 0;
    setAmount(String(lakhConverted ? val + 100000 : val + 1));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    // [v7.5.55 D29] Validation failures show a Burmese message, never a
    // silent return. Myanmar digits (၀-၉) accepted.
    const num = parseMyanmarNumber(amount);
    if (!num || num <= 0) {
      setError(lang === 'my' ? 'ဆပ်မည့် ပမာဏ မှန်ကန်စွာ ထည့်ပါ (0 ထက် ကြီးရမည်)' : 'Please enter a valid amount greater than 0');
      return;
    }
    if (num > maxAllowedAmount) {
      setError(
        lang === 'my'
          ? `ဤအကြွေးအတွက် အများဆုံး ${formatMMK(maxAllowedAmount)} အထိသာ ဆပ်နိုင်ပါသည် (ကျန်ငွေ ကန့်သတ်ချက်)`
          : `You can pay at most ${formatMMK(maxAllowedAmount)} for this debt (remaining balance cap)`
      );
      return;
    }
    setError('');

    setIsSubmitting(true);
    try {
      onSubmit(debt.id, num, date, walletId, note.trim() || undefined, editingRepayment?.id);
    } finally {
      onClose();
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto overflow-x-hidden">
      <div className="bg-white w-full max-w-md rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[95vh] flex flex-col">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <CreditCard className="w-5 h-5 text-emerald-600 shrink-0" />
            <h2 className="font-bold text-lg text-slate-900 min-w-0">
              {/* [v7.5.60 N-18] Editing says so — it used to read like a
                  new entry ("ငွေဆပ်မှတ်တမ်း သွင်းခြင်း"). */}
              {isEditing
                ? (lang === 'my' ? 'ငွေဆပ်မှတ်တမ်း ပြင်ဆင်ခြင်း' : 'Edit Repayment Record')
                : (lang === 'my' ? 'ငွေဆပ်မှတ်တမ်း သွင်းခြင်း' : 'Record Debt Payment')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-400 hover:bg-slate-100 flex items-center justify-center font-bold shrink-0"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto overflow-x-hidden space-y-4 text-base sm:text-sm">
          {/* Target Debt Snapshot */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-slate-900 min-w-0 truncate">{debt.personName}</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                  isReceivable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}
              >
                {isReceivable
                  ? (lang === 'my' ? 'ရရန်ရှိသူ' : 'Borrower')
                  : (lang === 'my' ? 'ပေးရန်ရှိသူ' : 'Lender')}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
              <span className="min-w-0">{lang === 'my' ? 'မူလပမာဏ:' : 'Total Debt:'} {formatCurrency(debt.totalAmount, debtCurrency)}</span>
              <span className="min-w-0 text-right">{lang === 'my' ? 'ဆပ်ပြီးငွေ:' : 'Paid:'} {formatCurrency(debt.paidAmount, debtCurrency)}</span>
            </div>

            <div className="flex items-center justify-between text-xs font-bold text-slate-900 border-t border-slate-200/80 pt-1">
              <span className="min-w-0">{lang === 'my' ? 'လက်ကျန်ငွေ:' : 'Current Remaining:'}</span>
              <span className={isReceivable ? 'text-emerald-700 shrink-0' : 'text-rose-700 shrink-0'}>
                {formatCurrency(remaining, debtCurrency)}
              </span>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              {lang === 'my' ? `ယခုဆပ်သည့် ပမာဏ (${debtCurrency}):` : `Payment Amount (${debtCurrency}):`}
            </label>
            <input
              type="text"
              inputMode="decimal"
              required
              autoFocus
              max={maxAllowedAmount}
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="w-full text-xl font-bold py-2.5 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {/* [v7.5.60 S-41] Live lakh preview + lakh buttons (DebtModal
                parity). Preview is MMK-only; the buttons work in the
                debt's currency units like DebtModal's. */}
            {debtCurrency === 'MMK' && !isNaN(parsedAmount) && parsedAmount > 0 && (
              <p className="text-[11px] font-bold text-emerald-700 mt-1">
                ≈ {formatLakhs(parsedAmount, lang)}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
              <span className="text-[11px] font-semibold text-slate-500">{lang === 'my' ? 'မြန်ဆန် သက်သာ:' : 'Quick:'}</span>
              <button
                type="button"
                onClick={handleMultiplyLakh}
                disabled={lakhConverted}
                className={`px-2.5 py-1 border rounded-lg text-xs font-bold transition-all active:scale-95 shadow-2xs ${
                  lakhConverted
                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 cursor-pointer'
                }`}
                title={lang === 'my' ? 'ရိုက်ထည့်ထားသော ဂဏန်း (သိန်း) အား ၁ သိန်း (x 100,000) ဖြင့် မြှောက်မည် — တစ်ကြိမ်သာ အလုပ်လုပ်ပါသည်' : 'Multiply the typed number (in lakhs) by 100,000 — works once per edit'}
              >
                ✨ သိန်း (x100,000)
              </button>
              <button
                type="button"
                onClick={handleAddOneLakh}
                className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold cursor-pointer active:scale-95"
              >
                +1 သိန်း
              </button>
            </div>
            {!isNaN(parsedAmount) && parsedAmount > maxAllowedAmount && (
              <p className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 mt-1">
                {lang === 'my'
                  ? `ကျန်ငွေ ${formatCurrency(maxAllowedAmount, debtCurrency)} ထက် ပိုမဆပ်နိုင်ပါ — အများဆုံးပမာဏအထိသာ မှတ်တမ်းတင်ပါမည်`
                  : `You cannot pay more than the remaining ${formatCurrency(maxAllowedAmount, debtCurrency)}`}
              </p>
            )}
            {walletCurrencyMismatch && (
              <p className="text-[11px] font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 mt-1">
                {lang === 'my'
                  ? `မှတ်ချက် — ဤငွေပေးချေမှုကို အကြွေး၏ ငွေကြေး (${debtCurrency}) ဖြင့် မှတ်တမ်းတင်ပါမည်`
                  : `Note — this payment is recorded in the debt's currency (${debtCurrency})`}
              </p>
            )}
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
              <button
                type="button"
                onClick={() => { setAmount(remaining.toString()); setLakhConverted(true); }}
                className="text-emerald-700 hover:underline font-semibold"
              >
                {lang === 'my' ? 'အကြွေးအားလုံးဆပ်မည် (Pay in full)' : 'Pay full balance'}
              </button>
              {/* [v7.5.55 D32] "Pay 50%" is always shown now — it used to be
                  hidden for small debts (remaining <= 50000) with no reason given. */}
              <button
                type="button"
                onClick={() => { setAmount((Math.round(remaining / 2)).toString()); setLakhConverted(true); }}
                className="text-slate-600 hover:underline"
              >
                {lang === 'my' ? 'တစ်ဝက်ဆပ်မည် (50%)' : 'Pay 50%'}
              </button>
            </div>
          </div>

          {/* Payment Account and Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="min-w-0">
              <label className="block text-slate-700 font-semibold mb-1">
                {lang === 'my' ? 'ငွေလွှဲပြောင်း/လက်ခံသည့် အကောင့်:' : 'Wallet / Account:'}
              </label>
              <select
                value={walletId}
                onChange={(e) => setWalletId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {lang === 'my' ? w.name : w.nameEn} ({formatCurrency(w.balance, w.currency || 'MMK')})
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-0">
              <label className="block text-slate-700 font-semibold mb-1">
                {lang === 'my' ? 'ရက်စွဲ:' : 'Date:'}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
              />
            </div>
          </div>

          {/* Note Input */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              {lang === 'my' ? 'မှတ်ချက်:' : 'Note:'}
            </label>
            <input
              type="text"
              placeholder={lang === 'my' ? 'ဥပမာ - KPay မှတစ်ဆင့် လွှဲပေးသည်' : 'e.g. Paid via KPay transaction'}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          {error && (
            <p className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              ⚠️ {error}
            </p>
          )}

          {/* Submit */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium"
            >
              {lang === 'my' ? 'မလုပ်တော့ပါ' : 'Cancel'}
            </button>
            <button
              id="repayment-submit-btn"
              type="submit"
              disabled={isSubmitting}
              className={`px-6 py-2.5 rounded-xl text-white font-bold shadow-xs transition-all flex items-center justify-center gap-2 ${
                isSubmitting
                  ? 'bg-emerald-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 cursor-pointer'
              }`}
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{lang === 'my' ? 'သိမ်းဆည်းနေပါသည်...' : 'Saving...'}</span>
                </>
              ) : (
                <span>{isEditing ? (lang === 'my' ? 'ပြင်ဆင်ချက် သိမ်းမည်' : 'Save Changes') : (lang === 'my' ? 'ငွေဆပ်မှတ်တမ်း သိမ်းမည်' : 'Save Repayment')}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
