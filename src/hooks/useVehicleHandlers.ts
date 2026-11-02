import type { Dispatch, SetStateAction } from 'react';
import { doc } from 'firebase/firestore';
import { db, safeSetDoc, safeDeleteDoc } from '../lib/firebase';
import { safeSetItem } from '../utils/storage';
import { markVehicleLogDeleted, markTxDeleted } from '../utils/deletedMarkers';
import type {
  Category,
  FuelLog,
  Transaction,
  TirePressureLog,
  Vehicle,
  VehicleMaintenance,
  Wallet,
} from '../types';

interface UseVehicleHandlersParams {
  user: { uid: string } | null;
  activeWorkspaceId: string | null;
  lang: 'my' | 'en';
  showToast: (msg: string) => void;
  computedWallets: Wallet[];
  categories: Category[];
  vehicles: Vehicle[];
  setVehicles: Dispatch<SetStateAction<Vehicle[]>>;
  fuelLogs: FuelLog[];
  setFuelLogs: Dispatch<SetStateAction<FuelLog[]>>;
  vehicleMaintenance: VehicleMaintenance[];
  setVehicleMaintenance: Dispatch<SetStateAction<VehicleMaintenance[]>>;
  tirePressureLogs: TirePressureLog[];
  setTirePressureLogs: Dispatch<SetStateAction<TirePressureLog[]>>;
  transactions: Transaction[];
  setTransactions: Dispatch<SetStateAction<Transaction[]>>;
}

/**
 * Vehicle management handlers — extracted from App.tsx (Phase 2 refactor).
 * Handles: vehicles CRUD, fuel logs, maintenance records, tire pressure logs.
 * Auto-syncs related expense transactions into the wallet/transaction stream.
 */
