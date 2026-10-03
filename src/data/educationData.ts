export interface Article {
  id: string;
  categoryId: 'financial_basics' | 'debt_management' | 'babylon_wisdom' | 'power_48' | 'wealth_mindset';
  categoryTitleMy: string;
  categoryTitleEn: string;
  titleMy: string;
  titleEn: string;
  subtitleMy: string;
  subtitleEn: string;
  readTimeMin: number;
  iconName: string;
  badgeColor: string; // Tailwind color classes
  summaryMy: string;
  summaryEn: string;
  keyTakeawaysMy: string[];
  keyTakeawaysEn: string[];
  contentSectionsMy: {
    heading?: string;
    paragraphs: string[];
    bullets?: string[];
    quote?: string;
    callout?: string;
  }[];
  contentSectionsEn: {
    heading?: string;
    paragraphs: string[];
    bullets?: string[];
    quote?: string;
    callout?: string;
  }[];
}

export const EDUCATION_CATEGORIES = [
  { id: 'all', titleMy: 'အားလုံး', titleEn: 'All Topics' },
  { id: 'financial_basics', titleMy: 'ငွေကြေးစီမံမှု', titleEn: 'Financial Basics' },
  { id: 'debt_management', titleMy: 'အကြွေးပညာပေး', titleEn: 'Debt Management' },
  { id: 'babylon_wisdom', titleMy: 'ဘေဘီလုံနည်းလမ်းများ', titleEn: 'Babylon Wisdom' },
  { id: 'power_48', titleMy: 'Power 48 ဘဝတက်လမ်း', titleEn: '48 Laws of Power' },
  { id: 'wealth_mindset', titleMy: 'စည်းစိမ်ဥစ္စာ လမ်းကြောင်း', titleEn: 'Wealth Mindset' },
];

