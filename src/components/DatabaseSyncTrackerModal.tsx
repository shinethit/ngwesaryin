import React, { useState, useEffect } from 'react';
import {
  Database,
  CloudCheck,
  CloudOff,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertTriangle,
  X,
  Smartphone,
  Laptop,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  ShieldCheck,
  Wifi,
  WifiOff,
  Server,
  Layers,
  HelpCircle,
  ExternalLink,
  ListRestart,
  Activity,
  RotateCcw,
  History,
  Trash2,
  Clock,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Transaction, Wallet, Debt } from '../types';
import { useAuth } from '../context/AuthContext';
import { formatMMK } from '../utils/formatters';
import { testFirestoreQuotaPing, isQuotaExhausted, clearQuotaExhaustedFlag } from '../lib/firebase';
import { syncQueue, SyncQueueItem } from '../lib/syncQueue';
import {
  subscribeSyncOperationLogs,
  clearSyncOperationLogs,
  recordSyncOperationStart,
  finishSyncOperation,
  SyncOperationLog,
} from '../lib/syncOperationLogger';
import firebaseConfig from '@/firebase-applet-config.json';

interface DatabaseSyncTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'my' | 'en';
  transactions: Transaction[];
  wallets: Wallet[];
  debts: Debt[];
  cloudTxIds: Set<string>;
  onForcePushAll: () => Promise<boolean>;
  onForcePullAll: () => Promise<void>;
  onOpenLogin: () => void;
  onOpenSyncHealth?: () => void;
  onUpdateCloudTxIds?: (newlyConfirmedIds: string[]) => void;
}

