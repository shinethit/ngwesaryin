import React, { useState, useEffect } from 'react';
import { Cloud, RefreshCw, Trash2, X, ShieldAlert, CheckCircle2, Layers } from 'lucide-react';
import { syncQueue, SyncQueueItem } from '../lib/syncQueue';
import { formatMMK, getCategoryDisplayName } from '../utils/formatters';
import { Transaction, Category } from '../types';

interface SyncStatusDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'my' | 'en';
  transactions: Transaction[];
  cloudTxIds: Set<string>;
  categories?: Category[];
  onDeleteTransaction: (id: string) => void;
}

export const SyncStatusDrawer: React.FC<SyncStatusDrawerProps> = ({
  isOpen,
  onClose,
  lang,
  transactions,
  cloudTxIds,
  categories = [],
  onDeleteTransaction,
}) => {
  const [queueItems, setQueueItems] = useState<SyncQueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const loadQueue = () => {
    setQueueItems(syncQueue.getQueue());
  };

  useEffect(() => {
    if (isOpen) {
      loadQueue();
      const unsubscribe = syncQueue.subscribe((items) => {
        setQueueItems(items);
      });
      return () => {
        unsubscribe();
      };
    }
  }, [isOpen]);

  // Find local transactions that are not in cloudTxIds or are in queue
  const pendingOrFailedTransactions = transactions.filter((t) => {
    const isPendingInQueue = queueItems.some((q) => q.entityType === 'transactions' && q.entityId === t.id);
    const notInCloud = !cloudTxIds.has(t.id);
    return isPendingInQueue || notInCloud;
  });

  const handleRetryItem = async (item: SyncQueueItem) => {
    setIsProcessing(true);
    setActionNotice(null);
    try {
      syncQueue.enqueue(item.entityType, item.entityId, item.operation, item.targetUid, item.data);
      await syncQueue.processQueue();
      loadQueue();
      setActionNotice(
        lang === 'my'
          ? `✅ အမှတ် ${item.entityId} ကို DB သို့ ထပ်မံ ပို့ဆောင်ပြီးပါပြီ!`
          : `✅ Successfully retried syncing item ${item.entityId}!`
      );
    } catch (err: any) {
      setActionNotice(
        lang === 'my'
          ? `❌ ထပ်မံပို့ဆောင်မှု မအောင်မြင်ပါ: ${err?.message || 'Error'}`
          : `❌ Retry failed: ${err?.message || 'Error'}`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteLocalCopy = (entityType: string, entityId: string) => {
    if (
      window.confirm(
        lang === 'my'
          ? 'ဤဒေတာကို စက်တွင်း (Local) မှ ဖျက်ပစ်ရန် သေချာပါသလား?'
          : 'Are you sure you want to delete this local copy?'
      )
    ) {
      syncQueue.remove(entityType as any, entityId);
      if (entityType === 'transactions') {
        onDeleteTransaction(entityId);
      }
      loadQueue();
      setActionNotice(
        lang === 'my' ? '🗑️ စက်တွင်း မှတ်တမ်းကို ဖျက်ပြီးပါပြီ' : '🗑️ Local copy deleted successfully'
      );
    }
  };

  const handleRetryAll = async () => {
    setIsProcessing(true);
    setActionNotice(null);
    try {
      await syncQueue.processQueue();
      loadQueue();
      setActionNotice(
        lang === 'my' ? '✅ အားလုံးကို DB သို့ ပြန်လည် ပို့ဆောင်ပြီးပါပြီ!' : '✅ Processed all pending sync items!'
      );
    } catch (err: any) {
      setActionNotice(
        lang === 'my' ? `❌ အားလုံးပို့ဆောင်မှုတွင် အမှားရှိသည်: ${err?.message}` : `❌ Error processing queue: ${err?.message}`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg h-full shadow-2xl border-l border-slate-200 flex flex-col overflow-hidden">
        {/* Drawer Header */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 shadow-2xs">
              <Layers className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-slate-900">
                {lang === 'my' ? 'Database Sync Status & Error Tracker' : 'Sync Status & Error Tracker'}
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                {lang === 'my'
                  ? `မအောင်မြင်သေးသော / စောင့်ဆိုင်းနေသော မှတ်တမ်းများ (${queueItems.length} ခု)`
                  : `${queueItems.length} items pending or failed sync`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Notice Banner */}
        {actionNotice && (
          <div className="mx-4 mt-4 p-3 rounded-2xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-950 font-medium flex items-center justify-between shrink-0">
            <span>{actionNotice}</span>
            <button onClick={() => setActionNotice(null)} className="text-indigo-600 font-bold ml-2">×</button>
          </div>
        )}

        {/* Drawer Body - Failed / Pending Queue Items */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
          {queueItems.length === 0 && pendingOrFailedTransactions.length === 0 ? (
            <div className="py-20 text-center text-slate-400 space-y-3">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500" />
              <p className="text-sm font-bold text-slate-800">
                {lang === 'my' ? 'ချိတ်ဆက်မှု အားလုံး ပြီးပြည့်စုံပါသည် (All Synced)' : 'All items successfully synced to Cloud DB!'}
              </p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {lang === 'my'
                  ? 'စက်တွင်းရှိ မှတ်တမ်းအားလုံးသည် Google Cloud Firestore Database သို့ အပြည့်အဝ ရောက်ရှိပြီး ဖြစ်ပါသည်။'
                  : 'All local records are fully confirmed and stored in the remote cloud database.'}
              </p>
            </div>
          ) : (
            <>
              {/* Queue Items List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    {lang === 'my' ? 'Sync Queue & Failed Operations' : 'Sync Queue & Failed Operations'}
                  </span>
                  <button
                    type="button"
                    onClick={handleRetryAll}
                    disabled={isProcessing}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                    <span>{lang === 'my' ? 'အားလုံး ထပ်မံကြိုးစားမည် (Retry All)' : 'Retry All'}</span>
                  </button>
                </div>

                {queueItems.map((item) => {
                  const isFailed = item.status === 'failed';
                  const txData = item.data;
                  const amt = txData?.amount ? formatMMK(txData.amount) : '';

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl border space-y-2.5 transition-all ${
                        isFailed ? 'bg-rose-50/70 border-rose-200' : 'bg-amber-50/70 border-amber-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${isFailed ? 'bg-rose-500 animate-ping' : 'bg-amber-500'}`} />
                          <span className="font-bold text-xs text-slate-900 uppercase">
                            {item.entityType} ({item.operation})
                          </span>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/80 border text-slate-600 font-semibold">
                          {isFailed ? (lang === 'my' ? '❌ မအောင်မြင် (Failed)' : 'Failed') : (lang === 'my' ? '⏳ စောင့်ဆိုင်းဆဲ' : 'Pending')}
                        </span>
                      </div>

                      {/* Transaction info if available */}
                      {txData && (
                        <div className="bg-white/90 p-2.5 rounded-xl border border-slate-200 text-xs space-y-1">
                          <div className="flex items-center justify-between font-bold text-slate-900">
                            <span>{getCategoryDisplayName(txData.category, categories, lang)}</span>
                            {amt && <span className="font-mono text-emerald-700">{amt}</span>}
                          </div>
                          {txData.note && <p className="text-slate-600 italic text-[11px]">"{txData.note}"</p>}
                        </div>
                      )}

                      {/* Exact Error Message from Firestore Operation */}
                      {item.lastError && (
                        <div className="p-2.5 rounded-xl bg-rose-100/80 border border-rose-300 text-xs text-rose-950 space-y-1">
                          <div className="font-bold flex items-center gap-1 text-rose-900">
                            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                            <span>{lang === 'my' ? 'Firestore Operation Error:' : 'Firestore Error Message:'}</span>
                          </div>
                          <p className="font-mono text-[11px] bg-white p-2 rounded-lg border border-rose-200 text-rose-900 break-all">
                            {item.lastError}
                          </p>
                        </div>
                      )}

                      {/* Context-aware Actions: Retry or Delete Local Copy */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleRetryItem(item)}
                          disabled={isProcessing}
                          className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>{lang === 'my' ? '🔄 Retry (ထပ်ကြိုးစားမည်)' : 'Retry'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLocalCopy(item.entityType, item.entityId)}
                          disabled={isProcessing}
                          className="py-2 px-3 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                          title={lang === 'my' ? 'စက်တွင်းကော်ပီကို ဖျက်မည်' : 'Delete Local Copy'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{lang === 'my' ? 'စက်တွင်း ဖျက်မည်' : 'Delete Local'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0 text-xs">
          <span className="text-slate-500 font-medium">
            {lang === 'my' ? 'စက်တွင်း ဒေတာများ လုံခြုံစွာ ရှိနေပါသည်' : 'Local data is safely stored on device'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold transition-all cursor-pointer"
          >
            {lang === 'my' ? 'ပိတ်မည်' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
