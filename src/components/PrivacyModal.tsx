import React from 'react';
import { X, ShieldCheck, Lock, Cloud, HardDrive, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';
import { FortuneLogo, LogoStyle } from './FortuneLogo';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'my' | 'en';
  logoStyle?: LogoStyle;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({
  isOpen,
  onClose,
  lang,
  logoStyle = 'pixiu',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shrink-0">
              <FortuneLogo size="sm" style={logoStyle} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>
                  {lang === 'my'
                    ? 'ဒေတာ လုံခြုံရေးနှင့် သီးသန့်မူဝါဒများ'
                    : 'Data Privacy Policy & Disclaimer'}
                </span>
              </h2>
              <p className="text-xs text-slate-300 font-normal">
                {lang === 'my'
                  ? 'ငွေစာရင်း ဒေတာများ လုံခြုံစိတ်ချရမှုဆိုင်ရာ အာမခံချက်နှင့် စည်းကမ်းချက်များ'
                  : 'Data security guarantees, terms, and usage disclaimers'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed">
          {/* Intro Banner */}
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-bold text-emerald-900 text-xs sm:text-sm">
                {lang === 'my'
                  ? 'သင့်ငွေစာရင်း ဒေတာများသည် ၁၀၀% သီးသန့်ဖြစ်သည်'
                  : 'Your financial data is 100% private and secure'}
              </h3>
              <p className="text-slate-600 text-xs">
                {lang === 'my'
                  ? 'ငွေစာရင်း အက်ပလီကေးရှင်းသည် သုံးစွဲသူများ၏ ကိုယ်ရေးကိုယ်တာနှင့် ဘဏ္ဍာရေး စာရင်းများကို လျှို့ဝှက်ချက်အဖြစ် လုံခြုံစွာ ထိန်းသိမ်းပေးထားပါသည်။'
                  : 'NgweSarYin strictly protects user financial confidentiality and does not sell or share personal records.'}
              </p>
            </div>
          </div>

          {/* Section 1: Data Privacy */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-600" />
              <span>
                {lang === 'my'
                  ? '၁။ ဒေတာ လုံခြုံရေးနှင့် လျှို့ဝှက်ချက် ထိန်းသိမ်းမှု'
                  : '1. Data Privacy & Confidentiality'}
              </span>
            </h4>
            <p className="text-slate-600 pl-6">
              {lang === 'my'
                ? 'သင်ထည့်သွင်းထားသော ဝင်ငွေ၊ ထွက်ငွေ၊ ဘတ်ဂျက်နှင့် အကြွေးစာရင်း အချက်အလက်များအားလုံးသည် သင့်ကိုယ်ပိုင် သီးသန့် ဒေတာများဖြစ်ပါသည်။ မည်သည့် တတိယအဖွဲ့အစည်း (Third-party) ထံသို့မျှ ရောင်းချခြင်း၊ လွှဲပြောင်းခြင်း သို့မဟုတ် မျှဝေခြင်း လုံးဝ မပြုလုပ်ပါ။'
                : 'All recorded incomes, expenses, budgets, and debts belong exclusively to you. We never sell, lease, or distribute your personal data to third parties.'}
            </p>
          </div>

          {/* Section 2: Google Cloud Encryption */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Cloud className="w-4 h-4 text-sky-600" />
              <span>
                {lang === 'my'
                  ? '၂။ Google Cloud & Firebase စနစ်ဖြင့် ကာကွယ်ထားမှု'
                  : '2. Google Cloud & Firebase Encryption'}
              </span>
            </h4>
            <p className="text-slate-600 pl-6">
              {lang === 'my'
                ? 'Google အကောင့်ဖြင့် Sign In ဝင်ရောက်အသုံးပြုချိန်တွင် ဒေတာများကို Google Cloud Firebase Encrypted Database ပေါ်တွင် လုံခြုံစွာ သိမ်းဆည်းပါသည်။ သင့် Google Account Credentials (UID) ဖြင့် သီးသန့် အကာအကွယ်ပေးထားသဖြင့် သင့်အကောင့်ပိုင်ရှင် ကိုယ်တိုင်မှလွဲ၍ အခြား မည်သူမျှ ကြည့်ရှုနိုင်မည် မဟုတ်ပါ။'
                : 'When logged in with Google, records are encrypted and stored safely on Google Cloud Firebase Firestore. Access is strictly isolated by your Google Authentication ID.'}
            </p>
          </div>

          {/* Section 3: Guest Mode Disclaimer */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-amber-600" />
              <span>
                {lang === 'my'
                  ? '၃။ Guest Mode (ဧည့်သည်စနစ်) သတိပေးချက်'
                  : '3. Guest Mode Notice'}
              </span>
            </h4>
            <p className="text-slate-600 pl-6">
              {lang === 'my'
                ? 'Guest Mode ဖြင့် သုံးစွဲပါက ဒေတာများကို သင့်ဖုန်း/စက်တွင်းရှိ Local Storage ၌သာ သိမ်းဆည်းမည်ဖြစ်ပြီး Cloud ပေါ်သို့ တင်မည် မဟုတ်ပါ။ စက်ပျက်စီးခြင်း သို့မဟုတ် Browser Cache/History ဖျက်လိုက်ပါက ဒေတာများ ဆုံးရှုံးနိုင်သဖြင့် ဒေတာ မပျောက်ပျက်စေရန် Google အကောင့်ဖြင့် ချိတ်ဆက်သုံးစွဲရန် အကြံပြုထားပါသည်။'
                : 'In Guest Mode, data is stored locally in your browser storage and is not synced to Cloud. Browser cache clears may erase local records, so Google Sign-In is recommended for data persistence.'}
            </p>
          </div>

          {/* Section 4: Financial Disclaimer */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span>
                {lang === 'my'
                  ? '၄။ ဘဏ္ဍာရေးဆိုင်ရာ အသိပေးချက် (Financial Disclaimer)'
                  : '4. Financial Disclaimer'}
              </span>
            </h4>
            <p className="text-slate-600 pl-6">
              {lang === 'my'
                ? 'ဤအက်ပလီကေးရှင်းသည် သုံးစွဲသူများ၏ ကိုယ်ပိုင် ဘဏ္ဍာရေး စီမံခန့်ခွဲမှုကို အကူအညီပေးရန် ရေးဆွဲထားသော စာရင်းကိုင် Tool တစ်ခု သာဖြစ်ပြီး၊ တရားဝင် ဘဏ်လုပ်ငန်း သို့မဟုတ် အာမခံချက်ပေးထားသော ဘဏ္ဍာရေး အကြံပေး လုပ်ငန်း မဟုတ်ပါကြောင်း သတိပေး အသိပေးအပ်ပါသည်။'
                : 'NgweSarYin is a personal budgeting tool designed to assist with bookkeeping and expense tracking. It is not an official banking institution or licensed investment advice service.'}
            </p>
          </div>

          {/* Section 5: Data Ownership & Rights */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-600" />
              <span>
                {lang === 'my'
                  ? '၅။ ဒေတာ စီမံခန့်ခွဲပိုင်ခွင့်နှင့် ဖျက်ဆီးခွင့်'
                  : '5. Data Control & Right to Erasure'}
              </span>
            </h4>
            <p className="text-slate-600 pl-6">
              {lang === 'my'
                ? 'သုံးစွဲသူများသည် မိမိတို့၏ စာရင်းဒေတာများကို အချိန်မရွေး Excel/JSON အဖြစ် စက်ထဲသို့ Export ထုတ်ယူနိုင်သကဲ့သို့ မလိုလားပါက "ဒေတာ အားလုံး ဖျက်မည်" ခလုတ်ဖြင့် အပြီးတိုင် ဖျက်ဆီးပစ်နိုင်ပါသည်။'
                : 'Users retain full ownership of their financial records. You can export data anytime in Excel or JSON formats, or permanently delete all data via the Data Management menu.'}
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 font-medium">
            {lang === 'my'
              ? 'အမြဲတမ်း လုံခြုံစိတ်ချရသော စာရင်းကိုင် စနစ်'
              : 'Secure & Confidential Bookkeeping System'}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-xs"
          >
            {lang === 'my' ? 'နားလည်ပါပြီ' : 'I Understand'}
          </button>
        </div>
      </div>
    </div>
  );
};
