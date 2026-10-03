export type PlanType = 'guest' | 'free' | 'premium';

export type DataScope = 'all' | 'included' | 'separate' | 'personal' | 'shared';

export type TransactionType = 'income' | 'expense';

export type DebtType = 'receivable' | 'payable'; // receivable: သူများဆီက ရရန်ရှိ, payable: သူများကို ပေးရန်ရှိ

export interface TransactionItem {
  id?: string;
  name: string;
  price: number;
  quantity: number;
  amount: number;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  subCategoryId?: string;
  walletId: string;
  date: string; // YYYY-MM-DD
  note?: string;
  items?: TransactionItem[]; // Shopping list items breakdown
  unitPrice?: number;
  quantity?: number;
  receiptUrl?: string; // Premium feature
  isFuelLog?: boolean;
  isMaintenanceLog?: boolean;
  fuelLiters?: number;
  isTransfer?: boolean;
  transferType?: 'transfer_in' | 'transfer_out';
  transferPairId?: string;
  transferToWalletId?: string;
  createdAt: number;
  userId?: string;
  _userId?: string;
  _docPath?: string;
}

export interface Repayment {
  id: string;
  amount: number;
  date: string;
  walletId: string;
  note?: string;
  createdAt: number;
}

export interface Debt {
  id: string;
  type: DebtType;
  personName: string;
  phone?: string;
  totalAmount: number;
  paidAmount: number;
  startDate: string;
  dueDate?: string;
  walletId: string;
  note?: string;
  repayments: Repayment[];
  status: 'active' | 'settled';
  createdAt: number;
}

export interface WalletPermissions {
  canAddIncome: boolean;
  canEditIncome: boolean;
  canDeleteIncome: boolean;
  canAddExpense: boolean;
  canEditExpense: boolean;
  canDeleteExpense: boolean;
}

export interface Wallet {
  id: string;
  name: string;
  nameEn: string;
  balance: number;
  initialBalance?: number; // Starting balance entered upon creation
  color: string;
  icon: string;
  currency?: string; // e.g. 'MMK' | 'USD' | 'THB' | 'SGD' etc. Defaults to 'MMK'
  exchangeRate?: number; // Market rate: 1 foreign unit = X MMK. Defaults to 1 for MMK
  accountNumber?: string;
  isDefault?: boolean;
  includeInTotals?: boolean; // true or undefined: စုစုပေါင်းထဲ ရောပြမည်, false: စုစုပေါင်းထဲ မရောပါ (သီးသန့်ထားမည်)
  sharedWith?: string[]; // List of collaborator emails who have access to this specific wallet
  collaboratorPermissions?: Record<string, WalletPermissions>; // email -> permissions mapping
  ownerUid?: string; // UID of the user who owns and shared this wallet
  ownerEmail?: string; // Email of the user who owns and shared this wallet
  ownerName?: string; // Name of the owner
  isSharedFromOther?: boolean; // True if this wallet is shared to the current user by someone else
  originalId?: string; // Original wallet id if local id was namespaced
  sharedDocId?: string; // Document id in sharedWallets collection
}

export interface InvitedWorkspace {
  uid: string;
  email: string;
  displayName: string;
  plan: PlanType;
  collaborators?: string[];
}

export interface SubCategory {
  id: string;
  name: string;
  nameEn: string;
  isCustom?: boolean;
}

export interface Category {
  id: string;
  name: string;
  nameEn: string;
  type: TransactionType;
  icon: string;
  color: string;
  subCategories?: SubCategory[];
  isCustom?: boolean;
}

export type BudgetCalcType = 'fixed' | 'percentage';

export const UNBUDGETED_CATEGORY_ID = 'cat_general_unbudgeted';

export interface BudgetConfig {
  id: string; // FIX: Add id for consistent mergeById usage
  categoryId: string; // specific category id, or UNBUDGETED_CATEGORY_ID ('cat_general_unbudgeted')
  calcType: BudgetCalcType; // 'fixed' | 'percentage'
  value: number; // if 'fixed': MMK amount; if 'percentage': percentage of monthly income (0-100)
  walletId: string; // 'all' or specific wallet id (e.g. 'cash', 'kpay')
}

export type Budget = BudgetConfig;


export interface PlanLimits {
  maxTransactions: number;
  maxDebts: number;
  maxWallets: number;
  maxBudgetCategories: number;
  maxRecurringTransactions: number;
  maxCollaborators: number;
  maxVehicles: number;
  hasBudgets: boolean;
  hasDebts: boolean;
  hasSavings: boolean;
  hasWalletSharing: boolean;
  hasExport: boolean;
  hasReceipts?: boolean;
  hasCustomCategories: boolean;
  hasAdvancedCharts: boolean;
}

