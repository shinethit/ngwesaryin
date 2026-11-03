import type { Dispatch, SetStateAction } from 'react';
import { doc } from 'firebase/firestore';
import { db, safeSetDoc, safeDeleteDoc } from '../lib/firebase';
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

  // [v7.5.55] Decision 1 — transaction limit is per ROLLING 30 days:
  // count transactions dated within the last 30 days (local YYYY-MM-DD
  // compare). The count blocks the moment it reaches the CURRENT plan's
  // maxTransactions (guest 30, free 100), even if reached in 10 days.
  const countRolling30DayTransactions = (txs: Transaction[]) => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    const start = getLocalDateString(d);
    return txs.filter((t) => t.date && t.date >= start).length;
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
    // [v7.5.55] Rolling-30-day count against the CURRENT plan's row.
    const rollingTxCount = countRolling30DayTransactions(transactions);

    if (plan === 'guest' && rollingTxCount >= limits.maxTransactions) {
      if (window.confirm(lang === 'my'
        ? `Guest Mode တွင် ရက် (၃၀) အတွင်း မှတ်တမ်း (${limits.maxTransactions}) ခုသာ ထည့်သွင်းနိုင်ပါသည်။ Google Account ဖြင့် Sign in ပြုလုပ်ပါ သို့မဟုတ် Premium သို့ တိုးမြှင့်ပါ`
        : `Guest Mode allows up to ${limits.maxTransactions} transactions within 30 days. Please Sign In with Google or Upgrade.`)) {
        setIsAuthModalOpen(true);
      }
      return;
    }

    if (plan === 'free' && rollingTxCount >= limits.maxTransactions) {
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
    const perms = getCollaboratorPermissions(targetWallet, user?.email, user?.uid);
    const canEdit = tx.type === 'income' ? perms.canEditIncome : perms.canEditExpense;
    if (!canEdit) {
      showToast(
        lang === 'my'
          ? `⚠️ ဤ Wallet ပိုင်ရှင်မှ ${tx.type === 'income' ? 'ဝင်ငွေ' : 'ထွက်ငွေ'} ပြင်ဆင်ခွင့် ပိတ်ထားပါသည်`
          : 'Permission denied: wallet owner has disabled transaction editing'
      );
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

  const handleAddTransaction = (
    newTx: Omit<Transaction, 'id' | 'createdAt'>,
    vehicleLinkData?: VehicleLinkData
  ) => {
    // Explicitly close modal immediately to prevent repeat clicks
    setIsTxModalOpen(false);
    const cleanAmount = Math.abs(Number(newTx.amount) || 0);
    const sanitizedTx = { ...newTx, amount: cleanAmount };

    if (editingTransaction) {
      setEditingTransaction(null);
      setTxModalInitialWalletId(undefined);
      const editWallet = wallets.find((w) => isWalletMatch(w, editingTransaction.walletId));
      const perms = getCollaboratorPermissions(editWallet, user?.email, user?.uid);
      const canEdit = editingTransaction.type === 'income' ? perms.canEditIncome : perms.canEditExpense;
      if (!canEdit) {
        showToast(
          lang === 'my'
            ? `⚠️ ဤ Wallet ပိုင်ရှင်မှ ${editingTransaction.type === 'income' ? 'ဝင်ငွေ' : 'ထွက်ငွေ'} ပြင်ဆင်ခွင့် ပိတ်ထားပါသည်`
            : 'Permission denied: wallet owner has disabled transaction editing'
        );
        return;
      }

      const updatedTx = { ...sanitizedTx, id: editingTransaction.id, createdAt: editingTransaction.createdAt, updatedAt: Date.now(), version: (editingTransaction.version || 0) + 1, lastEditedBy: user?.uid || 'guest' } as Transaction;
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
      const oldWallet = computedWallets.find((w) => isWalletMatch(w, editingTransaction.walletId));
      const newWallet = computedWallets.find((w) => isWalletMatch(w, sanitizedTx.walletId));
      if (newWallet && (newWallet.isSharedFromOther || (newWallet.sharedWith && newWallet.sharedWith.length > 0))) {
        const sharedDocId = getSharedWalletDocId(newWallet, user?.uid);
        saveSharedWalletTransaction(newWallet.id, updatedTx, newWallet.balance, sharedDocId, user?.uid);
      }
      if (oldWallet && !isWalletMatch(oldWallet, sanitizedTx.walletId) && (oldWallet.isSharedFromOther || (oldWallet.sharedWith && oldWallet.sharedWith.length > 0))) {
        deleteSharedWalletTransaction(oldWallet.id, editingTransaction.id, oldWallet.balance, getSharedWalletDocId(oldWallet, user?.uid), user?.uid);
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
      return;
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
      return;
    }

    if (plan === 'guest') {
      // [v7.5.55] Rolling-30-day re-check (same rule as handleOpenAddTx).
      if (countRolling30DayTransactions(transactions) >= limits.maxTransactions) {
        if (window.confirm(lang === 'my'
          ? `Guest Mode တွင် ရက် (၃၀) အတွင်း မှတ်တမ်း (${limits.maxTransactions}) ခုသာ ထည့်သွင်းနိုင်ပါသည်။ Google Account ဖြင့် Sign in ပြုလုပ်ပါ`
          : `Guest Mode allows up to ${limits.maxTransactions} transactions within 30 days. Please Sign In with Google.`)) {
          setIsAuthModalOpen(true);
        }
        return;
      }
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

      const outId = `tx_tf_out_${Date.now()}`;
      const inId = `tx_tf_in_${Date.now() + 1}`;

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

        if (fromW && (fromW.isSharedFromOther || (fromW.sharedWith && fromW.sharedWith.length > 0))) {
          saveSharedWalletTransaction(fromW.id, outTx, fromW.balance, getSharedWalletDocId(fromW, user.uid), user.uid);
        }
        if (toW && (toW.isSharedFromOther || (toW.sharedWith && toW.sharedWith.length > 0))) {
          saveSharedWalletTransaction(toW.id, inTx, toW.balance, getSharedWalletDocId(toW, user.uid), user.uid);
        }
      }

      showToast(lang === 'my' ? 'ငွေလွှဲပြောင်းမှု ထည့်သွင်းပြီးပါပြီ ✓' : 'Transfer recorded successfully ✓');
      return;
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
      return;
    }

    const id = `tx_${Date.now()}`;
    unmarkTxDeleted(id);
    const transaction: Transaction = {
      ...sanitizedTx,
      id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
      lastEditedBy: user?.uid || 'guest',
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
    if (targetWallet && (targetWallet.isSharedFromOther || (targetWallet.sharedWith && targetWallet.sharedWith.length > 0))) {
      const isIncome = transaction.type === 'income';
      const newBal = (Number(targetWallet.balance) || 0) + (isIncome ? transaction.amount : -transaction.amount);
      const sharedDocId = getSharedWalletDocId(targetWallet, user?.uid);
      saveSharedWalletTransaction(targetWallet.id, transaction, newBal, sharedDocId, user?.uid).catch((err) =>
        console.error('Failed to sync shared wallet tx to cloud:', err)
      );
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
      return;
    }

    showToast(lang === 'my' ? 'မှတ်တမ်း အသစ်ထည့်သွင်းပြီးပါပြီ' : 'Transaction added');
  };

  const handleDeleteTransaction = async (id: string) => {
    // [v6.9-phase1a] Permission check MUST run before markTxDeleted.
    // Before: marker was set first, so even a blocked delete still
    // left a phantom deletion marker → cloud listener later refused
    // to re-add that tx, effectively hiding it locally.
    const txToDelete = transactions.find((t) => t.id === id);
    if (!txToDelete) return;

    const targetWallet = wallets.find((w) => isWalletMatch(w, txToDelete.walletId));
    const perms = getCollaboratorPermissions(targetWallet, user?.email, user?.uid);
    const canDelete = txToDelete.type === 'income' ? perms.canDeleteIncome : perms.canDeleteExpense;
    if (!canDelete) {
      showToast(
        lang === 'my'
          ? `⚠️ ဤ Wallet ပိုင်ရှင်မှ ${txToDelete.type === 'income' ? 'ဝင်ငွေ' : 'ထွက်ငွေ'} မှတ်တမ်းဖျက်ခွင့် ပိတ်ထားပါသည်`
          : 'Permission denied: wallet owner has disabled deleting transactions'
      );
      return;
    }

    // Permission OK — mark as deleted
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
    if (pairId) syncQueue.remove('transactions', pairId);

    // 3. Cloud deletion for deleted transaction (and pair if transfer)
    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      deleteDocChecked(doc(db, 'users', targetUid, 'transactions', id));
      if (pairId) {
        markTxDeleted(pairId);
        deleteDocChecked(doc(db, 'users', targetUid, 'transactions', pairId));
      }

      if (targetWallet && (targetWallet.isSharedFromOther || (targetWallet.sharedWith && targetWallet.sharedWith.length > 0))) {
        const sharedDocId = getSharedWalletDocId(targetWallet, user?.uid);
        deleteSharedWalletTransaction(targetWallet.id, txToDelete.id, targetWallet.balance, sharedDocId, user?.uid);
      }
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
