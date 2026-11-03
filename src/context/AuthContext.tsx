import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { User, onAuthStateChanged, signInWithPopup, getRedirectResult, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut as firebaseSignOut, deleteUser, reauthenticateWithCredential, reauthenticateWithPopup, EmailAuthProvider, GoogleAuthProvider } from 'firebase/auth';
import {
  doc,
  getDoc,
  getDocFromServer,
  collection,
  getDocs,
  getDocsFromServer,
  writeBatch,
  setDoc,
  query,
  where,
  onSnapshot,
  arrayRemove,
  updateDoc,
} from 'firebase/firestore';
import { auth, db, defaultDb, googleProvider, handleFirestoreError, OperationType, cleanForFirestore, isQuotaExhausted, resumeNetworkFromQuota, safeSetDoc, safeDeleteDoc, withTimeout } from '../lib/firebase';
import { syncQueue } from '../lib/syncQueue';
import { Transaction, Debt, Wallet, Category, Budget, PlanType, InvitedWorkspace, ShopContact, Vehicle, FuelLog, VehicleMaintenance, TirePressureLog } from '../types';
import { safeGetItem, safeSetItem, safeRemoveItem, setStorageScope } from '../utils/storage';
import { getSharedWalletDocId, recomputeSharedWalletBalance } from '../lib/sharedWalletService';
import { fetchMyRefs, deleteSharedWalletRef, subscribeMyRefs } from '../lib/sharedWalletRefs';
import { computeSyncSignature, computeContentFingerprint } from '../utils/syncGuards';
import { isWalletMatch } from '../utils/walletBalance';

interface AuthContextType {
  user: User | null;
  userProfile: {
    plan?: PlanType;
    premiumExpiresAt?: string | null;
    premiumActivatedAt?: string | null;
    premiumMonths?: number | null;
    premiumCodeUsed?: string | null;
    trialClaimed?: boolean;
    trialClaimedAt?: string | null;
    accountCreatedAt?: string;
  } | null;
  loading: boolean;
  isGuest: boolean;
  isGuestSession: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  syncError: string | null;
  isQuotaExhausted: boolean;
  resumeNetworkFromQuota: () => Promise<boolean>;
  isAdmin: boolean;
  showLoginModal: boolean;
  setShowLoginModal: (show: boolean) => void;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (email: string, pass: string, displayName: string) => Promise<void>;
  continueAsGuest: () => void;
  logout: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  claimFreeTrial: () => Promise<{ success: boolean; error?: string }>;
  syncDataToCloud: (
    transactions: Transaction[],
    debts: Debt[],
    wallets: Wallet[],
    categories: Category[],
    budgets: Budget[],
    plan: PlanType,
    overrideWorkspaceId?: string,
    shops?: ShopContact[],
    vehicles?: Vehicle[],
    fuelLogs?: FuelLog[],
    maintenanceLogs?: VehicleMaintenance[],
    tireLogs?: TirePressureLog[],
    forceSync?: boolean,
    cloudTxIds?: Set<string>
  ) => Promise<boolean>;
  clearAllCloudData: () => Promise<boolean>;
  pullDataFromCloud: (overrideWorkspaceId?: string) => Promise<{
    transactions?: Transaction[];
    debts?: Debt[];
    wallets?: Wallet[];
    categories?: Category[];
    budgets?: Budget[];
    shops?: ShopContact[];
    vehicles?: Vehicle[];
    fuelLogs?: FuelLog[];
    maintenanceLogs?: VehicleMaintenance[];
    tireLogs?: TirePressureLog[];
    plan?: PlanType;
    premiumExpiresAt?: string;
    premiumActivatedAt?: string;
    premiumMonths?: number;
  } | null>;
  activeWorkspaceId: string | null;
  setActiveWorkspaceId: (id: string | null) => void;
  switchWorkspace: (id: string | null) => Promise<boolean>;
  invitedWorkspaces: InvitedWorkspace[];
  collaborators: string[];
  addCollaborator: (email: string) => Promise<{ success: boolean; error?: string }>;
  removeCollaborator: (email: string) => Promise<boolean>;
  // [v7.5.56] Per-viewer Separate choice for shared wallets (key = shared
  // wallet doc id, value = include in THIS viewer's totals). Loaded from
  // the viewer's own user doc; the WalletsView toggle writes via
  // updateSharedWalletScopeOverride.
  sharedWalletScopeOverrides: Record<string, boolean>;
  updateSharedWalletScopeOverride: (sharedDocId: string, includeInTotals: boolean) => Promise<boolean>;
  // [v7.5.56] Delete the signed-in account: re-authenticates, deletes the
  // user's Firestore data, then deletes the Auth user. BLOCKS when the
  // user owns shared wallets (lists them — ownership must be transferred
  // first). Password users must pass their password; Google users are
  // re-authenticated with a popup.
  deleteAccount: (password?: string) => Promise<{ success: boolean; error?: string; ownedSharedWallets?: string[] }>;
}

