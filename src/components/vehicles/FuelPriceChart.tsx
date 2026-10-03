import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Area,
  AreaChart,
} from 'recharts';
import { FuelLog } from '../../types';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface FuelPriceChartProps {
  logs: FuelLog[];
  lang: 'my' | 'en';
}

export const FuelPriceChart: React.FC<FuelPriceChartProps> = ({ logs, lang }) => {
  // Sort chronological
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));

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

  const chartData = sorted.map((l) => ({
    date: l.date,
    displayDate: l.date.slice(5), // MM-DD
    price: l.pricePerLiter,
    liters: l.liters,
    totalCost: l.totalCost,
    fuelType: l.fuelType || 'Octane',
    station: l.gasStation || '',
  }));

  const prices = sorted.map((l) => l.pricePerLiter).filter((p) => p > 0);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const latestPrice = sorted[sorted.length - 1]?.pricePerLiter || 0;
  const prevPrice = sorted.length > 1 ? sorted[sorted.length - 2].pricePerLiter : latestPrice;
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
              <linearGradient id="fuelPriceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
              </linearGradient>
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
              tickFormatter={(val) => `${val.toLocaleString()} K`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-slate-900/90 backdrop-blur-md text-white p-3 rounded-2xl shadow-xl text-xs space-y-1 border border-slate-700">
                      <p className="font-bold text-amber-300">{data.date}</p>
                      <p className="flex justify-between gap-4">
                        <span className="text-slate-400">{lang === 'my' ? 'ဆီအမျိုးအစား:' : 'Fuel Type:'}</span>
                        <span className="font-semibold">{data.fuelType}</span>
                      </p>
                      <p className="flex justify-between gap-4">
                        <span className="text-slate-400">{lang === 'my' ? '၁ လီတာ ဈေးနှုန်း:' : 'Price/L:'}</span>
                        <span className="font-mono font-bold text-amber-400">{Number(data.price).toLocaleString()} Ks</span>
                      </p>
                      <p className="flex justify-between gap-4">
                        <span className="text-slate-400">{lang === 'my' ? 'ဆီပမာဏ:' : 'Liters:'}</span>
                        <span className="font-mono">{data.liters} L</span>
                      </p>
                      <p className="flex justify-between gap-4 border-t border-slate-700 pt-1">
                        <span className="text-slate-400">{lang === 'my' ? 'စုစုပေါင်း ကျသင့်ငွေ:' : 'Total:'}</span>
                        <span className="font-mono font-bold text-emerald-400">{Number(data.totalCost).toLocaleString()} Ks</span>
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
            <Area
              type="monotone"
              dataKey="price"
              stroke="#f59e0b"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#fuelPriceGradient)"
              activeDot={{ r: 6, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
