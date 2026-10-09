import type { Dispatch, SetStateAction } from 'react';
import { doc } from 'firebase/firestore';
import { db, safeSetDoc, safeDeleteDoc } from '../lib/firebase';
import { safeSetItem } from '../utils/storage';
import { syncQueue } from '../lib/syncQueue';
import { markTxDeleted } from '../utils/deletedMarkers';
import { isWalletMatch } from '../utils/walletBalance';
import {
  getSharedWalletDocId,
  deleteSharedWalletTransaction,
} from '../lib/sharedWalletService';
import type { Debt, PlanLimits, PlanType, Transaction, Wallet } from '../types';

interface UseDebtHandlersParams {
  user: { uid: string } | null;
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

  const handleAddDebt = (newDebt: Omit<Debt, 'id' | 'paidAmount' | 'repayments' | 'status' | 'createdAt'>) => {
    const id = `debt_${Date.now()}`;
    const debt: Debt = {
      ...newDebt,
      id,
      paidAmount: 0,
      repayments: [],
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
      lastEditedBy: user?.uid || 'guest',
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
    };

    setTransactions((prev) => {
      const next = [debtTx, ...prev];
      safeSetItem('ngwe_transactions', JSON.stringify(next));
      return next;
    });

    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      safeSetDoc(doc(db, 'users', targetUid, 'debts', id), {
        ...debt,
        userId: targetUid,
      }, { merge: true });

      safeSetDoc(doc(db, 'users', targetUid, 'transactions', txId), {
        ...debtTx,
        userId: targetUid,
      }, { merge: true });
    }

