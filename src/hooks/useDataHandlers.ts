import type { Dispatch, SetStateAction } from 'react';
import { doc } from 'firebase/firestore';
import { db, safeSetDoc, safeDeleteDoc } from '../lib/firebase';
import { safeSetItem } from '../utils/storage';
import { mergeAndCleanCategories } from '../utils/categoryCleanUp';
import { DEFAULT_PLAN_LIMITS } from '../data/initialData';
import { UNBUDGETED_CATEGORY_ID } from '../types';
import type {
  BudgetConfig,
  Category,
  PlanType,
  ShopContact,
  SubCategory,
  Transaction,
} from '../types';

interface UseDataHandlersParams {
  user: { uid: string; email?: string | null } | null;
  activeWorkspaceId: string | null | undefined;
  plan: PlanType;
  lang: 'my' | 'en';
  showToast: (msg: string) => void;
  setIsPremiumModalOpen: (open: boolean) => void;
  categories: Category[];
  setCategories: Dispatch<SetStateAction<Category[]>>;
  transactions: Transaction[];
  setTransactions: Dispatch<SetStateAction<Transaction[]>>;
  budgets: BudgetConfig[];
  setBudgets: Dispatch<SetStateAction<BudgetConfig[]>>;
  shops: ShopContact[];
  setShops: Dispatch<SetStateAction<ShopContact[]>>;
}

/**
 * Data handlers — extracted from App.tsx (Phase 3 refactor).
 * Covers: Shops, Budgets, Categories, Sub-categories, Category merge/cleanup.
 */