// Cross-platform safe date parser (Safari/iOS compatible)
export const parseExpiryTime = (dateStr?: string | null): number | null => {
  if (!dateStr) return null;
  try {
    const formatted = typeof dateStr === 'string' ? dateStr.replace(' ', 'T') : dateStr;
    const time = new Date(formatted).getTime();
    return isNaN(time) ? null : time;
  } catch {
    return null;
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<{
    plan?: PlanType;
    premiumExpiresAt?: string | null;
    premiumActivatedAt?: string | null;
    premiumMonths?: number | null;
    premiumCodeUsed?: string | null;
    trialClaimed?: boolean;
    trialClaimedAt?: string | null;
    accountCreatedAt?: string;
  } | null>(() => {
    try {
      const saved = safeGetItem('ngwe_user_profile');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [isGuestSession, setIsGuestSession] = useState<boolean>(() => {
    const saved = safeGetItem('ngwe_guest_mode');
    return saved !== 'false';
  });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const lastSyncedSignatureRef = useRef<string>('');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(() => {
    const saved = safeGetItem('ngwe_last_synced');
    return saved ? new Date(saved) : null;
  });
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isAdminState, setIsAdminState] = useState(false);
  const [collaborators, setCollaborators] = useState<string[]>([]);
  const [invitedWorkspaces, setInvitedWorkspaces] = useState<InvitedWorkspace[]>([]);
  // [v7.5.56] Per-viewer shared-wallet scope overrides, loaded from the
  // viewer's own user doc (sharedWalletScopeOverrides).
  const [sharedWalletScopeOverrides, setSharedWalletScopeOverrides] = useState<Record<string, boolean>>({});
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | null>(() => {
    return safeGetItem('ngwe_active_workspace');
  });

  // [v6.9-phase1a] Master admin email — env var with hardcoded fallback.
  // NOTE: firestore.rules still has this email hardcoded (rules cannot
  // read env vars). If you change the email, update BOTH places.
  const MASTER_ADMIN_EMAIL = (
    (import.meta.env.VITE_MASTER_ADMIN_EMAIL as string | undefined) ||
    'khunthanshwe@gmail.com'
  ).trim().toLowerCase();

  const isMasterAdminEmail = (email?: string | null): boolean => {
    if (!email) return false;
    return email.trim().toLowerCase() === MASTER_ADMIN_EMAIL;
  };

  const isAdmin = isMasterAdminEmail(user?.email) && isAdminState;

  const setActiveWorkspaceId = (id: string | null) => {
    setActiveWorkspaceIdState(id);
    if (id) {
      safeSetItem('ngwe_active_workspace', id);
    } else {
      safeRemoveItem('ngwe_active_workspace');
    }
  };

  const switchWorkspace = async (id: string | null): Promise<boolean> => {
    setActiveWorkspaceId(id);
    return true;
  };

  // [v7.5.56] Real-time discovery of workspaces shared with the current
  // user, derived from the user's OWN sharedWalletRefs. The old
  // root-users `collaborators` array-contains query is gone: under the
  // new rules that array grants nothing and a collaborator can no
  // longer read the owner's root user doc, so the old query returned
  // nothing and new invitees never appeared here. Refs carry
  // ownerUid/ownerEmail (no owner display name, no plan), so
  // displayName falls back to the owner-email prefix — the same
  // fallback the shared-wallet hydration in sharedWalletService uses.
  // `plan` is 'free': no consumer reads InvitedWorkspace.plan
  // (Dashboard / AccountModal / WalletsView only use uid, email and
  // displayName for switching + owner attribution) and the owner's real
  // plan is unreadable to the invitee, so the most restrictive honest
  // value is used — never claim premium. `collaborators` is [] for the
  // same reason (unknown and unreadable). Several shared wallets from
  // the same owner collapse to one workspace entry. The owner's root
  // user doc is never read. All refs are included regardless of
  // pending/accepted status, matching the wallet list (which hydrates
  // every ref) and the old behaviour (no pending concept).
  useEffect(() => {
    if (!user || !user.email) {
      setInvitedWorkspaces([]);
      return;
    }

    const cleanEmail = user.email.trim().toLowerCase();
    const unsub = subscribeMyRefs(
      cleanEmail,
      (refs) => {
        const map = new Map<string, InvitedWorkspace>();
        refs.forEach((ref) => {
          if (!ref.ownerUid || map.has(ref.ownerUid)) return;
          const ownerEmail = ref.ownerEmail || '';
          map.set(ref.ownerUid, {
            uid: ref.ownerUid,
            email: ownerEmail,
            displayName: ownerEmail ? ownerEmail.split('@')[0] : '',
            plan: 'free',
            collaborators: [],
          });
        });
        setInvitedWorkspaces(Array.from(map.values()));
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'sharedWalletRefs (invited workspaces)');
      }
    );

    return () => {
      unsub();
    };
  }, [user]);

  const currentWorkspaceId = activeWorkspaceId || user?.uid;

  const refreshUserProfile = async () => {
    if (!auth.currentUser) {
      setUserProfile(null);
      safeRemoveItem('ngwe_user_profile');
      safeRemoveItem('ngwe_plan');
      safeRemoveItem('ngwe_premium_expires_at');
      return;
    }
    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        let effectivePlan = (data.plan as PlanType) || 'free';
        if (effectivePlan === 'premium' && data.premiumExpiresAt) {
          const expTime = new Date(data.premiumExpiresAt).getTime();
          if (expTime < Date.now()) {
            effectivePlan = 'free';
          }
        }
        const profile = {
          plan: effectivePlan,
          premiumExpiresAt: data.premiumExpiresAt,
          premiumActivatedAt: data.premiumActivatedAt,
          premiumMonths: data.premiumMonths,
          premiumCodeUsed: data.premiumCodeUsed,
          trialClaimed: !!data.trialClaimed,
          trialClaimedAt: data.trialClaimedAt,
          accountCreatedAt: data.createdAt,
        };
        setUserProfile(profile);
        setCollaborators(Array.isArray(data.collaborators) ? data.collaborators : []);
        // [v7.5.56] Load the viewer's per-wallet scope overrides.
        setSharedWalletScopeOverrides(
          data.sharedWalletScopeOverrides && typeof data.sharedWalletScopeOverrides === 'object'
            ? data.sharedWalletScopeOverrides
            : {}
        );
        safeSetItem('ngwe_user_profile', JSON.stringify(profile));
        safeSetItem('ngwe_plan', effectivePlan);
        if (data.premiumExpiresAt) {
          safeSetItem('ngwe_premium_expires_at', data.premiumExpiresAt);
        }
      }
    } catch (err) {
      console.warn('Failed to refresh user profile:', err);
    }
  };

  // [v7.5.55 E30] Live listener on the user's own profile doc.
  // A grant / revocation / expiry must take effect mid-session,
  // without a reload (the profile used to load once on sign-in).
  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const unsub = onSnapshot(
      userRef,
      () => { refreshUserProfile(); },
      (err) => { console.warn('Profile listener error:', err); }
    );
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // [v7.5.56] Owner-boot reconcile for shared wallets (finding 5 + prune).
  // Runs fire-and-forget on boot/sync — never blocks sign-in:
  //  (a) Prune stale collaborators: the root users/{uid}.collaborators
  //      array is vestigial (it grants nothing under the new rules), but
  //      anyone sharing no wallet must not linger in it. Keep only emails
  //      sharing >= 1 wallet with the owner (from wallets' sharedWith).
  //  (b) Recompute the stored balance of each owned shared wallet so the
  //      shared doc never goes stale after member writes.
  const reconcileOwnedSharedWallets = async (): Promise<void> => {
    const cu = auth.currentUser;
    if (!cu) return;
    try {
      const walletsSnap = await getDocs(collection(db, 'users', cu.uid, 'wallets'));
      const ownedShared: Wallet[] = [];
      const sharingEmails = new Set<string>();
      walletsSnap.docs.forEach((d) => {
        const w = { id: d.id, ...d.data() } as Wallet;
        if (Array.isArray(w.sharedWith) && w.sharedWith.length > 0) {
          ownedShared.push(w);
          w.sharedWith.forEach((e) => {
            if (typeof e === 'string' && e.includes('@')) sharingEmails.add(e.trim().toLowerCase());
          });
        }
      });

      // (a) Prune stale entries from the root collaborators array.
      try {
        const userSnap = await getDoc(doc(db, 'users', cu.uid));
        if (userSnap.exists()) {
          const stored: string[] = Array.isArray(userSnap.data().collaborators)
            ? userSnap.data().collaborators
            : [];
          const stale = stored.filter(
            (c) => typeof c === 'string' && c.includes('@') && !sharingEmails.has(c.trim().toLowerCase())
          );
          if (stale.length > 0) {
            // NOTE: updateDoc directly, NOT safeUpdateDoc — safeUpdateDoc
            // runs cleanForFirestore(), which would mangle the
            // arrayRemove() FieldValue sentinel into a plain object.
            await withTimeout(
              updateDoc(doc(db, 'users', cu.uid), { collaborators: arrayRemove(...stale) }),
              8000
            ).catch(() => {});
            setCollaborators(stored.filter((c) => !stale.includes(c)));
          }
        }
      } catch (pruneErr) {
        console.warn('[v7.5.56] prune stale collaborators notice:', pruneErr);
      }

      // (b) Recompute each owned shared wallet's stored balance.
      for (const w of ownedShared) {
        try {
          await recomputeSharedWalletBalance(getSharedWalletDocId(w, cu.uid));
        } catch (reErr) {
          console.warn('[v7.5.56] recompute shared wallet notice:', w.id, reErr);
        }
      }
    } catch (err) {
      console.warn('[v7.5.56] reconcileOwnedSharedWallets notice:', err);
    }
  };

  // [v7.5.56] Write a per-viewer scope override for one shared wallet
  // (called by the WalletsView Separate toggle). Stored in the viewer's
  // OWN user doc only — never on the shared doc — so one member's choice
  // never changes another member's totals.
  const updateSharedWalletScopeOverride = async (
    sharedDocId: string,
    includeInTotals: boolean
  ): Promise<boolean> => {
    if (!auth.currentUser || !sharedDocId) return false;
    // Read the doc first so a rapid double-toggle cannot lose an update
    // to a stale local copy of the overrides map.
    const userSnap = await getDoc(doc(db, 'users', auth.currentUser.uid)).catch(() => null);
    const stored = userSnap && userSnap.exists() && userSnap.data().sharedWalletScopeOverrides
      && typeof userSnap.data().sharedWalletScopeOverrides === 'object'
      ? userSnap.data().sharedWalletScopeOverrides
      : sharedWalletScopeOverrides;
    const next = { ...stored, [sharedDocId]: includeInTotals };
    const ok = await safeSetDoc(
      doc(db, 'users', auth.currentUser.uid),
      { sharedWalletScopeOverrides: next, updatedAt: new Date().toISOString() },
      { merge: true }
    );
    if (!ok) return false;
    setSharedWalletScopeOverrides(next);
    return true;
  };

  const claimFreeTrial = async (): Promise<{ success: boolean; error?: string }> => {
    if (!auth.currentUser) {
      return { success: false, error: 'Please sign in first to claim free trial' };
    }
    const currentUid = auth.currentUser.uid;
    try {
      const userRef = doc(db, 'users', currentUid);
      const userSnap = await getDoc(userRef);
      const data = userSnap.exists() ? userSnap.data() : {};

      // Check if already claimed
      if (data.trialClaimed || userProfile?.trialClaimed) {
        return {
          success: false,
          error: 'ဤအကောင့်ဖြင့် ၃ လ အခမဲ့ စမ်းသုံးခွင့် ရယူပြီး ဖြစ်ပါသည် (Trial already claimed)'
        };
      }

      // Check account creation date (within 30 days)
      const rawCreatedAt = data.createdAt || auth.currentUser.metadata.creationTime || new Date().toISOString();
      const createdTime = new Date(rawCreatedAt).getTime();
      const nowTime = Date.now();
      const diffDays = (nowTime - createdTime) / (1000 * 60 * 60 * 24);

      // [v7.5.55 E30] Trial eligibility is 30 days everywhere
      // (PremiumModal already uses 30; AuthContext used 31).
      if (diffDays > 30) {
        return {
          success: false,
          error: 'အကောင့်ဖွင့်ပြီး ၁ လ (ရက် ၃၀) အတွင်းသာ ၃ လ အခမဲ့ လက်ဆောင် ရယူနိုင်ပါသည် (Trial eligibility expired)'
        };
      }

      // Calculate 3 months (90 days) expiration
      const now = new Date();
      let expiresAt: string;
      if (data.plan === 'premium' && data.premiumExpiresAt) {
        const currentExp = new Date(data.premiumExpiresAt).getTime();
        if (currentExp > nowTime) {
          expiresAt = new Date(currentExp + 90 * 24 * 60 * 60 * 1000).toISOString();
        } else {
          expiresAt = new Date(nowTime + 90 * 24 * 60 * 60 * 1000).toISOString();
        }
      } else {
        expiresAt = new Date(nowTime + 90 * 24 * 60 * 60 * 1000).toISOString();
      }

      const updatedProfile = {
        plan: 'premium' as PlanType,
        premiumExpiresAt: expiresAt,
        premiumActivatedAt: now.toISOString(),
        premiumMonths: (data.premiumMonths || 0) + 3,
        trialClaimed: true,
        trialClaimedAt: now.toISOString(),
        accountCreatedAt: rawCreatedAt,
      };

      // [trial-fix] safeSetDoc returns boolean — MUST check before
      // committing local state. Previously always returned success
      // even when Firestore write failed (quota/permission).
      const writeOk = await safeSetDoc(userRef, {
        userId: currentUid,
        email: auth.currentUser.email || '',
        displayName: auth.currentUser.displayName || '',
        ...updatedProfile,
        updatedAt: now.toISOString(),
      }, { merge: true });

      if (!writeOk) {
        return {
          success: false,
          error: 'Cloud သို့ သိမ်းဆည်းမရပါ — အင်တာနက်/VPN စစ်ပြီး ပြန်ကြိုးစားပါ (Cloud write failed)',
        };
      }

      setUserProfile(updatedProfile);
      safeSetItem('ngwe_user_profile', JSON.stringify(updatedProfile));
      safeSetItem('ngwe_plan', 'premium');
      safeSetItem('ngwe_premium_expires_at', expiresAt);

      return { success: true };
    } catch (err: any) {
      console.error('Failed to claim free trial', err);
      return {
        success: false,
        error: err.message || 'Error activating free trial'
      };
    }
  };

  // [auto-sync-plan] Reconcile local plan with Firestore on every boot.
  // Fixes false-positive Premium (localStorage cached 'premium' while
  // Firestore says 'free' — happens when trial write previously failed).
  useEffect(() => {
    if (!auth.currentUser || loading) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser!.uid));
        if (!userDoc.exists() || cancelled) return;
        const d = userDoc.data();
        const cloudPlan = (d.plan as PlanType) || 'free';
        const localPlan = (safeGetItem('ngwe_plan') || '') as string;
        if (localPlan && localPlan !== cloudPlan) {
          console.log('[auto-sync-plan] Plan mismatch — local:', localPlan, '→ cloud:', cloudPlan);
          safeSetItem('ngwe_plan', cloudPlan);
          const refreshed = {
            plan: cloudPlan,
            premiumExpiresAt: d.premiumExpiresAt || null,
            premiumActivatedAt: d.premiumActivatedAt || null,
            premiumMonths: d.premiumMonths || null,
            premiumCodeUsed: d.premiumCodeUsed || null,
            trialClaimed: !!d.trialClaimed,
            trialClaimedAt: d.trialClaimedAt || null,
            accountCreatedAt: d.createdAt || new Date().toISOString(),
          };
          setUserProfile(refreshed);
          safeSetItem('ngwe_user_profile', JSON.stringify(refreshed));
        }
      } catch (e) {
        console.warn('[auto-sync-plan] reconcile failed:', e);
      }
    }, 1500);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [user?.uid, loading]);

  useEffect(() => {
    console.log('AuthContext: Setting up auth listener...');
    // Fail-safe timer to guarantee loading state resolves even on slow connections
    const failSafeTimer = setTimeout(() => {
      console.warn('AuthContext: Fail-safe timer triggered - forcing loading to false');
      setLoading(false);
    }, 3000);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log('AuthContext: onAuthStateChanged callback entered', { currentUser });
      // Logic settled inside this callback
      try {
        setUser(currentUser);
        // [v6.11.0 S4] Scope localStorage to the current user (or guest).
        // Must run before any safe*Item() read/write in this callback.
        setStorageScope(currentUser ? currentUser.uid : 'guest');
        if (currentUser) {
          console.log('AuthContext: User authenticated');
          setIsGuestSession(false);
          safeRemoveItem('ngwe_guest_mode');
          setShowLoginModal(false);
          
          // Immediate synchronous admin check
          const isAdminUser = isMasterAdminEmail(currentUser.email);
          setIsAdminState(isAdminUser);

          // Background asynchronous Cloud profile sync with timeout
          try {
            console.log('AuthContext: Syncing profile...');
            const adminDocRef = doc(db, 'admins', currentUser.uid);
            const adminDoc = await withTimeout(getDoc(adminDocRef), 10000).catch(() => null);
            if (adminDoc && adminDoc.exists()) {
              setIsAdminState(true);
            } else if (isAdminUser) {
              const writeResult = await safeSetDoc(adminDocRef, {
                email: currentUser.email,
                role: 'admin',
                createdAt: new Date().toISOString(),
              });
              if (writeResult) {
                setIsAdminState(true);
              }
            }
          } catch (e) {
            console.warn('Failed admin sync check:', e);
          }

          try {
            const userDocRef = doc(db, 'users', currentUser.uid);
            let userDoc = await withTimeout(getDoc(userDocRef), 10000).catch(() => null);
            let uData = userDoc && userDoc.exists() ? userDoc.data() : null;

            // Check if profile exists and has premium plan in the (default) database instead (only if db is different)
            if (db !== defaultDb && (!uData || uData.plan !== 'premium')) {
              try {
                const defaultUserDocRef = doc(defaultDb, 'users', currentUser.uid);
                const defaultUserDoc = await withTimeout(getDoc(defaultUserDocRef), 3000).catch(() => null);
                if (defaultUserDoc && defaultUserDoc.exists()) {
                  const defaultData = defaultUserDoc.data();
                  if (defaultData && defaultData.plan === 'premium') {
                    // Automatically consolidate profile to custom database
                    const consolidatedProfile = {
                      userId: currentUser.uid,
                      email: currentUser.email || defaultData.email || '',
                      displayName: currentUser.displayName || defaultData.displayName || 'User',
                      photoURL: currentUser.photoURL || defaultData.photoURL || '',
                      plan: 'premium' as PlanType,
                      premiumExpiresAt: defaultData.premiumExpiresAt || null,
                      premiumActivatedAt: defaultData.premiumActivatedAt || null,
                      premiumMonths: defaultData.premiumMonths || null,
                      premiumCodeUsed: defaultData.premiumCodeUsed || null,
                      createdAt: defaultData.createdAt || new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    };
                    await safeSetDoc(userDocRef, consolidatedProfile, { merge: true }).catch(() => {});
                    // Re-fetch user doc to proceed with consolidated data
                    userDoc = await getDoc(userDocRef).catch(() => null);
                    uData = userDoc && userDoc.exists() ? userDoc.data() : null;
                  }
                }
              } catch (defaultDbErr) {
                console.warn('Failed to query default database for premium plan consolidation:', defaultDbErr);
              }
            }

            if (userDoc && userDoc.exists() && uData) {
              let effectivePlan = (uData.plan as PlanType) || (isAdminUser ? 'premium' : 'free');
              let expAt = uData.premiumExpiresAt;
              if (isAdminUser && (!uData.plan || uData.plan === 'free')) {
                effectivePlan = 'premium';
                expAt = new Date(Date.now() + 100 * 365.25 * 24 * 60 * 60 * 1000).toISOString();
                await safeSetDoc(userDocRef, {
                  plan: 'premium',
                  premiumExpiresAt: expAt,
                  premiumActivatedAt: new Date().toISOString(),
                  premiumMonths: 999,
                  updatedAt: new Date().toISOString(),
                }, { merge: true }).catch(() => {});
                
                // Re-fetch to ensure uData is in sync with database values
                const refetched = await getDoc(userDocRef).catch(() => null);
                if (refetched && refetched.exists()) {
                  uData = refetched.data();
                }
              } else if (effectivePlan === 'premium' && uData.premiumExpiresAt) {
                const expTime = parseExpiryTime(uData.premiumExpiresAt);
                if (expTime !== null && expTime < Date.now()) {
                  effectivePlan = 'free';
                }
              }
              const profile = {
                plan: effectivePlan,
                premiumExpiresAt: expAt || null,
                premiumActivatedAt: uData?.premiumActivatedAt || null,
                premiumMonths: uData?.premiumMonths || null,
                premiumCodeUsed: uData?.premiumCodeUsed || null,
                trialClaimed: !!uData?.trialClaimed,
                trialClaimedAt: uData?.trialClaimedAt || null,
                accountCreatedAt: uData?.createdAt || new Date().toISOString(),
              };
              setUserProfile(profile);
              setCollaborators(Array.isArray(uData?.collaborators) ? uData.collaborators : []);
              // [v7.5.56] Load the viewer's per-wallet scope overrides.
              setSharedWalletScopeOverrides(
                uData?.sharedWalletScopeOverrides && typeof uData.sharedWalletScopeOverrides === 'object'
                  ? uData.sharedWalletScopeOverrides
                  : {}
              );
              safeSetItem('ngwe_user_profile', JSON.stringify(profile));
              safeSetItem('ngwe_plan', effectivePlan);
              if (expAt) {
                safeSetItem('ngwe_premium_expires_at', expAt);
              }
            } else if (userDoc) {
              const isAutoPrem = isAdminUser;
              const expAt = isAutoPrem ? new Date(Date.now() + 100 * 365.25 * 24 * 60 * 60 * 1000).toISOString() : undefined;
              const defaultProfile = {
                plan: (isAutoPrem ? 'premium' : 'free') as PlanType,
                premiumExpiresAt: expAt || null,
                premiumActivatedAt: isAutoPrem ? new Date().toISOString() : null,
                premiumMonths: isAutoPrem ? 999 : null,
                trialClaimed: false,
                accountCreatedAt: new Date().toISOString(),
              };
              setUserProfile(defaultProfile);
              setCollaborators([]);
              setSharedWalletScopeOverrides({});
              safeSetItem('ngwe_user_profile', JSON.stringify(defaultProfile));
              safeSetItem('ngwe_plan', defaultProfile.plan);
              if (expAt) {
                safeSetItem('ngwe_premium_expires_at', expAt);
              }
              await safeSetDoc(userDocRef, {
                userId: currentUser.uid,
                email: currentUser.email || '',
                displayName: currentUser.displayName || 'User',
                photoURL: currentUser.photoURL || '',
                plan: defaultProfile.plan,
                premiumExpiresAt: expAt || null,
                premiumActivatedAt: isAutoPrem ? new Date().toISOString() : null,
                premiumMonths: isAutoPrem ? 999 : null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }, { merge: true }).catch(() => {});
            }
          } catch (e) {
            console.warn('Failed to load user profile doc on auth change', e);
          }

          // [v7.5.56] Owner boot: prune stale collaborators + recompute
          // owned shared wallet balances (fire-and-forget, never blocks).
          void reconcileOwnedSharedWallets();
        } else {
          console.log('AuthContext: No user authenticated');
          setIsAdminState(false);
          setUserProfile(null);
          setCollaborators([]);
          setSharedWalletScopeOverrides({});
          safeRemoveItem('ngwe_user_profile');
          safeRemoveItem('ngwe_plan');
          safeRemoveItem('ngwe_premium_expires_at');
        }
      } catch (err) {
        console.warn('Error during onAuthStateChanged handler execution:', err);
      } finally {
        console.log('AuthContext: Setting loading to false');
        setLoading(false);
        clearTimeout(failSafeTimer);
      }
    });

    // Handle Google redirect auth return
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          const loggedUser = result.user;
          const userDocRef = doc(db, 'users', loggedUser.uid);
          const userSnap = await getDoc(userDocRef);
          if (!userSnap.exists()) {
            await safeSetDoc(userDocRef, {
              userId: loggedUser.uid,
              email: loggedUser.email || '',
              displayName: loggedUser.displayName || 'User',
              photoURL: loggedUser.photoURL || '',
              plan: 'free',
              collaborators: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
          setIsGuestSession(false);
          safeRemoveItem('ngwe_guest_mode');
          setShowLoginModal(false);
        }
      })
      .catch((err) => {
        console.warn('Redirect sign-in check notice:', err);
      });

    return () => {
      unsubscribe();
    };
  }, []);

  const continueAsGuest = () => {
    setIsGuestSession(true);
    safeSetItem('ngwe_guest_mode', 'true');
    setShowLoginModal(false);
  };

  const loginWithGoogle = async () => {
    try {
      setSyncError(null);
      setIsSyncing(true);
      
      let loggedUser: User | null = null;
      try {
        const result = await signInWithPopup(auth, googleProvider);
        loggedUser = result.user;
      } catch (popupErr: any) {
        console.warn('Google Popup sign-in notice:', popupErr);
        throw popupErr;
      }

      // Ensure user state and modal close immediately on popup success
      if (loggedUser) {
        setIsGuestSession(false);
        safeRemoveItem('ngwe_guest_mode');
        setShowLoginModal(false);
        setUser(loggedUser);

        // Ensure user document exists in background non-blockingly
        try {
          const userDocRef = doc(db, 'users', loggedUser.uid);
          const userSnap = await getDoc(userDocRef);
          if (!userSnap.exists()) {
            await safeSetDoc(userDocRef, {
              userId: loggedUser.uid,
              email: loggedUser.email || '',
              displayName: loggedUser.displayName || 'User',
              photoURL: loggedUser.photoURL || '',
              plan: 'free',
              collaborators: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
          
          // Admin Bootstrap check
          if (isMasterAdminEmail(loggedUser.email)) {
            const adminDocRef = doc(db, 'admins', loggedUser.uid);
            const adminSnap = await getDoc(adminDocRef);
            if (!adminSnap.exists()) {
              await safeSetDoc(adminDocRef, {
                email: loggedUser.email,
                createdAt: new Date().toISOString(),
              });
            }
            setIsAdminState(true);
          }
        } catch (docErr) {
          console.warn('User document initialization background notice:', docErr);
        }
      }
    } catch (error: any) {
      const errCode = String(error?.code || error?.message || error || '').toLowerCase();
      console.warn('Google Sign-in status:', error);
      
      if (
        errCode.includes('popup-closed-by-user') ||
        errCode.includes('cancelled-popup-request') ||
        errCode.includes('popup-blocked')
      ) {
        setSyncError('Google Sign-in Popup ပိတ်သွားပါသဖြင့် မအောင်မြင်ပါ။ ပြန်လည် ကြိုးစားပါ သို့မဟုတ် Email/Password ဖြင့် ဝင်ရောက်ပါ။');
      } else if (errCode.includes('network') || errCode.includes('fetch-failed')) {
        setSyncError('အင်တာနက် သို့မဟုတ် VPN ချိတ်ဆက်မှု အဆင်မပြေပါသဖြင့် Google Sign-in မရပါ။ VPN/အင်တာနက် စစ်ဆေးပြီး ပြန်လည်ကြိုးစားပါ သို့မဟုတ် Email/Password ဖြင့် ဝင်ရောက်ပါ။');
      } else if (errCode.includes('unauthorized-domain')) {
        setSyncError(`Google Auth ခွင့်မပြုထားသော Domain (Domain: ${window.location.hostname}) ဖြစ်နေပါသည်။ Firebase Console -> Authentication -> Settings -> Authorized Domains တွင် '${window.location.hostname}' ကို Add Domain ပြုလုပ်ပေးပါ။ သို့မဟုတ် Email/Password ဖြင့် Sign In ဝင်ရောက်နိုင်ပါသည်။`);
      } else {
        setSyncError('Google Sign-in ဝင်ရောက်ရာတွင် အဆင်မပြေပါ။ Browser တွင် Pop-up ခွင့်ပြုထားခြင်း ရှိမရှိ စစ်ဆေးပါ သို့မဟုတ် Email/Password / Guest Mode ဖြင့် ဝင်ရောက်ပါ။');
      }
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      setSyncError(null);
      setIsSyncing(true);
      const result = await signInWithEmailAndPassword(auth, email.trim(), pass);
      const loggedUser = result.user;
      if (loggedUser) {
        const userDocRef = doc(db, 'users', loggedUser.uid);
        const userSnap = await getDoc(userDocRef);
        if (!userSnap.exists()) {
          await safeSetDoc(userDocRef, {
            userId: loggedUser.uid,
            email: loggedUser.email || '',
            displayName: loggedUser.displayName || email.split('@')[0] || 'User',
            photoURL: '',
            plan: 'free',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
        
        // Admin Bootstrap check
        if (isMasterAdminEmail(loggedUser.email)) {
          const adminDocRef = doc(db, 'admins', loggedUser.uid);
          const adminSnap = await getDoc(adminDocRef);
          if (!adminSnap.exists()) {
            await safeSetDoc(adminDocRef, {
              email: loggedUser.email,
              createdAt: new Date().toISOString(),
            });
            setIsAdminState(true);
          }
        }
        
        setIsGuestSession(false);
        safeRemoveItem('ngwe_guest_mode');
        setShowLoginModal(false);
      }
    } catch (error: any) {
      console.error('Email login failed:', error);
      setSyncError(error?.message || 'Email login failed');
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  const signupWithEmail = async (email: string, pass: string, displayName: string) => {
    try {
      setSyncError(null);
      setIsSyncing(true);
      const result = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      const loggedUser = result.user;
      if (loggedUser) {
        if (displayName.trim()) {
          await updateProfile(loggedUser, { displayName: displayName.trim() });
        }
        const userDocRef = doc(db, 'users', loggedUser.uid);
        await safeSetDoc(userDocRef, {
          userId: loggedUser.uid,
          email: loggedUser.email || '',
          displayName: displayName.trim() || email.split('@')[0] || 'User',
          photoURL: '',
          plan: 'free',
          collaborators: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        // Admin Bootstrap check
        if (isMasterAdminEmail(loggedUser.email)) {
          const adminDocRef = doc(db, 'admins', loggedUser.uid);
          await safeSetDoc(adminDocRef, {
            email: loggedUser.email,
            createdAt: new Date().toISOString(),
          });
          setIsAdminState(true);
        }

        setIsGuestSession(false);
        safeRemoveItem('ngwe_guest_mode');
        setShowLoginModal(false);
      }
    } catch (error: any) {
      console.error('Sign up failed:', error);
      setSyncError(error?.message || 'Sign up failed');
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  const logout = async () => {
    try {
      setIsSyncing(true);
      await firebaseSignOut(auth);
      setUser(null);
      setIsGuestSession(false);
      safeRemoveItem('ngwe_guest_mode');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Upload local data to Firestore
  const syncDataToCloud = async (
    transactions: Transaction[],
    debts: Debt[],
    wallets: Wallet[],
    categories: Category[],
    budgets: Budget[],
    plan: PlanType,
    overrideWorkspaceId?: string,
    shops?: ShopContact[],
    vehicles?: Vehicle[],
    fuelLogs?: FuelLog[],
    maintenanceLogs?: VehicleMaintenance[],
    tireLogs?: TirePressureLog[],
    forceSync?: boolean,
    cloudTxIds?: Set<string>
  ): Promise<boolean> => {
    if (!auth.currentUser) return false;
    if (isSyncing && !forceSync) return false;
    const uid = auth.currentUser.uid;
    const targetUid = overrideWorkspaceId || currentWorkspaceId || uid;

    // [v6.10.0 S3] Content-aware signature. Full per-entity hash replaces
    // the old count+sum+firstId heuristic, which silently missed note/
    // category/date/walletId edits and offsetting amount changes.
    const currentSig = computeSyncSignature(
      computeContentFingerprint(transactions),
      computeContentFingerprint(debts),
      computeContentFingerprint(wallets),
      computeContentFingerprint(categories),
      computeContentFingerprint(budgets, (b) => b.categoryId),
      computeContentFingerprint(shops),
      computeContentFingerprint(vehicles),
      computeContentFingerprint(fuelLogs),
      computeContentFingerprint(maintenanceLogs),
      computeContentFingerprint(tireLogs)
    );

    if (lastSyncedSignatureRef.current === currentSig && !forceSync) {
      console.log('[syncDataToCloud] Local data signature is identical. Skipping redundant cloud write batch.');
      return true;
    }

    try {
      setIsSyncing(true);
      setSyncError(null);

      // Build list of all document write operations
      const operations: { ref: any; data: any }[] = [];

      // 1. User Doc
      if (targetUid === uid) {
        operations.push({
          ref: doc(db, 'users', uid),
          data: {
            userId: uid,
            email: auth.currentUser.email || '',
            displayName: auth.currentUser.displayName || '',
            photoURL: auth.currentUser.photoURL || '',
            updatedAt: new Date().toISOString(),
          },
        });
      }

      // 2. Transactions — STRICT queue-only push.
      //
      // ⚠️ CRITICAL: NEVER auto-push a local tx just because it's missing from
      // cloudTxIds. That path resurrects transactions that were deleted on
      // another device, causing an infinite delete/push loop (counts never match).
      //
      // The syncQueue is the single source of truth for pending changes.
      // New/edited txs are enqueued by the caller; deleted txs are handled by
      // their own 'delete' queue operation. Anything else is either already
      // synced or was deleted by another device — leave it alone.
      const txsToPush = (cloudTxIds && !forceSync)
        ? transactions.filter((tx) => syncQueue.isEntityPending('transactions', tx.id))
        : transactions;

      console.log(`[syncDataToCloud] Total local: ${transactions.length}, Queue-pending to push: ${txsToPush.length}`);

      for (const tx of txsToPush) {
        operations.push({
          ref: doc(db, 'users', targetUid, 'transactions', tx.id),
          data: { ...tx, userId: targetUid },
        });
      }

      // Shared wallet operations (kept in a separate list to prevent cross-collection rollback)
      const sharedOperations: { ref: any; data: any }[] = [];
      const sharedWalletsList = wallets.filter((w) => w.isSharedFromOther || (w.sharedWith && w.sharedWith.length > 0));
      for (const sw of sharedWalletsList) {
        const sharedDocId = getSharedWalletDocId(sw, uid);
        const txsForSw = transactions.filter((t) => isWalletMatch(sw, t.walletId));
        for (const tx of txsForSw) {
          // [v7.5.56] Write the SHARED DOC ID as walletId: the rules
          // require request.resource.data.walletId == path walletId, so
          // the raw local walletId was always denied.
          sharedOperations.push({
            ref: doc(db, 'sharedWallets', sharedDocId, 'transactions', tx.id),
            data: { ...tx, walletId: sharedDocId },
          });
        }
      }

      // 3. Debts (Upsert)
      for (const debt of debts) {
        operations.push({
          ref: doc(db, 'users', targetUid, 'debts', debt.id),
          data: { ...debt, userId: targetUid },
        });
      }

      // 4. Wallets (Upsert only OWN wallets)
      const ownWallets = wallets.filter((w) => !w.isSharedFromOther && !w.id.startsWith('shared_'));
      for (const wallet of ownWallets) {
        operations.push({
          ref: doc(db, 'users', targetUid, 'wallets', wallet.id),
          data: { ...wallet, userId: targetUid },
        });

        // Sync shared wallet document to top-level sharedWallets collection ONLY if current user is owner
        if (wallet.sharedWith && wallet.sharedWith.length > 0) {
          const sharedDocId = getSharedWalletDocId(wallet, uid);
          const rawSharedWith = wallet.sharedWith || [];
          const normalizedSet = new Set<string>();
          rawSharedWith.forEach((e) => {
            const trimmed = e.trim();
            if (trimmed && trimmed.includes('@')) {
              normalizedSet.add(trimmed.toLowerCase());
              normalizedSet.add(trimmed);
            }
          });
          const normalizedSharedWith = Array.from(normalizedSet);

          if (normalizedSharedWith.length > 0) {
            sharedOperations.push({
              ref: doc(db, 'sharedWallets', sharedDocId),
              data: {
                id: wallet.originalId || wallet.id,
                ownerUid: uid,
                ownerEmail: (auth.currentUser?.email || '').trim().toLowerCase(),
                ownerName: auth.currentUser?.displayName || 'Owner',
                name: wallet.name,
                nameEn: wallet.nameEn || wallet.name,
                type: 'mobile',
                balance: Number(wallet.balance) || 0,
                includeInTotals: wallet.includeInTotals !== false,
                color: wallet.color || '#6366F1',
                icon: wallet.icon || 'Wallet',
                currency: wallet.currency || 'MMK',
                exchangeRate: wallet.exchangeRate || 1,
                sharedWith: normalizedSharedWith,
                collaboratorPermissions: wallet.collaboratorPermissions || {},
                updatedAt: new Date().toISOString(),
                ...(wallet.initialBalance !== undefined ? { initialBalance: Number(wallet.initialBalance) } : {}),
                ...(wallet.accountNumber ? { accountNumber: wallet.accountNumber.trim() } : {}),
              },
            });
          }
        }
      }

      // 5. Categories (Upsert)
      if (categories && categories.length > 0) {
        for (const cat of categories) {
          operations.push({
            ref: doc(db, 'users', targetUid, 'categories', cat.id),
            data: { ...cat, userId: targetUid },
          });
        }
      }

      // 6. Budgets (Upsert)
      for (const budget of budgets) {
        operations.push({
          ref: doc(db, 'users', targetUid, 'budgets', budget.categoryId),
          data: { ...budget, userId: targetUid },
        });
      }

      // 7. Shops (Upsert)
      if (shops && shops.length > 0) {
        for (const shop of shops) {
          operations.push({
            ref: doc(db, 'users', targetUid, 'shops', shop.id),
            data: { ...shop, userId: targetUid },
          });
        }
      }

      // 8. Vehicles (Upsert)
      if (vehicles && vehicles.length > 0) {
        for (const veh of vehicles) {
          operations.push({
            ref: doc(db, 'users', targetUid, 'vehicles', veh.id),
            data: { ...veh, userId: targetUid },
          });
        }
      }

      // 9. Fuel Logs (Upsert)
      if (fuelLogs && fuelLogs.length > 0) {
        for (const fl of fuelLogs) {
          operations.push({
            ref: doc(db, 'users', targetUid, 'fuelLogs', fl.id),
            data: { ...fl, userId: targetUid },
          });
        }
      }

      // 10. Vehicle Maintenance (Upsert)
      if (maintenanceLogs && maintenanceLogs.length > 0) {
        for (const ml of maintenanceLogs) {
          operations.push({
            ref: doc(db, 'users', targetUid, 'vehicleMaintenance', ml.id),
            data: { ...ml, userId: targetUid },
          });
        }
      }

      // 11. Tire Pressure Logs (Upsert)
      if (tireLogs && tireLogs.length > 0) {
        for (const tl of tireLogs) {
          operations.push({
            ref: doc(db, 'users', targetUid, 'tirePressureLogs', tl.id),
            data: { ...tl, userId: targetUid },
          });
        }
      }

      // Execute in chunks with resilient per-document fallback
      const CHUNK_SIZE = 200;
      for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
        const chunk = operations.slice(i, i + CHUNK_SIZE);
        try {
          const currentBatch = writeBatch(db);
          for (const op of chunk) {
            currentBatch.set(op.ref, cleanForFirestore(op.data), { merge: true });
          }
          await withTimeout(currentBatch.commit(), 20000, 'Cloud သို့ သိမ်းဆည်းခြင်း အချိန်ကုန်သွားပါသည်');
        } catch (batchErr) {
          console.warn('Batch write encountered error, falling back to granular per-document sync & retry queue:', batchErr);
          // Fallback to per-document execution so partial successes are preserved and errors isolated
          const results = await Promise.allSettled(
            chunk.map(async (op) => {
              await setDoc(op.ref, cleanForFirestore(op.data), { merge: true });
              return op.ref.path;
            })
          );

          // Any failed operation gets enqueued to syncQueue for background retry with exponential backoff
          for (let k = 0; k < results.length; k++) {
            const res = results[k];
            if (res.status === 'rejected') {
              const op = chunk[k];
              const parts = op.ref.path.split('/');
              if (parts.length === 4 && parts[0] === 'users') {
                const [, tUid, entityType, entityId] = parts;
                syncQueue.enqueue(entityType as any, entityId, 'upsert', tUid, op.data);
              }
            }
          }
        }
      }

      // Commit sharedOperations in an isolated batch so shared permissions never block personal sync.
      // [v7.5.56] Honest result: a failed/skipped shared batch used to be
      // swallowed ("skipped") while syncDataToCloud still returned true.
      // Now a failed shared write falls back to per-document writes, the
      // still-failing ones are queued to syncQueue ('sharedWallets' entity,
      // bounded retry), and the sync reports false with an honest error —
      // personal data synced, shared data did NOT.
      let sharedFailed = 0;
      const sharedFailedPaths: string[] = [];
      if (sharedOperations.length > 0) {
        for (let i = 0; i < sharedOperations.length; i += CHUNK_SIZE) {
          const chunk = sharedOperations.slice(i, i + CHUNK_SIZE);
          try {
            const swBatch = writeBatch(db);
            for (const op of chunk) {
              swBatch.set(op.ref, cleanForFirestore(op.data), { merge: true });
            }
            await withTimeout(swBatch.commit(), 10000);
          } catch (batchErr) {
            console.warn('Shared wallet batch failed, falling back to per-document writes:', batchErr);
            const results = await Promise.allSettled(
              chunk.map(async (op) => {
                await setDoc(op.ref, cleanForFirestore(op.data), { merge: true });
                return op.ref.path;
              })
            );
            for (let k = 0; k < results.length; k++) {
              if (results[k].status === 'rejected') {
                const op = chunk[k];
                sharedFailed++;
                sharedFailedPaths.push(op.ref.path);
                // Queue for bounded retry via syncQueue (permission-denied
                // gives up after 2 attempts and surfaces via dead letter).
                const parts = String(op.ref.path || '').split('/');
                if (parts.length >= 2 && parts[0] === 'sharedWallets') {
                  const entityId = parts.slice(1).join('/');
                  syncQueue.enqueue('sharedWallets', entityId, 'upsert', uid, op.data);
                }
              }
            }
          }
        }
      }

      if (sharedFailed > 0) {
        console.error('[syncDataToCloud] ' + sharedFailed + ' shared write(s) failed:', sharedFailedPaths.slice(0, 20));
        setSyncError(
          'Shared Wallet ' + sharedFailed + ' ခု Cloud သို့ မရောက်ပါ — ပြန်ကြိုးစားနေပါသည်။ ကိုယ်ပိုင်ဒေတာများ Cloud သို့ ရောက်ပြီးပါပြီ။'
        );
        return false;
      }

      lastSyncedSignatureRef.current = currentSig;
      const now = new Date();
      setLastSyncedAt(now);
      safeSetItem('ngwe_last_synced', now.toISOString());
      return true;
    } catch (error: any) {
      console.error('Sync to cloud error:', error);
      handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
      const errStr = String(error?.message || error || '').toLowerCase();
      if (errStr.includes('resource-exhausted') || errStr.includes('quota')) {
        setSyncError('Cloud Write Quota ကုန်ဆုံးသွားပါသဖြင့် ယနေ့အတွက် ဒေတာများကို ဖုန်း/စက်ထဲတွင်သာ အော့ဖ်လိုင်း ဆက်လက်သိမ်းဆည်းထားပါမည်။ မနက်ဖြန်တွင် Cloud သို့ အလိုအလျောက် ပြန်လည် ချိတ်ဆက်ပေးပါမည်။');
      } else if (errStr.includes('401') || errStr.includes('unauthorized') || errStr.includes('unauthenticated') || errStr.includes('token-expired')) {
        setSyncError('401 Unauthorized: အကောင့် သက်တမ်းကုန်ဆုံးသွားပါသဖြင့် ပြန်လည် အကောင့်ဝင်ပေးပါ။ (စက်ထဲရှိ ဒေတာများ မပျောက်ပါ)');
      } else {
        setSyncError(error?.message || 'Sync failed');
      }
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  // Pull data from Cloud
  const pullDataFromCloud = async (overrideWorkspaceId?: string) => {
    if (!auth.currentUser) return null;
    const uid = auth.currentUser.uid;
    const targetUid = overrideWorkspaceId || currentWorkspaceId || uid;

    try {
      setIsSyncing(true);
      setSyncError(null);

      // Helper to fetch individual collections safely with server-first strategy to bypass stale IndexedDB caches
      async function safeFetch<T>(serverFn: () => Promise<T>, fallbackFn?: () => Promise<T>, timeoutMs: number = 15000): Promise<T | null> {
        try {
          return await withTimeout(serverFn(), timeoutMs);
        } catch {
          if (fallbackFn) {
            try {
              return await withTimeout(fallbackFn(), timeoutMs);
            } catch {}
          }
          return null;
        }
      }

      // Fetch all collections in parallel directly from Server first (with local fallback)
      const [
        userDocSnap,
        walletsSnap,
        txSnap,
        debtsSnap,
        catSnap,
        budgetSnap,
        shopsSnap,
        vehiclesSnap,
        fuelLogsSnap,
        maintSnap,
        tiresSnap,
        sharedDocs,
      ] = await Promise.all([
        safeFetch(
          () => getDocFromServer(doc(db, 'users', targetUid)),
          () => getDoc(doc(db, 'users', targetUid)),
          15000
        ),
        safeFetch(
          () => getDocsFromServer(collection(db, 'users', targetUid, 'wallets')),
          () => getDocs(collection(db, 'users', targetUid, 'wallets')),
          15000
        ),
        safeFetch(
          () => getDocsFromServer(collection(db, 'users', targetUid, 'transactions')),
          () => getDocs(collection(db, 'users', targetUid, 'transactions')),
          18000
        ),
        safeFetch(
          () => getDocsFromServer(collection(db, 'users', targetUid, 'debts')),
          () => getDocs(collection(db, 'users', targetUid, 'debts')),
          15000
        ),
        safeFetch(
          () => getDocsFromServer(collection(db, 'users', targetUid, 'categories')),
          () => getDocs(collection(db, 'users', targetUid, 'categories')),
          12000
        ),
        safeFetch(
          () => getDocsFromServer(collection(db, 'users', targetUid, 'budgets')),
          () => getDocs(collection(db, 'users', targetUid, 'budgets')),
          12000
        ),
        safeFetch(
          () => getDocsFromServer(collection(db, 'users', targetUid, 'shops')),
          () => getDocs(collection(db, 'users', targetUid, 'shops')),
          12000
        ),
        safeFetch(
          () => getDocsFromServer(collection(db, 'users', targetUid, 'vehicles')),
          () => getDocs(collection(db, 'users', targetUid, 'vehicles')),
          12000
        ),
        safeFetch(
          () => getDocsFromServer(collection(db, 'users', targetUid, 'fuelLogs')),
          () => getDocs(collection(db, 'users', targetUid, 'fuelLogs')),
          12000
        ),
        safeFetch(
          () => getDocsFromServer(collection(db, 'users', targetUid, 'vehicleMaintenance')),
          () => getDocs(collection(db, 'users', targetUid, 'vehicleMaintenance')),
          12000
        ),
        safeFetch(
          () => getDocsFromServer(collection(db, 'users', targetUid, 'tirePressureLogs')),
          () => getDocs(collection(db, 'users', targetUid, 'tirePressureLogs')),
          12000
        ),
        // [v7.5.56] sharedWallets list is DISABLED in the rules
        // (allow list: if false), so the old ownerUid / sharedWith list
        // queries were always denied. Discover shared wallets via the
        // per-user refs collection, then get() each shared doc (get is
        // allowed for members). Owned shared wallets are fetched by their
        // canonical doc id — also a get(), never a list.
        // Returns docs shaped like { id, data(): SharedWalletPayload } so
        // the merge block below is unchanged.
        (async () => {
          const docs: { id: string; data: () => any }[] = [];
          const seen = new Set<string>();
          const pushDoc = (snap: any) => {
            if (snap && snap.exists() && !seen.has(snap.id)) {
              seen.add(snap.id);
              docs.push({ id: snap.id, data: () => snap.data() });
            }
          };
          try {
            // (a) Incoming shares via my refs.
            const me = (auth.currentUser?.email || '').trim().toLowerCase();
            if (me) {
              const refs = await fetchMyRefs(me).catch(() => []);
              for (const r of refs) {
                const snap = await getDoc(doc(db, 'sharedWallets', r.docId)).catch(() => null);
                pushDoc(snap);
              }
            }
            // (b) Owned shared wallets: my own wallets subcollection is
            // fetched above (walletsSnap), so their shared docs are known
            // by canonical id. They are fetched here, after walletsSnap
            // resolves — see the post-fetch loop below; this IIFE only
            // covers refs. Owned docs are appended in the merge section.
          } catch {
            // Discovery failure must not fail the whole pull.
          }
          return docs;
        })(),
      ]);

      let userPlan: PlanType | undefined = undefined;
      let premiumExpiresAt: string | undefined = undefined;
      let premiumActivatedAt: string | undefined = undefined;
      let premiumMonths: number | undefined = undefined;

      if (userDocSnap && userDocSnap.exists()) {
        const uData = userDocSnap.data();
        userPlan = uData.plan as PlanType;
        premiumExpiresAt = uData.premiumExpiresAt;
        premiumActivatedAt = uData.premiumActivatedAt;
        premiumMonths = uData.premiumMonths;
        
        // Update user profile state if it's our own
        if (targetUid === uid) {
          const profile = {
            plan: userPlan,
            premiumExpiresAt,
            premiumActivatedAt,
            premiumMonths,
            premiumCodeUsed: uData.premiumCodeUsed,
          };
          setUserProfile(profile);
          safeSetItem('ngwe_user_profile', JSON.stringify(profile));
        }
      }

      // Process fetched docs (include all valid documents returned from collection)
      const allWallets = walletsSnap ? walletsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Wallet)) : [];
      const allTransactions = txSnap ? txSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Transaction)) : [];

      // Wallet-level collaboration filtering
      const userEmail = (auth.currentUser?.email || '').trim().toLowerCase();
      const isOwnWorkspace = targetUid === uid;
      const targetUserEmail = userDocSnap && userDocSnap.exists() ? (userDocSnap.data()?.email || '') : '';

      const walletMap = new Map<string, Wallet>();
      allWallets.forEach((w) => walletMap.set(w.id, w));

      const txMap = new Map<string, Transaction>();
      allTransactions.forEach((t) => txMap.set(t.id, t));

      // [v7.5.56] Owned shared wallets: fetch each shared doc by its
      // canonical id (a get(), never a list) so the owner's own shared
      // wallets still get their balance/metadata refreshed on cold pull.
      const allSharedDocs = [...(sharedDocs || [])];
      {
        const seenIds = new Set(allSharedDocs.map((d) => d.id));
        for (const w of allWallets) {
          if (Array.isArray(w.sharedWith) && w.sharedWith.length > 0 && !w.isSharedFromOther) {
            const docId = getSharedWalletDocId(w, uid);
            if (seenIds.has(docId)) continue;
            seenIds.add(docId);
            const snap = await getDoc(doc(db, 'sharedWallets', docId)).catch(() => null);
            if (snap && snap.exists()) {
              allSharedDocs.push({ id: snap.id, data: () => snap.data() });
            }
          }
        }
      }

      // Query & merge top-level sharedWallets subcollections
      // (wallets discovered via refs above, plus owned docs just fetched)
      if (allSharedDocs.length > 0) {
        for (const sDoc of allSharedDocs) {
          const sData = sDoc.data();
          if (!sData) continue;

          const isMine =
            (sData.ownerUid && sData.ownerUid === uid) ||
            (sData.ownerEmail && sData.ownerEmail.trim().toLowerCase() === userEmail);
          const sharedList: string[] = Array.isArray(sData.sharedWith) ? sData.sharedWith : [];
          const isSharedToMe = sharedList.some(
            (e) => typeof e === 'string' && e.trim().toLowerCase() === userEmail
          );

          if (isMine || isSharedToMe) {
            const rawWalletId = sData.id || sDoc.id.replace(/^[a-zA-Z0-9]+_/, '');
            
            // Sync/update shared wallet balance and metadata
            const existingWallet = walletMap.get(rawWalletId) || walletMap.get(sDoc.id);
            if (existingWallet) {
              walletMap.set(existingWallet.id, {
                ...existingWallet,
                balance:
                  typeof sData.balance === 'number' && !isNaN(sData.balance)
                    ? sData.balance
                    : sData.balance !== undefined && !isNaN(Number(sData.balance))
                    ? Number(sData.balance)
                    : existingWallet.balance,
                sharedWith: sharedList.length > 0 ? sharedList : existingWallet.sharedWith,
                sharedDocId: sDoc.id,
                // [v7.5.56] Cold pull MUST set the same fields the live
                // listener sets, or the wallet counts differently on cold
                // start vs after the listener fires (finding 14).
                ...(sData.includeInTotals !== undefined
                  ? { includeInTotals: sData.includeInTotals !== false }
                  : {}),
                ...(sData.exchangeRate !== undefined
                  ? { exchangeRate: Number(sData.exchangeRate) || 1 }
                  : {}),
                ...(sData.initialBalance !== undefined
                  ? { initialBalance: Number(sData.initialBalance) }
                  : {}),
              });
            } else if (isSharedToMe) {
              // [v7.5.56] Mirror subscribeIncomingSharedWallets exactly:
              // includeInTotals, exchangeRate, initialBalance included.
              // Never fall back to the literal 'Partner' (finding 35) —
              // use the owner email / its prefix, or '' when unknown.
              const sharedWalletObj: Wallet = {
                id: `shared_${sDoc.id}`,
                originalId: rawWalletId,
                sharedDocId: sDoc.id,
                name: sData.name || 'Shared Wallet',
                nameEn: sData.nameEn || sData.name || 'Shared Wallet',
                balance: Number(sData.balance) || 0,
                initialBalance: sData.initialBalance !== undefined ? Number(sData.initialBalance) : undefined,
                includeInTotals: sData.includeInTotals !== false,
                color: sData.color || '#6366F1',
                icon: sData.icon || 'Wallet',
                currency: sData.currency || 'MMK',
                exchangeRate: sData.exchangeRate || 1,
                sharedWith: sharedList,
                ownerUid: sData.ownerUid || '',
                ownerEmail: sData.ownerEmail || '',
                ownerName: sData.ownerName || (sData.ownerEmail ? sData.ownerEmail.split('@')[0] : ''),
                isSharedFromOther: true,
              };
              walletMap.set(sharedWalletObj.id, sharedWalletObj);
            } else if (isMine) {
              // [v7.5.56] Transferred-ownership case: the viewer now OWNS
              // this shared doc but has no local copy — create it as an
              // owned wallet (not shared-from-other), or a later cold
              // pull drops it from state entirely.
              const ownedWalletObj: Wallet = {
                id: rawWalletId,
                originalId: rawWalletId,
                sharedDocId: sDoc.id,
                name: sData.name || 'Shared Wallet',
                nameEn: sData.nameEn || sData.name || 'Shared Wallet',
                balance: Number(sData.balance) || 0,
                initialBalance: sData.initialBalance !== undefined ? Number(sData.initialBalance) : undefined,
                includeInTotals: sData.includeInTotals !== false,
                color: sData.color || '#6366F1',
                icon: sData.icon || 'Wallet',
                currency: sData.currency || 'MMK',
                exchangeRate: sData.exchangeRate || 1,
                sharedWith: sharedList,
                ownerUid: sData.ownerUid || '',
                ownerEmail: sData.ownerEmail || '',
                ownerName: sData.ownerName || (sData.ownerEmail ? sData.ownerEmail.split('@')[0] : ''),
                isSharedFromOther: false,
              };
              walletMap.set(ownedWalletObj.id, ownedWalletObj);
            }

            // Fetch shared transactions subcollection
            try {
              const sharedTxsSnap = await getDocs(collection(db, 'sharedWallets', sDoc.id, 'transactions')).catch(() => null);
              if (sharedTxsSnap && !sharedTxsSnap.empty) {
                sharedTxsSnap.docs.forEach((tDoc) => {
                  const tData = { id: tDoc.id, ...tDoc.data() } as Transaction;
                  if (tData && tData.id && !txMap.has(tData.id)) {
                    txMap.set(tData.id, tData);
                  }
                });
              }
            } catch (err) {
              // Ignore subcollection error
            }
          }
        }
      }

      const visibleWallets = Array.from(walletMap.values());
      const visibleTransactions = Array.from(txMap.values());

      const debts = debtsSnap ? debtsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Debt)) : [];
      const categories = catSnap ? catSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Category)) : [];
      const budgets = budgetSnap ? budgetSnap.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as Budget)) : [];
      const shops = shopsSnap ? shopsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ShopContact)) : [];
      const vehicles = vehiclesSnap ? vehiclesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Vehicle)) : [];
      const fuelLogs = fuelLogsSnap ? fuelLogsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as FuelLog)) : [];
      const maintenanceLogs = maintSnap ? maintSnap.docs.map((d) => ({ id: d.id, ...d.data() } as VehicleMaintenance)) : [];
      const tireLogs = tiresSnap ? tiresSnap.docs.map((d) => ({ id: d.id, ...d.data() } as TirePressureLog)) : [];

      const now = new Date();
      setLastSyncedAt(now);
      safeSetItem('ngwe_last_synced', now.toISOString());

      // [v7.5.56] Sync-time reconcile: prune stale collaborators +
      // recompute owned shared wallet balances (fire-and-forget).
      void reconcileOwnedSharedWallets();

      return {
        transactions: visibleTransactions,
        debts: debts,
        wallets: visibleWallets.length > 0 ? visibleWallets : undefined,
        categories: categories.length > 0 ? categories : undefined,
        budgets: budgets.length > 0 ? budgets : undefined,
        shops: shops,
        vehicles: vehicles,
        fuelLogs: fuelLogs,
        maintenanceLogs: maintenanceLogs,
        tireLogs: tireLogs,
        plan: userPlan,
        premiumExpiresAt,
        premiumActivatedAt,
        premiumMonths,
      };
    } catch (error: any) {
      console.error('Pull from cloud error:', error);
      handleFirestoreError(error, OperationType.GET, `users/${targetUid}`);
      const errStr = String(error?.message || error || '').toLowerCase();
      if (errStr.includes('401') || errStr.includes('unauthorized') || errStr.includes('unauthenticated') || errStr.includes('token-expired')) {
        setSyncError('401 Unauthorized: အကောင့် သက်တမ်းကုန်ဆုံးသွားပါသဖြင့် ပြန်လည် အကောင့်ဝင်ပေးပါ။ (စက်ထဲရှိ ဒေတာများ မပျောက်ပါ)');
      } else {
        setSyncError(error?.message || 'Pull failed');
      }
      return null;
    } finally {
      setIsSyncing(false);
    }
  };

  // [v7.5.56] STOP writing users/{uid}.collaborators on share: the root
  // array grants NOTHING under the new rules (sharing lives on the wallet
  // doc's sharedWith + the per-recipient refs). This function now only
  // VALIDATES and returns the same codes callers check
  // (true / 'CANNOT_ADD_SELF' / 'ALREADY_EXISTS' / 'FREE_LIMIT_REACHED' /
  // 'INVALID_EMAIL' / 'NOT_LOGGED_IN') — the actual share write happens
  // in the wallet-share flow. Limits/duplicates are checked against the
  // distinct emails actually sharing >= 1 wallet with the owner.
  const addCollaborator = async (rawEmail: string): Promise<{ success: boolean; error?: string }> => {
    if (!auth.currentUser) return { success: false, error: 'NOT_LOGGED_IN' };
    const email = rawEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      return { success: false, error: 'INVALID_EMAIL' };
    }
    if (email === auth.currentUser.email?.toLowerCase()) {
      return { success: false, error: 'CANNOT_ADD_SELF' };
    }

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      const currentPlan = (userSnap.exists() ? (userSnap.data().plan as PlanType) : undefined)
        || userProfile?.plan
        || 'free';

      // Distinct emails sharing >= 1 wallet with the owner.
      const walletsSnap = await getDocs(collection(db, 'users', auth.currentUser.uid, 'wallets'));
      const sharing = new Set<string>();
      walletsSnap.docs.forEach((d) => {
        const w = d.data() as Wallet;
        if (Array.isArray(w.sharedWith)) {
          w.sharedWith.forEach((e) => {
            if (typeof e === 'string' && e.includes('@')) sharing.add(e.trim().toLowerCase());
          });
        }
      });

      if (sharing.has(email)) {
        return { success: false, error: 'ALREADY_EXISTS' };
      }

      // Free plan limit: max 2 collaborators
      if (currentPlan === 'free' && sharing.size >= 2) {
        return { success: false, error: 'FREE_LIMIT_REACHED' };
      }

      // No root-array write: the caller persists the share on the wallet
      // (sharedWith + refs). Returning success keeps the share flow moving.
      return { success: true };
    } catch (err: any) {
      console.error('Failed to add collaborator', err);
      return { success: false, error: err?.message || 'FAILED' };
    }
  };

  const clearAllCloudData = async (): Promise<boolean> => {
    if (!auth.currentUser) return true;
    const uid = auth.currentUser.uid;
    const targetUid = currentWorkspaceId || uid;

    try {
      setIsSyncing(true);
      setSyncError(null);

      const subcollections = ['transactions', 'debts', 'wallets', 'categories', 'budgets', 'shops', 'vehicles', 'fuelLogs', 'vehicleMaintenance', 'tirePressureLogs'];
      // [v6.9-phase1a] Track deletion failures so we can report honestly
      // instead of returning success even when some deletes failed.
      let deletionFailures = 0;
      const failedPaths: string[] = [];
      for (const subcol of subcollections) {
        try {
          const snap = await getDocs(collection(db, 'users', targetUid, subcol)).catch(() => null);
          if (snap && !snap.empty) {
            for (const docItem of snap.docs) {
              const ok = await safeDeleteDoc(docItem.ref);
              if (!ok) {
                deletionFailures++;
                failedPaths.push(subcol + '/' + docItem.id);
              }
            }
          }
        } catch (subErr) {
          console.warn('Error clearing subcollection ' + subcol + ':', subErr);
          deletionFailures++;
          failedPaths.push(subcol);
        }
      }
      if (deletionFailures > 0) {
        console.error('[clearAllCloudData] ' + deletionFailures + ' deletion(s) failed:', failedPaths.slice(0, 20));
        setSyncError(
          'Cloud ဒေတာ ' + deletionFailures + ' ခု ဖျက်ခြင်း မပြီးမြောက်ပါ။ အင်တာနက် စစ်ပြီး ပြန်ကြိုးစားပါ။'
        );
        return false;
      }

      // Re-create initial default wallet in Firestore so account remains valid
      try {
        const defaultWalletRef = doc(db, 'users', targetUid, 'wallets', 'cash');
        await safeSetDoc(defaultWalletRef, {
          id: 'cash',
          name: 'ငွေသား (လက်ဝယ်)',
          nameEn: 'Cash',
          balance: 0,
          color: '#10B981',
          icon: 'Banknote',
          isDefault: true,
          userId: targetUid,
        });
      } catch (wErr) {
        console.warn('Could not reset default cash wallet in cloud:', wErr);
      }

      const now = new Date();
      setLastSyncedAt(now);
      safeSetItem('ngwe_last_synced', now.toISOString());
      return true;
    } catch (err: any) {
      console.error('Failed to clear all cloud data:', err);
      setSyncError(err?.message || 'Failed to clear cloud data');
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  // [v7.5.56] Delete the signed-in account (decision 24). No delete-account
  // handler existed anywhere in src, so this is new.
  // Flow: (1) BLOCK if the user owns shared wallets — they must transfer
  // ownership first (transfer UI is another worker's job); the returned
  // ownedSharedWallets list names them. (2) Re-authenticate — Firebase
  // requires a recent login to delete a user (password users pass their
  // password; Google users get a re-auth popup). (3) Delete the user's
  // Firestore data (all personal subcollections + user doc + admin doc +
  // the user's own discovery refs). Wallets the user only JOINS are NOT
  // deleted — they belong to their owners; the user's refs to them are
  // removed and the user stays listed in sharedWith until the owner
  // removes them (members cannot edit the shared doc). (4) Delete the
  // Auth user and clear local state.
  const deleteAccount = async (
    password?: string
  ): Promise<{ success: boolean; error?: string; ownedSharedWallets?: string[] }> => {
    const cu = auth.currentUser;
    if (!cu) return { success: false, error: 'NOT_LOGGED_IN' };
    const uid = cu.uid;

    try {
      // (1) Owned shared wallets block deletion — no silent orphans.
      const walletsSnap = await getDocs(collection(db, 'users', uid, 'wallets'));
      const ownedShared: string[] = [];
      walletsSnap.docs.forEach((d) => {
        const w = d.data() as Wallet;
        if (Array.isArray(w.sharedWith) && w.sharedWith.length > 0) {
          ownedShared.push(w.name || d.id);
        }
      });
      if (ownedShared.length > 0) {
        return { success: false, error: 'OWNED_SHARED_WALLETS', ownedSharedWallets: ownedShared };
      }

      // (2) Re-authenticate (Firebase requires a recent login).
      const providerIds = (cu.providerData || []).map((p) => p.providerId);
      if (providerIds.includes('password')) {
        if (!password) return { success: false, error: 'PASSWORD_REQUIRED' };
        const cred = EmailAuthProvider.credential(cu.email || '', password);
        await reauthenticateWithCredential(cu, cred);
      } else {
        await reauthenticateWithPopup(cu, new GoogleAuthProvider());
      }

      // (3) Delete Firestore data.
      const subcollections = ['transactions', 'debts', 'wallets', 'categories', 'budgets', 'shops', 'vehicles', 'fuelLogs', 'vehicleMaintenance', 'tirePressureLogs'];
      for (const subcol of subcollections) {
        try {
          const snap = await getDocs(collection(db, 'users', uid, subcol)).catch(() => null);
          if (snap && !snap.empty) {
            for (const docItem of snap.docs) {
              await safeDeleteDoc(docItem.ref);
            }
          }
        } catch (subErr) {
          console.warn('deleteAccount: could not clear subcollection ' + subcol + ':', subErr);
        }
      }
      // Remove my own discovery refs so joined shared wallets stop
      // appearing for this (deleted) identity.
      const me = (cu.email || '').trim().toLowerCase();
      if (me) {
        const refs = await fetchMyRefs(me).catch(() => []);
        for (const r of refs) {
          await deleteSharedWalletRef(me, r.docId).catch(() => {});
        }
      }
      await safeDeleteDoc(doc(db, 'users', uid));
      await safeDeleteDoc(doc(db, 'admins', uid));

      // (4) Delete the Auth user, then clear local state.
      await deleteUser(cu);
      setUser(null);
      setUserProfile(null);
      setCollaborators([]);
      setSharedWalletScopeOverrides({});
      setInvitedWorkspaces([]);
      safeRemoveItem('ngwe_user_profile');
      safeRemoveItem('ngwe_plan');
      safeRemoveItem('ngwe_premium_expires_at');
      return { success: true };
    } catch (err: any) {
      console.error('Failed to delete account:', err);
      const code = String(err?.code || err?.message || '');
      if (code.includes('requires-recent-login')) {
        return { success: false, error: 'REQUIRES_RECENT_LOGIN' };
      }
      if (code.includes('wrong-password') || code.includes('invalid-credential') || code.includes('invalid-password')) {
        return { success: false, error: 'WRONG_PASSWORD' };
      }
      if (code.includes('popup-closed-by-user') || code.includes('cancelled-popup-request')) {
        return { success: false, error: 'REAUTH_CANCELLED' };
      }
      return { success: false, error: err?.message || 'FAILED' };
    }
  };

  const removeCollaborator = async (emailToRemove: string): Promise<boolean> => {
    if (!auth.currentUser) return false;
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        const currentCollaborators: string[] = Array.isArray(data.collaborators) ? data.collaborators : [];
        const updated = currentCollaborators.filter(
          (c) => c.toLowerCase() !== emailToRemove.toLowerCase()
        );
        await safeSetDoc(userRef, { collaborators: updated }, { merge: true });
        setCollaborators(updated);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to remove collaborator', err);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        isGuest: !user,
        isGuestSession,
        isSyncing,
        lastSyncedAt,
        syncError,
        isQuotaExhausted: isQuotaExhausted(),
        resumeNetworkFromQuota,
        isAdmin,
        showLoginModal,
        setShowLoginModal,
        loginWithGoogle,
        loginWithEmail,
        signupWithEmail,
        continueAsGuest,
        logout,
        refreshUserProfile,
        claimFreeTrial,
        syncDataToCloud,
        clearAllCloudData,
        pullDataFromCloud,
        activeWorkspaceId,
        setActiveWorkspaceId,
        switchWorkspace,
        invitedWorkspaces,
        collaborators,
        addCollaborator,
        removeCollaborator,
        sharedWalletScopeOverrides,
        updateSharedWalletScopeOverride,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
