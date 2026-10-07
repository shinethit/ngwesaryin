import type { Dispatch, SetStateAction } from 'react';
import { doc } from 'firebase/firestore';
import { db, safeSetDoc, safeDeleteDoc } from '../lib/firebase';
import { safeSetItem } from '../utils/storage';
import { syncQueue } from '../lib/syncQueue';
import { markTxDeleted, unmarkTxDeleted } from '../utils/deletedMarkers';
import { getCollaboratorPermissions } from '../utils/permissions';
import { isWalletMatch } from '../utils/walletBalance';
import {
  saveSharedWalletTransaction,
  deleteSharedWalletTransaction,
  getSharedWalletDocId,
} from '../lib/sharedWalletService';
import type {
  Category,
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

  const handleOpenAddTx = (
    type: TransactionType = 'expense',
    targetWalletId?: string,
    initialModel: 'general' | 'fuel' | 'vehicle_service' = 'general'
  ) => {
    // Current month transaction check for Guest
    const currentMonthStr = new Date().toISOString().substring(0, 7);
    const monthlyTxCount = transactions.filter((t) => t.date && t.date.startsWith(currentMonthStr)).length;

    if (plan === 'guest' && monthlyTxCount >= limits.maxTransactions) {
      if (window.confirm(lang === 'my' 
        ? 'Guest Mode တွင် ၁ လလျှင် မှတ်တမ်း (၃၀) ခုသာ ထည့်သွင်းနိုင်ပါသည်။ Google Account ဖြင့် Sign in ပြုလုပ်ပါ သို့မဟုတ် Premium သို့ တိုးမြှင့်ပါ'
        : 'Guest Mode allows up to 30 transactions per month. Please Sign In with Google or Upgrade.')) {
        setIsAuthModalOpen(true);
      }
      return;
    }

    if (plan === 'free' && transactions.length >= limits.maxTransactions) {
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
    if (plan === 'free' && activeDebtsCount >= limits.maxDebts) {
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

      const updatedTx = { ...sanitizedTx, id: editingTransaction.id, createdAt: editingTransaction.createdAt } as Transaction;
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
          };
          setTransactions((prev) => {
            const next = prev.map((t) => (t.id === pairTx.id ? updatedPair : t));
            safeSetItem('ngwe_transactions', JSON.stringify(next));
            return next;
          });
          if (user?.uid) {
            const targetUid = activeWorkspaceId || user.uid;
            safeSetDoc(doc(db, 'users', targetUid, 'transactions', pairTx.id), {
              ...updatedPair,
              userId: targetUid,
            }, { merge: true });
          }
        }
      }

      if (user?.uid) {
        const targetUid = activeWorkspaceId || user.uid;
        safeSetDoc(doc(db, 'users', targetUid, 'transactions', editingTransaction.id), {
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
      const currentMonthStr = new Date().toISOString().substring(0, 7);
      const monthlyTxCount = transactions.filter((t) => t.date && t.date.startsWith(currentMonthStr)).length;
      if (monthlyTxCount >= limits.maxTransactions) {
        if (window.confirm(lang === 'my'
          ? 'Guest Mode တွင် ၁ လလျှင် မှတ်တမ်း (၃၀) ခုသာ ထည့်သွင်းနိုင်ပါသည်။ Google Account ဖြင့် Sign in ပြုလုပ်ပါ'
          : 'Guest Mode allows up to 30 transactions per month. Please Sign In with Google.')) {
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

    const id = `tx_${Date.now()}`;
    unmarkTxDeleted(id);
    const transaction: Transaction = {
      ...sanitizedTx,
      id,
      createdAt: Date.now(),
    };

    setTransactions((prev) => {
      const next = [transaction, ...prev.filter((t) => t.id !== id)];
      safeSetItem('ngwe_transactions', JSON.stringify(next));
      return next;
    });

    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      safeSetDoc(doc(db, 'users', targetUid, 'transactions', id), {
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
        };

        setFuelLogs((prev) => {
          const next = [fuelLog, ...prev];
          safeSetItem('ngwe_fuel_logs', JSON.stringify(next));
          return next;
        });

        if (user?.uid) {
          const targetUid = activeWorkspaceId || user.uid;
          safeSetDoc(doc(db, 'users', targetUid, 'fuelLogs', fuelId), {
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
        };

        setVehicleMaintenance((prev) => {
          const next = [maint, ...prev];
          safeSetItem('ngwe_vehicle_maintenance', JSON.stringify(next));
          return next;
        });

        if (user?.uid) {
          const targetUid = activeWorkspaceId || user.uid;
          safeSetDoc(doc(db, 'users', targetUid, 'vehicleMaintenance', maintId), {
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
          frontLeftPsi: vehicleLinkData.frontLeftPsi,
          frontRightPsi: vehicleLinkData.frontRightPsi,
          rearLeftPsi: vehicleLinkData.rearLeftPsi,
          rearRightPsi: vehicleLinkData.rearRightPsi,
          cost: cleanAmount,
          syncToExpense: true,
          transactionId: id,
          walletId: sanitizedTx.walletId,
          note: sanitizedTx.note,
          userId: user?.uid || 'guest',
          createdAt: Date.now(),
        };

        setTirePressureLogs((prev) => {
          const next = [tireLog, ...prev];
          safeSetItem('ngwe_tire_logs', JSON.stringify(next));
          return next;
        });

        if (user?.uid) {
          const targetUid = activeWorkspaceId || user.uid;
          safeSetDoc(doc(db, 'users', targetUid, 'tirePressureLogs', tireId), {
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
    markTxDeleted(id);

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
      safeDeleteDoc(doc(db, 'users', targetUid, 'transactions', id));
      if (pairId) {
        markTxDeleted(pairId);
        safeDeleteDoc(doc(db, 'users', targetUid, 'transactions', pairId));
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
