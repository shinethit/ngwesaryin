import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Wrench, Gauge, Shield, Save, Trash2, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { VehicleMaintenance, Vehicle, Wallet, VehicleServiceType, TransactionItem } from '../../types';
import { SERVICE_TYPE_CONFIG } from '../../utils/vehicleAnalytics';
import { parseMyanmarNumber } from '../../utils/myanmarDigits';
// [v7.5.93] Multi-row service entries — same row design as
// TransactionModal (per-row service type, price/qty/amount, unit).
import { ROW_SERVICE_TYPES } from '../../utils/vehicleServiceRows';
import { DEFAULT_MENU_UNIT, collectNewCustomUnits, customMenuUnitText, menuUnitNeedsCustomInput, menuUnitSelectOptions, resolveMenuUnitSelectValue, resolveSavedMenuUnit } from '../../utils/shopMenuUpdate';
import { usePersistedState } from '../../hooks/usePersistedState';

interface AddMaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (maintenance: Partial<VehicleMaintenance>) => void;
  onDelete?: (id: string) => void;
  editingMaintenance?: VehicleMaintenance | null;
  // [v7.5.93] Items of the transaction linked to editingMaintenance
  // (resolved by VehiclesView from the transactions list). Present
  // only when the record was saved with rows — an old record without
  // them keeps the old single title+cost behaviour.
  editingTransactionItems?: TransactionItem[];
  vehicles: Vehicle[];
  wallets: Wallet[];
  selectedVehicleId?: string;
  lang: 'my' | 'en';
  vehicleMaintenance?: VehicleMaintenance[];
}

