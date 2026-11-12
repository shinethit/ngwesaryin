import React, { useState, useRef, useEffect } from 'react';
import { LayoutDashboard, Wallet, Tags, ArrowLeftRight, HandCoins, Crown, X, Search, Cloud, RefreshCw, WifiOff, User as UserIcon, Download, ShieldCheck, ChevronRight, Sliders, LogIn, Lock, BookOpen, Share2, Car, History, Database, Store } from 'lucide-react';
import { PlanType } from '../types';
import { useAuth } from '../context/AuthContext';
import { FortuneLogo, LogoStyle } from './FortuneLogo';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { CURRENT_APP_VERSION } from '../data/versionHistory';
// [v7.5.78 C] Live "fill in shop details later" reminders — the Shops
// menu item shows how many shops still need their details filled.
import { useShopDetailReminders } from '../utils/shopDetailsReminders';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentPlan: PlanType;
  lang: 'my' | 'en';
  onToggleLang: () => void;
  onOpenAccountModal: () => void;
  onOpenSearch: () => void;
  onOpenLogin: () => void;
  onOpenAdminPanel?: () => void;
  onLockApp: () => void;
  transactionsCount: number;
  debtsCount: number;
  walletsCount: number;
  vehiclesCount?: number;
  logoStyle?: LogoStyle;
  onSelectLogoStyle?: (style: LogoStyle) => void;
  onOpenPrivacy?: () => void;
  onOpenUserGuide?: () => void;
  onOpenShareApp?: () => void;
  onOpenVersionHistory?: () => void;
  onManualSync?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  currentPlan,
  lang,
  onToggleLang,
  onOpenAccountModal,
  onOpenSearch,
  onOpenLogin,
  onOpenAdminPanel,
  onLockApp,
  transactionsCount,
  debtsCount,
  walletsCount,
  vehiclesCount = 0,
  logoStyle = 'pixiu',
  onSelectLogoStyle,
  onOpenPrivacy,
  onOpenUserGuide,
  onOpenShareApp,
  onOpenVersionHistory,
  onManualSync,
}) => {
  const { user, isGuest, isSyncing, isAdmin, logout, activeWorkspaceId } = useAuth();
  const { isInstalled, isStandalone } = usePWAInstall();
  const shopDetailReminders = useShopDetailReminders();
  const [showLogoPicker, setShowLogoPicker] = useState(false);
  const logoPickerRef = useRef<HTMLDivElement>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // [v7.5.60 S13] Logo tap goes home (Dashboard); long-press (600ms)
  // opens the logo picker. Same behaviour as the Navbar logo.
  const longPressTimerRef = useRef<number | null>(null);
  const longPressFiredRef = useRef(false);
  const handleLogoTap = () => {
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false;
      return;
    }
    setShowLogoPicker(false);
    setActiveTab('dashboard');
    onClose();
  };
  const handleLogoPointerDown = () => {
    longPressFiredRef.current = false;
    longPressTimerRef.current = window.setTimeout(() => {
      longPressFiredRef.current = true;
      setShowLogoPicker(true);
    }, 600);
  };
  const cancelLogoLongPress = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (logoPickerRef.current && !logoPickerRef.current.contains(e.target as Node)) {
        setShowLogoPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lock body scroll when Sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Prevent touchmove scroll propagation on mobile body
      const preventDefault = (e: TouchEvent) => {
        // Only prevent if the touch isn't inside the sidebar
        const target = e.target as HTMLElement;
        if (!target.closest('aside')) {
          e.preventDefault();
        }
      };
      document.addEventListener('touchmove', preventDefault, { passive: false });
      return () => {
        document.body.style.overflow = '';
        document.removeEventListener('touchmove', preventDefault);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [isOpen]);

  // [v7.5.55 E25] Escape closes the sidebar drawer.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // [v7.5.75] Sidebar now has 8 items. The v7.5.57 "6 items only"
  // rule is reversed at the user's request: Data and Shop live here
  // now (they were removed from the Dashboard Quick Access grid).
  // Analytics / Plans / Feedback / Education stay on the Dashboard
  // Quick Access grid only — they are not duplicated here.
  const navItems = [
    {
      id: 'dashboard',
      labelMy: '၁ - ခြုံငုံသုံးသပ်ချက်',
      labelEn: '1 - Overview / Dashboard',
      icon: LayoutDashboard,
      badge: undefined,
    },
    {
      id: 'wallets',
      labelMy: '၂ - ပိုက်ဆံအိတ်များ',
      labelEn: '2 - Wallets & Accounts',
      icon: Wallet,
      count: walletsCount,
    },
    {
      id: 'categories',
      labelMy: '၃ - ကဏ္ဍနှင့် ကဏ္ဍခွဲများ',
      labelEn: '3 - Categories & Subcategories',
      icon: Tags,
    },
    {
      id: 'transactions',
      labelMy: '၄ - ဝင်ငွေ/ထွက်ငွေ',
      labelEn: '4 - Transactions History',
      icon: ArrowLeftRight,
      count: transactionsCount,
    },
    {
      id: 'debts',
      labelMy: '၅ - အကြွေးစာရင်း',
      labelEn: '5 - Debt & Loan Tracking',
      icon: HandCoins,
      count: debtsCount,
    },
    {
      id: 'vehicles',
      labelMy: '၆ - ယာဉ်စီမံခန့်ခွဲမှု',
      labelEn: '6 - Vehicle Management',
      icon: Car,
      count: vehiclesCount,
    },
    {
      // [v7.5.75] Appended after the established 1–6 core flow so the
      // existing numbering and order are untouched.
      id: 'data_management',
      labelMy: '၇ - ဒေတာ',
      labelEn: '7 - Data Management',
      icon: Database,
    },
    {
      id: 'shops',
      labelMy: '၈ - ဆိုင်လိပ်စာ',
      labelEn: '8 - Shops & Addresses',
      icon: Store,
    },
  ];

  const handleSelectNav = (id: string) => {
    setActiveTab(id);
    onClose();
  };

  return (
    <>
      {/* Backdrop overlay for mobile */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-fadeIn"
          aria-hidden="true"
        />
      )}

      {/* Slide-out Sidebar Drawer */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-80 max-w-[85vw] bg-white border-r border-slate-200 shadow-2xl flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Header Section */}
        <div className="flex flex-col shrink-0">
          {/* Brand header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-3">
              {/* Fortune Logo with Dropdown */}
              <div className="relative" ref={logoPickerRef}>
                <button
                  type="button"
                  onClick={handleLogoTap}
                  onPointerDown={handleLogoPointerDown}
                  onPointerUp={cancelLogoLongPress}
                  onPointerLeave={cancelLogoLongPress}
                  onContextMenu={(e) => e.preventDefault()}
                  className="group relative flex items-center cursor-pointer transition-transform active:scale-95 focus:outline-none"
                  title={
                    lang === 'my'
                      ? 'ပင်မ စာမျက်နှာ ပြန်ရန် နှိပ်ပါ · Logo ပုံစံပြောင်းရန် ကြာကြာ ဖိပါ'
                      : 'Tap to go home · Long-press to change the logo style'
                  }
                >
                  <FortuneLogo size="md" style={logoStyle} animate />
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-white border border-amber-300 rounded-full flex items-center justify-center text-[9px] text-amber-700 shadow-2xs group-hover:scale-110 transition-transform">
                    ✨
                  </span>
                </button>

                {/* Auspicious Emblem Dropdown Picker */}
                {showLogoPicker && (
                  <div className="absolute left-0 top-12 z-50 w-64 p-2 bg-white rounded-2xl border border-amber-200 shadow-2xl animate-fadeIn">
                    <div className="px-2 py-1.5 border-b border-amber-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span>✨</span>
                        <span>{lang === 'my' ? 'လာဘ်ရွှင်စေသော Logo ရွေးပါ' : 'Select Lucky Logo'}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="text-[10px] text-amber-700 font-semibold px-1.5 py-0.5 bg-amber-50 rounded">
                          Fortune
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowLogoPicker(false)}
                          className="min-w-8 min-h-8 w-8 h-8 rounded-full hover:bg-slate-100 text-slate-500 flex items-center justify-center cursor-pointer"
                          title={lang === 'my' ? 'ပိတ်မည်' : 'Close'}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </span>
                    </div>

                    <div className="space-y-1 mt-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectLogoStyle) onSelectLogoStyle('money_bag');
                          setShowLogoPicker(false);
                        }}
                        className={`w-full p-2 rounded-xl flex items-center gap-2.5 transition-colors text-left cursor-pointer ${
                          logoStyle === 'money_bag'
                            ? 'bg-amber-50/80 border border-amber-300 text-amber-950 font-semibold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <FortuneLogo size="sm" style="money_bag" />
                        <div className="flex-1">
                          <div className="text-xs font-semibold">
                            {lang === 'my' ? '💰 ရွှေငွေထုပ်' : '💰 Fortune Bag'}
                          </div>
                          <div className="text-[10px] text-slate-500 font-normal">
                            {lang === 'my' ? 'စီးပွားတိုးတက် ငွေဝင်ကြမ်းစေခြင်း' : 'Abundant Wealth'}
                          </div>
                        </div>
                        {logoStyle === 'money_bag' && <span className="text-xs text-amber-600 font-bold">✓</span>}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectLogoStyle) onSelectLogoStyle('gold_ingot');
                          setShowLogoPicker(false);
                        }}
                        className={`w-full p-2 rounded-xl flex items-center gap-2.5 transition-colors text-left cursor-pointer ${
                          logoStyle === 'gold_ingot'
                            ? 'bg-amber-50/80 border border-amber-300 text-amber-950 font-semibold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <FortuneLogo size="sm" style="gold_ingot" />
                        <div className="flex-1">
                          <div className="text-xs font-semibold">
                            {lang === 'my' ? '🪙 တရုတ်ရွှေတုံး (Yuanbao)' : '🪙 Gold Ingot (Yuanbao)'}
                          </div>
                          <div className="text-[10px] text-slate-500 font-normal">
                            {lang === 'my' ? 'စည်းစိမ်တိုးပွားခြင်း' : 'Prosperity & Pure Fortune'}
                          </div>
                        </div>
                        {logoStyle === 'gold_ingot' && <span className="text-xs text-amber-600 font-bold">✓</span>}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectLogoStyle) onSelectLogoStyle('pixiu');
                          setShowLogoPicker(false);
                        }}
                        className={`w-full p-2 rounded-xl flex items-center gap-2.5 transition-colors text-left cursor-pointer ${
                          logoStyle === 'pixiu'
                            ? 'bg-amber-50/80 border border-amber-300 text-amber-950 font-semibold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <FortuneLogo size="sm" style="pixiu" />
                        <div className="flex-1">
                          <div className="text-xs font-semibold">
                            {lang === 'my' ? '🦁 ဖီချူး (Pixiu)' : '🦁 Auspicious Pixiu'}
                          </div>
                          <div className="text-[10px] text-slate-500 font-normal">
                            {lang === 'my' ? 'ငွေဝင်မထွက် လာဘ်စုပ်အဆောင်' : 'Attracts & Locks Wealth'}
                          </div>
                        </div>
                        {logoStyle === 'pixiu' && <span className="text-xs text-amber-600 font-bold">✓</span>}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-base text-slate-900">
                    {lang === 'my' ? 'ငွေစာရင်း' : 'NgweSarYin'}
                  </span>
                  {currentPlan === 'premium' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
                      <Crown className="w-2.5 h-2.5 text-amber-600 fill-amber-500" />
                      VIP
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-medium bg-slate-200/80 text-slate-700">
                      Free
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  {lang === 'my' ? 'ဝင်ငွေ/ထွက်ငွေ စီမံခန့်ခွဲမှု' : 'Finance Manager'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-11 h-11 rounded-full bg-slate-200/70 hover:bg-slate-300/80 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              title="Close Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Account & Network Status Card (As requested: moved into Sidebar) */}
          <div className="p-3 mx-3 mt-3 bg-gradient-to-br from-slate-50 to-slate-100/90 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              {/* Online / Offline status */}
              <div className="flex items-center gap-1.5 text-[11px]">
                {isOffline ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-rose-700 bg-rose-50 border border-rose-200">
                    <WifiOff className="w-3 h-3 text-rose-600" />
                    Offline
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online
                  </span>
                )}
              </div>

              {/* PWA Install mini trigger */}
              {!isInstalled && !isStandalone && (
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('open-pwa-install'));
                    onClose();
                  }}
                  className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 hover:text-emerald-800 bg-white border border-emerald-300 px-2 py-0.5 rounded-md shadow-2xs cursor-pointer active:scale-95"
                >
                  <Download className="w-2.5 h-2.5 text-emerald-600" />
                  <span>{lang === 'my' ? 'App သွင်းမည်' : 'Install'}</span>
                </button>
              )}
            </div>

            {/* Account Info */}
            <div className="flex items-center justify-between pt-1">
              <div
                onClick={() => {
                  onOpenAccountModal();
                  onClose();
                }}
                className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0 group"
              >
                {user ? (
                  user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt="avatar"
                      className="w-8 h-8 rounded-full border border-slate-300 object-cover shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-bold shrink-0">
                      {user.displayName ? user.displayName[0].toUpperCase() : 'U'}
                    </div>
                  )
                ) : (
                  <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 truncate group-hover:text-emerald-700 transition-colors">
                    {user ? user.displayName || user.email?.split('@')[0] : lang === 'my' ? 'ဧည့်သည်စနစ်' : 'Guest User'}
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1 truncate">
                    {user ? (
                      <>
                        {isSyncing ? (
                          <RefreshCw className="w-2.5 h-2.5 text-sky-600 animate-spin" />
                        ) : (
                          <Cloud className="w-2.5 h-2.5 text-emerald-600" />
                        )}
                        <span>{isSyncing ? 'Syncing...' : lang === 'my' ? 'Cloud ချိတ်ဆက်ပြီး' : 'Cloud Synced'}</span>
                      </>
                    ) : (
                      <span>{lang === 'my' ? 'စက်တွင်း၌ သိမ်းထားသည်' : 'Local Storage Only'}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    onLockApp();
                    onClose();
                  }}
                  className="min-w-11 min-h-11 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 transition-colors cursor-pointer"
                  title={lang === 'my' ? 'အက်ပ်ကို လော့ခ်ချမည်' : 'Lock App'}
                >
                  <Lock className="w-4 h-4 text-slate-600" />
                </button>

                {user ? (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenAccountModal();
                      onClose();
                    }}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 transition-colors cursor-pointer"
                    title="Account Settings"
                  >
                    <Sliders className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenLogin();
                      onClose();
                    }}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                  >
                    <LogIn className="w-3 h-3" />
                    <span>{lang === 'my' ? 'ဝင်မည်' : 'Sign In'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Prominent 1-Tap Manual Sync Button in Sidebar for Mobile & Desktop */}
            {onManualSync && (
              <button
                type="button"
                onClick={() => {
                  onManualSync();
                  onClose();
                }}
                disabled={isSyncing}
                className="w-full mt-2.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-white ${isSyncing ? 'animate-spin' : ''}`} />
                <span>
                  {isSyncing
                    ? (lang === 'my' ? 'Cloud သို့ ချိတ်ဆက်နေပါသည်...' : 'Syncing with Cloud...')
                    : (lang === 'my' ? '🔄 ကိုယ်တိုင် Cloud Sync ပြုလုပ်မည်' : '🔄 Force Manual Cloud Sync')}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Items (Strictly Ordered 1 to 6) */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-2">
          <div className="px-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {lang === 'my' ? 'စာရင်း စီမံခန့်ခွဲမှု ကဏ္ဍများ' : 'Navigation Menu'}
          </div>

          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                id={`sidebar-tab-${item.id}`}
                onClick={() => handleSelectNav(item.id)}
                // [v7.5.78 E] Button-like menu items: every row is a
                // real button (min 48px tall) with a visible
                // background + border + shadow, so it reads and taps
                // like a button, not a text label. Labels, icons,
                // order and navigation are unchanged.
                className={`w-full flex items-center justify-between px-3.5 py-3 min-h-12 rounded-2xl text-xs sm:text-sm font-semibold transition-all cursor-pointer group border active:scale-[0.98] ${
                  isActive
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                    : 'bg-white text-slate-700 border-slate-200 shadow-sm hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200 group-hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="leading-snug">{lang === 'my' ? item.labelMy : item.labelEn}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {currentPlan === 'guest' && item.id === 'debts' && (
                    <span className="px-1.5 py-0.2 rounded-md text-[9px] font-bold bg-slate-200 text-slate-700 border border-slate-300 flex items-center gap-0.5">
                      <Lock className="w-2.5 h-2.5" />
                      <span>LOCK</span>
                    </span>
                  )}
                  {typeof item.count === 'number' && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                  {/* [v7.5.78 C] Shops needing details: amber count of
                      "fill later" reminders — tapping the row still
                      opens the Shops tab as before. */}
                  {item.id === 'shops' && shopDetailReminders.length > 0 && (
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300"
                      title={
                        lang === 'my'
                          ? `အသေးစိတ် မဖြည့်ရသေးသော ဆိုင် ${shopDetailReminders.length} ဆိုင်`
                          : `${shopDetailReminders.length} shop(s) still need details`
                      }
                    >
                      {shopDetailReminders.length}
                    </span>
                  )}
                  <ChevronRight
                    className={`w-3.5 h-3.5 opacity-40 transition-transform group-hover:translate-x-0.5 ${
                      isActive ? 'text-white opacity-80' : 'text-slate-400'
                    }`}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Bottom Actions & Utilities */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/70 space-y-2 shrink-0">
          {/* Quick Search Bar Trigger */}
          <button
            onClick={() => {
              onOpenSearch();
              onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-slate-600 bg-white hover:bg-slate-100 border border-slate-200/80 shadow-2xs transition-all cursor-pointer active:scale-98"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-500" />
              <span>{lang === 'my' ? 'မှတ်တမ်းများ ရှာဖွေရန်' : 'Search records'}</span>
            </div>
            <kbd className="hidden sm:inline-block px-1.5 py-0.2 text-[9px] font-mono text-slate-500 bg-slate-100 border border-slate-200 rounded">
              ⌘K
            </kbd>
          </button>

          {/* Language Switcher & Admin Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleLang}
              className="flex-1 py-2 px-3 text-xs font-bold rounded-xl text-slate-700 hover:bg-white bg-slate-200/70 border border-slate-300/60 transition-colors text-center cursor-pointer active:scale-95"
            >
              {lang === 'my' ? '🌐 Switch to English' : '🌐 မြန်မာဘာသာသို့ ပြောင်းမည်'}
            </button>

            {isAdmin && onOpenAdminPanel && (
              <button
                type="button"
                id="sidebar-admin-btn"
                onClick={() => {
                  onOpenAdminPanel();
                  onClose();
                }}
                className="flex-1 min-h-11 px-3 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 bg-purple-600 hover:bg-purple-700 text-white border border-purple-700"
                title={lang === 'my' ? 'Admin Control Center (စီမံခန့်ခွဲမှု)' : 'Admin Control Center'}
              >
                <ShieldCheck className="w-5 h-5 text-white" />
                <span className="text-sm font-bold">Admin</span>
              </button>
            )}
          </div>

          {/* User Guide & Privacy Links */}
          <div className="space-y-1">
            {onOpenShareApp && (
              <button
                type="button"
                onClick={() => {
                  onOpenShareApp();
                  onClose();
                }}
                className="w-full text-center py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 border border-slate-200"
              >
                <Share2 className="w-4 h-4 text-emerald-600" />
                <span>
                  {lang === 'my'
                    ? '🔗 အက်ပ်လင့်ခ်နှင့် မျှဝေရန် လမ်းညွှန်'
                    : '🔗 App Link & Share Guide'}
                </span>
              </button>
            )}

            {onOpenUserGuide && (
              <button
                type="button"
                onClick={() => {
                  onOpenUserGuide();
                  onClose();
                }}
                className="w-full text-center py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 border border-emerald-200/80"
              >
                <BookOpen className="w-4 h-4 text-emerald-600" />
                <span>
                  {lang === 'my'
                    ? '📖 အသုံးပြုပုံ လမ်းညွှန်'
                    : '📖 User Guide & Features'}
                </span>
              </button>
            )}

            {onOpenVersionHistory && (
              <button
                type="button"
                onClick={() => {
                  onOpenVersionHistory();
                  onClose();
                }}
                className="w-full text-center py-2 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold text-xs transition-colors cursor-pointer flex items-center justify-between border border-purple-200/80 shadow-2xs"
              >
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-purple-700 shrink-0" />
                  <span>
                    {lang === 'my'
                      ? 'ဗားရှင်းမှတ်တမ်းနှင့် ပြင်ဆင်မှုများ'
                      : 'Version History & Changelog'}
                  </span>
                </div>
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-purple-200 text-purple-900">
                  {CURRENT_APP_VERSION}
                </span>
              </button>
            )}

            {onOpenPrivacy && (
              <button
                type="button"
                onClick={() => {
                  onOpenPrivacy();
                  onClose();
                }}
                className="w-full text-center py-1 text-[11px] font-semibold text-slate-500 hover:text-emerald-700 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  {lang === 'my'
                    ? 'ဒေတာ လုံခြုံရေးနှင့် သီးသန့်မူဝါဒ'
                    : 'Privacy Policy & Disclaimer'}
                </span>
              </button>
            )}

            {/* Version footer — the Version History card button above is
                the only opener now (v7.5.60 N3: the duplicate text link
                below it is removed). */}
            <div className="pt-1 text-center text-[10px] font-medium text-slate-400">
              Version {CURRENT_APP_VERSION}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
