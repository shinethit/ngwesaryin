import React, { useState, useEffect } from 'react';
import { PieChart, Percent, Banknote, Tag, Layers } from 'lucide-react';
import {
  BudgetCalcType,
  BudgetConfig,
  Category,
  UNBUDGETED_CATEGORY_ID,
  Wallet,
  getBudgetCategoryIds,
} from '../types';
import { formatMMK } from '../utils/formatters';
import { parseMyanmarNumber } from '../utils/myanmarDigits';
import { CategoryIcon } from './CategoryIcon';

interface BudgetModalProps {
  isOpen: boolean;
  editingBudget: BudgetConfig | null;
  budgets: BudgetConfig[];
  categories: Category[];
  wallets: Wallet[];
  monthlyIncome: number;
  lang: 'my' | 'en';
  onClose: () => void;
  onSubmit: (config: BudgetConfig) => void;
}

export const BudgetModal: React.FC<BudgetModalProps> = ({
  isOpen,
  editingBudget,
  budgets,
  categories,
  wallets,
  monthlyIncome,
  lang,
  onClose,
  onSubmit,
}) => {
  const expenseCategories = categories.filter((c) => c.type === 'expense');

  // [v7.5.74] Categories already configured in budgets — a category counts
  // as used when it appears in ANY other budget's resolved list (single
  // or multi-category), so one category can belong to at most one budget
  // and the summary totals can never double-count it. The budget being
  // edited is excluded, so its own categories stay selectable.
  const usedCategoryIds = new Set(
    budgets
      .filter((b) => !editingBudget || b.categoryId !== editingBudget.categoryId)
      .flatMap((b) => getBudgetCategoryIds(b))
  );

  // Available categories to add
  const availableCategories = expenseCategories.filter(
    (c) => !usedCategoryIds.has(c.id)
  );

  const isGeneralUsed = usedCategoryIds.has(UNBUDGETED_CATEGORY_ID);

  // [v7.5.60 N-19] Nothing left to budget: every expense category AND
  // General already have budgets. Saving again would silently overwrite
  // the existing General budget — show it and block the save instead.
  const noCategoryLeft = !editingBudget && isGeneralUsed && availableCategories.length === 0;

  // [v7.5.74] Multi-category selection: the checked expense categories.
  // isGeneral is separate — General can never combine with categories.
  // The PRIMARY category is selectedCategoryIds[0] (the editing budget's
  // categoryId when editing); it is locked in edit mode because the
  // storage/Firestore doc key is the primary categoryId.
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(() =>
    editingBudget && editingBudget.categoryId !== UNBUDGETED_CATEGORY_ID
      ? getBudgetCategoryIds(editingBudget)
      : availableCategories[0]?.id
      ? [availableCategories[0].id]
      : []
  );
  const [isGeneral, setIsGeneral] = useState<boolean>(
    editingBudget?.categoryId === UNBUDGETED_CATEGORY_ID
  );
  const [calcType, setCalcType] = useState<BudgetCalcType>(
    editingBudget?.calcType || 'percentage'
  );
  const [value, setValue] = useState<string>(
    editingBudget ? editingBudget.value.toString() : '15'
  );
  const [walletId, setWalletId] = useState<string>(
    editingBudget?.walletId || 'all'
  );
  const [error, setError] = useState('');
  // [v7.5.55 D25] Remember the last value typed in EACH mode, so switching
  // % <-> Fixed restores that mode's own number instead of carrying e.g.
  // 20% across as 20 MMK or 200,000 MMK across as 200,000%.
  const [lastPercentValue, setLastPercentValue] = useState<string>(
    editingBudget?.calcType === 'percentage' ? editingBudget.value.toString() : '15'
  );
  const [lastFixedValue, setLastFixedValue] = useState<string>(
    editingBudget?.calcType === 'fixed' ? editingBudget.value.toString() : '100000'
  );

  const handleCalcTypeChange = (next: BudgetCalcType) => {
    if (next === calcType) return;
    // Remember the value being left behind, then restore the other mode's
    // own last value (a valid percent, never > 100; a sensible fixed amount).
    if (calcType === 'percentage') setLastPercentValue(value);
    else setLastFixedValue(value);
    if (next === 'percentage') {
      const pct = parseMyanmarNumber(lastPercentValue);
      setValue(!isNaN(pct) && pct >= 1 && pct <= 100 ? lastPercentValue : '15');
    } else {
      const fixed = parseMyanmarNumber(lastFixedValue);
      setValue(!isNaN(fixed) && fixed > 0 ? lastFixedValue : '100000');
    }
    setCalcType(next);
    setError('');
  };

  useEffect(() => {
    if (editingBudget) {
      const general = editingBudget.categoryId === UNBUDGETED_CATEGORY_ID;
      setIsGeneral(general);
      setSelectedCategoryIds(general ? [] : getBudgetCategoryIds(editingBudget));
      setCalcType(editingBudget.calcType);
      setValue(editingBudget.value.toString());
      if (editingBudget.calcType === 'percentage') setLastPercentValue(editingBudget.value.toString());
      else setLastFixedValue(editingBudget.value.toString());
      setWalletId(editingBudget.walletId || 'all');
    } else {
      const defaultGeneral = !isGeneralUsed && availableCategories.length === 0;
      setIsGeneral(defaultGeneral);
      setSelectedCategoryIds(
        defaultGeneral ? [] : availableCategories[0]?.id ? [availableCategories[0].id] : []
      );
      setCalcType('percentage');
      setValue('15');
      setWalletId('all');
    }
  }, [editingBudget, isOpen]);

  if (!isOpen) return null;

  // [v7.5.55] Myanmar digits (၀-၉) accepted in the value field.
  const numValue = parseMyanmarNumber(value) || 0;
  const calculatedMMK =
    calcType === 'percentage'
      ? Math.round((monthlyIncome * numValue) / 100)
      : numValue;

  const handleQuickAddMMK = (add: number) => {
    const curr = parseMyanmarNumber(value) || 0;
    setValue((curr + add).toString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // [v7.5.55] Validation failures show a message — never silently return.
    if (!isGeneral && selectedCategoryIds.length === 0) {
      setError(lang === 'my' ? 'ဘတ်ဂျက်သတ်မှတ်မည့် ကဏ္ဍကို ရွေးချယ်ပါ' : 'Please choose a category');
      return;
    }
    if (noCategoryLeft) {
      setError(lang === 'my' ? 'ဘတ်ဂျက်သတ်မှတ်ရန် ကဏ္ဍ မရှိတော့ပါ — ကဏ္ဍအားလုံး + အထွေထွေ ဘတ်ဂျက် ရှိပြီးသားပါ။ ရှိပြီးသား ဘတ်ဂျက်ကို ပြင်ဆင်ပါ' : 'No category left to budget — every category including General already has a budget. Edit an existing budget instead.');
      return;
    }
    if (calcType === 'percentage' && (numValue <= 0 || numValue > 100)) {
      setError(lang === 'my' ? 'ရာခိုင်နှုန်းသည် ၁ မှ ၁၀၀ ကြား ဖြစ်ရပါမည်' : 'Percentage must be between 1 and 100');
      return;
    }
    if (calcType === 'fixed' && numValue <= 0) {
      setError(lang === 'my' ? 'သတ်မှတ် ဘတ်ဂျက်ငွေပမာဏ မှန်ကန်စွာ ထည့်ပါ' : 'Please enter a valid fixed amount');
      return;
    }
    setError('');

    // [v7.5.74] Primary category first: for a new budget it is the first
    // checked category; when editing it is locked to the original primary
    // (the storage/doc key must not change). categoryIds is stored only
    // for multi-category budgets — single-category budgets keep the exact
    // stored shape they have today.
    const primaryId = isGeneral
      ? UNBUDGETED_CATEGORY_ID
      : editingBudget
      ? editingBudget.categoryId
      : selectedCategoryIds[0];
    const finalIds = isGeneral
      ? []
      : [primaryId, ...selectedCategoryIds.filter((id) => id !== primaryId)];
    onSubmit({
      id: primaryId,
      categoryId: primaryId,
      ...(finalIds.length > 1 ? { categoryIds: finalIds } : {}),
      calcType,
      value: numValue,
      walletId,
    });
    onClose();
  };

  const isEditing = !!editingBudget;
  // [v7.5.74] Primary category of the budget being edited — locked: it
  // can never be unchecked (it is the doc key), only grouped with more.
  const lockedPrimaryId = isEditing ? editingBudget.categoryId : undefined;

  const toggleCategory = (id: string) => {
    if (editingBudget && id === editingBudget.categoryId) return;
    setIsGeneral(false);
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  const toggleGeneral = () => {
    if (isGeneral) {
      setIsGeneral(false);
      setSelectedCategoryIds(availableCategories[0]?.id ? [availableCategories[0].id] : []);
    } else {
      setIsGeneral(true);
      setSelectedCategoryIds([]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto overflow-x-hidden">
      <div className="bg-white w-full max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <PieChart className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-base sm:text-lg text-slate-900">
                {isEditing
                  ? (lang === 'my' ? 'ဘတ်ဂျက် ကန့်သတ်ချက် ပြင်ဆင်ခြင်း' : 'Edit Budget Limit')
                  : (lang === 'my' ? 'ဘတ်ဂျက် ကဏ္ဍသစ် သတ်မှတ်ခြင်း' : 'Add Budget Category')}
              </h2>
              <p className="text-xs text-slate-500">
                {lang === 'my'
                  ? 'ဝင်ငွေရာခိုင်နှုန်း သို့မဟုတ် သတ်မှတ်ငွေပမာဏဖြင့် ကန့်သတ်ပါ'
                  : 'Set limit by % of income or fixed amount with wallet linking'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-400 hover:bg-slate-100 flex items-center justify-center font-bold shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto overflow-x-hidden space-y-4 flex-1 text-base sm:text-sm">
          {/* Category Selector */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">
              {lang === 'my' ? 'ဘတ်ဂျက် သတ်မှတ်မည့် ကဏ္ဍ(များ):' : 'Target Expense Category/Categories:'}
            </label>
            {/* [v7.5.74] Multi-category picker: checkboxes instead of a
                single dropdown. In edit mode the General budget keeps its
                static card; a category budget's primary category is locked
                (doc key) and the rest can be grouped/ungrouped. */}
            {isEditing && isGeneral ? (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-700 text-white flex items-center justify-center shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 break-words">
                    {lang === 'my' ? 'အထွေထွေ (အခြား သီးသန့်မရှိသော ကဏ္ဍများ)' : 'General & Others (Unbudgeted)'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {lang === 'my' ? 'သီးသန့်ဘတ်ဂျက် မထားရှိသော ကဏ္ဍအားလုံး ပါဝင်သည်' : 'Aggregates all unbudgeted expenses'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {!isEditing && !isGeneralUsed && (
                  <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isGeneral}
                      onChange={toggleGeneral}
                      className="w-4 h-4 accent-indigo-600 shrink-0"
                    />
                    <div className="w-8 h-8 rounded-lg bg-slate-700 text-white flex items-center justify-center shrink-0">
                      <Layers className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-slate-900 text-sm">
                      ★ {lang === 'my' ? 'အထွေထွေ (ဘတ်ဂျက်သီးသန့်မရှိသော အခြားကဏ္ဍများ အားလုံး)' : 'General & Others (All Unbudgeted Categories)'}
                    </span>
                  </label>
                )}
                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                  {availableCategories.map((c) => {
                    const checked = selectedCategoryIds.includes(c.id);
                    const isPrimary = c.id === lockedPrimaryId;
                    return (
                      <label
                        key={c.id}
                        className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer ${
                          checked ? 'bg-indigo-50/70 border-indigo-200' : 'bg-slate-50 border-slate-200'
                        } ${isGeneral ? 'opacity-50' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={isGeneral || isPrimary}
                          onChange={() => toggleCategory(c.id)}
                          className="w-4 h-4 accent-indigo-600 shrink-0"
                        />
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0"
                          style={{ backgroundColor: c.color || '#6366F1' }}
                        >
                          <CategoryIcon name={c.icon || 'Tag'} className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-slate-800 text-sm min-w-0">
                          {lang === 'my' ? c.name : c.nameEn}
                        </span>
                        {isPrimary && (
                          <span className="ml-auto shrink-0 text-[10px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">
                            {lang === 'my' ? 'အဓိက' : 'Primary'}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-500">
                  {lang === 'my'
                    ? '💡 ကဏ္ဍ အမျိုးမျိုး ရွေးချယ်နိုင်သည် — ရွေးထားသော ကဏ္ဍအားလုံး၏ သုံးစွဲမှုကို ပေါင်းပြီး ဘတ်ဂျက်တစ်ခုတည်းဖြင့် ထိန်းချုပ်ပါမည်။ ကဏ္ဍတစ်ခုသည် ဘတ်ဂျက်တစ်ခုတွင်သာ ပါဝင်နိုင်သည်။'
                    : '💡 You can select multiple categories — spending across all selected categories is controlled by this one budget. Each category can belong to only one budget.'}
                </p>
              </div>
            )}
            {isGeneral && (
              <p className="text-[11px] text-indigo-700 bg-indigo-50/80 p-2 rounded-lg mt-2 border border-indigo-100">
                💡 {lang === 'my'
                  ? 'မှတ်ချက် - ဤ "အထွေထွေ" ဘတ်ဂျက်သည် သီးသန့် ဘတ်ဂျက်သတ်မှတ်မထားသော အခြား အသုံးစရိတ်များအားလုံး၏ စုစုပေါင်းကို အလိုအလျောက် ထိန်းချုပ်ပေးပါမည်။'
                  : 'Note: This General budget automatically controls expenses from all categories that do not have their own dedicated budget.'}
              </p>
            )}
          </div>

          {/* [v7.5.60 N-19] No category left — explain instead of silently
              overwriting the existing General budget on save. */}
          {noCategoryLeft && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold leading-relaxed">
              ⚠️ {lang === 'my'
                ? 'ဘတ်ဂျက်သတ်မှတ်ရန် ကဏ္ဍ မရှိတော့ပါ — ကဏ္ဍအားလုံးနှင့် အထွေထွေ ဘတ်ဂျက် ရှိပြီးသားပါ။ ရှိပြီးသား ဘတ်ဂျက်တစ်ခုကို ပြင်ဆင်ပါ။'
                : 'No category left to budget — every category including General already has a budget. Please edit an existing budget instead.'}
            </div>
          )}

          {/* Budget Limit Calculation Mode: Percentage vs Fixed */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">
              {lang === 'my' ? 'ဘတ်ဂျက် ကန့်သတ်မည့် ပုံစံ:' : 'Budget Calculation Method:'}
            </label>
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => handleCalcTypeChange('percentage')}
                className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all text-xs sm:text-sm ${
                  calcType === 'percentage'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Percent className="w-4 h-4 shrink-0" />
                <span>{lang === 'my' ? 'ဝင်ငွေ၏ ရာခိုင်နှုန်း (%)' : '% of Monthly Income'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleCalcTypeChange('fixed')}
                className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all text-xs sm:text-sm ${
                  calcType === 'fixed'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Banknote className="w-4 h-4 shrink-0" />
                <span>{lang === 'my' ? 'သတ်မှတ်ပမာဏ (MMK)' : 'Fixed Amount (MMK)'}</span>
              </button>
            </div>
          </div>

          {/* Value Input depending on calcType */}
          {calcType === 'percentage' ? (
            <div className="space-y-2">
              <label className="block text-slate-700 font-semibold mb-1">
                {lang === 'my' ? 'လစဉ်ဝင်ငွေ၏ ရာခိုင်နှုန်း (%):' : 'Percentage of Monthly Income (%):'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder="15"
                  value={value}
                  onChange={(e) => { setValue(e.target.value); setLastPercentValue(e.target.value); }}
                  className="w-full text-xl sm:text-2xl font-bold py-2.5 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-base">
                  %
                </span>
              </div>

              {/* Quick Percentage Presets */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[11px] text-slate-400">{lang === 'my' ? 'ရွေးချယ်ရန်:' : 'Quick select:'}</span>
                {[5, 10, 15, 20, 25, 30].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setValue(pct.toString())}
                    className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                      numValue === pct
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>

              {/* Dynamic Calculation Helper */}
              <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
                <div className="flex items-center justify-between font-semibold">
                  <span className="min-w-0">{lang === 'my' ? 'ယခုလ ဝင်ငွေ (ပိုက်ဆံအိတ်အားလုံး):' : 'Current Month Income (All Wallets):'}</span>
                  <span className="font-bold min-w-0 text-right break-words">{formatMMK(monthlyIncome)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-emerald-200/60 pt-1">
                  <span className="min-w-0">
                    {lang === 'my'
                      ? `တွက်ချက်ရရှိသော ဘတ်ဂျက် (${numValue}%):`
                      : `Calculated Limit (${numValue}%):`}
                  </span>
                  <span className="text-sm font-black text-emerald-700 min-w-0 text-right break-words">
                    {formatMMK(calculatedMMK)}
                  </span>
                </div>
                {monthlyIncome === 0 && (
                  <p className="text-[10px] text-amber-700 pt-0.5">
                    * {lang === 'my'
                      ? 'ယခုလအတွက် ဝင်ငွေမှတ်တမ်း မရှိသေးပါ။ ဝင်ငွေစာရင်းသွင်းသည့်အခါ အလိုအလျောက် ပမာဏပေါ်ထွက်လာပါမည်။'
                      : 'No income recorded yet for this month. The MMK amount will scale dynamically when income is added.'}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-slate-700 font-semibold mb-1">
                {lang === 'my' ? 'သတ်မှတ် ဘတ်ဂျက်ငွေပမာဏ (MMK):' : 'Fixed Budget Amount (MMK):'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder="100000"
                  value={value}
                  onChange={(e) => { setValue(e.target.value); setLastFixedValue(e.target.value); }}
                  className="w-full text-xl sm:text-2xl font-bold py-2.5 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                  MMK
                </span>
              </div>

              {/* Quick MMK Presets */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[11px] text-slate-400">{lang === 'my' ? 'ဖြည့်စွက်:' : 'Quick add:'}</span>
                {[50000, 100000, 200000, 500000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleQuickAddMMK(val)}
                    className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                  >
                    +{val >= 100000 ? `${val / 100000} သိန်း` : `${val / 1000}k`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Linked Wallet Selector */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              {lang === 'my' ? 'ချိတ်ဆက်မည့် ပိုက်ဆံအိတ် / အကောင့်:' : 'Link to Specific Wallet / Account:'}
            </label>
            <select
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 text-base sm:text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">
                🌐 {lang === 'my' ? 'ပိုက်ဆံအိတ် အားလုံး (All Wallets)' : 'All Wallets (Global)'}
              </option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  💳 {lang === 'my' ? w.name : w.nameEn} ({formatMMK(w.balance)})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              {walletId === 'all'
                ? (lang === 'my'
                    ? 'ပိုက်ဆံအိတ်အားလုံးမှ ဤကဏ္ဍတွင် သုံးစွဲသမျှ အသုံးစရိတ်များကို စုပေါင်းတွက်ချက်ပါမည်။'
                    : 'Calculates spending from all wallets for this category.')
                : (lang === 'my'
                    ? `ဤဘတ်ဂျက်သည် ရွေးချယ်ထားသော အကောင့်မှ သုံးစွဲငွေကိုသာ စစ်ဆေးတွက်ချက်ပါမည်။`
                    : `This budget will only count expenses paid using this selected wallet.`)}
            </p>
          </div>

          {error && (
            <p className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              ⚠️ {error}
            </p>
          )}

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium"
            >
              {lang === 'my' ? 'မလုပ်တော့ပါ' : 'Cancel'}
            </button>
            <button
              id="budget-save-btn"
              type="submit"
              disabled={noCategoryLeft}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isEditing
                ? (lang === 'my' ? 'ပြင်ဆင်ချက် သိမ်းမည်' : 'Save Changes')
                : (lang === 'my' ? 'ဘတ်ဂျက် သတ်မှတ်မည်' : 'Create Budget')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};