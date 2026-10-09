import { COOLING_OPTIONS, DRIVE_TYPES, PROCESSOR_CLASSES, RAID_LEVELS } from './catalog';
import { CAPACITY_TRIGGER_RATIO, LABOR_HOURS_PER_DRIVE_SWAP, LABOR_HOURS_PER_MAINTENANCE, LABOR_HOURS_PER_SERVER_REFRESH, LABOR_HOURS_PER_SHELF_INSTALL, serverUnitPrice, totalDriveCount } from './derive';
import { MS_PER_YEAR, roundPaise } from './money';
import { demandAtTb } from './capacity';
import type { CapacityStep, DerivedModel, HardwareConfig, LedgerCategory, LedgerEvent, LifecycleStage } from './types';

export interface LifecycleInput {
  config: HardwareConfig;
  derived: DerivedModel;
}

export interface LifecycleResult {
  events: LedgerEvent[];
  capacitySteps: CapacityStep[];
  residualValuePaise: number;
  recoveryPaise: number;
}

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function escalationAt(config: HardwareConfig, atMs: number): number {
  if (!config.assumptions.escalateCosts || config.assumptions.inflationPct === 0) return 1;
  return Math.pow(1 + config.assumptions.inflationPct / 100, atMs / MS_PER_YEAR);
}

export const MS_PER_MONTH = MS_PER_YEAR / 12;

export function monthBoundaryMs(months: number): number {
  return Math.max(0, months * MS_PER_MONTH);
}

export function yearBoundaryMs(years: number): number {
  return Math.max(0, years * MS_PER_YEAR);
}

export function horizonMsFor(horizonYears: number): number {
  return horizonYears * MS_PER_YEAR;
}

function makeEvent(partial: Omit<LedgerEvent, 'credit' | 'quantity' | 'unitPricePaise' | 'recurrence' | 'asset'> & {
  quantity?: number | null;
  unitPricePaise?: number | null;
  recurrence?: string | null;
  asset?: string | null;
  credit?: boolean;
}): LedgerEvent {
  return {
    quantity: null,
    unitPricePaise: null,
    recurrence: null,
    asset: null,
    credit: false,
    ...partial,
  };
}

function acquisitionEvents(input: LifecycleInput): LedgerEvent[] {
  const { derived } = input;
  const events: LedgerEvent[] = [];

  for (const line of derived.bom) {
    events.push(
      makeEvent({
        id: `capex-${line.id}`,
        atMs: 0,
        category: line.category,
        title: line.label,
        detail: line.detail,
        amountPaise: line.quantity * line.unitPricePaise,
        quantity: line.quantity,
        unitPricePaise: line.unitPricePaise,
        source: 'Purchase order raised at acquisition',
        asset: line.asset,
        stage: 'acquisition',
      }),
    );
  }

  return events;
}

function commissioningEvents(input: LifecycleInput): LedgerEvent[] {
  const { config } = input;
  const rate = config.service.laborHourlyRate;
  const total = config.assumptions.commissioningHours;
  if (total <= 0 || rate <= 0) return [];

  const splits = [
    { id: 'comm-rack', title: 'Rack installation and cable dressing', share: 0.35 },
    { id: 'comm-database', title: 'Database deployment and baseline tuning', share: 0.4 },
    { id: 'comm-backup', title: 'Backup, monitoring and alerting configuration', share: 0.25 },
  ];

  let allocated = 0;
  return splits.map((split, index) => {
    const hours =
      index === splits.length - 1 ? total - allocated : Math.round(total * split.share * 10) / 10;
    allocated += hours;
    return makeEvent({
      id: `comm-${split.id}`,
      atMs: 0,
      category: 'commissioning',
      title: split.title,
      detail: 'Contractor labour recorded during the commissioning window',
      amountPaise: roundPaise(hours * rate),
      quantity: hours,
      unitPricePaise: rate,
      source: `${config.assumptions.commissioningHours} commissioning hours at the configured labour rate`,
      asset: 'Commissioning',
      stage: 'commissioning',
    });
  });
}

