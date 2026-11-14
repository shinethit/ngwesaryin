import React, { useEffect, useState } from 'react';
import { Store } from 'lucide-react';
import { formatMMK } from '../utils/formatters';
import type { MenuUpdateRow } from '../utils/shopMenuUpdate';

// [v7.5.82] "Update this shop's menu with the new prices?" prompt.
//
// Shown AFTER a shopping-list (or unit_qty) transaction is saved with
// a shop name that resolves to a shop whose menu would actually change
// (see computeMenuDiff). It MUST be hosted by App (not by
// TransactionModal): the save handler closes the TransactionModal
// itself (`setIsTxModalOpen(false)` in useTransactionHandlers), so a
// prompt rendered inside that modal would unmount with it and never
// be seen — the same reason the ShopDetailsPromptModal lives in App
// (v7.5.78). TransactionModal hands the candidate to App via
// `onShopMenuUpdateCandidate`; App resolves the shop, diffs the menu
// and renders this modal.
//
// Each row is a checkbox (default CHECKED) so the user can exclude a
// line they do not want applied. A row flagged isLargeDiff carries a
// warning to double-check the unit — a 3x price jump is usually a
// per-piece vs per-pack mix-up, not a real price change.
interface ShopMenuUpdatePromptModalProps {
  isOpen: boolean;
  shopName: string;
  lang: 'my' | 'en';
  rows: MenuUpdateRow[];
  onApply: (selectedRows: MenuUpdateRow[]) => void;
  onSkip: () => void;
  /** Write failure text from App — shown in the modal so the user can retry or Skip. */
  error?: string | null;
  /** True while App is writing the menu — buttons disable so the write cannot double-fire. */
  isApplying?: boolean;
}

export const ShopMenuUpdatePromptModal: React.FC<ShopMenuUpdatePromptModalProps> = ({
  isOpen,
  shopName,
  lang,
  rows,
  onApply,
  onSkip,
  error,
  isApplying,
}) => {
  // Excluded row indices — reset every time the modal opens so every
  // row starts CHECKED (included) for each new prompt.
  const [excluded, setExcluded] = useState<ReadonlySet<number>>(new Set());
  useEffect(() => {
    if (isOpen) setExcluded(new Set());
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedRows = rows.filter((_, i) => !excluded.has(i));

  const toggleRow = (idx: number) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/60 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-200 p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <Store className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-base text-slate-900 leading-snug">
              {lang === 'my' ? 'ဒီဆိုင်ရဲ့ Menu ကို ဈေးနှုန်း အသစ် တင်ပေးမလား?' : 'Update this shop’s menu with the new prices?'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mt-1 break-words">
              {lang === 'my'
                ? `“${shopName}” ဆိုင်ရဲ့ Menu မှာ အောက်က ဈေးနှုန်းတွေ ပြောင်းပါမယ်။ မလိုတဲ့ အတန်းကို အမှန်ခြစ် ဖြုတ်ထားလို့ ရပါတယ်။`
                : `The prices below will change on “${shopName}”’s menu. Untick any line you don’t want to apply.`}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {rows.map((row, idx) => (
            <label
              key={`${row.itemName}-${row.unit}-${idx}`}
              className="flex items-start gap-2.5 bg-slate-50 rounded-xl px-3 py-2.5 cursor-pointer min-h-[44px]"
            >
              <input
                type="checkbox"
                checked={!excluded.has(idx)}
                onChange={() => toggleRow(idx)}
                disabled={isApplying}
                className="w-5 h-5 mt-0.5 shrink-0 accent-emerald-600 cursor-pointer"
                aria-label={row.itemName}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-slate-900 leading-snug break-words">
                  {row.itemName}
                  <span className="ml-1.5 text-[11px] font-semibold text-slate-500">({row.unit})</span>
                </span>
                <span className="block text-sm font-mono text-slate-700 mt-0.5">
                  {row.isNew ? '—' : formatMMK(row.oldPrice ?? 0)} → {formatMMK(row.newPrice)}
                </span>
                {row.isLargeDiff && (
                  <span className="block text-[11px] font-bold text-amber-700 leading-relaxed mt-1">
                    {lang === 'my'
                      ? '⚠️ ဈေးက အရမ်းကွာနေတယ် — Unit မှန်လား စစ်ပါ'
                      : '⚠️ Price differs a lot — please check the unit'}
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>

        {error && (
          <p className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2.5 leading-relaxed">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={() => onApply(selectedRows)}
            disabled={selectedRows.length === 0 || isApplying}
            className="w-full px-4 py-2.5 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-sm cursor-pointer shadow-sm active:scale-[0.98] transition-all"
          >
            {isApplying
              ? lang === 'my'
                ? 'တင်ပေးနေပါတယ်…'
                : 'Updating…'
              : lang === 'my'
                ? 'တင်ပေးမည်'
                : 'Update'}
          </button>
          <button
            type="button"
            onClick={onSkip}
            disabled={isApplying}
            className="w-full px-4 py-2.5 min-h-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 disabled:bg-slate-100 disabled:text-slate-400 text-slate-800 font-bold text-sm cursor-pointer active:scale-[0.98] transition-all"
          >
            {lang === 'my' ? 'မလုပ်တော့' : 'Skip'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShopMenuUpdatePromptModal;
