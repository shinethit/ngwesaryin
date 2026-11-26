import { BudgetConfig, Category, Debt, PlanLimits, PlanType, Transaction, UNBUDGETED_CATEGORY_ID, Wallet } from '../types';

export const DEFAULT_PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  // [v7.5.55] SINGLE SOURCE OF TRUTH for plan limits. Every handler/modal
  // must read the CURRENT plan's row — Guest and Free each enforce their OWN
  // numbers, never shared, never falling back to another plan's row.
  // maxTransactions window: per CALENDAR MONTH for both Guest and Free
  // (count transactions dated on/after the 1st of the current month;
  // resets to 0 on the 1st of next month). Block the moment the count
  // reaches the limit. Guest = 15, Free = 150 (user decision 2026-11-06).
  guest: {
    maxTransactions: 15,
    maxDebts: 0,
    maxWallets: 1,
    maxBudgetCategories: 0,
    maxRecurringTransactions: 5,
    maxCollaborators: 2,
    maxVehicles: 1,
    hasBudgets: false,
    hasDebts: false,
    hasSavings: false,
    hasWalletSharing: false,
    hasExport: false,
    hasReceipts: false,
    hasCustomCategories: false,
    hasAdvancedCharts: false,
  },
  free: {
    maxTransactions: 150,
    maxDebts: 5,
    maxWallets: 2,
    maxBudgetCategories: 5,
    maxRecurringTransactions: 20,
    maxCollaborators: 10,
    maxVehicles: 1,
    hasBudgets: true,
    hasDebts: true,
    hasSavings: true,
    hasWalletSharing: true,
    hasExport: false,
    hasReceipts: true,
    hasCustomCategories: false,
    hasAdvancedCharts: true,
  },
  premium: {
    maxTransactions: 999999,
    maxDebts: 999999,
    maxWallets: 999,
    maxBudgetCategories: 999999,
    maxRecurringTransactions: 999999,
    maxCollaborators: 999999,
    maxVehicles: 999999,
    hasBudgets: true,
    hasDebts: true,
    hasSavings: true,
    hasWalletSharing: true,
    hasExport: true,
    hasReceipts: true,
    hasCustomCategories: true,
    hasAdvancedCharts: true,
  },
};

export const INITIAL_WALLETS: Wallet[] = [
  {
    id: 'cash',
    name: 'ငွေသား (လက်ဝယ်)',
    nameEn: 'Cash',
    balance: 0,
    initialBalance: 0,
    color: '#10B981', // emerald
    icon: 'Banknote',
    isDefault: true,
  },
];

