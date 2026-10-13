// =============================================================
// i18n dictionary — centralized multilingual strings
// Supported: Burmese (my), English (en), Chinese (zh), Thai (th)
// Pattern: add keys here, call t('section.key', lang) in code.
// Fallback: target lang -> English (never Burmese by accident).
// =============================================================

export type Lang = 'my' | 'en' | 'zh' | 'th';

export const SUPPORTED_LANGS: { code: Lang; labelEn: string; nativeLabel: string }[] = [
  { code: 'my', labelEn: 'Burmese', nativeLabel: 'မြန်မာ' },
  { code: 'en', labelEn: 'English', nativeLabel: 'English' },
  { code: 'zh', labelEn: 'Chinese', nativeLabel: '中文' },
  { code: 'th', labelEn: 'Thai', nativeLabel: 'ไทย' },
];

export const DEFAULT_LANG: Lang = 'my';

export const isValidLang = (v: unknown): v is Lang =>
  v === 'my' || v === 'en' || v === 'zh' || v === 'th';

// Documentation of intended shape. Only 'my' and 'en' are required;
// 'zh' and 'th' are optional and fall back to English.
type Entry = { my: string; en: string; zh?: string; th?: string };

export const translations = {
  toast: {
    allDataCleared: {
      my: 'ဒေတာအားလုံးကို အပြီးတိုင် ရှင်းလင်းလိုက်ပါပြီ ✓',
      en: 'All data cleared successfully ✓',
      zh: '所有数据已成功清除 ✓',
      th: 'ล้างข้อมูลทั้งหมดเรียบร้อยแล้ว ✓',
    },
    backupSaved: {
      my: 'Backup သိမ်းဆည်းပြီးပါပြီ ✓',
      en: 'Backup downloaded ✓',
      zh: '备份已下载 ✓',
      th: 'ดาวน์โหลดข้อมูลสำรองแล้ว ✓',
    },
    backupRestored: {
      my: 'Backup ကို အောင်မြင်စွာ ထည့်သွင်းပြီးပါပြီ ✓',
      en: 'Backup restored successfully ✓',
      zh: '备份恢复成功 ✓',
      th: 'กู้คืนข้อมูลสำรองเรียบร้อยแล้ว ✓',
    },
    deleteCancelled: {
      my: 'ဖျက်ခြင်း ပယ်ဖျက်လိုက်ပါပြီ',
      en: 'Delete cancelled',
      zh: '已取消删除',
      th: 'ยกเลิกการลบแล้ว',
    },
    guestMode: {
      my: 'Guest Mode အဖြစ် အသုံးပြုနေပါသည်',
      en: 'Currently in Guest Mode',
      zh: '当前为访客模式',
      th: 'กำลังใช้งานในโหมดผู้เยี่ยมชม',
    },
    freePlanActive: {
      my: 'Free Plan အဖြစ် အသုံးပြုနေပါသည်',
      en: 'Currently on Free Plan',
      zh: '当前使用免费套餐',
      th: 'กำลังใช้งานแพ็กเกจฟรี',
    },
    pinSet: {
      my: 'လုံခြုံရေး PIN သတ်မှတ်၍ အက်ပ်ကို လော့ခ်ချလိုက်ပါပြီ 🔒',
      en: 'PIN set and App locked 🔒',
      zh: '已设置 PIN 并锁定应用 🔒',
      th: 'ตั้งค่า PIN และล็อกแอปแล้ว 🔒',
    },
  },
  loading: {
    appStarting: {
      my: 'ငွေစာရင်း စနစ်ဖွင့်နေပါသည်...',
      en: 'Loading NgweSarYin...',
      zh: '正在加载 NgweSarYin...',
      th: 'กำลังโหลด NgweSarYin...',
    },
    component: {
      my: 'ခဏစောင့်ပါ...',
      en: 'Loading component...',
      zh: '正在加载组件...',
      th: 'กำลังโหลดคอมโพเนนต์...',
    },
  },
  errors: {
    fileRead: {
      my: 'ဖိုင်ဖတ်ရာတွင် အမှားရှိပါသည်',
      en: 'Error reading backup file',
      zh: '读取备份文件时出错',
      th: 'เกิดข้อผิดพลาดในการอ่านไฟล์สำรอง',
    },
  },
} as const;

/**
 * Translate a dot-path key into the current language.
 * Falls back to English if the target language has no translation.
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
    const target: unknown = current[lang];
    if (typeof target === 'string' && target.length > 0) return target;
    return current.en;
  }
  console.warn('[i18n] Key "' + path + '" does not resolve to { my, en }');
  return path;
}
