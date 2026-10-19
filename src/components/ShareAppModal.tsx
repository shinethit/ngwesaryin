import React, { useState } from 'react';
import { X, Share2, Copy, Check, Download, Globe, ShieldAlert, QrCode, FileText } from 'lucide-react';

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
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  if (!isOpen) return null;

  const officialUrl = 'https://ngwesaryin.pages.dev';
  
  const shareText = `📱 NgweSarYin (ငွေစာရင်း) App
✨ ကိုယ်ပိုင်/မိသားစု ငွေစာရင်း၊ အကြွေးနှင့် ယာဉ်စီမံခန့်ခွဲမှု အားလုံးကို တစ်နေရာတည်းမှာ စီမံနိုင်ပါပြီ။
✅ ဝင်ငွေ/ထွက်ငွေ မှတ်တမ်း (ငွေကြေး ၁၁ မျိုး)
✅ အကြွေး ရရန်/ပေးရန် စာရင်း
✅ ကားနှင့် ဆိုင်ကယ်များ၏ ဆီဖိုး၊ ပြုပြင်စရိတ်နှင့် သက်တမ်းသတိပေးချက်များ
✅ ဖုန်း၊ တက်ဘလက်၊ ကွန်ပျူတာများအကြား Real-time Sync
🔗 အက်ပ်အသုံးပြုရန် - ${officialUrl}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(officialUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (e) {
      alert('Copy failed. Please copy manually.');
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } catch (e) {
      alert('Copy failed. Please copy manually.');
    }
  };

  // Generate QR Code via public API
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(officialUrl)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
      <div 
        className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
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
          
          {/* QR Code & Link Section */}
          <div className="flex flex-col items-center justify-center space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="w-32 h-32 bg-white p-2 rounded-xl shadow-sm border border-slate-200 flex items-center justify-center">
              <img src={qrCodeUrl} alt="QR Code" className="w-full h-full object-contain" crossOrigin="anonymous" />
            </div>
            <div className="text-center">
              <p className="text-[11px] text-slate-500 mb-2">
                {lang === 'my' ? 'ဖုန်းကင်မရာဖြင့် စကန်ဖတ်ပါ' : 'Scan with phone camera'}
              </p>
              <div className="flex items-center justify-between gap-2 p-1.5 bg-white border border-slate-300 rounded-xl w-full max-w-[280px]">
                <span className="text-xs font-mono text-slate-600 truncate pl-2 select-all">
                  {officialUrl}
                </span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    copiedLink ? 'bg-emerald-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? (lang === 'my' ? 'ကူးပြီး' : 'Copied') : (lang === 'my' ? 'ကူးမည်' : 'Copy')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Shareable Text Summary */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                {lang === 'my' ? 'App အကြောင်း အတိုချုပ် (Copy ကူးရန်)' : 'App Summary (Copy to share)'}
              </label>
              <button
                type="button"
                onClick={handleCopyText}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  copiedText ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                }`}
              >
                {copiedText ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedText ? (lang === 'my' ? 'ကူးပြီး' : 'Copied') : (lang === 'my' ? 'အကုန်ကူးမည်' : 'Copy All')}</span>
              </button>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 whitespace-pre-wrap select-all leading-relaxed">
              {shareText}
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

        </div>
      </div>
    </div>
  );
};
