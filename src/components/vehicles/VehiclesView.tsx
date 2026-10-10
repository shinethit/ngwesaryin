import React, { useState, useMemo } from 'react';
import {
  Car,
  Fuel,
  Wrench,
  Disc,
  Plus,
  Gauge,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Calendar,
  DollarSign,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  Edit,
  Trash2,
  Filter,
  ArrowUpRight,
  Clock,
  Sparkles,
  Zap,
  Crown,
  Lock,
  HelpCircle,
} from 'lucide-react';
import { Vehicle, FuelLog, VehicleMaintenance, TirePressureLog, Wallet, PlanType } from '../../types';
import {
  enrichFuelLogs,
  calculateFuelStats,
  calculateMaintenanceLifespans,
  calculateServiceHealthStatuses,
  formatDurationDays,
} from '../../utils/vehicleAnalytics';
import { AddVehicleModal } from './AddVehicleModal';
import { AddFuelModal } from './AddFuelModal';
import { AddMaintenanceModal } from './AddMaintenanceModal';
import { AddTirePressureModal } from './AddTirePressureModal';
import { FuelExpenseGuideModal } from './FuelExpenseGuideModal';
import { FuelPriceChart } from './FuelPriceChart';
import { TireVisualizer } from './TireVisualizer';
import { usePersistedState } from '../../hooks/usePersistedState';
import { VehicleCostSummaryCard } from './VehicleCostSummaryCard';

interface VehiclesViewProps {
  vehicles: Vehicle[];
  fuelLogs: FuelLog[];
  vehicleMaintenance: VehicleMaintenance[];
  tirePressureLogs: TirePressureLog[];
  wallets: Wallet[];
  onSaveVehicle: (vehicle: Partial<Vehicle>) => void;
  onDeleteVehicle: (id: string) => void;
  onSaveFuelLog: (log: Partial<FuelLog>) => void;
  onDeleteFuelLog: (id: string) => void;
  onSaveMaintenance: (m: Partial<VehicleMaintenance>) => void;
  onDeleteMaintenance: (id: string) => void;
  onSaveTirePressure: (t: Partial<TirePressureLog>) => void;
  onDeleteTirePressure: (id: string) => void;
  plan?: PlanType;
  onOpenUpgradeModal?: () => void;
  lang: 'my' | 'en';
}

type SubTab = 'fuel' | 'maintenance' | 'tires';

