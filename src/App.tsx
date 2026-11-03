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
import { doc, collection, onSnapshot, writeBatch, query } from 'firebase/firestore';
import { db, cleanForFirestore, handleFirestoreError, OperationType, isQuotaExhausted, pauseNetworkDueToQuota, safeSetDoc, safeDeleteDoc } from './lib/firebase';
import { syncQueue } from './lib/syncQueue';
import { recordSyncOperationStart, finishSyncOperation } from './lib/syncOperationLogger';
import { PinLockScreen } from './components/PinLockScreen';
import { Toast } from './components/Toast';
import { AdminBroadcastBanner } from './components/AdminBroadcastBanner';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { QuotaExceededNotificationBanner } from './components/QuotaExceededNotificationBanner';
import { ConflictBanner } from './components/ConflictBanner';
import { ReconcileBalanceModal } from './components/ReconcileBalanceModal';
import { PinSetupModal } from './components/PinSetupModal';
import { VersionHistoryModal } from './components/VersionHistoryModal';
import { DatabaseSyncTrackerModal } from './components/DatabaseSyncTrackerModal';
import { SyncHealthModal } from './components/SyncHealthModal';
import { SyncStatusDrawer } from './components/SyncStatusDrawer';
import { EducationView } from './components/EducationView';
import { CURRENT_APP_VERSION, CURRENT_BUILD_NUMBER } from './data/versionHistory';
import { trackVisitorSession } from './lib/analyticsService';
import { syncWalletsWithTransactions, isWalletMatch, repairOrphanedTransactions, isTransferTransaction } from './utils/walletBalance';
import { mergeAndCleanCategories } from './utils/categoryCleanUp';
import {
  syncSharedWalletToCloud,
  deleteSharedWalletDoc,
  deleteUserWalletFromCloud,
  subscribeIncomingSharedWallets,
  subscribeSharedWalletTransactions,
  subscribeSharedWalletDebts,
  saveSharedWalletTransaction,
  deleteSharedWalletTransaction,
  leaveSharedWallet,
  getSharedWalletDocId,
  // [v7.5.56] Provided by the shared-wallet service worker.
  acceptSharedWalletInvite,
  declineSharedWalletInvite,
} from './lib/sharedWalletService';
import { subscribeMyRefs } from './lib/sharedWalletRefs';
import { areArraysEqual, deduplicateById } from './utils/syncGuards';
import { mergeById, mergeByKey } from './utils/mergeById';
import { usePersistedState } from './hooks/usePersistedState';
import { hashPin, generateSalt, isHashedPinFormat } from './utils/pinHash';
import { lazyWithRetry } from './utils/lazyWithRetry';
// [v6.8-i18n] Centralized translations
import { t, type Lang } from './utils/i18n';
import { LanguagePickerModal } from './components/LanguagePickerModal';
import { bootstrapExchangeRates } from './lib/exchangeRates';
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
const AnalyticsView = lazyWithRetry(() => import('./components/AnalyticsView').then(m => ({ default: m.AnalyticsView })));
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
    // [v7.5.55 E4] {"transactions": [null, 42, "x"]} used to pass.
    if (Array.isArray(parsed[field])) {
      for (const item of parsed[field]) {
        if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !item.id) {
          return { valid: false, error: 'field "' + field + '" must contain objects with an "id"' };
        }
      }
    }
  }
  // [v7.4.0] Now accepts 4 languages.
  if (
    parsed.lang !== undefined &&
    parsed.lang !== 'my' &&
    parsed.lang !== 'en' &&
    parsed.lang !== 'zh' &&
    parsed.lang !== 'th'
  ) {
    return { valid: false, error: 'lang must be "my", "en", "zh", or "th"' };
  }
  return { valid: true };
};

