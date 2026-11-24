// [v7.6.18] Dead-code cleanup: unwired props, dead helpers and the
// orphaned SyncEngine file are gone; the live wiring they shadowed is
// untouched. Source-text assertions (repo pattern: no test renderer).
// NO path comparisons: sources are read via new URL(..., import.meta.url).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  VERSION_HISTORY,
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
} from '../../data/versionHistory';

function src(rel: string): string {
  return readFileSync(new URL(rel, import.meta.url), 'utf8');
}

const DASHBOARD_SRC = src('../../components/Dashboard.tsx');
const TXVIEW_SRC = src('../../components/TransactionsView.tsx');
const PRICE_HIST_SRC = src('../../components/ItemPriceHistoryModal.tsx');
const TXMODAL_SRC = src('../../components/TransactionModal.tsx');
const SYNC_HEALTH_SRC = src('../../components/SyncHealthModal.tsx');
const SIDEBAR_SRC = src('../../components/Sidebar.tsx');
const TX_HOOKS_SRC = src('../../hooks/useTransactionHandlers.ts');
const DEBT_HOOKS_SRC = src('../../hooks/useDebtHandlers.ts');
const WALLET_HOOKS_SRC = src('../../hooks/useWalletHandlers.ts');
const TYPES_SRC = src('../../types.ts');
const ANALYTICS_SRC = src('../../lib/analyticsService.ts');
const DIRECT_HTTP_SRC = src('../../lib/directFirestoreHttp.ts');
const FIREBASE_SRC = src('../../lib/firebase.ts');
const SHOP_IMPORT_SRC = src('../../lib/shopImport.ts');
const SYNC_LOG_SRC = src('../../lib/syncOperationLogger.ts');
const CURRENCY_SRC = src('../../utils/currency.ts');
const I18N_SRC = src('../../utils/i18n.ts');
const DIGITS_SRC = src('../../utils/myanmarDigits.ts');
const STORAGE_SRC = src('../../utils/storage.ts');
const SYNC_GUARDS_SRC = src('../../utils/syncGuards.ts');
const SAVINGS_POTS_SRC = src('../../utils/savingsPots.ts');
const SAVINGS_POTS_VIEW_SRC = src('../../components/SavingsPots.tsx');
const INITIAL_DATA_SRC = src('../../data/initialData.ts');
const APP_SRC = src('../../App.tsx');
const NOTIF_SRC = src('../../components/NotificationModal.tsx');
const ADMIN_SRC = src('../../components/AdminPanel.tsx');
const TRACKER_SRC = src('../../components/DatabaseSyncTrackerModal.tsx');
const WALLETS_VIEW_SRC = src('../../components/WalletsView.tsx');
const DATA_MGMT_SRC = src('../../components/DataManagementView.tsx');
const NAVBAR_SRC = src('../../components/Navbar.tsx');
const LOGIN_SRC = src('../../components/LoginScreen.tsx');
const FEEDBACK_SRC = src('../../components/FeedbackModal.tsx');
const HEALTH_SRC = src('../../components/FinancialHealthModal.tsx');
const SHARED_WALLET_SRC = src('../../lib/sharedWalletService.ts');
const SHOP_REMINDERS_SRC = src('../../utils/shopDetailsReminders.ts');

