export type FinancialHealthTier =
  | 'super_surplus' // + အများကြီးထွက်နေရင် (ခရမ်းရောင်)
  | 'perfect'       // ၁၀၀% (အစိမ်း)
  | 'good'          // ၈၀-၉၉% (စိမ်းဖျော့)
  | 'moderate'      // ၆၀-၇၉% (အဝါ)
  | 'caution'       // ၄၀-၅၉% (လိမ္မော်)
  | 'critical'      // ၄၀ အောက် (အနီ)
  | 'negative';     // အနှုတ်ထွက်နေရင် (အနက် နဲ့ အနီ)

export interface FinancialHealthResult {
  score: number; // e.g. 100, 85, 45, or negative value
  scoreDisplay: string; // e.g. "+120%", "100%", "85%", "-25%"
  tier: FinancialHealthTier;
  colorName: { my: string; en: string };
  statusText: { my: string; en: string };
  badgeText: { my: string; en: string };
  shortTitle: { my: string; en: string };
  summary: { my: string; en: string };
  advice: { my: string; en: string };
  emoji: string;
  theme: {
    cardBg: string;
    cardBorder: string;
    titleColor: string;
    subtitleColor: string;
    iconBg: string;
    iconColor: string;
    badgeBg: string;
    badgeText: string;
    progressFill: string;
    glowEffect: string;
    isDarkTheme: boolean;
  };
  metrics: {
    totalIncome: number;
    totalExpense: number;
    netSavings: number;
    savingsRatePercent: number;
    totalPayableDebt: number;
    totalReceivableDebt: number;
    totalAssets: number;
  };
}

export interface TierDefinition {
  tier: FinancialHealthTier;
  rangeLabel: { my: string; en: string };
  colorName: { my: string; en: string };
  emoji: string;
  colorDot: string;
  badgeClass: string;
  description: { my: string; en: string };
}

