import React, { useMemo } from 'react';
import { Fuel, Wrench, Disc, Calendar, TrendingUp } from 'lucide-react';
import { FuelLog, VehicleMaintenance, TirePressureLog } from '../../types';

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
    return `${range.start || '...'} → ${range.end || '...'}`;
  };

  return (
    <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
      {/* Header + Preset Chips */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
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

      {/* 3 Cost Categories */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Fuel */}
        <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/70">
          <div className="flex items-center gap-2 text-amber-900">
            <Fuel className="w-3.5 h-3.5" />
            <span className="text-[11px] font-bold">
              {lang === 'my' ? 'ဆီဖိုး' : 'Fuel'}
            </span>
          </div>
          <div className="mt-1.5 font-mono font-black text-amber-900 text-lg">
            {fuelTotal.toLocaleString()}
          </div>
          <div className="text-[10px] text-amber-700">
            {filteredFuel.length} {lang === 'my' ? 'ကြိမ်' : 'logs'}
          </div>
        </div>

        {/* Maintenance */}
        <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200/70">
          <div className="flex items-center gap-2 text-blue-900">
            <Wrench className="w-3.5 h-3.5" />
            <span className="text-[11px] font-bold">
              {lang === 'my' ? 'ပြုပြင်ထိန်းသိမ်းမှု' : 'Maintenance'}
            </span>
          </div>
          <div className="mt-1.5 font-mono font-black text-blue-900 text-lg">
            {maintTotal.toLocaleString()}
          </div>
          <div className="text-[10px] text-blue-700">
            {filteredMaint.length} {lang === 'my' ? 'ကြိမ်' : 'services'}
          </div>
        </div>

        {/* Tires */}
        <div className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-200/70">
          <div className="flex items-center gap-2 text-teal-900">
            <Disc className="w-3.5 h-3.5" />
            <span className="text-[11px] font-bold">
              {lang === 'my' ? 'တာယာ' : 'Tires'}
            </span>
          </div>
          <div className="mt-1.5 font-mono font-black text-teal-900 text-lg">
            {tireTotal.toLocaleString()}
          </div>
          <div className="text-[10px] text-teal-700">
            {filteredTire.length} {lang === 'my' ? 'ကြိမ်' : 'checks'}
          </div>
        </div>
      </div>

      {/* Grand Total */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between">
        <div>
          <div className="text-[11px] font-bold text-indigo-200 uppercase tracking-wider">
            {lang === 'my' ? '💰 စုစုပေါင်း ကုန်ကျစရိတ်' : '💰 Grand Total'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {filteredFuel.length} fuel • {filteredMaint.length} service • {filteredTire.length} tire
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono font-black text-xl sm:text-2xl text-emerald-300">
            {grandTotal.toLocaleString()}
          </div>
          <div className="text-[10px] font-bold text-emerald-400">MMK</div>
        </div>
      </div>
    </div>
  );
};
