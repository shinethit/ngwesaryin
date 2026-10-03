import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  Flame,
  HardDrive,
  HelpCircle,
  Layers,
  RefreshCw,
  RotateCcw,
  Server,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import {
  FIRESTORE_LIMITS,
  getQuotaOverviewStats,
  subscribeQuotaUpdates,
  clearTodayQuotaStats,
  estimateFirestoreStorage,
  QuotaOverviewStats,
  getTimeUntilUTCMidnight,
} from '../lib/quotaTracker';
import {
  testFirestoreQuotaPing,
  resumeNetworkFromQuota,
  isQuotaExhausted,
} from '../lib/firebase';
import { Transaction, Wallet, Category } from '../types';

interface QuotaDashboardProps {
  lang: 'my' | 'en';
  usersCount?: number;
  transactionsCount?: number;
  walletsCount?: number;
  codesCount?: number;
  messagesCount?: number;
  visitorsCount?: number;
  onRefreshData?: () => void;
}

export const QuotaDashboard: React.FC<QuotaDashboardProps> = ({
  lang,
  usersCount = 0,
  transactionsCount = 0,
  walletsCount = 0,
  codesCount = 0,
  messagesCount = 0,
  visitorsCount = 0,
  onRefreshData,
}) => {
  const [stats, setStats] = useState<QuotaOverviewStats>(getQuotaOverviewStats);
  const [isTestingPing, setIsTestingPing] = useState(false);
  const [pingResult, setPingResult] = useState<{
    success: boolean;
    latencyMs: number;
    message: string;
    testedAt: string;
  } | null>(null);
  const [isResumingNetwork, setIsResumingNetwork] = useState(false);
  const [networkResumeMsg, setNetworkResumeMsg] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(getTimeUntilUTCMidnight());

  // Subscribe to live quota increments
  useEffect(() => {
    const unsub = subscribeQuotaUpdates((newStats) => {
      setStats(newStats);
    });

    // Countdown tick every second
    const interval = setInterval(() => {
      setCountdown(getTimeUntilUTCMidnight());
    }, 1000);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  // Storage and document estimations
  const storageEstimates = useMemo(() => {
    return estimateFirestoreStorage({
      transactions: transactionsCount,
      wallets: walletsCount,
      users: usersCount,
      activationCodes: codesCount,
      systemMessages: messagesCount,
      visitors: visitorsCount,
    });
  }, [transactionsCount, walletsCount, usersCount, codesCount, messagesCount, visitorsCount]);

  const handleRunPingTest = async () => {
    setIsTestingPing(true);
    setPingResult(null);
    try {
      const res = await testFirestoreQuotaPing();
      setPingResult({
        ...res,
        testedAt: new Date().toLocaleTimeString(),
      });
      // Refresh local quota overview
      setStats(getQuotaOverviewStats());
    } catch (err: any) {
      setPingResult({
        success: false,
        latencyMs: 0,
        message: err?.message || 'Ping failed',
        testedAt: new Date().toLocaleTimeString(),
      });
    } finally {
      setIsTestingPing(false);
    }
  };

  const handleResetQuotaLock = async () => {
    setIsResumingNetwork(true);
    setNetworkResumeMsg(null);
    try {
      const resumed = await resumeNetworkFromQuota();
      if (resumed) {
        setNetworkResumeMsg(
          lang === 'my'
            ? 'Firestore ကွန်ရက်ကို ပြန်လည်ဖွင့်ပြီးပါပြီ ✓'
            : 'Firestore network unlocked successfully ✓'
        );
      } else {
        setNetworkResumeMsg(
          lang === 'my'
            ? 'ကွန်ရက် ပြန်လည်ဖွင့်ရာတွင် အခက်အခဲရှိပါသည်'
            : 'Failed to resume network'
        );
      }
      setTimeout(() => setNetworkResumeMsg(null), 4000);
    } catch (err: any) {
      setNetworkResumeMsg(`Error: ${err?.message || 'Failed'}`);
    } finally {
      setIsResumingNetwork(false);
    }
  };

  const handleClearDailyStats = () => {
    if (
      window.confirm(
        lang === 'my'
          ? 'ယနေ့ ဒေသတွင်း Quota မှတ်တမ်းကို သုညသို့ ပြန်လည်စတင် (Reset) မည်လား?'
          : 'Reset local daily quota tracking counters to 0?'
      )
    ) {
      clearTodayQuotaStats();
      setStats(getQuotaOverviewStats());
    }
  };

  // Helpers for Status Styles & Badges
  const getStatusBadge = (status: 'normal' | 'moderate' | 'warning' | 'critical' | 'exhausted') => {
    switch (status) {
      case 'exhausted':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-600 text-white flex items-center gap-1 shadow-xs">
            <ShieldAlert className="w-3.5 h-3.5" />
            {lang === 'my' ? 'Quota ပြည့်သွားသည်' : 'Exhausted'}
          </span>
        );
      case 'critical':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-black bg-orange-600 text-white flex items-center gap-1 shadow-xs animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5" />
            {lang === 'my' ? '၉၀% ကျော်ပြီ (စိုးရိမ်ရ)' : 'Critical (>90%)'}
          </span>
        );
      case 'warning':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500 text-slate-950 flex items-center gap-1 shadow-xs">
            <AlertTriangle className="w-3.5 h-3.5" />
            {lang === 'my' ? '၇၅% ကျော်ပြီ (သတိပြုရန်)' : 'Warning (>75%)'}
          </span>
        );
      case 'moderate':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-300 flex items-center gap-1">
            <Activity className="w-3.5 h-3.5" />
            {lang === 'my' ? 'အလယ်အလတ် သုံးစွဲမှု' : 'Moderate'}
          </span>
        );
      case 'normal':
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            {lang === 'my' ? '🟢 ပုံမှန် (လုံလောက်သည်)' : '🟢 Normal & Healthy'}
          </span>
        );
    }
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 100) return 'bg-rose-600';
    if (percent >= 90) return 'bg-orange-500';
    if (percent >= 70) return 'bg-amber-500';
    if (percent >= 40) return 'bg-sky-500';
    return 'bg-emerald-500';
  };

  const currentlyExhausted = isQuotaExhausted() || stats.overallStatus === 'exhausted';

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Top Banner: Global Status & Real-time Diagnostic Controls */}
      <div className={`rounded-2xl p-5 border text-white shadow-lg transition-all ${
        currentlyExhausted
          ? 'bg-gradient-to-r from-rose-950 via-red-900 to-rose-950 border-rose-600/50'
          : stats.overallStatus === 'warning' || stats.overallStatus === 'critical'
          ? 'bg-gradient-to-r from-amber-950 via-yellow-900 to-amber-950 border-amber-600/50'
          : 'bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-indigo-800/40'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
              currentlyExhausted
                ? 'bg-rose-500/20 border-rose-400/40 text-rose-300 animate-pulse'
                : 'bg-indigo-500/20 border-indigo-400/30 text-indigo-300'
            }`}>
              <Flame className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                  {lang === 'my' ? '🔥 Firestore Daily Quota Dashboard' : '🔥 Firestore Daily Quota Dashboard'}
                </h3>
                {getStatusBadge(currentlyExhausted ? 'exhausted' : stats.overallStatus)}
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                {lang === 'my'
                  ? 'Firebase Firestore အခမဲ့ သုံးစွဲခွင့် (Free Tier: 50,000 Reads/Day, 20,000 Writes/Day, 1GB Storage) ၏ လက်ရှိ အသုံးပြုမှုနှင့် ကျန်ရှိမှု အခြေအနေ'
                  : 'Real-time monitoring of Firebase Firestore Free Tier limits (50k Reads, 20k Writes, 20k Deletes, 1GB Storage)'}
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={handleRunPingTest}
              disabled={isTestingPing}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Zap className={`w-3.5 h-3.5 text-yellow-300 ${isTestingPing ? 'animate-spin' : ''}`} />
              {isTestingPing
                ? lang === 'my' ? 'စစ်ဆေးနေသည်...' : 'Testing...'
                : lang === 'my' ? '⚡ Connection စစ်ဆေးမည်' : '⚡ Ping Test'}
            </button>

            {currentlyExhausted && (
              <button
                type="button"
                onClick={handleResetQuotaLock}
                disabled={isResumingNetwork}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer animate-bounce"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isResumingNetwork ? 'animate-spin' : ''}`} />
                {lang === 'my' ? 'သော့ ပြန်ဖွင့်မည် (Resume)' : 'Unlock Network'}
              </button>
            )}

            {onRefreshData && (
              <button
                type="button"
                onClick={onRefreshData}
                className="p-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl transition-colors cursor-pointer"
                title={lang === 'my' ? 'အသစ်ပြန်ဆွဲမည်' : 'Refresh'}
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Diagnostic Messages & Toast */}
        {pingResult && (
          <div className={`mt-3.5 p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
            pingResult.success
              ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/70 border-rose-500/40 text-rose-200'
          }`}>
            <div className="flex items-center gap-2">
              {pingResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{pingResult.message}</span>
            </div>
            <div className="text-[11px] font-mono opacity-80 shrink-0">
              Latency: {pingResult.latencyMs}ms ({pingResult.testedAt})
            </div>
          </div>
        )}

        {networkResumeMsg && (
          <div className="mt-2.5 p-2.5 rounded-xl bg-emerald-900/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{networkResumeMsg}</span>
          </div>
        )}

        {/* Reset Countdown Pill */}
        <div className="mt-4 pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-300">
          <div className="flex items-center gap-1.5 font-medium">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>
              {lang === 'my'
                ? 'နောက်တစ်ကြိမ် နေ့စဉ် Quota Reset ဖြစ်ရန် ကျန်ရှိချိန်:'
                : 'Next Daily Quota Reset in:'}
            </span>
            <span className="font-mono font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-500/30">
              {countdown.formatted}
            </span>
            <span className="text-[11px] text-slate-400">(00:00 UTC)</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-emerald-300 flex items-center gap-1">
              <Zap className="w-3 h-3 text-emerald-400" />
              {lang === 'my'
                ? `IndexedDB Cache ဖြင့် ကာကွယ်ထားသော Reads: ${stats.cachedReadsSaved.toLocaleString()} ကြိမ်`
                : `Reads Saved via Offline Cache: ${stats.cachedReadsSaved.toLocaleString()}`}
            </span>
          </div>
        </div>
      </div>

      {/* 3 Core Quota Limit Cards: Reads (50k), Writes (20k), Deletes (20k) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CARD 1: DOCUMENT READS (50,000 / Day) */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center font-bold">
                📖
              </div>
              <div>
                <h4 className="font-black text-sm text-slate-800">
                  {lang === 'my' ? 'ဖတ်ရှုမှု (Reads)' : 'Document Reads'}
                </h4>
                <p className="text-[11px] text-slate-500">
                  {lang === 'my' ? 'နေ့စဉ် ကန့်သတ်ချက်:' : 'Daily Limit:'} 50,000 / Day
                </p>
              </div>
            </div>
            {getStatusBadge(stats.readStatus)}
          </div>

          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                  {stats.readsUsed.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400 font-medium">/ 50,000</span>
              </div>
              <span className={`text-sm font-black font-mono ${
                stats.readsPercent >= 90 ? 'text-rose-600' : stats.readsPercent >= 70 ? 'text-amber-600' : 'text-emerald-600'
              }`}>
                {stats.readsPercent}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-2.5 mt-2 overflow-hidden border border-slate-100">
              <div
                className={`h-full transition-all duration-500 rounded-full ${getProgressColor(stats.readsPercent)}`}
                style={{ width: `${Math.min(100, Math.max(stats.readsPercent, stats.readsUsed > 0 ? 3 : 0))}%` }}
              />
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span>{lang === 'my' ? 'ကျန်ရှိနေသော Reads:' : 'Remaining Reads:'}</span>
              <span className="font-bold text-slate-800 font-mono">
                {stats.readsRemaining.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* CARD 2: DOCUMENT WRITES (20,000 / Day) */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center font-bold">
                ✍️
              </div>
              <div>
                <h4 className="font-black text-sm text-slate-800">
                  {lang === 'my' ? 'ရေးသွင်းမှု (Writes)' : 'Document Writes'}
                </h4>
                <p className="text-[11px] text-slate-500">
                  {lang === 'my' ? 'နေ့စဉ် ကန့်သတ်ချက်:' : 'Daily Limit:'} 20,000 / Day
                </p>
              </div>
            </div>
            {getStatusBadge(stats.writeStatus)}
          </div>

          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                  {stats.writesUsed.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400 font-medium">/ 20,000</span>
              </div>
              <span className={`text-sm font-black font-mono ${
                stats.writesPercent >= 90 ? 'text-rose-600' : stats.writesPercent >= 70 ? 'text-amber-600' : 'text-emerald-600'
              }`}>
                {stats.writesPercent}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-2.5 mt-2 overflow-hidden border border-slate-100">
              <div
                className={`h-full transition-all duration-500 rounded-full ${getProgressColor(stats.writesPercent)}`}
                style={{ width: `${Math.min(100, Math.max(stats.writesPercent, stats.writesUsed > 0 ? 3 : 0))}%` }}
              />
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span>{lang === 'my' ? 'ကျန်ရှိနေသော Writes:' : 'Remaining Writes:'}</span>
              <span className="font-bold text-slate-800 font-mono">
                {stats.writesRemaining.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* CARD 3: DOCUMENT DELETES (20,000 / Day) */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center font-bold">
                🗑️
              </div>
              <div>
                <h4 className="font-black text-sm text-slate-800">
                  {lang === 'my' ? 'ဖျက်ပစ်မှု (Deletes)' : 'Document Deletes'}
                </h4>
                <p className="text-[11px] text-slate-500">
                  {lang === 'my' ? 'နေ့စဉ် ကန့်သတ်ချက်:' : 'Daily Limit:'} 20,000 / Day
                </p>
              </div>
            </div>
            {getStatusBadge(stats.deleteStatus)}
          </div>

          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                  {stats.deletesUsed.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400 font-medium">/ 20,000</span>
              </div>
              <span className={`text-sm font-black font-mono ${
                stats.deletesPercent >= 90 ? 'text-rose-600' : stats.deletesPercent >= 70 ? 'text-amber-600' : 'text-emerald-600'
              }`}>
                {stats.deletesPercent}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-2.5 mt-2 overflow-hidden border border-slate-100">
              <div
                className={`h-full transition-all duration-500 rounded-full ${getProgressColor(stats.deletesPercent)}`}
                style={{ width: `${Math.min(100, Math.max(stats.deletesPercent, stats.deletesUsed > 0 ? 3 : 0))}%` }}
              />
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span>{lang === 'my' ? 'ကျန်ရှိနေသော Deletes:' : 'Remaining Deletes:'}</span>
              <span className="font-bold text-slate-800 font-mono">
                {stats.deletesRemaining.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Storage & Stored Documents Distribution Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-black text-sm text-slate-800">
                {lang === 'my' ? '💾 Storage နေရာနှင့် စုစုပေါင်း မှတ်တမ်းများ' : '💾 Storage Capacity & Live Document Stats'}
              </h4>
              <p className="text-xs text-slate-500">
                {lang === 'my'
                  ? 'Firestore 1 GB (1,024 MB) အခမဲ့ Storage ပေါ်ရှိ လက်ရှိ သိမ်းဆည်းထားမှု'
                  : 'Total volume of stored records across all collections'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="px-3 py-1 bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-200">
              {lang === 'my' ? 'စုစုပေါင်း မှတ်တမ်း:' : 'Total Docs:'}{' '}
              <strong className="text-indigo-600">{storageEstimates.documentCount.toLocaleString()}</strong>
            </span>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-bold rounded-xl border border-indigo-200">
              {storageEstimates.totalMB} MB / 1,024 MB ({storageEstimates.percentOfGB}%)
            </span>
          </div>
        </div>

        {/* Live Document Counts Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
          <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 text-center">
            <span className="text-[11px] font-bold text-slate-500 block">
              {lang === 'my' ? '👤 အသုံးပြုသူများ' : 'Users'}
            </span>
            <span className="text-lg font-black text-slate-800 font-mono mt-0.5 block">
              {usersCount.toLocaleString()}
            </span>
          </div>

          <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 text-center">
            <span className="text-[11px] font-bold text-slate-500 block">
              {lang === 'my' ? '💳 ငွေစာရင်းများ' : 'Transactions'}
            </span>
            <span className="text-lg font-black text-slate-800 font-mono mt-0.5 block">
              {transactionsCount.toLocaleString()}
            </span>
          </div>

          <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 text-center">
            <span className="text-[11px] font-bold text-slate-500 block">
              {lang === 'my' ? '👛 ပိုက်ဆံအိတ်များ' : 'Wallets'}
            </span>
            <span className="text-lg font-black text-slate-800 font-mono mt-0.5 block">
              {walletsCount.toLocaleString()}
            </span>
          </div>

          <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 text-center">
            <span className="text-[11px] font-bold text-slate-500 block">
              {lang === 'my' ? '🔑 ပရီမီယမ် ကုဒ်များ' : 'Codes'}
            </span>
            <span className="text-lg font-black text-slate-800 font-mono mt-0.5 block">
              {codesCount.toLocaleString()}
            </span>
          </div>

          <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 text-center">
            <span className="text-[11px] font-bold text-slate-500 block">
              {lang === 'my' ? '📢 စာတန်းပြေးများ' : 'Broadcasts'}
            </span>
            <span className="text-lg font-black text-slate-800 font-mono mt-0.5 block">
              {messagesCount.toLocaleString()}
            </span>
          </div>

          <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 text-center">
            <span className="text-[11px] font-bold text-slate-500 block">
              {lang === 'my' ? '🌐 ဧည့်သည် Logs' : 'Visitors'}
            </span>
            <span className="text-lg font-black text-slate-800 font-mono mt-0.5 block">
              {visitorsCount.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Collection-Level Operations Breakdown Table */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <h4 className="font-black text-sm text-slate-800">
              {lang === 'my' ? 'ကဏ္ဍအလိုက် ယနေ့ လုပ်ဆောင်ချက်များ (Today Operations Breakdown)' : 'Operations Breakdown by Collection'}
            </h4>
          </div>

          <button
            type="button"
            onClick={handleClearDailyStats}
            className="text-xs text-slate-400 hover:text-slate-700 underline cursor-pointer"
          >
            {lang === 'my' ? 'သုညသို့ Reset လုပ်မည်' : 'Reset Daily Tracking'}
          </button>
        </div>

        <div className="overflow-x-auto mt-3">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold bg-slate-50/60">
                <th className="py-2.5 px-3">{lang === 'my' ? 'Collection အမည်' : 'Collection'}</th>
                <th className="py-2.5 px-3 text-right">{lang === 'my' ? 'ဖတ်ရှုမှု (Reads)' : 'Reads'}</th>
                <th className="py-2.5 px-3 text-right">{lang === 'my' ? 'ရေးသွင်းမှု (Writes)' : 'Writes'}</th>
                <th className="py-2.5 px-3 text-right">{lang === 'my' ? 'ဖျက်ပစ်မှု (Deletes)' : 'Deletes'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Object.entries(stats.collections).map(([colName, data]) => (
                <tr key={colName} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-slate-700 capitalize flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    {colName}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-800">
                    {data.reads.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-medium text-amber-600">
                    {data.writes.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-medium text-rose-600">
                    {data.deletes.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Free Tier Guide & Performance Insights */}
      <div className="bg-gradient-to-br from-indigo-50/80 to-sky-50/80 rounded-2xl p-5 border border-indigo-100 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-600/20">
            <Zap className="w-5 h-5 text-yellow-300" />
          </div>
          <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
            <h5 className="font-bold text-sm text-indigo-950">
              {lang === 'my'
                ? '💡 Firestore Free Quota (50k/20k) ကို အထိရောက်ဆုံး သုံးစွဲနိုင်ရန် သိကောင်းစရာများ'
                : '💡 Best Practices & Quota Optimization Guide'}
            </h5>
            <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
              <li>
                <strong>IndexedDB Local Cache:</strong>{' '}
                {lang === 'my'
                  ? 'အပလီကေးရှင်းတွင် စက်ထဲသိမ်းဆည်းသော Persistent Local Cache စနစ် ပါရှိပြီးဖြစ်သောကြောင့် အသုံးပြုသူများ စာရင်းကြည့်တိုင်း Cloud သို့ အကြိမ်ကြိမ် မတောင်းဆိုဘဲ Reads ပေါင်း သောင်းချီ သက်သာစေပါသည်။'
                  : 'Built-in IndexedDB persistent caching serves repeated queries locally, preserving your 50,000 daily read limit.'}
              </li>
              <li>
                <strong>Daily Reset (00:00 UTC):</strong>{' '}
                {lang === 'my'
                  ? 'နေ့စဉ် မြန်မာစံတော်ချိန် မနက် ၆:၃၀ နာရီ (00:00 UTC) တွင် Google Firestore Quota အလိုအလျောက် သုညမှ ပြန်စတင်ပါသည်။'
                  : 'Daily quota resets automatically at 00:00 UTC every 24 hours.'}
              </li>
              <li>
                <strong>User Capacity:</strong>{' '}
                {lang === 'my'
                  ? 'နေ့စဉ် Reads 50,000 နှင့် Writes 20,000 သည် ပုံမှန် အသုံးပြုသူ အယောက် ၁,၀၀၀ ကျော်အတွက် တစ်ရက်တာ အေးအေးဆေးဆေး လုံလောက်သော ပမာဏ ဖြစ်ပါသည်။'
                  : 'With optimized batching and local caching, 50k reads and 20k writes comfortably handle hundreds of active daily users.'}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
