export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  nameEn: string;
  defaultRateToMMK: number;
  flag: string;
}

export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  { code: 'MMK', symbol: 'Ks', name: 'မြန်မာကျပ် (MMK)', nameEn: 'Myanmar Kyat (MMK)', defaultRateToMMK: 1, flag: '🇲🇲' },
  { code: 'USD', symbol: '$', name: 'အမေရိကန်ဒေါ်လာ (USD)', nameEn: 'US Dollar (USD)', defaultRateToMMK: 4500, flag: '🇺🇸' },
  { code: 'THB', symbol: '฿', name: 'ထိုင်းဘတ် (THB)', nameEn: 'Thai Baht (THB)', defaultRateToMMK: 130, flag: '🇹🇭' },
  { code: 'SGD', symbol: 'S$', name: 'စင်ကာပူဒေါ်လာ (SGD)', nameEn: 'Singapore Dollar (SGD)', defaultRateToMMK: 3400, flag: '🇸🇬' },
  { code: 'EUR', symbol: '€', name: 'ယူရို (EUR)', nameEn: 'Euro (EUR)', defaultRateToMMK: 4900, flag: '🇪🇺' },
  { code: 'CNY', symbol: '¥', name: 'တရုတ်ယွမ် (CNY)', nameEn: 'Chinese Yuan (CNY)', defaultRateToMMK: 620, flag: '🇨🇳' },
  { code: 'MYR', symbol: 'RM', name: 'မလေးရှားရင်းဂစ် (MYR)', nameEn: 'Malaysian Ringgit (MYR)', defaultRateToMMK: 1050, flag: '🇲🇾' },
  { code: 'JPY', symbol: '¥', name: 'ဂျပန်ယန်း (JPY)', nameEn: 'Japanese Yen (JPY)', defaultRateToMMK: 30, flag: '🇯🇵' },
  { code: 'GBP', symbol: '£', name: 'ဗြိတိသျှပေါင် (GBP)', nameEn: 'British Pound (GBP)', defaultRateToMMK: 5700, flag: '🇬🇧' },
  { code: 'KRW', symbol: '₩', name: 'ကိုရီးယားဝမ် (KRW)', nameEn: 'Korean Won (KRW)', defaultRateToMMK: 3.3, flag: '🇰🇷' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE ဒါဟမ် (AED)', nameEn: 'UAE Dirham (AED)', defaultRateToMMK: 1225, flag: '🇦🇪' },
];

// [v7.5.0] Live rate override — populated by src/lib/exchangeRates.ts.
// When present, getCurrencyInfo().defaultRateToMMK reflects the live
// market rate. A wallet-level `exchangeRate` still wins inside
// convertToMMK() so users can pin custom rates per wallet.
let __liveRates: Record<string, number> | null = null;

export function setLiveRates(rates: Record<string, number> | null): void {
  if (!rates || typeof rates !== 'object') { __liveRates = null; return; }
  const clean: Record<string, number> = {};
  Object.keys(rates).forEach((k) => {
    const v = Number(rates[k]);
    if (Number.isFinite(v) && v > 0) clean[k.toUpperCase()] = v;
  });
  __liveRates = Object.keys(clean).length > 0 ? clean : null;
}

export function hasLiveRates(): boolean {
  return __liveRates !== null;
}

export const getCurrencyInfo = (currencyCode: string = 'MMK'): CurrencyInfo => {
  const code = (currencyCode || 'MMK').toUpperCase();
  const info = SUPPORTED_CURRENCIES.find((c) => c.code === code) || SUPPORTED_CURRENCIES[0];
  if (__liveRates && __liveRates[info.code] !== undefined) {
    return { ...info, defaultRateToMMK: __liveRates[info.code] };
  }
  return info;
};

export const formatCurrency = (amount: number, currencyCode: string = 'MMK'): string => {
  const code = (currencyCode || 'MMK').toUpperCase();
  const info = getCurrencyInfo(code);
  const sign = amount < 0 ? '-' : '';
  const absAmount = Math.abs(amount);

  const isZeroDecimal = code === 'MMK' || code === 'JPY' || code === 'KRW';
  const formatted = absAmount.toLocaleString('en-US', {
    minimumFractionDigits: isZeroDecimal ? 0 : 2,
    maximumFractionDigits: isZeroDecimal ? 0 : 2,
  });

  if (code === 'MMK') {
    return `${sign}${formatted} MMK`;
  }
  return `${sign}${info.symbol}${formatted} ${code}`;
};

export const convertToMMK = (
  amount: number,
  currencyCode: string = 'MMK',
  customRate?: number
): number => {
  const code = (currencyCode || 'MMK').toUpperCase();
  if (code === 'MMK') return amount;
  const effectiveRate =
    customRate && customRate > 0
      ? customRate
      : getCurrencyInfo(code).defaultRateToMMK;
  return amount * effectiveRate;
};
