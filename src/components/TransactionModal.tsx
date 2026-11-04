import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ArrowDownLeft, ArrowUpRight, Calendar, Wallet, Tag, FileText, Lock, Sparkles, Check, History, TrendingUp, TrendingDown, Minus, ShoppingCart, Trash2, X, Boxes, Car, Fuel, Wrench, Gauge, ChevronDown, ChevronUp, HelpCircle, Store } from 'lucide-react';
import {
  Category,
  PlanType,
  SubCategory,
  Transaction,
  TransactionItem,
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
import { formatMMK, formatLakhs } from '../utils/formatters';
import { formatCurrency } from '../utils/currency';
import { getLocalDateString } from '../utils/dateUtils';
import { parseMyanmarNumber } from '../utils/myanmarDigits';
import { CategoryIcon } from './CategoryIcon';
import { ItemPriceHistoryModal } from './ItemPriceHistoryModal';
import { CategoryPickerModal } from './CategoryPickerModal';
import { FuelExpenseGuideModal } from './vehicles/FuelExpenseGuideModal';
import { useAuth } from '../context/AuthContext';
import { getCollaboratorPermissions } from '../utils/permissions';
import { getAllItemSuggestions, findMatchingItemInfo, normalizeItemName } from '../utils/itemIntelligence';
import type { UnifiedItemInfo } from '../utils/itemIntelligence';
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
  publicShops?: Array<{ id: string; name: string }>;
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
  onOpenAddVehicle?: () => void;
  onOpenVehicleManagement?: () => void;
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
  plan,
  lang,
  onClose,
  onSubmit,
  onOpenUpgrade,
  onAddSubCategory,
  onManageCategories,
  onOpenAddVehicle,
  onOpenVehicleManagement,
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
  const formRef = React.useRef<HTMLFormElement>(null);

  const [entryMode, setEntryMode] = useState<'direct' | 'unit_qty' | 'shopping_list'>(
    editTransaction?.unitPrice
      ? 'unit_qty'
      : editTransaction?.items && editTransaction.items.length > 0
      ? 'shopping_list'
      : 'direct'
  );

  const [unitPrice, setUnitPrice] = useState<string>(
    editTransaction?.unitPrice ? String(editTransaction.unitPrice) : ''
  );
  const [quantity, setQuantity] = useState<string>(
    editTransaction?.quantity ? String(editTransaction.quantity) : '1'
  );

  const [shoppingItems, setShoppingItems] = useState<TransactionItem[]>(
    editTransaction?.items && editTransaction.items.length > 0
      ? editTransaction.items
      : [{ id: 'item_1', name: '', price: 0, quantity: 1, amount: 0 }]
  );

  const [unitQtyLastEdited, setUnitQtyLastEdited] = useState<'price' | 'qty' | 'total' | null>(null);
  const shoppingLastEditedRef = useRef<Record<string, 'price' | 'qty' | 'amount'>>({});
  const unitQtyAmountTimerRef = useRef<NodeJS.Timeout | null>(null);
  const shoppingAmountTimersRef = useRef<Record<string, NodeJS.Timeout>>({});

  const [showQuickAddSub, setShowQuickAddSub] = useState(true);
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
      if (editTransaction) {
        if (isNewlyOpened || isEditTxChanged) {
          if (unitQtyAmountTimerRef.current) clearTimeout(unitQtyAmountTimerRef.current);
          Object.values(shoppingAmountTimersRef.current).forEach(clearTimeout);
          shoppingAmountTimersRef.current = {};
          setUnitQtyLastEdited(null);
          shoppingLastEditedRef.current = {};
          setType(editTransaction.type);
          setAmount(String(editTransaction.amount));
          setCategoryId(editTransaction.category || '');
          setSubCategoryId(editTransaction.subCategoryId || '');
          setWalletId(editTransaction.walletId || wallets[0]?.id || 'cash');
          setDate(getLocalDateString(editTransaction.date));
          const fullNote = editTransaction.note || '';
          if (editTransaction.items && editTransaction.items.length > 0) {
            if (editTransaction.unitPrice) {
              setItemName(editTransaction.items[0].name || '');
              setExtraNote(fullNote);
            } else {
              setItemName('');
              setExtraNote(fullNote);
            }
          } else if (editTransaction.unitPrice) {
            const match = fullNote.match(/^(.*) \((.*)\)$/);
            if (match) {
              setItemName(match[1].trim());
              setExtraNote(match[2].trim());
            } else {
              setItemName(fullNote);
              setExtraNote('');
            }
          } else {
            const match = fullNote.match(/^(.*) \((.*)\)$/);
            if (match) {
              setItemName(match[1].trim());
              setExtraNote(match[2].trim());
            } else {
              setItemName(fullNote);
              setExtraNote('');
            }
          }
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

          if (editTransaction.unitPrice) {
            setEntryMode('unit_qty');
            setUnitPrice(String(editTransaction.unitPrice));
            setQuantity(String(editTransaction.quantity || 1));
          } else if (editTransaction.items && editTransaction.items.length > 0) {
            setEntryMode('shopping_list');
            setShoppingItems(editTransaction.items);
          } else {
            setEntryMode('direct');
          }
          setShowQuickAddSub(false);
          setNewSubName('');
        }
      } else if (isNewlyOpened) {
        setUnitQtyLastEdited(null);
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
        setEntryMode('direct');
        setUnitPrice('');
        setQuantity('1');
        setShoppingItems([{ id: 'item_1', name: '', price: 0, quantity: 1, amount: 0 }]);
        setShowQuickAddSub(true);
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
      }
      setFormError('');
      setIsSubmitting(false);
      setPendingTypeChange(null);
      setBackfillPrompt(null);
    }
  }, [isOpen, editTransaction, initialType, initialWalletId, wallets, user, fuelLogs, vehicleMaintenance, tirePressureLogs]);

  const computeUnitQtyThird = (edited: 'price' | 'qty' | 'total', pNum: number, qNum: number, tot: number) => {
    const last = unitQtyLastEdited;
    if (edited === 'price') {
      if (last === 'qty') { const t = pNum * qNum; setAmount(t > 0 ? String(Number(t.toFixed(2))) : ''); }
      else if (last === 'total') { if (pNum > 0) setQuantity(String(Number((tot / pNum).toFixed(2)))); }
      else { if (qNum > 0) { const t = pNum * qNum; setAmount(t > 0 ? String(Number(t.toFixed(2))) : ''); } else if (pNum > 0 && tot > 0) setQuantity(String(Number((tot / pNum).toFixed(2)))); }
    } else if (edited === 'qty') {
      if (last === 'price') { const t = pNum * qNum; setAmount(t > 0 ? String(Number(t.toFixed(2))) : ''); }
      else if (last === 'total') { if (qNum > 0) setUnitPrice(String(Number((tot / qNum).toFixed(2)))); }
      else { if (pNum > 0) { const t = pNum * qNum; setAmount(t > 0 ? String(Number(t.toFixed(2))) : ''); } else if (qNum > 0 && tot > 0) setUnitPrice(String(Number((tot / qNum).toFixed(2)))); }
    } else {
      if (last === 'price') { if (pNum > 0) setQuantity(String(Number((tot / pNum).toFixed(2)))); }
      else if (last === 'qty') { if (qNum > 0) setUnitPrice(String(Number((tot / qNum).toFixed(2)))); }
      else { if (pNum > 0) setQuantity(String(Number((tot / pNum).toFixed(2)))); else if (qNum > 0) setUnitPrice(String(Number((tot / qNum).toFixed(2)))); else { setQuantity('1'); setUnitPrice(String(tot)); } }
    }
    setUnitQtyLastEdited(edited);
  };

  const handleUnitQtyChange = (field: 'price' | 'qty', val: string) => {
    const p = field === 'price' ? val : unitPrice;
    const q = field === 'qty' ? val : quantity;
    const pNum = parseMyanmarNumber(p) || 0;
    const qNum = parseMyanmarNumber(q) || 0;
    const tot = parseMyanmarNumber(amount) || 0;
    if (field === 'price') setUnitPrice(val); else setQuantity(val);
    computeUnitQtyThird(field, pNum, qNum, tot);
  };

  const handleUnitQtyAmountChange = (amtStr: string) => {
    setAmount(amtStr);
    if (unitQtyAmountTimerRef.current) clearTimeout(unitQtyAmountTimerRef.current);
    unitQtyAmountTimerRef.current = setTimeout(() => {
      const tot = parseMyanmarNumber(amtStr) || 0;
      if (tot <= 0) { setUnitQtyLastEdited('total'); return; }
      const pNum = parseMyanmarNumber(unitPrice) || 0;
      const qNum = parseMyanmarNumber(quantity) || 0;
      computeUnitQtyThird('total', pNum, qNum, tot);
    }, 500);
  };

  const unifiedItemSuggestions = useMemo(() => {
    return getAllItemSuggestions(allTransactions, categories);
  }, [allTransactions, categories]);

  const updateShoppingItem = (id: string, field: keyof TransactionItem, val: any) => {
    setShoppingItems((prev) => {
      const updated = prev.map((item) => {
        if (item.id === id) {
          const newItem = { ...item, [field]: val };
          if (field === 'name' && typeof val === 'string' && val.trim().length >= 1) {
            // [FIX] Only auto-switch if current category is not Vehicle related.
            const isVehCat = categoryId?.startsWith('cat_vehicle') || categoryId?.startsWith('cat_expense_car');
            if (!isVehCat) {
              const match = findMatchingItemInfo(val, unifiedItemSuggestions);
              if (match && match.categoryId && (!categoryId || categoryId === 'cat_food' || categoryId === 'cat_expense_other')) {
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

  const addShoppingItemRow = () => {
    const newId = `item_${Date.now()}`;
    newlyAddedItemIdRef.current = newId;
    setShoppingItems((prev) => [
      ...prev,
      { id: newId, name: '', price: 0, quantity: 1, amount: 0 },
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
    const summary = validItems.map((i) => `${i.name.trim()}${i.quantity > 1 ? ` x${i.quantity}` : ''} (${formatMMK(i.amount)})`).join(' + ');
    setExtraNote(summary);
  };

  const filteredCats = useMemo(() => {
    const cats = categories.filter(
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
  }, [categories, type, allTransactions, lang]);

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
    if (entryModel !== 'general') return;
    if (!subCategoryId) return;
    if (subCategoryId === 'sub_veh_fuel') {
      handleSwitchModel('fuel');
    } else if (subCategoryId === 'sub_veh_tire') {
      handleSwitchModel('vehicle_service');
      setMaintServiceType('tires');
    } else if (subCategoryId === 'sub_veh_maintenance' || subCategoryId === 'sub_veh_parts' || subCategoryId === 'sub_veh_wash' || subCategoryId === 'sub_veh_license') {
      handleSwitchModel('vehicle_service');
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

  const isVehicleRelatedCategory = useMemo(() => {
    if (type !== 'expense' || !selectedCatObj) return false;
    const id = (selectedCatObj.id || '').toLowerCase();
    const name = (selectedCatObj.name || '').toLowerCase();
    const nameEn = (selectedCatObj.nameEn || '').toLowerCase();
    const subIds = (selectedCatObj.subCategories || []).map((s) => (s.id || '').toLowerCase());
    const subNames = (selectedCatObj.subCategories || []).map((s) => (s.name || '').toLowerCase());
    const hasVehicleSub = subIds.some((sid) => sid.startsWith('sub_veh_')) || subNames.some((sn) => sn.includes('ဆီဖိုး') || sn.includes('ဆီ') || sn.includes('မော်တော်') || sn.includes('အင်ဂျင်ဝိုင်'));
    if (hasVehicleSub) return true;
    return id === 'cat_vehicle' || id === 'cat_vehicle_management' || id === 'cat_expense_car' || id === 'cat_transport' || id.includes('vehicle') || id.includes('fuel') || name.includes('ယာဉ်') || name.includes('ကား') || name.includes('စက်သုံးဆီ') || name.includes('ဆီဖိုး') || nameEn.includes('vehicle') || nameEn.includes('fuel') || nameEn.includes('petrol') || nameEn.includes('transport');
  }, [type, selectedCatObj]);

  const showModelSelector = useMemo(() => {
    return isVehicleRelatedCategory || initialModel === 'fuel' || initialModel === 'vehicle_service';
  }, [isVehicleRelatedCategory, initialModel]);

  useEffect(() => {
    if (!showModelSelector && entryModel !== 'general') {
      setEntryModel('general');
      setIsVehicleLinkEnabled(false);
    }
  }, [showModelSelector, entryModel]);

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

  const filteredShopsForDatalist = useMemo(() => {
    if (!shopInput.trim()) return shops.slice(0, 5).concat(publicShops.slice(0, 5) as any);
    const q = shopInput.toLowerCase();
    return [
      ...shops.filter((s) => s.name.toLowerCase().includes(q)),
      ...publicShops.filter((s) => s.name.toLowerCase().includes(q) && !shops.some((ps) => ps.name === s.name))
    ].slice(0, 5);
  }, [shopInput, shops, publicShops]);

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

  const latestPreviousPurchase = useMemo<MatchedPreviousPurchase | null>(() => {
    if (!isOpen || type !== 'expense' || !allTransactions || allTransactions.length === 0) return null;
    if (entryMode === 'shopping_list' && shoppingItems.length > 1) return null;
    const currentTxId = editTransaction?.id;
    const cleanItemName = itemName.trim();
    const cleanItemNameLower = cleanItemName.toLowerCase();
    const selectedSub = selectedCatObj?.subCategories?.find((s) => s.id === subCategoryId);
    const subName = selectedSub?.name?.trim() || '';
    const subNameLower = subName.toLowerCase();
    const pastExpenseTxs = allTransactions.filter((t) => t.id !== currentTxId && t.type === 'expense').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (pastExpenseTxs.length === 0) return null;
    const targetItemName = entryMode === 'shopping_list' && shoppingItems[0]?.name?.trim() ? shoppingItems[0].name.trim() : cleanItemName;
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
  }, [isOpen, type, allTransactions, editTransaction, entryMode, shoppingItems, itemName, subCategoryId, selectedCatObj, effectiveCategoryId, categories, unifiedItemSuggestions]);

  const currentEffectivePrice = useMemo(() => (entryMode === 'unit_qty' ? parseMyanmarNumber(unitPrice) || 0 : parseMyanmarNumber(amount) || 0), [entryMode, unitPrice, amount]);

  const priceComparison = useMemo(() => {
    if (!isOpen || !latestPreviousPurchase || currentEffectivePrice <= 0) return null;
    const diff = currentEffectivePrice - latestPreviousPurchase.amount;
    const percent = latestPreviousPurchase.amount > 0 ? (diff / latestPreviousPurchase.amount) * 100 : 0;
    return { diff, percent, isHigher: diff > 0, isLower: diff < 0, isEqual: diff === 0 };
  }, [isOpen, latestPreviousPurchase, currentEffectivePrice]);

  const handleApplyPreviousPrice = () => {
    if (!latestPreviousPurchase) return;
    const p = latestPreviousPurchase.amount;
    if (entryMode === 'unit_qty') {
      setUnitPrice(String(p));
      const q = parseMyanmarNumber(quantity) || 1;
      setAmount(String(p * q));
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
    }
    setType(newType);
  };

  const confirmTypeChange = () => {
    if (!pendingTypeChange) return;
    setType(pendingTypeChange.newType);
    if (pendingTypeChange.clearCategoryOnConfirm) {
      setCategoryId('');
      setSubCategoryId('');
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
      setShowQuickAddSub(false);
    }
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
    const validItems = shoppingItems.filter((i) => i.name.trim() && parseMyanmarNumber(i.quantity as any) > 0).map((i) => {
      const p = parseMyanmarNumber(i.price as any) || 0;
      const q = parseMyanmarNumber(i.quantity as any) || 0;
      return { name: i.name.trim(), price: p, quantity: q, amount: p * q };
    });
    let finalAmount = numAmount;
    if (isFreeTireCheck && (!finalAmount || finalAmount <= 0)) finalAmount = 0;
    if (entryMode === 'shopping_list' && validItems.length > 0) {
      finalAmount = validItems.reduce((sum, item) => sum + item.amount, 0);
    } else if (entryMode === 'unit_qty' && parseMyanmarNumber(unitPrice) > 0 && parseMyanmarNumber(quantity) > 0) {
      finalAmount = parseMyanmarNumber(unitPrice) * parseMyanmarNumber(quantity);
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
        if (!targetSubCategory || targetSubCategory === 'sub_veh_fuel') {
          if (maintServiceType === 'tires') targetSubCategory = 'sub_veh_tire';
          else if (maintServiceType === 'engine_oil') targetSubCategory = 'sub_veh_parts';
          else targetSubCategory = 'sub_veh_maintenance';
        }
      }

      let finalNote: string | undefined = undefined;
      let txItems: TransactionItem[] | undefined = undefined;

      if (entryModel === 'fuel' || entryModel === 'vehicle_service' || entryModel === 'tire_pressure') {
        finalNote = extraNote.trim() || undefined;
      } else if (entryMode === 'shopping_list') {
        finalNote = extraNote.trim() || undefined;
        txItems = validItems.length > 0 ? validItems : undefined;
      } else if (entryMode === 'unit_qty') {
        finalNote = extraNote.trim() || undefined;
        if (itemName.trim()) {
          txItems = [{ id: 'item_1', name: itemName.trim(), price: parseMyanmarNumber(unitPrice) || 0, quantity: parseMyanmarNumber(quantity) || 1, amount: finalAmount }];
        }
      } else {
        const cleanItem = itemName.trim();
        const cleanExtra = extraNote.trim();
        if (cleanItem && cleanExtra) finalNote = `${cleanItem} (${cleanExtra})`;
        else if (cleanItem) finalNote = cleanItem;
        else if (cleanExtra) finalNote = cleanExtra;
        else finalNote = undefined;
      }

      const isTransferTx = isTransferCategory || targetSubCategory === 'sub_tf_out' || targetSubCategory === 'sub_tf_in';

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
        unitPrice: entryModel === 'general' && entryMode === 'unit_qty' && parseMyanmarNumber(unitPrice) > 0 ? parseMyanmarNumber(unitPrice) : undefined,
        quantity: entryModel === 'general' && entryMode === 'unit_qty' && parseMyanmarNumber(quantity) > 0 ? parseMyanmarNumber(quantity) : undefined,
      }, vehicleLinkPayload);
      // [v7.5.55] Close ONLY on a successful save. Validation returns
      // above (backfill cancel / double-entry / missing fields) keep the
      // modal open so the entry is not discarded, and a false return from
      // the save handler (blocked save) also keeps it open.
      if (saveOk !== false) onClose();
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
              switcher only appears when a vehicle mode can apply. */}
          {(isVehicleRelatedCategory || showModelSelector) && (
          <div className="px-3 py-2 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setMoreOpen(!moreOpen)} className="flex-1 min-w-0 flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors text-xs font-bold text-slate-700">
                <span className="flex items-center gap-2 min-w-0">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="truncate">
                    {entryModel === 'general'
                      ? (lang === 'my' ? '🚗 ယာဉ် မှတ်တမ်း' : '🚗 Vehicle entry')
                      : entryModel === 'tire_pressure' ? (lang === 'my' ? '🛞 လေချိန်' : '🛞 Tire Pressure') : entryModel === 'fuel' ? (lang === 'my' ? '⛽ ဆီဖိုး' : '⛽ Fuel') : entryModel === 'vehicle_service' && maintServiceType === 'tires' ? (lang === 'my' ? '🛞 တာယာ' : '🛞 Tire') : entryModel === 'vehicle_service' ? (lang === 'my' ? '🔧 ဝန်ဆောင်မှု' : '🔧 Service') : (lang === 'my' ? '🚗 ယာဉ် မှတ်တမ်း' : '🚗 Vehicle entry')}
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
                    <button type="button" onClick={() => { handleSwitchModel("fuel"); setMoreOpen(false); }} className={"w-full flex items-center gap-2 px-3 py-2 text-xs font-bold transition-colors " + (entryModel === "fuel" ? "bg-emerald-50 text-emerald-800" : "text-slate-700 hover:bg-slate-50")}>
                      <Fuel className="w-4 h-4" /><span>{lang === 'my' ? 'ဆီဖိုး' : 'Fuel'}</span>{entryModel === "fuel" && <Check className="w-3.5 h-3.5 ml-auto text-emerald-600" strokeWidth={3} />}
                    </button>
                    <button type="button" onClick={() => { handleSwitchModel("vehicle_service"); setMoreOpen(false); }} className={"w-full flex items-center gap-2 px-3 py-2 text-xs font-bold transition-colors " + (entryModel === "vehicle_service" && maintServiceType !== "tires" ? "bg-blue-50 text-blue-800" : "text-slate-700 hover:bg-slate-50")}>
                      <Wrench className="w-4 h-4" /><span>{lang === 'my' ? 'ဝန်ဆောင်မှု / ပြုပြင်' : 'Service / Repair'}</span>{entryModel === "vehicle_service" && maintServiceType !== "tires" && <Check className="w-3.5 h-3.5 ml-auto text-blue-600" strokeWidth={3} />}
                    </button>
                    <button type="button" onClick={() => { handleSwitchModel("vehicle_service"); setMaintServiceType("tires"); setMoreOpen(false); }} className={"w-full flex items-center gap-2 px-3 py-2 text-xs font-bold transition-colors " + (entryModel === "vehicle_service" && maintServiceType === "tires" ? "bg-amber-50 text-amber-800" : "text-slate-700 hover:bg-slate-50")}>
                      <Car className="w-4 h-4" /><span>{lang === 'my' ? 'တာယာ လဲလှယ်' : 'Tire Replacement'}</span>{entryModel === "vehicle_service" && maintServiceType === "tires" && <Check className="w-3.5 h-3.5 ml-auto text-amber-600" strokeWidth={3} />}
                    </button>
                    <button type="button" onClick={() => { handleSwitchModel("tire_pressure"); setMoreOpen(false); }} className={"w-full flex items-center gap-2 px-3 py-2 text-xs font-bold transition-colors " + (entryModel === "tire_pressure" ? "bg-teal-50 text-teal-800" : "text-slate-700 hover:bg-slate-50")}>
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

            {entryModel !== "general" && (
              <div className="px-3 pt-3">
                <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200">
                  <span className="text-xs font-bold text-emerald-800 min-w-0">
                    {entryModel === 'fuel' && (lang === 'my' ? '⛽ ဆီဖိုး Mode' : '⛽ Fuel Mode')}
                    {entryModel === 'tire_pressure' && (lang === 'my' ? '🛞 လေချိန် Mode' : '🛞 Tire Pressure Mode')}
                    {entryModel === 'vehicle_service' && maintServiceType === 'tires' && (lang === 'my' ? '🛞 တာယာ Mode' : '🛞 Tire Mode')}
                    {entryModel === 'vehicle_service' && maintServiceType !== 'tires' && (lang === 'my' ? '🔧 ဝန်ဆောင်မှု Mode' : '🔧 Service Mode')}
                  </span>
                  <button type="button" onClick={() => { setEntryModel("general"); setIsVehicleLinkEnabled(false); }} className="text-[10px] font-bold text-slate-500 hover:text-slate-800 shrink-0">✕ {lang === 'my' ? 'ပိတ်' : 'Close'}</button>
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
              {!(entryModel === "fuel" && vehicleId) && (
                <div className="flex justify-center gap-1.5 mt-2 flex-wrap">
                  <button type="button" onClick={() => handleAddAmount(1000)} className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-[11px] font-bold text-slate-600">+1K</button>
                  <button type="button" onClick={() => handleAddAmount(10000)} className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-[11px] font-bold text-slate-600">+10K</button>
                  <button type="button" onClick={() => handleAddAmount(100000)} className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 rounded text-[11px] font-bold text-indigo-700">+100K</button>
                </div>
              )}
              {/* [v7.5.60 N1] Live lakh preview while typing the amount
                  (display-only — the input stays full kyat). */}
              {(parseMyanmarNumber(amount) || 0) > 0 && (
                <div className="text-xs text-center text-slate-500 font-semibold mt-1.5" title={formatMMK(parseMyanmarNumber(amount) || 0)}>
                  ≈ {formatLakhs(parseMyanmarNumber(amount) || 0, lang)}
                </div>
              )}
            </div>

            {/* [v7.5.60 S16] Entry-mode choices shown directly instead of
                hiding behind the ✨ menu — a new user can find the
                shopping list / unit×qty modes without guessing. */}
            {entryModel === "general" && (
              <div className="px-4 py-2 border-b border-slate-100">
                <div className="text-[11px] font-bold text-slate-500 mb-1.5">{lang === 'my' ? 'ထည့်သွင်းပုံစံ:' : 'Entry mode:'}</div>
                <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
                  <button type="button" onClick={() => { setShowQuickAddSub(true); setEntryMode("direct"); setEntryModel("general"); }} className={"py-1.5 px-1 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-colors " + (entryMode === "direct" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900")}>
                    <FileText className="w-3.5 h-3.5" /><span>{lang === 'my' ? 'ပစ္စည်းအမည်' : 'Item Name'}</span>
                  </button>
                  <button type="button" onClick={() => { setEntryMode("unit_qty"); setEntryModel("general"); setShowQuickAddSub(false); }} className={"py-1.5 px-1 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-colors " + (entryMode === "unit_qty" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900")}>
                    <Boxes className="w-3.5 h-3.5" /><span>{lang === 'my' ? 'ဈေး × အရေအတွက်' : 'Unit × Qty'}</span>
                  </button>
                  <button type="button" onClick={() => { setEntryMode("shopping_list"); setEntryModel("general"); setShowQuickAddSub(false); }} className={"py-1.5 px-1 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-colors " + (entryMode === "shopping_list" ? "bg-amber-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900")}>
                    <ShoppingCart className="w-3.5 h-3.5" /><span>{lang === 'my' ? 'ဈေးဝယ်စာရင်း' : 'Shopping List'}</span>
                  </button>
                </div>
              </div>
            )}

            <button type="button" onClick={() => setIsCategoryPickerOpen(true)} className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 hover:bg-slate-50 transition-colors text-left">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0" style={{ backgroundColor: selectedCatObj?.color || "#94A3B8" }}>
                <CategoryIcon name={selectedCatObj?.icon || "Tag"} className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                {categoryId ? (
                  <>
                    <div className="text-sm font-bold text-slate-900 truncate">{selectedCatObj ? (lang === 'my' ? selectedCatObj.name : selectedCatObj.nameEn) : ''}</div>
                    {(() => { const sub = availableSubCats.find((s) => s.id === subCategoryId); if (!sub) return null; return (<div className="text-xs text-emerald-700 truncate mt-0.5">↳ {lang === 'my' ? sub.name : sub.nameEn}</div>); })()}
                  </>
                ) : <div className="text-sm font-bold text-slate-400">{lang === 'my' ? 'ကဏ္ဍ ရွေးရန်' : 'Select category'}</div>}
              </div>
              <span className="text-slate-300 text-xl shrink-0">›</span>
            </button>

            {isVehicleRelatedCategory && entryModel === "general" && (
              <div className="px-4 py-3 border-b border-slate-100">
                <div className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-blue-600" />
                  <span>{lang === 'my' ? 'ယာဉ် မှတ်တမ်း အမျိုးအစား ရွေးပါ:' : 'Select vehicle entry type:'}</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button type="button" onClick={() => handleSwitchModel("fuel")} className="py-2 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold text-xs flex flex-col items-center gap-1 transition-colors"><Fuel className="w-4 h-4" /><span>{lang === 'my' ? 'ဆီဖိုး' : 'Fuel'}</span></button>
                  <button type="button" onClick={() => handleSwitchModel("vehicle_service")} className="py-2 px-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 font-bold text-xs flex flex-col items-center gap-1 transition-colors"><Wrench className="w-4 h-4" /><span>{lang === 'my' ? 'ဝန်ဆောင်မှု' : 'Service'}</span></button>
                  <button type="button" onClick={() => { handleSwitchModel("vehicle_service"); setMaintServiceType("tires"); }} className="py-2 px-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-bold text-xs flex flex-col items-center gap-1 transition-colors"><Car className="w-4 h-4" /><span>{lang === 'my' ? 'တာယာလဲလှယ်' : 'Tire Replace'}</span></button>
                  <button type="button" onClick={() => handleSwitchModel("tire_pressure")} className="py-2 px-2 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 font-bold text-xs flex flex-col items-center gap-1 transition-colors"><Gauge className="w-4 h-4" /><span>{lang === 'my' ? 'လေချိန်' : 'Pressure'}</span></button>
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
                    <option value="brake_pads">{lang === "my" ? "🛑 ဘရိတ်ရှူး" : "🛑 Brake Pads"}</option>
                    <option value="tires">{lang === "my" ? "🛞 တာယာ လဲလှယ်" : "🛞 Tire Replacement"}</option>
                    <option value="battery">{lang === "my" ? "🔋 ဘက်ထရီ" : "🔋 Battery"}</option>
                    <option value="spark_plugs">{lang === "my" ? "⚡ ပလပ်" : "⚡ Spark Plugs"}</option>
                    <option value="transmission_fluid">{lang === "my" ? "⚙️ ဂီယာဝိုင်" : "⚙️ Transmission Fluid"}</option>
                    <option value="coolant">{lang === "my" ? "💧 ရေတိုင်ကီ" : "💧 Coolant"}</option>
                    <option value="wheel_alignment">{lang === "my" ? "🎯 ဘီးချိန်" : "🎯 Wheel Alignment"}</option>
                    <option value="suspension">{lang === "my" ? "🪑 ရှော့ဘား" : "🪑 Suspension"}</option>
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

            {entryMode === "unit_qty" && entryModel === "general" && (
              <>
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                  <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                  <input type="text" list="db-item-suggestions" autoComplete="off" value={itemName} onChange={(e) => { setItemName(e.target.value); setItemInput(e.target.value); }} placeholder={lang === 'my' ? 'ပစ္စည်းအမည် (ဥပမာ - ဆန်)' : 'Item name (e.g. Rice)'} className="flex-1 min-w-0 text-sm font-bold bg-transparent border-0 focus:outline-none" />
                </div>
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-500 w-20 shrink-0">{lang === "my" ? "ဈေးနှုန်း" : "Unit Price"}</span>
                  <input type="text" inputMode="decimal" value={unitPrice} onChange={(e) => handleUnitQtyChange("price", e.target.value)} placeholder="0" className="flex-1 min-w-0 text-base font-bold bg-transparent border-0 focus:outline-none font-mono text-right" />
                </div>
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-500 w-20 shrink-0">{lang === "my" ? "အရေအတွက်" : "Quantity"}</span>
                  <input type="text" inputMode="decimal" value={quantity} onChange={(e) => handleUnitQtyChange("qty", e.target.value)} placeholder="1" className="flex-1 min-w-0 text-base font-bold bg-transparent border-0 focus:outline-none font-mono text-right" />
                </div>
              </>
            )}

            {entryMode === "shopping_list" && entryModel === "general" && (
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
                        {pastPurchase && item.price > 0 && (<div className="text-[10px] text-slate-500">{lang === 'my' ? 'ယခင်:' : 'Prev:'} {formatMMK(pastPurchase.price)} ({pastPurchase.date})</div>)}
                      </div>
                    );
                  })}
                </div>
                <button type="button" onClick={addShoppingItemRow} className="w-full mt-2 py-1.5 border-2 border-dashed border-amber-300 rounded-xl text-xs font-bold text-amber-800 hover:bg-amber-50">+ {lang === 'my' ? 'ပစ္စည်းထပ်ထည့်' : 'Add item'}</button>
              </div>
            )}

            {showQuickAddSub && entryModel === "general" && entryMode === "direct" && (
              <div className="px-4 py-3 border-b border-slate-100">
                <div className="text-xs font-bold text-slate-500 mb-1">{lang === 'my' ? 'ပစ္စည်းအမည်' : 'Item Name'}</div>
                <input type="text" list="db-item-suggestions" autoComplete="off" value={itemName} onChange={(e) => { setItemName(e.target.value); setItemInput(e.target.value); }} placeholder={lang === 'my' ? 'ဥပမာ - ဆန် / ဆီ' : 'e.g. Rice'} className="w-full text-sm font-bold bg-transparent border-0 focus:outline-none" />
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

      <CategoryPickerModal isOpen={isCategoryPickerOpen} onClose={() => setIsCategoryPickerOpen(false)} categories={categories} selectedCategoryId={categoryId} selectedSubCategoryId={subCategoryId} currentType={type} lang={lang} plan={plan} onSelect={(catId, subId) => { setCategoryId(catId); setSubCategoryId(subId || ""); setIsCategoryPickerOpen(false); }} onOpenUpgrade={onOpenUpgrade} onAddSubCategory={onAddSubCategory} onManageCategories={onManageCategories} />

      <FuelExpenseGuideModal isOpen={showFuelGuideModal} onClose={() => setShowFuelGuideModal(false)} lang={lang} />
    </div>
  );
};
