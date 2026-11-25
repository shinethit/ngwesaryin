// [v7.6.36] Full-screen statement preview — the iOS standalone
// fallback. An installed PWA on iPhone has no print sheet, so
// window.print() silently does nothing there; this overlay shows
// the same statement content on screen, explains the situation,
// and offers an open-in-browser link (the saved payload restores
// in a real browser tab, where printing works) plus a Print
// button that attempts window.print() synchronously in the tap
// gesture. Rendered through a portal as #ngwe-preview-root: the
// print stylesheet shows only that node in print and hides the
// toolbar (.stmt-no-print), so printing from the preview yields
// exactly the statement — no app chrome.
import React from 'react';
import { createPortal } from 'react-dom';
import { StatementPrintView } from './StatementPrintView';
import type { StatementData } from '../utils/statementData';
import { statementPreviewUrl } from '../utils/printFallback';

interface StatementPrintPreviewProps {
  data: StatementData;
  lang: 'my' | 'en';
  walletScopeLabel: string;
  onPrint: () => void;
  onClose: () => void;
}

export const StatementPrintPreview: React.FC<StatementPrintPreviewProps> = ({
  data,
  lang,
  walletScopeLabel,
  onPrint,
  onClose,
}) => {
  return createPortal(
    <div
      id="ngwe-preview-root"
      className="fixed inset-0 z-50 overflow-y-auto bg-white text-slate-900"
      role="dialog"
      aria-modal="true"
      aria-label={lang === 'my' ? 'စာရင်းရှင်းတမ်း အစမ်းကြည့်ခြင်း' : 'Statement preview'}
    >
      <div className="stmt-no-print sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-3 py-2.5 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2">
          <div className="w-full">
            <div className="text-sm font-bold">
              {lang === 'my' ? 'စာရင်းရှင်းတမ်း' : 'Statement'}
            </div>
            <div className="text-[11px] leading-snug text-slate-500">
              {lang === 'my'
                ? 'iPhone မှာ Home Screen က ဖွင့်ထားရင် Print မရပါ — “Browser မှာ ဖွင့်မည်” ကို နှိပ်ပြီး Safari မှာ Share → Print လုပ်ပါ။'
                : 'Printing is unavailable from the installed app on iPhone — open this statement in the browser, then use Share → Print.'}
            </div>
          </div>
          <button
            type="button"
            onClick={onPrint}
            className="min-h-[44px] rounded-xl bg-indigo-600 px-3 py-2 text-sm font-bold text-white shadow-xs transition-all active:scale-[0.99] cursor-pointer"
          >
            {lang === 'my' ? '🖨️ Print လုပ်မည်' : '🖨️ Print'}
          </button>
          <a
            href={statementPreviewUrl()}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-[44px] items-center rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 cursor-pointer"
          >
            {lang === 'my' ? 'Browser မှာ ဖွင့်မည်' : 'Open in browser'}
          </a>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 cursor-pointer"
          >
            {lang === 'my' ? 'ပိတ်မည်' : 'Close'}
          </button>
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 py-4">
        <StatementPrintView data={data} lang={lang} walletScopeLabel={walletScopeLabel} />
      </div>
    </div>,
    document.body,
  );
};
