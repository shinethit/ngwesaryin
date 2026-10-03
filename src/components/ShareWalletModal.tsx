import React, { useState } from 'react';
import { Wallet, PlanType, WalletPermissions } from '../types';
import {
  Users,
  UserPlus,
  Trash2,
  X,
  ShieldCheck,
  Mail,
  AlertCircle,
  Sparkles,
  Sliders,
  ChevronDown,
  ChevronUp,
  Lock,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { CategoryIcon } from './CategoryIcon';
import {
  DEFAULT_WALLET_PERMISSIONS,
  READ_ONLY_PERMISSIONS,
  ADD_ONLY_PERMISSIONS,
} from '../utils/permissions';

interface ShareWalletModalProps {
  wallet: Wallet | null;
  isOpen: boolean;
  onClose: () => void;
  onShareWallet: (walletId: string, email: string) => void;
  onUnshareWallet: (walletId: string, email: string) => void;
  onUpdatePermissions?: (walletId: string, email: string, permissions: WalletPermissions) => void;
  plan: PlanType;
  lang: 'my' | 'en';
}

export const ShareWalletModal: React.FC<ShareWalletModalProps> = ({
  wallet,
  isOpen,
  onClose,
  onShareWallet,
  onUnshareWallet,
  onUpdatePermissions,
  plan,
  lang,
}) => {
  const [emailInput, setEmailInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);

  if (!isOpen || !wallet) return null;

  const sharedList = wallet.sharedWith || [];
  const permissionsMap = wallet.collaboratorPermissions || {};

  const getEmailPerms = (email: string): WalletPermissions => {
    const clean = email.trim().toLowerCase();
    for (const key of Object.keys(permissionsMap)) {
      if (key.trim().toLowerCase() === clean) {
        return {
          canAddIncome: permissionsMap[key].canAddIncome ?? true,
          canEditIncome: permissionsMap[key].canEditIncome ?? true,
          canDeleteIncome: permissionsMap[key].canDeleteIncome ?? true,
          canAddExpense: permissionsMap[key].canAddExpense ?? true,
          canEditExpense: permissionsMap[key].canEditExpense ?? true,
          canDeleteExpense: permissionsMap[key].canDeleteExpense ?? true,
        };
      }
    }
    return DEFAULT_WALLET_PERMISSIONS;
  };

  const handleTogglePerm = (email: string, permKey: keyof WalletPermissions) => {
    if (!onUpdatePermissions) return;
    const current = getEmailPerms(email);
    const updated: WalletPermissions = {
      ...current,
      [permKey]: !current[permKey],
    };
    onUpdatePermissions(wallet.id, email, updated);
  };

  const handleApplyPreset = (email: string, preset: WalletPermissions) => {
    if (!onUpdatePermissions) return;
    onUpdatePermissions(wallet.id, email, { ...preset });
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const email = emailInput.trim().toLowerCase();
    if (!email) {
      setErrorMsg(lang === 'my' ? 'Email လိပ်စာ ထည့်သွင်းပါ' : 'Please enter an email address');
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      setErrorMsg(lang === 'my' ? 'မှန်ကန်သော Email လိပ်စာ ဖြစ်ရပါမည်' : 'Please enter a valid email address');
      return;
    }

    if (sharedList.includes(email)) {
      setErrorMsg(lang === 'my' ? 'ဤ Email သည် ထည့်သွင်းပြီးသား ဖြစ်ပါသည်' : 'This email is already added');
      return;
    }

    if (plan === 'free' && sharedList.length >= 2) {
      setErrorMsg(
        lang === 'my'
          ? 'Free Plan တွင် ၁ ခါလျှင် Collaborator (၂) ယောက်အထိသာ မျှဝေနိုင်ပါသည်။ Premium သို့ အဆင့်မြှင့်ပါ'
          : 'Free plan allows up to 2 collaborators per wallet. Upgrade to Premium for unlimited'
      );
      return;
    }

    onShareWallet(wallet.id, email);
    setEmailInput('');
    setExpandedEmail(email);
    setSuccessMsg(
      lang === 'my'
        ? `${email} အား ဤ Wallet သို့ အောင်မြင်စွာ ဖိတ်ခေါ်ပြီးပါပြီ`
        : `Successfully invited ${email} to this wallet`
    );
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-xs shrink-0"
              style={{ backgroundColor: wallet.color }}
            >
              <CategoryIcon name={wallet.icon} className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900">
                  {lang === 'my' ? wallet.name : wallet.nameEn}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Permissions & Sharing
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {lang === 'my' ? 'Wallet မျှဝေခြင်းနှင့် လုပ်ပိုင်ခွင့် သတ်မှတ်ခြင်း' : 'Share access and customize rights'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Strict Security Badge */}
          <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-1.5 text-amber-950">
            <div className="flex items-center gap-2 font-bold text-xs">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{lang === 'my' ? 'လုံခြုံရေးနှင့် ပိုင်ဆိုင်မှု စည်းကမ်းချက်များ' : 'Security & Ownership Guidelines'}</span>
            </div>
            <div className="text-[11px] leading-relaxed text-amber-900 space-y-1">
              <p>
                {lang === 'my'
                  ? '• မူရင်းပိုင်ရှင် (Owner) သာလျှင် ဤ Wallet ကို အပြီးတိုင် ဖျက်ပိုင်ခွင့် (Delete Wallet) ရှိပြီး ဖျက်လိုက်ပါက အဖွဲ့ဝင်အားလုံးထံမှလည်း အလိုအလျောက် ပျက်သွားမည် ဖြစ်ပါသည်။'
                  : '• Only the Owner can permanently delete this wallet (which removes it for all collaborators).'}
              </p>
              <p>
                {lang === 'my'
                  ? '• ဖိတ်ခေါ်ခံရသူ (Collaborator) သည် Wallet ကို ဖျက်ခွင့် လုံးဝမရှိဘဲ၊ ထွက်ခွာခြင်း (Leave Shared Wallet) သာ ပြုလုပ်နိုင်ပါသည်။'
                  : '• Collaborators cannot delete this wallet; they can only choose to leave.'}
              </p>
              <p>
                {lang === 'my'
                  ? '• ဖိတ်ခေါ်ထားသူတစ်ဦးချင်းစီအလိုက် ဝင်ငွေ/ထွက်ငွေ ထည့်၊ ပြင်၊ ဖျက်ခွင့်များကို အောက်တွင် အသေးစိတ် သတ်မှတ်နိုင်ပါသည်။'
                  : '• Granular permissions (Add/Edit/Delete for Income/Expense) can be configured below per collaborator.'}
              </p>
            </div>
          </div>

          {/* Add Collaborator Form */}
          <form onSubmit={handleInvite} className="space-y-2">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
              <span>{lang === 'my' ? 'Collaborator အီးမေးလ် ဖိတ်ခေါ်ရန်:' : 'Invite Collaborator Email:'}</span>
            </label>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="partner@gmail.com"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer shrink-0 flex items-center gap-1"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{lang === 'my' ? 'ဖိတ်ခေါ်မည်' : 'Invite'}</span>
              </button>
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-600 font-semibold flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMsg}</span>
              </p>
            )}

            {successMsg && (
              <p className="text-xs text-emerald-600 font-bold flex items-center gap-1 mt-1">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>{successMsg}</span>
              </p>
            )}
          </form>

          {/* Shared List & Permissions Controls */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                <span>{lang === 'my' ? 'မျှဝေထားသော သူများနှင့် ပြင်ဆင်ခွင့်များ:' : 'Collaborators & Permissions:'}</span>
              </span>
              <span className="text-[11px] text-slate-500 font-normal">
                {sharedList.length} {lang === 'my' ? 'ဦး' : 'user(s)'}
              </span>
            </div>

            {sharedList.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-400">
                {lang === 'my'
                  ? 'ဤ Wallet ကို အခြားသူများနှင့် မျှဝေထားခြင်း မရှိသေးပါ'
                  : 'This wallet is not shared with anyone yet'}
              </div>
            ) : (
              <div className="space-y-3">
                {sharedList.map((email) => {
                  const perms = getEmailPerms(email);
                  const isExpanded = expandedEmail === email;
                  const allowedCount = Object.values(perms).filter(Boolean).length;

                  return (
                    <div
                      key={email}
                      className="rounded-2xl border border-slate-200 bg-slate-50/70 overflow-hidden transition-all shadow-2xs"
                    >
                      {/* Top Bar for this Collaborator */}
                      <div className="p-3 flex items-center justify-between gap-2 bg-white">
                        <div className="min-w-0 flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {email.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-xs text-slate-900 truncate max-w-[160px] sm:max-w-[220px]">
                              {email}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                                  allowedCount === 6
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : allowedCount === 0
                                    ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                }`}
                              >
                                {allowedCount === 6
                                  ? (lang === 'my' ? 'အပြည့်အဝခွင့်ပြု' : 'Full Access')
                                  : allowedCount === 0
                                  ? (lang === 'my' ? 'ဖတ်ရှုခွင့်သာ' : 'View Only')
                                  : `${allowedCount}/6 ${lang === 'my' ? 'ခွင့်ပြုထား' : 'Permissions'}`}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setExpandedEmail(isExpanded ? null : email)}
                            className="px-2 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                            title={lang === 'my' ? 'ခွင့်ပြုချက်များ ပြင်ဆင်ရန်' : 'Configure Permissions'}
                          >
                            <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                            <span className="hidden sm:inline">
                              {lang === 'my' ? 'ခွင့်ပြုချက်' : 'Rights'}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => onUnshareWallet(wallet.id, email)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title={lang === 'my' ? 'မျှဝေမှု ဖယ်ရှားမည်' : 'Remove sharing'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Permissions Configuration Panel */}
                      {isExpanded && (
                        <div className="p-3.5 border-t border-slate-200 bg-slate-50/90 space-y-3 animate-in fade-in duration-150">
                          {/* Presets */}
                          <div className="flex items-center justify-between gap-1 flex-wrap">
                            <span className="text-[11px] font-bold text-slate-600">
                              {lang === 'my' ? 'အမြန်သတ်မှတ်ရန်:' : 'Quick Presets:'}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleApplyPreset(email, DEFAULT_WALLET_PERMISSIONS)}
                                className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer shadow-2xs"
                              >
                                {lang === 'my' ? 'အပြည့်အဝ' : 'Full'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleApplyPreset(email, ADD_ONLY_PERMISSIONS)}
                                className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer shadow-2xs"
                              >
                                {lang === 'my' ? 'ထည့်ခွင့်သာ' : 'Add Only'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleApplyPreset(email, READ_ONLY_PERMISSIONS)}
                                className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer shadow-2xs"
                              >
                                {lang === 'my' ? 'ဖတ်ရှုသာ' : 'Read Only'}
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {/* Income Permissions */}
                            <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200 space-y-2">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 border-b border-emerald-200/60 pb-1.5">
                                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                                <span>{lang === 'my' ? 'ဝင်ငွေ (Income) ခွင့်ပြုချက်' : 'Income Rights'}</span>
                              </div>
                              <div className="space-y-1.5">
                                <label className="flex items-center justify-between text-xs text-slate-700 cursor-pointer hover:text-slate-900">
                                  <span>{lang === 'my' ? 'ထည့်သွင်းခွင့်' : 'Add Income'}</span>
                                  <input
                                    type="checkbox"
                                    checked={perms.canAddIncome}
                                    onChange={() => handleTogglePerm(email, 'canAddIncome')}
                                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                  />
                                </label>
                                <label className="flex items-center justify-between text-xs text-slate-700 cursor-pointer hover:text-slate-900">
                                  <span>{lang === 'my' ? 'ပြင်ဆင်ခွင့် (Edit)' : 'Edit Income'}</span>
                                  <input
                                    type="checkbox"
                                    checked={perms.canEditIncome}
                                    onChange={() => handleTogglePerm(email, 'canEditIncome')}
                                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                  />
                                </label>
                                <label className="flex items-center justify-between text-xs text-slate-700 cursor-pointer hover:text-slate-900">
                                  <span>{lang === 'my' ? 'ဖျက်ပိုင်ခွင့် (Delete)' : 'Delete Income'}</span>
                                  <input
                                    type="checkbox"
                                    checked={perms.canDeleteIncome}
                                    onChange={() => handleTogglePerm(email, 'canDeleteIncome')}
                                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                  />
                                </label>
                              </div>
                            </div>

                            {/* Expense Permissions */}
                            <div className="p-2.5 rounded-xl bg-rose-50/80 border border-rose-200 space-y-2">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900 border-b border-rose-200/60 pb-1.5">
                                <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                                <span>{lang === 'my' ? 'ထွက်ငွေ (Expense) ခွင့်ပြုချက်' : 'Expense Rights'}</span>
                              </div>
                              <div className="space-y-1.5">
                                <label className="flex items-center justify-between text-xs text-slate-700 cursor-pointer hover:text-slate-900">
                                  <span>{lang === 'my' ? 'ထည့်သွင်းခွင့်' : 'Add Expense'}</span>
                                  <input
                                    type="checkbox"
                                    checked={perms.canAddExpense}
                                    onChange={() => handleTogglePerm(email, 'canAddExpense')}
                                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                                  />
                                </label>
                                <label className="flex items-center justify-between text-xs text-slate-700 cursor-pointer hover:text-slate-900">
                                  <span>{lang === 'my' ? 'ပြင်ဆင်ခွင့် (Edit)' : 'Edit Expense'}</span>
                                  <input
                                    type="checkbox"
                                    checked={perms.canEditExpense}
                                    onChange={() => handleTogglePerm(email, 'canEditExpense')}
                                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                                  />
                                </label>
                                <label className="flex items-center justify-between text-xs text-slate-700 cursor-pointer hover:text-slate-900">
                                  <span>{lang === 'my' ? 'ဖျက်ပိုင်ခွင့် (Delete)' : 'Delete Expense'}</span>
                                  <input
                                    type="checkbox"
                                    checked={perms.canDeleteExpense}
                                    onChange={() => handleTogglePerm(email, 'canDeleteExpense')}
                                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                                  />
                                </label>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{lang === 'my' ? 'ပြင်ဆင်မှုများ အလိုအလျောက် သိမ်းဆည်းပါသည်' : 'Changes save automatically'}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white transition-colors cursor-pointer shadow-xs"
          >
            {lang === 'my' ? 'ပြီးပြီ' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
};
