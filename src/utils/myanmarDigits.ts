// [v7.5.55] Myanmar digit support — numbers must be typeable in Myanmar digits
// (၀-၉) everywhere a number is entered (amounts, odometer, PSI, prices, debts,
// budgets, wallet balance, shop prices) and in search amount matching.
// All parse paths should normalise through these helpers instead of raw
// parseFloat/Number, which silently return NaN for Myanmar digits.

const MYANMAR_ZERO = '၀'.charCodeAt(0); // U+1000
const LATIN_ZERO = '0'.charCodeAt(0);

/** Convert Myanmar digits (၀-၉) in a value to Latin digits (0-9). */
export function toLatinDigits(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code >= MYANMAR_ZERO && code <= MYANMAR_ZERO + 9) {
      out += String.fromCharCode(LATIN_ZERO + (code - MYANMAR_ZERO));
    } else {
      out += s[i];
    }
  }
  return out;
}

/** Convert Latin digits (0-9) in a value to Myanmar digits (၀-၉). */
export function toMyanmarDigits(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code >= LATIN_ZERO && code <= LATIN_ZERO + 9) {
      out += String.fromCharCode(MYANMAR_ZERO + (code - LATIN_ZERO));
    } else {
      out += s[i];
    }
  }
  return out;
}

/**
 * Parse a number that may be typed in Myanmar digits (၀-၉) or Latin digits.
 * Returns NaN when the value is not a number (same contract as parseFloat).
 */
export function parseMyanmarNumber(value: string | number | null | undefined): number {
  if (typeof value === 'number') return value;
  if (value === null || value === undefined) return NaN;
  const cleaned = toLatinDigits(String(value)).replace(/,/g, '').trim();
  if (cleaned === '') return NaN;
  return parseFloat(cleaned);
}

/** True when the value contains at least one Myanmar digit. */
export function containsMyanmarDigits(value: string | number | null | undefined): boolean {
  if (value === null || value === undefined) return false;
  const s = String(value);
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code >= MYANMAR_ZERO && code <= MYANMAR_ZERO + 9) return true;
  }
  return false;
}
