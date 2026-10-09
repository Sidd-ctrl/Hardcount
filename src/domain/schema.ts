import { z } from 'zod';

const boundedNumber = (min: number, max: number) =>
  z.number({ invalid_type_error: 'Enter a number' }).min(min).max(max);

export const computeSchema = z.object({
  serverCount: boundedNumber(1, 64).int(),
  processorClass: z.enum(['entry', 'midrange', 'performance', 'flagship']),
  socketsPerServer: boundedNumber(1, 4).int(),
  ramGbPerServer: boundedNumber(16, 4096).int(),
  redundancy: z.enum(['single', 'ha-pair', 'cluster']),
  dedicatedAppServer: z.boolean(),
});

export const storageSchema = z.object({
  driveType: z.enum(['hdd', 'sata-ssd', 'nvme-ssd']),
  driveCount: boundedNumber(1, 240).int(),
  capacityPerDriveTb: boundedNumber(0.5, 32),
  driveUnitPrice: boundedNumber(0, 100000000),
  raidLevel: z.enum(['jbod', 'raid5', 'raid6', 'raid10']),
  spareDrives: boundedNumber(0, 40).int(),
  replacementIntervalYears: boundedNumber(1, 15),
  initialDataTb: boundedNumber(0, 20000),
  annualGrowthPct: boundedNumber(0, 200),
  growthModel: z.enum(['compound', 'linear']),
  reservePct: boundedNumber(0, 60),
});

export const facilitySchema = z.object({
  rackCost: boundedNumber(0, 10000000),
  upsCost: boundedNumber(0, 10000000),
  networkCost: boundedNumber(0, 10000000),
  cooling: z.enum(['none', 'split', 'precision']),
  electricityRate: boundedNumber(0, 100000),
  pue: boundedNumber(1, 3),
  roomMonthlyOverhead: boundedNumber(0, 10000000),
});

export const serviceSchema = z.object({
  warrantyYears: boundedNumber(0, 10),
  supportContractPct: boundedNumber(0, 50),
  maintenanceCostPerEvent: boundedNumber(0, 10000000),
  maintenanceEventsPerYear: boundedNumber(0, 52),
  dbaMonthlyCost: boundedNumber(0, 10000000),
  monitoringMonthlyCost: boundedNumber(0, 10000000),
  securityMonthlyCost: boundedNumber(0, 10000000),
  insurancePctOfHardware: boundedNumber(0, 20),
  laborHourlyRate: boundedNumber(0, 1000000),
  downtimeHourlyCost: boundedNumber(0, 100000000),
});

export const assumptionSchema = z.object({
  horizonYears: boundedNumber(1, 25).int(),
  inflationPct: boundedNumber(0, 30),
  escalateCosts: z.boolean(),
  commissioningHours: boundedNumber(0, 500),
  serverRefreshIntervalYears: boundedNumber(1, 25),
  upgradeShelfTb: boundedNumber(1, 2000),
  autoExpandCapacity: z.boolean(),
  modelDriveFailures: z.boolean(),
  driveFailureAfrPct: boundedNumber(0, 30),
  failureSeed: boundedNumber(1, 999999).int(),
  downtimeHoursPerFailure: boundedNumber(0, 720),
  includeDecommission: z.boolean(),
  decommissionCost: boundedNumber(0, 10000000),
  resaleRecoveryPct: boundedNumber(0, 90),
});

export const hardwareConfigSchema = z.object({
  compute: computeSchema,
  storage: storageSchema,
  facility: facilitySchema,
  service: serviceSchema,
  assumptions: assumptionSchema,
});

export function parseConfig(input: unknown) {
  return hardwareConfigSchema.safeParse(input);
}

export function describeConfigErrors(error: z.ZodError): string[] {
  return error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
}
