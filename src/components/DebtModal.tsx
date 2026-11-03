import React, { useState } from 'react';
import { HandCoins, ArrowDownLeft, ArrowUpRight, Phone, Wallet } from 'lucide-react';
import { Debt, DebtType, Wallet as WalletType } from '../types';
import { formatCurrency } from '../utils/currency';
import { parseMyanmarNumber } from '../utils/myanmarDigits';
import { getLocalDateString } from '../utils/dateUtils';

interface DebtModalProps {
  isOpen: boolean;
  wallets: WalletType[];
  lang: 'my' | 'en';
  onClose: () => void;
  onSubmit: (debt: Omit<Debt, 'id' | 'paidAmount' | 'repayments' | 'status' | 'createdAt'>) => void;
  // [v7.5.55 D28] Edit mode. App wiring (coordinator): pass editingDebt +
  // onUpdate={handleUpdateDebt} — DebtModal stays inert for edits until then.
  editingDebt?: Debt | null;
  onUpdate?: (debt: Debt) => void;
}

export const DebtModal: React.FC<DebtModalProps> = ({
  isOpen,
  wallets,
  lang,
  onClose,
  onSubmit,
  editingDebt,
  onUpdate,
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
  const [error, setError] = useState('');
  // [v7.5.55 D31] True once the amount field has been converted to kyat
  // (by the "x100,000" button or by "+1 သိန်း"). While true the multiply
  // button is a no-op, so a double-tap can never multiply twice. Only a
  // manual edit of the amount field clears it.
  const [lakhConverted, setLakhConverted] = useState(false);

  // [v7.5.55 D8] Reset ALL fields on every open (the modal stays mounted, so
  // the old code re-opened pre-filled with the previous debt). The wallet is
  // re-derived on open too, so a deleted first wallet cannot leave a dead id.
  React.useEffect(() => {
    if (!isOpen) return;
    setIsSubmitting(false);
    setError('');
    if (editingDebt) {
      // [v7.5.55 D31] The pre-filled total is stored kyat, not lakhs —
      // start converted so the multiply button is disabled and "+1 သိန်း"
      // adds kyat. A manual edit of the field clears it (handleAmountChange).
      setLakhConverted(true);
      setType(editingDebt.type);
      setPersonName(editingDebt.personName);
      setPhone(editingDebt.phone || '');
      setTotalAmount(String(editingDebt.totalAmount));
      setStartDate(editingDebt.startDate || getLocalDateString());
      setDueDate(editingDebt.dueDate || '');
      setWalletId(
        wallets.some((w) => w.id === editingDebt.walletId)
          ? editingDebt.walletId
          : wallets[0]?.id || 'cash'
      );
      setNote(editingDebt.note || '');
    } else {
      setLakhConverted(false);
      setType('receivable');
      setPersonName('');
      setPhone('');
      setTotalAmount('');
      setStartDate(getLocalDateString());
      setDueDate('');
      setWalletId(wallets[0]?.id || 'cash');
      setNote('');
    }
  }, [isOpen, editingDebt]);
  // NOTE: `wallets` is intentionally not a dep — the reset must run only
  // when the modal opens (or the edited debt changes), never mid-edit.

  if (!isOpen) return null;

  const isEditing = !!editingDebt;
  // [v7.5.55 D12] The debt's currency is its wallet's currency, shown in the
  // label and stored on the debt (Debt.currency). Falls back to the stored
  // currency when the wallet was deleted.
  const selectedWallet = wallets.find((w) => w.id === walletId);
  // [v7.5.56 B] The debt form must say so when the chosen wallet is shared.
  const isSharedSelectedWallet =
    !!selectedWallet &&
    (!!selectedWallet.isSharedFromOther || (selectedWallet.sharedWith?.length || 0) > 0);
  const currencyCode = selectedWallet?.currency || editingDebt?.currency || 'MMK';

  const handleAmountChange = (v: string) => {
    setTotalAmount(v);
    setLakhConverted(false);
  };

  const handleMultiplyLakh = () => {
    const val = parseMyanmarNumber(totalAmount);
    if (!val || val <= 0) return;
    if (lakhConverted) return; // idempotent: a second tap does nothing
    // [v7.5.55 D31] A value already at kyat scale must not be multiplied:
    // an edited debt's stored total (e.g. 2,500,000) would explode to
    // 250,000,000,000 with one tap. 100,000+ in the field is kyat already
    // (100,000 lakh = 10 billion MMK is not a real debt).
    if (val >= 100000) {
      setError(lang === 'my' ? 'ဒီပမာဏက ကျပ်နဲ့ ရိုက်ထားပြီးသား ဖြစ်ပါတယ် — သိန်းနဲ့ ထပ်မြှောက်စရာ မလိုပါဘူး' : 'This amount is already in kyat — no need to multiply by 100,000');
      return;
    }
    const result = Math.round(val * 100000);
    setTotalAmount(String(result));
    setLakhConverted(true);
  };

  const handleAddOneLakh = () => {
    const val = parseMyanmarNumber(totalAmount) || 0;
    // [v7.5.55 D31] Both quick buttons must agree on units: while the field
    // still holds lakhs, "+1 သိန်း" adds 1 (lakh); once it holds kyat
    // (converted, or an edited debt's stored total) it adds 100,000 kyat.
    setTotalAmount(String(lakhConverted ? val + 100000 : val + 1));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    // [v7.5.55 D29] Validation failures show a Burmese message, never a
    // silent return. Myanmar digits (၀-၉) accepted.
    const amount = parseMyanmarNumber(totalAmount);
    if (!amount || amount <= 0) {
      setError(lang === 'my' ? 'စုစုပေါင်း အကြွေးပမာဏ မှန်ကန်စွာ ထည့်ပါ (0 ထက် ကြီးရမည်)' : 'Please enter a valid total amount greater than 0');
      return;
    }
    if (!personName.trim()) {
      setError(lang === 'my' ? 'လူအမည် / ဆိုင်အမည် ထည့်သွင်းပါ' : 'Please enter the person / business name');
      return;
    }
    if (!startDate) {
      setError(lang === 'my' ? 'စတင်သည့်ရက်စွဲ ရွေးချယ်ပါ' : 'Please choose a start date');
      return;
    }
    setError('');

    setIsSubmitting(true);
    try {
      if (isEditing && editingDebt && onUpdate) {
        onUpdate({
          ...editingDebt,
          type,
          personName: personName.trim(),
          phone: phone.trim() || undefined,
          totalAmount: amount,
          startDate,
          dueDate: dueDate || undefined,
          walletId,
          currency: currencyCode,
          note: note.trim() || undefined,
        });
      } else {
        onSubmit({
          type,
          personName: personName.trim(),
          phone: phone.trim() || undefined,
          totalAmount: amount,
          startDate,
          dueDate: dueDate || undefined,
          walletId,
          currency: currencyCode,
          note: note.trim() || undefined,
        });
      }
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
              {isEditing
                ? (lang === 'my' ? 'အကြွေး ပြင်ဆင်ခြင်း' : 'Edit Debt / Loan')
                : (lang === 'my' ? 'အကြွေး စာရင်းသစ် မှတ်တမ်းတင်ခြင်း' : 'Record New Debt / Loan')}
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
              {lang === 'my' ? `စုစုပေါင်း အကြွေးပမာဏ (${currencyCode}):` : `Total Amount (${currencyCode}):`}
            </label>
            <input
              type="text"
              inputMode="decimal"
              required
              autoFocus
              placeholder="0"
              value={totalAmount}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="w-full text-xl sm:text-2xl font-bold py-2.5 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              {lang === 'my'
                ? `ဤပမာဏကို ${currencyCode} ဖြင့် မှတ်တမ်းတင်ပါမည်${selectedWallet ? ` (${lang === 'my' ? selectedWallet.name : selectedWallet.nameEn} ၏ ငွေကြေး)` : ''}`
                : `This amount is recorded in ${currencyCode}${selectedWallet ? ` (currency of ${selectedWallet.nameEn})` : ''}`}
            </p>

            {/* Quick Lakhs Converter Helper */}
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
                  {lang === 'my' ? w.name : w.nameEn} ({formatCurrency(w.balance, w.currency || 'MMK')})
                </option>
              ))}
            </select>
            {/* [v7.5.56 B] Shared wallet: the other member sees this debt read-only. */}
            {isSharedSelectedWallet && (
              <p className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mt-2">
                {lang === 'my'
                  ? '⚠️ ဤပိုက်ဆံအိတ်ကို မျှဝေထားပါသည် — အခြားအဖွဲ့ဝင်က ဤအကြွေးကို မြင်ရပါမည် (ဖတ်ရန်သာ၊ ပြင်/ဖျက်၍ မရပါ)'
                  : '⚠️ This wallet is shared — the other member will see this debt (read-only)'}
              </p>
            )}
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

          {error && (
            <p className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              ⚠️ {error}
            </p>
          )}

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
                <span>
                  {isEditing
                    ? (lang === 'my' ? 'ပြင်ဆင်ချက် သိမ်းမည်' : 'Save Changes')
                    : (lang === 'my' ? 'အကြွေးမှတ်မည်' : 'Save Debt Record')}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
