import React, { useState } from 'react';
import { HandCoins, Plus, ArrowUpRight, ArrowDownLeft, Phone, Clock, AlertTriangle, CreditCard, Trash2, Lock, ChevronDown, ChevronUp, Pencil } from 'lucide-react';
import { Debt, PlanType, Wallet } from '../types';
import { formatMMK, formatShortDate, isOverdue } from '../utils/formatters';
import { buildWalletMap } from '../utils/walletBalance';
import { convertToMMK, formatCurrency } from '../utils/currency';

interface DebtsViewProps {
  debts: Debt[];
  wallets: Wallet[];
  plan: PlanType;
  maxFreeDebts: number;
  lang: 'my' | 'en';
  onAddDebt: () => void;
  onRecordRepayment: (debt: Debt) => void;
  onDeleteDebt: (id: string) => void;
  onDeleteRepayment?: (debtId: string, repaymentId: string) => void;
  onEditRepayment?: (debt: Debt, repayment: { id: string; amount: number; date: string; walletId: string; note?: string }) => void;
  onToggleStatus: (id: string) => void;
  // [v7.5.55 D28] Edit a debt (App wiring: onEditDebt opens DebtModal in
  // edit mode with onUpdate={handleUpdateDebt}).
  onEditDebt?: (debt: Debt) => void;
  onOpenUpgradeModal: () => void;
}

