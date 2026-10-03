import React, { useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';

interface ToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className="fixed bottom-24 right-4 z-[100] animate-fadeIn">
      <div className="bg-slate-900/90 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-800">
        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        <span className="text-sm font-semibold pr-2">{message}</span>
      </div>
    </div>
  );
};
