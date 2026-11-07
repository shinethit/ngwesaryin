/**
 * [v6.15.0] ConflictBanner — v7.0 S4 UI.
 *
 * Shows a small dismissible banner when auto-resolved conflicts exist.
 * Click → opens a modal listing each conflict with local vs cloud
 * snapshots side by side, plus per-record and bulk clear actions.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, X, Trash2, CheckCircle2, RefreshCw, Undo2 } from 'lucide-react';
import {
  getConflicts,
  clearAllConflicts,
  removeConflict,
  markResolved,
  type ConflictRecord,
} from '../utils/conflictResolver';
import { syncQueue, type SyncEntityType } from '../lib/syncQueue';
import { useAuth } from '../context/AuthContext';

// [v7.5.60] Human-readable diff (F-S13): raw JSON is unreadable for a
// non-programmer. Compare the two snapshots field by field and show only
// what actually changed, with friendly labels.
const META_KEYS = new Set([
  'id', 'userId', 'version', 'updatedAt', 'createdAt', 'lastEditedBy',
  'lastEditedAt', 'syncedAt', 'deletedAt', 'deviceId', 'sharedWith',
]);
const FIELD_LABELS: Record<string, { my: string; en: string }> = {
  amount: { my: 'ပမာဏ', en: 'Amount' },
  date: { my: 'ရက်စွဲ', en: 'Date' },
  note: { my: 'မှတ်ချက်', en: 'Note' },
  category: { my: 'ကဏ္ဍ', en: 'Category' },
  categoryId: { my: 'ကဏ္ဍ', en: 'Category' },
  subCategoryId: { my: 'ကဏ္ဍခွဲ', en: 'Sub-category' },
  type: { my: 'အမျိုးအစား', en: 'Type' },
  walletId: { my: 'ပိုက်ဆံအိတ်', en: 'Wallet' },
  name: { my: 'အမည်', en: 'Name' },
  balance: { my: 'လက်ကျန်', en: 'Balance' },
  initialBalance: { my: 'အစ လက်ကျန်', en: 'Opening balance' },
  title: { my: 'ခေါင်းစဉ်', en: 'Title' },
  content: { my: 'အကြောင်းအရာ', en: 'Content' },
  totalAmount: { my: 'စုစုပေါင်း', en: 'Total' },
  remainingAmount: { my: 'ကျန်ငွေ', en: 'Remaining' },
  dueDate: { my: 'ပေးရမည့်ရက်', en: 'Due date' },
  isSettled: { my: 'ဆပ်ပြီး', en: 'Settled' },
  currency: { my: 'ငွေကြေး', en: 'Currency' },
  shopName: { my: 'ဆိုင်', en: 'Shop' },
  odometer: { my: 'ကီလိုမီတာ', en: 'Odometer' },
  liters: { my: 'လီတာ', en: 'Litres' },
  pricePerLiter: { my: 'တစ်လီတာ ဈေး', en: 'Price / litre' },
};

function fmtDiffValue(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'number') return v.toLocaleString('en-US');
  if (typeof v === 'boolean') return v ? '✓' : '✕';
  if (typeof v === 'string' && v.length > 60) return v.slice(0, 60) + '…';
  return String(v);
}

function diffRows(c: ConflictRecord): Array<{ key: string; local: unknown; cloud: unknown }> {
  const local = (c.localSnapshot || {}) as Record<string, unknown>;
  const cloud = (c.cloudSnapshot || {}) as Record<string, unknown>;
  const keys = [...new Set([...Object.keys(local), ...Object.keys(cloud)])].filter(
    (k) => !META_KEYS.has(k)
  );
  return keys
    .filter((k) => JSON.stringify(local[k]) !== JSON.stringify(cloud[k]))
    .map((k) => ({ key: k, local: local[k], cloud: cloud[k] }));
}

// Entity types whose snapshot can be safely re-applied through the normal
// sync queue (plain upsert). Shared-wallet docs are excluded — the queue
// stamps userId onto the payload, which the shared-wallet rules reject.
const RESTORABLE_TYPES = new Set<string>([
  'transactions', 'debts', 'wallets', 'categories', 'budgets',
  'savingsTargets', 'shops', 'vehicles', 'fuelLogs',
  'vehicleMaintenance', 'tirePressureLogs',
]);

interface ConflictBannerProps {
  lang: 'my' | 'en';
}

export const ConflictBanner: React.FC<ConflictBannerProps> = ({ lang }) => {
  const { user } = useAuth();
  const [records, setRecords] = useState<ConflictRecord[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // [v7.5.60] Two-tap confirms for destructive clears (F-S13) — the old
  // icon-only trash button deleted the record with no label and no confirm.
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [clearAllArmed, setClearAllArmed] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

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

  // [v7.5.60] "Keep mine" (F-S13): re-apply the discarded local snapshot as
  // a NEWER version (version = max + 1, edited by me) through the normal
  // sync queue, so the cloud listener picks it up and it is not
  // re-flagged as a conflict (detectConflicts skips our own echo).
  // Success is verified from the queue result, never assumed.
  const handleKeepMine = async (c: ConflictRecord) => {
    setBusyId(c.id);
    setNotice(null);
    try {
      const targetUid =
        (c.localSnapshot?.userId as string) || user?.uid || 'guest';
      const restored = {
        ...c.localSnapshot,
        id: c.entityId,
        version: Math.max(Number(c.cloudVersion) || 0, Number(c.localVersion) || 0) + 1,
        updatedAt: Date.now(),
        lastEditedBy: user?.uid || targetUid,
      };
      syncQueue.enqueue(
        c.entityType as SyncEntityType,
        c.entityId,
        'upsert',
        targetUid,
        restored
      );
      const result = await syncQueue.processQueue();
      const ok =
        result.succeededEntityIds.some((e) => e.entityId === c.entityId) ||
        !syncQueue.isEntityPending(c.entityType as SyncEntityType, c.entityId);
      if (ok) {
        markResolved(c.id);
        refresh();
        setNotice({
          kind: 'ok',
          text:
            lang === 'my'
              ? '✅ သင့်အပြောင်းအလဲကို Cloud သို့ ပြန်ပို့ပြီးပါပြီ'
              : '✅ Your change was sent back to the Cloud',
        });
      } else {
        setNotice({
          kind: 'err',
          text:
            lang === 'my'
              ? '❌ ပြန်ပို့၍ မရသေးပါ — အင်တာနက်ကို စစ်ပြီး ပြန်ကြိုးစားပါ'
              : '❌ Could not send it back yet — check your connection and try again',
        });
      }
    } catch (err) {
      console.error('[ConflictBanner] keep-mine failed:', err);
      setNotice({
        kind: 'err',
        text:
          lang === 'my'
            ? '❌ ပြန်ပို့၍ မရသေးပါ — အင်တာနက်ကို စစ်ပြီး ပြန်ကြိုးစားပါ'
            : '❌ Could not send it back yet — check your connection and try again',
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      {/* Small floating banner */}
      <div className="fixed top-16 sm:top-20 right-3 z-40 max-w-xs">
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto overflow-x-hidden">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 my-8">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <h3 className="text-sm font-bold text-slate-900 truncate">
                  {lang === 'my' ? 'Conflict Resolution' : 'Conflict Resolution'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900">
                  {unresolved.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Intro */}
            <div className="px-4 pt-4 pb-2 space-y-2">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {lang === 'my'
                  ? 'အောက်ပါတို့သည် device နှစ်လုံးတစ်ချိန်တည်း ပြင်ဆင်မိသည့် အရာများဖြစ်ပြီး Cloud မှာရှိသည့် (အသစ်ဆုံး) version ကို အလိုအလျောက် ရွေးချယ်ပြီးဖြစ်ပါသည်။ ကွာခြားချက်ကို အောက်မှာ ကြည့်နိုင်ပြီး သင့်အပြောင်းအလဲကို ပြန်ယူချင်ရင် "ကျွန်တော့်ဟာကို ယူမည်" ကို နှိပ်ပါ။'
                  : 'These records were edited on two devices at the same time. The newer cloud version was auto-applied. See what changed below — or tap "Keep my change" to send your version back to the Cloud.'}
              </p>
              {notice && (
                <p
                  className={`text-[11px] font-bold p-2 rounded-lg ${
                    notice.kind === 'ok'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {notice.text}
                </p>
              )}
            </div>

            {/* List */}
            <div className="px-4 py-2 max-h-[55vh] overflow-y-auto overflow-x-hidden space-y-3">
              {unresolved.map((c) => {
                // [v7.5.60] Readable diff instead of raw JSON (F-S13).
                const rows = diffRows(c);
                return (
                <div
                  key={c.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate min-w-0">
                      {c.entityType}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono truncate min-w-0">
                      {c.entityId}
                    </span>
                  </div>

                  {/* Human-readable change summary: what changed, old → new */}
                  {rows.length > 0 ? (
                    <div className="rounded-lg bg-white border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                      {rows.slice(0, 6).map((r) => {
                        const label =
                          FIELD_LABELS[r.key]?.[lang] || r.key;
                        return (
                          <div key={r.key} className="px-2.5 py-1.5 text-[11px] leading-snug">
                            <span className="font-bold text-slate-700">{label}: </span>
                            <span className="text-rose-700 line-through decoration-rose-300">
                              {fmtDiffValue(r.local)}
                            </span>
                            <span className="text-slate-400 mx-1">→</span>
                            <span className="font-bold text-emerald-700">
                              {fmtDiffValue(r.cloud)}
                            </span>
                          </div>
                        );
                      })}
                      {rows.length > 6 && (
                        <div className="px-2.5 py-1 text-[10px] text-slate-400">
                          {lang === 'my'
                            ? `နောက်ထပ် ${rows.length - 6} ခု ကွာခြားသည်`
                            : `${rows.length - 6} more difference(s)`}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500">
                      {lang === 'my'
                        ? 'အကြောင်းအရာ အတူတူပဲ — ဗားရှင်းသာ ကွဲသည်။'
                        : 'Contents are identical — only the version differs.'}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-[9px] text-slate-400">
                    <span>
                      {lang === 'my' ? 'သင့်' : 'Yours'} v{c.localVersion} · {fmtTime(c.localUpdatedAt)}
                    </span>
                    <span>
                      Cloud v{c.cloudVersion} · {fmtTime(c.cloudUpdatedAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    {RESTORABLE_TYPES.has(c.entityType) && (
                      <button
                        type="button"
                        disabled={busyId === c.id}
                        onClick={() => handleKeepMine(c)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-[11px] font-bold whitespace-nowrap"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                        {busyId === c.id
                          ? (lang === 'my' ? 'ပို့နေသည်…' : 'Sending…')
                          : (lang === 'my' ? 'ကျွန်တော့်ဟာကို ယူမည်' : 'Keep my change')}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => { markResolved(c.id); refresh(); }}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold whitespace-nowrap"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {lang === 'my' ? 'အတည်ပြုပြီး' : 'Acknowledge'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirmDeleteId === c.id) {
                          removeConflict(c.id);
                          setConfirmDeleteId(null);
                          refresh();
                        } else {
                          setConfirmDeleteId(c.id);
                        }
                      }}
                      className={`flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg border text-[11px] font-bold whitespace-nowrap ${
                        confirmDeleteId === c.id
                          ? 'bg-rose-600 border-rose-600 text-white'
                          : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {confirmDeleteId === c.id
                        ? (lang === 'my' ? 'သေချာလား? ဖျက်မည်' : 'Sure? Delete')
                        : (lang === 'my' ? 'မှတ်တမ်းဖျက်မည်' : 'Delete record')}
                    </button>
                  </div>
                </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-slate-100">
              {/* [v7.5.60] Clear All also confirms first (F-S13) — it wipes
                  the whole conflict history, not data, but that must be
                  explicit. */}
              <button
                type="button"
                onClick={() => {
                  if (clearAllArmed) {
                    clearAllConflicts();
                    setClearAllArmed(false);
                    setIsModalOpen(false);
                  } else {
                    setClearAllArmed(true);
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-white text-[11px] font-bold whitespace-nowrap ${
                  clearAllArmed ? 'bg-rose-800' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                {clearAllArmed
                  ? (lang === 'my' ? 'သေချာလား? ရှင်းမည်' : 'Sure? Clear all')
                  : (lang === 'my' ? 'အားလုံး ရှင်းမည်' : 'Clear All')}
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