export interface UserProfile {
  userId: string;
  email: string;
  plan: PlanType;
  collaborators: string[];
  premiumExpiresAt?: string; // ISO string for expiration timestamp
  premiumActivatedAt?: string;
  premiumCodeUsed?: string;
  premiumMonths?: number;
  trialClaimed?: boolean;
  trialClaimedAt?: string;
  accountCreatedAt?: string;
}

export interface ActivationCode {
  code: string;
  months: number;
  isUsed: boolean;
  usedBy?: string;
  usedEmail?: string;
  usedAt?: string;
  createdAt: string;
  createdBy: string;
}

export type AdminMessageType = 'announcement' | 'notice' | 'note';

export interface AdminSystemMessage {
  id: string;
  title: string;
  content: string;
  type: AdminMessageType;
  isMarquee: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  authorEmail?: string;
}

export interface ContactInfo {
  telegramUsername: string;
  telegramUrl: string;
  viberPhone?: string;
  phone?: string;
  kpayPhone?: string;
  kpayName?: string;
  wavePhone?: string;
  waveName?: string;
  contactNoteMy?: string;
  contactNoteEn?: string;
  updatedAt?: string;
}

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly';

export interface RecurringTransaction {
  id: string;
  title: string;
  type: TransactionType;
  amount: number;
  category: string;
  subCategoryId?: string;
  walletId: string;
  frequency: RecurringFrequency;
  dayOfMonth: number; // 1 to 31
  note?: string;
  isActive: boolean;
  lastRunDate?: string; // YYYY-MM-DD
  createdAt: number;
}

export type Currency = 'MMK' | 'USD' | 'THB' | 'SGD';

export interface ExchangeRates {
  USD: number; // MMK per 1 USD (e.g. 4500)
  THB: number; // MMK per 1 THB (e.g. 135)
  SGD: number; // MMK per 1 SGD (e.g. 3450)
}

export interface PinLockSettings {
  isEnabled: boolean;
  pin: string; // 4 digits
  requireOnStart: boolean;
}

export type FeedbackCategory = 'general' | 'feature_request' | 'bug_report' | 'app_review';

export interface Feedback {
  id: string;
  userId?: string;
  userName: string;
  userEmail?: string;
  userPlan?: PlanType;
  rating: number; // 1 to 5
  category: FeedbackCategory;
  comment: string;
  adminReply?: string;
  adminRepliedAt?: string;
  status: 'pending' | 'reviewed' | 'resolved';
  isPublic?: boolean;
  createdAt: number;
}

export interface VisitorDoc {
  id: string;
  isGuest: boolean;
  userId?: string;
  userName?: string;
  userEmail?: string;
  country: string;
  countryCode: string; // e.g. "MM", "TH", "SG", "US"
  city: string;
  device: 'mobile' | 'desktop' | 'tablet';
  browser: string;
  ip?: string;
  visitCount: number;
  firstSeenAt: number;
  lastActiveAt: number;
}

export interface ShopContact {
  id: string;
  name: string;        // ဆိုင်အမည်
  nameEn?: string;     // Shop Name in English (optional)
  phone: string;       // ဖုန်းနံပါတ် (legacy)
  phones?: string[];   // ဖုန်းနံပါတ်များ (တိုးလို့ရသည်)
  address?: string;    // လိပ်စာ (legacy)
  addresses?: string[]; // လိပ်စာများ (တိုးလို့ရသည်)
  stateRegion?: string; // ပြည်နယ်/တိုင်း
  township?: string;    // မြို့နယ်
  city?: string;        // မြို့ (optional for private)
  ward?: string;        // ရပ်ကွက်/ကျေးရွာ
  note?: string;       // ဆိုင်အမျိုးအစား သို့မဟုတ် မှတ်စု
  userId: string;      // ပိုင်ရှင် UID
  createdAt: number;
  kpayNumber?: string; // KPay Number / Details
  generalNotes?: string; // အထွေထွေမှတ်စုများ
  items?: { name: string; price: number; updatedAt: number; addedBy?: string }[]; // ပစ္စည်းစာရင်းနှင့် ဈေးနှုန်း
}

