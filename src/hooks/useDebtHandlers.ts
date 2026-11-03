import type { Dispatch, SetStateAction } from 'react';
import { doc } from 'firebase/firestore';
import { db, safeSetDoc, safeDeleteDoc, isQuotaExhausted } from '../lib/firebase';
import { safeSetItem } from '../utils/storage';
import { syncQueue } from '../lib/syncQueue';
import { markTxDeleted } from '../utils/deletedMarkers';
import { getLocalDateString } from '../utils/dateUtils';
import { isWalletMatch } from '../utils/walletBalance';
import {
  getSharedWalletDocId,
  saveSharedWalletTransaction,
  deleteSharedWalletTransaction,
  // [v7.5.56] Provided by the shared-wallet service worker — recomputes
  // a shared wallet's stored balance from its cloud transactions.
  recomputeSharedWalletBalance,
} from '../lib/sharedWalletService';
import type { Debt, PlanLimits, PlanType, Transaction, Wallet } from '../types';

interface UseDebtHandlersParams {
  user: { uid: string; email?: string | null; displayName?: string | null } | null;
  activeWorkspaceId: string | null | undefined;
  plan: PlanType;
  limits: PlanLimits;
  lang: 'my' | 'en';
  showToast: (msg: string) => void;
  setIsAuthModalOpen: (open: boolean) => void;
  setIsPremiumModalOpen: (open: boolean) => void;
  debts: Debt[];
  setDebts: Dispatch<SetStateAction<Debt[]>>;
  wallets: Wallet[];
  transactions: Transaction[];
  setTransactions: Dispatch<SetStateAction<Transaction[]>>;
  setCloudTxIds: Dispatch<SetStateAction<Set<string>>>;
  markDebtLocalWrite: (debtId: string) => void;
}

/**
 * Debt handlers — extracted from App.tsx (Phase 5 refactor).
 * v6.3.2 auto-settle, v6.3.1 repayment scope fix preserved.
 */
