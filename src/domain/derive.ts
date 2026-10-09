import {
  DRIVE_TYPES,
  NETWORK_IDLE_WATTS,
  PROCESSOR_CLASSES,
  RAM_PRICE_PER_GB,
  RAM_WATTS_PER_GB,
  COOLING_OPTIONS,
  RAID_LEVELS,
  REDUNDANCY_MODES,
  redundancyEfficiency,
} from './catalog';
import { DAYS_PER_YEAR, MS_PER_YEAR, roundPaise } from './money';
import type { BOMLine, DerivedModel, HardwareConfig } from './types';

export const APP_SERVER_RAM_GB = 128;
export const LABOR_HOURS_PER_MAINTENANCE = 4;
export const LABOR_HOURS_PER_DRIVE_SWAP = 1.5;
export const LABOR_HOURS_PER_SHELF_INSTALL = 8;
export const LABOR_HOURS_PER_SERVER_REFRESH = 16;
export const CAPACITY_TRIGGER_RATIO = 0.9;

export function effectiveServerCount(config: HardwareConfig): number {
  const minimum = REDUNDANCY_MODES[config.compute.redundancy].minServers;
  const base = Math.max(config.compute.serverCount, minimum);
  return config.compute.dedicatedAppServer ? base + 1 : base;
}

export function serverUnitWatts(config: HardwareConfig): number {
  const spec = PROCESSOR_CLASSES[config.compute.processorClass];
  const extraSockets = Math.max(0, config.compute.socketsPerServer - 1);
  return spec.baseWatts + Math.round(extraSockets * spec.baseWatts * 0.3);
}

export function serverUnitPrice(config: HardwareConfig): number {
  const spec = PROCESSOR_CLASSES[config.compute.processorClass];
  const extraSockets = Math.max(0, config.compute.socketsPerServer - 1);
  return spec.basePrice + extraSockets * spec.extraSocketPrice;
}

export function appServerPrice(): number {
  return PROCESSOR_CLASSES.entry.basePrice + APP_SERVER_RAM_GB * RAM_PRICE_PER_GB;
}

export function totalDriveCount(config: HardwareConfig): number {
  return config.storage.driveCount + config.storage.spareDrives;
}

export function buildBom(config: HardwareConfig): BOMLine[] {
  const lines: BOMLine[] = [];
  const spec = PROCESSOR_CLASSES[config.compute.processorClass];
  const databaseServers = Math.max(
    config.compute.serverCount,
    REDUNDANCY_MODES[config.compute.redundancy].minServers,
  );

  lines.push({
    id: 'compute-servers',
    group: 'compute',
    label: `Database server — ${spec.family}`,
    detail: `${config.compute.socketsPerServer} socket(s), ${serverUnitWatts(config)} W typical draw`,
    quantity: databaseServers,
    unitPricePaise: serverUnitPrice(config),
    category: 'hardware',
    asset: 'Database servers',
  });

  lines.push({
    id: 'compute-memory',
    group: 'compute',
    label: 'ECC memory',
    detail: `${config.compute.ramGbPerServer} GB per database server`,
    quantity: databaseServers * config.compute.ramGbPerServer,
    unitPricePaise: RAM_PRICE_PER_GB,
    category: 'hardware',
    asset: 'Database servers',
  });

  if (config.compute.dedicatedAppServer) {
    lines.push({
      id: 'compute-app-server',
      group: 'compute',
      label: 'Dedicated application server',
      detail: `${APP_SERVER_RAM_GB} GB, entry single-socket platform`,
      quantity: 1,
      unitPricePaise: appServerPrice(),
      category: 'hardware',
      asset: 'Application server',
    });
  }

  const drive = DRIVE_TYPES[config.storage.driveType];
  lines.push({
    id: 'storage-data-drives',
    group: 'storage',
    label: `${config.storage.capacityPerDriveTb} TB ${drive.label}`,
    detail: `Data-bearing members of the ${RAID_LEVELS[config.storage.raidLevel].label} set`,
    quantity: config.storage.driveCount,
    unitPricePaise: config.storage.driveUnitPrice,
    category: 'hardware',
    asset: 'Storage array',
  });

  if (config.storage.spareDrives > 0) {
    lines.push({
      id: 'storage-spares',
      group: 'storage',
      label: `${config.storage.capacityPerDriveTb} TB ${drive.label} — hot spares`,
      detail: 'Held on the shelf until a member fails',
      quantity: config.storage.spareDrives,
      unitPricePaise: config.storage.driveUnitPrice,
      category: 'hardware',
      asset: 'Storage array',
    });
  }

  if (config.facility.rackCost > 0) {
    lines.push({
      id: 'facility-rack',
      group: 'facility',
      label: 'Rack, rails and mounting',
      detail: '42U enclosure with cable management',
      quantity: 1,
      unitPricePaise: config.facility.rackCost,
      category: 'facility',
      asset: 'Rack',
    });
  }

  if (config.facility.upsCost > 0) {
    lines.push({
      id: 'facility-ups',
      group: 'facility',
      label: 'Online UPS and battery strings',
      detail: 'Double-conversion power protection',
      quantity: 1,
      unitPricePaise: config.facility.upsCost,
      category: 'facility',
      asset: 'Power protection',
    });
  }

  if (config.facility.networkCost > 0) {
    lines.push({
      id: 'facility-network',
      group: 'facility',
      label: 'Switching and structured cabling',
      detail: 'Redundant top-of-rack uplinks',
      quantity: 1,
      unitPricePaise: config.facility.networkCost,
      category: 'facility',
      asset: 'Network',
    });
  }

  const cooling = COOLING_OPTIONS[config.facility.cooling];
  if (cooling.cost > 0) {
    lines.push({
      id: 'facility-cooling',
      group: 'facility',
      label: cooling.label,
      detail: `Reference PUE ${cooling.referencePue.toFixed(2)}`,
      quantity: 1,
      unitPricePaise: cooling.cost,
      category: 'facility',
      asset: 'Cooling',
    });
  }

  return lines;
}

