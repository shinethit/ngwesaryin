import type { Dispatch, SetStateAction } from 'react';
import { doc } from 'firebase/firestore';
import { db, safeSetDoc, safeDeleteDoc, isQuotaExhausted } from '../lib/firebase';
import { safeSetItem } from '../utils/storage';
import { syncQueue } from '../lib/syncQueue';
import { markTxDeleted, unmarkTxDeleted, markVehicleLogDeleted } from '../utils/deletedMarkers';
import { getCollaboratorPermissions } from '../utils/permissions';
import { getLocalDateString } from '../utils/dateUtils';
import { isWalletMatch } from '../utils/walletBalance';
import {
  saveSharedWalletTransaction,
  deleteSharedWalletTransaction,
  getSharedWalletDocId,
  // [v7.5.56] Provided by the shared-wallet service worker — recomputes
  // a shared wallet's stored balance from its cloud transactions.
  // Do NOT reimplement here; this import fails until that worker lands it.
  recomputeSharedWalletBalance,
} from '../lib/sharedWalletService';
import type {
  Category,
  Debt,
  FuelLog,
  PlanLimits,
  PlanType,
  TirePressureLog,
  Transaction,
  TransactionType,
  Vehicle,
  VehicleLinkData,
  VehicleMaintenance,
  Wallet,
} from '../types';

interface UseTransactionHandlersParams {
  user: { uid: string; email?: string | null; displayName?: string | null } | null;
  activeWorkspaceId: string | null | undefined;
  plan: PlanType;
  limits: PlanLimits;
  lang: 'my' | 'en';
  showToast: (msg: string) => void;
  setIsTxModalOpen: (open: boolean) => void;
  setIsAuthModalOpen: (open: boolean) => void;
  setIsPremiumModalOpen: (open: boolean) => void;
  setShowPremiumTxLimitNotice: (show: boolean) => void;
  setIsDebtModalOpen: (open: boolean) => void;
  setTxModalInitialType: (t: TransactionType) => void;
  setTxModalInitialWalletId: (id: string | undefined) => void;
  setTxModalInitialModel: (m: 'general' | 'fuel' | 'vehicle_service') => void;
  editingTransaction: Transaction | null;
  setEditingTransaction: (t: Transaction | null) => void;
  transactions: Transaction[];
  setTransactions: Dispatch<SetStateAction<Transaction[]>>;
  debts: Debt[];
  wallets: Wallet[];
  computedWallets: Wallet[];
  categories: Category[];
  vehicles: Vehicle[];
  fuelLogs: FuelLog[];
  setFuelLogs: Dispatch<SetStateAction<FuelLog[]>>;
  vehicleMaintenance: VehicleMaintenance[];
  setVehicleMaintenance: Dispatch<SetStateAction<VehicleMaintenance[]>>;
  tirePressureLogs: TirePressureLog[];
  setTirePressureLogs: Dispatch<SetStateAction<TirePressureLog[]>>;
  setCloudTxIds: Dispatch<SetStateAction<Set<string>>>;
  handleSaveVehicle: (vehicle: Vehicle) => void;
}

