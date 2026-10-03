import React, { useState, useEffect, useMemo } from 'react';
import { X, Wrench, Gauge, DollarSign, Shield, Calendar, Building, Sparkles, Save, Trash2 } from 'lucide-react';
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
  const [walletId, setWalletId] = useState('');
  const [syncToExpense, setSyncToExpense] = useState(true);
  const [note, setNote] = useState('');

  const currentVehicle = useMemo(() => {
    return vehicles.find((v) => v.id === vehicleId) || vehicles[0];
  }, [vehicles, vehicleId]);

  // When service type changes, auto-fill default title and lifespan
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
      const carWallet = wallets.find(
        (w) =>
          (w.name && (w.name.includes('ကား') || w.name.includes('ယာဉ်'))) ||
          (w.nameEn && (w.nameEn.toLowerCase().includes('car') || w.nameEn.toLowerCase().includes('vehicle')))
      );
      setWalletId(v?.walletId || carWallet?.id || wallets[0]?.id || '');
      setSyncToExpense(true);
      setNote('');
    }
  }, [editingMaintenance, isOpen, vehicles, selectedVehicleId, wallets, lang]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId || !date || cost === '' || !title.trim()) {
      return;
    }

    const maintId = editingMaintenance?.id || `maint_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    onSave({
      id: maintId,
      transactionId: editingMaintenance?.transactionId,
      vehicleId,
      vehicleName: currentVehicle?.name,
      date,
      odometer: Number(odometer) || 0,
      serviceType,
      title: title.trim(),
      cost: Number(cost),
      sparePartBrand: sparePartBrand.trim() || undefined,
      workshopName: workshopName.trim() || undefined,
      expectedLifespanKm: expectedLifespanKm !== '' ? Number(expectedLifespanKm) : undefined,
      expectedLifespanDays: expectedLifespanDays !== '' ? Number(expectedLifespanDays) : undefined,
      walletId: walletId || wallets[0]?.id || 'cash',
      syncToExpense,
      note: note.trim() || undefined,
      createdAt: editingMaintenance?.createdAt || Date.now(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        id="add-maintenance-modal-container"
        className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-700 via-indigo-600 to-sky-600 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white backdrop-blur-md shadow-xs">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">
                {editingMaintenance
                  ? lang === 'my'
                    ? 'အပိုပစ္စည်း/ဝန်ဆောင်မှု ပြင်ဆင်ရန်'
                    : 'Edit Maintenance Record'
                  : lang === 'my'
                  ? 'အပိုပစ္စည်းလဲလှယ်ခြင်း/ဝန်ဆောင်မှု မှတ်တမ်း'
                  : 'Log Part Replacement & Service'}
              </h3>
              <p className="text-xs text-blue-100">
                {lang === 'my' ? 'သက်တမ်းသုံးစွဲနိုင်မှုနှင့် နောက်တစ်ကြိမ် လဲရမည့်အချိန် သိရှိရန်' : 'Track part lifespan & service due'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Vehicle Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {lang === 'my' ? 'ယာဉ် / ကား / ဆိုင်ကယ် ရွေးချယ်ရန် *' : 'Select Vehicle *'}
            </label>
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer"
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} {v.plateNumber ? `(${v.plateNumber})` : ''} - {v.currentOdometer?.toLocaleString()} {v.odometerUnit || 'km'}
                </option>
              ))}
            </select>
          </div>

          {/* Service Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {lang === 'my' ? 'အပိုပစ္စည်း/ဝန်ဆောင်မှု အမျိုးအစား *' : 'Service Type *'}
            </label>
            <select
              value={serviceType}
              onChange={(e) => handleServiceTypeChange(e.target.value as VehicleServiceType)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer"
            >
              {Object.entries(SERVICE_TYPE_CONFIG).map(([key, item]) => (
                <option key={key} value={key}>
                  {lang === 'my' ? item.labelMy : item.labelEn}
                </option>
              ))}
            </select>
          </div>

          {/* Title / Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {lang === 'my' ? 'မှတ်တမ်း ခေါင်းစဉ် / အမည် *' : 'Title / Service Description *'}
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={lang === 'my' ? 'ဥပမာ - အင်ဂျင်ဝိုင် အသစ်လဲလှယ်ခြင်း' : 'e.g. Engine Oil Replacement'}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Date & Odometer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'my' ? 'လဲလှယ်သည့် ရက်စွဲ *' : 'Date *'}
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  {lang === 'my' ? 'လဲလှယ်ချိန် မိုင်/ကီလို *' : 'Odometer at Service *'}
                </label>
                {currentVehicle && (
                  <span className="text-[10px] text-slate-500">
                    {lang === 'my' ? 'လက်ရှိ:' : 'Curr:'} {currentVehicle.currentOdometer?.toLocaleString()} {currentVehicle.odometerUnit || 'km'}
                  </span>
                )}
              </div>
              <div className="relative">
                <Gauge className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  required
                  min="0"
                  value={odometer}
                  onChange={(e) => setOdometer(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 45000"
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Cost & Payment Wallet */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'my' ? 'ကုန်ကျစရိတ် (MMK) *' : 'Cost (MMK) *'}
              </label>
              <input
                type="number"
                required
                min="0"
                value={cost}
                onChange={(e) => setCost(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 120000"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold text-blue-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'my' ? 'ငွေပေးချေသည့် ပိုက်ဆံအိတ် *' : 'Payment Wallet *'}
              </label>
              <select
                value={walletId}
                onChange={(e) => setWalletId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {lang === 'my' ? w.name : w.nameEn || w.name} ({w.balance.toLocaleString()} MMK)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Spare Part Brand & Workshop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'my' ? 'အပိုပစ္စည်း တံဆိပ်/အမျိုးအစား' : 'Brand / Part Details'}
              </label>
              <input
                type="text"
                value={sparePartBrand}
                onChange={(e) => setSparePartBrand(e.target.value)}
                placeholder={lang === 'my' ? 'ဥပမာ - Castrol 5W-30 (4L) / Brembo' : 'e.g. Castrol 5W-30'}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'my' ? 'ဝပ်ရှော့ / ဆိုင်အမည်' : 'Workshop / Service Center'}
              </label>
              <input
                type="text"
                value={workshopName}
                onChange={(e) => setWorkshopName(e.target.value)}
                placeholder={lang === 'my' ? 'ဥပမာ - အောင် ကားဝပ်ရှော့' : 'e.g. Master Car Care'}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Lifespan Estimates */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Shield className="w-4 h-4 text-indigo-600" />
              <span>{lang === 'my' ? 'ခန့်မှန်း သက်တမ်း သတ်မှတ်ချက် (Lifespan Estimate)' : 'Expected Lifespan'}</span>
            </div>
            <p className="text-[11px] text-slate-500">
              {lang === 'my'
                ? 'နောက်တစ်ကြိမ် ပြန်လဲရမည့်အချိန်တွင် အက်ပ်မှ သတိပေးချက် ပြသပေးမည်'
                : 'Used to alert you when the part is due for replacement'}
            </p>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  {lang === 'my' ? 'မိုင်/ကီလို သက်တမ်း (km)' : 'Distance (km)'}
                </label>
                <input
                  type="number"
                  min="500"
                  step="500"
                  value={expectedLifespanKm}
                  onChange={(e) => setExpectedLifespanKm(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="5000"
                  className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  {lang === 'my' ? 'ရက်ပေါင်း သက်တမ်း (Days)' : 'Duration (Days)'}
                </label>
                <input
                  type="number"
                  min="30"
                  step="30"
                  value={expectedLifespanDays}
                  onChange={(e) => setExpectedLifespanDays(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="180"
                  className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Sync to Expense */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={syncToExpense}
                onChange={(e) => setSyncToExpense(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
              />
              <div>
                <span className="text-xs font-bold text-emerald-950 block">
                  {lang === 'my'
                    ? 'ငွေစာရင်း (Expense) ထဲသို့ အလိုအလျောက် ထည့်သွင်းမည်'
                    : 'Auto-sync to Transactions as Expense'}
                </span>
                <span className="text-[11px] text-emerald-700">
                  {lang === 'my'
                    ? 'ပိုက်ဆံအိတ်ထဲမှ ကုန်ကျငွေ အလိုအလျောက် နုတ်ယူပြီး စာရင်းသွင်းမည်'
                    : 'Deducts wallet balance & records under Transport category'}
                </span>
              </div>
            </label>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {lang === 'my' ? 'မှတ်စု (ရွေးချယ်ရန်)' : 'Note (Optional)'}
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={lang === 'my' ? 'အပိုဆောင်း အာမခံမှတ်စုများ...' : 'Additional service notes...'}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100">
            {editingMaintenance && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (
                    confirm(
                      lang === 'my'
                        ? 'ဤမှတ်တမ်းကို ဖျက်ရန် သေချာပါသလား?'
                        : 'Are you sure you want to delete this maintenance record?'
                    )
                  ) {
                    onDelete(editingMaintenance.id);
                    onClose();
                  }
                }}
                className="px-3.5 py-2 text-xs text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{lang === 'my' ? 'ဖျက်မည်' : 'Delete'}</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors cursor-pointer"
              >
                {lang === 'my' ? 'ပယ်ဖျက်မည်' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-600/20 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{lang === 'my' ? 'မှတ်တမ်းသိမ်းမည်' : 'Save Record'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
