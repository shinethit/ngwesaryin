import React from 'react';
import { X, Fuel, Wallet, CheckCircle2, ArrowRight, Sparkles, HelpCircle, Layers, ShieldCheck, Zap } from 'lucide-react';

interface FuelExpenseGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'my' | 'en';
}

export const FuelExpenseGuideModal: React.FC<FuelExpenseGuideModalProps> = ({
  isOpen,
  onClose,
  lang,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-xs">
              <Fuel className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base flex items-center gap-1.5">
                <span>{lang === 'my' ? 'ဆီဖိုး ဘယ်နေရာမှာ ထည့်ရမလဲ?' : 'Where Should You Log Fuel?'}</span>
                <span className="px-2 py-0.5 rounded-full bg-white/25 text-white text-[10px] font-bold">
                  {lang === 'my' ? 'လမ်းညွှန်' : 'Guide'}
                </span>
              </h3>
              <p className="text-xs text-amber-100">
                {lang === 'my'
                  ? 'အလွန်ရိုးရှင်းပါသည် - မိမိကြိုက်နှစ်သက်ရာ (၁) နေရာတည်းတွင်သာ ထည့်သွင်းနိုင်ပါသည်'
                  : 'Very simple - choose either place, you never need to enter twice'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs sm:text-sm text-slate-700 leading-relaxed flex-1">
          {/* Top Golden Rule Banner */}
          <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-300 rounded-2xl shadow-2xs space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{lang === 'my' ? 'အဓိက အရေးကြီးဆုံး စိတ်ချရချက် (Golden Rule):' : 'Golden Rule:'}</span>
            </div>
            <p className="text-emerald-950 font-medium leading-relaxed pl-7">
              {lang === 'my'
                ? 'နေရာ (၂) ခုစလုံးသည် နောက်ကွယ်တွင် တစ်ခုတည်း ချိတ်ဆက်ထားသဖြင့် မိမိအဆင်ပြေရာ (၁) နေရာတည်းတွင်သာ ထည့်ရပါမည်။ ဘယ်နေရာက ထည့်ထည့် ပိုက်ဆံအိတ်ထဲမှ ငွေနုတ်ယူပေးပြီး ပင်မထွက်ငွေစာရင်းထဲ ရောက်ရှိမည်ဖြစ်၍ ၂ ခါ လုံးဝ ထပ်ထည့်ရန် မလိုပါ!'
                : 'Both places are synchronized to the exact same database. Enter in ONE place only. It automatically records to your expenses and deducts from your wallet!'}
            </p>
          </div>

          {/* Visual Comparison: Option 1 vs Option 2 */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span>{lang === 'my' ? 'ထည့်သွင်းနိုင်သော နည်းလမ်း (၂) ခု:' : 'Two Easy Ways to Enter:'}</span>
            </h4>

            {/* Option 1: Quick Expense */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-indigo-300 transition-all space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                    ၁
                  </span>
                  <strong className="text-slate-900 font-bold text-sm">
                    {lang === 'my' ? 'နည်းလမ်း (၁) - အလွယ်ဆုံး & အမြန်ဆုံးနည်း' : 'Method 1 - Quickest & Easiest'}
                  </strong>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold flex items-center gap-1">
                  <Zap className="w-3 h-3 text-indigo-600" />
                  <span>{lang === 'my' ? '၁၀ စက္ကန့်' : '10 Seconds'}</span>
                </span>
              </div>

              <div className="text-slate-600 space-y-1.5 pl-8">
                <p>
                  {lang === 'my' ? (
                    <>
                      ပင်မမျက်နှာပြင်ရှိ <strong className="text-indigo-900 font-bold">"+ ထွက်ငွေထည့်မည်"</strong> ကို နှိပ်ပြီး ကဏ္ဍတွင် <strong className="text-indigo-900 font-bold">"ယာဉ်စီမံခန့်ခွဲမှု"</strong> (သို့) <strong className="text-indigo-900 font-bold">"စက်သုံးဆီ"</strong> ရွေးချယ်ကာ <strong className="text-indigo-900 font-bold">ကျသင့်ငွေ (Amount)</strong> တွင် ဆီဖိုး ရိုက်ထည့်ပြီး သိမ်းဆည်းရုံပါပဲ။
                    </>
                  ) : (
                    'Tap "+ Add Expense" from main screen, choose "Vehicle/Fuel" category, enter the total fuel cost and save.'
                  )}
                </p>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>
                    {lang === 'my'
                      ? 'ဆီစားနှုန်း (km/L) တွက်ရန်မလိုဘဲ ငွေစာရင်းသာ အမြန်ထည့်လိုသူများအတွက် အကောင်းဆုံး ဖြစ်ပါသည်။'
                      : 'Best for quickly recording fuel expenses without needing odometer/mileage.'}
                  </span>
                </div>
              </div>
            </div>

            {/* Option 2: Full Mileage Calculation */}
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 hover:border-amber-400 transition-all space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-amber-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                    ၂
                  </span>
                  <strong className="text-slate-900 font-bold text-sm">
                    {lang === 'my' ? 'နည်းလမ်း (၂) - ဆီစားနှုန်း (km/L) ပါ တွက်လိုသောနည်း' : 'Method 2 - Full Mileage (km/L) Calculation'}
                  </strong>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  <span>{lang === 'my' ? 'ဆီစားနှုန်း အပြည့်အစုံ' : 'Full Analytics'}</span>
                </span>
              </div>

              <div className="text-slate-600 space-y-1.5 pl-8">
                <p>
                  {lang === 'my' ? (
                    <>
                      <strong className="text-amber-900 font-bold">"ယာဉ်စီမံမှု"</strong> တက်ဘ်ရှိ <strong className="text-amber-900 font-bold">'+ ဆီထည့်စာရင်း'</strong> မှဖြစ်စေ၊ ပင်မ ထွက်ငွေဖြည့်သွင်းရာတွင် <strong className="text-amber-900 font-bold">'ဆီစားနှုန်းပါ တွက်မည်'</strong> ကို ရွေး၍ဖြစ်စေ ဆီလီတာ (Liters)၊ ၁ လီတာဈေးနှင့် ဒိုင်ခွက်မိုင် (km) ပါ ထည့်သွင်းခြင်း ဖြစ်ပါသည်။
                    </>
                  ) : (
                    'Enter via "+ Add Fuel" in Vehicle Management, or select "Calculate Mileage" in the main expense form. Provide liters and odometer.'
                  )}
                </p>
                <div className="p-2.5 bg-white rounded-xl border border-amber-200 text-xs text-slate-600 flex items-center gap-2">
                  <span className="text-amber-600 font-bold">✓</span>
                  <span>
                    {lang === 'my'
                      ? '၁ လီတာ မည်မျှ ကီလိုမီတာ မောင်းနိုင်သလဲ (km/L) နှင့် ၁ ကီလိုမီတာ ကုန်ကျငွေကိုပါ အလိုအလျောက် တွက်ချက်ပေးပါသည်။ ပင်မ ထွက်ငွေစာရင်းထဲလည်း တပြိုင်နက် ရောက်ရှိပါမည်။'
                      : 'Calculates km per liter and cost per km. Automatically syncs to main expenses as well.'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick FAQ / Summary Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="bg-slate-100/90 px-3.5 py-2 font-bold text-xs text-slate-700">
              {lang === 'my' ? 'အမေးများသော မေးခွန်းများ (FAQ):' : 'Frequently Asked Questions:'}
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              <div className="p-3 bg-white space-y-1">
                <p className="font-bold text-slate-900">
                  {lang === 'my' ? 'မေး - နဂိုနေရာရော ယာဉ်စီမံမှုထဲရော ၂ ခုစလုံး ထည့်ရမှာလား?' : 'Q: Do I need to enter into both places?'}
                </p>
                <p className="text-emerald-700 font-semibold">
                  {lang === 'my'
                    ? 'ဖြေ - လုံးဝ မလိုပါ။ မိမိအဆင်ပြေရာ ၁ နေရာတည်းတွင်သာ ထည့်ရပါမည် (တစ်ခုတည်းသော စာရင်းထဲသို့သာ အလိုအလျောက် ပေါင်းထည့်ပေးပါသည်)။'
                    : 'A: Absolutely NO. Choose ONE place only. They are fully synchronized.'}
                </p>
              </div>

              <div className="p-3 bg-white space-y-1">
                <p className="font-bold text-slate-900">
                  {lang === 'my' ? 'မေး - ယာဉ်စီမံမှုထဲက ထည့်ရင် ပိုက်ဆံအိတ်ထဲက ငွေလျော့သွားမလား?' : 'Q: Does fuel logged in Vehicle Management deduct from wallet?'}
                </p>
                <p className="text-slate-600">
                  {lang === 'my'
                    ? 'ဖြေ - ဟုတ်ကဲ့၊ ရွေးချယ်ထားသော ပိုက်ဆံအိတ်ထဲမှ ငွေအလိုအလျောက် နုတ်ယူပေးပြီး ပင်မထွက်ငွေစာရင်းထဲ ရောက်ရှိပါမည်။'
                    : 'A: Yes, it deducts from your chosen wallet and appears in your main expense transactions.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Button */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
          >
            {lang === 'my' ? 'နားလည်ပါပြီ ✓' : 'Got it, thanks! ✓'}
          </button>
        </div>
      </div>
    </div>
  );
};
