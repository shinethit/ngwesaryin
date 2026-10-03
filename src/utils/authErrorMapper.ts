export interface AuthErrorDetails {
  title: string;
  message: string;
  suggestion?: string;
  isVpnRelated?: boolean;
  isIframeRelated?: boolean;
}

export function getAuthErrorDetails(error: any, lang: 'my' | 'en'): AuthErrorDetails {
  const errCode = error?.code || '';
  const errStr = String(error?.message || error || '').toLowerCase();

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
      message: lang === 'my' ? 'Google Sign in ဝင်ရောက်ခြင်းကို ပယ်ဖျက်လိုက်ပါသည်။' : 'Sign in window was closed before completing.',
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
      message: lang === 'my'
        ? 'Google ခွင့်ပြုချက် ရယူရာတွင် ကွန်ရက် အခက်အခဲ ဖြစ်ပေါ်နေပါသည်။ VPN ဖွင့်ထားပါက ယာယီပိတ်ပြီး ပြန်လည် ကြိုးစားပါ။'
        : 'Network request failed. If you are using a VPN, please temporarily disable it or try another network.',
      isVpnRelated: true,
    };
  }

  return {
    title: lang === 'my' ? 'Sign in မအောင်မြင်ပါ' : 'Sign in failed',
    message: lang === 'my' ? `လော့ဂ်အင် ဝင်ရာတွင် အမှားအယွင်း ရှိနေပါသည်။ (${errCode || 'Unknown Error'})` : `Authentication error occurred: ${errCode || 'Unknown Error'}`,
  };
}
