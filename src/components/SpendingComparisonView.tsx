import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  ArrowRight,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  Wallet as WalletIcon,
  Download,
  Filter,
  BarChart3,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Check,
  HelpCircle,
  Copy,
  Info,
  Lock,
  Shuffle,
  Tag,
} from 'lucide-react';
import { Category, PlanType, Transaction, Wallet } from '../types';
import { formatMMK, formatDateDisplay } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';
import { buildWalletMap, isWalletMatch, isTransferTransaction } from '../utils/walletBalance';

interface SpendingComparisonViewProps {
  transactions: Transaction[];
  categories: Category[];
  wallets: Wallet[];
  plan: PlanType;
  lang: 'my' | 'en';
  onOpenUpgradeModal: () => void;
}

// Burmese month labels
const MONTH_NAMES_MY = [
  'ဇန်နဝါရီ',
  'ဖေဖော်ဝါရီ',
  'မတ်',
  'ဧပြီ',
  'မေ',
  'ဇွန်',
  'ဇူလိုင်',
  'သြဂုတ်',
  'စက်တင်ဘာ',
  'အောက်တိုဘာ',
  'နိုဝင်ဘာ',
  'ဒီဇင်ဘာ',
];

const MONTH_NAMES_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function formatMonthLabel(yearMonthStr: string, lang: 'my' | 'en'): string {
  if (!yearMonthStr || !yearMonthStr.includes('-')) return yearMonthStr;
  const [y, m] = yearMonthStr.split('-');
  const monthIdx = parseInt(m, 10) - 1;
  const monthName = lang === 'my' ? MONTH_NAMES_MY[monthIdx] : MONTH_NAMES_EN[monthIdx];
  return `${monthName} ${y}`;
}

