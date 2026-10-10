import React, { useState, useEffect } from 'react';
import { X, Car, Bike, Truck, Bus, Save, Trash2 } from 'lucide-react';
import { Vehicle, Wallet } from '../../types';

interface AddVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (vehicle: Partial<Vehicle>) => void;
  onDelete?: (id: string) => void;
  editingVehicle?: Vehicle | null;
  wallets: Wallet[];
  lang: 'my' | 'en';
}

const FUEL_TYPES = [
  'Octane 92',
  'Octane 95',
  'Diesel',
  'Premium Diesel',
  'Octane 97',
  'EV (Electric)',
  'CNG',
  'LPG',
];

export const AddVehicleModal: React.FC<AddVehicleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingVehicle,
  wallets,
  lang,
}) => {
  const [name, setName] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [type, setType] = useState<Vehicle['type']>('car');
  const [fuelType, setFuelType] = useState('Octane 92');
  const [currentOdometer, setCurrentOdometer] = useState<number | ''>(0);
  const [odometerUnit, setOdometerUnit] = useState<'km' | 'mi'>('km');
  const [tankCapacity, setTankCapacity] = useState<number | ''>('');
  const [frontPsi, setFrontPsi] = useState<number | ''>(32);
  const [rearPsi, setRearPsi] = useState<number | ''>(34);
  const [walletId, setWalletId] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (editingVehicle) {
      setName(editingVehicle.name || '');
      setPlateNumber(editingVehicle.plateNumber || '');
      setType(editingVehicle.type || 'car');
      setFuelType(editingVehicle.fuelType || 'Octane 92');
      setCurrentOdometer(editingVehicle.currentOdometer ?? 0);
      setOdometerUnit(editingVehicle.odometerUnit || 'km');
      setTankCapacity(editingVehicle.tankCapacity ?? '');
      setFrontPsi(editingVehicle.recommendedTirePressureFront ?? 32);
      setRearPsi(editingVehicle.recommendedTirePressureRear ?? 34);
      setWalletId(editingVehicle.walletId || (wallets[0]?.id || ''));
      setNotes(editingVehicle.notes || '');
    } else {
      setName('');
      setPlateNumber('');
      setType('car');
      setFuelType('Octane 92');
      setCurrentOdometer(0);
      setOdometerUnit('km');
      setTankCapacity(45);
      setFrontPsi(32);
      setRearPsi(34);
      setWalletId(wallets[0]?.id || '');
      setNotes('');
    }
  }, [editingVehicle, isOpen, wallets]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const vehId = editingVehicle?.id || `veh_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    onSave({
      id: vehId,
      name: name.trim(),
      plateNumber: plateNumber.trim(),
      type,
      fuelType,
      currentOdometer: Number(currentOdometer) || 0,
      odometerUnit,
      tankCapacity: tankCapacity !== '' ? Number(tankCapacity) : undefined,
      recommendedTirePressureFront: frontPsi !== '' ? Number(frontPsi) : undefined,
      recommendedTirePressureRear: rearPsi !== '' ? Number(rearPsi) : undefined,
      walletId: walletId || undefined,
      notes: notes.trim() || undefined,
      createdAt: editingVehicle?.createdAt || Date.now(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        id="vehicle-modal-container"
        className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-amber-300 backdrop-blur-md">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">
                {editingVehicle
                  ? lang === 'my'
                    ? 'ယာဉ်အချက်အလက် ပြင်ဆင်ရန်'
                    : 'Edit Vehicle Details'
                  : lang === 'my'
                  ? 'ယာဉ်/ကား/ဆိုင်ကယ် အသစ်ထည့်ရန်'
                  : 'Add New Vehicle'}
              </h3>
              <p className="text-xs text-slate-300">
                {lang === 'my' ? 'ဆီစားနှုန်းနှင့် ထိန်းသိမ်းမှု မှတ်တမ်းများအတွက်' : 'For mileage, fuel & service tracking'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Vehicle Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {lang === 'my' ? 'ယာဉ်အမျိုးအစား' : 'Vehicle Type'}
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'car', labelMy: 'ကား', labelEn: 'Car', icon: Car },
                { id: 'motorcycle', labelMy: 'ဆိုင်ကယ်', labelEn: 'Motorbike', icon: Bike },
                { id: 'truck', labelMy: 'ထရပ်ကား', labelEn: 'Truck', icon: Truck },
                { id: 'van', labelMy: 'ဗင်/ဘတ်စ်', labelEn: 'Van/Bus', icon: Bus },
              ].map((item) => {
                const IconComponent = item.icon;
                const isSelected = type === item.id;
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => {
                      setType(item.id as Vehicle['type']);
                      if (item.id === 'motorcycle') {
                        setFrontPsi(29);
                        setRearPsi(33);
                        setTankCapacity(5);
                      }
                    }}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-bold shadow-sm'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    <IconComponent className="w-5 h-5 mb-1" />
                    <span className="text-xs">{lang === 'my' ? item.labelMy : item.labelEn}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Vehicle Name & Plate Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'my' ? 'ယာဉ်အမည် / မော်ဒယ် *' : 'Vehicle Name / Model *'}
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={lang === 'my' ? 'ဥပမာ - Toyota Crown / Click 125i' : 'e.g. Toyota Crown'}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'my' ? 'ယာဉ်နံပါတ် (လိုင်စင်)' : 'Plate Number'}
              </label>
              <input
                type="text"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value)}
                placeholder={lang === 'my' ? 'ဥပမာ - 7K/1234' : 'e.g. 7K/1234'}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Fuel Type & Current Odometer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'my' ? 'အသုံးပြုသော စက်သုံးဆီ' : 'Fuel Type'}
              </label>
              <select
                value={fuelType}
                onChange={(e) => setFuelType(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                {FUEL_TYPES.map((ft) => (
                  <option key={ft} value={ft}>
                    {ft}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  {lang === 'my' ? 'လက်ရှိ မိုင်/ကီလို (Odometer)' : 'Current Odometer'}
                </label>
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[10px]">
                  <button
                    type="button"
                    onClick={() => setOdometerUnit('km')}
                    className={`px-1.5 py-0.5 rounded cursor-pointer ${
                      odometerUnit === 'km' ? 'bg-white font-bold shadow-xs text-slate-900' : 'text-slate-500'
                    }`}
                  >
                    km
                  </button>
                  <button
                    type="button"
                    onClick={() => setOdometerUnit('mi')}
                    className={`px-1.5 py-0.5 rounded cursor-pointer ${
                      odometerUnit === 'mi' ? 'bg-white font-bold shadow-xs text-slate-900' : 'text-slate-500'
                    }`}
                  >
                    mi
                  </button>
                </div>
              </div>
              <input
                type="number"
                min="0"
                value={currentOdometer}
                onChange={(e) => setCurrentOdometer(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
          </div>

          {/* Tank Capacity & Recommended PSI */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'my' ? 'ဆီတိုင်ကီ ဆံ့ပမာဏ (L)' : 'Tank Capacity (L)'}
              </label>
              <input
                type="number"
                min="1"
                step="0.1"
                value={tankCapacity}
                onChange={(e) => setTankCapacity(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder={type === 'motorcycle' ? '5.5' : '45'}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'my' ? 'ရှေ့ဘီး လေပေါင် (PSI)' : 'Front PSI'}
              </label>
              <input
                type="number"
                min="10"
                max="100"
                value={frontPsi}
                onChange={(e) => setFrontPsi(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="32"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'my' ? 'နောက်ဘီး လေပေါင် (PSI)' : 'Rear PSI'}
              </label>
              <input
                type="number"
                min="10"
                max="100"
                value={rearPsi}
                onChange={(e) => setRearPsi(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="34"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
          </div>

          {/* Default Payment Wallet */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {lang === 'my' ? 'မူလ ပေးချေမည့် ပိုက်ဆံအိတ် (Default Wallet)' : 'Default Payment Wallet'}
            </label>
            <select
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="">{lang === 'my' ? '-- ပိုက်ဆံအိတ် ရွေးချယ်ရန် --' : '-- Select Wallet --'}</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {lang === 'my' ? w.name : w.nameEn || w.name} ({w.balance.toLocaleString()} MMK)
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {lang === 'my' ? 'မှတ်စု / အခြားအချက်အလက်' : 'Notes'}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={lang === 'my' ? 'ဥပမာ - ကားဝယ်သည့်ရက်စွဲ၊ အာမခံစသည့် မှတ်စုများ' : 'Additional notes...'}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100">
            {editingVehicle && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (
                    confirm(
                      lang === 'my'
                        ? 'ဤယာဉ်အချက်အလက်ကို ဖျက်ရန် သေချာပါသလား?'
                        : 'Are you sure you want to delete this vehicle?'
                    )
                  ) {
                    onDelete(editingVehicle.id);
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
                className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{lang === 'my' ? 'သိမ်းဆည်းမည်' : 'Save Vehicle'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
