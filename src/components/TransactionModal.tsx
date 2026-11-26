import React, { useState, useMemo, useEffect, useRef, useDeferredValue } from 'react';
import { ArrowDownLeft, ArrowUpRight, Calendar, Wallet, Tag, FileText, Lock, Sparkles, Check, History, TrendingUp, TrendingDown, Minus, ShoppingCart, Trash2, X, Car, Fuel, Wrench, Gauge, ChevronDown, ChevronUp, HelpCircle, Store } from 'lucide-react';
import {
  Category,
  PlanType,
  SubCategory,
  Transaction,
  TransactionItem,
  TransactionSplit,
  TransactionType,
  Wallet as WalletType,
  Vehicle,
  VehicleLinkData,
  VehicleServiceType,
  FuelLog,
  VehicleMaintenance,
  TirePressureLog,
} from '../types';
import { ShopContact } from '../types';
import { formatMMK, formatLakhs, getAmountDisplayMode } from '../utils/formatters';
import { formatCurrency } from '../utils/currency';
import { getLocalDateString } from '../utils/dateUtils';
import { parseMyanmarNumber } from '../utils/myanmarDigits';
import { CategoryTile, CategoryIcon } from './CategoryIcon';
import { resolveSubCategoryIconValue } from '../utils/categoryPictures';
import { ItemPriceHistoryModal } from './ItemPriceHistoryModal';
import { CategoryPickerModal } from './CategoryPickerModal';
import { FuelExpenseGuideModal } from './vehicles/FuelExpenseGuideModal';
import { useAuth } from '../context/AuthContext';
import { getVisibleCategories } from '../utils/walletCategories';
import { getCollaboratorPermissions } from '../utils/permissions';
import { getAllItemSuggestions, findMatchingItemInfo, canAutoSwitchCategory, normalizeItemName } from '../utils/itemIntelligence';
import type { UnifiedItemInfo } from '../utils/itemIntelligence';
// [v7.5.78 C] Shop-details prompt trigger — the matching rule lives
// in the reminder store.
import { isShopNameNeedingDetails, loadShopDetailDismissedKeys, type ShopDetailsLike } from '../utils/shopDetailsReminders';
// [v7.5.82] Menu units for the shopping-list rows + unit carry-through.
// [v7.5.95 U1] 'အခြား' reveals a free-text unit; typed units persist
// under 'ngwe_custom_units' and reappear as select options.
import { buildVehicleMenuCandidate, DEFAULT_MENU_UNIT, OTHER_MENU_UNIT, collectNewCustomUnits, customMenuUnitText, displayMenuUnit, menuUnitNeedsCustomInput, menuUnitSelectOptions, resolveMenuUnitSelectValue, resolveSavedMenuUnit } from '../utils/shopMenuUpdate';
import { mergeSharedUnits, publishSharedUnits } from '../utils/sharedUnits';
import { SERVICE_TYPE_CONFIG } from '../utils/vehicleAnalytics';
// [v7.5.93] Per-row service types for multi-row vehicle service entries.
import { ROW_SERVICE_TYPES, resolveVehicleServiceSubCategory } from '../utils/vehicleServiceRows';
// [v7.6.03] Most-used vehicle entry type for the one-time auto-select.
import { resolveMostUsedVehicleEntry } from '../utils/vehicleMostUsed';
// [v7.6.07] Split transactions — category slices of one record.
import {
  attributeItemsToShops,
  defaultSplitRows,
  fillRemainderAmount,
  nextSplitRow,
  rowsToSplits,
  splitRemainder,
  splitRowsFromTransaction,
  syncSplitRowToPrimary,
  validateSplits,
  type SplitFormRow,
} from '../utils/transactionSplits';
import { usePersistedState } from '../hooks/usePersistedState';
import { db, safeSetDoc } from '../lib/firebase';
import { doc } from 'firebase/firestore';

const GAS_STATIONS = ['Denko', 'BOC', 'Other'];

export type EntryModel = 'general' | 'fuel' | 'vehicle_service' | 'tire_pressure';

