import React, { useState, useRef, useEffect } from 'react';
import { Crown, Sparkles, Plus, ShieldCheck, Search, Cloud, User as UserIcon, LogIn, ChevronDown, Wifi, WifiOff, RefreshCw, Database, Download, Menu, Lock, Bell } from 'lucide-react';
import { PlanType } from '../types';
import { useAuth } from '../context/AuthContext';
import { FortuneLogo, LogoStyle } from './FortuneLogo';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { syncQueue } from '../lib/syncQueue';

interface NavbarProps {
  currentPlan: PlanType;
  onOpenSidebar: () => void;
  onOpenUpgradeModal: () => void;
  onOpenAddModal: () => void;
  onOpenSearch: () => void;
  onOpenAccountModal: () => void;
  onOpenLogin?: () => void;
  onLockApp: () => void;
  lang: 'my' | 'en';
  onToggleLang: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  transactionsCount: number;
  maxFreeTransactions: number;
  logoStyle?: LogoStyle;
  onSelectLogoStyle?: (style: LogoStyle) => void;
  onManualSync?: () => void;
  onOpenNotificationModal?: () => void;
  unreadNotificationCount?: number;
  onOpenAdminPanel?: () => void;
  onOpenDatabaseTracker?: () => void;
  pendingCloudCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPlan,
  onOpenSidebar,
  onOpenUpgradeModal,
  onOpenAddModal,
  onOpenSearch,
  onOpenAccountModal,
  onOpenLogin,
  onLockApp,
  lang,
  onToggleLang,
  activeTab,
  setActiveTab,
  transactionsCount,
  maxFreeTransactions,
  logoStyle = 'pixiu',
  onSelectLogoStyle,
  onManualSync,
  onOpenNotificationModal,
  unreadNotificationCount = 0,
  onOpenAdminPanel,
  onOpenDatabaseTracker,
  pendingCloudCount = 0,
}) => {
  const { user, isGuest, isSyncing, activeWorkspaceId, isAdmin } = useAuth();
  const { isInstalled, isStandalone } = usePWAInstall();
  const [showLogoPicker, setShowLogoPicker] = useState(false);
  const logoPickerRef = useRef<HTMLDivElement>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isQueueProcessing, setIsQueueProcessing] = useState(false);

  // Subscribe to background queue operations to detect active background auto-syncs
  useEffect(() => {
    return syncQueue.subscribe((_items, processing) => {
      setIsQueueProcessing(processing);
    });
  }, []);

  const isAutoSyncing = isSyncing || isQueueProcessing;

  const handleLogoTap = () => {
    setShowLogoPicker(!showLogoPicker);
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

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-18 gap-1 sm:gap-3">
          {/* Left: Sidebar Hamburger Button + Logo & Brand */}
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
            {/* Sidebar Drawer Toggle Button */}
            <button
              id="sidebar-toggle-btn"
              type="button"
              onClick={onOpenSidebar}
              className="p-1.5 sm:p-2.5 rounded-xl text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 border border-slate-200/80 transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 shrink-0"
              title={lang === 'my' ? 'Sidebar Menu ဖွင့်ရန်' : 'Open Navigation Menu'}
            >
              <Menu className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-slate-800" />
              <span className="hidden md:inline text-xs font-bold text-slate-800">
                {lang === 'my' ? 'မီနူး' : 'Menu'}
              </span>
            </button>

            {/* Fortune Logo with Quick Auspicious Switcher */}
            <div className="relative shrink-0" ref={logoPickerRef}>
              <button
                type="button"
                onClick={handleLogoTap}
                className="group relative flex items-center cursor-pointer transition-transform active:scale-95 focus:outline-none"
                title={
                  lang === 'my'
                    ? 'လာဘ်ရွှင်စေသော Logo ပုံစံပြောင်းရန် နှိပ်ပါ'
                    : 'Click to choose auspicious fortune emblem'
                }
              >
                <FortuneLogo size="sm" style={logoStyle} animate />
              </button>

              {/* Auspicious Emblem Dropdown Picker */}
              {showLogoPicker && (
                <div className="absolute left-0 top-12 z-50 w-64 p-2 bg-white rounded-2xl border border-amber-200 shadow-2xl animate-fadeIn">
                  <div className="px-2 py-1.5 border-b border-amber-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span>✨</span>
                      <span>{lang === 'my' ? 'လာဘ်ရွှင်စေသော Logo ရွေးပါ' : 'Select Lucky Logo'}</span>
                    </span>
                    <span className="text-[10px] text-amber-700 font-semibold px-1.5 py-0.5 bg-amber-50 rounded">
                      Fortune
                    </span>
                  </div>

                  <div className="space-y-1 mt-1.5">
                    {/* Option 1: Golden Money Bag */}
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
                          {lang === 'my' ? 'စီးပွားတိုးတက် ငွေဝင်ကြမ်းစေခြင်း' : 'Abundant Wealth & Savings'}
                        </div>
                      </div>
                      {logoStyle === 'money_bag' && (
                        <span className="text-xs text-amber-600 font-bold">✓</span>
                      )}
                    </button>

                    {/* Option 2: Chinese Gold Ingot */}
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
                          {lang === 'my' ? 'ရွှေငွေရတနာ စည်းစိမ်တိုးပွားခြင်း' : 'Prosperity & Pure Fortune'}
                        </div>
                      </div>
                      {logoStyle === 'gold_ingot' && (
                        <span className="text-xs text-amber-600 font-bold">✓</span>
                      )}
                    </button>

                    {/* Option 3: Pixiu */}
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
                      {logoStyle === 'pixiu' && (
                        <span className="text-xs text-amber-600 font-bold">✓</span>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="min-w-0 shrink-0 flex items-center gap-1 sm:gap-2">
              <span className="font-extrabold text-xs sm:text-lg text-slate-900 tracking-tight whitespace-nowrap">
                {lang === 'my' ? 'ငွေစာရင်း' : 'NgweSarYin'}
              </span>
              {currentPlan === 'premium' ? (
                <span className="inline-flex items-center gap-0.5 px-1 sm:px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300/80 whitespace-nowrap shrink-0 shadow-2xs">
                  <Crown className="w-2.5 h-2.5 text-amber-600 fill-amber-500 shrink-0" />
                  <span>VIP</span>
                </span>
              ) : (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap shrink-0">
                  Free
                </span>
              )}
            </div>
          </div>

          {/* Right Action buttons - Clean, spacious & responsive */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* 0. Admin Control Center Button (Only visible to verified Admins on sm+) */}
            {isAdmin && onOpenAdminPanel && (
              <button
                id="navbar-admin-btn"
                type="button"
                onClick={onOpenAdminPanel}
                className="hidden sm:flex p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer active:scale-95 items-center justify-center gap-1.5 shrink-0 shadow-2xs bg-purple-100 hover:bg-purple-200 text-purple-900 border-purple-300"
                title={lang === 'my' ? 'Admin Control Center (စီမံခန့်ခွဲမှု)' : 'Admin Control Center'}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                <span className="hidden lg:inline font-bold">Admin</span>
              </button>
            )}

            {/* 1. Notification Bell Button (Always visible on mobile & desktop) */}
            {onOpenNotificationModal && (
              <button
                id="navbar-notification-btn"
                type="button"
                onClick={onOpenNotificationModal}
                className="relative p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-bold rounded-xl text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 shrink-0 shadow-2xs"
                title={lang === 'my' ? 'အသိပေးချက်များ' : 'Notifications & Alerts'}
              >
                <Bell className="w-4 h-4 text-amber-700 shrink-0" />
                <span className="hidden xl:inline">
                  {lang === 'my' ? 'အသိပေးချက်' : 'Alerts'}
                </span>
                {unreadNotificationCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-4 px-1 flex items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-xs animate-pulse border border-white">
                    {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                  </span>
                )}
              </button>
            )}

            {/* 2. Quick Search Trigger (Always visible) */}
            <button
              id="navbar-search-btn"
              onClick={onOpenSearch}
              className="p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-medium rounded-xl text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 border border-slate-200/80 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 shrink-0"
              title="Search records, debts, notes (⌘K)"
            >
              <Search className="w-4 h-4 text-slate-600 shrink-0" />
              <span className="hidden md:inline">
                {lang === 'my' ? 'ရှာဖွေရန်' : 'Search'}
              </span>
              <kbd className="hidden lg:inline-block px-1.5 py-0.2 text-[10px] font-mono text-slate-500 bg-white border border-slate-200 rounded">
                ⌘K
              </kbd>
            </button>

            {/* 5. Cloud Sync & Account / Avatar Button (Always visible) */}
            <button
              id="navbar-account-btn"
              onClick={onOpenAccountModal}
              className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer active:scale-95 border shrink-0 ${
                user
                  ? isAutoSyncing
                    ? 'bg-sky-50/90 text-slate-800 border-sky-200 hover:bg-sky-100 shadow-2xs'
                    : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100 shadow-2xs'
                  : 'bg-amber-50/80 text-amber-900 border-amber-200 hover:bg-amber-100/80 shadow-2xs'
              }`}
              title={
                lang === 'my'
                  ? user
                    ? isAutoSyncing
                      ? `အကောင့်: ${user.displayName || user.email} (နောက်ခံမှ အလိုအလျောက် Sync နေပါသည်...)`
                      : `အကောင့်: ${user.displayName || user.email} (Cloud Sync ပြုလုပ်ထားသည်)`
                    : 'ဧည့်သည်စနစ် (စက်တွင်း၌ သိမ်းဆည်းထားသည်။ Cloud သို့ ချိတ်ဆက်ရန် နှိပ်ပါ)'
                  : user
                  ? isAutoSyncing
                    ? `Account: ${user.displayName || user.email} (Background syncing...)`
                    : `Account: ${user.displayName || user.email} (Cloud Synced)`
                  : 'Guest Mode (Data saved locally. Tap to connect cloud)'
              }
            >
              {user ? (
                <>
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt="avatar"
                      className="w-5 h-5 rounded-full border border-slate-300 object-cover shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-slate-800 text-white text-[9px] flex items-center justify-center font-bold shrink-0">
                      {user.displayName ? user.displayName[0].toUpperCase() : 'U'}
                    </div>
                  )}
                  <span className="hidden xl:inline truncate max-w-[85px]">
                    {user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'User'}
                  </span>

                  {/* Subtle Sync Progress Indicator: Active only during background auto-syncs */}
                  <span className="inline-flex items-center gap-1 shrink-0">
                    <span className="relative flex items-center justify-center w-4 h-4">
                      <Cloud
                        className={`w-3.5 h-3.5 transition-all duration-300 ${
                          isAutoSyncing
                            ? 'text-sky-500 scale-105 drop-shadow-[0_0_4px_rgba(14,165,233,0.5)]'
                            : 'text-emerald-600'
                        }`}
                      />
                      {/* Subtle spinning arc ring around the cloud icon */}
                      {isAutoSyncing && (
                        <svg
                          className="absolute -inset-0.75 w-5.5 h-5.5 animate-spin text-sky-500 pointer-events-none"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <circle
                            className="opacity-20"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          />
                          <path
                            className="opacity-95"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v2.5a5.5 5.5 0 00-5.5 5.5H4z"
                          />
                        </svg>
                      )}
                    </span>

                    {/* Subtle pulse indicator dot and mini label next to cloud icon */}
                    {isAutoSyncing && (
                      <span className="flex items-center gap-1 animate-fadeIn">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-sky-500"></span>
                        </span>
                        <span className="hidden xl:inline text-[9px] font-extrabold uppercase tracking-wider text-sky-600 animate-pulse">
                          {lang === 'my' ? 'Syncing...' : 'Syncing'}
                        </span>
                      </span>
                    )}
                  </span>
                </>
              ) : (
                <>
                  <UserIcon className="w-4 h-4 text-amber-700 shrink-0" />
                  <span className="hidden sm:inline font-medium">
                    {lang === 'my' ? 'ဧည့်သည်စနစ်' : 'Guest'}
                  </span>
                </>
              )}
            </button>

            {/* Quick App Lock Button (Desktop / Tablet only) */}
            <button
              id="navbar-lock-btn"
              type="button"
              onClick={onLockApp}
              className="hidden md:flex p-1.5 sm:p-2 rounded-xl text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 border border-slate-200/80 transition-all cursor-pointer active:scale-95 items-center gap-1 shadow-2xs shrink-0"
              title={lang === 'my' ? 'အက်ပ်ကို လော့ခ်ချမည် (Lock App with PIN)' : 'Lock App with PIN'}
            >
              <Lock className="w-3.5 h-3.5 text-slate-700" />
              <span className="hidden xl:inline text-xs font-semibold text-slate-700">
                {lang === 'my' ? 'လော့ခ်ချမည်' : 'Lock'}
              </span>
            </button>


          </div>
        </div>
      </div>
    </header>
  );
};
