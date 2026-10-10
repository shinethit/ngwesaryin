import React, { useState, useMemo, useEffect } from 'react';
import { X, Search, Plus, Lock, Check, Settings, ChevronDown } from 'lucide-react';
import { Category, PlanType, SubCategory, TransactionType } from '../types';
import { CategoryIcon } from './CategoryIcon';

interface CategoryPickerModalProps {
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
}

export const CategoryPickerModal: React.FC<CategoryPickerModalProps> = ({
  isOpen,
  onClose,
  categories,
  selectedCategoryId,
  selectedSubCategoryId,
  onSelect,
  currentType = 'expense',
  lang,
  plan,
  onOpenUpgrade,
  onAddSubCategory,
  onManageCategories,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTypeTab, setActiveTypeTab] = useState<TransactionType>(currentType);
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);
  const [addingSubForCatId, setAddingSubForCatId] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState('');

  useEffect(() => {
    if (isOpen) {
      setActiveTypeTab(currentType);
      setSearchQuery('');
      setExpandedCatId(null);
      setAddingSubForCatId(null);
      setNewSubName('');
    }
  }, [isOpen, currentType]);

  const isSearching = searchQuery.trim().length > 0;

  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return categories.filter((cat) => {
      const isTransferCat =
        cat.id === 'cat_transfer' ||
        (cat.name && cat.name.includes('ငွေလွှဲ')) ||
        (cat.nameEn && cat.nameEn.toLowerCase().includes('transfer'));
      const typeMatches = cat.type === activeTypeTab || isTransferCat;
      if (!q) return typeMatches;
      const nameMatch =
        (cat.name && cat.name.toLowerCase().includes(q)) ||
        (cat.nameEn && cat.nameEn.toLowerCase().includes(q));
      const subMatch = cat.subCategories?.some(
        (sub) =>
          (sub.name && sub.name.toLowerCase().includes(q)) ||
          (sub.nameEn && sub.nameEn.toLowerCase().includes(q))
      );
      return typeMatches && (nameMatch || subMatch);
    });
  }, [categories, activeTypeTab, searchQuery]);

  if (!isOpen) return null;

  const isLocked = (cat: Category) => cat.isCustom && plan !== 'premium';

  const handleRowTap = (cat: Category) => {
    if (isLocked(cat)) { onOpenUpgrade(); return; }
    const hasSubs = (cat.subCategories?.length || 0) > 0;
    if (hasSubs && !isSearching) {
      setExpandedCatId((prev) => (prev === cat.id ? null : cat.id));
    } else {
      onSelect(cat.id, '');
      onClose();
    }
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
        name: newSubName.trim(),
        nameEn: newSubName.trim(),
        isCustom: true,
      });
      setNewSubName('');
      setAddingSubForCatId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/65 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h3 className="font-bold text-slate-900 text-base">
            {lang === 'my' ? 'ကဏ္ဍ ရွေးချယ်ရန်' : 'Select Category'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-3 py-2.5 border-b border-slate-100 shrink-0 space-y-2">
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            {(['expense', 'income'] as const).map((t) => {
              const isActive = activeTypeTab === t;
              const btnCls =
                'flex-1 py-2 rounded-lg text-xs font-bold transition-colors ' +
                (isActive
                  ? t === 'expense'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900');
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setActiveTypeTab(t); setExpandedCatId(null); }}
                  className={btnCls}
                >
                  {t === 'expense'
                    ? lang === 'my' ? '💸 ထွက်ငွေ' : '💸 Expense'
                    : lang === 'my' ? '💰 ဝင်ငွေ' : '💰 Income'}
                </button>
              );
            })}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={lang === 'my' ? 'ရှာဖွေရန်...' : 'Search categories...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full hover:bg-slate-200 flex items-center justify-center"
              >
                <X className="w-3 h-3 text-slate-500" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          {filteredCategories.length === 0 ? (
            <div className="py-12 text-center text-slate-400 px-4">
              <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">
                {lang === 'my' ? 'ရှာဖွေမှု ရလဒ် မတွေ့ပါ' : 'No matching categories'}
              </p>
              {isSearching && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  {lang === 'my' ? 'ရှာဖွေမှု ရှင်းမည်' : 'Clear search'}
                </button>
              )}
            </div>
          ) : (
            <div className="py-1">
              {filteredCategories.map((cat) => {
                const hasSubs = (cat.subCategories?.length || 0) > 0;
                const isExpanded = isSearching || expandedCatId === cat.id;
                const isSelected = selectedCategoryId === cat.id && !selectedSubCategoryId;
                const locked = isLocked(cat);
                const name = lang === 'my' ? cat.name : cat.nameEn;
                const rowCls =
                  'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors active:bg-slate-100 hover:bg-slate-50 ' +
                  (isSelected ? 'border-l-4 border-emerald-600 pl-3 bg-emerald-50/50' : '');
                const nameCls =
                  'text-sm font-bold truncate ' +
                  (isSelected ? 'text-emerald-800' : 'text-slate-900');
                const chevronCls =
                  'w-4 h-4 text-slate-400 transition-transform shrink-0 ' +
                  (isExpanded ? 'rotate-180' : '');
                const mainOnlyCls =
                  'w-full px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors ' +
                  (isSelected
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-emerald-50 hover:border-emerald-300');

                return (
                  <div key={cat.id} className="border-b border-slate-100 last:border-b-0">
                    <button type="button" onClick={() => handleRowTap(cat)} className={rowCls}>
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
                        style={{ backgroundColor: cat.color || '#10B981' }}
                      >
                        <CategoryIcon name={cat.icon} className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={nameCls}>{name}</span>
                          {locked && <Lock className="w-3 h-3 text-amber-600 shrink-0" />}
                          {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                        </div>
                        {hasSubs && (
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {cat.subCategories!.length} {lang === 'my' ? 'ကဏ္ဍခွဲ' : 'sub-categories'}
                          </div>
                        )}
                      </div>
                      {hasSubs && !isSearching && <ChevronDown className={chevronCls} />}
                    </button>

                    {isExpanded && hasSubs && (
                      <div className="px-4 pb-3 pt-1 space-y-1.5 bg-slate-50/60">
                        <button type="button" onClick={() => handleSelectMainOnly(cat)} className={mainOnlyCls}>
                          ★ {lang === 'my' ? 'အဓိက ကဏ္ဍသာ (Sub မရွေး)' : 'Main category only'}
                        </button>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                          {cat.subCategories!.map((sub) => {
                            const isThisSubSelected =
                              selectedCategoryId === cat.id && selectedSubCategoryId === sub.id;
                            const subName = lang === 'my' ? sub.name : sub.nameEn;
                            const chipCls =
                              'px-2.5 py-2 rounded-xl text-xs font-semibold text-left transition-colors truncate ' +
                              (isThisSubSelected
                                ? 'bg-emerald-600 text-white'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-emerald-50 hover:border-emerald-300');
                            return (
                              <button
                                key={sub.id}
                                type="button"
                                onClick={() => handleSelectSub(cat, sub)}
                                className={chipCls}
                                title={subName}
                              >
                                {isThisSubSelected ? '✓ ' : ''}{subName}
                              </button>
                            );
                          })}
                        </div>
                        {plan === 'premium' && onAddSubCategory && (
                          addingSubForCatId === cat.id ? (
                            <div className="flex gap-1.5 pt-1">
                              <input
                                type="text"
                                autoFocus
                                value={newSubName}
                                onChange={(e) => setNewSubName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateSub(cat.id); } }}
                                placeholder={lang === 'my' ? 'ကဏ္ဍခွဲ အမည်...' : 'New sub name...'}
                                className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-emerald-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                              <button
                                type="button"
                                onClick={() => handleCreateSub(cat.id)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                              >
                                {lang === 'my' ? 'ထည့်' : 'Add'}
                              </button>
                              <button
                                type="button"
                                onClick={() => { setAddingSubForCatId(null); setNewSubName(''); }}
                                className="px-2 py-1.5 text-slate-500 hover:text-slate-700"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setAddingSubForCatId(cat.id)}
                              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 py-1 flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              {lang === 'my' ? 'ကဏ္ဍခွဲ အသစ်ထည့်ရန်' : 'Add sub-category'}
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {onManageCategories && (
          <div className="border-t border-slate-100 px-4 py-2.5 shrink-0">
            <button
              type="button"
              onClick={() => { onClose(); onManageCategories(); }}
              className="w-full py-2 text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1.5 hover:bg-slate-50 rounded-xl transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              {lang === 'my' ? 'ကဏ္ဍ စီမံခန့်ခွဲရန်' : 'Manage Categories'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
