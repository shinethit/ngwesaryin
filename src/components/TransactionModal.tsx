import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  Wallet,
  Tag,
  FileText,
  Lock,
  Sparkles,
  Plus,
  Check,
  History,
  TrendingUp,
  TrendingDown,
  Minus,
  ShoppingCart,
  Trash2,
  X,
  Hash,
  Boxes,
  Car,
  Fuel,
  Wrench,
  Gauge,
  ChevronDown,
  ChevronUp,
  HelpCircle,
} from 'lucide-react';
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
} from '../types';
import { formatMMK } from '../utils/formatters';
import { formatCurrency, convertToMMK } from '../utils/currency';
import { getLocalDateString } from '../utils/dateUtils';
import { CategoryIcon } from './CategoryIcon';
import { ItemPriceHistoryModal } from './ItemPriceHistoryModal';
import { CategoryPickerModal } from './CategoryPickerModal';
import { FuelExpenseGuideModal } from './vehicles/FuelExpenseGuideModal';
import { useAuth } from '../context/AuthContext';
import { getCollaboratorPermissions } from '../utils/permissions';
import {
  getAllItemSuggestions,
  findMatchingItemInfo,
  UnifiedItemInfo,
} from '../utils/itemIntelligence';

const GAS_STATIONS = [
  'Denko',
  'PTL',
  'Max Energy',
  'Apex',
  'Moon Sun',
  'Shwe Taung',
  'BOC',
  'Petrostar',
  'Green Energy',
  'Other',
];

export type EntryModel = 'general' | 'fuel' | 'vehicle_service';