export const INITIAL_CATEGORIES: Category[] = [
  // Income categories
  {
    id: 'cat_salary',
    name: 'လစာ / လစဉ်ကြေး',
    nameEn: 'Salary',
    type: 'income',
    icon: 'Briefcase',
    color: '#10B981',
    subCategories: [
      { id: 'sub_sal_base', name: 'အခြေခံလစာ', nameEn: 'Base Salary', icon: 'pic:dollar-bills' },
      { id: 'sub_sal_ot', name: 'အချိန်ပိုကြေး (OT)', nameEn: 'Overtime Pay', icon: 'pic:alarm-clock' },
      { id: 'sub_sal_allowance', name: 'စရိတ်ထောက်ပံ့ကြေး', nameEn: 'Allowances', icon: 'pic:red-envelope' },
    ],
  },
  {
    id: 'cat_business',
    name: 'ဆိုင်ရောင်းရငွေ',
    nameEn: 'Business Sales',
    type: 'income',
    icon: 'Store',
    color: '#059669',
    subCategories: [
      { id: 'sub_biz_retail', name: 'လက်လီရောင်းရငွေ', nameEn: 'Retail Sales', icon: 'pic:cash-register' },
      { id: 'sub_biz_wholesale', name: 'လက်ကားရောင်းရငွေ', nameEn: 'Wholesale Sales', icon: 'pic:delivery-truck' },
      { id: 'sub_biz_online', name: 'Online Shop ရောင်းရငွေ', nameEn: 'Online Orders', icon: 'pic:browser-window' },
    ],
  },
  {
    id: 'cat_freelance',
    name: 'အလွတ်တန်းလုပ်ငန်း',
    nameEn: 'Freelance',
    type: 'income',
    icon: 'Laptop',
    color: '#0D9488',
    subCategories: [
      { id: 'sub_free_project', name: 'ပရောဂျက်လုပ်ခ', nameEn: 'Project Work', icon: 'pic:presentation-board' },
      { id: 'sub_free_consult', name: 'အကြံပေးခ / သင်တန်းကြေး', nameEn: 'Consulting & Teaching', icon: 'pic:graduation-cap' },
    ],
  },
  {
    id: 'cat_bonus',
    name: 'ဆုကြေး / လက်ဆောင်',
    nameEn: 'Bonus & Gift',
    type: 'income',
    icon: 'Gift',
    color: '#14B8A6',
    subCategories: [
      { id: 'sub_bon_perf', name: 'နှစ်ကုန်ဆုကြေး / Performance', nameEn: 'Bonus', icon: 'pic:trophy' },
      { id: 'sub_bon_gift', name: 'မုန့်ဖိုး / လက်ဆောင်ငွေ', nameEn: 'Gift Money', icon: 'pic:gift-boxes' },
    ],
  },
  {
    id: 'cat_investment',
    name: 'အမြတ်ငွေ / အတိုး',
    nameEn: 'Investments',
    type: 'income',
    icon: 'TrendingUp',
    color: '#047857',
    subCategories: [
      { id: 'sub_inv_interest', name: 'ဘဏ်အပ်ငွေအတိုး', nameEn: 'Bank Interest', icon: 'pic:piggy-bank' },
      { id: 'sub_inv_dividend', name: 'အစုရှယ်ယာအမြတ်', nameEn: 'Dividends & Profit Share', icon: 'pic:line-chart' },
    ],
  },
  {
    id: 'cat_income_other',
    name: 'အခြားဝင်ငွေ',
    nameEn: 'Other Income',
    type: 'income',
    icon: 'PlusCircle',
    color: '#15803D',
    subCategories: [
      { id: 'sub_inc_misc', name: 'အထွေထွေဝင်ငွေ', nameEn: 'Miscellaneous', icon: 'pic:coins' },
    ],
  },
  {
    id: 'cat_transfer',
    name: 'ငွေလွှဲပြောင်းခြင်း',
    nameEn: 'Transfer',
    type: 'expense',
    icon: 'ArrowLeftRight',
    color: '#6366F1',
    subCategories: [
      { id: 'sub_tf_out', name: 'ငွေလွှဲထွက်', nameEn: 'Transfer Out' },
      { id: 'sub_tf_in', name: 'ငွေလွှဲဝင်', nameEn: 'Transfer In' },
    ],
  },
  {
    // [v7.5.60 M-09] Dedicated category for reconcile adjustments —
    // NEVER salary/food. Used for BOTH directions (surplus = income tx,
    // deficit = expense tx); the tx's own `type` drives the totals, this
    // `type` only places the category in the expense picker/list.
    // Seeded here so the cloud sync merge (useSyncOperations) adds it to
    // existing users' category lists too.
    id: 'cat_reconcile',
    name: 'စာရင်းညှိချက်',
    nameEn: 'Balance Adjustment',
    type: 'expense',
    icon: 'Scale',
    color: '#64748B',
    subCategories: [
      { id: 'sub_rec_surplus', name: 'ပိုငွေညှိချက်', nameEn: 'Surplus Adjustment', icon: 'pic:calculator' },
      { id: 'sub_rec_deficit', name: 'လိုငွေညှိချက်', nameEn: 'Deficit Adjustment', icon: 'pic:receipt' },
    ],
  },

  // Expense categories
  {
    id: 'cat_food',
    name: 'အစားအသောက်နှင့် ကုန်စုံ',
    nameEn: 'Food & Groceries',
    type: 'expense',
    icon: 'Utensils',
    color: '#EF4444',
    subCategories: [
      { id: 'sub_food_breakfast', name: 'မနက်စာ', nameEn: 'Breakfast', icon: 'pic:fried-egg' },
      { id: 'sub_food_lunch', name: 'နေ့လယ်စာ', nameEn: 'Lunch', icon: 'pic:rice-bowl' },
      { id: 'sub_food_dinner', name: 'ညနေစာ', nameEn: 'Dinner', icon: 'pic:soup-bowl' },
      { id: 'sub_groc_market', name: 'စည်ပင်ဈေးဝယ် / ကုန်စုံ', nameEn: 'Fresh Market & Groceries', icon: 'pic:fish' },
      { id: 'sub_groc_super', name: 'စူပါမားကတ်', nameEn: 'Supermarket', icon: 'pic:tin-can' },
      { id: 'sub_groc_kitchen', name: 'မီးဖိုချောင်သုံးကုန်', nameEn: 'Kitchen Supplies', icon: 'pic:oil-vinegar' },
      { id: 'sub_food_coffee', name: 'ကော်ဖီနှင့် မုန့်ဖိုး', nameEn: 'Coffee & Snacks', icon: 'pic:coffee-cup' },
      { id: 'sub_food_delivery', name: 'Food Delivery အရောက်ပို့', nameEn: 'Food Delivery', icon: 'pic:pizza' },
    ],
  },
  {
    id: 'cat_transport',
    name: 'ခရီးစရိတ်နှင့် လမ်းစရိတ်',
    nameEn: 'Transportation & Travel',
    type: 'expense',
    icon: 'Bus',
    color: '#EAB308',
    subCategories: [
      { id: 'sub_trans_taxi', name: 'တက္ကစီ / Grab', nameEn: 'Taxi / Rideshare', icon: 'pic:taxi' },
      { id: 'sub_trans_bus', name: 'ဘတ်စကား / ရထား', nameEn: 'Bus & Public Transit', icon: 'pic:tram' },
      { id: 'sub_trans_flight', name: 'လေယာဉ် / အဝေးပြေးကား', nameEn: 'Flight & Long-distance Coach', icon: 'pic:airplane' },
      { id: 'sub_trans_ferry', name: 'ဖယ်ရီ / သင်္ဘော', nameEn: 'Ferry & Water Transit', icon: 'pic:sailboat' },
      { id: 'sub_trans_toll', name: 'တံတားကြေး / လမ်းကြေး / Gate ကြေး', nameEn: 'Toll & Gate Fees', icon: 'pic:ticket' },
    ],
  },
  {
    id: 'cat_vehicle',
    name: 'ယာဉ်စီမံခန့်ခွဲမှု',
    nameEn: 'Vehicle Management',
    type: 'expense',
    icon: 'Car',
    color: '#0284C7',
    subCategories: [
      { id: 'sub_veh_fuel', name: 'စက်သုံးဆီ (ဓာတ်ဆီ/ဒီဇယ်)', nameEn: 'Fuel & Petrol', icon: 'pic:petrol-pump' },
      { id: 'sub_veh_maintenance', name: 'ပြုပြင်ထိန်းသိမ်းမှု / ဝန်ဆောင်ခ', nameEn: 'Maintenance & Service', icon: 'pic:wrench' },
      { id: 'sub_veh_parts', name: 'အပိုပစ္စည်းနှင့် ဆီလဲလှယ်ခြင်း', nameEn: 'Spare Parts & Engine Oil', icon: 'pic:bolt' },
      { id: 'sub_veh_tire', name: 'တာယာနှင့် လေဖိအား', nameEn: 'Tires & Wheel Alignment' },
      { id: 'sub_veh_wash', name: 'ကားဆေး / သန့်ရှင်းရေး', nameEn: 'Car Wash & Detailing', icon: 'pic:car-wash' },
      { id: 'sub_veh_license', name: 'လိုင်စင် / အခွန်နှင့် အာမခံ', nameEn: 'License, Tax & Insurance', icon: 'pic:certificate' },
    ],
  },
  {
    id: 'cat_utilities',
    name: 'အိမ်စရိတ်နှင့် ဘေလ်များ',
    nameEn: 'Bills & Utilities',
    type: 'expense',
    icon: 'Home',
    color: '#8B5CF6',
    subCategories: [
      { id: 'sub_util_rent', name: 'အိမ်ငှားခ', nameEn: 'House Rent', icon: 'pic:building' },
      { id: 'sub_util_elec', name: 'လျှပ်စစ်မီတာခ', nameEn: 'Electricity Bill', icon: 'pic:electricity-bill' },
      { id: 'sub_net_mobile', name: 'ဖုန်းဘေလ်ငွေဖြည့် / ဒေတာ', nameEn: 'Mobile Data / Topup', icon: 'pic:smartphone' },
      { id: 'sub_net_fiber', name: 'အိမ်သုံး Wifi လစဉ်ကြေး', nameEn: 'Home Fiber Wifi', icon: 'pic:globe' },
      { id: 'sub_util_water', name: 'ရေဖိုး / သန့်ရှင်းရေး', nameEn: 'Water & Maintenance', icon: 'pic:water-bill' },
    ],
  },
  {
    id: 'cat_shopping',
    name: 'ဈေးဝယ်ခြင်း / အဝတ်အထည်',
    nameEn: 'Shopping',
    type: 'expense',
    icon: 'ShoppingCart',
    color: '#EC4899',
    subCategories: [
      { id: 'sub_shop_clothes', name: 'အဝတ်အထည်နှင့် ဖိနပ်', nameEn: 'Clothes & Footwear', icon: 'pic:dress' },
      { id: 'sub_shop_electronics', name: 'အီလက်ထရောနစ် / ဖုန်းဆက်စပ်', nameEn: 'Gadgets & Electronics', icon: 'pic:computer' },
      { id: 'sub_shop_personal', name: 'ကိုယ်ရေးကိုယ်တာ သုံးကုန်', nameEn: 'Personal Care', icon: 'pic:soap-dispenser' },
    ],
  },
  {
    id: 'cat_health',
    name: 'ဆေးဝါးနှင့် ကျန်းမာရေး',
    nameEn: 'Health & Medical',
    type: 'expense',
    icon: 'HeartPulse',
    color: '#F43F5E',
    subCategories: [
      { id: 'sub_med_pharmacy', name: 'ဆေးဝါးဝယ်ယူစရိတ်', nameEn: 'Medicines', icon: 'pic:capsule' },
      { id: 'sub_med_doctor', name: 'ဆေးခန်း / ဆရာဝန်ပြစရိတ်', nameEn: 'Clinic & Doctor', icon: 'pic:stethoscope' },
      { id: 'sub_med_fitness', name: 'အားကစား / Gym', nameEn: 'Fitness & Sports', icon: 'pic:soccer-ball' },
    ],
  },
  {
    id: 'cat_charity',
    name: 'အလှူဒါန / လူမှုရေး',
    nameEn: 'Donation & Charity',
    type: 'expense',
    icon: 'HeartHandshake',
    color: '#D97706',
    subCategories: [
      { id: 'sub_cha_religious', name: 'ဘုန်းကြီးကျောင်း / ဆွမ်း', nameEn: 'Religious & Merit', icon: 'pic:oil-lamp' },
      { id: 'sub_cha_social', name: 'မင်္ဂလာဆောင် / လူမှုရေး', nameEn: 'Social Events & Gifts', icon: 'pic:balloons' },
      { id: 'sub_cha_family', name: 'မိဘထောက်ပံ့ကန်တော့ငွေ', nameEn: 'Family Support', icon: 'pic:heart-gift' },
    ],
  },
  {
    id: 'cat_entertainment',
    name: 'ဖျော်ဖြေရေး / အပန်းဖြေ',
    nameEn: 'Entertainment',
    type: 'expense',
    icon: 'Film',
    color: '#A855F7',
    subCategories: [
      { id: 'sub_ent_movie', name: 'ရုပ်ရှင် / ပွဲလမ်း', nameEn: 'Movies & Outings', icon: 'pic:cd-disc' },
      { id: 'sub_ent_sub', name: 'Netflix / Spotify Subscriptions', nameEn: 'Digital Subscriptions', icon: 'pic:music-note' },
      { id: 'sub_ent_travel', name: 'ခရီးသွား / အပန်းဖြေ', nameEn: 'Travel & Trips', icon: 'pic:suitcase' },
    ],
  },
  {
    id: 'cat_expense_other',
    name: 'အထွေထွေ အသုံးစရိတ်',
    nameEn: 'Other Expense',
    type: 'expense',
    icon: 'MoreHorizontal',
    color: '#64748B',
    subCategories: [
      { id: 'sub_exp_misc', name: 'အထွေထွေအသေးသုံး', nameEn: 'General Misc' },
    ],
  },
];

