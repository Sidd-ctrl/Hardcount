import { COOLING_OPTIONS, DEFAULT_ELECTRICITY_RATE, FACILITY_REFERENCE_COSTS, drivePriceFor } from './catalog';
import type { HardwareConfig } from './types';
import { toPaise } from './money';

export function defaultConfig(): HardwareConfig {
  return {
    compute: {
      serverCount: 2,
      processorClass: 'midrange',
      socketsPerServer: 2,
      ramGbPerServer: 256,
      redundancy: 'ha-pair',
      dedicatedAppServer: true,
    },
    storage: {
      driveType: 'hdd',
      driveCount: 24,
      capacityPerDriveTb: 16,
      driveUnitPrice: drivePriceFor('hdd', 16),
      raidLevel: 'raid6',
      spareDrives: 2,
      replacementIntervalYears: 5,
      initialDataTb: 120,
      annualGrowthPct: 22,
      growthModel: 'compound',
      reservePct: 10,
    },
    facility: {
      rackCost: FACILITY_REFERENCE_COSTS.rack,
      upsCost: FACILITY_REFERENCE_COSTS.ups,
      networkCost: FACILITY_REFERENCE_COSTS.network,
      cooling: 'split',
      electricityRate: DEFAULT_ELECTRICITY_RATE,
      pue: COOLING_OPTIONS.split.referencePue,
      roomMonthlyOverhead: toPaise(25000),
    },
    service: {
      warrantyYears: 3,
      supportContractPct: 12,
      maintenanceCostPerEvent: toPaise(18000),
      maintenanceEventsPerYear: 2,
      dbaMonthlyCost: toPaise(65000),
      monitoringMonthlyCost: toPaise(14000),
      securityMonthlyCost: toPaise(9000),
      insurancePctOfHardware: 0.8,
      laborHourlyRate: toPaise(2500),
      downtimeHourlyCost: toPaise(180000),
    },
    assumptions: {
      horizonYears: 10,
      inflationPct: 6,
      escalateCosts: true,
      commissioningHours: 40,
      serverRefreshIntervalYears: 6,
      upgradeShelfTb: 96,
      autoExpandCapacity: true,
      modelDriveFailures: true,
      driveFailureAfrPct: 1.8,
      failureSeed: 20260,
      downtimeHoursPerFailure: 2,
      includeDecommission: true,
      decommissionCost: toPaise(140000),
      resaleRecoveryPct: 6,
    },
  };
}

export function cloneConfig(config: HardwareConfig): HardwareConfig {
  return {
    compute: { ...config.compute },
    storage: { ...config.storage },
    facility: { ...config.facility },
    service: { ...config.service },
    assumptions: { ...config.assumptions },
  };
}
