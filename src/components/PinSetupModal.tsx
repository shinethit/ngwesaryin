import React, { useState } from 'react';
import { Lock, ShieldCheck, X, Check } from 'lucide-react';
import { hashPin, generateSalt } from '../utils/pinHash';

interface PinSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'my' | 'en';
  /**
   * Called with the PBKDF2 hashed PIN and its salt.
   * Never pass plaintext.
   */
  onSavePin: (pinHash: string, pinSalt: string) => void;
}

export const PinSetupModal: React.FC<PinSetupModalProps> = ({
  isOpen,
  onClose,
  lang,
  onSavePin,
}) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleFinalize = async (finalPin: string) => {
    setIsSaving(true);
    try {
      const salt = generateSalt();
      const pinHash = await hashPin(finalPin, salt);
      onSavePin(pinHash, salt);
      onClose();
    } catch (err) {
      console.error('[PinSetupModal] Failed to hash PIN:', err);
      setErrorMsg(
        lang === 'my'
          ? 'လျှို့ဝှက်နံပါတ်ကို လုံခြုံစွာ သိမ်းဆည်းရာတွင် အမှားရှိပါသည်။ ပြန်လည်ကြိုးစားပါ။'
          : 'Failed to securely save PIN. Please try again.'
      );
      setTimeout(() => {
        setConfirmPin('');
        setStep('create');
        setPin('');
      }, 1500);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyPress = (num: string) => {
    if (isSaving) return;
    setErrorMsg('');
    if (step === 'create') {
      if (pin.length < 4) {
        const nextPin = pin + num;
        setPin(nextPin);
        if (nextPin.length === 4) {
          setTimeout(() => {
            setStep('confirm');
          }, 300);
        }
      }
    } else {
      if (confirmPin.length < 4) {
        const nextConfirm = confirmPin + num;
        setConfirmPin(nextConfirm);
        if (nextConfirm.length === 4) {
          if (nextConfirm === pin) {
            handleFinalize(pin);
          } else {
            setErrorMsg(
              lang === 'my'
                ? 'လျှို့ဝှက်နံပါတ် မတူညီပါ။ ပြန်လည်ရိုက်ထည့်ပါ'
                : 'PINs do not match. Please try again.'
            );
            setTimeout(() => {
              setConfirmPin('');
              setStep('create');
              setPin('');
            }, 1000);
          }
        }
      }
    }
  };

  const handleDelete = () => {
    if (isSaving) return;
    setErrorMsg('');
    if (step === 'create') {
      setPin((prev) => prev.slice(0, -1));
    } else {
      setConfirmPin((prev) => prev.slice(0, -1));
    }
  };

  const activePin = step === 'create' ? pin : confirmPin;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-slate-900 text-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-800 p-6 flex flex-col items-center relative">
        <button
          type="button"
          onClick={onClose}
          disabled={isSaving}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 shadow-inner">
          <Lock className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-bold text-center">
          {step === 'create'
            ? lang === 'my'
              ? 'အက်ပ်လော့ခ်ချရန် PIN နံပါတ် အသစ် သတ်မှတ်ပါ'
              : 'Set a 4-Digit Security PIN'
            : lang === 'my'
            ? 'PIN နံပါတ်ကို နောက်တစ်ကြိမ် ထပ်ရိုက်ပါ'
            : 'Confirm Your 4-Digit PIN'}
        </h3>

        <p className="text-xs text-slate-400 text-center mt-1">
          {lang === 'my'
            ? 'App ကို လော့ခ်ချပြီး ပြန်ဖွင့်တိုင်း ဤ PIN နံပါတ်ကို အသုံးပြုရမည်ဖြစ်သည်'
            : 'Use this PIN to quickly unlock your financial dashboard'}
        </p>

        <p className="text-[10px] text-slate-500 text-center mt-1 bg-slate-800/60 px-3 py-1 rounded-lg border border-slate-700/50">
          {lang === 'my'
            ? '💡 လုံခြုံရေး - PIN ကို PBKDF2 ဖြင့် hash လုပ်ပြီး သိမ်းဆည်းပါသည် (plaintext မသိမ်းပါ)'
            : '🔒 Security: PIN is hashed with PBKDF2 before storage (never stored as plaintext)'}
        </p>

        {/* PIN Indicators */}
        <div className="flex gap-4 my-6">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-300 ${
                activePin.length > i
                  ? 'bg-emerald-500 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                  : 'bg-transparent border-slate-700'
              }`}
            />
          ))}
        </div>

        {errorMsg && (
          <div className="text-xs text-rose-400 font-medium mb-3 text-center animate-bounce">
            ⚠️ {errorMsg}
          </div>
        )}

        {isSaving && (
          <div className="text-xs text-emerald-400 font-medium mb-3 text-center">
            {lang === 'my' ? 'လုံခြုံစွာ သိမ်းဆည်းနေသည်...' : 'Securing PIN...'}
          </div>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[260px]">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              disabled={isSaving}
              onClick={() => handleKeyPress(num.toString())}
              className="w-16 h-14 rounded-2xl flex items-center justify-center text-xl font-bold bg-slate-800/80 hover:bg-slate-700 active:bg-slate-600 transition-colors cursor-pointer disabled:opacity-50"
            >
              {num}
            </button>
          ))}
          <div />
          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleKeyPress('0')}
            className="w-16 h-14 rounded-2xl flex items-center justify-center text-xl font-bold bg-slate-800/80 hover:bg-slate-700 active:bg-slate-600 transition-colors cursor-pointer disabled:opacity-50"
          >
            0
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleDelete}
            className="w-16 h-14 rounded-2xl flex items-center justify-center text-sm font-semibold text-slate-400 bg-slate-800/40 hover:bg-slate-700 active:bg-slate-600 transition-colors cursor-pointer disabled:opacity-50"
          >
            ⌫
          </button>
        </div>
      </div>
    </div>
  );
};