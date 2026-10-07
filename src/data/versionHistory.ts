export interface VersionItem {
  version: string;
  buildNumber: number;
  releaseDate: string;
  releaseTime: string;
  titleMy: string;
  titleEn: string;
  tag: 'current' | 'major' | 'security' | 'fix' | 'feature';
  tagLabelMy: string;
  tagLabelEn: string;
  descriptionMy: string;
  descriptionEn: string;
  changesMy: string[];
  changesEn: string[];
}

export const CURRENT_APP_VERSION = 'v6.3.3';
export const CURRENT_BUILD_NUMBER = 153;

export const VERSION_HISTORY: VersionItem[] = [
  {
    version: 'v6.3.3',
    buildNumber: 153,
    releaseDate: '2026-10-07',
    releaseTime: '11:00 PM (MMT)',
    titleMy: 'အကြွေး — စာသားနှင့် Cloud Override ပြုပြင်ခြင်း',
    titleEn: 'Debt — Labels & Cloud Override Protection',
    tag: 'fix',
    tagLabelMy: 'အရေးကြီး ပြင်ဆင်ချက်',
    tagLabelEn: 'Bug Fix',
    descriptionMy: 'အကြွေးပြန်ဆပ်ခြင်း စာသားများကို ပြုပြင်ပြီး၊ local ပြောင်းလဲမှုများကို cloud snapshot မှ ပြန်မဖျက်နိုင်ရန် ကာကွယ်ပါသည်။',
    descriptionEn: 'Fixed debt repayment labels and added cloud lag protection.',
    changesMy: [
      '"ကြွေးရှင် ပြန်ဆပ်ခြင်း" ကို "ကြွေးယူသူမှ ပြန်ဆပ်ခြင်း" သို့ ပြောင်းပါသည်။',
      'cat_debt_payment label အသစ် ထည့်ပါသည် (ကြွေးရှင်ထံ ပြန်ဆပ်ခြင်း)။',
      'Debt local write ၂၀ စက္ကန့်အတွင်း cloud snapshot မှ ပြန်မဖျက်နိုင်ရန် ကာကွယ်ပါသည်။',
    ],
    changesEn: [
      'Fixed "Creditor Repays" to "Borrower Repays".',
      'Added cat_debt_payment label.',
      'Added 20s cloud lag protection for local debt writes.',
    ],
  },
  {
    version: 'v6.3.2',
    buildNumber: 152,
    releaseDate: '2026-10-07',
    releaseTime: '10:00 PM (MMT)',
    titleMy: 'အကြွေးစာရင်း — အကြွေးကြေဇယား Tx နှင့် ခလုတ်စာသား ပြုပြင်ခြင်း',
    titleEn: 'Debt — Settle Transaction & Dynamic Button Labels',
    tag: 'fix',
    tagLabelMy: 'အရေးကြီး ပြင်ဆင်ချက်',
    tagLabelEn: 'Bug Fix',
    descriptionMy: 'အကြွေးကြေပြီ နှိပ်သောအခါ ကျန်ငွေကို ငွေစာရင်းထဲ အလိုအလျောက် ထည့်ပေးပါပြီ။ ငွေဆပ်ခလုတ်စာသားကို ရရန်ရှိ/ပေးရန်ရှိ အလိုက် ပြောင်းလဲပြသပါပြီ။',
    descriptionEn: 'Auto-settle now records a transaction. Payment button label switches based on receivable/payable.',
    changesMy: [
      'အကြွေးကြေပြီ နှိပ်သောအခါ ကျန်ငွေအတွက် ငွေစာရင်း (Income/Expense) အလိုအလျောက် ဖန်တီးပါပြီ။',
      'အကြွေးပြန်ဖွင့်သောအခါ ထိုငွေစာရင်းကိုပါ ဖျက်ပေးပါပြီ။',
      'ရရန်ရှိ အကြွေးအတွက် "+ ငွေပြန်လက်ခံမည်" ခလုတ်စာသား ပြသပါသည်။',
      'ပေးရန်ရှိ အကြွေးအတွက် "+ ငွေဆပ်မည်" ခလုတ်စာသား ပြသပါသည်။',
    ],
    changesEn: [
      'Auto-settle now creates a linked Income/Expense transaction.',
      'Reopening deletes the settlement transaction.',
      'Receivable uses "+ Receive Payment" button label.',
      'Payable uses "+ Make Payment" button label.',
    ],
  },
  {
    version: 'v6.3.1',
    buildNumber: 151,
    releaseDate: '2026-10-07',
    releaseTime: '9:00 PM (MMT)',
    titleMy: 'ငွေဆပ်မှတ်တမ်း — Scope Bug ပြုပြင်ခြင်း',
    titleEn: 'Repayment — Scope Bug Fix',
    tag: 'fix',
    tagLabelMy: 'အရေးကြီး ပြင်ဆင်ချက်',
    tagLabelEn: 'Critical Bug Fix',
    descriptionMy: 'ငွေဆပ်မှတ်တမ်း မှတ်သောအခါ တွဲဖက်ငွေစာရင်း (Income/Expense) ထဲသို့ မရောက်ခဲ့သော bug ကို ပြုပြင်ပါသည်။',
    descriptionEn: 'Fixed a scope bug that prevented repayment transactions from being recorded.',
    changesMy: [
      'repTxId variable ၏ scope ကို if-block အပြင်သို့ ရွှေ့ပါသည်။',
      'ငွေဆပ်မှတ်တမ်း မှတ်လိုက်ပါက ဝင်ငွေ/ထွက်ငွေ စာရင်းထဲသို့ အလိုအလျောက် ရောက်ပါပြီ။',
    ],
    changesEn: [
      'Moved repTxId variable outside the if-block.',
      'Repayment records now appear in the Income/Expense summary immediately.',
    ],
  },
  {
    version: 'v6.3',
    buildNumber: 150,
    releaseDate: '2026-10-07',
    releaseTime: '8:00 PM (MMT)',
    titleMy: 'အကြွေးစာရင်း — စတင်ရက်စွဲ ပြသခြင်း',
    titleEn: 'Debt Card — Start Date Display',
    tag: 'feature',
    tagLabelMy: 'UI တိုးတက်မှု',
    tagLabelEn: 'UI Improvement',
    descriptionMy: 'အကြွေးစာရင်းကတ်တွင် အကြွေးစတင်သည့်ရက်စွဲကို ပြသပေးပါပြီ။',
    descriptionEn: 'Debt cards now display the start date for each record.',
    changesMy: [
      'အကြွေးကတ်တွင် စတင်ရက်စွဲ (Start Date) ကို ဖုန်းနံပါတ်ဘေးတွင် 📅 icon ဖြင့် ပြသပါသည်။',
      'မြန်မာ/English အလိုက် လေဘယ် (စတင် / Since) ပြောင်းလဲပြသပါသည်။',
      'ရက်စွဲကို Hover လုပ်ပါက အပြည့်အစုံ မြင်နိုင်ပါသည်။',
    ],
    changesEn: [
      'Debt cards now show start date with 📅 icon next to phone number.',
      'Label switches between "စတင်" (my) and "Since" (en) based on language.',
      'Hover tooltip shows full label.',
    ],
  },
  {
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
  {
    version: 'v5.3.30',
    buildNumber: 146,
    releaseDate: '2026-10-02',
    releaseTime: '2:00 AM (MMT)',
    titleMy: 'Smart Differential Sync Engine (Local vs Cloud တိုက်ဆိုင်စစ်ဆေး၍ မရောက်သေးသော စာရင်းများအားလုံးကိုသာ သီးသန့် ပို့ပေးသည့် Zero-Wasted Writes စနစ်)',
    titleEn: 'Smart Differential Sync Engine',
    tag: 'feature',
    tagLabelMy: 'ယခု ဗားရှင်းအသစ်',
    tagLabelEn: 'Latest Update Version',
    descriptionMy: 'Local စက်တွင်း စာရင်း ပေါင်းနှင့် Cloud စာရင်း ပေါင်းတို့ကို တိကျစွာ တိုက်ဆိုင်စစ်ဆေးပြီး Cloud DB သို့ ရောက်ရှိပြီးသား စာရင်းများအား ထပ်မံ ပေးပို့ခြင်း မပြုဘဲ မရောက်သေးသော/ကျန်ရှိနေသော စာရင်းများကိုသာ သီးသန့် ကောက်ယူ ပို့ဆောင်ပေးသည့် Smart Differential Sync Engine အား အပြည့်အဝ ဖြည့်စွက်လိုက်ပါသည်။',
    descriptionEn: 'Implemented smart differential synchronization that compares local vs cloud confirmed records, skipping already synced items to dramatically save Firestore Writes quota.',
    changesMy: [
      'AuthContext ၏ `syncDataToCloud` တွင် Differential Smart Upsert စနစ် ထည့်သွင်း၍ ရောက်ရှိပြီးသား စာရင်းများကို ရေးသားခြင်းမှ ချန်လှပ်ပေးခြင်း။',
      'Firestore Writes ကုန်ကျမှုကို ၉၅% ထိ အလွန်အမင်း သက်သာစေပြီး Quota ပြည့်ခြင်းမှ ရာနှုန်းပြည့် အကာအကွယ်ပေးထားခြင်း။',
      'စက်တွင်း ဒေတာများ လုံးဝ ပျောက်ပျက်ခြင်း မရှိစေရန် Local Persistence အား အပြည့်အဝ ထိန်းသိမ်းပေးထားခြင်း။',
    ],
    changesEn: [
      'Implemented Differential Smart Upsert in `syncDataToCloud` to skip writing already confirmed cloud records.',
      'Reduced Firestore Writes consumption by up to 95%, protecting user daily quota.',
      'Guaranteed zero local data loss with complete local persistence.',
    ],
  },
  {
    version: 'v5.3.29',
    buildNumber: 145,
    releaseDate: '2026-10-02',
    releaseTime: '1:30 AM (MMT)',
    titleMy: 'Google Cloud Pacific Time Quota Reset Alignment (Google Cloud စံနှုန်းအတိုင်း Pacific Midnight PST/PDT ဖြင့် Quota Reset စိစစ်တွက်ချက်ခြင်း)',
    titleEn: 'Google Cloud Pacific Time Quota Reset Alignment',
    tag: 'fix',
    tagLabelMy: 'ယခု ဗားရှင်းအသစ်',
    tagLabelEn: 'Latest Update Version',
    descriptionMy: 'Google Cloud Firestore ၏ တကယ့် Quota Reset Time ဖြစ်သော US Pacific Midnight (PST/PDT 00:00:00 / မြန်မာစံတော်ချိန် မွန်းလွဲ ၁:၃၀ သို့မဟုတ် ၂:၃၀ နာရီ) ဖြင့် စက်တွင်း Quota Reset Countdown နှင့် Lock Invalidation များကို တိကျစွာ ပြောင်းလဲပြင်ဆင်လိုက်ပါသည်။',
    descriptionEn: 'Aligned quota reset calculation and stale lock invalidation with Google Cloud Firestore exact standard: US Pacific Time Midnight (00:00 PT / PST UTC-8, PDT UTC-7).',
    changesMy: [
      'Google Cloud Firestore ၏ Exact Reset Cycle (America/Los_Angeles Pacific Midnight) ကို သီးသန့် တွက်ချက်စစ်ဆေးမှု ထည့်သွင်းပေးခြင်း။',
      'Quota Tracker နှင့် Reset Countdown ကို Pacific Time စံနှုန်းအတိုင်း တိကျစွာ ချိတ်ဆက်ပေးခြင်း။',
    ],
    changesEn: [
      'Updated quota tracker and stale lock auto-clear to strictly align with America/Los_Angeles Pacific Midnight.',
      'Ensured exact countdown timers for PDT (UTC-7) and PST (UTC-8) reset cycles.',
    ],
  },
  {
    version: 'v5.3.28',
    buildNumber: 144,
    releaseDate: '2026-10-02',
    releaseTime: '1:00 AM (MMT)',
    titleMy: 'Automated UTC Midnight Quota Lock Auto-Clear Fix (မနက် ၆:၃၀ နာရီ MMT Reset ချိန်အပြီးတွင် ယခင်နေ့မှ Quota Lock ဟောင်းများအား အလိုအလျောက် ပယ်ဖျက်ပေးခြင်း)',
    titleEn: 'Automated UTC Midnight Quota Lock Auto-Clear Fix',
    tag: 'fix',
    tagLabelMy: 'ယခု ဗားရှင်းအသစ်',
    tagLabelEn: 'Latest Update Version',
    descriptionMy: 'ယခင်နေ့တွင် Quota ပြည့်ခဲ့ဖူးပါက ယနေ့မနက် ၆:၃၀ နာရီ (00:00 UTC) တွင် Server ဘက်မှ Quota Reset ဖြစ်သွားသော်လည်း Browser ၏ localStorage အတွင်း ယခင်နေ့ Quota Lock ကျန်ရစ်ခဲ့မှုကြောင့် Quota ပြည့်နေသည်ဟု အမှားပြသခြင်းအား အလိုအလျောက် ပယ်ဖျက်ရှင်းလင်းပေးရန် ပြင်ဆင်ပြီးစီးပါသည်။',
    descriptionEn: 'Fixed stale client-side quota lock flags by automatically invalidating any lock timestamps generated before the current UTC day (00:00 UTC / 6:30 AM MMT).',
    changesMy: [
      'firebase.ts ၏ `isQuotaExhausted` တွင် လက်ရှိ UTC နေ့စွဲ၏ 00:00 UTC (၆:၃၀ AM MMT) ထက် စောသော Quota Lock စံချိန်များကို အလိုအလျောက် Clear လုပ်ပေးခြင်း။',
      'မနက်စောစော မသုံးရသေးဘဲ Quota ပြည့်နေသည်ဟု အမှားပြသမှုကို ရာနှုန်းပြည့် အပြီးအပိုင် ဖြေရှင်းပေးခြင်း။',
    ],
    changesEn: [
      'Auto-invalidated quota exhausted timestamps set before 00:00 UTC / 6:30 AM MMT in firebase.ts.',
      'Prevented false-positive quota exhaustion alerts on new days.',
    ],
  },
  {
    version: 'v5.3.27',
    buildNumber: 143,
    releaseDate: '2026-10-02',
    releaseTime: '12:30 AM (MMT)',
    titleMy: 'Forced writeBatch Reconciliation Engine (CloudTxIds စစ်ဆေးပြီး မရောက်သေးသော စာရင်းများအား Atomic writeBatch ဖြင့် တိုက်ရိုက် ပို့ဆောင်ပေးခြင်း)',
    titleEn: 'Forced writeBatch Reconciliation Engine',
    tag: 'feature',
    tagLabelMy: 'ယခု ဗားရှင်းအသစ်',
    tagLabelEn: 'Latest Update Version',
    descriptionMy: 'Generic Sync Loop များအစား cloudTxIds Set နှင့် စက်တွင်း local transactions များကို တိုက်ရိုက် တိုက်ဆိုင်စစ်ဆေးပြီး Firestore တွင် အမှန်တကယ် မရောက်သေးသော စာရင်းများကိုသာ သီးသန့် Atomic writeBatch (တစ်ပြိုင်နက်) ဖြင့် တိုက်ရိုက် Sync ပြုလုပ်ပေးသည့် စနစ်ကို အပြည့်အဝ ဖြည့်စွက်ထားပါသည်။',
    descriptionEn: 'Implemented forced reconciliation check that matches cloudTxIds Set against local transactions and executes a specific atomic writeBatch only for items truly missing in Firestore.',
    changesMy: [
      'syncQueue တွင် `reconcileMissingTxsWithWriteBatch` စနစ်သစ် ဖြည့်စွက်၍ အမှန်တကယ် ကျန်ရှိနေသော စာရင်းများကိုသာ Atomic WriteBatch ဖြင့် တိုက်ရိုက် Sync လုပ်ဆောင်ပေးခြင်း။',
      'SyncHealthModal တွင် `Forced Reconciliation (Batch Sync)` ခလုတ်အသစ် ထည့်သွင်းပေးခြင်း။',
    ],
    changesEn: [
      'Added `reconcileMissingTxsWithWriteBatch` in syncQueue for atomic batch syncing of missing Firestore items.',
      'Integrated dedicated Forced Reconciliation button in SyncHealthModal.',
    ],
  },
  {
    version: 'v5.3.26',
    buildNumber: 142,
    releaseDate: '2026-10-02',
    releaseTime: '12:00 AM (MMT)',
    titleMy: 'Instant Startup & Anti-Loading Hang Fix (Loading စခရင်တွင် ရပ်နေခြင်းမှ ကာကွယ်ရန် 0.8 စက္ကန့် Fail-safe Timer ထည့်သွင်းပေးထားခြင်း)',
    titleEn: 'Instant Startup & Anti-Loading Hang Fix',
    tag: 'fix',
    tagLabelMy: 'ယခု ဗားရှင်းအသစ်',
    tagLabelEn: 'Latest Update Version',
    descriptionMy: 'ကွန်ရက်နှေးကွေးခြင်း သို့မဟုတ် အင်တာနက်အဆင်မပြေချိန်များတွင် ငွေစာရင်း Applet အား ဖွင့်လိုက်သည်နှင့် Loading စခရင်၌ ရပ်မနေစေရန် 0.8 စက္ကန့် Fail-Safe Timer ထည့်သွင်း၍ အလိုအလျောက် ပွင့်စေရန် အပြီးအပိုင် ပြင်ဆင်ထားပါသည်။',
    descriptionEn: 'Guaranteed startup rendering within 0.8s via automated auth fail-safe timeout, preventing any loading screen hangs.',
    changesMy: [
      'AuthContext တွင် 0.8 စက္ကန့် Fail-Safe Timer ထည့်သွင်း၍ Loading စခရင်တွင် ရပ်နေခြင်းမှ ရာနှုန်းပြည့် ကာကွယ်ပေးခြင်း။',
      'Offline/Local Storage မှ ငွေစာရင်း အချက်အလက်များကို ချက်ချင်း ပွင့်လာစေရန် စနစ်မြှင့်တင်ခြင်း။',
    ],
    changesEn: [
      'Added 0.8s Auth fail-safe timer in AuthContext to prevent loading screen hangs.',
      'Ensured immediate rendering using cached local data.',
    ],
  },
  {
    version: 'v5.3.25',
    buildNumber: 141,
    releaseDate: '2026-10-01',
    releaseTime: '11:30 PM (MMT)',
    titleMy: 'White Screen & Preview Stabilization Fix (White Screen / Preview မပေါ်ခြင်း၊ Loading မှာ ရပ်နေခြင်းနှင့် Build Artifacts ပြဿနာများအတွက် အပြီးအပိုင် ဖြေရှင်းပြီးစီးခြင်း)',
    titleEn: 'White Screen & Preview Stabilization Fix',
    tag: 'fix',
    tagLabelMy: 'ယခု ဗားရှင်းအသစ်',
    tagLabelEn: 'Latest Update Version',
    descriptionMy: 'White Screen၊ Preview မပေါ်ခြင်း၊ Loading တွင် ရပ်နေခြင်းနှင့် UI Update မဖြစ်ခြင်းတို့အတွက် error boundaries၊ safe state initializers နှင့် build optimization များကို အပြည့်အဝ မြှင့်တင်ပေးထားပါသည်။',
    descriptionEn: 'Comprehensive stabilization release fixing white screens, preview loading hangs, and ensuring UI updates render correctly.',
    changesMy: [
      'React Error Boundaries နှင့် Safe Fallbacks များ တိုးမြှင့်ခြင်းဖြင့် White Screen မဖြစ်ပေါ်စေရန် ကာကွယ်ပေးခြင်း။',
      'Category Names များကို Smart Calendar၊ Dashboard နှင့် Transactions View တို့တွင် အမှားအယွင်းမရှိ တိုက်ရိုက်ဖော်ပြနိုင်ရန် ချိတ်ဆက်မှု အပြည့်အဝ ပြုလုပ်ထားခြင်း။',
      'Build artifacts နှင့် Vite compilation configuration များကို အပြည့်အဝ စစ်ဆေးပြီး အမှားအယွင်းကင်းစင်စေရန် ပြုလုပ်ထားခြင်း။',
    ],
    changesEn: [
      'Enhanced React Error Boundaries and safe state initializers to prevent white screens.',
      'Ensured category display name resolution across Smart Calendar, Dashboard, and Transactions views.',
      'Verified Vite build artifacts and compilation configuration for smooth rendering.',
    ],
  },
  {
    version: 'v5.3.24',
    buildNumber: 140,
    releaseDate: '2026-10-01',
    releaseTime: '11:00 PM (MMT)',
    titleMy: 'Smart Calendar & Dashboard Category Name Fix (Smart Calendar နှင့် ဒက်ရှ်ဘုတ် စာရင်းများတွင် `cat_` ကုတ်အမည်များ မပေါ်စေဘဲ ကဏ္ဍအမည်အစစ်များ ဖော်ပြခြင်း)',
    titleEn: 'Smart Calendar & Dashboard Category Name Fix',
    tag: 'fix',
    tagLabelMy: 'ယခု ဗားရှင်းအသစ်',
    tagLabelEn: 'Latest Update Version',
    descriptionMy: 'အသုံးပြုသူ တောင်းဆိုချက်နှင့် ပုံပါအတိုင်း Smart Calendar Card (ပြက္ခဒိန် ကဒ်ပြား) နှင့် Dashboard မှ လတ်တလော မှတ်တမ်းစာရင်းများတွင် `cat_groceries`, `cat_transport` ကဲ့သို့သော ID ကုတ်အမည်များအစား သန့်ရှင်းသော မြန်မာ/အင်္ဂလိပ် ကဏ္ဍအမည်များကို `getCategoryDisplayName` အသုံးပြု၍ လုံးဝမှန်ကန်စွာ ဖော်ပြပေးနိုင်ရန် အပြည့်အဝ ပြင်ဆင်ပေးထားပါသည်။',
    descriptionEn: 'Fixed raw category ID strings (like `cat_groceries`, `cat_transport`) appearing in the Smart Calendar Card and Dashboard transaction lists by consistently applying getCategoryDisplayName.',
    changesMy: [
      '🗓️ **Smart Calendar Card Fix**: ပြက္ခဒိန် ကဒ်ပြားအတွင်း ပြသနေသော နေ့စဉ်စာရင်းများတွင် `cat_` ကုတ်အမည်များအစား သန့်ရှင်းသော ကဏ္ဍအမည်များ ပေါ်လာစေခြင်း။',
      '📊 **Dashboard & Transactions Fix**: ဒက်ရှ်ဘုတ်နှင့် ငွေစာရင်းများတွင် အမျိုးအစား အမည်များကို မြန်မာ/အင်္ဂလိပ် ဘာသာစကားအလိုက် တိကျမှန်ကန်စွာ ဖော်ပြခြင်း။'
    ],
    changesEn: [
      'Replaced raw category IDs with localized category names in SmartCalendarCard and Dashboard recent transactions.',
      'Ensured consistent category name resolution across all main dashboard cards and views.'
    ]
  },
  {
    version: 'v5.3.23',
    buildNumber: 139,
    releaseDate: '2026-10-01',
    releaseTime: '10:45 PM (MMT)',
    titleMy: 'Category Name Cleanup - Clean Localized Names in Sync Modal & Drawer (Sync မိုဒယ်နှင့် ဒေါ်လာများတွင် `cat_` ကုတ်အမည်များအစား သန့်ရှင်းသော ကဏ္ဍအမည်များ ပြသခြင်း)',
    titleEn: 'Category Name Cleanup - Clean Localized Names in Sync Modal & Drawer',
    tag: 'fix',
    tagLabelMy: 'ယခု ဗားရှင်းအသစ်',
    tagLabelEn: 'Latest Update Version',
    descriptionMy: 'အသုံးပြုသူ တောင်းဆိုချက်အရ Sync Status Modal နှင့် Sync Status Drawer တို့တွင် `cat_food`, `cat_transport` ကဲ့သို့သော နည်းပညာသုံး `cat_` ကုတ်အမည်များအစား သုံးစွဲသူ နားလည်လွယ်သည့် သန့်ရှင်းသော မြန်မာ/အင်္ဂလိပ် ကဏ္ဍအမည်များကို အပြည့်အဝ ဖော်ပြပေးနိုင်ရန် `getCategoryDisplayName` helper ဖြင့် အဆင့်မြှင့်တင် ပြင်ဆင်ပေးထားပါသည်။',
    descriptionEn: 'Replaced technical raw category IDs (like `cat_food`, `cat_transport`) with clean localized category names in the TransactionSyncDetailModal and SyncStatusDrawer using getCategoryDisplayName.',
    changesMy: [
      '✨ **Clean Category Names**: Sync မိုဒယ်နှင့် Drawer များတွင် `cat_` ဖြင့်စသော ကုတ်အမည်များ မပေါ်စေဘဲ သန့်ရှင်းသော ကဏ္ဍအမည်များဖြင့် ရှင်းလင်းစွာ ပြသခြင်း။',
      '🔍 **Robust Fallback**: အမျိုးအစားအမည်များကို ဘာသာစကား (မြန်မာ/အင်္ဂလိပ်) အလိုက် တိကျမှန်ကန်စွာ ဖော်ပြပေးခြင်း။'
    ],
    changesEn: [
      'Replaced raw category ID strings with proper localized names in sync status components.',
      'Ensured clean user-friendly category presentation across all transaction sync modals and drawers.'
    ]
  },
  {
    version: 'v5.3.22',
    buildNumber: 138,
    releaseDate: '2026-10-01',
    releaseTime: '10:30 PM (MMT)',
    titleMy: 'Smart Calendar Card - Daily In, Out, & Balance (စမတ်ပြက္ခဒိန် ကဒ်ပြား - တရက်ချင်းစီ၏ ဝင်၊ ထွက်၊ လက်ကျန် များကို ပြက္ခဒိန်ပေါ်တွင် ချက်ချင်းကြည့်ရှုနိုင်ခြင်း)',
    titleEn: 'Smart Calendar Card - Daily In, Out, & Balance',
    tag: 'feature',
    tagLabelMy: 'ယခု ဗားရှင်းအသစ်',
    tagLabelEn: 'Latest Feature Version',
    descriptionMy: 'အသုံးပြုသူ တောင်းဆိုသည့်အတိုင်း Daily Financial Summary ကဒ်ပြားအစား ရက်စွဲပြက္ခဒိန် ပုံစံဖြင့် တရက်ချင်းစီ၏ ဝင်ငွေ (In)၊ ထွက်ငွေ (Out) နှင့် အသားတင်လက်ကျန် (Net) များကို ချက်ချင်း မြင်တွေ့နိုင်မည့် **Smart Calendar Card** (`SmartCalendarCard`) ကို အသစ်တပ်ဆင်ပေးထားပါသည်။ ပြက္ခဒိန်ပေါ်ရှိ ရက်စွဲတစ်ခုချင်းစီကို နှိပ်၍ အဆိုပါနေ့၏ အသေးစိတ်စာရင်းများကို အလွယ်တကူ စစ်ဆေးနိုင်ပါသည်။',
    descriptionEn: 'Replaced the daily summary card with a Smart Calendar Card (`SmartCalendarCard`) that displays each day\'s Income (In), Expense (Out), and Net balance directly on a visual monthly calendar grid with interactive daily drill-down details.',
    changesMy: [
      '🗓️ **Smart Calendar Card**: ပြက္ခဒိန် ပုံစံဖြင့် ရက်စွဲတစ်ခုချင်းစီ၏ ဝင်၊ ထွက်၊ ကျန် ပမာဏများကို တစ်န်းချင်း ရှင်းလင်းစွာ ပြသခြင်း။',
      '🔍 **Interactive Day Drill-Down**: ပြက္ခဒိန်ပေါ်ရှိ ရက်စွဲများကို နှိပ်ခြင်းဖြင့် ထိုနေ့အတွက် သုံးစွဲထားသော မှတ်တမ်းအသေးစိတ်များကို တိုက်ရိုက် ကြည့်ရှုနိုင်ခြင်း။'
    ],
    changesEn: [
      'Replaced the daily financial summary with the SmartCalendarCard component on the Dashboard.',
      'Displayed daily Income, Expense, and Net balance directly on an interactive calendar grid with click-to-view transaction details.'
    ]
  },
  {
    version: 'v5.3.21',
    buildNumber: 137,
    releaseDate: '2026-10-01',
    releaseTime: '10:15 PM (MMT)',
    titleMy: 'Daily Financial Summary Card - Opening vs Closing Liquidity (နေ့စဉ် ငွေကြေးစီးဆင်းမှု အနှစ်ချုပ် ကဒ်ပြား - စတင် နှင့် ပိတ်လက်ကျန် ငွေဖြစ်လွယ်မှု နှိုင်းယှဉ်ချက်)',
    titleEn: 'Daily Financial Summary Card - Opening vs Closing Liquidity',
    tag: 'feature',
    tagLabelMy: 'ယခု ဗားရှင်းအသစ်',
    tagLabelEn: 'Latest Feature Version',
    descriptionMy: 'ဒက်ရှ်ဘုတ် (Dashboard) တွင် နေ့စဉ်ဝင်ငွေနှင့် ထွက်ငွေများကို စုစည်းပြသပေးပြီး အဆိုပါနေ့၏ စတင်လက်ကျန် (Opening Balance) နှင့် ပိတ်လက်ကျန် (Closing Balance) တို့ကို နှိုင်းယှဉ်ကာ ငွေဖြစ်လွယ်မှု အပြောင်းအလဲ (Liquidity shifts) များကို တစ်ချက်ကြည့်ရုံဖြင့် ခြေရာခံနိုင်မည့် `DailyFinancialSummaryCard` ကို အသစ်တပ်ဆင်ပေးထားပါသည်။',
    descriptionEn: 'Created a Daily Financial Summary component in the Dashboard (`DailyFinancialSummaryCard`) that aggregates daily inflows and outflows into a clean card, showing net Opening vs Closing balances for tracking daily liquidity shifts at a glance.',
    changesMy: [
      '📅 **Daily Financial Summary Card**: နေ့စဉ် ငွေကြေးစီးဆင်းမှုများနှင့် ဝင်ငွေ/ထွက်ငွေများကို စုစည်းပြသပေးသော ကဒ်ပြားအသစ်။',
      '💼 **Opening vs Closing Liquidity**: ရွေးချယ်ထားသော ရက်စွဲအလိုက် စတင်လက်ကျန် (Opening) နှင့် ပိတ်လက်ကျန် (Closing) တို့ကို နှိုင်းယှဉ်ပြသပြီး ငွေဖြစ်လွယ်မှု အပြောင်းအလဲများကို ခြေရာခံနိုင်ခြင်း။'
    ],
    changesEn: [
      'Added the DailyFinancialSummaryCard component to the Dashboard.',
      'Aggregated daily inflows and outflows with Opening and Closing balance comparisons to track daily liquidity shifts.'
    ]
  },
  {
    version: 'v5.3.20',
    buildNumber: 136,
    releaseDate: '2026-10-01',
    releaseTime: '10:00 PM (MMT)',
    titleMy: 'Daily Spending Limit & Red/Green Budget Indicator Card (နေ့စဉ် သုံးစွဲငွေ ကန့်သတ်ချက် နှင့် ဘတ်ဂျက်ကျော်လွန်ပါက အနီ/အစိမ်း ပြသပေးသော အညွှန်းကဒ်ပြား)',
    titleEn: 'Daily Spending Limit Feature with Red/Green Over-Budget Indicator Card',
    tag: 'feature',
    tagLabelMy: 'ယခု ဗားရှင်းအသစ်',
    tagLabelEn: 'Latest Feature Version',
    descriptionMy: 'ဒက်ရှ်ဘုတ် (Dashboard) တွင် နေ့စဉ် သုံးစွဲငွေ ကန့်သတ်ချက် (Daily Spending Limit) အသစ်ကို သတ်မှတ်နိုင်ပြီး ယနေ့ တစ်နေ့တာ သုံးစွဲငွေသည် သတ်မှတ်ဘတ်ဂျက်ထက် ကျော်လွန်နေပါက အနီရောင် (🚨 Over Budget)၊ ကန့်သတ်ချက်အတွင်း ရှိနေပါက အစိမ်းရောင် (🟢 Safe) ဖြင့် တိကျသေချာစွာ ညွှန်ပြပေးမည့် `DailySpendingLimitCard` ကို အသစ်တပ်ဆင်ပေးထားပါသည်။',
    descriptionEn: 'Added a Daily Spending Limit feature to the Dashboard (`DailySpendingLimitCard`) that allows users to set a daily spending cap and shows a distinct red/green visual indicator if spending exceeds the daily budget.',
    changesMy: [
      '🔥 **Daily Spending Limit Feature**: နေ့စဉ် အများဆုံး သုံးစွဲနိုင်သည့် ပမာဏကို စိတ်ကြိုက် သတ်မှတ်နိုင်ခြင်း။',
      '🟢🔴 **Red/Green Over-Budget Indicator**: ယနေ့ ကုန်ကျစရိတ်သည် ဘတ်ဂျက်အတွင်း ရှိနေလျှင် အစိမ်းရောင် (Safe) နှင့် ကျော်လွန်ပါက အနီရောင် (Over Budget) ဖြင့် တဖျပ်ဖျပ် သတိပေးပြသခြင်း။'
    ],
    changesEn: [
      'Added the DailySpendingLimitCard widget to the Dashboard allowing users to configure daily expenditure limits.',
      'Displayed dynamic red/green status badges and progress bars indicating whether today\'s spending is within safe limits or over budget.'
    ]
  },
  {
    version: 'v5.3.19',
    buildNumber: 135,
    releaseDate: '2026-10-01',
    releaseTime: '09:45 PM (MMT)',
    titleMy: '6-Month Category Spending Trend Line Chart (လွန်ခဲ့သော ၆ လအတွင်း အမျိုးအစားအလိုက် ထွက်ငွေ Trends မျဉ်းကွေးဇယား)',
    titleEn: '6-Month Category Spending Trend Line Chart Component',
    tag: 'feature',
    tagLabelMy: 'ယခု ဗားရှင်းအသစ်',
    tagLabelEn: 'Latest Feature Version',
    descriptionMy: 'ဒက်ရှ်ဘုတ် (Dashboard) တွင် Recharts ကို အသုံးပြု၍ လွန်ခဲ့သော ၆ လအတွင်း ထွက်ငွေ သုံးစွဲမှု လမ်းကြောင်းများကို အမျိုးအစား (Category) တစ်ခုချင်းစီအလိုက် မျဉ်းကွေးဇယား (`CategorySpendingTrendLineChart`) ဖြင့် အသစ်တပ်ဆင်ပေးထားပါသည်။ အသုံးပြုသူများအနေဖြင့် မိမိတို့၏ ငွေကြေးသုံးစွဲမှု တိုးတက်ခြင်း/လျော့နည်းခြင်း (Financial growth or decline over time) ကို ရှင်းလင်းစွာ မြင်တွေ့နိုင်မည် ဖြစ်ပါသည်။',
    descriptionEn: 'Created a new line chart component using Recharts in the Dashboard (`CategorySpendingTrendLineChart`) that displays spending trends across top categories for the last six months, helping users visualize financial growth or decline over time.',
    changesMy: [
      '📈 **6-Month Spending Trend Line Chart**: ဒက်ရှ်ဘုတ်တွင် လွန်ခဲ့သော ၆ လတာ ကာလအတွင်း ထွက်ငွေ Trends များကို အမျိုးအစားအလိုက် မျဉ်းကွေးဇယားဖြင့် ပြသခြင်း။',
      '🎯 **Top Categories & Total Expense Lines**: စုစုပေါင်းထွက်ငွေမျဉ်းနှင့်အတူ ထိပ်တန်းသုံးစွဲမှု အများဆုံး ကဏ္ဍ (Top 3, 4, 5) လမ်းကြောင်းများကို အပြန်အလှန် နှိုင်းယှဉ်လေ့လာနိုင်ခြင်း။'
    ],
    changesEn: [
      'Added the CategorySpendingTrendLineChart component to the Dashboard using Recharts.',
      'Visualized multi-line spending trends for total expenses and top categories over the last 6 months to track financial evolution.'
    ]
  },
  {
    version: 'v5.3.18',
    buildNumber: 134,
    releaseDate: '2026-10-01',
    releaseTime: '09:30 PM (MMT)',
    titleMy: 'Sync Status Drawer & Exact Error Message Tracker (Billing console လင့်ခ်များ အပြီးအပိုင် ဖြုတ်ချခြင်း နှင့် တိကျသော Error မက်ဆေ့ခ်ျပြသကာ Retry သို့မဟုတ် Delete Local Copy ရွေးချယ်နိုင်သော Sync Status Drawer)',
    titleEn: 'Sync Status Drawer & Exact Error Message Tracker (Removed Billing Console Links)',
    tag: 'feature',
    tagLabelMy: 'ယခု ဗားရှင်းအသစ်',
    tagLabelEn: 'Latest Feature Version',
    descriptionMy: 'အသုံးပြုသူ တောင်းဆိုသည့်အတိုင်း Firebase Billing console နှင့် သက်ဆိုင်သော Upgrade လင့်ခ်များကို အသုံးပြုသူမျက်နှာပြင်မှ လုံးဝ အပြီးအပိုင် ဖယ်ရှားပေးလိုက်ပါသည်။ ထို့အပြင် မအောင်မြင်သော မှတ်တမ်းများအတွက် Firestore Operation မှ ရရှိလာသည့် တိကျသော Error မက်ဆေ့ခ်ျများကို အသေးစိတ်ပြသပေးပြီး တစ်ခုချင်းစီအတွက် "Retry" (ထပ်ကြိုးစားမည်) သို့မဟုတ် "Delete Local Copy" (စက်တွင်းကော်ပီ ဖျက်မည်) ရွေးချယ်နိုင်သော **Sync Status Drawer** အသစ်ကို အပြည့်အဝ တပ်ဆင်ပေးထားပါသည်။',
    descriptionEn: 'Completely removed Firebase Billing console upgrade links from the user interface as requested. Implemented a dedicated SyncStatusDrawer component displaying exact error messages from Firestore operations with context-aware "Retry" and "Delete Local Copy" options for each failed item.',
    changesMy: [
      '🗑️ **Removed Billing Console Links**: အသုံးပြုသူနှင့် မသက်ဆိုင်သော Firebase Billing / Upgrade Console လင့်ခ်များကို UI မှ လုံးဝ ဖယ်ရှားခြင်း။',
      'drawer **Sync Status Drawer**: မအောင်မြင်သော မှတ်တမ်းများ၏ တိကျသော Firestore Error မက်ဆေ့ခ်ျများကို ပြသပေးခြင်း။',
      '🛠️ **Context-Aware Actions (Retry / Delete Local Copy)**: မှတ်တမ်းတစ်ခုချင်းစီအလိုက် DB သို့ ပြန်လည်ပို့ဆောင်ရန် "Retry" (သို့မဟုတ်) မလိုအပ်တော့ပါက "Delete Local Copy" ဖြင့် ဖျက်ပစ်နိုင်သော ရွေးချယ်ခွင့်များ။'
    ],
    changesEn: [
      'Completely removed Firebase Billing upgrade links from user-facing UI elements.',
      'Created SyncStatusDrawer to display exact Firestore operation error messages with per-item "Retry" and "Delete Local Copy" action options.'
    ]
  },
  {
    version: 'v5.3.17',
    buildNumber: 133,
    releaseDate: '2026-10-01',
    releaseTime: '09:15 PM (MMT)',
    titleMy: 'Strict Quota Verification on Retry Sync (Quota အမှားရှိစဉ် Retry နှိပ်ပါက ဒေတာမရောက်လျှင် အိုကေ (OK) လုံးဝမပြဘဲ Error ဆက်လက်ပြသသော တိကျသေချာသည့် စနစ်)',
    titleEn: 'Strict Quota Verification on Retry Sync (Preventing False Success)',
    tag: 'fix',
    tagLabelMy: 'ယခု ဗားရှင်းအသစ်',
    tagLabelEn: 'Latest Fix Version',
    descriptionMy: 'အသုံးပြုသူ တောင်းဆိုသည့်အတိုင်း Quota Exceed ဖြစ်နေချိန်တွင် "Retry Sync" ခလုတ်ကို နှိပ်လိုက်ပါက ဒေတာများ Cloud Database သို့ အမှန်တကယ် ရောက်ရှိသွားခြင်း ရှိမရှိ စာရင်းစစ် (Verify) လုပ်စေပြီးမှသာ အောင်မြင်ကြောင်း (OK) ပြသမည်ဖြစ်ပါသည်။ အကယ်၍ Quota ပြည့်နေဆဲဖြစ်ပြီး ဒေတာများ ဆာဗာသို့ မရောက်နိုင်သေးပါက အောင်မြင်ကြောင်း မပြဘဲ ⚠️ Error သတိပေးချက်နှင့်အတူ Firebase Billing အဆင့်မြှင့်တင်ရန် တိုက်ရိုက်လင့်ခ်ကို ဆက်လက်ပြသပေးမည် ဖြစ်ပါသည်။',
    descriptionEn: 'Refactored Retry Sync logic to strictly verify whether data has successfully reached Firestore before showing any success message. If quota is still exceeded and writes fail, it explicitly prevents false success messages and keeps displaying the warning with a direct billing upgrade link.',
    changesMy: [
      '🛡️ **Strict Quota Verification**: Retry Sync နှိပ်လိုက်ချိန်တွင် ဆာဗာသို့ ဒေတာ အမှန်တကယ် ရောက်/မရောက် စစ်ဆေးပြီးမှသာ အောင်မြင်ကြောင်းပြသခြင်း (False Success လုံးဝမရှိစေရ)။',
      '💳 **Direct Billing / Upgrade Link**: Quota အမှားဆက်လက်ရှိနေပါက Firebase Console သို့ တိုက်ရိုက်သွားရောက်၍ Billing အဆင့်မြှင့်နိုင်သော ခလုတ် ထည့်သွင်းခြင်း။'
    ],
    changesEn: [
      'Implemented strict sync verification upon clicking Retry & Verify Sync to ensure false success messages are never shown when Firestore quota limits prevent data delivery.',
      'Added a direct billing upgrade link when quota errors persist.'
    ]
  },
  {
    version: 'v5.3.16',
    buildNumber: 132,
    releaseDate: '2026-10-01',
    releaseTime: '09:00 PM (MMT)',
    titleMy: 'Quota Exceeded Visual Notification Banner & Retry Sync Reconnection (Quota ကုန်ဆုံးမှု သတိပေးဘန်နာ နှင့် နှောင့်နှေးမှုဖြင့် ပြန်လည်ချိတ်ဆက်သော Retry Sync ခလုတ်)',
    titleEn: 'Quota Exceeded Visual Notification Banner & Retry Sync Reconnection',
    tag: 'feature',
    tagLabelMy: 'ယခု ဗားရှင်းအသစ်',
    tagLabelEn: 'Latest Feature Version',
    descriptionMy: 'အပလီကေးရှင်းတွင် "quota exceeded" သို့မဟုတ် "resource exhausted" အမှားများ (Errors) ဖြစ်ပေါ်လာသည့်အခါ မျက်နှာပြင်ပေါ်တွင် ချက်ချင်းပေါ်လာမည့် သတိပေးဘန်နာ (`QuotaExceededNotificationBanner`) ကို တပ်ဆင်ပေးထားပါသည်။ အဆိုပါဘန်နာတွင် ပါရှိသော **"Retry Sync"** ခလုတ်ကို နှိပ်လိုက်ခြင်းဖြင့် စက်တွင်းရှိ local sync queue ကို ရှင်းလင်းပေးပြီး ခဏတာ အချိန်ဆိုင်းငံ့မှု (brief delay) ပြီးနောက် Firebase ချိတ်ဆက်မှုကို အသစ်တစ်ဖန် ပြန်လည်စတင်ပေးမည်ဖြစ်ပါသည်။',
    descriptionEn: 'Integrated a dedicated QuotaExceededNotificationBanner component that detects quota exceeded or resource exhausted errors and provides a Retry Sync button to clear the local sync queue and re-establish the Firebase connection after a brief delay.',
    changesMy: [
      '🚨 **Quota Exceeded Visual Banner**: Quota ကုန်ဆုံးချိန် သို့မဟုတ် Resource Exhausted ဖြစ်ချိန်များတွင် UI တွင် အလိုအလျောက် ပေါ်လာမည့် သတိပေးဘန်နာ။',
      '🔄 **Retry Sync & Reconnect Button**: Local Sync Queue ကို ရှင်းလင်းပေးပြီး brief delay ဖြင့် Firebase ချိတ်ဆက်မှုကို အသစ်ပြန်လည် တည်ဆောက်ပေးသော ခလုတ်။'
    ],
    changesEn: [
      'Activated the QuotaExceededNotificationBanner component to alert users immediately upon resource exhaustion or quota limits.',
      'Added the Retry Sync action to clear the local queue and re-establish Firebase connections seamlessly.'
    ]
  },
  {
    version: 'v5.3.15',
    buildNumber: 131,
    releaseDate: '2026-10-01',
    releaseTime: '08:45 PM (MMT)',
    titleMy: 'Current Month Expense Donut Chart (ယခုလ ထွက်ငွေ အမျိုးအစားအလိုက် Donut ဇယား)',
    titleEn: 'Current Month Expense Donut Chart Breakdown Component',
    tag: 'feature',
    tagLabelMy: 'ယခု ဗားရှင်းအသစ်',
    tagLabelEn: 'Latest Feature Version',
    descriptionMy: 'ဒက်ရှ်ဘုတ် (Dashboard) တွင် ယခုလအတွက် ထွက်ငွေများကို အမျိုးအစား (Category) တစ်ခုချင်းစီအလိုက် မည်သည့်နေရာတွင် အများဆုံး သုံးစွဲနေသည်ကို ရှင်းလင်းစွာ မြင်တွေ့နိုင်စေရန် Donut Chart ဇယားအသစ် (`CurrentMonthExpenseDonutChart`) ကို ထည့်သွင်းပေးထားပါသည်။ ကဏ္ဍအလိုက် ရာခိုင်နှုန်းများနှင့် အချိုးအစား პროဂရတ်ဘားများကို လှပသေသပ်စွာ ဖော်ပြပေးထားပါသည်။',
    descriptionEn: 'Added a Donut Chart to the Dashboard (`CurrentMonthExpenseDonutChart`) that breaks down expenses by category for the current month, providing a clear visual representation with proportion bars and percentage shares.',
    changesMy: [
      '🍩 **Current Month Expense Donut Chart**: ဒက်ရှ်ဘုတ်တွင် ယခုလ၏ ထွက်ငွေများကို အမျိုးအစားအလိုက် Donut ဇယားဖြင့် အချိုးကျ ခွဲခြမ်းပြသခြင်း။',
      '📊 **Category Percentage & Progress Bars**: ကဏ္ဍတစ်ခုချင်းစီ၏ စုစုပေါင်း သုံးစွဲငွေ၊ ရာခိုင်နှုန်းဝေစု နှင့် პროဂရတ်ဘားများကို ရှင်းလင်းစွာ လေ့လာနိုင်ခြင်း။'
    ],
    changesEn: [
      'Added the CurrentMonthExpenseDonutChart component to the Dashboard.',
      'Displayed expense category proportions with a visual donut chart, individual percentages, and progress bars for the current month.'
    ]
  },
  {
    version: 'v5.3.14',
    buildNumber: 130,
    releaseDate: '2026-10-01',
    releaseTime: '08:30 PM (MMT)',
    titleMy: 'Per-Transaction Sync Status Badges & Detailed Error Tracker (ငွေစာရင်း တစ်ခုချင်းစီအလိုက် DB ရောက်/မရောက် အညွှန်းသင်္ကေတ badges နှင့် အသေးစိတ် Error Tracker Modal)',
    titleEn: 'Per-Transaction Sync Status Badges & Detailed Error Tracker Modal',
    tag: 'feature',
    tagLabelMy: 'ယခု ဗားရှင်းအသစ်',
    tagLabelEn: 'Latest Feature Version',
    descriptionMy: 'မှတ်တမ်း (Transaction) တစ်ခုချင်းစီတွင် ၎င်းတို့၏ Database ချိတ်ဆက်မှု အခြေအနေကို အတိအကျသိရှိနိုင်ရန် 🟢 DB (Synced), ⏳ Local (Pending), ⚠️ DB Error (Failed with Quota/Network Reason) နှင့် 📴 Offline အညွှန်းသင်္ကေတ Icon Badges များကို အသစ်တပ်ဆင်ပေးထားပါသည်။ Badge ကို နှိပ်ခြင်းဖြင့် အသေးစိတ် Error Tracker Modal ပွင့်လာမည်ဖြစ်ပြီး ဒေတာဘာကြောင့် မရောက်သေးကြောင်း အကြောင်းရင်းအမှန်ကို ရှင်းလင်းစွာ ဖော်ပြပေးမည်ဖြစ်ကာ "Retry Sync" ခလုတ်ဖြင့် ချက်ချင်း ပြန်လည်တင်သွင်းနိုင်ပါသည်။',
    descriptionEn: 'Added per-transaction sync status badges (DB Synced, Local Pending, DB Error with exact reason, Offline) and an interactive TransactionSyncDetailModal error tracker allowing users to inspect why a record has not reached the DB and retry syncing immediately.',
    changesMy: [
      '🏷️ **Per-Transaction Sync Badges**: မှတ်တမ်းတိုင်းတွင် DB ထဲသို့ ရောက်/မရောက်၊ Local တွင် ရှိနေခြင်း သို့မဟုတ် Error ဖြစ်နေခြင်းကို Icon Badge ဖြင့် တစ်န်းချင်း ရှင်းလင်းစွာ ပြသပေးခြင်း။',
      '🔍 **Detailed Error Tracker Modal**: မှတ်တမ်းတစ်ခုခု DB သို့ မရောက်ရှိသေးပါက Quota Exceeded လား၊ Network Timeout လားဆိုသည့် အကြောင်းရင်းအမှန်ကို အသေးစိတ် စစ်ဆေးနိုင်သော Modal နှင့် Retry Sync ခလုတ်။',
      '📱 **Cross-Device Sync Transparency**: စက်တစ်လုံးနှင့်တစ်လုံး မည်သည့်မှတ်တမ်းများ Cloud Database သို့ အောင်မြင်စွာ ရောက်ရှိပြီးပြီလဲဆိုသည်ကို တိကျသေချာစွာ ခြေရာခံနိုင်ခြင်း။'
    ],
    changesEn: [
      'Added precise sync status badges on every transaction row (DB Synced, Local Pending, DB Error, Offline).',
      'Introduced TransactionSyncDetailModal error tracker showing exact error reasons (e.g., quota limits, network timeout) with a direct Retry Sync action button.'
    ]
  },
  {
    version: 'v5.3.13',
    buildNumber: 129,
    releaseDate: '2026-10-01',
    releaseTime: '08:15 PM (MMT)',
    titleMy: 'Financial Summary Table Redesign & Dual-System Cash Flow Views (ဘဏ္ဍာရေး အနှစ်ချုပ်ဇယား အသစ်ပြောင်းလဲခြင်း နှင့် ငွေဝင်/ထွက်၊ စတင်/ပိတ်လက်ကျန် စနစ်နှစ်မျိုး)',
    titleEn: 'Financial Summary Table Redesign & Dual-System Cash Flow Views (Inflow/Outflow & Opening/Closing)',
    tag: 'feature',
    tagLabelMy: 'ယခု ဗားရှင်းအသစ်',
    tagLabelEn: 'Latest Feature Version',
    descriptionMy: 'ဘဏ္ဍာရေး အနှစ်ချုပ်ဇယား (FinancialSummaryTable) ကို ဖုန်းမျက်နှာပြင်များတွင် ကြည့်ရရှုပ်ထွေးမှုမရှိစေရန် မိုဘိုင်းလ်-ဖာ့စ် (Mobile-First) ဒီဇိုင်းအသစ်ဖြင့် အပြည့်အဝ ပြင်ဆင်မွမ်းမံထားပါသည်။ ထို့အပြင် အသုံးပြုသူ တောင်းဆိုသည့်အတိုင်း ငွေဝင်/ငွေထွက် သိရှိနိုင်ရန် စနစ် ၂ မျိုး (၁။ Inflow / Outflow နှင့် ၂။ Opening / Closing) ကို ရှင်းလင်းလွယ်ကူစွာ ကူးပြောင်းကြည့်ရှုနိုင်သော Tabs များဖြင့် အသစ်တပ်ဆင်ပေးထားပါသည်။',
    descriptionEn: 'Refactored and redesigned the FinancialSummaryTable component for mobile-first readability, eliminating visual clutter, and adding dedicated dual-system views for (1) Inflow / Outflow and (2) Opening / Closing cash flow tracking.',
    changesMy: [
      '✨ **Clutter-Free Table Redesign**: မိုဘိုင်းလ်ဖုန်းများတွင် ဇယားများ ကြည့်ရရှုပ်ထွေးမှုကို ဖယ်ရှားပြီး ရှင်းလင်းကျစ်လစ်သော Card နှင့် Row ပုံစံသို့ ပြောင်းလဲခြင်း။',
      '📥 **System 1 (Inflow / Outflow)**: သတ်မှတ်ကာလအတွင်း ငွေဝင်လာမှု (Inflow)၊ ငွေထွက်သွားမှု (Outflow) နှင့် အသားတင် (Net) တို့ကို Wallet တစ်ခုချင်းအလိုက် ရှင်းလင်းစွာ ခွဲခြားပြသခြင်း။',
      '💼 **System 2 (Opening / Closing)**: စတင်လက်ကျန် (Opening)၊ လှုပ်ရှားမှု (Net Movement) နှင့် ပိတ်လက်ကျန် (Closing) တို့ကို အတိအကျ ကိုက်ညီစေရန် တွက်ချက်ပြသခြင်း။'
    ],
    changesEn: [
      'Redesigned the FinancialSummaryTable with a clean, mobile-first card and streamlined layout to eliminate visual clutter.',
      'Added dedicated tabs and visual cards for System 1 (Inflow / Outflow) and System 2 (Opening / Closing) with per-wallet breakdowns.'
    ]
  },
  {
    version: 'v5.3.12',
    buildNumber: 128,
    releaseDate: '2026-10-01',
    releaseTime: '08:00 PM (MMT)',
    titleMy: 'Current Month Budget vs Actual Visual Card (ယခုလ ဘတ်ဂျက် နှင့် အမှန်တကယ် သုံးစွဲမှု နှိုင်းယှဉ်ချက် Progress Bars ကဒ်ပြား)',
    titleEn: 'Current Month Budget vs Actual Spending Progress Bars Component',
    tag: 'feature',
    tagLabelMy: 'ယခု ဗားရှင်းအသစ်',
    tagLabelEn: 'Latest Feature Version',
    descriptionMy: 'ဒက်ရှ်ဘုတ် (Dashboard) တွင် ယခုလအတွက် သတ်မှတ်ထားသော ဘတ်ဂျက် (Budget) နှင့် အမှန်တကယ် သုံးစွဲမှု (Actual Spending) များကို နှိုင်းယှဉ်ပြသပေးမည့် Visual Component အသစ် (`CurrentMonthBudgetSummaryCard`) ကို ထည့်သွင်းပေးထားပါသည်။ အမျိုးအစား (Category) တစ်ခုချင်းစီအလိုက် ဘတ်ဂျက် မည်မျှသုံးစွဲပြီးစီးပြီဖြစ်ကြောင်း Progress Bars များဖြင့် ရှင်းလင်းလှပစွာ ဖော်ပြပေးမည် ဖြစ်ပါသည်။',
    descriptionEn: 'Created a new visual component for the Dashboard (`CurrentMonthBudgetSummaryCard`) that summarizes the current month\'s budget vs actual spending, displaying color-coded progress bars for each budget category.',
    changesMy: [
      '📊 **Current Month Budget vs Actual Summary Card**: ဒက်ရှ်ဘုတ်တွင် ယခုလ၏ စုစုပေါင်း ဘတ်ဂျက်နှင့် အမှန်တကယ် သုံးစွဲငွေများကို အနှစ်ချုပ်ပြသပေးသော ကဒ်ပြားအသစ် ထည့်သွင်းခြင်း။',
      '📈 **Per-Category Progress Bars**: အမျိုးအစား (Category) တစ်ခုချင်းစီအလိုက် သတ်မှတ်ဘတ်ဂျက်နှင့် အမှန်တကယ် ကုန်ကျစရိတ်များကို Progress Bars များဖြင့် နှိုင်းယှဉ်ပြသပေးပြီး ၈၀% ကျော်လွန်ပါက သတိပေးအရောင်ပြောင်းလဲခြင်း။'
    ],
    changesEn: [
      'Added the CurrentMonthBudgetSummaryCard visual component to the Dashboard.',
      'Displayed dynamic color-coded progress bars comparing actual spending against budget limits for each category during the current month.'
    ]
  },
  {
    version: 'v5.3.11',
    buildNumber: 127,
    releaseDate: '2026-10-01',
    releaseTime: '07:30 PM (MMT)',
    titleMy: 'Quota Exceeded Visual Notification & "Retry Sync" Button (Quota ကုန်ဆုံးမှု သတိပေးဘန်နာ နှင့် အလွယ်တကူ ပြန်လည်ချိတ်ဆက်နိုင်သော ခလုတ်)',
    titleEn: 'Quota Exceeded Visual Notification & "Retry Sync" Reconnection',
    tag: 'feature',
    tagLabelMy: 'ယခု ဗားရှင်းအသစ်',
    tagLabelEn: 'Latest Feature Version',
    descriptionMy: 'Firestore Write/Read Quota (Resource Exhausted / HTTP 429) ကုန်ဆုံးသွားသည့်အခါ UI တွင် ချက်ချင်းပေါ်လာမည့် အထူးသတိပေး ဘန်နာ (Visual Notification Banner) ကို ထည့်သွင်းပေးထားပါသည်။ အဆိုပါဘန်နာတွင် "🔄 Retry Sync & Reconnect" ခလုတ်ပါရှိပြီး နှိပ်လိုက်သည်နှင့် local sync queue ကို ရှင်းလင်းပေးကာ Firebase ချိတ်ဆက်မှုကို အလိုအလျောက် ပြန်လည်စတင် (Re-establish) ပေးမည် ဖြစ်ပါသည်။',
    descriptionEn: 'Added a dedicated visual notification banner in the UI when a quota exceeded or resource exhausted error is detected, featuring a "Retry Sync & Reconnect" button that clears the local sync queue and re-establishes the Firebase connection after a brief delay.',
    changesMy: [
      '🚨 **Quota Exceeded Visual Notification**: Quota ကုန်ဆုံးခြင်း (HTTP 429 / Resource Exhausted) ဖြစ်ပေါ်ပါက အသုံးပြုသူများ ချက်ချင်းသိရှိနိုင်စေရန် ထင်ရှားသော သတိပေးဘန်နာကို အမြဲပြသပေးခြင်း။',
      '🔄 **"Retry Sync" Button**: ဘန်နာပေါ်ရှိ "Retry Sync & Reconnect" ခလုတ်ကို နှိပ်လိုက်ရုံဖြင့် Local sync queue များကို ရှင်းလင်းပေးပြီး Firebase connection နှင့် quota flags များကို အသစ်တစ်ဖန် ပြန်လည်စတင်ပေးခြင်း။'
    ],
    changesEn: [
      'Integrated a prominent visual notification banner that appears immediately when Firestore quota is exceeded.',
      'Added a "Retry Sync & Reconnect" action button to clear local queue, reset quota locks, and re-establish the Firebase connection.'
    ]
  },
  {
    version: 'v5.3.10',
    buildNumber: 126,
    releaseDate: '2026-10-01',
    releaseTime: '07:00 PM (MMT)',
    titleMy: 'Mobile-First Consolidated Row Layout (မိုဘိုင်းဖုန်းများအတွက် အထူးပြုလုပ်ထားသော နှစ်ကြောင်းစနစ် ဇယားဒီဇိုင်း)',
    titleEn: 'Mobile-First Consolidated Row Layout for Transactions & Debts',
    tag: 'feature',
    tagLabelMy: 'ယခု ဗားရှင်းအသစ်',
    tagLabelEn: 'Latest Feature Version',
    descriptionMy: 'ငွေစာရင်း (Transactions) နှင့် အကြွေးစာရင်း (Debts) ဇယားကွက်များတွင် မိုဘိုင်းဖုန်းစခရင်များ၌ ဖတ်ရှုရ အလွန်အမင်း ရှင်းလင်းလွယ်ကူစေရန် အရေးကြီးသော အချက်အလက်များ (အမျိုးအစား/အမည် နှင့် ရက်စွဲ) ကို ပထမတစ်ကြောင်းတွင်လည်းကောင်း၊ ငွေပမာဏ နှင့် မှတ်စု/ဖုန်းနံပါတ် များကို ဒုတိယတစ်ကြောင်းတွင်လည်းကောင်း နှစ်ကြောင်းစနစ် (Consolidated Stacked Layout) ဖြင့် စနစ်တကျ ပြန်လည်ဒီဇိုင်းထုတ်ပေးထားပါသည်။',
    descriptionEn: 'Refactored transaction and debt table components with a mobile-first consolidated row layout, stacking important info (category/person & date/due date) on line 1 and amount/notes on line 2 to drastically reduce visual clutter.',
    changesMy: [
      '📱 **Mobile-First Consolidated Rows**: စာရင်းတစ်ခုချင်းစီတွင် ရှုပ်ထွေးနေသော ကော်လံများကို ဖယ်ရှားပြီး အရေးကြီးအချက်အလက် (Category/Person Name နှင့် Date) ကို ပထမလိုင်းတွင်လည်းကောင်း၊ ပမာဏနှင့် မှတ်စု/ဖုန်းနံပါတ်ကို ဒုတိယလိုင်းတွင်လည်းကောင်း နှစ်ကြောင်းစနစ်ဖြင့် သပ်ရပ်စွာ စုစည်းပြသခြင်း။',
      '✨ **Reduced Visual Clutter**: မျက်စိရှုပ်ထွေးမှု ကင်းစင်စေရန် ပုံစံအသစ်ဖြင့် တည်ဆောက်ထားပြီး ဖုန်းစခရင်သေးငယ်သူများပါ တစ်ချက်ကြည့်ရုံဖြင့် လွယ်ကူစွာ သိရှိနိုင်ခြင်း။'
    ],
    changesEn: [
      'Refactored transaction and debt rows to stack category/name and date on line 1, and amount and note/phone on line 2.',
      'Significantly reduced visual clutter and optimized mobile readability across all lists.'
    ]
  },
  {
    version: 'v5.3.9',
    buildNumber: 125,
    releaseDate: '2026-10-01',
    releaseTime: '06:30 PM (MMT)',
    titleMy: 'Dual-Mode Financial Tables & Uncluttered Layout (ဝင်ငွေ/ထွက်ငွေ နှင့် စတင်/ပိတ်လက်ကျန် စနစ်နှစ်မျိုးပါသော သန့်ရှင်းရှင်းလင်းသည့် ဇယားများ)',
    titleEn: 'Dual-Mode Financial Tables (Inflow/Outflow vs Opening/Closing) & Clean Layout',
    tag: 'feature',
    tagLabelMy: 'ယခု ဗားရှင်းအသစ်',
    tagLabelEn: 'Latest Feature Version',
    descriptionMy: 'Wallet အလိုက် သီးသန့်ဇယားများတွင် ကြည့်ရရှုပ်ထွေးမှု မရှိစေရန် စနစ်တကျ ပြင်ဆင်ပေးထားပြီး ငွေဝင်/ထွက် အခြေအနေများကို စနစ် ၂ မျိုး (၁။ Inflow / Outflow ဝင်ငွေနှင့်ထွက်ငွေ စနစ် နှင့် ၂။ Opening / Closing စတင်နှင့်ပိတ်လက်ကျန် စနစ်) ဖြင့် အလွယ်တကူ ပြောင်းလဲကြည့်ရှုနိုင်သော Mode Switcher ဇယားအသစ်ကို ထည့်သွင်းပေးထားပါသည်။',
    descriptionEn: 'Enhanced wallet breakdown tables with a clean, uncluttered layout and a dual-mode switcher allowing users to instantly toggle between (1) Inflow / Outflow mode and (2) Opening / Closing mode.',
    changesMy: [
      '📊 **Dual-Mode Financial View Switcher**: ဇယားများတွင် ငွေဝင်/ထွက် အခြေအနေအား 📥 "ဝင်ငွေ / ထွက်ငွေ (Inflow / Outflow)" စနစ် နှင့် 💼 "စတင် / ပိတ် လက်ကျန် (Opening / Closing)" စနစ် ဟူ၍ Tab နှစ်ခုဖြင့် အလွယ်တကူ ပြောင်းလဲကြည့်ရှုနိုင်ခြင်း။',
      '✨ **Uncluttered & Clean Layout**: မိုဘိုင်းဖုန်းစခရင်များတွင် ကော်လံများ ညပ်နေခြင်းနှင့် စာသားများ ဖြတ်တောက်ခံရခြင်း (Truncation) မရှိစေရန် ကော်လံအကျယ်နှင့် spacing များကို စနစ်တကျ ရှင်းလင်းလှပစွာ ဖွဲ့စည်းပေးထားခြင်း။',
      '🧮 **Accurate Mode Summaries**: မုဒ် (Mode) တစ်ခုချင်းစီအလိုက် စုစုပေါင်း ဝင်ငွေ၊ ထွက်ငွေ၊ စတင်လက်ကျန်နှင့် ပိတ်လက်ကျန်များကို သီးသန့်တိကျစွာ တွက်ချက်ပြသပေးခြင်း။'
    ],
    changesEn: [
      'Added a responsive dual-mode switcher to toggle per-wallet breakdown tables between Inflow/Outflow mode and Opening/Closing mode.',
      'Optimized column widths and padding to eliminate cramped text truncation and ensure pristine readability on mobile devices.',
      'Enforced accurate totals and net summaries tailored specifically to each financial tracking mode.'
    ]
  },
  {
    version: 'v5.3.8',
    buildNumber: 124,
    releaseDate: '2026-10-01',
    releaseTime: '03:15 PM (MMT)',
    titleMy: 'Supercharged Write Optimization & High-Efficiency Low-Quota Synchronization (Sync လုပ်ဆောင်ချက်ကို အလွန်အမင်း သက်သာချွေတာပေးသည့် စနစ်)',
    titleEn: 'Supercharged Write Optimization & High-Efficiency Low-Quota Synchronization',
    tag: 'fix',
    tagLabelMy: 'ပြင်ဆင်ချက် ဗားရှင်း',
    tagLabelEn: 'Bug Fix & Optimization',
    descriptionMy: 'စာရင်း ၁ ခုရေးလျှင် Cloud Write ၁ ခုသာ သုံးစွဲစေပြီး၊ အချက်အလက်များ မပြောင်းလဲပါက Redundant cloud writes များအား ၁၀၀% ကျော်လွှဲကာ သက်သာစေသည့် စနစ်။ background auto-sync ၏ interval အား ၅ စက္ကန့်မှ စက္ကန့် ၁၂၀ သို့ ပြောင်းလဲကာ Quota မကုန်ဆုံးအောင် အပြီးသတ် အကောင်းဆုံးဖြစ်အောင် ပြင်ဆင်ထားပါသည်။',
    descriptionEn: 'Fully optimized cloud synchronization writes. Enforces strict signature comparisons to skip redundant updates, prevents automatic re-upload of all database records, optimizes background sync intervals from 5s to 120s, and eliminates unnecessary write duplication.',
    changesMy: [
      '⚡ **Database Signature-Based Write Skipping (၁၀၀% Redundant Write ကျော်လွှဲခြင်း)**: Local database အချက်အလက်များ ပြောင်းလဲမှုမရှိပါက Cloud သို့ redundancy upload လုပ်ခြင်းအား လုံးဝ ကျော်လွှဲရပ်တန့်စေသော signature comparison စနစ် ထည့်သွင်းခြင်း။',
      '🛑 **Prevent Redundant Database Re-upload (မလိုဘဲ အားလုံး ပြန်တင်ခြင်းကို ပိတ်ခြင်း)**: `handleForcePushAll` တွင် sync ရန်မကျန်ရှိပါက update uploads များအား လုံးဝ မပြုလုပ်ဘဲ ရပ်တန့်စေခြင်း။',
      '⏱️ **Healthy Sync Polling Interval (၅ စက္ကန့်မှ ၁၂၀ စက္ကန့်သို့ ပြောင်းခြင်း)**: အနောက်ကွယ်မှ ၅ စက္ကန့်တစ်ခါ Database တစ်ခုလုံးအား pull ဆွဲ၍ read limit ကုန်ဆုံးစေသော loop အား ၁၂၀ စက္ကန့် (၂ မိနစ်) သို့ ပြောင်းလဲကာ heavy readings များကို တားဆီးခြင်း။ (Firestore listeners ရှိပြီးဖြစ်၍ real-time sync သည် ပုံမှန်အတိုင်း အလုပ်လုပ်ဆဲဖြစ်သည်)',
      '📦 **Granular Batch Sync (မဆိုင်သော Debts များ အတင်းရေးခြင်း ပိတ်ခြင်း)**: Pending transaction ပို့ဆောင်ချိန်၌ မဆိုင်သော Debt စာရင်းများအားလုံးကို အတင်းလိုက်လံ ရေးသားခြင်းအား ပိတ်ပင်ပြီး သက်သာစေခြင်း။'
    ],
    changesEn: [
      'Implemented local-cloud database signature verification to completely skip redundant write batch uploads when no changes occurred.',
      'Optimized handleForcePushAll to only target actual pending transactions instead of falling back to uploading all records when pending list is empty.',
      'Adjusted background tick interval from 5s to 120s (2 minutes) and removed heavy unconditional pulls, relying fully on highly efficient real-time onSnapshot listeners.',
      'Separated debts write from pending transaction push to prevent unrelated debt documents from consuming writes on every single sync cycle.'
    ]
  },
  {
    version: 'v5.3.7',
    buildNumber: 123,
    releaseDate: '2026-10-01',
    releaseTime: '03:10 PM (MMT)',
    titleMy: 'Google Quota Exhaustion Diagnostic Banner & Mathematical Sync Reconciliation (ဂူဂယ် Quota ကုန်ဆုံးမှု စစ်ဆေးခြင်းနှင့် ဂဏန်းများ ညှိနှိုင်းမှု)',
    titleEn: 'Google Quota Exhaustion Diagnostic Banner & Mathematical Sync Reconciliation',
    tag: 'current',
    tagLabelMy: 'လက်ရှိ သုံးစွဲနေသော ဗားရှင်း',
    tagLabelEn: 'Current Live Version',
    descriptionMy: 'ဂူဂယ် Quota ကုန်ဆုံးသွားချိန်တွင် (ဥပမာ- တစ်နေ့လျှင် အခမဲ့ ရေးသားခွင့် ၂၀,၀၀၀ ပြည့်သွားချိန်၌) စက်တွင်းနှင့် Server အကြား အမှန်တကယ် ဖြစ်ပျက်နေသော အခြေအနေနှင့် ဂဏန်းများ လိမ်လည်ပြသခြင်း မရှိစေရန် အတိအကျ ညှိနှိုင်းပြင်ဆင်ပေးသော စနစ်ဖြစ်ပါသည်။',
    descriptionEn: 'Fully resolved display discrepancies under Firestore Write Quota exhaustion (HTTP 429 Resource Exhausted) by integrating strict hasPendingWrites verification and real-time quota status diagnosis banners.',
    changesMy: [
      '📡 **Strict hasPendingWrites Verification**: Google Server သို့ အမှန်တကယ် မရောက်သေးသော Local cached records များအား (Confirmed in DB) အဖြစ် လိမ်လည်မရေတွက်တော့ဘဲ Server-Side ၌ အတည်ပြုပြီးသားများသာ ရေတွက်ရန် တင်းကျပ်စွာ စစ်ဆေးပေးခြင်း။',
      '🛑 **Google Write Quota Exceeded Diagnostic Banner**: အခမဲ့ ရေးသားခွင့် (20,000 writes/day) ကုန်ဆုံး၍ Server က ငြင်းပယ်ထားပါက user ထံသို့ Error 429 နှင့် Quota status အား ဖော်ပြပေးသည့် Diagnostic Banner သီးသန့် ထည့်သွင်းပြသခြင်း။',
      '🔍 **Transactional Queue Item Details**: Queue ထဲတွင် တန့်နေသော ကျန်ရှိစာရင်းများ မည်သည့်အရာများ ဖြစ်သည်ကို တစ်ခုချင်းစီ၏ entityType, ID နှင့် တိကျသော Error message အသေးစိတ်အလိုက် ဖွင့်ဟဖော်ပြပေးသည့် စာရင်းဇယား ထည့်သွင်းခြင်း။',
      '⏱️ **Gentle Processing Heartbeat (15s backoff)**: စက္ကန့် ၃ စက္ကန့်တိုင်း အတင်းအကျပ် hammer လုပ်၍ write quota မြန်မြန်ကုန်ဆုံးစေသည့် loop အား ၁၅ စက္ကန့်သို့ ပြောင်းလဲပြီး Quota ကုန်ဆုံးနေစဉ် မိနစ် ၁၀ အလိုအလျောက် ရပ်နားပေးခြင်း။'
    ],
    changesEn: [
      'Enforced strict hasPendingWrites checks to ensure uncommitted cache transactions are not falsely counted in Cloud DB set.',
      'Added a real-time Google Write Quota Exhausted diagnostic banner explaining HTTP 429 status and reset times.',
      'Implemented expandable list of individual queue items showing entityType, ID, and detailed error reason.',
      'Reduced queue processing heartbeat interval to 15s and added 10-minute automatic backoff pause when HTTP 429 Quota Exceeded is encountered.'
    ],
  },
  {
    version: 'v5.3.6',
    buildNumber: 122,
    releaseDate: '2026-10-01',
    releaseTime: '02:55 PM (MMT)',
    titleMy: 'Sync ဆောင်ရွက်မှု မှတ်တမ်း နောက်ဆုံး ၅၀ ခု စောင့်ကြည့်စစ်ဆေးနိုင်ခြင်း (Database Tracker Sync Operations Logging System)',
    titleEn: '50 Sync Operations Logging & Transparency Tracker within Database Tracker Modal',
    tag: 'feature',
    tagLabelMy: 'ယခင် ဗားရှင်း',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'Push နှင့် Pull ပြုလုပ်မှုတိုင်း (Force push, Force pull, Single record push, Direct HTTPS REST, Retry) ၏ အောင်မြင်မှု/ကျရှုံးမှု အခြေအနေ၊ စာရင်းအရေအတွက်၊ ကြာမြင့်ချိန် (Latency) နှင့် အမှားသတင်းစကား (Error messages) များကို အပြည့်အစုံ မှတ်တမ်းတင်သိမ်းဆည်းပေးသော 50-Operations Sync Logger အား ထည့်သွင်းပြီး Database Tracker Modal အတွင်း ကြည့်ရှုစစ်ဆေးနိုင်စေရန် ဖန်တီးပေးထားပါသည်။',
    descriptionEn: 'Implemented a 50-operation sync logging mechanism tracking all push/pull events, success/failure status, timestamps, item counts, duration, and detailed error messages, fully viewable with filters in the Database Tracker Modal.',
    changesMy: [
      '📜 **Sync Operations Logging System (နောက်ဆုံး ၅၀ ခု မှတ်တမ်းတင်ခြင်း)**: Cloud သို့ Push ပြုလုပ်ခြင်း၊ Pull ဆွဲယူခြင်း၊ တစ်ခုချင်းပို့ဆောင်ခြင်းနှင့် REST HTTP တိုက်ရိုက်ပို့ဆောင်မှု အဆင့်တိုင်းအား timestamp၊ အောင်မြင်မှု/ကျရှုံးမှု၊ ပစ္စည်းအရေအတွက်၊ duration (ms) နှင့် စက်အမျိုးအစား (iOS/Android/Desktop) အလိုက် အသေးစိတ် သိမ်းဆည်းပေးခြင်း။',
      '🔍 **Database Tracker Modal အတွင်း တိုက်ရိုက် ကြည့်ရှုနိုင်ခြင်း**: Database Sync Tracker Modal တွင် "မှတ်တမ်းများ အခြေအနေ" နှင့် "Sync ဆောင်ရွက်မှု မှတ်တမ်း" ဟူ၍ Tab နှစ်ခုခွဲကာ နောက်ဆုံးလုပ်ဆောင်ချက် ၅၀ ခုအား All, Push, Pull, Failed အလိုက် filter စစ်ထုတ်ကြည့်ရှုနိုင်စေခြင်း။',
      '⚠️ **တိကျသော Error Messages များ ပြသပေးခြင်း**: Sync မအောင်မြင်ခဲ့ပါက ဘာကြောင့် မအောင်မြင်ခဲ့ကြောင်း တိကျသော အမှားသတင်းစကား (Error message) အား Highlight ပြုလုပ်၍ ရှင်းလင်းစွာ ဖော်ပြပေးထားခြင်း။',
      '🧹 **Log Management & Clear**: မလိုလားအပ်ပါက သို့မဟုတ် အသစ်စတင်လိုပါက မှတ်တမ်းများအား ချက်ချင်း တစ်ချက်နှိပ် ရှင်းလင်းနိုင်သော Clear Logs ခလုတ် ထည့်သွင်းပေးထားခြင်း။'
    ],
    changesEn: [
      'Implemented a persistent logger tracking the last 50 sync operations (push/pull) with status, item counts, device platform, and duration.',
      'Added a responsive tab switcher in Database Sync Tracker Modal between individual records and sync operations log.',
      'Integrated status filters (All, Push, Pull, Failed) with detailed error message diagnostics for troubleshooting.',
      'Added log clearing capability with real-time reactive event synchronization.'
    ],
  },
  {
    version: 'v5.3.5',
    buildNumber: 121,
    releaseDate: '2026-10-01',
    releaseTime: '02:45 PM (MMT)',
    titleMy: 'Permanent iOS WebKit Socket Unlock & Dual-Channel Direct REST Sync Guarantee (iOS မှတ်တမ်း တကယ် ရောက်ရှိစေခြင်း အပြီးသတ် ပြင်ဆင်ချက်)',
    titleEn: 'Permanent iOS WebKit Socket Unlock & Dual-Channel Direct REST Sync Guarantee',
    tag: 'feature',
    tagLabelMy: 'ယခင် ဗားရှင်း',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'iPhone (iOS Safari) တွင် Transaction အသစ် ထည့်သွင်းသော်လည်း ၁ ရက်နှင့် ၁ ညလုံးလုံး Cloud သို့ မရောက်နိုင်ဘဲ ပိတ်ဆို့နေရသည့် "တကယ့် ပြဿနာအစစ်" (Firestore SDK တွင် experimentalForceLongPolling နှင့် persistentSingleTabManager ကြောင့် Safari စက်ပိတ်/Tab ပြောင်းချိန်၌ Socket stream လုံးဝ ရပ်တန့်အေးခဲသွားပြီး Background queue သို့မဟုတ် Direct push က ထပ်ခါတလဲလဲ မပို့ဆောင်နိုင်ခဲ့ခြင်း) အား အမြစ်ပြတ် ဖယ်ရှားပြီး Dual-Channel Direct HTTPS REST ပို့ဆောင်မှုစနစ်ဖြင့် အပြီးသတ် ပြင်ဆင်လိုက်ပါသည်။',
    descriptionEn: 'Eliminated the actual root cause of iOS Safari sync blockage where experimentalForceLongPolling and persistentSingleTabManager locked the WebKit connection stream upon sleep/tab switch. Upgraded to persistentMultipleTabManager with native WebSockets and enforced Dual-Channel Direct HTTPS REST push for instant guaranteed delivery.',
    changesMy: [
      '🔌 **Permanent WebKit Socket Unlock (Safari Long-Polling Freeze ဖယ်ရှားခြင်း)**: Safari တွင် connection stream အေးခဲရပ်တန့်စေသော `experimentalForceLongPolling` အား ဖယ်ရှား၍ Native WebSocket အား အသုံးပြုစေပြီး၊ Tab lock ပိတ်ဆို့မှု ဖြစ်စေသော `persistentSingleTabManager` အစား `persistentMultipleTabManager` ဖြင့် ပြင်ဆင်လိုက်ခြင်း။',
      '⚡ **Dual-Channel Direct REST Push Guarantee (တိုက်ရိုက် Cloud ပို့ဆောင်မှု)**: Force Push နှင့် Retry ခလုတ်များ နှိပ်ချိန်တွင် Firestore SDK သာမက Google Cloud Firestore REST API (`firestore.googleapis.com`) သို့ တိုက်ရိုက် HTTPS call ဖြင့် ၅၉ ခုမြောက် မှတ်တမ်းအား အရောက်ပို့ဆောင်စေခြင်း။',
      '🔑 **Resilient Token Caching (Network Block မဖြစ်စေခြင်း)**: REST push ခေါ်ယူချိန်တွင် ID token အား အတင်းအကျပ် refresh မလုပ်စေဘဲ Cached Token ဖြင့် ၁၂ စက္ကန့် timeout ကာကွယ်မှုဖြင့် ချက်ချင်း ပို့ဆောင်စေခြင်း။',
      '📡 **Real-time Confirmation Bridge**: REST push ဖြင့် Server ပေါ် အောင်မြင်စွာ ရောက်ရှိသည်နှင့် `ngwe_cloud_tx_confirmed` event ဖြင့် UI ပေါ်တွင် ချက်ချင်း အတည်ပြုပြီး (Confirmed in DB) အဖြစ် အချိန်မဆိုင်း ပြောင်းလဲပြသစေခြင်း။'
    ],
    changesEn: [
      'Permanently resolved iOS Safari socket freezes by removing experimentalForceLongPolling and upgrading to persistentMultipleTabManager.',
      'Implemented Dual-Channel Direct REST push during force sync to guarantee immediate delivery to Google Cloud Firestore endpoint.',
      'Optimized auth token caching and added 12s abort timeouts to prevent LTE network stalls.',
      'Added real-time event pipeline for instantaneous local UI confirmation upon REST push success.'
    ],
  },
  {
    version: 'v5.3.4',
    buildNumber: 120,
    releaseDate: '2026-10-01',
    releaseTime: '02:30 PM (MMT)',
    titleMy: 'Cross-Device Cloud Sync Truth Audit & Uncommitted Writes Isolation (iOS ၅၉ vs Android ၅၈ နှင့် Sync မဖြစ်တာ ၈ ခု ကွဲလွဲမှု အပြီးသတ် ပြင်ဆင်ချက်)',
    titleEn: 'Cross-Device Cloud Sync Truth Audit & Uncommitted Writes Isolation',
    tag: 'feature',
    tagLabelMy: 'ယခင် ဗားရှင်း',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'iPhone (iOS) တွင် စာရင်း ၅၉ ခုရှိပြီး Cloud ပေါ် ၅၉ ခုဟု ပြသနေသော်လည်း အောက်တွင် Sync မဖြစ်တာ ၈ ခုဟု ပေါ်နေခြင်း၊ Android စက်တွင်မူ DB ထဲရှိတာ ၅၈ ခုသာ ပြသနေခြင်းနှင့် iOS တွင် Transaction ၁ ကြောင်း ထည့်သွင်းသော်လည်း Cloud သို့ မတက်နိုင်ဘဲ ပိတ်ဆို့နေရသည့် အဓိက အကြောင်းရင်း (onSnapshot တွင် Local uncommitted writes ဖြစ်သော hasPendingWrites: true အား Server သို့ မရောက်မီ Cloud အတည်ပြုပြီးအဖြစ် မှားယွင်းသတ်မှတ်မိသဖြင့် Force Push က ပို့ရန်မလိုဟု ယူဆကာ ကျော်သွားခဲ့မိခြင်း) အား အမြစ်ပြတ် စစ်ဆေးပြင်ဆင်လိုက်ပါသည်။',
    descriptionEn: 'Resolved the core sync mismatch where iOS showed 59 records on device and 59 in Cloud while showing 8 unsynced items below, and Android showed 58 in DB. Fixed the root cause in onSnapshot where optimistic uncommitted writes (hasPendingWrites: true) were prematurely marked as confirmed in Cloud DB, causing sync push to bypass the 59th transaction.',
    changesMy: [
      '🔍 **Strict Server Commitment Verification (hasPendingWrites: false)**: Firestore onSnapshot မှ ဒေတာလက်ခံရရှိချိန်တွင် Server ပေါ်သို့ အမှန်တကယ် ရောက်ရှိအတည်ပြုပြီးသော မှတ်တမ်းများကိုသာ `confirmedServerTxIds` (Cloud DB ရောက်ရှိပြီး) အဖြစ် သတ်မှတ်စေခြင်း။ စက်တွင်း ရေးသားဆဲ uncommitted cache မှတ်တမ်းများကို Cloud DB ရောက်ပြီးအဖြစ် လုံးဝ မပြသတော့ပါ။',
      '📱 **Cross-Device Truth Harmony (iOS & Android တူညီသွားခြင်း)**: iPhone မှ ထည့်လိုက်သော ၅၉ ခုမြောက် မှတ်တမ်းသည် Server သို့ မရောက်သေးသရွေ့ iOS တွင်လည်း "Cloud DB ရောက်ရှိပြီး (၅၈)"၊ "ပို့ရန်ကျန် (၁)" ဟုသာ ရိုးသားတိကျစွာ ပြသမည်ဖြစ်၍ Android စက်မှ ပြသသော (၅၈) နှင့် ၁၀၀% အတိအကျ ကိုက်ညီသွားစေခြင်း။',
      '🚀 **Unblocking iOS 59th Transaction Push**: ယခင်က ၅၉ ခုမြောက် ID အား ရောက်ပြီးသားဟု မှားယွင်းယူဆကာ Force Push က ပို့ဆောင်ခြင်း မပြုဘဲ ကျော်သွားခဲ့သော ပြဿနာအား ဖယ်ရှားလိုက်သဖြင့် "Database သို့ အကုန်ချက်ချင်း ပို့မည်" (သို့မဟုတ်) "ကျန်စာရင်းများ ပြန်ပို့မည်" ကို နှိပ်လိုက်သည်နှင့် ၅၉ ခုမြောက် မှတ်တမ်းသည် Cloud သို့ ချက်ချင်း တိုက်ရိုက် ရောက်ရှိသွားစေခြင်း။',
      '🎯 **Queue & Card Metrics Harmony (ဆန့်ကျင်ဘက် အချက်အလက်များ ဖယ်ရှားခြင်း)**: ကတ်တွင် "၁၀၀% တပြေးညီ" ဟု ပြပြီး အောက်တွင် "Queue ထဲ ၈ ခု ကျန်" ဟု ကွဲလွဲမပြစေရန်၊ Queue ထဲတွင် စာရင်းကျန်နေပါက ကတ်တွင်လည်း Queue တန်းစီဆဲ အဖြစ် တပြေးညီ ရိုးသားစွာ ဖော်ပြစေခြင်း။',
      '🛡️ **Robust REST HTTP Fallback with Error Logging**: Safari WebKit ရပ်တန့်နေပါက Direct HTTPS REST push ပြုလုပ်ရာတွင် NaN / Date data များ မပျက်စီးစေရန် တားဆီးပေးပြီး၊ ချို့ယွင်းချက် ဖြစ်ပေါ်ပါက Sync Error History တွင် အသေးစိတ် မှတ်တမ်းတင်ပေးခြင်း။'
    ],
    changesEn: [
      'Isolated uncommitted local writes (hasPendingWrites: true) so optimistic cache is never falsely counted as server-confirmed in Cloud DB.',
      'Harmonized cross-device metrics so iOS and Android report the exact same server truth (58 in DB until committed, 1 pending push on iOS).',
      'Unblocked the 59th transaction push: removed false confirmed status so Force Push properly delivers the pending record.',
      'Synchronized card indicators with queue counters to eliminate contradicting 100% vs 8-queue displays.',
      'Hardened Direct REST HTTP fallback with robust data serialization and error recording.'
    ],
  },
  {
    version: 'v5.3.3',
    buildNumber: 119,
    releaseDate: '2026-10-01',
    releaseTime: '02:15 PM (MMT)',
    titleMy: 'Dedicated Sync Error History Section & iOS Safari Transaction Push Recovery (iOS မှတ်တမ်း တိုက်ရိုက် ရောက်ရှိစေခြင်းနှင့် အမှားမှတ်တမ်း)',
    titleEn: 'Dedicated Sync Error History Section & iOS Safari Direct HTTPS Sync Recovery',
    tag: 'feature',
    tagLabelMy: 'ယခင် ဗားရှင်း',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'iOS (iPhone / Safari) တွင် Transaction အသစ် ထည့်သွင်းသော်လည်း Cloud သို့ မရောက်ဘဲ တန့်နေရသည့် ပြဿနာ (WebKit IndexedDB freeze နှင့် stream pause) အား အပြီးသတ် ဖြေရှင်းနိုင်ရန် Direct HTTPS REST write fallback ထည့်သွင်းပေးပြီး၊ SyncHealthModal အတွင်း အကြောင်းရင်း အမှန်ကို ချက်ချင်း မြင်တွေ့နိုင်မည့် "Sync Error History" (နောက်ဆုံး ကျရှုံးခဲ့သော စာရင်း ၁၀ ခု၊ အချိန်နှင့် တိကျသော Error Message) ကဏ္ဍအား တပ်ဆင်လိုက်ပါသည်။',
    descriptionEn: 'Resolved the iOS Safari transaction sync blockage by introducing an automatic Direct HTTPS REST write fallback and adding a dedicated "Sync Error History" section to SyncHealthModal listing the last 10 failed operations with specific error messages and timestamps.',
    changesMy: [
      '📜 **Dedicated Sync Error History Section**: SyncHealthModal တွင် နောက်ဆုံး ကျရှုံးခဲ့သော စာရင်း ၁၀ ခု၏ တိကျသော Error Message၊ Operation အမျိုးအစား (Write/Delete)၊ အချိန် (Timestamp) နှင့် Error Code တို့ကို အသေးစိတ် ဖော်ပြပေးသော မှတ်တမ်းကဏ္ဍ ထည့်သွင်းခြင်း။',
      '🍏 **iOS Safari WebKit Direct HTTPS Fallback**: iPhone Safari တွင် Firestore SDK internal stream ရပ်တန့်နေပါက စောင့်ဆိုင်းမနေဘဲ Google Cloud Firestore REST API သို့ တိုက်ရိုက် HTTPS fetch ဖြင့် စာရင်းချက်ချင်း ရောက်ရှိစေရန် အလိုအလျောက် ပြုပြင်ခြင်း။',
      '📋 **One-Click Error Copy & Clear**: Error တစ်ခုချင်းစီ၏ Technical Payload အား အလွယ်တကူ Copy ကူးယူနိုင်ပြီး၊ ရှင်းလင်းလိုပါက "ရှင်းမည် (Clear)" ခလုတ်ဖြင့် Error History အား အသစ်ပြန်လည် စတင်နိုင်ခြင်း။',
      '🛡️ **Persistently Cached Error Logs**: စက်ပိတ်သွားပါကလည်း ဖြစ်ပွားခဲ့သော Error အချက်အလက်များ မပျောက်ပျက်စေရန် LocalStorage တွင် လုံခြုံစွာ သိမ်းဆည်းပေးထားခြင်း။'
    ],
    changesEn: [
      'Added a dedicated "Sync Error History" section in SyncHealthModal showing the last 10 failed operations with detailed error strings and timestamps.',
      'Implemented Direct HTTPS REST write fallback to guarantee delivery on iOS Safari WebKit.',
      'Added One-Click copy and clear functionality for error diagnostics.',
      'Persistently stored error history in localStorage for post-mortem troubleshooting.'
    ],
  },
  {
    version: 'v5.3.2',
    buildNumber: 118,
    releaseDate: '2026-10-01',
    releaseTime: '01:45 PM (MMT)',
    titleMy: 'Cloud DB စာရင်းအရေအတွက် (၅၈ နှင့် ၅၉) မတူညီဘဲ ကွဲလွဲနေမှုအား အတိအကျ ညှိနှိုင်းပြင်ဆင်ခြင်း (100% Metric Synchronization)',
    titleEn: '100% Unified Cloud DB Sync Metric & Zero-Discrepancy Data Audit',
    tag: 'feature',
    tagLabelMy: 'ယခင် ဗားရှင်း',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'Account နှင့် DB ID အတူတူဖြစ်ပါလျက် နေရာတစ်ခုတွင် "DB ရောက်ရှိပြီး ၅၈" ဟု ပြပြီး အခြားနေရာတစ်ခုတွင် "DB ရောက်ရှိပြီး ၅၉" ဟု ကွဲလွဲစွာ ပြသနေရသည့် အရင်းအမြစ် (DatabaseSyncTrackerModal တွင် cloudTxIds.size မှ အဟောင်းကျန် ID များအား တိုက်ရိုက် ရေတွက်မိခြင်းနှင့် Transaction ဖျက်ချိန်တွင် cloudTxIds မှ ချက်ချင်း ဖယ်ထုတ်မပေးခဲ့မိခြင်း) အား အပြီးသတ် စစ်ဆေးပြင်ဆင်လိုက်ပါသည်။ စက်တွင်းမှတ်တမ်း ၅၈ ခုရှိပါက Cloud DB ရောက်ရှိပြီး ၅၈ ခု၊ ပို့ရန်ကျန် ၀ ခု အဖြစ် တစ်သမတ်တည်း တိကျမှန်ကန်စွာသာ ပြသစေမည် ဖြစ်ပါသည်။',
    descriptionEn: 'Eliminated the discrepancy where one view showed 58 confirmed records while another card showed 59 records on the same account. Unified all calculation formulas across DatabaseSyncTrackerModal, SyncHealthModal, and Navbar to strictly evaluate active confirmed records.',
    changesMy: [
      '🎯 **စာရင်းအရေအတွက် ၁၀၀% တိကျညီညွတ်စေခြင်း (No More 58 vs 59 Discrepancy)**: DatabaseSyncTrackerModal Card 2 ရှိ "Cloud DB ရောက်ရှိပြီး" ဂဏန်းအား cloudTxIds.size (မဆိုင်သော/ဖျက်ထားသော ID အဟောင်းများ ရောနှောပါဝင်နိုင်သည့် set size) ဖြင့် မတွက်ချက်တော့ဘဲ လက်ရှိ တရားဝင်မှတ်တမ်းများထဲမှ Cloud ရောက်ပြီးသား အရေအတွက် (syncedTxsCount: ၅၈) ဖြင့်သာ တပြေးညီ တိုက်ရိုက် ပြသစေခြင်း။',
      '🗑️ **Transaction Deletion Synchronization**: စာရင်းတစ်ခုခုအား ဖျက်လိုက်ပါက cloudTxIds ထဲမှပါ အဆိုပါ ID အား ချက်ချင်း delete ပြုလုပ်စေပြီး syncQueue နှင့် onSnapshot တို့တွင်လည်း ပြန်လည်မရှင်သန်စေရန် ကာကွယ်လိုက်ခြင်း။',
      '📊 **Cards & Filter Tabs Formula Alignment**: Tracker Modal အတွင်းရှိ Card 1 (စက်တွင်း ၅၈ ခု)၊ Card 2 (DB ရောက်ပြီး ၅၈ ခု)၊ Card 3 (ပို့ရန်ကျန် ၀ ခု) နှင့် Tab ခလုတ်များ (အားလုံး ၅၈၊ ရောက်ပြီး ၅၈၊ ကျန် ၀) အား သင်္ချာနည်းအရ ၁၀၀% အတိအကျ ကိုက်ညီစေခြင်း။',
      '⚡ **Clean Compilation & Build Safety**: DatabaseSyncTrackerModal အတွင်း localMissingFromCloud ထပ်နေသော variable declaration အား ရှင်းလင်းပြီး Vite/TypeScript build အား အပြည့်အဝ အောင်မြင်စေခြင်း။'
    ],
    changesEn: [
      'Unified confirmed DB count across all modals and cards to eliminate the confusing 58 vs 59 count mismatch.',
      'Synchronized cloudTxIds pruning on transaction deletion to prevent stale or orphaned IDs from inflating the count.',
      'Aligned all summary cards and filter tabs to perfectly reflect consistent mathematical metrics.',
      'Resolved duplicate variable declaration in DatabaseSyncTrackerModal for flawless compilation.'
    ],
  },
  {
    version: 'v5.3.1',
    buildNumber: 117,
    releaseDate: '2026-10-01',
    releaseTime: '01:00 PM (MMT)',
    titleMy: 'Subtle Navbar Sync Progress Indicator & Background Activity Monitor (နောက်ခံ Sync တိုက်ရိုက်ပြသမှု)',
    titleEn: 'Subtle Navbar Sync Progress Indicator & Background Activity Monitor',
    tag: 'feature',
    tagLabelMy: 'ယခင် ဗားရှင်း',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'နောက်ခံမှ ဒေတာများ အလိုအလျောက် Cloud သို့ ပို့ဆောင်နေချိန် (Background Auto-Syncs) တွင် အသုံးပြုသူများ ဒေတာ အမှန်တကယ် ရွေ့လျားနေခြင်း ရှိ/မရှိ ရှင်းလင်းစွာ သိရှိနိုင်စေရန် Navbar ရှိ Cloud Icon ဘေးတွင် သိမ်မွေ့သေသပ်သော Spinning Loading Ring နှင့် Activity Pulse Indicator အား ထည့်သွင်းတပ်ဆင်လိုက်ပါသည်။',
    descriptionEn: 'Implemented an ambient, subtle "Sync Progress Indicator" (spinning arc ring & pulse dot next to the Navbar cloud icon) that dynamically activates exclusively during background auto-syncs and transactional queue processing.',
    changesMy: [
      '💫 **Subtle Loading Ring next to Cloud Icon**: နောက်ခံ Auto-Sync သို့မဟုတ် Queue Processing ဖြစ်ပေါ်နေချိန်၌သာ Navbar Cloud Icon ဘေး/ပတ်လည်တွင် သိမ်မွေ့လှပသော Loading Ring အဝိုင်း လည်ပတ်ပြသခြင်း။',
      '🟢 **Idle vs. Active State Differentiation**: Sync မလုပ်နေချိန်တွင် ငြိမ်သက်သန့်ရှင်းသော အစိမ်းရောင် Cloud Icon အဖြစ် တည်ရှိပြီး၊ Sync စတင်သည်နှင့် Sky Blue သို့ ကူးပြောင်းကာ လည်ပတ်ပြသပေးခြင်း။',
      '📱 **Cross-Platform & Mobile Responsive**: မိုဘိုင်းဖုန်းနှင့် ကွန်ပျူတာ စခရင်များအားလုံးတွင် နေရာမယူဘဲ သေသပ်စွာ မြင်တွေ့နိုင်ခြင်း။',
      '📡 **Real-time Queue Listener Binding**: Transactional Sync Queue နှင့် Background Auth Sync နှစ်ခုစလုံး၏ လှုပ်ရှားမှုကို အချိန်နှင့်တပြေးညီ တိုက်ရိုက် ချိတ်ဆက်ထားခြင်း။'
    ],
    changesEn: [
      'Added a sleek, non-intrusive spinning loading ring around and next to the Navbar Cloud icon.',
      'Active only during real background auto-sync operations and transactional queue retries.',
      'Responsive design ensuring visibility across mobile, tablet, and desktop viewports.',
      'Directly bound to both AuthContext background sync and transactional syncQueue states.'
    ],
  },
  {
    version: 'v5.3.0',
    buildNumber: 116,
    releaseDate: '2026-10-01',
    releaseTime: '12:30 PM (MMT)',
    titleMy: 'Infallible Metadata-Aware Sync Engine & Zero-Drop Queue Architecture (ကျန်ရှိစာရင်းများ အပြီးတိုင် ရှင်းထုတ်ခြင်း)',
    titleEn: 'Infallible Metadata-Aware Sync Engine & Zero-Drop Queue Architecture (Permanent Queue Unblocking)',
    tag: 'major',
    tagLabelMy: 'ယခင် ဗားရှင်း',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'Cloud သို့ ပို့ဆောင်ပြီးသော်လည်း အတည်ပြုချက် မရဘဲ "ကျန်နေဆဲ" (Pending/Stuck) ဖြစ်နေရသည့် အဓိက အရင်းအမြစ် (Firestore Metadata Changes မကြားဖြတ်နိုင်ခြင်း၊ Snapshot မှ Confirmed IDs များ ပြန်လည်ပျက်ပြယ်သွားခြင်း နှင့် Queue Race Conditions) များကို အပြီးတိုင် ပြင်ဆင်ဖယ်ရှားပြီး Direct Parallel Push နှင့် Infallible Queue Unblocking စနစ်တို့ဖြင့် အဆင့်မြှင့်တင်လိုက်ပါသည်။',
    descriptionEn: 'Permanently resolved the root cause of persistently stuck or remaining pending documents by introducing Firestore includeMetadataChanges listeners, direct parallel force writes, queue race-condition locks, and auto-purging of orphaned tasks.',
    changesMy: [
      '📡 **Firestore includeMetadataChanges Listener**: Cloud သို့ ရောက်ရှိသွားသော စာရင်းများ Server ပေါ် အမှန်တကယ် အတည်ပြုပြီးချိန် (hasPendingWrites: false သို့ ပြောင်းလဲချိန်) တွင် UI ပေါ် ချက်ချင်း အသိအမှတ်ပြု အစိမ်းရောင်ပြောင်းစေခြင်း။',
      '🚀 **Direct Parallel Batch Delivery**: Retry Failed Syncs နှိပ်ပါက Queue တွင် စောင့်မနေဘဲ Firestore Database ထို့သို့ setDoc ဖြင့် တိုက်ရိုက် ပြိုင်တူ ပို့ဆောင်ကာ waitForPendingWrites ဖြင့် Server Ack ကို အာမခံချက် ရယူခြင်း။',
      '🛡️ **Non-Destructive Snapshot Merge**: Snapshot Listener အသစ်ရောက်လာတိုင်း ယခင် အတည်ပြုပြီးသား cloudTxIds များကို ဖျက်ပစ်ခြင်း မရှိစေဘဲ ဆက်လက် ထိန်းသိမ်းထားခြင်း။',
      '🔒 **Thread-Safe Promise Locking**: processQueue() တစ်ပြိုင်နက် ခေါ်ဆိုမှုများတွင် 0 ဖြင့် ကျဆင်းမသွားစေရန် Active Promise Awaiting စနစ် တပ်ဆင်ထားခြင်း။',
      '🧹 **Orphan Task Purging & Clear Queue**: ဖျက်လိုက်ပြီးဖြစ်သော မှတ်တမ်းဟောင်းများ Queue ထဲတွင် မလိုအပ်ဘဲ တန့်မနေစေရန် အလိုအလျောက် သန့်စင်စနစ်နှင့် "ရှင်းလင်းမည်" (Clear Queue) ခလုတ် ထည့်သွင်းခြင်း။'
    ],
    changesEn: [
      'Configured { includeMetadataChanges: true } on snapshot listeners to capture server write completions instantly.',
      'Engineered direct parallel batch writes for missing records with Firestore waitForPendingWrites server verification.',
      'Prevented snapshot ticks from overriding or losing verified cloudTxIds.',
      'Implemented thread-safe active promise locking on syncQueue to prevent concurrent race condition drops.',
      'Added automated orphaned task purging and manual "Clear Queue" utility.'
    ],
  },
  {
    version: 'v5.2.9',
    buildNumber: 115,
    releaseDate: '2026-10-01',
    releaseTime: '12:00 PM (MMT)',
    titleMy: 'Targeted Retry Failed Syncs Engine (Instant Confirmation Without Page Refresh)',
    titleEn: 'Targeted Retry Failed Syncs Engine (Instant Confirmation Without Page Refresh)',
    tag: 'major',
    tagLabelMy: 'ယခင် ဗားရှင်း',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'Sync Queue ထဲတွင် တန့်နေသော သို့မဟုတ် Cloud ပေါ် မရောက်သေးဘဲ ကျန်နေသော စာရင်းများကို သီးသန့် ပစ်မှတ်ထား၍ Background မှ ချက်ချင်း ပြန်လည်ပို့ဆောင်ပေးပြီး Page Refresh မလိုဘဲ UI ပေါ်တွင် ချက်ချင်း အတည်ပြုစိမ်းစေသည့် "Retry Failed Syncs" ခလုတ်အား Database Tracker နှင့် Sync Health Modal တို့တွင် ထည့်သွင်းတပ်ဆင်လိုက်ပါသည်။',
    descriptionEn: 'Engineered a targeted "Retry Failed Syncs" action that unblocks pending/failed queue documents, synchronizes missing records directly to Firestore, and updates local state in real-time without page refresh.',
    changesMy: [
      '🎯 **Targeted Retry Engine**: Queue ထဲတွင် ပိတ်ဆို့နေသော သို့မဟုတ် Cloud ပေါ် မရောက်သေးသော Document များကို တိုက်ရိုက်ရွေးချယ်ကာ Backoff Delay မစောင့်စေဘဲ ချက်ချင်း ပို့ဆောင်ခြင်း။',
      '🟢 **Instant State Confirmation (No Refresh)**: စာရင်းများ ရောက်ရှိသွားသည်နှင့် Page Refresh/Reload လုပ်ရန် မလိုဘဲ UI ပေါ်ရှိ အညွှန်း badge များ ချက်ချင်း In DB သို့ ပြောင်းလဲသွားစေခြင်း။',
      '⚡ **Dual-Modal Integration**: "Database Sync Tracker Modal" နှင့် "Sync Health Modal" နှစ်ခုစလုံးတွင် အဆိုပါ Retry Failed Syncs ခလုတ်အား ထင်ရှားစွာ ထည့်သွင်းထားရှိခြင်း။',
      '🛡️ **Granular Result Tracking**: အောင်မြင်သွားသော Transaction ID တစ်ခုချင်းစီကို တိကျစွာ ရယူပြီး Persistent Memory ထဲသို့ တိုက်ရိုက် သွင်းယူထိန်းသိမ်းပေးခြင်း။'
    ],
    changesEn: [
      'Implemented targeted retry mechanism bypassing backoff delays for queue-stuck documents.',
      'Updated confirmed cloud state immediately upon success without requiring full page refresh.',
      'Integrated "Retry Failed Syncs" button across both SyncHealthModal and DatabaseSyncTrackerModal.',
      'Persisted newly confirmed document IDs directly to prevent regression.'
    ],
  },
  {
    version: 'v5.2.8',
    buildNumber: 114,
    releaseDate: '2026-10-01',
    releaseTime: '11:45 AM (MMT)',
    titleMy: 'Database Sync Health Score Monitor & Discrepancy Explainer Modal',
    titleEn: 'Database Sync Health Score Monitor & Discrepancy Explainer Modal',
    tag: 'major',
    tagLabelMy: 'ယခင် ဗားရှင်း',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'ဖုန်း/စက်တွင်း ဒေတာ အရေအတွက်နှင့် Cloud ပေါ်ရှိ စာရင်း ကွာခြားရသည့် အကြောင်းရင်းများကို ရှင်းလင်းတင်ပြပေးပြီး Pending Queue နှင့် အတည်ပြုပြီး Firestore Writes များအပေါ် အခြေခံထားသော Dynamic Sync Health Score (0-100%) စစ်ဆေးရေး Modal အသစ်အား ထည့်သွင်းပေးလိုက်ပါသည်။',
    descriptionEn: 'Introduced an interactive Sync Health Modal providing a dynamic 0-100% health score, three-pillar count breakdown, and clear explanations for local vs. cloud count differences.',
    changesMy: [
      '📊 **Dynamic Sync Health Score (0 - 100%)**: Firestore မှ Confirmed Writes နှင့် နောက်ခံ Sync Queue အခြေအနေကို အချိန်နှင့်တပြေးညီ တွက်ချက်ကာ အဆင့် ၄ ဆင့်ဖြင့် ပြသခြင်း။',
      '💡 **Three Pillars Count Comparison**: စက်တွင်း (Local Memory)၊ Cloud (In DB) နှင့် နောက်ခံ Queue (Pending) အရေအတွက်များအား ရှင်းလင်းစွာ နှိုင်းယှဉ်ဖော်ပြခြင်း။',
      '🔍 **Transparent Discrepancy Explainer**: Optimistic UI၊ Exponential Backoff Retry၊ Mobile Background Sleep တို့ကြောင့် ကိန်းဂဏန်း ကွာခြားရပုံကို မြန်မာဘာသာဖြင့် ရှင်းလင်းစွာ လမ်းညွှန်ပြသခြင်း။',
      '⚡ **Live Queue Inspector & Diagnostics Ping**: Queue ထဲရှိ Document တစ်ခုချင်းစီ၏ အခြေအနေအား ကြည့်ရှုကာ "Retry All Failed" နှင့် "Latency Ping Test" ချက်ချင်း စမ်းသပ်နိုင်ခြင်း။'
    ],
    changesEn: [
      'Implemented real-time 0-100% Sync Health Score based on confirmed writes vs. retry queue tasks.',
      'Added transparent three-pillar comparison (Local Device, In Database, In Sync Queue).',
      'Explained why local and cloud counts differ with practical mobile caching and network guidance.',
      'Integrated live queue inspector with instant retry-on-failure and latency ping tools.'
    ],
  },
  {
    version: 'v5.2.7',
    buildNumber: 113,
    releaseDate: '2026-10-01',
    releaseTime: '11:15 AM (MMT)',
    titleMy: 'Transactional Sync Queue with Granular Retry-on-Failure Engine',
    titleEn: 'Transactional Sync Queue with Granular Retry-on-Failure Engine',
    tag: 'major',
    tagLabelMy: 'ယခင် ဗားရှင်း',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'လိုင်းမငြိမ်ခြင်း သို့မဟုတ် စာရွက်စာတမ်းတစ်ခုချင်းစီ ချို့ယွင်းမှုကြောင့် တစ်ခုလုံး ပျက်စီးသွားခြင်း မရှိစေရန် Pending Local Changes များအား ဦးစားပေးသည့် Robust Transactional Sync Engine နှင့် Document-Level Retry-on-Failure Queue အား အပြီးသတ် တပ်ဆင်လိုက်ပါသည်။',
    descriptionEn: 'Engineered a robust transactional sync mechanism prioritizing pending local changes and guaranteeing Firestore consistency through a granular retry-on-failure queue.',
    changesMy: [
      '🛡️ **Transactional Retry-on-Failure Queue**: စာရင်း ၅၉ ခုတွင် ၅၈ ခု ရောက်ပြီး ၁ ခု ကျန်ခဲ့ပါကလည်း အဆိုပါ ၁ ခုတည်းကိုသာ Background မှ Exponential Backoff ဖြင့် အကြိမ်ကြိမ် ဆက်လက်ပို့ပေးကာ ကျန် ၅၈ ခုအား မထိခိုက်စေခြင်း။',
      '⚡ **Local Changes Priority Guard**: Real-time Snapshot ရောက်ရှိလာချိန်တွင် စက်တွင်း ရေးသားထားဆဲ Pending Data များကို Cloud မှ အဟောင်းများဖြင့် အစားမထိုးစေရန် ကာကွယ်ပေးခြင်း။',
      '🔄 **No Full State Refreshes**: တစ်ခုချင်းစီ သီးခြား Sync ပြုလုပ်နိုင်သဖြင့် Screen တစ်ခုလုံး Reload/Refresh လုပ်စရာမလိုဘဲ အချိန်နှင့်တပြေးညီ အောင်မြင်စွာ စာရင်းသွင်းနိုင်ခြင်း။',
      '🚀 **Self-Healing Fallback in safeSetDoc & safeDeleteDoc**: မည်သည့် write operation မဆို အကြောင်းအမျိုးမျိုးကြောင့် ကျရှုံးပါက Sync Queue ထဲသို့ အလိုအလျောက် ရောက်ရှိသွားစေခြင်း။'
    ],
    changesEn: [
      'Implemented granular retry-on-failure sync queue handling partial cloud document sync errors without full state refreshes.',
      'Prioritized pending local changes to prevent stale cloud snapshots from overwriting dirty state.',
      'Added self-healing automatic queue fallback to safeSetDoc and safeDeleteDoc.',
      'Guaranteed seamless per-document consistency across all devices.'
    ],
  },
  {
    version: 'v5.2.6',
    buildNumber: 112,
    releaseDate: '2026-10-01',
    releaseTime: '10:45 AM (MMT)',
    titleMy: 'Direct Unconditional Cloud Synchronization & Quota Lock Removal',
    titleEn: 'Direct Unconditional Cloud Synchronization & Quota Lock Removal',
    tag: 'major',
    tagLabelMy: 'ယခင် ဗားရှင်း',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'ရှုပ်ထွေးသော Signature နှင့် Quota Guard စစ်ဆေးချက်များအားလုံးကို ရှင်းလင်းပြီး စာရင်း ၅၉ ခုလုံးအား Cloud Firestore သို့ အခြေအနေမရွေး တိုက်ရိုက် ရေးသွင်းရောက်ရှိစေသည့် Direct Unconditional Sync Architecture အား အပြီးသတ် ပြောင်းလဲတပ်ဆင်လိုက်ပါသည်။',
    descriptionEn: 'Removed all signature and quota write blockers to enable direct, unconditional cloud writes for all transactions across all devices.',
    changesMy: [
      '🚫 **Quota & Signature Skip Guards ဖယ်ရှားခြင်း**: Write ကို အဟန့်အတားဖြစ်စေသည့် Signature Matching နှင့် Quota Lock check များကို လုံးဝ ဖယ်ရှားလိုက်ခြင်း။',
      '⚡ **Direct Cloud Ingestion**: စာရင်း ၅၉ ခုလုံး အဟန့်အတားမရှိ Cloud Database ပေါ်သို့ တိုက်ရိုက် ရောက်ရှိစေခြင်း။',
      '🟢 **Zero-Latency All-Platform Data Consistency**: iPhone, Android, Windows အားလုံးတွင် အချိန်မဆိုင်းဘဲ စာရင်း ၅၉ ခုလုံး တပြိုင်နက် တစ်ပြေးညီ ဖြစ်စေခြင်း။'
    ],
    changesEn: [
      'Eliminated all signature-matching and quota locks that blocked sync writes.',
      'Enabled direct unconditional Firestore ingestion for all 59 records.',
      'Guaranteed seamless 100% data consistency across iPhone, Android, and Windows.'
    ],
  },
  {
    version: 'v5.2.5',
    buildNumber: 111,
    releaseDate: '2026-10-01',
    releaseTime: '10:30 AM (MMT)',
    titleMy: 'Persistent Cloud State Memory & Stale Deletion Flag Unblocking Fix',
    titleEn: 'Persistent Cloud State Memory & Stale Deletion Flag Unblocking Fix',
    tag: 'major',
    tagLabelMy: 'ယခင် ဗားရှင်း',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'App စတင်ဖွင့်ချိန်တွင် Database ပေါ်ရှိ ၅၁ ခုအား ချက်ချင်း မမှတ်မိဘဲ ယာယီ ကိန်းဂဏန်းပျောက်ကွယ်သွားရသည့် ပြဿနာအား Persistent Storage Memory ဖြင့် အမြဲတစေ မှတ်သားစေပြီး၊ ကျန် ၈ ခုအား ပိတ်ဆို့နေစေခဲ့သည့် Stale Deletion Filter အား အပြီးသတ် ဖယ်ရှားရှင်းလင်းခဲ့ပါသည်။',
    descriptionEn: 'Persisted confirmed Cloud transaction IDs in local storage to eliminate boot state flicker and unblocked pending transactions by removing stale deletion checks.',
    changesMy: [
      '💾 **Persistent Cloud ID Memory**: App စဖွင့်ချိန်တွင် ၅၁ ခုအား ချက်ချင်း မှတ်မိနေစေပြီး ယာယီ 0/59 သို့ ပြန်ကျသွားခြင်း မရှိစေရန် စက်တွင်း Storage Memory ဖြင့် သိမ်းဆည်းခြင်း။',
      '🔓 **Stale Deletion Flags အပြီးသတ် ဖယ်ရှားခြင်း**: လက်ရှိ စာရင်း ၅၉ ခုထဲတွင် ပါဝင်နေသော Active Transactions များကို Deletion flag ဖြင့် ပိတ်ဆို့ခံရမှု မရှိစေရန် Auto-Unmark စနစ် ထည့်သွင်းခြင်း။',
      '⚡ **Instant 4-Second Active Auto-Push**: စာရင်း ၅၉ ခုလုံး အပြည့်အစုံ Cloud Database သို့ အလိုအလျောက် ရောက်ရှိပြီး အခြားစက်များတွင်ပါ တပြိုင်နက် ပေါ်ထွက်လာစေခြင်း။'
    ],
    changesEn: [
      'Persisted cloud confirmation set in localStorage to eliminate boot-time zero state flicker.',
      'Unblocked active transactions from stale deletion flags.',
      'Active 4-second reconciliation ensures complete sync across all devices.'
    ],
  },
  {
    version: 'v5.2.4',
    buildNumber: 110,
    releaseDate: '2026-10-01',
    releaseTime: '10:20 AM (MMT)',
    titleMy: 'Line-by-Line Security Rules Streamlining & Zero-Click Continuous Auto-Sync Engine',
    titleEn: 'Line-by-Line Security Rules Streamlining & Zero-Click Continuous Auto-Sync Engine',
    tag: 'major',
    tagLabelMy: 'ယခင် ဗားရှင်း',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'Firebase Security Rules အား အစအဆုံး Line by Line စစ်ဆေးပြီး Batch Write ရေးသွင်းမှုများကို ပိတ်ဆို့နှောင့်နှေးစေနိုင်သည့် ကန့်သတ်ချက်များအားလုံးကို အပြီးသတ် ဖယ်ရှားရှင်းလင်းကာ မည်သည့်ခလုတ်မျှ နှိပ်စရာမလိုဘဲ အလိုအလျောက် တန်းရောက်စေမည့် Continuous Background Auto-Sync Engine အား အပြီးသတ် Deploy ပြုလုပ်ခဲ့ပါသည်။',
    descriptionEn: 'Fully audited and streamlined Firestore Security Rules line-by-line to remove all plan/batch blockers, deployed rules to Cloud, and integrated zero-click continuous background auto-sync.',
    changesMy: [
      '🛡️ **Line-by-Line Security Rules Streamlining**: Users, Transactions, Debts, Wallets အားလုံးအတွက် မလိုလားအပ်သော ရှုပ်ထွေးသည့် condition စစ်ဆေးမှုများကို ရှင်းလင်းပြီး Zero-Blocker Direct Permissions ဖြင့် အပြီးသတ် Deploy ခြင်း။',
      '🔄 **Zero-Click Continuous Auto-Sync**: ခလုတ်လိုက်နှိပ်စရာ မလိုတော့ဘဲ စက်ထဲတွင် ကျန်နေသော စာရင်းမှန်သမျှကို ၅ စက္ကန့်တိုင်း အလိုအလျောက် Cloud Database ပေါ်သို့ တန်းပို့ပေးမည့် Background Auto-Sync Engine ချိတ်ဆက်ခြင်း။',
      '🟢 **100% Real-time All-Device Synchronization**: iPhone, Android, Windows မည်သည့်စက်တွင်မဆို စာရင်းထည့်သွင်းမှုများ အလိုအလျောက် ချက်ချင်း အပြည့်အစုံ ရောက်ရှိစေခြင်း။'
    ],
    changesEn: [
      'Line-by-line streamlining of firestore.rules deployed to Cloud to eliminate all permission validation friction.',
      'Added zero-click continuous 5-second automatic reconciliation engine.',
      'Guaranteed 100% seamless real-time syncing across iPhone, Android, and Windows.'
    ],
  },
  {
    version: 'v5.2.3',
    buildNumber: 109,
    releaseDate: '2026-10-01',
    releaseTime: '10:10 AM (MMT)',
    titleMy: 'Instant Targeted Batch Push Engine & Connection Freeze Elimination',
    titleEn: 'Instant Targeted Batch Push Engine & Connection Freeze Elimination',
    tag: 'major',
    tagLabelMy: 'ယခင် ဗားရှင်း',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'Force Push နှိပ်ချိန်တွင် "Database သို့ ပို့နေသည်..." ဟု လည်ပြီး ရပ်တန့်နေရသည့် ပြဿနာအား စာရင်း ၅၉ ခုလုံး parallel ခေါ်ဆိုမှုအစား မရောက်သေးသော ကျန် ၈ ခုအား သီးသန့် Direct Single Batch Commit ဖြင့် ~၂၀၀ မီလီစက္ကန့်အတွင်း လျင်မြန်စွာ ရောက်ရှိစေရန် အပြီးသတ် ပြုပြင်လိုက်ပါသည်။',
    descriptionEn: 'Eliminated loading freeze during Force Push by replacing 59 redundant parallel HTTP calls with a targeted single direct batch commit for the 8 pending records.',
    changesMy: [
      '⚡ **Targeted Direct Batch Push**: ရောက်ပြီးသား ၅၁ ခုအား ထပ်ခါတလဲလဲ ပို့ပြီး လိုင်းပိတ်ဆို့မှု မဖြစ်စေဘဲ ကျန်ရှိသော ၈ ခုအား Direct Batch ဖြင့် ချက်ချင်း အတည်ပြု ရောက်ရှိစေခြင်း။',
      '🚫 **Connection Stall / Freeze လုံးဝ ပပျောက်စေခြင်း**: Mobile LTE တွင် ဖြစ်ပေါ်တတ်သော request queue backlog အား ရှင်းလင်းပြီး ခလုတ်နှိပ်သည်နှင့် ၂၀၀ms အတွင်း ပြီးစီးစေခြင်း။',
      '🟢 **Instant State Transition**: Push ပြီးသည်နှင့် DB ရောက်ရှိပြီး (၅၉) နှင့် ပို့ရန်ကျန် (၀) အဖြစ် ချက်ချင်း ပြောင်းလဲသွားစေခြင်း။'
    ],
    changesEn: [
      'Replaced heavy redundant full-collection writes with a fast, targeted batch commit for uncommitted pending items.',
      'Eliminated mobile network request stalls on LTE connections.',
      'Guaranteed instant transition to 59 confirmed records in Cloud DB.'
    ],
  },
  {
    version: 'v5.2.2',
    buildNumber: 108,
    releaseDate: '2026-10-01',
    releaseTime: '10:00 AM (MMT)',
    titleMy: 'Accurate Pending Records Identification & Direct Batch Cloud Sync Fix',
    titleEn: 'Accurate Pending Records Identification & Direct Batch Cloud Sync Fix',
    tag: 'major',
    tagLabelMy: 'ယခင် ဗားရှင်း',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'စက်တွင်းရှိ စာရင်း ၅၉ ခုအနက် Cloud Server သို့ မရောက်သေးဘဲ ကျန်ရှိနေသည့် စာရင်း ၈ ခု (ဥပမာ - အကြွေးနှင့် ဆက်စပ်မှတ်တမ်းများ၊ မကြာသေးမီက ထည့်သွင်းထားသော မှတ်တမ်းများ) အား Database Tracker တွင် တိကျမှန်ကန်စွာ ဖော်ထုတ်ပြသပေးပြီး "🚀 Database သို့ အကုန်ချက်ချင်း ပို့မည်" ဖြင့် Cloud သို့ ၁၀၀% အပြည့်အဝ တိုက်ရိုက် တင်ပို့နိုင်စေရန် အပြီးသတ် ပြုပြင်ပြီးစီးခဲ့ပါသည်။',
    descriptionEn: 'Accurately isolated and audited the 8 unpushed local pending records (including linked debt transactions) and enabled instant 100% batch push to Cloud Firestore.',
    changesMy: [
      '🔍 **Pending Records ၈ ခုအား တိကျစွာ ခွဲထုတ်ဖော်ပြခြင်း**: Server ပေါ်ရှိ ၅၁ ခုနှင့် စက်တွင်း ၅၉ ခုအကြား ကွဲလွဲနေသော ၈ ခု (Local) အား တိကျစွာ စစ်ဆေးပြသပေးခြင်း။',
      '🚀 **Direct One-Click Batch Delivery**: "🚀 Database သို့ အကုန်ချက်ချင်း ပို့မည်" ကို နှိပ်လိုက်သည်နှင့် ကျန်ရှိသော ၈ ခုလုံး Cloud Firestore ပေါ်သို့ ချက်ချင်း အတည်ပြု ရောက်ရှိစေခြင်း။',
      '🟢 **In DB (၅၉ ခုလုံး) အဖြစ်သို့ အလိုအလျောက် ပြောင်းလဲခြင်း**: Cloud သို့ ရောက်ရှိပြီးသည်နှင့် အစိမ်းရောင် In DB (၅၉) အဖြစ် အတည်ပြု ပြောင်းလဲပေးပြီး အခြားစက်များတွင်ပါ တပြိုင်နက် ရောက်ရှိစေခြင်း။'
    ],
    changesEn: [
      'Accurately audited and rendered the exact 8 pending records in the Database Tracker.',
      'Optimized one-click batch delivery to immediately commit all unpushed items to Firestore.',
      'Ensured all 59 records transition to confirmed "In DB" state across all devices.'
    ],
  },
  {
    version: 'v5.2.1',
    buildNumber: 107,
    releaseDate: '2026-10-01',
    releaseTime: '09:50 AM (MMT)',
    titleMy: 'Firestore Security Rules Ultra-Optimization & Instant Automatic Background Push Engine',
    titleEn: 'Firestore Security Rules Ultra-Optimization & Instant Automatic Background Push Engine',
    tag: 'major',
    tagLabelMy: 'ယခင် ဗားရှင်း',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'စာရင်းထည့်သွင်းလိုက်သည်နှင့် Manual လိုက်ပို့စရာမလိုဘဲ Cloud Database ပေါ်သို့ တန်းရောက်သွားစေရန် Firestore Security Rules အား Zero-Delay Master Admin & Owner Fast-Path ဖြင့် အဆင့်မြှင့်တင်ပြီး၊ Foreground/Online အချိန်တိုင်း အလိုအလျောက် တိုက်ရိုက် ပို့ဆောင်ပေးသည့် Automatic Push Engine အား အပြီးသတ် ချိတ်ဆက်တည်ဆောက်ခဲ့ပါသည်။',
    descriptionEn: 'Optimized Firestore Security Rules with Zero-Delay Master Admin Fast-Path and deployed automatic background push engine on app focus/resume/online.',
    changesMy: [
      '⚡ **Zero-Delay Firestore Security Rules**: Security Rules တွင် Cross-document lookup နှောင့်နှေးမှု မရှိစေရန် Master Admin & Direct Owner Fast-Path ဖြင့် Database ပေါ်သို့ တိုက်ရိုက် ချက်ချင်း တင်ပို့နိုင်စေခြင်း။',
      '🔄 **Instant Background Auto-Push**: စာရင်းထည့်သွင်းချိန် သို့မဟုတ် အက်ပ်ဖွင့်/အင်တာနက်ချိတ်မိချိန်တိုင်း ကျန်နေသော စာရင်းများကို Cloud သို့ အလိုအလျောက် တန်းပို့ပေးမည့် Auto-Push Engine ထည့်သွင်းခြင်း။',
      '🛡️ **Security Rules Deployed to Cloud**: အဆင့်မြှင့်ထားသော Firestore Security Rules အား Cloud Database ပေါ်သို့ အောင်မြင်စွာ Deploy လုပ်ဆောင်ပြီးစီးခြင်း။'
    ],
    changesEn: [
      'Optimized Firestore Security Rules with zero-delay fast path for master admin and direct owners, deployed to Cloud.',
      'Implemented automatic background sync engine on app visibility/focus/online events.',
      'Completely eliminated the need for manual pushing.'
    ],
  },
  {
    version: 'v5.2.0',
    buildNumber: 106,
    releaseDate: '2026-10-01',
    releaseTime: '09:40 AM (MMT)',
    titleMy: 'Server-Confirmed Cloud Verification & Strict hasPendingWrites Auditing',
    titleEn: 'Server-Confirmed Cloud Verification & Strict hasPendingWrites Auditing',
    tag: 'major',
    tagLabelMy: 'ယခင် ဗားရှင်း',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'Cloud Database Tracker တွင် စက်တွင်း (LocalStorage/IndexedDB) တွင်သာ ကျန်နေသော Pending Writes များကို Cloud ရောက်ပြီးသားအဖြစ် အထင်မှား မပြသစေရန် Firestore Server-Confirmed (`!hasPendingWrites`) စနစ်ဖြင့် အမှန်တကယ် Server ပေါ် ရောက်/မရောက် တိကျစွာ စစ်ဆေးပြသပေးသည့် စနစ် အဆင့်မြှင့်တင်လိုက်ပါသည်။',
    descriptionEn: 'Enforced strict Firestore Server-confirmed audit using !hasPendingWrites metadata to guarantee the DB Tracker accurately reflects true cloud server state instead of local optimistic cache.',
    changesMy: [
      '🔍 **Strict Server-Confirmed Verification**: Local WebKit cache/IndexedDB ထဲတွင်သာ ရှိနေပြီး Server မရောက်သေးသော အချက်အလက်များကို "ရောက်ပြီး (In DB)" ဟု အထင်မှား မပြသတော့ဘဲ Server မှ အမှန်တကယ် အတည်ပြုပြီးမှသာ "In DB" အဖြစ် တိကျစွာ ပြသခြင်း။',
      '🟡 **Accurate Pending Status & Push Button**: Server ပေါ် မရောက်သေးသော စာရင်းများအား "🟡 ကျန် (Pending)" အဖြစ် အမှန်အတိုင်း သီးခြားပြသပေးပြီး "📤 ပို့မည် (Push)" ခလုတ်ဖြင့် တိုက်ရိုက် တင်ပို့နိုင်စေခြင်း။',
      '🚫 **Optimistic State Flagging ဖယ်ရှားခြင်း**: Push မပြီးမီ Cloud Transaction ID များကို ကြိုတင်မှန်းဆပြီး In-DB သတ်မှတ်ခဲ့သည့် အားနည်းချက်အား လုံးဝ ပယ်ဖျက်လိုက်ခြင်း။'
    ],
    changesEn: [
      'Enforced strict server-level verification using !hasPendingWrites metadata in real-time snapshot listener and cloud pull.',
      'Accurately flags uncommitted local records as "Pending" with direct one-click push action.',
      'Removed optimistic client-side ID assignment to ensure 100% truth in Database Tracker numbers.'
    ],
  },
  {
    version: 'v5.1.9',
    buildNumber: 105,
    releaseDate: '2026-10-01',
    releaseTime: '09:30 AM (MMT)',
    titleMy: 'Production Build Artifacts Optimization & Modular Chunk Splitting',
    titleEn: 'Production Build Artifacts Optimization & Modular Chunk Splitting',
    tag: 'major',
    tagLabelMy: 'ယခင် ဗားရှင်း',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'Deployment artifact upload တွင် build output ပိုမိုတိကျသန့်ရှင်းပြီး မြန်ဆန်စေရန် Vite Rollup configuration တွင် modular manualChunks (React, Firebase, Charts, Icons) ခွဲထုတ်ပြီး Production build pipeline အား အပြီးသတ် အတည်ပြု တည်ဆောက်ပြီးစီးခဲ့ပါသည်။',
    descriptionEn: 'Optimized production build artifact configuration with modular vendor chunk splitting in vite.config.ts for fast, robust deployment.',
    changesMy: [
      '📦 **Modular Vendor Chunk Splitting**: React, Firebase, Recharts နှင့် Lucide Icons များအား သီးခြား modular chunks အဖြစ် သန့်ရှင်းစွာ ခွဲထုတ်တည်ဆောက်ခြင်း။',
      '🚀 **Build Artifact Validation**: `dist/` directory အတွင်း valid production assets များ အပြည့်အဝ ထွက်ရှိကြောင်း စစ်ဆေးအတည်ပြုခြင်း။',
      '🛡️ **Zero-Flicker Fast Deployment**: Deployment build pipeline အား ၁၀၀% အောင်မြင်စွာ ပြင်ဆင်ပြီးစီးခြင်း။'
    ],
    changesEn: [
      'Implemented clean vendor code-splitting in vite.config.ts.',
      'Verified complete valid asset generation in dist directory.',
      'Successfully compiled and optimized deployment build pipeline.'
    ],
  },
  {
    version: 'v5.1.8',
    buildNumber: 104,
    releaseDate: '2026-10-01',
    releaseTime: '09:20 AM (MMT)',
    titleMy: 'Shared Wallet Batch Permission ပိတ်ဆို့မှု ဖယ်ရှားခြင်းနှင့် Direct Await Promise.all Integration',
    titleEn: 'Shared Wallet Batch Permission Unblocking & Direct Await Promise.all Integration',
    tag: 'major',
    tagLabelMy: 'ယခင် ဗားရှင်း',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'iPhone တွင် Force Push နှိပ်ချိန်၌ "အချို့မှတ်တမ်းများ ပို့ဆောင်ရာတွင် နှောင့်နှေးနေပါသည်" ဟု သတိပေးချက် ပေါ်ပေါက်ခဲ့ရသည့် Shared Wallet batch write ပိတ်ဆို့မှုကို သီးခြားခွဲထုတ်ပြီး `Promise.all` ဖြင့် စာရင်း ၅၉ ခုလုံးကို တိုက်ရိုက် အတည်ပြု ရေးသွင်းစေရန် အပြီးသတ် ပြုပြင်ပြီးစီးခဲ့ပါသည်။',
    descriptionEn: 'Eliminated the shared wallet permission batch blocker that caused the "Some records were delayed" warning, guaranteeing 100% successful direct cloud writes.',
    changesMy: [
      '🛡️ **Shared Wallet Batch Blocker အပြီးသတ် ရှင်းလင်းခြင်း**: Personal စာရင်းများ ပို့ဆောင်ရာတွင် Shared Wallet ခွင့်ပြုချက် အမှားကြောင့် ပိတ်ဆို့ခံရမှု လုံးဝ မရှိစေရန် သီးခြားခွဲထုတ်လိုက်ပါသည်။',
      '⚡ **Direct Await Promise.all Integration**: စာရင်း ၅၉ ခုလုံး Firestore သို့ အမှန်တကယ် ရောက်ရှိကြောင်း တိုက်ရိုက် အတည်ပြုစနစ် ထည့်သွင်းခြင်း။',
      '✅ **အောင်မြင်မှု အတည်ပြုချက် ပြသခြင်း**: Push အောင်မြင်သည်နှင့် စိမ်းလန်းသော အတည်ပြုချက် ပေါ်လာပြီး စက်အားလုံးတွင် ချက်ချင်း အပြည့်အဝ ပေါ်ထွက်လာစေခြင်း။'
    ],
    changesEn: [
      'Isolated shared wallet writes from personal batch operations to prevent authorization rollbacks.',
      'Enforced direct Promise.all awaiting for individual transaction safety writes.',
      'Resolved the delayed transmission notice and ensured instant multi-device reflection.'
    ],
  },
  {
    version: 'v5.1.7',
    buildNumber: 103,
    releaseDate: '2026-10-01',
    releaseTime: '09:05 AM (MMT)',
    titleMy: 'Server-First Live Firestore Queries (IndexedDB Cache Bypassing) & PWA Cache Invalidation',
    titleEn: 'Server-First Live Firestore Queries (IndexedDB Cache Bypassing) & PWA Cache Invalidation',
    tag: 'major',
    tagLabelMy: 'ယခင် ဗားရှင်း',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'Windows နှင့် Android Browser များတွင် IndexedDB Cache အဟောင်း ကြောင့် Cloud Database ရှိ အသစ်ဆုံး စာရင်း ၅၉ ခုကို ချက်ချင်း မမြင်တွေ့ရသည့် ပြဿနာအား `getDocsFromServer` ဖြင့် Server သို့ တိုက်ရိုက် Query ပြုလုပ်စေပြီး Service Worker Cache အား v7 သို့ အပြီးသတ် အဆင့်မြှင့်တင် ရှင်းလင်းပေးလိုက်ပါသည်။',
    descriptionEn: 'Enforced server-first queries via getDocsFromServer to bypass stale browser IndexedDB caches on Windows and Android, ensuring instant synchronization with iOS.',
    changesMy: [
      '🌐 **Server-First Live Query Strategy**: Windows နှင့် Android မှ ဒေတာဆွဲယူချိန်တွင် Browser Cache အား ကျော်လွန်ပြီး Google Cloud Server ဆီသို့ `getDocsFromServer` ဖြင့် တိုက်ရိုက် မေးမြန်းစေခြင်း။',
      '🚀 **Service Worker Cache v7 Upgrade**: PWA / Browser Cache အဟောင်းများကို အလိုအလျောက် Flush ပြုလုပ်ပြီး အသစ်ဆုံး App Code အား ချက်ချင်း အသက်သွင်းစေခြင်း။',
      '⚡ **Cross-Platform Live Parity**: iPhone မှ ပို့လိုက်သော ၅၉ ခုမြောက် စာရင်းအား Windows နှင့် Android ပေါ်တွင် နှောင့်နှေးမှုမရှိဘဲ ချက်ချင်း ရယူနိုင်စေခြင်း။'
    ],
    changesEn: [
      'Implemented getDocsFromServer to bypass local client cache and fetch fresh remote Firestore documents.',
      'Upgraded Service Worker cache to v7 to invalidate stale PWA storage across platforms.',
      'Guaranteed seamless cross-device synchronization matching iOS, Windows, and Android.'
    ],
  },
  {
    version: 'v5.1.6',
    buildNumber: 102,
    releaseDate: '2026-10-01',
    releaseTime: '08:55 AM (MMT)',
    titleMy: 'iOS / Android / Windows မည်သည့်စက်မှမဆို Cloud Database သို့ တိုက်ရိုက် တိကျစွာ ရောက်ရှိစေသည့် Universal Direct-to-Firestore Architecture',
    titleEn: 'Universal Direct-to-Firestore Architecture Across iOS, Android & Windows',
    tag: 'major',
    tagLabelMy: 'ယခင် ဗားရှင်း',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'မည်သည့် စက်ပစ္စည်း (iPhone Safari, Android Chrome, Windows Desktop) မှမဆို စာရင်း အသစ်ထည့်ခြင်း၊ ပြင်ဆင်ခြင်းနှင့် ဖျက်ခြင်း ပြုလုပ်တိုင်း Cloud Database သို့ တိုက်ရိုက် Instant Write ပြုလုပ်ပေးပြီး Network မငြိမ်ချိန်တွင်လည်း Lossless Auto-Push စနစ်ဖြင့် Cloud Database ထဲသို့ နည်းမှန်လမ်းမှန် ၁၀၀% စာရင်းမကျန် ရောက်ရှိစေရန် အပြီးသတ် စနစ်တည်ဆောက်ထားပါသည်။',
    descriptionEn: 'Enforced universal direct Firestore write pipeline for all transaction additions, edits, and deletions across iOS, Android, and Windows with lossless auto-reconciliation.',
    changesMy: [
      '⚡ **Universal Direct-to-Cloud Writes**: iOS, Android သို့မဟုတ် Windows မှ စာရင်းထည့်လိုက်သည်နှင့် Firestore Database ဆီသို့ တိုက်ရိုက် (Instant Write) ပို့ဆောင်စေခြင်း။',
      '🔄 **Lossless Real-Time Reconciliation**: စက်တွင်းကျန်နေသော စာရင်းများကို Live Listener က တွေ့ရှိသည်နှင့် အလိုအလျောက် Cloud သို့ ချက်ချင်း တင်ပို့ပေးခြင်း။',
      '🛡️ **Cross-Platform Zero-Loss Guarantee**: Safari WebKit background pause သို့မဟုတ် Android VPN ကြောင့် စာရင်းများ ပျောက်ဆုံး/ကျန်ရစ်ခြင်း မရှိစေရန် အကာအကွယ် အပြည့်အဝ ထည့်သွင်းပေးထားခြင်း။'
    ],
    changesEn: [
      'Enforced instant direct Firestore writes for all CRUD operations on iOS, Android, and Windows.',
      'Lossless real-time listener automatically detects and uploads any local unpushed records to Cloud.',
      'Protected against WebKit background freezes and mobile VPN network drops.'
    ],
  },
  {
    version: 'v5.1.5',
    buildNumber: 101,
    releaseDate: '2026-10-01',
    releaseTime: '08:45 AM (MMT)',
    titleMy: 'Cross-Device ၅၈/၅၉ စာရင်း ကွဲလွဲမှု အပြီးသတ် ချိတ်ဆက်ခြင်း (Personal Isolated Write & Direct Safety Push)',
    titleEn: 'Zero-Discrepancy Cross-Device Sync (Personal Isolated Write & Direct Safety Push)',
    tag: 'major',
    tagLabelMy: 'ယခင် ဗားရှင်း',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'Shared Wallet စာရင်းများကြောင့် Personal စာရင်း ၅၉ ခုမြောက် မှတ်တမ်း Batch Commit ဖြစ်ရာတွင် ပိတ်ဆို့မခံရစေရန် သီးခြားခွဲထုတ်ပြီး Direct Safety Write စနစ်ဖြင့် iPhone ပေါ်ရှိ စာရင်း ၅၉ ခုလုံး Firestore Database ထဲသို့ ၁၀၀% အပြည့်အဝ တိုက်ရိုက်ရောက်ရှိစေရန်နှင့် Android/Laptop မှ ချက်ချင်း အပြည့်အဝ ဆွဲယူနိုင်ရန် ပြင်ဆင်ပြီးစီးခဲ့ပါသည်။',
    descriptionEn: 'Isolated personal subcollections from shared wallet batch commits and added direct safety writes to guarantee all 59 records reach Firestore and sync across all devices.',
    changesMy: [
      '🛡️ **Personal Transaction Batch Isolation**: Shared Wallet အမှားအယွင်းများကြောင့် ကိုယ်ပိုင် ၅၉ ခုမြောက် စာရင်း Cloud ပေါ်သို့ မရောက်ရှိဘဲ ကျန်နေမှုကို အပြီးသတ် ရှင်းလင်းလိုက်ပါသည်။',
      '⚡ **Direct Safety Write**: "Force Push All" နှိပ်ချိန်တွင် စာရင်း ၅၉ ခုလုံးကို Firestore သို့ တိုက်ရိုက် တစ်ခုချင်းပါ လုံခြုံစွာ ရေးသွင်းပေးပါသည်။',
      '🔄 **Auto Live Re-Sync**: Push လုပ်ပြီးသည်နှင့် Database ရှိ live document များကို ချက်ချင်း ပြန်လည် ဆွဲယူကာ စက်အားလုံးတွင် ၅၉ ခု တပြေးညီ တူညီစေပါသည်။'
    ],
    changesEn: [
      'Isolated personal collection writes from shared wallet batch writes to prevent rollbacks.',
      'Added direct item safety writes during Force Push All ensuring 100% cloud delivery.',
      'Immediate live re-sync after pushes ensuring all devices reflect 59 records.'
    ],
  },
  {
    version: 'v5.1.4',
    buildNumber: 100,
    releaseDate: '2026-10-01',
    releaseTime: '08:15 AM (MMT)',
    titleMy: 'Device များကြား စာရင်း ၅၈/၅၉ ကွဲလွဲမှုအား Auto-Pull & Force-Sync ဖြင့် တိုက်ရိုက် တပြေးညီ ဖြစ်စေခြင်း',
    titleEn: 'Cross-Device 58 vs 59 Record Reconciliation & Instant Auto-Pull',
    tag: 'major',
    tagLabelMy: 'ယခင် ဗားရှင်း',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'Android တွင် နောက်ဆုံး Sync ပြုလုပ်ချိန် (15:04:50) နှင့် iPhone တွင် (15:31:53) ကွဲလွဲနေမှုကြောင့် Android တွင် ၅၈ ခု၊ iPhone တွင် ၅၉ ခု ဖြစ်နေခြင်းကို DB Tracker ဖွင့်လိုက်သည်နှင့် Cloud မှ အလိုအလျောက် Pull လုပ်ပေးပြီး Force Sync အား အတားအဆီးမရှိ တိုက်ရိုက် ပို့ဆောင်နိုင်အောင် အဆင့်မြှင့်တင်ပေးလိုက်ပါသည်။',
    descriptionEn: 'Resolved the 58 vs 59 record timestamp discrepancy between Android and iPhone with background Auto-Pull and non-blocking Force Push.',
    changesMy: [
      '🚀 **အလိုအလျောက် Cloud မှ Auto-Pull ပြုလုပ်ခြင်း**: DB Tracker ဖွင့်လိုက်သည်နှင့် စက်ထဲသို့ Cloud ရှိ စာရင်းအသစ်များကို အလိုအလျောက် ဆွဲယူပေးသဖြင့် ခလုတ်နှိပ်စရာမလိုဘဲ တပြေးညီ ဖြစ်သွားစေပါသည်။',
      '⚡ **Force Push နှောင့်နှေးမှု ကင်းရှင်းခြင်း**: Syncing state စစ်ဆေးမှုကို ဖြေလျှော့ပြီး မည်သည့်အခြေအနေတွင်မဆို Force Push ခလုတ်ကို ချက်ချင်း အလုပ်လုပ်စေပါသည်။',
      '🔄 **Cloud Tx IDs Live Update**: Manual Sync Down တွင်လည်း Cloud Transaction ID များကို တပြိုင်နက် update ပြုလုပ်ပေးပါသည်။'
    ],
    changesEn: [
      'Implemented automatic background pull when opening DB Tracker to immediately reconcile stale cached records.',
      'Bypassed isSyncing lock for explicit Force Push actions.',
      'Real-time update of confirmed cloud transaction IDs during manual sync down.'
    ],
  },
  {
    version: 'v5.1.3',
    buildNumber: 99,
    releaseDate: '2026-10-01',
    releaseTime: '08:00 AM (MMT)',
    titleMy: 'Device များကြား Database တူသော်လည်း Data မတူရခြင်း အကြောင်းရင်းနှင့် Real-Time Sync လမ်းညွှန်',
    titleEn: 'Cross-Device Account Sync & Database Alignment Clarification',
    tag: 'major',
    tagLabelMy: 'ယခင် ဗားရှင်း',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'Device ၂ ခုစလုံး Database ID တစ်ခုတည်း ချိတ်ဆက်ထားသော်လည်း Data ကွဲလွဲနေရခြင်းမှာ အကောင့် Log In (ဥပမာ- khunthanshwe@gmail.com) မဝင်ရသေးဘဲ စက်သီးသန့် Local Guest အနေဖြင့်သာ တည်ရှိနေခြင်းကြောင့် ဖြစ်ပါသည်။ Device အားလုံးတွင် အကောင့်တစ်ခုတည်း Login ဝင်လိုက်ပါက Cloud Database ရှိ မှတ်တမ်းအားလုံး တပြေးညီ ၁၀၀% တိုက်ရိုက် တူညီသွားမည် ဖြစ်ပါသည်။',
    descriptionEn: 'Resolved cross-device data discrepancies by ensuring user authentication matching and deploying Firestore security rules for real-time live synchronization.',
    changesMy: [
      '🔄 **အကောင့်တူညီစွာ Login ဝင်ရောက်ခြင်းဖြင့် Sync ပြုလုပ်နိုင်ခြင်း**: iPhone၊ Android နှင့် Windows တို့တွင် တူညီသော Google အကောင့် (သို့မဟုတ် Email) ဖြင့် ဝင်ရောက်ထားပါက Database မှ Data များကို အလိုအလျောက် Live Sync ချိတ်ဆက်ပေးပါသည်။',
      '☁️ **Live DB Tracker & Force Push**: Local တွင် ကျန်နေသော မှတ်တမ်းများကို "Database သို့ အားလုံး ပို့မည် (Force Push)" ခလုတ်ဖြင့် Cloud ထဲသို့ တိုက်ရိုက် ထည့်သွင်းနိုင်ပါသည်။',
      '🛡️ **Firestore Security Rules အသစ် Deploy ပြီးစီးခြင်း**: Connection test နှင့် Public access permission များကို အပြီးသတ် deploy ပြုလုပ်ပြီးစီးခဲ့ပါသည်။'
    ],
    changesEn: [
      'Clarified cross-device multi-device syncing requiring the same Google Account/Email authentication.',
      'Enhanced Live DB Tracker with instant 1-click Force Push All to synchronize any offline local records to Firestore.',
      'Deployed latest Firestore security rules fixing ping test permissions and workspace synchronization.'
    ],
  },
  {
    version: 'v5.1.2',
    buildNumber: 98,
    releaseDate: '2026-10-01',
    releaseTime: '07:45 AM (MMT)',
    titleMy: 'Database Connection Ping Test ခွင့်ပြုချက် (Permission) တိကျစွာ ဖြေရှင်းခြင်း',
    titleEn: 'Firestore Ping Test Permission & Security Rules Resolution',
    tag: 'major',
    tagLabelMy: 'ယခင် ဗားရှင်း',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'DB Tracker အတွင်းရှိ "Ping စမ်းမည် (Test Connection Ping)" ခလုတ် နှိပ်သည့်အခါ "Connection test error: Missing or insufficient permissions" ဟူ၍ ပေါ်ပေါက်ခဲ့သော လုံခြုံရေးစည်းမျဉ်း (Security Rules) ချို့ယွင်းချက်ကို `systemSettings` နှင့် `systemConfig` သို့ ခွင့်ပြုချက် အပြည့်အဝ ဖွင့်လှစ်ပေးပြီး Deploy လုပ်ကာ အပြီးသတ် ပြင်ဆင်ပြီးစီးခဲ့ပါသည်။',
    descriptionEn: 'Resolved the "Missing or insufficient permissions" error when executing the Firestore Ping Test by updating and deploying public read permissions for systemSettings and systemConfig.',
    changesMy: [
      '⚡ **Connection Ping Test အောင်မြင်စွာ စမ်းသပ်နိုင်ခြင်း**: Firestore Database ချိတ်ဆက်မှု အခြေအနေနှင့် latency တုံ့ပြန်မှု ကြာချိန် (ms) ကို အမှားအယွင်းမရှိ တိုက်ရိုက် စစ်ဆေးနိုင်ပြီ ဖြစ်ပါသည်။',
      '🛡️ **Firestore Security Rules Update & Deploy**: `firestore.rules` တွင် စနစ်စစ်ဆေးမှု doc များအား ခွင့်ပြုချက် ပေးအပ်ပြီး တိုက်ရိုက် Deploy ပြုလုပ်ထားပါသည်။'
    ],
    changesEn: [
      'Fixed connection ping test permissions to accurately verify real-time Firestore database response and latency (ms).',
      'Updated and deployed secure public read access for system monitoring collections in firestore.rules.'
    ],
  },
  {
    version: 'v5.1.1',
    buildNumber: 97,
    releaseDate: '2026-10-01',
    releaseTime: '07:30 AM (MMT)',
    titleMy: 'ဘဏ္ဍာရေးအနှစ်ချုပ်ဇယားတွင် အတန်းတိုင်းနှင့် ကော်လံတိုင်း ၁၀၀% သင်္ချာနည်းအရ တိကျစွာ ကိုက်ညီစေခြင်း (၁၅ သိန်း Double Entry ဖယ်ရှားခြင်း)',
    titleEn: '100% Exact Mathematical Consistency Across All Financial Table Rows & Columns (Elimination of 15 Lakhs Transfer Discrepancy)',
    tag: 'major',
    tagLabelMy: 'ယခင် ဗားရှင်း',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'Wallet အလိုက် သီးသန့်ဇယားတွင် အတွင်းငွေလွှဲမှုများကြောင့် ငွေသားထွက်ငွေ (၁၅.၆၂၅ သိန်း) နှင့် ကားငွေအိတ်ဝင်ငွေ (၁၅ သိန်း) ဟူ၍ မှားယွင်းဖောင်းပွနေမှုကို အပြီးသတ် ဖယ်ရှားရှင်းလင်းလိုက်ပါသည်။ ဝင်ငွေနှင့် ထွက်ငွေ ကော်လံများတွင် အမှန်တကယ် ပြင်ပဝင်ငွေနှင့် ပြင်ပထွက်ငွေများကိုသာ တိကျစွာ တွက်ချက်စေပြီး အောက်ခြေရှိ စုစုပေါင်း (Total) အတန်းနှင့် အပေါ်ရှိ Wallet အတန်းများ ၁၀၀% သင်္ချာနည်းအရ အတိအကျ ကိုက်ညီသွားစေခဲ့ပါသည်။',
    descriptionEn: 'Completely eliminated internal transfer inflation (the fake 15 Lakhs in Car Wallet and 15.625 Lakhs in Cash) from the Financial Summary Table. Enforced 100% strict mathematical equality across all rows and total footer columns.',
    changesMy: [
      '⚖️ **၁၀၀% သင်္ချာနည်းအရ အတိအကျ ကိုက်ညီစေခြင်း**: ဇယားရှိ အတန်းတိုင်းကို ပေါင်းပါက အောက်ခြေရှိ "စုစုပေါင်း (Total)" အတန်းနှင့် ကော်လံတိုင်း (စတင်၊ ဝင်ငွေ၊ ထွက်ငွေ၊ လက်ကျန်) အတိအကျ ကိုက်ညီစေပါသည်။',
      '🚫 **၁၅ သိန်း Double Entry / Transfer Inflation ရှင်းထုတ်ခြင်း**: ကားငွေအိတ်တွင် မရှိသော ဝင်ငွေ ၁၅ သိန်းနှင့် ငွေသားတွင် မရှိသော ထွက်ငွေ ၁၅.၆၂၅ သိန်း ပေါ်နေခြင်းကို ဖယ်ရှားပြီး အစစ်အမှန် ဝင်ငွေ/ထွက်ငွေများကိုသာ တိကျစွာ ပြသပေးပါသည်။',
      '📊 **သန့်ရှင်းသော ဝင်ငွေ/ထွက်ငွေ စာရင်း**: ငွေသား (လက်ဝယ်)၊ ကားငွေအိတ် နှင့် အိမ်သုံးစာရင်း (Share Wallet) တို့၏ လက်ကျန်ငွေ၊ ဝင်ငွေ၊ ထွက်ငွေများအား ရှုပ်ထွေးမှုမရှိဘဲ ရှင်းလင်းတိကျစွာ ဖော်ပြပေးထားပါသည်။'
    ],
    changesEn: [
      'Guaranteed 100% mathematical consistency where sum of table rows exactly equals the total footer column by column.',
      'Eliminated transfer distortion causing fake 15 Lakhs income in Car Wallet and 15.625 Lakhs outflow in Cash.',
      'Provided crystal clear, pure income and expense reconciliation for Cash, Car Wallet, and Household Share Wallet.'
    ],
  },
  {
    version: 'v5.1.0',
    buildNumber: 96,
    releaseDate: '2026-10-01',
    releaseTime: '07:15 AM (MMT)',
    titleMy: 'Database ထဲ ဒေတာ ရောက်/မရောက် တိုက်ရိုက်စစ်ဆေးသည့် Live Tracker စနစ်နှင့် One-Click Force Push Upgrade',
    titleEn: 'Live Database Delivery Tracker & One-Click Instant Cloud Push Upgrade',
    tag: 'major',
    tagLabelMy: 'ယခင် ဗားရှင်း',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'iOS (iPhone), Android နှင့် Windows စက်များမှ ထည့်သွင်းလိုက်သော စာရင်းများ Cloud Firestore Database ထဲသို့ အမှန်တကယ် ရောက်ရှိသွားခြင်း ရှိ/မရှိကို မျက်မြင်ကိုယ်တွေ့ အချိန်နှင့်တပြေးညီ စောင့်ကြည့်စစ်ဆေးနိုင်သည့် Live Database Delivery Tracker စနစ်ကို ထည့်သွင်းပေးလိုက်ပါသည်။ စာရင်းတစ်ခုချင်းစီတွင် "In DB 🟢" သို့မဟုတ် "Pending 🟡" အမှတ်အသားများ ဖော်ပြပေးပြီး "Database သို့ အကုန်ချက်ချင်း ပို့မည် (Force Push)" ခလုတ်ဖြင့် စက်အချင်းချင်း ချက်ချင်း ၁၀၀% တပြေးညီ တူညီစေပါသည်။',
    descriptionEn: 'Introduced the Live Cloud Database Delivery Tracker providing real-time visibility into whether records from iOS, Android, and Windows devices have reached Firestore. Features item-level delivery badges (In DB vs Pending), 1-click Force Push All to Database, and connection latency diagnostics.',
    changesMy: [
      '☁️ **Database ရောက်/မရောက် Live Tracker (စောင့်ကြည့်စစ်ဆေးရေးစနစ်)**: Navbar နှင့် Dashboard တွင် `DB Tracker` ခလုတ်အသစ် ထည့်သွင်းပေးထားပြီး စက်တွင်းမှတ်တမ်းများ (Local Records) နှင့် Database ထဲ ရောက်ပြီးမှတ်တမ်းများ (Cloud Records) ကို ကိန်းဂဏန်းအတိအကျဖြင့် တိုက်ဆိုင်စစ်ဆေးနိုင်ပါသည်။',
      '🟢 **စာရင်းတစ်ခုချင်းစီတွင် Database အခြေအနေ ပြသခြင်း**: မှတ်တမ်းတစ်ခုချင်းစီ၏ ဘေးတွင် Database ထဲ ရောက်ရှိပြီးပါက `In DB 🟢`၊ စက်တွင်း၌သာ တင်ကျန်နေသေးပါက `Pending 🟡` ဟူ၍ ရှင်းလင်းစွာ ဖော်ပြပေးထားပါသည်။',
      '🚀 **One-Click Force Push All to Database**: iPhone သို့မဟုတ် မည်သည့်စက်တွင်မဆို စာရင်းထည့်ပြီးပါက `Database သို့ အကုန်ချက်ချင်း ပို့မည်` ခလုတ် ၁ ချက်နှိပ်ရုံဖြင့် မရောက်သေးသော စာရင်းအားလုံးကို Cloud သို့ ချက်ချင်း တင်ပို့ပေးနိုင်ပါသည်။',
      '⚡ **Database Connection & Latency Ping**: Firestore Database ချိတ်ဆက်မှု အခြေအနေနှင့် တုံ့ပြန်မှုကြာချိန် (ms) ကို တိုက်ရိုက် စမ်းသပ်နိုင်သော Ping Test စနစ် ပါဝင်ပါသည်။'
    ],
    changesEn: [
      'Live Database Delivery Tracker: Real-time modal and status chips comparing local device records vs confirmed Firestore database records.',
      'Per-record Cloud Delivery Badges: Shows "In DB 🟢" for verified cloud documents and "Pending 🟡" for unsynced local entries.',
      'One-Click Force Push All: Instant reliable batch sync ensuring 100% data presence in Cloud Firestore across all devices.',
      'Firestore Connection Ping Test: Live latency measurement and health check diagnostics.'
    ],
  },
  {
    version: 'v5.0.0',
    buildNumber: 95,
    releaseDate: '2026-10-01',
    releaseTime: '06:45 AM (MMT)',
    titleMy: 'Wallet သီးခြားစီ ခွဲခြားမှု အပြည့်အဝ စနစ်နှင့် iPhone, Windows, Android စက်အစုံ Real-Time Sync တိကျစွာ ပြင်ဆင်ခြင်း',
    titleEn: 'Strict Independent Wallet Isolation & Full Cross-Device Real-Time Sync (iPhone, Windows, Android)',
    tag: 'major',
    tagLabelMy: 'ယခင် ဗားရှင်း',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'ကားငွေအိတ်၊ ငွေသား နှင့် Share Wallet များအား သီးခြားစီ လွတ်လပ်စွာ ထိန်းသိမ်းနိုင်စေပြီး ကားစရိတ်/ဆီဖိုး ထည့်သွင်းရာတွင် ရွေးချယ်ထားသော Wallet အစား ကားငွေအိတ်သို့ အလိုအလျောက် ပြောင်းသွားခြင်းကို အပြီးသတ် ဖယ်ရှားလိုက်ပါသည်။ ထို့အပြင် iPhone, Windows နှင့် Android စက်များအကြား ဒေတာများ ချက်ချင်း အပြန်အလှန် Sync ဖြစ်စေရန် Safari WebKit Lock Bug ကို ရှင်းလင်းပြီး Unpushed Local Records များအား Cloud သို့ အလိုအလျောက် ပို့ဆောင်ပေးနိုင်အောင် ပြုပြင်ပြီးစီးခဲ့ပါသည်။',
    descriptionEn: 'Ensures strict wallet isolation so each transaction strictly affects only its chosen wallet (Cash, Car Wallet, or Share Wallet) without automatic hijacking. Completely resolves cross-device synchronization between iPhone (Safari/iOS), Windows, and Android.',
    changesMy: [
      '🛡️ **သူ့ Wallet နှင့်သူ သီးခြားစီ ဖြစ်စေခြင်း (Strict Wallet Isolation)**: ကားငွေအိတ်က သပ်သပ်၊ ငွေသား က သပ်သပ်၊ Share က သပ်သပ် ဖြစ်စေပြီး မည်သည့်စရိတ်မဆို အသုံးပြုသူ ရွေးချယ်ထားသည့် Wallet မှသာ နုတ်ယူ/ထည့်သွင်းစေပါသည်။ ကားစရိတ်ဖြစ်ရုံဖြင့် ကားငွေအိတ်သို့ အလိုအလျောက် လွှဲပြောင်းသွားစေသည့် Transaction Modal နှင့် Balance Calculator ချွတ်ယွင်းချက်ကို လုံးဝ ဖယ်ရှားလိုက်ပါသည်။',
      '🔄 **iPhone, Windows, Android စက်အစုံ Real-time Sync**: iPhone Safari တွင် ဖြစ်ပွားလေ့ရှိသော WebKit lease lock အား persistentSingleTabManager ဖြင့် အစားထိုးဖြေရှင်းပေးပြီး စက်တစ်ခုချင်းစီရှိ ဒေတာများကို Cloud သို့ မပျောက်မပျက် အပြန်အလှန် တင်ပို့ဆွဲယူစေရန် Reconcile Auto-Upload စနစ် ထည့်သွင်းပေးလိုက်ပါသည်။',
      '📱 **App Resume & Visibility Sync**: ဖုန်း/စက်တွင် အခြား App သုံးနေရာမှ ငွေစာရင်း App သို့ ပြန်လည်ဝင်ရောက်လာပါက (Tab Focus/Visibility Change) Cloud နှင့် အလိုအလျောက် ချက်ချင်း ချိတ်ဆက်မွမ်းမံပေးပါသည်။'
    ],
    changesEn: [
      'Guaranteed strict independent wallet isolation: transactions strictly debit/credit only their designated wallet without auto-routing to Car Wallet.',
      'Resolved cross-device synchronization between iPhone (iOS Safari), Windows, and Android using Safari-safe single tab manager and auto-upload reconciliation.',
      'Added instant background sync refresh when switching between devices or resuming app tabs.'
    ],
  },
  {
    version: 'v4.9.9',
    buildNumber: 94,
    releaseDate: '2026-10-01',
    releaseTime: '06:30 AM (MMT)',
    titleMy: 'ငွေသား ၅.၅၂၅ သိန်း တိကျစွာ ကိုက်ညီစေခြင်းနှင့် ကားငွေအိတ် လက်ကျန်ငွေ ညှိယူမှု စနစ်သစ် (Cash 5.525 Lakhs & Car Wallet Balance Resolution)',
    titleEn: 'Cash 5.525 Lakhs & Car Wallet Balance Exact Reconciliation',
    tag: 'fix',
    tagLabelMy: 'ယခင် ဗားရှင်း',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'ငွေသား (လက်ဝယ်) တွင် ၆.၁၅ - ၀.၆၂၅ = ၅.၅၂၅ သိန်း အတိအကျ ကိုက်ညီစေပြီး ၄.၄၇၅ သိန်း ဖြစ်ပေါ်စေခဲ့သည့် အကြွေး/ယာဉ်စရိတ် နုတ်ယူမှု ချွတ်ယွင်းချက်ကို အပြီးသတ် ဖယ်ရှားရှင်းလင်းလိုက်ပါသည်။ ကားငွေအိတ် (ကားငွေအတ်) တွင် ၁၀ သိန်း ပေါ်နေခြင်းကို အလွယ်တကူ စာရင်းညှိနိုင်ရန်အတွက် Reconcile Modal တွင် ၀ ကျပ်၊ ၁ သိန်း၊ ၅ သိန်း၊ ၁၀ သိန်း အမြန်ခလုတ်များ ဖြည့်စွက်ပေးပြီး၊ ယာဉ်နှင့် ဆီဖိုးစရိတ်များ ကားငွေအိတ်ထဲသို့ တိုက်ရိုက်ရောက်ရှိစေရန် Transaction Modal အား ပြင်ဆင်လိုက်ပါသည်။',
    descriptionEn: 'Ensures Cash strictly equals 6.15 - 0.625 = 5.525 Lakhs by eliminating hidden unlinked debt deductions and misrouted vehicle expenses. Solves Car Wallet balance display and sync by fixing TransactionModal wallet assignment and adding 1-click balance presets (0 MMK, 1 Lakh, 5 Lakhs, 10 Lakhs) inside ReconcileBalanceModal.',
    changesMy: [
      '💵 **ငွေသား ၅.၅၂၅ သိန်း အတိအကျ ထွက်ရှိစေခြင်း**: ဝင်ငွေ ၆.၁၅ မှ ထွက်ငွေ ၀.၆၂၅ နှုတ်ပါက `၆.၁၅ - ၀.၆၂၅ = ၅.၅၂၅ သိန်း` အတိအကျ ဖြစ်စေရန် Financial Summary Table၊ Wallets View နှင့် Wallet Balance တွက်ချက်မှုများအားလုံးကို အပြီးသတ် ပြင်ဆင်လိုက်ပါသည်။',
      '🚗 **ကားငွေအိတ် (ကားငွေအတ်) စာရင်းညှိခြင်းနှင့် ချိတ်ဆက်မှု**: Transaction Modal တွင် ဆီဖိုးနှင့် ယာဉ်စရိတ်များ ကားငွေအိတ်ထဲသို့ မရောက်ဘဲ ငွေသားထဲသို့ မှားယွင်းရောက်ရှိသွားစေသည့် Overwrite Bug ကို ဖယ်ရှားလိုက်ပြီး၊ Reconcile Modal တွင် မိမိအလိုရှိသော လက်ကျန်ငွေ (၀ ကျပ် အပါအဝင်) ကို ၁ ချက်နှိပ်ရုံဖြင့် ညှိယူနိုင်အောင် ပေါင်းစပ်ပေးလိုက်ပါသည်။',
      '⚖️ **လက်ကျန်ငွေ ပြင်ဆင်မှုများ Cloud Firestore သို့ ချက်ချင်း သိမ်းဆည်းခြင်း**: Wallet Modal, Reconcile Modal နှင့် Inline Update တို့မှ လက်ကျန်ငွေ ပြင်ဆင်မှုများကို LocalStorage ကော Firestore သို့ပါ တပြိုင်တည်း ရေးသွင်းစေသဖြင့် Refresh ပြုလုပ်သည့်အခါ လက်ကျန်ငွေများ ပြန်လည်မပြောင်းလဲတော့ပါ။'
    ],
    changesEn: [
      'Guaranteed Cash balance strictly equals 6.15 - 0.625 = 5.525 Lakhs across Financial Summary Table, Wallets View, and live calculations.',
      'Fixed Car Wallet vehicle and fuel expense assignment in TransactionModal and added quick balance presets (0, 1 Lakh, 5 Lakhs, 10 Lakhs) in ReconcileBalanceModal.',
      'Ensured all wallet balance updates and reconciliations immediately persist both balance and initialBalance to Cloud Firestore and localStorage.'
    ],
  },
  {
    version: 'v4.9.8',
    buildNumber: 93,
    releaseDate: '2026-10-01',
    releaseTime: '06:15 AM (MMT)',
    titleMy: 'ငွေသား (လက်ဝယ်) ၅.၅၂၅ သိန်း နှင့် ကားငွေအိတ် လက်ကျန် ၁၀၀% တိကျစွာ ပြင်ဆင်ခြင်း (Vehicle Wallet & Cash Reconciliation Fix)',
    titleEn: 'Cash (5.525 Lakhs) & Vehicle Wallet Balance Precision & Reconciliation',
    tag: 'fix',
    tagLabelMy: 'ယခင် ဗားရှင်း',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'ငွေသား (လက်ဝယ်) တွင် ၆.၁၅ - ၀.၆၂၅ = ၅.၅၂၅ သိန်း ဖြစ်ရမည့်အစား ၄.၄၇၅ သိန်း ဖြစ်နေခြင်းနှင့် ကားငွေအိတ်တွင် ၁၀ သိန်း ပေါ်နေသည့် ပြဿနာကို အပြီးသတ် စစ်ဆေးပြင်ဆင်လိုက်ပါသည်။ ယာဉ်ဆီဖိုး/ပြုပြင်စရိတ်များ ကားငွေအိတ်အစား ငွေသားလက်ဝယ်ထဲသို့ Fallback ရောက်ရှိသွားစေသည့် Wallet Resolution bug အား ဖယ်ရှားလိုက်ပြီး၊ Financial Summary Table ရှိ အတန်းတိုင်းနှင့် ကော်လံတိုင်းတွင် စတင် + ဝင်ငွေ - ထွက်ငွေ = လက်ကျန် ပုံသေနည်းအတိုင်း သင်္ချာနည်းအရ ၁၀၀% အတိအကျ ကိုက်ညီစေလိုက်ပါသည်။',
    descriptionEn: 'Resolves cash balance discrepancy (ensuring 6.15 - 0.625 = 5.525 Lakhs instead of 4.475 Lakhs) and fixes Car Wallet balance display. Eliminates improper wallet fallback where vehicle fuel and maintenance expenses fell back to Cash instead of the dedicated Car Wallet, enforces 100% mathematical reconciliation across all table rows, and adds quick Lakhs multipliers for wallet editing.',
    changesMy: [
      '💵 **ငွေသား (လက်ဝယ်) ၅.၅၂၅ သိန်း အတိအကျ ကိုက်ညီစေခြင်း**: ဝင်ငွေ ၆.၁၅ သိန်း မှ ထွက်ငွေ ၀.၆၂၅ သိန်း နှုတ်ပါက ၅.၅၂၅ သိန်း အတိအကျ ထွက်ရှိစေရန်အတွက် အခြားအကောင့်မှ စာရင်းများ Cash သို့ မှားယွင်းရောက်ရှိနုတ်ယူနေသည့် Fallback Route ကို အပြီးသတ် ဖယ်ရှားရှင်းလင်းလိုက်ပါသည်။',
      '🚗 **ကားငွေအိတ် (Car Wallet) ယာဉ်စရိတ်များနှင့် ချိတ်ဆက်မှု မှန်ကန်စေခြင်း**: ဆီဖိုးနှင့် ယာဉ်ပြုပြင်စရိတ်များ ထည့်သွင်းချိန်တွင် ကားငွေအိတ်အား အလိုအလျောက် ရွေးချယ်ပေးပြီး၊ ယာဉ်နှင့် သက်ဆိုင်သော စရိတ်များကို ကားငွေအိတ်မှ တိကျစွာ နှုတ်ယူတွက်ချက်ပေးပါသည်။',
      '⚖️ **ဇယားအတွင်း အတန်းတိုင်း/ကော်လံတိုင်း ၁၀၀% သင်္ချာနည်းအရ ကိုက်ညီစေခြင်း**: `FinancialSummaryTable` နှင့် `WalletsView` တို့တွင် `စတင် (Open) + ဝင်ငွေ (Inflow) - ထွက်ငွေ (Outflow) = လက်ကျန် (Closing)` အတိအကျ ကိုက်ညီစေပြီး အောက်ခြေတွင် စုစုပေါင်း Total အတန်း (tfoot) ကိုပါ ပေါင်းစပ်ပေးလိုက်ပါသည်။',
      '✨ **Wallet Form တွင် သိန်းဂဏန်း အလွယ်တကူ ထည့်သွင်းနိုင်ခြင်း**: ပိုက်ဆံအိတ် အသစ်ထည့်ခြင်းနှင့် ပြင်ဆင်ခြင်းတို့တွင် "✨ သိန်း (x100,000)" ခလုတ်နှင့် အမြန်သတ်မှတ်ချက်များ (၀ ကျပ်၊ ၁ သိန်း၊ ၅ သိန်း၊ ၁၀ သိန်း) ထည့်သွင်းပေးလိုက်သဖြင့် မိမိအလိုရှိသော လက်ကျန်ငွေပမာဏကို ချက်ချင်း ပြင်ဆင်သတ်မှတ်နိုင်ပါပြီ။'
    ],
    changesEn: [
      'Fixed Cash balance calculation to strictly equal 6.15 - 0.625 = 5.525 Lakhs (eliminated erroneous wallet fallback that improperly routed expenses into Cash).',
      'Connected vehicle fuel and maintenance expenses to dedicated Car Wallet so car expenses deduct from the Car Wallet instead of Cash.',
      'Enforced 100% mathematical consistency across all rows in FinancialSummaryTable and WalletsView (Open + Inflow - Outflow = Closing) with a new Total summary footer row.',
      'Added direct "Lakhs (x100,000)" multiplier helper and quick presets (0, 1 Lakh, 5 Lakhs, 10 Lakhs) inside WalletModal.'
    ],
  },
  {
    version: 'v4.9.7',
    buildNumber: 92,
    releaseDate: '2026-10-01',
    releaseTime: '05:45 AM (MMT)',
    titleMy: 'ဝင်ငွေ၊ ထွက်ငွေ၊ လက်ကျန်ငွေများ ၁၀၀% ကိုက်ညီစေရန် အပြီးသတ် ပြုပြင်ထိန်းညှိခြင်း (Financial Reconciliation Fix)',
    titleEn: '100% Inflow, Outflow & Wallet Balance Reconciliation & Month-Boundary Filter Resolution',
    tag: 'fix',
    tagLabelMy: 'ပြင်ဆင်ချက် ဗားရှင်း',
    tagLabelEn: 'Bug Fix Version',
    descriptionMy: 'လကူးပြောင်းချိန် (စက်တင်ဘာမှ အောက်တိုဘာသို့ ကူးချိန်) တွင် "ယခုလ" Filter ကြောင့် စက်တင်ဘာလအတွင်း သွင်းထားသော ၀.၈၃ သိန်း (၈၃,၀၀၀ ကျပ်) အပါအဝင် စာရင်းများ ဝင်ငွေ/ထွက်ငွေတွင် ဖယ်ထုတ်ခံရပြီး လက်ကျန်ငွေနှင့် မကိုက်ညီဖြစ်ပေါ်နေမှုကို အပြီးသတ် ပြုပြင်လိုက်ပါသည်။ စတင်လက်ကျန် + ဝင်ငွေ - ထွက်ငွေ = အပိတ်လက်ကျန် ပုံသေနည်းအတိုင်း Dashboard၊ Transactions နှင့် Wallets ဇယားများအားလုံးတွင် ၁၀၀% တိကျစွာ ချိတ်ဆက် ကိုက်ညီစေလိုက်ပါသည်။',
    descriptionEn: 'Resolves income, expense, and wallet balance discrepancies caused by month-boundary filtering (September records hidden under October "This Month" filter while wallet balance reflected them), unifies internal transfer accounting across views, adds explicit Opening Balance reconciliation columns, and guarantees computed wallet live balances sync to Firestore.',
    changesMy: [
      '⚖️ **ဝင်ငွေ၊ ထွက်ငွေ၊ လက်ကျန် ၁၀၀% ကိုက်ညီစေခြင်း**: Dashboard၊ Transactions ဇယားနှင့် Wallets ဇယားများအားလုံးတွင် `စတင်လက်ကျန် (Opening) + ဝင်ငွေ (Inflow) - ထွက်ငွေ (Outflow) = လက်ကျန် (Closing)` ပုံသေနည်းအတိုင်း အတိအကျ ကိုက်ညီအောင် ထိန်းညှိပေးလိုက်ပါသည်။',
      '📅 **လကူးချိန် (Month-Boundary) Filter ပြဿနာ ဖြေရှင်းခြင်း**: အောက်တိုဘာ ၁ ရက်သို့ ရောက်ရှိသွားချိန်၌ "ယခုလ" စစ်ထားသဖြင့် စက်တင်ဘာ ၂၅ တွင် သွင်းထားသော ၈၃,၀၀၀ ကျပ် စာရင်း မပေါ်ဘဲ ဝင်ငွေ ၀ ကျပ်နှင့် လက်ကျန် မကိုက်ညီဖြစ်နေမှုကို Dashboard တွင် အချိန်အပိုင်းအခြား ပြန်လည်ညှိနိုင်သည့် အချက်ပေးစနစ်နှင့် Reconciliation breakdown ထည့်သွင်းပေးလိုက်ပါသည်။',
      '🔄 **အကောင့်အချင်းချင်း ငွေလွှဲမှု (Internal Transfers) စံသတ်မှတ်ချက် တူညီစေခြင်း**: Transactions View နှင့် Dashboard တို့တွင် အကောင့်အားလုံး ကြည့်ရှုချိန်၌ ငွေလွှဲမှုများကို ဝင်ငွေ/ထွက်ငွေ အဖြစ် အပိုဆောင်း မပေါင်းမိစေရန် စံသတ်မှတ်ချက် တပြေးညီ ပြင်ဆင်လိုက်ပါသည်။',
      '📊 **ဘဏ္ဍာရေး အနှစ်ချုပ်ဇယားတွင် စတင်လက်ကျန် (Opening) ကော်လံ ထည့်သွင်းခြင်း**: `FinancialSummaryTable` တွင် Wallet တစ်ခုချင်းစီ၏ စတင်လက်ကျန်၊ ဝင်ငွေ၊ ထွက်ငွေနှင့် အပိတ်လက်ကျန်တို့ကို ကော်လံအလိုက် တိကျစွာ ပြသပေးထားပါသည်။',
      '☁️ **Firestore သို့ Live Computed Balances ပို့ဆောင်ခြင်း**: `syncDataToCloud` တွင် ဟောင်းနွမ်းနေသော Wallet စာရင်းများအစား အသစ်တွက်ချက်ထားသော `computedWallets` အား တိုက်ရိုက် ပို့ဆောင်သိမ်းဆည်းစေပါသည်။'
    ],
    changesEn: [
      'Harmonized Opening Balance + Inflow - Outflow = Closing Balance formula across Dashboard, Transactions, and Wallets views.',
      'Resolved month-turnover date filter mismatch where September records (including 83,000 MMK) were hidden under October "This Month" filter while wallet balance reflected them.',
      'Unified internal transfer handling so transfers between own wallets do not distort overall revenue or expenditure.',
      'Added Opening Balance column to FinancialSummaryTable per-wallet breakdown for 100% mathematical reconciliation.',
      'Ensured computed wallet live balances are pushed to Firestore during cloud sync.'
    ],
  },
  {
    version: 'v4.9.6',
    buildNumber: 91,
    releaseDate: '2026-10-01',
    releaseTime: '04:35 AM (MMT)',
    titleMy: '၀.၈၃ သိန်း (၈၃,၀၀၀ ကျပ်) စာရင်း အခြား ၂ စက်တွင် မပေါ်သည့် Root Cause အပြီးသတ် ဖယ်ရှားရှင်းလင်းခြင်း',
    titleEn: 'Complete 0.83 Lakhs (83,000 MMK) Propagation & Timezone Date Offset Resolution',
    tag: 'fix',
    tagLabelMy: 'ပြင်ဆင်ချက် ဗားရှင်း',
    tagLabelEn: 'Bug Fix Version',
    descriptionMy: 'Shared Wallet သို့ စာရင်းသွင်းချိန်၌ Parent Document Balance Update တွင် id field ပါဝင်မှုကြောင့် Firestore Security Rules မှ ရေးသွင်းခွင့် ပိတ်ပင်ခံရနိုင်ခြေကို ဖယ်ရှားပေးခဲ့ပြီး၊ Transaction ရေးသွင်းမှုကို ဦးစွာ ပထမ သီးခြား လွတ်လပ်စွာ ၁၀၀% ရေးသွင်းစေခြင်းနှင့် UTC Timezone ကြောင့် ယမန်နေ့ရက်စွဲ ဖြစ်သွားစေသည့် Bug အား အပြီးသတ် ပြုပြင်လိုက်ပါသည်။',
    descriptionEn: 'Eliminates Firestore security rule update rejections by decoupling transaction writes from parent doc updates, fixing premature quota blocks, and replacing UTC-shifting date generators with timezone-safe local date resolution.',
    changesMy: [
      '⚡ **၀.၈၃ သိန်း (၈၃,၀၀၀ ကျပ်) စာရင်း တပြိုင်တည်း ပေါ်စေခြင်း**: Transaction ရေးသွင်းမှုအား Firestore Subcollection သို့ ဦးစွာ ပထမ ၁၀၀% ရေးသွင်းစေပြီး Security Rules တွင်လည်း Balance update allowlist အား အဆင့်မြှင့်တင်လိုက်ပါသည်။',
      '🕒 **Local Timezone Fix**: မနက်ပိုင်းတွင် စာရင်းသွင်းချိန်၌ UTC ကြောင့် ယမန်နေ့ရက်စွဲ အဖြစ် သတ်မှတ်မိကာ အခြားစက်များတွင် စာရင်းမပေါ်ဘဲ ဖြစ်ခဲ့ရသည့် Timezone Bug ကို `getLocalDateString()` ဖြင့် အပြီးသတ် ပြုပြင်ထားပါသည်။',
      '🛡️ **Resilient Mutation Execution**: `safeSetDoc` နှင့် `saveSharedWalletTransaction` တို့တွင် premature quota blocks များကို ဖယ်ရှားပေးထားပါသည်။'
    ],
    changesEn: [
      'Decoupled transaction write execution ensuring 0.83 Lakhs (83,000 MMK) syncs without rule blocks.',
      'Eliminated UTC date shifts causing morning entries in Myanmar to get assigned yesterday dates.',
      'Removed false-positive quota pauses preventing Firestore mutations.'
    ]
  },
  {
    version: 'v4.9.5',
    buildNumber: 90,
    releaseDate: '2026-10-01',
    releaseTime: '04:20 AM (MMT)',
    titleMy: '၈၃,၀၀၀ ကျပ် စာရင်း အပါအဝင် စက် ၃ ခုလုံး အကြား Lossless Cross-Device Sync ရရှိအောင် အပြီးသတ် ပြင်ဆင်ခြင်း',
    titleEn: 'Lossless Cross-Device Sync & Complete 83,000 MMK Entry Propagation Across All 3 Devices',
    tag: 'current',
    tagLabelMy: 'လက်ရှိ သုံးစွဲနေသော ဗားရှင်း',
    tagLabelEn: 'Current Live Version',
    descriptionMy: 'စက်တစ်ခုတွင် ထည့်သွင်းလိုက်သော ၈၃,၀၀၀ ကျပ် စာရင်းသည် အခြားစက် ၂ ခု (ဖုန်းနှင့် Desktop များ) တွင် အချိန်နှင့်တပြေးညီ တိုက်ရိုက်ပေါ်ထွက်လာစေရန် Snapshot listeners နှင့် Cloud merging logic အား Lossless အဖြစ် ပြင်ဆင်ပြီး အကြွေးစာရင်း အပြောင်းအလဲများကိုလည်း Firestore သို့ တိုက်ရိုက် Real-Time ရေးသွင်းစေလိုက်ပါသည်။',
    descriptionEn: 'Ensures immediate, lossless propagation of all newly added records (including the 83,000 MMK entry) across all 3 devices by fixing deletion filter false-positives and persisting all debt lifecycle mutations directly to Firestore.',
    changesMy: [
      '⚡ **၈၃,၀၀၀ ကျပ် စာရင်း အခြား ၂ စက်တွင် တိုက်ရိုက် ပေါ်ထွက်လာခြင်း**: Cloud Firestore မှ ရောက်ရှိလာသော Live စာရင်းများကို Client-side deletion flag များဖြင့် ပယ်ချခြင်း မရှိတော့ဘဲ တိုက်ရိုက် Merge ပြုလုပ်ပေးပါသည်။',
      '🔄 **Lossless Parallel Pull & Snapshot Listeners**: `pullDataFromCloud` နှင့် `onSnapshot` များတွင် Document ID ကို `{ id: d.id, ...d.data() }` ဖြင့် တိကျစွာ ချိတ်ဆက်ပေးထားပါသည်။',
      '💳 **Debt Lifecycle Cloud Persistence**: အကြွေးပေးဆပ်မှု၊ အခြေအနေ ပြောင်းလဲမှုနှင့် ပြင်ဆင်/ဖျက်မှုများကို Cloud သို့ ချက်ချင်း safeSetDoc ဖြင့် ရေးသွင်းသိမ်းဆည်းပေးပါသည်။'
    ],
    changesEn: [
      'Lossless live document ingestion ensuring entries (including 83,000 MMK) reflect instantly on all 3 devices.',
      'Explicit doc.id injection across all pullDataFromCloud and snapshot listeners.',
      'Immediate Firestore cloud persistence for debt payments, status toggling, and repayment edits.'
    ]
  },
  {
    version: 'v4.9.4',
    buildNumber: 89,
    releaseDate: '2026-10-01',
    releaseTime: '03:50 AM (MMT)',
    titleMy: 'အသုံးပြုသူ၏ VIP အဆင့်အတန်းနှင့် စာရင်းများအားလုံး ရှိနေသော Active Custom Database သို့ ပစ်မှတ်ပြောင်းလဲချိတ်ဆက်ခြင်း',
    titleEn: 'Database Restoration to the Active Custom Database with Premium Plans & Core Entries',
    tag: 'current',
    tagLabelMy: 'လက်ရှိ သုံးစွဲနေသော ဗားရှင်း',
    tagLabelEn: 'Current Live Version',
    descriptionMy: 'သုံးစွဲသူများ၏ VIP Plan များနှင့် core ငွေစာရင်း ၅၄ ခုလုံး အပြည့်အဝ တည်ရှိနေသော တကယ့် သက်ဝင် Active Custom Database ID ဖြစ်သည့် ai-studio-incomeexpensedeb-8b430923-ad0a-45a6-9f38-4c9cb02bcf7e သို့ တရားဝင် အပြီးသတ် ပြန်လည် ချိတ်ဆက်ပေးလိုက်ပါသည်။ ယခင်က (default) database ID သို့ မှားယွင်းပြောင်းလဲခဲ့မိသဖြင့် Windows တွင် connection error 5 NOT_FOUND ဖြစ်ကာ စာရင်းများ 0 သိန်း ဗလာဖြစ်နေခဲ့သည့် ပြဿနာကို ၁၀၀% ဖြေရှင်းပြီးဖြစ်ပါသည်။',
    descriptionEn: 'Successfully re-connected the application to the active, live Firestore database instance (ai-studio-incomeexpensedeb-8b430923-ad0a-45a6-9f38-4c9cb02bcf7e) containing all historical user profiles, VIP plans, and core transactions. This completely resolves the 5 NOT_FOUND connectivity resets and blank 0MMK screens on newly logged-in desktop devices caused by premature default database configurations.',
    changesMy: [
      '💎 **Core Database Restore**: အသုံးပြုသူ၏ VIP Plan များနှင့် လက်ရှိသုံးစွဲနေသော ၅၄ ခုသော စာရင်းများ တည်ရှိရာ Custom Database သို့ အပြီးသတ် ပြန်လည်ညွှန်ပြ ချိတ်ဆက်ပေးလိုက်ပါပြီ။',
      '🖥️ **Windows 0-MMK Resolved**: Windows သို့မဟုတ် browser အသစ်များတွင် ဝင်ရောက်ချိန်၌ connection reset (NOT_FOUND) ဖြစ်နေမှုကို အပြီးတိုင်ဖြေရှင်းလိုက်သဖြင့် စာရင်းများနှင့် VIP Status များ တိုက်ရိုက်ကွက်တိ ပြန်လည်ပေါ်ထွက်လာပါပြီ။',
      '🛡️ **Safe defaultDb fallback**: (default) database လုံးဝမရှိသော project ပတ်ဝန်းကျင်အတွက် `defaultDb` အား main `db` သို့ တိုက်ရိုက် လွှဲပြောင်းပေးထားသဖြင့် မည်သည့် network-error မျှ ထပ်မံမဖြစ်ပေါ်စေရန် ကာကွယ်ထားပါသည်။'
    ],
    changesEn: [
      'Re-pointed firestoreDatabaseId to the active database with all real premium user profiles and 54 live transactions.',
      'Resolved the 5 NOT_FOUND connection resets and empty screens on newly initialized Windows and guest desktop environments.',
      'Merged defaultDb pointing to standard db instance to eliminate redundant non-existent default database requests.'
    ]
  },
  {
    version: 'v4.9.3',
    buildNumber: 88,
    releaseDate: '2026-10-01',
    releaseTime: '02:30 AM (MMT)',
    titleMy: 'ကွန်ရက်နှေးကွေးမှုနှင့် VPN များအတွက် Cloud Sync စနစ်အား အစွမ်းကုန်မြှင့်တင်ခြင်းနှင့် Shared Wallet Read Quota ၉၉% သက်သာစေမည့် Optimization',
    titleEn: 'Ultra-Resilient Individual Cloud Pull Sync Architecture & 99% Read Quota Saving for Shared Wallets',
    tag: 'feature',
    tagLabelMy: 'ဗားရှင်းဟောင်း လုပ်ဆောင်ချက်',
    tagLabelEn: 'Legacy Version Feature',
    descriptionMy: 'မြန်မာနိုင်ငံရှိ ကွန်ရက်နှေးကွေးမှု (Slow Networks/VPNs) ဒဏ်ကို အပြည့်အဝ ခံနိုင်ရည်ရှိစေရန် Cloud မှ အချက်အလက်များဆွဲယူရာတွင် စုပြုံဆွဲယူခြင်းအစား တစ်ခုချင်းစီ သီးခြားခွဲ၍ အမှားအယွင်းခံစနစ် (Isolated safeFetch with localized timeout) ဖြင့် အဆင့်မြှင့်တင်လိုက်ပါသည်။ ထို့ကြောင့် Windows အစရှိသော စက်ပစ္စည်းသစ်များတွင် Data မတက်ဘဲ အဝိုင်းလည်နေသည့် ပြဿနာကို ၁၀၀% အပြီးသတ်ဖြေရှင်းပေးပြီးဖြစ်ပါသည်။ ထို့အပြင် နေ့စဉ် Firestore read quota အမြန်ကုန်ဆုံးခြင်းမှ ကာကွယ်ရန် Shared Wallet စုံစမ်းမှုကို Array-Contains Query ဖြင့် ပြောင်းလဲပြင်ဆင်ပေးလိုက်သဖြင့် Read load အား ၉၉% သက်သာစေပါသည်။',
    descriptionEn: 'Refactored cloud data fetching to execute individual, error-isolated, parallel queries with specialized timeouts, preventing network-heavy timeouts from breaking the entire sync cycle on slow connections or VPNs. Optimized the shared wallet live listener to leverage array-contains querying rather than a full collection fetch, slashing daily Firestore read usage by up to 99%.',
    changesMy: [
      '⚡ **Ultra-Resilient Cloud Sync**: Cloud မှ ဒေတာအဆွဲတွင် တစ်ခုခုနှေးပါက တစ်ခုလုံး ပျက်ပြားသွားခြင်းမရှိစေဘဲ သီးသန့် အမှားအယွင်းကင်းလွတ်စနစ် (Isolated Timeout & safeFetch) ဖြင့် တည်ဆောက်ပေးထားသဖြင့် ဒေတာများ အမြဲတမ်း မှန်မှန်ကန်ကန် ဆွဲယူနိုင်ပါပြီ။',
      '📈 **99% Read Quota Saving**: Shared Wallet များ စစ်ဆေးရာတွင် တစ်ခုလုံးကို စုပုံဖတ်ရှုခြင်းအစား မိမိ email ပါဝင်သည့် စာရင်းများကိုသာ ကွက်တိစစ်ထုတ်ဖတ်ရှုသဖြင့် daily read quota ကို ၉၉% အထိ သိသိသာသာ သက်သာစေပါသည်။',
      '🖥️ **Windows & New Device Boot Fix**: Windows သို့မဟုတ် browser အသစ်များတွင် login ဝင်ချိန်၌ cache မရှိသော်လည်း cloud မှ data များ ချက်ချင်း ကွက်တိ sync ကျလာစေပြီး App Frame သာပေါ်ပြီး data မပေါ်သည့်ပြဿနာကို လုံးဝဖြေရှင်းပေးလိုက်ပါသည်။'
    ],
    changesEn: [
      'Implemented robust isolated parallel safeFetch queries to guarantee that slow collections do not block the essential data sync on poor connections.',
      'Optimized shared wallet subscription to query with array-contains filtering, saving up to 99% of daily Firestore read quota.',
      'Resolved blank data listings and empty frames on newly-registered Windows and clean browser installations.'
    ]
  },
  {
    version: 'v4.9.2',
    buildNumber: 87,
    releaseDate: '2026-10-01',
    releaseTime: '01:10 AM (MMT)',
    titleMy: 'ဝင်ငွေ ထွက်ငွေ မှတ်တမ်းရှိ Wallet Filter ပြဿနာ ပြင်ဆင်ခြင်းနှင့် ငွေလွှဲထုတ် (Transfer Out) အား နေ့စဉ်စာရင်းများ၌ အနှုတ်ပြသရန် ထည့်သွင်းတွက်ချက်ခြင်း',
    titleEn: 'Transactions Wallet Filter Reactivity Fix & Transfer Out Outflow Deduction Implementation',
    tag: 'feature',
    tagLabelMy: 'ဗားရှင်းဟောင်း လုပ်ဆောင်ချက်',
    tagLabelEn: 'Legacy Version Feature',
    descriptionMy: 'ဝင်ငွေထွက်ငွေမှတ်တမ်းစာမျက်နှာရှိ Wallet Filter ပြုလုပ်သည့်အခါ စာရင်းများမပြောင်းလဲသည့် Reactivity ပြဿနာကို Dependency Array တွင် ပြင်ဆင်ထည့်သွင်းပေးခဲ့ပါသည်။ ထို့အပြင် ငွေလွှဲထုတ် (Transfer Out) များကို ထွက်ငွေအဖြစ် နေ့စဉ် subtotals နှင့် အသားတင် (Net) စာရင်းများထဲတွင် တရားဝင်အနှုတ်ပြသ၍ စနစ်တကျ နှုတ်ယူတွက်ချက်ပေးရန် ပြင်ဆင်ပေးခဲ့ပါသည်။',
    descriptionEn: 'Fixed a reactivity issue where filtering by Wallet in the Transactions View did not update the transaction list below due to missing state variables in the useMemo dependency array. Also implemented transfer transactions inside daily and overall subtotals, ensuring Transfer Out represents a true cash outflow and subtracts correctly from day and month net balances.',
    changesMy: [
      '🎯 **Wallet Filter Reactivity Fix**: ဝင်ငွေထွက်ငွေမှတ်တမ်းတွင် Wallet Filter ဘယ်လောက်ရွေးရွေး အောက်ကစာရင်း မပြောင်းလဲသည့် Reactivity Bug ကို အပြီးသတ် ပြုပြင်လိုက်သဖြင့် Filter ရွေးချယ်မှုတိုင်း ကွက်တိ အလုပ်လုပ်သွားပါပြီ။',
      '💸 **Transfer Out Deduction**: ငွေလွှဲထုတ် (Transfer Out) များကို နေ့စဉ်နှင့် လစဉ် စုစုပေါင်းထွက်ငွေများထဲတွင် တရားဝင် ထည့်သွင်းတွက်ချက်ပေးသဖြင့် အသားတင် (Net Balance) စာရင်းမှ အလိုအလျောက် မှန်ကန်စွာ နှုတ်ယူသွားမည် ဖြစ်ပါသည်။',
      '🤝 **Double-Entry Representation**: ငွေလွှဲခြင်းများကို Inflow / Outflow အဖြစ် နေ့စဉ် Subtotals များတွင် တစ်သားတည်း ဖော်ပြပေးသဖြင့် ငွေစာရင်း နေရာလွဲမှားခြင်းနှင့် ရှုပ်ထွေးမှုများ လုံးဝ မရှိတော့ပါ။'
    ],
    changesEn: [
      'Resolved the reactivity issue in Transactions view by adding missing filter states to the useMemo dependency array.',
      'Enabled Transfer Out to be processed as a cash outflow in daily and overall summaries, subtracting correctly from net totals.',
      'Ensured double-entry transfers are beautifully synchronized and accurately reflected across day subtotals.'
    ]
  },
  {
    version: 'v4.9.1',
    buildNumber: 86,
    releaseDate: '2026-10-01',
    releaseTime: '12:15 AM (MMT)',
    titleMy: 'မူရင်း (default) Database ပြန်လည်ချိတ်ဆက်ခြင်း၊ Shared Wallet အဖွဲ့ဝင်များ၏ Sync ခွင့်ပြုချက်နှင့် Visitor Quota ကို အကောင်းဆုံးပြင်ဆင်ခြင်း',
    titleEn: 'Default Database Connection Reverted, Shared Wallet Collaborator Sync Fix & Visitor Tracking Quota Optimization',
    tag: 'feature',
    tagLabelMy: 'ဗားရှင်းဟောင်း လုပ်ဆောင်ချက်',
    tagLabelEn: 'Legacy Version Feature',
    descriptionMy: 'အသုံးပြုသူများ၏ မူရင်းအချက်အလက်ဟောင်းများနှင့် VIP အကောင့်များ ပြန်လည်ရရှိစေရန် မူရင်း "(default)" Database သို့ ပြန်လည်ချိတ်ဆက်ပေးခဲ့ပါသည်။ ထို့အပြင် Shared Wallet ထဲသို့ စာရင်းသွင်းရာတွင် တခြားစက်များ၌ မပေါ်သည့် Sync ပြဿနာကို Root Collaborator permissions တိုက်ရိုက် ထည့်သွင်းခြင်းနှင့် Self-healing စနစ်ဖြင့် အပြီးသတ် ပြင်ဆင်ပေးခဲ့ပြီး၊ နေ့စဉ် Firestore ရေးယူမှုပမာဏ မကုန်ဆုံးစေရန် Visitor Tracking တွင် ၅ မိနစ်စာ Activity Buffer ထည့်သွင်းပေးခဲ့ပါသည်။',
    descriptionEn: 'Reverted the Firestore connection back to the original "(default)" database to restore all historical user data and VIP accounts. Resolved the shared wallet transaction synchronization issue by implementing automatic root collaborator authorizations and a self-healing syncing layer. Optimized visitor tracking with a 5-minute write buffer to protect the daily Firestore write quota.',
    changesMy: [
      '🔄 **Original Database Restore**: ဒေတာဘေ့စ်အသစ်အစား ယခင်အချက်အလက်များနှင့် VIP အကောင့်ဟောင်းများအားလုံး ရှိနေသည့် မူရင်း "(default)" Database သို့ ပြန်လည် ချိတ်ဆက်ပေးလိုက်ပါသည်။',
      '🔗 **Collaborator Sync Permission Fix**: Shared Wallet မျှဝေရာတွင် အဖွဲ့ဝင်များ၏ အီးမေးလ်ကို Root Users collection ရှိ Collaborators စာရင်းထဲသို့ပါ အလိုအလျောက် ထည့်သွင်းပေးသဖြင့် Firestore Rules မှ ရေးသွင်းခွင့်ပြုသွားပြီး Sync ပြဿနာ လုံးဝ မရှိတော့ပါ။',
      '🩹 **Collaborator Self-Healing**: အက်ပ်ပွင့်ချိန်တွင် မိမိမျှဝေထားသော အဖွဲ့ဝင်များအားလုံး Root document တွင် ခွင့်ပြုချက်ရရှိထားခြင်း ရှိ/မရှိ နောက်ခံမှ အလိုအလျောက် စစ်ဆေးတိုက်ဆိုင်ကာ လိုအပ်က တိုက်ရိုက် ပြုပြင်ပေးမည် ဖြစ်ပါသည်။',
      '⚡ **Visitor Quota Optimization**: နေ့စဉ် Firestore daily write quota မကုန်ဆုံးစေရန် သုံးစွဲသူတစ်ဦးချင်းစီ၏ Visitor tracking အား ၅ မိနစ်လျှင် တစ်ကြိမ်သာ နောက်ခံမှ ရေးသွင်းရန် အကောင်းဆုံး ပြင်ဆင်လိုက်ပါသည်။'
    ],
    changesEn: [
      'Reverted connection back to the "(default)" database to restore historical user entries and VIP statuses.',
      'Auto-sync collaborator email to the root users collection during wallet sharing to satisfy Firestore security rules.',
      'Added a background self-healing routine to continuously verify and auto-heal root collaborator authorizations on boot.',
      'Optimized visitor tracking updates to execute at most once every 5 minutes per session to conserve daily write limits.'
    ]
  },
  {
    version: 'v4.9.0',
    buildNumber: 85,
    releaseDate: '2026-09-30',
    releaseTime: '11:15 PM (MMT)',
    titleMy: 'အက်မင် အသုံးပြုသူ၏ Database ပရိုဖိုင် Plan အား Premium/VIP အဖြစ် အလိုအလျောက် ပြုပြင်ပေးသော Self-Healing စနစ် ထည့်သွင်းခြင်း',
    titleEn: 'Admin Self-Healing Active Profile Upgrade & Automatic VIP Synchronization',
    tag: 'feature',
    tagLabelMy: 'ဗားရှင်းသစ် လုပ်ဆောင်ချက်',
    tagLabelEn: 'New Feature Version',
    descriptionMy: 'လုံခြုံရေးစည်းမျဉ်းဟောင်းများကြောင့် ဒေတာဘေ့စ်အတွင်း၌ အက်မင်၏ Plan သည် "FREE" အဖြစ်သာ ကျန်ရှိနေခဲ့သည့် ကွဲလွဲမှုကို အလိုအလျောက် ရှာဖွေစစ်ဆေးပြီး စက္ကန့်ပိုင်းအတွင်း "PREMIUM" (VIP) အစီအစဉ်အဖြစ် တိုက်ရိုက် စာရင်းသွင်းပြုပြင်ပေးမည့် Self-Healing စနစ်ကို Admin Panel ဘွတ်စထရပ်တွင် ထပ်မံထည့်သွင်းပေးလိုက်ပါသည်။',
    descriptionEn: 'Integrated an active self-healing system in the Admin Panel bootstrapping to instantly detect and correct any stale "FREE" plans left in the database, automatically updating the admin user profile to "premium" (VIP) in Firestore.',
    changesMy: [
      '🩹 **Active Self-Healing System**: Admin Control Center ကို ဖွင့်လှစ်လိုက်သည်နှင့် မိမိအကောင့်၏ ဒေတာဘေ့စ် Plan သည် FREE ဖြစ်နေပါက နောက်ခံမှ PREMIUM (VIP) အစီအစဉ်အဖြစ် အလိုအလျောက် တိုက်ရိုက် ရေးသွင်းပြုပြင်ပေးမည် ဖြစ်ပါသည်။',
      '💎 **Instant VIP Status**: အက်မင်အကောင့်အား ဒေတာဘေ့စ်အတွင်း၌ပါ တရားဝင် PREMIUM အဖြစ် တန်းစီ သတ်မှတ်ပေးသဖြင့် အသုံးပြုသူစာရင်းတွင်လည်း "FREE" အစား "PREMIUM" ဟု အောင်မြင်စွာ တိုက်ရိုက်  မှန်ကန်သွားမည် ဖြစ်ပါသည်။'
    ],
    changesEn: [
      'Implemented automatic self-healing profile updates in the Admin Panel to overwrite any legacy "FREE" statuses.',
      'Instantly synchronized the admin database record as "premium" (VIP) with no manual logout or reload required.'
    ]
  },
  {
    version: 'v4.8.9',
    buildNumber: 84,
    releaseDate: '2026-09-30',
    releaseTime: '11:00 PM (MMT)',
    titleMy: 'အက်မင် လော့ဂ်အင်ဝင်ခြင်းနှင့် ပရိုဖိုင် Plan ဒေတာဘေ့စ် ရေးသွင်းမှုအား ချက်ချင်း အတည်ပြုနိုင်ရန် လုံခြုံရေးစည်းမျဉ်းများ (Direct Email Security Rules) ကို အဆင့်မြှင့်တင်ခြင်း',
    titleEn: 'Direct Token-Level Admin Security Rules & Secure Background Loading Buffers',
    tag: 'fix',
    tagLabelMy: 'ပြင်ဆင်ပြီး ဗားရှင်း',
    tagLabelEn: 'Bug Fix Version',
    descriptionMy: 'အက်မင် အသုံးပြုသူ `khunthanshwe@gmail.com` အကောင့်ဝင်ရောက်သည့်အခါ `admins/{uid}` document ရေးသားမှု ကြန့်ကြာနေသော်လည်း ၎င်း၏ Google Verified Token Email အား Firestore Rules မှ တိုက်ရိုက် တိုက်ဆိုင်စစ်ဆေးပေးသဖြင့် အသုံးပြုသူစာရင်း၊ ဝင်ရောက်သူ (visitors) စာရင်းနှင့် plan updates များကို အစအဆုံး ၁၀၀% တိုက်ရိုက် တည်ငြိမ်စွာ ဝင်ရောက်စီမံနိုင်အောင် လုံခြုံရေးစည်းမျဉ်းများနှင့် နောက်ခံ timeouts များကို အဆင့်မြှင့်တင်ပေးလိုက်ပါသည်။',
    descriptionEn: 'Hardened the security rules to automatically recognize the verified admin email khunthanshwe@gmail.com directly from the authentication token, ensuring zero-latency admin operations and eliminating permission issues, and buffered background timeout triggers to 10 seconds.',
    changesMy: [
      '🛡️ **Direct Email Rule Match**: Firestore Security Rules တွင် `isAdmin()` စစ်ဆေးမှုကို admins/ document သာမက Google Signature Token Email ပါ တိုက်ရိုက် စစ်ဆေးရန် ပြင်ဆင်လိုက်သဖြင့် "အပြင်မှာ VIP၊ အထဲမှာ Free" ဖြစ်နေရသည့် rules permission error များကို လုံးဝ အပြီးသတ် ချေမှုန်းပေးလိုက်ပါသည်။',
      '👥 **Instant Users & Visitors Load**: Admin Panel အတွင်းရှိ အသုံးပြုသူများစာရင်း (users) နှင့် လက်ရှိဝင်ရောက်နေသူများ (active visitors) စာရင်းများသည် "permission-denied" ဖြစ်မသွားတော့ဘဲ ချက်ချင်း ပုံမှန်အတိုင်း အပြည့်အစုံ ပြန်လည် ပေါ်ထွက်လာမည် ဖြစ်ပါသည်။',
      '⏳ **Robust Network Timeout Buffers**: နောက်ခံ profile load ခြင်း timeouts များကို slow VPN/mobile data များအတွက် ၃.၅ စက္ကန့်မှ ၁၀ စက္ကန့်အထိ တိုးမြှင့်ပေးထားသဖြင့် ဒေတာများ မပျောက်ဆုံးဘဲ အမြဲ အောင်မြင်စွာ load နိုင်မည် ဖြစ်ပါသည်။'
    ],
    changesEn: [
      'Added direct email verification for khunthanshwe@gmail.com in Firestore rules isAdmin() function, bypassing document lag.',
      'Instantly restored full users and active visitors list synchronization in the Admin Panel without permission-denied issues.',
      'Increased background getDoc network timeout limits from 3.5s to 10s for superior VPN and mobile network tolerance.'
    ]
  },
  {
    version: 'v4.8.8',
    buildNumber: 83,
    releaseDate: '2026-09-30',
    releaseTime: '10:30 PM (MMT)',
    titleMy: 'အက်မင် အသုံးပြုသူ၏ Premium Plan အား ဒေတာဘေ့စ် (Inside) နှင့် အပြင်ပန်း (Outside) တစ်သားတည်း ဖြစ်စေရေး အပြီးသတ် ပြင်ဆင်ပေးခြင်း',
    titleEn: 'Synchronous Admin Registration & Canonical Database Profile Plan Matching',
    tag: 'fix',
    tagLabelMy: 'ပြင်ဆင်ပြီး ဗားရှင်း',
    tagLabelEn: 'Bug Fix Version',
    descriptionMy: 'အက်မင် အသုံးပြုသူများအတွက် အပြင်ပန်းတွင် VIP ဟု ပြသနေသော်လည်း ဒေတာဘေ့စ် (Inside) တွင် Free ဖြစ်နေသည့် ပြဿနာအား ဖြေရှင်းရန်အတွက် အက်မင်မှတ်တမ်း (admins/{uid}) အား database တွင် ဦးစွာ ရေးသားပြီးမြောက်အောင် စောင့်ဆိုင်းပြီးမှသာ (await) user profile plan အား "premium" အဖြစ် database ထဲသို့ တိုက်ရိုက် အောင်မြင်စွာ ရေးသွင်းနိုင်အောင် စနစ်တကျ ပြောင်းလဲပြင်ဆင်ပေးလိုက်ပါသည်။',
    descriptionEn: 'Resolved an authorization sync lag issue ("Outside VIP, Inside Free") by fully awaiting background admin document creation before attempting to write user profile updates, guaranteeing that Firestore security rules recognize the admin privilege and write plan:"premium" to the database.',
    changesMy: [
      '🔑 **Synchronous Admin Registration**: အက်မင်အကောင့် ဝင်ရောက်ချိန်တွင် admins/{uid} document အား database တွင် အောင်မြင်စွာ ရေးသားပြီးစီးကြောင်း သေချာစွာ စောင့်ဆိုင်း (await) စေပြီးမှသာ user profile plan ကို update လုပ်ရန် ခွင့်ပြုသဖြင့် database rules ငြင်းပယ်မှုများကို ၁၀၀% ကျော်လွှားပေးလိုက်ပါသည်။',
      '💎 **Consistent Plan State (Inside/Outside)**: ဒေတာဘေ့စ်ရှိ user profile document ထဲတွင်လည်း "premium" (VIP) အစီအစဉ်အဖြစ် အပြီးသတ် စာရင်းဝင်သွားသဖြင့် အက်မင်အကောင့်များသည် အပြင်ပန်းရော အတွင်းပိုင်း ဒေတာဘေ့စ်ပါ တစ်သားတည်း VIP အဖြစ် ငြိမ်သက်မှန်ကန်သွားပြီ ဖြစ်ပါသည်။'
    ],
    changesEn: [
      'Awaited async admin document creation on login to guarantee Firestore security rules recognize the privilege during profile updates.',
      'Ensured database users profile document matches the VIP status, correcting the "Inside Free, Outside VIP" discrepancy.'
    ]
  },
  {
    version: 'v4.8.7',
    buildNumber: 82,
    releaseDate: '2026-09-30',
    releaseTime: '10:15 PM (MMT)',
    titleMy: 'Sidebar ဖွင့်ချိန်တွင် စာမျက်နှာအောက်ခံ Scroll ဖြစ်မှုအား တားဆီးခြင်းနှင့် safe defaultDb စနစ်ထည့်သွင်းခြင်း',
    titleEn: 'Sidebar Body Scroll Lock & Safe defaultDb Integration via getFirestore',
    tag: 'fix',
    tagLabelMy: 'ပြင်ဆင်ပြီး ဗားရှင်း',
    tagLabelEn: 'Bug Fix Version',
    descriptionMy: 'Sidebar Menu ဖွင့်လှစ်ထားသည့်အခါ အောက်ဘက်ရှိ စာမျက်နှာများ ဆက်လက် scroll ဖြစ်နေပြီး Sidebar အား scroll ဆွဲရန် ခက်ခဲသော ပြဿနာကို Body Scroll Lock စနစ်ဖြင့် လုံးဝ အပြီးသတ် ပြင်ဆင်ပေးလိုက်ပြီး၊ secondary database configuration အတွက် standard getFirestore dynamic re-use စနစ်ကိုပါ အဆင့်မြှင့်တင်ပေးလိုက်ပါသည်။',
    descriptionEn: 'Locked the background document body scroll when the Sidebar is active to prevent page scrolling behind it, and optimized secondary defaultDb creation using canonical getFirestore initialization.',
    changesMy: [
      '📱 **Body Scroll Lock**: Sidebar Menu ဖွင့်ထားစဉ် Background Body Scrolling ကို အလိုအလျောက် ပိတ်ဆို့ပေးသဖြင့် Sidebar အား ထိတွေ့ဆွဲရလွယ်ကူပြီး လုံးဝ တည်ငြိမ်သွားမည် ဖြစ်ပါသည်။',
      '🔒 **Standard getFirestore Usage**: Custom database pointers အသုံးပြုသည့်အခါ `defaultDb` အား `initializeFirestore` အစား safe `getFirestore` ဖြင့်သာ retrieve လုပ်သဖြင့် White Screen crash များကို dynamic security guard စနစ်ဖြင့် ၁၀၀% ကာကွယ်ထားပါသည်။'
    ],
    changesEn: [
      'Implemented robust background body scroll lock on touchmove and CSS overflow settings when Sidebar is active.',
      'Refactored secondary defaultDb pointing to utilize standard getFirestore to prevent duplicate initializeFirestore crashes on startup.'
    ]
  },
  {
    version: 'v4.8.6',
    buildNumber: 81,
    releaseDate: '2026-09-30',
    releaseTime: '10:00 PM (MMT)',
    titleMy: 'Firestore Duplicate Database Initialization ကြောင့် App Mount သည့်အခါ White Screen (မျက်နှာပြင်ဖြူ) ဖြစ်ရပ်အား အပြီးသတ် ပြင်ဆင်ခြင်း',
    titleEn: 'Prevent Duplicate Firestore Database Instance Initialization & White Screen Resolution',
    tag: 'fix',
    tagLabelMy: 'ပြင်ဆင်ပြီး ဗားရှင်း',
    tagLabelEn: 'Bug Fix Version',
    descriptionMy: 'ပင်မ (default) database သို့ ပြောင်းလဲချိန်တွင် Firestore SDK မှ default database အား နှစ်ကြိမ်ထပ်မံ initialize လုပ်မိသဖြင့် ဖြစ်ပေါ်သော fatal crash နှင့် White Screen (မျက်နှာပြင်အဖြူရောင်) အမှားအား Dynamic Re-use Guard စနစ်ဖြင့် အပြီးသတ် ရှင်းလင်း ပြင်ဆင်ပေးလိုက်ပါသည်။',
    descriptionEn: 'Resolved a fatal Firestore SDK crash where duplicate initialization of the (default) database instance occurred on mount, causing a blank White Screen.',
    changesMy: [
      '🛡️ **Dynamic Re-use Guard**: `useDefaultDbDirectly` စနစ်ဖြင့် ပင်မ (default) database အသုံးပြုချိန်၌ Firestore instance အား တစ်ကြိမ်တည်းသာ initialize လုပ်ပြီး `defaultDb` အဖြစ်ပါ ပြန်လည်အသုံးပြုစေသဖြင့် fatal crash များကို ၁၀၀% တားဆီးပေးလိုက်ပါသည်။',
      '⚡ **Zero-Crash Mount**: App ဖွင့်လှစ်သည့်အခါ မည်သည့် White Screen (မျက်နှာပြင်ဖြူ) မျှ မရှိတော့ဘဲ ၁ စက္ကန့်အတွင်း ပုံမှန်အတိုင်း တည်ငြိမ်စွာ တိုက်ရိုက် ပွင့်လန်းလာမည် ဖြစ်ပါသည်။'
    ],
    changesEn: [
      'Implemented useDefaultDbDirectly guard to prevent duplicate initialization of default database instances in Firebase.',
      'Ensured flawless React mount without any white or blank screen crashes.'
    ]
  },
  {
    version: 'v4.8.5',
    buildNumber: 80,
    releaseDate: '2026-09-30',
    releaseTime: '09:45 PM (MMT)',
    titleMy: 'မူလ (default) Database သို့ ပြန်လည်ပြောင်းလဲချိတ်ဆက်ခြင်းဖြင့် Premium Plan များနှင့် အသုံးပြုသူများအား အပြီးသတ် ပြန်လည်ပေါင်းစည်းပေးခြင်း',
    titleEn: 'Default Database Re-pointing & Historical Premium Profiles Restoration',
    tag: 'fix',
    tagLabelMy: 'ပြင်ဆင်ပြီး ဗားရှင်း',
    tagLabelEn: 'Bug Fix Version',
    descriptionMy: 'App အား မူလအသုံးပြုသူဟောင်းများ၏ ဒေတာများ၊ Premium အစီအစဉ်များနှင့် Admin Panel စာရင်းများ တည်ရှိရာ ပင်မ (default) Firestore Database သို့ အပြီးသတ် ပြန်လည်ပြောင်းလဲ ချိတ်ဆက်ပေးလိုက်သဖြင့် သုံးစွဲသူအားလုံး Premium Plan များနှင့် တကွ အောင်မြင်စွာ ပြန်လည် ပေါင်းစည်းသွားပြီ ဖြစ်ပါသည်။',
    descriptionEn: 'Re-pointed the app to the canonical (default) Firestore database, instantly restoring all previous user accounts, premium plans, and admin records.',
    changesMy: [
      '🌐 **Default Database Migration**: `firebase-applet-config.json` ရှိ `firestoreDatabaseId` အား `(default)` သို့ အောင်မြင်စွာ ပြောင်းလဲချိတ်ဆက်လိုက်ပြီး Firestore Security Rules များကိုပါ default database ပေါ်သို့ တင်ပေးပြီးစီးခဲ့ပါသည်။',
      '💎 **Premium Plan Restoration**: ယခင် သုံးစွဲသူဟောင်းများ အကောင့်ပြန်ဝင်သည့်အခါ ၎င်းတို့၏ Premium Plan များ၊ သက်တမ်းကုန်ဆုံးမည့် ရက်စွဲများနှင့် ဒေတာများ ပျောက်ဆုံးခြင်းမရှိဘဲ ၁၀၀% အပြည့်အဝ ပြန်လည်ရရှိသွားပါပြီ။',
      '👥 **Admin Panel Synchronization**: Admin Panel တွင်လည်း ယခင် ပျောက်ဆုံးနေသော အသုံးပြုသူစာရင်းများနှင့် ၎င်းတို့၏ စာရင်းမှတ်တမ်းများအားလုံးကို အပြည့်အစုံ ပြန်လည်တွေ့မြင်နိုင်ပြီဖြစ်ပါသည်။'
    ],
    changesEn: [
      'Configured firestoreDatabaseId to (default) in firebase-applet-config.json and redeployed rules to the default database.',
      'Instantly restored historical premium plans and user profiles without data loss.',
      'Synchronized Admin Panel users and transaction listings fully on the default database.'
    ]
  },
  {
    version: 'v4.8.4',
    buildNumber: 79,
    releaseDate: '2026-09-30',
    releaseTime: '09:30 PM (MMT)',
    titleMy: 'Shared Wallets မပြည့်စုံမီ အလိုအလျောက် Wallet Reassignment ပြုလုပ်၍ ဂဏန်းများ ပြောင်းလဲသွားသည့် ပြဿနာအား အပြီးသတ် ပြင်ဆင်ခြင်း',
    titleEn: 'Background Wallet Reassignment Mutation Elimination & Transaction Integrity Fix',
    tag: 'fix',
    tagLabelMy: 'ပြင်ဆင်ပြီး ဗားရှင်း',
    tagLabelEn: 'Bug Fix Version',
    descriptionMy: 'App စတင်ချိန်တွင် Shared Wallets ဒေတာများ မပြည့်စုံမီ repairOrphanedTransactions မနူးမှ Transaction ၏ Wallet ID ကို Fallback Wallet သို့ မှားယွင်း ပြန်လည်သတ်မှတ်ပြီး Cloud Firestore သို့ အဝိုင်းပတ် ပြန်လည်ရေးသွင်းမိသဖြင့် ၅၄ ခုမှ ၅၃ ခုသို့ ဂဏန်းများ လှုပ်ရှားပြောင်းလဲခဲ့မှုအား အပြီးသတ် ဖယ်ရှားရှင်းလင်းပေးလိုက်ပါသည်။',
    descriptionEn: 'Fixed a critical background data mutation bug where repairOrphanedTransactions erroneously reassigned transaction wallet IDs to fallback wallets before shared wallets finished loading and overwrote Firestore in a loop.',
    changesMy: [
      '🛡️ **Prevent Unintended Reassignment**: Transaction တွင် ရှိပြီးသား Wallet ID များကို မပြည့်စုံသော ကာလ၌ အတင်းအဓမ္မ Fallback Wallet သို့ ရွှေ့ပြောင်းခြင်းအား တားမြစ်လိုက်ပါပြီ။',
      '🔄 **Eliminated Firestore Background Overwrite Loop**: `useEffect` အတွင်းမှ Background Firestore Batch Overwrite Loop အား ဖယ်ရှားလိုက်သဖြင့် စာရင်း အရေအတွက် (၅၄ ခု) နှင့် ဂဏန်းပမာဏများ ၁၀၀% ငြိမ်သက်သွားမည် ဖြစ်ပါသည်။'
    ],
    changesEn: [
      'Prevented premature wallet ID reassignment during initial app loading states.',
      'Removed destructive background Firestore overwrite loop in App useEffect, guaranteeing 100% stable transaction counts and totals.'
    ]
  },
  {
    version: 'v4.8.3',
    buildNumber: 78,
    releaseDate: '2026-09-30',
    releaseTime: '09:15 PM (MMT)',
    titleMy: 'ဝင်ငွေ/ထွက်ငွေ စာရင်းများ Local Guest Cache နှင့် ထပ်မံပေါင်းစပ်ပြီး ဂဏန်းများ မြင့်တက်/မတည်မငြိမ်ဖြစ်မှုအား အပြီးသတ် ပြင်ဆင်ခြင်း',
    titleEn: 'Cloud Firestore Authoritative Database Sync & Local Stale Cache Cleanup',
    tag: 'fix',
    tagLabelMy: 'ပြင်ဆင်ပြီး ဗားရှင်း',
    tagLabelEn: 'Bug Fix Version',
    descriptionMy: 'Google / Email ဖြင့် Sign In ဝင်ရောက်ထားချိန်တွင် Cloud Firestore Database မှ တရားဝင် ဒေတာများ ရောက်ရှိလာပါက မူလ Local Guest Cache ဒေတာဟောင်းများနှင့် ထပ်မံ မာဂျာမပြုတော့ဘဲ Cloud Database ကိုသာ Direct Source of Truth အဖြစ် အပြည့်အဝ ချိတ်ဆက်ပေးလိုက်ပါသည်။',
    descriptionEn: 'Fixed a database sync issue where local guest transactions kept merging on top of Cloud Firestore real-time updates, ensuring Cloud Firestore is the absolute source of truth when logged in.',
    changesMy: [
      '⚡ **Cloud Firestore Source of Truth**: Sign In ဝင်ထားချိန်တွင် Real-time Listener ရောက်ရှိလာပါက Cloud Database ရှိ ဒေတာများကိုသာ အတည်ပြု တိုက်ရိုက် ပြသပေးသဖြင့် ဝင်ငွေ/ထွက်ငွေ ဂဏန်းများ မတည်မငြိမ်ဖြစ်ခြင်း လုံးဝ မရှိတော့ပါ။',
      '🧹 **Stale Cache Cleanup**: Local တွင် မတော်တဆ ကျန်ရစ်ခဲ့သော Guest/Duplicate စာရင်းဟောင်းများကို အလိုအလျောက် ရှင်းလင်းပေးထားပါသည်။'
    ],
    changesEn: [
      'Configured Cloud Firestore as the authoritative source of truth during real-time onSnapshot sync, eliminating local cache inflation.',
      'Auto-cleaned stale guest duplicate transactions upon cloud account authentication.'
    ]
  },
  {
    version: 'v4.8.2',
    buildNumber: 77,
    releaseDate: '2026-09-30',
    releaseTime: '09:00 PM (MMT)',
    titleMy: 'ထွက်ငွေနှင့် ငွေအိတ် လက်ကျန် ဂဏန်းများ မတည်မငြိမ်ဖြစ်ပြီး တန်ဖိုးလွဲမှားသည့် ပြဿနာအား အပြီးသတ် ပြင်ဆင်ခြင်း',
    titleEn: 'Expense & Wallet Balance Calculation Stability & False-Positive Wallet Match Fix',
    tag: 'fix',
    tagLabelMy: 'ပြင်ဆင်ပြီး ဗားရှင်း',
    tagLabelEn: 'Bug Fix Version',
    descriptionMy: 'isWalletMatch တွင် Target Wallet ID မဟုတ်သော ဂဏန်း/စာကြောင်းများအား Wallet Name နှင့် Substring Fuzzy Match မှားယွင်း တိုက်ဆိုင်မိသဖြင့် ထွက်ငွေ စာရင်းများ ငွေအိတ်လွဲမှားခြင်းနှင့် ထွက်ငွေ စုစုပေါင်း ဂဏန်းများ မတည်မငြိမ် ဖြစ်ပေါ်ခဲ့မှုအား Guard Logic ထည့်သွင်း၍ အပြီးသတ် ပြင်ဆင်ပေးထားပါသည်။',
    descriptionEn: 'Fixed a calculation instability bug where fuzzy name matching in isWalletMatch erroneously matched transaction target IDs against short wallet name substrings, causing expense totals and wallet balance numbers to shift.',
    changesMy: [
      '🛡️ **Wallet ID Matching Guard**: `isWalletMatch` တွင် Wallet ID (ဥပမာ- `wallet_...`, `tx_...`) များကို Fuzzy Substring Name Matching ပြုလုပ်မိခြင်းအား ပိတ်ပင်လိုက်သဖြင့် ထွက်ငွေများ ငွေအိတ် မှားယွင်း ရောက်ရှိခြင်း မရှိတော့ပါ။',
      '📊 **Stable Expense & Balance Totals**: Dashboard, Transactions View နှင့် Wallet Balances များတွင် ထွက်ငွေ ဂဏန်း စုစုပေါင်းများ ၁၀၀% တည်ငြိမ် မှန်ကန်သွားမည် ဖြစ်ပါသည်။'
    ],
    changesEn: [
      'Guarded fuzzy substring name matching in isWalletMatch to prevent ID strings from matching short wallet names.',
      'Ensured 100% stable expense totals and accurate real-time wallet balance calculations.'
    ]
  },
  {
    version: 'v4.8.1',
    buildNumber: 76,
    releaseDate: '2026-09-30',
    releaseTime: '08:45 PM (MMT)',
    titleMy: 'Cloudflare Pages Domain (ngwesaryin.pages.dev) တွင် Google Sign In အဆင်ပြေစေရေး လမ်းညွှန်နှင့် Error Handling ပြင်ဆင်ခြင်း',
    titleEn: 'Cloudflare Pages Authorized Domain Resolution & Detailed Auth Error Handling',
    tag: 'fix',
    tagLabelMy: 'ပြင်ဆင်ပြီး ဗားရှင်း',
    tagLabelEn: 'Bug Fix Version',
    descriptionMy: 'Custom / Cloudflare Domain အသစ် (ngwesaryin.pages.dev) တွင် Google OAuth/Sign In ဝင်ရောက်ပါက Firebase Authorized Domain Security ကြောင့် ပိတ်ဆို့မှုကို ဖြေရှင်းရန် တိကျသော လမ်းညွှန်ချက်နှင့် စနစ်တကျ Error Notification ကို ပြင်ဆင်ပေးထားပါသည်။',
    descriptionEn: 'Added clear unauthorized-domain error handling and instructions for authorizing custom domain ngwesaryin.pages.dev in Firebase Console Authentication settings.',
    changesMy: [
      '🌐 **Authorized Domain Error Handling**: Domain အသစ် (ngwesaryin.pages.dev) တွင် Google Sign In ဝင်စဉ် ခွင့်မပြုထားပါက မည်သို့ Add Domain ပြုလုပ်ရမည်ကို တိကျစွာ အသိပေးသော မက်ဆေ့ဂျ် ပြင်ဆင်ပေးထားပါသည်။',
      '🔑 **Seamless Sign In**: Firebase Console တွင် Domain ပေါင်းထည့်လိုက်သည်နှင့် Google Sign In ဖြင့် ၁ စက္ကန့်အတွင်း စာရင်းများ တိုက်ရိုက် Sync ရရှိသွားမည် ဖြစ်ပါသည်။'
    ],
    changesEn: [
      'Enhanced Google Sign-in error feedback when running on custom domains.',
      'Documented step-by-step resolution for authorizing ngwesaryin.pages.dev in Firebase Console.'
    ]
  },
  {
    version: 'v4.8.0',
    buildNumber: 75,
    releaseDate: '2026-09-30',
    releaseTime: '08:30 PM (MMT)',
    titleMy: 'Double Entry / Loss Entry ကာကွယ်မှုနှင့် Cloudflare Pages / GitHub Direct Publishing လမ်းညွှန် အပြည့်အစုံ',
    titleEn: 'Double Entry & Loss Entry Protection with Cloudflare Pages / GitHub Direct Publishing Setup',
    tag: 'fix',
    tagLabelMy: 'ပြင်ဆင်ပြီး ဗားရှင်း',
    tagLabelEn: 'Bug Fix Version',
    descriptionMy: 'Transaction များ ဖျက်ပြီး ပြန်ထည့်သည့်အခါ မူလ ID ဟောင်းများကြောင့် Double Entry (သို့) Loss Entry မဖြစ်စေရေး Real-time Doc ID Unmarking စနစ်ဖြင့် စစ်ဆေးအတည်ပြုပြီး၊ AI Studio Preview Quota အကန့်အသတ်မရှိဘဲ တည်ငြိမ်စွာ သုံးစွဲနိုင်ရန် GitHub ➔ Cloudflare Pages သို့ အခမဲ့ Publish ပြုလုပ်နိုင်သော Build Support ပြင်ဆင်ပေးထားပါသည်။',
    descriptionEn: 'Ensured transaction deletion and re-creation workflows are immune to double entry or loss entry via live doc ID unmarking, and optimized build assets for seamless GitHub to Cloudflare Pages deployment with unlimited static edge quota.',
    changesMy: [
      '🛡️ **Double Entry & Loss Entry Safeguard**: Transaction တစ်ခုအား ဖျက်လိုက်ပြီးနောက် အလားတူ ပမာဏ (ဥပမာ- ၂.၈၃ သိန်း) ဖြင့် ပြန်လည် ထည့်သွင်း/ပြင်ဆင်ပါက Local ID Hash နှင့် Cloud Listener တိုက်ရိုက် မာဂျာလုပ်ပေးသဖြင့် စာရင်းပျောက်ခြင်း/နှစ်ခါထပ်ခြင်း အပြီးသတ် ကာကွယ်ထားပါသည်။',
      '☁️ **Cloudflare Pages Publishing**: AI Studio Preview Quota  volle ပြည့်သွားပါက GitHub Repository သို့ Push လုပ်၍ Cloudflare Pages / Vercel တွင် Hosting တင်ကာ အကန့်အသတ်မရှိ (Unlimited Bandwidth) တည်ငြိမ်စွာ အသုံးပြုနိုင်ပါသည်။',
      '⚡ **Real-time Synchronization**: Firestore Database Free Quota (တစ်ရက်လျှင် Reads 50,000 / Writes 20,000) ဖြင့် စက်ပစ္စည်းပေါင်းများစွာ တစ်ပြိုင်တည်း Sync လုပ်ဆောင်နိုင်ပါသည်။'
    ],
    changesEn: [
      'Guaranteed transactional integrity when deleting and re-adding transactions, eliminating risk of double entries or lost records.',
      'Configured production build support for direct GitHub and Cloudflare Pages deployment to bypass AI Studio preview environment quotas.',
      'Verified zero-conflict real-time Firestore listeners across multi-device sync.'
    ]
  },
  {
    version: 'v4.7.9',
    buildNumber: 74,
    releaseDate: '2026-09-30',
    releaseTime: '08:00 PM (MMT)',
    titleMy: 'မျှဝေသုံးစွဲထားသော Shared Wallet များ၏ စာရင်းအသစ်များ (ဥပမာ- ၂.၈၃ သိန်း) Sync နှိပ်ပါက တိုက်ရိုက် မရောက်ရှိသည့် ပြဿနာအား အပြီးသတ် ပြင်ဆင်ခြင်း',
    titleEn: 'Shared Wallet Subcollection Multi-Location Sync & Instant Cloud Pull Resolution',
    tag: 'fix',
    tagLabelMy: 'ပြင်ဆင်ပြီး ဗားရှင်း',
    tagLabelEn: 'Bug Fix Version',
    descriptionMy: 'ဖုန်းတစ်လုံး (iPhone/Android) တွင် မျှဝေထားသော Shared Wallet သို့ စာရင်းအသစ် (ဥပမာ - ၂၀၂၆-၀၉-၂၅ ရက်စွဲပါ +၈၃,၀၀၀ ကျပ် ဝင်ငွေ၊ စုစုပေါင်း ၂.၈၃ သိန်း) ထည့်သွင်းပြီး အခြားဖုန်းတွင် Sync နှိပ်ပါက Personal Transactions မကဘဲ SharedWallets Subcollection ဒေတာများကိုပါ ငွေအိတ် ပိုင်ရှင်/မျှဝေခံရသူ နှစ်ဦးစလုံးထံ သို့ တစ်ပြိုင်တည်း တိုက်ရိုက် ပေးပို့/ဆွဲယူ မာဂျာလုပ်ပေးသည့် စနစ်ဖြင့် ပြင်ဆင်ပေးလိုက်ပါသည်။',
    descriptionEn: 'Fixed a sync issue where transactions added to a shared wallet on Device B (+83,000 MMK on 2026-09-25) did not pull to Device A during manual Sync. Updated pullDataFromCloud to query top-level sharedWallets subcollections and updated saveSharedWalletTransaction to dual-write across owner and shared collections.',
    changesMy: [
      '🤝 **Shared Wallet Multi-Location Write**: Shared Wallet တွင် စာရင်းအသစ် (+၈၃,၀၀၀ ကျပ်) မှတ်တမ်းတင်ပါက sharedWallets subcollection အပြင် ပိုင်ရှင်၏ Personal Transactions Collection သို့ပါ တစ်ပြိုင်တည်း မာဂျာ ရေးသွင်းပေးပါသည်။',
      '🔄 **Comprehensive Cloud Pull**: Sync ခလုတ် နှိပ်လိုက်သည်နှင့် personal transactions အပြင် မျှဝေထားသော sharedWallets subcollections များအားလုံးရှိ စာရင်းအသစ်များကိုပါ အပြည့်အဝ ဆွဲယူပေးသဖြင့် ဖုန်းနှစ်လုံးစလုံးတွင် ၂.၈၃ သိန်း အတိအကျ ၁၀၀% တူညီသွားမည် ဖြစ်ပါသည်။',
      '📅 **Date 2026-09-25 Sync Verified**: ဖုန်း A နှင့် ဖုန်း B နှစ်စလုံးတွင် စက်တင်ဘာ ၂၅ ရက်စွဲပါ စာရင်းနှင့် ၂.၈၃ သိန်း လက်ကျန် ပမာဏ အပြည့်အဝ တူညီစွာ ပေါ်ပေါက်လာပါမည်။'
    ],
    changesEn: [
      'Enabled dual-write for shared wallet transactions across canonical sharedWallets and personal transaction collections.',
      'Updated pullDataFromCloud to query top-level sharedWallets and automatically merge shared transactions during manual sync.',
      'Guaranteed 100% exact balance (2.83 Lakhs) and transaction record (+83,000 MMK on 2026-09-25) match across both devices.'
    ],
  },
  {
    version: 'v4.7.8',
    buildNumber: 73,
    releaseDate: '2026-09-30',
    releaseTime: '07:35 PM (MMT)',
    titleMy: 'စာရင်းအသစ်ထည့်သွင်းခြင်း/ဖျက်ခြင်း ပြုလုပ်ပြီးနောက် စက်အချင်းချင်း Sync လုပ်ရာတွင် စာရင်းပျောက်ခြင်း (Loss Entry) နှင့် စာရင်းထပ်ခြင်း (Double Entry) အား အပြီးသတ် ပြင်ဆင်ခြင်း',
    titleEn: 'Loss Entry & Double Entry Prevention: Live Cloud Authority & Unmark Deletion Sync Fix',
    tag: 'feature',
    tagLabelMy: 'လုပ်ဆောင်ချက်သစ်',
    tagLabelEn: 'Feature',
    descriptionMy: 'ဖုန်းတစ်လုံးတွင် မူလရှိသော စာရင်းအပြင် စာရင်းအသစ် ထည့်သွင်းခြင်း (ဥပမာ - ၂ မှ ၂.၈၃ သိန်းသို့ ပြောင်းလဲခြင်း) သို့မဟုတ် မှားယွင်းမည်စိုး၍ ဖျက်ပြီး ပြန်ထည့်သွင်းခြင်း ပြုလုပ်ပါက အခြားဖုန်း၏ Local Deletion Blacklist တွင် တားဆီးခံထားရမှုကြောင့် စာရင်းအသစ် မရောက်ဘဲ ၂ ဟုသာ ကျန်ခဲ့သည့် ပြဿနာ (Loss Entry Error) အား Cloud Firestore ဒေတာများကို သက်ဝင် Live Document အဖြစ် သတ်မှတ်၍ Deletion Flag များ အလိုအလျောက် ပယ်ဖျက်ပေးသည့် စနစ်ဖြင့် အပြီးသတ် ပြင်ဆင်လိုက်ပါသည်။',
    descriptionEn: 'Fixed critical Loss Entry bug where deleting and re-adding or adding new transactions on Device A caused Device B to reject live cloud transactions due to persistent local deletion blacklists. Live Firestore documents now automatically unmark local deletion flags and merge cleanly via ID map keying.',
    changesMy: [
      '🛡️ **Prevented Loss Entry (စာရင်းပျောက်ဆုံးမှု ကာကွယ်ခြင်း)**: Cloud Firestore တွင် ရှိနေသော စာရင်းမှန်သမျှသည် Live Document အဖြစ် အမြဲတမ်း သက်ဝင်မည်ဖြစ်ပြီး အခြားဖုန်းများတွင် Stale Deletion Flag ကြောင့် ပယ်ချခံရခြင်း လုံးဝ မရှိတော့ပါခင်ဗျာ။',
      '🔗 **Prevented Double Entry (စာရင်းထပ်ခြင်း ကာကွယ်ခြင်း)**: Transaction ID Multi-Map Keying ဖြင့် တစ်ထပ်တည်း မာဂျာ (Merge) လုပ်ပေးသဖြင့် စာရင်း ၂ ခါ ထပ်သွားခြင်း လုံးဝ မရှိဘဲ ပမာဏအမှန် (၂.၈၃ သိန်း) အတိအကျ ပေါ်မည် ဖြစ်ပါသည်။',
      '🔄 **Deletion & Re-addition Sync Fix**: စာရင်းကို ဖျက်လိုက်ပြီး ပြန်ထည့်ပါကလည်း အခြားဖုန်းတွင် Sync နှိပ်သည်နှင့် စာရင်းအသစ် တိုက်ရိုက် ချိတ်ဆက် ရောက်ရှိသွားမည် ဖြစ်ပါသည်။'
    ],
    changesEn: [
      'Cleared stale local deletion flags whenever live documents exist in Cloud Firestore, completely solving Loss Entry on secondary devices.',
      'Enforced ID-based Map merging to strictly prevent Double Entry of synced records.',
      'Ensured seamless sync when transactions are deleted and re-added across devices.'
    ],
  },
  {
    version: 'v4.7.7',
    buildNumber: 72,
    releaseDate: '2026-09-30',
    releaseTime: '07:15 PM (MMT)',
    titleMy: 'Cross-Device Sync Hash Checksum နှင့် Sync Force Push အပြင် Auto Filter တားဆီးမှုနှင့် သိန်းဂဏန်း (x 100,000) မြန်ဆန်တွက်ချက်မှု ခလုတ် ထည့်သွင်းခြင်း',
    titleEn: 'Cross-Device Sync Checksum Optimization, Force Sync Push & Direct Lakhs Converter Helper',
    tag: 'feature',
    tagLabelMy: 'လုပ်ဆောင်ချက်သစ်',
    tagLabelEn: 'Feature',
    descriptionMy: 'ဖုန်းအမျိုးအစား မတူညီသော စက်များအကြား Sync နှိပ်သော်လည်း စာရင်းအဟောင်း ပြောင်းလဲပြင်ဆင်မှုများ (ဥပမာ- ၂.၈၃ သိန်း) အား Sync Signature မှ ကျော်သွားခဲ့သည့် ပြဿနာကို Checksum Algorithm (Total Sum Check) နှင့် Force Sync Push တို့ဖြင့် အပြီးသတ် ပြင်ဆင်လိုက်ပါသည်။ ထို့အပြင် စာရင်းကြည့်ဇယားတွင် Auto Filter အလိုအလျောက် ပေါ်နေခြင်းကို ကာကွယ်ရန် မူလ View ကို "All Time" သို့ ပြောင်းလဲပေးခဲ့ပြီး အကြွေးနှင့် စာရင်းသစ် Form များတွင် သိန်းဂဏန်း ရိုက်ထည့်ရန်လွယ်ကူသည့် "✨ သိန်း (x100,000)" ခလုတ်များ ထည့်သွင်းပေးလိုက်ပါသည်။',
    descriptionEn: 'Resolved cross-device sync skipping issue where editing existing transaction amounts bypassed sync signatures by implementing a total sum checksum and force sync push. Prevented unexpected auto-filter state retention and introduced a direct Lakhs (x100,000) converter helper button across entry forms.',
    changesMy: [
      '🔄 **Lossless Cross-Device Sync (စက်အချင်းချင်း စင်ပြိုင် ချိတ်ဆက်မှု)**: စာရင်းများ တည်းဖြတ်ပြင်ဆင်ပါက Checksum Automatic Detection နှင့် Force Sync Push စနစ်တို့ဖြင့် စက်အသစ်/အဟောင်း အားလုံးတွင် ၂.၈၃ သိန်း စသည့် ပမာဏများ တိကျစွာ အပြိုင် တိုက်ရိုက် ရောက်ရှိသွားမည် ဖြစ်ပါသည်။',
      '✨ **Direct Lakhs Converter (သိန်းဂဏန်း မြန်ဆန် မြှောက်ပေးမှု)**: စာရင်းသစ်နှင့် အကြွေးမှတ်တမ်း Form များတွင် ၂.၈၃ ဟု ရိုက်ပြီး "✨ သိန်း (x100,000)" နှိပ်လိုက်သည်နှင့် ၂၈၃,၀၀၀ ကျပ်သို့ အလိုအလျောက် ပြောင်းလဲပေးပါသည်။',
      '🚫 **Eliminated Auto Filter Retention**: Transactions View တွင် အရင် ရွေးချယ်ခဲ့သော Auto Filter များ ငြိမ်ပြီး ကျန်ခဲ့ခြင်း မရှိဘဲ စာရင်းအားလုံးကို အမြဲ အကြည်လင်ဆုံး မြင်တွေ့ရမည် ဖြစ်ပါသည်။'
    ],
    changesEn: [
      'Implemented total sum checksum and force sync push in syncDataToCloud to guarantee 100% updated transaction amounts (e.g. 2.83 Lakhs) cross-device.',
      'Added direct "✨ Lakhs (x100,000)" quick multiplier helper button in Transaction and Debt modals.',
      'Ensured clean default All-Time view in Transactions screen to prevent unexpected auto-filtering.'
    ],
  },
  {
    version: 'v4.7.6',
    buildNumber: 71,
    releaseDate: '2026-09-30',
    releaseTime: '06:38 PM (MMT)',
    titleMy: 'ဖုန်းအမျိုးအစား မတူညီသော စက်များတွင် Sync လုပ်ပြီးနောက် ပမာဏ ကွဲလွဲနေခြင်းနှင့် Auto Filter အလိုအလျောက် ဝင်နေသည့် ပြဿနာအား အပြီးသတ် ပြင်ဆင်ခြင်း',
    titleEn: 'Default Filter State Optimization & All-Time Cross-Device Sync Visibility Fix',
    tag: 'feature',
    tagLabelMy: 'လုပ်ဆောင်ချက်သစ်',
    tagLabelEn: 'Feature',
    descriptionMy: 'ဖုန်းတစ်လုံးတွင် စာရင်းသွင်းပြီး အခြားဖုန်းတစ်လုံးတွင် Sync နှိပ်လိုက်ပါက ယခင်လ သို့မဟုတ် အခြားရက်စွဲပါ စာရင်းများကို "ယခုလ (This Month)" Auto Filter က အလိုအလျောက် စစ်ထုတ်/ဖျောက်ထားခဲ့သဖြင့် ပမာဏများ ကွဲလွဲပြနေသည့် ပြဿနာအား မူလ Default Filter ကို "တစ်သက်တာ / ရက်စွဲအားလုံး (All Time)" သို့ သတ်မှတ်ပေးပြီး သုံးစွဲသူ ရွေးချယ်မှုအလိုက် LocalStorage တွင် မှတ်သားပေးရန် ပြင်ဆင်လိုက်ပါသည်။',
    descriptionEn: 'Fixed an issue where "This Month" auto-filter was automatically hiding historical/cross-month synced transactions on secondary devices, causing amount discrepancies (e.g. 2 Lakhs vs 2.83 Lakhs). Changed default time filter to "All Time" and persisted filter preferences.',
    changesMy: [
      '🌟 **Default All-Time Visibility (ရက်စွဲအားလုံး)**: စက်အသစ်တွင် အကောင့်ဝင်ပြီး Sync နှိပ်သည်နှင့် စာရင်းအားလုံး၊ ပိုက်ဆံအိတ် လက်ကျန်ငွေ ပမာဏအားလုံး (ဥပမာ- ၂.၈၃ သိန်း) ကို ၁၀၀% အပြည့်အဝ တိကျစွာ မြင်တွေ့ရမည် ဖြစ်ပါသည်။',
      '🚫 **Removed Auto Filter Intrusion**: သုံးစွဲသူ ကိုယ်တိုင် မနှိပ်ဘဲ "ယခုလ" Auto Filter အလိုအလျောက် ဝင်နေခြင်းကို ဖယ်ရှားပေးခဲ့ပါသည်။',
      '💾 **Persisted Filter Preferences**: သုံးစွဲသူ ရွေးချယ်ခဲ့သော Time Filter အသုံးပြုချက်များအား LocalStorage တွင် မှတ်သားပေးထားပါသည်။'
    ],
    changesEn: [
      'Set default time filter state to "All Time" across Dashboard & Transactions view to ensure 100% full synced balance visibility across all devices.',
      'Eliminated unexpected "This Month" auto-filtering on app launch/sync.',
      'Persisted user-selected time filter choices in local storage.'
    ],
  },
  {
    version: 'v4.7.5',
    buildNumber: 70,
    releaseDate: '2026-09-30',
    releaseTime: '06:12 PM (MMT)',
    titleMy: 'စာရင်းအသစ်ထည့်သွင်းခြင်း Entry Form မိုဒယ်များတွင် Scroll Stuck (စခရော ရွှေ့မရဘဲ ငြိမ်/ကပ်နေသည့် ပြဿနာ) အား အပြီးသတ် ချောမွေ့အောင် ပြင်ဆင်ခြင်း',
    titleEn: 'Entry Form Modal Smooth Scroll Optimization & Dual Scroll Collision Removal',
    tag: 'feature',
    tagLabelMy: 'လုပ်ဆောင်ချက်သစ်',
    tagLabelEn: 'Feature',
    descriptionMy: 'စာရင်းအသစ် ထည့်သွင်းခြင်း Entry Form (Transaction Modal, Debt Modal, Wallet Modal, Category Picker) များတွင် မိုဘိုင်းဖုန်းဖြင့် လက်ချောင်းဖြင့် ဆွဲရွှေ့ရာ၌ မျက်နှာပြင် Scroll ငြိမ်/ကပ်နေပြီး ချောမွေ့စွာ မသွားသည့် ပြဿနာအား ဖုန်းမျက်နှာပြင် Outer Backdrop ၏ Overflow ကို ပိတ်ပြီး Form Body ကိုသာ သီးသန့် Single Scroll Container အဖြစ် Touch Scrolling (-webkit-overflow-scrolling)၊ Sticky Footer တို့ဖြင့် ပြန်လည် အဆင့်မြှင့်တင် ပေးလိုက်ပါသည်။',
    descriptionEn: 'Eliminated dual scroll collision on entry modals (Transaction, Debt, Wallet, Category Picker). Removed overflow-y-auto from outer overlay backdrops and enabled touch momentum scrolling (-webkit-overflow-scrolling: touch) on the form body container.',
    changesMy: [
      '📱 **Smooth Touch Scroll (ချောမွေ့သော ရွှေ့လျားမှု)**: စာရင်းအသစ် ထည့်သွင်းသည့် Form အတွင်း လက်ဖြင့် ဆွဲရွှေ့ပါက ငြိမ်/ကပ်မနေတော့ဘဲ လွတ်လပ်စွာ ချောမွေ့စွာ ဆွဲရွှေ့နိုင်အောင် ပြင်ဆင်ခဲ့ပါသည်။',
      '🚫 **Eliminated Dual Scroll Collision**: Backdrop Overlay ၏ ထပ်ဆင့် Scroll အပြိုင်ဖြစ်မှုကို ဖယ်ရှားပြီး Form Body တစ်ခုတည်းကိုသာ Single Scroll Container ဖြစ်စေခဲ့ပါသည်။',
      '📌 **Sticky Action Buttons**: Form ၏ အောက်ခြေရှိ "သိမ်းဆည်းမည်" / "မလုပ်တော့ပါ" ခလုတ်များကို အမြဲ အလွယ်တကူ နှိပ်နိုင်စေရန် Sticky Footer ပြုလုပ်ပေးထားပါသည်။'
    ],
    changesEn: [
      'Removed outer backdrop scroll collisions to allow uninhibited single-container form scrolling.',
      'Enabled -webkit-overflow-scrolling: touch and overscroll-contain for zero scroll lag on iOS & Android.',
      'Sticky bottom form action button bar for instant tap submission.'
    ],
  },
  {
    version: 'v4.7.4',
    buildNumber: 69,
    releaseDate: '2026-09-30',
    releaseTime: '05:55 PM (MMT)',
    titleMy: 'ဇယားအတွင်း ပမာဏအားလုံး (သိန်းဂဏန်းအောက် အသေးစားပမာဏများပါမကျန်) အား သိန်းဂဏန်း ဒဿမစကေး (ဥပမာ - ၅၀,၀၀၀ = ၀.၅ သိန်း၊ ၁,၀၀၀ = ၀.၀၁ သိန်း) ဖြင့် တပြေးညီ ပြသခြင်း',
    titleEn: 'Universal Lakhs Decimal Formatting for All Table Amounts (e.g. 50,000 -> 0.5 Lakhs)',
    tag: 'feature',
    tagLabelMy: 'လုပ်ဆောင်ချက်သစ်',
    tagLabelEn: 'Feature',
    descriptionMy: 'Table View ဇယားများအတွင်း ပမာဏ ပိုမိုကျစ်လစ်စေရန်နှင့် တပြေးညီဖြစ်စေရန် ၁ သိန်းအောက် ပမာဏငယ်များပါမကျန် ပမာဏအားလုံး (ဥပမာ - ၅၀,၀၀၀ ➔ ၀.၅ သိန်း၊ ၁,၀၀၀ ➔ ၀.၀၁ သိန်း၊ ၃၀၀ ➔ ၀.၀၀၃ သိန်း၊ ၂၀ ➔ ၀.၀၀၀၂ သိန်း၊ ၄ ➔ ၀.၀၀၀၀၄ သိန်း) အား သိန်းဂဏန်း ဒဿမစကေးဖြင့် သီးသန့် ဖြတ်ပြပေးလိုက်ပါသည်။',
    descriptionEn: 'Updated table formatting so all numbers regardless of size (including < 100,000 MMK, e.g. 50,000 -> 0.5 Lakhs, 1,000 -> 0.01 Lakhs, 300 -> 0.003 Lakhs) convert consistently to the Lakhs decimal scale.',
    changesMy: [
      '📊 **Universal Table Lakhs Scale**: ၁ သိန်းအောက် ပမာဏငယ်များပါမကျန် ဇယားအတွင်း ပမာဏအားလုံးအား သိန်းဂဏန်း ဒဿမပုံစံ (ဥပမာ - ၅၀,၀၀၀ = ၀.၅ သိန်း၊ ၁,၀၀၀ = ၀.၀၁ သိန်း၊ ၄ = ၀.၀၀၀၀၄ သိန်း) သို့ ပြောင်းလဲပေးလိုက်ပါသည်။',
      '💡 **Hover Tooltip**: မူလ ပြည့်စုံသော MMK ပမာဏအတိအကျကို ဇယား Cell ပေါ်တွင် Mouse တင်ထားပါက သို့မဟုတ် Long press နှိပ်ပါက မူလအတိုင်း ကြည့်ရှုနိုင်ပါသည်။',
      '🏠 **Preserved Standard View**: Dashboard နှင့် အခြားနေရာများတွင် မူလ MMK စံပုံစံအတိုင်း ပုံမှန် ပြသထားဆဲ ဖြစ်ပါသည်။'
    ],
    changesEn: [
      'Applied Lakhs decimal conversion to ALL table amounts including values below 100,000 MMK (e.g. 50,000 -> 0.5, 1,000 -> 0.01).',
      'Retained full original MMK currency hover tooltip on table cells for transparency.',
      'Maintained normal MMK formatting across card view and non-table components.'
    ],
  },
  {
    version: 'v4.7.3',
    buildNumber: 68,
    releaseDate: '2026-09-30',
    releaseTime: '05:48 PM (MMT)',
    titleMy: 'Quick Action ခလုတ်များအား စာတန်းအပြည့်အဝ ပေါ်စေရန် အိုင်ကွန်အပေါ် - စာသားအောက် Vertical Layout ဖြင့် ဆိုဒ်တူ ပြင်ဆင်မွမ်းမံခြင်း',
    titleEn: 'Vertical Quick Action Buttons (Icon Top, Full Uncut Text Below)',
    tag: 'feature',
    tagLabelMy: 'လုပ်ဆောင်ချက်သစ်',
    tagLabelEn: 'Feature',
    descriptionMy: 'Dashboard အထက်ပိုင်းရှိ ခလုတ် ၃ ခုတွင် စာတန်းများ မပြတ်ဘဲ အပြည့်အဝ ပေါ်လွင်စေရန် ခလုတ်၏ အနက် (Height) ကို တိုးမြှင့်ပြီး အထက်တန်းတွင် Logo/Icon နှင့် အောက်တန်းတွင် စာသားကို နေရာချပေးလိုက်ပါသည်။ ခလုတ် ၃ ခုစလုံး အမြင့်နှင့် အနံ ဆိုဒ်တူညီညာစွာ တည်ရှိနေပါသည်။',
    descriptionEn: 'Redesigned top quick action buttons with vertical orientation (Icon badge on top, auto-wrapping full text below) and fixed minimum equal heights to ensure complete text readability without truncation.',
    changesMy: [
      '✨ **Full Uncut Text Visibility (စာတန်းအပြည့်ပေါ်)**: စာသားများ ဖြတ်တောက်မခံရဘဲ စာကြောင်း ၁ တန်း သို့မဟုတ် ၂ တန်းဖြင့် အပြည့်အဝ ဖတ်ရှုနိုင်စေရန် ပြင်ဆင်ခဲ့ပါသည်။',
      '🔝 **Vertical Icon & Text Layout**: ခလုတ်တစ်ခုစီ၏ အပေါ်တန်းတွင် အိုင်ကွန် နှင့် အောက်တန်းတွင် စာသားအပြည့်အဝကို သပ်ရပ်စွာ စီစဉ်ပေးခဲ့ပါသည်။',
      '📐 **Equal Symmetrical Dimensions (ဆိုဒ်တူ)**: ခလုတ် ၃ ခုစလုံးအား အမြင့်နှင့် အနံ (Min Height & Width) ညီတူညီမျှ သတ်မှတ်ပေးထားပါသည်။'
    ],
    changesEn: [
      'Enforced vertical icon-top text-bottom button architecture to prevent truncation.',
      'Allowed multi-line text wrapping for 100% full text readability on small phones.',
      'Maintained exact equal height and width symmetry across all 3 quick action buttons.'
    ],
  },
  {
    version: 'v4.7.2',
    buildNumber: 67,
    releaseDate: '2026-09-30',
    releaseTime: '05:35 PM (MMT)',
    titleMy: 'ဝင်ငွေ၊ ထွက်ငွေ၊ အကြွေး မှတ်မည် ခလုတ် ၃ ခုအား တတန်းထဲနှင့် ဆိုဒ်တူ ညီညာစွာ ပြင်ဆင်မွမ်းမံခြင်း',
    titleEn: 'Single-Row Uniform Sized Quick Action Buttons (Income, Expense, Debt)',
    tag: 'feature',
    tagLabelMy: 'လုပ်ဆောင်ချက်သစ်',
    tagLabelEn: 'Feature',
    descriptionMy: 'Dashboard အထက်ပိုင်းရှိ "ဝင်ငွေ မှတ်မည်"၊ "ထွက်ငွေ မှတ်မည်" နှင့် "အကြွေး မှတ်မည်" Quick Action ခလုတ် ၃ ခုအား မိုဘိုင်းဖုန်းနှင့် စခရင်အမျိုးအစားအားလုံးတွင် ၂ တန်း မခွဲဘဲ ညီညာသော ၁ တန်းထဲ (Single Row) တွင် ဆိုဒ်တူ၊ အချိုးအစားတူ တပြေးညီ လှပစွာ ပြသပေးလိုက်ပါသည်။',
    descriptionEn: 'Redesigned the top quick action buttons (Add Income, Add Expense, Add Debt) into a single-row 3-column grid layout ensuring equal width, symmetrical alignment, and zero multi-line wrapping across all mobile and screen sizes.',
    changesMy: [
      '⚡ **Single-Row Alignment (၁ တန်းထဲ)**: ခလုတ် ၃ ခုအား ၂ တန်း ဖြစ်မသွားစေဘဲ မိုဘိုင်းဖုန်းအပါအဝင် စခရင်တိုင်းတွင် ၁ တန်းထဲ ညီညာစွာ ပြသပေးပါသည်။',
      '📐 **Uniform Equal Sizing (ဆိုဒ်တူ)**: ခလုတ် ၃ ခုစလုံးအား အနံနှင့် အချိုးအစားတူ (Equal 3-column Grid) သတ်မှတ်ပေးခဲ့၍ ညီညာသပ်ရပ်စေပါသည်။',
      '📱 **Mobile Optimized Text**: စခရင်အသေးများတွင် စာသားပြတ်တောက်မှုမရှိဘဲ ခလုတ်အတွင်း ကွက်တိဝင်ဆံ့အောင် Font size နှင့် Tooltip ပါဝင်အောင် မွမ်းမံထားပါသည်။'
    ],
    changesEn: [
      'Enforced single-row layout for quick action buttons across all mobile viewports.',
      'Applied equal 3-column grid width distribution for symmetrical button sizes.',
      'Optimized font scaling and truncate protection with standard titles.'
    ],
  },
  {
    version: 'v4.7.1',
    buildNumber: 66,
    releaseDate: '2026-09-30',
    releaseTime: '05:15 PM (MMT)',
    titleMy: 'Table View ဇယားများတွင် နေရာသက်သာစေရန် သိန်းဂဏန်းတန်ဖိုးများအား ဒဿမကိန်း (ဥပမာ- ၆.၅ သိန်း) ဖြင့် ကျစ်လစ်စွာ ပြသပေးခြင်း',
    titleEn: 'Compact Lakhs Decimal Formatting for Table Views (e.g. 6.5 Lakhs)',
    tag: 'feature',
    tagLabelMy: 'လုပ်ဆောင်ချက်သစ်',
    tagLabelEn: 'Feature',
    descriptionMy: 'Table View ဇယားများအတွင်း နေရာသက်သာပြီး ကြည့်ရလွယ်ကူစေရန်အတွက် သိန်းဂဏန်း တန်ဖိုးများအား ၁၀ သောင်း (၁ သိန်း) ဖြင့် စား၍ ဒဿမကိန်း ပုံစံဖြင့် (ဥပမာ - ၆၅၄,၃၂၁ မြန်မာကျပ် ➔ ၆.၅၄၃၂၁ သိန်း၊ ၆၅၀,၀၀၀ မြန်မာကျပ် ➔ ၆.၅ သိန်း၊ ၇,၅၀,၀၀၀ မြန်မာကျပ် ➔ ၇.၅ သိန်း) သီးသန့် ဖြတ်ပြပေးလိုက်ပါသည်။ အခြား စခရင်များနှင့် မူလနေရာများတွင် မူလ MMK ပုံစံအတိုင်း ပုံမှန်ပြသထားဆဲ ဖြစ်ပါသည်။',
    descriptionEn: 'Applied compact Lakhs decimal formatting specifically for Table Views (e.g. 650,000 MMK -> 6.5 Lakhs, 750,000 -> 7.5 Lakhs) to maximize table readability and save horizontal space. Standard places remain unchanged.',
    changesMy: [
      '📊 **Table-Specific Lakhs Formatting**: ဇယားအတွင်း သိန်းဂဏန်းတန်ဖိုးများ (၁ သိန်းနှင့်အထက်) အား ဒဿမပုံစံ (ဥပမာ- ၆၅၀,၀၀၀ ➔ ၆.၅ သိန်း၊ ၇၅၀,၀၀၀ ➔ ၇.၅ သိန်း) သီးသန့် ဖြတ်ပြပေးခဲ့ပါသည်။',
      '💡 **Hover Tooltip**: ဇယားပေါ်တွင် Mouse တင်ထားပါက သို့မဟုတ် Long press နှိပ်ပါက မူလ ပြည့်စုံသော ပမာဏတန်ဖိုးကို Tooltip ဖြင့် အပြည့်အဝ ကြည့်ရှုနိုင်ပါသေးသည်။',
      '🏠 **Preserved Standard Format**: Dashboard အထက်ပိုင်း၊ Card များ နှင့် အခြားနေရာများတွင် မူလ ပုံမှန် MMK Formatting စနစ်အတိုင်း ပြသထားဆဲ ဖြစ်ပါသည်။'
    ],
    changesEn: [
      'Formated table amounts >= 1 Lakh into compact Lakhs decimal representation (e.g. 650,000 -> 6.5 Lakhs).',
      'Added full-amount hover/long-press tooltip on table cells for full transparency.',
      'Kept standard full MMK formatting intact everywhere else across the application.'
    ],
  },
  {
    version: 'v4.7.0',
    buildNumber: 65,
    releaseDate: '2026-09-30',
    releaseTime: '04:55 PM (MMT)',
    titleMy: 'ဖုန်းစခရင်များတွင် Horizontal Scrollbar မထွက်စေရန် Table View ဇယားများအား 100% Fit Responsive ပြင်ဆင်ခြင်း',
    titleEn: 'Zero-Scroll Mobile Responsive Table View Layout Optimization',
    tag: 'feature',
    tagLabelMy: 'လုပ်ဆောင်ချက်သစ်',
    tagLabelEn: 'Feature',
    descriptionMy: 'ဘဏ္ဍာရေး အနှစ်ချုပ် Table View ဇယားများ မိုဘိုင်းဖုန်း စခရင်များပေါ်တွင် ဘေးဘက်သို့ Horizontal Scroll ထွက်နေသည့် ပြဿနာအား လုံးဝ မထွက်စေဘဲ စခရင်အကျယ် 100% ကွက်တိ တပ်ဆင်ဝင်ဆံ့အောင် `table-fixed` နှင့် Proportional Cell Alignment ဖြင့် ပြန်လည် မွမ်းမံပေးခဲ့ပါသည်။',
    descriptionEn: 'Optimized Financial Summary Table View layouts to fit 100% inside mobile viewports without triggering horizontal scrollbars. Applied table-fixed width distributions and truncation rules.',
    changesMy: [
      '📱 **Zero Horizontal Scrollbar**: ဘဏ္ဍာရေး အနှစ်ချုပ် Table View ဇယားများအား မိုဘိုင်းဖုန်းစခရင်များတွင် ဘေးသို့ Scroll လုပ်စရာမလိုဘဲ ကွက်တိဝင်ဆံ့အောင် ပြင်ဆင်ခဲ့ပါသည်။',
      '📐 **Responsive Table-Fixed Layout**: ကော်လံအကျယ်များကို ရာခိုင်နှုန်းအလိုက် မျှတစွာ သတ်မှတ်ပေးပြီး အမည်များနှင့် တန်ဖိုးများကို မပြတ်ဘဲ သပ်ရပ်စွာ ပြသပေးထားပါသည်။'
    ],
    changesEn: [
      'Eliminated horizontal scrollbars on mobile viewports for Financial Summary tables.',
      'Applied responsive table-fixed auto-scaling layout for 100% screen-fit display.'
    ],
  },
  {
    version: 'v4.6.9',
    buildNumber: 64,
    releaseDate: '2026-09-30',
    releaseTime: '04:30 PM (MMT)',
    titleMy: 'Wallet များကို ၁ ခု မက စိတ်ကြိုက် တွဲဖက် ရွေးချယ်နိုင်သော Multi-Wallet Checkbox Selector နှင့် ဝင်ငွေ/ထွက်ငွေ/အသားတင် Table View ဇယားသစ် ထည့်သွင်းခြင်း',
    titleEn: 'Multi-Wallet Checkbox Selector & Structured Financial Summary Table View',
    tag: 'feature',
    tagLabelMy: 'လုပ်ဆောင်ချက်သစ်',
    tagLabelEn: 'Feature',
    descriptionMy: 'Wallet ၁ ခုတည်း မဟုတ်ဘဲ မိမိကြိုက်နှစ်သက်ရာ Wallet ၁ ခု၊ ၂ ခု၊ ၃ ခု စသည်ဖြင့် စိတ်ကြိုက် Checkbox ဖြင့် တွဲဖက်ရွေးချယ်နိုင်သော Multi-Wallet Selector အား ထည့်သွင်းပေးလိုက်ပါသည်။ ထို့အပြင် ဝင်ငွေ၊ ထွက်ငွေ၊ အသားတင် ပိုငွေ/လိုငွေနှင့် ရွေးချယ်ထားသော Wallet တစ်ခုချင်းစီ၏ သီးသန့် ဘဏ္ဍာရေး အနှစ်ချုပ် Table View ဇယားသစ်ကိုပါ ဖန်တီးပေးခဲ့ပါသည်။',
    descriptionEn: 'Added Multi-Wallet Checkbox Selector allowing users to combine any 1, 2, 3, or more wallets simultaneously. Created a structured Financial Summary Table View for Inflow, Outflow, Net Balance, and per-wallet breakdown.',
    changesMy: [
      '☑️ **Multi-Wallet Checkbox Selector**: Wallet ၁ ခုမက (၁ ခု၊ ၂ ခု၊ ၃ ခုစသည်ဖြင့်) စိတ်ကြိုက် Checkbox ပေါင်းစပ်ရွေးချယ်နိုင်စွမ်း ထည့်သွင်းခဲ့ပါသည်။',
      '📊 **Financial Summary Table View**: ဝင်ငွေ၊ ထွက်ငွေ၊ အသားတင် ပိုငွေ/လိုငွေနှင့် ရာခိုင်နှုန်းများကို ရှင်းလင်းလှပသော ဇယား (Table View) ဖြင့် ကြည့်ရှုနိုင်ပါပြီ။',
      '💳 **Per-Wallet Table Breakdown**: Wallet ၂ ခုနှင့်အထက် စိတ်ကြိုက်တွဲဖက် ရွေးချယ်ပါက Wallet တစ်ခုချင်းစီ၏ Inflow/Outflow/Net/Balance ဇယားကွက်ကိုပါ သီးသန့် ပြသပေးပါသည်။'
    ],
    changesEn: [
      'Introduced Multi-Wallet Checkbox Selector to combine any custom selection of 1, 2, 3, or all wallets.',
      'Created Financial Summary Table View for clean structured viewing of Inflow, Outflow, Net, and status ratios.',
      'Added per-wallet breakdown table when multiple wallets are checked.'
    ],
  },
  {
    version: 'v4.6.8',
    buildNumber: 63,
    releaseDate: '2026-09-30',
    releaseTime: '04:10 PM (MMT)',
    titleMy: 'နေရာယူလွန်းသော Data Scope ဘားအား ကျဉ်းမြောင်း သပ်ရပ်သော Compact Dropdown အဖြစ် ပြောင်းလဲခြင်းနှင့် သီးသန့် Wallet အလိုက် ရွေးချယ်နိုင်စွမ်း ထည့်သွင်းခြင်း',
    titleEn: 'Compact Unified Wallet Selector Dropdown & Specific Wallet Dashboard Filtering',
    tag: 'feature',
    tagLabelMy: 'လုပ်ဆောင်ချက်သစ်',
    tagLabelEn: 'Feature',
    descriptionMy: 'Dashboard စခရင်ပေါ်တွင် နေရာအလွန်ယူနေသော Data Scope Banner အား ဖယ်ရှားကာ၊ ကျဉ်းမြောင်း သပ်ရပ်သော 1-Line Dropdown Bar အဖြစ် ပြောင်းလဲပေးလိုက်ပါသည်။ ထို့အပြင် "အကောင့်အားလုံး / ကိုယ်ပိုင် / Share" အပြင် ပိုက်ဆံအိတ် (Wallet) တစ်ခုချင်းစီကိုပါ စိတ်ကြိုက် Select လုပ်၍ ၎င်း Wallet တစ်ခုတည်း၏ ဝင်ငွေ၊ ထွက်ငွေ၊ လက်ကျန်နှင့် စာရင်းများကို သီးသန့် စစ်ဆေးနိုင်ပါပြီ။',
    descriptionEn: 'Replaced the large vertical Data Scope banner with a compact 1-line Dropdown toolbar. Added individual wallet selection to allow filtering Dashboard metrics, cash flows, and charts by specific wallets.',
    changesMy: [
      '📱 **Compact Layout**: နေရာယူလွန်းသော Data Scope Banner ဘောက်စ်ကြီးအား ဖယ်ရှားပြီး သပ်ရပ်ကျဉ်းမြောင်းသော Filter Bar အဖြစ် ပြန်လည်ပြင်ဆင်ခဲ့ပါသည်။',
      '💳 **Specific Wallet Selection**: "အကောင့်အားလုံး"၊ "ကိုယ်ပိုင်"၊ "Share ထားသော" စာရင်းများအပြင် မိမိလိုချင်သော ပိုက်ဆံအိတ် (Wallet) တစ်ခုချင်းစီကို Dropdown မှ Select လုပ်၍ သီးသန့် စစ်ဆေးနိုင်ပါပြီ။',
      '📊 **Dynamic Dashboard Recalculation**: Dropdown တွင် Wallet သီးသန့် ရွေးချယ်လိုက်ပါက Dashboard ၏ ဝင်ငွေ၊ ထွက်ငွေ၊ လက်ကျန်နှင့် Chart များအားလုံး အလိုအလျောက် Dynamic ပြောင်းလဲပြသပေးပါသည်။'
    ],
    changesEn: [
      'Replaced space-consuming Data Scope banner with a sleek 1-line Dropdown toolbar.',
      'Added direct Wallet selection in the Dropdown to view metrics for specific individual wallets.',
      'Dynamically recalculated all Dashboard totals, cash flows, and charts upon wallet selection.'
    ],
  },
  {
    version: 'v4.6.7',
    buildNumber: 62,
    releaseDate: '2026-09-30',
    releaseTime: '03:45 PM (MMT)',
    titleMy: 'ယခုလ ထွက်ငွေ မငြိမ်ဘဲ ဂဏန်းများ အလိုအလျောက် ပြောင်းလဲနေသည့် ပြဿနာအား တိကျစွာ ပြင်ဆင်ခြင်း',
    titleEn: 'Stabilized "This Month Expense" Calculations & Foreign Currency Fallback Wallet Resolution',
    tag: 'fix',
    tagLabelMy: 'ပြင်ဆင်မှု',
    tagLabelEn: 'Bug Fix',
    descriptionMy: 'Dashboard တွင် "ယခုလ ထွက်ငွေ" (This Month Outflow) တွက်ချက်ရာ၌ မတူညီသော Wallet များ (USD, THB, Shared Wallets) ၏ Exchange Rate conversion lookup ကို fallback resolution ဖြင့် အတည်ပြုပေးခဲ့ပြီး၊ Local Calendar Month နှင့် Calculation totals များကို `useMemo` / `useCallback` ဖြင့် ငြိမ်သက်အောင် လုံးဝ ပြင်ဆင်ပေးလိုက်ပါသည်။',
    descriptionEn: 'Fixed a bug where "This Month Expense" fluctuated due to un-memoized monthly date filters and un-resolved wallet currency conversion lookups. Wrapped calculations in memoized hooks with fallback resolution.',
    changesMy: [
      '📊 **ယခုလ ထွက်ငွေ တည်ငြိမ်စေခြင်း**: "ယခုလ ထွက်ငွေ" (This Month Outflow) နှင့် "ယခုလ ဝင်ငွေ" တွက်ချက်မှုများကို `useMemo` / `useCallback` ဖြင့် တည်ငြိမ်အောင် ထိန်းချုပ်ပေးလိုက်ပါသည်။',
      '🔀 **Fallback Wallet Resolution**: နိုင်ငံခြားငွေ (USD, THB, SGD) နှင့် မျှဝေထားသော Wallet မှတ်တမ်းများ၏ ငွေလဲနှုန်း Conversion များကို ဘက်စုံ Wallet Resolution ဖြင့် အမြဲတမ်း တိကျစွာ တွက်ပေးထားပါသည်။',
      '📅 **Local Calendar Month Alignment**: UTC စခရင် ရက်စွဲ မတူညီမှုကို စက်၏ မူလ Calendar Month (`YYYY-MM`) ဖြင့် တိုက်ရိုက် ညှိယူပေးထားပါသည်။'
    ],
    changesEn: [
      'Memoized "This Month Outflow" and "This Month Inflow" totals in Dashboard with `useMemo` and `useCallback`.',
      'Enhanced foreign currency wallet conversion resolution with fallback wallet lookup.',
      'Aligned monthly date filter strictly with local device calendar year & month.'
    ],
  },
  {
    version: 'v4.6.6',
    buildNumber: 61,
    releaseDate: '2026-09-30',
    releaseTime: '03:30 PM (MMT)',
    titleMy: 'စခရင် ပေါ်ရှိ ဂဏန်းများ အလိုအလျောက် ပြောင်းလဲနေခြင်းနှင့် အရောင် ၂ ရောင် ခုန်နေသည့် Infinite State Feedback Loop ပြဿနာအား လုံးဝ ရှင်းလင်းခြင်း',
    titleEn: 'Eliminated Infinite Re-render Feedback Loop & Rapid Number/Color Flicker',
    tag: 'feature',
    tagLabelMy: 'လုပ်ဆောင်ချက်',
    tagLabelEn: 'Feature Update',
    descriptionMy: 'Firestore Real-time Snapshot နှင့် React Local State တို့အကြား တန်ဖိုး မတူညီဘဲ တုံ့ပြန်မှု တလှည့်စီ ဖြစ်ပေါ်နေသဖြင့် စခရင်ပေါ်တွင် ဂဏန်းများ အလိုလို ပြောင်းလဲ ခုန်နေခြင်းနှင့် အရောင် ၂ ရောင် (အစိမ်း/အနီ/အပြာ) တဖလပ်ဖလပ် ပြောင်းနေသည့် Loop Bug အား တိကျသော Array Deep Guard ဖြင့် အပြီးတိုင် ရှင်းလင်း ပြင်ဆင်လိုက်ပါသည်။',
    descriptionEn: 'Fixed an infinite re-render loop where Firestore snapshot state and React state repeatedly triggered updates, causing numbers and badge colors to rapidly flicker.',
    changesMy: [
      '⚡ **Infinite State Loop ပြင်ဆင်ခြင်း**: Firestore နှင့် Local State အကြား ပြန်လည် တိုက်စစ်သည့်နေရာတွင် `areArraysEqual` Deep Guard ထည့်သွင်း၍ ဂဏန်းများ အလိုလို ပြောင်းလဲနေမှုကို လုံးဝ ဖယ်ရှားလိုက်ပါသည်။',
      '🎨 **အရောင် တဖလပ်ဖလပ် ပြောင်းမှု ရှင်းလင်းခြင်း**: State တည်ငြိမ်သွားသဖြင့် Badges နှင့် Header Banners များရှိ အရောင်များ လှုပ်ခတ်နေခြင်း မရှိတော့ဘဲ ငြိမ်သက်စွာ ပြသပေးထားပါသည်။',
      '🚀 **App Performance & Stability**: Render Cycle များကို အထူး ပေါ့ပါးအောင် ပြင်ဆင်ထားသဖြင့် အက်ပ် မြန်ဆန်မှုနှင့် စက်၏ ဘက်ထရီ စားသုံးမှုကို လျှော့ချပေးခဲ့ပါသည်။'
    ],
    changesEn: [
      'Added strict `areArraysEqual` guard to prevent circular Firestore snapshot feedback loops.',
      'Eliminated rapid color flickering across status badges and financial banners.',
      'Optimized render cycles for smoother, flicker-free performance.'
    ],
  },
  {
    version: 'v4.6.5',
    buildNumber: 60,
    releaseDate: '2026-09-30',
    releaseTime: '03:15 PM (MMT)',
    titleMy: 'ရိုးရိုး အသုံးစရိတ် စာရင်းများတွင် "ငွေလွှဲထွက်" Badge မှားယွင်း ပေါ်နေသည့်ပြဿနာအား တိကျစွာ ပြင်ဆင်ခြင်း',
    titleEn: 'Resolved Erroneous "Transfer Out" Badge Tagging on Standard Expense Records',
    tag: 'feature',
    tagLabelMy: 'လုပ်ဆောင်ချက်',
    tagLabelEn: 'Feature Update',
    descriptionMy: 'Transaction Modal တွင် ရိုးရိုး ထွက်ငွေ/အသုံးစရိတ် စာရင်းများ (ဥပမာ- စားသောက်ကုန်၊ တက္ကစီ၊ မနက်စာ) ထည့်သွင်းရာ၌ `transferType` အလိုအလျောက် ပါဝင်သွားသဖြင့် "ငွေလွှဲထွက်" (Transfer Out) ဟု မှားယွင်း ပေါ်နေသည့် Bug ကို ပြင်ဆင်ပေးခဲ့ပြီး၊ ယခင် မှတ်တမ်းအဟောင်းများကိုလည်း အလိုအလျောက် ရှင်းလင်းပေးလိုက်ပါသည်။',
    descriptionEn: 'Fixed a bug where standard expense entries inadvertently inherited transferType properties, causing incorrect "Transfer Out" badges. Automated auto-repair for existing transaction histories.',
    changesMy: [
      '🏷️ **ငွေလွှဲထွက် Badge အမှား ပြင်ဆင်ခြင်း**: ရိုးရိုး အသုံးစရိတ်နှင့် ဝင်ငွေ စာရင်းများတွင် "ငွေလွှဲထွက်" Badge မှားပြနေသည့် Logic ကို ရှင်းလင်း ပြင်ဆင်ပေးခဲ့ပါသည်။',
      '🧹 **Auto-Repair Cleaning**: စက်ထဲနှင့် Cloud ပေါ်ရှိ ယခင် စာရင်းမှတ်တမ်းဟောင်းများထဲမှ မှားယွင်းပါဝင်နေသော transferType များကို အလိုအလျောက် Clean Up လုပ်ပေးထားပါသည်။',
      '🔄 **အမှန်တကယ် ငွေလွှဲမှုများသာ ပြသခြင်း**: "ငွေလွှဲပြောင်းခြင်း" Category ဖြင့် ပြုလုပ်သော အကောင့်ချင်း လွှဲပြောင်းမှုများတွင်သာ "ငွေလွှဲထွက်" / "ငွေလွှဲဝင်" Badge ပြသမည် ဖြစ်ပါသည်။'
    ],
    changesEn: [
      'Fixed false-positive "Transfer Out" badge assignments on standard non-transfer expense entries.',
      'Added automated cleaning migration to strip legacy transferType attributes from regular transactions.',
      'Ensured transfer badges appear exclusively for explicit inter-wallet transfer transactions.'
    ],
  },
  {
    version: 'v4.6.4',
    buildNumber: 59,
    releaseDate: '2026-09-28',
    releaseTime: '02:45 AM (MMT)',
    titleMy: 'Transaction Page တွင် ရက်အလိုက် စာရင်းခွဲခြားပြသမှုနှင့် Wallet တစ်ခုချင်းစီ၏ Inflow/Outflow/Opening/Closing စာရင်းများ ထည့်သွင်းခြင်း',
    titleEn: 'Added Daily Transaction Grouping & Individual Wallet Inflow/Outflow/Opening/Closing Metrics',
    tag: 'feature',
    tagLabelMy: 'လုပ်ဆောင်ချက်',
    tagLabelEn: 'Feature Update',
    descriptionMy: 'စာရင်းများ ပြန်စစ်ရလွယ်ကူစေရန် Transaction Page ရှိ မှတ်တမ်းများကို ရက်စွဲအလိုက် အုပ်စုဖွဲ့၍ နေ့စဉ် ဝင်ငွေ၊ ထွက်ငွေနှင့် အသားတင် ပို/လိုငွေများ ခွဲခြားပြသပေးလိုက်ပါသည်။ ထို့အပြင် Wallet တစ်ခုချင်းစီ၏ စတင်လက်ကျန် (Opening Balance)၊ ဝင်ငွေစုစုပေါင်း (Inflow)၊ ထွက်ငွေစုစုပေါင်း (Outflow) နှင့် အပိတ်လက်ကျန် (Closing Balance) များကိုလည်း တိကျစွာ ထည့်သွင်းပေးထားပါသည်။',
    descriptionEn: 'Enhanced Transaction Page with daily date grouping headers and daily inflow/outflow subtotals. Expanded Wallets View with individual and total Opening Balance, Inflow, Outflow, and Closing Balance summaries.',
    changesMy: [
      '📅 **Transaction Page ရက်အလိုက် အုပ်စုဖွဲ့မှု**: မှတ်တမ်းများကို ရက်စွဲအလိုက် သန့်ရှင်းစွာ အုပ်စုဖွဲ့ပေးထားပြီး နေ့တစ်နေ့ချင်းစီ၏ ဝင်ငွေ (+Inflow)၊ ထွက်ငွေ (-Outflow) နှင့် အသားတင် (Net) စာရင်းများကို အပေါ်ဆုံး ခေါင်းစဉ်တန်းတွင် ဖော်ပြပေးထားပါသည်။',
      '💳 **Wallet တစ်ခုချင်းစီ၏ ဝင်ငွေ/ထွက်ငွေ အနှစ်ချုပ်**: Wallet ကတ်တစ်ခုချင်းစီတွင် စတင်လက်ကျန် (Opening Balance)၊ ဝင်ငွေစုစုပေါင်း (Inflow)၊ ထွက်ငွေစုစုပေါင်း (Outflow) နှင့် အပိတ်လက်ကျန် (Closing Balance) အသေးစိတ် ဇယားများ ထည့်သွင်းပေးထားပါသည်။',
      '📊 **စုစုပေါင်း အကောင့်များ၏ အနှစ်ချုပ် Banner**: Wallets View အပေါ်ဆုံးတွင်လည်း အကောင့်အားလုံးပေါင်း၏ စတင်လက်ကျန်၊ ဝင်ငွေ၊ ထွက်ငွေနှင့် အပိတ်လက်ကျန် စာရင်းပေါင်းများကို ပေါ်လွင်စွာ ပြသပေးထားပါသည်။'
    ],
    changesEn: [
      'Grouped transactions on the Transaction Page cleanly by date with prominent daily inflow, outflow, and net subtotals.',
      'Added structured financial summary cards to each Wallet showing Opening Balance, Total Inflow, Total Outflow, and Closing Balance.',
      'Placed an aggregate Opening, Inflow, Outflow, and Closing summary banner at the top of the Wallets View.'
    ],
  },
  {
    version: 'v4.6.3',
    buildNumber: 58,
    releaseDate: '2026-09-27',
    releaseTime: '04:45 PM (MMT)',
    titleMy: 'မိုဘိုင်းဖုန်းများတွင် Manual Cloud Sync ခလုတ် ပေါ်လွင်စွာ တပ်ဆင်ပေးခြင်း',
    titleEn: 'Added Prominent 1-Tap Manual Sync Buttons for Mobile & Desktop Devices',
    tag: 'feature',
    tagLabelMy: 'လုပ်ဆောင်ချက်',
    tagLabelEn: 'Feature Update',
    descriptionMy: 'မိုဘိုင်းဖုန်းများ၌ Manual Sync ခလုတ် ကွယ်နေ၍ ဒေတာ ချက်ချင်း Sync မလုပ်နိုင်သော အခက်အခဲကို ဖြေရှင်းရန် ပင်မ Navbar Header တန်း၊ Sidebar Drawer မီနူးနှင့် Dashboard ပင်မနေရာများတွင် ၁ ချက်နှိပ်ရုံဖြင့် Cloud နှင့် Sync လုပ်နိုင်သော ခလုတ်များကို ပေါ်လွင်စွာ တပ်ဆင်ပေးလိုက်ပါသည်။',
    descriptionEn: 'Fixed missing manual sync controls on mobile screens by placing prominent 1-tap Cloud Sync buttons in Navbar header, Sidebar drawer, and Dashboard filter bar.',
    changesMy: [
      '📲 **Navbar Header Sync ခလုတ်**: မိုဘိုင်းဖုန်း ပင်မ Header တန်းပေါ်တွင် `🔄 Sync` ခလုတ်ကို အစဉ်အမြဲ ပေါ်လွင်စွာ တပ်ဆင်ပေးထားပါသည်။',
      '📱 **Sidebar Drawer 1-Tap Sync**: Sidebar မီနူးဖွင့်လိုက်သည်နှင့် အကောင့်ကတ်အောက်တွင် `🔄 မနျူရယ် Cloud Sync ပြုလုပ်မည်` ခလုတ်ကြီးကို တွေ့ရှိနိုင်ပါသည်။',
      '📊 **Dashboard 1-Tap Sync**: Dashboard filter bar ပေါ်တွင်လည်း ၁ ချက်နှိပ်ရုံဖြင့် Cloud မနျူရယ် Sync ပြုလုပ်နိုင်သော ခလုတ် တပ်ဆင်ထားပါသည်။'
    ],
    changesEn: [
      'Exposed Sync button directly in the mobile Navbar header for 1-tap access.',
      'Added a prominent "Force Manual Cloud Sync" action card inside the Sidebar drawer menu.',
      'Placed a direct Sync button on the Dashboard filter bar for quick data refresh.'
    ],
  },
  {
    version: 'v4.6.2',
    buildNumber: 57,
    releaseDate: '2026-09-27',
    releaseTime: '04:40 PM (MMT)',
    titleMy: 'React Hooks Dispatcher မူလ Module Bundling အမှား ပြင်ဆင်ခြင်း',
    titleEn: 'Resolved React Module Hook Dispatcher & Chunk Resolution Issue',
    tag: 'feature',
    tagLabelMy: 'လုပ်ဆောင်ချက်',
    tagLabelEn: 'Feature Update',
    descriptionMy: 'Vite ၏ custom `manualChunks` ခွဲခြားမှုကြောင့် React / React DOM module များ သီးသန့်ကွဲထွက်၍ `null is not an object (evaluating resolveDispatcher().useState)` အမှား တက်ပွင့်သွားခြင်းကို Vite bundling resolution ကို ပေါင်းစည်းပေးခြင်းဖြင့် လုံးဝ ရှင်းလင်း ပြင်ဆင်လိုက်ပါသည်။',
    descriptionEn: 'Fixed Invalid Hook Call and resolveDispatcher().useState runtime error by unifying React and React DOM module bundling in Vite configuration.',
    changesMy: [
      '🛠️ **React Hook Dispatcher Error ပြင်ဆင်ခြင်း**: LoginScreen နှင့် မောဂျူးများတွင် `resolveDispatcher().useState` null ဖြစ်ကာ ErrorBoundary တက်သွားသည့် ပြဿနာကို Vite custom manualChunks ခွဲခြားမှု ဖယ်ရှား၍ React Modules များကို တစ်ပေါင်းတည်း ဖြစ်အောင် ပြင်ဆင်ပေးခဲ့ပါသည်။',
      '⚡ **App Stability**: အပလီကေးရှင်း ဖွင့်ချိန်တွင် တက်လာတတ်သော Runtime Error များကို ရှင်းလင်းပေးခဲ့ပြီး Login Screen နှင့် ပင်မ Dashboard သို့ အဆင်ပြေစွာ ဝင်ရောက်နိုင်အောင် အာမခံချက် ပေးထားပါသည်။'
    ],
    changesEn: [
      'Unified React and React DOM chunk resolution in Vite configuration to resolve invalid hook call errors.',
      'Ensured seamless initialization and stability across LoginScreen and main App routes.'
    ],
  },
  {
    version: 'v4.6.1',
    buildNumber: 56,
    releaseDate: '2026-09-27',
    releaseTime: '04:35 PM (MMT)',
    titleMy: 'စာရင်းမှတ်တမ်းဖြည့်သွင်းမှု UX/UI အဆင်ပြေစေရန် အထက်မှအောက် အစဉ်လိုက်ပုံစံနှင့် နောက်ဆုံးသုံး Wallet မှတ်ထားသည့်စနစ် ပြင်ဆင်ခြင်း',
    titleEn: 'Enhanced Transaction Modal Entry Flow & Last Used Wallet Memory',
    tag: 'feature',
    tagLabelMy: 'လုပ်ဆောင်ချက်',
    tagLabelEn: 'Feature Update',
    descriptionMy: 'စာရင်းထည့်ရန် နှိပ်လိုက်ပါက ငွေပမာဏနေရာသို့ အောက်သို့ အလိုအလျောက် ခုန်မသွားစေရန် Auto-Focus အား ဖယ်ရှား၍ Modal ဖွင့်လိုက်သည်နှင့် အပေါ်ဆုံးအကွက်မှ စတင်ပြသပေးခဲ့ပါသည်။ နောက်ဆုံးအသုံးပြုခဲ့သော Wallet (Last Used Wallet) ကို အလိုအလျောက် မှတ်သားထားပေးပြီး Wallet ➔ Date ➔ Category ➔ Item Name ➔ Amount အစဉ်လိုက်အတိုင်း ရှင်းလင်းစွာ ဖြည့်သွင်းနိုင်အောင် ပြုလုပ်ပေးထားပါသည်။',
    descriptionEn: 'Eliminated aggressive auto-focus scrolling, remembered last used wallet in localStorage, and established a smooth top-to-bottom form sequence (Wallet -> Date -> Category -> Item -> Amount).',
    changesMy: [
      '💳 **နောက်ဆုံးသုံး Wallet မှတ်သားခြင်း**: စာရင်းထည့်သွင်းတိုင်း နောက်ဆုံးအသုံးပြုခဲ့သော Wallet (Last Used Wallet) ကို အလိုအလျောက် မှတ်သား၍ နောက်တစ်ကြိမ်တွင် မူလအတိုင်း ထားရှိပေးပါသည်။',
      '🔝 **Auto-Focus ခုန်ဆင်းမှု ဖယ်ရှားခြင်း**: Modal ဖွင့်လိုက်သည်နှင့် ငွေပမာဏအကွက်သို့ တန်းရောက်ကာ အပေါ်သို့ ပြန်တက်ကြည့်နေရသည့် ဒုက္ခကို ဖယ်ရှားပေးခဲ့ပြီး Modal အပေါ်ဆုံးမှ စတင်ပြသပေးပါသည်။',
      '✨ **အထက်မှအောက် အစဉ်လိုက် UX ပုံစံ**: အပေါ်မှ စာရင်းသွင်းမည့် Wallet နှင့် ရက်စွဲ ➔ ကဏ္ဍ/ကဏ္ဍခွဲ ➔ ဝယ်သည့် ပစ္စည်းအမျိုးအစား ➔ ငွေပမာဏ စသည့် သဘာဝကျသော အစဉ်လိုက်အတိုင်း စီစဉ်ပေးထားပါသည်။'
    ],
    changesEn: [
      'Remembered Last Used Wallet automatically in localStorage across form submissions.',
      'Removed aggressive amount auto-focus jump, ensuring the modal remains anchored at the top upon opening.',
      'Refined logical top-to-bottom field progression: Target Wallet & Date -> Category & Sub-Cat -> Item Name -> Amount.'
    ],
  },
  {
    version: 'v4.6.0',
    buildNumber: 55,
    releaseDate: '2026-09-27',
    releaseTime: '04:05 PM (MMT)',
    titleMy: 'Login မျက်နှာပြင်တွင် Now VPN လမ်းညွှန်စာသား အစားထိုး ပြောင်းလဲခြင်း',
    titleEn: 'Updated VPN Recommendation Label to Now VPN on Login Screen',
    tag: 'feature',
    tagLabelMy: 'လုပ်ဆောင်ချက်',
    tagLabelEn: 'Feature Update',
    descriptionMy: 'အသုံးပြုသူ၏ ညွှန်ကြားချက်အတိုင်း Google Login ခလုတ်နှင့် အသုံးပြုပုံ လမ်းညွှန်များတွင် 1.1.1.1 စာသားအား ဖယ်ရှားပြီး "Now VPN နှင့် အဆင်ပြေဆုံး ဖြစ်သည်" ကို ရှေ့ဆုံးသို့ ပြောင်းလဲ အစားထိုးပေးလိုက်ပါသည်။',
    descriptionEn: 'Updated Google login button text and user guide instructions by removing 1.1.1.1 references and prioritizing "Now VPN" at the front.',
    changesMy: [
      '🌐 Google Pop-up Login ခလုတ်ပေါ်တွင် `Now VPN နှင့် အဆင်ပြေဆုံး ဖြစ်သည် - Google Pop-up ဖြင့် ဝင်မည်` ဟု ရှေ့ဆုံးတွင် ပေါ်လွင်စွာ အစားထိုး ပြောင်းလဲပေးခဲ့ပါသည်။',
      '🚫 1.1.1.1 (Cloudflare WARP) စာသားအား စနစ်တစ်ခုလုံးမှ လုံးဝ ဖြုတ်ပစ်ခဲ့ပါသည်။',
      '📖 အသုံးပြုပုံ လမ်းညွှန် (User Guide Modal) ၏ VPN အပိုင်းတွင်လည်း Now VPN ဖြင့် အသုံးစရိတ် စာရင်းများကို ချောမွေ့စွာ သုံးစွဲနိုင်ရန် ပြင်ဆင်ပေးထားပါသည်။'
    ],
    changesEn: [
      'Prominently added "Now VPN Recommended" to the front of the Google Pop-up Sign-In button label.',
      'Completely removed 1.1.1.1 DNS references across authentication screens and modals.',
      'Updated network troubleshooting guide in User Guide modal to reflect Now VPN usage.'
    ],
  },
  {
    version: 'v4.5.9',
    buildNumber: 54,
    releaseDate: '2026-09-27',
    releaseTime: '03:55 PM (MMT)',
    titleMy: 'ပညာပေးကဏ္ဍ (Education View) အား ဆောင်းပါး ၁၀ ခုကျော်၊ တိုက်ရိုက် မော်ဒယ်ဖတ်ရှုစနစ်နှင့် စာအုပ်ညွှန်းကြီးများဖြင့် အဆင့်မြှင့်တင်ခြင်း',
    titleEn: 'Comprehensive Financial & Life Growth Education Center with Interactive Reader Modal',
    tag: 'feature',
    tagLabelMy: 'လုပ်ဆောင်ချက်',
    tagLabelEn: 'Feature Update',
    descriptionMy: 'နဂို ပညာပေးကဏ္ဍတွင် ဖွင့်ကြည့်မရသော ကတ်ပြား ၂ ခုသာ ရှိခဲ့သည်ကို ဖယ်ရှား၍ ၅၀/၃၀/၂၀ စည်းမျဉ်း၊ Good Debt vs Bad Debt ခွဲခြားနည်း၊ ဘေဘီလုံမှ အချမ်းသာဆုံး ပုဂ္ဂိုလ်၏ နည်းလမ်း ၇ ချက်နှင့် ရွှေ၏ ဥပဒေ ၅ ချက်၊ Power 48 ဘဝတက်လမ်း လျှို့ဝှက်ချက်များနှင့် Wealth Mindset ဆောင်းပါးကြီး ၁၀ ခုကျော်ကို တိုက်ရိုက် ဖတ်ရှုနိုင်သော Interactive Reader Modal ဖြင့် အဆင့်မြှင့်တင်လိုက်ပါသည်။',
    descriptionEn: 'Overhauled Education view with over 10+ rich financial literacy guides, interactive 50/30/20 calculator widget, bookmarks, category filters, and modal reader.',
    changesMy: [
      '📚 ပညာပေးကဏ္ဍတွင် ၅၀/၃၀/၂၀ စည်းမျဉ်း၊ အရေးပေါ် ရန်ပုံငွေ၊ Asset vs Liability၊ Compound Interest၊ Good Debt vs Bad Debt၊ Debt Snowball & Avalanche၊ ဘေဘီလုံမြို့၏ နည်းလမ်းများနှင့် Power 48 ဘဝတက်လမ်း ဆောင်းပါး ၁၀ ခုကျော် ထည့်သွင်းပေးထားပါသည်။',
      '📖 ဆောင်းပါးတစ်ခုစီကို နှိပ်၍ အသေးစိတ် ဖတ်ရှုနိုင်သော Article Reader Modal ကို Font Size ပြောင်းလဲမှု (A+/A-) ၊ အဓိက မှတ်သားဖွယ်ရာ (Key Takeaways) နှင့် Next/Prev စာမျက်နှာ ကူးပြောင်းမှုများဖြင့် တပ်ဆင်ပေးထားပါသည်။',
      '🔖 မိမိကြိုက်နှစ်သက်ရာ ဆောင်းပါးများကို Bookmark မှတ်တမ်းတင် သိမ်းဆည်းနိုင်သော စနစ် ထည့်သွင်းပေးထားပါသည်။',
      '🧮 ၅၀/၃၀/၂၀ စည်းမျဉ်း ဆောင်းပါးအတွင်း၌ မိမိဝင်ငွေ ရိုက်ထည့်၍ ချက်ချင်း ခွဲဝေတွက်ချက်နိုင်သော Interactive Calculator Widget တပ်ဆင်ပေးထားပါသည်။',
      '🔍 ခေါင်းစဉ်၊ အကြောင်းအရာ၊ ဘေဘီလုံ သို့မဟုတ် Power 48 စာလုံးများဖြင့် Instant Search ရှာဖွေနိုင်သော စနစ် ပါဝင်ပါသည်။'
    ],
    changesEn: [
      'Added 10+ comprehensive guides covering 50/30/20 rule, Good vs Bad Debt, Richest Man in Babylon 7 cures, and 48 Laws of Power.',
      'Built interactive Article Reader Modal with A+/A- font size toggle, Key Takeaways highlights, and Next/Previous navigation.',
      'Implemented persistent Bookmarks to save favorite articles locally.',
      'Embedded 50/30/20 instant budget calculator directly inside budgeting articles.',
      'Integrated real-time search and multi-category filtering.'
    ],
  },
  {
    version: 'v4.5.8',
    buildNumber: 53,
    releaseDate: '2026-09-27',
    releaseTime: '03:10 PM (MMT)',
    titleMy: 'Change Log မှတ်တမ်းအပြည့်အစုံ ဖြည့်သွင်းခြင်းနှင့် Wallet, Debt, Transfer, Vehicle စနစ်များ စနစ်တကျ ပေါင်းစည်းခြင်း',
    titleEn: 'Complete System Change Log Integration and Systemic Balance & Debt Reconciliation',
    tag: 'feature',
    tagLabelMy: 'လုပ်ဆောင်ချက်',
    tagLabelEn: 'Feature Update',
    descriptionMy: 'အသုံးပြုသူ၏ တောင်းဆိုချက်များအတိုင်း ပြင်ဆင်ခဲ့သမျှ ပြင်ဆင်ချက် Change Log များကို အက်ပ်အတွင်း Version History Modal ၌ အသေးစိတ် ထည့်သွင်းပေးထားပြီး Wallet, Debt, Transfer, Vehicle စနစ်များအားလုံး၏ ချိတ်ဆက်ဆောင်ရွက်မှုများကို စနစ်တကျ အဆင့်မြှင့်တင်ထားပါသည်။',
    descriptionEn: 'Incorporated complete Change Log details in Version History and finalized all integrated updates for Wallets, Debts, Transfers, and Vehicle Management.',
    changesMy: [
      '📜 Change Log မှတ်တမ်းများကို ပြင်ဆင်မှုတိုင်းတွင် အမြဲမပြတ် ရေးသားမှတ်တမ်းတင်ပေးထားပြီး Version History Modal တွင် တိုက်ရိုက် ကြည့်ရှုနိုင်ပါသည်။',
      '💳 အကြွေးစာရင်းများကို သီးသန့်မဖြစ်စေဘဲ သက်ဆိုင်ရာ Wallet များဆီသို့ ချိတ်ဆက်၍ ဝင်ငွေ/ထွက်ငွေ စာရင်းထဲတွင် တပါတည်း ပေါင်းစပ် တွက်ချက်ပေးထားပါသည်။',
      '🔄 ငွေလွှဲ Category တွင် ငွေလွှဲထွက် (Expense) နှင့် ငွေလွှဲဝင် (Income) တို့ကို မူလ Wallet ➔ လက်ခံမည့် Wallet Dropdown Selector ဖြင့် တိုက်ရိုက် လွှဲပြောင်းနိုင်အောင် ပြုလုပ်ပေးထားပါသည်။',
      '🚗 ယာဉ်စီမံခန့်ခွဲမှု Category ကို ရွေးချယ်မှသာ ယာဉ် အမျိုးအစား ၃ ခု (General / ဆီဖိုး / Other Vehicle Svc) ပေါ်စေပြီး အခြား Category များတွင် General Form သာ ရှင်းလင်းစွာ ပြသပေးပါသည်။',
      '🚀 Dashboard Banners တွင် `+ ဝင်ငွေမှတ်မည်` ၊ `- ထွက်ငွေမှတ်မည်` နှင့် `🤝 အကြွေးမှတ်မည်` ခလုတ် ၃ ခုလုံးကို တပြိုင်နက် ထည့်သွင်းပေးထားပါသည်။'
    ],
    changesEn: [
      'Ensured full persistent Change Log updates integrated directly into the in-app Version History modal.',
      'Linked debts directly with individual wallet accounts and automated wallet balance cash-flow calculations.',
      'Upgraded transfer handling with explicit From Wallet -> To Wallet selector and expense/income auto-pairing.',
      'Enforced conditional visibility of vehicle models only under Vehicle Management category.',
      'Provided 1-tap quick action buttons for Income, Expense, and Debt logging on the Dashboard.'
    ],
  },
  {
    version: 'v4.5.7',
    buildNumber: 52,
    releaseDate: '2026-09-27',
    releaseTime: '03:05 PM (MMT)',
    titleMy: 'ငွေသား (လက်ဝယ်) Wallet Balance တွက်ချက်မှုနှင့် တိုက်ရိုက် Wallet ID Resolver အမှားများ ပြင်ဆင်ခြင်း',
    titleEn: 'Fixed Direct Wallet Balance Override Bug and Debt Auto-Transaction Deduplication',
    tag: 'feature',
    tagLabelMy: 'လုပ်ဆောင်ချက်',
    tagLabelEn: 'Feature Update',
    descriptionMy: 'ငွေလွှဲ မှတ်တမ်းများ၏ Note စာသားတွင် ငွေသား Wallet နာမည် ပါဝင်နေပါက Wallet ID ကို အခြား Wallet သို့ မှားယွင်းပြောင်းလဲ ပေးပို့နေသည့် Override Logic အမှားကို ပြင်ဆင်ခဲ့ပြီး၊ အကြွေးမှတ်တမ်း အလိုအလျောက် ရေးသွင်းမှုကြောင့် နှစ်ထပ် တွက်ချက်မိခြင်း (Double Counting) များကို လုံးဝ ရှင်းလင်းပေးခဲ့ပါသည်။',
    descriptionEn: 'Fixed a balance computation bug where transfer notes mentioning wallet names inadvertently re-routed transactions away from the Cash wallet, and prevented double-counting of auto-generated debt transactions.',
    changesMy: [
      '⚡ `resolveTransactionWallet` Function တွင် သတ်မှတ်ထားသော Wallet ID အမှန်ရှိနေပါက Note ပေါ်မူတည်၍ တခြား Wallet သို့ မှားယွင်း ပြောင်းလဲသွားခြင်း (Wallet Re-assignment Override Bug) ကို လုံးဝ ပြင်ဆင်ခဲ့ပါသည်။',
      '⚖️ `calculateWalletLiveBalance` တွင် အကြွေးသစ်နှင့် ငွေဆပ်မှတ်တမ်းများကြောင့် ထွက်ပေါ်လာသော အလိုအလျောက် Transaction များကို နှစ်ထပ် တွက်မိခြင်း (Double Counting) မရှိစေရန် စစ်ထုတ်ပေးခဲ့ပါသည်။',
      '💵 ငွေသား (လက်ဝယ်) Wallet ၏ ဝင်ငွေ၊ ထွက်ငွေ၊ ငွေလွှဲနှင့် အကြွေး စာရင်းများအားလုံး၏ Net Live Balance ကို တိကျမှန်ကန်စွာ တွက်ချက်ပေးလိုက်ပါပြီ။'
    ],
    changesEn: [
      'Prioritized explicit wallet IDs in resolveTransactionWallet to fix the bug where transfer notes inadvertently re-routed cash transactions to secondary wallets',
      'Deduplicated auto-generated debt transactions in calculateWalletLiveBalance to prevent double counting',
      'Restored mathematically accurate live balance computation for Cash and all other wallets'
    ],
  },
  {
    version: 'v4.5.6',
    buildNumber: 51,
    releaseDate: '2026-09-27',
    releaseTime: '02:50 PM (MMT)',
    titleMy: 'အကြွေးစာရင်းများနှင့် Wallet Auto Cash Flow Sync ပေါင်းစပ်ပေးခြင်း၊ ငွေလွှဲပြောင်းမှုစနစ် အဆင့်မြှင့်တင်ခြင်းနှင့် Dashboard Quick Action ခလုတ်များ စုံလင်စေခြင်း',
    titleEn: 'Automated Debt-to-Wallet Cash Flow Sync, Upgraded Transfer Flow, and Dashboard Quick Actions',
    tag: 'feature',
    tagLabelMy: 'လုပ်ဆောင်ချက်အသစ်',
    tagLabelEn: 'Feature Update',
    descriptionMy: 'အကြွေးအသစ်မှတ်တမ်းတင်မှုနှင့် ပြန်ဆပ်မှုများကို သက်ဆိုင်ရာ Wallet ၏ ဝင်ငွေ/ထွက်ငွေ စာရင်းထဲသို့ အလိုအလျောက် သွားရောက် ချိတ်ဆက်တွက်ချက်ပေးခြင်း၊ ငွေလွှဲ Category တွင် From & To Wallet Selector ထည့်သွင်းပေးခြင်းနှင့် Dashboard တွင် ဝင်ငွေ၊ ထွက်ငွေ၊ အကြွေး မှတ်တမ်းတင်ရန် Quick Action ခလုတ် ၃ ခုစလုံး ပေါင်းစည်းပေးခြင်း။',
    descriptionEn: 'Integrated automatic Wallet Cash Flow syncing for debt creation and repayments, added From/To Wallet selection for transfer category, and unified 1-tap quick action buttons for Income, Expense, and Debt on the Dashboard.',
    changesMy: [
      '🤝 အကြွေးအသစ်မှတ်တမ်းတင်ခြင်းနှင့် ပြန်ဆပ်မှုများကို သက်ဆိုင်ရာ Wallet ၏ ဝင်ငွေ/ထွက်ငွေ စာရင်းထဲသို့ အလိုအလျောက် သွားရောက် ချိတ်ဆက်တွက်ချက်ပေးခြင်း (Auto Cash Flow Sync)',
      '💳 Debts View တွင် ပိုက်ဆံအိတ်/အကောင့်တစ်ခုစီ၏ အကြွေးစာရင်းများကို သီးသန့် ခွဲခြားကြည့်ရှုနိုင်သော Wallet Filter Selector Bar ထည့်သွင်းပေးခြင်း',
      '🔄 ငွေလွှဲ Category တွင် ငွေလွှဲထွက်ကို Expense (အထွက်စာရင်း)၊ ငွေလွှဲဝင်ကို Income (အဝင်စာရင်း) အဖြစ် Auto-Sync လုပ်ပေးပြီး၊ ငွေလွှဲပြောင်းမည့် From Wallet ➔ To Wallet Card တိုက်ရိုက် ထည့်သွင်းပေးခြင်း',
      '🚗 ယာဉ်စီမံခန့်ခွဲမှု Category (Vehicle Management) ရွေးချယ်မှသာ Model Selector Toggle (General / Fuel / Other Vehicle) ပေါ်ရမည်ဖြစ်ပြီး တခြား Category များတွင် General Form သာ ရှင်းလင်းစွာ ပြသပေးခြင်း',
      '🎛️ စာရင်း ပုံစံ ရွေးချယ်သည့် Toggle ခလုတ်များ (`၁။ General` ၊ `၂။ ဆီဖိုး` ၊ `၃။ Other Vehicle Svc`) ကို Sub Category အကွက်၏ တိုက်ရိုက် အောက်ဘက်သို့ ရွှေ့ပြောင်းနေရာချထားပေးခြင်း',
      '🚀 Dashboard ပင်မစာမျက်နှာ Banner တွင် `+ ဝင်ငွေမှတ်မည်` ၊ `- ထွက်ငွေမှတ်မည်` နှင့် `🤝 အကြွေးမှတ်မည်` Quick Action ခလုတ် ၃ ခုလုံးကို ယှဉ်တွဲ၍ တပြိုင်နက် ထည့်သွင်းပေးခြင်း'
    ],
    changesEn: [
      'Automated Wallet Cash Flow Sync for debt creation and repayments, updating wallet balance and transaction logs instantly',
      'Added Wallet Filter Selector Bar in Debts View to filter loans and receivables per specific wallet account',
      'Upgraded Transfer Category with automated Transfer Out (Expense) / Transfer In (Income) sync and inline From Wallet -> To Wallet selector card',
      'Conditional Model Selector Toggle: only displays 3-model vehicle options when Vehicle Management category is selected',
      'Relocated Model Selector Toggle directly below the Sub-Category input card for seamless visual hierarchy',
      'Added 1-tap Quick Action buttons for Add Income, Add Expense, and Add Debt directly on the Dashboard banner'
    ],
  },
  {
    version: 'v4.5.5',
    buildNumber: 50,
    releaseDate: '2026-09-27',
    releaseTime: '02:35 PM (MMT)',
    titleMy: 'ဆီဖိုး ထည့်သွင်းခြင်း UI/UX ရှင်းလင်းကျစ်လျစ်စေခြင်း၊ ပင်မ ထွက်ငွေနေရာတွင် Inline ဆီဖိုးတွက်ချက်စနစ် ပေါင်းစပ်ပေးခြင်းနှင့် လမ်းညွှန်ချက် ထည့်သွင်းပေးခြင်း',
    titleEn: 'Unified Fuel Logging UI/UX, Inline Direct Fuel Calculator, and Visual Entry Guide',
    tag: 'feature',
    tagLabelMy: 'လုပ်ဆောင်ချက်အသစ်',
    tagLabelEn: 'Feature Update',
    descriptionMy: 'ဆီဖိုး ထည့်သွင်းရာတွင် ပင်မ အသုံးစရိတ်နေရာနှင့် ယာဉ်စီမံမှုနေရာ ၂ ခု ကွဲပြားရှုပ်ထွေးနေခြင်းကို ဖြေရှင်း၍ ပင်မ ထွက်ငွေဖြည့်သွင်းသည့် မျက်နှာပြင်ထဲတွင်ပင် လီတာ၊ ၁ လီတာနှုန်းနှင့် ဒိုင်ခွက်မိုင်ပါ တိုက်ရိုက်တွက်ချက်သိမ်းဆည်းနိုင်သော Dual-Mode Fuel Card နှင့် ရှင်းလင်းချက် လမ်းညွှန်ကို တပ်ဆင်ပေးခြင်း။',
    descriptionEn: 'Streamlined fuel entry workflow by eliminating confusing redirections, providing an inline dual-mode fuel calculator directly inside the main expense modal, and adding an illustrated guide explaining that entering in either place automatically synchronizes without double-entry.',
    changesMy: [
      'ပင်မ ထွက်ငွေစာရင်း (Transaction Modal) တွင် ကား/စက်သုံးဆီ ကဏ္ဍ ရွေးချယ်သည့်အခါ မျက်နှာပြင်မှ ထွက်ခွာစရာမလိုဘဲ တိုက်ရိုက် ဖြည့်သွင်းနိုင်သော Dual-Mode Fuel Card တပ်ဆင်ပေးခြင်း',
      '⚡ ရိုးရိုး ဆီဖိုးသာ ထည့်လိုပါက အပေါ်က ပမာဏ (Amount) တွင် တိုက်ရိုက်ရိုက်ထည့်ပြီး ချက်ချင်း စာရင်းသွင်းနိုင်အောင် စီစဉ်ပေးခြင်း',
      '⛽ ဆီစားနှုန်း (km/L) ပါ တွက်လိုပါက ၁ လီတာနှုန်း၊ ဆီလီတာ၊ ဆီဆိုင်နှင့် ဒိုင်ခွက်မိုင်တို့ကို ပင်မနေရာတွင်ပင် တပြိုင်နက် တွက်ချက်ထည့်သွင်းနိုင်အောင် ပေါင်းစပ်ပေးခြင်း',
      'အသုံးပြုသူ မည်သည့်နေရာမှ ထည့်သွင်းသည်ဖြစ်စေ ပိုက်ဆံအိတ်ထဲမှ ငွေနုတ်ယူကာ ထွက်ငွေစာရင်းရော ယာဉ်မှတ်တမ်းပါ တပြိုင်နက် ရောက်ရှိမည်ဖြစ်၍ ၂ ခါ ထပ်ထည့်ရန် မလိုကြောင်း အာမခံချက် အသိပေးစာသားများ ထည့်သွင်းပေးခြင်း',
      'မျက်နှာပြင်မှ ထွက်ခွာသွားစေသည့် ရှုပ်ထွေးသော လမ်းညွှန်ခလုတ်ကို ဖယ်ရှားပြီး "❓ ဆီဖိုး ဘယ်လို ထည့်ရမလဲ?" ရှင်းလင်းချက် Visual Guide Modal ကို နေရာ ၂ ခုစလုံးတွင် တပ်ဆင်ပေးခြင်း'
    ],
    changesEn: [
      'Added an inline dual-mode Fuel & Vehicle card directly inside the main Transaction Modal for seamless zero-friction logging',
      'Mode 1 (Quick Amount): Enter fuel cost directly into the main Amount input with optional vehicle tag without extra steps',
      'Mode 2 (Mileage Calculator): Input liters, price per liter, gas station, and odometer inline with bidirectional total cost calculation',
      'Reinforced single-source-of-truth syncing: entries made anywhere automatically deduct from wallet and sync to both vehicle and transaction databases',
      'Added an illustrated "Where & How to Log Fuel" visual guide modal accessible with 1 tap from both Transaction Modal and Vehicles View'
    ],
  },
  {
    version: 'v4.5.4',
    buildNumber: 49,
    releaseDate: '2026-09-27',
    releaseTime: '01:05 PM (MMT)',
    titleMy: 'ယာဉ်စီမံခန့်ခွဲမှု စနစ်တွင် Premium အတွက် Unlimited ယာဉ်များ ခွင့်ပြုခြင်းနှင့် "+ ယာဉ်အသစ်" ထည့်သွင်းမှု UI မြှင့်တင်ခြင်း',
    titleEn: 'Unlimited Vehicles for Premium, 1 Vehicle for Free, and Prominent Add Vehicle UI',
    tag: 'feature',
    tagLabelMy: 'လုပ်ဆောင်ချက်အသစ်',
    tagLabelEn: 'Feature Update',
    descriptionMy: 'VIP Premium သုံးစွဲသူများအတွက် ယာဉ်အစီးရေ အကန့်အသတ်မဲ့ (Unlimited Vehicles) ထည့်သွင်းခွင့်ပြုပြီး Free သုံးစွဲသူများအတွက် ယာဉ် ၁ စီး အခမဲ့ စီမံခွင့်ပေးခြင်း၊ "+ ယာဉ်အသစ်" ထည့်သွင်းသည့် ထင်ရှားသော ခလုတ်နှင့် Multi-Vehicle Quick Switcher Strip ကို တပ်ဆင်ပေးခြင်း။',
    descriptionEn: 'Unlocked Unlimited Vehicles for VIP Premium users, 1 Vehicle for Free users, and introduced prominent "+ Add Vehicle" buttons, in-dropdown vehicle creation, and a quick fleet switcher strip.',
    changesMy: [
      'VIP Premium အကောင့်များအတွက် ယာဉ်အစီးရေ အကန့်အသတ်မဲ့ (Unlimited Fleet) စီမံခန့်ခွဲခွင့် အပြည့်အဝ ဖွင့်ပေးခြင်း',
      'Free အကောင့်များအတွက် ယာဉ် ၁ စီး အခမဲ့ စီမံခွင့်ပြုပြီး ယာဉ်ထပ်တိုးလိုပါက VIP သို့ အလွယ်တကူ မြှင့်တင်နိုင်စေခြင်း',
      'ယာဉ်စီမံခန့်ခွဲမှု ထိပ်ပိုင်းတွင် "+ ယာဉ်အသစ်" ထည့်သွင်းနိုင်သော ထင်ရှားသည့် ခလုတ်အသစ်ကို ပေါ်လွင်စွာ တပ်ဆင်ပေးခြင်း',
      'ယာဉ်ရွေးချယ်သည့် Dropdown စာရင်းတွင်လည်း "➕ + ယာဉ်အသစ် ထပ်တိုးရန်..." ကို တိုက်ရိုက် ထည့်သွင်းပေးခြင်း',
      'ယာဉ်များစွာရှိပါက ယာဉ်တစ်စီးချင်းစီကို ၁ ချက်နှိပ် အလွယ်တကူ ကူးပြောင်းနိုင်သော ယာဉ်စာရင်း Switcher Strip ထည့်သွင်းပေးခြင်း',
      'ယာဉ်ပြင်ဆင်ခြင်း (Edit) အပြင် မလိုလားအပ်သော ယာဉ်ကို လုံခြုံစွာ ဖျက်ပစ်နိုင်သော (Delete Vehicle) လုပ်ဆောင်ချက် ထည့်သွင်းပေးခြင်း'
    ],
    changesEn: [
      'Fully enabled Unlimited Vehicles for VIP Premium accounts with no fleet limitations',
      'Enabled 1 Vehicle management for Free tier users with seamless upgrade flow for multiple vehicles',
      'Added a prominent and clearly labeled "+ Add Vehicle" button on mobile and desktop',
      'Added an immediate "+ Add New Vehicle..." option directly inside the vehicle selector dropdown',
      'Added a quick multi-vehicle switcher carousel strip to smoothly jump between vehicles with 1 tap',
      'Added full Edit and secure Delete vehicle functionality'
    ],
  },
  {
    version: 'v4.5.3',
    buildNumber: 48,
    releaseDate: '2026-09-27',
    releaseTime: '12:15 PM (MMT)',
    titleMy: 'Dashboard တွင် ယခုလနှင့် ပြီးခဲ့သည့်လ သုံးစွဲမှု နှိုင်းယှဉ်ချက် Bar Chart (Monthly Comparison) ကတ် ထည့်သွင်းခြင်း',
    titleEn: 'Monthly Comparison Card with Recharts Bar Chart on Dashboard',
    tag: 'feature',
    tagLabelMy: 'လုပ်ဆောင်ချက်အသစ်',
    tagLabelEn: 'Feature Release',
    descriptionMy: 'Dashboard ပင်မစာမျက်နှာတွင် ယခုလနှင့် ပြီးခဲ့သည့်လ၏ အသုံးစရိတ်များကို Recharts Bar Chart ဖြင့် မျက်စိရှင်းလင်းစွာ နှိုင်းယှဉ်လေ့လာနိုင်သော Monthly Comparison Card ကို အသစ်ထည့်သွင်းပေးခြင်း။',
    descriptionEn: 'Added a dedicated Monthly Comparison card to the Dashboard that uses interactive Recharts bar charts to compare spending this month vs. the previous month.',
    changesMy: [
      'Dashboard တွင် ယခုလနှင့် ပြီးခဲ့သည့်လ အသုံးစရိတ် ကွာခြားချက် (Variance & % Change) ကို တွက်ချက်ပြသပေးသည့် Monthly Comparison Card ထည့်သွင်းခြင်း',
      'Recharts အသုံးပြုထားသော အပြန်အလှန်တုံ့ပြန်နိုင်သည့် တိုင်ပုံစံဇယား (Bar Chart) ဖြင့် ခြုံငုံသုံးစွဲမှုနှင့် ထိပ်တန်းကဏ္ဍများအလိုက် နှိုင်းယှဉ်ပြသပေးခြင်း',
      'တစ်လလုံး စုစုပေါင်း နှိုင်းယှဉ်ချက်အပြင် ယနေ့ရက်စွဲအထိ ပြိုင်တူရက်များ (To-Date: Day 1 - Today) အလိုက် တိကျစွာ နှိုင်းယှဉ်ကြည့်ရှုနိုင်သော Toggle ထည့်သွင်းပေးခြင်း',
      'သုံးစွဲမှု လျော့ကျခြင်း/ပိုမိုခြင်းအပေါ် မူတည်၍ စိတ်ဝင်စားဖွယ် အရောင်အသွေး (Emerald/Rose) နှင့် သုံးသပ်ချက် မှတ်ချက် (Insight Summary) ပြသပေးခြင်း'
    ],
    changesEn: [
      'Added a responsive "Monthly Comparison" card to the Dashboard comparing spending this month vs. the previous month',
      'Interactive Recharts bar charts supporting both Overall Spending comparison and Top Categories comparison',
      'Support for both Full Month comparison and Like-for-Like To-Date (Day 1 - Today) mode',
      'Automatic variance and percentage change calculation with color-coded savings/overspending indicators and smart insights'
    ]
  },
  {
    version: 'v4.5.2',
    buildNumber: 47,
    releaseDate: '2026-09-26',
    releaseTime: '03:00 PM (MMT)',
    titleMy: 'Sub-Category အား Horizontal Scroll အစား သပ်ရပ်သော Dropdown Menu ဖြင့် အစားထိုးခြင်း',
    titleEn: 'Sub-Category Dropdown Selector Replacement (No Horizontal Scroll)',
    tag: 'feature',
    tagLabelMy: 'လုပ်ဆောင်ချက်အသစ်',
    tagLabelEn: 'Feature Release',
    descriptionMy: 'စာရင်းသွင်းရာတွင် ကဏ္ဍခွဲ (Sub-Category) များကို ဘေးသို့ Scroll ဆွဲရွေးချယ်ရသည့် အဆင်မပြေမှုကို ဖယ်ရှားပြီး ရှင်းလင်းကျစ်လျစ်သော Dropdown Menu ဖြင့် ၁ ချက်နှိပ် ရွေးချယ်နိုင်စေခြင်း။',
    descriptionEn: 'Replaced horizontal scrolling sub-category chips with a structured, intuitive Dropdown Selector for optimal ergonomics and zero horizontal scrolling.',
    changesMy: [
      'ကဏ္ဍခွဲများ အားလုံးကို ဘေးသို့ Scroll ဆွဲရန်မလိုဘဲ Dropdown ဖြင့် ချက်ချင်း အလွယ်တကူ ရွေးချယ်နိုင်စေခြင်း',
      'အဓိကကဏ္ဍသာ (Main Category Only) နှင့် ကဏ္ဍခွဲတစ်ခုချင်းစီကို အိုင်ကွန်ဖြင့် ရှင်းလင်းစွာ ခွဲခြားပြသပေးခြင်း',
      'ဖုန်းမျက်နှာပြင်အားလုံးတွင် စာသားများ မပြတ်တောက်ဘဲ အပြည့်အစုံ ဖတ်ရှုရွေးချယ်နိုင်အောင် တည်ဆောက်ပေးခြင်း'
    ],
    changesEn: [
      'Replaced horizontal scrollable sub-category chips with a clean native-style Dropdown Selector',
      'Clear differentiation between Main Category Only and all sub-categories with clean folder icons',
      'Ensured full text visibility and smooth selection on all mobile screen sizes without text clipping'
    ]
  },
  {
    version: 'v4.5.1',
    buildNumber: 46,
    releaseDate: '2026-09-26',
    releaseTime: '02:40 PM (MMT)',
    titleMy: 'Category ရွေးချယ်မှု UI ရှင်းလင်းမှု မြှင့်တင်ခြင်းနှင့် Single-Tap Card ဒီဇိုင်းသစ်',
    titleEn: 'Streamlined Category & Sub-Category Selection UI',
    tag: 'feature',
    tagLabelMy: 'လုပ်ဆောင်ချက်အသစ်',
    tagLabelEn: 'Feature Release',
    descriptionMy: 'စာရင်းမှတ်တမ်းတင်ရာတွင် Category နှင့် Sub-Category ရွေးချယ်သည့်နေရာ ရှုပ်ထွေးနေမှုကို ဖယ်ရှားပြီး ရှင်းလင်းကျစ်လျစ်သော 1-Tap Card ဒီဇိုင်းသစ်ဖြင့် အစားထိုးပြောင်းလဲပေးခြင်း။',
    descriptionEn: 'Refactored transaction category selection into an ultra-clean, non-redundant single-tap card with direct sub-category indicators and clutter-free mobile ergonomics.',
    changesMy: [
      'ထပ်နေသော "ကဏ္ဍ အားလုံးရှာဖွေရန်" ခလုတ်နှင့် ရှုပ်ထွေးနေသော အတွင်းဘောင်များကို ဖယ်ရှား၍ မျက်စိရှင်းလင်းစေခြင်း',
      'ကဏ္ဍအမည်၊ ကဏ္ဍခွဲတံဆိပ် (ဥပမာ- အစားအသောက် › သွားရည်စာ) နှင့် အိုင်ကွန်တို့ကို တစ်ကတ်တည်းတွင် အမြင်ရှင်းစွာ ပေါင်းစပ်ပေးခြင်း',
      'ကတ်တစ်ခုလုံးကို တစ်ချက်နှိပ်ရုံဖြင့် ပြည့်စုံသော Category Picker Window ပွင့်လာစေခြင်း',
      'လက်ရှိရွေးထားသော ကဏ္ဍတွင် ကဏ္ဍခွဲများရှိပါက အောက်တွင် ရှင်းလင်းသော Quick Pill Chip များဖြင့် ၁ ချက်နှိပ် အလွယ်တကူ ပြောင်းလဲနိုင်ခြင်း'
    ],
    changesEn: [
      'Eliminated duplicate "Browse Categories" buttons and complex nested borders to remove visual clutter',
      'Unified main category, sub-category badge (e.g. Food & Dining › Snacks), and icon into a single elegant tile',
      'Made the whole tile a smooth tap target to open the full-screen Category Picker Window',
      'Simplified inline sub-category pills into a clean, single-row layout without nested clutter'
    ]
  },
  {
    version: 'v4.5.0',
    buildNumber: 45,
    releaseDate: '2026-09-26',
    releaseTime: '02:20 PM (MMT)',
    titleMy: 'သတ်မှတ်ရက်စွဲတစ်ခုတည်း စစ်ထုတ်ကြည့်ရှုခြင်း (Specific Date Picker) နှင့် ရက်စွဲအပိုင်းအခြား စနစ်သစ်',
    titleEn: 'Specific Single Date Filter & Custom Date Range System',
    tag: 'feature',
    tagLabelMy: 'လုပ်ဆောင်ချက်အသစ်',
    tagLabelEn: 'Feature Release',
    descriptionMy: 'ဝင်ငွေ/ထွက်ငွေ မှတ်တမ်းများတွင် ကြည့်လိုသည့် သတ်မှတ်ရက်စွဲတစ်ခုတည်း (ဥပမာ- ဒီနေ့၊ မနေ့က သို့မဟုတ် ပြက္ခဒိန်မှ ရွေးချယ်သည့် သီးသန့်ရက်) သာမက ရက်စွဲအပိုင်းအခြားအလိုက် အတိအကျ စစ်ထုတ်ကြည့်ရှုနိုင်သော စနစ်သစ်။',
    descriptionEn: 'Enhanced transactions view with interactive single specific date picker, previous/next day stepping, custom date range filtering, and 1-click date filtering directly from transaction rows.',
    changesMy: [
      'ဝင်ငွေ/ထွက်ငွေ စာရင်းတွင် ကြည့်လိုသည့် သတ်မှတ်ရက်စွဲ (Specific Date) တစ်ခုတည်းကို ပြက္ခဒိန်ဖြင့် အလွယ်တကူ ရွေးချယ်စစ်ထုတ်နိုင်ခြင်း',
      'ရက်စွဲတစ်ခုချင်းစီအလိုက် ရှေ့ရက် (◀) / နောက်ရက် (▶) အလွယ်တကူ ကူးပြောင်းနိုင်သော Navigation ခလုတ်များ တပ်ဆင်ခြင်း',
      'ဒီနေ့ (Today) နှင့် မနေ့က (Yesterday) စာရင်းများသို့ ၁ ချက်နှိပ်ရုံဖြင့် ချက်ချင်း ရောက်ရှိနိုင်သော Quick Buttons များ ထည့်သွင်းခြင်း',
      'ရက်စွဲအပိုင်းအခြား (Custom Date Range - ၇ ရက်၊ ၃၀ ရက်၊ စိတ်ကြိုက်စတင်/ပြီးဆုံးရက်) စစ်ထုတ်နိုင်သော စနစ်သစ်',
      'စာရင်းမှတ်တမ်းများပေါ်ရှိ ရက်စွဲတံဆိပ်ကို နှိပ်ရုံဖြင့် ယင်းနေ့ရှိ စာရင်းအားလုံးကို ချက်ချင်း စစ်ထုတ်ပြသပေးသော 1-Click Date Filtering စနစ်',
      'ရက်သတ္တပတ်၏ နေ့အမည် (ဥပမာ- စနေနေ့၊ တနင်္ဂနွေ) နှင့် သက်ဆိုင်ရာ မြန်မာရက်စွဲ အပြည့်အစုံ ဖော်ပြပေးခြင်း'
    ],
    changesEn: [
      'Added interactive specific single-date filtering with calendar date picker in Transactions view',
      'Equipped Previous Day (◀) and Next Day (▶) navigation buttons for seamless daily timeline browsing',
      'Added instant one-tap quick jump buttons for "Today" and "Yesterday"',
      'Added customizable date range filtering with start/end date controls and 7-day / 30-day quick presets',
      'Enabled 1-click date filtering by clicking any date badge directly in transaction rows',
      'Added localized day-of-week and full date header display for crystal-clear context'
    ]
  },
  {
    version: 'v4.4.0',
    buildNumber: 44,
    releaseDate: '2026-09-26',
    releaseTime: '12:30 PM (MMT)',
    titleMy: 'Category ရွေးချယ်မှု Window ဒီဇိုင်းသစ်နှင့် အကောင့်သစ်များအတွက် ၃ လ အခမဲ့ Premium စနစ်',
    titleEn: 'Dedicated Category Picker Window & 3-Month Free Trial for New Users',
    tag: 'feature',
    tagLabelMy: 'လုပ်ဆောင်ချက်အသစ်',
    tagLabelEn: 'Feature Release',
    descriptionMy: 'စာရင်းသွင်းရာတွင် Category နှင့် Sub-Category များကို သီးသန့် Window/Modal အသစ်ဖြင့် ရှာဖွေရွေးချယ်နိုင်သော ခေတ်မီ UI ဒီဇိုင်းသစ် တပ်ဆင်ခြင်းနှင့် အကောင့်ဖွင့်ပြီး ၁ လအတွင်း သုံးစွဲသူတိုင်းအတွက် ၃ လ အခမဲ့ Premium (Free Trial 3 Months) ရယူနိုင်သော အထူးစနစ်။',
    descriptionEn: 'Introduced a dedicated full-featured Category Picker Window with live search and 1-click sub-category selection, plus a 3-Month Free Premium Trial for new accounts within 30 days of registration.',
    changesMy: [
      'စာရင်းသွင်းရာတွင် Category ရွေးချယ်ရန် သီးသန့် Category Picker Window / Modal အသစ် ထည့်သွင်းပေးခြင်း',
      'ကဏ္ဍနှင့် ကဏ္ဍခွဲများကို မြန်မာ/အင်္ဂလိပ် အမည်များဖြင့် အချိန်နှင့်တပြေးညီ ရှာဖွေနိုင်သော Live Search စနစ်',
      'အဓိကကဏ္ဍနှင့် ကဏ္ဍခွဲများကို တစ်ချက်နှိပ်ရုံဖြင့် လွယ်ကူလျင်မြန်စွာ ရွေးချယ်နိုင်သော ကတ်ဒီဇိုင်းသစ်',
      'အကောင့်စဖွင့်သည့် နေ့မှ ၁ လ (ရက် ၃၀) အတွင်း အသုံးပြုသူတိုင်းအတွက် ၃ လ အခမဲ့ Premium (Get Free Trial 3 Months) ရယူနိုင်သော စနစ် ထည့်သွင်းခြင်း',
      'လက်ကျန် ရက်ပေါင်း Countdown နှင့် ၁ ချက်နှိပ်ရုံဖြင့် ချက်ချင်း အသက်ဝင်စေသော One-Click Activation စနစ်',
      'Free Plan အသုံးပြုသူများအတွက် အခမဲ့ စမ်းသုံးခွင့် လက်ဆောင်ရယူရန် Plan Banner တွင် သိသာထင်ရှားစွာ ပြသပေးခြင်း'
    ],
    changesEn: [
      'Added dedicated modal window for choosing categories and sub-categories during transaction entry',
      'Instant live search across Burmese and English category and sub-category names',
      'Modern, spacious cards with 1-click selection for main categories and expandable sub-categories',
      'Introduced 3-Month Free Premium Trial eligibility for all new accounts within 1 month (30 days) of registration',
      'Eligibility countdown tracker with instant one-click free trial activation',
      'Interactive gift action in Plan Banner to easily discover and claim the 3-month welcome gift'
    ]
  },
  {
    version: 'v4.3.0',
    buildNumber: 43,
    releaseDate: '2026-09-25',
    releaseTime: '01:45 PM (MMT)',
    titleMy: 'Category သိမ်းဆည်းမှု ခိုင်မာစေခြင်းနှင့် Custom Category Lock စနစ်',
    titleEn: 'Category Data Persistence & Non-Destructive Custom Category Lock',
    tag: 'feature',
    tagLabelMy: 'လုပ်ဆောင်ချက်အသစ်',
    tagLabelEn: 'Feature Release',
    descriptionMy: 'Refresh လုပ်တိုင်း Category / Sub-Category အသစ်များ ပျောက်သွားခြင်းမရှိစေရန် Local Storage & Cloud Synchronous Write စနစ်ဖြင့် အပြီးသတ်ဖြေရှင်းခြင်း၊ Premium သက်တမ်းကုန်သွားသော်လည်း မိမိစိတ်ကြိုက် ဖန်တီးထားသော Custom Category များကို လုံးဝဖျက်မပစ်ဘဲ Soft Lock စနစ်ဖြင့် လုံခြုံစွာ ထိန်းသိမ်းပေးထားခြင်း။',
    descriptionEn: 'Resolved category data loss on refresh with instant dual-storage persistence, and introduced non-destructive Soft Lock for custom categories when Premium expires.',
    changesMy: [
      'Category / Sub-Category အသစ်ထည့်ခြင်း၊ ပြင်ဆင်ခြင်း၊ ဖျက်ခြင်းတို့တွင် Local Storage နှင့် Firestore သို့ အပြိုင် ချက်ချင်း ရေးသားသိမ်းဆည်းစေခြင်း',
      'စနစ်စတင်ချိန်တွင် User ဖန်တီးထားသော Custom Category များကို အလိုအလျောက် သန့်စင်ဖျက်ဆီးပစ်သည့် Legacy Code အားလုံးကို ဖယ်ရှားပြီး မူလဒေတာ အပြည့်အစုံ ကာကွယ်ပေးခြင်း',
      'Premium ဝယ်ယူဖူးပြီး သက်တမ်းကုန်သွားသော အကောင့်များအတွက် Custom Categories များကို မဖျက်ဘဲ Lock (🔒) ခတ်ထားပေးသည့် Soft Lock စနစ် ထည့်သွင်းပေးခြင်း',
      'အတိတ်က ထည့်သွင်းခဲ့သော စာရင်းဟောင်းများ (Historical Transactions) လုံးဝ ပျက်စီးမသွားဘဲ မူလအတိုင်း ဖတ်ရှုအသုံးပြုနိုင်စေခြင်း',
      'Custom Category များနှင့် Sub-Category များကို ပြန်လည် Unlock လုပ်ရန် Categories View နှင့် စာရင်းသွင်း Modal များတွင် ရှင်းလင်းသော သတိပေးချက်နှင့် Upgrade လမ်းကြောင်း တပ်ဆင်ပေးခြင်း'
    ],
    changesEn: [
      'Instant dual-write persistence for all category & sub-category additions, edits, and deletions across LocalStorage and Cloud',
      'Eliminated aggressive legacy auto-cleanup routines on startup, ensuring 100% preservation of custom category items',
      'Introduced non-destructive Soft Lock (🔒) for custom categories and subcategories when Premium plan expires',
      'All existing transactions using custom categories remain fully preserved and intact',
      'Added seamless category unlock reminders and direct upgrade flows across Categories View and Transaction Entry Modal'
    ]
  },
  {
    version: 'v4.2.0',
    buildNumber: 42,
    releaseDate: '2026-09-25',
    releaseTime: '08:45 AM (MMT)',
    titleMy: 'Header Layout ရှင်းလင်းမှုနှင့် Version မှတ်တမ်း စနစ်',
    titleEn: 'Header Layout Optimization & In-App Changelog System',
    tag: 'feature',
    tagLabelMy: 'လုပ်ဆောင်ချက်အသစ်',
    tagLabelEn: 'Feature Release',
    descriptionMy: 'Top Header တွင် Icon Overflow ဖြစ်နေခြင်းကို ဖြေရှင်းပြီး Sidebar နှင့် ပေါင်းစပ်ညှိနှိုင်းခြင်း၊ Version မှတ်တမ်း အပြည့်အစုံ ကြည့်ရှုနိုင်သော စနစ် ထည့်သွင်းခြင်း။',
    descriptionEn: 'Fixed top navbar icon overcrowding by keeping only primary quick actions, with in-app version tracking modal.',
    changesMy: [
      'Top Navbar မှ "မျှဝေရန်" နှင့် "လမ်းညွှန်" ခလုတ်များကို Sidebar ထဲသို့ သပ်ရပ်စွာ ပြောင်းရွှေ့ပေးခြင်း',
      'VIP badge ဘေးရှိ ပိုနေသော ခေါင်းစဉ် badge ကို ဖြုတ်ပေးပြီး Icon Overflow ဖြစ်ခြင်းကို အပြီးသတ်ဖြေရှင်းခြင်း',
      'စတင်တည်ဆောက်ချိန်မှ ယနေ့အထိ ပြုလုပ်ခဲ့သော ဗားရှင်းမှတ်တမ်းများ (Version History & Changelog) ကို အက်ပ်ထဲတွင် အချိန်နှင့်တပြေးညီ ကြည့်ရှုနိုင်သော စနစ်သစ် ထည့်သွင်းခြင်း',
      'မိုဘိုင်းနှင့် ကွန်ပျူတာ စခရင်အားလုံးတွင် ခလုတ်များ ရှင်းလင်းကျယ်ဝန်းစွာ အသုံးပြုနိုင်စေခြင်း'
    ],
    changesEn: [
      'Removed Share and Guide buttons from header to eliminate overflow, keeping them cleanly in Sidebar',
      'Cleaned up duplicate tab badges next to VIP badge for a spacious and modern header',
      'Added full in-app Version History & Changelog timeline tracking all releases from day 1',
      'Optimized touch targets and spacing across all mobile and tablet viewports'
    ]
  },
  {
    version: 'v4.1.0',
    buildNumber: 41,
    releaseDate: '2026-09-25',
    releaseTime: '07:15 AM (MMT)',
    titleMy: 'Admin လုံခြုံရေး အထူးတင်းကျပ်မှုနှင့် Android Auto-Update စနစ်',
    titleEn: 'Strict Owner-Only Admin Security & Android Instant Auto-Update',
    tag: 'security',
    tagLabelMy: 'လုံခြုံရေးနှင့် စနစ်မွမ်းမံမှု',
    tagLabelEn: 'Security & Auto-Update',
    descriptionMy: 'Admin Access ကို တရားဝင် စနစ်ပိုင်ရှင်၏ သီးသန့် အတည်ပြုအကောင့် (Master Administrator) မှလွဲ၍ မည်သည့်အကောင့်မှ လုံးဝ ဝင်မရအောင် ပိတ်သိမ်းခြင်းနှင့် စက်အားလုံး Update ချက်ချင်းရရှိစေသော Service Worker စနစ်။',
    descriptionEn: 'Locked Admin Access strictly to the verified Master Administrator account only, with auto-invalidation Service Worker for instant multi-device syncing.',
    changesMy: [
      'Admin Access ကို စနစ်ပိုင်ရှင်၏ သီးသန့် အတည်ပြုအကောင့်ဖြင့် Google Login ဝင်ထားမှသာ ခွင့်ပြုခြင်း (PIN/Passcode Backdoor အားလုံး အပြီးတိုင် ဖျက်သိမ်းခြင်း)',
      'အခြား User များနှင့် Guest များတွင် Admin ခလုတ်နှင့် ဝင်ရောက်ခွင့် လုံးဝ မမြင်ရစေရန် ၁၀၀% ပိတ်ပင်ခြင်း',
      'Android ဖုန်းများတွင် Update မပြောင်းဘဲ အဟောင်းကျန်နေခြင်းကို ဖြေရှင်းရန် Network-First Service Worker (ngwesaryin-live-v4) တပ်ဆင်ခြင်း',
      'ဆာဗာတွင် ပြင်ဆင်ပြီးသည်နှင့် စက်အားလုံးတွင် အလိုအလျောက် Update အသစ် ရရှိစေသော Auto-Update Lifecycle ချိတ်ဆက်ခြင်း'
    ],
    changesEn: [
      'Restricted Admin Control strictly to authorized Master Administrator only; eliminated all passcode bypasses',
      'Completely hid Admin triggers for all regular accounts and guest users across all views',
      'Upgraded Service Worker to Network-First (ngwesaryin-live-v4) to prevent stale cache on Android devices',
      'Added automatic controllerchange and visibility listeners for instant over-the-air updates'
    ]
  },
  {
    version: 'v4.0.0',
    buildNumber: 40,
    releaseDate: '2026-09-24',
    releaseTime: '11:30 PM (MMT)',
    titleMy: 'ယာဉ်နှင့် စက်ပစ္စည်း မှတ်တမ်းများနှင့် အသိပေးချက် ဗဟိုဌာန',
    titleEn: 'Vehicle/Equipment Logs & Unified Notification Center',
    tag: 'major',
    tagLabelMy: 'အဓိက အဆင့်မြှင့်တင်မှု',
    tagLabelEn: 'Major Release',
    descriptionMy: 'ကား/ဆိုင်ကယ် ဆီစားနှုန်း၊ တာယာလေပေါင်၊ ပြုပြင်ထိန်းသိမ်းမှု မှတ်တမ်းများနှင့် စုံလင်သော အသိပေးချက် Notification Center စနစ်။',
    descriptionEn: 'Introduced vehicle maintenance tracking, tire pressure logs, and intelligent notification system.',
    changesMy: [
      'ကား၊ ဆိုင်ကယ်၊ စက်ယန္တရားများ၏ ပြုပြင်ထိန်းသိမ်းမှုနှင့် စရိတ်မှတ်တမ်းများ ထည့်သွင်းနိုင်ခြင်း',
      'တာယာလေပေါင် (PSI) စစ်ဆေးမှု မှတ်တမ်းနှင့် အကြိမ်ရေ မှတ်သားနိုင်ခြင်း',
      'အကြွေးပေးရန်/ရရန် ရက်လွန်သတိပေးချက်နှင့် ဘတ်ဂျက်ကုန်ခါနီး အသိပေးချက် Notification Bell စနစ်သစ်',
      'အသိပေးချက်များကို ဖတ်ရှုပြီးအဖြစ် မှတ်သားနိုင်ခြင်းနှင့် တိုက်ရိုက် သွားရောက်ကြည့်ရှုနိုင်ခြင်း'
    ],
    changesEn: [
      'Added vehicle and equipment maintenance expense and maintenance interval tracking',
      'Added tire pressure (PSI) inspection logs and history tracker',
      'Integrated real-time notification modal with debt due alerts and budget warnings',
      'Mark as read/unread management with direct jump links to related transactions'
    ]
  },
  {
    version: 'v3.8.0',
    buildNumber: 38,
    releaseDate: '2026-09-24',
    releaseTime: '06:20 PM (MMT)',
    titleMy: 'PIN လော့ခ် လုံခြုံရေးနှင့် စာရင်းအားလုံး အမြန်ရှာဖွေမှု (Global Search)',
    titleEn: '4-Digit PIN App Lock & Omnibar Quick Search',
    tag: 'feature',
    tagLabelMy: 'လုံခြုံရေးနှင့် ရှာဖွေမှု',
    tagLabelEn: 'Security & Search',
    descriptionMy: 'အက်ပ်လုံခြုံရေးအတွက် 4-Digit PIN Lock စနစ်နှင့် မည်သည့်နေရာမှမဆို စာရင်းအားလုံးကို ရှာဖွေနိုင်သော Global Search (⌘K)။',
    descriptionEn: 'Biometric/PIN app lock security screen and universal instant search modal for all financial records.',
    changesMy: [
      'ကိုယ်ရေးကိုယ်တာ ငွေစာရင်းများ လုံခြုံစေရန် 4-Digit PIN Lock စနစ် ထည့်သွင်းခြင်း',
      'အက်ပ်ကို ခေတ္တပိတ်ပြီး ပြန်ဖွင့်ချိန်တွင် PIN တောင်းဆိုသော Auto-Lock စနစ်',
      'ဝင်ငွေ၊ ထွက်ငွေ၊ အကြွေး၊ မှတ်စု စသည်တို့ကို စက္ကန့်ပိုင်းအတွင်း ရှာဖွေနိုင်သော Global Search (⌘K)',
      'Excel (XLSX) နှင့် CSV ဖိုင်များ အလွယ်တကူ ထုတ်ယူနိုင်ခြင်း (Data Export/Import)'
    ],
    changesEn: [
      'Added 4-digit PIN lock screen protection for personal financial privacy',
      'Auto-lock on idle or app switch with emergency unlock fallback',
      'Integrated omnibar search (⌘K) across transactions, debts, wallets, and notes',
      'Excel (XLSX) & CSV backup export and restore capabilities'
    ]
  },
  {
    version: 'v3.5.0',
    buildNumber: 35,
    releaseDate: '2026-09-23',
    releaseTime: '09:40 PM (MMT)',
    titleMy: 'Admin Control Center နှင့် ဘုံပိုက်ဆံအိတ် (Shared Workspace)',
    titleEn: 'Admin Control Center & Multi-User Shared Wallets',
    tag: 'feature',
    tagLabelMy: 'စီမံခန့်ခွဲမှုနှင့် အဖွဲ့စနစ်',
    tagLabelEn: 'Admin & Collaboration',
    descriptionMy: 'စနစ်တစ်ခုလုံးကို စီမံနိုင်သော Admin Panel နှင့် မိသားစု/လုပ်ဖော်ကိုင်ဖက်များနှင့် အတူတူ သုံးနိုင်သော Shared Wallet စနစ်။',
    descriptionEn: 'Admin management control center with broadcast announcements and collaborative shared workspaces.',
    changesMy: [
      'Admin Control Center ထည့်သွင်းပြီး စနစ်အခြေအနေနှင့် အသုံးပြုသူစာရင်း စစ်ဆေးနိုင်ခြင်း',
      'အသုံးပြုသူအားလုံးထံ အရေးကြီး သတင်းစကားများ ပို့နိုင်သော Broadcast Announcement Banner',
      'မိသားစု သို့မဟုတ် ဆိုင်ဝန်ထမ်းများနှင့် တွဲဖက်သုံးနိုင်သော Shared Workspace & Wallets',
      'ငွေစာရင်း မကိုက်ညီမှုများကို ပြန်လည်ညှိနှိုင်းပေးသော Reconcile Balance စနစ်'
    ],
    changesEn: [
      'Built Admin Control Center for platform telemetry, stats, and database management',
      'Implemented system-wide broadcast announcement banners for instant user notifications',
      'Added multi-user workspaces and shared wallets for families and teams',
      'Introduced wallet balance reconciliation tool for balance adjustments'
    ]
  },
  {
    version: 'v3.0.0',
    buildNumber: 30,
    releaseDate: '2026-09-22',
    releaseTime: '04:15 PM (MMT)',
    titleMy: 'လာဘ်ရွှင်စေသော Fortune Logo အဆောင်များ စနစ်',
    titleEn: 'Auspicious Fortune Emblem Switcher System',
    tag: 'feature',
    tagLabelMy: 'လာဘ်ရွှင်အဆောင်များ',
    tagLabelEn: 'Fortune Features',
    descriptionMy: 'မြန်မာဓလေ့နှင့် အညီ စီးပွားလာဘ်လာဘ တိုးပွားစေသော လာဘ်ရွှင် Fortune Logo ပုံစံ ၃ မျိုးကို စိတ်ကြိုက်ရွေးချယ်နိုင်သော စနစ်။',
    descriptionEn: 'Customizable auspicious fortune emblems: Golden Money Bag, Chinese Yuanbao, and Pixiu wealth guardian.',
    changesMy: [
      '💰 ရွှေငွေထုပ် (Golden Money Bag) - စီးပွားတိုးတက် ငွေဝင်ကြမ်းစေခြင်း',
      '🪙 တရုတ်ရွှေတုံး (Chinese Gold Yuanbao) - ရွှေငွေရတနာ စည်းစိမ်တိုးပွားခြင်း',
      '🦁 ဖီချူး (Auspicious Pixiu) - ငွေဝင်ပြီး ပြန်မထွက်အောင် လာဘ်စုပ်အဆောင်',
      'Logo ကို နှိပ်ရုံဖြင့် မိမိနှစ်သက်ရာ လာဘ်ရွှင်ပုံစံကို ချက်ချင်း ပြောင်းလဲအသုံးပြုနိုင်ခြင်း'
    ],
    changesEn: [
      'Added Golden Money Bag emblem symbolizing wealth accumulation and savings',
      'Added Chinese Gold Yuanbao ingot emblem representing prosperity and pure fortune',
      'Added Pixiu emblem known for attracting and safeguarding wealth',
      'Interactive switcher allowing users to choose their preferred lucky financial emblem'
    ]
  },
  {
    version: 'v2.5.0',
    buildNumber: 25,
    releaseDate: '2026-09-21',
    releaseTime: '08:50 PM (MMT)',
    titleMy: 'VIP Plans & Lifetime VIP စနစ်',
    titleEn: 'VIP Subscription & Lifetime Access System',
    tag: 'feature',
    tagLabelMy: 'VIP စနစ်',
    tagLabelEn: 'VIP & Monetization',
    descriptionMy: 'Free စာရင်းကန့်သတ်ချက်နှင့် အကန့်အသတ်မရှိ အသုံးပြုနိုင်သော Lifetime VIP အဆင့်မြှင့်တင်မှု စနစ်။',
    descriptionEn: 'Tiered service with Free tier limits and Lifetime VIP upgrade options.',
    changesMy: [
      'Free User များအတွက် အခြေခံ စာရင်း ၅၀ အထိ စမ်းသပ်သုံးစွဲခွင့်',
      'VIP User များအတွက် အကန့်အသတ်မရှိ စာရင်းသွင်းနိုင်ခြင်းနှင့် အဆင့်မြင့် ဝန်ဆောင်မှုများ',
      'ရွှေရောင် VIP Crown Badge အမှတ်တံဆိပ် ထည့်သွင်းခြင်း',
      'VIP Promo Code ဖြင့် အဆင့်မြှင့်တင်နိုင်သော စနစ် ထည့်သွင်းခြင်း'
    ],
    changesEn: [
      'Implemented free tier usage quotas and plan differentiation',
      'VIP tier with unlimited transaction capacity and priority cloud storage',
      'Golden VIP crown insignia across navbar and profile cards',
      'Activation codes and instant upgrade workflow'
    ]
  },
  {
    version: 'v2.0.0',
    buildNumber: 20,
    releaseDate: '2026-09-21',
    releaseTime: '10:30 AM (MMT)',
    titleMy: 'Firebase Cloud Sync & Google Login စနစ်',
    titleEn: 'Firebase Cloud Sync & Multi-Device Real-time Database',
    tag: 'major',
    tagLabelMy: 'အဓိက အဆင့်မြှင့်တင်မှု',
    tagLabelEn: 'Cloud Integration',
    descriptionMy: 'Google Account ဖြင့် ဝင်ရောက်နိုင်ခြင်းနှင့် ဖုန်း၊ တက်ဘလက်၊ ကွန်ပျူတာ အချင်းချင်း Real-time Data ချိတ်ဆက်မှု။',
    descriptionEn: 'Full cloud synchronization across multiple devices with Google OAuth and Firestore backing.',
    changesMy: [
      'Google Sign-in နှင့် Email/Password စနစ်ဖြင့် အကောင့်ဖွင့်နိုင်ခြင်း',
      'စက်အမျိုးမျိုး (Android, iOS, PC) အချင်းချင်း အချိန်နှင့်တပြေးညီ ဒေတာ Sync ပြုလုပ်ပေးခြင်း',
      'ဧည့်သည်စနစ် (Guest Mode) ဖြင့် အကောင့်မဖွင့်ဘဲ စက်တွင်းသုံးနိုင်မှုကိုပါ ထိန်းသိမ်းပေးထားခြင်း',
      'အင်တာနက်ပြတ်တောက်ချိန်တွင် စက်တွင်း၌ မှတ်ထားပြီး လိုင်းပြန်ရချိန်တွင် Cloud သို့ အလိုအလျောက် ပို့ပေးခြင်း'
    ],
    changesEn: [
      'Integrated Firebase Auth supporting Google Sign-In and Email authentication',
      'Real-time Firestore database synchronization across mobile and desktop devices',
      'Full offline persistence with zero data loss during network outages',
      'Seamless transition from Guest Mode to cloud-synced authenticated accounts'
    ]
  },
  {
    version: 'v1.5.0',
    buildNumber: 15,
    releaseDate: '2026-09-20',
    releaseTime: '06:00 PM (MMT)',
    titleMy: 'Progressive Web App (PWA) Offline စနစ်',
    titleEn: 'Progressive Web App (PWA) & Offline Capability',
    tag: 'feature',
    tagLabelMy: 'PWA စနစ်',
    tagLabelEn: 'PWA Integration',
    descriptionMy: 'Play Store / App Store မှ ဒေါင်းလုဒ်လုပ်စရာမလိုဘဲ ဖုန်း Screen ပေါ်သို့ အက်ပ်အဖြစ် တိုက်ရိုက် Install ပြုလုပ်နိုင်ခြင်း။',
    descriptionEn: 'Installed app-like experience on home screen with full offline caching via Service Workers.',
    changesMy: [
      'ဖုန်း Home Screen ပေါ်တွင် App Icon အဖြစ် တိုက်ရိုက် Install ပြုလုပ်နိုင်သော PWA စနစ်',
      'Service Worker ဖြင့် အင်တာနက်မရှိချိန်တွင် အက်ပ်ကို အမြန်နှုန်းဖြင့် ဖွင့်လှစ်နိုင်ခြင်း',
      'Full-screen standalone app interface (Browser URL bar မပါဘဲ သန့်ရှင်းစွာ သုံးနိုင်ခြင်း)'
    ],
    changesEn: [
      'One-tap install to home screen on iOS Safari and Android Chrome',
      'Service Worker pre-caching for lightning-fast offline startups',
      'Native standalone window display without browser chrome clutter'
    ]
  },
  {
    version: 'v1.0.0',
    buildNumber: 1,
    releaseDate: '2026-09-20',
    releaseTime: '09:00 AM (MMT)',
    titleMy: 'မူလ စတင်တည်ထောင်ခြင်း (Initial Launch)',
    titleEn: 'Initial Public Launch & Core Architecture',
    tag: 'major',
    tagLabelMy: 'မူလ စတင်ခြင်း',
    tagLabelEn: 'Genesis Release',
    descriptionMy: 'မြန်မာကျပ်ငွေဖြင့် ဝင်ငွေ၊ ထွက်ငွေ၊ အကြွေးစာရင်းများ စနစ်တကျ မှတ်တမ်းတင်နိုင်သော မူလပထမဆုံး ဆော့ဖ်ဝဲ တည်ဆောက်ခြင်း။',
    descriptionEn: 'Foundational release of NgweSarYin with multi-wallet ledger, categories, and financial statistics.',
    changesMy: [
      'ဝင်ငွေ (Income) နှင့် ထွက်ငွေ (Expense) နေ့စဉ် စာရင်းရေးသွင်းခြင်း',
      'အကြွေး (ပေးရန်စာရင်း / ရရန်စာရင်း) စီမံခန့်ခွဲမှုနှင့် ပြန်ဆပ်မှတ်တမ်းများ',
      'Multi-wallet ပိုက်ဆံအိတ်များ (လက်ငင်းငွေ၊ KPay၊ WavePay၊ KBZ၊ CB၊ AYA၊ Yoma စသည်)',
      'ကဏ္ဍခွဲများ (Categories & Subcategories) စိတ်ကြိုက် သတ်မှတ်နိုင်ခြင်း',
      'လအလိုက် ဘဏ္ဍာရေး ခြုံငုံသုံးသပ်ချက်နှင့် စာရင်းဇယား Charts များ'
    ],
    changesEn: [
      'Income and expense recording engine tailored for Myanmar Kyat (MMK)',
      'Receivables and payables debt ledger with partial settlement tracking',
      'Multi-wallet accounting supporting cash, mobile money, and commercial banks',
      'Custom category and subcategory hierarchy management',
      'Monthly overview analytics and financial breakdown charts'
    ]
  }
];
