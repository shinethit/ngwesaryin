import React, { useEffect, useState } from 'react';
import { Wallet, PlanType, WalletPermissions } from '../types';
import { Users, UserPlus, Trash2, X, Mail, AlertCircle, Sparkles, Sliders, ChevronDown, ChevronUp, Lock, CheckCircle2, TrendingUp, TrendingDown } from 'lucide-react';
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
  // [v7.5.56] Returns false when the share/unshare was refused or failed,
  // so the modal never shows a success state for it (void = legacy caller).
  onShareWallet: (walletId: string, email: string) => Promise<boolean> | boolean | void;
  onUnshareWallet: (walletId: string, email: string) => Promise<boolean> | boolean | void;
  onUpdatePermissions?: (walletId: string, email: string, permissions: WalletPermissions) => void;
  plan: PlanType;
  lang: 'my' | 'en';
  // [v7.5.56] Coordinator wires these from App/WalletsView:
  // currentUserEmail = signed-in user's email (self-invite block);
  // maxCollaborators = limits.maxCollaborators from the limits table
  // (single source of truth — never a hardcoded number here);
  // onOpenSignIn = opens the auth modal for the guest gate.
  currentUserEmail?: string | null;
  maxCollaborators?: number;
  onOpenSignIn?: () => void;
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
  currentUserEmail,
  maxCollaborators,
  onOpenSignIn,
}) => {
  const [emailInput, setEmailInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);
  // [v7.5.56] Invite confirmation step — the email awaiting confirmation.
  const [pendingInvite, setPendingInvite] = useState<string | null>(null);
  // [v7.5.56] Emails unshared during this modal session (for re-add UX).
  const [unsharedEmails, setUnsharedEmails] = useState<string[]>([]);
  // [v7.5.60 S-46] Email awaiting unshare confirmation — one stray tap
  // used to revoke access immediately, with no confirm and no undo.
  const [pendingUnshareEmail, setPendingUnshareEmail] = useState<string | null>(null);
  // [v7.5.56] Email re-invited after being unshared — its previous
  // permissions were removed, so the card auto-expands with a note.
  const [reAddedEmail, setReAddedEmail] = useState<string | null>(null);

  // Reset transient invite state whenever the modal opens for a wallet.
  useEffect(() => {
    if (isOpen && wallet) {
      setPendingInvite(null);
      setPendingUnshareEmail(null);
      setErrorMsg('');
      setSuccessMsg('');
      setReAddedEmail(null);
    }
  }, [isOpen, wallet?.id]);

  if (!isOpen || !wallet) return null;

  const sharedList = wallet.sharedWith || [];
  const permissionsMap = wallet.collaboratorPermissions || {};

  // [v7.5.56] Missing permission keys default to FALSE (deny-by-default,
  // matching the Firestore rules). An unmatched user also falls back to
  // READ_ONLY_PERMISSIONS (deny), never to the Full preset.
  const getEmailPerms = (email: string): WalletPermissions => {
    const clean = email.trim().toLowerCase();
    for (const key of Object.keys(permissionsMap)) {
      if (key.trim().toLowerCase() === clean) {
        const p = permissionsMap[key] || READ_ONLY_PERMISSIONS;
        return {
          canAddIncome: p.canAddIncome === true,
          canEditIncome: p.canEditIncome === true,
          canDeleteIncome: p.canDeleteIncome === true,
          canAddExpense: p.canAddExpense === true,
          canEditExpense: p.canEditExpense === true,
          canDeleteExpense: p.canDeleteExpense === true,
        };
      }
    }
    return READ_ONLY_PERMISSIONS;
  };

  // [v7.5.56] Toggling one box flips ONLY that key. getEmailPerms now
  // returns false defaults, so the spread below can no longer inflate
  // the other keys to true.
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

  // [v7.5.56] Proper email validation (regex, not just '@' and '.'),
  // self-invite block, case-insensitive duplicate detection, and the
  // collaborator cap from the limits table. Validation only opens the
  // confirmation screen — the invite itself is sent from there.
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const email = emailInput.trim().toLowerCase();
    if (!email) {
      setErrorMsg(lang === 'my' ? 'Email လိပ်စာ ထည့်သွင်းပါ' : 'Please enter an email address');
      return;
    }

    if (!EMAIL_RE.test(email)) {
      setErrorMsg(lang === 'my' ? 'မှန်ကန်သော Email လိပ်စာ ဖြစ်ရပါမည် (ဥပမာ - name@gmail.com)' : 'Please enter a valid email address (e.g. name@gmail.com)');
      return;
    }

    if (currentUserEmail && email === currentUserEmail.trim().toLowerCase()) {
      setErrorMsg(lang === 'my' ? 'ကိုယ့်ကိုယ်ကို ဖိတ်ခေါ်၍ မရပါ' : 'You cannot invite yourself');
      return;
    }

    if (sharedList.some((e) => e.trim().toLowerCase() === email)) {
      setErrorMsg(lang === 'my' ? 'ဤ Email သည် ထည့်သွင်းပြီးသား ဖြစ်ပါသည်' : 'This email is already added');
      return;
    }

    // [v7.5.56] Free limit text + enforcement come from the limits table
    // (maxCollaborators prop). When the prop is not wired yet, the
    // handler still enforces the table value — the modal just skips its
    // own pre-check instead of hardcoding a number.
    if (maxCollaborators !== undefined && sharedList.length >= maxCollaborators) {
      setErrorMsg(
        lang === 'my'
          ? `Free Plan တွင် ၁ ခါလျှင် Collaborator (${maxCollaborators}) ယောက်အထိသာ မျှဝေနိုင်ပါသည်။ Premium သို့ အဆင့်မြှင့်ပါ`
          : `Free plan allows up to ${maxCollaborators} collaborators per wallet. Upgrade to Premium for more`
      );
      return;
    }

    setPendingInvite(email);
  };

  // [v7.5.56] Confirmation screen action — only now is the invite sent.
  // Success is shown ONLY when the handler reports success (it returns
  // false for guest/self/limit/cloud failures, after toasting the reason).
  const handleConfirmInvite = async () => {
    if (!pendingInvite) return;
    const email = pendingInvite;
    setPendingInvite(null);
    const result = await onShareWallet(wallet.id, email);
    if (result === false) return;
    setEmailInput('');
    setExpandedEmail(email);
    if (unsharedEmails.includes(email)) {
      // Re-add: previous permissions were removed when unshared —
      // auto-expand the checkboxes and show the note.
      setReAddedEmail(email);
      setUnsharedEmails((prev) => prev.filter((e) => e !== email));
    }
    setSuccessMsg(
      lang === 'my'
        ? `${email} အား ဤ Wallet သို့ အောင်မြင်စွာ ဖိတ်ခေါ်ပြီးပါပြီ`
        : `Successfully invited ${email} to this wallet`
    );
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  // [v7.5.56] Record unshares so a later re-add can auto-expand the
  // permission checkboxes with a "previous permissions removed" note.
  const handleUnshare = (email: string) => {
    const clean = email.trim().toLowerCase();
    setPendingUnshareEmail(null);
    setUnsharedEmails((prev) => (prev.includes(clean) ? prev : [...prev, clean]));
    onUnshareWallet(wallet.id, email);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-xs shrink-0"
              style={{ backgroundColor: wallet.color }}
            >
              <CategoryIcon name={wallet.icon} className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900 truncate min-w-0">
                  {lang === 'my' ? wallet.name : wallet.nameEn}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
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
            className="min-w-9 min-h-9 p-2.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/80 transition-colors cursor-pointer shrink-0 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto overflow-x-hidden flex-1">
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

          {/* [v7.5.56] Guest gate — a guest never sees the invite form or
              any invite success. Show the sign-in prompt instead. */}
          {plan === 'guest' ? (
            <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-center space-y-2">
              <p className="text-xs font-bold text-indigo-900">
                {lang === 'my'
                  ? 'Guest Mode တွင် Wallet မျှဝေခြင်း မရရှိနိုင်ပါ'
                  : 'Wallet sharing is not available in Guest mode'}
              </p>
              <p className="text-[11px] text-indigo-800 leading-relaxed">
                {lang === 'my'
                  ? 'Wallet မျှဝေရန် Google Account ဖြင့် Sign in ပြုလုပ်ပါ'
                  : 'Please sign in with Google to share this wallet'}
              </p>
              {onOpenSignIn && (
                <button
                  type="button"
                  onClick={onOpenSignIn}
                  className="mt-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  {lang === 'my' ? 'Sign in ဝင်မည်' : 'Sign in'}
                </button>
              )}
            </div>
          ) : (
          <form onSubmit={handleInvite} className="space-y-2">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
              <span>{lang === 'my' ? 'Collaborator အီးမေးလ် ဖိတ်ခေါ်ရန်:' : 'Invite Collaborator Email:'}</span>
            </label>

            <div className="flex gap-2">
              <div className="relative flex-1 min-w-0">
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
          )}

          {/* [v7.5.56] Invite confirmation screen — exact email + wallet
              name + what the invitee will see, before anything is sent.
              The default preset for a new invite is Full access. */}
          {pendingInvite && plan !== 'guest' && (
            <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200 space-y-2.5">
              <p className="text-xs font-bold text-indigo-950">
                {lang === 'my' ? 'ဖိတ်ခေါ်မှု အတည်ပြုပါ' : 'Confirm invite'}
              </p>
              <div className="text-xs text-slate-700 space-y-1 leading-relaxed">
                <p>
                  <span className="font-semibold">{lang === 'my' ? 'Email: ' : 'Email: '}</span>
                  <span className="font-bold text-slate-900 break-all">{pendingInvite}</span>
                </p>
                <p>
                  <span className="font-semibold">{lang === 'my' ? 'Wallet: ' : 'Wallet: '}</span>
                  <span className="font-bold text-slate-900 break-words">{lang === 'my' ? wallet.name : wallet.nameEn || wallet.name}</span>
                </p>
                <p className="text-[11px] text-slate-600">
                  {lang === 'my'
                    ? 'ဖိတ်ခေါ်ခံရသူသည် ဤ Wallet ၏ လက်ကျန်ငွေ၊ ဝင်ငွေ/ထွက်ငွေ စာရင်းများကို မြင်ရမည်။ ခွင့်ပြုချက် (အပြည့်အဝ): ဝင်ငွေ/ထွက်ငွေ ထည့်၊ ပြင်၊ ဖျက်နိုင်သည်။ ခွင့်ပြုချက်များကို အောက်တွင် နောက်မှ ပြင်ဆင်နိုင်ပါသည်။'
                    : 'The invitee will see this wallet\'s balance and income/expense records. Default access (Full): they can add, edit and delete income and expense. You can change the permissions below afterwards.'}
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPendingInvite(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200/70 font-semibold text-xs cursor-pointer transition-colors"
                >
                  {lang === 'my' ? 'မလုပ်တော့ပါ' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmInvite}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer transition-colors"
                >
                  {lang === 'my' ? 'ဖိတ်ခေါ်မှု အတည်ပြုမည်' : 'Confirm Invite'}
                </button>
              </div>
            </div>
          )}

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
                            onClick={() => setPendingUnshareEmail(email)}
                            className="min-w-9 min-h-9 p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer flex items-center justify-center"
                            title={lang === 'my' ? 'မျှဝေမှု ဖယ်ရှားမည်' : 'Remove sharing'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* [v7.5.60 S-46] Unshare confirmation — the trash tap
                          only arms this; access is revoked on confirm. */}
                      {pendingUnshareEmail === email && (
                        <div className="p-3 border-t border-rose-200 bg-rose-50 space-y-2">
                          <p className="text-xs font-semibold text-rose-900 leading-relaxed">
                            {lang === 'my'
                              ? `“${email}” ရဲ့ မျှဝေမှုကို ဖြုတ်မလား? သူ့ရဲ့ ခွင့်ပြုချက်တွေ ပျက်သွားပြီး ဤ Wallet ကို မြင်ရ/သုံးရ တော့မည် မဟုတ်ပါ။`
                              : `Remove sharing for “${email}”? Their permissions will be revoked and they will no longer see or use this wallet.`}
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleUnshare(email)}
                              className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 cursor-pointer"
                            >
                              {lang === 'my' ? 'မျှဝေမှု ဖြုတ်မည်' : 'Remove sharing'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingUnshareEmail(null)}
                              className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                            >
                              {lang === 'my' ? 'မလုပ်တော့ပါ' : 'Cancel'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Permissions Configuration Panel */}
                      {isExpanded && (
                        <div className="p-3.5 border-t border-slate-200 bg-slate-50/90 space-y-3 animate-in fade-in duration-150">
                          {/* [v7.5.56] Re-add note — previous permissions
                              were removed when unshared, so they start
                              from the Full default and must be set again. */}
                          {reAddedEmail === email.trim().toLowerCase() && (
                            <p className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                              {lang === 'my'
                                ? '⚠️ ယခင် မျှဝေမှု ဖယ်ရှားစဉ်က ခွင့်ပြုချက်များ ဖျက်လိုက်ပြီးဖြစ်ပါသည် — ခွင့်ပြုချက်များကို အသစ် ပြန်သတ်မှတ်ပေးပါ (ယခု အပြည့်အဝ ဖြစ်နေပါသည်)'
                                : '⚠️ Previous permissions were removed when unshared — please set them again (currently Full access)'}
                            </p>
                          )}
                          {/* Presets */}
                          <div className="flex items-center justify-between gap-1 flex-wrap">
                            <span className="text-[11px] font-bold text-slate-600">
                              {lang === 'my' ? 'အမြန်သတ်မှတ်ရန်:' : 'Quick Presets:'}
                            </span>
                            <div className="flex items-center gap-1">
                              {/* [v7.5.56] "Full" = DEFAULT_WALLET_PERMISSIONS,
                                  which is all-true (cross-worker contract).
                                  It is also the default preset for a new
                                  invite (see handleShareWallet). */}
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
          <div className="text-[11px] text-slate-500 flex items-center gap-1 min-w-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">{lang === 'my' ? 'ပြင်ဆင်မှုများ အလိုအလျောက် သိမ်းဆည်းပါသည်' : 'Changes save automatically'}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white transition-colors cursor-pointer shadow-xs shrink-0"
          >
            {lang === 'my' ? 'ပြီးပြီ' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
};
