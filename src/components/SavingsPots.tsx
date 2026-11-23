import React, { useEffect, useRef, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db, safeSetDoc } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { safeGetItem, safeSetItem } from '../utils/storage';
import {
  SAVINGS_POTS_STORAGE_KEY,
  SAVINGS_POTS_CLOUD_FIELD,
  SavingsPot,
  SavingsPotContribution,
  SavingsPotValidationError,
  buildPotTransferTransaction,
  getPotProgress,
  getSavedAmount,
  newSavingsPotContributionId,
  newSavingsPotId,
  sanitizeSavingsPots,
  summarizeActivePots,
  todayLocalDateString,
  validateSavingsPotEntry,
  validateSavingsPotInput,
} from '../utils/savingsPots';
import type { Category, Transaction, Wallet } from '../types';
import { formatMMK, formatLakhs } from '../utils/formatters';
import { parseMyanmarNumber } from '../utils/myanmarDigits';
import { PiggyBank, Plus, Pencil, Trash2, Archive, ChevronDown, ChevronUp, X, CheckCircle2 } from 'lucide-react';

interface SavingsPotsProps {
  lang: 'my' | 'en';
  // [v7.6.13] Wallet-transfer wiring (ALL optional): when the
  // caller passes the same wallet list the record-entry form uses plus
  // the creation callback, an entry form gains a wallet picker —
  // picking a wallet ALSO creates the matching real transaction
  // through the existing creation path. When any of the three is
  // missing, the picker is hidden and entries stay exactly as in
  // v7.6.09 (tracking-only). The component itself never writes a
  // transaction or a wallet: creation happens only inside the
  // callback, which returns the created transaction's id (or null
  // when the creation was blocked, in which case the entry is not
  // saved at all).
  wallets?: Wallet[];
  categories?: Category[];
  onCreatePotTransfer?: (tx: Omit<Transaction, 'id' | 'createdAt'>) => string | null;
}

// [v7.6.09] Named savings pots — tracking ONLY by default. Pots are
// open to everyone on local data: unlike MonthlySavingsTarget there
// is NO lock here, because a pot with no wallet picked never
// touches real money — it only records progress toward a named
// goal. [v7.6.13] Picking a wallet on an entry is the one exception:
// the entry ALSO creates a real transaction (see the props above),
// so that wallet's balance really changes. Persistence mirrors
// MonthlySavingsTarget: local storage for everyone + the `savingsPots`
// field on the user document (merge:true) for signed-in users. No
// rules change is needed (see savingsPots.ts).

function loadLocalPots(): SavingsPot[] {
  try {
    const raw = safeGetItem(SAVINGS_POTS_STORAGE_KEY);
    if (raw === null) return [];
    return sanitizeSavingsPots(JSON.parse(raw));
  } catch {
    return [];
  }
}

