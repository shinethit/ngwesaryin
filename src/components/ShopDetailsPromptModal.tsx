import React from 'react';
import { Store } from 'lucide-react';

// [v7.5.78 C] "Fill in this shop's details now?" prompt.
//
// Shown AFTER a transaction is saved with a shop name that has no shop
// record with details yet. It MUST be hosted by App (not by
// TransactionModal): the save handler closes the TransactionModal
// itself (`setIsTxModalOpen(false)` in useTransactionHandlers), so a
// prompt rendered inside that modal would unmount with it and never
// be seen. TransactionModal hands the new shop name to App via
// `onShopNeedsDetails`; App renders this modal.
//
// Two choices, both ≥44px:
//   - Fill now → App opens the ShopModal pre-filled with the name.
//   - Later   → App stores ONE reminder per shop name (deduped) that
//               lives in Notifications + the Sidebar Shops badge until
//               the details are filled.
interface ShopDetailsPromptModalProps {
  isOpen: boolean;
  shopName: string;
  lang: 'my' | 'en';
  onFillNow: (shopName: string) => void;
  onLater: (shopName: string) => void;
}

export const ShopDetailsPromptModal: React.FC<ShopDetailsPromptModalProps> = ({
  isOpen,
  shopName,
  lang,
  onFillNow,
  onLater,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/60 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <Store className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-base text-slate-900 leading-snug">
              {lang === 'my' ? 'ဒီဆိုင်ရဲ့ အသေးစိတ်ကို အခု ဖြည့်မလား?' : 'Fill in this shop’s details now?'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mt-1">
              {lang === 'my'
                ? `“${shopName}” ဆိုင်အတွက် ဖုန်း၊ လိပ်စာ အစရှိတဲ့ အသေးစိတ် မရှိသေးပါဘူး။`
                : `“${shopName}” has no phone, address or other details saved yet.`}
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
              {lang === 'my'
                ? 'နောက်မှ ဖြည့်မည် ဆိုရင် သတိပေးချက် (Notifications) မှာ ပြန်ပေါ်လာပါမယ်။'
                : 'If you choose Later, a reminder will appear in Notifications.'}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={() => onFillNow(shopName)}
            className="w-full px-4 py-2.5 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm cursor-pointer shadow-sm active:scale-[0.98] transition-all"
          >
            {lang === 'my' ? 'အခု ဖြည့်မည်' : 'Fill now'}
          </button>
          <button
            type="button"
            onClick={() => onLater(shopName)}
            className="w-full px-4 py-2.5 min-h-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm cursor-pointer active:scale-[0.98] transition-all"
          >
            {lang === 'my' ? 'နောက်မှ ဖြည့်မည်' : 'Later'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShopDetailsPromptModal;