function energyEvents(input: LifecycleInput): LedgerEvent[] {
  const { config, derived } = input;
  const months = config.assumptions.horizonYears * 12;
  const events: LedgerEvent[] = [];
  const rate = derived.energyPaisePerMs;
  if (rate <= 0) return events;

  let previous = 0;
  for (let month = 1; month <= months; month += 1) {
    const atMs = monthBoundaryMs(month);
    const span = atMs - previous;
    const itAmount = roundPaise(derived.itEnergyPaisePerMs * span);
    const overheadAmount = roundPaise(derived.overheadEnergyPaisePerMs * span);
    const kwhDrawn = (derived.itPowerWatts / 1000) * (span / 3600000);

    if (itAmount > 0) {
      events.push(
        makeEvent({
          id: `bill-electricity-${month}`,
          atMs,
          category: 'electricity',
          title: 'IT load electricity bill',
          detail: `${kwhDrawn.toFixed(1)} kWh drawn by servers, drives and switching`,
          amountPaise: itAmount,
          quantity: Math.round(kwhDrawn * 10) / 10,
          unitPricePaise: config.facility.electricityRate,
          recurrence: 'Monthly utility billing cycle',
          source: 'IT power draw \u00D7 operating hours \u00D7 tariff',
          asset: 'IT load',
          stage: 'operation',
        }),
      );
    }

    if (overheadAmount > 0) {
      events.push(
        makeEvent({
          id: `bill-cooling-${month}`,
          atMs,
          category: 'cooling',
          title: 'Cooling and facility overhead energy',
          detail: `PUE ${config.facility.pue.toFixed(2)} overhead on top of the IT load (${COOLING_OPTIONS[config.facility.cooling].label})`,
          amountPaise: overheadAmount,
          recurrence: 'Monthly utility billing cycle',
          source: '(PUE \u2212 1) \u00D7 IT energy \u00D7 tariff',
          asset: 'Cooling',
          stage: 'operation',
        }),
      );
    }

    previous = atMs;
  }

  return events;
}

function monthlyServiceEvents(input: LifecycleInput): LedgerEvent[] {
  const { config, derived } = input;
  const months = config.assumptions.horizonYears * 12;
  const events: LedgerEvent[] = [];
  const annualInsurance = roundPaise(
    derived.hardwareCapexPaise * (config.service.insurancePctOfHardware / 100),
  );
  const monthlyInsurance = Math.round(annualInsurance / 12);

  const allStreams: ServiceStream[] = [
    {
      id: 'dba',
      category: 'labor',
      title: 'Database administration',
      detail: 'Retained DBA cover for patching, tuning and incident response',
      amount: config.service.dbaMonthlyCost,
      source: 'Monthly retained administration cost',
    },
    {
      id: 'monitoring',
      category: 'software',
      title: 'Monitoring, backup and management software',
      detail: 'Subscriptions licensed to the estate',
      amount: config.service.monitoringMonthlyCost,
      source: 'Monthly software subscription',
    },
    {
      id: 'security',
      category: 'security',
      title: 'Physical security and access control',
      detail: 'Room access, camera retention and badge administration',
      amount: config.service.securityMonthlyCost,
      source: 'Monthly facility security charge',
    },
    {
      id: 'room',
      category: 'overhead',
      title: 'Server room overhead',
      detail: 'Floor space, housekeeping and shared building services',
      amount: config.facility.roomMonthlyOverhead,
      source: 'Monthly room operating assumption',
    },
    {
      id: 'insurance',
      category: 'overhead',
      title: 'Equipment insurance premium',
      detail: 'Cover written against the installed hardware value',
      amount: monthlyInsurance,
      source: `${config.service.insurancePctOfHardware}% of hardware capital value per year`,
    },
  ];
  const streams = allStreams.filter((stream) => stream.amount > 0);

  if (streams.length === 0) return events;

  let previous = 0;
  for (let month = 1; month <= months; month += 1) {
    const atMs = monthBoundaryMs(month);
    const span = atMs - previous;
    const share = span / MS_PER_MONTH;
    previous = atMs;

    for (const stream of streams) {
      const amount = roundPaise(stream.amount * share);
      if (amount <= 0) continue;
      events.push(
        makeEvent({
          id: `svc-${stream.id}-${month}`,
          atMs,
          category: stream.category,
          title: stream.title,
          detail: stream.detail,
          amountPaise: amount,
          recurrence: 'Monthly',
          source: stream.source,
          stage: 'operation',
        }),
      );
    }
  }

  return events;
}

