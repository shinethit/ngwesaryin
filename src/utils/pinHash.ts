// =============================================================
// Secure PIN Hashing Utilities (WebCrypto PBKDF2-SHA256)
// =============================================================

const PBKDF2_ITERATIONS = 200_000;
const PBKDF2_HASH = 'SHA-256';
const SALT_BYTES = 16;
const HASH_HEX_LENGTH = 64;

// ---------- Encoding helpers ----------

function bufToHex(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Convert a hex string to a Uint8Array.
 * Returns a fresh ArrayBuffer to satisfy strict BufferSource typing.
 */
function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/[^0-9a-fA-F]/g, '');
  const len = Math.floor(clean.length / 2);
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return bytes;
}

// ---------- Cryptographic helpers ----------

/**
 * Generate a cryptographically random salt (16 bytes, hex-encoded).
 */
export function generateSalt(): string {
  const bytes = new Uint8Array(SALT_BYTES);
  crypto.getRandomValues(bytes);
  return bufToHex(bytes.buffer as ArrayBuffer);
}

/**
 * Import PIN string as PBKDF2 key material.
 */
async function importPinKey(pin: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(pin) as BufferSource,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
}

/**
 * Hash a PIN with PBKDF2-SHA256 using the given salt.
 * Returns 64-char hex string.
 */
export async function hashPin(pin: string, salt: string): Promise<string> {
  if (!pin || !salt) {
    throw new Error('hashPin: pin and salt are required');
  }
  const key = await importPinKey(pin);
  const saltBytes = hexToBytes(salt);
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    key,
    256
  );
  return bufToHex(bits);
}

/**
 * Constant-time comparison of two hex strings.
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Verify a PIN against a stored hash+salt.
 */
export async function verifyPin(
  pin: string,
  salt: string,
  expectedHash: string
): Promise<boolean> {
  try {
    if (!pin || !salt || !expectedHash) return false;
    const actualHash = await hashPin(pin, salt);
    return constantTimeEqual(actualHash, expectedHash.toLowerCase());
  } catch (err) {
    console.warn('[verifyPin] error:', err);
    return false;
  }
}

// ---------- Legacy detection & migration ----------

/**
 * Detect legacy plaintext PIN format (4 digits, no salt).
 */
export function isLegacyPinFormat(settings: {
  pin?: string;
  pinSalt?: string;
} | null | undefined): boolean {
  if (!settings || !settings.pin) return false;
  return (
    settings.pin.length === 4 &&
    /^\d{4}$/.test(settings.pin) &&
    (!settings.pinSalt || settings.pinSalt.length === 0)
  );
}

/**
 * Check if the stored PIN looks like a hashed value.
 */
export function isHashedPinFormat(settings: {
  pin?: string;
  pinSalt?: string;
} | null | undefined): boolean {
  if (!settings || !settings.pin || !settings.pinSalt) return false;
  return (
    settings.pin.length === HASH_HEX_LENGTH &&
    /^[0-9a-fA-F]+$/.test(settings.pin) &&
    settings.pinSalt.length >= 16
  );
}

/**
 * Test helper — check if WebCrypto SubtleCrypto is available.
 */
export function isWebCryptoAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof crypto !== 'undefined' &&
    typeof crypto.subtle !== 'undefined' &&
    typeof crypto.getRandomValues === 'function'
  );
}