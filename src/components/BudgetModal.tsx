import React, { useState, useEffect } from 'react';
import {
  PieChart,
  Percent,
  Banknote,
  Wallet as WalletIcon,
  HelpCircle,
  Sparkles,
  CheckCircle2,
  Tag,
  Layers,
} from 'lucide-react';
import {
  BudgetCalcType,
  BudgetConfig,
  Category,
  UNBUDGETED_CATEGORY_ID,
  Wallet,
} from '../types';
import { formatMMK } from '../utils/formatters';
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

  // Categories already configured in budgets
  const usedCategoryIds = new Set(
    budgets
      .map((b) => b.categoryId)
      .filter((id) => !editingBudget || id !== editingBudget.categoryId)
  );

  // Available categories to add
  const availableCategories = expenseCategories.filter(
    (c) => !usedCategoryIds.has(c.id)
  );

  const isGeneralUsed = usedCategoryIds.has(UNBUDGETED_CATEGORY_ID);

  const [categoryId, setCategoryId] = useState<string>(
    editingBudget?.categoryId ||
      (availableCategories[0]?.id || UNBUDGETED_CATEGORY_ID)
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

  useEffect(() => {
    if (editingBudget) {
      setCategoryId(editingBudget.categoryId);
      setCalcType(editingBudget.calcType);
      setValue(editingBudget.value.toString());
      setWalletId(editingBudget.walletId || 'all');
    } else {
      const defaultCat = !isGeneralUsed && availableCategories.length === 0
        ? UNBUDGETED_CATEGORY_ID
        : availableCategories[0]?.id || UNBUDGETED_CATEGORY_ID;
      setCategoryId(defaultCat);
      setCalcType('percentage');
      setValue('15');
      setWalletId('all');
    }
  }, [editingBudget, isOpen]);

  if (!isOpen) return null;

  const numValue = parseFloat(value) || 0;
  const calculatedMMK =
    calcType === 'percentage'
      ? Math.round((monthlyIncome * numValue) / 100)
      : numValue;

  const handleQuickAddMMK = (add: number) => {
    const curr = parseFloat(value) || 0;
    setValue((curr + add).toString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || numValue <= 0) return;

    onSubmit({
      id: categoryId,
      categoryId,
      calcType,
      value: numValue,
      walletId,
    });
    onClose();
  };

  const isEditing = !!editingBudget;
  const isSelectedGeneral = categoryId === UNBUDGETED_CATEGORY_ID;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <PieChart className="w-5 h-5" />
            </div>
            <div>
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
            className="w-8 h-8 rounded-full text-slate-400 hover:bg-slate-100 flex items-center justify-center font-bold"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs sm:text-sm">
          {/* Category Selector */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">
              {lang === 'my' ? 'ဘတ်ဂျက် သတ်မှတ်မည့် ကဏ္ဍ:' : 'Target Expense Category:'}
            </label>
            {isEditing ? (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                {isSelectedGeneral ? (
                  <div className="w-8 h-8 rounded-lg bg-slate-700 text-white flex items-center justify-center">
                    <Layers className="w-4 h-4" />
                  </div>
                ) : (
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                    style={{
                      backgroundColor:
                        categories.find((c) => c.id === categoryId)?.color || '#6366F1',
                    }}
                  >
                    <CategoryIcon
                      name={categories.find((c) => c.id === categoryId)?.icon || 'Tag'}
                      className="w-4 h-4"
                    />
                  </div>
                )}
                <div>
                  <div className="font-bold text-slate-900">
                    {isSelectedGeneral
                      ? (lang === 'my' ? 'အထွေထွေ (အခြား သီးသန့်မရှိသော ကဏ္ဍများ)' : 'General & Others (Unbudgeted)')
                      : lang === 'my'
                      ? categories.find((c) => c.id === categoryId)?.name
                      : categories.find((c) => c.id === categoryId)?.nameEn}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {isSelectedGeneral
                      ? (lang === 'my' ? 'သီးသန့်ဘတ်ဂျက် မထားရှိသော ကဏ္ဍအားလုံး ပါဝင်သည်' : 'Aggregates all unbudgeted expenses')
                      : (lang === 'my' ? 'အသုံးစရိတ် ကဏ္ဍ' : 'Expense Category')}
                  </div>
                </div>
              </div>
            ) : (
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500"
              >
                {!isGeneralUsed && (
                  <option value={UNBUDGETED_CATEGORY_ID}>
                    ★ {lang === 'my' ? 'အထွေထွေ (ဘတ်ဂျက်သီးသန့်မရှိသော အခြားကဏ္ဍများ အားလုံး)' : '★ General & Others (All Unbudgeted Categories)'}
                  </option>
                )}
                {availableCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {lang === 'my' ? c.name : c.nameEn}
                  </option>
                ))}
              </select>
            )}
            {isSelectedGeneral && (
              <p className="text-[11px] text-indigo-700 bg-indigo-50/80 p-2 rounded-lg mt-2 border border-indigo-100">
                💡 {lang === 'my'
                  ? 'မှတ်ချက် - ဤ "အထွေထွေ" ဘတ်ဂျက်သည် သီးသန့် ဘတ်ဂျက်သတ်မှတ်မထားသော အခြား အသုံးစရိတ်များအားလုံး၏ စုစုပေါင်းကို အလိုအလျောက် ထိန်းချုပ်ပေးပါမည်။'
                  : 'Note: This General budget automatically controls expenses from all categories that do not have their own dedicated budget.'}
              </p>
            )}
          </div>

          {/* Budget Limit Calculation Mode: Percentage vs Fixed */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">
              {lang === 'my' ? 'ဘတ်ဂျက် ကန့်သတ်မည့် ပုံစံ:' : 'Budget Calculation Method:'}
            </label>
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setCalcType('percentage')}
                className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all text-xs sm:text-sm ${
                  calcType === 'percentage'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Percent className="w-4 h-4" />
                <span>{lang === 'my' ? 'ဝင်ငွေ၏ ရာခိုင်နှုန်း (%)' : '% of Monthly Income'}</span>
              </button>
              <button
                type="button"
                onClick={() => setCalcType('fixed')}
                className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all text-xs sm:text-sm ${
                  calcType === 'fixed'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Banknote className="w-4 h-4" />
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
                  type="number"
                  min="1"
                  max="100"
                  required
                  placeholder="15"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
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
                  <span>{lang === 'my' ? 'ယခုလ ဝင်ငွေ:' : 'Current Month Income:'}</span>
                  <span className="font-bold">{formatMMK(monthlyIncome)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-emerald-200/60 pt-1">
                  <span>
                    {lang === 'my'
                      ? `တွက်ချက်ရရှိသော ဘတ်ဂျက် (${numValue}%):`
                      : `Calculated Limit (${numValue}%):`}
                  </span>
                  <span className="text-sm font-black text-emerald-700">
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
                  type="number"
                  min="1000"
                  required
                  placeholder="100000"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
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
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500"
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
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs active:scale-95 transition-all"
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