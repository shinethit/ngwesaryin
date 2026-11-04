import React, { useState, useEffect } from 'react';
import { AlertTriangle, RotateCcw, CheckCircle2, RefreshCw, Layers } from 'lucide-react';
import { syncQueue } from '../lib/syncQueue';
import { resetFirestoreConnection, isQuotaExhausted } from '../lib/firebase';

interface QuotaExceededNotificationBannerProps {
  lang: 'my' | 'en';
  onOpenSyncStatus?: () => void;
}

export const QuotaExceededNotificationBanner: React.FC<QuotaExceededNotificationBannerProps> = ({
  lang,
  onOpenSyncStatus,
}) => {
  const [hasQuotaError, setHasQuotaError] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // [v7.5.60 N-20] Quota-exhausted and offline are different problems —
  // say which one it is instead of one vague "connection" message.
  // NOTE: no clock time is promised here: the exhausted flag
  // (lib/firebase.ts isQuotaExhausted) resets at Pacific midnight, not
  // UTC midnight, so a "06:30" claim would be wrong.
  const [isOffline, setIsOffline] = useState(
    () => typeof navigator !== 'undefined' && !navigator.onLine
  );

  useEffect(() => {
    const update = () => setIsOffline(!navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  const checkQuotaStatus = () => {
    const exhausted = isQuotaExhausted();
    setHasQuotaError(exhausted);
  };

  useEffect(() => {
    checkQuotaStatus();
    const interval = setInterval(checkQuotaStatus, 5000);
    window.addEventListener('storage', checkQuotaStatus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', checkQuotaStatus);
    };
  }, []);

  const handleRetrySync = async () => {
    setIsRetrying(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      // 1. Brief delay for network handshake
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // 2. Re-establish connection first
      await resetFirestoreConnection();

      // 3. Attempt to process the sync queue to test if data actually reaches DB
      const result = await syncQueue.processQueue();

      // 4. Verify if quota is still exhausted or if any items failed
      const isStillExhausted = isQuotaExhausted();

      if (isStillExhausted || result.failed > 0) {
        // CRITICAL: Data did NOT reach DB! Do NOT show OK!
        setErrorMsg(
          lang === 'my'
            ? `⚠️ ဒေတာ DB သို့ မရောက်သေးပါ (Queue တွင် မအောင်မြင်သော မှတ်တမ်း ${result.failed} ခု ရှိသည်)။ Sync Status Drawer တွင် အသေးစိတ် ကြည့်ရှုနိုင်ပါသည်။`
            : `⚠️ Data has NOT reached DB (${result.failed} failed items in queue). Open Sync Status for details.`
        );
        setIsRetrying(false);
        return;
      }

      // 5. If and only if data successfully reached DB without error
      if (typeof window !== 'undefined') {
        localStorage.removeItem('ngwe_quota_write_exhausted');
        localStorage.removeItem('ngwe_quota_exhausted');
        localStorage.removeItem('ngwe_quota_exhausted_at');
      }

      setSuccessMsg(
        lang === 'my'
          ? '✅ ဒေတာများ Cloud Database သို့ အောင်မြင်စွာ ရောက်ရှိသွားပါပြီ!'
          : '✅ Data successfully delivered to Cloud Database!'
      );

      setTimeout(() => {
        setIsRetrying(false);
        setHasQuotaError(false);
        setSuccessMsg(null);
      }, 2500);
    } catch (err: any) {
      console.warn('Retry sync error:', err);
      setErrorMsg(
        lang === 'my'
          ? `❌ DB သို့ ပို့ဆောင်၍ မရသေးပါ: ${err?.message || 'Error'}`
          : `❌ Failed to reach DB: ${err?.message || 'Error'}`
      );
      setIsRetrying(false);
    }
  };

  if (!hasQuotaError && !successMsg && !errorMsg) return null;

  return (
    <div className="w-full bg-rose-600 text-white px-4 py-3 shadow-md border-b border-rose-700 animate-fadeIn">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-left">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            {successMsg ? <CheckCircle2 className="w-5 h-5 text-white" /> : <AlertTriangle className="w-5 h-5 text-white animate-pulse" />}
          </div>
          <div>
            <h4 className="font-bold text-xs sm:text-sm">
              {successMsg
                ? (lang === 'my' ? 'ချိတ်ဆက်မှု အောင်မြင်သည်' : 'Delivery Confirmed')
                : errorMsg
                ? (lang === 'my' ? '❌ ဒေတာ မရောက်သေးပါ' : '❌ Data Not Delivered')
                : isOffline
                ? (lang === 'my' ? '📶 အင်တာနက် ချိတ်ဆက်မှု မရှိပါ' : '📶 No internet connection')
                : (lang === 'my' ? '⚠️ Firestore နေ့စဉ် ရေးခွင့် (Quota) ပြည့်သွားပါပြီ' : '⚠️ Daily Firestore write quota exhausted')}
            </h4>
            <p className="text-[11px] sm:text-xs text-rose-100 opacity-95 break-words">
              {successMsg || errorMsg || (isOffline
                ? (lang === 'my'
                    ? 'အင်တာနက် ပြတ်နေပါသည် — ဒေတာများ စက်ထဲတွင် သိမ်းထားပြီး အင်တာနက်ရတာနဲ့ အလိုအလျောက် ပို့ပါမည်။'
                    : 'You are offline — records are saved on this device and will sync automatically when you are back online.')
                : (lang === 'my'
                    ? 'ယနေ့အတွက် Cloud သို့ ရေးခွင့် ကုန်သွားပါပြီ — ဒေတာများ စက်ထဲတွင် သိမ်းထားပြီး quota ပြန်စတာနဲ့ အလိုအလျောက် ပို့ပါမည်။ Retry ဖြင့် ထပ်မံ စစ်ဆေးနိုင်ပါသည်။'
                    : 'Today’s write quota is exhausted — records are saved on this device and will sync automatically once the quota resets. Retry to re-check.'))}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {onOpenSyncStatus && (
            <button
              type="button"
              onClick={onOpenSyncStatus}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/20 hover:bg-white/30 text-white transition-all shadow-sm cursor-pointer whitespace-nowrap"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{lang === 'my' ? '📋 Sync Status ကြည့်ရန်' : 'View Sync Status'}</span>
            </button>
          )}

          {!successMsg && (
            <button
              type="button"
              onClick={handleRetrySync}
              disabled={isRetrying}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white text-rose-700 hover:bg-rose-50 active:scale-95 transition-all shadow-sm cursor-pointer whitespace-nowrap disabled:opacity-50"
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-rose-600" />
                  <span>{lang === 'my' ? 'DB သို့ စစ်ဆေးနေသည်...' : 'Verifying with DB...'}</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4 text-rose-600" />
                  <span>{lang === 'my' ? '🔄 Retry & Verify Sync' : '🔄 Retry & Verify Sync'}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
