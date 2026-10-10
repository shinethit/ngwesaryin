import { Vehicle, FuelLog, VehicleMaintenance, TirePressureLog, VehicleServiceType } from '../types';

export interface EnrichedFuelLog extends FuelLog {
  calculatedDistance?: number;
  calculatedEfficiency?: number; // km/L
  calculatedCostPerDistance?: number; // MMK per km
  isFirstFill?: boolean; // [v6.1.4] true only for the earliest fuel log
}

export interface FuelStats {
  totalSpent: number;
  totalLiters: number;
  totalDistance: number;
  avgEfficiency: number; // km/L
  avgPricePerLiter: number;
  latestPricePerLiter: number;
  priceChangeDiff: number; // MMK difference vs previous
  priceChangePercent: number; // % change vs previous
  bestEfficiency: number;
  worstEfficiency: number;
}

export interface MaintenanceLifespanItem {
  id: string;
  vehicleId: string;
  serviceType: VehicleServiceType;
  title: string;
  date: string;
  odometer: number;
  cost: number;
  sparePartBrand?: string;
  workshopName?: string;
  expectedLifespanKm?: number;
  expectedLifespanDays?: number;
  daysUsed?: number;
  kmUsed?: number;
  costPerKm?: number;
}

export interface ServiceHealthStatus {
  serviceType: VehicleServiceType;
  labelMy: string;
  labelEn: string;
  iconName: string;
  lastServiceDate?: string;
  lastServiceOdometer?: number;
  lastCost?: number;
  expectedLifespanKm: number;
  expectedLifespanDays: number;
  kmDrivenSinceLast: number;
  daysSinceLast: number;
  remainingKm: number;
  remainingDays: number;
  status: 'good' | 'due_soon' | 'overdue' | 'not_recorded';
  healthPercent: number; // 0 to 100% (100 = full life left, 0 = due/overdue)
}

export const SERVICE_TYPE_CONFIG: Record<
  VehicleServiceType,
  { labelMy: string; labelEn: string; defaultLifespanKm: number; defaultLifespanDays: number }
> = {
  engine_oil: {
    labelMy: 'အင်ဂျင်ဝိုင် (Engine Oil)',
    labelEn: 'Engine Oil',
    defaultLifespanKm: 5000,
    defaultLifespanDays: 180, // 6 months
  },
  oil_filter: {
    labelMy: 'ဝိုင်စစ် (Oil Filter)',
    labelEn: 'Oil Filter',
    defaultLifespanKm: 10000,
    defaultLifespanDays: 360,
  },
  air_filter: {
    labelMy: 'လေစစ် (Air Filter)',
    labelEn: 'Air Filter',
    defaultLifespanKm: 15000,
    defaultLifespanDays: 360,
  },
  brake_pads: {
    labelMy: 'ဘရိတ်ရှူး/ပြား (Brake Pads)',
    labelEn: 'Brake Pads',
    defaultLifespanKm: 25000,
    defaultLifespanDays: 720,
  },
  tires: {
    labelMy: 'တာယာအသစ်လဲလှယ်ခြင်း (Tires)',
    labelEn: 'Tire Replacement',
    defaultLifespanKm: 45000,
    defaultLifespanDays: 1080, // 3 years
  },
  battery: {
    labelMy: 'ဘက်ထရီအသစ် (Battery)',
    labelEn: 'Battery',
    defaultLifespanKm: 50000,
    defaultLifespanDays: 720, // 2 years
  },
  spark_plugs: {
    labelMy: 'ပလပ် (Spark Plugs)',
    labelEn: 'Spark Plugs',
    defaultLifespanKm: 30000,
    defaultLifespanDays: 720,
  },
  transmission_fluid: {
    labelMy: 'ဂီယာဝိုင် (Gear/ATF Fluid)',
    labelEn: 'Transmission Fluid',
    defaultLifespanKm: 40000,
    defaultLifespanDays: 720,
  },
  coolant: {
    labelMy: 'ရေတိုင်ကီ အအေးခံရည် (Coolant)',
    labelEn: 'Radiator Coolant',
    defaultLifespanKm: 40000,
    defaultLifespanDays: 720,
  },
  wheel_alignment: {
    labelMy: 'ဘီးချိန်ခြင်း (Wheel Alignment)',
    labelEn: 'Wheel Alignment',
    defaultLifespanKm: 10000,
    defaultLifespanDays: 180,
  },
  suspension: {
    labelMy: 'ရှော့ဘား/အောက်ပိုင်း (Suspension)',
    labelEn: 'Suspension & Shocks',
    defaultLifespanKm: 60000,
    defaultLifespanDays: 1080,
  },
  general_repair: {
    labelMy: 'အထွေထွေ ပြုပြင်ထိန်းသိမ်းမှု',
    labelEn: 'General Repair',
    defaultLifespanKm: 10000,
    defaultLifespanDays: 180,
  },
  other: {
    labelMy: 'အခြား အပိုပစ္စည်းလဲလှယ်မှု',
    labelEn: 'Other Spare Parts',
    defaultLifespanKm: 10000,
    defaultLifespanDays: 180,
  },
};

