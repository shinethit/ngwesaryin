import { Category, Transaction, BudgetConfig, RecurringTransaction } from '../types';

export interface MergeResult {
  cleanedCategories: Category[];
  updatedTransactions: Transaction[];
  updatedBudgets: BudgetConfig[];
  updatedRecurringTransactions?: RecurringTransaction[];
  mergedCount: number;
  mergedDetails: string[];
}

/**
 * Standard known category merges to simplify and clean up redundant categories:
 * - cat_groceries (ကုန်စုံနှင့် စားသောက်ကုန်) -> cat_food (အစားအသောက်နှင့် ကုန်စုံ / Food & Groceries)
 * - cat_phone (ဖုန်းဘေလ် / အင်တာနက်) -> cat_utilities (အိမ်စရိတ်နှင့် ဘေလ်များ / Bills & Utilities)
 */
export const KNOWN_CATEGORY_MERGES: Record<string, string> = {
  cat_groceries: 'cat_food',
  cat_phone: 'cat_utilities',
};

export const DEFAULT_VEHICLE_CATEGORY: Category = {
  id: 'cat_vehicle',
  name: 'ယာဉ်စီမံခန့်ခွဲမှု',
  nameEn: 'Vehicle Management',
  type: 'expense',
  icon: 'Car',
  color: '#0284C7',
  subCategories: [
    { id: 'sub_veh_fuel', name: 'စက်သုံးဆီ (ဓာတ်ဆီ/ဒီဇယ်)', nameEn: 'Fuel & Petrol' },
    { id: 'sub_veh_maintenance', name: 'ပြုပြင်ထိန်းသိမ်းမှု / ဝန်ဆောင်ခ', nameEn: 'Maintenance & Service' },
    { id: 'sub_veh_parts', name: 'အပိုပစ္စည်းနှင့် ဆီလဲလှယ်ခြင်း', nameEn: 'Spare Parts & Engine Oil' },
    { id: 'sub_veh_tire', name: 'တာယာနှင့် လေဖိအား', nameEn: 'Tires & Wheel Alignment' },
    { id: 'sub_veh_wash', name: 'ကားဆေး / သန့်ရှင်းရေး', nameEn: 'Car Wash & Detailing' },
    { id: 'sub_veh_license', name: 'လိုင်စင် / အခွန်နှင့် အာမခံ', nameEn: 'License, Tax & Insurance' },
  ],
};

// Target category enhanced metadata after merge
const TARGET_CATEGORY_ENHANCEMENTS: Record<string, Partial<Category>> = {
  cat_food: {
    name: 'အစားအသောက်နှင့် ကုန်စုံ',
    nameEn: 'Food & Groceries',
  },
  cat_utilities: {
    name: 'အိမ်စရိတ်နှင့် ဘေလ်များ',
    nameEn: 'Bills & Utilities',
  },
  cat_transport: {
    name: 'ခရီးစရိတ်နှင့် လမ်းစရိတ်',
    nameEn: 'Transportation & Travel',
    icon: 'Bus',
  },
};

