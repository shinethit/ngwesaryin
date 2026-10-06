import React, { useState, useEffect, useMemo } from 'react';
import { X, Disc, Gauge, Calendar, ShieldCheck, Save, Trash2 } from 'lucide-react';
import { TirePressureLog, Vehicle, Wallet } from '../../types';

interface AddTirePressureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (log: Partial<TirePressureLog>) => void;
  onDelete?: (id: string) => void;
  editingLog?: TirePressureLog | null;
  vehicles: Vehicle[];
  wallets: Wallet[];
  selectedVehicleId?: string;
  lang: 'my' | 'en';
}

export const AddTirePressureModal: React.FC<AddTirePressureModalProps> = ({
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
  const [frontLeftPsi, setFrontLeftPsi] = useState<number | ''>(32);
  const [frontRightPsi, setFrontRightPsi] = useState<number | ''>(32);
  const [rearLeftPsi, setRearLeftPsi] = useState<number | ''>(34);
  const [rearRightPsi, setRearRightPsi] = useState<number | ''>(34);
  const [frontPsi, setFrontPsi] = useState<number | ''>(29);
  const [rearPsi, setRearPsi] = useState<number | ''>(33);
  const [tireCondition, setTireCondition] = useState<TirePressureLog['tireCondition']>('good');
  const [servicePlace, setServicePlace] = useState('');
  const [cost, setCost] = useState<number | ''>('');
  const [walletId, setWalletId] = useState('');
  const [syncToExpense, setSyncToExpense] = useState(false);
  const [note, setNote] = useState('');

  const currentVehicle = useMemo(() => {
    return vehicles.find((v) => v.id === vehicleId) || vehicles[0];
  }, [vehicles, vehicleId]);

  const isTwoWheeler = currentVehicle?.type === 'motorcycle';

  useEffect(() => {
    if (editingLog) {
      setVehicleId(editingLog.vehicleId);
      setDate(editingLog.date);
      setOdometer(editingLog.odometer ?? '');
      setFrontLeftPsi(editingLog.frontLeftPsi ?? 32);
      setFrontRightPsi(editingLog.frontRightPsi ?? 32);
      setRearLeftPsi(editingLog.rearLeftPsi ?? 34);
      setRearRightPsi(editingLog.rearRightPsi ?? 34);
      setFrontPsi(editingLog.frontPsi ?? 29);
      setRearPsi(editingLog.rearPsi ?? 33);
      setTireCondition(editingLog.tireCondition || 'good');
      setServicePlace(editingLog.servicePlace || '');
      setCost(editingLog.cost ?? '');
      setWalletId(editingLog.walletId || '');
      setSyncToExpense(editingLog.syncToExpense ?? false);
      setNote(editingLog.note || '');
    } else {
      const vId = selectedVehicleId || vehicles[0]?.id || '';
      const v = vehicles.find((item) => item.id === vId) || vehicles[0];
      setVehicleId(vId);
      setDate(new Date().toISOString().split('T')[0]);
      setOdometer(v?.currentOdometer ?? '');
      setFrontLeftPsi(v?.recommendedTirePressureFront ?? 32);
      setFrontRightPsi(v?.recommendedTirePressureFront ?? 32);
      setRearLeftPsi(v?.recommendedTirePressureRear ?? 34);
      setRearRightPsi(v?.recommendedTirePressureRear ?? 34);
      setFrontPsi(v?.recommendedTirePressureFront ?? 29);
      setRearPsi(v?.recommendedTirePressureRear ?? 33);
      setTireCondition('good');
      setServicePlace('');
      setCost('');
      // [FIX v6.1.3] Only use vehicle.walletId if that wallet STILL exists.
      const vehicleWalletExists = v?.walletId && wallets.some((w) => w.id === v.walletId);
      setWalletId(vehicleWalletExists ? v!.walletId! : (wallets[0]?.id || ''));
      setSyncToExpense(false);
      setNote('');
    }
  }, [editingLog, isOpen, vehicles, selectedVehicleId, wallets]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId || !date) return;

    const tireId = editingLog?.id || `tire_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    onSave({
      id: tireId,
      transactionId: editingLog?.transactionId,
      vehicleId,
      vehicleName: currentVehicle?.name,
      date,
      odometer: odometer !== '' ? Number(odometer) : undefined,
      frontLeftPsi: !isTwoWheeler && frontLeftPsi !== '' ? Number(frontLeftPsi) : undefined,
      frontRightPsi: !isTwoWheeler && frontRightPsi !== '' ? Number(frontRightPsi) : undefined,
      rearLeftPsi: !isTwoWheeler && rearLeftPsi !== '' ? Number(rearLeftPsi) : undefined,
      rearRightPsi: !isTwoWheeler && rearRightPsi !== '' ? Number(rearRightPsi) : undefined,
      frontPsi: isTwoWheeler && frontPsi !== '' ? Number(frontPsi) : undefined,
      rearPsi: isTwoWheeler && rearPsi !== '' ? Number(rearPsi) : undefined,
      tireCondition,
      servicePlace: servicePlace.trim() || undefined,
      cost: cost !== '' ? Number(cost) : undefined,
      walletId: syncToExpense ? walletId || wallets[0]?.id || 'cash' : undefined,
      syncToExpense,
      note: note.trim() || undefined,
      createdAt: editingLog?.createdAt || Date.now(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        id="add-tire-pressure-modal-container"
        className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white backdrop-blur-md shadow-xs">
              <Disc className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">
                {editingLog
                  ? lang === 'my'
                    ? 'တာယာ လေပေါင်ချိန် မှတ်တမ်း ပြင်ဆင်ရန်'
                    : 'Edit Tire Pressure Record'
                  : lang === 'my'
                  ? 'တာယာ လေထိုး/လေပေါင်ချိန် မှတ်တမ်း'
                  : 'Log Tire Pressure Check'}
              </h3>
              <p className="text-xs text-teal-100">
                {lang === 'my' ? 'တာယာသက်တမ်းနှင့် လေပေါင်ချိန် အခြေအနေ' : 'Tire condition & PSI tracking'}
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
              onChange={(e) => {
                setVehicleId(e.target.value);
                const v = vehicles.find((item) => item.id === e.target.value);
                if (v) {
                  setFrontLeftPsi(v.recommendedTirePressureFront ?? 32);
                  setFrontRightPsi(v.recommendedTirePressureFront ?? 32);
                  setRearLeftPsi(v.recommendedTirePressureRear ?? 34);
                  setRearRightPsi(v.recommendedTirePressureRear ?? 34);
                  setFrontPsi(v.recommendedTirePressureFront ?? 29);
                  setRearPsi(v.recommendedTirePressureRear ?? 33);
                }
              }}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium cursor-pointer"
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} {v.plateNumber ? `(${v.plateNumber})` : ''} ({v.type})
                </option>
              ))}
            </select>
          </div>

          {/* Date & Odometer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'my' ? 'လေချိန်သည့် ရက်စွဲ *' : 'Check Date *'}
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'my' ? 'လက်ရှိ မိုင်/ကီလို' : 'Odometer (Optional)'}
              </label>
              <div className="relative">
                <Gauge className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min="0"
                  value={odometer}
                  onChange={(e) => setOdometer(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 45000"
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Visual Tire Pressure Inputs */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-800">
                {lang === 'my' ? 'တာယာ လေပေါင်ချိန် (PSI)' : 'Tire Pressure (PSI)'}
              </span>
              <span className="text-[11px] text-teal-700 font-medium">
                {lang === 'my' ? 'အကြံပြုချက်:' : 'Rec:'} ရှေ့ ({currentVehicle?.recommendedTirePressureFront || 32} PSI), နောက် ({currentVehicle?.recommendedTirePressureRear || 34} PSI)
              </span>
            </div>

            {isTwoWheeler ? (
              /* Motorcycle 2 wheels */
              <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
                <div className="bg-white p-3 rounded-2xl border border-teal-200 text-center shadow-xs">
                  <span className="text-[11px] text-slate-500 font-medium block mb-1">
                    {lang === 'my' ? 'ရှေ့ဘီး (Front)' : 'Front Tire'}
                  </span>
                  <input
                    type="number"
                    min="10"
                    max="80"
                    value={frontPsi}
                    onChange={(e) => setFrontPsi(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-20 text-center py-1.5 text-lg font-bold font-mono text-teal-900 bg-teal-50/50 border border-teal-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 mx-auto"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">PSI</span>
                </div>

                <div className="bg-white p-3 rounded-2xl border border-teal-200 text-center shadow-xs">
                  <span className="text-[11px] text-slate-500 font-medium block mb-1">
                    {lang === 'my' ? 'နောက်ဘီး (Rear)' : 'Rear Tire'}
                  </span>
                  <input
                    type="number"
                    min="10"
                    max="80"
                    value={rearPsi}
                    onChange={(e) => setRearPsi(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-20 text-center py-1.5 text-lg font-bold font-mono text-teal-900 bg-teal-50/50 border border-teal-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 mx-auto"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">PSI</span>
                </div>
              </div>
            ) : (
              /* Car 4 wheels layout */
              <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
                <div className="bg-white p-2.5 rounded-2xl border border-teal-200 text-center shadow-xs">
                  <span className="text-[10px] text-slate-500 font-medium block mb-0.5">
                    {lang === 'my' ? 'ရှေ့ ဘယ် (FL)' : 'Front Left'}
                  </span>
                  <input
                    type="number"
                    min="10"
                    max="80"
                    value={frontLeftPsi}
                    onChange={(e) => setFrontLeftPsi(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-16 text-center py-1 text-base font-bold font-mono text-teal-900 bg-teal-50/50 border border-teal-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 mx-auto"
                  />
                  <span className="text-[9px] text-slate-400 block mt-0.5">PSI</span>
                </div>

                <div className="bg-white p-2.5 rounded-2xl border border-teal-200 text-center shadow-xs">
                  <span className="text-[10px] text-slate-500 font-medium block mb-0.5">
                    {lang === 'my' ? 'ရှေ့ ညာ (FR)' : 'Front Right'}
                  </span>
                  <input
                    type="number"
                    min="10"
                    max="80"
                    value={frontRightPsi}
                    onChange={(e) => setFrontRightPsi(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-16 text-center py-1 text-base font-bold font-mono text-teal-900 bg-teal-50/50 border border-teal-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 mx-auto"
                  />
                  <span className="text-[9px] text-slate-400 block mt-0.5">PSI</span>
                </div>

                <div className="bg-white p-2.5 rounded-2xl border border-teal-200 text-center shadow-xs">
                  <span className="text-[10px] text-slate-500 font-medium block mb-0.5">
                    {lang === 'my' ? 'နောက် ဘယ် (RL)' : 'Rear Left'}
                  </span>
                  <input
                    type="number"
                    min="10"
                    max="80"
                    value={rearLeftPsi}
                    onChange={(e) => setRearLeftPsi(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-16 text-center py-1 text-base font-bold font-mono text-teal-900 bg-teal-50/50 border border-teal-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 mx-auto"
                  />
                  <span className="text-[9px] text-slate-400 block mt-0.5">PSI</span>
                </div>

                <div className="bg-white p-2.5 rounded-2xl border border-teal-200 text-center shadow-xs">
                  <span className="text-[10px] text-slate-500 font-medium block mb-0.5">
                    {lang === 'my' ? 'နောက် ညာ (RR)' : 'Rear Right'}
                  </span>
                  <input
                    type="number"
                    min="10"
                    max="80"
                    value={rearRightPsi}
                    onChange={(e) => setRearRightPsi(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-16 text-center py-1 text-base font-bold font-mono text-teal-900 bg-teal-50/50 border border-teal-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 mx-auto"
                  />
                  <span className="text-[9px] text-slate-400 block mt-0.5">PSI</span>
                </div>
              </div>
            )}
          </div>

          {/* Condition & Place */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'my' ? 'တာယာ အခြေအနေ' : 'Tire Condition'}
              </label>
              <select
                value={tireCondition}
                onChange={(e) => setTireCondition(e.target.value as any)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
              >
                <option value="good">{lang === 'my' ? 'ကောင်းမွန်သည် (Good)' : 'Good Condition'}</option>
                <option value="fair">{lang === 'my' ? 'သင့်တင့်သည် (Fair)' : 'Fair Condition'}</option>
                <option value="needs_check">{lang === 'my' ? 'စစ်ဆေး/ဖာရန် လိုအပ်သည် (Check / Repair)' : 'Needs Inspection'}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'my' ? 'လေထိုးသည့် ဆိုင်/နေရာ' : 'Service Station / Shop'}
              </label>
              <input
                type="text"
                value={servicePlace}
                onChange={(e) => setServicePlace(e.target.value)}
                placeholder={lang === 'my' ? 'ဥပမာ - Denko / လမ်းဘေးလေထိုးကျင်း' : 'e.g. Denko Gas Station'}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Cost & Expense Sync (Optional) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {lang === 'my' ? 'ကုန်ကျငွေ (ရှိလျှင်)' : 'Cost (Optional MMK)'}
              </label>
              <input
                type="number"
                min="0"
                value={cost}
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : Number(e.target.value);
                  setCost(val);
                  if (val !== '' && val > 0) setSyncToExpense(true);
                }}
                placeholder="0"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
              />
            </div>

            {cost !== '' && Number(cost) > 0 && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'my' ? 'ပေးချေမည့် ပိုက်ဆံအိတ်' : 'Payment Wallet'}
                </label>
                <select
                  value={walletId}
                  onChange={(e) => setWalletId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {lang === 'my' ? w.name : w.nameEn || w.name} ({w.balance.toLocaleString()} MMK)
                    </option>
                  ))}
                </select>
              </div>
            )}
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
              placeholder={lang === 'my' ? 'ဥပမာ - နောက်ညာဘီး သံစူးဖာခဲ့သည်' : 'e.g. Repaired puncture'}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
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
                        ? 'ဤလေပေါင်မှတ်တမ်းကို ဖျက်ရန် သေချာပါသလား?'
                        : 'Are you sure you want to delete this tire pressure log?'
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
                className="px-5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-md shadow-teal-600/20 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{lang === 'my' ? 'မှတ်တမ်းသိမ်းမည်' : 'Save Log'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
