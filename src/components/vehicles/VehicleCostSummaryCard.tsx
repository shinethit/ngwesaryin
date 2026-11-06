import React, { useMemo } from 'react';
import { Fuel, Wrench, Disc, Calendar, TrendingUp, Gauge } from 'lucide-react';
import { FuelLog, VehicleMaintenance, TirePressureLog } from '../../types';
import { calculateCostPerKm } from '../../utils/vehicleAnalytics';
import { formatLakhs, formatShortDate } from '../../utils/formatters';

type RangePreset = '1m' | '3m' | '6m' | '1y' | 'all' | 'custom';

interface VehicleCostSummaryCardProps {
  fuelLogs: FuelLog[];
  maintenanceLogs: VehicleMaintenance[];
  tireLogs: TirePressureLog[];
  lang: 'my' | 'en';
  preset: RangePreset;
  onPresetChange: (p: RangePreset) => void;
  customStart: string;
  customEnd: string;
  onCustomStartChange: (s: string) => void;
  onCustomEndChange: (s: string) => void;
}

const getLocalDateString = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getRangeForPreset = (preset: RangePreset): { start: string; end: string } => {
  if (preset === 'all') return { start: '', end: '' };
  const now = new Date();
  const end = getLocalDateString(now);
  const start = new Date(now);
  if (preset === '1m') start.setMonth(start.getMonth() - 1);
  else if (preset === '3m') start.setMonth(start.getMonth() - 3);
  else if (preset === '6m') start.setMonth(start.getMonth() - 6);
  else if (preset === '1y') start.setFullYear(start.getFullYear() - 1);
  return { start: getLocalDateString(start), end };
};

