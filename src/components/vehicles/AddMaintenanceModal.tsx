import React, { useState, useEffect, useMemo } from 'react';
import { X, Wrench, Gauge, Shield, Save, Trash2, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { VehicleMaintenance, Vehicle, Wallet, VehicleServiceType } from '../../types';
import { SERVICE_TYPE_CONFIG } from '../../utils/vehicleAnalytics';

interface AddMaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (maintenance: Partial<VehicleMaintenance>) => void;
  onDelete?: (id: string) => void;
  editingMaintenance?: VehicleMaintenance | null;
  vehicles: Vehicle[];
  wallets: Wallet[];
  selectedVehicleId?: string;
  lang: 'my' | 'en';
  vehicleMaintenance?: VehicleMaintenance[];
}

export const AddMaintenanceModal: React.FC<AddMaintenanceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingMaintenance,
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

  const currentVehicle = useMemo(() => {
    return vehicles.find((v) => v.id === vehicleId) || vehicles[0];
  }, [vehicles, vehicleId]);

  const lastMaintLogForComparison = useMemo(() => {
    if (!vehicleMaintenance || vehicleMaintenance.length === 0) return null;
    return vehicleMaintenance
      .filter(m => m.vehicleId === vehicleId && m.serviceType === serviceType && m.id !== editingMaintenance?.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  }, [vehicleMaintenance, vehicleId, serviceType, editingMaintenance]);

  const isLicenseRenewal = serviceType === 'license_renewal';

  const handleServiceTypeChange = (type: VehicleServiceType) => {
    setServiceType(type);
    const config = SERVICE_TYPE_CONFIG[type];
    if (config) {
      if (!title || Object.values(SERVICE_TYPE_CONFIG).some((c) => c.labelMy === title || c.labelEn === title)) {
        setTitle(lang === 'my' ? config.labelMy : config.labelEn);
      }
      setExpectedLifespanKm(config.defaultLifespanKm);
      setExpectedLifespanDays(config.defaultLifespanDays);
    }
  };

  useEffect(() => {
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

  useEffect(() => {
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
      setWalletId(editingMaintenance.walletId);
      setSyncToExpense(editingMaintenance.syncToExpense ?? true);
      setNote(editingMaintenance.note || '');
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
      const vehicleWalletExists = v?.walletId && wallets.some((w) => w.id === v.walletId);
      setWalletId(vehicleWalletExists ? v!.walletId! : (wallets[0]?.id || ''));
      setSyncToExpense(true);
      setNote('');
    }
  }, [editingMaintenance, isOpen, vehicles, selectedVehicleId, wallets, lang]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId || !date || cost === '' || (!title.trim() && !isLicenseRenewal)) {
      return;
    }

    if (!isLicenseRenewal && currentVehicle && Number(odometer) <= (currentVehicle.currentOdometer || 0)) {
      alert(lang === 'my' ? 'မိုင်တာသည် လက်ရှိ ယာဉ်၏ မိုင်တာထက် ကြီးရပါမည်။' : 'Odometer must be greater than the current vehicle odometer.');
      return;
    }
    if (!isLicenseRenewal && lastMaintLogForComparison && Number(odometer) === lastMaintLogForComparison.odometer) {
      alert(lang === 'my' ? 'Odometer သည် ယခင်မှတ်တမ်းနှင့် တူနေပါသည်။ (Double Entry ကာကြယ်ရန်)' : 'Odometer is the same as the last entry. (Prevent Double Entry)');
      return;
    }

    const maintId = editingMaintenance?.id || `maint_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    onSave({
      id: maintId,
      transactionId: editingMaintenance?.transactionId,
      vehicleId,
      vehicleName: currentVehicle?.name,
      date,
      odometer: isLicenseRenewal ? (currentVehicle?.currentOdometer || 0) : Number(odometer),
      serviceType,
      title: title.trim() || (isLicenseRenewal ? (lang === 'my' ? '🪪 လိုင်စင် သက်တမ်းတိုး' : '🪪 License Renewal') : ''),
      cost: Number(cost),
      sparePartBrand: sparePartBrand.trim() || undefined,
      workshopName: workshopName.trim() || undefined,
      expectedLifespanKm: expectedLifespanKm !== '' ? Number(expectedLifespanKm) : undefined,
      expectedLifespanDays: expectedLifespanDays !== '' ? Number(expectedLifespanDays) : undefined,
      walletId: walletId || wallets[0]?.id || 'cash',
      syncToExpense,
      note: note.trim(),
      createdAt: editingMaintenance?.createdAt || Date.now(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 overscroll-none touch-none" onWheel={(e) => e.stopPropagation()}>
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-700 via-indigo-600 to-sky-600 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white backdrop-blur-md shadow-xs">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">
                {editingMaintenance ? (lang === 'my' ? 'အပိုပစ္စည်း/ဝန်ဆောင်မှု ပြင်ဆင်ရန်' : 'Edit Maintenance Record') : (lang === 'my' ? 'အပိုပစ္စည်းလဲလှယ်ခြင်း/ဝန်ဆောင်မှု မှတ်တမ်း' : 'Log Part Replacement & Service')}
              </h3>
              <p className="text-xs text-blue-100">{lang === 'my' ? 'သက်တမ်းသုံးစွဲနိုင်မှုနှင့် နောက်တစ်ကြိမ် လဲရမည့်အချိန် သိရှိရန်' : 'Track part lifespan & service due'}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto overscroll-contain space-y-4 flex-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{lang === 'my' ? 'ယာဉ် / ကား / ဆိုင်ကယ် ရွေးချယ်ရန် *' : 'Select Vehicle *'}</label>
            <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer">
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
                  <input type="number" required={!isLicenseRenewal} min="0" value={odometer} onChange={(e) => setOdometer(e.target.value === '' ? '' : Number(e.target.value))} placeholder="e.g. 45000" className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{lang === 'my' ? 'ကုန်ကျစရိတ် (MMK) *' : 'Cost (MMK) *'}</label>
              <input type="number" required min="0" value={cost} onChange={(e) => setCost(e.target.value === '' ? '' : Number(e.target.value))} placeholder="e.g. 120000" className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold text-blue-900" />
              {lastMaintLogForComparison && lastMaintLogForComparison.cost > 0 && cost && (
                <div className="text-[10px] mt-1 flex items-center gap-1">
                  <span className="text-slate-500">{lang === 'my' ? 'ယခင်ကုန်ကျစရိတ်:' : 'Prev Cost:'} {lastMaintLogForComparison.cost.toLocaleString()} Ks</span>
                  {Number(cost) > lastMaintLogForComparison.cost ? (
                    <span className="text-rose-600 font-bold flex items-center gap-0.5"><TrendingUp className="w-3 h-3" /> +{Math.round(((Number(cost) - lastMaintLogForComparison.cost) / lastMaintLogForComparison.cost) * 100)}%</span>
                  ) : Number(cost) < lastMaintLogForComparison.cost ? (
                    <span className="text-emerald-600 font-bold flex items-center gap-0.5"><TrendingDown className="w-3 h-3" /> {Math.round(((Number(cost) - lastMaintLogForComparison.cost) / lastMaintLogForComparison.cost) * 100)}%</span>
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
                  <input type="number" min="0" step="any" value={expectedLifespanKm} onChange={(e) => setExpectedLifespanKm(e.target.value === '' ? '' : Number(e.target.value))} placeholder="5000" className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
                </div>
              )}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">{lang === 'my' ? 'ရက်ပေါင်း သက်တမ်း (Days)' : 'Duration (Days)'}</label>
                <input type="number" readOnly={isLicenseRenewal} min="0" step="any" value={expectedLifespanDays} onChange={(e) => setExpectedLifespanDays(e.target.value === '' ? '' : Number(e.target.value))} placeholder="180" className={`w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono ${isLicenseRenewal ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`} />
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
