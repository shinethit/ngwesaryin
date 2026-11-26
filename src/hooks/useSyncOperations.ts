import type { Dispatch, SetStateAction } from 'react';
import { isQuotaExhausted } from '../lib/firebase';
import { syncQueue } from '../lib/syncQueue';
import { recordSyncOperationStart, finishSyncOperation } from '../lib/syncOperationLogger';
import { isTxDeleted, unmarkTxDeleted, isWalletDeleted, isVehicleLogDeleted, getTombstonedTxIds, setTombstonedTxIds } from '../utils/deletedMarkers';
import { safeSetItem } from '../utils/storage';
import type {
  BudgetConfig,
  Category,
  Debt,
  FuelLog,
  PlanType,
  ShopContact,
  TirePressureLog,
  Transaction,
  Vehicle,
  VehicleMaintenance,
  Wallet,
} from '../types';

import {
  INITIAL_WALLETS,
  INITIAL_CATEGORIES,
  INITIAL_BUDGETS,
} from '../data/initialData';

interface UseSyncOperationsParams {
  user: { uid: string } | null;
  activeWorkspaceId: string | null | undefined;
  plan: PlanType;
  lang: 'my' | 'en';
  showToast: (msg: string) => void;
  setIsAuthModalOpen: (open: boolean) => void;
  setIsAccountModalOpen: (open: boolean) => void;
  transactions: Transaction[];
  debts: Debt[];
  computedWallets: Wallet[];
  categories: Category[];
  budgets: BudgetConfig[];
  shops: ShopContact[];
  vehicles: Vehicle[];
  fuelLogs: FuelLog[];
  vehicleMaintenance: VehicleMaintenance[];
  tirePressureLogs: TirePressureLog[];
  setTransactions: Dispatch<SetStateAction<Transaction[]>>;
  setDebts: Dispatch<SetStateAction<Debt[]>>;
  setWallets: Dispatch<SetStateAction<Wallet[]>>;
  setCategories: Dispatch<SetStateAction<Category[]>>;
  setBudgets: Dispatch<SetStateAction<BudgetConfig[]>>;
  setShops: Dispatch<SetStateAction<ShopContact[]>>;
  setVehicles: Dispatch<SetStateAction<Vehicle[]>>;
  setFuelLogs: Dispatch<SetStateAction<FuelLog[]>>;
  setVehicleMaintenance: Dispatch<SetStateAction<VehicleMaintenance[]>>;
  setTirePressureLogs: Dispatch<SetStateAction<TirePressureLog[]>>;
  cloudTxIds: Set<string>;
  setCloudTxIds: Dispatch<SetStateAction<Set<string>>>;
  syncDataToCloud: (...args: any[]) => Promise<boolean>;
  pullDataFromCloud: (wsId?: string) => Promise<any>;
  handleUpdateConfirmedCloudTxIds: (ids: string[]) => void;
}

