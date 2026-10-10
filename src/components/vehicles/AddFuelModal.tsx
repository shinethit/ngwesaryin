import React, { useState, useEffect, useMemo } from 'react';
import { X, Fuel, Gauge, CheckCircle2, Save, Trash2, Building2 } from 'lucide-react';
import { FuelLog, Vehicle, Wallet } from '../../types';
import { usePersistedState } from '../../hooks/usePersistedState';

interface AddFuelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (log: Partial<FuelLog>) => void;
  onDelete?: (id: string) => void;
  editingLog?: FuelLog | null;
  vehicles: Vehicle[];
  wallets: Wallet[];
  selectedVehicleId?: string;
  lang: 'my' | 'en';
}

// [v6.1.5] Default gas stations (user-customizable stations live in localStorage)
const DEFAULT_GAS_STATIONS = [
  'Denko',
  'BOC',
  'Max Energy',
];

export const AddFuelModal: React.FC<AddFuelModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingLog,
  vehicles,
  wallets,
  selectedVehicleId,
  lang,
}) => {
  const [vehicleId, setVehicleId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [odometer, setOdometer] = useState<number | ''>('');
  const [liters, setLiters] = useState<number | ''>('');
  const [pricePerLiter, setPricePerLiter] = useState<number | ''>('');
  const [totalCost, setTotalCost] = useState<number | ''>('');
  const [isFullTank, setIsFullTank] = useState(true);
  const [fuelType, setFuelType] = useState('Octane 92');
  const [gasStation, setGasStation] = useState('Denko');
  const [customGasStation, setCustomGasStation] = useState('');

  // [v6.1.5] User-managed custom gas stations (persisted in localStorage)
  const [customStations, setCustomStations] = usePersistedState<string[]>('ngwe_custom_gas_stations', []);
  const [showStationManager, setShowStationManager] = useState(false);
  const [newStationName, setNewStationName] = useState('');

  const allStations = useMemo(() => {
    const seen = new Set<string>();
    const merged: string[] = [];
    DEFAULT_GAS_STATIONS.forEach((s) => {
      if (s && !seen.has(s)) { seen.add(s); merged.push(s); }
    });
    customStations.forEach((s) => {
      if (s && !seen.has(s)) { seen.add(s); merged.push(s); }
    });
    return merged;
  }, [customStations]);

  const handleAddStation = () => {
    const name = newStationName.trim();
    if (!name) return;
    if (allStations.includes(name)) {
      setGasStation(name);
      setNewStationName('');
      setShowStationManager(false);
      return;
    }
    setCustomStations((prev) => [...prev, name]);
    setGasStation(name);
    setNewStationName('');
    setShowStationManager(false);
  };

  const handleDeleteStation = (name: string) => {
    if (!window.confirm(`Delete "${name}" from your stations?`)) return;
    setCustomStations((prev) => prev.filter((s) => s !== name));
    if (gasStation === name) {
      setGasStation(DEFAULT_GAS_STATIONS[0]);
    }
  };
  const [walletId, setWalletId] = useState('');
  const [syncToExpense, setSyncToExpense] = useState(true);
  const [note, setNote] = useState('');

  // Active Vehicle
  const currentVehicle = useMemo(() => {
    return vehicles.find((v) => v.id === vehicleId) || vehicles[0];
  }, [vehicles, vehicleId]);

  useEffect(() => {
    if (editingLog) {
      setVehicleId(editingLog.vehicleId);
      setDate(editingLog.date);
      setOdometer(editingLog.odometer);
      setLiters(editingLog.liters);
      setPricePerLiter(editingLog.pricePerLiter);
      setTotalCost(editingLog.totalCost);
      setIsFullTank(editingLog.isFullTank);
      setFuelType(editingLog.fuelType || 'Octane 92');
      // [v6.1.5] Known stations = default + custom
      const knownStations = new Set([...DEFAULT_GAS_STATIONS, ...customStations]);
      if (editingLog.gasStation && knownStations.has(editingLog.gasStation)) {
        setGasStation(editingLog.gasStation);
        setCustomGasStation('');
      } else {
        setGasStation('Other');
        setCustomGasStation(editingLog.gasStation || '');
      }
      setWalletId(editingLog.walletId);
      setSyncToExpense(editingLog.syncToExpense ?? true);
      setNote(editingLog.note || '');
    } else {
      const vId = selectedVehicleId || vehicles[0]?.id || '';
      const v = vehicles.find((item) => item.id === vId) || vehicles[0];
      setVehicleId(vId);
      setDate(new Date().toISOString().split('T')[0]);
      setOdometer(v?.currentOdometer ? v.currentOdometer + 100 : '');
      setLiters('');
      setPricePerLiter(3100);
      setTotalCost('');
      setIsFullTank(true);
      setFuelType(v?.fuelType || 'Octane 92');
      setGasStation('Denko');
      setCustomGasStation('');
      // [FIX v6.1.3] Only use vehicle.walletId if that wallet STILL exists.
      // Never auto-find wallets by name — that resurrects deleted "Car Wallet" entries.
      const vehicleWalletExists = v?.walletId && wallets.some((w) => w.id === v.walletId);
      setWalletId(vehicleWalletExists ? v!.walletId! : (wallets[0]?.id || ''));
      setSyncToExpense(true);
      setNote('');
    }
  }, [editingLog, isOpen, vehicles, selectedVehicleId, wallets]);

  // Handle auto-calc of total cost when liters or price changes
  const handleLitersChange = (val: string) => {
    const num = val === '' ? '' : Number(val);
    setLiters(num);
    if (num !== '' && pricePerLiter !== '') {
      setTotalCost(Math.round(num * Number(pricePerLiter)));
    }
  };

  const handlePriceChange = (val: string) => {
    const num = val === '' ? '' : Number(val);
    setPricePerLiter(num);
    if (liters !== '' && num !== '') {
      setTotalCost(Math.round(Number(liters) * num));
    }
  };

  const handleTotalCostChange = (val: string) => {
    const num = val === '' ? '' : Number(val);
    setTotalCost(num);
    if (num !== '' && pricePerLiter !== '' && Number(pricePerLiter) > 0) {
      setLiters(Number((num / Number(pricePerLiter)).toFixed(2)));
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId || !date || liters === '' || pricePerLiter === '' || totalCost === '') {
      return;
    }

    const station = gasStation === 'Other' ? customGasStation.trim() : gasStation;
    const fuelId = editingLog?.id || `fuel_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    onSave({
      id: fuelId,
      transactionId: editingLog?.transactionId,
      vehicleId,
      vehicleName: currentVehicle?.name,
      date,
      odometer: Number(odometer) || 0,
      liters: Number(liters),
      pricePerLiter: Number(pricePerLiter),
      totalCost: Number(totalCost),
      isFullTank,
      fuelType,
      gasStation: station || undefined,
      walletId: walletId || wallets[0]?.id || 'cash',
      syncToExpense,
      note: note.trim() || undefined,
      createdAt: editingLog?.createdAt || Date.now(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        id="add-fuel-modal-container"
        className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-600 via-amber-500 to-orange-500 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white backdrop-blur-md shadow-xs">
              <Fuel className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">
                {editingLog
                  ? lang === 'my'
                    ? 'ဆီထည့်စာရင်း ပြင်ဆင်ရန်'
                    : 'Edit Fuel Entry'
                  : lang === 'my'
                  ? 'ဆီထည့်စာရင်း အသစ်မှတ်ရန်'
                  : 'Log Fuel Fill-up'}
              </h3>
              <p className="text-xs text-amber-100">
                {lang === 'my' ? 'ဆီစားနှုန်းနှင့် ကုန်ကျစရိတ်များကို အလိုအလျောက် တွက်ချက်မည်' : 'Auto-calculates mileage & cost per km'}
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
          {/* Reassurance Banner: Auto Sync to Expense */}
          <div className="p-3 bg-emerald-50 border border-emerald-200/90 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-950 shadow-2xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5 leading-relaxed">
              <span className="font-bold block text-emerald-900">
                {lang === 'my'
                  ? '💡 ပင်မ ထွက်ငွေစာရင်း (Expense) ထဲသို့ အလိုအလျောက် တပြိုင်နက် ရောက်ရှိပါမည်'
                  : '💡 Automatically Synced to Your Main Expense Records'}
              </span>
              <span className="text-[11px] text-emerald-700 block">
                {lang === 'my'
                  ? 'ဤနေရာမှ ဆီထည့်စာရင်း ဖြည့်သွင်းလိုက်ပါက ရွေးချယ်ထားသော ပိုက်ဆံအိတ်ထဲမှ ကျသင့်ငွေ အလိုအလျောက် နုတ်ယူပြီး ပင်မထွက်ငွေစာရင်းထဲ ပေါင်းထည့်ပေးပါမည်။ နဂိုငွေစာရင်းသွင်းသည့်နေရာတွင် ၂ ကြိမ် ထပ်ထည့်ရန် မလိုပါ။'
                  : 'Logging fuel here automatically deducts from your wallet and records as an expense under Vehicle/Transport. You do NOT need to enter it twice in the main transaction form.'}
              </span>
            </div>
          </div>

          {/* Vehicle Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {lang === 'my' ? 'ယာဉ် / ကား / ဆိုင်ကယ် ရွေးချယ်ရန် *' : 'Select Vehicle *'}
            </label>
            <select
              value={vehicleId}
              onChange={(e) => {
                setVehicleId(e.target.value);
                const selected = vehicles.find((v) => v.id === e.target.value);
                if (selected) {
                  setFuelType(selected.fuelType || 'Octane 92');
                  if (selected.walletId) setWalletId(selected.walletId);
                }
              }}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium cursor-pointer"
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} {v.plateNumber ? `(${v.plateNumber})` : ''} - {v.currentOdometer?.toLocaleString()} {v.odometerUnit || 'km'}
                </option>
              ))}
            </select>
          </div>

          {/* Date & Odometer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'my' ? 'ဆီထည့်သည့် ရက်စွဲ *' : 'Date *'}
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  {lang === 'my' ? 'လက်ရှိ မိုင်/ကီလို *' : 'Odometer (Current) *'}
                </label>
                {currentVehicle && (
                  <span className="text-[10px] text-slate-500">
                    {lang === 'my' ? 'ယခင်:' : 'Prev:'} {currentVehicle.currentOdometer?.toLocaleString()} {currentVehicle.odometerUnit || 'km'}
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
                  placeholder="e.g. 45200"
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Liters & Price per Liter */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'my' ? 'ဆီပမာဏ (လီတာ) *' : 'Fuel Liters *'}
              </label>
              <input
                type="number"
                required
                step="0.01"
                min="0.1"
                value={liters}
                onChange={(e) => handleLitersChange(e.target.value)}
                placeholder="e.g. 35.5"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono font-bold text-amber-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'my' ? '၁ လီတာ ဈေးနှုန်း (MMK) *' : 'Price per Liter (MMK) *'}
              </label>
              <input
                type="number"
                required
                min="100"
                step="1"
                value={pricePerLiter}
                onChange={(e) => handlePriceChange(e.target.value)}
                placeholder="e.g. 3150"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
            </div>
          </div>

          {/* Total Cost Calculation Banner */}
          <div className="p-3.5 bg-amber-50/80 border border-amber-200/70 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-xs text-amber-800 font-medium block">
                {lang === 'my' ? 'ကျသင့်ငွေ စုစုပေါင်း' : 'Total Fuel Cost'}
              </span>
              <span className="text-[11px] text-amber-600">
                {liters && pricePerLiter ? `${liters} L × ${Number(pricePerLiter).toLocaleString()} MMK` : 'အလိုအလျောက် တွက်ချက်ထားသည်'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                required
                min="0"
                value={totalCost}
                onChange={(e) => handleTotalCostChange(e.target.value)}
                placeholder="0"
                className="w-36 px-2.5 py-1.5 text-right font-mono text-base font-bold text-amber-900 bg-white border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
              />
              <span className="text-xs font-bold text-amber-900">Ks</span>
            </div>
          </div>

          {/* Full Tank Toggle & Fuel Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center">
              <label className="flex items-center gap-2.5 p-3 w-full bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={isFullTank}
                  onChange={(e) => setIsFullTank(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    {lang === 'my' ? 'ဆီအပြည့်ထည့်ခြင်း (Full Tank)' : 'Full Tank Fill-up'}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {lang === 'my' ? 'ဆီစားနှုန်း အတိအကျ တွက်ချက်နိုင်ရန်' : 'Enables exact km/L calculation'}
                  </span>
                </div>
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'my' ? 'ဆီအမျိုးအစား' : 'Fuel Grade'}
              </label>
              <select
                value={fuelType}
                onChange={(e) => setFuelType(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
              >
                <option value="Octane 92">Octane 92</option>
                <option value="Octane 95">Octane 95</option>
                <option value="Diesel">Diesel</option>
                <option value="Premium Diesel">Premium Diesel</option>
                <option value="Octane 97">Octane 97</option>
                <option value="EV (Electric)">EV (Electric)</option>
                <option value="CNG">CNG</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Gas Station + Wallet [v6.1.5] */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    {lang === 'my' ? 'ဆီဆိုင် အမည်' : 'Gas Station'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowStationManager((v) => !v)}
                    className="text-[10px] font-bold text-amber-700 hover:text-amber-900 hover:underline cursor-pointer"
                  >
                    {showStationManager
                      ? (lang === 'my' ? '✕ ပိတ်' : '✕ Close')
                      : (lang === 'my' ? '⚙️ စီမံ' : '⚙️ Manage')}
                  </button>
                </div>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={gasStation}
                    onChange={(e) => setGasStation(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  >
                    {allStations.map((gs) => (
                      <option key={gs} value={gs}>
                        {gs}
                      </option>
                    ))}
                    <option value="Other">
                      {lang === 'my' ? '➕ အခြား / အသစ်ရေးရန်' : '➕ Other / Custom'}
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'my' ? 'ငွေပေးချေသည့် ပိုက်ဆံအိတ် *' : 'Payment Wallet *'}
                </label>
                <select
                  value={walletId}
                  onChange={(e) => setWalletId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {lang === 'my' ? w.name : w.nameEn || w.name} ({w.balance.toLocaleString()} MMK)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {gasStation === 'Other' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'my' ? 'ဆီဆိုင် အမည် ရေးရန်' : 'Enter Station Name'}
                </label>
                <input
                  type="text"
                  value={customGasStation}
                  onChange={(e) => setCustomGasStation(e.target.value)}
                  placeholder="Station name..."
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            )}

            {/* Station Manager Panel */}
            {showStationManager && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900">
                    {lang === 'my' ? '⚙️ ဆီဆိုင် စီမံခန့်ခွဲမှု' : '⚙️ Manage Stations'}
                  </span>
                  <span className="text-[10px] text-amber-700 font-mono">
                    {customStations.length} {lang === 'my' ? 'ခု ကိုယ်ပိုင်' : 'custom'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newStationName}
                    onChange={(e) => setNewStationName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddStation(); } }}
                    placeholder={lang === 'my' ? 'ဆီဆိုင် အသစ် အမည်...' : 'New station name...'}
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddStation}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    + {lang === 'my' ? 'ထည့်' : 'Add'}
                  </button>
                </div>

                {customStations.length > 0 ? (
                  <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                    {customStations.map((s) => (
                      <div
                        key={s}
                        className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-amber-200/70 text-xs"
                      >
                        <span className="text-slate-800 truncate">{s}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteStation(s)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-amber-700 italic text-center py-1">
                    {lang === 'my' ? 'ကိုယ်ပိုင် ဆီဆိုင် မရှိသေးပါ' : 'No custom stations yet'}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Sync to Expense Checkbox */}
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
                    ? 'ပိုက်ဆံအိတ်ထဲမှ ငွေကျသင့်ငွေ အလိုအလျောက် နုတ်ယူသွားမည်'
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
              placeholder={lang === 'my' ? 'ဥပမာ - မန္တလေး ခရီးမထွက်မီ ဆီအပြည့်ဖြည့်ခြင်း' : 'e.g. Highway trip fill-up'}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100">
            {editingLog && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (
                    confirm(
                      lang === 'my'
                        ? 'ဤဆီထည့်မှတ်တမ်းကို ဖျက်ရန် သေချာပါသလား?'
                        : 'Are you sure you want to delete this fuel record?'
                    )
                  ) {
                    onDelete(editingLog.id);
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
                className="px-5 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md shadow-amber-600/20 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{lang === 'my' ? '✓ ဆီမှတ်တမ်းနှင့် ထွက်ငွေစာရင်း သိမ်းမည်' : '✓ Save Fuel Log & Expense'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
