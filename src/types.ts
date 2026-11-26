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
  // [v7.5.93] Per-row service type for vehicle_service multi-row
  // entries — each row carries its own type so one visit can track
  // several services separately. Optional: old items lack it and fall
  // back to the visit's main service type.
  serviceType?: VehicleServiceType;
  // [v7.5.82] Per-unit basis of `price` (e.g. 'ခု' / 'ပါကင်' /
  // 'ကီလို') — the shopping-list entry form stamps it; a plain /
  // direct entry has no unit. Used to match the shop menu line when a
  // shopping-list entry auto-updates the menu.
  unit?: string;
}

// [v7.6.07] One slice of a split transaction: part of the record's
// total amount attributed to a single category (and optionally a
// sub-category). `categoryId` is the category's id — the record's
// own category field is named `category`, but a split row is a
// category assignment, so the row field is `categoryId` to match
// the picker's onSelect vocabulary. Amounts are in the record's
// wallet currency, exactly like `Transaction.amount`.
export interface TransactionSplit {
  categoryId: string;
  subCategoryId?: string;
  amount: number;
  note?: string;
  // [v7.6.41] Per-row shop: the shop this slice was bought at. Absent
  // (or blank) = the record's own `shopName` — old rows, and rows the
  // user leaves on the entry shop, read exactly as before. Only rows
  // the user explicitly gives a different shop carry this field.
  shopName?: string;
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
  shopName?: string; // [v7.5.54] Shop where the item was bought (for shop price comparison)
  items?: TransactionItem[]; // Shopping list items breakdown
  // [v7.6.07] Category splits: when present and non-empty, the
  // record's total `amount` is divided across these categories
  // (budgets / reports count each slice under its own category).
  // `category` stays the FIRST split's category (the primary), so
  // every whole-amount reader keeps working unchanged. Absent or
  // empty = unsplit: the whole amount belongs to `category`.
  // Omitted entirely (never `splits: undefined`) when a record has
  // no splits — cleanForFirestore drops undefined anyway, but the
  // save path never writes the key at all. EXCEPTION (D1): an edit
  // that REMOVES splits writes `splits: []` (see shouldClearSplits
  // in utils/transactionSplits) — a merge write leaves an omitted
  // field untouched, so only the explicit empty array clears the
  // stored slices in Firestore. Absent and empty mean the same.
  splits?: TransactionSplit[];
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
  // [v7.6.13] Savings-pot transfer link: a transaction created by a
  // pot entry (wallet ↔ pot) names the pot it belongs to. The pot
  // entry carries the matching walletId + transactionId, so the two
  // records stay findable from either side. Absent on every other
  // transaction; never written by the edit path (an edit keeps the
  // pot link only if the saved payload still carries it).
  savingsPotId?: string;
  createdAt: number;
  updatedAt?: number;
  version?: number;
  lastEditedBy?: string;
  // [v7.5.56] Authorship for shared wallets — who added this record.
  // Stamped on add, never overwritten on edit.
  createdBy?: string; // uid of the user who added the transaction
  createdByName?: string; // display name/email of the creator
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
  /** [v6.1.11] Linked wallet transaction id so edit/delete stays in sync. */
  transactionId?: string;
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
  // [v7.5.55] ISO currency code of the debt amount (e.g. 'MMK', 'USD').
  // Defaults to the wallet's currency when unset. Shown in the form label.
  currency?: string;
  note?: string;
  repayments: Repayment[];
  status: 'active' | 'settled';
  createdAt: number;
  updatedAt?: number;
  version?: number;
  lastEditedBy?: string;
  // [v7.5.56] Shared-wallet debt: the shared wallet doc id this debt
  // belongs to (if any). Collaborators can view it read-only.
  sharedWalletId?: string;
  createdBy?: string;
  createdByName?: string;
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
  // [v7.6.31] Per-wallet category denylist (opt-OUT, never an
  // allowlist): category ids HIDDEN in this wallet's entry picker.
  // Absent/undefined/empty = ALL categories visible (current
  // behavior, zero migration); a category added later is visible
  // in every wallet until hidden. Sub-categories follow their
  // parent — no per-sub ids. cat_transfer is never hidden (see
  // utils/walletCategories). Written explicitly ([]) on every
  // WalletModal save so merge:true never resurrects a stale list.
  hiddenCategoryIds?: string[];
  sharedWith?: string[]; // List of collaborator emails who have access to this specific wallet
  collaboratorPermissions?: Record<string, WalletPermissions>; // email -> permissions mapping
  ownerUid?: string; // UID of the user who owns and shared this wallet
  ownerEmail?: string; // Email of the user who owns and shared this wallet
  ownerName?: string; // Name of the owner
  isSharedFromOther?: boolean; // True if this wallet is shared to the current user by someone else
  originalId?: string; // Original wallet id if local id was namespaced
  sharedDocId?: string; // Document id in sharedWallets collection
  updatedAt?: number;
  version?: number;
  lastEditedBy?: string;
}

