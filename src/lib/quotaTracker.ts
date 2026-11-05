/**
 * Firestore Quota & Usage Tracker Service
 * Tracks estimated document reads, writes, deletes and storage usage against
 * Firebase Firestore Free Tier Quota (50,000 Reads/day, 20,000 Writes/day, 20,000 Deletes/day, 1GB Storage)
 */

export interface QuotaCollectionBreakdown {
  reads: number;
  writes: number;
  deletes: number;
}

export interface DailyQuotaData {
  date: string; // YYYY-MM-DD
  reads: number;
  writes: number;
  deletes: number;
  cachedReadsSaved: number;
  collections: {
    [collectionName: string]: QuotaCollectionBreakdown;
  };
  lastOperationAt: string;
}

export interface QuotaOverviewStats {
  date: string;
  // Limits
  readLimit: number;
  writeLimit: number;
  deleteLimit: number;
  storageLimitMB: number;
  
  // Usage
  readsUsed: number;
  writesUsed: number;
  deletesUsed: number;
  
  // Remaining
  readsRemaining: number;
  writesRemaining: number;
  deletesRemaining: number;
  
  // Percentages
  readsPercent: number;
  writesPercent: number;
  deletesPercent: number;
  
  // Status
  readStatus: 'normal' | 'moderate' | 'warning' | 'critical' | 'exhausted';
  writeStatus: 'normal' | 'moderate' | 'warning' | 'critical' | 'exhausted';
  deleteStatus: 'normal' | 'moderate' | 'warning' | 'critical' | 'exhausted';
  overallStatus: 'normal' | 'warning' | 'critical' | 'exhausted';
  
  // Extra metrics
  cachedReadsSaved: number;
  lastOperationAt: string | null;
  timeUntilReset: {
    hours: number;
    minutes: number;
    seconds: number;
    formatted: string;
  };
  collections: {
    [collectionName: string]: QuotaCollectionBreakdown;
  };
}

export const FIRESTORE_LIMITS = {
  DAILY_READS: 50000,
  DAILY_WRITES: 20000,
  DAILY_DELETES: 20000,
  STORAGE_MB: 1024, // 1 GiB
  MAX_CONCURRENT_CONNECTIONS: 100,
} as const;

const STORAGE_KEY_PREFIX = 'ngwe_fs_quota_';
const EVENT_NAME = 'ngwe_fs_quota_update';

// [v7.5.60 S-51] The date bucket AND the "resets at" countdown MUST use
// ONE timezone.
// [v7.5.64 A-05] That timezone is now Pacific (America/Los_Angeles) —
// Google's real Firestore quota resets at Pacific midnight (~13:30
// Myanmar time), not UTC midnight (06:30 MMT). The UTC bucket used to
// roll over 7h before the real reset, so the dashboard claimed a fresh
// day while writes were still refused as quota-exhausted.
// getPacificNow() returns a Date whose wall-clock fields ARE the
// current Pacific time (same toLocaleString trick isQuotaExhausted()
// in firebase.ts uses to find the Pacific midnight).
function getPacificNow(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
}

function getTodayKey(): string {
  const pt = getPacificNow();
  const y = pt.getFullYear();
  const m = String(pt.getMonth() + 1).padStart(2, '0');
  const d = String(pt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function loadTodayQuotaData(): DailyQuotaData {
  const today = getTodayKey();
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${today}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.date === today) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse quota data:', e);
  }

  // Initial fresh structure for today
  return {
    date: today,
    reads: 0,
    writes: 0,
    deletes: 0,
    cachedReadsSaved: 0,
    collections: {
      transactions: { reads: 0, writes: 0, deletes: 0 },
      wallets: { reads: 0, writes: 0, deletes: 0 },
      users: { reads: 0, writes: 0, deletes: 0 },
      activationCodes: { reads: 0, writes: 0, deletes: 0 },
      systemMessages: { reads: 0, writes: 0, deletes: 0 },
      visitors: { reads: 0, writes: 0, deletes: 0 },
      categories: { reads: 0, writes: 0, deletes: 0 },
      debts: { reads: 0, writes: 0, deletes: 0 },
      system: { reads: 0, writes: 0, deletes: 0 },
    },
    lastOperationAt: new Date().toISOString(),
  };
}

