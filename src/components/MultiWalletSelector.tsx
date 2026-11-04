import React, { useState, useRef, useEffect } from 'react';
import { Wallet as WalletIcon, ChevronDown, Check, X, Search, Filter } from 'lucide-react';
import { Wallet } from '../types';
import { formatCurrency } from '../utils/currency';


interface MultiWalletSelectorProps {
  wallets: Wallet[];
  selectedWalletIds: string[]; // empty array or all wallet ids = all selected
  onChangeSelectedWalletIds: (ids: string[]) => void;
  // [v7.5.56] Called on any explicit user pick (Select All, preset,
  // toggle) so the parent can mark the selection explicit — distinct
  // from the untouched default (empty = included-only on Dashboard).
  onExplicitSelection?: () => void;
  lang: 'my' | 'en';
  compact?: boolean;
}

export const MultiWalletSelector: React.FC<MultiWalletSelectorProps> = ({
  wallets,
  selectedWalletIds,
  onChangeSelectedWalletIds,
  onExplicitSelection,
  lang,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // [v7.5.55] Inline notice when a preset has no matching wallets (A3).
  const [presetNotice, setPresetNotice] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const allWalletIds = wallets.map((w) => w.id);
  const isAllSelected =
    selectedWalletIds.length === 0 || selectedWalletIds.length === wallets.length;
  // [v7.5.56] Empty ids = untouched default (Dashboard: included-only);
  // a full id list = the user explicitly chose Select All (all wallets).
  const isExplicitAllSelected =
    wallets.length > 0 && selectedWalletIds.length === wallets.length;

  // [v7.5.56] Shared-wallet display helpers (finding 25).
  const isSharedWallet = (w: Wallet) =>
    !!w.isSharedFromOther || !!(w.sharedWith && w.sharedWith.length > 0);
  const getOwnerName = (w: Wallet): string => w.ownerName || w.ownerEmail || '';
  const getWalletDisplayName = (w: Wallet): string =>
    lang === 'my' ? w.name : w.nameEn || w.name;
  // "🤝 Name (Owner)" for shared wallets, plain name otherwise.
  const getWalletLabelWithOwner = (w: Wallet): string => {
    const name = getWalletDisplayName(w);
    if (!isSharedWallet(w)) return name;
    const owner = getOwnerName(w);
    return `🤝 ${name}${owner ? ` (${owner})` : ''}`;
  };

  // [v7.5.55] "Separate" wallets (includeInTotals === false) are excluded
  // from the Dashboard balance when all wallets are shown (A14).
  const includedCount = wallets.filter((w) => w.includeInTotals !== false).length;
  const separateCount = wallets.length - includedCount;

  const isSelected = (id: string) => {
    if (isAllSelected) return true;
    return selectedWalletIds.includes(id);
  };

  const handleToggleWallet = (id: string) => {
    setPresetNotice(null);
    onExplicitSelection?.();
    if (isAllSelected) {
      // [v7.5.55] All selected: tapping a checked wallet unchecks JUST that
      // one (was: selecting only the tapped wallet).
      onChangeSelectedWalletIds(allWalletIds.filter((wId) => wId !== id));
      return;
    }

    if (selectedWalletIds.includes(id)) {
      const next = selectedWalletIds.filter((wId) => wId !== id);
      // If none selected, default to all
      onChangeSelectedWalletIds(next.length === 0 ? allWalletIds : next);
    } else {
      const next = [...selectedWalletIds, id];
      onChangeSelectedWalletIds(next.length === wallets.length ? allWalletIds : next);
    }
  };

  const handleSelectAll = () => {
    setPresetNotice(null);
    // [v7.5.56] Select All selects ALL wallets (finding 15) — every id,
    // Separate included — and reports the explicit choice so Dashboard
    // stops applying the included-only default.
    onExplicitSelection?.();
    onChangeSelectedWalletIds(allWalletIds);
  };

  const handleSelectPersonalOnly = () => {
    const personalIds = wallets
      .filter((w) => !w.isSharedFromOther && (!w.sharedWith || w.sharedWith.length === 0))
      .map((w) => w.id);
    // [v7.5.55] Empty set: leave the selection unchanged and say so
    // (was: silently selecting ALL wallets).
    if (personalIds.length === 0) {
      setPresetNotice(lang === 'my' ? 'ကိုယ်ပိုင် Wallet မရှိပါ' : 'No personal wallets');
      return;
    }
    setPresetNotice(null);
    onExplicitSelection?.();
    onChangeSelectedWalletIds(personalIds);
  };

  const handleSelectSharedOnly = () => {
    const sharedIds = wallets
      .filter((w) => w.isSharedFromOther || (w.sharedWith && w.sharedWith.length > 0))
      .map((w) => w.id);
    // [v7.5.55] Empty set: leave the selection unchanged and say so
    // (was: silently selecting ALL wallets).
    if (sharedIds.length === 0) {
      setPresetNotice(lang === 'my' ? 'Shared Wallet မရှိပါ' : 'No shared wallets');
      return;
    }
    setPresetNotice(null);
    onExplicitSelection?.();
    onChangeSelectedWalletIds(sharedIds);
  };

  const handleSelectIncludedOnly = () => {
    const includedIds = wallets.filter((w) => w.includeInTotals !== false).map((w) => w.id);
    // [v7.5.55] Empty set: leave the selection unchanged and say so
    // (was: silently selecting ALL wallets).
    if (includedIds.length === 0) {
      setPresetNotice(lang === 'my' ? 'ပါဝင်သည့် Wallet မရှိပါ' : 'No included wallets');
      return;
    }
    setPresetNotice(null);
    onExplicitSelection?.();
    onChangeSelectedWalletIds(includedIds);
  };

  // Label for trigger button
  const getTriggerLabel = () => {
    // [v7.5.60 M2] Untouched default ([]) is included-only, NOT "all":
    // say how many are included and how many Separate wallets are left
    // out. Only an explicit Select All (full id list) may say "all".
    if (selectedWalletIds.length === 0) {
      if (separateCount > 0) {
        return lang === 'my'
          ? `🌟 ပါဝင်သည့် အိတ် ${includedCount} ခု (ခွဲထား ${separateCount} ခု မပါ)`
          : `🌟 ${includedCount} included wallets (${separateCount} separate excluded)`;
      }
      return lang === 'my'
        ? `🌟 Wallet အားလုံးပေါင်း (${wallets.length} ခု)`
        : `🌟 All Wallets (${wallets.length})`;
    }
    if (isExplicitAllSelected) {
      return lang === 'my'
        ? `🌟 Wallet အားလုံးပေါင်း (${wallets.length} ခု)`
        : `🌟 All Wallets (${wallets.length})`;
    }

    const selectedWallets = wallets.filter((w) => selectedWalletIds.includes(w.id));
    if (selectedWallets.length === 1) {
      const w = selectedWallets[0];
      // [v7.5.56] Shared badge + owner name in the trigger (finding 25).
      return isSharedWallet(w) ? getWalletLabelWithOwner(w) : `💳 ${getWalletDisplayName(w)}`;
    }

    if (selectedWallets.length > 1) {
      const names = selectedWallets
        .slice(0, 2)
        .map((w) => getWalletLabelWithOwner(w))
        .join(', ');
      const remaining = selectedWallets.length - 2;
      const sharedMark = selectedWallets.some((w) => isSharedWallet(w)) ? '🤝 ' : '💳 ';
      return lang === 'my'
        ? `${sharedMark}${names}${remaining > 0 ? ` +${remaining}` : ''} (${selectedWallets.length} ခု ရွေးထားသည်)`
        : `${sharedMark}${names}${remaining > 0 ? ` +${remaining}` : ''} (${selectedWallets.length} selected)`;
    }

    return lang === 'my' ? 'Wallet ရွေးချယ်ရန်' : 'Select Wallets';
  };

  const filteredWallets = wallets.filter((w) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = (w.name || '').toLowerCase();
    const nameEn = (w.nameEn || '').toLowerCase();
    // [v7.5.56] Search matches the owner name/email too (finding 25).
    const owner = getOwnerName(w).toLowerCase();
    return name.includes(q) || nameEn.includes(q) || owner.includes(q);
  });

  return (
    <div className="relative inline-block text-left w-full sm:w-auto" ref={popoverRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 bg-slate-100 hover:bg-slate-200/90 text-slate-900 font-bold text-xs rounded-xl border border-slate-200 transition-all active:scale-[0.99] cursor-pointer shadow-2xs ${
          compact ? 'px-3 py-1.5' : 'px-3.5 py-2.5'
        } ${!isAllSelected ? 'ring-2 ring-emerald-500/30 border-emerald-500 bg-emerald-50/50' : ''}`}
      >
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          <Filter className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="truncate">{getTriggerLabel()}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover / Dropdown Modal */}
      {isOpen && (
        <div className="absolute z-50 left-0 sm:right-0 sm:left-auto mt-2 w-full sm:w-80 bg-white rounded-2xl border border-slate-200 shadow-2xl p-3.5 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 min-w-0">
              <WalletIcon className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="truncate">{lang === 'my' ? 'Wallet များ စိတ်ကြိုက် တွဲဖက် ရွေးရန်' : 'Multi-Wallet Selector'}</span>
            </div>
            <button
              type="button"
              onClick={() => { setIsOpen(false); setPresetNotice(null); }}
              className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Preset Quick Actions */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <button
              type="button"
              onClick={handleSelectAll}
              className={`min-h-11 px-2.5 py-2 rounded-lg font-bold border transition-all cursor-pointer ${
                isExplicitAllSelected
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              🌟 {lang === 'my' ? 'အားလုံးပေါင်း' : 'Select All'}
            </button>
            {/* [v7.5.60 M3] The "included only" preset existed as dead code
                (handleSelectIncludedOnly was never wired to a button) — now
                it is the way back to the default scope after Select All. */}
            <button
              type="button"
              onClick={handleSelectIncludedOnly}
              className={`min-h-11 px-2.5 py-2 rounded-lg font-bold border transition-all cursor-pointer ${
                selectedWalletIds.length === includedCount &&
                selectedWalletIds.length > 0 &&
                selectedWalletIds.every((id) => wallets.some((w) => w.id === id && w.includeInTotals !== false))
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              ✅ {lang === 'my' ? 'ပါဝင်သည့် အိတ် သာ' : 'Included only'}
            </button>
            <button
              type="button"
              onClick={handleSelectPersonalOnly}
              className="min-h-11 px-2.5 py-2 rounded-lg font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all cursor-pointer"
            >
              👤 {lang === 'my' ? 'ကိုယ်ပိုင်သာ' : 'Personal'}
            </button>
            <button
              type="button"
              onClick={handleSelectSharedOnly}
              className="min-h-11 px-2.5 py-2 rounded-lg font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all cursor-pointer"
            >
              🤝 {lang === 'my' ? 'Shared သာ' : 'Shared'}
            </button>
          </div>

          {/* [v7.5.55] Notice when a preset has no matching wallets (A3) */}
          {presetNotice && (
            <div className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
              {presetNotice}
            </div>
          )}

          {/* Search box if > 3 wallets */}
          {wallets.length > 3 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={lang === 'my' ? 'Wallet အမည်ဖြင့် ရှာရန်...' : 'Search wallet...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-2 text-base bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          )}

          {/* Wallet List with Checkboxes */}
          <div className="max-h-60 overflow-y-auto overflow-x-hidden space-y-1 pr-1 custom-scrollbar">
            {filteredWallets.map((w) => {
              const checked = isSelected(w.id);
              const isShared = isSharedWallet(w);
              const owner = getOwnerName(w);
              const formattedBal = formatCurrency(w.balance, w.currency);

              return (
                <div
                  key={w.id}
                  onClick={() => handleToggleWallet(w.id)}
                  className={`flex items-center justify-between p-2 min-h-11 rounded-xl text-xs cursor-pointer transition-all border ${
                    checked
                      ? 'bg-emerald-50/80 border-emerald-200 text-slate-900 font-bold'
                      : 'bg-white border-transparent hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                        checked
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {checked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    {/* [v7.5.56] Shared badge + owner name (finding 25). */}
                    <div className="min-w-0">
                      <span className="truncate block">
                        {isShared ? '🤝 ' : '💳 '}
                        {lang === 'my' ? w.name : w.nameEn}
                      </span>
                      {isShared && owner && (
                        <span className="block truncate text-[10px] font-semibold text-amber-700">
                          {lang === 'my' ? `ပိုင်ရှင်: ${owner}` : `Owner: ${owner}`}
                        </span>
                      )}
                      {isShared && !owner && (
                        <span className="block truncate text-[10px] font-semibold text-amber-700">
                          {lang === 'my' ? 'မျှဝေထားသော အိတ်' : 'Shared wallet'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-[11px] font-mono text-slate-500 shrink-0 ml-2">
                    {formattedBal}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Done Button */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-slate-500 min-w-0">
              {/* [v7.5.56] Distinguish the untouched default ([]) from an
                  explicit Select All (full list): the default combines
                  included wallets only, Select All combines ALL wallets
                  including Separate ones (finding 15). */}
              {isExplicitAllSelected
                ? lang === 'my'
                  ? 'အကောင့်အားလုံး စုပေါင်းပြထားသည် (ခွဲထားသည့် အကောင့်များပါ ပါဝင်သည်)'
                  : 'All wallets combined (separate wallets included)'
                : isAllSelected
                ? lang === 'my'
                  ? (separateCount > 0
                      ? `ပါဝင်သည့် အကောင့် ${includedCount} ခု စုပေါင်းပြထားသည် (ခွဲထားသည့် ${separateCount} ခု မပါဝင်ပါ)`
                      : 'အကောင့်အားလုံး စုပေါင်းပြထားသည်')
                  : (separateCount > 0
                      ? `${includedCount} included wallets combined (${separateCount} separate not included)`
                      : 'All wallets selected')
                : lang === 'my'
                ? `${selectedWalletIds.length} ခု ရွေးချယ်ထားပါသည်`
                : `${selectedWalletIds.length} wallets selected`}
            </span>
            <button
              type="button"
              onClick={() => { setIsOpen(false); setPresetNotice(null); }}
              className="min-h-11 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
            >
              {/* [v7.5.55] Selection applies live on toggle; this button only
                  closes the popover, so it is labelled Close, not Apply. */}
              {lang === 'my' ? 'ပိတ်မည်' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
