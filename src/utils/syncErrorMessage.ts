// [v7.6.44] Part E — plain-Burmese sync-error text for the Account
// screen. The raw Firebase message (English, technical) must NEVER
// reach the user: it is mapped at display time to one short line.
// Only three outcomes exist — network, permission, or a generic
// retry line — and null/empty input maps to null so nothing renders,
// exactly as before. The sync/retry logic itself is untouched.
export function friendlySyncErrorMessage(
  raw: string | null | undefined,
  lang: 'my' | 'en',
): string | null {
  if (!raw || !raw.trim()) return null;
  const s = raw.toLowerCase();
  const isNetwork =
    s.includes('network') ||
    s.includes('connect') ||
    s.includes('timeout') ||
    s.includes('offline') ||
    s.includes('failed to fetch') ||
    s.includes('unreachable') ||
    s.includes('unavailable');
  if (isNetwork) {
    return lang === 'my'
      ? 'အင်တာနက်ချိတ်ဆက်မှု မရပါ။ ချိတ်ဆက်မှုကို စစ်ပြီး ပြန်ကြိုးစားပါ။'
      : 'No internet connection. Check your connection and try again.';
  }
  const isPermission =
    s.includes('permission') ||
    s.includes('denied') ||
    s.includes('not authorized') ||
    s.includes('insufficient');
  if (isPermission) {
    return lang === 'my'
      ? 'ဒေတာသိမ်းခွင့် မရှိပါ။ ပြန်ဝင်ပြီး ပြန်ကြိုးစားပါ။'
      : 'You do not have permission to save. Sign in again and retry.';
  }
  return lang === 'my'
    ? 'Sync မအောင်မြင်ပါ။ ခဏနေပြီး ပြန်ကြိုးစားပါ။'
    : 'Sync failed. Please try again shortly.';
}
