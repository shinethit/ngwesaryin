// [v7.6.03] Most-used vehicle entry type — the TransactionModal
// auto-selects this type once when a fresh entry opens on a
// vehicle-related category with no explicit initial model.
//
// Counting rule (most reliable sources first, no guessing):
// - FuelLog records count as 'fuel'; TirePressureLog records count
//   as 'tire_pressure'; VehicleMaintenance records count as 'tires'
//   when serviceType === 'tires' and as 'service' otherwise. A
//   multi-row service visit contributes one count to EACH distinct
//   row type it contains, because each row is its own record.
// - Transactions are a SECONDARY signal only, and only when they
//   are not already represented by a log: a transaction whose id
//   appears as a log's transactionId is the synced expense copy of
//   that log entry, so counting it too would double-count. An
//   unlinked fuel transaction (isFuelLog / fuelLiters / the fuel
//   sub-category) counts as 'fuel'; an unlinked maintenance
//   transaction counts as 'tires' only when it carries
//   isMaintenanceLog under the tire sub-category — the same reading
//   the modal's sub-category auto-switch already uses — and as
//   'service' under the other maintenance sub-categories.
// - A tire-pressure check with no linked log cannot be told apart
//   from a tire replacement: both sit under sub_veh_tire and the
//   Transaction type carries no tire-pressure flag. A bare
//   sub_veh_tire transaction with no maintenance flag is therefore
//   skipped rather than guessed at.
// - Tie: the tied type with the most recent activity wins.
//   Activity time is createdAt, falling back to the record date.
//   With no usable time at all, the fixed order below breaks the
//   tie deterministically. No history at all returns null, and the
//   modal stays on 'general' (today's behaviour).

import type {
  FuelLog,
  TirePressureLog,
  Transaction,
  VehicleMaintenance,
} from '../types';

export type VehicleEntryChoice = 'fuel' | 'service' | 'tires' | 'tire_pressure';

export interface VehicleHistoryInput {
  fuelLogs?: FuelLog[];
  vehicleMaintenance?: VehicleMaintenance[];
  tirePressureLogs?: TirePressureLog[];
  transactions?: Transaction[];
}

const CHOICE_ORDER: VehicleEntryChoice[] = ['fuel', 'service', 'tires', 'tire_pressure'];

const MAINTENANCE_SUB_CATEGORIES = new Set([
  'sub_veh_maintenance',
  'sub_veh_parts',
  'sub_veh_wash',
  'sub_veh_license',
  'sub_veh_tire',
]);

function recordTime(createdAt: unknown, date: unknown): number {
  if (typeof createdAt === 'number' && Number.isFinite(createdAt) && createdAt > 0) {
    return createdAt;
  }
  if (typeof date === 'string' && date) {
    const parsed = Date.parse(date);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

export function resolveMostUsedVehicleEntry(
  input: VehicleHistoryInput,
): VehicleEntryChoice | null {
  const fuelLogs = input.fuelLogs || [];
  const vehicleMaintenance = input.vehicleMaintenance || [];
  const tirePressureLogs = input.tirePressureLogs || [];
  const transactions = input.transactions || [];

  const counts: Record<VehicleEntryChoice, number> = {
    fuel: 0,
    service: 0,
    tires: 0,
    tire_pressure: 0,
  };
  const latest: Record<VehicleEntryChoice, number> = {
    fuel: 0,
    service: 0,
    tires: 0,
    tire_pressure: 0,
  };
  const bump = (choice: VehicleEntryChoice, time: number) => {
    counts[choice] += 1;
    if (time > latest[choice]) latest[choice] = time;
  };

  for (const log of fuelLogs) {
    bump('fuel', recordTime(log.createdAt, log.date));
  }
  for (const record of vehicleMaintenance) {
    bump(
      record.serviceType === 'tires' ? 'tires' : 'service',
      recordTime(record.createdAt, record.date),
    );
  }
  for (const log of tirePressureLogs) {
    bump('tire_pressure', recordTime(log.createdAt, log.date));
  }

  // Secondary signal: unlinked transactions only. A linked
  // transaction is the expense copy of a log entry already counted.
  const linkedTxIds = new Set<string>();
  for (const log of [...fuelLogs, ...vehicleMaintenance, ...tirePressureLogs]) {
    if (log.transactionId) linkedTxIds.add(log.transactionId);
  }
  for (const tx of transactions) {
    if (linkedTxIds.has(tx.id)) continue;
    const time = recordTime(tx.createdAt, tx.date);
    if (tx.isFuelLog || tx.fuelLiters != null || tx.subCategoryId === 'sub_veh_fuel') {
      bump('fuel', time);
    } else if (
      tx.isMaintenanceLog ||
      (tx.subCategoryId !== undefined &&
        tx.subCategoryId !== 'sub_veh_tire' &&
        MAINTENANCE_SUB_CATEGORIES.has(tx.subCategoryId))
    ) {
      bump(tx.subCategoryId === 'sub_veh_tire' ? 'tires' : 'service', time);
    }
    // Anything else (including a bare sub_veh_tire transaction with
    // no maintenance flag and no linked pressure log) is ambiguous
    // and is skipped — see the header note.
  }

  let winner: VehicleEntryChoice | null = null;
  for (const choice of CHOICE_ORDER) {
    if (counts[choice] === 0) continue;
    if (
      winner === null ||
      counts[choice] > counts[winner] ||
      (counts[choice] === counts[winner] && latest[choice] > latest[winner])
    ) {
      winner = choice;
    }
  }
  return winner;
}
