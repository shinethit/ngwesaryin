import { useState, useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction, MutableRefObject } from 'react';
import { doc, collection, onSnapshot } from 'firebase/firestore';
import {
  db,
  safeSetDoc,
  safeDeleteDoc,
  handleFirestoreError,
  OperationType,
  isQuotaExhausted,
} from '../lib/firebase';
import { safeGetItem, safeSetItem } from '../utils/storage';
import { syncQueue } from '../lib/syncQueue';
import { areArraysEqual } from '../utils/syncGuards';
import { mergeById, mergeByKey } from '../utils/mergeById';
import {
  markTxDeleted,
  unmarkTxDeleted,
  isTxDeleted,
  markWalletDeleted,
  isWalletDeleted,
} from '../utils/deletedMarkers';
import type {
  BudgetConfig,
  Category,
  Debt,
  FuelLog,
  PlanType,
  ShopContact,
  Transaction,
  TirePressureLog,
  Vehicle,
  VehicleMaintenance,
  Wallet,
} from '../types';

import { INITIAL_WALLETS } from '../data/initialData';

interface UseCloudListenersParams {
  user: { uid: string } | null;
  activeWorkspaceId: string | null | undefined;
  plan: PlanType;
  // Snapshot values (read only at mount-time; used only in initial-empty sync)
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
  // Setters
  setTransactions: Dispatch<SetStateAction<Transaction[]>>;
  setWallets: Dispatch<SetStateAction<Wallet[]>>;
  setDebts: Dispatch<SetStateAction<Debt[]>>;
  setCategories: Dispatch<SetStateAction<Category[]>>;
  setBudgets: Dispatch<SetStateAction<BudgetConfig[]>>;
  setShops: Dispatch<SetStateAction<ShopContact[]>>;
  setVehicles: Dispatch<SetStateAction<Vehicle[]>>;
  setFuelLogs: Dispatch<SetStateAction<FuelLog[]>>;
  setVehicleMaintenance: Dispatch<SetStateAction<VehicleMaintenance[]>>;
  setTirePressureLogs: Dispatch<SetStateAction<TirePressureLog[]>>;
  setCloudTxIds: Dispatch<SetStateAction<Set<string>>>;
  // Auth context
  syncDataToCloud: (...args: any[]) => Promise<boolean>;
  // Refs shared with App.tsx (owned there, used here)
  debtLocalWriteRef: MutableRefObject<Map<string, number>>;
  walletsLatestRef: MutableRefObject<Wallet[]>;
}

/**
 * Cloud listeners — extracted from App.tsx (Phase 8 refactor).
 * Subscribes to 10 Firestore collections (staggered by 200ms).
 */
