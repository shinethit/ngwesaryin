import React, { useState, useRef, useEffect } from 'react';
import {
  Wallet as WalletIcon,
  ChevronDown,
  Check,
  CheckSquare,
  Square,
  Users,
  User,
  Layers,
  X,
  Search,
  Filter,
} from 'lucide-react';
import { Wallet } from '../types';
import { formatCurrency } from '../utils/currency';
import { isWalletMatch } from '../utils/walletBalance';

interface MultiWalletSelectorProps {
  wallets: Wallet[];
  selectedWalletIds: string[]; // empty array or all wallet ids = all selected
  onChangeSelectedWalletIds: (ids: string[]) => void;
  lang: 'my' | 'en';
  compact?: boolean;
}

export const MultiWalletSelector: React.FC<MultiWalletSelectorProps> = ({
  wallets,
  selectedWalletIds,
  onChangeSelectedWalletIds,
  lang,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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

  const isSelected = (id: string) => {
    if (isAllSelected) return true;
    return selectedWalletIds.includes(id);
  };

  const handleToggleWallet = (id: string) => {
    if (isAllSelected) {
      // If currently all selected, checking one means selecting ONLY that one, or unchecking that one
      onChangeSelectedWalletIds([id]);
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
    onChangeSelectedWalletIds(allWalletIds);
  };

  const handleSelectPersonalOnly = () => {
    const personalIds = wallets
      .filter((w) => !w.isSharedFromOther && (!w.sharedWith || w.sharedWith.length === 0))
      .map((w) => w.id);
    onChangeSelectedWalletIds(personalIds.length > 0 ? personalIds : allWalletIds);
  };

  const handleSelectSharedOnly = () => {
    const sharedIds = wallets
      .filter((w) => w.isSharedFromOther || (w.sharedWith && w.sharedWith.length > 0))
      .map((w) => w.id);
    onChangeSelectedWalletIds(sharedIds.length > 0 ? sharedIds : allWalletIds);
  };

  const handleSelectIncludedOnly = () => {
    const includedIds = wallets.filter((w) => w.includeInTotals !== false).map((w) => w.id);
    onChangeSelectedWalletIds(includedIds.length > 0 ? includedIds : allWalletIds);
  };

  // Label for trigger button
  const getTriggerLabel = () => {
    if (isAllSelected) {
      return lang === 'my'
        ? `🌟 Wallet အားလုံးပေါင်း (${wallets.length} ခု)`
        : `🌟 All Wallets (${wallets.length})`;
    }

    const selectedWallets = wallets.filter((w) => selectedWalletIds.includes(w.id));
    if (selectedWallets.length === 1) {
      const w = selectedWallets[0];
      const name = lang === 'my' ? w.name : w.nameEn;
      return `${w.isSharedFromOther || (w.sharedWith && w.sharedWith.length > 0) ? '🤝' : '💳'} ${name}`;
    }

    if (selectedWallets.length > 1) {
      const names = selectedWallets
        .slice(0, 2)
        .map((w) => (lang === 'my' ? w.name : w.nameEn))
        .join(', ');
      const remaining = selectedWallets.length - 2;
      return lang === 'my'
        ? `💳 ${names}${remaining > 0 ? ` +${remaining}` : ''} (${selectedWallets.length} ခု ရွေးထားသည်)`
        : `💳 ${names}${remaining > 0 ? ` +${remaining}` : ''} (${selectedWallets.length} selected)`;
    }

    return lang === 'my' ? 'Wallet ရွေးချယ်ရန်' : 'Select Wallets';
  };

  const filteredWallets = wallets.filter((w) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = (w.name || '').toLowerCase();
    const nameEn = (w.nameEn || '').toLowerCase();
    return name.includes(q) || nameEn.includes(q);
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
            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
              <WalletIcon className="w-4 h-4 text-emerald-600" />
              <span>{lang === 'my' ? 'Wallet များ စိတ်ကြိုက် တွဲဖက် ရွေးရန်' : 'Multi-Wallet Selector'}</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Preset Quick Actions */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <button
              type="button"
              onClick={handleSelectAll}
              className={`px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer ${
                isAllSelected
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              🌟 {lang === 'my' ? 'အားလုံးပေါင်း' : 'Select All'}
            </button>
            <button
              type="button"
              onClick={handleSelectPersonalOnly}
              className="px-2.5 py-1 rounded-lg font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all cursor-pointer"
            >
              👤 {lang === 'my' ? 'ကိုယ်ပိုင်သာ' : 'Personal'}
            </button>
            <button
              type="button"
              onClick={handleSelectSharedOnly}
              className="px-2.5 py-1 rounded-lg font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all cursor-pointer"
            >
              🤝 {lang === 'my' ? 'Shared သာ' : 'Shared'}
            </button>
          </div>

          {/* Search box if > 3 wallets */}
          {wallets.length > 3 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={lang === 'my' ? 'Wallet အမည်ဖြင့် ရှာရန်...' : 'Search wallet...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          )}

          {/* Wallet List with Checkboxes */}
          <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {filteredWallets.map((w) => {
              const checked = isSelected(w.id);
              const isShared = w.isSharedFromOther || (w.sharedWith && w.sharedWith.length > 0);
              const formattedBal = formatCurrency(w.balance, w.currency);

              return (
                <div
                  key={w.id}
                  onClick={() => handleToggleWallet(w.id)}
                  className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-all border ${
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
                    <span className="truncate">
                      {isShared ? '🤝 ' : '💳 '}
                      {lang === 'my' ? w.name : w.nameEn}
                    </span>
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
            <span className="text-[11px] font-medium text-slate-500">
              {isAllSelected
                ? lang === 'my'
                  ? 'အကောင့်အားလုံး စုပေါင်းပြထားသည်'
                  : 'All wallets selected'
                : lang === 'my'
                ? `${selectedWalletIds.length} ခု ရွေးချယ်ထားပါသည်`
                : `${selectedWalletIds.length} wallets selected`}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              {lang === 'my' ? 'ပြီးပြီ' : 'Apply'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
