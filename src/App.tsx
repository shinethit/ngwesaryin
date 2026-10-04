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
import { RotateCcw, LayoutDashboard, ArrowLeftRight, HandCoins, Search, Cloud, Settings, KeyRound, Trash2, Download, Upload, Menu } from 'lucide-react';
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

// Helper to retry dynamic script imports if a network glitch occurs or after new build chunk deployment
function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    try {
      return await factory();
    } catch (error: any) {
      console.warn('Module import error, retrying once...', error);
      try {
        await new Promise((resolve) => setTimeout(resolve, 800));
        return await factory();
      } catch (retryError) {
        const lastReload = sessionStorage.getItem('chunk_reload_attempted_at');
        const now = Date.now();
        if (!lastReload || now - Number(lastReload) > 30000) {
          sessionStorage.setItem('chunk_reload_attempted_at', String(now));
          window.location.reload();
        }
        throw retryError;
      }
    }
  });
}

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

// Deleted transaction persistence set helper to prevent resurrected transactions
const markTxDeleted = (id: string) => {
  try {
    const saved = safeGetItem('ngwe_deleted_tx_ids');
    const set = saved ? new Set<string>(JSON.parse(saved)) : new Set<string>();
    set.add(id);
    safeSetItem('ngwe_deleted_tx_ids', JSON.stringify(Array.from(set)));
  } catch {}
};

const unmarkTxDeleted = (id: string) => {
  try {
    const saved = safeGetItem('ngwe_deleted_tx_ids');
    if (!saved) return;
    const set = new Set<string>(JSON.parse(saved));
    set.delete(id);
    safeSetItem('ngwe_deleted_tx_ids', JSON.stringify(Array.from(set)));
  } catch {}
};

const isTxDeleted = (id: string): boolean => {
  try {
    const saved = safeGetItem('ngwe_deleted_tx_ids');
    if (!saved) return false;
    const set = new Set<string>(JSON.parse(saved));
    return set.has(id);
  } catch {
    return false;
  }
};

const markWalletDeleted = (id: string) => {
  try {
    const saved = safeGetItem('ngwe_deleted_wallet_ids');
    const set = saved ? new Set<string>(JSON.parse(saved)) : new Set<string>();
    set.add(id);
    safeSetItem('ngwe_deleted_wallet_ids', JSON.stringify(Array.from(set)));
  } catch {}
};

const unmarkWalletDeleted = (id: string) => {
  try {
    const saved = safeGetItem('ngwe_deleted_wallet_ids');
    if (!saved) return;
    const set = new Set<string>(JSON.parse(saved));
    if (set.has(id)) {
      set.delete(id);
      safeSetItem('ngwe_deleted_wallet_ids', JSON.stringify(Array.from(set)));
    }
  } catch {}
};