export function deriveModel(config: HardwareConfig): DerivedModel {
  const bom = buildBom(config);
  const drive = DRIVE_TYPES[config.storage.driveType];

  const hardwareCapexPaise = bom
    .filter((line) => line.group === 'compute' || line.group === 'storage')
    .reduce((sum, line) => sum + line.quantity * line.unitPricePaise, 0);

  const facilityCapexPaise = bom
    .filter((line) => line.group === 'facility')
    .reduce((sum, line) => sum + line.quantity * line.unitPricePaise, 0);

  const commissioningPaise = roundPaise(
    config.assumptions.commissioningHours * config.service.laborHourlyRate,
  );

  const databaseServers = Math.max(
    config.compute.serverCount,
    REDUNDANCY_MODES[config.compute.redundancy].minServers,
  );
  const drives = totalDriveCount(config);

  const computeWatts =
    databaseServers * (serverUnitWatts(config) + config.compute.ramGbPerServer * RAM_WATTS_PER_GB) +
    (config.compute.dedicatedAppServer
      ? PROCESSOR_CLASSES.entry.baseWatts + APP_SERVER_RAM_GB * RAM_WATTS_PER_GB
      : 0);
  const storageWatts = drives * drive.watts;
  const networkWatts = config.facility.networkCost > 0 ? NETWORK_IDLE_WATTS : 0;

  const itPowerWatts = computeWatts + storageWatts + networkWatts;
  const facilityPowerWatts = itPowerWatts * config.facility.pue;
  const overheadPowerWatts = facilityPowerWatts - itPowerWatts;

  const annualItEnergyKwh = (itPowerWatts / 1000) * 24 * DAYS_PER_YEAR;
  const annualOverheadEnergyKwh = (overheadPowerWatts / 1000) * 24 * DAYS_PER_YEAR;
  const annualEnergyKwh = annualItEnergyKwh + annualOverheadEnergyKwh;

  const annualElectricityPaise = roundPaise(annualItEnergyKwh * config.facility.electricityRate);
  const annualCoolingPaise = roundPaise(annualOverheadEnergyKwh * config.facility.electricityRate);

  const itEnergyPaisePerMs = annualElectricityPaise / MS_PER_YEAR;
  const overheadEnergyPaisePerMs = annualCoolingPaise / MS_PER_YEAR;

  const efficiency = redundancyEfficiency(config.storage.raidLevel, config.storage.driveCount);
  const installedTb = config.storage.driveCount * config.storage.capacityPerDriveTb;
  const arrayTb = installedTb * efficiency;
  const reserveTb = arrayTb * (config.storage.reservePct / 100);
  const usableTb = Math.max(0, arrayTb - reserveTb);

  const annualInsurancePaise = roundPaise(
    hardwareCapexPaise * (config.service.insurancePctOfHardware / 100),
  );

  const monthlyFixedOpexPaise =
    config.service.dbaMonthlyCost +
    config.service.monitoringMonthlyCost +
    config.service.securityMonthlyCost +
    config.facility.roomMonthlyOverhead +
    Math.round(annualInsurancePaise / 12);

  const annualFixedOpexPaise = monthlyFixedOpexPaise * 12;

  const annualMaintenancePaise =
    config.service.maintenanceEventsPerYear *
    roundPaise(
      config.service.maintenanceCostPerEvent +
        LABOR_HOURS_PER_MAINTENANCE * config.service.laborHourlyRate,
    );

  const annualSupportPaise = roundPaise(
    hardwareCapexPaise * (config.service.supportContractPct / 100),
  );

  const annualOpexPaise =
    annualFixedOpexPaise +
    annualElectricityPaise +
    annualCoolingPaise +
    annualMaintenancePaise +
    annualSupportPaise;

  const initialCapexPaise = hardwareCapexPaise + facilityCapexPaise + commissioningPaise;

  return {
    installedTb,
    arrayTb,
    usableTb,
    reserveTb,
    redundancyEfficiency: efficiency,
    totalDriveCount: drives,
    itPowerWatts,
    overheadPowerWatts,
    facilityPowerWatts,
    annualEnergyKwh,
    annualItEnergyKwh,
    energyPaisePerMs: itEnergyPaisePerMs + overheadEnergyPaisePerMs,
    itEnergyPaisePerMs,
    overheadEnergyPaisePerMs,
    annualElectricityPaise,
    annualCoolingPaise,
    hardwareCapexPaise,
    facilityCapexPaise,
    commissioningPaise,
    initialCapexPaise,
    monthlyFixedOpexPaise,
    annualFixedOpexPaise,
    annualOpexPaise,
    annualMaintenancePaise,
    annualSupportPaise,
    costPerUsableTbPaise: usableTb > 0 ? Math.round(initialCapexPaise / usableTb) : 0,
    bom,
  };
}
