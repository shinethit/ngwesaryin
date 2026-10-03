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

function getTodayKey(): string {
  const now = new Date();
  try {
    const ptDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    const y = ptDate.getFullYear();
    const m = String(ptDate.getMonth() + 1).padStart(2, '0');
    const d = String(ptDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  } catch {
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
  }
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

export function getTimeUntilUTCMidnight(): { hours: number; minutes: number; seconds: number; formatted: string } {
  const now = new Date();
  try {
    const ptNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    const ptTomorrowMidnight = new Date(ptNow.getFullYear(), ptNow.getMonth(), ptNow.getDate() + 1, 0, 0, 0);
    const diffMs = Math.max(0, ptTomorrowMidnight.getTime() - ptNow.getTime());

    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const formatted = `${hours}h ${minutes}m ${seconds}s`;
    return { hours, minutes, seconds, formatted };
  } catch {
    const nextReset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
    const diffMs = Math.max(0, nextReset.getTime() - now.getTime());

    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const formatted = `${hours}h ${minutes}m ${seconds}s`;
    return { hours, minutes, seconds, formatted };
  }
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
    timeUntilReset: getTimeUntilUTCMidnight(),
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
}): { totalKB: number; totalMB: number; percentOfGB: number; documentCount: number } {
  // Approximate average doc sizes including index overhead:
  // Transaction: ~0.8 KB, Wallet: ~0.5 KB, User: ~1.2 KB, Code: ~0.4 KB, Msg: ~0.6 KB, Visitor: ~0.9 KB
  const txKB = counts.transactions * 0.8;
  const walletKB = counts.wallets * 0.5;
  const userKB = counts.users * 1.2;
  const codeKB = counts.activationCodes * 0.4;
  const msgKB = counts.systemMessages * 0.6;
  const visitorKB = counts.visitors * 0.9;

  const totalKB = Math.round((txKB + walletKB + userKB + codeKB + msgKB + visitorKB) * 10) / 10;
  const totalMB = Math.round((totalKB / 1024) * 100) / 100;
  const percentOfGB = Math.round((totalMB / 1024) * 1000) / 10;
  const documentCount =
    counts.transactions +
    counts.wallets +
    counts.users +
    counts.activationCodes +
    counts.systemMessages +
    counts.visitors;

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
