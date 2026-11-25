import React, { useEffect, useRef, useState } from 'react';

// [v7.6.44] ONE shared search-input pattern for the whole app — the
// fix-once answer to typing lag in the search boxes.
//
// The problem it solves: a search box whose raw keystroke state
// lives in the same component as the list it filters re-renders the
// WHOLE list view on every keystroke (measured: Records search echo
// 49ms unthrottled / 162ms at 4x CPU throttle with 300 records, and a
// 289ms filter spike at 1,500 records). The input below owns its own
// raw text state, so typing re-renders ONLY this input; the parent
// learns the query once per pause (150ms, the delay the Records and
// Shops searches already used) and the list re-filters once.
//
// Props: `value` is the parent's DEBOUNCED value. External writers
// (clear button, suggestion tap, global-search seed) keep working:
// whenever `value` changes to something different from the typed
// text, the input adopts it. `onDebouncedChange` must be a stable
// setter (a useState setter qualifies); `inputRef` is honoured for
// callers that focus the input on open (Global Search).
export interface DebouncedSearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'defaultValue' | 'ref'> {
  value: string;
  onDebouncedChange: (value: string) => void;
  delay?: number;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export const DebouncedSearchInput = React.memo(function DebouncedSearchInput({
  value,
  onDebouncedChange,
  delay = 150,
  inputRef,
  ...inputProps
}: DebouncedSearchInputProps) {
  const [text, setText] = useState(value);
  const reportRef = useRef(onDebouncedChange);
  reportRef.current = onDebouncedChange;

  // Adopt externally-set values (clear / seed / suggestion tap).
  // The mount pass is skipped: useState(value) already holds it.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    setText(value);
  }, [value]);

  // Report pauses, not keystrokes. When the typed text already
  // equals the parent value (e.g. right after an external adopt),
  // no timer is needed.
  useEffect(() => {
    if (text === value) return undefined;
    const t = setTimeout(() => reportRef.current(text), delay);
    return () => clearTimeout(t);
  }, [text, value, delay]);

  return (
    <input
      {...inputProps}
      ref={inputRef}
      value={text}
      onChange={(e) => setText(e.target.value)}
    />
  );
});

export default DebouncedSearchInput;