interface ServiceStream {
  id: string;
  category: LedgerCategory;
  title: string;
  detail: string;
  amount: number;
  source: string;
}

function maintenanceEvents(input: LifecycleInput): LedgerEvent[] {
  const { config } = input;
  const perYear = config.service.maintenanceEventsPerYear;
  const events: LedgerEvent[] = [];
  if (perYear <= 0) return events;

  const labourPerEvent = roundPaise(LABOR_HOURS_PER_MAINTENANCE * config.service.laborHourlyRate);

  for (let year = 1; year <= config.assumptions.horizonYears; year += 1) {
    for (let slot = 0; slot < perYear; slot += 1) {
      const atMs = Math.round((year - 1 + (slot + 0.5) / perYear) * MS_PER_YEAR);
      if (atMs >= config.assumptions.horizonYears * MS_PER_YEAR) continue;
      const factor = escalationAt(config, atMs);
      events.push(
        makeEvent({
          id: `mnt-${year}-${slot}`,
          atMs,
          category: 'maintenance',
          title: 'Preventive maintenance visit',
          detail: 'Filter and fan inspection, firmware review, array health check',
          amountPaise: roundPaise((config.service.maintenanceCostPerEvent + labourPerEvent) * factor),
          quantity: LABOR_HOURS_PER_MAINTENANCE,
          unitPricePaise: config.service.laborHourlyRate,
          recurrence: `${perYear} scheduled visit(s) per year`,
          source: 'Preventive maintenance schedule',
          asset: 'Storage array',
          stage: 'maintenance',
        }),
      );
    }
  }

  return events;
}

function supportEvents(input: LifecycleInput): LedgerEvent[] {
  const { config, derived } = input;
  const events: LedgerEvent[] = [];
  const base = roundPaise(derived.hardwareCapexPaise * (config.service.supportContractPct / 100));
  if (base <= 0) return events;

  for (let year = config.service.warrantyYears + 1; year <= config.assumptions.horizonYears; year += 1) {
    const atMs = Math.round((year - 1) * MS_PER_YEAR);
    if (atMs <= 0 || atMs >= config.assumptions.horizonYears * MS_PER_YEAR) continue;
    events.push(
      makeEvent({
        id: `support-${year}`,
        atMs,
        category: 'support',
        title: `Hardware support contract — year ${year}`,
        detail: `Vendor cover renewed after the ${config.service.warrantyYears}-year warranty expired`,
        amountPaise: roundPaise(base * escalationAt(config, atMs)),
        recurrence: 'Annual from the end of the warranty period',
        source: `${config.service.supportContractPct}% of hardware capital value`,
        asset: 'Vendor support',
        stage: 'operation',
      }),
    );
  }

  return events;
}

interface UpgradePlan {
  atMs: number;
  drives: number;
  addedTb: number;
  usableAfterTb: number;
}

function planUpgrades(input: LifecycleInput): UpgradePlan[] {
  const { config, derived } = input;
  if (!config.assumptions.autoExpandCapacity) return [];

  const efficiency = derived.redundancyEfficiency;
  const perDriveUsable =
    config.storage.capacityPerDriveTb * efficiency * (1 - config.storage.reservePct / 100);
  if (perDriveUsable <= 0) return [];

  const drives = Math.max(
    1,
    Math.ceil(config.assumptions.upgradeShelfTb / perDriveUsable),
  );
  const addedTb = drives * perDriveUsable;
  const horizonYears = config.assumptions.horizonYears;
  const plans: UpgradePlan[] = [];

  let usable = derived.usableTb;
  let lastAtMs = -MS_PER_YEAR;

  for (let year = 0; year <= horizonYears; year += 0.25) {
    const atMs = Math.round(year * MS_PER_YEAR);
    if (atMs >= horizonYears * MS_PER_YEAR) break;
    if (atMs - lastAtMs < MS_PER_YEAR * 0.5) continue;
    if (demandAtTb(config.storage, year) <= usable * CAPACITY_TRIGGER_RATIO) continue;

    usable += addedTb;
    lastAtMs = atMs;
    plans.push({ atMs: Math.max(atMs, MS_PER_YEAR / 12), drives, addedTb, usableAfterTb: usable });
  }

  return plans;
}

