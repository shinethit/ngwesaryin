import { formatCurrency } from './currency';

export const formatMMK = (amount: number, useBurmeseNumerals = false): string => {
  const formattedNumber = Math.abs(amount).toLocaleString('en-US');
  
  if (useBurmeseNumerals) {
    const burmeseDigits = ['၀', '၁', '၂', '၃', '၄', '၅', '၆', '၇', '၈', '၉'];
    const myanmarNum = formattedNumber.replace(/[0-9]/g, (w) => burmeseDigits[+w]);
    return `${amount < 0 ? '-' : ''}${myanmarNum} ကျပ်`;
  }
  
  return `${amount < 0 ? '-' : ''}${formattedNumber} MMK`;
};

/**
 * Special compact Lakhs (သိန်း) formatting specifically for Table Views to save space.
 * Examples:
 * - 654,321 -> "6.54321" (or "၆.၅၄၃၂၁")
 * - 650,000 -> "6.5" (or "၆.၅")
 * - 7,500,000 -> "75" (or "၇၅")
 * - 750,000 -> "7.5" (or "၇.၅")
 */
/**
 * [v7.0.7] Compact Lakhs formatter — English numerals + " သိန်း" suffix.
 * Uses up to 5 decimals (drops trailing zeros). Precision: 1 MMK.
 * Examples: 1110500 → "11.105 သိန်း" | 650000 → "6.5 သိန်း" | 7500000 → "75 သိန်း"
 */
export const formatLakhs = (amount: number, lang: 'my' | 'en' = 'my'): string => {
  if (!Number.isFinite(amount)) return '—';
  if (amount === 0) return '0' + (lang === 'my' ? ' သိန်း' : ' L');
  const sign = amount < 0 ? '-' : '';
  const lakhs = Math.abs(amount) / 100000;
  const str = Number(lakhs.toFixed(5)).toString();
  const unit = lang === 'my' ? ' သိန်း' : ' L';
  return sign + str + unit;
};

export const formatDateDisplay = (dateString: string, lang: 'my' | 'en' = 'my'): string => {
  if (!dateString) return '';
  const parts = dateString.split('-');
  if (parts.length !== 3) return dateString;
  
  const [year, month, day] = parts;
  if (lang === 'en') {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
  }
  
  return `${year} ခုနှစ်၊ ${parseInt(month)} လ၊ ${parseInt(day)} ရက်`;
};

export const getCategoryDisplayName = (
  categoryId: string,
  categories: { id: string; name: string; nameEn?: string }[] = [],
  lang: 'my' | 'en' = 'my'
): string => {
  if (!categoryId) return lang === 'my' ? 'အထွေထွေ' : 'General';
  const found = categories.find((c) => c.id === categoryId);
  if (found) {
    return lang === 'my' ? found.name : (found.nameEn || found.name);
  }
  const map: Record<string, { my: string; en: string }> = {
    cat_food: { my: 'အစားအသောက်နှင့် ကုန်စုံ', en: 'Food & Groceries' },
    cat_transport: { my: 'သယ်ယူပို့ဆောင်ရေးနှင့် လမ်းစရိတ်', en: 'Transportation & Travel' },
    cat_vehicle: { my: '🚘 ယာဉ်စီမံခန့်ခွဲမှု', en: 'Vehicle Management' },
    cat_utilities: { my: 'အိမ်စရိတ်နှင့် ဘေလ်များ', en: 'Bills & Utilities' },
    cat_shopping: { my: 'ဈေးဝယ်ခြင်း / အဝတ်အထည်', en: 'Shopping' },
    cat_health: { my: 'ကျန်းမာရေးနှင့် ဆေးဝါး', en: 'Health & Medical' },
    cat_charity: { my: 'လှူဒါန်းခြင်းနှင့် ကုသိုလ်', en: 'Charity & Donation' },
    cat_entertainment: { my: 'အပန်းဖြေခြင်းနှင့် ဖျော်ဖြေရေး', en: 'Entertainment' },
    cat_expense_other: { my: 'အခြား အသုံးစရိတ်များ', en: 'Other Expenses' },
    cat_salary: { my: 'လစာဝင်ငွေ', en: 'Salary' },
    cat_business: { my: 'လုပ်ငန်းဝင်ငွေ', en: 'Business Income' },
    cat_freelance: { my: 'ဖရီးလန့် / အခကြေးငွေ', en: 'Freelance' },
    cat_bonus: { my: 'ဆုကြေး / ဘောနပ်စ်', en: 'Bonus' },
    cat_investment: { my: 'ရင်းနှီးမြှုပ်နှံမှု အမြတ်', en: 'Investment' },
    cat_income_other: { my: 'အခြား ဝင်ငွေများ', en: 'Other Income' },
    cat_transfer: { my: 'ငွေလွှဲပြောင်းမှု', en: 'Transfer' },
    cat_debt_issued: { my: 'ချေးငွေ ထုတ်ပေးခြင်း', en: 'Debt Issued' },
    cat_debt_received: { my: 'ချေးငွေ ရယူခြင်း', en: 'Debt Received' },
    cat_debt_repayment: { my: 'ကြွေးယူသူမှ ပြန်ဆပ်ခြင်း', en: 'Borrower Repays' },
    cat_debt_payment: { my: 'ကြွေးရှင်ထံ ပြန်ဆပ်ခြင်း', en: 'Repay to Lender' },
  };
  if (map[categoryId]) {
    return lang === 'my' ? map[categoryId].my : map[categoryId].en;
  }
  return categoryId.replace(/^cat_/, '').replace(/_/g, ' ');
};

export const isOverdue = (dueDate?: string): boolean => {
  if (!dueDate) return false;
  const todayStr = new Date().toISOString().split('T')[0];
  return dueDate < todayStr;
};

export const exportToCSV = (
  transactions: any[],
  categoriesMap: Record<string, string>,
  walletsMap: Record<string, string>,
  subCategoriesMap: Record<string, string> = {}
) => {
  const headers = [
    'Date (ရက်စွဲ)',
    'Type (အမျိုးအစား)',
    'Category (ခေါင်းစဉ်)',
    'Sub-Category (ကဏ္ဍခွဲ)',
    'Wallet (ပိုက်ဆံအိတ်)',
    'Amount (ပမာဏ MMK)',
    'Note (မှတ်ချက်)',
  ];

  const rows = transactions.map((t) => [
    t.date,
    t.type === 'income' ? 'ဝင်ငွေ (Income)' : 'ထွက်ငွေ (Expense)',
    categoriesMap[t.category] || t.category,
    (t.subCategoryId && subCategoriesMap[t.subCategoryId]) || '-',
    walletsMap[t.walletId] || t.walletId,
    t.amount,
    `"${(t.note || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent =
    'data:text/csv;charset=utf-8,\uFEFF' +
    [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute(
    'download',
    `ngwe-sar-yin-transactions-${new Date().toISOString().split('T')[0]}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