export const FINANCIAL_HEALTH_TIERS: TierDefinition[] = [
  {
    tier: 'super_surplus',
    rangeLabel: { my: '+ အများကြီးထွက်နေ', en: '+ Super Surplus' },
    colorName: { my: 'ခရမ်းရောင်', en: 'Purple' },
    emoji: '💜',
    colorDot: 'bg-purple-500',
    badgeClass: 'bg-purple-600 text-white border-purple-400',
    description: {
      my: 'ဝင်ငွေထက် ပိုလျှံစုဆောင်းငွေ ၅၀% ကျော် အလွန်များပြားပြီး ငွေကြေးအင်အား အထူးတောင့်တင်းခြင်း',
      en: 'High surplus exceeding 50% savings rate with strong financial buffer',
    },
  },
  {
    tier: 'perfect',
    rangeLabel: { my: '၁၀၀% ပြည့်ဝ', en: '100% Perfect' },
    colorName: { my: 'အစိမ်း', en: 'Green' },
    emoji: '🟢',
    colorDot: 'bg-emerald-500',
    badgeClass: 'bg-emerald-600 text-white border-emerald-400',
    description: {
      my: '၁၀၀% စံပြငွေကြေးကျန်းမာမှု၊ ဝင်ငွေနှင့် စုဆောင်းမှု အလွန်မျှတပြီး အကြွေးဝန်ထုပ်ဝန်ပိုး ကင်းရှင်းခြင်း',
      en: '100% optimal health, well-balanced cashflow with solid savings',
    },
  },
  {
    tier: 'good',
    rangeLabel: { my: '၈၀ - ၉၉%', en: '80 - 99%' },
    colorName: { my: 'စိမ်းဖျော့', en: 'Light Green' },
    emoji: '🍏',
    colorDot: 'bg-lime-500',
    badgeClass: 'bg-lime-600 text-white border-lime-400',
    description: {
      my: 'အလွန်ကောင်းမွန်သော အဆင့်၊ အသုံးစရိတ် စနစ်တကျရှိပြီး စုငွေလုံလောက်စွာ ထွက်ပေါ်ခြင်း',
      en: 'Very healthy standing with disciplined expenditures and steady savings',
    },
  },
  {
    tier: 'moderate',
    rangeLabel: { my: '၆၀ - ၇၉%', en: '60 - 79%' },
    colorName: { my: 'အဝါ', en: 'Yellow' },
    emoji: '🟡',
    colorDot: 'bg-amber-400',
    badgeClass: 'bg-amber-500 text-white border-amber-300',
    description: {
      my: 'ပုံမှန်သင့်တင့်သော အဆင့်၊ အသုံးစရိတ်များ အနည်းငယ်မြင့်မားနေနိုင်သဖြင့် ပိုမိုစုဆောင်းရန် လိုအပ်ခြင်း',
      en: 'Moderate standing, expenses are manageable but leaving less room for savings',
    },
  },
  {
    tier: 'caution',
    rangeLabel: { my: '၄၀ - ၅၉%', en: '40 - 59%' },
    colorName: { my: 'လိမ္မော်', en: 'Orange' },
    emoji: '🟠',
    colorDot: 'bg-orange-500',
    badgeClass: 'bg-orange-600 text-white border-orange-400',
    description: {
      my: 'သတိပြုဆင်ခြင်ရမည့် အဆင့်၊ အသုံးစရိတ် သို့မဟုတ် အကြွေးပေးဆပ်ရန် ပမာဏများပြားနေခြင်း',
      en: 'Caution zone, elevated expenses or debt repayments tightening your budget',
    },
  },
  {
    tier: 'critical',
    rangeLabel: { my: '၄၀ အောက်', en: 'Below 40%' },
    colorName: { my: 'အနီ', en: 'Red' },
    emoji: '🔴',
    colorDot: 'bg-rose-500',
    badgeClass: 'bg-rose-600 text-white border-rose-400',
    description: {
      my: 'ဆိုးဝါးအန္တရာယ်ဇုန်၊ အသုံးစရိတ်နှင့် အကြွေးဝန်ထုပ်ဝန်ပိုး ကြီးမားလွန်းနေသဖြင့် ချက်ချင်းလျှော့ချသင့်ခြင်း',
      en: 'Critical danger zone, high debt or heavy spending requires immediate tightening',
    },
  },
  {
    tier: 'negative',
    rangeLabel: { my: 'အနှုတ်ထွက်နေ', en: 'Deficit / Negative' },
    colorName: { my: 'အနက် နှင့် အနီ', en: 'Black & Red' },
    emoji: '⚠️',
    colorDot: 'bg-slate-900 border border-rose-500',
    badgeClass: 'bg-rose-600 text-white border border-rose-400 font-bold',
    description: {
      my: 'ဝင်ငွေထက် ထွက်ငွေပိုများပြီး အရှုံး/အနှုတ်ပြနေခြင်း (အနက် နှင့် အနီ ရောင်ဖြင့် အထူးသတိပေးထားပါသည်)',
      en: 'Spending exceeds income (deficit outflow), flagged in high-contrast Black & Red warning',
    },
  },
];

/**
 * Computes Financial Health according to the user's gamified tier system:
 * - + အများကြီးထွက်နေရင် -> ခရမ်းရောင် (Purple)
 * - ၁၀၀% -> အစိမ်း (Green)
 * - ၈၀ - ၉၉% -> စိမ်းဖျော့ (Light Green)
 * - ၆၀ - ၇၉% -> အဝါ (Yellow)
 * - ၄၀ - ၅၉% -> လိမ္မော် (Orange)
 * - ၄၀ အောက် -> အနီ (Red)
 * - အနှုတ်ထွက်နေရင် -> အနက် နဲ့ အနီ (Black & Red)
 */
