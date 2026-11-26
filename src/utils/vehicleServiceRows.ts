// [v7.5.93] Multi-row vehicle service entries — pure helpers shared by
// TransactionModal (rows UI / save) and useTransactionHandlers (per-type
// maintenance records). No Firebase / React imports: unit-testable.
//
// One visit can now carry several rows, each with its OWN service type
// (e.g. engine-oil + air-filter in one visit), so EACH service gets its
// own maintenance record — and its own next-due reminder — instead of
// the whole visit collapsing into the single main service type.

import type { TransactionItem, VehicleServiceType } from '../types';
import { SERVICE_TYPE_CONFIG } from './vehicleAnalytics';

/** The 18 service types a row can carry — every SERVICE_TYPE_CONFIG
 *  type EXCLUDING license_renewal (a licence visit has no parts rows),
 *  in SERVICE_TYPE_CONFIG order. */
export const ROW_SERVICE_TYPES: VehicleServiceType[] = (
  Object.keys(SERVICE_TYPE_CONFIG) as VehicleServiceType[]
).filter((t) => t !== 'license_renewal');

export interface ServiceRowGroup {
  serviceType: VehicleServiceType;
  rows: TransactionItem[];
  /** Sum of the group's row amounts — the record's cost for this type. */
  cost: number;
  /** [v7.6.49] Visit-level service fee carried by the FIRST group
   *  only (see applyLaborCostToRowGroups). Absent on every other
   *  group — labor is never split or duplicated across records. */
  laborCost?: number;
}

/**
 * Group VALID rows by their own service type. A row with no (or an
 * empty) serviceType falls back to `fallbackType` (the visit's main
 * type) — old items saved before per-row types carry none. Rows with
 * an empty name or quantity <= 0 are dropped. First-seen type order
 * is preserved; cost is the sum of that type's row amounts.
 */
export function groupServiceRowsByType(
  rows: TransactionItem[],
  fallbackType: VehicleServiceType,
): ServiceRowGroup[] {
  const groups: ServiceRowGroup[] = [];
  const byType = new Map<VehicleServiceType, ServiceRowGroup>();
  for (const row of rows || []) {
    if (!row || typeof row.name !== 'string' || !row.name.trim()) continue;
    if (!(Number(row.quantity) > 0)) continue;
    const type: VehicleServiceType =
      row.serviceType && row.serviceType.trim() !== ''
        ? row.serviceType
        : fallbackType;
    let group = byType.get(type);
    if (!group) {
      group = { serviceType: type, rows: [], cost: 0 };
      byType.set(type, group);
      groups.push(group);
    }
    group.rows.push(row);
    group.cost += Number(row.amount) || 0;
  }
  return groups;
}

/**
 * [v7.6.49] Fold a visit-level service fee (labor) into grouped
 * service rows. The WHOLE fee lands on the FIRST group (the
 * visit's primary record — the same record edit mode reopens),
 * so the groups' costs still sum to exactly the visit total
 * (parts + labor) and no total, analytic or sync amount changes.
 * Later groups are returned untouched. Zero / negative / missing
 * labor returns the groups unchanged (no zero-stored field, no
 * record carries laborCost). Pure: the input groups are not
 * mutated.
 */
export function applyLaborCostToRowGroups(
  groups: ServiceRowGroup[],
  laborCost: number | undefined,
): ServiceRowGroup[] {
  const labor = Number(laborCost) || 0;
  if (!Array.isArray(groups) || groups.length === 0 || !(labor > 0)) return groups;
  return groups.map((g, i) =>
    i === 0 ? { ...g, cost: g.cost + labor, laborCost: labor } : g,
  );
}

/** Default title when nothing more specific exists. */
export const DEFAULT_VEHICLE_SERVICE_TITLE = 'ယာဉ်ပြုပြင်ထိန်းသိမ်းမှု';

/**
 * Title for ONE per-type maintenance record of a visit.
 *
 * - The MAIN type's record: the visit title when typed, else the first
 *   row name of that type, else the extra note, else the default.
 * - Any OTHER type's record: the first row name of that type, else the
 *   extra note, else the default.
 */
export function resolvePerTypeTitle(
  mainTitle: string,
  mainType: VehicleServiceType,
  type: VehicleServiceType,
  typeRows: TransactionItem[],
  extraNote: string,
): string {
  const firstRowName =
    (typeRows || []).map((r) => (r.name || '').trim()).find((n) => n !== '') || '';
  if (type === mainType) {
    return (
      (mainTitle || '').trim() || firstRowName || (extraNote || '').trim() || DEFAULT_VEHICLE_SERVICE_TITLE
    );
  }
  return firstRowName || (extraNote || '').trim() || DEFAULT_VEHICLE_SERVICE_TITLE;
}

/**
 * Sub-category for a vehicle_service transaction — EXACTLY the
 * TransactionModal :1452-1454 rule, factored out so the modal and the
 * handlers share one truth: a picked sub-category wins (unless it is
 * the fuel one, which never applies here); otherwise tires →
 * sub_veh_tire, engine_oil → sub_veh_parts, anything else →
 * sub_veh_maintenance.
 */
export function resolveVehicleServiceSubCategory(
  mainType: VehicleServiceType,
  pickedSubCategory?: string | null,
): string {
  if (pickedSubCategory && pickedSubCategory !== 'sub_veh_fuel') {
    return pickedSubCategory;
  }
  if (mainType === 'tires') return 'sub_veh_tire';
  if (mainType === 'engine_oil') return 'sub_veh_parts';
  return 'sub_veh_maintenance';
}
