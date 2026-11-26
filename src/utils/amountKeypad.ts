// [v7.6.57] Amount keypad — pure key-press reducer for the entry-form
// keypad. The keypad only EDITS the amount string; parsing stays
// parseMyanmarNumber (the same function the typed input uses), so a
// keypad-built value parses identically to the same typed text.
// Myanmar digits already in the string are left as-is: the parser
// normalises mixed scripts, so keypad digits appended after Myanmar
// digits still parse correctly.

export type KeypadKey =
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '.'
  | 'back'
  | 'clear';

/** Apply one keypad key to the current amount string. */
export function keypadPress(current: string, key: KeypadKey): string {
  if (key === 'clear') return '';
  if (key === 'back') return current.slice(0, -1);
  if (key === '.') {
    if (current.includes('.')) return current;
    return current === '' ? '0.' : current + '.';
  }
  return current + key;
}