export const SpendingComparisonView: React.FC<SpendingComparisonViewProps> = ({
  transactions,
  categories,
  wallets,
  plan,
  lang,
  onOpenUpgradeModal,
}) => {
  // Helper dates
  const today = new Date();
  const currentMonthStr = today.toISOString().slice(0, 7); // YYYY-MM
  const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const prevMonthStr = prevMonthDate.toISOString().slice(0, 7);

  // Default dates for custom range (last 30 days vs prior 30 days)
  const dToday = new Date(today);
  const d30DaysAgo = new Date(today);
  d30DaysAgo.setDate(dToday.getDate() - 29);
  const d31DaysAgo = new Date(today);
  d31DaysAgo.setDate(dToday.getDate() - 30);
  const d60DaysAgo = new Date(today);
  d60DaysAgo.setDate(dToday.getDate() - 59);

  const toDateInput = (d: Date) => d.toISOString().split('T')[0];

  // State
  const [periodType, setPeriodType] = useState<'monthly' | 'custom_range'>('monthly');

  // Month selectors
  const [monthA, setMonthA] = useState<string>(currentMonthStr);
  const [monthB, setMonthB] = useState<string>(prevMonthStr);

  // Custom range selectors
  const [startA, setStartA] = useState<string>(toDateInput(d30DaysAgo));
  const [endA, setEndA] = useState<string>(toDateInput(dToday));
  const [startB, setStartB] = useState<string>(toDateInput(d60DaysAgo));
  const [endB, setEndB] = useState<string>(toDateInput(d31DaysAgo));

  // Filters & Sorting
  const [comparisonLevel, setComparisonLevel] = useState<'category' | 'subcategory'>('category');
  const [walletFilter, setWalletFilter] = useState<string>('all');
  const [searchCategory, setSearchCategory] = useState<string>('');
  const [sortBy, setSortBy] = useState<'amountA' | 'amountB' | 'diff' | 'percent_increase' | 'percent_decrease' | 'name'>('amountA');
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Category mapping
  const categoryMap = useMemo(() => {
    return new Map(categories.map((c) => [c.id, c]));
  }, [categories]);

  // Stable random 2 category IDs for Free Plan
  const [randomFreeCatIds, setRandomFreeCatIds] = useState<string[]>(() => {
    const activeExpenseCatIds = Array.from(
      new Set(transactions.filter((t) => t.type === 'expense').map((t) => t.category))
    );
    const pool = activeExpenseCatIds.length >= 2 ? activeExpenseCatIds : categories.map((c) => c.id);
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 2);
  });

  // Ensure randomFreeCatIds has 2 items if categories change
  useEffect(() => {
    if (randomFreeCatIds.length < 2 && categories.length > 0) {
      const activeExpenseCatIds = Array.from(
        new Set(transactions.filter((t) => t.type === 'expense').map((t) => t.category))
      );
      const pool = activeExpenseCatIds.length >= 2 ? activeExpenseCatIds : categories.map((c) => c.id);
      const shuffled = [...pool].sort(() => 0.5 - Math.random());
      setRandomFreeCatIds(shuffled.slice(0, 2));
    }
  }, [categories, transactions, randomFreeCatIds.length]);

  const handleShuffleRandomCats = () => {
    if (plan !== 'free') return;
    const activeExpenseCatIds = Array.from(
      new Set(transactions.filter((t) => t.type === 'expense').map((t) => t.category))
    );
    const pool = activeExpenseCatIds.length >= 2 ? activeExpenseCatIds : categories.map((c) => c.id);
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    setRandomFreeCatIds(shuffled.slice(0, 2));
  };

  // Swap periods button
  const handleSwapPeriods = () => {
    if (plan === 'free') {
      onOpenUpgradeModal();
      return;
    }
    if (periodType === 'monthly') {
      const temp = monthA;
      setMonthA(monthB);
      setMonthB(temp);
    } else {
      const tempS = startA;
      const tempE = endA;
      setStartA(startB);
      setEndA(endB);
      setStartB(tempS);
      setEndB(tempE);
    }
  };

  // Preset Handlers
  const handleApplyPreset = (preset: 'this_vs_last_month' | 'last_month_vs_two_ago' | 'last_30_vs_prior_30' | 'half_month') => {
    if (plan === 'free') {
      onOpenUpgradeModal();
      return;
    }
    if (preset === 'this_vs_last_month') {
      setPeriodType('monthly');
      setMonthA(currentMonthStr);
      setMonthB(prevMonthStr);
    } else if (preset === 'last_month_vs_two_ago') {
      setPeriodType('monthly');
      const twoAgoDate = new Date(today.getFullYear(), today.getMonth() - 2, 1);
      const twoAgoStr = twoAgoDate.toISOString().slice(0, 7);
      setMonthA(prevMonthStr);
      setMonthB(twoAgoStr);
    } else if (preset === 'last_30_vs_prior_30') {
      setPeriodType('custom_range');
      setStartA(toDateInput(d30DaysAgo));
      setEndA(toDateInput(dToday));
      setStartB(toDateInput(d60DaysAgo));
      setEndB(toDateInput(d31DaysAgo));
    } else if (preset === 'half_month') {
      setPeriodType('custom_range');
      const curYear = today.getFullYear();
      const curMonth = String(today.getMonth() + 1).padStart(2, '0');
      setStartA(`${curYear}-${curMonth}-16`);
      setEndA(toDateInput(dToday));
      setStartB(`${curYear}-${curMonth}-01`);
      setEndB(`${curYear}-${curMonth}-15`);
    }
  };

  // Enforce Free plan single-month baseline: This month vs Last month
  const effectivePeriodType = plan === 'free' ? 'monthly' : periodType;
  const effectiveMonthA = plan === 'free' ? currentMonthStr : monthA;
  const effectiveMonthB = plan === 'free' ? prevMonthStr : monthB;

  const walletMap = useMemo(() => buildWalletMap(wallets), [wallets]);

  // Filter transactions based on periods
  const {
    txA,
    txB,
    labelA,
    labelB,
  } = useMemo(() => {
    let tA: Transaction[] = [];
    let tB: Transaction[] = [];
    let lA = '';
    let lB = '';

    const filterWallet = (t: Transaction) => {
      if (walletFilter === 'all') return true;
      const targetW = walletMap.get(walletFilter);
      if (targetW) return isWalletMatch(targetW, t.walletId);
      return t.walletId === walletFilter;
    };

    if (effectivePeriodType === 'monthly') {
      lA = formatMonthLabel(effectiveMonthA, lang);
      lB = formatMonthLabel(effectiveMonthB, lang);

      tA = transactions.filter((t) => {
        if (!t.date.startsWith(effectiveMonthA)) return false;
        return filterWallet(t);
      });

      tB = transactions.filter((t) => {
        if (!t.date.startsWith(effectiveMonthB)) return false;
        return filterWallet(t);
      });
    } else {
      lA = `${formatDateDisplay(startA)} - ${formatDateDisplay(endA)}`;
      lB = `${formatDateDisplay(startB)} - ${formatDateDisplay(endB)}`;

      tA = transactions.filter((t) => {
        if (t.date < startA || t.date > endA) return false;
        return filterWallet(t);
      });

      tB = transactions.filter((t) => {
        if (t.date < startB || t.date > endB) return false;
        return filterWallet(t);
      });
    }

    return { txA: tA, txB: tB, labelA: lA, labelB: lB };
  }, [effectivePeriodType, effectiveMonthA, effectiveMonthB, startA, endA, startB, endB, walletFilter, transactions, lang, walletMap]);

  // Financial aggregates for Period A and Period B
  const stats = useMemo(() => {
    let incomeA = 0;
    let expenseA = 0;
    const catExpensesA: Record<string, number> = {};

    txA.forEach((t) => {
      if (isTransferTransaction(t)) return;
      if (t.type === 'income') {
        incomeA += t.amount;
      } else if (t.type === 'expense') {
        expenseA += t.amount;
        catExpensesA[t.category] = (catExpensesA[t.category] || 0) + t.amount;
      }
    });

    let incomeB = 0;
    let expenseB = 0;
    const catExpensesB: Record<string, number> = {};

    txB.forEach((t) => {
      if (isTransferTransaction(t)) return;
      if (t.type === 'income') {
        incomeB += t.amount;
      } else if (t.type === 'expense') {
        expenseB += t.amount;
        catExpensesB[t.category] = (catExpensesB[t.category] || 0) + t.amount;
      }
    });

    const netA = incomeA - expenseA;
    const netB = incomeB - expenseB;

    const diffExpense = expenseA - expenseB;
    const percentDiffExpense =
      expenseB > 0
        ? Math.round(((expenseA - expenseB) / expenseB) * 1000) / 10
        : expenseA > 0
        ? 100
        : 0;

    const diffIncome = incomeA - incomeB;
    const percentDiffIncome =
      incomeB > 0
        ? Math.round(((incomeA - incomeB) / incomeB) * 1000) / 10
        : incomeA > 0
        ? 100
        : 0;

    // All unique expense category IDs that appeared in either period
    const allCatIds = Array.from(
      new Set([...Object.keys(catExpensesA), ...Object.keys(catExpensesB)])
    );

    const categoryComparisons = allCatIds.map((catId) => {
      const amtA = catExpensesA[catId] || 0;
      const amtB = catExpensesB[catId] || 0;
      const diff = amtA - amtB;
      const pctChange =
        amtB > 0
          ? Math.round(((amtA - amtB) / amtB) * 1000) / 10
          : amtA > 0
          ? 100
          : 0;

      const pctOfTotalA = expenseA > 0 ? Math.round((amtA / expenseA) * 100) : 0;
      const pctOfTotalB = expenseB > 0 ? Math.round((amtB / expenseB) * 100) : 0;

      return {
        categoryId: catId,
        category: categoryMap.get(catId),
        amountA: amtA,
        amountB: amtB,
        diff,
        pctChange,
        pctOfTotalA,
        pctOfTotalB,
      };
    });

    // Sub-Category Expenses Map
    const subExpensesA: Record<string, { catId: string; subId: string; name: string; amount: number }> = {};
    const subExpensesB: Record<string, { catId: string; subId: string; name: string; amount: number }> = {};

    txA.forEach((t) => {
      if (isTransferTransaction(t) || t.type !== 'expense') return;
      const subId = t.subCategoryId || 'general';
      const key = `${t.category}:::${subId}`;
      const cat = categoryMap.get(t.category);
      const subObj = cat?.subCategories?.find((s) => s.id === subId);
      const subName = subObj
        ? (lang === 'my' ? subObj.name : subObj.nameEn || subObj.name)
        : t.subCategoryId
        ? t.note || 'General'
        : (lang === 'my' ? 'အထွေထွေ' : 'General');

      if (!subExpensesA[key]) {
        subExpensesA[key] = { catId: t.category, subId, name: subName, amount: 0 };
      }
      subExpensesA[key].amount += t.amount;
    });

    txB.forEach((t) => {
      if (isTransferTransaction(t) || t.type !== 'expense') return;
      const subId = t.subCategoryId || 'general';
      const key = `${t.category}:::${subId}`;
      const cat = categoryMap.get(t.category);
      const subObj = cat?.subCategories?.find((s) => s.id === subId);
      const subName = subObj
        ? (lang === 'my' ? subObj.name : subObj.nameEn || subObj.name)
        : t.subCategoryId
        ? t.note || 'General'
        : (lang === 'my' ? 'အထွေထွေ' : 'General');

      if (!subExpensesB[key]) {
        subExpensesB[key] = { catId: t.category, subId, name: subName, amount: 0 };
      }
      subExpensesB[key].amount += t.amount;
    });

    const allSubKeys = Array.from(new Set([...Object.keys(subExpensesA), ...Object.keys(subExpensesB)]));
    const subCategoryComparisons = allSubKeys.map((key) => {
      const [catId, subId] = key.split(':::');
      const itemA = subExpensesA[key];
      const itemB = subExpensesB[key];
      const amtA = itemA?.amount || 0;
      const amtB = itemB?.amount || 0;
      const diff = amtA - amtB;
      const pctChange =
        amtB > 0
          ? Math.round(((amtA - amtB) / amtB) * 1000) / 10
          : amtA > 0
          ? 100
          : 0;

      const subName = itemA?.name || itemB?.name || (subId === 'general' ? (lang === 'my' ? 'အထွေထွေ' : 'General') : subId);
      const cat = categoryMap.get(catId);

      return {
        key,
        categoryId: catId,
        subCategoryId: subId,
        name: subName,
        category: cat,
        amountA: amtA,
        amountB: amtB,
        diff,
        pctChange,
        pctOfTotalA: expenseA > 0 ? Math.round((amtA / expenseA) * 100) : 0,
        pctOfTotalB: expenseB > 0 ? Math.round((amtB / expenseB) * 100) : 0,
      };
    });

    // Subcategory mapped by Category ID for drill-down views
    const subCategoryByCatMap = new Map<string, typeof subCategoryComparisons>();
    subCategoryComparisons.forEach((sub) => {
      if (!subCategoryByCatMap.has(sub.categoryId)) {
        subCategoryByCatMap.set(sub.categoryId, []);
      }
      subCategoryByCatMap.get(sub.categoryId)!.push(sub);
    });

    // Find highest increase and highest decrease
    const sortedByDiff = [...categoryComparisons].sort((a, b) => b.diff - a.diff);
    const highestIncreaseCat = sortedByDiff.find((c) => c.diff > 0);
    const highestSavingsCat = [...categoryComparisons].sort((a, b) => a.diff - b.diff).find((c) => c.diff < 0);

    return {
      incomeA,
      incomeB,
      expenseA,
      expenseB,
      netA,
      netB,
      diffExpense,
      percentDiffExpense,
      diffIncome,
      percentDiffIncome,
      categoryComparisons,
      subCategoryComparisons,
      subCategoryByCatMap,
      highestIncreaseCat,
      highestSavingsCat,
    };
  }, [txA, txB, categoryMap, lang]);

  // All unique comparisons computed from transactions
  // When plan === 'free', only the 2 random categories are exposed
  const displayedCategoryComparisons = useMemo(() => {
    if (plan === 'free') {
      const existingMap = new Map(stats.categoryComparisons.map((c) => [c.categoryId, c]));
      const list = randomFreeCatIds.map((id) => {
        if (existingMap.has(id)) {
          return existingMap.get(id)!;
        }
        const cat = categoryMap.get(id);
        return {
          categoryId: id,
          category: cat,
          amountA: 0,
          amountB: 0,
          diff: 0,
          pctChange: 0,
          pctOfTotalA: 0,
          pctOfTotalB: 0,
        };
      });
      return list.slice(0, 2);
    }
    return stats.categoryComparisons;
  }, [plan, stats.categoryComparisons, randomFreeCatIds, categoryMap]);

  const totalCategoriesCount = useMemo(() => {
    return Math.max(stats.categoryComparisons.length, categories.length);
  }, [stats.categoryComparisons.length, categories.length]);

  const hiddenCategoriesCount = useMemo(() => {
    if (plan !== 'free') return 0;
    return Math.max(0, totalCategoriesCount - displayedCategoryComparisons.length);
  }, [plan, totalCategoriesCount, displayedCategoryComparisons.length]);

  // Active highlights (for Free, reflects the random 2 categories)
  const activeHighlights = useMemo(() => {
    if (plan === 'free') {
      const sortedByDiff = [...displayedCategoryComparisons].sort((a, b) => b.diff - a.diff);
      return {
        highestIncreaseCat: sortedByDiff.find((c) => c.diff > 0),
        highestSavingsCat: [...displayedCategoryComparisons].sort((a, b) => a.diff - b.diff).find((c) => c.diff < 0),
      };
    }
    return {
      highestIncreaseCat: stats.highestIncreaseCat,
      highestSavingsCat: stats.highestSavingsCat,
    };
  }, [plan, displayedCategoryComparisons, stats.highestIncreaseCat, stats.highestSavingsCat]);

  // Filter and sort category comparisons
  const filteredCategoryList = useMemo(() => {
    let list = displayedCategoryComparisons;

    // Search filter (only active in Premium)
    if (searchCategory.trim() && plan === 'premium') {
      const q = searchCategory.toLowerCase();
      list = list.filter((c) => {
        const nameMy = c.category?.name?.toLowerCase() || '';
        const nameEn = c.category?.nameEn?.toLowerCase() || '';
        return nameMy.includes(q) || nameEn.includes(q);
      });
    }

    // Sorting
    list = [...list].sort((a, b) => {
      if (sortBy === 'amountA') return b.amountA - a.amountA;
      if (sortBy === 'amountB') return b.amountB - a.amountB;
      if (sortBy === 'diff') return Math.abs(b.diff) - Math.abs(a.diff);
      if (sortBy === 'percent_increase') return b.pctChange - a.pctChange;
      if (sortBy === 'percent_decrease') return a.pctChange - b.pctChange;
      if (sortBy === 'name') {
        const nameA = a.category?.name || '';
        const nameB = b.category?.name || '';
        return nameA.localeCompare(nameB);
      }
      return 0;
    });

    return list;
  }, [displayedCategoryComparisons, searchCategory, sortBy, plan]);

  // SubCategory comparisons displayed according to plan & filters
  const displayedSubCategoryComparisons = useMemo(() => {
    if (plan === 'free') {
      // Return subcategories belonging to the 2 random free categories
      const setCats = new Set(randomFreeCatIds);
      return stats.subCategoryComparisons.filter((s) => setCats.has(s.categoryId)).slice(0, 4);
    }
    return stats.subCategoryComparisons;
  }, [plan, stats.subCategoryComparisons, randomFreeCatIds]);

  const filteredSubCategoryList = useMemo(() => {
    let list = displayedSubCategoryComparisons;

    if (searchCategory.trim() && plan === 'premium') {
      const q = searchCategory.toLowerCase();
      list = list.filter((s) => {
        const nameSub = s.name.toLowerCase();
        const nameCatMy = s.category?.name?.toLowerCase() || '';
        const nameCatEn = s.category?.nameEn?.toLowerCase() || '';
        return nameSub.includes(q) || nameCatMy.includes(q) || nameCatEn.includes(q);
      });
    }

    list = [...list].sort((a, b) => {
      if (sortBy === 'amountA') return b.amountA - a.amountA;
      if (sortBy === 'amountB') return b.amountB - a.amountB;
      if (sortBy === 'diff') return Math.abs(b.diff) - Math.abs(a.diff);
      if (sortBy === 'percent_increase') return b.pctChange - a.pctChange;
      if (sortBy === 'percent_decrease') return a.pctChange - b.pctChange;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return 0;
    });

    return list;
  }, [displayedSubCategoryComparisons, searchCategory, sortBy, plan]);

  // Maximum amount in comparison for bar width scaling
  const maxBarAmount = useMemo(() => {
    let max = 1;
    const currentList = comparisonLevel === 'category' ? displayedCategoryComparisons : displayedSubCategoryComparisons;
    currentList.forEach((c) => {
      if (c.amountA > max) max = c.amountA;
      if (c.amountB > max) max = c.amountB;
    });
    return max;
  }, [comparisonLevel, displayedCategoryComparisons, displayedSubCategoryComparisons]);

  // Export or copy summary
  const handleCopySummary = () => {
    const text = [
      `📊 ${lang === 'my' ? 'ကာလအလိုက် သုံးစွဲမှု နှိုင်းယှဉ်ချက် အကျဉ်းချုပ်' : 'Spending Comparison Summary'}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `🔹 ${lang === 'my' ? 'ကာလ (က)' : 'Period A'}: ${labelA}`,
      `   - ${lang === 'my' ? 'စုစုပေါင်း ထွက်ငွေ' : 'Total Expense'}: ${formatMMK(stats.expenseA)}`,
      `   - ${lang === 'my' ? 'စုစုပေါင်း ဝင်ငွေ' : 'Total Income'}: ${formatMMK(stats.incomeA)}`,
      `   - ${lang === 'my' ? 'လက်ကျန်ငွေ' : 'Net Savings'}: ${formatMMK(stats.netA)}`,
      ``,
      `🔸 ${lang === 'my' ? 'ကာလ (ခ)' : 'Period B'}: ${labelB}`,
      `   - ${lang === 'my' ? 'စုစုပေါင်း ထွက်ငွေ' : 'Total Expense'}: ${formatMMK(stats.expenseB)}`,
      `   - ${lang === 'my' ? 'စုစုပေါင်း ဝင်ငွေ' : 'Total Income'}: ${formatMMK(stats.incomeB)}`,
      `   - ${lang === 'my' ? 'လက်ကျန်ငွေ' : 'Net Savings'}: ${formatMMK(stats.netB)}`,
      ``,
      `📈 ${lang === 'my' ? 'အသုံးစရိတ် ကွာခြားချက်' : 'Expense Difference'}: ${
        stats.diffExpense >= 0 ? '+' : ''
      }${formatMMK(stats.diffExpense)} (${stats.percentDiffExpense >= 0 ? '+' : ''}${
        stats.percentDiffExpense
      }%)`,
      stats.highestIncreaseCat
        ? `⚠️ ${lang === 'my' ? 'အများဆုံး တိုးလာသော ကဏ္ဍ' : 'Highest Increase'}: ${
            lang === 'my'
              ? stats.highestIncreaseCat.category?.name
              : stats.highestIncreaseCat.category?.nameEn
          } (+${formatMMK(stats.highestIncreaseCat.diff)})`
        : '',
      stats.highestSavingsCat
        ? `✅ ${lang === 'my' ? 'အများဆုံး လျော့ချနိုင်သော ကဏ္ဍ' : 'Highest Savings'}: ${
            lang === 'my'
              ? stats.highestSavingsCat.category?.name
              : stats.highestSavingsCat.category?.nameEn
          } (${formatMMK(stats.highestSavingsCat.diff)})`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleExportCSV = () => {
    if (plan === 'free') {
      onOpenUpgradeModal();
      return;
    }

    const headers = [
      'Category ID',
      'Category Name',
      `Period A Amount (${labelA})`,
      `Period B Amount (${labelB})`,
      'Difference (MMK)',
      'Change (%)',
    ];

    const rows = stats.categoryComparisons.map((c) => [
      c.categoryId,
      `"${c.category?.name || c.categoryId}"`,
      c.amountA,
      c.amountB,
      c.diff,
      `${c.pctChange}%`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `spending_comparison_${periodType}_${Date.now()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Control Panel: Mode Selector, Date Picker, and Wallet Filter */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-7">
        {/* Free Plan Restrictive Notice Banner */}
        {plan === 'free' && (
          <div className="mb-5 bg-amber-50/90 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start sm:items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 font-bold text-amber-950">
                  <span>{lang === 'my' ? 'Free Plan ကန့်သတ်ချက်' : 'Free Plan Constraints'}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200/80 text-amber-900">
                    {lang === 'my' ? '၁ လစာ + Random ၂ ခုသာ' : '1 Month + 2 Random Categories'}
                  </span>
                </div>
                <p className="text-amber-900/90 mt-0.5 text-[11px] sm:text-xs">
                  {lang === 'my'
                    ? 'Free အဆင့်တွင် လတ်တလော ၁ လစာ (ယခုလ vs ပြီးခဲ့သည့်လ) ကိုသာ ပုံသေ နှိုင်းယှဉ်နိုင်ပြီး Random ကဏ္ဍ ၂ ခုသာ ပြသပေးထားပါသည် (စိတ်ကြိုက် ရွေးချယ်ခွင့် မရှိပါ)'
                    : 'Fixed to 1-month comparison (This month vs Last month) showing 2 random categories only (selection locked).'}
                </p>
              </div>
            </div>
            <button
              onClick={onOpenUpgradeModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-2xs shrink-0 active:scale-95 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{lang === 'my' ? 'စိတ်ကြိုက်နှိုင်းယှဉ်ရန် Premium' : 'Upgrade to Premium'}</span>
            </button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <ArrowUpDown className="w-4 h-4" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                {lang === 'my'
                  ? 'လစဉ်/ကာလအလိုက် သုံးစွဲမှု နှိုင်းယှဉ်ချက်'
                  : 'Spending Period Comparison'}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {lang === 'my'
                ? 'ပြီးခဲ့သည့်လနှင့် ယခုလ သို့မဟုတ် စိတ်ကြိုက် သတ်မှတ်ထားသော ကာလနှစ်ခုကြား ကဏ္ဍအလိုက် အသုံးစရိတ် ကွာခြားချက်များကို စိစစ်ပါ'
                : 'Compare expenses across any two months or custom date ranges by category'}
            </p>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
              {lang === 'my' ? 'အမြန်ရွေးချယ်ရန်:' : 'Presets:'}
            </span>
            <button
              id="preset-this-last-month"
              onClick={() => handleApplyPreset('this_vs_last_month')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                effectivePeriodType === 'monthly' && effectiveMonthA === currentMonthStr && effectiveMonthB === prevMonthStr
                  ? 'bg-slate-900 text-white shadow-xs font-bold'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {lang === 'my' ? 'ယခုလ vs ပြီးခဲ့သည့်လ' : 'This vs Last Month'}
            </button>
            <button
              id="preset-last-month-two-ago"
              onClick={() => handleApplyPreset('last_month_vs_two_ago')}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                plan === 'free'
                  ? 'bg-slate-100 text-slate-400 cursor-pointer hover:bg-amber-50 hover:text-amber-800'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
              title={plan === 'free' ? 'Premium required' : undefined}
            >
              {plan === 'free' && <Lock className="w-3 h-3 text-amber-500" />}
              <span>{lang === 'my' ? 'လွန်ခဲ့သော ၂ လ vs ၃ လ' : '2 Mo vs 3 Mo Ago'}</span>
            </button>
            <button
              id="preset-last-30-days"
              onClick={() => handleApplyPreset('last_30_vs_prior_30')}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                plan === 'free'
                  ? 'bg-slate-100 text-slate-400 cursor-pointer hover:bg-amber-50 hover:text-amber-800'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
              title={plan === 'free' ? 'Premium required' : undefined}
            >
              {plan === 'free' && <Lock className="w-3 h-3 text-amber-500" />}
              <span>{lang === 'my' ? 'ရက် ၃၀ vs ယခင် ရက် ၃၀' : 'Last 30 vs Prior 30d'}</span>
            </button>
          </div>
        </div>

        {/* Date Selector Row */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Mode Switch: Month vs Custom Range */}
          <div className="md:col-span-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              {lang === 'my' ? 'နှိုင်းယှဉ်မှု ပုံစံ' : 'Comparison Type'}
            </label>
            <div className="flex rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setPeriodType('monthly')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  effectivePeriodType === 'monthly'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {lang === 'my' ? 'လအလိုက်' : 'Monthly'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (plan === 'free') {
                    onOpenUpgradeModal();
                  } else {
                    setPeriodType('custom_range');
                  }
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all inline-flex items-center justify-center gap-1 ${
                  effectivePeriodType === 'custom_range'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{lang === 'my' ? 'စိတ်ကြိုက် ရက်စွဲ' : 'Custom Dates'}</span>
                {plan === 'free' && <Lock className="w-3 h-3 text-amber-500" />}
              </button>
            </div>
          </div>

          {/* Period A Selection */}
          <div className="md:col-span-4 bg-emerald-50/50 border border-emerald-200/80 rounded-2xl p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                {lang === 'my' ? 'ကာလ (က) [ယခု အခြေအနေ]' : 'Period A [Current]'}
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold truncate max-w-[150px] flex items-center gap-1">
                {plan === 'free' && <Lock className="w-2.5 h-2.5 text-emerald-600 shrink-0" />}
                <span>{labelA}</span>
              </span>
            </div>
            {effectivePeriodType === 'monthly' ? (
              <div className="relative">
                <input
                  type="month"
                  id="select-month-a"
                  value={effectiveMonthA}
                  disabled={plan === 'free'}
                  onChange={(e) => setMonthA(e.target.value)}
                  className={`w-full text-xs font-bold px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    plan === 'free' ? 'opacity-80 bg-slate-50 cursor-not-allowed' : ''
                  }`}
                />
                {plan === 'free' && (
                  <button
                    type="button"
                    onClick={onOpenUpgradeModal}
                    title={lang === 'my' ? 'ရက်စွဲရွေးချယ်ရန် Premium လိုအပ်ပါသည်' : 'Upgrade to change date'}
                    className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                  />
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={startA}
                  onChange={(e) => setStartA(e.target.value)}
                  className="w-full text-[11px] font-bold px-2 py-1.5 bg-white border border-emerald-300 rounded-lg text-slate-900 focus:outline-none"
                  title="Start Date A"
                />
                <input
                  type="date"
                  value={endA}
                  onChange={(e) => setEndA(e.target.value)}
                  className="w-full text-[11px] font-bold px-2 py-1.5 bg-white border border-emerald-300 rounded-lg text-slate-900 focus:outline-none"
                  title="End Date A"
                />
              </div>
            )}
          </div>

          {/* Swap Button in Middle */}
          <div className="md:col-span-1 flex justify-center">
            <button
              type="button"
              id="swap-periods-btn"
              onClick={handleSwapPeriods}
              title={
                plan === 'free'
                  ? (lang === 'my' ? 'ကာလလဲလှယ်ရန် Premium လိုအပ်ပါသည်' : 'Upgrade to swap periods')
                  : (lang === 'my' ? 'ကာလ (က) နှင့် (ခ) အပြန်အလှန် လဲလှယ်ရန်' : 'Swap Period A & B')
              }
              className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors active:scale-95 shadow-xs ${
                plan === 'free'
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-pointer hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
              }`}
            >
              {plan === 'free' ? <Lock className="w-3.5 h-3.5 text-amber-500" /> : <ArrowUpDown className="w-4 h-4" />}
            </button>
          </div>

          {/* Period B Selection */}
          <div className="md:col-span-4 bg-indigo-50/50 border border-indigo-200/80 rounded-2xl p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-indigo-800 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
                {lang === 'my' ? 'ကာလ (ခ) [ယခင် အခြေအနေ]' : 'Period B [Comparison]'}
              </span>
              <span className="text-[10px] text-indigo-700 font-semibold truncate max-w-[150px] flex items-center gap-1">
                {plan === 'free' && <Lock className="w-2.5 h-2.5 text-indigo-600 shrink-0" />}
                <span>{labelB}</span>
              </span>
            </div>
            {effectivePeriodType === 'monthly' ? (
              <div className="relative">
                <input
                  type="month"
                  id="select-month-b"
                  value={effectiveMonthB}
                  disabled={plan === 'free'}
                  onChange={(e) => setMonthB(e.target.value)}
                  className={`w-full text-xs font-bold px-3 py-1.5 bg-white border border-indigo-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    plan === 'free' ? 'opacity-80 bg-slate-50 cursor-not-allowed' : ''
                  }`}
                />
                {plan === 'free' && (
                  <button
                    type="button"
                    onClick={onOpenUpgradeModal}
                    title={lang === 'my' ? 'ရက်စွဲရွေးချယ်ရန် Premium လိုအပ်ပါသည်' : 'Upgrade to change date'}
                    className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                  />
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={startB}
                  onChange={(e) => setStartB(e.target.value)}
                  className="w-full text-[11px] font-bold px-2 py-1.5 bg-white border border-indigo-300 rounded-lg text-slate-900 focus:outline-none"
                  title="Start Date B"
                />
                <input
                  type="date"
                  value={endB}
                  onChange={(e) => setEndB(e.target.value)}
                  className="w-full text-[11px] font-bold px-2 py-1.5 bg-white border border-indigo-300 rounded-lg text-slate-900 focus:outline-none"
                  title="End Date B"
                />
              </div>
            )}
          </div>
        </div>

        {/* Secondary Filter Row: Wallet selector & Export Buttons */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2">
              <WalletIcon className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-600">
                {lang === 'my' ? 'ပိုက်ဆံအိတ်:' : 'Wallet:'}
              </span>
              <select
                value={walletFilter}
                onChange={(e) => setWalletFilter(e.target.value)}
                className="text-xs font-semibold px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">{lang === 'my' ? 'ပိုက်ဆံအိတ် အားလုံး' : 'All Wallets'}</option>
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {lang === 'my' ? w.name : w.nameEn}
                  </option>
                ))}
              </select>
            </div>

            {/* Free plan Shuffle 2 random categories button */}
            {plan === 'free' && (
              <button
                type="button"
                id="shuffle-random-cats-btn"
                onClick={handleShuffleRandomCats}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-100/90 hover:bg-amber-200 text-amber-900 transition-colors shadow-2xs border border-amber-200"
                title={lang === 'my' ? 'အခြား နမူနာ ၂ ခုသို့ ပြောင်းလဲကြည့်ရှုရန်' : 'Shuffle 2 random categories'}
              >
                <Shuffle className="w-3.5 h-3.5 text-amber-700" />
                <span>{lang === 'my' ? '🎲 အခြား Random ၂ ခု ပြောင်းမည်' : '🎲 Shuffle 2 Random Cats'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySummary}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            >
              {isCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">{lang === 'my' ? 'ကူးယူပြီးပါပြီ' : 'Copied!'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>{lang === 'my' ? 'အကျဉ်းချုပ် ကူးယူမည်' : 'Copy Summary'}</span>
                </>
              )}
            </button>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{lang === 'my' ? 'Excel / CSV ထုတ်ယူမည်' : 'Export CSV'}</span>
              {plan === 'free' && (
                <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                  PRO
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Overview Cards: Total Expense, Total Income, Savings & Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Expense Comparison */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {lang === 'my' ? 'စုစုပေါင်း အသုံးစရိတ်' : 'Total Expense'}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                  stats.diffExpense <= 0
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {stats.diffExpense <= 0 ? (
                  <>
                    <TrendingDown className="w-3 h-3" />
                    <span>{Math.abs(stats.percentDiffExpense)}% {lang === 'my' ? 'လျော့' : 'less'}</span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-3 h-3" />
                    <span>+{stats.percentDiffExpense}% {lang === 'my' ? 'တိုး' : 'more'}</span>
                  </>
                )}
              </span>
            </div>

            <div className="mt-3">
              <div className="text-xs text-emerald-700 font-semibold flex items-center justify-between">
                <span>{lang === 'my' ? 'ကာလ (က):' : 'Period A:'}</span>
                <span className="text-base font-black text-slate-900">{formatMMK(stats.expenseA)}</span>
              </div>
              <div className="text-xs text-indigo-700 font-semibold flex items-center justify-between mt-1">
                <span>{lang === 'my' ? 'ကာလ (ခ):' : 'Period B:'}</span>
                <span className="text-xs font-bold text-slate-600">{formatMMK(stats.expenseB)}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs">
            <span className="text-slate-500">{lang === 'my' ? 'ကွာခြားငွေ:' : 'Difference:'} </span>
            <span
              className={`font-bold ${
                stats.diffExpense <= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {stats.diffExpense > 0 ? '+' : ''}
              {formatMMK(stats.diffExpense)}
            </span>
          </div>
        </div>

        {/* Total Income Comparison */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {lang === 'my' ? 'စုစုပေါင်း ဝင်ငွေ' : 'Total Income'}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                  stats.diffIncome >= 0
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {stats.diffIncome >= 0 ? (
                  <>
                    <TrendingUp className="w-3 h-3" />
                    <span>+{stats.percentDiffIncome}%</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-3 h-3" />
                    <span>{stats.percentDiffIncome}%</span>
                  </>
                )}
              </span>
            </div>

            <div className="mt-3">
              <div className="text-xs text-emerald-700 font-semibold flex items-center justify-between">
                <span>{lang === 'my' ? 'ကာလ (က):' : 'Period A:'}</span>
                <span className="text-base font-black text-slate-900">{formatMMK(stats.incomeA)}</span>
              </div>
              <div className="text-xs text-indigo-700 font-semibold flex items-center justify-between mt-1">
                <span>{lang === 'my' ? 'ကာလ (ခ):' : 'Period B:'}</span>
                <span className="text-xs font-bold text-slate-600">{formatMMK(stats.incomeB)}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs">
            <span className="text-slate-500">{lang === 'my' ? 'ကွာခြားငွေ:' : 'Difference:'} </span>
            <span
              className={`font-bold ${
                stats.diffIncome >= 0 ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {stats.diffIncome > 0 ? '+' : ''}
              {formatMMK(stats.diffIncome)}
            </span>
          </div>
        </div>

        {/* Net Savings Comparison */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {lang === 'my' ? 'စုဆောင်းနိုင်ငွေ (လက်ကျန်)' : 'Net Savings'}
              </span>
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  stats.netA >= 0 ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              />
            </div>

            <div className="mt-3">
              <div className="text-xs text-emerald-700 font-semibold flex items-center justify-between">
                <span>{lang === 'my' ? 'ကာလ (က):' : 'Period A:'}</span>
                <span
                  className={`text-base font-black ${
                    stats.netA >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {formatMMK(stats.netA)}
                </span>
              </div>
              <div className="text-xs text-indigo-700 font-semibold flex items-center justify-between mt-1">
                <span>{lang === 'my' ? 'ကာလ (ခ):' : 'Period B:'}</span>
                <span className="text-xs font-bold text-slate-600">{formatMMK(stats.netB)}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs">
            <span className="text-slate-500">{lang === 'my' ? 'ငွေစုနိုင်မှု ကွာခြားချက်:' : 'Net Difference:'} </span>
            <span
              className={`font-bold ${
                stats.netA - stats.netB >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {stats.netA - stats.netB > 0 ? '+' : ''}
              {formatMMK(stats.netA - stats.netB)}
            </span>
          </div>
        </div>

        {/* Top Changes Insight */}
        <div className="bg-gradient-to-br from-indigo-50/60 to-purple-50/30 rounded-2xl border border-indigo-100 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-900">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>{lang === 'my' ? 'အဓိက သုံးသပ်ချက်' : 'Key Highlights'}</span>
              </div>
              {plan === 'free' && (
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100/90 px-1.5 py-0.5 rounded">
                  {lang === 'my' ? 'Random ၂ ခု' : '2 Random Cats'}
                </span>
              )}
            </div>

            <div className="mt-3 space-y-2 text-xs">
              {activeHighlights.highestIncreaseCat ? (
                <div className="flex items-center justify-between gap-1">
                  <span className="text-rose-700 font-medium truncate">
                    ⬆️ {lang === 'my' ? activeHighlights.highestIncreaseCat.category?.name : activeHighlights.highestIncreaseCat.category?.nameEn}
                  </span>
                  <span className="font-bold text-rose-800 whitespace-nowrap">
                    +{formatMMK(activeHighlights.highestIncreaseCat.diff)}
                  </span>
                </div>
              ) : (
                <p className="text-slate-400 text-[11px]">{lang === 'my' ? 'သုံးစွဲငွေ တိုးလာသော ကဏ္ဍမရှိပါ' : 'No spending increase'}</p>
              )}

              {activeHighlights.highestSavingsCat ? (
                <div className="flex items-center justify-between gap-1">
                  <span className="text-emerald-700 font-medium truncate">
                    ⬇️ {lang === 'my' ? activeHighlights.highestSavingsCat.category?.name : activeHighlights.highestSavingsCat.category?.nameEn}
                  </span>
                  <span className="font-bold text-emerald-800 whitespace-nowrap">
                    {formatMMK(activeHighlights.highestSavingsCat.diff)}
                  </span>
                </div>
              ) : (
                <p className="text-slate-400 text-[11px]">{lang === 'my' ? 'သုံးစွဲငွေ လျော့ကျသော ကဏ္ဍမရှိပါ' : 'No spending decrease'}</p>
              )}
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-indigo-200/50 text-[11px] text-indigo-900">
            {stats.diffExpense < 0
              ? lang === 'my'
                ? `ကာလ (က) တွင် သုံးစွဲငွေ ${formatMMK(Math.abs(stats.diffExpense))} ပိုမိုသက်သာခဲ့ပါသည်`
                : `Saved ${formatMMK(Math.abs(stats.diffExpense))} in Period A`
              : lang === 'my'
              ? `ကာလ (က) တွင် သုံးစွဲငွေ ${formatMMK(stats.diffExpense)} ပိုမိုသုံးခဲ့ပါသည်`
              : `Spent ${formatMMK(stats.diffExpense)} more in Period A`}
          </div>
        </div>
      </div>

      {/* Visual Comparison: Top Categories Chart */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900">
                {lang === 'my' ? 'ကဏ္ဍအလိုက် နှိုင်းယှဉ် ဘားဇယား' : 'Visual Category Comparison Chart'}
              </h3>
              {plan === 'free' && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                  {lang === 'my' ? 'Random ၂ ခုသာ' : '2 Random Cats'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {lang === 'my'
                ? 'ကာလနှစ်ခုကြား ကဏ္ဍတစ်ခုချင်းစီ၏ သုံးစွဲငွေပမာဏကို မျက်မြင် နှိုင်းယှဉ်ချက်'
                : 'Side-by-side spending comparison for each category'}
            </p>
          </div>

          {/* Chart Legend */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-emerald-600" />
              <span className="font-semibold text-slate-700">
                {lang === 'my' ? 'ကာလ (က):' : 'Period A:'} {labelA}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-indigo-500" />
              <span className="font-semibold text-slate-700">
                {lang === 'my' ? 'ကာလ (ခ):' : 'Period B:'} {labelB}
              </span>
            </div>
          </div>
        </div>

        {displayedCategoryComparisons.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Info className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-xs">
              {lang === 'my'
                ? 'ရွေးချယ်ထားသော ကာလအတွင်း ထွက်ငွေမှတ်တမ်း မရှိသေးပါ'
                : 'No expense records found for the selected periods.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedCategoryComparisons.slice(0, 8).map((c) => {
              const widthPctA = maxBarAmount > 0 ? (c.amountA / maxBarAmount) * 100 : 0;
              const widthPctB = maxBarAmount > 0 ? (c.amountB / maxBarAmount) * 100 : 0;

              return (
                <div key={c.categoryId} className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 hover:border-slate-200 transition-all">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-6 h-6 rounded-md flex items-center justify-center text-white shrink-0"
                        style={{ backgroundColor: c.category?.color || '#94A3B8' }}
                      >
                        <CategoryIcon name={c.category?.icon || 'ShoppingCart'} className="w-3.5 h-3.5" />
                      </span>
                      <span className="font-bold text-slate-900">
                        {lang === 'my' ? c.category?.name : c.category?.nameEn}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`font-bold text-[11px] px-2 py-0.5 rounded-md ${
                          c.diff > 0
                            ? 'bg-rose-100 text-rose-700'
                            : c.diff < 0
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {c.diff > 0 ? `+${formatMMK(c.diff)} (+${c.pctChange}%)` : c.diff < 0 ? `${formatMMK(c.diff)} (${c.pctChange}%)` : '0 MMK (0%)'}
                      </span>
                    </div>
                  </div>

                  {/* Dual Comparative Bars */}
                  <div className="space-y-1.5 pl-8">
                    {/* Period A Bar */}
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="w-12 text-slate-500 font-medium shrink-0">
                        {lang === 'my' ? 'ကာလ (က)' : 'Period A'}
                      </span>
                      <div className="flex-1 h-3 bg-slate-200/80 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(widthPctA, 2)}%` }}
                        />
                      </div>
                      <span className="w-24 text-right font-bold text-slate-900 shrink-0">
                        {formatMMK(c.amountA)}
                      </span>
                    </div>

                    {/* Period B Bar */}
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="w-12 text-slate-500 font-medium shrink-0">
                        {lang === 'my' ? 'ကာလ (ခ)' : 'Period B'}
                      </span>
                      <div className="flex-1 h-3 bg-slate-200/80 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(widthPctB, 2)}%` }}
                        />
                      </div>
                      <span className="w-24 text-right font-semibold text-slate-600 shrink-0">
                        {formatMMK(c.amountB)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Teaser for remaining categories on Free plan */}
            {plan === 'free' && hiddenCategoriesCount > 0 && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-amber-950">
                      {lang === 'my'
                        ? `ကျန်ရှိသော ကဏ္ဍ (${hiddenCategoriesCount}) ခု၏ ဘားဇယားများကို ကြည့်ရန် Premium သို့မြှင့်ပါ`
                        : `Unlock remaining ${hiddenCategoriesCount} categories in chart with Premium`}
                    </span>
                    <p className="text-amber-800/80 text-[11px] mt-0.5">
                      {lang === 'my'
                        ? 'Free အဆင့်တွင် Random နမူနာ ၂ ခုသာ ပြသထားပါသည် (စိတ်ကြိုက်ရွေးခွင့်မရှိပါ)'
                        : 'Free plan displays only 2 random categories (manual selection locked).'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onOpenUpgradeModal}
                  className="px-3.5 py-1.5 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-2xs shrink-0 active:scale-95 transition-all text-xs inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{lang === 'my' ? 'ကဏ္ဍအားလုံး ဖွင့်မည်' : 'Unlock All Categories'}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detailed Category-by-Category & Sub-Category Comparison Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                {comparisonLevel === 'category'
                  ? lang === 'my' ? 'ကဏ္ဍ အလိုက် အသေးစိတ် နှိုင်းယှဉ်ချက်' : 'Detailed Category Breakdown'
                  : lang === 'my' ? 'ကဏ္ဍခွဲ အလိုက် အသေးစိတ် နှိုင်းယှဉ်ချက်' : 'Detailed Sub-Category Breakdown'}
              </h3>
              {plan === 'free' && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                  {lang === 'my' ? 'Free Plan ကန့်သတ်ချက်' : 'Free Limited'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {comparisonLevel === 'category'
                ? lang === 'my'
                  ? `စုစုပေါင်း ကဏ္ဍ (${filteredCategoryList.length}) ခု၏ အသုံးစရိတ် ကွာခြားချက်များ (ကဏ္ဍတစ်ခုချင်းကိုနှိပ်၍ ကဏ္ဍခွဲများကို ကြည့်နိုင်သည်)`
                  : `Showing ${filteredCategoryList.length} categories (click row to inspect sub-category breakdown)`
                : lang === 'my'
                ? `စုစုပေါင်း ကဏ္ဍခွဲ (${filteredSubCategoryList.length}) ခု၏ အသုံးစရိတ် နှိုင်းယှဉ်ချက်များ`
                : `Showing ${filteredSubCategoryList.length} sub-categories`}
            </p>
          </div>

          {/* Controls: Level Switcher (Category vs Sub-Category), Search and Sort */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Category / Sub-Category Level Toggle */}
            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-xs">
              <button
                type="button"
                onClick={() => setComparisonLevel('category')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  comparisonLevel === 'category'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {lang === 'my' ? '📁 ကဏ္ဍ အလိုက်' : '📁 Category'}
              </button>
              <button
                type="button"
                onClick={() => setComparisonLevel('subcategory')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  comparisonLevel === 'subcategory'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {lang === 'my' ? '🏷️ ကဏ္ဍခွဲ အလိုက်' : '🏷️ Sub-Category'}
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchCategory}
                disabled={plan === 'free'}
                onChange={(e) => setSearchCategory(e.target.value)}
                placeholder={
                  plan === 'free'
                    ? lang === 'my'
                      ? '🔒 Free: Random ၂ ခုသာ (ရွေးခွင့်မရှိ)'
                      : '🔒 Free: 2 Random categories'
                    : comparisonLevel === 'category'
                    ? lang === 'my'
                      ? 'ကဏ္ဍ အမည်ဖြင့် ရှာရန်...'
                      : 'Search category...'
                    : lang === 'my'
                    ? 'ကဏ္ဍခွဲ အမည်ဖြင့် ရှာရန်...'
                    : 'Search sub-category...'
                }
                className={`text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  plan === 'free' ? 'cursor-not-allowed opacity-75' : ''
                }`}
              />
              {plan === 'free' && (
                <button
                  type="button"
                  onClick={onOpenUpgradeModal}
                  title={lang === 'my' ? 'ရှာဖွေရန် Premium သို့မြှင့်ပါ' : 'Upgrade to search all'}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              )}
            </div>

            <div className="flex items-center gap-1 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                disabled={plan === 'free'}
                onChange={(e) => setSortBy(e.target.value as any)}
                className={`text-xs font-semibold px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none ${
                  plan === 'free' ? 'opacity-75 cursor-not-allowed' : ''
                }`}
              >
                <option value="amountA">{lang === 'my' ? 'ကာလ (က) အသုံးစရိတ် အများဆုံး' : 'Period A (High to Low)'}</option>
                <option value="amountB">{lang === 'my' ? 'ကာလ (ခ) အသုံးစရိတ် အများဆုံး' : 'Period B (High to Low)'}</option>
                <option value="diff">{lang === 'my' ? 'ကွာခြားငွေ အများဆုံး' : 'Highest Absolute Difference'}</option>
                <option value="percent_increase">{lang === 'my' ? 'တိုးလာမှု ရာခိုင်နှုန်း အများဆုံး' : 'Highest % Increase'}</option>
                <option value="percent_decrease">{lang === 'my' ? 'လျော့ကျမှု ရာခိုင်နှုန်း အများဆုံး' : 'Highest % Decrease'}</option>
                <option value="name">{lang === 'my' ? 'အက္ခရာစဉ် အလိုက်' : 'Name (A-Z)'}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table representation: Category or Sub-Category */}
        {comparisonLevel === 'category' ? (
          filteredCategoryList.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs">
              {lang === 'my' ? 'ကိုက်ညီသော ကဏ္ဍ ရှာမတွေ့ပါ' : 'No matching categories found.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px] bg-slate-50/50">
                    <th className="py-3 px-3 rounded-l-lg">{lang === 'my' ? 'ကဏ္ဍ' : 'Category'}</th>
                    <th className="py-3 px-3 text-right">
                      <span className="text-emerald-700">{lang === 'my' ? 'ကာလ (က)' : 'Period A'}</span>
                      <span className="block text-[9px] font-normal text-slate-400 truncate max-w-[120px]">{labelA}</span>
                    </th>
                    <th className="py-3 px-3 text-right">
                      <span className="text-indigo-700">{lang === 'my' ? 'ကာလ (ခ)' : 'Period B'}</span>
                      <span className="block text-[9px] font-normal text-slate-400 truncate max-w-[120px]">{labelB}</span>
                    </th>
                    <th className="py-3 px-3 text-right">{lang === 'my' ? 'ကွာခြားငွေ' : 'Difference'}</th>
                    <th className="py-3 px-3 text-center">{lang === 'my' ? 'ပြောင်းလဲမှု %' : 'Change %'}</th>
                    <th className="py-3 px-3 text-center rounded-r-lg">{lang === 'my' ? 'အခြေအနေ' : 'Trend'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCategoryList.map((item) => {
                    const isExpanded = expandedCatId === item.categoryId;
                    const matchingTxA = txA.filter((t) => t.category === item.categoryId && t.type === 'expense');
                    const matchingTxB = txB.filter((t) => t.category === item.categoryId && t.type === 'expense');
                    const subList = stats.subCategoryByCatMap?.get(item.categoryId) || [];

                    return (
                      <React.Fragment key={item.categoryId}>
                        <tr
                          onClick={() => setExpandedCatId(isExpanded ? null : item.categoryId)}
                          className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                        >
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-2.5">
                              <span
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 shadow-2xs"
                                style={{ backgroundColor: item.category?.color || '#94A3B8' }}
                              >
                                <CategoryIcon name={item.category?.icon || 'ShoppingCart'} className="w-4 h-4" />
                              </span>
                              <div>
                                <span className="font-bold text-slate-900 block group-hover:text-indigo-600 transition-colors">
                                  {lang === 'my' ? item.category?.name : item.category?.nameEn}
                                </span>
                                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                  <span>{subList.length} {lang === 'my' ? 'ကဏ္ဍခွဲ' : 'sub-cats'}</span>
                                  <span>•</span>
                                  <span>{lang === 'my' ? 'နှိပ်၍ အသေးစိတ်ကြည့်ရန်' : 'Click to inspect'}</span>
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Period A */}
                          <td className="py-3.5 px-3 text-right font-bold text-slate-900">
                            {formatMMK(item.amountA)}
                            <span className="block text-[10px] text-slate-400 font-normal">
                              {item.pctOfTotalA}% {lang === 'my' ? 'အသုံး' : 'of total'}
                            </span>
                          </td>

                          {/* Period B */}
                          <td className="py-3.5 px-3 text-right font-medium text-slate-600">
                            {formatMMK(item.amountB)}
                            <span className="block text-[10px] text-slate-400 font-normal">
                              {item.pctOfTotalB}% {lang === 'my' ? 'အသုံး' : 'of total'}
                            </span>
                          </td>

                          {/* Difference */}
                          <td className="py-3.5 px-3 text-right">
                            <span
                              className={`font-bold ${
                                item.diff > 0
                                  ? 'text-rose-600'
                                  : item.diff < 0
                                  ? 'text-emerald-600'
                                  : 'text-slate-500'
                              }`}
                            >
                              {item.diff > 0 ? '+' : ''}
                              {formatMMK(item.diff)}
                            </span>
                          </td>

                          {/* Percentage */}
                          <td className="py-3.5 px-3 text-center">
                            <span
                              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold ${
                                item.diff > 0
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : item.diff < 0
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {item.diff > 0 ? `+${item.pctChange}%` : item.diff < 0 ? `${item.pctChange}%` : '0%'}
                            </span>
                          </td>

                          {/* Status badge */}
                          <td className="py-3.5 px-3 text-center">
                            {item.diff > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700">
                                <TrendingUp className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{lang === 'my' ? 'သုံးစွဲငွေ တိုး' : 'Increased'}</span>
                              </span>
                            ) : item.diff < 0 ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                                <TrendingDown className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{lang === 'my' ? 'သုံးစွဲငွေ လျော့' : 'Decreased'}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                                <Minus className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{lang === 'my' ? 'တူညီပါသည်' : 'No change'}</span>
                              </span>
                            )}
                          </td>
                        </tr>

                        {/* Expandable Drill-down Row: Sub-Category Comparisons & Transactions */}
                        {isExpanded && (
                          <tr className="bg-slate-50/90 border-b border-slate-200">
                            <td colSpan={6} className="p-4 space-y-4">
                              {/* Sub-Category Breakdown in Category */}
                              {subList.length > 0 && (
                                <div className="bg-white p-3.5 rounded-2xl border border-indigo-100 shadow-2xs space-y-2.5">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-xs text-indigo-950 flex items-center gap-1.5">
                                      <Tag className="w-3.5 h-3.5 text-indigo-600" />
                                      <span>
                                        {lang === 'my'
                                          ? `"${item.category?.name}" အတွင်း ကဏ္ဍခွဲများ နှိုင်းယှဉ်ချက်`
                                          : `Sub-Category Breakdown for "${item.category?.nameEn || item.category?.name}"`}
                                      </span>
                                    </h4>
                                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                                      {subList.length} {lang === 'my' ? 'မျိုး' : 'sub-items'}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                                    {subList.map((sub) => (
                                      <div
                                        key={sub.key}
                                        className="p-2.5 bg-slate-50/90 rounded-xl border border-slate-200/80 space-y-1.5"
                                      >
                                        <div className="flex items-center justify-between text-xs">
                                          <span className="font-bold text-slate-900 truncate max-w-[140px]">
                                            {sub.name}
                                          </span>
                                          <span
                                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                              sub.diff > 0
                                                ? 'bg-rose-100 text-rose-700'
                                                : sub.diff < 0
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-slate-200 text-slate-700'
                                            }`}
                                          >
                                            {sub.diff > 0 ? `+${sub.pctChange}%` : sub.diff < 0 ? `${sub.pctChange}%` : '0%'}
                                          </span>
                                        </div>

                                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                                          <span>{lang === 'my' ? 'ကာလ (က)' : 'A'}: <strong className="text-emerald-700 font-bold">{formatMMK(sub.amountA)}</strong></span>
                                          <span>{lang === 'my' ? 'ကာလ (ခ)' : 'B'}: <strong className="text-indigo-700 font-bold">{formatMMK(sub.amountB)}</strong></span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Transaction Records List */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                {/* Period A transactions */}
                                <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-2xs">
                                  <h4 className="font-bold text-emerald-900 mb-2 flex items-center justify-between">
                                    <span>{lang === 'my' ? 'ကာလ (က) မှတ်တမ်းများ' : 'Period A Transactions'}</span>
                                    <span className="text-[10px] font-normal text-slate-500">
                                      {matchingTxA.length} {lang === 'my' ? 'ခု' : 'records'}
                                    </span>
                                  </h4>
                                  {matchingTxA.length === 0 ? (
                                    <p className="text-[11px] text-slate-400 py-1">{lang === 'my' ? 'စာရင်းမရှိပါ' : 'No records'}</p>
                                  ) : (
                                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                      {matchingTxA.map((t) => (
                                        <div key={t.id} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0 text-[11px]">
                                          <div>
                                            <span className="font-medium text-slate-800">{t.note || item.category?.name}</span>
                                            <span className="block text-[10px] text-slate-400">{formatDateDisplay(t.date)}</span>
                                          </div>
                                          <span className="font-bold text-slate-900">{formatMMK(t.amount)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Period B transactions */}
                                <div className="bg-white p-3 rounded-xl border border-indigo-200 shadow-2xs">
                                  <h4 className="font-bold text-indigo-900 mb-2 flex items-center justify-between">
                                    <span>{lang === 'my' ? 'ကာလ (ခ) မှတ်တမ်းများ' : 'Period B Transactions'}</span>
                                    <span className="text-[10px] font-normal text-slate-500">
                                      {matchingTxB.length} {lang === 'my' ? 'ခု' : 'records'}
                                    </span>
                                  </h4>
                                  {matchingTxB.length === 0 ? (
                                    <p className="text-[11px] text-slate-400 py-1">{lang === 'my' ? 'စာရင်းမရှိပါ' : 'No records'}</p>
                                  ) : (
                                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                      {matchingTxB.map((t) => (
                                        <div key={t.id} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0 text-[11px]">
                                          <div>
                                            <span className="font-medium text-slate-800">{t.note || item.category?.name}</span>
                                            <span className="block text-[10px] text-slate-400">{formatDateDisplay(t.date)}</span>
                                          </div>
                                          <span className="font-bold text-slate-900">{formatMMK(t.amount)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* Sub-Category Full Table */
          filteredSubCategoryList.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs">
              {lang === 'my' ? 'ကိုက်ညီသော ကဏ္ဍခွဲ ရှာမတွေ့ပါ' : 'No matching sub-categories found.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px] bg-slate-50/50">
                    <th className="py-3 px-3 rounded-l-lg">{lang === 'my' ? 'ကဏ္ဍခွဲ (Sub-Category)' : 'Sub-Category'}</th>
                    <th className="py-3 px-3">{lang === 'my' ? 'ပင်မကဏ္ဍ' : 'Parent Category'}</th>
                    <th className="py-3 px-3 text-right">
                      <span className="text-emerald-700">{lang === 'my' ? 'ကာလ (က)' : 'Period A'}</span>
                      <span className="block text-[9px] font-normal text-slate-400 truncate max-w-[120px]">{labelA}</span>
                    </th>
                    <th className="py-3 px-3 text-right">
                      <span className="text-indigo-700">{lang === 'my' ? 'ကာလ (ခ)' : 'Period B'}</span>
                      <span className="block text-[9px] font-normal text-slate-400 truncate max-w-[120px]">{labelB}</span>
                    </th>
                    <th className="py-3 px-3 text-right">{lang === 'my' ? 'ကွာခြားငွေ' : 'Difference'}</th>
                    <th className="py-3 px-3 text-center">{lang === 'my' ? 'ပြောင်းလဲမှု %' : 'Change %'}</th>
                    <th className="py-3 px-3 text-center rounded-r-lg">{lang === 'my' ? 'အခြေအနေ' : 'Trend'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSubCategoryList.map((item) => (
                    <tr key={item.key} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-3 font-bold text-slate-900">
                        {item.name}
                      </td>

                      {/* Parent Category Badge */}
                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">
                          <CategoryIcon name={item.category?.icon || 'Tag'} className="w-3 h-3 text-indigo-600" />
                          <span>{lang === 'my' ? item.category?.name : item.category?.nameEn}</span>
                        </span>
                      </td>

                      {/* Period A */}
                      <td className="py-3.5 px-3 text-right font-bold text-slate-900">
                        {formatMMK(item.amountA)}
                        <span className="block text-[10px] text-slate-400 font-normal">
                          {item.pctOfTotalA}% {lang === 'my' ? 'အသုံး' : 'of total'}
                        </span>
                      </td>

                      {/* Period B */}
                      <td className="py-3.5 px-3 text-right font-medium text-slate-600">
                        {formatMMK(item.amountB)}
                        <span className="block text-[10px] text-slate-400 font-normal">
                          {item.pctOfTotalB}% {lang === 'my' ? 'အသုံး' : 'of total'}
                        </span>
                      </td>

                      {/* Difference */}
                      <td className="py-3.5 px-3 text-right">
                        <span
                          className={`font-bold ${
                            item.diff > 0
                              ? 'text-rose-600'
                              : item.diff < 0
                              ? 'text-emerald-600'
                              : 'text-slate-500'
                          }`}
                        >
                          {item.diff > 0 ? '+' : ''}
                          {formatMMK(item.diff)}
                        </span>
                      </td>

                      {/* Percentage */}
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold ${
                            item.diff > 0
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : item.diff < 0
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {item.diff > 0 ? `+${item.pctChange}%` : item.diff < 0 ? `${item.pctChange}%` : '0%'}
                        </span>
                      </td>

                      {/* Status badge */}
                      <td className="py-3.5 px-3 text-center">
                        {item.diff > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700">
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{lang === 'my' ? 'သုံးစွဲငွေ တိုး' : 'Increased'}</span>
                          </span>
                        ) : item.diff < 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                            <TrendingDown className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{lang === 'my' ? 'သုံးစွဲငွေ လျော့' : 'Decreased'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                            <Minus className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{lang === 'my' ? 'တူညီပါသည်' : 'No change'}</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Premium Upgrade CTA Card when on Free Plan */}
        {plan === 'free' && (
          <div className="mt-6 p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white border border-indigo-900/60 shadow-lg relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-44 h-44 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-400 border border-amber-400/30 flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm sm:text-base text-white">
                      {lang === 'my'
                        ? `ကျန်ရှိသော ကဏ္ဍ (${hiddenCategoriesCount}) ခုနှင့် စိတ်ကြိုက် ကာလများ ဖွင့်လှစ်ရန်`
                        : `Unlock remaining ${hiddenCategoriesCount} categories & custom dates`}
                    </h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-400 text-slate-950 tracking-wider">
                      PREMIUM
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                    {lang === 'my'
                      ? 'Free အဆင့်တွင် လတ်တလော ၁ လစာနှင့် ကဏ္ဍ ၂ ခုသာ Random နမူနာ ကြည့်ရှုခွင့်ရှိပြီး စိတ်ကြိုက်ရွေးချယ်ခွင့်မရှိပါ။ Premium ဖြင့် ကဏ္ဍအားလုံး အပြည့်အစုံ၊ စိတ်ကြိုက် ရက်စွဲ/လများနှင့် အကန့်အသတ်မရှိ နှိုင်းယှဉ်စိစစ်နိုင်ပါသည်'
                      : 'Free plan is fixed to 1 month and shows 2 random categories with no manual selection. Upgrade to Premium to compare all categories across any custom date ranges.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenUpgradeModal}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-md active:scale-95 transition-all shrink-0"
              >
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>{lang === 'my' ? 'Premium သို့ အဆင့်မြှင့်မည် (၂,၀၀၀ MMK / လ)' : 'Upgrade to Premium (2,000 Ks/mo)'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
