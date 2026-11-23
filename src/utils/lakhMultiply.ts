// [v7.6.21] B-19 consolidation: the one lakh-multiply guard.
// Three modals (DebtModal, ReconcileBalanceModal, RepaymentModal)
// shared the same guards — parse the field (Myanmar digits
// accepted), ignore empty/zero/negative values, ignore a second tap
// once converted, and refuse a value already at kyat scale
// (>= 100,000) with the same message instead of exploding it to
// billions. The helper returns what happened; each modal keeps its
// own state writes local (including RepaymentModal clearing its
// error on success — the other two do not). Pure function.
import { parseMyanmarNumber } from './myanmarDigits';

export type LakhMultiplyOutcome =
  | { kind: 'noop' }
  | { kind: 'refused'; message: string }
  | { kind: 'ok'; value: string };

export function lakhMultiplyGuard(
  rawInput: string,
  lakhConverted: boolean,
  lang: 'my' | 'en',
): LakhMultiplyOutcome {
  const val = parseMyanmarNumber(rawInput);
  if (!val || val <= 0) return { kind: 'noop' };
  if (lakhConverted) return { kind: 'noop' };
  // [v7.5.55 D31] A value already at kyat scale must not be
  // multiplied: an edited debt's stored total (e.g. 2,500,000)
  // would explode to 250,000,000,000 with one tap. 100,000+ in
  // the field is kyat already (100,000 lakh = 10 billion MMK is
  // not a real debt).
  if (val >= 100000) {
    return {
      kind: 'refused',
      message:
        lang === 'my'
          ? 'ဒီပမာဏက ကျပ်နဲ့ ရိုက်ထားပြီးသား ဖြစ်ပါတယ် — သိန်းနဲ့ ထပ်မြှောက်စရာ မလိုပါဘူး'
          : 'This amount is already in kyat — no need to multiply by 100,000',
    };
  }
  return { kind: 'ok', value: String(Math.round(val * 100000)) };
}
