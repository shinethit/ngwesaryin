import React, { useState, useEffect } from 'react';
import {
  X,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Zap,
  Cloud,
  Smartphone,
  Layers,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Wifi,
  WifiOff,
  Server,
  HelpCircle,
  Clock,
  Sparkles,
  Info,
  AlertOctagon,
  Trash2,
  Copy,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { syncQueue, SyncQueueItem } from '../lib/syncQueue';
import { testFirestoreQuotaPing } from '../lib/firebase';
import { SyncErrorEntry, subscribeToSyncErrors, clearSyncErrorHistory } from '../lib/syncErrorHistory';
import { Transaction, Debt, Wallet } from '../types';

interface SyncHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'my' | 'en';
  transactions: Transaction[];
  cloudTxIds: Set<string>;
  debts?: Debt[];
  wallets?: Wallet[];
  activeWorkspaceId?: string;
  onForcePushAll: () => Promise<boolean>;
  onForcePullAll: () => Promise<void>;
  onOpenDatabaseTracker?: () => void;
  onUpdateCloudTxIds?: (newlyConfirmedIds: string[]) => void;
}

export const SyncHealthModal: React.FC<SyncHealthModalProps> = ({
  isOpen,
  onClose,
  lang,
  transactions,
  cloudTxIds,
  debts = [],
  wallets = [],
  activeWorkspaceId,
  onForcePushAll,
  onForcePullAll,
  onOpenDatabaseTracker,
  onUpdateCloudTxIds,
}) => {
  const { user, isSyncing, lastSyncedAt } = useAuth();
  const [queueItems, setQueueItems] = useState<SyncQueueItem[]>([]);
  const [isQueueProcessing, setIsQueueProcessing] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isTestingPing, setIsTestingPing] = useState(false);
  const [pingResult, setPingResult] = useState<{ success: boolean; latencyMs: number; message: string } | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [errorHistory, setErrorHistory] = useState<SyncErrorEntry[]>([]);
  const [copiedErrorId, setCopiedErrorId] = useState<string | null>(null);

  // Subscribe to live syncQueue and persistent sync error history
  useEffect(() => {
    const unsubQueue = syncQueue.subscribe((items, processing) => {
      setQueueItems(items);
      setIsQueueProcessing(processing);
    });
    const unsubErrors = subscribeToSyncErrors((errors) => {
      setErrorHistory(errors);
    });
    return () => {
      unsubQueue();
      unsubErrors();
    };
  }, []);

  const handleClearErrorHistory = () => {
    clearSyncErrorHistory();
    setActionMessage(
      lang === 'my'
        ? '🧹 Sync Error History မှတ်တမ်းများကို အောင်မြင်စွာ ရှင်းလင်းပြီးပါပြီ။'
        : '🧹 Sync Error History cleared.'
    );
  };

  const handleCopyError = (err: SyncErrorEntry) => {
    const text = `[Sync Error]
Time: ${new Date(err.timestamp).toLocaleString()}
Device: ${err.devicePlatform || 'Unknown'}
Operation: ${err.operationType}
Entity: ${err.entityType || 'unknown'} (${err.entityId || 'N/A'})
Path: ${err.path || 'N/A'}
Error: ${err.errorMessage}
Code: ${err.errorCode || 'N/A'}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedErrorId(err.id);
      setTimeout(() => setCopiedErrorId(null), 2000);
    }
  };

  if (!isOpen) return null;

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  // Calculate Metrics
  const totalLocalTxs = transactions.length;
  const syncedTxsCount = transactions.filter((t) => cloudTxIds.has(t.id)).length;
  const pendingTxsCount = totalLocalTxs - syncedTxsCount;

  const pendingQueueCount = queueItems.filter((q) => q.status === 'pending').length;
  const failedQueueCount = queueItems.filter((q) => q.status === 'failed').length;
  const inProgressCount = queueItems.filter((q) => q.status === 'in_progress').length;

  // Calculate Health Score (0 - 100%)
  let healthScore = 100;
  if (totalLocalTxs > 0) {
    const syncRatio = syncedTxsCount / totalLocalTxs;
    const baseScore = syncRatio * 100;
    const failurePenalty = failedQueueCount * 4;
    healthScore = Math.max(0, Math.min(100, Math.round(baseScore - failurePenalty)));
    // If any items are unsynced or queued, health score should never report a false 100%
    if ((pendingTxsCount > 0 || queueItems.length > 0) && healthScore === 100) {
      healthScore = 99;
    }
  }

  // Tier Status
  const getTierInfo = (score: number) => {
    if (score === 100) {
      return {
        level: 'perfect',
        badge: lang === 'my' ? '၁၀၀% ပြည့်စုံ (Perfect)' : '100% Perfect',
        title: lang === 'my' ? 'Cloud နှင့် Local အပြည့်အဝ တူညီနေပါသည်' : 'Fully Consistent & Synchronized',
        desc: lang === 'my'
          ? 'စက်တွင်းရှိ စာရင်းအားလုံး Cloud Database ပေါ်သို့ အောင်မြင်စွာ ရောက်ရှိပြီး အခြားစက်များတွင်ပါ တပြိုင်နက် ရရှိနိုင်ပါပြီ။'
          : 'All local records are confirmed in Firestore. Your data is 100% consistent across all devices.',
        bgColor: 'bg-emerald-600',
        textColor: 'text-emerald-700',
        borderColor: 'border-emerald-200',
        bgLight: 'bg-emerald-50',
        gradient: 'from-emerald-600 via-teal-600 to-emerald-800',
      };
    }
    if (score >= 85) {
      return {
        level: 'good',
        badge: lang === 'my' ? 'ကောင်းမွန် (Optimal Sync)' : 'Optimal Sync',
        title: lang === 'my' ? 'စာရင်း အနည်းငယ် နောက်ခံမှ ပို့ဆောင်နေပါသည်' : 'Minor Pending Changes in Queue',
        desc: lang === 'my'
          ? `စာရင်း (${syncedTxsCount}/${totalLocalTxs}) ခု ရောက်ရှိပြီးဖြစ်ပြီး ကျန် (${pendingTxsCount}) ခုအား Background Queue မှ ဆက်လက် ပို့ဆောင်ပေးနေပါသည်။`
          : `${syncedTxsCount} of ${totalLocalTxs} records confirmed. Remaining ${pendingTxsCount} are processing smoothly in the retry queue.`,
        bgColor: 'bg-teal-600',
        textColor: 'text-teal-700',
        borderColor: 'border-teal-200',
        bgLight: 'bg-teal-50',
        gradient: 'from-teal-600 via-cyan-600 to-teal-800',
      };
    }
    if (score >= 60) {
      return {
        level: 'moderate',
        badge: lang === 'my' ? 'စောင့်ဆိုင်းဆဲ (Retrying Queue)' : 'Active Retrying',
        title: lang === 'my' ? 'စာရင်းအချို့ Retry ပြုလုပ်နေဆဲ ဖြစ်ပါသည်' : 'Some Records Retrying With Backoff',
        desc: lang === 'my'
          ? 'အင်တာနက် လိုင်းမငြိမ်မှုကြောင့် အချို့စာရင်းများကို Exponential Backoff စနစ်ဖြင့် ထပ်ခါတလဲလဲ ပို့ဆောင်နေပါသည်။'
          : 'Some records encountered transient network blips and are actively retrying with exponential backoff.',
        bgColor: 'bg-amber-600',
        textColor: 'text-amber-700',
        borderColor: 'border-amber-200',
        bgLight: 'bg-amber-50',
        gradient: 'from-amber-600 via-yellow-600 to-amber-800',
      };
    }
    return {
      level: 'attention',
      badge: lang === 'my' ? 'စစ်ဆေးရန် လိုအပ် (Action Needed)' : 'Action Needed',
      title: lang === 'my' ? 'အင်တာနက် သို့မဟုတ် အကောင့်ဝင်ရန် လိုအပ်ပါသည်' : 'Sync Paused or Offline',
      desc: lang === 'my'
        ? 'စက်တွင်း ဒေတာများ လုံခြုံစွာ ရှိနေသော်လည်း Cloud သို့ ပို့ဆောင်နိုင်ရန် အင်တာနက်လိုင်း ချိတ်ဆက်ရန် လိုအပ်နေပါသည်။'
        : 'Local data is safe on your device. Please check your internet connection or login to resume syncing.',
      bgColor: 'bg-rose-600',
      textColor: 'text-rose-700',
      borderColor: 'border-rose-200',
      bgLight: 'bg-rose-50',
      gradient: 'from-rose-600 via-orange-600 to-rose-800',
    };
  };

  const tier = getTierInfo(healthScore);

  // Missing or stuck transactions
  const localMissingFromCloud = transactions.filter((t) => !cloudTxIds.has(t.id));
  const stuckQueueItems = queueItems.filter(
    (q) => q.status === 'failed' || (q.entityType === 'transactions' && !cloudTxIds.has(q.entityId))
  );
  const totalStuckOrMissingCount = Math.max(localMissingFromCloud.length, stuckQueueItems.length);

  const handleForcedReconciliation = async () => {
    if (!user) return;
    setIsRetrying(true);
    setActionMessage(null);
    const targetUid = activeWorkspaceId || user.uid;

    try {
      const res = await syncQueue.reconcileMissingTxsWithWriteBatch({
        missingTxs: localMissingFromCloud,
        targetUid,
        cloudTxIds,
      });

      if (res.newlyConfirmedTxIds && res.newlyConfirmedTxIds.length > 0) {
        onUpdateCloudTxIds?.(res.newlyConfirmedTxIds);
        setActionMessage(
          lang === 'my'
            ? `⚡ Forced writeBatch Reconciliation ဖြင့် မရောက်သေးသော စာရင်း (${res.newlyConfirmedTxIds.length}) ခုအား တိုက်ရိုက် Atomic Sync ပြုလုပ်ပြီးပါပြီ!`
            : `⚡ Forced writeBatch reconciliation synced ${res.newlyConfirmedTxIds.length} missing items directly to Firestore!`
        );
      } else {
        setActionMessage(
          lang === 'my'
            ? 'ℹ️ Cloud နှင့် တိုက်ဆိုင်စစ်ဆေးပြီးပါပြီ။ မရောက်သေးသော စာရင်း မရှိပါ။'
            : 'ℹ️ Reconciliation complete. All local transactions are confirmed in Firestore.'
        );
      }
    } catch (err: any) {
      setActionMessage(
        lang === 'my'
          ? '❌ Reconciliation ချို့ယွင်းချက် ဖြစ်ပေါ်ခဲ့ပါသည်။'
          : `❌ Reconciliation error: ${err?.message || 'Write batch issue'}`
      );
    } finally {
      setIsRetrying(false);
    }
  };

  const handleRetryFailedSyncs = async () => {
    if (!user) return;
    setIsRetrying(true);
    setActionMessage(null);
    const targetUid = activeWorkspaceId || user.uid;

    try {
      const res = await syncQueue.retryTargetedMissing({
        missingTxs: localMissingFromCloud,
        targetUid,
        cloudTxIds,
        allLocalTxIds: new Set(transactions.map((t) => t.id)),
      });

      if (res.newlyConfirmedTxIds && res.newlyConfirmedTxIds.length > 0) {
        onUpdateCloudTxIds?.(res.newlyConfirmedTxIds);
        setActionMessage(
          lang === 'my'
            ? `✅ ကျန်ရှိနေသော စာရင်း (${res.newlyConfirmedTxIds.length}) ခု အား Cloud သို့ အောင်မြင်စွာ တိုက်ရိုက် ပို့ဆောင်ပြီးပါပြီ!`
            : `✅ Successfully retried and confirmed ${res.newlyConfirmedTxIds.length} stuck documents in Cloud!`
        );
      } else if (res.succeeded > 0) {
        setActionMessage(
          lang === 'my'
            ? `✅ စာရင်း (${res.succeeded}) ခု အောင်မြင်စွာ ပို့ဆောင်ပြီးပါပြီ!`
            : `✅ Successfully synced ${res.succeeded} items!`
        );
      } else if (res.failed > 0) {
        setActionMessage(
          lang === 'my'
            ? `⚠️ အင်တာနက် အခြေအနေကြောင့် (${res.failed}) ခု ကျန်ရှိနေသေးပါသည်။ အလိုအလျောက် ဆက်လက် ကြိုးစားပါမည်။`
            : `⚠️ ${res.failed} items still pending. Retrying in background.`
        );
      } else {
        setActionMessage(
          lang === 'my'
            ? 'ℹ️ ပို့ဆောင်ရန် ကျန်ရှိသော စာရင်း မရှိပါ။ အားလုံး အတည်ပြုပြီး ဖြစ်ပါသည်။'
            : 'ℹ️ All documents are already confirmed in Cloud.'
        );
      }
    } catch (err: any) {
      setActionMessage(
        lang === 'my'
          ? '❌ ချိတ်ဆက်မှု ချို့ယွင်းချက် ဖြစ်ပေါ်ခဲ့ပါသည်။'
          : `❌ Retry error: ${err?.message || 'Network issue'}`
      );
    } finally {
      setIsRetrying(false);
    }
  };

  const handleClearQueue = () => {
    const targetUid = activeWorkspaceId || user?.uid;
    syncQueue.clearQueue(targetUid);
    setActionMessage(
      lang === 'my'
        ? '🧹 မလိုလားအပ်သော Sync Queue စာရင်းများကို အောင်မြင်စွာ ရှင်းလင်းပြီးပါပြီ။'
        : '🧹 Sync Queue cleared successfully.'
    );
  };

  const handleTestPing = async () => {
    setIsTestingPing(true);
    try {
      const res = await testFirestoreQuotaPing();
      setPingResult(res);
    } catch (e: any) {
      setPingResult({ success: false, latencyMs: 0, message: e?.message || 'Ping failed' });
    } finally {
      setIsTestingPing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header with Dynamic Gradient */}
        <div className={`p-5 sm:p-6 bg-gradient-to-r ${tier.gradient} text-white relative shrink-0 shadow-inner`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white/90 hover:text-white transition-all cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0 shadow-lg">
              <Activity className="w-7 h-7 text-white animate-pulse" />
            </div>

            <div className="space-y-1 pr-8">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/20">
                  {tier.badge}
                </span>
                <span className="text-xs font-medium text-white/80 flex items-center gap-1">
                  {isOnline ? (
                    <>
                      <Wifi className="w-3.5 h-3.5 text-emerald-300" />
                      <span>{lang === 'my' ? 'အွန်လိုင်း' : 'Online'}</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3.5 h-3.5 text-rose-300" />
                      <span>{lang === 'my' ? 'အော့ဖ်လိုင်း' : 'Offline'}</span>
                    </>
                  )}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {lang === 'my' ? 'Database Sync Health စစ်ဆေးချက်' : 'Database Sync Health Monitor'}
              </h2>
              <p className="text-xs sm:text-sm text-white/90 font-medium leading-relaxed">
                {tier.title}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-slate-800">
          {actionMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionMessage}</span>
            </div>
          )}

          {/* 1. Health Score Progress Gauge Card */}
          <div className="p-5 bg-gradient-to-br from-slate-50 to-indigo-50/40 border border-slate-200 rounded-3xl space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {lang === 'my' ? 'စင့်ခ်ကျန်းမာရေး ရမှတ်' : 'Overall Sync Health Score'}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-slate-900 font-mono">
                    {healthScore}%
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    ({syncedTxsCount} / {totalLocalTxs} {lang === 'my' ? 'စာရင်း ရောက်ရှိပြီး' : 'confirmed'})
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold ${tier.bgLight} ${tier.textColor} border ${tier.borderColor}`}>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{tier.badge}</span>
                </span>
              </div>
            </div>

            {/* Health Bar */}
            <div className="w-full bg-slate-200 h-3.5 rounded-full overflow-hidden p-0.5 border border-slate-300">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  healthScore === 100
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                    : healthScore >= 80
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-500'
                    : healthScore >= 60
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                    : 'bg-gradient-to-r from-rose-500 to-red-500'
                }`}
                style={{ width: `${healthScore}%` }}
              />
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {tier.desc}
            </p>
          </div>

          {/* 2. Three Pillars Count Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Local Documents */}
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  {lang === 'my' ? 'စက်တွင်း (Local)' : 'Local Memory'}
                </span>
                <Smartphone className="w-4 h-4 text-slate-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">
                {totalLocalTxs}
              </div>
              <p className="text-[11px] text-slate-500">
                {lang === 'my' ? 'ဖုန်း/စက်ထဲရှိ စာရင်းပေါင်း' : 'Total local records'}
              </p>
            </div>

            {/* Confirmed in Cloud Database */}
            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-emerald-800">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  {lang === 'my' ? 'Cloud ရောက်ပြီး (In DB)' : 'Confirmed in DB'}
                </span>
                <Cloud className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-950 font-mono">
                {syncedTxsCount}
              </div>
              <p className="text-[11px] text-emerald-700">
                {lang === 'my' ? 'Firestore တွင် အတည်ပြုပြီး' : 'Server confirmed'}
              </p>
            </div>

            {/* In Sync Queue / Pending */}
            <div className={`p-4 rounded-2xl shadow-2xs space-y-1 ${
              pendingTxsCount > 0 || queueItems.length > 0
                ? 'bg-amber-50/60 border border-amber-200'
                : 'bg-slate-50 border border-slate-200'
            }`}>
              <div className="flex items-center justify-between text-amber-800">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  {lang === 'my' ? 'ပို့ရန်ကျန် (Pending)' : 'In Sync Queue'}
                </span>
                <RotateCcw className={`w-4 h-4 text-amber-600 ${isQueueProcessing ? 'animate-spin' : ''}`} />
              </div>
              <div className="text-2xl font-black text-amber-950 font-mono">
                {pendingTxsCount > 0 ? pendingTxsCount : queueItems.length}
              </div>
              <p className="text-[11px] text-amber-700">
                {pendingTxsCount > 0
                  ? (lang === 'my' ? 'Cloud သို့ ပို့ရန်ကျန် မှတ်တမ်း' : 'Transactions awaiting upload')
                  : queueItems.length > 0
                  ? (lang === 'my' ? 'နောက်ခံ Queue မှ ပို့ဆောင်နေဆဲ' : 'Active retry tasks')
                  : (lang === 'my' ? 'အားလုံးပြီးစီး ✓' : 'All synced ✓')}
              </p>
            </div>
          </div>

          {/* 3. Transparent Explainer: Why do local and cloud counts differ? */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
              <HelpCircle className="w-4 h-4 text-indigo-600" />
              <span>
                {lang === 'my'
                  ? 'ဘာကြောင့် Local နှင့် Cloud စာရင်း အရေအတွက် ကွာခြားနိုင်သလဲ?'
                  : 'Why do Local and Cloud counts sometimes differ?'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px] text-slate-600">
              <div className="p-2.5 bg-white border border-slate-200 rounded-xl space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  <span>{lang === 'my' ? 'Optimistic Local Caching' : 'Instant Local UI'}</span>
                </div>
                <p>
                  {lang === 'my'
                    ? 'စာရင်းအသစ် ထည့်သွင်းချိန်တွင် လိုင်းစောင့်စရာမလိုဘဲ ချက်ချင်း ပေါ်လာစေရန် ဖုန်းထဲတွင် ဦးစွာ မှတ်သားထားပါသည်။'
                    : 'Writes appear instantly on your device without waiting for network latency.'}
                </p>
              </div>

              <div className="p-2.5 bg-white border border-slate-200 rounded-xl space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{lang === 'my' ? 'Per-Document Retry Queue' : 'Per-Document Retrying'}</span>
                </div>
                <p>
                  {lang === 'my'
                    ? 'စာရင်းတစ်ခုချင်းစီအတွက် ချို့ယွင်းချက်ရှိပါက အခြားစာရင်းများကို မထိခိုက်စေဘဲ အဆိုပါတစ်ခုတည်းကိုသာ Background မှ ထပ်ခါတလဲလဲ ပို့ပေးပါသည်။'
                    : 'Failed individual documents retry with exponential backoff without resetting overall state.'}
                </p>
              </div>

              <div className="p-2.5 bg-white border border-slate-200 rounded-xl space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-teal-600" />
                  <span>{lang === 'my' ? 'Mobile Sleep & Battery Saver' : 'Mobile Background Sleep'}</span>
                </div>
                <p>
                  {lang === 'my'
                    ? 'iPhone Safari သို့မဟုတ် Android အိပ်စက်ချိန်တွင် Network ခေတ္တ ရပ်နားထားပြီး App ပြန်ဖွင့်ချိန်တွင် ချက်ချင်း Auto-Sync လုပ်ပေးပါသည်။'
                    : 'Mobile browsers suspend background tasks; sync automatically resumes when app is reopened.'}
                </p>
              </div>

              <div className="p-2.5 bg-white border border-slate-200 rounded-xl space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{lang === 'my' ? 'Zero Data Loss Guarantee' : 'Zero Data Loss Guarantee'}</span>
                </div>
                <p>
                  {lang === 'my'
                    ? 'စက်တွင်းနှင့် Cloud မတူညီသေးသော်လည်း စက်တွင်း ဒေတာများ လုံးဝ ပျောက်ဆုံးသွားခြင်း မရှိစေရန် အပြည့်အဝ အကာအကွယ်ပေးထားပါသည်။'
                    : 'Your data is permanently cached in local storage and will never be lost or overwritten.'}
                </p>
              </div>
            </div>
          </div>

          {/* 4. Active Retry Queue Status Details */}
          {queueItems.length > 0 && (
            <div className="p-4 bg-amber-500/10 border border-amber-300 rounded-2xl space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="font-bold text-xs text-amber-950 flex items-center gap-2">
                  <RotateCcw className={`w-4 h-4 text-amber-600 ${isQueueProcessing ? 'animate-spin' : ''}`} />
                  <span>
                    {lang === 'my'
                      ? `🔄 Transactional Retry Queue (${queueItems.length} tasks)`
                      : `🔄 Transactional Retry Queue (${queueItems.length} tasks)`}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleClearQueue}
                    disabled={isRetrying || isQueueProcessing}
                    className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50"
                    title={lang === 'my' ? 'Queue ထဲတွင် တန့်နေသော စာရင်းများကို ရှင်းလင်းမည်' : 'Clear stuck queue'}
                  >
                    {lang === 'my' ? 'ရှင်းလင်းမည်' : 'Clear'}
                  </button>
                  <button
                    type="button"
                    onClick={handleRetryFailedSyncs}
                    disabled={isRetrying || isQueueProcessing}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <RotateCcw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
                    <span>{isRetrying ? (lang === 'my' ? 'ပို့ဆောင်နေသည်...' : 'Retrying...') : (lang === 'my' ? 'ကျန်စာရင်းများ ပြန်ပို့မည်' : 'Retry Failed Syncs')}</span>
                  </button>
                </div>
              </div>

              {/* Items List */}
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {queueItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-2 bg-white/80 border border-amber-200 rounded-xl flex items-center justify-between text-[11px]"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-bold font-mono text-slate-700 uppercase px-1.5 py-0.5 bg-slate-100 rounded">
                        {item.entityType}
                      </span>
                      <span className="truncate font-mono text-slate-600">
                        {item.entityId}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          item.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-700 animate-pulse'
                            : item.status === 'failed'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.status === 'in_progress'
                          ? (lang === 'my' ? 'ပို့နေဆဲ' : 'Processing')
                          : item.status === 'failed'
                          ? `${lang === 'my' ? 'ကျရှုံး' : 'Failed'} (${item.retryCount}x)`
                          : (lang === 'my' ? 'စောင့်ဆိုင်းဆဲ' : 'Pending')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4.5. Dedicated Sync Error History Section (Last 10 Failed Operations) */}
          <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                  <AlertOctagon className="w-4 h-4 text-rose-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-xs sm:text-sm text-slate-900">
                      {lang === 'my' ? 'Sync Error History (ချို့ယွင်းချက် မှတ်တမ်း)' : 'Sync Error History'}
                    </h3>
                    {errorHistory.length > 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white shadow-2xs">
                        {errorHistory.length} {lang === 'my' ? 'ခု' : 'failed'}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        {lang === 'my' ? 'အမှားမရှိ ✓' : 'Clean ✓'}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {lang === 'my'
                      ? 'Cloud သို့ ပို့ဆောင်စဉ် တန့်နေရသည့် အကြောင်းရင်း (Error Message & Time) နောက်ဆုံး ၁၀ ခု'
                      : 'Last 10 failed operations with specific error messages, entity IDs, and timestamps'}
                  </p>
                </div>
              </div>

              {errorHistory.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearErrorHistory}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                  title={lang === 'my' ? 'Error မှတ်တမ်းများ ရှင်းလင်းမည်' : 'Clear Error History'}
                >
                  <Trash2 className="w-3 h-3 text-slate-400" />
                  <span className="hidden sm:inline">{lang === 'my' ? 'ရှင်းမည်' : 'Clear'}</span>
                </button>
              )}
            </div>

            {errorHistory.length > 0 ? (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {errorHistory.slice(0, 10).map((err, idx) => (
                  <div
                    key={err.id || idx}
                    className="p-3 bg-white border border-rose-200/90 rounded-xl space-y-1.5 shadow-2xs text-[11px] animate-fadeIn"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
                      <div className="flex items-center gap-1.5 font-bold">
                        <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-mono text-[10px] uppercase font-bold">
                          {err.operationType || 'WRITE'}
                        </span>
                        {err.entityType && (
                          <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                            {err.entityType}/{err.entityId || 'item'}
                          </span>
                        )}
                        {err.devicePlatform && (
                          <span className="text-[10px] text-slate-400 font-normal">
                            • {err.devicePlatform}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-slate-500 font-mono text-[10px]">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{new Date(err.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyError(err)}
                          className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                          title="Copy error details"
                        >
                          {copiedErrorId === err.id ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Specific Error Message */}
                    <div className="p-2 bg-rose-50/70 border border-rose-100 rounded-lg text-rose-950 font-mono text-[10px] leading-relaxed break-all">
                      <div className="font-bold text-rose-800 flex items-center gap-1 mb-0.5">
                        <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                        <span>{err.errorCode || 'Error Message'}:</span>
                      </div>
                      <span className="text-rose-900">{err.errorMessage}</span>
                    </div>

                    {/* Path / diagnostic info if present */}
                    {err.path && (
                      <div className="text-[10px] text-slate-400 font-mono truncate">
                        Path: <span className="text-slate-600">{err.path}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-center space-y-1">
                <div className="text-xs font-bold text-emerald-900 flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{lang === 'my' ? 'လတ်တလော Sync ချို့ယွင်းချက် မရှိပါ' : 'No Recent Sync Errors'}</span>
                </div>
                <p className="text-[11px] text-emerald-700">
                  {lang === 'my'
                    ? 'Cloud Firestore သို့ ပို့ဆောင်မှုများအားလုံး အောင်မြင်လျက်ရှိပါသည်။'
                    : 'All background sync operations are executing smoothly without errors.'}
                </p>
              </div>
            )}
          </div>

          {/* 5. Latency Ping Result */}
          {pingResult && (
            <div
              className={`p-3 rounded-2xl text-xs flex items-center justify-between gap-2 ${
                pingResult.success
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Zap className={`w-4 h-4 ${pingResult.success ? 'text-emerald-600' : 'text-rose-600'}`} />
                <span>{pingResult.message}</span>
              </div>
              {pingResult.success && (
                <span className="font-mono font-bold text-emerald-700">
                  {pingResult.latencyMs} ms
                </span>
              )}
            </div>
          )}

          {/* 6. Action Buttons Bar */}
          <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleForcedReconciliation}
                disabled={isRetrying || isQueueProcessing || localMissingFromCloud.length === 0}
                className="py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl font-extrabold text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title={lang === 'my' ? 'WriteBatch အသုံးပြု၍ မရောက်သေးသော စာရင်းများအား Atomic Sync ပြုလုပ်မည်' : 'Forced writeBatch reconciliation for missing items'}
              >
                <Zap className={`w-3.5 h-3.5 text-yellow-300 ${isRetrying ? 'animate-spin' : ''}`} />
                <span>
                  {lang === 'my' ? 'Forced Reconciliation (Batch Sync)' : 'Forced Batch Reconciliation'}
                </span>
                {localMissingFromCloud.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-white/25 text-white">
                    {localMissingFromCloud.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={handleRetryFailedSyncs}
                disabled={isRetrying || isQueueProcessing || totalStuckOrMissingCount === 0}
                className="py-2.5 px-4 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-700 hover:to-orange-700 text-white rounded-2xl font-black text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title={lang === 'my' ? 'ကျန်ရှိနေသော/မရောက်သေးသော စာရင်းများအား တိုက်ရိုက် ပြန်လည်ပို့မည်' : 'Retry Failed Syncs directly'}
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                <span>
                  {isRetrying
                    ? (lang === 'my' ? 'ပို့နေပါသည်...' : 'Retrying...')
                    : (lang === 'my' ? 'ကျန်စာရင်းများ ပြန်ပို့မည် (Retry Failed Syncs)' : 'Retry Failed Syncs')}
                </span>
                {totalStuckOrMissingCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-white/25 text-white">
                    {totalStuckOrMissingCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={handleTestPing}
                disabled={isTestingPing}
                className="py-2.5 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-2xl font-bold text-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Zap className={`w-3.5 h-3.5 text-amber-600 ${isTestingPing ? 'animate-pulse' : ''}`} />
                <span>{isTestingPing ? 'Pinging...' : (lang === 'my' ? 'Ping စမ်းမည်' : 'Ping Test')}</span>
              </button>

              {onOpenDatabaseTracker && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenDatabaseTracker();
                  }}
                  className="py-2.5 px-3.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-2xl font-bold text-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{lang === 'my' ? 'စာရင်းတစ်ခုချင်း အသေးစိတ်' : 'Detailed Records View'}</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-md"
            >
              {lang === 'my' ? 'ပိတ်မည်' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