export function useDebtHandlers({
  user,
  activeWorkspaceId,
  plan,
  limits,
  lang,
  showToast,
  setIsAuthModalOpen,
  setIsPremiumModalOpen,
  debts,
  setDebts,
  wallets,
  transactions,
  setTransactions,
  setCloudTxIds,
  markDebtLocalWrite,
}: UseDebtHandlersParams) {

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

  // [v7.5.56] Shared-wallet debt helpers (B).
  // DECISION — debts on a SHARED wallet are shared-visible: the debt
  // lives in users/{uid}/debts (owner canonical) AND in
  // sharedWallets/{docId}/debts (member-visible mirror, same id), and
  // its linked wallet transaction goes through the shared path.
  const creatorName = user?.displayName || user?.email?.split('@')[0] || '';
  const isSharedWallet = (w?: Wallet | null): boolean =>
    !!w && (!!w.isSharedFromOther || (w.sharedWith?.length || 0) > 0);
  const isWalletOwner = (w?: Wallet | null): boolean =>
    !w || !w.isSharedFromOther || !w.ownerUid || w.ownerUid === user?.uid;
  const randomSuffix = () => Math.random().toString(36).slice(2, 8);
  const txEffect = (t: Transaction): number => (t.type === 'income' ? t.amount : -t.amount);
  const sharedFailMsg =
    lang === 'my'
      ? '⚠️ မျှဝေထားသော ပိုက်ဆံအိတ်သို့ Cloud သို့ သိမ်းဆည်း၍ မရပါ — အင်တာနက်ရလျှင် အလိုအလျောက် ထပ်တင်ပါမည်'
      : '⚠️ Could not save to the shared wallet cloud — it will retry automatically when you are back online';
  const sharedDebtFailMsg =
    lang === 'my'
      ? '⚠️ မျှဝေထားသော အကြွေးကို အခြားအဖွဲ့ဝင်ထံ ပြသ၍ မရပါ — သင့်စာရင်းထဲတွင် သိမ်းထားပြီးဖြစ်ပါသည်'
      : '⚠️ Could not share this debt with the other member — it is saved in your own records';

  // [v7.5.56 A9] Same shared-write retry as the transaction handlers,
  // via the queue worker's helpers (src/lib/syncQueue.ts):
  //   syncQueue.enqueueSharedWalletTx(sharedDocId, tx, user.uid)
  //     → enqueue('sharedWallets', `${sharedDocId}/transactions/${tx.id}`,
  //         'upsert', ownerUid, { ...tx, walletId: sharedDocId })
  //   syncQueue.enqueueSharedWalletTxDelete(sharedDocId, tx.id, user.uid)
  //     → enqueue('sharedWallets', `${sharedDocId}/transactions/${tx.id}`,
  //         'delete', ownerUid)
  const enqueueSharedTxRetry = (tx: Transaction, sharedDocId: string, operation: 'upsert' | 'delete') => {
    if (!user?.uid || !sharedDocId || !tx?.id) return;
    if (operation === 'delete') {
      syncQueue.enqueueSharedWalletTxDelete(sharedDocId, tx.id, user.uid);
    } else {
      syncQueue.enqueueSharedWalletTx(sharedDocId, { ...tx, sharedDocId, walletId: sharedDocId }, user.uid);
    }
  };
  // Checked shared write for a debt-linked tx: post-change balance,
  // recompute after. Returns false when the cloud write did not land.
  const saveLinkedTxSharedChecked = async (tx: Transaction, wallet: Wallet, postBalance: number): Promise<boolean> => {
    if (!user?.uid) return false;
    const sharedDocId = getSharedWalletDocId(wallet, user.uid);
    const ok = await saveSharedWalletTransaction(wallet.id, tx, postBalance, sharedDocId, user.uid);
    if (!ok) {
      enqueueSharedTxRetry(tx, sharedDocId, 'upsert');
      return false;
    }
    return recomputeSharedWalletBalance(sharedDocId);
  };
  const deleteLinkedTxSharedChecked = async (txId: string, wallet: Wallet, postBalance: number): Promise<boolean> => {
    if (!user?.uid) return false;
    const sharedDocId = getSharedWalletDocId(wallet, user.uid);
    const ok = await deleteSharedWalletTransaction(wallet.id, txId, postBalance, sharedDocId, user.uid);
    if (!ok) {
      enqueueSharedTxRetry({ id: txId } as Transaction, sharedDocId, 'delete');
      return false;
    }
    return recomputeSharedWalletBalance(sharedDocId);
  };
  // Mirror a shared-wallet debt (or its deletion) to the member-visible
  // copy. Checked: a false result toasts — the personal copy is the
  // canonical one and is always written first.
  const mirrorSharedDebtChecked = async (debt: Debt, sharedDocId: string): Promise<boolean> => {
    if (!user?.uid) return false;
    const ok = await safeSetDoc(doc(db, 'sharedWallets', sharedDocId, 'debts', debt.id), {
      ...debt,
      userId: user.uid,
    }, { merge: true });
    if (!ok) {
      syncQueue.enqueueSharedWalletDebt(sharedDocId, debt, user.uid);
    }
    return ok;
  };
  const deleteSharedDebtMirrorChecked = async (debtId: string, sharedDocId: string): Promise<boolean> => {
    if (!user?.uid) return false;
    const ok = await safeDeleteDoc(doc(db, 'sharedWallets', sharedDocId, 'debts', debtId));
    if (!ok) {
      syncQueue.enqueueSharedWalletDebtDelete(sharedDocId, debtId, user.uid);
    }
    return ok;
  };
  const walletOfDebt = (debt: Debt): Wallet | undefined =>
    wallets.find((w) => isWalletMatch(w, debt.walletId));
  // A collaborator may only delete a shared debt they created (or one
  // on a wallet they own); legacy debts with no createdBy fall back to
  // the owner check.
  const canDeleteSharedDebt = (debt: Debt): boolean => {
    const w = walletOfDebt(debt);
    if (!isSharedWallet(w)) return true;
    if (isWalletOwner(w)) return true;
    if (debt.createdBy && user?.uid && debt.createdBy !== user.uid) return false;
    return true;
  };
  // [v7.5.56] Shared debts are read-only for collaborators (decision 17):
  // only the creator or the wallet owner may mutate one (toggle/settle,
  // edit, repayments). Same rule as delete.
  const canMutateSharedDebt = (debt: Debt): boolean => canDeleteSharedDebt(debt);

  const handleAddDebt = (newDebt: Omit<Debt, 'id' | 'paidAmount' | 'repayments' | 'status' | 'createdAt'>) => {
    const id = `debt_${Date.now()}_${randomSuffix()}`;
    // [v7.5.55 D12] The debt amount is denominated in its wallet's currency.
    const debtWallet = wallets.find((w) => w.id === newDebt.walletId);
    // [v7.5.56 B] Shared-wallet debt: mirror it for the other member.
    const sharedDocId = debtWallet && isSharedWallet(debtWallet) && user?.uid
      ? getSharedWalletDocId(debtWallet, user.uid)
      : undefined;
    const debt: Debt = {
      ...newDebt,
      currency: newDebt.currency || debtWallet?.currency || 'MMK',
      id,
      paidAmount: 0,
      repayments: [],
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
      lastEditedBy: user?.uid || 'guest',
      // [v7.5.56 B] Shared debts carry their wallet + author so the
      // other member can see them read-only.
      sharedWalletId: sharedDocId,
      createdBy: user?.uid || undefined,
      createdByName: creatorName || undefined,
    };

    setDebts((prev) => [debt, ...prev]);

    // Auto-create transaction in the chosen Wallet so income/expense & wallet balance stay 100% in sync
    const isReceivable = newDebt.type === 'receivable';
    const txId = `tx_debt_${id}`;
    const debtTx: Transaction = {
      id: txId,
      type: isReceivable ? 'expense' : 'income',
      amount: newDebt.totalAmount,
      category: isReceivable ? 'cat_debt_issued' : 'cat_debt_received',
      walletId: newDebt.walletId,
      date: newDebt.startDate,
      note: isReceivable
        ? `[အကြွေးထုတ်ပေးခြင်း] ➔ ${newDebt.personName}${newDebt.note ? ` (${newDebt.note})` : ''}`
        : `[အကြွေးရယူခြင်း] ⬅ ${newDebt.personName}${newDebt.note ? ` (${newDebt.note})` : ''}`,
      createdAt: Date.now(),
      // [v7.5.56 A1] Stamp the creator on the linked transaction too.
      createdBy: user?.uid || undefined,
      createdByName: creatorName || undefined,
    };

    setTransactions((prev) => {
      const next = [debtTx, ...prev];
      safeSetItem('ngwe_transactions', JSON.stringify(next));
      return next;
    });

    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      reportCloudWrite(safeSetDoc(doc(db, 'users', targetUid, 'debts', id), {
        ...debt,
        userId: targetUid,
      }, { merge: true }));

      reportCloudWrite(safeSetDoc(doc(db, 'users', targetUid, 'transactions', txId), {
        ...debtTx,
        userId: targetUid,
      }, { merge: true }));

      // [v7.5.56 B] Shared-wallet debt: mirror the debt + send the linked
      // transaction through the shared path so both sides see the
      // balance move (checked; failures toast honestly).
      if (sharedDocId && debtWallet) {
        mirrorSharedDebtChecked(debt, sharedDocId).then((ok) => {
          if (!ok) showToast(sharedDebtFailMsg);
        });
        saveLinkedTxSharedChecked(
          debtTx,
          debtWallet,
          (Number(debtWallet.balance) || 0) + txEffect(debtTx)
        ).then((ok) => {
          if (!ok) showToast(sharedFailMsg);
        });
      }
    }

    showToast(lang === 'my' ? 'အကြွေးစာရင်းနှင့် Wallet ဝင်ငွေ/ထွက်ငွေ စာရင်း ချိတ်ဆက်ပြီးပါပြီ ✓' : 'Debt record & wallet transaction synced ✓');
  };

  // [v7.5.56 B] Debt delete is cloud-first (like transaction delete):
  // the debt docs (personal + shared mirror) and every linked tx must
  // confirm in the cloud before anything is removed locally. A live
  // failure keeps the record and toasts; only failures already queued
  // for retry (offline / quota) proceed locally.
  const handleDeleteDebt = async (id: string) => {
    const targetDebtForDel = debts.find((d) => d.id === id);
    if (!targetDebtForDel) return;
    // [v7.5.56 B] A collaborator may only delete a shared debt they
    // created (owners may delete any debt on their wallet).
    if (!canDeleteSharedDebt(targetDebtForDel)) {
      showToast(
        lang === 'my'
          ? '⚠️ ဤအကြွေးကို ဖျက်၍ မရပါ — ပိုင်ရှင် (သို့မဟုတ် ဖန်တီးသူ) သာ ဖျက်နိုင်ပါသည်'
          : 'Permission denied: only the wallet owner (or the debt creator) can delete this shared debt'
      );
      return;
    }

    // [v6.1.11] Collect ALL linked transaction ids (main + every repayment)
    const txIdsToDelete = new Set<string>();
    txIdsToDelete.add(`tx_debt_${id}`);
    if (targetDebtForDel?.repayments) {
      targetDebtForDel.repayments.forEach((r) => {
        if (r.transactionId) txIdsToDelete.add(r.transactionId);
      });

      // Fallback for legacy repayments without transactionId
      const isReceivable = targetDebtForDel.type === 'receivable';
      const expectedType = isReceivable ? 'income' : 'expense';
      const expectedCat = isReceivable ? 'cat_debt_repayment' : 'cat_debt_payment';
      targetDebtForDel.repayments.forEach((r) => {
        if (r.transactionId) return;
        const matched = transactions.find(
          (t) =>
            t.type === expectedType &&
            t.category === expectedCat &&
            t.amount === r.amount &&
            t.date === r.date &&
            t.walletId === r.walletId &&
            (t.note || '').includes(targetDebtForDel.personName)
        );
        if (matched) txIdsToDelete.add(matched.id);
      });
    }

    // Cloud deletes first (debt docs, then linked txs). Anything that
    // fails live stays local so the user can retry it.
    const failedTxIds = new Set<string>();
    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      const debtWallet = walletOfDebt(targetDebtForDel);
      const sharedDocId =
        targetDebtForDel.sharedWalletId ||
        (debtWallet && isSharedWallet(debtWallet) ? getSharedWalletDocId(debtWallet, user.uid) : undefined);
      const queuedForRetry =
        (typeof navigator !== 'undefined' && !navigator.onLine) || isQuotaExhausted();

      const debtDocOk = await safeDeleteDoc(doc(db, 'users', targetUid, 'debts', id));
      let mirrorOk = true;
      if (sharedDocId) {
        mirrorOk = await deleteSharedDebtMirrorChecked(id, sharedDocId);
      }
      if ((!debtDocOk || !mirrorOk) && !queuedForRetry) {
        showToast(
          lang === 'my'
            ? '⚠️ Cloud မှ အကြွေးကို ဖျက်၍ မရပါ — စာရင်းကို ထားရှိထားပါသည်။ အင်တာနက်စစ်ပြီး ထပ်ကြိုးစားပါ'
            : '⚠️ Could not delete the debt from cloud — the record was kept. Check your connection and retry'
        );
        return;
      }

      // Linked txs (personal + shared path where the wallet is shared).
      const runningBalances = new Map<string, number>();
      for (const tid of txIdsToDelete) {
        const tx = transactions.find((t) => t.id === tid);
        const personalOk = await safeDeleteDoc(doc(db, 'users', targetUid, 'transactions', tid));
        let ok = personalOk;
        if (tx) {
          const txWallet = wallets.find((w) => isWalletMatch(w, tx.walletId));
          if (txWallet && isSharedWallet(txWallet)) {
            const running = runningBalances.has(txWallet.id)
              ? runningBalances.get(txWallet.id)!
              : (Number(txWallet.balance) || 0);
            const postBal = running - txEffect(tx);
            runningBalances.set(txWallet.id, postBal);
            const sharedOk = await deleteLinkedTxSharedChecked(tid, txWallet, postBal);
            if (!sharedOk) ok = false;
          }
        }
        if (!ok && !queuedForRetry) failedTxIds.add(tid);
      }
    }

    const removedTxIds = new Set(Array.from(txIdsToDelete).filter((tid) => !failedTxIds.has(tid)));

    setDebts((prev) => {
      const next = prev.filter((d) => d.id !== id);
      safeSetItem('ngwe_debts', JSON.stringify(next));
      return next;
    });

    removedTxIds.forEach((tid) => markTxDeleted(tid));
    setTransactions((prev) => {
      const next = prev.filter((t) => !removedTxIds.has(t.id));
      safeSetItem('ngwe_transactions', JSON.stringify(next));
      return next;
    });

    setCloudTxIds((prev) => {
      const next = new Set(prev);
      removedTxIds.forEach((tid) => next.delete(tid));
      safeSetItem('ngwe_cloud_tx_ids', JSON.stringify(Array.from(next)));
      return next;
    });
    removedTxIds.forEach((tid) => syncQueue.remove('transactions', tid));

    if (user?.uid && removedTxIds.size > 0) {
      const targetUid = activeWorkspaceId || user.uid;
      (async () => {
        try {
          const { deleteTransactionDirectHttp } = await import('../lib/directFirestoreHttp');
          await Promise.allSettled(Array.from(removedTxIds).map((tid) => deleteTransactionDirectHttp(tid, targetUid)));
        } catch (e) {
          console.warn('[deleteDebt] REST verify notice:', e);
        }
      })();
    }

    showToast(
      failedTxIds.size > 0
        ? (lang === 'my'
          ? `⚠️ အကြွေးစာရင်း ဖျက်ပြီးပါပြီ — တွဲဖက် ငွေစာရင်း ${failedTxIds.size} ခု Cloud မှ ဖျက်၍ မရသဖြင့် ထားရှိထားပါသည်`
          : `Debt deleted — ${failedTxIds.size} linked transaction(s) could not be deleted from cloud and were kept`)
        : (lang === 'my'
          ? `အကြွေးစာရင်းနှင့် တွဲဖက်ငွေစာရင်း (${removedTxIds.size}) ခု ဖျက်လိုက်ပါပြီ`
          : `Debt record & ${removedTxIds.size} linked transactions deleted`)
    );
  };

  const handleToggleDebtStatus = (id: string) => {
    // [v6.3.2] auto-settle creates linked transaction; reopen deletes it
    const targetDebt = debts.find((d) => d.id === id);
    if (!targetDebt) return;
    // [v7.5.56] Shared debts are read-only for collaborators (decision 17).
    if (!canMutateSharedDebt(targetDebt)) {
      showToast(
        lang === 'my'
          ? '⚠️ ဤအကြွေးကို ပြင်၍ မရပါ — ပိုင်ရှင် (သို့မဟုတ် ဖန်တီးသူ) သာ ပြင်နိုင်ပါသည်'
          : 'Permission denied: only the wallet owner (or the debt creator) can change this shared debt'
      );
      return;
    }
    // [v7.5.55 D4] A debt whose total is 0 cannot be meaningfully reopened.
    if (targetDebt.status === 'settled' && targetDebt.totalAmount <= 0) {
      showToast(lang === 'my' ? 'ဤအကြွေး၏ စုစုပေါင်းပမာဏမှာ ၀ ဖြစ်နေသဖြင့် ပြန်ဖွင့်၍ မရပါ' : 'Cannot reopen a debt with a total of 0');
      return;
    }

    const newStatus = targetDebt.status === 'active' ? 'settled' : 'active';
    const isReceivable = targetDebt.type === 'receivable';
    const today = getLocalDateString(); // [v7.5.55] local date, not UTC toISOString()

    let newSettlementTx: Transaction | null = null;
    let deletedSettlementTxIds: string[] = [];
    let removedRepaymentCount = 0;
    let updatedRepayments = [...(targetDebt.repayments || [])];

    if (newStatus === 'settled') {
      const currentPaid = updatedRepayments.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
      const remaining = targetDebt.totalAmount - currentPaid;
      if (remaining > 0) {
        const settlementTxId = `tx_rep_${id}_settle_${Date.now()}_${randomSuffix()}`;
        updatedRepayments = [{
          id: `rep_settle_${Date.now()}`,
          amount: remaining,
          date: today,
          walletId: targetDebt.walletId,
          note: lang === 'my' ? '[အကြွေးကျေဇယား အလိုအလျောက် ပေးဆပ်မှု]' : '[Auto settlement repayment]',
          transactionId: settlementTxId,
          createdAt: Date.now(),
        }, ...updatedRepayments];

        newSettlementTx = {
          id: settlementTxId,
          type: isReceivable ? 'income' : 'expense',
          amount: remaining,
          category: isReceivable ? 'cat_debt_repayment' : 'cat_debt_payment',
          walletId: targetDebt.walletId,
          date: today,
          note: isReceivable
            ? `[အကြွေးပြန်ရငွေ] ⬅ ${targetDebt.personName} (အကြွေးကျေဇယား)`
            : `[အကြွေးပြန်ဆပ်ငွေ] ➔ ${targetDebt.personName} (အကြွေးကျေဇယား)`,
          createdAt: Date.now(),
          // [v7.5.56 A1] Stamp the creator on the settlement transaction.
          createdBy: user?.uid || undefined,
          createdByName: creatorName || undefined,
        };
      }
    } else {
      const settlementReps = updatedRepayments.filter((r) => r.id.startsWith('rep_settle_'));
      deletedSettlementTxIds = settlementReps
        .map((r) => r.transactionId)
        .filter((tid): tid is string => Boolean(tid));
      updatedRepayments = updatedRepayments.filter((r) => !r.id.startsWith('rep_settle_'));
      // [v7.5.55 D4] CHOSEN APPROACH — delete the most recent ordinary
      // repayment(s) until paid < total. A naturally-settled debt (ordinary
      // repayments totalling the full amount) has no rep_settle_ record, so
      // the old code removed nothing and the debt silently stayed settled.
      // The alternative (a settled-by flag) would leave paid >= total while
      // status is 'active' — an inconsistent money record. Deleting is the
      // honest option, and the confirm in DebtsView names exactly which
      // repayment records + linked wallet transactions will be removed, so
      // nothing is lost silently.
      let paidNow = updatedRepayments.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
      if (paidNow >= targetDebt.totalAmount) {
        const sorted = [...updatedRepayments].sort((a, b) =>
          (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0));
        const removedIds = new Set<string>();
        for (const r of sorted) {
          if (paidNow < targetDebt.totalAmount) break;
          removedIds.add(r.id);
          removedRepaymentCount += 1;
          paidNow -= Number(r.amount) || 0;
          if (r.transactionId) {
            deletedSettlementTxIds.push(r.transactionId);
          } else {
            // Legacy repayment without transactionId: locate the linked tx
            // the same way handleDeleteDebt does.
            const expectedType = isReceivable ? 'income' : 'expense';
            const expectedCat = isReceivable ? 'cat_debt_repayment' : 'cat_debt_payment';
            const matched = transactions.find(
              (t) =>
                t.type === expectedType &&
                t.category === expectedCat &&
                t.amount === r.amount &&
                t.date === r.date &&
                t.walletId === r.walletId &&
                (t.note || '').includes(targetDebt.personName)
            );
            if (matched) deletedSettlementTxIds.push(matched.id);
          }
        }
        updatedRepayments = updatedRepayments.filter((r) => !removedIds.has(r.id));
      }
    }

    const newPaid = updatedRepayments.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    // [v6.9-phase2a-v2] Derive status from paidAmount vs totalAmount.
    const derivedStatus: Debt['status'] = newPaid >= targetDebt.totalAmount ? 'settled' : 'active';
    const updatedDebt: Debt = {
      ...targetDebt,
      status: derivedStatus,
      repayments: updatedRepayments,
      paidAmount: newPaid,
      updatedAt: Date.now(),
      version: (targetDebt.version || 0) + 1,
      lastEditedBy: user?.uid || 'guest',
    };

    markDebtLocalWrite(id); // [v6.3.3] protect from cloud override
    setDebts((prev) => {
      const next = prev.map((d) => (d.id === id ? updatedDebt : d));
      safeSetItem('ngwe_debts', JSON.stringify(next));
      return next;
    });

    if (newSettlementTx) {
      const tx = newSettlementTx;
      setTransactions((prev) => {
        const next = [tx, ...prev];
        safeSetItem('ngwe_transactions', JSON.stringify(next));
        return next;
      });
    }

    if (deletedSettlementTxIds.length > 0) {
      deletedSettlementTxIds.forEach((tid) => markTxDeleted(tid));
      setTransactions((prev) => {
        const next = prev.filter((t) => !deletedSettlementTxIds.includes(t.id));
        safeSetItem('ngwe_transactions', JSON.stringify(next));
        return next;
      });
      setCloudTxIds((prev) => {
        const next = new Set(prev);
        deletedSettlementTxIds.forEach((tid) => next.delete(tid));
        safeSetItem('ngwe_cloud_tx_ids', JSON.stringify(Array.from(next)));
        return next;
      });
      deletedSettlementTxIds.forEach((tid) => syncQueue.remove('transactions', tid));
    }

    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      reportCloudWrite(safeSetDoc(doc(db, 'users', targetUid, 'debts', id), {
        ...updatedDebt,
        userId: targetUid,
      }, { merge: true }));

      // [v7.5.56 B] Shared-wallet debt: mirror the new status to the
      // member-visible copy and route its linked txs through the
      // shared path (checked; failures toast honestly).
      const toggleWallet = walletOfDebt(targetDebt);
      const toggleSharedDocId =
        targetDebt.sharedWalletId ||
        (toggleWallet && isSharedWallet(toggleWallet) ? getSharedWalletDocId(toggleWallet, user.uid) : undefined);
      if (toggleSharedDocId) {
        mirrorSharedDebtChecked(updatedDebt, toggleSharedDocId).then((ok) => {
          if (!ok) showToast(sharedDebtFailMsg);
        });
      }

      if (newSettlementTx) {
        reportCloudWrite(safeSetDoc(doc(db, 'users', targetUid, 'transactions', newSettlementTx.id), {
          ...newSettlementTx,
          userId: targetUid,
        }, { merge: true }));
        if (toggleWallet && isSharedWallet(toggleWallet)) {
          saveLinkedTxSharedChecked(
            newSettlementTx,
            toggleWallet,
            (Number(toggleWallet.balance) || 0) + txEffect(newSettlementTx)
          ).then((ok) => {
            if (!ok) showToast(sharedFailMsg);
          });
        }
      }

      if (deletedSettlementTxIds.length > 0) {
        deletedSettlementTxIds.forEach((tid) => {
          reportCloudWrite(safeDeleteDoc(doc(db, 'users', targetUid, 'transactions', tid)));
          const delTx = transactions.find((t) => t.id === tid);
          if (delTx) {
            const delWallet = wallets.find((w) => isWalletMatch(w, delTx.walletId));
            if (delWallet && isSharedWallet(delWallet)) {
              deleteLinkedTxSharedChecked(tid, delWallet, (Number(delWallet.balance) || 0) - txEffect(delTx)).then((ok) => {
                if (!ok) showToast(sharedFailMsg);
              });
            }
          }
        });
        (async () => {
          try {
            const { deleteTransactionDirectHttp } = await import('../lib/directFirestoreHttp');
            await Promise.allSettled(deletedSettlementTxIds.map((tid) => deleteTransactionDirectHttp(tid, targetUid)));
          } catch (e) {
            console.warn('[toggleDebtStatus] REST verify notice:', e);
          }
        })();
      }
    }

    showToast(
      lang === 'my'
        ? (derivedStatus === 'settled'
          ? 'အကြွေးကြေပြီ — ငွေစာရင်းထဲ ထည့်ပြီးပါပြီ ✓'
          : removedRepaymentCount > 0
          ? `အကြွေးပြန်ဖွင့်ပြီ — နောက်ဆုံး ငွေဆပ်မှတ်တမ်း ${removedRepaymentCount} ခုနှင့် တွဲဖက် ငွေစာရင်းများ ဖျက်ပြီးပါပြီ ✓`
          : 'အကြွေးပြန်ဖွင့်ပြီ — ငွေစာရင်းမှ ဖျက်ပြီးပါပြီ ✓')
        : (derivedStatus === 'settled'
          ? 'Debt settled — transaction recorded ✓'
          : removedRepaymentCount > 0
          ? `Debt reopened — removed ${removedRepaymentCount} most recent repayment(s) + linked transactions ✓`
          : 'Debt reopened — settlement removed ✓')
    );
  };

  // [v7.5.55 D28] Edit a debt itself (person, amount, type, dates, wallet,
  // note, currency) and keep its linked main transaction consistent: the
  // main tx amount/wallet/date/note follow the edited debt, so the wallet
  // balance and the income/expense totals stay in sync. Repayments are NOT
  // touched; if the new total is below what is already paid, the debt
  // becomes settled by derivation and the toast says so.
  const handleUpdateDebt = (updated: Debt) => {
    const prev = debts.find((d) => d.id === updated.id);
    if (!prev) return;
    // [v7.5.56] Shared debts are read-only for collaborators (decision 17).
    if (!canMutateSharedDebt(prev)) {
      showToast(
        lang === 'my'
          ? '⚠️ ဤအကြွေးကို ပြင်၍ မရပါ — ပိုင်ရှင် (သို့မဟုတ် ဖန်တီးသူ) သာ ပြင်နိုင်ပါသည်'
          : 'Permission denied: only the wallet owner (or the debt creator) can change this shared debt'
      );
      return;
    }
    const txId = `tx_debt_${updated.id}`;
    const isReceivable = updated.type === 'receivable';
    const paidFromRepayments = (updated.repayments || []).reduce(
      (sum, r) => sum + (Number(r.amount) || 0), 0
    );
    const newPaid = paidFromRepayments > 0 ? paidFromRepayments : (prev.paidAmount || 0);
    const newStatus: Debt['status'] = newPaid >= updated.totalAmount ? 'settled' : 'active';
    const updatedDebt: Debt = {
      ...prev,
      ...updated,
      repayments: updated.repayments ?? prev.repayments ?? [],
      paidAmount: newPaid,
      status: newStatus,
      currency: updated.currency || prev.currency || wallets.find((w) => w.id === updated.walletId)?.currency || 'MMK',
      // [v7.5.56 B] A shared debt keeps its mirror pointer + author
      // across edits — never drop them when the form re-submits.
      sharedWalletId: updated.sharedWalletId ?? prev.sharedWalletId,
      createdBy: prev.createdBy ?? user?.uid,
      createdByName: prev.createdByName ?? creatorName,
      updatedAt: Date.now(),
      version: (prev.version || 0) + 1,
      lastEditedBy: user?.uid || 'guest',
    };

    markDebtLocalWrite(updated.id);
    setDebts((prevDebts) => {
      const next = prevDebts.map((d) => (d.id === updated.id ? updatedDebt : d));
      safeSetItem('ngwe_debts', JSON.stringify(next));
      return next;
    });

    // Keep the linked main transaction consistent with the edited debt.
    setTransactions((prevTxs) => {
      const next = prevTxs.map((t) => {
        if (t.id !== txId) return t;
        return {
          ...t,
          type: isReceivable ? 'expense' : 'income',
          amount: updated.totalAmount,
          category: isReceivable ? 'cat_debt_issued' : 'cat_debt_received',
          walletId: updated.walletId,
          date: updated.startDate,
          note: isReceivable
            ? `[အကြွေးထုတ်ပေးခြင်း] ➔ ${updated.personName}${updated.note ? ` (${updated.note})` : ''}`
            : `[အကြွေးရယူခြင်း] ⬅ ${updated.personName}${updated.note ? ` (${updated.note})` : ''}`,
        } as Transaction;
      });
      safeSetItem('ngwe_transactions', JSON.stringify(next));
      return next;
    });

    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      reportCloudWrite(safeSetDoc(doc(db, 'users', targetUid, 'debts', updated.id), {
        ...updatedDebt,
        userId: targetUid,
      }, { merge: true }));
      // [v7.5.56 B] Keep the linked main tx's author; route it through
      // the shared path when the (new) wallet is shared, and remove it
      // from the old wallet's shared doc when the wallet changed.
      const prevMainTx = transactions.find((t) => t.id === txId);
      const mainTxForCloud: Transaction = {
        id: txId,
        type: isReceivable ? 'expense' : 'income',
        amount: updated.totalAmount,
        category: isReceivable ? 'cat_debt_issued' : 'cat_debt_received',
        walletId: updated.walletId,
        date: updated.startDate,
        note: isReceivable
          ? `[အကြွေးထုတ်ပေးခြင်း] ➔ ${updated.personName}${updated.note ? ` (${updated.note})` : ''}`
          : `[အကြွေးရယူခြင်း] ⬅ ${updated.personName}${updated.note ? ` (${updated.note})` : ''}`,
        createdAt: prevMainTx?.createdAt || Date.now(),
        createdBy: prevMainTx?.createdBy,
        createdByName: prevMainTx?.createdByName,
      };
      reportCloudWrite(safeSetDoc(doc(db, 'users', targetUid, 'transactions', txId), {
        ...mainTxForCloud,
        userId: targetUid,
      }, { merge: true }));
      const newDebtWallet = wallets.find((w) => isWalletMatch(w, updated.walletId));
      const oldDebtWallet = wallets.find((w) => isWalletMatch(w, prev.walletId));
      if (newDebtWallet && isSharedWallet(newDebtWallet)) {
        const oldEffect = prevMainTx ? txEffect(prevMainTx) : 0;
        const sameWallet = oldDebtWallet ? isWalletMatch(oldDebtWallet, updated.walletId) : false;
        saveLinkedTxSharedChecked(
          mainTxForCloud,
          newDebtWallet,
          (Number(newDebtWallet.balance) || 0) - (sameWallet ? oldEffect : 0) + txEffect(mainTxForCloud)
        ).then((ok) => {
          if (!ok) showToast(sharedFailMsg);
        });
      }
      if (oldDebtWallet && !isWalletMatch(oldDebtWallet, updated.walletId) && isSharedWallet(oldDebtWallet)) {
        deleteLinkedTxSharedChecked(
          txId,
          oldDebtWallet,
          (Number(oldDebtWallet.balance) || 0) - (prevMainTx ? txEffect(prevMainTx) : 0)
        ).then((ok) => {
          if (!ok) showToast(sharedFailMsg);
        });
      }
      // [v7.5.56 B] Mirror the edited debt for the other member.
      const updateSharedDocId =
        updatedDebt.sharedWalletId ||
        (newDebtWallet && isSharedWallet(newDebtWallet) ? getSharedWalletDocId(newDebtWallet, user.uid) : undefined);
      if (updateSharedDocId) {
        mirrorSharedDebtChecked(updatedDebt, updateSharedDocId).then((ok) => {
          if (!ok) showToast(sharedDebtFailMsg);
        });
      }
    }

    showToast(
      lang === 'my'
        ? (newStatus === 'settled' && prev.status === 'active'
          ? 'အကြွေး ပြင်ဆင်ပြီးပါပြီ — ဆပ်ပြီးငွေက စုစုပေါင်းထက် များနေသဖြင့် အကြွေးကြေပြီဟု သတ်မှတ်လိုက်ပါသည် ✓'
          : 'အကြွေး ပြင်ဆင်ပြီး — တွဲဖက် ငွေစာရင်းပါ ညှိပြီးပါပြီ ✓')
        : (newStatus === 'settled' && prev.status === 'active'
          ? 'Debt updated — paid now covers the new total, so it is settled ✓'
          : 'Debt updated — linked transaction synced ✓')
    );
  };

  const handleRecordRepaymentSubmit = (
    debtId: string,
    amount: number,
    date: string,
    walletId: string,
    note?: string
  ) => {
    let repTxId = '';  // [FIX v6.3.1] scope fix — declared before if block
    let finalAmount = 0;  // [v6.9-phase2a-v2] function scope for cap
    const targetDebt = debts.find((d) => d.id === debtId);
    // [v7.5.56] Shared debts are read-only for collaborators (decision 17).
    if (targetDebt && !canMutateSharedDebt(targetDebt)) {
      showToast(
        lang === 'my'
          ? '⚠️ ဤအကြွေးကို ပြင်၍ မရပါ — ပိုင်ရှင် (သို့မဟုတ် ဖန်တီးသူ) သာ ပြင်နိုင်ပါသည်'
          : 'Permission denied: only the wallet owner (or the debt creator) can change this shared debt'
      );
      return;
    }
    if (targetDebt) {
      const currentPaid = (targetDebt.repayments && targetDebt.repayments.length > 0)
        ? targetDebt.repayments.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
        : (targetDebt.paidAmount || 0);
      const remaining = Math.max(0, targetDebt.totalAmount - currentPaid);
      finalAmount = amount; // [v6.9-phase2a-v2] default (capped below if needed)
      if (remaining <= 0) {
        showToast(
          lang === 'my'
            ? 'ဤအကြွေးကို အပြည့်အဝ ဆပ်ပြီးဖြစ်ပါသည်။ ထပ်မံ ဆပ်ရန် မလိုအပ်ပါ။'
            : 'This debt is already fully paid. No repayment needed.'
        );
        return;
      }
      if (amount > remaining) {
        const overAmount = amount - remaining;
        const confirmMsg = lang === 'my'
          ? `ထည့်သွင်းမည့် ငွေပမာဏ (${amount.toLocaleString()} Ks) သည် ပေးရန်ကျန်ငွေ (${remaining.toLocaleString()} Ks) ထက် ${overAmount.toLocaleString()} Ks ပိုလွန်နေပါသည်။\n\nကျန်ငွေ ${remaining.toLocaleString()} Ks သာ သိမ်းဆည်းမည်လား?`
          : `Amount (${amount.toLocaleString()}) exceeds remaining (${remaining.toLocaleString()}).\n\nCap to ${remaining.toLocaleString()} and record?`;
        if (!window.confirm(confirmMsg)) {
          return;
        }
        finalAmount = remaining; // [v6.9-phase2a-v2] cap to remaining
      }

      const isReceivable = targetDebt.type === 'receivable';
      repTxId = `tx_rep_${debtId}_${Date.now()}_${randomSuffix()}`;  // [FIX v6.3.1] assigned, not declared
      const repTx: Transaction = {
        id: repTxId,
        type: isReceivable ? 'income' : 'expense',
        amount: finalAmount, // [v6.9-phase2a-v2] cap-aware
        category: isReceivable ? 'cat_debt_repayment' : 'cat_debt_payment',
        walletId,
        date,
        note: isReceivable
          ? `[အကြွေးပြန်ရငွေ] ⬅ ${targetDebt.personName}${note ? ` (${note})` : ''}`
          : `[အကြွေးပြန်ဆပ်ငွေ] ➔ ${targetDebt.personName}${note ? ` (${note})` : ''}`,
        createdAt: Date.now(),
        // [v7.5.56 A1] Stamp the creator on the repayment transaction.
        createdBy: user?.uid || undefined,
        createdByName: creatorName || undefined,
      };

      setTransactions((prev) => {
        const next = [repTx, ...prev];
        safeSetItem('ngwe_transactions', JSON.stringify(next));
        return next;
      });

      if (user?.uid) {
        const targetUid = activeWorkspaceId || user.uid;
        reportCloudWrite(safeSetDoc(doc(db, 'users', targetUid, 'transactions', repTxId), {
          ...repTx,
          userId: targetUid,
        }, { merge: true }));
        // [v7.5.56 B] Repayment into a shared wallet goes through the
        // shared path so both sides see the balance move (checked).
        const repWallet = wallets.find((w) => isWalletMatch(w, walletId));
        if (repWallet && isSharedWallet(repWallet)) {
          saveLinkedTxSharedChecked(
            repTx,
            repWallet,
            (Number(repWallet.balance) || 0) + txEffect(repTx)
          ).then((ok) => {
            if (!ok) showToast(sharedFailMsg);
          });
        }
      }
    }

    markDebtLocalWrite(debtId); // [v6.3.3]
    setDebts((prev) => {
      const next = prev.map((d) => {
        if (d.id === debtId) {
          const newRepayment = {
            id: `rep_${Date.now()}`,
            amount: finalAmount, // [v6.9-phase2a-v2] cap-aware
            date,
            walletId,
            note,
            transactionId: repTxId,
            createdAt: Date.now(),
          };
          const nextRepayments = [newRepayment, ...(d.repayments || [])];
          const newPaid = nextRepayments.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
          const isFullySettled = newPaid >= d.totalAmount;

          const updatedDebt: Debt = {
            ...d,
            paidAmount: newPaid,
            repayments: nextRepayments,
            status: isFullySettled ? 'settled' : d.status,
            updatedAt: Date.now(),
            version: (d.version || 0) + 1,
            lastEditedBy: user?.uid || 'guest',
          };

          if (user?.uid) {
            const targetUid = activeWorkspaceId || user.uid;
            reportCloudWrite(safeSetDoc(doc(db, 'users', targetUid, 'debts', debtId), {
              ...updatedDebt,
              userId: targetUid,
            }, { merge: true }));
            // [v7.5.56 B] Mirror the repayment onto the shared copy.
            if (d.sharedWalletId) {
              mirrorSharedDebtChecked(updatedDebt, d.sharedWalletId).then((ok) => {
                if (!ok) showToast(sharedDebtFailMsg);
              });
            }
          }

          return updatedDebt;
        }
        return d;
      });
      safeSetItem('ngwe_debts', JSON.stringify(next));
      return next;
    });

    showToast(lang === 'my' ? 'ငွေဆပ်မှတ်တမ်းနှင့် Wallet ငွေစာရင်း ထည့်သွင်းပြီးပါပြီ ✓' : 'Repayment recorded & wallet synced ✓');
  };

  const handleEditRepayment = (
    debtId: string,
    repaymentId: string,
    amount: number,
    date: string,
    walletId: string,
    note?: string
  ) => {
    // [v6.1.11] Update the linked transaction so wallet & summary stay in sync
    const targetDebtForEdit = debts.find((d) => d.id === debtId);
    // [v7.5.56] Shared debts are read-only for collaborators (decision 17).
    if (targetDebtForEdit && !canMutateSharedDebt(targetDebtForEdit)) {
      showToast(
        lang === 'my'
          ? '⚠️ ဤအကြွေးကို ပြင်၍ မရပါ — ပိုင်ရှင် (သို့မဟုတ် ဖန်တီးသူ) သာ ပြင်နိုင်ပါသည်'
          : 'Permission denied: only the wallet owner (or the debt creator) can change this shared debt'
      );
      return;
    }
    const targetRepForEdit = targetDebtForEdit?.repayments?.find((r) => r.id === repaymentId);
    const linkedTxIdForEdit = targetRepForEdit?.transactionId;

    if (linkedTxIdForEdit && targetDebtForEdit) {
      const isReceivable = targetDebtForEdit.type === 'receivable';
      const prevLinkedTx = transactions.find((t) => t.id === linkedTxIdForEdit);
      const updatedLinkedTx: Transaction = {
        id: linkedTxIdForEdit,
        type: isReceivable ? 'income' : 'expense',
        amount,
        category: isReceivable ? 'cat_debt_repayment' : 'cat_debt_payment',
        walletId,
        date,
        note: isReceivable
          ? `[အကြွေးပြန်ရငွေ] ⬅ ${targetDebtForEdit.personName}${note ? ` (${note})` : ''}`
          : `[အကြွေးပြန်ဆပ်ငွေ] ➔ ${targetDebtForEdit.personName}${note ? ` (${note})` : ''}`,
        createdAt: Date.now(),
        // [v7.5.56 A1] Never overwrite the author on edit.
        createdBy: prevLinkedTx?.createdBy,
        createdByName: prevLinkedTx?.createdByName,
      };

      setTransactions((prev) => {
        const next = prev.some((t) => t.id === linkedTxIdForEdit)
          ? prev.map((t) => (t.id === linkedTxIdForEdit ? updatedLinkedTx : t))
          : [updatedLinkedTx, ...prev];
        safeSetItem('ngwe_transactions', JSON.stringify(next));
        return next;
      });

      if (user?.uid) {
        const targetUid = activeWorkspaceId || user.uid;
        reportCloudWrite(safeSetDoc(doc(db, 'users', targetUid, 'transactions', linkedTxIdForEdit), {
          ...updatedLinkedTx,
          userId: targetUid,
        }, { merge: true }));
        // [v7.5.56 B] Edited repayment tx goes through the shared path
        // when its wallet is shared (checked; post-edit balance).
        const editRepWallet = wallets.find((w) => isWalletMatch(w, walletId));
        if (editRepWallet && isSharedWallet(editRepWallet)) {
          const oldEffect = prevLinkedTx ? txEffect(prevLinkedTx) : 0;
          saveLinkedTxSharedChecked(
            updatedLinkedTx,
            editRepWallet,
            (Number(editRepWallet.balance) || 0) - oldEffect + txEffect(updatedLinkedTx)
          ).then((ok) => {
            if (!ok) showToast(sharedFailMsg);
          });
        }
      }
    }

    setDebts((prev) => {
      const next = prev.map((d) => {
        if (d.id === debtId) {
          const updatedRepayments = (d.repayments || []).map((r) =>
            r.id === repaymentId ? { ...r, amount, date, walletId, note } : r
          );
          const newPaid = updatedRepayments.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
          const isFullySettled = newPaid >= d.totalAmount;

          const updatedDebt: Debt = {
            ...d,
            paidAmount: newPaid,
            repayments: updatedRepayments,
            status: isFullySettled ? 'settled' : 'active',
            updatedAt: Date.now(),
            version: (d.version || 0) + 1,
            lastEditedBy: user?.uid || 'guest',
          };

          if (user?.uid) {
            const targetUid = activeWorkspaceId || user.uid;
            reportCloudWrite(safeSetDoc(doc(db, 'users', targetUid, 'debts', debtId), {
              ...updatedDebt,
              userId: targetUid,
            }, { merge: true }));
            // [v7.5.56 B] Mirror the edited repayment onto the shared copy.
            if (d.sharedWalletId) {
              mirrorSharedDebtChecked(updatedDebt, d.sharedWalletId).then((ok) => {
                if (!ok) showToast(sharedDebtFailMsg);
              });
            }
          }

          return updatedDebt;
        }
        return d;
      });
      safeSetItem('ngwe_debts', JSON.stringify(next));
      return next;
    });

    showToast(lang === 'my' ? 'ငွေဆပ်မှတ်တမ်း ပြင်ဆင်ပြီးပါပြီ ✓' : 'Repayment updated ✓');
  };

  const handleDeleteRepayment = (debtId: string, repaymentId: string) => {
    // [v6.1.11] Delete the linked transaction so wallet & summary revert.
    const targetDebtForDel = debts.find((d) => d.id === debtId);
    // [v7.5.56] Shared debts are read-only for collaborators (decision 17).
    if (targetDebtForDel && !canMutateSharedDebt(targetDebtForDel)) {
      showToast(
        lang === 'my'
          ? '⚠️ ဤအကြွေးကို ပြင်၍ မရပါ — ပိုင်ရှင် (သို့မဟုတ် ဖန်တီးသူ) သာ ပြင်နိုင်ပါသည်'
          : 'Permission denied: only the wallet owner (or the debt creator) can change this shared debt'
      );
      return;
    }
    const targetRepForDel = targetDebtForDel?.repayments?.find((r) => r.id === repaymentId);
    let linkedTxIdToDel = targetRepForDel?.transactionId;

    // Fallback: locate legacy tx by matching amount + date + wallet + person
    if (!linkedTxIdToDel && targetDebtForDel && targetRepForDel) {
      const isReceivable = targetDebtForDel.type === 'receivable';
      const expectedType = isReceivable ? 'income' : 'expense';
      const expectedCat = isReceivable ? 'cat_debt_repayment' : 'cat_debt_payment';
      const matched = transactions.find(
        (t) =>
          t.type === expectedType &&
          t.category === expectedCat &&
          t.amount === targetRepForDel.amount &&
          t.date === targetRepForDel.date &&
          t.walletId === targetRepForDel.walletId &&
          (t.note || '').includes(targetDebtForDel.personName)
      );
      if (matched) linkedTxIdToDel = matched.id;
    }

    if (linkedTxIdToDel) {
      markTxDeleted(linkedTxIdToDel);
      const linkedTx = transactions.find((t) => t.id === linkedTxIdToDel);
      const linkedWallet = linkedTx ? wallets.find((w) => isWalletMatch(w, linkedTx.walletId)) : undefined;

      setTransactions((prev) => {
        const next = prev.filter((t) => t.id !== linkedTxIdToDel);
        safeSetItem('ngwe_transactions', JSON.stringify(next));
        return next;
      });

      setCloudTxIds((prev) => {
        const next = new Set(prev);
        next.delete(linkedTxIdToDel as string);
        safeSetItem('ngwe_cloud_tx_ids', JSON.stringify(Array.from(next)));
        return next;
      });
      syncQueue.remove('transactions', linkedTxIdToDel);

      if (user?.uid) {
        const targetUid = activeWorkspaceId || user.uid;
        reportCloudWrite(safeDeleteDoc(doc(db, 'users', targetUid, 'transactions', linkedTxIdToDel)));

        // [v7.5.56 B] Repayment tx in a shared wallet: delete through the
        // shared path (post-delete balance, recompute after; checked).
        if (linkedWallet && isSharedWallet(linkedWallet)) {
          deleteLinkedTxSharedChecked(
            linkedTxIdToDel,
            linkedWallet,
            (Number(linkedWallet.balance) || 0) - (linkedTx ? txEffect(linkedTx) : 0)
          ).then((ok) => {
            if (!ok) showToast(sharedFailMsg);
          });
        }

        (async () => {
          try {
            const { deleteTransactionDirectHttp } = await import('../lib/directFirestoreHttp');
            await deleteTransactionDirectHttp(linkedTxIdToDel as string, targetUid);
          } catch (e) {
            console.warn('[deleteRepayment] REST verify notice:', e);
          }
        })();
      }
    }

    setDebts((prev) => {
      const next = prev.map((d) => {
        if (d.id === debtId) {
          const updatedRepayments = (d.repayments || []).filter((r) => r.id !== repaymentId);
          const newPaid = updatedRepayments.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
          const isFullySettled = newPaid >= d.totalAmount;

          const updatedDebt: Debt = {
            ...d,
            paidAmount: newPaid,
            repayments: updatedRepayments,
            status: isFullySettled ? 'settled' : 'active',
            updatedAt: Date.now(),
          };

          if (user?.uid) {
            const targetUid = activeWorkspaceId || user.uid;
            reportCloudWrite(safeSetDoc(doc(db, 'users', targetUid, 'debts', debtId), {
              ...updatedDebt,
              userId: targetUid,
            }, { merge: true }));
            // [v7.5.56 B] Mirror the repayment removal onto the shared copy.
            if (d.sharedWalletId) {
              mirrorSharedDebtChecked(updatedDebt, d.sharedWalletId).then((ok) => {
                if (!ok) showToast(sharedDebtFailMsg);
              });
            }
          }

          return updatedDebt;
        }
        return d;
      });
      safeSetItem('ngwe_debts', JSON.stringify(next));
      return next;
    });

    showToast(lang === 'my' ? 'ငွေဆပ်မှတ်တမ်းနှင့် တွဲဖက်ငွေစာရင်း ဖျက်လိုက်ပါပြီ ✓' : 'Repayment & linked transaction deleted ✓');
  };

  return {
    handleAddDebt,
    handleUpdateDebt,
    handleDeleteDebt,
    handleToggleDebtStatus,
    handleRecordRepaymentSubmit,
    handleEditRepayment,
    handleDeleteRepayment,
  };
}
