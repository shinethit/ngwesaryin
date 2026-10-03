import React, { useState } from 'react';
import {
  HandCoins,
  ArrowDownLeft,
  ArrowUpRight,
  User,
  Phone,
  Calendar,
  Wallet,
  FileText,
} from 'lucide-react';
import { Debt, DebtType, Wallet as WalletType } from '../types';
import { formatMMK } from '../utils/formatters';
import { getLocalDateString } from '../utils/dateUtils';

interface DebtModalProps {
  isOpen: boolean;
  wallets: WalletType[];
  lang: 'my' | 'en';
  onClose: () => void;
  onSubmit: (debt: Omit<Debt, 'id' | 'paidAmount' | 'repayments' | 'status' | 'createdAt'>) => void;
}

export const DebtModal: React.FC<DebtModalProps> = ({
  isOpen,
  wallets,
  lang,
  onClose,
  onSubmit,
}) => {
  const [type, setType] = useState<DebtType>('receivable');
  const [personName, setPersonName] = useState('');
  const [phone, setPhone] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [startDate, setStartDate] = useState(() => getLocalDateString());
  const [dueDate, setDueDate] = useState('');
  const [walletId, setWalletId] = useState(wallets[0]?.id || 'cash');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const amount = parseFloat(totalAmount);
    if (!amount || amount <= 0 || !personName.trim()) return;

    setIsSubmitting(true);
    try {
      onSubmit({
        type,
        personName: personName.trim(),
        phone: phone.trim() || undefined,
        totalAmount: amount,
        startDate,
        dueDate: dueDate || undefined,
        walletId,
        note: note.trim() || undefined,
      });
    } finally {
      onClose();
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 touch-none overscroll-none animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] sm:max-h-[88vh] flex flex-col pointer-events-auto animate-scaleUp">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <HandCoins className="w-5 h-5 text-indigo-600" />
            <h2 className="font-bold text-lg text-slate-900">
              {lang === 'my' ? 'အကြွေး စာရင်းသစ် မှတ်တမ်းတင်ခြင်း' : 'Record New Debt / Loan'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-400 hover:bg-slate-100 flex items-center justify-center font-bold"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 min-h-0 text-xs sm:text-sm overscroll-contain touch-pan-y scroll-smooth [webkit-overflow-scrolling:touch]">
          {/* Debt Type Toggle: ရရန်ရှိ vs ပေးရန်ရှိ */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setType('receivable')}
              className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                type === 'receivable'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>{lang === 'my' ? 'သူများဆီက ရရန်ရှိ (Lent)' : 'Receivable (Lent)'}</span>
            </button>
            <button
              type="button"
              onClick={() => setType('payable')}
              className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                type === 'payable'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>{lang === 'my' ? 'သူများကို ပေးရန်ရှိ (Debt)' : 'Payable (Borrowed)'}</span>
            </button>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              {lang === 'my' ? 'စုစုပေါင်း အကြွေးပမာဏ (MMK - ကျပ်):' : 'Total Amount (MMK):'}
            </label>
            <input
              type="number"
              step="any"
              required
              autoFocus
              placeholder="0"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              className="w-full text-xl sm:text-2xl font-bold py-2.5 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            
            {/* Quick Lakhs Converter Helper */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
              <span className="text-[11px] font-semibold text-slate-500">{lang === 'my' ? 'မြန်ဆန် သက်သာ:' : 'Quick:'}</span>
              <button
                type="button"
                onClick={() => {
                  const val = parseFloat(totalAmount) || 0;
                  if (val > 0) setTotalAmount(String(Math.round(val * 100000)));
                }}
                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
                title={lang === 'my' ? 'ရိုက်ထည့်ထားသော ဂဏန်းအား ၁ သိန်း (x 100,000) ဖြင့် မြှောက်မည်' : 'Multiply by 1 Lakh (x100,000)'}
              >
                ✨ သိန်း (x100,000)
              </button>
              <button
                type="button"
                onClick={() => setTotalAmount(String((parseFloat(totalAmount) || 0) + 100000))}
                className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold cursor-pointer active:scale-95"
              >
                +1 သိန်း
              </button>
            </div>
          </div>

          {/* Person Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                {lang === 'my' ? 'လူအမည် / ဆိုင်အမည်:' : 'Person / Business Name:'}
              </label>
              <input
                type="text"
                required
                placeholder="ဥပမာ - ဦးမင်းသူ"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                {lang === 'my' ? 'ဖုန်းနံပါတ် (ရွေးချယ်ရန်):' : 'Phone Number (Optional):'}
              </label>
              <input
                type="tel"
                placeholder="09..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          {/* Dates: Start date & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                {lang === 'my' ? 'စတင်သည့်ရက်စွဲ:' : 'Start Date:'}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                {lang === 'my' ? 'ပြန်ဆပ်ရမည့်ရက် (Due Date):' : 'Due Date (Optional):'}
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          {/* Wallet / Source */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              {lang === 'my' ? 'သက်ဆိုင်ရာ ပိုက်ဆံအိတ် / အကောင့်:' : 'Wallet Account:'}
            </label>
            <select
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {lang === 'my' ? w.name : w.nameEn} ({formatMMK(w.balance)})
                </option>
              ))}
            </select>
          </div>

          {/* Note Input */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              {lang === 'my' ? 'အကြောင်းအရာ / မှတ်ချက်:' : 'Reason / Note:'}
            </label>
            <input
              type="text"
              placeholder={lang === 'my' ? 'ဥပမာ - ဆိုင်ဖွင့်ရန် အရေးပေါ် ချေးထားငွေ' : 'e.g. Emergency loan for business'}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          {/* Footer Submit */}
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
              id="debt-submit-btn"
              type="submit"
              disabled={isSubmitting}
              className={`px-6 py-2.5 rounded-xl text-white font-bold shadow-xs transition-all flex items-center justify-center gap-2 ${
                isSubmitting
                  ? 'bg-indigo-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 cursor-pointer'
              }`}
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{lang === 'my' ? 'သိမ်းဆည်းနေပါသည်...' : 'Saving...'}</span>
                </>
              ) : (
                <span>{lang === 'my' ? 'အကြွေးမှတ်မည်' : 'Save Debt Record'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
