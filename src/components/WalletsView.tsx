import React, { useState, useMemo, useEffect } from 'react';
import { WalletCards, Plus, ArrowRightLeft, Lock, Edit2, Trash2, TrendingUp, Scale, UserPlus, Users, LogOut, Building2, CreditCard, Smartphone, Coins, PiggyBank, DollarSign, Globe, Landmark, ShieldCheck, ChevronDown, ChevronUp, Calculator, Crown } from 'lucide-react';
import { PlanType, Wallet, WalletPermissions, Transaction } from '../types';
import { formatMMK } from '../utils/formatters';
import {
  SUPPORTED_CURRENCIES,
  getCurrencyInfo,
  formatCurrency,
  convertToMMK,
} from '../utils/currency';
import { getSharedWalletDocId } from '../lib/sharedWalletService';
import {
  bootstrapExchangeRates,
  subscribeRates,
  getRateSnapshot,
  refreshExchangeRates,
  type RateSnapshot,
} from '../lib/exchangeRates';
import { getCollaboratorPermissions, DEFAULT_WALLET_PERMISSIONS } from '../utils/permissions';
import { isWalletMatch } from '../utils/walletBalance';
import { parseMyanmarNumber } from '../utils/myanmarDigits';
import { ShareWalletModal } from './ShareWalletModal';
import { WalletModal } from './WalletModal';
import { useAuth } from '../context/AuthContext';

interface WalletsViewProps {
  wallets: Wallet[];
  transactions?: Transaction[];
  plan: PlanType;
  maxFreeWallets: number;
  lang: 'my' | 'en';
  onAddWallet: (wallet: Omit<Wallet, 'id'>) => void;
  onUpdateWallet?: (wallet: Wallet) => void;
  onUpdateWalletBalance: (id: string, newBalance: number) => void;
  onDeleteWallet: (id: string) => void;
  onTransferFunds: (fromWalletId: string, toWalletId: string, amount: number, note?: string) => void;
  onOpenUpgradeModal: () => void;
  onOpenReconcileModal: (walletId?: string) => void;
  onAddTransaction?: (type?: 'income' | 'expense', walletId?: string) => void;
  // [v7.5.56] Return false when the share/unshare was refused or failed,
  // so the modal never shows a success state for it (void = legacy).
  onShareWallet?: (walletId: string, email: string) => Promise<boolean> | boolean | void;
  onUnshareWallet?: (walletId: string, email: string) => Promise<boolean> | boolean | void;
  onUpdatePermissions?: (walletId: string, email: string, permissions: WalletPermissions) => void;
  onSyncRefresh?: (overrideWorkspaceId?: string) => Promise<void>;
  // [v7.5.56] Coordinator wires these from App: onTransferOwnership =
  // handleTransferOwnership, maxCollaborators = limits.maxCollaborators
  // (limits table, single source of truth), onOpenSignIn = opens the
  // auth modal for the ShareWalletModal guest gate.
  onTransferOwnership?: (wallet: Wallet, newOwnerEmail: string) => void;
  maxCollaborators?: number;
  onOpenSignIn?: () => void;
}

const WALLET_ICONS_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  wallet: WalletCards,
  bank: Building2,
  card: CreditCard,
  mobile: Smartphone,
  cash: Coins,
  piggy: PiggyBank,
  dollar: DollarSign,
  globe: Globe,
  landmark: Landmark,
  shield: ShieldCheck,
};

