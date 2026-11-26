import { useState, useEffect, useRef } from 'react';

export function usePersistedState<T>(
  key: string,
  initial: T,
  validator?: (data: any) => data is T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        // ⭐ Defensive: legacy raw string ဖြစ်နေရင် JSON.parse မလုပ်ဘဲ as-is ပြန်ပေး
        // 'my', 'en', 'true', 'false', 'null' တွေ JSON tokens တွေနဲ့ မတူဘူး
        const isLikelyRawString =
          !saved.startsWith('"') &&
          !saved.startsWith('{') &&
          !saved.startsWith('[') &&
          !saved.startsWith('t') &&
          !saved.startsWith('f') &&
          !saved.startsWith('n') &&
          !/^-?\d/.test(saved);

        if (isLikelyRawString) {
          // Legacy format — assume it's the raw string value
          if (!validator || validator(saved)) {
            return saved as unknown as T;
          }
        }

        const parsed = JSON.parse(saved);
        if (!validator || validator(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn(`Error parsing persisted state for ${key}:`, e);
    }
    return initial;
  });

  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
    try {
      localStorage.setItem(key, JSON.stringify(state));  // ✅ always JSON
    } catch (e) {
      console.warn(`Error persisting state for ${key}:`, e);
    }
  }, [key, state]);

  // [v7.5.95 U2] Same-tab sync: useState reads localStorage once at mount,
  // so a second mounted component sharing this key (e.g. TransactionModal
  // while AddMaintenanceModal saves a custom unit) would keep a stale
  // snapshot until reload. The setter broadcasts the new value; every
  // mounted instance with the same key adopts it. The dispatching
  // instance receives its own event with the identical reference, so
  // React bails out — no loop (dispatch happens only in the setter,
  // never in an effect).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ key: string; value: unknown }>).detail;
      if (!detail || detail.key !== key) return;
      if (!validator || validator(detail.value)) {
        setState(detail.value as T);
      }
    };
    window.addEventListener('ngwe:persisted-state', handler);
    return () => window.removeEventListener('ngwe:persisted-state', handler);
  }, [key, validator]);

  const setPersistedState = (value: T | ((prev: T) => T)) => {
    const nextValue = value instanceof Function ? value(stateRef.current) : value;
    // [v7.6.49] Advance the ref SYNCHRONOUSLY: two functional
    // updates in one handler (the multi-row maintenance edit's
    // delete-filter + prepend) must chain like React's setState, or
    // the first is silently lost and the edited visit duplicates
    // (the old record survives next to its replacement, doubling
    // the visit's cost in every total). The render effect below
    // re-assigns the same value — harmless. The same-reference
    // bail-out for the dispatching instance's own broadcast is
    // unchanged.
    stateRef.current = nextValue;
    setState(nextValue);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('ngwe:persisted-state', { detail: { key, value: nextValue } })
      );
    }
  };

  return [state, setPersistedState];
}