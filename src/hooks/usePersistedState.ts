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

  const setPersistedState = (value: T | ((prev: T) => T)) => {
    const nextValue = value instanceof Function ? value(stateRef.current) : value;
    setState(nextValue);
  };

  return [state, setPersistedState];
}