export const ARTICLES: Article[] = [
  // --- CATEGORY 1: FINANCIAL BASICS ---
  {
    id: 'art_50_30_20_rule',
    categoryId: 'financial_basics',
    categoryTitleMy: 'ငွေကြေးစီမံမှု',
    categoryTitleEn: 'Financial Basics',
    titleMy: '၅၀/၃၀/၂၀ စည်းမျဉ်းဖြင့် ဝင်ငွေကို စနစ်တကျ ခွဲဝေသုံးစွဲနည်း',
    titleEn: 'Mastering Money with the 50/30/20 Budgeting Rule',
    subtitleMy: 'ဝင်ငွေ ဘယ်လောက်ရရ လစဉ် မလိုလားအပ်သော ယိုစိမ့်မှုများကို ထိန်းချုပ်သည့် ရွှေရောင် စည်းမျဉ်း',
    subtitleEn: 'A simple yet powerful rule to control spending regardless of your income level.',
    readTimeMin: 4,
    iconName: 'PieChart',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    summaryMy: 'ဝင်ငွေရလာသည်နှင့် အလွယ်တကူ သုံးစွဲပစ်လိုက်မည့်အစား ၅၀% (လိုအပ်ချက်)၊ ၃၀% (လိုချင်ချက်) နှင့် ၂၀% (စုဆောင်းမှု) အဖြစ် စနစ်တကျ ခွဲဝေနည်း ဖြစ်ပါသည်။',
    summaryEn: 'Divide your net income into 50% Needs, 30% Wants, and 20% Savings or Debt Paydown.',
    keyTakeawaysMy: [
      '၅၀% ကို အဓိက လိုအပ်ချက်များ (အိမ်လခ၊ ဆန်ဆီ၊ မီးဖိုး၊ ကျန်းမာရေး) အတွက် သုံးပါ',
      '၃၀% ကို မိမိစိတ်ကြိုက် အပန်းဖြေမှုနှင့် လိုချင်ချက်များအတွက် သီးသန့်ထားပါ',
      '၂၀% ကို အနိမ့်ဆုံး စုဆောင်းမှု သို့မဟုတ် အကြွေးဆပ်ရန် မဖြစ်မနေ ဖယ်ထုတ်ပါ'
    ],
    keyTakeawaysEn: [
      'Allocate 50% for essential living costs (rent, groceries, utilities)',
      'Reserve 30% for personal enjoyment, lifestyle, and hobbies',
      'Dedicate 20% immediately for savings, investments, or debt payoff'
    ],
    contentSectionsMy: [
      {
        heading: '၅၀/၃၀/၂၀ စည်းမျဉ်း ဆိုသည်မှာ ဘာလဲ။',
        paragraphs: [
          'လူအတော်များများ ငွေမစုမိခြင်း၏ အဓိကအကြောင်းအရင်းမှာ "ဝင်ငွေထဲမှ သုံးပြီးမှ ကျန်တာကို စုမည်" ဟု တွေးကြသောကြောင့် ဖြစ်ပါသည်။ အမှန်တကယ်တွင်မူ ငွေဝင်လာသည်နှင့် တပြိုင်နက် ဘာအတွက် ဘယ်လောက် သုံးမည်ဟု ကြိုတင်စည်းမျဉ်း သတ်မှတ်ထားရန် လိုအပ်ပါသည်။',
          '၅၀/၃၀/၂၀ စည်းမျဉ်းသည် ကမ္ဘာပေါ်တွင် ရိုးရှင်းပြီး အထိရောက်ဆုံး ငွေကြေးခွဲဝေမှု စနစ်တစ်ခု ဖြစ်ပါသည်။'
        ],
        quote: 'ငွေကို မသုံးစွဲမီ ကြိုတင် မစီမံပါက ငွေသည် သင့်ထံမှ အလိုအလျောက် ပျောက်ကွယ်သွားလိမ့်မည်။'
      },
      {
        heading: '၁။ ၅၀% - မဖြစ်မနေ လိုအပ်ချက်များ (Needs)',
        paragraphs: [
          'ဤနေရာတွင် မရှိမဖြစ် လိုအပ်သော အခြေခံ စရိတ်များကို ထည့်သွင်းရပါမည်။ ဥပမာ - အိမ်လခ၊ ဆန်၊ ဆီ၊ မီးဖိုး၊ ရေဖိုး၊ သွားလာစရိတ်၊ သားသမီး ကျောင်းစရိတ်နှင့် မဖြစ်မနေ ကျန်းမာရေး စရိတ်များ ဖြစ်ပါသည်။',
          'အကယ်၍ သင့်လိုအပ်ချက် စရိတ်သည် ၅၀% ထက် ကျော်လွန်နေပါက မလိုအပ်သော လျှပ်စစ်သုံးစွဲမှုများ သို့မဟုတ် ပိုမိုသက်သာသော အစားအသောက် အသုံးစရိတ်သို့ လျှော့ချရန် လိုအပ်ပါသည်။'
        ],
        bullets: [
          'အိမ်လခ သို့မဟုတ် အိမ်စရိတ်',
          'နေ့စဉ် စားသောက်စရိတ်နှင့် ကုန်စုံ',
          'မီးဖိုး၊ ရေဖိုး၊ ဖုန်းနှင့် အင်တာနက်',
          'အခြေခံ သွားလာစရိတ်'
        ]
      },
      {
        heading: '၂။ ၃၀% - လိုချင်ချက်များနှင့် အပန်းဖြေမှု (Wants)',
        paragraphs: [
          'ဘဝသည် အလုပ်ချည်း လုပ်နေရန် မဟုတ်ပါ။ မိမိစိတ်ချမ်းသာမှုအတွက် အပြင်ဘက်တွင် အစားအသောက် ကောင်းကောင်း စားခြင်း၊ အဝတ်အစားသစ် ဝယ်ခြင်း၊ မိတ်ဆွေများနှင့် လက်ဖက်ရည်ဆိုင် ထိုင်ခြင်း၊ ခရီးသွားခြင်းများကို ဤ ၃၀% အကွက်ထဲမှ သုံးစွဲရပါမည်။',
          'အရေးကြီးသည်မှာ ဤ ၃၀% ထက် ပိုမသုံးရန် မိမိကိုယ်ကို ထိန်းချုပ်ခြင်း ဖြစ်ပါသည်။'
        ]
      },
      {
        heading: '၃။ ၂၀% - စုဆောင်းမှုနှင့် အကြွေးဆပ်ခြင်း (Savings & Debt)',
        paragraphs: [
          'ငွေရသည်နှင့် ရလာသော ဝင်ငွေ၏ ၂၀% ကို ပထမဆုံး ဖယ်ထုတ်၍ အရေးပေါ် ရန်ပုံငွေ (Emergency Fund) ထဲသို့ လည်းကောင်း၊ အတိုးပေးနေရသော အကြွေးများ ဆပ်ရန် လည်းကောင်း သို့မဟုတ် ရင်းနှီးမြှုပ်နှံမှု အကောင့်ထဲသို့ လွှဲပြောင်းရပါမည်။'
        ],
        callout: '💡 အကြံပြုချက်: Fortune Finance App တွင် ရရှိသော ဝင်ငွေတိုင်းကို စာရင်းသွင်းပြီးသည်နှင့် ဤ ၅၀/၃၀/၂၀ ရာခိုင်နှုန်း ခွဲဝေမှုကို တပြိုင်နက် စစ်ဆေးပါ။'
      }
    ],
    contentSectionsEn: [
      {
        heading: 'What is the 50/30/20 Rule?',
        paragraphs: [
          'Most people fail to save money because they attempt to save whatever is left over at the end of the month. Instead, you need a proactive formula before spending starts.',
          'The 50/30/20 framework divides your net take-home income into three distinct categories.'
        ],
        quote: 'Do not save what is left after spending; spend what is left after saving. - Warren Buffett'
      },
      {
        heading: '1. 50% Needs',
        paragraphs: ['Cover your absolute essentials like rent, groceries, basic utilities, and minimum transport.'],
        bullets: ['Housing & Rent', 'Groceries & Staples', 'Utilities & Basic Phone', 'Essential Commute']
      },
      {
        heading: '2. 30% Wants',
        paragraphs: ['Allocate up to 30% for personal choices, dining out, entertainment, and lifestyle upgrades.']
      },
      {
        heading: '3. 20% Savings & Debt Payoff',
        paragraphs: ['Instantly funnel 20% into emergency reserves, debt reduction, or future investments.']
      }
    ]
  },
  {
    id: 'art_emergency_fund',
    categoryId: 'financial_basics',
    categoryTitleMy: 'ငွေကြေးစီမံမှု',
    categoryTitleEn: 'Financial Basics',
    titleMy: 'အရေးပေါ် ရန်ပုံငွေ (Emergency Fund) တည်ဆောက်နည်း',
    titleEn: 'How to Build an Unshakable Emergency Fund',
    subtitleMy: 'မမျှော်လင့်သော ကျန်းမာရေး၊ အလုပ်ပြောင်းလဲမှုနှင့် အခက်အခဲများအတွက် အကာအကွယ် ဒိုင်းလွှား',
    subtitleEn: 'Shielding yourself and your family against unforeseen financial shocks.',
    readTimeMin: 5,
    iconName: 'ShieldAlert',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    summaryMy: 'အရေးပေါ် ရန်ပုံငွေဆိုသည်မှာ အနိမ့်ဆုံး ၃ လမှ ၆ လစာ အခြေခံ ကုန်ကျစရိတ်ကို အလွယ်တကူ ထုတ်ယူနိုင်သော နေရာတွင် သီးသန့် စုဆောင်းထားခြင်း ဖြစ်ပါသည်။',
    summaryEn: 'An emergency fund is a cash reserve set aside strictly for unexpected, urgent expenses.',
    keyTakeawaysMy: [
      'အရေးပေါ် ရန်ပုံငွေသည် စီးပွားရေး စွန့်စားရန် မဟုတ်ဘဲ လုံခြုံရေးအတွက် ဖြစ်သည်',
      'အနိမ့်ဆုံး ၃ လစာမှ ၆ လစာ မဖြစ်မနေ ကုန်ကျစရိတ်ကို စုဆောင်းထားပါ',
      'ဤငွေကို စော့ကစားရန် သို့မဟုတ် သာမန် ပစ္စည်းဝယ်ရန် လုံးဝ မသုံးရပါ'
    ],
    keyTakeawaysEn: [
      'An emergency fund is insurance against chaos, not an investment pool',
      'Aim for 3 to 6 months of absolute core living expenses',
      'Keep it liquid and separate from daily spending wallets'
    ],
    contentSectionsMy: [
      {
        heading: 'အရေးပေါ် ရန်ပုံငွေဆိုသည်မှာ ဘာလဲ။',
        paragraphs: [
          'လူတိုင်း၏ ဘဝတွင် မမျှော်လင့်ဘဲ အလုပ်ပြုတ်သွားခြင်း၊ ရောဂါဝေဒနာ ခံစားရခြင်း၊ ကား သို့မဟုတ် အိမ် အကြီးစား ပြင်ဆင်ရခြင်း စသည့် အရေးပေါ် ကိစ္စများ ကြုံတွေ့ရတတ်ပါသည်။',
          'ထိုအခါမျိုးတွင် အကြွေးမယူရဘဲ အေးဆေးစွာ ဖြေရှင်းနိုင်ရန်အတွက် သီးသန့် စုဆောင်းထားသော ငွေကို အရေးပေါ် ရန်ပုံငွေ (Emergency Fund) ဟု ခေါ်ပါသည်။'
        ]
      },
      {
        heading: 'ဘယ်လောက် စုဆောင်းထားသင့်သလဲ။',
        paragraphs: [
          'သင့်၏ ၁ လစာ မဖြစ်မနေ သုံးစွဲရသော စရိတ် (အိမ်လခ၊ စားစရိတ်၊ မီးဖိုး) ကို တွက်ချက်ပါ။ အကယ်၍ ၁ လလျှင် ၅ သိန်း ကုန်ပါက -',
          '• အနိမ့်ဆုံး (၃ လစာ) = ၁၅ သိန်း',
          '• စိတ်အေးရဆုံး (၆ လစာ) = သိန်း ၃၀',
          'ဤငွေပမာဏကို စုဆောင်းပြီးပါက သင့်ဘဝတွင် ငွေကြေးဆိုင်ရာ စိုးရိမ်ပူပန်မှု ၈၀% ကျော် သက်သာသွားပါလိမ့်မည်။'
        ],
        quote: 'အရေးပေါ် ရန်ပုံငွေ မရှိသူသည် မုန်တိုင်းထန်းလျက် ပင်လယ်ထဲ လှေငယ်ဖြင့် ကူးခတ်နေသူနှင့် တူ၏။'
      }
    ],
    contentSectionsEn: [
      {
        heading: 'Why You Need an Emergency Fund',
        paragraphs: [
          'Life is unpredictable. Job loss, sudden medical bills, or vehicle repairs can strike anytime.',
          'An emergency fund prevents you from falling into toxic high-interest debts when life happens.'
        ]
      }
    ]
  },
  {
    id: 'art_assets_vs_liabilities',
    categoryId: 'financial_basics',
    categoryTitleMy: 'ငွေကြေးစီမံမှု',
    categoryTitleEn: 'Financial Basics',
    titleMy: 'Asset (ပိုင်ဆိုင်မှု) နှင့် Liability (တာဝန်/အသုံးစရိတ်) ခွဲခြားသိမြင်ခြင်း',
    titleEn: 'Understanding Assets vs Liabilities (Rich Dad Lesson)',
    subtitleMy: 'သင့်အိတ်ကပ်ထဲ ငွေထည့်ပေးသောအရာနှင့် သင့်အိတ်ကပ်ထဲမှ ငွေကို နှုတ်ယူနေသောအရာများ',
    subtitleEn: 'The core fundamental lesson that separates the wealthy from the financially trapped.',
    readTimeMin: 5,
    iconName: 'Coins',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    summaryMy: 'လူချမ်းသာများသည် Asset (ဝင်ငွေပြန်ရသော ပိုင်ဆိုင်မှု) ကို ဝယ်ယူကြပြီး ဆင်းရဲသူနှင့် အလယ်အလတ်တန်းစားများသည် Liability (ငွေကုန်စေသော တာဝန်) ကို ပိုင်ဆိုင်မှုဟု ထင်မှတ်ကာ ဝယ်ယူကြပါသည်။',
    summaryEn: 'Assets put money INTO your pocket. Liabilities take money OUT of your pocket.',
    keyTakeawaysMy: [
      'Asset = သင့်ထံသို့ ဝင်ငွေ ပြန်လည် စီးဝင်စေသောအရာ (ဥပမာ - အငှားအိမ်၊ စာမူပိုင်ခွင့်၊ အမြတ်ဝေစု)',
      'Liability = သင့်ထံမှ ငွေကြေး အမြဲတမ်း ထွက်သွားစေသောအရာ (ဥပမာ - အလှအပ ကားသစ်၊ အကြွေးဝယ် ပစ္စည်း)',
      'အစပိုင်းတွင် Asset များကိုသာ တတ်နိုင်သမျှ တည်ဆောက်ပါ'
    ],
    keyTakeawaysEn: [
      'Assets generate cash flow into your account',
      'Liabilities cause ongoing cash drain',
      'Focus on buying income-producing assets first'
    ],
    contentSectionsMy: [
      {
        heading: 'Robert Kiyosaki ၏ Rich Dad Poor Dad သင်ခန်းစာ',
        paragraphs: [
          'လူအများစုသည် ကားအသစ်တစ်စီး ဝယ်လိုက်ပါက မိမိကိုယ်ကို ပိုင်ဆိုင်မှု (Asset) တိုးတက်လာပြီဟု ထင်တတ်ကြပါသည်။ သို့သော် ထိုကားသည် လစဉ် ဓာတ်ဆီဖိုး၊ ပြင်ဆင်စရိတ်၊ အာမခံစရိတ်များနှင့် တန်ဖိုးလျော့ကျမှုများကြောင့် သင့်ထံမှ ငွေကိုသာ နှုတ်ယူနေသဖြင့် စိစစ်ပါက Liability သာ ဖြစ်ပါသည်။',
          'အမှန်တကယ် Asset ဆိုသည်မှာ သင်ကိုယ်တိုင် အလုပ်လုပ်စရာ မလိုဘဲ သင့်ထံသို့ ဝင်ငွေ ပြန်လည် စီးဝင်စေသောအရာ ဖြစ်ပါသည်။'
        ],
        bullets: [
          '✅ Asset များ: ဝင်ငွေရ အိမ်ခြံမြေ၊ ရှယ်ယာ stock အမြတ်ဝေစု၊ စီးပွားရေး ပိုင်ဆိုင်မှု၊ မူပိုင်ခွင့်',
          '❌ Liability များ: အကြွေးဝယ် အဝတ်အစား/ဖုန်း၊ အသုံးပြုမှုကြောင့် တန်ဖိုးကျ ကား၊ အတိုးကြီး အကြွေးများ'
        ]
      }
    ],
    contentSectionsEn: [
      {
        heading: 'Assets vs Liabilities Explained',
        paragraphs: ['Learn to distinguish between things that build wealth versus things that deplete it.']
      }
    ]
  },
  {
    id: 'art_compound_interest',
    categoryId: 'financial_basics',
    categoryTitleMy: 'ငွေကြေးစီမံမှု',
    categoryTitleEn: 'Financial Basics',
    titleMy: 'Compound Interest (ထပ်မျှတိုး) ၏ အံ့မခန်း စွမ်းအား',
    titleEn: 'The Miraculous Power of Compound Interest',
    subtitleMy: 'ကမ္ဘာ့ ၈ ခုမြောက် အံ့ဖွယ် - သင့်ငွေကို ငွေချင်း တိုးပွားအောင် ခိုင်းစေနည်း',
    subtitleEn: 'How small consistent savings turn into massive fortunes over time.',
    readTimeMin: 4,
    iconName: 'TrendingUp',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    summaryMy: 'အတိုးပေါ်တွင် အတိုးထပ်တက်သော စနစ်ဖြင့် ငွေကြေးကို ရေရှည် မြှုပ်နှံပါက အချိန်ကာလ ကြာမြင့်သည်နှင့်အမျှ ဂျီဩမေထရီ နည်းကျ အဆမတန် တိုးပွားလာမည် ဖြစ်ပါသည်။',
    summaryEn: 'Earning interest on top of previously earned interest creates exponential wealth growth over time.',
    keyTakeawaysMy: [
      'စောစော စတင်လေ Compound Interest ၏ အကျိုးကျေးဇူးကို ပိုမို ခံစားရလေ ဖြစ်သည်',
      'ပုံမှန် မပျက်မကွက် စုဆောင်းခြင်းသည် ပမာဏ နည်းသော်လည်း ရေရှည်တွင် ကြီးမားသော စည်းစိမ် ဖြစ်လာသည်',
      'အချိန်သည် သင်၏ အကြီးမားဆုံး မိတ်ဆွေ ဖြစ်သည်'
    ],
    keyTakeawaysEn: [
      'Start early to maximize compounding cycles',
      'Consistency trumps starting amount over 10-20 year horizons',
      'Time is your greatest asset in compounding'
    ],
    contentSectionsMy: [
      {
        heading: 'ထပ်မျှတိုး (Compound Interest) ဆိုတာ ဘာလဲ။',
        paragraphs: [
          'ဥပမာ - သင်သည် ကျပ် ၁ သိန်းကို တစ်နှစ်လျှင် ၁၀% အတိုးရသော နေရာတွင် မြှုပ်နှံထားပါက ၁ နှစ်ပြည့်လျှင် ၁၁ သောင်း ရမည်။',
          'ဒုတိယနှစ်တွင် မူလ ၁ သိန်း မကဘဲ ၁၁ သောင်းလုံးအပေါ် ၁၀% အတိုးထပ်တက်သဖြင့် ၁၂၁,၀၀၀ ကျပ် ရရှိမည်။ ၁၀ နှစ်၊ နှစ် ၂၀ ကြာလာသောအခါ အတိုးပေါ်တွင် အတိုးထပ်ဆင့်တက်ပြီး ပမာဏသည် မယုံနိုင်စရာ ကြီးမားလာပါမည်။'
        ],
        quote: 'ထပ်မျှတိုးကို နားလည်သူသည် ၎င်းထံမှ အကျိုးအမြတ် ရရှိ၏။ နားမလည်သူသည် ၎င်းအတွက် အတိုးပေးရ၏။ - Albert Einstein'
      }
    ],
    contentSectionsEn: [
      {
        heading: 'Exponential Growth',
        paragraphs: ['Compounding allows your money to work for you 24 hours a day, 7 days a week.']
      }
    ]
  },

  // --- CATEGORY 2: DEBT MANAGEMENT ---
  {
    id: 'art_good_vs_bad_debt',
    categoryId: 'debt_management',
    categoryTitleMy: 'အကြွေးပညာပေး',
    categoryTitleEn: 'Debt Management',
    titleMy: 'ကောင်းသော အကြွေး (Good Debt) နှင့် မကောင်းသော အကြွေး (Bad Debt)',
    titleEn: 'Good Debt vs Bad Debt: What You Must Know',
    subtitleMy: 'သင့်ကို ချမ်းသာစေသော အကြွေးနှင့် သင့်ကို မွဲတေစေသော အကြွေးများ၏ ခြားနားချက်',
    subtitleEn: 'Learn how wealthy investors leverage debt while avoiding toxic consumer liabilities.',
    readTimeMin: 6,
    iconName: 'Scale',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    summaryMy: 'အကြွေးတိုင်းသည် မကောင်းသည် မဟုတ်ပါ။ သင့်ထံသို့ ဝင်ငွေ ပြန်ထုတ်ပေးသော အကြွေးသည် Good Debt ဖြစ်ပြီး၊ တန်ဖိုးလျော့ပါး အသုံးစရိတ်အတွက် အတိုးပေးရသော အကြွေးသည် Bad Debt ဖြစ်ပါသည်။',
    summaryEn: 'Good debt generates income or expands net worth. Bad debt drains cash flow for depreciating items.',
    keyTakeawaysMy: [
      'Good Debt: စီးပွားရေး တိုးချဲ့ခြင်း၊ ဝင်ငွေရ အိမ်ခြံမြေ ဝယ်ခြင်း၊ ပညာရေးအတွက် ချေးငွေ',
      'Bad Debt: အဝတ်အစား၊ ဖုန်းသစ်၊ အလှပစ္စည်း၊ အပျော်ခရီးအတွက် အတိုးကြီး ချေးယူခြင်း',
      'Bad Debt ကို အမြန်ဆုံး ရှင်းထုတ်ပြီး Good Debt ကိုသာ စနစ်တကျ အသုံးပြုပါ'
    ],
    keyTakeawaysEn: [
      'Good Debt builds assets and net worth (e.g., business expansion loans, rental real estate)',
      'Bad Debt funds lifestyle consumption and carries high interest rates',
      'Eliminate Bad Debt aggressively before taking on any new obligations'
    ],
    contentSectionsMy: [
      {
        heading: '၁။ ကောင်းသော အကြွေး (Good Debt) ဆိုတာ ဘာလဲ။',
        paragraphs: [
          'Good Debt ဆိုသည်မှာ ထိုချေးငွေဖြင့် ရင်းနှီးမြှုပ်နှံလိုက်သောအခါ ပေးရသော အတိုးနှုန်းထက် ပိုမိုများပြားသော ဝင်ငွေ သို့မဟုတ် မြတ်စွန်းမှုကို ပြန်လည် ရရှိစေသည့် အကြွေး ဖြစ်ပါသည်။',
          'ဥပမာ - ၁ လလျှင် ၃% အတိုးပေးရသော ချေးငွေဖြင့် ၁ လလျှင် ၁၀% အမြတ်ရသော စီးပွားရေးလုပ်ငန်းကို တိုးချဲ့လိုက်ခြင်း သို့မဟုတ် မိမိ၏ ဝင်ငွေ တိုးတက်စေမည့် ကျွမ်းကျင်မှု ပညာရပ်များကို သင်ယူခြင်း ဖြစ်ပါသည်။'
        ],
        bullets: [
          'ဝင်ငွေ တိုးပွားစေသော စီးပွားရေး လုပ်ငန်းသုံး ချေးငွေ',
          'ငှားရမ်းခ ဝင်ငွေရရှိမည့် အိမ်ခြံမြေ ရင်းနှီးမြှုပ်နှံမှု',
          'မိမိ၏ စွမ်းဆောင်ရည်နှင့် ဝင်ငွေကို မြှင့်တင်ပေးမည့် ပညာရေး ချေးငွေ'
        ]
      },
      {
        heading: '၂။ မကောင်းသော အကြွေး (Bad Debt) ဆိုတာ ဘာလဲ။',
        paragraphs: [
          'Bad Debt ဆိုသည်မှာ သင့်ထံသို့ ပြန်လည် ဝင်ငွေ မထုတ်ပေးသည့်အပြင် တန်ဖိုး အစဉ်အမြဲ လျော့ကျနေသော ပစ္စည်းများ သို့မဟုတ် သုံးစွဲမှုများအတွက် အတိုးပေးကာ ချေးယူခြင်း ဖြစ်ပါသည်။',
          'ဥပမာ - အလှအပ ကြွားဝါရန်အတွက် ဖုန်းအသစ်ကို အတိုးဖြင့် ဝယ်ခြင်း၊ အထည်သစ်များကို အကြွေးဝယ်ခြင်း၊ မလိုလားအပ်သော အပျော်ခရီးအတွက် ငွေချေးခြင်း။'
        ],
        quote: 'မကောင်းသော အကြွေး (Bad Debt) သည် သင့်၏ အနာဂတ် ဝင်ငွေကို ယနေ့အချိန်၌ ခိုးယူ သုံးစွဲလိုက်ခြင်း ဖြစ်သည်။'
      }
    ],
    contentSectionsEn: [
      {
        heading: 'Good Debt vs Bad Debt',
        paragraphs: [
          'Not all debt is created equal. Good debt increases your leverage and builds long-term wealth.',
          'Bad debt taxes your future earnings to finance present luxuries.'
        ]
      }
    ]
  },
  {
    id: 'art_snowball_vs_avalanche',
    categoryId: 'debt_management',
    categoryTitleMy: 'အကြွေးပညာပေး',
    categoryTitleEn: 'Debt Management',
    titleMy: 'အကြွေးနွံထဲမှ ရုန်းထွက်ရန် နည်းလမ်း ၂ မျိုး (Snowball vs Avalanche)',
    titleEn: 'Two Proven Debt Payoff Strategies: Snowball vs Avalanche',
    subtitleMy: 'မိမိနှလုံးသားနှင့် ကိုက်ညီသော အကြွေးဆပ်နည်းလမ်းဖြင့် အမြန်ဆုံး လွတ်မြောက်အောင် ပြုလုပ်ပါ',
    subtitleEn: 'Compare emotional wins vs mathematical efficiency to eliminate your debts.',
    readTimeMin: 5,
    iconName: 'Zap',
    badgeColor: 'bg-red-100 text-red-800 border-red-200',
    summaryMy: 'အကြွေးများစွာ ရှိနေပါက Snowball (အသေးဆုံး အကြွေးမှ စဆပ်နည်း) သို့မဟုတ် Avalanche (အတိုးနှုန်း အကြီးဆုံးမှ စဆပ်နည်း) နည်းလမ်းကို အသုံးပြု၍ အစီအစဉ်တကျ ရှင်းထုတ်ရပါမည်။',
    summaryEn: 'Debt Snowball builds momentum by targeting small balances first. Debt Avalanche saves money by targeting highest interest rates.',
    keyTakeawaysMy: [
      'Debt Snowball: အကြွေးပမာဏ အသေးဆုံးကို အရင်ဆပ်ပြီး စိတ်ဓာတ်ခွန်အား (Momentum) ယူပါ',
      'Debt Avalanche: အတိုးနှုန်း အမြင့်ဆုံး အကြွေးကို အရင်ဆပ်ပြီး ကုန်ကျစရိတ်ကို အသက်သာဆုံးဖြစ်အောင် လုပ်ပါ',
      'မည်သည့်နည်းလမ်း သုံးသည်ဖြစ်စေ တစ်ခုကို စွဲမြဲစွာ လုပ်ဆောင်ရန် လိုသည်'
    ],
    keyTakeawaysEn: [
      'Snowball Strategy: Pay smallest balance first for quick psychological wins',
      'Avalanche Strategy: Pay highest interest rate first for maximum financial savings',
      'Pick one method and stick to it consistently until debt-free'
    ],
    contentSectionsMy: [
      {
        heading: '၁။ Debt Snowball (ဆီးနှင်းလုံး နည်းလမ်း)',
        paragraphs: [
          'သင့်တွင် အကြွေး ၃ ခု ရှိသည် ဆိုပါစို့ - (က) မိတ်ဆွေထံမှ ၅ သောင်း၊ (ခ) ဆိုင်ထံမှ ၂ သိန်း၊ (ဂ) ဘဏ်ထံမှ သိန်း ၂၀။',
          'Snowball နည်းလမ်းတွင် အတိုးနှုန်းကို ဂရုမစိုက်ဘဲ ပမာဏ အသေးဆုံးဖြစ်သော ၅ သောင်း အကြွေးကို အရင်ဆုံး ပိတ်အောင် ဆပ်ပါသည်။ ၅ သောင်းကျေသွားသောအခါ အကြွေး ၁ ခု လျော့သွားသဖြင့် စိတ်ဓာတ် တက်ကြွမှုနှင့် ခွန်အားများစွာ ရရှိလာပါသည်။'
        ]
      },
      {
        heading: '၂။ Debt Avalanche (ဆီးနှင်းပြို နည်းလမ်း)',
        paragraphs: [
          'Avalanche နည်းလမ်းတွင်မူ ပမာဏကို မကြည့်ဘဲ အတိုးနှုန်း အမြင့်ဆုံး (ဥပမာ - ၁ လ ၁၀% အတိုးပေးနေရသော အကြွေး) ကို အရင်ဆုံး အင်တိုက်အားတိုက် ဆပ်ပါသည်။',
          'ဤနည်းလမ်းသည် သင်ပေးရမည့် အတိုးစုစုပေါင်းကို အများဆုံး လျှော့ချပေးနိုင်သဖြင့် သင်္ချာနည်းအရ အထိရောက်ဆုံး ဖြစ်ပါသည်။'
        ]
      }
    ],
    contentSectionsEn: [
      {
        heading: 'Choosing Your Strategy',
        paragraphs: ['Understand the mental and mathematical differences to become debt-free faster.']
      }
    ]
  },

  // --- CATEGORY 3: BABYLON WISDOM ---
  {
    id: 'art_babylon_7_cures',
    categoryId: 'babylon_wisdom',
    categoryTitleMy: 'ဘေဘီလုံနည်းလမ်းများ',
    categoryTitleEn: 'Babylon Wisdom',
    titleMy: 'ဘေဘီလုံမှ ပိန်ကြုံသော အိတ်ကပ်ကို ကုသရန် နည်းလမ်း ၇ သွယ်',
    titleEn: 'The 7 Cures for a Lean Purse (The Richest Man in Babylon)',
    subtitleMy: 'နှစ်ပေါင်း ထောင်ပေါင်းများစွာ ကတည်းက သက်သေထူခဲ့သော စည်းစိမ်ဥစ္စာ တည်ဆောက်ရေး နိယာမများ',
    subtitleEn: 'Ancient wisdom from Arkad, the richest man in ancient Babylon.',
    readTimeMin: 7,
    iconName: 'Crown',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    summaryMy: 'George S. Clason ၏ ကမ္ဘာကျော် စာအုပ်မှ ဘေဘီလုံမြို့၏ အချမ်းသာဆုံး ပုဂ္ဂိုလ် Arkad ပေးခဲ့သော အိတ်ကပ်ကို ကြွယ်ဝစေမည့် နည်းလမ်း ၇ ချက် ဖြစ်ပါသည်။',
    summaryEn: 'Timeless principles of wealth creation from the classic financial masterpiece.',
    keyTakeawaysMy: [
      '၁။ မိမိရသော ဝင်ငွေ၏ ၁၀% ကို မိမိအတွက် စတင် စုဆောင်းပါ (Start thy purse to fattening)',
      '၂။ သုံးစွဲမှုများကို ထိန်းချုပ်ပါ (Control thy expenditures)',
      '၃။ မိမိ၏ ရွှေ (ငွေ) ကို တိုးပွားအောင် ခိုင်းစေပါ (Make thy gold multiply)',
      '၄။ ဆုံးရှုံးမှုများမှ သင့်ဥစ္စာကို ကာကွယ်ပါ (Guard thy treasures from loss)'
    ],
    keyTakeawaysEn: [
      '1. Start thy purse to fattening (Save 10% of everything you earn)',
      '2. Control thy expenditures (Do not confuse needs with desires)',
      '3. Make thy gold multiply (Put your money to work for passive income)',
      '4. Guard thy treasures from loss (Invest only with experienced advisors)'
    ],
    contentSectionsMy: [
      {
        heading: '၁။ အိတ်ကပ်ကို စတင် ဖောင်းပွစေပါ (ဝင်ငွေ၏ ၁၀% စုပါ)',
        paragraphs: [
          'သင်ရရှိသော ဝင်ငွေတိုင်း၏ အနည်းဆုံး ၁၀% (၁၀ ပုံ ၁ ပုံ) သည် သင့်အတွက် ဖြစ်ပါသည်။ မည်သူ့ကိုမျှ မပေးမီ မိမိအတွက် သီးသန့် ဖယ်ထုတ်ထားပါ။ ဤသည်မှာ စည်းစိမ်၏ အစဖြစ်ပါသည်။'
        ]
      },
      {
        heading: '၂။ သုံးစွဲမှုများကို ထိန်းချုပ်ပါ',
        paragraphs: [
          'လူအများစုသည် ဝင်ငွေ တိုးလာသည်နှင့်အမျှ သုံးစွဲမှုများကိုလည်း လိုက်တိုးမြှင့်တတ်ကြပါသည်။ မဖြစ်မနေ လိုအပ်ချက်နှင့် လိုချင်ချက်များကို ခွဲခြား၍ သုံးစွဲမှုကို ထိန်းချုပ်ပါ။'
        ]
      },
      {
        heading: '၃။ မိမိ၏ ငွေကို တိုးပွားအောင် ခိုင်းစေပါ',
        paragraphs: [
          'စုဆောင်းထားသော ငွေသည် အိတ်ကပ်ထဲတွင် အပျင်းထိုင် မနေရပါ။ ထိုငွေကို အတိုး သို့မဟုတ် အမြတ် ရရှိမည့် အလုပ်တွင် ခိုင်းစေ၍ သင့်အတွက် နေ့ရောညပါ အလုပ်လုပ်ပေးသော "ငွေကျေးကျွန်" ဖြစ်စေပါ။'
        ]
      },
      {
        heading: '၄။ ဆုံးရှုံးမှုမှ ကာကွယ်ပါ',
        paragraphs: [
          'မကျွမ်းကျင်သော နေရာများ၊ မြန်မြန် ချမ်းသာမည်ဟု မက်မောစေသော လိမ်လည်မှုများတွင် ငွေကို မမြှုပ်နှံပါနှင့်။ ကျွမ်းကျင်သူများ၏ အကြံဉာဏ်ကိုယူ၍ မူရင်းငွေ မပျောက်ပျက်ရေးကို ဦးစားပေးပါ။'
        ]
      },
      {
        heading: '၅။ မိမိနေအိမ်ကို အကျိုးရှိသော ရင်းနှီးမြှုပ်နှံမှု ဖြစ်စေပါ',
        paragraphs: [
          'မိမိကိုယ်ပိုင် နေအိမ်တွင် အေးချမ်းစွာ နေထိုင်ရခြင်းသည် မိသားစုအတွက် စိတ်ချမ်းသာမှုနှင့် သုံးစွဲမှု သက်သာစေသည့် ကောင်းမွန်သော ပိုင်ဆိုင်မှု ဖြစ်ပါသည်။'
        ]
      },
      {
        heading: '၆။ အနာဂတ်အတွက် ဝင်ငွေ သေချာပါစေ',
        paragraphs: [
          'မိမိ မလုပ်နိုင်တော့သည့် အသက်ကြီးပိုင်း ကာလနှင့် မိသားစုအတွက် အနာဂတ် ရန်ပုံငွေကို ကြိုတင် ပြင်ဆင်ထားပါ။'
        ]
      },
      {
        heading: '၇။ မိမိ၏ စွမ်းဆောင်ရည်ကို မြှင့်တင်ပါ',
        paragraphs: [
          'ဝင်ငွေ ပိုမို ရရှိရန်အတွက် မိမိ၏ ပညာ၊ ကျွမ်းကျင်မှုနှင့် စွမ်းဆောင်ရည်များကို စဉ်ဆက်မပြတ် လေ့လာ သင်ယူပါ။'
        ]
      }
    ],
    contentSectionsEn: [
      {
        heading: 'The Ancient Wisdom of Babylon',
        paragraphs: ['Master the 7 cures to transform your financial reality forever.']
      }
    ]
  },
  {
    id: 'art_babylon_5_laws_of_gold',
    categoryId: 'babylon_wisdom',
    categoryTitleMy: 'ဘေဘီလုံနည်းလမ်းများ',
    categoryTitleEn: 'Babylon Wisdom',
    titleMy: 'ဘေဘီလုံမှ ရွှေ၏ ဥပဒေ ၅ ချက် (The 5 Laws of Gold)',
    titleEn: 'The 5 Laws of Gold: Ancient Rules of Wealth Retention',
    subtitleMy: 'ရွှေ (ငွေကြေး) သည် မည်သူ့ထံသို့ လာရောက်၍ မည်သူ့ထံမှ ထွက်ပြေးသွားသနည်း',
    subtitleEn: 'How gold behaves towards those who respect or abuse its rules.',
    readTimeMin: 5,
    iconName: 'Award',
    badgeColor: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    summaryMy: 'ငွေကြေးသည် ၎င်း၏ ဥပဒေ ၅ ချက်ကို လေးစား လိုက်နာသူများထံသို့ ဝမ်းမြောက်စွာ ရောက်ရှိလာပြီး၊ မလိုက်နာသူများထံမှ ဆုံးရှုံး ထွက်ပြေးသွားတတ်ပါသည်။',
    summaryEn: 'Gold comes gladly and in increasing quantity to those who observe its immutable laws.',
    keyTakeawaysMy: [
      '၁။ ဝင်ငွေ၏ ၁၀% ကို သိမ်းဆည်းသူထံ ရွှေသည် လာရောက်သည်',
      '၂။ ကျွမ်းကျင်စွာ ခိုင်းစေသူထံတွင် ရွှေသည် တိုးပွားသည်',
      '၃။ ကျွမ်းကျင်သူ၏ အကြံဖြင့် မြှုပ်နှံသူထံတွင် ရွှေသည် စွဲမြဲသည်',
      '၄။ မသိသော စီးပွားရေးတွင် စွန့်စားပါက ရွှေသည် ထွက်ပြေးသည်'
    ],
    keyTakeawaysEn: [
      'Gold flows to those who save 10% or more',
      'Gold multiplies for those who find it profitable employment',
      'Gold clings to the protection of wise advisors',
      'Gold flees from tricksters and unrealistic get-rich-quick schemes'
    ],
    contentSectionsMy: [
      {
        heading: 'ရွှေ၏ ဥပဒေ ၅ ချက်',
        paragraphs: [
          '၁။ ရွှေသည် မိမိ၏ ဝင်ငွေ ၁၀% ထက်မနည်းကို မိမိနှင့် မိသားစု အနာဂတ်အတွက် သီးသန့် သိမ်းဆည်းသူထံသို့ ဝမ်းမြောက်စွာနှင့် တိုးပွားလျက် ရောက်ရှိလာ၏။',
          '၂။ ရွှေသည် ၎င်းအား ကျွမ်းကျင်စွာ ခိုင်းစေသော သခင်အတွက် သိုးအုပ်ကဲ့သို့ အဆမတန် တိုးပွားပေး၏။',
          '၃။ ရွှေသည် ၎င်းအား စီမံခန့်ခွဲရာတွင် ကျွမ်းကျင်သူများ၏ အကြံဉာဏ်အတိုင်း သတိရှိစွာ မြှုပ်နှံသူ၏ လက်ထဲတွင် ခိုင်မြဲစွာ တည်ရှိ၏။',
          '၄။ ရွှေသည် မိမိ နားမလည်သော သို့မဟုတ် ကျွမ်းကျင်သူများ သဘောမတူသော စီးပွားရေးတွင် မြှုပ်နှံပါက သခင်၏ လက်ထဲမှ ထွက်ပြေးသွား၏။',
          '၅။ ရွှေသည် မဖြစ်နိုင်သော အမြတ်အစွန်းများ မက်မောသူ၊ လိမ်လည်သူများ၏ စကားကို ယုံကြည်သူထံမှ ပျောက်ကွယ်သွား၏။'
        ]
      }
    ],
    contentSectionsEn: [
      {
        heading: 'Laws of Gold',
        paragraphs: ['Respect the laws of money to ensure lifelong stability.']
      }
    ]
  },

  // --- CATEGORY 4: POWER 48 ---
  {
    id: 'art_power_48_career_laws',
    categoryId: 'power_48',
    categoryTitleMy: 'Power 48 ဘဝတက်လမ်း',
    categoryTitleEn: '48 Laws of Power',
    titleMy: 'Power 48: လုပ်ငန်းခွင်နှင့် ဘဝတက်လမ်းအတွက် အရေးကြီး နိယာမများ (Law 1, 3, 9, 28)',
    titleEn: '48 Laws of Power: Career Advancement & Personal Mastery',
    subtitleMy: 'Robert Greene ၏ Power 48 စာအုပ်မှ ဘဝတက်လမ်းနှင့် လူမှုဆက်ဆံရေး ရွှေရောင် သင်ခန်းစာများ',
    subtitleEn: 'Strategic insights from Robert Greene’s masterpiece to navigate career and life.',
    readTimeMin: 6,
    iconName: 'Flame',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    summaryMy: 'လုပ်ငန်းခွင်နှင့် လူမှုအသိုင်းအဝိုင်းတွင် မလိုအပ်သော ရန်သူများ မများစေဘဲ စနစ်တကျ ရာထူးနှင့် ဘဝတက်လမ်း ရှာဖွေနိုင်မည့် Power 48 ၏ အဓိက နိယာမများ ဖြစ်ပါသည်။',
    summaryEn: 'Essential principles to navigate corporate hierarchy, build authority, and avoid career traps.',
    keyTakeawaysMy: [
      'Law 1: ဆရာထက် ပေါ်လွင်အောင် မလုပ်ပါနှင့် (Never Outshine the Master) - အထက်လူကြီး၏ မာနကို မထိခိုက်ပါစေနှင့်',
      'Law 3: သင့် ရည်ရွယ်ချက်များကို လျှို့ဝှက်ထားပါ (Conceal Your Intentions) - မလိုအပ်ဘဲ ကြွားဝါခြင်း ရှောင်ပါ',
      'Law 9: စကားဖြင့် အနိုင်မယူဘဲ လုပ်ဆောင်ချက်ဖြင့် သက်သေပြပါ (Win Through Actions, Never Argument)',
      'Law 28: ရဲရင့်စွာ စတင်ပါ (Enter Action with Boldness) - တွန့်ဆုတ်နေပါက လေးစားမှု လျော့ကျမည်'
    ],
    keyTakeawaysEn: [
      'Law 1: Never outshine the master - make superiors feel comfortably superior',
      'Law 3: Conceal your intentions - keep opponents off-balance',
      'Law 9: Win through actions, never through argument',
      'Law 28: Enter action with boldness - hesitation creates doubt'
    ],
    contentSectionsMy: [
      {
        heading: 'Law 1: ဆရာထက် သို့မဟုတ် အထက်လူကြီးထက် ပေါ်လွင်အောင် မလုပ်ပါနှင့်',
        paragraphs: [
          'လုပ်ငန်းခွင်တွင် မိမိ၏ တော်ကြောင်း တတ်ကြောင်းကို အထက်လူကြီးထက် ပိုမို ပေါ်လွင်အောင် အဆမတန် ကြွားဝါပြသပါက အထက်လူကြီးသည် စိတ္တဇဖြစ်ကာ သင့်ကို ရာထူးတက်လမ်း မပေးဘဲ ပိတ်ဆို့ထားတတ်ပါသည်။',
          'အမှန်တကယ် ပညာရှိသူသည် မိမိ၏ အထက်လူကြီးကို ပိုမို ပေါ်လွင်အောင် ကူညီရင်း မိမိ၏ ရည်မှန်းချက်ဆီသို့ စနစ်တကျ လျှောက်လှမ်းကြပါသည်။'
        ]
      },
      {
        heading: 'Law 3: မိမိ၏ ရည်ရွယ်ချက်များကို လျှို့ဝှက်ထားပါ',
        paragraphs: [
          'သင့်၏ အနာဂတ် အစီအစဉ်များနှင့် စီးပွားရေး လျှို့ဝှက်ချက်များကို လူတိုင်းအား လွယ်လွယ်ကူကူ ထုတ်မပြောပါနှင့်။ လူတို့သည် သင့်ရည်ရွယ်ချက်ကို မသိပါက ကြိုတင် ပိတ်ဆို့ တိုက်ခိုက်နိုင်မည် မဟုတ်ပါ။'
        ]
      },
      {
        heading: 'Law 9: အငြင်းအခုံ မဟုတ်ဘဲ လုပ်ဆောင်ချက်ဖြင့် အနိုင်ယူပါ',
        paragraphs: [
          'စကားနိုင်လု အငြင်းပွားခြင်းသည် ခဏတာ အနိုင်ရသော်လည်း ရန်ငြိုးနှင့် မုန်းတီးမှုကိုသာ ကျန်ရစ်စေပါသည်။ ထို့ကြောင့် စကားဖြင့် မငြင်းဘဲ ထိရောက်သော စက်ပစ္စည်း/လုပ်ဆောင်ချက် ရလဒ်ဖြင့်သာ သက်သေပြပါ။'
        ]
      },
      {
        heading: 'Law 28: ရဲရင့်စွာ စတင်ပါ (Enter Action with Boldness)',
        paragraphs: [
          'မည်သည့် အလုပ် သို့မဟုတ် စီးပွားရေးတွင်မဆို သံသယနှင့် တွန့်ဆုတ်နေပါက အခွင့်အရေး လွတ်သွားမည် ဖြစ်ပါသည်။ ရဲရင့်ပြတ်သားစွာ စတင်ခြင်းသည် အခြားသူများ၏ လေးစားမှုကို ရရှိစေပါသည်။'
        ]
      }
    ],
    contentSectionsEn: [
      {
        heading: 'Navigating Workplace Dynamics',
        paragraphs: ['Master the subtle laws of power to safeguard and elevate your position.']
      }
    ]
  },
  {
    id: 'art_power_48_influence',
    categoryId: 'power_48',
    categoryTitleMy: 'Power 48 ဘဝတက်လမ်း',
    categoryTitleEn: '48 Laws of Power',
    titleMy: 'Power 48: သြဇာနှင့် ယုံကြည်မှု တည်ဆောက်ခြင်း (Law 10, 13, 29, 48)',
    titleEn: 'Power 48: Building Long-term Influence and Adaptability',
    subtitleMy: 'အဆိုးမြင်သူများကို ရှောင်ကြဉ်ခြင်း၊ အခြားသူ၏ အကျိုးစီးပွားကို အဓိကထား၍ အကူအညီတောင်းခြင်း',
    subtitleEn: 'How to protect your mental energy and form win-win alliances.',
    readTimeMin: 6,
    iconName: 'Compass',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    summaryMy: 'မလိုလားအပ်သော အဆိုးမြင် စွမ်းအင်များမှ ကာကွယ်ခြင်းနှင့် အရာရာကို အစမှ အဆုံးထိ ကြိုတင် စီစဉ်တွက်ချက်နိုင်သော စွမ်းရည်များ ဖြစ်ပါသည်။',
    summaryEn: 'Protect your focus, leverage mutual self-interest, and plan through to the end.',
    keyTakeawaysMy: [
      'Law 10: မကောင်းသော စိတ္တဇနှင့် အဆိုးမြင်သူများကို ရှောင်ကြဉ်ပါ (Avoid the Unhappy and Unlucky)',
      'Law 13: အကူအညီ တောင်းခံရာတွင် အခြားသူ၏ အကျိုးစီးပွားကို ဦးတည်ပါ (Appeal to Self-Interest)',
      'Law 29: အစမှ အဆုံးထိ ကြိုတင် စီမံပါ (Plan All the Way to the End)',
      'Law 48: ပုံသေမထားဘဲ လိုက်လျောညီထွေ ပြောင်းလဲပါ (Assume Formlessness)'
    ],
    keyTakeawaysEn: [
      'Law 10: Avoid the unhappy and unlucky - emotional states are infectious',
      'Law 13: Appeal to self-interest, never to mercy or gratitude',
      'Law 29: Plan all the way to the end - calculate all potential consequences',
      'Law 48: Assume formlessness - stay flexible and adapt to change'
    ],
    contentSectionsMy: [
      {
        heading: 'Law 10: အဆိုးမြင် စွမ်းအင် ရှိသူများကို ရှောင်ကြဉ်ပါ',
        paragraphs: [
          'စိတ်ဓာတ်ကျလွယ်သော၊ အမြဲတမ်း ညည်းတွားနေသော၊ မကောင်းသည့် ကံကြမ္မာများ အမြဲကြုံနေရသူများနှင့် နီးကပ်စွာ ပေါင်းသင်းပါက ၎င်းတို့၏ အဆိုးမြင် စွမ်းအင်များသည် သင့်ထံသို့ ကူးစက်လာပါလိမ့်မည်။ ထို့ကြောင့် တက်ကြွ စိတ္တဇရှိသူများနှင့်သာ တွဲဖက်ပါ။'
        ]
      },
      {
        heading: 'Law 13: အကူအညီ တောင်းလျှင် သူ၏ အကျိုးစီးပွားကို ယှဉ်ပြပါ',
        paragraphs: [
          'အခြားသူထံမှ အကူအညီ တောင်းခံသည့်အခါ သနားစရာ ကောင်းကြောင်း သို့မဟုတ် ကျေးဇူးတရားများကို ထုတ်ပြောမည့်အစား ဤအလုပ်ကို ကူညီခြင်းဖြင့် "သူ ဘာအကျိုးရမည်လဲ" ဆိုသည်ကို ရှင်းလင်းစွာ ပြသပါ'
        ]
      },
      {
        heading: 'Law 48: ပုံသေမထားဘဲ အခြေအနေအတိုင်း ပြောင်းလဲပါ',
        paragraphs: [
          'ခေတ်စနစ်၊ နည်းပညာနှင့် စီးပွားရေး ပတ်ဝန်းကျင်သည် အမြဲတမ်း ပြောင်းလဲနေပါသည်။ ပုံသေ မာကျောနေသူများသည် ကျရှုံးသွားကြပြီး ရေကဲ့သို့ အခြေအနေအတိုင်း လိုက်လျောညီထွေ ပြောင်းလဲနိုင်သူများသာ အောင်မြင်ကြပါသည်။'
        ]
      }
    ],
    contentSectionsEn: [
      {
        heading: 'Strategic Influence',
        paragraphs: ['Apply these laws to build unbreakable resilience and professional success.']
      }
    ]
  },

  // --- CATEGORY 5: WEALTH MINDSET ---
  {
    id: 'art_poverty_vs_wealth_mindset',
    categoryId: 'wealth_mindset',
    categoryTitleMy: 'စည်းစိမ်ဥစ္စာ လမ်းကြောင်း',
    categoryTitleEn: 'Wealth Mindset',
    titleMy: 'ဆင်းရဲသော စိတ်ဓာတ် (Poverty Mindset) နှင့် ချမ်းသာသော စိတ်ဓာတ် (Wealth Mindset)',
    titleEn: 'Poverty Mindset vs Wealth Mindset: Transforming Your Financial Vision',
    subtitleMy: 'အတွေးအခေါ် ပြောင်းလဲခြင်းသည် စည်းစိမ်ဥစ္စာ ပြောင်းလဲခြင်း၏ ပထမဆုံး အစဖြစ်သည်',
    subtitleEn: 'The psychological shift required to transcend financial limitation.',
    readTimeMin: 5,
    iconName: 'Sparkles',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    summaryMy: 'ငွေကြေး အခက်အခဲသည် အတွေးအခေါ်မှ စတင်ပါသည်။ ဆင်းရဲသော အတွေးအခေါ်သည် ရေတို သုံးစွဲမှုကို အာရုံစိုက်ပြီး ချမ်းသာသော အတွေးအခေါ်သည် ရေရှည် ပိုင်ဆိုင်မှုကို အာရုံစိုက်ပါသည်။',
    summaryEn: 'Wealth is first created in the mind through long-term vision and delayed gratification.',
    keyTakeawaysMy: [
      'Poverty Mindset: ရေတို သုံးစွဲမှုကို ကြည့်သည်၊ အခြားသူများကို အပြစ်တင်သည်၊ ငွေရှားပါးသည်ဟု တွေးသည်',
      'Wealth Mindset: ရေရှည် ရင်းနှီးမြှုပ်နှံမှုကို ကြည့်သည်၊ တာဝန်ယူသည်၊ အခွင့်အလမ်းများကို ရှာဖွေသည်',
      'ယနေ့မှစ၍ သင့်၏ အတွေးအခေါ်ကို ပြောင်းလဲပါ'
    ],
    keyTakeawaysEn: [
      'Poverty Mindset focuses on short-term consumption and scarcity',
      'Wealth Mindset focuses on long-term assets and abundance opportunities',
      'Shift your focus from spending to value creation'
    ],
    contentSectionsMy: [
      {
        heading: 'အတွေးအခေါ် ခြားနားချက်များ',
        paragraphs: [
          '• ဆင်းရဲသော စိတ်ဓာတ် ရှိသူသည် ငွေရပါက "ဘာဝယ်ရမလဲ" ဟု စဉ်းစားပြီး၊ ချမ်းသာသော စိတ်ဓာတ် ရှိသူသည် "ဒီငွေကို ဘယ်လို တိုးပွားအောင် လုပ်ရမလဲ" ဟု စဉ်းစားပါသည်။',
          '• ဆင်းရဲသော စိတ်ဓာတ် ရှိသူသည် ရေတို စိတ္တဇ ပျော်ရွှင်မှုကို လိုချင်ပြီး၊ ချမ်းသာသော စိတ်ဓာတ် ရှိသူသည် ရေရှည် လွတ်လပ်မှုကို ဦးစားပေးပါသည်။'
        ]
      }
    ],
    contentSectionsEn: [
      {
        heading: 'Mindset Transformation',
        paragraphs: ['Reframe your relationship with money from fear to intentional strategy.']
      }
    ]
  },
  {
    id: 'art_multiple_income_streams',
    categoryId: 'wealth_mindset',
    categoryTitleMy: 'စည်းစိမ်ဥစ္စာ လမ်းကြောင်း',
    categoryTitleEn: 'Wealth Mindset',
    titleMy: 'ဝင်ငွေ လမ်းကြောင်းမျိုးစုံ တည်ဆောက်နည်း (Multiple Income Streams)',
    titleEn: 'How to Build Multiple Streams of Income',
    subtitleMy: 'လစာ ဝင်ငွေ ၁ ခုတည်းအပေါ် လုံးဝ မမှီခိုဘဲ ဘေးကင်းသော ငွေကြေးစနစ် တည်ဆောက်နည်း',
    subtitleEn: 'Never rely on a single income source. Diversify for true financial security.',
    readTimeMin: 5,
    iconName: 'Layers',
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
    summaryMy: 'လစာ ၁ ခုတည်းအပေါ် မှီခိုနေခြင်းသည် အလွန် စွန့်စားရလွန်းပါသည်။ Active Income နှင့် Passive Income များကို ပေါင်းစပ်၍ လမ်းကြောင်း ၃ ခုမှ ၅ ခုအထိ တည်ဆောက်ရပါမည်။',
    summaryEn: 'Diversify your revenue channels through earned income, investments, royalties, and rental yield.',
    keyTakeawaysMy: [
      'Earned Income (လစာ/လုပ်ခ) - အချိန်ပေး၍ ရသော ငွေ',
      'Profit Income (စီးပွားရေး အမြတ်) - ပစ္စည်း သို့မဟုတ် ဝန်ဆောင်မှု ရောင်းရငွေ',
      'Interest & Rental Income (အတိုးနှင့် အငှားခ) - ပိုင်ဆိုင်မှုများမှ ရသော ငွေ'
    ],
    keyTakeawaysEn: [
      'Earned Income: Trading time for money',
      'Profit Income: Buying and selling goods/services',
      'Passive Income: Investment yields, rentals, royalties'
    ],
    contentSectionsMy: [
      {
        heading: 'ဝင်ငွေ လမ်းကြောင်း အမျိုးအစားများ',
        paragraphs: [
          '၁။ Earned Income (အဓိက လစာ/အလုပ်)',
          '၂။ Side Hustle Income (ဘေးထွက် ကျွမ်းကျင်မှုဖြင့် ရှာဖွေသော ဝင်ငွေ)',
          '၃။ Rental Income (အိမ်၊ ခြံ၊ ကား၊ စက်ပစ္စည်း ငှားရမ်းခ)',
          '၄။ Investment Yield (အမြတ်ဝေစုနှင့် ရင်းနှီးမြှုပ်နှံမှု ရလဒ်များ)'
        ]
      }
    ],
    contentSectionsEn: [
      {
        heading: 'Income Stream Breakdown',
        paragraphs: ['Build a resilient portfolio of cash flow sources.']
      }
    ]
  },
  {
    id: 'art_financial_freedom_roadmap',
    categoryId: 'wealth_mindset',
    categoryTitleMy: 'စည်းစိမ်ဥစ္စာ လမ်းကြောင်း',
    categoryTitleEn: 'Wealth Mindset',
    titleMy: 'ငွေကြေး လွတ်လပ်ခွင့် (Financial Freedom) သို့ ရောက်ရှိရန် အဆင့် ၅ ဆင့်',
    titleEn: 'The 5-Step Roadmap to Absolute Financial Freedom',
    subtitleMy: 'ငွေအတွက် အလုပ်လုပ်နေရသော ဘဝမှ ငွေက သင့်အတွက် အလုပ်လုပ်ပေးသော ဘဝသို့',
    subtitleEn: 'A clear step-by-step path from financial survival to ultimate independence.',
    readTimeMin: 6,
    iconName: 'Compass',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    summaryMy: 'ငွေကြေး လွတ်လပ်ခွင့် ဆိုသည်မှာ အလုပ် မလုပ်ဘဲ နေသော်လည်း မိမိ ပိုင်ဆိုင်မှုများမှ ရသော ဝင်ငွေသည် နေ့စဉ် ကုန်ကျစရိတ်ထက် ပိုမို များပြားနေသော အခြေအနေ ဖြစ်ပါသည်။',
    summaryEn: 'Financial freedom is reached when passive cash flow exceeds all your living expenses.',
    keyTakeawaysMy: [
      'အဆင့် ၁: အကြွေးဆိုးများ လုံးဝ ကင်းရှင်းရေး',
      'အဆင့် ၂: ၆ လစာ အရေးပေါ် ရန်ပုံငွေ တည်ဆောက်ရေး',
      'အဆင့် ၃: ပုံမှန် မပျက်မကွက် ရင်းနှီးမြှုပ်နှံရေး',
      'အဆင့် ၄: Passive Income ကုန်ကျစရိတ်ထက် ကျော်လွန်ရေး'
    ],
    keyTakeawaysEn: [
      'Step 1: Eliminate all toxic high-interest bad debts',
      'Step 2: Build a 6-month solid liquid emergency cushion',
      'Step 3: Consistently invest in income-generating assets',
      'Step 4: Achieve passive income higher than total living costs'
    ],
    contentSectionsMy: [
      {
        heading: 'ငွေကြေး လွတ်လပ်ခွင့် လမ်းကြောင်း ၅ ဆင့်',
        paragraphs: [
          '၁။ အဆင့် ၁ (ရှင်သန်ရေး) - အကြွေးဆိုးများ ကင်းရှင်းပြီး လစဉ် ဝင်ငွေသည် ထွက်ငွေထက် ပိုများအောင် ပြုလုပ်ခြင်း။',
          '၂။ အဆင့် ၂ (လုံခြုံရေး) - အရေးပေါ် ရန်ပုံငွေ ၆ လစာ စုဆောင်းပြီးစီးခြင်း။',
          '၃။ အဆင့် ၃ (စုဆောင်းရေး) - ဝင်ငွေ၏ ၂၀% ထက်မနည်းကို ပုံမှန် ရင်းနှီးမြှုပ်နှံခြင်း။',
          '၄။ အဆင့် ၄ (လွတ်လပ်ရေး) - ရင်းနှီးမြှုပ်နှံမှုမှ ရသော အတိုး/အမြတ်သည် အိမ်လခနှင့် အစားစရိတ်ကို ကာမိသွားခြင်း။',
          '၅။ အဆင့် ၅ (ကြွယ်ဝရေး) - မည်သည့် အလုပ်မျှ လုပ်စရာ မလိုဘဲ မိသားစုနှင့် ပျော်ရွှင်စွာ လွတ်လပ်စွာ နေထိုင်နိုင်ခြင်း။'
        ]
      }
    ],
    contentSectionsEn: [
      {
        heading: 'The 5 Milestones',
        paragraphs: ['Follow the step-by-step roadmap to achieve lifelong peace of mind.']
      }
    ]
  }
];
