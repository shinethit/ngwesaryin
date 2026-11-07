import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  collection,
  collectionGroup,
  query,
  getDocs,
  getDoc,
  doc,
  orderBy,
  onSnapshot,
  updateDoc,
  deleteField,
  writeBatch,
} from 'firebase/firestore';
import { db, defaultDb, safeSetDoc, safeUpdateDoc, safeDeleteDoc, trackFirestoreReads } from '../lib/firebase';
import { useAuth, parseExpiryTime } from '../context/AuthContext';
import { AdminSystemMessage, AdminMessageType, ContactInfo, VisitorDoc, Transaction, Wallet, Category, PublicShop } from '../types';
import { INITIAL_CATEGORIES } from '../data/initialData';
import { parseMyanmarNumber } from '../utils/myanmarDigits';
import { formatLakhs, formatMMK } from '../utils/formatters';
import { fetchContactInfo, saveContactInfo, DEFAULT_CONTACT_INFO } from '../lib/contactInfo';
import { subscribeVisitors, getVisitorsTotalCount, getCountryFlag, deleteVisitorDoc } from '../lib/analyticsService';
import { fetchMyRefs, deleteSharedWalletRef } from '../lib/sharedWalletRefs';
import { logAdminAction, subscribeAdminAuditLog, AdminAuditLogEntry } from '../lib/adminAuditLog';
import { parseShopImportFile, previewShopImport, mapShopRow, shopDedupeKey, firstPhoneOf } from '../lib/shopImport';
import type { ShopImportPreview } from '../lib/shopImport';
import { QuotaDashboard } from './QuotaDashboard';
import { X, Copy, CheckCircle, Trash2, Eraser, Plus, RefreshCw, Key, Megaphone, AlertTriangle, FileText, Edit2, Check, Users, Search, Clock, Sparkles, ShieldCheck, UserCheck, Crown, Phone, Send, CreditCard, Save, Globe, Smartphone, Tablet, Monitor, Eye, Activity, TrendingUp, PieChart, Wallet as WalletIcon, ArrowUpRight, Sliders, Calendar, Flame, Database, ArrowUpDown, ArrowUp, ArrowDown, Store, Upload } from 'lucide-react';

interface ActivationCode {
  code: string;
  months: number;
  isUsed: boolean;
  usedBy?: string;
  usedEmail?: string;
  usedAt?: string;
  createdAt: string;
  createdBy: string;
  expiresAt?: string;
}

interface UserDoc {
  id: string;
  email?: string;
  displayName?: string;
  plan?: 'free' | 'premium';
  premiumExpiresAt?: string;
  premiumActivatedAt?: string;
  premiumMonths?: number;
  premiumCodeUsed?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'my' | 'en';
  transactions?: Transaction[];
  wallets?: Wallet[];
  categories?: Category[];
}

// ⚠️ Master Admin Email — must match AuthContext and Firestore rules
const MASTER_ADMIN_EMAIL = 'khunthanshwe@gmail.com';

