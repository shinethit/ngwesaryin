import React, { useState } from 'react';
import { Crown, Lock, Plus, Sparkles, Edit2, Trash2, Tag, Layers, ArrowUpRight, ArrowDownLeft, Search, Check, X } from 'lucide-react';
import { Category, PlanType, SubCategory, TransactionType } from '../types';
import { CategoryIcon, AVAILABLE_CATEGORY_ICONS } from './CategoryIcon';

interface CategoriesViewProps {
  categories: Category[];
  plan: PlanType;
  lang: 'my' | 'en';
  onOpenUpgradeModal: () => void;
  onAddCategory: (category: Omit<Category, 'id'>) => void;
  onUpdateCategory: (category: Category) => void;
  onDeleteCategory: (categoryId: string) => void;
  onAddSubCategory: (categoryId: string, subCategory: Omit<SubCategory, 'id'>) => void;
  onDeleteSubCategory: (categoryId: string, subCategoryId: string) => void;
  onUpdateSubCategory: (categoryId: string, subCategory: SubCategory) => void;
  onMergeCategories?: () => void;
}

const COLOR_PALETTE = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#059669', // Green
  '#0D9488', // Teal
  '#0284C7', // Sky
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Purple
  '#A855F7', // Violet
  '#EC4899', // Pink
  '#F43F5E', // Rose
  '#64748B', // Slate
];

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  categories,
  plan,
  lang,
  onOpenUpgradeModal,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onAddSubCategory,
  onDeleteSubCategory,
  onUpdateSubCategory,
  onMergeCategories,
}) => {
  const isPremium = plan === 'premium';

  // Filters
  const [activeTypeTab, setActiveTypeTab] = useState<'all' | 'expense' | 'income'>('expense');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Category Modal State
  const [isAddCatModalOpen, setIsAddCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Dedicated Subcategory Edit Modal State
  const [editingSubModal, setEditingSubModal] = useState<{
    categoryId: string;
    categoryName: string;
    categoryIcon: string;
    categoryColor: string;
    subCategory: SubCategory;
    name: string;
    nameEn: string;
  } | null>(null);

  // Form states for Category (Add / Edit)
  const [catType, setCatType] = useState<TransactionType>('expense');
  const [catNameMy, setCatNameMy] = useState('');
  const [catNameEn, setCatNameEn] = useState('');
  const [catIcon, setCatIcon] = useState('Tag');
  const [catColor, setCatColor] = useState('#EF4444');
  const [initialSubCats, setInitialSubCats] = useState<string[]>([]);
  const [newSubInput, setNewSubInput] = useState('');

  // Inline subcategory add state: categoryId -> string
  const [inlineSubInputs, setInlineSubInputs] = useState<Record<string, string>>({});
  // Editing subcategory inline state
  const [editingSub, setEditingSub] = useState<{
    categoryId: string;
    subCatId: string;
    name: string;
    nameEn: string;
  } | null>(null);

  // Filter categories
  const filteredCategories = categories.filter((c) => {
    if (activeTypeTab !== 'all' && c.type !== activeTypeTab) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCat = c.name.toLowerCase().includes(q) || c.nameEn.toLowerCase().includes(q);
      const matchSub = (c.subCategories || []).some(
        (s) => s.name.toLowerCase().includes(q) || s.nameEn.toLowerCase().includes(q)
      );
      return matchCat || matchSub;
    }
    return true;
  });

  const openAddCategory = () => {
    if (!isPremium) {
      onOpenUpgradeModal();
      return;
    }
    setEditingCategory(null);
    setCatType(activeTypeTab === 'income' ? 'income' : 'expense');
    setCatNameMy('');
    setCatNameEn('');
    setCatIcon('Tag');
    setCatColor(activeTypeTab === 'income' ? '#10B981' : '#EF4444');
    setInitialSubCats([]);
    setNewSubInput('');
    setIsAddCatModalOpen(true);
  };

  const openEditCategory = (cat: Category) => {
    if (!isPremium) {
      onOpenUpgradeModal();
      return;
    }
    setEditingCategory(cat);
    setCatType(cat.type);
    setCatNameMy(cat.name);
    setCatNameEn(cat.nameEn);
    setCatIcon(cat.icon);
    setCatColor(cat.color);
    setIsAddCatModalOpen(true);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catNameMy.trim()) return;

    if (editingCategory) {
      // Update existing
      onUpdateCategory({
        ...editingCategory,
        name: catNameMy.trim(),
        nameEn: catNameEn.trim() || catNameMy.trim(),
        icon: catIcon,
        color: catColor,
        type: catType,
      });
    } else {
      // Create new
      const subs: SubCategory[] = initialSubCats.map((name, i) => ({
        id: `sub_custom_${Date.now()}_${i}`,
        name,
        nameEn: name,
        isCustom: true,
      }));

      onAddCategory({
        name: catNameMy.trim(),
        nameEn: catNameEn.trim() || catNameMy.trim(),
        type: catType,
        icon: catIcon,
        color: catColor,
        isCustom: true,
        subCategories: subs,
      });
    }

    setIsAddCatModalOpen(false);
  };

  const openEditSubModal = (category: Category, sub: SubCategory) => {
    if (!isPremium) {
      onOpenUpgradeModal();
      return;
    }
    setEditingSubModal({
      categoryId: category.id,
      categoryName: lang === 'my' ? category.name : category.nameEn,
      categoryIcon: category.icon,
      categoryColor: category.color,
      subCategory: sub,
      name: sub.name,
      nameEn: sub.nameEn || '',
    });
  };

  const handleAddInlineSub = (categoryId: string) => {
    if (!isPremium) {
      onOpenUpgradeModal();
      return;
    }
    const val = inlineSubInputs[categoryId]?.trim();
    if (!val) return;

    onAddSubCategory(categoryId, {
      name: val,
      nameEn: val,
      isCustom: true,
    });

    setInlineSubInputs((prev) => ({ ...prev, [categoryId]: '' }));
  };

  const handleSaveSubEdit = () => {
    if (!isPremium) {
      onOpenUpgradeModal();
      return;
    }
    if (!editingSub || !editingSub.name.trim()) return;
    onUpdateSubCategory(editingSub.categoryId, {
      id: editingSub.subCatId,
      name: editingSub.name.trim(),
      nameEn: editingSub.nameEn.trim() || editingSub.name.trim(),
      isCustom: true,
    });
    setEditingSub(null);
  };

  const totalSubCategoriesCount = categories.reduce(
    (sum, c) => sum + (c.subCategories?.length || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
                <span>{lang === 'my' ? 'ကဏ္ဍများနှင့် ကဏ္ဍခွဲများ' : 'Categories & Sub-Categories'}</span>
                {isPremium ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-xs">
                    <Crown className="w-3 h-3 fill-white" />
                    Premium Unlocked
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                    <Lock className="w-3 h-3 text-slate-500" />
                    Free View Only
                  </span>
                )}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                {lang === 'my'
                  ? 'ဝင်ငွေ၊ ထွက်ငွေ အဓိကကဏ္ဍ (Category) နှင့် ကဏ္ဍခွဲ (Sub-Category) များကို စနစ်တကျ စီမံခန့်ခွဲပါ'
                  : 'Manage parent categories and granular sub-categories for income & expense tracking'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {onMergeCategories && (
            <button
              type="button"
              onClick={onMergeCategories}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-2xs transition-all active:scale-95 cursor-pointer"
              title={lang === 'my' ? 'ထပ်နေသော သို့မဟုတ် ပေါင်းစပ်နိုင်သော ကဏ္ဍများကို ရှင်းလင်းပေါင်းစပ်မည်' : 'Merge and clean duplicate/redundant categories'}
            >
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>{lang === 'my' ? 'ကဏ္ဍများ ပေါင်းစပ်ရှင်းလင်းရန်' : 'Merge Duplicates'}</span>
            </button>
          )}

          <button
            onClick={openAddCategory}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all active:scale-95 cursor-pointer ${
              isPremium
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                : 'bg-amber-50 border border-amber-300 text-amber-800 hover:bg-amber-100'
            }`}
          >
            {isPremium ? (
              <>
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>{lang === 'my' ? 'ကဏ္ဍအသစ် ထည့်မည်' : 'New Category'}</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 text-amber-600" />
                <span>{lang === 'my' ? 'ကဏ္ဍသစ် ထပ်တိုးရန် (Premium)' : 'Add Custom (Premium)'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Free Plan Lock Notice */}
      {!isPremium && (
        <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-200 p-4 sm:p-5 rounded-2xl shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
              <Crown className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-amber-950">
                {lang === 'my'
                  ? 'Custom ကဏ္ဍများနှင့် ပတ်သက်၍ အသိပေးချက် (Data Lossless Guarantee)'
                  : 'Custom Categories Notice (Lossless Data Guarantee)'}
              </h4>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed max-w-2xl">
                {lang === 'my'
                  ? 'Free Plan တွင် စနစ်မှ ပေးထားသော အခြေခံ ကဏ္ဍ ၁၆ ခုနှင့် ၎င်းတို့၏ ကဏ္ဍခွဲများကို အခမဲ့ သုံးစွဲနိုင်ပါသည်။ ယခင် Premium ဝယ်ယူစဉ်က ဖန်တီးခဲ့သော Custom ကဏ္ဍနှင့် ကဏ္ဍခွဲများကို စာရင်းဟောင်းများ မပျက်စေရန် အပြည့်အဝ ထိန်းသိမ်းထားရှိပါသည်။ Custom ကဏ္ဍများ စာရင်းသစ်တွင် ပြန်လည်အသုံးပြုရန် သို့မဟုတ် အသစ်ထပ်တိုး/ပြင်ဆင်ရန် Premium (၂,၀၀၀ Ks / လ) သို့ အဆင့်မြှင့်တင်နိုင်ပါသည်။'
                  : 'Free plan includes all 16 standard categories. Any custom categories created during a past Premium subscription are 100% preserved safely without data loss. Upgrade/Renew Premium (2,000 Ks/mo) to unlock, edit, and use them in new records.'}
              </p>
            </div>
          </div>
          <button
            onClick={onOpenUpgradeModal}
            className="shrink-0 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            {lang === 'my' ? 'Premium သို့ အဆင့်မြှင့်မည်' : 'Upgrade to Premium'}
          </button>
        </div>
      )}

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            {lang === 'my' ? 'ကဏ္ဍ စုစုပေါင်း' : 'Total Categories'}
          </span>
          <span className="text-lg sm:text-xl font-extrabold text-slate-900 mt-0.5 block">
            {categories.length} {lang === 'my' ? 'ခု' : 'items'}
          </span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            {lang === 'my' ? 'ကဏ္ဍခွဲ စုစုပေါင်း' : 'Total Sub-Categories'}
          </span>
          <span className="text-lg sm:text-xl font-extrabold text-emerald-700 mt-0.5 block">
            {totalSubCategoriesCount} {lang === 'my' ? 'ခု' : 'items'}
          </span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            {lang === 'my' ? 'ထွက်ငွေ ကဏ္ဍများ' : 'Expense Categories'}
          </span>
          <span className="text-lg sm:text-xl font-extrabold text-rose-600 mt-0.5 block">
            {categories.filter((c) => c.type === 'expense').length} {lang === 'my' ? 'ခု' : 'items'}
          </span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            {lang === 'my' ? 'ဝင်ငွေ ကဏ္ဍများ' : 'Income Categories'}
          </span>
          <span className="text-lg sm:text-xl font-extrabold text-emerald-600 mt-0.5 block">
            {categories.filter((c) => c.type === 'income').length} {lang === 'my' ? 'ခု' : 'items'}
          </span>
        </div>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Type Toggle Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTypeTab('expense')}
            className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTypeTab === 'expense'
                ? 'bg-white text-rose-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
            <span>{lang === 'my' ? 'ထွက်ငွေ ကဏ္ဍများ' : 'Expenses'}</span>
          </button>
          <button
            onClick={() => setActiveTypeTab('income')}
            className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTypeTab === 'income'
                ? 'bg-white text-emerald-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
            <span>{lang === 'my' ? 'ဝင်ငွေ ကဏ္ဍများ' : 'Income'}</span>
          </button>
          <button
            onClick={() => setActiveTypeTab('all')}
            className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTypeTab === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>{lang === 'my' ? 'အားလုံး' : 'All'}</span>
          </button>
        </div>

        {/* Search Field */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              lang === 'my'
                ? 'ကဏ္ဍ သို့မဟုတ် ကဏ္ဍခွဲ ရှာဖွေရန်...'
                : 'Search category or sub-category...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCategories.map((category) => {
          const isIncome = category.type === 'income';
          const subCats = category.subCategories || [];
          const inlineInputVal = inlineSubInputs[category.id] || '';

              return (
            <div
              key={category.id}
              className={`rounded-2xl border p-4 sm:p-5 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between ${
                category.isCustom && !isPremium
                  ? 'bg-amber-50/20 border-amber-200 ring-1 ring-amber-200/50'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div>
                {/* Category Header */}
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                      style={{ backgroundColor: category.color }}
                    >
                      <CategoryIcon name={category.icon} className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-sm sm:text-base text-slate-900">
                          {lang === 'my' ? category.name : category.nameEn}
                        </h3>
                        {category.isCustom && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            isPremium
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-amber-100/90 text-amber-900 border border-amber-300'
                          }`}>
                            {!isPremium && <Lock className="w-2.5 h-2.5 text-amber-700" />}
                            <span>{category.isCustom && !isPremium ? (lang === 'my' ? 'Custom (Lock ခတ်ထားသည်)' : 'Custom (Locked)') : 'Custom'}</span>
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                            isIncome
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {isIncome
                            ? (lang === 'my' ? 'ဝင်ငွေ' : 'Income')
                            : (lang === 'my' ? 'ထွက်ငွေ' : 'Expense')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {lang === 'my' ? category.nameEn : category.name}
                      </p>
                    </div>
                  </div>

                  {/* Actions for Category */}
                  <div className="flex items-center gap-1 shrink-0">
                    {isPremium ? (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditCategory(category)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title={lang === 'my' ? 'ကဏ္ဍ အချက်အလက် ပြင်ဆင်ရန်' : 'Edit Category'}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {category.isCustom && (
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                window.confirm(
                                  lang === 'my'
                                    ? `"${category.name}" ကဏ္ဍကို ဖျက်ရန် သေချာပါသလား?`
                                    : `Delete category "${category.nameEn}"?`
                                )
                              ) {
                                onDeleteCategory(category.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title={lang === 'my' ? 'ကဏ္ဍ ဖျက်ရန်' : 'Delete Category'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </>
                    ) : category.isCustom ? (
                      <button
                        type="button"
                        onClick={onOpenUpgradeModal}
                        className="text-[11px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                        title={lang === 'my' ? 'ပြန်လည်အသုံးပြုရန် Premium သို့ အဆင့်မြှင့်ပါ' : 'Renew Premium to unlock'}
                      >
                        <Lock className="w-3 h-3 text-amber-600" />
                        <span>{lang === 'my' ? 'Unlock ရန်' : 'Unlock'}</span>
                      </button>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md">
                        <Lock className="w-3 h-3 text-slate-400" />
                        Preset
                      </span>
                    )}
                  </div>
                </div>

                {/* Info Note for Locked Custom Categories */}
                {category.isCustom && !isPremium && (
                  <div className="mt-2.5 p-2 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[11px] text-amber-800 flex items-start gap-1.5 leading-relaxed">
                    <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      {lang === 'my'
                        ? 'ယခင် Premium ဖြင့် ဖန်တီးခဲ့သော Custom ကဏ္ဍဖြစ်ပြီး စာရင်းဟောင်းများ မပျက်စီးစေရန် သိမ်းဆည်းထားပါသည်။ ပြန်လည်ပြင်ဆင်/သုံးစွဲရန် Premium သို့ အဆင့်မြှင့်ပါ။'
                        : 'Custom category preserved from past Premium subscription. Renew Premium to edit or use in new entries.'}
                    </span>
                  </div>
                )}

                {/* Sub-categories Section */}
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-slate-400" />
                      <span>{lang === 'my' ? 'ကဏ္ဍခွဲများ (Sub-Categories)' : 'Sub-Categories'}</span>
                      <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-1.5 rounded-full">
                        {subCats.length}
                      </span>
                    </span>
                  </div>

                  {/* Sub-categories chips */}
                  {subCats.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-1">
                      {lang === 'my'
                        ? 'ကဏ္ဍခွဲ ထည့်သွင်းထားခြင်း မရှိသေးပါ'
                        : 'No sub-categories added yet.'}
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {subCats.map((sub) => {
                        const isEditingThisSub =
                          editingSub?.categoryId === category.id && editingSub?.subCatId === sub.id;

                        if (isEditingThisSub) {
                          return (
                            <div
                              key={sub.id}
                              className="flex items-center gap-1 bg-emerald-50 border border-emerald-300 p-1 rounded-lg text-xs"
                            >
                              <input
                                type="text"
                                value={editingSub.name}
                                onChange={(e) =>
                                  setEditingSub({ ...editingSub, name: e.target.value })
                                }
                                autoFocus
                                className="px-1.5 py-0.5 text-xs bg-white border border-emerald-300 rounded font-medium focus:outline-none w-28"
                              />
                              <button
                                type="button"
                                onClick={handleSaveSubEdit}
                                className="p-1 text-emerald-700 hover:bg-emerald-200 rounded"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingSub(null)}
                                className="p-1 text-slate-500 hover:bg-slate-200 rounded"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={sub.id}
                            className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-50 hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-300 text-slate-800 transition-all cursor-pointer"
                            onClick={() => openEditSubModal(category, sub)}
                            title={lang === 'my' ? 'ကဏ္ဍခွဲ ပြင်ဆင်ရန် နှိပ်ပါ' : 'Click to edit sub-category'}
                          >
                            <span>{lang === 'my' ? sub.name : (sub.nameEn || sub.name)}</span>

                            {/* Sub category actions: Edit & Delete */}
                            <div
                              className="flex items-center gap-0.5 ml-0.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => openEditSubModal(category, sub)}
                                className="p-0.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-100 rounded transition-colors"
                                title={lang === 'my' ? 'ပြင်ဆင်မည်' : 'Edit Sub-Category'}
                              >
                                <Edit2 className="w-2.5 h-2.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!isPremium) {
                                    onOpenUpgradeModal();
                                    return;
                                  }
                                  if (
                                    window.confirm(
                                      lang === 'my'
                                        ? `"${sub.name}" ကဏ္ဍခွဲကို ဖျက်ရန် သေချာပါသလား?`
                                        : `Delete sub-category "${sub.name}"?`
                                    )
                                  ) {
                                    onDeleteSubCategory(category.id, sub.id);
                                  }
                                }}
                                className="p-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded transition-colors"
                                title={lang === 'my' ? 'ဖျက်မည်' : 'Delete Sub-Category'}
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Add Sub-category Row */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder={
                      !isPremium
                        ? (lang === 'my' ? '+ ကဏ္ဍခွဲသစ် ထည့်သွင်းရန် (Premium)' : '+ Add sub-category (Premium)')
                        : (lang === 'my' ? '+ ကဏ္ဍခွဲအသစ် ထည့်မည် (ဥပမာ - ကော်ဖီ)' : '+ Add new sub-category (e.g. Coffee)')
                    }
                    value={inlineInputVal}
                    onChange={(e) =>
                      setInlineSubInputs((prev) => ({
                        ...prev,
                        [category.id]: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddInlineSub(category.id);
                      }
                    }}
                    className="flex-1 px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddInlineSub(category.id)}
                    disabled={isPremium && !inlineInputVal.trim()}
                    className={`px-2.5 py-1.5 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs cursor-pointer ${
                      isPremium
                        ? 'bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40'
                        : 'bg-amber-600 hover:bg-amber-700'
                    }`}
                  >
                    {!isPremium ? (
                      <span className="flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        <span>{lang === 'my' ? 'ထည့်မည်' : 'Add'}</span>
                      </span>
                    ) : (
                      lang === 'my' ? 'ထည့်မည်' : 'Add'
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Category Modal */}
      {isAddCatModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="font-bold text-base sm:text-lg text-slate-900">
                    {editingCategory
                      ? (lang === 'my' ? 'ကဏ္ဍ ပြင်ဆင်ခြင်း' : 'Edit Category')
                      : (lang === 'my' ? 'ကဏ္ဍအသစ် ထည့်သွင်းခြင်း' : 'Create New Category')}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {lang === 'my'
                      ? 'ဝင်ငွေ သို့မဟုတ် ထွက်ငွေအတွက် စိတ်ကြိုက်ကဏ္ဍ ဖန်တီးပါ'
                      : 'Set category name, icon, color and sub-categories'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCatModalOpen(false)}
                className="w-8 h-8 rounded-full text-slate-400 hover:bg-slate-100 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveCategory} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs sm:text-sm">
              {/* Type toggle */}
              {!editingCategory && (
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {lang === 'my' ? 'ကဏ္ဍ အမျိုးအစား:' : 'Category Type:'}
                  </label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setCatType('expense');
                        setCatColor('#EF4444');
                      }}
                      className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                        catType === 'expense'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      <span>{lang === 'my' ? 'ထွက်ငွေ (Expense)' : 'Expense'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCatType('income');
                        setCatColor('#10B981');
                      }}
                      className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                        catType === 'income'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <ArrowDownLeft className="w-4 h-4" />
                      <span>{lang === 'my' ? 'ဝင်ငွေ (Income)' : 'Income'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Category Name (Myanmar) */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {lang === 'my' ? 'ကဏ္ဍ အမည် (မြန်မာ):' : 'Category Name (Myanmar):'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={lang === 'my' ? 'ဥပမာ - အိမ်မွေးတိရစ္ဆာန် သို့မဟုတ် သင်တန်းကြေး' : 'e.g. Pets or Education'}
                  value={catNameMy}
                  onChange={(e) => setCatNameMy(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              {/* Category Name (English) */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {lang === 'my' ? 'ကဏ္ဍ အမည် (အင်္ဂလိပ် - Optional):' : 'Category Name (English):'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pets & Care"
                  value={catNameEn}
                  onChange={(e) => setCatNameEn(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              {/* Icon Selector */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">
                  {lang === 'my' ? 'အိုင်ကွန် ရွေးချယ်ရန်:' : 'Select Icon:'}
                </label>
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-36 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                  {AVAILABLE_CATEGORY_ICONS.map((iconName) => {
                    const isSelected = catIcon === iconName;
                    return (
                      <button
                        key={iconName}
                        type="button"
                        onClick={() => setCatIcon(iconName)}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-xs scale-105'
                            : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                        }`}
                        title={iconName}
                      >
                        <CategoryIcon name={iconName} className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Selector */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">
                  {lang === 'my' ? 'အရောင် ရွေးချယ်ရန်:' : 'Select Color:'}
                </label>
                <div className="flex flex-wrap gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                  {COLOR_PALETTE.map((color) => {
                    const isSelected = catColor === color;
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setCatColor(color)}
                        className={`w-7 h-7 rounded-full transition-transform flex items-center justify-center ${
                          isSelected ? 'ring-2 ring-offset-2 ring-slate-800 scale-110' : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Initial Sub-Categories (when creating new) */}
              {!editingCategory && (
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {lang === 'my'
                      ? 'ကဏ္ဍခွဲများ ကြိုတင်ထည့်သွင်းရန် (Optional):'
                      : 'Initial Sub-Categories (Optional):'}
                  </label>
                  <div className="flex items-center gap-1.5 mb-2">
                    <input
                      type="text"
                      placeholder={lang === 'my' ? 'ကဏ္ဍခွဲအမည် ရိုက်ထည့်ပါ...' : 'Sub-category name...'}
                      value={newSubInput}
                      onChange={(e) => setNewSubInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (newSubInput.trim()) {
                            setInitialSubCats([...initialSubCats, newSubInput.trim()]);
                            setNewSubInput('');
                          }
                        }
                      }}
                      className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newSubInput.trim()) {
                          setInitialSubCats([...initialSubCats, newSubInput.trim()]);
                          setNewSubInput('');
                        }
                      }}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold"
                    >
                      {lang === 'my' ? 'ထည့်မည်' : 'Add'}
                    </button>
                  </div>

                  {initialSubCats.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
                      {initialSubCats.map((sub, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-xs font-medium"
                        >
                          {sub}
                          <button
                            type="button"
                            onClick={() =>
                              setInitialSubCats(initialSubCats.filter((_, i) => i !== idx))
                            }
                            className="text-slate-400 hover:text-rose-600 ml-0.5"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20 active:scale-98 transition-all cursor-pointer"
                >
                  {editingCategory
                    ? (lang === 'my' ? 'ပြင်ဆင်မှု သိမ်းဆည်းမည်' : 'Save Changes')
                    : (lang === 'my' ? 'ကဏ္ဍအသစ် တည်ဆောက်မည်' : 'Create Category')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dedicated Sub-Category Edit Modal */}
      {editingSubModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0"
                  style={{ backgroundColor: editingSubModal.categoryColor }}
                >
                  <CategoryIcon iconName={editingSubModal.categoryIcon} className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {lang === 'my' ? 'ကဏ္ဍခွဲ ပြင်ဆင်ခြင်း' : 'Edit Sub-Category'}
                  </h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <span>{lang === 'my' ? 'အဓိကကဏ္ဍ:' : 'Parent:'}</span>
                    <span className="font-semibold text-slate-700">{editingSubModal.categoryName}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingSubModal(null)}
                className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold text-base transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {lang === 'my' ? 'ကဏ္ဍခွဲ အမည် (မြန်မာ)' : 'Sub-Category Name (Myanmar)'}
                  <span className="text-rose-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  value={editingSubModal.name}
                  onChange={(e) =>
                    setEditingSubModal({ ...editingSubModal, name: e.target.value })
                  }
                  placeholder={lang === 'my' ? 'ဥပမာ - မနက်စာ၊ ကော်ဖီ၊ ဆန်/ဆီ' : 'e.g. Breakfast, Coffee'}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && editingSubModal.name.trim()) {
                      e.preventDefault();
                      onUpdateSubCategory(editingSubModal.categoryId, {
                        ...editingSubModal.subCategory,
                        name: editingSubModal.name.trim(),
                        nameEn: editingSubModal.nameEn.trim() || editingSubModal.name.trim(),
                      });
                      setEditingSubModal(null);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {lang === 'my' ? 'ကဏ္ဍခွဲ အမည် (အင်္ဂလိပ်)' : 'Sub-Category Name (English)'}
                  <span className="text-slate-400 font-normal ml-1">
                    ({lang === 'my' ? 'ရွေးချယ်ရန်' : 'optional'})
                  </span>
                </label>
                <input
                  type="text"
                  value={editingSubModal.nameEn}
                  onChange={(e) =>
                    setEditingSubModal({ ...editingSubModal, nameEn: e.target.value })
                  }
                  placeholder="e.g. Breakfast, Coffee"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && editingSubModal.name.trim()) {
                      e.preventDefault();
                      onUpdateSubCategory(editingSubModal.categoryId, {
                        ...editingSubModal.subCategory,
                        name: editingSubModal.name.trim(),
                        nameEn: editingSubModal.nameEn.trim() || editingSubModal.name.trim(),
                      });
                      setEditingSubModal(null);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      lang === 'my'
                        ? `"${editingSubModal.name}" ကဏ္ဍခွဲကို ဖျက်ရန် သေချာပါသလား?`
                        : `Delete sub-category "${editingSubModal.name}"?`
                    )
                  ) {
                    onDeleteSubCategory(editingSubModal.categoryId, editingSubModal.subCategory.id);
                    setEditingSubModal(null);
                  }
                }}
                className="px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{lang === 'my' ? 'ဖျက်မည်' : 'Delete'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSubModal(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  {lang === 'my' ? 'မလုပ်တော့ပါ' : 'Cancel'}
                </button>
                <button
                  type="button"
                  disabled={!editingSubModal.name.trim()}
                  onClick={() => {
                    if (!editingSubModal.name.trim()) return;
                    onUpdateSubCategory(editingSubModal.categoryId, {
                      ...editingSubModal.subCategory,
                      name: editingSubModal.name.trim(),
                      nameEn: editingSubModal.nameEn.trim() || editingSubModal.name.trim(),
                    });
                    setEditingSubModal(null);
                  }}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {lang === 'my' ? 'ပြင်ဆင်မှု သိမ်းမည်' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