export interface InvitedWorkspace {
  uid: string;
  email: string;
  displayName: string;
  plan: PlanType;
  collaborators?: string[];
  // [v7.5.56] Per-viewer Separate choice for shared wallets:
  // shared wallet doc id -> include in THIS viewer's totals.
  // Stored in the viewer's own user doc, never on the shared doc.
  sharedWalletScopeOverrides?: Record<string, boolean>;
}

export interface SubCategory {
  id: string;
  name: string;
  nameEn: string;
  isCustom?: boolean;
  // [v7.6.48] Optional icon: a Lucide name or `pic:<key>` — same value
  // domain as Category.icon. Unset = parent category icon fallback.
  icon?: string;
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
  updatedAt?: number;
  version?: number;
  lastEditedBy?: string;
}

export type BudgetCalcType = 'fixed' | 'percentage';

export const UNBUDGETED_CATEGORY_ID = 'cat_general_unbudgeted';

export interface BudgetConfig {
  id: string; // FIX: Add id for consistent mergeById usage
  categoryId: string; // specific category id, or UNBUDGETED_CATEGORY_ID ('cat_general_unbudgeted')
  // [v7.5.74] Multi-category budget: every category this ONE budget covers.
  // When present and non-empty, use it; otherwise fall back to [categoryId]
  // (all stored single-category budgets keep working unchanged).
  // categoryId stays the PRIMARY category (first of categoryIds) — it is
  // the storage/Firestore doc key (useDataHandlers/AuthContext key budgets
  // by categoryId), so it must never change while editing a budget.
  categoryIds?: string[];
  calcType: BudgetCalcType; // 'fixed' | 'percentage'
  value: number; // if 'fixed': MMK amount; if 'percentage': percentage of monthly income (0-100)
  walletId: string; // 'all' or specific wallet id (e.g. 'cash', 'kpay')
  updatedAt?: number;
  version?: number;
  lastEditedBy?: string;
}

// [v7.5.74] Resolve the categories a budget covers: the multi-category
// list when set, otherwise the single legacy categoryId. The General
// budget (UNBUDGETED_CATEGORY_ID) resolves to itself — it aggregates
// unbudgeted spending, it never groups explicit categories.
export const getBudgetCategoryIds = (b: BudgetConfig): string[] =>
  b.categoryIds && b.categoryIds.length > 0 ? b.categoryIds : [b.categoryId];

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