const isWalletDeleted = (id: string): boolean => {
  try {
    const saved = safeGetItem('ngwe_deleted_wallet_ids');
    if (!saved) return false;
    const set = new Set<string>(JSON.parse(saved));
    return set.has(id);
  } catch {
    return false;
  }
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

  // 🔧 One-time migration: legacy raw string ('my'/'en') ကို ရှင်း
if (typeof window !== 'undefined') {
  const legacy = localStorage.getItem('ngwe_lang');
  if (legacy === 'my' || legacy === 'en') {
    localStorage.removeItem('ngwe_lang');
  }
}

  const [lang, setLang] = usePersistedState<'my' | 'en'>('ngwe_lang', 'my');

  const [activeTab, setActiveTab] = useState<string>('dashboard');

  const [dataScope, setDataScope] = usePersistedState<DataScope>('ngwe_data_scope', 'all');

  const handleSetDataScope = (scope: DataScope) => {
    setDataScope(scope);
  };

  const [transactions, setTransactions] = usePersistedState<Transaction[]>('ngwe_transactions', []);
  
  // Custom initialization for deduplication
  const [transactionsState, setTransactionsState] = useState<Transaction[]>(() => {
    const saved = transactions;
    return saved ? deduplicateById(saved) : [];
  });
  
  // Override setTransactions for deduplication
  const updateTransactions = (newTransactions: Transaction[]) => {
    setTransactions(deduplicateById(newTransactions));
  };

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

  const lastResumeSyncAtRef = useRef<number>(0);
  const walletPushRequestedRef = useRef<Set<string>>(new Set());

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
    const todayStr = new Date().toISOString().split('T')[0];
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
    const todayStr = new Date().toISOString().split('T')[0];
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

    budgets.forEach((budget) => {
      const spent = spendingByCategory[budget.categoryId] || 0;
      const limit = budget.value;
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
      showToast(lang === 'my' ? 'Cloud ပေါ်သို့ အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ ✓' : 'Synced to Cloud successfully ✓');
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
  };

  const handleForcePushAll = async (): Promise<boolean> => {
    if (!user) {
      setIsAuthModalOpen(true);
      return false;
    }
    const targetUid = activeWorkspaceId || user.uid;
    const ownWallets = computedWallets.filter((w) => !w.isSharedFromOther && !w.id.startsWith('shared_'));
    
    // 1. Target all pending or local transactions
    const pendingTxs = transactions.filter((t) => t && t.id && (!cloudTxIds.has(t.id) || isTxDeleted(t.id)));
    const txsToPush = pendingTxs;

    if (txsToPush.length === 0) {
      showToast(lang === 'my' ? 'Cloud နှင့် အချက်အလက်များ ကိုက်ညီပြီးဖြစ်သည် (အသစ်တင်ရန် မရှိပါ) ✓' : 'Already in sync with Cloud (no changes to upload) ✓');
      return true;
    }

    const opId = recordSyncOperationStart('push', `Force push ${txsToPush.length} transactions to Cloud`, txsToPush.length, targetUid);

    try {
      // Clear any deletion flags for live pushed items
      txsToPush.forEach((tx) => unmarkTxDeleted(tx.id));

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
          const { pushTransactionsDirectHttp } = await import('./lib/directFirestoreHttp');
          const httpRes = await pushTransactionsDirectHttp(remainingPendingTxs, targetUid);
          if (httpRes.pushedCount > 0 && httpRes.succeededIds.length > 0) {
            httpPushedCount = httpRes.succeededIds.length;
            // Confirm/remove only succeededIds
            httpRes.succeededIds.forEach((sId) => syncQueue.remove('transactions', sId));
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
          setTransactions((prevLocal) => {
            const map = new Map<string, Transaction>();
            prevLocal.forEach((t) => {
              if (t && t.id && !isTxDeleted(t.id)) map.set(t.id, t);
            });
            cloudData.transactions?.forEach((t: any) => {
              if (t && t.id) {
                unmarkTxDeleted(t.id);
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
              if (d && d.id) map.set(d.id, d);
            });
            cloudData.debts?.forEach((d: any) => {
              if (d && d.id) {
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
              if (w && w.id && !isWalletDeleted(w.id)) map.set(w.id, w);
            });
            cloudData.wallets?.forEach((w: any) => {
              if (w && w.id && !isWalletDeleted(w.id)) {
                const existing = map.get(w.id);
                map.set(w.id, { ...(existing as any), ...(w as any) } as Wallet);
              }
            });
            if (map.size === 0) {
              INITIAL_WALLETS.forEach((w) => {
                if (!isWalletDeleted(w.id)) map.set(w.id, w);
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
              if (c && c.id) {
                const existing = map.get(c.id);
                map.set(c.id, {
                  ...(existing as any),
                  ...(c as any),
                  subCategories: (c.subCategories && c.subCategories.length > 0) ? c.subCategories : existing?.subCategories,
                } as Category);
              }
            });
            cloudData.categories?.forEach((c: any) => {
              if (c && c.id) {
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
            prevLocal.forEach((b) => map.set(b.categoryId, b));
            (cloudData.budgets as any[])?.forEach((b: any) => {
              if (b && b.categoryId) {
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
              if (s && s.id) map.set(s.id, s);
            });
            cloudData.shops?.forEach((s: any) => {
              if (s && s.id) {
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
            prevLocal.forEach((v) => { if (v && v.id) map.set(v.id, v); });
            cloudData.vehicles?.forEach((v: any) => {
              if (v && v.id) {
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
            prevLocal.forEach((f) => { if (f && f.id) map.set(f.id, f); });
            cloudData.fuelLogs?.forEach((f: any) => {
              if (f && f.id) {
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
            prevLocal.forEach((m) => { if (m && m.id) map.set(m.id, m); });
            cloudData.maintenanceLogs?.forEach((m: any) => {
              if (m && m.id) {
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
            prevLocal.forEach((t) => { if (t && t.id) map.set(t.id, t); });
            cloudData.tireLogs?.forEach((t: any) => {
              if (t && t.id) {
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

        // =============================================================
  // iOS PWA: Force-flush pending Firestore writes before suspend
  // =============================================================
  // iOS PWA suspends JS almost immediately when backgrounded.
  // This listener ensures pending writes are flushed to the
  // network layer before the app is suspended.
  // =============================================================
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const flushPendingWrites = async () => {
      try {
        const { waitForPendingWrites } = await import('firebase/firestore');
        await Promise.race([
          waitForPendingWrites(db),
          new Promise((resolve) => setTimeout(resolve, 2000)),
        ]);
      } catch (err) {
        console.warn('[iOS PWA] Flush pending writes notice:', err);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
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
            const merged = mergeById(prevLocal, cloudDebts);
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
    if (force || window.confirm(lang === 'my' ? 'လက်ရှိ ဒေတာအားလုံး (ငွေစာရင်းများ၊ အကြွေးစာရင်းများ၊ ဘတ်ဂျက်များ၊ ယာဉ်စာရင်းများနှင့် Wallet များ) ကို အပြီးတိုင် ဖျက်ပစ်မည်မှာ သေချာပါသလား? (ဤလုပ်ဆောင်ချက်ကို နောက်ပြန်ဆုတ်၍ မရပါ)' : 'Are you sure you want to permanently delete ALL data? This cannot be undone.')) {
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

  // Initialize app: version check and daily reminder
  useEffect(() => {
    // 1. Version check
    const savedVersion = safeGetItem('ngwe_app_version');
    if (savedVersion !== CURRENT_APP_VERSION) {
      setIsVersionHistoryModalOpen(true);
      safeSetItem('ngwe_app_version', CURRENT_APP_VERSION);
    }

    // 2. 9 PM Daily Reminder
    const scheduleReminder = () => {
      const now = new Date();
      const ninePM = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 21, 0, 0);
      let delay = ninePM.getTime() - now.getTime();
      if (delay < 0) delay += 24 * 60 * 60 * 1000;

      setTimeout(() => {
        if (Notification.permission === 'granted') {
          new Notification(lang === 'my' ? 'ငွေစာရင်းသွင်းရန် အချိန်ကျပါပြီ' : 'Time to record transactions!', {
            body: lang === 'my' ? 'ဒီနေ့ရဲ့ ဝင်ငွေ/ထွက်ငွေတွေကို မှတ်တမ်းတင်လိုက်ပါ။' : 'Record your income/expense for today.',
          });
        }
        setInterval(() => {
          if (Notification.permission === 'granted') {
            new Notification(lang === 'my' ? 'ငွေစာရင်းသွင်းရန် အချိန်ကျပါပြီ' : 'Time to record transactions!', {
              body: lang === 'my' ? 'ဒီနေ့ရဲ့ ဝင်ငွေ/ထွက်ငွေတွေကို မှတ်တမ်းတင်လိုက်ပါ။' : 'Record your income/expense for today.',
            });
          }
        }, 24 * 60 * 60 * 1000);
      }, delay);
    };

    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') scheduleReminder();
      });
    }
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
    a.download = `ngwesaryin_backup_${new Date().toISOString().split('T')[0]}.json`;
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
          const { deleteTransactionDirectHttp } = await import('./lib/directFirestoreHttp');
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

  const handleAddDebt = (newDebt: Omit<Debt, 'id' | 'paidAmount' | 'repayments' | 'status' | 'createdAt'>) => {
    const id = `debt_${Date.now()}`;
    const debt: Debt = {
      ...newDebt,
      id,
      paidAmount: 0,
      repayments: [],
      status: 'active',
      createdAt: Date.now(),
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
    setDebts((prev) => {
      const next = prev.filter((d) => d.id !== id);
      safeSetItem('ngwe_debts', JSON.stringify(next));
      return next;
    });

    const txId = `tx_debt_${id}`;
    markTxDeleted(txId);
    setTransactions((prev) => {
      const next = prev.filter((t) => t.id !== txId && !t.id.startsWith(`tx_rep_${id}`));
      safeSetItem('ngwe_transactions', JSON.stringify(next));
      return next;
    });

    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      safeDeleteDoc(doc(db, 'users', targetUid, 'debts', id));
      safeDeleteDoc(doc(db, 'users', targetUid, 'transactions', txId));
    }

    showToast(lang === 'my' ? 'အကြွေးစာရင်းကို ဖျက်လိုက်ပါပြီ' : 'Debt record deleted');
  };

  const handleToggleDebtStatus = (id: string) => {
    setDebts((prev) => {
      const next = prev.map((d) => {
        if (d.id === id) {
          const newStatus = d.status === 'active' ? 'settled' : 'active';
          let updatedRepayments = d.repayments || [];

          if (newStatus === 'settled') {
            const currentPaid = updatedRepayments.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
            const remaining = d.totalAmount - currentPaid;
            if (remaining > 0) {
              const settlementRepayment: Repayment = {
                id: `rep_settle_${Date.now()}`,
                amount: remaining,
                date: new Date().toISOString().split('T')[0],
                walletId: d.walletId,
                note: lang === 'my' ? '[အကြွေးကျေဇယား အလိုအလျောက် ပေးဆပ်မှု]' : '[Auto settlement repayment]',
                createdAt: Date.now(),
              };
              updatedRepayments = [settlementRepayment, ...updatedRepayments];
            }
          } else {
            updatedRepayments = updatedRepayments.filter((r) => !r.id.startsWith('rep_settle_'));
          }

          const newPaid = updatedRepayments.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

          const updatedDebt: Debt = {
            ...d,
            status: newStatus,
            repayments: updatedRepayments,
            paidAmount: newPaid,
          };

          if (user?.uid) {
            const targetUid = activeWorkspaceId || user.uid;
            safeSetDoc(doc(db, 'users', targetUid, 'debts', id), {
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
  };

  const handleRecordRepaymentSubmit = (
    debtId: string,
    amount: number,
    date: string,
    walletId: string,
    note?: string
  ) => {
    const targetDebt = debts.find((d) => d.id === debtId);
    if (targetDebt) {
      const currentPaid = (targetDebt.repayments && targetDebt.repayments.length > 0)
        ? targetDebt.repayments.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
        : (targetDebt.paidAmount || 0);
      const remaining = Math.max(0, targetDebt.totalAmount - currentPaid);
      if (amount > remaining) {
        const overAmount = amount - remaining;
        const confirmMsg = lang === 'my'
          ? `ထည့်သွင်းမည့် ငွေပမာဏ (${amount.toLocaleString()} Ks) သည် ပေးရန်ကျန်ငွေ (${remaining.toLocaleString()} Ks) ထက် ${overAmount.toLocaleString()} Ks ပိုလွန်နေပါသည်။ ဤမှတ်တမ်းအတိုင်း ဆက်လက် သိမ်းဆည်းမည်လား?`
          : `This is ${overAmount.toLocaleString()} more than the remaining balance of ${remaining.toLocaleString()} — record it anyway?`;
        if (!window.confirm(confirmMsg)) {
          return;
        }
      }

      const isReceivable = targetDebt.type === 'receivable';
      const repTxId = `tx_rep_${Date.now()}`;
      const repTx: Transaction = {
        id: repTxId,
        type: isReceivable ? 'income' : 'expense',
        amount,
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

    setDebts((prev) => {
      const next = prev.map((d) => {
        if (d.id === debtId) {
          const newRepayment = {
            id: `rep_${Date.now()}`,
            amount,
            date,
            walletId,
            note,
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

    showToast(lang === 'my' ? 'ငွေဆပ်မှတ်တမ်း ဖျက်လိုက်ပါပြီ ✓' : 'Repayment deleted ✓');
  };

  const handleAddWallet = (walletData: Omit<Wallet, 'id'>) => {
    const ownWalletsCount = wallets.filter((w) => !w.isSharedFromOther).length;
    if (ownWalletsCount >= limits.maxWallets) {
      if (plan === 'guest') {
        if (window.confirm(lang === 'my'
          ? 'Guest Mode တွင် Wallet (၁) ခုသာ အသုံးပြုနိုင်ပါသည်။ အကောင့်သစ် ထပ်တိုးရန် Google Account ဖြင့် Sign in ပြုလုပ်ပါ'
          : 'Guest Mode allows 1 wallet only. Please Sign in with Google to add more wallets.')) {
          setIsAuthModalOpen(true);
        }
        return;
      }
      setIsPremiumModalOpen(true);
      return;
    }
    const id = `wallet_${Date.now()}`;
    const newWallet = { ...walletData, id };
    unmarkWalletDeleted(id);
    setWallets((prev) => [...prev, newWallet]);
    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      safeSetDoc(doc(db, 'users', targetUid, 'wallets', id), {
        ...newWallet,
        userId: targetUid,
      }, { merge: true });
    }
    showToast(lang === 'my' ? 'အကောင့်သစ် ထည့်သွင်းပြီးပါပြီ' : 'Wallet added successfully');
  };

  const handleUpdateWallet = (updatedWallet: Wallet) => {
    setWallets((prev) => {
      const next = prev.map((w) => (w.id === updatedWallet.id ? updatedWallet : w));
      safeSetItem('ngwe_wallets', JSON.stringify(next));
      return next;
    });
    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      safeSetDoc(doc(db, 'users', targetUid, 'wallets', updatedWallet.id), {
        ...updatedWallet,
        userId: targetUid,
      }, { merge: true });
    }
    if (user && (updatedWallet.isSharedFromOther || (updatedWallet.sharedWith && updatedWallet.sharedWith.length > 0))) {
      syncSharedWalletToCloud(updatedWallet, user);
    }
    showToast(lang === 'my' ? 'အကောင့် အချက်အလက် ပြင်ဆင်ပြီးပါပြီ ✓' : 'Wallet updated successfully ✓');
  };

  const handleDeleteWallet = async (walletId: string) => {
    const target = wallets.find((w) => w.id === walletId);
    if (!target) return;

    // 1. COLLABORATOR LEAVING SHARED WALLET
    if (target.isSharedFromOther) {
      if (
        window.confirm(
          lang === 'my'
            ? `ဤ Shared Wallet (${target.name}) မှ ထွက်ခွာမည်မှာ သေချာပါသလား?\n(မှတ်ချက် - Shared Wallet ကို ပိုင်ရှင်သာ ဖျက်ပိုင်ခွင့်ရှိပြီး၊ ဖိတ်ခေါ်ခံထားရသူသည် ထွက်ခွာခြင်းသာ ပြုလုပ်နိုင်ပါသည်)`
            : `Are you sure you want to leave this shared wallet (${target.nameEn || target.name})?`
        )
      ) {
        if (user?.email) {
          await leaveSharedWallet(walletId, user.email, target.sharedDocId, target.ownerUid);
        }
        setWallets((prev) => prev.filter((w) => w.id !== walletId));
        showToast(lang === 'my' ? 'Shared Wallet မှ ထွက်ခွာပြီးပါပြီ' : 'Left shared wallet');
      }
      return;
    }

    // 2. OWNER DELETING WALLET
    const ownWallets = wallets.filter((w) => !w.isSharedFromOther);
    if (ownWallets.length <= 1) {
      alert(
        lang === 'my'
          ? 'အနည်းဆုံး Wallet တစ်ခု ရှိရပါမည်။ ဤ Wallet ကို မဖျက်မီ အခြား Wallet တစ်ခု အရင်ထည့်သွင်းပါ'
          : 'At least one wallet is required. Please add another wallet before deleting this one.'
      );
      return;
    }

    const fallbackWallet =
      ownWallets.find((w) => w.id !== walletId && w.isDefault) ||
      ownWallets.find((w) => w.id !== walletId);

    if (!fallbackWallet) {
      alert(lang === 'my' ? 'အနည်းဆုံး အကောင့်တစ်ခု ရှိရပါမည်။' : 'At least one wallet is required.');
      return;
    }

    const isShared = Boolean(target.sharedWith && target.sharedWith.length > 0);
    const relatedTxCount = transactions.filter((t) => t.walletId === walletId).length;

    let confirmMsg = '';
    if (lang === 'my') {
      confirmMsg = `ဤအကောင့် (${target.name}) ကို ဖျက်ရန် သေချာပါသလား?`;
      if (isShared) {
        confirmMsg += `\n⚠️ ဤ Wallet ကို ပိုင်ရှင်မှ ဖျက်လိုက်ပါက မျှဝေထားသော သူများအားလုံးထံမှလည်း အပြီးတိုင် ပျက်သွားပါမည်။`;
      }
      if (relatedTxCount > 0) {
        confirmMsg += `\nရှိပြီးသား စာရင်းမှတ်တမ်း ${relatedTxCount} ခုကို '${fallbackWallet.name}' သို့ အလိုအလျောက် ပြောင်းရွှေ့ပေးပါမည်။`;
      }
    } else {
      confirmMsg = `Are you sure you want to delete this wallet (${target.nameEn || target.name})?`;
      if (isShared) {
        confirmMsg += `\n⚠️ Deleting as owner will remove it from all shared collaborators immediately.`;
      }
      if (relatedTxCount > 0) {
        confirmMsg += `\n${relatedTxCount} transactions will be reassigned to '${fallbackWallet.nameEn || fallbackWallet.name}'.`;
      }
    }

    if (!window.confirm(confirmMsg)) {
      return;
    }

    let updatedTransactions = transactions;
    if (relatedTxCount > 0) {
      updatedTransactions = transactions.map((t) =>
        t.walletId === walletId ? { ...t, walletId: fallbackWallet.id } : t
      );
      setTransactions(updatedTransactions);
      safeSetItem('ngwe_transactions', JSON.stringify(updatedTransactions));
      if (user?.uid) {
        const targetUid = activeWorkspaceId || user.uid;
        updatedTransactions.filter(t => t.walletId === fallbackWallet.id).forEach(t => {
          safeSetDoc(doc(db, 'users', targetUid, 'transactions', t.id), {
            ...t,
            walletId: fallbackWallet.id,
            userId: targetUid,
          }, { merge: true });
        });
      }
    }

    markWalletDeleted(walletId);
    if (target.originalId) markWalletDeleted(target.originalId);
    if (target.sharedDocId) markWalletDeleted(target.sharedDocId);

    const updatedWallets = wallets
      .filter((w) => w.id !== walletId)
      .map((w) => (w.id === fallbackWallet.id && target.isDefault ? { ...w, isDefault: true } : w));
    setWallets(updatedWallets);
    safeSetItem('ngwe_wallets', JSON.stringify(updatedWallets));

    if (user) {
      await deleteSharedWalletDoc(walletId, user.uid, target.sharedDocId, target.originalId);
      await deleteUserWalletFromCloud(user.uid, walletId, target.originalId);
    }

    showToast(
      lang === 'my'
        ? (isShared ? 'Shared Wallet ကို အပြီးဖျက်လိုက်ပါပြီ' : 'အကောင့် ဖျက်လိုက်ပါပြီ')
        : 'Wallet deleted successfully'
    );
  };

  const handleAddShop = (shopData: Omit<ShopContact, 'id' | 'userId' | 'createdAt'>) => {
    const id = `shop_${Date.now()}`;
    const newShop: ShopContact = {
      ...shopData,
      id,
      userId: user?.uid || 'guest',
      createdAt: Date.now(),
    };
    setShops((prev) => [newShop, ...prev]);

    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      safeSetDoc(doc(db, 'users', targetUid, 'shops', id), {
        ...newShop,
        userId: targetUid,
      }, { merge: true });
    }

    showToast(lang === 'my' ? 'ဆိုင်အသစ် ထည့်သွင်းပြီးပါပြီ ✓' : 'Shop added successfully ✓');
  };

  const handleUpdateShop = (updatedShop: ShopContact) => {
    setShops((prev) =>
      prev.map((s) => (s.id === updatedShop.id ? updatedShop : s))
    );

    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      safeSetDoc(doc(db, 'users', targetUid, 'shops', updatedShop.id), {
        ...updatedShop,
        userId: targetUid,
      }, { merge: true });
    }

    showToast(lang === 'my' ? 'ဆိုင်အချက်အလက် ပြင်ဆင်ပြီးပါပြီ ✓' : 'Shop updated successfully ✓');
  };

  const handleDeleteShop = (shopId: string) => {
    setShops((prev) => prev.filter((s) => s.id !== shopId));

    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      safeDeleteDoc(doc(db, 'users', targetUid, 'shops', shopId));
    }

    showToast(lang === 'my' ? 'ဆိုင်အချက်အလက် ဖျက်ပြီးပါပြီ ✓' : 'Shop deleted successfully ✓');
  };

  // ==========================================
  // Vehicle Management Handlers & Wallet Sync
  // ==========================================
  const handleSaveVehicle = (vehicle: Vehicle) => {
    const vehId = vehicle.id || `veh_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const fullVehicle: Vehicle = {
      ...vehicle,
      id: vehId,
      createdAt: vehicle.createdAt || Date.now(),
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
    const log: FuelLog = { ...logData, id: logId, transactionId: txId, createdAt: logData.createdAt || Date.now() };

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
    const maint: VehicleMaintenance = { ...maintData, id: maintId, transactionId: txId, createdAt: maintData.createdAt || Date.now() };

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
    const log: TirePressureLog = { ...logData, id: tireId, transactionId: txId, createdAt: logData.createdAt || Date.now() };

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

  const handleUpdateWalletBalance = (id: string, newBalance: number) => {
    const target = computedWallets.find((w) => w.id === id);
    if (!target) return;
    const currentLiveBalance = target.balance;
    const diff = newBalance - currentLiveBalance;
    setWallets((prev) => {
      const next = prev.map((w) => {
        if (w.id === id) {
          const oldInitial = w.initialBalance ?? 0;
          return { ...w, initialBalance: oldInitial + diff, balance: newBalance };
        }
        return w;
      });
      safeSetItem('ngwe_wallets', JSON.stringify(next));
      if (user?.uid) {
        const targetUid = activeWorkspaceId || user.uid;
        const updatedW = next.find((w) => w.id === id);
        if (updatedW) {
          safeSetDoc(doc(db, 'users', targetUid, 'wallets', id), {
            ...updatedW,
            userId: targetUid,
          }, { merge: true });
          if (updatedW.isSharedFromOther || (updatedW.sharedWith && updatedW.sharedWith.length > 0)) {
            syncSharedWalletToCloud(updatedW, user);
          }
        }
      }
      return next;
    });
    showToast(lang === 'my' ? 'လက်ကျန်ငွေ ပြင်ဆင်ပြီးပါပြီ' : 'Balance updated');
  };

  const handleTransferFunds = (
    fromWalletId: string,
    toWalletId: string,
    amount: number,
    note?: string
  ) => {
    const cleanAmount = Math.abs(Number(amount) || 0);
    if (!cleanAmount || cleanAmount <= 0) return;

    const fromWallet = computedWallets.find((w) => isWalletMatch(w, fromWalletId)) || wallets.find((w) => isWalletMatch(w, fromWalletId));
    const toWallet = computedWallets.find((w) => isWalletMatch(w, toWalletId)) || wallets.find((w) => isWalletMatch(w, toWalletId));
    const fromName = fromWallet ? (lang === 'my' ? fromWallet.name : (fromWallet.nameEn || fromWallet.name)) : 'Wallet';
    const toName = toWallet ? (lang === 'my' ? toWallet.name : (toWallet.nameEn || toWallet.name)) : 'Wallet';

    const nowStr = new Date().toISOString().split('T')[0];
    const outId = `tx_tf_out_${Date.now()}`;
    const inId = `tx_tf_in_${Date.now() + 1}`;

    const outTx: Transaction = {
      id: outId,
      type: 'expense',
      amount: cleanAmount,
      category: 'cat_transfer',
      subCategoryId: 'sub_tf_out',
      date: nowStr,
      note: `[ငွေလွှဲထွက်] ➔ ${toName}${note ? ` (${note})` : ''}`,
      walletId: fromWallet?.id || fromWalletId,
      isTransfer: true,
      transferType: 'transfer_out',
      transferPairId: inId,
      createdAt: Date.now(),
    };

    const inTx: Transaction = {
      id: inId,
      type: 'income',
      amount: cleanAmount,
      category: 'cat_transfer',
      subCategoryId: 'sub_tf_in',
      date: nowStr,
      note: `[ငွေလွှဲဝင်] ⬅ ${fromName}${note ? ` (${note})` : ''}`,
      walletId: toWallet?.id || toWalletId,
      isTransfer: true,
      transferType: 'transfer_in',
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

      if (fromWallet && (fromWallet.isSharedFromOther || (fromWallet.sharedWith && fromWallet.sharedWith.length > 0))) {
        saveSharedWalletTransaction(fromWallet.id, outTx, fromWallet.balance, getSharedWalletDocId(fromWallet, user.uid), user.uid);
      }
      if (toWallet && (toWallet.isSharedFromOther || (toWallet.sharedWith && toWallet.sharedWith.length > 0))) {
        saveSharedWalletTransaction(toWallet.id, inTx, toWallet.balance, getSharedWalletDocId(toWallet, user.uid), user.uid);
      }
    }

    showToast(lang === 'my' ? 'ငွေလွှဲပြောင်းပြီးပါပြီ ✓' : 'Transfer successful ✓');
  };

  const handleShareWallet = async (walletId: string, email: string) => {
    if (!limits.hasWalletSharing || plan === 'guest') {
      if (window.confirm(lang === 'my'
        ? 'Guest Mode တွင် Wallet မျှဝေခြင်း မရရှိနိုင်ပါ။ Google Account ဖြင့် Sign in ပြုလုပ်ပါ'
        : 'Wallet sharing is not available in Guest mode. Please Sign in with Google.')) {
        setIsAuthModalOpen(true);
      }
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const target = wallets.find((w) => w.id === walletId);
    if (!target) return;

    const currentShared = target.sharedWith || [];
    if (currentShared.includes(cleanEmail)) {
      showToast(lang === 'my' ? 'ဤ Email သည် ထည့်သွင်းပြီးသား ဖြစ်ပါသည်' : 'This email is already added');
      return;
    }

    const updatedShared = [...currentShared, cleanEmail];
    const updatedPerms = {
      ...(target.collaboratorPermissions || {}),
      [cleanEmail]: DEFAULT_WALLET_PERMISSIONS,
    };
    const scopedDocId = `${user?.uid}_${walletId}`;
    const liveTarget = computedWallets.find((cw) => cw.id === walletId) || target;
    const updatedWallet: Wallet = {
      ...target,
      balance: liveTarget.balance,
      sharedWith: updatedShared,
      collaboratorPermissions: updatedPerms,
      sharedDocId: target.sharedDocId || scopedDocId,
      ownerUid: target.ownerUid || user?.uid,
      ownerEmail: target.ownerEmail || user?.email || '',
      ownerName: target.ownerName || user?.displayName || user?.email?.split('@')[0] || 'Owner',
    };

    const nextWallets = wallets.map((w) => (w.id === walletId ? updatedWallet : w));
    setWallets(nextWallets);
    safeSetItem('ngwe_wallets', JSON.stringify(nextWallets));

    if (user) {
      await addCollaborator(cleanEmail).catch((err) => console.warn('Failed to add collaborator for security rules:', err));

      const txs = transactions.filter((t) => isWalletMatch(target, t.walletId));
      await syncSharedWalletToCloud(updatedWallet, user, txs);
      safeSetDoc(doc(db, 'users', user.uid, 'wallets', updatedWallet.id), {
        ...updatedWallet,
        userId: user.uid,
      }, { merge: true });
    }
    showToast(lang === 'my' ? `${cleanEmail} သို့ Wallet မျှဝေလိုက်ပါပြီ ✓` : `Wallet shared with ${cleanEmail} ✓`);
  };

  const handleUnshareWallet = async (walletId: string, email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const target = wallets.find((w) => w.id === walletId);
    if (!target) return;

    const updatedShared = (target.sharedWith || []).filter((e) => e.toLowerCase() !== cleanEmail);
    const updatedPerms = { ...(target.collaboratorPermissions || {}) };
    delete updatedPerms[cleanEmail];
    const updatedWallet: Wallet = {
      ...target,
      sharedWith: updatedShared,
      collaboratorPermissions: updatedPerms,
    };

    const nextWallets = wallets.map((w) => (w.id === walletId ? updatedWallet : w));
    setWallets(nextWallets);
    safeSetItem('ngwe_wallets', JSON.stringify(nextWallets));

    if (user) {
      await syncSharedWalletToCloud(updatedWallet, user);
      safeSetDoc(doc(db, 'users', user.uid, 'wallets', updatedWallet.id), {
        ...updatedWallet,
        userId: user.uid,
      }, { merge: true });

      const otherWalletsWithCollab = wallets.filter(
        (w) => w.id !== walletId && !w.isSharedFromOther && w.sharedWith?.map((e) => e.toLowerCase()).includes(cleanEmail)
      );
      if (otherWalletsWithCollab.length === 0) {
        await removeCollaborator(cleanEmail).catch((err) => console.warn('Failed to remove collaborator from root:', err));
      }
    }
    showToast(lang === 'my' ? 'မျှဝေမှု ဖယ်ရှားလိုက်ပါပြီ' : 'Sharing removed');
  };

  const handleUpdateWalletPermissions = async (
    walletId: string,
    email: string,
    permissions: WalletPermissions
  ) => {
    const cleanEmail = email.trim().toLowerCase();
    const target = wallets.find((w) => w.id === walletId);
    if (!target) return;

    const updatedPerms = {
      ...(target.collaboratorPermissions || {}),
      [cleanEmail]: permissions,
    };
    const updatedWallet: Wallet = {
      ...target,
      collaboratorPermissions: updatedPerms,
    };

    setWallets((prev) =>
      prev.map((w) => (w.id === walletId ? updatedWallet : w))
    );

    if (user) {
      await syncSharedWalletToCloud(updatedWallet, user);
    }
    showToast(lang === 'my' ? 'ခွင့်ပြုချက်များကို သိမ်းဆည်းလိုက်ပါပြီ ✓' : 'Permissions saved successfully ✓');
  };

  const handleReconcileBalance = (
    walletId: string,
    actualBalance: number,
    recordTransaction: boolean,
    note?: string
  ) => {
    const targetWallet = computedWallets.find((w) => w.id === walletId);
    const prevBalance = targetWallet?.balance || 0;
    const difference = actualBalance - prevBalance;

    if (!recordTransaction) {
      setWallets((prev) => {
        const next = prev.map((w) => {
          if (w.id === walletId) {
            const newInitial = (w.initialBalance ?? 0) + difference;
            return { ...w, initialBalance: newInitial, balance: actualBalance };
          }
          return w;
        });
        safeSetItem('ngwe_wallets', JSON.stringify(next));
        if (user?.uid) {
          const targetUid = activeWorkspaceId || user.uid;
          const updatedW = next.find((w) => w.id === walletId);
          if (updatedW) {
            safeSetDoc(doc(db, 'users', targetUid, 'wallets', walletId), {
              ...updatedW,
              userId: targetUid,
            }, { merge: true });
            if (updatedW.isSharedFromOther || (updatedW.sharedWith && updatedW.sharedWith.length > 0)) {
              syncSharedWalletToCloud(updatedW, user);
            }
          }
        }
        return next;
      });
    }

    if (recordTransaction && difference !== 0) {
      const isIncome = difference > 0;
      const absDiff = Math.abs(difference);
      const walletName = targetWallet
        ? lang === 'my'
          ? targetWallet.name
          : targetWallet.nameEn || targetWallet.name
        : 'Wallet';

      const adjCategory =
        categories.find((c) =>
          isIncome
            ? c.id === 'other_income' || c.type === 'income'
            : c.id === 'other_expense' || c.type === 'expense'
        ) || (isIncome ? categories[0] : categories[1]);

      const newTx: Transaction = {
        id: `reconcile_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: isIncome ? 'income' : 'expense',
        amount: absDiff,
        category: adjCategory?.id || 'other',
        date: new Date().toISOString().split('T')[0],
        note: note
          ? `[စာရင်းညှိ] ${note} (${walletName})`
          : isIncome
          ? `[စာရင်းညှိ] လက်ကျန်ငွေ ပိုငွေညှိချက် (${walletName})`
          : `[စာရင်းညှိ] လက်ကျန်ငွေ လိုငွေညှိချက် (${walletName})`,
        walletId: walletId,
        createdAt: Date.now(),
      };

      setTransactions((prev) => {
        const next = [newTx, ...prev];
        safeSetItem('ngwe_transactions', JSON.stringify(next));
        return next;
      });

      if (user?.uid) {
        const targetUid = activeWorkspaceId || user.uid;
        safeSetDoc(doc(db, 'users', targetUid, 'transactions', newTx.id), {
          ...newTx,
          userId: targetUid,
        }, { merge: true });
      }
    }

    showToast(
      lang === 'my'
        ? 'ငွေစာရင်း လက်ကျန်ငွေကို အောင်မြင်စွာ ညှိပြီးပါပြီ ✓'
        : 'Wallet balance reconciled successfully ✓'
    );
  };

  const handleLockApp = () => {
    if (pinSettings.isEnabled && pinSettings.pin && pinSettings.pin.length === 4) {
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

  const handleAddBudget = (config: BudgetConfig) => {
    setBudgets((prev) => {
      const filtered = prev.filter((b) => b.categoryId !== config.categoryId);
      return [...filtered, config];
    });
    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      safeSetDoc(doc(db, 'users', targetUid, 'budgets', config.categoryId), {
        ...config,
        userId: targetUid,
      }, { merge: true });
    }
  };

  const handleUpdateBudget = (config: BudgetConfig) => {
    setBudgets((prev) =>
      prev.map((b) => (b.categoryId === config.categoryId ? config : b))
    );
    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      safeSetDoc(doc(db, 'users', targetUid, 'budgets', config.categoryId), {
        ...config,
        userId: targetUid,
      }, { merge: true });
    }
  };

  const handleDeleteBudget = (categoryId: string) => {
    setBudgets((prev) => prev.filter((b) => b.categoryId !== categoryId));
    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      safeDeleteDoc(doc(db, 'users', targetUid, 'budgets', categoryId));
    }
  };

  const handleAddCategory = (newCat: Omit<Category, 'id'>) => {
    if (plan !== 'premium') {
      setIsPremiumModalOpen(true);
      return;
    }
    const cat: Category = {
      ...newCat,
      id: `cat_custom_${Date.now()}`,
    };
    const nextCategories = [...categories, cat];
    setCategories(nextCategories);
    safeSetItem('ngwe_categories', JSON.stringify(nextCategories));
    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      safeSetDoc(doc(db, 'users', targetUid, 'categories', cat.id), {
        ...cat,
        userId: targetUid,
      }, { merge: true });
    }
    showToast(
      lang === 'my'
        ? `ကဏ္ဍသစ် "${cat.name}" ကို အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ`
        : `Created custom category "${cat.name}"`
    );
  };

  const handleUpdateCategory = (updatedCat: Category) => {
    if (plan !== 'premium') {
      setIsPremiumModalOpen(true);
      return;
    }
    const nextCategories = categories.map((c) => (c.id === updatedCat.id ? updatedCat : c));
    setCategories(nextCategories);
    safeSetItem('ngwe_categories', JSON.stringify(nextCategories));
    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      safeSetDoc(doc(db, 'users', targetUid, 'categories', updatedCat.id), {
        ...updatedCat,
        userId: targetUid,
      }, { merge: true });
    }
    showToast(
      lang === 'my'
        ? `ကဏ္ဍ "${updatedCat.name}" ကို ပြင်ဆင်ပြီးပါပြီ`
        : `Updated category "${updatedCat.name}"`
    );
  };

  const handleDeleteCategory = (categoryId: string) => {
    if (plan !== 'premium') {
      setIsPremiumModalOpen(true);
      return;
    }
    
    const catToDelete = categories.find((c) => c.id === categoryId);
    if (!catToDelete) return;
    
    const relatedTxCount = transactions.filter(t => t.category === categoryId).length;
    
    if (relatedTxCount > 0) {
       if (!window.confirm(lang === 'my' 
           ? `ဤကဏ္ဍတွင် မှတ်တမ်း ${relatedTxCount} ခု ရှိပါသည်။ ဖျက်လိုက်ပါက ၎င်းတို့ကို 'အခြား' ကဏ္ဍသို့ ပြောင်းရွှေ့မည်ဖြစ်ပါသည်။ ဆက်လုပ်မည်လား?` 
           : `There are ${relatedTxCount} transactions in this category. They will be reassigned to 'Other'. Continue?`)) {
           return;
       }
       
       const fallbackCat = categories.find(c => c.type === catToDelete.type && c.id !== categoryId);
       const fallbackId = fallbackCat ? fallbackCat.id : UNBUDGETED_CATEGORY_ID;
       
       const nextTransactions = transactions.map(t => {
         if (t.category === categoryId) {
           return { ...t, category: fallbackId, categoryId: fallbackId, subCategoryId: undefined };
         }
         return t;
       });
       setTransactions(nextTransactions);
       safeSetItem('ngwe_transactions', JSON.stringify(nextTransactions));
    }
    
    const nextCategories = categories.filter((c) => c.id !== categoryId);
    setCategories(nextCategories);
    safeSetItem('ngwe_categories', JSON.stringify(nextCategories));
    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      safeDeleteDoc(doc(db, 'users', targetUid, 'categories', categoryId));
    }
    showToast(
      lang === 'my'
        ? `ကဏ္ဍ "${catToDelete.name}" ကို ဖျက်ပြီးပါပြီ`
        : `Deleted category "${catToDelete.name}"`
    );
  };

  const handleAddSubCategory = (categoryId: string, newSub: Omit<SubCategory, 'id'>) => {
    const subCat: SubCategory = {
      ...newSub,
      id: `sub_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    };
    let updatedParent: Category | null = null;
    let nextCategories: Category[] = [];
    setCategories((prev) => {
      nextCategories = prev.map((c) => {
        if (c.id === categoryId) {
          const existing = c.subCategories || [];
          updatedParent = {
            ...c,
            subCategories: [...existing, subCat],
          };
          return updatedParent;
        }
        return c;
      });
      return nextCategories;
    });
    safeSetItem('ngwe_categories', JSON.stringify(nextCategories));
    if (user?.uid && updatedParent) {
      const targetUid = activeWorkspaceId || user.uid;
      safeSetDoc(doc(db, 'users', targetUid, 'categories', categoryId), {
        ...(updatedParent as Category),
        userId: targetUid,
      }, { merge: true });
    }
    showToast(
      lang === 'my'
        ? `ကဏ္ဍခွဲ "${subCat.name}" ကို အသစ်ထည့်သွင်းပြီးပါပြီ`
        : `Added sub-category "${subCat.name}"`
    );
  };

  const handleDeleteSubCategory = (categoryId: string, subCategoryId: string) => {
    let updatedParent: Category | null = null;
    let nextCategories: Category[] = [];
    let deletedName = '';
    setCategories((prev) => {
      nextCategories = prev.map((c) => {
        if (c.id === categoryId) {
          const target = (c.subCategories || []).find((s) => s.id === subCategoryId);
          if (target) deletedName = target.name;
          updatedParent = {
            ...c,
            subCategories: (c.subCategories || []).filter((s) => s.id !== subCategoryId),
          };
          return updatedParent;
        }
        return c;
      });
      return nextCategories;
    });
    safeSetItem('ngwe_categories', JSON.stringify(nextCategories));
    if (user?.uid && updatedParent) {
      const targetUid = activeWorkspaceId || user.uid;
      safeSetDoc(doc(db, 'users', targetUid, 'categories', categoryId), {
        ...(updatedParent as Category),
        userId: targetUid,
      }, { merge: true });
    }
    if (deletedName) {
      showToast(
        lang === 'my'
          ? `ကဏ္ဍခွဲ "${deletedName}" ကို ဖျက်ပြီးပါပြီ`
          : `Deleted sub-category "${deletedName}"`
      );
    }
  };

  const handleUpdateSubCategory = (categoryId: string, updatedSub: SubCategory) => {
    let updatedParent: Category | null = null;
    let nextCategories: Category[] = [];
    setCategories((prev) => {
      nextCategories = prev.map((c) => {
        if (c.id === categoryId) {
          updatedParent = {
            ...c,
            subCategories: (c.subCategories || []).map((s) =>
              s.id === updatedSub.id ? updatedSub : s
            ),
          };
          return updatedParent;
        }
        return c;
      });
      return nextCategories;
    });
    safeSetItem('ngwe_categories', JSON.stringify(nextCategories));
    if (user?.uid && updatedParent) {
      const targetUid = activeWorkspaceId || user.uid;
      safeSetDoc(doc(db, 'users', targetUid, 'categories', categoryId), {
        ...(updatedParent as Category),
        userId: targetUid,
      }, { merge: true });
    }
    showToast(
      lang === 'my'
        ? `ကဏ္ဍခွဲ "${updatedSub.name}" ကို ပြင်ဆင်ပြီးပါပြီ`
        : `Updated sub-category "${updatedSub.name}"`
    );
  };

  const handleMergeAndCleanCategories = () => {
    const prevCategoryMap = new Map<string, string>(categories.map((c) => [c.id, JSON.stringify(c)]));
    const prevTxMap = new Map<string, string>(transactions.map((t) => [t.id, JSON.stringify(t)]));

    const result = mergeAndCleanCategories(
      categories,
      transactions,
      budgets
    );

    if (result.mergedCount === 0) {
      showToast(
        lang === 'my'
          ? 'ထပ်နေသော သို့မဟုတ် ပေါင်းစပ်ရန် ကဏ္ဍများ မရှိတော့ပါ (အားလုံး ရှင်းလင်းပြီးဖြစ်ပါသည်)'
          : 'No duplicate or redundant categories found (all clean!)'
      );
      return;
    }

    setCategories(result.cleanedCategories);
    setTransactions(result.updatedTransactions);
    setBudgets(result.updatedBudgets);

    safeSetItem('ngwe_categories', JSON.stringify(result.cleanedCategories));
    safeSetItem('ngwe_transactions', JSON.stringify(result.updatedTransactions));
    safeSetItem('ngwe_budgets', JSON.stringify(result.updatedBudgets));

    if (user?.uid) {
      const targetUid = activeWorkspaceId || user.uid;
      result.cleanedCategories.forEach((cat) => {
        const prevJson = prevCategoryMap.get(cat.id);
        const currJson = JSON.stringify(cat);
        if (prevJson !== currJson) {
          safeSetDoc(doc(db, 'users', targetUid, 'categories', cat.id), {
            ...cat,
            userId: targetUid,
          }, { merge: true });
        }
      });
      result.updatedTransactions.forEach((tx) => {
        if (tx.id) {
          const prevJson = prevTxMap.get(tx.id);
          const currJson = JSON.stringify(tx);
          if (prevJson !== currJson) {
            safeSetDoc(doc(db, 'users', targetUid, 'transactions', tx.id), {
              ...tx,
              userId: targetUid,
            }, { merge: true });
          }
        }
      });
    }

    showToast(
      lang === 'my'
        ? `ကဏ္ဍ ${result.mergedCount} ခုကို အောင်မြင်စွာ ပေါင်းစပ်ရှင်းလင်းပြီးပါပြီ`
        : `Successfully merged and cleaned up ${result.mergedCount} categories!`
    );
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
  if (isLocked && pinSettings?.isEnabled && pinSettings?.pin && pinSettings.pin.length === 4) {
    return (
            <PinLockScreen
        pinHash={pinSettings.pin}
        pinSalt={pinSettings.pinSalt || ''}
        lang={lang}
        onUnlock={() => setIsLocked(false)}
        onForgotPin={() => {
          setIsLocked(false);
          setIsAccountModalOpen(true);
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