/**
 * Process fuel logs sorted ascending by date and odometer to compute exact km/L and distance
 */
export function enrichFuelLogs(fuelLogs: FuelLog[]): EnrichedFuelLog[] {
  // Sort by date ascending, then odometer ascending
  const sorted = [...fuelLogs].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.odometer - b.odometer;
  });

  const enriched: EnrichedFuelLog[] = [];
  let prevFullTankLog: FuelLog | null = null;
  let partialLitersSinceLastFull = 0;

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    let distance: number | undefined;
    let efficiency: number | undefined;
    let costPerDist: number | undefined;

    if (prevFullTankLog && current.odometer > prevFullTankLog.odometer) {
      distance = current.odometer - prevFullTankLog.odometer;
      const effectiveLiters = current.liters + partialLitersSinceLastFull;
      if (current.isFullTank && effectiveLiters > 0) {
        efficiency = Number((distance / effectiveLiters).toFixed(2));
        costPerDist = Number((current.totalCost / distance).toFixed(1));
      }
    } else if (i > 0 && current.odometer > sorted[i - 1].odometer) {
      distance = current.odometer - sorted[i - 1].odometer;
      if (current.liters > 0) {
        costPerDist = Number((current.totalCost / distance).toFixed(1));
      }
    }

    if (current.isFullTank) {
      prevFullTankLog = current;
      partialLitersSinceLastFull = 0;
    } else {
      partialLitersSinceLastFull += current.liters;
    }

    enriched.push({
      ...current,
      calculatedDistance: distance,
      calculatedEfficiency: efficiency,
      calculatedCostPerDistance: costPerDist,
      // [v6.1.4] Only the earliest log (i === 0) is the "first ever fill-up"
      isFirstFill: i === 0,
    });
  }

  // Return in descending order (latest first) for display
  return enriched.reverse();
}

/**
 * Calculate overall fuel statistics
 */
export function calculateFuelStats(logs: FuelLog[]): FuelStats {
  if (logs.length === 0) {
    return {
      totalSpent: 0,
      totalLiters: 0,
      totalDistance: 0,
      avgEfficiency: 0,
      avgPricePerLiter: 0,
      latestPricePerLiter: 0,
      priceChangeDiff: 0,
      priceChangePercent: 0,
      bestEfficiency: 0,
      worstEfficiency: 0,
    };
  }

  const enriched = enrichFuelLogs(logs);
  const totalSpent = logs.reduce((sum, l) => sum + l.totalCost, 0);
  const totalLiters = logs.reduce((sum, l) => sum + l.liters, 0);

  const efficiencies = enriched
    .map((l) => l.calculatedEfficiency)
    .filter((e): e is number => typeof e === 'number' && e > 0);

  const avgEfficiency =
    efficiencies.length > 0
      ? Number((efficiencies.reduce((a, b) => a + b, 0) / efficiencies.length).toFixed(2))
      : 0;

  const bestEfficiency = efficiencies.length > 0 ? Math.max(...efficiencies) : 0;
  const worstEfficiency = efficiencies.length > 0 ? Math.min(...efficiencies) : 0;

  const odometers = logs.map((l) => l.odometer).filter((o) => o > 0);
  const minOdo = odometers.length > 0 ? Math.min(...odometers) : 0;
  const maxOdo = odometers.length > 0 ? Math.max(...odometers) : 0;
  const totalDistance = maxOdo > minOdo ? maxOdo - minOdo : 0;

  const avgPricePerLiter = totalLiters > 0 ? Math.round(totalSpent / totalLiters) : 0;

  // Price difference vs previous
  const sortedByDateDesc = [...logs].sort((a, b) => b.date.localeCompare(a.date));
  const latestPricePerLiter = sortedByDateDesc[0]?.pricePerLiter || 0;
  const previousPrice = sortedByDateDesc[1]?.pricePerLiter || latestPricePerLiter;
  const priceChangeDiff = latestPricePerLiter - previousPrice;
  const priceChangePercent =
    previousPrice > 0 ? Number(((priceChangeDiff / previousPrice) * 100).toFixed(1)) : 0;

  return {
    totalSpent,
    totalLiters,
    totalDistance,
    avgEfficiency,
    avgPricePerLiter,
    latestPricePerLiter,
    priceChangeDiff,
    priceChangePercent,
    bestEfficiency,
    worstEfficiency,
  };
}

