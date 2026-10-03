import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  Tag,
  Plus,
  Lock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Check,
  Settings,
  Layers,
  ArrowRight,
} from 'lucide-react';
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
  const [expandedCatId, setExpandedCatId] = useState<string | null>(selectedCategoryId || null);
  const [addingSubForCatId, setAddingSubForCatId] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState('');

  // Sync active type tab when currentType prop changes upon opening
  React.useEffect(() => {
    if (isOpen) {
      setActiveTypeTab(currentType);
      setExpandedCatId(selectedCategoryId || null);
      setSearchQuery('');
      setAddingSubForCatId(null);
      setNewSubName('');
    }
  }, [isOpen, currentType, selectedCategoryId]);

  // Filter categories by type & search query
  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return categories.filter((cat) => {
      // Type match (transfer category is accessible under both Income and Expense)
      const isTransferCat =
        cat.id === 'cat_transfer' ||
        (cat.name && cat.name.includes('ငွေလွှဲ')) ||
        (cat.nameEn && cat.nameEn.toLowerCase().includes('transfer'));
      const typeMatches = cat.type === activeTypeTab || isTransferCat;
      if (!typeMatches && query.length === 0) return false;

      if (!query) return typeMatches;

      const nameMatch = (cat.name && cat.name.toLowerCase().includes(query)) ||
        (cat.nameEn && cat.nameEn.toLowerCase().includes(query));

      const subMatch = cat.subCategories?.some(
        (sub) =>
          (sub.name && sub.name.toLowerCase().includes(query)) ||
          (sub.nameEn && sub.nameEn.toLowerCase().includes(query))
      );

      return (typeMatches || query.length > 0) && (nameMatch || subMatch);
    });
  }, [categories, activeTypeTab, searchQuery]);

  if (!isOpen) return null;

  const handleSelectCategoryOnly = (cat: Category) => {
    if (cat.isCustom && plan !== 'premium') {
      onOpenUpgrade();
      return;
    }
    onSelect(cat.id, '');
    onClose();
  };

  const handleSelectSubCategory = (cat: Category, sub: SubCategory) => {
    if (cat.isCustom && plan !== 'premium') {
      onOpenUpgrade();
      return;
    }
    onSelect(cat.id, sub.id);
    onClose();
  };

  const handleCreateSub = (categoryId: string) => {
    if (!newSubName.trim()) return;
    if (plan !== 'premium') {
      onOpenUpgrade();
      return;
    }
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
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 touch-none overscroll-none animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[88vh] flex flex-col animate-scaleUp pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/25 flex items-center justify-center text-white shadow-inner">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg tracking-tight">
                {lang === 'my' ? 'ကဏ္ဍ ရွေးချယ်ရန်' : 'Select Category'}
              </h3>
              <p className="text-xs text-emerald-100 font-medium">
                {lang === 'my'
                  ? 'အဓိကကဏ္ဍ သို့မဟုတ် ကဏ္ဍခွဲကို တစ်ချက်နှိပ်၍ ရွေးပါ'
                  : 'Click on a category or sub-category to choose'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Type Switcher & Search Bar */}
        <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 space-y-2.5 shrink-0">
          {/* Income vs Expense Tabs */}
          <div className="flex p-1 bg-slate-200/80 rounded-2xl text-xs font-bold gap-1">
            <button
              type="button"
              onClick={() => setActiveTypeTab('expense')}
              className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTypeTab === 'expense'
                  ? 'bg-rose-600 text-white shadow-xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <span>{lang === 'my' ? '💸 အသုံးစရိတ် (Expense)' : '💸 Expense'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTypeTab('income')}
              className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTypeTab === 'income'
                  ? 'bg-emerald-600 text-white shadow-xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <span>{lang === 'my' ? '💰 ဝင်ငွေ (Income)' : '💰 Income'}</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={
                lang === 'my'
                  ? 'ကဏ္ဍ / ကဏ္ဍခွဲ အမည် ရှာဖွေပါ...'
                  : 'Search category or sub-category...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-300 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Categories List Body */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-2.5 min-h-0 overscroll-contain touch-pan-y scroll-smooth [webkit-overflow-scrolling:touch]">
          {filteredCategories.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Search className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700">
                  {lang === 'my' ? 'ကိုက်ညီသော ကဏ္ဍ ရှာမတွေ့ပါ' : 'No matching categories found'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {lang === 'my'
                    ? 'အခြား စာလုံးဖြင့် ရှာကြည့်ပါ သို့မဟုတ် ကဏ္ဍအသစ် ဖန်တီးပါ'
                    : 'Try another keyword or create a custom category'}
                </p>
              </div>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  {lang === 'my' ? 'ရှာဖွေမှု အားလုံး ရှင်းမည်' : 'Clear search'}
                </button>
              )}
            </div>
          ) : (
            filteredCategories.map((cat) => {
              const isSelected = selectedCategoryId === cat.id && !selectedSubCategoryId;
              const hasSubSelected = selectedCategoryId === cat.id && !!selectedSubCategoryId;
              const isExpanded = expandedCatId === cat.id || searchQuery.trim().length > 0;
              const isLocked = cat.isCustom && plan !== 'premium';
              const subCount = cat.subCategories?.length || 0;

              return (
                <div
                  key={cat.id}
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    isSelected
                      ? 'bg-emerald-50/70 border-emerald-400 shadow-sm ring-1 ring-emerald-300'
                      : hasSubSelected
                      ? 'bg-teal-50/50 border-teal-300'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  {/* Category Header Row */}
                  <div className="p-3 flex items-center justify-between gap-2.5">
                    {/* Main Category Click area */}
                    <button
                      type="button"
                      onClick={() => handleSelectCategoryOnly(cat)}
                      className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer group"
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs transition-transform group-hover:scale-105"
                        style={{ backgroundColor: cat.color || '#10B981' }}
                      >
                        <CategoryIcon name={cat.icon} className="w-5 h-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-emerald-700 truncate">
                            {lang === 'my' ? cat.name : cat.nameEn}
                          </span>
                          {isLocked && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                              <Lock className="w-2.5 h-2.5 stroke-[2.5]" />
                              <span>VIP</span>
                            </span>
                          )}
                          {isSelected && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black">
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>{lang === 'my' ? 'ရွေးထားသည်' : 'Selected'}</span>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-medium">
                          <span>{cat.nameEn}</span>
                          {subCount > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-slate-600 font-semibold">
                                {subCount} {lang === 'my' ? 'ကဏ္ဍခွဲ' : 'subs'}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Expand/Collapse Toggle & Direct Select Action */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {subCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setExpandedCatId(isExpanded ? null : cat.id)}
                          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                          title={isExpanded ? 'Collapse' : 'Expand Sub-categories'}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleSelectCategoryOnly(cat)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-700'
                        }`}
                      >
                        {isSelected ? (
                          <span className="flex items-center gap-1">
                            <Check className="w-3 h-3 stroke-[2.5]" />
                            <span>{lang === 'my' ? 'ရွေးပြီး' : 'Chosen'}</span>
                          </span>
                        ) : (
                          <span>{lang === 'my' ? 'ရွေးမည်' : 'Select'}</span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Sub-Categories Drawer (Expanded) */}
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-1 border-t border-slate-100 bg-slate-50/70 space-y-2 animate-fadeIn">
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                          <Tag className="w-3 h-3 text-slate-400" />
                          <span>{lang === 'my' ? 'ကဏ္ဍခွဲများ (Sub-categories):' : 'Sub-categories:'}</span>
                        </span>

                        {plan === 'premium' ? (
                          <button
                            type="button"
                            onClick={() =>
                              setAddingSubForCatId(addingSubForCatId === cat.id ? null : cat.id)
                            }
                            className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5 cursor-pointer"
                          >
                            <Plus className="w-3 h-3 stroke-[2.5]" />
                            <span>{lang === 'my' ? '+ ကဏ္ဍခွဲသစ်' : '+ New Sub'}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={onOpenUpgrade}
                            className="text-[10px] font-bold text-amber-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                          >
                            <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                            <span>{lang === 'my' ? '👑 VIP ကဏ္ဍခွဲ' : '👑 VIP Sub'}</span>
                          </button>
                        )}
                      </div>

                      {/* Quick Add Subcategory Form */}
                      {addingSubForCatId === cat.id && plan === 'premium' && (
                        <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-1.5 animate-fadeIn">
                          <input
                            type="text"
                            placeholder={lang === 'my' ? 'ကဏ္ဍခွဲအမည် ရိုက်ထည့်ပါ...' : 'Sub-category name...'}
                            value={newSubName}
                            onChange={(e) => setNewSubName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleCreateSub(cat.id);
                              }
                            }}
                            autoFocus
                            className="flex-1 px-2.5 py-1 text-xs bg-white border border-emerald-300 rounded-lg focus:outline-none font-medium"
                          />
                          <button
                            type="button"
                            onClick={() => handleCreateSub(cat.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shrink-0 cursor-pointer shadow-2xs"
                          >
                            {lang === 'my' ? 'ထည့်မည်' : 'Add'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAddingSubForCatId(null);
                              setNewSubName('');
                            }}
                            className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Sub-Category Chips */}
                      {cat.subCategories && cat.subCategories.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                          {cat.subCategories.map((sub) => {
                            const isThisSubSelected =
                              selectedCategoryId === cat.id && selectedSubCategoryId === sub.id;

                            return (
                              <button
                                key={sub.id}
                                type="button"
                                onClick={() => handleSelectSubCategory(cat, sub)}
                                className={`p-2 rounded-xl text-left text-xs font-semibold transition-all flex items-center justify-between gap-1.5 cursor-pointer border ${
                                  isThisSubSelected
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs font-bold'
                                    : 'bg-white hover:bg-emerald-50 text-slate-800 border-slate-200/80 hover:border-emerald-300'
                                }`}
                              >
                                <span className="truncate">
                                  {lang === 'my' ? sub.name : sub.nameEn}
                                </span>
                                {isThisSubSelected ? (
                                  <Check className="w-3.5 h-3.5 stroke-[3] shrink-0" />
                                ) : (
                                  <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-emerald-600 shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic py-1">
                          {lang === 'my' ? 'ကဏ္ဍခွဲ မရှိသေးပါ' : 'No sub-categories added yet.'}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
          {onManageCategories ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onManageCategories();
              }}
              className="text-xs font-bold text-slate-700 hover:text-emerald-700 flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              <span>{lang === 'my' ? 'ကဏ္ဍများ အားလုံး စီမံမည် ›' : 'Manage All Categories ›'}</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
          >
            {lang === 'my' ? 'ပြီးပြီ / ပိတ်မည်' : 'Done / Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