export const SavingsPots: React.FC<SavingsPotsProps> = ({ lang, wallets, categories, onCreatePotTransfer }) => {
  const { user } = useAuth();
  // [v7.6.13] The wallet picker exists only when the caller wired
  // all three transfer props; otherwise this section is exactly
  // the v7.6.09 tracking-only UI.
  const canTransfer = wallets !== undefined && wallets.length > 0 && onCreatePotTransfer !== undefined;
  const [pots, setPots] = useState<SavingsPot[]>(loadLocalPots);
  // Whether a local value was already stored when this component
  // mounted (a stored local value wins over the cloud value, exactly
  // like the month-specific key in MonthlySavingsTarget).
  const hadLocalRef = useRef<boolean>(safeGetItem(SAVINGS_POTS_STORAGE_KEY) !== null);
  const [cloudState, setCloudState] = useState<'local' | 'loading' | 'synced' | 'error'>('local');
  const cloudReadyRef = useRef(false);

  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createTarget, setCreateTarget] = useState('');
  const [createError, setCreateError] = useState<SavingsPotValidationError | null>(null);

  const [editingPotId, setEditingPotId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editTarget, setEditTarget] = useState('');
  const [editError, setEditError] = useState<SavingsPotValidationError | null>(null);

  const [entryPotId, setEntryPotId] = useState<string | null>(null);
  const [entryType, setEntryType] = useState<'in' | 'out'>('in');
  const [entryAmount, setEntryAmount] = useState('');
  const [entryNote, setEntryNote] = useState('');
  const [entryDate, setEntryDate] = useState(todayLocalDateString());
  // [v7.6.13] '' = no wallet picked = tracking-only entry, exactly
  // as in v7.6.09. A picked wallet id ALSO creates the transaction.
  const [entryWalletId, setEntryWalletId] = useState('');
  const [entryError, setEntryError] = useState<SavingsPotValidationError | null>(null);

  const walletNameFor = (walletId: string): string | undefined => {
    const w = wallets?.find((x) => x.id === walletId);
    if (!w) return undefined;
    return lang === 'my' ? w.name : w.nameEn || w.name;
  };

  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});
  const [showArchived, setShowArchived] = useState(false);
  const [confirmState, setConfirmState] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
  } | null>(null);

  const errorText = (code: SavingsPotValidationError): string => {
    if (code === 'name-required') return lang === 'my' ? 'အိုးအမည်ကို ရိုက်ထည့်ပါ' : 'Enter a pot name';
    if (code === 'target-invalid') return lang === 'my' ? 'ပန်းတိုင်ပမာဏသည် ၀ ထက် ကြီးရပါမည်' : 'Target must be greater than 0';
    if (code === 'amount-invalid') return lang === 'my' ? 'ပမာဏသည် ၀ ထက် ကြီးရပါမည်' : 'Amount must be greater than 0';
    if (code === 'transfer-failed') return lang === 'my' ? 'ပိုက်ဆံအိတ်မှတ်တမ်း ထည့်သွင်း၍ မရပါ — ထပ်ကြိုးစားပါ' : 'Could not record the wallet transaction — please try again';
    return lang === 'my' ? 'စုပြီးသားထက် ပိုထုတ်၍ မရပါ' : 'Cannot withdraw more than the saved amount';
  };

  const persist = (next: SavingsPot[]) => {
    setPots(next);
    safeSetItem(SAVINGS_POTS_STORAGE_KEY, JSON.stringify(next));
    if (user && cloudReadyRef.current) {
      safeSetDoc(doc(db, 'users', user.uid), { [SAVINGS_POTS_CLOUD_FIELD]: next }, { merge: true }).catch(() => {});
    }
  };

  // [v7.6.09] Cloud sync — same shape as MonthlySavingsTarget: load
  // the cloud field on mount; a stored local value wins; otherwise
  // adopt the cloud value; migrate local values up when the cloud
  // field is empty.
  useEffect(() => {
    if (!user) {
      cloudReadyRef.current = true;
      setCloudState('local');
      return;
    }
    let cancelled = false;
    setCloudState('loading');
    getDoc(doc(db, 'users', user.uid))
      .then((snap) => {
        if (cancelled) return;
        const data = snap.exists() ? (snap.data() as Record<string, unknown>) : {};
        const cloudValue = data[SAVINGS_POTS_CLOUD_FIELD];
        if (Array.isArray(cloudValue)) {
          const cloudPots = sanitizeSavingsPots(cloudValue);
          if (!hadLocalRef.current) {
            setPots(cloudPots);
            safeSetItem(SAVINGS_POTS_STORAGE_KEY, JSON.stringify(cloudPots));
          }
        } else {
          const local = loadLocalPots();
          if (local.length > 0) {
            safeSetDoc(doc(db, 'users', user.uid), { [SAVINGS_POTS_CLOUD_FIELD]: local }, { merge: true }).catch(() => {});
          }
        }
        cloudReadyRef.current = true;
        setCloudState('synced');
      })
      .catch(() => {
        if (cancelled) return;
        cloudReadyRef.current = true;
        setCloudState('error');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleCreate = () => {
    const target = parseMyanmarNumber(createTarget);
    const err = validateSavingsPotInput(createName, target);
    if (err) {
      setCreateError(err);
      return;
    }
    const pot: SavingsPot = {
      id: newSavingsPotId(),
      name: createName.trim(),
      targetAmount: target,
      createdAt: Date.now(),
      contributions: [],
    };
    persist([pot, ...pots]);
    setCreateName('');
    setCreateTarget('');
    setCreateError(null);
    setShowCreate(false);
  };

  const openEdit = (pot: SavingsPot) => {
    setEditingPotId(pot.id);
    setEditName(pot.name);
    setEditTarget(String(pot.targetAmount));
    setEditError(null);
    setEntryPotId(null);
  };

  const handleSaveEdit = (pot: SavingsPot) => {
    const target = parseMyanmarNumber(editTarget);
    const err = validateSavingsPotInput(editName, target);
    if (err) {
      setEditError(err);
      return;
    }
    persist(pots.map((p) => (p.id === pot.id ? { ...p, name: editName.trim(), targetAmount: target } : p)));
    setEditingPotId(null);
    setEditError(null);
  };

  const openEntry = (pot: SavingsPot, type: 'in' | 'out') => {
    setEntryPotId(pot.id);
    setEntryType(type);
    setEntryAmount('');
    setEntryNote('');
    setEntryDate(todayLocalDateString());
    setEntryWalletId('');
    setEntryError(null);
    setEditingPotId(null);
  };

  const handleSaveEntry = (pot: SavingsPot) => {
    const amount = parseMyanmarNumber(entryAmount);
    const err = validateSavingsPotEntry(amount, entryType, getSavedAmount(pot));
    if (err) {
      setEntryError(err);
      return;
    }
    const entryDateValue = entryDate !== '' ? entryDate : todayLocalDateString();
    // [v7.6.13] Wallet picked → create the real transaction FIRST,
    // through the existing creation path (the callback). A blocked
    // creation returns null: the pot entry is NOT saved, so the pot
    // can never claim money that never moved. The transaction id
    // links the two records; deleting the pot later never deletes
    // the transaction. No wallet picked → the v7.6.09 entry below,
    // unchanged.
    let linkedWalletId: string | undefined;
    let linkedTransactionId: string | undefined;
    if (canTransfer && entryWalletId !== '' && onCreatePotTransfer) {
      const createdId = onCreatePotTransfer(
        buildPotTransferTransaction({
          potId: pot.id,
          potName: pot.name,
          entryType,
          amount,
          walletId: entryWalletId,
          date: entryDateValue,
          note: entryNote,
          categories: categories ?? [],
        }),
      );
      if (!createdId) {
        setEntryError('transfer-failed');
        return;
      }
      linkedWalletId = entryWalletId;
      linkedTransactionId = createdId;
    }
    const contribution: SavingsPotContribution = {
      id: newSavingsPotContributionId(),
      amount,
      type: entryType,
      ...(entryNote.trim() !== '' ? { note: entryNote.trim() } : {}),
      date: entryDateValue,
    };
    if (linkedWalletId !== undefined && linkedTransactionId !== undefined) {
      contribution.walletId = linkedWalletId;
      contribution.transactionId = linkedTransactionId;
    }
    persist(
      pots.map((p) =>
        p.id === pot.id ? { ...p, contributions: [...p.contributions, contribution] } : p,
      ),
    );
    setEntryPotId(null);
    setEntryError(null);
  };

  const handleArchiveToggle = (pot: SavingsPot) => {
    persist(
      pots.map((p) => {
        if (p.id !== pot.id) return p;
        const next = { ...p };
        if (next.archived === true) delete next.archived;
        else next.archived = true;
        return next;
      }),
    );
  };

  const handleDelete = (pot: SavingsPot) => {
    setConfirmState({
      title: lang === 'my' ? 'စုငွေအိုးကို ဖျက်မည်လား။' : 'Delete this savings pot?',
      message:
        lang === 'my'
          ? `"${pot.name}" အိုးနှင့် ၎င်း၏ ထည့်သွင်း/ထုတ်ယူမှတ်တမ်းများ အားလုံးကို ဖျက်ပစ်မည် — ပိုက်ဆံအိတ်လက်ကျန်ကို မထိပါ။`
          : `The "${pot.name}" pot and all of its contribution history will be deleted — wallet balances are untouched.`,
      confirmLabel: lang === 'my' ? 'ဖျက်မည်' : 'Delete',
      onConfirm: () => persist(pots.filter((p) => p.id !== pot.id)),
    });
  };

  const activePots = pots.filter((p) => p.archived !== true);
  const archivedPots = pots.filter((p) => p.archived === true);
  const summary = summarizeActivePots(pots);

  const renderPotCard = (pot: SavingsPot) => {
    const progress = getPotProgress(pot);
    const isEditing = editingPotId === pot.id;
    const isEntering = entryPotId === pot.id;
    const historyOpen = expandedHistory[pot.id] === true;
    return (
      <div key={pot.id} data-pot-id={pot.id} data-pot-name={pot.name} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="font-bold text-sm text-slate-900 truncate">{pot.name}</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {lang === 'my' ? 'ပန်းတိုင်' : 'Target'}: <span title={formatMMK(pot.targetAmount)}>{formatLakhs(pot.targetAmount, lang)}</span>
              {' · '}
              {lang === 'my' ? 'စုပြီးသား' : 'Saved'}: <span title={formatMMK(progress.saved)}>{formatLakhs(progress.saved, lang)}</span>
            </p>
          </div>
          {progress.complete && (
            <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {lang === 'my' ? 'ပြည့်စုံပြီ' : 'Complete'}
            </span>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">
              {lang === 'my' ? 'လိုသေးသည်' : 'Remaining'}: <span className="font-bold text-slate-800" title={formatMMK(progress.remaining)}>{formatLakhs(progress.remaining, lang)}</span>
            </span>
            <span className="font-bold text-slate-900">
              {progress.clampedPercent}%{' '}
              <span className="text-[11px] font-normal text-slate-500" title={`${formatMMK(progress.saved)} / ${formatMMK(pot.targetAmount)}`}>
                ({formatLakhs(progress.saved, lang)} / {formatLakhs(pot.targetAmount, lang)})
              </span>
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200/60">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
              style={{ width: `${progress.clampedPercent}%` }}
            />
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-2 rounded-xl bg-slate-50 border border-slate-200 p-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">{lang === 'my' ? 'အိုးအမည်' : 'Pot name'}</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">{lang === 'my' ? 'ပန်းတိုင်ပမာဏ (MMK)' : 'Target amount (MMK)'}</label>
              <input
                type="text"
                inputMode="decimal"
                value={editTarget}
                onChange={(e) => setEditTarget(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>
            {editError && <p className="text-xs font-semibold text-rose-600">{errorText(editError)}</p>}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditingPotId(null)}
                className="min-h-11 px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 border border-slate-300 cursor-pointer"
              >
                {lang === 'my' ? 'မလုပ်တော့ပါ' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => handleSaveEdit(pot)}
                className="min-h-11 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
              >
                {lang === 'my' ? 'သိမ်းမည်' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-pot-action="add"
              onClick={() => openEntry(pot, 'in')}
              className="min-h-11 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
            >
              {lang === 'my' ? 'ထည့်မည်' : 'Add'}
            </button>
            <button
              type="button"
              data-pot-action="withdraw"
              onClick={() => openEntry(pot, 'out')}
              className="min-h-11 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 cursor-pointer"
            >
              {lang === 'my' ? 'ထုတ်မည်' : 'Withdraw'}
            </button>
            <button
              type="button"
              data-pot-action="edit"
              onClick={() => openEdit(pot)}
              className="min-h-11 inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              {lang === 'my' ? 'ပြင်မည်' : 'Edit'}
            </button>
            <button
              type="button"
              data-pot-action="archive"
              onClick={() => handleArchiveToggle(pot)}
              className="min-h-11 inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
            >
              <Archive className="w-3.5 h-3.5" />
              {pot.archived === true ? (lang === 'my' ? 'ပြန်ဖော်မည်' : 'Restore') : (lang === 'my' ? 'သိမ်းထားမည်' : 'Archive')}
            </button>
            <button
              type="button"
              data-pot-action="delete"
              onClick={() => handleDelete(pot)}
              className="min-h-11 inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {lang === 'my' ? 'ဖျက်မည်' : 'Delete'}
            </button>
          </div>
        )}

        {isEntering && (
          <div className="space-y-2 rounded-xl bg-slate-50 border border-slate-200 p-3">
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 self-start text-xs font-bold w-fit">
              <button
                type="button"
                onClick={() => setEntryType('in')}
                className={`px-3 py-1.5 rounded-lg cursor-pointer ${entryType === 'in' ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}
              >
                {lang === 'my' ? 'ထည့်မည်' : 'Add'}
              </button>
              <button
                type="button"
                onClick={() => setEntryType('out')}
                className={`px-3 py-1.5 rounded-lg cursor-pointer ${entryType === 'out' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}
              >
                {lang === 'my' ? 'ထုတ်မည်' : 'Withdraw'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5 min-w-0">
                <label className="text-xs font-semibold text-slate-600">{lang === 'my' ? 'ပမာဏ (MMK)' : 'Amount (MMK)'}</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={entryAmount}
                  onChange={(e) => setEntryAmount(e.target.value)}
                  placeholder="0"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1.5 min-w-0">
                <label className="text-xs font-semibold text-slate-600">{lang === 'my' ? 'ရက်စွဲ' : 'Date'}</label>
                <input
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="w-full min-w-0 bg-white border border-slate-300 rounded-xl px-2 py-2 text-[13px] font-semibold text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">{lang === 'my' ? 'မှတ်ချက် (မဖြစ်မနေ မဟုတ်)' : 'Note (optional)'}</label>
              <input
                type="text"
                value={entryNote}
                onChange={(e) => setEntryNote(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>
            {canTransfer && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">{lang === 'my' ? 'ပိုက်ဆံအိတ်' : 'Wallet'}</label>
                <select
                  data-pot-wallet-select
                  value={entryWalletId}
                  onChange={(e) => setEntryWalletId(e.target.value)}
                  className="w-full min-h-11 bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">
                    {lang === 'my' ? 'ပိုက်ဆံအိတ် မရွေး (ခြေရာခံခြင်းသာ)' : 'No wallet (tracking only)'}
                  </option>
                  {wallets?.map((w) => (
                    <option key={w.id} value={w.id}>
                      {lang === 'my' ? w.name : w.nameEn || w.name}
                    </option>
                  ))}
                </select>
                {entryWalletId !== '' && (
                  <p data-pot-transfer-notice className="text-xs font-semibold text-amber-700">
                    {entryType === 'in'
                      ? (lang === 'my' ? 'ပိုက်ဆံအိတ်ထဲက တကယ် လျော့မည်' : 'The wallet balance will really decrease.')
                      : (lang === 'my' ? 'ပိုက်ဆံအိတ်ထဲ တကယ် တိုးမည်' : 'The wallet balance will really increase.')}
                  </p>
                )}
              </div>
            )}
            {entryError && <p className="text-xs font-semibold text-rose-600">{errorText(entryError)}</p>}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEntryPotId(null)}
                className="min-h-11 px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 border border-slate-300 cursor-pointer"
              >
                {lang === 'my' ? 'မလုပ်တော့ပါ' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => handleSaveEntry(pot)}
                className="min-h-11 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
              >
                {lang === 'my' ? 'သိမ်းမည်' : 'Save'}
              </button>
            </div>
          </div>
        )}

        <div>
          <button
            type="button"
            data-pot-action="history"
            onClick={() => setExpandedHistory((prev) => ({ ...prev, [pot.id]: !historyOpen }))}
            className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer min-h-11 px-1"
          >
            {historyOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {lang === 'my' ? `မှတ်တမ်း (${pot.contributions.length})` : `History (${pot.contributions.length})`}
          </button>
          {historyOpen && (
            <div className="mt-1 space-y-1.5">
              {pot.contributions.length === 0 ? (
                <p className="text-xs text-slate-400 py-1">{lang === 'my' ? 'မှတ်တမ်း မရှိသေးပါ' : 'No entries yet'}</p>
              ) : (
                [...pot.contributions].reverse().map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-2 text-xs bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                    <div className="min-w-0">
                      <span className="text-slate-500">{c.date}</span>
                      {c.note && <span className="text-slate-700 truncate"> · {c.note}</span>}
                      {c.walletId && walletNameFor(c.walletId) && (
                        <span data-pot-entry-wallet className="text-slate-500"> · {walletNameFor(c.walletId)}</span>
                      )}
                    </div>
                    <span
                      className={`font-bold shrink-0 ${c.type === 'in' ? 'text-emerald-600' : 'text-rose-600'}`}
                      title={formatMMK(c.amount)}
                    >
                      {c.type === 'in' ? '+' : '−'}
                      {formatLakhs(c.amount, lang)}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div id="savings-pots-section" className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
            <PiggyBank className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm text-slate-900">{lang === 'my' ? 'စုငွေအိုး' : 'Savings Pots'}</h3>
            <p className="text-[11px] text-slate-500 leading-snug">
              {lang === 'my'
                ? 'စုငွေအိုးက တိုးတက်မှုကို ခြေရာခံခြင်းသာ — ပိုက်ဆံအိတ်လက်ကျန်ကို မထိပါ'
                : 'Savings pots track progress only — wallet balances are untouched.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          id="savings-pot-create-btn"
          onClick={() => {
            setShowCreate((v) => !v);
            setCreateError(null);
          }}
          className="shrink-0 min-h-11 inline-flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          {lang === 'my' ? 'အိုးအသစ် ဖန်တီးမည်' : 'New pot'}
        </button>
      </div>

      {pots.length > 0 && (
        <p className="text-xs text-slate-600">
          {lang === 'my'
            ? `အိုး ${summary.potCount} ခု · စုပြီးသား ${formatLakhs(summary.totalSaved, lang)} / ပန်းတိုင် ${formatLakhs(summary.totalTarget, lang)}`
            : `${summary.potCount} pot${summary.potCount === 1 ? '' : 's'} · saved ${formatLakhs(summary.totalSaved, lang)} / target ${formatLakhs(summary.totalTarget, lang)}`}
        </p>
      )}

      {showCreate && (
        <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">{lang === 'my' ? 'အိုးအမည်' : 'Pot name'}</label>
            <input
              type="text"
              id="savings-pot-name-input"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder={lang === 'my' ? 'ဥပမာ — ဆိုင်ကယ် အသစ်' : 'e.g. New motorbike'}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">{lang === 'my' ? 'ပန်းတိုင်ပမာဏ (MMK)' : 'Target amount (MMK)'}</label>
            <input
              type="text"
              id="savings-pot-target-input"
              inputMode="decimal"
              value={createTarget}
              onChange={(e) => setCreateTarget(e.target.value)}
              placeholder="0"
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:border-emerald-500"
            />
          </div>
          {createError && <p className="text-xs font-semibold text-rose-600">{errorText(createError)}</p>}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="min-h-11 px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 border border-slate-300 cursor-pointer"
            >
              {lang === 'my' ? 'မလုပ်တော့ပါ' : 'Cancel'}
            </button>
            <button
              type="button"
              id="savings-pot-save-btn"
              onClick={handleCreate}
              className="min-h-11 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
            >
              {lang === 'my' ? 'ဖန်တီးမည်' : 'Create pot'}
            </button>
          </div>
        </div>
      )}

      {activePots.length === 0 && archivedPots.length === 0 ? (
        <p className="text-xs text-slate-500 py-2 text-center">
          {lang === 'my' ? 'စုငွေအိုး မရှိသေးပါ — အိုးအသစ် ဖန်တီးပြီး ပန်းတိုင်ထားစုပါ' : 'No savings pots yet — create a pot and start saving toward a goal.'}
        </p>
      ) : (
        <div className="space-y-3">{activePots.map(renderPotCard)}</div>
      )}

      {archivedPots.length > 0 && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer min-h-11 px-1"
          >
            {showArchived ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {lang === 'my' ? `သိမ်းထားသော အိုးများ (${archivedPots.length})` : `Archived pots (${archivedPots.length})`}
          </button>
          {showArchived && <div className="space-y-3 opacity-90">{archivedPots.map(renderPotCard)}</div>}
        </div>
      )}

      <div className="text-[10px] font-semibold text-slate-400 pt-0.5">
        {cloudState === 'synced'
          ? (lang === 'my' ? '☁️ Cloud Sync ပြုလုပ် — စက်တိုင်း တူညီမည်' : '☁️ Cloud synced — same on every device')
          : cloudState === 'loading'
          ? (lang === 'my' ? '☁️ Cloud နှင့် ချိတ်ဆက်နေသည်...' : '☁️ Syncing with cloud...')
          : cloudState === 'error'
          ? (lang === 'my' ? '⚠️ Cloud နှင့် ချိတ်ဆက်၍ မရပါ — ဒီစက်မှာသာ သက်ရောက်သည်' : '⚠️ Cloud unreachable — applies on this device only')
          : (lang === 'my' ? '📱 ဒီစက်မှာသာ သက်ရောက်သည်' : '📱 Applies on this device only')}
      </div>

      {/* App-styled delete confirm (same pattern as DebtsView). */}
      {confirmState && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-xl border border-slate-200 p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900">{confirmState.title}</h3>
            <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">{confirmState.message}</p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmState(null)}
                className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-sm cursor-pointer"
              >
                {lang === 'my' ? 'မလုပ်တော့ပါ' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const action = confirmState.onConfirm;
                  setConfirmState(null);
                  action();
                }}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm cursor-pointer"
              >
                {confirmState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
