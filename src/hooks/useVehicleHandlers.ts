import type { Dispatch, SetStateAction } from 'react';
import { deleteField, doc, updateDoc } from 'firebase/firestore';
import { db, safeSetDoc, safeDeleteDoc } from '../lib/firebase';
import { safeSetItem } from '../utils/storage';
import { markVehicleLogDeleted, markTxDeleted } from '../utils/deletedMarkers';
import type {
  Category,
  FuelLog,
  Transaction,
  TransactionItem,
  TirePressureLog,
  Vehicle,
  VehicleMaintenance,
  Wallet,
} from '../types';
import {
  applyLaborCostToRowGroups,
  groupServiceRowsByType,
  resolvePerTypeTitle,
  resolveVehicleServiceSubCategory,
} from '../utils/vehicleServiceRows';
// [v7.6.45] Single vehicle-name rule (no "Starex ()" when the plate
// is empty) + the shared fuel auto-note builder.
import { buildFuelAutoNote, formatVehicleDisplayName } from '../utils/vehicleNames';

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
    // [v7.5.60 D-N9] Stamp the starting odometer once, at creation — it is
    // the fallback when all logs are later deleted. Edits never overwrite
    // an existing value.
    const isNewVehicle = !vehicles.some((v) => v.id === vehId);
    const fullVehicle: Vehicle = {
      ...vehicle,
      id: vehId,
      initialOdometer:
        vehicle.initialOdometer ?? (isNewVehicle ? vehicle.currentOdometer : undefined),
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
    // [v7.5.60 D-N9] No logs left: fall back to the starting odometer
    // (when known) instead of keeping a reading no log supports — and
    // never drop below the starting odometer either (backfilled old
    // logs must not rewind the vehicle). Vehicles created before this
    // version have no initialOdometer, so they keep the old behaviour.
    if (odos.length === 0) {
      const fallback = targetVehicle.initialOdometer ?? targetVehicle.currentOdometer;
      if (fallback !== targetVehicle.currentOdometer) {
        handleSaveVehicle({ ...targetVehicle, currentOdometer: fallback });
      }
      return;
    }
    const newOdo = Math.max(targetVehicle.initialOdometer ?? 0, ...odos);
    if (newOdo !== targetVehicle.currentOdometer) {
      handleSaveVehicle({ ...targetVehicle, currentOdometer: newOdo });
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    const target = vehicles.find((v) => v.id === vehicleId);
    const activeCount = vehicles.filter((v) => v.isActive !== false).length;
    // [v7.5.55 C6] Sole-vehicle backstop: the last ACTIVE vehicle can never
    // be deleted from any path (VehiclesView + AddVehicleModal also guard it).
    if (target && target.isActive !== false && activeCount <= 1) {
      showToast(
        lang === 'my'
          ? 'နောက်ဆုံးကျန်သော ယာဉ်ကို ဖျက်၍ မရပါ — အနည်းဆုံး ယာဉ် ၁ စီး ရှိရပါမည်'
          : 'Cannot delete the last vehicle — at least one vehicle is required'
      );
      return;
    }

    // [v7.5.55 C6] Delete the vehicle AND all its logs AND linked expense
    // transactions (previously only the vehicle doc was removed and the
    // logs/transactions were orphaned in Dashboard/wallet totals forever).
    // Deletion markers are written first so a cloud snapshot cannot
    // resurrect anything.
    const fLogs = fuelLogs.filter((f) => f.vehicleId === vehicleId);
    const mLogs = vehicleMaintenance.filter((m) => m.vehicleId === vehicleId);
    const tLogs = tirePressureLogs.filter((t) => t.vehicleId === vehicleId);
    const txIds = new Set<string>();
    fLogs.forEach((f) => txIds.add(f.transactionId || `tx_fuel_${f.id}`));
    mLogs.forEach((m) => txIds.add(m.transactionId || `tx_maint_${m.id}`));
    tLogs.forEach((t) => txIds.add(t.transactionId || `tx_tire_${t.id}`));
    const linkedTxCount = transactions.filter((t) => txIds.has(t.id)).length;

    txIds.forEach((id) => markTxDeleted(id));
    fLogs.forEach((f) => markVehicleLogDeleted('fuelLogs', f.id));
    mLogs.forEach((m) => markVehicleLogDeleted('vehicleMaintenance', m.id));
    tLogs.forEach((t) => markVehicleLogDeleted('tirePressureLogs', t.id));

    if (linkedTxCount > 0) {
      setTransactions((prev) => {
        const next = prev.filter((t) => !txIds.has(t.id));
        safeSetItem('ngwe_transactions', JSON.stringify(next));
        return next;
      });
    }
    const nextFuel = fuelLogs.filter((f) => f.vehicleId !== vehicleId);
    setFuelLogs(nextFuel);
    safeSetItem('ngwe_fuel_logs', JSON.stringify(nextFuel));
    const nextMaint = vehicleMaintenance.filter((m) => m.vehicleId !== vehicleId);
    setVehicleMaintenance(nextMaint);
    safeSetItem('ngwe_vehicle_maintenance', JSON.stringify(nextMaint));
    const nextTire = tirePressureLogs.filter((t) => t.vehicleId !== vehicleId);
    setTirePressureLogs(nextTire);
    safeSetItem('ngwe_tire_logs', JSON.stringify(nextTire));

    setVehicles((prev) => {
      const next = prev.filter((v) => v.id !== vehicleId);
      safeSetItem('ngwe_vehicles', JSON.stringify(next));
      return next;
    });

    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      const results = await Promise.all([
        safeDeleteDoc(doc(db, 'users', targetUid, 'vehicles', vehicleId)),
        ...fLogs.map((f) => safeDeleteDoc(doc(db, 'users', targetUid, 'fuelLogs', f.id))),
        ...mLogs.map((m) => safeDeleteDoc(doc(db, 'users', targetUid, 'vehicleMaintenance', m.id))),
        ...tLogs.map((t) => safeDeleteDoc(doc(db, 'users', targetUid, 'tirePressureLogs', t.id))),
        ...Array.from(txIds).map((id) => safeDeleteDoc(doc(db, 'users', targetUid, 'transactions', id))),
      ]);
      if (results.includes(false)) {
        showToast(
          lang === 'my'
            ? 'ယာဉ်ကို ဖျက်ပြီးသော်လည်း cloud မှ အချို့မှတ်တမ်းများ ဖျက်မရခဲ့ပါ — အင်တာနက်ရချိန် ပြန်စစ်ပေးပါ'
            : 'Vehicle deleted locally, but some cloud records could not be deleted — please check when back online'
        );
        return;
      }
    }

    showToast(
      lang === 'my'
        ? `ယာဉ်ကို ဖျက်လိုက်ပါပြီ ✓ (ဆီ ${fLogs.length} • ပြုပြင် ${mLogs.length} • တာယာ ${tLogs.length} • ငွေစာရင်း ${linkedTxCount})`
        : `Vehicle removed ✓ (fuel ${fLogs.length} • maintenance ${mLogs.length} • tire ${tLogs.length} • expenses ${linkedTxCount})`
    );
  };

  // [v7.5.55 C7] Remove a previously linked expense transaction when an
  // edit turns sync off or the cost becomes 0 — otherwise the stale
  // expense stays in Dashboard/wallet totals forever.
  const removeLinkedTransaction = (txId: string) => {
    const linkedTx = transactions.find((t) => t.id === txId);
    if (!linkedTx) return;
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
  };

  const handleSaveFuelLog = (logData: FuelLog) => {
    const logId = logData.id || `fuel_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const targetVehicle = vehicles.find((v) => v.id === logData.vehicleId);
    const vehicleName = formatVehicleDisplayName(targetVehicle);
    const txId = logData.transactionId || `tx_fuel_${logId}`;
    // [v7.2.4] note ?? '' so Firestore merge actually clears cleared notes
    const log: FuelLog = { ...logData, id: logId, transactionId: txId, note: logData.note ?? '', createdAt: logData.createdAt || Date.now(), updatedAt: Date.now(), version: (logData.version || 0) + 1, lastEditedBy: user?.uid || 'guest' };

    // [FIX v6.1.3] Resolve wallet — if log.walletId no longer exists, fall back to first wallet.
    const resolvedWalletId = (log.walletId && computedWallets.some((w) => w.id === log.walletId))
      ? log.walletId
      : (computedWallets[0]?.id || '');
    log.walletId = resolvedWalletId;

    // [v7.5.55 C7] Expense is written only when sync is on and cost > 0.
    // Otherwise any previously linked expense must be REMOVED, and the
    // toast must not claim an expense was written when it was not.
    const fuelExpenseWritten = log.syncToExpense !== false && log.totalCost > 0 && log.walletId;
    if (fuelExpenseWritten) {
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
        // [v7.6.45] Shared builder — same string, explicit grouping.
        note: log.note
          ? log.note
          : buildFuelAutoNote({ vehicleName, liters: log.liters, pricePerLiter: log.pricePerLiter, gasStation: log.gasStation }) || `[ဆီထည့်စရိတ်] ${vehicleName}`,
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
    } else {
      removeLinkedTransaction(txId);
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

    showToast(
      fuelExpenseWritten
        ? lang === 'my'
          ? 'ဆီထည့်မှတ်တမ်းနှင့် ထွက်ငွေစာရင်း သိမ်းဆည်းပြီးပါပြီ ✓'
          : 'Fuel log & expense recorded ✓'
        : lang === 'my'
        ? 'ဆီထည့်မှတ်တမ်း သိမ်းဆည်းပြီးပါပြီ ✓ (ထွက်ငွေစာရင်း မသွင်းထားပါ)'
        : 'Fuel log saved ✓ (no expense recorded)'
    );
  };

  const handleDeleteFuelLog = (logId: string) => {
    const logToDelete = fuelLogs.find((f) => f.id === logId);
    const txId = logToDelete?.transactionId || `tx_fuel_${logId}`;

    // ဖျက်လိုက်တဲ့ မှတ်တမ်းကို cloud snapshot က ပြန်ထည့်မလာစေဖို့ မှတ်ထားပါတယ်
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

  // [v7.5.93] `items` travels on the save payload from
  // AddMaintenanceModal (VehicleMaintenance itself has no `items`
  // field — the modal attaches the rows, the handler consumes them,
  // and no maintenance record ever stores them).
  const handleSaveMaintenance = (maintData: VehicleMaintenance & { items?: TransactionItem[] }) => {
    const { items: incomingItems, ...maintInput } = maintData;
    const maintId = maintInput.id || `maint_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const targetVehicle = vehicles.find((v) => v.id === maintInput.vehicleId);
    const vehicleName = formatVehicleDisplayName(targetVehicle);
    const txId = maintInput.transactionId || `tx_maint_${maintId}`;
    // [v7.5.93] Multi-row visit: group the valid rows by their OWN
    // service type (same filter as the modal — name required, qty >
    // 0, zero-price rows kept). A licence visit has no rows, so its
    // items are ignored and the old single-record path runs. No rows
    // (old-style) → the exact old single-record behavior below.
    // [v7.6.49] Visit-level labor folds into the FIRST per-type
    // group (see applyLaborCostToRowGroups) so the groups still sum
    // to the visit total and the fee is never duplicated.
    const labor = Math.max(0, Number(maintInput.laborCost) || 0);
    const rowGroups = applyLaborCostToRowGroups(
      maintInput.serviceType === 'license_renewal'
        ? []
        : groupServiceRowsByType(incomingItems || [], maintInput.serviceType),
      labor,
    );
    const hasRows = rowGroups.length > 0;
    const rowsTotal = rowGroups.reduce((s, g) => s + g.cost, 0);
    const visitCost = hasRows ? rowsTotal : maintInput.cost;
    // Rows stamped with their group type (a row without one belongs
    // to the group it was filed under) — these ARE the tx items.
    const txItems: TransactionItem[] | undefined = hasRows
      ? rowGroups.flatMap((g) => g.rows.map((r) => ({ ...r, serviceType: g.serviceType })))
      : undefined;
    // [v7.2.4] note ?? '' so Firestore merge actually clears cleared notes
    const maint: VehicleMaintenance = { ...maintInput, id: maintId, transactionId: txId, cost: visitCost, note: maintInput.note ?? '', createdAt: maintInput.createdAt || Date.now(), updatedAt: Date.now(), version: (maintInput.version || 0) + 1, lastEditedBy: user?.uid || 'guest' };

    // [FIX v6.1.3] Resolve wallet — if maint.walletId no longer exists, fall back to first wallet.
    const resolvedMaintWalletId = (maint.walletId && computedWallets.some((w) => w.id === maint.walletId))
      ? maint.walletId
      : (computedWallets[0]?.id || '');
    maint.walletId = resolvedMaintWalletId;

    // [v7.5.55 C7] See handleSaveFuelLog — sync off / cost 0 removes the
    // previously linked expense instead of leaving it stale.
    const maintExpenseWritten = maint.syncToExpense !== false && maint.cost > 0 && maint.walletId;
    if (maintExpenseWritten) {
      const vehicleCat = categories.find((c) =>
        c.id === 'cat_vehicle' ||
        c.id === 'cat_vehicle_management' ||
        c.name.includes('ယာဉ်စီမံ') ||
        (c.nameEn && c.nameEn.toLowerCase().includes('vehicle management'))
      ) || categories.find((c) => c.type === 'expense') || categories[0];

      // [v7.5.93] Sub-category alignment (was hard-coded
      // sub_veh_maintenance for EVERY type): tires → sub_veh_tire,
      // engine_oil → sub_veh_parts, else sub_veh_maintenance. The
      // modal path never picks a sub-category, so none is passed.
      // [v7.5.93] A previous save of THIS tx may have carried items
      // (multi-row visit later re-saved without rows, e.g. switched
      // to licence) — cleanForFirestore strips `undefined`, so a
      // missing key would leave the stale array in Firestore; write
      // an explicit empty array to clear it.
      const prevTx = transactions.find((t) => t.id === txId);
      const maintTx: Transaction = {
        id: txId,
        type: 'expense',
        amount: maint.cost,
        category: vehicleCat?.id || 'cat_vehicle',
        subCategoryId: resolveVehicleServiceSubCategory(maint.serviceType),
        walletId: maint.walletId,
        date: maint.date,
        // [v7.2.3] Preserve user note as-is; fall back to auto summary.
        note: maint.note
          ? maint.note
          : `[ယာဉ်ပြုပြင်ထိန်းသိမ်းစရိတ်] ${vehicleName} - ${maint.serviceType}: ${maint.title}${maint.workshopName ? ` (${maint.workshopName})` : ''}`,
        ...(txItems && txItems.length > 0
          ? { items: txItems }
          : prevTx?.items && prevTx.items.length > 0
            ? { items: [] }
            : {}),
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
    } else {
      removeLinkedTransaction(txId);
    }

    // [v7.5.93] Old records of THIS visit: every record sharing this
    // transactionId, plus the edited record itself when it carries no
    // link (pre-7.5.93 records may not). Only ever this visit's
    // records — nothing else is touched.
    const oldLinked = vehicleMaintenance.filter((m) => m.transactionId === txId || m.id === maintId);
    const hasSiblingRecords = oldLinked.some((m) => m.id !== maintId);
    if (hasRows || hasSiblingRecords) {
      // Multi-row save, or a re-save that drops sibling records
      // (e.g. a multi-row visit switched to licence): delete every
      // old record of this visit and recreate — one record per
      // DISTINCT row service type, each costing only its own type's
      // rows. Same delete pattern as useTransactionHandlers'
      // multi-row edit (state filter + markVehicleLogDeleted +
      // safeDeleteDoc per record).
      const newRecords: VehicleMaintenance[] = hasRows
        ? rowGroups.map((g, gi) => ({
            id: `maint_${Date.now()}_${gi}`,
            vehicleId: maint.vehicleId,
            vehicleName: maint.vehicleName,
            date: maint.date,
            odometer: maint.odometer,
            serviceType: g.serviceType,
            // The modal's note is the extra note (same as the
            // TransactionModal path, which passes the tx note).
            title: resolvePerTypeTitle(maint.title, maint.serviceType, g.serviceType, g.rows, maint.note ?? ''),
            cost: g.cost,
            // [v7.6.49] Labor rides on the first group's record only
            // (the helper put the whole fee there); other groups
            // carry no laborCost key at all.
            ...(g.laborCost ? { laborCost: g.laborCost } : {}),
            sparePartBrand: maint.sparePartBrand,
            workshopName: maint.workshopName,
            expectedLifespanKm: maint.expectedLifespanKm,
            expectedLifespanDays: maint.expectedLifespanDays,
            lastReplacedDate: maint.date,
            lastReplacedOdometer: maint.odometer,
            syncToExpense: maint.syncToExpense,
            transactionId: txId,
            walletId: maint.walletId,
            note: maint.note,
            userId: maint.userId,
            createdAt: maint.createdAt,
            updatedAt: Date.now(),
            version: maint.version,
            lastEditedBy: maint.lastEditedBy,
          }))
        : [maint];
      const newIds = new Set(newRecords.map((m) => m.id));
      const nextMaint = [
        ...newRecords,
        ...vehicleMaintenance.filter((m) => m.transactionId !== txId && m.id !== maintId),
      ];
      setVehicleMaintenance(nextMaint);
      safeSetItem('ngwe_vehicle_maintenance', JSON.stringify(nextMaint));

      const targetUid = user?.uid ? activeWorkspaceId || user.uid : null;
      // Delete only old records that are NOT reused by the new save
      // (the single-record re-save reuses maintId — deleting it first
      // would race the set below and could lose the record).
      for (const old of oldLinked) {
        if (newIds.has(old.id)) continue;
        markVehicleLogDeleted('vehicleMaintenance', old.id);
        if (targetUid) safeDeleteDoc(doc(db, 'users', targetUid, 'vehicleMaintenance', old.id));
      }
      if (targetUid) {
        for (const m of newRecords) {
          safeSetDoc(doc(db, 'users', targetUid, 'vehicleMaintenance', m.id), {
            ...m,
            userId: targetUid,
          }, { merge: true });
        }
      }

      recalculateVehicleOdometer(maint.vehicleId, fuelLogs, nextMaint, tirePressureLogs);
    } else {
      // No rows, no siblings — the exact old single-record behavior.
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
    }

    // [v7.6.49] Clearing labor must actively delete the field: merge
    // writes omit undefined keys (cleanForFirestore), so a dropped
    // laborCost would resurrect from Firestore on the next pull.
    // Only the re-saved single record can carry a stale value — the
    // multi-row branch deletes every old record and recreates fresh
    // ones. Best-effort raw updateDoc + deleteField(), the same
    // pattern as AdminPanel's code unmark (never safeUpdateDoc —
    // cleanForFirestore mangles the sentinel).
    if (!hasRows && (vehicleMaintenance.find((m) => m.id === maintId)?.laborCost || 0) > 0 && labor === 0 && user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      updateDoc(doc(db, 'users', targetUid, 'vehicleMaintenance', maintId), {
        laborCost: deleteField(),
      }).catch(() => {});
    }

    showToast(lang === 'my' ? 'ပြုပြင်ထိန်းသိမ်းမှု မှတ်တမ်း သိမ်းဆည်းပြီးပါပြီ ✓' : 'Maintenance record saved ✓');
  };

  const handleDeleteMaintenance = (maintId: string) => {
    const maintToDelete = vehicleMaintenance.find((m) => m.id === maintId);
    const txId = maintToDelete?.transactionId || `tx_maint_${maintId}`;

    markVehicleLogDeleted('vehicleMaintenance', maintId);

    const linkedTx = transactions.find((t) => t.id === txId);
    if (linkedTx) {
      // [v7.5.93] One visit can now own several records sharing ONE
      // transaction. Deleting a single card must NOT delete the shared
      // tx while sibling records remain — shrink the tx to the
      // siblings' costs (and keep only their rows) instead.
      const siblings = vehicleMaintenance.filter((m) => m.transactionId === txId && m.id !== maintId);
      if (siblings.length === 0) {
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
      } else {
        const remainingTypes = new Set(siblings.map((m) => m.serviceType));
        // Rows without a type belong to the visit's main type, which
        // cannot be attributed to one record — keep them rather than
        // drop a row that may belong to a remaining record.
        const remainingItems = (linkedTx.items || []).filter(
          (r) => !r.serviceType || remainingTypes.has(r.serviceType)
        );
        const updatedTx: Transaction = {
          ...linkedTx,
          amount: siblings.reduce((s, m) => s + (Number(m.cost) || 0), 0),
          items: remainingItems,
          updatedAt: Date.now(),
        };
        setTransactions((prev) => {
          const next = prev.map((t) => (t.id === txId ? updatedTx : t));
          safeSetItem('ngwe_transactions', JSON.stringify(next));
          return next;
        });
        if (user?.uid) {
          const targetUid = activeWorkspaceId || user.uid;
          safeSetDoc(doc(db, 'users', targetUid, 'transactions', txId), {
            ...updatedTx,
            userId: targetUid,
          }, { merge: true });
        }
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
    const vehicleName = formatVehicleDisplayName(targetVehicle);
    const txId = logData.transactionId || `tx_tire_${tireId}`;
    // [v7.2.4] note ?? '' so Firestore merge actually clears cleared notes
    const log: TirePressureLog = { ...logData, id: tireId, transactionId: txId, note: logData.note ?? '', createdAt: logData.createdAt || Date.now(), updatedAt: Date.now(), version: (logData.version || 0) + 1, lastEditedBy: user?.uid || 'guest' };

    // [FIX v6.1.3] Resolve wallet — if log.walletId no longer exists, fall back to first wallet.
    const resolvedTireWalletId = (log.walletId && computedWallets.some((w) => w.id === log.walletId))
      ? log.walletId
      : (computedWallets[0]?.id || '');
    log.walletId = resolvedTireWalletId;

    // [v7.5.55 C7] See handleSaveFuelLog — sync off / cost 0 removes the
    // previously linked expense instead of leaving it stale.
    const tireExpenseWritten = log.syncToExpense !== false && log.cost && log.cost > 0 && log.walletId;
    if (tireExpenseWritten) {
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
    } else {
      removeLinkedTransaction(txId);
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

    // တာယာမှတ်တမ်း သိမ်းချိန်မှာလည်း မိုင်တာ ပြန်တွက်ပေးပါတယ် (ဆီ/ပြုပြင်မှတ်တမ်းတွေလိုပဲ)
    // [v7.5.60 D-N8] Once only — the second identical call was a stray duplicate.
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