export const VehicleCostSummaryCard: React.FC<VehicleCostSummaryCardProps> = ({
  fuelLogs,
  maintenanceLogs,
  tireLogs,
  lang,
  preset,
  onPresetChange,
  customStart,
  customEnd,
  onCustomStartChange,
  onCustomEndChange,
}) => {
  const range = useMemo(() => {
    if (preset === 'custom') {
      return {
        start: customStart || '',
        end: customEnd || '',
      };
    }
    return getRangeForPreset(preset);
  }, [preset, customStart, customEnd]);

  // [v7.5.55 C25] A custom range with NO dates picked must not silently
  // show all-time totals under a "select dates" label — show an honest
  // choose-dates state instead.
  const isCustomRangeEmpty = preset === 'custom' && !range.start && !range.end;

  const inRange = (dateStr: string): boolean => {
    if (!dateStr) return true;
    if (range.start && dateStr < range.start) return false;
    if (range.end && dateStr > range.end) return false;
    return true;
  };

  const filteredFuel = useMemo(() => fuelLogs.filter((l) => inRange(l.date)), [fuelLogs, range]);
  const filteredMaint = useMemo(() => maintenanceLogs.filter((l) => inRange(l.date)), [maintenanceLogs, range]);
  const filteredTire = useMemo(() => tireLogs.filter((l) => inRange(l.date)), [tireLogs, range]);

  const fuelTotal = useMemo(
    () => filteredFuel.reduce((s, l) => s + (Number(l.totalCost) || 0), 0),
    [filteredFuel]
  );
  const maintTotal = useMemo(
    () => filteredMaint.reduce((s, l) => s + (Number(l.cost) || 0), 0),
    [filteredMaint]
  );
  const tireTotal = useMemo(
    () => filteredTire.reduce((s, l) => s + (Number(l.cost) || 0), 0),
    [filteredTire]
  );
  const grandTotal = fuelTotal + maintTotal + tireTotal;

  // [v6.1.10] Cost per Km
  const costPerKmData = useMemo(
    () => calculateCostPerKm(filteredFuel, filteredMaint, filteredTire),
    [filteredFuel, filteredMaint, filteredTire]
  );

  const presets: { id: RangePreset; labelMy: string; labelEn: string }[] = [
    { id: '1m', labelMy: '၁ လ', labelEn: '1M' },
    { id: '3m', labelMy: '၃ လ', labelEn: '3M' },
    { id: '6m', labelMy: '၆ လ', labelEn: '6M' },
    { id: '1y', labelMy: '၁ နှစ်', labelEn: '1Y' },
    { id: 'all', labelMy: 'အားလုံး', labelEn: 'All' },
    { id: 'custom', labelMy: '📅 ရွေးမည်', labelEn: '📅 Custom' },
  ];

  const rangeLabel = () => {
    if (preset === 'all') return lang === 'my' ? 'အချိန်အားလုံး' : 'All time';
    if (!range.start && !range.end) return lang === 'my' ? 'ရက်စွဲ ရွေးပါ' : 'Select dates';
    // [v7.5.60 D-S2] DD/MM/YYYY, not ISO.
    return `${range.start ? formatShortDate(range.start) : '...'} → ${range.end ? formatShortDate(range.end) : '...'}`;
  };

  // [v7.5.60 D-S13] These totals include logs whose expense sync is OFF
  // — say so, or the Dashboard totals will look wrong next to them.
  const hasUnsyncedLogs =
    filteredFuel.some((l) => l.syncToExpense === false) ||
    filteredMaint.some((l) => l.syncToExpense === false) ||
    filteredTire.some((l) => l.syncToExpense === false);

  return (
    <div className="bg-white p-3 rounded-3xl border border-slate-200/80 shadow-xs space-y-2.5">
      {/* Header + Preset Chips */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">
              {lang === 'my' ? 'ကုန်ကျစရိတ် အနှစ်ချုပ်' : 'Vehicle Cost Summary'}
            </h4>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span>{rangeLabel()}</span>
          </p>
        </div>

        {/* Preset Chips */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPresetChange(p.id)}
              className={`px-2.5 py-3 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                preset === p.id
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang === 'my' ? p.labelMy : p.labelEn}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Pickers */}
      {preset === 'custom' && (
        <div className="grid grid-cols-2 gap-2.5 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
          <div>
            <label className="block text-[10px] font-bold text-slate-600 mb-1">
              {lang === 'my' ? 'စတင်' : 'From'}
            </label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => onCustomStartChange(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-600 mb-1">
              {lang === 'my' ? 'အဆုံး' : 'To'}
            </label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => onCustomEndChange(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      )}

      {/* [v7.5.55 C25] Custom range with no dates — honest empty state,
          never all-time totals. */}
      {isCustomRangeEmpty ? (
        <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
          <p className="text-xs font-bold text-slate-600">
            {lang === 'my'
              ? '📅 ရက်စွဲ ရွေးချယ်ပါ — စတင်ရက် (သို့မဟုတ်) အဆုံးရက် တစ်ခုခု ရွေးမှ ကုန်ကျစရိတ် ပြသပါမည်'
              : '📅 Pick a start or end date to see costs for a custom range'}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {lang === 'my'
              ? 'ရက်စွဲ မရွေးရသေးသဖြင့် စုစုပေါင်း ပြမထားပါ'
              : 'No totals are shown until a date is picked'}
          </p>
        </div>
      ) : (
      <>
      {/* 3 Cost Categories */}
      <div className="grid grid-cols-3 gap-2">
        {/* Fuel */}
        <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/70">
          <div className="flex items-center gap-2 text-amber-900">
            <Fuel className="w-3.5 h-3.5" />
            <span className="text-[11px] font-bold">
              {lang === 'my' ? 'ဆီဖိုး' : 'Fuel'}
            </span>
          </div>
          {/* [v7.5.60 D-S1] Lakh display, exact kyat in tooltip. */}
          <div
            className="mt-0.5 font-mono font-black text-amber-900 text-sm truncate"
            title={`${fuelTotal.toLocaleString()} MMK`}
          >
            {formatLakhs(fuelTotal, lang)}
          </div>
          <div className="text-[11px] text-amber-700">
            {filteredFuel.length} {lang === 'my' ? 'ကြိမ်' : 'logs'}
          </div>
        </div>

        {/* Maintenance */}
        <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-200/70">
          <div className="flex items-center gap-2 text-blue-900">
            <Wrench className="w-3.5 h-3.5" />
            <span className="text-[11px] font-bold">
              {lang === 'my' ? 'ပြုပြင်ထိန်းသိမ်းမှု' : 'Maintenance'}
            </span>
          </div>
          <div
            className="mt-0.5 font-mono font-black text-blue-900 text-sm truncate"
            title={`${maintTotal.toLocaleString()} MMK`}
          >
            {formatLakhs(maintTotal, lang)}
          </div>
          <div className="text-[11px] text-blue-700">
            {filteredMaint.length} {lang === 'my' ? 'ကြိမ်' : 'services'}
          </div>
        </div>

        {/* Tires */}
        <div className="p-2.5 rounded-xl bg-teal-50/60 border border-teal-200/70">
          <div className="flex items-center gap-2 text-teal-900">
            <Disc className="w-3.5 h-3.5" />
            <span className="text-[11px] font-bold">
              {lang === 'my' ? 'တာယာ' : 'Tires'}
            </span>
          </div>
          <div
            className="mt-0.5 font-mono font-black text-teal-900 text-sm truncate"
            title={`${tireTotal.toLocaleString()} MMK`}
          >
            {formatLakhs(tireTotal, lang)}
          </div>
          <div className="text-[11px] text-teal-700">
            {filteredTire.length} {lang === 'my' ? 'ကြိမ်' : 'checks'}
          </div>
        </div>
      </div>

      {/* [v7.5.60 D-S13] Unsynced logs are counted here but not in the
          Dashboard expense totals — say so plainly. */}
      {hasUnsyncedLogs && (
        <p className="text-[11px] text-slate-500 flex items-center gap-1 px-0.5">
          <span>⚠️</span>
          <span>
            {lang === 'my'
              ? 'ငွေစာရင်းသို့ မသွင်းထားသော မှတ်တမ်းများပါ ပါဝင်သည် — Dashboard ထွက်ငွေနှင့် ကွာနိုင်သည်'
              : 'Includes logs not synced to expenses — totals may differ from the Dashboard'}
          </span>
        </p>
      )}

      {/* [v7.3.0] Grand Total + Cost per Km — combined strip */}
      <div className="rounded-2xl overflow-hidden border border-indigo-200/70">
        <div className="grid grid-cols-2 divide-x divide-indigo-200/70">
          {/* Grand Total */}
          <div className="p-2.5 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white">
            <div className="text-[11px] font-bold text-indigo-200 uppercase tracking-wider">
              {lang === 'my' ? '💰 စုစုပေါင်း' : '💰 Total'}
            </div>
            <div className="mt-0.5 flex items-baseline gap-0.5">
              <span
                className="font-mono font-black text-lg text-emerald-300 leading-none truncate"
                title={`${grandTotal.toLocaleString()} MMK`}
              >
                {formatLakhs(grandTotal, lang)}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {filteredFuel.length}F • {filteredMaint.length}S • {filteredTire.length}T
            </div>
          </div>

          {/* Cost per Km */}
          <div className="p-2.5 bg-gradient-to-br from-indigo-50 to-emerald-50">
            <div className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1">
              <Gauge className="w-3 h-3" />
              {lang === 'my' ? '⛽ /km' : '⛽ per km'}
            </div>
            {costPerKmData.costPerKm !== null ? (
              <>
                <div className="mt-0.5 flex items-baseline gap-0.5">
                  <span className="font-mono font-black text-lg text-indigo-900 leading-none truncate">
                    {costPerKmData.costPerKm.toFixed(2)}
                  </span>
                  <span className="text-[11px] font-bold text-indigo-700">Ks/km</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                  {costPerKmData.totalDistance.toLocaleString()} km
                </div>
              </>
            ) : (
              /* [v7.5.60 D-N4] Say WHY it cannot be calculated. */
              <div className="mt-1">
                <div className="font-bold text-xs text-slate-400 leading-none">N/A</div>
                <div className="text-[11px] text-slate-500 mt-1 leading-snug">
                  {lang === 'my'
                    ? 'ဆီမှတ်တမ်း ၂ ကြိမ်နှင့် အထက် ရှိမှ တွက်နိုင်ပါမည်'
                    : 'Needs 2+ fuel logs to calculate'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
};
