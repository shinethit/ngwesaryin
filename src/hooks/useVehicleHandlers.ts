import type { Dispatch, SetStateAction } from 'react';
import { doc } from 'firebase/firestore';
import { db, safeSetDoc, safeDeleteDoc } from '../lib/firebase';
import { safeSetItem } from '../utils/storage';
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
    const log: FuelLog = { ...logData, id: logId, transactionId: txId, createdAt: logData.createdAt || Date.now(), updatedAt: Date.now() };

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
        note: `[ဆီထည့်စရိတ်] ${vehicleName} - ${log.liters.toLocaleString()} L @ ${log.pricePerLiter.toLocaleString()} Ks ${log.gasStation ? `(${log.gasStation})` : ''} ${log.odometer ? `[${log.odometer.toLocaleString()} km]` : ''}`,
        createdAt: log.createdAt || Date.now(),
        updatedAt: Date.now(),
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

    setFuelLogs((prev) => {
      const exists = prev.some((f) => f.id === log.id);
      const next = exists ? prev.map((f) => (f.id === log.id ? log : f)) : [log, ...prev];
      safeSetItem('ngwe_fuel_logs', JSON.stringify(next));
      return next;
    });

    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      safeSetDoc(doc(db, 'users', targetUid, 'fuelLogs', log.id), {
        ...log,
        userId: targetUid,
      }, { merge: true });
    }

    if (targetVehicle && log.odometer > (targetVehicle.currentOdometer || 0)) {
      handleSaveVehicle({ ...targetVehicle, currentOdometer: log.odometer });
    }

    showToast(lang === 'my' ? 'ဆီထည့်မှတ်တမ်းနှင့် ထွက်ငွေစာရင်း သိမ်းဆည်းပြီးပါပြီ ✓' : 'Fuel log & expense recorded ✓');
  };

  const handleDeleteFuelLog = (logId: string) => {
    const logToDelete = fuelLogs.find((f) => f.id === logId);
    const txId = logToDelete?.transactionId || `tx_fuel_${logId}`;

    const linkedTx = transactions.find((t) => t.id === txId);
    if (linkedTx) {
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

    setFuelLogs((prev) => {
      const next = prev.filter((f) => f.id !== logId);
      safeSetItem('ngwe_fuel_logs', JSON.stringify(next));
      return next;
    });

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
    const maint: VehicleMaintenance = { ...maintData, id: maintId, transactionId: txId, createdAt: maintData.createdAt || Date.now(), updatedAt: Date.now() };

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
        note: `[ယာဉ်ပြုပြင်ထိန်းသိမ်းစရိတ်] ${vehicleName} - ${maint.serviceType}: ${maint.title} ${maint.workshopName ? `(${maint.workshopName})` : ''}`,
        createdAt: maint.createdAt || Date.now(),
        updatedAt: Date.now(),
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

    setVehicleMaintenance((prev) => {
      const exists = prev.some((m) => m.id === maint.id);
      const next = exists ? prev.map((m) => (m.id === maint.id ? maint : m)) : [maint, ...prev];
      safeSetItem('ngwe_vehicle_maintenance', JSON.stringify(next));
      return next;
    });

    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      safeSetDoc(doc(db, 'users', targetUid, 'vehicleMaintenance', maint.id), {
        ...maint,
        userId: targetUid,
      }, { merge: true });
    }

    if (targetVehicle && maint.odometer > (targetVehicle.currentOdometer || 0)) {
      handleSaveVehicle({ ...targetVehicle, currentOdometer: maint.odometer });
    }

    showToast(lang === 'my' ? 'ပြုပြင်ထိန်းသိမ်းမှု မှတ်တမ်း သိမ်းဆည်းပြီးပါပြီ ✓' : 'Maintenance record saved ✓');
  };

  const handleDeleteMaintenance = (maintId: string) => {
    const maintToDelete = vehicleMaintenance.find((m) => m.id === maintId);
    const txId = maintToDelete?.transactionId || `tx_maint_${maintId}`;

    const linkedTx = transactions.find((t) => t.id === txId);
    if (linkedTx) {
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

    setVehicleMaintenance((prev) => {
      const next = prev.filter((m) => m.id !== maintId);
      safeSetItem('ngwe_vehicle_maintenance', JSON.stringify(next));
      return next;
    });

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
    const log: TirePressureLog = { ...logData, id: tireId, transactionId: txId, createdAt: logData.createdAt || Date.now(), updatedAt: Date.now() };

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

    setTirePressureLogs((prev) => {
      const exists = prev.some((t) => t.id === log.id);
      const next = exists ? prev.map((t) => (t.id === log.id ? log : t)) : [log, ...prev];
      safeSetItem('ngwe_tire_logs', JSON.stringify(next));
      return next;
    });

    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      safeSetDoc(doc(db, 'users', targetUid, 'tirePressureLogs', log.id), {
        ...log,
        userId: targetUid,
      }, { merge: true });
    }

    showToast(lang === 'my' ? 'တာယာလေဖိအား မှတ်တမ်း သိမ်းဆည်းပြီးပါပြီ ✓' : 'Tire pressure log saved ✓');
  };

  const handleDeleteTirePressure = (logId: string) => {
    const logToDelete = tirePressureLogs.find((t) => t.id === logId);
    const txId = logToDelete?.transactionId || `tx_tire_${logId}`;

    const linkedTx = transactions.find((t) => t.id === txId);
    if (linkedTx) {
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

    setTirePressureLogs((prev) => {
      const next = prev.filter((t) => t.id !== logId);
      safeSetItem('ngwe_tire_logs', JSON.stringify(next));
      return next;
    });

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
