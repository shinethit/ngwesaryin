import type { Dispatch, SetStateAction } from 'react';
import { doc } from 'firebase/firestore';
import { db, safeSetDoc, safeDeleteDoc } from '../lib/firebase';
import { safeSetItem } from '../utils/storage';
import {
  syncSharedWalletToCloud,
  deleteSharedWalletDoc,
  deleteUserWalletFromCloud,
  leaveSharedWallet,
  saveSharedWalletTransaction,
  getSharedWalletDocId,
} from '../lib/sharedWalletService';
import { isWalletMatch } from '../utils/walletBalance';
import { DEFAULT_WALLET_PERMISSIONS } from '../utils/permissions';
import type {
  Category,
  PlanLimits,
  PlanType,
  Transaction,
  Wallet,
  WalletPermissions,
} from '../types';

interface UseWalletHandlersParams {
  user: { uid: string; email?: string | null; displayName?: string | null } | null;
  activeWorkspaceId: string | null | undefined;
  plan: PlanType;
  limits: PlanLimits;
  lang: 'my' | 'en';
  showToast: (msg: string) => void;
  setIsAuthModalOpen: (open: boolean) => void;
  setIsPremiumModalOpen: (open: boolean) => void;
  wallets: Wallet[];
  setWallets: Dispatch<SetStateAction<Wallet[]>>;
  computedWallets: Wallet[];
  transactions: Transaction[];
  setTransactions: Dispatch<SetStateAction<Transaction[]>>;
  categories: Category[];
  addCollaborator: (email: string) => Promise<void>;
  removeCollaborator: (email: string) => Promise<void>;
}

/**
 * Wallet handlers — extracted from App.tsx (Phase 4 refactor).
 * Covers: CRUD, balance update, transfer, sharing, permissions, reconciliation.
 */
