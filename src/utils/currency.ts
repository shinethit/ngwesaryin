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
];

export const getCurrencyInfo = (currencyCode: string = 'MMK'): CurrencyInfo => {
  const code = (currencyCode || 'MMK').toUpperCase();
  return SUPPORTED_CURRENCIES.find((c) => c.code === code) || SUPPORTED_CURRENCIES[0];
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
