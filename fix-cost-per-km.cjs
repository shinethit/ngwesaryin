const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

// ============ File 1: vehicleAnalytics.ts ============
const analyticsPath = path.join(ROOT, 'src', 'utils', 'vehicleAnalytics.ts');
fs.copyFileSync(analyticsPath, analyticsPath + '.bak');
let analytics = fs.readFileSync(analyticsPath, 'utf8').replace(/\r\n/g, '\n');

const analyticsAnchor = `/**
 * Fuel price chart points generator for Recharts
 */`;

const analyticsInsert = `/**
 * [v6.1.10] Calculate cost per km across all vehicle expenses.
 * Total Cost = Fuel + Maintenance + Tire
 * Distance = max(fuel odometer) - min(fuel odometer) — from fuel logs only
 */
export interface CostPerKmResult {
  costPerKm: number | null;
  totalCost: number;
  totalDistance: number;
  fuelLogCount: number;
  hasEnoughData: boolean;
}

export function calculateCostPerKm(
  fuelLogs: FuelLog[],
  maintenanceLogs: VehicleMaintenance[],
  tireLogs: TirePressureLog[]
): CostPerKmResult {
  const fuelTotal = fuelLogs.reduce((s, l) => s + (Number(l.totalCost) || 0), 0);
  const maintTotal = maintenanceLogs.reduce((s, l) => s + (Number(l.cost) || 0), 0);
  const tireTotal = tireLogs.reduce((s, l) => s + (Number(l.cost) || 0), 0);
  const totalCost = fuelTotal + maintTotal + tireTotal;

  const odometers = fuelLogs
    .map((l) => Number(l.odometer) || 0)
    .filter((o) => o > 0);

  let totalDistance = 0;
  if (odometers.length >= 2) {
    totalDistance = Math.max(...odometers) - Math.min(...odometers);
  }

  const hasEnoughData = odometers.length >= 2 && totalDistance > 0;

  return {
    costPerKm: hasEnoughData ? Number((totalCost / totalDistance).toFixed(2)) : null,
    totalCost,
    totalDistance,
    fuelLogCount: fuelLogs.length,
    hasEnoughData,
  };
}

${analyticsAnchor}`;

if (!analytics.includes(analyticsAnchor)) {
  console.error('[1] Anchor not found in vehicleAnalytics.ts');
  process.exit(1);
}
if (analytics.includes('calculateCostPerKm')) {
  console.log('[1] calculateCostPerKm already exists - skip');
} else {
  analytics = analytics.replace(analyticsAnchor, analyticsInsert);
  fs.writeFileSync(analyticsPath, analytics, { encoding: 'utf8' });
  console.log('[1] vehicleAnalytics.ts updated');
}

// ============ File 2: VehicleCostSummaryCard.tsx ============
const cardPath = path.join(ROOT, 'src', 'components', 'vehicles', 'VehicleCostSummaryCard.tsx');
fs.copyFileSync(cardPath, cardPath + '.bak');
let card = fs.readFileSync(cardPath, 'utf8').replace(/\r\n/g, '\n');

// 2a. Gauge icon
const iconOld = `import { Fuel, Wrench, Disc, Calendar, TrendingUp } from 'lucide-react';`;
const iconNew = `import { Fuel, Wrench, Disc, Calendar, TrendingUp, Gauge } from 'lucide-react';`;
if (card.includes(iconNew)) {
  console.log('[2a] Gauge already imported');
} else if (card.includes(iconOld)) {
  card = card.replace(iconOld, iconNew);
  console.log('[2a] Gauge imported');
} else {
  console.error('[2a] Icon anchor not found');
  process.exit(1);
}

// 2b. Helper import
const helperOld = `import { FuelLog, VehicleMaintenance, TirePressureLog } from '../../types';`;
const helperNew = `import { FuelLog, VehicleMaintenance, TirePressureLog } from '../../types';\nimport { calculateCostPerKm } from '../../utils/vehicleAnalytics';`;
if (card.includes("calculateCostPerKm } from")) {
  console.log('[2b] Helper already imported');
} else if (card.includes(helperOld)) {
  card = card.replace(helperOld, helperNew);
  console.log('[2b] Helper imported');
} else {
  console.error('[2b] Helper anchor not found');
  process.exit(1);
}

// 2c. useMemo
const memoAnchor = `  const grandTotal = fuelTotal + maintTotal + tireTotal;`;
const memoInsert = `  const grandTotal = fuelTotal + maintTotal + tireTotal;

  // [v6.1.10] Cost per Km
  const costPerKmData = useMemo(
    () => calculateCostPerKm(filteredFuel, filteredMaint, filteredTire),
    [filteredFuel, filteredMaint, filteredTire]
  );`;
if (card.includes('costPerKmData')) {
  console.log('[2c] useMemo already exists');
} else if (card.includes(memoAnchor)) {
  card = card.replace(memoAnchor, memoInsert);
  console.log('[2c] useMemo added');
} else {
  console.error('[2c] grandTotal anchor not found');
  process.exit(1);
}

// 2d. UI block
const uiAnchor = `          <div className="text-[10px] font-bold text-emerald-400">MMK</div>
        </div>
      </div>
    </div>
  );
};`;

const uiInsert = `          <div className="text-[10px] font-bold text-emerald-400">MMK</div>
        </div>
      </div>

      {/* [v6.1.10] Cost per Km */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-emerald-50 border border-indigo-200/70 flex items-center justify-between">
        <div>
          <div className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5" />
            {lang === 'my' ? '⛽ တစ်ကီလိုမီတာ ကုန်ကျစရိတ်' : '⛽ Cost per Km'}
          </div>
          <div className="text-[10px] text-slate-600 mt-0.5">
            {costPerKmData.hasEnoughData
              ? \`\${costPerKmData.totalDistance.toLocaleString()} km · \${costPerKmData.totalCost.toLocaleString()} MMK\`
              : (lang === 'my' ? 'ဆီဖြည့် log ၂ ခု လိုအပ်သည်' : 'Need at least 2 fuel logs')}
          </div>
        </div>
        <div className="text-right">
          {costPerKmData.costPerKm !== null ? (
            <>
              <div className="font-mono font-black text-xl sm:text-2xl text-indigo-900">
                {costPerKmData.costPerKm.toFixed(2)}
              </div>
              <div className="text-[10px] font-bold text-indigo-700">MMK / km</div>
            </>
          ) : (
            <div className="font-bold text-sm text-slate-400">N/A</div>
          )}
        </div>
      </div>
    </div>
  );
};`;

if (card.includes('[v6.1.10]')) {
  console.log('[2d] UI block already exists');
} else if (card.includes(uiAnchor)) {
  card = card.replace(uiAnchor, uiInsert);
  console.log('[2d] UI block added');
} else {
  console.error('[2d] UI anchor not found');
  process.exit(1);
}

fs.writeFileSync(cardPath, card, { encoding: 'utf8' });
console.log('[2] VehicleCostSummaryCard.tsx updated');

console.log('');
console.log('Done! Next steps:');
console.log('  1. npm run build');
console.log('  2. git add .');
console.log('  3. git commit -m "v6.1.10: Cost per Km"');
console.log('  4. git push origin main');
console.log('  5. Cleanup .bak + script');