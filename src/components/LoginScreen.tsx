import React, { useState } from 'react';
import { ShieldCheck, AlertCircle, Loader2, X, ArrowRight, ExternalLink, Mail, Lock, User as UserIcon, Eye, EyeOff, CheckCircle2, Copy, Check, Globe, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { FortuneLogo, LogoStyle } from './FortuneLogo';

import { getAuthErrorDetails } from '../utils/authErrorMapper';

interface LoginScreenProps {
  lang: 'my' | 'en';
  onToggleLang?: () => void;
  allowClose?: boolean;
  onClose?: () => void;
  logoStyle?: LogoStyle;
  onOpenPrivacy?: () => void;
  onOpenUserGuide?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  lang,
  onToggleLang,
  allowClose = false,
  onClose,
  logoStyle = 'pixiu',
  onOpenPrivacy,
  onOpenUserGuide,
}) => {
  const {
    loginWithGoogle,
    loginWithEmail,
    signupWithEmail,
    continueAsGuest,
    isSyncing,
  } = useAuth();

  const [authMode, setAuthMode] = useState<'google' | 'email'>('email');
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showNewTabOption, setShowNewTabOption] = useState(false);
  const [showVpnTip, setShowVpnTip] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  const appUrl =
    typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost')
      ? window.location.origin
      : 'https://ais-pre-addetoba2glfudzzqh24cb-568885421431.us-east1.run.app';

  // Friendly error formatter
  const formatAuthError = (err: any): string => {
    const details = getAuthErrorDetails(err, lang);
    if (details.isVpnRelated) setShowVpnTip(true);
    if (details.isIframeRelated || details.isVpnRelated) setShowNewTabOption(true);
    return `${details.title}: ${details.message}`;
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setShowNewTabOption(false);
    setSubmitting(true);
    try {
      await loginWithGoogle();
      if (onClose) onClose();
    } catch (err: any) {
      setErrorMsg(formatAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg(lang === 'my' ? 'အီးမေးလ်နှင့် စကားဝှက် ဖြည့်စွက်ပေးပါ' : 'Please enter email and password');
      return;
    }
    setErrorMsg(null);
    setSubmitting(true);
    try {
      if (isSignUp) {
        await signupWithEmail(email.trim(), password, displayName.trim());
      } else {
        await loginWithEmail(email.trim(), password);
      }
      if (onClose) onClose();
    } catch (err: any) {
      setErrorMsg(formatAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const openInNewTab = () => {
    window.open(window.location.href, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between selection:bg-emerald-500 selection:text-white relative px-4 py-6 sm:py-10">
      {/* Top Bar with Language switcher & optional close */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <FortuneLogo size="sm" style={logoStyle} />
          <span className="font-bold text-base text-slate-900">
            {lang === 'my' ? 'ငွေစာရင်း' : 'NgweSarYin'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onToggleLang && (
            <button
              type="button"
              onClick={onToggleLang}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg text-slate-700 hover:bg-slate-100 bg-white border border-slate-200 transition-colors cursor-pointer active:scale-95 shadow-2xs"
            >
              {lang === 'my' ? 'ENG' : 'မြန်မာ'}
            </button>
          )}
          {allowClose && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Authentication Card */}
      <div className="max-w-md w-full mx-auto my-auto py-6">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
          {/* Logo & Headline */}
          <div className="text-center mb-5">
            <div className="inline-flex p-3 rounded-2xl bg-emerald-50 text-emerald-700 mb-3 border border-emerald-100">
              <FortuneLogo size="md" style={logoStyle} />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {lang === 'my' ? 'ငွေစာရင်းသို့ ဝင်ရောက်ပါ' : 'Welcome to NgweSarYin'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 font-normal leading-relaxed">
              {lang === 'my'
                ? 'ဝင်ငွေ၊ ထွက်ငွေနှင့် အကြွေးစာရင်းများကို စိတ်ချလုံခြုံစွာ စီမံခန့်ခွဲပါ'
                : 'Manage your income, expenses, and debts securely'}
            </p>
          </div>

          {/* Official Web App URL info box */}
          <div className="mb-5 p-3 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-1.5 text-slate-700">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-800">
              <span className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-600" />
                <span>{lang === 'my' ? 'အက်ပ်၏ လိပ်စာအမှန် (Official Link):' : 'Official App URL:'}</span>
              </span>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(appUrl);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  } catch {}
                }}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>{lang === 'my' ? 'ကူးပြီး' : 'Copied'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>{lang === 'my' ? 'လင့်ခ် ကူးမည်' : 'Copy'}</span>
                  </>
                )}
              </button>
            </div>
            <div className="text-[10px] font-mono text-slate-500 truncate bg-white px-2 py-1 rounded-lg border border-slate-200 select-all">
              {appUrl}
            </div>
            <p className="text-[10px] text-amber-800 flex items-start gap-1 font-medium leading-tight">
              <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
              <span>
                {lang === 'my'
                  ? 'သတိပြုရန်: ngwesaryin.ai.studio ဟု ရိုက်ထည့်ပါက Website ရှာမတွေ့နိုင်ပါ။ အထက်ပါ လင့်ခ်အပြည့်အစုံကိုသာ အသုံးပြုပါ'
                  : 'Note: Do not type ngwesaryin.ai.studio. Please use the official link above.'}
              </span>
            </p>
          </div>

          {/* Prominent Email Registration / Login Card */}
          <div className="mb-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-emerald-600" />
                  <span>
                    {isSignUp
                      ? (lang === 'my' ? 'Email ဖြင့် အကောင့်သစ်ဖွင့်မည်' : 'Create Account with Email')
                      : (lang === 'my' ? 'Email ဖြင့် အကောင့်ဝင်မည်' : 'Sign In with Email')}
                  </span>
                </h2>
                <p className="text-[11px] text-emerald-700 font-medium">
                  {lang === 'my' ? '⚡ VPN မလိုဘဲ တိုက်ရိုက် အသုံးပြုနိုင်ပါသည်' : '⚡ No VPN needed - Instant access'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setErrorMsg(null);
                }}
                className="px-2.5 py-1 text-xs font-bold rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer border border-emerald-200"
              >
                {isSignUp
                  ? (lang === 'my' ? 'Sign In သို့' : 'Switch to Sign In')
                  : (lang === 'my' ? 'အကောင့်သစ်ဖွင့်ရန်' : 'Switch to Sign Up')}
              </button>
            </div>

            {/* Error Banner */}
            {errorMsg && (
              <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium leading-relaxed">{errorMsg}</div>
                </div>
                {(showNewTabOption || isInIframe) && (
                  <button
                    type="button"
                    onClick={openInNewTab}
                    className="mt-2.5 w-full py-2 px-3 bg-white border border-rose-200 hover:border-rose-300 text-rose-900 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-rose-600" />
                    <span>
                      {lang === 'my'
                        ? '🚀 Tab အသစ်တွင် သီးသန့်ဖွင့်၍ Google ဝင်ရောက်မည်'
                        : 'Open App in New Tab for Google Sign In'}
                    </span>
                  </button>
                )}
              </div>
            )}

            {/* Email Form */}
            <form onSubmit={handleEmailAuth} className="space-y-3.5">
              {isSignUp && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'my' ? 'သင့်အမည် (Full Name)' : 'Full Name'}
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder={lang === 'my' ? 'ဥပမာ - မောင်မောင်' : 'e.g. John Doe'}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {lang === 'my' ? 'အီးမေးလ်လိပ်စာ (Gmail / Email)' : 'Email Address'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="yourname@gmail.com"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {lang === 'my' ? 'စကားဝှက် (Password - အနည်းဆုံး ၆ လုံး)' : 'Password (min. 6 characters)'}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm transition-all cursor-pointer active:scale-98 shadow-md hover:shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-white" />
                )}
                <span>
                  {isSignUp
                    ? lang === 'my'
                      ? 'အကောင့်သစ် စတင်ဖွင့်မည်'
                      : 'Create Account Now'
                    : lang === 'my'
                    ? 'အီးမေးလ်ဖြင့် တန်းဝင်မည်'
                    : 'Sign In Now'}
                </span>
              </button>
            </form>
          </div>

          {/* Secondary Alternative: Google Account (Moved below) */}
          <div className="pt-2 border-t border-slate-100">
            <div className="text-center mb-2">
              <span className="text-[11px] text-slate-400 font-medium">
                {lang === 'my' ? 'သို့မဟုတ် Google အကောင့်ဖြင့် ဝင်လိုပါက' : 'Or continue with Google'}
              </span>
            </div>

            <button
              type="button"
              id="btn-google-login"
              onClick={handleGoogleSignIn}
              disabled={submitting || isSyncing}
              className="w-full py-2.5 px-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-white text-slate-700 font-semibold text-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-98 disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
              ) : (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>
                {lang === 'my'
                  ? 'Now VPN နှင့် အဆင်ပြေဆုံး ဖြစ်သည် - Google Pop-up ဖြင့် ဝင်မည်'
                  : 'Now VPN Recommended - Sign in with Google Account'}
              </span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-slate-400 font-medium">
                {lang === 'my' ? 'သို့မဟုတ်' : 'or'}
              </span>
            </div>
          </div>

          {/* Guest Mode Option */}
          <div className="text-center">
            <button
              type="button"
              id="btn-guest-login"
              onClick={continueAsGuest}
              className="w-full py-3 px-4 rounded-2xl border border-slate-200 bg-slate-50/80 hover:bg-slate-100 text-slate-700 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
            >
              <span>
                {lang === 'my'
                  ? 'အကောင့်မဖွင့်ဘဲ ဧည့်သည်အဖြစ် စမ်းသုံးမည်'
                  : 'Continue as Guest (Offline Mode)'}
              </span>
              <ArrowRight className="w-4 h-4 text-slate-500" />
            </button>
            <p className="text-[11px] text-slate-400 mt-2 font-normal">
              {lang === 'my'
                ? 'ဒေတာများကို သင့်စက်ထဲ၌သာ သိမ်းဆည်းထားမည်ဖြစ်ပြီး အချိန်မရွေး Google အကောင့် ချိတ်ဆက်နိုင်ပါသည်'
                : 'Data is saved on this device. You can connect your Google account anytime.'}
            </p>
          </div>
        </div>
      </div>

      {/* Footer reassurance */}
      <div className="max-w-md w-full mx-auto text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 font-normal">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>
            {lang === 'my'
              ? 'Google Cloud & Firebase နည်းပညာဖြင့် လုံခြုံစွာ ကာကွယ်ထားပါသည်'
              : 'Encrypted and secured with Google Cloud Firebase'}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px]">
          {onOpenUserGuide && (
            <button
              type="button"
              onClick={onOpenUserGuide}
              className="font-bold text-emerald-700 hover:text-emerald-900 underline underline-offset-2 transition-colors cursor-pointer"
            >
              {lang === 'my' ? '📖 အသုံးပြုပုံ လမ်းညွှန်' : '📖 User Guide'}
            </button>
          )}

          {onOpenPrivacy && (
            <button
              type="button"
              onClick={onOpenPrivacy}
              className="font-semibold text-slate-500 hover:text-emerald-700 underline decoration-slate-300 underline-offset-2 transition-colors cursor-pointer"
            >
              {lang === 'my'
                ? 'ဒေတာ လုံခြုံရေးနှင့် သီးသန့်မူဝါဒ'
                : 'Privacy Policy & Disclaimer'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