export function calculateFinancialHealth(
  totalIncome: number,
  totalExpense: number,
  totalPayableDebt: number = 0,
  totalReceivableDebt: number = 0,
  totalWalletBalance: number = 0
): FinancialHealthResult {
  const netSavings = totalIncome - totalExpense;
  const savingsRatePercent = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;
  const totalAssets = Math.max(1, totalIncome + Math.max(0, totalWalletBalance));
  const debtRatio = totalPayableDebt / totalAssets;

  let tier: FinancialHealthTier = 'good';
  let score = 80;
  let scoreDisplay = '80%';

  // 0. [v6.9] Negative total wallet balance = deficit (regardless of period flow)
  //    Fix: A user with positive monthly flow but negative wallet position
  //    is still in deficit — health must reflect that.
  if (totalWalletBalance < 0) {
    tier = 'negative';
    const deficitVsIncome = totalIncome > 0
      ? Math.abs(totalWalletBalance) / totalIncome
      : 1;
    const negativePoints = Math.min(100, Math.round(deficitVsIncome * 50));
    score = -negativePoints;
    scoreDisplay = `${score}%`;
  }
  // 1. Check for Negative Deficit first: "အနှုတ်ထွက်နေရင် အနက် နဲ့ အနီ"
  else if (netSavings < 0 || (totalIncome === 0 && totalExpense > 0)) {
    tier = 'negative';
    const deficitRatio = totalIncome > 0 ? Math.abs(netSavings) / totalIncome : 1;
    // Score reflects deficit severity (negative or low floor)
    const negativePoints = Math.min(100, Math.round(deficitRatio * 50));
    score = -negativePoints;
    scoreDisplay = `${score}%`;
  }
  // 2. Check for empty data state
  else if (totalIncome === 0 && totalExpense === 0) {
    if (totalPayableDebt > 0) {
      tier = 'critical'; // ၄၀ အောက် (အနီ)
      score = 30;
      scoreDisplay = '30%';
    } else {
      tier = 'perfect'; // ၁၀၀% (အစိမ်း)
      score = 100;
      scoreDisplay = '100%';
    }
  }
  // 3. Positive cashflow scenario: Check for "+ အများကြီးထွက်နေရင် ခရမ်းရောင်"
  // If savings rate >= 50% (saving more than half of income) and manageable debt (< 20%)
  else if (savingsRatePercent >= 50 && debtRatio < 0.2) {
    tier = 'super_surplus';
    // Bonus score for super surplus!
    score = Math.min(150, 100 + Math.round((savingsRatePercent - 50) * 0.8));
    scoreDisplay = `+${savingsRatePercent}%`;
  }
  // 4. Standard scoring scale
  else {
    let baseScore = 70;
    if (savingsRatePercent >= 40) {
      baseScore = 95;
    } else if (savingsRatePercent >= 25) {
      baseScore = 85;
    } else if (savingsRatePercent >= 10) {
      baseScore = 75;
    } else {
      baseScore = 60;
    }

    // Debt burden penalty
    let debtDeduction = 0;
    if (debtRatio >= 1.0) {
      debtDeduction = 45;
    } else if (debtRatio >= 0.5) {
      debtDeduction = 30;
    } else if (debtRatio >= 0.2) {
      debtDeduction = 15;
    } else if (debtRatio > 0.05) {
      debtDeduction = 5;
    }

    score = Math.max(5, Math.min(100, baseScore - debtDeduction));
    scoreDisplay = `${score}%`;

    // Map calculated score to requested brackets:
    if (score === 100) {
      tier = 'perfect'; // ၁၀၀% -> အစိမ်း
    } else if (score >= 80) {
      tier = 'good'; // ၈၀ - ၉၉ -> စိမ်းဖျော့
    } else if (score >= 60) {
      tier = 'moderate'; // ၆၀ - ၇၉ -> အဝါ
    } else if (score >= 40) {
      tier = 'caution'; // ၄၀ - ၅၉ -> လိမ္မော်
    } else {
      tier = 'critical'; // ၄၀ အောက် -> အနီ
    }
  }

  // Define visual themes & texts for each tier
  switch (tier) {
    case 'super_surplus':
      return {
        score,
        scoreDisplay,
        tier,
        colorName: { my: 'ခရမ်းရောင်', en: 'Purple' },
        statusText: {
          my: `+ အများကြီးထွက်နေပါသည် (${scoreDisplay})`,
          en: `Super Surplus (+${savingsRatePercent}%)`,
        },
        badgeText: { my: 'ခရမ်းရောင် 💜 +အများကြီး', en: 'Purple 💜 Surplus' },
        shortTitle: { my: 'ပိုလျှံမှု အထူးကောင်း', en: 'Super Surplus' },
        summary: {
          my: 'ဝင်ငွေ၏ ၅၀% ကျော်ကို အောင်မြင်စွာ စုဆောင်းနိုင်ခဲ့ပြီး အလွန်အားကောင်းသော ငွေကြေးအင်အား ရှိနေပါသည်!',
          en: 'You are saving over 50% of your income with an exceptionally robust financial buffer!',
        },
        advice: {
          my: 'ဤပိုလျှံငွေများကို ရေရှည်တိုးပွားမည့် ရင်းနှီးမြှုပ်နှံမှု သို့မဟုတ် အရေးပေါ်ရန်ပုံငွေအဖြစ် သီးသန့်ဖယ်ထားနိုင်ပါသည်',
          en: 'Consider putting these excess funds into productive investments or dedicated emergency reserves',
        },
        emoji: '💜',
        theme: {
          cardBg: 'bg-purple-50/90 hover:bg-purple-100/90',
          cardBorder: 'border-purple-300 hover:border-purple-400',
          titleColor: 'text-purple-950',
          subtitleColor: 'text-purple-700',
          iconBg: 'bg-purple-100 text-purple-700 border border-purple-200',
          iconColor: 'text-purple-700',
          badgeBg: 'bg-purple-600 text-white shadow-2xs border border-purple-500',
          badgeText: 'text-white',
          progressFill: 'bg-purple-600',
          glowEffect: 'ring-1 ring-purple-400/40 shadow-sm',
          isDarkTheme: false,
        },
        metrics: {
          totalIncome,
          totalExpense,
          netSavings,
          savingsRatePercent,
          totalPayableDebt,
          totalReceivableDebt,
          totalAssets,
        },
      };

    case 'perfect':
      return {
        score: 100,
        scoreDisplay: '100%',
        tier,
        colorName: { my: 'အစိမ်း', en: 'Green' },
        statusText: {
          my: '၁၀၀% အပြည့်အဝ ကျန်းမာပါသည်',
          en: '100% Perfectly Healthy',
        },
        badgeText: { my: 'အစိမ်း 🟢 ၁၀၀%', en: 'Green 🟢 100%' },
        shortTitle: { my: 'စံပြ ကျန်းမာမှု', en: '100% Healthy' },
        summary: {
          my: 'ဝင်ငွေနှင့် စုဆောင်းငွေ အချိုးညီမျှပြီး ပေးရန်အကြွေး ဝန်ထုပ်ဝန်ပိုး ကင်းရှင်းပါသည်!',
          en: 'Your spending is disciplined with zero debt burden and steady savings!',
        },
        advice: {
          my: 'လက်ရှိ အသုံးစရိတ် စည်းကမ်းကို ဆက်လက်ထိန်းသိမ်းပြီး လစဉ်စုငွေ ပန်းတိုင်ဆီသို့ ဆက်လက်ချီတက်ပါ',
          en: 'Maintain this financial discipline and stay aligned with your monthly savings target',
        },
        emoji: '🟢',
        theme: {
          cardBg: 'bg-emerald-50/90 hover:bg-emerald-100/90',
          cardBorder: 'border-emerald-300 hover:border-emerald-400',
          titleColor: 'text-emerald-950',
          subtitleColor: 'text-emerald-700',
          iconBg: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
          iconColor: 'text-emerald-700',
          badgeBg: 'bg-emerald-600 text-white shadow-2xs border border-emerald-500',
          badgeText: 'text-white',
          progressFill: 'bg-emerald-600',
          glowEffect: 'ring-1 ring-emerald-400/40 shadow-sm',
          isDarkTheme: false,
        },
        metrics: {
          totalIncome,
          totalExpense,
          netSavings,
          savingsRatePercent,
          totalPayableDebt,
          totalReceivableDebt,
          totalAssets,
        },
      };

    case 'good':
      return {
        score,
        scoreDisplay,
        tier,
        colorName: { my: 'စိမ်းဖျော့', en: 'Light Green' },
        statusText: {
          my: `အလွန်ကောင်းမွန်သည် (${scoreDisplay})`,
          en: `Very Good (${scoreDisplay})`,
        },
        badgeText: { my: `စိမ်းဖျော့ 🍏 ${scoreDisplay}`, en: `Light Green 🍏 ${scoreDisplay}` },
        shortTitle: { my: 'အလွန်ကောင်းမွန်', en: 'Very Good' },
        summary: {
          my: 'ငွေကြေးအခြေအနေ ခိုင်မာကောင်းမွန်ပြီး စုဆောင်းငွေ ပုံမှန်ထွက်ပေါ်နေပါသည်',
          en: 'Your finances are well-managed with steady positive cashflow',
        },
        advice: {
          my: 'မလိုလားအပ်သော အသေးစား ကုန်ကျစရိတ်များကို အနည်းငယ် ထပ်မံလျှော့ချပါက ၁၀၀% စံပြအဆင့်သို့ ရောက်ရှိပါမည်',
          en: 'Trimming small discretionary spends can push your health to a full 100%',
        },
        emoji: '🍏',
        theme: {
          cardBg: 'bg-lime-50/90 hover:bg-lime-100/90',
          cardBorder: 'border-lime-300 hover:border-lime-400',
          titleColor: 'text-lime-950',
          subtitleColor: 'text-lime-800',
          iconBg: 'bg-lime-100 text-lime-800 border border-lime-200',
          iconColor: 'text-lime-800',
          badgeBg: 'bg-lime-600 text-white shadow-2xs border border-lime-500',
          badgeText: 'text-white',
          progressFill: 'bg-lime-500',
          glowEffect: 'ring-1 ring-lime-400/40 shadow-sm',
          isDarkTheme: false,
        },
        metrics: {
          totalIncome,
          totalExpense,
          netSavings,
          savingsRatePercent,
          totalPayableDebt,
          totalReceivableDebt,
          totalAssets,
        },
      };

    case 'moderate':
      return {
        score,
        scoreDisplay,
        tier,
        colorName: { my: 'အဝါ', en: 'Yellow' },
        statusText: {
          my: `သင့်တင့်/ပုံမှန် (${scoreDisplay})`,
          en: `Moderate (${scoreDisplay})`,
        },
        badgeText: { my: `အဝါ 🟡 ${scoreDisplay}`, en: `Yellow 🟡 ${scoreDisplay}` },
        shortTitle: { my: 'ပုံမှန်သင့်တင့်', en: 'Moderate' },
        summary: {
          my: 'ဝင်ငွေနှင့် ထွက်ငွေ ကပ်နေပြီး စုဆောင်းငွေ ပမာဏ နည်းပါးနေပါသည်',
          en: 'Income covers spending, but savings margin is narrow',
        },
        advice: {
          my: 'နေ့စဉ် အသုံးစရိတ်များကို စိစစ်ပြီး အရေးမကြီးသော သုံးစွဲမှုများကို ထိန်းသိမ်းရန် အကြံပြုပါသည်',
          en: 'Audit recurring daily spends to build a more comfortable savings buffer',
        },
        emoji: '🟡',
        theme: {
          cardBg: 'bg-amber-50/90 hover:bg-amber-100/90',
          cardBorder: 'border-amber-300 hover:border-amber-400',
          titleColor: 'text-amber-950',
          subtitleColor: 'text-amber-800',
          iconBg: 'bg-amber-100 text-amber-800 border border-amber-200',
          iconColor: 'text-amber-800',
          badgeBg: 'bg-amber-500 text-white shadow-2xs border border-amber-400',
          badgeText: 'text-white',
          progressFill: 'bg-amber-500',
          glowEffect: 'ring-1 ring-amber-400/40 shadow-sm',
          isDarkTheme: false,
        },
        metrics: {
          totalIncome,
          totalExpense,
          netSavings,
          savingsRatePercent,
          totalPayableDebt,
          totalReceivableDebt,
          totalAssets,
        },
      };

    case 'caution':
      return {
        score,
        scoreDisplay,
        tier,
        colorName: { my: 'လိမ္မော်', en: 'Orange' },
        statusText: {
          my: `သတိပြုရန် လိုအပ်သည် (${scoreDisplay})`,
          en: `Needs Caution (${scoreDisplay})`,
        },
        badgeText: { my: `လိမ္မော် 🟠 ${scoreDisplay}`, en: `Orange 🟠 ${scoreDisplay}` },
        shortTitle: { my: 'သတိပြုရန်', en: 'Caution Zone' },
        summary: {
          my: 'ထွက်ငွေ ပမာဏ မြင့်တက်နေပြီး အကြွေးဆပ်ရန် သို့မဟုတ် စရိတ်များကြောင့် ဖိအားရှိနေပါသည်',
          en: 'Spending or debt payments are high relative to your current earnings',
        },
        advice: {
          my: 'မဖြစ်မနေ မဟုတ်သော အသုံးစရိတ်များကို ခေတ္တရပ်ဆိုင်းပြီး ပေးရန်ရှိသော အကြွေးများကို ဦးစားပေး လျှော့ချပါ',
          en: 'Pause non-essential expenditures and prioritize clearing high-pressure debts',
        },
        emoji: '🟠',
        theme: {
          cardBg: 'bg-orange-50/90 hover:bg-orange-100/90',
          cardBorder: 'border-orange-300 hover:border-orange-400',
          titleColor: 'text-orange-950',
          subtitleColor: 'text-orange-800',
          iconBg: 'bg-orange-100 text-orange-800 border border-orange-200',
          iconColor: 'text-orange-800',
          badgeBg: 'bg-orange-600 text-white shadow-2xs border border-orange-500',
          badgeText: 'text-white',
          progressFill: 'bg-orange-500',
          glowEffect: 'ring-1 ring-orange-400/40 shadow-sm',
          isDarkTheme: false,
        },
        metrics: {
          totalIncome,
          totalExpense,
          netSavings,
          savingsRatePercent,
          totalPayableDebt,
          totalReceivableDebt,
          totalAssets,
        },
      };

    case 'critical':
      return {
        score,
        scoreDisplay,
        tier,
        colorName: { my: 'အနီ', en: 'Red' },
        statusText: {
          my: `ဆိုးဝါး/အန္တရာယ်ဇုန် (${scoreDisplay})`,
          en: `Critical Danger (${scoreDisplay})`,
        },
        badgeText: { my: `အနီ 🔴 ${scoreDisplay}`, en: `Red 🔴 ${scoreDisplay}` },
        shortTitle: { my: 'ဆိုးဝါးဇုန်', en: 'Critical Danger' },
        summary: {
          my: 'အကြွေးဝန်ထုပ်ဝန်ပိုး ကြီးမားနေခြင်း သို့မဟုတ် ငွေကြေးအကျပ်အတည်း ဖြစ်ပေါ်နေပါသည်',
          en: 'Heavy debt obligations or severe cashflow strain threatening financial stability',
        },
        advice: {
          my: 'အသုံးစရိတ်အားလုံးကို အရေးပေါ်စိစစ်၍ ကုန်ကျငွေ အမြန်ဆုံး ဖြတ်တောက်ရန် အလွန်အရေးကြီးပါသည်',
          en: 'Emergency intervention required: freeze all optional expenses immediately',
        },
        emoji: '🔴',
        theme: {
          cardBg: 'bg-rose-50/90 hover:bg-rose-100/90',
          cardBorder: 'border-rose-300 hover:border-rose-400',
          titleColor: 'text-rose-950',
          subtitleColor: 'text-rose-800',
          iconBg: 'bg-rose-100 text-rose-800 border border-rose-200',
          iconColor: 'text-rose-800',
          badgeBg: 'bg-rose-600 text-white shadow-2xs border border-rose-500',
          badgeText: 'text-white',
          progressFill: 'bg-rose-600',
          glowEffect: 'ring-1 ring-rose-400/40 shadow-sm',
          isDarkTheme: false,
        },
        metrics: {
          totalIncome,
          totalExpense,
          netSavings,
          savingsRatePercent,
          totalPayableDebt,
          totalReceivableDebt,
          totalAssets,
        },
      };

    case 'negative':
    default:
      return {
        score,
        scoreDisplay: score < 0 ? `${score}%` : 'အနှုတ်',
        tier: 'negative',
        colorName: { my: 'အနက် နှင့် အနီ', en: 'Black & Red' },
        statusText: {
          my: 'အနှုတ်ထွက်နေပါသည် (အရှုံးပြနေ)',
          en: 'Deficit Outflow (Negative)',
        },
        badgeText: { my: 'အနက်+အနီ ⚠️ အနှုတ်', en: 'Black+Red ⚠️ Deficit' },
        shortTitle: { my: 'အနှုတ်ပြနေသည်', en: 'Negative Deficit' },
        summary: {
          my: 'လက်ကျန်ငွေ အနုတ်ပြနေခြင်း သို့မဟုတ် ဝင်ငွေထက် သုံးစွဲမှုပိုများနေခြင်းကြောင့် ငွေကြေးအခြေအနေ ဆိုးဝါးနေပါသည် (အနက် နှင့် အနီ ရောင်ဖြင့် သတိပေးထားပါသည်)!',
          en: 'Negative wallet balance or spending exceeding income — financial position is critical (flagged in Black & Red)!',
        },
        advice: {
          my: 'ထွက်ငွေများကို ချက်ချင်းထိန်းချုပ်ပါ၊ ထပ်မံအကြွေးယူခြင်းကို ရှောင်ရှားပြီး မလိုအပ်သော အသုံးစရိတ်များကို အရေးပေါ် ရပ်တန့်ပါ',
          en: 'Halt all non-essential outflow immediately and stop acquiring new liabilities',
        },
        emoji: '⚠️',
        theme: {
          // Striking high-contrast Black and Red theme requested by user
          cardBg: 'bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950 text-white hover:from-black hover:to-rose-900',
          cardBorder: 'border-rose-500/80 hover:border-rose-400 shadow-md ring-1 ring-rose-500/40',
          titleColor: 'text-white',
          subtitleColor: 'text-rose-400',
          iconBg: 'bg-rose-950 text-rose-400 border border-rose-700/80 animate-pulse',
          iconColor: 'text-rose-400',
          badgeBg: 'bg-rose-600 text-white shadow-xs border border-rose-400 font-bold',
          badgeText: 'text-white',
          progressFill: 'bg-rose-600',
          glowEffect: 'ring-1 ring-rose-500/50 shadow-md',
          isDarkTheme: true,
        },
        metrics: {
          totalIncome,
          totalExpense,
          netSavings,
          savingsRatePercent,
          totalPayableDebt,
          totalReceivableDebt,
          totalAssets,
        },
      };
  }
}
