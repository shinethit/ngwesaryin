// =============================================================
// i18n dictionary — centralized Myanmar/English strings
// Pattern: add keys here, call t('section.key', lang) in code.
// =============================================================

export type Lang = 'my' | 'en';

type Entry = { my: string; en: string };

export const translations = {
  toast: {
    allDataCleared: {
      my: 'ဒေတာအားလုံးကို အပြီးတိုင် ရှင်းလင်းလိုက်ပါပြီ ✓',
      en: 'All data cleared successfully ✓',
    },
    backupSaved: {
      my: 'Backup သိမ်းဆည်းပြီးပါပြီ ✓',
      en: 'Backup downloaded ✓',
    },
    backupRestored: {
      my: 'Backup ကို အောင်မြင်စွာ ထည့်သွင်းပြီးပါပြီ ✓',
      en: 'Backup restored successfully ✓',
    },
    deleteCancelled: {
      my: 'ဖျက်ခြင်း ပယ်ဖျက်လိုက်ပါပြီ',
      en: 'Delete cancelled',
    },
    guestMode: {
      my: 'Guest Mode အဖြစ် အသုံးပြုနေပါသည်',
      en: 'Currently in Guest Mode',
    },
    freePlanActive: {
      my: 'Free Plan အဖြစ် အသုံးပြုနေပါသည်',
      en: 'Currently on Free Plan',
    },
    pinSet: {
      my: 'လုံခြုံရေး PIN သတ်မှတ်၍ အက်ပ်ကို လော့ခ်ချလိုက်ပါပြီ 🔒',
      en: 'PIN set and App locked 🔒',
    },
  },
  loading: {
    appStarting: {
      my: 'ငွေစာရင်း စနစ်ဖွင့်နေပါသည်...',
      en: 'Loading NgweSarYin...',
    },
    component: {
      my: 'ခဏစောင့်ပါ...',
      en: 'Loading component...',
    },
  },
  errors: {
    fileRead: {
      my: 'ဖိုင်ဖတ်ရာတွင် အမှားရှိပါသည်',
      en: 'Error reading backup file',
    },
  },
} as const;

/**
 * Translate a dot-path key into the current language.
 * Returns the key itself if not found (safe fallback — never crashes).
 */
export function t(path: string, lang: Lang): string {
  const parts = path.split('.');
  let current: any = translations;
  for (const p of parts) {
    if (current && typeof current === 'object' && p in current) {
      current = current[p];
    } else {
      console.warn('[i18n] Missing key: ' + path);
      return path;
    }
  }
  if (current && typeof current === 'object' && 'my' in current && 'en' in current) {
    return current[lang];
  }
  console.warn('[i18n] Key "' + path + '" does not resolve to { my, en }');
  return path;
}
