import type { HardwareConfig } from './types';

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function int(value: number, min: number, max: number): number {
  return Math.round(clamp(value, min, max));
}

export function normalizeConfig(config: HardwareConfig): HardwareConfig {
  return {
    compute: {
      serverCount: int(config.compute.serverCount, 1, 64),
      processorClass: config.compute.processorClass,
      socketsPerServer: int(config.compute.socketsPerServer, 1, 4),
      ramGbPerServer: int(config.compute.ramGbPerServer, 16, 4096),
      redundancy: config.compute.redundancy,
      dedicatedAppServer: Boolean(config.compute.dedicatedAppServer),
    },
    storage: {
      driveType: config.storage.driveType,
      driveCount: int(config.storage.driveCount, 1, 240),
      capacityPerDriveTb: clamp(config.storage.capacityPerDriveTb, 0.5, 32),
      driveUnitPrice: Math.max(0, Math.round(config.storage.driveUnitPrice)),
      raidLevel: config.storage.raidLevel,
      spareDrives: int(config.storage.spareDrives, 0, 40),
      replacementIntervalYears: clamp(config.storage.replacementIntervalYears, 1, 15),
      initialDataTb: clamp(config.storage.initialDataTb, 0, 20000),
      annualGrowthPct: clamp(config.storage.annualGrowthPct, 0, 200),
      growthModel: config.storage.growthModel,
      reservePct: clamp(config.storage.reservePct, 0, 60),
    },
    facility: {
      rackCost: Math.max(0, Math.round(config.facility.rackCost)),
      upsCost: Math.max(0, Math.round(config.facility.upsCost)),
      networkCost: Math.max(0, Math.round(config.facility.networkCost)),
      cooling: config.facility.cooling,
      electricityRate: clamp(config.facility.electricityRate, 0, 100000),
      pue: clamp(config.facility.pue, 1, 3),
      roomMonthlyOverhead: Math.max(0, Math.round(config.facility.roomMonthlyOverhead)),
    },
    service: {
      warrantyYears: clamp(config.service.warrantyYears, 0, 10),
      supportContractPct: clamp(config.service.supportContractPct, 0, 50),
      maintenanceCostPerEvent: Math.max(0, Math.round(config.service.maintenanceCostPerEvent)),
      maintenanceEventsPerYear: clamp(config.service.maintenanceEventsPerYear, 0, 52),
      dbaMonthlyCost: Math.max(0, Math.round(config.service.dbaMonthlyCost)),
      monitoringMonthlyCost: Math.max(0, Math.round(config.service.monitoringMonthlyCost)),
      securityMonthlyCost: Math.max(0, Math.round(config.service.securityMonthlyCost)),
      insurancePctOfHardware: clamp(config.service.insurancePctOfHardware, 0, 20),
      laborHourlyRate: Math.max(0, Math.round(config.service.laborHourlyRate)),
      downtimeHourlyCost: Math.max(0, Math.round(config.service.downtimeHourlyCost)),
    },
    assumptions: {
      horizonYears: int(config.assumptions.horizonYears, 1, 25),
      inflationPct: clamp(config.assumptions.inflationPct, 0, 30),
      escalateCosts: Boolean(config.assumptions.escalateCosts),
      commissioningHours: clamp(config.assumptions.commissioningHours, 0, 500),
      serverRefreshIntervalYears: clamp(config.assumptions.serverRefreshIntervalYears, 1, 25),
      upgradeShelfTb: clamp(config.assumptions.upgradeShelfTb, 1, 2000),
      autoExpandCapacity: Boolean(config.assumptions.autoExpandCapacity),
      modelDriveFailures: Boolean(config.assumptions.modelDriveFailures),
      driveFailureAfrPct: clamp(config.assumptions.driveFailureAfrPct, 0, 30),
      failureSeed: int(config.assumptions.failureSeed, 1, 999999),
      downtimeHoursPerFailure: clamp(config.assumptions.downtimeHoursPerFailure, 0, 720),
      includeDecommission: Boolean(config.assumptions.includeDecommission),
      decommissionCost: Math.max(0, Math.round(config.assumptions.decommissionCost)),
      resaleRecoveryPct: clamp(config.assumptions.resaleRecoveryPct, 0, 90),
    },
  };
}
