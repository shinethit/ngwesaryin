import React, { useState, useEffect } from 'react';
import {
  WalletCards,
  CreditCard,
  Coins,
  Building2,
  Smartphone,
  PiggyBank,
  DollarSign,
  Globe,
  Landmark,
  ShieldCheck,
  Check,
  X,
  TrendingUp,
} from 'lucide-react';
import { Wallet } from '../types';
import {
  SUPPORTED_CURRENCIES,
  getCurrencyInfo,
  formatCurrency,
  convertToMMK,
} from '../utils/currency';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletToEdit?: Wallet | null;
  onSaveWallet: (walletData: Omit<Wallet, 'id'> | Wallet) => void;
  lang: 'my' | 'en';
}

const WALLET_COLORS = [
  '#10B981', // Emerald
  '#0284C7', // Sky Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#EC4899', // Pink
  '#0D9488', // Teal
  '#475569', // Slate
];

const WALLET_ICONS = [
  { id: 'wallet', label: 'Wallet', icon: WalletCards },
  { id: 'bank', label: 'Bank', icon: Building2 },
  { id: 'card', label: 'Card', icon: CreditCard },
  { id: 'mobile', label: 'Mobile / Pay', icon: Smartphone },
  { id: 'cash', label: 'Cash / Coins', icon: Coins },
  { id: 'piggy', label: 'Savings', icon: PiggyBank },
  { id: 'dollar', label: 'Foreign Currency', icon: DollarSign },
  { id: 'globe', label: 'Global Account', icon: Globe },
  { id: 'landmark', label: 'Institution', icon: Landmark },
  { id: 'shield', label: 'Safe Storage', icon: ShieldCheck },
];

