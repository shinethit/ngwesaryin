import React, { useState, useEffect } from 'react';
import { Lock, Delete, KeyRound, LogOut } from 'lucide-react';
import { FortuneLogo } from './FortuneLogo';

interface PinLockScreenProps {
  correctPin: string;
  lang: 'my' | 'en';
  onUnlock: () => void;
  onForgotPin?: () => void;
}

export const PinLockScreen: React.FC<PinLockScreenProps> = ({
  correctPin,
  lang,
  onUnlock,
  onForgotPin,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (pin.length === 4) {
      if (pin === correctPin) {
        onUnlock();
      } else {
        setError(true);
        if (navigator.vibrate) navigator.vibrate(200);
        setTimeout(() => {
          setPin('');
          setError(false);
        }, 500);
      }
    }
  }, [pin, correctPin, onUnlock]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleKeyPress = (num: string) => {
    setPin((prev) => {
      if (prev.length < 4) {
        return prev + num;
      }
      return prev;
    });
    setError(false);
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-4 select-none">
      <div className="w-full max-w-sm flex flex-col items-center animate-fadeIn">
        <div className="relative">
          <FortuneLogo size="lg" style="gold_ingot" animate={false} />
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-xs shadow-md">
            <Lock className="w-3.5 h-3.5" />
          </div>
        </div>

        <h2 className="mt-5 text-xl sm:text-2xl font-bold text-white tracking-tight">
          {lang === 'my' ? 'လျှို့ဝှက်နံပါတ် ရိုက်ထည့်ပါ' : 'Enter Security PIN'}
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-400 text-center">
          {lang === 'my'
            ? 'ငွေစာရင်း လုံခြုံရေးအတွက် App ကို လော့ခ်ချထားပါသည်'
            : 'App is locked to protect your personal financial privacy'}
        </p>

        {/* PIN Dots */}
        <div className="flex gap-4 mt-6 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                pin.length > i
                  ? 'bg-emerald-500 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.7)] scale-110'
                  : 'bg-transparent border-slate-700'
              } ${error ? 'border-rose-500 bg-rose-500 animate-shake' : ''}`}
            />
          ))}
        </div>

        {error && (
          <div className="text-xs text-rose-400 font-semibold mb-4 animate-shake">
            {lang === 'my' ? '❌ PIN နံပါတ် မှားယွင်းနေပါသည်' : '❌ Incorrect PIN code'}
          </div>
        )}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3.5 sm:gap-4 w-full max-w-[280px]">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num.toString())}
              className="w-18 h-18 sm:w-20 sm:h-20 mx-auto rounded-full flex items-center justify-center text-2xl font-bold text-white bg-slate-900/90 hover:bg-slate-800 active:bg-slate-700 active:scale-95 transition-all shadow-md border border-slate-800 cursor-pointer"
            >
              {num}
            </button>
          ))}
          <div className="flex items-center justify-center">
            {onForgotPin && (
              <button
                type="button"
                onClick={onForgotPin}
                className="text-[11px] text-slate-400 hover:text-slate-200 text-center underline font-medium p-2"
                title="Forgot PIN"
              >
                {lang === 'my' ? 'မေ့သွားပြီ' : 'Forgot?'}
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="w-18 h-18 sm:w-20 sm:h-20 mx-auto rounded-full flex items-center justify-center text-2xl font-bold text-white bg-slate-900/90 hover:bg-slate-800 active:bg-slate-700 active:scale-95 transition-all shadow-md border border-slate-800 cursor-pointer"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="w-18 h-18 sm:w-20 sm:h-20 mx-auto rounded-full flex items-center justify-center text-slate-400 bg-slate-900/50 hover:bg-slate-800 active:bg-slate-700 active:scale-95 transition-all shadow-md border border-slate-800/80 cursor-pointer"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