function upgradeEvents(input: LifecycleInput, plans: UpgradePlan[]): LedgerEvent[] {
  const { config } = input;
  const labour = roundPaise(LABOR_HOURS_PER_SHELF_INSTALL * config.service.laborHourlyRate);

  return plans.map((plan, index) => {
    const hardware = plan.drives * config.storage.driveUnitPrice;
    const factor = escalationAt(config, plan.atMs);
    const year = Math.round((plan.atMs / MS_PER_YEAR) * 10) / 10;
    return makeEvent({
      id: `upgrade-${index}`,
      atMs: plan.atMs,
      category: 'upgrade',
      title: `Capacity expansion — ${plan.drives} additional drives`,
      detail: `Projected demand crossed ${Math.round(CAPACITY_TRIGGER_RATIO * 100)}% of usable capacity in year ${year}`,
      amountPaise: roundPaise((hardware + labour) * factor),
      quantity: plan.drives,
      unitPricePaise: config.storage.driveUnitPrice,
      source: 'Annual storage growth crossing the expansion threshold',
      asset: 'Expansion shelf',
      stage: 'growth',
    });
  });
}

function replacementEvents(input: LifecycleInput): LedgerEvent[] {
  const { config, derived } = input;
  const events: LedgerEvent[] = [];
  const drives = totalDriveCount(config);
  const driveLabour = roundPaise(drives * LABOR_HOURS_PER_DRIVE_SWAP * config.service.laborHourlyRate);
  const driveBase = drives * config.storage.driveUnitPrice + driveLabour;

  for (
    let year = config.storage.replacementIntervalYears;
    year < config.assumptions.horizonYears;
    year += config.storage.replacementIntervalYears
  ) {
    const atMs = Math.round(year * MS_PER_YEAR);
    events.push(
      makeEvent({
        id: `replace-drives-${year}`,
        atMs,
        category: 'replacement',
        title: `Planned media refresh — year ${year}`,
        detail: `${drives} \u00D7 ${config.storage.capacityPerDriveTb} TB ${DRIVE_TYPES[config.storage.driveType].label} swapped at end of service life`,
        amountPaise: roundPaise(driveBase * escalationAt(config, atMs)),
        quantity: drives,
        unitPricePaise: config.storage.driveUnitPrice,
        recurrence: `Every ${config.storage.replacementIntervalYears} years`,
        source: 'Configured replacement interval',
        asset: 'Storage array',
        stage: 'upgrade',
      }),
    );
  }

  const serverCapex = derived.bom
    .filter((line) => line.group === 'compute')
    .reduce((sum, line) => sum + line.quantity * line.unitPricePaise, 0);
  const serverLabour = roundPaise(LABOR_HOURS_PER_SERVER_REFRESH * config.service.laborHourlyRate);

  for (
    let year = config.assumptions.serverRefreshIntervalYears;
    year < config.assumptions.horizonYears;
    year += config.assumptions.serverRefreshIntervalYears
  ) {
    const atMs = Math.round(year * MS_PER_YEAR);
    events.push(
      makeEvent({
        id: `replace-servers-${year}`,
        atMs,
        category: 'replacement',
        title: `Server platform refresh — year ${year}`,
        detail: `${PROCESSOR_CLASSES[config.compute.processorClass].family} nodes and memory retired and re-provisioned`,
        amountPaise: roundPaise((serverCapex + serverLabour) * escalationAt(config, atMs)),
        quantity: config.compute.serverCount,
        unitPricePaise: serverUnitPrice(config) + Math.round(serverLabour / Math.max(1, config.compute.serverCount)),
        recurrence: `Every ${config.assumptions.serverRefreshIntervalYears} years`,
        source: 'Configured server refresh interval',
        asset: 'Database servers',
        stage: 'upgrade',
      }),
    );
  }

  return events;
}

