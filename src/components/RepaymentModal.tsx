import React, { useState } from 'react';
import { CreditCard } from 'lucide-react';
import { Debt, Wallet as WalletType } from '../types';
import { formatMMK } from '../utils/formatters';
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

  React.useEffect(() => {
    if (isOpen && debt) {
      if (editingRepayment) {
        setAmount(editingRepayment.amount.toString());
        setDate(editingRepayment.date ? getLocalDateString(editingRepayment.date) : getLocalDateString());
        setWalletId(editingRepayment.walletId || wallets[0]?.id || 'cash');
        setNote(editingRepayment.note || '');
      } else {
        const rem = Math.max(0, debt.totalAmount - debt.paidAmount);
        setAmount(rem.toString());
        setDate(getLocalDateString());
        setWalletId(wallets[0]?.id || 'cash');
        setNote('');
      }
      setIsSubmitting(false);
    }
  }, [isOpen, debt, editingRepayment, wallets]);

  if (!isOpen || !debt) return null;

  const isReceivable = debt.type === 'receivable';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const num = parseFloat(amount);
    if (!num || num <= 0) return;

    setIsSubmitting(true);
    try {
      onSubmit(debt.id, num, date, walletId, note.trim() || undefined, editingRepayment?.id);
    } finally {
      onClose();
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-md rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[95vh] flex flex-col">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-600" />
            <h2 className="font-bold text-lg text-slate-900">
              {lang === 'my' ? 'ငွေဆပ်မှတ်တမ်း သွင်းခြင်း' : 'Record Debt Payment'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-400 hover:bg-slate-100 flex items-center justify-center font-bold"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {/* Target Debt Snapshot */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-slate-900">{debt.personName}</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isReceivable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}
              >
                {isReceivable
                  ? (lang === 'my' ? 'ရရန်ရှိသူ' : 'Borrower')
                  : (lang === 'my' ? 'ပေးရန်ရှိသူ' : 'Lender')}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
              <span>{lang === 'my' ? 'မူလပမာဏ:' : 'Total Debt:'} {formatMMK(debt.totalAmount)}</span>
              <span>{lang === 'my' ? 'ဆပ်ပြီးငွေ:' : 'Paid:'} {formatMMK(debt.paidAmount)}</span>
            </div>

            <div className="flex items-center justify-between text-xs font-bold text-slate-900 border-t border-slate-200/80 pt-1">
              <span>{lang === 'my' ? 'လက်ကျန်ငွေ:' : 'Current Remaining:'}</span>
              <span className={isReceivable ? 'text-emerald-700' : 'text-rose-700'}>
                {formatMMK(remaining)}
              </span>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              {lang === 'my' ? 'ယခုဆပ်သည့် ပမာဏ (MMK):' : 'Payment Amount (MMK):'}
            </label>
            <input
              type="number"
              required
              autoFocus
              max={maxAllowedAmount}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full text-xl font-bold py-2.5 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
              <button
                type="button"
                onClick={() => setAmount(remaining.toString())}
                className="text-emerald-700 hover:underline font-semibold"
              >
                {lang === 'my' ? 'အကြွေးအကုန်ဆပ်မည် (Pay in full)' : 'Pay full balance'}
              </button>
              {remaining > 50000 && (
                <button
                  type="button"
                  onClick={() => setAmount((Math.round(remaining / 2)).toString())}
                  className="text-slate-600 hover:underline"
                >
                  {lang === 'my' ? 'တစ်ဝက်ဆပ်မည် (50%)' : 'Pay 50%'}
                </button>
              )}
            </div>
          </div>

          {/* Payment Account and Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
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
                    {lang === 'my' ? w.name : w.nameEn}
                  </option>
                ))}
              </select>
            </div>

            <div>
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
                <span>{lang === 'my' ? 'ငွေဆပ်မှတ်တမ်း သိမ်းမည်' : 'Save Repayment'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