export const DebtsView: React.FC<DebtsViewProps> = ({
  debts,
  wallets,
  plan,
  maxFreeDebts,
  lang,
  onAddDebt,
  onRecordRepayment,
  onDeleteDebt,
  onDeleteRepayment,
  onEditRepayment,
  onToggleStatus,
  onEditDebt,
  onOpenUpgradeModal,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'receivable' | 'payable' | 'settled'>('all');
  const [selectedWalletFilter, setSelectedWalletFilter] = useState<string>('all');
  const [expandedDebtId, setExpandedDebtId] = useState<string | null>(null);

  const walletMap = buildWalletMap(wallets);

  // Filter debts by selected wallet
  const walletFilteredDebts = React.useMemo(() => {
    if (selectedWalletFilter === 'all') return debts;
    return debts.filter((d) => d.walletId === selectedWalletFilter || d.repayments?.some((r) => r.walletId === selectedWalletFilter));
  }, [debts, selectedWalletFilter]);

  const activeDebts = walletFilteredDebts.filter((d) => d.status === 'active');
  const settledDebts = walletFilteredDebts.filter((d) => d.status === 'settled');

  // [v7.5.55 D12] Convert using the DEBT's currency (explicit Debt.currency,
  // else its wallet's currency). The wallet's pinned rate only applies when
  // it is the same currency; otherwise the default rate for the currency is used.
  const debtCurrency = (d: Debt) => {
    const w = walletMap.get(d.walletId);
    return d.currency || w?.currency || 'MMK';
  };
  const convertDebtAmountToMMK = (d: Debt, amount: number) => {
    const w = walletMap.get(d.walletId);
    const cur = debtCurrency(d);
    const rate = w && (w.currency || 'MMK') === cur ? w.exchangeRate : undefined;
    return convertToMMK(amount, cur, rate);
  };
  const convertDebtToMMK = (d: Debt) => {
    const remaining = Math.max(0, d.totalAmount - d.paidAmount);
    return convertDebtAmountToMMK(d, remaining);
  };

  // Calculations
  const totalReceivable = activeDebts
    .filter((d) => d.type === 'receivable')
    .reduce((sum, d) => sum + convertDebtToMMK(d), 0);

  const totalPayable = activeDebts
    .filter((d) => d.type === 'payable')
    .reduce((sum, d) => sum + convertDebtToMMK(d), 0);

  // Filter list
  const filteredDebts = walletFilteredDebts.filter((d) => {
    if (activeTab === 'settled') return d.status === 'settled';
    if (d.status === 'settled' && activeTab !== 'all') return false;
    if (activeTab === 'receivable') return d.type === 'receivable' && d.status === 'active';
    if (activeTab === 'payable') return d.type === 'payable' && d.status === 'active';
    return true;
  });

  const isAtLimit = plan !== 'premium' && activeDebts.length >= maxFreeDebts;

  const toggleExpand = (id: string) => {
    setExpandedDebtId(expandedDebtId === id ? null : id);
  };

  // [v7.5.55 D32] Overdue debts first, then earliest due date, then newest.
  const sortedFilteredDebts = React.useMemo(() => {
    return [...filteredDebts].sort((a, b) => {
      const aOver = a.status === 'active' && isOverdue(a.dueDate);
      const bOver = b.status === 'active' && isOverdue(b.dueDate);
      if (aOver !== bOver) return aOver ? -1 : 1;
      const aDue = a.dueDate || '9999-99-99';
      const bDue = b.dueDate || '9999-99-99';
      if (aDue !== bDue) return aDue < bDue ? -1 : 1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }, [filteredDebts]);

  // [v7.5.55 D32] Same person with several debts, grouped with a per-person
  // remaining total (group order follows the sorted list).
  const personGroups = React.useMemo(() => {
    const groups: { key: string; personName: string; debts: Debt[]; totalRemainingMMK: number }[] = [];
    const byKey = new Map<string, (typeof groups)[number]>();
    sortedFilteredDebts.forEach((d) => {
      const key = d.personName.trim().toLowerCase();
      let g = byKey.get(key);
      if (!g) {
        g = { key, personName: d.personName, debts: [], totalRemainingMMK: 0 };
        byKey.set(key, g);
        groups.push(g);
      }
      g.debts.push(d);
      g.totalRemainingMMK += convertDebtToMMK(d);
    });
    return groups;
  }, [sortedFilteredDebts]);

  // [v7.5.55 D5] Mark Settled / Reopen must be confirmed with the EXACT
  // amount and what it will do to real money — one tap used to invent a
  // repayment for the whole remaining balance plus a wallet transaction.
  const handleToggleClick = (debt: Debt) => {
    const cur = debtCurrency(debt);
    if (debt.status === 'active') {
      const remaining = Math.max(0, debt.totalAmount - debt.paidAmount);
      if (remaining <= 0) {
        onToggleStatus(debt.id);
        return;
      }
      const direction = debt.type === 'receivable'
        ? (lang === 'my' ? 'ငွေပြန်ဝင်လာမည် (ဝင်ငွေ)' : 'money will come IN (income)')
        : (lang === 'my' ? 'ငွေထွက်သွားမည် (ထွက်ငွေ)' : 'money will go OUT (expense)');
      const ok = window.confirm(
        lang === 'my'
          ? `“${debt.personName}” ၏ အကြွေးကို ကြေပြီဟု သတ်မှတ်မလား?

ကျန်ငွေ: ${formatCurrency(remaining, cur)}
ဤလုပ်ဆောင်ချက်သည် ကျန်ငွေ ${formatCurrency(remaining, cur)} အတွက် ငွေဆပ်မှတ်တမ်း တစ်ခု အလိုအလျောက် ဖန်တီးပြီး ပိုက်ဆံအိတ်တွင် ${direction} အဖြစ် တကယ့် ငွေစာရင်း (transaction) တစ်ခု ထည့်သွင်းပါမည်။`
          : `Mark "${debt.personName}"'s debt as settled?

Remaining: ${formatCurrency(remaining, cur)}
This will create a repayment record for ${formatCurrency(remaining, cur)} and book a REAL wallet transaction (${direction}).`
      );
      if (ok) onToggleStatus(debt.id);
      return;
    }
    // Reopen
    const settlementReps = (debt.repayments || []).filter((r) => r.id.startsWith('rep_settle_'));
    if (settlementReps.length > 0) {
      const ok = window.confirm(
        lang === 'my'
          ? `“${debt.personName}” ၏ အကြွေးကို ပြန်ဖွင့်မလား?

အလိုအလျောက် ကျေဇယား ငွေဆပ်မှတ်တမ်း (${settlementReps.length} ခု) နှင့် ၎င်း၏ တွဲဖက် ငွေစာရင်းများကို ဖျက်ပါမည်။`
          : `Reopen "${debt.personName}"'s debt?

The auto-settlement repayment (${settlementReps.length} record(s)) and its linked wallet transaction(s) will be deleted.`
      );
      if (ok) onToggleStatus(debt.id);
      return;
    }
    // Naturally settled: the handler removes the most recent repayment(s)
    // until paid < total — name exactly which records that deletes.
    const sorted = [...(debt.repayments || [])].sort((a, b) =>
      (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0));
    // Same basis as the handler: paid is the sum of the repayment records.
    let paid = (debt.repayments || []).reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const toRemove: typeof sorted = [];
    for (const r of sorted) {
      if (paid < debt.totalAmount) break;
      toRemove.push(r);
      paid -= Number(r.amount) || 0;
    }
    if (toRemove.length === 0) {
      onToggleStatus(debt.id);
      return;
    }
    const desc = toRemove
      .map((r) => `${formatCurrency(r.amount, cur)} (${formatShortDate(r.date)})`)
      .join(', ');
    const ok = window.confirm(
      lang === 'my'
        ? `“${debt.personName}” ၏ အကြွေးကို ပြန်ဖွင့်မလား?

ဤအကြွေးသည် ပုံမှန် ငွေဆပ်မှုများဖြင့် ကြေခဲ့ခြင်း ဖြစ်ပါသည်။ ပြန်ဖွင့်ရန် နောက်ဆုံး ငွေဆပ်မှတ်တမ်း(များ) ကို ဖျက်ရပါမည်:
${desc}

ထို မှတ်တမ်းများနှင့် ၎င်းတို့၏ တွဲဖက် ငွေစာရင်း (wallet transaction) များကို ဖျက်ပါမည်။`
        : `Reopen "${debt.personName}"'s debt?

This debt was settled by ordinary repayments. To reopen it the most recent repayment(s) must be removed:
${desc}

Those records and their linked wallet transactions will be deleted.`
    );
    if (ok) onToggleStatus(debt.id);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {lang === 'my' ? 'အကြွေး စာရင်းများ (ပေးရန် / ရရန်)' : 'Debt & Loan Manager'}
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {activeDebts.length} {lang === 'my' ? 'ခု လက်ကျန်' : 'active'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-normal">
            {lang === 'my'
              ? 'သူများဆီက ရရန်ရှိငွေနှင့် သူများကို ပြန်ပေးရန်ရှိငွေများကို အကြေဆပ်သည်အထိ မှတ်တမ်းတင်ပါ'
              : 'Track loans, customer credits, and personal debts with installment tracking'}
          </p>
        </div>

        <button
          id="debt-add-btn"
          onClick={() => {
            if (isAtLimit) {
              onOpenUpgradeModal();
            } else {
              onAddDebt();
            }
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 shadow-xs active:scale-95 transition-all cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4 text-white stroke-[2.5]" />
          <span>{lang === 'my' ? '+ အကြွေးသစ်မှတ်မည်' : '+ Add Debt / Loan'}</span>
        </button>
      </div>

      {/* Limit Notice if Free and close to limit */}
      {isAtLimit && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-amber-900 font-medium">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              {lang === 'my'
                ? `Free Plan တွင် အကြွေးစာရင်း အများဆုံး ${maxFreeDebts} ခုသာ မှတ်တမ်းတင်နိုင်ပါသည်။ အကန့်အသတ်မဲ့ သုံးရန် Premium သို့ အဆင့်မြှင့်ပါ။`
                : `You reached the Free Plan limit of ${maxFreeDebts} active debt records. Upgrade to Premium for unlimited tracking.`}
            </span>
          </div>
          <button
            onClick={onOpenUpgradeModal}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 whitespace-nowrap"
          >
            {lang === 'my' ? 'အဆင့်မြှင့်မည်' : 'Upgrade'}
          </button>
        </div>
      )}

      {/* Wallet Filter Selector Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-amber-600" />
            <span>{lang === 'my' ? 'အကောင့်အလိုက် အကြွေးကြည့်ရန် (Filter Debts by Wallet):' : 'Filter Debts by Wallet:'}</span>
          </label>
          {selectedWalletFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setSelectedWalletFilter('all')}
              className="text-xs font-semibold text-amber-700 hover:underline cursor-pointer"
            >
              {lang === 'my' ? 'အကောင့် အားလုံးပြပါ' : 'Show All Wallets'}
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <button
            type="button"
            onClick={() => setSelectedWalletFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedWalletFilter === 'all'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200'
            }`}
          >
            🌐 {lang === 'my' ? 'အကောင့် အားလုံး (All Wallets)' : 'All Wallets'}
          </button>

          {wallets.map((w) => {
            const isSelected = selectedWalletFilter === w.id;
            const walletDebts = debts.filter((d) => d.status === 'active' && (d.walletId === w.id || d.repayments?.some((r) => r.walletId === w.id)));
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => setSelectedWalletFilter(w.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: w.color || '#F59E0B' }}
                />
                <span>{lang === 'my' ? w.name : w.nameEn}</span>
                {walletDebts.length > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900'
                  }`}>
                    {walletDebts.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI Cards: Receivable vs Payable */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Receivable (ရရန်ရှိ) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                <ArrowDownLeft className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                  {lang === 'my' ? 'သူများဆီက ရရန်ရှိငွေ (Receivable)' : 'Money Owed to You'}
                </h3>
                <p className="text-[11px] text-slate-400 font-normal">
                  {lang === 'my' ? 'ငွေချေးထားခြင်း၊ ပစ္စည်းအကြွေးရရန်' : 'Loans you gave / sales credits'}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-bold text-emerald-700 tracking-tight">
              {formatMMK(totalReceivable)}
            </div>
            <div className="text-xs text-slate-500 mt-1 font-medium">
              {activeDebts.filter((d) => d.type === 'receivable').length}{' '}
              {lang === 'my' ? 'ဦး ဆီမှ ပြန်ရရန်ရှိသည်' : 'active receivables'}
            </div>
          </div>
        </div>

        {/* Payable (ပေးရန်ရှိ) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-100">
                <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-800">
                  {lang === 'my' ? 'သူများကို ပေးရန်ရှိငွေ (Payable)' : 'Debts You Owe'}
                </h3>
                <p className="text-[11px] text-slate-400 font-normal">
                  {lang === 'my' ? 'ချေးငှားထားငွေ၊ ဝယ်ယူထားသည့်အကြွေး' : 'Money you borrowed / bills owed'}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-bold text-rose-700 tracking-tight">
              {formatMMK(totalPayable)}
            </div>
            <div className="text-xs text-slate-500 mt-1 font-medium">
              {activeDebts.filter((d) => d.type === 'payable').length}{' '}
              {lang === 'my' ? 'ဦး အား ပြန်ဆပ်ရန်ရှိသည်' : 'active payables'}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Filter (All / Receivable / Payable / Settled) - Responsive Wrap */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 border-b border-slate-200 pb-2">
        {[
          // [v7.5.55 D22] Was debts.length (unfiltered) while the list, the
          // header badge, the KPIs and the limit check all use the
          // wallet-filtered lists.
          { id: 'all', labelMy: 'အားလုံး', labelEn: 'All Debts', count: walletFilteredDebts.length },
          {
            id: 'receivable',
            labelMy: 'ရရန်ရှိ (သူများဆီက)',
            labelEn: 'Receivables',
            count: activeDebts.filter((d) => d.type === 'receivable').length,
            color: 'emerald',
          },
          {
            id: 'payable',
            labelMy: 'ပေးရန်ရှိ (သူများကို)',
            labelEn: 'Payables',
            count: activeDebts.filter((d) => d.type === 'payable').length,
            color: 'rose',
          },
          {
            id: 'settled',
            labelMy: 'အကြွေးကြေပြီး (ဆပ်ပြီး)',
            labelEn: 'Settled',
            count: settledDebts.length,
          },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer active:scale-95 ${
                isActive
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>{lang === 'my' ? tab.labelMy : tab.labelEn}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isActive ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Debts List */}
      <div className="space-y-4">
        {filteredDebts.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400 space-y-2">
            <HandCoins className="w-12 h-12 mx-auto text-slate-300" />
            <p className="text-sm font-medium text-slate-600">
              {lang === 'my' ? 'ဤကဏ္ဍတွင် အကြွေးမှတ်တမ်း မရှိသေးပါ' : 'No debt records in this category.'}
            </p>
            <p className="text-xs text-slate-400">
              {lang === 'my' ? 'အကြွေးသစ်မှတ်တမ်းတင်ရန် "+ အကြွေးသစ်မှတ်မည်" ကို နှိပ်ပါ' : 'Click "+ Add Debt / Loan" to create one.'}
            </p>
          </div>
        ) : (
          personGroups.map((group) => (
            <div key={group.key} className="space-y-4">
              {/* [v7.5.55 D32] Per-person group header (only when one person
                  has several debts in the current filter). */}
              {group.debts.length > 1 && (
                <div className="flex items-center justify-between px-1 pt-1">
                  <span className="text-xs font-bold text-slate-700">
                    👤 {group.personName} · {group.debts.length} {lang === 'my' ? 'ခု' : 'debts'}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    {lang === 'my' ? 'စုစုပေါင်း ကျန်ငွေ:' : 'Total remaining:'} {formatMMK(group.totalRemainingMMK)}
                  </span>
                </div>
              )}
              {group.debts.map((debt) => {
            const remaining = Math.max(0, debt.totalAmount - debt.paidAmount);
            const percentPaid = Math.min(100, Math.round((debt.paidAmount / debt.totalAmount) * 100));
            const overdue = debt.status === 'active' && isOverdue(debt.dueDate);
            const isReceivable = debt.type === 'receivable';
            const isExpanded = expandedDebtId === debt.id;
            const wallet = walletMap.get(debt.walletId);

            return (
              <div
                key={debt.id}
                className={`bg-white rounded-2xl border transition-all shadow-xs overflow-hidden ${
                  debt.status === 'settled'
                    ? 'border-slate-200 opacity-80'
                    : overdue
                    ? 'border-rose-300 ring-1 ring-rose-200'
                    : isReceivable
                    ? 'border-emerald-200/80 hover:border-emerald-300'
                    : 'border-rose-200/80 hover:border-rose-300'
                }`}
              >
                {/* Header Row */}
                <div className="p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    {/* Left: Person & Consolidated Info */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-xs ${
                          debt.status === 'settled'
                            ? 'bg-slate-400'
                            : isReceivable
                            ? 'bg-emerald-600'
                            : 'bg-rose-600'
                        }`}
                      >
                        {debt.personName.slice(0, 1)}
                      </div>

                      <div className="min-w-0 flex-1 space-y-0.5">
                        {/* Line 1: Important Info (Person Name & Due Date) */}
                        <div className="flex items-center justify-between gap-2 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <h3 className="font-bold text-sm sm:text-base text-slate-900 truncate">{debt.personName}</h3>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                debt.status === 'settled'
                                  ? 'bg-slate-100 text-slate-700'
                                  : isReceivable
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {debt.status === 'settled'
                                ? (lang === 'my' ? '✓ အကြွေးကြေပြီ' : '✓ Settled')
                                : isReceivable
                                ? (lang === 'my' ? 'ရရန်ရှိ' : 'Receivable')
                                : (lang === 'my' ? 'ပေးရန်ရှိ' : 'Payable')}
                            </span>
                            {overdue && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500 text-white animate-pulse flex items-center gap-0.5 shrink-0">
                                <AlertTriangle className="w-3 h-3" />
                                {lang === 'my' ? 'ရက်လွန်' : 'Overdue'}
                              </span>
                            )}
                          </div>

                          {debt.dueDate && (
                            <span className={`text-[11px] font-mono shrink-0 flex items-center gap-1 ${overdue ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                              <Clock className="w-3 h-3" />
                              {formatShortDate(debt.dueDate)}
                            </span>
                          )}
                        </div>

                        {/* Line 2: Amount & Note / Phone */}
                        <div className="flex items-center justify-between gap-2 min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0 text-xs text-slate-500 truncate">
                            <span className={`font-mono font-bold text-sm sm:text-base shrink-0 ${
                              debt.status === 'settled'
                                ? 'text-slate-700'
                                : isReceivable
                                ? 'text-emerald-700'
                                : 'text-rose-700'
                            }`}>
                              {formatMMK(convertDebtAmountToMMK(debt, debt.status === 'settled' ? debt.totalAmount : remaining))}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span
                              className="text-slate-600 text-[11px] font-mono shrink-0 flex items-center gap-0.5"
                              title={lang === 'my' ? 'အကြွေးစတင်သည့်ရက်စွဲ' : 'Start date'}
                            >
                              📅 {lang === 'my' ? 'စတင်:' : 'Since:'} {formatShortDate(debt.startDate)}
                            </span>
                            {debt.phone && (
                              <>
                                <span className="text-slate-300">•</span>
                                <a href={`tel:${debt.phone}`} className="text-indigo-600 text-[11px] font-mono shrink-0 hover:underline">
                                  📞 {debt.phone}
                                </a>
                              </>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-400 font-mono shrink-0">
                            {lang === 'my' ? 'မူလ:' : 'Total:'} {formatMMK(convertDebtAmountToMMK(debt, debt.totalAmount))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Note if present */}
                  {debt.note && (
                    <div className="mt-3 p-2.5 rounded-lg bg-slate-50 text-xs text-slate-600 border border-slate-100 italic">
                      "{debt.note}"
                    </div>
                  )}

                  {/* Progress Bar */}
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>
                        {lang === 'my' ? 'ဆပ်ပြီးငွေ:' : 'Paid:'} {formatMMK(convertDebtAmountToMMK(debt, debt.paidAmount))} ({percentPaid}%)
                      </span>
                      <span>
                        {lang === 'my' ? 'ကျန်ငွေ:' : 'Left:'} {formatMMK(convertDebtAmountToMMK(debt, remaining))}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          debt.status === 'settled'
                            ? 'bg-slate-400'
                            : isReceivable
                            ? 'bg-emerald-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${percentPaid}%` }}
                      />
                    </div>
                  </div>

                  {/* Action Buttons Row */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                    {/* Toggle Repayment History */}
                    <button
                      onClick={() => toggleExpand(debt.id)}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 py-1"
                    >
                      <span>
                        {lang === 'my'
                          ? `ငွေဆပ်မှတ်တမ်း (${debt.repayments.length})`
                          : `Repayment History (${debt.repayments.length})`}
                      </span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    <div className="flex items-center gap-2">
                      {/* Record Repayment Button */}
                      {debt.status === 'active' && (
                        <button
                          onClick={() => onRecordRepayment(debt)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-2xs"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>
                            {isReceivable
                              ? (lang === 'my' ? '+ ငွေပြန်လက်ခံမည်' : '+ Receive Payment')
                              : (lang === 'my' ? '+ ငွေဆပ်မည်' : '+ Make Payment')}
                          </span>
                        </button>
                      )}

                      {/* [v7.5.55 D28] Edit the debt itself (person, amount,
                          type, dates, wallet, note). */}
                      {onEditDebt && (
                        <button
                          onClick={() => onEditDebt(debt)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title={lang === 'my' ? 'အကြွေး ပြင်ဆင်မည်' : 'Edit debt'}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}

                      {/* Mark Settled Toggle */}
                      <button
                        onClick={() => handleToggleClick(debt)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                          debt.status === 'settled'
                            ? 'text-slate-600 border-slate-200 hover:bg-slate-100'
                            : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                        }`}
                        title="Toggle Settled Status"
                      >
                        {debt.status === 'settled'
                          ? (lang === 'my' ? 'မဆပ်ရသေးအဖြစ်ပြောင်း' : 'Reopen')
                          : (lang === 'my' ? 'အကြွေးကြေပြီ' : 'Mark Settled')}
                      </button>

                      {/* Delete Debt */}
                      <button
                        onClick={() => {
                          if (window.confirm(lang === 'my' ? 'ဤအကြွေးမှတ်တမ်းကို ဖျက်ရန် သေချာပါသလား?' : 'Delete this debt record?')) {
                            onDeleteDebt(debt.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Repayment History Accordion */}
                {isExpanded && (
                  <div className="bg-slate-50/90 border-t border-slate-200/80 p-4 space-y-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      {lang === 'my' ? 'အရစ်ကျ ပြန်ဆပ်ထားသော မှတ်တမ်းများ' : 'Installment Repayment History'}
                    </h4>

                    {debt.repayments.length === 0 ? (
                      <p className="text-xs text-slate-400 py-2">
                        {lang === 'my'
                          ? 'ငွေဆပ်မှတ်တမ်း မရှိသေးပါ။ "+ ငွေဆပ်မှတ်မည်" ဖြင့် ထည့်သွင်းနိုင်ပါသည်။'
                          : 'No repayments recorded yet. Click "+ Record Payment".'}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {debt.repayments.map((rep) => {
                          const repWallet = walletMap.get(rep.walletId);
                          return (
                            <div
                              key={rep.id}
                              className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/70 text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${isReceivable ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                <div>
                                  <span className="font-semibold text-slate-900">{formatShortDate(rep.date)}</span>
                                  {rep.note && (
                                    <span className="text-slate-500 ml-2 italic">"{rep.note}"</span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="text-slate-500">
                                  {repWallet
                                    ? (lang === 'my' ? repWallet.name : repWallet.nameEn)
                                    : (lang === 'my' ? 'ဖျက်လိုက်သော ပိုက်ဆံအိတ်' : 'Deleted wallet')}
                                </span>
                                <span className={`font-bold ${isReceivable ? 'text-emerald-700' : 'text-rose-700'}`}>
                                  {isReceivable ? '+' : '-'}{formatCurrency(rep.amount, debtCurrency(debt))}
                                </span>
                                <div className="flex items-center gap-1">
                                  {rep.transactionId && (
                                    <span
                                      className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 shrink-0"
                                      title={lang === 'my' ? `တွဲဖက်ငွေစာရင်း ID: ${rep.transactionId}` : `Linked transaction ID: ${rep.transactionId}`}
                                    >
                                      🔗 #{rep.transactionId.slice(-6)}
                                    </span>
                                  )}
                                  {onEditRepayment && (
                                    <button
                                      type="button"
                                      onClick={() => onEditRepayment(debt, rep)}
                                      className="p-1 text-slate-400 hover:text-emerald-600 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                                      title={lang === 'my' ? 'ငွေဆပ်မှတ်တမ်း ပြင်ဆင်မည်' : 'Edit repayment'}
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {onDeleteRepayment && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (window.confirm(lang === 'my' ? 'ဤငွေဆပ်မှတ်တမ်းကို ဖျက်ရန် သေချာပါသလား။' : 'Delete this repayment record?')) {
                                          onDeleteRepayment(debt.id, rep.id);
                                        }
                                      }}
                                      className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                                      title={lang === 'my' ? 'ငွေဆပ်မှတ်တမ်းဖျက်မည်' : 'Delete repayment'}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
