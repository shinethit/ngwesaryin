import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, X } from 'lucide-react';

// [v7.5.60 G-N3] Toasts now carry a type — errors no longer look like
// successes. Error/warning toasts stay up longer (5s) and can be
// dismissed with an X; success stays 3s.
export type ToastType = 'success' | 'warning' | 'error';

interface ToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
  type?: ToastType;
}

export const Toast: React.FC<ToastProps> = ({ message, onClose, duration, type = 'success' }) => {
  // Errors/warnings get more reading time than a quick success note.
  const effectiveDuration = duration ?? (type === 'success' ? 3000 : 5000);

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, effectiveDuration);
    return () => clearTimeout(timer);
  }, [effectiveDuration, onClose]);

  const icon =
    type === 'error' ? (
      <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
    ) : type === 'warning' ? (
      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
    ) : (
      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
    );

  const border =
    type === 'error'
      ? 'border-rose-500/50'
      : type === 'warning'
      ? 'border-amber-500/50'
      : 'border-slate-800';

  return (
    <div className="fixed bottom-24 right-4 left-4 sm:left-auto z-[100] animate-fadeIn flex justify-end pointer-events-none">
      <div
        className={`pointer-events-auto bg-slate-900/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border ${border} max-w-md`}
      >
        {icon}
        <span className="text-sm font-semibold pr-2 break-words min-w-0 flex-1">{message}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss"
          className="p-1.5 -mr-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
