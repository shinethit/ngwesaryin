// [v7.5.60 G-M3/G-M4] Every Firebase auth error code maps to a plain
// Burmese message WITH a next action. Raw codes (auth/wrong-password
// etc.) are NEVER shown to the user — they go to the console only.
export interface AuthErrorDetails {
  title: string;
  message: string;
  suggestion?: string;
  isVpnRelated?: boolean;
  isIframeRelated?: boolean;
}

// [v7.5.60 G-M4] ONE VPN message everywhere in the app (login,
// account modal, error mapper): "VPN ဖွင့်ပြီး ပြန်ကြိုးစားပါ၊
// မရလျှင် Email ဖြင့် ဝင်ပါ". The old contradictory advice
// ("VPN ပိတ်ပါ" here vs "VPN ဖွင့်ပါ" elsewhere) is gone.
export const VPN_ADVICE_MY = 'VPN ဖွင့်ပြီး ပြန်ကြိုးစားပါ၊ မရလျှင် Email ဖြင့် ဝင်ပါ';
export const VPN_ADVICE_EN = 'Turn on VPN and try again — if it still fails, sign in with Email';

export function getAuthErrorDetails(error: any, lang: 'my' | 'en'): AuthErrorDetails {
  const errCode = error?.code || '';
  const errStr = String(error?.message || error || '').toLowerCase();

  // Raw codes are for debugging only — never rendered to the user.
  if (errCode) console.warn('[auth] Firebase error code:', errCode);

  const isVpn =
    errStr.includes('network') ||
    errStr.includes('connect') ||
    errStr.includes('timeout') ||
    errCode === 'auth/network-request-failed';

  const isIframe =
    errStr.includes('iframe') ||
    errStr.includes('origin') ||
    errStr.includes('popup-blocked') ||
    errCode === 'auth/popup-blocked' ||
    errCode === 'auth/unauthorized-domain';

  if (errCode === 'auth/popup-closed-by-user') {
    return {
      title: lang === 'my' ? 'Sign in အဆင့်ကို ပိတ်လိုက်ပါသည်' : 'Sign in cancelled',
      message: lang === 'my' ? 'Google Sign in ဝင်ရောက်ခြင်းကို ပယ်ဖျက်လိုက်ပါသည်။ ပြန်ကြိုးစားလိုက Google ခလုတ်ကို ထပ်နှိပ်ပါ။' : 'Sign in window was closed before completing. Tap the Google button to try again.',
    };
  }

  if (errCode === 'auth/unauthorized-domain' || isIframe) {
    return {
      title: lang === 'my' ? 'Browser Preview ထိန်းချုပ်မှု သတိပေးချက်' : 'Domain / Preview Constraint',
      message: lang === 'my'
        ? 'Preview iFrame အတွင်း Google Login တိုက်ရိုက်ဝင်ရောက်၍ မရပါက အပေါ်ဘက်ရှိ "Open in new tab" ခလုတ်ကို နှိပ်၍ Sign in ဝင်ရောက်ပါ။'
        : 'Google Sign in may be restricted inside an embedded iFrame. Please click "Open in new tab" above to sign in.',
      isIframeRelated: true,
    };
  }

  if (isVpn) {
    return {
      title: lang === 'my' ? 'ကွန်ရက် ချိတ်ဆက်မှု အခက်အခဲ' : 'Network Connection Issue',
      message: lang === 'my' ? VPN_ADVICE_MY : VPN_ADVICE_EN,
      isVpnRelated: true,
    };
  }

  // Per-code friendly messages — each with a concrete next step.
  switch (errCode) {
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return {
        title: lang === 'my' ? 'စကားဝှက် မှားနေပါသည်' : 'Wrong password',
        message: lang === 'my'
          ? 'စကားဝှက် မှားနေပါသည်။ ပြန်ရိုက်ကြည့်ပါ — မေ့သွားလျှင် အောက်က "စကားဝှက် မေ့သွားပြီ" ကို နှိပ်ပါ။'
          : 'The password is incorrect. Try again — or tap "Forgot password?" below if you forgot it.',
      };
    case 'auth/user-not-found':
      return {
        title: lang === 'my' ? 'အကောင့် မတွေ့ပါ' : 'Account not found',
        message: lang === 'my'
          ? 'ဤ Email ဖြင့် အကောင့် မရှိသေးပါ။ Email မှန်မမှန် စစ်ပါ၊ သို့မဟုတ် "အကောင့်သစ်ဖွင့်ရန်" ဖြင့် အကောင့်အသစ် ဖွင့်ပါ။'
          : 'No account exists for this email. Check the spelling, or create a new account with "Sign Up".',
      };
    case 'auth/invalid-email':
      return {
        title: lang === 'my' ? 'Email ပုံစံ မမှန်ပါ' : 'Invalid email',
        message: lang === 'my'
          ? 'Email လိပ်စာ ပုံစံ မမှန်ပါ။ ဥပမာ — yourname@gmail.com ပုံစံ မှန်မမှန် စစ်ပါ။'
          : 'The email address format is wrong. Check it looks like yourname@gmail.com.',
      };
    case 'auth/email-already-in-use':
      return {
        title: lang === 'my' ? 'Email ကို သုံးပြီးသားပါ' : 'Email already in use',
        message: lang === 'my'
          ? 'ဤ Email ဖြင့် အကောင့် ရှိပြီးသားပါ။ "Sign In သို့" ကို နှိပ်ပြီး ဝင်ပါ — စကားဝှက် မေ့လျှင် "စကားဝှက် မေ့သွားပြီ" ကို သုံးပါ။'
          : 'An account with this email already exists. Switch to "Sign In" — or use "Forgot password?" if you forgot the password.',
      };
    case 'auth/weak-password':
      return {
        title: lang === 'my' ? 'စကားဝှက် အားနည်းပါသည်' : 'Password too weak',
        message: lang === 'my'
          ? 'စကားဝှက် အားနည်းပါသည်။ အနည်းဆုံး စာလုံး ၆ လုံး ပါရပါမည် — စာလုံး + ဂဏန်း ရောထည့်လျှင် ပိုလုံခြုံပါသည်။'
          : 'The password is too weak. Use at least 6 characters — mixing letters and numbers is safer.',
      };
    case 'auth/too-many-requests':
      return {
        title: lang === 'my' ? 'ခဏခဏ ကြိုးစားလွန်းပါသည်' : 'Too many attempts',
        message: lang === 'my'
          ? 'မှားယွင်းစွာ ခဏခဏ ကြိုးစားထားသဖြင့် ယာယီ ပိတ်ထားပါသည်။ ခဏစောင့်ပြီးမှ ပြန်ကြိုးစားပါ — စကားဝှက် မေ့လျှင် "စကားဝှက် မေ့သွားပြီ" ကို သုံးပါ။'
          : 'Too many failed attempts — temporarily locked. Wait a while and try again, or use "Forgot password?".',
      };
    case 'auth/user-disabled':
      return {
        title: lang === 'my' ? 'အကောင့် ပိတ်ထားပါသည်' : 'Account disabled',
        message: lang === 'my'
          ? 'ဤအကောင့်ကို ပိတ်ထားပါသည်။ အကူအညီ လိုအပ်ပါက App စီမံခန့်ခွဲသူကို ဆက်သွယ်ပါ။'
          : 'This account has been disabled. Please contact the app administrator for help.',
      };
    case 'auth/account-exists-with-different-credential':
      return {
        title: lang === 'my' ? 'အကောင့် ရှိနှင့်ပြီးသားပါ' : 'Account already exists',
        message: lang === 'my'
          ? 'ဤ Email ဖြင့် အခြားနည်းဖြင့် (Google သို့မဟုတ် Email) အကောင့် ဖွင့်ပြီးသားပါ။ အရင် ဝင်ခဲ့တဲ့ နည်းဖြင့် ပြန်ဝင်ပါ။'
          : 'This email already has an account created another way (Google or Email). Sign in with the method you used before.',
      };
    case 'auth/requires-recent-login':
      return {
        title: lang === 'my' ? 'ပြန်ဝင်ရန် လိုအပ်ပါသည်' : 'Please sign in again',
        message: lang === 'my'
          ? 'လုံခြုံရေးအတွက် အကောင့် ပြန်ဝင်ဖို့ လိုပါသည်။ အကောင့်ထွက်ပြီး ပြန်ဝင်ပြီးမှ ထပ်ကြိုးစားပါ။'
          : 'For security, please sign out and sign back in, then try again.',
      };
    case 'auth/operation-not-allowed':
      return {
        title: lang === 'my' ? 'ဤဝင်ရောက်မှု ပိတ်ထားပါသည်' : 'Sign-in method disabled',
        message: lang === 'my'
          ? 'ဤနည်းဖြင့် ဝင်ရောက်ခြင်းကို ပိတ်ထားပါသည်။ အခြားနည်း (Google သို့မဟုတ် Email) ဖြင့် ဝင်ကြည့်ပါ။'
          : 'This sign-in method is disabled. Try another method (Google or Email).',
      };
    default:
      return {
        title: lang === 'my' ? 'Sign in မအောင်မြင်ပါ' : 'Sign in failed',
        message: lang === 'my'
          ? 'လော့ဂ်အင် ဝင်ရာတွင် အမှားအယွင်း ရှိနေပါသည်။ အင်တာနက် စစ်ပြီး ပြန်ကြိုးစားပါ — မရလျှင် Email ဖြင့် ဝင်ကြည့်ပါ။'
          : 'Something went wrong signing in. Check your connection and try again — or try Email sign-in.',
      };
  }
}