/**
 * [v6.1.10] Calculate cost per km across all vehicle expenses.
 * Total Cost = Fuel + Maintenance + Tire
 * Distance = max(fuel odometer) - min(fuel odometer) — from fuel logs only
 */
export interface CostPerKmResult {
  costPerKm: number | null;
  totalCost: number;
  totalDistance: number;
  fuelLogCount: number;
  hasEnoughData: boolean;
}

export function calculateCostPerKm(
  fuelLogs: FuelLog[],
  maintenanceLogs: VehicleMaintenance[],
  tireLogs: TirePressureLog[]
): CostPerKmResult {
  const fuelTotal = fuelLogs.reduce((s, l) => s + (Number(l.totalCost) || 0), 0);
  const maintTotal = maintenanceLogs.reduce((s, l) => s + (Number(l.cost) || 0), 0);
  const tireTotal = tireLogs.reduce((s, l) => s + (Number(l.cost) || 0), 0);
  const totalCost = fuelTotal + maintTotal + tireTotal;

  const odometers = fuelLogs
    .map((l) => Number(l.odometer) || 0)
    .filter((o) => o > 0);

  let totalDistance = 0;
  if (odometers.length >= 2) {
    totalDistance = Math.max(...odometers) - Math.min(...odometers);
  }

  const hasEnoughData = odometers.length >= 2 && totalDistance > 0;

  return {
    costPerKm: hasEnoughData ? Number((totalCost / totalDistance).toFixed(2)) : null,
    totalCost,
    totalDistance,
    fuelLogCount: fuelLogs.length,
    hasEnoughData,
  };
}

/**
 * Fuel price chart points generator for Recharts
 */
/**
 * Calculate Spare Part Lifespan by comparing consecutive maintenance of each service type
 */
export function calculateMaintenanceLifespans(
  maintenances: VehicleMaintenance[]
): MaintenanceLifespanItem[] {
  // Sort ascending by date & odometer
  const sorted = [...maintenances].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.odometer - b.odometer;
  });

  const lastRecordedByService = new Map<VehicleServiceType, VehicleMaintenance>();
  const result: MaintenanceLifespanItem[] = [];

  for (const m of sorted) {
    const prev = lastRecordedByService.get(m.serviceType);
    let daysUsed: number | undefined;
    let kmUsed: number | undefined;
    let costPerKm: number | undefined;

    if (prev) {
      const prevTime = new Date(prev.date).getTime();
      const currTime = new Date(m.date).getTime();
      daysUsed = Math.max(0, Math.floor((currTime - prevTime) / (1000 * 60 * 60 * 24)));
      if (m.odometer > prev.odometer) {
        kmUsed = m.odometer - prev.odometer;
        if (kmUsed > 0 && m.cost > 0) {
          costPerKm = Number((m.cost / kmUsed).toFixed(2));
        }
      }
    }

    lastRecordedByService.set(m.serviceType, m);

    result.push({
      id: m.id,
      vehicleId: m.vehicleId,
      serviceType: m.serviceType,
      title: m.title,
      date: m.date,
      odometer: m.odometer,
      cost: m.cost,
      sparePartBrand: m.sparePartBrand,
      workshopName: m.workshopName,
      expectedLifespanKm: m.expectedLifespanKm,
      expectedLifespanDays: m.expectedLifespanDays,
      daysUsed,
      kmUsed,
      costPerKm,
    });
  }

  // Latest first
  return result.reverse();
}