export function useWalletHandlers({
  user,
  activeWorkspaceId,
  plan,
  limits,
  lang,
  showToast,
  setIsAuthModalOpen,
  setIsPremiumModalOpen,
  wallets,
  setWallets,
  computedWallets,
  transactions,
  setTransactions,
  categories,
  addCollaborator,
  removeCollaborator,
}: UseWalletHandlersParams) {

  const handleAddWallet = (walletData: Omit<Wallet, 'id'>) => {
    const ownWalletsCount = wallets.filter((w) => !w.isSharedFromOther).length;
    if (ownWalletsCount >= limits.maxWallets) {
      if (plan === 'guest') {
        if (window.confirm(lang === 'my'
          ? 'Guest Mode တွင် Wallet (၁) ခုသာ အသုံးပြုနိုင်ပါသည်။ အကောင့်သစ် ထပ်တိုးရန် Google Account ဖြင့် Sign in ပြုလုပ်ပါ'
          : 'Guest Mode allows 1 wallet only. Please Sign in with Google to add more wallets.')) {
          setIsAuthModalOpen(true);
        }
        return;
      }
      setIsPremiumModalOpen(true);
      return;
    }
    const id = `wallet_${Date.now()}`;
    const newWallet = { ...walletData, id };
    unmarkWalletDeleted(id);
    setWallets((prev) => [...prev, newWallet]);
    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      safeSetDoc(doc(db, 'users', targetUid, 'wallets', id), {
        ...newWallet,
        userId: targetUid,
      }, { merge: true });
    }
    showToast(lang === 'my' ? 'အကောင့်သစ် ထည့်သွင်းပြီးပါပြီ' : 'Wallet added successfully');
  };

  const handleUpdateWallet = (updatedWallet: Wallet) => {
    setWallets((prev) => {
      const next = prev.map((w) => (w.id === updatedWallet.id ? updatedWallet : w));
      safeSetItem('ngwe_wallets', JSON.stringify(next));
      return next;
    });
    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      safeSetDoc(doc(db, 'users', targetUid, 'wallets', updatedWallet.id), {
        ...updatedWallet,
        userId: targetUid,
      }, { merge: true });
    }
    if (user && (updatedWallet.isSharedFromOther || (updatedWallet.sharedWith && updatedWallet.sharedWith.length > 0))) {
      syncSharedWalletToCloud(updatedWallet, user);
    }
    showToast(lang === 'my' ? 'အကောင့် အချက်အလက် ပြင်ဆင်ပြီးပါပြီ ✓' : 'Wallet updated successfully ✓');
  };

  const handleDeleteWallet = async (walletId: string) => {
    const target = wallets.find((w) => w.id === walletId);
    if (!target) return;

    // 1. COLLABORATOR LEAVING SHARED WALLET
    if (target.isSharedFromOther) {
      if (
        window.confirm(
          lang === 'my'
            ? `ဤ Shared Wallet (${target.name}) မှ ထွက်ခွာမည်မှာ သေချာပါသလား?\n(မှတ်ချက် - Shared Wallet ကို ပိုင်ရှင်သာ ဖျက်ပိုင်ခွင့်ရှိပြီး၊ ဖိတ်ခေါ်ခံထားရသူသည် ထွက်ခွာခြင်းသာ ပြုလုပ်နိုင်ပါသည်)`
            : `Are you sure you want to leave this shared wallet (${target.nameEn || target.name})?`
        )
      ) {
        if (user?.email) {
          await leaveSharedWallet(walletId, user.email, target.sharedDocId, target.ownerUid);
        }
        setWallets((prev) => prev.filter((w) => w.id !== walletId));
        showToast(lang === 'my' ? 'Shared Wallet မှ ထွက်ခွာပြီးပါပြီ' : 'Left shared wallet');
      }
      return;
    }

    // 2. OWNER DELETING WALLET
    const ownWallets = wallets.filter((w) => !w.isSharedFromOther);
    if (ownWallets.length <= 1) {
      alert(
        lang === 'my'
          ? 'အနည်းဆုံး Wallet တစ်ခု ရှိရပါမည်။ ဤ Wallet ကို မဖျက်မီ အခြား Wallet တစ်ခု အရင်ထည့်သွင်းပါ'
          : 'At least one wallet is required. Please add another wallet before deleting this one.'
      );
      return;
    }

    const fallbackWallet =
      ownWallets.find((w) => w.id !== walletId && w.isDefault) ||
      ownWallets.find((w) => w.id !== walletId);

    if (!fallbackWallet) {
      alert(lang === 'my' ? 'အနည်းဆုံး အကောင့်တစ်ခု ရှိရပါမည်။' : 'At least one wallet is required.');
      return;
    }

    const isShared = Boolean(target.sharedWith && target.sharedWith.length > 0);
    const relatedTxCount = transactions.filter((t) => t.walletId === walletId).length;

    let confirmMsg = '';
    if (lang === 'my') {
      confirmMsg = `ဤအကောင့် (${target.name}) ကို ဖျက်ရန် သေချာပါသလား?`;
      if (isShared) {
        confirmMsg += `\n⚠️ ဤ Wallet ကို ပိုင်ရှင်မှ ဖျက်လိုက်ပါက မျှဝေထားသော သူများအားလုံးထံမှလည်း အပြီးတိုင် ပျက်သွားပါမည်။`;
      }
      if (relatedTxCount > 0) {
        confirmMsg += `\nရှိပြီးသား စာရင်းမှတ်တမ်း ${relatedTxCount} ခုကို '${fallbackWallet.name}' သို့ အလိုအလျောက် ပြောင်းရွှေ့ပေးပါမည်။`;
      }
    } else {
      confirmMsg = `Are you sure you want to delete this wallet (${target.nameEn || target.name})?`;
      if (isShared) {
        confirmMsg += `\n⚠️ Deleting as owner will remove it from all shared collaborators immediately.`;
      }
      if (relatedTxCount > 0) {
        confirmMsg += `\n${relatedTxCount} transactions will be reassigned to '${fallbackWallet.nameEn || fallbackWallet.name}'.`;
      }
    }

    if (!window.confirm(confirmMsg)) {
      return;
    }

    let updatedTransactions = transactions;
    if (relatedTxCount > 0) {
      updatedTransactions = transactions.map((t) =>
        t.walletId === walletId ? { ...t, walletId: fallbackWallet.id } : t
      );
      setTransactions(updatedTransactions);
      safeSetItem('ngwe_transactions', JSON.stringify(updatedTransactions));
      if (user?.uid) {
        const targetUid = activeWorkspaceId || user.uid;
        updatedTransactions.filter(t => t.walletId === fallbackWallet.id).forEach(t => {
          safeSetDoc(doc(db, 'users', targetUid, 'transactions', t.id), {
            ...t,
            walletId: fallbackWallet.id,
            userId: targetUid,
          }, { merge: true });
        });
      }
    }

    markWalletDeleted(walletId);
    if (target.originalId) markWalletDeleted(target.originalId);
    if (target.sharedDocId) markWalletDeleted(target.sharedDocId);

    const updatedWallets = wallets
      .filter((w) => w.id !== walletId)
      .map((w) => (w.id === fallbackWallet.id && target.isDefault ? { ...w, isDefault: true } : w));
    setWallets(updatedWallets);
    safeSetItem('ngwe_wallets', JSON.stringify(updatedWallets));

    if (user) {
      await deleteSharedWalletDoc(walletId, user.uid, target.sharedDocId, target.originalId);
      await deleteUserWalletFromCloud(user.uid, walletId, target.originalId);
    }

    showToast(
      lang === 'my'
        ? (isShared ? 'Shared Wallet ကို အပြီးဖျက်လိုက်ပါပြီ' : 'အကောင့် ဖျက်လိုက်ပါပြီ')
        : 'Wallet deleted successfully'
    );
  };

  const handleUpdateWalletBalance = (id: string, newBalance: number) => {
    const target = computedWallets.find((w) => w.id === id);
    if (!target) return;
    const currentLiveBalance = target.balance;
    const diff = newBalance - currentLiveBalance;
    setWallets((prev) => {
      const next = prev.map((w) => {
        if (w.id === id) {
          const oldInitial = w.initialBalance ?? 0;
          return { ...w, initialBalance: oldInitial + diff, balance: newBalance };
        }
        return w;
      });
      safeSetItem('ngwe_wallets', JSON.stringify(next));
      if (user?.uid) {
        const targetUid = activeWorkspaceId || user.uid;
        const updatedW = next.find((w) => w.id === id);
        if (updatedW) {
          safeSetDoc(doc(db, 'users', targetUid, 'wallets', id), {
            ...updatedW,
            userId: targetUid,
          }, { merge: true });
          if (updatedW.isSharedFromOther || (updatedW.sharedWith && updatedW.sharedWith.length > 0)) {
            syncSharedWalletToCloud(updatedW, user);
          }
        }
      }
      return next;
    });
    showToast(lang === 'my' ? 'လက်ကျန်ငွေ ပြင်ဆင်ပြီးပါပြီ' : 'Balance updated');
  };

  const handleTransferFunds = (
    fromWalletId: string,
    toWalletId: string,
    amount: number,
    note?: string
  ) => {
    const cleanAmount = Math.abs(Number(amount) || 0);
    if (!cleanAmount || cleanAmount <= 0) return;

    const fromWallet = computedWallets.find((w) => isWalletMatch(w, fromWalletId)) || wallets.find((w) => isWalletMatch(w, fromWalletId));
    const toWallet = computedWallets.find((w) => isWalletMatch(w, toWalletId)) || wallets.find((w) => isWalletMatch(w, toWalletId));
    const fromName = fromWallet ? (lang === 'my' ? fromWallet.name : (fromWallet.nameEn || fromWallet.name)) : 'Wallet';
    const toName = toWallet ? (lang === 'my' ? toWallet.name : (toWallet.nameEn || toWallet.name)) : 'Wallet';

    const nowStr = new Date().toISOString().split('T')[0];
    const outId = `tx_tf_out_${Date.now()}`;
    const inId = `tx_tf_in_${Date.now() + 1}`;

    const outTx: Transaction = {
      id: outId,
      type: 'expense',
      amount: cleanAmount,
      category: 'cat_transfer',
      subCategoryId: 'sub_tf_out',
      date: nowStr,
      note: `[ငွေလွှဲထွက်] ➔ ${toName}${note ? ` (${note})` : ''}`,
      walletId: fromWallet?.id || fromWalletId,
      isTransfer: true,
      transferType: 'transfer_out',
      transferPairId: inId,
      createdAt: Date.now(),
    };

    const inTx: Transaction = {
      id: inId,
      type: 'income',
      amount: cleanAmount,
      category: 'cat_transfer',
      subCategoryId: 'sub_tf_in',
      date: nowStr,
      note: `[ငွေလွှဲဝင်] ⬅ ${fromName}${note ? ` (${note})` : ''}`,
      walletId: toWallet?.id || toWalletId,
      isTransfer: true,
      transferType: 'transfer_in',
      transferPairId: outId,
      createdAt: Date.now() + 1,
    };

    setTransactions((prev) => {
      const next = [outTx, inTx, ...prev];
      safeSetItem('ngwe_transactions', JSON.stringify(next));
      return next;
    });

    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      safeSetDoc(doc(db, 'users', targetUid, 'transactions', outId), {
        ...outTx,
        userId: targetUid,
      }, { merge: true });
      safeSetDoc(doc(db, 'users', targetUid, 'transactions', inId), {
        ...inTx,
        userId: targetUid,
      }, { merge: true });

      if (fromWallet && (fromWallet.isSharedFromOther || (fromWallet.sharedWith && fromWallet.sharedWith.length > 0))) {
        saveSharedWalletTransaction(fromWallet.id, outTx, fromWallet.balance, getSharedWalletDocId(fromWallet, user.uid), user.uid);
      }
      if (toWallet && (toWallet.isSharedFromOther || (toWallet.sharedWith && toWallet.sharedWith.length > 0))) {
        saveSharedWalletTransaction(toWallet.id, inTx, toWallet.balance, getSharedWalletDocId(toWallet, user.uid), user.uid);
      }
    }

    showToast(lang === 'my' ? 'ငွေလွှဲပြောင်းပြီးပါပြီ ✓' : 'Transfer successful ✓');
  };

  const handleShareWallet = async (walletId: string, email: string) => {
    if (!limits.hasWalletSharing || plan === 'guest') {
      if (window.confirm(lang === 'my'
        ? 'Guest Mode တွင် Wallet မျှဝေခြင်း မရရှိနိုင်ပါ။ Google Account ဖြင့် Sign in ပြုလုပ်ပါ'
        : 'Wallet sharing is not available in Guest mode. Please Sign in with Google.')) {
        setIsAuthModalOpen(true);
      }
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const target = wallets.find((w) => w.id === walletId);
    if (!target) return;

    const currentShared = target.sharedWith || [];
    if (currentShared.includes(cleanEmail)) {
      showToast(lang === 'my' ? 'ဤ Email သည် ထည့်သွင်းပြီးသား ဖြစ်ပါသည်' : 'This email is already added');
      return;
    }

    const updatedShared = [...currentShared, cleanEmail];
    const updatedPerms = {
      ...(target.collaboratorPermissions || {}),
      [cleanEmail]: DEFAULT_WALLET_PERMISSIONS,
    };
    const scopedDocId = `${user?.uid}_${walletId}`;
    const liveTarget = computedWallets.find((cw) => cw.id === walletId) || target;
    const updatedWallet: Wallet = {
      ...target,
      balance: liveTarget.balance,
      sharedWith: updatedShared,
      collaboratorPermissions: updatedPerms,
      sharedDocId: target.sharedDocId || scopedDocId,
      ownerUid: target.ownerUid || user?.uid,
      ownerEmail: target.ownerEmail || user?.email || '',
      ownerName: target.ownerName || user?.displayName || user?.email?.split('@')[0] || 'Owner',
    };

    const nextWallets = wallets.map((w) => (w.id === walletId ? updatedWallet : w));
    setWallets(nextWallets);
    safeSetItem('ngwe_wallets', JSON.stringify(nextWallets));

    if (user) {
      await addCollaborator(cleanEmail).catch((err) => console.warn('Failed to add collaborator for security rules:', err));

      const txs = transactions.filter((t) => isWalletMatch(target, t.walletId));
      await syncSharedWalletToCloud(updatedWallet, user, txs);
      safeSetDoc(doc(db, 'users', user.uid, 'wallets', updatedWallet.id), {
        ...updatedWallet,
        userId: user.uid,
      }, { merge: true });
    }
    showToast(lang === 'my' ? `${cleanEmail} သို့ Wallet မျှဝေလိုက်ပါပြီ ✓` : `Wallet shared with ${cleanEmail} ✓`);
  };

  const handleUnshareWallet = async (walletId: string, email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const target = wallets.find((w) => w.id === walletId);
    if (!target) return;

    const updatedShared = (target.sharedWith || []).filter((e) => e.toLowerCase() !== cleanEmail);
    const updatedPerms = { ...(target.collaboratorPermissions || {}) };
    delete updatedPerms[cleanEmail];
    const updatedWallet: Wallet = {
      ...target,
      sharedWith: updatedShared,
      collaboratorPermissions: updatedPerms,
    };

    const nextWallets = wallets.map((w) => (w.id === walletId ? updatedWallet : w));
    setWallets(nextWallets);
    safeSetItem('ngwe_wallets', JSON.stringify(nextWallets));

    if (user) {
      await syncSharedWalletToCloud(updatedWallet, user);
      safeSetDoc(doc(db, 'users', user.uid, 'wallets', updatedWallet.id), {
        ...updatedWallet,
        userId: user.uid,
      }, { merge: true });

      const otherWalletsWithCollab = wallets.filter(
        (w) => w.id !== walletId && !w.isSharedFromOther && w.sharedWith?.map((e) => e.toLowerCase()).includes(cleanEmail)
      );
      if (otherWalletsWithCollab.length === 0) {
        await removeCollaborator(cleanEmail).catch((err) => console.warn('Failed to remove collaborator from root:', err));
      }
    }
    showToast(lang === 'my' ? 'မျှဝေမှု ဖယ်ရှားလိုက်ပါပြီ' : 'Sharing removed');
  };

  const handleUpdateWalletPermissions = async (
    walletId: string,
    email: string,
    permissions: WalletPermissions
  ) => {
    const cleanEmail = email.trim().toLowerCase();
    const target = wallets.find((w) => w.id === walletId);
    if (!target) return;

    const updatedPerms = {
      ...(target.collaboratorPermissions || {}),
      [cleanEmail]: permissions,
    };
    const updatedWallet: Wallet = {
      ...target,
      collaboratorPermissions: updatedPerms,
    };

    setWallets((prev) =>
      prev.map((w) => (w.id === walletId ? updatedWallet : w))
    );

    if (user) {
      await syncSharedWalletToCloud(updatedWallet, user);
    }
    showToast(lang === 'my' ? 'ခွင့်ပြုချက်များကို သိမ်းဆည်းလိုက်ပါပြီ ✓' : 'Permissions saved successfully ✓');
  };

  const handleReconcileBalance = (
    walletId: string,
    actualBalance: number,
    recordTransaction: boolean,
    note?: string
  ) => {
    const targetWallet = computedWallets.find((w) => w.id === walletId);
    const prevBalance = targetWallet?.balance || 0;
    const difference = actualBalance - prevBalance;

    if (!recordTransaction) {
      setWallets((prev) => {
        const next = prev.map((w) => {
          if (w.id === walletId) {
            const newInitial = (w.initialBalance ?? 0) + difference;
            return { ...w, initialBalance: newInitial, balance: actualBalance };
          }
          return w;
        });
        safeSetItem('ngwe_wallets', JSON.stringify(next));
        if (user?.uid) {
          const targetUid = activeWorkspaceId || user.uid;
          const updatedW = next.find((w) => w.id === walletId);
          if (updatedW) {
            safeSetDoc(doc(db, 'users', targetUid, 'wallets', walletId), {
              ...updatedW,
              userId: targetUid,
            }, { merge: true });
            if (updatedW.isSharedFromOther || (updatedW.sharedWith && updatedW.sharedWith.length > 0)) {
              syncSharedWalletToCloud(updatedW, user);
            }
          }
        }
        return next;
      });
    }

    if (recordTransaction && difference !== 0) {
      const isIncome = difference > 0;
      const absDiff = Math.abs(difference);
      const walletName = targetWallet
        ? lang === 'my'
          ? targetWallet.name
          : targetWallet.nameEn || targetWallet.name
        : 'Wallet';

      const adjCategory =
        categories.find((c) =>
          isIncome
            ? c.id === 'other_income' || c.type === 'income'
            : c.id === 'other_expense' || c.type === 'expense'
        ) || (isIncome ? categories[0] : categories[1]);

      const newTx: Transaction = {
        id: `reconcile_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: isIncome ? 'income' : 'expense',
        amount: absDiff,
        category: adjCategory?.id || 'other',
        date: new Date().toISOString().split('T')[0],
        note: note
          ? `[စာရင်းညှိ] ${note} (${walletName})`
          : isIncome
          ? `[စာရင်းညှိ] လက်ကျန်ငွေ ပိုငွေညှိချက် (${walletName})`
          : `[စာရင်းညှိ] လက်ကျန်ငွေ လိုငွေညှိချက် (${walletName})`,
        walletId: walletId,
        createdAt: Date.now(),
      };

      setTransactions((prev) => {
        const next = [newTx, ...prev];
        safeSetItem('ngwe_transactions', JSON.stringify(next));
        return next;
      });

      if (user?.uid) {
        const targetUid = activeWorkspaceId || user.uid;
        safeSetDoc(doc(db, 'users', targetUid, 'transactions', newTx.id), {
          ...newTx,
          userId: targetUid,
        }, { merge: true });
      }
    }

    showToast(
      lang === 'my'
        ? 'ငွေစာရင်း လက်ကျန်ငွေကို အောင်မြင်စွာ ညှိပြီးပါပြီ ✓'
        : 'Wallet balance reconciled successfully ✓'
    );
  };

  return {
    handleAddWallet,
    handleUpdateWallet,
    handleDeleteWallet,
    handleUpdateWalletBalance,
    handleTransferFunds,
    handleShareWallet,
    handleUnshareWallet,
    handleUpdateWalletPermissions,
    handleReconcileBalance,
  };
}
