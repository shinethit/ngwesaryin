// [v7.6.09] Named savings pots — tracking-only progress toward a
// named goal (e.g. "ဆိုင်ကယ် အသစ်"). A pot NEVER moves money: it
// creates no transaction, touches no wallet balance, and affects no
// budget, report or limit. savedAmount is always DERIVED (in minus
// out) — it is never stored separately, so it cannot diverge from
// the contributions list.
//
// Persistence mirrors MonthlySavingsTarget (the monthly target):
// the `ngwe_savings_pots` device key for everyone, plus the
// `savingsPots` field on the user document (merge:true) for
// signed-in users. The user-document root update rule allows an
// owner to update ordinary fields freely, and `savingsPots` is not
// among the restricted upgrade fields listed in the database rules,
// so no rules change is needed. IDs follow the app's existing
// pattern (`prefix_Date.now()_randomSuffix`, see useDebtHandlers /
// useTransactionHandlers).

export const SAVINGS_POTS_STORAGE_KEY = 'ngwe_savings_pots';
export const SAVINGS_POTS_CLOUD_FIELD = 'savingsPots';

export interface SavingsPotContribution {
  id: string;
  amount: number;
  type: 'in' | 'out';
  note?: string;
  date: string;
}

export interface SavingsPot {
  id: string;
  name: string;
  targetAmount: number;
  createdAt: number;
  archived?: boolean;
  contributions: SavingsPotContribution[];
}

