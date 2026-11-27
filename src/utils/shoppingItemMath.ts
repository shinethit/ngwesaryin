// [v7.6.63] Price / Qty / Total anchor rule — pure helper, one place.
//
// A shopping row has three numbers with one identity: amount =
// price x quantity. Filling ANY TWO must compute the third,
// synchronously, in the same keystroke — and must NEVER rewrite a
// value the user typed. The old code derived the amount-branch
// result in a 500ms setTimeout that read a single-field "last
// edited" ref at fire time: saving inside the 500ms window left
// price at 0 (and the save path then recomputed amount = price x
// qty = 0), and when price was already filled the timer derived
// QUANTITY from amount/price — the app "changed Qty on its own"
// after the user had typed Qty + Total.
//
// RULE (last-two-win): the two most-recently-edited fields are
// authoritative; the third is derived. `order` is the per-row edit
// history, oldest first, distinct fields only. A field whose value
// is not a finite number > 0 is not "known" and can never be a
// derivation source (so an empty/cleared field is never divided
// by, and a cleared field is never re-derived by its own edit —
// the just-edited field is never the derivation target). Name /
// unit / service-type edits do not touch the order (the caller
// only invokes this helper for the three numeric fields).
//
// SEEDS (the caller owns them): a fresh row starts with
// ['quantity'] — quantity defaults to 1, so typing price alone
// derives the amount, and typing the total alone derives the
// price. A restored row (edit mode) starts with
// ['price', 'quantity'] — its amount is the stored total, not a
// typed value, so the first amount edit derives the price (the
// reported case) while the first price/qty edit derives the
// total, as before.
//
// Rounding matches the old branches: 2 decimals (kyat-exact at
// 2dp, the same convention as the split helpers' toKyat).

export type ShoppingCalcField = 'price' | 'quantity' | 'amount';

export interface ShoppingItemNumbers {
  price: number;
  quantity: number;
  amount: number;
}

export interface ShoppingDerivation {
  /** The full consistent triple (unchanged when nothing derives). */
  values: ShoppingItemNumbers;
  /** Updated edit history (edited field moved to the end). */
  order: ShoppingCalcField[];
  /** The field this call derived, or null when nothing derived. */
  derivedField: ShoppingCalcField | null;
}

const ALL_FIELDS: ShoppingCalcField[] = ['price', 'quantity', 'amount'];

const round2 = (n: number): number => Number(n.toFixed(2));

const isKnown = (n: number): boolean =>
  typeof n === 'number' && Number.isFinite(n) && n > 0;

/** Edit history for a row the user has just started typing in. */
export function defaultShoppingEditOrder(): ShoppingCalcField[] {
  return ['quantity'];
}

/** Edit history for a row restored from a saved record. */
export function restoredShoppingEditOrder(): ShoppingCalcField[] {
  return ['price', 'quantity'];
}

export function deriveShoppingItem(
  values: ShoppingItemNumbers,
  editedField: ShoppingCalcField,
  prevOrder: ShoppingCalcField[],
): ShoppingDerivation {
  const order: ShoppingCalcField[] = [
    ...prevOrder.filter((f) => f !== editedField),
    editedField,
  ];
  const known = order.filter((f) => isKnown(values[f]));
  if (known.length < 2) return { values, order, derivedField: null };
  const sources = known.slice(-2);
  const target = ALL_FIELDS.find((f) => !sources.includes(f)) as ShoppingCalcField;
  // The just-edited field is never re-derived by its own edit:
  // clearing price must leave it cleared until the next edit.
  if (target === editedField) return { values, order, derivedField: null };
  const next: ShoppingItemNumbers = { ...values };
  if (target === 'amount') {
    next.amount = round2(values.price * values.quantity);
  } else if (target === 'price') {
    next.price = round2(values.amount / values.quantity);
  } else {
    next.quantity = round2(values.amount / values.price);
  }
  return { values: next, order, derivedField: target };
}