interface TransactionModalProps {
  isOpen: boolean;
  initialType?: TransactionType;
  initialWalletId?: string;
  initialModel?: EntryModel;
  editTransaction?: Transaction;
  categories: Category[];
  wallets: WalletType[];
  allTransactions?: Transaction[];
  shops?: ShopContact[];
  // [v7.5.89 A1] FULL public docs (phone/address/items included), not
  // id+name stubs — isShopNameNeedingDetails below needs the details
  // fields to suppress the prompt for a filled public shop.
  publicShops?: Array<{ id: string; name: string } & ShopDetailsLike>;
  // [v7.6.24] Shared custom units from the public_units collection
  // (App listener) — merged with the device-local list for the unit
  // selects. Optional: other call sites pass nothing.
  sharedUnits?: string[];
  vehicles?: Vehicle[];
  plan: PlanType;
  lang: 'my' | 'en';
  onClose: () => void;
  // [v7.5.55] Returns false when the save handler blocks the save —
  // the modal then stays open instead of discarding the entry.
  onSubmit: (tx: Omit<Transaction, 'id' | 'createdAt'>, vehicleLinkData?: VehicleLinkData) => boolean | void;
  onOpenUpgrade: () => void;
  onAddSubCategory?: (categoryId: string, subCategory: Omit<SubCategory, 'id'>) => void;
  onManageCategories?: () => void;
  // [v7.5.78 C] Called AFTER a successful save when the typed shop name
  // has no shop record with details yet. App shows the
  // ShopDetailsPromptModal for the name. The prompt CANNOT live in this
  // modal: the save handler closes this modal itself
  // (setIsTxModalOpen(false) in useTransactionHandlers), so a prompt
  // rendered here would unmount unseen.
  onShopNeedsDetails?: (shopName: string) => void;
  // [v7.5.82] Called AFTER a successful save, BEFORE onShopNeedsDetails,
  // when the saved entry carries items (shopping_list or unit_qty) and a
  // typed shop name. App resolves each shop, diffs its menu and shows
  // the ShopMenuUpdatePromptModal when something would actually change.
  // An entry with no items never produces a candidate. [v7.6.41] An
  // ARRAY: a split entry produces one candidate PER row shop (each
  // row's items → that shop); unsplit entries produce at most one.
  onShopMenuUpdateCandidates?: (candidates: { shopName: string; items: TransactionItem[] }[]) => void;
  fuelLogs?: FuelLog[];
  vehicleMaintenance?: VehicleMaintenance[];
  tirePressureLogs?: TirePressureLog[];
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  initialType = 'expense',
  initialWalletId,
  initialModel = 'general',
  editTransaction,
  categories,
  wallets,
  allTransactions = [],
  shops = [],
  publicShops = [],
  vehicles = [],
  sharedUnits = [],
  plan,
  lang,
  onClose,
  onSubmit,
  onOpenUpgrade,
  onAddSubCategory,
  onManageCategories,
  onShopNeedsDetails,
  onShopMenuUpdateCandidates,
  fuelLogs = [],
  vehicleMaintenance = [],
  tirePressureLogs = [],
}) => {
  // [v7.5.55] Deactivated vehicles (isActive === false) are hidden from
  // every vehicle selector/default; undefined counts as active.
  const activeVehicles = useMemo(() => vehicles.filter((v) => v.isActive !== false), [vehicles]);
  const [type, setType] = useState<TransactionType>(editTransaction?.type || initialType);
  const [amount, setAmount] = useState(editTransaction ? String(editTransaction.amount) : '');
  const [categoryId, setCategoryId] = useState(editTransaction?.category || '');
  // [v7.6.44] F1 — explicit-category lock: true once the user themself
  // picks a category in THIS form session (primary picker or a
  // split-row picker), or when an edit session restores the record's
  // own category. While set, item-name matching must NEVER switch
  // the form's category away (typing ဆီ for cooking oil must not
  // flip a grocery form to the fuel model). A ref, not state: the
  // auto-switch check reads it inside the row updater, and no
  // re-render is needed when it flips. Cleared on every fresh open;
  // never set by programmatic paths (vehicle auto-select, type
  // resets, the auto-switch itself).
  const categoryExplicitRef = useRef(false);
  const [subCategoryId, setSubCategoryId] = useState<string>(editTransaction?.subCategoryId || '');
  const [walletId, setWalletId] = useState<string>(() => {
    if (editTransaction?.walletId) return editTransaction.walletId;
    if (initialWalletId && wallets.some((w) => w.id === initialWalletId)) return initialWalletId;
    const lastUsed = typeof localStorage !== 'undefined' ? localStorage.getItem('fortune_last_used_wallet_id') : null;
    if (lastUsed && wallets.some((w) => w.id === lastUsed)) return lastUsed;
    return wallets[0]?.id || 'cash';
  });
  const [transferToWalletId, setTransferToWalletId] = useState<string>(
    editTransaction?.transferToWalletId ||
      wallets.find((w) => w.id !== (editTransaction?.walletId || initialWalletId || wallets[0]?.id))?.id ||
      ''
  );
  const [date, setDate] = useState(
    editTransaction ? getLocalDateString(editTransaction.date) : getLocalDateString()
  );
  const [itemName, setItemName] = useState(editTransaction?.note || '');
  const [extraNote, setExtraNote] = useState('');
  const [shopName, setShopName] = useState(editTransaction?.shopName || '');
  const [shopInput, setShopInput] = useState(editTransaction?.shopName || '');
  const [itemInput, setItemInput] = useState('');

  const getResolvedModel = (): EntryModel => {
    if (editTransaction) {
      // [v7.5.53] A linked tire-pressure log wins over the subcategory:
      // sub_veh_tire is also used by tire REPLACEMENT (maintenance), so the
      // subcategory alone cannot tell a pressure check from a replacement.
      if (tirePressureLogs.some((t) => t.transactionId === editTransaction.id)) {
        return 'tire_pressure';
      }
      // [v7.5.55] Fuel resolves only from a linked fuel log, the fuel
      // flag/liters, or the fuel subcategory — note text alone (e.g. a
      // note mentioning 'ဆီဖိုး') must not switch the model.
      if (
        editTransaction.isFuelLog ||
        editTransaction.fuelLiters ||
        editTransaction.subCategoryId === 'sub_veh_fuel' ||
        fuelLogs.some((f) => f.transactionId === editTransaction.id)
      ) {
        return 'fuel';
      }
      if (
        editTransaction.isMaintenanceLog ||
        editTransaction.subCategoryId === 'sub_veh_maintenance' ||
        editTransaction.subCategoryId === 'sub_veh_parts' ||
        editTransaction.subCategoryId === 'sub_veh_tire' ||
        editTransaction.subCategoryId === 'sub_veh_wash' ||
        editTransaction.subCategoryId === 'sub_veh_license'
      ) {
        return 'vehicle_service';
      }
    }
    return initialModel || 'general';
  };

  const [entryModel, setEntryModel] = useState<EntryModel>(getResolvedModel);
  const prevIsOpenRef = React.useRef(false);
  const prevEditTxIdRef = React.useRef<string | undefined>(undefined);
  // [v7.6.03] Auto-select guards. autoSelectDoneRef: the one-time
  // most-used pick has been considered for this open (fired or
  // superseded by a manual pick), so it never re-fires — not even
  // after the user closes the vehicle mode with the ✕ button.
  // autoSelectedRef: the current vehicle model came from that
  // auto-select and no manual pick has overridden it yet; while it
  // holds, a sub-category pick still switches the model (the
  // sub-category effect below). Both reset on a fresh open.
  const autoSelectDoneRef = React.useRef(false);
  const autoSelectedRef = React.useRef(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  const [shoppingItems, setShoppingItems] = useState<TransactionItem[]>(
    editTransaction?.items && editTransaction.items.length > 0
      ? editTransaction.items
      : [{ id: 'item_1', name: '', price: 0, quantity: 1, amount: 0 }]
  );

  const shoppingLastEditedRef = useRef<Record<string, 'price' | 'qty' | 'amount'>>({});
  const shoppingAmountTimersRef = useRef<Record<string, NodeJS.Timeout>>({});

  // [v7.6.07] Split transactions (general entries only): when
  // on, the record's total is divided across these rows. Row 1 is
  // kept in sync with the primary category picker (two-way, one
  // source of truth). Restored from editTransaction.splits in the
  // edit effect below; cleared on a fresh open.
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [splitRows, setSplitRows] = useState<SplitFormRow[]>([]);
  // Which split row the category picker is currently choosing for
  // (null = the picker is choosing the primary category).
  const [splitPickerRow, setSplitPickerRow] = useState<number | null>(null);

  const [newSubName, setNewSubName] = useState('');
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [walletExpanded, setWalletExpanded] = useState(false);
  const [noteExpanded, setNoteExpanded] = useState(false);

  // Vehicle Linkage State
  const [isVehicleLinkEnabled, setIsVehicleLinkEnabled] = useState(false);
  const [vehicleId, setVehicleId] = useState<string>(activeVehicles[0]?.id || '');
  const [vehicleLogType, setVehicleLogType] = useState<'fuel' | 'maintenance' | 'tire'>('fuel');
  const [fuelEntryStyle, setFuelEntryStyle] = useState<'quick' | 'detailed'>('quick');
  const [showFuelGuideModal, setShowFuelGuideModal] = useState(false);

  // Fuel fields
  const [fuelType, setFuelType] = useState<string>('Octane 92');
  const [fuelLiters, setFuelLiters] = useState<string>('');
  const [fuelPricePerLiter, setFuelPricePerLiter] = useState<string>('3100');
  const [fuelGasStation, setFuelGasStation] = useState<string>('Denko');
  const [customGasStation, setCustomGasStation] = useState<string>('');
  const [fuelIsFullTank, setFuelIsFullTank] = useState<boolean>(true);
  const [customStations, setCustomStations] = usePersistedState<string[]>('ngwe_custom_gas_stations', []);
  // [v7.5.95 U2] Custom units typed via 'အခြား', shared with
  // ShopCard / AddMaintenanceModal (same storage key).
  const [customUnits, setCustomUnits] = usePersistedState<string[]>('ngwe_custom_units', []);
  // [v7.6.24] The ONE list the unit selects read: the device-local
  // list merged with the shared public_units list (shared first).
  // The local persist below still keys off `customUnits` alone, so
  // the offline/guest fallback is unchanged.
  const knownUnits = useMemo(() => mergeSharedUnits(customUnits, sharedUnits), [customUnits, sharedUnits]);

  // Maintenance fields
  const [maintServiceType, setMaintServiceType] = useState<VehicleServiceType>('engine_oil');
  const [maintTitle, setMaintTitle] = useState<string>('');
  const [maintSparePartBrand, setMaintSparePartBrand] = useState<string>('');
  const [maintWorkshopName, setMaintWorkshopName] = useState<string>('');
  const [maintLifespanKm, setMaintLifespanKm] = useState<string>('5000');
  const [maintLifespanDays, setMaintLifespanDays] = useState<string>('180');
  const [maintExpiryDate, setMaintExpiryDate] = useState<string>('');

  // Tire fields
  const [tireFL, setTireFL] = useState<string>('32');
  const [tireFR, setTireFR] = useState<string>('32');
  const [tireRL, setTireRL] = useState<string>('32');
  const [tireRR, setTireRR] = useState<string>('32');

  const [vehicleOdometer, setVehicleOdometer] = useState<string>('');
  // [v7.5.55] Validation message shown inside the form (never a silent return).
  const [formError, setFormError] = useState('');
  // [v7.5.60 S15] Pending income↔expense switch that needs the user's
  // confirmation when editing. revertCategoryId is set only for the
  // automatic switch (category pick) — cancelling restores that
  // category; clearCategoryOnConfirm is set for a manual switch whose
  // old category belongs to the other type (it is cleared on confirm).
  const [pendingTypeChange, setPendingTypeChange] = useState<{
    newType: TransactionType;
    revertCategoryId?: string;
    revertSubCategoryId?: string;
    clearCategoryOnConfirm?: boolean;
  } | null>(null);
  // [v7.5.60 S10] Backfill confirm (replaces window.confirm): the submit
  // awaits this promise; the dialog below resolves it.
  const [backfillPrompt, setBackfillPrompt] = useState<{
    message: string;
    resolve: (ok: boolean) => void;
  } | null>(null);
  // [v7.5.55] Public-shop publish opt-in (B8): default UNCHECKED.
  const [publishShopOptIn, setPublishShopOptIn] = useState(false);

  const { user } = useAuth();
  const selectedWallet = useMemo(() => wallets.find((w) => w.id === walletId) || wallets[0], [wallets, walletId]);
  // [v7.6.31] The entry pickers show only the categories this wallet
  // allows (its denylist). The form's CURRENT category and every
  // split row's category are always included, so editing a record
  // whose category is hidden in this wallet never strands it, and
  // switching wallets mid-form never drops the picked category.
  // No wallet selected yet -> every category. Vehicle/transfer
  // forms set their category programmatically (handleSwitchModel /
  // cat_transfer, never hidden) — this list only feeds the pickers
  // and filteredCats below.
  const visibleCategories = useMemo(
    () =>
      getVisibleCategories(categories, selectedWallet, [
        categoryId,
        ...splitRows.map((r) => r.categoryId),
      ]),
    [categories, selectedWallet, categoryId, splitRows],
  );
  const walletPerms = useMemo(() => getCollaboratorPermissions(selectedWallet, user?.email, user?.uid), [selectedWallet, user]);

  const isEditing = Boolean(editTransaction);
  const canAddIncome = walletPerms.canAddIncome;
  const canAddExpense = walletPerms.canAddExpense;
  const canEditIncome = walletPerms.canEditIncome;
  const canEditExpense = walletPerms.canEditExpense;

  const isActionAllowed = isEditing
    ? (type === 'income' ? canEditIncome : canEditExpense)
    : (type === 'income' ? canAddIncome : canAddExpense);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const isNewlyOpened = isOpen && !prevIsOpenRef.current;
    const isEditTxChanged = editTransaction?.id !== prevEditTxIdRef.current;
    prevIsOpenRef.current = isOpen;
    prevEditTxIdRef.current = editTransaction?.id;

    if (isOpen) {
      if (formRef.current) formRef.current.scrollTop = 0;
      // [v7.6.03] A fresh open gets a fresh one-time auto-select.
      if (isNewlyOpened) {
        autoSelectDoneRef.current = false;
        autoSelectedRef.current = false;
        // [v7.6.44] Fresh open = fresh category intent (the
        // edit-restore below re-locks when a record's own category
        // is restored).
        categoryExplicitRef.current = false;
      }
      if (editTransaction) {
        if (isNewlyOpened || isEditTxChanged) {
          Object.values(shoppingAmountTimersRef.current).forEach(clearTimeout);
          shoppingAmountTimersRef.current = {};
          shoppingLastEditedRef.current = {};
          setType(editTransaction.type);
          setAmount(String(editTransaction.amount));
          setCategoryId(editTransaction.category || '');
          setSubCategoryId(editTransaction.subCategoryId || '');
          // [v7.6.44] The restored category is the record's own
          // explicit category for this session: typing a new item
          // name must not switch it away.
          categoryExplicitRef.current = !!(editTransaction.category);
          // [v7.6.07] A split record restores its rows (section on);
          // an unsplit record restores exactly as today (section off).
          const restoredSplits = splitRowsFromTransaction(editTransaction);
          setSplitEnabled(restoredSplits !== null);
          setSplitRows(restoredSplits || []);
          setWalletId(editTransaction.walletId || wallets[0]?.id || 'cash');
          setDate(getLocalDateString(editTransaction.date));
          const fullNote = editTransaction.note || '';
          // [v7.6.25] One form: the name / extra-note split is computed
          // once as locals — the same values feed itemName state AND
          // the single-row restore below, so a legacy unit_qty record
          // without items[] restores the exact name the old unit_qty
          // branch showed.
          let parsedItemName = '';
          let parsedExtraNote = fullNote;
          if (editTransaction.items && editTransaction.items.length > 0) {
            if (editTransaction.unitPrice) {
              parsedItemName = editTransaction.items[0].name || '';
            }
          } else {
            const match = fullNote.match(/^(.*) \((.*)\)$/);
            if (match) {
              parsedItemName = match[1].trim();
              parsedExtraNote = match[2].trim();
            } else {
              parsedItemName = fullNote;
              parsedExtraNote = '';
            }
          }
          setItemName(parsedItemName);
          setExtraNote(parsedExtraNote);
          // [v7.5.55] Prefill the shop name on edit — never clear it.
          setShopName(editTransaction.shopName || '');
          setShopInput(editTransaction.shopName || '');
          setPublishShopOptIn(false);
          const resolvedModel = getResolvedModel();
          setEntryModel(resolvedModel);
          if (resolvedModel === 'fuel') {
            setIsVehicleLinkEnabled(true);
            setVehicleLogType('fuel');
          } else if (resolvedModel === 'tire_pressure') {
            // [v7.5.53] Editing a tire-pressure log: PSI values are prefilled
            // from the linked log below (linkedTire).
            setIsVehicleLinkEnabled(true);
            setVehicleLogType('tire');
          } else if (resolvedModel === 'vehicle_service') {
            setIsVehicleLinkEnabled(true);
            setVehicleLogType('maintenance');
          } else {
            setIsVehicleLinkEnabled(false);
          }

          const linkedFuel = fuelLogs.find((f) => f.transactionId === editTransaction.id);
          const linkedMaint = vehicleMaintenance.find((m) => m.transactionId === editTransaction.id);
          const linkedTire = tirePressureLogs.find((tp) => tp.transactionId === editTransaction.id);
          const linkedLog = linkedFuel || linkedMaint || linkedTire;

          if (linkedLog) {
            setVehicleId(linkedLog.vehicleId || '');
            if (linkedLog.odometer) setVehicleOdometer(String(linkedLog.odometer));
          }
          if (linkedFuel) {
            setFuelLiters(String(linkedFuel.liters || ''));
            setFuelPricePerLiter(String(linkedFuel.pricePerLiter || ''));
            setFuelType(linkedFuel.fuelType || 'Octane 92');
            setFuelIsFullTank(linkedFuel.isFullTank !== false);
            const station = linkedFuel.gasStation || '';
            if (station && !GAS_STATIONS.includes(station)) {
              setFuelGasStation('Other');
              setCustomGasStation(station);
            } else if (station) {
              setFuelGasStation(station);
              setCustomGasStation('');
            } else {
              setFuelGasStation('Denko');
              setCustomGasStation('');
            }
          }
          if (linkedMaint) {
            setMaintServiceType((linkedMaint.serviceType as VehicleServiceType) || 'engine_oil');
            setMaintTitle(linkedMaint.title || '');
            setMaintWorkshopName(linkedMaint.workshopName || '');
            setMaintSparePartBrand(linkedMaint.sparePartBrand || '');
            setMaintLifespanKm(String(linkedMaint.expectedLifespanKm || 5000));
            setMaintLifespanDays(String(linkedMaint.expectedLifespanDays || 180));
            // [v7.6.05] Restore the expiry date on edit. VehicleMaintenance
            // stores no expiry field — it is derived from date +
            // expectedLifespanDays (the same rule AddMaintenanceModal
            // already uses). Without this the license-renewal date
            // input opened empty and the required-date validation
            // blocked every re-save. Derived in LOCAL time from the
            // transaction date the form shows, so the expiry->days
            // effect round-trips to the stored days exactly. No
            // stored days -> '' (never invent an expiry).
            const maintDays = linkedMaint.expectedLifespanDays;
            if (typeof maintDays === 'number' && Number.isFinite(maintDays) && maintDays > 0) {
              const dateParts = getLocalDateString(editTransaction.date).split('-').map(Number);
              if (dateParts.length === 3 && dateParts.every((p) => !Number.isNaN(p))) {
                const expiry = new Date(dateParts[0], dateParts[1] - 1, dateParts[2] + maintDays);
                const ey = expiry.getFullYear();
                const em = String(expiry.getMonth() + 1).padStart(2, '0');
                const ed = String(expiry.getDate()).padStart(2, '0');
                setMaintExpiryDate(`${ey}-${em}-${ed}`);
              } else {
                setMaintExpiryDate('');
              }
            } else {
              setMaintExpiryDate('');
            }
          } else if (resolvedModel === 'vehicle_service') {
            // [v7.6.05] No linked maintenance record: clear any expiry
            // left over from a previous open instead of reusing it.
            setMaintExpiryDate('');
          }
          if (linkedTire) {
            // [v7.5.55] A motorcycle log stores frontPsi/rearPsi (not the
            // 4-wheel fields) — prefill FL/RL from those and clear FR/RR
            // so no spurious 4-wheel values leak onto a bike log.
            if (linkedTire.frontPsi !== undefined || linkedTire.rearPsi !== undefined) {
              setTireFL(String(linkedTire.frontPsi ?? 32));
              setTireRL(String(linkedTire.rearPsi ?? 32));
              setTireFR('');
              setTireRR('');
            } else {
              setTireFL(String(linkedTire.frontLeftPsi || 32));
              setTireFR(String(linkedTire.frontRightPsi || 32));
              setTireRL(String(linkedTire.rearLeftPsi || 32));
              setTireRR(String(linkedTire.rearRightPsi || 32));
            }
          }

          // [v7.6.25] One form: rows always restore from items[].
          // A legacy unit_qty record WITHOUT items[] (unitPrice /
          // quantity only) restores as ONE row with the same name,
          // price, quantity and unit the old unit_qty branch showed
          // (no stored unit -> the default unit, as before).
          // [v7.6.04] An old direct entry (no items, no unitPrice,
          // name folded into the note) restores as one row at qty 1
          // with the amount as its price and the default unit (the
          // note carries no unit).
          if (editTransaction.items && editTransaction.items.length > 0) {
            // [v7.5.93] Saved rows carry no `id` (validItems drops it),
            // so stamp one per row — row updates match by id, and
            // several id-less rows would all update at once. The
            // serviceType (when saved) rides along untouched; a missing
            // one falls back to the visit's main type at save time.
            setShoppingItems(editTransaction.items.map((it, i) => ({ ...it, id: it.id || `item_${Date.now()}_${i}` })));
          } else if (editTransaction.unitPrice) {
            setShoppingItems([{ id: 'item_1', name: parsedItemName, price: editTransaction.unitPrice, quantity: editTransaction.quantity || 1, amount: editTransaction.amount, unit: DEFAULT_MENU_UNIT }]);
          } else {
            setShoppingItems([{ id: 'item_1', name: parsedItemName, price: editTransaction.amount, quantity: 1, amount: editTransaction.amount, unit: DEFAULT_MENU_UNIT }]);
          }
          setNewSubName('');
        }
      } else if (isNewlyOpened) {
        shoppingLastEditedRef.current = {};
        const lastUsedWalletId = typeof localStorage !== 'undefined' ? localStorage.getItem('fortune_last_used_wallet_id') : null;
        let chosenWalletId =
          (initialWalletId && wallets.some((w) => w.id === initialWalletId))
            ? initialWalletId
            : (lastUsedWalletId && wallets.some((w) => w.id === lastUsedWalletId))
            ? lastUsedWalletId
            : (wallets[0]?.id || 'cash');

        setWalletId(chosenWalletId);

        const targetWallet = wallets.find((w) => w.id === chosenWalletId);
        const perms = getCollaboratorPermissions(targetWallet, user?.email, user?.uid);
        let resolvedType = initialType;
        if (initialType === 'expense' && !perms.canAddExpense && perms.canAddIncome) {
          resolvedType = 'income';
        } else if (initialType === 'income' && !perms.canAddIncome && perms.canAddExpense) {
          resolvedType = 'expense';
        }

        const resolvedModel = initialModel || 'general';
        setEntryModel(resolvedModel);
        if (resolvedModel === 'fuel') {
          resolvedType = 'expense';
          setIsVehicleLinkEnabled(true);
          setVehicleLogType('fuel');
          const vehCat = categories.find(
            (c) =>
              c.id === 'cat_vehicle' ||
              c.id === 'cat_vehicle_management' ||
              c.name.includes('ယာဉ်') ||
              (c.nameEn && c.nameEn.toLowerCase().includes('vehicle'))
          );
          if (vehCat) setCategoryId(vehCat.id);
          setSubCategoryId('sub_veh_fuel');
          if (activeVehicles.length > 0) {
            setVehicleId(activeVehicles[0].id);
            if (activeVehicles[0].fuelType) setFuelType(activeVehicles[0].fuelType);
            if (activeVehicles[0].currentOdometer) setVehicleOdometer(String(activeVehicles[0].currentOdometer));
            if (activeVehicles[0].walletId && wallets.some((w) => w.id === activeVehicles[0].walletId)) {
              chosenWalletId = activeVehicles[0].walletId;
              setWalletId(activeVehicles[0].walletId);
            }
          }
        } else if (resolvedModel === 'vehicle_service') {
          resolvedType = 'expense';
          setIsVehicleLinkEnabled(true);
          setVehicleLogType('maintenance');
          const vehCat = categories.find(
            (c) =>
              c.id === 'cat_vehicle' ||
              c.id === 'cat_vehicle_management' ||
              c.name.includes('ယာဉ်') ||
              (c.nameEn && c.nameEn.toLowerCase().includes('vehicle'))
          );
          if (vehCat) setCategoryId(vehCat.id);
          setSubCategoryId('sub_veh_maintenance');
          if (activeVehicles.length > 0) {
            setVehicleId(activeVehicles[0].id);
            if (activeVehicles[0].currentOdometer) setVehicleOdometer(String(activeVehicles[0].currentOdometer));
            if (activeVehicles[0].walletId && wallets.some((w) => w.id === activeVehicles[0].walletId)) {
              chosenWalletId = activeVehicles[0].walletId;
              setWalletId(activeVehicles[0].walletId);
            }
          }
        } else if (resolvedModel === 'tire_pressure') {
          // [v7.5.53] Tire-pressure entry opened with an initial model.
          resolvedType = 'expense';
          setIsVehicleLinkEnabled(true);
          setVehicleLogType('tire');
          const vehCat = categories.find(
            (c) =>
              c.id === 'cat_vehicle' ||
              c.id === 'cat_vehicle_management' ||
              c.name.includes('ယာဉ်') ||
              (c.nameEn && c.nameEn.toLowerCase().includes('vehicle'))
          );
          if (vehCat) setCategoryId(vehCat.id);
          setSubCategoryId('sub_veh_tire');
          if (activeVehicles.length > 0) {
            setVehicleId(activeVehicles[0].id);
            if (activeVehicles[0].currentOdometer) setVehicleOdometer(String(activeVehicles[0].currentOdometer));
            if (activeVehicles[0].walletId && wallets.some((w) => w.id === activeVehicles[0].walletId)) {
              chosenWalletId = activeVehicles[0].walletId;
              setWalletId(activeVehicles[0].walletId);
            }
          }
        } else {
          setIsVehicleLinkEnabled(false);
        }

        setType(resolvedType);
        setAmount('');
        if (resolvedModel === 'general') {
          setCategoryId('');
          setSubCategoryId('');
          setWalletId(chosenWalletId);
        } else {
          setWalletId(chosenWalletId);
        }
        setDate(getLocalDateString());
        setItemName('');
        setExtraNote('');
        setShopName('');
        setShopInput('');
        setPublishShopOptIn(false);
        setShoppingItems([{ id: 'item_1', name: '', price: 0, quantity: 1, amount: 0 }]);
        setSplitEnabled(false);
        setSplitRows([]);
        setNewSubName('');
        setVehicleOdometer('');
        // [v7.5.55] PSI resets to the 32 defaults on a new entry instead
        // of persisting across opens.
        setTireFL('32');
        setTireFR('32');
        setTireRL('32');
        setTireRR('32');
        setFuelLiters('');
        setFuelPricePerLiter('');
        setFuelGasStation('Denko');
        setCustomGasStation('');
        setMaintTitle('');
        setMaintWorkshopName('');
        // [v7.6.05] Clear the expiry date on a new entry — never reuse
        // the previous entry's date (same rule as AddMaintenanceModal).
        setMaintExpiryDate('');
      }
      setFormError('');
      setIsSubmitting(false);
      setPendingTypeChange(null);
      setBackfillPrompt(null);
    }
  }, [isOpen, editTransaction, initialType, initialWalletId, wallets, user, fuelLogs, vehicleMaintenance, tirePressureLogs]);

  const unifiedItemSuggestions = useMemo(() => {
    return getAllItemSuggestions(allTransactions, categories);
  }, [allTransactions, categories]);

  const updateShoppingItem = (id: string, field: keyof TransactionItem, val: any) => {
    setShoppingItems((prev) => {
      const updated = prev.map((item) => {
        if (item.id === id) {
          const newItem = { ...item, [field]: val };
          // [v7.6.25] One form: row-name typing filters the shared
          // item-name datalist, as the old single-item input did.
          if (field === 'name' && typeof val === 'string') setItemInput(val);
          if (field === 'name' && typeof val === 'string' && val.trim().length >= 1) {
            // [v7.6.44] F1: the category move is gated by
            // canAutoSwitchCategory — never away from an explicitly
            // picked category; matching still fills prices/suggestions.
            if (canAutoSwitchCategory(categoryId, categoryExplicitRef.current)) {
              const match = findMatchingItemInfo(val, unifiedItemSuggestions);
              if (match && match.categoryId) {
                setCategoryId(match.categoryId);
                if (match.subCategoryId) setSubCategoryId(match.subCategoryId);
              }
            }
          }
          const pNum = parseMyanmarNumber(newItem.price as any) || 0;
          const qNum = parseMyanmarNumber(newItem.quantity as any) || 0;
          const aNum = parseMyanmarNumber(newItem.amount as any) || 0;
          const last = shoppingLastEditedRef.current[id] || null;
          if (field === 'price') {
            if (last === 'qty') newItem.amount = Number((pNum * qNum).toFixed(2));
            else if (last === 'amount') { if (pNum > 0) newItem.quantity = Number((aNum / pNum).toFixed(2)); }
            else { if (qNum > 0) newItem.amount = Number((pNum * qNum).toFixed(2)); else if (pNum > 0 && aNum > 0) newItem.quantity = Number((aNum / pNum).toFixed(2)); }
            shoppingLastEditedRef.current[id] = 'price';
          } else if (field === 'quantity') {
            if (last === 'price') newItem.amount = Number((pNum * qNum).toFixed(2));
            else if (last === 'amount') { if (qNum > 0) newItem.price = Number((aNum / qNum).toFixed(2)); }
            else { if (pNum > 0) newItem.amount = Number((pNum * qNum).toFixed(2)); else if (qNum > 0 && aNum > 0) newItem.price = Number((aNum / qNum).toFixed(2)); }
            shoppingLastEditedRef.current[id] = 'qty';
          } else if (field === 'amount') {
            newItem.amount = aNum;
            if (shoppingAmountTimersRef.current[id]) clearTimeout(shoppingAmountTimersRef.current[id]);
            const capturedId = id;
            shoppingAmountTimersRef.current[id] = setTimeout(() => {
              setShoppingItems((prevItems) => prevItems.map((it) => {
                if (it.id !== capturedId) return it;
                const item = { ...it };
                const p = item.price || 0;
                const q = item.quantity || 0;
                const a = item.amount || 0;
                const lastNow = shoppingLastEditedRef.current[capturedId];
                if (lastNow === 'price') { if (p > 0) item.quantity = Number((a / p).toFixed(2)); }
                else if (lastNow === 'qty') { if (q > 0) item.price = Number((a / q).toFixed(2)); }
                else { if (p > 0) item.quantity = Number((a / p).toFixed(2)); else if (q > 0) item.price = Number((a / q).toFixed(2)); else { item.quantity = 1; item.price = a; } }
                return item;
              }));
            }, 500);
            shoppingLastEditedRef.current[id] = 'amount';
          }
          return newItem;
        }
        return item;
      });
      const totalSum = updated.reduce((sum, item) => sum + (item.amount || 0), 0);
      setAmount(totalSum > 0 ? String(totalSum) : '');
      return updated;
    });
  };

  const shoppingListContainerRef = useRef<HTMLDivElement>(null);
  const newlyAddedItemIdRef = useRef<string | null>(null);
  const [isShoppingPriceHistoryOpen, setIsShoppingPriceHistoryOpen] = useState(false);

  const addShoppingItemRow = (serviceType?: VehicleServiceType) => {
    const newId = `item_${Date.now()}`;
    newlyAddedItemIdRef.current = newId;
    setShoppingItems((prev) => [
      ...prev,
      // [v7.5.93] A vehicle row starts at the visit's CURRENT main
      // type; changing the main type later never rewrites a row.
      { id: newId, name: '', price: 0, quantity: 1, amount: 0, ...(serviceType ? { serviceType } : {}) },
    ]);
  };

  useEffect(() => {
    if (newlyAddedItemIdRef.current && shoppingListContainerRef.current) {
      const targetId = newlyAddedItemIdRef.current;
      const timer = setTimeout(() => {
        if (shoppingListContainerRef.current) {
          shoppingListContainerRef.current.scrollTo({ top: shoppingListContainerRef.current.scrollHeight, behavior: 'smooth' });
        }
        const inputElem = document.getElementById(`input-name-${targetId}`);
        if (inputElem) inputElem.focus();
        newlyAddedItemIdRef.current = null;
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [shoppingItems.length]);



  const getPastPriceForItem = (itemName: string) => {
    if (!itemName || itemName.trim().length < 1) return null;
    const found = findMatchingItemInfo(itemName, unifiedItemSuggestions);
    if (found && found.latestPrice > 0) {
      return {
        price: found.latestPrice,
        date: found.latestDate,
        totalAmount: found.latestPrice,
        quantity: 1,
        note: found.name,
        categoryId: found.categoryId,
        subCategoryId: found.subCategoryId,
      };
    }
    return null;
  };

  const removeShoppingItemRow = (id: string) => {
    setShoppingItems((prev) => {
      const filtered = prev.filter((i) => i.id !== id);
      const totalSum = filtered.reduce((sum, item) => sum + (item.amount || 0), 0);
      setAmount(totalSum > 0 ? String(totalSum) : '');
      return filtered.length > 0 ? filtered : [{ id: `item_${Date.now()}`, name: '', price: 0, quantity: 1, amount: 0 }];
    });
  };

  const autoGenerateShoppingNote = () => {
    const validItems = shoppingItems.filter((i) => i.name.trim());
    if (validItems.length === 0) return;
    // [v7.6.05] The generated note carries each item's unit, in the
    // same position as the quantity: `name x2 ခု (amount)`, or
    // `name ခု (amount)` at qty 1 (the x1 is omitted, as before).
    // displayMenuUnit canonicalizes old forms ('တစ်ခု' -> 'ခု')
    // and strips a mistaken leading number word from customs
    // ('တစ်ဗူး' -> 'ဗူး'); a missing/blank unit — or
    // the bare 'အခြား' sentinel (Other picked, nothing typed yet) —
    // contributes nothing, never an invented default. The shape is
    // otherwise unchanged, and only NEW notes are generated here:
    // saved notes are never rewritten.
    const summary = validItems.map((i) => {
      const rawUnit = typeof i.unit === 'string' ? i.unit.trim() : '';
      const unitSuffix = rawUnit && rawUnit !== OTHER_MENU_UNIT ? ` ${displayMenuUnit(rawUnit)}` : '';
      const qtyPart = i.quantity > 1 ? ` x${i.quantity}` : '';
      return `${i.name.trim()}${qtyPart}${unitSuffix} (${formatMMK(i.amount)})`;
    }).join(' + ');
    setExtraNote(summary);
  };

  const filteredCats = useMemo(() => {
    // [v7.6.31] Frequency-sorted candidates come from the WALLET-
    // VISIBLE list, not every category: a hidden category must not
    // become the effectiveCategoryId fallback below. The fallback
    // stays read-only (sub-category sort / suggestions); the
    // v7.6.14 explicitCatObj gate still decides vehicle mode, so a
    // fresh open with no category picked stays neutral even when
    // the first visible category is vehicle-related.
    const cats = visibleCategories.filter(
      (c) => c.type === type || c.id === 'cat_transfer' || (c.name && c.name.includes('ငွေလွှဲ')) || (c.nameEn && c.nameEn.toLowerCase().includes('transfer'))
    );
    const countMap = new Map<string, number>();
    if (allTransactions && allTransactions.length > 0) {
      allTransactions.forEach((t) => {
        if ((t.type === type || t.category === 'cat_transfer') && t.category) {
          countMap.set(t.category, (countMap.get(t.category) || 0) + 1);
        }
      });
    }
    return [...cats].sort((a, b) => {
      const countA = countMap.get(a.id) || 0;
      const countB = countMap.get(b.id) || 0;
      if (countB !== countA) return countB - countA;
      return (lang === 'my' ? a.name : a.nameEn).localeCompare(lang === 'my' ? b.name : b.nameEn);
    });
  }, [visibleCategories, type, allTransactions, lang]);

  const currentCat = categories.find((c) => c.id === categoryId);
  const isCurrentTransferCat = Boolean(
    currentCat && (currentCat.id === 'cat_transfer' || (currentCat.name && currentCat.name.includes('ငွေလွှဲ')) || (currentCat.nameEn && currentCat.nameEn.toLowerCase().includes('transfer')))
  );
  const effectiveCategoryId = categoryId ? categoryId : (filteredCats[0]?.id || '');
  const selectedCatObj = categories.find((c) => c.id === (categoryId || effectiveCategoryId));

  const isTransferCategory = useMemo(() => {
    if (!selectedCatObj) return false;
    const id = (selectedCatObj.id || '').toLowerCase();
    const name = (selectedCatObj.name || '').toLowerCase();
    const nameEn = (selectedCatObj.nameEn || '').toLowerCase();
    return id === 'cat_transfer' || id.includes('transfer') || name.includes('ငွေလွှဲ') || nameEn.includes('transfer');
  }, [selectedCatObj]);

  useEffect(() => {
    if (isTransferCategory) {
      if (subCategoryId === 'sub_tf_out' || subCategoryId.includes('out') || subCategoryId.includes('ထွက်')) {
        if (type !== 'expense') setType('expense');
      } else if (subCategoryId === 'sub_tf_in' || subCategoryId.includes('in') || subCategoryId.includes('ဝင်')) {
        if (type !== 'income') setType('income');
      }
    }
  }, [subCategoryId, isTransferCategory]);

  useEffect(() => {
    if (!isOpen) return;
    // [v7.6.03] A sub-category picked AFTER the one-time auto-select
    // still switches the model: the auto-selected model is
    // provisional until the user picks something. A switch only
    // happens when the sub-category's model differs from the
    // current one, so the auto-select's own sub-category write
    // cannot bounce the model back, and a manual switch clears
    // the auto-selected state.
    if (entryModel !== 'general' && !autoSelectedRef.current) return;
    if (!subCategoryId) return;
    if (subCategoryId === 'sub_veh_fuel') {
      if (entryModel !== 'fuel') {
        handleSwitchModel('fuel');
        autoSelectedRef.current = false;
        autoSelectDoneRef.current = true;
      }
    } else if (subCategoryId === 'sub_veh_tire') {
      // sub_veh_tire is shared by tire-pressure checks and tire
      // replacements: while in tire-pressure mode it already means
      // the current model (the auto-select's own write lands here),
      // so only a switch away from another model counts as a pick.
      if (entryModel !== 'tire_pressure' && !(entryModel === 'vehicle_service' && maintServiceType === 'tires')) {
        handleSwitchModel('vehicle_service');
        setMaintServiceType('tires');
        autoSelectedRef.current = false;
        autoSelectDoneRef.current = true;
      }
    } else if (subCategoryId === 'sub_veh_maintenance' || subCategoryId === 'sub_veh_parts' || subCategoryId === 'sub_veh_wash' || subCategoryId === 'sub_veh_license') {
      if (entryModel !== 'vehicle_service') {
        handleSwitchModel('vehicle_service');
        autoSelectedRef.current = false;
        autoSelectDoneRef.current = true;
      }
    }
  }, [isOpen, subCategoryId, entryModel]);

  useEffect(() => {
    if (maintExpiryDate && date) {
      const d1 = new Date(date).getTime();
      const d2 = new Date(maintExpiryDate).getTime();
      if (!isNaN(d1) && !isNaN(d2)) {
        const diff = Math.ceil((d2 - d1) / (1000 * 3600 * 24));
        setMaintLifespanDays(String(diff > 0 ? diff : 0));
      }
    }
  }, [maintExpiryDate, date]);

  useEffect(() => {
    if (isOpen && subCategoryId === 'sub_veh_license' && entryModel === 'vehicle_service' && maintServiceType !== 'license_renewal') {
      setMaintServiceType('license_renewal');
    }
  }, [isOpen, subCategoryId, entryModel]);

  const availableSubCats = useMemo(() => {
    const subs = selectedCatObj?.subCategories || [];
    if (!subs || subs.length === 0) return [];
    const subCountMap = new Map<string, number>();
    if (allTransactions && allTransactions.length > 0) {
      allTransactions.forEach((t) => {
        if (t.category === effectiveCategoryId && t.subCategoryId) {
          subCountMap.set(t.subCategoryId, (subCountMap.get(t.subCategoryId) || 0) + 1);
        }
      });
    }
    return [...subs].sort((a, b) => {
      const countA = subCountMap.get(a.id) || 0;
      const countB = subCountMap.get(b.id) || 0;
      if (countB !== countA) return countB - countA;
      return (lang === 'my' ? a.name : a.nameEn).localeCompare(lang === 'my' ? b.name : b.nameEn);
    });
  }, [selectedCatObj, allTransactions, effectiveCategoryId, lang]);

  // [v7.6.14] Explicit-category gating: vehicle mode engages only
  // from the category the user actually picked (categoryId). The
  // fallback inside selectedCatObj (first / most-used category)
  // must never engage a mode: on a fresh open categoryId is '' and
  // the form stays neutral / general until a vehicle category is
  // picked. selectedCatObj / effectiveCategoryId keep the fallback
  // for their read-only consumers (sub-category sort, suggestions).
  const explicitCatObj = categoryId ? categories.find((c) => c.id === categoryId) : undefined;
  const isVehicleRelatedCategory = useMemo(() => {
    if (type !== 'expense' || !explicitCatObj) return false;
    const id = (explicitCatObj.id || '').toLowerCase();
    const name = (explicitCatObj.name || '').toLowerCase();
    const nameEn = (explicitCatObj.nameEn || '').toLowerCase();
    const subIds = (explicitCatObj.subCategories || []).map((s) => (s.id || '').toLowerCase());
    const subNames = (explicitCatObj.subCategories || []).map((s) => (s.name || '').toLowerCase());
    const hasVehicleSub = subIds.some((sid) => sid.startsWith('sub_veh_')) || subNames.some((sn) => sn.includes('ဆီဖိုး') || sn.includes('ဆီ') || sn.includes('မော်တော်') || sn.includes('အင်ဂျင်ဝိုင်'));
    if (hasVehicleSub) return true;
    return id === 'cat_vehicle' || id === 'cat_vehicle_management' || id === 'cat_expense_car' || id === 'cat_transport' || id.includes('vehicle') || id.includes('fuel') || name.includes('ယာဉ်') || name.includes('ကား') || name.includes('စက်သုံးဆီ') || name.includes('ဆီဖိုး') || nameEn.includes('vehicle') || nameEn.includes('fuel') || nameEn.includes('petrol') || nameEn.includes('transport');
  }, [type, explicitCatObj]);

  const showModelSelector = useMemo(() => {
    return isVehicleRelatedCategory || initialModel === 'fuel' || initialModel === 'vehicle_service';
  }, [isVehicleRelatedCategory, initialModel]);

  useEffect(() => {
    if (!showModelSelector && entryModel !== 'general') {
      setEntryModel('general');
      setIsVehicleLinkEnabled(false);
    }
  }, [showModelSelector, entryModel]);

  // [v7.6.14] Fresh-open vehicle mode: the 4 tiles below are the
  // sole vehicle-type selector, so the top dropdown Bar and the
  // Mode chip row hide while one is engaged. Edit mode is
  // excluded (the Bar / chip stay the edit path), and the general
  // state is excluded (the Bar stays the entry point there).
  const inFreshVehicleMode = !isEditing && entryModel !== 'general' && isVehicleRelatedCategory;

  const handleSwitchModel = (newModel: EntryModel) => {
    setEntryModel(newModel);
    if (newModel === 'fuel') {
      setType('expense');
      setIsVehicleLinkEnabled(true);
      setVehicleLogType('fuel');
      const vehCat = categories.find((c) => c.id === 'cat_vehicle' || c.id === 'cat_vehicle_management' || c.name.includes('ယာဉ်') || (c.nameEn && c.nameEn.toLowerCase().includes('vehicle')));
      if (vehCat) setCategoryId(vehCat.id);
      setSubCategoryId('sub_veh_fuel');
      if (activeVehicles.length > 0) {
        if (!vehicleId) {
          setVehicleId(activeVehicles[0].id);
          if (activeVehicles[0].fuelType) setFuelType(activeVehicles[0].fuelType);
          if (activeVehicles[0].currentOdometer) setVehicleOdometer(String(activeVehicles[0].currentOdometer));
        } else {
          const target = vehicles.find((x) => x.id === vehicleId);
          if (target) {
            if (target.fuelType && !fuelType) setFuelType(target.fuelType);
            if (target.currentOdometer && !vehicleOdometer) setVehicleOdometer(String(target.currentOdometer));
          }
        }
      }
    } else if (newModel === 'vehicle_service') {
      setType('expense');
      setIsVehicleLinkEnabled(true);
      setVehicleLogType('maintenance');
      const vehCat = categories.find((c) => c.id === 'cat_vehicle' || c.id === 'cat_vehicle_management' || c.name.includes('ယာဉ်') || (c.nameEn && c.nameEn.toLowerCase().includes('vehicle')));
      if (vehCat) setCategoryId(vehCat.id);
      if (!subCategoryId || subCategoryId === 'sub_veh_fuel') setSubCategoryId('sub_veh_maintenance');
      if (activeVehicles.length > 0) {
        if (!vehicleId) {
          setVehicleId(activeVehicles[0].id);
          if (activeVehicles[0].currentOdometer) setVehicleOdometer(String(activeVehicles[0].currentOdometer));
        } else {
          const target = vehicles.find((x) => x.id === vehicleId);
          if (target && target.currentOdometer && !vehicleOdometer) setVehicleOdometer(String(target.currentOdometer));
        }
      }
    } else if (newModel === 'tire_pressure') {
      // [v7.5.53] Tire-pressure check from the + form: the PSI fields and
      // the tire save branch (vehicleLogType 'tire') were already in the
      // code, but no button ever selected this model — it was unreachable.
      setType('expense');
      setIsVehicleLinkEnabled(true);
      setVehicleLogType('tire');
      const vehCat = categories.find((c) => c.id === 'cat_vehicle' || c.id === 'cat_vehicle_management' || c.name.includes('ယာဉ်') || (c.nameEn && c.nameEn.toLowerCase().includes('vehicle')));
      if (vehCat) setCategoryId(vehCat.id);
      setSubCategoryId('sub_veh_tire');
      if (activeVehicles.length > 0) {
        if (!vehicleId) {
          setVehicleId(activeVehicles[0].id);
          if (activeVehicles[0].currentOdometer) setVehicleOdometer(String(activeVehicles[0].currentOdometer));
        } else {
          const target = vehicles.find((x) => x.id === vehicleId);
          if (target && target.currentOdometer && !vehicleOdometer) setVehicleOdometer(String(target.currentOdometer));
        }
      }
    } else {
      setIsVehicleLinkEnabled(false);
    }
  };

  // [v7.6.14] Toggle-off: tapping the already-selected vehicle tile
  // returns to a neutral general entry — the vehicle link is
  // disabled and the category / sub-category are cleared, so the
  // category row shows its empty placeholder and the tiles hide
  // (their gate needs entryModel off 'general'). The ref guards
  // are set exactly as the other tile taps set them, so the
  // one-time auto-select cannot re-engage on this open. Vehicle
  // field values are left as-is, like the Mode chip's close
  // button: a general-mode save cannot use them (the save path
  // builds a vehicle payload only for a vehicle entryModel, and
  // with no category it asks for one instead).
  const toggleOffVehicleMode = () => {
    setEntryModel('general');
    setIsVehicleLinkEnabled(false);
    setCategoryId('');
    setSubCategoryId('');
    // [v7.6.44] F1: leaving vehicle mode clears the category, so the
    // explicit lock goes with it.
    categoryExplicitRef.current = false;
    autoSelectedRef.current = false;
    autoSelectDoneRef.current = true;
  };

  // [v7.6.03] One-time auto-select of the most-used vehicle entry
  // type. Fires at most once per fresh open (autoSelectDoneRef):
  // new entry only, no explicit initialModel, a vehicle-related
  // category, and still on 'general'. It also fires when the user
  // picks the vehicle category after opening, since the effective
  // category only becomes vehicle-related then. No history at all
  // leaves 'general' untouched. The switch goes through
  // handleSwitchModel, exactly like a tile tap (tires also sets
  // maintServiceType, like the tire tile). Explicit picks always
  // win: the tile / top-menu handlers clear the auto-selected
  // state, and this effect never runs again once considered.
  // Placed after handleSwitchModel / isVehicleRelatedCategory:
  // the dependency array is evaluated during render, so every
  // name in it must already be declared.
  useEffect(() => {
    if (!isOpen || isEditing) return;
    if (initialModel && initialModel !== 'general') return;
    if (autoSelectDoneRef.current) return;
    if (entryModel !== 'general') return;
    if (!isVehicleRelatedCategory) return;
    autoSelectDoneRef.current = true;
    const choice = resolveMostUsedVehicleEntry({
      fuelLogs,
      vehicleMaintenance,
      tirePressureLogs,
      transactions: allTransactions,
    });
    if (!choice) return;
    autoSelectedRef.current = true;
    if (choice === 'fuel') {
      handleSwitchModel('fuel');
    } else if (choice === 'tire_pressure') {
      handleSwitchModel('tire_pressure');
    } else {
      handleSwitchModel('vehicle_service');
      if (choice === 'tires') setMaintServiceType('tires');
    }
  }, [isOpen, isEditing, initialModel, entryModel, isVehicleRelatedCategory, fuelLogs, vehicleMaintenance, tirePressureLogs, allTransactions]);

  const filteredShopsForDatalist = useMemo(() => {
    if (!shopInput.trim()) return shops.slice(0, 5).concat(publicShops.slice(0, 5) as any);
    const q = shopInput.toLowerCase();
    return [
      ...shops.filter((s) => s.name.toLowerCase().includes(q)),
      ...publicShops.filter((s) => s.name.toLowerCase().includes(q) && !shops.some((ps) => ps.name === s.name))
    ].slice(0, 5);
  }, [shopInput, shops, publicShops]);

  // [v7.6.41] Same shop list as the entry shop field, for one split
  // row's typed text: the top 5 matches when text is typed, the
  // first 5 shops when the row's shop field is blank. A plain
  // function (not a memo) — one per row, keyed on that row's text.
  const shopSuggestionsFor = (query: string) => {
    if (!query.trim()) return shops.slice(0, 5).concat(publicShops.slice(0, 5) as any);
    const q = query.toLowerCase();
    return [
      ...shops.filter((s) => s.name.toLowerCase().includes(q)),
      ...publicShops.filter((s) => s.name.toLowerCase().includes(q) && !shops.some((ps) => ps.name === s.name))
    ].slice(0, 5);
  };

  // [v7.5.55] True when the typed shop name is not in the private or
  // public directory — only then is the publish opt-in shown.
  const isNewShopName = useMemo(() => {
    const clean = shopName.trim();
    if (!clean) return false;
    const lower = clean.toLowerCase();
    return (
      !shops.some((s) => s.name.trim().toLowerCase() === lower) &&
      !publicShops.some((s) => s.name.trim().toLowerCase() === lower)
    );
  }, [shopName, shops, publicShops]);

  const filteredItemsForDatalist = useMemo(() => {
    if (!itemInput.trim()) return unifiedItemSuggestions.slice(0, 5);
    const q = itemInput.toLowerCase();
    return unifiedItemSuggestions.filter((i) => i.name.toLowerCase().includes(q)).slice(0, 5);
  }, [itemInput, unifiedItemSuggestions]);

  const isFuelMode = useMemo(() => entryModel === 'fuel', [entryModel]);
  
  const lastFuelLogForComparison = useMemo(() => {
    if (!fuelLogs || fuelLogs.length === 0) return null;
    const sorted = fuelLogs
      .filter(l => l.vehicleId === vehicleId && l.transactionId !== editTransaction?.id)
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA !== dateB) return dateB - dateA;
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
    let match = sorted.find(l => l.gasStation === fuelGasStation && l.fuelType === fuelType);
    if (!match) match = sorted.find(l => l.fuelType === fuelType);
    if (!match) match = sorted[0];
    return match || null;
  }, [fuelLogs, vehicleId, fuelGasStation, fuelType]);

  const currentVehicle = useMemo(() => {
    return vehicles.find((v) => v.id === vehicleId) || activeVehicles[0];
  }, [vehicles, vehicleId]);

  // [v7.5.55] Select options: active vehicles, plus the currently selected
  // one even if it was deactivated (so editing a record linked to it
  // still shows it).
  const vehicleSelectOptions = useMemo(() => {
    const selected = vehicles.find((v) => v.id === vehicleId);
    if (selected && selected.isActive === false && !activeVehicles.some((v) => v.id === selected.id)) {
      return [...activeVehicles, selected];
    }
    return activeVehicles;
  }, [vehicles, activeVehicles, vehicleId]);

  const lastMaintLogForComparison = useMemo(() => {
    if (!vehicleMaintenance || vehicleMaintenance.length === 0) return null;
    const sorted = vehicleMaintenance
      .filter(m => m.vehicleId === vehicleId && m.transactionId !== editTransaction?.id)
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA !== dateB) return dateB - dateA;
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
    let match = sorted.find(m => m.serviceType === maintServiceType);
    if (!match) match = sorted[0];
    return match || null;
  }, [vehicleMaintenance, vehicleId, maintServiceType]);

  useEffect(() => {
    if (isFuelMode) {
      setIsVehicleLinkEnabled(true);
      setVehicleLogType('fuel');
      if (activeVehicles.length > 0) {
        if (!vehicleId) {
          const target = activeVehicles[0];
          setVehicleId(target.id);
          if (target.fuelType) setFuelType(target.fuelType);
          if (target.currentOdometer) setVehicleOdometer(String(target.currentOdometer));
        } else {
          const target = vehicles.find((v) => v.id === vehicleId);
          if (target) {
            if (target.fuelType && !fuelType) setFuelType(target.fuelType);
            if (target.currentOdometer && !vehicleOdometer) setVehicleOdometer(String(target.currentOdometer));
          }
        }
      }
    }
  }, [isFuelMode, vehicles, vehicleId, fuelType, vehicleOdometer]);

  useEffect(() => {
    if (!isOpen) return;
    if (vehicleId) return;
    if (activeVehicles.length === 0) return;
    setVehicleId(activeVehicles[0].id);
  }, [isOpen, vehicleId, vehicles]);

  interface MatchedPreviousPurchase {
    amount: number; date: string; matchedName: string; matchType: 'item' | 'note' | 'subcategory' | 'category'; originalTxId?: string; note?: string;
  }

  // [v7.6.44] The previous-purchase / price-comparison hints scan
  // ALL past transactions (sort + up to three full passes per
  // keystroke). They read DEFERRED snapshots of the rows: typing
  // echoes urgently from the live state, and the hints catch up
  // without blocking the keystroke. The row inputs themselves keep
  // reading the urgent state, so echo and save behaviour are
  // unchanged; only the hint derivation is deferred.
  const deferredShoppingItems = useDeferredValue(shoppingItems);
  const deferredItemName = useDeferredValue(itemName);

  const latestPreviousPurchase = useMemo<MatchedPreviousPurchase | null>(() => {
    if (!isOpen || type !== 'expense' || !allTransactions || allTransactions.length === 0) return null;
    if (deferredShoppingItems.length > 1) return null;
    const currentTxId = editTransaction?.id;
    const cleanItemName = deferredItemName.trim();
    const cleanItemNameLower = cleanItemName.toLowerCase();
    const selectedSub = selectedCatObj?.subCategories?.find((s) => s.id === subCategoryId);
    const subName = selectedSub?.name?.trim() || '';
    const subNameLower = subName.toLowerCase();
    const pastExpenseTxs = allTransactions.filter((t) => t.id !== currentTxId && t.type === 'expense').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (pastExpenseTxs.length === 0) return null;
    const targetItemName = deferredShoppingItems[0]?.name?.trim() ? deferredShoppingItems[0].name.trim() : cleanItemName;
    const targetItemLower = targetItemName.toLowerCase();
    if (targetItemLower.length >= 1) {
      for (const tx of pastExpenseTxs) {
        if (tx.items && tx.items.length > 0) {
          const matchedItem = tx.items.find((it) => it.name && it.name.trim().toLowerCase() === targetItemLower);
          if (matchedItem) {
            const unitPrice = matchedItem.price > 0 ? matchedItem.price : matchedItem.quantity > 0 && matchedItem.amount ? Math.round(matchedItem.amount / matchedItem.quantity) : matchedItem.amount || 0;
            if (unitPrice > 0) return { amount: unitPrice, date: tx.date, matchedName: matchedItem.name.trim(), matchType: 'item', originalTxId: tx.id, note: matchedItem.name };
          }
        }
      }
      for (const tx of pastExpenseTxs) {
        if (tx.note && (tx.note.trim().toLowerCase() === targetItemLower || tx.note.trim().toLowerCase().startsWith(targetItemLower))) {
          const unitPrice = tx.unitPrice && tx.unitPrice > 0 ? tx.unitPrice : tx.amount || 0;
          if (unitPrice > 0) return { amount: unitPrice, date: tx.date, matchedName: tx.note.trim(), matchType: 'note', originalTxId: tx.id, note: tx.note };
        }
      }
      for (const tx of pastExpenseTxs) {
        if (tx.subCategoryId) {
          const cat = categories.find((c) => c.id === tx.category);
          const sub = cat?.subCategories?.find((s) => s.id === tx.subCategoryId);
          if (sub && sub.name.trim().toLowerCase() === targetItemLower && tx.amount > 0) {
            return { amount: tx.amount, date: tx.date, matchedName: sub.name.trim(), matchType: 'item', originalTxId: tx.id, note: tx.note || sub.name };
          }
        }
      }
      const foundInSuggestions = findMatchingItemInfo(targetItemName, unifiedItemSuggestions);
      if (foundInSuggestions && foundInSuggestions.latestPrice > 0) {
        return { amount: foundInSuggestions.latestPrice, date: foundInSuggestions.latestDate || getLocalDateString(), matchedName: foundInSuggestions.name, matchType: 'item', note: foundInSuggestions.name };
      }
      const isGenericOrSubMatch = !targetItemLower || targetItemLower === subNameLower;
      if (!isGenericOrSubMatch) return null;
    }
    if (subCategoryId) {
      for (const tx of pastExpenseTxs) {
        if (tx.subCategoryId === subCategoryId && tx.amount > 0) {
          return { amount: tx.amount, date: tx.date, matchedName: subName || 'Sub-Category', matchType: 'subcategory', originalTxId: tx.id, note: tx.note || subName };
        }
      }
    }
    if (!subCategoryId && targetItemLower.length === 0 && effectiveCategoryId) {
      for (const tx of pastExpenseTxs) {
        if (tx.category === effectiveCategoryId && !tx.subCategoryId && tx.amount > 0) {
          return { amount: tx.amount, date: tx.date, matchedName: selectedCatObj?.name || 'Category', matchType: 'category', originalTxId: tx.id, note: tx.note };
        }
      }
    }
    return null;
  }, [isOpen, type, allTransactions, editTransaction, deferredShoppingItems, deferredItemName, subCategoryId, selectedCatObj, effectiveCategoryId, categories, unifiedItemSuggestions]);

  // [v7.6.25] One form: the compared price is the single row's unit
  // price (transfers and multi-row entries compare the total, as
  // before — the hint is suppressed for multi-row lists anyway).
  const currentEffectivePrice = useMemo(() => (entryModel === 'general' && !isTransferCategory && shoppingItems.length === 1 ? parseMyanmarNumber(shoppingItems[0].price as any) || 0 : parseMyanmarNumber(amount) || 0), [entryModel, isTransferCategory, shoppingItems, amount]);

  const priceComparison = useMemo(() => {
    if (!isOpen || !latestPreviousPurchase || currentEffectivePrice <= 0) return null;
    const diff = currentEffectivePrice - latestPreviousPurchase.amount;
    const percent = latestPreviousPurchase.amount > 0 ? (diff / latestPreviousPurchase.amount) * 100 : 0;
    return { diff, percent, isHigher: diff > 0, isLower: diff < 0, isEqual: diff === 0 };
  }, [isOpen, latestPreviousPurchase, currentEffectivePrice]);

  const handleApplyPreviousPrice = () => {
    if (!latestPreviousPurchase) return;
    const p = latestPreviousPurchase.amount;
    // [v7.6.25] One form: applying a previous price sets the single
    // row's price (the row math drives the total, as the old
    // single-item branch did); transfers fall back to the total.
    if (entryModel === 'general' && !isTransferCategory && shoppingItems.length === 1 && shoppingItems[0].id) {
      updateShoppingItem(shoppingItems[0].id, 'price', String(p));
    } else {
      setAmount(String(p));
    }
  };

  // [v7.5.60 S15] Remember the last category whose type matches the
  // current type, so cancelling a type-switch confirm can restore it.
  const lastMatchingCatRef = useRef<{ categoryId: string; subCategoryId: string }>({ categoryId, subCategoryId });
  useEffect(() => {
    if (selectedCatObj && selectedCatObj.type === type) {
      lastMatchingCatRef.current = { categoryId, subCategoryId };
    }
  }, [categoryId, subCategoryId, type, selectedCatObj]);

  useEffect(() => {
    if (!isOpen) return;
    if (!selectedCatObj) return;
    if (isTransferCategory) return;
    if (pendingTypeChange) return;
    const catType = selectedCatObj.type;
    if (catType && type !== catType) {
      // [v7.5.60 S15] A category pick must never silently flip
      // income↔expense on an edit — ask first (the segmented control
      // below makes the flip visible; this confirm guards the edit).
      // A new entry just switches (the control shows it happening).
      if (isEditing) {
        setPendingTypeChange({
          newType: catType,
          revertCategoryId: lastMatchingCatRef.current.categoryId,
          revertSubCategoryId: lastMatchingCatRef.current.subCategoryId,
        });
      } else {
        setType(catType);
      }
    }
  }, [isOpen, selectedCatObj?.id, isTransferCategory, type, isEditing, pendingTypeChange]);

  if (!isOpen) return null;

  const handleAddAmount = (add: number) => {
    const current = parseMyanmarNumber(amount) || 0;
    setAmount((current + add).toString());
  };

  // [v7.5.60 M4/S15] Manual income/expense switch from the segmented
  // control. A category of the other type cannot stay on the record:
  // on a new entry it is cleared at once; on an edit the user is asked
  // first (confirm clears it, cancel keeps everything as it was).
  // Vehicle models force expense, so the control is disabled there.
  const handleTypeChange = (newType: TransactionType) => {
    if (newType === type || entryModel !== 'general') return;
    const curCat = categories.find((c) => c.id === categoryId);
    if (curCat && curCat.type !== newType) {
      if (isEditing) {
        setPendingTypeChange({ newType, clearCategoryOnConfirm: true });
        return;
      }
      setCategoryId('');
      setSubCategoryId('');
      // [v7.6.44] F1: the type switch cleared the category, so the
      // explicit lock goes with it — typing may auto-switch again
      // until the user picks in the new type.
      categoryExplicitRef.current = false;
    }
    setType(newType);
  };

  const confirmTypeChange = () => {
    if (!pendingTypeChange) return;
    setType(pendingTypeChange.newType);
    if (pendingTypeChange.clearCategoryOnConfirm) {
      setCategoryId('');
      setSubCategoryId('');
      // [v7.6.44] F1: confirmed clear, same as the direct switch above.
      categoryExplicitRef.current = false;
    }
    setPendingTypeChange(null);
  };

  const cancelTypeChange = () => {
    if (pendingTypeChange?.revertCategoryId !== undefined) {
      setCategoryId(pendingTypeChange.revertCategoryId);
      setSubCategoryId(pendingTypeChange.revertSubCategoryId || '');
    }
    setPendingTypeChange(null);
  };

  // [v7.5.60 S10] Backfill confirm as a promise the submit awaits —
  // replaces window.confirm (the dialog below resolves it).
  const askBackfill = (odoNum: number, currentOdo: number): Promise<boolean> =>
    new Promise((resolve) => {
      setBackfillPrompt({
        message: lang === 'my'
          ? `မိုင်တာ (${odoNum.toLocaleString()}) သည် လက်ရှိ မိုင်တာ (${currentOdo.toLocaleString()}) ထက် နည်းနေပါသည်။ အဟောင်းမှတ်တမ်း ပြန်ဖြည့်တာလား?`
          : `Odometer (${odoNum.toLocaleString()}) is lower than the current odometer (${currentOdo.toLocaleString()}). Is this a missed older entry?`,
        resolve,
      });
    });

  // [v7.5.60 E-S73] Near-duplicate item name? Typing "ဆန်" when
  // "ဆန်(ပေါင်း)" already exists should suggest the existing name, so
  // inconsistent spellings stop breaking price comparison. Returns null
  // when the typed name already matches an existing item exactly.
  const findSimilarItemName = (typed: string): UnifiedItemInfo | null => {
    const norm = normalizeItemName(typed);
    if (!norm.key || norm.key.length < 2) return null;
    if (unifiedItemSuggestions.some((s) => s.normalizedName === norm.key)) return null;
    const lev = (a: string, b: string): number => {
      const m = a.length;
      const n = b.length;
      if (Math.abs(m - n) > 2) return 99;
      const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
      for (let j = 0; j <= n; j++) dp[0][j] = j;
      for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,
            dp[i][j - 1] + 1,
            dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
          );
        }
      }
      return dp[m][n];
    };
    return (
      unifiedItemSuggestions.find(
        (s) =>
          s.normalizedName.startsWith(norm.key) ||
          norm.key.startsWith(s.normalizedName) ||
          s.normalizedName.includes(norm.key) ||
          norm.key.includes(s.normalizedName) ||
          lev(s.normalizedName, norm.key) <= 2
      ) || null
    );
  };

  const handleCreateQuickSub = () => {
    if (!newSubName.trim()) return;
    if (plan !== 'premium') { onOpenUpgrade(); return; }
    if (onAddSubCategory && effectiveCategoryId) {
      onAddSubCategory(effectiveCategoryId, { name: newSubName.trim(), nameEn: newSubName.trim(), isCustom: true });
      setNewSubName('');
    }
  };

  // [v7.6.07] Split-section helpers. The section is offered only
  // for general non-transfer entries — never for vehicle entries,
  // and never for transfers (a transfer's category is the transfer
  // category itself). [v7.6.25] The unit_qty gate is gone: the one
  // form's rows drive the shared amount input, so the remaining
  // indicator reads the same row-sum total.
  const splitSectionVisible = entryModel === 'general' && !isTransferCategory;
  // Live total for the remaining indicator: the shared amount input
  // is driven live by the item rows (updateShoppingItem).
  const splitTotalAmount = parseMyanmarNumber(amount) || 0;
  const splitRowsTotal = rowsToSplits(splitRows).reduce((sum, s) => sum + s.amount, 0);
  const splitRemaining = splitSectionVisible && splitEnabled ? splitRemainder(splitTotalAmount, rowsToSplits(splitRows)) : 0;

  const toggleSplitSection = (on: boolean) => {
    setSplitEnabled(on);
    if (on) {
      setSplitRows(defaultSplitRows(categoryId, subCategoryId));
    }
  };

  const updateSplitRow = (index: number, patch: Partial<SplitFormRow>) => {
    setSplitRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
    // Row 1 IS the primary category: a row-1 category pick updates
    // the primary picker state too (one source of truth).
    if (index === 0 && (patch.categoryId !== undefined || patch.subCategoryId !== undefined)) {
      if (patch.categoryId !== undefined) setCategoryId(patch.categoryId);
      if (patch.subCategoryId !== undefined) setSubCategoryId(patch.subCategoryId);
    }
  };

  const handleSplitRowCategorySelect = (index: number, catId: string, subId?: string) => {
    // [v7.6.44] F1: an explicit split-row pick locks the form's
    // category against item-name auto-switching.
    categoryExplicitRef.current = true;
    updateSplitRow(index, { categoryId: catId, subCategoryId: subId || '' });
    setSplitPickerRow(null);
  };

  const handlePrimaryCategorySelect = (catId: string, subId?: string) => {
    // [v7.6.44] F1: an explicit primary pick locks the category.
    categoryExplicitRef.current = true;
    setCategoryId(catId);
    setSubCategoryId(subId || '');
    setIsCategoryPickerOpen(false);
    // Two-way sync: the primary pick moves split row 1 with it.
    if (splitEnabled) {
      setSplitRows((prev) => syncSplitRowToPrimary(prev, catId, subId || ''));
    }
  };

  const addSplitRow = () => {
    // [v7.6.30] The new row starts with the last row's category +
    // sub-category (amount/note stay empty); the user re-picks only
    // when the category changes.
    setSplitRows((prev) => [...prev, nextSplitRow(prev)]);
  };

  const removeSplitRow = (index: number) => {
    setSplitRows((prev) => prev.filter((_, i) => i !== index));
  };

  const fillSplitRowRemainder = (index: number) => {
    const filled = fillRemainderAmount(splitTotalAmount, splitRows, index);
    if (filled !== '') updateSplitRow(index, { amount: filled });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !isActionAllowed) return;
    const numAmount = parseMyanmarNumber(amount);
    // [v7.5.55] A free 0-Ks tire-pressure check bypasses the amount > 0
    // gate (C8) and creates no expense transaction — the save handler
    // deals with it. Every other empty/0 amount shows a message instead
    // of silently doing nothing.
    const isFreeTireCheck = entryModel === 'tire_pressure';
    if ((!numAmount || numAmount <= 0) && !isFreeTireCheck) {
      setFormError(lang === 'my' ? 'ပမာဏ ထည့်ပေးပါ (၀ ထက် ကြီးရပါမည်)' : 'Please enter an amount greater than 0');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    // [v7.5.55] Price-0 items are kept (free items); only quantity must be > 0.
    // [v7.5.82] Carry the per-item unit through (unknown / missing →
    // default 'ခု') so the menu diff can match by name AND unit.
    const validItems = shoppingItems.filter((i) => i.name.trim() && parseMyanmarNumber(i.quantity as any) > 0).map((i) => {
      const p = parseMyanmarNumber(i.price as any) || 0;
      const q = parseMyanmarNumber(i.quantity as any) || 0;
      // [v7.5.93] Carry the row's own serviceType through — the map
      // rebuilds the object, so a dropped type would collapse every
      // row back onto the visit's main type. (Only stamped when set;
      // an undefined key must never reach Firestore.)
      return { name: i.name.trim(), price: p, quantity: q, amount: p * q, unit: resolveSavedMenuUnit(i.unit), ...(i.serviceType ? { serviceType: i.serviceType } : {}) };
    });
    let finalAmount = numAmount;
    if (isFreeTireCheck && (!finalAmount || finalAmount <= 0)) finalAmount = 0;
    // [v7.5.93] A multi-row vehicle visit is driven by its rows exactly
    // like a shopping list — the rows total IS the amount. (The shared
    // amount input is already driven live by updateShoppingItem, so this
    // recompute only re-asserts the same total at save time.)
    // [v7.6.25] One form: a general non-transfer entry's total IS
    // its rows' total (transfers keep the typed amount — their rows
    // never render; vehicle multi-row visits keep the rows total,
    // as before).
    const isTransferLike = isTransferCategory || subCategoryId === 'sub_tf_out' || subCategoryId === 'sub_tf_in';
    const isMultiRow = (entryModel === 'general' && !isTransferLike) || (entryModel === 'vehicle_service' && maintServiceType !== 'license_renewal');
    if (isMultiRow && validItems.length > 0) {
      finalAmount = validItems.reduce((sum, item) => sum + item.amount, 0);
    }

    // [v7.5.95 U2] Save typed custom units so they reappear as select
    // options next time (same pattern as custom gas stations).
    // [v7.6.25] One form: the row units are the only source — the
    // single row's unit joins the same list the rows always did.
    const newCustomUnits = collectNewCustomUnits(validItems.map((i) => i.unit), customUnits);
    if (newCustomUnits.length > 0) setCustomUnits((prev) => [...prev, ...newCustomUnits]);
    // [v7.6.24] Share the new customs with everyone (public_units,
    // like the Public shop list): fire-and-forget, never throws,
    // never gates the save; skipped without a signed-in uid.
    if (newCustomUnits.length > 0 && user?.uid) {
      void publishSharedUnits(newCustomUnits, user.uid, user.email || user.displayName || 'User');
    }

    try {
      let vehicleLinkPayload: VehicleLinkData | undefined = undefined;
      const targetVehicleId = vehicleId || activeVehicles[0]?.id || '';

      // [v7.5.49] Edit-mode odometer rules: the odometer shown while editing is
      // the existing record's own value, so "must be greater" / "double entry"
      // must never block an edit — otherwise the record becomes uneditable.
      // The old code only skipped the check when a linked log was found by
      // transactionId, but older records may not carry that link at all.
      // The checks still apply to NEW logs, and to an edit that switches the
      // log to a DIFFERENT vehicle (checked against that new vehicle).
      // [v7.5.50] For NEW logs the rule is now "must not be LESS than the
      // current odometer" (equal is allowed): the form pre-fills the current
      // odometer, and a same-day service + fill-up can legitimately share it.
      // An exact duplicate of the last log of the same type is still blocked
      // by the double-entry check below.
      const linkedVehicleLog = fuelLogs.find((f) => f.transactionId === editTransaction?.id)
        || vehicleMaintenance.find((m) => m.transactionId === editTransaction?.id)
        || tirePressureLogs.find((t) => t.transactionId === editTransaction?.id);
      const editingVehicleSwitched = isEditing && !!linkedVehicleLog && linkedVehicleLog.vehicleId !== targetVehicleId;
      const editingOwnOdometer = isEditing && !!linkedVehicleLog && (parseMyanmarNumber(vehicleOdometer) || 0) === linkedVehicleLog.odometer;
      const editingUnlinkedLog = isEditing && !linkedVehicleLog;

      if (entryModel === 'fuel' && targetVehicleId) {
        const odoNum = parseMyanmarNumber(vehicleOdometer) || 0;
        const currVeh = vehicles.find(v => v.id === targetVehicleId);
        if ((!isEditing || editingVehicleSwitched) && currVeh && odoNum < (currVeh.currentOdometer || 0)) {
          // [v7.5.51] Backfill: an older missed entry may legitimately have a lower
          // odometer. Ask instead of blocking — the vehicle odometer itself stays
          // at the highest reading (recalculation uses max), so this cannot lower it.
          // [v7.5.60 S10] Inline dialog (awaited) instead of window.confirm.
          const okBackfill = await askBackfill(odoNum, currVeh.currentOdometer || 0);
          if (!okBackfill) {
            setIsSubmitting(false);
            return;
          }
        }
        if (!editingOwnOdometer && !editingUnlinkedLog && lastFuelLogForComparison && odoNum === lastFuelLogForComparison.odometer) {
          setFormError(lang === 'my' ? 'Odometer သည် ယခင်မှတ်တမ်းနှင့် တူနေပါသည်။ (Double Entry ကာကွယ်ရန်)' : 'Odometer is the same as the last entry.');
          setIsSubmitting(false);
          return;
        }
        
        const litersNum = parseMyanmarNumber(fuelLiters) || 0;
        const pplNum = parseMyanmarNumber(fuelPricePerLiter) || (litersNum > 0 ? Math.round(finalAmount / litersNum) : 0);
        const resolvedStation = fuelGasStation === 'Other' ? (customGasStation.trim() || undefined) : (fuelGasStation.trim() || undefined);
        
        if (fuelGasStation === 'Other' && resolvedStation && !customStations.includes(resolvedStation)) {
          setCustomStations(prev => [...prev, resolvedStation]);
        }

        vehicleLinkPayload = {
          vehicleId: targetVehicleId,
          logType: 'fuel',
          fuelType: fuelType || 'Octane 92',
          liters: litersNum,
          pricePerLiter: pplNum,
          gasStation: resolvedStation,
          isFullTank: fuelIsFullTank,
          odometer: odoNum,
        };
      } else if (entryModel === 'vehicle_service' && targetVehicleId && maintServiceType !== 'license_renewal') {
        const odoNum = parseMyanmarNumber(vehicleOdometer) || 0;
        const currVeh = vehicles.find(v => v.id === targetVehicleId);
        if ((!isEditing || editingVehicleSwitched) && currVeh && odoNum < (currVeh.currentOdometer || 0)) {
          // [v7.5.51] Backfill: an older missed entry may legitimately have a lower
          // odometer. Ask instead of blocking — the vehicle odometer itself stays
          // at the highest reading (recalculation uses max), so this cannot lower it.
          // [v7.5.60 S10] Inline dialog (awaited) instead of window.confirm.
          const okBackfill = await askBackfill(odoNum, currVeh.currentOdometer || 0);
          if (!okBackfill) {
            setIsSubmitting(false);
            return;
          }
        }
        if (!editingOwnOdometer && !editingUnlinkedLog && lastMaintLogForComparison && odoNum === lastMaintLogForComparison.odometer) {
          setFormError(lang === 'my' ? 'Odometer သည် ယခင်မှတ်တမ်းနှင့် တူနေပါသည်။ (Double Entry ကာကွယ်ရန်)' : 'Odometer is the same as the last entry.');
          setIsSubmitting(false);
          return;
        }
        vehicleLinkPayload = {
          vehicleId: targetVehicleId,
          logType: 'maintenance',
          serviceType: maintServiceType,
          title: maintTitle.trim() || extraNote.trim() || (lang === 'my' ? 'ယာဉ်ပြုပြင်ထိန်းသိမ်းမှု' : 'Vehicle Service'),
          // [v7.5.93] Raw typed title for the per-type record titles.
          maintTitle: maintTitle.trim() || undefined,
          sparePartBrand: maintSparePartBrand.trim() || undefined,
          workshopName: maintWorkshopName.trim() || undefined,
          expectedLifespanKm: parseMyanmarNumber(maintLifespanKm) || undefined,
          expectedLifespanDays: parseMyanmarNumber(maintLifespanDays) || undefined,
          odometer: odoNum,
        };
      } else if (entryModel === 'vehicle_service' && maintServiceType === 'license_renewal') {
        // [v7.5.55] Expiry date is required — no silent 365-day fallback.
        if (!maintExpiryDate) {
          setFormError(lang === 'my' ? 'လိုင်စင် ကုန်ဆုံးမည့်ရက်စွဲ ထည့်ပေးပါ' : 'Please enter the license expiry date');
          setIsSubmitting(false);
          return;
        }
        vehicleLinkPayload = {
          vehicleId: targetVehicleId,
          logType: 'maintenance',
          serviceType: maintServiceType,
          title: lang === 'my' ? '🪪 လိုင်စင် သက်တမ်းတိုး' : '🪪 License Renewal',
          expectedLifespanKm: 0,
          expectedLifespanDays: parseMyanmarNumber(maintLifespanDays) || 365,
          odometer: currentVehicle?.currentOdometer || 0,
        };
      } else if (type === 'expense' && isVehicleLinkEnabled && targetVehicleId) {
        const odoNum = parseMyanmarNumber(vehicleOdometer) || 0;
        if (vehicleLogType === 'fuel') {
          const litersNum = parseMyanmarNumber(fuelLiters) || 0;
          const pplNum = parseMyanmarNumber(fuelPricePerLiter) || (litersNum > 0 ? Math.round(finalAmount / litersNum) : 0);
          const resolvedStation = fuelGasStation === 'Other' ? (customGasStation.trim() || undefined) : (fuelGasStation.trim() || undefined);
          
          if (fuelGasStation === 'Other' && resolvedStation && !customStations.includes(resolvedStation)) {
            setCustomStations(prev => [...prev, resolvedStation]);
          }
          
          vehicleLinkPayload = {
            vehicleId: targetVehicleId,
            logType: 'fuel',
            fuelType: fuelType || 'Octane 92',
            liters: litersNum,
            pricePerLiter: pplNum,
            gasStation: resolvedStation,
            isFullTank: fuelIsFullTank,
            odometer: odoNum,
          };
        } else if (vehicleLogType === 'maintenance') {
          vehicleLinkPayload = {
            vehicleId: targetVehicleId,
            logType: 'maintenance',
            serviceType: maintServiceType,
            title: maintTitle.trim() || itemName.trim() || extraNote.trim() || (lang === 'my' ? 'ယာဉ်ပြုပြင်ထိန်းသိမ်းမှု' : 'Vehicle Maintenance'),
            sparePartBrand: maintSparePartBrand.trim() || undefined,
            workshopName: maintWorkshopName.trim() || undefined,
            expectedLifespanKm: parseMyanmarNumber(maintLifespanKm) || undefined,
            expectedLifespanDays: parseMyanmarNumber(maintLifespanDays) || undefined,
            odometer: odoNum,
          };
        } else if (vehicleLogType === 'tire') {
          // [v7.5.55] PSI must be 10–80 (same range as the Vehicles view).
          const isBikeTire = currentVehicle?.type === 'motorcycle';
          const psiValues = isBikeTire
            ? [parseMyanmarNumber(tireFL), parseMyanmarNumber(tireRL)]
            : [parseMyanmarNumber(tireFL), parseMyanmarNumber(tireFR), parseMyanmarNumber(tireRL), parseMyanmarNumber(tireRR)];
          if (psiValues.some((v) => Number.isNaN(v) || v < 10 || v > 80)) {
            setFormError(lang === 'my' ? 'လေပေါင်ချိန် (PSI) ကို 10 မှ 80 အတွင်း ထည့်ပေးပါ' : 'Please enter PSI values between 10 and 80');
            setIsSubmitting(false);
            return;
          }
          // [v7.5.55] Motorcycles store frontPsi/rearPsi only — the
          // 4-wheel fields are never written onto a bike log. The form's
          // Front/Rear values travel as frontLeftPsi/rearLeftPsi and the
          // save handler maps them to frontPsi/rearPsi for bikes.
          vehicleLinkPayload = {
            vehicleId: targetVehicleId,
            logType: 'tire',
            frontLeftPsi: parseMyanmarNumber(tireFL) || undefined,
            frontRightPsi: isBikeTire ? undefined : (parseMyanmarNumber(tireFR) || undefined),
            rearLeftPsi: parseMyanmarNumber(tireRL) || undefined,
            rearRightPsi: isBikeTire ? undefined : (parseMyanmarNumber(tireRR) || undefined),
            odometer: odoNum,
          };
        }
      }

      // [v7.5.55] effectiveCategoryId silently falls back to the first
      // category — a category is required instead. Vehicle models resolve
      // to the vehicle category below, so they still pass.
      let targetCategory = categoryId || '';
      if (entryModel === 'fuel' || entryModel === 'vehicle_service' || entryModel === 'tire_pressure' || (type === 'expense' && isVehicleLinkEnabled)) {
        const vehicleCategory = categories.find((c) => c.id === 'cat_vehicle' || c.id === 'cat_vehicle_management' || c.name.includes('ယာဉ်စီမံ') || (c.nameEn && c.nameEn.toLowerCase().includes('vehicle management')));
        if (vehicleCategory) targetCategory = vehicleCategory.id;
      }
      if (!targetCategory) {
        setFormError(lang === 'my' ? 'ကဏ္ဍ ရွေးချယ်ပေးပါ' : 'Please select a category');
        setIsSubmitting(false);
        return;
      }

      let targetSubCategory = subCategoryId || undefined;
      if (entryModel === 'fuel') {
        targetSubCategory = 'sub_veh_fuel';
      } else if (entryModel === 'tire_pressure') {
        // [v7.5.53] Tire-pressure check goes under the tire subcategory.
        targetSubCategory = 'sub_veh_tire';
      } else if (entryModel === 'vehicle_service') {
        // [v7.5.93] Same rule as before, now in resolveVehicleServiceSubCategory.
        targetSubCategory = resolveVehicleServiceSubCategory(maintServiceType, targetSubCategory);
      }

      // [v7.6.25] One form: every branch saves the same note (the
      // typed note only). Rows become the saved items for general
      // non-transfer entries and multi-row vehicle visits; transfers
      // save no items (their rows never render).
      const isTransferTx = isTransferCategory || targetSubCategory === 'sub_tf_out' || targetSubCategory === 'sub_tf_in';
      let finalNote: string | undefined = extraNote.trim() || undefined;
      let txItems: TransactionItem[] | undefined = undefined;

      if (entryModel === 'vehicle_service' && maintServiceType !== 'license_renewal') {
        // [v7.5.93] Multi-row visit: the rows ARE the transaction items
        // (each with its own serviceType) — the handler creates one
        // maintenance record per distinct row type from them.
        txItems = validItems.length > 0 ? validItems : undefined;
      } else if (entryModel === 'general' && !isTransferTx) {
        txItems = validItems.length > 0 ? validItems : undefined;
      }

      // [v7.6.07] Split slices: only for general entries
      // (never vehicle / transfer). When the section
      // is on, the slices must sum EXACTLY to the saved total —
      // otherwise the save is blocked with an inline error. When the
      // section is off (or every row was deleted) the `splits` key is
      // omitted entirely; the edit handler then writes `splits: []`
      // for a record that had splits, because a merge write would
      // otherwise keep the old slices (see shouldClearSplits).
      let validSplits: TransactionSplit[] | undefined = undefined;
      if (entryModel === 'general' && splitEnabled && !isTransferTx && splitRows.length > 0) {
        const built = rowsToSplits(splitRows);
        const splitError = validateSplits(built, finalAmount);
        if (splitError) {
          setFormError(
            splitError === 'missing-category'
              ? (lang === 'my' ? 'ခွဲရေးတန်းတိုင်းတွင် ကဏ္ဍ ရွေးချယ်ပေးပါ (မခွဲလိုလျှင် အမျိုးအစားခွဲရေးခြင်းကို ပိတ်ပါ)' : 'Please select a category for every split row (or switch splits off to save unsplit)')
              : splitError === 'non-positive-amount'
              ? (lang === 'my' ? 'ခွဲရေးပမာဏတိုင်းသည် ၀ ထက် ကြီးရပါမည်' : 'Every split amount must be greater than 0')
              : (lang === 'my' ? `ခွဲရေးပမာဏ စုစုပေါင်းသည် စုစုပေါင်းပမာဏ (${formatMMK(finalAmount)}) နှင့် အတိအကျ တူရပါမည်` : `Split amounts must add up exactly to the total (${formatMMK(finalAmount)})`)
          );
          setIsSubmitting(false);
          return;
        }
        validSplits = built;
        // The primary category is the FIRST split's category — also
        // when row 1 was deleted and the old row 2 moved up. A
        // vehicle-linked entry keeps its forced vehicle category.
        if (!vehicleLinkPayload) {
          targetCategory = built[0].categoryId;
          targetSubCategory = built[0].subCategoryId || undefined;
        }
      }

      // [v7.5.55] A transfer with no destination wallet would leave a
      // one-legged transfer_out and the money would vanish from totals.
      if (isTransferTx && (!transferToWalletId || transferToWalletId === walletId)) {
        setFormError(lang === 'my' ? 'ငွေလွှဲရန် အခြား Wallet ရွေးပေးပါ (Wallet တစ်ခုတည်းသာ ရှိသေးလျှင် Wallet အသစ် အရင်ထည့်ပါ)' : 'Please select a destination wallet for the transfer (add another wallet first if you only have one)');
        setIsSubmitting(false);
        return;
      }

      if (typeof localStorage !== 'undefined' && walletId) {
        localStorage.setItem('fortune_last_used_wallet_id', walletId);
      }

      // [v7.5.55] Shop name resolution (C13): fuel entries feed the shop
      // from the gas station and service entries from the workshop name
      // when no shop was typed, so vehicle purchases can get a cheapest
      // shop. A NEW shop name is published to public_shops ONLY when the
      // user explicitly ticked the opt-in checkbox (default unchecked);
      // guests are skipped and the exact-match dedupe is kept.
      let derivedShopName = shopName.trim();
      if (!derivedShopName && entryModel === 'fuel') {
        derivedShopName = fuelGasStation === 'Other' ? customGasStation.trim() : fuelGasStation.trim();
      }
      if (!derivedShopName && entryModel === 'vehicle_service') {
        derivedShopName = maintWorkshopName.trim();
      }
      const cleanShopForAdd = derivedShopName;
      if (cleanShopForAdd && user && publishShopOptIn) {
        const inPrivate = shops.some((s) => s.name.trim().toLowerCase() === cleanShopForAdd.toLowerCase());
        const inPublic = publicShops.some((s) => s.name.trim().toLowerCase() === cleanShopForAdd.toLowerCase());
        if (!inPrivate && !inPublic) {
          try {
            const newId = `pub_shop_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            safeSetDoc(doc(db, 'public_shops', newId), {
              id: newId,
              name: cleanShopForAdd,
              phone: '',
              phones: [],
              address: '',
              addresses: [],
              note: '',
              stateRegion: '',
              township: '',
              city: '',
              ward: '',
              kpayNumber: '',
              generalNotes: '',
              addedBy: user.email || user.displayName || 'User',
              addedByUid: user.uid,
              createdAt: Date.now(),
              helpfulCount: 0,
              items: [],
            }).then((ok) => {
              // [v7.5.55] safeSetDoc returns false when the write did not
              // land (not queued for public_shops) — surface it.
              if (ok === false) {
                alert(lang === 'my' ? 'ဆိုင်အမည်ကို အများပြင်လမ်းညွှန်သို့ တင်ခြင်း မအောင်မြင်ပါ — အင်တာနက်စစ်ပြီး ထပ်ကြိုးစားပေးပါ' : 'Could not publish the shop to the public directory — please check your connection and try again');
              }
            }).catch((err) => {
              console.warn('[auto-add-public-shop] failed:', err);
            });
          } catch (e) {
            console.warn('[auto-add-public-shop] error:', e);
          }
        }
      }

      // [v7.5.78 C] Prompt decision — captured BEFORE onSubmit, because
      // the publish opt-in above can create a name-only public stub with
      // this name, which would otherwise hide that it still needs
      // details. [v7.5.83] For fuel / vehicle entries the DERIVED
      // station / workshop name IS the shop (user overruled the v7.5.82
      // "not a shop the user named" rule, 2026-11-14): a station not in
      // the directory triggers the details prompt like a new regular
      // shop, so it can be added instead of silently skipped. General
      // entries still count only the name typed in the shop field.
      const typedShopName = shopName.trim();
      const detailsShopName =
        entryModel === 'fuel' || entryModel === 'vehicle_service' ? derivedShopName : typedShopName;
      const needsShopDetailsPrompt =
        detailsShopName.length > 0 &&
        isShopNameNeedingDetails(detailsShopName, shops, publicShops, loadShopDetailDismissedKeys());

      // [v7.5.82] Menu-update candidates — captured BEFORE onSubmit,
      // next to the details-prompt decision. [v7.5.83] Fuel and
      // maintenance entries build a ONE-item candidate too (fuel
      // type per litre at the selected station; service / part per
      // service at the workshop) — the station / workshop name IS the
      // shop for them. An entry with no items has txItems undefined
      // and produces no candidate; license renewal and the free tire
      // check never do either. [v7.6.41] General entries produce ONE
      // candidate PER ROW SHOP (each row's items → that row's shop,
      // category-inferred when rows name different shops); an
      // unsplit entry produces the single entry-shop candidate
      // exactly as before. A row shop typed while the entry shop is
      // blank still produces its own candidate.
      const menuUpdateCandidates: { shopName: string; items: TransactionItem[] }[] = [];
      if (entryModel === 'general') {
        if (txItems && txItems.length > 0) {
          for (const [candidateShop, candidateItems] of attributeItemsToShops(
            txItems,
            validSplits,
            typedShopName,
            unifiedItemSuggestions,
          )) {
            menuUpdateCandidates.push({ shopName: candidateShop, items: candidateItems });
          }
        }
      } else {
        const vehicleCandidate = buildVehicleMenuCandidate({
          entryModel,
          shopName: derivedShopName,
          fuelType,
          fuelLiters: parseMyanmarNumber(fuelLiters) || 0,
          fuelPricePerLiter: parseMyanmarNumber(fuelPricePerLiter) || 0,
          maintServiceType,
          maintServiceLabel: SERVICE_TYPE_CONFIG[maintServiceType]?.labelMy,
          maintTitle,
          extraNote,
          finalAmount,
          // [v7.5.93] Multi-row visit: the candidate emits one item
          // per row; the helper falls back to the single-item
          // synthesis when there are no rows.
          rows: validItems.length > 0 ? validItems : undefined,
        });
        if (vehicleCandidate) menuUpdateCandidates.push(vehicleCandidate);
      }

            const saveOk = onSubmit({
        type: entryModel === 'fuel' || entryModel === 'vehicle_service' ? 'expense' : type,
        amount: finalAmount,
        category: targetCategory,
        subCategoryId: targetSubCategory,
        walletId: walletId,
        date,
        note: finalNote,
        shopName: derivedShopName || undefined,
        isTransfer: isTransferTx,
        transferType: isTransferTx ? (type === 'expense' ? 'transfer_out' : 'transfer_in') : undefined,
        transferToWalletId: isTransferTx && transferToWalletId && transferToWalletId !== walletId ? transferToWalletId : undefined,
        items: txItems,
        // [v7.6.07] Splits are written only when the section produced
        // valid slices; the key is absent otherwise (never undefined).
        ...(validSplits ? { splits: validSplits } : {}),
        // [v7.6.25] One form: a single saved item keeps the
        // unitPrice/quantity fields the list rendering branches on
        // (TransactionsView's unitPrice rows); multi-item entries
        // carry items[] only, as shopping-list saves always did.
        unitPrice: entryModel === 'general' && !isTransferTx && validItems.length === 1 && validItems[0].price > 0 ? validItems[0].price : undefined,
        quantity: entryModel === 'general' && !isTransferTx && validItems.length === 1 && validItems[0].quantity > 0 ? validItems[0].quantity : undefined,
      }, vehicleLinkPayload);
      // [v7.5.55] Close ONLY on a successful save. Validation returns
      // above (backfill cancel / double-entry / missing fields) keep the
      // modal open so the entry is not discarded, and a false return from
      // the save handler (blocked save) also keeps it open.
      // [v7.5.78 C] The transaction is already saved here. When its shop
      // name still needs details, hand the name to App (which shows the
      // prompt) and close as usual — the prompt never blocks saving.
      if (saveOk !== false) {
        // [v7.5.82] Menu prompt goes FIRST: App may open the menu
        // prompt and stash the details name until it closes, so the
        // two prompts never stack.
        if (menuUpdateCandidates.length > 0) onShopMenuUpdateCandidates?.(menuUpdateCandidates);
        if (needsShopDetailsPrompt) onShopNeedsDetails?.(detailsShopName);
        // [v7.6.41] Split rows may name shops the entry shop does
        // not: each distinct row shop gets the same details check
        // (App dedupes by normalized name, so a name already
        // prompted for is not prompted twice).
        const seenDetailNames = new Set([detailsShopName.toLowerCase()]);
        for (const s of validSplits || []) {
          const rowShop = (s.shopName || '').trim();
          const rowKey = rowShop.toLowerCase();
          if (rowShop && !seenDetailNames.has(rowKey)) {
            seenDetailNames.add(rowKey);
            if (isShopNameNeedingDetails(rowShop, shops, publicShops, loadShopDetailDismissedKeys())) {
              onShopNeedsDetails?.(rowShop);
            }
          }
        }
        onClose();
      }
    } catch (err) {
      console.error('[TransactionModal] save failed:', err);
      setFormError(lang === 'my' ? 'သိမ်းဆည်းခြင်း မအောင်မြင်ပါ — ထပ်ကြိုးစားပေးပါ' : 'Save failed — please try again');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-3 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden relative" onClick={(e) => e.stopPropagation()}>
        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2 shrink-0">
            <button type="button" onClick={onClose} className="text-sm font-semibold text-slate-600 hover:text-slate-900 px-2 py-1 -ml-2 shrink-0">
              {lang === 'my' ? 'မလုပ်တော့' : 'Cancel'}
            </button>
            <h2 className="font-bold text-slate-900 text-sm sm:text-base truncate min-w-0">
              {isEditing ? (lang === 'my' ? 'စာရင်းပြင်ဆင်ခြင်း' : 'Edit Transaction') : (lang === 'my' ? 'စာရင်းအသစ်' : 'New Transaction')}
            </h2>
            <button type="submit" disabled={isSubmitting || !isActionAllowed} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer shrink-0">
              {isSubmitting ? (lang === 'my' ? 'သိမ်းနေသည်...' : 'Saving...') : (<><Check className="w-4 h-4 shrink-0" strokeWidth={3} /><span>{lang === 'my' ? 'သိမ်းမည်' : 'Save'}</span></>)}
            </button>
          </div>

          {/* [v7.5.61] Entry-mode switcher is now vehicle-only: the three
              general modes (item / unit x qty / shopping list) live in the
              tabs below, so offering them here too was a duplicate. The
              switcher only appears when a vehicle mode can apply.
              [v7.6.14] In fresh-open vehicle mode the tiles below are
              the sole selector, so this Bar hides there. */}
          {(isVehicleRelatedCategory || showModelSelector) && !inFreshVehicleMode && (
          <div className="px-3 py-2 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setMoreOpen(!moreOpen)} className="flex-1 min-w-0 flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors text-xs font-bold text-slate-700">
                <span className="flex items-center gap-2 min-w-0">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="truncate">
                    {entryModel === 'general'
                      ? (lang === 'my' ? '🚗 ယာဉ် မှတ်တမ်း' : '🚗 Vehicle entry')
                      : entryModel === 'tire_pressure' ? (lang === 'my' ? '🛞 လေချိန်' : '🛞 Tire Pressure') : entryModel === 'fuel' ? (lang === 'my' ? '⛽ ဆီဖိုး' : '⛽ Fuel') : entryModel === 'vehicle_service' && maintServiceType === 'tires' ? (lang === 'my' ? '🛞 တာယာ လဲလှယ်' : '🛞 Tire Replacement') : entryModel === 'vehicle_service' ? (lang === 'my' ? '🔧 ဝန်ဆောင်မှု' : '🔧 Service') : (lang === 'my' ? '🚗 ယာဉ် မှတ်တမ်း' : '🚗 Vehicle entry')}
                  </span>
                </span>
                {moreOpen ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
              </button>
              {isVehicleRelatedCategory && (
                <button type="button" onClick={() => setShowFuelGuideModal(true)} className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 shrink-0" title={lang === "my" ? "ဆီဖိုး လမ်းညွှန်" : "Fuel Guide"}>
                  <HelpCircle className="w-4 h-4" />
                </button>
              )}
            </div>

            {moreOpen && (
              <div className="mt-1.5 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                {(isVehicleRelatedCategory || showModelSelector) && (
                  <>
                    <button type="button" onClick={() => { handleSwitchModel("fuel"); setMoreOpen(false); autoSelectedRef.current = false; autoSelectDoneRef.current = true; }} className={"w-full flex items-center gap-2 px-3 py-2 text-xs font-bold transition-colors " + (entryModel === "fuel" ? "bg-emerald-50 text-emerald-800" : "text-slate-700 hover:bg-slate-50")}>
                      <Fuel className="w-4 h-4" /><span>{lang === 'my' ? 'ဆီဖိုး' : 'Fuel'}</span>{entryModel === "fuel" && <Check className="w-3.5 h-3.5 ml-auto text-emerald-600" strokeWidth={3} />}
                    </button>
                    <button type="button" onClick={() => { handleSwitchModel("vehicle_service"); setMoreOpen(false); autoSelectedRef.current = false; autoSelectDoneRef.current = true; }} className={"w-full flex items-center gap-2 px-3 py-2 text-xs font-bold transition-colors " + (entryModel === "vehicle_service" && maintServiceType !== "tires" ? "bg-blue-50 text-blue-800" : "text-slate-700 hover:bg-slate-50")}>
                      <Wrench className="w-4 h-4" /><span>{lang === 'my' ? 'ဝန်ဆောင်မှု / ပြုပြင်' : 'Service / Repair'}</span>{entryModel === "vehicle_service" && maintServiceType !== "tires" && <Check className="w-3.5 h-3.5 ml-auto text-blue-600" strokeWidth={3} />}
                    </button>
                    <button type="button" onClick={() => { handleSwitchModel("vehicle_service"); setMaintServiceType("tires"); setMoreOpen(false); autoSelectedRef.current = false; autoSelectDoneRef.current = true; }} className={"w-full flex items-center gap-2 px-3 py-2 text-xs font-bold transition-colors " + (entryModel === "vehicle_service" && maintServiceType === "tires" ? "bg-amber-50 text-amber-800" : "text-slate-700 hover:bg-slate-50")}>
                      <Car className="w-4 h-4" /><span>{lang === 'my' ? 'တာယာ လဲလှယ်' : 'Tire Replacement'}</span>{entryModel === "vehicle_service" && maintServiceType === "tires" && <Check className="w-3.5 h-3.5 ml-auto text-amber-600" strokeWidth={3} />}
                    </button>
                    <button type="button" onClick={() => { handleSwitchModel("tire_pressure"); setMoreOpen(false); autoSelectedRef.current = false; autoSelectDoneRef.current = true; }} className={"w-full flex items-center gap-2 px-3 py-2 text-xs font-bold transition-colors " + (entryModel === "tire_pressure" ? "bg-teal-50 text-teal-800" : "text-slate-700 hover:bg-slate-50")}>
                      <Gauge className="w-4 h-4" /><span>{lang === 'my' ? 'လေချိန် (PSI)' : 'Tire Pressure (PSI)'}</span>{entryModel === "tire_pressure" && <Check className="w-3.5 h-3.5 ml-auto text-teal-600" strokeWidth={3} />}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          )}

          <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
            {formError && (
              <div className="mx-3 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold">{formError}</div>
            )}

            {/* [v7.5.60 S15] Income↔expense switch confirm (edit only). */}
            {pendingTypeChange && (
              <div className="mx-3 mt-3 p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-2">
                <p className="text-amber-900 text-xs font-bold leading-relaxed">
                  {lang === 'my'
                    ? `မှတ်တမ်း အမျိုးအစား "${pendingTypeChange.newType === 'income' ? 'ဝင်ငွေ' : 'ထွက်ငွေ'}" သို့ ပြောင်းမည်။${pendingTypeChange.clearCategoryOnConfirm ? ' လက်ရှိ ကဏ္ဍက အမျိုးအစားအသစ်နှင့် မကိုက်လို့ ဖျက်ပြီး ပြန်ရွေးရပါမည်။' : ''} သေချာပါသလား?`
                    : `Change the record type to "${pendingTypeChange.newType === 'income' ? 'Income' : 'Expense'}"?${pendingTypeChange.clearCategoryOnConfirm ? ' The current category does not match the new type and will be cleared.' : ''}`}
                </p>
                <div className="flex items-center justify-end gap-2">
                  <button type="button" onClick={cancelTypeChange} className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 font-bold text-xs cursor-pointer">{lang === 'my' ? 'မပြောင်းပါ' : 'Keep as is'}</button>
                  <button type="button" onClick={confirmTypeChange} className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer">{lang === 'my' ? 'ပြောင်းမည်' : 'Change'}</button>
                </div>
              </div>
            )}

            {/* [v7.6.14] The Mode chip row hides in fresh-open
                vehicle mode with the Bar above (the tiles are the
                sole selector); its ✕ close stays for edit mode. */}
            {entryModel !== "general" && !inFreshVehicleMode && (
              <div className="px-3 pt-3">
                <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200">
                  <span className="text-xs font-bold text-emerald-800 min-w-0">
                    {entryModel === 'fuel' && (lang === 'my' ? '⛽ ဆီဖိုး Mode' : '⛽ Fuel Mode')}
                    {entryModel === 'tire_pressure' && (lang === 'my' ? '🛞 လေချိန် Mode' : '🛞 Tire Pressure Mode')}
                    {entryModel === 'vehicle_service' && maintServiceType === 'tires' && (lang === 'my' ? '🛞 တာယာ Mode' : '🛞 Tire Mode')}
                    {entryModel === 'vehicle_service' && maintServiceType !== 'tires' && (lang === 'my' ? '🔧 ဝန်ဆောင်မှု Mode' : '🔧 Service Mode')}
                  </span>
                  <button type="button" onClick={() => { setEntryModel("general"); setIsVehicleLinkEnabled(false); autoSelectedRef.current = false; autoSelectDoneRef.current = true; }} className="text-[10px] font-bold text-slate-500 hover:text-slate-800 shrink-0">✕ {lang === 'my' ? 'ပိတ်' : 'Close'}</button>
                </div>
              </div>
            )}

            {/* [v7.5.60 M4] Income/expense segmented control — the old
                code showed the type as a text label only, with no way to
                switch it here. Disabled for vehicle models (expense is
                forced there). On an edit, switching asks first (S15). */}
            <div className="px-4 pt-3 pb-1">
              <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl" role="group" aria-label={lang === 'my' ? 'ဝင်ငွေ / ထွက်ငွေ' : 'Income / Expense'}>
                <button
                  type="button"
                  onClick={() => handleTypeChange('expense')}
                  disabled={entryModel !== 'general'}
                  className={`py-2 px-3 rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${type === 'expense' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>{lang === 'my' ? 'ထွက်ငွေ' : 'Expense'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange('income')}
                  disabled={entryModel !== 'general'}
                  className={`py-2 px-3 rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${type === 'income' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  <span>{lang === 'my' ? 'ဝင်ငွေ' : 'Income'}</span>
                </button>
              </div>
            </div>

            <div className="px-4 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="text-xl font-black text-slate-400 shrink-0">{selectedWallet?.currency || 'MMK'}</span>
                <input type="text" inputMode="decimal" value={amount} onChange={(e) => {
                  setAmount(e.target.value);
                  const numAmt = parseMyanmarNumber(e.target.value) || 0;
                  const numPpl = parseMyanmarNumber(fuelPricePerLiter) || 0;
                  if (entryModel === 'fuel' && numAmt > 0 && numPpl > 0) {
                    setFuelLiters(String(Number((numAmt / numPpl).toFixed(2))));
                  }
                }} placeholder="0" autoFocus={!isEditing} className="flex-1 min-w-0 text-4xl font-black text-slate-900 bg-transparent border-0 focus:outline-none text-center" />
              </div>
              {entryModel === 'vehicle_service' && lastMaintLogForComparison && lastMaintLogForComparison.cost > 0 && amount && (
                <div className="text-[10px] text-center mt-1 flex items-center justify-center gap-1">
                  <span className="text-slate-500">{lang === 'my' ? 'ယခင်ကုန်ကျစရိတ်:' : 'Prev Cost:'} {lastMaintLogForComparison.cost.toLocaleString()} Ks</span>
                  {Number(amount) > lastMaintLogForComparison.cost ? (
                    <span className="text-rose-600 font-bold flex items-center gap-0.5"><TrendingUp className="w-3 h-3" /> +{Math.round(((Number(amount) - lastMaintLogForComparison.cost) / lastMaintLogForComparison.cost) * 100)}%</span>
                  ) : Number(amount) < lastMaintLogForComparison.cost ? (
                    <span className="text-emerald-600 font-bold flex items-center gap-0.5"><TrendingDown className="w-3 h-3" /> {Math.round(((Number(amount) - lastMaintLogForComparison.cost) / lastMaintLogForComparison.cost) * 100)}%</span>
                  ) : <span className="text-slate-400">(Same)</span>}
                </div>
              )}
              {/* [v7.6.25] One form: the quick-add buttons bump only
                  the shared amount state, which the row sum
                  overwrites at save time — so they are hidden for
                  general non-transfer entries (transfers and
                  vehicle models keep them). */}
              {!(entryModel === "fuel" && vehicleId) && !(entryModel === "general" && !isTransferCategory) && (
                <div className="flex justify-center gap-1.5 mt-2 flex-wrap">
                  <button type="button" onClick={() => handleAddAmount(1000)} className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-[11px] font-bold text-slate-600">+1K</button>
                  <button type="button" onClick={() => handleAddAmount(10000)} className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-[11px] font-bold text-slate-600">+10K</button>
                  <button type="button" onClick={() => handleAddAmount(100000)} className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 rounded text-[11px] font-bold text-indigo-700">+100K</button>
                </div>
              )}
              {/* [v7.5.60 N1] Live lakh preview while typing the amount
                  (display-only — the input stays full kyat).
                  [v7.5.99] Hidden in kyat mode: the input already
                  shows full kyats, so the hint would only duplicate it. */}
              {getAmountDisplayMode() === 'lakh' && (parseMyanmarNumber(amount) || 0) > 0 && (
                <div className="text-xs text-center text-slate-500 font-semibold mt-1.5" title={formatMMK(parseMyanmarNumber(amount) || 0)}>
                  ≈ {formatLakhs(parseMyanmarNumber(amount) || 0, lang)}
                </div>
              )}
            </div>

            {/* [v7.6.29] While splits are on, the top category picker
                hides: the split rows ARE the category picks (row 1
                stays the primary through the state sync — untouched).
                Splits off -> the picker renders exactly as before. */}
            {!(splitSectionVisible && splitEnabled) && (
            <button type="button" onClick={() => setIsCategoryPickerOpen(true)} className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 hover:bg-slate-50 transition-colors text-left">
              {/* [v7.6.15] Icon/color from the EXPLICITLY picked category
                  only. selectedCatObj falls back to the first /
                  most-used category, so on a neutral fresh open (no
                  category picked yet) this tile used to wear the
                  fallback category's icon/color while the text
                  showed the empty placeholder. explicitCatObj is the
                  same object whenever a category IS picked, so
                  picked-state rendering is unchanged; unpicked
                  state shows the neutral slate + Tag icon. */}
              <CategoryTile
                categoryId={explicitCatObj?.id}
                icon={explicitCatObj?.icon}
                color={explicitCatObj?.color || "#94A3B8"}
                sizeClassName="w-10 h-10"
                roundedClassName="rounded-xl"
                iconClassName="w-5 h-5"
                extraClassName="text-white"
              />
              <div className="flex-1 min-w-0">
                {categoryId ? (
                  <>
                    <div className="text-sm font-bold text-slate-900 truncate">{selectedCatObj ? (lang === 'my' ? selectedCatObj.name : selectedCatObj.nameEn) : ''}</div>
                    {(() => { const sub = availableSubCats.find((s) => s.id === subCategoryId); if (!sub) return null; return (<div className="text-xs text-emerald-700 truncate mt-0.5 flex items-center gap-1">{/* [v7.6.48] Sub-category's own resolved icon; no categoryId. */}<CategoryIcon name={resolveSubCategoryIconValue(sub, selectedCatObj)} className="w-3 h-3 shrink-0" /><span className="truncate">↳ {lang === 'my' ? sub.name : sub.nameEn}</span></div>); })()}
                  </>
                ) : <div className="text-sm font-bold text-slate-400">{lang === 'my' ? 'ကဏ္ဍ ရွေးရန်' : 'Select category'}</div>}
              </div>
              <span className="text-slate-300 text-xl shrink-0">›</span>
            </button>
            )}

            {/* [v7.6.07] Split across categories — general
                entries only. The toggle starts two rows (row 1 mirrors
                the primary category); each row picks its own category
                + amount, and the slices must sum exactly to the total
                before saving. */}
            {splitSectionVisible && (
              <div className="px-4 py-3 border-b border-slate-100 space-y-2">
                <button
                  type="button"
                  onClick={() => toggleSplitSection(!splitEnabled)}
                  aria-pressed={splitEnabled}
                  className="w-full flex items-center justify-between gap-2 min-h-[44px] text-left"
                >
                  <span className="text-xs font-bold text-slate-700">{lang === 'my' ? 'အမျိုးအစားခွဲရေးခြင်း' : 'Split across categories'}</span>
                  <span className={'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ' + (splitEnabled ? 'bg-emerald-600' : 'bg-slate-300')}>
                    <span className={'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ' + (splitEnabled ? 'translate-x-5' : 'translate-x-0.5')} />
                  </span>
                </button>
                {splitEnabled && (
                  <>
                    <div className="space-y-2">
                      {splitRows.map((row, idx) => {
                        const rowCat = categories.find((c) => c.id === row.categoryId);
                        const rowSub = rowCat?.subCategories?.find((s) => s.id === row.subCategoryId);
                        return (
                          <div key={idx} className="bg-slate-50 rounded-xl p-2.5 space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSplitPickerRow(idx)}
                                className="flex-1 min-w-0 flex items-center gap-2 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-left min-h-[44px]"
                              >
                                <CategoryTile
                                  categoryId={rowCat?.id}
                                  icon={rowCat?.icon}
                                  color={rowCat?.color || '#94A3B8'}
                                  sizeClassName="w-6 h-6"
                                  roundedClassName="rounded-lg"
                                  iconClassName="w-3.5 h-3.5"
                                  extraClassName="text-white"
                                />
                                <span className="min-w-0 flex-1">
                                  {row.categoryId ? (
                                    <>
                                      <span className="block text-xs font-bold text-slate-900 truncate">{lang === 'my' ? rowCat?.name : rowCat?.nameEn || row.categoryId}</span>
                                      {rowSub && <span className="block text-[11px] text-emerald-700 truncate">↳ {lang === 'my' ? rowSub.name : rowSub.nameEn}</span>}
                                    </>
                                  ) : (
                                    <span className="block text-xs font-bold text-slate-400">{lang === 'my' ? 'ကဏ္ဍ ရွေးရန်' : 'Select category'}</span>
                                  )}
                                </span>
                                <span className="text-slate-300 shrink-0">›</span>
                              </button>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={row.amount}
                                onChange={(e) => updateSplitRow(idx, { amount: e.target.value })}
                                placeholder="0"
                                aria-label={lang === 'my' ? `ခွဲရေးပမာဏ ${idx + 1}` : `Split amount ${idx + 1}`}
                                className="w-24 sm:w-28 shrink-0 min-h-[44px] text-sm font-bold bg-white border border-slate-200 rounded-lg px-2 focus:outline-none font-mono text-right"
                              />
                              <button
                                type="button"
                                onClick={() => fillSplitRowRemainder(idx)}
                                title={lang === 'my' ? 'ကျန်ငွေကို ဤတန်းတွင် ထည့်မည်' : 'Fill this row with the remaining amount'}
                                className="shrink-0 min-h-[44px] px-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 text-[11px] font-bold"
                              >
                                {lang === 'my' ? 'ကျန်' : 'Rest'}
                              </button>
                              <button
                                type="button"
                                onClick={() => removeSplitRow(idx)}
                                aria-label={lang === 'my' ? `တန်း ${idx + 1} ဖျက်မည်` : `Remove row ${idx + 1}`}
                                className="shrink-0 p-2 text-slate-400 hover:text-rose-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <input
                              type="text"
                              value={row.note}
                              onChange={(e) => updateSplitRow(idx, { note: e.target.value })}
                              placeholder={lang === 'my' ? 'မှတ်ချက် (ရွေးချယ်နိုင်)' : 'Note (optional)'}
                              className="w-full text-xs font-bold bg-white border border-slate-200 rounded-lg px-2 py-2 focus:outline-none"
                            />
                            {/* [v7.6.41] Per-row shop: blank = this row
                                was bought at the entry shop above; a
                                typed/picked name makes this row its own
                                shop (Records shows it on its own line,
                                and that shop's Menu gets this row's
                                items). Same shop list + typed-name
                                handling as the entry shop field. */}
                            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2 focus-within:border-emerald-400">
                              <Store className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <input
                                type="text"
                                list={`shop-suggestions-split-${idx}`}
                                autoComplete="off"
                                value={row.shopName}
                                onChange={(e) => updateSplitRow(idx, { shopName: e.target.value })}
                                placeholder={lang === 'my' ? 'ဆိုင် (မထည့်ရင် အထက်က ဆိုင်အမည်)' : 'Shop (blank = entry shop above)'}
                                aria-label={lang === 'my' ? `တန်း ${idx + 1} ဆိုင်` : `Row ${idx + 1} shop`}
                                className="w-full min-h-[40px] text-xs font-bold bg-transparent border-0 focus:outline-none"
                              />
                            </div>
                            <datalist id={`shop-suggestions-split-${idx}`}>
                              {shopSuggestionsFor(row.shopName).map((s) => (
                                <option key={s.id} value={s.name} />
                              ))}
                            </datalist>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs font-bold flex-wrap">
                      <span className="text-slate-500">
                        {lang === 'my' ? 'ခွဲပြီး' : 'Split'}: {formatMMK(splitRowsTotal)} · {lang === 'my' ? 'ကျန်' : 'Remaining'}: <span className={splitRemaining === 0 ? 'text-emerald-700' : 'text-rose-600'}>{formatMMK(splitRemaining)}</span>
                      </span>
                      <button type="button" onClick={addSplitRow} className="px-2.5 py-1.5 rounded-lg border-2 border-dashed border-emerald-300 text-emerald-800 hover:bg-emerald-50">
                        + {lang === 'my' ? 'တန်းထပ်ထည့်' : 'Add row'}
                      </button>
                    </div>
                    {splitRemaining !== 0 && splitTotalAmount > 0 && (
                      <div className="text-[11px] font-bold text-rose-600">
                        {lang === 'my' ? 'ခွဲရေးပမာဏ စုစုပေါင်းသည် စုစုပေါင်းပမာဏနှင့် အတိအကျ တူရပါမည်' : 'Split amounts must add up exactly to the total amount.'}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* [v7.6.03] Tiles render in ONE row and ONLY once a
                vehicle entry path is chosen (entryModel off
                'general', via the top selector or the one-time
                auto-select) — on 'general' the top "🚗 ယာဉ် မှတ်တမ်း"
                selector is the only entry point. While EDITING the
                tiles stay hidden, as before: the edit restores its
                vehicle model via getResolvedModel, and the switcher
                dropdown above remains the edit path. [v7.6.14] In
                fresh-open vehicle mode the top Bar hides, so these
                tiles are the SOLE selector — and tapping the
                already-selected tile toggles back to 'general'
                (toggleOffVehicleMode). The fuel-guide button moved
                here from the hidden Bar so it stays reachable. A
                manual tile tap clears the auto-selected state. */}
            {isVehicleRelatedCategory && !isEditing && entryModel !== 'general' && (
              <div className="px-4 py-3 border-b border-slate-100">
                <div className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-blue-600" />
                  <span>{lang === 'my' ? 'ယာဉ် မှတ်တမ်း အမျိုးအစား ရွေးပါ:' : 'Select vehicle entry type:'}</span>
                  {/* [v7.6.14] Fuel guide, relocated from the top Bar
                      (hidden in fresh-open vehicle mode). */}
                  <button type="button" onClick={() => setShowFuelGuideModal(true)} className="ml-auto p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 shrink-0" title={lang === "my" ? "ဆီဖိုး လမ်းညွှန်" : "Fuel Guide"}>
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  <button type="button" onClick={() => { if (entryModel === "fuel") toggleOffVehicleMode(); else handleSwitchModel("fuel"); autoSelectedRef.current = false; autoSelectDoneRef.current = true; }} className={"min-h-11 py-2 px-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold text-xs flex flex-col items-center justify-center gap-1 transition-colors" + (entryModel === "fuel" ? " ring-2 ring-emerald-500 bg-emerald-100" : "")}><Fuel className="w-4 h-4 shrink-0" /><span className="leading-tight text-center">{lang === 'my' ? 'ဆီဖိုး' : 'Fuel'}</span></button>
                  <button type="button" onClick={() => { if (entryModel === "vehicle_service" && maintServiceType !== "tires") toggleOffVehicleMode(); else handleSwitchModel("vehicle_service"); autoSelectedRef.current = false; autoSelectDoneRef.current = true; }} className={"min-h-11 py-2 px-1 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 font-bold text-xs flex flex-col items-center justify-center gap-1 transition-colors" + (entryModel === "vehicle_service" && maintServiceType !== "tires" ? " ring-2 ring-blue-500 bg-blue-100" : "")}><Wrench className="w-4 h-4 shrink-0" /><span className="leading-tight text-center">{lang === 'my' ? 'ဝန်ဆောင်မှု' : 'Service'}</span></button>
                  <button type="button" onClick={() => { if (entryModel === "vehicle_service" && maintServiceType === "tires") toggleOffVehicleMode(); else { handleSwitchModel("vehicle_service"); setMaintServiceType("tires"); } autoSelectedRef.current = false; autoSelectDoneRef.current = true; }} className={"min-h-11 py-2 px-1 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-bold text-xs flex flex-col items-center justify-center gap-1 transition-colors" + (entryModel === "vehicle_service" && maintServiceType === "tires" ? " ring-2 ring-amber-500 bg-amber-100" : "")}><Car className="w-4 h-4 shrink-0" /><span className="leading-tight text-center">{lang === 'my' ? 'တာယာလဲလှယ်' : 'Tire Replace'}</span></button>
                  <button type="button" onClick={() => { if (entryModel === "tire_pressure") toggleOffVehicleMode(); else handleSwitchModel("tire_pressure"); autoSelectedRef.current = false; autoSelectDoneRef.current = true; }} className={"min-h-11 py-2 px-1 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 font-bold text-xs flex flex-col items-center justify-center gap-1 transition-colors" + (entryModel === "tire_pressure" ? " ring-2 ring-teal-500 bg-teal-100" : "")}><Gauge className="w-4 h-4 shrink-0" /><span className="leading-tight text-center">{lang === 'my' ? 'လေချိန်' : 'Pressure'}</span></button>
                </div>
              </div>
            )}

            {isTransferCategory && (
              <div className="px-4 py-3 border-b border-slate-100 space-y-2">
                <div className="text-xs font-bold text-indigo-900">{lang === 'my' ? 'ငွေလွှဲပြောင်းမှု' : 'Transfer'}</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-rose-700 mb-0.5">{lang === 'my' ? 'မှ' : 'From'}</div>
                    <select value={walletId} onChange={(e) => setWalletId(e.target.value)} className="w-full text-xs px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">{wallets.map((w) => (<option key={w.id} value={w.id}>{lang === 'my' ? w.name : w.nameEn}</option>))}</select>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-emerald-700 mb-0.5">{lang === 'my' ? 'သို့' : 'To'}</div>
                    <select value={transferToWalletId} onChange={(e) => setTransferToWalletId(e.target.value)} className="w-full text-xs px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">{wallets.filter((w) => w.id !== walletId).map((w) => (<option key={w.id} value={w.id}>{lang === 'my' ? w.name : w.nameEn}</option>))}</select>
                    {wallets.filter((w) => w.id !== walletId).length === 0 && (
                      <div className="text-[10px] font-bold text-rose-600 mt-1">{lang === 'my' ? 'ငွေလွှဲရန် အခြား Wallet မရှိသေးပါ — Wallet အသစ် အရင်ထည့်ပေးပါ' : 'No other wallet to transfer to — add another wallet first'}</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {entryModel === "fuel" && (
              <>
                <div className="px-4 py-3 border-b border-slate-100">
                  <div className="text-xs font-bold text-slate-500 mb-1">{lang === 'my' ? 'ယာဉ်' : 'Vehicle'}</div>
                  <select value={vehicleId} onChange={(e) => {
                    setVehicleId(e.target.value);
                    const v = vehicles.find((x) => x.id === e.target.value);
                    if (v?.currentOdometer) setVehicleOdometer(String(v.currentOdometer));
                    if (v?.fuelType) setFuelType(v.fuelType);
                    if (v?.walletId && wallets.some((w) => w.id === v.walletId)) setWalletId(v.walletId);
                  }} className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold">
                    {vehicleSelectOptions.length === 0 ? <option value="">{lang === 'my' ? '-- ယာဉ် မရှိသေး --' : '-- No vehicles --'}</option> : vehicleSelectOptions.map((v) => (<option key={v.id} value={v.id}>{v.name} {v.plateNumber ? "(" + v.plateNumber + ")" : ""}</option>))}
                  </select>
                </div>
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0"><Fuel className="w-5 h-5 text-emerald-600" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-500">{lang === 'my' ? 'ဆီပမာဏ (L)' : 'Liters (L)'}</div>
                    <input type="text" inputMode="decimal" value={fuelLiters} onChange={(e) => {
                      const v = e.target.value;
                      setFuelLiters(v);
                      const litersNum = parseMyanmarNumber(v) || 0;
                      const numPpl = parseMyanmarNumber(fuelPricePerLiter) || 0;
                      if (litersNum > 0 && numPpl > 0) setAmount(String(Number((litersNum * numPpl).toFixed(2))));
                    }} placeholder="0" className="w-full text-sm font-bold bg-transparent border border-slate-200 rounded-xl px-2 py-1.5 focus:outline-none font-mono mt-0.5" />
                  </div>
                </div>
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0"><span className="text-amber-600 font-black text-lg">K</span></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-500">{lang === 'my' ? '၁ လီတာ ဈေး (Ks)' : 'Price per Liter (Ks)'}</div>
                    <input type="text" inputMode="decimal" value={fuelPricePerLiter} onChange={(e) => {
                      setFuelPricePerLiter(e.target.value);
                      const numPpl = parseMyanmarNumber(e.target.value) || 0;
                      const numAmt = parseMyanmarNumber(amount) || 0;
                      if (numPpl > 0 && numAmt > 0) setFuelLiters(String(Number((numAmt / numPpl).toFixed(2))));
                    }} placeholder="0" className="w-full text-sm font-bold bg-transparent border-0 focus:outline-none font-mono mt-0.5" />
                    {lastFuelLogForComparison && lastFuelLogForComparison.pricePerLiter > 0 && fuelPricePerLiter && (
                      <div className="text-[10px] mt-1 flex items-center gap-1">
                        <span className="text-slate-500">{lang === 'my' ? 'ယခင်ဈေး:' : 'Prev:'} {lastFuelLogForComparison.pricePerLiter.toLocaleString()} Ks</span>
                        {Number(fuelPricePerLiter) > lastFuelLogForComparison.pricePerLiter ? (
                          <span className="text-rose-600 font-bold flex items-center gap-0.5"><TrendingUp className="w-3 h-3" /> +{Math.round(((Number(fuelPricePerLiter) - lastFuelLogForComparison.pricePerLiter) / lastFuelLogForComparison.pricePerLiter) * 100)}%</span>
                        ) : Number(fuelPricePerLiter) < lastFuelLogForComparison.pricePerLiter ? (
                          <span className="text-emerald-600 font-bold flex items-center gap-0.5"><TrendingDown className="w-3 h-3" /> {Math.round(((Number(fuelPricePerLiter) - lastFuelLogForComparison.pricePerLiter) / lastFuelLogForComparison.pricePerLiter) * 100)}%</span>
                        ) : <span className="text-slate-400">(Same)</span>}
                      </div>
                    )}
                  </div>
                </div>
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0"><Sparkles className="w-5 h-5 text-blue-600" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-500">{lang === 'my' ? 'ဆီအမျိုးအစား' : 'Fuel Type'}</div>
                    <select value={fuelType} onChange={(e) => setFuelType(e.target.value)} className="w-full text-sm font-bold bg-transparent border-0 focus:outline-none mt-0.5">
                      <option value="Octane 92">Octane 92</option>
                      <option value="Octane 95">Octane 95</option>
                      <option value="Premium Diesel">Premium Diesel</option>
                      <option value="Diesel">Diesel</option>
                      <option value="EV Charging">EV Charging</option>
                      <option value="CNG">CNG</option>
                    </select>
                  </div>
                </div>
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0"><History className="w-5 h-5 text-indigo-600" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-500">{lang === 'my' ? 'ဆီဆိုင်' : 'Gas Station'}</div>
                    <select value={fuelGasStation} onChange={(e) => setFuelGasStation(e.target.value)} className="w-full text-sm font-bold bg-transparent border-0 focus:outline-none mt-0.5">
                      <option value="">{lang === 'my' ? '-- ရွေးပါ --' : '-- Select --'}</option>
                      {Array.from(new Set([...GAS_STATIONS.filter(s => s !== 'Other'), ...customStations])).map((s) => (<option key={s} value={s}>{s}</option>))}
                      <option value="Other">{lang === 'my' ? '➕ အခြား / အသစ်ရေးရန်' : '➕ Other'}</option>
                    </select>
                    {fuelGasStation === 'Other' && (
                      <input type="text" value={customGasStation} onChange={(e) => setCustomGasStation(e.target.value)} placeholder={lang === 'my' ? 'ဆီဆိုင် အမည် ရိုက်ထည့်ပါ' : 'Type station name'} className="w-full mt-1.5 text-base font-bold bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-400" autoFocus />
                    )}
                  </div>
                </div>
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0"><Gauge className="w-5 h-5 text-slate-600" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-500">{lang === 'my' ? 'မိုင်တာ (km)' : 'Odometer (km)'}</div>
                    <input type="text" inputMode="decimal" value={vehicleOdometer} onChange={(e) => setVehicleOdometer(e.target.value)} placeholder="0" className="w-full text-sm font-bold bg-transparent border-0 focus:outline-none font-mono mt-0.5" />
                  </div>
                </div>
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">{fuelIsFullTank ? <Check className="w-5 h-5 text-emerald-600" /> : <X className="w-5 h-5 text-slate-400" />}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-500">{lang === 'my' ? 'တိုင်ကီအပြည့်' : 'Full Tank'}</div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">{fuelIsFullTank ? (lang === 'my' ? 'အပြည့်' : 'Yes') : (lang === 'my' ? 'တစ်စိတ်တပိုင်း' : 'Partial')}</div>
                  </div>
                  <button type="button" onClick={() => setFuelIsFullTank(!fuelIsFullTank)} className={"w-10 h-6 rounded-full transition-colors relative shrink-0 " + (fuelIsFullTank ? "bg-emerald-600" : "bg-slate-300")}><span className={"absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all " + (fuelIsFullTank ? "left-[18px]" : "left-0.5")} /></button>
                </div>
              </>
            )}

            {entryModel === "tire_pressure" && (
              <>
                <div className="px-4 py-3 border-b border-slate-100">
                  <div className="text-xs font-bold text-slate-500 mb-1">{lang === 'my' ? 'ယာဉ်' : 'Vehicle'}</div>
                  <select value={vehicleId} onChange={(e) => {
                    setVehicleId(e.target.value);
                    const v = vehicles.find((x) => x.id === e.target.value);
                    if (v?.currentOdometer) setVehicleOdometer(String(v.currentOdometer));
                    if (v?.walletId && wallets.some((w) => w.id === v.walletId)) setWalletId(v.walletId);
                  }} className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold">
                    {vehicleSelectOptions.length === 0 ? <option value="">{lang === 'my' ? '-- ယာဉ် မရှိသေး --' : '-- No vehicles --'}</option> : vehicleSelectOptions.map((v) => (<option key={v.id} value={v.id}>{v.name} {v.plateNumber ? "(" + v.plateNumber + ")" : ""}</option>))}
                  </select>
                </div>
                <div className="px-4 py-3 border-b border-slate-100">
                  <div className="text-xs font-bold text-slate-500 mb-1">{lang === 'my' ? 'တာယာ လေပေါင်ချိန် (PSI)' : 'Tire Pressure (PSI)'}</div>
                  {currentVehicle?.type === 'motorcycle' ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 min-w-0">
                        <div className="text-[10px] font-bold text-slate-500">{lang === 'my' ? 'ရှေ့ ဘီး' : 'Front'}</div>
                        <input type="text" inputMode="decimal" min={10} max={80} value={tireFL} onChange={(e) => setTireFL(e.target.value)} placeholder="32" className="w-full text-sm font-bold bg-transparent border-0 focus:outline-none font-mono mt-0.5" />
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 min-w-0">
                        <div className="text-[10px] font-bold text-slate-500">{lang === 'my' ? 'နောက် ဘီး' : 'Rear'}</div>
                        <input type="text" inputMode="decimal" min={10} max={80} value={tireRL} onChange={(e) => setTireRL(e.target.value)} placeholder="32" className="w-full text-sm font-bold bg-transparent border-0 focus:outline-none font-mono mt-0.5" />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 min-w-0">
                        <div className="text-[10px] font-bold text-slate-500">{lang === 'my' ? 'ရှေ့ ဘယ် (FL)' : 'Front Left (FL)'}</div>
                        <input type="text" inputMode="decimal" min={10} max={80} value={tireFL} onChange={(e) => setTireFL(e.target.value)} placeholder="32" className="w-full text-sm font-bold bg-transparent border-0 focus:outline-none font-mono mt-0.5" />
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 min-w-0">
                        <div className="text-[10px] font-bold text-slate-500">{lang === 'my' ? 'ရှေ့ ညာ (FR)' : 'Front Right (FR)'}</div>
                        <input type="text" inputMode="decimal" min={10} max={80} value={tireFR} onChange={(e) => setTireFR(e.target.value)} placeholder="32" className="w-full text-sm font-bold bg-transparent border-0 focus:outline-none font-mono mt-0.5" />
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 min-w-0">
                        <div className="text-[10px] font-bold text-slate-500">{lang === 'my' ? 'နောက် ဘယ် (RL)' : 'Rear Left (RL)'}</div>
                        <input type="text" inputMode="decimal" min={10} max={80} value={tireRL} onChange={(e) => setTireRL(e.target.value)} placeholder="32" className="w-full text-sm font-bold bg-transparent border-0 focus:outline-none font-mono mt-0.5" />
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 min-w-0">
                        <div className="text-[10px] font-bold text-slate-500">{lang === 'my' ? 'နောက် ညာ (RR)' : 'Rear Right (RR)'}</div>
                        <input type="text" inputMode="decimal" min={10} max={80} value={tireRR} onChange={(e) => setTireRR(e.target.value)} placeholder="32" className="w-full text-sm font-bold bg-transparent border-0 focus:outline-none font-mono mt-0.5" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0"><Gauge className="w-5 h-5 text-slate-600" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-500">{lang === 'my' ? 'မိုင်တာ (km)' : 'Odometer (km)'}</div>
                    <input type="text" inputMode="decimal" value={vehicleOdometer} onChange={(e) => setVehicleOdometer(e.target.value)} placeholder="0" className="w-full text-sm font-bold bg-transparent border-0 focus:outline-none font-mono mt-0.5" />
                  </div>
                </div>
              </>
            )}

            {entryModel === "vehicle_service" && (
              <>
                <div className="px-4 py-3 border-b border-slate-100">
                  <div className="text-xs font-bold text-slate-500 mb-1">{lang === 'my' ? 'ယာဉ်' : 'Vehicle'}</div>
                  <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold">
                    {vehicleSelectOptions.length === 0 ? <option value="">{lang === 'my' ? '-- ယာဉ် မရှိသေး --' : '-- No vehicles --'}</option> : vehicleSelectOptions.map((v) => (<option key={v.id} value={v.id}>{v.name}</option>))}
                  </select>
                </div>
                <div className="px-4 py-3 border-b border-slate-100">
                  <div className="text-xs font-bold text-slate-500 mb-1">{lang === 'my' ? 'ဝန်ဆောင်မှု အမျိုးအစား' : 'Service Type'}</div>
                  <select value={maintServiceType} onChange={(e) => setMaintServiceType(e.target.value as VehicleServiceType)} className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold">
                    <option value="engine_oil">{lang === "my" ? "🛢️ အင်ဂျင်ဝိုင်" : "🛢️ Engine Oil"}</option>
                    <option value="oil_filter">{lang === "my" ? "🔧 ဝိုင်စစ်" : "🔧 Oil Filter"}</option>
                    <option value="air_filter">{lang === "my" ? "💨 လေစစ်" : "💨 Air Filter"}</option>
                    <option value="fuel_filter">{lang === "my" ? "⛽ ဆီစစ်" : "⛽ Fuel Filter"}</option>
                    <option value="brake_pads">{lang === "my" ? "🛑 ဘရိတ်ရှူး" : "🛑 Brake Pads"}</option>
                    <option value="brake_fluid">{lang === "my" ? "🧪 ဘရိတ်ဆီ" : "🧪 Brake Fluid"}</option>
                    <option value="tires">{lang === "my" ? "🛞 တာယာ လဲလှယ်" : "🛞 Tire Replacement"}</option>
                    <option value="battery">{lang === "my" ? "🔋 ဘက်ထရီ" : "🔋 Battery"}</option>
                    <option value="spark_plugs">{lang === "my" ? "⚡ ပလပ်" : "⚡ Spark Plugs"}</option>
                    <option value="transmission_fluid">{lang === "my" ? "⚙️ ဂီယာဝိုင်" : "⚙️ Transmission Fluid"}</option>
                    <option value="coolant">{lang === "my" ? "💧 ရေတိုင်ကီ" : "💧 Coolant"}</option>
                    <option value="fan_belt">{lang === "my" ? "🔗 ပန်ကာကြိုး" : "🔗 Fan Belt"}</option>
                    <option value="timing_belt">{lang === "my" ? "⏱️ တိုင်မင်ကြိုး" : "⏱️ Timing Belt"}</option>
                    <option value="wheel_alignment">{lang === "my" ? "🎯 ဘီးချိန်" : "🎯 Wheel Alignment"}</option>
                    <option value="suspension">{lang === "my" ? "🪑 ရှော့ဘား" : "🪑 Suspension"}</option>
                    <option value="wiper_blades">{lang === "my" ? "🌧️ ဝိုင်ပါ" : "🌧️ Wiper Blades"}</option>
                    <option value="general_repair">{lang === "my" ? "🔨 အထွေထွေ ပြုပြင်" : "🔨 General Repair"}</option>
                    <option value="license_renewal">{lang === "my" ? "🪪 လိုင်စင် သက်တမ်းတိုး" : "🪪 License Renewal"}</option>
                    <option value="other">{lang === "my" ? "📦 အခြား" : "📦 Other"}</option>
                  </select>
                </div>

                {maintServiceType === 'license_renewal' ? (
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0"><Calendar className="w-5 h-5 text-indigo-600" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-500">{lang === 'my' ? 'ကုန်ဆုံးမည့်ရက်စွဲ (Expiry Date) *' : 'Expiry Date *'}</div>
                      <input type="date" value={maintExpiryDate} onChange={(e) => {
                        setMaintExpiryDate(e.target.value);
                        if (e.target.value && date) {
                          const d1 = new Date(date).getTime();
                          const d2 = new Date(e.target.value).getTime();
                          if (!isNaN(d1) && !isNaN(d2)) {
                            const diff = Math.ceil((d2 - d1) / (1000 * 3600 * 24));
                            setMaintLifespanDays(String(diff > 0 ? diff : 0));
                          }
                        }
                      }} className="w-full text-sm font-bold bg-transparent border-0 focus:outline-none mt-0.5" />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                      <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                      <input type="text" value={maintTitle} onChange={(e) => setMaintTitle(e.target.value)} placeholder={lang === 'my' ? 'ခေါင်းစဉ် / အသေးစိတ်' : 'Title / Details'} className="flex-1 min-w-0 text-sm font-bold bg-transparent border-0 focus:outline-none" />
                    </div>
                    {/* [v7.5.93] Multi-row service entries — one row per
                        part / service, EACH with its own service type, so
                        one visit can track several services separately.
                        Same mechanics as the shopping list (name +
                        past-price hint + near-duplicate warning, price /
                        qty / amount, unit, never zero rows); the rows
                        total drives the shared amount input live via
                        updateShoppingItem. Hidden for license renewal. */}
                    <div className="px-3 py-3 border-b border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5"><Wrench className="w-3.5 h-3.5" />{lang === 'my' ? 'လဲလှယ်သည့် ပစ္စည်း / ဝန်ဆောင်မှု' : 'Parts / Services'}</span>
                      </div>
                      <div ref={shoppingListContainerRef} className="space-y-2 max-h-72 overflow-y-auto overflow-x-hidden pr-1">
                        {shoppingItems.map((item, idx) => {
                          const pastPurchase = getPastPriceForItem(item.name);
                          const similarName = item.name.trim() ? findSimilarItemName(item.name) : null;
                          return (
                            <div key={item.id || idx} className="bg-slate-50 rounded-xl p-2.5 space-y-1.5">
                              <div className="flex items-center gap-2">
                                <select
                                  value={item.serviceType || maintServiceType}
                                  onChange={(e) => updateShoppingItem(item.id || '', 'serviceType', e.target.value as VehicleServiceType)}
                                  className="flex-1 min-w-0 min-h-[44px] text-sm font-bold bg-white border border-slate-200 rounded-lg px-2 focus:outline-none"
                                >
                                  {ROW_SERVICE_TYPES.map((t) => (
                                    <option key={t} value={t}>{lang === 'my' ? SERVICE_TYPE_CONFIG[t].labelMy : SERVICE_TYPE_CONFIG[t].labelEn}</option>
                                  ))}
                                </select>
                                <button type="button" onClick={() => removeShoppingItemRow(item.id || '')} className="p-1 text-slate-400 hover:text-rose-600 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                              <div className="flex items-center gap-2">
                                <input type="text" id={`input-name-${item.id || idx}`} list="db-item-suggestions" value={item.name} onChange={(e) => updateShoppingItem(item.id || '', 'name', e.target.value)} placeholder={lang === 'my' ? 'ပစ္စည်းအမည်' : 'Item name'} className="flex-1 min-w-0 text-base font-bold bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none" />
                              </div>
                              {similarName && (
                                <button type="button" onClick={() => updateShoppingItem(item.id || '', 'name', similarName.name)} className="w-full text-left text-[11px] font-semibold text-amber-800 bg-amber-100/80 hover:bg-amber-100 border border-amber-200 rounded-lg px-2 py-1">
                                  {lang === 'my'
                                    ? `⚠️ ဆင်တူသော အမည် ရှိပါသည်: “${similarName.name}”${similarName.latestPrice > 0 ? ` (${formatMMK(similarName.latestPrice)})` : ''} — နှိပ်၍ သုံးမည်`
                                    : `⚠️ Similar name exists: “${similarName.name}”${similarName.latestPrice > 0 ? ` (${formatMMK(similarName.latestPrice)})` : ''} — tap to use it`}
                                </button>
                              )}
                              <div className="grid grid-cols-3 gap-1.5">
                                <input type="text" inputMode="decimal" value={item.price || ''} onChange={(e) => updateShoppingItem(item.id || '', 'price', e.target.value)} placeholder="ဈေး" className="min-w-0 w-full text-base font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 focus:outline-none font-mono" />
                                <input type="text" inputMode="decimal" value={item.quantity || ''} onChange={(e) => updateShoppingItem(item.id || '', 'quantity', e.target.value)} placeholder="Qty" className="min-w-0 w-full text-base font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 focus:outline-none font-mono text-center" />
                                <input type="text" inputMode="decimal" value={item.amount || ''} onChange={(e) => updateShoppingItem(item.id || '', 'amount', e.target.value)} placeholder="Total" className="min-w-0 w-full text-base font-bold bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 focus:outline-none font-mono text-right" />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold text-slate-500 shrink-0">{lang === 'my' ? 'ယူနစ်' : 'Unit'}</span>
                                <select
                                  value={resolveMenuUnitSelectValue(item.unit, knownUnits)}
                                  onChange={(e) => updateShoppingItem(item.id || '', 'unit', e.target.value)}
                                  className="flex-1 min-w-0 min-h-[44px] text-sm font-bold bg-white border border-slate-200 rounded-lg px-2 focus:outline-none"
                                >
                                  {menuUnitSelectOptions(knownUnits).map((u) => (
                                    <option key={u.value} value={u.value}>{lang === 'my' ? u.labelMy : u.labelEn}</option>
                                  ))}
                                </select>
                              </div>
                              {/* [v7.5.95 U1] 'အခြား' / a custom unit reveals a
                                  free-text input: a stored custom unit shows
                                  its text prefilled; the typed text IS the
                                  saved unit and reappears next time. */}
                              {menuUnitNeedsCustomInput(item.unit, knownUnits) && (
                                <input
                                  type="text"
                                  value={customMenuUnitText(item.unit)}
                                  onChange={(e) => updateShoppingItem(item.id || '', 'unit', e.target.value)}
                                  placeholder={lang === 'my' ? 'ယူနစ် ရိုက်ထည့်ပါ (ဥပမာ - ဗူး)' : 'Type a unit (e.g. per bottle)'}
                                  className="w-full min-h-[44px] text-sm font-bold bg-amber-50 border border-amber-200 rounded-lg px-2 focus:outline-none"
                                />
                              )}
                              {pastPurchase && item.price > 0 && (<div className="text-[10px] text-slate-500">{lang === 'my' ? 'ယခင်:' : 'Prev:'} {formatMMK(pastPurchase.price)} ({pastPurchase.date})</div>)}
                            </div>
                          );
                        })}
                      </div>
                      <button type="button" onClick={() => addShoppingItemRow(maintServiceType)} className="w-full mt-2 py-1.5 border-2 border-dashed border-amber-300 rounded-xl text-xs font-bold text-amber-800 hover:bg-amber-50">+ {lang === 'my' ? 'ပစ္စည်း ထည့်မည်' : 'Add item'}</button>
                    </div>
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                      <Wrench className="w-4 h-4 text-slate-400 shrink-0" />
                      <input type="text" value={maintWorkshopName} onChange={(e) => setMaintWorkshopName(e.target.value)} placeholder={lang === 'my' ? 'ဝပ်ရှော့ အမည်' : 'Workshop name'} className="flex-1 min-w-0 text-sm font-bold bg-transparent border-0 focus:outline-none" />
                    </div>
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0"><Gauge className="w-5 h-5 text-slate-600" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-500">{lang === 'my' ? 'မိုင်တာ (km)' : 'Odometer (km)'}</div>
                        <input type="text" inputMode="decimal" value={vehicleOdometer} onChange={(e) => setVehicleOdometer(e.target.value)} placeholder="0" className="w-full text-sm font-bold bg-transparent border-0 focus:outline-none font-mono mt-0.5" />
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {/* [v7.6.25] One form: the item rows below are the only
                general entry UI — the old unit_qty branch (single
                item + price + qty + unit) is deleted; its unit
                select lives on every row now. Transfers never
                render rows (their amount is the shared total). */}
            {entryModel === "general" && !isTransferCategory && (
              <div className="px-3 py-3 border-b border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5"><ShoppingCart className="w-3.5 h-3.5" />{lang === 'my' ? 'ဈေးဝယ်စာရင်း' : 'Shopping List'}</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setIsShoppingPriceHistoryOpen(true)} className="text-[10px] font-bold text-indigo-700 hover:underline">{lang === 'my' ? 'ဈေးနှိုင်းယှဉ်' : 'History'}</button>
                    <button type="button" onClick={autoGenerateShoppingNote} className="text-[10px] font-bold text-amber-800 hover:underline">✨ {lang === 'my' ? 'မှတ်ချက်ရေး' : 'Note'}</button>
                  </div>
                </div>
                <div ref={shoppingListContainerRef} className="space-y-2 max-h-72 overflow-y-auto overflow-x-hidden pr-1">
                  {shoppingItems.map((item, idx) => {
                    const pastPurchase = getPastPriceForItem(item.name);
                    // [v7.5.60 E-S73] Near-duplicate name suggestion —
                    // shown only when the typed name is close to (but not
                    // exactly) an existing item name.
                    const similarName = item.name.trim() ? findSimilarItemName(item.name) : null;
                    return (
                      <div key={item.id || idx} className="bg-slate-50 rounded-xl p-2.5 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <input type="text" list="db-item-suggestions" value={item.name} onChange={(e) => updateShoppingItem(item.id || "", "name", e.target.value)} placeholder={lang === 'my' ? 'ပစ္စည်းအမည်' : 'Item name'} className="flex-1 min-w-0 text-base font-bold bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none" />
                          <button type="button" onClick={() => removeShoppingItemRow(item.id || "")} className="p-1 text-slate-400 hover:text-rose-600 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                        {similarName && (
                          <button type="button" onClick={() => updateShoppingItem(item.id || "", "name", similarName.name)} className="w-full text-left text-[11px] font-semibold text-amber-800 bg-amber-100/80 hover:bg-amber-100 border border-amber-200 rounded-lg px-2 py-1">
                            {lang === 'my'
                              ? `⚠️ ဆင်တူသော အမည် ရှိပါသည်: “${similarName.name}”${similarName.latestPrice > 0 ? ` (${formatMMK(similarName.latestPrice)})` : ''} — နှိပ်၍ သုံးမည်`
                              : `⚠️ Similar name exists: “${similarName.name}”${similarName.latestPrice > 0 ? ` (${formatMMK(similarName.latestPrice)})` : ''} — tap to use it`}
                          </button>
                        )}
                        <div className="grid grid-cols-3 gap-1.5">
                          <input type="text" inputMode="decimal" value={item.price || ""} onChange={(e) => updateShoppingItem(item.id || "", "price", e.target.value)} placeholder="ဈေး" className="min-w-0 w-full text-base font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 focus:outline-none font-mono" />
                          <input type="text" inputMode="decimal" value={item.quantity || ""} onChange={(e) => updateShoppingItem(item.id || "", "quantity", e.target.value)} placeholder="Qty" className="min-w-0 w-full text-base font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 focus:outline-none font-mono text-center" />
                          <input type="text" inputMode="decimal" value={item.amount || ""} onChange={(e) => updateShoppingItem(item.id || "", "amount", e.target.value)} placeholder="Total" className="min-w-0 w-full text-base font-bold bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 focus:outline-none font-mono text-right" />
                        </div>
                        {/* [v7.5.82] Per-item unit — the basis of `price`
                            (ခု / ပါကင် / ကီလို …). The menu diff
                            matches by name AND unit, so the same item at
                            a different unit becomes a separate menu line. */}
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-500 shrink-0">{lang === 'my' ? 'ယူနစ်' : 'Unit'}</span>
                          <select
                            value={resolveMenuUnitSelectValue(item.unit, knownUnits)}
                            onChange={(e) => updateShoppingItem(item.id || '', 'unit', e.target.value)}
                            className="flex-1 min-w-0 min-h-[44px] text-sm font-bold bg-white border border-slate-200 rounded-lg px-2 focus:outline-none"
                          >
                            {menuUnitSelectOptions(knownUnits).map((u) => (
                              <option key={u.value} value={u.value}>{lang === 'my' ? u.labelMy : u.labelEn}</option>
                            ))}
                          </select>
                        </div>
                        {/* [v7.5.95 U1] 'အခြား' / a custom unit reveals a
                            free-text input: a stored custom unit shows
                            its text prefilled; the typed text IS the
                            saved unit and reappears next time. */}
                        {menuUnitNeedsCustomInput(item.unit, knownUnits) && (
                          <input
                            type="text"
                            value={customMenuUnitText(item.unit)}
                            onChange={(e) => updateShoppingItem(item.id || '', 'unit', e.target.value)}
                            placeholder={lang === 'my' ? 'ယူနစ် ရိုက်ထည့်ပါ (ဥပမာ - ဗူး)' : 'Type a unit (e.g. per bottle)'}
                            className="w-full min-h-[44px] text-sm font-bold bg-amber-50 border border-amber-200 rounded-lg px-2 focus:outline-none"
                          />
                        )}
                        {pastPurchase && item.price > 0 && (<div className="text-[10px] text-slate-500">{lang === 'my' ? 'ယခင်:' : 'Prev:'} {formatMMK(pastPurchase.price)} ({pastPurchase.date})</div>)}
                      </div>
                    );
                  })}
                </div>
                <button type="button" onClick={() => addShoppingItemRow()} className="w-full mt-2 py-1.5 border-2 border-dashed border-amber-300 rounded-xl text-xs font-bold text-amber-800 hover:bg-amber-50">+ {lang === 'my' ? 'ပစ္စည်းထပ်ထည့်' : 'Add item'}</button>
              </div>
            )}

            {entryModel === "general" && latestPreviousPurchase && currentEffectivePrice > 0 && priceComparison && (
              <div className="px-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  <History className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className="text-slate-500">{lang === 'my' ? 'ယခင်ဈေး' : 'Prev'}:</span>
                  <button type="button" onClick={handleApplyPreviousPrice} className="font-bold text-indigo-700 underline font-mono">{formatMMK(latestPreviousPurchase.amount)}</button>
                  {priceComparison.isHigher && (<span className="text-rose-600 font-bold flex items-center gap-0.5 ml-auto"><TrendingUp className="w-3 h-3" /> +{Math.round(priceComparison.percent)}%</span>)}
                  {priceComparison.isLower && (<span className="text-emerald-600 font-bold flex items-center gap-0.5 ml-auto"><TrendingDown className="w-3 h-3" /> {Math.round(priceComparison.percent)}%</span>)}
                  {priceComparison.isEqual && (<span className="text-slate-500 font-bold ml-auto flex items-center gap-0.5"><Minus className="w-3 h-3" /> {lang === 'my' ? 'တူညီ' : 'Same'}</span>)}
                </div>
              </div>
            )}

            <button type="button" onClick={() => setWalletExpanded(!walletExpanded)} className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 hover:bg-slate-50 transition-colors text-left">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0" style={{ backgroundColor: selectedWallet?.color || "#6366F1" }}><Wallet className="w-5 h-5" /></div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-slate-900 truncate">{selectedWallet ? (lang === 'my' ? selectedWallet.name : selectedWallet.nameEn) : (lang === 'my' ? 'ပိုက်ဆံအိတ်' : 'Wallet')}</div>
                <div className="text-xs text-slate-500 truncate mt-0.5 font-mono">{formatCurrency(selectedWallet?.balance || 0, selectedWallet?.currency || 'MMK')}</div>
              </div>
              <span className="text-slate-300 text-xl shrink-0">›</span>
            </button>
            {walletExpanded && (
              <div className="px-3 py-2 border-b border-slate-100 flex flex-wrap gap-1.5">
                {wallets.map((w) => (
                  <button key={w.id} type="button" onClick={() => { setWalletId(w.id); setWalletExpanded(false); }} className={"px-3 py-1.5 rounded-lg text-xs font-bold transition-colors " + (walletId === w.id ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200")}>
                    <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: w.color }} />{lang === 'my' ? w.name : w.nameEn}
                  </button>
                ))}
              </div>
            )}

            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0"><Calendar className="w-5 h-5 text-blue-600" /></div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-500">{lang === 'my' ? 'နေ့ရက်' : 'Date'}</div>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full text-sm font-bold bg-transparent border-0 focus:outline-none mt-0.5" />
              </div>
            </div>

            {entryModel === "general" && (
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                  <Store className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-500">{lang === 'my' ? 'ဆိုင်အမည် (Shop Name)' : 'Shop Name'}</div>
                  <input
                    type="text"
                    list="shop-suggestions"
                    autoComplete="off"
                    value={shopName}
                    onChange={(e) => { setShopName(e.target.value); setShopInput(e.target.value); }}
                    placeholder={lang === 'my' ? 'ဆိုင်အမည် ရိုက်ထည့်ပါ သို့မဟုတ် ရွေးပါ' : 'Type or select shop name'}
                    className="w-full text-sm font-bold bg-transparent border-0 focus:outline-none mt-0.5"
                  />
                  {isNewShopName && (
                    <label className="flex items-start gap-2 mt-2 cursor-pointer select-none">
                      <input type="checkbox" checked={publishShopOptIn} onChange={(e) => setPublishShopOptIn(e.target.checked)} className="w-4 h-4 accent-emerald-600 mt-0.5 shrink-0" />
                      <span className="text-[11px] font-semibold text-slate-600">{lang === 'my' ? 'ဤဆိုင်အမည်ကို အများပြင် ဆိုင်လမ်းညွှန် (public directory) တွင် ထည့်သွင်းမည်' : 'Add this shop to the public shop directory'}</span>
                    </label>
                  )}
                </div>
              </div>
            )}

            <div className="px-4 py-3 border-b border-slate-100">
              <button type="button" onClick={() => setNoteExpanded(!noteExpanded)} className="w-full flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0"><FileText className="w-5 h-5 text-slate-600" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-500">{lang === 'my' ? 'မှတ်ချက်' : 'Note'}</div>
                  <div className="text-sm font-bold text-slate-900 truncate mt-0.5">{extraNote || (lang === 'my' ? 'ထည့်ရန် နှိပ်ပါ' : 'Tap to add')}</div>
                </div>
              </button>
              {noteExpanded && (<input type="text" value={extraNote} onChange={(e) => setExtraNote(e.target.value)} autoFocus placeholder={lang === 'my' ? 'မှတ်ချက် ထည့်ပါ...' : 'Note...'} className="w-full mt-2 text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none" />)}
            </div>

            {!isActionAllowed && (
              <div className="mx-3 my-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-amber-800 text-xs font-bold">
                <Lock className="w-4 h-4 text-amber-600 shrink-0" /><span className="min-w-0">{lang === 'my' ? 'ဤ Wallet ပိုင်ရှင်မှ ခွင့်မပြုထားပါ' : 'Permission denied by wallet owner'}</span>
              </div>
            )}

            <datalist id="shop-suggestions">
              {filteredShopsForDatalist.map((s) => (
                <option key={s.id} value={s.name} />
              ))}
            </datalist>

            <datalist id="db-item-suggestions">
              {filteredItemsForDatalist.map((item) => (
                <option key={item.normalizedName} value={item.name} label={item.latestPrice > 0 ? formatMMK(item.latestPrice) + " (" + item.latestDate + ")" : undefined} />
              ))}
            </datalist>

            <div className="h-4" />
          </div>
        </form>

        {/* [v7.5.60 S10] Backfill confirm — inline dialog that resolves
            the promise handleSubmit is awaiting (no window.confirm). */}
        {backfillPrompt && (
          <div className="absolute inset-0 z-10 bg-slate-900/50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-200 p-5 space-y-4">
              <h3 className="font-bold text-base text-slate-900">
                {lang === 'my' ? 'အဟောင်းမှတ်တမ်း ပြန်ဖြည့်တာလား?' : 'Backfill an older record?'}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">{backfillPrompt.message}</p>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button type="button" onClick={() => { backfillPrompt.resolve(false); setBackfillPrompt(null); }} className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs cursor-pointer">
                  {lang === 'my' ? 'မလုပ်တော့ပါ' : 'Cancel'}
                </button>
                <button type="button" onClick={() => { backfillPrompt.resolve(true); setBackfillPrompt(null); }} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer">
                  {lang === 'my' ? 'ဟုတ်ကဲ့၊ ပြန်ဖြည့်တာပါ' : 'Yes, backfill'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {isShoppingPriceHistoryOpen && (
        <ItemPriceHistoryModal isOpen={isShoppingPriceHistoryOpen} onClose={() => setIsShoppingPriceHistoryOpen(false)} transactions={allTransactions} categories={categories} wallets={wallets} lang={lang} />
      )}

      <CategoryPickerModal isOpen={isCategoryPickerOpen} onClose={() => setIsCategoryPickerOpen(false)} categories={visibleCategories} selectedCategoryId={categoryId} selectedSubCategoryId={subCategoryId} currentType={type} lang={lang} plan={plan} onSelect={(catId, subId) => { handlePrimaryCategorySelect(catId, subId); }} onOpenUpgrade={onOpenUpgrade} onAddSubCategory={onAddSubCategory} onManageCategories={onManageCategories} allTransactions={allTransactions} />
      {/* [v7.6.07] Per-row picker for the split section. */}
      <CategoryPickerModal isOpen={splitPickerRow !== null} onClose={() => setSplitPickerRow(null)} categories={visibleCategories} selectedCategoryId={splitPickerRow !== null ? (splitRows[splitPickerRow]?.categoryId || '') : ''} selectedSubCategoryId={splitPickerRow !== null ? (splitRows[splitPickerRow]?.subCategoryId || '') : ''} currentType={type} lang={lang} plan={plan} onSelect={(catId, subId) => { if (splitPickerRow !== null) handleSplitRowCategorySelect(splitPickerRow, catId, subId); }} onOpenUpgrade={onOpenUpgrade} onAddSubCategory={onAddSubCategory} onManageCategories={onManageCategories} allTransactions={allTransactions} />

      <FuelExpenseGuideModal isOpen={showFuelGuideModal} onClose={() => setShowFuelGuideModal(false)} lang={lang} />
    </div>
  );
};
