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

export async function fetchContactInfo(): Promise<ContactInfo> {
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

  return DEFAULT_CONTACT_INFO;
}

export async function saveContactInfo(info: ContactInfo): Promise<void> {
  const updatedInfo: ContactInfo = {
    ...info,
    updatedAt: new Date().toISOString(),
  };

  // Ensure telegramUrl is well formed
  if (updatedInfo.telegramUsername) {
    const cleanUsername = updatedInfo.telegramUsername.replace(/^@/, '').trim();
    if (cleanUsername) {
      updatedInfo.telegramUrl = `https://t.me/${cleanUsername}`;
    }
  }

  // Save to Firestore
  const docRef = doc(db, 'systemSettings', 'contactInfo');
  await safeSetDoc(docRef, updatedInfo, { merge: true });

  // Save to LocalStorage
  safeSetItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedInfo));
}
