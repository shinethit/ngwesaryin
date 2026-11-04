import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Area, AreaChart } from 'recharts';
import { FuelLog } from '../../types';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatLakhs, formatShortDate } from '../../utils/formatters';

interface FuelPriceChartProps {
  logs: FuelLog[];
  lang: 'my' | 'en';
}

// [v7.5.60 D-S8] One colour per fuel type — different fuels must never
// share a single price line.
const FUEL_TYPE_COLORS: Record<string, string> = {
  'Octane 92': '#f59e0b',
  'Octane 95': '#3b82f6',
  'Octane 97': '#8b5cf6',
  Diesel: '#10b981',
  'Premium Diesel': '#14b8a6',
  'EV (Electric)': '#06b6d4',
  CNG: '#84cc16',
  LPG: '#f97316',
  Other: '#64748b',
};
const FALLBACK_TYPE_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316'];

const colorForType = (type: string, idx: number): string =>
  FUEL_TYPE_COLORS[type] || FALLBACK_TYPE_COLORS[idx % FALLBACK_TYPE_COLORS.length];

interface FuelPriceChartProps {
  logs: FuelLog[];
  lang: 'my' | 'en';
}

export const FuelPriceChart: React.FC<FuelPriceChartProps> = ({ logs, lang }) => {
  // Sort chronological
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));

  // [v7.5.60 D-S8] Fuel-type filter — default is the most recent log's
  // type when several types exist, so diesel and octane prices are never
  // mixed on one line by default. 'all' draws one line PER type.
  const fuelTypes = useMemo(
    () => [...new Set(sorted.map((l) => l.fuelType || 'Octane'))],
    [sorted]
  );
  const latestType = sorted.length > 0 ? sorted[sorted.length - 1].fuelType || 'Octane' : 'all';
  const [typeFilter, setTypeFilter] = useState<string>('__auto__');
  const rawFilter = typeFilter === '__auto__' ? (fuelTypes.length > 1 ? latestType : 'all') : typeFilter;
  // The filter survives a vehicle switch — if the new vehicle never used
  // the filtered type, fall back instead of drawing an empty chart.
  const effectiveFilter =
    rawFilter !== 'all' && !fuelTypes.includes(rawFilter)
      ? fuelTypes.length > 1
        ? latestType
        : 'all'
      : rawFilter;
  const visibleTypes = effectiveFilter === 'all' ? fuelTypes : [effectiveFilter];

  const filtered = effectiveFilter === 'all' ? sorted : sorted.filter((l) => (l.fuelType || 'Octane') === effectiveFilter);

  if (sorted.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-50 border border-slate-200/80 rounded-3xl">
        <p className="text-sm text-slate-500">
          {lang === 'my'
            ? 'ဆီဈေးနှုန်း အတက်အကျ ပြသရန် ဆီထည့်မှတ်တမ်းများ မရှိသေးပါ'
            : 'No fuel price data available yet'}
        </p>
      </div>
    );
  }

  // One row per date; one price key per fuel type (null when that type
  // was not bought that day, so lines never jump across types).
  const chartData = useMemo(() => {
    const byDate = new Map<string, Record<string, number | string | null>>();
    const metaByDate = new Map<string, { liters: number; totalCost: number; station: string }>();
    filtered.forEach((l) => {
      const type = l.fuelType || 'Octane';
      if (!byDate.has(l.date)) {
        byDate.set(l.date, { date: l.date, displayDate: l.date.slice(5) });
      }
      byDate.get(l.date)![type] = l.pricePerLiter;
      // Tooltip meta comes from the latest log of that date.
      metaByDate.set(l.date, {
        liters: l.liters,
        totalCost: l.totalCost,
        station: l.gasStation || '',
      });
    });
    return [...byDate.values()].map((row) => ({ ...row, ...(metaByDate.get(row.date as string) || {}) }));
  }, [filtered]);

  const prices = filtered.map((l) => l.pricePerLiter).filter((p) => p > 0);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const latestPrice = filtered[filtered.length - 1]?.pricePerLiter || 0;
  const prevPrice = filtered.length > 1 ? filtered[filtered.length - 2].pricePerLiter : latestPrice;
  const priceDiff = latestPrice - prevPrice;

  return (
    <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-slate-800 text-sm">
              {lang === 'my' ? 'ဆီဈေးနှုန်း အတက်အကျ မှတ်တမ်း' : 'Fuel Price Trend (MMK / Liter)'}
            </h4>
            {priceDiff !== 0 && (
              <span
                className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
                  priceDiff > 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                {priceDiff > 0 ? (
                  <>
                    <TrendingUp className="w-3 h-3" />
                    +{priceDiff.toLocaleString()} Ks
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-3 h-3" />
                    {priceDiff.toLocaleString()} Ks
                  </>
                )}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {lang === 'my'
              ? 'ဆီထည့်ခဲ့သည့် နေ့စွဲအလိုက် ၁ လီတာ ဈေးနှုန်း နှိုင်းယှဉ်ချက်'
              : 'Historical price per liter comparison across fill-ups'}
          </p>
          {/* [v7.5.60 D-S8] Fuel-type filter — each type has its own line. */}
          {fuelTypes.length > 1 && (
            <div className="flex items-center gap-1 flex-wrap mt-2">
              <button
                type="button"
                onClick={() => setTypeFilter('all')}
                className={`px-2.5 py-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  effectiveFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                {lang === 'my' ? 'အားလုံး' : 'All types'}
              </button>
              {fuelTypes.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={`px-2.5 py-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    effectiveFilter === t
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: colorForType(t, fuelTypes.indexOf(t)) }}
                  />
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick Min/Max Price Stats */}
        <div className="flex items-center gap-3 text-xs bg-slate-50 px-3.5 py-2 rounded-2xl border border-slate-200/60 self-start sm:self-auto">
          <div>
            <span className="text-slate-400 block text-[10px]">{lang === 'my' ? 'အနိမ့်ဆုံး' : 'Min Price'}</span>
            <span className="font-mono font-bold text-slate-700">{minPrice.toLocaleString()} Ks</span>
          </div>
          <div className="h-6 w-px bg-slate-200" />
          <div>
            <span className="text-slate-400 block text-[10px]">{lang === 'my' ? 'လက်ရှိ/နောက်ဆုံး' : 'Latest'}</span>
            <span className="font-mono font-bold text-amber-700">{latestPrice.toLocaleString()} Ks</span>
          </div>
          <div className="h-6 w-px bg-slate-200" />
          <div>
            <span className="text-slate-400 block text-[10px]">{lang === 'my' ? 'အမြင့်ဆုံး' : 'Max Price'}</span>
            <span className="font-mono font-bold text-slate-700">{maxPrice.toLocaleString()} Ks</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-56 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              {visibleTypes.map((t, i) => (
                <linearGradient key={t} id={`fuelPriceGradient-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colorForType(t, fuelTypes.indexOf(t))} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={colorForType(t, fuelTypes.indexOf(t))} stopOpacity={0.0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="displayDate"
              tick={{ fontSize: 10, fill: '#64748b' }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={false}
            />
            <YAxis
              domain={['dataMin - 100', 'dataMax + 100']}
              tick={{ fontSize: 10, fill: '#64748b' }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={false}
              // [v7.5.60 D-M2] "3,100 K" reads as 3.1 million — use "3.1K".
              tickFormatter={(val) => `${(val / 1000).toFixed(1)}K`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  const priced = payload.filter((p) => p.value !== null && p.value !== undefined);
                  return (
                    <div className="bg-slate-900/90 backdrop-blur-md text-white p-3 rounded-2xl shadow-xl text-xs space-y-1 border border-slate-700">
                      {/* [v7.5.60 D-S2] DD/MM/YYYY, not ISO. */}
                      <p className="font-bold text-amber-300">{formatShortDate(data.date)}</p>
                      {priced.map((p) => (
                        <p key={String(p.dataKey)} className="flex justify-between gap-4">
                          <span className="text-slate-400 flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full inline-block"
                              style={{ backgroundColor: String(p.color || p.stroke) }}
                            />
                            {String(p.dataKey)}:
                          </span>
                          <span className="font-mono font-bold text-amber-400">{Number(p.value).toLocaleString()} Ks/L</span>
                        </p>
                      ))}
                      <p className="flex justify-between gap-4">
                        <span className="text-slate-400">{lang === 'my' ? 'ဆီပမာဏ:' : 'Liters:'}</span>
                        <span className="font-mono">{data.liters} L</span>
                      </p>
                      <p className="flex justify-between gap-4 border-t border-slate-700 pt-1">
                        <span className="text-slate-400">{lang === 'my' ? 'စုစုပေါင်း ကျသင့်ငွေ:' : 'Total:'}</span>
                        {/* [v7.5.60 D-S1] Display in lakhs, exact kyat in tooltip. */}
                        <span
                          className="font-mono font-bold text-emerald-400"
                          title={`${Number(data.totalCost).toLocaleString()} MMK`}
                        >
                          {formatLakhs(Number(data.totalCost), lang)}
                        </span>
                      </p>
                      {data.station && (
                        <p className="text-[10px] text-slate-400 pt-0.5">📍 {data.station}</p>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            {visibleTypes.map((t, i) => (
              <Area
                key={t}
                type="monotone"
                dataKey={t}
                stroke={colorForType(t, fuelTypes.indexOf(t))}
                strokeWidth={2.5}
                fillOpacity={1}
                fill={`url(#fuelPriceGradient-${i})`}
                connectNulls
                activeDot={{ r: 6, fill: colorForType(t, fuelTypes.indexOf(t)), stroke: '#fff', strokeWidth: 2 }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
