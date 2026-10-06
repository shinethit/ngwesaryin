const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const cardPath = path.join(ROOT, 'src', 'components', 'vehicles', 'VehicleCostSummaryCard.tsx');

fs.copyFileSync(cardPath, cardPath + '.bak');
let card = fs.readFileSync(cardPath, 'utf8').replace(/\r\n/g, '\n');

console.log('=== INSERT UI BLOCK ===');

// Safety: verify useMemo exists
if (!card.includes('const costPerKmData')) {
  console.error('✗ costPerKmData not found. Run previous script first.');
  process.exit(1);
}
console.log('[OK] costPerKmData useMemo found');

// Safety: verify Gauge import
if (!card.includes('Gauge')) {
  console.error('✗ Gauge not imported. Run previous script first.');
  process.exit(1);
}
console.log('[OK] Gauge imported');

// Already present?
if (card.includes('{/* [v6.1.10] Cost per Km */}')) {
  console.log('[OK] UI block already present — nothing to do');
  process.exit(0);
}

// Anchor: end of Grand Total block + outer close + return
const anchor = `          <div className="text-[10px] font-bold text-emerald-400">MMK</div>
        </div>
      </div>
    </div>
  );
};`;

if (!card.includes(anchor)) {
  console.error('✗ Anchor not found. Aborting.');
  console.error('Last 15 lines:');
  console.error(card.split('\n').slice(-15).join('\n'));
  process.exit(1);
}
console.log('[OK] Anchor found');

const replacement = `          <div className="text-[10px] font-bold text-emerald-400">MMK</div>
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

card = card.replace(anchor, replacement);
fs.writeFileSync(cardPath, card, { encoding: 'utf8' });
console.log('✓ UI block inserted');
console.log('');
console.log('Next: npm run build && git add . && git commit -m "v6.1.10: Cost per Km UI" && git push');