import React, { useState } from 'react';
import { safeGetItem } from '../utils/storage';
import { X, Cloud, CheckCircle2, LogOut, Sparkles, Smartphone, Laptop, ArrowUpCircle, ArrowDownCircle, FileJson, Download, Upload, Lock, Trash2, Crown, Clock, Calendar, Users, Mail, ShieldCheck, BookOpen, RefreshCw, AlertCircle, History } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { resetFirestoreConnection } from '../lib/firebase';
import { PinLockSettings, PlanType } from '../types';
// [v7.5.60 G-M8] Version badge reads the live version, never hardcoded.
import { CURRENT_APP_VERSION } from '../data/versionHistory';
// [v7.5.60 G-M3] Google sign-in errors go through the same mapper as
// the login screen — no raw Firebase codes shown to the user.
import { getAuthErrorDetails, VPN_ADVICE_MY, VPN_ADVICE_EN } from '../utils/authErrorMapper';
import { PinSetupModal } from './PinSetupModal';
import { PinLockScreen } from './PinLockScreen';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'my' | 'en';
  onManualSyncUp: () => Promise<void>;
  onManualSyncDown: (overrideWorkspaceId?: string) => Promise<void>;
  onOpenLoginScreen?: () => void;
  onExportJson?: () => void;
  onImportJson?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  pinSettings?: PinLockSettings;
  onUpdatePinSettings?: (settings: PinLockSettings) => void;
  onClearAllData?: () => void;
  onOpenAdminPanel?: () => void;
  plan?: PlanType;
  onOpenPremium?: () => void;
  onOpenPrivacy?: () => void;
  onOpenUserGuide?: () => void;
  onOpenVersionHistory?: () => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  lang,
  onManualSyncUp,
  onManualSyncDown,
  onOpenLoginScreen,
  onExportJson,
  onImportJson,
  pinSettings,
  onUpdatePinSettings,
  onClearAllData,
  onOpenAdminPanel,
  plan = 'free',
  onOpenPremium,
  onOpenPrivacy,
  onOpenUserGuide,
  onOpenVersionHistory,
}) => {
  const {
    user,
    userProfile,
    isGuest,
    isSyncing,
    lastSyncedAt,
    loginWithGoogle,
    logout,
    syncError,
    isAdmin,
    activeWorkspaceId,
    setActiveWorkspaceId,
    switchWorkspace,
    invitedWorkspaces = [],
    deleteAccount,
  } = useAuth();
  const [syncingAction, setSyncingAction] = useState<string | null>(null);
  const [workspaceInput, setWorkspaceInput] = useState('');
  const [workspaceMsg, setWorkspaceMsg] = useState({ type: '', text: '' });
  const [reconnectingVpn, setReconnectingVpn] = useState(false);
  const [vpnMsg, setVpnMsg] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showVpnHint, setShowVpnHint] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  // [v7.5.55 E11] PIN flows no longer use window.prompt(). Enable/change
  // go through PinSetupModal (two-step confirm + weak-PIN rejection);
  // change/disable first verify the CURRENT PIN via PinLockScreen.
  const [isPinSetupOpen, setIsPinSetupOpen] = useState(false);
  const [pinVerifyFor, setPinVerifyFor] = useState<'change' | 'disable' | null>(null);
  // [v7.5.56] Delete-account flow state. Password users type their
  // password into the inline field below (never window.prompt — the
  // password would echo in plain text); Google users are re-authed
  // with a popup inside deleteAccount().
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState({ type: '', text: '' });
  const isPasswordUser = (user?.providerData || []).some((p) => p.providerId === 'password');

  const handleResetVpnConnection = async () => {
    setReconnectingVpn(true);
    setVpnMsg(null);
    try {
      await resetFirestoreConnection();
      await onManualSyncDown();
      setVpnMsg(lang === 'my' ? '✓ VPN / လိုင်း ပြန်လည် ချိတ်ဆက်ပြီးပါပြီ' : '✓ Reconnected successfully');
    } catch (err) {
      setVpnMsg(lang === 'my' ? '⚠️ လိုင်းပြန်ချိတ်ရန် ကြိုးပမ်းမှု မအောင်မြင်ပါ' : '⚠️ Reconnect failed');
    } finally {
      setReconnectingVpn(false);
    }
  };

  // ============================================================
  // Secure PIN setup / change handlers (hashed with PBKDF2)
  // ============================================================
  // Enable: two-step create flow in PinSetupModal (weak PINs rejected).
  const handleEnablePin = () => {
    setPinError(null);
    setIsPinSetupOpen(true);
  };

  // Change: current PIN must be verified first (PinLockScreen overlay).
  const handleChangePin = () => {
    setPinError(null);
    setPinVerifyFor('change');
  };

  // Disable: confirm first, then verify the CURRENT PIN before turning
  // the lock off — toggling the switch used to disable it immediately
  // with no confirm and no proof the user knows the PIN.
  const handleDisablePin = () => {
    setPinError(null);
    if (!window.confirm(lang === 'my' ? 'PIN Lock ကို ပိတ်မည်လား? အက်ပ်ဖွင့်တိုင်း PIN တောင်းတော့မည် မဟုတ်ပါ။' : 'Turn off PIN Lock? The app will no longer ask for a PIN on start.')) return;
    setPinVerifyFor('disable');
  };

  // Called by PinLockScreen after the current PIN unlocks.
  const handleCurrentPinVerified = () => {
    const action = pinVerifyFor;
    setPinVerifyFor(null);
    if (action === 'change') {
      setIsPinSetupOpen(true);
    } else if (action === 'disable') {
      onUpdatePinSettings?.({
        ...(pinSettings || { isEnabled: false, pin: '', pinSalt: '', requireOnStart: false }),
        isEnabled: false,
      });
    }
  };

  // Calculate Days Left
  const expiryIso = userProfile?.premiumExpiresAt || safeGetItem('ngwe_premium_expires_at');
  let daysLeft: number | null = null;
  if (expiryIso) {
    const diffMs = new Date(expiryIso).getTime() - Date.now();
    daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  // [v7.5.56] Delete account: confirm first, then (password users)
  // ask for the password inline, then call deleteAccount() and report
  // its result honestly — success is shown only when it returns
  // success, and every error code gets its own message.
  const handleDeleteAccount = async (password?: string) => {
    setDeletingAccount(true);
    setDeleteMsg({ type: '', text: '' });
    try {
      const res = await deleteAccount(password);
      if (res.success) {
        setShowDeletePassword(false);
        setDeletePassword('');
        setDeleteMsg({
          type: 'success',
          text: lang === 'my'
            ? '✓ အကောင့်ဖျက်ပြီးပါပြီ။ သင့်ဒေတာအားလုံး ဖျက်သိမ်းလိုက်ပါပြီ။'
            : '✓ Account deleted. All of your data has been removed.',
        });
        return;
      }
      if (res.error === 'OWNED_SHARED_WALLETS') {
        const names = (res.ownedSharedWallets || []).join(', ');
        setDeleteMsg({
          type: 'error',
          text: lang === 'my'
            ? `⛔ အကောင့်မဖျက်နိုင်သေးပါ — သင်ပိုင်ဆိုင်ပြီး မျှဝေထားသော Wallet များ ရှိနေပါသည် (${names})။ အရင် ပိုင်ဆိုင်မှု လွှဲပြောင်းပေးပြီးမှ အကောင့်ဖျက်နိုင်ပါမည်။`
            : `⛔ Cannot delete your account yet — you still own shared wallets (${names}). Transfer ownership of them first, then delete your account.`,
        });
      } else if (res.error === 'WRONG_PASSWORD') {
        setDeleteMsg({
          type: 'error',
          text: lang === 'my'
            ? '⚠️ စကားဝှက် မှားနေပါသည်။ မှန်ကန်သော စကားဝှက်ကို ပြန်ရိုက်ထည့်ပါ။'
            : '⚠️ Wrong password. Please enter your correct password.',
        });
      } else if (res.error === 'PASSWORD_REQUIRED') {
        setDeleteMsg({
          type: 'error',
          text: lang === 'my'
            ? '⚠️ အကောင့်ဖျက်ရန် သင့်စကားဝှက် လိုအပ်ပါသည်။'
            : '⚠️ Your password is required to delete your account.',
        });
      } else if (res.error === 'REAUTH_CANCELLED') {
        setDeleteMsg({
          type: 'error',
          text: lang === 'my'
            ? '⚠️ အတည်ပြုခြင်း ပြတင်းပေါက် ပိတ်သွားပါသည်။ အကောင့် မဖျက်ရသေးပါ။'
            : '⚠️ The confirmation popup was closed. Your account was not deleted.',
        });
      } else if (res.error === 'REQUIRES_RECENT_LOGIN') {
        setDeleteMsg({
          type: 'error',
          text: lang === 'my'
            ? '⚠️ အကောင့်ဖျက်ရန် မကြာသေးခင် အကောင့်ဝင်ထားဖို့ လိုပါသည်။ အရင် အကောင့်ထွက်ပြီး ပြန်ဝင်ပြီးမှ ထပ်ကြိုးစားပါ။'
            : '⚠️ For security, please sign out and sign back in, then try deleting your account again.',
        });
      } else if (res.error === 'NOT_LOGGED_IN') {
        setDeleteMsg({
          type: 'error',
          text: lang === 'my'
            ? '⚠️ အကောင့် ဝင်ထားခြင်း မရှိပါ။'
            : '⚠️ You are not signed in.',
        });
      } else {
        setDeleteMsg({
          type: 'error',
          text: lang === 'my'
            ? `⚠️ အကောင့်ဖျက်ခြင်း မအောင်မြင်ပါ${res.error ? ` (${res.error})` : ''}။ အင်တာနက် စစ်ပြီး ပြန်ကြိုးစားပါ။`
            : `⚠️ Could not delete your account${res.error ? ` (${res.error})` : ''}. Check your connection and try again.`,
        });
      }
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleDeleteAccountClick = () => {
    setDeleteMsg({ type: '', text: '' });
    if (
      !window.confirm(
        lang === 'my'
          ? 'အကောင့်ကို အပြီးတိုင် ဖျက်မည်လား?\n\nသင့်စာရင်းမှတ်တမ်းများ၊ အကြွေးများ၊ ပိုက်ဆံအိတ်များ၊ ဘတ်ဂျက်များနှင့် Cloud ဒေတာအားလုံး အပြီးတိုင် ပျောက်ကွယ်သွားပါမည်။ ပြန်လည်ရယူ၍ မရပါ။\n\nမျှဝေထားသော Wallet များကို သင်ပိုင်ဆိုင်နေသေးပါက အကောင့် ဖျက်၍မရပါ — အရင် ပိုင်ဆိုင်မှု လွှဲပြောင်းပေးရပါမည်။'
          : 'Permanently delete your account?\n\nAll of your transactions, debts, wallets, budgets and Cloud data will be permanently removed and cannot be recovered.\n\nIf you still own any shared wallets, the account cannot be deleted until you transfer their ownership first.'
      )
    ) {
      return;
    }
    // Password users confirm with their password (inline field below);
    // Google users are re-authed with a popup inside deleteAccount().
    if (isPasswordUser) {
      setShowDeletePassword(true);
      return;
    }
    void handleDeleteAccount();
  };

  const handleSwitchWorkspace = async () => {
    try {
      if (!workspaceInput.trim()) {
        setActiveWorkspaceId(null);
        setWorkspaceMsg({ type: 'success', text: lang === 'my' ? 'မူလ Workspace သို့ ပြန်ပြောင်းလိုက်ပါပြီ' : 'Reverted to own workspace' });
        await handleSyncDown(user?.uid);
        return;
      }
      setActiveWorkspaceId(workspaceInput.trim());
      setWorkspaceMsg({ type: 'success', text: lang === 'my' ? 'Workspace ပြောင်းပြီးပါပြီ' : 'Workspace switched' });
      await handleSyncDown(workspaceInput.trim());
    } catch (err) {
      setWorkspaceMsg({ type: 'error', text: 'Sync failed' });
    }
  };

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setLoginError(null);
    setShowVpnHint(false);
    try {
      await loginWithGoogle();
      await onManualSyncUp();
    } catch (err: any) {
      console.error(err);
      // [v7.5.60 G-M3/G-M4] Same friendly mapper as the login screen:
      // no raw codes, one VPN message everywhere.
      const details = getAuthErrorDetails(err, lang);
      if (details.isVpnRelated) setShowVpnHint(true);
      setLoginError(`${details.title}: ${details.message}`);
    }
  };

  const handleSyncUp = async () => {
    setSyncingAction('up');
    try {
      await onManualSyncUp();
    } finally {
      setSyncingAction(null);
    }
  };

  const handleSyncDown = async (overrideWorkspaceId?: string) => {
    setSyncingAction('down');
    try {
      await onManualSyncDown(overrideWorkspaceId);
    } finally {
      setSyncingAction(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-200 relative overflow-y-auto overflow-x-hidden max-h-[90vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shadow-xs">
            <Cloud className="w-6 h-6 stroke-[2]" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              {lang === 'my' ? 'အကောင့်နှင့် Cloud Sync' : 'Account & Cloud Sync'}
            </h2>
            <p className="text-xs text-slate-500 font-normal">
              {lang === 'my'
                ? 'ဒေတာများ မပျောက်ပျက်စေရန် Cloud ပေါ်တွင် သိမ်းဆည်းပါ'
                : 'Safeguard your finances with Cloud Backup'}
            </p>
          </div>
        </div>

        {/* Current Account Status Box */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 mb-4">
          {user ? (
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-11 h-11 rounded-full border border-emerald-300 shadow-xs"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                  {user.displayName ? user.displayName[0].toUpperCase() : 'U'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-slate-900 truncate min-w-0">
                    {user.displayName || 'User'}
                  </span>
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.2 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    {lang === 'my' ? 'ချိတ်ဆက်ပြီး' : 'Connected'}
                  </span>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenAdminPanel?.();
                      }}
                      className="ml-auto px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200 hover:bg-indigo-200 shrink-0"
                    >
                      Admin Panel
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
                {lastSyncedAt && (
                  <p className="text-[10px] text-emerald-700 font-medium mt-0.5">
                    {lang === 'my' ? 'နောက်ဆုံး Sync:' : 'Last synced:'}{' '}
                    {lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-800">
                    {lang === 'my' ? 'ဧည့်သည်အဆင့် (Guest Mode)' : 'Guest Mode (Local Storage)'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-900 border border-amber-200 shrink-0">
                    {lang === 'my' ? 'စက်ထဲတွင်သာ' : 'Offline / Local'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {lang === 'my'
                    ? 'လက်ရှိတွင် သင့်ဒေတာများကို ဤစက်ထဲ၌သာ သိမ်းထားပါသည်။'
                    : 'Your records are stored securely in this browser local storage.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Premium Status Box */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/80 to-emerald-50/50 border border-amber-200/80 mb-5 shadow-2xs">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                plan === 'premium' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                <Crown className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                    {plan === 'premium'
                      ? lang === 'my' ? '✨ Premium အဖွဲ့ဝင်' : '✨ Premium Plan Active'
                      : lang === 'my' ? 'အခြေခံအဆင့် (Free Plan)' : 'Free Plan'}
                  </h4>
                  {plan === 'premium' && daysLeft !== null && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-emerald-600" />
                      {daysLeft > 3650
                        ? (lang === 'my' ? 'တစ်သက်တာ' : 'Lifetime')
                        : (lang === 'my' ? `${daysLeft} ရက်ကျန်` : `${daysLeft} days left`)}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  {plan === 'premium'
                    ? expiryIso
                      ? daysLeft && daysLeft > 3650
                        ? lang === 'my' ? 'သက်တမ်း: တစ်သက်တာ (Lifetime Access)' : 'Duration: Lifetime Access'
                        : `${lang === 'my' ? 'သက်တမ်းကုန်မည့်ရက်: ' : 'Expires: '}${new Date(expiryIso).toLocaleDateString('en-GB')}`
                      : lang === 'my' ? 'အကန့်အသတ်မရှိ အင်္ဂါရပ်အားလုံး သုံးနိုင်ပါသည်' : 'Unlimited features and ad-free experience'
                    : lang === 'my'
                    ? 'အကန့်အသတ်မရှိ သုံးစွဲရန် Premium သို့ မြှင့်တင်ပါ'
                    : 'Upgrade to Premium for unlimited records & features'}
                </p>
              </div>
            </div>

            {onOpenPremium && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPremium();
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs ${
                  plan === 'premium'
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white'
                }`}
              >
                {plan === 'premium'
                  ? lang === 'my' ? 'သက်တမ်းတိုး' : 'Extend / Renew'
                  : lang === 'my' ? 'Upgrade' : 'Upgrade'}
              </button>
            )}
          </div>
        </div>

        {/* [v7.5.60 G-S9] The duplicate "Clear All Data" button that used
            to sit here is removed — the Danger Zone copy at the bottom
            of this modal is the only one, so a stray tap can't wipe
            data twice as easily. */}

        {/* Workspace Sharing Panel */}
        {!isGuest && (
          <div className="mb-5 space-y-3">
            <div className="p-4 rounded-2xl bg-white border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 min-w-0">
                  <Users className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="truncate">{lang === 'my' ? 'ပူးပေါင်းအသုံးပြုခြင်း (Workspace Sharing)' : 'Workspace Sharing'}</span>
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                  plan === 'premium'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}>
                  {plan === 'premium'
                    ? (lang === 'my' ? '👑 Premium: အကန့်အသတ်မဲ့' : '👑 Premium: Unlimited')
                    : (lang === 'my' ? 'Free: အများဆုံး ၂ ယောက်' : 'Free: Up to 2 members')}
                </span>
              </div>

              <div className="mb-3 p-2.5 rounded-xl bg-indigo-50/90 border border-indigo-200/80 text-[11px] text-indigo-950 leading-relaxed font-medium flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  {lang === 'my'
                    ? '💡 Wallet အလိုက် သီးသန့် မျှဝေလိုပါက "ပိုက်ဆံအိတ်များ" စာမျက်နှာရှိ Wallet ကဒ်တစ်ခုချင်းစီ၏ Share ခလုတ်ကို နှိပ်၍ အီးမေးလ်ဖြင့် ဖိတ်ခေါ်နိုင်ပါသည်!'
                    : '💡 To share specific individual wallets, go to the "Wallets" page and click the Share button on each wallet card!'}
                </span>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    {lang === 'my' ? 'သင့် Workspace ID (အခြားသူသို့ပေးရန်)' : 'Your Workspace ID'}
                  </label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 min-w-0 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-xs font-mono text-slate-700 truncate select-all">
                      {user?.uid}
                    </code>
                  </div>
                </div>

                                {/* [v7.5.56] The legacy root-collaborators list is gone:
                    sharing is per-wallet now — collaborators are listed on
                    each wallet card (Wallets page, Share button). The old
                    root array is no longer written and grants nothing. */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
                  {lang === 'my'
                    ? '💡 ပူးပေါင်းအသုံးပြုသူများကို Wallet တစ်ခုချင်းစီတွင် ကြည့်နိုင်ပါသည် — "ပိုက်ဆံအိတ်များ" စာမျက်နှာရှိ Share ခလုတ်မှ ဖိတ်ခေါ်ထားသူများကို စစ်ဆေးပါ။'
                    : '💡 Collaborators are listed per wallet — check the Share button on each wallet card on the "Wallets" page.'}
                </div>

                {/* [v7.5.56] No add-collaborator box here any more: it
                    only validated and never actually shared anything —
                    sharing happens per-wallet (Share button on a wallet
                    card in WalletsView). Direct users there instead of
                    leaving a dead input that implies it adds someone. */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
                  {lang === 'my'
                    ? '💡 ပူးပေါင်းအသုံးပြုသူ ထည့်လိုပါက "ပိုက်ဆံအိတ်များ" စာမျက်နှာတွင် Wallet တစ်ခုချင်းစီ၏ Share ခလုတ်မှ ဖိတ်ခေါ်ပါ — ဤနေရာမှ တိုက်ရိုက် ထည့်၍မရပါ။'
                    : '💡 To invite a collaborator, share a wallet from the "Wallets" page using its Share button — collaborators can no longer be added from here.'}
                </div>

                <hr className="border-slate-100" />

                {invitedWorkspaces && invitedWorkspaces.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      {lang === 'my' ? 'သင့်ထံ မျှဝေဖိတ်ခေါ်ထားသော Workspace များ' : 'Workspaces Invited To You'}
                    </label>
                    <div className="space-y-2">
                      {invitedWorkspaces.map((ws) => {
                        const isActive = activeWorkspaceId === ws.uid;
                        return (
                          <div
                            key={ws.uid}
                            className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                              isActive
                                ? 'bg-indigo-50/90 border-indigo-300'
                                : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-bold text-slate-800 truncate">
                                  {ws.displayName || ws.email}
                                </p>
                                {isActive && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-600 text-white">
                                    {lang === 'my' ? 'လက်ရှိ' : 'Active'}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 truncate">{ws.email}</p>
                            </div>
                            {isActive ? (
                              <button
                                type="button"
                                onClick={async () => {
                                  await switchWorkspace(null);
                                  setWorkspaceMsg({
                                    type: 'success',
                                    text: lang === 'my' ? 'မူလ Workspace သို့ ပြန်ပြောင်းလိုက်ပါပြီ' : 'Switched back to your own workspace',
                                  });
                                  await onManualSyncDown(user?.uid);
                                }}
                                className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-100 shadow-2xs cursor-pointer shrink-0"
                              >
                                {lang === 'my' ? 'မူလသို့ပြန်မည်' : 'Switch Back'}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={async () => {
                                  await switchWorkspace(ws.uid);
                                  setWorkspaceMsg({
                                    type: 'success',
                                    text: lang === 'my' ? `${ws.email} ၏ Workspace သို့ ပြောင်းလိုက်ပါပြီ` : `Switched to ${ws.email}'s workspace`,
                                  });
                                  await onManualSyncDown(ws.uid);
                                }}
                                className="px-3 py-1 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-2xs cursor-pointer shrink-0"
                              >
                                {lang === 'my' ? 'ချိတ်ဆက်မည်' : 'Connect'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    {lang === 'my' ? 'အခြား Workspace သို့ ချိတ်ဆက်ရန် (ID ထည့်ပါ)' : 'Join Workspace (Enter ID)'}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={workspaceInput}
                      onChange={(e) => setWorkspaceInput(e.target.value)}
                      placeholder={lang === 'my' ? 'Workspace ID ထည့်ပါ (အလွတ်ထားပါက မူလသို့ပြန်ရောက်မည်)' : 'Workspace ID (Leave empty to reset)'}
                      className="flex-1 min-w-0 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-mono"
                    />
                    <button
                      onClick={handleSwitchWorkspace}
                      className="px-3 py-1.5 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg hover:bg-indigo-200 shrink-0"
                    >
                      {lang === 'my' ? 'ပြောင်းမည်' : 'Switch'}
                    </button>
                  </div>
                  {activeWorkspaceId && activeWorkspaceId !== user?.uid && (
                    <p className="text-[10px] text-indigo-600 font-medium">
                      {lang === 'my' ? 'အခြား Workspace သို့ ချိတ်ဆက်ထားပါသည်။' : 'Connected to shared workspace.'}
                    </p>
                  )}
                </div>

                {workspaceMsg.text && (
                  <div className={`text-xs p-2 rounded-lg break-words ${workspaceMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                    {workspaceMsg.text}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {syncError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium break-words">
            ⚠️ {syncError}
          </div>
        )}

        {pinError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium break-words">
            {pinError}
          </div>
        )}

        {isGuest ? (
          <div className="space-y-4">
            <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>{lang === 'my' ? 'အကောင့်ဝင်ရောက်ခြင်း၏ အကျိုးကျေးဇူးများ' : 'Benefits of Connecting'}</span>
              </div>
              <ul className="text-xs text-slate-600 space-y-1.5 pl-1">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>{lang === 'my' ? 'ဖုန်းလဲသည့်အခါ/စက်ပျက်သည့်အခါ ဒေတာမပျောက်ပျက်စေခြင်း' : 'Never lose your financial history when switching phones'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="flex items-center gap-1 text-slate-600 pt-0.5">
                    <Smartphone className="w-3 h-3" />
                    <Laptop className="w-3 h-3" />
                  </div>
                  <span>{lang === 'my' ? 'ဖုန်းရော ကွန်ပျူတာပါ စက်အစုံမှ တပြိုင်နက်တည်း ကြည့်ရှုနိုင်ခြင်း' : 'Access records simultaneously across phone and laptop'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>{lang === 'my' ? 'Firebase Firestore ဖြင့် အလိုအလျောက် Cloud Backup ပြုလုပ်ခြင်း' : 'Automatic real-time cloud backup on Google Cloud'}</span>
                </li>
              </ul>
            </div>

            {loginError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1.5">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="font-semibold leading-relaxed break-words">{loginError}</span>
                </div>
                {showVpnHint && (
                  <p className="text-[11px] text-rose-800 pl-6">
                    {lang === 'my' ? VPN_ADVICE_MY : VPN_ADVICE_EN}
                  </p>
                )}
              </div>
            )}

            {onOpenLoginScreen && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLoginScreen();
                }}
                className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <Mail className="w-4 h-4 text-emerald-200" />
                <span>
                  {lang === 'my'
                    ? 'Email ဖြင့် အကောင့်သစ်ဖွင့်မည် / ဝင်မည် (VPN မလိုပါ)'
                    : 'Create Account / Sign In with Email (No VPN)'}
                </span>
              </button>
            )}

            <div className="pt-1 text-center">
              <button
                id="google-signin-btn"
                onClick={handleGoogleLogin}
                disabled={isSyncing}
                className="w-full py-2 px-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs flex items-center justify-center gap-2.5 font-medium text-xs text-slate-700 transition-all active:scale-95 cursor-pointer disabled:opacity-60"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>
                  {isSyncing
                    ? (lang === 'my' ? 'ချိတ်ဆက်နေသည်...' : 'Connecting...')
                    : (lang === 'my' ? 'Google ဖြင့် ဝင်မည် (VPN လိုအပ်နိုင်ပါသည် — မရလျှင် Email ဖြင့် ဝင်ပါ)' : 'Continue with Google (VPN may be needed — use Email if it fails)')}
                </span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleSyncUp}
                disabled={isSyncing}
                className="p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-semibold text-xs flex flex-col items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <ArrowUpCircle className={`w-5 h-5 text-emerald-600 ${syncingAction === 'up' ? 'animate-bounce' : ''}`} />
                <span>{lang === 'my' ? 'Cloud ပေါ်သိမ်းမည်' : 'Upload to Cloud'}</span>
              </button>

              <button
                onClick={() => handleSyncDown()}
                disabled={isSyncing}
                className="p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-semibold text-xs flex flex-col items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <ArrowDownCircle className={`w-5 h-5 text-teal-600 ${syncingAction === 'down' ? 'animate-bounce' : ''}`} />
                <span>{lang === 'my' ? 'Cloud မှ ပြန်ဆွဲမည်' : 'Restore from Cloud'}</span>
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-indigo-50/80 border border-indigo-200/80 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-800">
                    {lang === 'my' ? 'VPN / လိုင်း မငြိမ်ပါက ချိတ်ဆက်မှု ပြန်စမည်' : 'VPN / Network Reconnect'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleResetVpnConnection}
                  disabled={reconnectingVpn}
                  className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-60 shadow-xs shrink-0"
                >
                  <RefreshCw className={`w-3 h-3 ${reconnectingVpn ? 'animate-spin' : ''}`} />
                  <span>{reconnectingVpn ? (lang === 'my' ? 'ချိတ်နေသည်...' : 'Connecting...') : (lang === 'my' ? 'ပြန်လည်ချိတ်မည်' : 'Reconnect')}</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-500 leading-tight">
                {lang === 'my'
                  ? 'VPN ဖွင့်ထား၍ လိုင်းနှေးနေပါက သို့မဟုတ် Sync ခလုတ် ငြိမ်နေပါက ဤခလုတ်ကို နှိပ်ပါ'
                  : 'If VPN packet loss causes sync delay, click to reset connection immediately'}
              </p>
              {vpnMsg && (
                <p className="text-[11px] font-bold text-indigo-700 mt-1">
                  {vpnMsg}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                onClick={logout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{lang === 'my' ? 'အကောင့်ထွက်မည်' : 'Disconnect / Sign Out'}</span>
              </button>

              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {lang === 'my' ? 'ပြီးပါပြီ' : 'Done'}
              </button>
            </div>
          </div>
        )}

        {/* Local JSON Backup Section */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="flex items-center gap-1.5 mb-3">
            <FileJson className="w-4 h-4 text-slate-500" />
            <h3 className="text-xs font-bold text-slate-700">
              {lang === 'my' ? 'Manual Backup (JSON)' : 'Local File Backup'}
            </h3>
          </div>
          <div className={`grid gap-3 ${plan === 'premium' ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {plan === 'premium' && (
              <button
                onClick={onExportJson}
                className="p-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-xs flex flex-col items-center gap-1 hover:bg-slate-50 transition-colors shadow-xs"
              >
                <Download className="w-4 h-4 text-slate-400" />
                <span>{lang === 'my' ? 'Save to File' : 'Export Data'}</span>
              </button>
            )}
            <label className="p-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-xs flex flex-col items-center gap-1 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer">
              <Upload className="w-4 h-4 text-slate-400" />
              <span>{lang === 'my' ? 'Restore from File' : 'Import Data'}</span>
              <input type="file" accept=".json" onChange={onImportJson} className="hidden" />
            </label>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 text-center">
            {lang === 'my' ? 'အင်တာနက်မလိုဘဲ ဖုန်းထဲသို့တိုက်ရိုက်သိမ်းနိုင်သည်' : 'Keep an offline copy of your records.'}
          </p>
        </div>

        {/* [v6.23.6] Reminder Notifications Section */}
        {typeof window !== 'undefined' && 'Notification' in window && (
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center gap-1.5 mb-3">
              <Calendar className="w-4 h-4 text-slate-500" />
              <h3 className="text-xs font-bold text-slate-700">
                {lang === 'my' ? 'သတိပေးချက်များ (Reminders)' : 'Reminders & Notifications'}
              </h3>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm text-slate-900">
                    {lang === 'my' ? 'နေ့စဉ် သတိပေးချက်' : 'Daily Reminder'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                    {lang === 'my'
                      ? 'ည ၉ နာရီတွင် ဒီနေ့၏ စာရင်းများ သွင်းရန် သတိပေးမည် — အက်ပ်ဖွင့်ထားမှသာ သတိပေးပါမည်'
                      : 'Reminder at 9 PM to record daily transactions — only while the app is open'}
                  </div>
                  <div className="mt-1.5">
                    {Notification.permission === 'granted' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        {lang === 'my' ? 'ဖွင့်ပြီး' : 'Enabled'}
                      </span>
                    )}
                    {Notification.permission === 'denied' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        <AlertCircle className="w-3 h-3" />
                        {lang === 'my' ? 'ပိတ်ထား (Browser Settings)' : 'Blocked (Browser Settings)'}
                      </span>
                    )}
                    {Notification.permission === 'default' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {lang === 'my' ? 'မဖွင့်ရသေး' : 'Not enabled'}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new Event('ngwe:request-notification'));
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer active:scale-95 ${
                    Notification.permission === 'granted'
                      ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                  }`}
                >
                  {Notification.permission === 'granted'
                    ? (lang === 'my' ? 'ပြန်စမ်း' : 'Re-check')
                    : (lang === 'my' ? 'ဖွင့်မည်' : 'Enable')}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 leading-tight">
                {lang === 'my'
                  ? '💡 သတိပေးချက်များကို App စတင်ဖွင့်ချိန်တွင် မတောင်းတော့ပါ။ ဤနေရာမှ ကိုယ်တိုင် ဖွင့်ပါ။'
                  : '💡 Reminders are no longer requested at app startup. Enable them here manually.'}
              </p>
            </div>
          </div>
        )}

        {/* Security / PIN Lock Section */}
        {pinSettings && onUpdatePinSettings && (
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center gap-1.5 mb-3">
              <Lock className="w-4 h-4 text-slate-500" />
              <h3 className="text-xs font-bold text-slate-700">
                {lang === 'my' ? 'လုံခြုံရေး (Security)' : 'App Security'}
              </h3>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-slate-900">
                    {lang === 'my' ? 'လျှို့ဝှက်နံပါတ် ဖွင့်မည်' : 'App PIN Lock'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {lang === 'my' ? 'အက်ပ်ဖွင့်တိုင်း ၄ လုံး PIN တောင်းမည်' : 'Require 4-digit PIN on start'}
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={pinSettings.isEnabled}
                    onChange={(e) => {
                      if (!e.target.checked) {
                        handleDisablePin();
                      } else {
                        handleEnablePin();
                      }
                    }}
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
              {/* [v7.5.60 G-M2/M-25] Guests have no account: a forgotten
                  PIN cannot be recovered by email, so link an account
                  BEFORE turning the lock on. */}
              {isGuest && !pinSettings.isEnabled && (
                <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                  <p className="text-[11px] text-amber-900 font-semibold leading-relaxed">
                    {lang === 'my'
                      ? '⚠️ သတိပေးချက် — ဧည့်သည်အဖြစ် သုံးနေပါသည်။ PIN မေ့သွားလျှင် Email ဖြင့် ပြန်ယူ၍ မရပါ — ဒေတာ အပြီးတိုင် ပျောက်နိုင်ပါသည်။ PIN မဖွင့်မီ အကောင့် ချိတ်ဆက်ထားပါ။'
                      : '⚠️ Warning — you are using Guest Mode. If you forget the PIN there is no email recovery — your data may be lost for good. Link an account before turning on the PIN lock.'}
                  </p>
                  {onOpenLoginScreen && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenLoginScreen();
                      }}
                      className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors cursor-pointer active:scale-95"
                    >
                      {lang === 'my' ? 'အရင် Google / Email အကောင့် ချိတ်ဆက်မည်' : 'Link a Google / Email account first'}
                    </button>
                  )}
                </div>
              )}
              {pinSettings.isEnabled && (
                <div className="mt-3 pt-3 border-t border-slate-200 flex justify-end">
                  <button
                    onClick={handleChangePin}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                  >
                    {lang === 'my' ? 'PIN ပြောင်းမည်' : 'Change PIN'}
                  </button>
                </div>
              )}
              <p className="text-[10px] text-slate-400 mt-2 leading-tight">
                {lang === 'my'
                  ? '🔒 PIN ကို PBKDF2-SHA256 ဖြင့် hash လုပ်ပြီး သိမ်းဆည်းပါသည် (plaintext မသိမ်းပါ)'
                  : '🔒 PIN is stored as PBKDF2-SHA256 hash (never as plaintext)'}
              </p>
            </div>
          </div>
        )}

        {/* Admin Control Center Banner */}
        {isAdmin && onOpenAdminPanel && (
          <div className="mt-5 p-4 rounded-2xl bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between gap-3 shadow-md border border-purple-600/40">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-purple-300" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-xs sm:text-sm text-white truncate">
                    {lang === 'my' ? 'Admin Control Center' : 'Admin Control Center'}
                  </h4>
                  <span className="px-2 py-0.2 rounded-full text-[9px] font-bold bg-purple-500/30 text-purple-200 border border-purple-400/30">
                    Dashboard
                  </span>
                </div>
                <p className="text-[11px] text-purple-200/80 truncate">
                  {lang === 'my'
                    ? 'Quota Dashboard၊ Activation Codes နှင့် စနစ် စီမံခန့်ခွဲမှု'
                    : 'Quota metrics, activation codes & broadcast'}
                </p>
              </div>
            </div>

            <button
              type="button"
              id="btn-account-admin-panel"
              onClick={() => {
                onClose();
                onOpenAdminPanel();
              }}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-bold text-xs transition-all cursor-pointer shrink-0 shadow-xs flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{lang === 'my' ? 'ဖွင့်မည်' : 'Open'}</span>
            </button>
          </div>
        )}

        {/* PWA Install Option */}
        <div className="mt-5 p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 flex items-center justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
              <Smartphone className="w-4 h-4 text-emerald-600" />
              <span>
                {lang === 'my'
                  ? 'ဖုန်း/ကွန်ပျူတာထဲတွင် App အဖြစ် ထည့်သွင်းမည်'
                  : 'Install App on Phone / PC'}
              </span>
            </div>
            <div className="text-[11px] text-emerald-800/80">
              {lang === 'my'
                ? 'Play Store မလိုဘဲ Native App ကဲ့သို့ ဖွင့်လှစ်အသုံးပြုနိုင်ပါသည်'
                : 'Install as standalone PWA app for 1-tap fast access'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
              window.dispatchEvent(new CustomEvent('open-pwa-install'));
            }}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0 flex items-center gap-1.5 active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{lang === 'my' ? 'App သွင်းမည်' : 'Install'}</span>
          </button>
        </div>

        {/* User Guide Banner */}
        {onOpenUserGuide && (
          <div className="mt-5 p-4 rounded-2xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm border border-emerald-700/50">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-xs sm:text-sm text-white">
                  {lang === 'my'
                    ? 'အသုံးပြုပုံ လမ်းညွှန်နှင့် Features များ'
                    : 'User Guide & App Features'}
                </h4>
                <p className="text-[11px] text-slate-300">
                  {lang === 'my'
                    ? 'အက်ပလီကေးရှင်း၏ လုပ်ဆောင်ချက်များအား အသေးစိတ် လေ့လာရန်'
                    : 'Learn how to use cash flow, debt, budgets & multi-wallets'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenUserGuide();
              }}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition-all cursor-pointer shrink-0 text-center shadow-xs active:scale-95"
            >
              {lang === 'my' ? 'လမ်းညွှန် ကြည့်မည်' : 'View Guide'}
            </button>
          </div>
        )}

        {/* Privacy Policy Banner */}
        {onOpenPrivacy && (
          <div className="mt-5 p-4 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-xs sm:text-sm text-white">
                  {lang === 'my'
                    ? 'ဒေတာ လုံခြုံရေးနှင့် သီးသန့်မူဝါဒများ'
                    : 'Data Privacy Policy & Disclaimer'}
                </h4>
                <p className="text-[11px] text-slate-300">
                  {lang === 'my'
                    ? 'Google Cloud လုံခြုံရေးနှင့် ဒေတာ အာမခံချက်များကို ဖတ်ရှုရန်'
                    : 'View privacy rights, encryption guarantees, and disclaimers'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenPrivacy();
              }}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all cursor-pointer shrink-0 text-center border border-white/20 active:scale-95"
            >
              {lang === 'my' ? 'ဖတ်ရှုမည်' : 'View Policy'}
            </button>
          </div>
        )}

        {/* Version Info */}
        {onOpenVersionHistory && (
          <div className="mt-5 p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50 to-slate-50 border border-purple-200/80 flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <History className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900 truncate">
                    {lang === 'my' ? 'ဗားရှင်းမှတ်တမ်းနှင့် ပြင်ဆင်မှုများ' : 'Version History & Changelog'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-600 text-white shadow-2xs shrink-0">
                    {CURRENT_APP_VERSION}
                  </span>
                </div>
                <div className="text-xs text-slate-500 truncate">
                  {lang === 'my'
                    ? 'စတင်ချိန်မှစ၍ ပြင်ဆင်ခဲ့သမျှ Version မှတ်တမ်းများ'
                    : 'Track all releases and system updates from day 1'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenVersionHistory();
              }}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-all cursor-pointer shrink-0 shadow-xs active:scale-95 whitespace-nowrap"
            >
              {lang === 'my' ? 'မှတ်တမ်းကြည့်မည်' : 'View History'}
            </button>
          </div>
        )}

        {/* Danger Zone */}
        {onClearAllData && (
          <div className="mt-6 pt-5 border-t border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <Trash2 className="w-4 h-4 text-rose-600" />
              <h3 className="text-xs font-bold text-rose-600 uppercase tracking-wider">
                {lang === 'my' ? 'ဒေတာ စီမံခန့်ခွဲမှု (Danger Zone)' : 'Data Management (Danger Zone)'}
              </h3>
            </div>
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    <span>{lang === 'my' ? 'ဒေတာအားလုံး ဖျက်မည်' : 'Clear All Data'}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-200/80 text-rose-800 shrink-0">
                      Reset
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1 leading-relaxed max-w-xs">
                    {lang === 'my'
                      ? 'စာရင်းများ၊ အကြွေးစာရင်းများနှင့် စိတ်ကြိုက်ကဏ္ဍများကို ဖျက်မည်။ (Cash ပိုက်ဆံအိတ်တစ်ခုသာ ကျန်ရှိမည်)'
                      : 'Reset all transactions, debts, and custom categories. (Keeps Cash wallet only)'}
                  </div>
                </div>
                <button
                  type="button"
                  id="btn-account-clear-all-data"
                  onClick={() => {
                    onClearAllData();
                    onClose();
                  }}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{lang === 'my' ? 'ဒေတာဖျက်မည်' : 'Clear Data'}</span>
                </button>
              </div>
            </div>

            {/* [v7.5.56] Delete account (signed-in users only; guests have
                no account to delete). Confirm step first; password users
                then type their password inline; Google users are
                re-authed with a popup. Success is shown only when
                deleteAccount() returns success. */}
            {!isGuest && user && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 mt-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                      <span>{lang === 'my' ? 'အကောင့် ဖျက်မည်' : 'Delete Account'}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-200/80 text-rose-800 shrink-0">
                        {lang === 'my' ? 'အပြီးတိုင်' : 'Permanent'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 mt-1 leading-relaxed max-w-xs">
                      {lang === 'my'
                        ? 'အကောင့်နှင့် ဒေတာအားလုံး (စာရင်း၊ အကြွေး၊ ပိုက်ဆံအိတ်၊ Cloud ဒေတာ) အပြီးတိုင် ပျောက်ကွယ်သွားမည်။ မျှဝေထားသော Wallet ပိုင်ဆိုင်နေသေးပါက အရင် ပိုင်ဆိုင်မှု လွှဲပြောင်းပေးရပါမည်။'
                        : 'Permanently removes your account and all data (transactions, debts, wallets, Cloud data). If you still own shared wallets, transfer their ownership first.'}
                    </div>
                  </div>
                  <button
                    type="button"
                    id="btn-account-delete-account"
                    onClick={handleDeleteAccountClick}
                    disabled={deletingAccount}
                    className="px-4 py-2.5 bg-rose-700 hover:bg-rose-800 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all shrink-0 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{deletingAccount ? (lang === 'my' ? 'ဖျက်နေသည်...' : 'Deleting...') : (lang === 'my' ? 'အကောင့်ဖျက်မည်' : 'Delete Account')}</span>
                  </button>
                </div>
                {showDeletePassword && (
                  <div className="mt-3 pt-3 border-t border-rose-200 space-y-2">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      {lang === 'my' ? 'အတည်ပြုရန် သင့်စကားဝှက် ရိုက်ထည့်ပါ' : 'Enter your password to confirm'}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && deletePassword) void handleDeleteAccount(deletePassword);
                        }}
                        placeholder={lang === 'my' ? 'စကားဝှက်' : 'Password'}
                        autoComplete="current-password"
                        className="flex-1 min-w-0 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-rose-500 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => void handleDeleteAccount(deletePassword)}
                        disabled={!deletePassword || deletingAccount}
                        className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-lg disabled:opacity-50 cursor-pointer shrink-0"
                      >
                        {lang === 'my' ? 'အတည်ပြုပြီး ဖျက်မည်' : 'Confirm Delete'}
                      </button>
                    </div>
                  </div>
                )}
                {deleteMsg.text && (
                  <div className={`mt-3 text-xs p-2 rounded-lg break-words ${deleteMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-100 text-rose-800'}`}>
                    {deleteMsg.text}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* [v7.5.55 E11] PIN setup (two-step + weak-PIN rejection). */}
      <PinSetupModal
        isOpen={isPinSetupOpen}
        onClose={() => setIsPinSetupOpen(false)}
        lang={lang}
        isGuest={isGuest}
        onLinkAccount={
          onOpenLoginScreen
            ? () => {
                setIsPinSetupOpen(false);
                onClose();
                onOpenLoginScreen();
              }
            : undefined
        }
        onSavePin={(pinHash, pinSalt) => {
          onUpdatePinSettings?.(
            pinSettings?.isEnabled
              ? { ...pinSettings, pin: pinHash, pinSalt }
              : { isEnabled: true, pin: pinHash, pinSalt, requireOnStart: true }
          );
        }}
      />

      {/* [v7.5.55 E11] Verify the CURRENT PIN before change/disable. */}
      {pinVerifyFor && pinSettings?.pin && (
        <PinLockScreen
          pinHash={pinSettings.pin}
          pinSalt={pinSettings.pinSalt || ''}
          lang={lang}
          onUnlock={handleCurrentPinVerified}
          onForgotPin={() => {
            setPinVerifyFor(null);
            setPinError(
              lang === 'my'
                ? 'PIN မေ့နေပါက အက်ပ်ကို လော့ခ်ချပြီး Forgot PIN မှ ပြန်ဝင်ပါ'
                : 'If you forgot the PIN, lock the app and use Forgot PIN from the lock screen.'
            );
          }}
        />
      )}
    </div>
  );
};