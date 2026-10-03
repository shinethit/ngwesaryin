import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  onSnapshot,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db, isQuotaExhausted, handleFirestoreError, OperationType, safeSetDoc, safeDeleteDoc } from './firebase';
import { VisitorDoc } from '../types';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/storage';

const VISITOR_ID_KEY = 'ngwe_visitor_id';
const SESSION_LOGGED_KEY = 'ngwe_session_logged';

/**
 * Convert ISO 2-letter Country Code to Flag Emoji (e.g. "MM" -> "🇲🇲")
 */
export function getCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

/**
 * Infer Country & City from TimeZone if API fails
 */
function inferGeoFromTimeZone(): { country: string; countryCode: string; city: string } {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.includes('Yangon') || tz.includes('Rangoon')) {
      return { country: 'Myanmar', countryCode: 'MM', city: 'Yangon' };
    } else if (tz.includes('Bangkok')) {
      return { country: 'Thailand', countryCode: 'TH', city: 'Bangkok' };
    } else if (tz.includes('Singapore')) {
      return { country: 'Singapore', countryCode: 'SG', city: 'Singapore' };
    } else if (tz.includes('Tokyo')) {
      return { country: 'Japan', countryCode: 'JP', city: 'Tokyo' };
    } else if (tz.includes('Kuala_Lumpur')) {
      return { country: 'Malaysia', countryCode: 'MY', city: 'Kuala Lumpur' };
    } else if (tz.includes('Seoul')) {
      return { country: 'South Korea', countryCode: 'KR', city: 'Seoul' };
    } else if (tz.includes('London')) {
      return { country: 'United Kingdom', countryCode: 'GB', city: 'London' };
    } else if (tz.includes('America')) {
      return { country: 'United States', countryCode: 'US', city: 'United States' };
    }
  } catch {
    // Ignore
  }
  return { country: 'Myanmar', countryCode: 'MM', city: 'Yangon' }; // Default for Ngwe Manager primary user base
}

/**
 * Fetch IP & Geo information safely with fallback
 */
async function fetchGeoLocation(): Promise<{
  country: string;
  countryCode: string;
  city: string;
  ip?: string;
}> {
  // 1. Check cache
  const cached = localStorage.getItem('ngwe_geo_cache');
  if (cached) {
    try {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
        return data;
      }
    } catch {}
  }

  // 2. Cache miss, fetch
  let result: any = null;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch('https://ipapi.co/json/', {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.country_name) {
        result = {
          country: data.country_name || 'Myanmar',
          countryCode: data.country_code || 'MM',
          city: data.city || 'Yangon',
          ip: data.ip || undefined,
        };
      }
    }
  } catch {
    // Try secondary API if ipapi.co fails or is blocked
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch('https://ip-api.com/json/?fields=country,countryCode,city,query', {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data.country) {
          result = {
            country: data.country,
            countryCode: data.countryCode || 'MM',
            city: data.city || 'Yangon',
            ip: data.query || undefined,
          };
        }
      }
    } catch {
      // Fallback
    }
  }

  if (!result) {
    result = fetchGeoLocationFallback();
  }

  // 3. Save to cache
  localStorage.setItem('ngwe_geo_cache', JSON.stringify({ data: result, timestamp: Date.now() }));
  return result;
}

function fetchGeoLocationFallback() {
  const inferred = inferGeoFromTimeZone();
  return {
    country: inferred.country,
    countryCode: inferred.countryCode,
    city: inferred.city,
  };
}

/**
 * Detect Device & Browser
 */
function getDeviceAndBrowserInfo(): {
  device: 'mobile' | 'desktop' | 'tablet';
  browser: string;
} {
  const ua = navigator.userAgent.toLowerCase();
  let device: 'mobile' | 'desktop' | 'tablet' = 'desktop';

  if (/ipad|tablet|playbook|silk/i.test(ua)) {
    device = 'tablet';
  } else if (/mobile|iphone|android|touch/i.test(ua)) {
    device = 'mobile';
  }

  let browser = 'Unknown';
  if (ua.includes('chrome')) browser = 'Chrome';
  else if (ua.includes('safari')) browser = 'Safari';
  else if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('edge')) browser = 'Edge';

  return { device, browser };
}

/**
 * Track Visitor & Guest Session
 */
