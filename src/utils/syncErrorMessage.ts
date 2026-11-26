// [v7.6.44] Part E — plain-Burmese sync-error text for the Account
// screen. The raw Firebase message (English, technical) must NEVER
// reach the user: it is mapped at display time to one short line.
// [v7.6.56] Four outcomes exist — token, network, permission, or a
// generic retry line. The TOKEN branch comes FIRST: the 2026-11-26
// failure was the Auth token endpoint unreachable (every write and
// delete timing out while the internet worked), and its raw text
// ('auth/network-request-failed') contains 'network', so the old
// order mislabelled it "No internet". Null/empty input maps to null
// so nothing renders, exactly as before. The sync/retry logic itself
// is untouched.
export function friendlySyncErrorMessage(
  raw: string | null | undefined,
  lang: 'my' | 'en',
): string | null {
  if (!raw || !raw.trim()) return null;
  const s = raw.toLowerCase();
  // The Cloud sign-in token could not refresh: the change is saved
  // on-device and will sync when the connection recovers. Triggers
  // on the Burmese word, the English word, the Firebase code, and
  // the AuthContext 401/token-expired wording.
  const isToken =
    s.includes('တိုကင်') ||
    s.includes('token') ||
    s.includes('auth/network-request-failed') ||
    s.includes('token-expired');
  if (isToken) {
    return lang === 'my'
      ? 'Cloud အကောင့် တိုကင် ပြန်လည်ရယူ၍ မရပါ။ ပြောင်းလဲမှုကို စက်ထဲတွင် သိမ်းထားပြီး ချိတ်ဆက်မှု ပြန်ရလျှင် အလိုအလျောက် ပို့ပေးပါမည်။'
      : 'Could not refresh the Cloud sign-in token. Your change is saved on this device and will sync automatically when the connection recovers.';
  }
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
