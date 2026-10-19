import React, { useState } from 'react';
import { X, Share2, Copy, Check, Download, Globe, ShieldAlert } from 'lucide-react';

interface ShareAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'my' | 'en';
}

export const ShareAppModal: React.FC<ShareAppModalProps> = ({
  isOpen,
  onClose,
  lang,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const officialUrl = 'https://ngwesaryin.pages.dev';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(officialUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      alert('Copy failed. Please copy manually.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
      <div 
        className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-base text-slate-900">
              {lang === 'my' ? 'အက်ပ်လင့်ခ်နှင့် မျှဝေရန်' : 'Share App'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          
          {/* Official URL Box */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-emerald-600" />
              {lang === 'my' ? 'အက်ပ်၏ တရားဝင် လိပ်စာ (Official Link)' : 'Official App URL'}
            </label>
            <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2">
              <span className="text-xs font-mono text-slate-600 truncate pl-1 select-all">
                {officialUrl}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  copied ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? (lang === 'my' ? 'ကူးပြီး' : 'Copied') : (lang === 'my' ? 'ကူးမည်' : 'Copy')}</span>
              </button>
            </div>
          </div>

          {/* PWA Install Guide */}
          <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-900">
              <Download className="w-4 h-4 text-emerald-600" />
              {lang === 'my' ? 'ဖုန်းတွင် App အဖြစ် သွင်းယူရန်' : 'Install as App'}
            </div>
            
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</div>
                <div>
                  <div className="text-xs font-bold text-slate-800 mb-0.5">Android (Chrome / Edge)</div>
                  <div className="text-[11px] text-slate-600 leading-relaxed">
                    {lang === 'my' ? 'Browser ရဲ့ ညာဘက်အပေါ်ထောင့်က (⋮) ကို နှိပ်ပြီး "Install App" သို့မဟုတ် "Add to Home screen" ကို ရွေးပါ။' : 'Tap the (⋮) menu and select "Install App" or "Add to Home screen".'}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</div>
                <div>
                  <div className="text-xs font-bold text-slate-800 mb-0.5">iPhone (Safari)</div>
                  <div className="text-[11px] text-slate-600 leading-relaxed">
                    {lang === 'my' ? 'အောက်ခြေက Share ခလုတ် (□↑) ကို နှိပ်ပြီး "Add to Home Screen" ကို ရွေးပါ။' : 'Tap the Share button (□↑) and select "Add to Home Screen".'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Small Note */}
          <div className="p-3 bg-slate-50 rounded-xl flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {lang === 'my' 
                ? 'မှတ်ချက် - အထက်ပါ Link ကိုသာ အသုံးပြုပါ။ အခြားလင့်ခ်များ (ဥပမာ - AI Studio) တွင် လိုင်းကျခြင်း၊ Error တက်ခြင်းများ ကြုံရနိုင်ပါသည်။'
                : 'Note: Please use the official link above. Other links (e.g. AI Studio previews) may experience connection or DNS errors.'}
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};