// [v7.5.93] One blank service row — serviceType defaults to the
// visit's current main type (changing the main type never rewrites
// existing rows' types).
const blankServiceRow = (type: VehicleServiceType): TransactionItem => ({
  id: `row_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
  name: '',
  price: 0,
  quantity: 1,
  amount: 0,
  unit: DEFAULT_MENU_UNIT,
  serviceType: type,
});

export const AddMaintenanceModal: React.FC<AddMaintenanceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingMaintenance,
  editingTransactionItems,
  vehicles,
  wallets,
  selectedVehicleId,
  lang,
  vehicleMaintenance = [],
}) => {
  const [vehicleId, setVehicleId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [odometer, setOdometer] = useState<number | ''>('');
  const [serviceType, setServiceType] = useState<VehicleServiceType>('engine_oil');
  const [title, setTitle] = useState('');
  const [cost, setCost] = useState<number | ''>('');
  const [sparePartBrand, setSparePartBrand] = useState('');
  const [workshopName, setWorkshopName] = useState('');
  const [expectedLifespanKm, setExpectedLifespanKm] = useState<number | ''>(5000);
  const [expectedLifespanDays, setExpectedLifespanDays] = useState<number | ''>(180);
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [walletId, setWalletId] = useState('');
  const [syncToExpense, setSyncToExpense] = useState(true);
  const [note, setNote] = useState('');

  // [v7.5.93] Multi-row service entries. `useServiceRows` is false
  // only when editing an OLD record whose linked transaction carries
  // no items — that keeps the old single title+cost behaviour. New
  // entries always start with rows (one blank row).
  const [useServiceRows, setUseServiceRows] = useState(true);
  const [serviceRows, setServiceRows] = useState<TransactionItem[]>([]);
  // [v7.5.95 U1/U2] Custom units typed via 'အခြား', shared with
  // ShopCard / TransactionModal (same storage key).
  const [customUnits, setCustomUnits] = usePersistedState<string[]>('ngwe_custom_units', []);
  const serviceRowsContainerRef = useRef<HTMLDivElement>(null);
  const newlyAddedRowIdRef = useRef<string | null>(null);

  // [v7.5.93] Valid rows — EXACTLY the TransactionModal rule (name
  // required, qty > 0; empty rows dropped, zero-price rows kept) with
  // amount recomputed as price x qty. The handler re-applies the same
  // rule via groupServiceRowsByType, so modal and handler always agree.
  const validServiceRows = useMemo(
    () =>
      serviceRows
        .filter((r) => r.name.trim() && (Number(r.quantity) || 0) > 0)
        .map((r) => {
          const p = Number(r.price) || 0;
          const q = Number(r.quantity) || 0;
          return {
            name: r.name.trim(),
            price: p,
            quantity: q,
            amount: Number((p * q).toFixed(2)),
            unit: resolveSavedMenuUnit(r.unit),
            ...(r.serviceType ? { serviceType: r.serviceType } : {}),
          } as TransactionItem;
        }),
    [serviceRows]
  );
  // The rows total IS the visit cost — the single cost field below
  // only displays it while rows are shown (one source of truth).
  const serviceRowsTotal = useMemo(
    () => validServiceRows.reduce((s, r) => s + (Number(r.amount) || 0), 0),
    [validServiceRows]
  );

  const updateServiceRow = (
    id: string,
    field: 'serviceType' | 'name' | 'price' | 'quantity' | 'unit',
    val: string | VehicleServiceType
  ) => {
    setServiceRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        if (field === 'price' || field === 'quantity') {
          const num = parseMyanmarNumber(val as string);
          const parsed = Number.isNaN(num) ? 0 : num;
          const next = { ...row, [field]: parsed };
          // Amount is auto: price x qty (the save normalises it the
          // same way, so what is shown is what is saved).
          next.amount = Number(((Number(next.price) || 0) * (Number(next.quantity) || 0)).toFixed(2));
          return next;
        }
        return { ...row, [field]: val };
      })
    );
  };

  const addServiceRow = () => {
    const newRow = blankServiceRow(serviceType);
    newlyAddedRowIdRef.current = newRow.id || null;
    setServiceRows((prev) => [...prev, newRow]);
  };

  // [v7.5.93] Scroll to the new row + focus its name input, same as
  // TransactionModal's shopping-list rows.
  useEffect(() => {
    if (newlyAddedRowIdRef.current && serviceRowsContainerRef.current) {
      const targetId = newlyAddedRowIdRef.current;
      const timer = setTimeout(() => {
        if (serviceRowsContainerRef.current) {
          serviceRowsContainerRef.current.scrollTo({ top: serviceRowsContainerRef.current.scrollHeight, behavior: 'smooth' });
        }
        const inputElem = document.getElementById(`input-maint-row-name-${targetId}`);
        if (inputElem) inputElem.focus();
        newlyAddedRowIdRef.current = null;
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [serviceRows.length]);

  // Never zero rows — removing the last row leaves one blank row.
  const removeServiceRow = (id: string) => {
    setServiceRows((prev) => {
      const filtered = prev.filter((r) => r.id !== id);
      return filtered.length > 0 ? filtered : [blankServiceRow(serviceType)];
    });
  };

  const currentVehicle = useMemo(() => {
    return vehicles.find((v) => v.id === vehicleId) || vehicles[0];
  }, [vehicles, vehicleId]);

  const lastMaintLogForComparison = useMemo(() => {
    if (!vehicleMaintenance || vehicleMaintenance.length === 0) return null;
    const sorted = vehicleMaintenance
      .filter(m => m.vehicleId === vehicleId && m.id !== editingMaintenance?.id)
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA !== dateB) return dateB - dateA;
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
    let match = sorted.find(m => m.serviceType === serviceType);
    if (!match) match = sorted[0];
    return match || null;
  }, [vehicleMaintenance, vehicleId, serviceType, editingMaintenance]);

  const isLicenseRenewal = serviceType === 'license_renewal';

  // [v7.5.93] Rows are shown unless this is a licence visit (single
  // fee) or the form is editing an old record without items.
  const showServiceRows = !isLicenseRenewal && useServiceRows;
  // Cost shown in the single cost field: the rows total while rows
  // are shown, the editable input otherwise.
  const displayCost = showServiceRows ? serviceRowsTotal : (cost === '' ? 0 : Number(cost));

  const handleServiceTypeChange = (type: VehicleServiceType) => {
    setServiceType(type);
    const config = SERVICE_TYPE_CONFIG[type];
    if (config) {
      if (!title || Object.values(SERVICE_TYPE_CONFIG).some((c) => c.labelMy === title || c.labelEn === title)) {
        setTitle(lang === 'my' ? config.labelMy : config.labelEn);
      }
      setExpectedLifespanKm(config.defaultLifespanKm);
      setExpectedLifespanDays(config.defaultLifespanDays);
      // A new service type brings new defaults — expiry auto-calc resumes.
      lifespanDaysEditedRef.current = false;
    }
  };

  // [v7.5.60 D-N10] Hand-typed days win: stop the expiry auto-calc and
  // recompute the expiry date FROM the typed days instead, so the two
  // fields never contradict each other.
  const handleLifespanDaysChange = (val: string) => {
    const parsed = handleNumberInput(val);
    setExpectedLifespanDays(parsed);
    lifespanDaysEditedRef.current = true;
    setExpiryDate(deriveExpiryDate(date, parsed));
  };

  // [v7.5.60 D-N10] Once the user types lifespan days by hand, the
  // expiry-date auto-calc must stop overwriting their value.
  const lifespanDaysEditedRef = useRef(false);

  useEffect(() => {
    if (lifespanDaysEditedRef.current) return;
    if (expiryDate && date) {
      const d1 = new Date(date).getTime();
      const d2 = new Date(expiryDate).getTime();
      if (!isNaN(d1) && !isNaN(d2)) {
        const diff = Math.ceil((d2 - d1) / (1000 * 3600 * 24));
        setExpectedLifespanDays(diff > 0 ? diff : 0);
      }
    }
  }, [expiryDate, date]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const preventDefault = (e: TouchEvent) => { if (e.target === document.body) e.preventDefault(); };
      document.body.addEventListener('touchmove', preventDefault, { passive: false });
      return () => {
        document.body.style.overflow = '';
        document.body.removeEventListener('touchmove', preventDefault);
      };
    }
  }, [isOpen]);

  // [v7.5.55 D3] Number inputs accept Myanmar digits (၀-၉).
  const handleNumberInput = (val: string): number | '' => {
    if (val.trim() === '') return '';
    const n = parseMyanmarNumber(val);
    return Number.isNaN(n) ? '' : n;
  };

  // [v7.5.55 C12] VehicleMaintenance has no stored expiryDate field — it is
  // derived from date + expectedLifespanDays. Compute it in LOCAL time.
  const deriveExpiryDate = (dateStr: string, lifespanDays: number | ''): string => {
    if (!dateStr || lifespanDays === '' || Number(lifespanDays) <= 0) return '';
    const parts = dateStr.split('-').map(Number);
    if (parts.length !== 3 || parts.some((p) => Number.isNaN(p))) return '';
    const d = new Date(parts[0], parts[1] - 1, parts[2] + Number(lifespanDays));
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  useEffect(() => {
    // A fresh form (new or edit) starts with auto-calc enabled again.
    lifespanDaysEditedRef.current = false;
    if (editingMaintenance) {
      setVehicleId(editingMaintenance.vehicleId);
      setDate(editingMaintenance.date);
      setOdometer(editingMaintenance.odometer);
      setServiceType(editingMaintenance.serviceType);
      setTitle(editingMaintenance.title);
      setCost(editingMaintenance.cost);
      setSparePartBrand(editingMaintenance.sparePartBrand || '');
      setWorkshopName(editingMaintenance.workshopName || '');
      setExpectedLifespanKm(editingMaintenance.expectedLifespanKm ?? 5000);
      setExpectedLifespanDays(editingMaintenance.expectedLifespanDays ?? 180);
      // [v7.5.55 C12] Prefill the expiry date on edit instead of leaving
      // whatever a previous entry had in state.
      setExpiryDate(
        deriveExpiryDate(
          editingMaintenance.date,
          editingMaintenance.expectedLifespanDays ?? 180
        )
      );
      setWalletId(editingMaintenance.walletId);
      setSyncToExpense(editingMaintenance.syncToExpense ?? true);
      setNote(editingMaintenance.note || '');
      // [v7.5.93] Edit mode: restore the rows from the linked
      // transaction's items (a row without a serviceType belongs to
      // the visit's main type). No items (old record) → single
      // title+cost behaviour, exactly as before.
      if (editingTransactionItems && editingTransactionItems.length > 0) {
        setUseServiceRows(true);
        setServiceRows(
          editingTransactionItems.map((it) => ({
            id: it.id || blankServiceRow(editingMaintenance.serviceType).id,
            name: it.name || '',
            price: Number(it.price) || 0,
            quantity: Number(it.quantity) || 0,
            amount: Number(((Number(it.price) || 0) * (Number(it.quantity) || 0)).toFixed(2)),
            unit: it.unit || DEFAULT_MENU_UNIT,
            serviceType: it.serviceType || editingMaintenance.serviceType,
          }))
        );
      } else {
        setUseServiceRows(false);
        setServiceRows([]);
      }
    } else {
      const vId = selectedVehicleId || vehicles[0]?.id || '';
      const v = vehicles.find((item) => item.id === vId) || vehicles[0];
      setVehicleId(vId);
      setDate(new Date().toISOString().split('T')[0]);
      setOdometer(v?.currentOdometer ?? 0);
      setServiceType('engine_oil');
      setTitle(lang === 'my' ? 'အင်ဂျင်ဝိုင်နှင့် ဝိုင်စစ်လဲလှယ်ခြင်း' : 'Engine Oil & Filter Change');
      setCost('');
      setSparePartBrand('');
      setWorkshopName('');
      setExpectedLifespanKm(5000);
      setExpectedLifespanDays(180);
      // [v7.5.55 C12] Clear the expiry date on a new entry — never reuse
      // the previous entry's date.
      setExpiryDate('');
      const vehicleWalletExists = v?.walletId && wallets.some((w) => w.id === v.walletId);
      setWalletId(vehicleWalletExists ? v!.walletId! : (wallets[0]?.id || ''));
      setSyncToExpense(true);
      setNote('');
      // [v7.5.93] A new entry always starts with one blank row (its
      // type defaults to the visit's main type, 'engine_oil').
      setUseServiceRows(true);
      setServiceRows([blankServiceRow('engine_oil')]);
    }
  }, [editingMaintenance, editingTransactionItems, isOpen, vehicles, selectedVehicleId, wallets, lang]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // [v7.5.93] Rows active = not a licence visit AND the form is in
    // rows mode. Then the rows total IS the cost and the save gate is
    // total > 0 (same rule as TransactionModal's multi-row save);
    // otherwise the single editable cost field gates as before.
    const rowsActive = showServiceRows;
    if (!vehicleId || !date || (!title.trim() && !isLicenseRenewal)) {
      return;
    }
    if (rowsActive) {
      if (serviceRowsTotal <= 0) return;
    } else if (cost === '') {
      return;
    }

    // ပြင်ဆင်နေချိန်မှာ မိုင်တာက လက်ရှိမိုင်တာထက် မကြီးလည်း ရပါတယ် —
    // ပြင်နေတဲ့ မှတ်တမ်းကိုယ်တိုင်က လက်ရှိမိုင်တာ ဖြစ်နေတတ်လို့ပါ။
    // ယာဉ်ပြောင်းပြီး ပြင်တာမျိုးဆိုရင်တော့ အသစ်ယာဉ်အတွက်ပဲ စစ်ပါတယ်။
    // [v7.5.50] အသစ်ထည့်ချိန်မှာလည်း လက်ရှိမိုင်တာနဲ့ တူရင် ရပါတယ် —
    // လက်ရှိထက် နည်းနေမှသာ ပိတ်ပါတယ်။ အတိအကျ ထပ်နေတာကို Double Entry စစ်ဆေးမှုက တားပါတယ်။
    const isEditingSameVehicle = !!editingMaintenance && editingMaintenance.vehicleId === vehicleId;
    if (!isLicenseRenewal && !isEditingSameVehicle && currentVehicle && Number(odometer) < (currentVehicle.currentOdometer || 0)) {
      // [v7.5.51] Backfill: an older missed entry may legitimately have a lower
      // odometer. Ask instead of blocking — the vehicle odometer itself stays
      // at the highest reading (recalculation uses max), so this cannot lower it.
      const okBackfill = window.confirm(
        lang === 'my'
          ? `မိုင်တာ (${Number(odometer).toLocaleString()}) သည် လက်ရှိ မိုင်တာ (${(currentVehicle.currentOdometer || 0).toLocaleString()}) ထက် နည်းနေပါသည်။ အဟောင်းမှတ်တမ်း ပြန်ဖြည့်တာလား?`
          : `Odometer (${Number(odometer).toLocaleString()}) is lower than the current odometer (${(currentVehicle.currentOdometer || 0).toLocaleString()}). Is this a missed older entry?`
      );
      if (!okBackfill) return;
    }
    if (!isLicenseRenewal && lastMaintLogForComparison && Number(odometer) === lastMaintLogForComparison.odometer) {
      // [v7.5.55 C1] Block only a TRUE duplicate: same odometer AND same
      // date AND same workshop AND same service — never the pre-filled
      // current odometer on its own.
      const isTrueDuplicate =
        lastMaintLogForComparison.date === date &&
        (lastMaintLogForComparison.workshopName || '') === workshopName.trim() &&
        lastMaintLogForComparison.serviceType === serviceType;
      if (isTrueDuplicate) {
        alert(lang === 'my' ? 'ဤမှတ်တမ်းသည် ယခင်မှတ်တမ်းနှင့် အတိအကျ တူနေပါသည်။ (Double Entry ကာကြယ်ရန်)' : 'This entry is an exact duplicate of the last entry. (Prevent Double Entry)');
        return;
      }
    }

    const maintId = editingMaintenance?.id || `maint_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // [v7.5.93] The rows travel to the handler on the save payload.
    // VehicleMaintenance itself has no `items` field (types.ts is
    // owned by the TransactionModal side), so the payload carries it
    // as an extra property — the handler reads it, the stored
    // maintenance record never keeps it.
    const payload: Partial<VehicleMaintenance> & { items?: TransactionItem[] } = {
      id: maintId,
      transactionId: editingMaintenance?.transactionId,
      vehicleId,
      vehicleName: currentVehicle?.name,
      date,
      odometer: isLicenseRenewal ? (currentVehicle?.currentOdometer || 0) : Number(odometer),
      serviceType,
      title: title.trim() || (isLicenseRenewal ? (lang === 'my' ? '🪪 လိုင်စင် သက်တမ်းတိုး' : '🪪 License Renewal') : ''),
      cost: rowsActive ? serviceRowsTotal : Number(cost),
      sparePartBrand: sparePartBrand.trim() || undefined,
      workshopName: workshopName.trim() || undefined,
      expectedLifespanKm: expectedLifespanKm !== '' ? Number(expectedLifespanKm) : undefined,
      expectedLifespanDays: expectedLifespanDays !== '' ? Number(expectedLifespanDays) : undefined,
      walletId: walletId || wallets[0]?.id || 'cash',
      syncToExpense,
      note: note.trim(),
      createdAt: editingMaintenance?.createdAt || Date.now(),
    };
    if (rowsActive) payload.items = validServiceRows;

    // [v7.5.95 U2] Save typed custom units so they reappear as select
    // options next time (same pattern as custom gas stations).
    if (rowsActive) {
      const newCustoms = collectNewCustomUnits(validServiceRows.map((r) => r.unit), customUnits);
      if (newCustoms.length > 0) setCustomUnits((prev) => [...prev, ...newCustoms]);
    }

    onSave(payload);

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 overscroll-none touch-none" onWheel={(e) => e.stopPropagation()}>
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-700 via-indigo-600 to-sky-600 text-white">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white backdrop-blur-md shadow-xs shrink-0">
              <Wrench className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base">
                {editingMaintenance ? (lang === 'my' ? 'အပိုပစ္စည်း/ဝန်ဆောင်မှု ပြင်ဆင်ရန်' : 'Edit Maintenance Record') : (lang === 'my' ? 'အပိုပစ္စည်းလဲလှယ်ခြင်း/ဝန်ဆောင်မှု မှတ်တမ်း' : 'Log Part Replacement & Service')}
              </h3>
              <p className="text-xs text-blue-100">{lang === 'my' ? 'သက်တမ်းသုံးစွဲနိုင်မှုနှင့် နောက်တစ်ကြိမ် လဲရမည့်အချိန် သိရှိရန်' : 'Track part lifespan & service due'}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors cursor-pointer shrink-0"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto overflow-x-hidden overscroll-contain space-y-4 flex-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{lang === 'my' ? 'ယာဉ် / ကား / ဆိုင်ကယ် ရွေးချယ်ရန် *' : 'Select Vehicle *'}</label>
            <select value={vehicleId} onChange={(e) => {
              setVehicleId(e.target.value);
              // [v7.5.55 C11] Refresh odometer + wallet to the NEW vehicle.
              const selected = vehicles.find((v) => v.id === e.target.value);
              if (selected) {
                if (!editingMaintenance) setOdometer(selected.currentOdometer ?? 0);
                if (selected.walletId && wallets.some((w) => w.id === selected.walletId)) {
                  setWalletId(selected.walletId);
                }
              }
            }} className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer">
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.name} {v.plateNumber ? `(${v.plateNumber})` : ''} - {v.currentOdometer?.toLocaleString()} {v.odometerUnit || 'km'}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{lang === 'my' ? 'အပိုပစ္စည်း/ဝန်ဆောင်မှု အမျိုးအစား *' : 'Service Type *'}</label>
            <select value={serviceType} onChange={(e) => handleServiceTypeChange(e.target.value as VehicleServiceType)} className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer">
              {Object.entries(SERVICE_TYPE_CONFIG).map(([key, item]) => (
                <option key={key} value={key}>{lang === 'my' ? item.labelMy : item.labelEn}</option>
              ))}
            </select>
          </div>

          <div className={isLicenseRenewal ? 'hidden' : ''}>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{lang === 'my' ? 'မှတ်တမ်း ခေါင်းစဉ် / အမည် *' : 'Title / Service Description *'}</label>
            <input type="text" required={!isLicenseRenewal} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={lang === 'my' ? 'ဥပမာ - အင်ဂျင်ဝိုင် အသစ်လဲလှယ်ခြင်း' : 'e.g. Engine Oil Replacement'} className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* [v7.5.93] Multi-row service entries — same design as
              TransactionModal's shopping-list rows, plus a service-type
              select per row. Each row's type is tracked separately, so
              one visit can cover several services. The rows total drives
              the cost below. Hidden for licence renewal (single fee)
              and when editing an old record without items. */}
          {!isLicenseRenewal && useServiceRows && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-blue-600" />
                  {lang === 'my' ? 'လဲလှယ်သည့် ပစ္စည်း / ဝန်ဆောင်မှု' : 'Parts / Services'}
                </span>
                <span className="text-[11px] text-slate-500">{lang === 'my' ? 'အမျိုးအစားတစ်ခုစီ သီးခြား မှတ်မည်' : 'Each type tracked separately'}</span>
              </div>
              <div ref={serviceRowsContainerRef} className="space-y-2 max-h-72 overflow-y-auto overflow-x-hidden pr-1">
                {serviceRows.map((row, idx) => (
                  <div key={row.id || idx} className="bg-slate-50 rounded-xl p-2.5 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <select
                        value={row.serviceType || serviceType}
                        onChange={(e) => updateServiceRow(row.id || '', 'serviceType', e.target.value as VehicleServiceType)}
                        className="flex-1 min-w-0 min-h-[44px] text-sm font-bold bg-white border border-slate-200 rounded-lg px-2 focus:outline-none cursor-pointer"
                      >
                        {ROW_SERVICE_TYPES.map((t) => (
                          <option key={t} value={t}>{lang === 'my' ? SERVICE_TYPE_CONFIG[t].labelMy : SERVICE_TYPE_CONFIG[t].labelEn}</option>
                        ))}
                      </select>
                      <button type="button" onClick={() => removeServiceRow(row.id || '')} className="p-1 text-slate-400 hover:text-rose-600 shrink-0 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="text" id={`input-maint-row-name-${row.id}`} value={row.name} onChange={(e) => updateServiceRow(row.id || '', 'name', e.target.value)} placeholder={lang === 'my' ? 'ပစ္စည်းအမည်' : 'Item name'} className="flex-1 min-w-0 text-base font-bold bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none" />
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <input type="text" inputMode="decimal" value={row.price || ''} onChange={(e) => updateServiceRow(row.id || '', 'price', e.target.value)} placeholder="ဈေး" className="min-w-0 w-full text-base font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 focus:outline-none font-mono" />
                      <input type="text" inputMode="decimal" value={row.quantity || ''} onChange={(e) => updateServiceRow(row.id || '', 'quantity', e.target.value)} placeholder="Qty" className="min-w-0 w-full text-base font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 focus:outline-none font-mono text-center" />
                      <input type="text" inputMode="decimal" value={row.amount || ''} readOnly placeholder="Total" className="min-w-0 w-full text-base font-bold bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 focus:outline-none font-mono text-right" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-500 shrink-0">{lang === 'my' ? 'ယူနစ်' : 'Unit'}</span>
                      <select
                        value={resolveMenuUnitSelectValue(row.unit, customUnits)}
                        onChange={(e) => updateServiceRow(row.id || '', 'unit', e.target.value)}
                        className="flex-1 min-w-0 min-h-[44px] text-sm font-bold bg-white border border-slate-200 rounded-lg px-2 focus:outline-none cursor-pointer"
                      >
                        {menuUnitSelectOptions(customUnits).map((u) => (
                          <option key={u.value} value={u.value}>{lang === 'my' ? u.labelMy : u.labelEn}</option>
                        ))}
                      </select>
                    </div>
                    {/* [v7.5.95 U1] 'အခြား' / a custom unit reveals a
                        free-text input: a stored custom unit shows its
                        text prefilled; the typed text IS the saved unit. */}
                    {menuUnitNeedsCustomInput(row.unit, customUnits) && (
                      <input
                        type="text"
                        value={customMenuUnitText(row.unit)}
                        onChange={(e) => updateServiceRow(row.id || '', 'unit', e.target.value)}
                        placeholder={lang === 'my' ? 'ယူနစ် ရိုက်ထည့်ပါ (ဥပမာ - ဗူး)' : 'Type a unit (e.g. per bottle)'}
                        className="w-full min-h-[44px] text-sm font-bold bg-amber-50 border border-amber-200 rounded-lg px-2 focus:outline-none"
                      />
                    )}
                  </div>
                ))}
              </div>
              <button type="button" onClick={addServiceRow} className="w-full mt-2 py-1.5 border-2 border-dashed border-blue-300 rounded-xl text-xs font-bold text-blue-800 hover:bg-blue-50 cursor-pointer">+ {lang === 'my' ? 'ပစ္စည်း ထည့်မည်' : 'Add item'}</button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{lang === 'my' ? 'လဲလှယ်သည့် ရက်စွဲ *' : 'Date *'}</label>
              <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer" />
            </div>
            {!isLicenseRenewal && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">{lang === 'my' ? 'လဲလှယ်ချိန် မိုင်/ကီလို *' : 'Odometer at Service *'}</label>
                  {currentVehicle && (
                    <span className="text-[10px] text-slate-500">{lang === 'my' ? 'လက်ရှိ:' : 'Curr:'} {currentVehicle.currentOdometer?.toLocaleString()} {currentVehicle.odometerUnit || 'km'}</span>
                  )}
                </div>
                <div className="relative">
                  <Gauge className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="text" inputMode="decimal" required={!isLicenseRenewal} value={odometer} onChange={(e) => setOdometer(handleNumberInput(e.target.value))} placeholder="e.g. 45000" className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{lang === 'my' ? 'ကုန်ကျစရိတ် (MMK) *' : 'Cost (MMK) *'}</label>
              {/* [v7.5.93] While rows are shown the cost is read-only:
                  it IS the rows total (one source of truth). The
                  single editable field returns for licence / old
                  single-cost records. */}
              <input type="text" inputMode="decimal" required={!showServiceRows} readOnly={showServiceRows} value={showServiceRows ? (serviceRowsTotal > 0 ? serviceRowsTotal : '') : cost} onChange={(e) => setCost(handleNumberInput(e.target.value))} placeholder="e.g. 120000" className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold text-blue-900 ${showServiceRows ? 'bg-slate-100 text-slate-600 cursor-not-allowed' : ''}`} />
              {showServiceRows && (
                <p className="text-[10px] text-slate-500 mt-1">{lang === 'my' ? '* အထက်ပါ ပစ္စည်းစာရင်းမှ အလိုအလျောက် စုစုပေါင်း တွက်ပါသည်' : '* Auto-totalled from the items list above'}</p>
              )}
              {lastMaintLogForComparison && lastMaintLogForComparison.cost > 0 && displayCost > 0 && (
                <div className="text-[10px] mt-1 flex items-center gap-1">
                  <span className="text-slate-500">{lang === 'my' ? 'ယခင်ကုန်ကျစရိတ်:' : 'Prev Cost:'} {lastMaintLogForComparison.cost.toLocaleString()} Ks</span>
                  {displayCost > lastMaintLogForComparison.cost ? (
                    <span className="text-rose-600 font-bold flex items-center gap-0.5"><TrendingUp className="w-3 h-3" /> +{Math.round(((displayCost - lastMaintLogForComparison.cost) / lastMaintLogForComparison.cost) * 100)}%</span>
                  ) : displayCost < lastMaintLogForComparison.cost ? (
                    <span className="text-emerald-600 font-bold flex items-center gap-0.5"><TrendingDown className="w-3 h-3" /> {Math.round(((displayCost - lastMaintLogForComparison.cost) / lastMaintLogForComparison.cost) * 100)}%</span>
                  ) : <span className="text-slate-400">(Same)</span>}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{lang === 'my' ? 'ငွေပေးချေသည့် ပိုက်ဆံအိတ် *' : 'Payment Wallet *'}</label>
              <select value={walletId} onChange={(e) => setWalletId(e.target.value)} className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>{lang === 'my' ? w.name : w.nameEn || w.name} ({w.balance.toLocaleString()} MMK)</option>
                ))}
              </select>
            </div>
          </div>

          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${isLicenseRenewal ? 'hidden' : ''}`}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{lang === 'my' ? 'အပိုပစ္စည်း တံဆိပ်/အမျိုးအစား' : 'Brand / Part Details'}</label>
              <input type="text" value={sparePartBrand} onChange={(e) => setSparePartBrand(e.target.value)} placeholder={lang === 'my' ? 'ဥပမာ - Castrol 5W-30 (4L) / Brembo' : 'e.g. Castrol 5W-30'} className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{lang === 'my' ? 'ဝပ်ရှော့ / ဆိုင်အမည်' : 'Workshop / Service Center'}</label>
              <input type="text" value={workshopName} onChange={(e) => setWorkshopName(e.target.value)} placeholder={lang === 'my' ? 'ဥပမာ - အောင် ကားဝပ်ရှော့' : 'e.g. Master Car Care'} className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{lang === 'my' ? 'ကုန်ဆုံးမည့် ရက်စွဲ (Expiry Date) - ရွေးချယ်ရန်' : 'Expiry Date (Optional)'}</label>
            <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer" />
            <p className="text-[10px] text-slate-500 mt-1">{lang === 'my' ? '* ရက်စွဲ ရွေးပါက အောက်တွင် သက်တမ်းကို အလိုအလျောက် တွက်ပြပါမည်' : '* Days will auto-calculate based on the selected date.'}</p>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Shield className="w-4 h-4 text-indigo-600" />
              <span>{lang === 'my' ? 'ခန့်မှန်း သက်တမ်း သတ်မှတ်ချက် (Lifespan Estimate)' : 'Expected Lifespan'}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              {!isLicenseRenewal && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">{lang === 'my' ? 'မိုင်/ကီလို သက်တမ်း (km)' : 'Distance (km)'}</label>
                  <input type="text" inputMode="decimal" value={expectedLifespanKm} onChange={(e) => setExpectedLifespanKm(handleNumberInput(e.target.value))} placeholder="5000" className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
                </div>
              )}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">{lang === 'my' ? 'ရက်ပေါင်း သက်တမ်း (Days)' : 'Duration (Days)'}</label>
                <input type="text" inputMode="decimal" readOnly={isLicenseRenewal} value={expectedLifespanDays} onChange={(e) => handleLifespanDaysChange(e.target.value)} placeholder="180" className={`w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono ${isLicenseRenewal ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`} />
              </div>
            </div>
          </div>

          <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={syncToExpense} onChange={(e) => setSyncToExpense(e.target.checked)} className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer" />
              <div>
                <span className="text-xs font-bold text-emerald-950 block">{lang === 'my' ? 'ငွေစာရင်း (Expense) ထဲသို့ အလိုအလျောက် ထည့်သွင်းမည်' : 'Auto-sync to Transactions as Expense'}</span>
              </div>
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{lang === 'my' ? 'မှတ်စု' : 'Note'}</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder={lang === 'my' ? 'အပိုဆောင်း အာမခံမှတ်စုများ...' : 'Additional service notes...'} className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100">
            {editingMaintenance && onDelete ? (
              <button type="button" onClick={() => { if (confirm(lang === 'my' ? 'ဤမှတ်တမ်းကို ဖျက်ရန် သေချာပါသလား?' : 'Are you sure you want to delete this maintenance record?')) { onDelete(editingMaintenance.id); onClose(); } }} className="px-3.5 py-2 text-xs text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl font-medium flex items-center gap-1.5 transition-colors cursor-pointer">
                <Trash2 className="w-3.5 h-3.5" /><span>{lang === 'my' ? 'ဖျက်မည်' : 'Delete'}</span>
              </button>
            ) : <div />}
            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors cursor-pointer">{lang === 'my' ? 'ပယ်ဖျက်မည်' : 'Cancel'}</button>
              <button type="submit" className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-600/20 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95">
                <Save className="w-3.5 h-3.5" /><span>{lang === 'my' ? 'မှတ်တမ်းသိမ်းမည်' : 'Save Record'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