export const VehiclesView: React.FC<VehiclesViewProps> = ({
  vehicles,
  fuelLogs,
  vehicleMaintenance,
  tirePressureLogs,
  wallets,
  onSaveVehicle,
  onDeleteVehicle,
  onSaveFuelLog,
  onDeleteFuelLog,
  onSaveMaintenance,
  onDeleteMaintenance,
  onSaveTirePressure,
  onDeleteTirePressure,
  plan,
  onOpenUpgradeModal,
  lang,
}) => {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(() => vehicles[0]?.id || '');
  const [activeTab, setActiveTab] = useState<SubTab>('fuel');

  // [v6.1.6] Vehicle Cost Summary with Date Range
  const [costRangePreset, setCostRangePreset] = usePersistedState<'1m' | '3m' | '6m' | '1y' | 'all' | 'custom'>(
    'ngwe_veh_cost_range',
    'all'
  );
  const [costRangeCustomStart, setCostRangeCustomStart] = useState<string>('');
  const [costRangeCustomEnd, setCostRangeCustomEnd] = useState<string>('');

  const handleSaveVehicleAndSelect = (v: Partial<Vehicle>) => {
    onSaveVehicle(v);
    if (v.id) {
      setSelectedVehicleId(v.id);
    }
    setEditingVehicle(null);
    setIsVehicleModalOpen(false);
  };

  const handleOpenAddVehicle = () => {
    if (plan !== 'premium' && vehicles.length >= 1) {
      if (onOpenUpgradeModal) {
        onOpenUpgradeModal();
      } else {
        alert(
          lang === 'my'
            ? 'Free Plan တွင် ယာဉ် ၁ စီးသာ ထည့်သွင်းနိုင်ပါသည်။ ယာဉ် အကန့်အသတ်မဲ့ ထည့်သွင်းစီမံရန် VIP Premium သို့ အဆင့်မြှင့်တင်ပါ'
            : 'Free plan allows 1 vehicle. Please upgrade to VIP Premium for unlimited vehicles.'
        );
      }
      return;
    }
    setEditingVehicle(null);
    setIsVehicleModalOpen(true);
  };

  const handleDeleteVehicleAndClean = (vehicleId: string) => {
    onDeleteVehicle(vehicleId);
    const remaining = vehicles.filter((v) => v.id !== vehicleId);
    if (remaining.length > 0) {
      setSelectedVehicleId(remaining[0].id);
    } else {
      setSelectedVehicleId('');
    }
  };

  // Modals state
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const [isFuelModalOpen, setIsFuelModalOpen] = useState(false);
  const [editingFuelLog, setEditingFuelLog] = useState<FuelLog | null>(null);

  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<VehicleMaintenance | null>(null);

  const [isTireModalOpen, setIsTireModalOpen] = useState(false);
  const [editingTireLog, setEditingTireLog] = useState<TirePressureLog | null>(null);
  const [isFuelGuideOpen, setIsFuelGuideOpen] = useState(false);

  // Active Vehicle
  const currentVehicle = useMemo(() => {
    const found = vehicles.find((v) => v.id === selectedVehicleId);
    return found || vehicles[0] || null;
  }, [vehicles, selectedVehicleId]);

  // Filtered records for current vehicle
  const vehicleFuelLogs = useMemo(() => {
    if (!currentVehicle) return [];
    return fuelLogs.filter((f) => f.vehicleId === currentVehicle.id);
  }, [fuelLogs, currentVehicle]);

  const vehicleMaintenanceLogs = useMemo(() => {
    if (!currentVehicle) return [];
    return vehicleMaintenance.filter((m) => m.vehicleId === currentVehicle.id);
  }, [vehicleMaintenance, currentVehicle]);

  const vehicleTireLogs = useMemo(() => {
    if (!currentVehicle) return [];
    return tirePressureLogs.filter((t) => t.vehicleId === currentVehicle.id);
  }, [tirePressureLogs, currentVehicle]);

  // Analytics
  const enrichedFuel = useMemo(() => enrichFuelLogs(vehicleFuelLogs), [vehicleFuelLogs]);
  const fuelStats = useMemo(() => calculateFuelStats(vehicleFuelLogs), [vehicleFuelLogs]);
  const maintenanceLifespans = useMemo(
    () => calculateMaintenanceLifespans(vehicleMaintenanceLogs),
    [vehicleMaintenanceLogs]
  );
  const healthStatuses = useMemo(() => {
    if (!currentVehicle) return [];
    return calculateServiceHealthStatuses(currentVehicle, vehicleMaintenanceLogs);
  }, [currentVehicle, vehicleMaintenanceLogs]);

  const latestTireLog = useMemo(() => {
    return [...vehicleTireLogs].sort((a, b) => b.date.localeCompare(a.date))[0] || null;
  }, [vehicleTireLogs]);

  // Count overdue or due soon items
  const alertCount = useMemo(() => {
    return healthStatuses.filter((h) => h.status === 'overdue' || h.status === 'due_soon').length;
  }, [healthStatuses]);

  // Handle empty state
  if (vehicles.length === 0) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-8 text-white shadow-xl text-center space-y-5">
          <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center mx-auto backdrop-blur-md text-amber-300">
            <Car className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-xl font-bold">
              {lang === 'my' ? 'ယာဉ်စီမံခန့်ခွဲမှု (Vehicle Management)' : 'Vehicle & Fleet Management'}
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              {lang === 'my'
                ? 'ဆီထည့်စာရင်း၊ ဆီစားနှုန်း (km/L)၊ ဆီဈေးနှုန်း အတက်အကျ၊ အပိုပစ္စည်းလဲလှယ်မှု သက်တမ်းနှင့် တာယာလေပေါင်ချိန်များကို တစ်နေရာတည်းတွင် အသေးစိတ် မှတ်တမ်းတင် တွက်ချက်နိုင်ပါပြီ။'
                : 'Track fuel mileage, fuel price trends, spare part lifespans, and tire pressure effortlessly.'}
            </p>
          </div>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => {
                setEditingVehicle(null);
                setIsVehicleModalOpen(true);
              }}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-2xl shadow-lg shadow-emerald-500/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'my' ? 'ပထမဆုံး ယာဉ်/ကား ထည့်မည်' : 'Add First Vehicle'}</span>
            </button>
          </div>
        </div>

        {/* Quick Features Preview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Fuel className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">
              {lang === 'my' ? 'ဆီစားနှုန်းနှင့် ဆီဈေး' : 'Mileage & Fuel Trends'}
            </h3>
            <p className="text-xs text-slate-500">
              {lang === 'my'
                ? 'ဆီထည့်တိုင်း ၁ ကီလိုမီတာ ကုန်ကျငွေနှင့် ၁ လီတာ ဆီဈေးနှုန်း အတက်အကျ ဂရပ်များကို တွက်ချက်ပြသပေးသည်။'
                : 'Instant km/L calculations and visual price per liter fluctuation charts.'}
            </p>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Wrench className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">
              {lang === 'my' ? 'အပိုပစ္စည်း သက်တမ်းစောင့်ကြည့်ခြင်း' : 'Part Lifespan Alerts'}
            </h3>
            <p className="text-xs text-slate-500">
              {lang === 'my'
                ? 'အင်ဂျင်ဝိုင်၊ ဝိုင်စစ်၊ ဘရိတ်ရှူး၊ ဘက်ထရီ စသည်တို့ မည်မျှကြာကြာ သုံးစွဲခဲ့ပြီး နောက်တစ်ကြိမ် လဲရမည့်အချိန်ကို သတိပေးသည်။'
                : 'Tracks km and days used per spare part, sending proactive due reminders.'}
            </p>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Disc className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">
              {lang === 'my' ? 'တာယာနှင့် လေပေါင်ချိန်' : 'Tire Pressure & Safety'}
            </h3>
            <p className="text-xs text-slate-500">
              {lang === 'my'
                ? 'ကား ၄ ဘီး / ဆိုင်ကယ် ၂ ဘီး လေပေါင်ချိန် အခြေအနေနှင့် ရက်သတ္တပတ်အလိုက် စစ်ဆေးရန် သတိပေးချက်။'
                : 'Monitor individual tire PSI readings and regular maintenance checks.'}
            </p>
          </div>
        </div>

        {/* Modal for adding first vehicle */}
        <AddVehicleModal
          isOpen={isVehicleModalOpen}
          onClose={() => {
            setIsVehicleModalOpen(false);
            setEditingVehicle(null);
          }}
          onSave={handleSaveVehicleAndSelect}
          editingVehicle={editingVehicle}
          wallets={wallets}
          lang={lang}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Free Tier Notice Banner if not Premium */}
      {plan !== 'premium' && (
        <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-200/90 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-2.5 text-amber-950 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
              <Crown className="w-4 h-4 text-amber-600" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-amber-900">
                {lang === 'my' ? 'Free Tier: ယာဉ် ၁ စီးသာ ထည့်သွင်းစီမံနိုင်ပါသည်' : 'Free Tier: 1 Vehicle Included'}
              </div>
              <div className="text-[11px] text-amber-800/80 truncate">
                {lang === 'my'
                  ? 'ယာဉ်များစွာ အကန့်အသတ်မဲ့ ထည့်သွင်းမှတ်တမ်းတင်ရန် VIP Premium သို့ အဆင့်မြှင့်ပါ'
                  : 'Upgrade to VIP Premium for unlimited fleet tracking & zero restrictions'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenUpgradeModal?.()}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
          >
            <Crown className="w-3.5 h-3.5 text-slate-950" />
            <span>{lang === 'my' ? '👑 Premium သို့ မြှင့်မည်' : '👑 Upgrade to VIP'}</span>
          </button>
        </div>
      )}

      {/* Top Bar: Vehicle Selector & Quick Actions */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left: Vehicle Selector & Info */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-700 flex items-center justify-center text-amber-400 shadow-md shrink-0">
              <Car className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Vehicle Dropdown */}
                <select
                  value={currentVehicle?.id}
                  onChange={(e) => {
                    if (e.target.value === '__add_new__') {
                      handleOpenAddVehicle();
                    } else {
                      setSelectedVehicleId(e.target.value);
                    }
                  }}
                  className="font-bold text-slate-900 text-sm sm:text-base bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-slate-900 cursor-pointer transition-colors max-w-[190px] sm:max-w-xs truncate"
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      🚗 {v.name} {v.plateNumber ? `(${v.plateNumber})` : ''}
                    </option>
                  ))}
                  <option value="__add_new__" className="text-emerald-700 font-bold">
                    ➕ {lang === 'my' ? '+ ယာဉ်အသစ် ထပ်တိုးရန်...' : '+ Add New Vehicle...'}
                  </option>
                </select>

                {/* Edit Button */}
                <button
                  type="button"
                  onClick={() => {
                    setEditingVehicle(currentVehicle);
                    setIsVehicleModalOpen(true);
                  }}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border border-slate-200/80"
                  title={lang === 'my' ? 'ယာဉ်အချက်အလက် ပြင်ဆင်ရန်' : 'Edit Vehicle'}
                >
                  <Edit className="w-4 h-4" />
                </button>

                {/* Delete Button (if > 1 vehicle) */}
                {vehicles.length > 1 && currentVehicle && (
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        confirm(
                          lang === 'my'
                            ? `ယာဉ် "${currentVehicle.name}" ကို ဖျက်ရန် သေချာပါသလား?`
                            : `Are you sure you want to delete "${currentVehicle.name}"?`
                        )
                      ) {
                        handleDeleteVehicleAndClean(currentVehicle.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border border-slate-200/80"
                    title={lang === 'my' ? 'ယာဉ်ကို ဖျက်ရန်' : 'Delete Vehicle'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                {/* Plan Badge */}
                {plan === 'premium' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
                    <Crown className="w-3.5 h-3.5 text-amber-600" />
                    <span>{lang === 'my' ? `VIP: ယာဉ် (${vehicles.length}) စီး • Unlimited` : `VIP: ${vehicles.length} Vehicles • Unlimited`}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    <span>{lang === 'my' ? `ယာဉ် (${vehicles.length}/1) စီး (Free)` : `${vehicles.length}/1 Vehicle (Free)`}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                <span>{currentVehicle?.fuelType}</span>
                <span>•</span>
                <span className="font-mono font-medium text-slate-700">
                  {currentVehicle?.currentOdometer?.toLocaleString()} {currentVehicle?.odometerUnit || 'km'}
                </span>
                {currentVehicle?.plateNumber && (
                  <>
                    <span>•</span>
                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-mono text-slate-600">
                      {currentVehicle.plateNumber}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: Quick Action Buttons & Prominent Add Vehicle */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Prominent Add Vehicle Button */}
            <button
              type="button"
              id="btn-add-vehicle-header"
              onClick={handleOpenAddVehicle}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              title={lang === 'my' ? 'ယာဉ်အသစ် ထပ်တိုးရန်' : 'Add New Vehicle'}
            >
              <Plus className="w-3.5 h-3.5 text-amber-400 stroke-[3]" />
              <span>{lang === 'my' ? '+ ယာဉ်အသစ်' : '+ Add Vehicle'}</span>
            </button>

            <button
              onClick={() => {
                setEditingFuelLog(null);
                setIsFuelModalOpen(true);
              }}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Fuel className="w-3.5 h-3.5" />
              <span>{lang === 'my' ? '+ ဆီထည့်စာရင်း' : '+ Add Fuel'}</span>
            </button>

            <button
              onClick={() => {
                setEditingMaintenance(null);
                setIsMaintenanceModalOpen(true);
              }}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>{lang === 'my' ? '+ အပိုပစ္စည်းလဲ/ပြုပြင်' : '+ Service'}</span>
            </button>

            <button
              onClick={() => {
                setEditingTireLog(null);
                setIsTireModalOpen(true);
              }}
              className="px-3 py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-semibold rounded-xl border border-teal-200 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Disc className="w-3.5 h-3.5" />
              <span>{lang === 'my' ? 'လေပေါင်ချိန်' : 'Tire Check'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFuelGuideOpen(true)}
              className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
              title={lang === 'my' ? 'ဆီဖိုး ဘယ်လို ထည့်ရမလဲ လမ်းညွှန်' : 'How to log fuel'}
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>{lang === 'my' ? '❓ ဆီဖိုး ထည့်နည်း' : '❓ Fuel Guide'}</span>
            </button>
          </div>
        </div>

        {/* Sync Reassurance Strip */}
        <div className="px-4 py-2 bg-gradient-to-r from-emerald-50 via-teal-50/50 to-white border-t border-emerald-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-emerald-950">
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-600 font-bold shrink-0">✓</span>
            <span className="leading-relaxed">
              {lang === 'my'
                ? '💡 ဆီဖိုးနှင့် ကားစရိတ်များသည် ပင်မထွက်ငွေစာရင်း (နဂိုနေရာ) နှင့် တပြိုင်နက် ချိတ်ဆက်ထားသဖြင့် နဂိုနေရာတွင် ၂ ခါ ထပ်ထည့်ရန် လုံးဝမလိုပါ။'
                : 'Fuel & vehicle costs logged here automatically sync into your main expense records. No need to enter twice.'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsFuelGuideOpen(true)}
            className="text-emerald-700 hover:text-emerald-900 font-bold underline cursor-pointer shrink-0"
          >
            {lang === 'my' ? 'ရှင်းလင်းချက်ဖတ်ရန် ›' : 'Read Guide ›'}
          </button>
        </div>

        {/* Multi-Vehicle Quick Switcher Strip */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Car className="w-3.5 h-3.5 text-slate-400" />
            <span>{lang === 'my' ? 'ယာဉ်စာရင်း:' : 'Fleet:'}</span>
          </span>
          {vehicles.map((v) => {
            const isSelected = currentVehicle?.id === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedVehicleId(v.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-xs ring-2 ring-slate-900/20'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 border border-slate-200/80'
                }`}
              >
                <span>{v.name}</span>
                {v.plateNumber && (
                  <span className={`text-[10px] font-mono px-1 py-0.2 rounded ${
                    isSelected ? 'bg-slate-800 text-slate-300' : 'bg-slate-200/80 text-slate-600'
                  }`}>
                    {v.plateNumber}
                  </span>
                )}
              </button>
            );
          })}

          {/* Quick Add Pill in Strip */}
          <button
            type="button"
            onClick={handleOpenAddVehicle}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition-all flex items-center gap-1 shrink-0 cursor-pointer active:scale-95"
            title={lang === 'my' ? 'ယာဉ်အသစ် ထပ်တိုးရန်' : 'Add New Vehicle'}
          >
            <Plus className="w-3.5 h-3.5 text-amber-700 stroke-[3]" />
            <span>{lang === 'my' ? '+ ယာဉ်သစ်' : '+ New Vehicle'}</span>
          </button>
        </div>
      </div>

      {/* Top 4 Key Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 1: Fuel Efficiency */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              {lang === 'my' ? 'ပျမ်းမျှ ဆီစားနှုန်း' : 'Avg Fuel Efficiency'}
            </span>
            <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Fuel className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1 pt-1">
            <span className="text-2xl font-black font-mono text-slate-900">
              {fuelStats.avgEfficiency > 0 ? fuelStats.avgEfficiency : '--'}
            </span>
            <span className="text-xs font-bold text-amber-600">km/L</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {fuelStats.totalLiters > 0
              ? `${fuelStats.totalLiters.toFixed(1)} L ထည့်သွင်းခဲ့သည်`
              : lang === 'my'
              ? 'ဆီထည့်မှတ်တမ်း မရှိသေးပါ'
              : 'No fuel logs yet'}
          </p>
        </div>

        {/* Metric 2: Fuel Price */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              {lang === 'my' ? 'လက်ရှိ ၁ လီတာ ဆီဈေး' : 'Latest Fuel Price'}
            </span>
            <div className="w-7 h-7 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1 pt-1">
            <span className="text-2xl font-black font-mono text-slate-900">
              {fuelStats.latestPricePerLiter > 0
                ? fuelStats.latestPricePerLiter.toLocaleString()
                : '--'}
            </span>
            <span className="text-xs font-bold text-orange-600">Ks/L</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {fuelStats.priceChangeDiff !== 0 ? (
              <span
                className={`font-semibold ${
                  fuelStats.priceChangeDiff > 0 ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                {fuelStats.priceChangeDiff > 0 ? '+' : ''}
                {fuelStats.priceChangeDiff.toLocaleString()} Ks ({fuelStats.priceChangePercent}%)
              </span>
            ) : (
              <span>{lang === 'my' ? 'ယခင်နှင့် အတူတူဖြစ်သည်' : 'Unchanged'}</span>
            )}
          </p>
        </div>

        {/* Metric 3: Total Fuel Spent */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              {lang === 'my' ? 'ဆီဖိုး စုစုပေါင်း' : 'Total Fuel Cost'}
            </span>
            <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Gauge className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1 pt-1">
            <span className="text-xl sm:text-2xl font-black font-mono text-emerald-800">
              {fuelStats.totalSpent.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-emerald-600">Ks</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {lang === 'my' ? 'မှတ်တမ်းပေါင်း' : 'Logs'}: {vehicleFuelLogs.length} ကြိမ်
          </p>
        </div>

        {/* Metric 4: Health Alerts */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              {lang === 'my' ? 'အပိုပစ္စည်း စစ်ဆေးရန်' : 'Maintenance Status'}
            </span>
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                alertCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
              }`}
            >
              {alertCount > 0 ? (
                <ShieldAlert className="w-4 h-4" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
            </div>
          </div>
          <div className="flex items-baseline gap-1 pt-1">
            <span
              className={`text-2xl font-black font-mono ${
                alertCount > 0 ? 'text-rose-600' : 'text-slate-900'
              }`}
            >
              {alertCount}
            </span>
            <span className="text-xs font-bold text-slate-500">
              {lang === 'my' ? 'ခု သတိပေးချက်' : 'Alerts'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            {alertCount > 0
              ? lang === 'my'
                ? 'အင်ဂျင်ဝိုင် သို့မဟုတ် အပိုပစ္စည်း လဲရန်လိုပါသည်'
                : 'Services due / overdue'
              : lang === 'my'
              ? 'အားလုံး ကောင်းမွန်ပါသည်'
              : 'All systems healthy'}
          </p>
        </div>
      </div>

            {/* [v6.1.6] Vehicle Cost Summary with Date Range */}
      <VehicleCostSummaryCard
        fuelLogs={vehicleFuelLogs}
        maintenanceLogs={vehicleMaintenanceLogs}
        tireLogs={vehicleTireLogs}
        lang={lang}
        preset={costRangePreset}
        onPresetChange={setCostRangePreset}
        customStart={costRangeCustomStart}
        customEnd={costRangeCustomEnd}
        onCustomStartChange={setCostRangeCustomStart}
        onCustomEndChange={setCostRangeCustomEnd}
      />

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl w-full sm:w-fit">
        <button
          onClick={() => setActiveTab('fuel')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'fuel'
              ? 'bg-white text-amber-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Fuel className="w-4 h-4 text-amber-500" />
          <span>{lang === 'my' ? 'ဆီစားနှုန်းနှင့် ဆီမှတ်တမ်း' : 'Fuel & Mileage'}</span>
          <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full font-mono">
            {vehicleFuelLogs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('maintenance')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'maintenance'
              ? 'bg-white text-blue-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Wrench className="w-4 h-4 text-blue-500" />
          <span>{lang === 'my' ? 'အပိုပစ္စည်း သက်တမ်းစောင့်ကြည့်မှု' : 'Parts & Maintenance'}</span>
          {alertCount > 0 && (
            <span className="text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded-full font-mono font-bold animate-pulse">
              {alertCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('tires')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'tires'
              ? 'bg-white text-teal-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Disc className="w-4 h-4 text-teal-500" />
          <span>{lang === 'my' ? 'တာယာနှင့် လေပေါင်' : 'Tires & Pressure'}</span>
        </button>
      </div>

      {/* TAB CONTENT 1: FUEL & MILEAGE */}
      {activeTab === 'fuel' && (
        <div className="space-y-6">
          {/* Fuel Price Trend Chart */}
          <FuelPriceChart logs={vehicleFuelLogs} lang={lang} />

          {/* Fuel Logs Table / Cards */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-800 text-sm">
                  {lang === 'my' ? 'ဆီထည့်စာရင်း မှတ်တမ်းများ' : 'Fuel Fill-up History'}
                </h4>
                <p className="text-xs text-slate-500">
                  {lang === 'my'
                    ? 'ဆီထည့်ခဲ့သည့် အကြိမ်တိုင်း၏ ဆီစားနှုန်းနှင့် ကုန်ကျစရိတ်များ'
                    : 'Detailed record of every fuel stop'}
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingFuelLog(null);
                  setIsFuelModalOpen(true);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-all cursor-pointer"
              >
                {lang === 'my' ? '+ ဆီထည့်စာရင်း အသစ်' : '+ Add Record'}
              </button>
            </div>

            {enrichedFuel.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl">
                <p className="text-xs text-slate-500">
                  {lang === 'my'
                    ? 'ဆီထည့်မှတ်တမ်းများ မရှိသေးပါ။ "+ ဆီထည့်စာရင်း" ခလုတ်ကို နှိပ်၍ စတင်မှတ်နိုင်ပါသည်။'
                    : 'No fuel records found. Click "+ Add Fuel" to record your first fill-up.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {enrichedFuel.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    {/* Left Details */}
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-100/70 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Fuel className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-sm text-slate-900">
                            {log.liters} L ({log.fuelType})
                          </span>
                          {log.isFullTank && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                              Full Tank
                            </span>
                          )}
                          {log.gasStation && (
                            <span className="text-[11px] text-slate-500">📍 {log.gasStation}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                          <span>{log.date}</span>
                          <span>•</span>
                          <span className="font-mono text-slate-700 font-medium">
                            {log.odometer?.toLocaleString()} {currentVehicle?.odometerUnit || 'km'}
                          </span>
                          <span>•</span>
                          <span className="font-mono text-slate-700 font-medium">
                            {Number(log.pricePerLiter).toLocaleString()} MMK / L
                          </span>
                        </div>

                        {log.note && (
                          <p className="text-[11px] text-slate-500 mt-1 italic">"{log.note}"</p>
                        )}
                      </div>
                    </div>

                    {/* Right: Calculated Mileage & Total Cost & Edit */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200/60">
                      {/* Efficiency Badge + Full/Partial Status [v6.1.4] */}
                      {log.calculatedEfficiency ? (
                        <div className="text-right">
                          <div className="flex items-baseline justify-end gap-1">
                            <span className="font-mono font-black text-emerald-700 text-base">
                              {log.calculatedEfficiency}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-600">km/L</span>
                          </div>
                          {log.calculatedCostPerDistance && (
                            <span className="text-[10px] text-slate-400 block">
                              {log.calculatedCostPerDistance} Ks / km
                            </span>
                          )}
                          <span className="text-[9px] text-emerald-600 font-medium block">
                            ✓ တိုင်ကီပြည့်
                          </span>
                        </div>
                      ) : log.isFirstFill ? (
                        <div className="text-right text-[10px] font-bold text-indigo-600">
                          🆕 ပထမဆုံး တိုင်ကီဖြည့်
                        </div>
                      ) : (
                        <div className="text-right text-[10px] text-slate-500 font-medium">
                          {log.isFullTank ? '✓ တိုင်ကီပြည့်' : '◐ တစိတ်တပိုင်းဖြည့်'}
                        </div>
                      )}

                      {/* Cost */}
                      <div className="text-right">
                        <span className="font-mono font-bold text-base text-slate-900 block">
                          {log.totalCost.toLocaleString()} Ks
                        </span>
                        {log.syncToExpense && (
                          <span className="text-[9px] text-emerald-600 font-medium block">
                            ✓ စာရင်းသွင်းပြီး
                          </span>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingFuelLog(log);
                            setIsFuelModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                lang === 'my'
                                  ? 'ဤဆီထည့်စာရင်းကို ဖျက်ရန် သေချာပါသလား?'
                                  : 'Are you sure you want to delete this log?'
                              )
                            ) {
                              onDeleteFuelLog(log.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: MAINTENANCE & SPARE PART LIFESPAN */}
      {activeTab === 'maintenance' && (
        <div className="space-y-6">
          {/* Health Overview Cards */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div>
              <h4 className="font-bold text-slate-800 text-sm">
                {lang === 'my'
                  ? 'အပိုပစ္စည်း သက်တမ်းနှင့် နောက်တစ်ကြိမ် လဲရမည့်အချိန်'
                  : 'Component Health & Due Reminders'}
              </h4>
              <p className="text-xs text-slate-500">
                {lang === 'my'
                  ? 'လက်ရှိ မောင်းနှင်ထားသော ကီလိုမီတာနှင့် ရက်စွဲပေါ်မူတည်၍ အလိုအလျောက် တွက်ချက်ထားသည်'
                  : 'Estimated lifespan remaining based on current odometer and last service date'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {healthStatuses.map((item) => {
                const isOverdue = item.status === 'overdue';
                const isDueSoon = item.status === 'due_soon';
                const isNotRecorded = item.status === 'not_recorded';

                return (
                  <div
                    key={item.serviceType}
                    className={`p-4 rounded-2xl border transition-all ${
                      isOverdue
                        ? 'border-rose-300 bg-rose-50/50'
                        : isDueSoon
                        ? 'border-amber-300 bg-amber-50/50'
                        : 'border-slate-200/80 bg-slate-50/40 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="font-bold text-xs text-slate-800 block">
                          {lang === 'my' ? item.labelMy : item.labelEn}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {item.lastServiceDate
                            ? `${item.lastServiceDate} (${item.lastServiceOdometer?.toLocaleString()} km)`
                            : lang === 'my'
                            ? 'မှတ်တမ်း မရှိသေးပါ'
                            : 'No service recorded'}
                        </span>
                      </div>

                      {/* Status Pill */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isOverdue
                            ? 'bg-rose-100 text-rose-800'
                            : isDueSoon
                            ? 'bg-amber-100 text-amber-800'
                            : isNotRecorded
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isOverdue
                          ? lang === 'my'
                            ? 'လဲရန်ကျော်လွန်'
                            : 'Overdue'
                          : isDueSoon
                          ? lang === 'my'
                            ? 'မကြာမီလဲရမည်'
                            : 'Due Soon'
                          : isNotRecorded
                          ? lang === 'my'
                            ? 'မမှတ်ရသေး'
                            : 'Not Recorded'
                          : lang === 'my'
                          ? 'ကောင်းမွန်'
                          : 'Good'}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5 pt-1">
                      <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isOverdue
                              ? 'bg-rose-500'
                              : isDueSoon
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.max(5, item.healthPercent)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">
                          {isOverdue
                            ? lang === 'my'
                              ? 'ကျော်လွန်:'
                              : 'Overdue by:'
                            : lang === 'my'
                            ? 'ကျန်ရှိ:'
                            : 'Remaining:'}
                        </span>
                        <span
                          className={`font-mono font-bold ${
                            isOverdue
                              ? 'text-rose-700'
                              : isDueSoon
                              ? 'text-amber-700'
                              : 'text-slate-700'
                          }`}
                        >
                          {item.remainingKm > 0
                            ? `${item.remainingKm.toLocaleString()} km`
                            : `${Math.abs(item.remainingKm).toLocaleString()} km ကျော်`}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Maintenance Logs List */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-800 text-sm">
                  {lang === 'my'
                    ? 'အပိုပစ္စည်းလဲလှယ်မှုနှင့် ပြုပြင်မှတ်တမ်းများ'
                    : 'Replacement & Maintenance Logs'}
                </h4>
                <p className="text-xs text-slate-500">
                  {lang === 'my'
                    ? 'အပိုပစ္စည်းတစ်ခုစီ၏ သုံးစွဲခဲ့ရသော မိုင်/ကီလိုနှင့် ရက်ပေါင်း'
                    : 'History of previous repairs and part durations'}
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingMaintenance(null);
                  setIsMaintenanceModalOpen(true);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all cursor-pointer"
              >
                {lang === 'my' ? '+ အပိုပစ္စည်းလဲလှယ်မှု အသစ်' : '+ Add Service Log'}
              </button>
            </div>

            {maintenanceLifespans.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl">
                <p className="text-xs text-slate-500">
                  {lang === 'my'
                    ? 'ပြုပြင်/အပိုပစ္စည်းလဲလှယ်မှု မှတ်တမ်းများ မရှိသေးပါ။'
                    : 'No maintenance records found.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {maintenanceLifespans.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-100/70 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Wrench className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-900">{log.title}</span>
                          {log.sparePartBrand && (
                            <span className="text-xs bg-slate-200/70 text-slate-700 px-2 py-0.5 rounded-lg font-medium">
                              {log.sparePartBrand}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                          <span>{log.date}</span>
                          <span>•</span>
                          <span className="font-mono text-slate-700">
                            {log.odometer?.toLocaleString()} km
                          </span>
                          {log.workshopName && (
                            <>
                              <span>•</span>
                              <span>🏢 {log.workshopName}</span>
                            </>
                          )}
                        </div>

                        {/* Lifespan Stats Tag (Duration and km used) */}
                        {(log.kmUsed || log.daysUsed) && (
                          <div className="mt-2 inline-flex items-center gap-2 bg-indigo-50/90 text-indigo-900 border border-indigo-200/70 px-2.5 py-1 rounded-xl text-xs">
                            <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span>
                              {lang === 'my' ? 'အသုံးပြုခဲ့ရသည့် သက်တမ်း:' : 'Duration used:'}{' '}
                              <strong>{log.kmUsed ? `${log.kmUsed.toLocaleString()} km` : ''}</strong>
                              {log.kmUsed && log.daysUsed ? ' / ' : ''}
                              <strong>
                                {log.daysUsed ? formatDurationDays(log.daysUsed, lang) : ''}
                              </strong>
                              {log.costPerKm ? ` (${log.costPerKm} Ks/km)` : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Cost & Edit */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200/60">
                      <div className="text-right">
                        <span className="font-mono font-bold text-base text-slate-900 block">
                          {log.cost.toLocaleString()} Ks
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {lang === 'my' ? 'ကုန်ကျငွေ' : 'Total Cost'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            const original = vehicleMaintenanceLogs.find((m) => m.id === log.id);
                            if (original) {
                              setEditingMaintenance(original);
                              setIsMaintenanceModalOpen(true);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                lang === 'my'
                                  ? 'ဤမှတ်တမ်းကို ဖျက်ရန် သေချာပါသလား?'
                                  : 'Are you sure you want to delete this record?'
                              )
                            ) {
                              onDeleteMaintenance(log.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: TIRES & PRESSURE */}
      {activeTab === 'tires' && (
        <div className="space-y-6">
          {/* Tire Visualizer */}
          <TireVisualizer
            vehicle={currentVehicle}
            latestLog={latestTireLog}
            onOpenAddModal={() => {
              setEditingTireLog(null);
              setIsTireModalOpen(true);
            }}
            lang={lang}
          />

          {/* Tire Logs History */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-800 text-sm">
                  {lang === 'my' ? 'တာယာ လေပေါင်စစ်ဆေးမှု မှတ်တမ်းများ' : 'Tire Check History'}
                </h4>
                <p className="text-xs text-slate-500">
                  {lang === 'my'
                    ? 'ယခင် စစ်ဆေးခဲ့သော ရက်စွဲနှင့် PSI မှတ်တမ်းများ'
                    : 'Historical pressure readings'}
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingTireLog(null);
                  setIsTireModalOpen(true);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-all cursor-pointer"
              >
                {lang === 'my' ? '+ မှတ်တမ်းအသစ်' : '+ Log Pressure'}
              </button>
            </div>

            {vehicleTireLogs.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl">
                <p className="text-xs text-slate-500">
                  {lang === 'my'
                    ? 'တာယာ လေပေါင်ချိန် မှတ်တမ်းများ မရှိသေးပါ။'
                    : 'No tire pressure logs yet.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {vehicleTireLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-teal-100/70 text-teal-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Disc className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-slate-800">
                            {log.date}
                          </span>
                          {log.tireCondition && (
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                log.tireCondition === 'good'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : log.tireCondition === 'fair'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {log.tireCondition}
                            </span>
                          )}
                          {log.servicePlace && (
                            <span className="text-xs text-slate-500">📍 {log.servicePlace}</span>
                          )}
                        </div>

                        {/* Pressure numbers */}
                        <div className="flex items-center gap-3 text-xs font-mono font-bold text-teal-900 mt-1.5 flex-wrap">
                          {currentVehicle.type === 'motorcycle' ? (
                            <>
                              <span>Front: {log.frontPsi || '--'} PSI</span>
                              <span>Rear: {log.rearPsi || '--'} PSI</span>
                            </>
                          ) : (
                            <>
                              <span>FL: {log.frontLeftPsi || '--'}</span>
                              <span>FR: {log.frontRightPsi || '--'}</span>
                              <span>RL: {log.rearLeftPsi || '--'}</span>
                              <span>RR: {log.rearRightPsi || '--'} PSI</span>
                            </>
                          )}
                        </div>

                        {log.note && (
                          <p className="text-[11px] text-slate-500 mt-1 italic">"{log.note}"</p>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 self-end sm:self-center">
                      <button
                        onClick={() => {
                          setEditingTireLog(log);
                          setIsTireModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              lang === 'my'
                                ? 'ဤလေပေါင်မှတ်တမ်းကို ဖျက်ရန် သေချာပါသလား?'
                                : 'Are you sure you want to delete this log?'
                            )
                          ) {
                            onDeleteTirePressure(log.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODALS */}
      <AddVehicleModal
        isOpen={isVehicleModalOpen}
        onClose={() => {
          setIsVehicleModalOpen(false);
          setEditingVehicle(null);
        }}
        onSave={handleSaveVehicleAndSelect}
        onDelete={onDeleteVehicle}
        editingVehicle={editingVehicle}
        wallets={wallets}
        lang={lang}
      />

      <AddFuelModal
        isOpen={isFuelModalOpen}
        onClose={() => setIsFuelModalOpen(false)}
        onSave={onSaveFuelLog}
        onDelete={onDeleteFuelLog}
        editingLog={editingFuelLog}
        vehicles={vehicles}
        wallets={wallets}
        selectedVehicleId={currentVehicle?.id}
        lang={lang}
      />

      <AddMaintenanceModal
        isOpen={isMaintenanceModalOpen}
        onClose={() => setIsMaintenanceModalOpen(false)}
        onSave={onSaveMaintenance}
        onDelete={onDeleteMaintenance}
        editingMaintenance={editingMaintenance}
        vehicles={vehicles}
        wallets={wallets}
        selectedVehicleId={currentVehicle?.id}
        lang={lang}
      />

      <AddTirePressureModal
        isOpen={isTireModalOpen}
        onClose={() => setIsTireModalOpen(false)}
        onSave={onSaveTirePressure}
        onDelete={onDeleteTirePressure}
        editingLog={editingTireLog}
        vehicles={vehicles}
        wallets={wallets}
        selectedVehicleId={currentVehicle?.id}
        lang={lang}
      />

      <FuelExpenseGuideModal
        isOpen={isFuelGuideOpen}
        onClose={() => setIsFuelGuideOpen(false)}
        lang={lang}
      />
    </div>
  );
};