export function newSavingsPotId(): string {
  return `pot_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function newSavingsPotContributionId(): string {
  return `potentry_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/** Today's date as a local YYYY-MM-DD string (never toISOString/UTC). */
export function todayLocalDateString(from: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${from.getFullYear()}-${pad(from.getMonth() + 1)}-${pad(from.getDate())}`;
}

/** Derived saved-so-far: sum of 'in' minus sum of 'out'. Never stored. */
export function getSavedAmount(pot: SavingsPot): number {
  return pot.contributions.reduce((sum, c) => {
    const amount = Number.isFinite(c.amount) ? c.amount : 0;
    return sum + (c.type === 'out' ? -amount : amount);
  }, 0);
}

export interface PotProgress {
  saved: number;
  /** Rounded whole percent; may exceed 100 when over-saved. */
  percent: number;
  /** Display percent, clamped to 0..100; `saved` itself stays exact. */
  clampedPercent: number;
  remaining: number;
  complete: boolean;
}

export function getPotProgress(pot: SavingsPot): PotProgress {
  const saved = getSavedAmount(pot);
  const percent = pot.targetAmount > 0 ? Math.round((saved / pot.targetAmount) * 100) : 0;
  return {
    saved,
    percent,
    clampedPercent: Math.min(100, Math.max(0, percent)),
    remaining: Math.max(0, pot.targetAmount - saved),
    complete: pot.targetAmount > 0 && saved >= pot.targetAmount,
  };
}

export function isPotComplete(pot: SavingsPot): boolean {
  return getPotProgress(pot).complete;
}

export type SavingsPotValidationError =
  | 'name-required'
  | 'target-invalid'
  | 'amount-invalid'
  | 'withdraw-exceeds';

/** Create/edit form: name must be non-blank, target must be > 0. */
export function validateSavingsPotInput(
  name: string,
  targetAmount: number,
): SavingsPotValidationError | null {
  if (name.trim() === '') return 'name-required';
  if (!Number.isFinite(targetAmount) || targetAmount <= 0) return 'target-invalid';
  return null;
}

/**
 * Contribution/withdrawal entry: amount must be > 0; a withdrawal may
 * never exceed the derived saved amount (saved can never go negative).
 */
export function validateSavingsPotEntry(
  amount: number,
  type: 'in' | 'out',
  saved: number,
): SavingsPotValidationError | null {
  if (!Number.isFinite(amount) || amount <= 0) return 'amount-invalid';
  if (type === 'out' && amount > saved) return 'withdraw-exceeds';
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sanitizeContribution(
  value: unknown,
  fallbackDate: string,
): SavingsPotContribution | null {
  if (!isRecord(value)) return null;
  if (value.type !== 'in' && value.type !== 'out') return null;
  const amount = value.amount;
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) return null;
  const date = value.date;
  const cleanDate =
    typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : fallbackDate;
  const note = typeof value.note === 'string' ? value.note.trim() : '';
  return {
    id: typeof value.id === 'string' && value.id !== '' ? value.id : newSavingsPotContributionId(),
    amount,
    type: value.type,
    ...(note !== '' ? { note } : {}),
    date: cleanDate,
  };
}

/**
 * Strict shape check for a persisted pots value (device-key JSON or
 * the user-document field). Duplicate names are allowed, so names are
 * never checked for uniqueness.
 */
export function isValidSavingsPots(value: unknown): value is SavingsPot[] {
  if (!Array.isArray(value)) return false;
  return value.every((pot) => {
    if (!isRecord(pot)) return false;
    if (typeof pot.id !== 'string' || pot.id === '') return false;
    if (typeof pot.name !== 'string' || pot.name.trim() === '') return false;
    if (typeof pot.targetAmount !== 'number' || !Number.isFinite(pot.targetAmount) || pot.targetAmount <= 0) return false;
    if (typeof pot.createdAt !== 'number' || !Number.isFinite(pot.createdAt)) return false;
    if (!Array.isArray(pot.contributions)) return false;
    const fallbackDate = todayLocalDateString(new Date(pot.createdAt));
    return pot.contributions.every((c) => sanitizeContribution(c, fallbackDate) !== null);
  });
}

/**
 * Coerce an unknown persisted value into clean pots, dropping
 * malformed pots/entries instead of crashing. Unknown extra fields
 * are dropped; `archived` is kept only when true.
 */
export function sanitizeSavingsPots(value: unknown): SavingsPot[] {
  if (!Array.isArray(value)) return [];
  const out: SavingsPot[] = [];
  for (const raw of value) {
    if (!isRecord(raw)) continue;
    if (typeof raw.id !== 'string' || raw.id === '') continue;
    if (typeof raw.name !== 'string' || raw.name.trim() === '') continue;
    if (typeof raw.targetAmount !== 'number' || !Number.isFinite(raw.targetAmount) || raw.targetAmount <= 0) continue;
    if (typeof raw.createdAt !== 'number' || !Number.isFinite(raw.createdAt)) continue;
    if (!Array.isArray(raw.contributions)) continue;
    const fallbackDate = todayLocalDateString(new Date(raw.createdAt));
    const contributions: SavingsPotContribution[] = [];
    for (const c of raw.contributions) {
      const clean = sanitizeContribution(c, fallbackDate);
      if (clean) contributions.push(clean);
    }
    out.push({
      id: raw.id,
      name: raw.name.trim(),
      targetAmount: raw.targetAmount,
      createdAt: raw.createdAt,
      ...(raw.archived === true ? { archived: true as const } : {}),
      contributions,
    });
  }
  return out;
}

/** Active-pots summary: archived pots are excluded but keep history. */
export function summarizeActivePots(pots: SavingsPot[]): {
  potCount: number;
  totalSaved: number;
  totalTarget: number;
  totalRemaining: number;
  completedCount: number;
} {
  const active = pots.filter((p) => p.archived !== true);
  let totalSaved = 0;
  let totalTarget = 0;
  let totalRemaining = 0;
  let completedCount = 0;
  for (const pot of active) {
    const progress = getPotProgress(pot);
    totalSaved += progress.saved;
    totalTarget += pot.targetAmount;
    totalRemaining += progress.remaining;
    if (progress.complete) completedCount += 1;
  }
  return { potCount: active.length, totalSaved, totalTarget, totalRemaining, completedCount };
}