// Helper to get relative dates
const today = new Date();
const formatDate = (daysAgo: number): string => {
  const d = new Date(today);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
};

export const INITIAL_BUDGETS: BudgetConfig[] = [
  {
    id: 'cat_food',
    categoryId: 'cat_food',
    calcType: 'percentage', // ဝင်ငွေ၏ ၂၀%
    value: 20,
    walletId: 'all',
  },
  {
    id: 'cat_transport',
    categoryId: 'cat_transport',
    calcType: 'percentage', // ဝင်ငွေ၏ ၁၀%
    value: 10,
    walletId: 'all',
  },
  {
    // [v7.5.74] Vehicle (fuel) budget — fuel spending goes to cat_vehicle
    // (sub_veh_fuel, set in useVehicleHandlers) and previously had no
    // budget, so it never showed on a Budget card. 10% of income, all wallets.
    id: 'cat_vehicle',
    categoryId: 'cat_vehicle',
    calcType: 'percentage', // ဝင်ငွေ၏ ၁၀%
    value: 10,
    walletId: 'all',
  },
  {
    id: 'cat_utilities',
    categoryId: 'cat_utilities',
    calcType: 'fixed', // ငွေကျပ် ၁၀၀,၀၀၀
    value: 100000,
    walletId: 'cash', 
  },
  {
    id: UNBUDGETED_CATEGORY_ID,
    categoryId: UNBUDGETED_CATEGORY_ID, // အထွေထွေ (ဘတ်ဂျက်သီးသန့် မသတ်မှတ်ထားသော ကဏ္ဍများအားလုံး)
    calcType: 'fixed',
    value: 150000,
    walletId: 'all',
  },
];