import React, { useState } from 'react';
import { X, BookOpen, Search, Sparkles, CheckCircle2, Wallet, ArrowLeftRight, HandCoins, PieChart, Cloud, ShieldCheck, Lock, Smartphone, HelpCircle, Plus, RefreshCw, TrendingUp, FileSpreadsheet, Zap, Users, KeyRound, ShieldAlert, LogOut, UserPlus, Layers, Activity, Database } from 'lucide-react';
import { FortuneLogo, LogoStyle } from './FortuneLogo';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'my' | 'en';
  logoStyle?: LogoStyle;
}

export const UserGuideModal: React.FC<UserGuideModalProps> = ({
  isOpen,
  onClose,
  lang,
  logoStyle = 'pixiu',
}) => {
  const [activeTab, setActiveTab] = useState<string>('getting_started');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const categories = [
    {
      id: 'getting_started',
      icon: BookOpen,
      title: lang === 'my' ? 'စတင်အသုံးပြုပုံ' : 'Getting Started',
      desc: lang === 'my' ? 'Google Sign-In နှင့် Guest Mode သုံးစွဲပုံ' : 'Google Auth & Guest Mode',
    },
    {
      id: 'cashflow',
      icon: ArrowLeftRight,
      title: lang === 'my' ? 'ဝင်ငွေ/ထွက်ငွေ ရေးသွင်းခြင်း' : 'Income & Expenses',
      desc: lang === 'my' ? 'စာရင်းသစ် ထည့်ခြင်း၊ ပြင်ခြင်း၊ ဖျက်ခြင်း' : 'Adding & managing cash flow',
    },
    {
      id: 'debts',
      icon: HandCoins,
      title: lang === 'my' ? 'အကြွေးစာရင်း စီမံခန့်ခွဲမှု' : 'Debt Management',
      desc: lang === 'my' ? 'ရရန်/ပေးရန် အကြွေးနှင့် ဆပ်ငွေမှတ်တမ်း' : 'Receivables, Payables & Repayments',
    },
    {
      id: 'wallets',
      icon: Wallet,
      title: lang === 'my' ? 'ပိုက်ဆံအိတ်နှင့် ငွေလွှဲခြင်း' : 'Wallets & Transfers',
      desc: lang === 'my' ? 'KPay, WavePay, Cash သီးသန့်ခွဲခြင်း' : 'Multi-wallets & internal transfers',
    },
    {
      id: 'shared_wallets',
      icon: Users,
      title: lang === 'my' ? 'Shared Wallet & ခွင့်ပြုချက်များ' : 'Shared Wallets & Permissions',
      desc: lang === 'my' ? 'ပိုက်ဆံအိတ် မျှဝေခြင်းနှင့် လုပ်ပိုင်ခွင့် သတ်မှတ်ခြင်း' : 'Sharing wallets & granular access control',
    },
    {
      id: 'budgets',
      icon: PieChart,
      title: lang === 'my' ? 'ဘတ်ဂျက်နှင့် စာရင်းဇယား' : 'Budgets & Analytics',
      desc: lang === 'my' ? 'သုံးစွဲမှု ကန့်သတ်ချက်နှင့် စုဆောင်းငွေ' : 'Budget limits & monthly charts',
    },
    {
      id: 'cloud_security',
      icon: Cloud,
      title: lang === 'my' ? 'Cloud Sync & PIN Lock' : 'Cloud Sync & Security',
      desc: lang === 'my' ? 'အလိုအလျောက် သိမ်းခြင်းနှင့် PIN သော့' : 'Auto sync, Excel export & PIN lock',
    },
    {
      id: 'data_management',
      icon: Database,
      title: lang === 'my' ? 'ဒေတာ စီမံခန့်ခွဲမှု & သန့်ရှင်းရေး' : 'Data Management & Reset',
      desc: lang === 'my' ? 'စာရင်းဖျက်ခြင်း၊ Cloud စစ်ဆေးခြင်းနှင့် Backup သိမ်းဆည်းခြင်း' : 'Cloud reconciliation, safe reset & backup restore',
    },
    {
      id: 'troubleshooting',
      icon: ShieldAlert,
      title: lang === 'my' ? 'ချိတ်ဆက်မှု ပြဿနာများ ဖြေရှင်းနည်း' : 'Troubleshooting & Network FAQs',
      desc: lang === 'my' ? 'URL မှန်ကန်ရေးနှင့် Google Sign-in အမှားများ' : 'App URL & sign-in connection issues',
    },
  ];

  const guideTopics = [
    {
      categoryId: 'getting_started',
      title: lang === 'my' ? '၁။ Google အကောင့် သို့မဟုတ် Guest Mode ရွေးချယ်ခြင်း' : '1. Choosing Google Sign-In or Guest Mode',
      icon: Sparkles,
      steps: lang === 'my' ? [
        'အက်ပလီကေးရှင်း စတင်ဖွင့်ချိန်တွင် Google Sign-In သို့မဟုတ် Guest Mode ကို ရွေးချယ်နိုင်ပါသည်။',
        'Google Sign-In: စာရင်းဒေတာများကို Google Cloud ပေါ်တွင် အလိုအလျောက် အမြဲ သိမ်းဆည်းပေးမည်ဖြစ်ပြီး ဖုန်းပြောင်းသုံးသော်လည်း ဒေတာမပျောက်ပါ။',
        'Guest Mode: အကောင့်ဖွင့်ရန် မလိုဘဲ စက်ထဲ၌သာ အလွယ်တကူ စမ်းသုံးနိုင်ပြီး နောက်ပိုင်းတွင် Google အကောင့်သို့ အချိန်မရွေး ချိတ်ဆက်နိုင်ပါသည်။',
      ] : [
        'Choose between Google Sign-In or Guest Mode on launch.',
        'Google Sign-In: Automatically syncs data securely to Google Cloud across devices.',
        'Guest Mode: Uses local offline storage with full functionality. Connect to Google anytime later.',
      ],
    },
    {
      categoryId: 'getting_started',
      title: lang === 'my' ? '၂။ ဖုန်း သို့မဟုတ် ကွန်ပျူတာထဲ App အဖြစ် ထည့်သွင်းခြင်း (PWA Install)' : '2. Installing as App (PWA Installation)',
      icon: Smartphone,
      steps: lang === 'my' ? [
        'Browser မလိုအပ်ဘဲ ဖုန်း HomeScreen သို့မဟုတ် Desktop တွင် သီးသန့် အက်ပလီကေးရှင်းအဖြစ် ထည့်သွင်း သုံးစွဲနိုင်ပါသည်။',
        'အပေါ် Navigation Bar ရှိ "+ App သွင်းမည်" ခလုတ် သို့မဟုတ် Sidebar ရှိ "App Install ပြုလုပ်ရန်" ကို နှိပ်၍ ၁-စက္ကန့်အတွင်း ထည့်သွင်းနိုင်ပါသည်။',
        'အင်တာနက် မရှိသည့် အချိန်များတွင်လည်း အော့ဖ်လိုင်း (Offline) အပြည့်အဝ သုံးစွဲနိုင်ပါသည်။',
      ] : [
        'Install NgweSarYin directly to your Phone or Computer home screen as a standalone PWA app.',
        'Click "+ App Install" in the top bar or sidebar menu to install instantly.',
        'Works 100% offline without active internet connection.',
      ],
    },
    {
      categoryId: 'cashflow',
      title: lang === 'my' ? '၁။ ဝင်ငွေ / ထွက်ငွေ စာရင်းသစ် ရေးသွင်းပုံ' : '1. Recording Incomes & Expenses',
      icon: Plus,
      steps: lang === 'my' ? [
        'အောက်ခြေ ပေါင်းစပ်ခလုတ် သို့မဟုတ် အပေါ်ရှိ "+ စာရင်းသစ်" ခလုတ်ကို နှိပ်ပါ။',
        'ဝင်ငွေ (Income) သို့မဟုတ် ထွက်ငွေ (Expense) အမျိုးအစားကို ရွေးပါ။',
        'ပမာဏ၊ အကြောင်းအရာ၊ ကဏ္ဍ (Category) နှင့် အသုံးပြုသည့် ပိုက်ဆံအိတ် (Wallet) တို့ကို ရွေးချယ်ပါ။',
        'လိုအပ်ပါက ရက်စွဲပြောင်းခြင်း၊ မှတ်စုရေးခြင်း၊ ကဏ္ဍခွဲများ (Subcategories) နှင့် စလစ်/ပြေစာ ပုံများ ပူးတွဲထည့်သွင်းနိုင်ပါသည်။',
      ] : [
        'Tap "+ New Record" or the floating action button at the bottom right.',
        'Select Income or Expense transaction type.',
        'Enter amount, title, category, and target wallet.',
        'Optionally customize transaction date, subcategory, detailed notes, or receipt images.',
      ],
    },
    {
      categoryId: 'cashflow',
      title: lang === 'my' ? '၂။ စာရင်းများကို ရှာဖွေခြင်း၊ ပြင်ဆင်ခြင်းနှင့် ဖျက်ခြင်း' : '2. Searching, Editing & Deleting Records',
      icon: Search,
      steps: lang === 'my' ? [
        'အပေါ်ဘားရှိ "ရှာဖွေရန်" (⌘K) ခလုတ်ကို နှိပ်၍ အမည်၊ ပမာဏ၊ ရက်စွဲ သို့မဟုတ် မှတ်စုများဖြင့် စက္ကန့်ပိုင်းအတွင်း ရှာနိုင်ပါသည်။',
        'ဝင်ငွေ/ထွက်ငွေ စာရင်းဇယားတွင် သက်ဆိုင်ရာ စာရင်းကဒ်ပေါ်ရှိ ခဲတံပုံ (Edit) ခလုတ်ဖြင့် အချက်အလက်များကို ပြန်လည်ပြင်ဆင်နိုင်ပါသည်။',
        'အမှိုက်ပုံးပုံ (Delete) ခလုတ်ဖြင့် စာရင်းမှန်မှန် မှားမှား အလွယ်တကူ ဖျက်ပစ်နိုင်ပြီး ပိုက်ဆံအိတ် လက်ကျန်ငွေ အလိုအလျောက် ပြန်လည်ညှိပေးပါသည်။',
      ] : [
        'Use the top search bar (⌘K) to quickly query by keyword, category, note, or exact amount.',
        'Click the Edit (pencil) icon on any transaction card to modify details.',
        'Click Delete (trash) to remove transactions; wallet balances automatically recalculate.',
      ],
    },
    {
      categoryId: 'cashflow',
      title: lang === 'my' ? '၃။ Shared Wallet အတွင်း သော့ခတ်ထားသော ခွင့်ပြုချက်များ (Permission Locks)' : '3. Permission Locks in Shared Wallets',
      icon: Lock,
      steps: lang === 'my' ? [
        'အခြားသူတစ်ဦး၏ Shared Wallet တွင် ပိုင်ရှင်မှ သင့်အတွက် ဝင်ငွေ သို့မဟုတ် ထွက်ငွေ ဆိုင်ရာ လုပ်ပိုင်ခွင့်များ ကန့်သတ်ထားပါက သော့ခတ် (Lock 🔒) သင်္ကေတဖြင့် ပေါ်နေမည်ဖြစ်ပါသည်။',
        'ခွင့်ပြုချက်မရှိသော လုပ်ဆောင်ချက်များ (ဥပမာ- ထွက်ငွေထည့်ခွင့်၊ ပြင်ဆင်ခွင့်၊ ဖျက်ခွင့်) ကို မတော်တဆ စာရင်းမမှားစေရန် စနစ်မှ အလိုအလျောက် ပိတ်ပင်ကာကွယ်ပေးထားပါသည်။',
        'လုပ်ပိုင်ခွင့်များ ပြောင်းလဲလိုပါက ထို Wallet ၏ မူရင်းပိုင်ရှင် (Owner) ထံ တောင်းဆိုနိုင်ပါသည်။',
      ] : [
        'If a wallet owner has restricted your permissions on a shared wallet, lock icons (🔒) and warnings will indicate unavailable actions.',
        'Actions without permission (such as adding, editing, or deleting expenses/incomes) are safely disabled by the system.',
        'To request permission adjustments, contact the owner of the shared wallet.',
      ],
    },
    {
      categoryId: 'debts',
      title: lang === 'my' ? '၁။ ရရန်ရှိ / ပေးရန်ရှိ အကြွေးစာရင်း ရေးသွင်းပုံ' : '1. Managing Receivables & Payables',
      icon: HandCoins,
      steps: lang === 'my' ? [
        '"အကြွေးစာရင်း" Menu သို့ သွား၍ "ရရန်ရှိအကြွေး" (ငွေထုတ်ချေးထားခြင်း) သို့မဟုတ် "ပေးရန်ရှိအကြွေး" (ငွေချေးယူထားခြင်း) ထည့်သွင်းပါ။',
        'အကြွေးရှင်/အကြွေးယူသူ အမည်၊ ပမာဏ၊ တောင်းဆိုရမည့်/ဆပ်ရမည့် ရက်စွဲ (Due Date) နှင့် အတိုးနှုန်းများကို သတ်မှတ်နိုင်သည်။',
        'ရက်လွန်နေသည့် အကြွေးများကို စနစ်မှ Red Alert သတိပေးချက်များဖြင့် ပေါ်လွင်စွာ ပြသပေးပါသည်။',
      ] : [
        'Navigate to the Debts tab and add "Receivable" (money owed to you) or "Payable" (money you owe).',
        'Set debtor/creditor name, principal amount, optional interest, and target due date.',
        'Overdue debts are highlighted with clear urgency badges.',
      ],
    },
    {
      categoryId: 'debts',
      title: lang === 'my' ? '၂။ အကြွေး အပိုင်းလိုက် ဆပ်ခြင်း (Partial Repayment)' : '2. Partial & Full Debt Repayments',
      icon: CheckCircle2,
      steps: lang === 'my' ? [
        'အကြွေးကဒ်ပေါ်ရှိ "+ ပြန်ဆပ်မည်" ခလုတ်ကို နှိပ်ပါ။',
        'ပြန်ဆပ်သည့် ပမာဏနှင့် လက်ခံရရှိသည့်/ပေးချေသည့် ပိုက်ဆံအိတ် (Wallet) ကို ရွေးပါ။',
        'အကြွေးကျန် ပမာဏ အလိုအလျောက် လျော့နည်းသွားမည်ဖြစ်ပြီး ပိုက်ဆံအိတ်ထဲသို့ ငွေစာရင်း အလိုအလျောက် ဝင်/ထွက် သွားမည် ဖြစ်ပါသည်။',
      ] : [
        'Click "+ Repay" on any debt record.',
        'Enter partial or full repayment amount and select the destination wallet.',
        'Remaining balance updates automatically and generates a corresponding wallet transaction.',
      ],
    },
    {
      categoryId: 'wallets',
      title: lang === 'my' ? '၁။ KBZPay, WavePay, Cash ပိုက်ဆံအိတ်များ ခွဲခြားခြင်း' : '1. Managing Multiple Wallets & Accounts',
      icon: Wallet,
      steps: lang === 'my' ? [
        '"ပိုက်ဆံအိတ်များ" Tab တွင် KBZPay, WavePay, AYA Bank, လက်ငင်းငွေစသဖြင့် မိမိ သုံးစွဲသော Account များကို စီမံနိုင်ပါသည်။',
        'ပိုက်ဆံအိတ် အသစ်များ ထပ်တိုးခြင်း၊ စတင်လက်ကျန်ငွေ (Initial Balance) သတ်မှတ်ခြင်းများကို ပြုလုပ်နိုင်သည်။',
        'ပိုက်ဆံအိတ် တစ်ခုချင်းစီ၏ ဝင်ငွေ၊ ထွက်ငွေနှင့် စုစုပေါင်း လက်ကျန်ငွေများကို သီးသန့် စစ်ဆေးနိုင်ပါသည်။',
      ] : [
        'Organize accounts across KBZPay, WavePay, Cash, Bank Accounts, and custom mobile wallets.',
        'Add new wallets and set initial opening balances.',
        'View separate transaction histories and real-time net balances per wallet.',
      ],
    },
    {
      categoryId: 'wallets',
      title: lang === 'my' ? '၂။ ပိုက်ဆံအိတ် အချင်းချင်း ငွေလွှဲခြင်းနှင့် Balance Reconciliation' : '2. Wallet Transfers & Balance Reconcile',
      icon: RefreshCw,
      steps: lang === 'my' ? [
        'ပိုက်ဆံအိတ် အချင်းချင်း ငွေလွှဲပြောင်းပါက (ဥပမာ KBZPay မှ Cash ထုတ်ယူခြင်း) "ငွေလွှဲမည်" (Transfer) ကို သုံးပါ။',
        'အစစ်အမှန် ပိုက်ဆံအိတ်ထဲရှိ ငွေနှင့် အက်ပလီကေးရှင်း စာရင်း မကိုက်ညီပါက "Balance Reconcile" (ပြန်လည်ညှိနှိုင်းခြင်း) ကို နှိပ်၍ ငွေပမာဏ အမှန်ကို ပြန်ညှိနိုင်ပါသည်။',
      ] : [
        'Use "Transfer" between wallets (e.g. Cash withdrawal from KBZPay) without affecting overall income/expense totals.',
        'Use "Reconcile Balance" if real-world wallet funds differ from app logs to adjust balances seamlessly.',
      ],
    },
    {
      categoryId: 'wallets',
      title: lang === 'my' ? '၃။ မိသားစု/မိတ်ဆွေများနှင့် အတူသုံးရန် Shared Wallet အဖြစ် ပြောင်းလဲခြင်း' : '3. Transforming into Shared Wallets for Collaboration',
      icon: Users,
      steps: lang === 'my' ? [
        'မိမိ ပိုင်ဆိုင်သော မည်သည့် ပိုက်ဆံအိတ်မဆို ကတ်ပေါ်ရှိ "UserPlus (+လူပုံ)" ခလုတ်ကို နှိပ်၍ အခြားသူ၏ Google Gmail ထည့်သွင်းကာ မျှဝေသုံးစွဲနိုင်ပါသည်။',
        'အသေးစိတ် လုပ်ဆောင်ပုံများနှင့် အခွင့်အရေး ကန့်သတ်ပုံများကို "Shared Wallet & ခွင့်ပြုချက်များ" ကဏ္ဍတွင် အပြည့်အစုံ ကြည့်ရှုနိုင်ပါသည်။',
      ] : [
        'Click the UserPlus (+Person) icon on any wallet card to invite partners via their Google Gmail address.',
        'See the dedicated "Shared Wallets & Permissions" tab for complete access control and deletion rules.',
      ],
    },
    {
      categoryId: 'wallets',
      title: lang === 'my' ? '၄။ စုစုပေါင်းထဲ ရောပြမည် / မရောပါ (သီးသန့်) သတ်မှတ်ခြင်း' : '4. Include in Net Totals vs Separate Isolated Wallets',
      icon: Layers,
      steps: lang === 'my' ? [
        'Wallet တစ်ခုချင်းစီတွင် "စုစုပေါင်းထဲ ရောပြမည် (In Totals)" သို့မဟုတ် "စုစုပေါင်းထဲ မရောပါ (သီးသန့် - Separate)" ကို လွတ်လပ်စွာ သတ်မှတ်နိုင်ပါသည်။',
        'Wallet ကတ်ပေါ်ရှိ "📊 စုစုပေါင်းထဲ ရောမည်" သို့မဟုတ် "🚫 စုစုပေါင်းထဲ မရောပါ" Badge လေးကို တစ်ချက်နှိပ်ရုံဖြင့် အလွယ်တကူ ပြောင်းလဲနိုင်ပါသည်။',
        'သီးသန့်ခွဲထားသော Wallet များ၏ ငွေပမာဏကို ပင်မ Dashboard ရှိ စုစုပေါင်းထဲတွင် မရောနှောဘဲ သီးခြားခွဲထုတ် တွက်ချက်ပြသပေးပါသည်။',
        'Dashboard ထိပ်တွင် "📊 ရောထားသည်"၊ "🚫 သီးသန့် (မရောပါ)"၊ "🌟 အားလုံး" ခလုတ်များဖြင့် မည်သည့် အကောင့်များ၏ စာရင်းကို ကြည့်မည်ကို အချိန်မရွေး ပြောင်းလဲစစ်ဆေးနိုင်ပါသည်။',
      ] : [
        'Configure each wallet individually as "Include in Net Totals" or "Separate (Isolated from Net Balance)".',
        'Click directly on the "📊 In Totals" / "🚫 Separate" badge on any wallet card to quickly toggle its status.',
        'Balances of separate wallets are excluded from the main Dashboard Net Funds to avoid mixing private or specific budgets.',
        'Use the top scope filters on Dashboard ("[📊 In Totals] [🚫 Separate] [🌟 All]") to examine merged or isolated account figures anytime.',
      ],
    },
    {
      categoryId: 'shared_wallets',
      title: lang === 'my' ? '၁။ Shared Wallet ဖန်တီးခြင်းနှင့် အဖွဲ့ဝင်များ ဖိတ်ခေါ်ခြင်း' : '1. Creating Shared Wallets & Inviting Members',
      icon: UserPlus,
      steps: lang === 'my' ? [
        'ပိုက်ဆံအိတ်များ (Wallets) စာမျက်နှာတွင် မိမိမျှဝေလိုသော Wallet ကတ်ပေါ်ရှိ "UserPlus (+လူပုံ)" ခလုတ်ကို နှိပ်ပါ။',
        'ဖိတ်ခေါ်လိုသော မိသားစုဝင်၊ မိတ်ဆွေ သို့မဟုတ် စီးပွားရေးလုပ်ဖော်ကိုင်ဖက်၏ Google အကောင့် Gmail လိပ်စာ (ဥပမာ- partner@gmail.com) ကို ရိုက်ထည့်၍ "ဖိတ်ခေါ်မည်" ကို နှိပ်ပါ။',
        'ဖိတ်ခေါ်ခံရသူသည် ၎င်း၏ Google အကောင့်ဖြင့် အက်ပ်အတွင်း Sign-In ဝင်ထားပါက ၎င်း၏ ပိုက်ဆံအိတ်စာရင်းတွင် ထို Shared Wallet အလိုအလျောက် ပေါ်လာမည်ဖြစ်ပါသည်။',
        'စာရင်းသွင်းမှုများနှင့် လက်ကျန်ငွေများသည် Real-time Cloud Sync စနစ်ဖြင့် အချိန်နှင့်တပြေးညီ နှစ်ဦးစလုံးထံ ချက်ချင်း ရောက်ရှိပါမည်။',
      ] : [
        'On the Wallets view, click the UserPlus (+Person) icon on any wallet card you wish to share.',
        'Enter the collaborator\'s Google Gmail address (e.g. partner@gmail.com) and click "Invite".',
        'When the collaborator signs into the app with that Google email, the shared wallet automatically appears in their wallet list.',
        'All transactions and balance updates sync in real-time across both devices via Google Cloud.',
      ],
    },
    {
      categoryId: 'shared_wallets',
      title: lang === 'my' ? '၂။ အဖွဲ့ဝင်တစ်ဦးချင်းစီအလိုက် ခွင့်ပြုချက်များ သတ်မှတ်ခြင်း (Granular Permissions)' : '2. Granular Permissions per Collaborator',
      icon: KeyRound,
      steps: lang === 'my' ? [
        'Wallet ပိုင်ရှင် (Owner) သည် ဖိတ်ခေါ်ထားသော အီးမေးလ်တစ်ခုချင်းစီအတွက် လုပ်ပိုင်ခွင့် (၆) မျိုးကို စိတ်ကြိုက် On/Off သတ်မှတ်နိုင်ပါသည်:',
        '• ဝင်ငွေ (Income) ဆိုင်ရာ: အသစ်ထည့်ခွင့် (Add) ၊ ပြင်ဆင်ခွင့် (Edit) ၊ ဖျက်ခွင့် (Delete)',
        '• ထွက်ငွေ (Expense) ဆိုင်ရာ: အသစ်ထည့်ခွင့် (Add) ၊ ပြင်ဆင်ခွင့် (Edit) ၊ ဖျက်ခွင့် (Delete)',
        'လျင်မြန်စွာ ရွေးချယ်နိုင်ရန် "အပြည့်အစုံ (Full Access)", "အသစ်သာ ထည့်ခွင့် (Add Only)", "ကြည့်ရှုခွင့်သာ (Read Only)" အသင့်သုံးခလုတ်များကိုလည်း အသုံးပြုနိုင်ပါသည်။',
        'ပိုင်ရှင်မှ ပိတ်ထားသော အခွင့်အရေးများအတွက် အဖွဲ့ဝင်၏ မျက်နှာပြင်တွင် သော့ခတ် (Lock 🔒) ပြထားပြီး ခွင့်ပြုချက်မရှိဘဲ စာရင်းသွင်းခြင်း/ပြင်ခြင်း/ဖျက်ခြင်းများကို စနစ်မှ တားမြစ်ထားပါသည်။',
      ] : [
        'The Wallet Owner can customize 6 distinct permissions independently for each collaborator:',
        '• Income permissions: Add, Edit, and Delete',
        '• Expense permissions: Add, Edit, and Delete',
        'Quick preset buttons are available: "Full Access", "Add Only", and "Read Only".',
        'Restricted actions display lock indicators (🔒) for collaborators, preventing unauthorized modifications.',
      ],
    },
    {
      categoryId: 'shared_wallets',
      title: lang === 'my' ? '၃။ Shared Wallet ဖျက်ပိုင်ခွင့်နှင့် ထွက်ခွာခြင်း စည်းမျဉ်းများ (Deletion & Leaving Rules)' : '3. Owner Deletion & Collaborator Leaving Rules',
      icon: LogOut,
      steps: lang === 'my' ? [
        'မူရင်းပိုင်ရှင် (Owner) သာ ဖျက်ပိုင်ခွင့်ရှိခြင်း: ပိုင်ရှင်သာလျှင် မိမိ၏ Wallet ကတ်ပေါ်ရှိ အမှိုက်ပုံးပုံ (Delete Wallet) ခလုတ်ဖြင့် ထို Wallet အား အပြီးတိုင် ဖျက်ပိုင်ခွင့် ရှိပါသည်။',
        'ပိုင်ရှင်မှ ဖျက်လိုက်ပါက မျှဝေထားသော အဖွဲ့ဝင်အားလုံးထံမှလည်း ထို Wallet အလိုအလျောက် ပျက်သွားမည်ဖြစ်ပြီး၊ ထို Wallet တွင် ရှိခဲ့သော မှတ်တမ်းများကို ပိုင်ရှင်၏ အခြား Wallet သို့ လုံခြုံစွာ အလိုအလျောက် ပြောင်းရွှေ့ပေးပါသည်။',
        'ဖိတ်ခေါ်ခံရသူ (Collaborator) သည် Wallet ကို ဖျက်ခွင့်မရှိပါ: Share ခံထားရသူများအတွက် Wallet ဖျက်ခွင့် လုံးဝ မရှိစေရန် ပိတ်ပင်ထားပါသည်။',
        'Shared Wallet မှ ထွက်ခွာခြင်း (Leave Shared Wallet): ဖိတ်ခေါ်ခံရသူသည် ထို Wallet ကို မသုံးလိုတော့ပါက Wallet ကတ်ပေါ်ရှိ "Shared Wallet မှ ထွက်ခွာမည်" (အဝါရောင် LogOut သင်္ကေတ) ကို နှိပ်၍ မိမိအကောင့်ကို အဖွဲ့ဝင်စာရင်းမှ အလွယ်တကူ ဖယ်ရှားထွက်ခွာနိုင်ပါသည်။ ပိုင်ရှင်၏ မူရင်း Wallet မှာ မပျက်စီးဘဲ ဆက်လက်တည်ရှိနေမည်ဖြစ်ပါသည်။',
      ] : [
        'Only the Owner can delete the wallet: The owner has exclusive rights to delete the wallet via the Trash icon.',
        'When deleted by the owner, it is permanently removed for all collaborators as well, and remaining transactions are safely reassigned to the owner\'s other wallet.',
        'Collaborators CANNOT delete the wallet: Delete buttons are disabled and hidden for collaborators.',
        'Collaborators can Leave: Collaborators can click the amber "Leave Shared Wallet" (LogOut) icon to remove the wallet from their account only. The owner\'s original wallet remains intact.',
      ],
    },
    {
      categoryId: 'budgets',
      title: lang === 'my' ? '၁။ လစဉ် ဘတ်ဂျက် ကန့်သတ်ချက်များ သတ်မှတ်ခြင်း' : '1. Setting Monthly Category Budgets',
      icon: PieChart,
      steps: lang === 'my' ? [
        '"ဘတ်ဂျက်နှင့် စာရင်းဇယား" Menu တွင် ကဏ္ဍတစ်ခုချင်းစီအတွက် လစဉ် သုံးစွဲနိုင်သော ဘတ်ဂျက်ပမာဏ သတ်မှတ်နိုင်သည်။',
        'သုံးစွဲမှု ၇၅% သို့မဟုတ် ၁၀၀% ကျော်လွန်ပါက သတိပေးချက်များ (Warning & Overbudget) အလိုအလျောက် ပြသပေးပါသည်။',
      ] : [
        'Set monthly spending budgets for individual categories (e.g., Food, Transportation, Shopping).',
        'Receive automated visual warnings when approaching or exceeding category budget limits.',
      ],
    },
    {
      categoryId: 'budgets',
      title: lang === 'my' ? '၂။ စုဆောင်းငွေ ပန်းတိုင်နှင့် စာရင်းဇယား သုံးသပ်ချက်များ' : '2. Monthly Charts & Savings Target',
      icon: TrendingUp,
      steps: lang === 'my' ? [
        'လစဉ် စုဆောင်းလိုသော ငွေပမာဏ (Monthly Savings Target) ကို သတ်မှတ်၍ ပြည့်မီမှု ရာခိုင်နှုန်းကို စောင့်ကြည့်နိုင်ပါသည်။',
        'လအလိုက် သုံးစွဲမှု နှိုင်းယှဉ်ချက် Bar Charts များနှင့် ကဏ္ဍအလိုက် ရာခိုင်နှုန်းခွဲခြားချက် ရောင်စုံ Pie Charts များကို ကြည့်ရှုနိုင်ပါသည်။',
      ] : [
        'Configure a monthly savings target amount and track progress percentages live on Dashboard.',
        'Explore monthly comparison charts and visual category breakdown pie charts.',
      ],
    },
    {
      categoryId: 'budgets',
      title: lang === 'my' ? '၃။ ငွေကြေးကျန်းမာမှု အဆင့် ၇ ဆင့် အရောင်စနစ် (Financial Health Index)' : '3. 7-Tier Financial Health Score & Color Indicators',
      icon: Activity,
      steps: lang === 'my' ? [
        'လစဉ် ဘတ်ဂျက် စာမျက်နှာတွင် မိမိ၏ ဝင်ငွေ၊ ထွက်ငွေနှင့် စုဆောင်းငွေ အချိုးအစားအပေါ် အခြေခံ၍ ငွေကြေးကျန်းမာမှု ရမှတ် (Score) ကို အဆင့် ၇ ဆင့်ဖြင့် အလိုအလျောက် သုံးသပ်ပြသပေးပါသည်။',
        '🌟 ခရမ်းရောင် (Purple Glow): စုဆောင်းငွေ ပန်းတိုင်ထက် အဆမတန် ကျော်လွန်အောင်မြင်နေချိန် (Super Surplus)',
        '🟢 အစိမ်းရောင် (Emerald): ၁၀၀% ပန်းတိုင်ပြည့်မီပြီး အလွန်ကောင်းမွန်သော အခြေအနေ (Optimal Health)',
        '🌿 စိမ်းဖျော့ရောင် (Light Green): ၈၀% – ၉၉% အခြေအနေတည်ငြိမ်ကောင်းမွန်ချိန် (Stable Health)',
        '🟡 အဝါရောင် (Amber/Yellow): ၆၀% – ၇၉% အသုံးစရိတ် သတိထားသင့်သော အခြေအနေ (Moderate)',
        '🟠 လိမ္မော်ရောင် (Orange): ၄၀% – ၅၉% သုံးစွဲမှု များပြားနေ၍ ချွေတာရန် လိုအပ်ချိန် (Warning Alert)',
        '🔴 အနီရောင် (Red): ၄၀% အောက် အသုံးစရိတ် အန္တရာယ်ရှိနေချိန် (Critical Alert)',
        '⬛🔴 အနက်နှင့် အနီရောင် (Dark Crimson/Black): အသုံးစရိတ်က ဝင်ငွေထက် ကျော်လွန်၍ အနှုတ်ပြနေချိန် (Severe Deficit Alert)',
        '"အသေးစိတ် သုံးသပ်ချက်" ခလုတ်ကို နှိပ်၍ အဆင့် ၇ ဆင့် ဇယားနှင့် ကျန်းမာရေးမြှင့်တင်ရန် အကြံပြုချက်များကို အပြည့်အစုံ ကြည့်ရှုနိုင်ပါသည်။',
      ] : [
        'Budget & Analytics features an automated 7-tier financial health scoring algorithm based on your income, expense, and savings ratios.',
        '🌟 Purple Glow: Exceptional performance well beyond monthly savings target (Super Surplus).',
        '🟢 Emerald Green: 100% savings target achieved with prime health (Optimal Health).',
        '🌿 Light Green: 80% – 99% progress with resilient financial stability (Stable Health).',
        '🟡 Amber / Yellow: 60% – 79% performance, advisory check recommended (Moderate).',
        '🟠 Orange: 40% – 59% warning zone indicating elevated discretionary spending (Warning Alert).',
        '🔴 Red: Below 40% critical threshold requiring immediate budget cutbacks (Critical Alert).',
        '⬛🔴 Dark Crimson / Black: Spending exceeds income resulting in a cash deficit (Severe Deficit Alert).',
        'Click "Detailed Health Breakdown" to view the interactive tier comparison chart and personalized financial tips.',
      ],
    },
    {
      categoryId: 'cloud_security',
      title: lang === 'my' ? '၁။ Google Cloud Auto Sync & Excel Export' : '1. Cloud Sync & Excel Data Export',
      icon: FileSpreadsheet,
      steps: lang === 'my' ? [
        'Google Sign-In ဝင်ထားသူများ၏ စာရင်းများအားလုံးသည် Cloud မမ်မိုရီ ပေါ်သို့ အလိုအလျောက် အမြဲ သိမ်းဆည်းပေးပါသည်။',
        '"ဒေတာ စီမံခန့်ခွဲမှု" Menu တွင် မိမိ၏ စာရင်းများအားလုံးကို Excel (.xlsx) သို့မဟုတ် JSON ဖိုင်အဖြစ် ဖုန်းထဲသို့ ထုတ်ယူနိုင်ပါသည်။',
      ] : [
        'Data auto-syncs securely in background for Google signed-in users.',
        'Export full financial histories to Excel (.xlsx) or JSON files anytime in Data Management.',
      ],
    },
    {
      categoryId: 'cloud_security',
      title: lang === 'my' ? '၂။ PIN Lock ခေတ်မီ ဂဏန်း ၄ လုံး လုံခြုံရေး သော့' : '2. App Launch 4-Digit PIN Lock',
      icon: Lock,
      steps: lang === 'my' ? [
        'အက်ပလီကေးရှင်း ဖွင့်ချိန်တိုင်း သူတစ်ပါး မမြင်ရစေရန် ၄-လုံးပါ PIN Code သော့ ခတ်ထားနိုင်ပါသည်။',
        'Sidebar ရှိ "PIN သော့" Menu သို့မဟုတ် Account Settings တွင် အချိန်မရွေး ဖွင့်/ပိတ်/ပြောင်းလဲနိုင်ပါသည်။',
      ] : [
        'Protect app privacy with a custom 4-digit PIN lock screen on app startup.',
        'Enable, update, or disable PIN lock via Sidebar or Account Modal.',
      ],
    },
    {
      categoryId: 'cloud_security',
      title: lang === 'my' ? '၃။ VPN ဖွင့်ထားချိန် လိုင်းမငြိမ်ပါက အဆင်ပြေစွာ သုံးစွဲနည်း' : '3. Using App Smoothly with VPN Active',
      icon: ShieldCheck,
      steps: lang === 'my' ? [
        'ငွေစာရင်း အက်ပ်သည် Local-First Offline-First စနစ်ဖြင့် တည်ဆောက်ထားသဖြင့် VPN ဖွင့်ထားချိန် သို့မဟုတ် အင်တာနက် လိုင်းကျနေချိန်တွင်လည်း ဒေတာများ လုံးဝ မပျောက်ပျက်ပါ။',
        'VPN လိုင်းမငြိမ်ပါက စက်ထဲ၌ Instant Auto-Save စနစ်ဖြင့် ချက်ချင်း သိမ်းထားမည်ဖြစ်ပြီး VPN လိုင်းပြန်ကောင်းချိန်မှ Cloud သို့ နောက်ကွယ်မှ အလိုအလျောက် Sync ပြုလုပ်ပေးပါသည်။',
        'VPN ပိတ်/ဖွင့် ပြုလုပ်ပါက သို့မဟုတ် လိုင်းမငြိမ်ပါက Account Menu မှ "ခလုတ်တစ်ချက်ဖြင့် Cloud Sync ပြုလုပ်မည်" ကို နှိပ်၍ အချိန်မရွေး ပြန်လည် ချိတ်ဆက်နိုင်ပါသည်။',
      ] : [
        'NgweSarYin uses Local-First Offline architecture, ensuring zero data loss even if your VPN drops or fluctuates.',
        'When your VPN is slow, entries save instantly to local storage first, then sync to Cloud automatically when connected.',
        'If switching VPN servers, click "1-Click Cloud Sync" in Account Modal anytime to refresh sync status.',
      ],
    },
    {
      categoryId: 'data_management',
      title: lang === 'my' ? '၁။ Cloud Reconciliation စနစ် (ဖျက်ထားသော စာရင်းများ ပြန်မပေါ်လာစေခြင်း)' : '1. Cloud Reconciliation & Permanent Deletion',
      icon: RefreshCw,
      steps: lang === 'my' ? [
        'NgweSarYin ၏ Cloud Sync စနစ်သည် "Reconcile-and-Purge" နည်းပညာကို အသုံးပြုထားသဖြင့် ဖျက်ပစ်လိုက်သော စာရင်းများ၊ အကြွေးမှတ်တမ်းများနှင့် Wallet အဟောင်းများ Cloud မှ ပြန်လည် ပေါ်လာခြင်း မရှိစေရန် အလိုအလျောက် သန့်စင်ပေးပါသည်။',
        'ငွေစာရင်း သို့မဟုတ် အကြွေးစာရင်းတစ်ခုခုကို ဖျက်လိုက်သည့်အခါ သင့်ဖုန်း/စက်တွင်းမှသာမက Google Firestore Cloud မှပါ ချက်ချင်း တစ်ပြိုင်နက် ဖျက်သိမ်းပေးပါသည်။',
        'အခြား စက် သို့မဟုတ် Browser တစ်ခုခုမှ အကောင့်ပြန်ဖွင့်ချိန်တွင်လည်း ဖျက်ပြီးသား အချက်အလက်များ လုံးဝ ပြန်လည် ရောနှော ပေါ်ပေါက်လာတော့မည် မဟုတ်ပါ။',
      ] : [
        'NgweSarYin incorporates a robust "Reconcile-and-Purge" synchronization engine ensuring deleted entries or old wallets never resurrect from cloud storage.',
        'Whenever a transaction, debt, or wallet is deleted, the app instantly purges the corresponding Firestore document in real time.',
        'Signing in across multiple devices guarantees a clean, reconciled state without ghost records reappearing.',
      ],
    },
    {
      categoryId: 'data_management',
      title: lang === 'my' ? '၂။ ဒေတာအားလုံး ရှင်းလင်းဖျက်သိမ်းခြင်း (Danger Zone Reset)' : '2. Complete Data Reset (Danger Zone)',
      icon: Database,
      steps: lang === 'my' ? [
        'စမ်းသပ်ထားသော စာရင်းမှတ်တမ်းအားလုံးကို ရှင်းလင်းပြီး စာရင်းအသစ် စတင်လိုပါက Sidebar ရှိ "ဒေတာ စီမံခန့်ခွဲမှု" (Data Management) သို့ သွားပါ။',
        '"ဒေတာအားလုံး ဖျက်မည် (Clear All Data)" ခလုတ်ကို နှိပ်ပါက စက်တွင်းရှိ စာရင်းများအပြင် Google Cloud ပေါ်ရှိ Transactions, Debts, Custom Wallets, Budgets စာရင်းများကိုပါ အပြီးတိုင် သန့်ရှင်းပေးပါမည်။',
        'သန့်ရှင်းရေး ပြီးဆုံးပါက မူလ အခြေခံ "ငွေသား (Cash)" ပိုက်ဆံအိတ်တစ်ခုသာ ကျန်ရှိစေမည်ဖြစ်ပြီး လက်ကျန်ငွေ 0 ဖြင့် စိတ်သန့်သန့် အသစ်ပြန်လည် စတင်နိုင်ပါသည်။',
      ] : [
        'To reset your entire dataset and begin anew, navigate to "Data Management" in the sidebar.',
        'Clicking "Clear All Data" completely cleans both local device memory and remote Firestore cloud collections (transactions, debts, custom wallets, budgets).',
        'Leaves only a clean default "Cash" wallet with 0 balance for a pristine fresh start.',
      ],
    },
    {
      categoryId: 'data_management',
      title: lang === 'my' ? '၃။ JSON Backup ဖိုင် ထုတ်ယူခြင်းနှင့် ပြန်လည်သွင်းခြင်း' : '3. JSON Backup Export & Restore',
      icon: FileSpreadsheet,
      steps: lang === 'my' ? [
        '"ဒေတာ စီမံခန့်ခွဲမှု" ကဏ္ဍတွင် "JSON Backup သိမ်းမည်" (Export Backup) ကို နှိပ်၍ မိမိ၏ စာရင်းဒေတာအားလုံးကို ဖိုင်အဖြစ် ကွန်ပျူတာ သို့မဟုတ် ဖုန်းထဲသို့ ဒေါင်းလုဒ်ဆွဲထားနိုင်ပါသည်။',
        'နောင်တစ်ချိန်တွင် ထိုဒေတာများကို ပြန်လည်အသုံးပြုလိုပါက "JSON Backup ထည့်မည်" (Import Backup) ကို နှိပ်ပြီး ယခင်သိမ်းထားသော .json ဖိုင်ကို ရွေးချယ်ပေးရုံဖြင့် စာရင်းအားလုံး ချက်ချင်း ပြန်လည်ရောက်ရှိလာမည် ဖြစ်ပါသည်။',
      ] : [
        'Click "Export Backup" in Data Management to download your complete financial records into a local JSON file.',
        'To restore on any device, click "Import Backup" and select your previously saved .json file to recover all records seamlessly.',
      ],
    },
    {
      categoryId: 'troubleshooting',
      title: lang === 'my' ? '၁။ "ngwesaryin.ai.studio" DNS / Hostname Error ဖြစ်နေပါက' : '1. "ngwesaryin.ai.studio" DNS / Hostname Error',
      icon: ShieldAlert,
      steps: lang === 'my' ? [
        'ngwesaryin.ai.studio ဟူသော Domain မှာ အမှန်တကယ် မရှိသော အမည်ဖြစ်သဖြင့် Browser တွင် ရိုက်ထည့်ပါက DNS_PROBE_FINISHED_NXDOMAIN ဟု ပြသပါမည်။',
        'မှန်ကန်သော အက်ပ်လင့်ခ် URL အပြည့်အစုံကိုသာ အသုံးပြုရပါမည် (Google Cloud Run သို့မဟုတ် ai.studio Web App URL)။',
        'အက်ပ်ကို သူငယ်ချင်း၊ မိသားစုထံ မျှဝေလိုပါက အပေါ်ရှိ "မျှဝေရန် (Share)" ခလုတ် သို့မဟုတ် Sidebar ရှိ "အက်ပ်လင့်ခ်နှင့် မျှဝေရန် လမ်းညွှန်" မှတစ်ဆင့် တိုက်ရိုက် Copy ကူး၍ ပေးပို့နိုင်ပါသည်။',
      ] : [
        '"ngwesaryin.ai.studio" is an invalid domain and will return DNS NXDOMAIN error.',
        'Always use the official Cloud Run URL or AI Studio app preview link.',
        'Use the "Share App" button in the Navbar or Sidebar to copy the genuine web link directly.',
      ],
    },
    {
      categoryId: 'troubleshooting',
      title: lang === 'my' ? '၂။ Google Sign-in Pop-up တွင် "Connection Refused" ဖြစ်နေပါက' : '2. Google Sign-in "Connection Refused" Error',
      icon: RefreshCw,
      steps: lang === 'my' ? [
        'မြန်မာနိုင်ငံရှိ အင်တာနက် အော်ပရေတာတချို့ (MPT, Atom, Ooredoo, Wi-Fi) သည် Google Firebase Auth Domain (firebaseapp.com) အား ချိတ်ဆက်ခွင့် ပိတ်ပင်ထားတတ်ပါသည်။',
        'ဖြေရှင်းနည်း ၁: Now VPN (သို့မဟုတ်) အဆင်ပြေရာ VPN တစ်ခုခုကို ဖွင့်ပြီးမှ "Google အကောင့်ဖြင့် ဝင်မည်" ကို ပြန်နှိပ်ပါ။',
        'ဖြေရှင်းနည်း ၂ (VPN မလိုသောနည်း): Login မျက်နှာပြင်တွင် "Email & Password" ကို ရွေးချယ်ပြီး မိမိ၏ Email ဖြင့် အကောင့်သစ်ဖွင့်ကာ ချက်ချင်း ဝင်ရောက် အသုံးပြုနိုင်ပါသည်။',
        'ဖြေရှင်းနည်း ၃: AI Studio Preview iFrame အတွင်း ဖွင့်ထားပါက "Tab အသစ်တွင် သီးသန့်ဖွင့်၍ ဝင်ရောက်မည်" (Open in New Tab) ကို နှိပ်ပြီး ဝင်ရောက်ပါ။',
      ] : [
        'Myanmar telecom networks frequently block Google Firebase authentication servers, resulting in ERR_CONNECTION_REFUSED.',
        'Solution 1: Turn on Now VPN or your preferred VPN before clicking Google Sign-In.',
        'Solution 2 (No VPN needed): Switch to "Email & Password" on the login screen to register or log in without VPN.',
        'Solution 3: If running inside AI Studio preview iframe, click "Open in New Tab" to authorize safely.',
      ],
    },
  ];

  const filteredTopics = guideTopics.filter((topic) => {
    const isCategoryMatch = topic.categoryId === activeTab;
    if (!searchQuery.trim()) return isCategoryMatch;

    const q = searchQuery.toLowerCase();
    const titleMatch = topic.title.toLowerCase().includes(q);
    const stepsMatch = topic.steps.some((s) => s.toLowerCase().includes(q));
    return titleMatch || stepsMatch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Modal Top Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shrink-0">
              <FortuneLogo size="sm" style={logoStyle} />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-extrabold flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-400" />
                <span>
                  {lang === 'my'
                    ? 'ငွေစာရင်း အသုံးပြုပုံ လမ်းညွှန်နှင့် Features များ'
                    : 'User Guide & App Features Walkthrough'}
                </span>
              </h2>
              <p className="text-xs text-slate-300 font-normal mt-0.5">
                {lang === 'my'
                  ? 'အက်ပလီကေးရှင်း၏ လုပ်ဆောင်ချက်များအား အပြည့်အဝ ထိရောက်စွာ အသုံးပြုနည်း'
                  : 'Learn how to manage your finances effectively with NgweSarYin'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Quick Search Input inside Header */}
            <div className="relative w-48 sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === 'my' ? 'လမ်းညွှန် ရှာရန်...' : 'Search guide...'}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white/10 text-white placeholder-slate-400 text-xs border border-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Categories Bar - Responsive Grid (All categories visible without horizontal scroll) */}
        {!searchQuery && (
          <div className="p-3 sm:px-5 sm:py-3 bg-slate-50 border-b border-slate-200/80 shrink-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 sm:gap-2">
              {categories.map((cat) => {
                const IconComp = cat.icon;
                const isActive = activeTab === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveTab(cat.id)}
                    className={`px-2.5 sm:px-3 py-2 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-bold flex items-center justify-start gap-1.5 sm:gap-2 transition-all cursor-pointer active:scale-95 text-left ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80'
                    }`}
                  >
                    <IconComp className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-emerald-600'}`} />
                    <span className="truncate">{cat.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-700">
          {searchQuery && (
            <div className="text-xs text-slate-500 font-semibold mb-2 flex items-center justify-between">
              <span>
                {lang === 'my'
                  ? `"${searchQuery}" အတွက် ရှာဖွေတွေ့ရှိချက်များ (${filteredTopics.length})`
                  : `Search results for "${searchQuery}" (${filteredTopics.length})`}
              </span>
              <button
                onClick={() => setSearchQuery('')}
                className="text-emerald-700 hover:underline cursor-pointer"
              >
                {lang === 'my' ? 'အားလုံး ပြန်ပြပါ' : 'Clear search'}
              </button>
            </div>
          )}

          {filteredTopics.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <HelpCircle className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-600">
                {lang === 'my'
                  ? 'ရှာဖွေမှုနှင့် ကိုက်ညီသော လမ်းညွှန် မတွေ့ရှိပါ။'
                  : 'No matching user guide topics found.'}
              </p>
            </div>
          ) : (
            filteredTopics.map((topic, idx) => {
              const IconComp = topic.icon || HelpCircle;
              return (
                <div
                  key={idx}
                  className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200/80 hover:border-emerald-200 transition-colors space-y-3"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-100/80 text-emerald-800 shrink-0">
                      <IconComp className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                      {topic.title}
                    </h3>
                  </div>

                  <ul className="space-y-2 pl-2 sm:pl-3">
                    {topic.steps.map((step, stepIdx) => (
                      <li key={stepIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })
          )}

          {/* Bottom Pro Tip Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 flex items-start gap-3">
            <Zap className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-emerald-950 text-xs sm:text-sm">
                {lang === 'my' ? '💡 အကြံပြုချက် (Pro Tip)' : '💡 Pro Tip'}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {lang === 'my'
                  ? 'အက်ပလီကေးရှင်းအတွင်း မည်သည့် နေရာတွင်မဆို ⌘K (သို့မဟုတ် Search ခလုတ်) ကို နှိပ်၍ စာရင်းများအား စက္ကန့်ပိုင်းအတွင်း တိုက်ရိုက် ရှာဖွေနိုင်ပါသည်။ ဒေတာများ မပျောက်ပျက်စေရန် Google Account ဖြင့် Sign-In ဝင်ထားရန် အကြံပြုပါသည်!'
                  : 'Use ⌘K or top search button anywhere to query records instantly. Sign in with Google to ensure automatic cloud backups!'}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 font-medium hidden sm:block">
            {lang === 'my'
              ? 'ငွေစာရင်း - သင့်လက်ထဲမှ စိတ်ချရသော ဘဏ္ဍာရေး မန်နေဂျာ'
              : 'NgweSarYin - Your Secure Personal Financial Manager'}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-xs text-center"
          >
            {lang === 'my' ? 'နားလည်ပါပြီ' : 'Got It'}
          </button>
        </div>
      </div>
    </div>
  );
};
