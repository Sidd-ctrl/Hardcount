export type ProcessorClassId = 'entry' | 'midrange' | 'performance' | 'flagship';

export type DriveTypeId = 'hdd' | 'sata-ssd' | 'nvme-ssd';

export type RaidLevelId = 'jbod' | 'raid5' | 'raid6' | 'raid10';

export type RedundancyId = 'single' | 'ha-pair' | 'cluster';

export type CoolingId = 'none' | 'split' | 'precision';

export type GrowthModelId = 'compound' | 'linear';

export interface ComputeConfig {
  serverCount: number;
  processorClass: ProcessorClassId;
  socketsPerServer: number;
  ramGbPerServer: number;
  redundancy: RedundancyId;
  dedicatedAppServer: boolean;
}

export interface StorageConfig {
  driveType: DriveTypeId;
  driveCount: number;
  capacityPerDriveTb: number;
  driveUnitPrice: number;
  raidLevel: RaidLevelId;
  spareDrives: number;
  replacementIntervalYears: number;
  initialDataTb: number;
  annualGrowthPct: number;
  growthModel: GrowthModelId;
  reservePct: number;
}

export interface FacilityConfig {
  rackCost: number;
  upsCost: number;
  networkCost: number;
  cooling: CoolingId;
  electricityRate: number;
  pue: number;
  roomMonthlyOverhead: number;
}

export interface ServiceConfig {
  warrantyYears: number;
  supportContractPct: number;
  maintenanceCostPerEvent: number;
  maintenanceEventsPerYear: number;
  dbaMonthlyCost: number;
  monitoringMonthlyCost: number;
  securityMonthlyCost: number;
  insurancePctOfHardware: number;
  laborHourlyRate: number;
  downtimeHourlyCost: number;
}

export interface AssumptionConfig {
  horizonYears: number;
  inflationPct: number;
  escalateCosts: boolean;
  commissioningHours: number;
  serverRefreshIntervalYears: number;
  upgradeShelfTb: number;
  autoExpandCapacity: boolean;
  modelDriveFailures: boolean;
  driveFailureAfrPct: number;
  failureSeed: number;
  downtimeHoursPerFailure: number;
  includeDecommission: boolean;
  decommissionCost: number;
  resaleRecoveryPct: number;
}

export interface HardwareConfig {
  compute: ComputeConfig;
  storage: StorageConfig;
  facility: FacilityConfig;
  service: ServiceConfig;
  assumptions: AssumptionConfig;
}

export type LedgerCategory =
  | 'hardware'
  | 'facility'
  | 'commissioning'
  | 'electricity'
  | 'cooling'
  | 'software'
  | 'labor'
  | 'support'
  | 'maintenance'
  | 'replacement'
  | 'upgrade'
  | 'incident'
  | 'downtime'
  | 'security'
  | 'overhead'
  | 'decommission'
  | 'recovery';

export type LifecycleStage =
  | 'acquisition'
  | 'commissioning'
  | 'operation'
  | 'growth'
  | 'maintenance'
  | 'failure'
  | 'upgrade'
  | 'decommission';

export interface LedgerEvent {
  id: string;
  atMs: number;
  category: LedgerCategory;
  title: string;
  detail: string;
  amountPaise: number;
  quantity: number | null;
  unitPricePaise: number | null;
  recurrence: string | null;
  source: string;
  asset: string | null;
  stage: LifecycleStage;
  credit: boolean;
}

export interface BOMLine {
  id: string;
  group: 'compute' | 'storage' | 'facility' | 'service';
  label: string;
  detail: string;
  quantity: number;
  unitPricePaise: number;
  category: LedgerCategory;
  asset: string;
}

export interface DerivedModel {
  installedTb: number;
  arrayTb: number;
  usableTb: number;
  reserveTb: number;
  redundancyEfficiency: number;
  totalDriveCount: number;
  itPowerWatts: number;
  overheadPowerWatts: number;
  facilityPowerWatts: number;
  annualEnergyKwh: number;
  annualItEnergyKwh: number;
  energyPaisePerMs: number;
  itEnergyPaisePerMs: number;
  overheadEnergyPaisePerMs: number;
  annualElectricityPaise: number;
  annualCoolingPaise: number;
  hardwareCapexPaise: number;
  facilityCapexPaise: number;
  commissioningPaise: number;
  initialCapexPaise: number;
  monthlyFixedOpexPaise: number;
  annualFixedOpexPaise: number;
  annualOpexPaise: number;
  annualMaintenancePaise: number;
  annualSupportPaise: number;
  costPerUsableTbPaise: number;
  bom: BOMLine[];
}

export interface CapacityStep {
  atMs: number;
  usableTb: number;
  addedTb: number;
  reason: string;
}

export interface CapacityPoint {
  year: number;
  atMs: number;
  demandTb: number;
  usableTb: number;
}

export interface AnnualSlice {
  year: number;
  atMs: number;
  spendPaise: number;
  cumulativePaise: number;
  byCategory: Record<LedgerCategory, number>;
}

export interface MonthlyPoint {
  atMs: number;
  cumulativePaise: number;
  capexPaise: number;
  opexPaise: number;
}

export interface SimulationPlan {
  derived: DerivedModel;
  events: LedgerEvent[];
  capacitySteps: CapacityStep[];
  capacitySeries: CapacityPoint[];
  annualSlices: AnnualSlice[];
  monthlySeries: MonthlyPoint[];
  horizonMs: number;
  exhaustionYear: number | null;
  projectedEndOfLifePaise: number;
  residualValuePaise: number;
  recoveryPaise: number;
}

export type SpeedId = '1x' | '60x' | 'day' | 'month' | 'year';

export type ChartView = 'nominal' | 'real' | 'annual';

export interface Scenario {
  id: string;
  name: string;
  note: string;
  config: HardwareConfig;
  savedAtMs: number;
  totalPaise: number;
  capexPaise: number;
  annualOpexPaise: number;
  usableTb: number;
}