function normalizeName(str: string): string {
  return str.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Clean up duplicate categories and merge redundant categories:
 * 1. Merges known redundant categories (Groceries -> Food, Phone -> Utilities)
 * 2. Merges duplicate categories with identical or near-identical names within the same type
 * 3. Preserves all subcategories from merged categories without duplicates
 * 4. Migrates all transaction and budget references so no data is lost
 */
export function mergeAndCleanCategories(
  categories: Category[],
  transactions: Transaction[] = [],
  budgets: BudgetConfig[] = [],
  recurringTransactions: RecurringTransaction[] = []
): MergeResult {
  let mergedCount = 0;
  const mergedDetails: string[] = [];

  // Map of oldCategoryId -> targetCategoryId
  const idRedirectionMap = new Map<string, string>();

  // Deep clone categories to manipulate
  let workingCategories: Category[] = categories.map((c) => ({
    ...c,
    subCategories: [...(c.subCategories || [])],
  }));

  // 1. Process known merges (cat_groceries -> cat_food, cat_phone -> cat_utilities)
  for (const [sourceId, targetId] of Object.entries(KNOWN_CATEGORY_MERGES)) {
    const sourceCat = workingCategories.find((c) => c.id === sourceId);
    const targetCat = workingCategories.find((c) => c.id === targetId);

    if (sourceCat && targetCat && sourceId !== targetId) {
      idRedirectionMap.set(sourceId, targetId);
      mergedCount++;
      mergedDetails.push(`"${sourceCat.name}" ကို "${targetCat.name}" သို့ ပေါင်းစပ်ပြီးပါပြီ`);

      // Enhance target category name if defined
      if (TARGET_CATEGORY_ENHANCEMENTS[targetId]) {
        Object.assign(targetCat, TARGET_CATEGORY_ENHANCEMENTS[targetId]);
      }

      // Merge subcategories from source to target
      const existingSubNames = new Set(
        (targetCat.subCategories || []).map((s) => normalizeName(s.name))
      );

      (sourceCat.subCategories || []).forEach((sourceSub) => {
        if (!existingSubNames.has(normalizeName(sourceSub.name))) {
          targetCat.subCategories = targetCat.subCategories || [];
          targetCat.subCategories.push({
            ...sourceSub,
            id: sourceSub.id || `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          });
          existingSubNames.add(normalizeName(sourceSub.name));
        }
      });

      // Remove source category
      workingCategories = workingCategories.filter((c) => c.id !== sourceId);
    }
  }

  // 2. Process duplicate categories with matching names within the same type (expense or income)
  const seenNameMap = new Map<string, Category>();

  const finalCategories: Category[] = [];

  for (const cat of workingCategories) {
    const key = `${cat.type}_${normalizeName(cat.name)}`;
    const existing = seenNameMap.get(key);

    if (existing && existing.id !== cat.id) {
      // Duplicate found! Merge cat into existing
      idRedirectionMap.set(cat.id, existing.id);
      mergedCount++;
      mergedDetails.push(`ထပ်နေသော "${cat.name}" ကို ပေါင်းစပ်ရှင်းလင်းပြီးပါပြီ`);

      // Merge subcategories
      const existingSubNames = new Set(
        (existing.subCategories || []).map((s) => normalizeName(s.name))
      );

      (cat.subCategories || []).forEach((sub) => {
        if (!existingSubNames.has(normalizeName(sub.name))) {
          existing.subCategories = existing.subCategories || [];
          existing.subCategories.push({
            ...sub,
            id: sub.id || `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          });
          existingSubNames.add(normalizeName(sub.name));
        }
      });
    } else {
      seenNameMap.set(key, cat);
      finalCategories.push(cat);
    }
  }

  // Also deduplicate subcategories inside each category
  finalCategories.forEach((cat) => {
    if (cat.subCategories && cat.subCategories.length > 0) {
      const seenSubs = new Set<string>();
      cat.subCategories = cat.subCategories.filter((sub) => {
        const norm = normalizeName(sub.name);
        if (seenSubs.has(norm)) {
          return false;
        }
        seenSubs.add(norm);
        return true;
      });
    }
  });

  // Ensure dedicated Vehicle Management category exists and decouple from Transport
  const hasVehicleCat = finalCategories.some(
    (c) => c.id === 'cat_vehicle' || c.name.includes('ယာဉ်စီမံ') || (c.nameEn && c.nameEn.toLowerCase().includes('vehicle management'))
  );

  if (!hasVehicleCat) {
    finalCategories.push({ ...DEFAULT_VEHICLE_CATEGORY });
    mergedDetails.push('သီးသန့် "ယာဉ်စီမံခန့်ခွဲမှု" (Vehicle Management) Category အသစ်ကို ထည့်သွင်းပေးပြီးပါပြီ');
  }

  // Update Transport category to be strictly separate from vehicle management
  const transportCat = finalCategories.find((c) => c.id === 'cat_transport');
  if (transportCat) {
    transportCat.name = 'ခရီးစရိတ်နှင့် လမ်းစရိတ်';
    transportCat.nameEn = 'Transportation & Travel';
    transportCat.icon = 'Bus';
    if (transportCat.subCategories) {
      // Remove fuel and vehicle repair from transport, keeping taxi, bus, flight, ferry, toll
      transportCat.subCategories = transportCat.subCategories.filter(
        (s) => !normalizeName(s.name).includes('ဆီဖိုး') && !normalizeName(s.name).includes('ယာဉ်ပြုပြင်')
      );
      const subNames = new Set(transportCat.subCategories.map((s) => normalizeName(s.name)));
      if (!subNames.has(normalizeName('လေယာဉ် / အဝေးပြေးကား'))) {
        transportCat.subCategories.push({
          id: 'sub_trans_flight',
          name: 'လေယာဉ် / အဝေးပြေးကား',
          nameEn: 'Flight & Long-distance Coach',
        });
      }
      if (!subNames.has(normalizeName('ဖယ်ရီ / သင်္ဘော'))) {
        transportCat.subCategories.push({
          id: 'sub_trans_ferry',
          name: 'ဖယ်ရီ / သင်္ဘော',
          nameEn: 'Ferry & Water Transit',
        });
      }
      if (!subNames.has(normalizeName('တံတားကြေး / လမ်းကြေး / Gate ကြေး'))) {
        transportCat.subCategories.push({
          id: 'sub_trans_toll',
          name: 'တံတားကြေး / လမ်းကြေး / Gate ကြေး',
          nameEn: 'Toll & Gate Fees',
        });
      }
    }
  }

  // 3. Update transactions referencing old/merged category IDs & Migrate vehicle logs from transport to cat_vehicle
  let updatedTransactions = transactions.map((tx) => {
    let currentCat = tx.category;
    const redirectedId = idRedirectionMap.get(currentCat);
    if (redirectedId) {
      currentCat = redirectedId;
    }

    // Automatically decouple any prior vehicle transactions from transport
    const isVehicleTx =
      tx.note?.includes('[ဆီထည့်စရိတ်]') ||
      tx.note?.includes('[ယာဉ်ပြုပြင်ထိန်းသိမ်းစရိတ်]') ||
      tx.note?.includes('[တာယာလေထိုး/စစ်ဆေးခ]') ||
      tx.id?.startsWith('tx_fuel_') ||
      tx.id?.startsWith('tx_maint_') ||
      tx.id?.startsWith('tx_tire_');

    if (isVehicleTx && (currentCat === 'cat_transport' || !currentCat)) {
      currentCat = 'cat_vehicle';
    }

    if (currentCat !== tx.category) {
      return {
        ...tx,
        category: currentCat,
        categoryId: currentCat,
      };
    }
    return tx;
  });

  // 4. Update budgets referencing old/merged category IDs
  let updatedBudgets = budgets;
  if (idRedirectionMap.size > 0) {
    const budgetMap = new Map<string, BudgetConfig>();

    budgets.forEach((b) => {
      const targetId = idRedirectionMap.get(b.categoryId) || b.categoryId;
      const existingBudget = budgetMap.get(targetId);

      if (existingBudget) {
        // Merge budgets if both fixed
        if (existingBudget.calcType === 'fixed' && b.calcType === 'fixed') {
          budgetMap.set(targetId, {
            ...existingBudget,
            value: existingBudget.value + b.value,
          });
        }
      } else {
        budgetMap.set(targetId, {
          ...b,
          categoryId: targetId,
        });
      }
    });

    updatedBudgets = Array.from(budgetMap.values());
  }

  // 5. Update recurring transactions
  let updatedRecurring = recurringTransactions;
  if (idRedirectionMap.size > 0 && recurringTransactions.length > 0) {
    updatedRecurring = recurringTransactions.map((rt) => {
      const targetId = idRedirectionMap.get(rt.category);
      if (targetId) {
        return {
          ...rt,
          category: targetId,
        };
      }
      return rt;
    });
  }

  return {
    cleanedCategories: finalCategories,
    updatedTransactions,
    updatedBudgets,
    updatedRecurringTransactions: updatedRecurring,
    mergedCount,
    mergedDetails,
  };
}
