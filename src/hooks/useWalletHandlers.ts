import type { Dispatch, SetStateAction } from 'react';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db, safeSetDoc } from '../lib/firebase';
import { safeSetItem } from '../utils/storage';
import {
  syncSharedWalletToCloud,
  deleteSharedWalletDoc,
  deleteUserWalletFromCloud,
  leaveSharedWallet,
  saveSharedWalletTransaction,
  getSharedWalletDocId,
  // [v7.5.56] Cross-worker contract: exported from
  // src/lib/sharedWalletService.ts by another worker — recomputes the
  // stored shared balance from the shared transactions + initialBalance.
  recomputeSharedWalletBalance,
} from '../lib/sharedWalletService';
import { deleteRefsForWallet } from '../lib/sharedWalletRefs';
import { isWalletMatch } from '../utils/walletBalance';
import { DEFAULT_WALLET_PERMISSIONS, getCollaboratorPermissions } from '../utils/permissions';
import { markWalletDeleted, unmarkWalletDeleted } from '../utils/deletedMarkers';
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
  addCollaborator: (email: string) => Promise<{ success: boolean; error?: string }>;
  removeCollaborator: (email: string) => Promise<boolean>;
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

  // [v7.5.55] safeSetDoc returns false when the write did not land (it
  // enqueues a retry in the sync queue, so local data is safe). Surface
  // that as a "cloud save pending" notice instead of a silent false success.
  const cloudPendingMsg =
    lang === 'my'
      ? '☁️ Cloud သို့ သိမ်းဆည်းခြင်း ခေတ္တမရသေးပါ — အင်တာနက်ရလျှင် အလိုအလျောက် ထပ်တင်ပါမည်'
      : '☁️ Cloud save is pending — it will retry automatically when you are back online';
  const persistDoc = (ref: any, data: any, options?: any) => {
    safeSetDoc(ref, data, options).then((ok) => {
      if (ok === false) showToast(cloudPendingMsg);
    }).catch(() => {});
  };

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
    const newWallet = { ...walletData, id, updatedAt: Date.now(), version: 1, lastEditedBy: user?.uid || 'guest' };
    unmarkWalletDeleted(id);
    setWallets((prev) => [...prev, newWallet]);
    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      persistDoc(doc(db, 'users', targetUid, 'wallets', id), {
        ...newWallet,
        userId: targetUid,
      }, { merge: true });
    }
    showToast(lang === 'my' ? 'အကောင့်သစ် ထည့်သွင်းပြီးပါပြီ' : 'Wallet added successfully');
  };

  const handleUpdateWallet = (updatedWallet: Wallet) => {
    const existing = wallets.find((w) => w.id === updatedWallet.id);
    const isSharedWallet = Boolean(
      existing && (existing.isSharedFromOther || (existing.sharedWith && existing.sharedWith.length > 0))
    );
    // [v7.5.56] Never rewrite ownerUid/ownerEmail/ownerName for a shared
    // wallet — the incoming wallet object may carry stale or foreign
    // owner data (e.g. a collaborator's edit, or a stale local copy).
    // The stored owner fields are authoritative.
    if (isSharedWallet && existing) {
      updatedWallet = {
        ...updatedWallet,
        ownerUid: existing.ownerUid,
        ownerEmail: existing.ownerEmail,
        ownerName: existing.ownerName,
      };
    }
    updatedWallet = { ...updatedWallet, updatedAt: Date.now(), version: (updatedWallet.version || 0) + 1, lastEditedBy: user?.uid || 'guest' };
    setWallets((prev) => {
      const next = prev.map((w) => (w.id === updatedWallet.id ? updatedWallet : w));
      safeSetItem('ngwe_wallets', JSON.stringify(next));
      return next;
    });
    // [v7.5.56] Never write the phantom personal doc for a wallet the
    // user doesn't own — a shared-from-other wallet lives only in
    // sharedWallets, not under users/{uid}/wallets.
    if (user?.uid && !updatedWallet.isSharedFromOther) {
      const targetUid = activeWorkspaceId || user.uid;
      persistDoc(doc(db, 'users', targetUid, 'wallets', updatedWallet.id), {
        ...updatedWallet,
        userId: targetUid,
      }, { merge: true });
    }
    // [v7.5.56] Only the OWNER syncs a shared wallet to the cloud.
    // syncSharedWalletToCloud stamps ownerUid = current user, so a
    // collaborator sync would silently steal ownership.
    if (user && isSharedWallet && !updatedWallet.isSharedFromOther) {
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
        let left = false;
        if (user?.email) {
          left = await leaveSharedWallet(walletId, user.email, target.sharedDocId, target.ownerUid);
        }
        setWallets((prev) => prev.filter((w) => w.id !== walletId));
        // [v7.5.56] Honest toast — if the leave write did not land, the
        // wallet can resurrect on the next sync; say so instead of
        // claiming success.
        if (left) {
          showToast(lang === 'my' ? 'Shared Wallet မှ ထွက်ခွာပြီးပါပြီ' : 'Left shared wallet');
        } else {
          showToast(cloudPendingMsg);
        }
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
          persistDoc(doc(db, 'users', targetUid, 'transactions', t.id), {
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

    // [v7.5.56] Capture the recipient list BEFORE deleting anything and
    // delete ALL of their ref pointers, so no recipient keeps a dangling
    // ref to this deleted wallet. (syncSharedWalletToCloud's empty-list
    // cleanup only sees the post-filter list, so it cannot do this.)
    const preDeleteRecipients = [...(target.sharedWith || [])];

    const updatedWallets = wallets
      .filter((w) => w.id !== walletId)
      .map((w) => (w.id === fallbackWallet.id && target.isDefault ? { ...w, isDefault: true } : w));
    setWallets(updatedWallets);
    safeSetItem('ngwe_wallets', JSON.stringify(updatedWallets));

    if (user) {
      if (isShared && preDeleteRecipients.length > 0) {
        const sharedDocId = getSharedWalletDocId(target, user.uid);
        await deleteRefsForWallet(sharedDocId, preDeleteRecipients);
        if (target.id !== sharedDocId) {
          await deleteRefsForWallet(target.id, preDeleteRecipients);
        }
      }
      await deleteSharedWalletDoc(walletId, user.uid, target.sharedDocId, target.originalId, preDeleteRecipients);
      await deleteUserWalletFromCloud(user.uid, walletId, target.originalId);
    }

    showToast(
      lang === 'my'
        ? (isShared ? 'Shared Wallet ကို အပြီးဖျက်လိုက်ပါပြီ' : 'အကောင့် ဖျက်လိုက်ပါပြီ')
        : 'Wallet deleted successfully'
    );
  };

  // [v7.5.55] B19 — KEPT as-is deliberately (see WalletModal): the live
  // balance is derived as initialBalance + transactions (see
  // utils/walletBalance calculateWalletLiveBalance), so a manual balance
  // correction MUST move initialBalance by the same delta or
  // syncWalletsWithTransactions recomputes the correction away. The Wallet
  // type has no separate correction field to store it in.
  const handleUpdateWalletBalance = (id: string, newBalance: number) => {
    const target = computedWallets.find((w) => w.id === id);
    if (!target) return;
    const currentLiveBalance = target.balance;
    const diff = newBalance - currentLiveBalance;
    setWallets((prev) => {
      const next = prev.map((w) => {
        if (w.id === id) {
          const oldInitial = w.initialBalance ?? 0;
          return { ...w, initialBalance: oldInitial + diff, balance: newBalance, updatedAt: Date.now(), version: (w.version || 0) + 1, lastEditedBy: user?.uid || 'guest' };
        }
        return w;
      });
      safeSetItem('ngwe_wallets', JSON.stringify(next));
      if (user?.uid) {
        const targetUid = activeWorkspaceId || user.uid;
        const updatedW = next.find((w) => w.id === id);
        if (updatedW) {
          // [v7.5.56] Never write the phantom personal doc for a wallet
          // the user doesn't own; only the owner syncs a shared wallet
          // (sync stamps ownerUid = current user).
          if (!updatedW.isSharedFromOther) {
            persistDoc(doc(db, 'users', targetUid, 'wallets', id), {
              ...updatedW,
              userId: targetUid,
            }, { merge: true });
          }
          if (!updatedW.isSharedFromOther && updatedW.sharedWith && updatedW.sharedWith.length > 0) {
            syncSharedWalletToCloud(updatedW, user);
          }
        }
      }
      return next;
    });
    showToast(lang === 'my' ? 'လက်ကျန်ငွေ ပြင်ဆင်ပြီးပါပြီ' : 'Balance updated');
  };

  const handleTransferFunds = async (
    fromWalletId: string,
    toWalletId: string,
    amount: number,
    note?: string
  ): Promise<boolean> => {
    const cleanAmount = Math.abs(Number(amount) || 0);
    if (!cleanAmount || cleanAmount <= 0) return false;

    const fromWallet = computedWallets.find((w) => isWalletMatch(w, fromWalletId)) || wallets.find((w) => isWalletMatch(w, fromWalletId));
    const toWallet = computedWallets.find((w) => isWalletMatch(w, toWalletId)) || wallets.find((w) => isWalletMatch(w, toWalletId));
    const fromName = fromWallet ? (lang === 'my' ? fromWallet.name : (fromWallet.nameEn || fromWallet.name)) : 'Wallet';
    const toName = toWallet ? (lang === 'my' ? toWallet.name : (toWallet.nameEn || toWallet.name)) : 'Wallet';

    // [v7.5.56] Permission check on BOTH legs BEFORE any write. The
    // transfer-out is an expense add on the source wallet, the
    // transfer-in is an income add on the destination wallet. Owners
    // always pass (getCollaboratorPermissions returns full for owners).
    if (user && fromWallet) {
      const fromPerms = getCollaboratorPermissions(fromWallet, user.email, user.uid);
      if (!fromPerms.canAddExpense) {
        showToast(lang === 'my'
          ? `${fromName} မှ ငွေလွှဲထွက်ခွင့် သင့်တွင် မရှိပါ`
          : `You don't have permission to transfer out of ${fromName}`);
        return false;
      }
    }
    if (user && toWallet) {
      const toPerms = getCollaboratorPermissions(toWallet, user.email, user.uid);
      if (!toPerms.canAddIncome) {
        showToast(lang === 'my'
          ? `${toName} သို့ ငွေလွှဲဝင်ခွင့် သင့်တွင် မရှိပါ`
          : `You don't have permission to transfer into ${toName}`);
        return false;
      }
    }

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
      updatedAt: Date.now(),
      version: 1,
      lastEditedBy: user?.uid || 'guest',
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
      updatedAt: Date.now() + 1,
      version: 1,
      lastEditedBy: user?.uid || 'guest',
    };

    setTransactions((prev) => {
      const next = [outTx, inTx, ...prev];
      safeSetItem('ngwe_transactions', JSON.stringify(next));
      return next;
    });

    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      persistDoc(doc(db, 'users', targetUid, 'transactions', outId), {
        ...outTx,
        userId: targetUid,
      }, { merge: true });
      persistDoc(doc(db, 'users', targetUid, 'transactions', inId), {
        ...inTx,
        userId: targetUid,
      }, { merge: true });

      // [v7.5.56] Shared legs: await the shared write AND the balance
      // recompute, and only toast success when both landed. The mirror
      // balance is the post-transfer balance, not the stale pre-transfer
      // one. A failed write stays queued for retry (safeSetDoc) — report
      // it as pending, never as success.
      let sharedOk = true;
      if (fromWallet && (fromWallet.isSharedFromOther || (fromWallet.sharedWith && fromWallet.sharedWith.length > 0))) {
        const fromDocId = getSharedWalletDocId(fromWallet, user.uid);
        const saved = await saveSharedWalletTransaction(fromWallet.id, outTx, (fromWallet.balance ?? 0) - cleanAmount, fromDocId, user.uid);
        if (!saved) {
          sharedOk = false;
        } else {
          const recomputed = await recomputeSharedWalletBalance(fromDocId);
          if (!recomputed) sharedOk = false;
        }
      }
      if (toWallet && (toWallet.isSharedFromOther || (toWallet.sharedWith && toWallet.sharedWith.length > 0))) {
        const toDocId = getSharedWalletDocId(toWallet, user.uid);
        const saved = await saveSharedWalletTransaction(toWallet.id, inTx, (toWallet.balance ?? 0) + cleanAmount, toDocId, user.uid);
        if (!saved) {
          sharedOk = false;
        } else {
          const recomputed = await recomputeSharedWalletBalance(toDocId);
          if (!recomputed) sharedOk = false;
        }
      }
      if (!sharedOk) {
        showToast(cloudPendingMsg);
        return false;
      }
    }

    showToast(lang === 'my' ? 'ငွေလွှဲပြောင်းပြီးပါပြီ ✓' : 'Transfer successful ✓');
    return true;
  };

  // [v7.5.56] Returns true only when the share actually landed, so the
  // modal never shows a success state for a refused/failed invite.
  const handleShareWallet = async (walletId: string, email: string): Promise<boolean> => {
    // Guest gate UP FRONT — guests cannot share at all. Refuse with an
    // honest sign-in message and no success toast, before the modal can
    // show any success state.
    if (plan === 'guest' || !user?.uid || !limits.hasWalletSharing) {
      if (window.confirm(lang === 'my'
        ? 'Guest Mode တွင် Wallet မျှဝေခြင်း မရရှိနိုင်ပါ။ Google Account ဖြင့် Sign in ပြုလုပ်ပါ'
        : 'Wallet sharing is not available in Guest mode. Please Sign in with Google.')) {
        setIsAuthModalOpen(true);
      }
      return false;
    }

    const cleanEmail = email.trim().toLowerCase();
    const target = wallets.find((w) => w.id === walletId);
    if (!target) return false;

    // Only the owner can invite collaborators.
    if (target.isSharedFromOther) {
      showToast(lang === 'my' ? 'မျှဝေထားသော Wallet ကို သင်က ထပ်မျှဝေ၍ မရပါ — ပိုင်ရှင်သာ ဖိတ်ခေါ်နိုင်ပါသည်' : 'Only the wallet owner can invite collaborators');
      return false;
    }

    // Self-invite is blocked (compare against the current user's email).
    if (user.email && cleanEmail === user.email.trim().toLowerCase()) {
      showToast(lang === 'my' ? 'ကိုယ့်ကိုယ်ကို ဖိတ်ခေါ်၍ မရပါ' : 'You cannot invite yourself');
      return false;
    }

    const currentShared = target.sharedWith || [];
    // [v7.5.56] Duplicate check is case-insensitive.
    if (currentShared.some((e) => e.trim().toLowerCase() === cleanEmail)) {
      showToast(lang === 'my' ? 'ဤ Email သည် ထည့်သွင်းပြီးသား ဖြစ်ပါသည်' : 'This email is already added');
      return false;
    }

    // [v7.5.56] Collaborator cap comes from the limits table (the single
    // source of truth) — Free maxCollaborators = 10, never a hardcoded 2.
    const uniqueSharedCount = new Set(currentShared.map((e) => e.trim().toLowerCase())).size;
    if (uniqueSharedCount >= limits.maxCollaborators) {
      showToast(lang === 'my'
        ? `Collaborator အရေအတွက် ကန့်သတ်ချက် (${limits.maxCollaborators} ဦး) ပြည့်သွားပါပြီ`
        : `Collaborator limit reached (${limits.maxCollaborators})`);
      if (plan === 'free') setIsPremiumModalOpen(true);
      return false;
    }

    // [v7.5.56] Check addCollaborator's return value BEFORE changing any
    // local state — a failed root write must not look like a share.
    const collabResult = await addCollaborator(cleanEmail).catch(() => ({ success: false, error: 'FAILED' }));
    if (!collabResult.success) {
      const msg =
        collabResult.error === 'CANNOT_ADD_SELF'
          ? (lang === 'my' ? 'ကိုယ့်ကိုယ်ကို ဖိတ်ခေါ်၍ မရပါ' : 'You cannot invite yourself')
          : collabResult.error === 'ALREADY_EXISTS'
          ? (lang === 'my' ? 'ဤ Email သည် ထည့်သွင်းပြီးသား ဖြစ်ပါသည်' : 'This email is already added')
          : collabResult.error === 'FREE_LIMIT_REACHED'
          ? (lang === 'my' ? 'Free Plan collaborator ကန့်သတ်ချက် ပြည့်သွားပါပြီ' : 'Free plan collaborator limit reached')
          : collabResult.error === 'NOT_LOGGED_IN'
          ? (lang === 'my' ? 'Sign in ဝင်ပြီးမှ မျှဝေနိုင်ပါသည်' : 'Please sign in to share')
          : (lang === 'my' ? 'ဖိတ်ခေါ်မှု မအောင်မြင်ပါ — ထပ်ကြိုးစားကြည့်ပါ' : 'Invite failed — please try again');
      showToast(msg);
      return false;
    }

    const updatedShared = [...currentShared, cleanEmail];
    const updatedPerms = {
      ...(target.collaboratorPermissions || {}),
      // [v7.5.56] DEFAULT_WALLET_PERMISSIONS is now all-true (cross-worker
      // contract) — the default preset for a new invite is Full access.
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
      updatedAt: Date.now(),
      version: (target.version || 0) + 1,
      lastEditedBy: user?.uid || 'guest',
    };

    const nextWallets = wallets.map((w) => (w.id === walletId ? updatedWallet : w));
    setWallets(nextWallets);
    safeSetItem('ngwe_wallets', JSON.stringify(nextWallets));

    // [v7.5.56] Check the cloud sync result — no success toast when the
    // shared doc did not land.
    const txs = transactions.filter((t) => isWalletMatch(target, t.walletId));
    const synced = await syncSharedWalletToCloud(updatedWallet, user, txs);
    persistDoc(doc(db, 'users', user.uid, 'wallets', updatedWallet.id), {
      ...updatedWallet,
      userId: user.uid,
    }, { merge: true });
    if (!synced) {
      showToast(cloudPendingMsg);
      return false;
    }
    showToast(lang === 'my' ? `${cleanEmail} သို့ Wallet မျှဝေလိုက်ပါပြီ ✓` : `Wallet shared with ${cleanEmail} ✓`);
    return true;
  };

  // [v7.5.56] Returns true only when the unshare actually landed.
  const handleUnshareWallet = async (walletId: string, email: string): Promise<boolean> => {
    const cleanEmail = email.trim().toLowerCase();
    const target = wallets.find((w) => w.id === walletId);
    if (!target) return false;

    // Only the owner can remove a collaborator.
    if (target.isSharedFromOther) {
      showToast(lang === 'my' ? 'မျှဝေမှု ဖယ်ရှားခွင့် ပိုင်ရှင်တွင်သာ ရှိပါသည်' : 'Only the wallet owner can remove sharing');
      return false;
    }

    // [v7.5.56] Confirm FIRST, explaining that past spending stays in
    // the balance — unsharing only cuts off future access.
    const confirmed = window.confirm(lang === 'my'
      ? `${cleanEmail} အား ဤ Wallet (${target.name}) မှ ဖယ်ရှားမည်မှာ သေချာပါသလား?\n(မှတ်ချက် — ယခင် သုံးစွဲခဲ့သော စာရင်းများနှင့် လက်ကျန်ငွေသည် Wallet ထဲတွင် ဆက်လက်ရှိနေမည်။ ဖယ်ရှားခံရသူသည် ဤ Wallet ကို ဆက်လက် မြင်ရ/သုံးရ တော့မည် မဟုတ်ပါ)`
      : `Remove ${cleanEmail} from this wallet (${target.nameEn || target.name})?\n(Note — past spending and the balance stay in the wallet. The removed person will no longer see or use it.)`);
    if (!confirmed) return false;

    // [v7.5.56] Capture the recipient list BEFORE filtering — the
    // ref-deletion service needs the pre-filter list. The removed
    // person's ref would otherwise never be deleted, and unsharing the
    // last person would delete no refs at all.
    const preFilterRecipients = [...(target.sharedWith || [])];
    const sharedDocId = getSharedWalletDocId(target, user?.uid);

    const updatedShared = (target.sharedWith || []).filter((e) => e.toLowerCase() !== cleanEmail);
    const updatedPerms = { ...(target.collaboratorPermissions || {}) };
    for (const key of Object.keys(updatedPerms)) {
      if (key.trim().toLowerCase() === cleanEmail) delete updatedPerms[key];
    }
    const updatedWallet: Wallet = {
      ...target,
      sharedWith: updatedShared,
      collaboratorPermissions: updatedPerms,
      updatedAt: Date.now(),
      version: (target.version || 0) + 1,
      lastEditedBy: user?.uid || 'guest',
    };

    const nextWallets = wallets.map((w) => (w.id === walletId ? updatedWallet : w));
    setWallets(nextWallets);
    safeSetItem('ngwe_wallets', JSON.stringify(nextWallets));

    if (user) {
      // Delete ALL refs for this wallet first — the sync below re-creates
      // refs for the recipients who stay shared.
      await deleteRefsForWallet(sharedDocId, preFilterRecipients);
      if (target.id !== sharedDocId) {
        await deleteRefsForWallet(target.id, preFilterRecipients);
      }

      const synced = await syncSharedWalletToCloud(updatedWallet, user);
      persistDoc(doc(db, 'users', user.uid, 'wallets', updatedWallet.id), {
        ...updatedWallet,
        userId: user.uid,
      }, { merge: true });
      if (!synced) {
        showToast(cloudPendingMsg);
        return false;
      }

      // [v7.5.56] Call removeCollaborator when this was the last shared
      // wallet with that person, and check the result.
      const otherWalletsWithCollab = wallets.filter(
        (w) => w.id !== walletId && !w.isSharedFromOther && w.sharedWith?.map((e) => e.toLowerCase()).includes(cleanEmail)
      );
      if (otherWalletsWithCollab.length === 0) {
        const removed = await removeCollaborator(cleanEmail).catch(() => false);
        if (!removed) {
          showToast(lang === 'my'
            ? 'မျှဝေမှု ဖယ်ရှားပြီးပါပြီ — သို့သော် အကောင့်အဆင့် ခွင့်ပြုချက် ဖျက်ခြင်း မအောင်မြင်ပါ၊ ထပ်ကြိုးစားပါ'
            : 'Sharing removed, but the account-level permission could not be revoked — please retry');
        }
      }
    }
    showToast(lang === 'my' ? 'မျှဝေမှု ဖယ်ရှားလိုက်ပါပြီ' : 'Sharing removed');
    return true;
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
      updatedAt: Date.now(),
    };

    setWallets((prev) =>
      prev.map((w) => (w.id === walletId ? updatedWallet : w))
    );

    // [v7.5.56] Check the cloud result — a failed permission save must
    // not toast success.
    if (user) {
      const synced = await syncSharedWalletToCloud(updatedWallet, user);
      if (!synced) {
        showToast(cloudPendingMsg);
        return;
      }
    }
    showToast(lang === 'my' ? 'ခွင့်ပြုချက်များကို သိမ်းဆည်းလိုက်ပါပြီ ✓' : 'Permissions saved successfully ✓');
  };

  const handleReconcileBalance = async (
    walletId: string,
    actualBalance: number,
    recordTransaction: boolean,
    note?: string
  ): Promise<boolean> => {
    const targetWallet = computedWallets.find((w) => w.id === walletId);
    const prevBalance = targetWallet?.balance || 0;
    const difference = actualBalance - prevBalance;
    const isSharedWallet = Boolean(
      targetWallet && (targetWallet.isSharedFromOther || (targetWallet.sharedWith && targetWallet.sharedWith.length > 0))
    );
    const isOwnerOfShared = Boolean(
      targetWallet && !targetWallet.isSharedFromOther && targetWallet.sharedWith && targetWallet.sharedWith.length > 0
    );

    if (!recordTransaction) {
      setWallets((prev) => {
        const next = prev.map((w) => {
          if (w.id === walletId) {
            const newInitial = (w.initialBalance ?? 0) + difference;
            return { ...w, initialBalance: newInitial, balance: actualBalance, updatedAt: Date.now(), version: (w.version || 0) + 1, lastEditedBy: user?.uid || 'guest' };
          }
          return w;
        });
        safeSetItem('ngwe_wallets', JSON.stringify(next));
        if (user?.uid) {
          const targetUid = activeWorkspaceId || user.uid;
          const updatedW = next.find((w) => w.id === walletId);
          if (updatedW) {
            // [v7.5.56] No phantom personal doc for a wallet the user
            // doesn't own; only the owner syncs a shared wallet.
            if (!updatedW.isSharedFromOther) {
              persistDoc(doc(db, 'users', targetUid, 'wallets', walletId), {
                ...updatedW,
                userId: targetUid,
              }, { merge: true });
            }
            if (!updatedW.isSharedFromOther && updatedW.sharedWith && updatedW.sharedWith.length > 0) {
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
        persistDoc(doc(db, 'users', targetUid, 'transactions', newTx.id), {
          ...newTx,
          userId: targetUid,
        }, { merge: true });

        // [v7.5.56] The adjustment transaction must ALSO be written to
        // the shared wallet (owner path), followed by a balance
        // recompute — otherwise the shared balance goes stale and the
        // other members never see the adjustment. A collaborator with
        // the matching add right may write the shared tx too, but only
        // the owner recomputes (rules: balance is owner-only).
        if (isSharedWallet && targetWallet) {
          const adjPerms = getCollaboratorPermissions(targetWallet, user.email, user.uid);
          const mayWriteShared = isIncome ? adjPerms.canAddIncome : adjPerms.canAddExpense;
          if (!mayWriteShared) {
            showToast(lang === 'my'
              ? 'စာရင်းညှိ မှတ်တမ်း ထည့်သွင်းခွင့် သင့်တွင် မရှိပါ'
              : 'You don\'t have permission to record this adjustment on the shared wallet');
            return false;
          }
          const sharedDocId = getSharedWalletDocId(targetWallet, user.uid);
          const saved = await saveSharedWalletTransaction(walletId, newTx, actualBalance, sharedDocId, user.uid);
          if (!saved) {
            showToast(cloudPendingMsg);
            return false;
          }
          if (isOwnerOfShared) {
            const recomputed = await recomputeSharedWalletBalance(sharedDocId);
            if (!recomputed) {
              showToast(cloudPendingMsg);
              return false;
            }
          }
        }
      }
    }

    showToast(
      lang === 'my'
        ? 'ငွေစာရင်း လက်ကျန်ငွေကို အောင်မြင်စွာ ညှိပြီးပါပြီ ✓'
        : 'Wallet balance reconciled successfully ✓'
    );
    return true;
  };

  // [v7.5.56] Ownership transfer — owner only, new owner must be a
  // current member. Updates ownerUid/ownerEmail/ownerName on the shared
  // doc and on the local wallet. Returns true only when the transfer
  // actually landed.
  const handleTransferOwnership = async (wallet: Wallet, newOwnerEmail: string): Promise<boolean> => {
    const cleanEmail = newOwnerEmail.trim().toLowerCase();
    if (!user?.uid) {
      showToast(lang === 'my' ? 'Sign in ဝင်ပြီးမှ ပိုင်ဆိုင်မှု လွှဲပြောင်းနိုင်ပါသည်' : 'Please sign in to transfer ownership');
      return false;
    }
    if (wallet.isSharedFromOther || (wallet.ownerUid && wallet.ownerUid !== user.uid)) {
      showToast(lang === 'my' ? 'ပိုင်ရှင်သာ ပိုင်ဆိုင်မှု လွှဲပြောင်းနိုင်ပါသည်' : 'Only the wallet owner can transfer ownership');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
      showToast(lang === 'my' ? 'မှန်ကန်သော Email လိပ်စာ ဖြစ်ရပါမည်' : 'Please enter a valid email address');
      return false;
    }
    const members = (wallet.sharedWith || []).map((e) => e.trim().toLowerCase());
    if (!members.includes(cleanEmail)) {
      showToast(lang === 'my'
        ? 'ပိုင်ဆိုင်မှု လွှဲပြောင်းမည့်သူသည် ဤ Wallet ၏ လက်ရှိ အဖွဲ့ဝင် ဖြစ်ရပါမည်'
        : 'The new owner must be a current member of this wallet');
      return false;
    }
    if (user.email && cleanEmail === user.email.trim().toLowerCase()) {
      showToast(lang === 'my' ? 'ကိုယ့်ကိုယ်ကို ပိုင်ဆိုင်မှု လွှဲပြောင်း၍ မရပါ' : 'You cannot transfer ownership to yourself');
      return false;
    }

    const confirmed = window.confirm(lang === 'my'
      ? `ဤ Wallet (${wallet.name}) ၏ ပိုင်ဆိုင်မှုကို ${cleanEmail} သို့ လွှဲပြောင်းမည်မှာ သေချာပါသလား?\n(မှတ်ချက် — လွှဲပြောင်းပြီးနောက် သင်သည် ပိုင်ရှင် မဟုတ်တော့ပါ။ Wallet ကို ဖျက်ခြင်း/မျှဝေခြင်း လုပ်ပိုင်ခွင့်များသည် ပိုင်ရှင်အသစ်ထံသို့ ရောက်သွားပါမည်)`
      : `Transfer ownership of this wallet (${wallet.nameEn || wallet.name}) to ${cleanEmail}?\n(Note — after the transfer you will no longer be the owner. Delete/share rights move to the new owner.)`);
    if (!confirmed) return false;

    // ownerUid must be a Firebase UID for the rules' owner check to work
    // for the new owner, so resolve the member's UID from their email.
    // [v7.5.56] Primary source: the shared doc's memberUids map
    // (members self-register their uid on accept / on first subscribe).
    // Fallback: the users email query (usually denied for ordinary
    // owners by the list rule). Never write a half-transfer: if the UID
    // cannot be resolved, refuse honestly instead of leaving ownerUid
    // pointing at the old owner while ownerEmail names the new one.
    let newOwnerUid: string | null = null;
    try {
      const lookupDocId = getSharedWalletDocId(wallet, user.uid);
      const sSnap = await getDoc(doc(db, 'sharedWallets', lookupDocId));
      const m = sSnap.exists() ? (sSnap.data() as any)?.memberUids : null;
      if (m && typeof m[cleanEmail] === 'string' && m[cleanEmail]) {
        newOwnerUid = m[cleanEmail] as string;
      }
    } catch (err) {
      console.warn('[v7.5.56] ownership transfer memberUids lookup failed:', err);
    }
    if (!newOwnerUid) {
      try {
        const snap = await getDocs(query(collection(db, 'users'), where('email', '==', cleanEmail)));
        if (!snap.empty) {
          newOwnerUid = snap.docs[0].id;
        }
      } catch (err) {
        console.warn('[v7.5.56] ownership transfer UID lookup failed:', err);
      }
    }
    if (!newOwnerUid) {
      showToast(lang === 'my'
        ? 'ပိုင်ရှင်အသစ်၏ အကောင့်ကို ရှာမတွေ့ပါ — သူတို့ အက်ပ်ကို တစ်ခါ ဖွင့်ပြီး Sign in ဝင်ထားကြောင်း စစ်ဆေးပါ'
        : 'Could not find the new owner\'s account — ask them to open the app and sign in first');
      return false;
    }

    const sharedDocId = getSharedWalletDocId(wallet, user.uid);
    const newOwnerName = cleanEmail.split('@')[0];
    // The new owner stops being a collaborator — they are the owner now.
    const updatedSharedWith = (wallet.sharedWith || []).filter((e) => e.trim().toLowerCase() !== cleanEmail);
    const updatedPerms = { ...(wallet.collaboratorPermissions || {}) };
    for (const key of Object.keys(updatedPerms)) {
      if (key.trim().toLowerCase() === cleanEmail) delete updatedPerms[key];
    }
    const written = await safeSetDoc(doc(db, 'sharedWallets', sharedDocId), {
      ownerUid: newOwnerUid,
      ownerEmail: cleanEmail,
      ownerName: newOwnerName,
      sharedWith: updatedSharedWith,
      collaboratorPermissions: updatedPerms,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    if (written === false) {
      showToast(cloudPendingMsg);
      return false;
    }

    const updatedWallet: Wallet = {
      ...wallet,
      ownerUid: newOwnerUid,
      ownerEmail: cleanEmail,
      ownerName: newOwnerName,
      sharedWith: updatedSharedWith,
      collaboratorPermissions: updatedPerms,
      updatedAt: Date.now(),
      version: (wallet.version || 0) + 1,
      lastEditedBy: user.uid,
    };
    const nextWallets = wallets.map((w) => (w.id === wallet.id ? updatedWallet : w));
    setWallets(nextWallets);
    safeSetItem('ngwe_wallets', JSON.stringify(nextWallets));
    persistDoc(doc(db, 'users', user.uid, 'wallets', updatedWallet.id), {
      ...updatedWallet,
      userId: user.uid,
    }, { merge: true });

    showToast(lang === 'my' ? `ပိုင်ဆိုင်မှုကို ${cleanEmail} သို့ လွှဲပြောင်းပြီးပါပြီ ✓` : `Ownership transferred to ${cleanEmail} ✓`);
    return true;
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
    handleTransferOwnership,
  };
}