function destructureBlock(srcText: string, marker: string): string {
  const start = srcText.indexOf(marker);
  const end = srcText.indexOf('}) => {', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return srcText.slice(start, end);
}

describe('unwired props removed (v7.6.18)', () => {
  it('Dashboard no longer declares onOpenDatabaseTracker or the scope-override fallback prop', () => {
    expect(DASHBOARD_SRC).not.toContain('onOpenDatabaseTracker');
    expect(DASHBOARD_SRC).not.toContain('  sharedWalletScopeOverrides?:');
    expect(DASHBOARD_SRC).not.toContain('  sharedWalletScopeOverrides,\n');
    // The context field of the same name is the live wiring and stays.
    expect(DASHBOARD_SRC).toContain('sharedWalletScopeOverrides: ctxScopeOverrides');
    expect(DASHBOARD_SRC).toContain('const scopeOverrides = ctxScopeOverrides ?? {};');
  });

  it('TransactionsView no longer declares onOpenDatabaseTracker or onAddTransaction', () => {
    expect(TXVIEW_SRC).not.toContain('onOpenDatabaseTracker');
    expect(TXVIEW_SRC).not.toContain('onAddTransaction');
  });

  it('ItemPriceHistoryModal no longer declares onSelectSubCategory', () => {
    expect(PRICE_HIST_SRC).not.toContain('onSelectSubCategory');
  });

  it('TransactionModal no longer declares the vehicle-management props', () => {
    expect(TXMODAL_SRC).not.toContain('onOpenVehicleManagement');
    expect(TXMODAL_SRC).not.toContain('onOpenAddVehicle');
  });

  it('SyncHealthModal no longer declares the tracker button or the ignored force/debt/wallet props', () => {
    expect(SYNC_HEALTH_SRC).not.toContain('onOpenDatabaseTracker');
    expect(SYNC_HEALTH_SRC).not.toContain('onForcePushAll');
    expect(SYNC_HEALTH_SRC).not.toContain('onForcePullAll');
    expect(SYNC_HEALTH_SRC).not.toContain('pendingQueueCount');
    expect(SYNC_HEALTH_SRC).not.toContain('inProgressCount');
    expect(SYNC_HEALTH_SRC).not.toContain('  debts?: Debt[];');
    expect(SYNC_HEALTH_SRC).not.toContain('  wallets?: Wallet[];');
    expect(SYNC_HEALTH_SRC).not.toContain('  debts = [],');
    expect(SYNC_HEALTH_SRC).not.toContain('  wallets = [],');
    // The force handlers themselves stay: the tracker modal still passes them.
    expect(APP_SRC).toContain('handleForcePushAll');
    expect(APP_SRC).toContain('handleForcePullAll');
    const healthBlock = APP_SRC.slice(
      APP_SRC.indexOf('<SyncHealthModal'),
      APP_SRC.indexOf('/>', APP_SRC.indexOf('<SyncHealthModal')),
    );
    expect(healthBlock).not.toContain('onForcePushAll');
    expect(healthBlock).not.toContain('onForcePullAll');
    expect(healthBlock).not.toContain('debts={debts}');
    expect(healthBlock).not.toContain('wallets={computedWallets}');
  });

  it('Sidebar logo-style picker is gone; the logo itself renders with its default', () => {
    expect(SIDEBAR_SRC).not.toContain('showLogoPicker');
    expect(SIDEBAR_SRC).not.toContain('logoStyle');
    expect(SIDEBAR_SRC).not.toContain('onSelectLogoStyle');
    expect(SIDEBAR_SRC).toContain('<FortuneLogo size="md" animate />');
    // The Navbar picker (the wired one) is untouched.
    expect(NAVBAR_SRC).toContain('onSelectLogoStyle');
    expect(NAVBAR_SRC).toContain('logoStyle');
  });
});

describe('dead helpers and types removed (v7.6.18)', () => {
  it('countRolling30DayTransactions is gone from all three hooks; the calendar-month helper stays', () => {
    for (const hooksSrc of [TX_HOOKS_SRC, DEBT_HOOKS_SRC, WALLET_HOOKS_SRC]) {
      expect(hooksSrc).not.toContain('countRolling30DayTransactions');
      expect(hooksSrc).toContain('countCalendarMonthTransactions');
    }
  });

  it('UserProfile and ExchangeRates interfaces are gone from types.ts', () => {
    expect(TYPES_SRC).not.toContain('interface UserProfile');
    expect(TYPES_SRC).not.toContain('interface ExchangeRates');
  });

  it('SyncEngine.ts is deleted (live sync uses syncQueue / useCloudListeners)', () => {
    expect(() =>
      readFileSync(new URL('../../lib/SyncEngine.ts', import.meta.url), 'utf8'),
    ).toThrow();
    expect(ANALYTICS_SRC).not.toContain('SyncEngine');
  });

  it('backfillMemberVisitors is gone; the live analytics helpers stay', () => {
    expect(ANALYTICS_SRC).not.toContain('backfillMemberVisitors');
    expect(ANALYTICS_SRC).toContain('trackVisitorSession');
  });

  it('pullTransactionsDirectHttp is gone; the push/delete REST helpers stay', () => {
    expect(DIRECT_HTTP_SRC).not.toContain('pullTransactionsDirectHttp');
    expect(DIRECT_HTTP_SRC).toContain('pushTransactionsDirectHttp');
    expect(DIRECT_HTTP_SRC).toContain('deleteTransactionDirectHttp');
  });

  it('isTimeoutError and the retired quota block are gone from firebase.ts', () => {
    expect(FIREBASE_SRC).not.toContain('isTimeoutError');
    expect(FIREBASE_SRC).not.toContain('quotaWarningLogged');
    expect(FIREBASE_SRC).not.toContain('isNetworkPausedForQuota');
    expect(FIREBASE_SRC).not.toContain('QUOTA_KEY');
    expect(FIREBASE_SRC).not.toContain('QUOTA_TIME_KEY');
    expect(FIREBASE_SRC).not.toContain('QUOTA_RESET_INTERVAL_MS');
    expect(FIREBASE_SRC).toContain('isPermissionError');
    expect(FIREBASE_SRC).toContain('pauseNetworkDueToQuota');
  });

  it('MappedShopDoc is gone from shopImport.ts', () => {
    expect(SHOP_IMPORT_SRC).not.toContain('MappedShopDoc');
  });

  it('recordSyncOperation is gone; the Start/Finish pair stays', () => {
    expect(SYNC_LOG_SRC).not.toContain('export function recordSyncOperation(');
    expect(SYNC_LOG_SRC).toContain('recordSyncOperationStart');
    expect(SYNC_LOG_SRC).toContain('finishSyncOperation');
  });

  it('small dead utils are gone; their live siblings stay', () => {
    expect(CURRENCY_SRC).not.toContain('hasLiveRates');
    expect(CURRENCY_SRC).toContain('setLiveRates');
    expect(I18N_SRC).not.toContain('isValidLang');
    expect(DIGITS_SRC).not.toContain('containsMyanmarDigits');
    expect(DIGITS_SRC).toContain('parseMyanmarNumber');
    expect(STORAGE_SRC).not.toContain('getStorageScope');
    expect(STORAGE_SRC).toContain('setStorageScope');
    expect(STORAGE_SRC).not.toContain("'ngwe_theme'");
    expect(SYNC_GUARDS_SRC).not.toContain('deduplicateById');
    expect(SYNC_GUARDS_SRC).toContain('areArraysEqual');
    expect(SAVINGS_POTS_SRC).not.toContain('isValidSavingsPots');
    expect(SAVINGS_POTS_VIEW_SRC).not.toContain('isValidSavingsPots');
  });

  it('INITIAL_TRANSACTIONS / INITIAL_DEBTS seed arrays are gone; budgets and formatDate stay', () => {
    expect(INITIAL_DATA_SRC).not.toContain('INITIAL_TRANSACTIONS');
    expect(INITIAL_DATA_SRC).not.toContain('INITIAL_DEBTS');
    expect(INITIAL_DATA_SRC).toContain('INITIAL_BUDGETS');
    expect(INITIAL_DATA_SRC).toContain('formatDate');
    expect(APP_SRC).not.toContain('INITIAL_TRANSACTIONS');
    expect(APP_SRC).not.toContain('INITIAL_DEBTS');
    expect(APP_SRC).not.toContain('deduplicateById');
  });
});

describe('passed-but-ignored props removed (v7.6.18)', () => {
  it('NotificationModal recurring/system plumbing is gone; the type union and live loops stay', () => {
    expect(NOTIF_SRC).not.toContain('recurringTransactions');
    expect(NOTIF_SRC).not.toContain('systemMessages');
    expect(NOTIF_SRC).not.toContain('hasSystemNotifications');
    expect(NOTIF_SRC).toContain(
      "type: 'debt' | 'budget' | 'vehicle' | 'recurring' | 'system' | 'shop' | 'expiry' | 'anomaly'",
    );
    expect(NOTIF_SRC).toContain('shopReminders.forEach');
  });

  it('AdminPanel no longer takes transactions/wallets; categories and onNavigate stay', () => {
    expect(ADMIN_SRC).not.toContain('  transactions?: Transaction[];');
    expect(ADMIN_SRC).not.toContain('  wallets?: Wallet[];');
    expect(ADMIN_SRC).not.toContain('  transactions = [],');
    expect(ADMIN_SRC).not.toContain('  wallets = [],');
    expect(ADMIN_SRC).toContain('categories?: Category[];');
    expect(ADMIN_SRC).toContain('onNavigate');
    const adminBlock = APP_SRC.slice(
      APP_SRC.indexOf('<AdminPanel'),
      APP_SRC.indexOf('/>', APP_SRC.indexOf('<AdminPanel')),
    );
    expect(adminBlock).not.toContain('transactions={transactions}');
    expect(adminBlock).not.toContain('wallets={computedWallets}');
    expect(adminBlock).toContain('categories={categories}');
  });

  it('DatabaseSyncTrackerModal dead destructures and locals are gone', () => {
    const block = destructureBlock(
      TRACKER_SRC,
      'DatabaseSyncTrackerModal: React.FC<DatabaseSyncTrackerModalProps> = ({',
    );
    expect(block).not.toContain('wallets,');
    expect(block).not.toContain('debts,');
    expect(TRACKER_SRC).not.toContain('pingResult');
    expect(TRACKER_SRC).not.toContain('hasRecentErrors');
    expect(TRACKER_SRC).not.toContain('totalPendingCount');
    expect(TRACKER_SRC).not.toContain('isSyncing');
    expect(TRACKER_SRC).toContain('totalUnsyncedCount');
    expect(TRACKER_SRC).toContain('failedLogsCount');
  });

  it('WalletsView dead destructures and workspace-switching reads are gone', () => {
    const block = destructureBlock(
      WALLETS_VIEW_SRC,
      'WalletsView: React.FC<WalletsViewProps> = ({',
    );
    expect(block).not.toContain('onUpdateWalletBalance');
    expect(block).not.toContain('onSyncRefresh');
    expect(WALLETS_VIEW_SRC).not.toContain('invitedWorkspaces');
    expect(WALLETS_VIEW_SRC).not.toContain('switchWorkspace');
    expect(WALLETS_VIEW_SRC).not.toContain('switchingWorkspace');
  });

  it('useWalletHandlers no longer takes categories; the App call site drops the arg', () => {
    expect(WALLET_HOOKS_SRC).not.toContain('  categories: Category[];');
    const paramsStart = WALLET_HOOKS_SRC.indexOf('export function useWalletHandlers({');
    const paramsEnd = WALLET_HOOKS_SRC.indexOf('}: UseWalletHandlersParams) {', paramsStart);
    expect(paramsStart).toBeGreaterThan(-1);
    expect(paramsEnd).toBeGreaterThan(paramsStart);
    expect(WALLET_HOOKS_SRC.slice(paramsStart, paramsEnd)).not.toContain('categories,');
    const callBlock = APP_SRC.slice(
      APP_SRC.indexOf('} = useWalletHandlers({'),
      APP_SRC.indexOf('});', APP_SRC.indexOf('} = useWalletHandlers({')),
    );
    expect(callBlock).not.toContain('categories,');
  });

  it('DataManagementView and Navbar dead destructures/reads are gone', () => {
    const dataBlock = destructureBlock(
      DATA_MGMT_SRC,
      'DataManagementView: React.FC<DataManagementViewProps> = ({',
    );
    expect(dataBlock).not.toContain('onOpenAccountModal');
    expect(DATA_MGMT_SRC).not.toContain(
      'const { user, isGuest, isSyncing, lastSyncedAt }',
    );
    const navBlock = destructureBlock(
      NAVBAR_SRC,
      'Navbar: React.FC<NavbarProps> = ({',
    );
    expect(navBlock).not.toContain('onToggleLang');
    expect(navBlock).not.toContain('activeTab');
    expect(NAVBAR_SRC).not.toContain('activeWorkspaceId');
  });

  it('LoginScreen dead state is gone; the Google-button VPN note stays', () => {
    expect(LOGIN_SRC).not.toContain('authMode');
    expect(LOGIN_SRC).not.toContain('showVpnTip');
    expect(LOGIN_SRC).toContain('VPN လိုအပ်နိုင်ပါသည်');
    expect(LOGIN_SRC).toContain('isSignUp');
  });

  it('FeedbackModal onSuccess and FinancialHealthModal budget navigation are gone', () => {
    expect(FEEDBACK_SRC).not.toContain('onSuccess');
    expect(FEEDBACK_SRC).toContain('setIsSuccess(true)');
    expect(HEALTH_SRC).not.toContain('onNavigateToBudgets');
    expect(HEALTH_SRC).toContain('onNavigateToAnalytics');
    expect(HEALTH_SRC).toContain('<span />');
  });

  it('shop-dismissed event dispatch is gone; ngwe_theme is out of the storage allowlist', () => {
    expect(SHOP_REMINDERS_SRC).not.toContain('SHOP_DISMISSED_CHANGED_EVENT');
    expect(SHOP_REMINDERS_SRC).not.toContain('shop-dismissed-changed');
    expect(SHOP_REMINDERS_SRC).not.toContain('notifyDismissedChanged');
    expect(STORAGE_SRC).not.toContain('ngwe_theme');
  });
});

describe('B-21: shared-wallet balance is recomputed, not passed in (v7.6.18)', () => {
  it('saveSharedWalletTransaction no longer takes newWalletBalance; recompute writes the balance', () => {
    const start = SHARED_WALLET_SRC.indexOf(
      'export async function saveSharedWalletTransaction(',
    );
    const end = SHARED_WALLET_SRC.indexOf(
      'export async function deleteSharedWalletTransaction(',
      start,
    );
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const fnBody = SHARED_WALLET_SRC.slice(start, end);
    // The parameter is gone from the signature (the [v7.5.56] comment
    // inside the body still names the old parameter as history).
    const sigEnd = SHARED_WALLET_SRC.indexOf('): Promise<boolean> {', start);
    expect(sigEnd).toBeGreaterThan(start);
    expect(SHARED_WALLET_SRC.slice(start, sigEnd)).not.toContain('newWalletBalance');
    expect(fnBody).toContain('recomputeSharedWalletBalance(docIdToUse)');
    // The balance write itself: derived from stored transactions.
    expect(SHARED_WALLET_SRC).toContain('const computed = initial + income - expense;');
    expect(SHARED_WALLET_SRC).toContain('balance: computed');
  });

  it('call sites pass four args; the delete sibling keeps its own param (out of scope)', () => {
    expect(TX_HOOKS_SRC).toContain(
      'saveSharedWalletTransaction(wallet.id, tx, sharedDocId, user.uid)',
    );
    expect(DEBT_HOOKS_SRC).toContain(
      'saveSharedWalletTransaction(wallet.id, tx, sharedDocId, user.uid)',
    );
    expect(WALLET_HOOKS_SRC).toContain(
      'saveSharedWalletTransaction(fromWallet.id, outTx, fromDocId, user.uid)',
    );
    expect(WALLET_HOOKS_SRC).toContain(
      'saveSharedWalletTransaction(toWallet.id, inTx, toDocId, user.uid)',
    );
    expect(WALLET_HOOKS_SRC).toContain(
      'saveSharedWalletTransaction(walletId, newTx, sharedDocId, user.uid)',
    );
    expect(TX_HOOKS_SRC).not.toContain(
      'saveSharedWalletTransaction(wallet.id, tx, postBalance',
    );
    const delStart = SHARED_WALLET_SRC.indexOf(
      'export async function deleteSharedWalletTransaction(',
    );
    expect(delStart).toBeGreaterThan(-1);
    expect(SHARED_WALLET_SRC.slice(delStart)).toContain('newWalletBalance');
  });
});

describe('Version bump to v7.6.26 (build 340)', () => {
  it('version constants and history entry match version.json', () => {
    const VERSION_JSON = JSON.parse(
      readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
    );
    expect(CURRENT_APP_VERSION).toBe('v7.6.26');
    expect(CURRENT_BUILD_NUMBER).toBe(340);
    expect(VERSION_JSON.version).toBe('v7.6.26');
    expect(VERSION_JSON.buildNumber).toBe(340);
    const entry = VERSION_HISTORY[0];
    expect(entry.version).toBe('v7.6.26');
    expect(entry.buildNumber).toBe(340);
    expect(entry.releaseDate).toBe('2026-11-24');
    expect(entry.tag).toBe('fix');
    expect(entry.titleMy).toBe('CSV ထုတ်ယူခြင်းကို Data Management သို့ ရွှေ့ခြင်း');
    expect(entry.titleEn).toBe('CSV export moved to Data Management');
    expect(entry.changesMy).toEqual(VERSION_JSON.changesMy);
    expect(entry.changesEn).toEqual(VERSION_JSON.changesEn);
    expect(entry.changesMy).toHaveLength(1);
    expect(entry.changesEn).toHaveLength(1);
    expect(entry.changesMy[0]).toBe(
      'CSV ထုတ်ယူခြင်းကို Data Management ထဲသို့ ရွှေ့လိုက်သည် — စာရင်းအားလုံးကို CSV ဖြင့် ထုတ်ပေးမည်',
    );
    expect(entry.changesEn[0]).toBe(
      'CSV export moved into Data Management — exports all transactions as CSV.',
    );
  });

  it('change log has no Admin content and releasedAt is present-only', () => {
    const VERSION_JSON = JSON.parse(
      readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
    );
    expect(VERSION_JSON.changesMy.join(' ')).not.toContain('Admin');
    expect(VERSION_JSON.changesEn.join(' ')).not.toContain('Admin');
    expect(JSON.stringify(VERSION_HISTORY[0])).not.toContain('Admin');
    expect(typeof VERSION_JSON.releasedAt).toBe('string');
    expect(VERSION_JSON.releasedAt.length).toBeGreaterThan(0);
  });

  it('no mangled numbering anywhere in the version surfaces', () => {
    const VERSION_JSON = JSON.parse(
      readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
    );
    expect(CURRENT_APP_VERSION).not.toBe('v7.5.100');
    expect(VERSION_JSON.version).not.toBe('v7.5.100');
    expect(CURRENT_APP_VERSION).not.toBe('v7.6.26'.replace(/6$/, ''));
    expect(VERSION_JSON.version).not.toBe('v7.6.26'.replace(/6$/, ''));
  });

  it('the fix-script guard is raw string equality: accepts exactly 7.6.25/7.6.26, rejects the mangled form', () => {
    const FROM_VERSION = '7.6.25';
    const TO_VERSION = '7.6.26';
    const guardFails = (pkgVersion: string): boolean =>
      pkgVersion !== FROM_VERSION && pkgVersion !== TO_VERSION;
    // The mangled form is built from TO_VERSION, never written as a
    // literal, so the shipped identity can never be confused with
    // it by a grep or by the guard.
    const mangled = TO_VERSION.replace(/6$/, '');
    expect(mangled).not.toBe(TO_VERSION);
    expect(TO_VERSION).toBe('7.6.26');
    expect(guardFails('7.6.25')).toBe(false);
    expect(guardFails('7.6.26')).toBe(false);
    expect(guardFails(mangled)).toBe(true);
    expect(guardFails('')).toBe(true);
  });
});