function failureEvents(input: LifecycleInput, plans: UpgradePlan[]): LedgerEvent[] {
  const { config } = input;
  if (!config.assumptions.modelDriveFailures) return [];
  if (config.assumptions.driveFailureAfrPct <= 0) return [];

  const random = mulberry32(config.assumptions.failureSeed);
  const horizonYears = config.assumptions.horizonYears;
  const events: LedgerEvent[] = [];
  const afr = config.assumptions.driveFailureAfrPct / 100;
  let carry = 0;

  for (let year = 1; year <= horizonYears; year += 1) {
    const drives =
      totalDriveCount(config) +
      plans.filter((plan) => plan.atMs <= year * MS_PER_YEAR).reduce((sum, plan) => sum + plan.drives, 0);

    carry += drives * afr;
    const count = Math.floor(carry);
    carry -= count;
    if (count <= 0) continue;

    const offsets: number[] = [];
    for (let index = 0; index < count; index += 1) offsets.push(random());
    offsets.sort((a, b) => a - b);

    offsets.forEach((offset, index) => {
      const atMs = Math.round((year - 1 + 0.05 + offset * 0.9) * MS_PER_YEAR);
      if (atMs >= horizonYears * MS_PER_YEAR) return;
      const factor = escalationAt(config, atMs);
      const hardware = roundPaise(config.storage.driveUnitPrice * factor);
      const labour = roundPaise(LABOR_HOURS_PER_DRIVE_SWAP * config.service.laborHourlyRate * factor);
      const downtime = roundPaise(
        config.assumptions.downtimeHoursPerFailure * config.service.downtimeHourlyCost * factor,
      );

      events.push(
        makeEvent({
          id: `fail-${year}-${index}`,
          atMs,
          category: 'incident',
          title: `Drive failure — year ${year}`,
          detail: `Hot spare promoted, failed ${config.storage.capacityPerDriveTb} TB member restocked`,
          amountPaise: hardware + labour,
          quantity: 1,
          unitPricePaise: config.storage.driveUnitPrice,
          source: `Deterministic failure model at ${config.assumptions.driveFailureAfrPct}% AFR (seed ${config.assumptions.failureSeed})`,
          asset: 'Storage array',
          stage: 'failure',
        }),
      );

      if (downtime > 0) {
        events.push(
          makeEvent({
            id: `fail-${year}-${index}-downtime`,
            atMs: atMs + 1,
            category: 'downtime',
            title: `Degraded availability — year ${year}`,
            detail: `${config.assumptions.downtimeHoursPerFailure} hour(s) of reduced service during rebuild`,
            amountPaise: downtime,
            quantity: config.assumptions.downtimeHoursPerFailure,
            unitPricePaise: config.service.downtimeHourlyCost,
            source: 'Configured downtime cost per failure',
            asset: 'Storage array',
            stage: 'failure',
          }),
        );
      }
    });
  }

  return events;
}

function decommissionEvents(input: LifecycleInput, residualValuePaise: number): LedgerEvent[] {
  const { config } = input;
  if (!config.assumptions.includeDecommission) return [];
  const atMs = horizonMsFor(config.assumptions.horizonYears);
  const events: LedgerEvent[] = [
    makeEvent({
      id: 'decommission',
      atMs,
      category: 'decommission',
      title: 'Decommissioning, sanitisation and disposal',
      detail: 'Data migration off the estate, certified media destruction, rack removal',
      amountPaise: roundPaise(config.assumptions.decommissionCost * escalationAt(config, atMs)),
      source: 'Configured decommissioning budget',
      asset: 'Full estate',
      stage: 'decommission',
    }),
  ];

  const recovery = roundPaise(residualValuePaise * (config.assumptions.resaleRecoveryPct / 100));
  if (recovery > 0) {
    events.push(
      makeEvent({
        id: 'recovery',
        atMs,
        category: 'recovery',
        title: 'Asset recovery on retirement',
        detail: 'Resale and trade-in proceeds credited against the residual book value',
        amountPaise: recovery,
        credit: true,
        source: `${config.assumptions.resaleRecoveryPct}% of modelled residual asset value`,
        asset: 'Full estate',
        stage: 'decommission',
      }),
    );
  }

  return events;
}

