# ============================================
# v6.1.0 Version Bump Script
# ============================================

$file = "src\data\versionHistory.ts"

# 1. Backup
Copy-Item $file "$file.backup" -Force
Write-Host "✅ Backup: $file.backup" -ForegroundColor Green

# 2. Read
$content = Get-Content $file -Raw

# 3. Bump version constants
$content = $content -replace "export const CURRENT_APP_VERSION = 'v5\.3\.31';", "export const CURRENT_APP_VERSION = 'v6.1.0';"
$content = $content -replace "export const CURRENT_BUILD_NUMBER = 147;", "export const CURRENT_BUILD_NUMBER = 148;"

# 4. New entry
$newEntry = @'
  {
    version: 'v6.1.0',
    buildNumber: 148,
    releaseDate: '2026-10-05',
    releaseTime: '6:00 PM (MMT)',
    titleMy: 'Sync & PWA Stabilization (React #321, ngwe_lang, Delete Propagation ပြုပြင်ခြင်း)',
    titleEn: 'Sync & PWA Stabilization',
    tag: 'fix',
    tagLabelMy: 'အရေးကြီး ပြင်ဆင်ချက်',
    tagLabelEn: 'Critical Bug Fixes',
    descriptionMy: 'React Error #321, ngwe_lang JSON crash, cross-device delete propagation နှင့် iOS PWA install issues များကို အောင်မြင်စွာ ဖြေရှင်းပြီးပါပြီ။',
    descriptionEn: 'Resolved React Error #321, ngwe_lang JSON parse crash, cross-device delete propagation, and iOS PWA install issues.',
    changesMy: [
      'React Error #321 — setupListeners function ထဲမှ nested useEffect ဖျက်ပြီး Rules of Hooks လိုက်နာပါပြီ။',
      'chart-vendor chunk ဖျက်ပြီး React family ကို single copy ဖြစ်စေပါပြီ။',
      'ngwe_lang JSON parse crash — legacy raw string များကို migrate လုပ်ပြီး duplicate useEffect များ ဖျက်ပါပြီ။',
      'Cross-device delete propagation — syncQueue-only push strategy ဖြင့် ဖျက်လိုက်သော transactions များ ပြန်မပေါ်စေရန် ကာကွယ်ပါပြီ။',
    ],
    changesEn: [
      'Fixed React Error #321 by removing nested useEffect inside setupListeners function.',
      'Eliminated chart-vendor chunk; React family now bundled as single copy.',
      'Fixed ngwe_lang JSON crash — migrated legacy raw strings and removed duplicate useEffect.',
      'Fixed cross-device delete propagation with syncQueue-only push strategy.',
    ],
  },
'@

# 5. Insert after array opening
$content = $content -replace "(export const VERSION_HISTORY: VersionItem\[\] = \[\r?\n)", "`$1$newEntry`r`n"

# 6. Save
Set-Content -Path $file -Value $content -Encoding UTF8 -NoNewline

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "✅ v6.1.0 Bump Complete!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Verify:" -ForegroundColor Yellow
Write-Host "  Select-String -Path $file -Pattern 'v6.1.0|148'" -ForegroundColor Gray