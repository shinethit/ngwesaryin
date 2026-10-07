import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { safeGetItem, safeSetItem, safeRemoveItem } from './utils/storage';
import {
  INITIAL_BUDGETS,
  INITIAL_CATEGORIES,
  INITIAL_DEBTS,
  INITIAL_TRANSACTIONS,
  INITIAL_WALLETS,
  DEFAULT_PLAN_LIMITS,
} from './data/initialData';
import {
  BudgetConfig,
  Category,
  Debt,
  Repayment,
  PlanType,
  Transaction,
  TransactionType,
  UNBUDGETED_CATEGORY_ID,
  Wallet,
  WalletPermissions,
  ShopContact,
  DataScope,
  Vehicle,
  FuelLog,
  VehicleMaintenance,
  TirePressureLog,
  VehicleLinkData,
} from './types';
import { DEFAULT_WALLET_PERMISSIONS, getCollaboratorPermissions } from './utils/permissions';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { PlanBanner } from './components/PlanBanner';
import { Dashboard } from './components/Dashboard';
import { TransactionsView } from './components/TransactionsView';
import { DebtsView } from './components/DebtsView';
import { WalletsView } from './components/WalletsView';
import { CategoriesView } from './components/CategoriesView';
import { TransactionModal } from './components/TransactionModal';
import { DebtModal } from './components/DebtModal';
import { RepaymentModal } from './components/RepaymentModal';
import { AdBanner } from './components/AdBanner';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { AccountModal } from './components/AccountModal';
import { NotificationModal } from './components/NotificationModal';
import { LoginScreen } from './components/LoginScreen';
import { FortuneLogo, LogoStyle } from './components/FortuneLogo';
import { ClayFloatingCoinButton } from './components/ClayIllustrations';
import { LayoutDashboard, ArrowLeftRight, HandCoins, Search, Cloud, KeyRound, Trash2, Download, Upload, Menu } from 'lucide-react';
import { SubCategory, PinLockSettings } from './types';
import { useAuth, parseExpiryTime } from './context/AuthContext';
import { doc, collection, onSnapshot, writeBatch } from 'firebase/firestore';
import { db, cleanForFirestore, handleFirestoreError, OperationType, isQuotaExhausted, pauseNetworkDueToQuota, safeSetDoc, safeDeleteDoc } from './lib/firebase';
import { syncQueue } from './lib/syncQueue';
import { recordSyncOperationStart, finishSyncOperation } from './lib/syncOperationLogger';
import { PinLockScreen } from './components/PinLockScreen';
import { Toast } from './components/Toast';
import { AdminBroadcastBanner } from './components/AdminBroadcastBanner';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { QuotaExceededNotificationBanner } from './components/QuotaExceededNotificationBanner';
import { ReconcileBalanceModal } from './components/ReconcileBalanceModal';
import { PinSetupModal } from './components/PinSetupModal';
import { VersionHistoryModal } from './components/VersionHistoryModal';
import { DatabaseSyncTrackerModal } from './components/DatabaseSyncTrackerModal';
import { SyncHealthModal } from './components/SyncHealthModal';
import { SyncStatusDrawer } from './components/SyncStatusDrawer';
import { EducationView } from './components/EducationView';
import { CURRENT_APP_VERSION } from './data/versionHistory';
import { trackVisitorSession } from './lib/analyticsService';
import { syncWalletsWithTransactions, isWalletMatch, repairOrphanedTransactions, isTransferTransaction } from './utils/walletBalance';
import { mergeAndCleanCategories } from './utils/categoryCleanUp';
import {
  syncSharedWalletToCloud,
  deleteSharedWalletDoc,
  deleteUserWalletFromCloud,
  subscribeIncomingSharedWallets,
  subscribeSharedWalletTransactions,
  saveSharedWalletTransaction,
  deleteSharedWalletTransaction,
  leaveSharedWallet,
  getSharedWalletDocId,
} from './lib/sharedWalletService';
import { areArraysEqual, deduplicateById } from './utils/syncGuards';
import { mergeById, mergeByKey } from './utils/mergeById';
import { usePersistedState } from './hooks/usePersistedState';
import { hashPin, generateSalt, isHashedPinFormat } from './utils/pinHash';
import { lazyWithRetry } from './utils/lazyWithRetry';
import { useVehicleHandlers } from './hooks/useVehicleHandlers';
import { useDataHandlers } from './hooks/useDataHandlers';
import { useWalletHandlers } from './hooks/useWalletHandlers';
import { useDebtHandlers } from './hooks/useDebtHandlers';
import { useTransactionHandlers } from './hooks/useTransactionHandlers';
import { useSyncOperations } from './hooks/useSyncOperations';
import { useCloudListeners } from './hooks/useCloudListeners';
import {
  markTxDeleted,
  unmarkTxDeleted,
  isTxDeleted,
  markWalletDeleted,
  unmarkWalletDeleted,
  isWalletDeleted,
} from './utils/deletedMarkers';

// Lazy loaded heavy/secondary components
const AdminPanel = lazyWithRetry(() => import('./components/AdminPanel').then(m => ({ default: m.AdminPanel })));
const BudgetAnalyticsView = lazyWithRetry(() => import('./components/BudgetAnalyticsView').then(m => ({ default: m.BudgetAnalyticsView })));
const DataManagementView = lazyWithRetry(() => import('./components/DataManagementView').then(m => ({ default: m.DataManagementView })));
const FeedbackView = lazyWithRetry(() => import('./components/FeedbackView').then(m => ({ default: m.FeedbackView })));
const PrivacyModal = lazyWithRetry(() => import('./components/PrivacyModal').then(m => ({ default: m.PrivacyModal })));
const UserGuideModal = lazyWithRetry(() => import('./components/UserGuideModal').then(m => ({ default: m.UserGuideModal })));
const PremiumModal = lazyWithRetry(() => import('./components/PremiumModal').then(m => ({ default: m.PremiumModal })));
const ShareAppModal = lazyWithRetry(() => import('./components/ShareAppModal').then(m => ({ default: m.ShareAppModal })));
const ShopsView = lazyWithRetry(() => import('./components/ShopsView').then(m => ({ default: m.ShopsView })));
const VehiclesView = lazyWithRetry(() => import('./components/vehicles/VehiclesView').then(m => ({ default: m.VehiclesView })));

// [v6.7e] Local date helper (avoids UTC offset bugs)
const getTodayLocalStr = (): string => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

// [v6.7f] Validates JSON import payload structure
const validateImportPayload = (parsed: any): { valid: boolean; error?: string } => {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { valid: false, error: 'not an object' };
  }
  const arrayFields = ['transactions', 'debts', 'wallets', 'categories', 'budgets', 'shops', 'vehicles', 'fuelLogs', 'vehicleMaintenance', 'tirePressureLogs'];
  for (const field of arrayFields) {
    if (parsed[field] !== undefined && !Array.isArray(parsed[field])) {
      return { valid: false, error: 'field "' + field + '" must be an array' };
    }
  }
  if (parsed.lang !== undefined && parsed.lang !== 'my' && parsed.lang !== 'en') {
    return { valid: false, error: 'lang must be "my" or "en"' };
  }
  return { valid: true };
};

// 🔧 One-time migration: legacy raw string ('my'/'en') → JSON format
if (typeof window !== 'undefined') {
  try {
    const legacy = localStorage.getItem('ngwe_lang');
    if (legacy === 'my' || legacy === 'en') {
      localStorage.setItem('ngwe_lang', JSON.stringify(legacy));
      console.log('[migration] ngwe_lang converted to JSON');
    }
  } catch {}
}