export interface ActivationCode {
  code: string;
  months: number;
  isUsed: boolean;
  usedBy?: string;
  usedEmail?: string;
  usedAt?: string;
  createdAt: string;
  createdBy: string;
  // [v7.5.55] ISO date after which the code can no longer be redeemed
  // (codes expire 1 year after creation). Unset = no expiry (legacy codes).
  expiresAt?: string;
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

export interface PinLockSettings {
  isEnabled: boolean;
  /**
   * PIN storage field.
   * - Legacy format: 4-digit plaintext (auto-migrated to hash on app load)
   * - New format: PBKDF2-SHA256 hash, 64 hex characters
   *   (see src/utils/pinHash.ts)
   */
  pin: string;
  /**
   * PBKDF2 salt (16 bytes hex, 32 chars).
   * Empty string for legacy plaintext format.
   */
  pinSalt: string;
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
  // [v7.5.64 C-10] True when the country/city is a local fallback because
  // the IP lookup failed (not a measured location) — shown as "ခန့်မှန်း"
  // in the Admin Panel and excluded from the country chart.
  geoInferred?: boolean;
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
  shopCategory?: string; // အမျိုးအစား (parent) — 'food' | 'health' | 'vehicle' | 'jobs' | 'services' | 'other' (v7.6.43; ရှေးဆိုင်များတွင် မပါသော်လည်း note ကနေ တွက်ယူသည်)
  subCategory?: string; // အမျိုးအစားခွဲ (e.g. bank, atm)
  userId: string;      // ပိုင်ရှင် UID
  createdAt: number;
  kpayNumber?: string; // KPay Number / Details
  generalNotes?: string; // အထွေထွေမှတ်စုများ
  items?: { name: string; price: number; updatedAt: number; addedBy?: string; unit?: string }[]; // ပစ္စည်းစာရင်းနှင့် ဈေးနှုန်း
  updatedAt?: number;
  version?: number;
  lastEditedBy?: string;
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
  shopCategory?: string; // အမျိုးအစား (parent) — 'food' | 'health' | 'vehicle' | 'jobs' | 'services' | 'other' (v7.6.43; ရှေးဆိုင်များတွင် မပါသော်လည်း note ကနေ တွက်ယူသည်)
  subCategory?: string; // အမျိုးအစားခွဲ (e.g. bank, atm, clinic)
  addedBy: string;     // တင်ပေးသူ (Email သို့မဟုတ် DisplayName)
  addedByUid: string;  // တင်ပေးသူ UID
  createdAt: number;
  kpayNumber?: string; // KPay Number / Details
  generalNotes?: string; // အထွေထွေမှတ်စုများ
  items?: { name: string; price: number; updatedAt: number; addedBy?: string; unit?: string }[]; // ပစ္စည်းစာရင်းနှင့် ဈေးနှုန်း
}

export interface Vehicle {
  id: string;
  name: string;
  plateNumber: string;
  type: 'car' | 'motorcycle' | 'truck' | 'van' | 'other';
  fuelType: string;
  currentOdometer: number;
  odometerUnit?: 'km' | 'mi';
  // [v7.5.60 D-N9] Odometer when the vehicle was added. When every log
  // is deleted the odometer falls back to this value instead of staying
  // at a reading no log supports. Older vehicles lack it — then the
  // previous behaviour (keep the last value) applies.
  initialOdometer?: number;
  tankCapacity?: number;
  recommendedTirePressureFront?: number;
  recommendedTirePressureRear?: number;
  walletId?: string;
  color?: string;
  notes?: string;
  userId: string;
  createdAt: number;
  updatedAt?: number;
  version?: number;
  lastEditedBy?: string;
  // [v7.5.55] false = deactivated: hidden from active lists/selectors, but all
  // fuel/maintenance/tire logs and linked money records are KEPT and balances
  // are unchanged. Undefined is treated as active (existing vehicles).
  isActive?: boolean;
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
  updatedAt?: number;
  version?: number;
  lastEditedBy?: string;
}

export type VehicleServiceType =
  | 'engine_oil'
  | 'oil_filter'
  | 'air_filter'
  | 'fuel_filter'
  | 'brake_pads'
  | 'brake_fluid'
  | 'tires'
  | 'battery'
  | 'spark_plugs'
  | 'transmission_fluid'
  | 'coolant'
  | 'fan_belt'
  | 'timing_belt'
  | 'wheel_alignment'
  | 'suspension'
  | 'wiper_blades'
  | 'general_repair'
  | 'license_renewal'
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
  // [v7.6.49] Service fee / labor charge for the visit, entered
  // separately from parts / service rows. `cost` stays the single
  // total (parts + labor); this field is the breakdown only.
  // Absent (or 0) = no separate labor — old records render exactly
  // as before. Never stored as 0: empty labor is unset.
  laborCost?: number;
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
  updatedAt?: number;
  version?: number;
  lastEditedBy?: string;
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
  updatedAt?: number;
  version?: number;
  lastEditedBy?: string;
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
  // [v7.5.93] Raw typed visit title (before the title || note ||
  // default coalescing in `title`) — the per-type record titles need
  // the un-coalesced value so a row name can outrank the extra note.
  maintTitle?: string;
  sparePartBrand?: string;
  workshopName?: string;
  // [v7.6.49] Service fee / labor charge typed in the entry form's
  // maintenance section. The handler adds it to the first per-type
  // record (see applyLaborCostToRowGroups) and the single-record
  // path stores it alongside the total cost.
  laborCost?: number;
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





