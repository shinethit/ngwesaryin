const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();

const cardPath = path.join(ROOT, 'src', 'components', 'vehicles', 'VehicleCostSummaryCard.tsx');
const analyticsPath = path.join(ROOT, 'src', 'utils', 'vehicleAnalytics.ts');

let card = fs.readFileSync(cardPath, 'utf8').replace(/\r\n/g, '\n');
let analytics = fs.readFileSync(analyticsPath, 'utf8').replace(/\r\n/g, '\n');

console.log('=== DIAGNOSTIC ===');
console.log('[Analytics] calculateCostPerKm:', analytics.includes('export function calculateCostPerKm') ? 'YES' : 'NO');
console.log('[Card] Gauge import       :', card.includes(', Gauge }') || card.includes(' Gauge,') || card.includes('Gauge }') ? 'YES' : 'NO');
console.log('[Card] calculateCostPerKm import:', card.includes('calculateCostPerKm') ? 'YES' : 'NO');
console.log('[Card] costPerKmData useMemo    :', card.includes('costPerKmData') ? 'YES' : 'NO');
console.log('[Card] UI block [v6.1.10]       :', card.includes('[v6.1.10]') ? 'YES' : 'NO');
console.log('');

// ========== FIX 1: Analytics helper ==========
if (!analytics.includes('export function calculateCostPerKm')) {
  console.log('[FIX] Adding calculateCostPerKm to vehicleAnalytics.ts...');
  fs.copyFileSync(analyticsPath, analyticsPath + '.bak');

  const anchor = `/**\n * Fuel price chart points generator for Recharts\n */`;
  if (!analytics.includes(anchor)) {
    console.error('  ✗ Anchor not found. Aborting analytics.');
  } else {
    const insert = `/**
 * [v6.1.10] Calculate cost per km across all vehicle expenses.
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
  const odometers = fuelLogs.map((l) => Number(l.odometer) || 0).filter((o) => o > 0);
  let totalDistance = 0;
  if (odometers.length >= 2) totalDistance = Math.max(...odometers) - Math.min(...odometers);
  const hasEnoughData = odometers.length >= 2 && totalDistance > 0;
  return {
    costPerKm: hasEnoughData ? Number((totalCost / totalDistance).toFixed(2)) : null,
    totalCost, totalDistance,
    fuelLogCount: fuelLogs.length,
    hasEnoughData,
  };
}

${anchor}`;
    analytics = analytics.replace(anchor, insert);
    fs.writeFileSync(analyticsPath, analytics, { encoding: 'utf8' });
    console.log('  ✓ Analytics updated');
  }
} else {
  console.log('[OK] Analytics already has helper');
}

// ========== FIX 2a: Gauge import ==========
if (!card.includes('Gauge')) {
  console.log('[FIX] Adding Gauge to lucide imports...');
  fs.copyFileSync(cardPath, cardPath + '.bak');
  const oldIcon = `import { Fuel, Wrench, Disc, Calendar, TrendingUp } from 'lucide-react';`;
  if (card.includes(oldIcon)) {
    card = card.replace(oldIcon, `import { Fuel, Wrench, Disc, Calendar, TrendingUp, Gauge } from 'lucide-react';`);
    console.log('  ✓ Gauge imported');
  } else {
    console.error('  ✗ Icon line not found — check manually');
  }
} else {
  console.log('[OK] Gauge already imported');
}

// ========== FIX 2b: helper import ==========
if (!card.includes('calculateCostPerKm }') && !card.includes("calculateCostPerKm,")) {
  console.log('[FIX] Adding calculateCostPerKm import...');
  const oldImport = `import { FuelLog, VehicleMaintenance, TirePressureLog } from '../../types';`;
  if (card.includes(oldImport)) {
    card = card.replace(oldImport, `${oldImport}\nimport { calculateCostPerKm } from '../../utils/vehicleAnalytics';`);
    console.log('  ✓ Helper imported');
  } else {
    console.error('  ✗ Types import line not found');
  }
} else {
  console.log('[OK] Helper already imported');
}

// ========== FIX 2c: useMemo ==========
if (!card.includes('costPerKmData')) {
  console.log('[FIX] Adding useMemo...');
  const memoAnchor = `  const grandTotal = fuelTotal + maintTotal + tireTotal;`;
  if (card.includes(memoAnchor)) {
    card = card.replace(memoAnchor, `${memoAnchor}

  // [v6.1.10] Cost per Km
  const costPerKmData = useMemo(
    () => calculateCostPerKm(filteredFuel, filteredMaint, filteredTire),
    [filteredFuel, filteredMaint, filteredTire]
  );`);
    console.log('  ✓ useMemo added');
  } else {
    console.error('  ✗ grandTotal anchor not found');
  }
} else {
  console.log('[OK] useMemo already there');
}

// ========== FIX 2d: UI block (regex-based, robust) ==========
if (!card.includes('[v6.1.10]')) {
  console.log('[FIX] Inserting UI block...');

  // Regex to find the closing of Grand Total block + return
  // Matches: <div ...MMK</div> </div> </div> </div> ); };
  const pattern = /(<div className="text-\[10px\] font-bold text-emerald-400">MMK<\/div>\s*<\/div>\s*<\/div>)(\s*<\/div>\s*\);\s*};)/;

  const uiBlock = `$1

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
      </div>$2`;

  if (pattern.test(card)) {
    card = card.replace(pattern, uiBlock);
    console.log('  ✓ UI block inserted via regex');
  } else {
    console.error('  ✗ Regex did not match. Manual insertion needed.');
    console.error('  → Show me the last 30 lines of VehicleCostSummaryCard.tsx');
  }
} else {
  console.log('[OK] UI block already present');
}

fs.writeFileSync(cardPath, card, { encoding: 'utf8' });
console.log('');
console.log('=== DONE ===');
console.log('Next: npm run build');