/**
 * Calculate health and upcoming service status for essential vehicle parts
 */
export function calculateServiceHealthStatuses(
  vehicle: Vehicle,
  maintenances: VehicleMaintenance[]
): ServiceHealthStatus[] {
  const currentOdo = vehicle.currentOdometer || 0;
  const now = Date.now();

  const serviceTypes: VehicleServiceType[] = [
    'engine_oil',
    'oil_filter',
    'air_filter',
    'brake_pads',
    'tires',
    'battery',
    'spark_plugs',
    'transmission_fluid',
    'coolant',
    'wheel_alignment',
  ];

  return serviceTypes.map((type) => {
    const config = SERVICE_TYPE_CONFIG[type];
    const matching = maintenances
      .filter((m) => m.vehicleId === vehicle.id && m.serviceType === type)
      .sort((a, b) => b.date.localeCompare(a.date) || b.odometer - a.odometer);

    const latest = matching[0];

    if (!latest) {
      return {
        serviceType: type,
        labelMy: config.labelMy,
        labelEn: config.labelEn,
        iconName: type,
        expectedLifespanKm: config.defaultLifespanKm,
        expectedLifespanDays: config.defaultLifespanDays,
        kmDrivenSinceLast: 0,
        daysSinceLast: 0,
        remainingKm: config.defaultLifespanKm,
        remainingDays: config.defaultLifespanDays,
        status: 'not_recorded',
        healthPercent: 100,
      };
    }

    const expKm = latest.expectedLifespanKm || config.defaultLifespanKm;
    const expDays = latest.expectedLifespanDays || config.defaultLifespanDays;

    const kmDrivenSinceLast = Math.max(0, currentOdo - latest.odometer);
    const lastDateMs = new Date(latest.date).getTime();
    const daysSinceLast = Math.max(0, Math.floor((now - lastDateMs) / (1000 * 60 * 60 * 24)));

    const remainingKm = expKm - kmDrivenSinceLast;
    const remainingDays = expDays - daysSinceLast;

    let status: ServiceHealthStatus['status'] = 'good';
    if (remainingKm <= 0 || remainingDays <= 0) {
      status = 'overdue';
    } else if (remainingKm <= 500 || remainingDays <= 15) {
      status = 'due_soon';
    }

    // Health percent based on remaining distance and time
    const kmRatio = Math.max(0, Math.min(1, remainingKm / expKm));
    const daysRatio = Math.max(0, Math.min(1, remainingDays / expDays));
    const healthPercent = Math.round(Math.min(kmRatio, daysRatio) * 100);

    return {
      serviceType: type,
      labelMy: config.labelMy,
      labelEn: config.labelEn,
      iconName: type,
      lastServiceDate: latest.date,
      lastServiceOdometer: latest.odometer,
      lastCost: latest.cost,
      expectedLifespanKm: expKm,
      expectedLifespanDays: expDays,
      kmDrivenSinceLast,
      daysSinceLast,
      remainingKm,
      remainingDays,
      status,
      healthPercent,
    };
  });
}

/**
 * Format duration helper (e.g. "၅ လ ၁၂ ရက်" / "5 mos 12 days")
 */
export function formatDurationDays(days: number, lang: 'my' | 'en'): string {
  if (days <= 0) return lang === 'my' ? '၀ ရက်' : '0 days';
  const months = Math.floor(days / 30);
  const remDays = days % 30;

  if (months === 0) {
    return lang === 'my' ? `${remDays} ရက်` : `${remDays} days`;
  }
  if (remDays === 0) {
    return lang === 'my' ? `${months} လ` : `${months} mos`;
  }
  return lang === 'my' ? `${months} လ ${remDays} ရက်` : `${months} mos ${remDays} days`;
}