export function useTransactionHandlers({
  user,
  activeWorkspaceId,
  plan,
  limits,
  lang,
  showToast,
  setIsTxModalOpen,
  setIsAuthModalOpen,
  setIsPremiumModalOpen,
  setShowPremiumTxLimitNotice,
  setIsDebtModalOpen,
  setTxModalInitialType,
  setTxModalInitialWalletId,
  setTxModalInitialModel,
  editingTransaction,
  setEditingTransaction,
  transactions,
  setTransactions,
  debts,
  wallets,
  computedWallets,
  categories,
  vehicles,
  fuelLogs,
  setFuelLogs,
  vehicleMaintenance,
  setVehicleMaintenance,
  tirePressureLogs,
  setTirePressureLogs,
  setCloudTxIds,
  handleSaveVehicle,
}: UseTransactionHandlersParams) {

  // [v7.5.55] safe* Firestore helpers return false when the write did not
  // land (they enqueue a retry in the sync queue, so local data is safe).
  // Surface that as a "cloud save pending" notice instead of a silent
  // false success.
  const cloudPendingMsg =
    lang === 'my'
      ? '☁️ Cloud သို့ သိမ်းဆည်းခြင်း ခေတ္တမရသေးပါ — အင်တာနက်ရလျှင် အလိုအလျောက် ထပ်တင်ပါမည်'
      : '☁️ Cloud save is pending — it will retry automatically when you are back online';
  const persistDoc = (ref: any, data: any, options?: any) => {
    safeSetDoc(ref, data, options).then((ok) => {
      if (ok === false) showToast(cloudPendingMsg);
    }).catch(() => {});
  };
  const deleteDocChecked = (ref: any) => {
    safeDeleteDoc(ref).then((ok) => {
      if (ok === false) showToast(cloudPendingMsg);
    }).catch(() => {});
  };

  // [v7.5.56] Shared-wallet helpers (A1–A9).
  const creatorName = user?.displayName || user?.email?.split('@')[0] || '';
  const isSharedWallet = (w?: Wallet | null): boolean =>
    !!w && (!!w.isSharedFromOther || (w.sharedWith?.length || 0) > 0);
  // I own a wallet when it is not shared TO me (my own wallet, even one
  // I shared out) — or when the shared doc names me as owner.
  const isWalletOwner = (w?: Wallet | null): boolean =>
    !w || !w.isSharedFromOther || !w.ownerUid || w.ownerUid === user?.uid;
  const sharedFailMsg =
    lang === 'my'
      ? '⚠️ မျှဝေထားသော ပိုက်ဆံအိတ်သို့ Cloud သို့ သိမ်းဆည်း၍ မရပါ — အင်တာနက်ရလျှင် အလိုအလျောက် ထပ်တင်ပါမည်'
      : '⚠️ Could not save to the shared wallet cloud — it will retry automatically when you are back online';
  const randomSuffix = () => Math.random().toString(36).slice(2, 8);

  // [v7.5.56 A2] Creator-or-owner gate. Owners always pass. A collaborator
  // passes only for their own txs (createdBy === uid); legacy txs with no
  // createdBy fall back to the per-type permission check.
  const canActOnTx = (
    wallet: Wallet | null | undefined,
    tx: Transaction,
    type: TransactionType,
    action: 'edit' | 'delete'
  ): boolean => {
    if (!isWalletOwner(wallet) && tx.createdBy && user?.uid && tx.createdBy !== user.uid) return false;
    const perms = getCollaboratorPermissions(wallet, user?.email, user?.uid);
    if (action === 'edit') return type === 'income' ? perms.canEditIncome : perms.canEditExpense;
    return type === 'income' ? perms.canDeleteIncome : perms.canDeleteExpense;
  };
  const denyEditMsg = (type: TransactionType) =>
    lang === 'my'
      ? `⚠️ ဤ Wallet ပိုင်ရှင်မှ ${type === 'income' ? 'ဝင်ငွေ' : 'ထွက်ငွေ'} ပြင်ဆင်ခွင့် ပိတ်ထားပါသည် (သို့မဟုတ် သင်ဖန်တီးထားသော မှတ်တမ်းမဟုတ်ပါ)`
      : 'Permission denied: wallet owner has disabled transaction editing (or this is not a record you created)';

  // [v7.5.56 A9] Shared-write retry via the queue worker's helpers
  // (src/lib/syncQueue.ts), which call the sharedWallets entity type:
  //   syncQueue.enqueueSharedWalletTx(sharedDocId, tx, user.uid)
  //     → enqueue('sharedWallets', `${sharedDocId}/transactions/${tx.id}`,
  //         'upsert', ownerUid, { ...tx, walletId: sharedDocId })
  //   syncQueue.enqueueSharedWalletTxDelete(sharedDocId, tx.id, user.uid)
  //     → enqueue('sharedWallets', `${sharedDocId}/transactions/${tx.id}`,
  //         'delete', ownerUid)
  // Do NOT hand-roll the entityId: the processor parses the
  // `docId/transactions/txId` path form.
  const enqueueSharedTxRetry = (tx: Transaction, sharedDocId: string, operation: 'upsert' | 'delete') => {
    if (!user?.uid || !sharedDocId || !tx?.id) return;
    if (operation === 'delete') {
      syncQueue.enqueueSharedWalletTxDelete(sharedDocId, tx.id, user.uid);
    } else {
      syncQueue.enqueueSharedWalletTx(sharedDocId, { ...tx, sharedDocId, walletId: sharedDocId }, user.uid);
    }
  };

  // [v7.5.56 A3/A6] Save one tx to its shared wallet, check the result,
  // then recompute the stored shared balance from the cloud state.
  // postBalance is the balance AFTER this tx's effect — never a
  // pre-edit / pre-delete balance. Returns false when the cloud write
  // did not land (caller toasts + the retry is already enqueued).
  const saveSharedTxChecked = async (wallet: Wallet, tx: Transaction, postBalance: number): Promise<boolean> => {
    if (!user?.uid) return false;
    const sharedDocId = getSharedWalletDocId(wallet, user.uid);
    const ok = await saveSharedWalletTransaction(wallet.id, tx, postBalance, sharedDocId, user.uid);
    if (!ok) {
      enqueueSharedTxRetry(tx, sharedDocId, 'upsert');
      return false;
    }
    const recomputed = await recomputeSharedWalletBalance(sharedDocId);
    if (!recomputed) return false;
    return true;
  };
  const deleteSharedTxChecked = async (wallet: Wallet, txId: string, postBalance: number): Promise<boolean> => {
    if (!user?.uid) return false;
    const sharedDocId = getSharedWalletDocId(wallet, user.uid);
    const ok = await deleteSharedWalletTransaction(wallet.id, txId, postBalance, sharedDocId, user.uid);
    if (!ok) {
      enqueueSharedTxRetry({ id: txId } as Transaction, sharedDocId, 'delete');
      return false;
    }
    const recomputed = await recomputeSharedWalletBalance(sharedDocId);
    if (!recomputed) return false;
    return true;
  };
  // Signed effect of a tx on its wallet balance (+income, −expense).
  const txEffect = (t: Transaction): number => (t.type === 'income' ? t.amount : -t.amount);

  // [v7.5.55] Decision 1 — transaction limit window (v7.5.68: BOTH
  // Guest and Free are per CALENDAR MONTH — user decision 2026-11-06:
  // Guest 15, Free 150 per month): count transactions dated within
  // the window (local YYYY-MM-DD compare).
  // The count blocks the moment it reaches the CURRENT plan's
  // maxTransactions (guest 30, free 100), even if reached in 10 days.
  // [v7.5.56 A8] A tx counts toward MY plan limit iff I created it
  // (legacy txs with no createdBy still count) AND its wallet is mine
  // or a shared wallet I own. A collaborator's tx in someone else's
  // shared wallet never counts toward my limit.
  const countsTowardMyLimit = (t: Transaction): boolean => {
    if (user?.uid && t.createdBy && t.createdBy !== user.uid) return false;
    const w =
      wallets.find((x) => isWalletMatch(x, t.walletId)) ||
      computedWallets.find((x) => isWalletMatch(x, t.walletId));
    if (!w) return true;
    if (w.isSharedFromOther && w.ownerUid && user?.uid && w.ownerUid !== user.uid) return false;
    return true;
  };
  const countRolling30DayTransactions = (txs: Transaction[]) => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    const start = getLocalDateString(d);
    return txs.filter((t) => t.date && t.date >= start && countsTowardMyLimit(t)).length;
  };
  // [v7.5.68] Transaction limit is per CALENDAR MONTH for both Guest
  // and Free (user decision 2026-11-06): count transactions dated
  // on/after the 1st of the current month. The count resets to 0 on
  // the 1st of each month — start on the 1st or the 20th, it resets
  // at month end.
  const countCalendarMonthTransactions = (txs: Transaction[]) => {
    const now = new Date();
    const start = getLocalDateString(new Date(now.getFullYear(), now.getMonth(), 1));
    return txs.filter((t) => t.date && t.date >= start && countsTowardMyLimit(t)).length;
  };

  // [v7.5.55] C8c — motorcycle logs store frontPsi/rearPsi; car logs store
  // the 4-wheel fields. The form sends Front/Rear as frontLeftPsi/
  // rearLeftPsi and they are mapped here by vehicle type.
  const resolveTirePsi = (
    link: VehicleLinkData,
    vehicle?: Vehicle
  ): {
    frontPsi?: number;
    rearPsi?: number;
    frontLeftPsi?: number;
    frontRightPsi?: number;
    rearLeftPsi?: number;
    rearRightPsi?: number;
  } => {
    if (vehicle?.type === 'motorcycle') {
      return {
        frontPsi: link.frontLeftPsi,
        rearPsi: link.rearLeftPsi,
        frontLeftPsi: undefined,
        frontRightPsi: undefined,
        rearLeftPsi: undefined,
        rearRightPsi: undefined,
      };
    }
    return {
      frontLeftPsi: link.frontLeftPsi,
      frontRightPsi: link.frontRightPsi,
      rearLeftPsi: link.rearLeftPsi,
      rearRightPsi: link.rearRightPsi,
    };
  };

  const handleOpenAddTx = (
    type: TransactionType = 'expense',
    targetWalletId?: string,
    initialModel: 'general' | 'fuel' | 'vehicle_service' = 'general'
  ) => {
    // [v7.5.55] Count against the CURRENT plan's row — both Guest and
    // Free count the calendar month (v7.5.68; user decision 2026-11-06:
    // Guest 15, Free 150 per calendar month).
    const monthTxCount = countCalendarMonthTransactions(transactions);

    if (plan === 'guest' && monthTxCount >= limits.maxTransactions) {
      if (window.confirm(lang === 'my'
        ? `Guest Mode တွင် ဒီလ အတွင်း မှတ်တမ်း (${limits.maxTransactions}) ခုသာ ထည့်သွင်းနိုင်ပါသည်။ Google Account ဖြင့် Sign in ပြုလုပ်ပါ သို့မဟုတ် Premium သို့ တိုးမြှင့်ပါ`
        : `Guest Mode allows up to ${limits.maxTransactions} transactions this month. Please Sign In with Google or Upgrade.`)) {
        setIsAuthModalOpen(true);
      }
      return;
    }

    if (plan === 'free' && monthTxCount >= limits.maxTransactions) {
      setShowPremiumTxLimitNotice(true);
      setIsPremiumModalOpen(true);
      return;
    }
    setTxModalInitialType(type);
    setTxModalInitialWalletId(targetWalletId);
    setTxModalInitialModel(initialModel);
    setEditingTransaction(null);
    setIsTxModalOpen(true);
  };

  const handleOpenEditTx = (tx: Transaction) => {
    const targetWallet = wallets.find((w) => isWalletMatch(w, tx.walletId));
    // [v7.5.56 A2] Creator-or-owner gate: a collaborator may only open
    // their own txs for editing (legacy txs with no createdBy fall back
    // to the per-type permission check inside canActOnTx).
    if (!canActOnTx(targetWallet, tx, tx.type, 'edit')) {
      showToast(denyEditMsg(tx.type));
      return;
    }
    setEditingTransaction(tx);
    setIsTxModalOpen(true);
  };

  const handleOpenAddDebt = () => {
    if (!limits.hasDebts || plan === 'guest') {
      if (window.confirm(lang === 'my'
        ? 'Guest Mode တွင် အကြွေးစာရင်း သုံးစွဲ၍ မရပါခင်ဗျာ။ စာရင်းမှတ်တမ်းတင်ရန် Google Account ဖြင့် Sign in ပြုလုပ်ပါ'
        : 'Debts feature is not available in Guest mode. Please Sign In with Google.')) {
        setIsAuthModalOpen(true);
      }
      return;
    }
    const activeDebtsCount = debts.filter((d) => d.status === 'active').length;
    // [v7.5.55] Per-plan limit from the limits table: any non-premium plan
    // enforces its own row (guest is already turned away above; free = 5).
    if (plan !== 'premium' && activeDebtsCount >= limits.maxDebts) {
      setIsPremiumModalOpen(true);
      return;
    }
    setIsDebtModalOpen(true);
  };

  // [v7.5.60 S2] Returns false when the save is blocked (permission /
  // plan limit) so the modal stays open and the typed entry
  // is not lost; returns true on success. The modal is closed ONLY
  // after all validation passes — never up-front.
  const handleAddTransaction = (
    newTx: Omit<Transaction, 'id' | 'createdAt'>,
    vehicleLinkData?: VehicleLinkData
  ): boolean => {
    const cleanAmount = Math.abs(Number(newTx.amount) || 0);
    const sanitizedTx = { ...newTx, amount: cleanAmount };

    if (editingTransaction) {
      const editWallet = wallets.find((w) => isWalletMatch(w, editingTransaction.walletId));
      const editTargetWallet =
        computedWallets.find((w) => isWalletMatch(w, sanitizedTx.walletId)) ||
        wallets.find((w) => isWalletMatch(w, sanitizedTx.walletId));
      // [v7.5.56 A2] Edit must validate the OLD type as well as the NEW
      // type — no income↔expense flip without the edit right for the old
      // type, and a collaborator may only edit their own txs.
      const canEditOld = canActOnTx(editWallet, editingTransaction, editingTransaction.type, 'edit');
      const canEditNew = canActOnTx(editTargetWallet, editingTransaction, sanitizedTx.type, 'edit');
      if (!canEditOld || !canEditNew) {
        showToast(
          editingTransaction.type !== sanitizedTx.type
            ? (lang === 'my'
              ? '⚠️ ဝင်ငွေ ↔ ထွက်ငွေ ပြောင်းလဲရန် ခွင့်ပြုချက်မရှိပါ — အမျိုးအစားဟောင်း/အသစ် နှစ်မျိုးလုံးအတွက် ပြင်ဆင်ခွင့် လိုအပ်ပါသည်'
              : 'Permission denied: changing income ↔ expense needs edit permission for both the old and the new type')
            : denyEditMsg(editingTransaction.type)
        );
        return false;
      }
      setEditingTransaction(null);
      setTxModalInitialWalletId(undefined);

      // [v7.5.56 A1] createdBy/createdByName are stamped on add and NEVER
      // overwritten on edit (a legacy tx with no author stays authorless).
      const updatedTx = { ...sanitizedTx, id: editingTransaction.id, createdAt: editingTransaction.createdAt, createdBy: editingTransaction.createdBy, createdByName: editingTransaction.createdByName, updatedAt: Date.now(), version: (editingTransaction.version || 0) + 1, lastEditedBy: user?.uid || 'guest' } as Transaction;
      setTransactions((prev) => {
        const next = prev.map((t) => (t.id === editingTransaction.id ? updatedTx : t));
        safeSetItem('ngwe_transactions', JSON.stringify(next));
        return next;
      });

      if (editingTransaction.transferPairId) {
        const pairTx = transactions.find((t) => t.id === editingTransaction.transferPairId);
        if (pairTx) {
          const updatedPair: Transaction = {
            ...pairTx,
            amount: cleanAmount,
            date: sanitizedTx.date,
            note: sanitizedTx.note || pairTx.note,
            updatedAt: Date.now(),
            version: (pairTx.version || 0) + 1,
            lastEditedBy: user?.uid || 'guest',
          };
          setTransactions((prev) => {
            const next = prev.map((t) => (t.id === pairTx.id ? updatedPair : t));
            safeSetItem('ngwe_transactions', JSON.stringify(next));
            return next;
          });
          if (user?.uid) {
            const targetUid = activeWorkspaceId || user.uid;
            persistDoc(doc(db, 'users', targetUid, 'transactions', pairTx.id), {
              ...updatedPair,
              userId: targetUid,
            }, { merge: true });
          }
        }
      }

      if (user?.uid) {
        const targetUid = activeWorkspaceId || user.uid;
        persistDoc(doc(db, 'users', targetUid, 'transactions', editingTransaction.id), {
          ...updatedTx,
          userId: targetUid,
        }, { merge: true });
      }

      // Cloud sync for shared wallets
      // [v7.5.56 A3/A4/A6] Shared writes are awaited + checked (never
      // fire-and-forget), the balance passed is the POST-edit balance,
      // the transfer pair leg is saved to ITS wallet's shared doc too,
      // and the stored balance is recomputed after every shared write.
      const oldWallet = computedWallets.find((w) => isWalletMatch(w, editingTransaction.walletId));
      const newWallet = computedWallets.find((w) => isWalletMatch(w, sanitizedTx.walletId));
      if (newWallet && isSharedWallet(newWallet)) {
        const sameWallet = isWalletMatch(newWallet, editingTransaction.walletId);
        const postBal =
          (Number(newWallet.balance) || 0) -
          (sameWallet ? txEffect(editingTransaction) : 0) +
          txEffect(updatedTx);
        saveSharedTxChecked(newWallet, updatedTx, postBal).then((ok) => {
          if (!ok) showToast(sharedFailMsg);
        });
      }
      if (oldWallet && !isWalletMatch(oldWallet, sanitizedTx.walletId) && isSharedWallet(oldWallet)) {
        const postBal = (Number(oldWallet.balance) || 0) - txEffect(editingTransaction);
        deleteSharedTxChecked(oldWallet, editingTransaction.id, postBal).then((ok) => {
          if (!ok) showToast(sharedFailMsg);
        });
      }
      // Transfer pair leg (A4): the pair lives in its own wallet — save
      // it to that wallet's shared doc, not just the main leg's wallet.
      if (editingTransaction.transferPairId) {
        const pairTx = transactions.find((t) => t.id === editingTransaction.transferPairId);
        if (pairTx) {
          const pairWallet = computedWallets.find((w) => isWalletMatch(w, pairTx.walletId));
          if (pairWallet && isSharedWallet(pairWallet)) {
            const updatedPairForShared: Transaction = {
              ...pairTx,
              amount: cleanAmount,
              date: sanitizedTx.date,
              note: sanitizedTx.note || pairTx.note,
              updatedAt: Date.now(),
              version: (pairTx.version || 0) + 1,
              lastEditedBy: user?.uid || 'guest',
            };
            const postBal =
              (Number(pairWallet.balance) || 0) - txEffect(pairTx) + txEffect(updatedPairForShared);
            saveSharedTxChecked(pairWallet, updatedPairForShared, postBal).then((ok) => {
              if (!ok) showToast(sharedFailMsg);
            });
          }
        }
      }

      // [v7.2.2] Update linked vehicle log (fuel/maintenance/tire) on edit
      if (vehicleLinkData && vehicleLinkData.vehicleId && sanitizedTx.type === 'expense') {
        const linkedFuel = fuelLogs.find((f) => f.transactionId === editingTransaction.id);
        const linkedMaint = vehicleMaintenance.find((m) => m.transactionId === editingTransaction.id);
        const linkedTire = tirePressureLogs.find((tp) => tp.transactionId === editingTransaction.id);

        if (linkedFuel) {
          const updatedFuel: FuelLog = {
            ...linkedFuel,
            vehicleId: vehicleLinkData.vehicleId,
            date: sanitizedTx.date,
            odometer: vehicleLinkData.odometer || linkedFuel.odometer,
            liters: vehicleLinkData.liters || linkedFuel.liters,
            pricePerLiter: vehicleLinkData.pricePerLiter || linkedFuel.pricePerLiter,
            totalCost: cleanAmount,
            isFullTank: vehicleLinkData.isFullTank !== false,
            fuelType: vehicleLinkData.fuelType || linkedFuel.fuelType,
            gasStation: vehicleLinkData.gasStation,
            walletId: sanitizedTx.walletId,
            note: sanitizedTx.note,
            updatedAt: Date.now(),
          };
          setFuelLogs((prev) => {
            const next = prev.map((f) => (f.id === updatedFuel.id ? updatedFuel : f));
            safeSetItem('ngwe_fuel_logs', JSON.stringify(next));
            return next;
          });
          if (user?.uid) {
            const uid = activeWorkspaceId || user.uid;
            persistDoc(doc(db, 'users', uid, 'fuelLogs', updatedFuel.id), { ...updatedFuel, userId: uid }, { merge: true });
          }
        }
        if (linkedMaint) {
          const updatedMaint: VehicleMaintenance = {
            ...linkedMaint,
            vehicleId: vehicleLinkData.vehicleId,
            date: sanitizedTx.date,
            odometer: vehicleLinkData.odometer || linkedMaint.odometer,
            serviceType: vehicleLinkData.serviceType || linkedMaint.serviceType,
            title: vehicleLinkData.title || linkedMaint.title,
            sparePartBrand: vehicleLinkData.sparePartBrand || linkedMaint.sparePartBrand,
            workshopName: vehicleLinkData.workshopName || linkedMaint.workshopName,
            expectedLifespanKm: vehicleLinkData.expectedLifespanKm || linkedMaint.expectedLifespanKm,
            expectedLifespanDays: vehicleLinkData.expectedLifespanDays || linkedMaint.expectedLifespanDays,
            cost: cleanAmount,
            walletId: sanitizedTx.walletId,
            note: sanitizedTx.note,
            updatedAt: Date.now(),
          };
          setVehicleMaintenance((prev) => {
            const next = prev.map((m) => (m.id === updatedMaint.id ? updatedMaint : m));
            safeSetItem('ngwe_vehicle_maintenance', JSON.stringify(next));
            return next;
          });
          if (user?.uid) {
            const uid = activeWorkspaceId || user.uid;
            persistDoc(doc(db, 'users', uid, 'vehicleMaintenance', updatedMaint.id), { ...updatedMaint, userId: uid }, { merge: true });
          }
        }
        if (linkedTire) {
          // [v7.5.55] C8c: a motorcycle edit updates frontPsi/rearPsi and
          // clears the 4-wheel fields; a car edit keeps the 4-wheel fields.
          const editVehicle = vehicles.find((v) => v.id === vehicleLinkData.vehicleId);
          const isBikeEdit = editVehicle?.type === 'motorcycle';
          const updatedTire: TirePressureLog = {
            ...linkedTire,
            vehicleId: vehicleLinkData.vehicleId,
            date: sanitizedTx.date,
            odometer: vehicleLinkData.odometer || linkedTire.odometer,
            frontPsi: isBikeEdit ? (vehicleLinkData.frontLeftPsi ?? linkedTire.frontPsi) : linkedTire.frontPsi,
            rearPsi: isBikeEdit ? (vehicleLinkData.rearLeftPsi ?? linkedTire.rearPsi) : linkedTire.rearPsi,
            frontLeftPsi: isBikeEdit ? undefined : (vehicleLinkData.frontLeftPsi ?? linkedTire.frontLeftPsi),
            frontRightPsi: isBikeEdit ? undefined : (vehicleLinkData.frontRightPsi ?? linkedTire.frontRightPsi),
            rearLeftPsi: isBikeEdit ? undefined : (vehicleLinkData.rearLeftPsi ?? linkedTire.rearLeftPsi),
            rearRightPsi: isBikeEdit ? undefined : (vehicleLinkData.rearRightPsi ?? linkedTire.rearRightPsi),
            cost: cleanAmount,
            walletId: sanitizedTx.walletId,
            note: sanitizedTx.note,
            updatedAt: Date.now(),
          };
          setTirePressureLogs((prev) => {
            const next = prev.map((t) => (t.id === updatedTire.id ? updatedTire : t));
            safeSetItem('ngwe_tire_logs', JSON.stringify(next));
            return next;
          });
          if (user?.uid) {
            const uid = activeWorkspaceId || user.uid;
            persistDoc(doc(db, 'users', uid, 'tirePressureLogs', updatedTire.id), { ...updatedTire, userId: uid }, { merge: true });
          }
        }

        // Recalculate vehicle's odometer on edit
        const targetVehicle = vehicles.find((v) => v.id === vehicleLinkData.vehicleId);
        if (targetVehicle) {
          const fLogs = linkedFuel ? fuelLogs.map(f => f.id === linkedFuel.id ? {...f, odometer: vehicleLinkData.odometer || f.odometer} : f) : fuelLogs;
          const mLogs = linkedMaint ? vehicleMaintenance.map(m => m.id === linkedMaint.id ? {...m, odometer: vehicleLinkData.odometer || m.odometer} : m) : vehicleMaintenance;
          const tLogs = linkedTire ? tirePressureLogs.map(t => t.id === linkedTire.id ? {...t, odometer: vehicleLinkData.odometer || t.odometer} : t) : tirePressureLogs;
          const odos = [
            ...fLogs.filter(f => f.vehicleId === vehicleLinkData.vehicleId).map(f => f.odometer || 0),
            ...mLogs.filter(m => m.vehicleId === vehicleLinkData.vehicleId).map(m => m.odometer || 0),
            ...tLogs.filter(t => t.vehicleId === vehicleLinkData.vehicleId).map(t => t.odometer || 0)
          ];
          // မှတ်တမ်းတစ်စောင်မှ မကျန်တော့ရင် မိုင်တာကို 0 ပြန်မချဘဲ အရင်အတိုင်း ထားပါတယ်
          if (odos.length > 0) {
            const newMax = Math.max(...odos);
            if (newMax !== targetVehicle.currentOdometer) {
              handleSaveVehicle({ ...targetVehicle, currentOdometer: newMax });
            }
          }
        }
      }

      setEditingTransaction(null);
      showToast(lang === 'my' ? 'ပြင်ဆင်ပြီးပါပြီ ✓' : 'Updated successfully ✓');
      // [v7.5.60 S2] Close only now that the edit has landed.
      setIsTxModalOpen(false);
      return true;
    }

    const targetWallet = computedWallets.find((w) => isWalletMatch(w, sanitizedTx.walletId));
    const perms = getCollaboratorPermissions(targetWallet, user?.email, user?.uid);
    const canAdd = sanitizedTx.type === 'income' ? perms.canAddIncome : perms.canAddExpense;
    if (!canAdd) {
      showToast(
        lang === 'my'
          ? `⚠️ ဤ Wallet ပိုင်ရှင်မှ ${sanitizedTx.type === 'income' ? 'ဝင်ငွေ' : 'ထွက်ငွေ'} အသစ်ထည့်သွင်းခွင့် ပိတ်ထားပါသည်`
          : 'Permission denied: wallet owner has disabled adding transactions'
      );
      return false;
    }

    if (plan === 'guest') {
      // [v7.5.55] Calendar-month re-check (same rule as handleOpenAddTx).
      if (countCalendarMonthTransactions(transactions) >= limits.maxTransactions) {
        if (window.confirm(lang === 'my'
          ? `Guest Mode တွင် ဒီလ အတွင်း မှတ်တမ်း (${limits.maxTransactions}) ခုသာ ထည့်သွင်းနိုင်ပါသည်။ Google Account ဖြင့် Sign in ပြုလုပ်ပါ`
          : `Guest Mode allows up to ${limits.maxTransactions} transactions this month. Please Sign In with Google.`)) {
          setIsAuthModalOpen(true);
        }
        // [v7.5.60 S2] Blocked: keep the modal open, typed data intact.
        return false;
      }
    }

    // [v7.5.68 S2] Free-plan calendar-month re-check at save time (same
    // rule as handleOpenAddTx): the limit can be reached after the modal
    // was opened (e.g. a record added on another device). Returning false
    // keeps the modal open with the typed entry intact, like the Guest
    // re-check above.
    if (plan === 'free' && countCalendarMonthTransactions(transactions) >= limits.maxTransactions) {
      setShowPremiumTxLimitNotice(true);
      setIsPremiumModalOpen(true);
      return false;
    }

    // Ensure vehicle linked transactions use dedicated cat_vehicle
    if (vehicleLinkData && vehicleLinkData.vehicleId && sanitizedTx.type === 'expense') {
      const vehicleCategory = categories.find(
        (c) =>
          c.id === 'cat_vehicle' ||
          c.id === 'cat_vehicle_management' ||
          c.name.includes('ယာဉ်စီမံ') ||
          (c.nameEn && c.nameEn.toLowerCase().includes('vehicle management'))
      );
      if (vehicleCategory && (sanitizedTx.category === 'cat_transport' || !sanitizedTx.category)) {
        sanitizedTx.category = vehicleCategory.id;
      }
    }

    // ==========================================
    // AUTO-CREATE PAIRED TRANSFER TRANSACTIONS
    // ==========================================
    const isTransferTx =
      sanitizedTx.isTransfer ||
      sanitizedTx.category === 'cat_transfer' ||
      sanitizedTx.subCategoryId === 'sub_tf_out' ||
      sanitizedTx.subCategoryId === 'sub_tf_in';

    if (
      isTransferTx &&
      sanitizedTx.transferToWalletId &&
      sanitizedTx.transferToWalletId !== sanitizedTx.walletId
    ) {
      const fromWalletId = sanitizedTx.type === 'expense' ? sanitizedTx.walletId : sanitizedTx.transferToWalletId;
      const toWalletId = sanitizedTx.type === 'expense' ? sanitizedTx.transferToWalletId : sanitizedTx.walletId;

      const fromW = computedWallets.find((w) => isWalletMatch(w, fromWalletId)) || wallets.find((w) => isWalletMatch(w, fromWalletId));
      const toW = computedWallets.find((w) => isWalletMatch(w, toWalletId)) || wallets.find((w) => isWalletMatch(w, toWalletId));

      const fromName = fromW ? (lang === 'my' ? fromW.name : fromW.nameEn || fromW.name) : 'Wallet';
      const toName = toW ? (lang === 'my' ? toW.name : toW.nameEn || toW.name) : 'Wallet';

      // [v7.5.56 A7] Random suffix so two transfers in the same
      // millisecond can never collide; [v7.5.56 A1] stamp the creator.
      const outId = `tx_tf_out_${Date.now()}_${randomSuffix()}`;
      const inId = `tx_tf_in_${Date.now()}_${randomSuffix()}`;

      const outTx: Transaction = {
        id: outId,
        type: 'expense',
        amount: cleanAmount,
        category: 'cat_transfer',
        subCategoryId: 'sub_tf_out',
        date: sanitizedTx.date,
        note: sanitizedTx.note || `[ငွေလွှဲထွက်] ➔ ${toName}`,
        walletId: fromWalletId,
        isTransfer: true,
        transferType: 'transfer_out',
        transferToWalletId: toWalletId,
        transferPairId: inId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
        lastEditedBy: user?.uid || 'guest',
        createdBy: user?.uid || undefined,
        createdByName: creatorName || undefined,
      };

      const inTx: Transaction = {
        id: inId,
        type: 'income',
        amount: cleanAmount,
        category: 'cat_transfer',
        subCategoryId: 'sub_tf_in',
        date: sanitizedTx.date,
        note: sanitizedTx.note || `[ငွေလွှဲဝင်] ⬅ ${fromName}`,
        walletId: toWalletId,
        isTransfer: true,
        transferType: 'transfer_in',
        transferToWalletId: fromWalletId,
        transferPairId: outId,
        createdAt: Date.now() + 1,
        updatedAt: Date.now() + 1,
        version: 1,
        lastEditedBy: user?.uid || 'guest',
        createdBy: user?.uid || undefined,
        createdByName: creatorName || undefined,
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

        // [v7.5.56 A3/A6] Both legs go through the checked shared path
        // (post-transfer balances, recompute after). The success toast
        // below fires first, but a failed shared write toasts the real
        // error itself via the checked helper, so the user is never
        // left with only a false success.
        if (fromW && isSharedWallet(fromW)) {
          saveSharedTxChecked(fromW, outTx, (Number(fromW.balance) || 0) - cleanAmount).then((ok) => {
            if (!ok) showToast(sharedFailMsg);
          });
        }
        if (toW && isSharedWallet(toW)) {
          saveSharedTxChecked(toW, inTx, (Number(toW.balance) || 0) + cleanAmount).then((ok) => {
            if (!ok) showToast(sharedFailMsg);
          });
        }
      }

      showToast(lang === 'my' ? 'ငွေလွှဲပြောင်းမှု ထည့်သွင်းပြီးပါပြီ ✓' : 'Transfer recorded successfully ✓');
      // [v7.5.60 S2] Close only now that the transfer has landed.
      setIsTxModalOpen(false);
      return true;
    }

    // [v7.5.55] C8: a free 0-Ks tire-pressure check creates NO expense
    // transaction — only the tire log (syncToExpense false, no
    // transactionId). The + form bypasses the amount > 0 gate for this.
    if (vehicleLinkData?.logType === 'tire' && cleanAmount === 0) {
      const targetVehicle = vehicles.find((v) => v.id === vehicleLinkData.vehicleId);
      const vehicleName = targetVehicle ? `${targetVehicle.name} (${targetVehicle.plateNumber})` : 'Vehicle';
      const odo = vehicleLinkData.odometer || targetVehicle?.currentOdometer || 0;
      const tireId = `tire_${Date.now()}`;
      const tireLog: TirePressureLog = {
        id: tireId,
        vehicleId: vehicleLinkData.vehicleId,
        vehicleName,
        date: sanitizedTx.date,
        odometer: odo,
        ...resolveTirePsi(vehicleLinkData, targetVehicle),
        cost: 0,
        syncToExpense: false,
        transactionId: undefined,
        walletId: sanitizedTx.walletId,
        note: sanitizedTx.note,
        userId: user?.uid || 'guest',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setTirePressureLogs((prev) => {
        const next = [tireLog, ...prev];
        safeSetItem('ngwe_tire_logs', JSON.stringify(next));
        return next;
      });
      if (user?.uid) {
        const targetUid = activeWorkspaceId || user.uid;
        persistDoc(doc(db, 'users', targetUid, 'tirePressureLogs', tireId), {
          ...tireLog,
          userId: targetUid,
        }, { merge: true });
      }
      if (odo > 0 && targetVehicle && odo > (targetVehicle.currentOdometer || 0)) {
        handleSaveVehicle({ ...targetVehicle, currentOdometer: odo });
      }
      showToast(lang === 'my' ? 'လေချိန် စစ်ဆေးမှု မှတ်တမ်းတင်ပြီးပါပြီ ✓ (အခမဲ့ — ငွေစာရင်း မထည့်ပါ)' : 'Tire pressure check recorded ✓ (free — no expense recorded)');
      // [v7.5.60 S2] Close only now that the check has landed.
      setIsTxModalOpen(false);
      return true;
    }

    // [v7.5.56 A7] Random suffix so two adds in the same millisecond
    // can never collide; [v7.5.56 A1] stamp the creator.
    const id = `tx_${Date.now()}_${randomSuffix()}`;
    unmarkTxDeleted(id);
    const transaction: Transaction = {
      ...sanitizedTx,
      id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
      lastEditedBy: user?.uid || 'guest',
      createdBy: user?.uid || undefined,
      createdByName: creatorName || undefined,
    };

    setTransactions((prev) => {
      const next = [transaction, ...prev.filter((t) => t.id !== id)];
      safeSetItem('ngwe_transactions', JSON.stringify(next));
      return next;
    });

    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      persistDoc(doc(db, 'users', targetUid, 'transactions', id), {
        ...transaction,
        userId: targetUid,
      }, { merge: true });
    }

    // Cloud sync if target wallet is shared
    // [v7.5.56 A3/A6] Checked shared write (post-add balance, recompute
    // after); a failure toasts the real error via the helper.
    if (targetWallet && isSharedWallet(targetWallet)) {
      const isIncome = transaction.type === 'income';
      const newBal = (Number(targetWallet.balance) || 0) + (isIncome ? transaction.amount : -transaction.amount);
      saveSharedTxChecked(targetWallet, transaction, newBal).then((ok) => {
        if (!ok) showToast(sharedFailMsg);
      });
    }

    // ==========================================
    // AUTO-SYNC TO VEHICLE MANAGEMENT IF LINKED
    // ==========================================
    if (vehicleLinkData && vehicleLinkData.vehicleId && sanitizedTx.type === 'expense') {
      const targetVehicle = vehicles.find((v) => v.id === vehicleLinkData.vehicleId);
      const vehicleName = targetVehicle ? `${targetVehicle.name} (${targetVehicle.plateNumber})` : 'Vehicle';
      const odo = vehicleLinkData.odometer || targetVehicle?.currentOdometer || 0;

      if (vehicleLinkData.logType === 'fuel') {
        const fuelId = `fuel_${Date.now()}`;
        const liters = vehicleLinkData.liters || 0;
        const pricePerLiter =
          vehicleLinkData.pricePerLiter || (liters > 0 ? Math.round(cleanAmount / liters) : 0);

        const vehicleLogs = fuelLogs
          .filter((l) => l.vehicleId === vehicleLinkData.vehicleId)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const lastLog = vehicleLogs[0];

        let distanceSinceLast: number | undefined = undefined;
        let fuelEfficiency: number | undefined = undefined;
        let costPerDistance: number | undefined = undefined;

        if (lastLog && odo > lastLog.odometer && liters > 0) {
          distanceSinceLast = odo - lastLog.odometer;
          fuelEfficiency = Number((distanceSinceLast / liters).toFixed(2));
          costPerDistance = Number((cleanAmount / distanceSinceLast).toFixed(1));
        }

        const fuelLog: FuelLog = {
          id: fuelId,
          vehicleId: vehicleLinkData.vehicleId,
          vehicleName,
          date: sanitizedTx.date,
          odometer: odo,
          liters,
          pricePerLiter,
          totalCost: cleanAmount,
          isFullTank: vehicleLinkData.isFullTank ?? true,
          fuelType: vehicleLinkData.fuelType || targetVehicle?.fuelType || 'Octane 92',
          gasStation: vehicleLinkData.gasStation,
          syncToExpense: true,
          transactionId: id,
          walletId: sanitizedTx.walletId,
          note: sanitizedTx.note,
          distanceSinceLast,
          fuelEfficiency,
          costPerDistance,
          userId: user?.uid || 'guest',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        setFuelLogs((prev) => {
          const next = [fuelLog, ...prev];
          safeSetItem('ngwe_fuel_logs', JSON.stringify(next));
          return next;
        });

        if (user?.uid) {
          const targetUid = activeWorkspaceId || user.uid;
          persistDoc(doc(db, 'users', targetUid, 'fuelLogs', fuelId), {
            ...fuelLog,
            userId: targetUid,
          }, { merge: true });
        }
      } else if (vehicleLinkData.logType === 'maintenance') {
        const maintId = `maint_${Date.now()}`;
        const maint: VehicleMaintenance = {
          id: maintId,
          vehicleId: vehicleLinkData.vehicleId,
          vehicleName,
          date: sanitizedTx.date,
          odometer: odo,
          serviceType: vehicleLinkData.serviceType || 'general_repair',
          title: vehicleLinkData.title || sanitizedTx.note || (lang === 'my' ? 'ယာဉ်ပြုပြင်ထိန်းသိမ်းမှု' : 'Vehicle Maintenance'),
          cost: cleanAmount,
          sparePartBrand: vehicleLinkData.sparePartBrand,
          workshopName: vehicleLinkData.workshopName,
          expectedLifespanKm: vehicleLinkData.expectedLifespanKm,
          expectedLifespanDays: vehicleLinkData.expectedLifespanDays,
          lastReplacedDate: sanitizedTx.date,
          lastReplacedOdometer: odo,
          syncToExpense: true,
          transactionId: id,
          walletId: sanitizedTx.walletId,
          note: sanitizedTx.note,
          userId: user?.uid || 'guest',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        setVehicleMaintenance((prev) => {
          const next = [maint, ...prev];
          safeSetItem('ngwe_vehicle_maintenance', JSON.stringify(next));
          return next;
        });

        if (user?.uid) {
          const targetUid = activeWorkspaceId || user.uid;
          persistDoc(doc(db, 'users', targetUid, 'vehicleMaintenance', maintId), {
            ...maint,
            userId: targetUid,
          }, { merge: true });
        }
      } else if (vehicleLinkData.logType === 'tire') {
        const tireId = `tire_${Date.now()}`;
        const tireLog: TirePressureLog = {
          id: tireId,
          vehicleId: vehicleLinkData.vehicleId,
          vehicleName,
          date: sanitizedTx.date,
          odometer: odo,
          ...resolveTirePsi(vehicleLinkData, targetVehicle),
          cost: cleanAmount,
          // [v7.5.55] C8b: syncToExpense is true only when an expense
          // transaction was actually created for this check. There is no
          // sync toggle in the + form, so the 0-cost check (handled in the
          // early branch above, syncToExpense false) is the false case.
          syncToExpense: cleanAmount > 0,
          transactionId: id,
          walletId: sanitizedTx.walletId,
          note: sanitizedTx.note,
          userId: user?.uid || 'guest',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        setTirePressureLogs((prev) => {
          const next = [tireLog, ...prev];
          safeSetItem('ngwe_tire_logs', JSON.stringify(next));
          return next;
        });

        if (user?.uid) {
          const targetUid = activeWorkspaceId || user.uid;
          persistDoc(doc(db, 'users', targetUid, 'tirePressureLogs', tireId), {
            ...tireLog,
            userId: targetUid,
          }, { merge: true });
        }
      }

      // Automatically update vehicle's current odometer if new reading is higher
      if (odo > 0 && targetVehicle && odo > (targetVehicle.currentOdometer || 0)) {
        handleSaveVehicle({ ...targetVehicle, currentOdometer: odo });
      }

      showToast(
        lang === 'my'
          ? 'ငွေစာရင်းနှင့် ယာဉ်မှတ်တမ်း (Vehicle Log) သို့ တစ်ပြိုင်တည်း ထည့်သွင်းပြီးပါပြီ ✓'
          : 'Transaction & Vehicle record synced successfully ✓'
      );
      // [v7.5.60 S2] Close only now that the record has landed.
      setIsTxModalOpen(false);
      return true;
    }

    showToast(lang === 'my' ? 'မှတ်တမ်း အသစ်ထည့်သွင်းပြီးပါပြီ' : 'Transaction added');
    // [v7.5.60 S2] Close only now that the record has landed.
    setIsTxModalOpen(false);
    return true;
  };

  const handleDeleteTransaction = async (id: string) => {
    // [v6.9-phase1a] Permission check MUST run before markTxDeleted.
    // Before: marker was set first, so even a blocked delete still
    // left a phantom deletion marker → cloud listener later refused
    // to re-add that tx, effectively hiding it locally.
    const txToDelete = transactions.find((t) => t.id === id);
    if (!txToDelete) return;

    const targetWallet = wallets.find((w) => isWalletMatch(w, txToDelete.walletId));
    // [v7.5.56 A2] Creator-or-owner gate for delete (legacy txs with no
    // createdBy fall back to the per-type permission check).
    if (!canActOnTx(targetWallet, txToDelete, txToDelete.type, 'delete')) {
      showToast(
        lang === 'my'
          ? `⚠️ ဤ Wallet ပိုင်ရှင်မှ ${txToDelete.type === 'income' ? 'ဝင်ငွေ' : 'ထွက်ငွေ'} မှတ်တမ်းဖျက်ခွင့် ပိတ်ထားပါသည် (သို့မဟုတ် သင်ဖန်တီးထားသော မှတ်တမ်းမဟုတ်ပါ)`
          : 'Permission denied: wallet owner has disabled deleting transactions (or this is not a record you created)'
      );
      return;
    }

    // [v7.5.56 A5] Cloud deletes FIRST — only mark/remove locally once
    // the cloud confirms. A failure that safeDeleteDoc already queued
    // for retry (offline / quota-exhausted) still proceeds locally;
    // a live failure does NOT mark, toasts the error, and keeps the tx.
    const pairTxForDelete = txToDelete.transferPairId
      ? transactions.find((t) => t.id === txToDelete.transferPairId)
      : undefined;
    const deleteOneTxFromCloud = async (tx: Transaction, wallet?: Wallet): Promise<boolean> => {
      if (!user?.uid) return true;
      const targetUid = activeWorkspaceId || user.uid;
      const personalOk = await safeDeleteDoc(doc(db, 'users', targetUid, 'transactions', tx.id));
      let ok = personalOk;
      if (wallet && isSharedWallet(wallet)) {
        const postBal = (Number(wallet.balance) || 0) - txEffect(tx);
        const sharedOk = await deleteSharedTxChecked(wallet, tx.id, postBal);
        if (!sharedOk) ok = false;
      }
      return ok;
    };
    const mainCloudOk = await deleteOneTxFromCloud(txToDelete, targetWallet);
    let pairCloudOk = true;
    if (pairTxForDelete) {
      const pairWallet = wallets.find((w) => isWalletMatch(w, pairTxForDelete.walletId));
      pairCloudOk = await deleteOneTxFromCloud(pairTxForDelete, pairWallet);
    }
    const deleteQueuedForRetry =
      (typeof navigator !== 'undefined' && !navigator.onLine) || isQuotaExhausted();
    if ((!mainCloudOk || !pairCloudOk) && !deleteQueuedForRetry) {
      showToast(
        lang === 'my'
          ? '⚠️ Cloud မှ ဖျက်၍ မရပါ — မှတ်တမ်းကို ထားရှိထားပါသည်။ အင်တာနက်စစ်ပြီး ထပ်ကြိုးစားပါ'
          : '⚠️ Could not delete from cloud — the record was kept. Check your connection and retry'
      );
      return;
    }

    // Cloud confirmed (or queued for retry) — mark as deleted
    markTxDeleted(id);

    // 1. Calculate next state synchronously (including paired transfer if any)
    const pairId = txToDelete.transferPairId;
    const nextTransactions = transactions.filter((t) => t.id !== id && (!pairId || t.id !== pairId));
    setTransactions(nextTransactions);
    safeSetItem('ngwe_transactions', JSON.stringify(nextTransactions));

    // 2. Clear from confirmed cloudTxIds and syncQueue
    setCloudTxIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      if (pairId) next.delete(pairId);
      safeSetItem('ngwe_cloud_tx_ids', JSON.stringify(Array.from(next)));
      return next;
    });
    syncQueue.remove('transactions', id);
    if (pairId) {
      markTxDeleted(pairId);
      syncQueue.remove('transactions', pairId);
    }

    // iOS Safari WebKit: force a direct REST DELETE on both collections
    // in parallel to guarantee cloud deletion even when the SDK hangs.
    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      (async () => {
        try {
          const { deleteTransactionDirectHttp } = await import('../lib/directFirestoreHttp');
          await Promise.allSettled([
            deleteTransactionDirectHttp(id, targetUid),
            pairId ? deleteTransactionDirectHttp(pairId, targetUid) : Promise.resolve(),
          ]);
        } catch (e) {
          console.warn('[delete] REST verify notice:', e);
        }
      })();
    }

    // Recalculate vehicle odometer if linked logs are deleted
    const linkedFuelDel = fuelLogs.find(f => f.transactionId === id);
    const linkedMaintDel = vehicleMaintenance.find(m => m.transactionId === id);
    const linkedTireDel = tirePressureLogs.find(t => t.transactionId === id);
    const affectedVehicleId = linkedFuelDel?.vehicleId || linkedMaintDel?.vehicleId || linkedTireDel?.vehicleId;

    let nextFuel = fuelLogs;
    let nextMaint = vehicleMaintenance;
    let nextTire = tirePressureLogs;

    if (linkedFuelDel) {
      nextFuel = fuelLogs.filter(f => f.id !== linkedFuelDel.id);
      setFuelLogs(nextFuel);
      markVehicleLogDeleted('fuelLogs', linkedFuelDel.id);
      if (user?.uid) deleteDocChecked(doc(db, 'users', activeWorkspaceId || user.uid, 'fuelLogs', linkedFuelDel.id));
    }
    if (linkedMaintDel) {
      nextMaint = vehicleMaintenance.filter(m => m.id !== linkedMaintDel.id);
      setVehicleMaintenance(nextMaint);
      markVehicleLogDeleted('vehicleMaintenance', linkedMaintDel.id);
      if (user?.uid) deleteDocChecked(doc(db, 'users', activeWorkspaceId || user.uid, 'vehicleMaintenance', linkedMaintDel.id));
    }
    if (linkedTireDel) {
      nextTire = tirePressureLogs.filter(t => t.id !== linkedTireDel.id);
      setTirePressureLogs(nextTire);
      markVehicleLogDeleted('tirePressureLogs', linkedTireDel.id);
      if (user?.uid) deleteDocChecked(doc(db, 'users', activeWorkspaceId || user.uid, 'tirePressureLogs', linkedTireDel.id));
    }
    if (affectedVehicleId) {
      const targetVeh = vehicles.find(v => v.id === affectedVehicleId);
      if (targetVeh) {
        const odos = [
          ...nextFuel.filter(f => f.vehicleId === affectedVehicleId).map(f => f.odometer || 0),
          ...nextMaint.filter(m => m.vehicleId === affectedVehicleId).map(m => m.odometer || 0),
          ...nextTire.filter(t => t.vehicleId === affectedVehicleId).map(t => t.odometer || 0)
        ];
        // မှတ်တမ်းတစ်စောင်မှ မကျန်တော့ရင် မိုင်တာကို 0 ပြန်မချဘဲ အရင်အတိုင်း ထားပါတယ်
        if (odos.length > 0) {
          const newMax = Math.max(...odos);
          if (newMax !== targetVeh.currentOdometer) {
            handleSaveVehicle({ ...targetVeh, currentOdometer: newMax });
          }
        }
      }
    }

    showToast(lang === 'my' ? 'မှတ်တမ်းကို ဖျက်လိုက်ပါပြီ' : 'Transaction deleted');
  };

  return {
    handleOpenAddTx,
    handleOpenEditTx,
    handleOpenAddDebt,
    handleAddTransaction,
    handleDeleteTransaction,
  };
}
