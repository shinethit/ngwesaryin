import React, { useState, useEffect, useRef } from 'react';
import { Lock, Delete } from 'lucide-react';
import { FortuneLogo } from './FortuneLogo';
import { verifyPin, isHashedPinFormat } from '../utils/pinHash';

interface PinLockScreenProps {
  /**
   * Hashed PIN (64 hex chars) OR legacy plaintext PIN (4 digits).
   * We support both for backward compatibility during migration.
   */
  pinHash: string;
  /**
   * PBKDF2 salt (hex). Empty for legacy plaintext format.
   */
  pinSalt: string;
  lang: 'my' | 'en';
  onUnlock: () => void;
  // [v6.7g] Called when a legacy plaintext PIN successfully unlocks.
  //         Parent hashes + persists it. Optional — safe to omit.
  onLegacyPinVerified?: (plainPin: string) => void;
  onForgotPin?: () => void;
}

// [v7.5.55 E11] 5 failed attempts -> 30s lockout.
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30 * 1000;

export const PinLockScreen: React.FC<PinLockScreenProps> = ({
  pinHash,
  pinSalt,
  lang,
  onUnlock,
  onLegacyPinVerified,
  onForgotPin,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [lockoutLeft, setLockoutLeft] = useState(0);

  // [v7.5.55 E2] Re-entry guard is a ref, NOT state: setting state
  // mid-verification used to re-run this effect, whose cleanup marked
  // the in-flight PBKDF2 check as cancelled, so a correct PIN could
  // strand the user on "Verifying..." forever. Callbacks are also
  // held in refs so their (unstable) identities never re-trigger it.
  const verifyingRef = useRef(false);
  const onUnlockRef = useRef(onUnlock);
  onUnlockRef.current = onUnlock;
  const onLegacyPinVerifiedRef = useRef(onLegacyPinVerified);
  onLegacyPinVerifiedRef.current = onLegacyPinVerified;

  // Verify PIN asynchronously whenever 4 digits entered.
  // Deps are ONLY the inputs that define the check — never
  // isVerifying and never the (inline, new-every-render) callbacks.
  useEffect(() => {
    if (pin.length !== 4) return;
    if (verifyingRef.current) return;
    if (Date.now() < lockedUntil) return;

    let cancelled = false;
    verifyingRef.current = true;
    setIsVerifying(true);

    const runVerification = async () => {
      try {
        let isCorrect = false;
        if (isHashedPinFormat({ pin: pinHash, pinSalt })) {
          isCorrect = await verifyPin(pin, pinSalt, pinHash);
        } else {
          isCorrect = pin === pinHash;
        }

        // NOTE: deliberately NOT `if (cancelled) return` before
        // onUnlock — a cleanup must never swallow a correct PIN.
        if (isCorrect) {
          if (!isHashedPinFormat({ pin: pinHash, pinSalt }) && onLegacyPinVerifiedRef.current) {
            try {
              onLegacyPinVerifiedRef.current(pin);
            } catch (e) {
              console.warn('[PinLockScreen] legacy migration callback failed:', e);
            }
          }
          onUnlockRef.current();
        } else {
          if (cancelled) return;
          setError(true);
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try { navigator.vibrate(200); } catch {}
          }
          // [v7.5.55 E11] Count failures; lock out after 5.
          setFailedAttempts((prev) => {
            const next = prev + 1;
            if (next >= MAX_ATTEMPTS) {
              setLockedUntil(Date.now() + LOCKOUT_MS);
              return 0;
            }
            return next;
          });
          setTimeout(() => {
            if (cancelled) return;
            setPin('');
            setError(false);
          }, 500);
        }
      } catch (err) {
        console.warn('[PinLockScreen] verification error:', err);
        if (!cancelled) {
          setError(true);
          setTimeout(() => {
            if (cancelled) return;
            setPin('');
            setError(false);
          }, 500);
        }
      } finally {
        verifyingRef.current = false;
        if (!cancelled) setIsVerifying(false);
      }
    };

    runVerification();
    return () => {
      // Only cancels the post-failure pin-clear timeouts above;
      // it can no longer abort a correct unlock.
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, pinHash, pinSalt, lockedUntil]);

  // Lockout countdown (1s tick while locked out).
  useEffect(() => {
    if (!lockedUntil) return;
    const tick = () => setLockoutLeft(Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const isLockedOut = lockedUntil > Date.now() && lockoutLeft > 0;
  const lockedOutRef = useRef(false);
  lockedOutRef.current = isLockedOut;

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
    if (lockedOutRef.current) return;
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

        {error && !isLockedOut && (
          <div className="text-xs text-rose-400 font-semibold mb-4 animate-shake">
            {lang === 'my' ? '❌ PIN နံပါတ် မှားယွင်းနေပါသည်' : '❌ Incorrect PIN code'}
            {failedAttempts > 0 && (
              <span className="block text-slate-400 font-normal mt-1">
                {lang === 'my'
                  ? `မှားယွင်းမှု ${failedAttempts}/${MAX_ATTEMPTS} ကြိမ် — ${MAX_ATTEMPTS} ကြိမ်မှားပါက စက္ကန့် ၃၀ လော့ခ်ကျပါမည်`
                  : `Attempt ${failedAttempts}/${MAX_ATTEMPTS} — ${MAX_ATTEMPTS} failures lock for 30s`}
              </span>
            )}
          </div>
        )}

        {isLockedOut && (
          <div className="text-xs text-amber-400 font-semibold mb-4 text-center">
            {lang === 'my'
              ? `⏳ PIN ၅ ကြိမ် မှားသဖြင့် ${lockoutLeft} စက္ကန့် လော့ခ်ကျထားပါသည်`
              : `⏳ Locked for ${lockoutLeft}s after 5 wrong attempts`}
          </div>
        )}

        {isVerifying && !error && !isLockedOut && (
          <div className="text-xs text-slate-500 font-medium mb-4">
            {lang === 'my' ? 'စစ်ဆေးနေသည်...' : 'Verifying...'}
          </div>
        )}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3.5 sm:gap-4 w-full max-w-[280px]">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              disabled={isLockedOut}
              onClick={() => handleKeyPress(num.toString())}
              className="w-18 h-18 sm:w-20 sm:h-20 mx-auto rounded-full flex items-center justify-center text-2xl font-bold text-white bg-slate-900/90 hover:bg-slate-800 active:bg-slate-700 active:scale-95 transition-all shadow-md border border-slate-800 cursor-pointer disabled:opacity-40"
            >
              {num}
            </button>
          ))}
          <div className="flex items-center justify-center">
            {/* [v7.5.60 G-N1] Forgot-PIN is now text-sm/slate-300 (was
                text-[11px] text-slate-400 — too small and too faint). */}
            {onForgotPin && (
              <button
                type="button"
                onClick={onForgotPin}
                className="text-sm text-slate-300 hover:text-white text-center underline font-medium px-3 py-2 min-h-11"
                title="Forgot PIN"
              >
                {lang === 'my' ? 'မေ့သွားပြီ' : 'Forgot?'}
              </button>
            )}
          </div>
          <button
            type="button"
            disabled={isLockedOut}
            onClick={() => handleKeyPress('0')}
            className="w-18 h-18 sm:w-20 sm:h-20 mx-auto rounded-full flex items-center justify-center text-2xl font-bold text-white bg-slate-900/90 hover:bg-slate-800 active:bg-slate-700 active:scale-95 transition-all shadow-md border border-slate-800 cursor-pointer disabled:opacity-40"
          >
            0
          </button>
          <button
            type="button"
            disabled={isLockedOut}
            onClick={handleDelete}
            className="w-18 h-18 sm:w-20 sm:h-20 mx-auto rounded-full flex items-center justify-center text-slate-400 bg-slate-900/50 hover:bg-slate-800 active:bg-slate-700 active:scale-95 transition-all shadow-md border border-slate-800/80 cursor-pointer disabled:opacity-40"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