// 🔧 One-time migration: legacy raw string ('my'/'en') → JSON format
if (typeof window !== 'undefined') {
  try {
    const legacy = localStorage.getItem('ngwe_lang');
    if (legacy === 'my' || legacy === 'en' || legacy === 'zh' || legacy === 'th') {
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


  // [v7.4.0] lang state now stores Lang ('my'|'en'|'zh'|'th').
  // Child components still only support 'my'|'en' — Phase 1 narrows.
  const [langRaw, setLangRaw] = usePersistedState<Lang>('ngwe_lang', 'my');
  const lang: 'my' | 'en' = langRaw === 'my' ? 'my' : 'en';

  // [v7.4.1] Language picker state.
  // firstLaunchPicker: true only when user has never chosen before (device-global flag).
  // overlayPickerOpen: user-triggered popup from Navbar/Sidebar/Login buttons.
  const [firstLaunchPicker, setFirstLaunchPicker] = useState<boolean>(() => {
    try { return !safeGetItem('ngwe_lang_picker_seen'); }
    catch { return false; }
  });
  const [overlayPickerOpen, setOverlayPickerOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  // [v7.5.55 E14] Tabs stay MOUNTED (hidden with CSS) so in-tab
  // filters/search survive a switch. Scroll position is saved per
  // tab when leaving and restored when returning; a tab never
  // visited before starts at the top.
  const tabScrollRef = useRef<Record<string, number>>({});
  const visitedTabsRef = useRef<Set<string>>(new Set(['dashboard']));
  const prevTabRef = useRef<string>('dashboard');
  useEffect(() => {
    const prev = prevTabRef.current;
    if (prev === activeTab) return;
    tabScrollRef.current[prev] = window.scrollY;
    const savedY = tabScrollRef.current[activeTab];
    if (visitedTabsRef.current.has(activeTab) && typeof savedY === 'number') {
      requestAnimationFrame(() => window.scrollTo(0, savedY));
    } else {
      visitedTabsRef.current.add(activeTab);
      window.scrollTo(0, 0);
    }
    prevTabRef.current = activeTab;
  }, [activeTab]);

  const [dataScope, setDataScope] = usePersistedState<DataScope>('ngwe_data_scope', 'all');

  const handleSetDataScope = (scope: DataScope) => {
    setDataScope(scope);
  };

  const [transactions, setTransactions] = usePersistedState<Transaction[]>('ngwe_transactions', []);

  const [debts, setDebts] = usePersistedState<Debt[]>('ngwe_debts', []);
  const [wallets, setWallets] = usePersistedState<Wallet[]>('ngwe_wallets', INITIAL_WALLETS);
  const [shops, setShops] = usePersistedState<ShopContact[]>('ngwe_shops', []);
  const [publicShops, setPublicShops] = useState<Array<{ id: string; name: string }>>([]);
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
  // [v7.5.55 D28] Debt being edited in DebtModal (null = adding new).
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [isRepaymentModalOpen, setIsRepaymentModalOpen] = useState(false);
  const [selectedDebtForRepayment, setSelectedDebtForRepayment] = useState<Debt | null>(null);
  const [editingRepayment, setEditingRepayment] = useState<{ id: string; amount: number; date: string; walletId: string; note?: string } | null>(null);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);
  const [selectedWalletForReconcile, setSelectedWalletForReconcile] = useState<string | undefined>(undefined);
  const [isPinSetupModalOpen, setIsPinSetupModalOpen] = useState(false);
  // [v7.5.55 E1] Forgot-PIN recovery: stays locked until a FRESH
  // sign-in succeeds (the login modal is shown non-dismissible).
  const [isForgotPinRecovery, setIsForgotPinRecovery] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isUserGuideModalOpen, setIsUserGuideModalOpen] = useState(false);
  const [isShareAppModalOpen, setIsShareAppModalOpen] = useState(false);
  const [isVersionHistoryModalOpen, setIsVersionHistoryModalOpen] = useState(false);
  const [isDatabaseTrackerOpen, setIsDatabaseTrackerOpen] = useState(false);
  const [isSyncHealthModalOpen, setIsSyncHealthModalOpen] = useState(false);
  // [v7.2.6] Cloud version update popup state
  const [updateAvailable, setUpdateAvailable] = useState<{ version: string; buildNumber: number } | null>(null);
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

  // [v7.5.56 D1] Shared-tx reconcile: per shared-wallet-doc ids ever
  // confirmed in a shared snapshot. A tx absent from the current
  // snapshot that was previously confirmed was deleted elsewhere
  // (finding 11a) — pruned in the shared-tx listener below, like the
  // vehicle-log reconcile in useCloudListeners.
  const confirmedSharedTxIdsRef = useRef<Map<string, Set<string>>>(new Map());
  // [v7.5.56 D3] Ghost pruning: shared-wallet keys seen on the last run.
  const prevSharedWalletKeysRef = useRef<Set<string>>(new Set());

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

  // [v7.2.5] Log version on EVERY app boot so it's visible in console.
  useEffect(() => {
    const ts = new Date().toLocaleString('en-GB', { hour12: false });
    console.log(
      '%c[NgweSarYin] ' + CURRENT_APP_VERSION + ' (build ' + CURRENT_BUILD_NUMBER + ') — booted at ' + ts,
      'background:#10B981;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold'
    );

    const savedVersion = safeGetItem('ngwe_app_version');
    if (savedVersion !== CURRENT_APP_VERSION) {
      console.log('[NgweSarYin] Version changed: ' + (savedVersion || 'none') + ' → ' + CURRENT_APP_VERSION);
      setIsVersionHistoryModalOpen(true);
      safeSetItem('ngwe_app_version', CURRENT_APP_VERSION);
    }
  }, []);

  // [v7.5.0] Bootstrap live exchange rates (non-blocking).
  // Reads disk cache synchronously for instant display, then refreshes
  // from open.er-api.com in the background.
  useEffect(() => {
    bootstrapExchangeRates();
  }, []);

  // [v7.2.6] Background Cloud version check.
  // Fetches /version.json (no-store, bypasses cache) and compares against
  // the bundled CURRENT_APP_VERSION. If cloud is newer → popup. If same → silent.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // [iosupd-fix] Cache-bust query + 5s timeout — iOS SW can
        // intercept no-store and serve stale; unique URL bypasses it.
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        let res: Response;
        try {
          res = await fetch('/version.json?t=' + Date.now(), {
            cache: 'no-store',
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timer);
        }
        if (!res.ok) return;
        const data = (await res.json()) as { version?: string; buildNumber?: number };
        if (cancelled) return;
        const cloudVersion = (data.version || '').trim();
        const cloudBuild = Number(data.buildNumber) || 0;
        if (!cloudVersion) return;
        if (cloudVersion === CURRENT_APP_VERSION) return;
        if (cloudBuild && cloudBuild <= CURRENT_BUILD_NUMBER) return;
        const laterFor = safeGetItem('ngwe_version_later');
        if (laterFor === cloudVersion) return;
        console.log('[NgweSarYin] Update available: ' + cloudVersion + ' (local: ' + CURRENT_APP_VERSION + ')');
        setUpdateAvailable({ version: cloudVersion, buildNumber: cloudBuild });
      } catch (e) {
        // Network or missing file — silent skip
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleUpdateNow = async () => {
    try {
      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    } catch (e) {
      console.warn('[update] cache clear notice:', e);
    }
    const url = new URL(window.location.href);
    url.searchParams.set('_updated', String(Date.now()));
    window.location.replace(url.toString());
  };

  const handleUpdateLater = () => {
    if (updateAvailable) {
      safeSetItem('ngwe_version_later', updateAvailable.version);
    }
    setUpdateAvailable(null);
  };

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

  // [v7.5.56] REMOVED: the old self-healing effect that called
  // addCollaborator() to backfill the root collaborators array.
  // addCollaborator no longer writes that array (AuthContext worker),
  // so the effect was a harmless no-op — removed rather than left as
  // dead code implying a backfill still happens. Wallet sharing now
  // relies on per-wallet sharedWith + sharedWalletRefs, not the root
  // collaborators array.

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

  // [v7.0.6 SAFE] Strip deprecated custom category from local React state (read-only, no Firestore writes)
  const customCatCleanupRef = useRef(false);
  useEffect(() => {
    if (customCatCleanupRef.current) return;
    if (!user?.uid) return;
    customCatCleanupRef.current = true;
    const CUSTOM_ID = 'cat_custom_1789797767607';
    const TARGET_ID = 'cat_vehicle';

    setCategories((prev) => {
      if (!prev.some((c) => c.id === CUSTOM_ID)) return prev;
      const next = prev.filter((c) => c.id !== CUSTOM_ID);
      safeSetItem('ngwe_categories', JSON.stringify(next));
      return next;
    });
    setTransactions((prev) => {
      let changed = false;
      const next = prev.map((t) => {
        if (t.category === CUSTOM_ID) { changed = true; return { ...t, category: TARGET_ID }; }
        return t;
      });
      if (!changed) return prev;
      safeSetItem('ngwe_transactions', JSON.stringify(next));
      return next;
    });
    setBudgets((prev) => {
      let changed = false;
      const next = prev.map((b) => {
        if (b.categoryId === CUSTOM_ID) { changed = true; return { ...b, id: TARGET_ID, categoryId: TARGET_ID }; }
        return b;
      });
      if (!changed) return prev;
      safeSetItem('ngwe_budgets', JSON.stringify(next));
      return next;
    });
  }, [user?.uid]);

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
          // [v7.5.55 E5] Background migration write — local state is
          // already updated; log a warning instead of fake success.
          safeSetDoc(doc(db, 'users', targetUid, 'debts', d.id), {
            ...d,
            userId: targetUid,
          }, { merge: true }).then((ok) => {
            if (!ok) console.warn('[v6.1.11] Debt migration cloud write rejected for', d.id);
          });
        });
      }
    }
  }, [debts.length, transactions.length]);

  // [v7.5.36] Fetch public shops for Entry Form autocomplete
  useEffect(() => {
    const q = query(collection(db, 'public_shops'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          name: (d.data() as any).name || '',
        })).filter((s) => s.name);
        setPublicShops(list);
      },
      () => {
        // silent fail — public shops are optional
      }
    );
    return () => unsub();
  }, []);

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
      () => {
        // [v7.0.8] Legacy sharedWallets list query removed; no error callback needed.
      }
    );

    return () => unsubscribe();
  }, [user?.uid, user?.email]);

  // [v7.5.56 D2] Share-invite banner: when a shared wallet first
  // appears via my ref with status 'pending', offer Accept / Decline.
  // NOTE: `status` on SharedWalletRef is owned by the refs worker —
  // until it lands, no ref carries 'pending' and the banner stays
  // hidden. The owner label is the ownerEmail prefix, never the
  // literal 'Partner' (D5).
  const [pendingInvites, setPendingInvites] = useState<Array<{ docId: string; ownerEmail: string; walletName: string }>>([]);
  const [inviteBusyDocId, setInviteBusyDocId] = useState<string | null>(null);
  useEffect(() => {
    if (!user?.email) {
      setPendingInvites([]);
      return;
    }
    const unsub = subscribeMyRefs(
      user.email,
      (refs) => {
        const pending = refs
          .filter((r) => (r as unknown as { status?: string }).status === 'pending')
          .map((r) => ({ docId: r.docId, ownerEmail: r.ownerEmail || '', walletName: r.walletName || '' }));
        setPendingInvites(pending);
      },
      () => {}
    );
    return () => unsub();
  }, [user?.email]);

  const handleAcceptInvite = async (docId: string) => {
    setInviteBusyDocId(docId);
    try {
      const ok = await acceptSharedWalletInvite(docId);
      showToast(ok
        ? (lang === 'my' ? 'မျှဝေထားသော ပိုက်ဆံအိတ်ကို လက်ခံပြီးပါပြီ ✓' : 'Shared wallet accepted ✓')
        : (lang === 'my' ? '⚠️ လက်ခံ၍ မရပါ — အင်တာနက်စစ်ပြီး ထပ်ကြိုးစားပါ' : '⚠️ Could not accept the invite — check your connection and retry'));
    } catch {
      showToast(lang === 'my' ? '⚠️ လက်ခံ၍ မရပါ — အင်တာနက်စစ်ပြီး ထပ်ကြိုးစားပါ' : '⚠️ Could not accept the invite — check your connection and retry');
    } finally {
      setInviteBusyDocId(null);
    }
  };
  const handleDeclineInvite = async (docId: string) => {
    setInviteBusyDocId(docId);
    try {
      const ok = await declineSharedWalletInvite(docId);
      showToast(ok
        ? (lang === 'my' ? 'မျှဝေမှုကို ငြင်းပယ်ပြီးပါပြီ' : 'Share invite declined')
        : (lang === 'my' ? '⚠️ ငြင်းပယ်၍ မရပါ — အင်တာနက်စစ်ပြီး ထပ်ကြိုးစားပါ' : '⚠️ Could not decline the invite — check your connection and retry'));
    } catch {
      showToast(lang === 'my' ? '⚠️ ငြင်းပယ်၍ မရပါ — အင်တာနက်စစ်ပြီး ထပ်ကြိုးစားပါ' : '⚠️ Could not decline the invite — check your connection and retry');
    } finally {
      setInviteBusyDocId(null);
    }
  };

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

          // [v7.5.56 D1] Confirmed-ids prune (finding 11a): a tx that
          // was confirmed in an earlier snapshot of THIS wallet and is
          // now absent was deleted elsewhere — treat it like an
          // explicit removal. Only on a non-empty snapshot: an empty
          // first snapshot (cache) must never wipe confirmed txs; true
          // deletions of the last tx arrive via deletedTxIds.
          const prevConfirmed = confirmedSharedTxIdsRef.current.get(docIdToUse) ?? new Set<string>();
          const nowIds = new Set(sharedTxs.filter((t) => t && t.id).map((t) => t.id));
          const vanishedIds = sharedTxs.length > 0
            ? Array.from(prevConfirmed).filter((id) => !nowIds.has(id))
            : [];
          confirmedSharedTxIdsRef.current.set(docIdToUse, nowIds);
          const allRemovedIds = Array.from(new Set([...(deletedTxIds || []), ...vanishedIds]));

          // Prune any explicitly removed doc IDs from this snapshot
          if (allRemovedIds.length > 0) {
            allRemovedIds.forEach((id) => {
              markTxDeleted(id);
              if (user?.uid) {
                safeDeleteDoc(doc(db, 'users', user.uid, 'transactions', id))
                  .then((ok) => { if (!ok) console.warn('[sync] Prune cloud delete rejected for', id); })
                  .catch(() => null);
              }
            });
          }

          setTransactions((prev) => {
            const map = new Map<string, Transaction>();

            prev.forEach((t) => {
              if (!t || !t.id) return;
              if (isTxDeleted(t.id)) return;
              if (allRemovedIds.includes(t.id)) return;
              map.set(t.id, t);
            });

            // Upsert / update transactions from shared wallet
            // FIX (v5.3.33): Do NOT re-add txs marked as deleted.
            // unmarkTxDeleted() here was resurrecting txs iOS deleted
            // but whose shared-wallet copy hadn't propagated yet.
            sharedTxs.forEach((t) => {
              if (t && t.id) {
                if (isTxDeleted(t.id)) return;
                if (allRemovedIds.includes(t.id)) return;
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

  // [v7.5.56] Real-time listener for debts of shared wallets (finding 21,
  // decision 17): the member-visible mirror lives in
  // sharedWallets/{docId}/debts. Merge it into local debts, deduped by
  // id; when both copies exist the newer updatedAt wins. A mirror
  // deletion removes the local copy unless it is my own canonical copy
  // on a wallet I own (the owner deletes those via handleDeleteDebt).
  useEffect(() => {
    if (!user) return;

    const activeSharedWallets = wallets.filter(
      (w) => w.isSharedFromOther || (w.sharedWith && w.sharedWith.length > 0)
    );

    if (activeSharedWallets.length === 0) return;

    const unsubs = activeSharedWallets.map((sw) => {
      const docIdToUse = getSharedWalletDocId(sw, user.uid);
      return subscribeSharedWalletDebts(
        sw.id,
        (mirrorDebts, deletedDebtIds) => {
          if (!mirrorDebts) return;
          setDebts((prev) => {
            const map = new Map<string, Debt>();
            prev.forEach((d) => {
              if (d && d.id) map.set(d.id, d);
            });
            (deletedDebtIds || []).forEach((id) => {
              const local = map.get(id);
              if (!local) return;
              const w = wallets.find((x) => isWalletMatch(x, local.walletId));
              const myCanonical = local.createdBy === user.uid && w && !w.isSharedFromOther;
              if (!myCanonical) map.delete(id);
            });
            mirrorDebts.forEach((md) => {
              if (!md || !md.id) return;
              const existing = map.get(md.id);
              if (!existing) {
                map.set(md.id, md);
                return;
              }
              const exAt = existing.updatedAt || existing.createdAt || 0;
              const mdAt = md.updatedAt || md.createdAt || 0;
              if (mdAt > exAt) map.set(md.id, { ...existing, ...md });
            });
            const merged = Array.from(map.values());
            if (areArraysEqual(prev, merged)) {
              return prev;
            }
            safeSetItem('ngwe_debts', JSON.stringify(merged));
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

  // [v7.5.56 D3] Ghost pruning (findings 27/31): when a shared wallet
  // disappears from the user's list (unshared / left / declined), drop
  // its transactions from local state + localStorage on next sync.
  // The first run only records the current set — nothing is pruned
  // until a wallet actually disappears. The wallets.length guard avoids
  // pruning during a transient empty-list state.
  // NOTE: txs the user themself added to that wallet were also
  // persisted to their own users/{uid}/transactions, so the personal
  // listener may re-merge those copies — clearing those personal
  // copies is a follow-up, not done here.
  useEffect(() => {
    const sharedKeys = new Set<string>();
    wallets.forEach((w) => {
      if (!w.isSharedFromOther && !(w.sharedWith && w.sharedWith.length > 0)) return;
      sharedKeys.add(w.sharedDocId || w.id);
    });
    const removedKeys = Array.from(prevSharedWalletKeysRef.current).filter((k) => !sharedKeys.has(k));
    prevSharedWalletKeysRef.current = sharedKeys;
    if (removedKeys.length === 0 || wallets.length === 0) return;
    // Local tx walletIds for a shared wallet use the shared doc id, the
    // local `shared_<docId>` id, or the plain doc id — match all forms.
    const removedWalletIds = new Set<string>();
    removedKeys.forEach((k) => {
      removedWalletIds.add(k);
      removedWalletIds.add(`shared_${k}`);
      removedWalletIds.add(k.replace(/^shared_/, ''));
    });
    setTransactions((prev) => {
      const next = prev.filter((t) => t && t.id && !removedWalletIds.has(t.walletId));
      if (next.length === prev.length) return prev;
      safeSetItem('ngwe_transactions', JSON.stringify(next));
      return next;
    });
  }, [wallets]);

  const limits = DEFAULT_PLAN_LIMITS[plan];
  const guestLimits = DEFAULT_PLAN_LIMITS.guest;
  const freeLimits = DEFAULT_PLAN_LIMITS.free;

  // [v7.0.5] Force-pull vehicles when local empty. Retries on failure (no ref lock).
  useEffect(() => {
    if (!user?.uid) return;
    if (vehicles.length > 0) return;
    let cancelled = false;
    (async () => {
      try {
        const { collection, getDocsFromServer } = await import('firebase/firestore');
        const targetUid = activeWorkspaceId || user.uid;
        const snap = await getDocsFromServer(collection(db, 'users', targetUid, 'vehicles'));
        if (cancelled) return;
        if (snap.size > 0) {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Vehicle));
          setVehicles(list);
          safeSetItem('ngwe_vehicles', JSON.stringify(list));
          console.log('[v7.0.5] Force-pulled', list.length, 'vehicles from Firestore');
        }
      } catch (e) {
        console.warn('[v7.0.5] Vehicle pull failed (will retry on next render):', e);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.uid, activeWorkspaceId, vehicles.length]);

  // [v6.23.6] One-shot ref backfill: writes a sharedWalletRefs pointer
  // for every existing share so recipients can discover shared wallets
  // without a collection-wide list() query. Idempotent.
  const refBackfillDoneRef = useRef(false);
  useEffect(() => {
    if (refBackfillDoneRef.current) return;
    if (!user?.uid || !user?.email) return;
    if (wallets.length === 0) return;
    refBackfillDoneRef.current = true;
    import('./lib/sharedWalletService')
      .then((m) => m.backfillMyRefs(wallets, user.uid, user.email || ''))
      .then((count) => {
        if (count > 0) console.log('[v6.23.6] backfilled ' + count + ' shared wallet refs');
      })
      .catch((err) => {
        console.warn('[v6.23.6] ref backfill notice:', err);
        refBackfillDoneRef.current = false; // allow retry on next render
      });
  }, [user?.uid, user?.email, wallets.length]);

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
        showToast(t('toast.deleteCancelled', lang));
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

      showToast(t('toast.allDataCleared', lang));
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

    // [v6.23.6] Only schedule if permission ALREADY granted.
    // We no longer auto-request at app start — that pops a dialog
    // before the user has seen the app and makes recovery hard
    // if they accidentally deny. Permission is requested manually
    // via Settings (AccountModal) which dispatches 'ngwe:request-notification'.
    if ('Notification' in window && Notification.permission === 'granted') {
      scheduleReminder();
    }

    // [v6.23.6] Manual permission request handler.
    // Settings UI fires: window.dispatchEvent(new Event('ngwe:request-notification'))
    const handleRequestNotification = () => {
      if (!('Notification' in window)) {
        alert(langRef.current === 'my'
          ? 'ဤ Browser တွင် Notification မထောက်ပံ့ပါ။'
          : 'This browser does not support notifications.');
        return;
      }
      if (Notification.permission === 'granted') {
        scheduleReminder();
        alert(langRef.current === 'my'
          ? '✅ Reminder များ ဖွင့်ပြီးဖြစ်ပါသည်။'
          : '✅ Reminders are already enabled.');
        return;
      }
      if (Notification.permission === 'denied') {
        alert(langRef.current === 'my'
          ? '⚠️ Notification ကို Browser မှာ ပိတ်ထားပါသည်။ Browser Settings မှာ ပြန်ဖွင့်ပါ။'
          : '⚠️ Notifications are blocked. Please re-enable in your browser settings.');
        return;
      }
      // permission === 'default' — safe to prompt now (user clicked)
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          scheduleReminder();
          alert(langRef.current === 'my'
            ? '✅ သတိပေးချက်များ ဖွင့်ပြီးပါပြီ။'
            : '✅ Reminders enabled successfully.');
        }
      });
    };
    window.addEventListener('ngwe:request-notification', handleRequestNotification);

    return () => {
      if (reminderTimeoutRef.current) clearTimeout(reminderTimeoutRef.current);
      if (reminderIntervalRef.current) clearInterval(reminderIntervalRef.current);
      window.removeEventListener('ngwe:request-notification', handleRequestNotification);
    };
  }, []);

  const handleExportJson = () => {
    // [v7.5.55 Decision 2] Export is Premium-only. The pre-delete
    // auto-backup in handleClearAllData is NOT gated (safety net).
    if (plan !== 'premium') {
      showToast(lang === 'my' ? 'Export သည် Premium အဆင့်အတွက်သာ ဖြစ်ပါသည်' : 'Export is available on Premium only');
      return;
    }
    // [v7.5.55 E4] Include monthly savings targets + deletion markers
    // (previously lost on export); NEVER include the PIN.
    const savingsTargets: Record<string, string> = {};
    const deletedMarkers: Record<string, string[]> = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        if (k.startsWith('ngwe_savings_target_') || k === 'ngwe_savings_target_enabled' || k === 'ngwe_savings_target_default') {
          const v = safeGetItem(k);
          if (v !== null) savingsTargets[k] = v;
        } else if (k.startsWith('ngwe_deleted_') && k.endsWith('_ids')) {
          const v = safeGetItem(k);
          if (v) { try { deletedMarkers[k] = JSON.parse(v); } catch { /* ignore */ } }
        }
      }
    } catch { /* ignore */ }
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
      savingsTargets,
      deletedMarkers,
      plan,
      lang,
    };
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // [v7.5.55 E29] Time in the filename so two same-day exports
    // do not overwrite each other.
    const now = new Date();
    const hhmm = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
    a.download = `ngwesaryin_backup_${getTodayLocalStr()}_${hhmm}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(t('toast.backupSaved', lang));
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        // [v7.5.55 E4/E29] Validate FIRST, confirm only a valid file.
        const validation = validateImportPayload(parsed);
        if (!validation.valid) {
          alert(lang === 'my'
            ? `Backup ဖိုင် မမှန်ပါ: ${validation.error}`
            : `Invalid backup file: ${validation.error}`);
          return;
        }
        // Import is a PER-COLLECTION PATCH, not a full replace:
        // collections missing from the file are left as-is.
        const counts = ['transactions', 'debts', 'wallets', 'categories', 'budgets', 'shops', 'vehicles']
          .filter((f) => Array.isArray((parsed as any)[f]))
          .map((f) => `${f}: ${(parsed as any)[f].length}`).join(', ');
        if (!window.confirm(lang === 'my' ? `Backup ဖိုင်မှ ဒေတာများကို ထည့်သွင်းမည် (ဖိုင်တွင် မပါသော စာရင်းများ ပြောင်းလဲမည် မဟုတ်ပါ) — ${counts} — သေချာပါသလား?` : `Import data from this backup? Collections not in the file are left unchanged — ${counts} — Continue?`)) {
          return;
        }
        // [v7.5.55 Decision 1] Guest may not restore debts/budgets/
        // savings (the table forbids them for guest).
        const allowDebts = limits.hasDebts;
        const allowBudgets = limits.hasBudgets;
        const allowSavings = limits.hasSavings;
        const importedTxs: Transaction[] = Array.isArray(parsed.transactions) ? parsed.transactions : [];
        if (parsed.transactions) setTransactions(parsed.transactions);
        if (parsed.debts && allowDebts) setDebts(parsed.debts);
        if (parsed.wallets) setWallets(parsed.wallets);
        if (parsed.categories) setCategories(parsed.categories);
        if (parsed.budgets && allowBudgets) setBudgets(parsed.budgets);
        if (parsed.shops) setShops(parsed.shops);
        if (parsed.vehicles) setVehicles(parsed.vehicles);
        if (parsed.fuelLogs) setFuelLogs(parsed.fuelLogs);
        if (parsed.vehicleMaintenance) setVehicleMaintenance(parsed.vehicleMaintenance);
        if (parsed.tirePressureLogs) setTirePressureLogs(parsed.tirePressureLogs);
        if (parsed.savingsTargets && allowSavings) {
          try {
            Object.entries(parsed.savingsTargets as Record<string, string>).forEach(([k, v]) => {
              if (typeof k === 'string' && k.startsWith('ngwe_savings_target_') && typeof v === 'string') safeSetItem(k, v);
            });
          } catch { /* ignore */ }
        }
        if (parsed.deletedMarkers) {
          try {
            Object.entries(parsed.deletedMarkers as Record<string, string[]>).forEach(([k, v]) => {
              if (typeof k === 'string' && k.startsWith('ngwe_deleted_') && Array.isArray(v)) safeSetItem(k, JSON.stringify(v));
            });
          } catch { /* ignore */ }
        }
        if (parsed.lang) setLangRaw(parsed.lang as Lang);
        // [v7.5.55 E4] Imported transactions used to vanish for
        // signed-in users: the cloud listener is cloud-authoritative
        // and drops local txs that are neither confirmed nor pending.
        // Enqueue them and push them to the cloud so they survive.
        if (user && importedTxs.length > 0) {
          const targetUid = activeWorkspaceId || user.uid;
          importedTxs.forEach((tx) => { if (tx && tx.id) unmarkTxDeleted(tx.id); });
          syncQueue.enqueueBatch(importedTxs.filter((tx) => tx && tx.id).map((tx) => ({
            entityType: 'transactions' as const,
            entityId: tx.id,
            operation: 'upsert' as const,
            targetUid,
            data: { ...tx, userId: targetUid },
          })));
          const importedDebts: Debt[] = allowDebts && Array.isArray(parsed.debts) ? parsed.debts : [];
          const importedWallets: Wallet[] = Array.isArray(parsed.wallets) ? parsed.wallets : [];
          const importedCategories: Category[] = Array.isArray(parsed.categories) ? parsed.categories : [];
          const importedBudgets: BudgetConfig[] = allowBudgets && Array.isArray(parsed.budgets) ? parsed.budgets : [];
          const importedShops: ShopContact[] = Array.isArray(parsed.shops) ? parsed.shops : [];
          const importedVehicles: Vehicle[] = Array.isArray(parsed.vehicles) ? parsed.vehicles : [];
          const importedFuel: FuelLog[] = Array.isArray(parsed.fuelLogs) ? parsed.fuelLogs : [];
          const importedMaint: VehicleMaintenance[] = Array.isArray(parsed.vehicleMaintenance) ? parsed.vehicleMaintenance : [];
          const importedTires: TirePressureLog[] = Array.isArray(parsed.tirePressureLogs) ? parsed.tirePressureLogs : [];
          syncDataToCloud(
            importedTxs.length ? importedTxs : transactions,
            importedDebts.length ? importedDebts : debts,
            importedWallets.length ? importedWallets : computedWallets,
            importedCategories.length ? importedCategories : categories,
            importedBudgets.length ? importedBudgets : budgets,
            plan,
            targetUid,
            importedShops.length ? importedShops : shops,
            importedVehicles.length ? importedVehicles : vehicles,
            importedFuel.length ? importedFuel : fuelLogs,
            importedMaint.length ? importedMaint : vehicleMaintenance,
            importedTires.length ? importedTires : tirePressureLogs,
            false,
            cloudTxIds
          ).then((ok) => {
            if (!ok) {
              showToast(lang === 'my' ? '⚠️ ဒေတာ ထည့်သွင်းပြီး Cloud သို့ ပို့ဆောင်၍ မရသေးပါ — Sync ထပ်ကြိုးစားပါ' : '⚠️ Imported locally, but cloud upload did not finish — please sync again');
            }
          }).catch(() => {
            showToast(lang === 'my' ? '⚠️ Cloud သို့ ပို့ဆောင်၍ မရပါ — Sync ထပ်ကြိုးစားပါ' : '⚠️ Could not upload to cloud — please sync again');
          });
        }
        if (!allowDebts && parsed.debts) {
          showToast(lang === 'my' ? 'Guest Mode တွင် အကြွေးစာရင်း ပြန်ထည့်၍ မရပါ' : 'Debts were not imported in Guest Mode');
        } else {
          showToast(t('toast.backupRestored', lang));
        }
      } catch (err) {
        alert(t('errors.fileRead', lang));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSelectLang = (next: Lang) => {
    setLangRaw(next);
    safeSetItem('ngwe_lang_picker_seen', 'true');
    setFirstLaunchPicker(false);
    setOverlayPickerOpen(false);
  };

  const handleToggleLang = () => {
    // [v7.4.1] Now opens the 4-language picker (previously a my<->en toggle).
    setOverlayPickerOpen(true);
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
    handleUpdateDebt,
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
    // [v7.5.56] Wired to WalletsView as onTransferOwnership below.
    handleTransferOwnership,
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
    showToast(t('toast.pinSet', lang));
  };

  // [v7.4.1] First-launch language picker — full-screen takeover.
  // Only shown once per device (device-global flag ngwe_lang_picker_seen).
  if (firstLaunchPicker) {
    return (
      <LanguagePickerModal
        isOpen
        current={langRaw}
        onSelect={handleSelectLang}
        isFirstLaunch
      />
    );
  }

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <FortuneLogo size="lg" style={logoStyle} animate />
          <p className="text-xs text-slate-500 font-medium">
            {t('loading.appStarting', lang)}
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
      <>
        <PinLockScreen
          pinHash={pinSettings.pin}
          pinSalt={pinSettings.pinSalt || ''}
          lang={lang}
          onUnlock={() => setIsLocked(false)}
          onLegacyPinVerified={handleLegacyPinMigration}
          onForgotPin={() => {
            // [v7.5.55 E1] PIN recovery requires a FRESH sign-in. The
            // app stays LOCKED until that sign-in succeeds — unlocking
            // first (the old code did setIsLocked(false) here) let
            // anyone past the PIN with no re-auth at all.
            const msg = lang === 'my'
              ? 'PIN ပြန်လည်သတ်မှတ်ရန် Google/Email အကောင့် ပြန်ဝင်ရန် လိုအပ်ပါသည်။ App ကို လော့ခ်ဖွင့်ရန် အကောင့် ပြန်ဝင်ရပါမည်။\n\nဆက်လုပ်မလား?'
              : 'PIN recovery requires signing in again. The app stays locked until a fresh sign-in succeeds.\n\nContinue?';
            if (!window.confirm(msg)) return;
            setIsForgotPinRecovery(true);
          }}
        />
        {isForgotPinRecovery && (
          <div className="fixed inset-0 z-[110] overflow-y-auto overflow-x-hidden bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4">
            <div className="w-full min-h-screen sm:min-h-0 sm:max-w-lg">
              <LoginScreen
                lang={lang}
                onToggleLang={handleToggleLang}
                allowClose={false}
                logoStyle={logoStyle}
                onOpenPrivacy={() => setIsPrivacyModalOpen(true)}
                onOpenUserGuide={() => setIsUserGuideModalOpen(true)}
                onClose={() => {
                  // Only reachable after a successful sign-in
                  // (LoginScreen calls onClose only on success, and
                  // its X button is hidden when allowClose is false).
                  setIsForgotPinRecovery(false);
                  setIsLocked(false);
                  setShowLoginModal(false);
                }}
              />
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col selection:bg-emerald-500 selection:text-white pb-24 relative">
      <QuotaExceededNotificationBanner lang={lang} onOpenSyncStatus={() => setIsSyncStatusDrawerOpen(true)} />
      <ConflictBanner lang={lang} />
      <PWAInstallPrompt lang={lang} />

      <Navbar
        onOpenShareApp={() => setIsShareAppModalOpen(true)}
        currentPlan={plan}
        onOpenSidebar={() => setIsSidebarOpen(true)}
        onOpenSearch={() => setIsSearchModalOpen(true)}
        onOpenAccountModal={() => setIsAccountModalOpen(true)}
        onLockApp={handleLockApp}
        lang={lang}
        onToggleLang={handleToggleLang}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        logoStyle={logoStyle}
        onSelectLogoStyle={handleSelectLogoStyle}
        onOpenNotificationModal={() => setIsNotificationModalOpen(true)}
        unreadNotificationCount={unreadNotificationCount}
        onOpenAdminPanel={handleOpenAdminPanel}
      />

      <AdminBroadcastBanner lang={lang} />
      {/* [v7.5.56 D2] Pending share invites — owner label is the
          ownerEmail prefix, never the literal 'Partner' (D5). */}
      {pendingInvites.map((inv) => {
        const ownerLabel = inv.ownerEmail ? inv.ownerEmail.split('@')[0] : '';
        const busy = inviteBusyDocId === inv.docId;
        return (
          <div key={inv.docId} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3">
            <div className="bg-indigo-50 border border-indigo-300 rounded-2xl px-4 py-2.5 text-xs font-bold text-indigo-900 flex items-center justify-between gap-3">
              <span className="min-w-0 break-words">
                {lang === 'my'
                  ? `${ownerLabel} မှ ${inv.walletName ? `“${inv.walletName}” ` : ''}မျှဝေထားသည် — လက်ခံမည် / ငြင်းပယ်မည်`
                  : `${ownerLabel} shared ${inv.walletName ? `“${inv.walletName}” ` : ''}with you — Accept / Decline`}
              </span>
              <span className="flex gap-2 shrink-0">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleAcceptInvite(inv.docId)}
                  className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-bold cursor-pointer disabled:opacity-50"
                >
                  {lang === 'my' ? 'လက်ခံမည်' : 'Accept'}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleDeclineInvite(inv.docId)}
                  className="px-3 py-1 rounded-lg bg-white border border-indigo-300 text-indigo-800 text-[11px] font-bold cursor-pointer disabled:opacity-50"
                >
                  {lang === 'my' ? 'ငြင်းပယ်မည်' : 'Decline'}
                </button>
              </span>
            </div>
          </div>
        );
      })}
      {plan === 'premium' && userProfile?.premiumExpiresAt && (() => {
        const daysLeft = Math.ceil((new Date(userProfile.premiumExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysLeft > 3 || daysLeft < 0) return null;
        return (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3">
            <div className="bg-amber-50 border border-amber-300 rounded-2xl px-4 py-2.5 text-xs font-bold text-amber-900 flex items-center justify-between gap-3">
              <span className="min-w-0">{lang === 'my' ? `⚠️ Premium သက်တမ်း ${daysLeft} ရက်သာ ကျန်ပါသည် — သက်တမ်းတိုးရန် Code အသစ် ထည့်ပါ` : `⚠️ Premium expires in ${daysLeft} day(s) — redeem a new code to renew`}</span>
              <button type="button" onClick={() => setIsPremiumModalOpen(true)} className="px-3 py-1 rounded-lg bg-amber-600 text-white text-[11px] font-bold cursor-pointer shrink-0">
                {lang === 'my' ? 'သက်တမ်းတိုးမည်' : 'Renew'}
              </button>
            </div>
          </div>
        );
      })()}

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentPlan={plan}
        transactionsCount={transactions.length}
        debtsCount={debts.length}
        walletsCount={computedWallets.length}
        vehiclesCount={vehicles.length}
        lang={lang}
        onToggleLang={handleToggleLang}
        onOpenAccountModal={() => setIsAccountModalOpen(true)}
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

      {/* <PlanBanner /> Removed to save space as per user request */}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <React.Suspense fallback={
          <div className="flex flex-col items-center justify-center p-12 text-slate-400 gap-2">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium">{t('loading.component', lang)}</span>
          </div>
        }>
        <div className={activeTab === 'dashboard' ? '' : 'hidden'}>
          <div className="space-y-6">
            <Dashboard
              transactions={transactions}
              debts={debts}
              wallets={computedWallets}
              categories={categories}
              budgets={budgets}
              plan={plan}
              lang={lang}
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
                    cloudTxIds={cloudTxIds}
            />
            <AdBanner
              plan={plan}
              lang={lang}
              slot="dashboard-bottom"
              onOpenUpgradeModal={() => setIsPremiumModalOpen(true)}
                  />
          </div>
        </div>

        <div className={activeTab === 'transactions' ? '' : 'hidden'}>
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
                    onRefreshSync={handleFullManualSync}
            />
            <AdBanner
              plan={plan}
              lang={lang}
              slot="inline-compact"
              onOpenUpgradeModal={() => setIsPremiumModalOpen(true)}
                  />
          </div>
        </div>

        <div className={activeTab === 'categories' ? '' : 'hidden'}>
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
        </div>
        <div className={activeTab === 'education' ? '' : 'hidden'}><EducationView lang={lang} /></div>
        <div className={activeTab === 'debts' ? '' : 'hidden'}>
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
                onEditDebt={(debt) => { setEditingDebt(debt); setIsDebtModalOpen(true); }}
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
        </div>

        <div className={activeTab === 'wallets' ? '' : 'hidden'}>
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
              // [v7.5.56] Ownership transfer + ShareWalletModal wiring:
              // without onTransferOwnership the transfer button stays
              // hidden; maxCollaborators comes from the limits table
              // (single source of truth); onOpenSignIn opens sign-in
              // for guests. WalletsView forwards the latter two plus
              // currentUserEmail to ShareWalletModal.
              onTransferOwnership={handleTransferOwnership}
              maxCollaborators={limits.maxCollaborators}
              onOpenSignIn={() => setIsAuthModalOpen(true)}
            />
            <AdBanner
              plan={plan}
              lang={lang}
              slot="inline-compact"
              onOpenUpgradeModal={() => setIsPremiumModalOpen(true)}
                  />
          </div>
        </div>

        <div className={(activeTab === 'analytics' || activeTab === 'budgets') ? '' : 'hidden'}>
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
              <AnalyticsView
                transactions={transactions}
                categories={categories}
                wallets={computedWallets}
                debts={debts}
                budgets={budgets}
                plan={plan}
                lang={lang}
                maxBudgetCategories={limits.maxBudgetCategories}
                onAddBudget={handleAddBudget}
                onUpdateBudget={handleUpdateBudget}
                onDeleteBudget={handleDeleteBudget}
                onOpenUpgradeModal={() => setIsPremiumModalOpen(true)}
                        onSelectTab={setActiveTab}
              />
            )}
            <AdBanner
              plan={plan}
              lang={lang}
              slot="inline-compact"
              onOpenUpgradeModal={() => setIsPremiumModalOpen(true)}
                  />
          </div>
        </div>

        <div className={activeTab === 'data_management' ? '' : 'hidden'}>
          <DataManagementView
            transactions={transactions}
            debts={debts}
            wallets={computedWallets}
            categories={categories}
            budgets={budgets}
            vehicles={vehicles}
            shops={shops}
            plan={plan}
            lang={lang}
            cloudTxIds={cloudTxIds}
            onClearAllData={handleClearAllData}
            onExportJson={handleExportJson}
            onImportJson={handleImportJson}
            onOpenAccountModal={() => setIsAccountModalOpen(true)}
            onOpenPremiumModal={() => setIsPremiumModalOpen(true)}
          />
        </div>

        <div className={activeTab === 'plans' ? '' : 'hidden'}>
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
                      <li className="flex items-center gap-1.5 font-medium">✓ {lang === 'my' ? `ရက် ၃၀ အတွင်း မှတ်တမ်း ${guestLimits.maxTransactions} ခု` : `${guestLimits.maxTransactions} tx / rolling 30 days`}</li>
                      <li className="flex items-center gap-1.5 font-medium">✓ {lang === 'my' ? `Wallet ${guestLimits.maxWallets} ခုသာ (Cash)` : `${guestLimits.maxWallets} Wallet only`}</li>
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
                      showToast(t('toast.guestMode', lang));
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
                      <li className="flex items-center gap-1.5 font-semibold text-emerald-800">✓ {lang === 'my' ? `ရက် ၃၀ အတွင်း မှတ်တမ်း ${freeLimits.maxTransactions} ခု` : `${freeLimits.maxTransactions} tx / rolling 30 days`}</li>
                      <li className="flex items-center gap-1.5 font-semibold text-emerald-800">✓ {lang === 'my' ? `အကြွေးစာရင်း ${freeLimits.maxDebts} ခု` : `Up to ${freeLimits.maxDebts} Debts`}</li>
                      <li className="flex items-center gap-1.5 font-semibold text-emerald-800">✓ {lang === 'my' ? `Wallet ${freeLimits.maxWallets} ခု` : `${freeLimits.maxWallets} Wallets`}</li>
                      <li className="flex items-center gap-1.5 font-semibold text-indigo-700">✓ {lang === 'my' ? `Wallet မျှဝေခြင်း (${freeLimits.maxCollaborators} ယောက်)` : `Share Wallet (${freeLimits.maxCollaborators} members)`}</li>
                      <li className="flex items-center gap-1.5 font-semibold text-emerald-800">✓ {lang === 'my' ? 'စုငွေ ပန်းတိုင် ရရှိမည်' : 'Savings Target'}</li>
                      <li className="flex items-center gap-1.5 font-semibold text-emerald-800">✓ {lang === 'my' ? `ဘတ်ဂျက် ကဏ္ဍ ${freeLimits.maxBudgetCategories} ခု` : `${freeLimits.maxBudgetCategories} Budget Categories`}</li>
                      <li className="flex items-center gap-1.5 font-semibold text-emerald-800">✓ {lang === 'my' ? `ယာဉ်စီမံခန့်ခွဲမှု (ယာဉ် ${freeLimits.maxVehicles} စီး)` : `Vehicle Tracking (${freeLimits.maxVehicles} Vehicle)`}</li>
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
                        showToast(t('toast.freePlanActive', lang));
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

                  {plan === 'premium' && (
                    <button
                      type="button"
                      onClick={handleExportJson}
                      className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-slate-500" />
                      <span>{lang === 'my' ? 'JSON Backup သိမ်းမည်' : 'Export Backup'}</span>
                    </button>
                  )}

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
        </div>

        <div className={activeTab === 'feedback' ? '' : 'hidden'}>
          <FeedbackView
            lang={lang}
            currentPlan={plan}
            onOpenUpgradeModal={() => setIsPremiumModalOpen(true)}
              />
        </div>

        <div className={activeTab === 'shops' ? '' : 'hidden'}>
          <ShopsView
            shops={shops}
            lang={lang}
            plan={plan}
            onOpenUpgradeModal={() => setIsPremiumModalOpen(true)}
                onAddShop={handleAddShop}
            onUpdateShop={handleUpdateShop}
            onDeleteShop={handleDeleteShop}
          />
        </div>

        <div className={activeTab === 'vehicles' ? '' : 'hidden'}>
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
        </div>
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
            className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'text-emerald-700 font-semibold'
                : 'text-slate-400 hover:text-slate-700'
            }`}
            title="Dashboard"
          >
            <LayoutDashboard className="w-6 h-6" />
            <span className="text-[10px]">{lang === 'my' ? 'ပင်မ' : 'Home'}</span>
          </button>

          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'transactions'
                ? 'text-emerald-700 font-semibold'
                : 'text-slate-400 hover:text-slate-700'
            }`}
            title="Transactions"
          >
            <ArrowLeftRight className="w-6 h-6" />
            <span className="text-[10px]">{lang === 'my' ? 'စာရင်း' : 'Records'}</span>
          </button>

          <div className="-mt-6">
            <ClayFloatingCoinButton
              onClick={() => handleOpenAddTx('expense')}
            />
          </div>

          <button
            onClick={() => setActiveTab('debts')}
            className={`relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'debts'
                ? 'text-emerald-700 font-semibold'
                : 'text-slate-400 hover:text-slate-700'
            }`}
            title="Debts"
          >
            <HandCoins className="w-6 h-6" />
            <span className="text-[10px]">{lang === 'my' ? 'အကြွေး' : 'Debts'}</span>
            {plan === 'guest' && (
              <span className="absolute -top-0.5 right-0.5 px-1 py-px rounded text-[8px] font-bold bg-slate-200 text-slate-700 border border-slate-300">🔒 LOCK</span>
            )}
          </button>

          <button
            onClick={() => setIsSidebarOpen(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-slate-500 hover:text-slate-900 transition-all cursor-pointer active:scale-95"
            title={lang === 'my' ? 'မီနူး' : 'Menu'}
          >
            <Menu className="w-6 h-6 text-slate-700" />
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
        publicShops={publicShops}
        plan={plan}
        lang={lang}
        fuelLogs={fuelLogs}
        vehicleMaintenance={vehicleMaintenance}
        tirePressureLogs={tirePressureLogs}
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
        editingDebt={editingDebt}
        onUpdate={handleUpdateDebt}
        onClose={() => { setIsDebtModalOpen(false); setEditingDebt(null); }}
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
            wallets={computedWallets}
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
        shops={shops}
        vehicles={vehicles}
        lang={lang}
        onNavigateToTab={(tab) => {
          setIsSearchModalOpen(false);
          setActiveTab(tab);
        }}
        onSelectDebtForRepayment={(debt) => {
          setSelectedDebtForRepayment(debt);
          setEditingRepayment(null);
          setIsRepaymentModalOpen(true);
        }}
        onSelectTransaction={(t) => {
          // Opens the record itself (edit modal) — the destination
          // list's own search/highlight is owned by TransactionsView.
          setIsSearchModalOpen(false);
          handleOpenEditTx(t);
        }}
        onSelectWallet={(w) => {
          setIsSearchModalOpen(false);
          setActiveTab('wallets');
        }}
        onSelectCategory={(c) => {
          setIsSearchModalOpen(false);
          setActiveTab('categories');
        }}
        onSelectShop={(shop) => {
          setIsSearchModalOpen(false);
          setActiveTab('shops');
        }}
        onSelectVehicle={(v) => {
          setIsSearchModalOpen(false);
          setActiveTab('vehicles');
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

      {updateAvailable && (
        <div className="fixed inset-0 z-[200] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl shrink-0">✨</div>
              <div className="min-w-0">
                <h2 className="font-bold text-lg text-slate-900 leading-tight">
                  {lang === 'my' ? 'ဗားရှင်းအသစ် ရရှိပါပြီ' : 'New Version Available'}
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {lang === 'my' ? 'အသစ်' : 'New'}: <span className="font-mono font-bold text-emerald-700">{updateAvailable.version}</span>
                  <span className="text-slate-300"> • </span>
                  <span className="font-mono">{lang === 'my' ? 'လက်ရှိ' : 'Current'}: {CURRENT_APP_VERSION}</span>
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              {lang === 'my'
                ? 'ပိုမိုကောင်းမွန်သော ဗားရှင်းအသစ် ထွက်ရှိပါပြီ။ Update လုပ်ရန် နှိပ်ပါ။'
                : 'A newer version has been released. Tap Update to load the latest.'}
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleUpdateLater}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors cursor-pointer"
              >
                {lang === 'my' ? 'နောက်မှ' : 'Later'}
              </button>
              <button
                type="button"
                onClick={handleUpdateNow}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                {lang === 'my' ? '✨ Update လုပ်မည်' : '✨ Update Now'}
              </button>
            </div>
          </div>
        </div>
      )}

            {(isAuthModalOpen || showLoginModal) && (
        <div className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4">
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

      <LanguagePickerModal
        isOpen={overlayPickerOpen}
        current={langRaw}
        onSelect={handleSelectLang}
        onClose={() => setOverlayPickerOpen(false)}
      />
    </div>
  );
}