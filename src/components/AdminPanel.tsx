import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  collection,
  collectionGroup,
  query,
  getDocs,
  getDoc,
  doc,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db, defaultDb, safeSetDoc, safeUpdateDoc, safeDeleteDoc, trackFirestoreReads } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { AdminSystemMessage, AdminMessageType, ContactInfo, VisitorDoc, Transaction, Wallet, Category } from '../types';
import { INITIAL_CATEGORIES } from '../data/initialData';
import { fetchContactInfo, saveContactInfo, DEFAULT_CONTACT_INFO } from '../lib/contactInfo';
import { subscribeVisitors, getCountryFlag, deleteVisitorDoc } from '../lib/analyticsService';
import { QuotaDashboard } from './QuotaDashboard';
import {
  X,
  Copy,
  CheckCircle,
  Trash2,
  Plus,
  RefreshCw,
  Key,
  Megaphone,
  AlertTriangle,
  FileText,
  Edit2,
  Check,
  Users,
  Search,
  Clock,
  Sparkles,
  ShieldCheck,
  UserCheck,
  Crown,
  Phone,
  Send,
  CreditCard,
  Save,
  Globe,
  Smartphone,
  Monitor,
  Eye,
  MapPin,
  Activity,
  TrendingUp,
  BarChart3,
  PieChart,
  Wallet as WalletIcon,
  Lock,
  Layers,
  Zap,
  CheckCircle2,
  ArrowUpRight,
  ShieldAlert,
  Sliders,
  DollarSign,
  Flame,
  HardDrive,
  Database,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

interface ActivationCode {
  code: string;
  months: number;
  isUsed: boolean;
  usedBy?: string;
  usedEmail?: string;
  usedAt?: string;
  createdAt: string;
  createdBy: string;
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

  // Visitor & Analytics state
  const [visitorsList, setVisitorsList] = useState<VisitorDoc[]>([]);
  const [visitorFilter, setVisitorFilter] = useState<'all' | 'guest' | 'member' | 'active'>('all');
  const [visitorSearch, setVisitorSearch] = useState('');

  // Codes & Users combined state
  const [codes, setCodes] = useState<ActivationCode[]>([]);
  const [usersList, setUsersList] = useState<UserDoc[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState<number>(1);
  const [generateCount, setGenerateCount] = useState<number>(1);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'used' | 'available' | 'users'>('all');

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

  // Contact Info state
  const [contactForm, setContactForm] = useState<ContactInfo>(DEFAULT_CONTACT_INFO);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactSaving, setContactSaving] = useState(false);
  const [contactSuccessMsg, setContactSuccessMsg] = useState('');

  // Overview Benchmark Mode
  const [overviewBenchmarkMode, setOverviewBenchmarkMode] = useState<'category' | 'subcategory'>('category');
  const [selectedBenchmarkCat, setSelectedBenchmarkCat] = useState<string>('all');

  // System Transactions & Data Management Modal State
  const [showTxManagerModal, setShowTxManagerModal] = useState(false);
  const [selectedFilterCategory, setSelectedFilterCategory] = useState<string>('all');
  const [selectedFilterUser, setSelectedFilterUser] = useState<string>('all');
  const [searchTxQuery, setSearchTxQuery] = useState('');
  const [txSortBy, setTxSortBy] = useState<'date' | 'amount' | 'user' | 'category'>('date');
  const [txSortOrder, setTxSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isDeletingTxId, setIsDeletingTxId] = useState<string | null>(null);
  const [isPurgingBatch, setIsPurgingBatch] = useState(false);
  const [actionSuccessToast, setActionSuccessToast] = useState<string>('');

  // System-wide aggregated data across ALL users
  const [systemTransactions, setSystemTransactions] = useState<Transaction[]>([]);
  const [systemWallets, setSystemWallets] = useState<Wallet[]>([]);
  const [systemCategories, setSystemCategories] = useState<Category[]>([]);
  const [systemDataLoading, setSystemDataLoading] = useState(false);

  // Function to load all system-wide data (transactions, wallets, categories) across all users
  const loadSystemWideData = useCallback(async () => {
    setSystemDataLoading(true);
    try {
      // 1. Query collection groups for global data across all user documents
      let allTxs: Transaction[] = [];
      let allWallets: Wallet[] = [];
      let allCats: Category[] = [];

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
        console.warn('collectionGroup transactions error:', cgErr);
      }

      try {
        const walletsSnap = await getDocs(query(collectionGroup(db, 'wallets')));
        trackFirestoreReads('wallets', walletsSnap.docs.length || 1);
        allWallets = walletsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as Wallet));
      } catch (cgErr) {
        console.warn('collectionGroup wallets error:', cgErr);
      }

      try {
        const catsSnap = await getDocs(query(collectionGroup(db, 'categories')));
        trackFirestoreReads('categories', catsSnap.docs.length || 1);
        allCats = catsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as Category));
      } catch (cgErr) {
        console.warn('collectionGroup categories error:', cgErr);
      }

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
              return userWlSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Wallet));
            } catch {
              return [];
            }
          });
          const perUserCatPromises = usersDocs.map(async (uDoc) => {
            try {
              const userCatSnap = await getDocs(collection(db, 'users', uDoc.id, 'categories'));
              return userCatSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Category));
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
          const txMap = new Map<string, Transaction>();
          [...allTxs, ...flattenedTxs].forEach((t) => txMap.set(t.id, t));
          allTxs = Array.from(txMap.values());

          const walletMap = new Map<string, Wallet>();
          [...allWallets, ...flattenedWallets].forEach((w) => walletMap.set(w.id, w));
          allWallets = Array.from(walletMap.values());

          const catMap = new Map<string, Category>();
          [...allCats, ...flattenedCats].forEach((c) => catMap.set(c.id, c));
          allCats = Array.from(catMap.values());
        }
      } catch (userIterErr) {
        console.warn('Per-user subcollections fallback notice:', userIterErr);
      }

      setSystemTransactions(allTxs);
      setSystemWallets(allWallets);
      setSystemCategories(allCats);
    } catch (err) {
      console.error('Error fetching system-wide aggregated data:', err);
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
          }).catch((err) => console.warn('Admin bootstrap err:', err));
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
      setUsersList(Array.from(mergedMap.values()));
    };

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
    });







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

  // Active dataset of transactions across the entire system (Default sorted newest first by date)
  const effectiveTransactions = useMemo(() => {
    const list = systemTransactions.length > 0 ? systemTransactions : (transactions || []);
    return [...list].sort((a, b) => {
      const dateA = a.date || (a.createdAt ? new Date(a.createdAt).toISOString().split('T')[0] : '');
      const dateB = b.date || (b.createdAt ? new Date(b.createdAt).toISOString().split('T')[0] : '');
      if (dateA !== dateB) {
        return dateB.localeCompare(dateA); // Newest first
      }
      const timeA = typeof a.createdAt === 'number' ? a.createdAt : new Date(a.createdAt || a.date).getTime() || 0;
      const timeB = typeof b.createdAt === 'number' ? b.createdAt : new Date(b.createdAt || b.date).getTime() || 0;
      return timeB - timeA;
    });
  }, [systemTransactions, transactions]);

  // Active dataset of wallets across the entire system
  const effectiveWallets = useMemo(() => {
    if (systemWallets.length > 0) return systemWallets;
    return wallets || [];
  }, [systemWallets, wallets]);

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

    if (totalExpense <= 0) {
      // Fallback display with registered expense categories
      const expCats = allMergedCategories.filter((c) => c.type === 'expense').slice(0, 6);
      if (expCats.length > 0) {
        return expCats.map((cat, i) => ({
          id: cat.id,
          label: lang === 'my' ? cat.name : (cat.nameEn || cat.name),
          amount: 0,
          pct: 0,
          color: colors[i % colors.length],
        }));
      }
      return [
        { id: 'cat_food', label: lang === 'my' ? '🍔 အစားအသောက်နှင့် ကုန်စုံ' : 'Food & Groceries', amount: 0, pct: 0, color: colors[0] },
        { id: 'cat_transport', label: lang === 'my' ? '🚗 ခရီးစရိတ်နှင့် လမ်းစရိတ်' : 'Transportation & Travel', amount: 0, pct: 0, color: colors[1] },
        { id: 'cat_vehicle', label: lang === 'my' ? '🚘 ယာဉ်စီမံခန့်ခွဲမှု' : 'Vehicle Management', amount: 0, pct: 0, color: colors[2] },
        { id: 'cat_utilities', label: lang === 'my' ? '🏠 အိမ်စရိတ်နှင့် ဘေလ်များ' : 'Bills & Utilities', amount: 0, pct: 0, color: colors[3] },
        { id: 'cat_shopping', label: lang === 'my' ? '🛍️ ဈေးဝယ်ခြင်း / အဝတ်အထည်' : 'Shopping', amount: 0, pct: 0, color: colors[4] },
      ];
    }

    const catSums: { [catId: string]: number } = {};
    expenseTxs.forEach((t) => {
      const rawCat = t.category || (t as any).categoryId || 'other';
      const matchedCat = allMergedCategories.find((c) => c.id === rawCat || c.name === rawCat || c.nameEn === rawCat);
      const groupKey = matchedCat ? matchedCat.id : rawCat;
      catSums[groupKey] = (catSums[groupKey] || 0) + (Number(t.amount) || 0);
    });

    return Object.entries(catSums)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
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
  }, [effectiveTransactions, allMergedCategories, lang]);

  // Live Sub-Category Spending Breakdown computed from ALL users' transactions
  const liveSubCategoryBenchmarks = useMemo(() => {
    const expenseTxs = (effectiveTransactions || []).filter((t) => t.type === 'expense');
    const colorList = ['amber', 'sky', 'indigo', 'pink', 'emerald', 'violet', 'cyan'];

    if (expenseTxs.length === 0) {
      return [
        {
          catKey: 'cat_food',
          category: lang === 'my' ? '🍔 အစားအသောက်နှင့် ကုန်စုံ (Food & Groceries)' : 'Food & Groceries',
          color: 'amber',
          totalAmount: 0,
          subcats: [
            { name: lang === 'my' ? 'မနက်စာ' : 'Breakfast', amount: 0, pct: 0, share: '0%' },
            { name: lang === 'my' ? 'နေ့လယ်စာ / ညနေစာ' : 'Lunch & Dinner', amount: 0, pct: 0, share: '0%' },
            { name: lang === 'my' ? 'စည်ပင်ဈေးဝယ် / ကုန်စုံ' : 'Fresh Market & Groceries', amount: 0, pct: 0, share: '0%' },
          ],
        },
      ];
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
      } else if (t.note) {
        subName = t.note.length > 25 ? t.note.slice(0, 25) + '...' : t.note;
      }

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
        const subcats = Array.from(grp.subcatMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([subName, amt]) => {
            const pct = grp.totalAmount > 0 ? Math.round((amt / grp.totalAmount) * 100) : 0;
            return {
              name: subName,
              amount: amt,
              pct,
              share: `${pct}%`,
            };
          });

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

    if (!effectiveWallets || effectiveWallets.length === 0) {
      return [
        { code: 'MMK', flag: '🇲🇲', pct: 100, count: 1 },
        { code: 'USD', flag: '🇺🇸', pct: 0, count: 0 },
        { code: 'THB', flag: '🇹🇭', pct: 0, count: 0 },
      ];
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

  const loadContactInfoData = async () => {
    setContactLoading(true);
    try {
      const data = await fetchContactInfo();
      setContactForm(data);
    } catch (err) {
      console.error('Error loading contact info:', err);
    } finally {
      setContactLoading(false);
    }
  };

  const handleSaveContactInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactSaving(true);
    setContactSuccessMsg('');
    try {
      await saveContactInfo(contactForm);
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
      setUsersList(Array.from(mergedMap.values()));

      // 3. Fetch system-wide transactions, wallets, and categories across all users
      await loadSystemWideData();
    } catch (err) {
      console.error('Error fetching admin data:', err);
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
    setDataLoading(true);
    try {
      // Ensure admin doc exists in Firestore before writing activation codes
      const adminRef = doc(db, 'admins', user.uid);
      const adminSnap = await getDoc(adminRef);
      if (!adminSnap.exists() && user.email === MASTER_ADMIN_EMAIL) {
        await safeSetDoc(adminRef, {
          email: user.email,
          createdAt: new Date().toISOString(),
        });
      }

      for (let i = 0; i < generateCount; i++) {
        const codeString = generateRandomCode();
        const newCode: ActivationCode = {
          code: codeString,
          months: selectedMonths,
          isUsed: false,
          createdAt: new Date().toISOString(),
          createdBy: user.uid,
        };
        await safeSetDoc(doc(db, 'activationCodes', codeString), newCode);
      }
      await fetchAllData();
      alert(lang === 'my' ? `${generateCount} ကုဒ် အသစ်အောင်မြင်စွာ ထုတ်ပြီးပါပြီ ✓` : `Generated ${generateCount} new code(s) successfully ✓`);
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
    if (
      window.confirm(
        lang === 'my'
          ? `ကုဒ် "${codeId}" ကို အပြီးတိုင် ဖျက်မည်လား။`
          : `Delete code "${codeId}" permanently?`
      )
    ) {
      setDataLoading(true);
      try {
        await safeDeleteDoc(doc(db, 'activationCodes', codeId));
        setCodes(codes.filter((c) => c.code !== codeId));
      } catch (err) {
        console.error('Failed to delete code', err);
      }
      setDataLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
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

  // State for Duration Selection Modal when Granting Premium directly
  const [selectedUserForPlan, setSelectedUserForPlan] = useState<UserDoc | null>(null);

  // Quick toggle / Grant plan with explicit duration selection
  const handleGrantPlanWithDuration = async (u: UserDoc, monthsDuration: number) => {
    setSelectedUserForPlan(null);
    setDataLoading(true);
    try {
      const userRef = doc(db, 'users', u.id);
      if (monthsDuration === 0) {
        // Downgrade to Free
        await safeSetDoc(
          userRef,
          {
            plan: 'free',
            premiumExpiresAt: null,
            premiumMonths: 0,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        await fetchAllData();
        alert(lang === 'my' ? 'Free Plan သို့ ပြောင်းလဲပြီးပါပြီ ✓' : 'Downgraded to Free Plan ✓');
      } else {
        const now = new Date();
        // Calculate expiration date based on selected months
        // If 999 months (Lifetime), set to ~99 years
        const expDays = monthsDuration === 999 ? 365 * 99 : Math.round(monthsDuration * 30.5);
        const expiresAt = new Date(now.getTime() + expDays * 24 * 60 * 60 * 1000).toISOString();
        const durationLabel =
          monthsDuration === 999
            ? lang === 'my' ? 'တစ်သက်လုံး (Lifetime)' : 'Lifetime'
            : monthsDuration >= 12
            ? `${Math.round(monthsDuration / 12)} နှစ်`
            : `${monthsDuration} လ`;

        await safeSetDoc(
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
        await fetchAllData();
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
      if (editingMsgId) {
        const msgRef = doc(db, 'systemMessages', editingMsgId);
        await safeUpdateDoc(msgRef, {
          title: msgTitle.trim(),
          content: msgContent.trim(),
          type: msgType,
          isMarquee: msgIsMarquee,
          isActive: msgIsActive,
          updatedAt: now,
        });
      } else {
        const msgRef = doc(collection(db, 'systemMessages'));
        await safeSetDoc(msgRef, {
          title: msgTitle.trim(),
          content: msgContent.trim(),
          type: msgType,
          isMarquee: msgIsMarquee,
          isActive: msgIsActive,
          createdAt: now,
          authorEmail: user?.email || 'admin',
        });
      }

      setMsgTitle('');
      setMsgContent('');
      setEditingMsgId(null);
      await fetchMessages();
    } catch (err) {
      console.error('Error saving system message:', err);
      alert('Failed to save message');
    }
    setSubmittingMsg(false);
  };

  const handleDeleteMessage = async (id: string) => {
    if (window.confirm(lang === 'my' ? 'ဤမက်ဆေ့ခ်ျကို ဖျက်မည်လား။' : 'Delete this message?'))
      return;
    try {
      await safeDeleteDoc(doc(db, 'systemMessages', id));
      setMessages(messages.filter((m) => m.id !== id));
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  };

  const handleEditClick = (m: AdminSystemMessage) => {
    setEditingMsgId(m.id);
    setMsgTitle(m.title);
    setMsgContent(m.content);
    setMsgType(m.type);
    setMsgIsMarquee(m.isMarquee);
    setMsgIsActive(m.isActive);
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
    try {
      const msgRef = doc(db, 'systemMessages', m.id);
      await safeUpdateDoc(msgRef, {
        isActive: !m.isActive,
        updatedAt: new Date().toISOString(),
      });
      setMessages(
        messages.map((item) => (item.id === m.id ? { ...item, isActive: !item.isActive } : item))
      );
    } catch (err) {
      console.error('Error toggling active status:', err);
    }
  };

  const handleToggleMarquee = async (m: AdminSystemMessage) => {
    try {
      const msgRef = doc(db, 'systemMessages', m.id);
      await safeUpdateDoc(msgRef, {
        isMarquee: !m.isMarquee,
        updatedAt: new Date().toISOString(),
      });
      setMessages(
        messages.map((item) => (item.id === m.id ? { ...item, isMarquee: !item.isMarquee } : item))
      );
    } catch (err) {
      console.error('Error toggling marquee:', err);
    }
  };

  // Filtered Codes
  const filteredCodes = codes.filter((c) => {
    const assigned = getAssignedUser(c);
    const matchesSearch =
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (assigned?.email && assigned.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (assigned?.id && assigned.id.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === 'used') return c.isUsed;
    if (statusFilter === 'available') return !c.isUsed;
    return true;
  });

  // Filtered Users
  const filteredUsers = usersList.filter((u) => {
    const matchesSearch =
      (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      u.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.premiumCodeUsed && u.premiumCodeUsed.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesSearch;
  });

  // Summary Metrics
  const totalCodesCount = codes.length;
  const usedCodesCount = codes.filter((c) => c.isUsed).length;
  const availableCodesCount = totalCodesCount - usedCodesCount;
  const premiumUsersCount = usersList.filter((u) => u.plan === 'premium').length;

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
    return !v.isGuest;
  };

  const handleDeleteVisitor = async (visitorId: string, name: string) => {
    const confirmMsg = lang === 'my'
      ? `"${name}" ၏ ဝင်ရောက်မှု မှတ်တမ်းကို ဖျက်ရန် သေချာပါသလား?`
      : `Are you sure you want to delete visitor log for "${name}"?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await deleteVisitorDoc(visitorId);
      setVisitorsList((prev) => prev.filter((v) => v.id !== visitorId));
    } catch (err) {
      console.error('Failed to delete visitor:', err);
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
          visitCount: Math.max(existing.visitCount || 1, v.visitCount || 1) + 1,
          firstSeenAt: Math.min(existing.firstSeenAt || existing.lastActiveAt, v.firstSeenAt || v.lastActiveAt),
          lastActiveAt: Math.max(existing.lastActiveAt, v.lastActiveAt),
          country: existing.country || v.country,
          countryCode: existing.countryCode || v.countryCode,
          city: existing.city || v.city,
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
    let mobileCount = 0;
    let desktopCount = 0;

    deduplicatedVisitors.forEach((v) => {
      const countryName = v.country || 'Myanmar';
      const countryCode = v.countryCode || 'MM';

      if (!countriesMap[countryName]) {
        countriesMap[countryName] = { code: countryCode, count: 0 };
      }
      countriesMap[countryName].count += 1;

      if (v.device === 'mobile') mobileCount += 1;
      else desktopCount += 1;
    });

    const countriesSorted = Object.entries(countriesMap)
      .map(([country, data]) => ({ country, code: data.code, count: data.count }))
      .sort((a, b) => b.count - a.count);

    return {
      total,
      guestCount,
      registeredCount,
      countriesSorted,
      mobileCount,
      desktopCount,
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

  // Delete a single transaction directly from Firestore across any user account
  const handleDeleteSystemTx = async (tx: Transaction) => {
    const docPath = (tx as any)._docPath || ((tx as any)._userId ? `users/${(tx as any)._userId}/transactions/${tx.id}` : tx.userId ? `users/${tx.userId}/transactions/${tx.id}` : null);
    if (!docPath) {
      alert(lang === 'my' ? 'မှတ်တမ်းတည်နေရာ ရှာမတွေ့ပါ။' : 'Document path not found.');
      return;
    }
    if (!window.confirm(lang === 'my' ? `ဤစာရင်းမှတ်တမ်း "${tx.note || tx.category}" (${(tx.amount || 0).toLocaleString()} MMK) ကို Database ပေါ်မှ အပြီးတိုင် ဖျက်ပစ်ရန် သေချာပါသလား?` : `Delete this record (${(tx.amount || 0).toLocaleString()} MMK) permanently?`)) {
      return;
    }
    try {
      setIsDeletingTxId(tx.id);
      await safeDeleteDoc(doc(db, docPath));
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
    const matched = effectiveTransactions.filter((t) => {
      const rawCat = t.category || (t as any).categoryId || 'other';
      const catObj = allMergedCategories.find((c) => c.id === rawCat || c.name === rawCat || c.nameEn === rawCat);
      const matchedKey = catObj ? catObj.id : rawCat;
      return matchedKey === catKey || rawCat === catKey || rawCat === catLabel;
    });

    if (matched.length === 0) {
      alert(lang === 'my' ? 'ဤကဏ္ဍတွင် ဖျက်ရန် စာရင်းမှတ်တမ်း မရှိပါ။' : 'No records found in this category.');
      return;
    }

    if (!window.confirm(lang === 'my' ? `"${catLabel}" ကဏ္ဍရှိ စာရင်းမှတ်တမ်းပေါင်း ${matched.length} ခုလုံးကို Database မှ အပြီးတိုင် ရှင်းလင်းဖျက်ပစ်ရန် သေချာပါသလား?` : `Purge all ${matched.length} records in "${catLabel}"?`)) {
      return;
    }

    try {
      setIsPurgingBatch(true);
      const deletePromises = matched.map((tx) => {
        const docPath = (tx as any)._docPath || ((tx as any)._userId ? `users/${(tx as any)._userId}/transactions/${tx.id}` : tx.userId ? `users/${tx.userId}/transactions/${tx.id}` : null);
        if (docPath) {
          return safeDeleteDoc(doc(db, docPath));
        }
        return Promise.resolve();
      });
      await Promise.all(deletePromises);
      const matchedIds = new Set(matched.map((t) => t.id));
      setSystemTransactions((prev) => prev.filter((t) => !matchedIds.has(t.id)));
      setActionSuccessToast(lang === 'my' ? `"${catLabel}" ရှိ စာရင်း ${matched.length} ခုကို အောင်မြင်စွာ ရှင်းလင်းပြီးပါပြီ။` : `Purged ${matched.length} records in "${catLabel}".`);
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
    const matched = effectiveTransactions.filter((t) => {
      const uId = (t as any)._userId || t.userId;
      return uId === userId;
    });

    if (!window.confirm(lang === 'my' ? `အကောင့် (${userEmail || userId}) ၏ စာရင်းမှတ်တမ်းပေါင်း ${matched.length} ခုလုံးကို Database မှ အပြီးတိုင် ဖျက်ပစ်ရန် သေချာပါသလား?` : `Purge all ${matched.length} records for ${userEmail || userId}?`)) {
      return;
    }

    try {
      setIsPurgingBatch(true);
      const userTxSnap = await getDocs(collection(db, 'users', userId, 'transactions'));
      const delPromises = userTxSnap.docs.map((d) => safeDeleteDoc(d.ref));
      await Promise.all(delPromises);

      setSystemTransactions((prev) => prev.filter((t) => ((t as any)._userId || t.userId) !== userId));
      setActionSuccessToast(lang === 'my' ? `User ၏ စာရင်းများကို အောင်မြင်စွာ ရှင်းလင်းပြီးပါပြီ။` : `User records cleared successfully.`);
      setTimeout(() => setActionSuccessToast(''), 3000);
    } catch (err: any) {
      console.error('Purge user records error:', err);
      alert((lang === 'my' ? 'ရှင်းလင်း၍ မရပါ: ' : 'Failed to clear: ') + (err?.message || 'Error'));
    } finally {
      setIsPurgingBatch(false);
    }
  };

  // Delete an entire test user document and its subcollections
  const handleDeleteUserAccount = async (userId: string, userEmail: string) => {
    if (!window.confirm(lang === 'my' ? `⚠️ သတိပေးချက်: အကောင့် (${userEmail || userId}) နှင့် ၎င်း၏ ငွေစာရင်း၊ ပိုက်ဆံအိတ် စာရင်းအားလုံးကို Database မှ လုံးဝ ဖျက်ပစ်ရန် သေချာပါသလား?` : `Delete user account (${userEmail || userId}) and all associated data permanently?`)) {
      return;
    }

    try {
      setIsPurgingBatch(true);
      // 1. Purge transactions subcollection
      const txSnap = await getDocs(collection(db, 'users', userId, 'transactions'));
      await Promise.all(txSnap.docs.map((d) => safeDeleteDoc(d.ref)));

      // 2. Purge wallets subcollection
      const wlSnap = await getDocs(collection(db, 'users', userId, 'wallets'));
      await Promise.all(wlSnap.docs.map((d) => safeDeleteDoc(d.ref)));

      // 3. Purge categories subcollection
      const catSnap = await getDocs(collection(db, 'users', userId, 'categories'));
      await Promise.all(catSnap.docs.map((d) => safeDeleteDoc(d.ref)));

      // 4. Delete user document
      await safeDeleteDoc(doc(db, 'users', userId));

      setUsersList((prev) => prev.filter((u) => u.id !== userId));
      setSystemTransactions((prev) => prev.filter((t) => ((t as any)._userId || t.userId) !== userId));
      setActionSuccessToast(lang === 'my' ? `အကောင့် (${userEmail || userId}) ကို Database မှ အပြီးတိုင် ဖျက်ပစ်ပြီးပါပြီ။` : `User deleted permanently.`);
      setTimeout(() => setActionSuccessToast(''), 4000);
    } catch (err: any) {
      console.error('Delete user error:', err);
      alert((lang === 'my' ? 'အကောင့်ဖျက်၍ မရပါ: ' : 'Failed to delete user: ') + (err?.message || 'Error'));
    } finally {
      setIsPurgingBatch(false);
    }
  };

  if (!isOpen || !isAdmin) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn overflow-hidden">
      <div className="bg-white rounded-3xl max-w-5xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 relative max-h-[94vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 shrink-0">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-black text-slate-800 tracking-tight">
                Admin Control Center
              </h2>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 inline-flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Super Admin
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {lang === 'my'
                ? 'အသုံးပြုသူများနှင့် ပရီမီယမ် ကုဒ်များ စီမံခန့်ခွဲခြင်း နှင့် စာတန်းပြေး ကြေညာချက်များ ထုတ်လွှင့်ခြင်း'
                : 'Unified users and premium codes tracking with system broadcast control'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors self-end sm:self-auto cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Unified 6 Tabs Navigation */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-3 pb-2 shrink-0 border-b border-slate-100">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer text-center ${
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
            onClick={() => setActiveTab('quota')}
            className={`flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer text-center relative ${
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
            onClick={() => setActiveTab('users_codes')}
            className={`flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer text-center ${
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
            onClick={() => setActiveTab('broadcast')}
            className={`flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer text-center ${
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
            onClick={() => setActiveTab('contact_info')}
            className={`flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer text-center ${
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
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer text-center ${
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

        {/* Diagnostic/Bootstrap banner if codes or users is empty but we are on the users_codes tab */}
        {activeTab === 'users_codes' && codes.length === 0 && usersList.length === 0 && (
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
                    await safeSetDoc(adminRef, {
                      email: user?.email,
                      role: 'admin',
                      createdAt: new Date().toISOString(),
                    });
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
          <div className="flex-1 overflow-y-auto pt-3 space-y-4 pr-1">
            {/* Privacy Architecture Highlight Card */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 shadow-md border border-indigo-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-sm text-white">
                      {lang === 'my' ? '🛡️ Privacy-First Zero-Trust Architecture' : '🛡️ Zero-Trust Privacy Protected'}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold font-mono">
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
                disabled={dataLoading}
                className="self-end sm:self-auto px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-xl transition-colors flex items-center gap-1.5 text-xs disabled:opacity-50 cursor-pointer shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${dataLoading ? 'animate-spin' : ''}`} />
                {lang === 'my' ? 'ဒေတာ အသစ်ယူမည်' : 'Refresh'}
              </button>
            </div>

            {/* Core KPI Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Total Registered Accounts */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[11px] font-bold uppercase tracking-wider">
                    {lang === 'my' ? 'အသုံးပြုသူ စုစုပေါင်း' : 'Total Registered'}
                  </span>
                  <Users className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-2xl font-black text-slate-900 font-mono">
                  {usersList.length}
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  {lang === 'my'
                    ? `Free: ${Math.max(0, usersList.length - premiumUsersCount)} | VIP: ${premiumUsersCount}`
                    : `Free: ${Math.max(0, usersList.length - premiumUsersCount)} | VIP: ${premiumUsersCount}`}
                </div>
              </div>

              {/* Premium Adoption Rate */}
              <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200 rounded-2xl p-4 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-amber-800">
                  <span className="text-[11px] font-bold uppercase tracking-wider">
                    {lang === 'my' ? 'Premium အချိုးအစား' : 'Premium Share'}
                  </span>
                  <Crown className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-2xl font-black text-amber-900 font-mono">
                  {usersList.length > 0
                    ? `${Math.round((premiumUsersCount / usersList.length) * 100)}%`
                    : '0%'}
                </div>
                <div className="text-[11px] text-amber-700 font-medium">
                  {premiumUsersCount} {lang === 'my' ? 'ဦး Premium သုံးနေ' : 'active premium users'}
                </div>
              </div>

              {/* Activation Codes Status */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[11px] font-bold uppercase tracking-wider">
                    {lang === 'my' ? 'လိုင်စင် ကုဒ်များ' : 'Activation Codes'}
                  </span>
                  <Key className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-black text-slate-900 font-mono">
                  {totalCodesCount}
                </div>
                <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                  <span>Used: {usedCodesCount}</span>
                  <span className="text-slate-300">•</span>
                  <span>Avail: {availableCodesCount}</span>
                </div>
              </div>

              {/* Tracked Visitors & Sessions */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[11px] font-bold uppercase tracking-wider">
                    {lang === 'my' ? 'ဝင်ရောက်ကြည့်ရှုမှု' : 'Total Sessions'}
                  </span>
                  <Activity className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-2xl font-black text-slate-900 font-mono">
                  {analyticsStats.total}
                </div>
                <div className="text-[11px] text-purple-700 font-medium">
                  {analyticsStats.countriesSorted.length} {lang === 'my' ? 'နိုင်ငံမှ ဝင်ရောက်' : 'countries recorded'}
                </div>
              </div>
            </div>

            {/* [QUOTA-GUARD v6.1.2] Per-User Financial Summary */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                    {lang === 'my' ? '👥 အသုံးပြုစူမ်ာအလိုက် ဝင်ငွေ/ထွက်ငွေ အနှစ်ချုပ်' : 'Per-User Income / Expense Summary'}
                  </h4>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  {usersList.length} {lang === 'my' ? 'အကောင်' : 'accounts'}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-extrabold text-[10px]">
                      <th className="py-2 px-3">User</th>
                      <th className="py-2 px-3 text-right">Income</th>
                      <th className="py-2 px-3 text-right">Expense</th>
                      <th className="py-2 px-3 text-right">Net</th>
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
                    ) : (
                      usersList.map((u) => {
                        const userTxs = effectiveTransactions.filter((t) => ((t as any)._userId || t.userId) === u.id);
                        const income = userTxs.filter((t) => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
                        const expense = userTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);
                        const net = income - expense;
                        return (
                          <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-800 truncate max-w-[200px]">
                                {u.displayName || (u.email ? u.email.split('@')[0] : 'User')}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]">
                                {u.email || u.id}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-bold whitespace-nowrap">
                              +{income.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-rose-700 font-bold whitespace-nowrap">
                              -{expense.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap text-slate-800">
                              {net >= 0 ? '+' : ''}{net.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                              {userTxs.length}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
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
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-700">
                          <span className={`w-1.5 h-1.5 rounded-full bg-emerald-500 ${systemDataLoading ? 'animate-ping' : 'animate-pulse'}`} />
                          {systemDataLoading
                            ? (lang === 'my' ? 'စုစည်းနေဆဲ...' : 'Syncing...')
                            : (lang === 'my' ? 'All Live Sync' : 'All Users Live Sync')}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2.5 pt-1">
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
                            <div className="flex items-center gap-2">
                              {cat.amount > 0 && (
                                <span className="text-[11px] font-mono text-slate-500">
                                  {cat.amount.toLocaleString()} MMK
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
                        className="text-[11px] font-semibold px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
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
                                <span className="text-[10px] font-mono text-indigo-600 font-normal">
                                  {grp.totalAmount.toLocaleString()} MMK
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
                      {effectiveWallets.length} {lang === 'my' ? 'ပိုက်ဆံအိတ် (စနစ်တစ်ခုလုံး)' : 'system wallets'}
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
          </div>
        )}

        {/* TAB 0.5: FIRESTORE QUOTA & CAPACITY DASHBOARD */}
        {activeTab === 'quota' && (
          <div className="flex-1 overflow-y-auto pt-3 space-y-4 pr-1">
            <QuotaDashboard
              lang={lang}
              usersCount={usersList.length}
              transactionsCount={effectiveTransactions.length}
              walletsCount={effectiveWallets.length}
              codesCount={codes.length}
              messagesCount={messages.length}
              visitorsCount={deduplicatedVisitors.length}
              onRefreshData={fetchAllData}
            />
          </div>
        )}

        {/* TAB 1: UNIFIED USERS & PREMIUM CODES */}
        {activeTab === 'users_codes' && (
          <div className="flex-1 overflow-y-auto pt-3 space-y-4 pr-1">
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
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer"
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
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 w-24"
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
              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    lang === 'my'
                      ? 'ကုဒ် သို့မဟုတ် Email ဖြင့် ရှာပါ...'
                      : 'Search by code or user email...'
                  }
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>
            </div>

            {/* UNIFIED TABLE VIEW */}
            {statusFilter !== 'users' ? (
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
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
                        <th className="py-3 px-4 text-right">Actions</th>
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
                                      <span className="text-slate-800">{assigned.email}</span>
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
                                          ? new Date(c.usedAt).toLocaleDateString()
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
                                  <div className="text-slate-400 text-[11px]">
                                    Created {new Date(c.createdAt).toLocaleDateString()}
                                  </div>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCode(c.code)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                    title="Delete Code"
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
            ) : (
              /* USERS DIRECTORY VIEW */
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 uppercase tracking-wider font-extrabold">
                        <th className="py-3 px-4">User Account</th>
                        <th className="py-3 px-4">Current Plan</th>
                        <th className="py-3 px-4">Records & Expenses</th>
                        <th className="py-3 px-4">Expiry Date</th>
                        <th className="py-3 px-4 text-right">Account & Data Actions</th>
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

                          const userTxs = effectiveTransactions.filter((t) => ((t as any)._userId || t.userId) === u.id);
                          const userTxCount = userTxs.length;
                          const userExpenseTotal = userTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);

                          return (
                            <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                              <td className="py-3 px-4">
                                <div className="font-bold text-slate-900">
                                  {u.email || u.displayName || 'Guest User'}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                  UID: {u.id}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                    u.plan === 'premium'
                                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {u.plan === 'premium' && (
                                    <Crown className="w-3 h-3 text-amber-600" />
                                  )}
                                  {u.plan || 'free'}
                                </span>
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
                                    <div className="text-[11px] font-mono text-slate-600 font-bold">
                                      {userExpenseTotal.toLocaleString()} MMK
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                {u.premiumExpiresAt ? (
                                  <div className="space-y-0.5">
                                    <div className="font-semibold text-slate-700">
                                      {new Date(u.premiumExpiresAt).toLocaleDateString()}
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
                              <td className="py-3 px-4 text-right">
                                <div className="inline-flex items-center gap-1.5 justify-end">
                                  {/* View / Manage Transactions for this User */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedFilterUser(u.id);
                                      setSelectedFilterCategory('all');
                                      setShowTxManagerModal(true);
                                    }}
                                    className="p-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                                    title={lang === 'my' ? 'ဤ User ၏ စာရင်းမှတ်တမ်းများကို ကြည့်ရှု/ဖျက်မည်' : 'Inspect user records'}
                                  >
                                    <Sliders className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">{lang === 'my' ? 'စာရင်းများ' : 'Records'}</span>
                                  </button>

                                  {/* Plan Manage */}
                                  <button
                                    type="button"
                                    onClick={() => setSelectedUserForPlan(u)}
                                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                                      u.plan === 'premium'
                                        ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-300'
                                        : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs'
                                    }`}
                                  >
                                    {u.plan === 'premium'
                                      ? lang === 'my'
                                        ? 'Plan'
                                        : 'Plan'
                                      : lang === 'my'
                                      ? '✨ Premium'
                                      : '✨ Grant'}
                                  </button>

                                  {/* Purge user transactions if test account */}
                                  {userTxCount > 0 && (
                                    <button
                                      type="button"
                                      disabled={isPurgingBatch}
                                      onClick={() => handlePurgeUserTransactions(u.id, u.email || u.id)}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                      title={lang === 'my' ? 'ဤ User ၏ စာရင်းအားလုံးကို ရှင်းလင်းမည်' : 'Purge all records of this user'}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
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
            )}
          </div>
        )}

        {/* TAB 2: BROADCAST & MARQUEE ANNOUNCEMENTS */}
        {activeTab === 'broadcast' && (
          <div className="flex-1 overflow-y-auto pt-3 space-y-4 pr-1">
            {/* Create/Edit Broadcast Form */}
            <form
              onSubmit={handleSaveMessage}
              className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3.5"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
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
                    className="text-xs text-rose-600 hover:underline font-bold cursor-pointer"
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
                    value={msgTitle}
                    onChange={(e) => setMsgTitle(e.target.value)}
                    placeholder={
                      lang === 'my'
                        ? 'ဥပမာ - ဗားရှင်းအသစ်ထွက်ရှိပါပြီ / ဆာဗာပြုပြင်ထိန်းသိမ်းမှု'
                        : 'e.g. New Version Released / Maintenance Alert'
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Type Selection */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    {lang === 'my' ? 'အမျိုးအစား (Type)' : 'Message Type'}
                  </label>
                  <select
                    value={msgType}
                    onChange={(e) => setMsgType(e.target.value as AdminMessageType)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer"
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
                  value={msgContent}
                  onChange={(e) => setMsgContent(e.target.value)}
                  placeholder={
                    lang === 'my'
                      ? 'အသုံးပြုသူများထံ ဖော်ပြလိုသော ကြေညာချက် သို့မဟုတ် သတိပေးချက်ကို ရိုက်ထည့်ပါ...'
                      : 'Enter announcement text to be broadcasted to users...'
                  }
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-normal focus:outline-none focus:border-indigo-500"
                />
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
                    {editingMsgId
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
                  Refresh
                </button>
              </div>

              {messages.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 text-xs">
                  {lang === 'my'
                    ? 'ကြေညာချက် မက်ဆေ့ခ်ျများ မရှိသေးပါ။'
                    : 'No broadcast messages found.'}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`bg-white border rounded-2xl p-3.5 sm:p-4 transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        m.isActive
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
                            <span className="capitalize">{m.type}</span>
                          </span>

                          {/* Active / Inactive Badge */}
                          <button
                            type="button"
                            onClick={() => handleToggleActive(m)}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer transition-colors ${
                              m.isActive
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                            }`}
                            title="Click to toggle Active / Inactive"
                          >
                            {m.isActive ? '🟢 Active' : '⚪ Inactive'}
                          </button>

                          {/* Marquee Badge */}
                          <button
                            type="button"
                            onClick={() => handleToggleMarquee(m)}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer transition-colors ${
                              m.isMarquee
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                                : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                            }`}
                            title="Click to toggle Marquee"
                          >
                            {m.isMarquee ? '🏃 Marquee: ON' : 'Static: ON'}
                          </button>

                          <span className="text-[10px] text-slate-400">
                            {new Date(m.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <h5 className="font-bold text-xs sm:text-sm text-slate-800 truncate">
                          {m.title}
                        </h5>
                        <p className="text-xs text-slate-600 line-clamp-2">{m.content}</p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEditClick(m)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMessage(m.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: CONTACT US & PAYMENT CONFIGURATION */}
        {activeTab === 'contact_info' && (
          <div className="flex-1 overflow-y-auto pt-4 space-y-5 pr-1">
            <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
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
                className="p-2 text-sky-700 hover:bg-sky-100 rounded-lg transition-colors cursor-pointer shrink-0"
                title="Reload"
              >
                <RefreshCw className={`w-4 h-4 ${contactLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

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
                  <span>Telegram Admin Contact</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Telegram Username (e.g. @ankhsam or ankhsam)
                    </label>
                    <input
                      type="text"
                      value={contactForm.telegramUsername}
                      onChange={(e) => setContactForm({ ...contactForm, telegramUsername: e.target.value })}
                      placeholder="@ankhsam"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-sky-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Telegram Link (Direct URL)
                    </label>
                    <input
                      type="text"
                      value={contactForm.telegramUrl}
                      onChange={(e) => setContactForm({ ...contactForm, telegramUrl: e.target.value })}
                      placeholder="https://t.me/ankhsam"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-sky-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Direct Phone / Viber Settings */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 pb-2 border-b border-slate-100">
                  <Phone className="w-4 h-4 text-purple-600" />
                  <span>Direct Phone & Viber Support</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Viber / Contact Phone Number
                    </label>
                    <input
                      type="text"
                      value={contactForm.viberPhone || ''}
                      onChange={(e) => setContactForm({ ...contactForm, viberPhone: e.target.value, phone: e.target.value })}
                      placeholder="09777123456"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Account Details */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 pb-2 border-b border-slate-100">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <span>Payment Accounts (KPay & WavePay)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      KPay Account (Phone & Name)
                    </label>
                    <input
                      type="text"
                      value={contactForm.kpayPhone || ''}
                      onChange={(e) => setContactForm({ ...contactForm, kpayPhone: e.target.value })}
                      placeholder="09777123456 (Ngwe Manager Admin)"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      WavePay Account (Phone & Name)
                    </label>
                    <input
                      type="text"
                      value={contactForm.wavePhone || ''}
                      onChange={(e) => setContactForm({ ...contactForm, wavePhone: e.target.value })}
                      placeholder="09777123456 (Ngwe Manager Admin)"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Instructions / Notes */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 pb-2 border-b border-slate-100">
                  <FileText className="w-4 h-4 text-amber-600" />
                  <span>Payment Instructions Note</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Myanmar Note Text
                    </label>
                    <textarea
                      rows={2}
                      value={contactForm.contactNoteMy || ''}
                      onChange={(e) => setContactForm({ ...contactForm, contactNoteMy: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      English Note Text
                    </label>
                    <textarea
                      rows={2}
                      value={contactForm.contactNoteEn || ''}
                      onChange={(e) => setContactForm({ ...contactForm, contactNoteEn: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={contactSaving}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {contactSaving
                      ? (lang === 'my' ? 'သိမ်းဆည်းနေသည်...' : 'Saving Changes...')
                      : (lang === 'my' ? 'အပြောင်းအလဲများ သိမ်းဆည်းမည်' : 'Save Changes')}
                  </span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 4: VISITOR & COUNTRY ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="flex-1 overflow-y-auto pt-3 space-y-5 pr-1">
            {/* Top Stat Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white p-4 rounded-2xl shadow-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-indigo-100 uppercase tracking-wider">
                    {lang === 'my' ? 'ဝင်ကြည့်သူ စုစုပေါင်း' : 'Total Visitors'}
                  </span>
                  <Eye className="w-4 h-4 text-indigo-200" />
                </div>
                <div className="text-2xl font-black font-mono">{analyticsStats.total}</div>
                <div className="text-[10px] text-indigo-200">
                  {lang === 'my' ? 'Tracked sessions' : 'Tracked sessions'}
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
                    ? `${Math.round((analyticsStats.guestCount / analyticsStats.total) * 100)}% of total`
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
                    ? `${Math.round((analyticsStats.registeredCount / analyticsStats.total) * 100)}% of total`
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    {analyticsStats.countriesSorted.length} Countries
                  </span>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
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
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 font-medium">
                  💡 {lang === 'my' ? 'ဧည့်သည်များ ဝင်ကြည့်သည့် အချက်အလက်များကို Real-time ထိန်းသိမ်း ဖော်ပြပေးနေပါသည်' : 'Real-time tracking of visitor location, devices, and sessions.'}
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
                      ? 'Guest နှင့် Member များ ဝင်ရောက်ကြည့်ရှုခဲ့သည့် သမိုင်းကြောင်း အချက်အလက်များကို သိမ်းဆည်းပြသပေးပါသည်'
                      : 'Historical records of all guest visitors and registered users.'}
                  </p>
                </div>

                {/* Search & Filter Bar */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 sm:w-48">
                    <input
                      type="text"
                      value={visitorSearch}
                      onChange={(e) => setVisitorSearch(e.target.value)}
                      placeholder={lang === 'my' ? 'ရှာဖွေရန် (Country, Device)...' : 'Search country, device...'}
                      className="w-full pl-8 pr-3 py-1.5 bg-white text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
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

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold">
                      <th className="p-3">Visitor / User</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Country & City</th>
                      <th className="p-3">Device & Browser</th>
                      <th className="p-3 text-center">Sessions</th>
                      <th className="p-3">First Seen (စတင်ကြည့်သည့်ချိန်)</th>
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
                            <td className="p-3">
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
                                {isMember ? 'UID: ' : 'ID: '}{v.id.replace(/^u_/, '').substring(0, 12)}...
                              </span>
                            </td>

                            <td className="p-3">
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

                            <td className="p-3">
                              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                                <span className="text-base">{flag}</span>
                                <span>{v.country || 'Myanmar'}</span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-medium">
                                📍 {v.city || 'Yangon'}
                              </span>
                            </td>

                            <td className="p-3">
                              <div className="font-medium text-slate-700 capitalize flex items-center gap-1">
                                {v.device === 'mobile' ? (
                                  <Smartphone className="w-3.5 h-3.5 text-amber-600" />
                                ) : (
                                  <Monitor className="w-3.5 h-3.5 text-indigo-600" />
                                )}
                                <span>{v.device} ({v.browser})</span>
                              </div>
                            </td>

                            <td className="p-3 text-center">
                              <span className="px-2 py-1 bg-slate-100 text-slate-800 font-mono font-bold rounded-lg border border-slate-200">
                                {v.visitCount || 1} {lang === 'my' ? 'ကြိမ်' : 'visits'}
                              </span>
                            </td>

                            <td className="p-3 font-mono text-[11px] text-slate-600">
                              <div>{firstSeen.toLocaleDateString()}</div>
                              <div className="text-[10px] text-slate-400">
                                {firstSeen.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </td>

                            <td className="p-3 text-right font-mono text-[11px] text-slate-600">
                              <div>{lastActive.toLocaleDateString()}</div>
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
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {lang === 'my' ? 'Premium သက်တမ်း ရွေးချယ်ရန်' : 'Select Premium Duration'}
                  </h3>
                  <p className="text-xs text-slate-500 truncate max-w-[220px]">
                    {selectedUserForPlan.email || selectedUserForPlan.displayName || selectedUserForPlan.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserForPlan(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
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

            {selectedUserForPlan.plan === 'premium' && (
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
          <div className="bg-white rounded-3xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
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
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 shrink-0 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
              {/* Category Filter */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  {lang === 'my' ? '📁 ကဏ္ဍ ရွေးချယ်ရန်' : 'Filter Category'}
                </label>
                <select
                  value={selectedFilterCategory}
                  onChange={(e) => setSelectedFilterCategory(e.target.value)}
                  className="w-full text-xs font-semibold px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="all">{lang === 'my' ? 'ကဏ္ဍ အားလုံး (All Categories)' : 'All Categories'}</option>
                  {allMergedCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.nameEn ? `(${c.nameEn})` : ''}
                    </option>
                  ))}
                  <option value="ကား ပြင် ထိန်း စရိတ်">ကား ပြင် ထိန်း စရိတ် (Car Maintenance)</option>
                  <option value="ယာဉ်စီမံခန့်ခွဲမှု">ယာဉ်စီမံခန့်ခွဲမှု (Vehicle Management)</option>
                  <option value="အထွေထွေ အသုံးစရိတ်">အထွေထွေ အသုံးစရိတ် (General Expenses)</option>
                </select>
              </div>

              {/* User Filter */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  {lang === 'my' ? '👤 အသုံးပြုသူ ရွေးချယ်ရန်' : 'Filter User'}
                </label>
                <select
                  value={selectedFilterUser}
                  onChange={(e) => setSelectedFilterUser(e.target.value)}
                  className="w-full text-xs font-semibold px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1 flex items-center justify-between">
                  <span>{lang === 'my' ? '↕️ ရက်စွဲ / စီစဉ်ရန်' : 'Sort Records'}</span>
                  <span className="text-[9px] text-indigo-600 font-bold">
                    {txSortOrder === 'desc' ? '▼ Newest' : '▲ Oldest'}
                  </span>
                </label>
                <select
                  value={`${txSortBy}-${txSortOrder}`}
                  onChange={(e) => {
                    const [by, order] = e.target.value.split('-') as ['date' | 'amount' | 'user' | 'category', 'asc' | 'desc'];
                    setTxSortBy(by);
                    setTxSortOrder(order);
                  }}
                  className="w-full text-xs font-semibold px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  {lang === 'my' ? '🔍 ရှာဖွေရန်' : 'Search Note / Amount'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchTxQuery}
                    onChange={(e) => setSearchTxQuery(e.target.value)}
                    placeholder={lang === 'my' ? 'အကြောင်းအရာ၊ ငွေပမာဏ...' : 'Search note, amount...'}
                    className="w-full text-xs font-semibold px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
            <div className="overflow-y-auto flex-1 border border-slate-200 rounded-2xl">
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
                        <span className={txSortBy === 'date' ? 'text-indigo-700 font-black' : ''}>Date</span>
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
                        <span className={txSortBy === 'user' ? 'text-indigo-700 font-black' : ''}>Account / User</span>
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
                        <span className={txSortBy === 'category' ? 'text-indigo-700 font-black' : ''}>Category</span>
                        {txSortBy === 'category' ? (
                          <span className="text-indigo-700 font-black text-[10px]">
                            {txSortOrder === 'asc' ? '▲ A-Z' : '▼ Z-A'}
                          </span>
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        )}
                      </div>
                    </th>

                    <th className="py-2.5 px-3">Note / Description</th>

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
                        <span className={txSortBy === 'amount' ? 'text-indigo-700 font-black' : ''}>Amount (MMK)</span>
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
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {(() => {
                    const modalFilteredTxs = effectiveTransactions.filter((tx) => {
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
                      // Query Filter
                      if (searchTxQuery.trim()) {
                        const q = searchTxQuery.toLowerCase();
                        const matchNote = (tx.note || '').toLowerCase().includes(q);
                        const matchAmount = (tx.amount || 0).toString().includes(q);
                        const matchCat = (tx.category || '').toLowerCase().includes(q);
                        const matchSub = ((tx as any).subCategory || '').toLowerCase().includes(q);
                        if (!matchNote && !matchAmount && !matchCat && !matchSub) return false;
                      }
                      return true;
                    });

                    // Sort modalFilteredTxs by selected criteria (default: Date Descending)
                    const sortedModalTxs = [...modalFilteredTxs].sort((a, b) => {
                      let cmp = 0;
                      if (txSortBy === 'date') {
                        const dateA = a.date || (a.createdAt ? new Date(a.createdAt).toISOString().split('T')[0] : '');
                        const dateB = b.date || (b.createdAt ? new Date(b.createdAt).toISOString().split('T')[0] : '');
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

                    if (sortedModalTxs.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                            {lang === 'my' ? 'စာရင်းမှတ်တမ်း မရှိပါ (သို့မဟုတ်) ဖျက်ပြီးပါပြီ။' : 'No records found.'}
                          </td>
                        </tr>
                      );
                    }

                    return sortedModalTxs.map((tx) => {
                      const uId = (tx as any)._userId || tx.userId;
                      const matchedUser = usersList.find((u) => u.id === uId);
                      const userDisplay = matchedUser?.email || (uId ? `UID: ${uId.slice(0, 8)}...` : 'Unknown User');

                      const catObj = allMergedCategories.find((c) => c.id === tx.category || c.name === tx.category || c.nameEn === tx.category);
                      const catName = catObj ? catObj.name : tx.category || 'Other';
                      const subCatName = (tx as any).subCategory;

                      return (
                        <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px] whitespace-nowrap">
                            {tx.date || (tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : '—')}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-800 truncate max-w-[160px]" title={userDisplay}>
                              {userDisplay}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
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
                            <span className={tx.type === 'income' ? 'text-emerald-600' : 'text-slate-800'}>
                              {tx.type === 'income' ? '+' : '-'}{(tx.amount || 0).toLocaleString()} MMK
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
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
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500 shrink-0">
              <div>
                {lang === 'my'
                  ? `စုစုပေါင်း စနစ်တွင်း စာရင်း ${effectiveTransactions.length} ခု တိုက်ရိုက်ချိတ်ဆက်ထားသည်`
                  : `Total ${effectiveTransactions.length} database records tracked`}
              </div>
              <button
                type="button"
                onClick={() => setShowTxManagerModal(false)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
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