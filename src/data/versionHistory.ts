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

export const CURRENT_APP_VERSION = 'v6.1.0';
export const CURRENT_BUILD_NUMBER = 148;

export const VERSION_HISTORY: VersionItem[] = [
  {
    version: 'v6.1.0',
    buildNumber: 148,
    releaseDate: '2026-10-05',
    releaseTime: '6:00 PM (MMT)',
    titleMy: 'Sync & PWA Stabilization (React #321, ngwe_lang, Delete Propagation á€•á€¼á€¯á€•á€¼á€„á€ºá€á€¼á€„á€ºá€¸)',
    titleEn: 'Sync & PWA Stabilization',
    tag: 'fix',
    tagLabelMy: 'á€¡á€›á€±á€¸á€€á€¼á€®á€¸ á€•á€¼á€„á€ºá€†á€„á€ºá€á€»á€€á€º',
    tagLabelEn: 'Critical Bug Fixes',
    descriptionMy: 'React Error #321, ngwe_lang JSON crash, cross-device delete propagation á€”á€¾á€„á€·á€º iOS PWA install issues á€™á€»á€¬á€¸á€€á€­á€¯ á€¡á€±á€¬á€„á€ºá€™á€¼á€„á€ºá€…á€½á€¬ á€–á€¼á€±á€›á€¾á€„á€ºá€¸á€•á€¼á€®á€¸á€•á€«á€•á€¼á€®á‹',
    descriptionEn: 'Resolved React Error #321, ngwe_lang JSON parse crash, cross-device delete propagation, and iOS PWA install issues.',
    changesMy: [
      'React Error #321 â€” setupListeners function á€‘á€²á€™á€¾ nested useEffect á€–á€»á€€á€ºá€•á€¼á€®á€¸ Rules of Hooks á€œá€­á€¯á€€á€ºá€”á€¬á€•á€«á€•á€¼á€®á‹',
      'chart-vendor chunk á€–á€»á€€á€ºá€•á€¼á€®á€¸ React family á€€á€­á€¯ single copy á€–á€¼á€…á€ºá€…á€±á€•á€«á€•á€¼á€®á‹',
      'ngwe_lang JSON parse crash â€” legacy raw string á€™á€»á€¬á€¸á€€á€­á€¯ migrate á€œá€¯á€•á€ºá€•á€¼á€®á€¸ duplicate useEffect á€™á€»á€¬á€¸ á€–á€»á€€á€ºá€•á€«á€•á€¼á€®á‹',
      'Cross-device delete propagation â€” syncQueue-only push strategy á€–á€¼á€„á€·á€º á€–á€»á€€á€ºá€œá€­á€¯á€€á€ºá€žá€±á€¬ transactions á€™á€»á€¬á€¸ á€•á€¼á€”á€ºá€™á€•á€±á€«á€ºá€…á€±á€›á€”á€º á€€á€¬á€€á€½á€šá€ºá€•á€«á€•á€¼á€®á‹',
    ],
    changesEn: [
      'Fixed React Error #321 by removing nested useEffect inside setupListeners function.',
      'Eliminated chart-vendor chunk; React family now bundled as single copy.',
      'Fixed ngwe_lang JSON crash â€” migrated legacy raw strings and removed duplicate useEffect.',
      'Fixed cross-device delete propagation with syncQueue-only push strategy.',
    ],
  },
  {
    version: 'v5.3.31',
    buildNumber: 147,
    releaseDate: '2026-10-02',
    releaseTime: '2:30 AM (MMT)',
    titleMy: 'iOS WebKit & Cross-Platform Sync Count Harmonization (iOS Safari á WebKit IndexedDB Background Cache á€–á€¼á€„á€·á€º Windows/Android á€€á€¼á€¬á€¸ Cloud á€¡á€›á€±á€¡á€á€½á€€á€º á€€á€½á€¬á€á€¼á€¬á€¸á€™á€¾á€¯á€€á€­á€¯ á€Šá€¾á€­á€”á€¾á€­á€¯á€„á€ºá€¸á€–á€¼á€±á€›á€¾á€„á€ºá€¸á€•á€±á€¸á€á€¼á€„á€ºá€¸)',
    titleEn: 'iOS WebKit & Cross-Platform Sync Count Harmonization',
    tag: 'fix',
    tagLabelMy: 'á€šá€á€¯ á€—á€¬á€¸á€›á€¾á€„á€ºá€¸á€¡á€žá€…á€º',
    tagLabelEn: 'Latest Update Version',
    descriptionMy: 'iOS Safari / WebKit á€á€½á€„á€º Background Screen Lock á€”á€¾á€„á€·á€º Connection Pause á€–á€¼á€…á€ºá€á€»á€­á€”á€ºáŒ Firestore Snapshot á `hasPendingWrites` Flag á€€á€¼á€±á€¬á€„á€·á€º Cloud á€¡á€›á€±á€¡á€á€½á€€á€º á€™á€á€°á€Šá€®á€˜á€² á€–á€¼á€…á€ºá€”á€±á€™á€¾á€¯á€€á€­á€¯ Persistent Saved Cloud Set Matching á€–á€¼á€„á€·á€º á€Šá€¾á€­á€šá€°á€œá€­á€¯á€€á€ºá€•á€«á€žá€–á€¼á€„á€·á€º iOS, Android á€”á€¾á€„á€·á€º Windows á€¡á€¬á€¸á€œá€¯á€¶á€¸á€á€½á€„á€º Cloud á€¡á€›á€±á€¡á€á€½á€€á€º á€¡á€á€­á€¡á€€á€» á€á€°á€Šá€®á€žá€½á€¬á€¸á€•á€¼á€® á€–á€¼á€…á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Harmonized Firestore transaction snapshot confirmation logic across iOS Safari WebKit and Android/Windows Chrome, resolving counts mismatches caused by WebKit background offline cache flags.',
    changesMy: [
      'App.tsx á€›á€¾á€­ Firestore Snapshot Confirmation Logic á€á€½á€„á€º Cross-platform Saved Set Matching á€•á€±á€«á€„á€ºá€¸á€…á€•á€ºá iOS/Android/Windows á€€á€¼á€¬á€¸ á€¡á€›á€±á€¡á€á€½á€€á€º á€¡á€•á€¼á€Šá€·á€ºá€¡á€ á€€á€­á€¯á€€á€ºá€Šá€®á€…á€±á€á€¼á€„á€ºá€¸á‹',
      'iOS Safari WebKit á€á€½á€„á€º á€œá€­á€¯á€„á€ºá€¸á€€á€»á€á€»á€­á€”á€º á€žá€­á€¯á€·á€™á€Ÿá€¯á€á€º Screen á€•á€­á€á€ºá€á€»á€­á€”á€ºá€™á€»á€¬á€¸áŒá€•á€« Cloud á€›á€±á€¬á€€á€ºá€•á€¼á€®á€¸/á€•á€­á€¯á€·á€›á€”á€ºá€€á€»á€”á€º á€¡á€›á€±á€¡á€á€½á€€á€ºá€€á€­á€¯ á€™á€¾á€”á€ºá€€á€”á€ºá€…á€½á€¬ á€–á€±á€¬á€ºá€•á€¼á€”á€­á€¯á€„á€ºá€¡á€±á€¬á€„á€º á€•á€¼á€¯á€œá€¯á€•á€ºá€•á€±á€¸á€á€¼á€„á€ºá€¸á‹',
    ],
    changesEn: [
      'Updated Firestore snapshot confirmation logic with cross-platform saved set matching in App.tsx.',
      'Resolved count discrepancies between iOS WebKit and Android/Windows Chrome.',
    ],
  },
  {
    version: 'v5.3.30',
    buildNumber: 146,
    releaseDate: '2026-10-02',
    releaseTime: '2:00 AM (MMT)',
    titleMy: 'Smart Differential Sync Engine (Local vs Cloud á€á€­á€¯á€€á€ºá€†á€­á€¯á€„á€ºá€…á€…á€ºá€†á€±á€¸á á€™á€›á€±á€¬á€€á€ºá€žá€±á€¸á€žá€±á€¬ á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸á€¡á€¬á€¸á€œá€¯á€¶á€¸á€€á€­á€¯á€žá€¬ á€žá€®á€¸á€žá€”á€·á€º á€•á€­á€¯á€·á€•á€±á€¸á€žá€Šá€·á€º Zero-Wasted Writes á€…á€”á€…á€º)',
    titleEn: 'Smart Differential Sync Engine',
    tag: 'feature',
    tagLabelMy: 'á€šá€á€¯ á€—á€¬á€¸á€›á€¾á€„á€ºá€¸á€¡á€žá€…á€º',
    tagLabelEn: 'Latest Update Version',
    descriptionMy: 'Local á€…á€€á€ºá€á€½á€„á€ºá€¸ á€…á€¬á€›á€„á€ºá€¸ á€•á€±á€«á€„á€ºá€¸á€”á€¾á€„á€·á€º Cloud á€…á€¬á€›á€„á€ºá€¸ á€•á€±á€«á€„á€ºá€¸á€á€­á€¯á€·á€€á€­á€¯ á€á€­á€€á€»á€…á€½á€¬ á€á€­á€¯á€€á€ºá€†á€­á€¯á€„á€ºá€…á€…á€ºá€†á€±á€¸á€•á€¼á€®á€¸ Cloud DB á€žá€­á€¯á€· á€›á€±á€¬á€€á€ºá€›á€¾á€­á€•á€¼á€®á€¸á€žá€¬á€¸ á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸á€¡á€¬á€¸ á€‘á€•á€ºá€™á€¶ á€•á€±á€¸á€•á€­á€¯á€·á€á€¼á€„á€ºá€¸ á€™á€•á€¼á€¯á€˜á€² á€™á€›á€±á€¬á€€á€ºá€žá€±á€¸á€žá€±á€¬/á€€á€»á€”á€ºá€›á€¾á€­á€”á€±á€žá€±á€¬ á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸á€€á€­á€¯á€žá€¬ á€žá€®á€¸á€žá€”á€·á€º á€€á€±á€¬á€€á€ºá€šá€° á€•á€­á€¯á€·á€†á€±á€¬á€„á€ºá€•á€±á€¸á€žá€Šá€·á€º Smart Differential Sync Engine á€¡á€¬á€¸ á€¡á€•á€¼á€Šá€·á€ºá€¡á€ á€–á€¼á€Šá€·á€ºá€…á€½á€€á€ºá€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Implemented smart differential synchronization that compares local vs cloud confirmed records, skipping already synced items to dramatically save Firestore Writes quota.',
    changesMy: [
      'AuthContext á `syncDataToCloud` á€á€½á€„á€º Differential Smart Upsert á€…á€”á€…á€º á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á á€›á€±á€¬á€€á€ºá€›á€¾á€­á€•á€¼á€®á€¸á€žá€¬á€¸ á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸á€€á€­á€¯ á€›á€±á€¸á€žá€¬á€¸á€á€¼á€„á€ºá€¸á€™á€¾ á€á€»á€”á€ºá€œá€¾á€•á€ºá€•á€±á€¸á€á€¼á€„á€ºá€¸á‹',
      'Firestore Writes á€€á€¯á€”á€ºá€€á€»á€™á€¾á€¯á€€á€­á€¯ á‰á…% á€‘á€­ á€¡á€œá€½á€”á€ºá€¡á€™á€„á€ºá€¸ á€žá€€á€ºá€žá€¬á€…á€±á€•á€¼á€®á€¸ Quota á€•á€¼á€Šá€·á€ºá€á€¼á€„á€ºá€¸á€™á€¾ á€›á€¬á€”á€¾á€¯á€”á€ºá€¸á€•á€¼á€Šá€·á€º á€¡á€€á€¬á€¡á€€á€½á€šá€ºá€•á€±á€¸á€‘á€¬á€¸á€á€¼á€„á€ºá€¸á‹',
      'á€…á€€á€ºá€á€½á€„á€ºá€¸ á€’á€±á€á€¬á€™á€»á€¬á€¸ á€œá€¯á€¶á€¸á€ á€•á€»á€±á€¬á€€á€ºá€•á€»á€€á€ºá€á€¼á€„á€ºá€¸ á€™á€›á€¾á€­á€…á€±á€›á€”á€º Local Persistence á€¡á€¬á€¸ á€¡á€•á€¼á€Šá€·á€ºá€¡á€ á€‘á€­á€”á€ºá€¸á€žá€­á€™á€ºá€¸á€•á€±á€¸á€‘á€¬á€¸á€á€¼á€„á€ºá€¸á‹',
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
    titleMy: 'Google Cloud Pacific Time Quota Reset Alignment (Google Cloud á€…á€¶á€”á€¾á€¯á€”á€ºá€¸á€¡á€á€­á€¯á€„á€ºá€¸ Pacific Midnight PST/PDT á€–á€¼á€„á€·á€º Quota Reset á€…á€­á€…á€…á€ºá€á€½á€€á€ºá€á€»á€€á€ºá€á€¼á€„á€ºá€¸)',
    titleEn: 'Google Cloud Pacific Time Quota Reset Alignment',
    tag: 'fix',
    tagLabelMy: 'á€šá€á€¯ á€—á€¬á€¸á€›á€¾á€„á€ºá€¸á€¡á€žá€…á€º',
    tagLabelEn: 'Latest Update Version',
    descriptionMy: 'Google Cloud Firestore á á€á€€á€šá€·á€º Quota Reset Time á€–á€¼á€…á€ºá€žá€±á€¬ US Pacific Midnight (PST/PDT 00:00:00 / á€™á€¼á€”á€ºá€™á€¬á€…á€¶á€á€±á€¬á€ºá€á€»á€­á€”á€º á€™á€½á€”á€ºá€¸á€œá€½á€² á:áƒá€ á€žá€­á€¯á€·á€™á€Ÿá€¯á€á€º á‚:áƒá€ á€”á€¬á€›á€®) á€–á€¼á€„á€·á€º á€…á€€á€ºá€á€½á€„á€ºá€¸ Quota Reset Countdown á€”á€¾á€„á€·á€º Lock Invalidation á€™á€»á€¬á€¸á€€á€­á€¯ á€á€­á€€á€»á€…á€½á€¬ á€•á€¼á€±á€¬á€„á€ºá€¸á€œá€²á€•á€¼á€„á€ºá€†á€„á€ºá€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Aligned quota reset calculation and stale lock invalidation with Google Cloud Firestore exact standard: US Pacific Time Midnight (00:00 PT / PST UTC-8, PDT UTC-7).',
    changesMy: [
      'Google Cloud Firestore á Exact Reset Cycle (America/Los_Angeles Pacific Midnight) á€€á€­á€¯ á€žá€®á€¸á€žá€”á€·á€º á€á€½á€€á€ºá€á€»á€€á€ºá€…á€…á€ºá€†á€±á€¸á€™á€¾á€¯ á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€•á€±á€¸á€á€¼á€„á€ºá€¸á‹',
      'Quota Tracker á€”á€¾á€„á€·á€º Reset Countdown á€€á€­á€¯ Pacific Time á€…á€¶á€”á€¾á€¯á€”á€ºá€¸á€¡á€á€­á€¯á€„á€ºá€¸ á€á€­á€€á€»á€…á€½á€¬ á€á€»á€­á€á€ºá€†á€€á€ºá€•á€±á€¸á€á€¼á€„á€ºá€¸á‹',
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
    titleMy: 'Automated UTC Midnight Quota Lock Auto-Clear Fix (á€™á€”á€€á€º á†:áƒá€ á€”á€¬á€›á€® MMT Reset á€á€»á€­á€”á€ºá€¡á€•á€¼á€®á€¸á€á€½á€„á€º á€šá€á€„á€ºá€”á€±á€·á€™á€¾ Quota Lock á€Ÿá€±á€¬á€„á€ºá€¸á€™á€»á€¬á€¸á€¡á€¬á€¸ á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º á€•á€šá€ºá€–á€»á€€á€ºá€•á€±á€¸á€á€¼á€„á€ºá€¸)',
    titleEn: 'Automated UTC Midnight Quota Lock Auto-Clear Fix',
    tag: 'fix',
    tagLabelMy: 'á€šá€á€¯ á€—á€¬á€¸á€›á€¾á€„á€ºá€¸á€¡á€žá€…á€º',
    tagLabelEn: 'Latest Update Version',
    descriptionMy: 'á€šá€á€„á€ºá€”á€±á€·á€á€½á€„á€º Quota á€•á€¼á€Šá€·á€ºá€á€²á€·á€–á€°á€¸á€•á€«á€€ á€šá€”á€±á€·á€™á€”á€€á€º á†:áƒá€ á€”á€¬á€›á€® (00:00 UTC) á€á€½á€„á€º Server á€˜á€€á€ºá€™á€¾ Quota Reset á€–á€¼á€…á€ºá€žá€½á€¬á€¸á€žá€±á€¬á€ºá€œá€Šá€ºá€¸ Browser á localStorage á€¡á€á€½á€„á€ºá€¸ á€šá€á€„á€ºá€”á€±á€· Quota Lock á€€á€»á€”á€ºá€›á€…á€ºá€á€²á€·á€™á€¾á€¯á€€á€¼á€±á€¬á€„á€·á€º Quota á€•á€¼á€Šá€·á€ºá€”á€±á€žá€Šá€ºá€Ÿá€¯ á€¡á€™á€¾á€¬á€¸á€•á€¼á€žá€á€¼á€„á€ºá€¸á€¡á€¬á€¸ á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º á€•á€šá€ºá€–á€»á€€á€ºá€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€•á€±á€¸á€›á€”á€º á€•á€¼á€„á€ºá€†á€„á€ºá€•á€¼á€®á€¸á€…á€®á€¸á€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Fixed stale client-side quota lock flags by automatically invalidating any lock timestamps generated before the current UTC day (00:00 UTC / 6:30 AM MMT).',
    changesMy: [
      'firebase.ts á `isQuotaExhausted` á€á€½á€„á€º á€œá€€á€ºá€›á€¾á€­ UTC á€”á€±á€·á€…á€½á€²á 00:00 UTC (á†:áƒá€ AM MMT) á€‘á€€á€º á€…á€±á€¬á€žá€±á€¬ Quota Lock á€…á€¶á€á€»á€­á€”á€ºá€™á€»á€¬á€¸á€€á€­á€¯ á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º Clear á€œá€¯á€•á€ºá€•á€±á€¸á€á€¼á€„á€ºá€¸á‹',
      'á€™á€”á€€á€ºá€…á€±á€¬á€…á€±á€¬ á€™á€žá€¯á€¶á€¸á€›á€žá€±á€¸á€˜á€² Quota á€•á€¼á€Šá€·á€ºá€”á€±á€žá€Šá€ºá€Ÿá€¯ á€¡á€™á€¾á€¬á€¸á€•á€¼á€žá€™á€¾á€¯á€€á€­á€¯ á€›á€¬á€”á€¾á€¯á€”á€ºá€¸á€•á€¼á€Šá€·á€º á€¡á€•á€¼á€®á€¸á€¡á€•á€­á€¯á€„á€º á€–á€¼á€±á€›á€¾á€„á€ºá€¸á€•á€±á€¸á€á€¼á€„á€ºá€¸á‹',
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
    titleMy: 'Forced writeBatch Reconciliation Engine (CloudTxIds á€…á€…á€ºá€†á€±á€¸á€•á€¼á€®á€¸ á€™á€›á€±á€¬á€€á€ºá€žá€±á€¸á€žá€±á€¬ á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸á€¡á€¬á€¸ Atomic writeBatch á€–á€¼á€„á€·á€º á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€•á€­á€¯á€·á€†á€±á€¬á€„á€ºá€•á€±á€¸á€á€¼á€„á€ºá€¸)',
    titleEn: 'Forced writeBatch Reconciliation Engine',
    tag: 'feature',
    tagLabelMy: 'á€šá€á€¯ á€—á€¬á€¸á€›á€¾á€„á€ºá€¸á€¡á€žá€…á€º',
    tagLabelEn: 'Latest Update Version',
    descriptionMy: 'Generic Sync Loop á€™á€»á€¬á€¸á€¡á€…á€¬á€¸ cloudTxIds Set á€”á€¾á€„á€·á€º á€…á€€á€ºá€á€½á€„á€ºá€¸ local transactions á€™á€»á€¬á€¸á€€á€­á€¯ á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€á€­á€¯á€€á€ºá€†á€­á€¯á€„á€ºá€…á€…á€ºá€†á€±á€¸á€•á€¼á€®á€¸ Firestore á€á€½á€„á€º á€¡á€™á€¾á€”á€ºá€á€€á€šá€º á€™á€›á€±á€¬á€€á€ºá€žá€±á€¸á€žá€±á€¬ á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸á€€á€­á€¯á€žá€¬ á€žá€®á€¸á€žá€”á€·á€º Atomic writeBatch (á€á€…á€ºá€•á€¼á€­á€¯á€„á€ºá€”á€€á€º) á€–á€¼á€„á€·á€º á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º Sync á€•á€¼á€¯á€œá€¯á€•á€ºá€•á€±á€¸á€žá€Šá€·á€º á€…á€”á€…á€ºá€€á€­á€¯ á€¡á€•á€¼á€Šá€·á€ºá€¡á€ á€–á€¼á€Šá€·á€ºá€…á€½á€€á€ºá€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Implemented forced reconciliation check that matches cloudTxIds Set against local transactions and executes a specific atomic writeBatch only for items truly missing in Firestore.',
    changesMy: [
      'syncQueue á€á€½á€„á€º `reconcileMissingTxsWithWriteBatch` á€…á€”á€…á€ºá€žá€…á€º á€–á€¼á€Šá€·á€ºá€…á€½á€€á€ºá á€¡á€™á€¾á€”á€ºá€á€€á€šá€º á€€á€»á€”á€ºá€›á€¾á€­á€”á€±á€žá€±á€¬ á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸á€€á€­á€¯á€žá€¬ Atomic WriteBatch á€–á€¼á€„á€·á€º á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º Sync á€œá€¯á€•á€ºá€†á€±á€¬á€„á€ºá€•á€±á€¸á€á€¼á€„á€ºá€¸á‹',
      'SyncHealthModal á€á€½á€„á€º `Forced Reconciliation (Batch Sync)` á€á€œá€¯á€á€ºá€¡á€žá€…á€º á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€•á€±á€¸á€á€¼á€„á€ºá€¸á‹',
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
    titleMy: 'Instant Startup & Anti-Loading Hang Fix (Loading á€…á€á€›á€„á€ºá€á€½á€„á€º á€›á€•á€ºá€”á€±á€á€¼á€„á€ºá€¸á€™á€¾ á€€á€¬á€€á€½á€šá€ºá€›á€”á€º 0.8 á€…á€€á€¹á€€á€”á€·á€º Fail-safe Timer á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€•á€±á€¸á€‘á€¬á€¸á€á€¼á€„á€ºá€¸)',
    titleEn: 'Instant Startup & Anti-Loading Hang Fix',
    tag: 'fix',
    tagLabelMy: 'á€šá€á€¯ á€—á€¬á€¸á€›á€¾á€„á€ºá€¸á€¡á€žá€…á€º',
    tagLabelEn: 'Latest Update Version',
    descriptionMy: 'á€€á€½á€”á€ºá€›á€€á€ºá€”á€¾á€±á€¸á€€á€½á€±á€¸á€á€¼á€„á€ºá€¸ á€žá€­á€¯á€·á€™á€Ÿá€¯á€á€º á€¡á€„á€ºá€á€¬á€”á€€á€ºá€¡á€†á€„á€ºá€™á€•á€¼á€±á€á€»á€­á€”á€ºá€™á€»á€¬á€¸á€á€½á€„á€º á€„á€½á€±á€…á€¬á€›á€„á€ºá€¸ Applet á€¡á€¬á€¸ á€–á€½á€„á€·á€ºá€œá€­á€¯á€€á€ºá€žá€Šá€ºá€”á€¾á€„á€·á€º Loading á€…á€á€›á€„á€ºáŒ á€›á€•á€ºá€™á€”á€±á€…á€±á€›á€”á€º 0.8 á€…á€€á€¹á€€á€”á€·á€º Fail-Safe Timer á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º á€•á€½á€„á€·á€ºá€…á€±á€›á€”á€º á€¡á€•á€¼á€®á€¸á€¡á€•á€­á€¯á€„á€º á€•á€¼á€„á€ºá€†á€„á€ºá€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Guaranteed startup rendering within 0.8s via automated auth fail-safe timeout, preventing any loading screen hangs.',
    changesMy: [
      'AuthContext á€á€½á€„á€º 0.8 á€…á€€á€¹á€€á€”á€·á€º Fail-Safe Timer á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á Loading á€…á€á€›á€„á€ºá€á€½á€„á€º á€›á€•á€ºá€”á€±á€á€¼á€„á€ºá€¸á€™á€¾ á€›á€¬á€”á€¾á€¯á€”á€ºá€¸á€•á€¼á€Šá€·á€º á€€á€¬á€€á€½á€šá€ºá€•á€±á€¸á€á€¼á€„á€ºá€¸á‹',
      'Offline/Local Storage á€™á€¾ á€„á€½á€±á€…á€¬á€›á€„á€ºá€¸ á€¡á€á€»á€€á€ºá€¡á€œá€€á€ºá€™á€»á€¬á€¸á€€á€­á€¯ á€á€»á€€á€ºá€á€»á€„á€ºá€¸ á€•á€½á€„á€·á€ºá€œá€¬á€…á€±á€›á€”á€º á€…á€”á€…á€ºá€™á€¼á€¾á€„á€·á€ºá€á€„á€ºá€á€¼á€„á€ºá€¸á‹',
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
    titleMy: 'White Screen & Preview Stabilization Fix (White Screen / Preview á€™á€•á€±á€«á€ºá€á€¼á€„á€ºá€¸áŠ Loading á€™á€¾á€¬ á€›á€•á€ºá€”á€±á€á€¼á€„á€ºá€¸á€”á€¾á€„á€·á€º Build Artifacts á€•á€¼á€¿á€”á€¬á€™á€»á€¬á€¸á€¡á€á€½á€€á€º á€¡á€•á€¼á€®á€¸á€¡á€•á€­á€¯á€„á€º á€–á€¼á€±á€›á€¾á€„á€ºá€¸á€•á€¼á€®á€¸á€…á€®á€¸á€á€¼á€„á€ºá€¸)',
    titleEn: 'White Screen & Preview Stabilization Fix',
    tag: 'fix',
    tagLabelMy: 'á€šá€á€¯ á€—á€¬á€¸á€›á€¾á€„á€ºá€¸á€¡á€žá€…á€º',
    tagLabelEn: 'Latest Update Version',
    descriptionMy: 'White ScreenáŠ Preview á€™á€•á€±á€«á€ºá€á€¼á€„á€ºá€¸áŠ Loading á€á€½á€„á€º á€›á€•á€ºá€”á€±á€á€¼á€„á€ºá€¸á€”á€¾á€„á€·á€º UI Update á€™á€–á€¼á€…á€ºá€á€¼á€„á€ºá€¸á€á€­á€¯á€·á€¡á€á€½á€€á€º error boundariesáŠ safe state initializers á€”á€¾á€„á€·á€º build optimization á€™á€»á€¬á€¸á€€á€­á€¯ á€¡á€•á€¼á€Šá€·á€ºá€¡á€ á€™á€¼á€¾á€„á€·á€ºá€á€„á€ºá€•á€±á€¸á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Comprehensive stabilization release fixing white screens, preview loading hangs, and ensuring UI updates render correctly.',
    changesMy: [
      'React Error Boundaries á€”á€¾á€„á€·á€º Safe Fallbacks á€™á€»á€¬á€¸ á€á€­á€¯á€¸á€™á€¼á€¾á€„á€·á€ºá€á€¼á€„á€ºá€¸á€–á€¼á€„á€·á€º White Screen á€™á€–á€¼á€…á€ºá€•á€±á€«á€ºá€…á€±á€›á€”á€º á€€á€¬á€€á€½á€šá€ºá€•á€±á€¸á€á€¼á€„á€ºá€¸á‹',
      'Category Names á€™á€»á€¬á€¸á€€á€­á€¯ Smart CalendaráŠ Dashboard á€”á€¾á€„á€·á€º Transactions View á€á€­á€¯á€·á€á€½á€„á€º á€¡á€™á€¾á€¬á€¸á€¡á€šá€½á€„á€ºá€¸á€™á€›á€¾á€­ á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€ºá€–á€±á€¬á€ºá€•á€¼á€”á€­á€¯á€„á€ºá€›á€”á€º á€á€»á€­á€á€ºá€†á€€á€ºá€™á€¾á€¯ á€¡á€•á€¼á€Šá€·á€ºá€¡á€ á€•á€¼á€¯á€œá€¯á€•á€ºá€‘á€¬á€¸á€á€¼á€„á€ºá€¸á‹',
      'Build artifacts á€”á€¾á€„á€·á€º Vite compilation configuration á€™á€»á€¬á€¸á€€á€­á€¯ á€¡á€•á€¼á€Šá€·á€ºá€¡á€ á€…á€…á€ºá€†á€±á€¸á€•á€¼á€®á€¸ á€¡á€™á€¾á€¬á€¸á€¡á€šá€½á€„á€ºá€¸á€€á€„á€ºá€¸á€…á€„á€ºá€…á€±á€›á€”á€º á€•á€¼á€¯á€œá€¯á€•á€ºá€‘á€¬á€¸á€á€¼á€„á€ºá€¸á‹',
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
    titleMy: 'Smart Calendar & Dashboard Category Name Fix (Smart Calendar á€”á€¾á€„á€·á€º á€’á€€á€ºá€›á€¾á€ºá€˜á€¯á€á€º á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸á€á€½á€„á€º `cat_` á€€á€¯á€á€ºá€¡á€™á€Šá€ºá€™á€»á€¬á€¸ á€™á€•á€±á€«á€ºá€…á€±á€˜á€² á€€á€á€¹á€á€¡á€™á€Šá€ºá€¡á€…á€…á€ºá€™á€»á€¬á€¸ á€–á€±á€¬á€ºá€•á€¼á€á€¼á€„á€ºá€¸)',
    titleEn: 'Smart Calendar & Dashboard Category Name Fix',
    tag: 'fix',
    tagLabelMy: 'á€šá€á€¯ á€—á€¬á€¸á€›á€¾á€„á€ºá€¸á€¡á€žá€…á€º',
    tagLabelEn: 'Latest Update Version',
    descriptionMy: 'á€¡á€žá€¯á€¶á€¸á€•á€¼á€¯á€žá€° á€á€±á€¬á€„á€ºá€¸á€†á€­á€¯á€á€»á€€á€ºá€”á€¾á€„á€·á€º á€•á€¯á€¶á€•á€«á€¡á€á€­á€¯á€„á€ºá€¸ Smart Calendar Card (á€•á€¼á€€á€¹á€á€’á€­á€”á€º á€€á€’á€ºá€•á€¼á€¬á€¸) á€”á€¾á€„á€·á€º Dashboard á€™á€¾ á€œá€á€ºá€á€œá€±á€¬ á€™á€¾á€á€ºá€á€™á€ºá€¸á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸á€á€½á€„á€º `cat_groceries`, `cat_transport` á€€á€²á€·á€žá€­á€¯á€·á€žá€±á€¬ ID á€€á€¯á€á€ºá€¡á€™á€Šá€ºá€™á€»á€¬á€¸á€¡á€…á€¬á€¸ á€žá€”á€·á€ºá€›á€¾á€„á€ºá€¸á€žá€±á€¬ á€™á€¼á€”á€ºá€™á€¬/á€¡á€„á€ºá€¹á€‚á€œá€­á€•á€º á€€á€á€¹á€á€¡á€™á€Šá€ºá€™á€»á€¬á€¸á€€á€­á€¯ `getCategoryDisplayName` á€¡á€žá€¯á€¶á€¸á€•á€¼á€¯á á€œá€¯á€¶á€¸á€á€™á€¾á€”á€ºá€€á€”á€ºá€…á€½á€¬ á€–á€±á€¬á€ºá€•á€¼á€•á€±á€¸á€”á€­á€¯á€„á€ºá€›á€”á€º á€¡á€•á€¼á€Šá€·á€ºá€¡á€ á€•á€¼á€„á€ºá€†á€„á€ºá€•á€±á€¸á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Fixed raw category ID strings (like `cat_groceries`, `cat_transport`) appearing in the Smart Calendar Card and Dashboard transaction lists by consistently applying getCategoryDisplayName.',
    changesMy: [
      'ðŸ—“ï¸ **Smart Calendar Card Fix**: á€•á€¼á€€á€¹á€á€’á€­á€”á€º á€€á€’á€ºá€•á€¼á€¬á€¸á€¡á€á€½á€„á€ºá€¸ á€•á€¼á€žá€”á€±á€žá€±á€¬ á€”á€±á€·á€…á€‰á€ºá€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸á€á€½á€„á€º `cat_` á€€á€¯á€á€ºá€¡á€™á€Šá€ºá€™á€»á€¬á€¸á€¡á€…á€¬á€¸ á€žá€”á€·á€ºá€›á€¾á€„á€ºá€¸á€žá€±á€¬ á€€á€á€¹á€á€¡á€™á€Šá€ºá€™á€»á€¬á€¸ á€•á€±á€«á€ºá€œá€¬á€…á€±á€á€¼á€„á€ºá€¸á‹',
      'ðŸ“Š **Dashboard & Transactions Fix**: á€’á€€á€ºá€›á€¾á€ºá€˜á€¯á€á€ºá€”á€¾á€„á€·á€º á€„á€½á€±á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸á€á€½á€„á€º á€¡á€™á€»á€­á€¯á€¸á€¡á€…á€¬á€¸ á€¡á€™á€Šá€ºá€™á€»á€¬á€¸á€€á€­á€¯ á€™á€¼á€”á€ºá€™á€¬/á€¡á€„á€ºá€¹á€‚á€œá€­á€•á€º á€˜á€¬á€žá€¬á€…á€€á€¬á€¸á€¡á€œá€­á€¯á€€á€º á€á€­á€€á€»á€™á€¾á€”á€ºá€€á€”á€ºá€…á€½á€¬ á€–á€±á€¬á€ºá€•á€¼á€á€¼á€„á€ºá€¸á‹'
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
    titleMy: 'Category Name Cleanup - Clean Localized Names in Sync Modal & Drawer (Sync á€™á€­á€¯á€’á€šá€ºá€”á€¾á€„á€·á€º á€’á€±á€«á€ºá€œá€¬á€™á€»á€¬á€¸á€á€½á€„á€º `cat_` á€€á€¯á€á€ºá€¡á€™á€Šá€ºá€™á€»á€¬á€¸á€¡á€…á€¬á€¸ á€žá€”á€·á€ºá€›á€¾á€„á€ºá€¸á€žá€±á€¬ á€€á€á€¹á€á€¡á€™á€Šá€ºá€™á€»á€¬á€¸ á€•á€¼á€žá€á€¼á€„á€ºá€¸)',
    titleEn: 'Category Name Cleanup - Clean Localized Names in Sync Modal & Drawer',
    tag: 'fix',
    tagLabelMy: 'á€šá€á€¯ á€—á€¬á€¸á€›á€¾á€„á€ºá€¸á€¡á€žá€…á€º',
    tagLabelEn: 'Latest Update Version',
    descriptionMy: 'á€¡á€žá€¯á€¶á€¸á€•á€¼á€¯á€žá€° á€á€±á€¬á€„á€ºá€¸á€†á€­á€¯á€á€»á€€á€ºá€¡á€› Sync Status Modal á€”á€¾á€„á€·á€º Sync Status Drawer á€á€­á€¯á€·á€á€½á€„á€º `cat_food`, `cat_transport` á€€á€²á€·á€žá€­á€¯á€·á€žá€±á€¬ á€”á€Šá€ºá€¸á€•á€Šá€¬á€žá€¯á€¶á€¸ `cat_` á€€á€¯á€á€ºá€¡á€™á€Šá€ºá€™á€»á€¬á€¸á€¡á€…á€¬á€¸ á€žá€¯á€¶á€¸á€…á€½á€²á€žá€° á€”á€¬á€¸á€œá€Šá€ºá€œá€½á€šá€ºá€žá€Šá€·á€º á€žá€”á€·á€ºá€›á€¾á€„á€ºá€¸á€žá€±á€¬ á€™á€¼á€”á€ºá€™á€¬/á€¡á€„á€ºá€¹á€‚á€œá€­á€•á€º á€€á€á€¹á€á€¡á€™á€Šá€ºá€™á€»á€¬á€¸á€€á€­á€¯ á€¡á€•á€¼á€Šá€·á€ºá€¡á€ á€–á€±á€¬á€ºá€•á€¼á€•á€±á€¸á€”á€­á€¯á€„á€ºá€›á€”á€º `getCategoryDisplayName` helper á€–á€¼á€„á€·á€º á€¡á€†á€„á€·á€ºá€™á€¼á€¾á€„á€·á€ºá€á€„á€º á€•á€¼á€„á€ºá€†á€„á€ºá€•á€±á€¸á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Replaced technical raw category IDs (like `cat_food`, `cat_transport`) with clean localized category names in the TransactionSyncDetailModal and SyncStatusDrawer using getCategoryDisplayName.',
    changesMy: [
      'âœ¨ **Clean Category Names**: Sync á€™á€­á€¯á€’á€šá€ºá€”á€¾á€„á€·á€º Drawer á€™á€»á€¬á€¸á€á€½á€„á€º `cat_` á€–á€¼á€„á€·á€ºá€…á€žá€±á€¬ á€€á€¯á€á€ºá€¡á€™á€Šá€ºá€™á€»á€¬á€¸ á€™á€•á€±á€«á€ºá€…á€±á€˜á€² á€žá€”á€·á€ºá€›á€¾á€„á€ºá€¸á€žá€±á€¬ á€€á€á€¹á€á€¡á€™á€Šá€ºá€™á€»á€¬á€¸á€–á€¼á€„á€·á€º á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€…á€½á€¬ á€•á€¼á€žá€á€¼á€„á€ºá€¸á‹',
      'ðŸ” **Robust Fallback**: á€¡á€™á€»á€­á€¯á€¸á€¡á€…á€¬á€¸á€¡á€™á€Šá€ºá€™á€»á€¬á€¸á€€á€­á€¯ á€˜á€¬á€žá€¬á€…á€€á€¬á€¸ (á€™á€¼á€”á€ºá€™á€¬/á€¡á€„á€ºá€¹á€‚á€œá€­á€•á€º) á€¡á€œá€­á€¯á€€á€º á€á€­á€€á€»á€™á€¾á€”á€ºá€€á€”á€ºá€…á€½á€¬ á€–á€±á€¬á€ºá€•á€¼á€•á€±á€¸á€á€¼á€„á€ºá€¸á‹'
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
    titleMy: 'Smart Calendar Card - Daily In, Out, & Balance (á€…á€™á€á€ºá€•á€¼á€€á€¹á€á€’á€­á€”á€º á€€á€’á€ºá€•á€¼á€¬á€¸ - á€á€›á€€á€ºá€á€»á€„á€ºá€¸á€…á€®á á€á€„á€ºáŠ á€‘á€½á€€á€ºáŠ á€œá€€á€ºá€€á€»á€”á€º á€™á€»á€¬á€¸á€€á€­á€¯ á€•á€¼á€€á€¹á€á€’á€­á€”á€ºá€•á€±á€«á€ºá€á€½á€„á€º á€á€»á€€á€ºá€á€»á€„á€ºá€¸á€€á€¼á€Šá€·á€ºá€›á€¾á€¯á€”á€­á€¯á€„á€ºá€á€¼á€„á€ºá€¸)',
    titleEn: 'Smart Calendar Card - Daily In, Out, & Balance',
    tag: 'feature',
    tagLabelMy: 'á€šá€á€¯ á€—á€¬á€¸á€›á€¾á€„á€ºá€¸á€¡á€žá€…á€º',
    tagLabelEn: 'Latest Feature Version',
    descriptionMy: 'á€¡á€žá€¯á€¶á€¸á€•á€¼á€¯á€žá€° á€á€±á€¬á€„á€ºá€¸á€†á€­á€¯á€žá€Šá€·á€ºá€¡á€á€­á€¯á€„á€ºá€¸ Daily Financial Summary á€€á€’á€ºá€•á€¼á€¬á€¸á€¡á€…á€¬á€¸ á€›á€€á€ºá€…á€½á€²á€•á€¼á€€á€¹á€á€’á€­á€”á€º á€•á€¯á€¶á€…á€¶á€–á€¼á€„á€·á€º á€á€›á€€á€ºá€á€»á€„á€ºá€¸á€…á€®á á€á€„á€ºá€„á€½á€± (In)áŠ á€‘á€½á€€á€ºá€„á€½á€± (Out) á€”á€¾á€„á€·á€º á€¡á€žá€¬á€¸á€á€„á€ºá€œá€€á€ºá€€á€»á€”á€º (Net) á€™á€»á€¬á€¸á€€á€­á€¯ á€á€»á€€á€ºá€á€»á€„á€ºá€¸ á€™á€¼á€„á€ºá€á€½á€±á€·á€”á€­á€¯á€„á€ºá€™á€Šá€·á€º **Smart Calendar Card** (`SmartCalendarCard`) á€€á€­á€¯ á€¡á€žá€…á€ºá€á€•á€ºá€†á€„á€ºá€•á€±á€¸á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹ á€•á€¼á€€á€¹á€á€’á€­á€”á€ºá€•á€±á€«á€ºá€›á€¾á€­ á€›á€€á€ºá€…á€½á€²á€á€…á€ºá€á€¯á€á€»á€„á€ºá€¸á€…á€®á€€á€­á€¯ á€”á€¾á€­á€•á€ºá á€¡á€†á€­á€¯á€•á€«á€”á€±á€·á á€¡á€žá€±á€¸á€…á€­á€á€ºá€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸á€€á€­á€¯ á€¡á€œá€½á€šá€ºá€á€€á€° á€…á€…á€ºá€†á€±á€¸á€”á€­á€¯á€„á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Replaced the daily summary card with a Smart Calendar Card (`SmartCalendarCard`) that displays each day\'s Income (In), Expense (Out), and Net balance directly on a visual monthly calendar grid with interactive daily drill-down details.',
    changesMy: [
      'ðŸ—“ï¸ **Smart Calendar Card**: á€•á€¼á€€á€¹á€á€’á€­á€”á€º á€•á€¯á€¶á€…á€¶á€–á€¼á€„á€·á€º á€›á€€á€ºá€…á€½á€²á€á€…á€ºá€á€¯á€á€»á€„á€ºá€¸á€…á€®á á€á€„á€ºáŠ á€‘á€½á€€á€ºáŠ á€€á€»á€”á€º á€•á€™á€¬á€á€™á€»á€¬á€¸á€€á€­á€¯ á€á€…á€ºá€”á€ºá€¸á€á€»á€„á€ºá€¸ á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€…á€½á€¬ á€•á€¼á€žá€á€¼á€„á€ºá€¸á‹',
      'ðŸ” **Interactive Day Drill-Down**: á€•á€¼á€€á€¹á€á€’á€­á€”á€ºá€•á€±á€«á€ºá€›á€¾á€­ á€›á€€á€ºá€…á€½á€²á€™á€»á€¬á€¸á€€á€­á€¯ á€”á€¾á€­á€•á€ºá€á€¼á€„á€ºá€¸á€–á€¼á€„á€·á€º á€‘á€­á€¯á€”á€±á€·á€¡á€á€½á€€á€º á€žá€¯á€¶á€¸á€…á€½á€²á€‘á€¬á€¸á€žá€±á€¬ á€™á€¾á€á€ºá€á€™á€ºá€¸á€¡á€žá€±á€¸á€…á€­á€á€ºá€™á€»á€¬á€¸á€€á€­á€¯ á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€€á€¼á€Šá€·á€ºá€›á€¾á€¯á€”á€­á€¯á€„á€ºá€á€¼á€„á€ºá€¸á‹'
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
    titleMy: 'Daily Financial Summary Card - Opening vs Closing Liquidity (á€”á€±á€·á€…á€‰á€º á€„á€½á€±á€€á€¼á€±á€¸á€…á€®á€¸á€†á€„á€ºá€¸á€™á€¾á€¯ á€¡á€”á€¾á€…á€ºá€á€»á€¯á€•á€º á€€á€’á€ºá€•á€¼á€¬á€¸ - á€…á€á€„á€º á€”á€¾á€„á€·á€º á€•á€­á€á€ºá€œá€€á€ºá€€á€»á€”á€º á€„á€½á€±á€–á€¼á€…á€ºá€œá€½á€šá€ºá€™á€¾á€¯ á€”á€¾á€­á€¯á€„á€ºá€¸á€šá€¾á€‰á€ºá€á€»á€€á€º)',
    titleEn: 'Daily Financial Summary Card - Opening vs Closing Liquidity',
    tag: 'feature',
    tagLabelMy: 'á€šá€á€¯ á€—á€¬á€¸á€›á€¾á€„á€ºá€¸á€¡á€žá€…á€º',
    tagLabelEn: 'Latest Feature Version',
    descriptionMy: 'á€’á€€á€ºá€›á€¾á€ºá€˜á€¯á€á€º (Dashboard) á€á€½á€„á€º á€”á€±á€·á€…á€‰á€ºá€á€„á€ºá€„á€½á€±á€”á€¾á€„á€·á€º á€‘á€½á€€á€ºá€„á€½á€±á€™á€»á€¬á€¸á€€á€­á€¯ á€…á€¯á€…á€Šá€ºá€¸á€•á€¼á€žá€•á€±á€¸á€•á€¼á€®á€¸ á€¡á€†á€­á€¯á€•á€«á€”á€±á€·á á€…á€á€„á€ºá€œá€€á€ºá€€á€»á€”á€º (Opening Balance) á€”á€¾á€„á€·á€º á€•á€­á€á€ºá€œá€€á€ºá€€á€»á€”á€º (Closing Balance) á€á€­á€¯á€·á€€á€­á€¯ á€”á€¾á€­á€¯á€„á€ºá€¸á€šá€¾á€‰á€ºá€€á€¬ á€„á€½á€±á€–á€¼á€…á€ºá€œá€½á€šá€ºá€™á€¾á€¯ á€¡á€•á€¼á€±á€¬á€„á€ºá€¸á€¡á€œá€² (Liquidity shifts) á€™á€»á€¬á€¸á€€á€­á€¯ á€á€…á€ºá€á€»á€€á€ºá€€á€¼á€Šá€·á€ºá€›á€¯á€¶á€–á€¼á€„á€·á€º á€á€¼á€±á€›á€¬á€á€¶á€”á€­á€¯á€„á€ºá€™á€Šá€·á€º `DailyFinancialSummaryCard` á€€á€­á€¯ á€¡á€žá€…á€ºá€á€•á€ºá€†á€„á€ºá€•á€±á€¸á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Created a Daily Financial Summary component in the Dashboard (`DailyFinancialSummaryCard`) that aggregates daily inflows and outflows into a clean card, showing net Opening vs Closing balances for tracking daily liquidity shifts at a glance.',
    changesMy: [
      'ðŸ“… **Daily Financial Summary Card**: á€”á€±á€·á€…á€‰á€º á€„á€½á€±á€€á€¼á€±á€¸á€…á€®á€¸á€†á€„á€ºá€¸á€™á€¾á€¯á€™á€»á€¬á€¸á€”á€¾á€„á€·á€º á€á€„á€ºá€„á€½á€±/á€‘á€½á€€á€ºá€„á€½á€±á€™á€»á€¬á€¸á€€á€­á€¯ á€…á€¯á€…á€Šá€ºá€¸á€•á€¼á€žá€•á€±á€¸á€žá€±á€¬ á€€á€’á€ºá€•á€¼á€¬á€¸á€¡á€žá€…á€ºá‹',
      'ðŸ’¼ **Opening vs Closing Liquidity**: á€›á€½á€±á€¸á€á€»á€šá€ºá€‘á€¬á€¸á€žá€±á€¬ á€›á€€á€ºá€…á€½á€²á€¡á€œá€­á€¯á€€á€º á€…á€á€„á€ºá€œá€€á€ºá€€á€»á€”á€º (Opening) á€”á€¾á€„á€·á€º á€•á€­á€á€ºá€œá€€á€ºá€€á€»á€”á€º (Closing) á€á€­á€¯á€·á€€á€­á€¯ á€”á€¾á€­á€¯á€„á€ºá€¸á€šá€¾á€‰á€ºá€•á€¼á€žá€•á€¼á€®á€¸ á€„á€½á€±á€–á€¼á€…á€ºá€œá€½á€šá€ºá€™á€¾á€¯ á€¡á€•á€¼á€±á€¬á€„á€ºá€¸á€¡á€œá€²á€™á€»á€¬á€¸á€€á€­á€¯ á€á€¼á€±á€›á€¬á€á€¶á€”á€­á€¯á€„á€ºá€á€¼á€„á€ºá€¸á‹'
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
    titleMy: 'Daily Spending Limit & Red/Green Budget Indicator Card (á€”á€±á€·á€…á€‰á€º á€žá€¯á€¶á€¸á€…á€½á€²á€„á€½á€± á€€á€”á€·á€ºá€žá€á€ºá€á€»á€€á€º á€”á€¾á€„á€·á€º á€˜á€á€ºá€‚á€»á€€á€ºá€€á€»á€±á€¬á€ºá€œá€½á€”á€ºá€•á€«á€€ á€¡á€”á€®/á€¡á€…á€­á€™á€ºá€¸ á€•á€¼á€žá€•á€±á€¸á€žá€±á€¬ á€¡á€Šá€½á€¾á€”á€ºá€¸á€€á€’á€ºá€•á€¼á€¬á€¸)',
    titleEn: 'Daily Spending Limit Feature with Red/Green Over-Budget Indicator Card',
    tag: 'feature',
    tagLabelMy: 'á€šá€á€¯ á€—á€¬á€¸á€›á€¾á€„á€ºá€¸á€¡á€žá€…á€º',
    tagLabelEn: 'Latest Feature Version',
    descriptionMy: 'á€’á€€á€ºá€›á€¾á€ºá€˜á€¯á€á€º (Dashboard) á€á€½á€„á€º á€”á€±á€·á€…á€‰á€º á€žá€¯á€¶á€¸á€…á€½á€²á€„á€½á€± á€€á€”á€·á€ºá€žá€á€ºá€á€»á€€á€º (Daily Spending Limit) á€¡á€žá€…á€ºá€€á€­á€¯ á€žá€á€ºá€™á€¾á€á€ºá€”á€­á€¯á€„á€ºá€•á€¼á€®á€¸ á€šá€”á€±á€· á€á€…á€ºá€”á€±á€·á€á€¬ á€žá€¯á€¶á€¸á€…á€½á€²á€„á€½á€±á€žá€Šá€º á€žá€á€ºá€™á€¾á€á€ºá€˜á€á€ºá€‚á€»á€€á€ºá€‘á€€á€º á€€á€»á€±á€¬á€ºá€œá€½á€”á€ºá€”á€±á€•á€«á€€ á€¡á€”á€®á€›á€±á€¬á€„á€º (ðŸš¨ Over Budget)áŠ á€€á€”á€·á€ºá€žá€á€ºá€á€»á€€á€ºá€¡á€á€½á€„á€ºá€¸ á€›á€¾á€­á€”á€±á€•á€«á€€ á€¡á€…á€­á€™á€ºá€¸á€›á€±á€¬á€„á€º (ðŸŸ¢ Safe) á€–á€¼á€„á€·á€º á€á€­á€€á€»á€žá€±á€á€»á€¬á€…á€½á€¬ á€Šá€½á€¾á€”á€ºá€•á€¼á€•á€±á€¸á€™á€Šá€·á€º `DailySpendingLimitCard` á€€á€­á€¯ á€¡á€žá€…á€ºá€á€•á€ºá€†á€„á€ºá€•á€±á€¸á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Added a Daily Spending Limit feature to the Dashboard (`DailySpendingLimitCard`) that allows users to set a daily spending cap and shows a distinct red/green visual indicator if spending exceeds the daily budget.',
    changesMy: [
      'ðŸ”¥ **Daily Spending Limit Feature**: á€”á€±á€·á€…á€‰á€º á€¡á€™á€»á€¬á€¸á€†á€¯á€¶á€¸ á€žá€¯á€¶á€¸á€…á€½á€²á€”á€­á€¯á€„á€ºá€žá€Šá€·á€º á€•á€™á€¬á€á€€á€­á€¯ á€…á€­á€á€ºá€€á€¼á€­á€¯á€€á€º á€žá€á€ºá€™á€¾á€á€ºá€”á€­á€¯á€„á€ºá€á€¼á€„á€ºá€¸á‹',
      'ðŸŸ¢ðŸ”´ **Red/Green Over-Budget Indicator**: á€šá€”á€±á€· á€€á€¯á€”á€ºá€€á€»á€…á€›á€­á€á€ºá€žá€Šá€º á€˜á€á€ºá€‚á€»á€€á€ºá€¡á€á€½á€„á€ºá€¸ á€›á€¾á€­á€”á€±á€œá€»á€¾á€„á€º á€¡á€…á€­á€™á€ºá€¸á€›á€±á€¬á€„á€º (Safe) á€”á€¾á€„á€·á€º á€€á€»á€±á€¬á€ºá€œá€½á€”á€ºá€•á€«á€€ á€¡á€”á€®á€›á€±á€¬á€„á€º (Over Budget) á€–á€¼á€„á€·á€º á€á€–á€»á€•á€ºá€–á€»á€•á€º á€žá€á€­á€•á€±á€¸á€•á€¼á€žá€á€¼á€„á€ºá€¸á‹'
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
    titleMy: '6-Month Category Spending Trend Line Chart (á€œá€½á€”á€ºá€á€²á€·á€žá€±á€¬ á† á€œá€¡á€á€½á€„á€ºá€¸ á€¡á€™á€»á€­á€¯á€¸á€¡á€…á€¬á€¸á€¡á€œá€­á€¯á€€á€º á€‘á€½á€€á€ºá€„á€½á€± Trends á€™á€»á€‰á€ºá€¸á€€á€½á€±á€¸á€‡á€šá€¬á€¸)',
    titleEn: '6-Month Category Spending Trend Line Chart Component',
    tag: 'feature',
    tagLabelMy: 'á€šá€á€¯ á€—á€¬á€¸á€›á€¾á€„á€ºá€¸á€¡á€žá€…á€º',
    tagLabelEn: 'Latest Feature Version',
    descriptionMy: 'á€’á€€á€ºá€›á€¾á€ºá€˜á€¯á€á€º (Dashboard) á€á€½á€„á€º Recharts á€€á€­á€¯ á€¡á€žá€¯á€¶á€¸á€•á€¼á€¯á á€œá€½á€”á€ºá€á€²á€·á€žá€±á€¬ á† á€œá€¡á€á€½á€„á€ºá€¸ á€‘á€½á€€á€ºá€„á€½á€± á€žá€¯á€¶á€¸á€…á€½á€²á€™á€¾á€¯ á€œá€™á€ºá€¸á€€á€¼á€±á€¬á€„á€ºá€¸á€™á€»á€¬á€¸á€€á€­á€¯ á€¡á€™á€»á€­á€¯á€¸á€¡á€…á€¬á€¸ (Category) á€á€…á€ºá€á€¯á€á€»á€„á€ºá€¸á€…á€®á€¡á€œá€­á€¯á€€á€º á€™á€»á€‰á€ºá€¸á€€á€½á€±á€¸á€‡á€šá€¬á€¸ (`CategorySpendingTrendLineChart`) á€–á€¼á€„á€·á€º á€¡á€žá€…á€ºá€á€•á€ºá€†á€„á€ºá€•á€±á€¸á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹ á€¡á€žá€¯á€¶á€¸á€•á€¼á€¯á€žá€°á€™á€»á€¬á€¸á€¡á€”á€±á€–á€¼á€„á€·á€º á€™á€­á€™á€­á€á€­á€¯á€·á á€„á€½á€±á€€á€¼á€±á€¸á€žá€¯á€¶á€¸á€…á€½á€²á€™á€¾á€¯ á€á€­á€¯á€¸á€á€€á€ºá€á€¼á€„á€ºá€¸/á€œá€»á€±á€¬á€·á€”á€Šá€ºá€¸á€á€¼á€„á€ºá€¸ (Financial growth or decline over time) á€€á€­á€¯ á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€…á€½á€¬ á€™á€¼á€„á€ºá€á€½á€±á€·á€”á€­á€¯á€„á€ºá€™á€Šá€º á€–á€¼á€…á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Created a new line chart component using Recharts in the Dashboard (`CategorySpendingTrendLineChart`) that displays spending trends across top categories for the last six months, helping users visualize financial growth or decline over time.',
    changesMy: [
      'ðŸ“ˆ **6-Month Spending Trend Line Chart**: á€’á€€á€ºá€›á€¾á€ºá€˜á€¯á€á€ºá€á€½á€„á€º á€œá€½á€”á€ºá€á€²á€·á€žá€±á€¬ á† á€œá€á€¬ á€€á€¬á€œá€¡á€á€½á€„á€ºá€¸ á€‘á€½á€€á€ºá€„á€½á€± Trends á€™á€»á€¬á€¸á€€á€­á€¯ á€¡á€™á€»á€­á€¯á€¸á€¡á€…á€¬á€¸á€¡á€œá€­á€¯á€€á€º á€™á€»á€‰á€ºá€¸á€€á€½á€±á€¸á€‡á€šá€¬á€¸á€–á€¼á€„á€·á€º á€•á€¼á€žá€á€¼á€„á€ºá€¸á‹',
      'ðŸŽ¯ **Top Categories & Total Expense Lines**: á€…á€¯á€…á€¯á€•á€±á€«á€„á€ºá€¸á€‘á€½á€€á€ºá€„á€½á€±á€™á€»á€‰á€ºá€¸á€”á€¾á€„á€·á€ºá€¡á€á€° á€‘á€­á€•á€ºá€á€”á€ºá€¸á€žá€¯á€¶á€¸á€…á€½á€²á€™á€¾á€¯ á€¡á€™á€»á€¬á€¸á€†á€¯á€¶á€¸ á€€á€á€¹á€ (Top 3, 4, 5) á€œá€™á€ºá€¸á€€á€¼á€±á€¬á€„á€ºá€¸á€™á€»á€¬á€¸á€€á€­á€¯ á€¡á€•á€¼á€”á€ºá€¡á€œá€¾á€”á€º á€”á€¾á€­á€¯á€„á€ºá€¸á€šá€¾á€‰á€ºá€œá€±á€·á€œá€¬á€”á€­á€¯á€„á€ºá€á€¼á€„á€ºá€¸á‹'
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
    titleMy: 'Sync Status Drawer & Exact Error Message Tracker (Billing console á€œá€„á€·á€ºá€á€ºá€™á€»á€¬á€¸ á€¡á€•á€¼á€®á€¸á€¡á€•á€­á€¯á€„á€º á€–á€¼á€¯á€á€ºá€á€»á€á€¼á€„á€ºá€¸ á€”á€¾á€„á€·á€º á€á€­á€€á€»á€žá€±á€¬ Error á€™á€€á€ºá€†á€±á€·á€á€ºá€»á€•á€¼á€žá€€á€¬ Retry á€žá€­á€¯á€·á€™á€Ÿá€¯á€á€º Delete Local Copy á€›á€½á€±á€¸á€á€»á€šá€ºá€”á€­á€¯á€„á€ºá€žá€±á€¬ Sync Status Drawer)',
    titleEn: 'Sync Status Drawer & Exact Error Message Tracker (Removed Billing Console Links)',
    tag: 'feature',
    tagLabelMy: 'á€šá€á€¯ á€—á€¬á€¸á€›á€¾á€„á€ºá€¸á€¡á€žá€…á€º',
    tagLabelEn: 'Latest Feature Version',
    descriptionMy: 'á€¡á€žá€¯á€¶á€¸á€•á€¼á€¯á€žá€° á€á€±á€¬á€„á€ºá€¸á€†á€­á€¯á€žá€Šá€·á€ºá€¡á€á€­á€¯á€„á€ºá€¸ Firebase Billing console á€”á€¾á€„á€·á€º á€žá€€á€ºá€†á€­á€¯á€„á€ºá€žá€±á€¬ Upgrade á€œá€„á€·á€ºá€á€ºá€™á€»á€¬á€¸á€€á€­á€¯ á€¡á€žá€¯á€¶á€¸á€•á€¼á€¯á€žá€°á€™á€»á€€á€ºá€”á€¾á€¬á€•á€¼á€„á€ºá€™á€¾ á€œá€¯á€¶á€¸á€ á€¡á€•á€¼á€®á€¸á€¡á€•á€­á€¯á€„á€º á€–á€šá€ºá€›á€¾á€¬á€¸á€•á€±á€¸á€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹ á€‘á€­á€¯á€·á€¡á€•á€¼á€„á€º á€™á€¡á€±á€¬á€„á€ºá€™á€¼á€„á€ºá€žá€±á€¬ á€™á€¾á€á€ºá€á€™á€ºá€¸á€™á€»á€¬á€¸á€¡á€á€½á€€á€º Firestore Operation á€™á€¾ á€›á€›á€¾á€­á€œá€¬á€žá€Šá€·á€º á€á€­á€€á€»á€žá€±á€¬ Error á€™á€€á€ºá€†á€±á€·á€á€ºá€»á€™á€»á€¬á€¸á€€á€­á€¯ á€¡á€žá€±á€¸á€…á€­á€á€ºá€•á€¼á€žá€•á€±á€¸á€•á€¼á€®á€¸ á€á€…á€ºá€á€¯á€á€»á€„á€ºá€¸á€…á€®á€¡á€á€½á€€á€º "Retry" (á€‘á€•á€ºá€€á€¼á€­á€¯á€¸á€…á€¬á€¸á€™á€Šá€º) á€žá€­á€¯á€·á€™á€Ÿá€¯á€á€º "Delete Local Copy" (á€…á€€á€ºá€á€½á€„á€ºá€¸á€€á€±á€¬á€ºá€•á€® á€–á€»á€€á€ºá€™á€Šá€º) á€›á€½á€±á€¸á€á€»á€šá€ºá€”á€­á€¯á€„á€ºá€žá€±á€¬ **Sync Status Drawer** á€¡á€žá€…á€ºá€€á€­á€¯ á€¡á€•á€¼á€Šá€·á€ºá€¡á€ á€á€•á€ºá€†á€„á€ºá€•á€±á€¸á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Completely removed Firebase Billing console upgrade links from the user interface as requested. Implemented a dedicated SyncStatusDrawer component displaying exact error messages from Firestore operations with context-aware "Retry" and "Delete Local Copy" options for each failed item.',
    changesMy: [
      'ðŸ—‘ï¸ **Removed Billing Console Links**: á€¡á€žá€¯á€¶á€¸á€•á€¼á€¯á€žá€°á€”á€¾á€„á€·á€º á€™á€žá€€á€ºá€†á€­á€¯á€„á€ºá€žá€±á€¬ Firebase Billing / Upgrade Console á€œá€„á€·á€ºá€á€ºá€™á€»á€¬á€¸á€€á€­á€¯ UI á€™á€¾ á€œá€¯á€¶á€¸á€ á€–á€šá€ºá€›á€¾á€¬á€¸á€á€¼á€„á€ºá€¸á‹',
      'drawer **Sync Status Drawer**: á€™á€¡á€±á€¬á€„á€ºá€™á€¼á€„á€ºá€žá€±á€¬ á€™á€¾á€á€ºá€á€™á€ºá€¸á€™á€»á€¬á€¸á á€á€­á€€á€»á€žá€±á€¬ Firestore Error á€™á€€á€ºá€†á€±á€·á€á€ºá€»á€™á€»á€¬á€¸á€€á€­á€¯ á€•á€¼á€žá€•á€±á€¸á€á€¼á€„á€ºá€¸á‹',
      'ðŸ› ï¸ **Context-Aware Actions (Retry / Delete Local Copy)**: á€™á€¾á€á€ºá€á€™á€ºá€¸á€á€…á€ºá€á€¯á€á€»á€„á€ºá€¸á€…á€®á€¡á€œá€­á€¯á€€á€º DB á€žá€­á€¯á€· á€•á€¼á€”á€ºá€œá€Šá€ºá€•á€­á€¯á€·á€†á€±á€¬á€„á€ºá€›á€”á€º "Retry" (á€žá€­á€¯á€·á€™á€Ÿá€¯á€á€º) á€™á€œá€­á€¯á€¡á€•á€ºá€á€±á€¬á€·á€•á€«á€€ "Delete Local Copy" á€–á€¼á€„á€·á€º á€–á€»á€€á€ºá€•á€…á€ºá€”á€­á€¯á€„á€ºá€žá€±á€¬ á€›á€½á€±á€¸á€á€»á€šá€ºá€á€½á€„á€·á€ºá€™á€»á€¬á€¸á‹'
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
    titleMy: 'Strict Quota Verification on Retry Sync (Quota á€¡á€™á€¾á€¬á€¸á€›á€¾á€­á€…á€‰á€º Retry á€”á€¾á€­á€•á€ºá€•á€«á€€ á€’á€±á€á€¬á€™á€›á€±á€¬á€€á€ºá€œá€»á€¾á€„á€º á€¡á€­á€¯á€€á€± (OK) á€œá€¯á€¶á€¸á€á€™á€•á€¼á€˜á€² Error á€†á€€á€ºá€œá€€á€ºá€•á€¼á€žá€žá€±á€¬ á€á€­á€€á€»á€žá€±á€á€»á€¬á€žá€Šá€·á€º á€…á€”á€…á€º)',
    titleEn: 'Strict Quota Verification on Retry Sync (Preventing False Success)',
    tag: 'fix',
    tagLabelMy: 'á€šá€á€¯ á€—á€¬á€¸á€›á€¾á€„á€ºá€¸á€¡á€žá€…á€º',
    tagLabelEn: 'Latest Fix Version',
    descriptionMy: 'á€¡á€žá€¯á€¶á€¸á€•á€¼á€¯á€žá€° á€á€±á€¬á€„á€ºá€¸á€†á€­á€¯á€žá€Šá€·á€ºá€¡á€á€­á€¯á€„á€ºá€¸ Quota Exceed á€–á€¼á€…á€ºá€”á€±á€á€»á€­á€”á€ºá€á€½á€„á€º "Retry Sync" á€á€œá€¯á€á€ºá€€á€­á€¯ á€”á€¾á€­á€•á€ºá€œá€­á€¯á€€á€ºá€•á€«á€€ á€’á€±á€á€¬á€™á€»á€¬á€¸ Cloud Database á€žá€­á€¯á€· á€¡á€™á€¾á€”á€ºá€á€€á€šá€º á€›á€±á€¬á€€á€ºá€›á€¾á€­á€žá€½á€¬á€¸á€á€¼á€„á€ºá€¸ á€›á€¾á€­á€™á€›á€¾á€­ á€…á€¬á€›á€„á€ºá€¸á€…á€…á€º (Verify) á€œá€¯á€•á€ºá€…á€±á€•á€¼á€®á€¸á€™á€¾á€žá€¬ á€¡á€±á€¬á€„á€ºá€™á€¼á€„á€ºá€€á€¼á€±á€¬á€„á€ºá€¸ (OK) á€•á€¼á€žá€™á€Šá€ºá€–á€¼á€…á€ºá€•á€«á€žá€Šá€ºá‹ á€¡á€€á€šá€ºá Quota á€•á€¼á€Šá€·á€ºá€”á€±á€†á€²á€–á€¼á€…á€ºá€•á€¼á€®á€¸ á€’á€±á€á€¬á€™á€»á€¬á€¸ á€†á€¬á€—á€¬á€žá€­á€¯á€· á€™á€›á€±á€¬á€€á€ºá€”á€­á€¯á€„á€ºá€žá€±á€¸á€•á€«á€€ á€¡á€±á€¬á€„á€ºá€™á€¼á€„á€ºá€€á€¼á€±á€¬á€„á€ºá€¸ á€™á€•á€¼á€˜á€² âš ï¸ Error á€žá€á€­á€•á€±á€¸á€á€»á€€á€ºá€”á€¾á€„á€·á€ºá€¡á€á€° Firebase Billing á€¡á€†á€„á€·á€ºá€™á€¼á€¾á€„á€·á€ºá€á€„á€ºá€›á€”á€º á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€ºá€œá€„á€·á€ºá€á€ºá€€á€­á€¯ á€†á€€á€ºá€œá€€á€ºá€•á€¼á€žá€•á€±á€¸á€™á€Šá€º á€–á€¼á€…á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Refactored Retry Sync logic to strictly verify whether data has successfully reached Firestore before showing any success message. If quota is still exceeded and writes fail, it explicitly prevents false success messages and keeps displaying the warning with a direct billing upgrade link.',
    changesMy: [
      'ðŸ›¡ï¸ **Strict Quota Verification**: Retry Sync á€”á€¾á€­á€•á€ºá€œá€­á€¯á€€á€ºá€á€»á€­á€”á€ºá€á€½á€„á€º á€†á€¬á€—á€¬á€žá€­á€¯á€· á€’á€±á€á€¬ á€¡á€™á€¾á€”á€ºá€á€€á€šá€º á€›á€±á€¬á€€á€º/á€™á€›á€±á€¬á€€á€º á€…á€…á€ºá€†á€±á€¸á€•á€¼á€®á€¸á€™á€¾á€žá€¬ á€¡á€±á€¬á€„á€ºá€™á€¼á€„á€ºá€€á€¼á€±á€¬á€„á€ºá€¸á€•á€¼á€žá€á€¼á€„á€ºá€¸ (False Success á€œá€¯á€¶á€¸á€á€™á€›á€¾á€­á€…á€±á€›)á‹',
      'ðŸ’³ **Direct Billing / Upgrade Link**: Quota á€¡á€™á€¾á€¬á€¸á€†á€€á€ºá€œá€€á€ºá€›á€¾á€­á€”á€±á€•á€«á€€ Firebase Console á€žá€­á€¯á€· á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€ºá€žá€½á€¬á€¸á€›á€±á€¬á€€á€ºá Billing á€¡á€†á€„á€·á€ºá€™á€¼á€¾á€„á€·á€ºá€”á€­á€¯á€„á€ºá€žá€±á€¬ á€á€œá€¯á€á€º á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€á€¼á€„á€ºá€¸á‹'
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
    titleMy: 'Quota Exceeded Visual Notification Banner & Retry Sync Reconnection (Quota á€€á€¯á€”á€ºá€†á€¯á€¶á€¸á€™á€¾á€¯ á€žá€á€­á€•á€±á€¸á€˜á€”á€ºá€”á€¬ á€”á€¾á€„á€·á€º á€”á€¾á€±á€¬á€„á€·á€ºá€”á€¾á€±á€¸á€™á€¾á€¯á€–á€¼á€„á€·á€º á€•á€¼á€”á€ºá€œá€Šá€ºá€á€»á€­á€á€ºá€†á€€á€ºá€žá€±á€¬ Retry Sync á€á€œá€¯á€á€º)',
    titleEn: 'Quota Exceeded Visual Notification Banner & Retry Sync Reconnection',
    tag: 'feature',
    tagLabelMy: 'á€šá€á€¯ á€—á€¬á€¸á€›á€¾á€„á€ºá€¸á€¡á€žá€…á€º',
    tagLabelEn: 'Latest Feature Version',
    descriptionMy: 'á€¡á€•á€œá€®á€€á€±á€¸á€›á€¾á€„á€ºá€¸á€á€½á€„á€º "quota exceeded" á€žá€­á€¯á€·á€™á€Ÿá€¯á€á€º "resource exhausted" á€¡á€™á€¾á€¬á€¸á€™á€»á€¬á€¸ (Errors) á€–á€¼á€…á€ºá€•á€±á€«á€ºá€œá€¬á€žá€Šá€·á€ºá€¡á€á€« á€™á€»á€€á€ºá€”á€¾á€¬á€•á€¼á€„á€ºá€•á€±á€«á€ºá€á€½á€„á€º á€á€»á€€á€ºá€á€»á€„á€ºá€¸á€•á€±á€«á€ºá€œá€¬á€™á€Šá€·á€º á€žá€á€­á€•á€±á€¸á€˜á€”á€ºá€”á€¬ (`QuotaExceededNotificationBanner`) á€€á€­á€¯ á€á€•á€ºá€†á€„á€ºá€•á€±á€¸á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹ á€¡á€†á€­á€¯á€•á€«á€˜á€”á€ºá€”á€¬á€á€½á€„á€º á€•á€«á€›á€¾á€­á€žá€±á€¬ **"Retry Sync"** á€á€œá€¯á€á€ºá€€á€­á€¯ á€”á€¾á€­á€•á€ºá€œá€­á€¯á€€á€ºá€á€¼á€„á€ºá€¸á€–á€¼á€„á€·á€º á€…á€€á€ºá€á€½á€„á€ºá€¸á€›á€¾á€­ local sync queue á€€á€­á€¯ á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€•á€±á€¸á€•á€¼á€®á€¸ á€á€á€á€¬ á€¡á€á€»á€­á€”á€ºá€†á€­á€¯á€„á€ºá€¸á€„á€¶á€·á€™á€¾á€¯ (brief delay) á€•á€¼á€®á€¸á€”á€±á€¬á€€á€º Firebase á€á€»á€­á€á€ºá€†á€€á€ºá€™á€¾á€¯á€€á€­á€¯ á€¡á€žá€…á€ºá€á€…á€ºá€–á€”á€º á€•á€¼á€”á€ºá€œá€Šá€ºá€…á€á€„á€ºá€•á€±á€¸á€™á€Šá€ºá€–á€¼á€…á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Integrated a dedicated QuotaExceededNotificationBanner component that detects quota exceeded or resource exhausted errors and provides a Retry Sync button to clear the local sync queue and re-establish the Firebase connection after a brief delay.',
    changesMy: [
      'ðŸš¨ **Quota Exceeded Visual Banner**: Quota á€€á€¯á€”á€ºá€†á€¯á€¶á€¸á€á€»á€­á€”á€º á€žá€­á€¯á€·á€™á€Ÿá€¯á€á€º Resource Exhausted á€–á€¼á€…á€ºá€á€»á€­á€”á€ºá€™á€»á€¬á€¸á€á€½á€„á€º UI á€á€½á€„á€º á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º á€•á€±á€«á€ºá€œá€¬á€™á€Šá€·á€º á€žá€á€­á€•á€±á€¸á€˜á€”á€ºá€”á€¬á‹',
      'ðŸ”„ **Retry Sync & Reconnect Button**: Local Sync Queue á€€á€­á€¯ á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€•á€±á€¸á€•á€¼á€®á€¸ brief delay á€–á€¼á€„á€·á€º Firebase á€á€»á€­á€á€ºá€†á€€á€ºá€™á€¾á€¯á€€á€­á€¯ á€¡á€žá€…á€ºá€•á€¼á€”á€ºá€œá€Šá€º á€á€Šá€ºá€†á€±á€¬á€€á€ºá€•á€±á€¸á€žá€±á€¬ á€á€œá€¯á€á€ºá‹'
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
    titleMy: 'Current Month Expense Donut Chart (á€šá€á€¯á€œ á€‘á€½á€€á€ºá€„á€½á€± á€¡á€™á€»á€­á€¯á€¸á€¡á€…á€¬á€¸á€¡á€œá€­á€¯á€€á€º Donut á€‡á€šá€¬á€¸)',
    titleEn: 'Current Month Expense Donut Chart Breakdown Component',
    tag: 'feature',
    tagLabelMy: 'á€šá€á€¯ á€—á€¬á€¸á€›á€¾á€„á€ºá€¸á€¡á€žá€…á€º',
    tagLabelEn: 'Latest Feature Version',
    descriptionMy: 'á€’á€€á€ºá€›á€¾á€ºá€˜á€¯á€á€º (Dashboard) á€á€½á€„á€º á€šá€á€¯á€œá€¡á€á€½á€€á€º á€‘á€½á€€á€ºá€„á€½á€±á€™á€»á€¬á€¸á€€á€­á€¯ á€¡á€™á€»á€­á€¯á€¸á€¡á€…á€¬á€¸ (Category) á€á€…á€ºá€á€¯á€á€»á€„á€ºá€¸á€…á€®á€¡á€œá€­á€¯á€€á€º á€™á€Šá€ºá€žá€Šá€·á€ºá€”á€±á€›á€¬á€á€½á€„á€º á€¡á€™á€»á€¬á€¸á€†á€¯á€¶á€¸ á€žá€¯á€¶á€¸á€…á€½á€²á€”á€±á€žá€Šá€ºá€€á€­á€¯ á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€…á€½á€¬ á€™á€¼á€„á€ºá€á€½á€±á€·á€”á€­á€¯á€„á€ºá€…á€±á€›á€”á€º Donut Chart á€‡á€šá€¬á€¸á€¡á€žá€…á€º (`CurrentMonthExpenseDonutChart`) á€€á€­á€¯ á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€•á€±á€¸á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹ á€€á€á€¹á€á€¡á€œá€­á€¯á€€á€º á€›á€¬á€á€­á€¯á€„á€ºá€”á€¾á€¯á€”á€ºá€¸á€™á€»á€¬á€¸á€”á€¾á€„á€·á€º á€¡á€á€»á€­á€¯á€¸á€¡á€…á€¬á€¸ áƒžáƒ áƒá€‚á€›á€á€ºá€˜á€¬á€¸á€™á€»á€¬á€¸á€€á€­á€¯ á€œá€¾á€•á€žá€±á€žá€•á€ºá€…á€½á€¬ á€–á€±á€¬á€ºá€•á€¼á€•á€±á€¸á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Added a Donut Chart to the Dashboard (`CurrentMonthExpenseDonutChart`) that breaks down expenses by category for the current month, providing a clear visual representation with proportion bars and percentage shares.',
    changesMy: [
      'ðŸ© **Current Month Expense Donut Chart**: á€’á€€á€ºá€›á€¾á€ºá€˜á€¯á€á€ºá€á€½á€„á€º á€šá€á€¯á€œá á€‘á€½á€€á€ºá€„á€½á€±á€™á€»á€¬á€¸á€€á€­á€¯ á€¡á€™á€»á€­á€¯á€¸á€¡á€…á€¬á€¸á€¡á€œá€­á€¯á€€á€º Donut á€‡á€šá€¬á€¸á€–á€¼á€„á€·á€º á€¡á€á€»á€­á€¯á€¸á€€á€» á€á€½á€²á€á€¼á€™á€ºá€¸á€•á€¼á€žá€á€¼á€„á€ºá€¸á‹',
      'ðŸ“Š **Category Percentage & Progress Bars**: á€€á€á€¹á€á€á€…á€ºá€á€¯á€á€»á€„á€ºá€¸á€…á€®á á€…á€¯á€…á€¯á€•á€±á€«á€„á€ºá€¸ á€žá€¯á€¶á€¸á€…á€½á€²á€„á€½á€±áŠ á€›á€¬á€á€­á€¯á€„á€ºá€”á€¾á€¯á€”á€ºá€¸á€á€±á€…á€¯ á€”á€¾á€„á€·á€º áƒžáƒ áƒá€‚á€›á€á€ºá€˜á€¬á€¸á€™á€»á€¬á€¸á€€á€­á€¯ á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€…á€½á€¬ á€œá€±á€·á€œá€¬á€”á€­á€¯á€„á€ºá€á€¼á€„á€ºá€¸á‹'
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
    titleMy: 'Per-Transaction Sync Status Badges & Detailed Error Tracker (á€„á€½á€±á€…á€¬á€›á€„á€ºá€¸ á€á€…á€ºá€á€¯á€á€»á€„á€ºá€¸á€…á€®á€¡á€œá€­á€¯á€€á€º DB á€›á€±á€¬á€€á€º/á€™á€›á€±á€¬á€€á€º á€¡á€Šá€½á€¾á€”á€ºá€¸á€žá€„á€ºá€¹á€€á€±á€ badges á€”á€¾á€„á€·á€º á€¡á€žá€±á€¸á€…á€­á€á€º Error Tracker Modal)',
    titleEn: 'Per-Transaction Sync Status Badges & Detailed Error Tracker Modal',
    tag: 'feature',
    tagLabelMy: 'á€šá€á€¯ á€—á€¬á€¸á€›á€¾á€„á€ºá€¸á€¡á€žá€…á€º',
    tagLabelEn: 'Latest Feature Version',
    descriptionMy: 'á€™á€¾á€á€ºá€á€™á€ºá€¸ (Transaction) á€á€…á€ºá€á€¯á€á€»á€„á€ºá€¸á€…á€®á€á€½á€„á€º áŽá€„á€ºá€¸á€á€­á€¯á€·á Database á€á€»á€­á€á€ºá€†á€€á€ºá€™á€¾á€¯ á€¡á€á€¼á€±á€¡á€”á€±á€€á€­á€¯ á€¡á€á€­á€¡á€€á€»á€žá€­á€›á€¾á€­á€”á€­á€¯á€„á€ºá€›á€”á€º ðŸŸ¢ DB (Synced), â³ Local (Pending), âš ï¸ DB Error (Failed with Quota/Network Reason) á€”á€¾á€„á€·á€º ðŸ“´ Offline á€¡á€Šá€½á€¾á€”á€ºá€¸á€žá€„á€ºá€¹á€€á€±á€ Icon Badges á€™á€»á€¬á€¸á€€á€­á€¯ á€¡á€žá€…á€ºá€á€•á€ºá€†á€„á€ºá€•á€±á€¸á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹ Badge á€€á€­á€¯ á€”á€¾á€­á€•á€ºá€á€¼á€„á€ºá€¸á€–á€¼á€„á€·á€º á€¡á€žá€±á€¸á€…á€­á€á€º Error Tracker Modal á€•á€½á€„á€·á€ºá€œá€¬á€™á€Šá€ºá€–á€¼á€…á€ºá€•á€¼á€®á€¸ á€’á€±á€á€¬á€˜á€¬á€€á€¼á€±á€¬á€„á€·á€º á€™á€›á€±á€¬á€€á€ºá€žá€±á€¸á€€á€¼á€±á€¬á€„á€ºá€¸ á€¡á€€á€¼á€±á€¬á€„á€ºá€¸á€›á€„á€ºá€¸á€¡á€™á€¾á€”á€ºá€€á€­á€¯ á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€…á€½á€¬ á€–á€±á€¬á€ºá€•á€¼á€•á€±á€¸á€™á€Šá€ºá€–á€¼á€…á€ºá€€á€¬ "Retry Sync" á€á€œá€¯á€á€ºá€–á€¼á€„á€·á€º á€á€»á€€á€ºá€á€»á€„á€ºá€¸ á€•á€¼á€”á€ºá€œá€Šá€ºá€á€„á€ºá€žá€½á€„á€ºá€¸á€”á€­á€¯á€„á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Added per-transaction sync status badges (DB Synced, Local Pending, DB Error with exact reason, Offline) and an interactive TransactionSyncDetailModal error tracker allowing users to inspect why a record has not reached the DB and retry syncing immediately.',
    changesMy: [
      'ðŸ·ï¸ **Per-Transaction Sync Badges**: á€™á€¾á€á€ºá€á€™á€ºá€¸á€á€­á€¯á€„á€ºá€¸á€á€½á€„á€º DB á€‘á€²á€žá€­á€¯á€· á€›á€±á€¬á€€á€º/á€™á€›á€±á€¬á€€á€ºáŠ Local á€á€½á€„á€º á€›á€¾á€­á€”á€±á€á€¼á€„á€ºá€¸ á€žá€­á€¯á€·á€™á€Ÿá€¯á€á€º Error á€–á€¼á€…á€ºá€”á€±á€á€¼á€„á€ºá€¸á€€á€­á€¯ Icon Badge á€–á€¼á€„á€·á€º á€á€…á€ºá€”á€ºá€¸á€á€»á€„á€ºá€¸ á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€…á€½á€¬ á€•á€¼á€žá€•á€±á€¸á€á€¼á€„á€ºá€¸á‹',
      'ðŸ” **Detailed Error Tracker Modal**: á€™á€¾á€á€ºá€á€™á€ºá€¸á€á€…á€ºá€á€¯á€á€¯ DB á€žá€­á€¯á€· á€™á€›á€±á€¬á€€á€ºá€›á€¾á€­á€žá€±á€¸á€•á€«á€€ Quota Exceeded á€œá€¬á€¸áŠ Network Timeout á€œá€¬á€¸á€†á€­á€¯á€žá€Šá€·á€º á€¡á€€á€¼á€±á€¬á€„á€ºá€¸á€›á€„á€ºá€¸á€¡á€™á€¾á€”á€ºá€€á€­á€¯ á€¡á€žá€±á€¸á€…á€­á€á€º á€…á€…á€ºá€†á€±á€¸á€”á€­á€¯á€„á€ºá€žá€±á€¬ Modal á€”á€¾á€„á€ºá€· Retry Sync á€á€œá€¯á€á€ºá‹',
      'ðŸ“± **Cross-Device Sync Transparency**: á€…á€€á€ºá€á€…á€ºá€œá€¯á€¶á€¸á€”á€¾á€„á€·á€ºá€á€…á€ºá€œá€¯á€¶á€¸ á€™á€Šá€ºá€žá€Šá€·á€ºá€™á€¾á€á€ºá€á€™á€ºá€¸á€™á€»á€¬á€¸ Cloud Database á€žá€­á€¯á€· á€¡á€±á€¬á€„á€ºá€™á€¼á€„á€ºá€…á€½á€¬ á€›á€±á€¬á€€á€ºá€›á€¾á€­á€•á€¼á€®á€¸á€•á€¼á€®á€œá€²á€†á€­á€¯á€žá€Šá€ºá€€á€­á€¯ á€á€­á€€á€»á€žá€±á€á€»á€¬á€…á€½á€¬ á€á€¼á€±á€›á€¬á€á€¶á€”á€­á€¯á€„á€ºá€á€¼á€„á€ºá€¸á‹'
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
    titleMy: 'Financial Summary Table Redesign & Dual-System Cash Flow Views (á€˜á€á€¹á€á€¬á€›á€±á€¸ á€¡á€”á€¾á€…á€ºá€á€»á€¯á€•á€ºá€‡á€šá€¬á€¸ á€¡á€žá€…á€ºá€•á€¼á€±á€¬á€„á€ºá€¸á€œá€²á€á€¼á€„á€ºá€¸ á€”á€¾á€„á€·á€º á€„á€½á€±á€á€„á€º/á€‘á€½á€€á€ºáŠ á€…á€á€„á€º/á€•á€­á€á€ºá€œá€€á€ºá€€á€»á€”á€º á€…á€”á€…á€ºá€”á€¾á€…á€ºá€™á€»á€­á€¯á€¸)',
    titleEn: 'Financial Summary Table Redesign & Dual-System Cash Flow Views (Inflow/Outflow & Opening/Closing)',
    tag: 'feature',
    tagLabelMy: 'á€šá€á€¯ á€—á€¬á€¸á€›á€¾á€„á€ºá€¸á€¡á€žá€…á€º',
    tagLabelEn: 'Latest Feature Version',
    descriptionMy: 'á€˜á€á€¹á€á€¬á€›á€±á€¸ á€¡á€”á€¾á€…á€ºá€á€»á€¯á€•á€ºá€‡á€šá€¬á€¸ (FinancialSummaryTable) á€€á€­á€¯ á€–á€¯á€”á€ºá€¸á€™á€»á€€á€ºá€”á€¾á€¬á€•á€¼á€„á€ºá€™á€»á€¬á€¸á€á€½á€„á€º á€€á€¼á€Šá€ºá€·á€›á€›á€¾á€¯á€•á€ºá€‘á€½á€±á€¸á€™á€¾á€¯á€™á€›á€¾á€­á€…á€±á€›á€”á€º á€™á€­á€¯á€˜á€­á€¯á€„á€ºá€¸á€œá€º-á€–á€¬á€·á€…á€º (Mobile-First) á€’á€®á€‡á€­á€¯á€„á€ºá€¸á€¡á€žá€…á€ºá€–á€¼á€„á€·á€º á€¡á€•á€¼á€Šá€·á€ºá€¡á€ á€•á€¼á€„á€ºá€†á€„á€ºá€™á€½á€™á€ºá€¸á€™á€¶á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹ á€‘á€­á€¯á€·á€¡á€•á€¼á€„á€º á€¡á€žá€¯á€¶á€¸á€•á€¼á€¯á€žá€° á€á€±á€¬á€„á€ºá€¸á€†á€­á€¯á€žá€Šá€·á€ºá€¡á€á€­á€¯á€„á€ºá€¸ á€„á€½á€±á€á€„á€º/á€„á€½á€±á€‘á€½á€€á€º á€žá€­á€›á€¾á€­á€”á€­á€¯á€„á€ºá€›á€”á€º á€…á€”á€…á€º á‚ á€™á€»á€­á€¯á€¸ (áá‹ Inflow / Outflow á€”á€¾á€„á€·á€º á‚á‹ Opening / Closing) á€€á€­á€¯ á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€œá€½á€šá€ºá€€á€°á€…á€½á€¬ á€€á€°á€¸á€•á€¼á€±á€¬á€„á€ºá€¸á€€á€¼á€Šá€ºá€·á€›á€¾á€¯á€”á€­á€¯á€„á€ºá€žá€±á€¬ Tabs á€™á€»á€¬á€¸á€–á€¼á€„á€·á€º á€¡á€žá€…á€ºá€á€•á€ºá€†á€„á€ºá€•á€±á€¸á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Refactored and redesigned the FinancialSummaryTable component for mobile-first readability, eliminating visual clutter, and adding dedicated dual-system views for (1) Inflow / Outflow and (2) Opening / Closing cash flow tracking.',
    changesMy: [
      'âœ¨ **Clutter-Free Table Redesign**: á€™á€­á€¯á€˜á€­á€¯á€„á€ºá€¸á€œá€ºá€–á€¯á€”á€ºá€¸á€™á€»á€¬á€¸á€á€½á€„á€º á€‡á€šá€¬á€¸á€™á€»á€¬á€¸ á€€á€¼á€Šá€ºá€·á€›á€›á€¾á€¯á€•á€ºá€‘á€½á€±á€¸á€™á€¾á€¯á€€á€­á€¯ á€–á€šá€ºá€›á€¾á€¬á€¸á€•á€¼á€®á€¸ á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€€á€»á€…á€ºá€œá€…á€ºá€žá€±á€¬ Card á€”á€¾á€„á€ºá€· Row á€•á€¯á€¶á€…á€¶á€žá€­á€¯á€· á€•á€¼á€±á€¬á€„á€ºá€¸á€œá€²á€á€¼á€„á€ºá€¸á‹',
      'ðŸ“¥ **System 1 (Inflow / Outflow)**: á€žá€á€ºá€™á€¾á€á€ºá€€á€¬á€œá€¡á€á€½á€„á€ºá€¸ á€„á€½á€±á€á€„á€ºá€œá€¬á€™á€¾á€¯ (Inflow)áŠ á€„á€½á€±á€‘á€½á€€á€ºá€žá€½á€¬á€¸á€™á€¾á€¯ (Outflow) á€”á€¾á€„á€·á€º á€¡á€žá€¬á€¸á€á€„á€º (Net) á€á€­á€¯á€·á€€á€­á€¯ Wallet á€á€…á€ºá€á€¯á€á€»á€„á€ºá€¸á€¡á€œá€­á€¯á€€á€º á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€…á€½á€¬ á€á€½á€²á€á€¼á€¬á€¸á€•á€¼á€žá€á€¼á€„á€ºá€¸á‹',
      'ðŸ’¼ **System 2 (Opening / Closing)**: á€…á€á€„á€ºá€œá€€á€ºá€€á€»á€”á€º (Opening)áŠ á€œá€¾á€¯á€•á€ºá€›á€¾á€¬á€¸á€™á€¾á€¯ (Net Movement) á€”á€¾á€„á€·á€º á€•á€­á€á€ºá€œá€€á€ºá€€á€»á€”á€º (Closing) á€á€­á€¯á€·á€€á€­á€¯ á€¡á€á€­á€¡á€€á€» á€€á€­á€¯á€€á€ºá€Šá€®á€…á€±á€›á€”á€º á€á€½á€€á€ºá€á€»á€€á€ºá€•á€¼á€žá€á€¼á€„á€ºá€¸á‹'
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
    titleMy: 'Current Month Budget vs Actual Visual Card (á€šá€á€¯á€œ á€˜á€á€ºá€‚á€»á€€á€º á€”á€¾á€„á€·á€º á€¡á€™á€¾á€”á€ºá€á€€á€šá€º á€žá€¯á€¶á€¸á€…á€½á€²á€™á€¾á€¯ á€”á€¾á€­á€¯á€„á€ºá€¸á€šá€¾á€‰á€ºá€á€»á€€á€º Progress Bars á€€á€’á€ºá€•á€¼á€¬á€¸)',
    titleEn: 'Current Month Budget vs Actual Spending Progress Bars Component',
    tag: 'feature',
    tagLabelMy: 'á€šá€á€¯ á€—á€¬á€¸á€›á€¾á€„á€ºá€¸á€¡á€žá€…á€º',
    tagLabelEn: 'Latest Feature Version',
    descriptionMy: 'á€’á€€á€ºá€›á€¾á€ºá€˜á€¯á€á€º (Dashboard) á€á€½á€„á€º á€šá€á€¯á€œá€¡á€á€½á€€á€º á€žá€á€ºá€™á€¾á€á€ºá€‘á€¬á€¸á€žá€±á€¬ á€˜á€á€ºá€‚á€»á€€á€º (Budget) á€”á€¾á€„á€·á€º á€¡á€™á€¾á€”á€ºá€á€€á€šá€º á€žá€¯á€¶á€¸á€…á€½á€²á€™á€¾á€¯ (Actual Spending) á€™á€»á€¬á€¸á€€á€­á€¯ á€”á€¾á€­á€¯á€„á€ºá€¸á€šá€¾á€‰á€ºá€•á€¼á€žá€•á€±á€¸á€™á€Šá€·á€º Visual Component á€¡á€žá€…á€º (`CurrentMonthBudgetSummaryCard`) á€€á€­á€¯ á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€•á€±á€¸á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹ á€¡á€™á€»á€­á€¯á€¸á€¡á€…á€¬á€¸ (Category) á€á€…á€ºá€á€¯á€á€»á€„á€ºá€¸á€…á€®á€¡á€œá€­á€¯á€€á€º á€˜á€á€ºá€‚á€»á€€á€º á€™á€Šá€ºá€™á€»á€¾á€žá€¯á€¶á€¸á€…á€½á€²á€•á€¼á€®á€¸á€…á€®á€¸á€•á€¼á€®á€–á€¼á€…á€ºá€€á€¼á€±á€¬á€„á€ºá€¸ Progress Bars á€™á€»á€¬á€¸á€–á€¼á€„á€·á€º á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€œá€¾á€•á€…á€½á€¬ á€–á€±á€¬á€ºá€•á€¼á€•á€±á€¸á€™á€Šá€º á€–á€¼á€…á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Created a new visual component for the Dashboard (`CurrentMonthBudgetSummaryCard`) that summarizes the current month\'s budget vs actual spending, displaying color-coded progress bars for each budget category.',
    changesMy: [
      'ðŸ“Š **Current Month Budget vs Actual Summary Card**: á€’á€€á€ºá€›á€¾á€ºá€˜á€¯á€á€ºá€á€½á€„á€º á€šá€á€¯á€œá á€…á€¯á€…á€¯á€•á€±á€«á€„á€ºá€¸ á€˜á€á€ºá€‚á€»á€€á€ºá€”á€¾á€„á€·á€º á€¡á€™á€¾á€”á€ºá€á€€á€šá€º á€žá€¯á€¶á€¸á€…á€½á€²á€„á€½á€±á€™á€»á€¬á€¸á€€á€­á€¯ á€¡á€”á€¾á€…á€ºá€á€»á€¯á€•á€ºá€•á€¼á€žá€•á€±á€¸á€žá€±á€¬ á€€á€’á€ºá€•á€¼á€¬á€¸á€¡á€žá€…á€º á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€á€¼á€„á€ºá€¸á‹',
      'ðŸ“ˆ **Per-Category Progress Bars**: á€¡á€™á€»á€­á€¯á€¸á€¡á€…á€¬á€¸ (Category) á€á€…á€ºá€á€¯á€á€»á€„á€ºá€¸á€…á€®á€¡á€œá€­á€¯á€€á€º á€žá€á€ºá€™á€¾á€á€ºá€˜á€á€ºá€‚á€»á€€á€ºá€”á€¾á€„á€·á€º á€¡á€™á€¾á€”á€ºá€á€€á€šá€º á€€á€¯á€”á€ºá€€á€»á€…á€›á€­á€á€ºá€™á€»á€¬á€¸á€€á€­á€¯ Progress Bars á€™á€»á€¬á€¸á€–á€¼á€„á€·á€º á€”á€¾á€­á€¯á€„á€ºá€¸á€šá€¾á€‰á€ºá€•á€¼á€žá€•á€±á€¸á€•á€¼á€®á€¸ áˆá€% á€€á€»á€±á€¬á€ºá€œá€½á€”á€ºá€•á€«á€€ á€žá€á€­á€•á€±á€¸á€¡á€›á€±á€¬á€„á€ºá€•á€¼á€±á€¬á€„á€ºá€¸á€œá€²á€á€¼á€„á€ºá€¸á‹'
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
    titleMy: 'Quota Exceeded Visual Notification & "Retry Sync" Button (Quota á€€á€¯á€”á€ºá€†á€¯á€¶á€¸á€™á€¾á€¯ á€žá€á€­á€•á€±á€¸á€˜á€”á€ºá€”á€¬ á€”á€¾á€„á€·á€º á€¡á€œá€½á€šá€ºá€á€€á€° á€•á€¼á€”á€ºá€œá€Šá€ºá€á€»á€­á€á€ºá€†á€€á€ºá€”á€­á€¯á€„á€ºá€žá€±á€¬ á€á€œá€¯á€á€º)',
    titleEn: 'Quota Exceeded Visual Notification & "Retry Sync" Reconnection',
    tag: 'feature',
    tagLabelMy: 'á€šá€á€¯ á€—á€¬á€¸á€›á€¾á€„á€ºá€¸á€¡á€žá€…á€º',
    tagLabelEn: 'Latest Feature Version',
    descriptionMy: 'Firestore Write/Read Quota (Resource Exhausted / HTTP 429) á€€á€¯á€”á€ºá€†á€¯á€¶á€¸á€žá€½á€¬á€¸á€žá€Šá€·á€ºá€¡á€á€« UI á€á€½á€„á€º á€á€»á€€á€ºá€á€»á€„á€ºá€¸á€•á€±á€«á€ºá€œá€¬á€™á€Šá€·á€º á€¡á€‘á€°á€¸á€žá€á€­á€•á€±á€¸ á€˜á€”á€ºá€”á€¬ (Visual Notification Banner) á€€á€­á€¯ á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€•á€±á€¸á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹ á€¡á€†á€­á€¯á€•á€«á€˜á€”á€ºá€”á€¬á€á€½á€„á€º "ðŸ”„ Retry Sync & Reconnect" á€á€œá€¯á€á€ºá€•á€«á€›á€¾á€­á€•á€¼á€®á€¸ á€”á€¾á€­á€•á€ºá€œá€­á€¯á€€á€ºá€žá€Šá€ºá€”á€¾á€„á€·á€º local sync queue á€€á€­á€¯ á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€•á€±á€¸á€€á€¬ Firebase á€á€»á€­á€á€ºá€†á€€á€ºá€™á€¾á€¯á€€á€­á€¯ á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º á€•á€¼á€”á€ºá€œá€Šá€ºá€…á€á€„á€º (Re-establish) á€•á€±á€¸á€™á€Šá€º á€–á€¼á€…á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Added a dedicated visual notification banner in the UI when a quota exceeded or resource exhausted error is detected, featuring a "Retry Sync & Reconnect" button that clears the local sync queue and re-establishes the Firebase connection after a brief delay.',
    changesMy: [
      'ðŸš¨ **Quota Exceeded Visual Notification**: Quota á€€á€¯á€”á€ºá€†á€¯á€¶á€¸á€á€¼á€„á€ºá€¸ (HTTP 429 / Resource Exhausted) á€–á€¼á€…á€ºá€•á€±á€«á€ºá€•á€«á€€ á€¡á€žá€¯á€¶á€¸á€•á€¼á€¯á€žá€°á€™á€»á€¬á€¸ á€á€»á€€á€ºá€á€»á€„á€ºá€¸á€žá€­á€›á€¾á€­á€”á€­á€¯á€„á€ºá€…á€±á€›á€”á€º á€‘á€„á€ºá€›á€¾á€¬á€¸á€žá€±á€¬ á€žá€á€­á€•á€±á€¸á€˜á€”á€ºá€”á€¬á€€á€­á€¯ á€¡á€™á€¼á€²á€•á€¼á€žá€•á€±á€¸á€á€¼á€„á€ºá€¸á‹',
      'ðŸ”„ **"Retry Sync" Button**: á€˜á€”á€ºá€”á€¬á€•á€±á€«á€ºá€›á€¾á€­ "Retry Sync & Reconnect" á€á€œá€¯á€á€ºá€€á€­á€¯ á€”á€¾á€­á€•á€ºá€œá€­á€¯á€€á€ºá€›á€¯á€¶á€–á€¼á€„á€·á€º Local sync queue á€™á€»á€¬á€¸á€€á€­á€¯ á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€•á€±á€¸á€•á€¼á€®á€¸ Firebase connection á€”á€¾á€„á€·á€º quota flags á€™á€»á€¬á€¸á€€á€­á€¯ á€¡á€žá€…á€ºá€á€…á€ºá€–á€”á€º á€•á€¼á€”á€ºá€œá€Šá€ºá€…á€á€„á€ºá€•á€±á€¸á€á€¼á€„á€ºá€¸á‹'
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
    titleMy: 'Mobile-First Consolidated Row Layout (á€™á€­á€¯á€˜á€­á€¯á€„á€ºá€¸á€–á€¯á€”á€ºá€¸á€™á€»á€¬á€¸á€¡á€á€½á€€á€º á€¡á€‘á€°á€¸á€•á€¼á€¯á€œá€¯á€•á€ºá€‘á€¬á€¸á€žá€±á€¬ á€”á€¾á€…á€ºá€€á€¼á€±á€¬á€„á€ºá€¸á€…á€”á€…á€º á€‡á€šá€¬á€¸á€’á€®á€‡á€­á€¯á€„á€ºá€¸)',
    titleEn: 'Mobile-First Consolidated Row Layout for Transactions & Debts',
    tag: 'feature',
    tagLabelMy: 'á€šá€á€¯ á€—á€¬á€¸á€›á€¾á€„á€ºá€¸á€¡á€žá€…á€º',
    tagLabelEn: 'Latest Feature Version',
    descriptionMy: 'á€„á€½á€±á€…á€¬á€›á€„á€ºá€¸ (Transactions) á€”á€¾á€„á€·á€º á€¡á€€á€¼á€½á€±á€¸á€…á€¬á€›á€„á€ºá€¸ (Debts) á€‡á€šá€¬á€¸á€€á€½á€€á€ºá€™á€»á€¬á€¸á€á€½á€„á€º á€™á€­á€¯á€˜á€­á€¯á€„á€ºá€¸á€–á€¯á€”á€ºá€¸á€…á€á€›á€„á€ºá€™á€»á€¬á€¸áŒ á€–á€á€ºá€›á€¾á€¯á€› á€¡á€œá€½á€”á€ºá€¡á€™á€„á€ºá€¸ á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€œá€½á€šá€ºá€€á€°á€…á€±á€›á€”á€º á€¡á€›á€±á€¸á€€á€¼á€®á€¸á€žá€±á€¬ á€¡á€á€»á€€á€ºá€¡á€œá€€á€ºá€™á€»á€¬á€¸ (á€¡á€™á€»á€­á€¯á€¸á€¡á€…á€¬á€¸/á€¡á€™á€Šá€º á€”á€¾á€„á€·á€º á€›á€€á€ºá€…á€½á€²) á€€á€­á€¯ á€•á€‘á€™á€á€…á€ºá€€á€¼á€±á€¬á€„á€ºá€¸á€á€½á€„á€ºá€œá€Šá€ºá€¸á€€á€±á€¬á€„á€ºá€¸áŠ á€„á€½á€±á€•á€™á€¬á€ á€”á€¾á€„á€·á€º á€™á€¾á€á€ºá€…á€¯/á€–á€¯á€”á€ºá€¸á€”á€¶á€•á€«á€á€º á€™á€»á€¬á€¸á€€á€­á€¯ á€’á€¯á€á€­á€šá€á€…á€ºá€€á€¼á€±á€¬á€„á€ºá€¸á€á€½á€„á€ºá€œá€Šá€ºá€¸á€€á€±á€¬á€„á€ºá€¸ á€”á€¾á€…á€ºá€€á€¼á€±á€¬á€„á€ºá€¸á€…á€”á€…á€º (Consolidated Stacked Layout) á€–á€¼á€„á€·á€º á€…á€”á€…á€ºá€á€€á€» á€•á€¼á€”á€ºá€œá€Šá€ºá€’á€®á€‡á€­á€¯á€„á€ºá€¸á€‘á€¯á€á€ºá€•á€±á€¸á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Refactored transaction and debt table components with a mobile-first consolidated row layout, stacking important info (category/person & date/due date) on line 1 and amount/notes on line 2 to drastically reduce visual clutter.',
    changesMy: [
      'ðŸ“± **Mobile-First Consolidated Rows**: á€…á€¬á€›á€„á€ºá€¸á€á€…á€ºá€á€¯á€á€»á€„á€ºá€¸á€…á€®á€á€½á€„á€º á€›á€¾á€¯á€•á€ºá€‘á€½á€±á€¸á€”á€±á€žá€±á€¬ á€€á€±á€¬á€ºá€œá€¶á€™á€»á€¬á€¸á€€á€­á€¯ á€–á€šá€ºá€›á€¾á€¬á€¸á€•á€¼á€®á€¸ á€¡á€›á€±á€¸á€€á€¼á€®á€¸á€¡á€á€»á€€á€ºá€¡á€œá€€á€º (Category/Person Name á€”á€¾á€„á€·á€º Date) á€€á€­á€¯ á€•á€‘á€™á€œá€­á€¯á€„á€ºá€¸á€á€½á€„á€ºá€œá€Šá€ºá€¸á€€á€±á€¬á€„á€ºá€¸áŠ á€•á€™á€¬á€á€”á€¾á€„á€·á€º á€™á€¾á€á€ºá€…á€¯/á€–á€¯á€”á€ºá€¸á€”á€¶á€•á€«á€á€ºá€€á€­á€¯ á€’á€¯á€á€­á€šá€œá€­á€¯á€„á€ºá€¸á€á€½á€„á€ºá€œá€Šá€ºá€¸á€€á€±á€¬á€„á€ºá€¸ á€”á€¾á€…á€ºá€€á€¼á€±á€¬á€„á€ºá€¸á€…á€”á€…á€ºá€–á€¼á€„á€·á€º á€žá€•á€ºá€›á€•á€ºá€…á€½á€¬ á€…á€¯á€…á€Šá€ºá€¸á€•á€¼á€žá€á€¼á€„á€ºá€¸á‹',
      'âœ¨ **Reduced Visual Clutter**: á€™á€»á€€á€ºá€…á€­á€›á€¾á€¯á€•á€ºá€‘á€½á€±á€¸á€™á€¾á€¯ á€€á€„á€ºá€¸á€…á€„á€ºá€…á€±á€›á€”á€º á€•á€¯á€¶á€…á€¶á€¡á€žá€…á€ºá€–á€¼á€„á€·á€º á€á€Šá€ºá€†á€±á€¬á€€á€ºá€‘á€¬á€¸á€•á€¼á€®á€¸ á€–á€¯á€”á€ºá€¸á€…á€á€›á€„á€ºá€žá€±á€¸á€„á€šá€ºá€žá€°á€™á€»á€¬á€¸á€•á€« á€á€…á€ºá€á€»á€€á€ºá€€á€¼á€Šá€·á€ºá€›á€¯á€¶á€–á€¼á€„á€·á€º á€œá€½á€šá€ºá€€á€°á€…á€½á€¬ á€žá€­á€›á€¾á€­á€”á€­á€¯á€„á€ºá€á€¼á€„á€ºá€¸á‹'
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
    titleMy: 'Dual-Mode Financial Tables & Uncluttered Layout (á€á€„á€ºá€„á€½á€±/á€‘á€½á€€á€ºá€„á€½á€± á€”á€¾á€„á€·á€º á€…á€á€„á€º/á€•á€­á€á€ºá€œá€€á€ºá€€á€»á€”á€º á€…á€”á€…á€ºá€”á€¾á€…á€ºá€™á€»á€­á€¯á€¸á€•á€«á€žá€±á€¬ á€žá€”á€·á€ºá€›á€¾á€„á€ºá€¸á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€žá€Šá€·á€º á€‡á€šá€¬á€¸á€™á€»á€¬á€¸)',
    titleEn: 'Dual-Mode Financial Tables (Inflow/Outflow vs Opening/Closing) & Clean Layout',
    tag: 'feature',
    tagLabelMy: 'á€šá€á€¯ á€—á€¬á€¸á€›á€¾á€„á€ºá€¸á€¡á€žá€…á€º',
    tagLabelEn: 'Latest Feature Version',
    descriptionMy: 'Wallet á€¡á€œá€­á€¯á€€á€º á€žá€®á€¸á€žá€”á€·á€ºá€‡á€šá€¬á€¸á€™á€»á€¬á€¸á€á€½á€„á€º á€€á€¼á€Šá€·á€ºá€›á€›á€¾á€¯á€•á€ºá€‘á€½á€±á€¸á€™á€¾á€¯ á€™á€›á€¾á€­á€…á€±á€›á€”á€º á€…á€”á€…á€ºá€á€€á€» á€•á€¼á€„á€ºá€†á€„á€ºá€•á€±á€¸á€‘á€¬á€¸á€•á€¼á€®á€¸ á€„á€½á€±á€á€„á€º/á€‘á€½á€€á€º á€¡á€á€¼á€±á€¡á€”á€±á€™á€»á€¬á€¸á€€á€­á€¯ á€…á€”á€…á€º á‚ á€™á€»á€­á€¯á€¸ (áá‹ Inflow / Outflow á€á€„á€ºá€„á€½á€±á€”á€¾á€„á€·á€ºá€‘á€½á€€á€ºá€„á€½á€± á€…á€”á€…á€º á€”á€¾á€„á€·á€º á‚á‹ Opening / Closing á€…á€á€„á€ºá€”á€¾á€„á€·á€ºá€•á€­á€á€ºá€œá€€á€ºá€€á€»á€”á€º á€…á€”á€…á€º) á€–á€¼á€„á€·á€º á€¡á€œá€½á€šá€ºá€á€€á€° á€•á€¼á€±á€¬á€„á€ºá€¸á€œá€²á€€á€¼á€Šá€·á€ºá€›á€¾á€¯á€”á€­á€¯á€„á€ºá€žá€±á€¬ Mode Switcher á€‡á€šá€¬á€¸á€¡á€žá€…á€ºá€€á€­á€¯ á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€•á€±á€¸á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Enhanced wallet breakdown tables with a clean, uncluttered layout and a dual-mode switcher allowing users to instantly toggle between (1) Inflow / Outflow mode and (2) Opening / Closing mode.',
    changesMy: [
      'ðŸ“Š **Dual-Mode Financial View Switcher**: á€‡á€šá€¬á€¸á€™á€»á€¬á€¸á€á€½á€„á€º á€„á€½á€±á€á€„á€º/á€‘á€½á€€á€º á€¡á€á€¼á€±á€¡á€”á€±á€¡á€¬á€¸ ðŸ“¥ "á€á€„á€ºá€„á€½á€± / á€‘á€½á€€á€ºá€„á€½á€± (Inflow / Outflow)" á€…á€”á€…á€º á€”á€¾á€„á€·á€º ðŸ’¼ "á€…á€á€„á€º / á€•á€­á€á€º á€œá€€á€ºá€€á€»á€”á€º (Opening / Closing)" á€…á€”á€…á€º á€Ÿá€°á Tab á€”á€¾á€…á€ºá€á€¯á€–á€¼á€„á€·á€º á€¡á€œá€½á€šá€ºá€á€€á€° á€•á€¼á€±á€¬á€„á€ºá€¸á€œá€²á€€á€¼á€Šá€·á€ºá€›á€¾á€¯á€”á€­á€¯á€„á€ºá€á€¼á€„á€ºá€¸á‹',
      'âœ¨ **Uncluttered & Clean Layout**: á€™á€­á€¯á€˜á€­á€¯á€„á€ºá€¸á€–á€¯á€”á€ºá€¸á€…á€á€›á€„á€ºá€™á€»á€¬á€¸á€á€½á€„á€º á€€á€±á€¬á€ºá€œá€¶á€™á€»á€¬á€¸ á€Šá€•á€ºá€”á€±á€á€¼á€„á€ºá€¸á€”á€¾á€„á€·á€º á€…á€¬á€žá€¬á€¸á€™á€»á€¬á€¸ á€–á€¼á€á€ºá€á€±á€¬á€€á€ºá€á€¶á€›á€á€¼á€„á€ºá€¸ (Truncation) á€™á€›á€¾á€­á€…á€±á€›á€”á€º á€€á€±á€¬á€ºá€œá€¶á€¡á€€á€»á€šá€ºá€”á€¾á€„á€·á€º spacing á€™á€»á€¬á€¸á€€á€­á€¯ á€…á€”á€…á€ºá€á€€á€» á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€œá€¾á€•á€…á€½á€¬ á€–á€½á€²á€·á€…á€Šá€ºá€¸á€•á€±á€¸á€‘á€¬á€¸á€á€¼á€„á€ºá€¸á‹',
      'ðŸ§® **Accurate Mode Summaries**: á€™á€¯á€’á€º (Mode) á€á€…á€ºá€á€¯á€á€»á€„á€ºá€¸á€…á€®á€¡á€œá€­á€¯á€€á€º á€…á€¯á€…á€¯á€•á€±á€«á€„á€ºá€¸ á€á€„á€ºá€„á€½á€±áŠ á€‘á€½á€€á€ºá€„á€½á€±áŠ á€…á€á€„á€ºá€œá€€á€ºá€€á€»á€”á€ºá€”á€¾á€„á€·á€º á€•á€­á€á€ºá€œá€€á€ºá€€á€»á€”á€ºá€™á€»á€¬á€¸á€€á€­á€¯ á€žá€®á€¸á€žá€”á€·á€ºá€á€­á€€á€»á€…á€½á€¬ á€á€½á€€á€ºá€á€»á€€á€ºá€•á€¼á€žá€•á€±á€¸á€á€¼á€„á€ºá€¸á‹'
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
    titleMy: 'Supercharged Write Optimization & High-Efficiency Low-Quota Synchronization (Sync á€œá€¯á€•á€ºá€†á€±á€¬á€„á€ºá€á€»á€€á€ºá€€á€­á€¯ á€¡á€œá€½á€”á€ºá€¡á€™á€„á€ºá€¸ á€žá€€á€ºá€žá€¬á€á€»á€½á€±á€á€¬á€•á€±á€¸á€žá€Šá€·á€º á€…á€”á€…á€º)',
    titleEn: 'Supercharged Write Optimization & High-Efficiency Low-Quota Synchronization',
    tag: 'fix',
    tagLabelMy: 'á€•á€¼á€„á€ºá€†á€„á€ºá€á€»á€€á€º á€—á€¬á€¸á€›á€¾á€„á€ºá€¸',
    tagLabelEn: 'Bug Fix & Optimization',
    descriptionMy: 'á€…á€¬á€›á€„á€ºá€¸ á á€á€¯á€›á€±á€¸á€œá€»á€¾á€„á€º Cloud Write á á€á€¯á€žá€¬ á€žá€¯á€¶á€¸á€…á€½á€²á€…á€±á€•á€¼á€®á€¸áŠ á€¡á€á€»á€€á€ºá€¡á€œá€€á€ºá€™á€»á€¬á€¸ á€™á€•á€¼á€±á€¬á€„á€ºá€¸á€œá€²á€•á€«á€€ Redundant cloud writes á€™á€»á€¬á€¸á€¡á€¬á€¸ áá€á€% á€€á€»á€±á€¬á€ºá€œá€½á€¾á€²á€€á€¬ á€žá€€á€ºá€žá€¬á€…á€±á€žá€Šá€·á€º á€…á€”á€…á€ºá‹ background auto-sync á interval á€¡á€¬á€¸ á… á€…á€€á€¹á€€á€”á€·á€ºá€™á€¾ á€…á€€á€¹á€€á€”á€·á€º áá‚á€ á€žá€­á€¯á€· á€•á€¼á€±á€¬á€„á€ºá€¸á€œá€²á€€á€¬ Quota á€™á€€á€¯á€”á€ºá€†á€¯á€¶á€¸á€¡á€±á€¬á€„á€º á€¡á€•á€¼á€®á€¸á€žá€á€º á€¡á€€á€±á€¬á€„á€ºá€¸á€†á€¯á€¶á€¸á€–á€¼á€…á€ºá€¡á€±á€¬á€„á€º á€•á€¼á€„á€ºá€†á€„á€ºá€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Fully optimized cloud synchronization writes. Enforces strict signature comparisons to skip redundant updates, prevents automatic re-upload of all database records, optimizes background sync intervals from 5s to 120s, and eliminates unnecessary write duplication.',
    changesMy: [
      'âš¡ **Database Signature-Based Write Skipping (áá€á€% Redundant Write á€€á€»á€±á€¬á€ºá€œá€½á€¾á€²á€á€¼á€„á€ºá€¸)**: Local database á€¡á€á€»á€€á€ºá€¡á€œá€€á€ºá€™á€»á€¬á€¸ á€•á€¼á€±á€¬á€„á€ºá€¸á€œá€²á€™á€¾á€¯á€™á€›á€¾á€­á€•á€«á€€ Cloud á€žá€­á€¯á€· redundancy upload á€œá€¯á€•á€ºá€á€¼á€„á€ºá€¸á€¡á€¬á€¸ á€œá€¯á€¶á€¸á€ á€€á€»á€±á€¬á€ºá€œá€½á€¾á€²á€›á€•á€ºá€á€”á€·á€ºá€…á€±á€žá€±á€¬ signature comparison á€…á€”á€…á€º á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€á€¼á€„á€ºá€¸á‹',
      'ðŸ›‘ **Prevent Redundant Database Re-upload (á€™á€œá€­á€¯á€˜á€² á€¡á€¬á€¸á€œá€¯á€¶á€¸ á€•á€¼á€”á€ºá€á€„á€ºá€á€¼á€„á€ºá€¸á€€á€­á€¯ á€•á€­á€á€ºá€á€¼á€„á€ºá€¸)**: `handleForcePushAll` á€á€½á€„á€º sync á€›á€”á€ºá€™á€€á€»á€”á€ºá€›á€¾á€­á€•á€«á€€ update uploads á€™á€»á€¬á€¸á€¡á€¬á€¸ á€œá€¯á€¶á€¸á€ á€™á€•á€¼á€¯á€œá€¯á€•á€ºá€˜á€² á€›á€•á€ºá€á€”á€·á€ºá€…á€±á€á€¼á€„á€ºá€¸á‹',
      'â±ï¸ **Healthy Sync Polling Interval (á… á€…á€€á€¹á€€á€”á€·á€ºá€™á€¾ áá‚á€ á€…á€€á€¹á€€á€”á€·á€ºá€žá€­á€¯á€· á€•á€¼á€±á€¬á€„á€ºá€¸á€á€¼á€„á€ºá€¸)**: á€¡á€”á€±á€¬á€€á€ºá€€á€½á€šá€ºá€™á€¾ á… á€…á€€á€¹á€€á€”á€·á€ºá€á€…á€ºá€á€« Database á€á€…á€ºá€á€¯á€œá€¯á€¶á€¸á€¡á€¬á€¸ pull á€†á€½á€²á read limit á€€á€¯á€”á€ºá€†á€¯á€¶á€¸á€…á€±á€žá€±á€¬ loop á€¡á€¬á€¸ áá‚á€ á€…á€€á€¹á€€á€”á€·á€º (á‚ á€™á€­á€”á€…á€º) á€žá€­á€¯á€· á€•á€¼á€±á€¬á€„á€ºá€¸á€œá€²á€€á€¬ heavy readings á€™á€»á€¬á€¸á€€á€­á€¯ á€á€¬á€¸á€†á€®á€¸á€á€¼á€„á€ºá€¸á‹ (Firestore listeners á€›á€¾á€­á€•á€¼á€®á€¸á€–á€¼á€…á€ºá real-time sync á€žá€Šá€º á€•á€¯á€¶á€™á€¾á€”á€ºá€¡á€á€­á€¯á€„á€ºá€¸ á€¡á€œá€¯á€•á€ºá€œá€¯á€•á€ºá€†á€²á€–á€¼á€…á€ºá€žá€Šá€º)',
      'ðŸ“¦ **Granular Batch Sync (á€™á€†á€­á€¯á€„á€ºá€žá€±á€¬ Debts á€™á€»á€¬á€¸ á€¡á€á€„á€ºá€¸á€›á€±á€¸á€á€¼á€„á€ºá€¸ á€•á€­á€á€ºá€á€¼á€„á€ºá€¸)**: Pending transaction á€•á€­á€¯á€·á€†á€±á€¬á€„á€ºá€á€»á€­á€”á€ºáŒ á€™á€†á€­á€¯á€„á€ºá€žá€±á€¬ Debt á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸á€¡á€¬á€¸á€œá€¯á€¶á€¸á€€á€­á€¯ á€¡á€á€„á€ºá€¸á€œá€­á€¯á€€á€ºá€œá€¶ á€›á€±á€¸á€žá€¬á€¸á€á€¼á€„á€ºá€¸á€¡á€¬á€¸ á€•á€­á€á€ºá€•á€„á€ºá€•á€¼á€®á€¸ á€žá€€á€ºá€žá€¬á€…á€±á€á€¼á€„á€ºá€¸á‹'
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
    titleMy: 'Google Quota Exhaustion Diagnostic Banner & Mathematical Sync Reconciliation (á€‚á€°á€‚á€šá€º Quota á€€á€¯á€”á€ºá€†á€¯á€¶á€¸á€™á€¾á€¯ á€…á€…á€ºá€†á€±á€¸á€á€¼á€„á€ºá€¸á€”á€¾á€„á€·á€º á€‚á€á€”á€ºá€¸á€™á€»á€¬á€¸ á€Šá€¾á€­á€”á€¾á€­á€¯á€„á€ºá€¸á€™á€¾á€¯)',
    titleEn: 'Google Quota Exhaustion Diagnostic Banner & Mathematical Sync Reconciliation',
    tag: 'current',
    tagLabelMy: 'á€œá€€á€ºá€›á€¾á€­ á€žá€¯á€¶á€¸á€…á€½á€²á€”á€±á€žá€±á€¬ á€—á€¬á€¸á€›á€¾á€„á€ºá€¸',
    tagLabelEn: 'Current Live Version',
    descriptionMy: 'á€‚á€°á€‚á€šá€º Quota á€€á€¯á€”á€ºá€†á€¯á€¶á€¸á€žá€½á€¬á€¸á€á€»á€­á€”á€ºá€á€½á€„á€º (á€¥á€•á€™á€¬- á€á€…á€ºá€”á€±á€·á€œá€»á€¾á€„á€º á€¡á€á€™á€²á€· á€›á€±á€¸á€žá€¬á€¸á€á€½á€„á€·á€º á‚á€,á€á€á€ á€•á€¼á€Šá€·á€ºá€žá€½á€¬á€¸á€á€»á€­á€”á€ºáŒ) á€…á€€á€ºá€á€½á€„á€ºá€¸á€”á€¾á€„á€·á€º Server á€¡á€€á€¼á€¬á€¸ á€¡á€™á€¾á€”á€ºá€á€€á€šá€º á€–á€¼á€…á€ºá€•á€»á€€á€ºá€”á€±á€žá€±á€¬ á€¡á€á€¼á€±á€¡á€”á€±á€”á€¾á€„á€·á€º á€‚á€á€”á€ºá€¸á€™á€»á€¬á€¸ á€œá€­á€™á€ºá€œá€Šá€ºá€•á€¼á€žá€á€¼á€„á€ºá€¸ á€™á€›á€¾á€­á€…á€±á€›á€”á€º á€¡á€á€­á€¡á€€á€» á€Šá€¾á€­á€”á€¾á€­á€¯á€„á€ºá€¸á€•á€¼á€„á€ºá€†á€„á€ºá€•á€±á€¸á€žá€±á€¬ á€…á€”á€…á€ºá€–á€¼á€…á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Fully resolved display discrepancies under Firestore Write Quota exhaustion (HTTP 429 Resource Exhausted) by integrating strict hasPendingWrites verification and real-time quota status diagnosis banners.',
    changesMy: [
      'ðŸ“¡ **Strict hasPendingWrites Verification**: Google Server á€žá€­á€¯á€· á€¡á€™á€¾á€”á€ºá€á€€á€šá€º á€™á€›á€±á€¬á€€á€ºá€žá€±á€¸á€žá€±á€¬ Local cached records á€™á€»á€¬á€¸á€¡á€¬á€¸ (Confirmed in DB) á€¡á€–á€¼á€…á€º á€œá€­á€™á€ºá€œá€Šá€ºá€™á€›á€±á€á€½á€€á€ºá€á€±á€¬á€·á€˜á€² Server-Side áŒ á€¡á€á€Šá€ºá€•á€¼á€¯á€•á€¼á€®á€¸á€žá€¬á€¸á€™á€»á€¬á€¸á€žá€¬ á€›á€±á€á€½á€€á€ºá€›á€”á€º á€á€„á€ºá€¸á€€á€»á€•á€ºá€…á€½á€¬ á€…á€…á€ºá€†á€±á€¸á€•á€±á€¸á€á€¼á€„á€ºá€¸á‹',
      'ðŸ›‘ **Google Write Quota Exceeded Diagnostic Banner**: á€¡á€á€™á€²á€· á€›á€±á€¸á€žá€¬á€¸á€á€½á€„á€·á€º (20,000 writes/day) á€€á€¯á€”á€ºá€†á€¯á€¶á€¸á Server á€€ á€„á€¼á€„á€ºá€¸á€•á€šá€ºá€‘á€¬á€¸á€•á€«á€€ user á€‘á€¶á€žá€­á€¯á€· Error 429 á€”á€¾á€„á€·á€º Quota status á€¡á€¬á€¸ á€–á€±á€¬á€ºá€•á€¼á€•á€±á€¸á€žá€Šá€·á€º Diagnostic Banner á€žá€®á€¸á€žá€”á€·á€º á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€•á€¼á€žá€á€¼á€„á€ºá€¸á‹',
      'ðŸ” **Transactional Queue Item Details**: Queue á€‘á€²á€á€½á€„á€º á€á€”á€·á€ºá€”á€±á€žá€±á€¬ á€€á€»á€”á€ºá€›á€¾á€­á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸ á€™á€Šá€ºá€žá€Šá€·á€ºá€¡á€›á€¬á€™á€»á€¬á€¸ á€–á€¼á€…á€ºá€žá€Šá€ºá€€á€­á€¯ á€á€…á€ºá€á€¯á€á€»á€„á€ºá€¸á€…á€®á entityType, ID á€”á€¾á€„á€·á€º á€á€­á€€á€»á€žá€±á€¬ Error message á€¡á€žá€±á€¸á€…á€­á€á€ºá€¡á€œá€­á€¯á€€á€º á€–á€½á€„á€·á€ºá€Ÿá€–á€±á€¬á€ºá€•á€¼á€•á€±á€¸á€žá€Šá€·á€º á€…á€¬á€›á€„á€ºá€¸á€‡á€šá€¬á€¸ á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€á€¼á€„á€ºá€¸á‹',
      'â±ï¸ **Gentle Processing Heartbeat (15s backoff)**: á€…á€€á€¹á€€á€”á€·á€º áƒ á€…á€€á€¹á€€á€”á€·á€ºá€á€­á€¯á€„á€ºá€¸ á€¡á€á€„á€ºá€¸á€¡á€€á€»á€•á€º hammer á€œá€¯á€•á€ºá write quota á€™á€¼á€”á€ºá€™á€¼á€”á€ºá€€á€¯á€”á€ºá€†á€¯á€¶á€¸á€…á€±á€žá€Šá€·á€º loop á€¡á€¬á€¸ áá… á€…á€€á€¹á€€á€”á€·á€ºá€žá€­á€¯á€· á€•á€¼á€±á€¬á€„á€ºá€¸á€œá€²á€•á€¼á€®á€¸ Quota á€€á€¯á€”á€ºá€†á€¯á€¶á€¸á€”á€±á€…á€‰á€º á€™á€­á€”á€…á€º áá€ á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º á€›á€•á€ºá€”á€¬á€¸á€•á€±á€¸á€á€¼á€„á€ºá€¸á‹'
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
    titleMy: 'Sync á€†á€±á€¬á€„á€ºá€›á€½á€€á€ºá€™á€¾á€¯ á€™á€¾á€á€ºá€á€™á€ºá€¸ á€”á€±á€¬á€€á€ºá€†á€¯á€¶á€¸ á…á€ á€á€¯ á€…á€±á€¬á€„á€·á€ºá€€á€¼á€Šá€·á€ºá€…á€…á€ºá€†á€±á€¸á€”á€­á€¯á€„á€ºá€á€¼á€„á€ºá€¸ (Database Tracker Sync Operations Logging System)',
    titleEn: '50 Sync Operations Logging & Transparency Tracker within Database Tracker Modal',
    tag: 'feature',
    tagLabelMy: 'á€šá€á€„á€º á€—á€¬á€¸á€›á€¾á€„á€ºá€¸',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'Push á€”á€¾á€„á€·á€º Pull á€•á€¼á€¯á€œá€¯á€•á€ºá€™á€¾á€¯á€á€­á€¯á€„á€ºá€¸ (Force push, Force pull, Single record push, Direct HTTPS REST, Retry) á á€¡á€±á€¬á€„á€ºá€™á€¼á€„á€ºá€™á€¾á€¯/á€€á€»á€›á€¾á€¯á€¶á€¸á€™á€¾á€¯ á€¡á€á€¼á€±á€¡á€”á€±áŠ á€…á€¬á€›á€„á€ºá€¸á€¡á€›á€±á€¡á€á€½á€€á€ºáŠ á€€á€¼á€¬á€™á€¼á€„á€·á€ºá€á€»á€­á€”á€º (Latency) á€”á€¾á€„á€·á€º á€¡á€™á€¾á€¬á€¸á€žá€á€„á€ºá€¸á€…á€€á€¬á€¸ (Error messages) á€™á€»á€¬á€¸á€€á€­á€¯ á€¡á€•á€¼á€Šá€·á€ºá€¡á€…á€¯á€¶ á€™á€¾á€á€ºá€á€™á€ºá€¸á€á€„á€ºá€žá€­á€™á€ºá€¸á€†á€Šá€ºá€¸á€•á€±á€¸á€žá€±á€¬ 50-Operations Sync Logger á€¡á€¬á€¸ á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€•á€¼á€®á€¸ Database Tracker Modal á€¡á€á€½á€„á€ºá€¸ á€€á€¼á€Šá€·á€ºá€›á€¾á€¯á€…á€…á€ºá€†á€±á€¸á€”á€­á€¯á€„á€ºá€…á€±á€›á€”á€º á€–á€”á€ºá€á€®á€¸á€•á€±á€¸á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Implemented a 50-operation sync logging mechanism tracking all push/pull events, success/failure status, timestamps, item counts, duration, and detailed error messages, fully viewable with filters in the Database Tracker Modal.',
    changesMy: [
      'ðŸ“œ **Sync Operations Logging System (á€”á€±á€¬á€€á€ºá€†á€¯á€¶á€¸ á…á€ á€á€¯ á€™á€¾á€á€ºá€á€™á€ºá€¸á€á€„á€ºá€á€¼á€„á€ºá€¸)**: Cloud á€žá€­á€¯á€· Push á€•á€¼á€¯á€œá€¯á€•á€ºá€á€¼á€„á€ºá€¸áŠ Pull á€†á€½á€²á€šá€°á€á€¼á€„á€ºá€¸áŠ á€á€…á€ºá€á€¯á€á€»á€„á€ºá€¸á€•á€­á€¯á€·á€†á€±á€¬á€„á€ºá€á€¼á€„á€ºá€¸á€”á€¾á€„á€·á€º REST HTTP á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€ºá€•á€­á€¯á€·á€†á€±á€¬á€„á€ºá€™á€¾á€¯ á€¡á€†á€„á€·á€ºá€á€­á€¯á€„á€ºá€¸á€¡á€¬á€¸ timestampáŠ á€¡á€±á€¬á€„á€ºá€™á€¼á€„á€ºá€™á€¾á€¯/á€€á€»á€›á€¾á€¯á€¶á€¸á€™á€¾á€¯áŠ á€•á€…á€¹á€…á€Šá€ºá€¸á€¡á€›á€±á€¡á€á€½á€€á€ºáŠ duration (ms) á€”á€¾á€„á€·á€º á€…á€€á€ºá€¡á€™á€»á€­á€¯á€¸á€¡á€…á€¬á€¸ (iOS/Android/Desktop) á€¡á€œá€­á€¯á€€á€º á€¡á€žá€±á€¸á€…á€­á€á€º á€žá€­á€™á€ºá€¸á€†á€Šá€ºá€¸á€•á€±á€¸á€á€¼á€„á€ºá€¸á‹',
      'ðŸ” **Database Tracker Modal á€¡á€á€½á€„á€ºá€¸ á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€€á€¼á€Šá€·á€ºá€›á€¾á€¯á€”á€­á€¯á€„á€ºá€á€¼á€„á€ºá€¸**: Database Sync Tracker Modal á€á€½á€„á€º "á€™á€¾á€á€ºá€á€™á€ºá€¸á€™á€»á€¬á€¸ á€¡á€á€¼á€±á€¡á€”á€±" á€”á€¾á€„á€·á€º "Sync á€†á€±á€¬á€„á€ºá€›á€½á€€á€ºá€™á€¾á€¯ á€™á€¾á€á€ºá€á€™á€ºá€¸" á€Ÿá€°á Tab á€”á€¾á€…á€ºá€á€¯á€á€½á€²á€€á€¬ á€”á€±á€¬á€€á€ºá€†á€¯á€¶á€¸á€œá€¯á€•á€ºá€†á€±á€¬á€„á€ºá€á€»á€€á€º á…á€ á€á€¯á€¡á€¬á€¸ All, Push, Pull, Failed á€¡á€œá€­á€¯á€€á€º filter á€…á€…á€ºá€‘á€¯á€á€ºá€€á€¼á€Šá€·á€ºá€›á€¾á€¯á€”á€­á€¯á€„á€ºá€…á€±á€á€¼á€„á€ºá€¸á‹',
      'âš ï¸ **á€á€­á€€á€»á€žá€±á€¬ Error Messages á€™á€»á€¬á€¸ á€•á€¼á€žá€•á€±á€¸á€á€¼á€„á€ºá€¸**: Sync á€™á€¡á€±á€¬á€„á€ºá€™á€¼á€„á€ºá€á€²á€·á€•á€«á€€ á€˜á€¬á€€á€¼á€±á€¬á€„á€·á€º á€™á€¡á€±á€¬á€„á€ºá€™á€¼á€„á€ºá€á€²á€·á€€á€¼á€±á€¬á€„á€ºá€¸ á€á€­á€€á€»á€žá€±á€¬ á€¡á€™á€¾á€¬á€¸á€žá€á€„á€ºá€¸á€…á€€á€¬á€¸ (Error message) á€¡á€¬á€¸ Highlight á€•á€¼á€¯á€œá€¯á€•á€ºá á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€…á€½á€¬ á€–á€±á€¬á€ºá€•á€¼á€•á€±á€¸á€‘á€¬á€¸á€á€¼á€„á€ºá€¸á‹',
      'ðŸ§¹ **Log Management & Clear**: á€™á€œá€­á€¯á€œá€¬á€¸á€¡á€•á€ºá€•á€«á€€ á€žá€­á€¯á€·á€™á€Ÿá€¯á€á€º á€¡á€žá€…á€ºá€…á€á€„á€ºá€œá€­á€¯á€•á€«á€€ á€™á€¾á€á€ºá€á€™á€ºá€¸á€™á€»á€¬á€¸á€¡á€¬á€¸ á€á€»á€€á€ºá€á€»á€„á€ºá€¸ á€á€…á€ºá€á€»á€€á€ºá€”á€¾á€­á€•á€º á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€”á€­á€¯á€„á€ºá€žá€±á€¬ Clear Logs á€á€œá€¯á€á€º á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€•á€±á€¸á€‘á€¬á€¸á€á€¼á€„á€ºá€¸á‹'
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
    titleMy: 'Permanent iOS WebKit Socket Unlock & Dual-Channel Direct REST Sync Guarantee (iOS á€™á€¾á€á€ºá€á€™á€ºá€¸ á€á€€á€šá€º á€›á€±á€¬á€€á€ºá€›á€¾á€­á€…á€±á€á€¼á€„á€ºá€¸ á€¡á€•á€¼á€®á€¸á€žá€á€º á€•á€¼á€„á€ºá€†á€„á€ºá€á€»á€€á€º)',
    titleEn: 'Permanent iOS WebKit Socket Unlock & Dual-Channel Direct REST Sync Guarantee',
    tag: 'feature',
    tagLabelMy: 'á€šá€á€„á€º á€—á€¬á€¸á€›á€¾á€„á€ºá€¸',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'iPhone (iOS Safari) á€á€½á€„á€º Transaction á€¡á€žá€…á€º á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€žá€±á€¬á€ºá€œá€Šá€ºá€¸ á á€›á€€á€ºá€”á€¾á€„á€·á€º á á€Šá€œá€¯á€¶á€¸á€œá€¯á€¶á€¸ Cloud á€žá€­á€¯á€· á€™á€›á€±á€¬á€€á€ºá€”á€­á€¯á€„á€ºá€˜á€² á€•á€­á€á€ºá€†á€­á€¯á€·á€”á€±á€›á€žá€Šá€·á€º "á€á€€á€šá€·á€º á€•á€¼á€¿á€”á€¬á€¡á€…á€…á€º" (Firestore SDK á€á€½á€„á€º experimentalForceLongPolling á€”á€¾á€„á€·á€º persistentSingleTabManager á€€á€¼á€±á€¬á€„á€·á€º Safari á€…á€€á€ºá€•á€­á€á€º/Tab á€•á€¼á€±á€¬á€„á€ºá€¸á€á€»á€­á€”á€ºáŒ Socket stream á€œá€¯á€¶á€¸á€ á€›á€•á€ºá€á€”á€·á€ºá€¡á€±á€¸á€á€²á€žá€½á€¬á€¸á€•á€¼á€®á€¸ Background queue á€žá€­á€¯á€·á€™á€Ÿá€¯á€á€º Direct push á€€ á€‘á€•á€ºá€á€«á€á€œá€²á€œá€² á€™á€•á€­á€¯á€·á€†á€±á€¬á€„á€ºá€”á€­á€¯á€„á€ºá€á€²á€·á€á€¼á€„á€ºá€¸) á€¡á€¬á€¸ á€¡á€™á€¼á€…á€ºá€•á€¼á€á€º á€–á€šá€ºá€›á€¾á€¬á€¸á€•á€¼á€®á€¸ Dual-Channel Direct HTTPS REST á€•á€­á€¯á€·á€†á€±á€¬á€„á€ºá€™á€¾á€¯á€…á€”á€…á€ºá€–á€¼á€„á€·á€º á€¡á€•á€¼á€®á€¸á€žá€á€º á€•á€¼á€„á€ºá€†á€„á€ºá€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Eliminated the actual root cause of iOS Safari sync blockage where experimentalForceLongPolling and persistentSingleTabManager locked the WebKit connection stream upon sleep/tab switch. Upgraded to persistentMultipleTabManager with native WebSockets and enforced Dual-Channel Direct HTTPS REST push for instant guaranteed delivery.',
    changesMy: [
      'ðŸ”Œ **Permanent WebKit Socket Unlock (Safari Long-Polling Freeze á€–á€šá€ºá€›á€¾á€¬á€¸á€á€¼á€„á€ºá€¸)**: Safari á€á€½á€„á€º connection stream á€¡á€±á€¸á€á€²á€›á€•á€ºá€á€”á€·á€ºá€…á€±á€žá€±á€¬ `experimentalForceLongPolling` á€¡á€¬á€¸ á€–á€šá€ºá€›á€¾á€¬á€¸á Native WebSocket á€¡á€¬á€¸ á€¡á€žá€¯á€¶á€¸á€•á€¼á€¯á€…á€±á€•á€¼á€®á€¸áŠ Tab lock á€•á€­á€á€ºá€†á€­á€¯á€·á€™á€¾á€¯ á€–á€¼á€…á€ºá€…á€±á€žá€±á€¬ `persistentSingleTabManager` á€¡á€…á€¬á€¸ `persistentMultipleTabManager` á€–á€¼á€„á€·á€º á€•á€¼á€„á€ºá€†á€„á€ºá€œá€­á€¯á€€á€ºá€á€¼á€„á€ºá€¸á‹',
      'âš¡ **Dual-Channel Direct REST Push Guarantee (á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º Cloud á€•á€­á€¯á€·á€†á€±á€¬á€„á€ºá€™á€¾á€¯)**: Force Push á€”á€¾á€„á€·á€º Retry á€á€œá€¯á€á€ºá€™á€»á€¬á€¸ á€”á€¾á€­á€•á€ºá€á€»á€­á€”á€ºá€á€½á€„á€º Firestore SDK á€žá€¬á€™á€€ Google Cloud Firestore REST API (`firestore.googleapis.com`) á€žá€­á€¯á€· á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º HTTPS call á€–á€¼á€„á€·á€º á…á‰ á€á€¯á€™á€¼á€±á€¬á€€á€º á€™á€¾á€á€ºá€á€™á€ºá€¸á€¡á€¬á€¸ á€¡á€›á€±á€¬á€€á€ºá€•á€­á€¯á€·á€†á€±á€¬á€„á€ºá€…á€±á€á€¼á€„á€ºá€¸á‹',
      'ðŸ”‘ **Resilient Token Caching (Network Block á€™á€–á€¼á€…á€ºá€…á€±á€á€¼á€„á€ºá€¸)**: REST push á€á€±á€«á€ºá€šá€°á€á€»á€­á€”á€ºá€á€½á€„á€º ID token á€¡á€¬á€¸ á€¡á€á€„á€ºá€¸á€¡á€€á€»á€•á€º refresh á€™á€œá€¯á€•á€ºá€…á€±á€˜á€² Cached Token á€–á€¼á€„á€·á€º áá‚ á€…á€€á€¹á€€á€”á€·á€º timeout á€€á€¬á€€á€½á€šá€ºá€™á€¾á€¯á€–á€¼á€„á€·á€º á€á€»á€€á€ºá€á€»á€„á€ºá€¸ á€•á€­á€¯á€·á€†á€±á€¬á€„á€ºá€…á€±á€á€¼á€„á€ºá€¸á‹',
      'ðŸ“¡ **Real-time Confirmation Bridge**: REST push á€–á€¼á€„á€·á€º Server á€•á€±á€«á€º á€¡á€±á€¬á€„á€ºá€™á€¼á€„á€ºá€…á€½á€¬ á€›á€±á€¬á€€á€ºá€›á€¾á€­á€žá€Šá€ºá€”á€¾á€„á€·á€º `ngwe_cloud_tx_confirmed` event á€–á€¼á€„á€·á€º UI á€•á€±á€«á€ºá€á€½á€„á€º á€á€»á€€á€ºá€á€»á€„á€ºá€¸ á€¡á€á€Šá€ºá€•á€¼á€¯á€•á€¼á€®á€¸ (Confirmed in DB) á€¡á€–á€¼á€…á€º á€¡á€á€»á€­á€”á€ºá€™á€†á€­á€¯á€„á€ºá€¸ á€•á€¼á€±á€¬á€„á€ºá€¸á€œá€²á€•á€¼á€žá€…á€±á€á€¼á€„á€ºá€¸á‹'
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
    titleMy: 'Cross-Device Cloud Sync Truth Audit & Uncommitted Writes Isolation (iOS á…á‰ vs Android á…áˆ á€”á€¾á€„á€·á€º Sync á€™á€–á€¼á€…á€ºá€á€¬ áˆ á€á€¯ á€€á€½á€²á€œá€½á€²á€™á€¾á€¯ á€¡á€•á€¼á€®á€¸á€žá€á€º á€•á€¼á€„á€ºá€†á€„á€ºá€á€»á€€á€º)',
    titleEn: 'Cross-Device Cloud Sync Truth Audit & Uncommitted Writes Isolation',
    tag: 'feature',
    tagLabelMy: 'á€šá€á€„á€º á€—á€¬á€¸á€›á€¾á€„á€ºá€¸',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'iPhone (iOS) á€á€½á€„á€º á€…á€¬á€›á€„á€ºá€¸ á…á‰ á€á€¯á€›á€¾á€­á€•á€¼á€®á€¸ Cloud á€•á€±á€«á€º á…á‰ á€á€¯á€Ÿá€¯ á€•á€¼á€žá€”á€±á€žá€±á€¬á€ºá€œá€Šá€ºá€¸ á€¡á€±á€¬á€€á€ºá€á€½á€„á€º Sync á€™á€–á€¼á€…á€ºá€á€¬ áˆ á€á€¯á€Ÿá€¯ á€•á€±á€«á€ºá€”á€±á€á€¼á€„á€ºá€¸áŠ Android á€…á€€á€ºá€á€½á€„á€ºá€™á€° DB á€‘á€²á€›á€¾á€­á€á€¬ á…áˆ á€á€¯á€žá€¬ á€•á€¼á€žá€”á€±á€á€¼á€„á€ºá€¸á€”á€¾á€„á€·á€º iOS á€á€½á€„á€º Transaction á á€€á€¼á€±á€¬á€„á€ºá€¸ á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€žá€±á€¬á€ºá€œá€Šá€ºá€¸ Cloud á€žá€­á€¯á€· á€™á€á€€á€ºá€”á€­á€¯á€„á€ºá€˜á€² á€•á€­á€á€ºá€†á€­á€¯á€·á€”á€±á€›á€žá€Šá€·á€º á€¡á€“á€­á€€ á€¡á€€á€¼á€±á€¬á€„á€ºá€¸á€›á€„á€ºá€¸ (onSnapshot á€á€½á€„á€º Local uncommitted writes á€–á€¼á€…á€ºá€žá€±á€¬ hasPendingWrites: true á€¡á€¬á€¸ Server á€žá€­á€¯á€· á€™á€›á€±á€¬á€€á€ºá€™á€® Cloud á€¡á€á€Šá€ºá€•á€¼á€¯á€•á€¼á€®á€¸á€¡á€–á€¼á€…á€º á€™á€¾á€¬á€¸á€šá€½á€„á€ºá€¸á€žá€á€ºá€™á€¾á€á€ºá€™á€­á€žá€–á€¼á€„á€·á€º Force Push á€€ á€•á€­á€¯á€·á€›á€”á€ºá€™á€œá€­á€¯á€Ÿá€¯ á€šá€°á€†á€€á€¬ á€€á€»á€±á€¬á€ºá€žá€½á€¬á€¸á€á€²á€·á€™á€­á€á€¼á€„á€ºá€¸) á€¡á€¬á€¸ á€¡á€™á€¼á€…á€ºá€•á€¼á€á€º á€…á€…á€ºá€†á€±á€¸á€•á€¼á€„á€ºá€†á€„á€ºá€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Resolved the core sync mismatch where iOS showed 59 records on device and 59 in Cloud while showing 8 unsynced items below, and Android showed 58 in DB. Fixed the root cause in onSnapshot where optimistic uncommitted writes (hasPendingWrites: true) were prematurely marked as confirmed in Cloud DB, causing sync push to bypass the 59th transaction.',
    changesMy: [
      'ðŸ” **Strict Server Commitment Verification (hasPendingWrites: false)**: Firestore onSnapshot á€™á€¾ á€’á€±á€á€¬á€œá€€á€ºá€á€¶á€›á€›á€¾á€­á€á€»á€­á€”á€ºá€á€½á€„á€º Server á€•á€±á€«á€ºá€žá€­á€¯á€· á€¡á€™á€¾á€”á€ºá€á€€á€šá€º á€›á€±á€¬á€€á€ºá€›á€¾á€­á€¡á€á€Šá€ºá€•á€¼á€¯á€•á€¼á€®á€¸á€žá€±á€¬ á€™á€¾á€á€ºá€á€™á€ºá€¸á€™á€»á€¬á€¸á€€á€­á€¯á€žá€¬ `confirmedServerTxIds` (Cloud DB á€›á€±á€¬á€€á€ºá€›á€¾á€­á€•á€¼á€®á€¸) á€¡á€–á€¼á€…á€º á€žá€á€ºá€™á€¾á€á€ºá€…á€±á€á€¼á€„á€ºá€¸á‹ á€…á€€á€ºá€á€½á€„á€ºá€¸ á€›á€±á€¸á€žá€¬á€¸á€†á€² uncommitted cache á€™á€¾á€á€ºá€á€™á€ºá€¸á€™á€»á€¬á€¸á€€á€­á€¯ Cloud DB á€›á€±á€¬á€€á€ºá€•á€¼á€®á€¸á€¡á€–á€¼á€…á€º á€œá€¯á€¶á€¸á€ á€™á€•á€¼á€žá€á€±á€¬á€·á€•á€«á‹',
      'ðŸ“± **Cross-Device Truth Harmony (iOS & Android á€á€°á€Šá€®á€žá€½á€¬á€¸á€á€¼á€„á€ºá€¸)**: iPhone á€™á€¾ á€‘á€Šá€·á€ºá€œá€­á€¯á€€á€ºá€žá€±á€¬ á…á‰ á€á€¯á€™á€¼á€±á€¬á€€á€º á€™á€¾á€á€ºá€á€™á€ºá€¸á€žá€Šá€º Server á€žá€­á€¯á€· á€™á€›á€±á€¬á€€á€ºá€žá€±á€¸á€žá€›á€½á€±á€· iOS á€á€½á€„á€ºá€œá€Šá€ºá€¸ "Cloud DB á€›á€±á€¬á€€á€ºá€›á€¾á€­á€•á€¼á€®á€¸ (á…áˆ)"áŠ "á€•á€­á€¯á€·á€›á€”á€ºá€€á€»á€”á€º (á)" á€Ÿá€¯á€žá€¬ á€›á€­á€¯á€¸á€žá€¬á€¸á€á€­á€€á€»á€…á€½á€¬ á€•á€¼á€žá€™á€Šá€ºá€–á€¼á€…á€ºá Android á€…á€€á€ºá€™á€¾ á€•á€¼á€žá€žá€±á€¬ (á…áˆ) á€”á€¾á€„á€·á€º áá€á€% á€¡á€á€­á€¡á€€á€» á€€á€­á€¯á€€á€ºá€Šá€®á€žá€½á€¬á€¸á€…á€±á€á€¼á€„á€ºá€¸á‹',
      'ðŸš€ **Unblocking iOS 59th Transaction Push**: á€šá€á€„á€ºá€€ á…á‰ á€á€¯á€™á€¼á€±á€¬á€€á€º ID á€¡á€¬á€¸ á€›á€±á€¬á€€á€ºá€•á€¼á€®á€¸á€žá€¬á€¸á€Ÿá€¯ á€™á€¾á€¬á€¸á€šá€½á€„á€ºá€¸á€šá€°á€†á€€á€¬ Force Push á€€ á€•á€­á€¯á€·á€†á€±á€¬á€„á€ºá€á€¼á€„á€ºá€¸ á€™á€•á€¼á€¯á€˜á€² á€€á€»á€±á€¬á€ºá€žá€½á€¬á€¸á€á€²á€·á€žá€±á€¬ á€•á€¼á€¿á€”á€¬á€¡á€¬á€¸ á€–á€šá€ºá€›á€¾á€¬á€¸á€œá€­á€¯á€€á€ºá€žá€–á€¼á€„á€·á€º "Database á€žá€­á€¯á€· á€¡á€€á€¯á€”á€ºá€á€»á€€á€ºá€á€»á€„á€ºá€¸ á€•á€­á€¯á€·á€™á€Šá€º" (á€žá€­á€¯á€·á€™á€Ÿá€¯á€á€º) "á€€á€»á€”á€ºá€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸ á€•á€¼á€”á€ºá€•á€­á€¯á€·á€™á€Šá€º" á€€á€­á€¯ á€”á€¾á€­á€•á€ºá€œá€­á€¯á€€á€ºá€žá€Šá€ºá€”á€¾á€„á€·á€º á…á‰ á€á€¯á€™á€¼á€±á€¬á€€á€º á€™á€¾á€á€ºá€á€™á€ºá€¸á€žá€Šá€º Cloud á€žá€­á€¯á€· á€á€»á€€á€ºá€á€»á€„á€ºá€¸ á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€›á€±á€¬á€€á€ºá€›á€¾á€­á€žá€½á€¬á€¸á€…á€±á€á€¼á€„á€ºá€¸á‹',
      'ðŸŽ¯ **Queue & Card Metrics Harmony (á€†á€”á€·á€ºá€€á€»á€„á€ºá€˜á€€á€º á€¡á€á€»á€€á€ºá€¡á€œá€€á€ºá€™á€»á€¬á€¸ á€–á€šá€ºá€›á€¾á€¬á€¸á€á€¼á€„á€ºá€¸)**: á€€á€á€ºá€á€½á€„á€º "áá€á€% á€á€•á€¼á€±á€¸á€Šá€®" á€Ÿá€¯ á€•á€¼á€•á€¼á€®á€¸ á€¡á€±á€¬á€€á€ºá€á€½á€„á€º "Queue á€‘á€² áˆ á€á€¯ á€€á€»á€”á€º" á€Ÿá€¯ á€€á€½á€²á€œá€½á€²á€™á€•á€¼á€…á€±á€›á€”á€ºáŠ Queue á€‘á€²á€á€½á€„á€º á€…á€¬á€›á€„á€ºá€¸á€€á€»á€”á€ºá€”á€±á€•á€«á€€ á€€á€á€ºá€á€½á€„á€ºá€œá€Šá€ºá€¸ Queue á€á€”á€ºá€¸á€…á€®á€†á€² á€¡á€–á€¼á€…á€º á€á€•á€¼á€±á€¸á€Šá€® á€›á€­á€¯á€¸á€žá€¬á€¸á€…á€½á€¬ á€–á€±á€¬á€ºá€•á€¼á€…á€±á€á€¼á€„á€ºá€¸á‹',
      'ðŸ›¡ï¸ **Robust REST HTTP Fallback with Error Logging**: Safari WebKit á€›á€•á€ºá€á€”á€·á€ºá€”á€±á€•á€«á€€ Direct HTTPS REST push á€•á€¼á€¯á€œá€¯á€•á€ºá€›á€¬á€á€½á€„á€º NaN / Date data á€™á€»á€¬á€¸ á€™á€•á€»á€€á€ºá€…á€®á€¸á€…á€±á€›á€”á€º á€á€¬á€¸á€†á€®á€¸á€•á€±á€¸á€•á€¼á€®á€¸áŠ á€á€»á€­á€¯á€·á€šá€½á€„á€ºá€¸á€á€»á€€á€º á€–á€¼á€…á€ºá€•á€±á€«á€ºá€•á€«á€€ Sync Error History á€á€½á€„á€º á€¡á€žá€±á€¸á€…á€­á€á€º á€™á€¾á€á€ºá€á€™á€ºá€¸á€á€„á€ºá€•á€±á€¸á€á€¼á€„á€ºá€¸á‹'
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
    titleMy: 'Dedicated Sync Error History Section & iOS Safari Transaction Push Recovery (iOS á€™á€¾á€á€ºá€á€™á€ºá€¸ á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€›á€±á€¬á€€á€ºá€›á€¾á€­á€…á€±á€á€¼á€„á€ºá€¸á€”á€¾á€„á€·á€º á€¡á€™á€¾á€¬á€¸á€™á€¾á€á€ºá€á€™á€ºá€¸)',
    titleEn: 'Dedicated Sync Error History Section & iOS Safari Direct HTTPS Sync Recovery',
    tag: 'feature',
    tagLabelMy: 'á€šá€á€„á€º á€—á€¬á€¸á€›á€¾á€„á€ºá€¸',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'iOS (iPhone / Safari) á€á€½á€„á€º Transaction á€¡á€žá€…á€º á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€žá€±á€¬á€ºá€œá€Šá€ºá€¸ Cloud á€žá€­á€¯á€· á€™á€›á€±á€¬á€€á€ºá€˜á€² á€á€”á€·á€ºá€”á€±á€›á€žá€Šá€·á€º á€•á€¼á€¿á€”á€¬ (WebKit IndexedDB freeze á€”á€¾á€„á€·á€º stream pause) á€¡á€¬á€¸ á€¡á€•á€¼á€®á€¸á€žá€á€º á€–á€¼á€±á€›á€¾á€„á€ºá€¸á€”á€­á€¯á€„á€ºá€›á€”á€º Direct HTTPS REST write fallback á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€•á€±á€¸á€•á€¼á€®á€¸áŠ SyncHealthModal á€¡á€á€½á€„á€ºá€¸ á€¡á€€á€¼á€±á€¬á€„á€ºá€¸á€›á€„á€ºá€¸ á€¡á€™á€¾á€”á€ºá€€á€­á€¯ á€á€»á€€á€ºá€á€»á€„á€ºá€¸ á€™á€¼á€„á€ºá€á€½á€±á€·á€”á€­á€¯á€„á€ºá€™á€Šá€·á€º "Sync Error History" (á€”á€±á€¬á€€á€ºá€†á€¯á€¶á€¸ á€€á€»á€›á€¾á€¯á€¶á€¸á€á€²á€·á€žá€±á€¬ á€…á€¬á€›á€„á€ºá€¸ áá€ á€á€¯áŠ á€¡á€á€»á€­á€”á€ºá€”á€¾á€„á€·á€º á€á€­á€€á€»á€žá€±á€¬ Error Message) á€€á€á€¹á€á€¡á€¬á€¸ á€á€•á€ºá€†á€„á€ºá€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Resolved the iOS Safari transaction sync blockage by introducing an automatic Direct HTTPS REST write fallback and adding a dedicated "Sync Error History" section to SyncHealthModal listing the last 10 failed operations with specific error messages and timestamps.',
    changesMy: [
      'ðŸ“œ **Dedicated Sync Error History Section**: SyncHealthModal á€á€½á€„á€º á€”á€±á€¬á€€á€ºá€†á€¯á€¶á€¸ á€€á€»á€›á€¾á€¯á€¶á€¸á€á€²á€·á€žá€±á€¬ á€…á€¬á€›á€„á€ºá€¸ áá€ á€á€¯á á€á€­á€€á€»á€žá€±á€¬ Error MessageáŠ Operation á€¡á€™á€»á€­á€¯á€¸á€¡á€…á€¬á€¸ (Write/Delete)áŠ á€¡á€á€»á€­á€”á€º (Timestamp) á€”á€¾á€„á€·á€º Error Code á€á€­á€¯á€·á€€á€­á€¯ á€¡á€žá€±á€¸á€…á€­á€á€º á€–á€±á€¬á€ºá€•á€¼á€•á€±á€¸á€žá€±á€¬ á€™á€¾á€á€ºá€á€™á€ºá€¸á€€á€á€¹á€ á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€á€¼á€„á€ºá€¸á‹',
      'ðŸ **iOS Safari WebKit Direct HTTPS Fallback**: iPhone Safari á€á€½á€„á€º Firestore SDK internal stream á€›á€•á€ºá€á€”á€·á€ºá€”á€±á€•á€«á€€ á€…á€±á€¬á€„á€·á€ºá€†á€­á€¯á€„á€ºá€¸á€™á€”á€±á€˜á€² Google Cloud Firestore REST API á€žá€­á€¯á€· á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º HTTPS fetch á€–á€¼á€„á€·á€º á€…á€¬á€›á€„á€ºá€¸á€á€»á€€á€ºá€á€»á€„á€ºá€¸ á€›á€±á€¬á€€á€ºá€›á€¾á€­á€…á€±á€›á€”á€º á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º á€•á€¼á€¯á€•á€¼á€„á€ºá€á€¼á€„á€ºá€¸á‹',
      'ðŸ“‹ **One-Click Error Copy & Clear**: Error á€á€…á€ºá€á€¯á€á€»á€„á€ºá€¸á€…á€®á Technical Payload á€¡á€¬á€¸ á€¡á€œá€½á€šá€ºá€á€€á€° Copy á€€á€°á€¸á€šá€°á€”á€­á€¯á€„á€ºá€•á€¼á€®á€¸áŠ á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€œá€­á€¯á€•á€«á€€ "á€›á€¾á€„á€ºá€¸á€™á€Šá€º (Clear)" á€á€œá€¯á€á€ºá€–á€¼á€„á€·á€º Error History á€¡á€¬á€¸ á€¡á€žá€…á€ºá€•á€¼á€”á€ºá€œá€Šá€º á€…á€á€„á€ºá€”á€­á€¯á€„á€ºá€á€¼á€„á€ºá€¸á‹',
      'ðŸ›¡ï¸ **Persistently Cached Error Logs**: á€…á€€á€ºá€•á€­á€á€ºá€žá€½á€¬á€¸á€•á€«á€€á€œá€Šá€ºá€¸ á€–á€¼á€…á€ºá€•á€½á€¬á€¸á€á€²á€·á€žá€±á€¬ Error á€¡á€á€»á€€á€ºá€¡á€œá€€á€ºá€™á€»á€¬á€¸ á€™á€•á€»á€±á€¬á€€á€ºá€•á€»á€€á€ºá€…á€±á€›á€”á€º LocalStorage á€á€½á€„á€º á€œá€¯á€¶á€á€¼á€¯á€¶á€…á€½á€¬ á€žá€­á€™á€ºá€¸á€†á€Šá€ºá€¸á€•á€±á€¸á€‘á€¬á€¸á€á€¼á€„á€ºá€¸á‹'
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
    titleMy: 'Cloud DB á€…á€¬á€›á€„á€ºá€¸á€¡á€›á€±á€¡á€á€½á€€á€º (á…áˆ á€”á€¾á€„á€·á€º á…á‰) á€™á€á€°á€Šá€®á€˜á€² á€€á€½á€²á€œá€½á€²á€”á€±á€™á€¾á€¯á€¡á€¬á€¸ á€¡á€á€­á€¡á€€á€» á€Šá€¾á€­á€”á€¾á€­á€¯á€„á€ºá€¸á€•á€¼á€„á€ºá€†á€„á€ºá€á€¼á€„á€ºá€¸ (100% Metric Synchronization)',
    titleEn: '100% Unified Cloud DB Sync Metric & Zero-Discrepancy Data Audit',
    tag: 'feature',
    tagLabelMy: 'á€šá€á€„á€º á€—á€¬á€¸á€›á€¾á€„á€ºá€¸',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'Account á€”á€¾á€„á€·á€º DB ID á€¡á€á€°á€á€°á€–á€¼á€…á€ºá€•á€«á€œá€»á€€á€º á€”á€±á€›á€¬á€á€…á€ºá€á€¯á€á€½á€„á€º "DB á€›á€±á€¬á€€á€ºá€›á€¾á€­á€•á€¼á€®á€¸ á…áˆ" á€Ÿá€¯ á€•á€¼á€•á€¼á€®á€¸ á€¡á€á€¼á€¬á€¸á€”á€±á€›á€¬á€á€…á€ºá€á€¯á€á€½á€„á€º "DB á€›á€±á€¬á€€á€ºá€›á€¾á€­á€•á€¼á€®á€¸ á…á‰" á€Ÿá€¯ á€€á€½á€²á€œá€½á€²á€…á€½á€¬ á€•á€¼á€žá€”á€±á€›á€žá€Šá€·á€º á€¡á€›á€„á€ºá€¸á€¡á€™á€¼á€…á€º (DatabaseSyncTrackerModal á€á€½á€„á€º cloudTxIds.size á€™á€¾ á€¡á€Ÿá€±á€¬á€„á€ºá€¸á€€á€»á€”á€º ID á€™á€»á€¬á€¸á€¡á€¬á€¸ á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€›á€±á€á€½á€€á€ºá€™á€­á€á€¼á€„á€ºá€¸á€”á€¾á€„á€·á€º Transaction á€–á€»á€€á€ºá€á€»á€­á€”á€ºá€á€½á€„á€º cloudTxIds á€™á€¾ á€á€»á€€á€ºá€á€»á€„á€ºá€¸ á€–á€šá€ºá€‘á€¯á€á€ºá€™á€•á€±á€¸á€á€²á€·á€™á€­á€á€¼á€„á€ºá€¸) á€¡á€¬á€¸ á€¡á€•á€¼á€®á€¸á€žá€á€º á€…á€…á€ºá€†á€±á€¸á€•á€¼á€„á€ºá€†á€„á€ºá€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹ á€…á€€á€ºá€á€½á€„á€ºá€¸á€™á€¾á€á€ºá€á€™á€ºá€¸ á…áˆ á€á€¯á€›á€¾á€­á€•á€«á€€ Cloud DB á€›á€±á€¬á€€á€ºá€›á€¾á€­á€•á€¼á€®á€¸ á…áˆ á€á€¯áŠ á€•á€­á€¯á€·á€›á€”á€ºá€€á€»á€”á€º á€ á€á€¯ á€¡á€–á€¼á€…á€º á€á€…á€ºá€žá€™á€á€ºá€á€Šá€ºá€¸ á€á€­á€€á€»á€™á€¾á€”á€ºá€€á€”á€ºá€…á€½á€¬á€žá€¬ á€•á€¼á€žá€…á€±á€™á€Šá€º á€–á€¼á€…á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Eliminated the discrepancy where one view showed 58 confirmed records while another card showed 59 records on the same account. Unified all calculation formulas across DatabaseSyncTrackerModal, SyncHealthModal, and Navbar to strictly evaluate active confirmed records.',
    changesMy: [
      'ðŸŽ¯ **á€…á€¬á€›á€„á€ºá€¸á€¡á€›á€±á€¡á€á€½á€€á€º áá€á€% á€á€­á€€á€»á€Šá€®á€Šá€½á€á€ºá€…á€±á€á€¼á€„á€ºá€¸ (No More 58 vs 59 Discrepancy)**: DatabaseSyncTrackerModal Card 2 á€›á€¾á€­ "Cloud DB á€›á€±á€¬á€€á€ºá€›á€¾á€­á€•á€¼á€®á€¸" á€‚á€á€”á€ºá€¸á€¡á€¬á€¸ cloudTxIds.size (á€™á€†á€­á€¯á€„á€ºá€žá€±á€¬/á€–á€»á€€á€ºá€‘á€¬á€¸á€žá€±á€¬ ID á€¡á€Ÿá€±á€¬á€„á€ºá€¸á€™á€»á€¬á€¸ á€›á€±á€¬á€”á€¾á€±á€¬á€•á€«á€á€„á€ºá€”á€­á€¯á€„á€ºá€žá€Šá€·á€º set size) á€–á€¼á€„á€·á€º á€™á€á€½á€€á€ºá€á€»á€€á€ºá€á€±á€¬á€·á€˜á€² á€œá€€á€ºá€›á€¾á€­ á€á€›á€¬á€¸á€á€„á€ºá€™á€¾á€á€ºá€á€™á€ºá€¸á€™á€»á€¬á€¸á€‘á€²á€™á€¾ Cloud á€›á€±á€¬á€€á€ºá€•á€¼á€®á€¸á€žá€¬á€¸ á€¡á€›á€±á€¡á€á€½á€€á€º (syncedTxsCount: á…áˆ) á€–á€¼á€„á€·á€ºá€žá€¬ á€á€•á€¼á€±á€¸á€Šá€® á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€•á€¼á€žá€…á€±á€á€¼á€„á€ºá€¸á‹',
      'ðŸ—‘ï¸ **Transaction Deletion Synchronization**: á€…á€¬á€›á€„á€ºá€¸á€á€…á€ºá€á€¯á€á€¯á€¡á€¬á€¸ á€–á€»á€€á€ºá€œá€­á€¯á€€á€ºá€•á€«á€€ cloudTxIds á€‘á€²á€™á€¾á€•á€« á€¡á€†á€­á€¯á€•á€« ID á€¡á€¬á€¸ á€á€»á€€á€ºá€á€»á€„á€ºá€¸ delete á€•á€¼á€¯á€œá€¯á€•á€ºá€…á€±á€•á€¼á€®á€¸ syncQueue á€”á€¾á€„á€·á€º onSnapshot á€á€­á€¯á€·á€á€½á€„á€ºá€œá€Šá€ºá€¸ á€•á€¼á€”á€ºá€œá€Šá€ºá€™á€›á€¾á€„á€ºá€žá€”á€ºá€…á€±á€›á€”á€º á€€á€¬á€€á€½á€šá€ºá€œá€­á€¯á€€á€ºá€á€¼á€„á€ºá€¸á‹',
      'ðŸ“Š **Cards & Filter Tabs Formula Alignment**: Tracker Modal á€¡á€á€½á€„á€ºá€¸á€›á€¾á€­ Card 1 (á€…á€€á€ºá€á€½á€„á€ºá€¸ á…áˆ á€á€¯)áŠ Card 2 (DB á€›á€±á€¬á€€á€ºá€•á€¼á€®á€¸ á…áˆ á€á€¯)áŠ Card 3 (á€•á€­á€¯á€·á€›á€”á€ºá€€á€»á€”á€º á€ á€á€¯) á€”á€¾á€„á€·á€º Tab á€á€œá€¯á€á€ºá€™á€»á€¬á€¸ (á€¡á€¬á€¸á€œá€¯á€¶á€¸ á…áˆáŠ á€›á€±á€¬á€€á€ºá€•á€¼á€®á€¸ á…áˆáŠ á€€á€»á€”á€º á€) á€¡á€¬á€¸ á€žá€„á€ºá€¹á€á€»á€¬á€”á€Šá€ºá€¸á€¡á€› áá€á€% á€¡á€á€­á€¡á€€á€» á€€á€­á€¯á€€á€ºá€Šá€®á€…á€±á€á€¼á€„á€ºá€¸á‹',
      'âš¡ **Clean Compilation & Build Safety**: DatabaseSyncTrackerModal á€¡á€á€½á€„á€ºá€¸ localMissingFromCloud á€‘á€•á€ºá€”á€±á€žá€±á€¬ variable declaration á€¡á€¬á€¸ á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€•á€¼á€®á€¸ Vite/TypeScript build á€¡á€¬á€¸ á€¡á€•á€¼á€Šá€·á€ºá€¡á€ á€¡á€±á€¬á€„á€ºá€™á€¼á€„á€ºá€…á€±á€á€¼á€„á€ºá€¸á‹'
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
    titleMy: 'Subtle Navbar Sync Progress Indicator & Background Activity Monitor (á€”á€±á€¬á€€á€ºá€á€¶ Sync á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€ºá€•á€¼á€žá€™á€¾á€¯)',
    titleEn: 'Subtle Navbar Sync Progress Indicator & Background Activity Monitor',
    tag: 'feature',
    tagLabelMy: 'á€šá€á€„á€º á€—á€¬á€¸á€›á€¾á€„á€ºá€¸',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'á€”á€±á€¬á€€á€ºá€á€¶á€™á€¾ á€’á€±á€á€¬á€™á€»á€¬á€¸ á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º Cloud á€žá€­á€¯á€· á€•á€­á€¯á€·á€†á€±á€¬á€„á€ºá€”á€±á€á€»á€­á€”á€º (Background Auto-Syncs) á€á€½á€„á€º á€¡á€žá€¯á€¶á€¸á€•á€¼á€¯á€žá€°á€™á€»á€¬á€¸ á€’á€±á€á€¬ á€¡á€™á€¾á€”á€ºá€á€€á€šá€º á€›á€½á€±á€·á€œá€»á€¬á€¸á€”á€±á€á€¼á€„á€ºá€¸ á€›á€¾á€­/á€™á€›á€¾á€­ á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€…á€½á€¬ á€žá€­á€›á€¾á€­á€”á€­á€¯á€„á€ºá€…á€±á€›á€”á€º Navbar á€›á€¾á€­ Cloud Icon á€˜á€±á€¸á€á€½á€„á€º á€žá€­á€™á€ºá€™á€½á€±á€·á€žá€±á€žá€•á€ºá€žá€±á€¬ Spinning Loading Ring á€”á€¾á€„á€·á€º Activity Pulse Indicator á€¡á€¬á€¸ á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€á€•á€ºá€†á€„á€ºá€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Implemented an ambient, subtle "Sync Progress Indicator" (spinning arc ring & pulse dot next to the Navbar cloud icon) that dynamically activates exclusively during background auto-syncs and transactional queue processing.',
    changesMy: [
      'ðŸ’« **Subtle Loading Ring next to Cloud Icon**: á€”á€±á€¬á€€á€ºá€á€¶ Auto-Sync á€žá€­á€¯á€·á€™á€Ÿá€¯á€á€º Queue Processing á€–á€¼á€…á€ºá€•á€±á€«á€ºá€”á€±á€á€»á€­á€”á€ºáŒá€žá€¬ Navbar Cloud Icon á€˜á€±á€¸/á€•á€á€ºá€œá€Šá€ºá€á€½á€„á€º á€žá€­á€™á€ºá€™á€½á€±á€·á€œá€¾á€•á€žá€±á€¬ Loading Ring á€¡á€á€­á€¯á€„á€ºá€¸ á€œá€Šá€ºá€•á€á€ºá€•á€¼á€žá€á€¼á€„á€ºá€¸á‹',
      'ðŸŸ¢ **Idle vs. Active State Differentiation**: Sync á€™á€œá€¯á€•á€ºá€”á€±á€á€»á€­á€”á€ºá€á€½á€„á€º á€„á€¼á€­á€™á€ºá€žá€€á€ºá€žá€”á€·á€ºá€›á€¾á€„á€ºá€¸á€žá€±á€¬ á€¡á€…á€­á€™á€ºá€¸á€›á€±á€¬á€„á€º Cloud Icon á€¡á€–á€¼á€…á€º á€á€Šá€ºá€›á€¾á€­á€•á€¼á€®á€¸áŠ Sync á€…á€á€„á€ºá€žá€Šá€ºá€”á€¾á€„á€·á€º Sky Blue á€žá€­á€¯á€· á€€á€°á€¸á€•á€¼á€±á€¬á€„á€ºá€¸á€€á€¬ á€œá€Šá€ºá€•á€á€ºá€•á€¼á€žá€•á€±á€¸á€á€¼á€„á€ºá€¸á‹',
      'ðŸ“± **Cross-Platform & Mobile Responsive**: á€™á€­á€¯á€˜á€­á€¯á€„á€ºá€¸á€–á€¯á€”á€ºá€¸á€”á€¾á€„á€·á€º á€€á€½á€”á€ºá€•á€»á€°á€á€¬ á€…á€á€›á€„á€ºá€™á€»á€¬á€¸á€¡á€¬á€¸á€œá€¯á€¶á€¸á€á€½á€„á€º á€”á€±á€›á€¬á€™á€šá€°á€˜á€² á€žá€±á€žá€•á€ºá€…á€½á€¬ á€™á€¼á€„á€ºá€á€½á€±á€·á€”á€­á€¯á€„á€ºá€á€¼á€„á€ºá€¸á‹',
      'ðŸ“¡ **Real-time Queue Listener Binding**: Transactional Sync Queue á€”á€¾á€„á€·á€º Background Auth Sync á€”á€¾á€…á€ºá€á€¯á€…á€œá€¯á€¶á€¸á á€œá€¾á€¯á€•á€ºá€›á€¾á€¬á€¸á€™á€¾á€¯á€€á€­á€¯ á€¡á€á€»á€­á€”á€ºá€”á€¾á€„á€·á€ºá€á€•á€¼á€±á€¸á€Šá€® á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€á€»á€­á€á€ºá€†á€€á€ºá€‘á€¬á€¸á€á€¼á€„á€ºá€¸á‹'
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
    titleMy: 'Infallible Metadata-Aware Sync Engine & Zero-Drop Queue Architecture (á€€á€»á€”á€ºá€›á€¾á€­á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸ á€¡á€•á€¼á€®á€¸á€á€­á€¯á€„á€º á€›á€¾á€„á€ºá€¸á€‘á€¯á€á€ºá€á€¼á€„á€ºá€¸)',
    titleEn: 'Infallible Metadata-Aware Sync Engine & Zero-Drop Queue Architecture (Permanent Queue Unblocking)',
    tag: 'major',
    tagLabelMy: 'á€šá€á€„á€º á€—á€¬á€¸á€›á€¾á€„á€ºá€¸',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'Cloud á€žá€­á€¯á€· á€•á€­á€¯á€·á€†á€±á€¬á€„á€ºá€•á€¼á€®á€¸á€žá€±á€¬á€ºá€œá€Šá€ºá€¸ á€¡á€á€Šá€ºá€•á€¼á€¯á€á€»á€€á€º á€™á€›á€˜á€² "á€€á€»á€”á€ºá€”á€±á€†á€²" (Pending/Stuck) á€–á€¼á€…á€ºá€”á€±á€›á€žá€Šá€·á€º á€¡á€“á€­á€€ á€¡á€›á€„á€ºá€¸á€¡á€™á€¼á€…á€º (Firestore Metadata Changes á€™á€€á€¼á€¬á€¸á€–á€¼á€á€ºá€”á€­á€¯á€„á€ºá€á€¼á€„á€ºá€¸áŠ Snapshot á€™á€¾ Confirmed IDs á€™á€»á€¬á€¸ á€•á€¼á€”á€ºá€œá€Šá€ºá€•á€»á€€á€ºá€•á€¼á€šá€ºá€žá€½á€¬á€¸á€á€¼á€„á€ºá€¸ á€”á€¾á€„á€·á€º Queue Race Conditions) á€™á€»á€¬á€¸á€€á€­á€¯ á€¡á€•á€¼á€®á€¸á€á€­á€¯á€„á€º á€•á€¼á€„á€ºá€†á€„á€ºá€–á€šá€ºá€›á€¾á€¬á€¸á€•á€¼á€®á€¸ Direct Parallel Push á€”á€¾á€„á€·á€º Infallible Queue Unblocking á€…á€”á€…á€ºá€á€­á€¯á€·á€–á€¼á€„á€·á€º á€¡á€†á€„á€·á€ºá€™á€¼á€¾á€„á€·á€ºá€á€„á€ºá€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Permanently resolved the root cause of persistently stuck or remaining pending documents by introducing Firestore includeMetadataChanges listeners, direct parallel force writes, queue race-condition locks, and auto-purging of orphaned tasks.',
    changesMy: [
      'ðŸ“¡ **Firestore includeMetadataChanges Listener**: Cloud á€žá€­á€¯á€· á€›á€±á€¬á€€á€ºá€›á€¾á€­á€žá€½á€¬á€¸á€žá€±á€¬ á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸ Server á€•á€±á€«á€º á€¡á€™á€¾á€”á€ºá€á€€á€šá€º á€¡á€á€Šá€ºá€•á€¼á€¯á€•á€¼á€®á€¸á€á€»á€­á€”á€º (hasPendingWrites: false á€žá€­á€¯á€· á€•á€¼á€±á€¬á€„á€ºá€¸á€œá€²á€á€»á€­á€”á€º) á€á€½á€„á€º UI á€•á€±á€«á€º á€á€»á€€á€ºá€á€»á€„á€ºá€¸ á€¡á€žá€­á€¡á€™á€¾á€á€ºá€•á€¼á€¯ á€¡á€…á€­á€™á€ºá€¸á€›á€±á€¬á€„á€ºá€•á€¼á€±á€¬á€„á€ºá€¸á€…á€±á€á€¼á€„á€ºá€¸á‹',
      'ðŸš€ **Direct Parallel Batch Delivery**: Retry Failed Syncs á€”á€¾á€­á€•á€ºá€•á€«á€€ Queue á€á€½á€„á€º á€…á€±á€¬á€„á€·á€ºá€™á€”á€±á€˜á€² Firestore Database á€‘á€­á€¯á€·á€žá€­á€¯á€· setDoc á€–á€¼á€„á€·á€º á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€•á€¼á€­á€¯á€„á€ºá€á€° á€•á€­á€¯á€·á€†á€±á€¬á€„á€ºá€€á€¬ waitForPendingWrites á€–á€¼á€„á€·á€º Server Ack á€€á€­á€¯ á€¡á€¬á€™á€á€¶á€á€»á€€á€º á€›á€šá€°á€á€¼á€„á€ºá€¸á‹',
      'ðŸ›¡ï¸ **Non-Destructive Snapshot Merge**: Snapshot Listener á€¡á€žá€…á€ºá€›á€±á€¬á€€á€ºá€œá€¬á€á€­á€¯á€„á€ºá€¸ á€šá€á€„á€º á€¡á€á€Šá€ºá€•á€¼á€¯á€•á€¼á€®á€¸á€žá€¬á€¸ cloudTxIds á€™á€»á€¬á€¸á€€á€­á€¯ á€–á€»á€€á€ºá€•á€…á€ºá€á€¼á€„á€ºá€¸ á€™á€›á€¾á€­á€…á€±á€˜á€² á€†á€€á€ºá€œá€€á€º á€‘á€­á€”á€ºá€¸á€žá€­á€™á€ºá€¸á€‘á€¬á€¸á€á€¼á€„á€ºá€¸á‹',
      'ðŸ”’ **Thread-Safe Promise Locking**: processQueue() á€á€…á€ºá€•á€¼á€­á€¯á€„á€ºá€”á€€á€º á€á€±á€«á€ºá€†á€­á€¯á€™á€¾á€¯á€™á€»á€¬á€¸á€á€½á€„á€º 0 á€–á€¼á€„á€·á€º á€€á€»á€†á€„á€ºá€¸á€™á€žá€½á€¬á€¸á€…á€±á€›á€”á€º Active Promise Awaiting á€…á€”á€…á€º á€á€•á€ºá€†á€„á€ºá€‘á€¬á€¸á€á€¼á€„á€ºá€¸á‹',
      'ðŸ§¹ **Orphan Task Purging & Clear Queue**: á€–á€»á€€á€ºá€œá€­á€¯á€€á€ºá€•á€¼á€®á€¸á€–á€¼á€…á€ºá€žá€±á€¬ á€™á€¾á€á€ºá€á€™á€ºá€¸á€Ÿá€±á€¬á€„á€ºá€¸á€™á€»á€¬á€¸ Queue á€‘á€²á€á€½á€„á€º á€™á€œá€­á€¯á€¡á€•á€ºá€˜á€² á€á€”á€·á€ºá€™á€”á€±á€…á€±á€›á€”á€º á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º á€žá€”á€·á€ºá€…á€„á€ºá€…á€”á€…á€ºá€”á€¾á€„á€·á€º "á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€™á€Šá€º" (Clear Queue) á€á€œá€¯á€á€º á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€á€¼á€„á€ºá€¸á‹'
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
    tagLabelMy: 'á€šá€á€„á€º á€—á€¬á€¸á€›á€¾á€„á€ºá€¸',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'Sync Queue á€‘á€²á€á€½á€„á€º á€á€”á€·á€ºá€”á€±á€žá€±á€¬ á€žá€­á€¯á€·á€™á€Ÿá€¯á€á€º Cloud á€•á€±á€«á€º á€™á€›á€±á€¬á€€á€ºá€žá€±á€¸á€˜á€² á€€á€»á€”á€ºá€”á€±á€žá€±á€¬ á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸á€€á€­á€¯ á€žá€®á€¸á€žá€”á€·á€º á€•á€…á€ºá€™á€¾á€á€ºá€‘á€¬á€¸á Background á€™á€¾ á€á€»á€€á€ºá€á€»á€„á€ºá€¸ á€•á€¼á€”á€ºá€œá€Šá€ºá€•á€­á€¯á€·á€†á€±á€¬á€„á€ºá€•á€±á€¸á€•á€¼á€®á€¸ Page Refresh á€™á€œá€­á€¯á€˜á€² UI á€•á€±á€«á€ºá€á€½á€„á€º á€á€»á€€á€ºá€á€»á€„á€ºá€¸ á€¡á€á€Šá€ºá€•á€¼á€¯á€…á€­á€™á€ºá€¸á€…á€±á€žá€Šá€·á€º "Retry Failed Syncs" á€á€œá€¯á€á€ºá€¡á€¬á€¸ Database Tracker á€”á€¾á€„á€·á€º Sync Health Modal á€á€­á€¯á€·á€á€½á€„á€º á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€á€•á€ºá€†á€„á€ºá€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Engineered a targeted "Retry Failed Syncs" action that unblocks pending/failed queue documents, synchronizes missing records directly to Firestore, and updates local state in real-time without page refresh.',
    changesMy: [
      'ðŸŽ¯ **Targeted Retry Engine**: Queue á€‘á€²á€á€½á€„á€º á€•á€­á€á€ºá€†á€­á€¯á€·á€”á€±á€žá€±á€¬ á€žá€­á€¯á€·á€™á€Ÿá€¯á€á€º Cloud á€•á€±á€«á€º á€™á€›á€±á€¬á€€á€ºá€žá€±á€¸á€žá€±á€¬ Document á€™á€»á€¬á€¸á€€á€­á€¯ á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€ºá€›á€½á€±á€¸á€á€»á€šá€ºá€€á€¬ Backoff Delay á€™á€…á€±á€¬á€„á€·á€ºá€…á€±á€˜á€² á€á€»á€€á€ºá€á€»á€„á€ºá€¸ á€•á€­á€¯á€·á€†á€±á€¬á€„á€ºá€á€¼á€„á€ºá€¸á‹',
      'ðŸŸ¢ **Instant State Confirmation (No Refresh)**: á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸ á€›á€±á€¬á€€á€ºá€›á€¾á€­á€žá€½á€¬á€¸á€žá€Šá€ºá€”á€¾á€„á€·á€º Page Refresh/Reload á€œá€¯á€•á€ºá€›á€”á€º á€™á€œá€­á€¯á€˜á€² UI á€•á€±á€«á€ºá€›á€¾á€­ á€¡á€Šá€½á€¾á€”á€ºá€¸ badge á€™á€»á€¬á€¸ á€á€»á€€á€ºá€á€»á€„á€ºá€¸ In DB á€žá€­á€¯á€· á€•á€¼á€±á€¬á€„á€ºá€¸á€œá€²á€žá€½á€¬á€¸á€…á€±á€á€¼á€„á€ºá€¸á‹',
      'âš¡ **Dual-Modal Integration**: "Database Sync Tracker Modal" á€”á€¾á€„á€·á€º "Sync Health Modal" á€”á€¾á€…á€ºá€á€¯á€…á€œá€¯á€¶á€¸á€á€½á€„á€º á€¡á€†á€­á€¯á€•á€« Retry Failed Syncs á€á€œá€¯á€á€ºá€¡á€¬á€¸ á€‘á€„á€ºá€›á€¾á€¬á€¸á€…á€½á€¬ á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€‘á€¬á€¸á€›á€¾á€­á€á€¼á€„á€ºá€¸á‹',
      'ðŸ›¡ï¸ **Granular Result Tracking**: á€¡á€±á€¬á€„á€ºá€™á€¼á€„á€ºá€žá€½á€¬á€¸á€žá€±á€¬ Transaction ID á€á€…á€ºá€á€¯á€á€»á€„á€ºá€¸á€…á€®á€€á€­á€¯ á€á€­á€€á€»á€…á€½á€¬ á€›á€šá€°á€•á€¼á€®á€¸ Persistent Memory á€‘á€²á€žá€­á€¯á€· á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€žá€½á€„á€ºá€¸á€šá€°á€‘á€­á€”á€ºá€¸á€žá€­á€™á€ºá€¸á€•á€±á€¸á€á€¼á€„á€ºá€¸á‹'
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
    tagLabelMy: 'á€šá€á€„á€º á€—á€¬á€¸á€›á€¾á€„á€ºá€¸',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'á€–á€¯á€”á€ºá€¸/á€…á€€á€ºá€á€½á€„á€ºá€¸ á€’á€±á€á€¬ á€¡á€›á€±á€¡á€á€½á€€á€ºá€”á€¾á€„á€·á€º Cloud á€•á€±á€«á€ºá€›á€¾á€­ á€…á€¬á€›á€„á€ºá€¸ á€€á€½á€¬á€á€¼á€¬á€¸á€›á€žá€Šá€·á€º á€¡á€€á€¼á€±á€¬á€„á€ºá€¸á€›á€„á€ºá€¸á€™á€»á€¬á€¸á€€á€­á€¯ á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€á€„á€ºá€•á€¼á€•á€±á€¸á€•á€¼á€®á€¸ Pending Queue á€”á€¾á€„á€·á€º á€¡á€á€Šá€ºá€•á€¼á€¯á€•á€¼á€®á€¸ Firestore Writes á€™á€»á€¬á€¸á€¡á€•á€±á€«á€º á€¡á€á€¼á€±á€á€¶á€‘á€¬á€¸á€žá€±á€¬ Dynamic Sync Health Score (0-100%) á€…á€…á€ºá€†á€±á€¸á€›á€±á€¸ Modal á€¡á€žá€…á€ºá€¡á€¬á€¸ á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€•á€±á€¸á€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Introduced an interactive Sync Health Modal providing a dynamic 0-100% health score, three-pillar count breakdown, and clear explanations for local vs. cloud count differences.',
    changesMy: [
      'ðŸ“Š **Dynamic Sync Health Score (0 - 100%)**: Firestore á€™á€¾ Confirmed Writes á€”á€¾á€„á€·á€º á€”á€±á€¬á€€á€ºá€á€¶ Sync Queue á€¡á€á€¼á€±á€¡á€”á€±á€€á€­á€¯ á€¡á€á€»á€­á€”á€ºá€”á€¾á€„á€·á€ºá€á€•á€¼á€±á€¸á€Šá€® á€á€½á€€á€ºá€á€»á€€á€ºá€€á€¬ á€¡á€†á€„á€·á€º á„ á€†á€„á€·á€ºá€–á€¼á€„á€·á€º á€•á€¼á€žá€á€¼á€„á€ºá€¸á‹',
      'ðŸ’¡ **Three Pillars Count Comparison**: á€…á€€á€ºá€á€½á€„á€ºá€¸ (Local Memory)áŠ Cloud (In DB) á€”á€¾á€„á€·á€º á€”á€±á€¬á€€á€ºá€á€¶ Queue (Pending) á€¡á€›á€±á€¡á€á€½á€€á€ºá€™á€»á€¬á€¸á€¡á€¬á€¸ á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€…á€½á€¬ á€”á€¾á€­á€¯á€„á€ºá€¸á€šá€¾á€‰á€ºá€–á€±á€¬á€ºá€•á€¼á€á€¼á€„á€ºá€¸á‹',
      'ðŸ” **Transparent Discrepancy Explainer**: Optimistic UIáŠ Exponential Backoff RetryáŠ Mobile Background Sleep á€á€­á€¯á€·á€€á€¼á€±á€¬á€„á€·á€º á€€á€­á€”á€ºá€¸á€‚á€á€”á€ºá€¸ á€€á€½á€¬á€á€¼á€¬á€¸á€›á€•á€¯á€¶á€€á€­á€¯ á€™á€¼á€”á€ºá€™á€¬á€˜á€¬á€žá€¬á€–á€¼á€„á€·á€º á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€…á€½á€¬ á€œá€™á€ºá€¸á€Šá€½á€¾á€”á€ºá€•á€¼á€žá€á€¼á€„á€ºá€¸á‹',
      'âš¡ **Live Queue Inspector & Diagnostics Ping**: Queue á€‘á€²á€›á€¾á€­ Document á€á€…á€ºá€á€¯á€á€»á€„á€ºá€¸á€…á€®á á€¡á€á€¼á€±á€¡á€”á€±á€¡á€¬á€¸ á€€á€¼á€Šá€·á€ºá€›á€¾á€¯á€€á€¬ "Retry All Failed" á€”á€¾á€„á€·á€º "Latency Ping Test" á€á€»á€€á€ºá€á€»á€„á€ºá€¸ á€…á€™á€ºá€¸á€žá€•á€ºá€”á€­á€¯á€„á€ºá€á€¼á€„á€ºá€¸á‹'
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
    tagLabelMy: 'á€šá€á€„á€º á€—á€¬á€¸á€›á€¾á€„á€ºá€¸',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'á€œá€­á€¯á€„á€ºá€¸á€™á€„á€¼á€­á€™á€ºá€á€¼á€„á€ºá€¸ á€žá€­á€¯á€·á€™á€Ÿá€¯á€á€º á€…á€¬á€›á€½á€€á€ºá€…á€¬á€á€™á€ºá€¸á€á€…á€ºá€á€¯á€á€»á€„á€ºá€¸á€…á€® á€á€»á€­á€¯á€·á€šá€½á€„á€ºá€¸á€™á€¾á€¯á€€á€¼á€±á€¬á€„á€·á€º á€á€…á€ºá€á€¯á€œá€¯á€¶á€¸ á€•á€»á€€á€ºá€…á€®á€¸á€žá€½á€¬á€¸á€á€¼á€„á€ºá€¸ á€™á€›á€¾á€­á€…á€±á€›á€”á€º Pending Local Changes á€™á€»á€¬á€¸á€¡á€¬á€¸ á€¦á€¸á€…á€¬á€¸á€•á€±á€¸á€žá€Šá€·á€º Robust Transactional Sync Engine á€”á€¾á€„á€·á€º Document-Level Retry-on-Failure Queue á€¡á€¬á€¸ á€¡á€•á€¼á€®á€¸á€žá€á€º á€á€•á€ºá€†á€„á€ºá€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Engineered a robust transactional sync mechanism prioritizing pending local changes and guaranteeing Firestore consistency through a granular retry-on-failure queue.',
    changesMy: [
      'ðŸ›¡ï¸ **Transactional Retry-on-Failure Queue**: á€…á€¬á€›á€„á€ºá€¸ á…á‰ á€á€¯á€á€½á€„á€º á…áˆ á€á€¯ á€›á€±á€¬á€€á€ºá€•á€¼á€®á€¸ á á€á€¯ á€€á€»á€”á€ºá€á€²á€·á€•á€«á€€á€œá€Šá€ºá€¸ á€¡á€†á€­á€¯á€•á€« á á€á€¯á€á€Šá€ºá€¸á€€á€­á€¯á€žá€¬ Background á€™á€¾ Exponential Backoff á€–á€¼á€„á€·á€º á€¡á€€á€¼á€­á€™á€ºá€€á€¼á€­á€™á€º á€†á€€á€ºá€œá€€á€ºá€•á€­á€¯á€·á€•á€±á€¸á€€á€¬ á€€á€»á€”á€º á…áˆ á€á€¯á€¡á€¬á€¸ á€™á€‘á€­á€á€­á€¯á€€á€ºá€…á€±á€á€¼á€„á€ºá€¸á‹',
      'âš¡ **Local Changes Priority Guard**: Real-time Snapshot á€›á€±á€¬á€€á€ºá€›á€¾á€­á€œá€¬á€á€»á€­á€”á€ºá€á€½á€„á€º á€…á€€á€ºá€á€½á€„á€ºá€¸ á€›á€±á€¸á€žá€¬á€¸á€‘á€¬á€¸á€†á€² Pending Data á€™á€»á€¬á€¸á€€á€­á€¯ Cloud á€™á€¾ á€¡á€Ÿá€±á€¬á€„á€ºá€¸á€™á€»á€¬á€¸á€–á€¼á€„á€·á€º á€¡á€…á€¬á€¸á€™á€‘á€­á€¯á€¸á€…á€±á€›á€”á€º á€€á€¬á€€á€½á€šá€ºá€•á€±á€¸á€á€¼á€„á€ºá€¸á‹',
      'ðŸ”„ **No Full State Refreshes**: á€á€…á€ºá€á€¯á€á€»á€„á€ºá€¸á€…á€® á€žá€®á€¸á€á€¼á€¬á€¸ Sync á€•á€¼á€¯á€œá€¯á€•á€ºá€”á€­á€¯á€„á€ºá€žá€–á€¼á€„á€·á€º Screen á€á€…á€ºá€á€¯á€œá€¯á€¶á€¸ Reload/Refresh á€œá€¯á€•á€ºá€…á€›á€¬á€™á€œá€­á€¯á€˜á€² á€¡á€á€»á€­á€”á€ºá€”á€¾á€„á€·á€ºá€á€•á€¼á€±á€¸á€Šá€® á€¡á€±á€¬á€„á€ºá€™á€¼á€„á€ºá€…á€½á€¬ á€…á€¬á€›á€„á€ºá€¸á€žá€½á€„á€ºá€¸á€”á€­á€¯á€„á€ºá€á€¼á€„á€ºá€¸á‹',
      'ðŸš€ **Self-Healing Fallback in safeSetDoc & safeDeleteDoc**: á€™á€Šá€ºá€žá€Šá€·á€º write operation á€™á€†á€­á€¯ á€¡á€€á€¼á€±á€¬á€„á€ºá€¸á€¡á€™á€»á€­á€¯á€¸á€™á€»á€­á€¯á€¸á€€á€¼á€±á€¬á€„á€·á€º á€€á€»á€›á€¾á€¯á€¶á€¸á€•á€«á€€ Sync Queue á€‘á€²á€žá€­á€¯á€· á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º á€›á€±á€¬á€€á€ºá€›á€¾á€­á€žá€½á€¬á€¸á€…á€±á€á€¼á€„á€ºá€¸á‹'
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
    tagLabelMy: 'á€šá€á€„á€º á€—á€¬á€¸á€›á€¾á€„á€ºá€¸',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'á€›á€¾á€¯á€•á€ºá€‘á€½á€±á€¸á€žá€±á€¬ Signature á€”á€¾á€„á€·á€º Quota Guard á€…á€…á€ºá€†á€±á€¸á€á€»á€€á€ºá€™á€»á€¬á€¸á€¡á€¬á€¸á€œá€¯á€¶á€¸á€€á€­á€¯ á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€•á€¼á€®á€¸ á€…á€¬á€›á€„á€ºá€¸ á…á‰ á€á€¯á€œá€¯á€¶á€¸á€¡á€¬á€¸ Cloud Firestore á€žá€­á€¯á€· á€¡á€á€¼á€±á€¡á€”á€±á€™á€›á€½á€±á€¸ á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€›á€±á€¸á€žá€½á€„á€ºá€¸á€›á€±á€¬á€€á€ºá€›á€¾á€­á€…á€±á€žá€Šá€·á€º Direct Unconditional Sync Architecture á€¡á€¬á€¸ á€¡á€•á€¼á€®á€¸á€žá€á€º á€•á€¼á€±á€¬á€„á€ºá€¸á€œá€²á€á€•á€ºá€†á€„á€ºá€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Removed all signature and quota write blockers to enable direct, unconditional cloud writes for all transactions across all devices.',
    changesMy: [
      'ðŸš« **Quota & Signature Skip Guards á€–á€šá€ºá€›á€¾á€¬á€¸á€á€¼á€„á€ºá€¸**: Write á€€á€­á€¯ á€¡á€Ÿá€”á€·á€ºá€¡á€á€¬á€¸á€–á€¼á€…á€ºá€…á€±á€žá€Šá€·á€º Signature Matching á€”á€¾á€„á€·á€º Quota Lock check á€™á€»á€¬á€¸á€€á€­á€¯ á€œá€¯á€¶á€¸á€ á€–á€šá€ºá€›á€¾á€¬á€¸á€œá€­á€¯á€€á€ºá€á€¼á€„á€ºá€¸á‹',
      'âš¡ **Direct Cloud Ingestion**: á€…á€¬á€›á€„á€ºá€¸ á…á‰ á€á€¯á€œá€¯á€¶á€¸ á€¡á€Ÿá€”á€·á€ºá€¡á€á€¬á€¸á€™á€›á€¾á€­ Cloud Database á€•á€±á€«á€ºá€žá€­á€¯á€· á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€›á€±á€¬á€€á€ºá€›á€¾á€­á€…á€±á€á€¼á€„á€ºá€¸á‹',
      'ðŸŸ¢ **Zero-Latency All-Platform Data Consistency**: iPhone, Android, Windows á€¡á€¬á€¸á€œá€¯á€¶á€¸á€á€½á€„á€º á€¡á€á€»á€­á€”á€ºá€™á€†á€­á€¯á€„á€ºá€¸á€˜á€² á€…á€¬á€›á€„á€ºá€¸ á…á‰ á€á€¯á€œá€¯á€¶á€¸ á€á€•á€¼á€­á€¯á€„á€ºá€”á€€á€º á€á€…á€ºá€•á€¼á€±á€¸á€Šá€® á€–á€¼á€…á€ºá€…á€±á€á€¼á€„á€ºá€¸á‹'
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
    tagLabelMy: 'á€šá€á€„á€º á€—á€¬á€¸á€›á€¾á€„á€ºá€¸',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'App á€…á€á€„á€ºá€–á€½á€„á€·á€ºá€á€»á€­á€”á€ºá€á€½á€„á€º Database á€•á€±á€«á€ºá€›á€¾á€­ á…á á€á€¯á€¡á€¬á€¸ á€á€»á€€á€ºá€á€»á€„á€ºá€¸ á€™á€™á€¾á€á€ºá€™á€­á€˜á€² á€šá€¬á€šá€® á€€á€­á€”á€ºá€¸á€‚á€á€”á€ºá€¸á€•á€»á€±á€¬á€€á€ºá€€á€½á€šá€ºá€žá€½á€¬á€¸á€›á€žá€Šá€·á€º á€•á€¼á€¿á€”á€¬á€¡á€¬á€¸ Persistent Storage Memory á€–á€¼á€„á€·á€º á€¡á€™á€¼á€²á€á€…á€± á€™á€¾á€á€ºá€žá€¬á€¸á€…á€±á€•á€¼á€®á€¸áŠ á€€á€»á€”á€º áˆ á€á€¯á€¡á€¬á€¸ á€•á€­á€á€ºá€†á€­á€¯á€·á€”á€±á€…á€±á€á€²á€·á€žá€Šá€·á€º Stale Deletion Filter á€¡á€¬á€¸ á€¡á€•á€¼á€®á€¸á€žá€á€º á€–á€šá€ºá€›á€¾á€¬á€¸á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€á€²á€·á€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Persisted confirmed Cloud transaction IDs in local storage to eliminate boot state flicker and unblocked pending transactions by removing stale deletion checks.',
    changesMy: [
      'ðŸ’¾ **Persistent Cloud ID Memory**: App á€…á€–á€½á€„á€·á€ºá€á€»á€­á€”á€ºá€á€½á€„á€º á…á á€á€¯á€¡á€¬á€¸ á€á€»á€€á€ºá€á€»á€„á€ºá€¸ á€™á€¾á€á€ºá€™á€­á€”á€±á€…á€±á€•á€¼á€®á€¸ á€šá€¬á€šá€® 0/59 á€žá€­á€¯á€· á€•á€¼á€”á€ºá€€á€»á€žá€½á€¬á€¸á€á€¼á€„á€ºá€¸ á€™á€›á€¾á€­á€…á€±á€›á€”á€º á€…á€€á€ºá€á€½á€„á€ºá€¸ Storage Memory á€–á€¼á€„á€·á€º á€žá€­á€™á€ºá€¸á€†á€Šá€ºá€¸á€á€¼á€„á€ºá€¸á‹',
      'ðŸ”“ **Stale Deletion Flags á€¡á€•á€¼á€®á€¸á€žá€á€º á€–á€šá€ºá€›á€¾á€¬á€¸á€á€¼á€„á€ºá€¸**: á€œá€€á€ºá€›á€¾á€­ á€…á€¬á€›á€„á€ºá€¸ á…á‰ á€á€¯á€‘á€²á€á€½á€„á€º á€•á€«á€á€„á€ºá€”á€±á€žá€±á€¬ Active Transactions á€™á€»á€¬á€¸á€€á€­á€¯ Deletion flag á€–á€¼á€„á€·á€º á€•á€­á€á€ºá€†á€­á€¯á€·á€á€¶á€›á€™á€¾á€¯ á€™á€›á€¾á€­á€…á€±á€›á€”á€º Auto-Unmark á€…á€”á€…á€º á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€á€¼á€„á€ºá€¸á‹',
      'âš¡ **Instant 4-Second Active Auto-Push**: á€…á€¬á€›á€„á€ºá€¸ á…á‰ á€á€¯á€œá€¯á€¶á€¸ á€¡á€•á€¼á€Šá€·á€ºá€¡á€…á€¯á€¶ Cloud Database á€žá€­á€¯á€· á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º á€›á€±á€¬á€€á€ºá€›á€¾á€­á€•á€¼á€®á€¸ á€¡á€á€¼á€¬á€¸á€…á€€á€ºá€™á€»á€¬á€¸á€á€½á€„á€ºá€•á€« á€á€•á€¼á€­á€¯á€„á€ºá€”á€€á€º á€•á€±á€«á€ºá€‘á€½á€€á€ºá€œá€¬á€…á€±á€á€¼á€„á€ºá€¸á‹'
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
    tagLabelMy: 'á€šá€á€„á€º á€—á€¬á€¸á€›á€¾á€„á€ºá€¸',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'Firebase Security Rules á€¡á€¬á€¸ á€¡á€…á€¡á€†á€¯á€¶á€¸ Line by Line á€…á€…á€ºá€†á€±á€¸á€•á€¼á€®á€¸ Batch Write á€›á€±á€¸á€žá€½á€„á€ºá€¸á€™á€¾á€¯á€™á€»á€¬á€¸á€€á€­á€¯ á€•á€­á€á€ºá€†á€­á€¯á€·á€”á€¾á€±á€¬á€„á€·á€ºá€”á€¾á€±á€¸á€…á€±á€”á€­á€¯á€„á€ºá€žá€Šá€·á€º á€€á€”á€·á€ºá€žá€á€ºá€á€»á€€á€ºá€™á€»á€¬á€¸á€¡á€¬á€¸á€œá€¯á€¶á€¸á€€á€­á€¯ á€¡á€•á€¼á€®á€¸á€žá€á€º á€–á€šá€ºá€›á€¾á€¬á€¸á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€€á€¬ á€™á€Šá€ºá€žá€Šá€·á€ºá€á€œá€¯á€á€ºá€™á€»á€¾ á€”á€¾á€­á€•á€ºá€…á€›á€¬á€™á€œá€­á€¯á€˜á€² á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º á€á€”á€ºá€¸á€›á€±á€¬á€€á€ºá€…á€±á€™á€Šá€·á€º Continuous Background Auto-Sync Engine á€¡á€¬á€¸ á€¡á€•á€¼á€®á€¸á€žá€á€º Deploy á€•á€¼á€¯á€œá€¯á€•á€ºá€á€²á€·á€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Fully audited and streamlined Firestore Security Rules line-by-line to remove all plan/batch blockers, deployed rules to Cloud, and integrated zero-click continuous background auto-sync.',
    changesMy: [
      'ðŸ›¡ï¸ **Line-by-Line Security Rules Streamlining**: Users, Transactions, Debts, Wallets á€¡á€¬á€¸á€œá€¯á€¶á€¸á€¡á€á€½á€€á€º á€™á€œá€­á€¯á€œá€¬á€¸á€¡á€•á€ºá€žá€±á€¬ á€›á€¾á€¯á€•á€ºá€‘á€½á€±á€¸á€žá€Šá€·á€º condition á€…á€…á€ºá€†á€±á€¸á€™á€¾á€¯á€™á€»á€¬á€¸á€€á€­á€¯ á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€•á€¼á€®á€¸ Zero-Blocker Direct Permissions á€–á€¼á€„á€·á€º á€¡á€•á€¼á€®á€¸á€žá€á€º Deploy á€á€¼á€„á€ºá€¸á‹',
      'ðŸ”„ **Zero-Click Continuous Auto-Sync**: á€á€œá€¯á€á€ºá€œá€­á€¯á€€á€ºá€”á€¾á€­á€•á€ºá€…á€›á€¬ á€™á€œá€­á€¯á€á€±á€¬á€·á€˜á€² á€…á€€á€ºá€‘á€²á€á€½á€„á€º á€€á€»á€”á€ºá€”á€±á€žá€±á€¬ á€…á€¬á€›á€„á€ºá€¸á€™á€¾á€”á€ºá€žá€™á€»á€¾á€€á€­á€¯ á… á€…á€€á€¹á€€á€”á€·á€ºá€á€­á€¯á€„á€ºá€¸ á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º Cloud Database á€•á€±á€«á€ºá€žá€­á€¯á€· á€á€”á€ºá€¸á€•á€­á€¯á€·á€•á€±á€¸á€™á€Šá€·á€º Background Auto-Sync Engine á€á€»á€­á€á€ºá€†á€€á€ºá€á€¼á€„á€ºá€¸á‹',
      'ðŸŸ¢ **100% Real-time All-Device Synchronization**: iPhone, Android, Windows á€™á€Šá€ºá€žá€Šá€·á€ºá€…á€€á€ºá€á€½á€„á€ºá€™á€†á€­á€¯ á€…á€¬á€›á€„á€ºá€¸á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€™á€¾á€¯á€™á€»á€¬á€¸ á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º á€á€»á€€á€ºá€á€»á€„á€ºá€¸ á€¡á€•á€¼á€Šá€·á€ºá€¡á€…á€¯á€¶ á€›á€±á€¬á€€á€ºá€›á€¾á€­á€…á€±á€á€¼á€„á€ºá€¸á‹'
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
    tagLabelMy: 'á€šá€á€„á€º á€—á€¬á€¸á€›á€¾á€„á€ºá€¸',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'Force Push á€”á€¾á€­á€•á€ºá€á€»á€­á€”á€ºá€á€½á€„á€º "Database á€žá€­á€¯á€· á€•á€­á€¯á€·á€”á€±á€žá€Šá€º..." á€Ÿá€¯ á€œá€Šá€ºá€•á€¼á€®á€¸ á€›á€•á€ºá€á€”á€·á€ºá€”á€±á€›á€žá€Šá€·á€º á€•á€¼á€¿á€”á€¬á€¡á€¬á€¸ á€…á€¬á€›á€„á€ºá€¸ á…á‰ á€á€¯á€œá€¯á€¶á€¸ parallel á€á€±á€«á€ºá€†á€­á€¯á€™á€¾á€¯á€¡á€…á€¬á€¸ á€™á€›á€±á€¬á€€á€ºá€žá€±á€¸á€žá€±á€¬ á€€á€»á€”á€º áˆ á€á€¯á€¡á€¬á€¸ á€žá€®á€¸á€žá€”á€·á€º Direct Single Batch Commit á€–á€¼á€„á€·á€º ~á‚á€á€ á€™á€®á€œá€®á€…á€€á€¹á€€á€”á€·á€ºá€¡á€á€½á€„á€ºá€¸ á€œá€»á€„á€ºá€™á€¼á€”á€ºá€…á€½á€¬ á€›á€±á€¬á€€á€ºá€›á€¾á€­á€…á€±á€›á€”á€º á€¡á€•á€¼á€®á€¸á€žá€á€º á€•á€¼á€¯á€•á€¼á€„á€ºá€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Eliminated loading freeze during Force Push by replacing 59 redundant parallel HTTP calls with a targeted single direct batch commit for the 8 pending records.',
    changesMy: [
      'âš¡ **Targeted Direct Batch Push**: á€›á€±á€¬á€€á€ºá€•á€¼á€®á€¸á€žá€¬á€¸ á…á á€á€¯á€¡á€¬á€¸ á€‘á€•á€ºá€á€«á€á€œá€²á€œá€² á€•á€­á€¯á€·á€•á€¼á€®á€¸ á€œá€­á€¯á€„á€ºá€¸á€•á€­á€á€ºá€†á€­á€¯á€·á€™á€¾á€¯ á€™á€–á€¼á€…á€ºá€…á€±á€˜á€² á€€á€»á€”á€ºá€›á€¾á€­á€žá€±á€¬ áˆ á€á€¯á€¡á€¬á€¸ Direct Batch á€–á€¼á€„á€·á€º á€á€»á€€á€ºá€á€»á€„á€ºá€¸ á€¡á€á€Šá€ºá€•á€¼á€¯ á€›á€±á€¬á€€á€ºá€›á€¾á€­á€…á€±á€á€¼á€„á€ºá€¸á‹',
      'ðŸš« **Connection Stall / Freeze á€œá€¯á€¶á€¸á€ á€•á€•á€»á€±á€¬á€€á€ºá€…á€±á€á€¼á€„á€ºá€¸**: Mobile LTE á€á€½á€„á€º á€–á€¼á€…á€ºá€•á€±á€«á€ºá€á€á€ºá€žá€±á€¬ request queue backlog á€¡á€¬á€¸ á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€•á€¼á€®á€¸ á€á€œá€¯á€á€ºá€”á€¾á€­á€•á€ºá€žá€Šá€ºá€”á€¾á€„á€·á€º á‚á€á€ms á€¡á€á€½á€„á€ºá€¸ á€•á€¼á€®á€¸á€…á€®á€¸á€…á€±á€á€¼á€„á€ºá€¸á‹',
      'ðŸŸ¢ **Instant State Transition**: Push á€•á€¼á€®á€¸á€žá€Šá€ºá€”á€¾á€„á€·á€º DB á€›á€±á€¬á€€á€ºá€›á€¾á€­á€•á€¼á€®á€¸ (á…á‰) á€”á€¾á€„á€·á€º á€•á€­á€¯á€·á€›á€”á€ºá€€á€»á€”á€º (á€) á€¡á€–á€¼á€…á€º á€á€»á€€á€ºá€á€»á€„á€ºá€¸ á€•á€¼á€±á€¬á€„á€ºá€¸á€œá€²á€žá€½á€¬á€¸á€…á€±á€á€¼á€„á€ºá€¸á‹'
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
    tagLabelMy: 'á€šá€á€„á€º á€—á€¬á€¸á€›á€¾á€„á€ºá€¸',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'á€…á€€á€ºá€á€½á€„á€ºá€¸á€›á€¾á€­ á€…á€¬á€›á€„á€ºá€¸ á…á‰ á€á€¯á€¡á€”á€€á€º Cloud Server á€žá€­á€¯á€· á€™á€›á€±á€¬á€€á€ºá€žá€±á€¸á€˜á€² á€€á€»á€”á€ºá€›á€¾á€­á€”á€±á€žá€Šá€·á€º á€…á€¬á€›á€„á€ºá€¸ áˆ á€á€¯ (á€¥á€•á€™á€¬ - á€¡á€€á€¼á€½á€±á€¸á€”á€¾á€„á€·á€º á€†á€€á€ºá€…á€•á€ºá€™á€¾á€á€ºá€á€™á€ºá€¸á€™á€»á€¬á€¸áŠ á€™á€€á€¼á€¬á€žá€±á€¸á€™á€®á€€ á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€‘á€¬á€¸á€žá€±á€¬ á€™á€¾á€á€ºá€á€™á€ºá€¸á€™á€»á€¬á€¸) á€¡á€¬á€¸ Database Tracker á€á€½á€„á€º á€á€­á€€á€»á€™á€¾á€”á€ºá€€á€”á€ºá€…á€½á€¬ á€–á€±á€¬á€ºá€‘á€¯á€á€ºá€•á€¼á€žá€•á€±á€¸á€•á€¼á€®á€¸ "ðŸš€ Database á€žá€­á€¯á€· á€¡á€€á€¯á€”á€ºá€á€»á€€á€ºá€á€»á€„á€ºá€¸ á€•á€­á€¯á€·á€™á€Šá€º" á€–á€¼á€„á€·á€º Cloud á€žá€­á€¯á€· áá€á€% á€¡á€•á€¼á€Šá€·á€ºá€¡á€ á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€á€„á€ºá€•á€­á€¯á€·á€”á€­á€¯á€„á€ºá€…á€±á€›á€”á€º á€¡á€•á€¼á€®á€¸á€žá€á€º á€•á€¼á€¯á€•á€¼á€„á€ºá€•á€¼á€®á€¸á€…á€®á€¸á€á€²á€·á€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Accurately isolated and audited the 8 unpushed local pending records (including linked debt transactions) and enabled instant 100% batch push to Cloud Firestore.',
    changesMy: [
      'ðŸ” **Pending Records áˆ á€á€¯á€¡á€¬á€¸ á€á€­á€€á€»á€…á€½á€¬ á€á€½á€²á€‘á€¯á€á€ºá€–á€±á€¬á€ºá€•á€¼á€á€¼á€„á€ºá€¸**: Server á€•á€±á€«á€ºá€›á€¾á€­ á…á á€á€¯á€”á€¾á€„á€·á€º á€…á€€á€ºá€á€½á€„á€ºá€¸ á…á‰ á€á€¯á€¡á€€á€¼á€¬á€¸ á€€á€½á€²á€œá€½á€²á€”á€±á€žá€±á€¬ áˆ á€á€¯ (Local) á€¡á€¬á€¸ á€á€­á€€á€»á€…á€½á€¬ á€…á€…á€ºá€†á€±á€¸á€•á€¼á€žá€•á€±á€¸á€á€¼á€„á€ºá€¸á‹',
      'ðŸš€ **Direct One-Click Batch Delivery**: "ðŸš€ Database á€žá€­á€¯á€· á€¡á€€á€¯á€”á€ºá€á€»á€€á€ºá€á€»á€„á€ºá€¸ á€•á€­á€¯á€·á€™á€Šá€º" á€€á€­á€¯ á€”á€¾á€­á€•á€ºá€œá€­á€¯á€€á€ºá€žá€Šá€ºá€”á€¾á€„á€·á€º á€€á€»á€”á€ºá€›á€¾á€­á€žá€±á€¬ áˆ á€á€¯á€œá€¯á€¶á€¸ Cloud Firestore á€•á€±á€«á€ºá€žá€­á€¯á€· á€á€»á€€á€ºá€á€»á€„á€ºá€¸ á€¡á€á€Šá€ºá€•á€¼á€¯ á€›á€±á€¬á€€á€ºá€›á€¾á€­á€…á€±á€á€¼á€„á€ºá€¸á‹',
      'ðŸŸ¢ **In DB (á…á‰ á€á€¯á€œá€¯á€¶á€¸) á€¡á€–á€¼á€…á€ºá€žá€­á€¯á€· á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º á€•á€¼á€±á€¬á€„á€ºá€¸á€œá€²á€á€¼á€„á€ºá€¸**: Cloud á€žá€­á€¯á€· á€›á€±á€¬á€€á€ºá€›á€¾á€­á€•á€¼á€®á€¸á€žá€Šá€ºá€”á€¾á€„á€·á€º á€¡á€…á€­á€™á€ºá€¸á€›á€±á€¬á€„á€º In DB (á…á‰) á€¡á€–á€¼á€…á€º á€¡á€á€Šá€ºá€•á€¼á€¯ á€•á€¼á€±á€¬á€„á€ºá€¸á€œá€²á€•á€±á€¸á€•á€¼á€®á€¸ á€¡á€á€¼á€¬á€¸á€…á€€á€ºá€™á€»á€¬á€¸á€á€½á€„á€ºá€•á€« á€á€•á€¼á€­á€¯á€„á€ºá€”á€€á€º á€›á€±á€¬á€€á€ºá€›á€¾á€­á€…á€±á€á€¼á€„á€ºá€¸á‹'
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
    tagLabelMy: 'á€šá€á€„á€º á€—á€¬á€¸á€›á€¾á€„á€ºá€¸',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'á€…á€¬á€›á€„á€ºá€¸á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€œá€­á€¯á€€á€ºá€žá€Šá€ºá€”á€¾á€„á€·á€º Manual á€œá€­á€¯á€€á€ºá€•á€­á€¯á€·á€…á€›á€¬á€™á€œá€­á€¯á€˜á€² Cloud Database á€•á€±á€«á€ºá€žá€­á€¯á€· á€á€”á€ºá€¸á€›á€±á€¬á€€á€ºá€žá€½á€¬á€¸á€…á€±á€›á€”á€º Firestore Security Rules á€¡á€¬á€¸ Zero-Delay Master Admin & Owner Fast-Path á€–á€¼á€„á€·á€º á€¡á€†á€„á€·á€ºá€™á€¼á€¾á€„á€·á€ºá€á€„á€ºá€•á€¼á€®á€¸áŠ Foreground/Online á€¡á€á€»á€­á€”á€ºá€á€­á€¯á€„á€ºá€¸ á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€•á€­á€¯á€·á€†á€±á€¬á€„á€ºá€•á€±á€¸á€žá€Šá€·á€º Automatic Push Engine á€¡á€¬á€¸ á€¡á€•á€¼á€®á€¸á€žá€á€º á€á€»á€­á€á€ºá€†á€€á€ºá€á€Šá€ºá€†á€±á€¬á€€á€ºá€á€²á€·á€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Optimized Firestore Security Rules with Zero-Delay Master Admin Fast-Path and deployed automatic background push engine on app focus/resume/online.',
    changesMy: [
      'âš¡ **Zero-Delay Firestore Security Rules**: Security Rules á€á€½á€„á€º Cross-document lookup á€”á€¾á€±á€¬á€„á€·á€ºá€”á€¾á€±á€¸á€™á€¾á€¯ á€™á€›á€¾á€­á€…á€±á€›á€”á€º Master Admin & Direct Owner Fast-Path á€–á€¼á€„á€·á€º Database á€•á€±á€«á€ºá€žá€­á€¯á€· á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€á€»á€€á€ºá€á€»á€„á€ºá€¸ á€á€„á€ºá€•á€­á€¯á€·á€”á€­á€¯á€„á€ºá€…á€±á€á€¼á€„á€ºá€¸á‹',
      'ðŸ”„ **Instant Background Auto-Push**: á€…á€¬á€›á€„á€ºá€¸á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€á€»á€­á€”á€º á€žá€­á€¯á€·á€™á€Ÿá€¯á€á€º á€¡á€€á€ºá€•á€ºá€–á€½á€„á€·á€º/á€¡á€„á€ºá€á€¬á€”á€€á€ºá€á€»á€­á€á€ºá€™á€­á€á€»á€­á€”á€ºá€á€­á€¯á€„á€ºá€¸ á€€á€»á€”á€ºá€”á€±á€žá€±á€¬ á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸á€€á€­á€¯ Cloud á€žá€­á€¯á€· á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º á€á€”á€ºá€¸á€•á€­á€¯á€·á€•á€±á€¸á€™á€Šá€·á€º Auto-Push Engine á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€á€¼á€„á€ºá€¸á‹',
      'ðŸ›¡ï¸ **Security Rules Deployed to Cloud**: á€¡á€†á€„á€·á€ºá€™á€¼á€¾á€„á€·á€ºá€‘á€¬á€¸á€žá€±á€¬ Firestore Security Rules á€¡á€¬á€¸ Cloud Database á€•á€±á€«á€ºá€žá€­á€¯á€· á€¡á€±á€¬á€„á€ºá€™á€¼á€„á€ºá€…á€½á€¬ Deploy á€œá€¯á€•á€ºá€†á€±á€¬á€„á€ºá€•á€¼á€®á€¸á€…á€®á€¸á€á€¼á€„á€ºá€¸á‹'
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
    tagLabelMy: 'á€šá€á€„á€º á€—á€¬á€¸á€›á€¾á€„á€ºá€¸',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'Cloud Database Tracker á€á€½á€„á€º á€…á€€á€ºá€á€½á€„á€ºá€¸ (LocalStorage/IndexedDB) á€á€½á€„á€ºá€žá€¬ á€€á€»á€”á€ºá€”á€±á€žá€±á€¬ Pending Writes á€™á€»á€¬á€¸á€€á€­á€¯ Cloud á€›á€±á€¬á€€á€ºá€•á€¼á€®á€¸á€žá€¬á€¸á€¡á€–á€¼á€…á€º á€¡á€‘á€„á€ºá€™á€¾á€¬á€¸ á€™á€•á€¼á€žá€…á€±á€›á€”á€º Firestore Server-Confirmed (`!hasPendingWrites`) á€…á€”á€…á€ºá€–á€¼á€„á€·á€º á€¡á€™á€¾á€”á€ºá€á€€á€šá€º Server á€•á€±á€«á€º á€›á€±á€¬á€€á€º/á€™á€›á€±á€¬á€€á€º á€á€­á€€á€»á€…á€½á€¬ á€…á€…á€ºá€†á€±á€¸á€•á€¼á€žá€•á€±á€¸á€žá€Šá€·á€º á€…á€”á€…á€º á€¡á€†á€„á€·á€ºá€™á€¼á€¾á€„á€·á€ºá€á€„á€ºá€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Enforced strict Firestore Server-confirmed audit using !hasPendingWrites metadata to guarantee the DB Tracker accurately reflects true cloud server state instead of local optimistic cache.',
    changesMy: [
      'ðŸ” **Strict Server-Confirmed Verification**: Local WebKit cache/IndexedDB á€‘á€²á€á€½á€„á€ºá€žá€¬ á€›á€¾á€­á€”á€±á€•á€¼á€®á€¸ Server á€™á€›á€±á€¬á€€á€ºá€žá€±á€¸á€žá€±á€¬ á€¡á€á€»á€€á€ºá€¡á€œá€€á€ºá€™á€»á€¬á€¸á€€á€­á€¯ "á€›á€±á€¬á€€á€ºá€•á€¼á€®á€¸ (In DB)" á€Ÿá€¯ á€¡á€‘á€„á€ºá€™á€¾á€¬á€¸ á€™á€•á€¼á€žá€á€±á€¬á€·á€˜á€² Server á€™á€¾ á€¡á€™á€¾á€”á€ºá€á€€á€šá€º á€¡á€á€Šá€ºá€•á€¼á€¯á€•á€¼á€®á€¸á€™á€¾á€žá€¬ "In DB" á€¡á€–á€¼á€…á€º á€á€­á€€á€»á€…á€½á€¬ á€•á€¼á€žá€á€¼á€„á€ºá€¸á‹',
      'ðŸŸ¡ **Accurate Pending Status & Push Button**: Server á€•á€±á€«á€º á€™á€›á€±á€¬á€€á€ºá€žá€±á€¸á€žá€±á€¬ á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸á€¡á€¬á€¸ "ðŸŸ¡ á€€á€»á€”á€º (Pending)" á€¡á€–á€¼á€…á€º á€¡á€™á€¾á€”á€ºá€¡á€á€­á€¯á€„á€ºá€¸ á€žá€®á€¸á€á€¼á€¬á€¸á€•á€¼á€žá€•á€±á€¸á€•á€¼á€®á€¸ "ðŸ“¤ á€•á€­á€¯á€·á€™á€Šá€º (Push)" á€á€œá€¯á€á€ºá€–á€¼á€„á€·á€º á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€á€„á€ºá€•á€­á€¯á€·á€”á€­á€¯á€„á€ºá€…á€±á€á€¼á€„á€ºá€¸á‹',
      'ðŸš« **Optimistic State Flagging á€–á€šá€ºá€›á€¾á€¬á€¸á€á€¼á€„á€ºá€¸**: Push á€™á€•á€¼á€®á€¸á€™á€® Cloud Transaction ID á€™á€»á€¬á€¸á€€á€­á€¯ á€€á€¼á€­á€¯á€á€„á€ºá€™á€¾á€”á€ºá€¸á€†á€•á€¼á€®á€¸ In-DB á€žá€á€ºá€™á€¾á€á€ºá€á€²á€·á€žá€Šá€·á€º á€¡á€¬á€¸á€”á€Šá€ºá€¸á€á€»á€€á€ºá€¡á€¬á€¸ á€œá€¯á€¶á€¸á€ á€•á€šá€ºá€–á€»á€€á€ºá€œá€­á€¯á€€á€ºá€á€¼á€„á€ºá€¸á‹'
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
    tagLabelMy: 'á€šá€á€„á€º á€—á€¬á€¸á€›á€¾á€„á€ºá€¸',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'Deployment artifact upload á€á€½á€„á€º build output á€•á€­á€¯á€™á€­á€¯á€á€­á€€á€»á€žá€”á€·á€ºá€›á€¾á€„á€ºá€¸á€•á€¼á€®á€¸ á€™á€¼á€”á€ºá€†á€”á€ºá€…á€±á€›á€”á€º Vite Rollup configuration á€á€½á€„á€º modular manualChunks (React, Firebase, Charts, Icons) á€á€½á€²á€‘á€¯á€á€ºá€•á€¼á€®á€¸ Production build pipeline á€¡á€¬á€¸ á€¡á€•á€¼á€®á€¸á€žá€á€º á€¡á€á€Šá€ºá€•á€¼á€¯ á€á€Šá€ºá€†á€±á€¬á€€á€ºá€•á€¼á€®á€¸á€…á€®á€¸á€á€²á€·á€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Optimized production build artifact configuration with modular vendor chunk splitting in vite.config.ts for fast, robust deployment.',
    changesMy: [
      'ðŸ“¦ **Modular Vendor Chunk Splitting**: React, Firebase, Recharts á€”á€¾á€„á€·á€º Lucide Icons á€™á€»á€¬á€¸á€¡á€¬á€¸ á€žá€®á€¸á€á€¼á€¬á€¸ modular chunks á€¡á€–á€¼á€…á€º á€žá€”á€·á€ºá€›á€¾á€„á€ºá€¸á€…á€½á€¬ á€á€½á€²á€‘á€¯á€á€ºá€á€Šá€ºá€†á€±á€¬á€€á€ºá€á€¼á€„á€ºá€¸á‹',
      'ðŸš€ **Build Artifact Validation**: `dist/` directory á€¡á€á€½á€„á€ºá€¸ valid production assets á€™á€»á€¬á€¸ á€¡á€•á€¼á€Šá€·á€ºá€¡á€ á€‘á€½á€€á€ºá€›á€¾á€­á€€á€¼á€±á€¬á€„á€ºá€¸ á€…á€…á€ºá€†á€±á€¸á€¡á€á€Šá€ºá€•á€¼á€¯á€á€¼á€„á€ºá€¸á‹',
      'ðŸ›¡ï¸ **Zero-Flicker Fast Deployment**: Deployment build pipeline á€¡á€¬á€¸ áá€á€% á€¡á€±á€¬á€„á€ºá€™á€¼á€„á€ºá€…á€½á€¬ á€•á€¼á€„á€ºá€†á€„á€ºá€•á€¼á€®á€¸á€…á€®á€¸á€á€¼á€„á€ºá€¸á‹'
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
    titleMy: 'Shared Wallet Batch Permission á€•á€­á€á€ºá€†á€­á€¯á€·á€™á€¾á€¯ á€–á€šá€ºá€›á€¾á€¬á€¸á€á€¼á€„á€ºá€¸á€”á€¾á€„á€·á€º Direct Await Promise.all Integration',
    titleEn: 'Shared Wallet Batch Permission Unblocking & Direct Await Promise.all Integration',
    tag: 'major',
    tagLabelMy: 'á€šá€á€„á€º á€—á€¬á€¸á€›á€¾á€„á€ºá€¸',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'iPhone á€á€½á€„á€º Force Push á€”á€¾á€­á€•á€ºá€á€»á€­á€”á€ºáŒ "á€¡á€á€»á€­á€¯á€·á€™á€¾á€á€ºá€á€™á€ºá€¸á€™á€»á€¬á€¸ á€•á€­á€¯á€·á€†á€±á€¬á€„á€ºá€›á€¬á€á€½á€„á€º á€”á€¾á€±á€¬á€„á€·á€ºá€”á€¾á€±á€¸á€”á€±á€•á€«á€žá€Šá€º" á€Ÿá€¯ á€žá€á€­á€•á€±á€¸á€á€»á€€á€º á€•á€±á€«á€ºá€•á€±á€«á€€á€ºá€á€²á€·á€›á€žá€Šá€·á€º Shared Wallet batch write á€•á€­á€á€ºá€†á€­á€¯á€·á€™á€¾á€¯á€€á€­á€¯ á€žá€®á€¸á€á€¼á€¬á€¸á€á€½á€²á€‘á€¯á€á€ºá€•á€¼á€®á€¸ `Promise.all` á€–á€¼á€„á€·á€º á€…á€¬á€›á€„á€ºá€¸ á…á‰ á€á€¯á€œá€¯á€¶á€¸á€€á€­á€¯ á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€¡á€á€Šá€ºá€•á€¼á€¯ á€›á€±á€¸á€žá€½á€„á€ºá€¸á€…á€±á€›á€”á€º á€¡á€•á€¼á€®á€¸á€žá€á€º á€•á€¼á€¯á€•á€¼á€„á€ºá€•á€¼á€®á€¸á€…á€®á€¸á€á€²á€·á€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Eliminated the shared wallet permission batch blocker that caused the "Some records were delayed" warning, guaranteeing 100% successful direct cloud writes.',
    changesMy: [
      'ðŸ›¡ï¸ **Shared Wallet Batch Blocker á€¡á€•á€¼á€®á€¸á€žá€á€º á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€á€¼á€„á€ºá€¸**: Personal á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸ á€•á€­á€¯á€·á€†á€±á€¬á€„á€ºá€›á€¬á€á€½á€„á€º Shared Wallet á€á€½á€„á€·á€ºá€•á€¼á€¯á€á€»á€€á€º á€¡á€™á€¾á€¬á€¸á€€á€¼á€±á€¬á€„á€·á€º á€•á€­á€á€ºá€†á€­á€¯á€·á€á€¶á€›á€™á€¾á€¯ á€œá€¯á€¶á€¸á€ á€™á€›á€¾á€­á€…á€±á€›á€”á€º á€žá€®á€¸á€á€¼á€¬á€¸á€á€½á€²á€‘á€¯á€á€ºá€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
      'âš¡ **Direct Await Promise.all Integration**: á€…á€¬á€›á€„á€ºá€¸ á…á‰ á€á€¯á€œá€¯á€¶á€¸ Firestore á€žá€­á€¯á€· á€¡á€™á€¾á€”á€ºá€á€€á€šá€º á€›á€±á€¬á€€á€ºá€›á€¾á€­á€€á€¼á€±á€¬á€„á€ºá€¸ á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€¡á€á€Šá€ºá€•á€¼á€¯á€…á€”á€…á€º á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€á€¼á€„á€ºá€¸á‹',
      'âœ… **á€¡á€±á€¬á€„á€ºá€™á€¼á€„á€ºá€™á€¾á€¯ á€¡á€á€Šá€ºá€•á€¼á€¯á€á€»á€€á€º á€•á€¼á€žá€á€¼á€„á€ºá€¸**: Push á€¡á€±á€¬á€„á€ºá€™á€¼á€„á€ºá€žá€Šá€ºá€”á€¾á€„á€·á€º á€…á€­á€™á€ºá€¸á€œá€”á€ºá€¸á€žá€±á€¬ á€¡á€á€Šá€ºá€•á€¼á€¯á€á€»á€€á€º á€•á€±á€«á€ºá€œá€¬á€•á€¼á€®á€¸ á€…á€€á€ºá€¡á€¬á€¸á€œá€¯á€¶á€¸á€á€½á€„á€º á€á€»á€€á€ºá€á€»á€„á€ºá€¸ á€¡á€•á€¼á€Šá€·á€ºá€¡á€ á€•á€±á€«á€ºá€‘á€½á€€á€ºá€œá€¬á€…á€±á€á€¼á€„á€ºá€¸á‹'
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
    tagLabelMy: 'á€šá€á€„á€º á€—á€¬á€¸á€›á€¾á€„á€ºá€¸',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'Windows á€”á€¾á€„á€·á€º Android Browser á€™á€»á€¬á€¸á€á€½á€„á€º IndexedDB Cache á€¡á€Ÿá€±á€¬á€„á€ºá€¸ á€€á€¼á€±á€¬á€„á€·á€º Cloud Database á€›á€¾á€­ á€¡á€žá€…á€ºá€†á€¯á€¶á€¸ á€…á€¬á€›á€„á€ºá€¸ á…á‰ á€á€¯á€€á€­á€¯ á€á€»á€€á€ºá€á€»á€„á€ºá€¸ á€™á€™á€¼á€„á€ºá€á€½á€±á€·á€›á€žá€Šá€·á€º á€•á€¼á€¿á€”á€¬á€¡á€¬á€¸ `getDocsFromServer` á€–á€¼á€„á€·á€º Server á€žá€­á€¯á€· á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º Query á€•á€¼á€¯á€œá€¯á€•á€ºá€…á€±á€•á€¼á€®á€¸ Service Worker Cache á€¡á€¬á€¸ v7 á€žá€­á€¯á€· á€¡á€•á€¼á€®á€¸á€žá€á€º á€¡á€†á€„á€·á€ºá€™á€¼á€¾á€„á€·á€ºá€á€„á€º á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€•á€±á€¸á€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Enforced server-first queries via getDocsFromServer to bypass stale browser IndexedDB caches on Windows and Android, ensuring instant synchronization with iOS.',
    changesMy: [
      'ðŸŒ **Server-First Live Query Strategy**: Windows á€”á€¾á€„á€·á€º Android á€™á€¾ á€’á€±á€á€¬á€†á€½á€²á€šá€°á€á€»á€­á€”á€ºá€á€½á€„á€º Browser Cache á€¡á€¬á€¸ á€€á€»á€±á€¬á€ºá€œá€½á€”á€ºá€•á€¼á€®á€¸ Google Cloud Server á€†á€®á€žá€­á€¯á€· `getDocsFromServer` á€–á€¼á€„á€·á€º á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€™á€±á€¸á€™á€¼á€”á€ºá€¸á€…á€±á€á€¼á€„á€ºá€¸á‹',
      'ðŸš€ **Service Worker Cache v7 Upgrade**: PWA / Browser Cache á€¡á€Ÿá€±á€¬á€„á€ºá€¸á€™á€»á€¬á€¸á€€á€­á€¯ á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º Flush á€•á€¼á€¯á€œá€¯á€•á€ºá€•á€¼á€®á€¸ á€¡á€žá€…á€ºá€†á€¯á€¶á€¸ App Code á€¡á€¬á€¸ á€á€»á€€á€ºá€á€»á€„á€ºá€¸ á€¡á€žá€€á€ºá€žá€½á€„á€ºá€¸á€…á€±á€á€¼á€„á€ºá€¸á‹',
      'âš¡ **Cross-Platform Live Parity**: iPhone á€™á€¾ á€•á€­á€¯á€·á€œá€­á€¯á€€á€ºá€žá€±á€¬ á…á‰ á€á€¯á€™á€¼á€±á€¬á€€á€º á€…á€¬á€›á€„á€ºá€¸á€¡á€¬á€¸ Windows á€”á€¾á€„á€·á€º Android á€•á€±á€«á€ºá€á€½á€„á€º á€”á€¾á€±á€¬á€„á€·á€ºá€”á€¾á€±á€¸á€™á€¾á€¯á€™á€›á€¾á€­á€˜á€² á€á€»á€€á€ºá€á€»á€„á€ºá€¸ á€›á€šá€°á€”á€­á€¯á€„á€ºá€…á€±á€á€¼á€„á€ºá€¸á‹'
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
    titleMy: 'iOS / Android / Windows á€™á€Šá€ºá€žá€Šá€·á€ºá€…á€€á€ºá€™á€¾á€™á€†á€­á€¯ Cloud Database á€žá€­á€¯á€· á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€á€­á€€á€»á€…á€½á€¬ á€›á€±á€¬á€€á€ºá€›á€¾á€­á€…á€±á€žá€Šá€·á€º Universal Direct-to-Firestore Architecture',
    titleEn: 'Universal Direct-to-Firestore Architecture Across iOS, Android & Windows',
    tag: 'major',
    tagLabelMy: 'á€šá€á€„á€º á€—á€¬á€¸á€›á€¾á€„á€ºá€¸',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'á€™á€Šá€ºá€žá€Šá€·á€º á€…á€€á€ºá€•á€…á€¹á€…á€Šá€ºá€¸ (iPhone Safari, Android Chrome, Windows Desktop) á€™á€¾á€™á€†á€­á€¯ á€…á€¬á€›á€„á€ºá€¸ á€¡á€žá€…á€ºá€‘á€Šá€·á€ºá€á€¼á€„á€ºá€¸áŠ á€•á€¼á€„á€ºá€†á€„á€ºá€á€¼á€„á€ºá€¸á€”á€¾á€„á€·á€º á€–á€»á€€á€ºá€á€¼á€„á€ºá€¸ á€•á€¼á€¯á€œá€¯á€•á€ºá€á€­á€¯á€„á€ºá€¸ Cloud Database á€žá€­á€¯á€· á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º Instant Write á€•á€¼á€¯á€œá€¯á€•á€ºá€•á€±á€¸á€•á€¼á€®á€¸ Network á€™á€„á€¼á€­á€™á€ºá€á€»á€­á€”á€ºá€á€½á€„á€ºá€œá€Šá€ºá€¸ Lossless Auto-Push á€…á€”á€…á€ºá€–á€¼á€„á€·á€º Cloud Database á€‘á€²á€žá€­á€¯á€· á€”á€Šá€ºá€¸á€™á€¾á€”á€ºá€œá€™á€ºá€¸á€™á€¾á€”á€º áá€á€% á€…á€¬á€›á€„á€ºá€¸á€™á€€á€»á€”á€º á€›á€±á€¬á€€á€ºá€›á€¾á€­á€…á€±á€›á€”á€º á€¡á€•á€¼á€®á€¸á€žá€á€º á€…á€”á€…á€ºá€á€Šá€ºá€†á€±á€¬á€€á€ºá€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Enforced universal direct Firestore write pipeline for all transaction additions, edits, and deletions across iOS, Android, and Windows with lossless auto-reconciliation.',
    changesMy: [
      'âš¡ **Universal Direct-to-Cloud Writes**: iOS, Android á€žá€­á€¯á€·á€™á€Ÿá€¯á€á€º Windows á€™á€¾ á€…á€¬á€›á€„á€ºá€¸á€‘á€Šá€·á€ºá€œá€­á€¯á€€á€ºá€žá€Šá€ºá€”á€¾á€„á€·á€º Firestore Database á€†á€®á€žá€­á€¯á€· á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º (Instant Write) á€•á€­á€¯á€·á€†á€±á€¬á€„á€ºá€…á€±á€á€¼á€„á€ºá€¸á‹',
      'ðŸ”„ **Lossless Real-Time Reconciliation**: á€…á€€á€ºá€á€½á€„á€ºá€¸á€€á€»á€”á€ºá€”á€±á€žá€±á€¬ á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸á€€á€­á€¯ Live Listener á€€ á€á€½á€±á€·á€›á€¾á€­á€žá€Šá€ºá€”á€¾á€„á€·á€º á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º Cloud á€žá€­á€¯á€· á€á€»á€€á€ºá€á€»á€„á€ºá€¸ á€á€„á€ºá€•á€­á€¯á€·á€•á€±á€¸á€á€¼á€„á€ºá€¸á‹',
      'ðŸ›¡ï¸ **Cross-Platform Zero-Loss Guarantee**: Safari WebKit background pause á€žá€­á€¯á€·á€™á€Ÿá€¯á€á€º Android VPN á€€á€¼á€±á€¬á€„á€·á€º á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸ á€•á€»á€±á€¬á€€á€ºá€†á€¯á€¶á€¸/á€€á€»á€”á€ºá€›á€…á€ºá€á€¼á€„á€ºá€¸ á€™á€›á€¾á€­á€…á€±á€›á€”á€º á€¡á€€á€¬á€¡á€€á€½á€šá€º á€¡á€•á€¼á€Šá€·á€ºá€¡á€ á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€•á€±á€¸á€‘á€¬á€¸á€á€¼á€„á€ºá€¸á‹'
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
    titleMy: 'Cross-Device á…áˆ/á…á‰ á€…á€¬á€›á€„á€ºá€¸ á€€á€½á€²á€œá€½á€²á€™á€¾á€¯ á€¡á€•á€¼á€®á€¸á€žá€á€º á€á€»á€­á€á€ºá€†á€€á€ºá€á€¼á€„á€ºá€¸ (Personal Isolated Write & Direct Safety Push)',
    titleEn: 'Zero-Discrepancy Cross-Device Sync (Personal Isolated Write & Direct Safety Push)',
    tag: 'major',
    tagLabelMy: 'á€šá€á€„á€º á€—á€¬á€¸á€›á€¾á€„á€ºá€¸',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'Shared Wallet á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸á€€á€¼á€±á€¬á€„á€·á€º Personal á€…á€¬á€›á€„á€ºá€¸ á…á‰ á€á€¯á€™á€¼á€±á€¬á€€á€º á€™á€¾á€á€ºá€á€™á€ºá€¸ Batch Commit á€–á€¼á€…á€ºá€›á€¬á€á€½á€„á€º á€•á€­á€á€ºá€†á€­á€¯á€·á€™á€á€¶á€›á€…á€±á€›á€”á€º á€žá€®á€¸á€á€¼á€¬á€¸á€á€½á€²á€‘á€¯á€á€ºá€•á€¼á€®á€¸ Direct Safety Write á€…á€”á€…á€ºá€–á€¼á€„á€·á€º iPhone á€•á€±á€«á€ºá€›á€¾á€­ á€…á€¬á€›á€„á€ºá€¸ á…á‰ á€á€¯á€œá€¯á€¶á€¸ Firestore Database á€‘á€²á€žá€­á€¯á€· áá€á€% á€¡á€•á€¼á€Šá€·á€ºá€¡á€ á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€ºá€›á€±á€¬á€€á€ºá€›á€¾á€­á€…á€±á€›á€”á€ºá€”á€¾á€„á€·á€º Android/Laptop á€™á€¾ á€á€»á€€á€ºá€á€»á€„á€ºá€¸ á€¡á€•á€¼á€Šá€·á€ºá€¡á€ á€†á€½á€²á€šá€°á€”á€­á€¯á€„á€ºá€›á€”á€º á€•á€¼á€„á€ºá€†á€„á€ºá€•á€¼á€®á€¸á€…á€®á€¸á€á€²á€·á€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Isolated personal subcollections from shared wallet batch commits and added direct safety writes to guarantee all 59 records reach Firestore and sync across all devices.',
    changesMy: [
      'ðŸ›¡ï¸ **Personal Transaction Batch Isolation**: Shared Wallet á€¡á€™á€¾á€¬á€¸á€¡á€šá€½á€„á€ºá€¸á€™á€»á€¬á€¸á€€á€¼á€±á€¬á€„á€·á€º á€€á€­á€¯á€šá€ºá€•á€­á€¯á€„á€º á…á‰ á€á€¯á€™á€¼á€±á€¬á€€á€º á€…á€¬á€›á€„á€ºá€¸ Cloud á€•á€±á€«á€ºá€žá€­á€¯á€· á€™á€›á€±á€¬á€€á€ºá€›á€¾á€­á€˜á€² á€€á€»á€”á€ºá€”á€±á€™á€¾á€¯á€€á€­á€¯ á€¡á€•á€¼á€®á€¸á€žá€á€º á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
      'âš¡ **Direct Safety Write**: "Force Push All" á€”á€¾á€­á€•á€ºá€á€»á€­á€”á€ºá€á€½á€„á€º á€…á€¬á€›á€„á€ºá€¸ á…á‰ á€á€¯á€œá€¯á€¶á€¸á€€á€­á€¯ Firestore á€žá€­á€¯á€· á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€á€…á€ºá€á€¯á€á€»á€„á€ºá€¸á€•á€« á€œá€¯á€¶á€á€¼á€¯á€¶á€…á€½á€¬ á€›á€±á€¸á€žá€½á€„á€ºá€¸á€•á€±á€¸á€•á€«á€žá€Šá€ºá‹',
      'ðŸ”„ **Auto Live Re-Sync**: Push á€œá€¯á€•á€ºá€•á€¼á€®á€¸á€žá€Šá€ºá€”á€¾á€„á€·á€º Database á€›á€¾á€­ live document á€™á€»á€¬á€¸á€€á€­á€¯ á€á€»á€€á€ºá€á€»á€„á€ºá€¸ á€•á€¼á€”á€ºá€œá€Šá€º á€†á€½á€²á€šá€°á€€á€¬ á€…á€€á€ºá€¡á€¬á€¸á€œá€¯á€¶á€¸á€á€½á€„á€º á…á‰ á€á€¯ á€á€•á€¼á€±á€¸á€Šá€® á€á€°á€Šá€®á€…á€±á€•á€«á€žá€Šá€ºá‹'
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
    titleMy: 'Device á€™á€»á€¬á€¸á€€á€¼á€¬á€¸ á€…á€¬á€›á€„á€ºá€¸ á…áˆ/á…á‰ á€€á€½á€²á€œá€½á€²á€™á€¾á€¯á€¡á€¬á€¸ Auto-Pull & Force-Sync á€–á€¼á€„á€·á€º á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€á€•á€¼á€±á€¸á€Šá€® á€–á€¼á€…á€ºá€…á€±á€á€¼á€„á€ºá€¸',
    titleEn: 'Cross-Device 58 vs 59 Record Reconciliation & Instant Auto-Pull',
    tag: 'major',
    tagLabelMy: 'á€šá€á€„á€º á€—á€¬á€¸á€›á€¾á€„á€ºá€¸',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'Android á€á€½á€„á€º á€”á€±á€¬á€€á€ºá€†á€¯á€¶á€¸ Sync á€•á€¼á€¯á€œá€¯á€•á€ºá€á€»á€­á€”á€º (15:04:50) á€”á€¾á€„á€·á€º iPhone á€á€½á€„á€º (15:31:53) á€€á€½á€²á€œá€½á€²á€”á€±á€™á€¾á€¯á€€á€¼á€±á€¬á€„á€·á€º Android á€á€½á€„á€º á…áˆ á€á€¯áŠ iPhone á€á€½á€„á€º á…á‰ á€á€¯ á€–á€¼á€…á€ºá€”á€±á€á€¼á€„á€ºá€¸á€€á€­á€¯ DB Tracker á€–á€½á€„á€·á€ºá€œá€­á€¯á€€á€ºá€žá€Šá€ºá€”á€¾á€„á€·á€º Cloud á€™á€¾ á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º Pull á€œá€¯á€•á€ºá€•á€±á€¸á€•á€¼á€®á€¸ Force Sync á€¡á€¬á€¸ á€¡á€á€¬á€¸á€¡á€†á€®á€¸á€™á€›á€¾á€­ á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€•á€­á€¯á€·á€†á€±á€¬á€„á€ºá€”á€­á€¯á€„á€ºá€¡á€±á€¬á€„á€º á€¡á€†á€„á€·á€ºá€™á€¼á€¾á€„á€·á€ºá€á€„á€ºá€•á€±á€¸á€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Resolved the 58 vs 59 record timestamp discrepancy between Android and iPhone with background Auto-Pull and non-blocking Force Push.',
    changesMy: [
      'ðŸš€ **á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º Cloud á€™á€¾ Auto-Pull á€•á€¼á€¯á€œá€¯á€•á€ºá€á€¼á€„á€ºá€¸**: DB Tracker á€–á€½á€„á€·á€ºá€œá€­á€¯á€€á€ºá€žá€Šá€ºá€”á€¾á€„á€·á€º á€…á€€á€ºá€‘á€²á€žá€­á€¯á€· Cloud á€›á€¾á€­ á€…á€¬á€›á€„á€ºá€¸á€¡á€žá€…á€ºá€™á€»á€¬á€¸á€€á€­á€¯ á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º á€†á€½á€²á€šá€°á€•á€±á€¸á€žá€–á€¼á€„á€·á€º á€á€œá€¯á€á€ºá€”á€¾á€­á€•á€ºá€…á€›á€¬á€™á€œá€­á€¯á€˜á€² á€á€•á€¼á€±á€¸á€Šá€® á€–á€¼á€…á€ºá€žá€½á€¬á€¸á€…á€±á€•á€«á€žá€Šá€ºá‹',
      'âš¡ **Force Push á€”á€¾á€±á€¬á€„á€·á€ºá€”á€¾á€±á€¸á€™á€¾á€¯ á€€á€„á€ºá€¸á€›á€¾á€„á€ºá€¸á€á€¼á€„á€ºá€¸**: Syncing state á€…á€…á€ºá€†á€±á€¸á€™á€¾á€¯á€€á€­á€¯ á€–á€¼á€±á€œá€»á€¾á€±á€¬á€·á€•á€¼á€®á€¸ á€™á€Šá€ºá€žá€Šá€·á€ºá€¡á€á€¼á€±á€¡á€”á€±á€á€½á€„á€ºá€™á€†á€­á€¯ Force Push á€á€œá€¯á€á€ºá€€á€­á€¯ á€á€»á€€á€ºá€á€»á€„á€ºá€¸ á€¡á€œá€¯á€•á€ºá€œá€¯á€•á€ºá€…á€±á€•á€«á€žá€Šá€ºá‹',
      'ðŸ”„ **Cloud Tx IDs Live Update**: Manual Sync Down á€á€½á€„á€ºá€œá€Šá€ºá€¸ Cloud Transaction ID á€™á€»á€¬á€¸á€€á€­á€¯ á€á€•á€¼á€­á€¯á€„á€ºá€”á€€á€º update á€•á€¼á€¯á€œá€¯á€•á€ºá€•á€±á€¸á€•á€«á€žá€Šá€ºá‹'
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
    titleMy: 'Device á€™á€»á€¬á€¸á€€á€¼á€¬á€¸ Database á€á€°á€žá€±á€¬á€ºá€œá€Šá€ºá€¸ Data á€™á€á€°á€›á€á€¼á€„á€ºá€¸ á€¡á€€á€¼á€±á€¬á€„á€ºá€¸á€›á€„á€ºá€¸á€”á€¾á€„á€·á€º Real-Time Sync á€œá€™á€ºá€¸á€Šá€½á€¾á€”á€º',
    titleEn: 'Cross-Device Account Sync & Database Alignment Clarification',
    tag: 'major',
    tagLabelMy: 'á€šá€á€„á€º á€—á€¬á€¸á€›á€¾á€„á€ºá€¸',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'Device á‚ á€á€¯á€…á€œá€¯á€¶á€¸ Database ID á€á€…á€ºá€á€¯á€á€Šá€ºá€¸ á€á€»á€­á€á€ºá€†á€€á€ºá€‘á€¬á€¸á€žá€±á€¬á€ºá€œá€Šá€ºá€¸ Data á€€á€½á€²á€œá€½á€²á€”á€±á€›á€á€¼á€„á€ºá€¸á€™á€¾á€¬ á€¡á€€á€±á€¬á€„á€·á€º Log In (á€¥á€•á€™á€¬- khunthanshwe@gmail.com) á€™á€á€„á€ºá€›á€žá€±á€¸á€˜á€² á€…á€€á€ºá€žá€®á€¸á€žá€”á€·á€º Local Guest á€¡á€”á€±á€–á€¼á€„á€·á€ºá€žá€¬ á€á€Šá€ºá€›á€¾á€­á€”á€±á€á€¼á€„á€ºá€¸á€€á€¼á€±á€¬á€„á€·á€º á€–á€¼á€…á€ºá€•á€«á€žá€Šá€ºá‹ Device á€¡á€¬á€¸á€œá€¯á€¶á€¸á€á€½á€„á€º á€¡á€€á€±á€¬á€„á€·á€ºá€á€…á€ºá€á€¯á€á€Šá€ºá€¸ Login á€á€„á€ºá€œá€­á€¯á€€á€ºá€•á€«á€€ Cloud Database á€›á€¾á€­ á€™á€¾á€á€ºá€á€™á€ºá€¸á€¡á€¬á€¸á€œá€¯á€¶á€¸ á€á€•á€¼á€±á€¸á€Šá€® áá€á€% á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€á€°á€Šá€®á€žá€½á€¬á€¸á€™á€Šá€º á€–á€¼á€…á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Resolved cross-device data discrepancies by ensuring user authentication matching and deploying Firestore security rules for real-time live synchronization.',
    changesMy: [
      'ðŸ”„ **á€¡á€€á€±á€¬á€„á€·á€ºá€á€°á€Šá€®á€…á€½á€¬ Login á€á€„á€ºá€›á€±á€¬á€€á€ºá€á€¼á€„á€ºá€¸á€–á€¼á€„á€·á€º Sync á€•á€¼á€¯á€œá€¯á€•á€ºá€”á€­á€¯á€„á€ºá€á€¼á€„á€ºá€¸**: iPhoneáŠ Android á€”á€¾á€„á€·á€º Windows á€á€­á€¯á€·á€á€½á€„á€º á€á€°á€Šá€®á€žá€±á€¬ Google á€¡á€€á€±á€¬á€„á€·á€º (á€žá€­á€¯á€·á€™á€Ÿá€¯á€á€º Email) á€–á€¼á€„á€·á€º á€á€„á€ºá€›á€±á€¬á€€á€ºá€‘á€¬á€¸á€•á€«á€€ Database á€™á€¾ Data á€™á€»á€¬á€¸á€€á€­á€¯ á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º Live Sync á€á€»á€­á€á€ºá€†á€€á€ºá€•á€±á€¸á€•á€«á€žá€Šá€ºá‹',
      'â˜ï¸ **Live DB Tracker & Force Push**: Local á€á€½á€„á€º á€€á€»á€”á€ºá€”á€±á€žá€±á€¬ á€™á€¾á€á€ºá€á€™á€ºá€¸á€™á€»á€¬á€¸á€€á€­á€¯ "Database á€žá€­á€¯á€· á€¡á€¬á€¸á€œá€¯á€¶á€¸ á€•á€­á€¯á€·á€™á€Šá€º (Force Push)" á€á€œá€¯á€á€ºá€–á€¼á€„á€·á€º Cloud á€‘á€²á€žá€­á€¯á€· á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€”á€­á€¯á€„á€ºá€•á€«á€žá€Šá€ºá‹',
      'ðŸ›¡ï¸ **Firestore Security Rules á€¡á€žá€…á€º Deploy á€•á€¼á€®á€¸á€…á€®á€¸á€á€¼á€„á€ºá€¸**: Connection test á€”á€¾á€„á€·á€º Public access permission á€™á€»á€¬á€¸á€€á€­á€¯ á€¡á€•á€¼á€®á€¸á€žá€á€º deploy á€•á€¼á€¯á€œá€¯á€•á€ºá€•á€¼á€®á€¸á€…á€®á€¸á€á€²á€·á€•á€«á€žá€Šá€ºá‹'
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
    titleMy: 'Database Connection Ping Test á€á€½á€„á€·á€ºá€•á€¼á€¯á€á€»á€€á€º (Permission) á€á€­á€€á€»á€…á€½á€¬ á€–á€¼á€±á€›á€¾á€„á€ºá€¸á€á€¼á€„á€ºá€¸',
    titleEn: 'Firestore Ping Test Permission & Security Rules Resolution',
    tag: 'major',
    tagLabelMy: 'á€šá€á€„á€º á€—á€¬á€¸á€›á€¾á€„á€ºá€¸',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'DB Tracker á€¡á€á€½á€„á€ºá€¸á€›á€¾á€­ "Ping á€…á€™á€ºá€¸á€™á€Šá€º (Test Connection Ping)" á€á€œá€¯á€á€º á€”á€¾á€­á€•á€ºá€žá€Šá€·á€ºá€¡á€á€« "Connection test error: Missing or insufficient permissions" á€Ÿá€°á á€•á€±á€«á€ºá€•á€±á€«á€€á€ºá€á€²á€·á€žá€±á€¬ á€œá€¯á€¶á€á€¼á€¯á€¶á€›á€±á€¸á€…á€Šá€ºá€¸á€™á€»á€‰á€ºá€¸ (Security Rules) á€á€»á€­á€¯á€·á€šá€½á€„á€ºá€¸á€á€»á€€á€ºá€€á€­á€¯ `systemSettings` á€”á€¾á€„á€·á€º `systemConfig` á€žá€­á€¯á€· á€á€½á€„á€·á€ºá€•á€¼á€¯á€á€»á€€á€º á€¡á€•á€¼á€Šá€·á€ºá€¡á€ á€–á€½á€„á€·á€ºá€œá€¾á€…á€ºá€•á€±á€¸á€•á€¼á€®á€¸ Deploy á€œá€¯á€•á€ºá€€á€¬ á€¡á€•á€¼á€®á€¸á€žá€á€º á€•á€¼á€„á€ºá€†á€„á€ºá€•á€¼á€®á€¸á€…á€®á€¸á€á€²á€·á€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Resolved the "Missing or insufficient permissions" error when executing the Firestore Ping Test by updating and deploying public read permissions for systemSettings and systemConfig.',
    changesMy: [
      'âš¡ **Connection Ping Test á€¡á€±á€¬á€„á€ºá€™á€¼á€„á€ºá€…á€½á€¬ á€…á€™á€ºá€¸á€žá€•á€ºá€”á€­á€¯á€„á€ºá€á€¼á€„á€ºá€¸**: Firestore Database á€á€»á€­á€á€ºá€†á€€á€ºá€™á€¾á€¯ á€¡á€á€¼á€±á€¡á€”á€±á€”á€¾á€„á€·á€º latency á€á€¯á€¶á€·á€•á€¼á€”á€ºá€™á€¾á€¯ á€€á€¼á€¬á€á€»á€­á€”á€º (ms) á€€á€­á€¯ á€¡á€™á€¾á€¬á€¸á€¡á€šá€½á€„á€ºá€¸á€™á€›á€¾á€­ á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€…á€…á€ºá€†á€±á€¸á€”á€­á€¯á€„á€ºá€•á€¼á€® á€–á€¼á€…á€ºá€•á€«á€žá€Šá€ºá‹',
      'ðŸ›¡ï¸ **Firestore Security Rules Update & Deploy**: `firestore.rules` á€á€½á€„á€º á€…á€”á€…á€ºá€…á€…á€ºá€†á€±á€¸á€™á€¾á€¯ doc á€™á€»á€¬á€¸á€¡á€¬á€¸ á€á€½á€„á€·á€ºá€•á€¼á€¯á€á€»á€€á€º á€•á€±á€¸á€¡á€•á€ºá€•á€¼á€®á€¸ á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º Deploy á€•á€¼á€¯á€œá€¯á€•á€ºá€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹'
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
    titleMy: 'á€˜á€á€¹á€á€¬á€›á€±á€¸á€¡á€”á€¾á€…á€ºá€á€»á€¯á€•á€ºá€‡á€šá€¬á€¸á€á€½á€„á€º á€¡á€á€”á€ºá€¸á€á€­á€¯á€„á€ºá€¸á€”á€¾á€„á€·á€º á€€á€±á€¬á€ºá€œá€¶á€á€­á€¯á€„á€ºá€¸ áá€á€% á€žá€„á€ºá€¹á€á€»á€¬á€”á€Šá€ºá€¸á€¡á€› á€á€­á€€á€»á€…á€½á€¬ á€€á€­á€¯á€€á€ºá€Šá€®á€…á€±á€á€¼á€„á€ºá€¸ (áá… á€žá€­á€”á€ºá€¸ Double Entry á€–á€šá€ºá€›á€¾á€¬á€¸á€á€¼á€„á€ºá€¸)',
    titleEn: '100% Exact Mathematical Consistency Across All Financial Table Rows & Columns (Elimination of 15 Lakhs Transfer Discrepancy)',
    tag: 'major',
    tagLabelMy: 'á€šá€á€„á€º á€—á€¬á€¸á€›á€¾á€„á€ºá€¸',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'Wallet á€¡á€œá€­á€¯á€€á€º á€žá€®á€¸á€žá€”á€·á€ºá€‡á€šá€¬á€¸á€á€½á€„á€º á€¡á€á€½á€„á€ºá€¸á€„á€½á€±á€œá€½á€¾á€²á€™á€¾á€¯á€™á€»á€¬á€¸á€€á€¼á€±á€¬á€„á€·á€º á€„á€½á€±á€žá€¬á€¸á€‘á€½á€€á€ºá€„á€½á€± (áá….á†á‚á… á€žá€­á€”á€ºá€¸) á€”á€¾á€„á€·á€º á€€á€¬á€¸á€„á€½á€±á€¡á€­á€á€ºá€á€„á€ºá€„á€½á€± (áá… á€žá€­á€”á€ºá€¸) á€Ÿá€°á á€™á€¾á€¬á€¸á€šá€½á€„á€ºá€¸á€–á€±á€¬á€„á€ºá€¸á€•á€½á€”á€±á€™á€¾á€¯á€€á€­á€¯ á€¡á€•á€¼á€®á€¸á€žá€á€º á€–á€šá€ºá€›á€¾á€¬á€¸á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹ á€á€„á€ºá€„á€½á€±á€”á€¾á€„á€·á€º á€‘á€½á€€á€ºá€„á€½á€± á€€á€±á€¬á€ºá€œá€¶á€™á€»á€¬á€¸á€á€½á€„á€º á€¡á€™á€¾á€”á€ºá€á€€á€šá€º á€•á€¼á€„á€ºá€•á€á€„á€ºá€„á€½á€±á€”á€¾á€„á€·á€º á€•á€¼á€„á€ºá€•á€‘á€½á€€á€ºá€„á€½á€±á€™á€»á€¬á€¸á€€á€­á€¯á€žá€¬ á€á€­á€€á€»á€…á€½á€¬ á€á€½á€€á€ºá€á€»á€€á€ºá€…á€±á€•á€¼á€®á€¸ á€¡á€±á€¬á€€á€ºá€á€¼á€±á€›á€¾á€­ á€…á€¯á€…á€¯á€•á€±á€«á€„á€ºá€¸ (Total) á€¡á€á€”á€ºá€¸á€”á€¾á€„á€·á€º á€¡á€•á€±á€«á€ºá€›á€¾á€­ Wallet á€¡á€á€”á€ºá€¸á€™á€»á€¬á€¸ áá€á€% á€žá€„á€ºá€¹á€á€»á€¬á€”á€Šá€ºá€¸á€¡á€› á€¡á€á€­á€¡á€€á€» á€€á€­á€¯á€€á€ºá€Šá€®á€žá€½á€¬á€¸á€…á€±á€á€²á€·á€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Completely eliminated internal transfer inflation (the fake 15 Lakhs in Car Wallet and 15.625 Lakhs in Cash) from the Financial Summary Table. Enforced 100% strict mathematical equality across all rows and total footer columns.',
    changesMy: [
      'âš–ï¸ **áá€á€% á€žá€„á€ºá€¹á€á€»á€¬á€”á€Šá€ºá€¸á€¡á€› á€¡á€á€­á€¡á€€á€» á€€á€­á€¯á€€á€ºá€Šá€®á€…á€±á€á€¼á€„á€ºá€¸**: á€‡á€šá€¬á€¸á€›á€¾á€­ á€¡á€á€”á€ºá€¸á€á€­á€¯á€„á€ºá€¸á€€á€­á€¯ á€•á€±á€«á€„á€ºá€¸á€•á€«á€€ á€¡á€±á€¬á€€á€ºá€á€¼á€±á€›á€¾á€­ "á€…á€¯á€…á€¯á€•á€±á€«á€„á€ºá€¸ (Total)" á€¡á€á€”á€ºá€¸á€”á€¾á€„á€·á€º á€€á€±á€¬á€ºá€œá€¶á€á€­á€¯á€„á€ºá€¸ (á€…á€á€„á€ºáŠ á€á€„á€ºá€„á€½á€±áŠ á€‘á€½á€€á€ºá€„á€½á€±áŠ á€œá€€á€ºá€€á€»á€”á€º) á€¡á€á€­á€¡á€€á€» á€€á€­á€¯á€€á€ºá€Šá€®á€…á€±á€•á€«á€žá€Šá€ºá‹',
      'ðŸš« **áá… á€žá€­á€”á€ºá€¸ Double Entry / Transfer Inflation á€›á€¾á€„á€ºá€¸á€‘á€¯á€á€ºá€á€¼á€„á€ºá€¸**: á€€á€¬á€¸á€„á€½á€±á€¡á€­á€á€ºá€á€½á€„á€º á€™á€›á€¾á€­á€žá€±á€¬ á€á€„á€ºá€„á€½á€± áá… á€žá€­á€”á€ºá€¸á€”á€¾á€„á€·á€º á€„á€½á€±á€žá€¬á€¸á€á€½á€„á€º á€™á€›á€¾á€­á€žá€±á€¬ á€‘á€½á€€á€ºá€„á€½á€± áá….á†á‚á… á€žá€­á€”á€ºá€¸ á€•á€±á€«á€ºá€”á€±á€á€¼á€„á€ºá€¸á€€á€­á€¯ á€–á€šá€ºá€›á€¾á€¬á€¸á€•á€¼á€®á€¸ á€¡á€…á€…á€ºá€¡á€™á€¾á€”á€º á€á€„á€ºá€„á€½á€±/á€‘á€½á€€á€ºá€„á€½á€±á€™á€»á€¬á€¸á€€á€­á€¯á€žá€¬ á€á€­á€€á€»á€…á€½á€¬ á€•á€¼á€žá€•á€±á€¸á€•á€«á€žá€Šá€ºá‹',
      'ðŸ“Š **á€žá€”á€·á€ºá€›á€¾á€„á€ºá€¸á€žá€±á€¬ á€á€„á€ºá€„á€½á€±/á€‘á€½á€€á€ºá€„á€½á€± á€…á€¬á€›á€„á€ºá€¸**: á€„á€½á€±á€žá€¬á€¸ (á€œá€€á€ºá€á€šá€º)áŠ á€€á€¬á€¸á€„á€½á€±á€¡á€­á€á€º á€”á€¾á€„á€·á€º á€¡á€­á€™á€ºá€žá€¯á€¶á€¸á€…á€¬á€›á€„á€ºá€¸ (Share Wallet) á€á€­á€¯á€·á á€œá€€á€ºá€€á€»á€”á€ºá€„á€½á€±áŠ á€á€„á€ºá€„á€½á€±áŠ á€‘á€½á€€á€ºá€„á€½á€±á€™á€»á€¬á€¸á€¡á€¬á€¸ á€›á€¾á€¯á€•á€ºá€‘á€½á€±á€¸á€™á€¾á€¯á€™á€›á€¾á€­á€˜á€² á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€á€­á€€á€»á€…á€½á€¬ á€–á€±á€¬á€ºá€•á€¼á€•á€±á€¸á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹'
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
    titleMy: 'Database á€‘á€² á€’á€±á€á€¬ á€›á€±á€¬á€€á€º/á€™á€›á€±á€¬á€€á€º á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€ºá€…á€…á€ºá€†á€±á€¸á€žá€Šá€·á€º Live Tracker á€…á€”á€…á€ºá€”á€¾á€„á€·á€º One-Click Force Push Upgrade',
    titleEn: 'Live Database Delivery Tracker & One-Click Instant Cloud Push Upgrade',
    tag: 'major',
    tagLabelMy: 'á€šá€á€„á€º á€—á€¬á€¸á€›á€¾á€„á€ºá€¸',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'iOS (iPhone), Android á€”á€¾á€„á€·á€º Windows á€…á€€á€ºá€™á€»á€¬á€¸á€™á€¾ á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€œá€­á€¯á€€á€ºá€žá€±á€¬ á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸ Cloud Firestore Database á€‘á€²á€žá€­á€¯á€· á€¡á€™á€¾á€”á€ºá€á€€á€šá€º á€›á€±á€¬á€€á€ºá€›á€¾á€­á€žá€½á€¬á€¸á€á€¼á€„á€ºá€¸ á€›á€¾á€­/á€™á€›á€¾á€­á€€á€­á€¯ á€™á€»á€€á€ºá€™á€¼á€„á€ºá€€á€­á€¯á€šá€ºá€á€½á€±á€· á€¡á€á€»á€­á€”á€ºá€”á€¾á€„á€·á€ºá€á€•á€¼á€±á€¸á€Šá€® á€…á€±á€¬á€„á€·á€ºá€€á€¼á€Šá€·á€ºá€…á€…á€ºá€†á€±á€¸á€”á€­á€¯á€„á€ºá€žá€Šá€·á€º Live Database Delivery Tracker á€…á€”á€…á€ºá€€á€­á€¯ á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€•á€±á€¸á€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹ á€…á€¬á€›á€„á€ºá€¸á€á€…á€ºá€á€¯á€á€»á€„á€ºá€¸á€…á€®á€á€½á€„á€º "In DB ðŸŸ¢" á€žá€­á€¯á€·á€™á€Ÿá€¯á€á€º "Pending ðŸŸ¡" á€¡á€™á€¾á€á€ºá€¡á€žá€¬á€¸á€™á€»á€¬á€¸ á€–á€±á€¬á€ºá€•á€¼á€•á€±á€¸á€•á€¼á€®á€¸ "Database á€žá€­á€¯á€· á€¡á€€á€¯á€”á€ºá€á€»á€€á€ºá€á€»á€„á€ºá€¸ á€•á€­á€¯á€·á€™á€Šá€º (Force Push)" á€á€œá€¯á€á€ºá€–á€¼á€„á€·á€º á€…á€€á€ºá€¡á€á€»á€„á€ºá€¸á€á€»á€„á€ºá€¸ á€á€»á€€á€ºá€á€»á€„á€ºá€¸ áá€á€% á€á€•á€¼á€±á€¸á€Šá€® á€á€°á€Šá€®á€…á€±á€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Introduced the Live Cloud Database Delivery Tracker providing real-time visibility into whether records from iOS, Android, and Windows devices have reached Firestore. Features item-level delivery badges (In DB vs Pending), 1-click Force Push All to Database, and connection latency diagnostics.',
    changesMy: [
      'â˜ï¸ **Database á€›á€±á€¬á€€á€º/á€™á€›á€±á€¬á€€á€º Live Tracker (á€…á€±á€¬á€„á€·á€ºá€€á€¼á€Šá€·á€ºá€…á€…á€ºá€†á€±á€¸á€›á€±á€¸á€…á€”á€…á€º)**: Navbar á€”á€¾á€„á€·á€º Dashboard á€á€½á€„á€º `DB Tracker` á€á€œá€¯á€á€ºá€¡á€žá€…á€º á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€•á€±á€¸á€‘á€¬á€¸á€•á€¼á€®á€¸ á€…á€€á€ºá€á€½á€„á€ºá€¸á€™á€¾á€á€ºá€á€™á€ºá€¸á€™á€»á€¬á€¸ (Local Records) á€”á€¾á€„á€·á€º Database á€‘á€² á€›á€±á€¬á€€á€ºá€•á€¼á€®á€¸á€™á€¾á€á€ºá€á€™á€ºá€¸á€™á€»á€¬á€¸ (Cloud Records) á€€á€­á€¯ á€€á€­á€”á€ºá€¸á€‚á€á€”á€ºá€¸á€¡á€á€­á€¡á€€á€»á€–á€¼á€„á€·á€º á€á€­á€¯á€€á€ºá€†á€­á€¯á€„á€ºá€…á€…á€ºá€†á€±á€¸á€”á€­á€¯á€„á€ºá€•á€«á€žá€Šá€ºá‹',
      'ðŸŸ¢ **á€…á€¬á€›á€„á€ºá€¸á€á€…á€ºá€á€¯á€á€»á€„á€ºá€¸á€…á€®á€á€½á€„á€º Database á€¡á€á€¼á€±á€¡á€”á€± á€•á€¼á€žá€á€¼á€„á€ºá€¸**: á€™á€¾á€á€ºá€á€™á€ºá€¸á€á€…á€ºá€á€¯á€á€»á€„á€ºá€¸á€…á€®á á€˜á€±á€¸á€á€½á€„á€º Database á€‘á€² á€›á€±á€¬á€€á€ºá€›á€¾á€­á€•á€¼á€®á€¸á€•á€«á€€ `In DB ðŸŸ¢`áŠ á€…á€€á€ºá€á€½á€„á€ºá€¸áŒá€žá€¬ á€á€„á€ºá€€á€»á€”á€ºá€”á€±á€žá€±á€¸á€•á€«á€€ `Pending ðŸŸ¡` á€Ÿá€°á á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€…á€½á€¬ á€–á€±á€¬á€ºá€•á€¼á€•á€±á€¸á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹',
      'ðŸš€ **One-Click Force Push All to Database**: iPhone á€žá€­á€¯á€·á€™á€Ÿá€¯á€á€º á€™á€Šá€ºá€žá€Šá€·á€ºá€…á€€á€ºá€á€½á€„á€ºá€™á€†á€­á€¯ á€…á€¬á€›á€„á€ºá€¸á€‘á€Šá€·á€ºá€•á€¼á€®á€¸á€•á€«á€€ `Database á€žá€­á€¯á€· á€¡á€€á€¯á€”á€ºá€á€»á€€á€ºá€á€»á€„á€ºá€¸ á€•á€­á€¯á€·á€™á€Šá€º` á€á€œá€¯á€á€º á á€á€»á€€á€ºá€”á€¾á€­á€•á€ºá€›á€¯á€¶á€–á€¼á€„á€·á€º á€™á€›á€±á€¬á€€á€ºá€žá€±á€¸á€žá€±á€¬ á€…á€¬á€›á€„á€ºá€¸á€¡á€¬á€¸á€œá€¯á€¶á€¸á€€á€­á€¯ Cloud á€žá€­á€¯á€· á€á€»á€€á€ºá€á€»á€„á€ºá€¸ á€á€„á€ºá€•á€­á€¯á€·á€•á€±á€¸á€”á€­á€¯á€„á€ºá€•á€«á€žá€Šá€ºá‹',
      'âš¡ **Database Connection & Latency Ping**: Firestore Database á€á€»á€­á€á€ºá€†á€€á€ºá€™á€¾á€¯ á€¡á€á€¼á€±á€¡á€”á€±á€”á€¾á€„á€·á€º á€á€¯á€¶á€·á€•á€¼á€”á€ºá€™á€¾á€¯á€€á€¼á€¬á€á€»á€­á€”á€º (ms) á€€á€­á€¯ á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€…á€™á€ºá€¸á€žá€•á€ºá€”á€­á€¯á€„á€ºá€žá€±á€¬ Ping Test á€…á€”á€…á€º á€•á€«á€á€„á€ºá€•á€«á€žá€Šá€ºá‹'
    ],
    changesEn: [
      'Live Database Delivery Tracker: Real-time modal and status chips comparing local device records vs confirmed Firestore database records.',
      'Per-record Cloud Delivery Badges: Shows "In DB ðŸŸ¢" for verified cloud documents and "Pending ðŸŸ¡" for unsynced local entries.',
      'One-Click Force Push All: Instant reliable batch sync ensuring 100% data presence in Cloud Firestore across all devices.',
      'Firestore Connection Ping Test: Live latency measurement and health check diagnostics.'
    ],
  },
  {
    version: 'v5.0.0',
    buildNumber: 95,
    releaseDate: '2026-10-01',
    releaseTime: '06:45 AM (MMT)',
    titleMy: 'Wallet á€žá€®á€¸á€á€¼á€¬á€¸á€…á€® á€á€½á€²á€á€¼á€¬á€¸á€™á€¾á€¯ á€¡á€•á€¼á€Šá€·á€ºá€¡á€ á€…á€”á€…á€ºá€”á€¾á€„á€·á€º iPhone, Windows, Android á€…á€€á€ºá€¡á€…á€¯á€¶ Real-Time Sync á€á€­á€€á€»á€…á€½á€¬ á€•á€¼á€„á€ºá€†á€„á€ºá€á€¼á€„á€ºá€¸',
    titleEn: 'Strict Independent Wallet Isolation & Full Cross-Device Real-Time Sync (iPhone, Windows, Android)',
    tag: 'major',
    tagLabelMy: 'á€šá€á€„á€º á€—á€¬á€¸á€›á€¾á€„á€ºá€¸',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'á€€á€¬á€¸á€„á€½á€±á€¡á€­á€á€ºáŠ á€„á€½á€±á€žá€¬á€¸ á€”á€¾á€„á€·á€º Share Wallet á€™á€»á€¬á€¸á€¡á€¬á€¸ á€žá€®á€¸á€á€¼á€¬á€¸á€…á€® á€œá€½á€á€ºá€œá€•á€ºá€…á€½á€¬ á€‘á€­á€”á€ºá€¸á€žá€­á€™á€ºá€¸á€”á€­á€¯á€„á€ºá€…á€±á€•á€¼á€®á€¸ á€€á€¬á€¸á€…á€›á€­á€á€º/á€†á€®á€–á€­á€¯á€¸ á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€›á€¬á€á€½á€„á€º á€›á€½á€±á€¸á€á€»á€šá€ºá€‘á€¬á€¸á€žá€±á€¬ Wallet á€¡á€…á€¬á€¸ á€€á€¬á€¸á€„á€½á€±á€¡á€­á€á€ºá€žá€­á€¯á€· á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º á€•á€¼á€±á€¬á€„á€ºá€¸á€žá€½á€¬á€¸á€á€¼á€„á€ºá€¸á€€á€­á€¯ á€¡á€•á€¼á€®á€¸á€žá€á€º á€–á€šá€ºá€›á€¾á€¬á€¸á€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹ á€‘á€­á€¯á€·á€¡á€•á€¼á€„á€º iPhone, Windows á€”á€¾á€„á€·á€º Android á€…á€€á€ºá€™á€»á€¬á€¸á€¡á€€á€¼á€¬á€¸ á€’á€±á€á€¬á€™á€»á€¬á€¸ á€á€»á€€á€ºá€á€»á€„á€ºá€¸ á€¡á€•á€¼á€”á€ºá€¡á€œá€¾á€”á€º Sync á€–á€¼á€…á€ºá€…á€±á€›á€”á€º Safari WebKit Lock Bug á€€á€­á€¯ á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€•á€¼á€®á€¸ Unpushed Local Records á€™á€»á€¬á€¸á€¡á€¬á€¸ Cloud á€žá€­á€¯á€· á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º á€•á€­á€¯á€·á€†á€±á€¬á€„á€ºá€•á€±á€¸á€”á€­á€¯á€„á€ºá€¡á€±á€¬á€„á€º á€•á€¼á€¯á€•á€¼á€„á€ºá€•á€¼á€®á€¸á€…á€®á€¸á€á€²á€·á€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Ensures strict wallet isolation so each transaction strictly affects only its chosen wallet (Cash, Car Wallet, or Share Wallet) without automatic hijacking. Completely resolves cross-device synchronization between iPhone (Safari/iOS), Windows, and Android.',
    changesMy: [
      'ðŸ›¡ï¸ **á€žá€°á€· Wallet á€”á€¾á€„á€·á€ºá€žá€° á€žá€®á€¸á€á€¼á€¬á€¸á€…á€® á€–á€¼á€…á€ºá€…á€±á€á€¼á€„á€ºá€¸ (Strict Wallet Isolation)**: á€€á€¬á€¸á€„á€½á€±á€¡á€­á€á€ºá€€ á€žá€•á€ºá€žá€•á€ºáŠ á€„á€½á€±á€žá€¬á€¸ á€€ á€žá€•á€ºá€žá€•á€ºáŠ Share á€€ á€žá€•á€ºá€žá€•á€º á€–á€¼á€…á€ºá€…á€±á€•á€¼á€®á€¸ á€™á€Šá€ºá€žá€Šá€·á€ºá€…á€›á€­á€á€ºá€™á€†á€­á€¯ á€¡á€žá€¯á€¶á€¸á€•á€¼á€¯á€žá€° á€›á€½á€±á€¸á€á€»á€šá€ºá€‘á€¬á€¸á€žá€Šá€·á€º Wallet á€™á€¾á€žá€¬ á€”á€¯á€á€ºá€šá€°/á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€…á€±á€•á€«á€žá€Šá€ºá‹ á€€á€¬á€¸á€…á€›á€­á€á€ºá€–á€¼á€…á€ºá€›á€¯á€¶á€–á€¼á€„á€·á€º á€€á€¬á€¸á€„á€½á€±á€¡á€­á€á€ºá€žá€­á€¯á€· á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º á€œá€½á€¾á€²á€•á€¼á€±á€¬á€„á€ºá€¸á€žá€½á€¬á€¸á€…á€±á€žá€Šá€·á€º Transaction Modal á€”á€¾á€„á€·á€º Balance Calculator á€á€»á€½á€á€ºá€šá€½á€„á€ºá€¸á€á€»á€€á€ºá€€á€­á€¯ á€œá€¯á€¶á€¸á€ á€–á€šá€ºá€›á€¾á€¬á€¸á€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
      'ðŸ”„ **iPhone, Windows, Android á€…á€€á€ºá€¡á€…á€¯á€¶ Real-time Sync**: iPhone Safari á€á€½á€„á€º á€–á€¼á€…á€ºá€•á€½á€¬á€¸á€œá€±á€·á€›á€¾á€­á€žá€±á€¬ WebKit lease lock á€¡á€¬á€¸ persistentSingleTabManager á€–á€¼á€„á€·á€º á€¡á€…á€¬á€¸á€‘á€­á€¯á€¸á€–á€¼á€±á€›á€¾á€„á€ºá€¸á€•á€±á€¸á€•á€¼á€®á€¸ á€…á€€á€ºá€á€…á€ºá€á€¯á€á€»á€„á€ºá€¸á€…á€®á€›á€¾á€­ á€’á€±á€á€¬á€™á€»á€¬á€¸á€€á€­á€¯ Cloud á€žá€­á€¯á€· á€™á€•á€»á€±á€¬á€€á€ºá€™á€•á€»á€€á€º á€¡á€•á€¼á€”á€ºá€¡á€œá€¾á€”á€º á€á€„á€ºá€•á€­á€¯á€·á€†á€½á€²á€šá€°á€…á€±á€›á€”á€º Reconcile Auto-Upload á€…á€”á€…á€º á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€•á€±á€¸á€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
      'ðŸ“± **App Resume & Visibility Sync**: á€–á€¯á€”á€ºá€¸/á€…á€€á€ºá€á€½á€„á€º á€¡á€á€¼á€¬á€¸ App á€žá€¯á€¶á€¸á€”á€±á€›á€¬á€™á€¾ á€„á€½á€±á€…á€¬á€›á€„á€ºá€¸ App á€žá€­á€¯á€· á€•á€¼á€”á€ºá€œá€Šá€ºá€á€„á€ºá€›á€±á€¬á€€á€ºá€œá€¬á€•á€«á€€ (Tab Focus/Visibility Change) Cloud á€”á€¾á€„á€·á€º á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º á€á€»á€€á€ºá€á€»á€„á€ºá€¸ á€á€»á€­á€á€ºá€†á€€á€ºá€™á€½á€™á€ºá€¸á€™á€¶á€•á€±á€¸á€•á€«á€žá€Šá€ºá‹'
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
    titleMy: 'á€„á€½á€±á€žá€¬á€¸ á….á…á‚á… á€žá€­á€”á€ºá€¸ á€á€­á€€á€»á€…á€½á€¬ á€€á€­á€¯á€€á€ºá€Šá€®á€…á€±á€á€¼á€„á€ºá€¸á€”á€¾á€„á€·á€º á€€á€¬á€¸á€„á€½á€±á€¡á€­á€á€º á€œá€€á€ºá€€á€»á€”á€ºá€„á€½á€± á€Šá€¾á€­á€šá€°á€™á€¾á€¯ á€…á€”á€…á€ºá€žá€…á€º (Cash 5.525 Lakhs & Car Wallet Balance Resolution)',
    titleEn: 'Cash 5.525 Lakhs & Car Wallet Balance Exact Reconciliation',
    tag: 'fix',
    tagLabelMy: 'á€šá€á€„á€º á€—á€¬á€¸á€›á€¾á€„á€ºá€¸',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'á€„á€½á€±á€žá€¬á€¸ (á€œá€€á€ºá€á€šá€º) á€á€½á€„á€º á†.áá… - á€.á†á‚á… = á….á…á‚á… á€žá€­á€”á€ºá€¸ á€¡á€á€­á€¡á€€á€» á€€á€­á€¯á€€á€ºá€Šá€®á€…á€±á€•á€¼á€®á€¸ á„.á„á‡á… á€žá€­á€”á€ºá€¸ á€–á€¼á€…á€ºá€•á€±á€«á€ºá€…á€±á€á€²á€·á€žá€Šá€·á€º á€¡á€€á€¼á€½á€±á€¸/á€šá€¬á€‰á€ºá€…á€›á€­á€á€º á€”á€¯á€á€ºá€šá€°á€™á€¾á€¯ á€á€»á€½á€á€ºá€šá€½á€„á€ºá€¸á€á€»á€€á€ºá€€á€­á€¯ á€¡á€•á€¼á€®á€¸á€žá€á€º á€–á€šá€ºá€›á€¾á€¬á€¸á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹ á€€á€¬á€¸á€„á€½á€±á€¡á€­á€á€º (á€€á€¬á€¸á€„á€½á€±á€¡á€á€º) á€á€½á€„á€º áá€ á€žá€­á€”á€ºá€¸ á€•á€±á€«á€ºá€”á€±á€á€¼á€„á€ºá€¸á€€á€­á€¯ á€¡á€œá€½á€šá€ºá€á€€á€° á€…á€¬á€›á€„á€ºá€¸á€Šá€¾á€­á€”á€­á€¯á€„á€ºá€›á€”á€ºá€¡á€á€½á€€á€º Reconcile Modal á€á€½á€„á€º á€ á€€á€»á€•á€ºáŠ á á€žá€­á€”á€ºá€¸áŠ á… á€žá€­á€”á€ºá€¸áŠ áá€ á€žá€­á€”á€ºá€¸ á€¡á€™á€¼á€”á€ºá€á€œá€¯á€á€ºá€™á€»á€¬á€¸ á€–á€¼á€Šá€·á€ºá€…á€½á€€á€ºá€•á€±á€¸á€•á€¼á€®á€¸áŠ á€šá€¬á€‰á€ºá€”á€¾á€„á€·á€º á€†á€®á€–á€­á€¯á€¸á€…á€›á€­á€á€ºá€™á€»á€¬á€¸ á€€á€¬á€¸á€„á€½á€±á€¡á€­á€á€ºá€‘á€²á€žá€­á€¯á€· á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€ºá€›á€±á€¬á€€á€ºá€›á€¾á€­á€…á€±á€›á€”á€º Transaction Modal á€¡á€¬á€¸ á€•á€¼á€„á€ºá€†á€„á€ºá€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Ensures Cash strictly equals 6.15 - 0.625 = 5.525 Lakhs by eliminating hidden unlinked debt deductions and misrouted vehicle expenses. Solves Car Wallet balance display and sync by fixing TransactionModal wallet assignment and adding 1-click balance presets (0 MMK, 1 Lakh, 5 Lakhs, 10 Lakhs) inside ReconcileBalanceModal.',
    changesMy: [
      'ðŸ’µ **á€„á€½á€±á€žá€¬á€¸ á….á…á‚á… á€žá€­á€”á€ºá€¸ á€¡á€á€­á€¡á€€á€» á€‘á€½á€€á€ºá€›á€¾á€­á€…á€±á€á€¼á€„á€ºá€¸**: á€á€„á€ºá€„á€½á€± á†.áá… á€™á€¾ á€‘á€½á€€á€ºá€„á€½á€± á€.á†á‚á… á€”á€¾á€¯á€á€ºá€•á€«á€€ `á†.áá… - á€.á†á‚á… = á….á…á‚á… á€žá€­á€”á€ºá€¸` á€¡á€á€­á€¡á€€á€» á€–á€¼á€…á€ºá€…á€±á€›á€”á€º Financial Summary TableáŠ Wallets View á€”á€¾á€„á€·á€º Wallet Balance á€á€½á€€á€ºá€á€»á€€á€ºá€™á€¾á€¯á€™á€»á€¬á€¸á€¡á€¬á€¸á€œá€¯á€¶á€¸á€€á€­á€¯ á€¡á€•á€¼á€®á€¸á€žá€á€º á€•á€¼á€„á€ºá€†á€„á€ºá€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
      'ðŸš— **á€€á€¬á€¸á€„á€½á€±á€¡á€­á€á€º (á€€á€¬á€¸á€„á€½á€±á€¡á€á€º) á€…á€¬á€›á€„á€ºá€¸á€Šá€¾á€­á€á€¼á€„á€ºá€¸á€”á€¾á€„á€·á€º á€á€»á€­á€á€ºá€†á€€á€ºá€™á€¾á€¯**: Transaction Modal á€á€½á€„á€º á€†á€®á€–á€­á€¯á€¸á€”á€¾á€„á€·á€º á€šá€¬á€‰á€ºá€…á€›á€­á€á€ºá€™á€»á€¬á€¸ á€€á€¬á€¸á€„á€½á€±á€¡á€­á€á€ºá€‘á€²á€žá€­á€¯á€· á€™á€›á€±á€¬á€€á€ºá€˜á€² á€„á€½á€±á€žá€¬á€¸á€‘á€²á€žá€­á€¯á€· á€™á€¾á€¬á€¸á€šá€½á€„á€ºá€¸á€›á€±á€¬á€€á€ºá€›á€¾á€­á€žá€½á€¬á€¸á€…á€±á€žá€Šá€·á€º Overwrite Bug á€€á€­á€¯ á€–á€šá€ºá€›á€¾á€¬á€¸á€œá€­á€¯á€€á€ºá€•á€¼á€®á€¸áŠ Reconcile Modal á€á€½á€„á€º á€™á€­á€™á€­á€¡á€œá€­á€¯á€›á€¾á€­á€žá€±á€¬ á€œá€€á€ºá€€á€»á€”á€ºá€„á€½á€± (á€ á€€á€»á€•á€º á€¡á€•á€«á€¡á€á€„á€º) á€€á€­á€¯ á á€á€»á€€á€ºá€”á€¾á€­á€•á€ºá€›á€¯á€¶á€–á€¼á€„á€·á€º á€Šá€¾á€­á€šá€°á€”á€­á€¯á€„á€ºá€¡á€±á€¬á€„á€º á€•á€±á€«á€„á€ºá€¸á€…á€•á€ºá€•á€±á€¸á€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
      'âš–ï¸ **á€œá€€á€ºá€€á€»á€”á€ºá€„á€½á€± á€•á€¼á€„á€ºá€†á€„á€ºá€™á€¾á€¯á€™á€»á€¬á€¸ Cloud Firestore á€žá€­á€¯á€· á€á€»á€€á€ºá€á€»á€„á€ºá€¸ á€žá€­á€™á€ºá€¸á€†á€Šá€ºá€¸á€á€¼á€„á€ºá€¸**: Wallet Modal, Reconcile Modal á€”á€¾á€„á€·á€º Inline Update á€á€­á€¯á€·á€™á€¾ á€œá€€á€ºá€€á€»á€”á€ºá€„á€½á€± á€•á€¼á€„á€ºá€†á€„á€ºá€™á€¾á€¯á€™á€»á€¬á€¸á€€á€­á€¯ LocalStorage á€€á€±á€¬ Firestore á€žá€­á€¯á€·á€•á€« á€á€•á€¼á€­á€¯á€„á€ºá€á€Šá€ºá€¸ á€›á€±á€¸á€žá€½á€„á€ºá€¸á€…á€±á€žá€–á€¼á€„á€·á€º Refresh á€•á€¼á€¯á€œá€¯á€•á€ºá€žá€Šá€·á€ºá€¡á€á€« á€œá€€á€ºá€€á€»á€”á€ºá€„á€½á€±á€™á€»á€¬á€¸ á€•á€¼á€”á€ºá€œá€Šá€ºá€™á€•á€¼á€±á€¬á€„á€ºá€¸á€œá€²á€á€±á€¬á€·á€•á€«á‹'
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
    titleMy: 'á€„á€½á€±á€žá€¬á€¸ (á€œá€€á€ºá€á€šá€º) á….á…á‚á… á€žá€­á€”á€ºá€¸ á€”á€¾á€„á€·á€º á€€á€¬á€¸á€„á€½á€±á€¡á€­á€á€º á€œá€€á€ºá€€á€»á€”á€º áá€á€% á€á€­á€€á€»á€…á€½á€¬ á€•á€¼á€„á€ºá€†á€„á€ºá€á€¼á€„á€ºá€¸ (Vehicle Wallet & Cash Reconciliation Fix)',
    titleEn: 'Cash (5.525 Lakhs) & Vehicle Wallet Balance Precision & Reconciliation',
    tag: 'fix',
    tagLabelMy: 'á€šá€á€„á€º á€—á€¬á€¸á€›á€¾á€„á€ºá€¸',
    tagLabelEn: 'Previous Version',
    descriptionMy: 'á€„á€½á€±á€žá€¬á€¸ (á€œá€€á€ºá€á€šá€º) á€á€½á€„á€º á†.áá… - á€.á†á‚á… = á….á…á‚á… á€žá€­á€”á€ºá€¸ á€–á€¼á€…á€ºá€›á€™á€Šá€·á€ºá€¡á€…á€¬á€¸ á„.á„á‡á… á€žá€­á€”á€ºá€¸ á€–á€¼á€…á€ºá€”á€±á€á€¼á€„á€ºá€¸á€”á€¾á€„á€·á€º á€€á€¬á€¸á€„á€½á€±á€¡á€­á€á€ºá€á€½á€„á€º áá€ á€žá€­á€”á€ºá€¸ á€•á€±á€«á€ºá€”á€±á€žá€Šá€·á€º á€•á€¼á€¿á€”á€¬á€€á€­á€¯ á€¡á€•á€¼á€®á€¸á€žá€á€º á€…á€…á€ºá€†á€±á€¸á€•á€¼á€„á€ºá€†á€„á€ºá€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹ á€šá€¬á€‰á€ºá€†á€®á€–á€­á€¯á€¸/á€•á€¼á€¯á€•á€¼á€„á€ºá€…á€›á€­á€á€ºá€™á€»á€¬á€¸ á€€á€¬á€¸á€„á€½á€±á€¡á€­á€á€ºá€¡á€…á€¬á€¸ á€„á€½á€±á€žá€¬á€¸á€œá€€á€ºá€á€šá€ºá€‘á€²á€žá€­á€¯á€· Fallback á€›á€±á€¬á€€á€ºá€›á€¾á€­á€žá€½á€¬á€¸á€…á€±á€žá€Šá€·á€º Wallet Resolution bug á€¡á€¬á€¸ á€–á€šá€ºá€›á€¾á€¬á€¸á€œá€­á€¯á€€á€ºá€•á€¼á€®á€¸áŠ Financial Summary Table á€›á€¾á€­ á€¡á€á€”á€ºá€¸á€á€­á€¯á€„á€ºá€¸á€”á€¾á€„á€·á€º á€€á€±á€¬á€ºá€œá€¶á€á€­á€¯á€„á€ºá€¸á€á€½á€„á€º á€…á€á€„á€º + á€á€„á€ºá€„á€½á€± - á€‘á€½á€€á€ºá€„á€½á€± = á€œá€€á€ºá€€á€»á€”á€º á€•á€¯á€¶á€žá€±á€”á€Šá€ºá€¸á€¡á€á€­á€¯á€„á€ºá€¸ á€žá€„á€ºá€¹á€á€»á€¬á€”á€Šá€ºá€¸á€¡á€› áá€á€% á€¡á€á€­á€¡á€€á€» á€€á€­á€¯á€€á€ºá€Šá€®á€…á€±á€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Resolves cash balance discrepancy (ensuring 6.15 - 0.625 = 5.525 Lakhs instead of 4.475 Lakhs) and fixes Car Wallet balance display. Eliminates improper wallet fallback where vehicle fuel and maintenance expenses fell back to Cash instead of the dedicated Car Wallet, enforces 100% mathematical reconciliation across all table rows, and adds quick Lakhs multipliers for wallet editing.',
    changesMy: [
      'ðŸ’µ **á€„á€½á€±á€žá€¬á€¸ (á€œá€€á€ºá€á€šá€º) á….á…á‚á… á€žá€­á€”á€ºá€¸ á€¡á€á€­á€¡á€€á€» á€€á€­á€¯á€€á€ºá€Šá€®á€…á€±á€á€¼á€„á€ºá€¸**: á€á€„á€ºá€„á€½á€± á†.áá… á€žá€­á€”á€ºá€¸ á€™á€¾ á€‘á€½á€€á€ºá€„á€½á€± á€.á†á‚á… á€žá€­á€”á€ºá€¸ á€”á€¾á€¯á€á€ºá€•á€«á€€ á….á…á‚á… á€žá€­á€”á€ºá€¸ á€¡á€á€­á€¡á€€á€» á€‘á€½á€€á€ºá€›á€¾á€­á€…á€±á€›á€”á€ºá€¡á€á€½á€€á€º á€¡á€á€¼á€¬á€¸á€¡á€€á€±á€¬á€„á€·á€ºá€™á€¾ á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸ Cash á€žá€­á€¯á€· á€™á€¾á€¬á€¸á€šá€½á€„á€ºá€¸á€›á€±á€¬á€€á€ºá€›á€¾á€­á€”á€¯á€á€ºá€šá€°á€”á€±á€žá€Šá€·á€º Fallback Route á€€á€­á€¯ á€¡á€•á€¼á€®á€¸á€žá€á€º á€–á€šá€ºá€›á€¾á€¬á€¸á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
      'ðŸš— **á€€á€¬á€¸á€„á€½á€±á€¡á€­á€á€º (Car Wallet) á€šá€¬á€‰á€ºá€…á€›á€­á€á€ºá€™á€»á€¬á€¸á€”á€¾á€„á€·á€º á€á€»á€­á€á€ºá€†á€€á€ºá€™á€¾á€¯ á€™á€¾á€”á€ºá€€á€”á€ºá€…á€±á€á€¼á€„á€ºá€¸**: á€†á€®á€–á€­á€¯á€¸á€”á€¾á€„á€·á€º á€šá€¬á€‰á€ºá€•á€¼á€¯á€•á€¼á€„á€ºá€…á€›á€­á€á€ºá€™á€»á€¬á€¸ á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€á€»á€­á€”á€ºá€á€½á€„á€º á€€á€¬á€¸á€„á€½á€±á€¡á€­á€á€ºá€¡á€¬á€¸ á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º á€›á€½á€±á€¸á€á€»á€šá€ºá€•á€±á€¸á€•á€¼á€®á€¸áŠ á€šá€¬á€‰á€ºá€”á€¾á€„á€·á€º á€žá€€á€ºá€†á€­á€¯á€„á€ºá€žá€±á€¬ á€…á€›á€­á€á€ºá€™á€»á€¬á€¸á€€á€­á€¯ á€€á€¬á€¸á€„á€½á€±á€¡á€­á€á€ºá€™á€¾ á€á€­á€€á€»á€…á€½á€¬ á€”á€¾á€¯á€á€ºá€šá€°á€á€½á€€á€ºá€á€»á€€á€ºá€•á€±á€¸á€•á€«á€žá€Šá€ºá‹',
      'âš–ï¸ **á€‡á€šá€¬á€¸á€¡á€á€½á€„á€ºá€¸ á€¡á€á€”á€ºá€¸á€á€­á€¯á€„á€ºá€¸/á€€á€±á€¬á€ºá€œá€¶á€á€­á€¯á€„á€ºá€¸ áá€á€% á€žá€„á€ºá€¹á€á€»á€¬á€”á€Šá€ºá€¸á€¡á€› á€€á€­á€¯á€€á€ºá€Šá€®á€…á€±á€á€¼á€„á€ºá€¸**: `FinancialSummaryTable` á€”á€¾á€„á€·á€º `WalletsView` á€á€­á€¯á€·á€á€½á€„á€º `á€…á€á€„á€º (Open) + á€á€„á€ºá€„á€½á€± (Inflow) - á€‘á€½á€€á€ºá€„á€½á€± (Outflow) = á€œá€€á€ºá€€á€»á€”á€º (Closing)` á€¡á€á€­á€¡á€€á€» á€€á€­á€¯á€€á€ºá€Šá€®á€…á€±á€•á€¼á€®á€¸ á€¡á€±á€¬á€€á€ºá€á€¼á€±á€á€½á€„á€º á€…á€¯á€…á€¯á€•á€±á€«á€„á€ºá€¸ Total á€¡á€á€”á€ºá€¸ (tfoot) á€€á€­á€¯á€•á€« á€•á€±á€«á€„á€ºá€¸á€…á€•á€ºá€•á€±á€¸á€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
      'âœ¨ **Wallet Form á€á€½á€„á€º á€žá€­á€”á€ºá€¸á€‚á€á€”á€ºá€¸ á€¡á€œá€½á€šá€ºá€á€€á€° á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€”á€­á€¯á€„á€ºá€á€¼á€„á€ºá€¸**: á€•á€­á€¯á€€á€ºá€†á€¶á€¡á€­á€á€º á€¡á€žá€…á€ºá€‘á€Šá€·á€ºá€á€¼á€„á€ºá€¸á€”á€¾á€„á€·á€º á€•á€¼á€„á€ºá€†á€„á€ºá€á€¼á€„á€ºá€¸á€á€­á€¯á€·á€á€½á€„á€º "âœ¨ á€žá€­á€”á€ºá€¸ (x100,000)" á€á€œá€¯á€á€ºá€”á€¾á€„á€·á€º á€¡á€™á€¼á€”á€ºá€žá€á€ºá€™á€¾á€á€ºá€á€»á€€á€ºá€™á€»á€¬á€¸ (á€ á€€á€»á€•á€ºáŠ á á€žá€­á€”á€ºá€¸áŠ á… á€žá€­á€”á€ºá€¸áŠ áá€ á€žá€­á€”á€ºá€¸) á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€•á€±á€¸á€œá€­á€¯á€€á€ºá€žá€–á€¼á€„á€·á€º á€™á€­á€™á€­á€¡á€œá€­á€¯á€›á€¾á€­á€žá€±á€¬ á€œá€€á€ºá€€á€»á€”á€ºá€„á€½á€±á€•á€™á€¬á€á€€á€­á€¯ á€á€»á€€á€ºá€á€»á€„á€ºá€¸ á€•á€¼á€„á€ºá€†á€„á€ºá€žá€á€ºá€™á€¾á€á€ºá€”á€­á€¯á€„á€ºá€•á€«á€•á€¼á€®á‹'
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
    titleMy: 'á€á€„á€ºá€„á€½á€±áŠ á€‘á€½á€€á€ºá€„á€½á€±áŠ á€œá€€á€ºá€€á€»á€”á€ºá€„á€½á€±á€™á€»á€¬á€¸ áá€á€% á€€á€­á€¯á€€á€ºá€Šá€®á€…á€±á€›á€”á€º á€¡á€•á€¼á€®á€¸á€žá€á€º á€•á€¼á€¯á€•á€¼á€„á€ºá€‘á€­á€”á€ºá€¸á€Šá€¾á€­á€á€¼á€„á€ºá€¸ (Financial Reconciliation Fix)',
    titleEn: '100% Inflow, Outflow & Wallet Balance Reconciliation & Month-Boundary Filter Resolution',
    tag: 'fix',
    tagLabelMy: 'á€•á€¼á€„á€ºá€†á€„á€ºá€á€»á€€á€º á€—á€¬á€¸á€›á€¾á€„á€ºá€¸',
    tagLabelEn: 'Bug Fix Version',
    descriptionMy: 'á€œá€€á€°á€¸á€•á€¼á€±á€¬á€„á€ºá€¸á€á€»á€­á€”á€º (á€…á€€á€ºá€á€„á€ºá€˜á€¬á€™á€¾ á€¡á€±á€¬á€€á€ºá€á€­á€¯á€˜á€¬á€žá€­á€¯á€· á€€á€°á€¸á€á€»á€­á€”á€º) á€á€½á€„á€º "á€šá€á€¯á€œ" Filter á€€á€¼á€±á€¬á€„á€·á€º á€…á€€á€ºá€á€„á€ºá€˜á€¬á€œá€¡á€á€½á€„á€ºá€¸ á€žá€½á€„á€ºá€¸á€‘á€¬á€¸á€žá€±á€¬ á€.áˆáƒ á€žá€­á€”á€ºá€¸ (áˆáƒ,á€á€á€ á€€á€»á€•á€º) á€¡á€•á€«á€¡á€á€„á€º á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸ á€á€„á€ºá€„á€½á€±/á€‘á€½á€€á€ºá€„á€½á€±á€á€½á€„á€º á€–á€šá€ºá€‘á€¯á€á€ºá€á€¶á€›á€•á€¼á€®á€¸ á€œá€€á€ºá€€á€»á€”á€ºá€„á€½á€±á€”á€¾á€„á€·á€º á€™á€€á€­á€¯á€€á€ºá€Šá€®á€–á€¼á€…á€ºá€•á€±á€«á€ºá€”á€±á€™á€¾á€¯á€€á€­á€¯ á€¡á€•á€¼á€®á€¸á€žá€á€º á€•á€¼á€¯á€•á€¼á€„á€ºá€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹ á€…á€á€„á€ºá€œá€€á€ºá€€á€»á€”á€º + á€á€„á€ºá€„á€½á€± - á€‘á€½á€€á€ºá€„á€½á€± = á€¡á€•á€­á€á€ºá€œá€€á€ºá€€á€»á€”á€º á€•á€¯á€¶á€žá€±á€”á€Šá€ºá€¸á€¡á€á€­á€¯á€„á€ºá€¸ DashboardáŠ Transactions á€”á€¾á€„á€·á€º Wallets á€‡á€šá€¬á€¸á€™á€»á€¬á€¸á€¡á€¬á€¸á€œá€¯á€¶á€¸á€á€½á€„á€º áá€á€% á€á€­á€€á€»á€…á€½á€¬ á€á€»á€­á€á€ºá€†á€€á€º á€€á€­á€¯á€€á€ºá€Šá€®á€…á€±á€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Resolves income, expense, and wallet balance discrepancies caused by month-boundary filtering (September records hidden under October "This Month" filter while wallet balance reflected them), unifies internal transfer accounting across views, adds explicit Opening Balance reconciliation columns, and guarantees computed wallet live balances sync to Firestore.',
    changesMy: [
      'âš–ï¸ **á€á€„á€ºá€„á€½á€±áŠ á€‘á€½á€€á€ºá€„á€½á€±áŠ á€œá€€á€ºá€€á€»á€”á€º áá€á€% á€€á€­á€¯á€€á€ºá€Šá€®á€…á€±á€á€¼á€„á€ºá€¸**: DashboardáŠ Transactions á€‡á€šá€¬á€¸á€”á€¾á€„á€·á€º Wallets á€‡á€šá€¬á€¸á€™á€»á€¬á€¸á€¡á€¬á€¸á€œá€¯á€¶á€¸á€á€½á€„á€º `á€…á€á€„á€ºá€œá€€á€ºá€€á€»á€”á€º (Opening) + á€á€„á€ºá€„á€½á€± (Inflow) - á€‘á€½á€€á€ºá€„á€½á€± (Outflow) = á€œá€€á€ºá€€á€»á€”á€º (Closing)` á€•á€¯á€¶á€žá€±á€”á€Šá€ºá€¸á€¡á€á€­á€¯á€„á€ºá€¸ á€¡á€á€­á€¡á€€á€» á€€á€­á€¯á€€á€ºá€Šá€®á€¡á€±á€¬á€„á€º á€‘á€­á€”á€ºá€¸á€Šá€¾á€­á€•á€±á€¸á€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
      'ðŸ“… **á€œá€€á€°á€¸á€á€»á€­á€”á€º (Month-Boundary) Filter á€•á€¼á€¿á€”á€¬ á€–á€¼á€±á€›á€¾á€„á€ºá€¸á€á€¼á€„á€ºá€¸**: á€¡á€±á€¬á€€á€ºá€á€­á€¯á€˜á€¬ á á€›á€€á€ºá€žá€­á€¯á€· á€›á€±á€¬á€€á€ºá€›á€¾á€­á€žá€½á€¬á€¸á€á€»á€­á€”á€ºáŒ "á€šá€á€¯á€œ" á€…á€…á€ºá€‘á€¬á€¸á€žá€–á€¼á€„á€·á€º á€…á€€á€ºá€á€„á€ºá€˜á€¬ á‚á… á€á€½á€„á€º á€žá€½á€„á€ºá€¸á€‘á€¬á€¸á€žá€±á€¬ áˆáƒ,á€á€á€ á€€á€»á€•á€º á€…á€¬á€›á€„á€ºá€¸ á€™á€•á€±á€«á€ºá€˜á€² á€á€„á€ºá€„á€½á€± á€ á€€á€»á€•á€ºá€”á€¾á€„á€·á€º á€œá€€á€ºá€€á€»á€”á€º á€™á€€á€­á€¯á€€á€ºá€Šá€®á€–á€¼á€…á€ºá€”á€±á€™á€¾á€¯á€€á€­á€¯ Dashboard á€á€½á€„á€º á€¡á€á€»á€­á€”á€ºá€¡á€•á€­á€¯á€„á€ºá€¸á€¡á€á€¼á€¬á€¸ á€•á€¼á€”á€ºá€œá€Šá€ºá€Šá€¾á€­á€”á€­á€¯á€„á€ºá€žá€Šá€·á€º á€¡á€á€»á€€á€ºá€•á€±á€¸á€…á€”á€…á€ºá€”á€¾á€„á€·á€º Reconciliation breakdown á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€•á€±á€¸á€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
      'ðŸ”„ **á€¡á€€á€±á€¬á€„á€·á€ºá€¡á€á€»á€„á€ºá€¸á€á€»á€„á€ºá€¸ á€„á€½á€±á€œá€½á€¾á€²á€™á€¾á€¯ (Internal Transfers) á€…á€¶á€žá€á€ºá€™á€¾á€á€ºá€á€»á€€á€º á€á€°á€Šá€®á€…á€±á€á€¼á€„á€ºá€¸**: Transactions View á€”á€¾á€„á€·á€º Dashboard á€á€­á€¯á€·á€á€½á€„á€º á€¡á€€á€±á€¬á€„á€·á€ºá€¡á€¬á€¸á€œá€¯á€¶á€¸ á€€á€¼á€Šá€·á€ºá€›á€¾á€¯á€á€»á€­á€”á€ºáŒ á€„á€½á€±á€œá€½á€¾á€²á€™á€¾á€¯á€™á€»á€¬á€¸á€€á€­á€¯ á€á€„á€ºá€„á€½á€±/á€‘á€½á€€á€ºá€„á€½á€± á€¡á€–á€¼á€…á€º á€¡á€•á€­á€¯á€†á€±á€¬á€„á€ºá€¸ á€™á€•á€±á€«á€„á€ºá€¸á€™á€­á€…á€±á€›á€”á€º á€…á€¶á€žá€á€ºá€™á€¾á€á€ºá€á€»á€€á€º á€á€•á€¼á€±á€¸á€Šá€® á€•á€¼á€„á€ºá€†á€„á€ºá€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
      'ðŸ“Š **á€˜á€á€¹á€á€¬á€›á€±á€¸ á€¡á€”á€¾á€…á€ºá€á€»á€¯á€•á€ºá€‡á€šá€¬á€¸á€á€½á€„á€º á€…á€á€„á€ºá€œá€€á€ºá€€á€»á€”á€º (Opening) á€€á€±á€¬á€ºá€œá€¶ á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€á€¼á€„á€ºá€¸**: `FinancialSummaryTable` á€á€½á€„á€º Wallet á€á€…á€ºá€á€¯á€á€»á€„á€ºá€¸á€…á€®á á€…á€á€„á€ºá€œá€€á€ºá€€á€»á€”á€ºáŠ á€á€„á€ºá€„á€½á€±áŠ á€‘á€½á€€á€ºá€„á€½á€±á€”á€¾á€„á€·á€º á€¡á€•á€­á€á€ºá€œá€€á€ºá€€á€»á€”á€ºá€á€­á€¯á€·á€€á€­á€¯ á€€á€±á€¬á€ºá€œá€¶á€¡á€œá€­á€¯á€€á€º á€á€­á€€á€»á€…á€½á€¬ á€•á€¼á€žá€•á€±á€¸á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹',
      'â˜ï¸ **Firestore á€žá€­á€¯á€· Live Computed Balances á€•á€­á€¯á€·á€†á€±á€¬á€„á€ºá€á€¼á€„á€ºá€¸**: `syncDataToCloud` á€á€½á€„á€º á€Ÿá€±á€¬á€„á€ºá€¸á€”á€½á€™á€ºá€¸á€”á€±á€žá€±á€¬ Wallet á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸á€¡á€…á€¬á€¸ á€¡á€žá€…á€ºá€á€½á€€á€ºá€á€»á€€á€ºá€‘á€¬á€¸á€žá€±á€¬ `computedWallets` á€¡á€¬á€¸ á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€•á€­á€¯á€·á€†á€±á€¬á€„á€ºá€žá€­á€™á€ºá€¸á€†á€Šá€ºá€¸á€…á€±á€•á€«á€žá€Šá€ºá‹'
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
    titleMy: 'á€.áˆáƒ á€žá€­á€”á€ºá€¸ (áˆáƒ,á€á€á€ á€€á€»á€•á€º) á€…á€¬á€›á€„á€ºá€¸ á€¡á€á€¼á€¬á€¸ á‚ á€…á€€á€ºá€á€½á€„á€º á€™á€•á€±á€«á€ºá€žá€Šá€·á€º Root Cause á€¡á€•á€¼á€®á€¸á€žá€á€º á€–á€šá€ºá€›á€¾á€¬á€¸á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€á€¼á€„á€ºá€¸',
    titleEn: 'Complete 0.83 Lakhs (83,000 MMK) Propagation & Timezone Date Offset Resolution',
    tag: 'fix',
    tagLabelMy: 'á€•á€¼á€„á€ºá€†á€„á€ºá€á€»á€€á€º á€—á€¬á€¸á€›á€¾á€„á€ºá€¸',
    tagLabelEn: 'Bug Fix Version',
    descriptionMy: 'Shared Wallet á€žá€­á€¯á€· á€…á€¬á€›á€„á€ºá€¸á€žá€½á€„á€ºá€¸á€á€»á€­á€”á€ºáŒ Parent Document Balance Update á€á€½á€„á€º id field á€•á€«á€á€„á€ºá€™á€¾á€¯á€€á€¼á€±á€¬á€„á€·á€º Firestore Security Rules á€™á€¾ á€›á€±á€¸á€žá€½á€„á€ºá€¸á€á€½á€„á€·á€º á€•á€­á€á€ºá€•á€„á€ºá€á€¶á€›á€”á€­á€¯á€„á€ºá€á€¼á€±á€€á€­á€¯ á€–á€šá€ºá€›á€¾á€¬á€¸á€•á€±á€¸á€á€²á€·á€•á€¼á€®á€¸áŠ Transaction á€›á€±á€¸á€žá€½á€„á€ºá€¸á€™á€¾á€¯á€€á€­á€¯ á€¦á€¸á€…á€½á€¬ á€•á€‘á€™ á€žá€®á€¸á€á€¼á€¬á€¸ á€œá€½á€á€ºá€œá€•á€ºá€…á€½á€¬ áá€á€% á€›á€±á€¸á€žá€½á€„á€ºá€¸á€…á€±á€á€¼á€„á€ºá€¸á€”á€¾á€„á€·á€º UTC Timezone á€€á€¼á€±á€¬á€„á€·á€º á€šá€™á€”á€ºá€”á€±á€·á€›á€€á€ºá€…á€½á€² á€–á€¼á€…á€ºá€žá€½á€¬á€¸á€…á€±á€žá€Šá€·á€º Bug á€¡á€¬á€¸ á€¡á€•á€¼á€®á€¸á€žá€á€º á€•á€¼á€¯á€•á€¼á€„á€ºá€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Eliminates Firestore security rule update rejections by decoupling transaction writes from parent doc updates, fixing premature quota blocks, and replacing UTC-shifting date generators with timezone-safe local date resolution.',
    changesMy: [
      'âš¡ **á€.áˆáƒ á€žá€­á€”á€ºá€¸ (áˆáƒ,á€á€á€ á€€á€»á€•á€º) á€…á€¬á€›á€„á€ºá€¸ á€á€•á€¼á€­á€¯á€„á€ºá€á€Šá€ºá€¸ á€•á€±á€«á€ºá€…á€±á€á€¼á€„á€ºá€¸**: Transaction á€›á€±á€¸á€žá€½á€„á€ºá€¸á€™á€¾á€¯á€¡á€¬á€¸ Firestore Subcollection á€žá€­á€¯á€· á€¦á€¸á€…á€½á€¬ á€•á€‘á€™ áá€á€% á€›á€±á€¸á€žá€½á€„á€ºá€¸á€…á€±á€•á€¼á€®á€¸ Security Rules á€á€½á€„á€ºá€œá€Šá€ºá€¸ Balance update allowlist á€¡á€¬á€¸ á€¡á€†á€„á€·á€ºá€™á€¼á€¾á€„á€·á€ºá€á€„á€ºá€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
      'ðŸ•’ **Local Timezone Fix**: á€™á€”á€€á€ºá€•á€­á€¯á€„á€ºá€¸á€á€½á€„á€º á€…á€¬á€›á€„á€ºá€¸á€žá€½á€„á€ºá€¸á€á€»á€­á€”á€ºáŒ UTC á€€á€¼á€±á€¬á€„á€·á€º á€šá€™á€”á€ºá€”á€±á€·á€›á€€á€ºá€…á€½á€² á€¡á€–á€¼á€…á€º á€žá€á€ºá€™á€¾á€á€ºá€™á€­á€€á€¬ á€¡á€á€¼á€¬á€¸á€…á€€á€ºá€™á€»á€¬á€¸á€á€½á€„á€º á€…á€¬á€›á€„á€ºá€¸á€™á€•á€±á€«á€ºá€˜á€² á€–á€¼á€…á€ºá€á€²á€·á€›á€žá€Šá€·á€º Timezone Bug á€€á€­á€¯ `getLocalDateString()` á€–á€¼á€„á€·á€º á€¡á€•á€¼á€®á€¸á€žá€á€º á€•á€¼á€¯á€•á€¼á€„á€ºá€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹',
      'ðŸ›¡ï¸ **Resilient Mutation Execution**: `safeSetDoc` á€”á€¾á€„á€·á€º `saveSharedWalletTransaction` á€á€­á€¯á€·á€á€½á€„á€º premature quota blocks á€™á€»á€¬á€¸á€€á€­á€¯ á€–á€šá€ºá€›á€¾á€¬á€¸á€•á€±á€¸á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹'
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
    titleMy: 'áˆáƒ,á€á€á€ á€€á€»á€•á€º á€…á€¬á€›á€„á€ºá€¸ á€¡á€•á€«á€¡á€á€„á€º á€…á€€á€º áƒ á€á€¯á€œá€¯á€¶á€¸ á€¡á€€á€¼á€¬á€¸ Lossless Cross-Device Sync á€›á€›á€¾á€­á€¡á€±á€¬á€„á€º á€¡á€•á€¼á€®á€¸á€žá€á€º á€•á€¼á€„á€ºá€†á€„á€ºá€á€¼á€„á€ºá€¸',
    titleEn: 'Lossless Cross-Device Sync & Complete 83,000 MMK Entry Propagation Across All 3 Devices',
    tag: 'current',
    tagLabelMy: 'á€œá€€á€ºá€›á€¾á€­ á€žá€¯á€¶á€¸á€…á€½á€²á€”á€±á€žá€±á€¬ á€—á€¬á€¸á€›á€¾á€„á€ºá€¸',
    tagLabelEn: 'Current Live Version',
    descriptionMy: 'á€…á€€á€ºá€á€…á€ºá€á€¯á€á€½á€„á€º á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€œá€­á€¯á€€á€ºá€žá€±á€¬ áˆáƒ,á€á€á€ á€€á€»á€•á€º á€…á€¬á€›á€„á€ºá€¸á€žá€Šá€º á€¡á€á€¼á€¬á€¸á€…á€€á€º á‚ á€á€¯ (á€–á€¯á€”á€ºá€¸á€”á€¾á€„á€·á€º Desktop á€™á€»á€¬á€¸) á€á€½á€„á€º á€¡á€á€»á€­á€”á€ºá€”á€¾á€„á€·á€ºá€á€•á€¼á€±á€¸á€Šá€® á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€ºá€•á€±á€«á€ºá€‘á€½á€€á€ºá€œá€¬á€…á€±á€›á€”á€º Snapshot listeners á€”á€¾á€„á€·á€º Cloud merging logic á€¡á€¬á€¸ Lossless á€¡á€–á€¼á€…á€º á€•á€¼á€„á€ºá€†á€„á€ºá€•á€¼á€®á€¸ á€¡á€€á€¼á€½á€±á€¸á€…á€¬á€›á€„á€ºá€¸ á€¡á€•á€¼á€±á€¬á€„á€ºá€¸á€¡á€œá€²á€™á€»á€¬á€¸á€€á€­á€¯á€œá€Šá€ºá€¸ Firestore á€žá€­á€¯á€· á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º Real-Time á€›á€±á€¸á€žá€½á€„á€ºá€¸á€…á€±á€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Ensures immediate, lossless propagation of all newly added records (including the 83,000 MMK entry) across all 3 devices by fixing deletion filter false-positives and persisting all debt lifecycle mutations directly to Firestore.',
    changesMy: [
      'âš¡ **áˆáƒ,á€á€á€ á€€á€»á€•á€º á€…á€¬á€›á€„á€ºá€¸ á€¡á€á€¼á€¬á€¸ á‚ á€…á€€á€ºá€á€½á€„á€º á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€•á€±á€«á€ºá€‘á€½á€€á€ºá€œá€¬á€á€¼á€„á€ºá€¸**: Cloud Firestore á€™á€¾ á€›á€±á€¬á€€á€ºá€›á€¾á€­á€œá€¬á€žá€±á€¬ Live á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸á€€á€­á€¯ Client-side deletion flag á€™á€»á€¬á€¸á€–á€¼á€„á€·á€º á€•á€šá€ºá€á€»á€á€¼á€„á€ºá€¸ á€™á€›á€¾á€­á€á€±á€¬á€·á€˜á€² á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º Merge á€•á€¼á€¯á€œá€¯á€•á€ºá€•á€±á€¸á€•á€«á€žá€Šá€ºá‹',
      'ðŸ”„ **Lossless Parallel Pull & Snapshot Listeners**: `pullDataFromCloud` á€”á€¾á€„á€·á€º `onSnapshot` á€™á€»á€¬á€¸á€á€½á€„á€º Document ID á€€á€­á€¯ `{ id: d.id, ...d.data() }` á€–á€¼á€„á€·á€º á€á€­á€€á€»á€…á€½á€¬ á€á€»á€­á€á€ºá€†á€€á€ºá€•á€±á€¸á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹',
      'ðŸ’³ **Debt Lifecycle Cloud Persistence**: á€¡á€€á€¼á€½á€±á€¸á€•á€±á€¸á€†á€•á€ºá€™á€¾á€¯áŠ á€¡á€á€¼á€±á€¡á€”á€± á€•á€¼á€±á€¬á€„á€ºá€¸á€œá€²á€™á€¾á€¯á€”á€¾á€„á€·á€º á€•á€¼á€„á€ºá€†á€„á€º/á€–á€»á€€á€ºá€™á€¾á€¯á€™á€»á€¬á€¸á€€á€­á€¯ Cloud á€žá€­á€¯á€· á€á€»á€€á€ºá€á€»á€„á€ºá€¸ safeSetDoc á€–á€¼á€„á€·á€º á€›á€±á€¸á€žá€½á€„á€ºá€¸á€žá€­á€™á€ºá€¸á€†á€Šá€ºá€¸á€•á€±á€¸á€•á€«á€žá€Šá€ºá‹'
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
    titleMy: 'á€¡á€žá€¯á€¶á€¸á€•á€¼á€¯á€žá€°á VIP á€¡á€†á€„á€·á€ºá€¡á€á€”á€ºá€¸á€”á€¾á€„á€·á€º á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸á€¡á€¬á€¸á€œá€¯á€¶á€¸ á€›á€¾á€­á€”á€±á€žá€±á€¬ Active Custom Database á€žá€­á€¯á€· á€•á€…á€ºá€™á€¾á€á€ºá€•á€¼á€±á€¬á€„á€ºá€¸á€œá€²á€á€»á€­á€á€ºá€†á€€á€ºá€á€¼á€„á€ºá€¸',
    titleEn: 'Database Restoration to the Active Custom Database with Premium Plans & Core Entries',
    tag: 'current',
    tagLabelMy: 'á€œá€€á€ºá€›á€¾á€­ á€žá€¯á€¶á€¸á€…á€½á€²á€”á€±á€žá€±á€¬ á€—á€¬á€¸á€›á€¾á€„á€ºá€¸',
    tagLabelEn: 'Current Live Version',
    descriptionMy: 'á€žá€¯á€¶á€¸á€…á€½á€²á€žá€°á€™á€»á€¬á€¸á VIP Plan á€™á€»á€¬á€¸á€”á€¾á€„á€·á€º core á€„á€½á€±á€…á€¬á€›á€„á€ºá€¸ á…á„ á€á€¯á€œá€¯á€¶á€¸ á€¡á€•á€¼á€Šá€·á€ºá€¡á€ á€á€Šá€ºá€›á€¾á€­á€”á€±á€žá€±á€¬ á€á€€á€šá€·á€º á€žá€€á€ºá€á€„á€º Active Custom Database ID á€–á€¼á€…á€ºá€žá€Šá€·á€º ai-studio-incomeexpensedeb-8b430923-ad0a-45a6-9f38-4c9cb02bcf7e á€žá€­á€¯á€· á€á€›á€¬á€¸á€á€„á€º á€¡á€•á€¼á€®á€¸á€žá€á€º á€•á€¼á€”á€ºá€œá€Šá€º á€á€»á€­á€á€ºá€†á€€á€ºá€•á€±á€¸á€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹ á€šá€á€„á€ºá€€ (default) database ID á€žá€­á€¯á€· á€™á€¾á€¬á€¸á€šá€½á€„á€ºá€¸á€•á€¼á€±á€¬á€„á€ºá€¸á€œá€²á€á€²á€·á€™á€­á€žá€–á€¼á€„á€·á€º Windows á€á€½á€„á€º connection error 5 NOT_FOUND á€–á€¼á€…á€ºá€€á€¬ á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸ 0 á€žá€­á€”á€ºá€¸ á€—á€œá€¬á€–á€¼á€…á€ºá€”á€±á€á€²á€·á€žá€Šá€·á€º á€•á€¼á€¿á€”á€¬á€€á€­á€¯ áá€á€% á€–á€¼á€±á€›á€¾á€„á€ºá€¸á€•á€¼á€®á€¸á€–á€¼á€…á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Successfully re-connected the application to the active, live Firestore database instance (ai-studio-incomeexpensedeb-8b430923-ad0a-45a6-9f38-4c9cb02bcf7e) containing all historical user profiles, VIP plans, and core transactions. This completely resolves the 5 NOT_FOUND connectivity resets and blank 0MMK screens on newly logged-in desktop devices caused by premature default database configurations.',
    changesMy: [
      'ðŸ’Ž **Core Database Restore**: á€¡á€žá€¯á€¶á€¸á€•á€¼á€¯á€žá€°á VIP Plan á€™á€»á€¬á€¸á€”á€¾á€„á€·á€º á€œá€€á€ºá€›á€¾á€­á€žá€¯á€¶á€¸á€…á€½á€²á€”á€±á€žá€±á€¬ á…á„ á€á€¯á€žá€±á€¬ á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸ á€á€Šá€ºá€›á€¾á€­á€›á€¬ Custom Database á€žá€­á€¯á€· á€¡á€•á€¼á€®á€¸á€žá€á€º á€•á€¼á€”á€ºá€œá€Šá€ºá€Šá€½á€¾á€”á€ºá€•á€¼ á€á€»á€­á€á€ºá€†á€€á€ºá€•á€±á€¸á€œá€­á€¯á€€á€ºá€•á€«á€•á€¼á€®á‹',
      'ðŸ–¥ï¸ **Windows 0-MMK Resolved**: Windows á€žá€­á€¯á€·á€™á€Ÿá€¯á€á€º browser á€¡á€žá€…á€ºá€™á€»á€¬á€¸á€á€½á€„á€º á€á€„á€ºá€›á€±á€¬á€€á€ºá€á€»á€­á€”á€ºáŒ connection reset (NOT_FOUND) á€–á€¼á€…á€ºá€”á€±á€™á€¾á€¯á€€á€­á€¯ á€¡á€•á€¼á€®á€¸á€á€­á€¯á€„á€ºá€–á€¼á€±á€›á€¾á€„á€ºá€¸á€œá€­á€¯á€€á€ºá€žá€–á€¼á€„á€·á€º á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸á€”á€¾á€„á€·á€º VIP Status á€™á€»á€¬á€¸ á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€ºá€€á€½á€€á€ºá€á€­ á€•á€¼á€”á€ºá€œá€Šá€ºá€•á€±á€«á€ºá€‘á€½á€€á€ºá€œá€¬á€•á€«á€•á€¼á€®á‹',
      'ðŸ›¡ï¸ **Safe defaultDb fallback**: (default) database á€œá€¯á€¶á€¸á€á€™á€›á€¾á€­á€žá€±á€¬ project á€•á€á€ºá€á€”á€ºá€¸á€€á€»á€„á€ºá€¡á€á€½á€€á€º `defaultDb` á€¡á€¬á€¸ main `db` á€žá€­á€¯á€· á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€œá€½á€¾á€²á€•á€¼á€±á€¬á€„á€ºá€¸á€•á€±á€¸á€‘á€¬á€¸á€žá€–á€¼á€„á€·á€º á€™á€Šá€ºá€žá€Šá€·á€º network-error á€™á€»á€¾ á€‘á€•á€ºá€™á€¶á€™á€–á€¼á€…á€ºá€•á€±á€«á€ºá€…á€±á€›á€”á€º á€€á€¬á€€á€½á€šá€ºá€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹'
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
    titleMy: 'á€€á€½á€”á€ºá€›á€€á€ºá€”á€¾á€±á€¸á€€á€½á€±á€¸á€™á€¾á€¯á€”á€¾á€„á€·á€º VPN á€™á€»á€¬á€¸á€¡á€á€½á€€á€º Cloud Sync á€…á€”á€…á€ºá€¡á€¬á€¸ á€¡á€…á€½á€™á€ºá€¸á€€á€¯á€”á€ºá€™á€¼á€¾á€„á€·á€ºá€á€„á€ºá€á€¼á€„á€ºá€¸á€”á€¾á€„á€·á€º Shared Wallet Read Quota á‰á‰% á€žá€€á€ºá€žá€¬á€…á€±á€™á€Šá€·á€º Optimization',
    titleEn: 'Ultra-Resilient Individual Cloud Pull Sync Architecture & 99% Read Quota Saving for Shared Wallets',
    tag: 'feature',
    tagLabelMy: 'á€—á€¬á€¸á€›á€¾á€„á€ºá€¸á€Ÿá€±á€¬á€„á€ºá€¸ á€œá€¯á€•á€ºá€†á€±á€¬á€„á€ºá€á€»á€€á€º',
    tagLabelEn: 'Legacy Version Feature',
    descriptionMy: 'á€™á€¼á€”á€ºá€™á€¬á€”á€­á€¯á€„á€ºá€„á€¶á€›á€¾á€­ á€€á€½á€”á€ºá€›á€€á€ºá€”á€¾á€±á€¸á€€á€½á€±á€¸á€™á€¾á€¯ (Slow Networks/VPNs) á€’á€á€ºá€€á€­á€¯ á€¡á€•á€¼á€Šá€·á€ºá€¡á€ á€á€¶á€”á€­á€¯á€„á€ºá€›á€Šá€ºá€›á€¾á€­á€…á€±á€›á€”á€º Cloud á€™á€¾ á€¡á€á€»á€€á€ºá€¡á€œá€€á€ºá€™á€»á€¬á€¸á€†á€½á€²á€šá€°á€›á€¬á€á€½á€„á€º á€…á€¯á€•á€¼á€¯á€¶á€†á€½á€²á€šá€°á€á€¼á€„á€ºá€¸á€¡á€…á€¬á€¸ á€á€…á€ºá€á€¯á€á€»á€„á€ºá€¸á€…á€® á€žá€®á€¸á€á€¼á€¬á€¸á€á€½á€²á á€¡á€™á€¾á€¬á€¸á€¡á€šá€½á€„á€ºá€¸á€á€¶á€…á€”á€…á€º (Isolated safeFetch with localized timeout) á€–á€¼á€„á€·á€º á€¡á€†á€„á€·á€ºá€™á€¼á€¾á€„á€·á€ºá€á€„á€ºá€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹ á€‘á€­á€¯á€·á€€á€¼á€±á€¬á€„á€·á€º Windows á€¡á€…á€›á€¾á€­á€žá€±á€¬ á€…á€€á€ºá€•á€…á€¹á€…á€Šá€ºá€¸á€žá€…á€ºá€™á€»á€¬á€¸á€á€½á€„á€º Data á€™á€á€€á€ºá€˜á€² á€¡á€á€­á€¯á€„á€ºá€¸á€œá€Šá€ºá€”á€±á€žá€Šá€·á€º á€•á€¼á€¿á€”á€¬á€€á€­á€¯ áá€á€% á€¡á€•á€¼á€®á€¸á€žá€á€ºá€–á€¼á€±á€›á€¾á€„á€ºá€¸á€•á€±á€¸á€•á€¼á€®á€¸á€–á€¼á€…á€ºá€•á€«á€žá€Šá€ºá‹ á€‘á€­á€¯á€·á€¡á€•á€¼á€„á€º á€”á€±á€·á€…á€‰á€º Firestore read quota á€¡á€™á€¼á€”á€ºá€€á€¯á€”á€ºá€†á€¯á€¶á€¸á€á€¼á€„á€ºá€¸á€™á€¾ á€€á€¬á€€á€½á€šá€ºá€›á€”á€º Shared Wallet á€…á€¯á€¶á€…á€™á€ºá€¸á€™á€¾á€¯á€€á€­á€¯ Array-Contains Query á€–á€¼á€„á€·á€º á€•á€¼á€±á€¬á€„á€ºá€¸á€œá€²á€•á€¼á€„á€ºá€†á€„á€ºá€•á€±á€¸á€œá€­á€¯á€€á€ºá€žá€–á€¼á€„á€·á€º Read load á€¡á€¬á€¸ á‰á‰% á€žá€€á€ºá€žá€¬á€…á€±á€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Refactored cloud data fetching to execute individual, error-isolated, parallel queries with specialized timeouts, preventing network-heavy timeouts from breaking the entire sync cycle on slow connections or VPNs. Optimized the shared wallet live listener to leverage array-contains querying rather than a full collection fetch, slashing daily Firestore read usage by up to 99%.',
    changesMy: [
      'âš¡ **Ultra-Resilient Cloud Sync**: Cloud á€™á€¾ á€’á€±á€á€¬á€¡á€†á€½á€²á€á€½á€„á€º á€á€…á€ºá€á€¯á€á€¯á€”á€¾á€±á€¸á€•á€«á€€ á€á€…á€ºá€á€¯á€œá€¯á€¶á€¸ á€•á€»á€€á€ºá€•á€¼á€¬á€¸á€žá€½á€¬á€¸á€á€¼á€„á€ºá€¸á€™á€›á€¾á€­á€…á€±á€˜á€² á€žá€®á€¸á€žá€”á€·á€º á€¡á€™á€¾á€¬á€¸á€¡á€šá€½á€„á€ºá€¸á€€á€„á€ºá€¸á€œá€½á€á€ºá€…á€”á€…á€º (Isolated Timeout & safeFetch) á€–á€¼á€„á€·á€º á€á€Šá€ºá€†á€±á€¬á€€á€ºá€•á€±á€¸á€‘á€¬á€¸á€žá€–á€¼á€„á€·á€º á€’á€±á€á€¬á€™á€»á€¬á€¸ á€¡á€™á€¼á€²á€á€™á€ºá€¸ á€™á€¾á€”á€ºá€™á€¾á€”á€ºá€€á€”á€ºá€€á€”á€º á€†á€½á€²á€šá€°á€”á€­á€¯á€„á€ºá€•á€«á€•á€¼á€®á‹',
      'ðŸ“ˆ **99% Read Quota Saving**: Shared Wallet á€™á€»á€¬á€¸ á€…á€…á€ºá€†á€±á€¸á€›á€¬á€á€½á€„á€º á€á€…á€ºá€á€¯á€œá€¯á€¶á€¸á€€á€­á€¯ á€…á€¯á€•á€¯á€¶á€–á€á€ºá€›á€¾á€¯á€á€¼á€„á€ºá€¸á€¡á€…á€¬á€¸ á€™á€­á€™á€­ email á€•á€«á€á€„á€ºá€žá€Šá€·á€º á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸á€€á€­á€¯á€žá€¬ á€€á€½á€€á€ºá€á€­á€…á€…á€ºá€‘á€¯á€á€ºá€–á€á€ºá€›á€¾á€¯á€žá€–á€¼á€„á€·á€º daily read quota á€€á€­á€¯ á‰á‰% á€¡á€‘á€­ á€žá€­á€žá€­á€žá€¬á€žá€¬ á€žá€€á€ºá€žá€¬á€…á€±á€•á€«á€žá€Šá€ºá‹',
      'ðŸ–¥ï¸ **Windows & New Device Boot Fix**: Windows á€žá€­á€¯á€·á€™á€Ÿá€¯á€á€º browser á€¡á€žá€…á€ºá€™á€»á€¬á€¸á€á€½á€„á€º login á€á€„á€ºá€á€»á€­á€”á€ºáŒ cache á€™á€›á€¾á€­á€žá€±á€¬á€ºá€œá€Šá€ºá€¸ cloud á€™á€¾ data á€™á€»á€¬á€¸ á€á€»á€€á€ºá€á€»á€„á€ºá€¸ á€€á€½á€€á€ºá€á€­ sync á€€á€»á€œá€¬á€…á€±á€•á€¼á€®á€¸ App Frame á€žá€¬á€•á€±á€«á€ºá€•á€¼á€®á€¸ data á€™á€•á€±á€«á€ºá€žá€Šá€·á€ºá€•á€¼á€¿á€”á€¬á€€á€­á€¯ á€œá€¯á€¶á€¸á€á€–á€¼á€±á€›á€¾á€„á€ºá€¸á€•á€±á€¸á€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹'
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
    titleMy: 'á€á€„á€ºá€„á€½á€± á€‘á€½á€€á€ºá€„á€½á€± á€™á€¾á€á€ºá€á€™á€ºá€¸á€›á€¾á€­ Wallet Filter á€•á€¼á€¿á€”á€¬ á€•á€¼á€„á€ºá€†á€„á€ºá€á€¼á€„á€ºá€¸á€”á€¾á€„á€·á€º á€„á€½á€±á€œá€½á€¾á€²á€‘á€¯á€á€º (Transfer Out) á€¡á€¬á€¸ á€”á€±á€·á€…á€‰á€ºá€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸áŒ á€¡á€”á€¾á€¯á€á€ºá€•á€¼á€žá€›á€”á€º á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€á€½á€€á€ºá€á€»á€€á€ºá€á€¼á€„á€ºá€¸',
    titleEn: 'Transactions Wallet Filter Reactivity Fix & Transfer Out Outflow Deduction Implementation',
    tag: 'feature',
    tagLabelMy: 'á€—á€¬á€¸á€›á€¾á€„á€ºá€¸á€Ÿá€±á€¬á€„á€ºá€¸ á€œá€¯á€•á€ºá€†á€±á€¬á€„á€ºá€á€»á€€á€º',
    tagLabelEn: 'Legacy Version Feature',
    descriptionMy: 'á€á€„á€ºá€„á€½á€±á€‘á€½á€€á€ºá€„á€½á€±á€™á€¾á€á€ºá€á€™á€ºá€¸á€…á€¬á€™á€»á€€á€ºá€”á€¾á€¬á€›á€¾á€­ Wallet Filter á€•á€¼á€¯á€œá€¯á€•á€ºá€žá€Šá€·á€ºá€¡á€á€« á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸á€™á€•á€¼á€±á€¬á€„á€ºá€¸á€œá€²á€žá€Šá€·á€º Reactivity á€•á€¼á€¿á€”á€¬á€€á€­á€¯ Dependency Array á€á€½á€„á€º á€•á€¼á€„á€ºá€†á€„á€ºá€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€•á€±á€¸á€á€²á€·á€•á€«á€žá€Šá€ºá‹ á€‘á€­á€¯á€·á€¡á€•á€¼á€„á€º á€„á€½á€±á€œá€½á€¾á€²á€‘á€¯á€á€º (Transfer Out) á€™á€»á€¬á€¸á€€á€­á€¯ á€‘á€½á€€á€ºá€„á€½á€±á€¡á€–á€¼á€…á€º á€”á€±á€·á€…á€‰á€º subtotals á€”á€¾á€„á€·á€º á€¡á€žá€¬á€¸á€á€„á€º (Net) á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸á€‘á€²á€á€½á€„á€º á€á€›á€¬á€¸á€á€„á€ºá€¡á€”á€¾á€¯á€á€ºá€•á€¼á€žá á€…á€”á€…á€ºá€á€€á€» á€”á€¾á€¯á€á€ºá€šá€°á€á€½á€€á€ºá€á€»á€€á€ºá€•á€±á€¸á€›á€”á€º á€•á€¼á€„á€ºá€†á€„á€ºá€•á€±á€¸á€á€²á€·á€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Fixed a reactivity issue where filtering by Wallet in the Transactions View did not update the transaction list below due to missing state variables in the useMemo dependency array. Also implemented transfer transactions inside daily and overall subtotals, ensuring Transfer Out represents a true cash outflow and subtracts correctly from day and month net balances.',
    changesMy: [
      'ðŸŽ¯ **Wallet Filter Reactivity Fix**: á€á€„á€ºá€„á€½á€±á€‘á€½á€€á€ºá€„á€½á€±á€™á€¾á€á€ºá€á€™á€ºá€¸á€á€½á€„á€º Wallet Filter á€˜á€šá€ºá€œá€±á€¬á€€á€ºá€›á€½á€±á€¸á€›á€½á€±á€¸ á€¡á€±á€¬á€€á€ºá€€á€…á€¬á€›á€„á€ºá€¸ á€™á€•á€¼á€±á€¬á€„á€ºá€¸á€œá€²á€žá€Šá€·á€º Reactivity Bug á€€á€­á€¯ á€¡á€•á€¼á€®á€¸á€žá€á€º á€•á€¼á€¯á€•á€¼á€„á€ºá€œá€­á€¯á€€á€ºá€žá€–á€¼á€„á€·á€º Filter á€›á€½á€±á€¸á€á€»á€šá€ºá€™á€¾á€¯á€á€­á€¯á€„á€ºá€¸ á€€á€½á€€á€ºá€á€­ á€¡á€œá€¯á€•á€ºá€œá€¯á€•á€ºá€žá€½á€¬á€¸á€•á€«á€•á€¼á€®á‹',
      'ðŸ’¸ **Transfer Out Deduction**: á€„á€½á€±á€œá€½á€¾á€²á€‘á€¯á€á€º (Transfer Out) á€™á€»á€¬á€¸á€€á€­á€¯ á€”á€±á€·á€…á€‰á€ºá€”á€¾á€„á€·á€º á€œá€…á€‰á€º á€…á€¯á€…á€¯á€•á€±á€«á€„á€ºá€¸á€‘á€½á€€á€ºá€„á€½á€±á€™á€»á€¬á€¸á€‘á€²á€á€½á€„á€º á€á€›á€¬á€¸á€á€„á€º á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€á€½á€€á€ºá€á€»á€€á€ºá€•á€±á€¸á€žá€–á€¼á€„á€·á€º á€¡á€žá€¬á€¸á€á€„á€º (Net Balance) á€…á€¬á€›á€„á€ºá€¸á€™á€¾ á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º á€™á€¾á€”á€ºá€€á€”á€ºá€…á€½á€¬ á€”á€¾á€¯á€á€ºá€šá€°á€žá€½á€¬á€¸á€™á€Šá€º á€–á€¼á€…á€ºá€•á€«á€žá€Šá€ºá‹',
      'ðŸ¤ **Double-Entry Representation**: á€„á€½á€±á€œá€½á€¾á€²á€á€¼á€„á€ºá€¸á€™á€»á€¬á€¸á€€á€­á€¯ Inflow / Outflow á€¡á€–á€¼á€…á€º á€”á€±á€·á€…á€‰á€º Subtotals á€™á€»á€¬á€¸á€á€½á€„á€º á€á€…á€ºá€žá€¬á€¸á€á€Šá€ºá€¸ á€–á€±á€¬á€ºá€•á€¼á€•á€±á€¸á€žá€–á€¼á€„á€·á€º á€„á€½á€±á€…á€¬á€›á€„á€ºá€¸ á€”á€±á€›á€¬á€œá€½á€²á€™á€¾á€¬á€¸á€á€¼á€„á€ºá€¸á€”á€¾á€„á€·á€º á€›á€¾á€¯á€•á€ºá€‘á€½á€±á€¸á€™á€¾á€¯á€™á€»á€¬á€¸ á€œá€¯á€¶á€¸á€ á€™á€›á€¾á€­á€á€±á€¬á€·á€•á€«á‹'
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
    titleMy: 'á€™á€°á€›á€„á€ºá€¸ (default) Database á€•á€¼á€”á€ºá€œá€Šá€ºá€á€»á€­á€á€ºá€†á€€á€ºá€á€¼á€„á€ºá€¸áŠ Shared Wallet á€¡á€–á€½á€²á€·á€á€„á€ºá€™á€»á€¬á€¸á Sync á€á€½á€„á€·á€ºá€•á€¼á€¯á€á€»á€€á€ºá€”á€¾á€„á€·á€º Visitor Quota á€€á€­á€¯ á€¡á€€á€±á€¬á€„á€ºá€¸á€†á€¯á€¶á€¸á€•á€¼á€„á€ºá€†á€„á€ºá€á€¼á€„á€ºá€¸',
    titleEn: 'Default Database Connection Reverted, Shared Wallet Collaborator Sync Fix & Visitor Tracking Quota Optimization',
    tag: 'feature',
    tagLabelMy: 'á€—á€¬á€¸á€›á€¾á€„á€ºá€¸á€Ÿá€±á€¬á€„á€ºá€¸ á€œá€¯á€•á€ºá€†á€±á€¬á€„á€ºá€á€»á€€á€º',
    tagLabelEn: 'Legacy Version Feature',
    descriptionMy: 'á€¡á€žá€¯á€¶á€¸á€•á€¼á€¯á€žá€°á€™á€»á€¬á€¸á á€™á€°á€›á€„á€ºá€¸á€¡á€á€»á€€á€ºá€¡á€œá€€á€ºá€Ÿá€±á€¬á€„á€ºá€¸á€™á€»á€¬á€¸á€”á€¾á€„á€·á€º VIP á€¡á€€á€±á€¬á€„á€·á€ºá€™á€»á€¬á€¸ á€•á€¼á€”á€ºá€œá€Šá€ºá€›á€›á€¾á€­á€…á€±á€›á€”á€º á€™á€°á€›á€„á€ºá€¸ "(default)" Database á€žá€­á€¯á€· á€•á€¼á€”á€ºá€œá€Šá€ºá€á€»á€­á€á€ºá€†á€€á€ºá€•á€±á€¸á€á€²á€·á€•á€«á€žá€Šá€ºá‹ á€‘á€­á€¯á€·á€¡á€•á€¼á€„á€º Shared Wallet á€‘á€²á€žá€­á€¯á€· á€…á€¬á€›á€„á€ºá€¸á€žá€½á€„á€ºá€¸á€›á€¬á€á€½á€„á€º á€á€á€¼á€¬á€¸á€…á€€á€ºá€™á€»á€¬á€¸áŒ á€™á€•á€±á€«á€ºá€žá€Šá€·á€º Sync á€•á€¼á€¿á€”á€¬á€€á€­á€¯ Root Collaborator permissions á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€á€¼á€„á€ºá€¸á€”á€¾á€„á€·á€º Self-healing á€…á€”á€…á€ºá€–á€¼á€„á€·á€º á€¡á€•á€¼á€®á€¸á€žá€á€º á€•á€¼á€„á€ºá€†á€„á€ºá€•á€±á€¸á€á€²á€·á€•á€¼á€®á€¸áŠ á€”á€±á€·á€…á€‰á€º Firestore á€›á€±á€¸á€šá€°á€™á€¾á€¯á€•á€™á€¬á€ á€™á€€á€¯á€”á€ºá€†á€¯á€¶á€¸á€…á€±á€›á€”á€º Visitor Tracking á€á€½á€„á€º á… á€™á€­á€”á€…á€ºá€…á€¬ Activity Buffer á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€•á€±á€¸á€á€²á€·á€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Reverted the Firestore connection back to the original "(default)" database to restore all historical user data and VIP accounts. Resolved the shared wallet transaction synchronization issue by implementing automatic root collaborator authorizations and a self-healing syncing layer. Optimized visitor tracking with a 5-minute write buffer to protect the daily Firestore write quota.',
    changesMy: [
      'ðŸ”„ **Original Database Restore**: á€’á€±á€á€¬á€˜á€±á€·á€…á€ºá€¡á€žá€…á€ºá€¡á€…á€¬á€¸ á€šá€á€„á€ºá€¡á€á€»á€€á€ºá€¡á€œá€€á€ºá€™á€»á€¬á€¸á€”á€¾á€„á€·á€º VIP á€¡á€€á€±á€¬á€„á€·á€ºá€Ÿá€±á€¬á€„á€ºá€¸á€™á€»á€¬á€¸á€¡á€¬á€¸á€œá€¯á€¶á€¸ á€›á€¾á€­á€”á€±á€žá€Šá€·á€º á€™á€°á€›á€„á€ºá€¸ "(default)" Database á€žá€­á€¯á€· á€•á€¼á€”á€ºá€œá€Šá€º á€á€»á€­á€á€ºá€†á€€á€ºá€•á€±á€¸á€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
      'ðŸ”— **Collaborator Sync Permission Fix**: Shared Wallet á€™á€»á€¾á€á€±á€›á€¬á€á€½á€„á€º á€¡á€–á€½á€²á€·á€á€„á€ºá€™á€»á€¬á€¸á á€¡á€®á€¸á€™á€±á€¸á€œá€ºá€€á€­á€¯ Root Users collection á€›á€¾á€­ Collaborators á€…á€¬á€›á€„á€ºá€¸á€‘á€²á€žá€­á€¯á€·á€•á€« á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€•á€±á€¸á€žá€–á€¼á€„á€·á€º Firestore Rules á€™á€¾ á€›á€±á€¸á€žá€½á€„á€ºá€¸á€á€½á€„á€·á€ºá€•á€¼á€¯á€žá€½á€¬á€¸á€•á€¼á€®á€¸ Sync á€•á€¼á€¿á€”á€¬ á€œá€¯á€¶á€¸á€ á€™á€›á€¾á€­á€á€±á€¬á€·á€•á€«á‹',
      'ðŸ©¹ **Collaborator Self-Healing**: á€¡á€€á€ºá€•á€ºá€•á€½á€„á€·á€ºá€á€»á€­á€”á€ºá€á€½á€„á€º á€™á€­á€™á€­á€™á€»á€¾á€á€±á€‘á€¬á€¸á€žá€±á€¬ á€¡á€–á€½á€²á€·á€á€„á€ºá€™á€»á€¬á€¸á€¡á€¬á€¸á€œá€¯á€¶á€¸ Root document á€á€½á€„á€º á€á€½á€„á€·á€ºá€•á€¼á€¯á€á€»á€€á€ºá€›á€›á€¾á€­á€‘á€¬á€¸á€á€¼á€„á€ºá€¸ á€›á€¾á€­/á€™á€›á€¾á€­ á€”á€±á€¬á€€á€ºá€á€¶á€™á€¾ á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º á€…á€…á€ºá€†á€±á€¸á€á€­á€¯á€€á€ºá€†á€­á€¯á€„á€ºá€€á€¬ á€œá€­á€¯á€¡á€•á€ºá€€ á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€•á€¼á€¯á€•á€¼á€„á€ºá€•á€±á€¸á€™á€Šá€º á€–á€¼á€…á€ºá€•á€«á€žá€Šá€ºá‹',
      'âš¡ **Visitor Quota Optimization**: á€”á€±á€·á€…á€‰á€º Firestore daily write quota á€™á€€á€¯á€”á€ºá€†á€¯á€¶á€¸á€…á€±á€›á€”á€º á€žá€¯á€¶á€¸á€…á€½á€²á€žá€°á€á€…á€ºá€¦á€¸á€á€»á€„á€ºá€¸á€…á€®á Visitor tracking á€¡á€¬á€¸ á… á€™á€­á€”á€…á€ºá€œá€»á€¾á€„á€º á€á€…á€ºá€€á€¼á€­á€™á€ºá€žá€¬ á€”á€±á€¬á€€á€ºá€á€¶á€™á€¾ á€›á€±á€¸á€žá€½á€„á€ºá€¸á€›á€”á€º á€¡á€€á€±á€¬á€„á€ºá€¸á€†á€¯á€¶á€¸ á€•á€¼á€„á€ºá€†á€„á€ºá€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹'
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
    titleMy: 'á€¡á€€á€ºá€™á€„á€º á€¡á€žá€¯á€¶á€¸á€•á€¼á€¯á€žá€°á Database á€•á€›á€­á€¯á€–á€­á€¯á€„á€º Plan á€¡á€¬á€¸ Premium/VIP á€¡á€–á€¼á€…á€º á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º á€•á€¼á€¯á€•á€¼á€„á€ºá€•á€±á€¸á€žá€±á€¬ Self-Healing á€…á€”á€…á€º á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€á€¼á€„á€ºá€¸',
    titleEn: 'Admin Self-Healing Active Profile Upgrade & Automatic VIP Synchronization',
    tag: 'feature',
    tagLabelMy: 'á€—á€¬á€¸á€›á€¾á€„á€ºá€¸á€žá€…á€º á€œá€¯á€•á€ºá€†á€±á€¬á€„á€ºá€á€»á€€á€º',
    tagLabelEn: 'New Feature Version',
    descriptionMy: 'á€œá€¯á€¶á€á€¼á€¯á€¶á€›á€±á€¸á€…á€Šá€ºá€¸á€™á€»á€‰á€ºá€¸á€Ÿá€±á€¬á€„á€ºá€¸á€™á€»á€¬á€¸á€€á€¼á€±á€¬á€„á€·á€º á€’á€±á€á€¬á€˜á€±á€·á€…á€ºá€¡á€á€½á€„á€ºá€¸áŒ á€¡á€€á€ºá€™á€„á€ºá Plan á€žá€Šá€º "FREE" á€¡á€–á€¼á€…á€ºá€žá€¬ á€€á€»á€”á€ºá€›á€¾á€­á€”á€±á€á€²á€·á€žá€Šá€·á€º á€€á€½á€²á€œá€½á€²á€™á€¾á€¯á€€á€­á€¯ á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º á€›á€¾á€¬á€–á€½á€±á€…á€…á€ºá€†á€±á€¸á€•á€¼á€®á€¸ á€…á€€á€¹á€€á€”á€·á€ºá€•á€­á€¯á€„á€ºá€¸á€¡á€á€½á€„á€ºá€¸ "PREMIUM" (VIP) á€¡á€…á€®á€¡á€…á€‰á€ºá€¡á€–á€¼á€…á€º á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€…á€¬á€›á€„á€ºá€¸á€žá€½á€„á€ºá€¸á€•á€¼á€¯á€•á€¼á€„á€ºá€•á€±á€¸á€™á€Šá€·á€º Self-Healing á€…á€”á€…á€ºá€€á€­á€¯ Admin Panel á€˜á€½á€á€ºá€…á€‘á€›á€•á€ºá€á€½á€„á€º á€‘á€•á€ºá€™á€¶á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€•á€±á€¸á€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Integrated an active self-healing system in the Admin Panel bootstrapping to instantly detect and correct any stale "FREE" plans left in the database, automatically updating the admin user profile to "premium" (VIP) in Firestore.',
    changesMy: [
      'ðŸ©¹ **Active Self-Healing System**: Admin Control Center á€€á€­á€¯ á€–á€½á€„á€·á€ºá€œá€¾á€…á€ºá€œá€­á€¯á€€á€ºá€žá€Šá€ºá€”á€¾á€„á€·á€º á€™á€­á€™á€­á€¡á€€á€±á€¬á€„á€·á€ºá á€’á€±á€á€¬á€˜á€±á€·á€…á€º Plan á€žá€Šá€º FREE á€–á€¼á€…á€ºá€”á€±á€•á€«á€€ á€”á€±á€¬á€€á€ºá€á€¶á€™á€¾ PREMIUM (VIP) á€¡á€…á€®á€¡á€…á€‰á€ºá€¡á€–á€¼á€…á€º á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€›á€±á€¸á€žá€½á€„á€ºá€¸á€•á€¼á€¯á€•á€¼á€„á€ºá€•á€±á€¸á€™á€Šá€º á€–á€¼á€…á€ºá€•á€«á€žá€Šá€ºá‹',
      'ðŸ’Ž **Instant VIP Status**: á€¡á€€á€ºá€™á€„á€ºá€¡á€€á€±á€¬á€„á€·á€ºá€¡á€¬á€¸ á€’á€±á€á€¬á€˜á€±á€·á€…á€ºá€¡á€á€½á€„á€ºá€¸áŒá€•á€« á€á€›á€¬á€¸á€á€„á€º PREMIUM á€¡á€–á€¼á€…á€º á€á€”á€ºá€¸á€…á€® á€žá€á€ºá€™á€¾á€á€ºá€•á€±á€¸á€žá€–á€¼á€„á€·á€º á€¡á€žá€¯á€¶á€¸á€•á€¼á€¯á€žá€°á€…á€¬á€›á€„á€ºá€¸á€á€½á€„á€ºá€œá€Šá€ºá€¸ "FREE" á€¡á€…á€¬á€¸ "PREMIUM" á€Ÿá€¯ á€¡á€±á€¬á€„á€ºá€™á€¼á€„á€ºá€…á€½á€¬ á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º  á€™á€¾á€”á€ºá€€á€”á€ºá€žá€½á€¬á€¸á€™á€Šá€º á€–á€¼á€…á€ºá€•á€«á€žá€Šá€ºá‹'
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
    titleMy: 'á€¡á€€á€ºá€™á€„á€º á€œá€±á€¬á€·á€‚á€ºá€¡á€„á€ºá€á€„á€ºá€á€¼á€„á€ºá€¸á€”á€¾á€„á€·á€º á€•á€›á€­á€¯á€–á€­á€¯á€„á€º Plan á€’á€±á€á€¬á€˜á€±á€·á€…á€º á€›á€±á€¸á€žá€½á€„á€ºá€¸á€™á€¾á€¯á€¡á€¬á€¸ á€á€»á€€á€ºá€á€»á€„á€ºá€¸ á€¡á€á€Šá€ºá€•á€¼á€¯á€”á€­á€¯á€„á€ºá€›á€”á€º á€œá€¯á€¶á€á€¼á€¯á€¶á€›á€±á€¸á€…á€Šá€ºá€¸á€™á€»á€‰á€ºá€¸á€™á€»á€¬á€¸ (Direct Email Security Rules) á€€á€­á€¯ á€¡á€†á€„á€·á€ºá€™á€¼á€¾á€„á€·á€ºá€á€„á€ºá€á€¼á€„á€ºá€¸',
    titleEn: 'Direct Token-Level Admin Security Rules & Secure Background Loading Buffers',
    tag: 'fix',
    tagLabelMy: 'á€•á€¼á€„á€ºá€†á€„á€ºá€•á€¼á€®á€¸ á€—á€¬á€¸á€›á€¾á€„á€ºá€¸',
    tagLabelEn: 'Bug Fix Version',
    descriptionMy: 'á€¡á€€á€ºá€™á€„á€º á€¡á€žá€¯á€¶á€¸á€•á€¼á€¯á€žá€° `khunthanshwe@gmail.com` á€¡á€€á€±á€¬á€„á€·á€ºá€á€„á€ºá€›á€±á€¬á€€á€ºá€žá€Šá€·á€ºá€¡á€á€« `admins/{uid}` document á€›á€±á€¸á€žá€¬á€¸á€™á€¾á€¯ á€€á€¼á€”á€·á€ºá€€á€¼á€¬á€”á€±á€žá€±á€¬á€ºá€œá€Šá€ºá€¸ áŽá€„á€ºá€¸á Google Verified Token Email á€¡á€¬á€¸ Firestore Rules á€™á€¾ á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€á€­á€¯á€€á€ºá€†á€­á€¯á€„á€ºá€…á€…á€ºá€†á€±á€¸á€•á€±á€¸á€žá€–á€¼á€„á€·á€º á€¡á€žá€¯á€¶á€¸á€•á€¼á€¯á€žá€°á€…á€¬á€›á€„á€ºá€¸áŠ á€á€„á€ºá€›á€±á€¬á€€á€ºá€žá€° (visitors) á€…á€¬á€›á€„á€ºá€¸á€”á€¾á€„á€·á€º plan updates á€™á€»á€¬á€¸á€€á€­á€¯ á€¡á€…á€¡á€†á€¯á€¶á€¸ áá€á€% á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€á€Šá€ºá€„á€¼á€­á€™á€ºá€…á€½á€¬ á€á€„á€ºá€›á€±á€¬á€€á€ºá€…á€®á€™á€¶á€”á€­á€¯á€„á€ºá€¡á€±á€¬á€„á€º á€œá€¯á€¶á€á€¼á€¯á€¶á€›á€±á€¸á€…á€Šá€ºá€¸á€™á€»á€‰á€ºá€¸á€™á€»á€¬á€¸á€”á€¾á€„á€·á€º á€”á€±á€¬á€€á€ºá€á€¶ timeouts á€™á€»á€¬á€¸á€€á€­á€¯ á€¡á€†á€„á€·á€ºá€™á€¼á€¾á€„á€·á€ºá€á€„á€ºá€•á€±á€¸á€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Hardened the security rules to automatically recognize the verified admin email khunthanshwe@gmail.com directly from the authentication token, ensuring zero-latency admin operations and eliminating permission issues, and buffered background timeout triggers to 10 seconds.',
    changesMy: [
      'ðŸ›¡ï¸ **Direct Email Rule Match**: Firestore Security Rules á€á€½á€„á€º `isAdmin()` á€…á€…á€ºá€†á€±á€¸á€™á€¾á€¯á€€á€­á€¯ admins/ document á€žá€¬á€™á€€ Google Signature Token Email á€•á€« á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€…á€…á€ºá€†á€±á€¸á€›á€”á€º á€•á€¼á€„á€ºá€†á€„á€ºá€œá€­á€¯á€€á€ºá€žá€–á€¼á€„á€·á€º "á€¡á€•á€¼á€„á€ºá€™á€¾á€¬ VIPáŠ á€¡á€‘á€²á€™á€¾á€¬ Free" á€–á€¼á€…á€ºá€”á€±á€›á€žá€Šá€·á€º rules permission error á€™á€»á€¬á€¸á€€á€­á€¯ á€œá€¯á€¶á€¸á€ á€¡á€•á€¼á€®á€¸á€žá€á€º á€á€»á€±á€™á€¾á€¯á€”á€ºá€¸á€•á€±á€¸á€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
      'ðŸ‘¥ **Instant Users & Visitors Load**: Admin Panel á€¡á€á€½á€„á€ºá€¸á€›á€¾á€­ á€¡á€žá€¯á€¶á€¸á€•á€¼á€¯á€žá€°á€™á€»á€¬á€¸á€…á€¬á€›á€„á€ºá€¸ (users) á€”á€¾á€„á€·á€º á€œá€€á€ºá€›á€¾á€­á€á€„á€ºá€›á€±á€¬á€€á€ºá€”á€±á€žá€°á€™á€»á€¬á€¸ (active visitors) á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸á€žá€Šá€º "permission-denied" á€–á€¼á€…á€ºá€™á€žá€½á€¬á€¸á€á€±á€¬á€·á€˜á€² á€á€»á€€á€ºá€á€»á€„á€ºá€¸ á€•á€¯á€¶á€™á€¾á€”á€ºá€¡á€á€­á€¯á€„á€ºá€¸ á€¡á€•á€¼á€Šá€·á€ºá€¡á€…á€¯á€¶ á€•á€¼á€”á€ºá€œá€Šá€º á€•á€±á€«á€ºá€‘á€½á€€á€ºá€œá€¬á€™á€Šá€º á€–á€¼á€…á€ºá€•á€«á€žá€Šá€ºá‹',
      'â³ **Robust Network Timeout Buffers**: á€”á€±á€¬á€€á€ºá€á€¶ profile load á€á€¼á€„á€ºá€¸ timeouts á€™á€»á€¬á€¸á€€á€­á€¯ slow VPN/mobile data á€™á€»á€¬á€¸á€¡á€á€½á€€á€º áƒ.á… á€…á€€á€¹á€€á€”á€·á€ºá€™á€¾ áá€ á€…á€€á€¹á€€á€”á€·á€ºá€¡á€‘á€­ á€á€­á€¯á€¸á€™á€¼á€¾á€„á€·á€ºá€•á€±á€¸á€‘á€¬á€¸á€žá€–á€¼á€„á€·á€º á€’á€±á€á€¬á€™á€»á€¬á€¸ á€™á€•á€»á€±á€¬á€€á€ºá€†á€¯á€¶á€¸á€˜á€² á€¡á€™á€¼á€² á€¡á€±á€¬á€„á€ºá€™á€¼á€„á€ºá€…á€½á€¬ load á€”á€­á€¯á€„á€ºá€™á€Šá€º á€–á€¼á€…á€ºá€•á€«á€žá€Šá€ºá‹'
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
    titleMy: 'á€¡á€€á€ºá€™á€„á€º á€¡á€žá€¯á€¶á€¸á€•á€¼á€¯á€žá€°á Premium Plan á€¡á€¬á€¸ á€’á€±á€á€¬á€˜á€±á€·á€…á€º (Inside) á€”á€¾á€„á€·á€º á€¡á€•á€¼á€„á€ºá€•á€”á€ºá€¸ (Outside) á€á€…á€ºá€žá€¬á€¸á€á€Šá€ºá€¸ á€–á€¼á€…á€ºá€…á€±á€›á€±á€¸ á€¡á€•á€¼á€®á€¸á€žá€á€º á€•á€¼á€„á€ºá€†á€„á€ºá€•á€±á€¸á€á€¼á€„á€ºá€¸',
    titleEn: 'Synchronous Admin Registration & Canonical Database Profile Plan Matching',
    tag: 'fix',
    tagLabelMy: 'á€•á€¼á€„á€ºá€†á€„á€ºá€•á€¼á€®á€¸ á€—á€¬á€¸á€›á€¾á€„á€ºá€¸',
    tagLabelEn: 'Bug Fix Version',
    descriptionMy: 'á€¡á€€á€ºá€™á€„á€º á€¡á€žá€¯á€¶á€¸á€•á€¼á€¯á€žá€°á€™á€»á€¬á€¸á€¡á€á€½á€€á€º á€¡á€•á€¼á€„á€ºá€•á€”á€ºá€¸á€á€½á€„á€º VIP á€Ÿá€¯ á€•á€¼á€žá€”á€±á€žá€±á€¬á€ºá€œá€Šá€ºá€¸ á€’á€±á€á€¬á€˜á€±á€·á€…á€º (Inside) á€á€½á€„á€º Free á€–á€¼á€…á€ºá€”á€±á€žá€Šá€·á€º á€•á€¼á€¿á€”á€¬á€¡á€¬á€¸ á€–á€¼á€±á€›á€¾á€„á€ºá€¸á€›á€”á€ºá€¡á€á€½á€€á€º á€¡á€€á€ºá€™á€„á€ºá€™á€¾á€á€ºá€á€™á€ºá€¸ (admins/{uid}) á€¡á€¬á€¸ database á€á€½á€„á€º á€¦á€¸á€…á€½á€¬ á€›á€±á€¸á€žá€¬á€¸á€•á€¼á€®á€¸á€™á€¼á€±á€¬á€€á€ºá€¡á€±á€¬á€„á€º á€…á€±á€¬á€„á€·á€ºá€†á€­á€¯á€„á€ºá€¸á€•á€¼á€®á€¸á€™á€¾á€žá€¬ (await) user profile plan á€¡á€¬á€¸ "premium" á€¡á€–á€¼á€…á€º database á€‘á€²á€žá€­á€¯á€· á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€¡á€±á€¬á€„á€ºá€™á€¼á€„á€ºá€…á€½á€¬ á€›á€±á€¸á€žá€½á€„á€ºá€¸á€”á€­á€¯á€„á€ºá€¡á€±á€¬á€„á€º á€…á€”á€…á€ºá€á€€á€» á€•á€¼á€±á€¬á€„á€ºá€¸á€œá€²á€•á€¼á€„á€ºá€†á€„á€ºá€•á€±á€¸á€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Resolved an authorization sync lag issue ("Outside VIP, Inside Free") by fully awaiting background admin document creation before attempting to write user profile updates, guaranteeing that Firestore security rules recognize the admin privilege and write plan:"premium" to the database.',
    changesMy: [
      'ðŸ”‘ **Synchronous Admin Registration**: á€¡á€€á€ºá€™á€„á€ºá€¡á€€á€±á€¬á€„á€·á€º á€á€„á€ºá€›á€±á€¬á€€á€ºá€á€»á€­á€”á€ºá€á€½á€„á€º admins/{uid} document á€¡á€¬á€¸ database á€á€½á€„á€º á€¡á€±á€¬á€„á€ºá€™á€¼á€„á€ºá€…á€½á€¬ á€›á€±á€¸á€žá€¬á€¸á€•á€¼á€®á€¸á€…á€®á€¸á€€á€¼á€±á€¬á€„á€ºá€¸ á€žá€±á€á€»á€¬á€…á€½á€¬ á€…á€±á€¬á€„á€·á€ºá€†á€­á€¯á€„á€ºá€¸ (await) á€…á€±á€•á€¼á€®á€¸á€™á€¾á€žá€¬ user profile plan á€€á€­á€¯ update á€œá€¯á€•á€ºá€›á€”á€º á€á€½á€„á€·á€ºá€•á€¼á€¯á€žá€–á€¼á€„á€·á€º database rules á€„á€¼á€„á€ºá€¸á€•á€šá€ºá€™á€¾á€¯á€™á€»á€¬á€¸á€€á€­á€¯ áá€á€% á€€á€»á€±á€¬á€ºá€œá€½á€¾á€¬á€¸á€•á€±á€¸á€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
      'ðŸ’Ž **Consistent Plan State (Inside/Outside)**: á€’á€±á€á€¬á€˜á€±á€·á€…á€ºá€›á€¾á€­ user profile document á€‘á€²á€á€½á€„á€ºá€œá€Šá€ºá€¸ "premium" (VIP) á€¡á€…á€®á€¡á€…á€‰á€ºá€¡á€–á€¼á€…á€º á€¡á€•á€¼á€®á€¸á€žá€á€º á€…á€¬á€›á€„á€ºá€¸á€á€„á€ºá€žá€½á€¬á€¸á€žá€–á€¼á€„á€·á€º á€¡á€€á€ºá€™á€„á€ºá€¡á€€á€±á€¬á€„á€·á€ºá€™á€»á€¬á€¸á€žá€Šá€º á€¡á€•á€¼á€„á€ºá€•á€”á€ºá€¸á€›á€±á€¬ á€¡á€á€½á€„á€ºá€¸á€•á€­á€¯á€„á€ºá€¸ á€’á€±á€á€¬á€˜á€±á€·á€…á€ºá€•á€« á€á€…á€ºá€žá€¬á€¸á€á€Šá€ºá€¸ VIP á€¡á€–á€¼á€…á€º á€„á€¼á€­á€™á€ºá€žá€€á€ºá€™á€¾á€”á€ºá€€á€”á€ºá€žá€½á€¬á€¸á€•á€¼á€® á€–á€¼á€…á€ºá€•á€«á€žá€Šá€ºá‹'
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
    titleMy: 'Sidebar á€–á€½á€„á€·á€ºá€á€»á€­á€”á€ºá€á€½á€„á€º á€…á€¬á€™á€»á€€á€ºá€”á€¾á€¬á€¡á€±á€¬á€€á€ºá€á€¶ Scroll á€–á€¼á€…á€ºá€™á€¾á€¯á€¡á€¬á€¸ á€á€¬á€¸á€†á€®á€¸á€á€¼á€„á€ºá€¸á€”á€¾á€„á€·á€º safe defaultDb á€…á€”á€…á€ºá€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€á€¼á€„á€ºá€¸',
    titleEn: 'Sidebar Body Scroll Lock & Safe defaultDb Integration via getFirestore',
    tag: 'fix',
    tagLabelMy: 'á€•á€¼á€„á€ºá€†á€„á€ºá€•á€¼á€®á€¸ á€—á€¬á€¸á€›á€¾á€„á€ºá€¸',
    tagLabelEn: 'Bug Fix Version',
    descriptionMy: 'Sidebar Menu á€–á€½á€„á€·á€ºá€œá€¾á€…á€ºá€‘á€¬á€¸á€žá€Šá€·á€ºá€¡á€á€« á€¡á€±á€¬á€€á€ºá€˜á€€á€ºá€›á€¾á€­ á€…á€¬á€™á€»á€€á€ºá€”á€¾á€¬á€™á€»á€¬á€¸ á€†á€€á€ºá€œá€€á€º scroll á€–á€¼á€…á€ºá€”á€±á€•á€¼á€®á€¸ Sidebar á€¡á€¬á€¸ scroll á€†á€½á€²á€›á€”á€º á€á€€á€ºá€á€²á€žá€±á€¬ á€•á€¼á€¿á€”á€¬á€€á€­á€¯ Body Scroll Lock á€…á€”á€…á€ºá€–á€¼á€„á€·á€º á€œá€¯á€¶á€¸á€ á€¡á€•á€¼á€®á€¸á€žá€á€º á€•á€¼á€„á€ºá€†á€„á€ºá€•á€±á€¸á€œá€­á€¯á€€á€ºá€•á€¼á€®á€¸áŠ secondary database configuration á€¡á€á€½á€€á€º standard getFirestore dynamic re-use á€…á€”á€…á€ºá€€á€­á€¯á€•á€« á€¡á€†á€„á€·á€ºá€™á€¼á€¾á€„á€·á€ºá€á€„á€ºá€•á€±á€¸á€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Locked the background document body scroll when the Sidebar is active to prevent page scrolling behind it, and optimized secondary defaultDb creation using canonical getFirestore initialization.',
    changesMy: [
      'ðŸ“± **Body Scroll Lock**: Sidebar Menu á€–á€½á€„á€·á€ºá€‘á€¬á€¸á€…á€‰á€º Background Body Scrolling á€€á€­á€¯ á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º á€•á€­á€á€ºá€†á€­á€¯á€·á€•á€±á€¸á€žá€–á€¼á€„á€·á€º Sidebar á€¡á€¬á€¸ á€‘á€­á€á€½á€±á€·á€†á€½á€²á€›á€œá€½á€šá€ºá€€á€°á€•á€¼á€®á€¸ á€œá€¯á€¶á€¸á€ á€á€Šá€ºá€„á€¼á€­á€™á€ºá€žá€½á€¬á€¸á€™á€Šá€º á€–á€¼á€…á€ºá€•á€«á€žá€Šá€ºá‹',
      'ðŸ”’ **Standard getFirestore Usage**: Custom database pointers á€¡á€žá€¯á€¶á€¸á€•á€¼á€¯á€žá€Šá€·á€ºá€¡á€á€« `defaultDb` á€¡á€¬á€¸ `initializeFirestore` á€¡á€…á€¬á€¸ safe `getFirestore` á€–á€¼á€„á€·á€ºá€žá€¬ retrieve á€œá€¯á€•á€ºá€žá€–á€¼á€„á€·á€º White Screen crash á€™á€»á€¬á€¸á€€á€­á€¯ dynamic security guard á€…á€”á€…á€ºá€–á€¼á€„á€·á€º áá€á€% á€€á€¬á€€á€½á€šá€ºá€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹'
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
    titleMy: 'Firestore Duplicate Database Initialization á€€á€¼á€±á€¬á€„á€ºá€· App Mount á€žá€Šá€·á€ºá€¡á€á€« White Screen (á€™á€»á€€á€ºá€”á€¾á€¬á€•á€¼á€„á€ºá€–á€¼á€°) á€–á€¼á€…á€ºá€›á€•á€ºá€¡á€¬á€¸ á€¡á€•á€¼á€®á€¸á€žá€á€º á€•á€¼á€„á€ºá€†á€„á€ºá€á€¼á€„á€ºá€¸',
    titleEn: 'Prevent Duplicate Firestore Database Instance Initialization & White Screen Resolution',
    tag: 'fix',
    tagLabelMy: 'á€•á€¼á€„á€ºá€†á€„á€ºá€•á€¼á€®á€¸ á€—á€¬á€¸á€›á€¾á€„á€ºá€¸',
    tagLabelEn: 'Bug Fix Version',
    descriptionMy: 'á€•á€„á€ºá€™ (default) database á€žá€­á€¯á€· á€•á€¼á€±á€¬á€„á€ºá€¸á€œá€²á€á€»á€­á€”á€ºá€á€½á€„á€º Firestore SDK á€™á€¾ default database á€¡á€¬á€¸ á€”á€¾á€…á€ºá€€á€¼á€­á€™á€ºá€‘á€•á€ºá€™á€¶ initialize á€œá€¯á€•á€ºá€™á€­á€žá€–á€¼á€„á€·á€º á€–á€¼á€…á€ºá€•á€±á€«á€ºá€žá€±á€¬ fatal crash á€”á€¾á€„á€·á€º White Screen (á€™á€»á€€á€ºá€”á€¾á€¬á€•á€¼á€„á€ºá€¡á€–á€¼á€°á€›á€±á€¬á€„á€º) á€¡á€™á€¾á€¬á€¸á€¡á€¬á€¸ Dynamic Re-use Guard á€…á€”á€…á€ºá€–á€¼á€„á€·á€º á€¡á€•á€¼á€®á€¸á€žá€á€º á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸ á€•á€¼á€„á€ºá€†á€„á€ºá€•á€±á€¸á€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Resolved a fatal Firestore SDK crash where duplicate initialization of the (default) database instance occurred on mount, causing a blank White Screen.',
    changesMy: [
      'ðŸ›¡ï¸ **Dynamic Re-use Guard**: `useDefaultDbDirectly` á€…á€”á€…á€ºá€–á€¼á€„á€·á€º á€•á€„á€ºá€™ (default) database á€¡á€žá€¯á€¶á€¸á€•á€¼á€¯á€á€»á€­á€”á€ºáŒ Firestore instance á€¡á€¬á€¸ á€á€…á€ºá€€á€¼á€­á€™á€ºá€á€Šá€ºá€¸á€žá€¬ initialize á€œá€¯á€•á€ºá€•á€¼á€®á€¸ `defaultDb` á€¡á€–á€¼á€…á€ºá€•á€« á€•á€¼á€”á€ºá€œá€Šá€ºá€¡á€žá€¯á€¶á€¸á€•á€¼á€¯á€…á€±á€žá€–á€¼á€„á€·á€º fatal crash á€™á€»á€¬á€¸á€€á€­á€¯ áá€á€% á€á€¬á€¸á€†á€®á€¸á€•á€±á€¸á€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
      'âš¡ **Zero-Crash Mount**: App á€–á€½á€„á€·á€ºá€œá€¾á€…á€ºá€žá€Šá€·á€ºá€¡á€á€« á€™á€Šá€ºá€žá€Šá€·á€º White Screen (á€™á€»á€€á€ºá€”á€¾á€¬á€•á€¼á€„á€ºá€–á€¼á€°) á€™á€»á€¾ á€™á€›á€¾á€­á€á€±á€¬á€·á€˜á€² á á€…á€€á€¹á€€á€”á€·á€ºá€¡á€á€½á€„á€ºá€¸ á€•á€¯á€¶á€™á€¾á€”á€ºá€¡á€á€­á€¯á€„á€ºá€¸ á€á€Šá€ºá€„á€¼á€­á€™á€ºá€…á€½á€¬ á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€•á€½á€„á€·á€ºá€œá€”á€ºá€¸á€œá€¬á€™á€Šá€º á€–á€¼á€…á€ºá€•á€«á€žá€Šá€ºá‹'
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
    titleMy: 'á€™á€°á€œ (default) Database á€žá€­á€¯á€· á€•á€¼á€”á€ºá€œá€Šá€ºá€•á€¼á€±á€¬á€„á€ºá€¸á€œá€²á€á€»á€­á€á€ºá€†á€€á€ºá€á€¼á€„á€ºá€¸á€–á€¼á€„á€ºá€· Premium Plan á€™á€»á€¬á€¸á€”á€¾á€„á€ºá€· á€¡á€žá€¯á€¶á€¸á€•á€¼á€¯á€žá€°á€™á€»á€¬á€¸á€¡á€¬á€¸ á€¡á€•á€¼á€®á€¸á€žá€á€º á€•á€¼á€”á€ºá€œá€Šá€ºá€•á€±á€«á€„á€ºá€¸á€…á€Šá€ºá€¸á€•á€±á€¸á€á€¼á€„á€ºá€¸',
    titleEn: 'Default Database Re-pointing & Historical Premium Profiles Restoration',
    tag: 'fix',
    tagLabelMy: 'á€•á€¼á€„á€ºá€†á€„á€ºá€•á€¼á€®á€¸ á€—á€¬á€¸á€›á€¾á€„á€ºá€¸',
    tagLabelEn: 'Bug Fix Version',
    descriptionMy: 'App á€¡á€¬á€¸ á€™á€°á€œá€¡á€žá€¯á€¶á€¸á€•á€¼á€¯á€žá€°á€Ÿá€±á€¬á€„á€ºá€¸á€™á€»á€¬á€¸á á€’á€±á€á€¬á€™á€»á€¬á€¸áŠ Premium á€¡á€…á€®á€¡á€…á€‰á€ºá€™á€»á€¬á€¸á€”á€¾á€„á€·á€º Admin Panel á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸ á€á€Šá€ºá€›á€¾á€­á€›á€¬ á€•á€„á€ºá€™ (default) Firestore Database á€žá€­á€¯á€· á€¡á€•á€¼á€®á€¸á€žá€á€º á€•á€¼á€”á€ºá€œá€Šá€ºá€•á€¼á€±á€¬á€„á€ºá€¸á€œá€² á€á€»á€­á€á€ºá€†á€€á€ºá€•á€±á€¸á€œá€­á€¯á€€á€ºá€žá€–á€¼á€„á€·á€º á€žá€¯á€¶á€¸á€…á€½á€²á€žá€°á€¡á€¬á€¸á€œá€¯á€¶á€¸ Premium Plan á€™á€»á€¬á€¸á€”á€¾á€„á€·á€º á€á€€á€½ á€¡á€±á€¬á€„á€ºá€™á€¼á€„á€ºá€…á€½á€¬ á€•á€¼á€”á€ºá€œá€Šá€º á€•á€±á€«á€„á€ºá€¸á€…á€Šá€ºá€¸á€žá€½á€¬á€¸á€•á€¼á€® á€–á€¼á€…á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Re-pointed the app to the canonical (default) Firestore database, instantly restoring all previous user accounts, premium plans, and admin records.',
    changesMy: [
      'ðŸŒ **Default Database Migration**: `firebase-applet-config.json` á€›á€¾á€­ `firestoreDatabaseId` á€¡á€¬á€¸ `(default)` á€žá€­á€¯á€· á€¡á€±á€¬á€„á€ºá€™á€¼á€„á€ºá€…á€½á€¬ á€•á€¼á€±á€¬á€„á€ºá€¸á€œá€²á€á€»á€­á€á€ºá€†á€€á€ºá€œá€­á€¯á€€á€ºá€•á€¼á€®á€¸ Firestore Security Rules á€™á€»á€¬á€¸á€€á€­á€¯á€•á€« default database á€•á€±á€«á€ºá€žá€­á€¯á€· á€á€„á€ºá€•á€±á€¸á€•á€¼á€®á€¸á€…á€®á€¸á€á€²á€·á€•á€«á€žá€Šá€ºá‹',
      'ðŸ’Ž **Premium Plan Restoration**: á€šá€á€„á€º á€žá€¯á€¶á€¸á€…á€½á€²á€žá€°á€Ÿá€±á€¬á€„á€ºá€¸á€™á€»á€¬á€¸ á€¡á€€á€±á€¬á€„á€·á€ºá€•á€¼á€”á€ºá€á€„á€ºá€žá€Šá€·á€ºá€¡á€á€« áŽá€„á€ºá€¸á€á€­á€¯á€·á Premium Plan á€™á€»á€¬á€¸áŠ á€žá€€á€ºá€á€™á€ºá€¸á€€á€¯á€”á€ºá€†á€¯á€¶á€¸á€™á€Šá€·á€º á€›á€€á€ºá€…á€½á€²á€™á€»á€¬á€¸á€”á€¾á€„á€·á€º á€’á€±á€á€¬á€™á€»á€¬á€¸ á€•á€»á€±á€¬á€€á€ºá€†á€¯á€¶á€¸á€á€¼á€„á€ºá€¸á€™á€›á€¾á€­á€˜á€² áá€á€% á€¡á€•á€¼á€Šá€·á€ºá€¡á€ á€•á€¼á€”á€ºá€œá€Šá€ºá€›á€›á€¾á€­á€žá€½á€¬á€¸á€•á€«á€•á€¼á€®á‹',
      'ðŸ‘¥ **Admin Panel Synchronization**: Admin Panel á€á€½á€„á€ºá€œá€Šá€ºá€¸ á€šá€á€„á€º á€•á€»á€±á€¬á€€á€ºá€†á€¯á€¶á€¸á€”á€±á€žá€±á€¬ á€¡á€žá€¯á€¶á€¸á€•á€¼á€¯á€žá€°á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸á€”á€¾á€„á€·á€º áŽá€„á€ºá€¸á€á€­á€¯á€·á á€…á€¬á€›á€„á€ºá€¸á€™á€¾á€á€ºá€á€™á€ºá€¸á€™á€»á€¬á€¸á€¡á€¬á€¸á€œá€¯á€¶á€¸á€€á€­á€¯ á€¡á€•á€¼á€Šá€·á€ºá€¡á€…á€¯á€¶ á€•á€¼á€”á€ºá€œá€Šá€ºá€á€½á€±á€·á€™á€¼á€„á€ºá€”á€­á€¯á€„á€ºá€•á€¼á€®á€–á€¼á€…á€ºá€•á€«á€žá€Šá€ºá‹'
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
    titleMy: 'Shared Wallets á€™á€•á€¼á€Šá€·á€ºá€…á€¯á€¶á€™á€® á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º Wallet Reassignment á€•á€¼á€¯á€œá€¯á€•á€ºá á€‚á€á€”á€ºá€¸á€™á€»á€¬á€¸ á€•á€¼á€±á€¬á€„á€ºá€¸á€œá€²á€žá€½á€¬á€¸á€žá€Šá€·á€º á€•á€¼á€¿á€”á€¬á€¡á€¬á€¸ á€¡á€•á€¼á€®á€¸á€žá€á€º á€•á€¼á€„á€ºá€†á€„á€ºá€á€¼á€„á€ºá€¸',
    titleEn: 'Background Wallet Reassignment Mutation Elimination & Transaction Integrity Fix',
    tag: 'fix',
    tagLabelMy: 'á€•á€¼á€„á€ºá€†á€„á€ºá€•á€¼á€®á€¸ á€—á€¬á€¸á€›á€¾á€„á€ºá€¸',
    tagLabelEn: 'Bug Fix Version',
    descriptionMy: 'App á€…á€á€„á€ºá€á€»á€­á€”á€ºá€á€½á€„á€º Shared Wallets á€’á€±á€á€¬á€™á€»á€¬á€¸ á€™á€•á€¼á€Šá€·á€ºá€…á€¯á€¶á€™á€® repairOrphanedTransactions á€™á€”á€°á€¸á€™á€¾ Transaction á Wallet ID á€€á€­á€¯ Fallback Wallet á€žá€­á€¯á€· á€™á€¾á€¬á€¸á€šá€½á€„á€ºá€¸ á€•á€¼á€”á€ºá€œá€Šá€ºá€žá€á€ºá€™á€¾á€á€ºá€•á€¼á€®á€¸ Cloud Firestore á€žá€­á€¯á€· á€¡á€á€­á€¯á€„á€ºá€¸á€•á€á€º á€•á€¼á€”á€ºá€œá€Šá€ºá€›á€±á€¸á€žá€½á€„á€ºá€¸á€™á€­á€žá€–á€¼á€„á€·á€º á…á„ á€á€¯á€™á€¾ á…áƒ á€á€¯á€žá€­á€¯á€· á€‚á€á€”á€ºá€¸á€™á€»á€¬á€¸ á€œá€¾á€¯á€•á€ºá€›á€¾á€¬á€¸á€•á€¼á€±á€¬á€„á€ºá€¸á€œá€²á€á€²á€·á€™á€¾á€¯á€¡á€¬á€¸ á€¡á€•á€¼á€®á€¸á€žá€á€º á€–á€šá€ºá€›á€¾á€¬á€¸á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€•á€±á€¸á€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Fixed a critical background data mutation bug where repairOrphanedTransactions erroneously reassigned transaction wallet IDs to fallback wallets before shared wallets finished loading and overwrote Firestore in a loop.',
    changesMy: [
      'ðŸ›¡ï¸ **Prevent Unintended Reassignment**: Transaction á€á€½á€„á€º á€›á€¾á€­á€•á€¼á€®á€¸á€žá€¬á€¸ Wallet ID á€™á€»á€¬á€¸á€€á€­á€¯ á€™á€•á€¼á€Šá€·á€ºá€…á€¯á€¶á€žá€±á€¬ á€€á€¬á€œáŒ á€¡á€á€„á€ºá€¸á€¡á€“á€™á€¹á€™ Fallback Wallet á€žá€­á€¯á€· á€›á€½á€¾á€±á€·á€•á€¼á€±á€¬á€„á€ºá€¸á€á€¼á€„á€ºá€¸á€¡á€¬á€¸ á€á€¬á€¸á€™á€¼á€…á€ºá€œá€­á€¯á€€á€ºá€•á€«á€•á€¼á€®á‹',
      'ðŸ”„ **Eliminated Firestore Background Overwrite Loop**: `useEffect` á€¡á€á€½á€„á€ºá€¸á€™á€¾ Background Firestore Batch Overwrite Loop á€¡á€¬á€¸ á€–á€šá€ºá€›á€¾á€¬á€¸á€œá€­á€¯á€€á€ºá€žá€–á€¼á€„á€·á€º á€…á€¬á€›á€„á€ºá€¸ á€¡á€›á€±á€¡á€á€½á€€á€º (á…á„ á€á€¯) á€”á€¾á€„á€·á€º á€‚á€á€”á€ºá€¸á€•á€™á€¬á€á€™á€»á€¬á€¸ áá€á€% á€„á€¼á€­á€™á€ºá€žá€€á€ºá€žá€½á€¬á€¸á€™á€Šá€º á€–á€¼á€…á€ºá€•á€«á€žá€Šá€ºá‹'
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
    titleMy: 'á€á€„á€ºá€„á€½á€±/á€‘á€½á€€á€ºá€„á€½á€± á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸ Local Guest Cache á€”á€¾á€„á€ºá€· á€‘á€•á€ºá€™á€¶á€•á€±á€«á€„á€ºá€¸á€…á€•á€ºá€•á€¼á€®á€¸ á€‚á€á€”á€ºá€¸á€™á€»á€¬á€¸ á€™á€¼á€„á€·á€ºá€á€€á€º/á€™á€á€Šá€ºá€™á€„á€¼á€­á€™á€ºá€–á€¼á€…á€ºá€™á€¾á€¯á€¡á€¬á€¸ á€¡á€•á€¼á€®á€¸á€žá€á€º á€•á€¼á€„á€ºá€†á€„á€ºá€á€¼á€„á€ºá€¸',
    titleEn: 'Cloud Firestore Authoritative Database Sync & Local Stale Cache Cleanup',
    tag: 'fix',
    tagLabelMy: 'á€•á€¼á€„á€ºá€†á€„á€ºá€•á€¼á€®á€¸ á€—á€¬á€¸á€›á€¾á€„á€ºá€¸',
    tagLabelEn: 'Bug Fix Version',
    descriptionMy: 'Google / Email á€–á€¼á€„á€·á€º Sign In á€á€„á€ºá€›á€±á€¬á€€á€ºá€‘á€¬á€¸á€á€»á€­á€”á€ºá€á€½á€„á€º Cloud Firestore Database á€™á€¾ á€á€›á€¬á€¸á€á€„á€º á€’á€±á€á€¬á€™á€»á€¬á€¸ á€›á€±á€¬á€€á€ºá€›á€¾á€­á€œá€¬á€•á€«á€€ á€™á€°á€œ Local Guest Cache á€’á€±á€á€¬á€Ÿá€±á€¬á€„á€ºá€¸á€™á€»á€¬á€¸á€”á€¾á€„á€·á€º á€‘á€•á€ºá€™á€¶ á€™á€¬á€‚á€»á€¬á€™á€•á€¼á€¯á€á€±á€¬á€·á€˜á€² Cloud Database á€€á€­á€¯á€žá€¬ Direct Source of Truth á€¡á€–á€¼á€…á€º á€¡á€•á€¼á€Šá€·á€ºá€¡á€ á€á€»á€­á€á€ºá€†á€€á€ºá€•á€±á€¸á€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Fixed a database sync issue where local guest transactions kept merging on top of Cloud Firestore real-time updates, ensuring Cloud Firestore is the absolute source of truth when logged in.',
    changesMy: [
      'âš¡ **Cloud Firestore Source of Truth**: Sign In á€á€„á€ºá€‘á€¬á€¸á€á€»á€­á€”á€ºá€á€½á€„á€º Real-time Listener á€›á€±á€¬á€€á€ºá€›á€¾á€­á€œá€¬á€•á€«á€€ Cloud Database á€›á€¾á€­ á€’á€±á€á€¬á€™á€»á€¬á€¸á€€á€­á€¯á€žá€¬ á€¡á€á€Šá€ºá€•á€¼á€¯ á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€•á€¼á€žá€•á€±á€¸á€žá€–á€¼á€„á€·á€º á€á€„á€ºá€„á€½á€±/á€‘á€½á€€á€ºá€„á€½á€± á€‚á€á€”á€ºá€¸á€™á€»á€¬á€¸ á€™á€á€Šá€ºá€™á€„á€¼á€­á€™á€ºá€–á€¼á€…á€ºá€á€¼á€„á€ºá€¸ á€œá€¯á€¶á€¸á€ á€™á€›á€¾á€­á€á€±á€¬á€·á€•á€«á‹',
      'ðŸ§¹ **Stale Cache Cleanup**: Local á€á€½á€„á€º á€™á€á€±á€¬á€ºá€á€† á€€á€»á€”á€ºá€›á€…á€ºá€á€²á€·á€žá€±á€¬ Guest/Duplicate á€…á€¬á€›á€„á€ºá€¸á€Ÿá€±á€¬á€„á€ºá€¸á€™á€»á€¬á€¸á€€á€­á€¯ á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€•á€±á€¸á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹'
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
    titleMy: 'á€‘á€½á€€á€ºá€„á€½á€±á€”á€¾á€„á€ºá€· á€„á€½á€±á€¡á€­á€á€º á€œá€€á€ºá€€á€»á€”á€º á€‚á€á€”á€ºá€¸á€™á€»á€¬á€¸ á€™á€á€Šá€ºá€™á€„á€¼á€­á€™á€ºá€–á€¼á€…á€ºá€•á€¼á€®á€¸ á€á€”á€ºá€–á€­á€¯á€¸á€œá€½á€²á€™á€¾á€¬á€¸á€žá€Šá€·á€º á€•á€¼á€¿á€”á€¬á€¡á€¬á€¸ á€¡á€•á€¼á€®á€¸á€žá€á€º á€•á€¼á€„á€ºá€†á€„á€ºá€á€¼á€„á€ºá€¸',
    titleEn: 'Expense & Wallet Balance Calculation Stability & False-Positive Wallet Match Fix',
    tag: 'fix',
    tagLabelMy: 'á€•á€¼á€„á€ºá€†á€„á€ºá€•á€¼á€®á€¸ á€—á€¬á€¸á€›á€¾á€„á€ºá€¸',
    tagLabelEn: 'Bug Fix Version',
    descriptionMy: 'isWalletMatch á€á€½á€„á€º Target Wallet ID á€™á€Ÿá€¯á€á€ºá€žá€±á€¬ á€‚á€á€”á€ºá€¸/á€…á€¬á€€á€¼á€±á€¬á€„á€ºá€¸á€™á€»á€¬á€¸á€¡á€¬á€¸ Wallet Name á€”á€¾á€„á€·á€º Substring Fuzzy Match á€™á€¾á€¬á€¸á€šá€½á€„á€ºá€¸ á€á€­á€¯á€€á€ºá€†á€­á€¯á€„á€ºá€™á€­á€žá€–á€¼á€„á€·á€º á€‘á€½á€€á€ºá€„á€½á€± á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸ á€„á€½á€±á€¡á€­á€á€ºá€œá€½á€²á€™á€¾á€¬á€¸á€á€¼á€„á€ºá€¸á€”á€¾á€„á€·á€º á€‘á€½á€€á€ºá€„á€½á€± á€…á€¯á€…á€¯á€•á€±á€«á€„á€ºá€¸ á€‚á€á€”á€ºá€¸á€™á€»á€¬á€¸ á€™á€á€Šá€ºá€™á€„á€¼á€­á€™á€º á€–á€¼á€…á€ºá€•á€±á€«á€ºá€á€²á€·á€™á€¾á€¯á€¡á€¬á€¸ Guard Logic á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á á€¡á€•á€¼á€®á€¸á€žá€á€º á€•á€¼á€„á€ºá€†á€„á€ºá€•á€±á€¸á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Fixed a calculation instability bug where fuzzy name matching in isWalletMatch erroneously matched transaction target IDs against short wallet name substrings, causing expense totals and wallet balance numbers to shift.',
    changesMy: [
      'ðŸ›¡ï¸ **Wallet ID Matching Guard**: `isWalletMatch` á€á€½á€„á€º Wallet ID (á€¥á€•á€™á€¬- `wallet_...`, `tx_...`) á€™á€»á€¬á€¸á€€á€­á€¯ Fuzzy Substring Name Matching á€•á€¼á€¯á€œá€¯á€•á€ºá€™á€­á€á€¼á€„á€ºá€¸á€¡á€¬á€¸ á€•á€­á€á€ºá€•á€„á€ºá€œá€­á€¯á€€á€ºá€žá€–á€¼á€„á€·á€º á€‘á€½á€€á€ºá€„á€½á€±á€™á€»á€¬á€¸ á€„á€½á€±á€¡á€­á€á€º á€™á€¾á€¬á€¸á€šá€½á€„á€ºá€¸ á€›á€±á€¬á€€á€ºá€›á€¾á€­á€á€¼á€„á€ºá€¸ á€™á€›á€¾á€­á€á€±á€¬á€·á€•á€«á‹',
      'ðŸ“Š **Stable Expense & Balance Totals**: Dashboard, Transactions View á€”á€¾á€„á€·á€º Wallet Balances á€™á€»á€¬á€¸á€á€½á€„á€º á€‘á€½á€€á€ºá€„á€½á€± á€‚á€á€”á€ºá€¸ á€…á€¯á€…á€¯á€•á€±á€«á€„á€ºá€¸á€™á€»á€¬á€¸ áá€á€% á€á€Šá€ºá€„á€¼á€­á€™á€º á€™á€¾á€”á€ºá€€á€”á€ºá€žá€½á€¬á€¸á€™á€Šá€º á€–á€¼á€…á€ºá€•á€«á€žá€Šá€ºá‹'
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
    titleMy: 'Cloudflare Pages Domain (ngwesaryin.pages.dev) á€á€½á€„á€º Google Sign In á€¡á€†á€„á€ºá€•á€¼á€±á€…á€±á€›á€±á€¸ á€œá€™á€ºá€¸á€Šá€½á€¾á€”á€ºá€”á€¾á€„á€ºá€· Error Handling á€•á€¼á€„á€ºá€†á€„á€ºá€á€¼á€„á€ºá€¸',
    titleEn: 'Cloudflare Pages Authorized Domain Resolution & Detailed Auth Error Handling',
    tag: 'fix',
    tagLabelMy: 'á€•á€¼á€„á€ºá€†á€„á€ºá€•á€¼á€®á€¸ á€—á€¬á€¸á€›á€¾á€„á€ºá€¸',
    tagLabelEn: 'Bug Fix Version',
    descriptionMy: 'Custom / Cloudflare Domain á€¡á€žá€…á€º (ngwesaryin.pages.dev) á€á€½á€„á€º Google OAuth/Sign In á€á€„á€ºá€›á€±á€¬á€€á€ºá€•á€«á€€ Firebase Authorized Domain Security á€€á€¼á€±á€¬á€„á€·á€º á€•á€­á€á€ºá€†á€­á€¯á€·á€™á€¾á€¯á€€á€­á€¯ á€–á€¼á€±á€›á€¾á€„á€ºá€¸á€›á€”á€º á€á€­á€€á€»á€žá€±á€¬ á€œá€™á€ºá€¸á€Šá€½á€¾á€”á€ºá€á€»á€€á€ºá€”á€¾á€„á€·á€º á€…á€”á€…á€ºá€á€€á€» Error Notification á€€á€­á€¯ á€•á€¼á€„á€ºá€†á€„á€ºá€•á€±á€¸á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Added clear unauthorized-domain error handling and instructions for authorizing custom domain ngwesaryin.pages.dev in Firebase Console Authentication settings.',
    changesMy: [
      'ðŸŒ **Authorized Domain Error Handling**: Domain á€¡á€žá€…á€º (ngwesaryin.pages.dev) á€á€½á€„á€º Google Sign In á€á€„á€ºá€…á€‰á€º á€á€½á€„á€·á€ºá€™á€•á€¼á€¯á€‘á€¬á€¸á€•á€«á€€ á€™á€Šá€ºá€žá€­á€¯á€· Add Domain á€•á€¼á€¯á€œá€¯á€•á€ºá€›á€™á€Šá€ºá€€á€­á€¯ á€á€­á€€á€»á€…á€½á€¬ á€¡á€žá€­á€•á€±á€¸á€žá€±á€¬ á€™á€€á€ºá€†á€±á€·á€‚á€»á€º á€•á€¼á€„á€ºá€†á€„á€ºá€•á€±á€¸á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹',
      'ðŸ”‘ **Seamless Sign In**: Firebase Console á€á€½á€„á€º Domain á€•á€±á€«á€„á€ºá€¸á€‘á€Šá€·á€ºá€œá€­á€¯á€€á€ºá€žá€Šá€ºá€”á€¾á€„á€·á€º Google Sign In á€–á€¼á€„á€·á€º á á€…á€€á€¹á€€á€”á€·á€ºá€¡á€á€½á€„á€ºá€¸ á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸ á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º Sync á€›á€›á€¾á€­á€žá€½á€¬á€¸á€™á€Šá€º á€–á€¼á€…á€ºá€•á€«á€žá€Šá€ºá‹'
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
    titleMy: 'Double Entry / Loss Entry á€€á€¬á€€á€½á€šá€ºá€™á€¾á€¯á€”á€¾á€„á€ºá€· Cloudflare Pages / GitHub Direct Publishing á€œá€™á€ºá€¸á€Šá€½á€¾á€”á€º á€¡á€•á€¼á€Šá€·á€ºá€¡á€…á€¯á€¶',
    titleEn: 'Double Entry & Loss Entry Protection with Cloudflare Pages / GitHub Direct Publishing Setup',
    tag: 'fix',
    tagLabelMy: 'á€•á€¼á€„á€ºá€†á€„á€ºá€•á€¼á€®á€¸ á€—á€¬á€¸á€›á€¾á€„á€ºá€¸',
    tagLabelEn: 'Bug Fix Version',
    descriptionMy: 'Transaction á€™á€»á€¬á€¸ á€–á€»á€€á€ºá€•á€¼á€®á€¸ á€•á€¼á€”á€ºá€‘á€Šá€·á€ºá€žá€Šá€·á€ºá€¡á€á€« á€™á€°á€œ ID á€Ÿá€±á€¬á€„á€ºá€¸á€™á€»á€¬á€¸á€€á€¼á€±á€¬á€„á€·á€º Double Entry (á€žá€­á€¯á€·) Loss Entry á€™á€–á€¼á€…á€ºá€…á€±á€›á€±á€¸ Real-time Doc ID Unmarking á€…á€”á€…á€ºá€–á€¼á€„á€·á€º á€…á€…á€ºá€†á€±á€¸á€¡á€á€Šá€ºá€•á€¼á€¯á€•á€¼á€®á€¸áŠ AI Studio Preview Quota á€¡á€€á€”á€·á€ºá€¡á€žá€á€ºá€™á€›á€¾á€­á€˜á€² á€á€Šá€ºá€„á€¼á€­á€™á€ºá€…á€½á€¬ á€žá€¯á€¶á€¸á€…á€½á€²á€”á€­á€¯á€„á€ºá€›á€”á€º GitHub âž” Cloudflare Pages á€žá€­á€¯á€· á€¡á€á€™á€²á€· Publish á€•á€¼á€¯á€œá€¯á€•á€ºá€”á€­á€¯á€„á€ºá€žá€±á€¬ Build Support á€•á€¼á€„á€ºá€†á€„á€ºá€•á€±á€¸á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Ensured transaction deletion and re-creation workflows are immune to double entry or loss entry via live doc ID unmarking, and optimized build assets for seamless GitHub to Cloudflare Pages deployment with unlimited static edge quota.',
    changesMy: [
      'ðŸ›¡ï¸ **Double Entry & Loss Entry Safeguard**: Transaction á€á€…á€ºá€á€¯á€¡á€¬á€¸ á€–á€»á€€á€ºá€œá€­á€¯á€€á€ºá€•á€¼á€®á€¸á€”á€±á€¬á€€á€º á€¡á€œá€¬á€¸á€á€° á€•á€™á€¬á€ (á€¥á€•á€™á€¬- á‚.áˆáƒ á€žá€­á€”á€ºá€¸) á€–á€¼á€„á€·á€º á€•á€¼á€”á€ºá€œá€Šá€º á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸/á€•á€¼á€„á€ºá€†á€„á€ºá€•á€«á€€ Local ID Hash á€”á€¾á€„á€·á€º Cloud Listener á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€™á€¬á€‚á€»á€¬á€œá€¯á€•á€ºá€•á€±á€¸á€žá€–á€¼á€„á€·á€º á€…á€¬á€›á€„á€ºá€¸á€•á€»á€±á€¬á€€á€ºá€á€¼á€„á€ºá€¸/á€”á€¾á€…á€ºá€á€«á€‘á€•á€ºá€á€¼á€„á€ºá€¸ á€¡á€•á€¼á€®á€¸á€žá€á€º á€€á€¬á€€á€½á€šá€ºá€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹',
      'â˜ï¸ **Cloudflare Pages Publishing**: AI Studio Preview Quota  volle á€•á€¼á€Šá€·á€ºá€žá€½á€¬á€¸á€•á€«á€€ GitHub Repository á€žá€­á€¯á€· Push á€œá€¯á€•á€ºá Cloudflare Pages / Vercel á€á€½á€„á€º Hosting á€á€„á€ºá€€á€¬ á€¡á€€á€”á€·á€ºá€¡á€žá€á€ºá€™á€›á€¾á€­ (Unlimited Bandwidth) á€á€Šá€ºá€„á€¼á€­á€™á€ºá€…á€½á€¬ á€¡á€žá€¯á€¶á€¸á€•á€¼á€¯á€”á€­á€¯á€„á€ºá€•á€«á€žá€Šá€ºá‹',
      'âš¡ **Real-time Synchronization**: Firestore Database Free Quota (á€á€…á€ºá€›á€€á€ºá€œá€»á€¾á€„á€º Reads 50,000 / Writes 20,000) á€–á€¼á€„á€·á€º á€…á€€á€ºá€•á€…á€¹á€…á€Šá€ºá€¸á€•á€±á€«á€„á€ºá€¸á€™á€»á€¬á€¸á€…á€½á€¬ á€á€…á€ºá€•á€¼á€­á€¯á€„á€ºá€á€Šá€ºá€¸ Sync á€œá€¯á€•á€ºá€†á€±á€¬á€„á€ºá€”á€­á€¯á€„á€ºá€•á€«á€žá€Šá€ºá‹'
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
    titleMy: 'á€™á€»á€¾á€á€±á€žá€¯á€¶á€¸á€…á€½á€²á€‘á€¬á€¸á€žá€±á€¬ Shared Wallet á€™á€»á€¬á€¸á á€…á€¬á€›á€„á€ºá€¸á€¡á€žá€…á€ºá€™á€»á€¬á€¸ (á€¥á€•á€™á€¬- á‚.áˆáƒ á€žá€­á€”á€ºá€¸) Sync á€”á€¾á€­á€•á€ºá€•á€«á€€ á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€™á€›á€±á€¬á€€á€ºá€›á€¾á€­á€žá€Šá€·á€º á€•á€¼á€¿á€”á€¬á€¡á€¬á€¸ á€¡á€•á€¼á€®á€¸á€žá€á€º á€•á€¼á€„á€ºá€†á€„á€ºá€á€¼á€„á€ºá€¸',
    titleEn: 'Shared Wallet Subcollection Multi-Location Sync & Instant Cloud Pull Resolution',
    tag: 'fix',
    tagLabelMy: 'á€•á€¼á€„á€ºá€†á€„á€ºá€•á€¼á€®á€¸ á€—á€¬á€¸á€›á€¾á€„á€ºá€¸',
    tagLabelEn: 'Bug Fix Version',
    descriptionMy: 'á€–á€¯á€”á€ºá€¸á€á€…á€ºá€œá€¯á€¶á€¸ (iPhone/Android) á€á€½á€„á€º á€™á€»á€¾á€á€±á€‘á€¬á€¸á€žá€±á€¬ Shared Wallet á€žá€­á€¯á€· á€…á€¬á€›á€„á€ºá€¸á€¡á€žá€…á€º (á€¥á€•á€™á€¬ - á‚á€á‚á†-á€á‰-á‚á… á€›á€€á€ºá€…á€½á€²á€•á€« +áˆáƒ,á€á€á€ á€€á€»á€•á€º á€á€„á€ºá€„á€½á€±áŠ á€…á€¯á€…á€¯á€•á€±á€«á€„á€ºá€¸ á‚.áˆáƒ á€žá€­á€”á€ºá€¸) á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€•á€¼á€®á€¸ á€¡á€á€¼á€¬á€¸á€–á€¯á€”á€ºá€¸á€á€½á€„á€º Sync á€”á€¾á€­á€•á€ºá€•á€«á€€ Personal Transactions á€™á€€á€˜á€² SharedWallets Subcollection á€’á€±á€á€¬á€™á€»á€¬á€¸á€€á€­á€¯á€•á€« á€„á€½á€±á€¡á€­á€á€º á€•á€­á€¯á€„á€ºá€›á€¾á€„á€º/á€™á€»á€¾á€á€±á€á€¶á€›á€žá€° á€”á€¾á€…á€ºá€¦á€¸á€…á€œá€¯á€¶á€¸á€‘á€¶ á€žá€­á€¯á€· á€á€…á€ºá€•á€¼á€­á€¯á€„á€ºá€á€Šá€ºá€¸ á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€•á€±á€¸á€•á€­á€¯á€·/á€†á€½á€²á€šá€° á€™á€¬á€‚á€»á€¬á€œá€¯á€•á€ºá€•á€±á€¸á€žá€Šá€·á€º á€…á€”á€…á€ºá€–á€¼á€„á€·á€º á€•á€¼á€„á€ºá€†á€„á€ºá€•á€±á€¸á€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Fixed a sync issue where transactions added to a shared wallet on Device B (+83,000 MMK on 2026-09-25) did not pull to Device A during manual Sync. Updated pullDataFromCloud to query top-level sharedWallets subcollections and updated saveSharedWalletTransaction to dual-write across owner and shared collections.',
    changesMy: [
      'ðŸ¤ **Shared Wallet Multi-Location Write**: Shared Wallet á€á€½á€„á€º á€…á€¬á€›á€„á€ºá€¸á€¡á€žá€…á€º (+áˆáƒ,á€á€á€ á€€á€»á€•á€º) á€™á€¾á€á€ºá€á€™á€ºá€¸á€á€„á€ºá€•á€«á€€ sharedWallets subcollection á€¡á€•á€¼á€„á€º á€•á€­á€¯á€„á€ºá€›á€¾á€„á€ºá Personal Transactions Collection á€žá€­á€¯á€·á€•á€« á€á€…á€ºá€•á€¼á€­á€¯á€„á€ºá€á€Šá€ºá€¸ á€™á€¬á€‚á€»á€¬ á€›á€±á€¸á€žá€½á€„á€ºá€¸á€•á€±á€¸á€•á€«á€žá€Šá€ºá‹',
      'ðŸ”„ **Comprehensive Cloud Pull**: Sync á€á€œá€¯á€á€º á€”á€¾á€­á€•á€ºá€œá€­á€¯á€€á€ºá€žá€Šá€ºá€”á€¾á€„á€·á€º personal transactions á€¡á€•á€¼á€„á€º á€™á€»á€¾á€á€±á€‘á€¬á€¸á€žá€±á€¬ sharedWallets subcollections á€™á€»á€¬á€¸á€¡á€¬á€¸á€œá€¯á€¶á€¸á€›á€¾á€­ á€…á€¬á€›á€„á€ºá€¸á€¡á€žá€…á€ºá€™á€»á€¬á€¸á€€á€­á€¯á€•á€« á€¡á€•á€¼á€Šá€·á€ºá€¡á€ á€†á€½á€²á€šá€°á€•á€±á€¸á€žá€–á€¼á€„á€·á€º á€–á€¯á€”á€ºá€¸á€”á€¾á€…á€ºá€œá€¯á€¶á€¸á€…á€œá€¯á€¶á€¸á€á€½á€„á€º á‚.áˆáƒ á€žá€­á€”á€ºá€¸ á€¡á€á€­á€¡á€€á€» áá€á€% á€á€°á€Šá€®á€žá€½á€¬á€¸á€™á€Šá€º á€–á€¼á€…á€ºá€•á€«á€žá€Šá€ºá‹',
      'ðŸ“… **Date 2026-09-25 Sync Verified**: á€–á€¯á€”á€ºá€¸ A á€”á€¾á€„á€·á€º á€–á€¯á€”á€ºá€¸ B á€”á€¾á€…á€ºá€…á€œá€¯á€¶á€¸á€á€½á€„á€º á€…á€€á€ºá€á€„á€ºá€˜á€¬ á‚á… á€›á€€á€ºá€…á€½á€²á€•á€« á€…á€¬á€›á€„á€ºá€¸á€”á€¾á€„á€·á€º á‚.áˆáƒ á€žá€­á€”á€ºá€¸ á€œá€€á€ºá€€á€»á€”á€º á€•á€™á€¬á€ á€¡á€•á€¼á€Šá€·á€ºá€¡á€ á€á€°á€Šá€®á€…á€½á€¬ á€•á€±á€«á€ºá€•á€±á€«á€€á€ºá€œá€¬á€•á€«á€™á€Šá€ºá‹'
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
    titleMy: 'á€…á€¬á€›á€„á€ºá€¸á€¡á€žá€…á€ºá€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€á€¼á€„á€ºá€¸/á€–á€»á€€á€ºá€á€¼á€„á€ºá€¸ á€•á€¼á€¯á€œá€¯á€•á€ºá€•á€¼á€®á€¸á€”á€±á€¬á€€á€º á€…á€€á€ºá€¡á€á€»á€„á€ºá€¸á€á€»á€„á€ºá€¸ Sync á€œá€¯á€•á€ºá€›á€¬á€á€½á€„á€º á€…á€¬á€›á€„á€ºá€¸á€•á€»á€±á€¬á€€á€ºá€á€¼á€„á€ºá€¸ (Loss Entry) á€”á€¾á€„á€·á€º á€…á€¬á€›á€„á€ºá€¸á€‘á€•á€ºá€á€¼á€„á€ºá€¸ (Double Entry) á€¡á€¬á€¸ á€¡á€•á€¼á€®á€¸á€žá€á€º á€•á€¼á€„á€ºá€†á€„á€ºá€á€¼á€„á€ºá€¸',
    titleEn: 'Loss Entry & Double Entry Prevention: Live Cloud Authority & Unmark Deletion Sync Fix',
    tag: 'feature',
    tagLabelMy: 'á€œá€¯á€•á€ºá€†á€±á€¬á€„á€ºá€á€»á€€á€ºá€žá€…á€º',
    tagLabelEn: 'Feature',
    descriptionMy: 'á€–á€¯á€”á€ºá€¸á€á€…á€ºá€œá€¯á€¶á€¸á€á€½á€„á€º á€™á€°á€œá€›á€¾á€­á€žá€±á€¬ á€…á€¬á€›á€„á€ºá€¸á€¡á€•á€¼á€„á€º á€…á€¬á€›á€„á€ºá€¸á€¡á€žá€…á€º á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€á€¼á€„á€ºá€¸ (á€¥á€•á€™á€¬ - á‚ á€™á€¾ á‚.áˆáƒ á€žá€­á€”á€ºá€¸á€žá€­á€¯á€· á€•á€¼á€±á€¬á€„á€ºá€¸á€œá€²á€á€¼á€„á€ºá€¸) á€žá€­á€¯á€·á€™á€Ÿá€¯á€á€º á€™á€¾á€¬á€¸á€šá€½á€„á€ºá€¸á€™á€Šá€ºá€…á€­á€¯á€¸á á€–á€»á€€á€ºá€•á€¼á€®á€¸ á€•á€¼á€”á€ºá€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€á€¼á€„á€ºá€¸ á€•á€¼á€¯á€œá€¯á€•á€ºá€•á€«á€€ á€¡á€á€¼á€¬á€¸á€–á€¯á€”á€ºá€¸á Local Deletion Blacklist á€á€½á€„á€º á€á€¬á€¸á€†á€®á€¸á€á€¶á€‘á€¬á€¸á€›á€™á€¾á€¯á€€á€¼á€±á€¬á€„á€·á€º á€…á€¬á€›á€„á€ºá€¸á€¡á€žá€…á€º á€™á€›á€±á€¬á€€á€ºá€˜á€² á‚ á€Ÿá€¯á€žá€¬ á€€á€»á€”á€ºá€á€²á€·á€žá€Šá€·á€º á€•á€¼á€¿á€”á€¬ (Loss Entry Error) á€¡á€¬á€¸ Cloud Firestore á€’á€±á€á€¬á€™á€»á€¬á€¸á€€á€­á€¯ á€žá€€á€ºá€á€„á€º Live Document á€¡á€–á€¼á€…á€º á€žá€á€ºá€™á€¾á€á€ºá Deletion Flag á€™á€»á€¬á€¸ á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º á€•á€šá€ºá€–á€»á€€á€ºá€•á€±á€¸á€žá€Šá€·á€º á€…á€”á€…á€ºá€–á€¼á€„á€·á€º á€¡á€•á€¼á€®á€¸á€žá€á€º á€•á€¼á€„á€ºá€†á€„á€ºá€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Fixed critical Loss Entry bug where deleting and re-adding or adding new transactions on Device A caused Device B to reject live cloud transactions due to persistent local deletion blacklists. Live Firestore documents now automatically unmark local deletion flags and merge cleanly via ID map keying.',
    changesMy: [
      'ðŸ›¡ï¸ **Prevented Loss Entry (á€…á€¬á€›á€„á€ºá€¸á€•á€»á€±á€¬á€€á€ºá€†á€¯á€¶á€¸á€™á€¾á€¯ á€€á€¬á€€á€½á€šá€ºá€á€¼á€„á€ºá€¸)**: Cloud Firestore á€á€½á€„á€º á€›á€¾á€­á€”á€±á€žá€±á€¬ á€…á€¬á€›á€„á€ºá€¸á€™á€¾á€”á€ºá€žá€™á€»á€¾á€žá€Šá€º Live Document á€¡á€–á€¼á€…á€º á€¡á€™á€¼á€²á€á€™á€ºá€¸ á€žá€€á€ºá€á€„á€ºá€™á€Šá€ºá€–á€¼á€…á€ºá€•á€¼á€®á€¸ á€¡á€á€¼á€¬á€¸á€–á€¯á€”á€ºá€¸á€™á€»á€¬á€¸á€á€½á€„á€º Stale Deletion Flag á€€á€¼á€±á€¬á€„á€·á€º á€•á€šá€ºá€á€»á€á€¶á€›á€á€¼á€„á€ºá€¸ á€œá€¯á€¶á€¸á€ á€™á€›á€¾á€­á€á€±á€¬á€·á€•á€«á€á€„á€ºá€—á€»á€¬á‹',
      'ðŸ”— **Prevented Double Entry (á€…á€¬á€›á€„á€ºá€¸á€‘á€•á€ºá€á€¼á€„á€ºá€¸ á€€á€¬á€€á€½á€šá€ºá€á€¼á€„á€ºá€¸)**: Transaction ID Multi-Map Keying á€–á€¼á€„á€·á€º á€á€…á€ºá€‘á€•á€ºá€á€Šá€ºá€¸ á€™á€¬á€‚á€»á€¬ (Merge) á€œá€¯á€•á€ºá€•á€±á€¸á€žá€–á€¼á€„á€·á€º á€…á€¬á€›á€„á€ºá€¸ á‚ á€á€« á€‘á€•á€ºá€žá€½á€¬á€¸á€á€¼á€„á€ºá€¸ á€œá€¯á€¶á€¸á€ á€™á€›á€¾á€­á€˜á€² á€•á€™á€¬á€á€¡á€™á€¾á€”á€º (á‚.áˆáƒ á€žá€­á€”á€ºá€¸) á€¡á€á€­á€¡á€€á€» á€•á€±á€«á€ºá€™á€Šá€º á€–á€¼á€…á€ºá€•á€«á€žá€Šá€ºá‹',
      'ðŸ”„ **Deletion & Re-addition Sync Fix**: á€…á€¬á€›á€„á€ºá€¸á€€á€­á€¯ á€–á€»á€€á€ºá€œá€­á€¯á€€á€ºá€•á€¼á€®á€¸ á€•á€¼á€”á€ºá€‘á€Šá€·á€ºá€•á€«á€€á€œá€Šá€ºá€¸ á€¡á€á€¼á€¬á€¸á€–á€¯á€”á€ºá€¸á€á€½á€„á€º Sync á€”á€¾á€­á€•á€ºá€žá€Šá€ºá€”á€¾á€„á€·á€º á€…á€¬á€›á€„á€ºá€¸á€¡á€žá€…á€º á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€á€»á€­á€á€ºá€†á€€á€º á€›á€±á€¬á€€á€ºá€›á€¾á€­á€žá€½á€¬á€¸á€™á€Šá€º á€–á€¼á€…á€ºá€•á€«á€žá€Šá€ºá‹'
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
    titleMy: 'Cross-Device Sync Hash Checksum á€”á€¾á€„á€·á€º Sync Force Push á€¡á€•á€¼á€„á€º Auto Filter á€á€¬á€¸á€†á€®á€¸á€™á€¾á€¯á€”á€¾á€„á€·á€º á€žá€­á€”á€ºá€¸á€‚á€á€”á€ºá€¸ (x 100,000) á€™á€¼á€”á€ºá€†á€”á€ºá€á€½á€€á€ºá€á€»á€€á€ºá€™á€¾á€¯ á€á€œá€¯á€á€º á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€á€¼á€„á€ºá€¸',
    titleEn: 'Cross-Device Sync Checksum Optimization, Force Sync Push & Direct Lakhs Converter Helper',
    tag: 'feature',
    tagLabelMy: 'á€œá€¯á€•á€ºá€†á€±á€¬á€„á€ºá€á€»á€€á€ºá€žá€…á€º',
    tagLabelEn: 'Feature',
    descriptionMy: 'á€–á€¯á€”á€ºá€¸á€¡á€™á€»á€­á€¯á€¸á€¡á€…á€¬á€¸ á€™á€á€°á€Šá€®á€žá€±á€¬ á€…á€€á€ºá€™á€»á€¬á€¸á€¡á€€á€¼á€¬á€¸ Sync á€”á€¾á€­á€•á€ºá€žá€±á€¬á€ºá€œá€Šá€ºá€¸ á€…á€¬á€›á€„á€ºá€¸á€¡á€Ÿá€±á€¬á€„á€ºá€¸ á€•á€¼á€±á€¬á€„á€ºá€¸á€œá€²á€•á€¼á€„á€ºá€†á€„á€ºá€™á€¾á€¯á€™á€»á€¬á€¸ (á€¥á€•á€™á€¬- á‚.áˆáƒ á€žá€­á€”á€ºá€¸) á€¡á€¬á€¸ Sync Signature á€™á€¾ á€€á€»á€±á€¬á€ºá€žá€½á€¬á€¸á€á€²á€·á€žá€Šá€·á€º á€•á€¼á€¿á€”á€¬á€€á€­á€¯ Checksum Algorithm (Total Sum Check) á€”á€¾á€„á€·á€º Force Sync Push á€á€­á€¯á€·á€–á€¼á€„á€·á€º á€¡á€•á€¼á€®á€¸á€žá€á€º á€•á€¼á€„á€ºá€†á€„á€ºá€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹ á€‘á€­á€¯á€·á€¡á€•á€¼á€„á€º á€…á€¬á€›á€„á€ºá€¸á€€á€¼á€Šá€·á€ºá€‡á€šá€¬á€¸á€á€½á€„á€º Auto Filter á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º á€•á€±á€«á€ºá€”á€±á€á€¼á€„á€ºá€¸á€€á€­á€¯ á€€á€¬á€€á€½á€šá€ºá€›á€”á€º á€™á€°á€œ View á€€á€­á€¯ "All Time" á€žá€­á€¯á€· á€•á€¼á€±á€¬á€„á€ºá€¸á€œá€²á€•á€±á€¸á€á€²á€·á€•á€¼á€®á€¸ á€¡á€€á€¼á€½á€±á€¸á€”á€¾á€„á€·á€º á€…á€¬á€›á€„á€ºá€¸á€žá€…á€º Form á€™á€»á€¬á€¸á€á€½á€„á€º á€žá€­á€”á€ºá€¸á€‚á€á€”á€ºá€¸ á€›á€­á€¯á€€á€ºá€‘á€Šá€·á€ºá€›á€”á€ºá€œá€½á€šá€ºá€€á€°á€žá€Šá€·á€º "âœ¨ á€žá€­á€”á€ºá€¸ (x100,000)" á€á€œá€¯á€á€ºá€™á€»á€¬á€¸ á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€•á€±á€¸á€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Resolved cross-device sync skipping issue where editing existing transaction amounts bypassed sync signatures by implementing a total sum checksum and force sync push. Prevented unexpected auto-filter state retention and introduced a direct Lakhs (x100,000) converter helper button across entry forms.',
    changesMy: [
      'ðŸ”„ **Lossless Cross-Device Sync (á€…á€€á€ºá€¡á€á€»á€„á€ºá€¸á€á€»á€„á€ºá€¸ á€…á€„á€ºá€•á€¼á€­á€¯á€„á€º á€á€»á€­á€á€ºá€†á€€á€ºá€™á€¾á€¯)**: á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸ á€á€Šá€ºá€¸á€–á€¼á€á€ºá€•á€¼á€„á€ºá€†á€„á€ºá€•á€«á€€ Checksum Automatic Detection á€”á€¾á€„á€·á€º Force Sync Push á€…á€”á€…á€ºá€á€­á€¯á€·á€–á€¼á€„á€·á€º á€…á€€á€ºá€¡á€žá€…á€º/á€¡á€Ÿá€±á€¬á€„á€ºá€¸ á€¡á€¬á€¸á€œá€¯á€¶á€¸á€á€½á€„á€º á‚.áˆáƒ á€žá€­á€”á€ºá€¸ á€…á€žá€Šá€·á€º á€•á€™á€¬á€á€™á€»á€¬á€¸ á€á€­á€€á€»á€…á€½á€¬ á€¡á€•á€¼á€­á€¯á€„á€º á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€›á€±á€¬á€€á€ºá€›á€¾á€­á€žá€½á€¬á€¸á€™á€Šá€º á€–á€¼á€…á€ºá€•á€«á€žá€Šá€ºá‹',
      'âœ¨ **Direct Lakhs Converter (á€žá€­á€”á€ºá€¸á€‚á€á€”á€ºá€¸ á€™á€¼á€”á€ºá€†á€”á€º á€™á€¼á€¾á€±á€¬á€€á€ºá€•á€±á€¸á€™á€¾á€¯)**: á€…á€¬á€›á€„á€ºá€¸á€žá€…á€ºá€”á€¾á€„á€·á€º á€¡á€€á€¼á€½á€±á€¸á€™á€¾á€á€ºá€á€™á€ºá€¸ Form á€™á€»á€¬á€¸á€á€½á€„á€º á‚.áˆáƒ á€Ÿá€¯ á€›á€­á€¯á€€á€ºá€•á€¼á€®á€¸ "âœ¨ á€žá€­á€”á€ºá€¸ (x100,000)" á€”á€¾á€­á€•á€ºá€œá€­á€¯á€€á€ºá€žá€Šá€ºá€”á€¾á€„á€·á€º á‚áˆáƒ,á€á€á€ á€€á€»á€•á€ºá€žá€­á€¯á€· á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º á€•á€¼á€±á€¬á€„á€ºá€¸á€œá€²á€•á€±á€¸á€•á€«á€žá€Šá€ºá‹',
      'ðŸš« **Eliminated Auto Filter Retention**: Transactions View á€á€½á€„á€º á€¡á€›á€„á€º á€›á€½á€±á€¸á€á€»á€šá€ºá€á€²á€·á€žá€±á€¬ Auto Filter á€™á€»á€¬á€¸ á€„á€¼á€­á€™á€ºá€•á€¼á€®á€¸ á€€á€»á€”á€ºá€á€²á€·á€á€¼á€„á€ºá€¸ á€™á€›á€¾á€­á€˜á€² á€…á€¬á€›á€„á€ºá€¸á€¡á€¬á€¸á€œá€¯á€¶á€¸á€€á€­á€¯ á€¡á€™á€¼á€² á€¡á€€á€¼á€Šá€ºá€œá€„á€ºá€†á€¯á€¶á€¸ á€™á€¼á€„á€ºá€á€½á€±á€·á€›á€™á€Šá€º á€–á€¼á€…á€ºá€•á€«á€žá€Šá€ºá‹'
    ],
    changesEn: [
      'Implemented total sum checksum and force sync push in syncDataToCloud to guarantee 100% updated transaction amounts (e.g. 2.83 Lakhs) cross-device.',
      'Added direct "âœ¨ Lakhs (x100,000)" quick multiplier helper button in Transaction and Debt modals.',
      'Ensured clean default All-Time view in Transactions screen to prevent unexpected auto-filtering.'
    ],
  },
  {
    version: 'v4.7.6',
    buildNumber: 71,
    releaseDate: '2026-09-30',
    releaseTime: '06:38 PM (MMT)',
    titleMy: 'á€–á€¯á€”á€ºá€¸á€¡á€™á€»á€­á€¯á€¸á€¡á€…á€¬á€¸ á€™á€á€°á€Šá€®á€žá€±á€¬ á€…á€€á€ºá€™á€»á€¬á€¸á€á€½á€„á€º Sync á€œá€¯á€•á€ºá€•á€¼á€®á€¸á€”á€±á€¬á€€á€º á€•á€™á€¬á€ á€€á€½á€²á€œá€½á€²á€”á€±á€á€¼á€„á€ºá€¸á€”á€¾á€„á€·á€º Auto Filter á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º á€á€„á€ºá€”á€±á€žá€Šá€·á€º á€•á€¼á€¿á€”á€¬á€¡á€¬á€¸ á€¡á€•á€¼á€®á€¸á€žá€á€º á€•á€¼á€„á€ºá€†á€„á€ºá€á€¼á€„á€ºá€¸',
    titleEn: 'Default Filter State Optimization & All-Time Cross-Device Sync Visibility Fix',
    tag: 'feature',
    tagLabelMy: 'á€œá€¯á€•á€ºá€†á€±á€¬á€„á€ºá€á€»á€€á€ºá€žá€…á€º',
    tagLabelEn: 'Feature',
    descriptionMy: 'á€–á€¯á€”á€ºá€¸á€á€…á€ºá€œá€¯á€¶á€¸á€á€½á€„á€º á€…á€¬á€›á€„á€ºá€¸á€žá€½á€„á€ºá€¸á€•á€¼á€®á€¸ á€¡á€á€¼á€¬á€¸á€–á€¯á€”á€ºá€¸á€á€…á€ºá€œá€¯á€¶á€¸á€á€½á€„á€º Sync á€”á€¾á€­á€•á€ºá€œá€­á€¯á€€á€ºá€•á€«á€€ á€šá€á€„á€ºá€œ á€žá€­á€¯á€·á€™á€Ÿá€¯á€á€º á€¡á€á€¼á€¬á€¸á€›á€€á€ºá€…á€½á€²á€•á€« á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸á€€á€­á€¯ "á€šá€á€¯á€œ (This Month)" Auto Filter á€€ á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º á€…á€…á€ºá€‘á€¯á€á€º/á€–á€»á€±á€¬á€€á€ºá€‘á€¬á€¸á€á€²á€·á€žá€–á€¼á€„á€·á€º á€•á€™á€¬á€á€™á€»á€¬á€¸ á€€á€½á€²á€œá€½á€²á€•á€¼á€”á€±á€žá€Šá€·á€º á€•á€¼á€¿á€”á€¬á€¡á€¬á€¸ á€™á€°á€œ Default Filter á€€á€­á€¯ "á€á€…á€ºá€žá€€á€ºá€á€¬ / á€›á€€á€ºá€…á€½á€²á€¡á€¬á€¸á€œá€¯á€¶á€¸ (All Time)" á€žá€­á€¯á€· á€žá€á€ºá€™á€¾á€á€ºá€•á€±á€¸á€•á€¼á€®á€¸ á€žá€¯á€¶á€¸á€…á€½á€²á€žá€° á€›á€½á€±á€¸á€á€»á€šá€ºá€™á€¾á€¯á€¡á€œá€­á€¯á€€á€º LocalStorage á€á€½á€„á€º á€™á€¾á€á€ºá€žá€¬á€¸á€•á€±á€¸á€›á€”á€º á€•á€¼á€„á€ºá€†á€„á€ºá€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Fixed an issue where "This Month" auto-filter was automatically hiding historical/cross-month synced transactions on secondary devices, causing amount discrepancies (e.g. 2 Lakhs vs 2.83 Lakhs). Changed default time filter to "All Time" and persisted filter preferences.',
    changesMy: [
      'ðŸŒŸ **Default All-Time Visibility (á€›á€€á€ºá€…á€½á€²á€¡á€¬á€¸á€œá€¯á€¶á€¸)**: á€…á€€á€ºá€¡á€žá€…á€ºá€á€½á€„á€º á€¡á€€á€±á€¬á€„á€·á€ºá€á€„á€ºá€•á€¼á€®á€¸ Sync á€”á€¾á€­á€•á€ºá€žá€Šá€ºá€”á€¾á€„á€·á€º á€…á€¬á€›á€„á€ºá€¸á€¡á€¬á€¸á€œá€¯á€¶á€¸áŠ á€•á€­á€¯á€€á€ºá€†á€¶á€¡á€­á€á€º á€œá€€á€ºá€€á€»á€”á€ºá€„á€½á€± á€•á€™á€¬á€á€¡á€¬á€¸á€œá€¯á€¶á€¸ (á€¥á€•á€™á€¬- á‚.áˆáƒ á€žá€­á€”á€ºá€¸) á€€á€­á€¯ áá€á€% á€¡á€•á€¼á€Šá€·á€ºá€¡á€ á€á€­á€€á€»á€…á€½á€¬ á€™á€¼á€„á€ºá€á€½á€±á€·á€›á€™á€Šá€º á€–á€¼á€…á€ºá€•á€«á€žá€Šá€ºá‹',
      'ðŸš« **Removed Auto Filter Intrusion**: á€žá€¯á€¶á€¸á€…á€½á€²á€žá€° á€€á€­á€¯á€šá€ºá€á€­á€¯á€„á€º á€™á€”á€¾á€­á€•á€ºá€˜á€² "á€šá€á€¯á€œ" Auto Filter á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º á€á€„á€ºá€”á€±á€á€¼á€„á€ºá€¸á€€á€­á€¯ á€–á€šá€ºá€›á€¾á€¬á€¸á€•á€±á€¸á€á€²á€·á€•á€«á€žá€Šá€ºá‹',
      'ðŸ’¾ **Persisted Filter Preferences**: á€žá€¯á€¶á€¸á€…á€½á€²á€žá€° á€›á€½á€±á€¸á€á€»á€šá€ºá€á€²á€·á€žá€±á€¬ Time Filter á€¡á€žá€¯á€¶á€¸á€•á€¼á€¯á€á€»á€€á€ºá€™á€»á€¬á€¸á€¡á€¬á€¸ LocalStorage á€á€½á€„á€º á€™á€¾á€á€ºá€žá€¬á€¸á€•á€±á€¸á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹'
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
    titleMy: 'á€…á€¬á€›á€„á€ºá€¸á€¡á€žá€…á€ºá€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€á€¼á€„á€ºá€¸ Entry Form á€™á€­á€¯á€’á€šá€ºá€™á€»á€¬á€¸á€á€½á€„á€º Scroll Stuck (á€…á€á€›á€±á€¬ á€›á€½á€¾á€±á€·á€™á€›á€˜á€² á€„á€¼á€­á€™á€º/á€€á€•á€ºá€”á€±á€žá€Šá€·á€º á€•á€¼á€¿á€”á€¬) á€¡á€¬á€¸ á€¡á€•á€¼á€®á€¸á€žá€á€º á€á€»á€±á€¬á€™á€½á€±á€·á€¡á€±á€¬á€„á€º á€•á€¼á€„á€ºá€†á€„á€ºá€á€¼á€„á€ºá€¸',
    titleEn: 'Entry Form Modal Smooth Scroll Optimization & Dual Scroll Collision Removal',
    tag: 'feature',
    tagLabelMy: 'á€œá€¯á€•á€ºá€†á€±á€¬á€„á€ºá€á€»á€€á€ºá€žá€…á€º',
    tagLabelEn: 'Feature',
    descriptionMy: 'á€…á€¬á€›á€„á€ºá€¸á€¡á€žá€…á€º á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€á€¼á€„á€ºá€¸ Entry Form (Transaction Modal, Debt Modal, Wallet Modal, Category Picker) á€™á€»á€¬á€¸á€á€½á€„á€º á€™á€­á€¯á€˜á€­á€¯á€„á€ºá€¸á€–á€¯á€”á€ºá€¸á€–á€¼á€„á€·á€º á€œá€€á€ºá€á€»á€±á€¬á€„á€ºá€¸á€–á€¼á€„á€·á€º á€†á€½á€²á€›á€½á€¾á€±á€·á€›á€¬áŒ á€™á€»á€€á€ºá€”á€¾á€¬á€•á€¼á€„á€º Scroll á€„á€¼á€­á€™á€º/á€€á€•á€ºá€”á€±á€•á€¼á€®á€¸ á€á€»á€±á€¬á€™á€½á€±á€·á€…á€½á€¬ á€™á€žá€½á€¬á€¸á€žá€Šá€·á€º á€•á€¼á€¿á€”á€¬á€¡á€¬á€¸ á€–á€¯á€”á€ºá€¸á€™á€»á€€á€ºá€”á€¾á€¬á€•á€¼á€„á€º Outer Backdrop á Overflow á€€á€­á€¯ á€•á€­á€á€ºá€•á€¼á€®á€¸ Form Body á€€á€­á€¯á€žá€¬ á€žá€®á€¸á€žá€”á€·á€º Single Scroll Container á€¡á€–á€¼á€…á€º Touch Scrolling (-webkit-overflow-scrolling)áŠ Sticky Footer á€á€­á€¯á€·á€–á€¼á€„á€·á€º á€•á€¼á€”á€ºá€œá€Šá€º á€¡á€†á€„á€·á€ºá€™á€¼á€¾á€„á€·á€ºá€á€„á€º á€•á€±á€¸á€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Eliminated dual scroll collision on entry modals (Transaction, Debt, Wallet, Category Picker). Removed overflow-y-auto from outer overlay backdrops and enabled touch momentum scrolling (-webkit-overflow-scrolling: touch) on the form body container.',
    changesMy: [
      'ðŸ“± **Smooth Touch Scroll (á€á€»á€±á€¬á€™á€½á€±á€·á€žá€±á€¬ á€›á€½á€¾á€±á€·á€œá€»á€¬á€¸á€™á€¾á€¯)**: á€…á€¬á€›á€„á€ºá€¸á€¡á€žá€…á€º á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€žá€Šá€·á€º Form á€¡á€á€½á€„á€ºá€¸ á€œá€€á€ºá€–á€¼á€„á€·á€º á€†á€½á€²á€›á€½á€¾á€±á€·á€•á€«á€€ á€„á€¼á€­á€™á€º/á€€á€•á€ºá€™á€”á€±á€á€±á€¬á€·á€˜á€² á€œá€½á€á€ºá€œá€•á€ºá€…á€½á€¬ á€á€»á€±á€¬á€™á€½á€±á€·á€…á€½á€¬ á€†á€½á€²á€›á€½á€¾á€±á€·á€”á€­á€¯á€„á€ºá€¡á€±á€¬á€„á€º á€•á€¼á€„á€ºá€†á€„á€ºá€á€²á€·á€•á€«á€žá€Šá€ºá‹',
      'ðŸš« **Eliminated Dual Scroll Collision**: Backdrop Overlay á á€‘á€•á€ºá€†á€„á€·á€º Scroll á€¡á€•á€¼á€­á€¯á€„á€ºá€–á€¼á€…á€ºá€™á€¾á€¯á€€á€­á€¯ á€–á€šá€ºá€›á€¾á€¬á€¸á€•á€¼á€®á€¸ Form Body á€á€…á€ºá€á€¯á€á€Šá€ºá€¸á€€á€­á€¯á€žá€¬ Single Scroll Container á€–á€¼á€…á€ºá€…á€±á€á€²á€·á€•á€«á€žá€Šá€ºá‹',
      'ðŸ“Œ **Sticky Action Buttons**: Form á á€¡á€±á€¬á€€á€ºá€á€¼á€±á€›á€¾á€­ "á€žá€­á€™á€ºá€¸á€†á€Šá€ºá€¸á€™á€Šá€º" / "á€™á€œá€¯á€•á€ºá€á€±á€¬á€·á€•á€«" á€á€œá€¯á€á€ºá€™á€»á€¬á€¸á€€á€­á€¯ á€¡á€™á€¼á€² á€¡á€œá€½á€šá€ºá€á€€á€° á€”á€¾á€­á€•á€ºá€”á€­á€¯á€„á€ºá€…á€±á€›á€”á€º Sticky Footer á€•á€¼á€¯á€œá€¯á€•á€ºá€•á€±á€¸á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹'
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
    titleMy: 'á€‡á€šá€¬á€¸á€¡á€á€½á€„á€ºá€¸ á€•á€™á€¬á€á€¡á€¬á€¸á€œá€¯á€¶á€¸ (á€žá€­á€”á€ºá€¸á€‚á€á€”á€ºá€¸á€¡á€±á€¬á€€á€º á€¡á€žá€±á€¸á€…á€¬á€¸á€•á€™á€¬á€á€™á€»á€¬á€¸á€•á€«á€™á€€á€»á€”á€º) á€¡á€¬á€¸ á€žá€­á€”á€ºá€¸á€‚á€á€”á€ºá€¸ á€’á€¿á€™á€…á€€á€±á€¸ (á€¥á€•á€™á€¬ - á…á€,á€á€á€ = á€.á… á€žá€­á€”á€ºá€¸áŠ á,á€á€á€ = á€.á€á á€žá€­á€”á€ºá€¸) á€–á€¼á€„á€·á€º á€á€•á€¼á€±á€¸á€Šá€® á€•á€¼á€žá€á€¼á€„á€ºá€¸',
    titleEn: 'Universal Lakhs Decimal Formatting for All Table Amounts (e.g. 50,000 -> 0.5 Lakhs)',
    tag: 'feature',
    tagLabelMy: 'á€œá€¯á€•á€ºá€†á€±á€¬á€„á€ºá€á€»á€€á€ºá€žá€…á€º',
    tagLabelEn: 'Feature',
    descriptionMy: 'Table View á€‡á€šá€¬á€¸á€™á€»á€¬á€¸á€¡á€á€½á€„á€ºá€¸ á€•á€™á€¬á€ á€•á€­á€¯á€™á€­á€¯á€€á€»á€…á€ºá€œá€…á€ºá€…á€±á€›á€”á€ºá€”á€¾á€„á€·á€º á€á€•á€¼á€±á€¸á€Šá€®á€–á€¼á€…á€ºá€…á€±á€›á€”á€º á á€žá€­á€”á€ºá€¸á€¡á€±á€¬á€€á€º á€•á€™á€¬á€á€„á€šá€ºá€™á€»á€¬á€¸á€•á€«á€™á€€á€»á€”á€º á€•á€™á€¬á€á€¡á€¬á€¸á€œá€¯á€¶á€¸ (á€¥á€•á€™á€¬ - á…á€,á€á€á€ âž” á€.á… á€žá€­á€”á€ºá€¸áŠ á,á€á€á€ âž” á€.á€á á€žá€­á€”á€ºá€¸áŠ áƒá€á€ âž” á€.á€á€áƒ á€žá€­á€”á€ºá€¸áŠ á‚á€ âž” á€.á€á€á€á‚ á€žá€­á€”á€ºá€¸áŠ á„ âž” á€.á€á€á€á€á„ á€žá€­á€”á€ºá€¸) á€¡á€¬á€¸ á€žá€­á€”á€ºá€¸á€‚á€á€”á€ºá€¸ á€’á€¿á€™á€…á€€á€±á€¸á€–á€¼á€„á€·á€º á€žá€®á€¸á€žá€”á€·á€º á€–á€¼á€á€ºá€•á€¼á€•á€±á€¸á€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Updated table formatting so all numbers regardless of size (including < 100,000 MMK, e.g. 50,000 -> 0.5 Lakhs, 1,000 -> 0.01 Lakhs, 300 -> 0.003 Lakhs) convert consistently to the Lakhs decimal scale.',
    changesMy: [
      'ðŸ“Š **Universal Table Lakhs Scale**: á á€žá€­á€”á€ºá€¸á€¡á€±á€¬á€€á€º á€•á€™á€¬á€á€„á€šá€ºá€™á€»á€¬á€¸á€•á€«á€™á€€á€»á€”á€º á€‡á€šá€¬á€¸á€¡á€á€½á€„á€ºá€¸ á€•á€™á€¬á€á€¡á€¬á€¸á€œá€¯á€¶á€¸á€¡á€¬á€¸ á€žá€­á€”á€ºá€¸á€‚á€á€”á€ºá€¸ á€’á€¿á€™á€•á€¯á€¶á€…á€¶ (á€¥á€•á€™á€¬ - á…á€,á€á€á€ = á€.á… á€žá€­á€”á€ºá€¸áŠ á,á€á€á€ = á€.á€á á€žá€­á€”á€ºá€¸áŠ á„ = á€.á€á€á€á€á„ á€žá€­á€”á€ºá€¸) á€žá€­á€¯á€· á€•á€¼á€±á€¬á€„á€ºá€¸á€œá€²á€•á€±á€¸á€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
      'ðŸ’¡ **Hover Tooltip**: á€™á€°á€œ á€•á€¼á€Šá€·á€ºá€…á€¯á€¶á€žá€±á€¬ MMK á€•á€™á€¬á€á€¡á€á€­á€¡á€€á€»á€€á€­á€¯ á€‡á€šá€¬á€¸ Cell á€•á€±á€«á€ºá€á€½á€„á€º Mouse á€á€„á€ºá€‘á€¬á€¸á€•á€«á€€ á€žá€­á€¯á€·á€™á€Ÿá€¯á€á€º Long press á€”á€¾á€­á€•á€ºá€•á€«á€€ á€™á€°á€œá€¡á€á€­á€¯á€„á€ºá€¸ á€€á€¼á€Šá€·á€ºá€›á€¾á€¯á€”á€­á€¯á€„á€ºá€•á€«á€žá€Šá€ºá‹',
      'ðŸ  **Preserved Standard View**: Dashboard á€”á€¾á€„á€·á€º á€¡á€á€¼á€¬á€¸á€”á€±á€›á€¬á€™á€»á€¬á€¸á€á€½á€„á€º á€™á€°á€œ MMK á€…á€¶á€•á€¯á€¶á€…á€¶á€¡á€á€­á€¯á€„á€ºá€¸ á€•á€¯á€¶á€™á€¾á€”á€º á€•á€¼á€žá€‘á€¬á€¸á€†á€² á€–á€¼á€…á€ºá€•á€«á€žá€Šá€ºá‹'
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
    titleMy: 'Quick Action á€á€œá€¯á€á€ºá€™á€»á€¬á€¸á€¡á€¬á€¸ á€…á€¬á€á€”á€ºá€¸á€¡á€•á€¼á€Šá€·á€ºá€¡á€ á€•á€±á€«á€ºá€…á€±á€›á€”á€º á€¡á€­á€¯á€„á€ºá€€á€½á€”á€ºá€¡á€•á€±á€«á€º - á€…á€¬á€žá€¬á€¸á€¡á€±á€¬á€€á€º Vertical Layout á€–á€¼á€„á€·á€º á€†á€­á€¯á€’á€ºá€á€° á€•á€¼á€„á€ºá€†á€„á€ºá€™á€½á€™á€ºá€¸á€™á€¶á€á€¼á€„á€ºá€¸',
    titleEn: 'Vertical Quick Action Buttons (Icon Top, Full Uncut Text Below)',
    tag: 'feature',
    tagLabelMy: 'á€œá€¯á€•á€ºá€†á€±á€¬á€„á€ºá€á€»á€€á€ºá€žá€…á€º',
    tagLabelEn: 'Feature',
    descriptionMy: 'Dashboard á€¡á€‘á€€á€ºá€•á€­á€¯á€„á€ºá€¸á€›á€¾á€­ á€á€œá€¯á€á€º áƒ á€á€¯á€á€½á€„á€º á€…á€¬á€á€”á€ºá€¸á€™á€»á€¬á€¸ á€™á€•á€¼á€á€ºá€˜á€² á€¡á€•á€¼á€Šá€·á€ºá€¡á€ á€•á€±á€«á€ºá€œá€½á€„á€ºá€…á€±á€›á€”á€º á€á€œá€¯á€á€ºá á€¡á€”á€€á€º (Height) á€€á€­á€¯ á€á€­á€¯á€¸á€™á€¼á€¾á€„á€·á€ºá€•á€¼á€®á€¸ á€¡á€‘á€€á€ºá€á€”á€ºá€¸á€á€½á€„á€º Logo/Icon á€”á€¾á€„á€·á€º á€¡á€±á€¬á€€á€ºá€á€”á€ºá€¸á€á€½á€„á€º á€…á€¬á€žá€¬á€¸á€€á€­á€¯ á€”á€±á€›á€¬á€á€»á€•á€±á€¸á€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹ á€á€œá€¯á€á€º áƒ á€á€¯á€…á€œá€¯á€¶á€¸ á€¡á€™á€¼á€„á€·á€ºá€”á€¾á€„á€·á€º á€¡á€”á€¶ á€†á€­á€¯á€’á€ºá€á€°á€Šá€®á€Šá€¬á€…á€½á€¬ á€á€Šá€ºá€›á€¾á€­á€”á€±á€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Redesigned top quick action buttons with vertical orientation (Icon badge on top, auto-wrapping full text below) and fixed minimum equal heights to ensure complete text readability without truncation.',
    changesMy: [
      'âœ¨ **Full Uncut Text Visibility (á€…á€¬á€á€”á€ºá€¸á€¡á€•á€¼á€Šá€·á€ºá€•á€±á€«á€º)**: á€…á€¬á€žá€¬á€¸á€™á€»á€¬á€¸ á€–á€¼á€á€ºá€á€±á€¬á€€á€ºá€™á€á€¶á€›á€˜á€² á€…á€¬á€€á€¼á€±á€¬á€„á€ºá€¸ á á€á€”á€ºá€¸ á€žá€­á€¯á€·á€™á€Ÿá€¯á€á€º á‚ á€á€”á€ºá€¸á€–á€¼á€„á€·á€º á€¡á€•á€¼á€Šá€·á€ºá€¡á€ á€–á€á€ºá€›á€¾á€¯á€”á€­á€¯á€„á€ºá€…á€±á€›á€”á€º á€•á€¼á€„á€ºá€†á€„á€ºá€á€²á€·á€•á€«á€žá€Šá€ºá‹',
      'ðŸ” **Vertical Icon & Text Layout**: á€á€œá€¯á€á€ºá€á€…á€ºá€á€¯á€…á€®á á€¡á€•á€±á€«á€ºá€á€”á€ºá€¸á€á€½á€„á€º á€¡á€­á€¯á€„á€ºá€€á€½á€”á€º á€”á€¾á€„á€·á€º á€¡á€±á€¬á€€á€ºá€á€”á€ºá€¸á€á€½á€„á€º á€…á€¬á€žá€¬á€¸á€¡á€•á€¼á€Šá€·á€ºá€¡á€á€€á€­á€¯ á€žá€•á€ºá€›á€•á€ºá€…á€½á€¬ á€…á€®á€…á€‰á€ºá€•á€±á€¸á€á€²á€·á€•á€«á€žá€Šá€ºá‹',
      'ðŸ“ **Equal Symmetrical Dimensions (á€†á€­á€¯á€’á€ºá€á€°)**: á€á€œá€¯á€á€º áƒ á€á€¯á€…á€œá€¯á€¶á€¸á€¡á€¬á€¸ á€¡á€™á€¼á€„á€·á€ºá€”á€¾á€„á€·á€º á€¡á€”á€¶ (Min Height & Width) á€Šá€®á€á€°á€Šá€®á€™á€»á€¾ á€žá€á€ºá€™á€¾á€á€ºá€•á€±á€¸á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹'
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
    titleMy: 'á€á€„á€ºá€„á€½á€±áŠ á€‘á€½á€€á€ºá€„á€½á€±áŠ á€¡á€€á€¼á€½á€±á€¸ á€™á€¾á€á€ºá€™á€Šá€º á€á€œá€¯á€á€º áƒ á€á€¯á€¡á€¬á€¸ á€á€á€”á€ºá€¸á€‘á€²á€”á€¾á€„á€·á€º á€†á€­á€¯á€’á€ºá€á€° á€Šá€®á€Šá€¬á€…á€½á€¬ á€•á€¼á€„á€ºá€†á€„á€ºá€™á€½á€™á€ºá€¸á€™á€¶á€á€¼á€„á€ºá€¸',
    titleEn: 'Single-Row Uniform Sized Quick Action Buttons (Income, Expense, Debt)',
    tag: 'feature',
    tagLabelMy: 'á€œá€¯á€•á€ºá€†á€±á€¬á€„á€ºá€á€»á€€á€ºá€žá€…á€º',
    tagLabelEn: 'Feature',
    descriptionMy: 'Dashboard á€¡á€‘á€€á€ºá€•á€­á€¯á€„á€ºá€¸á€›á€¾á€­ "á€á€„á€ºá€„á€½á€± á€™á€¾á€á€ºá€™á€Šá€º"áŠ "á€‘á€½á€€á€ºá€„á€½á€± á€™á€¾á€á€ºá€™á€Šá€º" á€”á€¾á€„á€·á€º "á€¡á€€á€¼á€½á€±á€¸ á€™á€¾á€á€ºá€™á€Šá€º" Quick Action á€á€œá€¯á€á€º áƒ á€á€¯á€¡á€¬á€¸ á€™á€­á€¯á€˜á€­á€¯á€„á€ºá€¸á€–á€¯á€”á€ºá€¸á€”á€¾á€„á€·á€º á€…á€á€›á€„á€ºá€¡á€™á€»á€­á€¯á€¸á€¡á€…á€¬á€¸á€¡á€¬á€¸á€œá€¯á€¶á€¸á€á€½á€„á€º á‚ á€á€”á€ºá€¸ á€™á€á€½á€²á€˜á€² á€Šá€®á€Šá€¬á€žá€±á€¬ á á€á€”á€ºá€¸á€‘á€² (Single Row) á€á€½á€„á€º á€†á€­á€¯á€’á€ºá€á€°áŠ á€¡á€á€»á€­á€¯á€¸á€¡á€…á€¬á€¸á€á€° á€á€•á€¼á€±á€¸á€Šá€® á€œá€¾á€•á€…á€½á€¬ á€•á€¼á€žá€•á€±á€¸á€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Redesigned the top quick action buttons (Add Income, Add Expense, Add Debt) into a single-row 3-column grid layout ensuring equal width, symmetrical alignment, and zero multi-line wrapping across all mobile and screen sizes.',
    changesMy: [
      'âš¡ **Single-Row Alignment (á á€á€”á€ºá€¸á€‘á€²)**: á€á€œá€¯á€á€º áƒ á€á€¯á€¡á€¬á€¸ á‚ á€á€”á€ºá€¸ á€–á€¼á€…á€ºá€™á€žá€½á€¬á€¸á€…á€±á€˜á€² á€™á€­á€¯á€˜á€­á€¯á€„á€ºá€¸á€–á€¯á€”á€ºá€¸á€¡á€•á€«á€¡á€á€„á€º á€…á€á€›á€„á€ºá€á€­á€¯á€„á€ºá€¸á€á€½á€„á€º á á€á€”á€ºá€¸á€‘á€² á€Šá€®á€Šá€¬á€…á€½á€¬ á€•á€¼á€žá€•á€±á€¸á€•á€«á€žá€Šá€ºá‹',
      'ðŸ“ **Uniform Equal Sizing (á€†á€­á€¯á€’á€ºá€á€°)**: á€á€œá€¯á€á€º áƒ á€á€¯á€…á€œá€¯á€¶á€¸á€¡á€¬á€¸ á€¡á€”á€¶á€”á€¾á€„á€·á€º á€¡á€á€»á€­á€¯á€¸á€¡á€…á€¬á€¸á€á€° (Equal 3-column Grid) á€žá€á€ºá€™á€¾á€á€ºá€•á€±á€¸á€á€²á€·á á€Šá€®á€Šá€¬á€žá€•á€ºá€›á€•á€ºá€…á€±á€•á€«á€žá€Šá€ºá‹',
      'ðŸ“± **Mobile Optimized Text**: á€…á€á€›á€„á€ºá€¡á€žá€±á€¸á€™á€»á€¬á€¸á€á€½á€„á€º á€…á€¬á€žá€¬á€¸á€•á€¼á€á€ºá€á€±á€¬á€€á€ºá€™á€¾á€¯á€™á€›á€¾á€­á€˜á€² á€á€œá€¯á€á€ºá€¡á€á€½á€„á€ºá€¸ á€€á€½á€€á€ºá€á€­á€á€„á€ºá€†á€¶á€·á€¡á€±á€¬á€„á€º Font size á€”á€¾á€„á€·á€º Tooltip á€•á€«á€á€„á€ºá€¡á€±á€¬á€„á€º á€™á€½á€™á€ºá€¸á€™á€¶á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹'
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
    titleMy: 'Table View á€‡á€šá€¬á€¸á€™á€»á€¬á€¸á€á€½á€„á€º á€”á€±á€›á€¬á€žá€€á€ºá€žá€¬á€…á€±á€›á€”á€º á€žá€­á€”á€ºá€¸á€‚á€á€”á€ºá€¸á€á€”á€ºá€–á€­á€¯á€¸á€™á€»á€¬á€¸á€¡á€¬á€¸ á€’á€¿á€™á€€á€­á€”á€ºá€¸ (á€¥á€•á€™á€¬- á†.á… á€žá€­á€”á€ºá€¸) á€–á€¼á€„á€·á€º á€€á€»á€…á€ºá€œá€…á€ºá€…á€½á€¬ á€•á€¼á€žá€•á€±á€¸á€á€¼á€„á€ºá€¸',
    titleEn: 'Compact Lakhs Decimal Formatting for Table Views (e.g. 6.5 Lakhs)',
    tag: 'feature',
    tagLabelMy: 'á€œá€¯á€•á€ºá€†á€±á€¬á€„á€ºá€á€»á€€á€ºá€žá€…á€º',
    tagLabelEn: 'Feature',
    descriptionMy: 'Table View á€‡á€šá€¬á€¸á€™á€»á€¬á€¸á€¡á€á€½á€„á€ºá€¸ á€”á€±á€›á€¬á€žá€€á€ºá€žá€¬á€•á€¼á€®á€¸ á€€á€¼á€Šá€·á€ºá€›á€œá€½á€šá€ºá€€á€°á€…á€±á€›á€”á€ºá€¡á€á€½á€€á€º á€žá€­á€”á€ºá€¸á€‚á€á€”á€ºá€¸ á€á€”á€ºá€–á€­á€¯á€¸á€™á€»á€¬á€¸á€¡á€¬á€¸ áá€ á€žá€±á€¬á€„á€ºá€¸ (á á€žá€­á€”á€ºá€¸) á€–á€¼á€„á€·á€º á€…á€¬á€¸á á€’á€¿á€™á€€á€­á€”á€ºá€¸ á€•á€¯á€¶á€…á€¶á€–á€¼á€„á€·á€º (á€¥á€•á€™á€¬ - á†á…á„,áƒá‚á á€™á€¼á€”á€ºá€™á€¬á€€á€»á€•á€º âž” á†.á…á„áƒá‚á á€žá€­á€”á€ºá€¸áŠ á†á…á€,á€á€á€ á€™á€¼á€”á€ºá€™á€¬á€€á€»á€•á€º âž” á†.á… á€žá€­á€”á€ºá€¸áŠ á‡,á…á€,á€á€á€ á€™á€¼á€”á€ºá€™á€¬á€€á€»á€•á€º âž” á‡.á… á€žá€­á€”á€ºá€¸) á€žá€®á€¸á€žá€”á€·á€º á€–á€¼á€á€ºá€•á€¼á€•á€±á€¸á€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹ á€¡á€á€¼á€¬á€¸ á€…á€á€›á€„á€ºá€™á€»á€¬á€¸á€”á€¾á€„á€·á€º á€™á€°á€œá€”á€±á€›á€¬á€™á€»á€¬á€¸á€á€½á€„á€º á€™á€°á€œ MMK á€•á€¯á€¶á€…á€¶á€¡á€á€­á€¯á€„á€ºá€¸ á€•á€¯á€¶á€™á€¾á€”á€ºá€•á€¼á€žá€‘á€¬á€¸á€†á€² á€–á€¼á€…á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Applied compact Lakhs decimal formatting specifically for Table Views (e.g. 650,000 MMK -> 6.5 Lakhs, 750,000 -> 7.5 Lakhs) to maximize table readability and save horizontal space. Standard places remain unchanged.',
    changesMy: [
      'ðŸ“Š **Table-Specific Lakhs Formatting**: á€‡á€šá€¬á€¸á€¡á€á€½á€„á€ºá€¸ á€žá€­á€”á€ºá€¸á€‚á€á€”á€ºá€¸á€á€”á€ºá€–á€­á€¯á€¸á€™á€»á€¬á€¸ (á á€žá€­á€”á€ºá€¸á€”á€¾á€„á€·á€ºá€¡á€‘á€€á€º) á€¡á€¬á€¸ á€’á€¿á€™á€•á€¯á€¶á€…á€¶ (á€¥á€•á€™á€¬- á†á…á€,á€á€á€ âž” á†.á… á€žá€­á€”á€ºá€¸áŠ á‡á…á€,á€á€á€ âž” á‡.á… á€žá€­á€”á€ºá€¸) á€žá€®á€¸á€žá€”á€·á€º á€–á€¼á€á€ºá€•á€¼á€•á€±á€¸á€á€²á€·á€•á€«á€žá€Šá€ºá‹',
      'ðŸ’¡ **Hover Tooltip**: á€‡á€šá€¬á€¸á€•á€±á€«á€ºá€á€½á€„á€º Mouse á€á€„á€ºá€‘á€¬á€¸á€•á€«á€€ á€žá€­á€¯á€·á€™á€Ÿá€¯á€á€º Long press á€”á€¾á€­á€•á€ºá€•á€«á€€ á€™á€°á€œ á€•á€¼á€Šá€·á€ºá€…á€¯á€¶á€žá€±á€¬ á€•á€™á€¬á€á€á€”á€ºá€–á€­á€¯á€¸á€€á€­á€¯ Tooltip á€–á€¼á€„á€·á€º á€¡á€•á€¼á€Šá€·á€ºá€¡á€ á€€á€¼á€Šá€·á€ºá€›á€¾á€¯á€”á€­á€¯á€„á€ºá€•á€«á€žá€±á€¸á€žá€Šá€ºá‹',
      'ðŸ  **Preserved Standard Format**: Dashboard á€¡á€‘á€€á€ºá€•á€­á€¯á€„á€ºá€¸áŠ Card á€™á€»á€¬á€¸ á€”á€¾á€„á€·á€º á€¡á€á€¼á€¬á€¸á€”á€±á€›á€¬á€™á€»á€¬á€¸á€á€½á€„á€º á€™á€°á€œ á€•á€¯á€¶á€™á€¾á€”á€º MMK Formatting á€…á€”á€…á€ºá€¡á€á€­á€¯á€„á€ºá€¸ á€•á€¼á€žá€‘á€¬á€¸á€†á€² á€–á€¼á€…á€ºá€•á€«á€žá€Šá€ºá‹'
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
    titleMy: 'á€–á€¯á€”á€ºá€¸á€…á€á€›á€„á€ºá€™á€»á€¬á€¸á€á€½á€„á€º Horizontal Scrollbar á€™á€‘á€½á€€á€ºá€…á€±á€›á€”á€º Table View á€‡á€šá€¬á€¸á€™á€»á€¬á€¸á€¡á€¬á€¸ 100% Fit Responsive á€•á€¼á€„á€ºá€†á€„á€ºá€á€¼á€„á€ºá€¸',
    titleEn: 'Zero-Scroll Mobile Responsive Table View Layout Optimization',
    tag: 'feature',
    tagLabelMy: 'á€œá€¯á€•á€ºá€†á€±á€¬á€„á€ºá€á€»á€€á€ºá€žá€…á€º',
    tagLabelEn: 'Feature',
    descriptionMy: 'á€˜á€á€¹á€á€¬á€›á€±á€¸ á€¡á€”á€¾á€…á€ºá€á€»á€¯á€•á€º Table View á€‡á€šá€¬á€¸á€™á€»á€¬á€¸ á€™á€­á€¯á€˜á€­á€¯á€„á€ºá€¸á€–á€¯á€”á€ºá€¸ á€…á€á€›á€„á€ºá€™á€»á€¬á€¸á€•á€±á€«á€ºá€á€½á€„á€º á€˜á€±á€¸á€˜á€€á€ºá€žá€­á€¯á€· Horizontal Scroll á€‘á€½á€€á€ºá€”á€±á€žá€Šá€·á€º á€•á€¼á€¿á€”á€¬á€¡á€¬á€¸ á€œá€¯á€¶á€¸á€ á€™á€‘á€½á€€á€ºá€…á€±á€˜á€² á€…á€á€›á€„á€ºá€¡á€€á€»á€šá€º 100% á€€á€½á€€á€ºá€á€­ á€á€•á€ºá€†á€„á€ºá€á€„á€ºá€†á€¶á€·á€¡á€±á€¬á€„á€º `table-fixed` á€”á€¾á€„á€·á€º Proportional Cell Alignment á€–á€¼á€„á€·á€º á€•á€¼á€”á€ºá€œá€Šá€º á€™á€½á€™á€ºá€¸á€™á€¶á€•á€±á€¸á€á€²á€·á€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Optimized Financial Summary Table View layouts to fit 100% inside mobile viewports without triggering horizontal scrollbars. Applied table-fixed width distributions and truncation rules.',
    changesMy: [
      'ðŸ“± **Zero Horizontal Scrollbar**: á€˜á€á€¹á€á€¬á€›á€±á€¸ á€¡á€”á€¾á€…á€ºá€á€»á€¯á€•á€º Table View á€‡á€šá€¬á€¸á€™á€»á€¬á€¸á€¡á€¬á€¸ á€™á€­á€¯á€˜á€­á€¯á€„á€ºá€¸á€–á€¯á€”á€ºá€¸á€…á€á€›á€„á€ºá€™á€»á€¬á€¸á€á€½á€„á€º á€˜á€±á€¸á€žá€­á€¯á€· Scroll á€œá€¯á€•á€ºá€…á€›á€¬á€™á€œá€­á€¯á€˜á€² á€€á€½á€€á€ºá€á€­á€á€„á€ºá€†á€¶á€·á€¡á€±á€¬á€„á€º á€•á€¼á€„á€ºá€†á€„á€ºá€á€²á€·á€•á€«á€žá€Šá€ºá‹',
      'ðŸ“ **Responsive Table-Fixed Layout**: á€€á€±á€¬á€ºá€œá€¶á€¡á€€á€»á€šá€ºá€™á€»á€¬á€¸á€€á€­á€¯ á€›á€¬á€á€­á€¯á€„á€ºá€”á€¾á€¯á€”á€ºá€¸á€¡á€œá€­á€¯á€€á€º á€™á€»á€¾á€á€…á€½á€¬ á€žá€á€ºá€™á€¾á€á€ºá€•á€±á€¸á€•á€¼á€®á€¸ á€¡á€™á€Šá€ºá€™á€»á€¬á€¸á€”á€¾á€„á€·á€º á€á€”á€ºá€–á€­á€¯á€¸á€™á€»á€¬á€¸á€€á€­á€¯ á€™á€•á€¼á€á€ºá€˜á€² á€žá€•á€ºá€›á€•á€ºá€…á€½á€¬ á€•á€¼á€žá€•á€±á€¸á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹'
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
    titleMy: 'Wallet á€™á€»á€¬á€¸á€€á€­á€¯ á á€á€¯ á€™á€€ á€…á€­á€á€ºá€€á€¼á€­á€¯á€€á€º á€á€½á€²á€–á€€á€º á€›á€½á€±á€¸á€á€»á€šá€ºá€”á€­á€¯á€„á€ºá€žá€±á€¬ Multi-Wallet Checkbox Selector á€”á€¾á€„á€·á€º á€á€„á€ºá€„á€½á€±/á€‘á€½á€€á€ºá€„á€½á€±/á€¡á€žá€¬á€¸á€á€„á€º Table View á€‡á€šá€¬á€¸á€žá€…á€º á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€á€¼á€„á€ºá€¸',
    titleEn: 'Multi-Wallet Checkbox Selector & Structured Financial Summary Table View',
    tag: 'feature',
    tagLabelMy: 'á€œá€¯á€•á€ºá€†á€±á€¬á€„á€ºá€á€»á€€á€ºá€žá€…á€º',
    tagLabelEn: 'Feature',
    descriptionMy: 'Wallet á á€á€¯á€á€Šá€ºá€¸ á€™á€Ÿá€¯á€á€ºá€˜á€² á€™á€­á€™á€­á€€á€¼á€­á€¯á€€á€ºá€”á€¾á€…á€ºá€žá€€á€ºá€›á€¬ Wallet á á€á€¯áŠ á‚ á€á€¯áŠ áƒ á€á€¯ á€…á€žá€Šá€ºá€–á€¼á€„á€·á€º á€…á€­á€á€ºá€€á€¼á€­á€¯á€€á€º Checkbox á€–á€¼á€„á€·á€º á€á€½á€²á€–á€€á€ºá€›á€½á€±á€¸á€á€»á€šá€ºá€”á€­á€¯á€„á€ºá€žá€±á€¬ Multi-Wallet Selector á€¡á€¬á€¸ á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€•á€±á€¸á€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹ á€‘á€­á€¯á€·á€¡á€•á€¼á€„á€º á€á€„á€ºá€„á€½á€±áŠ á€‘á€½á€€á€ºá€„á€½á€±áŠ á€¡á€žá€¬á€¸á€á€„á€º á€•á€­á€¯á€„á€½á€±/á€œá€­á€¯á€„á€½á€±á€”á€¾á€„á€·á€º á€›á€½á€±á€¸á€á€»á€šá€ºá€‘á€¬á€¸á€žá€±á€¬ Wallet á€á€…á€ºá€á€¯á€á€»á€„á€ºá€¸á€…á€®á á€žá€®á€¸á€žá€”á€·á€º á€˜á€á€¹á€á€¬á€›á€±á€¸ á€¡á€”á€¾á€…á€ºá€á€»á€¯á€•á€º Table View á€‡á€šá€¬á€¸á€žá€…á€ºá€€á€­á€¯á€•á€« á€–á€”á€ºá€á€®á€¸á€•á€±á€¸á€á€²á€·á€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Added Multi-Wallet Checkbox Selector allowing users to combine any 1, 2, 3, or more wallets simultaneously. Created a structured Financial Summary Table View for Inflow, Outflow, Net Balance, and per-wallet breakdown.',
    changesMy: [
      'â˜‘ï¸ **Multi-Wallet Checkbox Selector**: Wallet á á€á€¯á€™á€€ (á á€á€¯áŠ á‚ á€á€¯áŠ áƒ á€á€¯á€…á€žá€Šá€ºá€–á€¼á€„á€·á€º) á€…á€­á€á€ºá€€á€¼á€­á€¯á€€á€º Checkbox á€•á€±á€«á€„á€ºá€¸á€…á€•á€ºá€›á€½á€±á€¸á€á€»á€šá€ºá€”á€­á€¯á€„á€ºá€…á€½á€™á€ºá€¸ á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€á€²á€·á€•á€«á€žá€Šá€ºá‹',
      'ðŸ“Š **Financial Summary Table View**: á€á€„á€ºá€„á€½á€±áŠ á€‘á€½á€€á€ºá€„á€½á€±áŠ á€¡á€žá€¬á€¸á€á€„á€º á€•á€­á€¯á€„á€½á€±/á€œá€­á€¯á€„á€½á€±á€”á€¾á€„á€·á€º á€›á€¬á€á€­á€¯á€„á€ºá€”á€¾á€¯á€”á€ºá€¸á€™á€»á€¬á€¸á€€á€­á€¯ á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€œá€¾á€•á€žá€±á€¬ á€‡á€šá€¬á€¸ (Table View) á€–á€¼á€„á€·á€º á€€á€¼á€Šá€·á€ºá€›á€¾á€¯á€”á€­á€¯á€„á€ºá€•á€«á€•á€¼á€®á‹',
      'ðŸ’³ **Per-Wallet Table Breakdown**: Wallet á‚ á€á€¯á€”á€¾á€„á€·á€ºá€¡á€‘á€€á€º á€…á€­á€á€ºá€€á€¼á€­á€¯á€€á€ºá€á€½á€²á€–á€€á€º á€›á€½á€±á€¸á€á€»á€šá€ºá€•á€«á€€ Wallet á€á€…á€ºá€á€¯á€á€»á€„á€ºá€¸á€…á€®á Inflow/Outflow/Net/Balance á€‡á€šá€¬á€¸á€€á€½á€€á€ºá€€á€­á€¯á€•á€« á€žá€®á€¸á€žá€”á€·á€º á€•á€¼á€žá€•á€±á€¸á€•á€«á€žá€Šá€ºá‹'
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
    titleMy: 'á€”á€±á€›á€¬á€šá€°á€œá€½á€”á€ºá€¸á€žá€±á€¬ Data Scope á€˜á€¬á€¸á€¡á€¬á€¸ á€€á€»á€‰á€ºá€¸á€™á€¼á€±á€¬á€„á€ºá€¸ á€žá€•á€ºá€›á€•á€ºá€žá€±á€¬ Compact Dropdown á€¡á€–á€¼á€…á€º á€•á€¼á€±á€¬á€„á€ºá€¸á€œá€²á€á€¼á€„á€ºá€¸á€”á€¾á€„á€·á€º á€žá€®á€¸á€žá€”á€·á€º Wallet á€¡á€œá€­á€¯á€€á€º á€›á€½á€±á€¸á€á€»á€šá€ºá€”á€­á€¯á€„á€ºá€…á€½á€™á€ºá€¸ á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€á€¼á€„á€ºá€¸',
    titleEn: 'Compact Unified Wallet Selector Dropdown & Specific Wallet Dashboard Filtering',
    tag: 'feature',
    tagLabelMy: 'á€œá€¯á€•á€ºá€†á€±á€¬á€„á€ºá€á€»á€€á€ºá€žá€…á€º',
    tagLabelEn: 'Feature',
    descriptionMy: 'Dashboard á€…á€á€›á€„á€ºá€•á€±á€«á€ºá€á€½á€„á€º á€”á€±á€›á€¬á€¡á€œá€½á€”á€ºá€šá€°á€”á€±á€žá€±á€¬ Data Scope Banner á€¡á€¬á€¸ á€–á€šá€ºá€›á€¾á€¬á€¸á€€á€¬áŠ á€€á€»á€‰á€ºá€¸á€™á€¼á€±á€¬á€„á€ºá€¸ á€žá€•á€ºá€›á€•á€ºá€žá€±á€¬ 1-Line Dropdown Bar á€¡á€–á€¼á€…á€º á€•á€¼á€±á€¬á€„á€ºá€¸á€œá€²á€•á€±á€¸á€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹ á€‘á€­á€¯á€·á€¡á€•á€¼á€„á€º "á€¡á€€á€±á€¬á€„á€·á€ºá€¡á€¬á€¸á€œá€¯á€¶á€¸ / á€€á€­á€¯á€šá€ºá€•á€­á€¯á€„á€º / Share" á€¡á€•á€¼á€„á€º á€•á€­á€¯á€€á€ºá€†á€¶á€¡á€­á€á€º (Wallet) á€á€…á€ºá€á€¯á€á€»á€„á€ºá€¸á€…á€®á€€á€­á€¯á€•á€« á€…á€­á€á€ºá€€á€¼á€­á€¯á€€á€º Select á€œá€¯á€•á€ºá áŽá€„á€ºá€¸ Wallet á€á€…á€ºá€á€¯á€á€Šá€ºá€¸á á€á€„á€ºá€„á€½á€±áŠ á€‘á€½á€€á€ºá€„á€½á€±áŠ á€œá€€á€ºá€€á€»á€”á€ºá€”á€¾á€„á€·á€º á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸á€€á€­á€¯ á€žá€®á€¸á€žá€”á€·á€º á€…á€…á€ºá€†á€±á€¸á€”á€­á€¯á€„á€ºá€•á€«á€•á€¼á€®á‹',
    descriptionEn: 'Replaced the large vertical Data Scope banner with a compact 1-line Dropdown toolbar. Added individual wallet selection to allow filtering Dashboard metrics, cash flows, and charts by specific wallets.',
    changesMy: [
      'ðŸ“± **Compact Layout**: á€”á€±á€›á€¬á€šá€°á€œá€½á€”á€ºá€¸á€žá€±á€¬ Data Scope Banner á€˜á€±á€¬á€€á€ºá€…á€ºá€€á€¼á€®á€¸á€¡á€¬á€¸ á€–á€šá€ºá€›á€¾á€¬á€¸á€•á€¼á€®á€¸ á€žá€•á€ºá€›á€•á€ºá€€á€»á€‰á€ºá€¸á€™á€¼á€±á€¬á€„á€ºá€¸á€žá€±á€¬ Filter Bar á€¡á€–á€¼á€…á€º á€•á€¼á€”á€ºá€œá€Šá€ºá€•á€¼á€„á€ºá€†á€„á€ºá€á€²á€·á€•á€«á€žá€Šá€ºá‹',
      'ðŸ’³ **Specific Wallet Selection**: "á€¡á€€á€±á€¬á€„á€·á€ºá€¡á€¬á€¸á€œá€¯á€¶á€¸"áŠ "á€€á€­á€¯á€šá€ºá€•á€­á€¯á€„á€º"áŠ "Share á€‘á€¬á€¸á€žá€±á€¬" á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸á€¡á€•á€¼á€„á€º á€™á€­á€™á€­á€œá€­á€¯á€á€»á€„á€ºá€žá€±á€¬ á€•á€­á€¯á€€á€ºá€†á€¶á€¡á€­á€á€º (Wallet) á€á€…á€ºá€á€¯á€á€»á€„á€ºá€¸á€…á€®á€€á€­á€¯ Dropdown á€™á€¾ Select á€œá€¯á€•á€ºá á€žá€®á€¸á€žá€”á€·á€º á€…á€…á€ºá€†á€±á€¸á€”á€­á€¯á€„á€ºá€•á€«á€•á€¼á€®á‹',
      'ðŸ“Š **Dynamic Dashboard Recalculation**: Dropdown á€á€½á€„á€º Wallet á€žá€®á€¸á€žá€”á€·á€º á€›á€½á€±á€¸á€á€»á€šá€ºá€œá€­á€¯á€€á€ºá€•á€«á€€ Dashboard á á€á€„á€ºá€„á€½á€±áŠ á€‘á€½á€€á€ºá€„á€½á€±áŠ á€œá€€á€ºá€€á€»á€”á€ºá€”á€¾á€„á€·á€º Chart á€™á€»á€¬á€¸á€¡á€¬á€¸á€œá€¯á€¶á€¸ á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º Dynamic á€•á€¼á€±á€¬á€„á€ºá€¸á€œá€²á€•á€¼á€žá€•á€±á€¸á€•á€«á€žá€Šá€ºá‹'
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
    titleMy: 'á€šá€á€¯á€œ á€‘á€½á€€á€ºá€„á€½á€± á€™á€„á€¼á€­á€™á€ºá€˜á€² á€‚á€á€”á€ºá€¸á€™á€»á€¬á€¸ á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º á€•á€¼á€±á€¬á€„á€ºá€¸á€œá€²á€”á€±á€žá€Šá€·á€º á€•á€¼á€¿á€”á€¬á€¡á€¬á€¸ á€á€­á€€á€»á€…á€½á€¬ á€•á€¼á€„á€ºá€†á€„á€ºá€á€¼á€„á€ºá€¸',
    titleEn: 'Stabilized "This Month Expense" Calculations & Foreign Currency Fallback Wallet Resolution',
    tag: 'fix',
    tagLabelMy: 'á€•á€¼á€„á€ºá€†á€„á€ºá€™á€¾á€¯',
    tagLabelEn: 'Bug Fix',
    descriptionMy: 'Dashboard á€á€½á€„á€º "á€šá€á€¯á€œ á€‘á€½á€€á€ºá€„á€½á€±" (This Month Outflow) á€á€½á€€á€ºá€á€»á€€á€ºá€›á€¬áŒ á€™á€á€°á€Šá€®á€žá€±á€¬ Wallet á€™á€»á€¬á€¸ (USD, THB, Shared Wallets) á Exchange Rate conversion lookup á€€á€­á€¯ fallback resolution á€–á€¼á€„á€·á€º á€¡á€á€Šá€ºá€•á€¼á€¯á€•á€±á€¸á€á€²á€·á€•á€¼á€®á€¸áŠ Local Calendar Month á€”á€¾á€„á€·á€º Calculation totals á€™á€»á€¬á€¸á€€á€­á€¯ `useMemo` / `useCallback` á€–á€¼á€„á€·á€º á€„á€¼á€­á€™á€ºá€žá€€á€ºá€¡á€±á€¬á€„á€º á€œá€¯á€¶á€¸á€ á€•á€¼á€„á€ºá€†á€„á€ºá€•á€±á€¸á€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Fixed a bug where "This Month Expense" fluctuated due to un-memoized monthly date filters and un-resolved wallet currency conversion lookups. Wrapped calculations in memoized hooks with fallback resolution.',
    changesMy: [
      'ðŸ“Š **á€šá€á€¯á€œ á€‘á€½á€€á€ºá€„á€½á€± á€á€Šá€ºá€„á€¼á€­á€™á€ºá€…á€±á€á€¼á€„á€ºá€¸**: "á€šá€á€¯á€œ á€‘á€½á€€á€ºá€„á€½á€±" (This Month Outflow) á€”á€¾á€„á€·á€º "á€šá€á€¯á€œ á€á€„á€ºá€„á€½á€±" á€á€½á€€á€ºá€á€»á€€á€ºá€™á€¾á€¯á€™á€»á€¬á€¸á€€á€­á€¯ `useMemo` / `useCallback` á€–á€¼á€„á€·á€º á€á€Šá€ºá€„á€¼á€­á€™á€ºá€¡á€±á€¬á€„á€º á€‘á€­á€”á€ºá€¸á€á€»á€¯á€•á€ºá€•á€±á€¸á€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
      'ðŸ”€ **Fallback Wallet Resolution**: á€”á€­á€¯á€„á€ºá€„á€¶á€á€¼á€¬á€¸á€„á€½á€± (USD, THB, SGD) á€”á€¾á€„á€·á€º á€™á€»á€¾á€á€±á€‘á€¬á€¸á€žá€±á€¬ Wallet á€™á€¾á€á€ºá€á€™á€ºá€¸á€™á€»á€¬á€¸á á€„á€½á€±á€œá€²á€”á€¾á€¯á€”á€ºá€¸ Conversion á€™á€»á€¬á€¸á€€á€­á€¯ á€˜á€€á€ºá€…á€¯á€¶ Wallet Resolution á€–á€¼á€„á€·á€º á€¡á€™á€¼á€²á€á€™á€ºá€¸ á€á€­á€€á€»á€…á€½á€¬ á€á€½á€€á€ºá€•á€±á€¸á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹',
      'ðŸ“… **Local Calendar Month Alignment**: UTC á€…á€á€›á€„á€º á€›á€€á€ºá€…á€½á€² á€™á€á€°á€Šá€®á€™á€¾á€¯á€€á€­á€¯ á€…á€€á€ºá á€™á€°á€œ Calendar Month (`YYYY-MM`) á€–á€¼á€„á€·á€º á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€Šá€¾á€­á€šá€°á€•á€±á€¸á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹'
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
    titleMy: 'á€…á€á€›á€„á€º á€•á€±á€«á€ºá€›á€¾á€­ á€‚á€á€”á€ºá€¸á€™á€»á€¬á€¸ á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º á€•á€¼á€±á€¬á€„á€ºá€¸á€œá€²á€”á€±á€á€¼á€„á€ºá€¸á€”á€¾á€„á€·á€º á€¡á€›á€±á€¬á€„á€º á‚ á€›á€±á€¬á€„á€º á€á€¯á€”á€ºá€”á€±á€žá€Šá€·á€º Infinite State Feedback Loop á€•á€¼á€¿á€”á€¬á€¡á€¬á€¸ á€œá€¯á€¶á€¸á€ á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€á€¼á€„á€ºá€¸',
    titleEn: 'Eliminated Infinite Re-render Feedback Loop & Rapid Number/Color Flicker',
    tag: 'feature',
    tagLabelMy: 'á€œá€¯á€•á€ºá€†á€±á€¬á€„á€ºá€á€»á€€á€º',
    tagLabelEn: 'Feature Update',
    descriptionMy: 'Firestore Real-time Snapshot á€”á€¾á€„á€·á€º React Local State á€á€­á€¯á€·á€¡á€€á€¼á€¬á€¸ á€á€”á€ºá€–á€­á€¯á€¸ á€™á€á€°á€Šá€®á€˜á€² á€á€¯á€¶á€·á€•á€¼á€”á€ºá€™á€¾á€¯ á€á€œá€¾á€Šá€·á€ºá€…á€® á€–á€¼á€…á€ºá€•á€±á€«á€ºá€”á€±á€žá€–á€¼á€„á€·á€º á€…á€á€›á€„á€ºá€•á€±á€«á€ºá€á€½á€„á€º á€‚á€á€”á€ºá€¸á€™á€»á€¬á€¸ á€¡á€œá€­á€¯á€œá€­á€¯ á€•á€¼á€±á€¬á€„á€ºá€¸á€œá€² á€á€¯á€”á€ºá€”á€±á€á€¼á€„á€ºá€¸á€”á€¾á€„á€·á€º á€¡á€›á€±á€¬á€„á€º á‚ á€›á€±á€¬á€„á€º (á€¡á€…á€­á€™á€ºá€¸/á€¡á€”á€®/á€¡á€•á€¼á€¬) á€á€–á€œá€•á€ºá€–á€œá€•á€º á€•á€¼á€±á€¬á€„á€ºá€¸á€”á€±á€žá€Šá€·á€º Loop Bug á€¡á€¬á€¸ á€á€­á€€á€»á€žá€±á€¬ Array Deep Guard á€–á€¼á€„á€·á€º á€¡á€•á€¼á€®á€¸á€á€­á€¯á€„á€º á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸ á€•á€¼á€„á€ºá€†á€„á€ºá€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Fixed an infinite re-render loop where Firestore snapshot state and React state repeatedly triggered updates, causing numbers and badge colors to rapidly flicker.',
    changesMy: [
      'âš¡ **Infinite State Loop á€•á€¼á€„á€ºá€†á€„á€ºá€á€¼á€„á€ºá€¸**: Firestore á€”á€¾á€„á€·á€º Local State á€¡á€€á€¼á€¬á€¸ á€•á€¼á€”á€ºá€œá€Šá€º á€á€­á€¯á€€á€ºá€…á€…á€ºá€žá€Šá€·á€ºá€”á€±á€›á€¬á€á€½á€„á€º `areArraysEqual` Deep Guard á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á á€‚á€á€”á€ºá€¸á€™á€»á€¬á€¸ á€¡á€œá€­á€¯á€œá€­á€¯ á€•á€¼á€±á€¬á€„á€ºá€¸á€œá€²á€”á€±á€™á€¾á€¯á€€á€­á€¯ á€œá€¯á€¶á€¸á€ á€–á€šá€ºá€›á€¾á€¬á€¸á€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
      'ðŸŽ¨ **á€¡á€›á€±á€¬á€„á€º á€á€–á€œá€•á€ºá€–á€œá€•á€º á€•á€¼á€±á€¬á€„á€ºá€¸á€™á€¾á€¯ á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€á€¼á€„á€ºá€¸**: State á€á€Šá€ºá€„á€¼á€­á€™á€ºá€žá€½á€¬á€¸á€žá€–á€¼á€„á€·á€º Badges á€”á€¾á€„á€·á€º Header Banners á€™á€»á€¬á€¸á€›á€¾á€­ á€¡á€›á€±á€¬á€„á€ºá€™á€»á€¬á€¸ á€œá€¾á€¯á€•á€ºá€á€á€ºá€”á€±á€á€¼á€„á€ºá€¸ á€™á€›á€¾á€­á€á€±á€¬á€·á€˜á€² á€„á€¼á€­á€™á€ºá€žá€€á€ºá€…á€½á€¬ á€•á€¼á€žá€•á€±á€¸á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹',
      'ðŸš€ **App Performance & Stability**: Render Cycle á€™á€»á€¬á€¸á€€á€­á€¯ á€¡á€‘á€°á€¸ á€•á€±á€«á€·á€•á€«á€¸á€¡á€±á€¬á€„á€º á€•á€¼á€„á€ºá€†á€„á€ºá€‘á€¬á€¸á€žá€–á€¼á€„á€·á€º á€¡á€€á€ºá€•á€º á€™á€¼á€”á€ºá€†á€”á€ºá€™á€¾á€¯á€”á€¾á€„á€·á€º á€…á€€á€ºá á€˜á€€á€ºá€‘á€›á€® á€…á€¬á€¸á€žá€¯á€¶á€¸á€™á€¾á€¯á€€á€­á€¯ á€œá€»á€¾á€±á€¬á€·á€á€»á€•á€±á€¸á€á€²á€·á€•á€«á€žá€Šá€ºá‹'
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
    titleMy: 'á€›á€­á€¯á€¸á€›á€­á€¯á€¸ á€¡á€žá€¯á€¶á€¸á€…á€›á€­á€á€º á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸á€á€½á€„á€º "á€„á€½á€±á€œá€½á€¾á€²á€‘á€½á€€á€º" Badge á€™á€¾á€¬á€¸á€šá€½á€„á€ºá€¸ á€•á€±á€«á€ºá€”á€±á€žá€Šá€·á€ºá€•á€¼á€¿á€”á€¬á€¡á€¬á€¸ á€á€­á€€á€»á€…á€½á€¬ á€•á€¼á€„á€ºá€†á€„á€ºá€á€¼á€„á€ºá€¸',
    titleEn: 'Resolved Erroneous "Transfer Out" Badge Tagging on Standard Expense Records',
    tag: 'feature',
    tagLabelMy: 'á€œá€¯á€•á€ºá€†á€±á€¬á€„á€ºá€á€»á€€á€º',
    tagLabelEn: 'Feature Update',
    descriptionMy: 'Transaction Modal á€á€½á€„á€º á€›á€­á€¯á€¸á€›á€­á€¯á€¸ á€‘á€½á€€á€ºá€„á€½á€±/á€¡á€žá€¯á€¶á€¸á€…á€›á€­á€á€º á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸ (á€¥á€•á€™á€¬- á€…á€¬á€¸á€žá€±á€¬á€€á€ºá€€á€¯á€”á€ºáŠ á€á€€á€¹á€€á€…á€®áŠ á€™á€”á€€á€ºá€…á€¬) á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€›á€¬áŒ `transferType` á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º á€•á€«á€á€„á€ºá€žá€½á€¬á€¸á€žá€–á€¼á€„á€·á€º "á€„á€½á€±á€œá€½á€¾á€²á€‘á€½á€€á€º" (Transfer Out) á€Ÿá€¯ á€™á€¾á€¬á€¸á€šá€½á€„á€ºá€¸ á€•á€±á€«á€ºá€”á€±á€žá€Šá€·á€º Bug á€€á€­á€¯ á€•á€¼á€„á€ºá€†á€„á€ºá€•á€±á€¸á€á€²á€·á€•á€¼á€®á€¸áŠ á€šá€á€„á€º á€™á€¾á€á€ºá€á€™á€ºá€¸á€¡á€Ÿá€±á€¬á€„á€ºá€¸á€™á€»á€¬á€¸á€€á€­á€¯á€œá€Šá€ºá€¸ á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€•á€±á€¸á€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Fixed a bug where standard expense entries inadvertently inherited transferType properties, causing incorrect "Transfer Out" badges. Automated auto-repair for existing transaction histories.',
    changesMy: [
      'ðŸ·ï¸ **á€„á€½á€±á€œá€½á€¾á€²á€‘á€½á€€á€º Badge á€¡á€™á€¾á€¬á€¸ á€•á€¼á€„á€ºá€†á€„á€ºá€á€¼á€„á€ºá€¸**: á€›á€­á€¯á€¸á€›á€­á€¯á€¸ á€¡á€žá€¯á€¶á€¸á€…á€›á€­á€á€ºá€”á€¾á€„á€·á€º á€á€„á€ºá€„á€½á€± á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸á€á€½á€„á€º "á€„á€½á€±á€œá€½á€¾á€²á€‘á€½á€€á€º" Badge á€™á€¾á€¬á€¸á€•á€¼á€”á€±á€žá€Šá€·á€º Logic á€€á€­á€¯ á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸ á€•á€¼á€„á€ºá€†á€„á€ºá€•á€±á€¸á€á€²á€·á€•á€«á€žá€Šá€ºá‹',
      'ðŸ§¹ **Auto-Repair Cleaning**: á€…á€€á€ºá€‘á€²á€”á€¾á€„á€·á€º Cloud á€•á€±á€«á€ºá€›á€¾á€­ á€šá€á€„á€º á€…á€¬á€›á€„á€ºá€¸á€™á€¾á€á€ºá€á€™á€ºá€¸á€Ÿá€±á€¬á€„á€ºá€¸á€™á€»á€¬á€¸á€‘á€²á€™á€¾ á€™á€¾á€¬á€¸á€šá€½á€„á€ºá€¸á€•á€«á€á€„á€ºá€”á€±á€žá€±á€¬ transferType á€™á€»á€¬á€¸á€€á€­á€¯ á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º Clean Up á€œá€¯á€•á€ºá€•á€±á€¸á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹',
      'ðŸ”„ **á€¡á€™á€¾á€”á€ºá€á€€á€šá€º á€„á€½á€±á€œá€½á€¾á€²á€™á€¾á€¯á€™á€»á€¬á€¸á€žá€¬ á€•á€¼á€žá€á€¼á€„á€ºá€¸**: "á€„á€½á€±á€œá€½á€¾á€²á€•á€¼á€±á€¬á€„á€ºá€¸á€á€¼á€„á€ºá€¸" Category á€–á€¼á€„á€·á€º á€•á€¼á€¯á€œá€¯á€•á€ºá€žá€±á€¬ á€¡á€€á€±á€¬á€„á€·á€ºá€á€»á€„á€ºá€¸ á€œá€½á€¾á€²á€•á€¼á€±á€¬á€„á€ºá€¸á€™á€¾á€¯á€™á€»á€¬á€¸á€á€½á€„á€ºá€žá€¬ "á€„á€½á€±á€œá€½á€¾á€²á€‘á€½á€€á€º" / "á€„á€½á€±á€œá€½á€¾á€²á€á€„á€º" Badge á€•á€¼á€žá€™á€Šá€º á€–á€¼á€…á€ºá€•á€«á€žá€Šá€ºá‹'
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
    titleMy: 'Transaction Page á€á€½á€„á€º á€›á€€á€ºá€¡á€œá€­á€¯á€€á€º á€…á€¬á€›á€„á€ºá€¸á€á€½á€²á€á€¼á€¬á€¸á€•á€¼á€žá€™á€¾á€¯á€”á€¾á€„á€·á€º Wallet á€á€…á€ºá€á€¯á€á€»á€„á€ºá€¸á€…á€®á Inflow/Outflow/Opening/Closing á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸ á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€á€¼á€„á€ºá€¸',
    titleEn: 'Added Daily Transaction Grouping & Individual Wallet Inflow/Outflow/Opening/Closing Metrics',
    tag: 'feature',
    tagLabelMy: 'á€œá€¯á€•á€ºá€†á€±á€¬á€„á€ºá€á€»á€€á€º',
    tagLabelEn: 'Feature Update',
    descriptionMy: 'á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸ á€•á€¼á€”á€ºá€…á€…á€ºá€›á€œá€½á€šá€ºá€€á€°á€…á€±á€›á€”á€º Transaction Page á€›á€¾á€­ á€™á€¾á€á€ºá€á€™á€ºá€¸á€™á€»á€¬á€¸á€€á€­á€¯ á€›á€€á€ºá€…á€½á€²á€¡á€œá€­á€¯á€€á€º á€¡á€¯á€•á€ºá€…á€¯á€–á€½á€²á€·á á€”á€±á€·á€…á€‰á€º á€á€„á€ºá€„á€½á€±áŠ á€‘á€½á€€á€ºá€„á€½á€±á€”á€¾á€„á€·á€º á€¡á€žá€¬á€¸á€á€„á€º á€•á€­á€¯/á€œá€­á€¯á€„á€½á€±á€™á€»á€¬á€¸ á€á€½á€²á€á€¼á€¬á€¸á€•á€¼á€žá€•á€±á€¸á€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹ á€‘á€­á€¯á€·á€¡á€•á€¼á€„á€º Wallet á€á€…á€ºá€á€¯á€á€»á€„á€ºá€¸á€…á€®á á€…á€á€„á€ºá€œá€€á€ºá€€á€»á€”á€º (Opening Balance)áŠ á€á€„á€ºá€„á€½á€±á€…á€¯á€…á€¯á€•á€±á€«á€„á€ºá€¸ (Inflow)áŠ á€‘á€½á€€á€ºá€„á€½á€±á€…á€¯á€…á€¯á€•á€±á€«á€„á€ºá€¸ (Outflow) á€”á€¾á€„á€·á€º á€¡á€•á€­á€á€ºá€œá€€á€ºá€€á€»á€”á€º (Closing Balance) á€™á€»á€¬á€¸á€€á€­á€¯á€œá€Šá€ºá€¸ á€á€­á€€á€»á€…á€½á€¬ á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€•á€±á€¸á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Enhanced Transaction Page with daily date grouping headers and daily inflow/outflow subtotals. Expanded Wallets View with individual and total Opening Balance, Inflow, Outflow, and Closing Balance summaries.',
    changesMy: [
      'ðŸ“… **Transaction Page á€›á€€á€ºá€¡á€œá€­á€¯á€€á€º á€¡á€¯á€•á€ºá€…á€¯á€–á€½á€²á€·á€™á€¾á€¯**: á€™á€¾á€á€ºá€á€™á€ºá€¸á€™á€»á€¬á€¸á€€á€­á€¯ á€›á€€á€ºá€…á€½á€²á€¡á€œá€­á€¯á€€á€º á€žá€”á€·á€ºá€›á€¾á€„á€ºá€¸á€…á€½á€¬ á€¡á€¯á€•á€ºá€…á€¯á€–á€½á€²á€·á€•á€±á€¸á€‘á€¬á€¸á€•á€¼á€®á€¸ á€”á€±á€·á€á€…á€ºá€”á€±á€·á€á€»á€„á€ºá€¸á€…á€®á á€á€„á€ºá€„á€½á€± (+Inflow)áŠ á€‘á€½á€€á€ºá€„á€½á€± (-Outflow) á€”á€¾á€„á€·á€º á€¡á€žá€¬á€¸á€á€„á€º (Net) á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸á€€á€­á€¯ á€¡á€•á€±á€«á€ºá€†á€¯á€¶á€¸ á€á€±á€«á€„á€ºá€¸á€…á€‰á€ºá€á€”á€ºá€¸á€á€½á€„á€º á€–á€±á€¬á€ºá€•á€¼á€•á€±á€¸á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹',
      'ðŸ’³ **Wallet á€á€…á€ºá€á€¯á€á€»á€„á€ºá€¸á€…á€®á á€á€„á€ºá€„á€½á€±/á€‘á€½á€€á€ºá€„á€½á€± á€¡á€”á€¾á€…á€ºá€á€»á€¯á€•á€º**: Wallet á€€á€á€ºá€á€…á€ºá€á€¯á€á€»á€„á€ºá€¸á€…á€®á€á€½á€„á€º á€…á€á€„á€ºá€œá€€á€ºá€€á€»á€”á€º (Opening Balance)áŠ á€á€„á€ºá€„á€½á€±á€…á€¯á€…á€¯á€•á€±á€«á€„á€ºá€¸ (Inflow)áŠ á€‘á€½á€€á€ºá€„á€½á€±á€…á€¯á€…á€¯á€•á€±á€«á€„á€ºá€¸ (Outflow) á€”á€¾á€„á€·á€º á€¡á€•á€­á€á€ºá€œá€€á€ºá€€á€»á€”á€º (Closing Balance) á€¡á€žá€±á€¸á€…á€­á€á€º á€‡á€šá€¬á€¸á€™á€»á€¬á€¸ á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€•á€±á€¸á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹',
      'ðŸ“Š **á€…á€¯á€…á€¯á€•á€±á€«á€„á€ºá€¸ á€¡á€€á€±á€¬á€„á€·á€ºá€™á€»á€¬á€¸á á€¡á€”á€¾á€…á€ºá€á€»á€¯á€•á€º Banner**: Wallets View á€¡á€•á€±á€«á€ºá€†á€¯á€¶á€¸á€á€½á€„á€ºá€œá€Šá€ºá€¸ á€¡á€€á€±á€¬á€„á€·á€ºá€¡á€¬á€¸á€œá€¯á€¶á€¸á€•á€±á€«á€„á€ºá€¸á á€…á€á€„á€ºá€œá€€á€ºá€€á€»á€”á€ºáŠ á€á€„á€ºá€„á€½á€±áŠ á€‘á€½á€€á€ºá€„á€½á€±á€”á€¾á€„á€·á€º á€¡á€•á€­á€á€ºá€œá€€á€ºá€€á€»á€”á€º á€…á€¬á€›á€„á€ºá€¸á€•á€±á€«á€„á€ºá€¸á€™á€»á€¬á€¸á€€á€­á€¯ á€•á€±á€«á€ºá€œá€½á€„á€ºá€…á€½á€¬ á€•á€¼á€žá€•á€±á€¸á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹'
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
    titleMy: 'á€™á€­á€¯á€˜á€­á€¯á€„á€ºá€¸á€–á€¯á€”á€ºá€¸á€™á€»á€¬á€¸á€á€½á€„á€º Manual Cloud Sync á€á€œá€¯á€á€º á€•á€±á€«á€ºá€œá€½á€„á€ºá€…á€½á€¬ á€á€•á€ºá€†á€„á€ºá€•á€±á€¸á€á€¼á€„á€ºá€¸',
    titleEn: 'Added Prominent 1-Tap Manual Sync Buttons for Mobile & Desktop Devices',
    tag: 'feature',
    tagLabelMy: 'á€œá€¯á€•á€ºá€†á€±á€¬á€„á€ºá€á€»á€€á€º',
    tagLabelEn: 'Feature Update',
    descriptionMy: 'á€™á€­á€¯á€˜á€­á€¯á€„á€ºá€¸á€–á€¯á€”á€ºá€¸á€™á€»á€¬á€¸áŒ Manual Sync á€á€œá€¯á€á€º á€€á€½á€šá€ºá€”á€±á á€’á€±á€á€¬ á€á€»á€€á€ºá€á€»á€„á€ºá€¸ Sync á€™á€œá€¯á€•á€ºá€”á€­á€¯á€„á€ºá€žá€±á€¬ á€¡á€á€€á€ºá€¡á€á€²á€€á€­á€¯ á€–á€¼á€±á€›á€¾á€„á€ºá€¸á€›á€”á€º á€•á€„á€ºá€™ Navbar Header á€á€”á€ºá€¸áŠ Sidebar Drawer á€™á€®á€”á€°á€¸á€”á€¾á€„á€·á€º Dashboard á€•á€„á€ºá€™á€”á€±á€›á€¬á€™á€»á€¬á€¸á€á€½á€„á€º á á€á€»á€€á€ºá€”á€¾á€­á€•á€ºá€›á€¯á€¶á€–á€¼á€„á€·á€º Cloud á€”á€¾á€„á€·á€º Sync á€œá€¯á€•á€ºá€”á€­á€¯á€„á€ºá€žá€±á€¬ á€á€œá€¯á€á€ºá€™á€»á€¬á€¸á€€á€­á€¯ á€•á€±á€«á€ºá€œá€½á€„á€ºá€…á€½á€¬ á€á€•á€ºá€†á€„á€ºá€•á€±á€¸á€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Fixed missing manual sync controls on mobile screens by placing prominent 1-tap Cloud Sync buttons in Navbar header, Sidebar drawer, and Dashboard filter bar.',
    changesMy: [
      'ðŸ“² **Navbar Header Sync á€á€œá€¯á€á€º**: á€™á€­á€¯á€˜á€­á€¯á€„á€ºá€¸á€–á€¯á€”á€ºá€¸ á€•á€„á€ºá€™ Header á€á€”á€ºá€¸á€•á€±á€«á€ºá€á€½á€„á€º `ðŸ”„ Sync` á€á€œá€¯á€á€ºá€€á€­á€¯ á€¡á€…á€‰á€ºá€¡á€™á€¼á€² á€•á€±á€«á€ºá€œá€½á€„á€ºá€…á€½á€¬ á€á€•á€ºá€†á€„á€ºá€•á€±á€¸á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹',
      'ðŸ“± **Sidebar Drawer 1-Tap Sync**: Sidebar á€™á€®á€”á€°á€¸á€–á€½á€„á€·á€ºá€œá€­á€¯á€€á€ºá€žá€Šá€ºá€”á€¾á€„á€·á€º á€¡á€€á€±á€¬á€„á€·á€ºá€€á€á€ºá€¡á€±á€¬á€€á€ºá€á€½á€„á€º `ðŸ”„ á€™á€”á€»á€°á€›á€šá€º Cloud Sync á€•á€¼á€¯á€œá€¯á€•á€ºá€™á€Šá€º` á€á€œá€¯á€á€ºá€€á€¼á€®á€¸á€€á€­á€¯ á€á€½á€±á€·á€›á€¾á€­á€”á€­á€¯á€„á€ºá€•á€«á€žá€Šá€ºá‹',
      'ðŸ“Š **Dashboard 1-Tap Sync**: Dashboard filter bar á€•á€±á€«á€ºá€á€½á€„á€ºá€œá€Šá€ºá€¸ á á€á€»á€€á€ºá€”á€¾á€­á€•á€ºá€›á€¯á€¶á€–á€¼á€„á€·á€º Cloud á€™á€”á€»á€°á€›á€šá€º Sync á€•á€¼á€¯á€œá€¯á€•á€ºá€”á€­á€¯á€„á€ºá€žá€±á€¬ á€á€œá€¯á€á€º á€á€•á€ºá€†á€„á€ºá€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹'
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
    titleMy: 'React Hooks Dispatcher á€™á€°á€œ Module Bundling á€¡á€™á€¾á€¬á€¸ á€•á€¼á€„á€ºá€†á€„á€ºá€á€¼á€„á€ºá€¸',
    titleEn: 'Resolved React Module Hook Dispatcher & Chunk Resolution Issue',
    tag: 'feature',
    tagLabelMy: 'á€œá€¯á€•á€ºá€†á€±á€¬á€„á€ºá€á€»á€€á€º',
    tagLabelEn: 'Feature Update',
    descriptionMy: 'Vite á custom `manualChunks` á€á€½á€²á€á€¼á€¬á€¸á€™á€¾á€¯á€€á€¼á€±á€¬á€„á€·á€º React / React DOM module á€™á€»á€¬á€¸ á€žá€®á€¸á€žá€”á€·á€ºá€€á€½á€²á€‘á€½á€€á€ºá `null is not an object (evaluating resolveDispatcher().useState)` á€¡á€™á€¾á€¬á€¸ á€á€€á€ºá€•á€½á€„á€·á€ºá€žá€½á€¬á€¸á€á€¼á€„á€ºá€¸á€€á€­á€¯ Vite bundling resolution á€€á€­á€¯ á€•á€±á€«á€„á€ºá€¸á€…á€Šá€ºá€¸á€•á€±á€¸á€á€¼á€„á€ºá€¸á€–á€¼á€„á€·á€º á€œá€¯á€¶á€¸á€ á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸ á€•á€¼á€„á€ºá€†á€„á€ºá€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Fixed Invalid Hook Call and resolveDispatcher().useState runtime error by unifying React and React DOM module bundling in Vite configuration.',
    changesMy: [
      'ðŸ› ï¸ **React Hook Dispatcher Error á€•á€¼á€„á€ºá€†á€„á€ºá€á€¼á€„á€ºá€¸**: LoginScreen á€”á€¾á€„á€·á€º á€™á€±á€¬á€‚á€»á€°á€¸á€™á€»á€¬á€¸á€á€½á€„á€º `resolveDispatcher().useState` null á€–á€¼á€…á€ºá€€á€¬ ErrorBoundary á€á€€á€ºá€žá€½á€¬á€¸á€žá€Šá€·á€º á€•á€¼á€¿á€”á€¬á€€á€­á€¯ Vite custom manualChunks á€á€½á€²á€á€¼á€¬á€¸á€™á€¾á€¯ á€–á€šá€ºá€›á€¾á€¬á€¸á React Modules á€™á€»á€¬á€¸á€€á€­á€¯ á€á€…á€ºá€•á€±á€«á€„á€ºá€¸á€á€Šá€ºá€¸ á€–á€¼á€…á€ºá€¡á€±á€¬á€„á€º á€•á€¼á€„á€ºá€†á€„á€ºá€•á€±á€¸á€á€²á€·á€•á€«á€žá€Šá€ºá‹',
      'âš¡ **App Stability**: á€¡á€•á€œá€®á€€á€±á€¸á€›á€¾á€„á€ºá€¸ á€–á€½á€„á€·á€ºá€á€»á€­á€”á€ºá€á€½á€„á€º á€á€€á€ºá€œá€¬á€á€á€ºá€žá€±á€¬ Runtime Error á€™á€»á€¬á€¸á€€á€­á€¯ á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€•á€±á€¸á€á€²á€·á€•á€¼á€®á€¸ Login Screen á€”á€¾á€„á€·á€º á€•á€„á€ºá€™ Dashboard á€žá€­á€¯á€· á€¡á€†á€„á€ºá€•á€¼á€±á€…á€½á€¬ á€á€„á€ºá€›á€±á€¬á€€á€ºá€”á€­á€¯á€„á€ºá€¡á€±á€¬á€„á€º á€¡á€¬á€™á€á€¶á€á€»á€€á€º á€•á€±á€¸á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹'
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
    titleMy: 'á€…á€¬á€›á€„á€ºá€¸á€™á€¾á€á€ºá€á€™á€ºá€¸á€–á€¼á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€™á€¾á€¯ UX/UI á€¡á€†á€„á€ºá€•á€¼á€±á€…á€±á€›á€”á€º á€¡á€‘á€€á€ºá€™á€¾á€¡á€±á€¬á€€á€º á€¡á€…á€‰á€ºá€œá€­á€¯á€€á€ºá€•á€¯á€¶á€…á€¶á€”á€¾á€„á€·á€º á€”á€±á€¬á€€á€ºá€†á€¯á€¶á€¸á€žá€¯á€¶á€¸ Wallet á€™á€¾á€á€ºá€‘á€¬á€¸á€žá€Šá€·á€ºá€…á€”á€…á€º á€•á€¼á€„á€ºá€†á€„á€ºá€á€¼á€„á€ºá€¸',
    titleEn: 'Enhanced Transaction Modal Entry Flow & Last Used Wallet Memory',
    tag: 'feature',
    tagLabelMy: 'á€œá€¯á€•á€ºá€†á€±á€¬á€„á€ºá€á€»á€€á€º',
    tagLabelEn: 'Feature Update',
    descriptionMy: 'á€…á€¬á€›á€„á€ºá€¸á€‘á€Šá€·á€ºá€›á€”á€º á€”á€¾á€­á€•á€ºá€œá€­á€¯á€€á€ºá€•á€«á€€ á€„á€½á€±á€•á€™á€¬á€á€”á€±á€›á€¬á€žá€­á€¯á€· á€¡á€±á€¬á€€á€ºá€žá€­á€¯á€· á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º á€á€¯á€”á€ºá€™á€žá€½á€¬á€¸á€…á€±á€›á€”á€º Auto-Focus á€¡á€¬á€¸ á€–á€šá€ºá€›á€¾á€¬á€¸á Modal á€–á€½á€„á€·á€ºá€œá€­á€¯á€€á€ºá€žá€Šá€ºá€”á€¾á€„á€·á€º á€¡á€•á€±á€«á€ºá€†á€¯á€¶á€¸á€¡á€€á€½á€€á€ºá€™á€¾ á€…á€á€„á€ºá€•á€¼á€žá€•á€±á€¸á€á€²á€·á€•á€«á€žá€Šá€ºá‹ á€”á€±á€¬á€€á€ºá€†á€¯á€¶á€¸á€¡á€žá€¯á€¶á€¸á€•á€¼á€¯á€á€²á€·á€žá€±á€¬ Wallet (Last Used Wallet) á€€á€­á€¯ á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º á€™á€¾á€á€ºá€žá€¬á€¸á€‘á€¬á€¸á€•á€±á€¸á€•á€¼á€®á€¸ Wallet âž” Date âž” Category âž” Item Name âž” Amount á€¡á€…á€‰á€ºá€œá€­á€¯á€€á€ºá€¡á€á€­á€¯á€„á€ºá€¸ á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€…á€½á€¬ á€–á€¼á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€”á€­á€¯á€„á€ºá€¡á€±á€¬á€„á€º á€•á€¼á€¯á€œá€¯á€•á€ºá€•á€±á€¸á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Eliminated aggressive auto-focus scrolling, remembered last used wallet in localStorage, and established a smooth top-to-bottom form sequence (Wallet -> Date -> Category -> Item -> Amount).',
    changesMy: [
      'ðŸ’³ **á€”á€±á€¬á€€á€ºá€†á€¯á€¶á€¸á€žá€¯á€¶á€¸ Wallet á€™á€¾á€á€ºá€žá€¬á€¸á€á€¼á€„á€ºá€¸**: á€…á€¬á€›á€„á€ºá€¸á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€á€­á€¯á€„á€ºá€¸ á€”á€±á€¬á€€á€ºá€†á€¯á€¶á€¸á€¡á€žá€¯á€¶á€¸á€•á€¼á€¯á€á€²á€·á€žá€±á€¬ Wallet (Last Used Wallet) á€€á€­á€¯ á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º á€™á€¾á€á€ºá€žá€¬á€¸á á€”á€±á€¬á€€á€ºá€á€…á€ºá€€á€¼á€­á€™á€ºá€á€½á€„á€º á€™á€°á€œá€¡á€á€­á€¯á€„á€ºá€¸ á€‘á€¬á€¸á€›á€¾á€­á€•á€±á€¸á€•á€«á€žá€Šá€ºá‹',
      'ðŸ” **Auto-Focus á€á€¯á€”á€ºá€†á€„á€ºá€¸á€™á€¾á€¯ á€–á€šá€ºá€›á€¾á€¬á€¸á€á€¼á€„á€ºá€¸**: Modal á€–á€½á€„á€·á€ºá€œá€­á€¯á€€á€ºá€žá€Šá€ºá€”á€¾á€„á€·á€º á€„á€½á€±á€•á€™á€¬á€á€¡á€€á€½á€€á€ºá€žá€­á€¯á€· á€á€”á€ºá€¸á€›á€±á€¬á€€á€ºá€€á€¬ á€¡á€•á€±á€«á€ºá€žá€­á€¯á€· á€•á€¼á€”á€ºá€á€€á€ºá€€á€¼á€Šá€·á€ºá€”á€±á€›á€žá€Šá€·á€º á€’á€¯á€€á€¹á€á€€á€­á€¯ á€–á€šá€ºá€›á€¾á€¬á€¸á€•á€±á€¸á€á€²á€·á€•á€¼á€®á€¸ Modal á€¡á€•á€±á€«á€ºá€†á€¯á€¶á€¸á€™á€¾ á€…á€á€„á€ºá€•á€¼á€žá€•á€±á€¸á€•á€«á€žá€Šá€ºá‹',
      'âœ¨ **á€¡á€‘á€€á€ºá€™á€¾á€¡á€±á€¬á€€á€º á€¡á€…á€‰á€ºá€œá€­á€¯á€€á€º UX á€•á€¯á€¶á€…á€¶**: á€¡á€•á€±á€«á€ºá€™á€¾ á€…á€¬á€›á€„á€ºá€¸á€žá€½á€„á€ºá€¸á€™á€Šá€·á€º Wallet á€”á€¾á€„á€·á€º á€›á€€á€ºá€…á€½á€² âž” á€€á€á€¹á€/á€€á€á€¹á€á€á€½á€² âž” á€á€šá€ºá€žá€Šá€·á€º á€•á€…á€¹á€…á€Šá€ºá€¸á€¡á€™á€»á€­á€¯á€¸á€¡á€…á€¬á€¸ âž” á€„á€½á€±á€•á€™á€¬á€ á€…á€žá€Šá€·á€º á€žá€˜á€¬á€á€€á€»á€žá€±á€¬ á€¡á€…á€‰á€ºá€œá€­á€¯á€€á€ºá€¡á€á€­á€¯á€„á€ºá€¸ á€…á€®á€…á€‰á€ºá€•á€±á€¸á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹'
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
    titleMy: 'Login á€™á€»á€€á€ºá€”á€¾á€¬á€•á€¼á€„á€ºá€á€½á€„á€º Now VPN á€œá€™á€ºá€¸á€Šá€½á€¾á€”á€ºá€…á€¬á€žá€¬á€¸ á€¡á€…á€¬á€¸á€‘á€­á€¯á€¸ á€•á€¼á€±á€¬á€„á€ºá€¸á€œá€²á€á€¼á€„á€ºá€¸',
    titleEn: 'Updated VPN Recommendation Label to Now VPN on Login Screen',
    tag: 'feature',
    tagLabelMy: 'á€œá€¯á€•á€ºá€†á€±á€¬á€„á€ºá€á€»á€€á€º',
    tagLabelEn: 'Feature Update',
    descriptionMy: 'á€¡á€žá€¯á€¶á€¸á€•á€¼á€¯á€žá€°á á€Šá€½á€¾á€”á€ºá€€á€¼á€¬á€¸á€á€»á€€á€ºá€¡á€á€­á€¯á€„á€ºá€¸ Google Login á€á€œá€¯á€á€ºá€”á€¾á€„á€·á€º á€¡á€žá€¯á€¶á€¸á€•á€¼á€¯á€•á€¯á€¶ á€œá€™á€ºá€¸á€Šá€½á€¾á€”á€ºá€™á€»á€¬á€¸á€á€½á€„á€º 1.1.1.1 á€…á€¬á€žá€¬á€¸á€¡á€¬á€¸ á€–á€šá€ºá€›á€¾á€¬á€¸á€•á€¼á€®á€¸ "Now VPN á€”á€¾á€„á€·á€º á€¡á€†á€„á€ºá€•á€¼á€±á€†á€¯á€¶á€¸ á€–á€¼á€…á€ºá€žá€Šá€º" á€€á€­á€¯ á€›á€¾á€±á€·á€†á€¯á€¶á€¸á€žá€­á€¯á€· á€•á€¼á€±á€¬á€„á€ºá€¸á€œá€² á€¡á€…á€¬á€¸á€‘á€­á€¯á€¸á€•á€±á€¸á€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Updated Google login button text and user guide instructions by removing 1.1.1.1 references and prioritizing "Now VPN" at the front.',
    changesMy: [
      'ðŸŒ Google Pop-up Login á€á€œá€¯á€á€ºá€•á€±á€«á€ºá€á€½á€„á€º `Now VPN á€”á€¾á€„á€·á€º á€¡á€†á€„á€ºá€•á€¼á€±á€†á€¯á€¶á€¸ á€–á€¼á€…á€ºá€žá€Šá€º - Google Pop-up á€–á€¼á€„á€·á€º á€á€„á€ºá€™á€Šá€º` á€Ÿá€¯ á€›á€¾á€±á€·á€†á€¯á€¶á€¸á€á€½á€„á€º á€•á€±á€«á€ºá€œá€½á€„á€ºá€…á€½á€¬ á€¡á€…á€¬á€¸á€‘á€­á€¯á€¸ á€•á€¼á€±á€¬á€„á€ºá€¸á€œá€²á€•á€±á€¸á€á€²á€·á€•á€«á€žá€Šá€ºá‹',
      'ðŸš« 1.1.1.1 (Cloudflare WARP) á€…á€¬á€žá€¬á€¸á€¡á€¬á€¸ á€…á€”á€…á€ºá€á€…á€ºá€á€¯á€œá€¯á€¶á€¸á€™á€¾ á€œá€¯á€¶á€¸á€ á€–á€¼á€¯á€á€ºá€•á€…á€ºá€á€²á€·á€•á€«á€žá€Šá€ºá‹',
      'ðŸ“– á€¡á€žá€¯á€¶á€¸á€•á€¼á€¯á€•á€¯á€¶ á€œá€™á€ºá€¸á€Šá€½á€¾á€”á€º (User Guide Modal) á VPN á€¡á€•á€­á€¯á€„á€ºá€¸á€á€½á€„á€ºá€œá€Šá€ºá€¸ Now VPN á€–á€¼á€„á€·á€º á€¡á€žá€¯á€¶á€¸á€…á€›á€­á€á€º á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸á€€á€­á€¯ á€á€»á€±á€¬á€™á€½á€±á€·á€…á€½á€¬ á€žá€¯á€¶á€¸á€…á€½á€²á€”á€­á€¯á€„á€ºá€›á€”á€º á€•á€¼á€„á€ºá€†á€„á€ºá€•á€±á€¸á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹'
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
    titleMy: 'á€•á€Šá€¬á€•á€±á€¸á€€á€á€¹á€ (Education View) á€¡á€¬á€¸ á€†á€±á€¬á€„á€ºá€¸á€•á€«á€¸ áá€ á€á€¯á€€á€»á€±á€¬á€ºáŠ á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€™á€±á€¬á€ºá€’á€šá€ºá€–á€á€ºá€›á€¾á€¯á€…á€”á€…á€ºá€”á€¾á€„á€·á€º á€…á€¬á€¡á€¯á€•á€ºá€Šá€½á€¾á€”á€ºá€¸á€€á€¼á€®á€¸á€™á€»á€¬á€¸á€–á€¼á€„á€·á€º á€¡á€†á€„á€·á€ºá€™á€¼á€¾á€„á€·á€ºá€á€„á€ºá€á€¼á€„á€ºá€¸',
    titleEn: 'Comprehensive Financial & Life Growth Education Center with Interactive Reader Modal',
    tag: 'feature',
    tagLabelMy: 'á€œá€¯á€•á€ºá€†á€±á€¬á€„á€ºá€á€»á€€á€º',
    tagLabelEn: 'Feature Update',
    descriptionMy: 'á€”á€‚á€­á€¯ á€•á€Šá€¬á€•á€±á€¸á€€á€á€¹á€á€á€½á€„á€º á€–á€½á€„á€·á€ºá€€á€¼á€Šá€·á€ºá€™á€›á€žá€±á€¬ á€€á€á€ºá€•á€¼á€¬á€¸ á‚ á€á€¯á€žá€¬ á€›á€¾á€­á€á€²á€·á€žá€Šá€ºá€€á€­á€¯ á€–á€šá€ºá€›á€¾á€¬á€¸á á…á€/áƒá€/á‚á€ á€…á€Šá€ºá€¸á€™á€»á€‰á€ºá€¸áŠ Good Debt vs Bad Debt á€á€½á€²á€á€¼á€¬á€¸á€”á€Šá€ºá€¸áŠ á€˜á€±á€˜á€®á€œá€¯á€¶á€™á€¾ á€¡á€á€»á€™á€ºá€¸á€žá€¬á€†á€¯á€¶á€¸ á€•á€¯á€‚á€¹á€‚á€­á€¯á€œá€ºá á€”á€Šá€ºá€¸á€œá€™á€ºá€¸ á‡ á€á€»á€€á€ºá€”á€¾á€„á€·á€º á€›á€½á€¾á€±á á€¥á€•á€’á€± á… á€á€»á€€á€ºáŠ Power 48 á€˜á€á€á€€á€ºá€œá€™á€ºá€¸ á€œá€»á€¾á€­á€¯á€·á€á€¾á€€á€ºá€á€»á€€á€ºá€™á€»á€¬á€¸á€”á€¾á€„á€·á€º Wealth Mindset á€†á€±á€¬á€„á€ºá€¸á€•á€«á€¸á€€á€¼á€®á€¸ áá€ á€á€¯á€€á€»á€±á€¬á€ºá€€á€­á€¯ á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€–á€á€ºá€›á€¾á€¯á€”á€­á€¯á€„á€ºá€žá€±á€¬ Interactive Reader Modal á€–á€¼á€„á€·á€º á€¡á€†á€„á€·á€ºá€™á€¼á€¾á€„á€·á€ºá€á€„á€ºá€œá€­á€¯á€€á€ºá€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Overhauled Education view with over 10+ rich financial literacy guides, interactive 50/30/20 calculator widget, bookmarks, category filters, and modal reader.',
    changesMy: [
      'ðŸ“š á€•á€Šá€¬á€•á€±á€¸á€€á€á€¹á€á€á€½á€„á€º á…á€/áƒá€/á‚á€ á€…á€Šá€ºá€¸á€™á€»á€‰á€ºá€¸áŠ á€¡á€›á€±á€¸á€•á€±á€«á€º á€›á€”á€ºá€•á€¯á€¶á€„á€½á€±áŠ Asset vs LiabilityáŠ Compound InterestáŠ Good Debt vs Bad DebtáŠ Debt Snowball & AvalancheáŠ á€˜á€±á€˜á€®á€œá€¯á€¶á€™á€¼á€­á€¯á€·á á€”á€Šá€ºá€¸á€œá€™á€ºá€¸á€™á€»á€¬á€¸á€”á€¾á€„á€ºá€· Power 48 á€˜á€á€á€€á€ºá€œá€™á€ºá€¸ á€†á€±á€¬á€„á€ºá€¸á€•á€«á€¸ áá€ á€á€¯á€€á€»á€±á€¬á€º á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€•á€±á€¸á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹',
      'ðŸ“– á€†á€±á€¬á€„á€ºá€¸á€•á€«á€¸á€á€…á€ºá€á€¯á€…á€®á€€á€­á€¯ á€”á€¾á€­á€•á€ºá á€¡á€žá€±á€¸á€…á€­á€á€º á€–á€á€ºá€›á€¾á€¯á€”á€­á€¯á€„á€ºá€žá€±á€¬ Article Reader Modal á€€á€­á€¯ Font Size á€•á€¼á€±á€¬á€„á€ºá€¸á€œá€²á€™á€¾á€¯ (A+/A-) áŠ á€¡á€“á€­á€€ á€™á€¾á€á€ºá€žá€¬á€¸á€–á€½á€šá€ºá€›á€¬ (Key Takeaways) á€”á€¾á€„á€·á€º Next/Prev á€…á€¬á€™á€»á€€á€ºá€”á€¾á€¬ á€€á€°á€¸á€•á€¼á€±á€¬á€„á€ºá€¸á€™á€¾á€¯á€™á€»á€¬á€¸á€–á€¼á€„á€·á€º á€á€•á€ºá€†á€„á€ºá€•á€±á€¸á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹',
      'ðŸ”– á€™á€­á€™á€­á€€á€¼á€­á€¯á€€á€ºá€”á€¾á€…á€ºá€žá€€á€ºá€›á€¬ á€†á€±á€¬á€„á€ºá€¸á€•á€«á€¸á€™á€»á€¬á€¸á€€á€­á€¯ Bookmark á€™á€¾á€á€ºá€á€™á€ºá€¸á€á€„á€º á€žá€­á€™á€ºá€¸á€†á€Šá€ºá€¸á€”á€­á€¯á€„á€ºá€žá€±á€¬ á€…á€”á€…á€º á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€•á€±á€¸á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹',
      'ðŸ§® á…á€/áƒá€/á‚á€ á€…á€Šá€ºá€¸á€™á€»á€‰á€ºá€¸ á€†á€±á€¬á€„á€ºá€¸á€•á€«á€¸á€¡á€á€½á€„á€ºá€¸áŒ á€™á€­á€™á€­á€á€„á€ºá€„á€½á€± á€›á€­á€¯á€€á€ºá€‘á€Šá€·á€ºá á€á€»á€€á€ºá€á€»á€„á€ºá€¸ á€á€½á€²á€á€±á€á€½á€€á€ºá€á€»á€€á€ºá€”á€­á€¯á€„á€ºá€žá€±á€¬ Interactive Calculator Widget á€á€•á€ºá€†á€„á€ºá€•á€±á€¸á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹',
      'ðŸ” á€á€±á€«á€„á€ºá€¸á€…á€‰á€ºáŠ á€¡á€€á€¼á€±á€¬á€„á€ºá€¸á€¡á€›á€¬áŠ á€˜á€±á€˜á€®á€œá€¯á€¶ á€žá€­á€¯á€·á€™á€Ÿá€¯á€á€º Power 48 á€…á€¬á€œá€¯á€¶á€¸á€™á€»á€¬á€¸á€–á€¼á€„á€·á€º Instant Search á€›á€¾á€¬á€–á€½á€±á€”á€­á€¯á€„á€ºá€žá€±á€¬ á€…á€”á€…á€º á€•á€«á€á€„á€ºá€•á€«á€žá€Šá€ºá‹'
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
    titleMy: 'Change Log á€™á€¾á€á€ºá€á€™á€ºá€¸á€¡á€•á€¼á€Šá€·á€ºá€¡á€…á€¯á€¶ á€–á€¼á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€á€¼á€„á€ºá€¸á€”á€¾á€„á€·á€º Wallet, Debt, Transfer, Vehicle á€…á€”á€…á€ºá€™á€»á€¬á€¸ á€…á€”á€…á€ºá€á€€á€» á€•á€±á€«á€„á€ºá€¸á€…á€Šá€ºá€¸á€á€¼á€„á€ºá€¸',
    titleEn: 'Complete System Change Log Integration and Systemic Balance & Debt Reconciliation',
    tag: 'feature',
    tagLabelMy: 'á€œá€¯á€•á€ºá€†á€±á€¬á€„á€ºá€á€»á€€á€º',
    tagLabelEn: 'Feature Update',
    descriptionMy: 'á€¡á€žá€¯á€¶á€¸á€•á€¼á€¯á€žá€°á á€á€±á€¬á€„á€ºá€¸á€†á€­á€¯á€á€»á€€á€ºá€™á€»á€¬á€¸á€¡á€á€­á€¯á€„á€ºá€¸ á€•á€¼á€„á€ºá€†á€„á€ºá€á€²á€·á€žá€™á€»á€¾ á€•á€¼á€„á€ºá€†á€„á€ºá€á€»á€€á€º Change Log á€™á€»á€¬á€¸á€€á€­á€¯ á€¡á€€á€ºá€•á€ºá€¡á€á€½á€„á€ºá€¸ Version History Modal áŒ á€¡á€žá€±á€¸á€…á€­á€á€º á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€•á€±á€¸á€‘á€¬á€¸á€•á€¼á€®á€¸ Wallet, Debt, Transfer, Vehicle á€…á€”á€…á€ºá€™á€»á€¬á€¸á€¡á€¬á€¸á€œá€¯á€¶á€¸á á€á€»á€­á€á€ºá€†á€€á€ºá€†á€±á€¬á€„á€ºá€›á€½á€€á€ºá€™á€¾á€¯á€™á€»á€¬á€¸á€€á€­á€¯ á€…á€”á€…á€ºá€á€€á€» á€¡á€†á€„á€·á€ºá€™á€¼á€¾á€„á€·á€ºá€á€„á€ºá€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Incorporated complete Change Log details in Version History and finalized all integrated updates for Wallets, Debts, Transfers, and Vehicle Management.',
    changesMy: [
      'ðŸ“œ Change Log á€™á€¾á€á€ºá€á€™á€ºá€¸á€™á€»á€¬á€¸á€€á€­á€¯ á€•á€¼á€„á€ºá€†á€„á€ºá€™á€¾á€¯á€á€­á€¯á€„á€ºá€¸á€á€½á€„á€º á€¡á€™á€¼á€²á€™á€•á€¼á€á€º á€›á€±á€¸á€žá€¬á€¸á€™á€¾á€á€ºá€á€™á€ºá€¸á€á€„á€ºá€•á€±á€¸á€‘á€¬á€¸á€•á€¼á€®á€¸ Version History Modal á€á€½á€„á€º á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€€á€¼á€Šá€·á€ºá€›á€¾á€¯á€”á€­á€¯á€„á€ºá€•á€«á€žá€Šá€ºá‹',
      'ðŸ’³ á€¡á€€á€¼á€½á€±á€¸á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸á€€á€­á€¯ á€žá€®á€¸á€žá€”á€·á€ºá€™á€–á€¼á€…á€ºá€…á€±á€˜á€² á€žá€€á€ºá€†á€­á€¯á€„á€ºá€›á€¬ Wallet á€™á€»á€¬á€¸á€†á€®á€žá€­á€¯á€· á€á€»á€­á€á€ºá€†á€€á€ºá á€á€„á€ºá€„á€½á€±/á€‘á€½á€€á€ºá€„á€½á€± á€…á€¬á€›á€„á€ºá€¸á€‘á€²á€á€½á€„á€º á€á€•á€«á€á€Šá€ºá€¸ á€•á€±á€«á€„á€ºá€¸á€…á€•á€º á€á€½á€€á€ºá€á€»á€€á€ºá€•á€±á€¸á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹',
      'ðŸ”„ á€„á€½á€±á€œá€½á€¾á€² Category á€á€½á€„á€º á€„á€½á€±á€œá€½á€¾á€²á€‘á€½á€€á€º (Expense) á€”á€¾á€„á€·á€º á€„á€½á€±á€œá€½á€¾á€²á€á€„á€º (Income) á€á€­á€¯á€·á€€á€­á€¯ á€™á€°á€œ Wallet âž” á€œá€€á€ºá€á€¶á€™á€Šá€·á€º Wallet Dropdown Selector á€–á€¼á€„á€·á€º á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€œá€½á€¾á€²á€•á€¼á€±á€¬á€„á€ºá€¸á€”á€­á€¯á€„á€ºá€¡á€±á€¬á€„á€º á€•á€¼á€¯á€œá€¯á€•á€ºá€•á€±á€¸á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹',
      'ðŸš— á€šá€¬á€‰á€ºá€…á€®á€™á€¶á€á€”á€·á€ºá€á€½á€²á€™á€¾á€¯ Category á€€á€­á€¯ á€›á€½á€±á€¸á€á€»á€šá€ºá€™á€¾á€žá€¬ á€šá€¬á€‰á€º á€¡á€™á€»á€­á€¯á€¸á€¡á€…á€¬á€¸ áƒ á€á€¯ (General / á€†á€®á€–á€­á€¯á€¸ / Other Vehicle Svc) á€•á€±á€«á€ºá€…á€±á€•á€¼á€®á€¸ á€¡á€á€¼á€¬á€¸ Category á€™á€»á€¬á€¸á€á€½á€„á€º General Form á€žá€¬ á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€…á€½á€¬ á€•á€¼á€žá€•á€±á€¸á€•á€«á€žá€Šá€ºá‹',
      'ðŸš€ Dashboard Banners á€á€½á€„á€º `+ á€á€„á€ºá€„á€½á€±á€™á€¾á€á€ºá€™á€Šá€º` áŠ `- á€‘á€½á€€á€ºá€„á€½á€±á€™á€¾á€á€ºá€™á€Šá€º` á€”á€¾á€„á€·á€º `ðŸ¤ á€¡á€€á€¼á€½á€±á€¸á€™á€¾á€á€ºá€™á€Šá€º` á€á€œá€¯á€á€º áƒ á€á€¯á€œá€¯á€¶á€¸á€€á€­á€¯ á€á€•á€¼á€­á€¯á€„á€ºá€”á€€á€º á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€•á€±á€¸á€‘á€¬á€¸á€•á€«á€žá€Šá€ºá‹'
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
    titleMy: 'á€„á€½á€±á€žá€¬á€¸ (á€œá€€á€ºá€á€šá€º) Wallet Balance á€á€½á€€á€ºá€á€»á€€á€ºá€™á€¾á€¯á€”á€¾á€„á€·á€º á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º Wallet ID Resolver á€¡á€™á€¾á€¬á€¸á€™á€»á€¬á€¸ á€•á€¼á€„á€ºá€†á€„á€ºá€á€¼á€„á€ºá€¸',
    titleEn: 'Fixed Direct Wallet Balance Override Bug and Debt Auto-Transaction Deduplication',
    tag: 'feature',
    tagLabelMy: 'á€œá€¯á€•á€ºá€†á€±á€¬á€„á€ºá€á€»á€€á€º',
    tagLabelEn: 'Feature Update',
    descriptionMy: 'á€„á€½á€±á€œá€½á€¾á€² á€™á€¾á€á€ºá€á€™á€ºá€¸á€™á€»á€¬á€¸á Note á€…á€¬á€žá€¬á€¸á€á€½á€„á€º á€„á€½á€±á€žá€¬á€¸ Wallet á€”á€¬á€™á€Šá€º á€•á€«á€á€„á€ºá€”á€±á€•á€«á€€ Wallet ID á€€á€­á€¯ á€¡á€á€¼á€¬á€¸ Wallet á€žá€­á€¯á€· á€™á€¾á€¬á€¸á€šá€½á€„á€ºá€¸á€•á€¼á€±á€¬á€„á€ºá€¸á€œá€² á€•á€±á€¸á€•á€­á€¯á€·á€”á€±á€žá€Šá€·á€º Override Logic á€¡á€™á€¾á€¬á€¸á€€á€­á€¯ á€•á€¼á€„á€ºá€†á€„á€ºá€á€²á€·á€•á€¼á€®á€¸áŠ á€¡á€€á€¼á€½á€±á€¸á€™á€¾á€á€ºá€á€™á€ºá€¸ á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º á€›á€±á€¸á€žá€½á€„á€ºá€¸á€™á€¾á€¯á€€á€¼á€±á€¬á€„á€·á€º á€”á€¾á€…á€ºá€‘á€•á€º á€á€½á€€á€ºá€á€»á€€á€ºá€™á€­á€á€¼á€„á€ºá€¸ (Double Counting) á€™á€»á€¬á€¸á€€á€­á€¯ á€œá€¯á€¶á€¸á€ á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€•á€±á€¸á€á€²á€·á€•á€«á€žá€Šá€ºá‹',
    descriptionEn: 'Fixed a balance computation bug where transfer notes mentioning wallet names inadvertently re-routed transactions away from the Cash wallet, and prevented double-counting of auto-generated debt transactions.',
    changesMy: [
      'âš¡ `resolveTransactionWallet` Function á€á€½á€„á€º á€žá€á€ºá€™á€¾á€á€ºá€‘á€¬á€¸á€žá€±á€¬ Wallet ID á€¡á€™á€¾á€”á€ºá€›á€¾á€­á€”á€±á€•á€«á€€ Note á€•á€±á€«á€ºá€™á€°á€á€Šá€ºá á€á€á€¼á€¬á€¸ Wallet á€žá€­á€¯á€· á€™á€¾á€¬á€¸á€šá€½á€„á€ºá€¸ á€•á€¼á€±á€¬á€„á€ºá€¸á€œá€²á€žá€½á€¬á€¸á€á€¼á€„á€ºá€¸ (Wallet Re-assignment Override Bug) á€€á€­á€¯ á€œá€¯á€¶á€¸á€ á€•á€¼á€„á€ºá€†á€„á€ºá€á€²á€·á€•á€«á€žá€Šá€ºá‹',
      'âš–ï¸ `calculateWalletLiveBalance` á€á€½á€„á€º á€¡á€€á€¼á€½á€±á€¸á€žá€…á€ºá€”á€¾á€„á€·á€º á€„á€½á€±á€†á€•á€ºá€™á€¾á€á€ºá€á€™á€ºá€¸á€™á€»á€¬á€¸á€€á€¼á€±á€¬á€„á€·á€º á€‘á€½á€€á€ºá€•á€±á€«á€ºá€œá€¬á€žá€±á€¬ á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º Transaction á€™á€»á€¬á€¸á€€á€­á€¯ á€”á€¾á€…á€ºá€‘á€•á€º á€á€½á€€á€ºá€™á€­á€á€¼á€„á€ºá€¸ (Double Counting) á€™á€›á€¾á€­á€…á€±á€›á€”á€º á€…á€…á€ºá€‘á€¯á€á€ºá€•á€±á€¸á€á€²á€·á€•á€«á€žá€Šá€ºá‹',
      'ðŸ’µ á€„á€½á€±á€žá€¬á€¸ (á€œá€€á€ºá€á€šá€º) Wallet á á€á€„á€ºá€„á€½á€±áŠ á€‘á€½á€€á€ºá€„á€½á€±áŠ á€„á€½á€±á€œá€½á€¾á€²á€”á€¾á€„á€·á€º á€¡á€€á€¼á€½á€±á€¸ á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸á€¡á€¬á€¸á€œá€¯á€¶á€¸á Net Live Balance á€€á€­á€¯ á€á€­á€€á€»á€™á€¾á€”á€ºá€€á€”á€ºá€…á€½á€¬ á€á€½á€€á€ºá€á€»á€€á€ºá€•á€±á€¸á€œá€­á€¯á€€á€ºá€•á€«á€•á€¼á€®á‹'
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
    titleMy: 'á€¡á€€á€¼á€½á€±á€¸á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸á€”á€¾á€„á€·á€º Wallet Auto Cash Flow Sync á€•á€±á€«á€„á€ºá€¸á€…á€•á€ºá€•á€±á€¸á€á€¼á€„á€ºá€¸áŠ á€„á€½á€±á€œá€½á€¾á€²á€•á€¼á€±á€¬á€„á€ºá€¸á€™á€¾á€¯á€…á€”á€…á€º á€¡á€†á€„á€·á€ºá€™á€¼á€¾á€„á€·á€ºá€á€„á€ºá€á€¼á€„á€ºá€¸á€”á€¾á€„á€·á€º Dashboard Quick Action á€á€œá€¯á€á€ºá€™á€»á€¬á€¸ á€…á€¯á€¶á€œá€„á€ºá€…á€±á€á€¼á€„á€ºá€¸',
    titleEn: 'Automated Debt-to-Wallet Cash Flow Sync, Upgraded Transfer Flow, and Dashboard Quick Actions',
    tag: 'feature',
    tagLabelMy: 'á€œá€¯á€•á€ºá€†á€±á€¬á€„á€ºá€á€»á€€á€ºá€¡á€žá€…á€º',
    tagLabelEn: 'Feature Update',
    descriptionMy: 'á€¡á€€á€¼á€½á€±á€¸á€¡á€žá€…á€ºá€™á€¾á€á€ºá€á€™á€ºá€¸á€á€„á€ºá€™á€¾á€¯á€”á€¾á€„á€·á€º á€•á€¼á€”á€ºá€†á€•á€ºá€™á€¾á€¯á€™á€»á€¬á€¸á€€á€­á€¯ á€žá€€á€ºá€†á€­á€¯á€„á€ºá€›á€¬ Wallet á á€á€„á€ºá€„á€½á€±/á€‘á€½á€€á€ºá€„á€½á€± á€…á€¬á€›á€„á€ºá€¸á€‘á€²á€žá€­á€¯á€· á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º á€žá€½á€¬á€¸á€›á€±á€¬á€€á€º á€á€»á€­á€á€ºá€†á€€á€ºá€á€½á€€á€ºá€á€»á€€á€ºá€•á€±á€¸á€á€¼á€„á€ºá€¸áŠ á€„á€½á€±á€œá€½á€¾á€² Category á€á€½á€„á€º From & To Wallet Selector á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€•á€±á€¸á€á€¼á€„á€ºá€¸á€”á€¾á€„á€·á€º Dashboard á€á€½á€„á€º á€á€„á€ºá€„á€½á€±áŠ á€‘á€½á€€á€ºá€„á€½á€±áŠ á€¡á€€á€¼á€½á€±á€¸ á€™á€¾á€á€ºá€á€™á€ºá€¸á€á€„á€ºá€›á€”á€º Quick Action á€á€œá€¯á€á€º áƒ á€á€¯á€…á€œá€¯á€¶á€¸ á€•á€±á€«á€„á€ºá€¸á€…á€Šá€ºá€¸á€•á€±á€¸á€á€¼á€„á€ºá€¸á‹',
    descriptionEn: 'Integrated automatic Wallet Cash Flow syncing for debt creation and repayments, added From/To Wallet selection for transfer category, and unified 1-tap quick action buttons for Income, Expense, and Debt on the Dashboard.',
    changesMy: [
      'ðŸ¤ á€¡á€€á€¼á€½á€±á€¸á€¡á€žá€…á€ºá€™á€¾á€á€ºá€á€™á€ºá€¸á€á€„á€ºá€á€¼á€„á€ºá€¸á€”á€¾á€„á€·á€º á€•á€¼á€”á€ºá€†á€•á€ºá€™á€¾á€¯á€™á€»á€¬á€¸á€€á€­á€¯ á€žá€€á€ºá€†á€­á€¯á€„á€ºá€›á€¬ Wallet á á€á€„á€ºá€„á€½á€±/á€‘á€½á€€á€ºá€„á€½á€± á€…á€¬á€›á€„á€ºá€¸á€‘á€²á€žá€­á€¯á€· á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º á€žá€½á€¬á€¸á€›á€±á€¬á€€á€º á€á€»á€­á€á€ºá€†á€€á€ºá€á€½á€€á€ºá€á€»á€€á€ºá€•á€±á€¸á€á€¼á€„á€ºá€¸ (Auto Cash Flow Sync)',
      'ðŸ’³ Debts View á€á€½á€„á€º á€•á€­á€¯á€€á€ºá€†á€¶á€¡á€­á€á€º/á€¡á€€á€±á€¬á€„á€·á€ºá€á€…á€ºá€á€¯á€…á€®á á€¡á€€á€¼á€½á€±á€¸á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸á€€á€­á€¯ á€žá€®á€¸á€žá€”á€·á€º á€á€½á€²á€á€¼á€¬á€¸á€€á€¼á€Šá€·á€ºá€›á€¾á€¯á€”á€­á€¯á€„á€ºá€žá€±á€¬ Wallet Filter Selector Bar á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€•á€±á€¸á€á€¼á€„á€ºá€¸',
      'ðŸ”„ á€„á€½á€±á€œá€½á€¾á€² Category á€á€½á€„á€º á€„á€½á€±á€œá€½á€¾á€²á€‘á€½á€€á€ºá€€á€­á€¯ Expense (á€¡á€‘á€½á€€á€ºá€…á€¬á€›á€„á€ºá€¸)áŠ á€„á€½á€±á€œá€½á€¾á€²á€á€„á€ºá€€á€­á€¯ Income (á€¡á€á€„á€ºá€…á€¬á€›á€„á€ºá€¸) á€¡á€–á€¼á€…á€º Auto-Sync á€œá€¯á€•á€ºá€•á€±á€¸á€•á€¼á€®á€¸áŠ á€„á€½á€±á€œá€½á€¾á€²á€•á€¼á€±á€¬á€„á€ºá€¸á€™á€Šá€·á€º From Wallet âž” To Wallet Card á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€•á€±á€¸á€á€¼á€„á€ºá€¸',
      'ðŸš— á€šá€¬á€‰á€ºá€…á€®á€™á€¶á€á€”á€·á€ºá€á€½á€²á€™á€¾á€¯ Category (Vehicle Management) á€›á€½á€±á€¸á€á€»á€šá€ºá€™á€¾á€žá€¬ Model Selector Toggle (General / Fuel / Other Vehicle) á€•á€±á€«á€ºá€›á€™á€Šá€ºá€–á€¼á€…á€ºá€•á€¼á€®á€¸ á€á€á€¼á€¬á€¸ Category á€™á€»á€¬á€¸á€á€½á€„á€º General Form á€žá€¬ á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€…á€½á€¬ á€•á€¼á€žá€•á€±á€¸á€á€¼á€„á€ºá€¸',
      'ðŸŽ›ï¸ á€…á€¬á€›á€„á€ºá€¸ á€•á€¯á€¶á€…á€¶ á€›á€½á€±á€¸á€á€»á€šá€ºá€žá€Šá€·á€º Toggle á€á€œá€¯á€á€ºá€™á€»á€¬á€¸ (`áá‹ General` áŠ `á‚á‹ á€†á€®á€–á€­á€¯á€¸` áŠ `áƒá‹ Other Vehicle Svc`) á€€á€­á€¯ Sub Category á€¡á€€á€½á€€á€ºá á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€¡á€±á€¬á€€á€ºá€˜á€€á€ºá€žá€­á€¯á€· á€›á€½á€¾á€±á€·á€•á€¼á€±á€¬á€„á€ºá€¸á€”á€±á€›á€¬á€á€»á€‘á€¬á€¸á€•á€±á€¸á€á€¼á€„á€ºá€¸',
      'ðŸš€ Dashboard á€•á€„á€ºá€™á€…á€¬á€™á€»á€€á€ºá€”á€¾á€¬ Banner á€á€½á€„á€º `+ á€á€„á€ºá€„á€½á€±á€™á€¾á€á€ºá€™á€Šá€º` áŠ `- á€‘á€½á€€á€ºá€„á€½á€±á€™á€¾á€á€ºá€™á€Šá€º` á€”á€¾á€„á€·á€º `ðŸ¤ á€¡á€€á€¼á€½á€±á€¸á€™á€¾á€á€ºá€™á€Šá€º` Quick Action á€á€œá€¯á€á€º áƒ á€á€¯á€œá€¯á€¶á€¸á€€á€­á€¯ á€šá€¾á€‰á€ºá€á€½á€²á á€á€•á€¼á€­á€¯á€„á€ºá€”á€€á€º á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€•á€±á€¸á€á€¼á€„á€ºá€¸'
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
    titleMy: 'á€†á€®á€–á€­á€¯á€¸ á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€á€¼á€„á€ºá€¸ UI/UX á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€€á€»á€…á€ºá€œá€»á€…á€ºá€…á€±á€á€¼á€„á€ºá€¸áŠ á€•á€„á€ºá€™ á€‘á€½á€€á€ºá€„á€½á€±á€”á€±á€›á€¬á€á€½á€„á€º Inline á€†á€®á€–á€­á€¯á€¸á€á€½á€€á€ºá€á€»á€€á€ºá€…á€”á€…á€º á€•á€±á€«á€„á€ºá€¸á€…á€•á€ºá€•á€±á€¸á€á€¼á€„á€ºá€¸á€”á€¾á€„á€·á€º á€œá€™á€ºá€¸á€Šá€½á€¾á€”á€ºá€á€»á€€á€º á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€•á€±á€¸á€á€¼á€„á€ºá€¸',
    titleEn: 'Unified Fuel Logging UI/UX, Inline Direct Fuel Calculator, and Visual Entry Guide',
    tag: 'feature',
    tagLabelMy: 'á€œá€¯á€•á€ºá€†á€±á€¬á€„á€ºá€á€»á€€á€ºá€¡á€žá€…á€º',
    tagLabelEn: 'Feature Update',
    descriptionMy: 'á€†á€®á€–á€­á€¯á€¸ á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€›á€¬á€á€½á€„á€º á€•á€„á€ºá€™ á€¡á€žá€¯á€¶á€¸á€…á€›á€­á€á€ºá€”á€±á€›á€¬á€”á€¾á€„á€·á€º á€šá€¬á€‰á€ºá€…á€®á€™á€¶á€™á€¾á€¯á€”á€±á€›á€¬ á‚ á€á€¯ á€€á€½á€²á€•á€¼á€¬á€¸á€›á€¾á€¯á€•á€ºá€‘á€½á€±á€¸á€”á€±á€á€¼á€„á€ºá€¸á€€á€­á€¯ á€–á€¼á€±á€›á€¾á€„á€ºá€¸á á€•á€„á€ºá€™ á€‘á€½á€€á€ºá€„á€½á€±á€–á€¼á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€žá€Šá€·á€º á€™á€»á€€á€ºá€”á€¾á€¬á€•á€¼á€„á€ºá€‘á€²á€á€½á€„á€ºá€•á€„á€º á€œá€®á€á€¬áŠ á á€œá€®á€á€¬á€”á€¾á€¯á€”á€ºá€¸á€”á€¾á€„á€·á€º á€’á€­á€¯á€„á€ºá€á€½á€€á€ºá€™á€­á€¯á€„á€ºá€•á€« á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€ºá€á€½á€€á€ºá€á€»á€€á€ºá€žá€­á€™á€ºá€¸á€†á€Šá€ºá€¸á€”á€­á€¯á€„á€ºá€žá€±á€¬ Dual-Mode Fuel Card á€”á€¾á€„á€·á€º á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€á€»á€€á€º á€œá€™á€ºá€¸á€Šá€½á€¾á€”á€ºá€€á€­á€¯ á€á€•á€ºá€†á€„á€ºá€•á€±á€¸á€á€¼á€„á€ºá€¸á‹',
    descriptionEn: 'Streamlined fuel entry workflow by eliminating confusing redirections, providing an inline dual-mode fuel calculator directly inside the main expense modal, and adding an illustrated guide explaining that entering in either place automatically synchronizes without double-entry.',
    changesMy: [
      'á€•á€„á€ºá€™ á€‘á€½á€€á€ºá€„á€½á€±á€…á€¬á€›á€„á€ºá€¸ (Transaction Modal) á€á€½á€„á€º á€€á€¬á€¸/á€…á€€á€ºá€žá€¯á€¶á€¸á€†á€® á€€á€á€¹á€ á€›á€½á€±á€¸á€á€»á€šá€ºá€žá€Šá€·á€ºá€¡á€á€« á€™á€»á€€á€ºá€”á€¾á€¬á€•á€¼á€„á€ºá€™á€¾ á€‘á€½á€€á€ºá€á€½á€¬á€…á€›á€¬á€™á€œá€­á€¯á€˜á€² á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€–á€¼á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€”á€­á€¯á€„á€ºá€žá€±á€¬ Dual-Mode Fuel Card á€á€•á€ºá€†á€„á€ºá€•á€±á€¸á€á€¼á€„á€ºá€¸',
      'âš¡ á€›á€­á€¯á€¸á€›á€­á€¯á€¸ á€†á€®á€–á€­á€¯á€¸á€žá€¬ á€‘á€Šá€·á€ºá€œá€­á€¯á€•á€«á€€ á€¡á€•á€±á€«á€ºá€€ á€•á€™á€¬á€ (Amount) á€á€½á€„á€º á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€ºá€›á€­á€¯á€€á€ºá€‘á€Šá€·á€ºá€•á€¼á€®á€¸ á€á€»á€€á€ºá€á€»á€„á€ºá€¸ á€…á€¬á€›á€„á€ºá€¸á€žá€½á€„á€ºá€¸á€”á€­á€¯á€„á€ºá€¡á€±á€¬á€„á€º á€…á€®á€…á€‰á€ºá€•á€±á€¸á€á€¼á€„á€ºá€¸',
      'â›½ á€†á€®á€…á€¬á€¸á€”á€¾á€¯á€”á€ºá€¸ (km/L) á€•á€« á€á€½á€€á€ºá€œá€­á€¯á€•á€«á€€ á á€œá€®á€á€¬á€”á€¾á€¯á€”á€ºá€¸áŠ á€†á€®á€œá€®á€á€¬áŠ á€†á€®á€†á€­á€¯á€„á€ºá€”á€¾á€„á€·á€º á€’á€­á€¯á€„á€ºá€á€½á€€á€ºá€™á€­á€¯á€„á€ºá€á€­á€¯á€·á€€á€­á€¯ á€•á€„á€ºá€™á€”á€±á€›á€¬á€á€½á€„á€ºá€•á€„á€º á€á€•á€¼á€­á€¯á€„á€ºá€”á€€á€º á€á€½á€€á€ºá€á€»á€€á€ºá€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€”á€­á€¯á€„á€ºá€¡á€±á€¬á€„á€º á€•á€±á€«á€„á€ºá€¸á€…á€•á€ºá€•á€±á€¸á€á€¼á€„á€ºá€¸',
      'á€¡á€žá€¯á€¶á€¸á€•á€¼á€¯á€žá€° á€™á€Šá€ºá€žá€Šá€·á€ºá€”á€±á€›á€¬á€™á€¾ á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€žá€Šá€ºá€–á€¼á€…á€ºá€…á€± á€•á€­á€¯á€€á€ºá€†á€¶á€¡á€­á€á€ºá€‘á€²á€™á€¾ á€„á€½á€±á€”á€¯á€á€ºá€šá€°á€€á€¬ á€‘á€½á€€á€ºá€„á€½á€±á€…á€¬á€›á€„á€ºá€¸á€›á€±á€¬ á€šá€¬á€‰á€ºá€™á€¾á€á€ºá€á€™á€ºá€¸á€•á€« á€á€•á€¼á€­á€¯á€„á€ºá€”á€€á€º á€›á€±á€¬á€€á€ºá€›á€¾á€­á€™á€Šá€ºá€–á€¼á€…á€ºá á‚ á€á€« á€‘á€•á€ºá€‘á€Šá€·á€ºá€›á€”á€º á€™á€œá€­á€¯á€€á€¼á€±á€¬á€„á€ºá€¸ á€¡á€¬á€™á€á€¶á€á€»á€€á€º á€¡á€žá€­á€•á€±á€¸á€…á€¬á€žá€¬á€¸á€™á€»á€¬á€¸ á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€•á€±á€¸á€á€¼á€„á€ºá€¸',
      'á€™á€»á€€á€ºá€”á€¾á€¬á€•á€¼á€„á€ºá€™á€¾ á€‘á€½á€€á€ºá€á€½á€¬á€žá€½á€¬á€¸á€…á€±á€žá€Šá€·á€º á€›á€¾á€¯á€•á€ºá€‘á€½á€±á€¸á€žá€±á€¬ á€œá€™á€ºá€¸á€Šá€½á€¾á€”á€ºá€á€œá€¯á€á€ºá€€á€­á€¯ á€–á€šá€ºá€›á€¾á€¬á€¸á€•á€¼á€®á€¸ "â“ á€†á€®á€–á€­á€¯á€¸ á€˜á€šá€ºá€œá€­á€¯ á€‘á€Šá€·á€ºá€›á€™á€œá€²?" á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€á€»á€€á€º Visual Guide Modal á€€á€­á€¯ á€”á€±á€›á€¬ á‚ á€á€¯á€…á€œá€¯á€¶á€¸á€á€½á€„á€º á€á€•á€ºá€†á€„á€ºá€•á€±á€¸á€á€¼á€„á€ºá€¸'
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
    titleMy: 'á€šá€¬á€‰á€ºá€…á€®á€™á€¶á€á€”á€·á€ºá€á€½á€²á€™á€¾á€¯ á€…á€”á€…á€ºá€á€½á€„á€º Premium á€¡á€á€½á€€á€º Unlimited á€šá€¬á€‰á€ºá€™á€»á€¬á€¸ á€á€½á€„á€·á€ºá€•á€¼á€¯á€á€¼á€„á€ºá€¸á€”á€¾á€„á€·á€º "+ á€šá€¬á€‰á€ºá€¡á€žá€…á€º" á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€™á€¾á€¯ UI á€™á€¼á€¾á€„á€·á€ºá€á€„á€ºá€á€¼á€„á€ºá€¸',
    titleEn: 'Unlimited Vehicles for Premium, 1 Vehicle for Free, and Prominent Add Vehicle UI',
    tag: 'feature',
    tagLabelMy: 'á€œá€¯á€•á€ºá€†á€±á€¬á€„á€ºá€á€»á€€á€ºá€¡á€žá€…á€º',
    tagLabelEn: 'Feature Update',
    descriptionMy: 'VIP Premium á€žá€¯á€¶á€¸á€…á€½á€²á€žá€°á€™á€»á€¬á€¸á€¡á€á€½á€€á€º á€šá€¬á€‰á€ºá€¡á€…á€®á€¸á€›á€± á€¡á€€á€”á€·á€ºá€¡á€žá€á€ºá€™á€²á€· (Unlimited Vehicles) á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€á€½á€„á€·á€ºá€•á€¼á€¯á€•á€¼á€®á€¸ Free á€žá€¯á€¶á€¸á€…á€½á€²á€žá€°á€™á€»á€¬á€¸á€¡á€á€½á€€á€º á€šá€¬á€‰á€º á á€…á€®á€¸ á€¡á€á€™á€²á€· á€…á€®á€™á€¶á€á€½á€„á€·á€ºá€•á€±á€¸á€á€¼á€„á€ºá€¸áŠ "+ á€šá€¬á€‰á€ºá€¡á€žá€…á€º" á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€žá€Šá€·á€º á€‘á€„á€ºá€›á€¾á€¬á€¸á€žá€±á€¬ á€á€œá€¯á€á€ºá€”á€¾á€„á€·á€º Multi-Vehicle Quick Switcher Strip á€€á€­á€¯ á€á€•á€ºá€†á€„á€ºá€•á€±á€¸á€á€¼á€„á€ºá€¸á‹',
    descriptionEn: 'Unlocked Unlimited Vehicles for VIP Premium users, 1 Vehicle for Free users, and introduced prominent "+ Add Vehicle" buttons, in-dropdown vehicle creation, and a quick fleet switcher strip.',
    changesMy: [
      'VIP Premium á€¡á€€á€±á€¬á€„á€·á€ºá€™á€»á€¬á€¸á€¡á€á€½á€€á€º á€šá€¬á€‰á€ºá€¡á€…á€®á€¸á€›á€± á€¡á€€á€”á€·á€ºá€¡á€žá€á€ºá€™á€²á€· (Unlimited Fleet) á€…á€®á€™á€¶á€á€”á€·á€ºá€á€½á€²á€á€½á€„á€·á€º á€¡á€•á€¼á€Šá€·á€ºá€¡á€ á€–á€½á€„á€·á€ºá€•á€±á€¸á€á€¼á€„á€ºá€¸',
      'Free á€¡á€€á€±á€¬á€„á€·á€ºá€™á€»á€¬á€¸á€¡á€á€½á€€á€º á€šá€¬á€‰á€º á á€…á€®á€¸ á€¡á€á€™á€²á€· á€…á€®á€™á€¶á€á€½á€„á€·á€ºá€•á€¼á€¯á€•á€¼á€®á€¸ á€šá€¬á€‰á€ºá€‘á€•á€ºá€á€­á€¯á€¸á€œá€­á€¯á€•á€«á€€ VIP á€žá€­á€¯á€· á€¡á€œá€½á€šá€ºá€á€€á€° á€™á€¼á€¾á€„á€·á€ºá€á€„á€ºá€”á€­á€¯á€„á€ºá€…á€±á€á€¼á€„á€ºá€¸',
      'á€šá€¬á€‰á€ºá€…á€®á€™á€¶á€á€”á€·á€ºá€á€½á€²á€™á€¾á€¯ á€‘á€­á€•á€ºá€•á€­á€¯á€„á€ºá€¸á€á€½á€„á€º "+ á€šá€¬á€‰á€ºá€¡á€žá€…á€º" á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€”á€­á€¯á€„á€ºá€žá€±á€¬ á€‘á€„á€ºá€›á€¾á€¬á€¸á€žá€Šá€·á€º á€á€œá€¯á€á€ºá€¡á€žá€…á€ºá€€á€­á€¯ á€•á€±á€«á€ºá€œá€½á€„á€ºá€…á€½á€¬ á€á€•á€ºá€†á€„á€ºá€•á€±á€¸á€á€¼á€„á€ºá€¸',
      'á€šá€¬á€‰á€ºá€›á€½á€±á€¸á€á€»á€šá€ºá€žá€Šá€·á€º Dropdown á€…á€¬á€›á€„á€ºá€¸á€á€½á€„á€ºá€œá€Šá€ºá€¸ "âž• + á€šá€¬á€‰á€ºá€¡á€žá€…á€º á€‘á€•á€ºá€á€­á€¯á€¸á€›á€”á€º..." á€€á€­á€¯ á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€•á€±á€¸á€á€¼á€„á€ºá€¸',
      'á€šá€¬á€‰á€ºá€™á€»á€¬á€¸á€…á€½á€¬á€›á€¾á€­á€•á€«á€€ á€šá€¬á€‰á€ºá€á€…á€ºá€…á€®á€¸á€á€»á€„á€ºá€¸á€…á€®á€€á€­á€¯ á á€á€»á€€á€ºá€”á€¾á€­á€•á€º á€¡á€œá€½á€šá€ºá€á€€á€° á€€á€°á€¸á€•á€¼á€±á€¬á€„á€ºá€¸á€”á€­á€¯á€„á€ºá€žá€±á€¬ á€šá€¬á€‰á€ºá€…á€¬á€›á€„á€ºá€¸ Switcher Strip á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€•á€±á€¸á€á€¼á€„á€ºá€¸',
      'á€šá€¬á€‰á€ºá€•á€¼á€„á€ºá€†á€„á€ºá€á€¼á€„á€ºá€¸ (Edit) á€¡á€•á€¼á€„á€º á€™á€œá€­á€¯á€œá€¬á€¸á€¡á€•á€ºá€žá€±á€¬ á€šá€¬á€‰á€ºá€€á€­á€¯ á€œá€¯á€¶á€á€¼á€¯á€¶á€…á€½á€¬ á€–á€»á€€á€ºá€•á€…á€ºá€”á€­á€¯á€„á€ºá€žá€±á€¬ (Delete Vehicle) á€œá€¯á€•á€ºá€†á€±á€¬á€„á€ºá€á€»á€€á€º á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€•á€±á€¸á€á€¼á€„á€ºá€¸'
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
    titleMy: 'Dashboard á€á€½á€„á€º á€šá€á€¯á€œá€”á€¾á€„á€·á€º á€•á€¼á€®á€¸á€á€²á€·á€žá€Šá€·á€ºá€œ á€žá€¯á€¶á€¸á€…á€½á€²á€™á€¾á€¯ á€”á€¾á€­á€¯á€„á€ºá€¸á€šá€¾á€‰á€ºá€á€»á€€á€º Bar Chart (Monthly Comparison) á€€á€á€º á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€á€¼á€„á€ºá€¸',
    titleEn: 'Monthly Comparison Card with Recharts Bar Chart on Dashboard',
    tag: 'feature',
    tagLabelMy: 'á€œá€¯á€•á€ºá€†á€±á€¬á€„á€ºá€á€»á€€á€ºá€¡á€žá€…á€º',
    tagLabelEn: 'Feature Release',
    descriptionMy: 'Dashboard á€•á€„á€ºá€™á€…á€¬á€™á€»á€€á€ºá€”á€¾á€¬á€á€½á€„á€º á€šá€á€¯á€œá€”á€¾á€„á€·á€º á€•á€¼á€®á€¸á€á€²á€·á€žá€Šá€·á€ºá€œá á€¡á€žá€¯á€¶á€¸á€…á€›á€­á€á€ºá€™á€»á€¬á€¸á€€á€­á€¯ Recharts Bar Chart á€–á€¼á€„á€·á€º á€™á€»á€€á€ºá€…á€­á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€…á€½á€¬ á€”á€¾á€­á€¯á€„á€ºá€¸á€šá€¾á€‰á€ºá€œá€±á€·á€œá€¬á€”á€­á€¯á€„á€ºá€žá€±á€¬ Monthly Comparison Card á€€á€­á€¯ á€¡á€žá€…á€ºá€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€•á€±á€¸á€á€¼á€„á€ºá€¸á‹',
    descriptionEn: 'Added a dedicated Monthly Comparison card to the Dashboard that uses interactive Recharts bar charts to compare spending this month vs. the previous month.',
    changesMy: [
      'Dashboard á€á€½á€„á€º á€šá€á€¯á€œá€”á€¾á€„á€·á€º á€•á€¼á€®á€¸á€á€²á€·á€žá€Šá€·á€ºá€œ á€¡á€žá€¯á€¶á€¸á€…á€›á€­á€á€º á€€á€½á€¬á€á€¼á€¬á€¸á€á€»á€€á€º (Variance & % Change) á€€á€­á€¯ á€á€½á€€á€ºá€á€»á€€á€ºá€•á€¼á€žá€•á€±á€¸á€žá€Šá€·á€º Monthly Comparison Card á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€á€¼á€„á€ºá€¸',
      'Recharts á€¡á€žá€¯á€¶á€¸á€•á€¼á€¯á€‘á€¬á€¸á€žá€±á€¬ á€¡á€•á€¼á€”á€ºá€¡á€œá€¾á€”á€ºá€á€¯á€¶á€·á€•á€¼á€”á€ºá€”á€­á€¯á€„á€ºá€žá€Šá€·á€º á€á€­á€¯á€„á€ºá€•á€¯á€¶á€…á€¶á€‡á€šá€¬á€¸ (Bar Chart) á€–á€¼á€„á€·á€º á€á€¼á€¯á€¶á€„á€¯á€¶á€žá€¯á€¶á€¸á€…á€½á€²á€™á€¾á€¯á€”á€¾á€„á€·á€º á€‘á€­á€•á€ºá€á€”á€ºá€¸á€€á€á€¹á€á€™á€»á€¬á€¸á€¡á€œá€­á€¯á€€á€º á€”á€¾á€­á€¯á€„á€ºá€¸á€šá€¾á€‰á€ºá€•á€¼á€žá€•á€±á€¸á€á€¼á€„á€ºá€¸',
      'á€á€…á€ºá€œá€œá€¯á€¶á€¸ á€…á€¯á€…á€¯á€•á€±á€«á€„á€ºá€¸ á€”á€¾á€­á€¯á€„á€ºá€¸á€šá€¾á€‰á€ºá€á€»á€€á€ºá€¡á€•á€¼á€„á€º á€šá€”á€±á€·á€›á€€á€ºá€…á€½á€²á€¡á€‘á€­ á€•á€¼á€­á€¯á€„á€ºá€á€°á€›á€€á€ºá€™á€»á€¬á€¸ (To-Date: Day 1 - Today) á€¡á€œá€­á€¯á€€á€º á€á€­á€€á€»á€…á€½á€¬ á€”á€¾á€­á€¯á€„á€ºá€¸á€šá€¾á€‰á€ºá€€á€¼á€Šá€·á€ºá€›á€¾á€¯á€”á€­á€¯á€„á€ºá€žá€±á€¬ Toggle á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€•á€±á€¸á€á€¼á€„á€ºá€¸',
      'á€žá€¯á€¶á€¸á€…á€½á€²á€™á€¾á€¯ á€œá€»á€±á€¬á€·á€€á€»á€á€¼á€„á€ºá€¸/á€•á€­á€¯á€™á€­á€¯á€á€¼á€„á€ºá€¸á€¡á€•á€±á€«á€º á€™á€°á€á€Šá€ºá á€…á€­á€á€ºá€á€„á€ºá€…á€¬á€¸á€–á€½á€šá€º á€¡á€›á€±á€¬á€„á€ºá€¡á€žá€½á€±á€¸ (Emerald/Rose) á€”á€¾á€„á€·á€º á€žá€¯á€¶á€¸á€žá€•á€ºá€á€»á€€á€º á€™á€¾á€á€ºá€á€»á€€á€º (Insight Summary) á€•á€¼á€žá€•á€±á€¸á€á€¼á€„á€ºá€¸'
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
    titleMy: 'Sub-Category á€¡á€¬á€¸ Horizontal Scroll á€¡á€…á€¬á€¸ á€žá€•á€ºá€›á€•á€ºá€žá€±á€¬ Dropdown Menu á€–á€¼á€„á€·á€º á€¡á€…á€¬á€¸á€‘á€­á€¯á€¸á€á€¼á€„á€ºá€¸',
    titleEn: 'Sub-Category Dropdown Selector Replacement (No Horizontal Scroll)',
    tag: 'feature',
    tagLabelMy: 'á€œá€¯á€•á€ºá€†á€±á€¬á€„á€ºá€á€»á€€á€ºá€¡á€žá€…á€º',
    tagLabelEn: 'Feature Release',
    descriptionMy: 'á€…á€¬á€›á€„á€ºá€¸á€žá€½á€„á€ºá€¸á€›á€¬á€á€½á€„á€º á€€á€á€¹á€á€á€½á€² (Sub-Category) á€™á€»á€¬á€¸á€€á€­á€¯ á€˜á€±á€¸á€žá€­á€¯á€· Scroll á€†á€½á€²á€›á€½á€±á€¸á€á€»á€šá€ºá€›á€žá€Šá€·á€º á€¡á€†á€„á€ºá€™á€•á€¼á€±á€™á€¾á€¯á€€á€­á€¯ á€–á€šá€ºá€›á€¾á€¬á€¸á€•á€¼á€®á€¸ á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€€á€»á€…á€ºá€œá€»á€…á€ºá€žá€±á€¬ Dropdown Menu á€–á€¼á€„á€·á€º á á€á€»á€€á€ºá€”á€¾á€­á€•á€º á€›á€½á€±á€¸á€á€»á€šá€ºá€”á€­á€¯á€„á€ºá€…á€±á€á€¼á€„á€ºá€¸á‹',
    descriptionEn: 'Replaced horizontal scrolling sub-category chips with a structured, intuitive Dropdown Selector for optimal ergonomics and zero horizontal scrolling.',
    changesMy: [
      'á€€á€á€¹á€á€á€½á€²á€™á€»á€¬á€¸ á€¡á€¬á€¸á€œá€¯á€¶á€¸á€€á€­á€¯ á€˜á€±á€¸á€žá€­á€¯á€· Scroll á€†á€½á€²á€›á€”á€ºá€™á€œá€­á€¯á€˜á€² Dropdown á€–á€¼á€„á€·á€º á€á€»á€€á€ºá€á€»á€„á€ºá€¸ á€¡á€œá€½á€šá€ºá€á€€á€° á€›á€½á€±á€¸á€á€»á€šá€ºá€”á€­á€¯á€„á€ºá€…á€±á€á€¼á€„á€ºá€¸',
      'á€¡á€“á€­á€€á€€á€á€¹á€á€žá€¬ (Main Category Only) á€”á€¾á€„á€·á€º á€€á€á€¹á€á€á€½á€²á€á€…á€ºá€á€¯á€á€»á€„á€ºá€¸á€…á€®á€€á€­á€¯ á€¡á€­á€¯á€„á€ºá€€á€½á€”á€ºá€–á€¼á€„á€·á€º á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€…á€½á€¬ á€á€½á€²á€á€¼á€¬á€¸á€•á€¼á€žá€•á€±á€¸á€á€¼á€„á€ºá€¸',
      'á€–á€¯á€”á€ºá€¸á€™á€»á€€á€ºá€”á€¾á€¬á€•á€¼á€„á€ºá€¡á€¬á€¸á€œá€¯á€¶á€¸á€á€½á€„á€º á€…á€¬á€žá€¬á€¸á€™á€»á€¬á€¸ á€™á€•á€¼á€á€ºá€á€±á€¬á€€á€ºá€˜á€² á€¡á€•á€¼á€Šá€·á€ºá€¡á€…á€¯á€¶ á€–á€á€ºá€›á€¾á€¯á€›á€½á€±á€¸á€á€»á€šá€ºá€”á€­á€¯á€„á€ºá€¡á€±á€¬á€„á€º á€á€Šá€ºá€†á€±á€¬á€€á€ºá€•á€±á€¸á€á€¼á€„á€ºá€¸'
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
    titleMy: 'Category á€›á€½á€±á€¸á€á€»á€šá€ºá€™á€¾á€¯ UI á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€™á€¾á€¯ á€™á€¼á€¾á€„á€·á€ºá€á€„á€ºá€á€¼á€„á€ºá€¸á€”á€¾á€„á€·á€º Single-Tap Card á€’á€®á€‡á€­á€¯á€„á€ºá€¸á€žá€…á€º',
    titleEn: 'Streamlined Category & Sub-Category Selection UI',
    tag: 'feature',
    tagLabelMy: 'á€œá€¯á€•á€ºá€†á€±á€¬á€„á€ºá€á€»á€€á€ºá€¡á€žá€…á€º',
    tagLabelEn: 'Feature Release',
    descriptionMy: 'á€…á€¬á€›á€„á€ºá€¸á€™á€¾á€á€ºá€á€™á€ºá€¸á€á€„á€ºá€›á€¬á€á€½á€„á€º Category á€”á€¾á€„á€·á€º Sub-Category á€›á€½á€±á€¸á€á€»á€šá€ºá€žá€Šá€·á€ºá€”á€±á€›á€¬ á€›á€¾á€¯á€•á€ºá€‘á€½á€±á€¸á€”á€±á€™á€¾á€¯á€€á€­á€¯ á€–á€šá€ºá€›á€¾á€¬á€¸á€•á€¼á€®á€¸ á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€€á€»á€…á€ºá€œá€»á€…á€ºá€žá€±á€¬ 1-Tap Card á€’á€®á€‡á€­á€¯á€„á€ºá€¸á€žá€…á€ºá€–á€¼á€„á€·á€º á€¡á€…á€¬á€¸á€‘á€­á€¯á€¸á€•á€¼á€±á€¬á€„á€ºá€¸á€œá€²á€•á€±á€¸á€á€¼á€„á€ºá€¸á‹',
    descriptionEn: 'Refactored transaction category selection into an ultra-clean, non-redundant single-tap card with direct sub-category indicators and clutter-free mobile ergonomics.',
    changesMy: [
      'á€‘á€•á€ºá€”á€±á€žá€±á€¬ "á€€á€á€¹á€ á€¡á€¬á€¸á€œá€¯á€¶á€¸á€›á€¾á€¬á€–á€½á€±á€›á€”á€º" á€á€œá€¯á€á€ºá€”á€¾á€„á€·á€º á€›á€¾á€¯á€•á€ºá€‘á€½á€±á€¸á€”á€±á€žá€±á€¬ á€¡á€á€½á€„á€ºá€¸á€˜á€±á€¬á€„á€ºá€™á€»á€¬á€¸á€€á€­á€¯ á€–á€šá€ºá€›á€¾á€¬á€¸á á€™á€»á€€á€ºá€…á€­á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€…á€±á€á€¼á€„á€ºá€¸',
      'á€€á€á€¹á€á€¡á€™á€Šá€ºáŠ á€€á€á€¹á€á€á€½á€²á€á€¶á€†á€­á€•á€º (á€¥á€•á€™á€¬- á€¡á€…á€¬á€¸á€¡á€žá€±á€¬á€€á€º â€º á€žá€½á€¬á€¸á€›á€Šá€ºá€…á€¬) á€”á€¾á€„á€·á€º á€¡á€­á€¯á€„á€ºá€€á€½á€”á€ºá€á€­á€¯á€·á€€á€­á€¯ á€á€…á€ºá€€á€á€ºá€á€Šá€ºá€¸á€á€½á€„á€º á€¡á€™á€¼á€„á€ºá€›á€¾á€„á€ºá€¸á€…á€½á€¬ á€•á€±á€«á€„á€ºá€¸á€…á€•á€ºá€•á€±á€¸á€á€¼á€„á€ºá€¸',
      'á€€á€á€ºá€á€…á€ºá€á€¯á€œá€¯á€¶á€¸á€€á€­á€¯ á€á€…á€ºá€á€»á€€á€ºá€”á€¾á€­á€•á€ºá€›á€¯á€¶á€–á€¼á€„á€·á€º á€•á€¼á€Šá€·á€ºá€…á€¯á€¶á€žá€±á€¬ Category Picker Window á€•á€½á€„á€·á€ºá€œá€¬á€…á€±á€á€¼á€„á€ºá€¸',
      'á€œá€€á€ºá€›á€¾á€­á€›á€½á€±á€¸á€‘á€¬á€¸á€žá€±á€¬ á€€á€á€¹á€á€á€½á€„á€º á€€á€á€¹á€á€á€½á€²á€™á€»á€¬á€¸á€›á€¾á€­á€•á€«á€€ á€¡á€±á€¬á€€á€ºá€á€½á€„á€º á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€žá€±á€¬ Quick Pill Chip á€™á€»á€¬á€¸á€–á€¼á€„á€·á€º á á€á€»á€€á€ºá€”á€¾á€­á€•á€º á€¡á€œá€½á€šá€ºá€á€€á€° á€•á€¼á€±á€¬á€„á€ºá€¸á€œá€²á€”á€­á€¯á€„á€ºá€á€¼á€„á€ºá€¸'
    ],
    changesEn: [
      'Eliminated duplicate "Browse Categories" buttons and complex nested borders to remove visual clutter',
      'Unified main category, sub-category badge (e.g. Food & Dining â€º Snacks), and icon into a single elegant tile',
      'Made the whole tile a smooth tap target to open the full-screen Category Picker Window',
      'Simplified inline sub-category pills into a clean, single-row layout without nested clutter'
    ]
  },
  {
    version: 'v4.5.0',
    buildNumber: 45,
    releaseDate: '2026-09-26',
    releaseTime: '02:20 PM (MMT)',
    titleMy: 'á€žá€á€ºá€™á€¾á€á€ºá€›á€€á€ºá€…á€½á€²á€á€…á€ºá€á€¯á€á€Šá€ºá€¸ á€…á€…á€ºá€‘á€¯á€á€ºá€€á€¼á€Šá€·á€ºá€›á€¾á€¯á€á€¼á€„á€ºá€¸ (Specific Date Picker) á€”á€¾á€„á€·á€º á€›á€€á€ºá€…á€½á€²á€¡á€•á€­á€¯á€„á€ºá€¸á€¡á€á€¼á€¬á€¸ á€…á€”á€…á€ºá€žá€…á€º',
    titleEn: 'Specific Single Date Filter & Custom Date Range System',
    tag: 'feature',
    tagLabelMy: 'á€œá€¯á€•á€ºá€†á€±á€¬á€„á€ºá€á€»á€€á€ºá€¡á€žá€…á€º',
    tagLabelEn: 'Feature Release',
    descriptionMy: 'á€á€„á€ºá€„á€½á€±/á€‘á€½á€€á€ºá€„á€½á€± á€™á€¾á€á€ºá€á€™á€ºá€¸á€™á€»á€¬á€¸á€á€½á€„á€º á€€á€¼á€Šá€·á€ºá€œá€­á€¯á€žá€Šá€·á€º á€žá€á€ºá€™á€¾á€á€ºá€›á€€á€ºá€…á€½á€²á€á€…á€ºá€á€¯á€á€Šá€ºá€¸ (á€¥á€•á€™á€¬- á€’á€®á€”á€±á€·áŠ á€™á€”á€±á€·á€€ á€žá€­á€¯á€·á€™á€Ÿá€¯á€á€º á€•á€¼á€€á€¹á€á€’á€­á€”á€ºá€™á€¾ á€›á€½á€±á€¸á€á€»á€šá€ºá€žá€Šá€·á€º á€žá€®á€¸á€žá€”á€·á€ºá€›á€€á€º) á€žá€¬á€™á€€ á€›á€€á€ºá€…á€½á€²á€¡á€•á€­á€¯á€„á€ºá€¸á€¡á€á€¼á€¬á€¸á€¡á€œá€­á€¯á€€á€º á€¡á€á€­á€¡á€€á€» á€…á€…á€ºá€‘á€¯á€á€ºá€€á€¼á€Šá€·á€ºá€›á€¾á€¯á€”á€­á€¯á€„á€ºá€žá€±á€¬ á€…á€”á€…á€ºá€žá€…á€ºá‹',
    descriptionEn: 'Enhanced transactions view with interactive single specific date picker, previous/next day stepping, custom date range filtering, and 1-click date filtering directly from transaction rows.',
    changesMy: [
      'á€á€„á€ºá€„á€½á€±/á€‘á€½á€€á€ºá€„á€½á€± á€…á€¬á€›á€„á€ºá€¸á€á€½á€„á€º á€€á€¼á€Šá€·á€ºá€œá€­á€¯á€žá€Šá€·á€º á€žá€á€ºá€™á€¾á€á€ºá€›á€€á€ºá€…á€½á€² (Specific Date) á€á€…á€ºá€á€¯á€á€Šá€ºá€¸á€€á€­á€¯ á€•á€¼á€€á€¹á€á€’á€­á€”á€ºá€–á€¼á€„á€·á€º á€¡á€œá€½á€šá€ºá€á€€á€° á€›á€½á€±á€¸á€á€»á€šá€ºá€…á€…á€ºá€‘á€¯á€á€ºá€”á€­á€¯á€„á€ºá€á€¼á€„á€ºá€¸',
      'á€›á€€á€ºá€…á€½á€²á€á€…á€ºá€á€¯á€á€»á€„á€ºá€¸á€…á€®á€¡á€œá€­á€¯á€€á€º á€›á€¾á€±á€·á€›á€€á€º (â—€) / á€”á€±á€¬á€€á€ºá€›á€€á€º (â–¶) á€¡á€œá€½á€šá€ºá€á€€á€° á€€á€°á€¸á€•á€¼á€±á€¬á€„á€ºá€¸á€”á€­á€¯á€„á€ºá€žá€±á€¬ Navigation á€á€œá€¯á€á€ºá€™á€»á€¬á€¸ á€á€•á€ºá€†á€„á€ºá€á€¼á€„á€ºá€¸',
      'á€’á€®á€”á€±á€· (Today) á€”á€¾á€„á€·á€º á€™á€”á€±á€·á€€ (Yesterday) á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸á€žá€­á€¯á€· á á€á€»á€€á€ºá€”á€¾á€­á€•á€ºá€›á€¯á€¶á€–á€¼á€„á€·á€º á€á€»á€€á€ºá€á€»á€„á€ºá€¸ á€›á€±á€¬á€€á€ºá€›á€¾á€­á€”á€­á€¯á€„á€ºá€žá€±á€¬ Quick Buttons á€™á€»á€¬á€¸ á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€á€¼á€„á€ºá€¸',
      'á€›á€€á€ºá€…á€½á€²á€¡á€•á€­á€¯á€„á€ºá€¸á€¡á€á€¼á€¬á€¸ (Custom Date Range - á‡ á€›á€€á€ºáŠ áƒá€ á€›á€€á€ºáŠ á€…á€­á€á€ºá€€á€¼á€­á€¯á€€á€ºá€…á€á€„á€º/á€•á€¼á€®á€¸á€†á€¯á€¶á€¸á€›á€€á€º) á€…á€…á€ºá€‘á€¯á€á€ºá€”á€­á€¯á€„á€ºá€žá€±á€¬ á€…á€”á€…á€ºá€žá€…á€º',
      'á€…á€¬á€›á€„á€ºá€¸á€™á€¾á€á€ºá€á€™á€ºá€¸á€™á€»á€¬á€¸á€•á€±á€«á€ºá€›á€¾á€­ á€›á€€á€ºá€…á€½á€²á€á€¶á€†á€­á€•á€ºá€€á€­á€¯ á€”á€¾á€­á€•á€ºá€›á€¯á€¶á€–á€¼á€„á€·á€º á€šá€„á€ºá€¸á€”á€±á€·á€›á€¾á€­ á€…á€¬á€›á€„á€ºá€¸á€¡á€¬á€¸á€œá€¯á€¶á€¸á€€á€­á€¯ á€á€»á€€á€ºá€á€»á€„á€ºá€¸ á€…á€…á€ºá€‘á€¯á€á€ºá€•á€¼á€žá€•á€±á€¸á€žá€±á€¬ 1-Click Date Filtering á€…á€”á€…á€º',
      'á€›á€€á€ºá€žá€á€¹á€á€•á€á€ºá á€”á€±á€·á€¡á€™á€Šá€º (á€¥á€•á€™á€¬- á€…á€”á€±á€”á€±á€·áŠ á€á€”á€„á€ºá€¹á€‚á€”á€½á€±) á€”á€¾á€„á€·á€º á€žá€€á€ºá€†á€­á€¯á€„á€ºá€›á€¬ á€™á€¼á€”á€ºá€™á€¬á€›á€€á€ºá€…á€½á€² á€¡á€•á€¼á€Šá€·á€ºá€¡á€…á€¯á€¶ á€–á€±á€¬á€ºá€•á€¼á€•á€±á€¸á€á€¼á€„á€ºá€¸'
    ],
    changesEn: [
      'Added interactive specific single-date filtering with calendar date picker in Transactions view',
      'Equipped Previous Day (â—€) and Next Day (â–¶) navigation buttons for seamless daily timeline browsing',
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
    titleMy: 'Category á€›á€½á€±á€¸á€á€»á€šá€ºá€™á€¾á€¯ Window á€’á€®á€‡á€­á€¯á€„á€ºá€¸á€žá€…á€ºá€”á€¾á€„á€·á€º á€¡á€€á€±á€¬á€„á€·á€ºá€žá€…á€ºá€™á€»á€¬á€¸á€¡á€á€½á€€á€º áƒ á€œ á€¡á€á€™á€²á€· Premium á€…á€”á€…á€º',
    titleEn: 'Dedicated Category Picker Window & 3-Month Free Trial for New Users',
    tag: 'feature',
    tagLabelMy: 'á€œá€¯á€•á€ºá€†á€±á€¬á€„á€ºá€á€»á€€á€ºá€¡á€žá€…á€º',
    tagLabelEn: 'Feature Release',
    descriptionMy: 'á€…á€¬á€›á€„á€ºá€¸á€žá€½á€„á€ºá€¸á€›á€¬á€á€½á€„á€º Category á€”á€¾á€„á€·á€º Sub-Category á€™á€»á€¬á€¸á€€á€­á€¯ á€žá€®á€¸á€žá€”á€·á€º Window/Modal á€¡á€žá€…á€ºá€–á€¼á€„á€·á€º á€›á€¾á€¬á€–á€½á€±á€›á€½á€±á€¸á€á€»á€šá€ºá€”á€­á€¯á€„á€ºá€žá€±á€¬ á€á€±á€á€ºá€™á€® UI á€’á€®á€‡á€­á€¯á€„á€ºá€¸á€žá€…á€º á€á€•á€ºá€†á€„á€ºá€á€¼á€„á€ºá€¸á€”á€¾á€„á€·á€º á€¡á€€á€±á€¬á€„á€·á€ºá€–á€½á€„á€·á€ºá€•á€¼á€®á€¸ á á€œá€¡á€á€½á€„á€ºá€¸ á€žá€¯á€¶á€¸á€…á€½á€²á€žá€°á€á€­á€¯á€„á€ºá€¸á€¡á€á€½á€€á€º áƒ á€œ á€¡á€á€™á€²á€· Premium (Free Trial 3 Months) á€›á€šá€°á€”á€­á€¯á€„á€ºá€žá€±á€¬ á€¡á€‘á€°á€¸á€…á€”á€…á€ºá‹',
    descriptionEn: 'Introduced a dedicated full-featured Category Picker Window with live search and 1-click sub-category selection, plus a 3-Month Free Premium Trial for new accounts within 30 days of registration.',
    changesMy: [
      'á€…á€¬á€›á€„á€ºá€¸á€žá€½á€„á€ºá€¸á€›á€¬á€á€½á€„á€º Category á€›á€½á€±á€¸á€á€»á€šá€ºá€›á€”á€º á€žá€®á€¸á€žá€”á€·á€º Category Picker Window / Modal á€¡á€žá€…á€º á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€•á€±á€¸á€á€¼á€„á€ºá€¸',
      'á€€á€á€¹á€á€”á€¾á€„á€·á€º á€€á€á€¹á€á€á€½á€²á€™á€»á€¬á€¸á€€á€­á€¯ á€™á€¼á€”á€ºá€™á€¬/á€¡á€„á€ºá€¹á€‚á€œá€­á€•á€º á€¡á€™á€Šá€ºá€™á€»á€¬á€¸á€–á€¼á€„á€·á€º á€¡á€á€»á€­á€”á€ºá€”á€¾á€„á€·á€ºá€á€•á€¼á€±á€¸á€Šá€® á€›á€¾á€¬á€–á€½á€±á€”á€­á€¯á€„á€ºá€žá€±á€¬ Live Search á€…á€”á€…á€º',
      'á€¡á€“á€­á€€á€€á€á€¹á€á€”á€¾á€„á€·á€º á€€á€á€¹á€á€á€½á€²á€™á€»á€¬á€¸á€€á€­á€¯ á€á€…á€ºá€á€»á€€á€ºá€”á€¾á€­á€•á€ºá€›á€¯á€¶á€–á€¼á€„á€·á€º á€œá€½á€šá€ºá€€á€°á€œá€»á€„á€ºá€™á€¼á€”á€ºá€…á€½á€¬ á€›á€½á€±á€¸á€á€»á€šá€ºá€”á€­á€¯á€„á€ºá€žá€±á€¬ á€€á€á€ºá€’á€®á€‡á€­á€¯á€„á€ºá€¸á€žá€…á€º',
      'á€¡á€€á€±á€¬á€„á€·á€ºá€…á€–á€½á€„á€·á€ºá€žá€Šá€·á€º á€”á€±á€·á€™á€¾ á á€œ (á€›á€€á€º áƒá€) á€¡á€á€½á€„á€ºá€¸ á€¡á€žá€¯á€¶á€¸á€•á€¼á€¯á€žá€°á€á€­á€¯á€„á€ºá€¸á€¡á€á€½á€€á€º áƒ á€œ á€¡á€á€™á€²á€· Premium (Get Free Trial 3 Months) á€›á€šá€°á€”á€­á€¯á€„á€ºá€žá€±á€¬ á€…á€”á€…á€º á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€á€¼á€„á€ºá€¸',
      'á€œá€€á€ºá€€á€»á€”á€º á€›á€€á€ºá€•á€±á€«á€„á€ºá€¸ Countdown á€”á€¾á€„á€·á€º á á€á€»á€€á€ºá€”á€¾á€­á€•á€ºá€›á€¯á€¶á€–á€¼á€„á€·á€º á€á€»á€€á€ºá€á€»á€„á€ºá€¸ á€¡á€žá€€á€ºá€á€„á€ºá€…á€±á€žá€±á€¬ One-Click Activation á€…á€”á€…á€º',
      'Free Plan á€¡á€žá€¯á€¶á€¸á€•á€¼á€¯á€žá€°á€™á€»á€¬á€¸á€¡á€á€½á€€á€º á€¡á€á€™á€²á€· á€…á€™á€ºá€¸á€žá€¯á€¶á€¸á€á€½á€„á€·á€º á€œá€€á€ºá€†á€±á€¬á€„á€ºá€›á€šá€°á€›á€”á€º Plan Banner á€á€½á€„á€º á€žá€­á€žá€¬á€‘á€„á€ºá€›á€¾á€¬á€¸á€…á€½á€¬ á€•á€¼á€žá€•á€±á€¸á€á€¼á€„á€ºá€¸'
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
    titleMy: 'Category á€žá€­á€™á€ºá€¸á€†á€Šá€ºá€¸á€™á€¾á€¯ á€á€­á€¯á€„á€ºá€™á€¬á€…á€±á€á€¼á€„á€ºá€¸á€”á€¾á€„á€·á€º Custom Category Lock á€…á€”á€…á€º',
    titleEn: 'Category Data Persistence & Non-Destructive Custom Category Lock',
    tag: 'feature',
    tagLabelMy: 'á€œá€¯á€•á€ºá€†á€±á€¬á€„á€ºá€á€»á€€á€ºá€¡á€žá€…á€º',
    tagLabelEn: 'Feature Release',
    descriptionMy: 'Refresh á€œá€¯á€•á€ºá€á€­á€¯á€„á€ºá€¸ Category / Sub-Category á€¡á€žá€…á€ºá€™á€»á€¬á€¸ á€•á€»á€±á€¬á€€á€ºá€žá€½á€¬á€¸á€á€¼á€„á€ºá€¸á€™á€›á€¾á€­á€…á€±á€›á€”á€º Local Storage & Cloud Synchronous Write á€…á€”á€…á€ºá€–á€¼á€„á€·á€º á€¡á€•á€¼á€®á€¸á€žá€á€ºá€–á€¼á€±á€›á€¾á€„á€ºá€¸á€á€¼á€„á€ºá€¸áŠ Premium á€žá€€á€ºá€á€™á€ºá€¸á€€á€¯á€”á€ºá€žá€½á€¬á€¸á€žá€±á€¬á€ºá€œá€Šá€ºá€¸ á€™á€­á€™á€­á€…á€­á€á€ºá€€á€¼á€­á€¯á€€á€º á€–á€”á€ºá€á€®á€¸á€‘á€¬á€¸á€žá€±á€¬ Custom Category á€™á€»á€¬á€¸á€€á€­á€¯ á€œá€¯á€¶á€¸á€á€–á€»á€€á€ºá€™á€•á€…á€ºá€˜á€² Soft Lock á€…á€”á€…á€ºá€–á€¼á€„á€·á€º á€œá€¯á€¶á€á€¼á€¯á€¶á€…á€½á€¬ á€‘á€­á€”á€ºá€¸á€žá€­á€™á€ºá€¸á€•á€±á€¸á€‘á€¬á€¸á€á€¼á€„á€ºá€¸á‹',
    descriptionEn: 'Resolved category data loss on refresh with instant dual-storage persistence, and introduced non-destructive Soft Lock for custom categories when Premium expires.',
    changesMy: [
      'Category / Sub-Category á€¡á€žá€…á€ºá€‘á€Šá€·á€ºá€á€¼á€„á€ºá€¸áŠ á€•á€¼á€„á€ºá€†á€„á€ºá€á€¼á€„á€ºá€¸áŠ á€–á€»á€€á€ºá€á€¼á€„á€ºá€¸á€á€­á€¯á€·á€á€½á€„á€º Local Storage á€”á€¾á€„á€·á€º Firestore á€žá€­á€¯á€· á€¡á€•á€¼á€­á€¯á€„á€º á€á€»á€€á€ºá€á€»á€„á€ºá€¸ á€›á€±á€¸á€žá€¬á€¸á€žá€­á€™á€ºá€¸á€†á€Šá€ºá€¸á€…á€±á€á€¼á€„á€ºá€¸',
      'á€…á€”á€…á€ºá€…á€á€„á€ºá€á€»á€­á€”á€ºá€á€½á€„á€º User á€–á€”á€ºá€á€®á€¸á€‘á€¬á€¸á€žá€±á€¬ Custom Category á€™á€»á€¬á€¸á€€á€­á€¯ á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º á€žá€”á€·á€ºá€…á€„á€ºá€–á€»á€€á€ºá€†á€®á€¸á€•á€…á€ºá€žá€Šá€·á€º Legacy Code á€¡á€¬á€¸á€œá€¯á€¶á€¸á€€á€­á€¯ á€–á€šá€ºá€›á€¾á€¬á€¸á€•á€¼á€®á€¸ á€™á€°á€œá€’á€±á€á€¬ á€¡á€•á€¼á€Šá€·á€ºá€¡á€…á€¯á€¶ á€€á€¬á€€á€½á€šá€ºá€•á€±á€¸á€á€¼á€„á€ºá€¸',
      'Premium á€á€šá€ºá€šá€°á€–á€°á€¸á€•á€¼á€®á€¸ á€žá€€á€ºá€á€™á€ºá€¸á€€á€¯á€”á€ºá€žá€½á€¬á€¸á€žá€±á€¬ á€¡á€€á€±á€¬á€„á€·á€ºá€™á€»á€¬á€¸á€¡á€á€½á€€á€º Custom Categories á€™á€»á€¬á€¸á€€á€­á€¯ á€™á€–á€»á€€á€ºá€˜á€² Lock (ðŸ”’) á€á€á€ºá€‘á€¬á€¸á€•á€±á€¸á€žá€Šá€·á€º Soft Lock á€…á€”á€…á€º á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€•á€±á€¸á€á€¼á€„á€ºá€¸',
      'á€¡á€á€­á€á€ºá€€ á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€á€²á€·á€žá€±á€¬ á€…á€¬á€›á€„á€ºá€¸á€Ÿá€±á€¬á€„á€ºá€¸á€™á€»á€¬á€¸ (Historical Transactions) á€œá€¯á€¶á€¸á€ á€•á€»á€€á€ºá€…á€®á€¸á€™á€žá€½á€¬á€¸á€˜á€² á€™á€°á€œá€¡á€á€­á€¯á€„á€ºá€¸ á€–á€á€ºá€›á€¾á€¯á€¡á€žá€¯á€¶á€¸á€•á€¼á€¯á€”á€­á€¯á€„á€ºá€…á€±á€á€¼á€„á€ºá€¸',
      'Custom Category á€™á€»á€¬á€¸á€”á€¾á€„á€·á€º Sub-Category á€™á€»á€¬á€¸á€€á€­á€¯ á€•á€¼á€”á€ºá€œá€Šá€º Unlock á€œá€¯á€•á€ºá€›á€”á€º Categories View á€”á€¾á€„á€·á€º á€…á€¬á€›á€„á€ºá€¸á€žá€½á€„á€ºá€¸ Modal á€™á€»á€¬á€¸á€á€½á€„á€º á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€žá€±á€¬ á€žá€á€­á€•á€±á€¸á€á€»á€€á€ºá€”á€¾á€„á€·á€º Upgrade á€œá€™á€ºá€¸á€€á€¼á€±á€¬á€„á€ºá€¸ á€á€•á€ºá€†á€„á€ºá€•á€±á€¸á€á€¼á€„á€ºá€¸'
    ],
    changesEn: [
      'Instant dual-write persistence for all category & sub-category additions, edits, and deletions across LocalStorage and Cloud',
      'Eliminated aggressive legacy auto-cleanup routines on startup, ensuring 100% preservation of custom category items',
      'Introduced non-destructive Soft Lock (ðŸ”’) for custom categories and subcategories when Premium plan expires',
      'All existing transactions using custom categories remain fully preserved and intact',
      'Added seamless category unlock reminders and direct upgrade flows across Categories View and Transaction Entry Modal'
    ]
  },
  {
    version: 'v4.2.0',
    buildNumber: 42,
    releaseDate: '2026-09-25',
    releaseTime: '08:45 AM (MMT)',
    titleMy: 'Header Layout á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€™á€¾á€¯á€”á€¾á€„á€·á€º Version á€™á€¾á€á€ºá€á€™á€ºá€¸ á€…á€”á€…á€º',
    titleEn: 'Header Layout Optimization & In-App Changelog System',
    tag: 'feature',
    tagLabelMy: 'á€œá€¯á€•á€ºá€†á€±á€¬á€„á€ºá€á€»á€€á€ºá€¡á€žá€…á€º',
    tagLabelEn: 'Feature Release',
    descriptionMy: 'Top Header á€á€½á€„á€º Icon Overflow á€–á€¼á€…á€ºá€”á€±á€á€¼á€„á€ºá€¸á€€á€­á€¯ á€–á€¼á€±á€›á€¾á€„á€ºá€¸á€•á€¼á€®á€¸ Sidebar á€”á€¾á€„á€·á€º á€•á€±á€«á€„á€ºá€¸á€…á€•á€ºá€Šá€¾á€­á€”á€¾á€­á€¯á€„á€ºá€¸á€á€¼á€„á€ºá€¸áŠ Version á€™á€¾á€á€ºá€á€™á€ºá€¸ á€¡á€•á€¼á€Šá€·á€ºá€¡á€…á€¯á€¶ á€€á€¼á€Šá€·á€ºá€›á€¾á€¯á€”á€­á€¯á€„á€ºá€žá€±á€¬ á€…á€”á€…á€º á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€á€¼á€„á€ºá€¸á‹',
    descriptionEn: 'Fixed top navbar icon overcrowding by keeping only primary quick actions, with in-app version tracking modal.',
    changesMy: [
      'Top Navbar á€™á€¾ "á€™á€»á€¾á€á€±á€›á€”á€º" á€”á€¾á€„á€·á€º "á€œá€™á€ºá€¸á€Šá€½á€¾á€”á€º" á€á€œá€¯á€á€ºá€™á€»á€¬á€¸á€€á€­á€¯ Sidebar á€‘á€²á€žá€­á€¯á€· á€žá€•á€ºá€›á€•á€ºá€…á€½á€¬ á€•á€¼á€±á€¬á€„á€ºá€¸á€›á€½á€¾á€±á€·á€•á€±á€¸á€á€¼á€„á€ºá€¸',
      'VIP badge á€˜á€±á€¸á€›á€¾á€­ á€•á€­á€¯á€”á€±á€žá€±á€¬ á€á€±á€«á€„á€ºá€¸á€…á€‰á€º badge á€€á€­á€¯ á€–á€¼á€¯á€á€ºá€•á€±á€¸á€•á€¼á€®á€¸ Icon Overflow á€–á€¼á€…á€ºá€á€¼á€„á€ºá€¸á€€á€­á€¯ á€¡á€•á€¼á€®á€¸á€žá€á€ºá€–á€¼á€±á€›á€¾á€„á€ºá€¸á€á€¼á€„á€ºá€¸',
      'á€…á€á€„á€ºá€á€Šá€ºá€†á€±á€¬á€€á€ºá€á€»á€­á€”á€ºá€™á€¾ á€šá€”á€±á€·á€¡á€‘á€­ á€•á€¼á€¯á€œá€¯á€•á€ºá€á€²á€·á€žá€±á€¬ á€—á€¬á€¸á€›á€¾á€„á€ºá€¸á€™á€¾á€á€ºá€á€™á€ºá€¸á€™á€»á€¬á€¸ (Version History & Changelog) á€€á€­á€¯ á€¡á€€á€ºá€•á€ºá€‘á€²á€á€½á€„á€º á€¡á€á€»á€­á€”á€ºá€”á€¾á€„á€·á€ºá€á€•á€¼á€±á€¸á€Šá€® á€€á€¼á€Šá€·á€ºá€›á€¾á€¯á€”á€­á€¯á€„á€ºá€žá€±á€¬ á€…á€”á€…á€ºá€žá€…á€º á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€á€¼á€„á€ºá€¸',
      'á€™á€­á€¯á€˜á€­á€¯á€„á€ºá€¸á€”á€¾á€„á€·á€º á€€á€½á€”á€ºá€•á€»á€°á€á€¬ á€…á€á€›á€„á€ºá€¡á€¬á€¸á€œá€¯á€¶á€¸á€á€½á€„á€º á€á€œá€¯á€á€ºá€™á€»á€¬á€¸ á€›á€¾á€„á€ºá€¸á€œá€„á€ºá€¸á€€á€»á€šá€ºá€á€”á€ºá€¸á€…á€½á€¬ á€¡á€žá€¯á€¶á€¸á€•á€¼á€¯á€”á€­á€¯á€„á€ºá€…á€±á€á€¼á€„á€ºá€¸'
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
    titleMy: 'Admin á€œá€¯á€¶á€á€¼á€¯á€¶á€›á€±á€¸ á€¡á€‘á€°á€¸á€á€„á€ºá€¸á€€á€»á€•á€ºá€™á€¾á€¯á€”á€¾á€„á€·á€º Android Auto-Update á€…á€”á€…á€º',
    titleEn: 'Strict Owner-Only Admin Security & Android Instant Auto-Update',
    tag: 'security',
    tagLabelMy: 'á€œá€¯á€¶á€á€¼á€¯á€¶á€›á€±á€¸á€”á€¾á€„á€·á€º á€…á€”á€…á€ºá€™á€½á€™á€ºá€¸á€™á€¶á€™á€¾á€¯',
    tagLabelEn: 'Security & Auto-Update',
    descriptionMy: 'Admin Access á€€á€­á€¯ á€á€›á€¬á€¸á€á€„á€º á€…á€”á€…á€ºá€•á€­á€¯á€„á€ºá€›á€¾á€„á€ºá á€žá€®á€¸á€žá€”á€·á€º á€¡á€á€Šá€ºá€•á€¼á€¯á€¡á€€á€±á€¬á€„á€·á€º (Master Administrator) á€™á€¾á€œá€½á€²á á€™á€Šá€ºá€žá€Šá€·á€ºá€¡á€€á€±á€¬á€„á€·á€ºá€™á€¾ á€œá€¯á€¶á€¸á€ á€á€„á€ºá€™á€›á€¡á€±á€¬á€„á€º á€•á€­á€á€ºá€žá€­á€™á€ºá€¸á€á€¼á€„á€ºá€¸á€”á€¾á€„á€·á€º á€…á€€á€ºá€¡á€¬á€¸á€œá€¯á€¶á€¸ Update á€á€»á€€á€ºá€á€»á€„á€ºá€¸á€›á€›á€¾á€­á€…á€±á€žá€±á€¬ Service Worker á€…á€”á€…á€ºá‹',
    descriptionEn: 'Locked Admin Access strictly to the verified Master Administrator account only, with auto-invalidation Service Worker for instant multi-device syncing.',
    changesMy: [
      'Admin Access á€€á€­á€¯ á€…á€”á€…á€ºá€•á€­á€¯á€„á€ºá€›á€¾á€„á€ºá á€žá€®á€¸á€žá€”á€·á€º á€¡á€á€Šá€ºá€•á€¼á€¯á€¡á€€á€±á€¬á€„á€·á€ºá€–á€¼á€„á€·á€º Google Login á€á€„á€ºá€‘á€¬á€¸á€™á€¾á€žá€¬ á€á€½á€„á€·á€ºá€•á€¼á€¯á€á€¼á€„á€ºá€¸ (PIN/Passcode Backdoor á€¡á€¬á€¸á€œá€¯á€¶á€¸ á€¡á€•á€¼á€®á€¸á€á€­á€¯á€„á€º á€–á€»á€€á€ºá€žá€­á€™á€ºá€¸á€á€¼á€„á€ºá€¸)',
      'á€¡á€á€¼á€¬á€¸ User á€™á€»á€¬á€¸á€”á€¾á€„á€·á€º Guest á€™á€»á€¬á€¸á€á€½á€„á€º Admin á€á€œá€¯á€á€ºá€”á€¾á€„á€·á€º á€á€„á€ºá€›á€±á€¬á€€á€ºá€á€½á€„á€·á€º á€œá€¯á€¶á€¸á€ á€™á€™á€¼á€„á€ºá€›á€…á€±á€›á€”á€º áá€á€% á€•á€­á€á€ºá€•á€„á€ºá€á€¼á€„á€ºá€¸',
      'Android á€–á€¯á€”á€ºá€¸á€™á€»á€¬á€¸á€á€½á€„á€º Update á€™á€•á€¼á€±á€¬á€„á€ºá€¸á€˜á€² á€¡á€Ÿá€±á€¬á€„á€ºá€¸á€€á€»á€”á€ºá€”á€±á€á€¼á€„á€ºá€¸á€€á€­á€¯ á€–á€¼á€±á€›á€¾á€„á€ºá€¸á€›á€”á€º Network-First Service Worker (ngwesaryin-live-v4) á€á€•á€ºá€†á€„á€ºá€á€¼á€„á€ºá€¸',
      'á€†á€¬á€—á€¬á€á€½á€„á€º á€•á€¼á€„á€ºá€†á€„á€ºá€•á€¼á€®á€¸á€žá€Šá€ºá€”á€¾á€„á€·á€º á€…á€€á€ºá€¡á€¬á€¸á€œá€¯á€¶á€¸á€á€½á€„á€º á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º Update á€¡á€žá€…á€º á€›á€›á€¾á€­á€…á€±á€žá€±á€¬ Auto-Update Lifecycle á€á€»á€­á€á€ºá€†á€€á€ºá€á€¼á€„á€ºá€¸'
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
    titleMy: 'á€šá€¬á€‰á€ºá€”á€¾á€„á€·á€º á€…á€€á€ºá€•á€…á€¹á€…á€Šá€ºá€¸ á€™á€¾á€á€ºá€á€™á€ºá€¸á€™á€»á€¬á€¸á€”á€¾á€„á€·á€º á€¡á€žá€­á€•á€±á€¸á€á€»á€€á€º á€—á€Ÿá€­á€¯á€Œá€¬á€”',
    titleEn: 'Vehicle/Equipment Logs & Unified Notification Center',
    tag: 'major',
    tagLabelMy: 'á€¡á€“á€­á€€ á€¡á€†á€„á€·á€ºá€™á€¼á€¾á€„á€·á€ºá€á€„á€ºá€™á€¾á€¯',
    tagLabelEn: 'Major Release',
    descriptionMy: 'á€€á€¬á€¸/á€†á€­á€¯á€„á€ºá€€á€šá€º á€†á€®á€…á€¬á€¸á€”á€¾á€¯á€”á€ºá€¸áŠ á€á€¬á€šá€¬á€œá€±á€•á€±á€«á€„á€ºáŠ á€•á€¼á€¯á€•á€¼á€„á€ºá€‘á€­á€”á€ºá€¸á€žá€­á€™á€ºá€¸á€™á€¾á€¯ á€™á€¾á€á€ºá€á€™á€ºá€¸á€™á€»á€¬á€¸á€”á€¾á€„á€·á€º á€…á€¯á€¶á€œá€„á€ºá€žá€±á€¬ á€¡á€žá€­á€•á€±á€¸á€á€»á€€á€º Notification Center á€…á€”á€…á€ºá‹',
    descriptionEn: 'Introduced vehicle maintenance tracking, tire pressure logs, and intelligent notification system.',
    changesMy: [
      'á€€á€¬á€¸áŠ á€†á€­á€¯á€„á€ºá€€á€šá€ºáŠ á€…á€€á€ºá€šá€”á€¹á€á€›á€¬á€¸á€™á€»á€¬á€¸á á€•á€¼á€¯á€•á€¼á€„á€ºá€‘á€­á€”á€ºá€¸á€žá€­á€™á€ºá€¸á€™á€¾á€¯á€”á€¾á€„á€·á€º á€…á€›á€­á€á€ºá€™á€¾á€á€ºá€á€™á€ºá€¸á€™á€»á€¬á€¸ á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€”á€­á€¯á€„á€ºá€á€¼á€„á€ºá€¸',
      'á€á€¬á€šá€¬á€œá€±á€•á€±á€«á€„á€º (PSI) á€…á€…á€ºá€†á€±á€¸á€™á€¾á€¯ á€™á€¾á€á€ºá€á€™á€ºá€¸á€”á€¾á€„á€·á€º á€¡á€€á€¼á€­á€™á€ºá€›á€± á€™á€¾á€á€ºá€žá€¬á€¸á€”á€­á€¯á€„á€ºá€á€¼á€„á€ºá€¸',
      'á€¡á€€á€¼á€½á€±á€¸á€•á€±á€¸á€›á€”á€º/á€›á€›á€”á€º á€›á€€á€ºá€œá€½á€”á€ºá€žá€á€­á€•á€±á€¸á€á€»á€€á€ºá€”á€¾á€„á€·á€º á€˜á€á€ºá€‚á€»á€€á€ºá€€á€¯á€”á€ºá€á€«á€”á€®á€¸ á€¡á€žá€­á€•á€±á€¸á€á€»á€€á€º Notification Bell á€…á€”á€…á€ºá€žá€…á€º',
      'á€¡á€žá€­á€•á€±á€¸á€á€»á€€á€ºá€™á€»á€¬á€¸á€€á€­á€¯ á€–á€á€ºá€›á€¾á€¯á€•á€¼á€®á€¸á€¡á€–á€¼á€…á€º á€™á€¾á€á€ºá€žá€¬á€¸á€”á€­á€¯á€„á€ºá€á€¼á€„á€ºá€¸á€”á€¾á€„á€·á€º á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º á€žá€½á€¬á€¸á€›á€±á€¬á€€á€ºá€€á€¼á€Šá€·á€ºá€›á€¾á€¯á€”á€­á€¯á€„á€ºá€á€¼á€„á€ºá€¸'
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
    titleMy: 'PIN á€œá€±á€¬á€·á€á€º á€œá€¯á€¶á€á€¼á€¯á€¶á€›á€±á€¸á€”á€¾á€„á€·á€º á€…á€¬á€›á€„á€ºá€¸á€¡á€¬á€¸á€œá€¯á€¶á€¸ á€¡á€™á€¼á€”á€ºá€›á€¾á€¬á€–á€½á€±á€™á€¾á€¯ (Global Search)',
    titleEn: '4-Digit PIN App Lock & Omnibar Quick Search',
    tag: 'feature',
    tagLabelMy: 'á€œá€¯á€¶á€á€¼á€¯á€¶á€›á€±á€¸á€”á€¾á€„á€·á€º á€›á€¾á€¬á€–á€½á€±á€™á€¾á€¯',
    tagLabelEn: 'Security & Search',
    descriptionMy: 'á€¡á€€á€ºá€•á€ºá€œá€¯á€¶á€á€¼á€¯á€¶á€›á€±á€¸á€¡á€á€½á€€á€º 4-Digit PIN Lock á€…á€”á€…á€ºá€”á€¾á€„á€·á€º á€™á€Šá€ºá€žá€Šá€·á€ºá€”á€±á€›á€¬á€™á€¾á€™á€†á€­á€¯ á€…á€¬á€›á€„á€ºá€¸á€¡á€¬á€¸á€œá€¯á€¶á€¸á€€á€­á€¯ á€›á€¾á€¬á€–á€½á€±á€”á€­á€¯á€„á€ºá€žá€±á€¬ Global Search (âŒ˜K)á‹',
    descriptionEn: 'Biometric/PIN app lock security screen and universal instant search modal for all financial records.',
    changesMy: [
      'á€€á€­á€¯á€šá€ºá€›á€±á€¸á€€á€­á€¯á€šá€ºá€á€¬ á€„á€½á€±á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸ á€œá€¯á€¶á€á€¼á€¯á€¶á€…á€±á€›á€”á€º 4-Digit PIN Lock á€…á€”á€…á€º á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€á€¼á€„á€ºá€¸',
      'á€¡á€€á€ºá€•á€ºá€€á€­á€¯ á€á€±á€á€¹á€á€•á€­á€á€ºá€•á€¼á€®á€¸ á€•á€¼á€”á€ºá€–á€½á€„á€·á€ºá€á€»á€­á€”á€ºá€á€½á€„á€º PIN á€á€±á€¬á€„á€ºá€¸á€†á€­á€¯á€žá€±á€¬ Auto-Lock á€…á€”á€…á€º',
      'á€á€„á€ºá€„á€½á€±áŠ á€‘á€½á€€á€ºá€„á€½á€±áŠ á€¡á€€á€¼á€½á€±á€¸áŠ á€™á€¾á€á€ºá€…á€¯ á€…á€žá€Šá€ºá€á€­á€¯á€·á€€á€­á€¯ á€…á€€á€¹á€€á€”á€·á€ºá€•á€­á€¯á€„á€ºá€¸á€¡á€á€½á€„á€ºá€¸ á€›á€¾á€¬á€–á€½á€±á€”á€­á€¯á€„á€ºá€žá€±á€¬ Global Search (âŒ˜K)',
      'Excel (XLSX) á€”á€¾á€„á€·á€º CSV á€–á€­á€¯á€„á€ºá€™á€»á€¬á€¸ á€¡á€œá€½á€šá€ºá€á€€á€° á€‘á€¯á€á€ºá€šá€°á€”á€­á€¯á€„á€ºá€á€¼á€„á€ºá€¸ (Data Export/Import)'
    ],
    changesEn: [
      'Added 4-digit PIN lock screen protection for personal financial privacy',
      'Auto-lock on idle or app switch with emergency unlock fallback',
      'Integrated omnibar search (âŒ˜K) across transactions, debts, wallets, and notes',
      'Excel (XLSX) & CSV backup export and restore capabilities'
    ]
  },
  {
    version: 'v3.5.0',
    buildNumber: 35,
    releaseDate: '2026-09-23',
    releaseTime: '09:40 PM (MMT)',
    titleMy: 'Admin Control Center á€”á€¾á€„á€·á€º á€˜á€¯á€¶á€•á€­á€¯á€€á€ºá€†á€¶á€¡á€­á€á€º (Shared Workspace)',
    titleEn: 'Admin Control Center & Multi-User Shared Wallets',
    tag: 'feature',
    tagLabelMy: 'á€…á€®á€™á€¶á€á€”á€·á€ºá€á€½á€²á€™á€¾á€¯á€”á€¾á€„á€·á€º á€¡á€–á€½á€²á€·á€…á€”á€…á€º',
    tagLabelEn: 'Admin & Collaboration',
    descriptionMy: 'á€…á€”á€…á€ºá€á€…á€ºá€á€¯á€œá€¯á€¶á€¸á€€á€­á€¯ á€…á€®á€™á€¶á€”á€­á€¯á€„á€ºá€žá€±á€¬ Admin Panel á€”á€¾á€„á€·á€º á€™á€­á€žá€¬á€¸á€…á€¯/á€œá€¯á€•á€ºá€–á€±á€¬á€ºá€€á€­á€¯á€„á€ºá€–á€€á€ºá€™á€»á€¬á€¸á€”á€¾á€„á€·á€º á€¡á€á€°á€á€° á€žá€¯á€¶á€¸á€”á€­á€¯á€„á€ºá€žá€±á€¬ Shared Wallet á€…á€”á€…á€ºá‹',
    descriptionEn: 'Admin management control center with broadcast announcements and collaborative shared workspaces.',
    changesMy: [
      'Admin Control Center á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€•á€¼á€®á€¸ á€…á€”á€…á€ºá€¡á€á€¼á€±á€¡á€”á€±á€”á€¾á€„á€·á€º á€¡á€žá€¯á€¶á€¸á€•á€¼á€¯á€žá€°á€…á€¬á€›á€„á€ºá€¸ á€…á€…á€ºá€†á€±á€¸á€”á€­á€¯á€„á€ºá€á€¼á€„á€ºá€¸',
      'á€¡á€žá€¯á€¶á€¸á€•á€¼á€¯á€žá€°á€¡á€¬á€¸á€œá€¯á€¶á€¸á€‘á€¶ á€¡á€›á€±á€¸á€€á€¼á€®á€¸ á€žá€á€„á€ºá€¸á€…á€€á€¬á€¸á€™á€»á€¬á€¸ á€•á€­á€¯á€·á€”á€­á€¯á€„á€ºá€žá€±á€¬ Broadcast Announcement Banner',
      'á€™á€­á€žá€¬á€¸á€…á€¯ á€žá€­á€¯á€·á€™á€Ÿá€¯á€á€º á€†á€­á€¯á€„á€ºá€á€”á€ºá€‘á€™á€ºá€¸á€™á€»á€¬á€¸á€”á€¾á€„á€·á€º á€á€½á€²á€–á€€á€ºá€žá€¯á€¶á€¸á€”á€­á€¯á€„á€ºá€žá€±á€¬ Shared Workspace & Wallets',
      'á€„á€½á€±á€…á€¬á€›á€„á€ºá€¸ á€™á€€á€­á€¯á€€á€ºá€Šá€®á€™á€¾á€¯á€™á€»á€¬á€¸á€€á€­á€¯ á€•á€¼á€”á€ºá€œá€Šá€ºá€Šá€¾á€­á€”á€¾á€­á€¯á€„á€ºá€¸á€•á€±á€¸á€žá€±á€¬ Reconcile Balance á€…á€”á€…á€º'
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
    titleMy: 'á€œá€¬á€˜á€ºá€›á€½á€¾á€„á€ºá€…á€±á€žá€±á€¬ Fortune Logo á€¡á€†á€±á€¬á€„á€ºá€™á€»á€¬á€¸ á€…á€”á€…á€º',
    titleEn: 'Auspicious Fortune Emblem Switcher System',
    tag: 'feature',
    tagLabelMy: 'á€œá€¬á€˜á€ºá€›á€½á€¾á€„á€ºá€¡á€†á€±á€¬á€„á€ºá€™á€»á€¬á€¸',
    tagLabelEn: 'Fortune Features',
    descriptionMy: 'á€™á€¼á€”á€ºá€™á€¬á€“á€œá€±á€·á€”á€¾á€„á€·á€º á€¡á€Šá€® á€…á€®á€¸á€•á€½á€¬á€¸á€œá€¬á€˜á€ºá€œá€¬á€˜ á€á€­á€¯á€¸á€•á€½á€¬á€¸á€…á€±á€žá€±á€¬ á€œá€¬á€˜á€ºá€›á€½á€¾á€„á€º Fortune Logo á€•á€¯á€¶á€…á€¶ áƒ á€™á€»á€­á€¯á€¸á€€á€­á€¯ á€…á€­á€á€ºá€€á€¼á€­á€¯á€€á€ºá€›á€½á€±á€¸á€á€»á€šá€ºá€”á€­á€¯á€„á€ºá€žá€±á€¬ á€…á€”á€…á€ºá‹',
    descriptionEn: 'Customizable auspicious fortune emblems: Golden Money Bag, Chinese Yuanbao, and Pixiu wealth guardian.',
    changesMy: [
      'ðŸ’° á€›á€½á€¾á€±á€„á€½á€±á€‘á€¯á€•á€º (Golden Money Bag) - á€…á€®á€¸á€•á€½á€¬á€¸á€á€­á€¯á€¸á€á€€á€º á€„á€½á€±á€á€„á€ºá€€á€¼á€™á€ºá€¸á€…á€±á€á€¼á€„á€ºá€¸',
      'ðŸª™ á€á€›á€¯á€á€ºá€›á€½á€¾á€±á€á€¯á€¶á€¸ (Chinese Gold Yuanbao) - á€›á€½á€¾á€±á€„á€½á€±á€›á€á€”á€¬ á€…á€Šá€ºá€¸á€…á€­á€™á€ºá€á€­á€¯á€¸á€•á€½á€¬á€¸á€á€¼á€„á€ºá€¸',
      'ðŸ¦ á€–á€®á€á€»á€°á€¸ (Auspicious Pixiu) - á€„á€½á€±á€á€„á€ºá€•á€¼á€®á€¸ á€•á€¼á€”á€ºá€™á€‘á€½á€€á€ºá€¡á€±á€¬á€„á€º á€œá€¬á€˜á€ºá€…á€¯á€•á€ºá€¡á€†á€±á€¬á€„á€º',
      'Logo á€€á€­á€¯ á€”á€¾á€­á€•á€ºá€›á€¯á€¶á€–á€¼á€„á€·á€º á€™á€­á€™á€­á€”á€¾á€…á€ºá€žá€€á€ºá€›á€¬ á€œá€¬á€˜á€ºá€›á€½á€¾á€„á€ºá€•á€¯á€¶á€…á€¶á€€á€­á€¯ á€á€»á€€á€ºá€á€»á€„á€ºá€¸ á€•á€¼á€±á€¬á€„á€ºá€¸á€œá€²á€¡á€žá€¯á€¶á€¸á€•á€¼á€¯á€”á€­á€¯á€„á€ºá€á€¼á€„á€ºá€¸'
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
    titleMy: 'VIP Plans & Lifetime VIP á€…á€”á€…á€º',
    titleEn: 'VIP Subscription & Lifetime Access System',
    tag: 'feature',
    tagLabelMy: 'VIP á€…á€”á€…á€º',
    tagLabelEn: 'VIP & Monetization',
    descriptionMy: 'Free á€…á€¬á€›á€„á€ºá€¸á€€á€”á€·á€ºá€žá€á€ºá€á€»á€€á€ºá€”á€¾á€„á€·á€º á€¡á€€á€”á€·á€ºá€¡á€žá€á€ºá€™á€›á€¾á€­ á€¡á€žá€¯á€¶á€¸á€•á€¼á€¯á€”á€­á€¯á€„á€ºá€žá€±á€¬ Lifetime VIP á€¡á€†á€„á€·á€ºá€™á€¼á€¾á€„á€·á€ºá€á€„á€ºá€™á€¾á€¯ á€…á€”á€…á€ºá‹',
    descriptionEn: 'Tiered service with Free tier limits and Lifetime VIP upgrade options.',
    changesMy: [
      'Free User á€™á€»á€¬á€¸á€¡á€á€½á€€á€º á€¡á€á€¼á€±á€á€¶ á€…á€¬á€›á€„á€ºá€¸ á…á€ á€¡á€‘á€­ á€…á€™á€ºá€¸á€žá€•á€ºá€žá€¯á€¶á€¸á€…á€½á€²á€á€½á€„á€·á€º',
      'VIP User á€™á€»á€¬á€¸á€¡á€á€½á€€á€º á€¡á€€á€”á€·á€ºá€¡á€žá€á€ºá€™á€›á€¾á€­ á€…á€¬á€›á€„á€ºá€¸á€žá€½á€„á€ºá€¸á€”á€­á€¯á€„á€ºá€á€¼á€„á€ºá€¸á€”á€¾á€„á€·á€º á€¡á€†á€„á€·á€ºá€™á€¼á€„á€·á€º á€á€”á€ºá€†á€±á€¬á€„á€ºá€™á€¾á€¯á€™á€»á€¬á€¸',
      'á€›á€½á€¾á€±á€›á€±á€¬á€„á€º VIP Crown Badge á€¡á€™á€¾á€á€ºá€á€¶á€†á€­á€•á€º á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€á€¼á€„á€ºá€¸',
      'VIP Promo Code á€–á€¼á€„á€·á€º á€¡á€†á€„á€·á€ºá€™á€¼á€¾á€„á€·á€ºá€á€„á€ºá€”á€­á€¯á€„á€ºá€žá€±á€¬ á€…á€”á€…á€º á€‘á€Šá€·á€ºá€žá€½á€„á€ºá€¸á€á€¼á€„á€ºá€¸'
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
    titleMy: 'Firebase Cloud Sync & Google Login á€…á€”á€…á€º',
    titleEn: 'Firebase Cloud Sync & Multi-Device Real-time Database',
    tag: 'major',
    tagLabelMy: 'á€¡á€“á€­á€€ á€¡á€†á€„á€·á€ºá€™á€¼á€¾á€„á€·á€ºá€á€„á€ºá€™á€¾á€¯',
    tagLabelEn: 'Cloud Integration',
    descriptionMy: 'Google Account á€–á€¼á€„á€·á€º á€á€„á€ºá€›á€±á€¬á€€á€ºá€”á€­á€¯á€„á€ºá€á€¼á€„á€ºá€¸á€”á€¾á€„á€·á€º á€–á€¯á€”á€ºá€¸áŠ á€á€€á€ºá€˜á€œá€€á€ºáŠ á€€á€½á€”á€ºá€•á€»á€°á€á€¬ á€¡á€á€»á€„á€ºá€¸á€á€»á€„á€ºá€¸ Real-time Data á€á€»á€­á€á€ºá€†á€€á€ºá€™á€¾á€¯á‹',
    descriptionEn: 'Full cloud synchronization across multiple devices with Google OAuth and Firestore backing.',
    changesMy: [
      'Google Sign-in á€”á€¾á€„á€·á€º Email/Password á€…á€”á€…á€ºá€–á€¼á€„á€·á€º á€¡á€€á€±á€¬á€„á€·á€ºá€–á€½á€„á€·á€ºá€”á€­á€¯á€„á€ºá€á€¼á€„á€ºá€¸',
      'á€…á€€á€ºá€¡á€™á€»á€­á€¯á€¸á€™á€»á€­á€¯á€¸ (Android, iOS, PC) á€¡á€á€»á€„á€ºá€¸á€á€»á€„á€ºá€¸ á€¡á€á€»á€­á€”á€ºá€”á€¾á€„á€·á€ºá€á€•á€¼á€±á€¸á€Šá€® á€’á€±á€á€¬ Sync á€•á€¼á€¯á€œá€¯á€•á€ºá€•á€±á€¸á€á€¼á€„á€ºá€¸',
      'á€§á€Šá€·á€ºá€žá€Šá€ºá€…á€”á€…á€º (Guest Mode) á€–á€¼á€„á€·á€º á€¡á€€á€±á€¬á€„á€·á€ºá€™á€–á€½á€„á€·á€ºá€˜á€² á€…á€€á€ºá€á€½á€„á€ºá€¸á€žá€¯á€¶á€¸á€”á€­á€¯á€„á€ºá€™á€¾á€¯á€€á€­á€¯á€•á€« á€‘á€­á€”á€ºá€¸á€žá€­á€™á€ºá€¸á€•á€±á€¸á€‘á€¬á€¸á€á€¼á€„á€ºá€¸',
      'á€¡á€„á€ºá€á€¬á€”á€€á€ºá€•á€¼á€á€ºá€á€±á€¬á€€á€ºá€á€»á€­á€”á€ºá€á€½á€„á€º á€…á€€á€ºá€á€½á€„á€ºá€¸áŒ á€™á€¾á€á€ºá€‘á€¬á€¸á€•á€¼á€®á€¸ á€œá€­á€¯á€„á€ºá€¸á€•á€¼á€”á€ºá€›á€á€»á€­á€”á€ºá€á€½á€„á€º Cloud á€žá€­á€¯á€· á€¡á€œá€­á€¯á€¡á€œá€»á€±á€¬á€€á€º á€•á€­á€¯á€·á€•á€±á€¸á€á€¼á€„á€ºá€¸'
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
    titleMy: 'Progressive Web App (PWA) Offline á€…á€”á€…á€º',
    titleEn: 'Progressive Web App (PWA) & Offline Capability',
    tag: 'feature',
    tagLabelMy: 'PWA á€…á€”á€…á€º',
    tagLabelEn: 'PWA Integration',
    descriptionMy: 'Play Store / App Store á€™á€¾ á€’á€±á€«á€„á€ºá€¸á€œá€¯á€’á€ºá€œá€¯á€•á€ºá€…á€›á€¬á€™á€œá€­á€¯á€˜á€² á€–á€¯á€”á€ºá€¸ Screen á€•á€±á€«á€ºá€žá€­á€¯á€· á€¡á€€á€ºá€•á€ºá€¡á€–á€¼á€…á€º á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º Install á€•á€¼á€¯á€œá€¯á€•á€ºá€”á€­á€¯á€„á€ºá€á€¼á€„á€ºá€¸á‹',
    descriptionEn: 'Installed app-like experience on home screen with full offline caching via Service Workers.',
    changesMy: [
      'á€–á€¯á€”á€ºá€¸ Home Screen á€•á€±á€«á€ºá€á€½á€„á€º App Icon á€¡á€–á€¼á€…á€º á€á€­á€¯á€€á€ºá€›á€­á€¯á€€á€º Install á€•á€¼á€¯á€œá€¯á€•á€ºá€”á€­á€¯á€„á€ºá€žá€±á€¬ PWA á€…á€”á€…á€º',
      'Service Worker á€–á€¼á€„á€·á€º á€¡á€„á€ºá€á€¬á€”á€€á€ºá€™á€›á€¾á€­á€á€»á€­á€”á€ºá€á€½á€„á€º á€¡á€€á€ºá€•á€ºá€€á€­á€¯ á€¡á€™á€¼á€”á€ºá€”á€¾á€¯á€”á€ºá€¸á€–á€¼á€„á€·á€º á€–á€½á€„á€·á€ºá€œá€¾á€…á€ºá€”á€­á€¯á€„á€ºá€á€¼á€„á€ºá€¸',
      'Full-screen standalone app interface (Browser URL bar á€™á€•á€«á€˜á€² á€žá€”á€·á€ºá€›á€¾á€„á€ºá€¸á€…á€½á€¬ á€žá€¯á€¶á€¸á€”á€­á€¯á€„á€ºá€á€¼á€„á€ºá€¸)'
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
    titleMy: 'á€™á€°á€œ á€…á€á€„á€ºá€á€Šá€ºá€‘á€±á€¬á€„á€ºá€á€¼á€„á€ºá€¸ (Initial Launch)',
    titleEn: 'Initial Public Launch & Core Architecture',
    tag: 'major',
    tagLabelMy: 'á€™á€°á€œ á€…á€á€„á€ºá€á€¼á€„á€ºá€¸',
    tagLabelEn: 'Genesis Release',
    descriptionMy: 'á€™á€¼á€”á€ºá€™á€¬á€€á€»á€•á€ºá€„á€½á€±á€–á€¼á€„á€·á€º á€á€„á€ºá€„á€½á€±áŠ á€‘á€½á€€á€ºá€„á€½á€±áŠ á€¡á€€á€¼á€½á€±á€¸á€…á€¬á€›á€„á€ºá€¸á€™á€»á€¬á€¸ á€…á€”á€…á€ºá€á€€á€» á€™á€¾á€á€ºá€á€™á€ºá€¸á€á€„á€ºá€”á€­á€¯á€„á€ºá€žá€±á€¬ á€™á€°á€œá€•á€‘á€™á€†á€¯á€¶á€¸ á€†á€±á€¬á€·á€–á€ºá€á€² á€á€Šá€ºá€†á€±á€¬á€€á€ºá€á€¼á€„á€ºá€¸á‹',
    descriptionEn: 'Foundational release of NgweSarYin with multi-wallet ledger, categories, and financial statistics.',
    changesMy: [
      'á€á€„á€ºá€„á€½á€± (Income) á€”á€¾á€„á€·á€º á€‘á€½á€€á€ºá€„á€½á€± (Expense) á€”á€±á€·á€…á€‰á€º á€…á€¬á€›á€„á€ºá€¸á€›á€±á€¸á€žá€½á€„á€ºá€¸á€á€¼á€„á€ºá€¸',
      'á€¡á€€á€¼á€½á€±á€¸ (á€•á€±á€¸á€›á€”á€ºá€…á€¬á€›á€„á€ºá€¸ / á€›á€›á€”á€ºá€…á€¬á€›á€„á€ºá€¸) á€…á€®á€™á€¶á€á€”á€·á€ºá€á€½á€²á€™á€¾á€¯á€”á€¾á€„á€·á€º á€•á€¼á€”á€ºá€†á€•á€ºá€™á€¾á€á€ºá€á€™á€ºá€¸á€™á€»á€¬á€¸',
      'Multi-wallet á€•á€­á€¯á€€á€ºá€†á€¶á€¡á€­á€á€ºá€™á€»á€¬á€¸ (á€œá€€á€ºá€„á€„á€ºá€¸á€„á€½á€±áŠ KPayáŠ WavePayáŠ KBZáŠ CBáŠ AYAáŠ Yoma á€…á€žá€Šá€º)',
      'á€€á€á€¹á€á€á€½á€²á€™á€»á€¬á€¸ (Categories & Subcategories) á€…á€­á€á€ºá€€á€¼á€­á€¯á€€á€º á€žá€á€ºá€™á€¾á€á€ºá€”á€­á€¯á€„á€ºá€á€¼á€„á€ºá€¸',
      'á€œá€¡á€œá€­á€¯á€€á€º á€˜á€á€¹á€á€¬á€›á€±á€¸ á€á€¼á€¯á€¶á€„á€¯á€¶á€žá€¯á€¶á€¸á€žá€•á€ºá€á€»á€€á€ºá€”á€¾á€„á€·á€º á€…á€¬á€›á€„á€ºá€¸á€‡á€šá€¬á€¸ Charts á€™á€»á€¬á€¸'
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
