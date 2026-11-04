import React, { useState, useMemo } from 'react';
import { Car, Fuel, Wrench, Disc, Plus, Gauge, DollarSign, ShieldAlert, ShieldCheck, Edit, Trash2, Clock, Crown, HelpCircle, EyeOff, RotateCcw, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { Vehicle, FuelLog, VehicleMaintenance, TirePressureLog, Wallet, PlanType } from '../../types';
import { DEFAULT_PLAN_LIMITS } from '../../data/initialData';
import { formatLakhs, formatShortDate } from '../../utils/formatters';
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

// [v7.5.60 D-S11] Service types that do not apply to motorcycles.
const MOTORCYCLE_HIDDEN_TYPES = ['transmission_fluid', 'coolant', 'wheel_alignment'];

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
    // [v7.5.55 DECISION 1] Read the CURRENT plan's row from the limits
    // table — Guest and Free each enforce their OWN maxVehicles (both 1);
    // never hardcode another plan's number. Deactivated vehicles do not
    // consume a slot.
    const maxVehicles = DEFAULT_PLAN_LIMITS[plan ?? 'free']?.maxVehicles ?? 1;
    const activeCount = vehicles.filter((v) => v.isActive !== false).length;
    if (activeCount >= maxVehicles) {
      if (onOpenUpgradeModal) {
        onOpenUpgradeModal();
      } else {
        alert(
          lang === 'my'
            ? `Free Plan တွင် ယာဉ် ${maxVehicles} စီးသာ ထည့်သွင်းနိုင်ပါသည်။ ယာဉ် အကန့်အသတ်မဲ့ ထည့်သွင်းစီမံရန် VIP Premium သို့ အဆင့်မြှင့်တင်ပါ`
            : `Free plan allows ${maxVehicles} vehicle(s). Please upgrade to VIP Premium for unlimited vehicles.`
        );
      }
      return;
    }
    setEditingVehicle(null);
    setIsVehicleModalOpen(true);
  };

  // [v7.5.60 D-M1] Returns true only when the vehicle was actually
  // deleted (user confirmed the full-impact warning). Callers that
  // opened a modal (e.g. AddVehicleModal) close it only on true.
  const handleDeleteVehicleAndClean = (vehicleId: string): boolean => {
    // [v7.5.55 C6] Delete is allowed ONLY behind a full-impact
    // confirmation: counts of every log type + linked expense
    // transactions + the balance impact, with explicit confirmation.
    // The handler itself deletes the vehicle, all logs and linked
    // transactions (useVehicleHandlers.handleDeleteVehicle).
    const target = vehicles.find((v) => v.id === vehicleId);
    if (!target) return false;
    const fLogs = fuelLogs.filter((f) => f.vehicleId === vehicleId);
    const mLogs = vehicleMaintenance.filter((m) => m.vehicleId === vehicleId);
    const tLogs = tirePressureLogs.filter((t) => t.vehicleId === vehicleId);
    const linkedExpenseTotal =
      fLogs.filter((f) => f.syncToExpense !== false).reduce((s, f) => s + (Number(f.totalCost) || 0), 0) +
      mLogs.filter((m) => m.syncToExpense !== false).reduce((s, m) => s + (Number(m.cost) || 0), 0) +
      tLogs.filter((t) => t.syncToExpense !== false).reduce((s, t) => s + (Number(t.cost) || 0), 0);
    // [v7.5.60 D-S1] Linked expense shown in lakhs, exact kyat in brackets.
    const linkedExpenseText = `${formatLakhs(linkedExpenseTotal, lang)} (${linkedExpenseTotal.toLocaleString()} MMK)`;
    const impactMsg =
      lang === 'my'
        ? `"${target.name}" ကို အပြီးဖျက်မည် — ပြန်မရပါ။\n• ဆီမှတ်တမ်း: ${fLogs.length} ကြိမ်\n• ပြုပြင်မှတ်တမ်း: ${mLogs.length} ကြိမ်\n• တာယာမှတ်တမ်း: ${tLogs.length} ကြိမ်\n• ဆက်စပ်ထွက်ငွေစာရင်း: ${linkedExpenseText} ပါ ဖျက်မည် (ငွေစာရင်းစုစုပေါင်းမှ နုတ်မည်)\n\nသေချာပါသလား? ယာယီပိတ်ထားရုံ (Deactivate) ဆိုရင် မှတ်တမ်းများ အားလုံး ကျန်ရှိနေပါမည်။`
        : `Permanently delete "${target.name}"? This cannot be undone.\n• Fuel logs: ${fLogs.length}\n• Maintenance logs: ${mLogs.length}\n• Tire logs: ${tLogs.length}\n• Linked expenses: ${linkedExpenseText} will also be removed from totals\n\nAre you sure? Deactivating instead keeps all records.`;
    if (!confirm(impactMsg)) return false;
    onDeleteVehicle(vehicleId);
    const remaining = vehicles.filter((v) => v.id !== vehicleId && v.isActive !== false);
    if (remaining.length > 0) {
      setSelectedVehicleId(remaining[0].id);
    } else {
      setSelectedVehicleId('');
    }
    return true;
  };

  // [v7.5.55 C6] Deactivate is the PRIMARY removal path: the vehicle is
  // hidden from active lists/selectors, but all logs and money records
  // are KEPT and balances are unchanged.
  const handleDeactivateVehicle = (vehicle: Vehicle) => {
    if (
      !confirm(
        lang === 'my'
          ? `"${vehicle.name}" ကို ယာယီပိတ်ထားမည်။ မှတ်တမ်းများနှင့် ငွေစာရင်းများ အားလုံး ကျန်ရှိနေမည်ဖြစ်ပြီး နောက်မှ ပြန်ဖွင့်နိုင်ပါသည်။`
          : `Deactivate "${vehicle.name}"? All logs and money records are kept and it can be reactivated later.`
      )
    ) {
      return;
    }
    onSaveVehicle({ ...vehicle, isActive: false });
    const remaining = vehicles.filter((v) => v.id !== vehicle.id && v.isActive !== false);
    if (remaining.length > 0) {
      setSelectedVehicleId(remaining[0].id);
    } else {
      setSelectedVehicleId('');
    }
  };

  const handleReactivateVehicle = (vehicle: Vehicle) => {
    onSaveVehicle({ ...vehicle, isActive: true });
    setSelectedVehicleId(vehicle.id);
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
  const [showDeactivated, setShowDeactivated] = useState(false);

  // [v7.5.55 C6] Active vs deactivated split — deactivated vehicles are
  // hidden from every active list/selector but kept for reactivation.
  const activeVehicles = useMemo(() => vehicles.filter((v) => v.isActive !== false), [vehicles]);
  const deactivatedVehicles = useMemo(() => vehicles.filter((v) => v.isActive === false), [vehicles]);

  // Active Vehicle
  const currentVehicle = useMemo(() => {
    const found = activeVehicles.find((v) => v.id === selectedVehicleId);
    return found || activeVehicles[0] || null;
  }, [activeVehicles, selectedVehicleId]);

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
  // [v7.5.60 D-S7] The metric cards used to be all-time while the cost
  // summary below followed the selected range — two different "ဆီဖိုး"
  // totals on one screen. The metrics now follow the SAME range as the
  // cost summary (all-time when preset is 'all' or no custom dates).
  const toLocalDateStr = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const costRange = useMemo(() => {
    if (costRangePreset === 'all') return { start: '', end: '' };
    if (costRangePreset === 'custom') {
      return { start: costRangeCustomStart || '', end: costRangeCustomEnd || '' };
    }
    const now = new Date();
    const end = toLocalDateStr(now);
    const start = new Date(now);
    if (costRangePreset === '1m') start.setMonth(start.getMonth() - 1);
    else if (costRangePreset === '3m') start.setMonth(start.getMonth() - 3);
    else if (costRangePreset === '6m') start.setMonth(start.getMonth() - 6);
    else if (costRangePreset === '1y') start.setFullYear(start.getFullYear() - 1);
    return { start: toLocalDateStr(start), end };
  }, [costRangePreset, costRangeCustomStart, costRangeCustomEnd]);
  const isCustomRangeEmpty = costRangePreset === 'custom' && !costRange.start && !costRange.end;
  const rangedFuelLogs = useMemo(() => {
    if (isCustomRangeEmpty) return vehicleFuelLogs;
    return vehicleFuelLogs.filter(
      (l) => (!costRange.start || l.date >= costRange.start) && (!costRange.end || l.date <= costRange.end)
    );
  }, [vehicleFuelLogs, costRange, isCustomRangeEmpty]);
  const fuelStats = useMemo(() => calculateFuelStats(rangedFuelLogs), [rangedFuelLogs]);
  // [v7.5.60 D-S7] Caption so the reader always knows which range the
  // metric cards cover.
  const metricRangeCaption =
    costRangePreset === 'all' || isCustomRangeEmpty
      ? lang === 'my'
        ? 'ဆီစာရင်း — အချိန်အားလုံး'
        : 'Fuel figures — all time'
      : lang === 'my'
      ? `ဆီစာရင်း — ${formatShortDate(costRange.start)} → ${formatShortDate(costRange.end)}`
      : `Fuel figures — ${formatShortDate(costRange.start)} → ${formatShortDate(costRange.end)}`;
  const maintenanceLifespans = useMemo(
    () => calculateMaintenanceLifespans(vehicleMaintenanceLogs),
    [vehicleMaintenanceLogs]
  );
  const healthStatuses = useMemo(() => {
    if (!currentVehicle) return [];
    return calculateServiceHealthStatuses(currentVehicle, vehicleMaintenanceLogs);
  }, [currentVehicle, vehicleMaintenanceLogs]);

  // [v7.5.60 D-S11] Hide motorcycle-irrelevant types, show recorded /
  // due-soon / overdue cards first, and collapse the "မမှတ်ရသေး" rest
  // behind a toggle instead of 14 grey cards in a row.
  const [showAllHealth, setShowAllHealth] = useState(false);
  const visibleHealthStatuses = useMemo(
    () =>
      healthStatuses.filter(
        (h) => !(currentVehicle?.type === 'motorcycle' && MOTORCYCLE_HIDDEN_TYPES.includes(h.serviceType))
      ),
    [healthStatuses, currentVehicle]
  );
  const prominentHealthStatuses = useMemo(
    () => visibleHealthStatuses.filter((h) => h.status !== 'not_recorded'),
    [visibleHealthStatuses]
  );
  const unrecordedHealthStatuses = useMemo(
    () => visibleHealthStatuses.filter((h) => h.status === 'not_recorded'),
    [visibleHealthStatuses]
  );

  const latestTireLog = useMemo(() => {
    // [v7.5.55 C24] Date tiebreak by createdAt so same-day logs pick the
    // newest entry, not an arbitrary one.
    return [...vehicleTireLogs].sort(
      (a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0)
    )[0] || null;
  }, [vehicleTireLogs]);

  // Count overdue or due soon items
  const alertCount = useMemo(() => {
    return healthStatuses.filter((h) => h.status === 'overdue' || h.status === 'due_soon').length;
  }, [healthStatuses]);

  // [v7.5.55 C6] Collapsed deactivated-vehicles section with Reactivate.
  const deactivatedSection = deactivatedVehicles.length > 0 ? (
    <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
      <button
        type="button"
        onClick={() => setShowDeactivated((v) => !v)}
        className="w-full flex items-center justify-between text-xs font-bold text-slate-700 cursor-pointer"
      >
        <span>
          {lang === 'my'
            ? `⏸ ယာယီပိတ်ထားသော ယာဉ် (${deactivatedVehicles.length} စီး)`
            : `⏸ Deactivated vehicles (${deactivatedVehicles.length})`}
        </span>
        {showDeactivated ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {showDeactivated && (
        <div className="space-y-2 pt-1">
          {deactivatedVehicles.map((v) => (
            <div key={v.id} className="flex items-center justify-between gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
              <div className="min-w-0">
                <span className="font-bold text-sm text-slate-800 block truncate">{v.name}</span>
                <span className="text-[11px] text-slate-500">
                  {v.plateNumber ? `${v.plateNumber} · ` : ''}
                  {v.currentOdometer?.toLocaleString()} {v.odometerUnit || 'km'}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleReactivateVehicle(v)}
                  className="px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{lang === 'my' ? 'ပြန်ဖွင့်မည်' : 'Reactivate'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteVehicleAndClean(v.id)}
                  className="px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  {lang === 'my' ? 'ဖျက်မည်' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
          <p className="text-[11px] text-slate-400">
            {lang === 'my'
              ? 'ယာယီပိတ်ထားသော ယာဉ်၏ မှတ်တမ်းများနှင့် ငွေစာရင်းများ အားလုံး ကျန်ရှိနေပါသည်။'
              : 'Logs and money records of deactivated vehicles are kept.'}
          </p>
        </div>
      )}
    </div>
  ) : null;

  // Handle empty state
  if (activeVehicles.length === 0) {
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

        {/* [v7.5.55 C6] Deactivated vehicles (if any) with Reactivate */}
        {deactivatedSection}

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

  // [v7.5.55 DECISION 1] Current plan's vehicle limit from the limits table.
  const vehicleLimit = DEFAULT_PLAN_LIMITS[plan ?? 'free']?.maxVehicles ?? 1;

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
                {lang === 'my' ? `Free Tier: ယာဉ် ${vehicleLimit} စီးသာ ထည့်သွင်းစီမံနိုင်ပါသည်` : `Free Tier: ${vehicleLimit} Vehicle Included`}
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

      {/* Top Bar: Vehicle Selector & Quick Actions (compact 2-row) */}
      <div className="bg-white p-2.5 sm:p-3 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
        {/* Row 1: Vehicle + Edit/Delete + Info + Plan Badge */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-700 flex items-center justify-center text-amber-400 shadow-md shrink-0">
            <Car className="w-4 h-4" />
          </div>
          <select
            value={currentVehicle?.id}
            onChange={(e) => {
              if (e.target.value === '__add_new__') {
                handleOpenAddVehicle();
              } else {
                setSelectedVehicleId(e.target.value);
              }
            }}
            className="font-bold text-slate-900 text-sm bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-slate-900 cursor-pointer transition-colors max-w-[240px] truncate"
          >
            {activeVehicles.map((v) => (
              <option key={v.id} value={v.id}>
                🚗 {v.name} {v.plateNumber ? `(${v.plateNumber})` : ''}
              </option>
            ))}
            <option value="__add_new__" className="text-emerald-700 font-bold">
              ➕ {lang === 'my' ? 'ယာဉ်အသစ်...' : 'Add New...'}
            </option>
          </select>
          <button
            type="button"
            onClick={() => {
              setEditingVehicle(currentVehicle);
              setIsVehicleModalOpen(true);
            }}
            className="p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border border-slate-200/80 shrink-0"
            title={lang === 'my' ? 'ပြင်ဆင်ရန်' : 'Edit'}
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
          {/* [v7.5.55 C6] Deactivate is the primary removal path. */}
          {currentVehicle && (
            <button
              type="button"
              onClick={() => handleDeactivateVehicle(currentVehicle)}
              className="p-2.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer border border-slate-200/80 shrink-0"
              title={lang === 'my' ? 'ယာယီပိတ်ထားမည် (မှတ်တမ်းများ ကျန်မည်)' : 'Deactivate (logs are kept)'}
            >
              <EyeOff className="w-3.5 h-3.5" />
            </button>
          )}
          {/* [v7.5.55 C6] Sole-vehicle guard applies in EVERY path — the
              trash button is hidden unless 2+ ACTIVE vehicles exist. The
              full-impact confirmation lives in handleDeleteVehicleAndClean. */}
          {activeVehicles.length > 1 && currentVehicle && (
            <button
              type="button"
              onClick={() => handleDeleteVehicleAndClean(currentVehicle.id)}
              className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border border-slate-200/80 shrink-0"
              title={lang === 'my' ? 'ဖျက်ရန်' : 'Delete'}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="hidden sm:inline text-slate-200 mx-0.5">|</span>
          <div className="text-[11px] text-slate-500 flex items-center gap-1 flex-wrap">
            <span>{currentVehicle?.fuelType}</span>
            <span>·</span>
            <span className="font-mono text-slate-700">{currentVehicle?.currentOdometer?.toLocaleString()} {currentVehicle?.odometerUnit || 'km'}</span>
            {currentVehicle?.plateNumber && (
              <>
                <span>·</span>
                <span className="font-mono text-slate-600">{currentVehicle.plateNumber}</span>
              </>
            )}
          </div>
          {plan === 'premium' ? (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300 shrink-0">
              <Crown className="w-3 h-3 text-amber-600" />
              <span>{activeVehicles.length} · VIP</span>
            </span>
          ) : (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
              {activeVehicles.length}/{vehicleLimit}
            </span>
          )}
        </div>

        {/* Row 2: Actions + Fleet pills (combined) */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1.5 border-t border-slate-100">
          {/* [v7.5.60 D-S5] Quick actions ≥40px tall. [v7.5.60 D-N6] Action
              verbs, not bare nouns — "+ ဆီထည့်မည်" says what it does. */}
          <button
            onClick={() => { setEditingFuelLog(null); setIsFuelModalOpen(true); }}
            className="px-2.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold rounded-lg shadow-xs transition-all flex items-center gap-1 cursor-pointer active:scale-95"
          >
            <Fuel className="w-3 h-3" />
            <span>{lang === 'my' ? '+ ဆီထည့်မည်' : '+ Add Fuel'}</span>
          </button>
          <button
            onClick={() => { setEditingMaintenance(null); setIsMaintenanceModalOpen(true); }}
            className="px-2.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg shadow-xs transition-all flex items-center gap-1 cursor-pointer active:scale-95"
          >
            <Wrench className="w-3 h-3" />
            <span>{lang === 'my' ? '+ ဝန်ဆောင်မှု' : '+ Add Service'}</span>
          </button>
          <button
            onClick={() => { setEditingTireLog(null); setIsTireModalOpen(true); }}
            className="px-2.5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold rounded-lg shadow-xs transition-all flex items-center gap-1 cursor-pointer active:scale-95"
          >
            <Disc className="w-3 h-3" />
            <span>{lang === 'my' ? '+ လေချိန်မည်' : '+ Log Pressure'}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsFuelGuideOpen(true)}
            className="px-2.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg transition-all cursor-pointer active:scale-95 flex items-center gap-1 text-[11px] font-bold"
            title={lang === 'my' ? 'ဆီဖိုး ထည့်နည်း' : 'Fuel Guide'}
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>{lang === 'my' ? 'လမ်းညွှန်' : 'Guide'}</span>
          </button>

          <span className="text-slate-200 mx-0.5 shrink-0">|</span>

          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
            {lang === 'my' ? 'ယာဉ်စာရင်း:' : 'Fleet:'}
          </span>
          {activeVehicles.map((v) => {
            const isSelected = currentVehicle?.id === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedVehicleId(v.id)}
                className={'px-2 py-2 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer ' + (isSelected ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 border border-slate-200/80')}
              >
                <span>{v.name}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={handleOpenAddVehicle}
            className="px-2 py-2 rounded-lg text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition-all flex items-center gap-0.5 shrink-0 cursor-pointer active:scale-95"
            title={lang === 'my' ? 'ယာဉ်အသစ်' : 'Add Vehicle'}
          >
            <Plus className="w-3 h-3 text-amber-700 stroke-[3]" />
            <span>{lang === 'my' ? 'သစ်' : 'New'}</span>
          </button>
        </div>
      </div>

      {/* [v7.5.55 C6] Deactivated vehicles (if any) with Reactivate */}
      {deactivatedSection}

      {/* [v7.5.60 D-S7] Range caption — these figures follow the same
          range as the cost summary below, never silently all-time. */}
      <p className="flex items-center gap-1.5 text-[11px] text-slate-500 px-1 -mb-3">
        <Calendar className="w-3 h-3 text-slate-400" />
        <span>{metricRangeCaption}</span>
      </p>

      {/* [v7.3.0] Key metrics — ultra-compact single-row cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {/* Fuel Efficiency */}
        <div className="bg-white px-2.5 py-2 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Fuel className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">
              {lang === 'my' ? 'ဆီစားနှုန်း' : 'Efficiency'}
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-base font-black font-mono text-slate-900 leading-none">
                {fuelStats.avgEfficiency > 0 ? fuelStats.avgEfficiency : '--'}
              </span>
              <span className="text-[11px] font-bold text-amber-600">km/L</span>
            </div>
          </div>
        </div>

        {/* Fuel Price */}
        <div className="bg-white px-2.5 py-2 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">
              {lang === 'my' ? 'ဆီဈေး' : 'Fuel Price'}
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-base font-black font-mono text-slate-900 leading-none">
                {fuelStats.latestPricePerLiter > 0 ? fuelStats.latestPricePerLiter.toLocaleString() : '--'}
              </span>
              <span className="text-[11px] font-bold text-orange-600">Ks/L</span>
            </div>
          </div>
        </div>

        {/* Total Fuel Spent */}
        <div className="bg-white px-2.5 py-2 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Gauge className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">
              {lang === 'my' ? 'ဆီဖိုး' : 'Fuel Cost'}
            </div>
            <div className="flex items-baseline gap-0.5">
              {/* [v7.5.60 D-S1] Lakh display, exact kyat in tooltip.
                  [v7.5.60 D-N12] No logs yet → "--", not a misleading 0. */}
              <span
                className="text-base font-black font-mono text-emerald-800 leading-none truncate"
                title={rangedFuelLogs.length > 0 ? `${fuelStats.totalSpent.toLocaleString()} MMK` : undefined}
              >
                {rangedFuelLogs.length === 0 ? '--' : formatLakhs(fuelStats.totalSpent, lang)}
              </span>
            </div>
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-white px-2.5 py-2 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-2 min-w-0">
          <div className={'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ' + (alertCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600')}>
            {alertCount > 0 ? <ShieldAlert className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">
              {lang === 'my' ? 'သတိပေးချက်' : 'Alerts'}
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className={'text-base font-black font-mono leading-none ' + (alertCount > 0 ? 'text-rose-600' : 'text-slate-900')}>
                {alertCount}
              </span>
              <span className="text-[11px] font-bold text-slate-500">{lang === 'my' ? 'ခု' : 'items'}</span>
            </div>
          </div>
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
              <div className="min-w-0">
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
                className="px-3.5 py-2.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-all cursor-pointer shrink-0"
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
                      <div className="min-w-0">
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
                            <span className="text-[11px] text-slate-500 break-words">📍 {log.gasStation}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                          {/* [v7.5.60 D-S2] DD/MM/YYYY, not ISO. */}
                          <span>{formatShortDate(log.date)}</span>
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
                          <p className="text-[11px] text-slate-500 mt-1 italic break-words">"{log.note}"</p>
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
                          <span className="text-[11px] text-emerald-600 font-medium block">
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
                        {/* [v7.5.60 D-S1] Lakh display, exact kyat in tooltip. */}
                        <span
                          className="font-mono font-bold text-base text-slate-900 block"
                          title={`${log.totalCost.toLocaleString()} MMK`}
                        >
                          {formatLakhs(Number(log.totalCost) || 0, lang)}
                        </span>
                        {log.syncToExpense && (
                          <span className="text-[11px] text-emerald-600 font-medium block">
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
                          className="p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
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
                          className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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

            {/* [v7.5.60 D-S11] Recorded / due cards first; "မမှတ်ရသေး" rest
                collapsed behind a toggle (or shown directly when nothing
                is recorded yet, so a new vehicle is not a blank card). */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {(showAllHealth || prominentHealthStatuses.length === 0
                ? visibleHealthStatuses
                : prominentHealthStatuses
              ).map((item) => {
                const isOverdue = item.status === 'overdue';
                const isDueSoon = item.status === 'due_soon';
                const isNotRecorded = item.status === 'not_recorded';
                // [v7.5.60 D-S3] Which limit is actually deciding the
                // status — days or km (whichever ratio is smaller).
                const kmRatio =
                  item.expectedLifespanKm > 0
                    ? item.remainingKm / item.expectedLifespanKm
                    : Number.POSITIVE_INFINITY;
                const daysRatio =
                  item.expectedLifespanDays > 0
                    ? item.remainingDays / item.expectedLifespanDays
                    : Number.POSITIVE_INFINITY;
                const daysLimiting = daysRatio <= kmRatio;
                const kmPart =
                  item.remainingKm > 0
                    ? `${item.remainingKm.toLocaleString()} km`
                    : `${Math.abs(item.remainingKm).toLocaleString()} km ${lang === 'my' ? 'ကျော်' : 'overdue'}`;
                const daysPart =
                  item.remainingDays > 0
                    ? `${item.remainingDays} ${lang === 'my' ? 'ရက်' : 'days'}`
                    : `${Math.abs(item.remainingDays)} ${lang === 'my' ? 'ရက် ကျော်' : 'days overdue'}`;
                // Limiting value first, the other alongside it — the
                // displayed "ကျန်ရှိ" can never contradict the status pill.
                const remainingText =
                  item.serviceType === 'license_renewal' ? daysPart : daysLimiting ? `${daysPart} · ${kmPart}` : `${kmPart} · ${daysPart}`;

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
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-slate-800 block">
                          {lang === 'my' ? item.labelMy : item.labelEn}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {item.lastServiceDate
                            ? `${formatShortDate(item.lastServiceDate)} (${item.lastServiceOdometer?.toLocaleString()} km)`
                            : lang === 'my'
                            ? 'မှတ်တမ်း မရှိသေးပါ'
                            : 'No service recorded'}
                        </span>
                      </div>

                      {/* Status Pill */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
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
                            isNotRecorded
                              ? 'bg-slate-300'
                              : isOverdue
                              ? 'bg-rose-500'
                              : isDueSoon
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          // [v7.5.55 C20] Not-recorded shows 0/neutral grey,
                          // never a full green bar.
                          style={{ width: `${isNotRecorded ? 0 : Math.max(5, item.healthPercent)}%` }}
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
                            isNotRecorded
                              ? 'text-slate-500'
                              : isOverdue
                              ? 'text-rose-700'
                              : isDueSoon
                              ? 'text-amber-700'
                              : 'text-slate-700'
                          }`}
                        >
                          {/* [v7.5.55 C20] Not-recorded shows မမှတ်ရသေး, never
                              a remaining-lifespan figure that looks healthy.
                              [v7.5.60 D-S3] Show the limiting value first. */}
                          {isNotRecorded ? (
                            lang === 'my' ? 'မမှတ်ရသေး' : 'Not recorded yet'
                          ) : (
                            remainingText
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* [v7.5.60 D-S11] Collapsed "မမှတ်ရသေး" remainder. */}
            {unrecordedHealthStatuses.length > 0 && prominentHealthStatuses.length > 0 && (
              <button
                type="button"
                onClick={() => setShowAllHealth((v) => !v)}
                className="w-full flex items-center justify-center gap-1 px-3 py-2.5 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-2xl transition-colors cursor-pointer"
              >
                {showAllHealth ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    <span>
                      {lang === 'my'
                        ? 'မမှတ်ရသေးသော အမျိုးအစားများ ဝှက်မည်'
                        : 'Hide unrecorded types'}
                    </span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    <span>
                      {lang === 'my'
                        ? `ကျန်အမျိုးအစားများ (${unrecordedHealthStatuses.length} ခု — မမှတ်ရသေး)`
                        : `More types (${unrecordedHealthStatuses.length} not recorded yet)`}
                    </span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Maintenance Logs List */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
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
                className="px-3.5 py-2.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all cursor-pointer shrink-0"
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
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-900 break-words">{log.title}</span>
                          {log.sparePartBrand && (
                            <span className="text-xs bg-slate-200/70 text-slate-700 px-2 py-0.5 rounded-lg font-medium">
                              {log.sparePartBrand}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                          {/* [v7.5.60 D-S2] DD/MM/YYYY, not ISO. */}
                          <span>{formatShortDate(log.date)}</span>
                          <span>•</span>
                          <span className="font-mono text-slate-700">
                            {log.odometer?.toLocaleString()} km
                          </span>
                          {log.workshopName && (
                            <>
                              <span>•</span>
                              <span className="break-words">🏢 {log.workshopName}</span>
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
                        {/* [v7.5.60 D-S1] Lakh display, exact kyat in tooltip. */}
                        <span
                          className="font-mono font-bold text-base text-slate-900 block"
                          title={`${log.cost.toLocaleString()} MMK`}
                        >
                          {formatLakhs(Number(log.cost) || 0, lang)}
                        </span>
                        <span className="text-[11px] text-slate-400">
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
                          className="p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
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
                          className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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
              <div className="min-w-0">
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
                className="px-3.5 py-2.5 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-all cursor-pointer shrink-0"
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
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-slate-800">
                            {/* [v7.5.60 D-S2] DD/MM/YYYY, not ISO. */}
                            {formatShortDate(log.date)}
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
                              {/* [v7.5.60 D-S4] Never show the raw code value
                                  (good / fair / needs_check) — translate it. */}
                              {log.tireCondition === 'good'
                                ? lang === 'my'
                                  ? 'ကောင်းမွန်သည်'
                                  : 'Good'
                                : log.tireCondition === 'fair'
                                ? lang === 'my'
                                  ? 'သင့်တင့်သည်'
                                  : 'Fair'
                                : lang === 'my'
                                ? 'စစ်ဆေးရန် လိုအပ်သည်'
                                : 'Needs Inspection'}
                            </span>
                          )}
                          {log.servicePlace && (
                            <span className="text-xs text-slate-500 break-words">📍 {log.servicePlace}</span>
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
                              {/* [v7.5.60 D-N2] PSI unit on every value, like the bike row. */}
                              <span>FL: {log.frontLeftPsi || '--'} PSI</span>
                              <span>FR: {log.frontRightPsi || '--'} PSI</span>
                              <span>RL: {log.rearLeftPsi || '--'} PSI</span>
                              <span>RR: {log.rearRightPsi || '--'} PSI</span>
                            </>
                          )}
                        </div>

                        {log.note && (
                          <p className="text-[11px] text-slate-500 mt-1 italic break-words">"{log.note}"</p>
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
                        className="p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
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
                        className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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
        // [v7.5.60 D-M1] The Edit modal's Delete button goes through the
        // SAME full-impact warning as the top bar / deactivated section —
        // never a direct delete. The modal closes only when the delete
        // actually happened (user confirmed).
        onDelete={(id) => {
          const deleted = handleDeleteVehicleAndClean(id);
          if (deleted) {
            setIsVehicleModalOpen(false);
            setEditingVehicle(null);
          }
        }}
        // [v7.5.55 C6] The Edit → modal delete path must obey the same
        // sole-vehicle guard as the top-bar trash button.
        canDeleteVehicle={activeVehicles.length > 1 || editingVehicle?.isActive === false}
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
        vehicles={activeVehicles}
        wallets={wallets}
        selectedVehicleId={currentVehicle?.id}
        lang={lang}
        fuelLogs={vehicleFuelLogs}
      />

      <AddMaintenanceModal
        isOpen={isMaintenanceModalOpen}
        onClose={() => setIsMaintenanceModalOpen(false)}
        onSave={onSaveMaintenance}
        onDelete={onDeleteMaintenance}
        editingMaintenance={editingMaintenance}
        vehicles={activeVehicles}
        wallets={wallets}
        selectedVehicleId={currentVehicle?.id}
        lang={lang}
        vehicleMaintenance={vehicleMaintenanceLogs}
      />

      <AddTirePressureModal
        isOpen={isTireModalOpen}
        onClose={() => setIsTireModalOpen(false)}
        onSave={onSaveTirePressure}
        onDelete={onDeleteTirePressure}
        editingLog={editingTireLog}
        vehicles={activeVehicles}
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