export async function trackVisitorSession(user?: {
  uid: string;
  displayName?: string | null;
  email?: string | null;
} | null): Promise<void> {
  // If Firestore daily write quota is currently exhausted, do not attempt tracking
  if (isQuotaExhausted()) {
    return;
  }

  try {
    const isMember = Boolean(user?.uid);
    let targetDocId: string;

    if (isMember) {
      // 1. Registered member is ALWAYS tracked by their permanent account UID with u_ prefix
      targetDocId = `u_${user!.uid}`;

      // Clean up previous anonymous guest ID silently if this device previously had one
      const previousGuestId = safeGetItem(VISITOR_ID_KEY);
      if (previousGuestId && previousGuestId !== targetDocId) {
        if (previousGuestId.startsWith('v_') || previousGuestId.startsWith('g_')) {
          deleteDoc(doc(db, 'visitors', previousGuestId)).catch(() => {});
        }
        safeRemoveItem(VISITOR_ID_KEY);
      }

      // Also clean up any legacy raw-UID visitor doc (without u_ prefix) silently
      if (user!.uid && user!.uid !== targetDocId) {
        deleteDoc(doc(db, 'visitors', user!.uid)).catch(() => {});
      }
    } else {
      // 2. Anonymous Guest Visitor - MUST strictly start with v_
      let guestId = safeGetItem(VISITOR_ID_KEY);
      if (!guestId || !guestId.startsWith('v_')) {
        guestId = `v_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        safeSetItem(VISITOR_ID_KEY, guestId);
      }
      targetDocId = guestId;
    }

    const sessionLogged = sessionStorage.getItem(`${SESSION_LOGGED_KEY}_${targetDocId}`);
    const isNewSession = !sessionLogged;

    if (isNewSession) {
      sessionStorage.setItem(`${SESSION_LOGGED_KEY}_${targetDocId}`, 'true');
    }

    // Fetch Geo & Device Details
    const geo = await fetchGeoLocation();
    const { device, browser } = getDeviceAndBrowserInfo();
    const now = Date.now();

    const docRef = doc(db, 'visitors', targetDocId);
    let prevData: VisitorDoc | null = null;

    try {
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        prevData = snapshot.data() as VisitorDoc;
      }
    } catch {
      // Continue even if getDoc fails
    }

    const prevCount = prevData?.visitCount || 0;
    const lastActive = prevData?.lastActiveAt || 0;
    const isStale = Date.now() - lastActive > 5 * 60 * 1000; // 5 minutes buffer

    if (!isNewSession && !isStale && prevData) {
      // Already tracked recently, skip writing to save daily Firestore write units
      return;
    }

    const newVisitCount = isNewSession ? prevCount + 1 : Math.max(1, prevCount);

    if (isMember) {
      // MEMBER PAYLOAD - Guaranteed isGuest: false, permanent user account data
      const payload: Record<string, any> = {
        id: targetDocId,
        isGuest: false,
        userId: user!.uid,
        userEmail: user!.email || prevData?.userEmail || '',
        userName: user!.displayName || user!.email?.split('@')[0] || prevData?.userName || 'Member',
        country: geo.country || prevData?.country || 'Myanmar',
        countryCode: geo.countryCode || prevData?.countryCode || 'MM',
        city: geo.city || prevData?.city || 'Yangon',
        device,
        browser,
        visitCount: newVisitCount,
        lastActiveAt: now,
      };

      if (geo.ip) payload.ip = geo.ip;
      if (!prevData?.firstSeenAt) payload.firstSeenAt = now;

      await setDoc(docRef, payload, { merge: true }).catch(() => {});
    } else {
      // GUEST PAYLOAD - Pure anonymous guest
      // Safety check: Never overwrite an existing member record or non-guest ID with guest data!
      if (!targetDocId.startsWith('v_') || prevData?.userId || prevData?.userEmail || prevData?.id?.startsWith('u_') || prevData?.isGuest === false) {
        const freshGuestId = `v_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        safeSetItem(VISITOR_ID_KEY, freshGuestId);
        const freshDocRef = doc(db, 'visitors', freshGuestId);
        const guestPayload: Record<string, any> = {
          id: freshGuestId,
          isGuest: true,
          userName: 'Guest Visitor',
          country: geo.country || 'Myanmar',
          countryCode: geo.countryCode || 'MM',
          city: geo.city || 'Yangon',
          device,
          browser,
          visitCount: 1,
          firstSeenAt: now,
          lastActiveAt: now,
        };
        if (geo.ip) guestPayload.ip = geo.ip;
        await setDoc(freshDocRef, guestPayload).catch(() => {});
        return;
      }

      const payload: Record<string, any> = {
        id: targetDocId,
        isGuest: true,
        userName: 'Guest Visitor',
        country: geo.country || prevData?.country || 'Myanmar',
        countryCode: geo.countryCode || prevData?.countryCode || 'MM',
        city: geo.city || prevData?.city || 'Yangon',
        device,
        browser,
        visitCount: newVisitCount,
        lastActiveAt: now,
      };

      if (geo.ip) payload.ip = geo.ip;
      if (!prevData?.firstSeenAt) payload.firstSeenAt = now;

      await setDoc(docRef, payload, { merge: true }).catch(() => {});
    }
  } catch (error) {
    // Visitor telemetry errors are non-critical and handled silently
  }
}

/**
 * Delete a visitor record from Firestore (Admin only)
 */
export async function deleteVisitorDoc(visitorId: string): Promise<boolean> {
  return await safeDeleteDoc(doc(db, 'visitors', visitorId));
}

/**
 * Real-time listener for Admin to fetch all visitors
 */
export function subscribeVisitors(
  onUpdate: (visitors: VisitorDoc[]) => void
): () => void {
  try {
    const q = query(collection(db, 'visitors'), orderBy('lastActiveAt', 'desc'), limit(150));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: VisitorDoc[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<VisitorDoc, 'id'>),
        }));
        onUpdate(list);
      },
      (err) => {
        console.warn('Error subscribing to visitors:', err);
        onUpdate([]);
      }
    );
  } catch {
    onUpdate([]);
    return () => {};
  }
}