export const WalletsView: React.FC<WalletsViewProps> = ({
  wallets,
  transactions = [],
  plan,
  maxFreeWallets,
  lang,
  onAddWallet,
  onUpdateWallet,
  onUpdateWalletBalance,
  onDeleteWallet,
  onTransferFunds,
  onOpenUpgradeModal,
  onOpenReconcileModal,
  onAddTransaction,
  onShareWallet,
  onUnshareWallet,
  onUpdatePermissions,
  onSyncRefresh,
  onTransferOwnership,
  maxCollaborators,
  onOpenSignIn,
}) => {
  // [v7.5.56] Cross-worker contract: updateSharedWalletScopeOverride is
  // exposed from AuthContext by another worker — the per-viewer Separate
  // toggle for shared wallets (never writes includeInTotals to the
  // shared doc).
  const { user, activeWorkspaceId, invitedWorkspaces, switchWorkspace, updateSharedWalletScopeOverride } = useAuth();
  const [switchingWorkspace, setSwitchingWorkspace] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [walletToEdit, setWalletToEdit] = useState<Wallet | null>(null);
  const [selectedWalletForShare, setSelectedWalletForShare] = useState<Wallet | null>(null);
  const [showExchangeRatesPanel, setShowExchangeRatesPanel] = useState(false);

  // Quick Currency Converter State
  const [calcAmount, setCalcAmount] = useState<string>('100');
  const [calcCurrency, setCalcCurrency] = useState<string>('USD');
  const [calcCustomRate, setCalcCustomRate] = useState<string>('');

  // [v7.5.0] Live exchange rate snapshot (from exchangeRates service).
  const [ratesSnapshot, setRatesSnapshot] = useState<RateSnapshot>(getRateSnapshot());
  const [isRefreshingRates, setIsRefreshingRates] = useState(false);

  useEffect(() => {
    bootstrapExchangeRates();
    const unsub = subscribeRates((snap) => setRatesSnapshot(snap));
    return () => { unsub(); };
  }, []);

  // Transfer form states
  const [transferFrom, setTransferFrom] = useState(wallets[0]?.id || '');
  const [transferTo, setTransferTo] = useState(wallets[1]?.id || '');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNote, setTransferNote] = useState('');

  const handleOpenTransferModal = (fromId?: string) => {
    const validFrom = fromId && wallets.some((w) => w.id === fromId) ? fromId : wallets[0]?.id || '';
    const otherWallets = wallets.filter((w) => w.id !== validFrom);
    const validTo = otherWallets[0]?.id || '';
    setTransferFrom(validFrom);
    setTransferTo(validTo);
    setTransferAmount('');
    setTransferNote('');
    setShowTransferModal(true);
  };

  // Wallets Filter: All, Included in Totals, Excluded (Separate)
  const [walletFilter, setWalletFilter] = useState<'all' | 'included' | 'excluded'>('all');

  // Wallets categorization: included in totals vs excluded
  const includedWallets = useMemo(() => wallets.filter((w) => w.includeInTotals !== false), [wallets]);
  const excludedWallets = useMemo(() => wallets.filter((w) => w.includeInTotals === false), [wallets]);

  // Calculate total net assets for included wallets (converted to MMK)
  const totalIncludedMMK = useMemo(() => {
    return includedWallets.reduce((sum, w) => {
      const converted = convertToMMK(w.balance, w.currency, w.exchangeRate);
      return sum + converted;
    }, 0);
  }, [includedWallets, ratesSnapshot.updatedAt]);

  // Excluded total (MMK)
  const totalExcludedMMK = useMemo(() => {
    return excludedWallets.reduce((sum, w) => {
      const converted = convertToMMK(w.balance, w.currency, w.exchangeRate);
      return sum + converted;
    }, 0);
  }, [excludedWallets, ratesSnapshot.updatedAt]);

  // Grand total of all wallets combined (MMK)
  const grandTotalAllMMK = useMemo(() => {
    return wallets.reduce((sum, w) => {
      const converted = convertToMMK(w.balance, w.currency, w.exchangeRate);
      return sum + converted;
    }, 0);
  }, [wallets, ratesSnapshot.updatedAt]);

  const displayedWallets = useMemo(() => {
    if (walletFilter === 'included') return includedWallets;
    if (walletFilter === 'excluded') return excludedWallets;
    return wallets;
  }, [wallets, includedWallets, excludedWallets, walletFilter]);

  // [v7.5.56] Separate toggle is PER-USER for a shared wallet: it calls
  // updateSharedWalletScopeOverride and changes ONLY this viewer's scope.
  // It must never write includeInTotals to the shared doc and never
  // rewrite ownerUid. Only a personal (unshared) wallet goes through
  // onUpdateWallet.
  const handleToggleIncludeInTotals = async (wallet: Wallet, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextState = wallet.includeInTotals === false ? true : false;
    const isSharedWallet = Boolean(wallet.isSharedFromOther || (wallet.sharedWith && wallet.sharedWith.length > 0));
    if (isSharedWallet) {
      if (typeof updateSharedWalletScopeOverride === 'function' && user?.uid) {
        const sharedDocId = getSharedWalletDocId(wallet, user.uid);
        const ok = await updateSharedWalletScopeOverride(sharedDocId, nextState);
        if (!ok) {
          console.warn('[v7.5.56] scope override did not land for', sharedDocId);
        }
      } else {
        console.warn('[v7.5.56] updateSharedWalletScopeOverride is not available yet — Separate toggle skipped for shared wallet');
      }
      return;
    }
    if (onUpdateWallet) {
      onUpdateWallet({
        ...wallet,
        includeInTotals: nextState,
      });
    }
  };

  // [v7.5.56] Owner-only ownership transfer entry point (wallet menu).
  // The new owner must already be a member — the handler enforces it
  // and confirms before writing anything.
  const handleTransferOwnershipClick = (wallet: Wallet) => {
    if (!onTransferOwnership) return;
    const raw = window.prompt(
      lang === 'my'
        ? `ပိုင်ဆိုင်မှု လွှဲပြောင်းမည့် အဖွဲ့ဝင်၏ Email ကို ထည့်ပါ:\n(ဤ Wallet ၏ လက်ရှိ အဖွဲ့ဝင် ဖြစ်ရပါမည်)`
        : 'Enter the email of the member to transfer ownership to:\n(They must already be a member of this wallet)'
    );
    if (raw === null) return;
    const email = raw.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      window.alert(lang === 'my' ? 'မှန်ကန်သော Email လိပ်စာ ဖြစ်ရပါမည်' : 'Please enter a valid email address');
      return;
    }
    onTransferOwnership(wallet, email);
  };

  // [v7.5.56] Display name of the person a wallet is shared by — never
  // the literal 'Partner' placeholder the service used to fall back to.
  const sharedByLabel = (wallet: Wallet): string => {
    const name = (wallet.ownerName || '').trim();
    if (name && name.toLowerCase() !== 'partner') return name;
    const email = (wallet.ownerEmail || '').trim();
    if (email && email.toLowerCase() !== 'partner') return email;
    return lang === 'my' ? 'ပိုင်ရှင်' : 'the owner';
  };

  // Group balances by currency for breakdown pills
  const currencyBreakdown = useMemo(() => {
    const map: Record<string, { total: number; count: number; totalMMK: number }> = {};
    wallets.forEach((w) => {
      const code = (w.currency || 'MMK').toUpperCase();
      if (!map[code]) {
        map[code] = { total: 0, count: 0, totalMMK: 0 };
      }
      map[code].total += w.balance;
      map[code].count += 1;
      map[code].totalMMK += convertToMMK(w.balance, w.currency, w.exchangeRate);
    });
    return map;
  }, [wallets, ratesSnapshot.updatedAt]);

  const hasForeignCurrency = useMemo(() => {
    return wallets.some((w) => w.currency && w.currency !== 'MMK');
  }, [wallets]);

  // [v7.5.56] This-month flow: amounts are converted with the wallet's
  // currency/exchangeRate to MMK BEFORE summing, so a foreign-currency
  // wallet's flow is no longer mixed up with raw MMK figures. The map
  // stores MMK; the card converts back to the wallet's currency for
  // display (see the month-flow render below).
  const thisMonthStatsMap = useMemo(() => {
    const now = new Date();
    const prefix = String(now.getFullYear()) + '-' + String(now.getMonth() + 1).padStart(2, '0');
    const map: Record<string, { inflowMMK: number; outflowMMK: number }> = {};
    wallets.forEach((w) => { map[w.id] = { inflowMMK: 0, outflowMMK: 0 }; });

    transactions.forEach((t) => {
      if (!t.date || !t.date.startsWith(prefix)) return;
      const w = wallets.find((wal) => isWalletMatch(wal, t.walletId));
      if (!w) return;
      const amountMMK = convertToMMK(t.amount, w.currency, w.exchangeRate);
      if (t.type === 'income') map[w.id].inflowMMK += amountMMK;
      else if (t.type === 'expense') map[w.id].outflowMMK += amountMMK;
    });

    return map;
  }, [wallets, transactions]);

  // [v7.5.56] "Of which shared" — the included-total slice that belongs
  // to shared wallets, for the banner line below.
  const totalSharedIncludedMMK = useMemo(() => {
    return includedWallets
      .filter((w) => w.isSharedFromOther || (w.sharedWith && w.sharedWith.length > 0))
      .reduce((sum, w) => sum + convertToMMK(w.balance, w.currency, w.exchangeRate), 0);
  }, [includedWallets, ratesSnapshot.updatedAt]);
  const hasSharedWallets = useMemo(
    () => wallets.some((w) => w.isSharedFromOther || (w.sharedWith && w.sharedWith.length > 0)),
    [wallets]
  );

  // [v7.5.55] Wallet limit from the CURRENT plan's row (App passes
  // maxFreeWallets={limits.maxWallets}: guest 1, free 2). Guest is
  // limited too — previously only free was enforced here.
  const isAtLimit =
    (plan === 'free' || plan === 'guest') && wallets.filter((w) => !w.isSharedFromOther).length >= maxFreeWallets;

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseMyanmarNumber(transferAmount);
    if (!amt || amt <= 0) return;
    if (transferFrom === transferTo) return;

    onTransferFunds(transferFrom, transferTo, amt, transferNote);
    setShowTransferModal(false);
    setTransferAmount('');
    setTransferNote('');
  };

  // [v7.5.56] Transfer dropdown label — shared wallets are marked so
  // the user can tell them apart (finding 36).
  const transferOptionLabel = (w: Wallet): string => {
    const sharedTag = lang === 'my' ? 'မျှဝေထား' : 'Shared';
    const marker = w.isSharedFromOther
      ? `🤝 ${sharedTag} — `
      : w.sharedWith && w.sharedWith.length > 0
      ? `👥 ${sharedTag} — `
      : '';
    return `${marker}${w.name} (${formatCurrency(w.balance, w.currency)})`;
  };

  const handleOpenAddWallet = () => {
    // [v7.5.55] Free at the limit goes to the upgrade modal. Guest at the
    // limit still opens the modal — the App-level handler enforces the
    // guest limit with the sign-in prompt (this view has no auth opener).
    if (isAtLimit && plan === 'free') {
      onOpenUpgradeModal();
      return;
    }
    setWalletToEdit(null);
    setIsWalletModalOpen(true);
  };

  const handleOpenEditWallet = (wallet: Wallet) => {
    setWalletToEdit(wallet);
    setIsWalletModalOpen(true);
  };

  const handleSaveWallet = (walletData: Omit<Wallet, 'id'> | Wallet) => {
    if ('id' in walletData && onUpdateWallet) {
      onUpdateWallet(walletData as Wallet);
    } else {
      onAddWallet(walletData as Omit<Wallet, 'id'>);
    }
  };

  // Mini Currency Converter calculation
  const calcRateNumber = useMemo(() => {
    if (calcCustomRate && parseFloat(calcCustomRate) > 0) {
      return parseFloat(calcCustomRate);
    }
    return getCurrencyInfo(calcCurrency).defaultRateToMMK;
  }, [calcCurrency, calcCustomRate, ratesSnapshot.updatedAt]);

  const calcResultMMK = useMemo(() => {
    const amt = parseFloat(calcAmount) || 0;
    return amt * calcRateNumber;
  }, [calcAmount, calcRateNumber]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {lang === 'my' ? 'ပိုက်ဆံအိတ်များနှင့် ဘဏ်အကောင့်များ' : 'Wallets & Bank Accounts'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-normal">
            {lang === 'my'
              ? 'ငွေသား၊ KPay၊ WavePay၊ ဘဏ်အကောင့်များနှင့် နိုင်ငံခြားငွေ (USD, THB, SGD) စာရင်းများ စီမံပါ'
              : 'Manage Cash, Mobile Pay, Banks, and Foreign Currencies with real-time exchange rates'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Exchange Rates Toggle */}
          <button
            type="button"
            onClick={() => setShowExchangeRatesPanel(!showExchangeRatesPanel)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition-all cursor-pointer active:scale-95 shadow-2xs ${
              showExchangeRatesPanel
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-indigo-50 hover:bg-indigo-100/80 text-indigo-900 border-indigo-200'
            }`}
            title="Exchange Rates & Converter"
          >
            <TrendingUp className="w-4 h-4 text-inherit" />
            <span>{lang === 'my' ? 'ငွေလဲနှုန်းများ' : 'Currency Rates'}</span>
            {showExchangeRatesPanel ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Reconcile Balance Button */}
          <button
            type="button"
            onClick={() => onOpenReconcileModal()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all cursor-pointer active:scale-95 shadow-2xs"
            title="Reconcile physical cash with recorded balance"
          >
            <Scale className="w-4 h-4 text-slate-600" />
            <span>{lang === 'my' ? 'စာရင်းညှိမည်' : 'Reconcile'}</span>
          </button>

          {/* Transfer Funds Button */}
          <button
            onClick={() => handleOpenTransferModal()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200/80 transition-all cursor-pointer active:scale-95"
          >
            <ArrowRightLeft className="w-4 h-4 text-slate-600" />
            <span>{lang === 'my' ? 'ငွေလွှဲရန်' : 'Transfer'}</span>
          </button>

          {/* Add Wallet Button */}
          <button
            onClick={handleOpenAddWallet}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white stroke-[2.5]" />
            <span>{lang === 'my' ? '+ အကောင့်သစ်' : '+ Add Wallet'}</span>
            {isAtLimit && <Lock className="w-3 h-3 text-amber-200" />}
          </button>
        </div>
      </div>

      {isAtLimit && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-amber-900 font-medium min-w-0">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              {lang === 'my'
                ? `${plan === 'guest' ? 'Guest Mode' : 'Free Plan'} တွင် ပိုက်ဆံအိတ် အများဆုံး ${maxFreeWallets} ခုသာ ထည့်သွင်းခွင့်ပြုထားသည်။ စိတ်ကြိုက်အကောင့်များ ထည့်သွင်းရန် Premium သို့ အဆင့်မြှင့်ပါ။`
                : `${plan === 'guest' ? 'Guest Mode' : 'Free Plan'} allows up to ${maxFreeWallets} wallets. Upgrade to Premium to create unlimited custom bank accounts and digital wallets.`}
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

      {/* Total Net Assets Banner */}
      <div className="bg-slate-900 p-6 rounded-3xl text-white shadow-md border border-slate-800 relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400">
                {lang === 'my'
                  ? excludedWallets.length > 0
                    ? 'စုစုပေါင်းထဲ ရောထားသော လက်ကျန် (ကျပ်ဖြင့်)'
                    : 'စုစုပေါင်း ဘဏ္ဍာငွေ လက်ကျန် (ကျပ်ဖြင့်)'
                  : excludedWallets.length > 0
                  ? 'Total Assets (Included in Totals)'
                  : 'Total Net Assets (in MMK)'}
              </span>
              {hasForeignCurrency && (
                <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {lang === 'my' ? 'ငွေလဲနှုန်းဖြင့် တွက်ထားသည်' : 'Converted at market rates'}
                </span>
              )}
            </div>

            <div className="text-3xl sm:text-4xl font-black mt-1 tracking-tight">
              {formatMMK(totalIncludedMMK)}
            </div>

            {/* [v7.5.56] "Of which shared" line on the banner total. */}
            {hasSharedWallets && (
              <div className="mt-1.5 text-xs font-semibold text-indigo-300">
                🤝{' '}
                {lang === 'my'
                  ? `ယင်းအထဲက မျှဝေထားသော အကောင့်: ${formatMMK(totalSharedIncludedMMK)}`
                  : `of which shared: ${formatMMK(totalSharedIncludedMMK)}`}
              </div>
            )}

            {/* If some wallets are excluded, show separate breakdown badge */}
            {excludedWallets.length > 0 && (
              <div className="mt-2 flex items-center gap-2 flex-wrap text-xs">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                  <span>🚫</span>
                  <span>
                    {lang === 'my'
                      ? `သီးသန့် (မရောပါ) ${excludedWallets.length} ခု: ${formatMMK(totalExcludedMMK)}`
                      : `Excluded (Separate) ${excludedWallets.length} wallets: ${formatMMK(totalExcludedMMK)}`}
                  </span>
                </span>
                <span className="text-slate-400 text-[11px]">
                  {lang === 'my'
                    ? `(အကောင့်အားလုံး စုစုပေါင်း: ${formatMMK(grandTotalAllMMK)})`
                    : `(Combined All: ${formatMMK(grandTotalAllMMK)})`}
                </span>
              </div>
            )}

            {/* Currency breakdown tags */}
            <div className="flex items-center gap-2 flex-wrap mt-3">
              {Object.entries(currencyBreakdown).map(([code, data]) => {
                const info = getCurrencyInfo(code);
                return (
                  <div
                    key={code}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/10 backdrop-blur-xs text-xs font-semibold text-slate-200 border border-white/15"
                  >
                    <span>{info.flag}</span>
                    <span className="text-white font-bold">
                      {formatCurrency(data.total, code)}
                    </span>
                    {code !== 'MMK' && (
                      <span className="text-[10px] text-emerald-300 opacity-90">
                        (≈ {(data.totalMMK / 1000000).toFixed(2)}M Ks)
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              onClick={() => onOpenReconcileModal()}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 text-xs sm:text-sm font-semibold backdrop-blur-xs border border-indigo-400/30 transition-all cursor-pointer active:scale-95"
            >
              <Scale className="w-4 h-4 text-indigo-300" />
              <span>{lang === 'my' ? 'စာရင်းညှိမည်' : 'Reconcile'}</span>
            </button>
            <button
              onClick={() => handleOpenTransferModal()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold backdrop-blur-xs border border-white/20 transition-all cursor-pointer active:scale-95"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>{lang === 'my' ? 'ငွေလွှဲမည်' : 'Transfer'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Expandable Exchange Rates & Quick Converter Panel */}
      {showExchangeRatesPanel && (
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  {lang === 'my'
                    ? 'ငွေလဲနှုန်း တွက်ချက်စက်နှင့် ပေါက်ဈေးများ'
                    : 'Currency Exchange Rates & Quick Converter'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {lang === 'my'
                    ? 'လက်ရှိ ခန့်မှန်း ပေါက်ဈေးများဖြစ်ပြီး Wallet တစ်ခုချင်းစီတွင် စိတ်ကြိုက် ပြင်ဆင်နိုင်ပါသည်'
                    : 'Estimated reference rates. Can be customized for each individual wallet.'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowExchangeRatesPanel(false)}
              className="text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          </div>

          {/* Quick Converter Bar */}
          <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-100 flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Calculator className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="text-xs font-bold text-indigo-950 whitespace-nowrap">
                {lang === 'my' ? 'ချက်ချင်း တွက်ရန်:' : 'Quick Convert:'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full flex-1">
              <div className="relative">
                <input
                  type="number"
                  value={calcAmount}
                  onChange={(e) => setCalcAmount(e.target.value)}
                  placeholder="100"
                  className="w-full p-2 bg-white border border-indigo-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <select
                  value={calcCurrency}
                  onChange={(e) => {
                    setCalcCurrency(e.target.value);
                    setCalcCustomRate('');
                  }}
                  className="w-full p-2 bg-white border border-indigo-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {SUPPORTED_CURRENCIES.filter((c) => c.code !== 'MMK').map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.flag} {curr.code} (1 = {curr.defaultRateToMMK.toLocaleString()} Ks)
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-2 bg-emerald-600 text-white rounded-lg flex items-center justify-between font-bold text-xs shadow-2xs">
                <span>≈ {calcResultMMK.toLocaleString()} MMK</span>
                <span className="text-[10px] text-emerald-200">
                  (@ {calcRateNumber.toLocaleString()})
                </span>
              </div>
            </div>
          </div>

          {/* [v7.5.0] Rate source + last updated + refresh */}
          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 -mt-1 flex-wrap">
            <span className="flex items-center gap-1.5">
              {ratesSnapshot.source === 'live' ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold text-emerald-800">
                    {lang === 'my' ? 'ပေါက်ဈေး လက်ရှိ (Live)' : 'Live rate'}
                  </span>
                </>
              ) : ratesSnapshot.source === 'cache' ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span className="font-semibold text-amber-800">
                    {lang === 'my' ? 'Cache မှ ရယူထားသည်' : 'From cache'}
                  </span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <span>
                    {lang === 'my' ? 'Default တန်ဖိုးများ' : 'Default rates'}
                  </span>
                </>
              )}
              {ratesSnapshot.updatedAt > 0 && (
                <span className="text-slate-400">
                  · {new Date(ratesSnapshot.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={async () => {
                setIsRefreshingRates(true);
                try { await refreshExchangeRates(true); } finally { setIsRefreshingRates(false); }
              }}
              disabled={isRefreshingRates}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:text-indigo-900 disabled:opacity-50 cursor-pointer"
            >
              <TrendingUp className="w-3 h-3" />
              <span>{lang === 'my' ? 'ပေါက်ဈေး ပြန်ရယူမည်' : 'Refresh rates'}</span>
            </button>
          </div>

          {/* Popular Currencies Grid */}
          <div>
            <span className="text-xs font-bold text-slate-700 block mb-2">
              {lang === 'my' ? 'အသုံးများသော နိုင်ငံခြားငွေလဲနှုန်းများ (MMK):' : 'Popular Reference Rates (in MMK):'}
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
              {SUPPORTED_CURRENCIES.filter((c) => c.code !== 'MMK').map((curr) => {
                const assignedWallets = wallets.filter((w) => w.currency === curr.code);
                return (
                  <div
                    key={curr.code}
                    className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-slate-100/60 transition-colors space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{curr.flag}</span>
                      <span className="text-xs font-black text-slate-900">{curr.code}</span>
                    </div>
                    <div className="text-xs font-bold text-indigo-900">
                      1 {curr.code} ≈ {curr.defaultRateToMMK.toLocaleString()} Ks
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">
                      {assignedWallets.length > 0
                        ? `${assignedWallets.length} ${lang === 'my' ? 'အကောင့်ရှိ' : 'wallets'}`
                        : lang === 'my'
                        ? curr.name.split(' ')[0]
                        : curr.nameEn.split(' ')[0]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Wallets Filter & Quick Stats (All, Included in Totals, Excluded) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-fit flex-wrap">
          <button
            type="button"
            onClick={() => setWalletFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              walletFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {lang === 'my' ? 'အကောင့်အားလုံး' : 'All Wallets'} ({wallets.length})
          </button>
          <button
            type="button"
            onClick={() => setWalletFilter('included')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              walletFilter === 'included'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-emerald-700'
            }`}
          >
            <span>📊 {lang === 'my' ? 'စုစုပေါင်းထဲ ရောမည်' : 'In Totals'}</span>
            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${walletFilter === 'included' ? 'bg-white/20' : 'bg-slate-200 text-slate-700'}`}>
              {includedWallets.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setWalletFilter('excluded')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              walletFilter === 'excluded'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🚫 {lang === 'my' ? 'သီးသန့် မရောပါ' : 'Separate'}</span>
            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${walletFilter === 'excluded' ? 'bg-white/20' : 'bg-slate-200 text-slate-700'}`}>
              {excludedWallets.length}
            </span>
          </button>
        </div>

        <div className="text-[11px] text-slate-500 font-medium">
          {lang === 'my'
            ? '💡 ကတ်ပေါ်ရှိ "ရောမည် / မရောပါ" ခလုတ်ကို နှိပ်၍ စုစုပေါင်းထဲ ထည့်/ထုတ် ပြောင်းလဲနိုင်ပါသည်'
            : '💡 Click "In Totals / Separate" on any card to toggle calculation inclusion'}
        </div>
      </div>

      {/* Wallets Grid */}
      {displayedWallets.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-3xl border border-dashed border-slate-200">
          <p className="text-sm font-semibold text-slate-500">
            {walletFilter === 'excluded'
              ? (lang === 'my' ? 'စုစုပေါင်းထဲ မရောဘဲ သီးသန့်ထားသော အကောင့် မရှိသေးပါ' : 'No wallets excluded from totals')
              : (lang === 'my' ? 'အကောင့်များ မရှိသေးပါ' : 'No wallets found')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {displayedWallets.map((wallet) => {
            const IconComp = WALLET_ICONS_MAP[wallet.icon] || WalletCards;
            const currInfo = getCurrencyInfo(wallet.currency || 'MMK');
            const isForeign = wallet.currency && wallet.currency !== 'MMK';
            const effectiveRate = wallet.exchangeRate || currInfo.defaultRateToMMK;
            const convertedBalance = convertToMMK(wallet.balance, wallet.currency, wallet.exchangeRate);
            // [v7.5.56] Collaborator rights on this wallet (owners get
            // full rights from the helper). Reconcile needs both add
            // rights (the adjustment can go either way); transfer-out
            // needs the expense add right. The include-in-totals toggle
            // is NOT gated here — since v7.5.56 it changes only the
            // viewer's own scope (per-user override), never the shared
            // doc, so every viewer may use it on their own view.
            const myPerms = getCollaboratorPermissions(wallet, user?.email, user?.uid);
            const canReconcile = myPerms.canAddIncome && myPerms.canAddExpense;
            const canTransferFrom = myPerms.canAddExpense;

            return (
              <div
                key={wallet.id}
                className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Colored Accent Top Strip */}
                <div
                  className="absolute top-0 left-0 right-0 h-1.5"
                  style={{ backgroundColor: wallet.color || '#6366F1' }}
                />

                <div>
                  <div className="flex items-start justify-between gap-3">
                    {/* Icon & Currency Flag */}
                    <div className="flex items-center gap-2">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xs"
                        style={{ backgroundColor: wallet.color || '#6366F1' }}
                      >
                        <IconComp className="w-6 h-6 text-white" />
                      </div>
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold border"
                        style={{
                          backgroundColor: `${wallet.color || '#6366F1'}15`,
                          borderColor: `${wallet.color || '#6366F1'}30`,
                          color: wallet.color || '#6366F1',
                        }}
                      >
                        {currInfo.flag} {currInfo.code}
                      </span>
                    </div>

                    {/* Actions Header */}
                    <div className="flex items-center gap-1">
                      {/* Collaborator: Only can leave the shared wallet. Cannot delete or edit. */}
                      {wallet.isSharedFromOther || (activeWorkspaceId && activeWorkspaceId !== user?.uid) ? (
                        <button
                          onClick={() => onDeleteWallet(wallet.id)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-amber-50 cursor-pointer transition-colors"
                          title={lang === 'my' ? 'Shared Wallet မှ ထွက်ခွာမည် (Leave)' : 'Leave Shared Wallet'}
                        >
                          <LogOut className="w-4 h-4 text-amber-600" />
                        </button>
                      ) : (
                        /* Owner: Has full rights to Share, Edit, and Delete */
                        <>
                          {/* Share Wallet Button & Permissions Setup */}
                          <button
                            onClick={() => setSelectedWalletForShare(wallet)}
                            className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                              wallet.sharedWith && wallet.sharedWith.length > 0
                                ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
                                : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                            }`}
                            title={lang === 'my' ? 'Wallet မျှဝေမည် နှင့် ခွင့်ပြုချက်များ သတ်မှတ်မည်' : 'Share Wallet & Set Rights'}
                          >
                            <UserPlus className="w-4 h-4" />
                          </button>

                          {/* Edit Wallet Modal Button */}
                          <button
                            onClick={() => handleOpenEditWallet(wallet)}
                            className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                            title={lang === 'my' ? 'အကောင့် ပြင်ဆင်မည်' : 'Edit Wallet'}
                          >
                            <Edit2 className="w-4 h-4 text-slate-600" />
                          </button>

                          {/* Delete Wallet Button */}
                          <button
                            onClick={() => onDeleteWallet(wallet.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer transition-colors"
                            title={
                              wallet.sharedWith && wallet.sharedWith.length > 0
                                ? (lang === 'my' ? 'Shared Wallet အပြီးဖျက်မည်' : 'Delete Shared Wallet')
                                : (lang === 'my' ? 'အကောင့် ဖျက်မည်' : 'Delete Wallet')
                            }
                          >
                            <Trash2 className="w-4 h-4 text-rose-500" />
                          </button>

                          {/* [v7.5.56] Transfer ownership — owner only, and
                              only for wallets shared with someone. */}
                          {wallet.sharedWith && wallet.sharedWith.length > 0 && onTransferOwnership && (
                            <button
                              onClick={() => handleTransferOwnershipClick(wallet)}
                              className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-amber-50 cursor-pointer transition-colors"
                              title={lang === 'my' ? 'ပိုင်ဆိုင်မှု လွှဲပြောင်းမည်' : 'Transfer ownership'}
                            >
                              <Crown className="w-4 h-4 text-amber-600" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Wallet Info */}
                  <div className="mt-3.5">
                    <h3 className="font-bold text-base text-slate-900 tracking-tight break-words">
                      {lang === 'my' ? wallet.name : wallet.nameEn || wallet.name}
                    </h3>
                    <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                      {wallet.isDefault && (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          {lang === 'my' ? 'မူလအကောင့်' : 'Primary'}
                        </span>
                      )}

                      {/* Inclusion in Totals Toggle Badge */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleIncludeInTotals(wallet, e)}
                        className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full border transition-all cursor-pointer active:scale-95 ${
                          wallet.includeInTotals !== false
                            ? 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-emerald-300 shadow-2xs'
                            : 'text-amber-900 bg-amber-50 hover:bg-amber-100 border-amber-300'
                        }`}
                        title={
                          wallet.includeInTotals !== false
                            ? (lang === 'my' ? 'စုစုပေါင်းထဲ ရောပြမည် (နှိပ်၍ သီးသန့်ခွဲထားပါ)' : 'Included in totals (Click to exclude)')
                            : (lang === 'my' ? 'စုစုပေါင်းထဲ မရောပါ (နှိပ်၍ စုစုပေါင်းထဲ ရောပြပါ)' : 'Excluded from totals (Click to include)')
                        }
                      >
                        {wallet.includeInTotals !== false ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>{lang === 'my' ? '📊 စုစုပေါင်းထဲ ရောမည်' : 'In Totals'}</span>
                          </>
                        ) : (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            <span>{lang === 'my' ? '🚫 စုစုပေါင်းထဲ မရောပါ' : 'Separate'}</span>
                          </>
                        )}
                      </button>

                      {wallet.isSharedFromOther && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                          <span>🤝</span>
                          <span className="break-words">
                            {lang === 'my'
                              ? `${sharedByLabel(wallet)} မှ မျှဝေထားသည်`
                              : `Shared by ${sharedByLabel(wallet)}`}
                          </span>
                        </span>
                      )}

                      {!wallet.isSharedFromOther && wallet.sharedWith && wallet.sharedWith.length > 0 && (
                        <span
                          onClick={() => setSelectedWalletForShare(wallet)}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-full border border-indigo-200 cursor-pointer transition-colors"
                          title={lang === 'my' ? 'မျှဝေထားသော သူများနှင့် ခွင့်ပြုချက်များ' : 'Shared users & permissions'}
                        >
                          <Users className="w-3 h-3 text-indigo-600" />
                          <span>
                            {wallet.sharedWith.length} {lang === 'my' ? 'ဦးနှင့် မျှဝေထားသည်' : 'shared'}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Collaborator Granted Permissions Badges */}
                  {wallet.isSharedFromOther && (() => {
                    const userPerms = getCollaboratorPermissions(wallet, user?.email, user?.uid);
                    const incList = [
                      userPerms.canAddIncome && (lang === 'my' ? 'ထည့်' : 'Add'),
                      userPerms.canEditIncome && (lang === 'my' ? 'ပြင်' : 'Edit'),
                      userPerms.canDeleteIncome && (lang === 'my' ? 'ဖျက်' : 'Del'),
                    ].filter(Boolean);
                    const expList = [
                      userPerms.canAddExpense && (lang === 'my' ? 'ထည့်' : 'Add'),
                      userPerms.canEditExpense && (lang === 'my' ? 'ပြင်' : 'Edit'),
                      userPerms.canDeleteExpense && (lang === 'my' ? 'ဖျက်' : 'Del'),
                    ].filter(Boolean);

                    return (
                      <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-100 text-[10px]">
                        <span className="font-bold text-slate-500">
                          {lang === 'my' ? 'သင့်ခွင့်ပြုချက်:' : 'Rights:'}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded-md font-semibold border ${
                          incList.length > 0
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-slate-50 text-slate-400 border-slate-200'
                        }`}>
                          {lang === 'my' ? 'ဝင်ငွေ' : 'Inc'}: {incList.length > 0 ? incList.join('/') : (lang === 'my' ? 'မရပါ' : 'None')}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded-md font-semibold border ${
                          expList.length > 0
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-slate-50 text-slate-400 border-slate-200'
                        }`}>
                          {lang === 'my' ? 'ထွက်ငွေ' : 'Exp'}: {expList.length > 0 ? expList.join('/') : (lang === 'my' ? 'မရပါ' : 'None')}
                        </span>
                      </div>
                    );
                  })()}
                </div>

              {/* Balance & Rate Section */}
              <div className="mt-5 pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    {lang === 'my' ? 'လက်ကျန်ငွေ' : 'Balance'}
                  </span>
                  {/* [v7.5.56] Reconcile is hidden for collaborators
                      without both add rights (finding 28). */}
                  {canReconcile && (
                    <button
                      type="button"
                      onClick={() => onOpenReconcileModal(wallet.id)}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer hover:underline"
                      title="Reconcile this wallet balance"
                    >
                      <Scale className="w-3 h-3 text-indigo-600" />
                      <span>{lang === 'my' ? 'စာရင်းညှိမည်' : 'Reconcile'}</span>
                    </button>
                  )}
                </div>

                {/* Primary Balance in Wallet's Native Currency */}
                <div className="text-2xl font-black text-slate-900 tracking-tight">
                  {formatCurrency(wallet.balance, wallet.currency)}
                </div>

                {/* [v7.5.56] This-month flow (compact single line) —
                    stats are stored in MMK (converted before summing),
                    so convert back to the wallet's currency and render
                    in that currency, never MMK lakhs. */}
                {(() => {
                  const stats = thisMonthStatsMap[wallet.id];
                  if (!stats || (stats.inflowMMK === 0 && stats.outflowMMK === 0)) return null;
                  const code = (wallet.currency || 'MMK').toUpperCase();
                  const rate = code === 'MMK' ? 1 : (wallet.exchangeRate || getCurrencyInfo(code).defaultRateToMMK);
                  const toWalletCurrency = (mmk: number) => (code === 'MMK' ? mmk : mmk / rate);
                  const inflow = toWalletCurrency(stats.inflowMMK);
                  const outflow = toWalletCurrency(stats.outflowMMK);
                  const net = inflow - outflow;
                  return (
                    <div className="flex items-center gap-2 text-[11px] font-mono flex-wrap">
                      <span className="text-slate-400 font-sans text-[10px]">
                        {lang === 'my' ? 'ဒီလ' : 'This month'}
                      </span>
                      {inflow > 0 && (
                        <span className="text-emerald-600 font-bold">↗ +{formatCurrency(inflow, code)}</span>
                      )}
                      {outflow > 0 && (
                        <span className="text-rose-600 font-bold">↘ -{formatCurrency(outflow, code)}</span>
                      )}
                      <span className={'font-bold ' + (net >= 0 ? 'text-emerald-700' : 'text-rose-700')}>
                        = {net >= 0 ? '+' : '-'}{formatCurrency(Math.abs(net), code)}
                      </span>
                    </div>
                  );
                })()}

                {/* Converted MMK & Exchange Rate Pill if Currency !== 'MMK' */}
                {isForeign && (
                  <div className="p-2 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1 text-slate-600 font-medium">
                      <TrendingUp className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>1 {wallet.currency} = {effectiveRate.toLocaleString()} Ks</span>
                    </div>
                    <div className="font-bold text-emerald-700">
                      ≈ {convertedBalance.toLocaleString()} MMK
                    </div>
                  </div>
                )}

                {/* Quick Add Transaction to this Wallet Button */}
                {(() => {
                  const userPerms = getCollaboratorPermissions(wallet, user?.email, user?.uid);
                  const canAdd = !wallet.isSharedFromOther || userPerms.canAddIncome || userPerms.canAddExpense;
                  const defaultType = (wallet.isSharedFromOther && userPerms.canAddIncome && !userPerms.canAddExpense) ? 'income' : 'expense';

                  return (
                    <div className="pt-2">
                      {wallet.isSharedFromOther && !canAdd ? (
                        <div className="text-[11px] text-center text-slate-400 py-1 italic bg-slate-50 rounded-lg">
                          {lang === 'my' ? 'စာရင်းထည့်သွင်းခွင့် မရှိပါ (ဖတ်ခွင့်သာ)' : 'Read-only access'}
                        </div>
                      ) : (
                        <div className="grid grid-cols-5 gap-1.5">
                          <button
                            type="button"
                            onClick={() => onAddTransaction?.(defaultType, wallet.id)}
                            className={`col-span-3 py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 border shadow-2xs truncate ${
                              wallet.isSharedFromOther
                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 border-indigo-200/80'
                            }`}
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
                            <span className="truncate">
                              {lang === 'my' ? 'မှတ်တမ်းသွင်း' : 'Record'}
                            </span>
                          </button>
                          {/* [v7.5.56] Transfer-from is disabled for
                              collaborators without the expense add right
                              (finding 28); the handler enforces it too. */}
                          <button
                            type="button"
                            onClick={() => handleOpenTransferModal(wallet.id)}
                            disabled={!canTransferFrom}
                            className={`col-span-2 py-2 px-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all flex items-center justify-center gap-1 active:scale-98 shadow-2xs truncate ${
                              canTransferFrom ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'
                            }`}
                            title={
                              canTransferFrom
                                ? (lang === 'my' ? 'ဤအကောင့်မှ ငွေလွှဲမည်' : 'Transfer from this wallet')
                                : (lang === 'my' ? 'ငွေလွှဲထွက်ခွင့် မရှိပါ' : 'No permission to transfer out')
                            }
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                            <span className="truncate">{lang === 'my' ? 'ငွေလွှဲ' : 'Transfer'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Transfer Funds Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-lg text-slate-900">
                {lang === 'my' ? 'အကောင့်များအကြား ငွေလွှဲပြောင်းခြင်း' : 'Transfer Between Wallets'}
              </h3>
              <button
                onClick={() => setShowTransferModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} className="space-y-3 text-xs sm:text-sm">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {lang === 'my' ? 'ငွေထုတ်ယူမည့် အကောင့် (From):' : 'From Wallet:'}
                </label>
                <select
                  value={transferFrom}
                  onChange={(e) => {
                    const newFrom = e.target.value;
                    setTransferFrom(newFrom);
                    if (newFrom === transferTo) {
                      const fallback = wallets.find((w) => w.id !== newFrom);
                      if (fallback) setTransferTo(fallback.id);
                    }
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {transferOptionLabel(w)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {lang === 'my' ? 'ငွေထည့်သွင်းမည့် အကောင့် (To):' : 'To Wallet:'}
                </label>
                <select
                  value={transferTo}
                  onChange={(e) => setTransferTo(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900"
                >
                  {wallets
                    .filter((w) => w.id !== transferFrom)
                    .map((w) => (
                      <option key={w.id} value={w.id}>
                        {transferOptionLabel(w)}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {lang === 'my' ? 'လွှဲပြောင်းမည့် ပမာဏ:' : 'Transfer Amount:'}
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="50000"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {lang === 'my' ? 'မှတ်ချက် (ရွေးချယ်ရန်):' : 'Note (Optional):'}
                </label>
                <input
                  type="text"
                  placeholder={lang === 'my' ? 'ဥပမာ - KPay မှ ငွေသားထုတ်ယူခြင်း' : 'e.g. Bank to Cash ATM'}
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium"
                >
                  {lang === 'my' ? 'မလုပ်တော့ပါ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                >
                  {lang === 'my' ? 'ငွေလွှဲမည်' : 'Confirm Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Wallet Modal */}
      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => {
          setIsWalletModalOpen(false);
          setWalletToEdit(null);
        }}
        walletToEdit={walletToEdit}
        onSaveWallet={handleSaveWallet}
        lang={lang}
      />

      {/* Share Wallet Modal */}
      <ShareWalletModal
        wallet={selectedWalletForShare}
        isOpen={Boolean(selectedWalletForShare)}
        onClose={() => setSelectedWalletForShare(null)}
        // [v7.5.56] Result-aware wrappers — the modal's local snapshot is
        // only updated when the handler reports success, so a refused or
        // failed invite/unshare never shows up as done here.
        onShareWallet={async (walletId, email) => {
          const result = onShareWallet ? await onShareWallet(walletId, email) : undefined;
          if (result === false) return false;
          if (selectedWalletForShare) {
            const updatedList = [...(selectedWalletForShare.sharedWith || []), email];
            setSelectedWalletForShare({
              ...selectedWalletForShare,
              sharedWith: updatedList,
              collaboratorPermissions: {
                ...(selectedWalletForShare.collaboratorPermissions || {}),
                [email.toLowerCase()]: DEFAULT_WALLET_PERMISSIONS,
              },
            });
          }
          return true;
        }}
        onUnshareWallet={async (walletId, email) => {
          const result = onUnshareWallet ? await onUnshareWallet(walletId, email) : undefined;
          if (result === false) return false;
          if (selectedWalletForShare) {
            const updatedList = (selectedWalletForShare.sharedWith || []).filter((e) => e.toLowerCase() !== email.toLowerCase());
            const updatedPerms = { ...(selectedWalletForShare.collaboratorPermissions || {}) };
            for (const key of Object.keys(updatedPerms)) {
              if (key.trim().toLowerCase() === email.toLowerCase()) delete updatedPerms[key];
            }
            setSelectedWalletForShare({ ...selectedWalletForShare, sharedWith: updatedList, collaboratorPermissions: updatedPerms });
          }
          return true;
        }}
        onUpdatePermissions={(walletId, email, permissions) => {
          if (onUpdatePermissions) {
            onUpdatePermissions(walletId, email, permissions);
          }
          if (selectedWalletForShare) {
            setSelectedWalletForShare({
              ...selectedWalletForShare,
              collaboratorPermissions: {
                ...(selectedWalletForShare.collaboratorPermissions || {}),
                [email.toLowerCase()]: permissions,
              },
            });
          }
        }}
        plan={plan}
        lang={lang}
        currentUserEmail={user?.email ?? null}
        maxCollaborators={maxCollaborators}
        onOpenSignIn={onOpenSignIn}
      />
    </div>
  );
};
