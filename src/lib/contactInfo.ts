import { doc, getDoc } from 'firebase/firestore';
import { db, safeSetDoc } from './firebase';
import { ContactInfo } from '../types';
import { safeGetItem, safeSetItem } from '../utils/storage';

export const DEFAULT_CONTACT_INFO: ContactInfo = {
  telegramUsername: '@ankhsam',
  telegramUrl: 'https://t.me/ankhsam',
  viberPhone: '09777123456',
  phone: '09777123456',
  kpayPhone: '09777123456',
  kpayName: 'Ngwe Manager Admin',
  wavePhone: '09777123456',
  waveName: 'Ngwe Manager Admin',
  contactNoteMy: 'Telegram သို့ ဆက်သွယ်၍ ငွေလွှဲပြေစာ ပို့ကာ Activation Code တောင်းယူပါ',
  contactNoteEn: 'Contact Telegram to pay & receive Activation Code',
};

const LOCAL_STORAGE_KEY = 'ngwe_contact_info';

// [v7.5.55 E16] Returns null when NOTHING could be read (no Firestore
// doc and no local cache). Callers must keep their previous values in
// that case — returning DEFAULT_CONTACT_INFO here used to let a save
// after a failed read push the placeholder number 09777123456 over the
// real saved number.
export async function fetchContactInfo(): Promise<ContactInfo | null> {
  // 1. Try Firestore
  try {
    const docRef = doc(db, 'systemSettings', 'contactInfo');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as ContactInfo;
      safeSetItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
      return { ...DEFAULT_CONTACT_INFO, ...data };
    }
  } catch (e) {
    console.warn('Could not fetch contactInfo from Firestore, falling back to local storage', e);
  }

  // 2. Fallback to LocalStorage
  try {
    const cached = safeGetItem(LOCAL_STORAGE_KEY);
    if (cached) {
      return { ...DEFAULT_CONTACT_INFO, ...JSON.parse(cached) };
    }
  } catch {
    // Ignore error
  }

  return null;
}

export async function saveContactInfo(info: ContactInfo): Promise<void> {
  const updatedInfo: ContactInfo = {
    ...info,
    updatedAt: new Date().toISOString(),
  };

  // Ensure telegramUrl is well formed
  // [v7.5.64 C-14] Clearing the username must clear the URL too — the
  // old URL used to keep pointing at the removed Telegram account.
  if (updatedInfo.telegramUsername) {
    const cleanUsername = updatedInfo.telegramUsername.replace(/^@/, '').trim();
    if (cleanUsername) {
      updatedInfo.telegramUrl = `https://t.me/${cleanUsername}`;
    } else {
      updatedInfo.telegramUrl = '';
    }
  } else {
    updatedInfo.telegramUrl = '';
  }

  // Save to Firestore — safeSetDoc returns false (never throws) on
  // permission/quota failure; surface that instead of pretending success.
  const docRef = doc(db, 'systemSettings', 'contactInfo');
  const ok = await safeSetDoc(docRef, updatedInfo, { merge: true });
  if (!ok) {
    throw new Error('Failed to save contact info to Firestore');
  }

  // Save to LocalStorage
  safeSetItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedInfo));
}