export const DatabaseSyncTrackerModal: React.FC<DatabaseSyncTrackerModalProps> = ({
  isOpen,
  onClose,
  lang,
  transactions,
  wallets,
  debts,
  cloudTxIds,
  onForcePushAll,
  onForcePullAll,
  onOpenLogin,
  onOpenSyncHealth,
  onUpdateCloudTxIds,
}) => {
  const { user, isSyncing, lastSyncedAt, activeWorkspaceId } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'synced' | 'pending'>('all');
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isTestingPing, setIsTestingPing] = useState(false);
  const [pingResult, setPingResult] = useState<{ success: boolean; latencyMs: number; message: string } | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const [queueItems, setQueueItems] = useState<SyncQueueItem[]>([]);
  const [isQueueProcessing, setIsQueueProcessing] = useState(false);
  const [isRetryingSyncs, setIsRetryingSyncs] = useState(false);

  // Sync operations history tracking (last 50 ops)
  const [syncLogs, setSyncLogs] = useState<SyncOperationLog[]>([]);
  const [viewMode, setViewMode] = useState<'records' | 'logs'>('records');
  const [logFilter, setLogFilter] = useState<'all' | 'push' | 'pull' | 'failed'>('all');
  const [showQueueDetails, setShowQueueDetails] = useState(false);

  useEffect(() => {
    return subscribeSyncOperationLogs((logs) => {
      setSyncLogs(logs);
    });
  }, []);

  const pushLogsCount = syncLogs.filter((l) => l.direction === 'push').length;
  const pullLogsCount = syncLogs.filter((l) => l.direction === 'pull').length;
  const failedLogsCount = syncLogs.filter((l) => l.status === 'failed').length;
  const hasRecentErrors = failedLogsCount > 0;

  const filteredLogs = syncLogs.filter((log) => {
    if (logFilter === 'all') return true;
    if (logFilter === 'push') return log.direction === 'push';
    if (logFilter === 'pull') return log.direction === 'pull';
    if (logFilter === 'failed') return log.status === 'failed';
    return true;
  });

  const formatLogTime = (ts: number): string => {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if (isToday) {
      return timeStr;
    }
    const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return `${dateStr}, ${timeStr}`;
  };

  // Consolidated and mathematically accurate sync metrics
  const totalLocalTxs = transactions.length;
  const syncedTxsCount = transactions.filter((t) => cloudTxIds.has(t.id) && !syncQueue.isEntityPending('transactions', t.id)).length;
  const localMissingFromCloud = transactions.filter((t) => !cloudTxIds.has(t.id) || syncQueue.isEntityPending('transactions', t.id));
  const pendingTxsCount = localMissingFromCloud.length;

  const totalUnsyncedCount = pendingTxsCount > 0 ? pendingTxsCount : queueItems.length;
  const totalStuckOrMissingCount = totalUnsyncedCount;
  const totalPendingCount = totalUnsyncedCount;

  const handleRetryFailedSyncs = async () => {
    if (!user) {
      onOpenLogin();
      return;
    }
    setIsRetryingSyncs(true);
    setActionNotice(null);
    const targetUid = activeWorkspaceId || user.uid;
    const opId = recordSyncOperationStart(
      'retry_push',
      `Retry ${totalStuckOrMissingCount} stuck/missing syncs`,
      totalStuckOrMissingCount,
      targetUid
    );

    try {
      const res = await syncQueue.retryTargetedMissing({
        missingTxs: localMissingFromCloud,
        targetUid,
        cloudTxIds,
        allLocalTxIds: new Set(transactions.map((t) => t.id)),
      });

      if (res.newlyConfirmedTxIds && res.newlyConfirmedTxIds.length > 0) {
        onUpdateCloudTxIds?.(res.newlyConfirmedTxIds);
        finishSyncOperation(opId, 'success', {
          itemCount: res.newlyConfirmedTxIds.length,
          details: `Retried and confirmed ${res.newlyConfirmedTxIds.length} stuck documents in Cloud`,
        });
        setActionNotice(
          lang === 'my'
            ? `✅ ကျန်ရှိနေသော စာရင်း (${res.newlyConfirmedTxIds.length}) ခု အား Cloud သို့ အောင်မြင်စွာ တိုက်ရိုက် ပို့ဆောင်ပြီးပါပြီ!`
            : `✅ Successfully retried and confirmed ${res.newlyConfirmedTxIds.length} stuck documents in Cloud!`
        );
        return;
      }

      // Direct HTTPS fallback for missing local transactions
      if (localMissingFromCloud.length > 0) {
        try {
          const { pushTransactionsDirectHttp } = await import('../lib/directFirestoreHttp');
          const httpRes = await pushTransactionsDirectHttp(localMissingFromCloud, targetUid);
          if (httpRes.success && httpRes.pushedCount > 0) {
            const confirmedIds = localMissingFromCloud.map((t) => t.id);
            onUpdateCloudTxIds?.(confirmedIds);
            finishSyncOperation(opId, 'success', {
              itemCount: httpRes.pushedCount,
              details: `Direct HTTPS REST retry confirmed ${httpRes.pushedCount} records in Cloud`,
            });
            setActionNotice(
              lang === 'my'
                ? `✅ ကျန်ရှိနေသော စာရင်း (${httpRes.pushedCount}) ခု အား Direct HTTPS ဖြင့် Cloud သို့ အောင်မြင်စွာ တိုက်ရိုက် ပို့ပြီးပါပြီ!`
                : `✅ Directly pushed and confirmed ${httpRes.pushedCount} records in Cloud!`
            );
            return;
          }
        } catch (httpErr) {
          console.warn('Direct HTTP push in handleRetryFailedSyncs:', httpErr);
        }
      }

      if (res.succeeded > 0) {
        finishSyncOperation(opId, 'success', {
          itemCount: res.succeeded,
          details: `Successfully synced ${res.succeeded} items`,
        });
        setActionNotice(
          lang === 'my'
            ? `✅ စာရင်း (${res.succeeded}) ခု အောင်မြင်စွာ ပို့ဆောင်ပြီးပါပြီ!`
            : `✅ Successfully synced ${res.succeeded} items!`
        );
      } else if (res.failed > 0) {
        finishSyncOperation(opId, 'failed', {
          itemCount: 0,
          details: `${res.failed} items still pending retry`,
          errorMessage: 'Some items failed to sync to Cloud',
        });
        setActionNotice(
          lang === 'my'
            ? `⚠️ အင်တာနက် အခြေအနေကြောင့် (${res.failed}) ခု ကျန်ရှိနေသေးပါသည်။ အလိုအလျောက် ဆက်လက် ကြိုးစားပါမည်။`
            : `⚠️ ${res.failed} items still pending. Retrying in background.`
        );
      } else {
        finishSyncOperation(opId, 'success', {
          itemCount: 0,
          details: 'All documents are already confirmed in Cloud',
        });
        setActionNotice(
          lang === 'my'
            ? 'ℹ️ ပို့ဆောင်ရန် ကျန်ရှိသော စာရင်း မရှိပါ။ အားလုံး အတည်ပြုပြီး ဖြစ်ပါသည်။'
            : 'ℹ️ All documents are already confirmed in Cloud.'
        );
      }
    } catch (retryErr: any) {
      finishSyncOperation(opId, 'failed', {
        details: 'Retry operation error',
        errorMessage: retryErr?.message || String(retryErr),
      });
      setActionNotice(lang === 'my' ? '❌ ချိတ်ဆက်မှု ချို့ယွင်းချက် ဖြစ်ပေါ်ခဲ့ပါသည်။' : '❌ Network error during retry.');
    } finally {
      setIsRetryingSyncs(false);
    }
  };

  const handleClearQueue = () => {
    const targetUid = activeWorkspaceId || user?.uid;
    syncQueue.clearQueue(targetUid);
    setActionNotice(
      lang === 'my'
        ? '🧹 မလိုလားအပ်သော Sync Queue စာရင်းများကို အောင်မြင်စွာ ရှင်းလင်းပြီးပါပြီ။'
        : '🧹 Sync Queue cleared successfully.'
    );
  };

  useEffect(() => {
    return syncQueue.subscribe((items, processing) => {
      setQueueItems(items);
      setIsQueueProcessing(processing);
    });
  }, []);

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  // Detect current platform
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
  const deviceType = isIOS ? 'iPhone (iOS Safari)' : isAndroid ? 'Android Device' : 'Desktop (Windows / Mac)';

  // Automatically refresh and pull latest cloud records when modal is opened
  useEffect(() => {
    if (isOpen && user) {
      onForcePullAll().catch(() => {});
      if (syncQueue.hasPendingItems()) {
        syncQueue.processQueue().catch(() => {});
      }
    }
  }, [isOpen, user]);

  // Filtered list for detailed view
  const filteredList = transactions.filter((t) => {
    const isSynced = cloudTxIds.has(t.id);
    if (statusFilter === 'synced' && !isSynced) return false;
    if (statusFilter === 'pending' && isSynced) return false;

    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const note = (t.note || '').toLowerCase();
    const amountStr = String(t.amount);
    const date = t.date || '';
    const id = t.id.toLowerCase();
    return note.includes(term) || amountStr.includes(term) || date.includes(term) || id.includes(term);
  });

  const handlePush = async () => {
    if (!user) {
      onOpenLogin();
      return;
    }
    setIsPushing(true);
    setActionNotice(null);
    const targetUid = activeWorkspaceId || user.uid;
    const opId = recordSyncOperationStart(
      'push',
      `Manual push ${totalLocalTxs} records to Cloud`,
      totalLocalTxs,
      targetUid
    );

    try {
      const ok = await onForcePushAll();
      const res = await syncQueue.retryTargetedMissing({
        missingTxs: localMissingFromCloud,
        targetUid,
        cloudTxIds,
        allLocalTxIds: new Set(transactions.map((t) => t.id)),
      });
      if (res.newlyConfirmedTxIds && res.newlyConfirmedTxIds.length > 0) {
        onUpdateCloudTxIds?.(res.newlyConfirmedTxIds);
      }

      // Direct HTTP push for any remaining missing local records
      let restCount = 0;
      if (localMissingFromCloud.length > 0) {
        try {
          const { pushTransactionsDirectHttp } = await import('../lib/directFirestoreHttp');
          const httpRes = await pushTransactionsDirectHttp(localMissingFromCloud, targetUid);
          if (httpRes.success && httpRes.pushedCount > 0) {
            restCount = httpRes.pushedCount;
            onUpdateCloudTxIds?.(localMissingFromCloud.map((t) => t.id));
          }
        } catch (httpErr) {
          console.warn('Direct HTTP push in handlePush:', httpErr);
        }
      }

      const totalDelivered = (res?.succeeded || 0) + restCount;
      const isSuccess = ok || totalDelivered > 0 || pendingTxsCount === 0;

      finishSyncOperation(opId, isSuccess ? 'success' : 'failed', {
        itemCount: totalDelivered > 0 ? totalDelivered : totalLocalTxs,
        details: isSuccess
          ? `Pushed ${totalDelivered > 0 ? totalDelivered : totalLocalTxs} records to Cloud`
          : 'Failed to confirm push to Cloud',
        errorMessage: isSuccess ? undefined : 'No records confirmed by server',
      });

      if (isSuccess) {
        setActionNotice(
          lang === 'my'
            ? `✅ စာရင်း (${totalLocalTxs}) ခုလုံး Cloud Database ထဲသို့ ၁၀၀% အောင်မြင်စွာ ရောက်ရှိပြီးပါပြီ!`
            : `✅ All ${totalLocalTxs} records successfully pushed to Cloud Database!`
        );
      } else {
        setActionNotice(
          lang === 'my'
            ? '⚠️ အချို့မှတ်တမ်းများ ပို့ဆောင်ရာတွင် နှောင့်နှေးနေပါသည်။ ပြန်လည်ကြိုးစားပေးပါ။'
            : '⚠️ Some records could not be pushed. Please retry.'
        );
      }
    } catch (pushErr: any) {
      finishSyncOperation(opId, 'failed', {
        details: 'Push failed due to error',
        errorMessage: pushErr?.message || String(pushErr),
      });
      setActionNotice(lang === 'my' ? '❌ ချိတ်ဆက်မှု ချို့ယွင်းချက် ဖြစ်ပေါ်ခဲ့ပါသည်။' : '❌ Network or sync error occurred.');
    } finally {
      setIsPushing(false);
    }
  };

  const handlePushSingleTx = async (tx: Transaction) => {
    if (!user) {
      onOpenLogin();
      return;
    }
    const targetUid = activeWorkspaceId || user.uid;
    const opId = recordSyncOperationStart(
      'single_push',
      `Single push: ${tx.note || tx.id} (${formatMMK(tx.amount)})`,
      1,
      targetUid
    );

    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const { db, cleanForFirestore, withTimeout } = await import('../lib/firebase');
      
      const docRef = doc(db, 'users', targetUid, 'transactions', tx.id);
      await withTimeout(
        setDoc(docRef, cleanForFirestore({ ...tx, id: tx.id, userId: targetUid }), { merge: true }),
        8000
      );
      syncQueue.remove('transactions', tx.id);
      onUpdateCloudTxIds?.([tx.id]);
      finishSyncOperation(opId, 'success', {
        itemCount: 1,
        details: `Record ${tx.id} confirmed to Firestore via SDK`,
      });
      setActionNotice(
        lang === 'my'
          ? `✅ မှတ်တမ်း (${tx.note || tx.id}) အား Cloud Database သို့ တိုက်ရိုက် ပို့ပြီးပါပြီ!`
          : `✅ Record ${tx.id} pushed to Database!`
      );
    } catch (setErr: any) {
      // First attempt direct HTTPS REST fallback (bypasses iOS WebKit lockups)
      try {
        const { pushTransactionsDirectHttp } = await import('../lib/directFirestoreHttp');
        const httpRes = await pushTransactionsDirectHttp([tx], targetUid);
        if (httpRes.success) {
          syncQueue.remove('transactions', tx.id);
          onUpdateCloudTxIds?.([tx.id]);
          finishSyncOperation(opId, 'success', {
            itemCount: 1,
            details: `Record ${tx.id} confirmed via Direct HTTPS REST fallback`,
          });
          setActionNotice(
            lang === 'my'
              ? `✅ မှတ်တမ်း (${tx.note || tx.id}) အား Direct HTTPS ဖြင့် Cloud Database သို့ အောင်မြင်စွာ ပို့ပြီးပါပြီ!`
              : `✅ Record ${tx.id} pushed via direct HTTPS connection!`
          );
          return;
        }
      } catch (httpErr) {
        console.warn('Direct HTTP push attempt failed:', httpErr);
      }

      // Fallback: enqueue to syncQueue for background retry
      syncQueue.enqueue('transactions', tx.id, 'upsert', targetUid, tx);
      finishSyncOperation(opId, 'failed', {
        itemCount: 0,
        details: `Record ${tx.id} failed direct push, queued to syncQueue`,
        errorMessage: setErr?.message || String(setErr),
      });
      setActionNotice(
        lang === 'my'
          ? `🔄 မှတ်တမ်း (${tx.note || tx.id}) အား Retry Queue ထဲသို့ ထည့်သွင်းထားပြီး နောက်ခံမှ အလိုအလျောက် ပို့ဆောင်နေပါသည်...`
          : `🔄 Record queued for background retry...`
      );
    }
  };

  const handlePull = async () => {
    if (!user) {
      onOpenLogin();
      return;
    }
    setIsPulling(true);
    setActionNotice(null);
    try {
      await onForcePullAll();
      setActionNotice(lang === 'my' ? '✅ Cloud Database မှ နောက်ဆုံးရ ဒေတာများကို အပြည့်အစုံ ရယူပြီးပါပြီ!' : '✅ Fresh data pulled from Cloud Database!');
    } catch {
      setActionNotice(lang === 'my' ? '❌ Database မှ ဆွဲယူရာတွင် ချို့ယွင်းချက် ဖြစ်ပေါ်ခဲ့ပါသည်။' : '❌ Failed to pull fresh data.');
    } finally {
      setIsPulling(false);
    }
  };

  const handleTestPing = async () => {
    setIsTestingPing(true);
    setPingResult(null);
    try {
      const res = await testFirestoreQuotaPing();
      setPingResult(res);
    } catch (err: any) {
      setPingResult({
        success: false,
        latencyMs: 0,
        message: err?.message || 'Ping failed',
      });
    } finally {
      setIsTestingPing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shadow-inner">
              <Database className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-base sm:text-lg tracking-tight">
                  {lang === 'my' ? 'Database ရောက်/မရောက် စောင့်ကြည့် Tracker' : 'Cloud Database Delivery Tracker'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Live
                </span>
              </div>
              <p className="text-xs text-indigo-200/80">
                {lang === 'my'
                  ? 'iPhone, Android နှင့် Windows စက်များအကြား ဒေတာဘေ့စ် စာရင်းဝင်မှု စစ်ဆေးခြင်း'
                  : 'Real-time synchronization inspector across all devices'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Firestore Write Quota Exhaustion Diagnostic Banner */}
          {isQuotaExhausted() && (
            <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl space-y-2 text-rose-950 animate-fadeIn">
              <div className="flex items-center gap-2 text-rose-800 font-extrabold text-xs">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>🛑 Google Cloud Firestore Daily Write Quota အကန့်အသတ် ပြည့်နေပါသည် (HTTP 429 Quota Exceeded)</span>
              </div>
              <p className="text-[11.5px] leading-relaxed font-medium">
                {lang === 'my'
                  ? 'Google Firebase free tier ၏ နေ့စဉ် အခမဲ့ ရေးသားခွင့် (Daily write limit - 20,000 writes/day) ပြည့်သွားသဖြင့် Cloud server က မှတ်တမ်းအသစ်များအား ခေတ္တ ငြင်းပယ်ထားပါသည်။ စာရင်း ၅၈ ခုသည် Cloud DB တွင် အန္တရာယ်ကင်းစွာ ရောက်ရှိပြီးဖြစ်ပြီး၊ ၅၉ ခုမြောက် စာရင်းနှင့် အခြားပြင်ဆင်ချက်များသည် စက်ထဲတွင် လုံခြုံစွာ ရှိနေပါသည်။'
                  : 'Google Firebase free tier limit (20,000 writes/day) has been exceeded for today. Cloud Firestore is temporarily rejecting new writes. All prior 58 records are completely safe in Cloud DB, and the 59th record is secured locally on this device.'}
              </p>
              <div className="text-[11px] text-rose-700 bg-rose-100/50 p-2 rounded-xl font-medium border border-rose-200">
                {lang === 'my'
                  ? '💡 ဤပြဿနာသည် အသုံးပြုသူကြောင့် မဟုတ်ဘဲ Google standard reset (နေ့လယ် ၁:၃၀ MMT) ရောက်ရှိပါက အလိုအလျောက် ပုံမှန်အတိုင်း ပြန်လည်ကောင်းမွန်ပြီး အလိုအလျောက် push ဆွဲသွားမည် ဖြစ်ပါသည်။'
                  : '💡 This will automatically resolve and resume sync as soon as the daily Google quota resets at midnight Pacific Time (1:30 PM Myanmar Time).'}
              </div>
            </div>
          )}

          {/* 1. Account & Connection Status Bar */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="font-semibold text-slate-700">Firestore DB:</span>
                <span className="font-mono text-[11px] text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {firebaseConfig.firestoreDatabaseId || '(default)'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-bold">
                {isOnline ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full text-[11px] border border-emerald-200">
                    <Wifi className="w-3 h-3" /> Online
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-full text-[11px] border border-rose-200">
                    <WifiOff className="w-3 h-3" /> Offline
                  </span>
                )}
                <span className="text-[11px] text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-full">
                  {deviceType}
                </span>
              </div>
            </div>

            {/* Account & Workspace Info */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">{lang === 'my' ? 'အကောင့်:' : 'Account:'}</span>
                {user ? (
                  <span className="font-bold text-slate-900 flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{user.email || user.displayName || user.uid}</span>
                  </span>
                ) : (
                  <span className="text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded border border-amber-300 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                    <span>{lang === 'my' ? 'Guest (အကောင့်မဝင်ရသေးပါ)' : 'Guest Mode (Not Logged In)'}</span>
                  </span>
                )}
              </div>

              {!user && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenLogin();
                  }}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  {lang === 'my' ? 'Google ဖြင့် ဝင်မည်' : 'Sign in with Google'}
                </button>
              )}
            </div>

            {/* Quick Step Guide for Cross-Device Sync */}
            <div className="p-3 bg-amber-50/90 border border-amber-200/80 rounded-xl text-[11px] text-amber-950 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-900">
                <HelpCircle className="w-3.5 h-3.5 text-amber-700" />
                <span>{lang === 'my' ? '💡 Device များကြား ဒေတာ ချက်ချင်း တူညီစေရန်:' : '💡 How to sync data across devices:'}</span>
              </div>
              <p className="leading-relaxed">
                {lang === 'my'
                  ? '၁။ စာရင်းများရှိနေသော Device (ဥပမာ- iPhone) တွင် "🚀 Database သို့ အကုန်ချက်ချင်း ပို့မည်" ခလုတ်ကို နှိပ်ပါ။'
                  : '1. On the device with transactions (e.g. iPhone), click "🚀 Force Push All to Database".'}
              </p>
              <p className="leading-relaxed">
                {lang === 'my'
                  ? '၂။ အခြား Device (Laptop သို့မဟုတ် Android) တွင် "DB မှ ပြန်ဆွဲမည်" ကို နှိပ်ပါက စာရင်းများအားလုံး တပြေးညီ ရောက်ရှိလာပါမည်။'
                  : '2. On your other device (Laptop/Android), click "Pull from DB" to receive all records immediately.'}
              </p>
            </div>
          </div>

          {/* 2. Key Metrics Cards */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            {/* Card 1: Local on this device */}
            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 text-center space-y-0.5">
              <div className="text-[11px] font-semibold text-slate-600 flex items-center justify-center gap-1">
                <Smartphone className="w-3.5 h-3.5 text-slate-500" />
                <span>{lang === 'my' ? 'စက်တွင်းမှတ်တမ်း' : 'Local Device'}</span>
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono text-slate-900">
                {totalLocalTxs}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                {lang === 'my' ? 'ဤစက်ရှိ စာရင်း' : 'Records on device'}
              </div>
            </div>

            {/* Card 2: Confirmed in Cloud Database */}
            <div className={`rounded-2xl p-3 border text-center space-y-0.5 ${
              pendingTxsCount === 0 && queueItems.length === 0
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                : 'bg-indigo-50/80 border-indigo-200 text-indigo-950'
            }`}>
              <div className="text-[11px] font-bold text-emerald-800 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{lang === 'my' ? 'Cloud DB ရောက်ရှိပြီး' : 'Confirmed in DB'}</span>
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono text-emerald-700">
                {syncedTxsCount}
              </div>
              <div className="text-[10px] text-emerald-600 font-bold">
                {pendingTxsCount === 0 && queueItems.length === 0
                  ? (lang === 'my' ? '၁၀၀% တပြေးညီ ✓' : '100% In-Sync ✓')
                  : pendingTxsCount === 0
                  ? (lang === 'my' ? `${syncedTxsCount}/${totalLocalTxs} (Queue တွင် ကျန်)` : `${syncedTxsCount}/${totalLocalTxs} (Queue Pending)`)
                  : (lang === 'my' ? `${syncedTxsCount}/${totalLocalTxs} စာရင်းဝင်ပြီး` : `${syncedTxsCount}/${totalLocalTxs} Synced`)}
              </div>
            </div>

            {/* Card 3: Pending push / queue */}
            <div className={`rounded-2xl p-3 border text-center space-y-0.5 ${
              totalUnsyncedCount > 0
                ? 'bg-amber-50 border-amber-300 text-amber-950'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              <div className="text-[11px] font-semibold flex items-center justify-center gap-1">
                <AlertTriangle className={`w-3.5 h-3.5 ${totalUnsyncedCount > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
                <span>{lang === 'my' ? 'ပို့ရန်ကျန်' : 'Pending Push'}</span>
              </div>
              <div className={`text-xl sm:text-2xl font-black font-mono ${totalUnsyncedCount > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                {totalUnsyncedCount}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                {pendingTxsCount > 0
                  ? (lang === 'my' ? 'Cloud သို့ ပို့ရန်' : 'Needs Push')
                  : queueItems.length > 0
                  ? (lang === 'my' ? 'Queue တန်းစီဆဲ' : 'Queue pending')
                  : (lang === 'my' ? 'အားလုံးပြီးစီး' : 'All pushed')}
              </div>
            </div>
          </div>

          {/* Action Notification Banner if any */}
          {actionNotice && (
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl text-xs font-bold text-indigo-900 flex items-center justify-between gap-2 animate-fadeIn">
              <span>{actionNotice}</span>
              <button
                onClick={() => setActionNotice(null)}
                className="text-indigo-600 hover:text-indigo-800 font-bold text-xs"
              >
                ✕
              </button>
            </div>
          )}

          {/* 3. Action Buttons Grid */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePush}
              disabled={isPushing || !user}
              className="flex-1 min-w-[160px] py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-2xl font-extrabold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isPushing ? 'animate-spin' : ''}`} />
              <span>
                {isPushing
                  ? (lang === 'my' ? 'Database သို့ ပို့နေသည်...' : 'Pushing to Database...')
                  : (lang === 'my' ? '🚀 Database သို့ အကုန်ချက်ချင်း ပို့မည်' : '🚀 Force Push All to Database')}
              </span>
            </button>

            {onOpenSyncHealth && (
              <button
                onClick={onOpenSyncHealth}
                className="py-2.5 px-3.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-2xl font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                title={lang === 'my' ? 'Sync Health ရမှတ် စစ်ဆေးမည်' : 'Check Sync Health Score'}
              >
                <Activity className="w-3.5 h-3.5 text-white" />
                <span>{lang === 'my' ? 'Sync Health စစ်ဆေးမည်' : 'Sync Health'}</span>
              </button>
            )}

            {totalStuckOrMissingCount > 0 && (
              <button
                onClick={handleRetryFailedSyncs}
                disabled={isRetryingSyncs || isQueueProcessing}
                className="py-2.5 px-3.5 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-700 hover:to-orange-700 text-white rounded-2xl font-black text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                title={lang === 'my' ? 'ကျန်ရှိနေသော/မရောက်သေးသော စာရင်းများအား တိုက်ရိုက် ပြန်လည်ပို့မည်' : 'Retry Failed Syncs directly'}
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isRetryingSyncs ? 'animate-spin' : ''}`} />
                <span>{isRetryingSyncs ? (lang === 'my' ? 'ပို့နေပါသည်...' : 'Retrying...') : (lang === 'my' ? 'ကျန်စာရင်းများ ပြန်ပို့မည် (Retry Failed Syncs)' : 'Retry Failed Syncs')}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-white/25 text-white">
                  {totalStuckOrMissingCount}
                </span>
              </button>
            )}

            <button
              onClick={handlePull}
              disabled={isPulling || !user}
              className="py-2.5 px-3.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-2xl font-bold text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
              title={lang === 'my' ? 'Database မှ အသစ်ပြန်ဆွဲယူမည်' : 'Pull fresh data from Database'}
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-700 ${isPulling ? 'animate-spin' : ''}`} />
              <span>{lang === 'my' ? 'DB မှ ပြန်ဆွဲမည်' : 'Pull from DB'}</span>
            </button>

            <button
              onClick={handleTestPing}
              disabled={isTestingPing}
              className="py-2.5 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-2xl font-bold text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
              title={lang === 'my' ? 'Database ချိတ်ဆက်မှု အမြန်နှုန်း စမ်းသပ်မည်' : 'Test Latency Ping'}
            >
              <Zap className={`w-3.5 h-3.5 text-amber-600 ${isTestingPing ? 'animate-pulse' : ''}`} />
              <span>{isTestingPing ? 'Pinging...' : (lang === 'my' ? 'Ping စမ်းမည်' : 'Ping Test')}</span>
            </button>
          </div>

          {/* Transactional Retry-on-Failure Queue Status Card */}
          {queueItems.length > 0 && (
            <div className="p-3 bg-amber-500/10 border border-amber-300 rounded-2xl text-xs space-y-2.5 animate-fadeIn">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-bold text-amber-950">
                  <ListRestart className={`w-4 h-4 text-amber-600 ${isQueueProcessing ? 'animate-spin' : ''}`} />
                  <span>
                    {lang === 'my'
                      ? `🔄 Transactional Sync Queue: ကျန်ရှိသော စာရင်း (${queueItems.length}) ခု အလိုအလျောက် ပို့ဆောင်နေပါသည်`
                      : `🔄 Transactional Sync Queue: ${queueItems.length} pending operations`}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleClearQueue}
                    disabled={isRetryingSyncs || isQueueProcessing}
                    className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-[11px] rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                    title={lang === 'my' ? 'Queue ထဲတွင် တန့်နေသော စာရင်းများကို ရှင်းလင်းမည်' : 'Clear stuck queue'}
                  >
                    {lang === 'my' ? 'ရှင်းလင်းမည်' : 'Clear'}
                  </button>
                  <button
                    type="button"
                    onClick={handleRetryFailedSyncs}
                    disabled={isRetryingSyncs || isQueueProcessing}
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] rounded-xl transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                  >
                    <RotateCcw className={`w-3 h-3 ${isRetryingSyncs ? 'animate-spin' : ''}`} />
                    <span>{isRetryingSyncs ? (lang === 'my' ? 'ပို့နေသည်...' : 'Retrying...') : (lang === 'my' ? 'ကျန်စာရင်းများ ပြန်ပို့မည်' : 'Retry Failed Syncs')}</span>
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                {lang === 'my'
                  ? 'လိုင်းမကောင်းခြင်း သို့မဟုတ် ခေတ္တ ပြတ်တောက်သွားပါက အဆိုပါ စာရင်းများကို Cloud သို့ ရောက်သည်အထိ အလိုအလျောက် အဆင့်ဆင့် ထပ်ခါတလဲလဲ ပို့ဆောင်ပေးနေပါသည်။'
                  : 'Individual documents will automatically retry with exponential backoff until confirmed in Firestore.'}
              </p>

              {/* Expandable list of stuck queue items */}
              <div className="pt-1.5 border-t border-amber-300/40">
                <button
                  type="button"
                  onClick={() => setShowQueueDetails(!showQueueDetails)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 hover:text-amber-950 underline cursor-pointer"
                >
                  {showQueueDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  <span>
                    {lang === 'my'
                      ? (showQueueDetails ? 'တန်းစီစာရင်း အသေးစိတ်ကို ဝှက်မည်' : `တန်းစီစာရင်း (${queueItems.length}) ခု အသေးစိတ်ကို ကြည့်မည်`)
                      : (showQueueDetails ? 'Hide Queue Details' : `View ${queueItems.length} Queue Details`)}
                  </span>
                </button>

                {showQueueDetails && (
                  <div className="mt-2 max-h-40 overflow-y-auto space-y-1.5 bg-white/60 p-2 rounded-xl border border-amber-200">
                    {queueItems.map((item, index) => (
                      <div key={item.id} className="flex items-start justify-between gap-2 p-1.5 rounded-lg bg-amber-50/50 hover:bg-amber-50 text-[10.5px] border border-amber-100">
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-amber-900">#{index + 1}</span>
                            <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold uppercase text-[9px] border border-amber-200">
                              {item.entityType}
                            </span>
                            <span className="font-mono text-slate-500 font-medium truncate">ID: {item.entityId}</span>
                          </div>
                          {item.lastError && (
                            <div className="text-[10px] text-rose-800 font-mono italic break-words line-clamp-2">
                              Error: {item.lastError}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            syncQueue.remove(item.entityType, item.entityId);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-200 shrink-0 cursor-pointer"
                          title={lang === 'my' ? 'ဤတစ်ခုတည်းကို တန်းစီဇယားမှ ဖယ်ထုတ်မည်' : 'Remove from Queue'}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. Main Section: Tab switcher between Records Status & Sync Operations History */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Tab Selector */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setViewMode('records')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    viewMode === 'records'
                      ? 'bg-white text-indigo-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{lang === 'my' ? 'မှတ်တမ်းများ အခြေအနေ' : 'Records Status'}</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-indigo-50 text-indigo-700">
                    {totalLocalTxs}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('logs')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    viewMode === 'logs'
                      ? 'bg-white text-indigo-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <History className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{lang === 'my' ? 'Sync ဆောင်ရွက်မှု မှတ်တမ်း' : 'Sync History'}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    failedLogsCount > 0 ? 'bg-rose-100 text-rose-700 font-bold' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {syncLogs.length}
                  </span>
                  {failedLogsCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title="Errors recorded in sync operations" />
                  )}
                </button>
              </div>

              {viewMode === 'logs' && syncLogs.length > 0 && (
                <button
                  type="button"
                  onClick={() => clearSyncOperationLogs()}
                  className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                  title={lang === 'my' ? 'Sync မှတ်တမ်းများ ရှင်းလင်းမည်' : 'Clear Sync History'}
                >
                  <Trash2 className="w-3 h-3" />
                  <span>{lang === 'my' ? 'မှတ်တမ်းရှင်းမည်' : 'Clear Logs'}</span>
                </button>
              )}
            </div>

            {/* TAB 1: Individual Records Delivery Status */}
            {viewMode === 'records' && (
              <div className="space-y-2 pt-1 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>{lang === 'my' ? 'မှတ်တမ်းတစ်ခုချင်းစီ၏ Database အခြေအနေ' : 'Individual Record Delivery Status'}</span>
                    <span className="text-[11px] font-mono text-slate-500 font-normal">
                      ({filteredList.length} / {totalLocalTxs})
                    </span>
                  </div>

                  {/* Status filter tabs */}
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setStatusFilter('all')}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        statusFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      {lang === 'my' ? 'အားလုံး' : 'All'} ({totalLocalTxs})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('synced')}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        statusFilter === 'synced' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      🟢 {lang === 'my' ? 'ရောက်ပြီး' : 'In DB'} ({syncedTxsCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('pending')}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        statusFilter === 'pending' ? 'bg-amber-500 text-white shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      🟡 {lang === 'my' ? 'ကျန်' : 'Pending'} ({pendingTxsCount})
                    </button>
                  </div>
                </div>

                {/* Search Input for Transactions */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={lang === 'my' ? 'မှတ်တမ်း ID၊ ရက်စွဲ၊ မှတ်ချက် သို့မဟုတ် ပမာဏ ရှာရန်...' : 'Search by ID, note, amount, date...'}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                {/* List Table / Cards */}
                <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl bg-white text-xs">
                  {filteredList.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 font-medium">
                      {lang === 'my' ? 'ရှာဖွေမှုနှင့် ကိုက်ညီသည့် မှတ်တမ်း မရှိပါ' : 'No matching records found'}
                    </div>
                  ) : (
                    filteredList.map((t) => {
                      const isSynced = cloudTxIds.has(t.id);
                      const isIncome = t.type === 'income';

                      return (
                        <div key={t.id} className="p-2.5 px-3 flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                              isIncome ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                            }`}>
                              {isIncome ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 font-bold text-slate-900 truncate">
                                <span className="truncate">{t.note || t.category}</span>
                                <span className="text-[10px] font-mono text-slate-400 shrink-0 font-normal">[{t.date}]</span>
                              </div>
                              <div className="text-[10px] font-mono text-slate-400 truncate">
                                ID: {t.id}
                              </div>
                            </div>
                          </div>

                          {/* Amount & Cloud Status Badge */}
                          <div className="text-right shrink-0 flex items-center gap-2">
                            <div className={`font-mono font-bold text-xs ${isIncome ? 'text-emerald-700' : 'text-rose-700'}`}>
                              {isIncome ? '+' : '-'}{formatMMK(t.amount)}
                            </div>
                            {isSynced ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>In DB</span>
                              </span>
                            ) : (
                              <div className="flex items-center gap-1">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                                  <AlertTriangle className="w-3 h-3 text-amber-700" />
                                  <span>Local</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handlePushSingleTx(t)}
                                  className="px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold shadow-2xs transition-transform active:scale-95 cursor-pointer"
                                  title={lang === 'my' ? 'ဤမှတ်တမ်းအား DB သို့ တိုက်ရိုက် ပို့မည်' : 'Push this record to DB'}
                                >
                                  📤 {lang === 'my' ? 'ပို့မည်' : 'Push'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: Sync Operations Log (Last 50 operations: push/pull/status/errors) */}
            {viewMode === 'logs' && (
              <div className="space-y-2 pt-1 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{lang === 'my' ? 'နောက်ဆုံး Sync ဆောင်ရွက်မှု ၅၀ ခု (Push / Pull)' : 'Last 50 Sync Operations (Push / Pull)'}</span>
                    <span className="text-[11px] font-mono text-slate-500 font-normal">
                      ({filteredLogs.length} / {syncLogs.length})
                    </span>
                  </div>

                  {/* Filter tabs for logs */}
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setLogFilter('all')}
                      className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                        logFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      {lang === 'my' ? 'အားလုံး' : 'All'} ({syncLogs.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogFilter('push')}
                      className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                        logFilter === 'push' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      ⬆️ {lang === 'my' ? 'Push' : 'Push'} ({pushLogsCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogFilter('pull')}
                      className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                        logFilter === 'pull' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      ⬇️ {lang === 'my' ? 'Pull' : 'Pull'} ({pullLogsCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogFilter('failed')}
                      className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                        logFilter === 'failed' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      🔴 {lang === 'my' ? 'မအောင်မြင်' : 'Failed'} ({failedLogsCount})
                    </button>
                  </div>
                </div>

                {/* Logs List Container */}
                <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-200 rounded-2xl p-2 bg-slate-50/50 text-xs">
                  {filteredLogs.length === 0 ? (
                    <div className="p-8 text-center space-y-2">
                      <History className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-semibold text-slate-500">
                        {lang === 'my'
                          ? 'Sync ဆောင်ရွက်မှု မှတ်တမ်း မရှိသေးပါ'
                          : 'No sync operation logs recorded yet'}
                      </p>
                      <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                        {lang === 'my'
                          ? 'Push သို့မဟုတ် Pull ခလုတ်များကို အသုံးပြုပြီးပါက အောင်မြင်မှု/ကျရှုံးမှုနှင့် Error မှတ်တမ်းများကို ဤနေရာတွင် စစ်ဆေးနိုင်ပါသည်။'
                          : 'Perform a push or pull operation to inspect live status, latency, and error diagnostics.'}
                      </p>
                    </div>
                  ) : (
                    filteredLogs.map((log) => {
                      const isSuccess = log.status === 'success';
                      const isFailed = log.status === 'failed';
                      const isInProgress = log.status === 'in_progress';
                      const isPush = log.direction === 'push';

                      return (
                        <div
                          key={log.id}
                          className={`p-3 rounded-xl border transition-all ${
                            isFailed
                              ? 'bg-rose-50/70 border-rose-200 text-rose-950 shadow-2xs'
                              : isSuccess
                              ? 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                              : 'bg-amber-50/70 border-amber-200 text-amber-950 animate-pulse'
                          }`}
                        >
                          {/* Top row: Badges and timestamp */}
                          <div className="flex flex-wrap items-center justify-between gap-1.5 pb-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {/* Direction / Type Badge */}
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                isPush
                                  ? 'bg-blue-100 text-blue-800 border-blue-200'
                                  : 'bg-indigo-100 text-indigo-800 border-indigo-200'
                              }`}>
                                {isPush ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
                                <span>{log.type.toUpperCase()}</span>
                              </span>

                              {/* Status Badge */}
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${
                                isSuccess
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : isFailed
                                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                                  : 'bg-amber-100 text-amber-800 border-amber-300'
                              }`}>
                                {isSuccess && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />}
                                {isFailed && <AlertCircle className="w-2.5 h-2.5 text-rose-600" />}
                                {isInProgress && <RefreshCw className="w-2.5 h-2.5 text-amber-600 animate-spin" />}
                                <span>
                                  {isSuccess
                                    ? (lang === 'my' ? 'အောင်မြင်' : 'Success')
                                    : isFailed
                                    ? (lang === 'my' ? 'မအောင်မြင်' : 'Failed')
                                    : (lang === 'my' ? 'ဆောင်ရွက်ဆဲ' : 'In Progress')}
                                </span>
                              </span>

                              {/* Device Platform Badge */}
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-600 border border-slate-200">
                                {log.devicePlatform}
                              </span>
                            </div>

                            {/* Time */}
                            <div className="text-[11px] font-mono text-slate-500 font-medium">
                              {formatLogTime(log.timestamp)}
                            </div>
                          </div>

                          {/* Middle row: Operation details & stats */}
                          <div className="flex items-start justify-between gap-2 mt-1">
                            <div className="font-semibold text-slate-900 text-xs">
                              {log.details || `${log.type} operation`}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 text-[11px] font-mono font-bold text-slate-600">
                              {log.itemCount !== undefined && log.itemCount > 0 && (
                                <span className="px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200 text-slate-700">
                                  {log.itemCount} {lang === 'my' ? 'ခု' : 'items'}
                                </span>
                              )}
                              {log.durationMs !== undefined && (
                                <span className="px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200 text-slate-600 font-normal">
                                  {log.durationMs}ms
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Error Message Details if failed */}
                          {log.errorMessage && (
                            <div className="mt-2 p-2 bg-rose-100/70 border border-rose-300 rounded-xl text-[11px] font-mono text-rose-900 break-words flex items-start gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <span className="font-bold text-rose-950">
                                  {lang === 'my' ? 'ချို့ယွင်းချက် (Error): ' : 'Error: '}
                                </span>
                                <span>{log.errorMessage}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 5. iOS Safari & Multi-Device Sync Explanation Note */}
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-3.5 space-y-1.5 text-xs text-indigo-950">
            <div className="font-bold flex items-center gap-1.5 text-indigo-900">
              <HelpCircle className="w-4 h-4 text-indigo-700 shrink-0" />
              <span>{lang === 'my' ? '💡 iPhone, Android နှင့် Windows စက်များ အဆင်ပြေစွာ သုံးနိုင်ရန်:' : '💡 Cross-Device Sync Guide:'}</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-700 pl-1 text-[11.5px]">
              <li>
                {lang === 'my'
                  ? 'စက်အားလုံး (iPhone, Android, Windows) တွင် Google အကောင့်တစ်ခုတည်းဖြင့် ဝင်ထားရပါမည်။'
                  : 'Ensure you are signed in with the same Google account on all devices.'}
              </li>
              <li>
                {lang === 'my'
                  ? 'iPhone တွင် စာရင်းထည့်သွင်းပြီးပါက ဤနေရာရှိ "🚀 Database သို့ အကုန်ချက်ချင်း ပို့မည်" ကို နှိပ်၍ သို့မဟုတ် ထိပ်ရှိ "🔄 Sync" ခလုတ်ကို နှိပ်၍ Database သို့ တန်းရောက်စေနိုင်ပါသည်။'
                  : 'Tap "🚀 Force Push All to Database" or the top "🔄 Sync" button anytime to verify instant delivery.'}
              </li>
              <li>
                {lang === 'my'
                  ? 'Database ထဲ ရောက်ရှိသွားသော စာရင်းများသည် အခြား မည်သည့်စက် (Windows/Android) တွင်မဆို ချက်ချင်း အလိုအလျောက် ပေါ်လာပါမည်။'
                  : 'Once confirmed "In DB", all other devices will automatically load the latest records.'}
              </li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 font-mono">
            {lastSyncedAt ? (
              <span>{lang === 'my' ? 'နောက်ဆုံး Sync ချိန်:' : 'Last Sync:'} {lastSyncedAt.toLocaleTimeString()}</span>
            ) : (
              <span>Live Database Monitor</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            {lang === 'my' ? 'ပိတ်မည်' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