export const WalletModal: React.FC<WalletModalProps> = ({
  isOpen,
  onClose,
  walletToEdit,
  onSaveWallet,
  lang,
}) => {
  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [balance, setBalance] = useState('');
  const [currency, setCurrency] = useState('MMK');
  const [exchangeRate, setExchangeRate] = useState<string>('1');
  const [color, setColor] = useState('#10B981');
  const [icon, setIcon] = useState('wallet');
  const [includeInTotals, setIncludeInTotals] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen) {
      if (walletToEdit) {
        setName(walletToEdit.name || '');
        setNameEn(walletToEdit.nameEn || '');
        setBalance(String(walletToEdit.balance ?? 0));
        const curr = walletToEdit.currency || 'MMK';
        setCurrency(curr);
        const rate =
          walletToEdit.exchangeRate !== undefined
            ? walletToEdit.exchangeRate
            : getCurrencyInfo(curr).defaultRateToMMK;
        setExchangeRate(String(rate));
        setColor(walletToEdit.color || '#10B981');
        setIcon(walletToEdit.icon || 'wallet');
        setIncludeInTotals(walletToEdit.includeInTotals !== false);
      } else {
        setName('');
        setNameEn('');
        setBalance('0');
        setCurrency('MMK');
        setExchangeRate('1');
        setColor('#10B981');
        setIcon('wallet');
        setIncludeInTotals(true);
      }
    }
  }, [isOpen, walletToEdit]);

  if (!isOpen) return null;

  const handleCurrencyChange = (newCurr: string) => {
    setCurrency(newCurr);
    const currInfo = getCurrencyInfo(newCurr);
    setExchangeRate(String(currInfo.defaultRateToMMK));
  };

  const parsedBalance = parseFloat(balance) || 0;
  const parsedRate = parseFloat(exchangeRate) || 1;
  const convertedMMK = convertToMMK(parsedBalance, currency, parsedRate);
  const selectedCurrInfo = getCurrencyInfo(currency);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (walletToEdit) {
      // Editing existing wallet
      const prevBal = walletToEdit.balance ?? 0;
      const prevInitial = typeof walletToEdit.initialBalance === 'number' ? walletToEdit.initialBalance : prevBal;
      const delta = parsedBalance - prevBal;
      const newInitial = prevInitial + delta;

      const updated: Wallet = {
        ...walletToEdit,
        name: name.trim(),
        nameEn: nameEn.trim() || name.trim(),
        balance: parsedBalance,
        initialBalance: newInitial,
        currency,
        exchangeRate: currency === 'MMK' ? 1 : parsedRate,
        color,
        icon,
        includeInTotals,
      };
      onSaveWallet(updated);
    } else {
      // Adding new wallet
      const newWalletData: Omit<Wallet, 'id'> = {
        name: name.trim(),
        nameEn: nameEn.trim() || name.trim(),
        balance: parsedBalance,
        initialBalance: parsedBalance,
        currency,
        exchangeRate: currency === 'MMK' ? 1 : parsedRate,
        color,
        icon,
        isDefault: false,
        includeInTotals,
      };
      onSaveWallet(newWalletData);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 touch-none overscroll-none animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] sm:max-h-[88vh] my-auto overflow-hidden pointer-events-auto animate-scaleUp">
        {/* Sticky Header */}
        <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div>
            <h3 className="font-bold text-base sm:text-lg text-slate-900">
              {walletToEdit
                ? lang === 'my'
                  ? 'အကောင့် အချက်အလက် ပြင်ဆင်ခြင်း'
                  : 'Edit Wallet Information'
                : lang === 'my'
                ? 'အကောင့် / ပိုက်ဆံအိတ် အသစ်ထည့်သွင်းခြင်း'
                : 'Add New Wallet / Account'}
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              {lang === 'my'
                ? 'အမည်၊ ငွေကြေးအမျိုးအစား၊ ငွေလဲနှုန်းနှင့် လက်ကျန်ငွေ သတ်မှတ်ပါ'
                : 'Set name, currency, exchange rate, and balance'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 flex items-center justify-center font-bold transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 text-xs sm:text-sm overflow-y-auto flex-1 min-h-0 overscroll-contain touch-pan-y scroll-smooth [webkit-overflow-scrolling:touch]">
          {/* Wallet Name (MM & EN) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                {lang === 'my' ? 'အကောင့် အမည် *:' : 'Wallet Name *:'}
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder={lang === 'my' ? 'ဥပမာ - KBZPay, CB Bank, Cash' : 'e.g., KBZPay, Cash, USD'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none font-medium text-slate-900"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                {lang === 'my' ? 'အင်္ဂလိပ် အမည် (ရွေးချယ်ရန်):' : 'English Name (Optional):'}
              </label>
              <input
                type="text"
                placeholder="e.g. KBZPay Main"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none font-medium text-slate-900"
              />
            </div>
          </div>

          {/* Currency Selection & Exchange Rate Row */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
            <div>
              <label className="block text-slate-900 font-bold mb-1.5 flex items-center justify-between">
                <span>{lang === 'my' ? 'ငွေကြေး အမျိုးအစား (Currency):' : 'Wallet Currency:'}</span>
                <span className="text-[11px] font-semibold text-emerald-700">
                  {selectedCurrInfo.flag} {selectedCurrInfo.code} ({selectedCurrInfo.symbol})
                </span>
              </label>
              <select
                value={currency}
                onChange={(e) => handleCurrencyChange(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
              >
                {SUPPORTED_CURRENCIES.map((curr) => (
                  <option key={curr.code} value={curr.code}>
                    {curr.flag} {curr.code} - {lang === 'my' ? curr.name : curr.nameEn}
                  </option>
                ))}
              </select>
            </div>

            {/* Exchange Rate Input if Currency != MMK */}
            {currency !== 'MMK' && (
              <div className="pt-2 border-t border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                    <span>
                      {lang === 'my'
                        ? `ငွေလဲနှုန်း (၁ ${currency} လျှင် မြန်မာကျပ်):`
                        : `Exchange Rate (1 ${currency} in MMK):`}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setExchangeRate(String(selectedCurrInfo.defaultRateToMMK))}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold underline cursor-pointer"
                    title="Reset to default estimated rate"
                  >
                    {lang === 'my'
                      ? `ပေါက်ဈေး (${selectedCurrInfo.defaultRateToMMK.toLocaleString()} Ks) ထည့်မည်`
                      : `Use default rate (${selectedCurrInfo.defaultRateToMMK})`}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    required
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(e.target.value)}
                    placeholder={String(selectedCurrInfo.defaultRateToMMK)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 pr-16 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    MMK
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {lang === 'my'
                    ? `* ၁ ${currency} = ${parsedRate.toLocaleString()} ကျပ်နှုန်းဖြင့် စုစုပေါင်း ပိုင်ဆိုင်မှုတွင် ထည့်သွင်းတွက်ချက်ပေးပါမည်။`
                    : `* Used to calculate total net assets in MMK at 1 ${currency} = ${parsedRate.toLocaleString()} MMK.`}
                </p>
              </div>
            )}
          </div>

          {/* Balance Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-slate-700 font-bold">
                {lang === 'my'
                  ? `လက်ကျန်ငွေ (${selectedCurrInfo.code}):`
                  : `Balance (${selectedCurrInfo.code}):`}
              </label>
              {currency !== 'MMK' && parsedBalance > 0 && (
                <span className="text-xs font-bold text-emerald-700">
                  ≈ {convertedMMK.toLocaleString()} MMK
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="number"
                step="any"
                required
                placeholder="0"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 pr-16 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                {selectedCurrInfo.code}
              </span>
            </div>

            {/* Quick Presets & Lakhs Converter Helper */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1.5">
              <button
                type="button"
                onClick={() => {
                  const num = parseFloat(balance) || 0;
                  setBalance(String(Math.round(num * 100000)));
                }}
                className="px-2.5 py-1 text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg transition-all active:scale-95 cursor-pointer shadow-2xs"
                title={lang === 'my' ? 'ရိုက်ထည့်ထားသော ဂဏန်းအား ၁ သိန်း (x 100,000) ဖြင့် မြှောက်မည်' : 'Multiply by 1 Lakh (x100,000)'}
              >
                ✨ {lang === 'my' ? 'သိန်း (x100,000)' : 'Lakhs (x100k)'}
              </button>
              <button
                type="button"
                onClick={() => setBalance('0')}
                className="px-2 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all cursor-pointer"
              >
                {lang === 'my' ? '၀ ကျပ်' : '0 MMK'}
              </button>
              <button
                type="button"
                onClick={() => setBalance('100000')}
                className="px-2 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all cursor-pointer"
              >
                {lang === 'my' ? '၁ သိန်း' : '1 Lakh'}
              </button>
              <button
                type="button"
                onClick={() => setBalance('500000')}
                className="px-2 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all cursor-pointer"
              >
                {lang === 'my' ? '၅ သိန်း' : '5 Lakhs'}
              </button>
              <button
                type="button"
                onClick={() => setBalance('1000000')}
                className="px-2 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all cursor-pointer"
              >
                {lang === 'my' ? '၁၀ သိန်း' : '10 Lakhs'}
              </button>
              {parsedBalance > 0 && currency === 'MMK' && (
                <span className="text-[11px] font-bold text-emerald-700 font-mono ml-auto">
                  ≈ {(parsedBalance / 100000).toLocaleString(undefined, { maximumFractionDigits: 4 })} {lang === 'my' ? 'သိန်း' : 'Lakhs'}
                </span>
              )}
            </div>
          </div>

          {/* Color & Icon Picker */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Color */}
            <div>
              <label className="block text-slate-700 font-bold mb-1.5">
                {lang === 'my' ? 'အရောင် ရွေးချယ်ရန်:' : 'Card Color:'}
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {WALLET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full transition-all cursor-pointer flex items-center justify-center ${
                      color === c ? 'ring-2 ring-slate-900 scale-110 shadow-xs' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                  >
                    {color === c && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Icon */}
            <div>
              <label className="block text-slate-700 font-bold mb-1.5">
                {lang === 'my' ? 'ပုံစံ သင်္ကေတ (Icon):' : 'Account Icon:'}
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {WALLET_ICONS.map((item) => {
                  const IconComp = item.icon;
                  const isSelected = icon === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setIcon(item.id)}
                      className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                      title={item.label}
                    >
                      <IconComp className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Include in Totals Option (စုစုပေါင်းထဲ ရောပြမည် / မရောပါ) */}
          <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs sm:text-sm">
                  <span>{lang === 'my' ? 'စုစုပေါင်း စာရင်းတွက်ချက်မှု:' : 'Total Calculation Setting:'}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                      includeInTotals
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {includeInTotals
                      ? lang === 'my'
                        ? '📊 စုစုပေါင်းထဲ ရောပြမည်'
                        : 'Included in Totals'
                      : lang === 'my'
                      ? '🚫 စုစုပေါင်းထဲ မရောပါ (သီးသန့်)'
                      : 'Excluded (Keep Separate)'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  {lang === 'my'
                    ? 'ဖွင့်ထားပါက Dashboard စုစုပေါင်းလက်ကျန်၊ လစဥ်ဝင်ငွေ/ထွက်ငွေတို့တွင် ထည့်သွင်းတွက်ချက်မည်။ ပိတ်ထားပါက အခြားစာရင်းများနှင့် မရောဘဲ သီးသန့်အဖြစ်သာ ပြသမည်။'
                    : 'When enabled, this wallet balance and transactions are included in Dashboard totals. When disabled, it is tracked separately.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => setIncludeInTotals(true)}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  includeInTotals
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Check className={`w-3.5 h-3.5 ${includeInTotals ? 'opacity-100' : 'opacity-0'}`} />
                <span>{lang === 'my' ? 'စုစုပေါင်းထဲ ရောပြမည်' : 'Include in Totals'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIncludeInTotals(false)}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  !includeInTotals
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Check className={`w-3.5 h-3.5 ${!includeInTotals ? 'opacity-100' : 'opacity-0'}`} />
                <span>{lang === 'my' ? 'စုစုပေါင်းထဲ မရောပါ' : 'Exclude / Separate'}</span>
              </button>
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="p-3.5 rounded-2xl text-white shadow-sm flex items-center justify-between" style={{ backgroundColor: color }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
                {(() => {
                  const IconItem = WALLET_ICONS.find((i) => i.id === icon) || WALLET_ICONS[0];
                  const Comp = IconItem.icon;
                  return <Comp className="w-5 h-5 text-white" />;
                })()}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase tracking-wider font-semibold opacity-80">
                    {selectedCurrInfo.flag} {selectedCurrInfo.code}
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-white/20 backdrop-blur-xs text-white">
                    {includeInTotals
                      ? lang === 'my'
                        ? 'ရောပြမည်'
                        : 'Merged'
                      : lang === 'my'
                      ? 'မရောပါ'
                      : 'Separate'}
                  </span>
                </div>
                <h4 className="font-bold text-base leading-tight mt-0.5">
                  {name || (lang === 'my' ? 'အကောင့် အမည်' : 'Wallet Name')}
                </h4>
              </div>
            </div>
            <div className="text-right">
              <div className="text-base font-bold">
                {formatCurrency(parsedBalance, currency)}
              </div>
              {currency !== 'MMK' && (
                <div className="text-[11px] opacity-80">
                  ≈ {convertedMMK.toLocaleString()} MMK
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium cursor-pointer transition-colors"
            >
              {lang === 'my' ? 'မလုပ်တော့ပါ' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              {walletToEdit
                ? lang === 'my'
                  ? 'ပြင်ဆင်ချက် သိမ်းဆည်းမည်'
                  : 'Save Changes'
                : lang === 'my'
                ? 'အကောင့် အသစ်ထည့်မည်'
                : 'Create Wallet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