function residualValue(config: HardwareConfig, derived: DerivedModel): number {
  const serverCapex = derived.bom
    .filter((line) => line.group === 'compute')
    .reduce((sum, line) => sum + line.quantity * line.unitPricePaise, 0);
  const storageCapex = derived.bom
    .filter((line) => line.group === 'storage')
    .reduce((sum, line) => sum + line.quantity * line.unitPricePaise, 0);

  const horizon = config.assumptions.horizonYears;
  const serverInterval = Math.max(1, config.assumptions.serverRefreshIntervalYears);
  const driveInterval = Math.max(1, config.storage.replacementIntervalYears);

  const lastServerRefresh = Math.floor((horizon - 0.0001) / serverInterval) * serverInterval;
  const lastDriveRefresh = Math.floor((horizon - 0.0001) / driveInterval) * driveInterval;

  const serverAgeRatio = Math.min(1, (horizon - lastServerRefresh) / serverInterval);
  const driveAgeRatio = Math.min(1, (horizon - lastDriveRefresh) / driveInterval);

  return (
    serverCapex * (1 - serverAgeRatio) +
    storageCapex * (1 - driveAgeRatio) +
    derived.facilityCapexPaise * 0.15
  );
}

export function buildLifecycle(input: LifecycleInput): LifecycleResult {
  const { config, derived } = input;
  const plans = planUpgrades(input);
  const residual = residualValue(config, derived);

  const events: LedgerEvent[] = [
    ...acquisitionEvents(input),
    ...commissioningEvents(input),
    ...energyEvents(input),
    ...monthlyServiceEvents(input),
    ...maintenanceEvents(input),
    ...supportEvents(input),
    ...upgradeEvents(input, plans),
    ...replacementEvents(input),
    ...failureEvents(input, plans),
    ...decommissionEvents(input, residual),
  ].sort((a, b) => a.atMs - b.atMs || a.id.localeCompare(b.id));

  const capacitySteps: CapacityStep[] = [
    { atMs: 0, usableTb: derived.usableTb, addedTb: 0, reason: 'Commissioned capacity' },
    ...plans.map((plan) => ({
      atMs: plan.atMs,
      usableTb: plan.usableAfterTb,
      addedTb: plan.addedTb,
      reason: 'Expansion shelf installed',
    })),
  ];

  return {
    events,
    capacitySteps,
    residualValuePaise: residual,
    recoveryPaise: roundPaise(residual * (config.assumptions.resaleRecoveryPct / 100)),
  };
}

export function stageLabel(stage: LifecycleStage): string {
  switch (stage) {
    case 'acquisition':
      return 'Acquisition';
    case 'commissioning':
      return 'Commissioning';
    case 'operation':
      return 'Daily operations';
    case 'growth':
      return 'Capacity growth';
    case 'maintenance':
      return 'Preventive maintenance';
    case 'failure':
      return 'Hardware failure';
    case 'upgrade':
      return 'Upgrade / replacement';
    case 'decommission':
      return 'Decommissioning';
  }
}

export function configSummary(config: HardwareConfig): string {
  const drive = DRIVE_TYPES[config.storage.driveType];
  const raid = RAID_LEVELS[config.storage.raidLevel];
  const cpu = PROCESSOR_CLASSES[config.compute.processorClass];
  return `${config.compute.serverCount}\u00D7 ${cpu.family} \u00B7 ${config.storage.driveCount}\u00D7 ${config.storage.capacityPerDriveTb} TB ${drive.short} \u00B7 ${raid.label}`;
}
