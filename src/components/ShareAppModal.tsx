import React, { useState } from 'react';
import { X, Copy, Check, Share2, Globe, AlertTriangle, ShieldAlert, Smartphone } from 'lucide-react';
import { LogoStyle } from './FortuneLogo';

interface ShareAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'my' | 'en';
  logoStyle?: LogoStyle;
}

export const ShareAppModal: React.FC<ShareAppModalProps> = ({
  isOpen,
  onClose,
  lang,
  logoStyle = 'pixiu',
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  if (!isOpen) return null;

  const appUrl =
    typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost')
      ? window.location.origin
      : 'https://ais-pre-addetoba2glfudzzqh24cb-568885421431.us-east1.run.app';

  const fullShareText =
    lang === 'my'
      ? `ငွေစာရင်း (NgweSarYin) - ဝင်ငွေ၊ ထွက်ငွေနှင့် အကြွေး စီမံခန့်ခွဲမှု အက်ပ်\n\nအသုံးပြုရန် လင့်ခ်အမှန်: ${appUrl}\n\n(သတိပြုရန်: Browser တွင် ngwesaryin.ai.studio ဟု ရိုက်ထည့်ပါက ဖွင့်မရနိုင်ပါ။ အထက်ပါ လင့်ခ်ကိုသာ နှိပ်၍ အသုံးပြုပါ)\n\nGoogle Sign-In တွင် Connection Refused ဖြစ်ပါက 1.1.1.1 WARP / VPN ဖွင့်ရန် သို့မဟုတ် Email/Password ဖြင့် အကောင့်ဖွင့် ဝင်ရောက်ပါရန်။`
      : `NgweSarYin - Financial Management Web App\n\nOfficial Link: ${appUrl}\n\nNote: Do not type ngwesaryin.ai.studio. Always use the official link above.\nIf Google sign-in shows connection refused, use 1.1.1.1 WARP/VPN or sign in with Email/Password.`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleCopyFullText = async () => {
    try {
      await navigator.clipboard.writeText(fullShareText);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200/80 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                {lang === 'my' ? 'အက်ပ်လင့်ခ်နှင့် မျှဝေရန် လမ်းညွှန်' : 'App Link & Sharing Guide'}
              </h2>
              <p className="text-xs text-slate-500">
                {lang === 'my' ? 'အခြားသူများထံ လင့်ခ်ပို့ခြင်းနှင့် Error ဖြေရှင်းနည်း' : 'Official URL & Connection Troubleshooting'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-xs sm:text-sm">
          {/* Official URL Banner */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-emerald-950 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-emerald-700" />
                <span>{lang === 'my' ? 'အက်ပ်၏ တရားဝင် လင့်ခ်အမှန် (Official Web App URL)' : 'Official Web App Link'}</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-900">
                Active
              </span>
            </div>

            <div className="flex items-center gap-2 p-2 sm:p-2.5 rounded-xl bg-white border border-emerald-300 shadow-2xs">
              <input
                type="text"
                readOnly
                value={appUrl}
                className="w-full text-xs font-mono text-slate-800 bg-transparent border-none outline-none select-all"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 cursor-pointer shadow-2xs"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>{lang === 'my' ? 'ကူးပြီး' : 'Copied'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{lang === 'my' ? 'Link ကူးမည်' : 'Copy'}</span>
                  </>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopyFullText}
              className="w-full py-2 px-3 rounded-xl bg-emerald-100/70 hover:bg-emerald-200/80 text-emerald-900 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedText ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{lang === 'my' ? 'ဖိတ်ခေါ်စာ အပြည့်အစုံ ကူးယူပြီးပါပြီ' : 'Full invite message copied'}</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{lang === 'my' ? 'ဖိတ်ခေါ်စာနှင့် လင့်ခ်အပြည့်အစုံ ကူးယူမည်' : 'Copy Full Invite Message & Link'}</span>
                </>
              )}
            </button>
          </div>

          {/* Warning: DNS NXDOMAIN Error Fix (Image 2) */}
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 space-y-1.5 text-rose-950">
            <div className="flex items-center gap-2 font-bold text-xs text-rose-900">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                {lang === 'my'
                  ? 'အရေးကြီး သတိပေးချက် (ngwesaryin.ai.studio အကြောင်း)'
                  : 'Important Note about ngwesaryin.ai.studio'}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-rose-900 font-medium">
              {lang === 'my' ? (
                <>
                  Browser ၏ Address Bar တွင် <strong className="underline decoration-rose-400">ngwesaryin.ai.studio</strong> ဟု ရိုက်ထည့်ပါက Google AI Studio တွင် ထိုသို့ ဒိုမိန်းအမည် မရှိသဖြင့် <strong>"This site can't be reached (DNS NXDOMAIN)"</strong> အမှားပြသမည် ဖြစ်ပါသည်။ အထက်ပါ <strong className="text-rose-950">တရားဝင် လင့်ခ်အပြည့်အစုံ</strong> ကိုသာ Browser တွင် ထည့်သွင်း အသုံးပြုပေးပါခင်ဗျာ။
                </>
              ) : (
                <>
                  Typing <strong className="underline">ngwesaryin.ai.studio</strong> directly in your browser causes <strong>"This site can't be reached (DNS NXDOMAIN)"</strong> because that custom domain does not exist. Always use the full official URL provided above.
                </>
              )}
            </p>
          </div>

          {/* Warning: Google Popup ERR_CONNECTION_REFUSED Fix (Image 1) */}
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 space-y-2 text-amber-950">
            <div className="flex items-center gap-2 font-bold text-xs text-amber-900">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                {lang === 'my'
                  ? 'Google Sign-In တွင် "refused to connect" ဖြစ်ရခြင်း ဖြေရှင်းနည်း'
                  : 'Fixing Google Sign-In "ERR_CONNECTION_REFUSED"'}
              </span>
            </div>
            <div className="text-[11px] leading-relaxed text-amber-900 space-y-1.5 font-normal">
              <p>
                {lang === 'my' ? (
                  <>
                    <strong>အကြောင်းအရင်း:</strong> မြန်မာနိုင်ငံရှိ အင်တာနက်လိုင်းများ (MPT, Atom, Ooredoo, WiFi Fiber စသည်) တွင် Google Firebase Auth Popup ဒိုမိန်း (<code className="px-1 py-0.5 rounded bg-amber-100 text-amber-900 font-mono text-[10px]">micro-atom-nds98.firebaseapp.com</code>) အား ISP များမှ ပိတ်ဆို့ (Block) ထားတတ်သောကြောင့် ဖြစ်ပါသည်။
                  </>
                ) : (
                  <>
                    <strong>Cause:</strong> In Myanmar, telecom ISPs often block Firebase Auth popup domains (<code className="px-1 py-0.5 rounded bg-amber-100 font-mono text-[10px]">firebaseapp.com</code>) causing ERR_CONNECTION_REFUSED.
                  </>
                )}
              </p>
              <div className="p-2 rounded-xl bg-white border border-amber-200 space-y-1 font-semibold text-amber-950">
                <div className="flex items-start gap-1.5">
                  <span className="text-emerald-600">✓</span>
                  <span>
                    {lang === 'my'
                      ? 'နည်းလမ်း ၁: Cloudflare 1.1.1.1 WARP သို့မဟုတ် VPN ဖွင့်၍ Google ဖြင့် ဝင်ရောက်ပါ။'
                      : 'Method 1: Turn on Cloudflare 1.1.1.1 WARP or VPN, then sign in with Google.'}
                  </span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-emerald-600">✓</span>
                  <span>
                    {lang === 'my'
                      ? 'နည်းလမ်း ၂ (VPN မလို အဆင်ပြေဆုံး): "Email & Password" ဖြင့် တိုက်ရိုက် အကောင့်ဖွင့် ဝင်ရောက်ပါ။'
                      : 'Method 2 (Recommended without VPN): Sign in directly with Email & Password.'}
                  </span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-emerald-600">✓</span>
                  <span>
                    {lang === 'my'
                      ? 'နည်းလမ်း ၃: အကောင့်မဝင်ဘဲ မိမိစက်ထဲတွင်သာ စာရင်းသုံးရန် "ဧည့်သည်စနစ် (Guest Mode)" ဖြင့် သုံးစွဲပါ။'
                      : 'Method 3: Use "Guest Mode (Offline)" to store records locally on this device.'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick How to Install on Phone / Desktop */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
              <Smartphone className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                {lang === 'my'
                  ? 'ဖုန်းနှင့် ကွန်ပျူတာပေါ်တွင် App အဖြစ် အမြဲတမ်း သိမ်းဆည်းနည်း'
                  : 'Install as App on Mobile or Desktop'}
              </span>
            </div>
            <div className="text-[11px] leading-relaxed text-slate-600 space-y-1">
              <p>
                {lang === 'my'
                  ? '• Chrome / Edge: ညာဘက်အပေါ် ထောင့်မှ အစက် (၃) စက် (⋮) ကို နှိပ်၍ "Install App (အက်ပ်သွင်းမည်)" သို့မဟုတ် "Add to Home screen" ကို နှိပ်ပါ။'
                  : '• Chrome / Edge: Click the 3 dots menu (⋮) and select "Install App" or "Add to Home screen".'}
              </p>
              <p>
                {lang === 'my'
                  ? '• iPhone Safari: အောက်ခြေရှိ မျှဝေခြင်း (Share) ခလုတ်ကို နှိပ်ပြီး "Add to Home Screen" ကို ရွေးချယ်ပါ။'
                  : '• iPhone Safari: Tap the Share button at the bottom and select "Add to Home Screen".'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer shadow-2xs active:scale-95"
          >
            {lang === 'my' ? 'နားလည်ပါပြီ' : 'Got it'}
          </button>
        </div>
      </div>
    </div>
  );
};
