/**
 * [v6.15.0] ConflictBanner — v7.0 S4 UI.
 *
 * Shows a small dismissible banner when auto-resolved conflicts exist.
 * Click → opens a modal listing each conflict with local vs cloud
 * snapshots side by side, plus per-record and bulk clear actions.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, X, Trash2, CheckCircle2, RefreshCw } from 'lucide-react';
import {
  getConflicts,
  clearAllConflicts,
  removeConflict,
  markResolved,
  type ConflictRecord,
} from '../utils/conflictResolver';

interface ConflictBannerProps {
  lang: 'my' | 'en';
}

export const ConflictBanner: React.FC<ConflictBannerProps> = ({ lang }) => {
  const [records, setRecords] = useState<ConflictRecord[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const refresh = useCallback(() => {
    setRecords(getConflicts());
  }, []);

  useEffect(() => {
    refresh();
    const onDetected = () => refresh();
    const onUpdated = () => refresh();
    window.addEventListener('ngwe:conflict-detected', onDetected as any);
    window.addEventListener('ngwe:conflict-updated', onUpdated as any);
    return () => {
      window.removeEventListener('ngwe:conflict-detected', onDetected as any);
      window.removeEventListener('ngwe:conflict-updated', onUpdated as any);
    };
  }, [refresh]);

  const unresolved = records.filter((r) => !r.resolved);

  if (unresolved.length === 0) return null;

  const fmtTime = (ts: number) => {
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return String(ts);
    }
  };

  return (
    <>
      {/* Small floating banner */}
      <div className="fixed top-3 right-3 z-40 max-w-xs">
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-300 shadow-md hover:bg-amber-100 active:scale-95 transition-all text-left"
        >
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-black text-amber-900 leading-tight">
              {lang === 'my'
                ? `တခြားစက်မှ ပြင်ဆင်ထားတာ ${unresolved.length} ခု`
                : `${unresolved.length} conflict(s) auto-resolved`}
            </div>
            <div className="text-[10px] text-amber-700 truncate">
              {lang === 'my' ? 'စစ်ဆေးရန် နှိပ်ပါ' : 'Tap to review'}
            </div>
          </div>
        </button>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 my-8">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  {lang === 'my' ? 'Conflict Resolution' : 'Conflict Resolution'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900">
                  {unresolved.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Intro */}
            <div className="px-4 pt-4 pb-2">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {lang === 'my'
                  ? 'အောက်ပါတို့သည် device နှစ်လုံးတစ်ချိန်တည်း ပြင်ဆင်မိသည့် အရာများဖြစ်ပြီး Cloud မှာရှိသည့် (အသစ်ဆုံး) version ကို အလိုအလျောက် ရွေးချယ်ပြီးဖြစ်ပါသည်။ သင့် မူရင်း edit ကို ဤနေရာတွင် စစ်ဆေးနိုင်ပါသည်။'
                  : 'These records were edited on two devices at the same time. The newer cloud version was auto-applied. You can inspect your discarded change below.'}
              </p>
            </div>

            {/* List */}
            <div className="px-4 py-2 max-h-[55vh] overflow-y-auto space-y-3">
              {unresolved.map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      {c.entityType}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {c.entityId}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-rose-50 border border-rose-200 p-2">
                      <div className="text-[10px] font-bold text-rose-700 mb-1">
                        {lang === 'my' ? 'သင့် (Discarded)' : 'Your (Discarded)'}
                      </div>
                      <pre className="text-[9px] font-mono text-rose-900 whitespace-pre-wrap break-all max-h-24 overflow-y-auto">
{JSON.stringify(c.localSnapshot, null, 1)}
                      </pre>
                      <div className="text-[9px] text-rose-600 mt-1">
                        v{c.localVersion} · {fmtTime(c.localUpdatedAt)}
                      </div>
                    </div>
                    <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2">
                      <div className="text-[10px] font-bold text-emerald-700 mb-1">
                        {lang === 'my' ? 'Cloud (Applied)' : 'Cloud (Applied)'}
                      </div>
                      <pre className="text-[9px] font-mono text-emerald-900 whitespace-pre-wrap break-all max-h-24 overflow-y-auto">
{JSON.stringify(c.cloudSnapshot, null, 1)}
                      </pre>
                      <div className="text-[9px] text-emerald-600 mt-1">
                        v{c.cloudVersion} · {fmtTime(c.cloudUpdatedAt)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => markResolved(c.id)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {lang === 'my' ? 'အတည်ပြုပြီး' : 'Acknowledge'}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeConflict(c.id)}
                      className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 text-[11px] font-bold"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => { clearAllConflicts(); setIsModalOpen(false); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {lang === 'my' ? 'အားလုံး ရှင်းမည်' : 'Clear All'}
              </button>
              <button
                type="button"
                onClick={refresh}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] font-bold"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {lang === 'my' ? 'ပြန်စစ်' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
