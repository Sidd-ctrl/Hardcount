import { COOLING_OPTIONS, FACILITY_REFERENCE_COSTS, drivePriceFor } from './catalog';
import { cloneConfig, defaultConfig } from './defaults';
import type { HardwareConfig } from './types';
import { toPaise } from './money';

export interface Preset {
  id: string;
  name: string;
  note: string;
  build: () => HardwareConfig;
}

function smallOffice(): HardwareConfig {
  const config = cloneConfig(defaultConfig());
  config.compute = {
    serverCount: 1,
    processorClass: 'entry',
    socketsPerServer: 1,
    ramGbPerServer: 64,
    redundancy: 'single',
    dedicatedAppServer: false,
  };
  config.storage = {
    ...config.storage,
    driveType: 'hdd',
    driveCount: 8,
    capacityPerDriveTb: 8,
    driveUnitPrice: drivePriceFor('hdd', 8),
    raidLevel: 'raid6',
    spareDrives: 1,
    replacementIntervalYears: 5,
    initialDataTb: 18,
    annualGrowthPct: 14,
    growthModel: 'compound',
    reservePct: 10,
  };
  config.facility = {
    ...config.facility,
    rackCost: toPaise(48000),
    upsCost: toPaise(62000),
    networkCost: toPaise(55000),
    cooling: 'none',
    pue: COOLING_OPTIONS.none.referencePue,
    roomMonthlyOverhead: toPaise(6000),
  };
  config.service = {
    ...config.service,
    dbaMonthlyCost: toPaise(18000),
    monitoringMonthlyCost: toPaise(4500),
    securityMonthlyCost: toPaise(2500),
    maintenanceEventsPerYear: 1,
  };
  config.assumptions = {
    ...config.assumptions,
    horizonYears: 5,
    commissioningHours: 16,
    serverRefreshIntervalYears: 5,
    upgradeShelfTb: 32,
    driveFailureAfrPct: 1.8,
    downtimeHoursPerFailure: 4,
  };
  return config;
}

function growingBusiness(): HardwareConfig {
  return defaultConfig();
}

function enterpriseStorage(): HardwareConfig {
  const config = cloneConfig(defaultConfig());
  config.compute = {
    serverCount: 4,
    processorClass: 'performance',
    socketsPerServer: 2,
    ramGbPerServer: 512,
    redundancy: 'cluster',
    dedicatedAppServer: true,
  };
  config.storage = {
    ...config.storage,
    driveType: 'hdd',
    driveCount: 90,
    capacityPerDriveTb: 20,
    driveUnitPrice: drivePriceFor('hdd', 20),
    raidLevel: 'raid6',
    spareDrives: 8,
    replacementIntervalYears: 5,
    initialDataTb: 780,
    annualGrowthPct: 26,
    growthModel: 'compound',
    reservePct: 12,
  };
  config.facility = {
    ...config.facility,
    rackCost: FACILITY_REFERENCE_COSTS.rack * 3,
    upsCost: FACILITY_REFERENCE_COSTS.ups * 3,
    networkCost: toPaise(640000),
    cooling: 'precision',
    pue: COOLING_OPTIONS.precision.referencePue,
    roomMonthlyOverhead: toPaise(145000),
  };
  config.service = {
    ...config.service,
    warrantyYears: 4,
    supportContractPct: 14,
    maintenanceCostPerEvent: toPaise(54000),
    maintenanceEventsPerYear: 4,
    dbaMonthlyCost: toPaise(240000),
    monitoringMonthlyCost: toPaise(48000),
    securityMonthlyCost: toPaise(38000),
    insurancePctOfHardware: 1.1,
    laborHourlyRate: toPaise(3800),
    downtimeHourlyCost: toPaise(900000),
  };
  config.assumptions = {
    ...config.assumptions,
    horizonYears: 15,
    inflationPct: 6.5,
    commissioningHours: 160,
    serverRefreshIntervalYears: 5,
    upgradeShelfTb: 320,
    driveFailureAfrPct: 1.6,
    failureSeed: 44120,
    downtimeHoursPerFailure: 1,
    decommissionCost: toPaise(680000),
    resaleRecoveryPct: 5,
  };
  return config;
}

function allFlashAnalytics(): HardwareConfig {
  const config = cloneConfig(defaultConfig());
  config.compute = {
    serverCount: 3,
    processorClass: 'performance',
    socketsPerServer: 2,
    ramGbPerServer: 768,
    redundancy: 'cluster',
    dedicatedAppServer: false,
  };
  config.storage = {
    ...config.storage,
    driveType: 'nvme-ssd',
    driveCount: 24,
    capacityPerDriveTb: 15.36,
    driveUnitPrice: drivePriceFor('nvme-ssd', 15.36),
    raidLevel: 'raid10',
    spareDrives: 2,
    replacementIntervalYears: 5,
    initialDataTb: 60,
    annualGrowthPct: 30,
    growthModel: 'compound',
    reservePct: 8,
  };
  config.facility = {
    ...config.facility,
    cooling: 'precision',
    pue: COOLING_OPTIONS.precision.referencePue,
    roomMonthlyOverhead: toPaise(72000),
  };
  config.service = {
    ...config.service,
    dbaMonthlyCost: toPaise(150000),
    monitoringMonthlyCost: toPaise(26000),
    downtimeHourlyCost: toPaise(520000),
  };
  config.assumptions = {
    ...config.assumptions,
    horizonYears: 10,
    upgradeShelfTb: 120,
    driveFailureAfrPct: 0.5,
    failureSeed: 77103,
    downtimeHoursPerFailure: 0.5,
  };
  return config;
}

export const PRESETS: Preset[] = [
  {
    id: 'small-office',
    name: 'Small office database',
    note: 'A single node in a storeroom. Cheap to buy, expensive per terabyte.',
    build: smallOffice,
  },
  {
    id: 'growing-business',
    name: 'Growing business database',
    note: 'The default starting point: an HA pair with a 350 TB nearline array.',
    build: growingBusiness,
  },
  {
    id: 'enterprise-storage',
    name: 'Enterprise storage environment',
    note: 'Four-node cluster, precision cooling, fifteen-year horizon.',
    build: enterpriseStorage,
  },
  {
    id: 'all-flash',
    name: 'All-flash analytics platform',
    note: 'NVMe on RAID 10. Low latency, the highest rupee-per-terabyte.',
    build: allFlashAnalytics,
  },
];

export function presetById(id: string): Preset | undefined {
  return PRESETS.find((preset) => preset.id === id);
}
