import type { Dispatch, SetStateAction } from 'react';
import { doc } from 'firebase/firestore';
import { db, safeSetDoc, safeDeleteDoc } from '../lib/firebase';
import { safeSetItem } from '../utils/storage';
import { mergeAndCleanCategories } from '../utils/categoryCleanUp';
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

  const handleAddShop = (shopData: Omit<ShopContact, 'id' | 'userId' | 'createdAt'>) => {
    const id = `shop_${Date.now()}`;
    const newShop: ShopContact = {
      ...shopData,
      id,
      userId: user?.uid || 'guest',
      createdAt: Date.now(),
    };
    setShops((prev) => [newShop, ...prev]);

    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      safeSetDoc(doc(db, 'users', targetUid, 'shops', id), {
        ...newShop,
        userId: targetUid,
      }, { merge: true });
    }

    showToast(lang === 'my' ? 'ဆိုင်အသစ် ထည့်သွင်းပြီးပါပြီ ✓' : 'Shop added successfully ✓');
  };

  const handleUpdateShop = (updatedShop: ShopContact) => {
    setShops((prev) =>
      prev.map((s) => (s.id === updatedShop.id ? updatedShop : s))
    );

    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      safeSetDoc(doc(db, 'users', targetUid, 'shops', updatedShop.id), {
        ...updatedShop,
        userId: targetUid,
      }, { merge: true });
    }

    showToast(lang === 'my' ? 'ဆိုင်အချက်အလက် ပြင်ဆင်ပြီးပါပြီ ✓' : 'Shop updated successfully ✓');
  };

  const handleDeleteShop = (shopId: string) => {
    setShops((prev) => prev.filter((s) => s.id !== shopId));

    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      safeDeleteDoc(doc(db, 'users', targetUid, 'shops', shopId));
    }

    showToast(lang === 'my' ? 'ဆိုင်အချက်အလက် ဖျက်ပြီးပါပြီ ✓' : 'Shop deleted successfully ✓');
  };

  const handleAddBudget = (config: BudgetConfig) => {
    setBudgets((prev) => {
      const filtered = prev.filter((b) => b.categoryId !== config.categoryId);
      return [...filtered, config];
    });
    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      safeSetDoc(doc(db, 'users', targetUid, 'budgets', config.categoryId), {
        ...config,
        userId: targetUid,
      }, { merge: true });
    }
  };

  const handleUpdateBudget = (config: BudgetConfig) => {
    setBudgets((prev) =>
      prev.map((b) => (b.categoryId === config.categoryId ? config : b))
    );
    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      safeSetDoc(doc(db, 'users', targetUid, 'budgets', config.categoryId), {
        ...config,
        userId: targetUid,
      }, { merge: true });
    }
  };

  const handleDeleteBudget = (categoryId: string) => {
    setBudgets((prev) => prev.filter((b) => b.categoryId !== categoryId));
    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      safeDeleteDoc(doc(db, 'users', targetUid, 'budgets', categoryId));
    }
  };

  const handleAddCategory = (newCat: Omit<Category, 'id'>) => {
    if (plan !== 'premium') {
      setIsPremiumModalOpen(true);
      return;
    }
    const cat: Category = {
      ...newCat,
      id: `cat_custom_${Date.now()}`,
    };
    const nextCategories = [...categories, cat];
    setCategories(nextCategories);
    safeSetItem('ngwe_categories', JSON.stringify(nextCategories));
    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      safeSetDoc(doc(db, 'users', targetUid, 'categories', cat.id), {
        ...cat,
        userId: targetUid,
      }, { merge: true });
    }
    showToast(
      lang === 'my'
        ? `ကဏ္ဍသစ် "${cat.name}" ကို အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ`
        : `Created custom category "${cat.name}"`
    );
  };

  const handleUpdateCategory = (updatedCat: Category) => {
    if (plan !== 'premium') {
      setIsPremiumModalOpen(true);
      return;
    }
    const nextCategories = categories.map((c) => (c.id === updatedCat.id ? updatedCat : c));
    setCategories(nextCategories);
    safeSetItem('ngwe_categories', JSON.stringify(nextCategories));
    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      safeSetDoc(doc(db, 'users', targetUid, 'categories', updatedCat.id), {
        ...updatedCat,
        userId: targetUid,
      }, { merge: true });
    }
    showToast(
      lang === 'my'
        ? `ကဏ္ဍ "${updatedCat.name}" ကို ပြင်ဆင်ပြီးပါပြီ`
        : `Updated category "${updatedCat.name}"`
    );
  };

  const handleDeleteCategory = (categoryId: string) => {
    if (plan !== 'premium') {
      setIsPremiumModalOpen(true);
      return;
    }
    
    const catToDelete = categories.find((c) => c.id === categoryId);
    if (!catToDelete) return;
    
    const relatedTxCount = transactions.filter(t => t.category === categoryId).length;
    
    if (relatedTxCount > 0) {
       if (!window.confirm(lang === 'my' 
           ? `ဤကဏ္ဍတွင် မှတ်တမ်း ${relatedTxCount} ခု ရှိပါသည်။ ဖျက်လိုက်ပါက ၎င်းတို့ကို 'အခြား' ကဏ္ဍသို့ ပြောင်းရွှေ့မည်ဖြစ်ပါသည်။ ဆက်လုပ်မည်လား?` 
           : `There are ${relatedTxCount} transactions in this category. They will be reassigned to 'Other'. Continue?`)) {
           return;
       }
       
       const fallbackCat = categories.find(c => c.type === catToDelete.type && c.id !== categoryId);
       const fallbackId = fallbackCat ? fallbackCat.id : UNBUDGETED_CATEGORY_ID;
       
       const nextTransactions = transactions.map(t => {
         if (t.category === categoryId) {
           return { ...t, category: fallbackId, categoryId: fallbackId, subCategoryId: undefined };
         }
         return t;
       });
       setTransactions(nextTransactions);
       safeSetItem('ngwe_transactions', JSON.stringify(nextTransactions));
    }
    
    const nextCategories = categories.filter((c) => c.id !== categoryId);
    setCategories(nextCategories);
    safeSetItem('ngwe_categories', JSON.stringify(nextCategories));
    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      safeDeleteDoc(doc(db, 'users', targetUid, 'categories', categoryId));
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
      safeSetDoc(doc(db, 'users', targetUid, 'categories', categoryId), {
        ...(updatedParent as Category),
        userId: targetUid,
      }, { merge: true });
    }
    showToast(
      lang === 'my'
        ? `ကဏ္ဍခွဲ "${subCat.name}" ကို အသစ်ထည့်သွင်းပြီးပါပြီ`
        : `Added sub-category "${subCat.name}"`
    );
  };

  const handleDeleteSubCategory = (categoryId: string, subCategoryId: string) => {
    let updatedParent: Category | null = null;
    let nextCategories: Category[] = [];
    let deletedName = '';
    setCategories((prev) => {
      nextCategories = prev.map((c) => {
        if (c.id === categoryId) {
          const target = (c.subCategories || []).find((s) => s.id === subCategoryId);
          if (target) deletedName = target.name;
          updatedParent = {
            ...c,
            subCategories: (c.subCategories || []).filter((s) => s.id !== subCategoryId),
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
      safeSetDoc(doc(db, 'users', targetUid, 'categories', categoryId), {
        ...(updatedParent as Category),
        userId: targetUid,
      }, { merge: true });
    }
    if (deletedName) {
      showToast(
        lang === 'my'
          ? `ကဏ္ဍခွဲ "${deletedName}" ကို ဖျက်ပြီးပါပြီ`
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
      safeSetDoc(doc(db, 'users', targetUid, 'categories', categoryId), {
        ...(updatedParent as Category),
        userId: targetUid,
      }, { merge: true });
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
          safeSetDoc(doc(db, 'users', targetUid, 'categories', cat.id), {
            ...cat,
            userId: targetUid,
          }, { merge: true });
        }
      });
      result.updatedTransactions.forEach((tx) => {
        if (tx.id) {
          const prevJson = prevTxMap.get(tx.id);
          const currJson = JSON.stringify(tx);
          if (prevJson !== currJson) {
            safeSetDoc(doc(db, 'users', targetUid, 'transactions', tx.id), {
              ...tx,
              userId: targetUid,
            }, { merge: true });
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
