import React, { useState, useEffect } from 'react';
import { safeGetItem, safeSetItem } from '../utils/storage';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  Download,
  Share2,
  PlusSquare,
  Smartphone,
  Monitor,
  Apple,
  X,
  Sparkles,
  CheckCircle,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface PWAInstallPromptProps {
  lang: 'my' | 'en';
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ lang }) => {
  const { isInstallable, isInstalled, isStandalone, isIOS, isAndroid, isWindows, install } =
    usePWAInstall();

  // State to control auto-popup modal
  const [showAutoModal, setShowAutoModal] = useState<boolean>(false);
  // State to control floating bottom banner
  const [isBannerDismissed, setIsBannerDismissed] = useState<boolean>(false);
  // iOS guide modal state
  const [showIOSModal, setShowIOSModal] = useState<boolean>(false);

  useEffect(() => {
    // If already running as an installed native PWA, do nothing
    if (isInstalled || isStandalone) {
      return;
    }

    // Check if user dismissed today
    const dismissedTime = safeGetItem('ngwe_pwa_install_dismissed_time');
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    if (!dismissedTime || now - Number(dismissedTime) > oneDay) {
      // Show auto modal shortly after loading (1.5s) to allow page to settle
      const timer = setTimeout(() => {
        setShowAutoModal(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isInstalled, isStandalone]);

  useEffect(() => {
    const handleOpenModal = () => {
      setShowAutoModal(true);
    };
    window.addEventListener('open-pwa-install', handleOpenModal);
    return () => window.removeEventListener('open-pwa-install', handleOpenModal);
  }, []);

  const handleDismiss = () => {
    setShowAutoModal(false);
    setIsBannerDismissed(true);
    safeSetItem('ngwe_pwa_install_dismissed_time', Date.now().toString());
  };

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowAutoModal(false);
      setShowIOSModal(true);
      return;
    }

    if (isInstallable) {
      const outcome = await install();
      if (outcome) {
        setShowAutoModal(false);
      }
    } else {
      // Fallback instructions if browser doesn't support beforeinstallprompt
      if (isAndroid) {
        alert(
          lang === 'my'
            ? 'Chrome Browser ၏ အပေါ်ညာဘက် အစက်သုံးစက် (⋮) ကို နှိပ်ပြီး "Install app" သို့မဟုတ် "Add to Home screen" ကို နှိပ်ပါ'
            : 'Tap the three dots (⋮) in Chrome and select "Install app" or "Add to Home screen"'
        );
      } else {
        alert(
          lang === 'my'
            ? 'Browser ၏ Address bar ညာဘက်ရှိ Install သင်္ကေတ (သို့မဟုတ် Browser Menu) မှတစ်ဆင့် ကွန်ပျူတာ/ဖုန်းထဲသို့ Install ပြုလုပ်နိုင်ပါသည်'
            : 'Click the install icon in your browser address bar to install this app'
        );
      }
    }
  };

  // If already installed, hide everything
  if (isInstalled || isStandalone) {
    return null;
  }

  return (
    <>
      {/* 1. AUTO POPUP MODAL (App ကို ဖွင့်ဖွင့်ချင်း ပြသပေးမည့် တိုက်ရိုက် Install Prompt Modal) */}
      {showAutoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative text-slate-800 animate-scaleUp">
            {/* Close button */}
            <button
              type="button"
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* App Icon & Header */}
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-2 shadow-lg shadow-emerald-600/30 flex items-center justify-center shrink-0 border-2 border-emerald-400/40">
                <img
                  src="/icon.svg"
                  alt="App Icon"
                  className="w-full h-full object-contain drop-shadow"
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    PWA Fast App
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    {isIOS ? 'iOS / iPhone' : isAndroid ? 'Android' : 'Windows / PC'}
                  </span>
                </div>
                <h3 className="text-lg font-black text-slate-900 leading-snug mt-1">
                  {lang === 'my' ? 'ဖုန်းထဲသို့ Install ပြုလုပ်မည်လား?' : 'Install Ngwe Sar Yin App?'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {lang === 'my' ? 'ငွေစာရင်း - ဘဏ္ဍာရေး စီမံခန့်ခွဲမှု' : 'Income & Debt Manager'}
                </p>
              </div>
            </div>

            {/* Feature Highlights */}
            <div className="bg-slate-50 rounded-2xl p-3.5 space-y-2.5 mb-5 border border-slate-100 text-xs text-slate-600">
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <Zap className="w-3 h-3" />
                </div>
                <span>
                  {lang === 'my'
                    ? 'Play Store / App Store ဒေါင်းလုဒ်စရာမလိုဘဲ တန်း install နိုင်ခြင်း'
                    : 'Instant install without waiting for app store downloads'}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <Smartphone className="w-3 h-3" />
                </div>
                <span>
                  {lang === 'my'
                    ? 'ဖုန်း Home Screen ပေါ်တွင် Native App ကဲ့သို့ မျက်နှာပြင်အပြည့် အသုံးပြုနိုင်ခြင်း'
                    : 'Runs in standalone fullscreen mode right from home screen'}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-3 h-3" />
                </div>
                <span>
                  {lang === 'my'
                    ? 'ပေါ့ပါးမြန်ဆန်ပြီး Offline (အင်တာနက်ပြတ်တောက်ချိန်) တွင်လည်း ဖွင့်နိုင်ခြင်း'
                    : 'Lightweight & instant loading with offline caching'}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleInstallClick}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>
                  {isIOS
                    ? lang === 'my'
                      ? '📲 iPhone/iPad တွင် သွင်းနည်းကြည့်မည်'
                      : 'Install on iPhone / iPad'
                    : lang === 'my'
                    ? '📲 ဖုန်းထဲသို့ အခုပဲ Install ပြုလုပ်မည်'
                    : 'Install App Now'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                {lang === 'my' ? 'နောက်မှ လုပ်မည် (Browser ဖြင့်သာ ဆက်သုံးမည်)' : 'Maybe Later'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. FLOATING BOTTOM BAR (If auto modal was closed, persistent easy access banner) */}
      {!showAutoModal && !isBannerDismissed && (
        <div className="fixed bottom-20 sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-40 animate-slideUp">
          <div className="bg-slate-900 text-white p-3.5 sm:p-4 rounded-2xl shadow-xl border border-slate-700 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 p-1.5 flex items-center justify-center shrink-0">
                <img src="/icon.svg" alt="App" className="w-full h-full object-contain" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-bold truncate">
                  {lang === 'my' ? 'ငွေစာရင်း App ကို Install လုပ်မည်' : 'Install Ngwe Sar Yin App'}
                </h4>
                <p className="text-[11px] text-slate-300 truncate">
                  {lang === 'my'
                    ? 'ဖုန်း Home Screen ပေါ်တွင် အမြန်ဖွင့်နိုင်ရန် ထည့်သွင်းပါ'
                    : 'Add to home screen for 1-tap fast access'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleInstallClick}
                className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{lang === 'my' ? 'Install' : 'Install'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsBannerDismissed(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. iOS SPECIFIC INSTALL GUIDE MODAL (Apple Safari Add to Home Screen instructions) */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative text-slate-800">
            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                <Apple className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {lang === 'my' ? 'iPhone / iPad တွင် ထည့်သွင်းနည်း' : 'Install on iPhone / iPad'}
                </h3>
                <p className="text-xs text-slate-500">
                  {lang === 'my' ? 'Safari Browser ဖြင့် အောက်ပါ အဆင့် ၃ ဆင့် လုပ်ဆောင်ပါ' : 'Follow these 3 simple steps in Safari'}
                </p>
              </div>
            </div>

            <div className="space-y-3.5 my-4 text-xs sm:text-sm">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0">
                  1
                </div>
                <div>
                  <span className="font-bold text-slate-800 block">
                    {lang === 'my' ? 'Safari ၏ Share (မျှဝေခြင်း) ခလုတ်ကို နှိပ်ပါ' : 'Tap the Share Button'}
                  </span>
                  <span className="text-slate-500 text-xs">
                    {lang === 'my'
                      ? 'မျက်နှာပြင် အောက်ခြေဘားရှိ မျှဝေသင်္ကေတ (မြှားအပေါ်ထိုးထားသော လေးထောင့်အကွက်) ကို နှိပ်ပါ'
                      : 'Tap the Share icon (square with upward arrow) at bottom of Safari'}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                  2
                </div>
                <div>
                  <span className="font-bold text-slate-800 block">
                    {lang === 'my'
                      ? '"Add to Home Screen" (ပင်မမျက်နှာပြင်သို့ ထည့်မည်) ကို ရွေးပါ'
                      : 'Tap "Add to Home Screen"'}
                  </span>
                  <span className="text-slate-500 text-xs">
                    {lang === 'my'
                      ? 'ရွေးချယ်စရာများထဲတွင် အောက်သို့ဆွဲပြီး ပေါင်းလက္ခဏာ (+) ပါသော စာတန်းကို နှိပ်ပါ'
                      : 'Scroll down the share sheet and tap Add to Home Screen with the (+) icon'}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-7 h-7 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold shrink-0">
                  3
                </div>
                <div>
                  <span className="font-bold text-slate-800 block">
                    {lang === 'my' ? 'ညာဘက်အပေါ်ရှိ "Add" ကို နှိပ်ပါ' : 'Tap "Add" on Top-Right'}
                  </span>
                  <span className="text-slate-500 text-xs">
                    {lang === 'my'
                      ? 'သင့်ဖုန်း Screen ပေါ်တွင် အခြား App များကဲ့သို့ တန်းရောက်သွားပါမည်!'
                      : 'The app icon will now appear on your iPhone home screen!'}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {lang === 'my' ? 'နားလည်ပါပြီ' : 'Got it'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
