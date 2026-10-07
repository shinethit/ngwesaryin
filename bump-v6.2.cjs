const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src', 'data', 'versionHistory.ts');

if (!fs.existsSync(filePath)) {
  console.error('✗ versionHistory.ts not found');
  process.exit(1);
}

fs.copyFileSync(filePath, filePath + '.bak');

let content = fs.readFileSync(filePath, 'utf8');
if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
content = content.replace(/\r\n/g, '\n');

// Mojibake check
const mojibakePatterns = ['à¹', 'â€', 'à€', 'Ã '];
const found = mojibakePatterns.filter(p => content.includes(p));
if (found.length > 0) {
  console.error('\n⚠️⚠️⚠️ MOJIBAKE DETECTED ⚠️⚠️⚠️');
  console.error('Patterns:', found.join(', '));
  console.error('RESTORE: git checkout src/data/versionHistory.ts');
  fs.copyFileSync(filePath + '.bak', filePath);
  process.exit(1);
}
console.log('[OK] Encoding looks good\n');

// ============ Bump constants ============
const versionOld = "export const CURRENT_APP_VERSION = 'v6.1.0';";
const versionNew = "export const CURRENT_APP_VERSION = 'v6.2';";

const buildOld = "export const CURRENT_BUILD_NUMBER = 148;";
const buildNew = "export const CURRENT_BUILD_NUMBER = 149;";

if (content.includes(versionNew)) {
  console.log('[1] CURRENT_APP_VERSION already v6.2');
} else if (content.includes(versionOld)) {
  content = content.replace(versionOld, versionNew);
  console.log('[1] CURRENT_APP_VERSION → v6.2');
} else {
  console.error('[1] ✗ CURRENT_APP_VERSION anchor not found');
  process.exit(1);
}

if (content.includes(buildNew)) {
  console.log('[2] CURRENT_BUILD_NUMBER already 149');
} else if (content.includes(buildOld)) {
  content = content.replace(buildOld, buildNew);
  console.log('[2] CURRENT_BUILD_NUMBER → 149');
} else {
  console.error('[2] ✗ CURRENT_BUILD_NUMBER anchor not found');
  process.exit(1);
}

// ============ Insert v6.2 entry ============
const anchor = 'export const VERSION_HISTORY: VersionItem[] = [\n';

if (content.includes("version: 'v6.2'")) {
  console.log('[3] v6.2 entry already present');
} else if (content.includes(anchor)) {
  const entry = `  {
    version: 'v6.2',
    buildNumber: 149,
    releaseDate: '2026-10-07',
    releaseTime: '6:00 PM (MMT)',
    titleMy: 'အကြွေးပြန်ဆပ်မှတ်တမ်း + ယာဉ်ကုန်ကျစရိတ် အနှစ်ချုပ်',
    titleEn: 'Debt Repayment Sync + Vehicle Cost per Km',
    tag: 'major',
    tagLabelMy: 'အင်္ဂါရပ်အသစ်များ',
    tagLabelEn: 'New Features',
    descriptionMy: 'အကြွေးပြန်ဆပ်မှတ်တမ်းများကို ငွေစာရင်းနှင့် အလိုအလျောက် ချိတ်ဆက်ခြင်း၊ ယာဉ်တစ်စီးအတွက် တစ်ကီလိုမီတာ ကုန်ကျစရိတ် တွက်ချက်ခြင်းနှင့် အခြားသော UI တိုးတက်မှုများ ပါဝင်ပါသည်။',
    descriptionEn: 'Auto-sync debt repayments with transactions, Cost per Km for vehicles, and other UI improvements.',
    changesMy: [
      'အကြွေးပြန်ဆပ်မှတ်တမ်း ဖျက်လိုက်ပါက တွဲဖက်ငွေစာရင်းကိုပါ ဖျက်ပြီး Wallet လက်ကျန်ငွေ အလိုအလျောက် ပြန်ပြောင်းပေးပါပြီ။',
      'အကြွေးပြန်ဆပ်မှတ်တမ်း ပြင်ဆင်လိုက်ပါက တွဲဖက်ငွေစာရင်းကိုပါ update လုပ်ပေးပါပြီ။',
      'အကြွေးဖျက်သောအခါ တွဲဖက်ငွေစာရင်းများအားလုံး cleanup လုပ်ပါပြီ။',
      'ရှေးဟောင်း (legacy) ငွေဆပ်မှတ်တမ်းများကို auto-migrate လုပ်ပေးပါပြီ။',
      'ယာဉ်ကုန်ကျစရိတ် အနှစ်ချုပ်စာမျက်နှာတွင် တစ်ကီလိုမီတာ ကုန်ကျစရိတ် ပြသပါပြီ။',
      'ဆီဆိုင် Default စာရင်းကို ၃ ခုသာ ထားရှိပါသည် (Denko, BOC, Max Energy)။',
      'Smart Calendar တွင် Wallet filter နှင့် Lakh format ပြုပြင်ပါပြီ။',
      'ယာဉ် Phantom Wallet ပြန်ပေါ်ခြင်းကို ကာကွယ်ပါပြီ။',
      'Admin Panel quota အသုံးပြုမှုကို ၈၀-၉၅% လျှော့ချပါပြီ။',
    ],
    changesEn: [
      'Deleting a repayment now deletes its linked transaction and reverts wallet balance.',
      'Editing a repayment now updates the linked transaction.',
      'Deleting a debt cleans up all linked transactions.',
      'Legacy repayments auto-migrated on startup.',
      'Cost per Km displayed on Vehicle Cost Summary card.',
      'Default gas stations reduced to 3 (Denko, BOC, Max Energy).',
      'Smart Calendar Wallet filter + Lakh format improvements.',
      'Vehicle Phantom Wallet reappearing fixed.',
      'Admin Panel quota usage reduced by 80-95%.',
    ],
  },
`;

  content = content.replace(anchor, anchor + entry);
  console.log('[3] v6.2 entry inserted (consolidated v6.1.1 → v6.1.11)');
} else {
  console.error('[3] ✗ VERSION_HISTORY anchor not found');
  process.exit(1);
}

fs.writeFileSync(filePath, content, { encoding: 'utf8' });
console.log('\n✓ File saved\n');
console.log('=== Verify ===');
console.log("  Select-String -Path src\\data\\versionHistory.ts -Pattern \"CURRENT_APP_VERSION|CURRENT_BUILD_NUMBER\" | Select Line");
console.log("  Select-String -Path src\\data\\versionHistory.ts -Pattern \"version: 'v6\" | Select Line");
console.log('\nNext:');
console.log('  npm run build');
console.log('  git add .');
console.log('  git commit -m "v6.2: version format x.x + consolidate v6.1.1-v6.1.11"');
console.log('  git push origin main');