// [v7.5.67] Newest users first, sorted CLIENT-SIDE. Firestore
// orderBy('createdAt') silently EXCLUDES documents that lack the
// field — that is how 2 of 9 user profiles went missing from the
// Admin Panel. ISO date strings sort lexicographically =
// chronologically; a missing/empty createdAt sorts last.
const sortUsersNewestFirst = (users: UserDoc[]): UserDoc[] =>
  [...users].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  lang,
  transactions = [],
  wallets = [],
  categories = [],
}) => {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'quota' | 'users_codes' | 'broadcast' | 'contact_info' | 'analytics'>('overview');
  // [v7.5.55 E23] Scroll the tab strip so the active tab is visible
  // when jumping here from an Overview shortcut.
  const tabStripRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    tabStripRef.current?.querySelector(`[data-tab="${activeTab}"]`)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [activeTab]);

  // Visitor & Analytics state
  const [visitorsList, setVisitorsList] = useState<VisitorDoc[]>([]);
  // [v7.5.65] True total visitor count via aggregate query (the list is
  // capped at the latest 500 docs). Null until loaded / on failure —
  // the display falls back to the deduped list count.
  const [visitorsTotalCount, setVisitorsTotalCount] = useState<number | null>(null);
  const [visitorFilter, setVisitorFilter] = useState<'all' | 'guest' | 'member' | 'active'>('all');
  const [visitorSearch, setVisitorSearch] = useState('');
  // [v7.5.64 B-12] Admin audit trail — latest 50 actions (read-only view).
  const [auditLog, setAuditLog] = useState<AdminAuditLogEntry[]>([]);
  const [auditLogError, setAuditLogError] = useState<string | null>(null);
  // [wallet-backfill] Prevents double-clicks during the users↔cloud wallet sync
  const [isBackfillingWallets, setIsBackfillingWallets] = useState(false);

  // [v7.5.71 shop import] JSON file import into public_shops
  const [shopImportPreview, setShopImportPreview] = useState<ShopImportPreview | null>(null);
  const [shopImportError, setShopImportError] = useState<string | null>(null);
  const [isImportingShops, setIsImportingShops] = useState(false);
  const [shopImportProgress, setShopImportProgress] = useState({ done: 0, total: 0 });
  const [shopImportSummary, setShopImportSummary] = useState<{ imported: number; skipped: number; failed: number; errors: string[] } | null>(null);
  const shopImportInputRef = useRef<HTMLInputElement | null>(null);

  // Codes & Users combined state
  const [codes, setCodes] = useState<ActivationCode[]>([]);
  const [usersList, setUsersList] = useState<UserDoc[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState<number>(1);
  const [generateCount, setGenerateCount] = useState<number>(1);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState<'all' | 'premium' | 'free' | 'expired'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'used' | 'available' | 'expired' | 'users'>('all');

  // Broadcast state
  const [messages, setMessages] = useState<AdminSystemMessage[]>([]);
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);

  // Message Form State
  const [msgTitle, setMsgTitle] = useState('');
  const [msgContent, setMsgContent] = useState('');
  const [msgType, setMsgType] = useState<AdminMessageType>('announcement');
  const [msgIsMarquee, setMsgIsMarquee] = useState(true);
  const [msgIsActive, setMsgIsActive] = useState(true);
  const [submittingMsg, setSubmittingMsg] = useState(false);
  // [v7.5.64 C-23] Broadcast list search (title / content / type).
  const [msgSearchQuery, setMsgSearchQuery] = useState('');

  // Contact Info state
  const [contactForm, setContactForm] = useState<ContactInfo>(DEFAULT_CONTACT_INFO);
  const [contactLoading, setContactLoading] = useState(false);
  // [v7.5.55 E16] Last successfully loaded values + load-error flag.
  // Empty strings must never overwrite these, and a failed read must
  // never reset the form to the hardcoded placeholder defaults.
  const [contactSavedSnapshot, setContactSavedSnapshot] = useState<ContactInfo>(DEFAULT_CONTACT_INFO);
  const [contactLoadError, setContactLoadError] = useState<string | null>(null);
  const isContactDirty = JSON.stringify(contactForm) !== JSON.stringify(contactSavedSnapshot);
  const [contactSaving, setContactSaving] = useState(false);
  // [v7.5.64 C-03] True only after a successful contact-info load.
  // (Save-button gating is a separate worker's job.)
  const [contactLoaded, setContactLoaded] = useState(false);
  const [contactSuccessMsg, setContactSuccessMsg] = useState('');

  // Overview Benchmark Mode
  const [overviewBenchmarkMode, setOverviewBenchmarkMode] = useState<'category' | 'subcategory'>('category');
  const [selectedBenchmarkCat, setSelectedBenchmarkCat] = useState<string>('all');

  // System Transactions & Data Management Modal State
  const [showTxManagerModal, setShowTxManagerModal] = useState(false);
  const [selectedFilterCategory, setSelectedFilterCategory] = useState<string>('all');
  const [selectedFilterUser, setSelectedFilterUser] = useState<string>('all');
  const [searchTxQuery, setSearchTxQuery] = useState('');
  // [admin-dr] Date range filter for TxManagerModal
  const [txDatePreset, setTxDatePreset] = useState<'all' | 'today' | '7d' | '30d' | 'this_month' | 'last_month' | 'custom'>('all');
  // [v7.5.64 C-08] Records-modal visible-row cap ("show more" adds 100).
  const [modalVisibleCount, setModalVisibleCount] = useState(100);
  // [v7.5.64 C-20] Custom date-range validation error (From > To).
  const [txDateRangeError, setTxDateRangeError] = useState<string | null>(null);
  const [txDateFrom, setTxDateFrom] = useState<string>('');
  const [txDateTo, setTxDateTo] = useState<string>('');
  // [calc-fix] Per-user summary date range
  const [summaryDatePreset, setSummaryDatePreset] = useState<'all' | 'today' | '7d' | '30d' | 'this_month' | 'last_month' | 'custom'>('all');
  const [summaryFrom, setSummaryFrom] = useState<string>('');
  const [summaryTo, setSummaryTo] = useState<string>('');
  // [v7.5.64 A-11] Search filter for the per-user summary list.
  const [summarySearch, setSummarySearch] = useState('');
  const [txSortBy, setTxSortBy] = useState<'date' | 'amount' | 'user' | 'category'>('date');
  const [txSortOrder, setTxSortOrder] = useState<'asc' | 'desc'>('desc');
  // [admin-dr] Apply preset → set from/to dates. Local timezone.
  const applyTxDatePreset = (preset: 'all' | 'today' | '7d' | '30d' | 'this_month' | 'last_month' | 'custom') => {
    setTxDatePreset(preset);
    const toStr = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return y + '-' + m + '-' + day;
    };
    const now = new Date();
    const todayStr = toStr(now);
    if (preset === 'all') { setTxDateFrom(''); setTxDateTo(''); return; }
    if (preset === 'today') { setTxDateFrom(todayStr); setTxDateTo(todayStr); return; }
    if (preset === '7d') {
      const d = new Date(now); d.setDate(d.getDate() - 6);
      setTxDateFrom(toStr(d)); setTxDateTo(todayStr); return;
    }
    if (preset === '30d') {
      const d = new Date(now); d.setDate(d.getDate() - 29);
      setTxDateFrom(toStr(d)); setTxDateTo(todayStr); return;
    }
    if (preset === 'this_month') {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      setTxDateFrom(toStr(d)); setTxDateTo(todayStr); return;
    }
    if (preset === 'last_month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      setTxDateFrom(toStr(start)); setTxDateTo(toStr(end)); return;
    }
    // 'custom' — leave as-is; user will edit the from/to inputs
  };

  // [calc-fix] Same preset logic for the per-user summary table.
  const applySummaryDatePreset = (preset: 'all' | 'today' | '7d' | '30d' | 'this_month' | 'last_month' | 'custom') => {
    setSummaryDatePreset(preset);
    const toStr = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return y + '-' + m + '-' + day;
    };
    const now = new Date();
    const todayStr = toStr(now);
    if (preset === 'all') { setSummaryFrom(''); setSummaryTo(''); return; }
    if (preset === 'today') { setSummaryFrom(todayStr); setSummaryTo(todayStr); return; }
    if (preset === '7d') {
      const d = new Date(now); d.setDate(d.getDate() - 6);
      setSummaryFrom(toStr(d)); setSummaryTo(todayStr); return;
    }
    if (preset === '30d') {
      const d = new Date(now); d.setDate(d.getDate() - 29);
      setSummaryFrom(toStr(d)); setSummaryTo(todayStr); return;
    }
    if (preset === 'this_month') {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      setSummaryFrom(toStr(d)); setSummaryTo(todayStr); return;
    }
    if (preset === 'last_month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      setSummaryFrom(toStr(start)); setSummaryTo(toStr(end)); return;
    }
  };

  const [isDeletingTxId, setIsDeletingTxId] = useState<string | null>(null);
  // [v7.5.64 B-16] In-flight code id for Revoke / Delete-code (that row's
  // buttons disable while its handler runs).
  const [busyCode, setBusyCode] = useState<string | null>(null);
  // [v7.5.64 B-17/C-17] In-flight broadcast message id for the Active /
  // Marquee toggles (that row's badge buttons disable while it is set).
  const [togglingMsgId, setTogglingMsgId] = useState<string | null>(null);
  const [isPurgingBatch, setIsPurgingBatch] = useState(false);
  // [v7.5.64 B-17] Which user row has a delete/purge in flight (row-button label reads this).
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [actionSuccessToast, setActionSuccessToast] = useState<string>('');

  // [v7.5.55 E10/E18/E31] Never show confident 0s on a failed read.
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [listenerError, setListenerError] = useState<string | null>(null);

  // System-wide aggregated data across ALL users
  const [systemTransactions, setSystemTransactions] = useState<Transaction[]>([]);
  const [systemWallets, setSystemWallets] = useState<Wallet[]>([]);
  const [systemCategories, setSystemCategories] = useState<Category[]>([]);
  // [v7.5.64 A-08] Live doc counts for the remaining storage collections
  // (collectionGroup reads for per-user subcollections + top-level lists
  // for feedbacks/admins). sharedWallets is NOT countable: rules disable
  // list on /sharedWallets and restrict sharedWalletRefs to the ref owner.
  const [systemExtraCounts, setSystemExtraCounts] = useState({
    debts: 0,
    vehicles: 0,
    fuelLogs: 0,
    vehicleMaintenance: 0,
    tirePressureLogs: 0,
    budgets: 0,
    savingsTargets: 0,
    shops: 0,
    feedbacks: 0,
    admins: 0,
  });
  const [systemDataLoading, setSystemDataLoading] = useState(false);
  // [v7.5.64 A-06] Comma-joined names of collections whose system-wide
  // load failed (transactions / wallets / categories); null when none.
  const [systemPartialError, setSystemPartialError] = useState<string | null>(null);

  // Function to load all system-wide data (transactions, wallets, categories) across all users
  const loadSystemWideData = useCallback(async () => {
    setSystemDataLoading(true);
    try {
      // 1. Query collection groups for global data across all user documents
      let allTxs: Transaction[] = [];
      let allWallets: Wallet[] = [];
      let allCats: Category[] = [];
      // [v7.5.64 A-06] Track per-collection load failure so a partial
      // failure surfaces as a banner naming the failed collection.
      let failedTxLoad = false;
      let failedWalletLoad = false;
      let failedCatLoad = false;

      try {
        const txsSnap = await getDocs(query(collectionGroup(db, 'transactions')));
        trackFirestoreReads('transactions', txsSnap.docs.length || 1);
        allTxs = txsSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          _docPath: d.ref.path,
          _userId: (d.data() as any).userId || d.ref.parent?.parent?.id || '',
        } as unknown as Transaction));
      } catch (cgErr) {
        failedTxLoad = true;
        console.warn('collectionGroup transactions error:', cgErr);
      }

      try {
        const walletsSnap = await getDocs(query(collectionGroup(db, 'wallets')));
        trackFirestoreReads('wallets', walletsSnap.docs.length || 1);
        allWallets = walletsSnap.docs.map((d) => ({ id: d.id, ...d.data(), _docPath: d.ref.path } as unknown as Wallet));
      } catch (cgErr) {
        failedWalletLoad = true;
        console.warn('collectionGroup wallets error:', cgErr);
      }

      try {
        const catsSnap = await getDocs(query(collectionGroup(db, 'categories')));
        trackFirestoreReads('categories', catsSnap.docs.length || 1);
        allCats = catsSnap.docs.map((d) => ({ id: d.id, ...d.data(), _docPath: d.ref.path } as unknown as Category));
      } catch (cgErr) {
        failedCatLoad = true;
        console.warn('collectionGroup categories error:', cgErr);
      }

      // [v7.5.64 A-08] Counts for the remaining storage collections.
      // One collectionGroup query per per-user subcollection (admin read is
      // allowed via canAccess) + top-level lists for feedbacks/admins.
      // Counts only — docs are not retained. A failed read leaves that
      // count at 0 instead of failing the whole system load.
      const extraCounts = { debts: 0, vehicles: 0, fuelLogs: 0, vehicleMaintenance: 0, tirePressureLogs: 0, budgets: 0, savingsTargets: 0, shops: 0, feedbacks: 0, admins: 0 };
      const countGroup = async (name: keyof typeof extraCounts, group: string) => {
        try {
          const snap = await getDocs(query(collectionGroup(db, group)));
          trackFirestoreReads(group, snap.docs.length || 1);
          extraCounts[name] = snap.docs.length;
        } catch (cgErr) {
          console.warn(`collectionGroup ${group} count error:`, cgErr);
        }
      };
      const countTopLevel = async (name: 'feedbacks' | 'admins', coll: string) => {
        try {
          const snap = await getDocs(query(collection(db, coll)));
          trackFirestoreReads(coll, snap.docs.length || 1);
          extraCounts[name] = snap.docs.length;
        } catch (collErr) {
          console.warn(`${coll} count error:`, collErr);
        }
      };
      await Promise.all([
        countGroup('debts', 'debts'),
        countGroup('vehicles', 'vehicles'),
        countGroup('fuelLogs', 'fuelLogs'),
        countGroup('vehicleMaintenance', 'vehicleMaintenance'),
        countGroup('tirePressureLogs', 'tirePressureLogs'),
        countGroup('budgets', 'budgets'),
        countGroup('savingsTargets', 'savingsTargets'),
        countGroup('shops', 'shops'),
        countTopLevel('feedbacks', 'feedbacks'),
        countTopLevel('admins', 'admins'),
      ]);
      setSystemExtraCounts(extraCounts);

      // 2. Guaranteed supplement by querying each registered user subcollection across both databases
      try {
        const [usersSnap, defaultUsersSnap] = await Promise.all([
          getDocs(query(collection(db, 'users'))).catch(() => null),
          getDocs(query(collection(defaultDb, 'users'))).catch(() => null),
        ]);
        const mergedDocsMap = new Map<string, any>();
        if (defaultUsersSnap) {
          defaultUsersSnap.docs.forEach((doc) => mergedDocsMap.set(doc.id, doc));
        }
        if (usersSnap) {
          usersSnap.docs.forEach((doc) => mergedDocsMap.set(doc.id, doc));
        }
        const usersDocs = Array.from(mergedDocsMap.values());
        trackFirestoreReads('users', usersDocs.length || 1);

        if (usersDocs.length > 0) {
          const perUserTxPromises = usersDocs.map(async (uDoc) => {
            try {
              const userTxSnap = await getDocs(collection(db, 'users', uDoc.id, 'transactions'));
              return userTxSnap.docs.map((d) => ({
                id: d.id,
                ...d.data(),
                _docPath: d.ref.path,
                _userId: uDoc.id,
              } as unknown as Transaction));
            } catch {
              return [];
            }
          });
          const perUserWalletPromises = usersDocs.map(async (uDoc) => {
            try {
              const userWlSnap = await getDocs(collection(db, 'users', uDoc.id, 'wallets'));
              return userWlSnap.docs.map((d) => ({ id: d.id, ...d.data(), _docPath: d.ref.path, _userId: uDoc.id } as unknown as Wallet));
            } catch {
              return [];
            }
          });
          const perUserCatPromises = usersDocs.map(async (uDoc) => {
            try {
              const userCatSnap = await getDocs(collection(db, 'users', uDoc.id, 'categories'));
              return userCatSnap.docs.map((d) => ({ id: d.id, ...d.data(), _docPath: d.ref.path } as unknown as Category));
            } catch {
              return [];
            }
          });

          const txResults = await Promise.all(perUserTxPromises);
          const walletResults = await Promise.all(perUserWalletPromises);
          const catResults = await Promise.all(perUserCatPromises);

          const flattenedTxs = txResults.flat();
          const flattenedWallets = walletResults.flat();
          const flattenedCats = catResults.flat();

          // Merge without duplicates
          // [v7.5.64 A-10] Key by full doc path, not bare doc ID — two
          // users' docs can share the same ID and would overwrite each other.
          const txMap = new Map<string, Transaction>();
          [...allTxs, ...flattenedTxs].forEach((t) => txMap.set((t as any)._docPath || t.id, t));
          allTxs = Array.from(txMap.values());

          const walletMap = new Map<string, Wallet>();
          [...allWallets, ...flattenedWallets].forEach((w) => walletMap.set((w as any)._docPath || w.id, w));
          allWallets = Array.from(walletMap.values());

          const catMap = new Map<string, Category>();
          [...allCats, ...flattenedCats].forEach((c) => catMap.set((c as any)._docPath || c.id, c));
          allCats = Array.from(catMap.values());
        }
      } catch (userIterErr) {
        console.warn('Per-user subcollections fallback notice:', userIterErr);
      }

      setSystemTransactions(allTxs);
      setSystemWallets(allWallets);
      setSystemCategories(allCats);
      // [v7.5.64 A-06] A collection counts as failed only when its read
      // errored AND no data arrived (the per-user supplement above may
      // still have rescued it) — otherwise the banner would lie.
      const failedCols: string[] = [];
      if (failedTxLoad && allTxs.length === 0) failedCols.push('transactions');
      if (failedWalletLoad && allWallets.length === 0) failedCols.push('wallets');
      if (failedCatLoad && allCats.length === 0) failedCols.push('categories');
      setSystemPartialError(failedCols.length > 0 ? failedCols.join(', ') : null);
      // [v7.5.55 E10] A total failure must surface, not render as 0s.
      if (allTxs.length === 0 && allWallets.length === 0 && allCats.length === 0) {
        setOverviewError(lang === 'my' ? 'စနစ်ဒေတာ ဆွဲယူ၍ မရပါ — အင်တာနက်/ခွင့်ပြုချက်ကို စစ်ဆေးပြီး Refresh နှိပ်ပါ' : 'Could not load system data — check connection / permissions and tap Refresh.');
      } else {
        setOverviewError(null);
      }
    } catch (err) {
      console.error('Error fetching system-wide aggregated data:', err);
      setOverviewError(lang === 'my' ? 'စနစ်ဒေတာ ဆွဲယူ၍ မရပါ — အင်တာနက်/ခွင့်ပြုချက်ကို စစ်ဆေးပြီး Refresh နှိပ်ပါ' : 'Could not load system data — check connection / permissions and tap Refresh.');
    } finally {
      setSystemDataLoading(false);
    }
  }, []);

  // Real-time Firestore Listeners and Admin Bootstrapping
  useEffect(() => {
    if (!isOpen || !isAdmin) return;

    // ✅ FIX #1: Admin doc self-registration ONLY for master admin.
    // Other admins must be manually added via Firebase Console or by master admin.
    // This prevents privilege escalation that Firestore rules now block.
    if (user && user.email === MASTER_ADMIN_EMAIL) {
      const adminRef = doc(db, 'admins', user.uid);
      getDoc(adminRef).then((adminSnap) => {
        if (!adminSnap.exists()) {
          safeSetDoc(adminRef, {
            email: user.email,
            role: 'admin',
            createdAt: new Date().toISOString(),
          }).then((ok) => { if (!ok) console.warn('Admin bootstrap write was rejected (rules/quota)'); }).catch((err) => console.warn('Admin bootstrap err:', err));
        }
      }).catch((e) => console.warn('Admin check err:', e));

      // Self-healing: Ensure user profile plan in /users/{uid} is set to premium (VIP)
      // to resolve any stale 'free' plan left in the database from old rules!
      const userDocRef = doc(db, 'users', user.uid);
      getDoc(userDocRef).then((userSnap) => {
        const uData = userSnap.exists() ? userSnap.data() : null;
        if (!uData || uData.plan !== 'premium') {
          const expAt = new Date(Date.now() + 100 * 365.25 * 24 * 60 * 60 * 1000).toISOString();
          safeSetDoc(userDocRef, {
            userId: user.uid,
            email: user.email || '',
            displayName: user.displayName || 'Admin',
            plan: 'premium',
            premiumExpiresAt: expAt,
            premiumActivatedAt: new Date().toISOString(),
            premiumMonths: 999,
            updatedAt: new Date().toISOString(),
            // [v7.5.67] Only when CREATING the profile (uData == null):
            // a profile without createdAt is invisible to the Admin
            // users list. Never overwrite a real join date when the
            // doc already exists (only the plan is being fixed).
            ...(uData ? {} : { createdAt: new Date().toISOString() }),
          }, { merge: true }).catch((err) => console.warn('Failed to auto-heal admin profile:', err));
        }
      }).catch((e) => console.warn('Admin user doc check err:', e));
    }

    setDataLoading(true);

    // 1. Live Activation Codes Listener
    const codesQuery = query(collection(db, 'activationCodes'), orderBy('createdAt', 'desc'));
    const unsubCodes = onSnapshot(codesQuery, (snapshot) => {
      const codesData = snapshot.docs.map((d) => d.data() as ActivationCode);
      setCodes(codesData);
      setDataLoading(false);
    }, (err) => {
      console.warn('Realtime codes sync notice:', err);
      setDataLoading(false);
    });

    // 2. Live Users Listener (Consolidated from both db and defaultDb)
    let dbUsers: UserDoc[] = [];
    let defaultDbUsers: UserDoc[] = [];

    const mergeAndSetUsersList = (primary: UserDoc[], fallback: UserDoc[]) => {
      const mergedMap = new Map<string, UserDoc>();
      fallback.forEach((u) => {
        if (u && u.id) mergedMap.set(u.id, u);
      });
      primary.forEach((u) => {
        if (u && u.id) mergedMap.set(u.id, u);
      });
      setUsersList(sortUsersNewestFirst(Array.from(mergedMap.values())));
    };

    // [v7.5.67] No orderBy here on purpose: Firestore orderBy('createdAt')
    // silently drops profiles that lack createdAt (2 of 9 users went
    // missing). Ordering happens client-side in mergeAndSetUsersList.
    const usersQuery = query(collection(db, 'users'));
    const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
      dbUsers = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as UserDoc));
      mergeAndSetUsersList(dbUsers, defaultDbUsers);
    }, (err) => {
      console.warn('Realtime users sync notice:', err);
    });

    const defaultUsersQuery = query(collection(defaultDb, 'users'));
    const unsubDefaultUsers = onSnapshot(defaultUsersQuery, (snapshot) => {
      defaultDbUsers = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as UserDoc));
      mergeAndSetUsersList(dbUsers, defaultDbUsers);
    }, (err) => {
      console.warn('Realtime default users sync notice:', err);
    });

    // 3. Live System Messages Listener
    const msgsQuery = query(collection(db, 'systemMessages'), orderBy('createdAt', 'desc'));
    const unsubMsgs = onSnapshot(msgsQuery, (snapshot) => {
      const data: AdminSystemMessage[] = snapshot.docs.map((d) => {
        const item = d.data();
        return {
          id: d.id,
          title: item.title || '',
          content: item.content || '',
          type: item.type || 'announcement',
          isMarquee: !!item.isMarquee,
          isActive: !!item.isActive,
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: item.updatedAt,
          authorEmail: item.authorEmail,
        };
      });
      setMessages(data);
    }, (err) => {
      console.warn('Realtime messages sync notice:', err);
    });

    // 4. Live Visitors Listener
    const unsubVisitors = subscribeVisitors((list) => {
      setVisitorsList(list);
      setAnalyticsError(null);
    }, () => {
      setAnalyticsError(lang === 'my' ? 'ဧည့်သည် မှတ်တမ်းများ ဆွဲယူ၍ မရပါ — ပြသထားသော ကိန်းဂဏန်းများသည် အမှန်မဟုတ်နိုင်ပါ' : 'Could not load visitor logs — numbers shown may be wrong.');
    });

    // 4b. [v7.5.65] True total visitor count (aggregate query) — the
    // listener above is capped at the latest 500 docs, so the headline
    // total must come from here. Refresh every 60s; on failure leave
    // the previous value (the display falls back to the deduped count).
    // NOT re-fetched on every list update — that would spam count queries.
    const refreshVisitorsTotalCount = () => {
      getVisitorsTotalCount()
        .then((count) => setVisitorsTotalCount(count))
        .catch((err) => console.warn('Could not load total visitor count:', err));
    };
    refreshVisitorsTotalCount();
    const visitorsTotalCountTimer = setInterval(refreshVisitorsTotalCount, 60000);

    // 5. Live Admin Audit Log Listener
    const unsubAuditLog = subscribeAdminAuditLog((list) => {
      setAuditLog(list);
      setAuditLogError(null);
    }, () => {
      setAuditLogError(lang === 'my' ? 'Admin လုပ်ဆောင်ချက် မှတ်တမ်းကို ဆွဲယူ၍ မရပါ' : 'Could not load the admin activity log.');
    });







    // [admin-realtime-fix] Live system-wide listeners.
    // Uses collectionGroup so admin sees updates from ALL users'
    // subcollections without any manual refresh.
    const unsubSystemTxs = onSnapshot(
      query(collectionGroup(db, 'transactions')),
      (snap) => {
        const txs = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          _docPath: d.ref.path,
          _userId: (d.data() as any).userId || d.ref.parent?.parent?.id || '',
        } as unknown as Transaction));
        console.log('[admin] live txs:', txs.length);
        setSystemTransactions(txs);
      },
      (err) => { console.warn('[admin] live tx listener error:', err); setListenerError('transactions'); }
    );

    const unsubSystemWallets = onSnapshot(
      query(collectionGroup(db, 'wallets')),
      (snap) => {
        const wls = snap.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as Wallet));
        console.log('[admin] live wallets:', wls.length);
        setSystemWallets(wls);
      },
      (err) => { console.warn('[admin] live wallet listener error:', err); setListenerError('wallets'); }
    );

    const unsubSystemCats = onSnapshot(
      query(collectionGroup(db, 'categories')),
      (snap) => {
        const cats = snap.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as Category));
        console.log('[admin] live categories:', cats.length);
        setSystemCategories(cats);
      },
      (err) => { console.warn('[admin] live category listener error:', err); setListenerError('categories'); }
    );

    // 8. Contact Info
    loadContactInfoData();

    // 9. Initial Full Aggregation Fetch
    loadSystemWideData();

    return () => {
      unsubCodes();
      unsubUsers();
      unsubDefaultUsers();
      unsubMsgs();
      unsubVisitors();
      clearInterval(visitorsTotalCountTimer);
      unsubAuditLog();
      unsubSystemTxs();
      unsubSystemWallets();
      unsubSystemCats();
    };
  }, [isOpen, isAdmin, user, loadSystemWideData]);

  // Combined categories map across defaults, system-wide custom categories, and current categories
  const allMergedCategories = useMemo(() => {
    const map = new Map<string, Category>();
    INITIAL_CATEGORIES.forEach((c) => map.set(c.id, c));
    (systemCategories || []).forEach((c) => map.set(c.id, c));
    (categories || []).forEach((c) => map.set(c.id, c));
    return Array.from(map.values());
  }, [systemCategories, categories]);

  // [prem-fix] Compute effective plan per user — expired premium = free.
  // [v7.5.64 B-14] Uses the shared parseExpiryTime (AuthContext) instead
  // of a local copy of the parser. Fail-open on unparseable dates is
  // DELIBERATE and matches AuthContext (a corrupt expiry never demotes
  // a paying user from the badge side alone).
  const getUserEffectivePlan = (u: UserDoc): 'free' | 'premium' => {
    if (u.plan !== 'premium') return 'free';
    if (!u.premiumExpiresAt) return 'premium';
    const t = parseExpiryTime(u.premiumExpiresAt);
    if (t === null) return 'premium';
    return t < Date.now() ? 'free' : 'premium';
  };

  // [v7.5.64 B-12] Display labels for audit-log action codes.
  const auditActionLabel = (action: string): string => {
    const labels: Record<string, [string, string]> = {
      grant_premium: ['Premium ပေးခြင်း', 'Granted Premium'],
      revoke_code: ['ကုဒ် ရုပ်သိမ်းခြင်း', 'Revoked code'],
      delete_code: ['ကုဒ် ဖျက်ခြင်း', 'Deleted code'],
      delete_account: ['အကောင့် ဖျက်ခြင်း', 'Deleted account'],
      purge_user: ['အသုံးပြုသူ မှတ်တမ်းများ ရှင်းလင်းခြင်း', 'Purged user records'],
      purge_category: ['ကဏ္ဍ မှတ်တမ်းများ ရှင်းလင်းခြင်း', 'Purged category records'],
      generate_codes: ['ကုဒ်များ ထုတ်ပေးခြင်း', 'Generated codes'],
      delete_broadcast: ['ကြေညာချက် ဖျက်ခြင်း', 'Deleted broadcast'],
      save_contact_info: ['ဆက်သွယ်ရန် အချက်အလက် ပြင်ဆင်ခြင်း', 'Updated contact info'],
    };
    const pair = labels[action];
    return pair ? (lang === 'my' ? pair[0] : pair[1]) : action;
  };

  // Active dataset of transactions across the entire system (Default sorted newest first by date)
  // [v7.5.64 C-19] Fallback date derived in LOCAL (Myanmar) time, not UTC —
  // shared by the sort, the per-user summary and the purge-category filter,
  // so a 2 a.m. record never lands on the previous day in one place only.
  const localDateStr = (v: any): string => {
    if (!v) return '';
    const d = new Date(v);
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  };
  // [v7.5.64 A-06] No fallback to the admin's own transactions: when the
  // system-wide load returns nothing/failed, the Overview shows the
  // error/empty state, never the admin's personal data as "All Users".
  const effectiveTransactions = useMemo(() => {
    return [...systemTransactions].sort((a, b) => {
      const dateA = a.date || localDateStr(a.createdAt);
      const dateB = b.date || localDateStr(b.createdAt);
      if (dateA !== dateB) {
        return dateB.localeCompare(dateA); // Newest first
      }
      const timeA = typeof a.createdAt === 'number' ? a.createdAt : new Date(a.createdAt || a.date).getTime() || 0;
      const timeB = typeof b.createdAt === 'number' ? b.createdAt : new Date(b.createdAt || b.date).getTime() || 0;
      return timeB - timeA;
    });
  }, [systemTransactions]);

  // [v7.5.64 B-07] Per-user tx count/expense in a single pass — the users
  // table and mobile cards both read this map instead of filtering
  // effectiveTransactions once per row.
  const userTxStats = useMemo(() => { const m = new Map<string, { count: number; expense: number }>(); for (const t of effectiveTransactions) { const uid = (t as any)._userId || t.userId; if (!uid) continue; const e = m.get(uid) || { count: 0, expense: 0 }; e.count += 1; if (t.type === 'expense') e.expense += (t.amount || 0); m.set(uid, e); } return m; }, [effectiveTransactions]);

  // Active dataset of wallets across the entire system
  // [v7.5.64 A-06] No fallback to the admin's own wallets (see above).
  const effectiveWallets = useMemo(() => {
    return systemWallets;
  }, [systemWallets]);

  // [v7.5.64 C-08] Records-modal filter+sort, computed ONCE in a shared memo
  // and used by both the desktop table and the mobile cards (previously the
  // ~120-line filter+sort block was duplicated verbatim in two IIFEs).
  // Also the single place for C-06 (extended search), C-19 (local-date
  // fallback instead of UTC) and C-20 (invalid custom range ignored).
  const { modalFilteredTxs, sortedModalTxs } = useMemo(() => {
    // Local YYYY-MM-DD (same approach as applyTxDatePreset) — never UTC.
    const toLocalDateStr = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return y + '-' + m + '-' + day;
    };
    const txLocalDate = (tx: Transaction) =>
      tx.date || (tx.createdAt ? toLocalDateStr(new Date(tx.createdAt)) : '');
    const rangeInvalid = txDateRangeError !== null;
    const filtered = effectiveTransactions.filter((tx) => {
      // Category Filter
      if (selectedFilterCategory !== 'all') {
        const rawCat = tx.category || (tx as any).categoryId || 'other';
        const catObj = allMergedCategories.find((c) => c.id === rawCat || c.name === rawCat || c.nameEn === rawCat);
        const matchedKey = catObj ? catObj.id : rawCat;
        if (matchedKey !== selectedFilterCategory && rawCat !== selectedFilterCategory) return false;
      }
      // User Filter
      if (selectedFilterUser !== 'all') {
        const uId = (tx as any)._userId || tx.userId;
        if (uId !== selectedFilterUser) return false;
      }
      // [admin-dr] Date Range Filter (C-19: local date; C-20: an invalid
      // range is ignored, and a custom preset with no dates is "All")
      if (txDatePreset !== 'all' && !rangeInvalid) {
        const isCustomNoDates = txDatePreset === 'custom' && !txDateFrom && !txDateTo;
        if (!isCustomNoDates) {
          const txDate = txLocalDate(tx);
          if (txDateFrom && txDate < txDateFrom) return false;
          if (txDateTo && txDate > txDateTo) return false;
        }
      }
      // Query Filter (C-06: user/email/UID, date, wallet, type, resolved
      // category/sub-category names, note, amount as raw kyat and lakhs)
      if (searchTxQuery.trim()) {
        const rawQ = searchTxQuery.trim().toLowerCase();
        // Numeric form of the query (Myanmar digits converted) for amount
        // matching; only when the query is purely numeric.
        const qNum = /^[\d.,\u1000-\u1009]+$/.test(rawQ) ? parseMyanmarNumber(rawQ) : NaN;
        const q = Number.isFinite(qNum) ? String(qNum) : rawQ;
        const uId = (tx as any)._userId || tx.userId;
        const matchedUser = usersList.find((u) => u.id === uId);
        const catObj = allMergedCategories.find((c) => c.id === tx.category || c.name === tx.category || c.nameEn === tx.category);
        const catName = catObj ? catObj.name : tx.category || '';
        const catNameEn = catObj ? (catObj.nameEn || '') : '';
        const wallet = effectiveWallets.find((w) => w.id === tx.walletId);
        const walletName = wallet ? `${wallet.name || ''} ${wallet.nameEn || ''}` : '';
        const matchNote = (tx.note || '').toLowerCase().includes(rawQ);
        const matchAmount =
          (tx.amount || 0).toString().includes(q) ||
          formatLakhs(tx.amount || 0, lang).toLowerCase().includes(rawQ) ||
          formatLakhs(tx.amount || 0, lang).toLowerCase().includes(q);
        const matchCat =
          (tx.category || '').toLowerCase().includes(rawQ) ||
          catName.toLowerCase().includes(rawQ) ||
          catNameEn.toLowerCase().includes(rawQ);
        const matchSub = ((tx as any).subCategory || '').toLowerCase().includes(rawQ);
        const matchUser =
          (matchedUser?.email || '').toLowerCase().includes(rawQ) ||
          (matchedUser?.displayName || '').toLowerCase().includes(rawQ) ||
          (uId || '').toLowerCase().includes(rawQ);
        const matchDate = txLocalDate(tx).includes(rawQ) || (tx.date || '').includes(rawQ);
        const matchWallet = walletName.toLowerCase().includes(rawQ) || (tx.walletId || '').toLowerCase().includes(rawQ);
        const matchType =
          tx.type.toLowerCase().includes(rawQ) ||
          (tx.type === 'income' ? 'ဝင်ငွေ' : 'အသုံးစရိတ်').includes(rawQ);
        if (!matchNote && !matchAmount && !matchCat && !matchSub && !matchUser && !matchDate && !matchWallet && !matchType) return false;
      }
      return true;
    });
    // Sort by selected criteria (default: Date Descending)
    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;
      if (txSortBy === 'date') {
        const dateA = txLocalDate(a);
        const dateB = txLocalDate(b);
        if (dateA !== dateB) {
          cmp = dateA.localeCompare(dateB);
        } else {
          const timeA = typeof a.createdAt === 'number' ? a.createdAt : new Date(a.createdAt || a.date).getTime() || 0;
          const timeB = typeof b.createdAt === 'number' ? b.createdAt : new Date(b.createdAt || b.date).getTime() || 0;
          cmp = timeA - timeB;
        }
      } else if (txSortBy === 'amount') {
        cmp = (Number(a.amount) || 0) - (Number(b.amount) || 0);
      } else if (txSortBy === 'user') {
        const uA = (usersList.find((u) => u.id === ((a as any)._userId || a.userId))?.email || '').toLowerCase();
        const uB = (usersList.find((u) => u.id === ((b as any)._userId || b.userId))?.email || '').toLowerCase();
        cmp = uA.localeCompare(uB);
      } else if (txSortBy === 'category') {
        const catA = (a.category || '').toLowerCase();
        const catB = (b.category || '').toLowerCase();
        cmp = catA.localeCompare(catB);
      }
      return txSortOrder === 'desc' ? -cmp : cmp;
    });
    return { modalFilteredTxs: filtered, sortedModalTxs: sorted };
  }, [effectiveTransactions, selectedFilterCategory, selectedFilterUser, txDatePreset, txDateFrom, txDateTo, searchTxQuery, txSortBy, txSortOrder, usersList, allMergedCategories, effectiveWallets, lang, txDateRangeError]);

  // [v7.5.64 C-08] Reset the visible-row cap whenever any records filter changes.
  useEffect(() => {
    setModalVisibleCount(100);
  }, [selectedFilterUser, selectedFilterCategory, txDatePreset, txDateFrom, txDateTo, searchTxQuery, txSortBy, txSortOrder]);

  // [v7.5.64 C-20] Validate the custom date range on change: From > To sets
  // an error (the memo then ignores the range); otherwise clear it.
  useEffect(() => {
    if (txDatePreset === 'custom' && txDateFrom && txDateTo && txDateFrom > txDateTo) {
      setTxDateRangeError('ရက်စွဲ အစသည် အဆုံးထက် နောက်မကျ​စေရ');
    } else {
      setTxDateRangeError(null);
    }
  }, [txDatePreset, txDateFrom, txDateTo]);

  // [v7.5.64 C-07/C-20] True when any records-modal filter is active.
  const isTxFilterActive =
    selectedFilterUser !== 'all' ||
    selectedFilterCategory !== 'all' ||
    txDatePreset !== 'all' ||
    searchTxQuery.trim() !== '';


  // Live Category Spending Benchmark computed from ALL users' transactions
  const liveCategoryBenchmarks = useMemo(() => {
    const expenseTxs = (effectiveTransactions || []).filter((t) => t.type === 'expense');
    const totalExpense = expenseTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const colors = [
      'from-amber-500 to-orange-500',
      'from-sky-500 to-blue-600',
      'from-indigo-500 to-purple-600',
      'from-pink-500 to-rose-500',
      'from-emerald-500 to-teal-600',
      'from-violet-500 to-fuchsia-600',
      'from-cyan-500 to-teal-600',
      'from-red-500 to-rose-600',
    ];

    // [v7.5.55 E31] No expense data yet -> empty (the UI renders a
    // "no data yet" state). Never fabricate 0-amount category rows.
    if (totalExpense <= 0) {
      return [];
    }

    const catSums: { [catId: string]: number } = {};
    expenseTxs.forEach((t) => {
      const rawCat = t.category || (t as any).categoryId || 'other';
      const matchedCat = allMergedCategories.find((c) => c.id === rawCat || c.name === rawCat || c.nameEn === rawCat);
      const groupKey = matchedCat ? matchedCat.id : rawCat;
      catSums[groupKey] = (catSums[groupKey] || 0) + (Number(t.amount) || 0);
    });

    const sortedCats = Object.entries(catSums).sort((a, b) => b[1] - a[1]);
    // [v7.5.64 A-12] Aggregate the truncated remainder as an "Other" row
    // so the shares add up to 100%.
    const otherAmt = sortedCats.slice(8).reduce((sum, [, amt]) => sum + amt, 0);
    const rows = sortedCats.slice(0, 8)
      .map(([catId, amt], idx) => {
        const catObj = allMergedCategories.find((c) => c.id === catId || c.name === catId || c.nameEn === catId);
        const label = catObj
          ? (lang === 'my' ? catObj.name : (catObj.nameEn || catObj.name))
          : (catId === 'other' ? (lang === 'my' ? 'အခြား' : 'Other') : catId);
        const pct = Math.round((amt / totalExpense) * 100);
        return {
          id: catId,
          label,
          amount: amt,
          pct,
          color: colors[idx % colors.length],
        };
      });
    if (otherAmt > 0) {
      rows.push({
        id: 'other-remainder',
        label: 'အခြား / Other',
        amount: otherAmt,
        pct: Math.round((otherAmt / totalExpense) * 100),
        color: 'from-slate-400 to-slate-500',
      });
    }
    return rows;
  }, [effectiveTransactions, allMergedCategories, lang]);

  // Live Sub-Category Spending Breakdown computed from ALL users' transactions
  const liveSubCategoryBenchmarks = useMemo(() => {
    const expenseTxs = (effectiveTransactions || []).filter((t) => t.type === 'expense');
    const colorList = ['amber', 'sky', 'indigo', 'pink', 'emerald', 'violet', 'cyan'];

    // [v7.5.55 E31] No expense data yet -> empty, not fabricated rows.
    if (expenseTxs.length === 0) {
      return [];
    }

    const catMap = new Map<string, {
      catKey: string;
      category: string;
      totalAmount: number;
      color: string;
      subcatMap: Map<string, number>;
    }>();

    expenseTxs.forEach((t) => {
      const rawCat = t.category || (t as any).categoryId || 'other';
      const catObj = allMergedCategories.find((c) => c.id === rawCat || c.name === rawCat || c.nameEn === rawCat);
      const catKey = catObj ? catObj.id : rawCat;
      const catName = catObj ? (lang === 'my' ? catObj.name : (catObj.nameEn || catObj.name)) : rawCat;
      
      let subName = lang === 'my' ? 'အထွေထွေ အသုံး' : 'General';
      if (t.subCategoryId) {
        if (catObj?.subCategories) {
          const foundSub = catObj.subCategories.find(
            (s) => s.id === t.subCategoryId || s.name === t.subCategoryId || s.nameEn === t.subCategoryId
          );
          if (foundSub) {
            subName = lang === 'my' ? foundSub.name : (foundSub.nameEn || foundSub.name);
          } else {
            subName = t.subCategoryId;
          }
        } else {
          subName = t.subCategoryId;
        }
      }
      // [v7.5.64 A-13] No sub-category -> stays under the 'အထွေထွေ /
      // General' default above; note text is never used as a sub-category name.

      if (!catMap.has(catKey)) {
        catMap.set(catKey, {
          catKey,
          category: catName,
          totalAmount: 0,
          color: colorList[catMap.size % colorList.length],
          subcatMap: new Map<string, number>(),
        });
      }

      const entry = catMap.get(catKey)!;
      const amt = Number(t.amount) || 0;
      entry.totalAmount += amt;
      entry.subcatMap.set(subName, (entry.subcatMap.get(subName) || 0) + amt);
    });

    return Array.from(catMap.values())
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .map((grp) => {
        const sortedSubs = Array.from(grp.subcatMap.entries()).sort((a, b) => b[1] - a[1]);
        const subcats = sortedSubs.slice(0, 6)
          .map(([subName, amt]) => {
            const pct = grp.totalAmount > 0 ? Math.round((amt / grp.totalAmount) * 100) : 0;
            return {
              name: subName,
              amount: amt,
              pct,
              share: `${pct}%`,
            };
          });
        // [v7.5.64 A-12] Aggregate the truncated remainder as an "Other" row.
        const otherSubAmt = sortedSubs.slice(6).reduce((sum, [, amt]) => sum + amt, 0);
        if (otherSubAmt > 0) {
          const otherPct = grp.totalAmount > 0 ? Math.round((otherSubAmt / grp.totalAmount) * 100) : 0;
          subcats.push({ name: 'အခြား / Other', amount: otherSubAmt, pct: otherPct, share: `${otherPct}%` });
        }

        return {
          catKey: grp.catKey,
          category: grp.category,
          totalAmount: grp.totalAmount,
          color: grp.color,
          subcats,
        };
      });
  }, [effectiveTransactions, allMergedCategories, lang]);

  // Live Currency Distribution from ALL users' Wallets
  const liveCurrencyDistribution = useMemo(() => {
    const flagMap: { [k: string]: string } = {
      MMK: '🇲🇲',
      USD: '🇺🇸',
      THB: '🇹🇭',
      SGD: '🇸🇬',
      EUR: '🇪🇺',
      GBP: '🇬🇧',
      JPY: '🇯🇵',
      CNY: '🇨🇳',
    };

    // [v7.5.64 A-07] No wallets yet -> empty (the UI renders a "no data
    // yet" state). Never fabricate an "MMK 100%" row for a wallet that
    // does not exist.
    if (!effectiveWallets || effectiveWallets.length === 0) {
      return [];
    }

    const counts: { [curr: string]: number } = {};
    effectiveWallets.forEach((w) => {
      const c = (w.currency || 'MMK').toUpperCase();
      counts[c] = (counts[c] || 0) + 1;
    });

    const total = effectiveWallets.length;
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([code, count]) => ({
        code,
        flag: flagMap[code] || '🌐',
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
      }));
  }, [effectiveWallets]);

  // [v7.5.71 shop import] Read a JSON file, validate it and show a preview.
  // Nothing is written until the admin taps the Import button.
  const handleShopImportFile = (file: File) => {
    setShopImportError(null);
    setShopImportSummary(null);
    setShopImportProgress({ done: 0, total: 0 });
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rows = parseShopImportFile(String(reader.result || ''));
        setShopImportPreview(previewShopImport(rows));
      } catch {
        setShopImportPreview(null);
        setShopImportError(lang === 'my' ? 'ဖိုင်ဖတ်လို့ မရပါ။ JSON array ဖိုင် ဖြစ်ရပါမယ်။' : 'Could not read the file. It must be a JSON array file.');
      }
    };
    reader.onerror = () => {
      setShopImportPreview(null);
      setShopImportError(lang === 'my' ? 'ဖိုင်ဖတ်လို့ မရပါ။' : 'Could not read the file.');
    };
    reader.readAsText(file);
  };

  // [v7.5.71 shop import] Write the previewed rows to public_shops in
  // batches of 500. Dedupe by doc id and by name + normalized first
  // phone; one failing row never aborts the whole import.
  const runShopImport = async () => {
    if (!shopImportPreview || shopImportPreview.valid.length === 0 || isImportingShops) return;
    const admin = user;
    if (!admin) {
      setShopImportError(lang === 'my' ? 'ပြန်လည် ဝင်ရောက်ပြီးမှ ထည့်သွင်းပါ။' : 'Please sign in again before importing.');
      return;
    }
    setIsImportingShops(true);
    setShopImportError(null);
    setShopImportSummary(null);
    const valid = shopImportPreview.valid;
    const total = valid.length;
    setShopImportProgress({ done: 0, total });
    let imported = 0;
    let skipped = 0;
    let failedCount = 0;
    const errors: string[] = [];
    try {
      const existingSnap = await getDocs(collection(db, 'public_shops'));
      const existingIds = new Set<string>();
      const existingKeys = new Set<string>();
      existingSnap.docs.forEach((d) => {
        const data = d.data() as Partial<PublicShop>;
        existingIds.add(d.id);
        const key = shopDedupeKey(data.name || '', firstPhoneOf(data as unknown as Record<string, unknown>));
        if (key) existingKeys.add(key);
      });
      const seenIds = new Set<string>();
      const toWrite: { id: string; row: (typeof valid)[number] }[] = [];
      for (const row of valid) {
        const rowId = typeof row.id === 'string' && row.id.trim() ? row.id.trim() : '';
        if (rowId) {
          if (existingIds.has(rowId) || seenIds.has(rowId)) { skipped++; continue; }
          seenIds.add(rowId);
        }
        const key = shopDedupeKey(row.name, firstPhoneOf(row));
        if (key && existingKeys.has(key)) { skipped++; continue; }
        if (key) existingKeys.add(key);
        toWrite.push({ id: rowId, row });
      }
      const addedBy = admin.email || admin.displayName || 'အသုံးပြုသူ';
      const addedByUid = admin.uid;
      const createdAt = Date.now();
      for (let start = 0; start < toWrite.length; start += 500) {
        const chunk = toWrite.slice(start, start + 500);
        const batch = writeBatch(db);
        for (const entry of chunk) {
          const ref = entry.id
            ? doc(db, 'public_shops', entry.id)
            : doc(collection(db, 'public_shops'));
          batch.set(ref, mapShopRow(entry.row, { id: ref.id, addedBy, addedByUid, createdAt }));
        }
        try {
          await batch.commit();
          imported += chunk.length;
        } catch (e) {
          failedCount += chunk.length;
          errors.push((e as Error).message || 'Batch write failed');
        }
        setShopImportProgress({ done: Math.min(start + chunk.length, total), total });
      }
      setShopImportSummary({ imported, skipped, failed: failedCount, errors: errors.slice(0, 5) });
    } catch (e) {
      setShopImportError((e as Error).message || (lang === 'my' ? 'ထည့်သွင်းမှု မအောင်မြင်ပါ။' : 'Import failed.'));
    } finally {
      setIsImportingShops(false);
    }
  };

  const loadContactInfoData = async () => {
    setContactLoading(true);
    setContactLoadError(null);
    try {
      const data = await fetchContactInfo();
      if (data) {
        setContactForm(data);
        setContactSavedSnapshot(data);
        // [v7.5.64 C-03] Only a successful load marks contact data loaded.
        setContactLoaded(true);
      } else {
        // [v7.5.55 E16] Failed read: keep the current form values.
        setContactLoadError(lang === 'my' ? 'ဆက်သွယ်ရန် အချက်အလက် ဆွဲယူ၍ မရပါ — လက်ရှိ တန်ဖိုးများ မပြောင်းလဲထားပါ' : 'Could not load contact info — current values kept.');
      }
    } catch (err) {
      console.error('Error loading contact info:', err);
      setContactLoadError(lang === 'my' ? 'ဆက်သွယ်ရန် အချက်အလက် ဆွဲယူ၍ မရပါ' : 'Could not load contact info');
    } finally {
      setContactLoading(false);
    }
  };

  const handleSaveContactInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    // [v7.5.55 E16] Validate: phone-like fields must be digits (+,
    // spaces, dashes allowed), 9-15 digits; telegram username must
    // look like @name. Empty strings keep the previously saved value
    // instead of overwriting good values with blanks.
    // [v7.5.64 C-13] Normalise Myanmar digits (၀-၉) to ASCII first, then
    // count digits only: 9-15 digits, with +, spaces and dashes allowed
    // as separators (they do not count toward the digit total).
    // parseMyanmarNumber is NOT used here: it returns a float, which
    // would drop a leading zero and break the digit count.
    const toAsciiDigits = (s: string) => s.replace(/[၀-၉]/g, (d) => String(d.charCodeAt(0) - '၀'.charCodeAt(0)));
    const phoneOk = (v?: string) => {
      if (!v) return true;
      const digits = toAsciiDigits(v.trim()).replace(/[\s\-]/g, '');
      return /^\+?\d{9,15}$/.test(digits);
    };
    for (const [label, v] of [['Viber', contactForm.viberPhone], ['Direct Phone', contactForm.phone], ['KPay', contactForm.kpayPhone], ['Wave', contactForm.wavePhone]] as const) {
      if (v && !phoneOk(v)) {
        alert(lang === 'my' ? `${label} ဖုန်းနံပါတ် မမှန်ပါ — ဂဏန်း ၉-၁၅ လုံး ထည့်ပါ` : `${label} phone number is invalid — enter 9-15 digits`);
        return;
      }
    }
    if (contactForm.telegramUsername && !/^@?[A-Za-z0-9_]{3,}$/.test(contactForm.telegramUsername.trim())) {
      alert(lang === 'my' ? 'Telegram username မမှန်ပါ — ဥပမာ @ankhsam' : 'Telegram username is invalid — e.g. @ankhsam');
      return;
    }
    const toSave: ContactInfo = { ...contactForm };
    // [v7.5.64 C-14] ALL fields are sticky (empty = keep old) — the notes
    // used to blank on clear while phones restored the old value.
    (['viberPhone', 'phone', 'kpayPhone', 'kpayName', 'wavePhone', 'waveName', 'telegramUsername', 'contactNoteMy', 'contactNoteEn'] as const).forEach((k) => {
      if (!toSave[k]) (toSave as any)[k] = contactSavedSnapshot[k];
    });
    setContactSaving(true);
    setContactSuccessMsg('');
    try {
      await saveContactInfo(toSave);
      // [v7.5.64 B-12] Audit trail (best-effort, never blocks the save).
      void logAdminAction(user, 'save_contact_info');
      setContactForm(toSave);
      setContactSavedSnapshot(toSave);
      setContactSuccessMsg(lang === 'my' ? 'ဆက်သွယ်ရန် အချက်အလက်များ အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ ✓' : 'Contact details saved successfully ✓');
      setTimeout(() => setContactSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error saving contact info:', err);
      alert(lang === 'my' ? 'သိမ်းဆည်းရာတွင် အမှားအယွင်းရှိပါသည်' : 'Failed to save contact info');
    } finally {
      setContactSaving(false);
    }
  };

  const fetchAllData = async () => {
    setDataLoading(true);
    try {
      // 1. Fetch activation codes
      const codesQuery = query(collection(db, 'activationCodes'), orderBy('createdAt', 'desc'));
      const codesSnap = await getDocs(codesQuery);
      const codesData = codesSnap.docs.map((d) => d.data() as ActivationCode);
      setCodes(codesData);

      // 2. Fetch users from both db and defaultDb
      // [v7.5.67] No orderBy here on purpose: Firestore orderBy('createdAt')
      // silently drops profiles that lack createdAt (2 of 9 users went
      // missing). Ordering happens client-side below (sortUsersNewestFirst).
      const usersQuery = query(collection(db, 'users'));
      const defaultUsersQuery = query(collection(defaultDb, 'users'));
      
      const [usersSnap, defaultUsersSnap] = await Promise.all([
        getDocs(usersQuery).catch(() => null),
        getDocs(defaultUsersQuery).catch(() => null),
      ]);
      
      const primaryUsers = usersSnap ? usersSnap.docs.map((d) => ({ id: d.id, ...d.data() } as UserDoc)) : [];
      const defaultUsers = defaultUsersSnap ? defaultUsersSnap.docs.map((d) => ({ id: d.id, ...d.data() } as UserDoc)) : [];
      
      const mergedMap = new Map<string, UserDoc>();
      defaultUsers.forEach((u) => {
        if (u && u.id) mergedMap.set(u.id, u);
      });
      primaryUsers.forEach((u) => {
        if (u && u.id) mergedMap.set(u.id, u);
      });
      setUsersList(sortUsersNewestFirst(Array.from(mergedMap.values())));

      // 3. Fetch system-wide transactions, wallets, and categories across all users
      await loadSystemWideData();
    } catch (err) {
      console.error('Error fetching admin data:', err);
      setOverviewError(lang === 'my' ? 'Admin ဒေတာ ဆွဲယူ၍ မရပါ — အင်တာနက်/ခွင့်ပြုချက်ကို စစ်ဆေးပါ' : 'Could not load admin data — check connection / permissions.');
    }
    setDataLoading(false);
  };

  const fetchMessages = async () => {
    setBroadcastLoading(true);
    try {
      const q = query(collection(db, 'systemMessages'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data: AdminSystemMessage[] = snapshot.docs.map((d) => {
        const item = d.data();
        return {
          id: d.id,
          title: item.title || '',
          content: item.content || '',
          type: item.type || 'announcement',
          isMarquee: !!item.isMarquee,
          isActive: !!item.isActive,
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: item.updatedAt,
          authorEmail: item.authorEmail,
        };
      });
      setMessages(data);
    } catch (err) {
      console.error('Error fetching system messages:', err);
    }
    setBroadcastLoading(false);
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result.slice(0, 4) + '-' + result.slice(4);
  };

  const handleGenerateCodes = async () => {
    if (!user) return;
    // [v7.5.55 E5] Quantity was unvalidated: empty -> 0, 0/-5 -> "0 codes
    // generated", 1.5 -> 2 codes while the alert said 1.5, 200 bypassed
    // the supposed 50 cap. Must be an integer 1-50 (Myanmar digits OK).
    const qty = parseMyanmarNumber(String(generateCount));
    if (!Number.isInteger(qty) || qty < 1 || qty > 50) {
      alert(lang === 'my' ? 'ကုဒ် အရေအတွက် ၁ မှ ၅၀ အတွင်း ကိန်းပြည့်သာ ထည့်ပါ' : 'Quantity must be a whole number from 1 to 50');
      return;
    }
    setDataLoading(true);
    try {
      // Ensure admin doc exists in Firestore before writing activation codes
      const adminRef = doc(db, 'admins', user.uid);
      const adminSnap = await getDoc(adminRef);
      if (!adminSnap.exists() && user.email === MASTER_ADMIN_EMAIL) {
        const adminOk = await safeSetDoc(adminRef, {
          email: user.email,
          createdAt: new Date().toISOString(),
        });
        if (!adminOk) {
          alert(lang === 'my' ? 'Admin မှတ်တမ်း ဖန်တီး၍ မရပါ — ခွင့်ပြုချက်ကို စစ်ဆေးပါ' : 'Could not create admin record — check permissions.');
          setDataLoading(false);
          return;
        }
      }

      let made = 0;
      for (let i = 0; i < qty; i++) {
        // [v7.5.64 B-08] Never overwrite an existing code doc — a
        // collision could reset a USED code to unused and let it grant
        // Premium twice. Regenerate on collision (up to 5 attempts);
        // a slot that still collides is skipped, NOT counted as made.
        let codeString = generateRandomCode();
        let exists = (await getDoc(doc(db, 'activationCodes', codeString))).exists();
        let attempts = 1;
        while (exists && attempts < 5) {
          codeString = generateRandomCode();
          exists = (await getDoc(doc(db, 'activationCodes', codeString))).exists();
          attempts += 1;
        }
        if (exists) continue;
        // [v7.5.55 E30] Codes expire 1 year after creation.
        const newCode: ActivationCode = {
          code: codeString,
          months: selectedMonths,
          isUsed: false,
          createdAt: new Date().toISOString(),
          createdBy: user.uid,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        };
        const ok = await safeSetDoc(doc(db, 'activationCodes', codeString), newCode);
        if (ok) made += 1;
      }
      await fetchAllData();
      if (made === qty) {
        alert(lang === 'my' ? `${made} ကုဒ် အသစ်အောင်မြင်စွာ ထုတ်ပြီးပါပြီ ✓` : `Generated ${made} new code(s) successfully ✓`);
      } else {
        alert(lang === 'my' ? `⚠️ ကုဒ် ${made}/${qty} ခုသာ ထုတ်ယူနိုင်ခဲ့ပါသည် — အင်တာနက်/ခွင့်ပြုချက်ကို စစ်ဆေးပါ` : `⚠️ Only ${made}/${qty} codes were created — check connection / permissions.`);
      }
      // [v7.5.64 B-12] Audit trail (best-effort, never blocks the action).
      void logAdminAction(user, 'generate_codes', { detail: `${made}/${qty} codes, ${selectedMonths} mo`, result: made === qty ? 'success' : 'failed' });
    } catch (err: any) {
      console.error('Failed to generate codes', err);
      const msg = String(err?.message || err?.code || err);
      if (msg.toLowerCase().includes('permission-denied') || msg.toLowerCase().includes('permission')) {
        alert(lang === 'my' 
          ? 'ကုဒ်ထုတ်ရန် အခွင့်အရေး မရှိပါ။ Firestore Security Rules ကြောင့် ဖြစ်ပါသည် (Admin အဖြစ် ခွင့်ပြုချက် မရသေးပါ)။'
          : 'Permission denied by Firestore rules. Please ensure your user ID is registered in Firestore /admins collection.');
      } else {
        alert(lang === 'my' ? `ကုဒ်ထုတ်ယူ၍ မရပါ: ${msg}` : `Failed to generate codes: ${msg}`);
      }
    }
    setDataLoading(false);
  };

  const handleDeleteCode = async (codeId: string) => {
    // [v7.5.64 B-05] A used code must be revoked first — deleting it
    // would orphan the Premium it granted (the user keeps Premium
    // with no code to revoke). Defense in depth: the Delete button is
    // also disabled for used codes.
    const code = codes.find((c) => c.code === codeId);
    if (code?.isUsed) {
      alert(lang === 'my' ? 'ဒီကုဒ်ကို အရင် ရုပ်သိမ်းမှ ဖျက်နိုင်ပါမည် — သုံးပြီးသား ကုဒ်ကို တိုက်ရိုက် မဖျက်ပါနဲ့။' : 'Revoke this code first — a used code cannot be deleted directly.');
      return;
    }
    if (
      window.confirm(
        lang === 'my'
          ? `ကုဒ် "${codeId}" ကို အပြီးတိုင် ဖျက်မည်လား။`
          : `Delete code "${codeId}" permanently?`
      )
    ) {
      setDataLoading(true);
      // [v7.5.64 B-16] In-flight guard — a double-tap must not re-run the delete.
      setBusyCode(codeId);
      try {
        const ok = await safeDeleteDoc(doc(db, 'activationCodes', codeId));
        if (ok) {
          setCodes(codes.filter((c) => c.code !== codeId));
          // [v7.5.64 B-12] Audit trail.
          void logAdminAction(user, 'delete_code', { detail: codeId, targetUid: code?.usedBy });
        } else {
          alert(lang === 'my' ? 'ကုဒ် ဖျက်၍ မရပါ — အင်တာနက်/ခွင့်ပြုချက်ကို စစ်ဆေးပါ' : 'Could not delete the code — check connection / permissions.');
        }
      } catch (err) {
        console.error('Failed to delete code', err);
        alert(lang === 'my' ? 'ကုဒ် ဖျက်၍ မရပါ' : 'Failed to delete code');
      } finally {
        setDataLoading(false);
        setBusyCode(null);
      }
    }
  };

  // [v7.5.55 E26] Await the write: the green check used to show even
  // when nothing was copied. Fallback + error on failure.
  const copyToClipboard = async (text: string) => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand('copy');
        document.body.removeChild(ta);
      } catch { ok = false; }
    }
    if (ok) {
      setCopiedCode(text);
      setTimeout(() => setCopiedCode(null), 2000);
    } else {
      alert(lang === 'my' ? 'ကူးယူ၍ မရပါ — ကုဒ်ကို လက်ဖြင့် ရွေးပြီး ကူးပါ' : 'Copy failed — please select and copy the code manually');
    }
  };

  // Helper to find assigned user for a code
  const getAssignedUser = (
    code: ActivationCode
  ): { email: string; id: string; expiresAt?: string } | null => {
    if (!code.isUsed) return null;

    // First check direct code fields
    if (code.usedEmail || code.usedBy) {
      const foundUser = usersList.find(
        (u) =>
          u.id === code.usedBy ||
          (u.email && u.email.toLowerCase() === code.usedEmail?.toLowerCase())
      );
      return {
        email: code.usedEmail || foundUser?.email || code.usedBy || 'Unknown User',
        id: code.usedBy || foundUser?.id || '',
        expiresAt: foundUser?.premiumExpiresAt,
      };
    }

    // Check by user whose premiumCodeUsed matches this code
    const matchedUser = usersList.find((u) => u.premiumCodeUsed === code.code);
    if (matchedUser) {
      return {
        email: matchedUser.email || matchedUser.id,
        id: matchedUser.id,
        expiresAt: matchedUser.premiumExpiresAt,
      };
    }

    return null;
  };

  // [v7.5.55 E19] Revoke Premium for the user a used code belongs to.
  // Deleting the code alone never touched users/{uid}.plan.
  const handleRevokeCode = async (code: ActivationCode) => {
    const assigned = getAssignedUser(code);
    if (!assigned?.id) {
      alert(lang === 'my' ? 'ဤကုဒ်ကို သုံးထားသော အသုံးပြုသူကို ရှာမတွေ့ပါ' : 'Could not find the user who redeemed this code.');
      return;
    }
    // [v7.5.64 B-02] Never write to a user doc that no longer exists —
    // a merge-set would recreate a deleted account (zombie user).
    const userSnap = await getDoc(doc(db, 'users', assigned.id));
    if (!userSnap.exists()) {
      alert(lang === 'my' ? 'ဤအသုံးပြုသူ မရှိတော့ပါ — အကောင့် ဖျက်ပြီးဖြစ်နိုင်ပါသည်' : 'This user no longer exists — the account may have been deleted.');
      return;
    }
    if (!window.confirm(lang === 'my' ? `ကုဒ် "${code.code}" ကို သုံးထားသော ${assigned.email} ၏ Premium ကို ရုပ်သိမ်းပြီး Free သို့ ပြန်ချမည်လား။` : `Revoke Premium from ${assigned.email} (code "${code.code}") and downgrade to Free?`)) {
      return;
    }
    // [v7.5.64 B-16] In-flight guard — a double-tap must not re-run the revoke.
    setBusyCode(code.code);
    try {
      const ok = await safeSetDoc(doc(db, 'users', assigned.id), {
        plan: 'free',
        premiumExpiresAt: null,
        premiumMonths: 0,
        // [v7.5.64 B-04] Clear the redeemed-code link on the user too.
        premiumCodeUsed: null,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      if (!ok) {
        alert(lang === 'my' ? 'Premium ရုပ်သိမ်း၍ မရပါ — အင်တာနက်/ခွင့်ပြုချက်ကို စစ်ဆေးပါ' : 'Could not revoke Premium — check connection / permissions.');
        return;
      }
      // [v7.5.64 B-04] Unmark the code so it stops showing Used (and the
      // Revoke button stops reappearing). NOTE: raw updateDoc, NOT
      // safeUpdateDoc — safeUpdateDoc runs cleanForFirestore, which
      // mangles deleteField() into a plain {_methodName:'deleteField'}
      // map instead of deleting the field (verified against the
      // installed SDK: Object.keys(deleteField()) === ['_methodName']).
      let codeOk = false;
      try {
        await updateDoc(doc(db, 'activationCodes', code.code), {
          isUsed: false,
          usedBy: deleteField(),
          usedEmail: deleteField(),
          usedAt: deleteField(),
        });
        codeOk = true;
      } catch (codeErr) {
        console.error('Failed to unmark revoked code', codeErr);
      }
      await fetchAllData();
      if (!codeOk) {
        alert(lang === 'my' ? 'Premium ရုပ်သိမ်းပြီးပါပြီ၊ သို့သော် ကုဒ်ကို Used အဖြစ်မှ ပြန်ဖြုတ်မရပါ — ကုဒ်က Used အဖြစ် ဆက်ပြနေပါမည်။ ပြန်ကြိုးစားပါ' : 'Premium revoked, but the code could not be unmarked — it still shows as Used. Please retry.');
        return;
      }
      // [v7.5.64 B-12] Audit trail (only on full success — the early
      // returns above mean the revoke did not complete).
      void logAdminAction(user, 'revoke_code', { targetUid: assigned.id, targetEmail: assigned.email, detail: code.code });
      alert(lang === 'my' ? 'Premium ကို ရုပ်သိမ်းပြီး Free Plan သို့ ပြောင်းလဲပြီးပါပြီ ✓' : 'Premium revoked — user is now on Free ✓');
    } finally {
      setBusyCode(null);
    }
  };

  // State for Duration Selection Modal when Granting Premium directly
  const [selectedUserForPlan, setSelectedUserForPlan] = useState<UserDoc | null>(null);

  // Quick toggle / Grant plan with explicit duration selection
  const handleGrantPlanWithDuration = async (u: UserDoc, monthsDuration: number) => {
    // [v7.5.55 E19] Grant / revoke used to act immediately with no
    // confirm. Confirm first (both directions).
    const label = monthsDuration === 0
      ? (lang === 'my' ? 'Free Plan သို့ ပြန်ချမည်' : 'Revoke Premium to Free')
      : monthsDuration === 999
      ? (lang === 'my' ? 'တစ်သက်လုံး Premium ပေးမည်' : 'Grant Lifetime Premium')
      : (lang === 'my' ? `${monthsDuration} လ Premium ပေးမည်` : `Grant Premium for ${monthsDuration} months`);
    if (!window.confirm(lang === 'my' ? `${u.email || u.displayName || 'အသုံးပြုသူ'} ကို ${label} — သေချာပါသလား။` : `${label} for ${u.email || u.displayName || 'this user'} — are you sure?`)) {
      setSelectedUserForPlan(null);
      return;
    }
    setSelectedUserForPlan(null);
    setDataLoading(true);
    try {
      const userRef = doc(db, 'users', u.id);
      if (monthsDuration === 0) {
        // Downgrade to Free
        const ok = await safeSetDoc(
          userRef,
          {
            plan: 'free',
            premiumExpiresAt: null,
            premiumMonths: 0,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        if (!ok) {
          alert(lang === 'my' ? 'Free Plan သို့ ပြောင်းလဲ၍ မရပါ — အင်တာနက်/ခွင့်ပြုချက်ကို စစ်ဆေးပါ' : 'Could not downgrade to Free — check connection / permissions.');
          setDataLoading(false);
          return;
        }
        await fetchAllData();
        // [v7.5.64 B-12] Audit trail.
        void logAdminAction(user, 'grant_premium', { targetUid: u.id, targetEmail: u.email, detail: 'downgraded to free' });
        alert(lang === 'my' ? 'Free Plan သို့ ပြောင်းလဲပြီးပါပြီ ✓' : 'Downgraded to Free Plan ✓');
      } else {
        const now = new Date();
        // Calculate expiration date based on selected months
        // If 999 months (Lifetime), set to ~99 years
        // [v7.5.55 E6] A month is 30 days EVERYWHERE (was 30.5 here).
        // Renewals stack onto the existing expiry when it is later.
        const currentExpMs = u.premiumExpiresAt ? new Date(u.premiumExpiresAt).getTime() : NaN;
        const baseMs = !isNaN(currentExpMs) && currentExpMs > now.getTime() ? currentExpMs : now.getTime();
        const expDays = monthsDuration === 999 ? 365 * 99 : monthsDuration * 30;
        const expiresAt = new Date(baseMs + expDays * 24 * 60 * 60 * 1000).toISOString();
        const durationLabel =
          monthsDuration === 999
            ? lang === 'my' ? 'တစ်သက်လုံး (Lifetime)' : 'Lifetime'
            : monthsDuration >= 12
            ? `${Math.round(monthsDuration / 12)} နှစ်`
            : `${monthsDuration} လ`;

        const ok = await safeSetDoc(
          userRef,
          {
            plan: 'premium',
            premiumActivatedAt: now.toISOString(),
            premiumExpiresAt: expiresAt,
            premiumMonths: monthsDuration,
            updatedAt: now.toISOString(),
          },
          { merge: true }
        );
        if (!ok) {
          alert(lang === 'my' ? 'Premium ပေး၍ မရပါ — ကုဒ်/အကောင့် မပြောင်းလဲပါ။ အင်တာနက်/ခွင့်ပြုချက်ကို စစ်ဆေးပါ' : 'Could not grant Premium — nothing was changed. Check connection / permissions.');
          setDataLoading(false);
          return;
        }
        await fetchAllData();
        // [v7.5.64 B-12] Audit trail.
        void logAdminAction(user, 'grant_premium', { targetUid: u.id, targetEmail: u.email, detail: `${monthsDuration} mo` });
        alert(
          lang === 'my'
            ? `${u.email || u.displayName || 'အသုံးပြုသူ'} ကို Premium (${durationLabel}) အောင်မြင်စွာ ပေးပြီးပါပြီ ✓`
            : `Successfully granted Premium (${durationLabel}) to ${u.email || u.displayName || 'User'} ✓`
        );
      }
    } catch (err: any) {
      console.error('Failed to update user plan', err);
      const msg = String(err?.message || err?.code || err);
      alert(lang === 'my' ? `Plan ပြောင်းလဲ၍ မရပါ: ${msg}` : `Failed to update plan: ${msg}`);
    }
    setDataLoading(false);
  };

  // Broadcast Message Actions
  const handleSaveMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgTitle.trim() || !msgContent.trim()) {
      alert(
        lang === 'my'
          ? 'ခေါင်းစဉ်နှင့် အကြောင်းအရာကို ပြည့်စုံစွာ ဖြည့်ပါ'
          : 'Please fill in both title and content'
      );
      return;
    }

    setSubmittingMsg(true);
    try {
      const now = new Date().toISOString();
      let ok = false;
      if (editingMsgId) {
        const msgRef = doc(db, 'systemMessages', editingMsgId);
        ok = await safeUpdateDoc(msgRef, {
          title: msgTitle.trim(),
          content: msgContent.trim(),
          type: msgType,
          isMarquee: msgIsMarquee,
          isActive: msgIsActive,
          updatedAt: now,
        });
      } else {
        const msgRef = doc(collection(db, 'systemMessages'));
        ok = await safeSetDoc(msgRef, {
          title: msgTitle.trim(),
          content: msgContent.trim(),
          type: msgType,
          isMarquee: msgIsMarquee,
          isActive: msgIsActive,
          createdAt: now,
          authorEmail: user?.email || 'admin',
        });
      }
      // [v7.5.55 E8] On failure KEEP the form (it used to be wiped
      // even though nothing was saved) and show a Burmese error.
      if (!ok) {
        alert(lang === 'my' ? 'ကြေညာချက် သိမ်းဆည်း၍ မရပါ — ဖောင်အကြောင်းအရာများ မဖျက်ထားပါ။ အင်တာနက်/ခွင့်ပြုချက်ကို စစ်ဆေးပြီး ပြန်ကြိုးစားပါ' : 'Could not save the broadcast — your text is kept. Check connection / permissions and try again.');
        setSubmittingMsg(false);
        return;
      }
      // [v7.5.55 E20] Reset ALL five form fields on save (type /
      // marquee / active used to leak into the next new message).
      // [v7.5.64 C-16] Success feedback — capture wasEditing BEFORE
      // clearing editingMsgId (the form used to just empty, silently).
      const wasEditing = editingMsgId !== null;
      setMsgTitle('');
      setMsgContent('');
      setMsgType('announcement');
      setMsgIsMarquee(true);
      setMsgIsActive(true);
      setEditingMsgId(null);
      await fetchMessages();
      setActionSuccessToast(lang === 'my' ? (wasEditing ? 'ပြင်ဆင်ချက် သိမ်းပြီးပါပြီ' : 'ကြေညာချက် ထုတ်လွှင့်ပြီးပါပြီ ✓') : (wasEditing ? 'Changes saved ✓' : 'Broadcast published ✓'));
      setTimeout(() => setActionSuccessToast(''), 3000);
    } catch (err) {
      console.error('Error saving system message:', err);
      alert(lang === 'my' ? 'ကြေညာချက် သိမ်းဆည်း၍ မရပါ — ဖောင်အကြောင်းအရာများ မဖျက်ထားပါ' : 'Failed to save message — your text is kept');
    }
    setSubmittingMsg(false);
  };

  const handleDeleteMessage = async (id: string) => {
    if (!window.confirm(lang === 'my' ? 'ဤမက်ဆေ့ခ်ျကို ဖျက်မည်လား။' : 'Delete this message?'))
      return;
    try {
      const ok = await safeDeleteDoc(doc(db, 'systemMessages', id));
      if (ok) {
        const deletedMsg = messages.find((x) => x.id === id);
        setMessages(messages.filter((m) => m.id !== id));
        // [v7.5.64 B-12] Audit trail.
        void logAdminAction(user, 'delete_broadcast', { detail: deletedMsg?.title || id });
      } else {
        alert(lang === 'my' ? 'မက်ဆေ့ခ်ျ ဖျက်၍ မရပါ — အင်တာနက်/ခွင့်ပြုချက်ကို စစ်ဆေးပါ' : 'Could not delete the message — check connection / permissions.');
      }
    } catch (err) {
      console.error('Error deleting message:', err);
      alert(lang === 'my' ? 'မက်ဆေ့ခ်ျ ဖျက်၍ မရပါ' : 'Failed to delete message');
    }
  };

  const handleEditClick = (m: AdminSystemMessage) => {
    // [v7.5.64 C-22] Don't silently discard unsaved edits to another
    // message. (isContactDirty is Contact-specific, so the broadcast
    // form is compared inline: against the message being edited, or
    // against the new-message defaults when creating.)
    const edited = editingMsgId ? messages.find((x) => x.id === editingMsgId) : undefined;
    const isBroadcastDirty = edited
      ? msgTitle !== edited.title || msgContent !== edited.content || msgType !== edited.type || msgIsMarquee !== edited.isMarquee || msgIsActive !== edited.isActive
      : msgTitle.trim() !== '' || msgContent.trim() !== '' || msgType !== 'announcement' || !msgIsMarquee || !msgIsActive;
    if (isBroadcastDirty && !window.confirm('ပြင်ဆင်မှု မသိမ်းရသေးပါ — အသစ်ကို ပြင်မည်လား။')) {
      return;
    }
    setEditingMsgId(m.id);
    setMsgTitle(m.title);
    setMsgContent(m.content);
    setMsgType(m.type);
    setMsgIsMarquee(m.isMarquee);
    setMsgIsActive(m.isActive);
    // [v7.5.55 E20] On a phone nothing visibly changed before — scroll
    // the form into view so the admin sees the edit state.
    setTimeout(() => {
      document.getElementById('broadcast-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const handleCancelEdit = () => {
    setEditingMsgId(null);
    setMsgTitle('');
    setMsgContent('');
    setMsgType('announcement');
    setMsgIsMarquee(true);
    setMsgIsActive(true);
  };

  const handleToggleActive = async (m: AdminSystemMessage) => {
    // [v7.5.64 B-17/C-17] Per-row in-flight guard — rapid double-taps
    // must not flip the toggle twice from the same stale row.
    setTogglingMsgId(m.id);
    try {
      const msgRef = doc(db, 'systemMessages', m.id);
      const ok = await safeUpdateDoc(msgRef, {
        isActive: !m.isActive,
        updatedAt: new Date().toISOString(),
      });
      if (!ok) {
        alert(lang === 'my' ? 'အခြေအနေ ပြောင်း၍ မရပါ — အင်တာနက်/ခွင့်ပြုချက်ကို စစ်ဆေးပါ' : 'Could not change the status — check connection / permissions.');
        return;
      }
      setMessages(
        messages.map((item) => (item.id === m.id ? { ...item, isActive: !item.isActive } : item))
      );
    } catch (err) {
      console.error('Error toggling active status:', err);
      alert(lang === 'my' ? 'အခြေအနေ ပြောင်း၍ မရပါ' : 'Could not change the status');
    } finally {
      setTogglingMsgId(null);
    }
  };

  const handleToggleMarquee = async (m: AdminSystemMessage) => {
    // [v7.5.64 B-17/C-17] Per-row in-flight guard — rapid double-taps
    // must not flip the toggle twice from the same stale row.
    setTogglingMsgId(m.id);
    try {
      const msgRef = doc(db, 'systemMessages', m.id);
      const ok = await safeUpdateDoc(msgRef, {
        isMarquee: !m.isMarquee,
        updatedAt: new Date().toISOString(),
      });
      if (!ok) {
        alert(lang === 'my' ? 'Marquee ပြောင်း၍ မရပါ — အင်တာနက်/ခွင့်ပြုချက်ကို စစ်ဆေးပါ' : 'Could not change marquee — check connection / permissions.');
        return;
      }
      setMessages(
        messages.map((item) => (item.id === m.id ? { ...item, isMarquee: !item.isMarquee } : item))
      );
    } catch (err) {
      console.error('Error toggling marquee:', err);
      alert(lang === 'my' ? 'Marquee ပြောင်း၍ မရပါ' : 'Could not change marquee');
    } finally {
      setTogglingMsgId(null);
    }
  };

  // [v7.5.64 B-11] Unused code past its 1-year expiry — mirrors the redeem
  // rejection in PremiumModal.tsx (expiresAt < now).
  const isCodeExpired = (c: ActivationCode): boolean =>
    !c.isUsed && !!c.expiresAt && new Date(c.expiresAt).getTime() < Date.now();

  // [v7.5.64 B-13] Trim the query once — a pasted email/UID with a
  // trailing space or newline used to match nothing.
  const q = searchQuery.trim().toLowerCase();

  // Filtered Codes
  const filteredCodes = codes.filter((c) => {
    const assigned = getAssignedUser(c);
    const assignedUser = assigned?.id ? usersList.find((u) => u.id === assigned.id) : undefined;
    const matchesSearch =
      c.code.toLowerCase().includes(q) ||
      (assigned?.email && assigned.email.toLowerCase().includes(q)) ||
      (assignedUser?.displayName && assignedUser.displayName.toLowerCase().includes(q)) ||
      (assigned?.id && assigned.id.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (statusFilter === 'used') return c.isUsed;
    if (statusFilter === 'available') return !c.isUsed;
    if (statusFilter === 'expired') return isCodeExpired(c);
    return true;
  });

  // Filtered Users
  const filteredUsers = usersList.filter((u) => {
    const matchesSearch =
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.displayName && u.displayName.toLowerCase().includes(q)) ||
      u.id.toLowerCase().includes(q) ||
      (u.premiumCodeUsed && u.premiumCodeUsed.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    // [v7.5.64 B-07] Plan filter — expired = raw Premium but effectively Free.
    if (planFilter === 'premium') return getUserEffectivePlan(u) === 'premium';
    if (planFilter === 'free') return getUserEffectivePlan(u) === 'free';
    if (planFilter === 'expired') return u.plan === 'premium' && getUserEffectivePlan(u) === 'free';
    return true;
  });

  // Summary Metrics
  const totalCodesCount = codes.length;
  const usedCodesCount = codes.filter((c) => c.isUsed).length;
  // [v7.5.64 B-11] Unused codes past expiry are not redeemable, so they
  // are not available either — counted separately as expired. (Moved
  // above availableCodesCount: it must be declared before use.)
  const expiredCodesCount = codes.filter((c) => isCodeExpired(c)).length;
  const availableCodesCount = totalCodesCount - usedCodesCount - expiredCodesCount;
  // [v7.5.55 E10] Expired Premium counts as Free everywhere.
  const premiumUsersCount = usersList.filter((u) => getUserEffectivePlan(u) === 'premium').length;

  // Registered user lookup set for instant, rock-solid Member recognition
  const registeredUserSet = useMemo(() => {
    const set = new Set<string>();
    usersList.forEach((u) => {
      if (u.id) {
        set.add(u.id);
        set.add(u.id.toLowerCase());
      }
      if (u.email) {
        set.add(u.email.toLowerCase());
      }
    });
    return set;
  }, [usersList]);

  // Helper to reliably distinguish registered Members from anonymous Guests
  const isMemberVisitor = (v: VisitorDoc): boolean => {
    const cleanId = v.id?.replace(/^u_/, '').replace(/^user_/, '');
    const isRegistered =
      registeredUserSet.has(v.id) ||
      registeredUserSet.has(v.id.toLowerCase()) ||
      (Boolean(cleanId) && (registeredUserSet.has(cleanId) || registeredUserSet.has(cleanId.toLowerCase()))) ||
      (Boolean(v.userId) && (registeredUserSet.has(v.userId!) || registeredUserSet.has(v.userId!.toLowerCase()))) ||
      (Boolean(v.userEmail) && registeredUserSet.has(v.userEmail!.toLowerCase()));

    if (isRegistered || v.id?.startsWith('u_') || v.id?.startsWith('user_') || Boolean(v.userId || v.userEmail)) {
      return true;
    }
    // [v7.5.64 A-15/C-12] Default to guest unless membership is
    // positively established — a doc without isGuest used to count as
    // a Member and inflate the Members list.
    return false;
  };

  const handleDeleteVisitor = async (visitorId: string, name: string) => {
    const confirmMsg = lang === 'my'
      ? `"${name}" ၏ ဝင်ရောက်မှု မှတ်တမ်းကို ဖျက်ရန် သေချာပါသလား?`
      : `Are you sure you want to delete visitor log for "${name}"?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      // [v7.5.64 C-02] deleteVisitorDoc returns false on failure (never throws) — check it.
      const ok = await deleteVisitorDoc(visitorId);
      if (!ok) {
        alert(lang === 'my' ? 'မှတ်တမ်း ဖျက်၍ မရပါ — အင်တာနက်/ခွင့်ပြုချက်ကို စစ်ဆေးပါ' : 'Could not delete the record — check connection / permissions.');
        return;
      }
      setVisitorsList((prev) => prev.filter((v) => v.id !== visitorId));
    } catch (err) {
      console.error('Failed to delete visitor:', err);
      alert(lang === 'my' ? 'မှတ်တမ်း ဖျက်၍ မရပါ — အင်တာနက်/ခွင့်ပြုချက်ကို စစ်ဆေးပါ' : 'Could not delete the record — check connection / permissions.');
    }
  };

  // Canonical Deduplicated Visitors: Prevents the same user or visitor ID from appearing twice or flipping status
  const deduplicatedVisitors = useMemo(() => {
    const map = new Map<string, VisitorDoc>();

    visitorsList.forEach((v) => {
      const isMember = isMemberVisitor(v);
      const cleanId = v.id.replace(/^u_/, '').replace(/^user_/, '');

      // Determine grouping key
      let groupKey: string;
      if (isMember) {
        const matchedUser = usersList.find(
          (u) =>
            u.id === v.id ||
            u.id === cleanId ||
            (v.userId && u.id === v.userId) ||
            (v.userEmail && u.email?.toLowerCase() === v.userEmail.toLowerCase())
        );
        groupKey = `user_${matchedUser?.id || v.userId || cleanId || v.userEmail || v.id}`;
      } else {
        groupKey = `guest_${v.id}`;
      }

      const existing = map.get(groupKey);
      if (!existing) {
        map.set(groupKey, { ...v, isGuest: !isMember });
      } else {
        const existingIsMember = isMemberVisitor(existing);
        const resolvedIsMember = isMember || existingIsMember;

        const resolvedName =
          isMember && v.userName && v.userName !== 'Guest' && v.userName !== 'Guest Visitor'
            ? v.userName
            : existing.userName && existing.userName !== 'Guest' && existing.userName !== 'Guest Visitor'
            ? existing.userName
            : resolvedIsMember
            ? 'Member'
            : 'Guest Visitor';

        map.set(groupKey, {
          ...existing,
          isGuest: !resolvedIsMember,
          // Prioritize permanent member ID format (u_...)
          id: existing.id.startsWith('u_') ? existing.id : v.id.startsWith('u_') ? v.id : existing.id,
          userId: existing.userId || v.userId,
          userEmail: existing.userEmail || v.userEmail,
          userName: resolvedName,
          // [v7.5.64 C-18] Sum visit counts across a user's guest + member
          // docs (was Math.max — a user with 5 guest visits + 3 member
          // visits showed 5, not 8).
          visitCount: (existing.visitCount || 0) + (v.visitCount || 0),
          firstSeenAt: Math.min(existing.firstSeenAt || existing.lastActiveAt, v.firstSeenAt || v.lastActiveAt),
          lastActiveAt: Math.max(existing.lastActiveAt, v.lastActiveAt),
          country: existing.country || v.country,
          countryCode: existing.countryCode || v.countryCode,
          city: existing.city || v.city,
          // [v7.5.64 C-10] The flag follows whichever doc the country came from.
          geoInferred: existing.country ? !!existing.geoInferred : !!v.geoInferred,
          device: existing.device || v.device,
          browser: existing.browser || v.browser,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.lastActiveAt - a.lastActiveAt);
  }, [visitorsList, registeredUserSet, usersList]);

  // Visitor & Country Analytics Summary
  const analyticsStats = useMemo(() => {
    const total = deduplicatedVisitors.length;
    const registeredCount = deduplicatedVisitors.filter(isMemberVisitor).length;
    const guestCount = total - registeredCount;

    const countriesMap: { [country: string]: { code: string; count: number } } = {};
    const browsersMap: { [browser: string]: number } = {};
    let mobileCount = 0;
    let desktopCount = 0;

    deduplicatedVisitors.forEach((v) => {
      const countryName = v.country || '—';
      const countryCode = v.countryCode || '';

      // [v7.5.64 C-10] Inferred (fallback) rows do not count toward the
      // country chart — they are guesses, not measured locations.
      // (Device/browser counts below still include them.)
      if (!v.geoInferred) {
        if (!countriesMap[countryName]) {
          countriesMap[countryName] = { code: countryCode, count: 0 };
        }
        countriesMap[countryName].count += 1;
      }

      const browserName = v.browser || '—';
      browsersMap[browserName] = (browsersMap[browserName] || 0) + 1;

      if (v.device === 'mobile') mobileCount += 1;
      else if (v.device === 'tablet') { /* counted in tabletCount */ }
      else desktopCount += 1;
    });

    const tabletCount = deduplicatedVisitors.filter((v) => v.device === 'tablet').length;
    const countriesSorted = Object.entries(countriesMap)
      .map(([country, data]) => ({ country, code: data.code, count: data.count }))
      .sort((a, b) => b.count - a.count);
    // [v7.5.64 C-24] Browser breakdown, aggregated exactly like
    // countriesSorted (rendering beside the Device box is another
    // worker's item).
    const browsersSorted = Object.entries(browsersMap)
      .map(([name, count]) => ({ name, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 }))
      .sort((a, b) => b.count - a.count);

    return {
      total,
      guestCount,
      registeredCount,
      countriesSorted,
      browsersSorted,
      mobileCount,
      desktopCount,
      tabletCount,
    };
  }, [deduplicatedVisitors]);

  // Filtered Visitors List for Table
  const filteredVisitors = useMemo(() => {
    return deduplicatedVisitors.filter((v) => {
      const isMember = isMemberVisitor(v);
      // Filter by visitor type / status
      if (visitorFilter === 'guest' && isMember) return false;
      if (visitorFilter === 'member' && !isMember) return false;
      if (visitorFilter === 'active') {
        const isRecentlyActive = Date.now() - v.lastActiveAt < 10 * 60 * 1000;
        if (!isRecentlyActive) return false;
      }

      // Search query filter
      if (visitorSearch.trim()) {
        const q = visitorSearch.toLowerCase();
        const matchName = (v.userName || '').toLowerCase().includes(q);
        const matchEmail = (v.userEmail || '').toLowerCase().includes(q);
        const matchCountry = (v.country || '').toLowerCase().includes(q);
        const matchCity = (v.city || '').toLowerCase().includes(q);
        const matchDevice = (v.device || '').toLowerCase().includes(q);
        const matchBrowser = (v.browser || '').toLowerCase().includes(q);
        const matchId = (v.id || '').toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchCountry && !matchCity && !matchDevice && !matchBrowser && !matchId) {
          return false;
        }
      }

      return true;
    });
  }, [deduplicatedVisitors, visitorFilter, visitorSearch]);

  // [v7.5.64 C-23] Broadcast search — same pattern as visitor search
  // (title / content / type).
  const filteredMessages = useMemo(() => {
    const q = msgSearchQuery.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter((m) =>
      (m.title || '').toLowerCase().includes(q) ||
      (m.content || '').toLowerCase().includes(q) ||
      (m.type || '').toLowerCase().includes(q)
    );
  }, [messages, msgSearchQuery]);

  // [v7.5.64 A-11] Per-user income/expense/net computed ONCE per render pass
  // (was re-scanned per user in both the desktop table and the mobile cards:
  // O(users x transactions) twice). Keyed by the transaction list + summary
  // date range; summaryDatePreset is included because switching to 'custom'
  // turns the date filter on/off without changing from/to.
  const perUserSummary = useMemo(() => {
    const map = new Map<string, { income: number; expense: number; net: number; count: number }>();
    effectiveTransactions.forEach((t) => {
      const uid = ((t as any)._userId || t.userId) as string | undefined;
      if (!uid) return;
      if (summaryDatePreset !== 'all') {
        const txDate = t.date || localDateStr(t.createdAt);
        if (summaryFrom && txDate < summaryFrom) return;
        if (summaryTo && txDate > summaryTo) return;
      }
      const entry = map.get(uid) || { income: 0, expense: 0, net: 0, count: 0 };
      const amount = Number(t.amount) || 0;
      if (t.type === 'income') entry.income += amount;
      else if (t.type === 'expense') entry.expense += amount;
      entry.count += 1;
      entry.net = entry.income - entry.expense;
      map.set(uid, entry);
    });
    return map;
  }, [effectiveTransactions, summaryFrom, summaryTo, summaryDatePreset]);

  // [v7.5.64 A-11] Per-user summary list filtered by the search box above
  // the list (same match fields as the Users tab: email / name / UID).
  const filteredSummaryUsers = useMemo(() => {
    const q = summarySearch.trim().toLowerCase();
    if (!q) return usersList;
    return usersList.filter((u) =>
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.displayName && u.displayName.toLowerCase().includes(q)) ||
      u.id.toLowerCase().includes(q)
    );
  }, [usersList, summarySearch]);

  // Delete a single transaction directly from Firestore across any user account
  const handleDeleteSystemTx = async (tx: Transaction) => {
    const docPath = (tx as any)._docPath || ((tx as any)._userId ? `users/${(tx as any)._userId}/transactions/${tx.id}` : tx.userId ? `users/${tx.userId}/transactions/${tx.id}` : null);
    if (!docPath) {
      alert(lang === 'my' ? 'မှတ်တမ်းတည်နေရာ ရှာမတွေ့ပါ။' : 'Document path not found.');
      return;
    }
    if (!window.confirm(lang === 'my' ? `ဤစာရင်းမှတ်တမ်း "${tx.note || tx.category}" (${formatLakhs(tx.amount || 0, lang)}) ကို Database ပေါ်မှ အပြီးတိုင် ဖျက်ပစ်ရန် သေချာပါသလား?` : `Delete this record (${formatLakhs(tx.amount || 0, lang)}) permanently?`)) {
      return;
    }
    try {
      setIsDeletingTxId(tx.id);
      const ok = await safeDeleteDoc(doc(db, docPath));
      if (!ok) {
        alert(lang === 'my' ? 'မှတ်တမ်း ဖျက်၍ မရပါ — အင်တာနက်/ခွင့်ပြုချက်ကို စစ်ဆေးပါ' : 'Could not delete the record — check connection / permissions.');
        return;
      }
      setSystemTransactions((prev) => prev.filter((t) => t.id !== tx.id));
      setActionSuccessToast(lang === 'my' ? 'စာရင်းမှတ်တမ်းကို အောင်မြင်စွာ ဖျက်ပစ်ပြီးပါပြီ။' : 'Record deleted successfully.');
      setTimeout(() => setActionSuccessToast(''), 3000);
    } catch (err: any) {
      console.error('Failed to delete transaction:', err);
      alert((lang === 'my' ? 'ဖျက်၍မရပါ: ' : 'Failed to delete: ') + (err?.message || 'Error'));
    } finally {
      setIsDeletingTxId(null);
    }
  };

  // Purge all transactions in a specific category (e.g. 'ကား ပြင် ထိန်း စရိတ်')
  const handlePurgeCategoryTransactions = async (catKey: string, catLabel: string) => {
    // [v7.5.64 C-01] Purge only what the modal is currently showing: same
    // user / date / search predicates as the table filter (4704–4730).
    const matched = effectiveTransactions.filter((t) => {
      const rawCat = t.category || (t as any).categoryId || 'other';
      const catObj = allMergedCategories.find((c) => c.id === rawCat || c.name === rawCat || c.nameEn === rawCat);
      const matchedKey = catObj ? catObj.id : rawCat;
      if (!(matchedKey === catKey || rawCat === catKey || rawCat === catLabel)) return false;
      if (selectedFilterUser !== 'all') {
        const uId = (t as any)._userId || t.userId;
        if (uId !== selectedFilterUser) return false;
      }
      if (txDatePreset !== 'all') {
        const txDate = t.date || localDateStr(t.createdAt);
        if (txDateFrom && txDate < txDateFrom) return false;
        if (txDateTo && txDate > txDateTo) return false;
      }
      if (searchTxQuery.trim()) {
        const q = searchTxQuery.toLowerCase();
        const matchNote = (t.note || '').toLowerCase().includes(q);
        const matchAmount = (t.amount || 0).toString().includes(q);
        const matchCat = (t.category || '').toLowerCase().includes(q);
        const matchSub = ((t as any).subCategory || '').toLowerCase().includes(q);
        if (!matchNote && !matchAmount && !matchCat && !matchSub) return false;
      }
      return true;
    });

    if (matched.length === 0) {
      alert(lang === 'my' ? 'ဤကဏ္ဍတွင် ဖျက်ရန် စာရင်းမှတ်တမ်း မရှိပါ။' : 'No records found in this category.');
      return;
    }

    // Scope text for the confirm, so the count shown is the filtered count.
    const scopeUser = selectedFilterUser !== 'all' ? usersList.find((u) => u.id === selectedFilterUser) : undefined;
    const scopeUserPartMy = scopeUser ? ` အသုံးပြုသူ ${scopeUser.email || selectedFilterUser} ၏` : '';
    const scopeUserPartEn = scopeUser ? ` for user ${scopeUser.email || selectedFilterUser}` : '';
    const scopeRange = txDatePreset !== 'all' && (txDateFrom || txDateTo)
      ? (txDateFrom && txDateTo ? (txDateFrom === txDateTo ? txDateFrom : `${txDateFrom} → ${txDateTo}`) : (txDateFrom || txDateTo))
      : '';
    const scopeDatePartMy = scopeRange ? ` ရက်စွဲ ${scopeRange} အတွင်း` : '';
    const scopeDatePartEn = scopeRange ? ` dated ${scopeRange}` : '';
    const scopeSearchPartMy = searchTxQuery.trim() ? ` “${searchTxQuery.trim()}” နှင့် ကိုက်ညီသော` : '';
    const scopeSearchPartEn = searchTxQuery.trim() ? ` matching "${searchTxQuery.trim()}"` : '';
    if (!window.confirm(lang === 'my' ? `"${catLabel}" ကဏ္ဍရှိ${scopeUserPartMy}${scopeDatePartMy}${scopeSearchPartMy} စာရင်းမှတ်တမ်းပေါင်း ${matched.length} ခုလုံးကို Database မှ အပြီးတိုင် ရှင်းလင်းဖျက်ပစ်ရန် သေချာပါသလား?` : `Purge all ${matched.length} records in "${catLabel}"${scopeUserPartEn}${scopeDatePartEn}${scopeSearchPartEn}?`)) {
      return;
    }

    try {
      setIsPurgingBatch(true);
      const deletePromises = matched.map((tx) => {
        const docPath = (tx as any)._docPath || ((tx as any)._userId ? `users/${(tx as any)._userId}/transactions/${tx.id}` : tx.userId ? `users/${tx.userId}/transactions/${tx.id}` : null);
        if (docPath) {
          return safeDeleteDoc(doc(db, docPath));
        }
        return Promise.resolve(false);
      });
      const results = await Promise.all(deletePromises);
      const deletedCount = results.filter(Boolean).length;
      // [v7.5.64 C-04] Prune local state ONLY for the ids actually deleted.
      const deletedIds = new Set(matched.filter((_t, i) => results[i]).map((t) => t.id));
      setSystemTransactions((prev) => prev.filter((t) => !deletedIds.has(t.id)));
      if (deletedCount === matched.length) {
        setActionSuccessToast(lang === 'my' ? `"${catLabel}" ရှိ စာရင်း ${matched.length} ခုကို အောင်မြင်စွာ ရှင်းလင်းပြီးပါပြီ။` : `Purged ${matched.length} records in "${catLabel}".`);
      } else {
        alert(lang === 'my' ? `⚠️ "${catLabel}" ရှိ စာရင်း ${deletedCount}/${matched.length} ခုသာ ဖျက်နိုင်ခဲ့ပါသည် — အချို့ ဖျက်၍ မရပါ` : `⚠️ Only ${deletedCount}/${matched.length} records in "${catLabel}" could be deleted.`);
      }
      // [v7.5.64 B-12] Audit trail.
      void logAdminAction(user, 'purge_category', { detail: `${catLabel}: ${deletedCount}/${matched.length}`, result: deletedCount === matched.length ? 'success' : 'failed' });
      setTimeout(() => setActionSuccessToast(''), 4000);
    } catch (err: any) {
      console.error('Batch purge category error:', err);
      alert((lang === 'my' ? 'ရှင်းလင်း၍ မရပါ: ' : 'Failed to purge: ') + (err?.message || 'Error'));
    } finally {
      setIsPurgingBatch(false);
    }
  };

  // Purge all transactions for a specific user
  const handlePurgeUserTransactions = async (userId: string, userEmail: string) => {
    try {
      setIsPurgingBatch(true);
      setBusyUserId(userId);
      // [v7.5.64 B-10/C-05] Fetch the fresh count FIRST and confirm on it —
      // the local snapshot count could disagree with what is actually deleted.
      const userTxSnap = await getDocs(collection(db, 'users', userId, 'transactions'));
      if (userTxSnap.docs.length === 0) {
        alert(lang === 'my' ? 'ဤအသုံးပြုသူ၏ ဖျက်ရန် စာရင်းမှတ်တမ်း မရှိပါ။' : 'No records found for this user.');
        return;
      }
      if (!window.confirm(lang === 'my' ? `အကောင့် (${userEmail || userId}) ၏ စာရင်းမှတ်တမ်းပေါင်း ${userTxSnap.docs.length} ခုလုံးကို Database မှ အပြီးတိုင် ဖျက်ပစ်ရန် သေချာပါသလား?` : `Purge all ${userTxSnap.docs.length} records for ${userEmail || userId}?`)) {
        return;
      }

      const delPromises = userTxSnap.docs.map((d) => safeDeleteDoc(d.ref));
      const results = await Promise.all(delPromises);
      const deletedCount = results.filter(Boolean).length;

      // [v7.5.64 C-04] Prune local state ONLY for the ids actually deleted.
      const deletedIds = new Set(userTxSnap.docs.filter((_d, i) => results[i]).map((d) => d.id));
      setSystemTransactions((prev) => prev.filter((t) => !deletedIds.has(t.id)));
      if (deletedCount === userTxSnap.docs.length) {
        setActionSuccessToast(lang === 'my' ? `User ၏ စာရင်းများကို အောင်မြင်စွာ ရှင်းလင်းပြီးပါပြီ။` : `User records cleared successfully.`);
      } else {
        alert(lang === 'my' ? `⚠️ User ၏ စာရင်း ${deletedCount}/${userTxSnap.docs.length} ခုသာ ဖျက်နိုင်ခဲ့ပါသည်` : `⚠️ Only ${deletedCount}/${userTxSnap.docs.length} user records could be deleted.`);
      }
      // [v7.5.64 B-12] Audit trail.
      void logAdminAction(user, 'purge_user', { targetUid: userId, targetEmail: userEmail, detail: `${deletedCount}/${userTxSnap.docs.length} records`, result: deletedCount === userTxSnap.docs.length ? 'success' : 'failed' });
      setTimeout(() => setActionSuccessToast(''), 3000);
    } catch (err: any) {
      console.error('Purge user records error:', err);
      alert((lang === 'my' ? 'ရှင်းလင်း၍ မရပါ: ' : 'Failed to clear: ') + (err?.message || 'Error'));
    } finally {
      setIsPurgingBatch(false);
      setBusyUserId(null);
    }
  };

  // Delete an entire test user document and ALL its subcollections
  // [v7.5.60 M-19] The old version deleted only transactions, wallets and
  // categories — debts, vehicles, fuel/maintenance/tire logs, budgets and
  // shops were silently left behind, and the Firebase Auth login account
  // can never be deleted from client code. Delete every known
  // users/{uid}/... subcollection and say the login-account limit honestly.
  const handleDeleteUserAccount = async (userId: string, userEmail: string) => {
    // [v7.5.64 B-06] Never delete your own account or the master admin's account.
    if (userId === user?.uid) {
      alert(lang === 'my' ? 'ကိုယ့်အကောင့်ကို ကိုယ်တိုင် ဖျက်၍ မရပါ။' : 'You cannot delete your own account.');
      return;
    }
    if ((userEmail || '').toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) {
      alert(lang === 'my' ? 'Master Admin အကောင့်ကို ဖျက်၍ မရပါ။' : 'The master admin account cannot be deleted.');
      return;
    }
    // [v7.5.64 B-03] Block like self-delete when the user owns shared
    // wallets (same check as AuthContext deleteAccount) — the owned
    // sharedWallets docs themselves are NEVER deleted here; that would
    // destroy collaborators' data. Fail-closed on read failure.
    let ownedSharedWallets: string[] = [];
    try {
      const walletsSnap = await getDocs(collection(db, 'users', userId, 'wallets'));
      walletsSnap.docs.forEach((d) => {
        const w = d.data() as Wallet;
        if (Array.isArray(w.sharedWith) && w.sharedWith.length > 0) {
          ownedSharedWallets.push(w.name || d.id);
        }
      });
    } catch {
      alert(lang === 'my' ? 'အသုံးပြုသူ၏ ပိုက်ဆံအိတ် စာရင်းကို ဖတ်၍ မရပါ — Shared ပိုက်ဆံအိတ် ပိုင်ဆိုင်ထားခြင်း ရှိ/မရှိ မသိရသဖြင့် အကောင့်ကို မဖျက်ပါ။' : 'Could not read this user\'s wallets — account NOT deleted because shared-wallet ownership could not be checked.');
      return;
    }
    if (ownedSharedWallets.length > 0) {
      alert(lang === 'my' ? `ဤအသုံးပြုသူက Shared ပိုက်ဆံအိတ် (${ownedSharedWallets.join(', ')}) ကို ပိုင်ဆိုင်ထားပါသည် — Shared ပိုက်ဆံအိတ်များကို အရင် ဖျက်သိမ်းပြီးမှ အကောင့်ကို ဖျက်ပါ။` : `This user owns shared wallet(s): ${ownedSharedWallets.join(', ')} — remove the shared wallets first, then delete the account.`);
      return;
    }
    if (!window.confirm(lang === 'my' ? `⚠️ သတိပေးချက်: အကောင့် (${userEmail || userId}) နှင့် ၎င်း၏ ငွေစာရင်း၊ ပိုက်ဆံအိတ်၊ အကြွေး၊ ယာဉ်၊ ဆီစာရင်း/ပြုပြင်မှတ်တမ်း၊ ဘတ်ဂျက်၊ ကဏ္ဍ၊ ဆိုင်မှတ်တမ်းများ အားလုံးကို Database မှ လုံးဝ ဖျက်ပစ်ရန် သေချာပါသလား? (မှတ်ချက်: login အကောင့်ကို ဤနေရာမှ ဖျက်၍ မရပါ — အဲဒီအသုံးပြုသူ Google ဖြင့် ပြန်ဝင်လာနိုင်ပါသည်။ Shared ပိုက်ဆံအိတ်များ (ပိုင်ဆိုင်ထားသော) ကို ဤနေရာမှ မဖျက်ပါ — သီးခြား ဖျက်ပေးရန် လိုအပ်ပါသည်။)` : `Delete user account (${userEmail || userId}) and ALL its data (transactions, wallets, debts, vehicles, fuel/maintenance/tire logs, budgets, categories, shops) permanently? Note: the login account itself cannot be deleted from here — the user could sign back in with Google. Shared wallets owned by this user are NOT deleted — remove them separately.`)) {
      return;
    }

    // Every subcollection that lives under users/{uid} (see syncQueue.ts
    // SyncEntityType + all collection(db, 'users', uid, ...) call sites).
    const SUBCOLLECTIONS = [
      'transactions',
      'wallets',
      'categories',
      'debts',
      'vehicles',
      'fuelLogs',
      'vehicleMaintenance',
      'tirePressureLogs',
      'budgets',
      'shops',
    ] as const;

    try {
      setIsPurgingBatch(true);
      setBusyUserId(userId);
      let allOk = true;
      // [v7.5.64 B-01] Collect which subcollections failed, so the user doc
      // is deleted ONLY when every subcollection was fully deleted.
      const failedSubs: string[] = [];
      for (const sub of SUBCOLLECTIONS) {
        const snap = await getDocs(collection(db, 'users', userId, sub));
        const results = await Promise.all(snap.docs.map((d) => safeDeleteDoc(d.ref)));
        if (results.some((r) => !r)) { allOk = false; failedSubs.push(sub); }
      }

      if (!allOk || failedSubs.length > 0) {
        alert(lang === 'my' ? `⚠️ အကောင့်ကို မဖျက်ခဲ့ပါ — အောက်ပါ ဒေတာများ ဖျက်၍ မရပါ: ${failedSubs.join(', ')} — အကောင့်ကို ဖျက်မထားပါ၊ ပြန်ကြိုးစားပါ` : `⚠️ User NOT deleted — could not delete: ${failedSubs.join(', ')} — please retry`);
        return;
      }

      // 4. Delete user document — only reached when all subcollections are gone.
      const userDocOk = await safeDeleteDoc(doc(db, 'users', userId));
      if (!userDocOk) {
        alert(lang === 'my' ? '⚠️ အကောင့်ကို ဖျက်၍ မရပါ — အင်တာနက်/ခွင့်ပြုချက်ကို စစ်ဆေးပါ' : '⚠️ Could not delete the user account — check connection / permissions.');
        return;
      }

      // [v7.5.64 B-02] Clear the deleted user's activation code(s), so a later
      // Revoke cannot recreate the user doc (zombie account). Best-effort:
      // a failed code update is reported in the final alert, not fatal.
      // NOTE: updateDoc directly, NOT safeUpdateDoc — safeUpdateDoc runs
      // cleanForFirestore(), which would mangle the deleteField() sentinel
      // into a plain object (same reason as AuthContext.tsx arrayRemove).
      const userCodes = codes.filter((c) => c.usedBy === userId);
      const failedCodes: string[] = [];
      for (const c of userCodes) {
        try {
          await updateDoc(doc(db, 'activationCodes', c.code), {
            isUsed: false,
            usedBy: deleteField(),
            usedEmail: deleteField(),
            usedAt: deleteField(),
          });
        } catch {
          failedCodes.push(c.code);
        }
      }

      // [v7.5.64 B-03] Always clean up the deleted user's discovery refs
      // (sharedWalletRefs/{email}/wallets/*) and their admins/{uid} doc,
      // same as the AuthContext self-delete flow. Best-effort: failures
      // are reported in the final alert, not fatal. NOTE: refs cleanup
      // needs the widened sharedWalletRefs rules (isAdmin on get/list +
      // delete) published in the Firebase Console first — before that,
      // fetchMyRefs returns [] on permission-denied and refs survive.
      // The admins/{uid} delete stays master-only by design (rules), so
      // it works for the master admin and fails safe for other admins.
      const failedRefs: string[] = [];
      let adminDocFailed = false;
      try {
        if (userEmail && userEmail.includes('@')) {
          const refs = await fetchMyRefs(userEmail);
          for (const r of refs) {
            const ok = await deleteSharedWalletRef(userEmail, r.docId);
            if (!ok) failedRefs.push(r.docId);
          }
        }
      } catch {
        failedRefs.push('(read failed)');
      }
      try {
        const adminDocOk = await safeDeleteDoc(doc(db, 'admins', userId));
        if (!adminDocOk) adminDocFailed = true;
      } catch {
        adminDocFailed = true;
      }

      // [v7.5.64 B-12] Audit trail — the account is gone at this point
      // (subcollections + user doc deleted); the log records the action
      // and any partial cleanup for the admin to follow up on.
      const cleanupLeftovers = [...failedCodes, ...failedRefs, ...(adminDocFailed ? ['admin-doc'] : [])];
      void logAdminAction(user, 'delete_account', {
        targetUid: userId,
        targetEmail: userEmail,
        detail: cleanupLeftovers.length > 0 ? `cleanup pending: ${cleanupLeftovers.join(', ')}` : undefined,
      });

      // [v7.5.64 C-04] Only reached on full success, so pruning the whole
      // user row + all their transactions from local state is truthful.
      setUsersList((prev) => prev.filter((u) => u.id !== userId));
      setSystemTransactions((prev) => prev.filter((t) => ((t as any)._userId || t.userId) !== userId));
      if (failedCodes.length > 0 || failedRefs.length > 0 || adminDocFailed) {
        const warnParts: string[] = [];
        if (failedCodes.length > 0) warnParts.push(lang === 'my' ? `ကုဒ် ${failedCodes.join(', ')} ကို ပြန်လည်သတ်မှတ်၍ မရပါ` : `could not clear code(s): ${failedCodes.join(', ')}`);
        if (failedRefs.length > 0) warnParts.push(lang === 'my' ? `Shared ပိုက်ဆံအိတ် လင့်ခ် ${failedRefs.join(', ')} ကို ဖျက်၍ မရပါ` : `could not delete shared-wallet ref(s): ${failedRefs.join(', ')}`);
        if (adminDocFailed) warnParts.push(lang === 'my' ? 'Admin မှတ်တမ်းကို ဖျက်၍ မရပါ' : 'could not delete the admin record');
        alert(lang === 'my' ? `အကောင့် (${userEmail || userId}) ကို ဖျက်ပြီးပါပြီ ✓ သို့သော် ${warnParts.join('; ')} — ကုဒ်စာရင်းကို စစ်ဆေးပါ` : `User (${userEmail || userId}) deleted ✓ but ${warnParts.join('; ')} — please check.`);
      } else {
        setActionSuccessToast(lang === 'my' ? `အကောင့် (${userEmail || userId}) ကို Database မှ အပြီးတိုင် ဖျက်ပစ်ပြီးပါပြီ။` : `User deleted permanently.`);
      }
      setTimeout(() => setActionSuccessToast(''), 4000);
    } catch (err: any) {
      console.error('Delete user error:', err);
      alert((lang === 'my' ? 'အကောင့်ဖျက်၍ မရပါ: ' : 'Failed to delete user: ') + (err?.message || 'Error'));
    } finally {
      setIsPurgingBatch(false);
      setBusyUserId(null);
    }
  };

  if (!isOpen || !isAdmin) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn overflow-hidden">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-5xl w-full p-3 sm:p-6 shadow-2xl border border-slate-200 relative max-h-[96vh] sm:max-h-[94vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 pb-2 sm:pb-4 border-b border-slate-100 shrink-0">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base sm:text-xl font-black text-slate-800 tracking-tight">
                Admin Control Center
              </h2>
              {user?.email === MASTER_ADMIN_EMAIL && (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 inline-flex items-center gap-1 shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Super Admin
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {lang === 'my'
                ? 'အသုံးပြုသူများနှင့် ပရီမီယမ် ကုဒ်များ စီမံခန့်ခွဲခြင်း နှင့် စာတန်းပြေး ကြေညာချက်များ ထုတ်လွှင့်ခြင်း'
                : 'Unified users and premium codes tracking with system broadcast control'}
            </p>
          </div>

          <button
            onClick={() => {
              // [v7.5.55 E16] Dirty-check: closing with unsaved contact edits asks first.
              if (activeTab === 'contact_info' && isContactDirty && !window.confirm(lang === 'my' ? 'ဆက်သွယ်ရန် အချက်အလက် အပြောင်းအလဲများ မသိမ်းရသေးပါ — ပိတ်မည်လား။' : 'Contact changes are not saved yet — close anyway?')) return;
              onClose();
            }}
            className="p-3 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors self-end sm:self-auto cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Unified 6 Tabs Navigation */}
        {/* [v7.5.60 N-48] On phones the old horizontal scroll strip showed
            only ~2 tabs at 11px. Now a 2-column grid on phones (3 on sm,
            6 on lg) so every tab is visible without scrolling. */}
        <div className="relative">
        <div ref={tabStripRef} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 sm:pt-3 pb-2 shrink-0 border-b border-slate-100 -mx-1 px-1">
          <button
            type="button"
            data-tab="overview"
            onClick={() => setActiveTab('overview')}
            className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer text-center whitespace-nowrap shrink-0 ${
              activeTab === 'overview'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <TrendingUp className="w-4 h-4 shrink-0" />
            <span className="truncate">
              {lang === 'my' ? '📈 စနစ် အကြမ်းဖျင်း' : 'Overview'}
            </span>
          </button>

          <button
            type="button"
            data-tab="quota"
            onClick={() => setActiveTab('quota')}
            className={`flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer text-center whitespace-nowrap shrink-0 relative ${
              activeTab === 'quota'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Flame className="w-4 h-4 shrink-0 text-amber-500" />
            <span className="truncate">
              {lang === 'my' ? '🔥 Quota & စွမ်းရည်' : 'Quota (50k/20k)'}
            </span>
          </button>

          <button
            type="button"
            data-tab="users_codes"
            onClick={() => setActiveTab('users_codes')}
            className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer text-center whitespace-nowrap shrink-0 ${
              activeTab === 'users_codes'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Key className="w-4 h-4 shrink-0" />
            <span className="truncate">
              {lang === 'my'
                ? '🔑 အသုံးပြုသူ & ကုဒ်များ'
                : 'Users & Codes'}
            </span>
          </button>

          <button
            type="button"
            data-tab="broadcast"
            onClick={() => setActiveTab('broadcast')}
            className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer text-center whitespace-nowrap shrink-0 ${
              activeTab === 'broadcast'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Megaphone className="w-4 h-4 shrink-0" />
            <span className="truncate">
              {lang === 'my'
                ? '📢 ကြေညာချက်'
                : 'Broadcast'}
            </span>
          </button>

          <button
            type="button"
            data-tab="contact_info"
            onClick={() => setActiveTab('contact_info')}
            className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer text-center whitespace-nowrap shrink-0 ${
              activeTab === 'contact_info'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Phone className="w-4 h-4 shrink-0" />
            <span className="truncate">
              {lang === 'my'
                ? '📞 ဆက်သွယ်ရန်'
                : 'Contact'}
            </span>
          </button>

          <button
            type="button"
            data-tab="analytics"
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer text-center whitespace-nowrap shrink-0 ${
              activeTab === 'analytics'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Globe className="w-4 h-4 shrink-0" />
            <span className="truncate">
              {lang === 'my'
                ? '📊 ဧည့်သည် Logs'
                : 'Visitor Logs'}
            </span>
          </button>
        </div>
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white via-white/70 to-transparent sm:hidden" aria-hidden="true" />
        </div>

        {/* Diagnostic/Bootstrap banner if codes or users is empty but we are on the users_codes tab */}
        {activeTab === 'users_codes' && !dataLoading && codes.length === 0 && usersList.length === 0 && (
          <div className="mx-1 mt-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-xs sm:text-sm text-amber-900">
                  {lang === 'my' ? '⚠️ Database တွင် အက်မင် ခွင့်ပြုချက် မရရှိသေးပါ' : '⚠️ Database Admin Permission Not Active'}
                </h4>
                <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                  {lang === 'my'
                    ? 'လူကြီးမင်း၏အကောင့်သည် ဒေတာဘေ့စ်ပေါ်တွင် တရားဝင်အက်မင်စာရင်း မပေါက်သေးသဖြင့် ဇယားများ မပေါ်ဘဲ ဖြစ်နေနိုင်ပါသည်။ အောက်ပါခလုတ်ကို နှိပ်၍ အသက်သွင်းပြီးပါက ဇယားများ ပွင့်လန်းလာမည် ဖြစ်ပါသည်။'
                    : 'Your account might not be registered in the admins collection on this database. Click the button to force bootstrap your admin status.'}
                </p>
              </div>
            </div>
            {/* ✅ FIX #2: Only master admin sees the activate button. Others get a warning. */}
            {user?.email === MASTER_ADMIN_EMAIL ? (
              <button
                type="button"
                onClick={async () => {
                  try {
                    const adminRef = doc(db, 'admins', user?.uid || '');
                    const ok = await safeSetDoc(adminRef, {
                      email: user?.email,
                      role: 'admin',
                      createdAt: new Date().toISOString(),
                    });
                    if (!ok) {
                      alert(lang === 'my' ? 'Admin အသက်သွင်း၍ မရပါ — Firestore ခွင့်ပြုချက်ကို စစ်ဆေးပါ' : 'Could not activate admin — check Firestore permissions.');
                      return;
                    }
                    alert(lang === 'my' ? '✓ အက်မင်အသက်သွင်းပြီးပါပြီ။ ဇယားများပေါ်ရန် ဒေတာ အသစ်ယူမည် ကို နှိပ်ပါ သို့မဟုတ် စာမျက်နှာကို reload လုပ်ပါ။' : '✓ Admin status bootstrapped! Reloading database...');
                    await fetchAllData();
                  } catch (e: any) {
                    alert(`Failed: ${e.message || String(e)}`);
                  }
                }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer shrink-0"
              >
                {lang === 'my' ? '🔄 အက်မင် တရားဝင် အသက်သွင်းမည်' : '🔄 Force Activate Admin'}
              </button>
            ) : (
              <div className="text-[11px] text-amber-800 font-semibold px-3 py-1.5 bg-amber-100 rounded-xl shrink-0 border border-amber-300">
                {lang === 'my'
                  ? '⚠️ Admin ခွင့်ပြုချက်အတွက် Master Admin ကို ဆက်သွယ်ပါ'
                  : '⚠️ Contact Master Admin for access'}
              </div>
            )}
          </div>
        )}

        {/* TAB 0: SYSTEM & FINANCIAL OVERVIEW (PRIVACY-PRESERVED AGGREGATES) */}
        {activeTab === 'overview' && (
          <div className="flex-1 overflow-y-auto overflow-x-hidden pt-3 space-y-4 pr-1">
            {overviewError && (
              <div className="bg-rose-50 border border-rose-300 rounded-2xl p-3.5 text-xs font-bold text-rose-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{overviewError}</span>
              </div>
            )}
            {/* [v7.5.64 A-06] Partial system-data failure: name the failed collection instead of showing a silent empty state. */}
            {systemPartialError && !overviewError && (
              <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3.5 text-xs font-bold text-amber-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{lang === 'my' ? `စနစ်ဒေတာ အချို့ ဆွဲယူ၍ မရပါ (${systemPartialError}) — ပြထားသော ကိန်းဂဏန်းများ မပြည့်စုံနိုင်ပါ` : `Could not load some system data (${systemPartialError}) — numbers shown may be incomplete.`}</span>
              </div>
            )}
            {/* Privacy Architecture Highlight Card */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-md border border-indigo-900/50 flex flex-col sm:flex-row sm:items-start sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-sm text-white">
                      {lang === 'my' ? '🛡️ Privacy-First Zero-Trust Architecture' : '🛡️ Zero-Trust Privacy Protected'}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold font-mono shrink-0">
                      ACTIVE & ENFORCED
                    </span>
                  </div>
                  <p className="text-xs text-indigo-200/90 mt-0.5 leading-relaxed">
                    {lang === 'my'
                      ? 'အသုံးပြုသူတစ်ဦးချင်းစီ၏ ကိုယ်ပိုင်ငွေစာရင်း၊ ပိုက်ဆံအိတ်နှင့် ကြွေးမြီများကို အကောင့်ပိုင်ရှင်ကိုယ်တိုင်သာ မြင်နိုင်အောင် သီးသန့် ကာကွယ်ထားပြီး၊ ဤစာမျက်နှာတွင် စနစ်တစ်ခုလုံး၏ အကြမ်းဖျင်း ခြုံငုံသုံးသပ်ချက်များကိုသာ ဖော်ပြထားပါသည်။'
                      : 'Personal ledgers, wallets, and debts are isolated per user under strict ABAC rules. This dashboard aggregates high-level platform health metrics.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={fetchAllData}
                disabled={dataLoading || systemDataLoading}
                className="self-end sm:self-auto px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-xl transition-colors flex items-center gap-1.5 text-xs disabled:opacity-50 cursor-pointer shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${dataLoading ? 'animate-spin' : ''}`} />
                {lang === 'my' ? 'ဒေတာ အသစ်ယူမည်' : 'Refresh'}
              </button>
            </div>

            {/* Core KPI Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Total Registered Accounts */}
              <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[11px] font-bold uppercase tracking-wider">
                    {lang === 'my' ? 'အသုံးပြုသူ စုစုပေါင်း' : 'Total Registered'}
                  </span>
                  <Users className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-2xl font-black text-slate-900 font-mono">
                  {dataLoading ? '—' : usersList.length}
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  {lang === 'my'
                    ? `Free: ${Math.max(0, usersList.length - premiumUsersCount)} | VIP: ${premiumUsersCount}`
                    : `Free: ${Math.max(0, usersList.length - premiumUsersCount)} | VIP: ${premiumUsersCount}`}
                </div>
              </div>

              {/* Premium Adoption Rate */}
              <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-amber-800">
                  <span className="text-[11px] font-bold uppercase tracking-wider">
                    {lang === 'my' ? 'Premium အချိုးအစား' : 'Premium Share'}
                  </span>
                  <Crown className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-2xl font-black text-amber-900 font-mono">
                  {dataLoading ? '—' : usersList.length > 0
                    ? `${Math.round((premiumUsersCount / usersList.length) * 100)}%`
                    : '0%'}
                </div>
                <div className="text-[11px] text-amber-700 font-medium">
                  {premiumUsersCount} {lang === 'my' ? 'ဦး Premium သုံးနေ' : 'active premium users'}
                </div>
              </div>

              {/* Activation Codes Status */}
              <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[11px] font-bold uppercase tracking-wider">
                    {lang === 'my' ? 'လိုင်စင် ကုဒ်များ' : 'Activation Codes'}
                  </span>
                  <Key className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-black text-slate-900 font-mono">
                  {dataLoading ? '—' : totalCodesCount}
                </div>
                <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                  <span>Used: {dataLoading ? '—' : usedCodesCount}</span>
                  <span className="text-slate-300">•</span>
                  <span>Avail: {dataLoading ? '—' : availableCodesCount}</span>
                </div>
              </div>

              {/* [v7.5.64 A-03 / v7.5.65] Unique visitors, not sessions.
                  The value is the true total via an aggregate count query
                  (falls back to the deduped latest-500 count while loading). */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[11px] font-bold uppercase tracking-wider">
                    {lang === 'my' ? 'ဝင်ရောက်သူ စုစုပေါင်း' : 'Unique Visitors'}
                  </span>
                  <Activity className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-2xl font-black text-slate-900 font-mono">
                  {analyticsError ? '—' : (visitorsTotalCount ?? analyticsStats.total)}
                </div>
                <div className="text-[11px] text-purple-700 font-medium">
                  {analyticsError
                    ? (lang === 'my' ? 'ဒေတာ ဆွဲယူ၍ မရပါ' : 'Could not load')
                    : `${analyticsStats.countriesSorted.length} ${lang === 'my' ? 'နိုင်ငံမှ ဝင်ရောက်' : 'countries recorded'}`}
                </div>
                {/* [v7.5.65] The total above is the TRUE count — only the
                    table & breakdowns cover the latest 500 records. */}
                {visitorsList.length === 500 && (
                  <div className="text-[10px] text-slate-400 font-medium">
                    {lang === 'my' ? 'စုစုပေါင်း အမှန်ပါ — ဇယားနဲ့ ခွဲခြမ်းစိတ်ဖြာမှုက နောက်ဆုံး ၅၀၀ မှတ်တမ်းကိုသာ အခြေခံသည်' : 'True total — table & breakdowns cover the latest 500 records only'}
                  </div>
                )}
                {/* [v7.5.64 A-09] Visitor telemetry is unauthenticated — counts are indicative, not audited. */}
                <div className="text-[10px] text-slate-400 font-medium">
                  {lang === 'my' ? 'ဧည့်သည် စာရင်းက ခန့်မှန်းခြေ ဖြစ်ပါသည်' : 'Visitor numbers are indicative only'}
                </div>
              </div>
            </div>

            {/* [QUOTA-GUARD v6.1.2] Per-User Financial Summary */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
              <div className="flex flex-col gap-2 border-b border-slate-100 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                      {lang === 'my' ? '👥 အသုံးပြုသူအကောင့်များအလိုက် ဝင်ငွေ/ထွက်ငွေ အနှစ်ချုပ်' : 'Per-User Income / Expense Summary'}
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    {usersList.length} {lang === 'my' ? 'အကောင့်' : 'accounts'}
                  </span>
                </div>

                {/* [calc-fix] Date Range filter */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{lang === 'my' ? 'ရက်စွဲ:' : 'Date:'}</span>
                  </div>
                  <select
                    value={summaryDatePreset}
                    onChange={(e) => applySummaryDatePreset(e.target.value as any)}
                    className="text-base font-semibold px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="all">{lang === 'my' ? 'အားလုံး' : 'All Time'}</option>
                    <option value="today">{lang === 'my' ? 'ဒီနေ့' : 'Today'}</option>
                    <option value="7d">{lang === 'my' ? '၇ ရက်' : 'Last 7 days'}</option>
                    <option value="30d">{lang === 'my' ? '၃၀ ရက်' : 'Last 30 days'}</option>
                    <option value="this_month">{lang === 'my' ? 'ယခုလ' : 'This Month'}</option>
                    <option value="last_month">{lang === 'my' ? 'ပြီးခဲ့သည့်လ' : 'Last Month'}</option>
                    <option value="custom">{lang === 'my' ? 'စိတ်ကြိုက်' : 'Custom'}</option>
                  </select>
                  {summaryDatePreset === 'custom' && (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="date"
                        value={summaryFrom}
                        onChange={(e) => setSummaryFrom(e.target.value)}
                        className="text-base font-mono px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <span className="text-slate-400 text-[11px]">→</span>
                      <input
                        type="date"
                        value={summaryTo}
                        onChange={(e) => setSummaryTo(e.target.value)}
                        className="text-base font-mono px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  )}
                  {summaryDatePreset !== 'all' && summaryFrom && summaryTo && (
                    <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
                      {summaryFrom === summaryTo ? summaryFrom : `${summaryFrom} → ${summaryTo}`}
                    </span>
                  )}
                </div>

                {/* [v7.5.64 A-11] Search the per-user summary by email / name / UID. */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={summarySearch}
                    onChange={(e) => setSummarySearch(e.target.value)}
                    placeholder={
                      lang === 'my'
                        ? 'အသုံးပြုသူ ရှာပါ (Email / အမည် / UID)...'
                        : 'Search user by email / name / UID...'
                    }
                    className="w-full pl-9 pr-3 py-1.5 text-base rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>
              </div>

              {/* [v7.5.64] Desktop table — hidden on phones, replaced by the overview cards below. */}
              <div className="overflow-x-auto hidden sm:block">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-extrabold text-[10px]">
                      <th className="py-2 px-3">User</th>
                      <th className="py-2 px-3 text-right">Income (သိန်း)</th>
                      <th className="py-2 px-3 text-right">Expense (သိန်း)</th>
                      <th className="py-2 px-3 text-right">Net (သိန်း)</th>
                      <th className="py-2 px-3 text-center">Records</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {usersList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">
                          {lang === 'my' ? 'အသုံးပြုစူ မရှိးသေးပါ' : 'No users yet'}
                        </td>
                      </tr>
                    ) : filteredSummaryUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">
                          {lang === 'my' ? 'ရှာဖွေမှုနှင့် ကိုက်ညီသော အသုံးပြုသူ မရှိပါ' : 'No users match the search'}
                        </td>
                      </tr>
                    ) : (
                      filteredSummaryUsers.map((u) => {
                        // [v7.5.64 A-11] Totals come from the perUserSummary memo.
                        const s = perUserSummary.get(u.id) || { income: 0, expense: 0, net: 0, count: 0 };
                        const income = s.income;
                        const expense = s.expense;
                        const net = s.net;
                        return (
                          <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-1.5 px-2 sm:py-2.5 sm:px-3">
                              <div className="font-bold text-slate-800 truncate max-w-[200px]">
                                {u.displayName || (u.email ? u.email.split('@')[0] : 'User')}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]">
                                {u.email || u.id}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-bold whitespace-nowrap" title={formatMMK(income)}>
                              +{formatLakhs(income, lang)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-rose-700 font-bold whitespace-nowrap" title={formatMMK(expense)}>
                              -{formatLakhs(expense, lang)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap text-slate-800" title={formatMMK(net)}>
                              {formatLakhs(net, lang)}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                              {s.count}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {/* [v7.5.64] Mobile overview cards — same per-user totals as the table above. */}
              <div className="sm:hidden space-y-2 pt-2">
                {usersList.length === 0 ? (
                  <p className="py-6 text-center text-slate-400 text-xs">
                    {lang === 'my' ? 'အသုံးပြုစူ မရှိးသေးပါ' : 'No users yet'}
                  </p>
                ) : filteredSummaryUsers.length === 0 ? (
                  <p className="py-6 text-center text-slate-400 text-xs">
                    {lang === 'my' ? 'ရှာဖွေမှုနှင့် ကိုက်ညီသော အသုံးပြုသူ မရှိပါ' : 'No users match the search'}
                  </p>
                ) : (
                  filteredSummaryUsers.map((u) => {
                    // [v7.5.64 A-11] Totals come from the perUserSummary memo.
                    const s = perUserSummary.get(u.id) || { income: 0, expense: 0, net: 0, count: 0 };
                    const income = s.income;
                    const expense = s.expense;
                    const net = s.net;
                    return (
                      <div key={u.id} className="border border-slate-200 rounded-2xl bg-white p-3 space-y-1.5 shadow-xs text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-bold text-slate-800 break-words">
                              {u.displayName || (u.email ? u.email.split('@')[0] : 'User')}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono break-all">
                              {u.email || u.id}
                            </div>
                          </div>
                          <span className="font-mono text-slate-600 whitespace-nowrap shrink-0">
                            {s.count} {lang === 'my' ? 'မှတ်တမ်း' : 'records'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap font-mono font-bold">
                          <span className="text-emerald-700 whitespace-nowrap" title={formatMMK(income)}>
                            <span className="text-slate-400 font-sans font-normal text-[10px]">{lang === 'my' ? 'ဝင် ' : 'In '}</span>+{formatLakhs(income, lang)}
                          </span>
                          <span className="text-rose-700 whitespace-nowrap" title={formatMMK(expense)}>
                            <span className="text-slate-400 font-sans font-normal text-[10px]">{lang === 'my' ? 'ထွက် ' : 'Out '}</span>-{formatLakhs(expense, lang)}
                          </span>
                          <span className="text-slate-800 whitespace-nowrap" title={formatMMK(net)}>
                            <span className="text-slate-400 font-sans font-normal text-[10px]">{lang === 'my' ? 'အသား ' : 'Net '}</span>{formatLakhs(net, lang)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Financial Ecosystem Benchmark & Category Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Category & Sub-Category Spending Benchmark Box */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-2 gap-2">
                  <div className="flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-indigo-600" />
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                      {overviewBenchmarkMode === 'category'
                        ? lang === 'my'
                          ? '📊 ပင်မကဏ္ဍ အသုံးစရိတ် ခွဲဝေမှု (စနစ်တစ်ခုလုံး - All Users)'
                          : 'Spending Category Distribution (All Users System-Wide)'
                        : lang === 'my'
                        ? '🏷️ ကဏ္ဍခွဲ အသေးစိတ် သုံးစွဲမှု အချိုး (စနစ်တစ်ခုလုံး - All Users)'
                        : 'Sub-Category Breakdown (All Users System-Wide)'}
                    </h4>
                  </div>

                  {/* Mode Switcher Buttons */}
                  <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200/80 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setOverviewBenchmarkMode('category')}
                      className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                        overviewBenchmarkMode === 'category'
                          ? 'bg-white text-indigo-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {lang === 'my' ? '📁 ပင်မကဏ္ဍ' : 'Category'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOverviewBenchmarkMode('subcategory')}
                      className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                        overviewBenchmarkMode === 'subcategory'
                          ? 'bg-white text-indigo-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {lang === 'my' ? '🏷️ ကဏ္ဍခွဲ Analysis' : 'Sub-Category'}
                    </button>
                  </div>
                </div>

                {overviewBenchmarkMode === 'category' ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[11px] text-slate-500">
                        {lang === 'my'
                          ? `စနစ်တစ်ခုလုံးရှိ သုံးစွဲသူ အားလုံး (${usersList.length} Accounts) ၏ မှတ်တမ်းပေါင်း ${effectiveTransactions.length} ခုမှ ပင်မ ကဏ္ဍအလိုက် အသုံးစရိတ် ပမာဏနှင့် ခွဲဝေမှုနှုန်း (Live System Data) -`
                          : `Live aggregated distribution across all ${usersList.length} accounts (${effectiveTransactions.length} total records) -`}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFilterCategory('all');
                            setSelectedFilterUser('all');
                            setShowTxManagerModal(true);
                          }}
                          className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Sliders className="w-3 h-3" />
                          <span>{lang === 'my' ? '🧹 စာရင်းများ စစ်ဆေး/ရှင်းလင်းမည်' : 'Manage Records'}</span>
                        </button>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${listenerError ? 'bg-rose-50 border-rose-300 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${listenerError ? 'bg-rose-500' : 'bg-emerald-500'} ${systemDataLoading ? 'animate-ping' : 'animate-pulse'}`} />
                          {listenerError
                            ? (lang === 'my' ? `⚠️ Live Sync ပြတ်တောက်နေ (${listenerError})` : `⚠️ Live sync error (${listenerError})`)
                            : systemDataLoading
                            ? (lang === 'my' ? 'စုစည်းနေဆဲ...' : 'Syncing...')
                            : (lang === 'my' ? 'All Live Sync' : 'All Users Live Sync')}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2.5 pt-1">
                      {liveCategoryBenchmarks.length === 0 && !systemDataLoading && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center text-xs text-slate-500 font-medium">
                          {lang === 'my' ? 'အသုံးစရိတ် မှတ်တမ်း မရှိသေးပါ — ဒေတာ ရှိလာပါက ဤနေရာတွင် ပေါ်လာပါမည်' : 'No expense data yet — categories will appear here once records exist.'}
                        </div>
                      )}
                      {liveCategoryBenchmarks.map((cat) => (
                        <div key={cat.id} className="space-y-1 group">
                          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedFilterCategory(cat.id);
                                setSelectedFilterUser('all');
                                setShowTxManagerModal(true);
                              }}
                              className="hover:text-indigo-600 hover:underline cursor-pointer truncate max-w-[220px] text-left inline-flex items-center gap-1"
                              title={lang === 'my' ? 'ဤကဏ္ဍရှိ စာရင်းများကို စစ်ဆေး/ဖျက်မည်' : 'Inspect/Delete records in this category'}
                            >
                              <span>{cat.label}</span>
                              <Sliders className="w-3 h-3 opacity-0 group-hover:opacity-100 text-indigo-500 transition-opacity" />
                            </button>
                            <div className="flex items-center gap-2 shrink-0">
                              {cat.amount > 0 && (
                                <span className="text-[11px] font-mono text-slate-500" title={formatMMK(cat.amount)}>
                                  {formatLakhs(cat.amount, lang)}
                                </span>
                              )}
                              <span className="font-mono text-slate-800 font-bold">{cat.pct}%</span>
                            </div>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                            <div
                              className={`h-full bg-gradient-to-r ${cat.color} rounded-full transition-all duration-700`}
                              style={{ width: `${Math.max(cat.pct > 0 ? cat.pct : 0, 0)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  /* Sub-Category Analysis Section */
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[11px] text-slate-500">
                        {lang === 'my'
                          ? `စနစ်တစ်ခုလုံးရှိ သုံးစွဲသူ အားလုံး၏ ကဏ္ဍခွဲများအလိုက် အမှန်တကယ် သုံးစွဲမှုနှုန်း (All Users Live Data) -`
                          : 'Granular live sub-category share breakdown across all users:'}
                      </p>

                      {/* Parent Filter */}
                      <select
                        value={selectedBenchmarkCat}
                        onChange={(e) => setSelectedBenchmarkCat(e.target.value)}
                        className="text-base font-semibold px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
                      >
                        <option value="all">{lang === 'my' ? 'ကဏ္ဍ အားလုံး' : 'All Categories'}</option>
                        {liveSubCategoryBenchmarks.map((grp) => (
                          <option key={grp.catKey} value={grp.catKey}>
                            {grp.category}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {liveSubCategoryBenchmarks
                        .filter((grp) => selectedBenchmarkCat === 'all' || grp.catKey === selectedBenchmarkCat)
                        .map((grp) => (
                          <div key={grp.catKey} className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                              <span className="truncate max-w-[180px]">{grp.category}</span>
                              {grp.totalAmount > 0 && (
                                <span className="text-[10px] font-mono text-indigo-600 font-normal" title={formatMMK(grp.totalAmount)}>
                                  {formatLakhs(grp.totalAmount, lang)}
                                </span>
                              )}
                            </div>
                            <div className="space-y-1.5 pt-0.5">
                              {grp.subcats.map((sub) => (
                                <div key={sub.name} className="space-y-0.5">
                                  <div className="flex items-center justify-between text-[11px] text-slate-600">
                                    <span className="truncate max-w-[170px]">{sub.name}</span>
                                    <span className="font-mono font-bold text-slate-900">{sub.share}</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-slate-200/70 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full bg-indigo-600 rounded-full`}
                                      style={{ width: `${sub.pct}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      {/* [v7.5.64 A-17] A selected category can exist while the
                          filtered list is empty (e.g. stale selection) — say so
                          instead of rendering an empty grid. */}
                      {liveSubCategoryBenchmarks.length > 0 &&
                        liveSubCategoryBenchmarks.filter((grp) => selectedBenchmarkCat === 'all' || grp.catKey === selectedBenchmarkCat).length === 0 &&
                        !systemDataLoading && (
                          <div className="col-span-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-center text-xs text-slate-500 font-medium">
                            {lang === 'my' ? 'ဤကဏ္ဍတွင် မှတ်တမ်း မရှိပါ' : 'No records in this category'}
                          </div>
                        )}
                      {liveSubCategoryBenchmarks.length === 0 && !systemDataLoading && (
                        <div className="col-span-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-center text-xs text-slate-500 font-medium">
                          {lang === 'my' ? 'အသုံးစရိတ် မှတ်တမ်း မရှိသေးပါ — ဒေတာ ရှိလာပါက ဤနေရာတွင် ပေါ်လာပါမည်' : 'No expense data yet — sub-categories will appear here once records exist.'}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Currency & Platform Breakdown Box */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <WalletIcon className="w-4 h-4 text-emerald-600" />
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                        {lang === 'my' ? 'ငွေကြေး & စနစ် အသုံးပြုမှု' : 'Currencies & Ecosystem'}
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      {effectiveWallets.length} {lang === 'my' ? 'Cloud Wallet (Users အားလုံး)' : 'Cloud Wallets (all users)'}
                    </span>
                  </div>

                  {/* Currencies Distribution */}
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      {lang === 'my' ? 'သုံးစွဲသော ငွေကြေးများ (Currencies)' : 'Supported Currencies'}
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      {liveCurrencyDistribution.slice(0, 3).map((curr) => (
                        <div key={curr.code} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                          <div className="text-base">{curr.flag}</div>
                          <div className="text-xs font-black text-slate-800 mt-0.5">{curr.code}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{curr.pct}%</div>
                        </div>
                      ))}
                    </div>
                    {/* [v7.5.64 A-07] Same "no data yet" empty state as the category benchmark. */}
                    {liveCurrencyDistribution.length === 0 && !systemDataLoading && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center text-xs text-slate-500 font-medium">
                        {lang === 'my' ? 'ပိုက်ဆံအိတ် မရှိသေးပါ — ဒေတာ ရှိလာပါက ဤနေရာတွင် ပေါ်လာပါမည်' : 'No wallets yet — currencies will appear here once wallets exist.'}
                      </div>
                    )}
                  </div>

                  {/* Device breakdown summary */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      {lang === 'my' ? 'စက်ပစ္စည်း ခွဲဝေမှု (Device Split)' : 'Device Share'}
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-700">
                      <span className="flex items-center gap-1">📱 Mobile</span>
                      <span className="font-mono font-bold text-amber-600">
                        {analyticsStats.total > 0 ? Math.round((analyticsStats.mobileCount / analyticsStats.total) * 100) : 0}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-700">
                      <span className="flex items-center gap-1">💻 Desktop</span>
                      <span className="font-mono font-bold text-indigo-600">
                        {analyticsStats.total > 0 ? Math.round((analyticsStats.desktopCount / analyticsStats.total) * 100) : 0}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-700">
                      <span className="flex items-center gap-1">📱 Tablet</span>
                      <span className="font-mono font-bold text-teal-600">
                        {analyticsStats.total > 0 ? Math.round((analyticsStats.tabletCount / analyticsStats.total) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Broadcast Notice Counter */}
                <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs text-indigo-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-indigo-600" />
                    <span>{messages.filter(m => m.isActive).length} {lang === 'my' ? 'ခု ကြေညာထားဆဲ' : 'active broadcasts'}</span>
                  </div>
                  <button
                    type="button"
                    data-tab="broadcast"
            onClick={() => setActiveTab('broadcast')}
                    className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    {lang === 'my' ? 'ကြည့်ရန် →' : 'View →'}
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Navigation Shortcuts */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-2.5">
              <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">
                {lang === 'my' ? '⚡ စီမံခန့်ခွဲမှု အမြန်လမ်းကြောင်းများ (Quick Actions)' : 'Quick Management Shortcuts'}
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <button
                  type="button"
                  data-tab="users_codes"
            onClick={() => setActiveTab('users_codes')}
                  className="p-3 bg-white rounded-xl border border-slate-200 hover:border-indigo-400 hover:shadow-xs transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <Key className="w-4 h-4 text-indigo-600" />
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                  </div>
                  <div className="font-bold text-xs text-slate-800 mt-2">
                    {lang === 'my' ? 'ကုဒ် အသစ်ထုတ်မည်' : 'Generate Codes'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {lang === 'my' ? 'Premium ခွင့်ပြုချက်များ' : 'Grant Premium'}
                  </div>
                </button>

                <button
                  type="button"
                  data-tab="broadcast"
            onClick={() => setActiveTab('broadcast')}
                  className="p-3 bg-white rounded-xl border border-slate-200 hover:border-indigo-400 hover:shadow-xs transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <Megaphone className="w-4 h-4 text-purple-600" />
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-purple-600 transition-colors" />
                  </div>
                  <div className="font-bold text-xs text-slate-800 mt-2">
                    {lang === 'my' ? 'ကြေညာချက် တင်မည်' : 'Post Broadcast'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {lang === 'my' ? 'စာတန်းပြေး သတိပေးစာ' : 'Scrolling Ticker'}
                  </div>
                </button>

                <button
                  type="button"
                  data-tab="analytics"
            onClick={() => setActiveTab('analytics')}
                  className="p-3 bg-white rounded-xl border border-slate-200 hover:border-indigo-400 hover:shadow-xs transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <Globe className="w-4 h-4 text-emerald-600" />
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-600 transition-colors" />
                  </div>
                  <div className="font-bold text-xs text-slate-800 mt-2">
                    {lang === 'my' ? 'ဧည့်သည် Logs ကြည့်မည်' : 'Visitor Logs'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {lang === 'my' ? 'နိုင်ငံနှင့် Device အစုံ' : 'Tracked Devices'}
                  </div>
                </button>

                <button
                  type="button"
                  data-tab="quota"
            onClick={() => setActiveTab('quota')}
                  className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 hover:border-amber-400 hover:shadow-xs transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <Flame className="w-4 h-4 text-amber-600" />
                    <ArrowUpRight className="w-3.5 h-3.5 text-amber-400 group-hover:text-amber-600 transition-colors" />
                  </div>
                  <div className="font-bold text-xs text-amber-950 mt-2">
                    {lang === 'my' ? '🔥 Quota & စွမ်းရည်' : '🔥 Quota Monitor'}
                  </div>
                  <div className="text-[10px] text-amber-700/80 mt-0.5">
                    {lang === 'my' ? '50k Reads / 20k Writes' : 'Daily 50k / 20k Status'}
                  </div>
                </button>

                <button
                  type="button"
                  data-tab="contact_info"
            onClick={() => setActiveTab('contact_info')}
                  className="p-3 bg-white rounded-xl border border-slate-200 hover:border-indigo-400 hover:shadow-xs transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <Phone className="w-4 h-4 text-sky-600" />
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-sky-600 transition-colors" />
                  </div>
                  <div className="font-bold text-xs text-slate-800 mt-2">
                    {lang === 'my' ? 'ငွေပေးချေမှု အကောင့်များ' : 'Payment Accounts'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {lang === 'my' ? 'KPay, Wave, KBZ, CB' : 'KBZ, Wave, Telegram'}
                  </div>
                </button>
              </div>
            </div>

            {/* [v7.5.71] SHOP IMPORT — bulk import shops from a JSON file */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-800">
                  {lang === 'my' ? 'ဆိုင်များ Import' : 'Import Shops'}
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {lang === 'my'
                  ? 'JSON ဖိုင်တစ်ခု ရွေးပြီး ဆိုင်များကို တစ်ပြိုင်တည်း ထည့်သွင်းနိုင်ပါတယ်။ ထည့်သွင်းမီ အစမ်းပြပေးပါမယ်။'
                  : 'Pick a JSON file to add many shops at once. A preview is shown before anything is imported.'}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <input
                  ref={shopImportInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files && e.target.files[0];
                    if (f) handleShopImportFile(f);
                    e.currentTarget.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => shopImportInputRef.current?.click()}
                  disabled={isImportingShops}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {lang === 'my' ? 'JSON ဖိုင် ရွေးပါ' : 'Choose JSON file'}
                </button>
                <button
                  type="button"
                  onClick={runShopImport}
                  disabled={isImportingShops || !shopImportPreview || shopImportPreview.valid.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold hover:bg-slate-900 disabled:opacity-50"
                >
                  {isImportingShops
                    ? (lang === 'my' ? 'ထည့်သွင်းနေသည်...' : 'Importing...')
                    : (lang === 'my' ? 'ထည့်သွင်းမည်' : 'Import')}
                </button>
                {shopImportPreview && (
                  <span className="text-xs text-slate-600">
                    {lang === 'my'
                      ? 'စုစုပေါင်း ' + shopImportPreview.total + ' · ရရှိ ' + shopImportPreview.valid.length + ' · မရရှိ ' + shopImportPreview.invalid.length
                      : 'Total ' + shopImportPreview.total + ' · valid ' + shopImportPreview.valid.length + ' · invalid ' + shopImportPreview.invalid.length}
                  </span>
                )}
              </div>
              {isImportingShops && shopImportProgress.total > 0 && (
                <div className="mt-3">
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all"
                      style={{ width: Math.round((shopImportProgress.done / shopImportProgress.total) * 100) + '%' }}
                    />
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {lang === 'my'
                      ? 'ထည့်သွင်းနေသည် ' + shopImportProgress.done + '/' + shopImportProgress.total
                      : 'Importing ' + shopImportProgress.done + '/' + shopImportProgress.total}
                  </div>
                </div>
              )}
              {shopImportError && (
                <div className="mt-3 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                  {shopImportError}
                </div>
              )}
              {shopImportPreview && shopImportPreview.byRegion.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {shopImportPreview.byRegion.map((r) => (
                    <span key={r.region} className="px-2 py-1 rounded-full bg-slate-100 text-[11px] text-slate-600">
                      {r.region} · {r.count}
                    </span>
                  ))}
                </div>
              )}
              {shopImportPreview && shopImportPreview.invalid.length > 0 && (
                <ul className="mt-3 space-y-0.5 text-[11px] text-amber-700">
                  {shopImportPreview.invalid.slice(0, 5).map((row) => (
                    <li key={row.index}>
                      {lang === 'my' ? 'အတန်း ' + (row.index + 1) + ': ' : 'Row ' + (row.index + 1) + ': '}
                      {row.reason === 'missing-name'
                        ? (lang === 'my' ? 'ဆိုင်အမည် မရှိပါ' : 'missing shop name')
                        : (lang === 'my' ? 'ဆိုင်အချက်အလက် မမှန်ပါ' : 'not a shop record')}
                    </li>
                  ))}
                </ul>
              )}
              {shopImportSummary && (
                <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-900">
                  <div className="font-semibold">{lang === 'my' ? 'ထည့်သွင်းပြီးပါပြီ' : 'Import finished'}</div>
                  <div className="mt-1">
                    {lang === 'my'
                      ? 'ထည့်သွင်းပြီး ' + shopImportSummary.imported + ' ဆိုင် · ကျော်သွားပြီး ' + shopImportSummary.skipped + ' ဆိုင် · မအောင်မြင်ပါ ' + shopImportSummary.failed + ' ဆိုင်'
                      : 'Imported ' + shopImportSummary.imported + ' shops · skipped ' + shopImportSummary.skipped + ' · failed ' + shopImportSummary.failed}
                  </div>
                  {shopImportSummary.errors.length > 0 && (
                    <ul className="mt-2 space-y-0.5 text-[11px] text-rose-700">
                      {shopImportSummary.errors.map((e, i) => (
                        <li key={i}>• {e}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 0.5: FIRESTORE QUOTA & CAPACITY DASHBOARD */}
        {activeTab === 'quota' && (
          <div className="flex-1 overflow-y-auto overflow-x-hidden pt-3 space-y-4 pr-1">
            <QuotaDashboard
              lang={lang}
              usersCount={usersList.length}
              transactionsCount={effectiveTransactions.length}
              walletsCount={effectiveWallets.length}
              codesCount={codes.length}
              messagesCount={messages.length}
              visitorsCount={deduplicatedVisitors.length}
              categoriesCount={systemCategories.length}
              debtsCount={systemExtraCounts.debts}
              vehiclesCount={systemExtraCounts.vehicles}
              fuelLogsCount={systemExtraCounts.fuelLogs}
              vehicleMaintenanceCount={systemExtraCounts.vehicleMaintenance}
              tirePressureLogsCount={systemExtraCounts.tirePressureLogs}
              budgetsCount={systemExtraCounts.budgets}
              savingsTargetsCount={systemExtraCounts.savingsTargets}
              shopsCount={systemExtraCounts.shops}
              feedbacksCount={systemExtraCounts.feedbacks}
              adminsCount={systemExtraCounts.admins}
              onRefreshData={fetchAllData}
            />
          </div>
        )}

        {/* TAB 1: UNIFIED USERS & PREMIUM CODES */}
        {activeTab === 'users_codes' && (
          <div className="flex-1 overflow-y-auto overflow-x-hidden pt-3 space-y-4 pr-1">
            {/* Summary Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-center">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  {lang === 'my' ? 'စုစုပေါင်း ကုဒ်များ' : 'Total Codes'}
                </div>
                <div className="text-xl font-black text-slate-800 mt-0.5">{totalCodesCount}</div>
              </div>

              <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-3 text-center">
                <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                  {lang === 'my' ? 'မသုံးရသေးသော ကုဒ်' : 'Available Codes'}
                </div>
                <div className="text-xl font-black text-emerald-700 mt-0.5">
                  {availableCodesCount}
                </div>
              </div>

              <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-3 text-center">
                <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
                  {lang === 'my' ? 'အသုံးပြုပြီး ကုဒ်များ' : 'Used Codes'}
                </div>
                <div className="text-xl font-black text-amber-700 mt-0.5">{usedCodesCount}</div>
              </div>

              <div className="bg-indigo-50/60 border border-indigo-200 rounded-2xl p-3 text-center">
                <div className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
                  {lang === 'my' ? 'Premium အသုံးပြုသူ' : 'Premium Users'}
                </div>
                <div className="text-xl font-black text-indigo-700 mt-0.5">
                  {premiumUsersCount}
                </div>
              </div>
            </div>

            {/* Quick Generator Box */}
            <div className="flex flex-wrap gap-3 items-end bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Duration (သက်တမ်း)
                </label>
                <select
                  value={selectedMonths}
                  onChange={(e) => setSelectedMonths(Number(e.target.value))}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-base font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value={1}>1 Month (၁ လ)</option>
                  <option value={2}>2 Months (၂ လ)</option>
                  <option value={3}>3 Months (၃ လ)</option>
                  <option value={6}>6 Months (၆ လ)</option>
                  <option value={12}>12 Months / 1 Year (၁ နှစ်)</option>
                  <option value={999}>Lifetime (တစ်သက်တာ)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Quantity (အရေအတွက်)
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={generateCount}
                  onChange={(e) => setGenerateCount(Number(e.target.value))}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-base font-semibold focus:outline-none focus:border-indigo-500 w-24"
                />
              </div>

              <button
                type="button"
                onClick={handleGenerateCodes}
                disabled={dataLoading}
                className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-1.5 text-xs disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                {lang === 'my' ? 'ကုဒ် အသစ်ထုတ်မည်' : 'Generate Codes'}
              </button>

              <button
                type="button"
                onClick={fetchAllData}
                disabled={dataLoading}
                className="ml-auto px-3 py-2 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-colors flex items-center gap-1.5 text-xs disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${dataLoading ? 'animate-spin' : ''}`} />
                {lang === 'my' ? 'ဒေတာ အသစ်ပြန်ယူမည်' : 'Refresh All'}
              </button>
            </div>

            {/* Filter Pills & Live Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {lang === 'my' ? 'အားလုံး' : 'All Codes'} ({totalCodesCount})
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('used')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    statusFilter === 'used'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>
                    {lang === 'my' ? 'ဘယ်သူသုံးနေလဲ (Used)' : 'Used Codes & Users'} (
                    {usedCodesCount})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('available')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'available'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  {lang === 'my' ? 'မသုံးရသေးသော ကုဒ်များ' : 'Available Codes'} (
                  {availableCodesCount})
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('expired')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'expired'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  {lang === 'my' ? 'သက်တမ်းကုန်သော ကုဒ်များ' : 'Expired Codes'} (
                  {expiredCodesCount})
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('users')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    statusFilter === 'users'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-indigo-50 text-indigo-800 border border-indigo-200 hover:bg-indigo-100'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>
                    {lang === 'my' ? 'အသုံးပြုသူများ စာရင်း' : 'Registered Users'} (
                    {usersList.length})
                  </span>
                </button>
              </div>

              {/* Live Search */}
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    lang === 'my'
                      ? 'ကုဒ် / Email / UID / အမည် ဖြင့် ရှာပါ...'
                      : 'Search by code, email, UID or name...'
                  }
                  className="w-full pl-9 pr-3 py-1.5 text-base rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>
            </div>

            {/* UNIFIED TABLE VIEW */}
            {statusFilter !== 'users' ? (
              <>
                {/* [v7.5.64] Desktop table — hidden on phones, replaced by the code cards below. */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs hidden sm:block">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 uppercase tracking-wider font-extrabold">
                        <th className="py-3 px-4">Activation Code</th>
                        <th className="py-3 px-4">Duration</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">
                          {lang === 'my'
                            ? 'ဘယ်သူသုံးနေလဲ (Assigned User)'
                            : 'Used By (User Account)'}
                        </th>
                        <th className="py-3 px-4">Activated / Expiry</th>
                        <th className="py-3 px-4 text-right sticky right-0 bg-slate-50">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredCodes.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            {dataLoading
                              ? 'Loading codes...'
                              : lang === 'my'
                              ? 'ကုဒ်များ မတွေ့ရှိပါ။'
                              : 'No matching codes found.'}
                          </td>
                        </tr>
                      ) : (
                        filteredCodes.map((c) => {
                          const assigned = getAssignedUser(c);

                          // Calculate remaining days if assigned user has expiry
                          let daysLeft: number | null = null;
                          if (assigned?.expiresAt) {
                            const diffMs = new Date(assigned.expiresAt).getTime() - Date.now();
                            daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
                          }

                          return (
                            <tr
                              key={c.code}
                              className={`transition-colors ${
                                c.isUsed
                                  ? 'bg-amber-50/20 hover:bg-amber-50/40'
                                  : 'hover:bg-slate-50'
                              }`}
                            >
                              {/* Code */}
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 border border-slate-300/80 px-2 py-0.5 rounded-md">
                                    {c.code}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(c.code)}
                                    className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                                    title="Copy Code"
                                  >
                                    {copiedCode === c.code ? (
                                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              </td>

                              {/* Duration */}
                              <td className="py-3 px-4 font-semibold text-slate-700">
                                {c.months >= 900 ? (
                                  <span className="inline-flex items-center gap-1 text-indigo-700 font-bold">
                                    <Sparkles className="w-3 h-3 text-indigo-500" />
                                    Lifetime
                                  </span>
                                ) : (
                                  `${c.months} ${c.months === 1 ? 'Month' : 'Months'}`
                                )}
                              </td>

                              {/* Status */}
                              <td className="py-3 px-4">
                                {c.isUsed ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200">
                                    <UserCheck className="w-3 h-3" />
                                    Used
                                  </span>
                                ) : isCodeExpired(c) ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold border border-rose-200">
                                    {lang === 'my' ? 'သက်တမ်းကုန်' : 'Expired'}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                                    Available
                                  </span>
                                )}
                              </td>

                              {/* Who is using it (User details) */}
                              <td className="py-3 px-4">
                                {assigned ? (
                                  <div className="space-y-0.5">
                                    <div className="font-bold text-slate-900 flex items-center gap-1">
                                      <span className="text-slate-800 truncate max-w-[160px]">{assigned.email}</span>
                                    </div>
                                    {assigned.id && (
                                      <div className="text-[10px] text-slate-400 font-mono">
                                        UID: {assigned.id.slice(0, 12)}...
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-xs italic">
                                    {lang === 'my' ? '— (မသုံးရသေးပါ)' : '— (Not redeemed yet)'}
                                  </span>
                                )}
                              </td>

                              {/* Dates & Expiry */}
                              <td className="py-3 px-4">
                                {c.isUsed ? (
                                  <div className="space-y-0.5">
                                    <div className="text-slate-600 text-[11px] flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-slate-400" />
                                      <span>
                                        {c.usedAt
                                          ? new Date(c.usedAt).toLocaleDateString('en-GB')
                                          : 'Activated'}
                                      </span>
                                    </div>
                                    {assigned?.expiresAt && (
                                      <div className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                                        {daysLeft !== null && daysLeft > 0
                                          ? `${daysLeft} days left`
                                          : 'Expired'}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="space-y-0.5">
                                    <div className="text-slate-400 text-[11px]">
                                      Created {new Date(c.createdAt).toLocaleDateString('en-GB')}
                                    </div>
                                    {c.expiresAt && (
                                      <div className={`text-[11px] font-semibold ${isCodeExpired(c) ? 'text-rose-600' : 'text-slate-500'}`}>
                                        {lang === 'my' ? 'သက်တမ်းကုန်' : 'Expires'}: {new Date(c.expiresAt).toLocaleDateString('en-GB')}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="py-3 px-4 text-right sticky right-0 bg-white shadow-[-4px_0_8px_rgba(0,0,0,0.05)]">
                                <div className="flex items-center justify-end gap-1.5">
                                  {c.isUsed && (
                                    <button
                                      type="button"
                                      disabled={busyCode === c.code}
                                      onClick={() => handleRevokeCode(c)}
                                      className="px-2 py-1 text-[10px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                      title="Revoke this user's Premium"
                                    >
                                      {lang === 'my' ? 'ရုပ်သိမ်းမည်' : 'Revoke'}
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    disabled={busyCode === c.code || c.isUsed}
                                    onClick={() => handleDeleteCode(c.code)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                    title={c.isUsed ? (lang === 'my' ? 'အရင် ရုပ်သိမ်းပါ' : 'Revoke first') : 'Delete Code'}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              {/* [v7.5.64] Mobile code cards — same data and handlers as the table above. */}
              <div className="sm:hidden space-y-2">
                {filteredCodes.length === 0 ? (
                  <p className="py-8 text-center text-slate-400 text-xs">
                    {dataLoading
                      ? 'Loading codes...'
                      : lang === 'my'
                      ? 'ကုဒ်များ မတွေ့ရှိပါ။'
                      : 'No matching codes found.'}
                  </p>
                ) : (
                  filteredCodes.map((c) => {
                    const assigned = getAssignedUser(c);
                    let daysLeft: number | null = null;
                    if (assigned?.expiresAt) {
                      const diffMs = new Date(assigned.expiresAt).getTime() - Date.now();
                      daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
                    }
                    return (
                      <div key={c.code} className={`border border-slate-200 rounded-2xl p-3 space-y-1.5 shadow-xs text-xs ${c.isUsed ? 'bg-amber-50/20' : 'bg-white'}`}>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 border border-slate-300/80 px-2 py-0.5 rounded-md break-all">
                            {c.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(c.code)}
                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                            title="Copy Code"
                          >
                            {copiedCode === c.code ? (
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <span className="font-semibold text-slate-700">
                            {c.months >= 900 ? (
                              <span className="inline-flex items-center gap-1 text-indigo-700 font-bold">
                                <Sparkles className="w-3 h-3 text-indigo-500" />
                                Lifetime
                              </span>
                            ) : (
                              `${c.months} ${c.months === 1 ? 'Month' : 'Months'}`
                            )}
                          </span>
                          {c.isUsed ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200">
                              <UserCheck className="w-3 h-3" />
                              Used
                            </span>
                          ) : isCodeExpired(c) ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold border border-rose-200">
                              {lang === 'my' ? 'သက်တမ်းကုန်' : 'Expired'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                              Available
                            </span>
                          )}
                        </div>
                        {assigned ? (
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-900 break-all">{assigned.email}</div>
                            {assigned.id && (
                              <div className="text-[10px] text-slate-400 font-mono break-all">
                                UID: {assigned.id.slice(0, 12)}...
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">
                            {lang === 'my' ? '— (မသုံးရသေးပါ)' : '— (Not redeemed yet)'}
                          </span>
                        )}
                        {c.isUsed ? (
                          <div className="space-y-0.5">
                            <div className="text-slate-600 text-[11px] flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>
                                {c.usedAt
                                  ? new Date(c.usedAt).toLocaleDateString('en-GB')
                                  : 'Activated'}
                              </span>
                            </div>
                            {assigned?.expiresAt && (
                              <div className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                                {daysLeft !== null && daysLeft > 0
                                  ? `${daysLeft} days left`
                                  : 'Expired'}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <div className="text-slate-400 text-[11px]">
                              Created {new Date(c.createdAt).toLocaleDateString('en-GB')}
                            </div>
                            {c.expiresAt && (
                              <div className={`text-[11px] font-semibold ${isCodeExpired(c) ? 'text-rose-600' : 'text-slate-500'}`}>
                                {lang === 'my' ? 'သက်တမ်းကုန်' : 'Expires'}: {new Date(c.expiresAt).toLocaleDateString('en-GB')}
                              </div>
                            )}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {c.isUsed && (
                            <button
                              type="button"
                              disabled={busyCode === c.code}
                              onClick={() => handleRevokeCode(c)}
                              className="px-2 py-1 text-[10px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
                              title="Revoke this user's Premium"
                            >
                              {lang === 'my' ? 'ရုပ်သိမ်းမည်' : 'Revoke'}
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busyCode === c.code || c.isUsed}
                            onClick={() => handleDeleteCode(c.code)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
                            title={c.isUsed ? (lang === 'my' ? 'အရင် ရုပ်သိမ်းပါ' : 'Revoke first') : 'Delete Code'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              </>
            ) : (
              /* USERS DIRECTORY VIEW */
              <>
                {/* [v7.5.64 B-07] Plan filter pills + showing count. */}
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  <button
                    type="button"
                    onClick={() => setPlanFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      planFilter === 'all'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {lang === 'my' ? 'အားလုံး' : 'All'} ({usersList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlanFilter('premium')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      planFilter === 'premium'
                        ? 'bg-amber-600 text-white'
                        : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    {lang === 'my' ? 'Premium' : 'Premium'} ({premiumUsersCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlanFilter('free')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      planFilter === 'free'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    {lang === 'my' ? 'Free' : 'Free'} ({usersList.length - premiumUsersCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlanFilter('expired')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      planFilter === 'expired'
                        ? 'bg-rose-600 text-white'
                        : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                    }`}
                  >
                    {lang === 'my' ? 'သက်တမ်းကုန်' : 'Expired'} ({usersList.filter((u) => u.plan === 'premium' && getUserEffectivePlan(u) === 'free').length})
                  </button>
                  <span className="ml-auto text-xs text-slate-500 font-semibold">
                    {lang === 'my'
                      ? `ပြသနေသည် ${filteredUsers.length} / စုစုပေါင်း ${usersList.length} ဦး`
                      : `Showing ${filteredUsers.length} of ${usersList.length} users`}
                  </span>
                </div>
                {/* [v7.5.64] Desktop table — hidden on phones, replaced by the user cards below. */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs hidden sm:block">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 uppercase tracking-wider font-extrabold">
                        <th className="py-3 px-4">User Account</th>
                        <th className="py-3 px-4">Current Plan</th>
                        <th className="py-3 px-4">Records & Expenses</th>
                        <th className="py-3 px-4">Expiry Date</th>
                        <th className="py-3 px-4 text-right sticky right-0 bg-slate-50">Account & Data Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400">
                            {dataLoading ? 'Loading users...' : 'No users found.'}
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u) => {
                          let daysLeft: number | null = null;
                          if (u.premiumExpiresAt) {
                            const diffMs = new Date(u.premiumExpiresAt).getTime() - Date.now();
                            daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
                          }

                          const _txStats = userTxStats.get(u.id) || { count: 0, expense: 0 };
                          const userTxCount = _txStats.count;
                          const userExpenseTotal = _txStats.expense;

                          return (
                            <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                              <td className="py-3 px-4">
                                {/* [v7.5.60 S-87] Long emails stretched the table
                                    (codes list already truncates at 160px). */}
                                <div className="font-bold text-slate-900 truncate max-w-[160px]" title={u.email || u.displayName || ''}>
                                  {u.email || u.displayName || 'Guest User'}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-[160px]">
                                  UID: {u.id}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                {(() => {
                                  const eff = getUserEffectivePlan(u);
                                  return (
                                    <span
                                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                        eff === 'premium'
                                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                          : 'bg-slate-100 text-slate-600'
                                      }`}
                                    >
                                      {eff === 'premium' && (
                                        <Crown className="w-3 h-3 text-amber-600" />
                                      )}
                                      {eff}
                                    </span>
                                  );
                                })()}
                              </td>
                              <td className="py-3 px-4">
                                <div className="space-y-0.5">
                                  <div className="font-semibold text-slate-800">
                                    {userTxCount > 0 ? (
                                      <span>
                                        {userTxCount} {lang === 'my' ? 'မှတ်တမ်း' : 'records'}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 italic">{lang === 'my' ? 'မှတ်တမ်း မရှိပါ' : 'No records'}</span>
                                    )}
                                  </div>
                                  {userExpenseTotal > 0 && (
                                    <div className="text-[11px] font-mono text-slate-600 font-bold" title={formatMMK(userExpenseTotal)}>
                                      {formatLakhs(userExpenseTotal, lang)}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                {u.premiumExpiresAt ? (
                                  <div className="space-y-0.5">
                                    <div className="font-semibold text-slate-700">
                                      {new Date(u.premiumExpiresAt).toLocaleDateString('en-GB')}
                                    </div>
                                    <div className="text-[10px] text-indigo-600 font-bold">
                                      {daysLeft !== null && daysLeft > 0
                                        ? `${daysLeft} days remaining`
                                        : 'Expired'}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right sticky right-0 bg-white shadow-[-4px_0_8px_rgba(0,0,0,0.05)]">
                                <div className="inline-flex items-center gap-1.5 justify-end">
                                  {/* View / Manage Transactions for this User */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedFilterUser(u.id);
                                      setSelectedFilterCategory('all');
                                      setShowTxManagerModal(true);
                                    }}
                                    className="p-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1 whitespace-nowrap"
                                    title={lang === 'my' ? 'ဤ User ၏ စာရင်းမှတ်တမ်းများကို ကြည့်ရှု/ဖျက်မည်' : 'Inspect user records'}
                                  >
                                    <Sliders className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">{lang === 'my' ? 'စာရင်းများ' : 'Records'}</span>
                                  </button>

                                  {/* Plan Manage */}
                                  <button
                                    type="button"
                                    onClick={() => setSelectedUserForPlan(u)}
                                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors whitespace-nowrap ${
                                      getUserEffectivePlan(u) === 'premium'
                                        ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-300'
                                        : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs'
                                    }`}
                                  >
                                    {getUserEffectivePlan(u) === 'premium'
                                      ? lang === 'my'
                                        ? 'Premium သက်တမ်း'
                                        : 'Manage Premium'
                                      : lang === 'my'
                                      ? '✨ Premium'
                                      : '✨ Grant'}
                                  </button>

                                  {/* [v7.5.60 M-20] Two bare Trash2 icons sat side
                                      by side — one deleted the WHOLE account,
                                      the other only cleared records. On a phone
                                      (no hover tooltip) that is a one-tap
                                      disaster. Labelled buttons now. */}
                                  <button
                                    type="button"
                                    disabled={isPurgingBatch}
                                    onClick={() => handleDeleteUserAccount(u.id, u.email || u.id)}
                                    className="px-2.5 py-2.5 rounded-lg text-xs font-bold cursor-pointer transition-colors bg-rose-600 text-white hover:bg-rose-700 shadow-2xs disabled:opacity-50 inline-flex items-center gap-1 whitespace-nowrap"
                                    title={lang === 'my' ? 'အကောင့်တစ်ခုလုံး ဖျက်မည် (Delete Account)' : 'Delete entire user account'}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>{isPurgingBatch && busyUserId === u.id ? (lang === 'my' ? 'ဖျက်နေဆဲ…' : 'Purging…') : (lang === 'my' ? 'အကောင့်ဖျက်မည်' : 'Delete Account')}</span>
                                  </button>

                                  {/* Purge user transactions if test account */}
                                  {userTxCount > 0 && (
                                    <button
                                      type="button"
                                      disabled={isPurgingBatch}
                                      onClick={() => handlePurgeUserTransactions(u.id, u.email || u.id)}
                                      className="px-2.5 py-2.5 rounded-lg text-xs font-bold cursor-pointer transition-colors bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 disabled:opacity-50 inline-flex items-center gap-1 whitespace-nowrap"
                                      title={lang === 'my' ? 'ဤ User ၏ စာရင်းအားလုံးကို ရှင်းလင်းမည်' : 'Purge all records of this user'}
                                    >
                                      <Eraser className="w-3.5 h-3.5" />
                                      <span>{isPurgingBatch && busyUserId === u.id ? (lang === 'my' ? 'ဖျက်နေဆဲ…' : 'Purging…') : (lang === 'my' ? 'စာရင်းရှင်းမည်' : 'Clear Records')}</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              {/* [v7.5.64] Mobile user cards — same data and handlers as the table above. */}
              <div className="sm:hidden space-y-2">
                {filteredUsers.length === 0 ? (
                  <p className="py-8 text-center text-slate-400 text-xs">
                    {dataLoading ? 'Loading users...' : 'No users found.'}
                  </p>
                ) : (
                  filteredUsers.map((u) => {
                    let daysLeft: number | null = null;
                    if (u.premiumExpiresAt) {
                      const diffMs = new Date(u.premiumExpiresAt).getTime() - Date.now();
                      daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
                    }
                    const _txStats = userTxStats.get(u.id) || { count: 0, expense: 0 };
                    const userTxCount = _txStats.count;
                    const userExpenseTotal = _txStats.expense;
                    return (
                      <div key={u.id} className="border border-slate-200 rounded-2xl bg-white p-3 space-y-1.5 shadow-xs text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-bold text-slate-900 break-all min-w-0">
                            {u.email || u.displayName || 'Guest User'}
                          </div>
                          {(() => {
                            const eff = getUserEffectivePlan(u);
                            return (
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                                  eff === 'premium'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {eff === 'premium' && (
                                  <Crown className="w-3 h-3 text-amber-600" />
                                )}
                                {eff}
                              </span>
                            );
                          })()}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono break-all">
                          UID: {u.id}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap text-slate-600">
                          <span className="font-semibold text-slate-800">
                            {userTxCount > 0 ? (
                              <span>
                                {userTxCount} {lang === 'my' ? 'မှတ်တမ်း' : 'records'}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">{lang === 'my' ? 'မှတ်တမ်း မရှိပါ' : 'No records'}</span>
                            )}
                          </span>
                          {userExpenseTotal > 0 && (
                            <span className="text-[11px] font-mono font-bold" title={formatMMK(userExpenseTotal)}>
                              {formatLakhs(userExpenseTotal, lang)}
                            </span>
                          )}
                          {u.premiumExpiresAt ? (
                            <span className="font-semibold text-slate-700">
                              {new Date(u.premiumExpiresAt).toLocaleDateString('en-GB')}{' '}
                              <span className="text-[10px] text-indigo-600 font-bold">
                                {daysLeft !== null && daysLeft > 0
                                  ? `${daysLeft} days remaining`
                                  : 'Expired'}
                              </span>
                            </span>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFilterUser(u.id);
                              setSelectedFilterCategory('all');
                              setShowTxManagerModal(true);
                            }}
                            className="p-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1 whitespace-nowrap"
                            title={lang === 'my' ? 'ဤ User ၏ စာရင်းမှတ်တမ်းများကို ကြည့်ရှု/ဖျက်မည်' : 'Inspect user records'}
                          >
                            <Sliders className="w-3.5 h-3.5" />
                            <span>{lang === 'my' ? 'စာရင်းများ' : 'Records'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedUserForPlan(u)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors whitespace-nowrap ${
                              getUserEffectivePlan(u) === 'premium'
                                ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-300'
                                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs'
                            }`}
                          >
                            {getUserEffectivePlan(u) === 'premium'
                              ? lang === 'my'
                                ? 'Premium သက်တမ်း'
                                : 'Manage Premium'
                              : lang === 'my'
                              ? '✨ Premium'
                              : '✨ Grant'}
                          </button>
                          <button
                            type="button"
                            disabled={isPurgingBatch}
                            onClick={() => handleDeleteUserAccount(u.id, u.email || u.id)}
                            className="px-2.5 py-2.5 rounded-lg text-xs font-bold cursor-pointer transition-colors bg-rose-600 text-white hover:bg-rose-700 shadow-2xs disabled:opacity-50 inline-flex items-center gap-1 whitespace-nowrap"
                            title={lang === 'my' ? 'အကောင့်တစ်ခုလုံး ဖျက်မည် (Delete Account)' : 'Delete entire user account'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{isPurgingBatch && busyUserId === u.id ? (lang === 'my' ? 'ဖျက်နေဆဲ…' : 'Purging…') : (lang === 'my' ? 'အကောင့်ဖျက်မည်' : 'Delete Account')}</span>
                          </button>
                          {userTxCount > 0 && (
                            <button
                              type="button"
                              disabled={isPurgingBatch}
                              onClick={() => handlePurgeUserTransactions(u.id, u.email || u.id)}
                              className="px-2.5 py-2.5 rounded-lg text-xs font-bold cursor-pointer transition-colors bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 disabled:opacity-50 inline-flex items-center gap-1 whitespace-nowrap"
                              title={lang === 'my' ? 'ဤ User ၏ စာရင်းအားလုံးကို ရှင်းလင်းမည်' : 'Purge all records of this user'}
                            >
                              <Eraser className="w-3.5 h-3.5" />
                              <span>{isPurgingBatch && busyUserId === u.id ? (lang === 'my' ? 'ဖျက်နေဆဲ…' : 'Purging…') : (lang === 'my' ? 'စာရင်းရှင်းမည်' : 'Clear Records')}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              </>
            )}
          </div>
        )}

        {/* TAB 2: BROADCAST & MARQUEE ANNOUNCEMENTS */}
        {activeTab === 'broadcast' && (
          <div className="flex-1 overflow-y-auto overflow-x-hidden pt-3 space-y-4 pr-1">
            {/* Create/Edit Broadcast Form */}
            <form
              id="broadcast-form"
              onSubmit={handleSaveMessage}
              className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3.5"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 min-w-0">
                  <Megaphone className="w-4 h-4 text-indigo-600" />
                  <span>
                    {editingMsgId
                      ? lang === 'my'
                        ? 'ကြေညာချက် ပြင်ဆင်ရန် (Edit Broadcast)'
                        : 'Edit Broadcast Message'
                      : lang === 'my'
                      ? 'ကြေညာချက် & စာတန်းပြေး အသစ်ထုတ်လွှင့်မည် (New Broadcast)'
                      : 'Publish New System Broadcast'}
                  </span>
                </h4>

                {editingMsgId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="text-xs text-rose-600 hover:underline font-bold cursor-pointer shrink-0"
                  >
                    {lang === 'my' ? 'ပြင်ဆင်မှု ပယ်ဖျက်မည်' : 'Cancel Edit'}
                  </button>
                )}
              </div>

              {/* Title & Type Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Title */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    {lang === 'my' ? 'ခေါင်းစဉ် (Title / Alert Header)' : 'Headline'}
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={80}
                    value={msgTitle}
                    onChange={(e) => setMsgTitle(e.target.value)}
                    placeholder={
                      lang === 'my'
                        ? 'ဥပမာ - ဗားရှင်းအသစ်ထွက်ရှိပါပြီ / ဆာဗာပြုပြင်ထိန်းသိမ်းမှု'
                        : 'e.g. New Version Released / Maintenance Alert'
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-base font-medium focus:outline-none focus:border-indigo-500"
                  />
                  {/* [v7.5.64 C-23] Title cap 80 chars. */}
                  <div className="text-[10px] text-slate-400 text-right">
                    {msgTitle.length}/80 {lang === 'my' ? '· အများဆုံး စာလုံး ၈၀' : '· max 80 chars'}
                  </div>
                </div>

                {/* Type Selection */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    {lang === 'my' ? 'အမျိုးအစား (Type)' : 'Message Type'}
                  </label>
                  <select
                    value={msgType}
                    onChange={(e) => setMsgType(e.target.value as AdminMessageType)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-base font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="announcement">📢 Announcement (ကြေညာချက်)</option>
                    <option value="notice">⚠️ Notice (သတိပေးချက်)</option>
                    <option value="note">📝 Note (အထူးမှတ်ချက်)</option>
                  </select>
                </div>
              </div>

              {/* Content text */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  {lang === 'my' ? 'အကြောင်းအရာ စာတန်း (Content / Message)' : 'Message Content'}
                </label>
                <textarea
                  required
                  rows={2}
                  maxLength={300}
                  value={msgContent}
                  onChange={(e) => setMsgContent(e.target.value)}
                  placeholder={
                    lang === 'my'
                      ? 'အသုံးပြုသူများထံ ဖော်ပြလိုသော ကြေညာချက် သို့မဟုတ် သတိပေးချက်ကို ရိုက်ထည့်ပါ...'
                      : 'Enter announcement text to be broadcasted to users...'
                  }
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-base font-normal focus:outline-none focus:border-indigo-500"
                />
                {/* [v7.5.64 C-23] Content cap 300 chars. */}
                <div className="text-[10px] text-slate-400 text-right">
                  {msgContent.length}/300 {lang === 'my' ? '· အများဆုံး စာလုံး ၃၀၀' : '· max 300 chars'}
                </div>
              </div>

              {/* Switches: Marquee & Active */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-200/60">
                <div className="flex items-center gap-4">
                  {/* Marquee Toggle */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={msgIsMarquee}
                      onChange={(e) => setMsgIsMarquee(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-bold text-slate-700">
                      {lang === 'my'
                        ? '🏃 စာတန်းပြေး (Marquee) ဖွင့်မည်'
                        : 'Enable Marquee (Scrolling Ticker)'}
                    </span>
                  </label>

                  {/* Active Toggle */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={msgIsActive}
                      onChange={(e) => setMsgIsActive(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-bold text-slate-700">
                      {lang === 'my'
                        ? '🟢 ချက်ချင်း ထုတ်လွှင့်မည် (Active)'
                        : 'Broadcast Immediately (Active)'}
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={submittingMsg}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {submittingMsg
                      ? lang === 'my'
                        ? 'ထုတ်လွှင့်နေသည်...'
                        : 'Publishing...'
                      : editingMsgId
                      ? lang === 'my'
                        ? 'ပြင်ဆင်ချက် သိမ်းမည်'
                        : 'Update Message'
                      : lang === 'my'
                      ? 'ထုတ်လွှင့်မည် (Publish)'
                      : 'Publish Broadcast'}
                  </span>
                </button>
              </div>
            </form>

            {/* List of Existing Broadcasts */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {lang === 'my' ? 'ထုတ်လွှင့်ထားသော မက်ဆေ့ခ်ျများ စာရင်း' : 'Existing Broadcast Messages'}{' '}
                  ({messages.length})
                </h4>

                <button
                  type="button"
                  onClick={fetchMessages}
                  disabled={broadcastLoading}
                  className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${broadcastLoading ? 'animate-spin' : ''}`} />
                  {lang === 'my' ? 'ပြန်လည်ဆွဲယူမည်' : 'Refresh'}
                </button>
              </div>

              {/* [v7.5.64 C-23] Broadcast search — same pattern as visitor search. */}
              <div className="relative">
                <input
                  type="text"
                  value={msgSearchQuery}
                  onChange={(e) => setMsgSearchQuery(e.target.value)}
                  placeholder={lang === 'my' ? 'ရှာဖွေရန် (ခေါင်းစဉ်၊ အကြောင်းအရာ၊ အမျိုးအစား)...' : 'Search title, content, type...'}
                  className="w-full pl-8 pr-3 py-1.5 bg-white text-base border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>

              {filteredMessages.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 text-xs">
                  {lang === 'my'
                    ? msgSearchQuery.trim()
                      ? 'ရှာဖွေမှုနှင့် ကိုက်ညီသော ကြေညာချက် မရှိပါ။'
                      : 'ကြေညာချက် မက်ဆေ့ခ်ျများ မရှိသေးပါ။'
                    : msgSearchQuery.trim()
                      ? 'No messages match your search.'
                      : 'No broadcast messages found.'}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredMessages.map((m) => {
                    // [v7.5.55 E13] Banner shows only ONE message (first
                    // active marquee, else first active) — mark it here.
                    const activeMsgs = messages.filter((x) => x.isActive);
                    const shownId = (activeMsgs.find((x) => x.isMarquee) || activeMsgs[0])?.id;
                    const isShown = m.id === shownId;
                    return (
                    <div
                      key={m.id}
                      className={`bg-white border rounded-2xl p-3.5 sm:p-4 transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        editingMsgId === m.id
                          ? 'border-indigo-500 ring-2 ring-indigo-300'
                          : m.isActive
                          ? 'border-slate-300 ring-1 ring-slate-200'
                          : 'border-slate-200 opacity-60'
                      }`}
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Type Badge */}
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              m.type === 'notice'
                                ? 'bg-amber-100 text-amber-800'
                                : m.type === 'note'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {m.type === 'notice' ? (
                              <AlertTriangle className="w-3 h-3" />
                            ) : m.type === 'note' ? (
                              <FileText className="w-3 h-3" />
                            ) : (
                              <Megaphone className="w-3 h-3" />
                            )}
                            {lang === 'my' ? (
                              <span>{m.type === 'notice' ? 'သတိပေးချက်' : m.type === 'note' ? 'မှတ်ချက်' : 'ကြေညာချက်'}</span>
                            ) : (
                              <span className="capitalize">{m.type}</span>
                            )}
                          </span>

                          {/* Active / Inactive Badge */}
                          <button
                            type="button"
                            onClick={() => handleToggleActive(m)}
                            disabled={togglingMsgId === m.id}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer transition-colors disabled:opacity-50 ${
                              m.isActive
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                            }`}
                            title={lang === 'my' ? 'Active / Inactive ပြောင်းရန် နှိပ်ပါ' : 'Click to toggle Active / Inactive'}
                          >
                            {m.isActive
                              ? (lang === 'my' ? '🟢 ဖွင့်ထားသည်' : '🟢 Active')
                              : (lang === 'my' ? '⚪ ပိတ်ထားသည်' : '⚪ Inactive')}
                          </button>

                          {isShown && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                              {lang === 'my' ? '👁 ပြသနေသည်' : '👁 Currently shown'}
                            </span>
                          )}

                          {/* Marquee Badge */}
                          <button
                            type="button"
                            onClick={() => handleToggleMarquee(m)}
                            disabled={togglingMsgId === m.id}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer transition-colors disabled:opacity-50 ${
                              m.isMarquee
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                                : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                            }`}
                            title={lang === 'my' ? 'Marquee ပြောင်းရန် နှိပ်ပါ' : 'Click to toggle Marquee'}
                          >
                            {/* [v7.5.60 N-43] "Static: ON" read like a feature
                                switched on — it just means marquee is off. */}
                            {m.isMarquee ? (lang === 'my' ? '🏃 ရွေ့လျားပြမည်' : '🏃 Marquee: ON') : (lang === 'my' ? '⏸️ ငြိမ်သက်စွာ ပြမည်' : 'Marquee: OFF')}
                          </button>

                          <span className="text-[10px] text-slate-400">
                            {new Date(m.createdAt).toLocaleDateString('en-GB')}
                          </span>
                        </div>

                        <h5 className="font-bold text-xs sm:text-sm text-slate-800 truncate">
                          {m.title}
                        </h5>
                        <p className="text-xs text-slate-600 line-clamp-2 break-words">{m.content}</p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEditClick(m)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title={lang === 'my' ? 'ပြင်မည်' : 'Edit'}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMessage(m.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title={lang === 'my' ? 'ဖျက်မည်' : 'Delete'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: CONTACT US & PAYMENT CONFIGURATION */}
        {activeTab === 'contact_info' && (
          <div className="flex-1 overflow-y-auto overflow-x-hidden pt-4 space-y-5 pr-1">
            <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Phone className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-sky-950">
                    {lang === 'my' ? 'Contact Us & Payment Accounts စီမံခန့်ခွဲရန်' : 'Manage Contact Us & Payment Accounts'}
                  </h3>
                  <p className="text-xs text-sky-800 mt-0.5">
                    {lang === 'my'
                      ? 'ဤနေရာတွင် ပြင်ဆင်သော အချက်အလက်များကို App အတွင်းရှိ Premium ဝယ်ယူရန် စာမျက်နှာတွင် တိုက်ရိုက် ပြသပေးပါမည်။'
                      : 'Changes made here are dynamically displayed on the Premium purchase modal & Support links.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={loadContactInfoData}
                disabled={contactLoading}
                className="p-2 text-sky-700 hover:bg-sky-100 rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                title={lang === 'my' ? 'ပြန်လည်ဆွဲယူမည်' : 'Reload'}
              >
                <RefreshCw className={`w-4 h-4 ${contactLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {contactLoadError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{contactLoadError}</span>
              </div>
            )}

            {contactSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2 animate-fadeIn">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{contactSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveContactInfo} className="space-y-4">
              {/* Telegram Settings */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 pb-2 border-b border-slate-100">
                  <Send className="w-4 h-4 text-sky-500" />
                  <span>{lang === 'my' ? 'Telegram ဆက်သွယ်ရန်' : 'Telegram Admin Contact'}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      {lang === 'my' ? 'Telegram အသုံးပြုသူအမည် (ဥပမာ @ankhsam)' : 'Telegram Username (e.g. @ankhsam or ankhsam)'}
                    </label>
                    <input
                      type="text"
                      value={contactForm.telegramUsername}
                      onChange={(e) => setContactForm({ ...contactForm, telegramUsername: e.target.value })}
                      placeholder="@ankhsam"
                      disabled={contactLoading || contactSaving}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base font-medium focus:outline-none focus:border-sky-500 focus:bg-white transition-all disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      {lang === 'my' ? 'Telegram လင့်ခ် (အသုံးပြုသူအမည်မှ အလိုအလျောက် ဖန်တီးသည်)' : 'Telegram Link (auto-derived from username)'}
                    </label>
                    <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono text-slate-600 break-all">
                      {contactForm.telegramUsername ? `https://t.me/${contactForm.telegramUsername.replace(/^@/, '').trim()}` : '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Direct Phone / Viber Settings */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 pb-2 border-b border-slate-100">
                  <Phone className="w-4 h-4 text-purple-600" />
                  <span>{lang === 'my' ? 'ဖုန်း & Viber အကူအညီ' : 'Direct Phone & Viber Support'}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      {lang === 'my' ? 'Viber / ဆက်သွယ်ရန် ဖုန်းနံပါတ်' : 'Viber / Contact Phone Number'}
                    </label>
                    <input
                      type="text"
                      value={contactForm.viberPhone || ''}
                      onChange={(e) => setContactForm({ ...contactForm, viberPhone: e.target.value })}
                      placeholder="09777123456"
                      disabled={contactLoading || contactSaving}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base font-medium focus:outline-none focus:border-indigo-500 focus:bg-white transition-all disabled:opacity-50"
                    />
                  </div>

                  {/* [v7.5.60 S-98] The `phone` field existed in the type and
                      was silently preserved from the saved snapshot, but no
                      input ever showed or edited it. Now it has one. */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      {lang === 'my' ? 'တိုက်ရိုက် ဖုန်းနံပါတ်' : 'Direct Phone Number'}
                    </label>
                    <input
                      type="tel"
                      value={contactForm.phone || ''}
                      onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                      placeholder="09777123456"
                      disabled={contactLoading || contactSaving}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base font-medium focus:outline-none focus:border-indigo-500 focus:bg-white transition-all disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Account Details */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 pb-2 border-b border-slate-100">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <span>{lang === 'my' ? 'ငွေပေးချေမှု အကောင့်များ (KPay & WavePay)' : 'Payment Accounts (KPay & WavePay)'}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      {lang === 'my' ? 'KPay အကောင့် (ဖုန်း & အမည်)' : 'KPay Account (Phone & Name)'}
                    </label>
                    <input
                      type="text"
                      value={contactForm.kpayPhone || ''}
                      onChange={(e) => setContactForm({ ...contactForm, kpayPhone: e.target.value })}
                      placeholder="09777123456"
                      disabled={contactLoading || contactSaving}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base font-medium focus:outline-none focus:border-emerald-500 focus:bg-white transition-all disabled:opacity-50"
                    />
                    <input
                      type="text"
                      value={contactForm.kpayName || ''}
                      onChange={(e) => setContactForm({ ...contactForm, kpayName: e.target.value })}
                      placeholder="KPay account name"
                      disabled={contactLoading || contactSaving}
                      className="mt-2 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base font-medium focus:outline-none focus:border-emerald-500 focus:bg-white transition-all disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      {lang === 'my' ? 'WavePay အကောင့် (ဖုန်း & အမည်)' : 'WavePay Account (Phone & Name)'}
                    </label>
                    <input
                      type="text"
                      value={contactForm.wavePhone || ''}
                      onChange={(e) => setContactForm({ ...contactForm, wavePhone: e.target.value })}
                      placeholder="09777123456"
                      disabled={contactLoading || contactSaving}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base font-medium focus:outline-none focus:border-amber-500 focus:bg-white transition-all disabled:opacity-50"
                    />
                    <input
                      type="text"
                      value={contactForm.waveName || ''}
                      onChange={(e) => setContactForm({ ...contactForm, waveName: e.target.value })}
                      placeholder="WaveMoney account name"
                      disabled={contactLoading || contactSaving}
                      className="mt-2 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base font-medium focus:outline-none focus:border-amber-500 focus:bg-white transition-all disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              {/* Instructions / Notes */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 pb-2 border-b border-slate-100">
                  <FileText className="w-4 h-4 text-amber-600" />
                  <span>{lang === 'my' ? 'ငွေပေးချေမှု ညွှန်ကြားချက်' : 'Payment Instructions Note'}</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      {lang === 'my' ? 'မြန်မာ ညွှန်ကြားချက် စာသား' : 'Myanmar Note Text'}
                    </label>
                    <textarea
                      rows={2}
                      value={contactForm.contactNoteMy || ''}
                      onChange={(e) => setContactForm({ ...contactForm, contactNoteMy: e.target.value })}
                      disabled={contactLoading || contactSaving}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base font-medium focus:outline-none focus:border-amber-500 focus:bg-white transition-all disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      {lang === 'my' ? 'အင်္ဂလိပ် ညွှန်ကြားချက် စာသား' : 'English Note Text'}
                    </label>
                    <textarea
                      rows={2}
                      value={contactForm.contactNoteEn || ''}
                      onChange={(e) => setContactForm({ ...contactForm, contactNoteEn: e.target.value })}
                      disabled={contactLoading || contactSaving}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base font-medium focus:outline-none focus:border-amber-500 focus:bg-white transition-all disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={contactSaving || (contactLoadError && !contactLoaded)}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {contactSaving
                      ? (lang === 'my' ? 'သိမ်းဆည်းနေသည်...' : 'Saving Changes...')
                      : (lang === 'my' ? 'အပြောင်းအလဲများ သိမ်းဆည်းမည်' : 'Save Changes')}
                  </span>
                </button>
                {/* [v7.5.64 C-03] Never save over real data when the first load failed. */}
                {contactLoadError && !contactLoaded && (
                  <p className="mt-2 text-center text-[11px] font-bold text-rose-600">
                    {lang === 'my' ? 'ဒေတာ မရသေးလို့ မသိမ်းနိုင်ပါ — Refresh နှိပ်ပါ' : 'Data not loaded yet — tap Refresh'}
                  </p>
                )}
              </div>
            </form>
          </div>
        )}

        {/* TAB 4: VISITOR & COUNTRY ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="flex-1 overflow-y-auto overflow-x-hidden pt-3 space-y-5 pr-1">
            {analyticsError && (
              <div className="bg-rose-50 border border-rose-300 rounded-2xl p-3.5 text-xs font-bold text-rose-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{analyticsError}</span>
              </div>
            )}
            {/* Top Stat Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white p-4 rounded-2xl shadow-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-indigo-100 uppercase tracking-wider">
                    {lang === 'my' ? 'ဝင်ကြည့်သူ စုစုပေါင်း' : 'Total Visitors'}
                  </span>
                  <Eye className="w-4 h-4 text-indigo-200" />
                </div>
                <div className="text-2xl font-black font-mono">{visitorsTotalCount ?? analyticsStats.total}</div>
                <div className="text-[10px] text-indigo-200">
                  {lang === 'my' ? 'မှတ်တမ်းအားလုံး ရေတွက်ပြီး' : 'Counting all visitor records'}
                </div>
                {/* [v7.5.65] The total above is the TRUE count — only the
                    table & breakdowns cover the latest 500 records. */}
                {visitorsList.length === 500 && (
                  <div className="text-[10px] text-indigo-200/80 font-medium">
                    {lang === 'my' ? 'စုစုပေါင်း အမှန်ပါ — ဇယားနဲ့ ခွဲခြမ်းစိတ်ဖြာမှုက နောက်ဆုံး ၅၀၀ မှတ်တမ်းကိုသာ အခြေခံသည်' : 'True total — table & breakdowns cover the latest 500 records only'}
                  </div>
                )}
                {/* [v7.5.64 A-09] Visitor telemetry is unauthenticated — counts are indicative, not audited. */}
                <div className="text-[10px] text-indigo-200/80 font-medium">
                  {lang === 'my' ? 'ဧည့်သည် စာရင်းက ခန့်မှန်းခြေ ဖြစ်ပါသည်' : 'Visitor numbers are indicative only'}
                </div>
              </div>

              <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white p-4 rounded-2xl shadow-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-100 uppercase tracking-wider">
                    {lang === 'my' ? 'Guest ဝင်ကြည့်သူများ' : 'Guest Visitors'}
                  </span>
                  <Users className="w-4 h-4 text-amber-100" />
                </div>
                <div className="text-2xl font-black font-mono">{analyticsStats.guestCount}</div>
                <div className="text-[10px] text-amber-100">
                  {analyticsStats.total > 0
                    ? (lang === 'my'
                      ? `စုစုပေါင်း၏ ${Math.round((analyticsStats.guestCount / analyticsStats.total) * 100)}%`
                      : `${Math.round((analyticsStats.guestCount / analyticsStats.total) * 100)}% of total`)
                    : '0%'}
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-4 rounded-2xl shadow-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-100 uppercase tracking-wider">
                    {lang === 'my' ? 'အကောင့်ရှိ အသုံးပြုသူများ' : 'Registered Users'}
                  </span>
                  <UserCheck className="w-4 h-4 text-emerald-200" />
                </div>
                <div className="text-2xl font-black font-mono">{analyticsStats.registeredCount}</div>
                <div className="text-[10px] text-emerald-200">
                  {analyticsStats.total > 0
                    ? (lang === 'my'
                      ? `စုစုပေါင်း၏ ${Math.round((analyticsStats.registeredCount / analyticsStats.total) * 100)}%`
                      : `${Math.round((analyticsStats.registeredCount / analyticsStats.total) * 100)}% of total`)
                    : '0%'}
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-600 to-violet-700 text-white p-4 rounded-2xl shadow-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-purple-100 uppercase tracking-wider">
                    {lang === 'my' ? 'နိုင်ငံပေါင်း' : 'Countries'}
                  </span>
                  <Globe className="w-4 h-4 text-purple-200" />
                </div>
                <div className="text-2xl font-black font-mono">
                  {analyticsStats.countriesSorted.length}
                </div>
                <div className="text-[10px] text-purple-200">
                  {lang === 'my' ? 'ဝင်ရောက်သည့် နိုင်ငံများ' : 'Unique countries'}
                </div>
              </div>
            </div>

            {/* Country Breakdown & Device Distribution Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Countries Breakdown Box */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-indigo-600" />
                    <span>
                      {lang === 'my' ? '🌐 ဝင်ရောက်ကြည့်ရှုသည့် နိုင်ငံများ (Visitors by Country)' : 'Visitors by Country'}
                    </span>
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {analyticsStats.countriesSorted.length} {lang === 'my' ? 'နိုင်ငံ' : 'Countries'}
                  </span>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto overflow-x-hidden pr-1">
                  {analyticsStats.countriesSorted.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      {lang === 'my' ? 'မည်သည့် ဒေတာမှ မရှိသေးပါ' : 'No country data logged yet'}
                    </div>
                  ) : (
                    analyticsStats.countriesSorted.map((c) => {
                      const flag = getCountryFlag(c.code);
                      const pct = analyticsStats.total > 0 ? Math.round((c.count / analyticsStats.total) * 100) : 0;
                      return (
                        <div key={c.country} className="flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2 min-w-32">
                            <span className="text-base">{flag}</span>
                            <span className="font-bold text-slate-800 truncate">{c.country}</span>
                          </div>

                          <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>

                          <div className="font-mono text-[11px] text-slate-600 w-16 text-right font-semibold">
                            {c.count} ({pct}%)
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Devices & Browsers Box */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    <span>
                      {lang === 'my' ? '📱 စက်ပစ္စည်း ခွဲဝေမှု (Device Breakdown)' : 'Device Distribution'}
                    </span>
                  </h4>
                </div>

                <div className="space-y-3 py-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-amber-500" />
                      <span>{lang === 'my' ? 'ဖုန်း / Mobile' : 'Mobile'}</span>
                    </div>
                    <span className="font-mono">{analyticsStats.mobileCount} ({analyticsStats.total > 0 ? Math.round((analyticsStats.mobileCount / analyticsStats.total) * 100) : 0}%)</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all"
                      style={{
                        width: `${analyticsStats.total > 0 ? (analyticsStats.mobileCount / analyticsStats.total) * 100 : 0}%`,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 pt-2">
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-indigo-600" />
                      <span>{lang === 'my' ? 'ကွန်ပျူတာ / Desktop' : 'Desktop'}</span>
                    </div>
                    <span className="font-mono">{analyticsStats.desktopCount} ({analyticsStats.total > 0 ? Math.round((analyticsStats.desktopCount / analyticsStats.total) * 100) : 0}%)</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all"
                      style={{
                        width: `${analyticsStats.total > 0 ? (analyticsStats.desktopCount / analyticsStats.total) * 100 : 0}%`,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 pt-2">
                    <div className="flex items-center gap-2">
                      {/* [v7.5.64 C-21] Was the same 📱 emoji as the Mobile row. */}
                      <Tablet className="w-4 h-4 text-teal-600" />
                      <span>{lang === 'my' ? 'တက်ဘလက် / Tablet' : 'Tablet'}</span>
                    </div>
                    <span className="font-mono">{analyticsStats.tabletCount} ({analyticsStats.total > 0 ? Math.round((analyticsStats.tabletCount / analyticsStats.total) * 100) : 0}%)</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                    <div
                      className="h-full bg-teal-500 rounded-full transition-all"
                      style={{
                        width: `${analyticsStats.total > 0 ? (analyticsStats.tabletCount / analyticsStats.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 font-medium">
                  💡 {lang === 'my' ? 'ဧည့်သည်များ ဝင်ကြည့်သည့် အချက်အလက်များကို Real-time ထိန်းသိမ်း ဖော်ပြပေးနေပါသည်' : 'Real-time tracking of visitor location, devices, and sessions.'}
                </div>
              </div>

              {/* [v7.5.64 C-24] Browser Breakdown — rendered from
                  analyticsStats.browsersSorted ({name, count, pct}), same
                  shape as countriesSorted. */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-violet-600" />
                    <span>
                      {lang === 'my' ? '🌐 ဘရောက်ဆာ ခွဲဝေမှု (Browser Breakdown)' : 'Visitors by Browser'}
                    </span>
                  </h4>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto overflow-x-hidden pr-1">
                  {analyticsStats.browsersSorted.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      {lang === 'my' ? 'ဘရောက်ဆာ ဒေတာ မရှိသေးပါ' : 'No browser data logged yet'}
                    </div>
                  ) : (
                    analyticsStats.browsersSorted.map((b) => (
                      <div key={b.name} className="flex items-center justify-between gap-3 text-xs">
                        <span className="font-bold text-slate-800 truncate min-w-0">{b.name}</span>
                        <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                          <div
                            className="h-full bg-gradient-to-r from-violet-500 to-indigo-600 rounded-full transition-all duration-500"
                            style={{ width: `${b.pct}%` }}
                          />
                        </div>
                        <div className="font-mono text-[11px] text-slate-600 w-16 text-right font-semibold">
                          {b.count} ({b.pct}%)
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Visitors Historical Logs Detailed Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs space-y-2">
              <div className="p-4 bg-slate-50/80 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-indigo-600" />
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                      {lang === 'my'
                        ? '📜 ဝင်ရောက်ကြည့်ရှုခဲ့သူများ သမိုင်းကြောင်းမှတ်တမ်း (Visitor Historical Logs)'
                        : 'Visitor & Guest Historical Logs'}
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {lang === 'my'
                      ? 'Guest နှင့် Member များ ဝင်ရောက်ကြည့်ရှုခဲ့သည့် သမိုင်းကြောင်း အချက်အလက်များကို သိမ်းဆည်းပြသပေးပါသည် (နောက်ဆုံး ၅၀၀ ခုသာ ပြသသည်)'
                      : 'Historical records of all guest visitors and registered users. (Showing latest 500 only.)'}
                  </p>
                </div>

                {/* Search & Filter Bar */}
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <div className="relative flex-1 min-w-[120px] sm:w-48">
                    <input
                      type="text"
                      value={visitorSearch}
                      onChange={(e) => setVisitorSearch(e.target.value)}
                      placeholder={lang === 'my' ? 'ရှာဖွေရန် (Country, Device)...' : 'Search country, device...'}
                      className="w-full pl-8 pr-3 py-1.5 bg-white text-base border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  </div>

                  <div className="flex items-center bg-slate-200/70 p-0.5 rounded-xl text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setVisitorFilter('all')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        visitorFilter === 'all'
                          ? 'bg-white text-indigo-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {lang === 'my' ? 'အားလုံး' : 'All'} ({analyticsStats.total})
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisitorFilter('guest')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        visitorFilter === 'guest'
                          ? 'bg-amber-500 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      👤 {lang === 'my' ? 'Guest' : 'Guests'} ({analyticsStats.guestCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisitorFilter('member')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        visitorFilter === 'member'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      ✅ {lang === 'my' ? 'Members' : 'Members'} ({analyticsStats.registeredCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisitorFilter('active')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        visitorFilter === 'active'
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      🟢 {lang === 'my' ? 'ယခု ဝင်နေသူ' : 'Active'}
                    </button>
                  </div>
                </div>
              </div>

              {/* [v7.5.64] Desktop table — hidden on phones, replaced by the visitor cards below. */}
              <div className="overflow-x-auto hidden sm:block">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold">
                      <th className="p-2 sm:p-3">Visitor / User</th>
                      <th className="p-2 sm:p-3">Type</th>
                      <th className="p-2 sm:p-3">Country & City</th>
                      <th className="p-2 sm:p-3">Device & Browser</th>
                      <th className="p-3 text-center">Sessions</th>
                      <th className="p-2 sm:p-3">First Seen (စတင်ကြည့်သည့်ချိန်)</th>
                      <th className="p-3 text-right">Last Active (နောက်ဆုံးကြည့်ချိန်)</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredVisitors.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400">
                          {lang === 'my' ? 'မည်သည့် ဝင်ကြည့်သူ သမိုင်းကြောင်း မရှိသေးပါ' : 'No visitor logs match your filter'}
                        </td>
                      </tr>
                    ) : (
                      filteredVisitors.map((v) => {
                        const isMember = isMemberVisitor(v);
                        const flag = getCountryFlag(v.countryCode || 'MM');
                        const lastActive = new Date(v.lastActiveAt);
                        const firstSeen = v.firstSeenAt ? new Date(v.firstSeenAt) : lastActive;
                        const isRecentlyActive = Date.now() - v.lastActiveAt < 10 * 60 * 1000;
                        const displayName = isMember
                          ? v.userName || v.userEmail?.split('@')[0] || 'Member'
                          : (v.userName && v.userName !== 'Guest' && v.userName !== 'Guest Visitor' ? v.userName : 'Guest Visitor');

                        return (
                          <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-2 sm:p-3">
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${isRecentlyActive ? 'bg-emerald-500 animate-ping' : 'bg-slate-300'}`} />
                                <span className="truncate max-w-[160px]">{displayName}</span>
                              </div>
                              {isMember && v.userEmail && (
                                <div className="text-[10px] text-slate-500 font-normal truncate max-w-[180px]">
                                  {v.userEmail}
                                </div>
                              )}
                              <span className="text-[10px] text-slate-400 font-mono">
                                {isMember ? 'UID: ' : 'ID: '}{v.id.length > 22 ? v.id.slice(0, 10) + '…' + v.id.slice(-8) : v.id}
                              </span>
                            </td>

                            <td className="p-2 sm:p-3">
                              {isMember ? (
                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-bold rounded-full border border-indigo-300 inline-flex items-center gap-1">
                                  ✅ Member
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full border border-amber-300 inline-flex items-center gap-1">
                                  👤 Guest
                                </span>
                              )}
                            </td>

                            <td className="p-2 sm:p-3">
                              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                                <span className="text-base">{flag}</span>
                                {/* [v7.5.64 C-10] Inferred locations are marked, not presented as measured. */}
                                <span>{v.country || '—'}{v.geoInferred ? (lang === 'my' ? ' (ခန့်မှန်း)' : ' (estimated)') : ''}</span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-medium">
                                📍 {v.city || '—'}
                              </span>
                            </td>

                            <td className="p-2 sm:p-3">
                              <div className="font-medium text-slate-700 capitalize flex items-center gap-1">
                                {v.device === 'mobile' ? (
                                  <Smartphone className="w-3.5 h-3.5 text-amber-600" />
                                ) : (
                                  <Monitor className="w-3.5 h-3.5 text-indigo-600" />
                                )}
                                <span>{v.device || '—'}{v.browser ? ` (${v.browser})` : ''}</span>
                              </div>
                            </td>

                            <td className="p-3 text-center">
                              <span className="px-2 py-1 bg-slate-100 text-slate-800 font-mono font-bold rounded-lg border border-slate-200">
                                {typeof v.visitCount === 'number' ? v.visitCount : '—'} {lang === 'my' ? 'ကြိမ်' : 'visits'}
                              </span>
                            </td>

                            <td className="p-3 font-mono text-[11px] text-slate-600">
                              <div>{firstSeen.toLocaleDateString('en-GB')}</div>
                              <div className="text-[10px] text-slate-400">
                                {firstSeen.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </td>

                            <td className="p-3 text-right font-mono text-[11px] text-slate-600">
                              <div>{lastActive.toLocaleDateString('en-GB')}</div>
                              <div className="text-[10px] text-slate-400">
                                {lastActive.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </td>

                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteVisitor(v.id, displayName)}
                                title={lang === 'my' ? 'မှတ်တမ်းဖျက်ရန်' : 'Delete log'}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {/* [v7.5.64] Mobile visitor cards — same data and handlers as the table above. */}
              <div className="sm:hidden space-y-2">
                {filteredVisitors.length === 0 ? (
                  <p className="p-8 text-center text-slate-400 text-xs">
                    {lang === 'my' ? 'မည်သည့် ဝင်ကြည့်သူ သမိုင်းကြောင်း မရှိသေးပါ' : 'No visitor logs match your filter'}
                  </p>
                ) : (
                  filteredVisitors.map((v) => {
                    const isMember = isMemberVisitor(v);
                    const flag = getCountryFlag(v.countryCode || 'MM');
                    const lastActive = new Date(v.lastActiveAt);
                    const firstSeen = v.firstSeenAt ? new Date(v.firstSeenAt) : lastActive;
                    const isRecentlyActive = Date.now() - v.lastActiveAt < 10 * 60 * 1000;
                    const displayName = isMember
                      ? v.userName || v.userEmail?.split('@')[0] || 'Member'
                      : (v.userName && v.userName !== 'Guest' && v.userName !== 'Guest Visitor' ? v.userName : 'Guest Visitor');
                    return (
                      <div key={v.id} className="border border-slate-200 rounded-2xl bg-white p-3 space-y-1.5 shadow-xs text-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${isRecentlyActive ? 'bg-emerald-500 animate-ping' : 'bg-slate-300'}`} />
                          <span className="font-bold text-slate-900 break-words min-w-0">{displayName}</span>
                          {isMember ? (
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-bold rounded-full border border-indigo-300 inline-flex items-center gap-1 whitespace-nowrap">
                              ✅ Member
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full border border-amber-300 inline-flex items-center gap-1 whitespace-nowrap">
                              👤 Guest
                            </span>
                          )}
                        </div>
                        {isMember && v.userEmail && (
                          <div className="text-[10px] text-slate-500 break-all">{v.userEmail}</div>
                        )}
                        <div className="text-[10px] text-slate-400 font-mono break-all">
                          {isMember ? 'UID: ' : 'ID: '}{v.id.length > 22 ? v.id.slice(0, 10) + '…' + v.id.slice(-8) : v.id}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-base">{flag}</span>
                          <span className="font-bold text-slate-800">{v.country || '—'}{v.geoInferred ? (lang === 'my' ? ' (ခန့်မှန်း)' : ' (estimated)') : ''}</span>
                          <span className="text-[10px] text-slate-500 font-medium">📍 {v.city || '—'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap font-medium text-slate-700">
                          {v.device === 'mobile' ? (
                            <Smartphone className="w-3.5 h-3.5 text-amber-600" />
                          ) : (
                            <Monitor className="w-3.5 h-3.5 text-indigo-600" />
                          )}
                          <span className="capitalize">{v.device || '—'}{v.browser ? ` (${v.browser})` : ''}</span>
                          <span className="px-2 py-1 bg-slate-100 text-slate-800 font-mono font-bold rounded-lg border border-slate-200 whitespace-nowrap">
                            {typeof v.visitCount === 'number' ? v.visitCount : '—'} {lang === 'my' ? 'ကြိမ်' : 'visits'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap font-mono text-[11px] text-slate-600">
                          <span>
                            <span className="text-slate-400">{lang === 'my' ? 'စတင် ' : 'First '}</span>
                            {firstSeen.toLocaleDateString('en-GB')} {firstSeen.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span>
                            <span className="text-slate-400">{lang === 'my' ? 'နောက်ဆုံး ' : 'Last '}</span>
                            {lastActive.toLocaleDateString('en-GB')} {lastActive.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleDeleteVisitor(v.id, displayName)}
                            title={lang === 'my' ? 'မှတ်တမ်းဖျက်ရန်' : 'Delete log'}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* [v7.5.64 B-12] Admin audit trail — read-only, latest 50.
                No search/pagination in this version (follow-on). */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 min-w-0">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span className="truncate">{lang === 'my' ? 'Admin လုပ်ဆောင်ချက် မှတ်တမ်း' : 'Admin Activity Log'}</span>
                </h4>
                <span className="text-[10px] text-slate-400 font-medium shrink-0">
                  {lang === 'my' ? 'နောက်ဆုံး ၅၀ ခု' : 'Latest 50'}
                </span>
              </div>
              {auditLogError ? (
                <p className="text-[11px] text-rose-600 font-medium">{auditLogError}</p>
              ) : auditLog.length === 0 ? (
                <p className="text-[11px] text-slate-400">
                  {lang === 'my' ? 'Admin လုပ်ဆောင်ချက် မှတ်တမ်း မရှိသေးပါ' : 'No admin actions recorded yet.'}
                </p>
              ) : (
                <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                  {auditLog.map((entry) => (
                    <div key={entry.id} className="flex items-start justify-between gap-2 text-[11px] border border-slate-100 rounded-xl px-2.5 py-2 bg-slate-50/60">
                      <div className="min-w-0 space-y-0.5">
                        <div className="font-bold text-slate-800 truncate">
                          {auditActionLabel(entry.action)}
                          {entry.result !== 'success' && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">{entry.result}</span>
                          )}
                        </div>
                        <div className="text-slate-500 break-words">
                          {entry.actorEmail || entry.actorUid || '—'}
                          {entry.targetEmail ? ` → ${entry.targetEmail}` : entry.targetUid ? ` → ${entry.targetUid}` : ''}
                          {entry.detail ? ` · ${entry.detail}` : ''}
                        </div>
                      </div>
                      <span className="text-slate-400 font-mono shrink-0 whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleDateString('en-GB')} {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* DURATION SELECTION MODAL (When clicking ✨ Premium ပေးမည်) */}
      {selectedUserForPlan && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-white shadow-md shadow-amber-500/20 shrink-0">
                  <Crown className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {lang === 'my' ? 'Premium သက်တမ်း ရွေးချယ်ရန်' : 'Select Premium Duration'}
                  </h3>
                  <p className="text-xs text-slate-500 truncate max-w-[220px]">
                    {selectedUserForPlan.email || selectedUserForPlan.displayName || selectedUserForPlan.id}
                  </p>
                  {selectedUserForPlan.premiumExpiresAt && (
                    <p className="text-[11px] text-slate-500">
                      {lang === 'my' ? 'သက်တမ်းကုန်' : 'Expires'}: {new Date(selectedUserForPlan.premiumExpiresAt).toLocaleDateString('en-GB')}{' '}
                      {selectedUserForPlan.plan === 'premium' && getUserEffectivePlan(selectedUserForPlan) === 'free' && (
                        <span className="font-bold text-rose-600">({lang === 'my' ? 'သက်တမ်းကုန်ပြီ' : 'Expired'})</span>
                      )}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserForPlan(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {lang === 'my'
                ? 'အောက်ပါ သက်တမ်းများထဲမှ နှိပ်၍ အသုံးပြုသူအား တိုက်ရိုက် Premium ခွင့်ပြုချက် ပေးနိုင်ပါသည်။'
                : 'Select the desired duration to grant Premium status directly to this user:'}
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              {[
                { months: 1, label: lang === 'my' ? '၁ လ (1 Month)' : '1 Month', badge: '' },
                { months: 2, label: lang === 'my' ? '၂ လ (2 Months)' : '2 Months', badge: '' },
                { months: 3, label: lang === 'my' ? '၃ လ (3 Months)' : '3 Months', badge: '' },
                { months: 6, label: lang === 'my' ? '၆ လ (6 Months)' : '6 Months', badge: 'Popular' },
                { months: 12, label: lang === 'my' ? '၁ နှစ် (1 Year)' : '1 Year', badge: 'Best Value' },
                { months: 999, label: lang === 'my' ? 'တစ်သက်လုံး (Lifetime)' : 'Lifetime (99 yrs)', badge: 'VIP' },
              ].map((opt) => (
                <button
                  key={opt.months}
                  type="button"
                  onClick={() => handleGrantPlanWithDuration(selectedUserForPlan, opt.months)}
                  className="relative p-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-amber-50 hover:border-amber-300 hover:shadow-xs transition-all text-left group cursor-pointer"
                >
                  <div className="font-bold text-xs text-slate-800 group-hover:text-amber-900 flex items-center justify-between">
                    <span>{opt.label}</span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  {opt.badge && (
                    <span className="inline-block mt-1 px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-200 text-amber-900">
                      {opt.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {getUserEffectivePlan(selectedUserForPlan) === 'premium' && (
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleGrantPlanWithDuration(selectedUserForPlan, 0)}
                  className="w-full py-2.5 px-4 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{lang === 'my' ? 'Free Plan သို့ ပြန်လည် ရုပ်သိမ်းမည် (Revoke to Free)' : 'Revoke Premium to Free'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SYSTEM TRANSACTIONS & CLEANUP MODAL */}
      {showTxManagerModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-3 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0">
                  <Sliders className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {lang === 'my' ? 'စနစ်တွင်း စာရင်းမှတ်တမ်းများ စစ်ဆေးခြင်း & သန့်ရှင်းရေး' : 'System Database Records & Cleanup'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {lang === 'my'
                      ? 'စနစ်တစ်ခုလုံးရှိ သုံးစွဲသူအကောင့်များမှ ငွေစာရင်းမှတ်တမ်းများကို တိုက်ရိုက် ကြည့်ရှု/ဖျက်ပစ်နိုင်ပါသည်'
                      : 'Directly inspect and purge real-time database transactions across all user accounts'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTxManagerModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 shrink-0 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
              {/* Category Filter */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  {lang === 'my' ? '📁 ကဏ္ဍ ရွေးချယ်ရန်' : 'Filter Category'}
                </label>
                <select
                  value={selectedFilterCategory}
                  onChange={(e) => setSelectedFilterCategory(e.target.value)}
                  className="w-full text-base font-semibold px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="all">{lang === 'my' ? 'ကဏ္ဍ အားလုံး (All Categories)' : 'All Categories'}</option>
                  {allMergedCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.nameEn ? `(${c.nameEn})` : ''}
                    </option>
                  ))}
                  {/* [v7.5.55 E33] Legacy labels only when not already in the merged list — they used to duplicate entries. */}
                  {!allMergedCategories.some((c) => c.id === 'ကား ပြင် ထိန်း စရိတ်' || c.name === 'ကား ပြင် ထိန်း စရိတ်') && (
                    <option value="ကား ပြင် ထိန်း စရိတ်">ကား ပြင် ထိန်း စရိတ် (Car Maintenance)</option>
                  )}
                  {!allMergedCategories.some((c) => c.id === 'ယာဉ်စီမံခန့်ခွဲမှု' || c.name === 'ယာဉ်စီမံခန့်ခွဲမှု' || c.id === 'cat_vehicle') && (
                    <option value="ယာဉ်စီမံခန့်ခွဲမှု">ယာဉ်စီမံခန့်ခွဲမှု (Vehicle Management)</option>
                  )}
                  {!allMergedCategories.some((c) => c.id === 'အထွေထွေ အသုံးစရိတ်' || c.name === 'အထွေထွေ အသုံးစရိတ်') && (
                    <option value="အထွေထွေ အသုံးစရိတ်">အထွေထွေ အသုံးစရိတ် (General Expenses)</option>
                  )}
                </select>
              </div>

              {/* User Filter */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  {lang === 'my' ? '👤 အသုံးပြုသူ ရွေးချယ်ရန်' : 'Filter User'}
                </label>
                <select
                  value={selectedFilterUser}
                  onChange={(e) => setSelectedFilterUser(e.target.value)}
                  className="w-full text-base font-semibold px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="all">{lang === 'my' ? 'အသုံးပြုသူ အားလုံး (All Users)' : 'All Users'}</option>
                  {usersList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.email || u.displayName || u.id}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort Order Filter */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1 flex items-center justify-between">
                  <span>{lang === 'my' ? '↕️ ရက်စွဲ / စီစဉ်ရန်' : 'Sort Records'}</span>
                  <span className="text-[9px] text-indigo-600 font-bold">
                    {txSortOrder === 'desc' ? (lang === 'my' ? '▼ အသစ်ဆုံး' : '▼ Newest') : (lang === 'my' ? '▲ အဟောင်းဆုံး' : '▲ Oldest')}
                  </span>
                </label>
                <select
                  value={`${txSortBy}-${txSortOrder}`}
                  onChange={(e) => {
                    const [by, order] = e.target.value.split('-') as ['date' | 'amount' | 'user' | 'category', 'asc' | 'desc'];
                    setTxSortBy(by);
                    setTxSortOrder(order);
                  }}
                  className="w-full text-base font-semibold px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="date-desc">{lang === 'my' ? '📅 ရက်စွဲ (အသစ်ဆုံး အရင် - Newest)' : '📅 Date (Newest First)'}</option>
                  <option value="date-asc">{lang === 'my' ? '📅 ရက်စွဲ (အဟောင်းဆုံး အရင် - Oldest)' : '📅 Date (Oldest First)'}</option>
                  <option value="amount-desc">{lang === 'my' ? '💰 ငွေပမာဏ (အများဆုံး အရင် - Highest)' : '💰 Amount (Highest First)'}</option>
                  <option value="amount-asc">{lang === 'my' ? '💰 ငွေပမာဏ (အနည်းဆုံး အရင် - Lowest)' : '💰 Amount (Lowest First)'}</option>
                  <option value="user-asc">{lang === 'my' ? '👤 အသုံးပြုသူ (A-Z)' : '👤 User Account (A-Z)'}</option>
                  <option value="category-asc">{lang === 'my' ? '📁 ကဏ္ဍ အမည် (A-Z)' : '📁 Category Name (A-Z)'}</option>
                </select>
              </div>

              {/* Search Query */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  {lang === 'my' ? '🔍 ရှာဖွေရန် (အသုံးပြုသူ၊ ရက်စွဲ၊ ပိုက်ဆံအိတ်၊ ကဏ္ဍ၊ မှတ်ချက်၊ ငွေပမာဏ)' : 'Search User / Date / Wallet / Category / Note / Amount'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchTxQuery}
                    onChange={(e) => setSearchTxQuery(e.target.value)}
                    placeholder={lang === 'my' ? 'အသုံးပြုသူ၊ ရက်စွဲ၊ ပိုက်ဆံအိတ်၊ ကဏ္ဍ၊ မှတ်ချက်၊ ငွေပမာဏ...' : 'Search user, date, wallet, category, note, amount...'}
                    className="w-full text-base font-semibold px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  {searchTxQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchTxQuery('')}
                      className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* [admin-dr] Date Range filter — full-width row */}
              <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/70">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{lang === 'my' ? 'ရက်စွဲ အပိုင်းအခြား:' : 'Date Range:'}</span>
                </div>

                {/* Preset dropdown */}
                <select
                  value={txDatePreset}
                  onChange={(e) => applyTxDatePreset(e.target.value as any)}
                  className="text-base font-semibold px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="all">{lang === 'my' ? 'အားလုံး' : 'All Time'}</option>
                  <option value="today">{lang === 'my' ? 'ဒီနေ့' : 'Today'}</option>
                  <option value="7d">{lang === 'my' ? '၇ ရက်' : 'Last 7 days'}</option>
                  <option value="30d">{lang === 'my' ? '၃၀ ရက်' : 'Last 30 days'}</option>
                  <option value="this_month">{lang === 'my' ? 'ယခုလ' : 'This Month'}</option>
                  <option value="last_month">{lang === 'my' ? 'ပြီးခဲ့သည့်လ' : 'Last Month'}</option>
                  <option value="custom">{lang === 'my' ? 'စိတ်ကြိုက်' : 'Custom'}</option>
                </select>

                {/* From / To inputs (only when custom) */}
                {txDatePreset === 'custom' && (
                  <>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="date"
                        value={txDateFrom}
                        onChange={(e) => setTxDateFrom(e.target.value)}
                        className="text-base font-mono px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <span className="text-slate-400 text-[11px]">→</span>
                      <input
                        type="date"
                        value={txDateTo}
                        onChange={(e) => setTxDateTo(e.target.value)}
                        className="text-base font-mono px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    {txDateRangeError && (
                      <span className="text-[11px] font-bold text-rose-600">{lang === 'my' ? txDateRangeError : 'Start date must not be after end date'}</span>
                    )}
                  </>
                )}

                {/* Active range display */}
                {txDatePreset !== 'all' && txDateFrom && txDateTo && (
                  <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-lg">
                    {txDateFrom === txDateTo ? txDateFrom : `${txDateFrom} → ${txDateTo}`}
                  </span>
                )}

                {/* Reset button — only when any filter is active */}
                {(txDatePreset !== 'all' || selectedFilterCategory !== 'all' || selectedFilterUser !== 'all' || searchTxQuery.trim()) && (
                  <button
                    type="button"
                    onClick={() => {
                      applyTxDatePreset('all');
                      setSelectedFilterCategory('all');
                      setSelectedFilterUser('all');
                      setSearchTxQuery('');
                    }}
                    className="ml-auto text-[10px] font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    ↺ {lang === 'my' ? 'ဖြုတ်မည်' : 'Reset'}
                  </button>
                )}
              </div>
            </div>

            {/* Batch Purge Action Bar */}
            {selectedFilterCategory !== 'all' && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
                <div className="text-xs text-rose-800 font-semibold">
                  {lang === 'my'
                    ? `⚠️ ရွေးချယ်ထားသော ကဏ္ဍမှ စာရင်းမှတ်တမ်းအားလုံးကို Database မှ အပြီးတိုင် ဖျက်ပစ်နိုင်ပါသည်:`
                    : `⚠️ Quick purge all records in this selected category:`}
                </div>
                <button
                  type="button"
                  disabled={isPurgingBatch}
                  onClick={() => {
                    const matchedCat = allMergedCategories.find((c) => c.id === selectedFilterCategory);
                    const label = matchedCat ? matchedCat.name : selectedFilterCategory;
                    handlePurgeCategoryTransactions(selectedFilterCategory, label);
                  }}
                  className="px-3 py-1.5 bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>
                    {isPurgingBatch
                      ? (lang === 'my' ? 'ဖျက်နေဆဲ...' : 'Purging...')
                      : (lang === 'my' ? 'ဤကဏ္ဍရှိ စာရင်းအားလုံး ရှင်းလင်းမည်' : 'Purge All in this Category')}
                  </span>
                </button>
              </div>
            )}

            {/* Transactions Table List */}
            {/* [v7.5.64] Desktop table — hidden on phones, replaced by the record cards below. */}
            <div className="overflow-y-auto overflow-x-auto flex-1 border border-slate-200 rounded-2xl hidden sm:block">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 uppercase tracking-wider font-extrabold sticky top-0 bg-slate-50 z-10">
                    {/* Date Column Header with sort toggle */}
                    <th
                      onClick={() => {
                        if (txSortBy === 'date') {
                          setTxSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
                        } else {
                          setTxSortBy('date');
                          setTxSortOrder('desc');
                        }
                      }}
                      className="py-2.5 px-3 cursor-pointer select-none hover:bg-slate-100 transition-colors"
                      title={lang === 'my' ? 'ရက်စွဲအလိုက် စီရန် နှိပ်ပါ' : 'Click to sort by date'}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={txSortBy === 'date' ? 'text-indigo-700 font-black' : ''}>{lang === 'my' ? 'ရက်စွဲ' : 'Date'}</span>
                        {txSortBy === 'date' ? (
                          txSortOrder === 'desc' ? (
                            <span className="inline-flex items-center gap-0.5 text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded text-[10px] font-black shadow-2xs">
                              <ArrowDown className="w-3 h-3" />
                              <span>{lang === 'my' ? 'အသစ်ဆုံး' : 'Newest'}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded text-[10px] font-black shadow-2xs">
                              <ArrowUp className="w-3 h-3" />
                              <span>{lang === 'my' ? 'အဟောင်းဆုံး' : 'Oldest'}</span>
                            </span>
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        )}
                      </div>
                    </th>

                    {/* Account / User Column Header with sort toggle */}
                    <th
                      onClick={() => {
                        if (txSortBy === 'user') {
                          setTxSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
                        } else {
                          setTxSortBy('user');
                          setTxSortOrder('asc');
                        }
                      }}
                      className="py-2.5 px-3 cursor-pointer select-none hover:bg-slate-100 transition-colors"
                      title={lang === 'my' ? 'အသုံးပြုသူအလိုက် စီရန် နှိပ်ပါ' : 'Click to sort by user'}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={txSortBy === 'user' ? 'text-indigo-700 font-black' : ''}>{lang === 'my' ? 'အကောင့် / အသုံးပြုသူ' : 'Account / User'}</span>
                        {txSortBy === 'user' ? (
                          <span className="text-indigo-700 font-black text-[10px]">
                            {txSortOrder === 'asc' ? '▲ A-Z' : '▼ Z-A'}
                          </span>
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        )}
                      </div>
                    </th>

                    {/* Category Column Header with sort toggle */}
                    <th
                      onClick={() => {
                        if (txSortBy === 'category') {
                          setTxSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
                        } else {
                          setTxSortBy('category');
                          setTxSortOrder('asc');
                        }
                      }}
                      className="py-2.5 px-3 cursor-pointer select-none hover:bg-slate-100 transition-colors"
                      title={lang === 'my' ? 'ကဏ္ဍအလိုက် စီရန် နှိပ်ပါ' : 'Click to sort by category'}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={txSortBy === 'category' ? 'text-indigo-700 font-black' : ''}>{lang === 'my' ? 'ကဏ္ဍ' : 'Category'}</span>
                        {txSortBy === 'category' ? (
                          <span className="text-indigo-700 font-black text-[10px]">
                            {txSortOrder === 'asc' ? '▲ A-Z' : '▼ Z-A'}
                          </span>
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        )}
                      </div>
                    </th>

                    <th className="py-1.5 px-2 sm:py-2.5 sm:px-3">{lang === 'my' ? 'မှတ်ချက်' : 'Note / Description'}</th>

                    {/* Amount Column Header with sort toggle */}
                    <th
                      onClick={() => {
                        if (txSortBy === 'amount') {
                          setTxSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
                        } else {
                          setTxSortBy('amount');
                          setTxSortOrder('desc');
                        }
                      }}
                      className="py-2.5 px-3 text-right cursor-pointer select-none hover:bg-slate-100 transition-colors"
                      title={lang === 'my' ? 'ငွေပမာဏအလိုက် စီရန် နှိပ်ပါ' : 'Click to sort by amount'}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span className={txSortBy === 'amount' ? 'text-indigo-700 font-black' : ''}>{lang === 'my' ? 'ငွေပမာဏ (ကျပ်)' : 'Amount (MMK)'}</span>
                        {txSortBy === 'amount' ? (
                          txSortOrder === 'desc' ? (
                            <span className="inline-flex items-center gap-0.5 text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded text-[10px] font-black shadow-2xs">
                              <ArrowDown className="w-3 h-3" />
                              <span>{lang === 'my' ? 'အများဆုံး' : 'Highest'}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded text-[10px] font-black shadow-2xs">
                              <ArrowUp className="w-3 h-3" />
                              <span>{lang === 'my' ? 'အနည်းဆုံး' : 'Lowest'}</span>
                            </span>
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        )}
                      </div>
                    </th>
                    <th className="py-1.5 px-2 sm:py-2.5 sm:px-3 text-right">{lang === 'my' ? 'လုပ်ဆောင်ချက်' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {(() => {
                    if (sortedModalTxs.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                            {isTxFilterActive
                              ? (lang === 'my' ? 'စစ်ထုတ်မှုနှင့် ကိုက်ညီသော မှတ်တမ်း မရှိပါ' : 'No records match the filters.')
                              : (lang === 'my' ? 'စာရင်းမှတ်တမ်း မရှိပါ (သို့မဟုတ်) ဖျက်ပြီးပါပြီ။' : 'No records found.')}
                          </td>
                        </tr>
                      );
                    }

                    return sortedModalTxs.slice(0, modalVisibleCount).map((tx) => {
                      const uId = (tx as any)._userId || tx.userId;
                      const matchedUser = usersList.find((u) => u.id === uId);
                      const userDisplay = matchedUser?.email || (uId ? `UID: ${uId.slice(0, 8)}...` : 'Unknown User');

                      const catObj = allMergedCategories.find((c) => c.id === tx.category || c.name === tx.category || c.nameEn === tx.category);
                      const catName = catObj ? catObj.name : tx.category || 'Other';
                      const subCatName = (tx as any).subCategory;

                      return (
                        <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px] whitespace-nowrap">
                            {tx.date || (tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('en-GB') : '—')}
                          </td>
                          <td className="py-1.5 px-2 sm:py-2.5 sm:px-3">
                            <div className="font-semibold text-slate-800 truncate max-w-[160px]" title={userDisplay}>
                              {userDisplay}
                            </div>
                          </td>
                          <td className="py-1.5 px-2 sm:py-2.5 sm:px-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 font-semibold text-slate-700 text-[11px]">
                              {catName}
                            </span>
                            {subCatName && (
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                ↳ {subCatName}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 font-medium max-w-[200px] truncate" title={tx.note}>
                            {tx.note || <span className="text-slate-400 italic">—</span>}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                            <span className={tx.type === 'income' ? 'text-emerald-600' : 'text-slate-800'} title={formatMMK(tx.amount || 0)}>
                              {tx.type === 'income' ? '+' : '-'}{formatLakhs(tx.amount || 0, lang)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap sticky right-0 bg-white shadow-[-4px_0_8px_rgba(0,0,0,0.05)]">
                            <button
                              type="button"
                              disabled={isDeletingTxId === tx.id}
                              onClick={() => handleDeleteSystemTx(tx)}
                              className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 rounded-lg transition-colors cursor-pointer text-xs font-bold inline-flex items-center gap-1 disabled:opacity-50"
                              title={lang === 'my' ? 'ဤစာရင်းကို အပြီးတိုင် ဖျက်မည်' : 'Delete this record'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="text-[10px]">{lang === 'my' ? 'ဖျက်မည်' : 'Delete'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
              {sortedModalTxs.length > modalVisibleCount && (
                <div className="p-3 text-center">
                  <button
                    type="button"
                    onClick={() => setModalVisibleCount((c) => c + 100)}
                    className="px-4 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl transition-colors cursor-pointer text-xs"
                  >
                    {lang === 'my' ? 'နောက်ထပ် 100 ပြမည်' : 'Show 100 more'}
                  </button>
                </div>
              )}
            </div>

            {/* [v7.5.64] Mobile record cards — same filtered + sorted list as the table above. */}
            {(() => {
              if (sortedModalTxs.length === 0) {
                return (
                  <div className="sm:hidden py-12 text-center text-slate-400 font-medium text-xs flex-1">
                    {isTxFilterActive
                      ? (lang === 'my' ? 'စစ်ထုတ်မှုနှင့် ကိုက်ညီသော မှတ်တမ်း မရှိပါ' : 'No records match the filters.')
                      : (lang === 'my' ? 'စာရင်းမှတ်တမ်း မရှိပါ (သို့မဟုတ်) ဖျက်ပြီးပါပြီ။' : 'No records found.')}
                  </div>
                );
              }
              return (
                <div className="sm:hidden space-y-2 overflow-y-auto flex-1">
                  {sortedModalTxs.slice(0, modalVisibleCount).map((tx) => {
                    const uId = (tx as any)._userId || tx.userId;
                    const matchedUser = usersList.find((u) => u.id === uId);
                    const userDisplay = matchedUser?.email || (uId ? `UID: ${uId.slice(0, 8)}...` : 'Unknown User');
                    const catObj = allMergedCategories.find((c) => c.id === tx.category || c.name === tx.category || c.nameEn === tx.category);
                    const catName = catObj ? catObj.name : tx.category || 'Other';
                    const subCatName = (tx as any).subCategory;
                    return (
                      <div key={tx.id} className="border border-slate-200 rounded-2xl bg-white p-3 space-y-1.5 shadow-xs text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-slate-600 text-[11px] whitespace-nowrap">
                            {tx.date || (tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('en-GB') : '—')}
                          </span>
                          <span className={`font-mono font-bold whitespace-nowrap ${tx.type === 'income' ? 'text-emerald-600' : 'text-slate-800'}`} title={formatMMK(tx.amount || 0)}>
                            {tx.type === 'income' ? '+' : '-'}{formatLakhs(tx.amount || 0, lang)}
                          </span>
                        </div>
                        <div className="font-semibold text-slate-800 break-all">{userDisplay}</div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 font-semibold text-slate-700 text-[11px]">
                            {catName}
                          </span>
                          {subCatName && (
                            <span className="text-[10px] text-slate-400">↳ {subCatName}</span>
                          )}
                        </div>
                        <div className="text-slate-700 italic break-words">
                          {tx.note || <span className="text-slate-400 italic">—</span>}
                        </div>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            disabled={isDeletingTxId === tx.id}
                            onClick={() => handleDeleteSystemTx(tx)}
                            className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 rounded-lg transition-colors cursor-pointer text-xs font-bold inline-flex items-center gap-1 whitespace-nowrap disabled:opacity-50"
                            title={lang === 'my' ? 'ဤစာရင်းကို အပြီးတိုင် ဖျက်မည်' : 'Delete this record'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="text-[10px]">{lang === 'my' ? 'ဖျက်မည်' : 'Delete'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {sortedModalTxs.length > modalVisibleCount && (
                    <button
                      type="button"
                      onClick={() => setModalVisibleCount((c) => c + 100)}
                      className="w-full px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl transition-colors cursor-pointer text-xs"
                    >
                      {lang === 'my' ? 'နောက်ထပ် 100 ပြမည်' : 'Show 100 more'}
                    </button>
                  )}
                </div>
              );
            })()}

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500 shrink-0">
              <div className="min-w-0">
                {isTxFilterActive
                  ? (lang === 'my'
                    ? `ပြသနေသည် ${modalFilteredTxs.length} / စုစုပေါင်း ${effectiveTransactions.length} ခု`
                    : `Showing ${modalFilteredTxs.length} of ${effectiveTransactions.length} records`)
                  : (lang === 'my'
                    ? `စုစုပေါင်း စနစ်တွင်း စာရင်း ${effectiveTransactions.length} ခု တိုက်ရိုက်ချိတ်ဆက်ထားသည်`
                    : `Total ${effectiveTransactions.length} database records tracked`)}
                {/* [v7.5.64 C-26] Shared-wallet balances refresh only when the
                    owner next opens the app (boot reconcile). */}
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {lang === 'my'
                    ? 'Shared ပိုက်ဆံအိတ်ပါတဲ့ မှတ်တမ်းဖျက်ရင် လက်ကျန်က ပိုင်ရှင် အက်ပ်ပြန်ဖွင့်မှ အပ်ဒိတ်ဖြစ်ပါမယ်'
                    : 'Shared-wallet balances refresh when the owner next opens the app.'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTxManagerModal(false)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer shrink-0 whitespace-nowrap"
              >
                {lang === 'my' ? 'ပိတ်မည်' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Notification Toast */}
      {actionSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-emerald-600 text-white font-bold text-xs rounded-2xl shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle className="w-4 h-4" />
          <span>{actionSuccessToast}</span>
        </div>
      )}
    </div>
  );
};