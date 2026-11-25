// [v7.6.45] One display-name rule for vehicles, shared by every save
// handler that stamps a vehicle name onto a log or transaction.
//
// Before this, each handler built `${name} (${plateNumber})` inline
// with no empty-plate guard, so a vehicle without a plate number
// produced "Starex ()" in auto-notes (and therefore in statement
// labels). The rule: parens only when a plate number exists.
// Stored values are never rewritten here — old "Starex ()" strings
// already saved are cleaned at DISPLAY time by
// cleanStoredVehicleName below.
export function formatVehicleDisplayName(
  vehicle: { name?: string; plateNumber?: string } | null | undefined,
  fallback = 'Vehicle',
): string {
  const name = (vehicle?.name || '').trim();
  if (!name) return fallback;
  const plate = (vehicle?.plateNumber || '').trim();
  return plate ? `${name} (${plate})` : name;
}

/**
 * Strip a stale empty-parens suffix left by pre-7.6.45 saves
 * ("Starex ()" -> "Starex"). Display-time only; the stored log is
 * untouched. A non-empty plate ("Starex (ABC-123)") is preserved.
 */
export function cleanStoredVehicleName(
  name: string | undefined | null,
): string {
  return (name || '').trim().replace(/\s*\(\s*\)\s*$/, '').trim();
}

/**
 * The auto-summary note for a fuel fill-up, identical in shape to
 * the VehiclesView handler's [v7.2.3] fallback:
 * `[ဆီထည့်စရိတ်] {vehicle} - {liters} L @ {price} Ks ({station})`.
 * Numbers use explicit en-US grouping so the note is identical on
 * every device locale. The station part is omitted when empty.
 * Returns '' when there is nothing to summarise (no litres), so
 * callers can skip stamping instead of writing "0 L".
 */
export function buildFuelAutoNote(args: {
  vehicleName: string;
  liters: number;
  pricePerLiter: number;
  gasStation?: string;
}): string {
  const { vehicleName, liters, pricePerLiter, gasStation } = args;
  if (!(liters > 0)) return '';
  const station = (gasStation || '').trim();
  return (
    `[ဆီထည့်စရိတ်] ${vehicleName} - ${liters.toLocaleString('en-US')} L @ ` +
    `${pricePerLiter.toLocaleString('en-US')} Ks${station ? ` (${station})` : ''}`
  );
}
