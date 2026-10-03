import React from 'react';
import { Cloud, WifiOff, AlertTriangle, Clock, RefreshCw, X, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Transaction, Category } from '../types';
import { getTransactionSyncStatus } from '../utils/transactionSyncStatus';
import { formatMMK, getCategoryDisplayName } from '../utils/formatters';
import { syncQueue } from '../lib/syncQueue';

interface TransactionSyncDetailModalProps {
  transaction: Transaction | null;
  cloudTxIds?: Set<string>;
  categories?: Category[];
  lang: 'my' | 'en';
  onClose: () => void;
  onRefreshSync: () => void;
}

export const TransactionSyncDetailModal: React.FC<TransactionSyncDetailModalProps> = ({
  transaction,
  cloudTxIds,
  categories = [],
  lang,
  onClose,
  onRefreshSync,
}) => {
  const [isRetrying, setIsRetrying] = React.useState(false);

  if (!transaction) return null;

  const syncInfo = getTransactionSyncStatus(transaction, cloudTxIds);
  const categoryName = getCategoryDisplayName(transaction.category, categories, lang);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      syncQueue.enqueue(
        'transactions',
        transaction.id,
        'upsert',
        transaction.userId || 'guest',
        transaction
      );
      await syncQueue.processQueue();
      onRefreshSync();
    } catch (err) {
      console.error('Retry sync failed:', err);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden space-y-4 p-5 sm:p-6 relative">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 pr-8">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
            syncInfo.state === 'synced'
              ? 'bg-emerald-100 text-emerald-700'
              : syncInfo.state === 'failed'
              ? 'bg-rose-100 text-rose-700'
              : syncInfo.state === 'offline'
              ? 'bg-slate-100 text-slate-700'
              : 'bg-amber-100 text-amber-700'
          }`}>
            {syncInfo.state === 'synced' && <Cloud className="w-6 h-6" />}
            {syncInfo.state === 'failed' && <AlertTriangle className="w-6 h-6" />}
            {syncInfo.state === 'offline' && <WifiOff className="w-6 h-6" />}
            {syncInfo.state === 'pending' && <Clock className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              {lang === 'my' ? 'မှတ်တမ်း Database စင့်ခ် အခြေအနေ' : 'Transaction Sync Status'}
            </h3>
            <p className="text-xs text-slate-500 font-mono">ID: {transaction.id}</p>
          </div>
        </div>

        {/* Status Badge Box */}
        <div className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${syncInfo.badgeClass}`}>
          <div className="flex items-center gap-2 font-bold text-xs">
            <span>{lang === 'my' ? syncInfo.labelMy : syncInfo.labelEn}</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/80 font-bold uppercase">
            {syncInfo.state}
          </span>
        </div>

        {/* Transaction Summary Card */}
        <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">{lang === 'my' ? 'ငွေပမာဏ:' : 'Amount:'}</span>
            <span className={`font-mono font-bold text-sm ${transaction.type === 'income' ? 'text-emerald-700' : 'text-rose-600'}`}>
              {transaction.type === 'income' ? '+' : '-'}{formatMMK(transaction.amount)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">{lang === 'my' ? 'ကဏ္ဍ / မှတ်ချက်:' : 'Category / Note:'}</span>
            <span className="font-semibold text-slate-800 truncate max-w-[200px]">
              {categoryName} {transaction.note ? `("${transaction.note}")` : ''}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">{lang === 'my' ? 'ရက်စွဲ:' : 'Date:'}</span>
            <span className="font-mono font-medium text-slate-700">{transaction.date}</span>
          </div>
        </div>

        {/* Error Tracker Section (if failed or pending) */}
        {syncInfo.errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs space-y-1.5 text-rose-950">
            <div className="font-bold flex items-center gap-1.5 text-rose-800">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{lang === 'my' ? 'Error Tracker (အကြောင်းရင်း):' : 'Error Tracker Reason:'}</span>
            </div>
            <p className="font-mono text-[11px] bg-white/90 p-2 rounded-xl border border-rose-200 text-rose-900 break-all">
              {syncInfo.errorMessage}
            </p>
            <p className="text-[10px] text-rose-700">
              {lang === 'my'
                ? '💡 မှတ်ချက်။ ။ Free tier Quota ပြည့်နေခြင်း (သို့) ကွန်ရက်ချိတ်ဆက်မှု မတည်ငြိမ်ခြင်းကြောင့် ဤမှတ်တမ်းသည် Cloud Database ထဲသို့ မရောက်သေးဘဲ စက်တွင်း (Local) ၌သာ ရှိနေပါသည်။'
                : '💡 Note: Due to free tier quota limit or network timeout, this record is stored locally and has not yet reached the cloud database.'}
            </p>
          </div>
        )}

        {syncInfo.state === 'synced' && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs flex items-center gap-2 text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              {lang === 'my'
                ? 'ဤမှတ်တမ်းသည် Google Cloud Firestore Database ထဲသို့ အောင်မြင်စွာ ရောက်ရှိပြီးဖြစ်ပါသည်။ စက်မည်သည့်ဘက်မှမဆို ဤဒေတာကို တိကျစွာ ရယူနိုင်ပါသည်။'
                : 'This transaction is successfully confirmed in the Google Cloud Firestore database.'}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={handleRetry}
            disabled={isRetrying}
            className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
            <span>{lang === 'my' ? 'ထပ်မံ စင့်ခ်လုပ်မည် (Retry Sync)' : 'Retry Sync'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
          >
            {lang === 'my' ? 'ပိတ်မည်' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