export function useCloudListeners({
  user,
  activeWorkspaceId,
  plan,
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
  setWallets,
  setDebts,
  setCategories,
  setBudgets,
  setShops,
  setVehicles,
  setFuelLogs,
  setVehicleMaintenance,
  setTirePressureLogs,
  setCloudTxIds,
  syncDataToCloud,
  debtLocalWriteRef,
  walletsLatestRef,
}: UseCloudListenersParams) {
  // NOTE: isCloudLoaded, hasInitialSyncedRef, isRemoteUpdateRef are declared
  //       inside the extracted block (below). Only walletPushRequestedRef
  //       lived outside the block in App.tsx — declare it here.
  const walletPushRequestedRef = useRef<Set<string>>(new Set());

  // Live Real-Time Firestore Synchronization for personal / active workspace
  const [isCloudLoaded, setIsCloudLoaded] = useState(false);
  const hasInitialSyncedRef = useRef(false);
  const isRemoteUpdateRef = useRef(false);

  useEffect(() => {
    if (!user) {
      setIsCloudLoaded(false);
      return;
    }

    const targetUid = activeWorkspaceId || user.uid;

    const unsubscribers: (() => void)[] = [];
    const timers: NodeJS.Timeout[] = [];

    const setupListeners = () => {
      // 1. Transactions
      timers.push(setTimeout(() => {
        unsubscribers.push(onSnapshot(collection(db, 'users', targetUid, 'transactions'), { includeMetadataChanges: true }, (snap) => {
          isRemoteUpdateRef.current = true;
          const deletedIds: string[] = [];
          snap.docChanges().forEach((change) => {
            if (change.type === 'removed') {
              deletedIds.push(change.doc.id);
              markTxDeleted(change.doc.id);
            }
          });

          const confirmedServerTxIds = new Set<string>();
          const confirmedServerTxs: Transaction[] = [];
          const localPendingTxs: Transaction[] = [];

          let savedConfirmedIds = new Set<string>();
          try {
            const saved = safeGetItem('ngwe_cloud_tx_ids');
            if (saved) savedConfirmedIds = new Set<string>(JSON.parse(saved));
          } catch {}

          snap.forEach((d) => {
            const t = { id: d.id, ...d.data() } as Transaction;
            if (t && t.id && !deletedIds.includes(t.id) && !isTxDeleted(t.id)) {
              const isPendingInQueue = syncQueue.isEntityPending('transactions', t.id);
              const isConfirmed = (!d.metadata.hasPendingWrites || savedConfirmedIds.has(t.id)) && !isPendingInQueue;

              if (isConfirmed) {
                confirmedServerTxIds.add(t.id);
                unmarkTxDeleted(t.id);
                confirmedServerTxs.push(t);
              } else {
                localPendingTxs.push(t);
              }
            }
          });

          setCloudTxIds(confirmedServerTxIds);
          safeSetItem('ngwe_cloud_tx_ids', JSON.stringify(Array.from(confirmedServerTxIds)));

          setTransactions((prevLocal) => {
            const map = new Map<string, Transaction>();
            confirmedServerTxs.forEach((cloudTx) => {
              if (cloudTx && cloudTx.id && !deletedIds.includes(cloudTx.id)) {
                // Note: cloud data is authoritative for confirmed items
                if (!syncQueue.isEntityPending('transactions', cloudTx.id)) {
                  map.set(cloudTx.id, cloudTx);
                } else {
                  const localTx = prevLocal.find(t => t.id === cloudTx.id);
                  map.set(cloudTx.id, localTx || cloudTx);
                }
              }
            });

            localPendingTxs.forEach((t) => {
              if (t && t.id && !map.has(t.id) && !isTxDeleted(t.id) && !deletedIds.includes(t.id)) {
                map.set(t.id, t);
              }
            });

            prevLocal.forEach((t) => {
              if (!t || !t.id) return;
              if (deletedIds.includes(t.id)) return;
              if (isTxDeleted(t.id)) return;
              if (map.has(t.id)) return;
              const isPendingUpsert = syncQueue
                .getQueue()
                .some((q) => q.entityType === 'transactions' && q.entityId === t.id && q.operation === 'upsert');
              if (isPendingUpsert) {
                map.set(t.id, t);
              }
            });

            const merged = Array.from(map.values()).sort(
              (a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()
            );
            if (areArraysEqual(prevLocal, merged)) return prevLocal;
            safeSetItem('ngwe_transactions', JSON.stringify(merged));
            return merged;
          });

          if (snap.empty && !isCloudLoaded && !hasInitialSyncedRef.current) {
            hasInitialSyncedRef.current = true;
            const savedTxs = safeGetItem('ngwe_transactions');
            if (savedTxs && savedTxs !== '[]') {
              const ownWallets = computedWallets.filter((w) => !w.isSharedFromOther && !w.id.startsWith('shared_'));
              syncDataToCloud(transactions, debts, ownWallets, categories, budgets, plan, undefined, shops, vehicles, fuelLogs, vehicleMaintenance, tirePressureLogs);
            }
          }
          setIsCloudLoaded(true);
        }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${targetUid}/transactions`)));
      }, 0));
  
      // 2. Wallets
      timers.push(setTimeout(() => {
        unsubscribers.push(onSnapshot(collection(db, 'users', targetUid, 'wallets'), (snap) => {
          isRemoteUpdateRef.current = true;
          const deletedWalletIds: string[] = [];
          snap.docChanges().forEach((change) => {
            if (change.type === 'removed') {
              deletedWalletIds.push(change.doc.id);
              markWalletDeleted(change.doc.id);
            } else if (change.doc.id.startsWith('shared_') || change.doc.data()?.isSharedFromOther) {
              safeDeleteDoc(doc(db, 'users', targetUid, 'wallets', change.doc.id)).catch(() => null);
            }
          });

          const cloudWallets = snap.docs
            .map((d) => ({ id: d.id, ...d.data() } as Wallet))
            .filter((w) => w && w.id && !w.id.startsWith('shared_') && !w.isSharedFromOther && !deletedWalletIds.includes(w.id));

          const unpushedWallets: Wallet[] = [];
          walletsLatestRef.current.forEach((w) => {
            if (w && w.id && !w.isSharedFromOther && !w.id.startsWith('shared_') && !isWalletDeleted(w.id) && !deletedWalletIds.includes(w.id)) {
              if (!cloudWallets.some((cw) => cw.id === w.id)) {
                const pushKey = `${targetUid}:${w.id}`;
                if (!walletPushRequestedRef.current.has(pushKey)) {
                  walletPushRequestedRef.current.add(pushKey);
                  unpushedWallets.push(w);
                }
              }
            }
          });

          if (unpushedWallets.length > 0 && targetUid && !isQuotaExhausted()) {
            unpushedWallets.forEach((w) => {
              safeSetDoc(doc(db, 'users', targetUid, 'wallets', w.id), { ...w, userId: targetUid }, { merge: true }).catch(() => {});
            });
          }

          setWallets((prevLocal) => {
            const merged = mergeById(prevLocal, cloudWallets);
            const sharedFromOther = prevLocal.filter((w) => (w.isSharedFromOther || w.id.startsWith('shared_')) && !deletedWalletIds.includes(w.id));
            const finalWallets = [...merged, ...sharedFromOther];
            if (finalWallets.length === 0) return INITIAL_WALLETS;
            if (areArraysEqual(prevLocal, finalWallets)) return prevLocal;
            safeSetItem('ngwe_wallets', JSON.stringify(finalWallets));
            return finalWallets;
          });
        }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${targetUid}/wallets`)));
      }, 200));

      // 3. Debts
      timers.push(setTimeout(() => {
        unsubscribers.push(onSnapshot(collection(db, 'users', targetUid, 'debts'), (snap) => {
          isRemoteUpdateRef.current = true;
          const cloudDebts = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Debt));
          setDebts((prevLocal) => {
            // [v6.3.3] Skip cloud entries for IDs we just wrote locally (cloud lag protection)
            const now = Date.now();
            const filtered = cloudDebts.filter((d) => {
              const ts = debtLocalWriteRef.current.get(d.id);
              return !(ts && (now - ts) < 20000);
            });
            // GC expired entries
            Array.from(debtLocalWriteRef.current.entries()).forEach(([id, ts]) => {
              if (now - ts > 20000) debtLocalWriteRef.current.delete(id);
            });
            const merged = mergeById(prevLocal, filtered);
            if (areArraysEqual(prevLocal, merged)) return prevLocal;
            safeSetItem('ngwe_debts', JSON.stringify(merged));
            return merged;
          });
        }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${targetUid}/debts`)));
      }, 400));

      // 4. Categories
      timers.push(setTimeout(() => {
        unsubscribers.push(onSnapshot(collection(db, 'users', targetUid, 'categories'), (snap) => {
          isRemoteUpdateRef.current = true;
          const cloudCats = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Category));
          setCategories((prevLocal) => {
            const merged = mergeById(prevLocal, cloudCats);
            if (areArraysEqual(prevLocal, merged)) return prevLocal;
            safeSetItem('ngwe_categories', JSON.stringify(merged));
            return merged;
          });
        }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${targetUid}/categories`)));
      }, 600));

      // 5. Budgets
      timers.push(setTimeout(() => {
        unsubscribers.push(onSnapshot(collection(db, 'users', targetUid, 'budgets'), (snap) => {
          isRemoteUpdateRef.current = true;
          const cloudBudgets = snap.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as BudgetConfig));
          setBudgets((prevLocal) => {
            const merged = mergeByKey(prevLocal, cloudBudgets);
            if (areArraysEqual(prevLocal, merged)) return prevLocal;
            safeSetItem('ngwe_budgets', JSON.stringify(merged));
            return merged;
          });
        }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${targetUid}/budgets`)));
      }, 800));

      // 6. Shops
      timers.push(setTimeout(() => {
        unsubscribers.push(onSnapshot(collection(db, 'users', targetUid, 'shops'), (snap) => {
          isRemoteUpdateRef.current = true;
          const cloudShops = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ShopContact));
          setShops((prevLocal) => {
            const map = new Map<string, ShopContact>();
            prevLocal.forEach((s) => { if (s && s.id) map.set(s.id, s); });
            cloudShops.forEach((s) => { if (s && s.id) map.set(s.id, { ...map.get(s.id), ...s }); });
            const merged = Array.from(map.values());
            if (areArraysEqual(prevLocal, merged)) return prevLocal;
            safeSetItem('ngwe_shops', JSON.stringify(merged));
            return merged;
          });
        }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${targetUid}/shops`)));
      }, 1000));

      // 7. Vehicles
      timers.push(setTimeout(() => {
        unsubscribers.push(onSnapshot(collection(db, 'users', targetUid, 'vehicles'), (snap) => {
          isRemoteUpdateRef.current = true;
          const cloudVehicles = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Vehicle));
          setVehicles((prevLocal) => {
            const map = new Map<string, Vehicle>();
            prevLocal.forEach((v) => { if (v && v.id) map.set(v.id, v); });
            cloudVehicles.forEach((v) => { if (v && v.id) map.set(v.id, { ...map.get(v.id), ...v }); });
            const merged = Array.from(map.values());
            if (areArraysEqual(prevLocal, merged)) return prevLocal;
            safeSetItem('ngwe_vehicles', JSON.stringify(merged));
            return merged;
          });
        }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${targetUid}/vehicles`)));
      }, 1200));

      // 8. Fuel Logs
      timers.push(setTimeout(() => {
        unsubscribers.push(onSnapshot(collection(db, 'users', targetUid, 'fuelLogs'), (snap) => {
          isRemoteUpdateRef.current = true;
          const cloudLogs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FuelLog));
          setFuelLogs((prevLocal) => {
            const map = new Map<string, FuelLog>();
            prevLocal.forEach((f) => { if (f && f.id) map.set(f.id, f); });
            cloudLogs.forEach((f) => { if (f && f.id) map.set(f.id, { ...map.get(f.id), ...f }); });
            const merged = Array.from(map.values());
            if (areArraysEqual(prevLocal, merged)) return prevLocal;
            safeSetItem('ngwe_fuel_logs', JSON.stringify(merged));
            return merged;
          });
        }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${targetUid}/fuelLogs`)));
      }, 1400));

      // 9. Maintenance
      timers.push(setTimeout(() => {
        unsubscribers.push(onSnapshot(collection(db, 'users', targetUid, 'vehicleMaintenance'), (snap) => {
          isRemoteUpdateRef.current = true;
          const cloudMaint = snap.docs.map((d) => ({ id: d.id, ...d.data() } as VehicleMaintenance));
          setVehicleMaintenance((prevLocal) => {
            const map = new Map<string, VehicleMaintenance>();
            prevLocal.forEach((m) => { if (m && m.id) map.set(m.id, m); });
            cloudMaint.forEach((m) => { if (m && m.id) map.set(m.id, { ...map.get(m.id), ...m }); });
            const merged = Array.from(map.values());
            if (areArraysEqual(prevLocal, merged)) return prevLocal;
            safeSetItem('ngwe_vehicle_maintenance', JSON.stringify(merged));
            return merged;
          });
        }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${targetUid}/vehicleMaintenance`)));
      }, 1600));

      // 10. Tires
      timers.push(setTimeout(() => {
        unsubscribers.push(onSnapshot(collection(db, 'users', targetUid, 'tirePressureLogs'), (snap) => {
          isRemoteUpdateRef.current = true;
          const cloudTires = snap.docs.map((d) => ({ id: d.id, ...d.data() } as TirePressureLog));
          setTirePressureLogs((prevLocal) => {
            const map = new Map<string, TirePressureLog>();
            prevLocal.forEach((t) => { if (t && t.id) map.set(t.id, t); });
            cloudTires.forEach((t) => { if (t && t.id) map.set(t.id, { ...map.get(t.id), ...t }); });
            const merged = Array.from(map.values());
            if (areArraysEqual(prevLocal, merged)) return prevLocal;
            safeSetItem('ngwe_tire_logs', JSON.stringify(merged));
            return merged;
          });
        }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${targetUid}/tirePressureLogs`)));
      }, 1800));
    };

    setupListeners();

    return () => {
      timers.forEach(clearTimeout);
      unsubscribers.forEach(unsub => unsub());
    };
  }, [user?.uid, activeWorkspaceId]);


  return { isCloudLoaded };
}