export function useSyncOperations({
  user,
  activeWorkspaceId,
  plan,
  lang,
  showToast,
  setIsAuthModalOpen,
  setIsAccountModalOpen,
  transactions,
  debts,
  computedWallets,
  categories,
  budgets,
  shops,
  vehicles,
  fuelLogs,
  vehicleMaintenance,
  tirePressureLogs,
  setTransactions,
  setDebts,
  setWallets,
  setCategories,
  setBudgets,
  setShops,
  setVehicles,
  setFuelLogs,
  setVehicleMaintenance,
  setTirePressureLogs,
  cloudTxIds,
  setCloudTxIds,
  syncDataToCloud,
  pullDataFromCloud,
  handleUpdateConfirmedCloudTxIds,
}: UseSyncOperationsParams) {

  const handleManualSyncUp = async () => {
    if (!user) {
      setIsAccountModalOpen(true);
      return;
    }
    const ownWallets = computedWallets.filter((w) => !w.isSharedFromOther);
    const success = await syncDataToCloud(
      transactions,
      debts,
      ownWallets,
      categories,
      budgets,
      plan,
      undefined,
      shops,
      vehicles,
      fuelLogs,
      vehicleMaintenance,
      tirePressureLogs,
      false,
      cloudTxIds
    );
    if (success) {
      // [v7.6.52] Honest state: a batch with no errors is not the
      // same as everything confirmed. Pending tasks and dead-letter
      // failures are named, never hidden behind a "synced" toast.
      const pendingCount = syncQueue.getPendingCount();
      const failedItems = syncQueue.getFailedItems();
      if (failedItems.length > 0) {
        showToast(
          lang === 'my'
            ? `⚠️ Cloud သို့ ပို့ပြီး​သော်လည်း (${failedItems.length}) ခု မအောင်မြင်ပါ — Sync အခြေအနေတွင် ပြန်စစ်နိုင်ပါသည်။`
            : `⚠️ Synced with ${failedItems.length} failed item(s) — retry from the sync status view.`
        );
      } else if (pendingCount > 0) {
        showToast(
          lang === 'my'
            ? `Cloud ပေါ်သို့ ပို့ပြီးပါပြီ။ (${pendingCount}) ခု အတည်ပြုရန် ကျန်ရှိနေပါသည်။`
            : `Uploaded to Cloud. ${pendingCount} item(s) awaiting confirmation.`
        );
      } else {
        showToast(lang === 'my' ? 'Cloud ပေါ်သို့ အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ ✓' : 'Synced to Cloud successfully ✓');
      }
    }
  };

  const handleFullManualSync = async () => {
    if (!user) {
      setIsAccountModalOpen(true);
      return;
    }
    showToast(lang === 'my' ? '🔄 Cloud နှင့် အချက်အလက်များ ချိတ်ဆက်နေပါသည်...' : '🔄 Syncing data with Cloud...');
    const ownWallets = computedWallets.filter((w) => !w.isSharedFromOther);
    await syncDataToCloud(
      transactions,
      debts,
      ownWallets,
      categories,
      budgets,
      plan,
      undefined,
      shops,
      vehicles,
      fuelLogs,
      vehicleMaintenance,
      tirePressureLogs,
      false,
      cloudTxIds
    );
    await handleManualSyncDown();
    // [v7.6.52] The pull toast above says records merged; say plainly
    // when work is still pending or has failed, so the user never
    // reads "synced" while deletes are unconfirmed.
    const failedItems = syncQueue.getFailedItems();
    const pendingCount = syncQueue.getPendingCount();
    if (failedItems.length > 0) {
      showToast(
        lang === 'my'
          ? `⚠️ (${failedItems.length}) ခု မအောင်မြင်ပါ — Sync အခြေအနေတွင် ပြန်စစ်နိုင်ပါသည်။`
          : `⚠️ ${failedItems.length} item(s) failed — retry from the sync status view.`
      );
    } else if (pendingCount > 0) {
      showToast(
        lang === 'my'
          ? `(${pendingCount}) ခု အတည်ပြုရန် ကျန်ရှိနေပါသည်။`
          : `${pendingCount} item(s) awaiting confirmation.`
      );
    }
  };

  const handleForcePushAll = async (): Promise<boolean> => {
    if (!user) {
      setIsAuthModalOpen(true);
      return false;
    }
    const targetUid = activeWorkspaceId || user.uid;
    const ownWallets = computedWallets.filter((w) => !w.isSharedFromOther && !w.id.startsWith('shared_'));
    
    // 1. Target all pending or local transactions. Records with a
    // pending delete, a dead-lettered delete, a tombstone, or a local
    // deletion marker are NEVER re-upserted here — the delete path
    // owns them (see the repair-enqueue below).
    const pendingTxs = transactions.filter((t) => t && t.id && !cloudTxIds.has(t.id));
    const txsToPush = pendingTxs.filter((t) => !syncQueue.isDeleteBlocked('transactions', t.id));
    // Repair: a delete whose task was lost (older builds removed the
    // task) is re-enqueued here so the delete is retried, not dropped.
    const deletedTxs = transactions.filter(
      (t) =>
        t && t.id &&
        syncQueue.isDeleteBlocked('transactions', t.id) &&
        !syncQueue.isEntityPendingDelete('transactions', t.id) &&
        !syncQueue.isEntityInDeadLetter('transactions', t.id)
    );
    deletedTxs.forEach((tx) => syncQueue.enqueueTxDelete(tx.id, targetUid));

    if (txsToPush.length === 0) {
      const blockedCount = transactions.filter((t) => t && t.id && syncQueue.isDeleteBlocked('transactions', t.id)).length;
      if (blockedCount > 0) {
        // Retry the outstanding deletes, then report honestly about
        // any that are still unconfirmed.
        await (syncQueue.processQueue as any)({ force: true });
        const stillPending = transactions.filter(
          (t) => t && t.id && (syncQueue.isEntityPendingDelete('transactions', t.id) || syncQueue.isEntityInDeadLetter('transactions', t.id))
        ).length;
        showToast(
          lang === 'my'
            ? stillPending > 0
              ? `⚠️ ဖျက်ထားသော စာရင်း (${stillPending}) ခု ပေးပို့ရန် ကျန်ရှိနေသေးပါသည်။`
              : 'ဖျက်ထားသော စာရင်းများ Cloud သို့ ပေးပို့ပြီးပါပြီ ✓'
            : stillPending > 0
              ? `⚠️ ${stillPending} deleted records still pending sync.`
              : 'Deleted records synced to Cloud ✓'
        );
        return true;
      }
      showToast(lang === 'my' ? 'Cloud နှင့် အချက်အလက်များ ကိုက်ညီပြီးဖြစ်သည် (အသစ်တင်ရန် မရှိပါ) ✓' : 'Already in sync with Cloud (no changes to upload) ✓');
      return true;
    }

    const opId = recordSyncOperationStart('push', `Force push ${txsToPush.length} transactions to Cloud`, txsToPush.length, targetUid);

    try {
      // Enqueue to transactional queue
      syncQueue.enqueueBatch(
        txsToPush.map((tx) => ({
          entityType: 'transactions',
          entityId: tx.id,
          operation: 'upsert',
          targetUid,
          data: { ...tx, userId: targetUid },
        }))
      );

      // Process transactional queue with force option
      // FIX: cast to any because processQueue signature may not accept options
      const queueResult = await (syncQueue.processQueue as any)({ force: true });

      let httpPushedCount = 0;
      // FIX: [4]c Direct REST HTTP push backup ONLY for transactions still pending in syncQueue
      const remainingPendingTxs = txsToPush.filter((t) => syncQueue.isEntityPending('transactions', t.id));

      if (remainingPendingTxs.length > 0 && !isQuotaExhausted()) {
        try {
          const { pushTransactionsDirectHttp } = await import('../lib/directFirestoreHttp');
          const httpRes = await pushTransactionsDirectHttp(remainingPendingTxs, targetUid);
          if (httpRes.pushedCount > 0 && httpRes.succeededIds.length > 0) {
            httpPushedCount = httpRes.succeededIds.length;
            // Confirm/remove only succeededIds — and only their
            // upsert tasks ([v7.6.60] F1): a delete enqueued while
            // this REST push was in flight must survive.
            httpRes.succeededIds.forEach((sId) => syncQueue.removeUpsertOnly('transactions', sId));
            handleUpdateConfirmedCloudTxIds(httpRes.succeededIds);
          }
        } catch (httpErr) {
          console.warn('[handleForcePushAll] Direct REST push notice:', httpErr);
        }
      }

      const totalPushed = queueResult.succeeded + httpPushedCount;

      if (totalPushed > 0) {
        setCloudTxIds((prev) => {
          const next = new Set(prev);
          txsToPush.forEach((t) => {
            if (!syncQueue.isEntityPending('transactions', t.id)) {
              next.add(t.id);
            }
          });
          return next;
        });
      }

      finishSyncOperation(opId, totalPushed > 0 ? 'success' : 'failed', {
        itemCount: totalPushed,
        details: `Pushed ${totalPushed} / ${txsToPush.length} transactions (${httpPushedCount > 0 ? 'SDK Queue + REST HTTP' : 'SDK Queue'})`,
        errorMessage: totalPushed === 0 ? 'No transactions were acknowledged by server' : undefined,
      });

      const stillPendingCount = txsToPush.filter((t) => syncQueue.isEntityPending('transactions', t.id)).length;

      if (totalPushed === txsToPush.length) {
        showToast(
          lang === 'my'
            ? `Cloud Database သို့ စာရင်း (${totalPushed}) ခုလုံး အောင်မြင်စွာ ပို့ဆောင်ပြီးပါပြီ ✓`
            : `Synced all ${totalPushed} records to Cloud ✓`
        );
      } else if (totalPushed > 0) {
        showToast(
          lang === 'my'
            ? `⚠️ စာရင်း (${totalPushed}) ခု ပို့ပြီးပါပြီ။ (${stillPendingCount}) ခု ပေးပို့ရန် ကျန်ရှိနေသေးပါသည်။`
            : `⚠️ Synced ${totalPushed} records. ${stillPendingCount} pending retry.`
        );
      } else {
        showToast(
          lang === 'my'
            ? `⚠️ စာရင်းများ ပေးပို့၍ မရသေးပါ။ (${stillPendingCount}) ခု ပေးပို့ရန် ကျန်ရှိနေပါသည်။`
            : `⚠️ Could not send records to Cloud. ${stillPendingCount} remain pending.`
        );
      }
      
      // Background full sync for remaining metadata (non-blocking)
      syncDataToCloud(
        transactions,
        debts,
        ownWallets,
        categories,
        budgets,
        plan,
        targetUid,
        shops,
        vehicles,
        fuelLogs,
        vehicleMaintenance,
        tirePressureLogs,
        false,
        cloudTxIds
      ).catch(() => {});

      return queueResult.succeeded > 0 || httpPushedCount > 0;
    } catch (err) {
      console.error('Direct force push failed, falling back to full sync:', err);
      finishSyncOperation(opId, 'failed', {
        details: 'Direct force push failed',
        errorMessage: err instanceof Error ? err.message : String(err),
      });
      const ok = await syncDataToCloud(
        transactions,
        debts,
        ownWallets,
        categories,
        budgets,
        plan,
        targetUid,
        shops,
        vehicles,
        fuelLogs,
        vehicleMaintenance,
        tirePressureLogs,
        true
      );
      return ok;
    }
  };

  const handleForcePullAll = async () => {
    await handleManualSyncDown();
  };

  const handleManualSyncDown = async (overrideWorkspaceId?: string) => {
    if (!user) {
      setIsAccountModalOpen(true);
      return;
    }
    const targetUid = overrideWorkspaceId || activeWorkspaceId || user.uid;
    const opId = recordSyncOperationStart('pull', 'Pull and merge records from Cloud Firestore', 0, targetUid);
    try {
      const cloudData: any = await pullDataFromCloud(overrideWorkspaceId);
      if (cloudData) {
        let totalReceived = 0;
        if (cloudData.transactions !== undefined) {
          totalReceived += (cloudData.transactions || []).length;
          if (cloudData.transactions && Array.isArray(cloudData.transactions)) {
            const confirmedIds = cloudData.transactions
              .filter((t: any) => t && t.id && !syncQueue.isEntityPending('transactions', t.id))
              .map((t: any) => t.id);
            setCloudTxIds(new Set(confirmedIds));
          }
          // [v7.6.52] Tombstones learned from the server join the
          // local cache FIRST (union, never a clear): every later
          // push/reconcile/merge on this device then knows of the
          // delete even if the next tombstone fetch fails.
          const serverTombstones = Array.isArray(cloudData.tombstoneTxIds) ? cloudData.tombstoneTxIds : [];
          if (serverTombstones.length > 0) {
            const cached = getTombstonedTxIds();
            setTombstonedTxIds([...new Set([...cached, ...serverTombstones])]);
          }
          const cloudIds = new Set((cloudData.transactions || []).filter((t: any) => t && t.id).map((t: any) => t.id));
          const blockedTx = (id: string) => syncQueue.isDeleteBlocked('transactions', id);
          setTransactions((prevLocal) => {
            const map = new Map<string, Transaction>();
            prevLocal.forEach((t) => {
              if (!t || !t.id) return;
              // [v7.6.52] DELETE WINS: never keep a record with a
              // pending delete, a dead-lettered delete, a tombstone,
              // or a local deletion marker — the server copy (if any)
              // is stale and must not come back.
              if (blockedTx(t.id)) return;
              // [v7.6.52] Confirmed-missing prune: when the server
              // snapshot is authoritative, a local record the server
              // no longer has was deleted elsewhere. Never prune a
              // record with a pending upsert, a dead-lettered entry,
              // or a shared-wallet copy (its server home is the shared
              // doc, not this collection).
              if (cloudData.transactionsFromServer && !cloudIds.has(t.id)) {
                if (syncQueue.isEntityPending('transactions', t.id)) return;
                if (syncQueue.isEntityInDeadLetter('transactions', t.id)) return;
                if (t.walletId && t.walletId.startsWith('shared_')) return;
                // The delete elsewhere is now confirmed: drop any
                // local delete task and the local marker, then drop
                // the record (same as the live listener).
                syncQueue.remove('transactions', t.id);
                unmarkTxDeleted(t.id);
                return;
              }
              if (isTxDeleted(t.id)) return;
              map.set(t.id, t);
            });
            cloudData.transactions?.forEach((t: any) => {
              if (t && t.id && !blockedTx(t.id)) {
                // Unmark ONLY when no delete task is outstanding: a
                // tombstone fetch that raced an in-flight delete must
                // not resurrect the local record.
                if (!syncQueue.isEntityPendingDelete('transactions', t.id) && !syncQueue.isEntityInDeadLetter('transactions', t.id)) {
                  unmarkTxDeleted(t.id);
                }
                const existing = map.get(t.id);
                map.set(t.id, { ...(existing as any), ...(t as any) } as Transaction);
              }
            });
            const merged = Array.from(map.values()).sort(
              (a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()
            );
            safeSetItem('ngwe_transactions', JSON.stringify(merged));
            return merged;
          });
        }
        if (cloudData.debts !== undefined) {
          setDebts((prevLocal) => {
            const map = new Map<string, Debt>();
            prevLocal.forEach((d) => {
              if (d && d.id && !syncQueue.isDeleteBlocked('debts', d.id)) map.set(d.id, d);
            });
            cloudData.debts?.forEach((d: any) => {
              if (d && d.id && !syncQueue.isDeleteBlocked('debts', d.id)) {
                const existing = map.get(d.id);
                map.set(d.id, { ...(existing as any), ...(d as any) } as Debt);
              }
            });
            const merged = Array.from(map.values());
            safeSetItem('ngwe_debts', JSON.stringify(merged));
            return merged;
          });
        }
        if (cloudData.wallets) {
          setWallets((prevLocal) => {
            const map = new Map<string, Wallet>();
            prevLocal.forEach((w) => {
              if (w && w.id && !isWalletDeleted(w.id) && !syncQueue.isDeleteBlocked('wallets', w.id)) map.set(w.id, w);
            });
            cloudData.wallets?.forEach((w: any) => {
              if (w && w.id && !isWalletDeleted(w.id) && !syncQueue.isDeleteBlocked('wallets', w.id)) {
                const existing = map.get(w.id);
                map.set(w.id, { ...(existing as any), ...(w as any) } as Wallet);
              }
            });
            if (map.size === 0) {
              INITIAL_WALLETS.forEach((w) => {
                if (!isWalletDeleted(w.id) && !syncQueue.isDeleteBlocked('wallets', w.id)) map.set(w.id, w);
              });
            }
            const merged = Array.from(map.values());
            safeSetItem('ngwe_wallets', JSON.stringify(merged));
            return merged;
          });
        }
        if (cloudData.categories) {
          setCategories((prevLocal) => {
            const map = new Map<string, Category>();
            INITIAL_CATEGORIES.forEach((c) => map.set(c.id, c));
            prevLocal.forEach((c) => {
              if (c && c.id && !syncQueue.isDeleteBlocked('categories', c.id)) {
                const existing = map.get(c.id);
                map.set(c.id, {
                  ...(existing as any),
                  ...(c as any),
                  subCategories: (c.subCategories && c.subCategories.length > 0) ? c.subCategories : existing?.subCategories,
                } as Category);
              }
            });
            cloudData.categories?.forEach((c: any) => {
              if (c && c.id && !syncQueue.isDeleteBlocked('categories', c.id)) {
                const existing = map.get(c.id);
                map.set(c.id, {
                  ...(existing as any),
                  ...(c as any),
                  subCategories: (c.subCategories && c.subCategories.length > 0) ? c.subCategories : existing?.subCategories,
                } as Category);
              }
            });
            const merged = Array.from(map.values());
            safeSetItem('ngwe_categories', JSON.stringify(merged));
            return merged;
          });
        }
        if (cloudData.budgets) {
          setBudgets((prevLocal) => {
            const map = new Map<string, BudgetConfig>();
            INITIAL_BUDGETS.forEach((b) => map.set(b.categoryId, b));
            prevLocal.forEach((b) => { if (b && b.categoryId && !syncQueue.isDeleteBlocked('budgets', b.categoryId)) map.set(b.categoryId, b); });
            (cloudData.budgets as any[])?.forEach((b: any) => {
              if (b && b.categoryId && !syncQueue.isDeleteBlocked('budgets', b.categoryId)) {
                const existing = map.get(b.categoryId);
                map.set(b.categoryId, { ...(existing as any), ...(b as any) } as BudgetConfig);
              }
            });
            const merged = Array.from(map.values());
            safeSetItem('ngwe_budgets', JSON.stringify(merged));
            return merged;
          });
        }
        if (cloudData.shops) {
          setShops((prevLocal) => {
            const map = new Map<string, ShopContact>();
            prevLocal.forEach((s) => {
              if (s && s.id && !syncQueue.isDeleteBlocked('shops', s.id)) map.set(s.id, s);
            });
            cloudData.shops?.forEach((s: any) => {
              if (s && s.id && !syncQueue.isDeleteBlocked('shops', s.id)) {
                const existing = map.get(s.id);
                map.set(s.id, { ...(existing as any), ...(s as any) } as ShopContact);
              }
            });
            const merged = Array.from(map.values());
            safeSetItem('ngwe_shops', JSON.stringify(merged));
            return merged;
          });
        }
        if (cloudData.vehicles) {
          setVehicles((prevLocal) => {
            const map = new Map<string, Vehicle>();
            prevLocal.forEach((v) => { if (v && v.id && !syncQueue.isDeleteBlocked('vehicles', v.id)) map.set(v.id, v); });
            cloudData.vehicles?.forEach((v: any) => {
              if (v && v.id && !syncQueue.isDeleteBlocked('vehicles', v.id)) {
                const existing = map.get(v.id);
                map.set(v.id, { ...(existing as any), ...(v as any) } as Vehicle);
              }
            });
            const merged = Array.from(map.values());
            safeSetItem('ngwe_vehicles', JSON.stringify(merged));
            return merged;
          });
        }
        if (cloudData.fuelLogs) {
          setFuelLogs((prevLocal) => {
            const map = new Map<string, FuelLog>();
            prevLocal.forEach((f) => { if (f && f.id && !syncQueue.isDeleteBlocked('fuelLogs', f.id)) map.set(f.id, f); });
            cloudData.fuelLogs?.forEach((f: any) => {
              if (f && f.id && !isVehicleLogDeleted('fuelLogs', f.id) && !syncQueue.isDeleteBlocked('fuelLogs', f.id)) {
                const existing = map.get(f.id);
                map.set(f.id, { ...(existing as any), ...(f as any) } as FuelLog);
              }
            });
            const merged = Array.from(map.values());
            safeSetItem('ngwe_fuel_logs', JSON.stringify(merged));
            return merged;
          });
        }
        if (cloudData.maintenanceLogs) {
          setVehicleMaintenance((prevLocal) => {
            const map = new Map<string, VehicleMaintenance>();
            prevLocal.forEach((m) => { if (m && m.id && !syncQueue.isDeleteBlocked('vehicleMaintenance', m.id)) map.set(m.id, m); });
            cloudData.maintenanceLogs?.forEach((m: any) => {
              if (m && m.id && !isVehicleLogDeleted('vehicleMaintenance', m.id) && !syncQueue.isDeleteBlocked('vehicleMaintenance', m.id)) {
                const existing = map.get(m.id);
                map.set(m.id, { ...(existing as any), ...(m as any) } as VehicleMaintenance);
              }
            });
            const merged = Array.from(map.values());
            safeSetItem('ngwe_vehicle_maintenance', JSON.stringify(merged));
            return merged;
          });
        }
        if (cloudData.tireLogs) {
          setTirePressureLogs((prevLocal) => {
            const map = new Map<string, TirePressureLog>();
            prevLocal.forEach((t) => { if (t && t.id && !syncQueue.isDeleteBlocked('tirePressureLogs', t.id)) map.set(t.id, t); });
            cloudData.tireLogs?.forEach((t: any) => {
              if (t && t.id && !isVehicleLogDeleted('tirePressureLogs', t.id) && !syncQueue.isDeleteBlocked('tirePressureLogs', t.id)) {
                const existing = map.get(t.id);
                map.set(t.id, { ...(existing as any), ...(t as any) } as TirePressureLog);
              }
            });
            const merged = Array.from(map.values());
            safeSetItem('ngwe_tire_logs', JSON.stringify(merged));
            return merged;
          });
        }
        finishSyncOperation(opId, cloudData ? 'success' : 'failed', {
          itemCount: totalReceived,
          details: cloudData ? `Pulled ${totalReceived} records from Cloud Firestore` : 'Failed to pull data',
        });
        showToast(lang === 'my' ? 'Cloud မှ ဒေတာများကို ပေါင်းစပ်ရယူပြီးပါပြီ ✓' : 'Merged records from Cloud ✓');
      } else {
        finishSyncOperation(opId, 'failed', {
          details: 'No response from Cloud Firestore',
          errorMessage: 'Network or database error during pull',
        });
      }
    } catch (pullErr: any) {
      finishSyncOperation(opId, 'failed', {
        details: 'Pull failed with error',
        errorMessage: pullErr?.message || String(pullErr),
      });
    }
  };
  return {
    handleManualSyncUp,
    handleFullManualSync,
    handleForcePushAll,
    handleForcePullAll,
    handleManualSyncDown,
  };
}
