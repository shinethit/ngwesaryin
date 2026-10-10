import React, { useState, useMemo, useEffect } from 'react';
import { X, Search, Plus, Lock, Check, Settings, ChevronRight, ChevronDown } from 'lucide-react';
import { Category, PlanType, SubCategory, Transaction, TransactionType } from '../types';
import { CategoryIcon } from './CategoryIcon';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  selectedCategoryId: string;
  selectedSubCategoryId?: string;
  onSelect: (categoryId: string, subCategoryId?: string) => void;
  currentType?: TransactionType;
  lang: 'my' | 'en';
  plan: PlanType;
  onOpenUpgrade: () => void;
  onAddSubCategory?: (categoryId: string, subCategory: Omit<SubCategory, 'id'>) => void;
  onManageCategories?: () => void;
  allTransactions?: Transaction[];
}

// [v7.0.4] Canonical transfer sub-categories — self-healing fallback.
const FALLBACK_TRANSFER_SUBS: { id: string; name: string; nameEn: string }[] = [
  { id: 'sub_tf_out', name: 'ငွေလွှဲထွက်', nameEn: 'Transfer Out' },
  { id: 'sub_tf_in',  name: 'ငွေလွှဲဝင်',  nameEn: 'Transfer In' },
];

export const CategoryPickerModal: React.FC<Props> = ({
  isOpen, onClose, categories, selectedCategoryId, selectedSubCategoryId,
  onSelect, currentType = 'expense', lang, plan, onOpenUpgrade,
  onAddSubCategory, onManageCategories, allTransactions,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTypeTab, setActiveTypeTab] = useState<TransactionType>(currentType);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [addingSubForCatId, setAddingSubForCatId] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState('');

  useEffect(() => {
    if (isOpen) {
      setActiveTypeTab(currentType);
      setSearchQuery('');
      setExpandedIds(new Set());
      setAddingSubForCatId(null);
      setNewSubName('');
    }
  }, [isOpen, currentType]);

  const isSearching = searchQuery.trim().length > 0;

  // Frequency sort — most-used category first
  const sortedCategories = useMemo(() => {
    const countMap = new Map<string, number>();
    if (allTransactions && allTransactions.length > 0) {
      allTransactions.forEach((t) => {
        if (t.category) countMap.set(t.category, (countMap.get(t.category) || 0) + 1);
      });
    }
    return [...categories].sort((a, b) => {
      const cA = countMap.get(a.id) || 0;
      const cB = countMap.get(b.id) || 0;
      if (cB !== cA) return cB - cA;
      return (lang === 'my' ? a.name : a.nameEn).localeCompare(
        lang === 'my' ? b.name : b.nameEn
      );
    });
  }, [categories, allTransactions, lang]);

  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sortedCategories.filter((cat) => {
      const isTransferCat = cat.id === 'cat_transfer' ||
        (cat.name && cat.name.includes('ငွေလွဲ')) ||
        (cat.nameEn && cat.nameEn.toLowerCase().includes('transfer'));
      const typeMatches = cat.type === activeTypeTab || isTransferCat;
      if (!q) return typeMatches;
      const nameMatch = (cat.name && cat.name.toLowerCase().includes(q)) ||
        (cat.nameEn && cat.nameEn.toLowerCase().includes(q));
      const subMatch = cat.subCategories?.some((sub) =>
        (sub.name && sub.name.toLowerCase().includes(q)) ||
        (sub.nameEn && sub.nameEn.toLowerCase().includes(q)));
      return typeMatches && (nameMatch || subMatch);
    });
  }, [sortedCategories, activeTypeTab, searchQuery]);

  if (!isOpen) return null;

  const isLocked = (cat: Category) => cat.isCustom && plan !== 'premium';

  const toggleExpand = (catId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId); else next.add(catId);
      return next;
    });
  };

  const handleSelectMainOnly = (cat: Category) => {
    if (isLocked(cat)) { onOpenUpgrade(); return; }
    onSelect(cat.id, '');
    onClose();
  };

  const handleSelectSub = (cat: Category, sub: SubCategory) => {
    if (isLocked(cat)) { onOpenUpgrade(); return; }
    onSelect(cat.id, sub.id);
    onClose();
  };

  const handleCreateSub = (categoryId: string) => {
    if (!newSubName.trim()) return;
    if (plan !== 'premium') { onOpenUpgrade(); return; }
    if (onAddSubCategory) {
      onAddSubCategory(categoryId, {
        name: newSubName.trim(), nameEn: newSubName.trim(), isCustom: true,
      });
      setNewSubName(''); setAddingSubForCatId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>

        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h3 className="font-bold text-slate-900 text-base">
            {lang === 'my' ? 'ကဏ္ဍ ရွေးချယ်ရန်' : 'Select category'}
          </h3>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-3 pt-3 pb-2 shrink-0">
          <div className="flex gap-1 bg-slate-100 p-1 rounded-full">
            {(['expense', 'income'] as const).map((t) => {
              const isActive = activeTypeTab === t;
              return (
                <button key={t} type="button"
                  onClick={() => { setActiveTypeTab(t); setExpandedIds(new Set()); }}
                  className={'flex-1 py-2 rounded-full text-xs font-bold transition-colors ' +
                    (isActive ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}>
                  {t === 'expense'
                    ? (lang === 'my' ? 'ထွက်ငွေ' : 'Expense')
                    : (lang === 'my' ? 'ဝင်ငွေ' : 'Income')}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-2 space-y-2">
          {onManageCategories && (
            <button type="button"
              onClick={() => { onClose(); onManageCategories(); }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border-2 border-dashed border-emerald-300 text-emerald-700 font-bold text-sm transition-colors">
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              {lang === 'my' ? 'ကဏ္ဍအသစ် ထည်မည်' : 'New category'}
            </button>
          )}

          {filteredCategories.length === 0 && (
            <div className="py-12 text-center text-slate-400">
              <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">
                {lang === 'my' ? 'ရှာဖွေမှု ရလဒ် မတွေ့ပါ' : 'No matching categories'}
              </p>
            </div>
          )}

          {filteredCategories.map((cat) => {
            const hasSubs = (cat.subCategories?.length || 0) > 0;
            const isExpanded = isSearching || expandedIds.has(cat.id);
            const isCatSelected = selectedCategoryId === cat.id && !selectedSubCategoryId;
            const locked = isLocked(cat);
            const catName = lang === 'my' ? cat.name : cat.nameEn;

            return (
              <div key={cat.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <button type="button"
                  onClick={() => {
                    if (locked) { onOpenUpgrade(); return; }
                    if (hasSubs) toggleExpand(cat.id);
                    else handleSelectMainOnly(cat);
                  }}
                  className={'w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-slate-50 ' +
                    (isCatSelected ? 'bg-emerald-50/60' : 'hover:bg-slate-50')}>

                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
                    style={{ backgroundColor: cat.color || '#10B981' }}>
                    <CategoryIcon name={cat.icon} className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className={'text-sm font-bold truncate ' + (isCatSelected ? 'text-emerald-800' : 'text-slate-900')}>
                      {catName}
                    </div>
                    {hasSubs && !isExpanded && (
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {cat.subCategories!.length} {lang === 'my' ? 'ကဏ္ဍခွဲ' : 'items'}
                      </div>
                    )}
                  </div>

                  {locked && <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                  {isCatSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                  {hasSubs && !isSearching && (
                    <ChevronRight className={'w-4 h-4 text-slate-400 shrink-0 transition-transform ' + (isExpanded ? 'rotate-90' : '')} />
                  )}
                </button>

                {isExpanded && hasSubs && (
                  <div className="relative pl-4 pr-3 pb-3 space-y-1">
                    <div className="absolute left-[26px] top-0 bottom-4 w-px bg-slate-200" />

                    {((cat.id === 'cat_transfer'
                      ? FALLBACK_TRANSFER_SUBS.map((s) => ({ ...s, isCustom: false } as any))
                      : (cat.subCategories || [])
                    ) as typeof cat.subCategories || []).filter((sub) => {
                      if (cat.id !== 'cat_transfer') return true;
                      // [v7.0.2] ID-only — Burmese Unicode combining marks make name.includes unreliable
                      if (activeTypeTab === 'expense') return sub.id === 'sub_tf_out';
                      return sub.id === 'sub_tf_in';
                    }).map((sub) => {
                      const isSubSelected = selectedCategoryId === cat.id && selectedSubCategoryId === sub.id;
                      const subName = lang === 'my' ? sub.name : sub.nameEn;

                      return (
                        <button key={sub.id} type="button"
                          onClick={() => handleSelectSub(cat, sub)}
                          className={'relative w-full flex items-center gap-3 pl-3 pr-3 py-2.5 rounded-xl text-left transition-colors ' +
                            (isSubSelected ? 'bg-emerald-100/70' : 'hover:bg-slate-50')}>

                          <div className="absolute left-[-14px] top-1/2 w-3 h-px bg-slate-200" />

                          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0"
                            style={{ backgroundColor: cat.color || '#94A3B8' }}>
                            <CategoryIcon name={cat.icon} className="w-3.5 h-3.5" />
                          </div>

                          <span className={'flex-1 text-xs font-semibold truncate ' +
                            (isSubSelected ? 'text-emerald-800' : 'text-slate-700')}>
                            {subName}
                          </span>

                          {isSubSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                        </button>
                      );
                    })}

                    {plan === 'premium' && onAddSubCategory && (
                      addingSubForCatId === cat.id ? (
                        <div className="relative flex gap-1.5 pt-1 pl-3">
                          <input type="text" autoFocus value={newSubName}
                            onChange={(e) => setNewSubName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateSub(cat.id); } }}
                            placeholder={lang === 'my' ? 'ကဏ္ဍခွဲ အမည်...' : 'New sub...'}
                            className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-emerald-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                          <button type="button" onClick={() => handleCreateSub(cat.id)}
                            className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold">
                            {lang === 'my' ? 'ထည်' : 'Add'}
                          </button>
                          <button type="button"
                            onClick={() => { setAddingSubForCatId(null); setNewSubName(''); }}
                            className="px-2 py-1.5 text-slate-500 text-xs">{'✕'}</button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setAddingSubForCatId(cat.id)}
                          className="relative flex items-center gap-1.5 pl-3 py-1.5 text-[11px] font-bold text-emerald-700 hover:text-emerald-900">
                          <Plus className="w-3 h-3" />
                          {lang === 'my' ? 'ကဏ္ဍခွဲ ထည်' : 'Add sub'}
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <div className="h-2" />
        </div>

        <div className="px-3 py-3 border-t border-slate-100 shrink-0 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text"
              placeholder={lang === 'my' ? 'ရှာဖွေရန်...' : 'Search'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 text-sm bg-slate-100 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white" />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full hover:bg-slate-200 flex items-center justify-center">
                <X className="w-3 h-3 text-slate-500" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
