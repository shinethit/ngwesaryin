// [v7.6.15] Fuel line for Records rows and the record detail view.
//
// A fuel record's type / litres / station live on the linked FuelLog,
// not on the transaction itself, so the Records list never showed
// them. The join is FuelLog.transactionId === transaction id — the
// same join the entry form (TransactionModal) and the save handlers
// already use. Never match by date / amount / vehicle: two fills on
// one day at one station would collide. When no log is linked the
// line is '' and the row renders exactly as before.
import type { FuelLog } from '../types';

/** The FuelLog linked to a transaction, or undefined when none is. */
export function findFuelLogForTransaction(
  fuelLogs: FuelLog[] | undefined,
  transactionId: string,
): FuelLog | undefined {
  if (!fuelLogs) return undefined;
  return fuelLogs.find((f) => f.transactionId === transactionId);
}

/**
 * One-line fuel summary: `{fuelType} · {liters} လီတာ · {station}`.
 * Any empty part is omitted gracefully (no station ->
 * "Octane 92 · 10 လီတာ"). Litres are rendered EXACTLY as the
 * VehiclesView fuel-history rows render them — the stored number
 * verbatim, with no toLocaleString / toFixed reformatting. Fuel type
 * and station are shown as stored. Returns '' when there is no log
 * (or a log with nothing to show), so callers can gate on it.
 */
export function formatFuelRowLine(fuelLog: FuelLog | null | undefined): string {
  if (!fuelLog) return '';
  return fuelLineParts(fuelLog, false).join(' · ');
}

/**
 * [v7.6.20] Calendar variant: the Records line PLUS the per-litre
 * rate, so the Smart Calendar day detail shows at a glance what the
 * Records list shows plus the rate the list omits:
 * `{fuelType} · {liters} လီတာ · {pricePerLiter}/လီတာ · {station}`.
 * The rate renders verbatim (`3000/လီတာ`, no commas/rounding);
 * a missing/zero rate is omitted, and the result is '' when there
 * is no log (or nothing to show), exactly like formatFuelRowLine.
 * The Records list keeps calling formatFuelRowLine and is unchanged.
 */
export function formatFuelRowLineWithRate(
  fuelLog: FuelLog | null | undefined,
): string {
  if (!fuelLog) return '';
  return fuelLineParts(fuelLog, true).join(' · ');
}

/**
 * Shared part builder for both fuel-line variants: fuel type,
 * litres, [rate], station — in that order, each omitted gracefully
 * when missing. Litres and the rate render EXACTLY as stored
 * (verbatim numbers), like the VehiclesView fuel-history rows.
 */
function fuelLineParts(fuelLog: FuelLog, includeRate: boolean): string[] {
  const parts: string[] = [];
  const fuelType = (fuelLog.fuelType || '').trim();
  if (fuelType) parts.push(fuelType);
  if (typeof fuelLog.liters === 'number' && Number.isFinite(fuelLog.liters)) {
    parts.push(`${fuelLog.liters} လီတာ`);
  }
  if (
    includeRate &&
    typeof fuelLog.pricePerLiter === 'number' &&
    Number.isFinite(fuelLog.pricePerLiter) &&
    fuelLog.pricePerLiter > 0
  ) {
    parts.push(`${fuelLog.pricePerLiter}/လီတာ`);
  }
  const station = (fuelLog.gasStation || '').trim();
  if (station) parts.push(station);
  return parts;
}
