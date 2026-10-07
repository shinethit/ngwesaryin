const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src', 'data', 'versionHistory.ts');
const buf = fs.readFileSync(filePath);
const str = buf.toString('utf8');

console.log('=== DIAGNOSTIC ===');
console.log('File size:', buf.length, 'bytes');
console.log('BOM:', buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF ? 'YES' : 'NO');
console.log('');

const patterns = {
  'Myanmar Unicode (U+1000-109F)': /[\u1000-\u109F]/,
  'CP1252 mojibake (à¹ / â€)':     /à¹|â€|à€|Ã /,
  'SJIS mojibake (ﾃ｡ / 竄ｬ)':      /ﾃ｡|竄ｬ|ﾂｻ|邃｢/,
};

let corrupt = false;
for (const [name, pattern] of Object.entries(patterns)) {
  const found = pattern.test(str);
  console.log(`${name}: ${found ? '✓ FOUND' : '✗ not found'}`);
  if (name.includes('mojibake') && found) corrupt = true;
}

console.log('');
if (corrupt) {
  console.log('🚨 FILE IS CORRUPTED — mojibake detected');
} else if (patterns['Myanmar Unicode (U+1000-109F)'].test(str)) {
  console.log('✅ File is CLEAN — Myanmar Unicode intact');
} else {
  console.log('⚠️ No Myanmar text found — file may be empty or invalid');
}

// Show first 3 lines of Myanmar text found
const lines = str.split('\n');
let shown = 0;
for (let i = 0; i < lines.length && shown < 3; i++) {
  if (/[\u1000-\u109F]/.test(lines[i])) {
    console.log(`\n  Line ${i + 1} (clean Myanmar): ${lines[i].slice(0, 80)}`);
    shown++;
  }
}
shown = 0;
for (let i = 0; i < lines.length && shown < 3; i++) {
  if (/ﾃ｡|竄ｬ|à¹|â€/.test(lines[i])) {
    console.log(`  Line ${i + 1} (mojibake):      ${lines[i].slice(0, 80)}`);
    shown++;
  }
}