export function useDataHandlers({
  user,
  activeWorkspaceId,
  plan,
  lang,
  showToast,
  setIsPremiumModalOpen,
  categories,
  setCategories,
  transactions,
  setTransactions,
  budgets,
  setBudgets,
  shops,
  setShops,
}: UseDataHandlersParams) {

  // [v7.5.55] safe* Firestore calls return false on failure — surface it
  // with a toast instead of silently assuming the cloud write succeeded.
  const reportCloudWrite = (p: Promise<boolean>) => {
    p.then((ok) => {
      if (!ok) {
        showToast(lang === 'my' ? 'Cloud သို့ သိမ်းဆည်း၍ မရပါ — အင်တာနက်စစ်ပြီး ထပ်ကြိုးစားပါ' : 'Could not save to cloud — check connection and retry');
      }
    }).catch(() => {
      showToast(lang === 'my' ? 'Cloud သို့ သိမ်းဆည်း၍ မရပါ — အင်တာနက်စစ်ပြီး ထပ်ကြိုးစားပါ' : 'Could not save to cloud — check connection and retry');
    });
  };
  // [v7.5.55] Custom categories are Premium-only per the limits table
  // (hasCustomCategories false for guest/free) — read the CURRENT plan's row.
  const canUseCustomCategories = DEFAULT_PLAN_LIMITS[plan]?.hasCustomCategories === true;

  // [v7.5.55 C5, private half] The private-shop saves are async and return
  // whether the save really landed: the cloud write is awaited BEFORE the
  // success toast, so a failed write shows an error instead of fake
  // success. The local list is updated immediately (the user's data stays
  // visible on this device) and safe* enqueues the write in syncQueue for
  // retry, so a false here means "not in the cloud yet", not "lost".
  const handleAddShop = async (shopData: Omit<ShopContact, 'id' | 'userId' | 'createdAt'>): Promise<boolean> => {
    const id = `shop_${Date.now()}`;
    const newShop: ShopContact = {
      ...shopData,
      id,
      userId: user?.uid || 'guest',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
      lastEditedBy: user?.uid || 'guest',
    };
    setShops((prev) => [newShop, ...prev]);

    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      const ok = await safeSetDoc(doc(db, 'users', targetUid, 'shops', id), {
        ...newShop,
        userId: targetUid,
      }, { merge: true });
      if (!ok) {
        showToast(lang === 'my' ? 'Cloud သို့ သိမ်းဆည်း၍ မရပါ — အင်တာနက်စစ်ပြီး ထပ်ကြိုးစားပါ' : 'Could not save to cloud — check connection and retry');
        return false;
      }
    }

    showToast(lang === 'my' ? 'ဆိုင်အသစ် ထည့်သွင်းပြီးပါပြီ ✓' : 'Shop added successfully ✓');
    return true;
  };

  const handleUpdateShop = async (updatedShop: ShopContact): Promise<boolean> => {
    updatedShop = { ...updatedShop, updatedAt: Date.now(), version: (updatedShop.version || 0) + 1, lastEditedBy: user?.uid || 'guest' };
    setShops((prev) =>
      prev.map((s) => (s.id === updatedShop.id ? updatedShop : s))
    );

    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      const ok = await safeSetDoc(doc(db, 'users', targetUid, 'shops', updatedShop.id), {
        ...updatedShop,
        userId: targetUid,
      }, { merge: true });
      if (!ok) {
        showToast(lang === 'my' ? 'Cloud သို့ သိမ်းဆည်း၍ မရပါ — အင်တာနက်စစ်ပြီး ထပ်ကြိုးစားပါ' : 'Could not save to cloud — check connection and retry');
        return false;
      }
    }

    showToast(lang === 'my' ? 'ဆိုင်အချက်အလက် ပြင်ဆင်ပြီးပါပြီ ✓' : 'Shop updated successfully ✓');
    return true;
  };

  const handleDeleteShop = async (shopId: string): Promise<boolean> => {
    setShops((prev) => prev.filter((s) => s.id !== shopId));

    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      const ok = await safeDeleteDoc(doc(db, 'users', targetUid, 'shops', shopId));
      if (!ok) {
        showToast(lang === 'my' ? 'Cloud မှ ဖျက်၍ မရပါ — အင်တာနက်စစ်ပြီး ထပ်ကြိုးစားပါ' : 'Could not delete from cloud — check connection and retry');
        return false;
      }
    }

    showToast(lang === 'my' ? 'ဆိုင်အချက်အလက် ဖျက်ပြီးပါပြီ ✓' : 'Shop deleted successfully ✓');
    return true;
  };

  const handleAddBudget = (config: BudgetConfig) => {
    setBudgets((prev) => {
      const filtered = prev.filter((b) => b.categoryId !== config.categoryId);
      return [...filtered, { ...config, updatedAt: Date.now(), version: 1, lastEditedBy: user?.uid || 'guest' }];
    });
    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      reportCloudWrite(safeSetDoc(doc(db, 'users', targetUid, 'budgets', config.categoryId), {
        ...config,
        userId: targetUid,
      }, { merge: true }));
    }
  };

  const handleUpdateBudget = (config: BudgetConfig) => {
    // [v7.5.55 D7] Upsert: if no budget with this categoryId exists yet
    // (e.g. "+ Add General Budget" pre-fills cat_general_unbudgeted),
    // insert it instead of silently changing nothing via a pure map().
    setBudgets((prev) => {
      const exists = prev.some((b) => b.categoryId === config.categoryId);
      if (!exists) {
        return [...prev, { ...config, updatedAt: Date.now(), version: 1, lastEditedBy: user?.uid || 'guest' }];
      }
      return prev.map((b) => (b.categoryId === config.categoryId ? { ...config, updatedAt: Date.now(), version: (b.version || 0) + 1, lastEditedBy: user?.uid || 'guest' } : b));
    });
    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      reportCloudWrite(safeSetDoc(doc(db, 'users', targetUid, 'budgets', config.categoryId), {
        ...config,
        userId: targetUid,
      }, { merge: true }));
    }
  };

  const handleDeleteBudget = (categoryId: string) => {
    setBudgets((prev) => prev.filter((b) => b.categoryId !== categoryId));
    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      reportCloudWrite(safeDeleteDoc(doc(db, 'users', targetUid, 'budgets', categoryId)));
    }
  };

  const handleAddCategory = (newCat: Omit<Category, 'id'>) => {
    if (!canUseCustomCategories) {
      setIsPremiumModalOpen(true);
      return;
    }
    const cat: Category = {
      ...newCat,
      id: `cat_custom_${Date.now()}`,
      updatedAt: Date.now(),
      version: 1,
      lastEditedBy: user?.uid || 'guest',
    };
    const nextCategories = [...categories, cat];
    setCategories(nextCategories);
    safeSetItem('ngwe_categories', JSON.stringify(nextCategories));
    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      reportCloudWrite(safeSetDoc(doc(db, 'users', targetUid, 'categories', cat.id), {
        ...cat,
        userId: targetUid,
      }, { merge: true }));
    }
    showToast(
      lang === 'my'
        ? `ကဏ္ဍသစ် "${cat.name}" ကို အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ`
        : `Created custom category "${cat.name}"`
    );
  };

  const handleUpdateCategory = (updatedCat: Category) => {
    updatedCat = { ...updatedCat, updatedAt: Date.now(), version: (updatedCat.version || 0) + 1, lastEditedBy: user?.uid || 'guest' };
    if (!canUseCustomCategories) {
      setIsPremiumModalOpen(true);
      return;
    }
    const nextCategories = categories.map((c) => (c.id === updatedCat.id ? updatedCat : c));
    setCategories(nextCategories);
    safeSetItem('ngwe_categories', JSON.stringify(nextCategories));
    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      reportCloudWrite(safeSetDoc(doc(db, 'users', targetUid, 'categories', updatedCat.id), {
        ...updatedCat,
        userId: targetUid,
      }, { merge: true }));
    }
    showToast(
      lang === 'my'
        ? `ကဏ္ဍ "${updatedCat.name}" ကို ပြင်ဆင်ပြီးပါပြီ`
        : `Updated category "${updatedCat.name}"`
    );
  };

  // [v7.5.60 M1] The delete confirm now lives in CategoriesView (inline
  // dialog with the real record count + fallback name) — this handler no
  // longer asks again with window.confirm.
  const handleDeleteCategory = (categoryId: string) => {
    if (!canUseCustomCategories) {
      setIsPremiumModalOpen(true);
      return;
    }

    const catToDelete = categories.find((c) => c.id === categoryId);
    if (!catToDelete) return;

    const relatedTxs = transactions.filter((t) => t.category === categoryId);

    if (relatedTxs.length > 0) {
       // [v7.5.60 M1] Reassign to the matching "Other" category EXACTLY —
       // never the first category of the type (that was cat_transfer for
       // expenses, and transfer txs are excluded from income/expense
       // totals, so the old fallback silently dropped these records
       // from every total). Only when the Other category itself is gone
       // do we fall back to the unbudgeted category.
       const otherId = catToDelete.type === 'income' ? 'cat_income_other' : 'cat_expense_other';
       const fallbackCat = categories.find((c) => c.id === otherId);
       const fallbackId = fallbackCat ? fallbackCat.id : UNBUDGETED_CATEGORY_ID;

       const nextTransactions = transactions.map((t) => {
         if (t.category === categoryId) {
           return { ...t, category: fallbackId, categoryId: fallbackId, subCategoryId: undefined };
         }
         return t;
       });
       setTransactions(nextTransactions);
       safeSetItem('ngwe_transactions', JSON.stringify(nextTransactions));
       // [v7.5.60 M1] The reassigned txs must move in the cloud too, or
       // the next cloud load would resurrect the old category on them.
       if (user?.uid) {
         const targetUid = activeWorkspaceId || user.uid;
         relatedTxs.forEach((t) => {
           reportCloudWrite(safeSetDoc(doc(db, 'users', targetUid, 'transactions', t.id), {
             ...t,
             category: fallbackId,
             categoryId: fallbackId,
             subCategoryId: undefined,
             userId: targetUid,
           }, { merge: true }));
         });
       }
    }
    
    const nextCategories = categories.filter((c) => c.id !== categoryId);
    setCategories(nextCategories);
    safeSetItem('ngwe_categories', JSON.stringify(nextCategories));
    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      reportCloudWrite(safeDeleteDoc(doc(db, 'users', targetUid, 'categories', categoryId)));
    }
    showToast(
      lang === 'my'
        ? `ကဏ္ဍ "${catToDelete.name}" ကို ဖျက်ပြီးပါပြီ`
        : `Deleted category "${catToDelete.name}"`
    );
  };

  const handleAddSubCategory = (categoryId: string, newSub: Omit<SubCategory, 'id'>) => {
    const subCat: SubCategory = {
      ...newSub,
      id: `sub_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    };
    let updatedParent: Category | null = null;
    let nextCategories: Category[] = [];
    setCategories((prev) => {
      nextCategories = prev.map((c) => {
        if (c.id === categoryId) {
          const existing = c.subCategories || [];
          updatedParent = {
            ...c,
            subCategories: [...existing, subCat],
            updatedAt: Date.now(),
            version: (c.version || 0) + 1,
            lastEditedBy: user?.uid || 'guest',
          };
          return updatedParent;
        }
        return c;
      });
      return nextCategories;
    });
    safeSetItem('ngwe_categories', JSON.stringify(nextCategories));
    if (user?.uid && updatedParent) {
      const targetUid = activeWorkspaceId || user.uid;
      reportCloudWrite(safeSetDoc(doc(db, 'users', targetUid, 'categories', categoryId), {
        ...(updatedParent as Category),
        userId: targetUid,
      }, { merge: true }));
    }
    showToast(
      lang === 'my'
        ? `ကဏ္ဍခွဲ "${subCat.name}" ကို အသစ်ထည့်သွင်းပြီးပါပြီ`
        : `Added sub-category "${subCat.name}"`
    );
  };

  const handleDeleteSubCategory = (categoryId: string, subCategoryId: string) => {
    // [v7.5.60 M2] Name resolved from the current props (not from the
    // setCategories updater, which runs later) so the toast can use it.
    const deletedSub = categories
      .find((c) => c.id === categoryId)
      ?.subCategories?.find((s) => s.id === subCategoryId);
    const deletedName = deletedSub?.name || '';
    let updatedParent: Category | null = null;
    let nextCategories: Category[] = [];
    setCategories((prev) => {
      nextCategories = prev.map((c) => {
        if (c.id === categoryId) {
          updatedParent = {
            ...c,
            subCategories: (c.subCategories || []).filter((s) => s.id !== subCategoryId),
            updatedAt: Date.now(),
            version: (c.version || 0) + 1,
            lastEditedBy: user?.uid || 'guest',
          };
          return updatedParent;
        }
        return c;
      });
      return nextCategories;
    });
    safeSetItem('ngwe_categories', JSON.stringify(nextCategories));
    if (user?.uid && updatedParent) {
      const targetUid = activeWorkspaceId || user.uid;
      reportCloudWrite(safeSetDoc(doc(db, 'users', targetUid, 'categories', categoryId), {
        ...(updatedParent as Category),
        userId: targetUid,
      }, { merge: true }));
    }
    // [v7.5.60 M2] Clear the deleted sub-category from every tx that
    // used it — otherwise those txs keep a dangling subCategoryId and
    // silently lose their sub-category label. The parent category stays.
    const affectedTxs = transactions.filter((t) => t.subCategoryId === subCategoryId);
    if (affectedTxs.length > 0) {
      const nextTransactions = transactions.map((t) =>
        t.subCategoryId === subCategoryId ? { ...t, subCategoryId: undefined } : t
      );
      setTransactions(nextTransactions);
      safeSetItem('ngwe_transactions', JSON.stringify(nextTransactions));
      if (user?.uid) {
        const targetUid = activeWorkspaceId || user.uid;
        affectedTxs.forEach((t) => {
          reportCloudWrite(safeSetDoc(doc(db, 'users', targetUid, 'transactions', t.id), {
            ...t,
            subCategoryId: undefined,
            userId: targetUid,
          }, { merge: true }));
        });
      }
    }
    if (deletedName) {
      showToast(
        lang === 'my'
          ? affectedTxs.length > 0
            ? `ကဏ္ဍခွဲ "${deletedName}" ကို ဖျက်ပြီး မှတ်တမ်း ${affectedTxs.length} ခုမှ ကဏ္ဍခွဲ ဖယ်ရှားပြီးပါပြီ`
            : `ကဏ္ဍခွဲ "${deletedName}" ကို ဖျက်ပြီးပါပြီ`
          : affectedTxs.length > 0
            ? `Deleted sub-category "${deletedName}" and cleared it from ${affectedTxs.length} transaction(s)`
            : `Deleted sub-category "${deletedName}"`
      );
    }
  };

  const handleUpdateSubCategory = (categoryId: string, updatedSub: SubCategory) => {
    let updatedParent: Category | null = null;
    let nextCategories: Category[] = [];
    setCategories((prev) => {
      nextCategories = prev.map((c) => {
        if (c.id === categoryId) {
          updatedParent = {
            ...c,
            subCategories: (c.subCategories || []).map((s) =>
              s.id === updatedSub.id ? updatedSub : s
            ),
            updatedAt: Date.now(),
            version: (c.version || 0) + 1,
            lastEditedBy: user?.uid || 'guest',
          };
          return updatedParent;
        }
        return c;
      });
      return nextCategories;
    });
    safeSetItem('ngwe_categories', JSON.stringify(nextCategories));
    if (user?.uid && updatedParent) {
      const targetUid = activeWorkspaceId || user.uid;
      reportCloudWrite(safeSetDoc(doc(db, 'users', targetUid, 'categories', categoryId), {
        ...(updatedParent as Category),
        userId: targetUid,
      }, { merge: true }));
    }
    showToast(
      lang === 'my'
        ? `ကဏ္ဍခွဲ "${updatedSub.name}" ကို ပြင်ဆင်ပြီးပါပြီ`
        : `Updated sub-category "${updatedSub.name}"`
    );
  };

  const handleMergeAndCleanCategories = () => {
    const prevCategoryMap = new Map<string, string>(categories.map((c) => [c.id, JSON.stringify(c)]));
    const prevTxMap = new Map<string, string>(transactions.map((t) => [t.id, JSON.stringify(t)]));

    const result = mergeAndCleanCategories(
      categories,
      transactions,
      budgets
    );

    if (result.mergedCount === 0) {
      showToast(
        lang === 'my'
          ? 'ထပ်နေသော သို့မဟုတ် ပေါင်းစပ်ရန် ကဏ္ဍများ မရှိတော့ပါ (အားလုံး ရှင်းလင်းပြီးဖြစ်ပါသည်)'
          : 'No duplicate or redundant categories found (all clean!)'
      );
      return;
    }

    setCategories(result.cleanedCategories);
    setTransactions(result.updatedTransactions);
    setBudgets(result.updatedBudgets);

    safeSetItem('ngwe_categories', JSON.stringify(result.cleanedCategories));
    safeSetItem('ngwe_transactions', JSON.stringify(result.updatedTransactions));
    safeSetItem('ngwe_budgets', JSON.stringify(result.updatedBudgets));

    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      result.cleanedCategories.forEach((cat) => {
        const prevJson = prevCategoryMap.get(cat.id);
        const currJson = JSON.stringify(cat);
        if (prevJson !== currJson) {
          reportCloudWrite(safeSetDoc(doc(db, 'users', targetUid, 'categories', cat.id), {
            ...cat,
            userId: targetUid,
          }, { merge: true }));
        }
      });
      result.updatedTransactions.forEach((tx) => {
        if (tx.id) {
          const prevJson = prevTxMap.get(tx.id);
          const currJson = JSON.stringify(tx);
          if (prevJson !== currJson) {
            reportCloudWrite(safeSetDoc(doc(db, 'users', targetUid, 'transactions', tx.id), {
              ...tx,
              userId: targetUid,
            }, { merge: true }));
          }
        }
      });
    }

    showToast(
      lang === 'my'
        ? `ကဏ္ဍ ${result.mergedCount} ခုကို အောင်မြင်စွာ ပေါင်းစပ်ရှင်းလင်းပြီးပါပြီ`
        : `Successfully merged and cleaned up ${result.mergedCount} categories!`
    );
  };


  return {
    handleAddShop,
    handleUpdateShop,
    handleDeleteShop,
    handleAddBudget,
    handleUpdateBudget,
    handleDeleteBudget,
    handleAddCategory,
    handleUpdateCategory,
    handleDeleteCategory,
    handleAddSubCategory,
    handleUpdateSubCategory,
    handleDeleteSubCategory,
    handleMergeAndCleanCategories,
  };
}
