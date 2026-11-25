import React, { useEffect, useState } from 'react';
import { Store } from 'lucide-react';
import { formatMMK } from '../utils/formatters';
import type { GlobalMenuSection, MenuUpdateRow } from '../utils/shopMenuUpdate';

// [v7.6.44] ONE combined "refresh all menus" prompt.
//
// The global button re-checks EVERY shop with purchase history and
// shows all of the changes in this single modal — one section per
// shop, each with the SAME selectable-row pattern as the single-shop
// prompt (rows start CHECKED; untick to exclude). A row flagged
// isLargeDiff carries the same unit double-check warning. The header
// states how many shops were checked, how many have changes, and how
// many were already up to date, so the check's coverage is visible
// instead of implied. Apply is disabled until at least one row is
// selected, exactly like the single-shop prompt.
export interface GlobalMenuApplySelection {
  shopId: string;
  shopName: string;
  isPublic: boolean;
  rows: MenuUpdateRow[];
}

interface GlobalMenuUpdatePromptModalProps {
  isOpen: boolean;
  lang: 'my' | 'en';
  sections: GlobalMenuSection[];
  checkedCount: number;
  upToDateCount: number;
  skippedPublicCount: number;
  onApply: (selected: GlobalMenuApplySelection[]) => void;
  onSkip: () => void;
  /** Write failure text from App — shown in the modal so the user can retry or Skip. */
  error?: string | null;
  /** True while App is writing the menus — buttons disable so the write cannot double-fire. */
  isApplying?: boolean;
}

export const GlobalMenuUpdatePromptModal: React.FC<GlobalMenuUpdatePromptModalProps> = ({
  isOpen,
  lang,
  sections,
  checkedCount,
  upToDateCount,
  skippedPublicCount,
  onApply,
  onSkip,
  error,
  isApplying,
}) => {
  // Excluded rows, keyed by shop id + row index (stable when a
  // successfully-applied section is removed after a partial apply) —
  // reset every time the modal opens so every row starts CHECKED.
  const [excluded, setExcluded] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => {
    if (isOpen) setExcluded(new Set());
  }, [isOpen]);

  if (!isOpen) return null;

  const selected: GlobalMenuApplySelection[] = [];
  let selectedRowCount = 0;
  for (const section of sections) {
    const rows = section.rows.filter((_, i) => !excluded.has(`${section.shopId}:${i}`));
    selectedRowCount += rows.length;
    if (rows.length > 0) {
      selected.push({
        shopId: section.shopId,
        shopName: section.shopName,
        isPublic: section.isPublic,
        rows,
      });
    }
  }

  const toggleRow = (shopId: string, idx: number) => {
    const key = `${shopId}:${idx}`;
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
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
              {lang === 'my'
                ? 'ဆိုင်အားလုံးရဲ့ Menu ကို ဈေးနှုန်း အသစ် တင်ပေးမလား?'
                : 'Update all shop menus with the new prices?'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mt-1 break-words">
              {lang === 'my'
                ? `ဝယ်ခဲ့သည့် ဆိုင် ${checkedCount} ဆိုင် စစ်ပြီး — ${sections.length} ဆိုင်မှာ ဈေးပြောင်းစရာ ရှိပါတယ်။ မလိုတဲ့ အတန်းကို အမှန်ခြစ် ဖြုတ်ထားလို့ ရပါတယ်။`
                : `Checked ${checkedCount} shops with purchase history — ${sections.length} have price changes. Untick any line you don’t want to apply.`}
            </p>
            {upToDateCount > 0 && (
              <p className="text-xs text-slate-500 leading-relaxed mt-1">
                {lang === 'my'
                  ? `${upToDateCount} ဆိုင်က ဈေးနှုန်း အသစ်နဲ့ ကိုက်ညီနေပါပြီ။`
                  : `${upToDateCount} ${upToDateCount === 1 ? 'shop is' : 'shops are'} already up to date.`}
              </p>
            )}
            {skippedPublicCount > 0 && (
              <p className="text-xs font-bold text-amber-700 leading-relaxed mt-1">
                {lang === 'my'
                  ? `အများပြင်ဆိုင် ${skippedPublicCount} ဆိုင်ကို အကောင့်ဝင်ပြီးမှ ပြန် Update လုပ်နိုင်ပါတယ်။`
                  : `${skippedPublicCount} public ${skippedPublicCount === 1 ? 'shop was' : 'shops were'} skipped — sign in to update public shop menus.`}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {sections.map((section) => {
            const newCount = section.rows.filter((r) => r.isNew).length;
            const updatedCount = section.rows.length - newCount;
            return (
              <div key={section.shopId} className="space-y-2">
                <div className="flex items-baseline gap-2 min-w-0 flex-wrap">
                  <h4 className="text-sm font-extrabold text-slate-900 leading-snug break-words">
                    {section.shopName}
                  </h4>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border shrink-0 ${
                      section.isPublic
                        ? 'bg-sky-50 border-sky-200 text-sky-800'
                        : 'bg-amber-50 border-amber-200 text-amber-800'
                    }`}
                  >
                    {section.isPublic
                      ? lang === 'my'
                        ? 'အများပြင်'
                        : 'Public'
                      : lang === 'my'
                        ? 'ကိုယ်ပိုင်'
                        : 'Private'}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {lang === 'my'
                      ? `အသစ် ${newCount} · ဈေးပြောင်း ${updatedCount}`
                      : `${newCount} new · ${updatedCount} updated`}
                  </span>
                </div>
                {section.rows.map((row, idx) => (
                  <label
                    key={`${row.itemName}-${row.unit}-${idx}`}
                    className="flex items-start gap-2.5 bg-slate-50 rounded-xl px-3 py-2.5 cursor-pointer min-h-[44px]"
                  >
                    <input
                      type="checkbox"
                      checked={!excluded.has(`${section.shopId}:${idx}`)}
                      onChange={() => toggleRow(section.shopId, idx)}
                      disabled={isApplying}
                      className="w-5 h-5 mt-0.5 shrink-0 accent-emerald-600 cursor-pointer"
                      aria-label={`${section.shopName} ${row.itemName}`}
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
            );
          })}
        </div>

        {error && (
          <p className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2.5 leading-relaxed">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={() => onApply(selected)}
            disabled={selectedRowCount === 0 || isApplying}
            className="w-full px-4 py-2.5 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-sm cursor-pointer shadow-sm active:scale-[0.98] transition-all"
          >
            {isApplying
              ? lang === 'my'
                ? 'တင်ပေးနေပါတယ်…'
                : 'Updating…'
              : lang === 'my'
                ? `တင်ပေးမည် (${selectedRowCount})`
                : `Update (${selectedRowCount})`}
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

export default GlobalMenuUpdatePromptModal;
