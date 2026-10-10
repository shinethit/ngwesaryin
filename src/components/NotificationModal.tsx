import React, { useState, useEffect } from 'react';
import { Bell, X, CheckCheck, AlertTriangle, HandCoins, Car, Clock, Volume2, CheckCircle2, Megaphone, ChevronRight, Sparkles } from 'lucide-react';
import {
  Debt,
  BudgetConfig,
  Transaction,
  Category,
  Vehicle,
  TirePressureLog,
  VehicleMaintenance,
  RecurringTransaction,
  AdminSystemMessage,
} from '../types';
import { formatMMK } from '../utils/formatters';

export interface NotificationItem {
  id: string;
  type: 'debt' | 'budget' | 'vehicle' | 'recurring' | 'system';
  title: string;
  message: string;
  date?: string;
  severity: 'danger' | 'warning' | 'info';
  actionTab?: string;
  actionText?: string;
  createdAt: number;
}

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'my' | 'en';
  debts: Debt[];
  budgets: BudgetConfig[];
  transactions: Transaction[];
  categories: Category[];
  vehicles?: Vehicle[];
  tireLogs?: TirePressureLog[];
  maintenanceLogs?: VehicleMaintenance[];
  recurringTransactions?: RecurringTransaction[];
  systemMessages?: AdminSystemMessage[];
  onNavigateTab: (tab: string) => void;
  readNotificationIds: string[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  lang,
  debts = [],
  budgets = [],
  transactions = [],
  categories = [],
  vehicles = [],
  tireLogs = [],
  maintenanceLogs = [],
  recurringTransactions = [],
  systemMessages = [],
  onNavigateTab,
  readNotificationIds = [],
  onMarkAsRead,
  onMarkAllAsRead,
}) => {
  const [filterTab, setFilterTab] = useState<'all' | 'debt' | 'budget' | 'vehicle' | 'system'>('all');
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>('default');
  const [isTestSending, setIsTestSending] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        setBrowserPermission(Notification.permission);
      } catch {
        // Fallback for restricted iframes
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = todayStr.substring(0, 7);
  const currentDayNum = new Date().getDate();

  const generatedNotifications: NotificationItem[] = [];

  // 1. Debts Due / Overdue Notifications
  debts.forEach((debt) => {
    if (debt.status === 'active') {
      const remainingAmount = debt.totalAmount - debt.paidAmount;
      if (remainingAmount > 0 && debt.dueDate) {
        const isOverdue = debt.dueDate < todayStr;
        const isDueToday = debt.dueDate === todayStr;

        // Check if due within next 3 days
        const dueTimestamp = new Date(debt.dueDate).getTime();
        const todayTimestamp = new Date(todayStr).getTime();
        const diffDays = Math.ceil((dueTimestamp - todayTimestamp) / (1000 * 3600 * 24));

        if (isOverdue || isDueToday || (diffDays >= 0 && diffDays <= 3)) {
          const typeLabel =
            debt.type === 'payable'
              ? lang === 'my'
                ? 'ပေးရန်အကြွေး'
                : 'Payable Debt'
              : lang === 'my'
              ? 'ရရန်အကြွေး'
              : 'Receivable Debt';

          let severity: 'danger' | 'warning' | 'info' = 'warning';
          let title = '';

          if (isOverdue) {
            severity = 'danger';
            title =
              lang === 'my'
                ? `⚠️ ${debt.personName} သို့ ${typeLabel} ရက်လွန်နေပါသည်`
                : `⚠️ ${typeLabel} for ${debt.personName} is OVERDUE`;
          } else if (isDueToday) {
            severity = 'danger';
            title =
              lang === 'my'
                ? `⏰ ${debt.personName} သို့ ${typeLabel} ဒီနေ့ရက်ပြည့်ပါပြီ`
                : `⏰ ${typeLabel} for ${debt.personName} is DUE TODAY`;
          } else {
            severity = 'warning';
            title =
              lang === 'my'
                ? `📅 ${debt.personName} သို့ ${typeLabel} (${diffDays}) ရက်အတွင်း ရက်ပြည့်ပါမည်`
                : `📅 ${typeLabel} for ${debt.personName} is due in ${diffDays} days`;
          }

          generatedNotifications.push({
            id: `notif_debt_${debt.id}_${debt.dueDate}`,
            type: 'debt',
            title,
            message: `${lang === 'my' ? 'ကျန်ရှိငွေ' : 'Remaining'}: ${formatMMK(
              remainingAmount
            )} | ${lang === 'my' ? 'ရက်စွဲ' : 'Due'}: ${debt.dueDate}`,
            date: debt.dueDate,
            severity,
            actionTab: 'debts',
            actionText: lang === 'my' ? 'အကြွေးကြည့်မည်' : 'View Debt',
            createdAt: new Date(debt.dueDate).getTime() || Date.now(),
          });
        }
      }
    }
  });

  // 2. Budget Threshold Alerts
  const currentMonthTx = transactions.filter(
    (t) => t.type === 'expense' && t.date && t.date.startsWith(currentMonthStr)
  );

  const spendingByCategory: Record<string, number> = {};
  currentMonthTx.forEach((t) => {
    spendingByCategory[t.category] = (spendingByCategory[t.category] || 0) + t.amount;
  });

  budgets.forEach((budget) => {
    const category = categories.find((c) => c.id === budget.categoryId);
    const categoryName =
      budget.categoryId === 'cat_general_unbudgeted'
        ? lang === 'my'
          ? 'အထွေထွေ အသုံးစရိတ်'
          : 'General Budget'
        : category
        ? lang === 'my'
          ? category.name
          : category.nameEn
        : 'Budget';

    const spent = spendingByCategory[budget.categoryId] || 0;
    const limit = budget.value;

    if (limit > 0) {
      const percentage = (spent / limit) * 100;

      if (percentage >= 100) {
        generatedNotifications.push({
          id: `notif_budget_exceeded_${budget.categoryId}_${currentMonthStr}`,
          type: 'budget',
          title:
            lang === 'my'
              ? `🚨 ${categoryName} ဘတ်ဂျက် ၁၀၀% သုံးစွဲမိသွားပါပြီ`
              : `🚨 ${categoryName} budget 100% EXCEEDED`,
          message: `${lang === 'my' ? 'သုံးပြီး' : 'Spent'}: ${formatMMK(spent)} / ${formatMMK(
            limit
          )} (${Math.round(percentage)}%)`,
          severity: 'danger',
          actionTab: 'analytics',
          actionText: lang === 'my' ? 'ဘတ်ဂျက် စစ်ဆေးမည်' : 'Check Budget',
          createdAt: Date.now(),
        });
      } else if (percentage >= 80) {
        generatedNotifications.push({
          id: `notif_budget_warning_${budget.categoryId}_${currentMonthStr}`,
          type: 'budget',
          title:
            lang === 'my'
              ? `⚠️ ${categoryName} ဘတ်ဂျက် ၈၀% ကျော်လွန်နေပါပြီ`
              : `⚠️ ${categoryName} budget reached 80%`,
          message: `${lang === 'my' ? 'သုံးပြီး' : 'Spent'}: ${formatMMK(spent)} / ${formatMMK(
            limit
          )} (${Math.round(percentage)}%)`,
          severity: 'warning',
          actionTab: 'analytics',
          actionText: lang === 'my' ? 'ဘတ်ဂျက် စစ်ဆေးမည်' : 'Check Budget',
          createdAt: Date.now(),
        });
      }
    }
  });

  // 3. Vehicle Tire Pressure Check & Maintenance Reminders
  tireLogs.forEach((log) => {
    if (log.nextCheckDate && log.nextCheckDate <= todayStr) {
      const vehicle = vehicles.find((v) => v.id === log.vehicleId);
      const vehicleName = vehicle ? vehicle.name : lang === 'my' ? 'ယာဉ်' : 'Vehicle';

      generatedNotifications.push({
        id: `notif_tire_${log.id}_${log.nextCheckDate}`,
        type: 'vehicle',
        title:
          lang === 'my'
            ? `🚗 ${vehicleName} လေဖိအား စစ်ဆေးရန် ရက်ရောက်နေပါပြီ`
            : `🚗 ${vehicleName} Tire Pressure Check Due`,
        message: `${lang === 'my' ? 'သတ်မှတ်ရက်' : 'Scheduled'}: ${log.nextCheckDate}`,
        date: log.nextCheckDate,
        severity: 'warning',
        actionTab: 'vehicles',
        actionText: lang === 'my' ? 'ယာဉ်စာရင်း ကြည့်မည်' : 'View Vehicle',
        createdAt: new Date(log.nextCheckDate).getTime() || Date.now(),
      });
    }
  });

  // 4. Recurring Transaction Reminders
  recurringTransactions.forEach((rec) => {
    if (rec.isActive && rec.dayOfMonth === currentDayNum) {
      generatedNotifications.push({
        id: `notif_recurring_${rec.id}_${currentDayNum}`,
        type: 'recurring',
        title:
          lang === 'my'
            ? `🔄 ဒီနေ့ ပုံမှန် ${rec.type === 'income' ? 'ဝင်ငွေ' : 'ထွက်ငွေ'} စာရင်း ထည့်ရန်နေ့ပါ`
            : `🔄 Recurring ${rec.type} due today: ${rec.title}`,
        message: `${rec.title}: ${formatMMK(rec.amount)}`,
        severity: 'info',
        actionTab: 'transactions',
        actionText: lang === 'my' ? 'စာရင်းထည့်မည်' : 'View Transactions',
        createdAt: Date.now(),
      });
    }
  });

  // 5. Admin Broadcast System Messages
  systemMessages.forEach((msg) => {
    if (msg.isActive) {
      generatedNotifications.push({
        id: `notif_system_${msg.id}`,
        type: 'system',
        title: `📢 ${msg.title}`,
        message: msg.content,
        severity: 'info',
        actionTab: 'dashboard',
        actionText: lang === 'my' ? 'ဖတ်ရှုမည်' : 'View Announcement',
        createdAt: msg.createdAt ? new Date(msg.createdAt).getTime() : Date.now(),
      });
    }
  });

  // Filter based on selected tab
  const filteredNotifications = generatedNotifications.filter((n) => {
    if (filterTab === 'all') return true;
    if (filterTab === 'system') return n.type === 'system' || n.type === 'recurring';
    return n.type === filterTab;
  });

  // Count unread
  const unreadCount = generatedNotifications.filter((n) => !readNotificationIds.includes(n.id)).length;

  const handleRequestPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert(
        lang === 'my'
          ? 'သင့် Browser တွင် Notification API မပါဝင်ပါ သို့မဟုတ် ကန့်သတ်ထားပါသည်။'
          : 'Notification API is not supported in this browser environment.'
      );
      return;
    }

    try {
      const perm = await Notification.requestPermission();
      setBrowserPermission(perm);

      if (perm === 'granted') {
        new Notification(lang === 'my' ? 'ငွေစာရင်း (NgweSarYin)' : 'NgweSarYin Notification', {
          body:
            lang === 'my'
              ? 'Browser Notification စနစ် အောင်မြင်စွာ ဖွင့်ပြီးပါပြီ။'
              : 'Browser Notification system successfully enabled.',
          icon: '/pwa-192x192.png',
        });
      }
    } catch (err) {
      console.warn('Error requesting notification permission:', err);
    }
  };

  const handleTestBrowserNotification = () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert(lang === 'my' ? 'Browser Notification API မရရှိနိုင်ပါ။' : 'Notification API unavailable.');
      return;
    }

    if (Notification.permission !== 'granted') {
      handleRequestPermission();
      return;
    }

    setIsTestSending(true);
    setTimeout(() => {
      try {
        new Notification(lang === 'my' ? 'ငွေစာရင်း - စမ်းသပ်သတိပေးချက်' : 'NgweSarYin - Test Alert', {
          body:
            unreadCount > 0
              ? lang === 'my'
                ? `သင့်ထံတွင် သတိပေးချက် (${unreadCount}) ခု ရှိနေပါသည်။`
                : `You have (${unreadCount}) pending alerts in your account.`
              : lang === 'my'
              ? 'သင့်ထံတွင် ယခုအချိန်၌ စာရင်း သတိပေးချက် မရှိသေးပါ။'
              : 'You have no pending alerts right now.',
          icon: '/pwa-192x192.png',
        });
      } catch (e) {
        console.warn('Browser notification send error:', e);
      }
      setIsTestSending(false);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shrink-0 shadow-inner">
              <Bell className="w-5 h-5 text-amber-300 animate-bounce" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span>{lang === 'my' ? 'အသိပေးချက်များ' : 'Notifications & Alerts'}</span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-black bg-rose-500 text-white rounded-full shadow-xs">
                    {unreadCount} {lang === 'my' ? 'ခု မဖတ်ရသေး' : 'Unread'}
                  </span>
                )}
              </h3>
              <p className="text-xs text-emerald-100/90 font-medium">
                {lang === 'my'
                  ? 'အကြွေး ရက်လွန်၊ ဘတ်ဂျက် လွန်နှင့် ယာဉ်ထိန်းသိမ်းမှု သတိပေးချက်များ'
                  : 'Debts, Budget Limits, and Maintenance Alerts'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-emerald-100 hover:text-white hover:bg-white/15 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Browser Push Notification Permission Banner */}
        <div className="bg-amber-50/90 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 text-xs text-amber-950 font-medium min-w-0">
            <Volume2 className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="truncate">
              {browserPermission === 'granted'
                ? lang === 'my'
                  ? 'Browser Push Notification စနစ် ဖွင့်ထားပါသည်'
                  : 'Browser Notifications Enabled'
                : lang === 'my'
                ? 'စက်တွင်း Push Notification သတိပေးချက်များ ရယူလိုပါက ဖွင့်ပါ'
                : 'Enable Browser Notifications for timely alerts'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {browserPermission !== 'granted' ? (
              <button
                type="button"
                onClick={handleRequestPermission}
                className="px-2.5 py-1 text-xs font-bold text-amber-900 bg-amber-200 hover:bg-amber-300 rounded-lg transition-colors cursor-pointer shadow-2xs"
              >
                {lang === 'my' ? 'ဖွင့်မည်' : 'Enable'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleTestBrowserNotification}
                disabled={isTestSending}
                className="px-2.5 py-1 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-emerald-600" />
                <span>{lang === 'my' ? 'စမ်းသပ်မည်' : 'Test Alert'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Category Tabs & Filter */}
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 overflow-x-auto shrink-0 scrollbar-none">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterTab === 'all'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {lang === 'my' ? 'အားလုံး' : 'All'} ({generatedNotifications.length})
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('debt')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterTab === 'debt'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              💸 {lang === 'my' ? 'အကြွေးများ' : 'Debts'}
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('budget')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterTab === 'budget'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              📊 {lang === 'my' ? 'ဘတ်ဂျက်' : 'Budgets'}
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('vehicle')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterTab === 'vehicle'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              🚗 {lang === 'my' ? 'ယာဉ်စနစ်' : 'Vehicles'}
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('system')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterTab === 'system'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              📢 {lang === 'my' ? 'စနစ်အသိပေးချက်' : 'System'}
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllAsRead}
              className="px-2.5 py-1 text-xs font-bold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shrink-0"
              title={lang === 'my' ? 'အားလုံး ဖတ်ပြီးကြောင်း မှတ်သားမည်' : 'Mark all as read'}
            >
              <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">{lang === 'my' ? 'အားလုံးဖတ်ပြီး' : 'Mark All Read'}</span>
            </button>
          )}
        </div>

        {/* Notification List Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[250px]">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
              <div className="w-16 h-16 rounded-3xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <p className="text-sm font-bold text-slate-700">
                {lang === 'my' ? 'သတိပေးချက် မရှိသေးပါ' : 'No notifications right now'}
              </p>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                {lang === 'my'
                  ? 'အကြွေး ရက်လွန်ခြင်း၊ ဘတ်ဂျက် ကန့်သတ်ချက် ပြည့်ခြင်းများ ရှိပါက ဤနေရာတွင် ပေါ်လာမည်ဖြစ်ပါသည်။'
                  : 'Overdue debts, budget threshold warnings, and vehicle maintenance alerts will appear here.'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const isRead = readNotificationIds.includes(notif.id);

              let bgColor = 'bg-slate-50 border-slate-200';
              let badgeColor = 'bg-slate-200 text-slate-800';

              if (notif.severity === 'danger') {
                bgColor = isRead ? 'bg-rose-50/40 border-rose-200' : 'bg-rose-50 border-rose-300 shadow-2xs';
                badgeColor = 'bg-rose-100 text-rose-800 border-rose-300';
              } else if (notif.severity === 'warning') {
                bgColor = isRead ? 'bg-amber-50/40 border-amber-200' : 'bg-amber-50 border-amber-300 shadow-2xs';
                badgeColor = 'bg-amber-100 text-amber-900 border-amber-300';
              } else if (notif.severity === 'info') {
                bgColor = isRead ? 'bg-sky-50/40 border-sky-200' : 'bg-sky-50 border-sky-300 shadow-2xs';
                badgeColor = 'bg-sky-100 text-sky-800 border-sky-300';
              }

              return (
                <div
                  key={notif.id}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${bgColor} ${
                    isRead ? 'opacity-70' : 'opacity-100 font-medium'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5 shrink-0">
                      {notif.type === 'debt' && (
                        <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                          <HandCoins className="w-5 h-5" />
                        </div>
                      )}
                      {notif.type === 'budget' && (
                        <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                      )}
                      {notif.type === 'vehicle' && (
                        <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                          <Car className="w-5 h-5" />
                        </div>
                      )}
                      {notif.type === 'recurring' && (
                        <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                          <Clock className="w-5 h-5" />
                        </div>
                      )}
                      {notif.type === 'system' && (
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                          <Megaphone className="w-5 h-5" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-900 leading-snug">
                          {notif.title}
                        </h4>
                        {!isRead && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                        {notif.message}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200/60">
                    {notif.actionTab && (
                      <button
                        type="button"
                        onClick={() => {
                          onMarkAsRead(notif.id);
                          onNavigateTab(notif.actionTab!);
                          onClose();
                        }}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                      >
                        <span>{notif.actionText || (lang === 'my' ? 'ကြည့်မည်' : 'View')}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-white" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onMarkAsRead(notif.id)}
                      className={`p-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                        isRead
                          ? 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
                          : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                      }`}
                      title={isRead ? (lang === 'my' ? 'ဖတ်ပြီးပါပြီ' : 'Read') : (lang === 'my' ? 'ဖတ်ပြီးကြောင်း မှတ်မည်' : 'Mark as read')}
                    >
                      <CheckCircle2 className={`w-4 h-4 ${isRead ? 'text-emerald-500' : 'text-slate-400'}`} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>
            {lang === 'my' ? 'စုစုပေါင်း သတိပေးချက်:' : 'Total Notifications:'}{' '}
            <strong className="text-slate-800">{generatedNotifications.length}</strong>
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-colors cursor-pointer"
          >
            {lang === 'my' ? 'ပိတ်မည်' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationModal;
