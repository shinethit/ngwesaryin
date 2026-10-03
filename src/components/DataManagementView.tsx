import React from 'react';
import {
  Database,
  Trash2,
  Download,
  Upload,
  ShieldCheck,
  KeyRound,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  User as UserIcon,
  Lock,
  Crown,
  Cloud,
} from 'lucide-react';
import { BudgetConfig, Category, Debt, PlanType, Transaction, Wallet } from '../types';
import { useAuth } from '../context/AuthContext';

interface DataManagementViewProps {
  transactions: Transaction[];
  debts: Debt[];
  wallets: Wallet[];
  categories: Category[];
  budgets?: BudgetConfig[];
  plan: PlanType;
  lang: 'my' | 'en';
  onClearAllData: () => void;
  onExportJson: () => void;
  onImportJson: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenAccountModal: () => void;
  onOpenPremiumModal: () => void;
}

export const DataManagementView: React.FC<DataManagementViewProps> = ({
  transactions,
  debts,
  wallets,
  categories,
  budgets = [],
  plan,
  lang,
  onClearAllData,
  onExportJson,
  onImportJson,
  onOpenAccountModal,
  onOpenPremiumModal,
}) => {
  const { user, isGuest, isSyncing, lastSyncedAt } = useAuth();

  return (
    <div className="max-w-4xl mx-auto py-4 sm:py-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md shadow-slate-900/10">
              <Database className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                {lang === 'my' ? 'ဒေတာ စီမံခန့်ခွဲမှု (Data Management)' : 'Data Management & Reset'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                {lang === 'my'
                  ? 'သင့်စာရင်းဒေတာများကို သိမ်းဆည်းခြင်း၊ အသစ်ပြန်စတင်ခြင်းနှင့် သန့်ရှင်းရေးပြုလုပ်ခြင်း'
                  : 'Manage local datasets, backup or restore files, and reset records safely.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                plan === 'premium'
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              {plan === 'premium' ? <Crown className="w-3.5 h-3.5 text-amber-600" /> : null}
              <span>{plan === 'premium' ? 'Premium Active' : 'Free Plan'}</span>
            </span>
          </div>
        </div>

        {/* Live Stored Data Counts Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-100">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
            <span className="text-slate-400 block text-[11px] font-medium">
              {lang === 'my' ? 'စာရင်းမှတ်တမ်း' : 'Transactions'}
            </span>
            <span className="font-bold text-slate-900 text-lg mt-0.5 block">
              {transactions.length}
            </span>
            <span className="text-[10px] text-slate-400">records</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
            <span className="text-slate-400 block text-[11px] font-medium">
              {lang === 'my' ? 'အကြွေးစာရင်း' : 'Debts'}
            </span>
            <span className="font-bold text-slate-900 text-lg mt-0.5 block">
              {debts.length}
            </span>
            <span className="text-[10px] text-slate-400">entries</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
            <span className="text-slate-400 block text-[11px] font-medium">
              {lang === 'my' ? 'ပိုက်ဆံအိတ်များ' : 'Wallets'}
            </span>
            <span className="font-bold text-slate-900 text-lg mt-0.5 block">
              {wallets.length}
            </span>
            <span className="text-[10px] text-slate-400">accounts</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
            <span className="text-slate-400 block text-[11px] font-medium">
              {lang === 'my' ? 'ကဏ္ဍများ' : 'Categories'}
            </span>
            <span className="font-bold text-slate-900 text-lg mt-0.5 block">
              {categories.length}
            </span>
            <span className="text-[10px] text-slate-400">categories</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 col-span-2 sm:col-span-1">
            <span className="text-slate-400 block text-[11px] font-medium">
              {lang === 'my' ? 'ဘတ်ဂျက်သတ်မှတ်ချက်' : 'Budgets'}
            </span>
            <span className="font-bold text-slate-900 text-lg mt-0.5 block">
              {budgets.length}
            </span>
            <span className="text-[10px] text-slate-400">targets</span>
          </div>
        </div>
      </div>

      {/* Main Operations Card (Danger Zone / Clear All Data) */}
      <div className="bg-white rounded-3xl border border-rose-200/80 shadow-sm p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
            <Trash2 className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-bold text-rose-950">
            {lang === 'my' ? 'ဒေတာအားလုံး ရှင်းလင်းဖျက်သိမ်းမည် (Danger Zone)' : 'Clear All Data (Danger Zone)'}
          </h2>
        </div>

        <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed max-w-2xl">
          {lang === 'my'
            ? 'စာရင်းမှတ်တမ်းအားလုံး (Transactions)၊ အကြွေးစာရင်းများ (Debts)၊ သတ်မှတ်ထားသော ဘတ်ဂျက်များနှင့် မိမိစိတ်ကြိုက်ထည့်ထားသော ကဏ္ဍများကို ဖျက်ပစ်ပါမည်။ မူလအခြေခံ Cash ပိုက်ဆံအိတ်တစ်ခုသာ ကျန်ရှိစေမည် ဖြစ်ပါသည်။'
            : 'Permanently deletes all transactions, active debts, budget plans, and custom categories. Retains a clean default Cash wallet for a fresh start.'}
        </p>

        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-900">
              <span className="font-bold block">
                {lang === 'my' ? 'သတိပြုရန် - ပြန်လည်ရယူနိုင်မည် မဟုတ်ပါ' : 'Warning - Cannot be undone'}
              </span>
              <span className="text-rose-800/90 text-[11px]">
                {lang === 'my'
                  ? 'မဖျက်မီ JSON Backup အား သိမ်းဆည်းထားရန် အကြံပြုအပ်ပါသည်။'
                  : 'Please download a JSON backup first if you might need this data later.'}
              </span>
            </div>
          </div>

          <button
            type="button"
            id="btn-clear-all-data-main"
            onClick={onClearAllData}
            className="w-full sm:w-auto px-5 py-3 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <Trash2 className="w-4 h-4" />
            <span>{lang === 'my' ? 'ဒေတာအားလုံး ဖျက်မည် (Clear All Data)' : 'Clear All Data Now'}</span>
          </button>
        </div>
      </div>

      {/* Backup & Restore Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Download className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            {lang === 'my' ? 'ဖိုင်အဖြစ် သိမ်းဆည်းခြင်းနှင့် ပြန်သွင်းခြင်း (Backup & Restore)' : 'Backup & Restore'}
          </h2>
        </div>

        <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed">
          {lang === 'my'
            ? 'သင့်ဒေတာများအား JSON ဖိုင်ဖြင့် သင့်ဖုန်း/ကွန်ပျူတာထဲတွင် အချိန်မရွေး သိမ်းဆည်းထားနိုင်ပြီး ပြန်လည်အသုံးပြုနိုင်ပါသည်'
            : 'Safeguard your dataset by exporting to a JSON file, or restore data from a previous export file.'}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            id="btn-export-backup"
            onClick={onExportJson}
            className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100/80 active:scale-95 transition-all text-left flex items-start gap-3 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-50 group-hover:text-emerald-700 transition-colors">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-xs text-slate-900 block">
                {lang === 'my' ? 'JSON Backup သိမ်းမည်' : 'Export Backup'}
              </span>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                {lang === 'my' ? 'ဖိုင်အဖြစ် ကွန်ပျူတာ/ဖုန်းထဲဒေါင်းလုဒ်ဆွဲရန်' : 'Download JSON file'}
              </span>
            </div>
          </button>

          <label
            id="lbl-import-backup"
            className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100/80 active:scale-95 transition-all text-left flex items-start gap-3 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-50 group-hover:text-emerald-700 transition-colors">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-xs text-slate-900 block">
                {lang === 'my' ? 'JSON Backup ထည့်မည်' : 'Import Backup'}
              </span>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                {lang === 'my' ? 'ယခင်သိမ်းထားသောဖိုင် ပြန်ထည့်ရန်' : 'Upload and restore file'}
              </span>
            </div>
            <input
              type="file"
              accept=".json"
              onChange={onImportJson}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Premium & Activation Code Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900">
              {lang === 'my' ? 'Premium နှင့် Activation Code' : 'Premium & Activation Code'}
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
              PRO
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
            {lang === 'my'
              ? 'Admin ထံမှ ရရှိသော Activation Code ဖြင့် Premium ဖွင့်ရန် (သို့မဟုတ်) အစီအစဉ် အသေးစိတ် ကြည့်ရှုရန်'
              : 'Redeem your VIP activation code or explore Premium benefits.'}
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenPremiumModal}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs sm:text-sm font-bold transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-xs shrink-0"
        >
          <KeyRound className="w-4 h-4" />
          <span>{lang === 'my' ? 'Activation Code ထည့်မည် / အဆင့်မြှင့်မည်' : 'Enter Code / Upgrade'}</span>
        </button>
      </div>
    </div>
  );
};
