// [v7.6.36] iOS standalone print fallback. Root cause of the iOS
// failure: the export button set React state and window.print()
// ran later in an effect (double requestAnimationFrame), fully
// detached from the tap gesture — and an installed PWA
// (manifest display: standalone) has no print sheet on iOS at
// all, so window.print() is a silent no-op there. The fallback
// shows the statement full-screen with guidance + an
// open-in-browser link; the statement payload is persisted so a
// browser tab opened from the link can restore it and print.
// No new dependencies; pure functions take an explicit
// environment object so tests can pin the detection rules.
import type { StatementData } from './statementData';

export interface PrintEnvironment {
  userAgent: string;
  /** navigator.standalone (legacy iOS Safari flag). */
  standalone: boolean;
  /** matchMedia('(display-mode: standalone)').matches */
  displayModeStandalone: boolean;
  /** navigator.maxTouchPoints (iPadOS 13+ reports a Macintosh UA). */
  maxTouchPoints: number;
  hasPrintFunction: boolean;
}

/** iPhone / iPad / iPod, including iPadOS 13+ desktop-mode UAs. */
export function isIOS(
  env: Pick<PrintEnvironment, 'userAgent' | 'maxTouchPoints'>,
): boolean {
  if (/iPhone|iPad|iPod/.test(env.userAgent)) return true;
  return env.maxTouchPoints > 1 && /Macintosh/.test(env.userAgent);
}

/** True when window.print() cannot open a print sheet: no print
    function at all, or iOS running as an installed (standalone)
    app, where iOS offers no print UI. */
export function isPrintBlockedEnvironment(env: PrintEnvironment): boolean {
  if (!env.hasPrintFunction) return true;
  return isIOS(env) && (env.standalone || env.displayModeStandalone);
}

export function readPrintEnvironment(): PrintEnvironment {
  const nav =
    typeof navigator !== 'undefined' ? navigator : undefined;
  const ua = nav?.userAgent ?? '';
  const standalone =
    (nav as { standalone?: unknown } | undefined)?.standalone === true;
  let displayModeStandalone = false;
  try {
    displayModeStandalone =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(display-mode: standalone)').matches
        : false;
  } catch {
    displayModeStandalone = false;
  }
  return {
    userAgent: ua,
    standalone,
    displayModeStandalone,
    maxTouchPoints: nav?.maxTouchPoints ?? 0,
    hasPrintFunction:
      typeof window !== 'undefined' &&
      typeof window.print === 'function',
  };
}

export interface SavedStatementPreview {
  data: StatementData;
  lang: 'my' | 'en';
  walletScopeLabel: string;
  savedAt: number;
}

export const STATEMENT_PREVIEW_KEY = 'ngwe_statement_preview';
export const STATEMENT_PREVIEW_HASH = '#ngwe-print-preview';

export function saveStatementPreview(
  preview: SavedStatementPreview,
): void {
  try {
    localStorage.setItem(STATEMENT_PREVIEW_KEY, JSON.stringify(preview));
  } catch {
    // Storage full/blocked: the in-memory preview still shows; only
    // the open-in-browser restore is lost.
  }
}

export function loadStatementPreview(): SavedStatementPreview | null {
  try {
    const raw = localStorage.getItem(STATEMENT_PREVIEW_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedStatementPreview;
    if (!parsed || typeof parsed !== 'object' || !parsed.data) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearStatementPreview(): void {
  try {
    localStorage.removeItem(STATEMENT_PREVIEW_KEY);
  } catch {
    // Best-effort only.
  }
}

export function isPrintPreviewHash(hash: string): boolean {
  return hash === STATEMENT_PREVIEW_HASH;
}

/** URL that reopens the app in a real browser tab and restores the
    saved statement preview (used by the fallback's
    open-in-browser link). */
export function statementPreviewUrl(): string {
  if (typeof window === 'undefined') return STATEMENT_PREVIEW_HASH;
  return `${window.location.origin}${window.location.pathname}${STATEMENT_PREVIEW_HASH}`;
}