interface TransactionModalProps {
  isOpen: boolean;
  initialType?: TransactionType;
  initialWalletId?: string;
  initialModel?: EntryModel;
  editTransaction?: Transaction;
  categories: Category[];
  wallets: WalletType[];
  allTransactions?: Transaction[];
  vehicles?: Vehicle[];
  plan: PlanType;
  lang: 'my' | 'en';
  onClose: () => void;
  onSubmit: (tx: Omit<Transaction, 'id' | 'createdAt'>, vehicleLinkData?: VehicleLinkData) => void;
  onOpenUpgrade: () => void;
  onAddSubCategory?: (categoryId: string, subCategory: Omit<SubCategory, 'id'>) => void;
  onManageCategories?: () => void;
  onOpenAddVehicle?: () => void;
  onOpenVehicleManagement?: () => void;
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
}) => {
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

  // 3 Primary Models: 1. General | 2. ဆီဖိုး (Fuel) | 3. Other Vehicle Services
  const getResolvedModel = (): EntryModel => {
    if (editTransaction) {
      if (
        editTransaction.isFuelLog ||
        editTransaction.fuelLiters ||
        editTransaction.subCategoryId === 'sub_veh_fuel' ||
        (editTransaction.note &&
          (editTransaction.note.includes('စက်သုံးဆီ') ||
            editTransaction.note.includes('ဆီဖိုး') ||
            editTransaction.note.includes('Octane') ||
            editTransaction.note.includes('Diesel')))
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

  // Ref to detect when modal is newly opened or edit transaction switches
  const prevIsOpenRef = React.useRef(false);
  const prevEditTxIdRef = React.useRef<string | undefined>(undefined);
  const formRef = React.useRef<HTMLFormElement>(null);

  // Calculation & Entry Modes: 'direct' | 'unit_qty' | 'shopping_list'
  const [entryMode, setEntryMode] = useState<'direct' | 'unit_qty' | 'shopping_list'>(
    editTransaction?.items && editTransaction.items.length > 0
      ? 'shopping_list'
      : editTransaction?.unitPrice
      ? 'unit_qty'
      : 'direct'
  );

  // Unit Price x Quantity State
  const [unitPrice, setUnitPrice] = useState<string>(
    editTransaction?.unitPrice ? String(editTransaction.unitPrice) : ''
  );
  const [quantity, setQuantity] = useState<string>(
    editTransaction?.quantity ? String(editTransaction.quantity) : '1'
  );

  // Shopping List Items State
  const [shoppingItems, setShoppingItems] = useState<TransactionItem[]>(
    editTransaction?.items && editTransaction.items.length > 0
      ? editTransaction.items
      : [{ id: 'item_1', name: '', price: 0, quantity: 1, amount: 0 }]
  );

  // Quick add sub-category inline state
  // [v6.3.6] Track last edited field for any-2-of-3 auto-compute
  const [unitQtyLastEdited, setUnitQtyLastEdited] = useState<'price' | 'qty' | 'total' | null>(null);
  const shoppingLastEditedRef = useRef<Record<string, 'price' | 'qty' | 'amount'>>({});
  // [v6.4] Debounce timers for smooth typing
  const unitQtyAmountTimerRef = useRef<NodeJS.Timeout | null>(null);
  const shoppingAmountTimersRef = useRef<Record<string, NodeJS.Timeout>>({});

  const [showQuickAddSub, setShowQuickAddSub] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [categorySelectMode, setCategorySelectMode] = useState<'picker' | 'dropdown' | 'grid'>('picker');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [walletExpanded, setWalletExpanded] = useState(false);
  const [noteExpanded, setNoteExpanded] = useState(false);

  // ==========================================
  // Vehicle Linkage Progressive Disclosure State
  // ==========================================
  const [isVehicleLinkEnabled, setIsVehicleLinkEnabled] = useState(false);
  const [vehicleId, setVehicleId] = useState<string>(vehicles[0]?.id || '');
  const [vehicleLogType, setVehicleLogType] = useState<'fuel' | 'maintenance' | 'tire'>('fuel');
  const [fuelEntryStyle, setFuelEntryStyle] = useState<'quick' | 'detailed'>('quick');
  const [showFuelGuideModal, setShowFuelGuideModal] = useState(false);

  // Fuel fields
  const [fuelType, setFuelType] = useState<string>('Octane 92');
  const [fuelLiters, setFuelLiters] = useState<string>('');
  const [fuelPricePerLiter, setFuelPricePerLiter] = useState<string>('3100');
  const [fuelGasStation, setFuelGasStation] = useState<string>('Denko');
  const [fuelIsFullTank, setFuelIsFullTank] = useState<boolean>(true);

  // Maintenance fields
  const [maintServiceType, setMaintServiceType] = useState<VehicleServiceType>('engine_oil');
  const [maintTitle, setMaintTitle] = useState<string>('');
  const [maintSparePartBrand, setMaintSparePartBrand] = useState<string>('');
  const [maintWorkshopName, setMaintWorkshopName] = useState<string>('');
  const [maintLifespanKm, setMaintLifespanKm] = useState<string>('5000');
  const [maintLifespanDays, setMaintLifespanDays] = useState<string>('180');

  // Tire fields
  const [tireFL, setTireFL] = useState<string>('32');
  const [tireFR, setTireFR] = useState<string>('32');
  const [tireRL, setTireRL] = useState<string>('32');
  const [tireRR, setTireRR] = useState<string>('32');

  // Common vehicle field
  const [vehicleOdometer, setVehicleOdometer] = useState<string>('');

  const handleFuelLitersChange = (lVal: string) => {
    setFuelLiters(lVal);
    const lNum = parseFloat(lVal) || 0;
    const pNum = parseFloat(fuelPricePerLiter) || 0;
    if (lNum > 0 && pNum > 0) {
      setAmount(String(Math.round(lNum * pNum)));
    }
  };

  const handleFuelPriceChange = (pVal: string) => {
    setFuelPricePerLiter(pVal);
    const pNum = parseFloat(pVal) || 0;
    const lNum = parseFloat(fuelLiters) || 0;
    if (lNum > 0 && pNum > 0) {
      setAmount(String(Math.round(lNum * pNum)));
    } else if (pNum > 0 && parseFloat(amount) > 0) {
      setFuelLiters(String(Number((parseFloat(amount) / pNum).toFixed(2))));
    }
  };

  const handleAmountChangeWithFuelSync = (val: string) => {
    setAmount(val);
    const numAmt = parseFloat(val) || 0;
    const numPpl = parseFloat(fuelPricePerLiter) || 0;
    if (numAmt > 0 && numPpl > 0 && (fuelEntryStyle === 'detailed' || isVehicleLinkEnabled)) {
      setFuelLiters(String(Number((numAmt / numPpl).toFixed(2))));
    }
  };

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
    const isNewlyOpened = isOpen && !prevIsOpenRef.current;
    const isEditTxChanged = editTransaction?.id !== prevEditTxIdRef.current;
    prevIsOpenRef.current = isOpen;
    prevEditTxIdRef.current = editTransaction?.id;

    if (isOpen) {
      if (formRef.current) {
        formRef.current.scrollTop = 0;
      }
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
          setItemName(editTransaction.note || '');
          setExtraNote('');
          const resolvedModel = getResolvedModel();
          setEntryModel(resolvedModel);
          if (resolvedModel === 'fuel') {
            setIsVehicleLinkEnabled(true);
            setVehicleLogType('fuel');
          } else if (resolvedModel === 'vehicle_service') {
            setIsVehicleLinkEnabled(true);
            setVehicleLogType('maintenance');
          } else {
            setIsVehicleLinkEnabled(false);
          }
          if (editTransaction.items && editTransaction.items.length > 0) {
            setEntryMode('shopping_list');
            setShoppingItems(editTransaction.items);
          } else if (editTransaction.unitPrice) {
            setEntryMode('unit_qty');
            setUnitPrice(String(editTransaction.unitPrice));
            setQuantity(String(editTransaction.quantity || 1));
          } else {
            setEntryMode('direct');
          }
          setShowQuickAddSub(false);
          setNewSubName('');
        }
      } else if (isNewlyOpened) {
        setUnitQtyLastEdited(null);
        shoppingLastEditedRef.current = {};
        // Only initialize default values when the modal first opens (prefer last used wallet)
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
          if (vehicles && vehicles.length > 0) {
            setVehicleId(vehicles[0].id);
            if (vehicles[0].fuelType) setFuelType(vehicles[0].fuelType);
            if (vehicles[0].currentOdometer) setVehicleOdometer(String(vehicles[0].currentOdometer));
            if (vehicles[0].walletId && wallets.some((w) => w.id === vehicles[0].walletId)) {
              chosenWalletId = vehicles[0].walletId;
              setWalletId(vehicles[0].walletId);
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
          if (vehicles && vehicles.length > 0) {
            setVehicleId(vehicles[0].id);
            if (vehicles[0].currentOdometer) setVehicleOdometer(String(vehicles[0].currentOdometer));
            if (vehicles[0].walletId && wallets.some((w) => w.id === vehicles[0].walletId)) {
              chosenWalletId = vehicles[0].walletId;
              setWalletId(vehicles[0].walletId);
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
        setEntryMode('direct');
        setUnitPrice('');
        setQuantity('1');
        setShoppingItems([{ id: 'item_1', name: '', price: 0, quantity: 1, amount: 0 }]);
        setShowQuickAddSub(false);
        setNewSubName('');
        setVehicleOdometer('');
        setFuelLiters('');
        setFuelPricePerLiter('');
        setFuelGasStation('');
        setMaintTitle('');
        setMaintWorkshopName('');
      }
      setIsSubmitting(false);
    }
  }, [isOpen, editTransaction, initialType, initialWalletId, wallets, user]);

  // [v6.3.6] Any 2 of Price/Qty/Total known -> compute 3rd (lastEdited priority)
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
    const pNum = parseFloat(p) || 0;
    const qNum = parseFloat(q) || 0;
    const tot = parseFloat(amount) || 0;
    if (field === 'price') setUnitPrice(val); else setQuantity(val);
    computeUnitQtyThird(field, pNum, qNum, tot);
  };

  const handleUnitQtyAmountChange = (amtStr: string) => {
    // [v6.4] Update raw value immediately, but debounce the reverse-calc
    setAmount(amtStr);
    if (unitQtyAmountTimerRef.current) clearTimeout(unitQtyAmountTimerRef.current);
    unitQtyAmountTimerRef.current = setTimeout(() => {
      const tot = parseFloat(amtStr) || 0;
      if (tot <= 0) { setUnitQtyLastEdited('total'); return; }
      const pNum = parseFloat(unitPrice) || 0;
      const qNum = parseFloat(quantity) || 0;
      computeUnitQtyThird('total', pNum, qNum, tot);
    }, 500);
  };

  // Shopping List item row — [v6.3.6] any 2 of Price/Qty/Total -> compute 3rd
  const updateShoppingItem = (id: string, field: keyof TransactionItem, val: any) => {
    setShoppingItems((prev) => {
      const updated = prev.map((item) => {
        if (item.id === id) {
          const newItem = { ...item, [field]: val };
          if (field === 'name' && typeof val === 'string' && val.trim().length >= 1) {
            const match = findMatchingItemInfo(val, unifiedItemSuggestions);
            if (match && match.categoryId && (!categoryId || categoryId === 'cat_food' || categoryId === 'cat_expense_other')) {
              setCategoryId(match.categoryId);
              if (match.subCategoryId) setSubCategoryId(match.subCategoryId);
            }
          }
          const pNum = parseFloat(newItem.price as any) || 0;
          const qNum = parseFloat(newItem.quantity as any) || 0;
          const aNum = parseFloat(newItem.amount as any) || 0;
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
            // [v6.4] Immediate raw value update, debounced reverse-calc
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

  // Auto-scroll to newly added shopping item row and focus input
  useEffect(() => {
    if (newlyAddedItemIdRef.current && shoppingListContainerRef.current) {
      const targetId = newlyAddedItemIdRef.current;
      const timer = setTimeout(() => {
        if (shoppingListContainerRef.current) {
          shoppingListContainerRef.current.scrollTo({
            top: shoppingListContainerRef.current.scrollHeight,
            behavior: 'smooth',
          });
        }
        const inputElem = document.getElementById(`input-name-${targetId}`);
        if (inputElem) {
          inputElem.focus();
        }
        newlyAddedItemIdRef.current = null;
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [shoppingItems.length]);

  // Unified item suggestions across all past shopping lists, unit prices, notes, and subcategories
  const unifiedItemSuggestions = useMemo(() => {
    return getAllItemSuggestions(allTransactions, categories);
  }, [allTransactions, categories]);

  // Lookup latest previous purchase price for an item name across all past expense transactions & unified items
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

  // Auto-generate note summary from shopping list items
  const autoGenerateShoppingNote = () => {
    const validItems = shoppingItems.filter((i) => i.name.trim());
    if (validItems.length === 0) return;
    const summary = validItems
      .map((i) => `${i.name.trim()}${i.quantity > 1 ? ` x${i.quantity}` : ''} (${formatMMK(i.amount)})`)
      .join(' + ');
    setExtraNote(summary);
  };

  // Sort categories by highest historical usage frequency across all transactions (Transfer category is accessible under both Income and Expense)
  const filteredCats = useMemo(() => {
    const cats = categories.filter(
      (c) =>
        c.type === type ||
        c.id === 'cat_transfer' ||
        (c.name && c.name.includes('ငွေလွှဲ')) ||
        (c.nameEn && c.nameEn.toLowerCase().includes('transfer'))
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
      if (countB !== countA) {
        return countB - countA; // Most frequently used first
      }
      return (lang === 'my' ? a.name : a.nameEn).localeCompare(lang === 'my' ? b.name : b.nameEn);
    });
  }, [categories, type, allTransactions, lang]);

  // Set default category if not matching
  const currentCat = categories.find((c) => c.id === categoryId);
  const isCurrentTransferCat = Boolean(
    currentCat &&
      (currentCat.id === 'cat_transfer' ||
        (currentCat.name && currentCat.name.includes('ငွေလွှဲ')) ||
        (currentCat.nameEn && currentCat.nameEn.toLowerCase().includes('transfer')))
  );
  // [v6.24] If user has explicitly picked a category, honor it — do NOT
  // silently fall back when its type differs. The auto-type effect will
  // flip `type` to match. Fallback only when nothing is picked yet.
  const effectiveCategoryId = categoryId
    ? categoryId
    : (filteredCats[0]?.id || '');
  const selectedCatObj = categories.find((c) => c.id === (categoryId || effectiveCategoryId));

  // Check if selected category is Transfer (ငွေလွှဲပြောင်းခြင်း)
  const isTransferCategory = useMemo(() => {
    if (!selectedCatObj) return false;
    const id = (selectedCatObj.id || '').toLowerCase();
    const name = (selectedCatObj.name || '').toLowerCase();
    const nameEn = (selectedCatObj.nameEn || '').toLowerCase();

    return (
      id === 'cat_transfer' ||
      id.includes('transfer') ||
      name.includes('ငွေလွှဲ') ||
      nameEn.includes('transfer')
    );
  }, [selectedCatObj]);

  // Auto-sync type and subcategory for Transfer Category
  // ငွေလွှဲထွက် (Transfer Out) -> Expense (အထွက်)
  // ငွေလွှဲဝင် (Transfer In) -> Income (အဝင်)
  useEffect(() => {
    if (isTransferCategory) {
      if (subCategoryId === 'sub_tf_out' || subCategoryId.includes('out') || subCategoryId.includes('ထွက်')) {
        if (type !== 'expense') setType('expense');
      } else if (subCategoryId === 'sub_tf_in' || subCategoryId.includes('in') || subCategoryId.includes('ဝင်')) {
        if (type !== 'income') setType('income');
      }
    }
  }, [subCategoryId, isTransferCategory]);

  // Sort sub-categories by highest historical usage frequency inside this category
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
      if (countB !== countA) {
        return countB - countA; // Most frequently used first
      }
      return (lang === 'my' ? a.name : a.nameEn).localeCompare(lang === 'my' ? b.name : b.nameEn);
    });
  }, [selectedCatObj, allTransactions, effectiveCategoryId, lang]);

  // Check if currently selected category is related to Vehicle Management (dedicated module)
  const isVehicleRelatedCategory = useMemo(() => {
    if (type !== 'expense' || !selectedCatObj) return false;
    const id = (selectedCatObj.id || '').toLowerCase();
    const name = (selectedCatObj.name || '').toLowerCase();
    const nameEn = (selectedCatObj.nameEn || '').toLowerCase();

    return (
      id === 'cat_vehicle' ||
      id === 'cat_vehicle_management' ||
      id === 'cat_expense_car' ||
      id === 'cat_transport' ||
      id.includes('vehicle') ||
      id.includes('fuel') ||
      name.includes('ယာဉ်') ||
      name.includes('ကား') ||
      name.includes('စက်သုံးဆီ') ||
      name.includes('ဆီဖိုး') ||
      nameEn.includes('vehicle') ||
      nameEn.includes('fuel') ||
      nameEn.includes('petrol') ||
      nameEn.includes('transport')
    );
  }, [type, selectedCatObj]);

  const showModelSelector = useMemo(() => {
    return isVehicleRelatedCategory || initialModel === 'fuel' || initialModel === 'vehicle_service';
  }, [isVehicleRelatedCategory, initialModel]);

  // Auto-reset to 'general' model if selected category is not vehicle-related
  useEffect(() => {
    if (!showModelSelector && entryModel !== 'general') {
      setEntryModel('general');
      setIsVehicleLinkEnabled(false);
    }
  }, [showModelSelector, entryModel]);

  // Handle Switching between the 3 Primary Models: 1. General | 2. ဆီဖိုး (Fuel) | 3. Other Vehicle Services
  const handleSwitchModel = (newModel: EntryModel) => {
    setEntryModel(newModel);
    if (newModel === 'fuel') {
      setType('expense');
      setIsVehicleLinkEnabled(true);
      setVehicleLogType('fuel');
      const vehCat = categories.find(
        (c) =>
          c.id === 'cat_vehicle' ||
          c.id === 'cat_vehicle_management' ||
          c.name.includes('ယာဉ်') ||
          (c.nameEn && c.nameEn.toLowerCase().includes('vehicle'))
      );
      if (vehCat) {
        setCategoryId(vehCat.id);
      }
      setSubCategoryId('sub_veh_fuel');
      if (vehicles && vehicles.length > 0) {
        if (!vehicleId) {
          setVehicleId(vehicles[0].id);
          if (vehicles[0].fuelType) setFuelType(vehicles[0].fuelType);
          if (vehicles[0].currentOdometer) setVehicleOdometer(String(vehicles[0].currentOdometer));
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
      const vehCat = categories.find(
        (c) =>
          c.id === 'cat_vehicle' ||
          c.id === 'cat_vehicle_management' ||
          c.name.includes('ယာဉ်') ||
          (c.nameEn && c.nameEn.toLowerCase().includes('vehicle'))
      );
      if (vehCat) {
        setCategoryId(vehCat.id);
      }
      if (!subCategoryId || subCategoryId === 'sub_veh_fuel') {
        setSubCategoryId('sub_veh_maintenance');
      }
      if (vehicles && vehicles.length > 0) {
        if (!vehicleId) {
          setVehicleId(vehicles[0].id);
          if (vehicles[0].currentOdometer) setVehicleOdometer(String(vehicles[0].currentOdometer));
        } else {
          const target = vehicles.find((x) => x.id === vehicleId);
          if (target && target.currentOdometer && !vehicleOdometer) {
            setVehicleOdometer(String(target.currentOdometer));
          }
        }
      }
    } else {
      // 'general'
      setIsVehicleLinkEnabled(false);
    }
  };

  // Check if currently entering a Fuel Expense
  const isFuelMode = useMemo(() => {
    return entryModel === 'fuel';
  }, [entryModel]);

  // Dedicated Vehicle Expense View (Fuel, Maintenance, Vehicle logs)
  // When active, generic grocery item name & shopping list calculation tabs are hidden to eliminate duplicate price inputs!
  const isDedicatedVehicleView = useMemo(() => {
    return entryModel === 'fuel' || entryModel === 'vehicle_service';
  }, [entryModel]);

  // Auto-activate Fuel Linkage and default vehicle when Fuel Mode is active
  useEffect(() => {
    if (isFuelMode) {
      setIsVehicleLinkEnabled(true);
      setVehicleLogType('fuel');
      if (vehicles && vehicles.length > 0) {
        if (!vehicleId) {
          const target = vehicles[0];
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

  // Interface for smart previous purchase match
  interface MatchedPreviousPurchase {
    amount: number;
    date: string;
    matchedName: string;
    matchType: 'item' | 'note' | 'subcategory' | 'category';
    originalTxId?: string;
    note?: string;
  }

  // Find previous purchases for this item (Smart matching: Product/Item Name FIRST -> SubCategory fallback if no specific item)
  const latestPreviousPurchase = useMemo<MatchedPreviousPurchase | null>(() => {
    if (!isOpen || type !== 'expense' || !allTransactions || allTransactions.length === 0) {
      return null;
    }

    // If shopping list mode is on with multiple items, the individual items have their own in-row comparisons
    if (entryMode === 'shopping_list' && shoppingItems.length > 1) {
      return null;
    }

    const currentTxId = editTransaction?.id;
    const cleanItemName = itemName.trim();
    const cleanItemNameLower = cleanItemName.toLowerCase();

    // Get selected subcategory object if any
    const selectedSub = selectedCatObj?.subCategories?.find((s) => s.id === subCategoryId);
    const subName = selectedSub?.name?.trim() || '';
    const subNameLower = subName.toLowerCase();

    // Past expense transactions (excluding currently edited transaction) sorted newest to oldest
    const pastExpenseTxs = allTransactions
      .filter((t) => t.id !== currentTxId && t.type === 'expense')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (pastExpenseTxs.length === 0) return null;

    // Target item name: either from single shopping list item or itemName input
    const targetItemName = entryMode === 'shopping_list' && shoppingItems[0]?.name?.trim()
      ? shoppingItems[0].name.trim()
      : cleanItemName;
    const targetItemLower = targetItemName.toLowerCase();

    // -------------------------------------------------------------------------
    // PRIORITY 1: Specific Product/Item Name Match (တူညီသော ကုန်ပစ္စည်းအမည် တိုက်ရိုက်ယှဉ်ခြင်း)
    // -------------------------------------------------------------------------
    if (targetItemLower.length >= 1) {
      // 1.1: Match in past shopping list items (t.items)
      for (const tx of pastExpenseTxs) {
        if (tx.items && tx.items.length > 0) {
          const matchedItem = tx.items.find(
            (it) => it.name && it.name.trim().toLowerCase() === targetItemLower
          );
          if (matchedItem) {
            const unitPrice =
              matchedItem.price > 0
                ? matchedItem.price
                : matchedItem.quantity > 0 && matchedItem.amount
                ? Math.round(matchedItem.amount / matchedItem.quantity)
                : matchedItem.amount || 0;
            if (unitPrice > 0) {
              return {
                amount: unitPrice,
                date: tx.date,
                matchedName: matchedItem.name.trim(),
                matchType: 'item',
                originalTxId: tx.id,
                note: matchedItem.name,
              };
            }
          }
        }
      }

      // 1.2: Match in past transactions whose note matches the target item name
      for (const tx of pastExpenseTxs) {
        if (tx.note && (tx.note.trim().toLowerCase() === targetItemLower || tx.note.trim().toLowerCase().startsWith(targetItemLower))) {
          const unitPrice = tx.unitPrice && tx.unitPrice > 0 ? tx.unitPrice : tx.amount || 0;
          if (unitPrice > 0) {
            return {
              amount: unitPrice,
              date: tx.date,
              matchedName: tx.note.trim(),
              matchType: 'note',
              originalTxId: tx.id,
              note: tx.note,
            };
          }
        }
      }

      // 1.3: Match if target item name matches a past subcategory item (e.g. subcategory "ရေသန့်")
      for (const tx of pastExpenseTxs) {
        if (tx.subCategoryId) {
          const cat = categories.find((c) => c.id === tx.category);
          const sub = cat?.subCategories?.find((s) => s.id === tx.subCategoryId);
          if (sub && sub.name.trim().toLowerCase() === targetItemLower && tx.amount > 0) {
            return {
              amount: tx.amount,
              date: tx.date,
              matchedName: sub.name.trim(),
              matchType: 'item',
              originalTxId: tx.id,
              note: tx.note || sub.name,
            };
          }
        }
      }

      // 1.4: Check unified item intelligence suggestions database
      const foundInSuggestions = findMatchingItemInfo(targetItemName, unifiedItemSuggestions);
      if (foundInSuggestions && foundInSuggestions.latestPrice > 0) {
        return {
          amount: foundInSuggestions.latestPrice,
          date: foundInSuggestions.latestDate || getLocalDateString(),
          matchedName: foundInSuggestions.name,
          matchType: 'item',
          note: foundInSuggestions.name,
        };
      }

      // If user typed a specific item/product name (e.g., "ရေသန့်" or "ဆန် 1 အိတ်") and NO past purchase of that item exists:
      // If the note is distinct (not empty and not the subcategory name itself), do NOT compare with unrelated items in the subcategory!
      const isGenericOrSubMatch = !targetItemLower || targetItemLower === subNameLower;
      if (!isGenericOrSubMatch) {
        return null;
      }
    }

    // -------------------------------------------------------------------------
    // PRIORITY 2: Sub-Category Fallback (ကုန်ပစ္စည်းသီးသန့်မပါသော အသုံးစရိတ် - ဥပမာ မနက်စာ)
    // -------------------------------------------------------------------------
    if (subCategoryId) {
      // Find past transactions with the same subCategoryId (prefer transactions without complex shopping baskets)
      for (const tx of pastExpenseTxs) {
        if (tx.subCategoryId === subCategoryId && tx.amount > 0) {
          return {
            amount: tx.amount,
            date: tx.date,
            matchedName: subName || 'Sub-Category',
            matchType: 'subcategory',
            originalTxId: tx.id,
            note: tx.note || subName,
          };
        }
      }
    }

    // -------------------------------------------------------------------------
    // PRIORITY 3: Category Fallback (if no subcategory and no note)
    // -------------------------------------------------------------------------
    if (!subCategoryId && targetItemLower.length === 0 && effectiveCategoryId) {
      for (const tx of pastExpenseTxs) {
        if (tx.category === effectiveCategoryId && !tx.subCategoryId && tx.amount > 0) {
          return {
            amount: tx.amount,
            date: tx.date,
            matchedName: selectedCatObj?.name || 'Category',
            matchType: 'category',
            originalTxId: tx.id,
            note: tx.note,
          };
        }
      }
    }

    return null;
  }, [
    isOpen,
    type,
    allTransactions,
    editTransaction,
    entryMode,
    shoppingItems,
    itemName,
    subCategoryId,
    selectedCatObj,
    effectiveCategoryId,
    categories,
    unifiedItemSuggestions,
  ]);

  // Calculate price difference between current typed price (Unit price in unit_qty mode, or total in direct mode) and latest past purchase
  const currentEffectivePrice = useMemo(() => {
    if (entryMode === 'unit_qty') {
      return parseFloat(unitPrice) || 0;
    }
    return parseFloat(amount) || 0;
  }, [entryMode, unitPrice, amount]);

  const priceComparison = useMemo(() => {
    if (!isOpen || !latestPreviousPurchase || currentEffectivePrice <= 0) return null;
    const diff = currentEffectivePrice - latestPreviousPurchase.amount;
    const percent = latestPreviousPurchase.amount > 0 ? (diff / latestPreviousPurchase.amount) * 100 : 0;
    return {
      diff,
      percent,
      isHigher: diff > 0,
      isLower: diff < 0,
      isEqual: diff === 0,
    };
  }, [isOpen, latestPreviousPurchase, currentEffectivePrice]);

  const handleApplyPreviousPrice = () => {
    if (!latestPreviousPurchase) return;
    const p = latestPreviousPurchase.amount;
    if (entryMode === 'unit_qty') {
      setUnitPrice(String(p));
      const q = parseFloat(quantity) || 1;
      setAmount(String(p * q));
    } else {
      setAmount(String(p));
    }
  };

  // [v6.24] Auto-derive transaction type from category selection
  useEffect(() => {
    if (!isOpen) return;
    if (!selectedCatObj) return;
    if (isTransferCategory) return;
    const catType = selectedCatObj.type;
    if (catType && type !== catType) setType(catType);
  }, [isOpen, selectedCatObj?.id, isTransferCategory]);

  if (!isOpen) return null;

  const handleAddAmount = (add: number) => {
    const current = parseFloat(amount) || 0;
    setAmount((current + add).toString());
  };

  const handleCreateQuickSub = () => {
    if (!newSubName.trim()) return;
    if (plan !== 'premium') {
      onOpenUpgrade();
      return;
    }
    if (onAddSubCategory && effectiveCategoryId) {
      onAddSubCategory(effectiveCategoryId, {
        name: newSubName.trim(),
        nameEn: newSubName.trim(),
        isCustom: true,
      });
      setNewSubName('');
      setShowQuickAddSub(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !isActionAllowed) return;
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return;

    setIsSubmitting(true);

    // Filter valid shopping items
    const validItems = shoppingItems
      .filter((i) => i.name.trim() && i.price > 0 && i.quantity > 0)
      .map((i) => ({
        name: i.name.trim(),
        price: i.price,
        quantity: i.quantity,
        amount: i.price * i.quantity,
      }));

    // Enforce relational integrity for transaction amount
    let finalAmount = numAmount;
    if (entryMode === 'shopping_list' && validItems.length > 0) {
      finalAmount = validItems.reduce((sum, item) => sum + item.amount, 0);
    } else if (entryMode === 'unit_qty' && parseFloat(unitPrice) > 0 && parseFloat(quantity) > 0) {
      finalAmount = parseFloat(unitPrice) * parseFloat(quantity);
    }

    try {
      let vehicleLinkPayload: VehicleLinkData | undefined = undefined;
      const targetVehicleId = vehicleId || (vehicles && vehicles[0]?.id) || '';

      if (entryModel === 'fuel' && targetVehicleId) {
        const odoNum = parseFloat(vehicleOdometer) || undefined;
        const litersNum = parseFloat(fuelLiters) || 0;
        const pplNum = parseFloat(fuelPricePerLiter) || (litersNum > 0 ? Math.round(finalAmount / litersNum) : 0);
        vehicleLinkPayload = {
          vehicleId: targetVehicleId,
          logType: 'fuel',
          fuelType: fuelType || 'Octane 92',
          liters: litersNum,
          pricePerLiter: pplNum,
          gasStation: fuelGasStation.trim() || undefined,
          isFullTank: fuelIsFullTank,
          odometer: odoNum,
        };
      } else if (entryModel === 'vehicle_service' && targetVehicleId) {
        const odoNum = parseFloat(vehicleOdometer) || undefined;
        vehicleLinkPayload = {
          vehicleId: targetVehicleId,
          logType: 'maintenance',
          serviceType: maintServiceType,
          title: maintTitle.trim() || extraNote.trim() || (lang === 'my' ? 'ယာဉ်ပြုပြင်ထိန်းသိမ်းမှု' : 'Vehicle Service'),
          sparePartBrand: maintSparePartBrand.trim() || undefined,
          workshopName: maintWorkshopName.trim() || undefined,
          expectedLifespanKm: parseFloat(maintLifespanKm) || undefined,
          expectedLifespanDays: parseFloat(maintLifespanDays) || undefined,
          odometer: odoNum,
        };
      } else if (type === 'expense' && isVehicleLinkEnabled && targetVehicleId) {
        const odoNum = parseFloat(vehicleOdometer) || undefined;
        if (vehicleLogType === 'fuel') {
          const litersNum = parseFloat(fuelLiters) || 0;
          const pplNum = parseFloat(fuelPricePerLiter) || (litersNum > 0 ? Math.round(finalAmount / litersNum) : 0);
          vehicleLinkPayload = {
            vehicleId: targetVehicleId,
            logType: 'fuel',
            fuelType: fuelType || 'Octane 92',
            liters: litersNum,
            pricePerLiter: pplNum,
            gasStation: fuelGasStation.trim() || undefined,
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
            expectedLifespanKm: parseFloat(maintLifespanKm) || undefined,
            expectedLifespanDays: parseFloat(maintLifespanDays) || undefined,
            odometer: odoNum,
          };
        } else if (vehicleLogType === 'tire') {
          vehicleLinkPayload = {
            vehicleId: targetVehicleId,
            logType: 'tire',
            frontLeftPsi: parseFloat(tireFL) || undefined,
            frontRightPsi: parseFloat(tireFR) || undefined,
            rearLeftPsi: parseFloat(tireRL) || undefined,
            rearRightPsi: parseFloat(tireRR) || undefined,
            odometer: odoNum,
          };
        }
      }

      let targetCategory = effectiveCategoryId;
      if (entryModel === 'fuel' || entryModel === 'vehicle_service' || (type === 'expense' && isVehicleLinkEnabled)) {
        const vehicleCategory = categories.find(
          (c) =>
            c.id === 'cat_vehicle' ||
            c.id === 'cat_vehicle_management' ||
            c.name.includes('ယာဉ်စီမံ') ||
            (c.nameEn && c.nameEn.toLowerCase().includes('vehicle management'))
        );
        if (vehicleCategory) {
          targetCategory = vehicleCategory.id;
        }
      }

      let targetSubCategory = subCategoryId || undefined;
      if (entryModel === 'fuel') {
        targetSubCategory = 'sub_veh_fuel';
      } else if (entryModel === 'vehicle_service') {
        if (!targetSubCategory || targetSubCategory === 'sub_veh_fuel') {
          if (maintServiceType === 'tires') targetSubCategory = 'sub_veh_tire';
          else if (maintServiceType === 'engine_oil') targetSubCategory = 'sub_veh_parts';
          else targetSubCategory = 'sub_veh_maintenance';
        }
      }

      let finalNote: string | undefined = undefined;
      if (entryModel === 'fuel') {
        const stationPart = fuelGasStation ? ` (${fuelGasStation})` : '';
        const fuelDesc = `${fuelType || (lang === 'my' ? 'စက်သုံးဆီ' : 'Fuel')}${stationPart}`;
        const userNote = extraNote.trim();
        finalNote = userNote ? `${fuelDesc} - ${userNote}` : fuelDesc;
      } else if (entryModel === 'vehicle_service') {
        const svcDesc = maintTitle.trim() || (lang === 'my' ? 'ယာဉ်ဝန်ဆောင်မှု' : 'Vehicle Service');
        const shopPart = maintWorkshopName.trim() ? ` [${maintWorkshopName.trim()}]` : '';
        const userNote = extraNote.trim();
        finalNote = userNote ? `${svcDesc}${shopPart} - ${userNote}` : `${svcDesc}${shopPart}`;
      } else if (type === 'expense') {
        if (entryMode === 'shopping_list') {
          finalNote = extraNote.trim() || (itemName.trim() || undefined);
        } else {
          const cleanItem = itemName.trim();
          const cleanExtra = extraNote.trim();
          if (cleanItem && cleanExtra) {
            finalNote = `${cleanItem} (${cleanExtra})`;
          } else if (cleanItem) {
            finalNote = cleanItem;
          } else if (cleanExtra) {
            finalNote = cleanExtra;
          }
        }
      } else {
        const cleanItem = itemName.trim();
        const cleanExtra = extraNote.trim();
        if (cleanItem && cleanExtra) {
          finalNote = `${cleanItem} (${cleanExtra})`;
        } else {
          finalNote = cleanItem || cleanExtra || undefined;
        }
      }

      const isTransferTx =
        isTransferCategory ||
        targetSubCategory === 'sub_tf_out' ||
        targetSubCategory === 'sub_tf_in';

      const finalWalletId = walletId;

      if (typeof localStorage !== 'undefined' && finalWalletId) {
        localStorage.setItem('fortune_last_used_wallet_id', finalWalletId);
      }

      onSubmit({
        type: entryModel === 'fuel' || entryModel === 'vehicle_service' ? 'expense' : type,
        amount: finalAmount,
        category: targetCategory,
        subCategoryId: targetSubCategory,
        walletId: finalWalletId,
        date,
        note: finalNote,
        isTransfer: isTransferTx,
        transferType: isTransferTx ? (type === 'expense' ? 'transfer_out' : 'transfer_in') : undefined,
        transferToWalletId:
          isTransferTx && transferToWalletId && transferToWalletId !== walletId
            ? transferToWalletId
            : undefined,
        items: entryModel === 'general' && entryMode === 'shopping_list' && validItems.length > 0 ? validItems : undefined,
        unitPrice: entryModel === 'general' && entryMode === 'unit_qty' && parseFloat(unitPrice) > 0 ? parseFloat(unitPrice) : undefined,
        quantity: entryModel === 'general' && entryMode === 'unit_qty' && parseFloat(quantity) > 0 ? parseFloat(quantity) : undefined,
      }, vehicleLinkPayload);
    } finally {
      onClose();
      setIsSubmitting(false);
    }
  };



  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="flex flex-col h-full min-h-0"
        >
          {/* ── NAV BAR ── */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="text-sm font-semibold text-slate-600 hover:text-slate-900 px-2 py-1 -ml-2"
            >
              {lang === 'my' ? 'မလုပ်တော့' : 'Cancel'}
            </button>
            <h2 className="font-bold text-slate-900 text-sm sm:text-base truncate">
              {isEditing
                ? (lang === 'my' ? 'စာရင်းပြင်ဆင်ခြင်း' : 'Edit Transaction')
                : (lang === 'my' ? 'စာရင်းအသစ်' : 'New Transaction')}
            </h2>
            <button
              type="submit"
              disabled={isSubmitting || !isActionAllowed}
              className="text-sm font-bold text-emerald-600 hover:text-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed px-2 py-1 -mr-2 flex items-center gap-1"
            >
              {isSubmitting ? '...' : (
                <>
                  <Check className="w-3.5 h-3.5" strokeWidth={3} />
                  <span>{lang === 'my' ? 'သိမ်း' : 'Save'}</span>
                </>
              )}
            </button>
          </div>

          {/* ── MORE OPTIONS BAR ── */}
          <div className="px-3 py-2 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMoreOpen(!moreOpen)}
                className="flex-1 flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors text-xs font-bold text-slate-700"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{lang === 'my' ? 'နောက်ထပ် ရွေးချယ်စရာများ' : 'More Options'}</span>
                </span>
                {moreOpen
                  ? <ChevronUp className="w-4 h-4 text-slate-400" />
                  : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>
              {isVehicleRelatedCategory && (
                <button
                  type="button"
                  onClick={() => setShowFuelGuideModal(true)}
                  className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200"
                  title={lang === "my" ? "ဆီဖိုး လမ်းညွှန်" : "Fuel Guide"}
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              )}
            </div>

            {moreOpen && (
              <div className="mt-1.5 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                {(isVehicleRelatedCategory || showModelSelector) && (
                  <>
                    <button
                      type="button"
                      onClick={() => { handleSwitchModel("fuel"); setMoreOpen(false); }}
                      className={"w-full flex items-center gap-2 px-3 py-2 text-xs font-bold transition-colors " + (entryModel === "fuel" ? "bg-emerald-50 text-emerald-800" : "text-slate-700 hover:bg-slate-50")}
                    >
                      <Fuel className="w-4 h-4" />
                      <span>{lang === 'my' ? 'ဆီဖိုး' : 'Fuel'}</span>
                      {entryModel === "fuel" && <Check className="w-3.5 h-3.5 ml-auto text-emerald-600" strokeWidth={3} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => { handleSwitchModel("vehicle_service"); setMoreOpen(false); }}
                      className={"w-full flex items-center gap-2 px-3 py-2 text-xs font-bold transition-colors " + (entryModel === "vehicle_service" && maintServiceType !== "tires" ? "bg-blue-50 text-blue-800" : "text-slate-700 hover:bg-slate-50")}
                    >
                      <Wrench className="w-4 h-4" />
                      <span>{lang === 'my' ? 'ဝန်ဆောင်မှု / ပြုပြင်' : 'Service / Repair'}</span>
                      {entryModel === "vehicle_service" && maintServiceType !== "tires" && <Check className="w-3.5 h-3.5 ml-auto text-blue-600" strokeWidth={3} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => { handleSwitchModel("vehicle_service"); setMaintServiceType("tires"); setMoreOpen(false); }}
                      className={"w-full flex items-center gap-2 px-3 py-2 text-xs font-bold transition-colors " + (entryModel === "vehicle_service" && maintServiceType === "tires" ? "bg-amber-50 text-amber-800" : "text-slate-700 hover:bg-slate-50")}
                    >
                      <Car className="w-4 h-4" />
                      <span>{lang === 'my' ? 'တာယာ လဲလှယ်' : 'Tire Replacement'}</span>
                      {entryModel === "vehicle_service" && maintServiceType === "tires" && <Check className="w-3.5 h-3.5 ml-auto text-amber-600" strokeWidth={3} />}
                    </button>
                    <div className="h-px bg-slate-100 my-0.5" />
                  </>
                )}
                <button
                  type="button"
                  onClick={() => { setEntryMode("unit_qty"); setEntryModel("general"); setShowQuickAddSub(false); setMoreOpen(false); }}
                  className={"w-full flex items-center gap-2 px-3 py-2 text-xs font-bold transition-colors " + (entryMode === "unit_qty" && entryModel === "general" ? "bg-indigo-50 text-indigo-800" : "text-slate-700 hover:bg-slate-50")}
                >
                  <Boxes className="w-4 h-4" />
                  <span>{lang === 'my' ? 'ဈေး × အရေအတွက်' : 'Unit Price × Qty'}</span>
                  {entryMode === "unit_qty" && entryModel === "general" && <Check className="w-3.5 h-3.5 ml-auto text-indigo-600" strokeWidth={3} />}
                </button>
                <button
                  type="button"
                  onClick={() => { setEntryMode("shopping_list"); setEntryModel("general"); setShowQuickAddSub(false); setMoreOpen(false); }}
                  className={"w-full flex items-center gap-2 px-3 py-2 text-xs font-bold transition-colors " + (entryMode === "shopping_list" && entryModel === "general" ? "bg-amber-50 text-amber-800" : "text-slate-700 hover:bg-slate-50")}
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>{lang === 'my' ? 'ဈေးဝယ်စာရင်း' : 'Shopping List'}</span>
                  {entryMode === "shopping_list" && entryModel === "general" && <Check className="w-3.5 h-3.5 ml-auto text-amber-600" strokeWidth={3} />}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowQuickAddSub(true); setEntryMode("direct"); setEntryModel("general"); setMoreOpen(false); }}
                  className={"w-full flex items-center gap-2 px-3 py-2 text-xs font-bold transition-colors " + (showQuickAddSub ? "bg-slate-100 text-slate-800" : "text-slate-700 hover:bg-slate-50")}
                >
                  <FileText className="w-4 h-4" />
                  <span>{lang === 'my' ? 'ပစ္စည်းအမည်' : 'Item Name'}</span>
                  {showQuickAddSub && <Check className="w-3.5 h-3.5 ml-auto text-slate-700" strokeWidth={3} />}
                </button>
              </div>
            )}
          </div>

          {/* ── SCROLLABLE CONTENT ── */}
          <div className="flex-1 overflow-y-auto overscroll-contain">

            {/* Vehicle mode badge */}
            {entryModel !== "general" && (
              <div className="px-3 pt-3">
                <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200">
                  <span className="text-xs font-bold text-emerald-800">
                    {entryModel === 'fuel' && (lang === 'my' ? '⛽ ဆီဖိုး Mode' : '⛽ Fuel Mode')}
                    {entryModel === 'vehicle_service' && maintServiceType === 'tires' && (lang === 'my' ? '🛞 တာယာ Mode' : '🛞 Tire Mode')}
                    {entryModel === 'vehicle_service' && maintServiceType !== 'tires' && (lang === 'my' ? '🔧 ဝန်ဆောင်မှု Mode' : '🔧 Service Mode')}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setEntryModel("general"); setIsVehicleLinkEnabled(false); }}
                    className="text-[10px] font-bold text-slate-500 hover:text-slate-800"
                  >
                    ✕ {lang === 'my' ? 'ပိတ်' : 'Close'}
                  </button>
                </div>
              </div>
            )}

            {/* Type indicator */}
            <div className="px-4 pt-3 pb-1 text-center">
              {type === "income"
                ? <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                    <ArrowDownLeft className="w-3 h-3" />
                    {lang === 'my' ? 'ဝင်ငွေ' : 'Income'}
                  </span>
                : <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600">
                    <ArrowUpRight className="w-3 h-3" />
                    {lang === 'my' ? 'ထွက်ငွေ' : 'Expense'}
                  </span>}
            </div>

            {/* BIG AMOUNT */}
            <div className="px-4 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="text-xl font-black text-slate-400 shrink-0">
                  {selectedWallet?.currency || 'MMK'}
                </span>
                <input
                  type="number"
                  step="any"
                  value={amount}
                  onChange={(e) => handleAmountChangeWithFuelSync(e.target.value)}
                  placeholder="0"
                  autoFocus={!isEditing}
                  className="flex-1 min-w-0 text-4xl font-black text-slate-900 bg-transparent border-0 focus:outline-none text-center"
                />
              </div>
              {!(entryModel === "fuel" && vehicleId) && (
                <div className="flex justify-center gap-1.5 mt-2 flex-wrap">
                  <button type="button" onClick={() => handleAddAmount(1000)} className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-[11px] font-bold text-slate-600">+1K</button>
                  <button type="button" onClick={() => handleAddAmount(10000)} className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-[11px] font-bold text-slate-600">+10K</button>
                  <button type="button" onClick={() => handleAddAmount(100000)} className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 rounded text-[11px] font-bold text-indigo-700">+100K</button>
                </div>
              )}
            </div>

            {/* CATEGORY ROW */}
            <button
              type="button"
              onClick={() => setIsCategoryPickerOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 hover:bg-slate-50 transition-colors text-left"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
                style={{ backgroundColor: selectedCatObj?.color || "#94A3B8" }}
              >
                <CategoryIcon name={selectedCatObj?.icon || "Tag"} className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                {categoryId ? (
                  <>
                    <div className="text-sm font-bold text-slate-900 truncate">
                      {selectedCatObj ? (lang === 'my' ? selectedCatObj.name : selectedCatObj.nameEn) : ''}
                    </div>
                    {(() => {
                      const sub = availableSubCats.find((s) => s.id === subCategoryId);
                      if (!sub) return null;
                      return (
                        <div className="text-xs text-emerald-700 truncate mt-0.5">
                          ↳ {lang === 'my' ? sub.name : sub.nameEn}
                        </div>
                      );
                    })()}
                  </>
                ) : (
                  <div className="text-sm font-bold text-slate-400">
                    {lang === 'my' ? 'ကဏ္ဍ ရွေးရန်' : 'Select category'}
                  </div>
                )}
              </div>
              <span className="text-slate-300 text-xl shrink-0">›</span>
            </button>

            {/* TRANSFER WALLETS */}
            {isTransferCategory && (
              <div className="px-4 py-3 border-b border-slate-100 space-y-2">
                <div className="text-xs font-bold text-indigo-900">
                  {lang === 'my' ? 'ငွေလွှဲပြောင်းမှု' : 'Transfer'}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[10px] font-bold text-rose-700 mb-0.5">
                      {lang === 'my' ? 'မှ' : 'From'}
                    </div>
                    <select value={walletId} onChange={(e) => setWalletId(e.target.value)} className="w-full text-xs px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
                      {wallets.map((w) => (
                        <option key={w.id} value={w.id}>
                          {lang === 'my' ? w.name : w.nameEn}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-emerald-700 mb-0.5">
                      {lang === 'my' ? 'သို့' : 'To'}
                    </div>
                    <select value={transferToWalletId} onChange={(e) => setTransferToWalletId(e.target.value)} className="w-full text-xs px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
                      {wallets.filter((w) => w.id !== walletId).map((w) => (
                        <option key={w.id} value={w.id}>
                          {lang === 'my' ? w.name : w.nameEn}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* FUEL ROWS */}
            {entryModel === "fuel" && (
              <>
                <div className="px-4 py-3 border-b border-slate-100">
                  <div className="text-xs font-bold text-slate-500 mb-1">
                    {lang === 'my' ? 'ယာဉ်' : 'Vehicle'}
                  </div>
                  <select
                    value={vehicleId}
                    onChange={(e) => {
                      setVehicleId(e.target.value);
                      const v = vehicles.find((x) => x.id === e.target.value);
                      if (v?.currentOdometer) setVehicleOdometer(String(v.currentOdometer));
                      if (v?.fuelType) setFuelType(v.fuelType);
                      if (v?.walletId && wallets.some((w) => w.id === v.walletId)) setWalletId(v.walletId);
                    }}
                    className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} {v.plateNumber ? "(" + v.plateNumber + ")" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                    <Fuel className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-500">
                      {lang === 'my' ? 'ဆီပမာဏ (L)' : 'Liters (L)'}
                    </div>
                    <input
                      type="number"
                      step="any"
                      value={fuelLiters}
                      onChange={(e) => handleFuelLitersChange(e.target.value)}
                      placeholder="0"
                      className="w-full text-sm font-bold bg-transparent border-0 focus:outline-none font-mono mt-0.5"
                    />
                  </div>
                </div>
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                    <span className="text-amber-600 font-black text-lg">K</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-500">
                      {lang === 'my' ? '၁ လီတာ ဈေး (Ks)' : 'Price per Liter (Ks)'}
                    </div>
                    <input
                      type="number"
                      value={fuelPricePerLiter}
                      onChange={(e) => handleFuelPriceChange(e.target.value)}
                      placeholder="0"
                      className="w-full text-sm font-bold bg-transparent border-0 focus:outline-none font-mono mt-0.5"
                    />
                  </div>
                </div>
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-500">
                      {lang === 'my' ? 'ဆီအမျိုးအစား' : 'Fuel Type'}
                    </div>
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
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                    <History className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-500">
                      {lang === 'my' ? 'ဆီဆိုင်' : 'Gas Station'}
                    </div>
                    <select value={fuelGasStation} onChange={(e) => setFuelGasStation(e.target.value)} className="w-full text-sm font-bold bg-transparent border-0 focus:outline-none mt-0.5">
                      <option value="">{lang === 'my' ? '-- ရွေးပါ --' : '-- Select --'}</option>
                      {GAS_STATIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                    <Gauge className="w-5 h-5 text-slate-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-500">
                      {lang === 'my' ? 'မိုင်တာ (km)' : 'Odometer (km)'}
                    </div>
                    <input
                      type="number"
                      value={vehicleOdometer}
                      onChange={(e) => setVehicleOdometer(e.target.value)}
                      placeholder="0"
                      className="w-full text-sm font-bold bg-transparent border-0 focus:outline-none font-mono mt-0.5"
                    />
                  </div>
                </div>
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                    {fuelIsFullTank ? <Check className="w-5 h-5 text-emerald-600" /> : <X className="w-5 h-5 text-slate-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-500">
                      {lang === 'my' ? 'တိုင်ကီအပြည့်' : 'Full Tank'}
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">
                      {fuelIsFullTank ? (lang === 'my' ? 'အပြည့်' : 'Yes') : (lang === 'my' ? 'တစ်စိတ်တပိုင်း' : 'Partial')}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFuelIsFullTank(!fuelIsFullTank)}
                    className={"w-10 h-6 rounded-full transition-colors relative shrink-0 " + (fuelIsFullTank ? "bg-emerald-600" : "bg-slate-300")}
                  >
                    <span className={"absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all " + (fuelIsFullTank ? "left-[18px]" : "left-0.5")} />
                  </button>
                </div>
              </>
            )}

            {/* VEHICLE SERVICE ROWS */}
            {entryModel === "vehicle_service" && (
              <>
                <div className="px-4 py-3 border-b border-slate-100">
                  <div className="text-xs font-bold text-slate-500 mb-1">
                    {lang === 'my' ? 'ယာဉ်' : 'Vehicle'}
                  </div>
                  <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold">
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
                <div className="px-4 py-3 border-b border-slate-100">
                  <div className="text-xs font-bold text-slate-500 mb-1">
                    {lang === 'my' ? 'ဝန်ဆောင်မှု အမျိုးအစား' : 'Service Type'}
                  </div>
                  <select
                    value={maintServiceType}
                    onChange={(e) => setMaintServiceType(e.target.value as VehicleServiceType)}
                    className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
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
                    <option value="other">{lang === "my" ? "📦 အခြား" : "📦 Other"}</option>
                  </select>
                </div>
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                  <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={maintTitle}
                    onChange={(e) => setMaintTitle(e.target.value)}
                    placeholder={lang === 'my' ? 'ခေါင်းစဉ် / အသေးစိတ်' : 'Title / Details'}
                    className="flex-1 text-sm font-bold bg-transparent border-0 focus:outline-none"
                  />
                </div>
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                  <Wrench className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={maintWorkshopName}
                    onChange={(e) => setMaintWorkshopName(e.target.value)}
                    placeholder={lang === 'my' ? 'ဝပ်ရှော့ အမည်' : 'Workshop name'}
                    className="flex-1 text-sm font-bold bg-transparent border-0 focus:outline-none"
                  />
                </div>
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                    <Gauge className="w-5 h-5 text-slate-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-500">
                      {lang === 'my' ? 'မိုင်တာ (km)' : 'Odometer (km)'}
                    </div>
                    <input
                      type="number"
                      value={vehicleOdometer}
                      onChange={(e) => setVehicleOdometer(e.target.value)}
                      placeholder="0"
                      className="w-full text-sm font-bold bg-transparent border-0 focus:outline-none font-mono mt-0.5"
                    />
                  </div>
                </div>
              </>
            )}

            {/* UNIT QTY ROWS */}
            {entryMode === "unit_qty" && entryModel === "general" && (
              <>
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-500 w-20 shrink-0">{lang === "my" ? "ဈေးနှုန်း" : "Unit Price"}</span>
                  <input
                    type="number"
                    value={unitPrice}
                    onChange={(e) => handleUnitQtyChange("price", e.target.value)}
                    placeholder="0"
                    className="flex-1 text-sm font-bold bg-transparent border-0 focus:outline-none font-mono text-right"
                  />
                </div>
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-500 w-20 shrink-0">{lang === "my" ? "အရေအတွက်" : "Quantity"}</span>
                  <input
                    type="number"
                    step="any"
                    value={quantity}
                    onChange={(e) => handleUnitQtyChange("qty", e.target.value)}
                    placeholder="1"
                    className="flex-1 text-sm font-bold bg-transparent border-0 focus:outline-none font-mono text-right"
                  />
                </div>
              </>
            )}

            {/* SHOPPING LIST */}
            {entryMode === "shopping_list" && entryModel === "general" && (
              <div className="px-3 py-3 border-b border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <ShoppingCart className="w-3.5 h-3.5" />
                    {lang === 'my' ? 'ဈေးဝယ်စာရင်း' : 'Shopping List'}
                  </span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setIsShoppingPriceHistoryOpen(true)} className="text-[10px] font-bold text-indigo-700 hover:underline">
                      {lang === 'my' ? 'ဈေးနှိုင်းယှဉ်' : 'History'}
                    </button>
                    <button type="button" onClick={autoGenerateShoppingNote} className="text-[10px] font-bold text-amber-800 hover:underline">
                      ✨ {lang === 'my' ? 'မှတ်ချက်ရေး' : 'Note'}
                    </button>
                  </div>
                </div>
                <div ref={shoppingListContainerRef} className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {shoppingItems.map((item, idx) => {
                    const pastPurchase = getPastPriceForItem(item.name);
                    return (
                      <div key={item.id || idx} className="bg-slate-50 rounded-xl p-2.5 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            list="db-item-suggestions"
                            value={item.name}
                            onChange={(e) => updateShoppingItem(item.id || "", "name", e.target.value)}
                            placeholder={lang === 'my' ? 'ပစ္စည်းအမည်' : 'Item name'}
                            className="flex-1 text-xs font-bold bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none"
                          />
                          <button type="button" onClick={() => removeShoppingItemRow(item.id || "")} className="p-1 text-slate-400 hover:text-rose-600 shrink-0">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          <input type="number" value={item.price || ""} onChange={(e) => updateShoppingItem(item.id || "", "price", e.target.value)} placeholder="ဈေး" className="text-xs font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 focus:outline-none font-mono" />
                          <input type="number" step="any" value={item.quantity || ""} onChange={(e) => updateShoppingItem(item.id || "", "quantity", e.target.value)} placeholder="Qty" className="text-xs font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 focus:outline-none font-mono text-center" />
                          <input type="number" value={item.amount || ""} onChange={(e) => updateShoppingItem(item.id || "", "amount", e.target.value)} placeholder="Total" className="text-xs font-bold bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 focus:outline-none font-mono text-right" />
                        </div>
                        {pastPurchase && item.price > 0 && (
                          <div className="text-[10px] text-slate-500">
                            {lang === 'my' ? 'ယခင်:' : 'Prev:'} {formatMMK(pastPurchase.price)} ({pastPurchase.date})
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <button type="button" onClick={addShoppingItemRow} className="w-full mt-2 py-1.5 border-2 border-dashed border-amber-300 rounded-xl text-xs font-bold text-amber-800 hover:bg-amber-50">
                  + {lang === 'my' ? 'ပစ္စည်းထပ်ထည့်' : 'Add item'}
                </button>
              </div>
            )}

            {/* ITEM NAME (from More Options) */}
            {showQuickAddSub && entryModel === "general" && entryMode === "direct" && (
              <div className="px-4 py-3 border-b border-slate-100">
                <div className="text-xs font-bold text-slate-500 mb-1">
                  {lang === 'my' ? 'ပစ္စည်းအမည်' : 'Item Name'}
                </div>
                <input
                  type="text"
                  list="db-item-suggestions"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder={lang === 'my' ? 'ဥပမာ - ဆန် / ဆီ' : 'e.g. Rice'}
                  className="w-full text-sm font-bold bg-transparent border-0 focus:outline-none"
                />
              </div>
            )}

            {/* PRICE COMPARISON */}
            {entryModel === "general" && latestPreviousPurchase && currentEffectivePrice > 0 && priceComparison && (
              <div className="px-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  <History className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className="text-slate-500">{lang === 'my' ? 'ယခင်ဈေး' : 'Prev'}:</span>
                  <button type="button" onClick={handleApplyPreviousPrice} className="font-bold text-indigo-700 underline font-mono">
                    {formatMMK(latestPreviousPurchase.amount)}
                  </button>
                  {priceComparison.isHigher && (
                    <span className="text-rose-600 font-bold flex items-center gap-0.5 ml-auto">
                      <TrendingUp className="w-3 h-3" /> +{Math.round(priceComparison.percent)}%
                    </span>
                  )}
                  {priceComparison.isLower && (
                    <span className="text-emerald-600 font-bold flex items-center gap-0.5 ml-auto">
                      <TrendingDown className="w-3 h-3" /> {Math.round(priceComparison.percent)}%
                    </span>
                  )}
                  {priceComparison.isEqual && (
                    <span className="text-slate-500 font-bold ml-auto flex items-center gap-0.5">
                      <Minus className="w-3 h-3" /> {lang === 'my' ? 'တူညီ' : 'Same'}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* WALLET ROW */}
            <button
              type="button"
              onClick={() => setWalletExpanded(!walletExpanded)}
              className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 hover:bg-slate-50 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0" style={{ backgroundColor: selectedWallet?.color || "#6366F1" }}>
                <Wallet className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-slate-900 truncate">
                  {selectedWallet ? (lang === 'my' ? selectedWallet.name : selectedWallet.nameEn) : (lang === 'my' ? 'ပိုက်ဆံအိတ်' : 'Wallet')}
                </div>
                <div className="text-xs text-slate-500 truncate mt-0.5 font-mono">
                  {formatCurrency(selectedWallet?.balance || 0, selectedWallet?.currency || 'MMK')}
                </div>
              </div>
              <span className="text-slate-300 text-xl shrink-0">›</span>
            </button>
            {walletExpanded && (
              <div className="px-3 py-2 border-b border-slate-100 flex flex-wrap gap-1.5">
                {wallets.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => { setWalletId(w.id); setWalletExpanded(false); }}
                    className={"px-3 py-1.5 rounded-lg text-xs font-bold transition-colors " + (walletId === w.id ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200")}
                  >
                    <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: w.color }} />
                    {lang === 'my' ? w.name : w.nameEn}
                  </button>
                ))}
              </div>
            )}

            {/* DATE ROW */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-500">
                  {lang === 'my' ? 'နေ့ရက်' : 'Date'}
                </div>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full text-sm font-bold bg-transparent border-0 focus:outline-none mt-0.5" />
              </div>
            </div>

            {/* NOTE ROW */}
            <div className="px-4 py-3 border-b border-slate-100">
              <button type="button" onClick={() => setNoteExpanded(!noteExpanded)} className="w-full flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-slate-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-500">
                    {lang === 'my' ? 'မှတ်ချက်' : 'Note'}
                  </div>
                  <div className="text-sm font-bold text-slate-900 truncate mt-0.5">
                    {extraNote || (lang === 'my' ? 'ထည့်ရန် နှိပ်ပါ' : 'Tap to add')}
                  </div>
                </div>
              </button>
              {noteExpanded && (
                <input
                  type="text"
                  value={extraNote}
                  onChange={(e) => setExtraNote(e.target.value)}
                  autoFocus
                  placeholder={lang === 'my' ? 'မှတ်ချက် ထည့်ပါ...' : 'Note...'}
                  className="w-full mt-2 text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none"
                />
              )}
            </div>

            {/* PERMISSION WARNING */}
            {!isActionAllowed && (
              <div className="mx-3 my-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-amber-800 text-xs font-bold">
                <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  {lang === 'my'
                    ? 'ဤ Wallet ပိုင်ရှင်မှ ခွင့်မပြုထားပါ'
                    : 'Permission denied by wallet owner'}
                </span>
              </div>
            )}

            {/* Hidden datalist */}
            <datalist id="db-item-suggestions">
              {unifiedItemSuggestions.map((item) => (
                <option
                  key={item.normalizedName}
                  value={item.name}
                  label={item.latestPrice > 0 ? formatMMK(item.latestPrice) + " (" + item.latestDate + ")" : undefined}
                />
              ))}
            </datalist>

            <div className="h-4" />
          </div>
        </form>
      </div>

      {/* MODALS OUTSIDE FORM */}
      {isShoppingPriceHistoryOpen && (
        <ItemPriceHistoryModal
          isOpen={isShoppingPriceHistoryOpen}
          onClose={() => setIsShoppingPriceHistoryOpen(false)}
          transactions={allTransactions}
          categories={categories}
          wallets={wallets}
          lang={lang}
        />
      )}

      <CategoryPickerModal
        isOpen={isCategoryPickerOpen}
        onClose={() => setIsCategoryPickerOpen(false)}
        categories={categories}
        selectedCategoryId={categoryId}
        selectedSubCategoryId={subCategoryId}
        currentType={type}
        lang={lang}
        plan={plan}
        onSelect={(catId, subId) => {
          setCategoryId(catId);
          setSubCategoryId(subId || "");
          setIsCategoryPickerOpen(false);
        }}
        onOpenUpgrade={onOpenUpgrade}
        onAddSubCategory={onAddSubCategory}
        onManageCategories={onManageCategories}
      />

      <FuelExpenseGuideModal
        isOpen={showFuelGuideModal}
        onClose={() => setShowFuelGuideModal(false)}
        lang={lang}
      />
    </div>
  );
};
