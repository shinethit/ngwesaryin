import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { ShopContact, PublicShop } from '../../types';
import {
  SHOP_REPORT_REASONS,
  ShopReportReason,
  SubmitShopReportResult,
  shopReportReasonLabel,
  submitShopReport,
} from '../../utils/shopReports';

// [v7.5.81] "Report this shop" modal.
//
// Structure follows ShopDetailsPromptModal: hosted by the parent
// (ShopsView), not self-mounted — ShopCard unmounts / re-renders with
// the list, so the modal state lives in ShopsView. The modal only
// collects the reason + optional note and calls submitShopReport; the
// parent shows the result notice (success / already-reported / failed)
// and closes the modal — a failed write never shows a success notice.
//
// Contents: shop name (title), 4 reason chips (one REQUIRED — Submit
// stays disabled until one is picked), an OPTIONAL short note field,
// Submit + Cancel. All buttons ≥44px; max-w-sm + wrapping chips keep
// it 390px-safe with no horizontal scroll. No "Admin" wording anywhere.
interface ShopReportModalProps {
  isOpen: boolean;
  shop: (ShopContact | PublicShop) | null;
  lang: 'my' | 'en';
  onClose: () => void;
  onDone: (result: SubmitShopReportResult) => void;
}

export const ShopReportModal: React.FC<ShopReportModalProps> = ({
  isOpen,
  shop,
  lang,
  onClose,
  onDone,
}) => {
  const [reason, setReason] = useState<ShopReportReason | null>(null);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fresh state every time the modal opens for a (possibly different) shop.
  useEffect(() => {
    if (isOpen) {
      setReason(null);
      setNote('');
      setIsSubmitting(false);
    }
  }, [isOpen, shop?.id]);

  if (!isOpen || !shop) return null;

  const handleSubmit = async () => {
    if (!reason || isSubmitting) return;
    setIsSubmitting(true);
    const result = await submitShopReport({
      shopId: shop.id,
      shopName: shop.name,
      reason,
      note,
    });
    setIsSubmitting(false);
    onDone(result);
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/60 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0 border border-amber-100">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-base text-slate-900 leading-snug">
              {lang === 'my' ? 'ဆိုင်ကို အကြောင်းကြားမည်' : 'Report this shop'}
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed mt-1 break-words">
              “{shop.name}”
            </p>
            <p className="text-xs text-slate-500 leading-relaxed mt-1">
              {lang === 'my'
                ? 'ဆိုင်အချက်အလက် မှားနေရင် အကြောင်းကြားပေးပါ — စစ်ဆေးပေးပါမယ်။'
                : 'Let us know if this shop’s details are wrong — it will be checked.'}
            </p>
          </div>
        </div>

        {/* Reason chips — one REQUIRED. Submit stays disabled until one is picked. */}
        <div>
          <div className="grid grid-cols-2 gap-2">
            {SHOP_REPORT_REASONS.map((r) => {
              const selected = reason === r.code;
              return (
                <button
                  key={r.code}
                  type="button"
                  onClick={() => setReason(r.code)}
                  aria-pressed={selected}
                  className={`px-2 py-2.5 min-h-[44px] rounded-xl border text-xs font-bold transition-all cursor-pointer break-words ${
                    selected
                      ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {shopReportReasonLabel(r.code, lang)}
                </button>
              );
            })}
          </div>
          {!reason && (
            <p className="text-[11px] text-slate-400 mt-2">
              {lang === 'my' ? 'အကြောင်းရင်း တစ်ခုရွေးပါ' : 'Please choose a reason'}
            </p>
          )}
        </div>

        {/* Optional short note */}
        <input
          type="text"
          value={note}
          maxLength={200}
          onChange={(e) => setNote(e.target.value)}
          placeholder={lang === 'my' ? 'အသေးစိတ် (မဖြစ်မနေ မဟုတ်)' : 'Details (optional)'}
          className="w-full px-3 py-2.5 min-h-[44px] bg-slate-50 text-sm border border-slate-200 rounded-xl outline-none text-slate-800 focus:bg-white"
        />

        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!reason || isSubmitting}
            className="w-full px-4 py-2.5 min-h-[44px] rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-sm cursor-pointer shadow-sm active:scale-[0.98] transition-all"
          >
            {isSubmitting
              ? lang === 'my'
                ? 'တင်နေသည်…'
                : 'Submitting…'
              : lang === 'my'
              ? 'Report တင်မည်'
              : 'Submit report'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full px-4 py-2.5 min-h-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 font-bold text-sm cursor-pointer active:scale-[0.98] transition-all"
          >
            {lang === 'my' ? 'မလုပ်ပါ' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShopReportModal;