export function useVehicleHandlers({
  user,
  activeWorkspaceId,
  lang,
  showToast,
  computedWallets,
  categories,
  vehicles,
  setVehicles,
  fuelLogs,
  setFuelLogs,
  vehicleMaintenance,
  setVehicleMaintenance,
  tirePressureLogs,
  setTirePressureLogs,
  transactions,
  setTransactions,
}: UseVehicleHandlersParams) {

  // ==========================================
  // Vehicle Management Handlers & Wallet Sync
  // ==========================================
  const handleSaveVehicle = (vehicle: Vehicle) => {
    const vehId = vehicle.id || `veh_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const fullVehicle: Vehicle = {
      ...vehicle,
      id: vehId,
      createdAt: vehicle.createdAt || Date.now(),
      updatedAt: Date.now(),
      version: (vehicle.version || 0) + 1,
      lastEditedBy: user?.uid || 'guest',
    };

    setVehicles((prev) => {
      const exists = prev.some((v) => v.id === fullVehicle.id);
      const next = exists ? prev.map((v) => (v.id === fullVehicle.id ? fullVehicle : v)) : [fullVehicle, ...prev];
      safeSetItem('ngwe_vehicles', JSON.stringify(next));
      return next;
    });

    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      safeSetDoc(doc(db, 'users', targetUid, 'vehicles', fullVehicle.id), {
        ...fullVehicle,
        userId: targetUid,
      }, { merge: true });
    }

    showToast(lang === 'my' ? 'ယာဉ်အချက်အလက် သိမ်းဆည်းပြီးပါပြီ ✓' : 'Vehicle saved successfully ✓');
  };

  const recalculateVehicleOdometer = (vehicleId: string, fLogs: FuelLog[], mLogs: VehicleMaintenance[], tLogs: TirePressureLog[]) => {
    const targetVehicle = vehicles.find((v) => v.id === vehicleId);
    if (!targetVehicle) return;
    const odos = [
      ...fLogs.filter((f) => f.vehicleId === vehicleId).map((f) => f.odometer || 0),
      ...mLogs.filter((m) => m.vehicleId === vehicleId).map((m) => m.odometer || 0),
      ...tLogs.filter((t) => t.vehicleId === vehicleId).map((t) => t.odometer || 0),
    ];
    // No logs left: keep the current odometer instead of resetting it to 0.
    if (odos.length === 0) return;
    const newOdo = Math.max(...odos);
    if (newOdo !== targetVehicle.currentOdometer) {
      handleSaveVehicle({ ...targetVehicle, currentOdometer: newOdo });
    }
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    setVehicles((prev) => {
      const next = prev.filter((v) => v.id !== vehicleId);
      safeSetItem('ngwe_vehicles', JSON.stringify(next));
      return next;
    });

    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      safeDeleteDoc(doc(db, 'users', targetUid, 'vehicles', vehicleId));
    }

    showToast(lang === 'my' ? 'ယာဉ်ကို ဖျက်လိုက်ပါပြီ ✓' : 'Vehicle removed ✓');
  };

  const handleSaveFuelLog = (logData: FuelLog) => {
    const logId = logData.id || `fuel_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const targetVehicle = vehicles.find((v) => v.id === logData.vehicleId);
    const vehicleName = targetVehicle ? `${targetVehicle.name} (${targetVehicle.plateNumber})` : 'Vehicle';
    const txId = logData.transactionId || `tx_fuel_${logId}`;
    // [v7.2.4] note ?? '' so Firestore merge actually clears cleared notes
    const log: FuelLog = { ...logData, id: logId, transactionId: txId, note: logData.note ?? '', createdAt: logData.createdAt || Date.now(), updatedAt: Date.now(), version: (logData.version || 0) + 1, lastEditedBy: user?.uid || 'guest' };

    // [FIX v6.1.3] Resolve wallet — if log.walletId no longer exists, fall back to first wallet.
    const resolvedWalletId = (log.walletId && computedWallets.some((w) => w.id === log.walletId))
      ? log.walletId
      : (computedWallets[0]?.id || '');
    log.walletId = resolvedWalletId;

    if (log.syncToExpense !== false && log.totalCost > 0 && log.walletId) {
      const vehicleCat = categories.find((c) =>
        c.id === 'cat_vehicle' ||
        c.id === 'cat_vehicle_management' ||
        c.name.includes('ယာဉ်စီမံ') ||
        (c.nameEn && c.nameEn.toLowerCase().includes('vehicle management'))
      ) || categories.find((c) => c.type === 'expense') || categories[0];

      const fuelTx: Transaction = {
        id: txId,
        type: 'expense',
        amount: log.totalCost,
        category: vehicleCat?.id || 'cat_vehicle',
        subCategoryId: 'sub_veh_fuel',
        walletId: log.walletId,
        date: log.date,
        // [v7.2.3] Preserve user note as-is; fall back to auto summary.
        note: log.note
          ? log.note
          : `[ဆီထည့်စရိတ်] ${vehicleName} - ${log.liters.toLocaleString()} L @ ${log.pricePerLiter.toLocaleString()} Ks${log.gasStation ? ` (${log.gasStation})` : ''}`,
        createdAt: log.createdAt || Date.now(),
        updatedAt: Date.now(),
        version: 1,
        lastEditedBy: user?.uid || 'guest',
      };

      setTransactions((prev) => {
        const next = prev.some((t) => t.id === txId)
          ? prev.map((t) => (t.id === txId ? fuelTx : t))
          : [fuelTx, ...prev];
        safeSetItem('ngwe_transactions', JSON.stringify(next));
        return next;
      });

      if (user?.uid) {
        const targetUid = activeWorkspaceId || user.uid;
        safeSetDoc(doc(db, 'users', targetUid, 'transactions', txId), {
          ...fuelTx,
          userId: targetUid,
        }, { merge: true });
      }
    }

    const existsFuel = fuelLogs.some((f) => f.id === log.id);
    const nextFuelLogs = existsFuel ? fuelLogs.map((f) => (f.id === log.id ? log : f)) : [log, ...fuelLogs];
    setFuelLogs(nextFuelLogs);
    safeSetItem('ngwe_fuel_logs', JSON.stringify(nextFuelLogs));

    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      safeSetDoc(doc(db, 'users', targetUid, 'fuelLogs', log.id), {
        ...log,
        userId: targetUid,
      }, { merge: true });
    }

    recalculateVehicleOdometer(log.vehicleId, nextFuelLogs, vehicleMaintenance, tirePressureLogs);

    showToast(lang === 'my' ? 'ဆီထည့်မှတ်တမ်းနှင့် ထွက်ငွေစာရင်း သိမ်းဆည်းပြီးပါပြီ ✓' : 'Fuel log & expense recorded ✓');
  };

  const handleDeleteFuelLog = (logId: string) => {
    const logToDelete = fuelLogs.find((f) => f.id === logId);
    const txId = logToDelete?.transactionId || `tx_fuel_${logId}`;

    // Mark deleted so a cloud snapshot cannot bring this log back.
    markVehicleLogDeleted('fuelLogs', logId);

    const linkedTx = transactions.find((t) => t.id === txId);
    if (linkedTx) {
      markTxDeleted(txId);
      setTransactions((prev) => {
        const next = prev.filter((t) => t.id !== txId);
        safeSetItem('ngwe_transactions', JSON.stringify(next));
        return next;
      });
      if (user?.uid) {
        const targetUid = activeWorkspaceId || user.uid;
        safeDeleteDoc(doc(db, 'users', targetUid, 'transactions', txId));
      }
    }

    const nextFuelLogs = fuelLogs.filter((f) => f.id !== logId);
    setFuelLogs(nextFuelLogs);
    safeSetItem('ngwe_fuel_logs', JSON.stringify(nextFuelLogs));
    if (logToDelete) recalculateVehicleOdometer(logToDelete.vehicleId, nextFuelLogs, vehicleMaintenance, tirePressureLogs);

    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      safeDeleteDoc(doc(db, 'users', targetUid, 'fuelLogs', logId));
    }

    showToast(lang === 'my' ? 'ဆီထည့်မှတ်တမ်း ဖျက်ပြီးပါပြီ ✓' : 'Fuel log deleted ✓');
  };

  const handleSaveMaintenance = (maintData: VehicleMaintenance) => {
    const maintId = maintData.id || `maint_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const targetVehicle = vehicles.find((v) => v.id === maintData.vehicleId);
    const vehicleName = targetVehicle ? `${targetVehicle.name} (${targetVehicle.plateNumber})` : 'Vehicle';
    const txId = maintData.transactionId || `tx_maint_${maintId}`;
    // [v7.2.4] note ?? '' so Firestore merge actually clears cleared notes
    const maint: VehicleMaintenance = { ...maintData, id: maintId, transactionId: txId, note: maintData.note ?? '', createdAt: maintData.createdAt || Date.now(), updatedAt: Date.now(), version: (maintData.version || 0) + 1, lastEditedBy: user?.uid || 'guest' };

    // [FIX v6.1.3] Resolve wallet — if maint.walletId no longer exists, fall back to first wallet.
    const resolvedMaintWalletId = (maint.walletId && computedWallets.some((w) => w.id === maint.walletId))
      ? maint.walletId
      : (computedWallets[0]?.id || '');
    maint.walletId = resolvedMaintWalletId;

    if (maint.syncToExpense !== false && maint.cost > 0 && maint.walletId) {
      const vehicleCat = categories.find((c) =>
        c.id === 'cat_vehicle' ||
        c.id === 'cat_vehicle_management' ||
        c.name.includes('ယာဉ်စီမံ') ||
        (c.nameEn && c.nameEn.toLowerCase().includes('vehicle management'))
      ) || categories.find((c) => c.type === 'expense') || categories[0];

      const maintTx: Transaction = {
        id: txId,
        type: 'expense',
        amount: maint.cost,
        category: vehicleCat?.id || 'cat_vehicle',
        subCategoryId: 'sub_veh_maintenance',
        walletId: maint.walletId,
        date: maint.date,
        // [v7.2.3] Preserve user note as-is; fall back to auto summary.
        note: maint.note
          ? maint.note
          : `[ယာဉ်ပြုပြင်ထိန်းသိမ်းစရိတ်] ${vehicleName} - ${maint.serviceType}: ${maint.title}${maint.workshopName ? ` (${maint.workshopName})` : ''}`,
        createdAt: maint.createdAt || Date.now(),
        updatedAt: Date.now(),
        version: 1,
        lastEditedBy: user?.uid || 'guest',
      };

      setTransactions((prev) => {
        const next = prev.some((t) => t.id === txId)
          ? prev.map((t) => (t.id === txId ? maintTx : t))
          : [maintTx, ...prev];
        safeSetItem('ngwe_transactions', JSON.stringify(next));
        return next;
      });

      if (user?.uid) {
        const targetUid = activeWorkspaceId || user.uid;
        safeSetDoc(doc(db, 'users', targetUid, 'transactions', txId), {
          ...maintTx,
          userId: targetUid,
        }, { merge: true });
      }
    }

    const existsMaint = vehicleMaintenance.some((m) => m.id === maint.id);
    const nextMaint = existsMaint ? vehicleMaintenance.map((m) => (m.id === maint.id ? maint : m)) : [maint, ...vehicleMaintenance];
    setVehicleMaintenance(nextMaint);
    safeSetItem('ngwe_vehicle_maintenance', JSON.stringify(nextMaint));

    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      safeSetDoc(doc(db, 'users', targetUid, 'vehicleMaintenance', maint.id), {
        ...maint,
        userId: targetUid,
      }, { merge: true });
    }

    recalculateVehicleOdometer(maint.vehicleId, fuelLogs, nextMaint, tirePressureLogs);

    showToast(lang === 'my' ? 'ပြုပြင်ထိန်းသိမ်းမှု မှတ်တမ်း သိမ်းဆည်းပြီးပါပြီ ✓' : 'Maintenance record saved ✓');
  };

  const handleDeleteMaintenance = (maintId: string) => {
    const maintToDelete = vehicleMaintenance.find((m) => m.id === maintId);
    const txId = maintToDelete?.transactionId || `tx_maint_${maintId}`;

    markVehicleLogDeleted('vehicleMaintenance', maintId);

    const linkedTx = transactions.find((t) => t.id === txId);
    if (linkedTx) {
      markTxDeleted(txId);
      setTransactions((prev) => {
        const next = prev.filter((t) => t.id !== txId);
        safeSetItem('ngwe_transactions', JSON.stringify(next));
        return next;
      });
      if (user?.uid) {
        const targetUid = activeWorkspaceId || user.uid;
        safeDeleteDoc(doc(db, 'users', targetUid, 'transactions', txId));
      }
    }

    const nextMaint = vehicleMaintenance.filter((m) => m.id !== maintId);
    setVehicleMaintenance(nextMaint);
    safeSetItem('ngwe_vehicle_maintenance', JSON.stringify(nextMaint));
    if (maintToDelete) recalculateVehicleOdometer(maintToDelete.vehicleId, fuelLogs, nextMaint, tirePressureLogs);

    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      safeDeleteDoc(doc(db, 'users', targetUid, 'vehicleMaintenance', maintId));
    }

    showToast(lang === 'my' ? 'ပြုပြင်ထိန်းသိမ်းမှု မှတ်တမ်း ဖျက်ပြီးပါပြီ ✓' : 'Maintenance record deleted ✓');
  };

  const handleSaveTirePressure = (logData: TirePressureLog) => {
    const tireId = logData.id || `tire_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const targetVehicle = vehicles.find((v) => v.id === logData.vehicleId);
    const vehicleName = targetVehicle ? `${targetVehicle.name} (${targetVehicle.plateNumber})` : 'Vehicle';
    const txId = logData.transactionId || `tx_tire_${tireId}`;
    // [v7.2.4] note ?? '' so Firestore merge actually clears cleared notes
    const log: TirePressureLog = { ...logData, id: tireId, transactionId: txId, note: logData.note ?? '', createdAt: logData.createdAt || Date.now(), updatedAt: Date.now(), version: (logData.version || 0) + 1, lastEditedBy: user?.uid || 'guest' };

    // [FIX v6.1.3] Resolve wallet — if log.walletId no longer exists, fall back to first wallet.
    const resolvedTireWalletId = (log.walletId && computedWallets.some((w) => w.id === log.walletId))
      ? log.walletId
      : (computedWallets[0]?.id || '');
    log.walletId = resolvedTireWalletId;

    if (log.syncToExpense !== false && log.cost && log.cost > 0 && log.walletId) {
      const vehicleCat = categories.find((c) =>
        c.id === 'cat_vehicle' ||
        c.id === 'cat_vehicle_management' ||
        c.name.includes('ယာဉ်စီမံ') ||
        (c.nameEn && c.nameEn.toLowerCase().includes('vehicle management'))
      ) || categories.find((c) => c.type === 'expense') || categories[0];

      const tireTx: Transaction = {
        id: txId,
        type: 'expense',
        amount: log.cost,
        category: vehicleCat?.id || 'cat_vehicle',
        subCategoryId: 'sub_veh_tire',
        walletId: log.walletId,
        date: log.date,
        note: `[တာယာလေထိုး/စစ်ဆေးခ] ${vehicleName} - ${log.note || 'လေချိန်စစ်ဆေးခြင်း'}`,
        createdAt: log.createdAt || Date.now(),
        updatedAt: Date.now(),
      };

      setTransactions((prev) => {
        const next = prev.some((t) => t.id === txId)
          ? prev.map((t) => (t.id === txId ? tireTx : t))
          : [tireTx, ...prev];
        safeSetItem('ngwe_transactions', JSON.stringify(next));
        return next;
      });

      if (user?.uid) {
        const targetUid = activeWorkspaceId || user.uid;
        safeSetDoc(doc(db, 'users', targetUid, 'transactions', txId), {
          ...tireTx,
          userId: targetUid,
        }, { merge: true });
      }
    }

    const existsTire = tirePressureLogs.some((t) => t.id === log.id);
    const nextTire = existsTire ? tirePressureLogs.map((t) => (t.id === log.id ? log : t)) : [log, ...tirePressureLogs];
    setTirePressureLogs(nextTire);
    safeSetItem('ngwe_tire_logs', JSON.stringify(nextTire));

    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      safeSetDoc(doc(db, 'users', targetUid, 'tirePressureLogs', log.id), {
        ...log,
        userId: targetUid,
      }, { merge: true });
    }

    // Tire save also recalculates the odometer (fuel / maintenance already did).
    recalculateVehicleOdometer(log.vehicleId, fuelLogs, vehicleMaintenance, nextTire);

    showToast(lang === 'my' ? 'တာယာလေဖိအား မှတ်တမ်း သိမ်းဆည်းပြီးပါပြီ ✓' : 'Tire pressure log saved ✓');
  };

  const handleDeleteTirePressure = (logId: string) => {
    const logToDelete = tirePressureLogs.find((t) => t.id === logId);
    const txId = logToDelete?.transactionId || `tx_tire_${logId}`;

    markVehicleLogDeleted('tirePressureLogs', logId);

    const linkedTx = transactions.find((t) => t.id === txId);
    if (linkedTx) {
      markTxDeleted(txId);
      setTransactions((prev) => {
        const next = prev.filter((t) => t.id !== txId);
        safeSetItem('ngwe_transactions', JSON.stringify(next));
        return next;
      });
      if (user?.uid) {
        const targetUid = activeWorkspaceId || user.uid;
        safeDeleteDoc(doc(db, 'users', targetUid, 'transactions', txId));
      }
    }

    const nextTire = tirePressureLogs.filter((t) => t.id !== logId);
    setTirePressureLogs(nextTire);
    safeSetItem('ngwe_tire_logs', JSON.stringify(nextTire));
    if (logToDelete) recalculateVehicleOdometer(logToDelete.vehicleId, fuelLogs, vehicleMaintenance, nextTire);

    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      safeDeleteDoc(doc(db, 'users', targetUid, 'tirePressureLogs', logId));
    }

    showToast(lang === 'my' ? 'တာယာလေဖိအား မှတ်တမ်း ဖျက်ပြီးပါပြီ ✓' : 'Tire pressure log deleted ✓');
  };



  return {
    handleSaveVehicle,
    handleDeleteVehicle,
    handleSaveFuelLog,
    handleDeleteFuelLog,
    handleSaveMaintenance,
    handleDeleteMaintenance,
    handleSaveTirePressure,
    handleDeleteTirePressure,
  };
}
