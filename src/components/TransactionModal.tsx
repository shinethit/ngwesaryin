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

  const [showQuickAddSub, setShowQuickAddSub] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [categorySelectMode, setCategorySelectMode] = useState<'picker' | 'dropdown' | 'grid'>('picker');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setAmount(amtStr);
    const tot = parseFloat(amtStr) || 0;
    if (tot <= 0) { setUnitQtyLastEdited('total'); return; }
    const pNum = parseFloat(unitPrice) || 0;
    const qNum = parseFloat(quantity) || 0;
    computeUnitQtyThird('total', pNum, qNum, tot);
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
            if (last === 'price') { if (pNum > 0) newItem.quantity = Number((aNum / pNum).toFixed(2)); }
            else if (last === 'qty') { if (qNum > 0) newItem.price = Number((aNum / qNum).toFixed(2)); }
            else { if (pNum > 0) newItem.quantity = Number((aNum / pNum).toFixed(2)); else if (qNum > 0) newItem.price = Number((aNum / qNum).toFixed(2)); else { newItem.quantity = 1; newItem.price = aNum; } }
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
  const effectiveCategoryId =
    currentCat && (currentCat.type === type || isCurrentTransferCat) ? categoryId : filteredCats[0]?.id || '';
  const selectedCatObj = categories.find((c) => c.id === effectiveCategoryId);

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
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 touch-none overscroll-none animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] sm:max-h-[88vh] flex flex-col pointer-events-auto animate-scaleUp">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white z-10">
          <h2 className="font-bold text-lg text-slate-900">
            {isEditing
              ? (lang === 'my' ? 'စာရင်းမှတ်တမ်း ပြင်ဆင်ခြင်း' : 'Edit Transaction')
              : (lang === 'my' ? 'စာရင်း အသစ်ထည့်သွင်းခြင်း' : 'New Transaction Entry')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 flex items-center justify-center font-bold cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content Form - Single Clean Scroll Container */}
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 min-h-0 text-xs sm:text-sm overscroll-contain touch-pan-y scroll-smooth [webkit-overflow-scrolling:touch]"
        >
          {/* Prominent Wallet Indicator & Quick Switcher at Top */}
          {(() => {
            const activeWallet = wallets.find((w) => w.id === walletId) || wallets[0];
            const activeCurrency = activeWallet?.currency || 'MMK';
            const activeRate = activeWallet?.exchangeRate;
            return (
              <div className="p-3 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-indigo-600" />
                    <span>{lang === 'my' ? 'စာရင်းသွင်းမည့် ပိုက်ဆံအိတ် / အကောင့်:' : 'Target Wallet / Account:'}</span>
                  </label>
                  <span className="text-[11px] text-indigo-700 font-semibold">
                    {lang === 'my' ? 'လက်ကျန်ငွေ:' : 'Balance:'}{' '}
                    <span className="font-bold font-mono">
                      {formatCurrency(activeWallet?.balance || 0, activeCurrency)}
                    </span>
                    {activeCurrency !== 'MMK' && (
                      <span className="text-[10px] text-indigo-600 font-medium ml-1">
                        (≈ {convertToMMK(activeWallet?.balance || 0, activeCurrency, activeRate).toLocaleString()} MMK)
                      </span>
                    )}
                  </span>
                </div>

                {/* Quick Wallet Pills - Responsive Wrap (All wallets visible without scroll) */}
                <div className="flex flex-wrap items-center gap-1.5 pb-0.5">
                  {wallets.map((w) => {
                    const isSelected = walletId === w.id;
                    const wCurr = w.currency || 'MMK';
                    const isShared = Boolean(w.isSharedFromOther || (w.sharedWith && w.sharedWith.length > 0));
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => {
                          setWalletId(w.id);
                          if (typeof localStorage !== 'undefined') {
                            localStorage.setItem('fortune_last_used_wallet_id', w.id);
                          }
                        }}
                        className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : isShared
                            ? 'bg-amber-50 hover:bg-amber-100/70 text-amber-900 border border-amber-300'
                            : 'bg-white hover:bg-indigo-100/50 text-slate-700 border border-indigo-100'
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: w.color || '#6366F1' }}
                        />
                        <span>{lang === 'my' ? w.name : w.nameEn}</span>
                        {isShared && (
                          <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-amber-200/80 text-amber-900'
                          }`}>
                            {w.isSharedFromOther ? `🤝 ${w.ownerName || 'Shared'}` : '🤝 Shared'}
                          </span>
                        )}
                        {wCurr !== 'MMK' && (
                          <span className="text-[10px] opacity-75 font-mono">({wCurr})</span>
                        )}
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                      </button>
                    );
                  })}
                </div>

                {/* Date Row inside Top Wallet Card */}
                <div className="pt-2 border-t border-indigo-100/90 flex items-center justify-between gap-2">
                  <label className="text-[11px] font-bold text-indigo-950 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{lang === 'my' ? 'ရက်စွဲ (Date):' : 'Date:'}</span>
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="px-2.5 py-1 text-xs bg-white border border-indigo-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs cursor-pointer"
                  />
                </div>
              </div>
            );
          })()}

          {/* Category & Sub-Category Selection with Clean Interactive Card */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-slate-700 font-bold text-xs sm:text-sm flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-emerald-600" />
                <span>{lang === 'my' ? 'ကဏ္ဍ (Category):' : 'Category:'}</span>
              </label>

              {onManageCategories && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onManageCategories();
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-indigo-600 hover:underline cursor-pointer"
                >
                  {lang === 'my' ? '⚙️ စီမံရန်' : '⚙️ Manage'}
                </button>
              )}
            </div>

            {/* Clean Single-Tap Category Card */}
            {(() => {
              const currentCat =
                filteredCats.find((c) => c.id === effectiveCategoryId) ||
                categories.find((c) => c.id === effectiveCategoryId);
              const currentSub = availableSubCats.find((s) => s.id === subCategoryId);
              const isLocked = currentCat?.isCustom && plan !== 'premium';

              return (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setIsCategoryPickerOpen(true)}
                    className="w-full p-3 bg-white hover:bg-emerald-50/50 active:bg-emerald-100/40 border border-slate-200/90 hover:border-emerald-300 rounded-2xl transition-all flex items-center justify-between gap-3 text-left cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-xs transition-transform group-hover:scale-105"
                        style={{ backgroundColor: currentCat?.color || '#10B981' }}
                      >
                        <CategoryIcon
                          name={currentCat?.icon || 'Tag'}
                          className="w-5 h-5"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-emerald-700 truncate">
                            {currentCat
                              ? lang === 'my'
                                ? currentCat.name
                                : currentCat.nameEn
                              : lang === 'my'
                              ? 'ကဏ္ဍ ရွေးချယ်ရန် နှိပ်ပါ'
                              : 'Tap to Select Category'}
                          </span>
                          {currentSub && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                              <span>›</span>
                              <span className="truncate max-w-[130px]">{lang === 'my' ? currentSub.name : currentSub.nameEn}</span>
                            </span>
                          )}
                          {isLocked && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                              <Lock className="w-2.5 h-2.5 stroke-[2.5]" />
                              <span>VIP</span>
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                          {currentCat?.nameEn ? `${currentCat.nameEn} • ` : ''}
                          <span className="text-emerald-700 font-medium">
                            {lang === 'my' ? 'ကဏ္ဍ/ကဏ္ဍခွဲ ပြောင်းရန် နှိပ်ပါ ›' : 'Tap to change ›'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      <span className="px-3 py-1.5 rounded-xl bg-slate-100 group-hover:bg-emerald-600 text-slate-700 group-hover:text-white font-bold text-xs transition-colors flex items-center gap-1 shadow-2xs">
                        <span>{lang === 'my' ? 'ပြောင်းမည်' : 'Change'}</span>
                        <ChevronDown className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </button>

                  {/* Sub-Category Dropdown Selector (Clean Dropdown - No Horizontal Scroll) */}
                  {availableSubCats.length > 0 && (
                    <div className="flex items-center gap-2.5 p-2.5 bg-slate-50 border border-slate-200/90 rounded-2xl shadow-2xs">
                      <label className="text-xs font-bold text-slate-700 shrink-0 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{lang === 'my' ? 'ကဏ္ဍခွဲ ရွေးရန်:' : 'Sub-Category:'}</span>
                      </label>
                      <div className="relative flex-1">
                        <select
                          value={subCategoryId}
                          onChange={(e) => setSubCategoryId(e.target.value)}
                          className="w-full appearance-none bg-white hover:bg-slate-100/80 text-slate-900 font-bold text-xs pl-3 pr-8 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-2xs transition-all"
                        >
                          <option value="">
                            🌟 {lang === 'my' ? 'အဓိက ကဏ္ဍသာ (Main Category Only)' : 'Main Category Only'}
                          </option>
                          {availableSubCats.map((sub) => (
                            <option key={sub.id} value={sub.id}>
                              📂 {lang === 'my' ? sub.name : sub.nameEn}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Dedicated Transfer Wallet Selector Card when Transfer Category is selected */}
          {isTransferCategory && (
            <div className="p-3 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200/90 rounded-2xl space-y-2.5 shadow-2xs animate-fadeIn">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>{lang === 'my' ? 'ငွေလွှဲပြောင်းမည့် အကောင့်များ (Transfer Wallets):' : 'Transfer Wallets (From & To):'}</span>
                </label>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full text-white shadow-2xs ${type === 'expense' ? 'bg-rose-600' : 'bg-emerald-600'}`}>
                  {type === 'expense' ? (lang === 'my' ? '💸 ငွေလွှဲထွက် (Transfer Out)' : 'Transfer Out') : (lang === 'my' ? '💰 ငွေလွှဲဝင် (Transfer In)' : 'Transfer In')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {/* From Wallet */}
                <div className="bg-white p-2.5 rounded-xl border border-indigo-150 shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wide flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                    {lang === 'my' ? 'ငွေထွက်မည့် အကောင့် (From Wallet):' : 'From Wallet:'}
                  </span>
                  <select
                    value={walletId}
                    onChange={(e) => {
                      const newFrom = e.target.value;
                      setWalletId(newFrom);
                      if (newFrom === transferToWalletId) {
                        const alt = wallets.find((w) => w.id !== newFrom);
                        if (alt) setTransferToWalletId(alt.id);
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-300 font-bold text-slate-900 rounded-lg p-1.5 focus:ring-2 focus:ring-indigo-500 text-xs cursor-pointer"
                  >
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {lang === 'my' ? w.name : w.nameEn} ({formatCurrency(w.balance, w.currency || 'MMK')})
                      </option>
                    ))}
                  </select>
                </div>

                {/* To Wallet */}
                <div className="bg-white p-2.5 rounded-xl border border-indigo-150 shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    {lang === 'my' ? 'ငွေဝင်မည့် အကောင့် (To Wallet):' : 'To Wallet:'}
                  </span>
                  <select
                    value={transferToWalletId}
                    onChange={(e) => setTransferToWalletId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 font-bold text-slate-900 rounded-lg p-1.5 focus:ring-2 focus:ring-indigo-500 text-xs cursor-pointer"
                  >
                    {wallets
                      .filter((w) => w.id !== walletId)
                      .map((w) => (
                        <option key={w.id} value={w.id}>
                          {lang === 'my' ? w.name : w.nameEn} ({formatCurrency(w.balance, w.currency || 'MMK')})
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* 3 Main Models Selector Toggle (ယာဉ်စီမံခန့်ခွဲမှု Category ရွေးချယ်မှသာ ပြသမည်) */}
          {showModelSelector && (
            <div className="space-y-1 pt-1 animate-fadeIn">
              <label className="block text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>{lang === 'my' ? 'ယာဉ်စီမံခန့်ခွဲမှု စာရင်း ပုံစံ (Vehicle Model Selector):' : 'Select Vehicle Entry Style:'}</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/90 shadow-2xs">
                <button
                  type="button"
                  onClick={() => handleSwitchModel('general')}
                  className={`py-2 px-2 rounded-xl font-bold text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
                    entryModel === 'general'
                      ? 'bg-white text-indigo-950 shadow-xs border border-slate-200 scale-[1.01]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <Sparkles className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${entryModel === 'general' ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span className="truncate">{lang === 'my' ? '၁။ General' : '1. General'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchModel('fuel')}
                  className={`py-2 px-2 rounded-xl font-bold text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
                    entryModel === 'fuel'
                      ? 'bg-emerald-600 text-white shadow-xs scale-[1.01]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <Fuel className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${entryModel === 'fuel' ? 'text-white' : 'text-emerald-600'}`} />
                  <span className="truncate">{lang === 'my' ? '၂။ ဆီဖိုး' : '2. Fuel'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchModel('vehicle_service')}
                  className={`py-2 px-2 rounded-xl font-bold text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
                    entryModel === 'vehicle_service'
                      ? 'bg-blue-600 text-white shadow-xs scale-[1.01]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <Wrench className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${entryModel === 'vehicle_service' ? 'text-white' : 'text-blue-600'}`} />
                  <span className="truncate">{lang === 'my' ? '၃။ Other Vehicle' : '3. Vehicle Svc'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* MODEL 1: GENERAL EXPENSE / INCOME                              */}
          {/* ============================================================== */}
          {entryModel === 'general' && (
            <div className="space-y-4">
              {/* Type Toggle: ဝင်ငွေ / ထွက်ငွေ */}
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  disabled={isEditing ? type !== 'expense' : !canAddExpense}
                  onClick={() => {
                    if (!isEditing && canAddExpense) setType('expense');
                  }}
                  className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                    type === 'expense'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : !canAddExpense && !isEditing
                      ? 'text-slate-300 cursor-not-allowed'
                      : 'text-slate-600 hover:text-slate-900 cursor-pointer'
                  }`}
                  title={
                    !canAddExpense && !isEditing
                      ? (lang === 'my' ? 'ပိုင်ရှင်မှ ထွက်ငွေ ထည့်သွင်းခွင့် ပိတ်ထားပါသည်' : 'Adding expense disabled by owner')
                      : undefined
                  }
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>{lang === 'my' ? 'ထွက်ငွေ (Expense)' : 'Expense'}</span>
                  {!canAddExpense && !isEditing && <Lock className="w-3.5 h-3.5 ml-1 text-slate-400" />}
                </button>
                <button
                  type="button"
                  disabled={isEditing ? type !== 'income' : !canAddIncome}
                  onClick={() => {
                    if (!isEditing && canAddIncome) setType('income');
                  }}
                  className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                    type === 'income'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : !canAddIncome && !isEditing
                      ? 'text-slate-300 cursor-not-allowed'
                      : 'text-slate-600 hover:text-slate-900 cursor-pointer'
                  }`}
                  title={
                    !canAddIncome && !isEditing
                      ? (lang === 'my' ? 'ပိုင်ရှင်မှ ဝင်ငွေ ထည့်သွင်းခွင့် ပိတ်ထားပါသည်' : 'Adding income disabled by owner')
                      : undefined
                  }
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  <span>{lang === 'my' ? 'ဝင်ငွေ (Income)' : 'Income'}</span>
                  {!canAddIncome && !isEditing && <Lock className="w-3.5 h-3.5 ml-1 text-slate-400" />}
                </button>
              </div>

          {/* Item / Product Name (or Income Title) with Unified Suggestions (Distinct & Placed Above Amount) */}
          <div className="space-y-1.5 p-3 bg-slate-50/80 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <label className="block text-slate-700 font-bold text-xs sm:text-sm flex items-center gap-1.5">
                <Tag className={`w-3.5 h-3.5 ${type === 'income' ? 'text-emerald-600' : 'text-indigo-600'}`} />
                <span>
                  {type === 'income'
                    ? (lang === 'my' ? 'ဝင်ငွေ ခေါင်းစဉ် / အကြောင်းအရာ (Income Title):' : 'Income Title / Source:')
                    : (lang === 'my' ? 'ကုန်ပစ္စည်း / ဝယ်ယူသည့် အရာ (Item Name):' : 'Item / Product Name:')}
                </span>
              </label>
              {type === 'expense' && unifiedItemSuggestions.length > 0 && (
                <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  <span>{lang === 'my' ? 'ယခင်ပစ္စည်း အကြံပြုချက်များ' : 'Suggested Items'}</span>
                </span>
              )}
            </div>
            <input
              type="text"
              list="db-item-suggestions"
              placeholder={
                type === 'income'
                  ? (lang === 'my' ? 'ဥပမာ - လစာ ၊ အပိုဝင်ငွေ ၊ အရောင်းရငွေ' : 'e.g. Salary, Sales, Bonus')
                  : (lang === 'my' ? 'ဥပမာ - ကြာကွေး ၊ ရေသန့် ၊ ဆန် ၊ ကြက်သား' : 'e.g. Rice, Water, Chicken')
              }
              value={itemName}
              onChange={(e) => {
                const val = e.target.value;
                setItemName(val);
                if (val.trim().length >= 1 && type === 'expense') {
                  const match = findMatchingItemInfo(val, unifiedItemSuggestions);
                  if (match && match.categoryId && (!categoryId || categoryId === 'cat_food' || categoryId === 'cat_expense_other')) {
                    setCategoryId(match.categoryId);
                    if (match.subCategoryId) setSubCategoryId(match.subCategoryId);
                  }
                }
              }}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900 text-sm"
            />

            {/* Quick Select Suggestion Pills - ONLY fills Item Name & Category, NEVER touches or overwrites entered price! */}
            {type === 'expense' && unifiedItemSuggestions.length > 0 && (
              <div className="pt-1">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {unifiedItemSuggestions
                    .filter((item) => {
                      if (!itemName.trim()) return true;
                      return item.normalizedName.includes(itemName.trim().toLowerCase());
                    })
                    .slice(0, 8)
                    .map((item) => (
                      <button
                        key={item.normalizedName}
                        type="button"
                        onClick={() => {
                          setItemName(item.name);
                          if (item.categoryId) {
                            setCategoryId(item.categoryId);
                            if (item.subCategoryId) setSubCategoryId(item.subCategoryId);
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-emerald-50 hover:text-emerald-900 hover:border-emerald-300 border border-slate-200/90 rounded-lg text-xs font-semibold text-slate-700 whitespace-nowrap shrink-0 transition-all cursor-pointer shadow-2xs active:scale-95"
                      >
                        <span>{item.name}</span>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Amount Entry Mode Selector Tabs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-slate-700 font-semibold">
                {lang === 'my' ? 'ငွေပမာဏ တွက်ချက်ထည့်သွင်းနည်း:' : 'Amount Calculation Mode:'}
              </label>

              {/* Total Summary Badge */}
              <div className="text-right">
                <span className="text-[11px] text-slate-500 font-semibold mr-1">
                  {lang === 'my' ? 'စုစုပေါင်း:' : 'Total:'}
                </span>
                <span className="text-base font-bold font-mono text-indigo-700">
                  {formatMMK(parseFloat(amount) || 0)}
                </span>
              </div>
            </div>

            {/* Mode Pills */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100/90 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setEntryMode('direct')}
                className={`py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  entryMode === 'direct'
                    ? 'bg-white text-indigo-950 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Hash className="w-3.5 h-3.5 text-indigo-600" />
                <span>{lang === 'my' ? 'ရိုးရိုး ပမာဏ' : 'Direct'}</span>
              </button>

              <button
                type="button"
                onClick={() => setEntryMode('unit_qty')}
                className={`py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  entryMode === 'unit_qty'
                    ? 'bg-white text-indigo-950 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Boxes className="w-3.5 h-3.5 text-emerald-600" />
                <span>{lang === 'my' ? 'ဈေး x အရေအတွက်' : 'Price x Qty'}</span>
              </button>

              <button
                type="button"
                onClick={() => setEntryMode('shopping_list')}
                className={`py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  entryMode === 'shopping_list'
                    ? 'bg-white text-indigo-950 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5 text-amber-600" />
                <span>{lang === 'my' ? 'Shopping List' : 'Items List'}</span>
              </button>
            </div>

            {/* PANEL 1: DIRECT AMOUNT */}
            {entryMode === 'direct' && (() => {
              const currentWallet = wallets.find((w) => w.id === walletId) || wallets[0];
              const wCurr = currentWallet?.currency || 'MMK';
              const wRate = currentWallet?.exchangeRate;
              const numericAmount = parseFloat(amount) || 0;
              const isForeign = wCurr !== 'MMK';

              return (
                <div className="space-y-2 pt-1 animate-fadeIn">
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="0"
                      value={amount}
                      onChange={(e) => handleAmountChangeWithFuelSync(e.target.value)}
                      className="w-full text-xl sm:text-2xl font-bold py-2.5 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-16"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                      {wCurr}
                    </span>
                  </div>

                  {/* Quick Lakhs & Amount Helpers */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[11px] font-semibold text-slate-500">{lang === 'my' ? 'မြန်ဆန် သက်သာ:' : 'Quick:'}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const val = parseFloat(amount) || 0;
                        if (val > 0) handleAmountChangeWithFuelSync(String(Math.round(val * 100000)));
                      }}
                      className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
                      title={lang === 'my' ? 'ရိုက်ထည့်ထားသော ဂဏန်းအား ၁ သိန်း (x 100,000) ဖြင့် မြှောက်မည်' : 'Multiply by 1 Lakh (x100,000)'}
                    >
                      ✨ သိန်း (x100,000)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddAmount(1000)}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer active:scale-95"
                    >
                      +1,000
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddAmount(10000)}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer active:scale-95"
                    >
                      +10,000
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddAmount(100000)}
                      className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold cursor-pointer active:scale-95"
                    >
                      +1 သိန်း
                    </button>
                  </div>

                  {/* Equivalent MMK display for foreign currencies */}
                  {isForeign && numericAmount > 0 && (
                    <div className="p-2 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between text-xs font-semibold text-indigo-900">
                      <span>{lang === 'my' ? 'မြန်မာကျပ်ဖြင့် ခန့်မှန်းခြေ:' : 'Equivalent in MMK:'}</span>
                      <span className="font-bold text-emerald-700">
                        ≈ {convertToMMK(numericAmount, wCurr, wRate).toLocaleString()} MMK (@ {wRate || 1} Ks)
                      </span>
                    </div>
                  )}

                  {/* Quick Presets */}
                  {!isForeign && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-slate-400">{lang === 'my' ? 'ဖြည့်စွက်:' : 'Quick add:'}</span>
                      {[1000, 5000, 10000, 50000, 100000].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => handleAddAmount(val)}
                          className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                        >
                          +{val >= 1000 ? `${val / 1000}k` : val}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* PANEL 2: UNIT PRICE x QUANTITY */}
            {entryMode === 'unit_qty' && (
              <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-3 animate-fadeIn">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {lang === 'my' ? '၁ ခု / ၁ တင်း ဈေးနှုန်း (MMK)' : 'Unit Price (MMK)'}
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 700"
                      value={unitPrice}
                      onChange={(e) => handleUnitQtyChange('price', e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {lang === 'my' ? 'အရေအတွက် (Quantity)' : 'Quantity'}
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="1"
                      value={quantity}
                      onChange={(e) => handleUnitQtyChange('qty', e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 text-sm"
                    />
                  </div>
                </div>

                {/* Total editable — any 2 of 3 auto */}
                <div className="flex items-center justify-between gap-2 p-2.5 bg-white rounded-xl border border-emerald-100">
                  <span className="text-xs text-slate-600 font-semibold shrink-0">
                    {lang === 'my' ? 'တွက်ချက်ရလဒ်:' : 'Total:'}
                  </span>
                  <div className="flex items-center gap-1.5 flex-1 justify-end min-w-0">
                    <span className="text-xs text-slate-500 font-mono shrink-0">
                      {formatMMK(parseFloat(unitPrice) || 0)} × {quantity || 0} =
                    </span>
                    <input
                      type="number"
                      step="any"
                      value={amount}
                      onChange={(e) => handleUnitQtyAmountChange(e.target.value)}
                      placeholder="0"
                      className="w-28 px-2 py-1 text-sm font-bold text-emerald-800 font-mono text-right bg-emerald-50 border border-emerald-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* PANEL 3: SHOPPING LIST (BULK ITEMS) */}
            {entryMode === 'shopping_list' && (
              <div className="p-3 bg-amber-50/60 border border-amber-200/90 rounded-2xl space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <ShoppingCart className="w-4 h-4 text-amber-600" />
                    <span>{lang === 'my' ? 'ဝယ်ယူသည့် ပစ္စည်း စာရင်းများ:' : 'Shopping Items Breakdown:'}</span>
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsShoppingPriceHistoryOpen(true)}
                      className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 bg-white/80 hover:bg-white px-2.5 py-1 rounded-lg border border-indigo-200 cursor-pointer shadow-2xs transition-colors"
                      title={lang === 'my' ? 'ယခင်ဝယ်ဈေးများနှင့် ဈေးနှုန်းနှိုင်းယှဉ်ချက်များ ကြည့်ရန်' : 'Compare past item prices'}
                    >
                      <History className="w-3 h-3 text-indigo-600" />
                      <span>{lang === 'my' ? 'ဈေးနှုန်း နှိုင်းယှဉ်ချက်' : 'Price Comparison'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={autoGenerateShoppingNote}
                      className="text-[11px] font-bold text-amber-800 hover:text-amber-950 underline decoration-amber-300 cursor-pointer"
                      title="Generate Note from items"
                    >
                      {lang === 'my' ? '✨ မှတ်ချက် စာသား ရေးမည်' : '✨ Generate Note'}
                    </button>
                  </div>
                </div>

                {/* Items Cards List - Clean 2-Row Layout per Item with Auto-Scroll */}
                <div ref={shoppingListContainerRef} className="space-y-2.5 max-h-72 sm:max-h-80 overflow-y-auto pr-1">
                  {shoppingItems.map((item, idx) => {
                    const pastPurchase = getPastPriceForItem(item.name);
                    const diff = pastPurchase && item.price > 0 ? item.price - pastPurchase.price : 0;
                    const percent = pastPurchase && pastPurchase.price > 0 && item.price > 0 ? (diff / pastPurchase.price) * 100 : 0;

                    return (
                      <div
                        key={item.id || idx}
                        id={`item-card-${item.id || idx}`}
                        className="bg-white p-3 rounded-2xl border border-amber-200/80 shadow-2xs space-y-2"
                      >
                        {/* Row 1: Item Name (Full Width) with Database Autocomplete + Delete */}
                        <div className="flex items-center gap-2">
                          <input
                            id={`input-name-${item.id}`}
                            type="text"
                            list="db-item-suggestions"
                            placeholder={
                              lang === 'my'
                                ? 'ပစ္စည်းအမည် (ဥပမာ - ဆန် ၊ ဆီ ၊ ခေါက်ဆွဲ)'
                                : 'Item name (e.g. Rice, Oil)'
                            }
                            value={item.name}
                            onChange={(e) => updateShoppingItem(item.id || '', 'name', e.target.value)}
                            className="flex-1 px-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white focus:border-amber-400 focus:outline-none"
                          />

                          <button
                            type="button"
                            onClick={() => removeShoppingItemRow(item.id || '')}
                            className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors shrink-0 cursor-pointer"
                            title={lang === 'my' ? 'ဖျက်မည်' : 'Remove'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Row 2: Price, Quantity, and Calculated Total Amount Badge */}
                        <div className="grid grid-cols-12 gap-2 items-center text-xs">
                          {/* Price input */}
                          <div className="col-span-5">
                            <label className="block text-[10px] text-slate-500 font-bold mb-0.5">
                              {lang === 'my' ? 'ဈေးနှုန်း (MMK)' : 'Price'}
                            </label>
                            <input
                              type="number"
                              placeholder="0"
                              value={item.price || ''}
                              onChange={(e) => updateShoppingItem(item.id || '', 'price', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono text-slate-900 focus:bg-white focus:outline-none"
                            />
                          </div>

                          {/* Qty input */}
                          <div className="col-span-3">
                            <label className="block text-[10px] text-slate-500 font-bold mb-0.5">
                              {lang === 'my' ? 'အရေအတွက်' : 'Qty'}
                            </label>
                            <input
                              type="number"
                              step="any"
                              placeholder="1"
                              value={item.quantity || ''}
                              onChange={(e) => updateShoppingItem(item.id || '', 'quantity', e.target.value)}
                              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono text-center text-slate-900 focus:bg-white focus:outline-none"
                            />
                          </div>

                          {/* Total Amount Badge */}
                          <div className="col-span-4 text-right">
                            <label className="block text-[10px] text-amber-900 font-bold mb-0.5">
                              {lang === 'my' ? 'တန်ဖိုး' : 'Total'}
                            </label>
                            <div className="px-2 py-1.5 bg-amber-50 border border-amber-200/90 rounded-xl font-bold font-mono text-amber-950 text-xs truncate">
                              {formatMMK(item.amount || 0)}
                            </div>
                          </div>
                        </div>

                        {/* Row 3: In-Line Price Comparison with Previous Purchases for this item */}
                        {pastPurchase && (
                          <div className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs flex-wrap">
                            <div className="flex items-center gap-1.5 text-slate-600 flex-wrap">
                              <History className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                              <span className="font-semibold text-[11px] text-indigo-950">
                                {lang === 'my' ? 'ယခင်ဝယ်ဈေး:' : 'Prev Price:'}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateShoppingItem(item.id || '', 'price', String(pastPurchase.price))}
                                className="font-mono font-bold text-indigo-700 underline decoration-indigo-300 hover:text-indigo-950 cursor-pointer"
                                title={lang === 'my' ? 'ယခင်ဈေးနှုန်းအတိုင်း ထည့်ရန် နှိပ်ပါ' : 'Click to use this price'}
                              >
                                {formatMMK(pastPurchase.price)}
                              </button>
                              <span className="text-[10px] text-slate-400">({pastPurchase.date})</span>
                            </div>

                            {item.price > 0 && (
                              <div className="shrink-0">
                                {diff > 0 && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[10px] font-bold">
                                    <TrendingUp className="w-2.5 h-2.5" />
                                    <span>+{formatMMK(diff)} (+{Math.round(percent)}%) {lang === 'my' ? 'ဈေးတက်' : 'Up'}</span>
                                  </span>
                                )}
                                {diff < 0 && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                                    <TrendingDown className="w-2.5 h-2.5" />
                                    <span>-{formatMMK(Math.abs(diff))} (-{Math.abs(Math.round(percent))}%) {lang === 'my' ? 'ဈေးကျ' : 'Down'}</span>
                                  </span>
                                )}
                                {diff === 0 && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium">
                                    <Minus className="w-2.5 h-2.5" />
                                    <span>{lang === 'my' ? 'ဈေးတူ' : 'Same Price'}</span>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Add Row Button */}
                <button
                  type="button"
                  onClick={addShoppingItemRow}
                  className="w-full py-2 bg-white hover:bg-amber-100/50 text-amber-900 border border-amber-300 border-dashed rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{lang === 'my' ? 'ပစ္စည်းသစ် ထပ်ထည့်မည်' : 'Add Item Row'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Smart Past Purchase Price Comparison (တူညီတဲ့ ပစ္စည်း ယခင်ဝယ်ဈေး & ဈေးတက်/ကျ စိစစ်ချက်) */}
          {type === 'expense' && latestPreviousPurchase && (
            <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 text-xs space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <div className="flex items-center gap-1.5 text-indigo-900 font-semibold flex-wrap">
                  <History className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="flex items-center gap-1">
                    {latestPreviousPurchase.matchedName && (
                      <span className="px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-950 font-bold text-[11px] border border-indigo-200">
                        {latestPreviousPurchase.matchedName}
                      </span>
                    )}
                    <span>
                      {lang === 'my' ? 'အရင်တစ်ကြိမ် ဝယ်ခဲ့သည့်ဈေး:' : 'Previous Purchase Price:'}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={handleApplyPreviousPrice}
                    className="font-bold font-mono text-indigo-700 underline decoration-indigo-300 hover:text-indigo-900 ml-1 cursor-pointer"
                    title={lang === 'my' ? 'ယခင်ဈေးနှုန်းအတိုင်း ထည့်သွင်းရန် နှိပ်ပါ' : 'Click to use this price'}
                  >
                    {formatMMK(latestPreviousPurchase.amount)}
                  </button>
                </div>

                <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  {latestPreviousPurchase.date}
                </span>
              </div>

              {/* Real-time Price Comparison Badge when amount is entered */}
              {priceComparison && (
                <div className="flex items-center gap-2 pt-1 border-t border-indigo-100/80">
                  <span className="text-[11px] text-slate-600 font-medium">
                    {lang === 'my' ? 'ဈေးနှုန်း နှိုင်းယှဉ်ချက်:' : 'Price Comparison:'}
                  </span>

                  {priceComparison.isHigher && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-xs font-bold">
                      <TrendingUp className="w-3 h-3 text-rose-600" />
                      <span>
                        {lang === 'my' ? 'ဈေးတက်သွားသည် +' : 'Price Higher +'}
                        {formatMMK(Math.abs(priceComparison.diff))} (
                        {Math.round(priceComparison.percent)}%)
                      </span>
                    </span>
                  )}

                  {priceComparison.isLower && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-xs font-bold">
                      <TrendingDown className="w-3 h-3 text-emerald-600" />
                      <span>
                        {lang === 'my' ? 'ဈေးကျသွားသည် -' : 'Price Lower -'}
                        {formatMMK(Math.abs(priceComparison.diff))} (
                        {Math.abs(Math.round(priceComparison.percent))}%)
                      </span>
                    </span>
                  )}

                  {priceComparison.isEqual && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 text-xs font-bold">
                      <Minus className="w-3 h-3 text-slate-600" />
                      <span>
                        {lang === 'my' ? 'ဈေးနှုန်း တူညီပါသည်' : 'Same as last price'}
                      </span>
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

          {/* ============================================================== */}
          {/* MODEL 2: DEDICATED FUEL LOG MODEL (၂။ ဆီဖိုး)                   */}
          {/* (၁၀၀% သီးသန့် ဆီဖိုး Model - ကုန်ပစ္စည်း/Shopping အချက်အလက်များ လုံးဝ မပါ) */}
          {/* ============================================================== */}
          {entryModel === 'fuel' && (
            <div className="space-y-3.5 animate-fadeIn">
              {/* If no vehicle registered yet */}
              {(!vehicles || vehicles.length === 0) ? (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50 to-white border-2 border-emerald-200/90 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                        <Fuel className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          {lang === 'my' ? '⛽ စက်သုံးဆီ / ဆီဖိုး မှတ်တမ်း' : 'Vehicle Fuel Expense'}
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          {lang === 'my'
                            ? 'ဆီဖိုး ကျသင့်ငွေကို ဤနေရာတွင် တိုက်ရိုက်ထည့်သွင်း သိမ်းဆည်းနိုင်ပါသည်'
                            : 'Enter total fuel expense directly right here.'}
                        </p>
                      </div>
                    </div>
                    {onOpenAddVehicle && (
                      <button
                        type="button"
                        onClick={onOpenAddVehicle}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer shadow-2xs transition-all flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{lang === 'my' ? '+ ယာဉ်ထည့်ရန်' : '+ Add Vehicle'}</span>
                      </button>
                    )}
                  </div>

                  {/* Single Amount Input for No-Vehicle Case */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-emerald-950">
                        {lang === 'my' ? 'ဆီဖိုး ကျသင့်ငွေ ပမာဏ (MMK):' : 'Total Fuel Cost (MMK):'}
                      </label>
                      <span className="text-base font-bold font-mono text-emerald-700">
                        {formatMMK(parseFloat(amount) || 0)}
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="any"
                        required
                        autoFocus
                        placeholder="0"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full text-2xl font-bold py-2.5 px-4 bg-white border border-emerald-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-16"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-emerald-800 text-sm">
                        MMK
                      </span>
                    </div>
                    {/* Quick Presets */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[11px] text-slate-500 font-medium">{lang === 'my' ? 'ဖြည့်စွက်:' : 'Quick add:'}</span>
                      {[10000, 20000, 30000, 50000, 100000].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => handleAddAmount(val)}
                          className="px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-100/70 border border-emerald-200 text-emerald-900 text-xs font-bold shadow-2xs transition-all active:scale-95 cursor-pointer"
                        >
                          +{val >= 1000 ? `${val / 1000}k` : val}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 bg-white/80 p-2.5 rounded-xl border border-slate-200">
                    💡 {lang === 'my' ? 'ကား/ဆိုင်ကယ် ထည့်သွင်းထားပါက ဆီစားနှုန်း (km/L) နှင့် ကားတစ်စီးချင်း ကုန်ကျစရိတ်များကို အလိုအလျောက် တွက်ချက်ပေးနိုင်ပါသည်။' : 'Adding a vehicle enables automatic km/L mileage analytics.'}
                  </div>
                </div>
              ) : (
                /* When vehicles exist */
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white border-2 border-emerald-200/90 shadow-2xs space-y-3.5">
                  {/* Header with Title and Help Guide Button */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                        <Fuel className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{lang === 'my' ? 'စက်သုံးဆီ / ဆီဖိုး မှတ်တမ်း' : 'Vehicle Fuel Expense'}</span>
                          <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            {lang === 'my' ? 'ဆီစားနှုန်း ချိတ်ဆက်ပြီး' : 'Mileage Synced'}
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          {lang === 'my'
                            ? 'ကျသင့်ငွေကို ဤနေရာတွင်သာ တိုက်ရိုက်ထည့်ပါ (ဆီဖိုး သီးသန့် Model)'
                            : 'Enter fuel cost directly here (Dedicated Fuel Model).'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowFuelGuideModal(true)}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-100/70 text-emerald-800 border border-emerald-300 font-bold text-[11px] shadow-2xs transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                      title={lang === 'my' ? 'ဆီဖိုး ဘယ်လို ထည့်ရမလဲ လမ်းညွှန်' : 'Fuel logging guide'}
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{lang === 'my' ? '❓ ဘယ်လို ထည့်ရမလဲ?' : '❓ How to Log?'}</span>
                    </button>
                  </div>

                  {/* Reassurance Banner */}
                  <div className="bg-emerald-50/90 p-2.5 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2 shadow-2xs">
                    <span className="text-emerald-600 font-bold shrink-0 mt-0.5">✓</span>
                    <span className="text-[11px] leading-relaxed">
                      {lang === 'my'
                        ? '💡 ဤနေရာတွင် ထည့်သွင်းသမျှ ဆီဖိုးသည် ပိုက်ဆံအိတ်နှင့် ယာဉ်စီမံခန့်ခွဲမှု (Fuel & Mileage Log) နှစ်ခုလုံးသို့ အလိုအလျောက် ရောက်ရှိပါမည်။'
                        : 'Logging fuel here automatically syncs both your wallet expense and vehicle mileage records.'}
                    </span>
                  </div>

                  {/* Vehicle Selector Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-white/95 rounded-xl border border-emerald-100 shadow-2xs">
                    <div className="flex items-center gap-1.5 text-xs text-slate-700 font-bold">
                      <Car className="w-4 h-4 text-emerald-600" />
                      <span>{lang === 'my' ? 'သက်ဆိုင်ရာ ယာဉ် / ကား:' : 'Target Vehicle:'}</span>
                    </div>

                    <div className="flex items-center gap-2 flex-1 sm:max-w-xs justify-end">
                      <select
                        value={vehicleId}
                        onChange={(e) => {
                          const vId = e.target.value;
                          setVehicleId(vId);
                          setIsVehicleLinkEnabled(Boolean(vId));
                          const targetV = vehicles.find((v) => v.id === vId);
                          if (targetV?.currentOdometer) {
                            setVehicleOdometer(String(targetV.currentOdometer));
                          }
                          if (targetV?.fuelType) {
                            setFuelType(targetV.fuelType);
                          }
                          if (targetV?.walletId && wallets.some((w) => w.id === targetV.walletId)) {
                            setWalletId(targetV.walletId);
                          }
                        }}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                      >
                        <option value="">{lang === 'my' ? '-- ယာဉ် ရွေးချယ်ပါ --' : '-- Select Vehicle --'}</option>
                        {vehicles.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name} {v.plateNumber ? `(${v.plateNumber})` : ''} - {v.currentOdometer?.toLocaleString()} {v.odometerUnit || 'km'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Unified Fuel Form Layout (စက်သုံးဆီ သီးသန့် ပုံစံ) */}
                  <div className="p-3 bg-white rounded-xl border border-emerald-200 text-xs space-y-3 shadow-2xs">
                    {/* Price per Liter & Liters Row */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          {lang === 'my' ? '၁ လီတာ ဈေးနှုန်း (ကျပ်):' : 'Price / Liter (Ks):'}
                        </label>
                        <input
                          type="number"
                          placeholder="3100"
                          value={fuelPricePerLiter}
                          onChange={(e) => handleFuelPriceChange(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          {lang === 'my' ? 'ဆီပမာဏ (လီတာ):' : 'Liters (L):'}
                        </label>
                        <input
                          type="number"
                          step="any"
                          placeholder="30"
                          value={fuelLiters}
                          onChange={(e) => handleFuelLitersChange(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-emerald-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Total Fuel Amount MMK Input */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-emerald-950">
                          {lang === 'my' ? 'စုစုပေါင်း ဆီဖိုး ကျသင့်ငွေ (MMK):' : 'Total Fuel Cost (MMK):'}
                        </label>
                        <span className="text-base font-bold font-mono text-emerald-700">
                          {formatMMK(parseFloat(amount) || 0)}
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          step="any"
                          required
                          placeholder="0"
                          value={amount}
                          onChange={(e) => handleAmountChangeWithFuelSync(e.target.value)}
                          className="w-full text-2xl font-bold py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-16"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                          MMK
                        </span>
                      </div>

                      {/* Quick Presets */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-2">
                        <span className="text-[11px] text-slate-500 font-medium">{lang === 'my' ? 'ဖြည့်စွက်:' : 'Quick add:'}</span>
                        {[10000, 20000, 30000, 50000, 100000].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => handleAddAmount(val)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-bold shadow-2xs transition-all active:scale-95 cursor-pointer"
                          >
                            +{val >= 1000 ? `${val / 1000}k` : val}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Fuel Type & Gas Station Row */}
                    <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          {lang === 'my' ? 'ဆီအမျိုးအစား:' : 'Fuel Grade:'}
                        </label>
                        <select
                          value={fuelType}
                          onChange={(e) => setFuelType(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-800 cursor-pointer focus:bg-white"
                        >
                          <option value="Octane 92">Octane 92</option>
                          <option value="Octane 95">Octane 95</option>
                          <option value="Premium Diesel">Premium Diesel</option>
                          <option value="Diesel">Diesel</option>
                          <option value="EV Charging">EV Charging</option>
                          <option value="CNG">CNG</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          {lang === 'my' ? 'ဆီဆိုင် အမည်:' : 'Gas Station:'}
                        </label>
                        <select
                          value={fuelGasStation}
                          onChange={(e) => setFuelGasStation(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-800 cursor-pointer focus:bg-white"
                        >
                          <option value="">{lang === 'my' ? '-- ဆီဆိုင် ရွေးပါ --' : '-- Station --'}</option>
                          {GAS_STATIONS.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Odometer & Full Tank Checkbox Row */}
                    <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          {lang === 'my' ? 'ဒိုင်ခွက် မိုင်/km:' : 'Current Odometer:'}
                        </label>
                        <input
                          type="number"
                          placeholder={lang === 'my' ? 'ဥပမာ - 12450' : 'e.g. 12450'}
                          value={vehicleOdometer}
                          onChange={(e) => setVehicleOdometer(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-800 focus:bg-white"
                        />
                      </div>

                      <div className="flex items-end pb-1">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                          <input
                            type="checkbox"
                            checked={fuelIsFullTank}
                            onChange={(e) => setFuelIsFullTank(e.target.checked)}
                            className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                          />
                          <span>{lang === 'my' ? 'ဆီတိုင်ကီ အပြည့် (Full Tank)' : 'Full Tank'}</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* MODEL 3: OTHER VEHICLE SERVICES (၃။ Other Vehicle Services)     */}
          {/* (ပြုပြင်စရိတ်၊ ရေဆေး၊ တာယာ၊ အပိုပစ္စည်း၊ လိုင်စင်/အာမခံ)            */}
          {/* ============================================================== */}
          {entryModel === 'vehicle_service' && (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/90 via-sky-50/40 to-white border-2 border-blue-200/90 shadow-2xs space-y-3.5">
                {/* Header */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                      <Wrench className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{lang === 'my' ? '🚗 ယာဉ် ဝန်ဆောင်မှုနှင့် ပြုပြင်စရိတ်' : 'Vehicle Service & Maintenance'}</span>
                        <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                          {lang === 'my' ? 'ထိန်းသိမ်းမှုမှတ်တမ်း' : 'Maintenance Log'}
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {lang === 'my'
                          ? 'ရေဆေး၊ အင်ဂျင်ဝိုင်၊ တာယာ၊ လိုင်စင် နှင့် ပြုပြင်စရိတ်များ သီးသန့် ထည့်သွင်းရန်'
                          : 'Service fees, car wash, fluids, tires, licensing & repairs.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Reassurance Banner */}
                <div className="bg-blue-50/90 p-2.5 rounded-xl border border-blue-200 text-xs text-blue-900 flex items-start gap-2 shadow-2xs">
                  <span className="text-blue-600 font-bold shrink-0 mt-0.5">✓</span>
                  <span className="text-[11px] leading-relaxed">
                    {lang === 'my'
                      ? '💡 ဤနေရာတွင် ထည့်သွင်းသမျှ ကုန်ကျစရိတ်သည် ပိုက်ဆံအိတ်နှင့် ယာဉ်ထိန်းသိမ်းမှုမှတ်တမ်း (Maintenance History) နှစ်ခုလုံးသို့ အလိုအလျောက် ရောက်ရှိပါမည်။'
                      : 'Expenses logged here automatically sync to wallet and vehicle maintenance history.'}
                  </span>
                </div>

                {/* Target Vehicle Selector */}
                {vehicles && vehicles.length > 0 && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-white/95 rounded-xl border border-blue-100 shadow-2xs">
                    <div className="flex items-center gap-1.5 text-xs text-slate-700 font-bold">
                      <Car className="w-4 h-4 text-blue-600" />
                      <span>{lang === 'my' ? 'သက်ဆိုင်ရာ ယာဉ် / ကား:' : 'Target Vehicle:'}</span>
                    </div>

                    <div className="flex items-center gap-2 flex-1 sm:max-w-xs justify-end">
                      <select
                        value={vehicleId}
                        onChange={(e) => {
                          const vId = e.target.value;
                          setVehicleId(vId);
                          setIsVehicleLinkEnabled(Boolean(vId));
                          const targetV = vehicles.find((v) => v.id === vId);
                          if (targetV?.currentOdometer) {
                            setVehicleOdometer(String(targetV.currentOdometer));
                          }
                          if (targetV?.walletId && wallets.some((w) => w.id === targetV.walletId)) {
                            setWalletId(targetV.walletId);
                          }
                        }}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="">{lang === 'my' ? '-- ယာဉ် ရွေးချယ်ပါ --' : '-- Select Vehicle --'}</option>
                        {vehicles.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name} {v.plateNumber ? `(${v.plateNumber})` : ''} - {v.currentOdometer?.toLocaleString()} {v.odometerUnit || 'km'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Service Category Selector Grid */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    {lang === 'my' ? 'ဝန်ဆောင်မှု အမျိုးအစား ရွေးချယ်ပါ:' : 'Service Category:'}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {[
                      { type: 'general_repair' as VehicleServiceType, labelMy: '🛠️ အထွေထွေ ပြုပြင်မှု', labelEn: '🛠️ General Repair' },
                      { type: 'other' as VehicleServiceType, labelMy: '🚿 ကား/ဆိုင်ကယ် ရေဆေး', labelEn: '🚿 Car Wash', titlePreset: 'ကားရေဆေး သန့်စင်ခြင်း' },
                      { type: 'engine_oil' as VehicleServiceType, labelMy: '🛢️ အင်ဂျင်ဝိုင် / အရည်', labelEn: '🛢️ Engine Oil', titlePreset: 'အင်ဂျင်ဝိုင် လဲလှယ်ခြင်း' },
                      { type: 'tires' as VehicleServiceType, labelMy: '🛞 တာယာ / ဘီး လေထိုး', labelEn: '🛞 Tire & Pressure', titlePreset: 'တာယာ လဲလှယ် / စစ်ဆေးခြင်း' },
                      { type: 'brake_pads' as VehicleServiceType, labelMy: '🛑 ဘရိတ် စနစ်', labelEn: '🛑 Brakes', titlePreset: 'ဘရိတ်ရှူး စစ်ဆေးလဲလှယ်ခြင်း' },
                      { type: 'battery' as VehicleServiceType, labelMy: '🔋 ဘက်ထရီ / လျှပ်စစ်', labelEn: '🔋 Battery', titlePreset: 'ဘက်ထရီ လဲလှယ်ခြင်း' },
                    ].map((item) => {
                      const isSelected = maintServiceType === item.type && (item.titlePreset ? maintTitle.includes(item.titlePreset) || maintServiceType === item.type : true);
                      return (
                        <button
                          key={item.labelEn}
                          type="button"
                          onClick={() => {
                            setMaintServiceType(item.type);
                            if (item.titlePreset && (!maintTitle || maintTitle === '')) {
                              setMaintTitle(item.titlePreset);
                            }
                          }}
                          className={`p-2 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer border ${
                            maintServiceType === item.type
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs scale-[1.01]'
                              : 'bg-white text-slate-700 hover:bg-blue-50/50 border-slate-200'
                          }`}
                        >
                          <span className="truncate">{lang === 'my' ? item.labelMy : item.labelEn}</span>
                          {maintServiceType === item.type && <Check className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Service Details Card */}
                <div className="p-3 bg-white rounded-xl border border-blue-200 space-y-3 shadow-2xs">
                  {/* Service Title / Description */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {lang === 'my' ? 'လုပ်ဆောင်ချက် / ပြင်ဆင်သည့် အကြောင်းအရာ:' : 'Service Title / Details:'}
                    </label>
                    <input
                      type="text"
                      placeholder={lang === 'my' ? 'ဥပမာ - အင်ဂျင်ဝိုင် 5W-30 လဲခြင်း ၊ ကားရေဆေးခြင်း' : 'e.g. Engine Oil 5W-30 Change, Car Wash'}
                      value={maintTitle}
                      onChange={(e) => setMaintTitle(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Workshop / Garage Name */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {lang === 'my' ? 'ဝပ်ရှော့ / ဆိုင်အမည် (Workshop Name):' : 'Workshop / Service Center Name:'}
                    </label>
                    <input
                      type="text"
                      placeholder={lang === 'my' ? 'ဥပမာ - ဝင်း ကားဝပ်ရှော့ ၊ Denko Car Care' : 'e.g. Win Car Care, Denko Car Wash'}
                      value={maintWorkshopName}
                      onChange={(e) => setMaintWorkshopName(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>

                  {/* Cost / Amount Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-blue-950">
                        {lang === 'my' ? 'ကျသင့်ငွေ ပမာဏ (MMK):' : 'Service Cost (MMK):'}
                      </label>
                      <span className="text-base font-bold font-mono text-blue-700">
                        {formatMMK(parseFloat(amount) || 0)}
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="any"
                        required
                        placeholder="0"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full text-2xl font-bold py-2.5 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 pr-16"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                        MMK
                      </span>
                    </div>

                    {/* Quick Presets */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-2">
                      <span className="text-[11px] text-slate-500 font-medium">{lang === 'my' ? 'ဖြည့်စွက်:' : 'Quick add:'}</span>
                      {[5000, 10000, 20000, 50000, 100000, 200000].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => handleAddAmount(val)}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-bold shadow-2xs transition-all active:scale-95 cursor-pointer"
                        >
                          +{val >= 1000 ? `${val / 1000}k` : val}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Current Odometer */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <label className="text-[11px] font-semibold text-slate-600">
                      {lang === 'my' ? 'လက်ရှိ ဒိုင်ခွက် မိုင်/km:' : 'Current Odometer:'}
                    </label>
                    <input
                      type="number"
                      placeholder={lang === 'my' ? 'ဥပမာ - 12450' : 'e.g. 12450'}
                      value={vehicleOdometer}
                      onChange={(e) => setVehicleOdometer(e.target.value)}
                      className="w-36 px-2.5 py-1 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-800 text-right"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Distinct Separate Note / Remarks Field (သီးသန့် မှတ်ချက် - စျေးနှုန်းများကို လုံးဝ မထိခိုက်စေပါ) */}
          <div className="space-y-1.5 p-3 bg-slate-50/80 rounded-2xl border border-slate-200">
            <label className="block text-slate-700 font-bold text-xs sm:text-sm flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>{lang === 'my' ? 'မှတ်ချက် / အပိုဆောင်း အချက်အလက် (Note):' : 'Additional Remarks / Note:'}</span>
            </label>
            <input
              type="text"
              placeholder={
                lang === 'my'
                  ? 'ဥပမာ - မနက်ဖြန်မှ ပေးရန်ကျန်သည် ၊ ဆိုင်ခွဲမှ ဝယ်ယူခဲ့သည်'
                  : 'Optional note or remarks...'
              }
              value={extraNote}
              onChange={(e) => setExtraNote(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900 text-xs sm:text-sm"
            />
          </div>

          {/* Datalist for Native Browser Autocomplete across All Inputs */}
          <datalist id="db-item-suggestions">
            {unifiedItemSuggestions.map((item) => (
              <option
                key={item.normalizedName}
                value={item.name}
                label={item.latestPrice > 0 ? `${formatMMK(item.latestPrice)} (${item.latestDate})` : undefined}
              />
            ))}
          </datalist>

          {/* Permission Denied Warning Notice */}
          {!isActionAllowed && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-amber-800 text-xs font-semibold">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                {lang === 'my'
                  ? `⚠️ ဤ Wallet ပိုင်ရှင်မှ ${type === 'income' ? 'ဝင်ငွေ' : 'ထွက်ငွေ'} ${isEditing ? 'ပြင်ဆင်ခွင့်' : 'အသစ်ထည့်သွင်းခွင့်'} ပိတ်ထားပါသည်`
                  : `Permission denied: wallet owner has disabled ${isEditing ? 'editing' : 'adding'} ${type} for your account.`}
              </span>
            </div>
          )}

          {/* Sticky Footer Submit */}
          <div className="sticky bottom-0 z-10 bg-white/95 backdrop-blur-xs pt-3 pb-1 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0 -mx-4 -mb-4 px-4 sm:-mx-6 sm:-mb-6 sm:px-6 shadow-top">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium cursor-pointer"
            >
              {lang === 'my' ? 'မလုပ်တော့ပါ' : 'Cancel'}
            </button>
            <button
              id="tx-submit-btn"
              type="submit"
              disabled={!isActionAllowed || isSubmitting}
              className={`px-6 py-2.5 rounded-xl font-bold shadow-xs transition-all flex items-center justify-center gap-2 ${
                isActionAllowed && !isSubmitting
                  ? entryModel === 'fuel'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95 cursor-pointer shadow-emerald-500/20 shadow-md'
                    : entryModel === 'vehicle_service'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white active:scale-95 cursor-pointer shadow-blue-500/20 shadow-md'
                    : type === 'income'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95 cursor-pointer'
                    : 'bg-rose-600 hover:bg-rose-700 text-white active:scale-95 cursor-pointer'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-60'
              }`}
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{lang === 'my' ? 'သိမ်းဆည်းနေပါသည်...' : 'Saving...'}</span>
                </>
              ) : entryModel === 'fuel' ? (
                <span className="flex items-center gap-1.5">
                  <Fuel className="w-4 h-4" />
                  <span>
                    {isEditing
                      ? (lang === 'my' ? 'ဆီဖိုးမှတ်တမ်း ပြင်ဆင်မည်' : 'Update Fuel Log')
                      : (lang === 'my' ? '⛽ ဆီဖိုး စာရင်းသိမ်းဆည်းမည်' : 'Save Fuel Log')}
                  </span>
                </span>
              ) : entryModel === 'vehicle_service' ? (
                <span className="flex items-center gap-1.5">
                  <Wrench className="w-4 h-4" />
                  <span>
                    {isEditing
                      ? (lang === 'my' ? 'ယာဉ်ဝန်ဆောင်မှု ပြင်ဆင်မည်' : 'Update Service')
                      : (lang === 'my' ? '🚗 ယာဉ်ဝန်ဆောင်မှု သိမ်းဆည်းမည်' : 'Save Vehicle Service')}
                  </span>
                </span>
              ) : (
                <span>
                  {isEditing
                    ? (lang === 'my' ? 'ပြင်ဆင်ချက် သိမ်းမည်' : 'Update Record')
                    : (lang === 'my'
                      ? (type === 'income' ? 'ဝင်ငွေ စာရင်းသွင်းမည်' : 'ထွက်ငွေ စာရင်းသွင်းမည်')
                      : (type === 'income' ? 'Save Income' : 'Save Expense'))}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Embedded Item Price History and Comparison Modal */}
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

      {/* Dedicated Category Selection Window / Modal */}
      <CategoryPickerModal
        isOpen={isCategoryPickerOpen}
        onClose={() => setIsCategoryPickerOpen(false)}
        categories={categories}
        selectedCategoryId={effectiveCategoryId}
        selectedSubCategoryId={subCategoryId}
        currentType={type}
        lang={lang}
        plan={plan}
        onSelect={(catId, subId) => {
          setCategoryId(catId);
          setSubCategoryId(subId || '');
          setIsCategoryPickerOpen(false);
        }}
        onOpenUpgrade={onOpenUpgrade}
        onAddSubCategory={onAddSubCategory}
        onManageCategories={onManageCategories}
      />

      {/* Fuel Expense & Vehicle Management Guide Modal */}
      <FuelExpenseGuideModal
        isOpen={showFuelGuideModal}
        onClose={() => setShowFuelGuideModal(false)}
        lang={lang}
      />
    </div>
  );
};