export interface PublicShop {
  id: string;
  name: string;        // ဆိုင်အမည်
  phone: string;       // ဖုန်းနံပါတ် (legacy)
  phones?: string[];   // ဖုန်းနံပါတ်များ (တိုးလို့ရသည်)
  city: string;        // မြို့နယ် / မြို့ (e.g. ရန်ကုန်, တောင်ကြီး, မန္တလေး)
  stateRegion?: string; // ပြည်နယ်/တိုင်း
  township?: string;    // မြို့နယ်
  ward?: string;        // ရပ်ကွက်/ကျေးရွာ
  address?: string;    // လိပ်စာ (legacy)
  addresses?: string[]; // လိပ်စာများ (တိုးလို့ရသည်)
  note?: string;       // ဆိုင်အမျိုးအစား (preset သို့မဟုတ် custom)
  addedBy: string;     // တင်ပေးသူ (Email သို့မဟုတ် DisplayName)
  addedByUid: string;  // တင်ပေးသူ UID
  createdAt: number;
  kpayNumber?: string; // KPay Number / Details
  generalNotes?: string; // အထွေထွေမှတ်စုများ
  items?: { name: string; price: number; updatedAt: number; addedBy?: string }[]; // ပစ္စည်းစာရင်းနှင့် ဈေးနှုန်း
}

export interface Vehicle {
  id: string;
  name: string;
  plateNumber: string;
  type: 'car' | 'motorcycle' | 'truck' | 'van' | 'other';
  fuelType: string;
  currentOdometer: number;
  odometerUnit?: 'km' | 'mi';
  tankCapacity?: number;
  recommendedTirePressureFront?: number;
  recommendedTirePressureRear?: number;
  walletId?: string;
  color?: string;
  notes?: string;
  userId: string;
  createdAt: number;
  updatedAt?: number;
}

export interface FuelLog {
  id: string;
  vehicleId: string;
  vehicleName?: string;
  date: string; // YYYY-MM-DD
  odometer: number;
  liters: number;
  pricePerLiter: number;
  totalCost: number;
  isFullTank: boolean;
  fuelType: string;
  gasStation?: string;
  syncToExpense: boolean;
  transactionId?: string;
  walletId: string;
  note?: string;
  distanceSinceLast?: number;
  fuelEfficiency?: number; // km/L or mi/gal
  costPerDistance?: number; // cost per km/mi
  userId: string;
  createdAt: number;
}

export type VehicleServiceType =
  | 'engine_oil'
  | 'oil_filter'
  | 'air_filter'
  | 'brake_pads'
  | 'tires'
  | 'battery'
  | 'spark_plugs'
  | 'transmission_fluid'
  | 'coolant'
  | 'wheel_alignment'
  | 'suspension'
  | 'general_repair'
  | 'other';

export interface VehicleMaintenance {
  id: string;
  vehicleId: string;
  vehicleName?: string;
  date: string; // YYYY-MM-DD
  odometer: number;
  serviceType: VehicleServiceType;
  title: string;
  cost: number;
  sparePartBrand?: string;
  workshopName?: string;
  expectedLifespanKm?: number;
  expectedLifespanDays?: number;
  lastReplacedDate?: string;
  lastReplacedOdometer?: number;
  syncToExpense: boolean;
  transactionId?: string;
  walletId: string;
  note?: string;
  userId: string;
  createdAt: number;
}

export interface TirePressureLog {
  id: string;
  vehicleId: string;
  vehicleName?: string;
  date: string; // YYYY-MM-DD
  odometer?: number;
  frontLeftPsi?: number;
  frontRightPsi?: number;
  rearLeftPsi?: number;
  rearRightPsi?: number;
  frontPsi?: number; // For motorcycles
  rearPsi?: number;  // For motorcycles
  tireCondition?: 'good' | 'fair' | 'needs_check';
  servicePlace?: string;
  cost?: number;
  syncToExpense?: boolean;
  transactionId?: string;
  walletId?: string;
  note?: string;
  nextCheckDate?: string;
  userId: string;
  createdAt: number;
}

export interface VehicleLinkData {
  vehicleId: string;
  logType: 'fuel' | 'maintenance' | 'tire';
  // Fuel fields
  fuelType?: string;
  liters?: number;
  pricePerLiter?: number;
  gasStation?: string;
  isFullTank?: boolean;
  // Maintenance fields
  serviceType?: VehicleServiceType;
  title?: string;
  sparePartBrand?: string;
  workshopName?: string;
  expectedLifespanKm?: number;
  expectedLifespanDays?: number;
  // Tire fields
  frontLeftPsi?: number;
  frontRightPsi?: number;
  rearLeftPsi?: number;
  rearRightPsi?: number;
  // Common fields
  odometer?: number;
}





