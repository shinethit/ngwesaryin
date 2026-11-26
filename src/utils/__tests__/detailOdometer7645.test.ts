// [v7.6.45] Part C — detail-modal odometer rows. The modal takes
// a parallel maintenance prop next to fuelLog, and BOTH callers
// resolve BOTH joins by transactionId. The fuel-line formatter is
// untouched (Records rows stay byte-identical). Wiring pins are
// source-text assertions (no test renderer in this repo; vitest
// node env). NO path comparisons: sources are read via
// new URL(..., import.meta.url).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  findFuelLogForTransaction,
  findMaintenanceLogForTransaction,
} from '../fuelRowLine';
import type { FuelLog, VehicleMaintenance } from '../../types';
import {
  VERSION_HISTORY,
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
} from '../../data/versionHistory';

const VERSION_JSON = JSON.parse(
  readFileSync(new URL('../../../public/version.json', import.meta.url), 'utf8'),
);

const MODAL_SRC = readFileSync(
  new URL('../../components/TransactionDetailModal.tsx', import.meta.url),
  'utf8',
);
const TX_SRC = readFileSync(
  new URL('../../components/TransactionsView.tsx', import.meta.url),
  'utf8',
);
const APP_SRC = readFileSync(new URL('../../App.tsx', import.meta.url), 'utf8');
const FUEL_LINE_SRC = readFileSync(new URL('../fuelRowLine.ts', import.meta.url), 'utf8');

const FUEL_LOGS = [
  { id: 'f1', transactionId: 'tx-fuel', odometer: 21193 },
  { id: 'f2', transactionId: 'tx-other', odometer: 100 },
] as unknown as FuelLog[];

const MAINT_LOGS = [
  { id: 'm1', transactionId: 'tx-maint', odometer: 45000 },
  { id: 'm2', transactionId: 'tx-other', odometer: 100 },
] as unknown as VehicleMaintenance[];

describe('maintenance log join (v7.6.45 Part C)', () => {
  it('finds the maintenance record by transactionId only', () => {
    expect(findMaintenanceLogForTransaction(MAINT_LOGS, 'tx-maint')?.id).toBe('m1');
    expect(findMaintenanceLogForTransaction(MAINT_LOGS, 'tx-missing')).toBeUndefined();
    expect(findMaintenanceLogForTransaction(undefined, 'tx-maint')).toBeUndefined();
    expect(findMaintenanceLogForTransaction([], 'tx-maint')).toBeUndefined();
  });

  it('does not match by date, amount or vehicle — transactionId only', () => {
    const logs = [{ id: 'm9', odometer: 45000 }] as unknown as VehicleMaintenance[];
    expect(findMaintenanceLogForTransaction(logs, 'tx-maint')).toBeUndefined();
  });

  it('the fuel finder is unchanged', () => {
    expect(findFuelLogForTransaction(FUEL_LOGS, 'tx-fuel')?.id).toBe('f1');
    expect(findFuelLogForTransaction(FUEL_LOGS, 'tx-missing')).toBeUndefined();
  });
});

describe('detail-modal odometer wiring (v7.6.45 Part C)', () => {
  it('the modal accepts a maintenance prop and renders the မိုင်တာ row', () => {
    expect(MODAL_SRC).toContain('maintenanceLog?: VehicleMaintenance | null');
    expect(MODAL_SRC).toContain('မိုင်တာ:');
    expect(MODAL_SRC).toContain('odometerKm');
    expect(MODAL_SRC).toContain('km');
  });

  it('the odometer row is gated on a positive reading — never "0 km"', () => {
    expect(MODAL_SRC).toContain('odometerKm > 0');
  });

  it('both callers resolve both joins by transactionId', () => {
    expect(TX_SRC).toContain(
      'maintenanceLog={viewingTx ? findMaintenanceLogForTransaction(maintenanceLogs, viewingTx.id) : undefined}',
    );
    expect(APP_SRC).toContain(
      'maintenanceLog={viewingTransaction ? findMaintenanceLogForTransaction(vehicleMaintenance, viewingTransaction.id) : undefined}',
    );
    expect(APP_SRC).toContain('maintenanceLogs={vehicleMaintenance}');
  });

  it('formatFuelRowLine itself is untouched', () => {
    expect(FUEL_LINE_SRC).toContain('export function formatFuelRowLine(');
    expect(FUEL_LINE_SRC).toContain("return fuelLineParts(fuelLog, false).join(' · ');");
  });
});

describe('Version pins roll to v7.6.49 / build 363', () => {
  it('constants, version.json and the top history entry agree, with no Admin strings', () => {
    expect(CURRENT_APP_VERSION).toBe('v7.6.49');
    expect(CURRENT_BUILD_NUMBER).toBe(363);
    expect(VERSION_JSON.version).toBe('v7.6.49');
    expect(VERSION_JSON.buildNumber).toBe(363);
    const top = VERSION_HISTORY[0];
    expect(top.version).toBe('v7.6.49');
    expect(top.buildNumber).toBe(363);
    expect(top.changesMy.join(' ')).not.toContain('Admin');
    expect(top.changesEn.join(' ')).not.toContain('Admin');
    expect(top.changesMy.length).toBe(4);
    expect(top.changesEn.length).toBe(4);
    expect(VERSION_JSON.changesMy).toEqual(top.changesMy);
    expect(VERSION_JSON.changesEn).toEqual(top.changesEn);
  });
});
