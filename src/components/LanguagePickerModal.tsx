import React from 'react';
import { SUPPORTED_LANGS, type Lang } from '../utils/i18n';

interface LanguagePickerModalProps {
  isOpen: boolean;
  current: Lang;
  onSelect: (lang: Lang) => void;
  onClose?: () => void;
  isFirstLaunch?: boolean;
}

const FLAGS: Record<Lang, string> = {
  my: '🇲🇲',
  en: '🇬🇧',
  zh: '🇨🇳',
  th: '🇹🇭',
};

export const LanguagePickerModal: React.FC<LanguagePickerModalProps> = ({
  isOpen,
  current,
  onSelect,
  onClose,
  isFirstLaunch = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-5">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-100 flex items-center justify-center text-3xl">
            🌐
          </div>
          <h2 className="font-bold text-xl text-slate-900">
            ဘာသာစကား ရွေးချယ်ပါ
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Choose your preferred language
            <br />
            请选择您的语言 · เลือกภาษาของคุณ
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {SUPPORTED_LANGS.map((l) => {
            const isActive = current === l.code;
            return (
              <button
                key={l.code}
                type="button"
                onClick={() => onSelect(l.code)}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer text-center active:scale-95 ${
                  isActive
                    ? 'border-emerald-500 bg-emerald-50/60 shadow-sm'
                    : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
                }`}
              >
                <div className="text-3xl mb-1.5">{FLAGS[l.code]}</div>
                <div
                  className={`font-bold text-sm ${
                    isActive ? 'text-emerald-800' : 'text-slate-900'
                  }`}
                >
                  {l.nativeLabel}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {l.labelEn}
                </div>
              </button>
            );
          })}
        </div>

        <p className="text-[11px] text-slate-400 text-center leading-relaxed">
          {isFirstLaunch
            ? 'မြန်မာဘာသာသည် default ဖြစ်ပါသည် — နောက်မှ ပြောင်းလို့ရပါသည်'
            : 'Default is Myanmar — you can change anytime'}
        </p>

        {onClose && !isFirstLaunch && (
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors cursor-pointer"
          >
            ပိတ်မည် (Cancel)
          </button>
        )}
      </div>
    </div>
  );
};