export default function App() {
  const {
    user,
    userProfile,
    loading,
    isGuestSession,
    syncDataToCloud,
    clearAllCloudData,
    pullDataFromCloud,
    showLoginModal,
    setShowLoginModal,
    isAdmin,
    collaborators,
    addCollaborator,
    removeCollaborator,
    activeWorkspaceId,
  } = useAuth();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isSyncStatusDrawerOpen, setIsSyncStatusDrawerOpen] = useState(false);

  const handleOpenAdminPanel = () => {
    if (isAdmin) {
      setIsAdminPanelOpen(true);
    }
  };

  // URL query trigger for ?admin=true (only opens if verified admin)
  useEffect(() => {
    if (typeof window !== 'undefined' && isAdmin) {
      const params = new URLSearchParams(window.location.search);
      if (params.get('admin') === 'true' || params.get('admin') === '1') {
        setIsAdminPanelOpen(true);
      }
    }
  }, [isAdmin]);

  // Local storage initializers
  const [logoStyle, setLogoStyle] = usePersistedState<LogoStyle>('ngwe_logo_style', 'pixiu');

  const handleSelectLogoStyle = (style: LogoStyle) => {
    setLogoStyle(style);
  };

  // Rely on Account (Not device): Plan is strictly bound to account
  const plan: PlanType = useMemo(() => {
    if (!user) return 'guest';
    if (!userProfile) return 'free';
    if (userProfile.plan === 'premium') {
      if (userProfile.premiumExpiresAt) {
        const expTime = parseExpiryTime(userProfile.premiumExpiresAt);
        if (expTime !== null && expTime < Date.now()) return 'free';
      }
      return 'premium';
    }
    return 'free';
  }, [user, userProfile]);


  const [lang, setLang] = usePersistedState<'my' | 'en'>('ngwe_lang', 'my');

  const [activeTab, setActiveTab] = useState<string>('dashboard');

  const [dataScope, setDataScope] = usePersistedState<DataScope>('ngwe_data_scope', 'all');

  const handleSetDataScope = (scope: DataScope) => {
    setDataScope(scope);
  };

  const [transactions, setTransactions] = usePersistedState<Transaction[]>('ngwe_transactions', []);

  const [debts, setDebts] = usePersistedState<Debt[]>('ngwe_debts', []);
  const [wallets, setWallets] = usePersistedState<Wallet[]>('ngwe_wallets', INITIAL_WALLETS);
  const [shops, setShops] = usePersistedState<ShopContact[]>('ngwe_shops', []);
  const [vehicles, setVehicles] = usePersistedState<Vehicle[]>('ngwe_vehicles', []);
  const [fuelLogs, setFuelLogs] = usePersistedState<FuelLog[]>('ngwe_fuel_logs', []);
  const [vehicleMaintenance, setVehicleMaintenance] = usePersistedState<VehicleMaintenance[]>('ngwe_vehicle_maintenance', []);
  const [tirePressureLogs, setTirePressureLogs] = usePersistedState<TirePressureLog[]>('ngwe_tire_logs', []);
  
  const [categories, setCategories] = usePersistedState<Category[]>('ngwe_categories', INITIAL_CATEGORIES);
  const [budgets, setBudgets] = usePersistedState<BudgetConfig[]>('ngwe_budgets', INITIAL_BUDGETS);

  // Modals state
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txModalInitialType, setTxModalInitialType] = useState<TransactionType>('expense');
  const [txModalInitialWalletId, setTxModalInitialWalletId] = useState<string | undefined>(undefined);
  const [txModalInitialModel, setTxModalInitialModel] = useState<'general' | 'fuel' | 'vehicle_service'>('general');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [isRepaymentModalOpen, setIsRepaymentModalOpen] = useState(false);
  const [selectedDebtForRepayment, setSelectedDebtForRepayment] = useState<Debt | null>(null);
  const [editingRepayment, setEditingRepayment] = useState<{ id: string; amount: number; date: string; walletId: string; note?: string } | null>(null);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);
  const [selectedWalletForReconcile, setSelectedWalletForReconcile] = useState<string | undefined>(undefined);
  const [isPinSetupModalOpen, setIsPinSetupModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isUserGuideModalOpen, setIsUserGuideModalOpen] = useState(false);
  const [isShareAppModalOpen, setIsShareAppModalOpen] = useState(false);
  const [isVersionHistoryModalOpen, setIsVersionHistoryModalOpen] = useState(false);
  const [isDatabaseTrackerOpen, setIsDatabaseTrackerOpen] = useState(false);
  const [isSyncHealthModalOpen, setIsSyncHealthModalOpen] = useState(false);
  const [cloudTxIds, setCloudTxIds] = useState<Set<string>>(() => {
    try {
      const saved = safeGetItem('ngwe_cloud_tx_ids');
      return saved ? new Set<string>(JSON.parse(saved)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  // FIX: [4]a Keep fresh refs for transactions, cloudTxIds, wallets and sync throttle
  const transactionsRef = useRef(transactions);
  transactionsRef.current = transactions;

  const cloudTxIdsRef = useRef(cloudTxIds);
  cloudTxIdsRef.current = cloudTxIds;

  const walletsLatestRef = useRef(wallets);
  walletsLatestRef.current = wallets;

  const isRemoteUpdateRef = useRef(false);
  const lastResumeSyncAtRef = useRef<number>(0);
  const migratedRepaymentsRef = useRef(false); // [v6.1.11] one-shot legacy migration
  // [v6.3.3] Cloud lag protection: skip cloud snapshot for recently locally-written debt IDs
  const debtLocalWriteRef = useRef<Map<string, number>>(new Map());
  const markDebtLocalWrite = (id: string) => {
    debtLocalWriteRef.current.set(id, Date.now());
  };
  const isDebtRecentlyWritten = (id: string): boolean => {
    const ts = debtLocalWriteRef.current.get(id);
    if (!ts) return false;
    return Date.now() - ts < 20000; // 20s protection window
  };

  const handleUpdateConfirmedCloudTxIds = useCallback((newlyConfirmedIds: string[]) => {
    if (!newlyConfirmedIds || newlyConfirmedIds.length === 0) return;
    setCloudTxIds((prev) => {
      const next = new Set(prev);
      newlyConfirmedIds.forEach((id) => next.add(id));
      safeSetItem('ngwe_cloud_tx_ids', JSON.stringify(Array.from(next)));
      return next;
    });
  }, []);

  // Listen for background direct HTTPS recoveries
  useEffect(() => {
    const onConfirmed = (e: any) => {
      const ids = e.detail;
      if (Array.isArray(ids) && ids.length > 0) {
        handleUpdateConfirmedCloudTxIds(ids);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('ngwe_cloud_tx_confirmed', onConfirmed);
      return () => window.removeEventListener('ngwe_cloud_tx_confirmed', onConfirmed);
    }
  }, [handleUpdateConfirmedCloudTxIds]);

  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() => {
    try {
      const saved = safeGetItem('ngwe_read_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [hasCheckedVersion, setHasCheckedVersion] = useState(false);

  useEffect(() => {
    if (!hasCheckedVersion) {
      const savedVersion = safeGetItem('ngwe_app_version');
      if (savedVersion !== CURRENT_APP_VERSION) {
        setIsVersionHistoryModalOpen(true);
        safeSetItem('ngwe_app_version', CURRENT_APP_VERSION);
      }
      setHasCheckedVersion(true);
    }
  }, [hasCheckedVersion]);

  const handleMarkNotificationAsRead = (id: string) => {
    setReadNotificationIds((prev) => {
      if (prev.includes(id)) return prev;
      const updated = [...prev, id];
      safeSetItem('ngwe_read_notifications', JSON.stringify(updated));
      return updated;
    });
  };

  const handleMarkAllNotificationsAsRead = () => {
    const todayStr = getTodayLocalStr();
    const currentMonthStr = todayStr.substring(0, 7);
    const ids: string[] = [];

    debts.forEach((d) => {
      if (d.status === 'active' && d.dueDate) ids.push(`notif_debt_${d.id}_${d.dueDate}`);
    });
    budgets.forEach((b) => {
      ids.push(`notif_budget_exceeded_${b.categoryId}_${currentMonthStr}`);
      ids.push(`notif_budget_warning_${b.categoryId}_${currentMonthStr}`);
    });
    tirePressureLogs.forEach((l) => {
      if (l.nextCheckDate) ids.push(`notif_tire_${l.id}_${l.nextCheckDate}`);
    });

    setReadNotificationIds(ids);
    safeSetItem('ngwe_read_notifications', JSON.stringify(ids));
  };

  const unreadNotificationCount = useMemo(() => {
    const todayStr = getTodayLocalStr();
    const currentMonthStr = todayStr.substring(0, 7);
    let count = 0;

    // Active debts due/overdue
    debts.forEach((debt) => {
      if (debt.status === 'active' && debt.dueDate && debt.totalAmount - debt.paidAmount > 0) {
        const isOverdue = debt.dueDate < todayStr;
        const isDueToday = debt.dueDate === todayStr;
        const dueTimestamp = new Date(debt.dueDate).getTime();
        const todayTimestamp = new Date(todayStr).getTime();
        const diffDays = Math.ceil((dueTimestamp - todayTimestamp) / (1000 * 3600 * 24));

        if (isOverdue || isDueToday || (diffDays >= 0 && diffDays <= 3)) {
          const id = `notif_debt_${debt.id}_${debt.dueDate}`;
          if (!readNotificationIds.includes(id)) count++;
        }
      }
    });

    // Budget warnings
    const currentMonthTx = transactions.filter(
      (t) => t.type === 'expense' && t.date && t.date.startsWith(currentMonthStr)
    );
    const spendingByCategory: Record<string, number> = {};
    currentMonthTx.forEach((t) => {
      spendingByCategory[t.category] = (spendingByCategory[t.category] || 0) + t.amount;
    });

    const monthlyIncome = transactions
      .filter((t) => t.type === 'income' && t.date && t.date.startsWith(currentMonthStr) && !isTransferTransaction(t))
      .reduce((sum, t) => sum + t.amount, 0);

    budgets.forEach((budget) => {
      const spent = spendingByCategory[budget.categoryId] || 0;
      // [v6.7e] Percentage budget: value is % of monthly income
      const limit = budget.calcType === 'percentage'
        ? (monthlyIncome * budget.value) / 100
        : budget.value;
      if (limit > 0) {
        const percentage = (spent / limit) * 100;
        if (percentage >= 100) {
          const id = `notif_budget_exceeded_${budget.categoryId}_${currentMonthStr}`;
          if (!readNotificationIds.includes(id)) count++;
        } else if (percentage >= 80) {
          const id = `notif_budget_warning_${budget.categoryId}_${currentMonthStr}`;
          if (!readNotificationIds.includes(id)) count++;
        }
      }
    });

    // Vehicle tire pressure checks
    tirePressureLogs.forEach((log) => {
      if (log.nextCheckDate && log.nextCheckDate <= todayStr) {
        const id = `notif_tire_${log.id}_${log.nextCheckDate}`;
        if (!readNotificationIds.includes(id)) count++;
      }
    });

    return count;
  }, [debts, budgets, transactions, tirePressureLogs, readNotificationIds]);

    const [pinSettings, setPinSettings] = useState<PinLockSettings>(() => {
    try {
      const saved = safeGetItem('ngwe_pin');
      if (!saved) {
        return { isEnabled: false, pin: '', pinSalt: '', requireOnStart: false };
      }
      const parsed = JSON.parse(saved);
      // Normalize: ensure pinSalt field exists (legacy data may not have it)
      return {
        isEnabled: Boolean(parsed.isEnabled),
        pin: typeof parsed.pin === 'string' ? parsed.pin : '',
        pinSalt: typeof parsed.pinSalt === 'string' ? parsed.pinSalt : '',
        requireOnStart: Boolean(parsed.requireOnStart),
      };
    } catch {
      return { isEnabled: false, pin: '', pinSalt: '', requireOnStart: false };
    }
  });
    const [isLocked, setIsLocked] = useState(() => {
    try {
      const saved = safeGetItem('ngwe_pin');
      if (saved) {
        const parsed: PinLockSettings = JSON.parse(saved);
        if (!parsed.isEnabled || !parsed.requireOnStart || !parsed.pin) return false;
        // Support both legacy plaintext (4 chars) and new hashed (64 chars) formats
        const isLegacyPin = parsed.pin.length === 4 && /^\d{4}$/.test(parsed.pin);
        const isHashedPin = parsed.pin.length === 64 && /^[0-9a-fA-F]+$/.test(parsed.pin);
        return isLegacyPin || isHashedPin;
      }
    } catch {
      return false;
    }
    return false;
  });

  // Dynamically synchronize each wallet's balance with all income, expense, and debt records
  const computedWallets = useMemo(() => {
    return syncWalletsWithTransactions(wallets, transactions, debts);
  }, [wallets, transactions, debts]);

  // Auto-migrate & consolidate redundant legacy categories on app startup
  useEffect(() => {
    const hasRedundant = categories.some(
      (c) => c.id === 'cat_groceries' || c.id === 'cat_phone'
    );
    const hasMissingVehicle = !categories.some(
      (c) => c.id === 'cat_vehicle' || c.name.includes('ယာဉ်စီမံ')
    );

    if (hasRedundant || hasMissingVehicle) {
      const result = mergeAndCleanCategories(
        categories,
        transactions,
        budgets
      );
      if (result.cleanedCategories.length > 0) {
        setCategories(result.cleanedCategories);
        setTransactions(result.updatedTransactions);
        setBudgets(result.updatedBudgets);
        safeSetItem('ngwe_categories', JSON.stringify(result.cleanedCategories));
        safeSetItem('ngwe_transactions', JSON.stringify(result.updatedTransactions));
        safeSetItem('ngwe_budgets', JSON.stringify(result.updatedBudgets));
      }
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  const {
    handleManualSyncUp,
    handleFullManualSync,
    handleForcePushAll,
    handleForcePullAll,
    handleManualSyncDown,
  } = useSyncOperations({
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
  });


  // Cloud listeners (Phase 8) — 10 onSnapshot subscriptions
  useCloudListeners({
    user,
    activeWorkspaceId,
    activeTab,
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
  });

  // ⚠️ REMOVED (v5.3.32): Auto-tick that re-enqueued any local tx missing
  // from cloudTxIds caused a deletion resurrection loop across devices.
  // syncQueue is now the sole source of pending writes.

  // Centralized Debounced Cloud Synchronization Layer
  // Note: Direct user mutations (add/update/delete) write to Firestore instantly per-document.
  // Full-collection batch sync is reserved for initial load or manual user sync button.

    // =============================================================
  // iOS PWA: Flush pending writes before app goes to background
  // =============================================================
  // iOS PWA suspends the app almost immediately when it goes to
  // background. If Firestore has pending writes, they may be lost.
  // We listen to visibilitychange and pagehide to force flush.
  // =============================================================
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const flushPendingWrites = async () => {
      try {
        const { waitForPendingWrites } = await import('firebase/firestore');
        await Promise.race([
          waitForPendingWrites(db),
          new Promise((resolve) => setTimeout(resolve, 3000)), // 3s max
        ]);
        console.log('[iOS PWA] Pending writes flushed');
      } catch (err) {
        console.warn('[iOS PWA] Flush pending writes notice:', err);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Fire and forget — don't await, iOS may kill us
        flushPendingWrites();
      }
    };

    const handlePageHide = () => {
      flushPendingWrites();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, []);
  
  // Track Visitor & Guest Session
  useEffect(() => {
    // Only track once initial auth resolution has completed
    if (loading) return;
    trackVisitorSession(user);
  }, [user, loading]);

  // Self-healing: Ensure all wallet collaborators are authorized in the user's
  // root document's collaborators array for Firestore security rules.
  //
  // FIX (v5.3.34): Guard with a ref so each email is healed at most once per
  // session. Previously the effect re-ran on every wallets/collaborators tick,
  // and if the write failed (rules/permission), addCollaborator re-fired in a
  // tight loop, burning Firestore quota and blocking the sync queue.
  const healedCollaboratorsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!user || wallets.length === 0 || !addCollaborator) return;
    const ownWallets = wallets.filter((w) => !w.isSharedFromOther);
    const walletCollaborators = new Set<string>();
    ownWallets.forEach((w) => {
      if (w.sharedWith) {
        w.sharedWith.forEach((email) => {
          if (email && email.trim()) {
            walletCollaborators.add(email.trim().toLowerCase());
          }
        });
      }
    });

    const rootCollaborators = new Set((collaborators || []).map((c) => c.toLowerCase()));
    const missing = Array.from(walletCollaborators).filter(
      (email) => !rootCollaborators.has(email) && !healedCollaboratorsRef.current.has(email)
    );

    if (missing.length === 0) return;

    // Mark as attempted BEFORE the async call so re-renders don't retry.
    missing.forEach((email) => healedCollaboratorsRef.current.add(email));

    (async () => {
      for (const email of missing) {
        try {
          await addCollaborator(email);
          console.log(`Auto-healed root collaborator permission for ${email}`);
        } catch (err) {
          console.warn(`Failed to auto-heal collaborator permission for ${email}:`, err);
        }
      }
    })();
  }, [user?.uid, wallets, collaborators, addCollaborator]);

  // Global search shortcut (⌘K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

    useEffect(() => {
    safeSetItem('ngwe_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    safeSetItem('ngwe_debts', JSON.stringify(debts));
  }, [debts]);

  useEffect(() => {
    safeSetItem('ngwe_wallets', JSON.stringify(wallets));
  }, [wallets]);

  useEffect(() => {
    safeSetItem('ngwe_shops', JSON.stringify(shops));
  }, [shops]);

  useEffect(() => {
    safeSetItem('ngwe_budgets', JSON.stringify(budgets));
  }, [budgets]);

  useEffect(() => {
    safeSetItem('ngwe_pin', JSON.stringify(pinSettings));
  }, [pinSettings]);

  // Auto-repair missing wallet IDs and ensure legacy transfers are marked with isTransfer: true
  useEffect(() => {
    if (wallets.length === 0 || transactions.length === 0) return;
    const { repaired, hasChanges } = repairOrphanedTransactions(transactions, wallets);
    if (hasChanges && !areArraysEqual(transactions, repaired)) {
      setTransactions(repaired);
      safeSetItem('ngwe_transactions', JSON.stringify(repaired));
    }
  }, [wallets, transactions]);

  // [v6.1.11] One-shot auto-migration: link legacy debt repayments → transactionId
  useEffect(() => {
    if (migratedRepaymentsRef.current) return;
    if (debts.length === 0 || transactions.length === 0) return;

    let changed = false;
    const updatedDebts = debts.map((d) => {
      if (!d.repayments || d.repayments.length === 0) return d;
      const isReceivable = d.type === 'receivable';
      const expectedType = isReceivable ? 'income' : 'expense';
      const expectedCat = isReceivable ? 'cat_debt_repayment' : 'cat_debt_payment';
      let debtChanged = false;

      const updatedRepayments = d.repayments.map((r) => {
        if (r.transactionId) return r;
        const matched = transactions.find(
          (t) =>
            t.type === expectedType &&
            t.category === expectedCat &&
            t.amount === r.amount &&
            t.date === r.date &&
            t.walletId === r.walletId &&
            (t.note || '').includes(d.personName)
        );
        if (matched) {
          debtChanged = true;
          return { ...r, transactionId: matched.id };
        }
        return r;
      });

      if (debtChanged) {
        changed = true;
        return { ...d, repayments: updatedRepayments };
      }
      return d;
    });

    migratedRepaymentsRef.current = true;

    if (changed) {
      setDebts(updatedDebts);
      safeSetItem('ngwe_debts', JSON.stringify(updatedDebts));
      console.log('[v6.1.11] Migrated legacy debt repayments → transactionId links');
      if (user?.uid) {
        const targetUid = activeWorkspaceId || user.uid;
        updatedDebts.forEach((d) => {
          safeSetDoc(doc(db, 'users', targetUid, 'debts', d.id), {
            ...d,
            userId: targetUid,
          }, { merge: true });
        });
      }
    }
  }, [debts.length, transactions.length]);

  // Real-time listener for incoming shared wallets from collaborators
  useEffect(() => {
    if (!user || !user.email) {
      setWallets((prev) => prev.filter((w) => !w.isSharedFromOther));
      return;
    }

    const unsubscribe = subscribeIncomingSharedWallets(
      user.email,
      user.uid,
      (incoming) => {
        isRemoteUpdateRef.current = true;
        setWallets((prev) => {
          const ownWallets = prev.filter((w) => !w.isSharedFromOther && !w.id.startsWith('shared_'));
          const incomingMap = new Map<string, Wallet>();
          incoming.forEach((w) => {
            const key = w.sharedDocId || w.id;
            if (!incomingMap.has(key)) {
              incomingMap.set(key, w);
            }
          });
          const next = [...ownWallets, ...Array.from(incomingMap.values())];
          if (areArraysEqual(prev, next)) {
            return prev;
          }
          safeSetItem('ngwe_wallets', JSON.stringify(next));
          return next;
        });
      },
      (err) => {
        console.warn('Failed to listen to incoming shared wallets:', err);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, user?.email]);

  // Real-time listener for transactions of shared wallets
  useEffect(() => {
    if (!user) return;

    const activeSharedWallets = wallets.filter(
      (w) => w.isSharedFromOther || (w.sharedWith && w.sharedWith.length > 0)
    );

    if (activeSharedWallets.length === 0) return;

    const unsubs = activeSharedWallets.map((sw) => {
      const docIdToUse = getSharedWalletDocId(sw, user.uid);
      return subscribeSharedWalletTransactions(
        sw.id,
        (sharedTxs, deletedTxIds) => {
          if (!sharedTxs) return;
          isRemoteUpdateRef.current = true;

          // Prune any explicitly removed doc IDs from this snapshot
          if (deletedTxIds && deletedTxIds.length > 0) {
            deletedTxIds.forEach((id) => {
              markTxDeleted(id);
              if (user?.uid) {
                safeDeleteDoc(doc(db, 'users', user.uid, 'transactions', id)).catch(() => null);
              }
            });
          }

          setTransactions((prev) => {
            const map = new Map<string, Transaction>();

            prev.forEach((t) => {
              if (!t || !t.id) return;
              if (isTxDeleted(t.id)) return;
              if (deletedTxIds && deletedTxIds.includes(t.id)) return;
              map.set(t.id, t);
            });

            // Upsert / update transactions from shared wallet
            // FIX (v5.3.33): Do NOT re-add txs marked as deleted.
            // unmarkTxDeleted() here was resurrecting txs iOS deleted
            // but whose shared-wallet copy hadn't propagated yet.
            sharedTxs.forEach((t) => {
              if (t && t.id) {
                if (isTxDeleted(t.id)) return;
                if (deletedTxIds && deletedTxIds.includes(t.id)) return;
                const existing = map.get(t.id);
                map.set(t.id, { ...(existing as any), ...(t as any) } as Transaction);
              }
            });

            const merged = Array.from(map.values()).sort(
              (a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()
            );
            if (areArraysEqual(prev, merged)) {
              return prev;
            }
            safeSetItem('ngwe_transactions', JSON.stringify(merged));
            return merged;
          });
        },
        undefined,
        docIdToUse,
        user.uid
      );
    });

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [wallets.map((w) => `${w.id}:${w.sharedWith?.length || 0}:${w.isSharedFromOther}:${w.sharedDocId || ''}`).join(','), user?.uid]);

  const limits = DEFAULT_PLAN_LIMITS[plan];

  // Handlers
  const handleClearAllData = async (force = false) => {
    // [v6.7f] Require typing confirmation + auto-backup
    if (!force) {
      const expected = lang === 'my' ? 'ဖျက်မည်' : 'DELETE';
      const promptMsg = lang === 'my'
        ? `ဒေတာအားလုံး အပြီးတိုင် ဖျက်ရန် "${expected}" လို့ ရိုက်ထည့်ပါ:`
        : `Type "${expected}" to permanently delete ALL data:`;
      const input = window.prompt(promptMsg);
      if (input !== expected) {
        showToast(lang === 'my' ? 'ဖျက်ခြင်း ပယ်ဖျက်လိုက်ပါပြီ' : 'Delete cancelled');
        return;
      }
    }
    // [v6.7f] Auto-backup before clearing
    try {
      const backupData = {
        transactions, debts, wallets: computedWallets, categories, budgets,
        shops, vehicles, fuelLogs, vehicleMaintenance, tirePressureLogs, plan, lang,
      };
      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ngwesaryin_predelete_${getTodayLocalStr()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (backupErr) {
      console.warn('[clearAll] auto-backup failed:', backupErr);
    }

    if (true) {
      const defaultCashWallet: Wallet = {
        id: 'cash',
        name: 'ငွေသား (လက်ဝယ်)',
        nameEn: 'Cash',
        balance: 0,
        initialBalance: 0,
        color: '#10B981',
        icon: 'Banknote',
        isDefault: true,
      };

      setTransactions([]);
      setDebts([]);
      setWallets([defaultCashWallet]);
      setCategories(INITIAL_CATEGORIES);
      setBudgets([]);
      setShops([]);
      setVehicles([]);
      setFuelLogs([]);
      setVehicleMaintenance([]);
      setTirePressureLogs([]);

      safeSetItem('ngwe_transactions', JSON.stringify([]));
      safeSetItem('ngwe_debts', JSON.stringify([]));
      safeSetItem('ngwe_wallets', JSON.stringify([defaultCashWallet]));
      safeSetItem('ngwe_categories', JSON.stringify(INITIAL_CATEGORIES));
      safeSetItem('ngwe_budgets', JSON.stringify([]));
      safeSetItem('ngwe_shops', JSON.stringify([]));
      safeSetItem('ngwe_vehicles', JSON.stringify([]));
      safeSetItem('ngwe_fuel_logs', JSON.stringify([]));
      safeSetItem('ngwe_vehicle_maintenance', JSON.stringify([]));
      safeSetItem('ngwe_tire_logs', JSON.stringify([]));

      if (user) {
        await clearAllCloudData();
      }

      showToast(lang === 'my' ? 'ဒေတာအားလုံးကို အပြီးတိုင် ရှင်းလင်းလိုက်ပါပြီ ✓' : 'All data cleared successfully ✓');
      setIsAccountModalOpen(false);
    }
  };

  // [v6.7f] Refs for notification timers (cleanup on unmount)
  const reminderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reminderIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const langRef = useRef(lang);
  langRef.current = lang;

  // [v6.7h] Version check moved to hasCheckedVersion useEffect (was duplicated)
  // Initialize app: daily reminder
  useEffect(() => {
    // 9 PM Daily Reminder — with cleanup
    const scheduleReminder = () => {
      const now = new Date();
      const ninePM = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 21, 0, 0);
      let delay = ninePM.getTime() - now.getTime();
      if (delay < 0) delay += 24 * 60 * 60 * 1000;

      reminderTimeoutRef.current = setTimeout(() => {
        const l = langRef.current;
        if (Notification.permission === 'granted') {
          new Notification(l === 'my' ? 'ငွေစာရင်းသွင်းရန် အချိန်ကျပါပြီ' : 'Time to record transactions!', {
            body: l === 'my' ? 'ဒီနေ့ရဲ့ ဝင်ငွေ/ထွက်ငွေတွေကို မှတ်တမ်းတင်လိုက်ပါ။' : 'Record your income/expense for today.',
          });
        }
        reminderIntervalRef.current = setInterval(() => {
          const ll = langRef.current;
          if (Notification.permission === 'granted') {
            new Notification(ll === 'my' ? 'ငွေစာရင်းသွင်းရန် အချိန်ကျပါပြီ' : 'Time to record transactions!', {
              body: ll === 'my' ? 'ဒီနေ့ရဲ့ ဝင်ငွေ/ထွက်ငွေတွေကို မှတ်တမ်းတင်လိုက်ပါ။' : 'Record your income/expense for today.',
            });
          }
        }, 24 * 60 * 60 * 1000);
      }, delay);
    };

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') scheduleReminder();
      });
    } else if ('Notification' in window && Notification.permission === 'granted') {
      scheduleReminder();
    }

    return () => {
      if (reminderTimeoutRef.current) clearTimeout(reminderTimeoutRef.current);
      if (reminderIntervalRef.current) clearInterval(reminderIntervalRef.current);
    };
  }, []);

  const handleExportJson = () => {
    const data = {
      transactions,
      debts,
      wallets: computedWallets,
      categories,
      budgets,
      shops,
      vehicles,
      fuelLogs,
      vehicleMaintenance,
      tirePressureLogs,
      plan,
      lang,
    };
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ngwesaryin_backup_${getTodayLocalStr()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(lang === 'my' ? 'Backup သိမ်းဆည်းပြီးပါပြီ ✓' : 'Backup downloaded ✓');
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!window.confirm(lang === 'my' ? 'ဒေတာများကို အစားထိုး သိမ်းဆည်းမည်မှာ သေချာပါသလား?' : 'Are you sure you want to restore from backup? This will replace current data.')) {
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        // [v6.7f] Validate schema before applying
        const validation = validateImportPayload(parsed);
        if (!validation.valid) {
          alert(lang === 'my'
            ? `Backup ဖိုင် မမှန်ပါ: ${validation.error}`
            : `Invalid backup file: ${validation.error}`);
          return;
        }
        if (parsed.transactions) setTransactions(parsed.transactions);
        if (parsed.debts) setDebts(parsed.debts);
        if (parsed.wallets) setWallets(parsed.wallets);
        if (parsed.categories) setCategories(parsed.categories);
        if (parsed.budgets) setBudgets(parsed.budgets);
        if (parsed.shops) setShops(parsed.shops);
        if (parsed.vehicles) setVehicles(parsed.vehicles);
        if (parsed.fuelLogs) setFuelLogs(parsed.fuelLogs);
        if (parsed.vehicleMaintenance) setVehicleMaintenance(parsed.vehicleMaintenance);
        if (parsed.tirePressureLogs) setTirePressureLogs(parsed.tirePressureLogs);
        if (parsed.lang) setLang(parsed.lang);
        showToast(lang === 'my' ? 'Backup ကို အောင်မြင်စွာ ထည့်သွင်းပြီးပါပြီ ✓' : 'Backup restored successfully ✓');
      } catch (err) {
        alert(lang === 'my' ? 'ဖိုင်ဖတ်ရာတွင် အမှားရှိပါသည်' : 'Error reading backup file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleToggleLang = () => {
    setLang((prev) => (prev === 'my' ? 'en' : 'my'));
  };

  const {
    handleSaveVehicle,
    handleDeleteVehicle,
    handleSaveFuelLog,
    handleDeleteFuelLog,
    handleSaveMaintenance,
    handleDeleteMaintenance,
    handleSaveTirePressure,
    handleDeleteTirePressure,
  } = useVehicleHandlers({
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
  });

  const {
    handleOpenAddTx,
    handleOpenEditTx,
    handleOpenAddDebt,
    handleAddTransaction,
    handleDeleteTransaction,
  } = useTransactionHandlers({
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
  });

  const {
    handleAddDebt,
    handleDeleteDebt,
    handleToggleDebtStatus,
    handleRecordRepaymentSubmit,
    handleEditRepayment,
    handleDeleteRepayment,
  } = useDebtHandlers({
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
  });

  const {
    handleAddWallet,
    handleUpdateWallet,
    handleDeleteWallet,
    handleUpdateWalletBalance,
    handleTransferFunds,
    handleShareWallet,
    handleUnshareWallet,
    handleUpdateWalletPermissions,
    handleReconcileBalance,
  } = useWalletHandlers({
    user,
    activeWorkspaceId,
    plan,
    limits,
    lang,
    showToast,
    setIsAuthModalOpen,
    setIsPremiumModalOpen,
    wallets,
    setWallets,
    computedWallets,
    transactions,
    setTransactions,
    categories,
    addCollaborator,
    removeCollaborator,
  });


  const {
    handleAddShop,
    handleUpdateShop,
    handleDeleteShop,
    handleAddBudget,
    handleUpdateBudget,
    handleDeleteBudget,
    handleAddCategory,
    handleUpdateCategory,
    handleDeleteCategory,
    handleAddSubCategory,
    handleUpdateSubCategory,
    handleDeleteSubCategory,
    handleMergeAndCleanCategories,
  } = useDataHandlers({
    user,
    activeWorkspaceId,
    plan,
    lang,
    showToast,
    setIsPremiumModalOpen,
    categories,
    setCategories,
    transactions,
    setTransactions,
    budgets,
    setBudgets,
    shops,
    setShops,
  });



  // [v6.7g] Migrate a legacy plaintext PIN to hashed (PBKDF2+salt) on
  //         successful unlock. Runs at most once per legacy user.
  const handleLegacyPinMigration = useCallback(async (plainPin: string) => {
    try {
      if (!plainPin || plainPin.length !== 4) return;
      const salt = generateSalt();
      const pinHash = await hashPin(plainPin, salt);
      const migrated: PinLockSettings = {
        isEnabled: true,
        pin: pinHash,
        pinSalt: salt,
        requireOnStart: pinSettings.requireOnStart ?? true,
      };
      setPinSettings(migrated);
      safeSetItem('ngwe_pin', JSON.stringify(migrated));
      console.log('[v6.7g] Legacy PIN migrated to PBKDF2-hashed format');
    } catch (err) {
      console.warn('[v6.7g] Legacy PIN migration failed:', err);
    }
  }, [pinSettings.requireOnStart]);

  const handleLockApp = () => {
    // [v6.7e] Support both legacy (4-char) and hashed (64-char) PINs
    if (pinSettings.isEnabled && pinSettings.pin) {
      setIsLocked(true);
    } else {
      setIsPinSetupModalOpen(true);
    }
  };

    const handleSavePinAndLock = (pinHash: string, pinSalt: string) => {
    const updatedSettings: PinLockSettings = {
      isEnabled: true,
      pin: pinHash,
      pinSalt: pinSalt,
      requireOnStart: pinSettings.requireOnStart ?? true,
    };
    setPinSettings(updatedSettings);
    safeSetItem('ngwe_pin', JSON.stringify(updatedSettings));
    setIsLocked(true);
    showToast(lang === 'my' ? 'လုံခြုံရေး PIN သတ်မှတ်၍ အက်ပ်ကို လော့ခ်ချလိုက်ပါပြီ 🔒' : 'PIN set and App locked 🔒');
  };

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <FortuneLogo size="lg" style={logoStyle} animate />
          <p className="text-xs text-slate-500 font-medium">
            {lang === 'my' ? 'ငွေစာရင်း စနစ်ဖွင့်နေပါသည်...' : 'Loading NgweSarYin...'}
          </p>
        </div>
      </div>
    );
  }

  // Landing / Login Screen for unauthenticated or non-guest visitors
  if (!user && !isGuestSession) {
    return (
      <LoginScreen
        lang={lang}
        onToggleLang={handleToggleLang}
        logoStyle={logoStyle}
      />
    );
  }

  // App Main Content
  if (isLocked && pinSettings?.isEnabled && pinSettings?.pin) {
    return (
            <PinLockScreen
        pinHash={pinSettings.pin}
        pinSalt={pinSettings.pinSalt || ''}
        lang={lang}
        onUnlock={() => setIsLocked(false)}
        onLegacyPinVerified={handleLegacyPinMigration}
        onForgotPin={() => {
          // [v6.7e] PIN recovery requires re-auth; do NOT just unlock
          const msg = lang === 'my'
            ? 'PIN ပြန်လည်သတ်မှတ်ရန် Google Account ပြန်ဝင်ရန် (သို့) ဒေတာအားလုံး ဖျက်ရန် လိုအပ်ပါသည်။\n\nဆက်လုပ်မလား?'
            : 'PIN recovery requires signing in with Google again or clearing all data.\n\nContinue?';
          if (!window.confirm(msg)) return;
          setIsLocked(false);
          setIsAuthModalOpen(true);
          setShowLoginModal(true);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col selection:bg-emerald-500 selection:text-white pb-24 relative">
      <QuotaExceededNotificationBanner lang={lang} onOpenSyncStatus={() => setIsSyncStatusDrawerOpen(true)} />
      <PWAInstallPrompt lang={lang} />

      <Navbar
        currentPlan={plan}
        onOpenSidebar={() => setIsSidebarOpen(true)}
        onOpenUpgradeModal={() => setIsPremiumModalOpen(true)}
        onOpenAddModal={() => handleOpenAddTx('expense')}
        onOpenSearch={() => setIsSearchModalOpen(true)}
        onOpenAccountModal={() => setIsAccountModalOpen(true)}
        onOpenLogin={() => setIsAuthModalOpen(true)}
        onLockApp={handleLockApp}
        lang={lang}
        onToggleLang={handleToggleLang}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        transactionsCount={transactions.length}
        maxFreeTransactions={limits.maxTransactions}
        logoStyle={logoStyle}
        onSelectLogoStyle={handleSelectLogoStyle}
        onManualSync={handleFullManualSync}
        onOpenNotificationModal={() => setIsNotificationModalOpen(true)}
        unreadNotificationCount={unreadNotificationCount}
        onOpenAdminPanel={handleOpenAdminPanel}
        onOpenDatabaseTracker={() => setIsDatabaseTrackerOpen(true)}
        pendingCloudCount={transactions.filter((t) => t && t.id && !cloudTxIds.has(t.id)).length}
      />

      <AdminBroadcastBanner lang={lang} />

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentPlan={plan}
        transactionsCount={transactions.length}
        maxFreeTransactions={limits.maxTransactions}
        debtsCount={debts.length}
        walletsCount={computedWallets.length}
        vehiclesCount={vehicles.length}
        lang={lang}
        onToggleLang={handleToggleLang}
        onOpenAccountModal={() => setIsAccountModalOpen(true)}
        onOpenUpgradeModal={() => setIsPremiumModalOpen(true)}
        onOpenSearch={() => setIsSearchModalOpen(true)}
        onOpenLogin={() => setIsAuthModalOpen(true)}
        onOpenAdminPanel={handleOpenAdminPanel}
        onLockApp={handleLockApp}
        onOpenPrivacy={() => setIsPrivacyModalOpen(true)}
        onOpenUserGuide={() => setIsUserGuideModalOpen(true)}
        onOpenShareApp={() => setIsShareAppModalOpen(true)}
        onOpenVersionHistory={() => setIsVersionHistoryModalOpen(true)}
        onManualSync={handleFullManualSync}
      />

      <PlanBanner
        plan={plan}
        transactionsCount={transactions.length}
        maxTransactions={limits.maxTransactions}
        debtsCount={debts.filter((d) => d.status === 'active').length}
        maxDebts={limits.maxDebts}
        onOpenUpgrade={() => setIsPremiumModalOpen(true)}
        lang={lang}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <React.Suspense fallback={
          <div className="flex flex-col items-center justify-center p-12 text-slate-400 gap-2">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium">{lang === 'my' ? 'ခဏစောင့်ပါ...' : 'Loading component...'}</span>
          </div>
        }>
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <Dashboard
              transactions={transactions}
              debts={debts}
              wallets={computedWallets}
              categories={categories}
              budgets={budgets}
              plan={plan}
              lang={lang}
              dataScope={dataScope}
              onSetDataScope={handleSetDataScope}
              onAddTransaction={(type) => handleOpenAddTx(type)}
              onAddDebt={handleOpenAddDebt}
              onSelectTab={setActiveTab}
              onOpenUpgrade={() => setIsPremiumModalOpen(true)}
              onOpenSearch={() => setIsSearchModalOpen(true)}
              onOpenAccountModal={() => setIsAccountModalOpen(true)}
              onClearAllData={handleClearAllData}
              onExportJson={handleExportJson}
              onImportJson={handleImportJson}
              onManualSync={handleFullManualSync}
              onOpenDatabaseTracker={() => setIsDatabaseTrackerOpen(true)}
              cloudTxIds={cloudTxIds}
            />
            <AdBanner
              plan={plan}
              lang={lang}
              slot="dashboard-bottom"
              onOpenUpgradeModal={() => setIsPremiumModalOpen(true)}
            />
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="space-y-6">
            <TransactionsView
              transactions={transactions}
              categories={categories}
              wallets={computedWallets}
              plan={plan}
              maxFreeTransactions={limits.maxTransactions}
              lang={lang}
              dataScope={dataScope}
              onSetDataScope={handleSetDataScope}
              onAddTransaction={handleOpenAddTx}
              onDeleteTransaction={handleDeleteTransaction}
              onEditTransaction={handleOpenEditTx}
              onOpenUpgradeModal={() => setIsPremiumModalOpen(true)}
              cloudTxIds={cloudTxIds}
              onOpenDatabaseTracker={() => setIsDatabaseTrackerOpen(true)}
            />
            <AdBanner
              plan={plan}
              lang={lang}
              slot="inline-compact"
              onOpenUpgradeModal={() => setIsPremiumModalOpen(true)}
            />
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="space-y-6">
            <CategoriesView
              categories={categories}
              plan={plan}
              lang={lang}
              onOpenUpgradeModal={() => setIsPremiumModalOpen(true)}
              onAddCategory={handleAddCategory}
              onUpdateCategory={handleUpdateCategory}
              onDeleteCategory={handleDeleteCategory}
              onAddSubCategory={handleAddSubCategory}
              onDeleteSubCategory={handleDeleteSubCategory}
              onUpdateSubCategory={handleUpdateSubCategory}
              onMergeCategories={handleMergeAndCleanCategories}
            />
            <AdBanner
              plan={plan}
              lang={lang}
              slot="inline-compact"
              onOpenUpgradeModal={() => setIsPremiumModalOpen(true)}
            />
          </div>
        )}
        {activeTab === 'education' && <EducationView lang={lang} />}
        {activeTab === 'debts' && (
          <div className="space-y-6">
            {plan === 'guest' || !limits.hasDebts ? (
              <div className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 text-center space-y-4 shadow-xs max-w-lg mx-auto my-6">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto text-2xl border border-amber-200 shadow-inner">
                  🔒
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {lang === 'my' ? 'အကြွေး စာရင်း (Guest Mode တွင် မရရှိနိုင်ပါ)' : 'Debt Tracking Locked in Guest Mode'}
                  </h2>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1.5 leading-relaxed">
                    {lang === 'my'
                      ? 'အကြွေးနှင့် အရစ်ကျ မှတ်တမ်းများ ထည့်သွင်းရန် Google Account ဖြင့် အခမဲ့ Sign in ပြုလုပ်ပါ (သို့မဟုတ်) Premium သို့ အဆင့်မြှင့်ပါ'
                      : 'To track debts and repayments, please Sign in with Google or Upgrade to Premium.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  {lang === 'my' ? 'Google Account ဖြင့် ဝင်ရောက်မည်' : 'Sign In with Google'}
                </button>
              </div>
            ) : (
              <DebtsView
                debts={debts}
                wallets={computedWallets}
                plan={plan}
                maxFreeDebts={limits.maxDebts}
                lang={lang}
                onAddDebt={handleOpenAddDebt}
                onRecordRepayment={(debt) => {
                  setSelectedDebtForRepayment(debt);
                  setEditingRepayment(null);
                  setIsRepaymentModalOpen(true);
                }}
                onEditRepayment={(debt, rep) => {
                  setSelectedDebtForRepayment(debt);
                  setEditingRepayment(rep);
                  setIsRepaymentModalOpen(true);
                }}
                onDeleteDebt={handleDeleteDebt}
                onDeleteRepayment={handleDeleteRepayment}
                onToggleStatus={handleToggleDebtStatus}
                onOpenUpgradeModal={() => setIsPremiumModalOpen(true)}
              />
            )}
            <AdBanner
              plan={plan}
              lang={lang}
              slot="inline-compact"
              onOpenUpgradeModal={() => setIsPremiumModalOpen(true)}
            />
          </div>
        )}

        {activeTab === 'wallets' && (
          <div className="space-y-6">
            <WalletsView
              wallets={computedWallets}
              transactions={transactions}
              plan={plan}
              maxFreeWallets={limits.maxWallets}
              lang={lang}
              onAddWallet={handleAddWallet}
              onUpdateWallet={handleUpdateWallet}
              onUpdateWalletBalance={handleUpdateWalletBalance}
              onDeleteWallet={handleDeleteWallet}
              onTransferFunds={handleTransferFunds}
              onOpenUpgradeModal={() => setIsPremiumModalOpen(true)}
              onOpenReconcileModal={(walletId) => {
                setSelectedWalletForReconcile(walletId);
                setIsReconcileModalOpen(true);
              }}
              onAddTransaction={handleOpenAddTx}
              onShareWallet={handleShareWallet}
              onUnshareWallet={handleUnshareWallet}
              onUpdatePermissions={handleUpdateWalletPermissions}
              onSyncRefresh={handleManualSyncDown}
            />
            <AdBanner
              plan={plan}
              lang={lang}
              slot="inline-compact"
              onOpenUpgradeModal={() => setIsPremiumModalOpen(true)}
            />
          </div>
        )}

        {(activeTab === 'analytics' || activeTab === 'budgets') && (
          <div className="space-y-6">
            {plan === 'guest' || !limits.hasBudgets ? (
              <div className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 text-center space-y-4 shadow-xs max-w-lg mx-auto my-6">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto text-2xl border border-amber-200 shadow-inner">
                  🔒
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {lang === 'my' ? 'ဘတ်ဂျက် စီမံခြင်း (Guest Mode တွင် မရရှိနိုင်ပါ)' : 'Budget Management Locked in Guest Mode'}
                  </h2>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1.5 leading-relaxed">
                    {lang === 'my'
                      ? 'ဝင်ငွေ/ထွက်ငွေ % နှင့် ပုံသေ ဘတ်ဂျက် စီမံခန့်ခွဲနိုင်ရန် Google Account ဖြင့် အခမဲ့ Sign in ပြုလုပ်ပါ (သို့မဟုတ်) Premium သို့ အဆင့်မြှင့်ပါ'
                      : 'To set and manage monthly budgets, please Sign in with Google or Upgrade to Premium.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  {lang === 'my' ? 'Google Account ဖြင့် ဝင်ရောက်မည်' : 'Sign In with Google'}
                </button>
              </div>
            ) : (
              <BudgetAnalyticsView
                transactions={transactions}
                categories={categories}
                wallets={computedWallets}
                budgets={budgets}
                plan={plan}
                lang={lang}
                maxBudgetCategories={limits.maxBudgetCategories}
                onAddBudget={handleAddBudget}
                onUpdateBudget={handleUpdateBudget}
                onDeleteBudget={handleDeleteBudget}
                onOpenUpgradeModal={() => setIsPremiumModalOpen(true)}
              />
            )}
            <AdBanner
              plan={plan}
              lang={lang}
              slot="inline-compact"
              onOpenUpgradeModal={() => setIsPremiumModalOpen(true)}
            />
          </div>
        )}

        {activeTab === 'data_management' && (
          <DataManagementView
            transactions={transactions}
            debts={debts}
            wallets={computedWallets}
            categories={categories}
            budgets={budgets}
            plan={plan}
            lang={lang}
            onClearAllData={handleClearAllData}
            onExportJson={handleExportJson}
            onImportJson={handleImportJson}
            onOpenAccountModal={() => setIsAccountModalOpen(true)}
            onOpenPremiumModal={() => setIsPremiumModalOpen(true)}
          />
        )}

        {activeTab === 'plans' && (
          <div className="max-w-5xl mx-auto py-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
              <div className="text-center max-w-xl mx-auto mb-8">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
                  {lang === 'my' ? 'Guest / Free / Premium ဝန်ဆောင်မှု အဆင့်များ' : 'Guest vs Free vs Premium Membership Plans'}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-2">
                  {lang === 'my'
                    ? 'လူကြီးမင်း၏ လိုအပ်ချက်နှင့်ကိုက်ညီသော အစီအစဉ်ကို ရွေးချယ်အသုံးပြုနိုင်ပါသည်'
                    : 'Choose the plan that best fits your financial management needs'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div
                  className={`p-5 rounded-2xl border-2 flex flex-col justify-between ${
                    plan === 'guest' ? 'border-slate-700 bg-slate-50/80 shadow-xs' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-base text-slate-900">Guest Mode</h3>
                      {plan === 'guest' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-white">
                          {lang === 'my' ? 'လက်ရှိသုံးနေသည်' : 'Current'}
                        </span>
                      )}
                    </div>
                    <div className="text-xl font-black text-slate-900 mt-2">
                      0 MMK <span className="text-xs font-normal text-slate-500">/ Account မလို</span>
                    </div>

                    <ul className="mt-4 space-y-2 text-xs text-slate-600">
                      <li className="flex items-center gap-1.5 font-medium">✓ {lang === 'my' ? 'လစဉ် မှတ်တမ်း ၃၀ ခု' : '30 tx / month'}</li>
                      <li className="flex items-center gap-1.5 font-medium">✓ {lang === 'my' ? 'Wallet ၁ ခုသာ (Cash)' : '1 Wallet only'}</li>
                      <li className="flex items-center gap-1.5 text-rose-600 font-medium">✕ {lang === 'my' ? 'အကြွေး စာရင်း (မရပါ)' : 'No Debt Tracking'}</li>
                      <li className="flex items-center gap-1.5 text-rose-600 font-medium">✕ {lang === 'my' ? 'စုငွေ ပန်းတိုင် (မရပါ)' : 'No Savings Target'}</li>
                      <li className="flex items-center gap-1.5 text-rose-600 font-medium">✕ {lang === 'my' ? 'ဘတ်ဂျက် စီမံခြင်း (မရပါ)' : 'No Budgeting'}</li>
                      <li className="flex items-center gap-1.5 text-slate-400">✕ {lang === 'my' ? 'Wallet မျှဝေခြင်း (မရပါ)' : 'No Wallet Sharing'}</li>
                      <li className="flex items-center gap-1.5 text-slate-400">✕ {lang === 'my' ? 'Cloud Auto-Sync (မပါ)' : 'No Cloud Sync'}</li>
                    </ul>
                  </div>

                  <button
                    disabled={plan === 'guest'}
                    onClick={() => {
                      showToast(lang === 'my' ? 'Guest Mode အဖြစ် အသုံးပြုနေပါသည်' : 'Currently in Guest Mode');
                    }}
                    className={`mt-6 w-full py-2 rounded-xl font-bold text-xs transition-colors ${
                      plan === 'guest'
                        ? 'bg-slate-200 text-slate-700 cursor-default'
                        : 'border border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {plan === 'guest' ? (lang === 'my' ? 'လက်ရှိသုံးနေသည်' : 'Active Plan') : (lang === 'my' ? 'Guest အဆင့်' : 'Guest Tier')}
                  </button>
                </div>

                <div
                  className={`p-5 rounded-2xl border-2 flex flex-col justify-between ${
                    plan === 'free' ? 'border-emerald-600 bg-emerald-50/20 shadow-xs ring-2 ring-emerald-500/20' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-base text-slate-900">Free Plan</h3>
                      {plan === 'free' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {lang === 'my' ? 'လက်ရှိသုံးနေသည်' : 'Current'}
                        </span>
                      )}
                    </div>
                    <div className="text-xl font-black text-slate-900 mt-2">
                      0 MMK <span className="text-xs font-normal text-slate-500">/ Google Sign-In</span>
                    </div>

                    <ul className="mt-4 space-y-2 text-xs text-slate-600">
                      <li className="flex items-center gap-1.5 font-semibold text-emerald-800">✓ {lang === 'my' ? 'လစဉ် မှတ်တမ်း ၁၀၀ ခု' : '100 tx / month'}</li>
                      <li className="flex items-center gap-1.5 font-semibold text-emerald-800">✓ {lang === 'my' ? 'အကြွေးစာရင်း ၅ ခု' : 'Up to 5 Debts'}</li>
                      <li className="flex items-center gap-1.5 font-semibold text-emerald-800">✓ {lang === 'my' ? 'Wallet ၂ ခု' : '2 Wallets'}</li>
                      <li className="flex items-center gap-1.5 font-semibold text-indigo-700">✓ {lang === 'my' ? 'Wallet မျှဝေခြင်း (၂ ယောက်)' : 'Share Wallet (2 members)'}</li>
                      <li className="flex items-center gap-1.5 font-semibold text-emerald-800">✓ {lang === 'my' ? 'စုငွေ ပန်းတိုင် ရရှိမည်' : 'Savings Target'}</li>
                      <li className="flex items-center gap-1.5 font-semibold text-emerald-800">✓ {lang === 'my' ? 'ဘတ်ဂျက် ကဏ္ဍ ၅ ခု' : '5 Budget Categories'}</li>
                      <li className="flex items-center gap-1.5 font-semibold text-emerald-800">✓ {lang === 'my' ? 'ယာဉ်စီမံခန့်ခွဲမှု (ယာဉ် ၁ စီး)' : 'Vehicle Tracking (1 Vehicle)'}</li>
                      <li className="flex items-center gap-1.5 text-slate-500">✕ {lang === 'my' ? 'Custom Categories (မပါ)' : 'No Custom Categories'}</li>
                      <li className="flex items-center gap-1.5 text-slate-400">✕ {lang === 'my' ? 'Excel Export (မပါ)' : 'No Excel Export'}</li>
                    </ul>
                  </div>

                  <button
                    disabled={plan === 'free'}
                    onClick={() => {
                      if (plan === 'guest') {
                        setIsAuthModalOpen(true);
                      } else {
                        showToast(lang === 'my' ? 'Free Plan အဖြစ် အသုံးပြုနေပါသည်' : 'Currently on Free Plan');
                      }
                    }}
                    className={`mt-6 w-full py-2 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                      plan === 'free'
                        ? 'bg-slate-200 text-slate-700 cursor-default'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                    }`}
                  >
                    {plan === 'free' ? (lang === 'my' ? 'လက်ရှိသုံးနေသည်' : 'Active Plan') : (lang === 'my' ? 'Sign In ဖြင့် Free သုံးမည်' : 'Sign In for Free')}
                  </button>
                </div>

                <div
                  className={`p-5 rounded-2xl border-2 flex flex-col justify-between relative overflow-hidden ${
                    plan === 'premium'
                      ? 'border-amber-500 bg-amber-50/20 shadow-md ring-2 ring-amber-400/20'
                      : 'border-amber-400 bg-gradient-to-b from-amber-50/30 to-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 font-bold text-base text-amber-950">
                        <span>✨ Premium VIP</span>
                      </div>
                      {plan === 'premium' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                          {lang === 'my' ? 'လက်ရှိသုံးနေသည်' : 'Active'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-200 text-amber-900 uppercase">
                          PRO
                        </span>
                      )}
                    </div>
                    <div className="text-xl font-black text-slate-900 mt-2">
                      2,000 MMK{' '}
                      <span className="text-[11px] font-normal text-slate-500">
                        / လ {lang === 'my' ? '(၂၀,၀၀၀/နှစ်)' : '(20k/yr)'}
                      </span>
                    </div>

                    <ul className="mt-4 space-y-2 text-xs text-slate-700 font-medium">
                      <li className="flex items-center gap-1.5 text-emerald-700 font-black">
                        ✓ {lang === 'my' ? '100% Ad-Free (ကြော်ငြာမပါ)' : '100% Ad-Free'}
                      </li>
                      <li className="flex items-center gap-1.5 text-emerald-700 font-bold">✓ {lang === 'my' ? 'မှတ်တမ်း အကန့်အသတ်မဲ့' : 'Unlimited Transactions'}</li>
                      <li className="flex items-center gap-1.5 text-emerald-700 font-bold">✓ {lang === 'my' ? 'အကြွေး + အရစ်ကျ အကန့်အသတ်မဲ့' : 'Unlimited Debts'}</li>
                      <li className="flex items-center gap-1.5 text-emerald-700 font-bold">✓ {lang === 'my' ? 'Wallet အကန့်အသတ်မဲ့ + မျှဝေခြင်း' : 'Unlimited Wallets & Sharing'}</li>
                      <li className="flex items-center gap-1.5 text-emerald-700 font-bold">✓ {lang === 'my' ? 'စုငွေ ပန်းတိုင် အပြည့်အဝ' : 'Full Savings Target'}</li>
                      <li className="flex items-center gap-1.5 text-emerald-700 font-bold">✓ {lang === 'my' ? 'ဘတ်ဂျက် အကန့်အသတ်မဲ့' : 'Unlimited Budgets'}</li>
                      <li className="flex items-center gap-1.5 text-emerald-700 font-bold">✓ {lang === 'my' ? 'ယာဉ်စီမံခန့်ခွဲမှု အကန့်အသတ်မဲ့ (Unlimited Fleet)' : 'Unlimited Vehicles & Fleet'}</li>
                      <li className="flex items-center gap-1.5 text-emerald-700 font-bold">✓ {lang === 'my' ? 'Custom Categories စိတ်ကြိုက်' : 'Custom Categories'}</li>
                      <li className="flex items-center gap-1.5 text-emerald-700 font-bold">✓ {lang === 'my' ? 'Excel / CSV ဒေတာ ထုတ်ယူခြင်း' : 'Excel / CSV Export'}</li>
                    </ul>
                  </div>

                  <button
                    onClick={() => {
                      setIsPremiumModalOpen(true);
                    }}
                    className="mt-6 w-full py-2 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-xs active:scale-95 transition-all cursor-pointer"
                  >
                    {plan === 'premium' ? (lang === 'my' ? 'Premium အဆင့် ရရှိပြီး' : 'Premium Active') : (lang === 'my' ? '✨ Premium ရယူရန် နှိပ်ပါ' : '✨ Upgrade to Premium')}
                  </button>
                </div>
              </div>

              <div className="mt-8 p-6 rounded-2xl bg-amber-50/60 border border-amber-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-sm text-amber-950 flex items-center gap-1.5">
                      <KeyRound className="w-4 h-4 text-amber-600" />
                      <span>{lang === 'my' ? 'Activation Code ထည့်သွင်းရန် / ရယူရန်' : 'Activation Code & Payment'}</span>
                    </h3>
                    <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                      {lang === 'my'
                        ? 'Admin ထံမှ ရရှိသော Activation Code ဖြင့် Premium ဖွင့်ရန် (သို့မဟုတ်) KBZPay/WavePay ဖြင့် ဝယ်ယူရန်'
                        : 'Redeem your activation code or view payment instructions to purchase Premium'}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsPremiumModalOpen(true)}
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 shrink-0 flex items-center gap-1.5 cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>{lang === 'my' ? 'Code ထည့်မည် / အသေးစိတ်' : 'Enter Code / Details'}</span>
                  </button>
                </div>
              </div>

              <div className="mt-6 p-6 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
                    {lang === 'my' ? 'ဒေတာ စီမံခန့်ခွဲမှု (Data Management)' : 'Data Management'}
                  </h3>
                </div>

                <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                  {lang === 'my'
                    ? 'စာရင်းမှတ်တမ်းများအား သန့်ရှင်းစင်ကြယ်စွာ အသစ်ပြန်လည်စတင်လိုပါက ဤနေရာမှ ရှင်းလင်းနိုင်ပါသည် (သို့မဟုတ်) Backup သိမ်းဆည်းနိုင်ပါသည်'
                    : 'Manage your local dataset, backup file, or reset records to start completely fresh.'}
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    id="btn-plans-clear-all-data"
                    onClick={() => handleClearAllData()}
                    className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{lang === 'my' ? 'ဒေတာအားလုံး ဖျက်မည် (Clear All Data)' : 'Clear All Data'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportJson}
                    className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-slate-500" />
                    <span>{lang === 'my' ? 'JSON Backup သိမ်းမည်' : 'Export Backup'}</span>
                  </button>

                  <label className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer">
                    <Upload className="w-4 h-4 text-slate-500" />
                    <span>{lang === 'my' ? 'JSON Backup ထည့်မည်' : 'Import Backup'}</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportJson}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'feedback' && (
          <FeedbackView
            lang={lang}
            currentPlan={plan}
            onOpenUpgradeModal={() => setIsPremiumModalOpen(true)}
          />
        )}

        {activeTab === 'shops' && (
          <ShopsView
            shops={shops}
            lang={lang}
            plan={plan}
            onOpenUpgradeModal={() => setIsPremiumModalOpen(true)}
            onAddShop={handleAddShop}
            onUpdateShop={handleUpdateShop}
            onDeleteShop={handleDeleteShop}
          />
        )}

        {activeTab === 'vehicles' && (
          <VehiclesView
            vehicles={vehicles}
            fuelLogs={fuelLogs}
            vehicleMaintenance={vehicleMaintenance}
            tirePressureLogs={tirePressureLogs}
            wallets={computedWallets}
            plan={plan}
            onOpenUpgradeModal={() => setIsPremiumModalOpen(true)}
            onSaveVehicle={(v) => handleSaveVehicle(v as Vehicle)}
            onDeleteVehicle={handleDeleteVehicle}
            onSaveFuelLog={(f) => handleSaveFuelLog(f as FuelLog)}
            onDeleteFuelLog={handleDeleteFuelLog}
            onSaveMaintenance={(m) => handleSaveMaintenance(m as VehicleMaintenance)}
            onDeleteMaintenance={handleDeleteMaintenance}
            onSaveTirePressure={(t) => handleSaveTirePressure(t as TirePressureLog)}
            onDeleteTirePressure={handleDeleteTirePressure}
            lang={lang}
          />
        )}
        </React.Suspense>
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            <span className="font-semibold text-slate-700">ငွေစာရင်း (NgweSarYin)</span> —{' '}
            {lang === 'my'
              ? 'ဝင်ငွေ၊ ထွက်ငွေနှင့် အကြွေးစာရင်း စီမံခန့်ခွဲမှု'
              : 'Income, Expense & Debt Manager'}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span>{lang === 'my' ? 'လုံခြုံစိတ်ချစွာ သိမ်းဆည်းထားပါသည်' : 'Secure & Cloud-synced'}</span>
            <span>•</span>
            <button
              type="button"
              onClick={() => setIsVersionHistoryModalOpen(true)}
              className="text-emerald-700 hover:text-emerald-800 font-bold hover:underline cursor-pointer flex items-center gap-1"
              title="Click to view full version history and changelog"
            >
              <span>{CURRENT_APP_VERSION}</span>
              <span>({lang === 'my' ? 'ဗားရှင်းမှတ်တမ်း' : 'Changelog'})</span>
            </button>
          </div>
        </div>
      </footer>

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-md">
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl px-3 sm:px-4 py-2 shadow-lg shadow-slate-900/5 flex items-center justify-between">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'text-emerald-700 font-semibold'
                : 'text-slate-400 hover:text-slate-700'
            }`}
            title="Dashboard"
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px]">{lang === 'my' ? 'ပင်မ' : 'Home'}</span>
          </button>

          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'transactions'
                ? 'text-emerald-700 font-semibold'
                : 'text-slate-400 hover:text-slate-700'
            }`}
            title="Transactions"
          >
            <ArrowLeftRight className="w-5 h-5" />
            <span className="text-[10px]">{lang === 'my' ? 'စာရင်း' : 'Records'}</span>
          </button>

          <div className="-mt-6">
            <ClayFloatingCoinButton
              onClick={() => handleOpenAddTx('expense')}
              label={lang === 'my' ? 'စာရင်းသစ်' : 'Add'}
            />
          </div>

          <button
            onClick={() => setActiveTab('debts')}
            className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'debts'
                ? 'text-emerald-700 font-semibold'
                : 'text-slate-400 hover:text-slate-700'
            }`}
            title="Debts"
          >
            <HandCoins className="w-5 h-5" />
            <span className="text-[10px]">{lang === 'my' ? 'အကြွေး' : 'Debts'}</span>
          </button>

          <button
            onClick={() => setIsSidebarOpen(true)}
            className="flex flex-col items-center gap-0.5 p-1.5 rounded-xl text-slate-500 hover:text-slate-900 transition-all cursor-pointer active:scale-95"
            title="Menu & All Tabs"
          >
            <Menu className="w-5 h-5 text-slate-700" />
            <span className="text-[10px] font-bold text-slate-700">{lang === 'my' ? 'မီနူး' : 'Menu'}</span>
          </button>
        </div>
      </div>

      <TransactionModal
        isOpen={isTxModalOpen}
        initialType={txModalInitialType}
        initialWalletId={txModalInitialWalletId}
        initialModel={txModalInitialModel}
        editTransaction={editingTransaction || undefined}
        categories={categories}
        wallets={computedWallets}
        vehicles={vehicles}
        allTransactions={transactions}
        plan={plan}
        lang={lang}
        onClose={() => {
          setIsTxModalOpen(false);
          setEditingTransaction(null);
          setTxModalInitialWalletId(undefined);
          setTxModalInitialModel('general');
        }}
        onSubmit={handleAddTransaction}
        onOpenUpgrade={() => {
          setIsTxModalOpen(false);
          setIsPremiumModalOpen(true);
        }}
        onAddSubCategory={handleAddSubCategory}
        onManageCategories={() => {
          setIsTxModalOpen(false);
          setActiveTab('categories');
        }}
        onOpenAddVehicle={() => {
          setIsTxModalOpen(false);
          setActiveTab('vehicles');
        }}
      />

      <DebtModal
        isOpen={isDebtModalOpen}
        wallets={computedWallets}
        lang={lang}
        onClose={() => setIsDebtModalOpen(false)}
        onSubmit={handleAddDebt}
      />

      <RepaymentModal
        isOpen={isRepaymentModalOpen}
        debt={selectedDebtForRepayment}
        editingRepayment={editingRepayment}
        wallets={computedWallets}
        lang={lang}
        onClose={() => {
          setIsRepaymentModalOpen(false);
          setSelectedDebtForRepayment(null);
          setEditingRepayment(null);
        }}
        onSubmit={(debtId, amount, date, walletId, note, repaymentId) => {
          if (repaymentId) {
            handleEditRepayment(debtId, repaymentId, amount, date, walletId, note);
          } else {
            handleRecordRepaymentSubmit(debtId, amount, date, walletId, note);
          }
        }}
      />

      <React.Suspense fallback={null}>
        {isPremiumModalOpen && (
          <PremiumModal
            currentPlan={plan}
            isOpen={isPremiumModalOpen}
            onClose={() => setIsPremiumModalOpen(false)}
            onSelectPlan={(_newPlan) => {
              showToast(
                lang === 'my'
                  ? '✨ Premium အဆင့်သို့ အောင်မြင်စွာ ပြောင်းလဲပြီးပါပြီ'
                  : '✨ Upgraded to Premium Plan'
              );
            }}
            lang={lang}
            onOpenLogin={() => {
              setIsPremiumModalOpen(false);
              setIsAuthModalOpen(true);
            }}
          />
        )}

        {isPrivacyModalOpen && (
          <PrivacyModal
            isOpen={isPrivacyModalOpen}
            onClose={() => setIsPrivacyModalOpen(false)}
            lang={lang}
            logoStyle={logoStyle}
          />
        )}

        {isUserGuideModalOpen && (
          <UserGuideModal
            isOpen={isUserGuideModalOpen}
            onClose={() => setIsUserGuideModalOpen(false)}
            lang={lang}
            logoStyle={logoStyle}
          />
        )}

        {isShareAppModalOpen && (
          <ShareAppModal
            isOpen={isShareAppModalOpen}
            onClose={() => setIsShareAppModalOpen(false)}
            lang={lang}
          />
        )}

        {isVersionHistoryModalOpen && (
          <VersionHistoryModal
            isOpen={isVersionHistoryModalOpen}
            onClose={() => setIsVersionHistoryModalOpen(false)}
            lang={lang}
          />
        )}

        {isNotificationModalOpen && (
          <NotificationModal
            isOpen={isNotificationModalOpen}
            onClose={() => setIsNotificationModalOpen(false)}
            lang={lang}
            debts={debts}
            budgets={budgets}
            transactions={transactions}
            categories={categories}
            vehicles={vehicles}
            tireLogs={tirePressureLogs}
            maintenanceLogs={vehicleMaintenance}
            onNavigateTab={(tab) => setActiveTab(tab)}
            readNotificationIds={readNotificationIds}
            onMarkAsRead={handleMarkNotificationAsRead}
            onMarkAllAsRead={handleMarkAllNotificationsAsRead}
          />
        )}

        {isAdmin && isAdminPanelOpen && (
          <AdminPanel
            isOpen={isAdminPanelOpen}
            onClose={() => setIsAdminPanelOpen(false)}
            lang={lang}
            transactions={transactions}
            wallets={computedWallets}
            categories={categories}
          />
        )}
      </React.Suspense>

      {toastMessage && (
        <Toast
          message={toastMessage}
          onClose={() => setToastMessage(null)}
        />
      )}

      <GlobalSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        transactions={transactions}
        debts={debts}
        wallets={computedWallets}
        categories={categories}
        lang={lang}
        onNavigateToTab={(tab) => {
          setIsSearchModalOpen(false);
          setActiveTab(tab);
        }}
      />

      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        lang={lang}
        onManualSyncUp={handleManualSyncUp}
        onManualSyncDown={handleManualSyncDown}
        onOpenLoginScreen={() => setIsAuthModalOpen(true)}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
        pinSettings={pinSettings}
        onUpdatePinSettings={setPinSettings}
        onClearAllData={handleClearAllData}
        onOpenAdminPanel={handleOpenAdminPanel}
        plan={plan}
        onOpenPremium={() => setIsPremiumModalOpen(true)}
        onOpenPrivacy={() => setIsPrivacyModalOpen(true)}
        onOpenUserGuide={() => setIsUserGuideModalOpen(true)}
        onOpenVersionHistory={() => setIsVersionHistoryModalOpen(true)}
      />

      <ReconcileBalanceModal
        isOpen={isReconcileModalOpen}
        onClose={() => {
          setIsReconcileModalOpen(false);
          setSelectedWalletForReconcile(undefined);
        }}
        wallets={computedWallets}
        transactions={transactions}
        initialWalletId={selectedWalletForReconcile}
        lang={lang}
        onReconcile={handleReconcileBalance}
      />

           <PinSetupModal
        isOpen={isPinSetupModalOpen}
        onClose={() => setIsPinSetupModalOpen(false)}
        lang={lang}
        onSavePin={handleSavePinAndLock}
      />

      <DatabaseSyncTrackerModal
        isOpen={isDatabaseTrackerOpen}
        onClose={() => setIsDatabaseTrackerOpen(false)}
        lang={lang}
        transactions={transactions}
        wallets={computedWallets}
        debts={debts}
        cloudTxIds={cloudTxIds}
        onForcePushAll={handleForcePushAll}
        onForcePullAll={handleForcePullAll}
        onOpenLogin={() => setIsAuthModalOpen(true)}
        onOpenSyncHealth={() => setIsSyncHealthModalOpen(true)}
        onUpdateCloudTxIds={handleUpdateConfirmedCloudTxIds}
      />

      <SyncHealthModal
        isOpen={isSyncHealthModalOpen}
        onClose={() => setIsSyncHealthModalOpen(false)}
        lang={lang}
        transactions={transactions}
        cloudTxIds={cloudTxIds}
        debts={debts}
        wallets={computedWallets}
        activeWorkspaceId={activeWorkspaceId || undefined}
        onForcePushAll={handleForcePushAll}
        onForcePullAll={handleForcePullAll}
        onOpenDatabaseTracker={() => setIsDatabaseTrackerOpen(true)}
        onUpdateCloudTxIds={handleUpdateConfirmedCloudTxIds}
      />

      <SyncStatusDrawer
        isOpen={isSyncStatusDrawerOpen}
        onClose={() => setIsSyncStatusDrawerOpen(false)}
        lang={lang}
        transactions={transactions}
        cloudTxIds={cloudTxIds}
        categories={categories}
        onDeleteTransaction={handleDeleteTransaction}
      />

      {(isAuthModalOpen || showLoginModal) && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4">
          <div className="w-full min-h-screen sm:min-h-0 sm:max-w-lg">
            <LoginScreen
              lang={lang}
              onToggleLang={handleToggleLang}
              allowClose={true}
              logoStyle={logoStyle}
              onOpenPrivacy={() => setIsPrivacyModalOpen(true)}
              onOpenUserGuide={() => setIsUserGuideModalOpen(true)}
              onClose={() => {
                setIsAuthModalOpen(false);
                setShowLoginModal(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}