export function saveQuotaData(data: DailyQuotaData): void {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${data.date}`, JSON.stringify(data));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: data }));
    }
  } catch (e) {
    console.warn('Failed to save quota stats:', e);
  }
}

/**
 * Record a Firestore Read, Write, or Delete operation
 */
export function recordFirestoreOp(
  type: 'read' | 'write' | 'delete' | 'cached_read',
  collectionName: string = 'system',
  count: number = 1
): void {
  if (count <= 0) return;
  const data = loadTodayQuotaData();
  const normalizedCol = normalizeCollectionName(collectionName);

  if (!data.collections[normalizedCol]) {
    data.collections[normalizedCol] = { reads: 0, writes: 0, deletes: 0 };
  }

  if (type === 'read') {
    data.reads += count;
    data.collections[normalizedCol].reads += count;
  } else if (type === 'write') {
    data.writes += count;
    data.collections[normalizedCol].writes += count;
  } else if (type === 'delete') {
    data.deletes += count;
    data.collections[normalizedCol].deletes += count;
  } else if (type === 'cached_read') {
    data.cachedReadsSaved += count;
  }

  data.lastOperationAt = new Date().toISOString();
  saveQuotaData(data);
}

function normalizeCollectionName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('transaction')) return 'transactions';
  if (lower.includes('wallet')) return 'wallets';
  if (lower.includes('user') || lower.includes('admin')) return 'users';
  if (lower.includes('code') || lower.includes('activation')) return 'activationCodes';
  if (lower.includes('message') || lower.includes('broadcast')) return 'systemMessages';
  if (lower.includes('visitor') || lower.includes('analytic')) return 'visitors';
  if (lower.includes('categor')) return 'categories';
  if (lower.includes('debt') || lower.includes('repay')) return 'debts';
  return 'system';
}

function getStatusLevel(used: number, limit: number): 'normal' | 'moderate' | 'warning' | 'critical' | 'exhausted' {
  if (used >= limit) return 'exhausted';
  const pct = (used / limit) * 100;
  if (pct >= 90) return 'critical';
  if (pct >= 75) return 'warning';
  if (pct >= 50) return 'moderate';
  return 'normal';
}

export function getTimeUntilPacificMidnight(): { hours: number; minutes: number; seconds: number; formatted: string } {
  // [v7.5.64 A-05] Counts to the next Pacific midnight (Google's real
  // quota reset, ~13:30 MMT) — was UTC midnight. Both operands are in
  // the getPacificNow() shifted frame, so the difference is real ms.
  const pt = getPacificNow();
  const nextReset = new Date(pt.getFullYear(), pt.getMonth(), pt.getDate() + 1, 0, 0, 0);
  const diffMs = Math.max(0, nextReset.getTime() - pt.getTime());
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const formatted = `${hours}h ${minutes}m ${seconds}s`;
  return { hours, minutes, seconds, formatted };
}

export function getQuotaOverviewStats(): QuotaOverviewStats {
  const data = loadTodayQuotaData();
  const readLimit = FIRESTORE_LIMITS.DAILY_READS;
  const writeLimit = FIRESTORE_LIMITS.DAILY_WRITES;
  const deleteLimit = FIRESTORE_LIMITS.DAILY_DELETES;

  const readsUsed = data.reads;
  const writesUsed = data.writes;
  const deletesUsed = data.deletes;

  const readsRemaining = Math.max(0, readLimit - readsUsed);
  const writesRemaining = Math.max(0, writeLimit - writesUsed);
  const deletesRemaining = Math.max(0, deleteLimit - deletesUsed);

  const readsPercent = Math.min(100, Math.round((readsUsed / readLimit) * 1000) / 10);
  const writesPercent = Math.min(100, Math.round((writesUsed / writeLimit) * 1000) / 10);
  const deletesPercent = Math.min(100, Math.round((deletesUsed / deleteLimit) * 1000) / 10);

  const readStatus = getStatusLevel(readsUsed, readLimit);
  const writeStatus = getStatusLevel(writesUsed, writeLimit);
  const deleteStatus = getStatusLevel(deletesUsed, deleteLimit);

  let overallStatus: 'normal' | 'warning' | 'critical' | 'exhausted' = 'normal';
  if (readStatus === 'exhausted' || writeStatus === 'exhausted' || deleteStatus === 'exhausted') {
    overallStatus = 'exhausted';
  } else if (readStatus === 'critical' || writeStatus === 'critical' || deleteStatus === 'critical') {
    overallStatus = 'critical';
  } else if (readStatus === 'warning' || writeStatus === 'warning' || deleteStatus === 'warning') {
    overallStatus = 'warning';
  }

  return {
    date: data.date,
    readLimit,
    writeLimit,
    deleteLimit,
    storageLimitMB: FIRESTORE_LIMITS.STORAGE_MB,
    readsUsed,
    writesUsed,
    deletesUsed,
    readsRemaining,
    writesRemaining,
    deletesRemaining,
    readsPercent,
    writesPercent,
    deletesPercent,
    readStatus,
    writeStatus,
    deleteStatus,
    overallStatus,
    cachedReadsSaved: data.cachedReadsSaved,
    lastOperationAt: data.lastOperationAt,
    timeUntilReset: getTimeUntilPacificMidnight(),
    collections: data.collections,
  };
}

export function subscribeQuotaUpdates(callback: (stats: QuotaOverviewStats) => void): () => void {
  const handler = () => {
    callback(getQuotaOverviewStats());
  };

  if (typeof window !== 'undefined') {
    window.addEventListener(EVENT_NAME, handler);
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener(EVENT_NAME, handler);
    }
  };
}

export function clearTodayQuotaStats(): void {
  const today = getTodayKey();
  const empty: DailyQuotaData = {
    date: today,
    reads: 0,
    writes: 0,
    deletes: 0,
    cachedReadsSaved: 0,
    collections: {
      transactions: { reads: 0, writes: 0, deletes: 0 },
      wallets: { reads: 0, writes: 0, deletes: 0 },
      users: { reads: 0, writes: 0, deletes: 0 },
      activationCodes: { reads: 0, writes: 0, deletes: 0 },
      systemMessages: { reads: 0, writes: 0, deletes: 0 },
      visitors: { reads: 0, writes: 0, deletes: 0 },
      categories: { reads: 0, writes: 0, deletes: 0 },
      debts: { reads: 0, writes: 0, deletes: 0 },
      system: { reads: 0, writes: 0, deletes: 0 },
    },
    lastOperationAt: new Date().toISOString(),
  };
  saveQuotaData(empty);
}

/**
 * Approximate storage in KB/MB based on record counts
 */
export function estimateFirestoreStorage(counts: {
  transactions: number;
  wallets: number;
  users: number;
  activationCodes: number;
  systemMessages: number;
  visitors: number;
  // [v7.5.64 A-08] Optional extra collections (0 when not supplied).
  // sharedWallets is deliberately NOT here: Firestore rules disable
  // list on /sharedWallets, so an admin client cannot count it.
  categories?: number;
  debts?: number;
  vehicles?: number;
  fuelLogs?: number;
  vehicleMaintenance?: number;
  tirePressureLogs?: number;
  budgets?: number;
  savingsTargets?: number;
  shops?: number;
  feedbacks?: number;
  admins?: number;
}): { totalKB: number; totalMB: number; percentOfGB: number; documentCount: number } {
  // Approximate average doc sizes including index overhead:
  // Transaction: ~0.8 KB, Wallet: ~0.5 KB, User: ~1.2 KB, Code: ~0.4 KB, Msg: ~0.6 KB, Visitor: ~0.9 KB
  // Category: ~0.4 KB, Debt: ~0.7 KB, Vehicle: ~0.8 KB, Fuel log: ~0.7 KB, Maintenance: ~0.7 KB,
  // Tire log: ~0.5 KB, Budget: ~0.4 KB, Savings target: ~0.5 KB, Shop: ~0.5 KB, Feedback: ~0.8 KB, Admin: ~0.6 KB
  const txKB = counts.transactions * 0.8;
  const walletKB = counts.wallets * 0.5;
  const userKB = counts.users * 1.2;
  const codeKB = counts.activationCodes * 0.4;
  const msgKB = counts.systemMessages * 0.6;
  const visitorKB = counts.visitors * 0.9;
  const extraKB =
    (counts.categories ?? 0) * 0.4 +
    (counts.debts ?? 0) * 0.7 +
    (counts.vehicles ?? 0) * 0.8 +
    (counts.fuelLogs ?? 0) * 0.7 +
    (counts.vehicleMaintenance ?? 0) * 0.7 +
    (counts.tirePressureLogs ?? 0) * 0.5 +
    (counts.budgets ?? 0) * 0.4 +
    (counts.savingsTargets ?? 0) * 0.5 +
    (counts.shops ?? 0) * 0.5 +
    (counts.feedbacks ?? 0) * 0.8 +
    (counts.admins ?? 0) * 0.6;

  const totalKB = Math.round((txKB + walletKB + userKB + codeKB + msgKB + visitorKB + extraKB) * 10) / 10;
  const totalMB = Math.round((totalKB / 1024) * 100) / 100;
  const percentOfGB = Math.round((totalMB / 1024) * 1000) / 10;
  const documentCount =
    counts.transactions +
    counts.wallets +
    counts.users +
    counts.activationCodes +
    counts.systemMessages +
    counts.visitors +
    (counts.categories ?? 0) +
    (counts.debts ?? 0) +
    (counts.vehicles ?? 0) +
    (counts.fuelLogs ?? 0) +
    (counts.vehicleMaintenance ?? 0) +
    (counts.tirePressureLogs ?? 0) +
    (counts.budgets ?? 0) +
    (counts.savingsTargets ?? 0) +
    (counts.shops ?? 0) +
    (counts.feedbacks ?? 0) +
    (counts.admins ?? 0);

  return { totalKB, totalMB, percentOfGB, documentCount };
}

/**
 * Forcefully marks the write quota as exhausted on the client side
 * when an actual HTTP 429 response is detected from the network.
 */
export function forceWritesExhausted(): void {
  const data = loadTodayQuotaData();
  data.writes = FIRESTORE_LIMITS.DAILY_WRITES;
  data.lastOperationAt = new Date().toISOString();
  saveQuotaData(data);
}