    showToast(lang === 'my' ? 'အကြွေးစာရင်းနှင့် Wallet ဝင်ငွေ/ထွက်ငွေ စာရင်း ချိတ်ဆက်ပြီးပါပြီ ✓' : 'Debt record & wallet transaction synced ✓');
  };

  const handleDeleteDebt = (id: string) => {
    const targetDebtForDel = debts.find((d) => d.id === id);

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

    setDebts((prev) => {
      const next = prev.filter((d) => d.id !== id);
      safeSetItem('ngwe_debts', JSON.stringify(next));
      return next;
    });

    txIdsToDelete.forEach((tid) => markTxDeleted(tid));
    setTransactions((prev) => {
      const next = prev.filter((t) => !txIdsToDelete.has(t.id));
      safeSetItem('ngwe_transactions', JSON.stringify(next));
      return next;
    });

    setCloudTxIds((prev) => {
      const next = new Set(prev);
      txIdsToDelete.forEach((tid) => next.delete(tid));
      safeSetItem('ngwe_cloud_tx_ids', JSON.stringify(Array.from(next)));
      return next;
    });
    txIdsToDelete.forEach((tid) => syncQueue.remove('transactions', tid));

    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      safeDeleteDoc(doc(db, 'users', targetUid, 'debts', id));
      txIdsToDelete.forEach((tid) => {
        safeDeleteDoc(doc(db, 'users', targetUid, 'transactions', tid));
      });

      (async () => {
        try {
          const { deleteTransactionDirectHttp } = await import('../lib/directFirestoreHttp');
          await Promise.allSettled(Array.from(txIdsToDelete).map((tid) => deleteTransactionDirectHttp(tid, targetUid)));
        } catch (e) {
          console.warn('[deleteDebt] REST verify notice:', e);
        }
      })();
    }

    showToast(
      lang === 'my'
        ? `အကြွေးစာရင်းနှင့် တွဲဖက်ငွေစာရင်း (${txIdsToDelete.size}) ခု ဖျက်လိုက်ပါပြီ`
        : `Debt record & ${txIdsToDelete.size} linked transactions deleted`
    );
  };

  const handleToggleDebtStatus = (id: string) => {
    // [v6.3.2] auto-settle creates linked transaction; reopen deletes it
    const targetDebt = debts.find((d) => d.id === id);
    if (!targetDebt) return;

    const newStatus = targetDebt.status === 'active' ? 'settled' : 'active';
    const isReceivable = targetDebt.type === 'receivable';
    const today = new Date().toISOString().split('T')[0];

    let newSettlementTx: Transaction | null = null;
    let deletedSettlementTxIds: string[] = [];
    let updatedRepayments = [...(targetDebt.repayments || [])];

    if (newStatus === 'settled') {
      const currentPaid = updatedRepayments.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
      const remaining = targetDebt.totalAmount - currentPaid;
      if (remaining > 0) {
        const settlementTxId = `tx_rep_${id}_settle_${Date.now()}`;
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
        };
      }
    } else {
      const settlementReps = updatedRepayments.filter((r) => r.id.startsWith('rep_settle_'));
      deletedSettlementTxIds = settlementReps
        .map((r) => r.transactionId)
        .filter((tid): tid is string => Boolean(tid));
      updatedRepayments = updatedRepayments.filter((r) => !r.id.startsWith('rep_settle_'));
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
      safeSetDoc(doc(db, 'users', targetUid, 'debts', id), {
        ...updatedDebt,
        userId: targetUid,
      }, { merge: true });

      if (newSettlementTx) {
        safeSetDoc(doc(db, 'users', targetUid, 'transactions', newSettlementTx.id), {
          ...newSettlementTx,
          userId: targetUid,
        }, { merge: true });
      }

      if (deletedSettlementTxIds.length > 0) {
        deletedSettlementTxIds.forEach((tid) => {
          safeDeleteDoc(doc(db, 'users', targetUid, 'transactions', tid));
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
        ? (derivedStatus === 'settled' ? 'အကြွေးကြေပြီ — ငွေစာရင်းထဲ ထည့်ပြီးပါပြီ ✓' : 'အကြွေးပြန်ဖွင့်ပြီ — ငွေစာရင်းမှ ဖျက်ပြီးပါပြီ ✓')
        : (derivedStatus === 'settled' ? 'Debt settled — transaction recorded ✓' : 'Debt reopened — settlement removed ✓')
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
      repTxId = `tx_rep_${debtId}_${Date.now()}`;  // [FIX v6.3.1] assigned, not declared
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
      };

      setTransactions((prev) => {
        const next = [repTx, ...prev];
        safeSetItem('ngwe_transactions', JSON.stringify(next));
        return next;
      });

      if (user?.uid) {
        const targetUid = activeWorkspaceId || user.uid;
        safeSetDoc(doc(db, 'users', targetUid, 'transactions', repTxId), {
          ...repTx,
          userId: targetUid,
        }, { merge: true });
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
            safeSetDoc(doc(db, 'users', targetUid, 'debts', debtId), {
              ...updatedDebt,
              userId: targetUid,
            }, { merge: true });
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
    const targetRepForEdit = targetDebtForEdit?.repayments?.find((r) => r.id === repaymentId);
    const linkedTxIdForEdit = targetRepForEdit?.transactionId;

    if (linkedTxIdForEdit && targetDebtForEdit) {
      const isReceivable = targetDebtForEdit.type === 'receivable';
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
        safeSetDoc(doc(db, 'users', targetUid, 'transactions', linkedTxIdForEdit), {
          ...updatedLinkedTx,
          userId: targetUid,
        }, { merge: true });
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
            safeSetDoc(doc(db, 'users', targetUid, 'debts', debtId), {
              ...updatedDebt,
              userId: targetUid,
            }, { merge: true });
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
        safeDeleteDoc(doc(db, 'users', targetUid, 'transactions', linkedTxIdToDel));

        if (linkedWallet && (linkedWallet.isSharedFromOther || (linkedWallet.sharedWith && linkedWallet.sharedWith.length > 0))) {
          const sharedDocId = getSharedWalletDocId(linkedWallet, user.uid);
          deleteSharedWalletTransaction(linkedWallet.id, linkedTxIdToDel, linkedWallet.balance, sharedDocId, user.uid);
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
            safeSetDoc(doc(db, 'users', targetUid, 'debts', debtId), {
              ...updatedDebt,
              userId: targetUid,
            }, { merge: true });
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
    handleDeleteDebt,
    handleToggleDebtStatus,
    handleRecordRepaymentSubmit,
    handleEditRepayment,
    handleDeleteRepayment,
  };
}
